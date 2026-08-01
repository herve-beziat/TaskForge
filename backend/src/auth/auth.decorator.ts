import { applyDecorators, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '../users/user.entity';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';

/**
 * Exige une authentification, et optionnellement l'un des rôles fournis.
 *
 * Les deux guards sont appliqués ensemble et dans cet ordre : le guard JWT
 * remplit `req.user`, que `RolesGuard` consulte ensuite.
 *
 * Ce regroupement supprime une classe d'erreur : poser `@Roles(ADMIN)` en
 * oubliant `RolesGuard` donnerait une route qui paraît protégée sans l'être,
 * la métadonnée étant posée mais jamais lue.
 *
 *   @Auth()                  → tout utilisateur authentifié
 *   @Auth(UserRole.ADMIN)    → administrateurs uniquement
 */
export function Auth(...roles: UserRole[]) {
  return applyDecorators(
    UseGuards(AuthGuard('jwt'), RolesGuard),
    Roles(...roles),
  );
}
