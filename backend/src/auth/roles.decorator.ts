import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../users/user.entity';

export const CLE_ROLES = 'roles';

/**
 * Déclare les rôles autorisés à atteindre une route.
 *
 * L'énumération est préférée aux chaînes libres : une faute de frappe dans
 * `@Roles('admni')` passerait inaperçue à la compilation et produirait une
 * protection silencieusement inopérante.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(CLE_ROLES, roles);
