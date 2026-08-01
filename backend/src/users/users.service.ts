import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

interface DonneesCreation {
  email: string;
  name: string;
  passwordHash: string;
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
    // du mot de passe, en US02, le réclamera.
    if (avecHachage) {
      requete.addSelect('utilisateur.passwordHash');
    }

    return requete.getOne();
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
}
