import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './user.entity';

interface DonneesCreation {
  email: string;
  name: string;
  passwordHash: string;
}

interface DonneesModification {
  role?: UserRole;
  isActive?: boolean;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly depot: Repository<User>,
  ) {}

  // Normalisation à un seul endroit : sans elle, « Herve@Exemple.fr » et
  // « herve@exemple.fr » créeraient deux comptes et la contrainte d'unicité
  // ne protégerait rien.
  private normaliser(email: string): string {
    return email.trim().toLowerCase();
  }

  async trouverParEmail(
    email: string,
    avecHachage = false,
  ): Promise<User | null> {
    const requete = this.depot
      .createQueryBuilder('utilisateur')
      .where('utilisateur.email = :email', { email: this.normaliser(email) });

    // Le hachage est exclu par défaut (select: false) : seule la vérification
    // du mot de passe le réclame.
    if (avecHachage) {
      requete.addSelect('utilisateur.passwordHash');
    }

    return requete.getOne();
  }

  // Consulté à chaque requête authentifiée par la stratégie JWT : c'est ce qui
  // rend une désactivation immédiate plutôt qu'effective à l'expiration du jeton.
  async trouverParId(id: string): Promise<User | null> {
    return this.depot.findOneBy({ id });
  }

  async emailUtilise(email: string): Promise<boolean> {
    const nombre = await this.depot.countBy({ email: this.normaliser(email) });
    return nombre > 0;
  }

  async creer(donnees: DonneesCreation): Promise<User> {
    const utilisateur = this.depot.create({
      ...donnees,
      email: this.normaliser(donnees.email),
    });
    return this.depot.save(utilisateur);
  }

  // Les comptes désactivés figurent dans la liste : l'administrateur doit
  // pouvoir les voir pour les rétablir.
  async lister(): Promise<User[]> {
    return this.depot.find({ order: { createdAt: 'ASC' } });
  }

  async modifier(
    id: string,
    donnees: DonneesModification,
    idDemandeur: string,
  ): Promise<User> {
    // Un corps vide passerait la validation, ne ferait rien, et renverrait un
    // 200 trompeur.
    if (donnees.role === undefined && donnees.isActive === undefined) {
      throw new BadRequestException('Aucune modification demandée.');
    }

    // Sans cette règle, une erreur de clic suffirait à se retirer ses propres
    // droits — et s'il est le seul administrateur, plus personne ne peut le
    // rétablir.
    if (id === idDemandeur) {
      throw new ForbiddenException(
        'Un administrateur ne peut pas modifier son propre compte.',
      );
    }

    const existe = await this.depot.findOneBy({ id });
    if (!existe) {
      throw new NotFoundException('Utilisateur introuvable.');
    }

    // Mise à jour ciblée plutôt que save() sur l'entité chargée : celle-ci n'a
    // pas son passwordHash, exclu par select: false, et la repasser à save
    // exposerait au risque d'écraser la colonne.
    await this.depot.update({ id }, donnees);

    const misAJour = await this.depot.findOneBy({ id });
    if (!misAJour) {
      throw new NotFoundException('Utilisateur introuvable.');
    }
    return misAJour;
  }
}
