import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import { QueryFailedError } from 'typeorm';
import { User, UserRole } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

// bcrypt au facteur 12 prend environ une seconde en JavaScript pur : le délai
// par défaut de cinq secondes ne suffit pas quand plusieurs hachages s'enchaînent.
jest.setTimeout(60000);

const MOT_DE_PASSE = 'motdepasse-long';

const utilisateurEnregistre = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'herve@exemple.fr',
  name: 'Hervé',
  role: UserRole.USER,
  createdAt: new Date('2026-08-01T12:00:00Z'),
} as User;

const inscription = {
  email: 'Herve@Exemple.fr',
  name: 'Hervé',
  password: MOT_DE_PASSE,
};

type ServiceUtilisateursSimule = Pick<
  UsersService,
  'emailUtilise' | 'creer' | 'trouverParEmail'
>;

describe('AuthService', () => {
  let service: AuthService;
  let module: TestingModule;
  let utilisateurs: jest.Mocked<ServiceUtilisateursSimule>;
  let jwt: jest.Mocked<Pick<JwtService, 'signAsync'>>;
  let hachageValide: string;

  // Calculé une seule fois : un hachage au facteur 12 coûte environ une seconde.
  beforeAll(async () => {
    hachageValide = await bcrypt.hash(MOT_DE_PASSE, 12);
  });

  beforeEach(async () => {
    utilisateurs = {
      emailUtilise: jest.fn(),
      creer: jest.fn(),
      trouverParEmail: jest.fn(),
    };
    jwt = { signAsync: jest.fn().mockResolvedValue('jeton-signe') };

    module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: utilisateurs },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  // Libère le contexte applicatif créé pour chaque test.
  afterEach(async () => {
    await module.close();
  });

  describe('inscription', () => {
    it('crée un compte et ne renvoie jamais le mot de passe', async () => {
      utilisateurs.emailUtilise.mockResolvedValue(false);
      utilisateurs.creer.mockResolvedValue(utilisateurEnregistre);

      const resultat = await service.inscrire(inscription);

      expect(resultat).toEqual({
        id: utilisateurEnregistre.id,
        email: 'herve@exemple.fr',
        name: 'Hervé',
        role: UserRole.USER,
        createdAt: utilisateurEnregistre.createdAt,
      });
      expect(resultat).not.toHaveProperty('password');
      expect(resultat).not.toHaveProperty('passwordHash');
    });

    it('refuse une adresse email déjà utilisée', async () => {
      utilisateurs.emailUtilise.mockResolvedValue(true);

      await expect(service.inscrire(inscription)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(utilisateurs.creer).not.toHaveBeenCalled();
    });

    it('transmet un mot de passe haché, jamais le mot de passe en clair', async () => {
      utilisateurs.emailUtilise.mockResolvedValue(false);
      utilisateurs.creer.mockResolvedValue(utilisateurEnregistre);

      await service.inscrire(inscription);

      const donnees = utilisateurs.creer.mock.calls[0][0];
      expect(donnees.passwordHash).not.toBe(MOT_DE_PASSE);
      // $2b$12$ : algorithme bcrypt, facteur de coût 12.
      expect(donnees.passwordHash).toMatch(/^\$2[aby]\$12\$/);
      await expect(
        bcrypt.compare(MOT_DE_PASSE, donnees.passwordHash),
      ).resolves.toBe(true);
    });

    it("traduit une violation d'unicité de la base en conflit", async () => {
      // La vérification préalable passe, mais une seconde requête a créé le
      // compte entre-temps : c'est la contrainte de la base qui tranche.
      utilisateurs.emailUtilise.mockResolvedValue(false);
      utilisateurs.creer.mockRejectedValue(
        Object.assign(
          new QueryFailedError('insert', [], new Error('doublon')),
          { driverError: { code: '23505' } },
        ),
      );

      await expect(service.inscrire(inscription)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('connexion', () => {
    it('renvoie un jeton et une projection sans mot de passe', async () => {
      utilisateurs.trouverParEmail.mockResolvedValue({
        ...utilisateurEnregistre,
        passwordHash: hachageValide,
      });

      const resultat = await service.connecter({
        email: 'herve@exemple.fr',
        password: MOT_DE_PASSE,
      });

      expect(resultat.accessToken).toBe('jeton-signe');
      expect(resultat.utilisateur).not.toHaveProperty('passwordHash');
      // Le rôle voyage dans le jeton : les guards s'en serviront sans
      // interroger la base.
      expect(jwt.signAsync).toHaveBeenCalledWith({
        sub: utilisateurEnregistre.id,
        email: utilisateurEnregistre.email,
        role: UserRole.USER,
      });
    });

    it('refuse un mot de passe incorrect', async () => {
      utilisateurs.trouverParEmail.mockResolvedValue({
        ...utilisateurEnregistre,
        passwordHash: hachageValide,
      });

      await expect(
        service.connecter({
          email: 'herve@exemple.fr',
          password: 'mauvais-mot-de-passe',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(jwt.signAsync).not.toHaveBeenCalled();
    });

    it("compare un haché même lorsque l'email est introuvable", async () => {
      // Défense contre l'attaque temporelle : sortir tôt quand l'utilisateur
      // n'existe pas rendrait la réponse instantanée et révélerait
      // l'inexistence du compte, malgré le message générique. Ce test refuse
      // une future « optimisation » qui paraîtrait pourtant sensée.
      utilisateurs.trouverParEmail.mockResolvedValue(null);
      const espion = jest.spyOn(bcrypt, 'compare');

      await expect(
        service.connecter({
          email: 'inconnu@exemple.fr',
          password: MOT_DE_PASSE,
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(espion).toHaveBeenCalled();
      espion.mockRestore();
    });
  });
});
