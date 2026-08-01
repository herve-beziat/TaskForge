import { ConflictException, Injectable } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { QueryFailedError } from 'typeorm';
import { UserRole } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';

export interface UtilisateurPublic {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
}

// Facteur de coût du hachage. Chaque incrément double le temps de calcul :
// c'est précisément ce qui rend une attaque par force brute coûteuse.
const COUT_HACHAGE = 12;

// Code PostgreSQL d'une violation de contrainte d'unicité.
const VIOLATION_UNICITE = '23505';

@Injectable()
export class AuthService {
  constructor(private readonly utilisateurs: UsersService) {}

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

      // Projection explicite : save() renvoie un objet portant le hachage en
      // mémoire, même si la colonne est exclue des requêtes.
      return {
        id: utilisateur.id,
        email: utilisateur.email,
        name: utilisateur.name,
        role: utilisateur.role,
        createdAt: utilisateur.createdAt,
      };
    } catch (erreur) {
      // Le vrai garde-fou : la contrainte d'unicité de la base. Sans cette
      // interception, la course évoquée plus haut produirait une 500 opaque.
      if (this.estViolationUnicite(erreur)) {
        throw new ConflictException('Cette adresse email est déjà utilisée.');
      }
      throw erreur;
    }
  }

  private estViolationUnicite(erreur: unknown): boolean {
    if (!(erreur instanceof QueryFailedError)) {
      return false;
    }
    const pilote = erreur.driverError as { code?: string } | undefined;
    return pilote?.code === VIOLATION_UNICITE;
  }
}
