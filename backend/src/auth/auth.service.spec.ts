import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import { QueryFailedError } from 'typeorm';
import { User, UserRole } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

// bcrypt au facteur 12 prend environ une seconde en JavaScript pur : le délai
// par défaut de cinq secondes ne suffit pas quand plusieurs hachages s'enchaînent.
jest.setTimeout(30000);

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
  password: 'motdepasse-long',
};

describe('AuthService', () => {
  let service: AuthService;
  let module: TestingModule;
  let utilisateurs: jest.Mocked<Pick<UsersService, 'emailUtilise' | 'creer'>>;

  beforeEach(async () => {
    utilisateurs = {
      emailUtilise: jest.fn(),
      creer: jest.fn(),
    };

    module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: utilisateurs },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  // Libère le contexte applicatif créé pour chaque test : sans cela Jest
  // signale un processus de travail qui ne se termine pas proprement.
  afterEach(async () => {
    await module.close();
  });

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
    expect(donnees.passwordHash).not.toBe(inscription.password);
    // $2b$12$ : algorithme bcrypt, facteur de coût 12.
    expect(donnees.passwordHash).toMatch(/^\$2[aby]\$12\$/);
    await expect(
      bcrypt.compare(inscription.password, donnees.passwordHash),
    ).resolves.toBe(true);
  });

  it("traduit une violation d'unicité de la base en conflit", async () => {
    // La vérification préalable passe, mais une seconde requête a créé le
    // compte entre-temps : c'est la contrainte de la base qui tranche.
    utilisateurs.emailUtilise.mockResolvedValue(false);
    utilisateurs.creer.mockRejectedValue(
      Object.assign(new QueryFailedError('insert', [], new Error('doublon')), {
        driverError: { code: '23505' },
      }),
    );

    await expect(service.inscrire(inscription)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
