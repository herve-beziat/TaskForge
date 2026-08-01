import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../users/user.entity';
import type { UtilisateurAuthentifie } from './jwt.strategy';
import { CLE_ROLES } from './roles.decorator';

interface RequeteAuthentifiee {
  user?: UtilisateurAuthentifie;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(contexte: ExecutionContext): boolean {
    // La méthode prime sur la classe : un @Roles posé sur un contrôleur entier
    // peut être affiné sur une route précise, sans s'y cumuler.
    const rolesRequis = this.reflector.getAllAndOverride<UserRole[]>(
      CLE_ROLES,
      [contexte.getHandler(), contexte.getClass()],
    );

    // Aucun rôle exigé : la route est ouverte à tout utilisateur authentifié,
    // le guard JWT ayant déjà tranché en amont.
    if (!rolesRequis || rolesRequis.length === 0) {
      return true;
    }

    const requete = contexte.switchToHttp().getRequest<RequeteAuthentifiee>();
    const utilisateur = requete.user;

    // Absence d'utilisateur : soit le guard JWT n'a pas été appliqué, soit il
    // s'est exécuté après celui-ci. Dans les deux cas on refuse — un échec sûr
    // vaut mieux qu'une route ouverte par accident.
    if (!utilisateur) {
      throw new ForbiddenException('Accès refusé.');
    }

    if (!rolesRequis.includes(utilisateur.role)) {
      throw new ForbiddenException('Accès refusé.');
    }

    return true;
  }
}
