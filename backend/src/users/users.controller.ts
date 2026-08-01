import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Auth } from '../auth/auth.decorator';
import type { UtilisateurAuthentifie } from '../auth/jwt.strategy';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserRole } from './user.entity';
import { UsersService } from './users.service';

export interface UtilisateurAdministre {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
}

// Le décorateur est posé sur la classe : toute route ajoutée ensuite est
// protégée par défaut. L'oubli n'ouvre rien — il faudrait un @Auth() explicite
// pour élargir l'accès.
@Controller('users')
@Auth(UserRole.ADMIN)
export class UsersController {
  constructor(private readonly utilisateurs: UsersService) {}

  @Get()
  async lister(): Promise<UtilisateurAdministre[]> {
    const liste = await this.utilisateurs.lister();
    return liste.map((utilisateur) => this.projeter(utilisateur));
  }

  @Patch(':id')
  async modifier(
    // Sans ce pipe, un identifiant malformé atteindrait PostgreSQL et
    // produirait une 500 à partir d'une simple faute de frappe dans l'URL.
    @Param('id', ParseUUIDPipe) id: string,
    @Body() donnees: UpdateUserDto,
    @Req() requete: Request,
  ): Promise<UtilisateurAdministre> {
    const demandeur = requete.user as UtilisateurAuthentifie;
    const misAJour = await this.utilisateurs.modifier(
      id,
      donnees,
      demandeur.id,
    );
    return this.projeter(misAJour);
  }

  // Explicite bien que select: false exclue déjà le hachage : deux barrières
  // valent mieux qu'une lorsque la seconde tient à une option de configuration.
  private projeter(utilisateur: User): UtilisateurAdministre {
    return {
      id: utilisateur.id,
      email: utilisateur.email,
      name: utilisateur.name,
      role: utilisateur.role,
      isActive: utilisateur.isActive,
      createdAt: utilisateur.createdAt,
    };
  }
}
