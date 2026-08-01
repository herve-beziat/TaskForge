import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../users/user.entity';
import type { UtilisateurAuthentifie } from './jwt.strategy';
import { RolesGuard } from './roles.guard';

const admin: UtilisateurAuthentifie = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'admin@exemple.fr',
  role: UserRole.ADMIN,
};

const technicien: UtilisateurAuthentifie = {
  id: '22222222-2222-2222-2222-222222222222',
  email: 'technicien@exemple.fr',
  role: UserRole.TECHNICIAN,
};

// Contexte réduit aux trois méthodes réellement appelées par le guard.
function contexteAvec(utilisateur?: UtilisateurAuthentifie): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user: utilisateur }) }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let reflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it("laisse passer lorsqu'aucun rôle n'est exigé", () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(contexteAvec(technicien))).toBe(true);
  });

  it('laisse passer sur une liste de rôles vide', () => {
    // @Auth() sans argument : authentification requise, rôle indifférent.
    reflector.getAllAndOverride.mockReturnValue([]);

    expect(guard.canActivate(contexteAvec(technicien))).toBe(true);
  });

  it('laisse passer un rôle attendu', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

    expect(guard.canActivate(contexteAvec(admin))).toBe(true);
  });

  it('refuse un rôle insuffisant', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

    expect(() => guard.canActivate(contexteAvec(technicien))).toThrow(
      ForbiddenException,
    );
  });

  it("refuse en l'absence d'utilisateur", () => {
    // Cas d'un guard JWT absent ou exécuté après celui-ci : on refuse plutôt
    // que de laisser passer par accident.
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

    expect(() => guard.canActivate(contexteAvec(undefined))).toThrow(
      ForbiddenException,
    );
  });

  it('accepte un rôle parmi plusieurs autorisés', () => {
    reflector.getAllAndOverride.mockReturnValue([
      UserRole.ADMIN,
      UserRole.TECHNICIAN,
    ]);

    expect(guard.canActivate(contexteAvec(technicien))).toBe(true);
  });
});
