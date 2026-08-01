import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { QueryFailedError } from 'typeorm';
import { UserRole } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ContenuJeton } from './jwt.strategy';

export interface UtilisateurPublic {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
}

export interface ResultatConnexion {
  accessToken: string;
  utilisateur: UtilisateurPublic;
}

// Facteur de coût du hachage. Chaque incrément double le temps de calcul :
// c'est précisément ce qui rend une attaque par force brute coûteuse.
const COUT_HACHAGE = 12;

// Code PostgreSQL d'une violation de contrainte d'unicité.
const VIOLATION_UNICITE = '23505';

// Haché constant, sans mot de passe correspondant. Utilisé lorsque l'email est
// introuvable, pour que bcrypt travaille aussi longtemps que dans le cas
// nominal : sans lui, la rapidité de la réponse révélerait qu'aucun compte
// n'existe à cette adresse, et le message générique ne protégerait plus rien.
const HACHAGE_FACTICE =
  '$2b$12$TtiHl3Htt3VTz3vU/Px4POJ0pBt/pqy5//r38kbarOp3cieBDYzGq';

@Injectable()
export class AuthService {
  constructor(
    private readonly utilisateurs: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async inscrire(donnees: RegisterDto): Promise<UtilisateurPublic> {
    // Vérification préalable : elle sert à produire un message clair dans le
    // cas courant, pas à garantir l'unicité — deux requêtes simultanées la
    // franchiraient toutes les deux.
    if (await this.utilisateurs.emailUtilise(donnees.email)) {
      throw new ConflictException('Cette adresse email est déjà utilisée.');
    }

    const passwordHash = await bcrypt.hash(donnees.password, COUT_HACHAGE);

    try {
      const utilisateur = await this.utilisateurs.creer({
        email: donnees.email,
        name: donnees.name,
        passwordHash,
      });

      return this.projeter(utilisateur);
    } catch (erreur) {
      // Le vrai garde-fou : la contrainte d'unicité de la base. Sans cette
      // interception, la course évoquée plus haut produirait une 500 opaque.
      if (this.estViolationUnicite(erreur)) {
        throw new ConflictException('Cette adresse email est déjà utilisée.');
      }
      throw erreur;
    }
  }

  async connecter(donnees: LoginDto): Promise<ResultatConnexion> {
    const utilisateur = await this.utilisateurs.trouverParEmail(
      donnees.email,
      true,
    );

    // La comparaison précède volontairement le test d'existence : sortir plus
    // tôt rendrait la réponse instantanée quand l'email est inconnu, et le
    // temps de réponse trahirait ce que le message générique tait.
    const hachage = utilisateur?.passwordHash ?? HACHAGE_FACTICE;
    const correspond = await bcrypt.compare(donnees.password, hachage);

    // Le compte désactivé échoue avec le même message que les autres cas :
    // répondre « compte désactivé » confirmerait que l'adresse existe.
    if (!utilisateur || !correspond || !utilisateur.isActive) {
      throw new UnauthorizedException('Identifiants invalides.');
    }

    // Le rôle ne figure pas dans le jeton : il est relu en base à chaque
    // requête par la stratégie, ce qui rend les changements immédiats.
    const contenu: ContenuJeton = {
      sub: utilisateur.id,
      email: utilisateur.email,
    };

    return {
      accessToken: await this.jwt.signAsync(contenu),
      utilisateur: this.projeter(utilisateur),
    };
  }

  // Projection explicite : les entités renvoyées par TypeORM portent le
  // hachage en mémoire, même si la colonne est exclue des requêtes.
  private projeter(utilisateur: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    createdAt: Date;
  }): UtilisateurPublic {
    return {
      id: utilisateur.id,
      email: utilisateur.email,
      name: utilisateur.name,
      role: utilisateur.role,
      createdAt: utilisateur.createdAt,
    };
  }

  private estViolationUnicite(erreur: unknown): boolean {
    if (!(erreur instanceof QueryFailedError)) {
      return false;
    }
    const pilote = erreur.driverError as { code?: string } | undefined;
    return pilote?.code === VIOLATION_UNICITE;
  }
}
