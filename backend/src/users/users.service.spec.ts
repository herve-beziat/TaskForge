import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { User, UserRole } from './user.entity';
import { UsersService } from './users.service';

const ID_ADMIN = '11111111-1111-1111-1111-111111111111';
const ID_CIBLE = '22222222-2222-2222-2222-222222222222';

const cible = {
  id: ID_CIBLE,
  email: 'cible@exemple.fr',
  name: 'Cible',
  role: UserRole.USER,
  isActive: true,
  createdAt: new Date('2026-08-01T12:00:00Z'),
} as User;

type DepotSimule = jest.Mocked<Pick<Repository<User>, 'findOneBy' | 'update'>>;

describe('UsersService', () => {
  let depot: DepotSimule;
  let service: UsersService;

  beforeEach(() => {
    depot = { findOneBy: jest.fn(), update: jest.fn() };
    service = new UsersService(depot as unknown as Repository<User>);
  });

  describe('modifier', () => {
    it('refuse un corps vide', async () => {
      // Il passerait la validation, ne ferait rien, et renverrait un 200.
      await expect(
        service.modifier(ID_CIBLE, {}, ID_ADMIN),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(depot.update).not.toHaveBeenCalled();
    });

    it('refuse de modifier son propre compte', async () => {
      // Sans cette règle, un administrateur seul pourrait se retirer ses
      // droits sans que personne ne puisse le rétablir.
      await expect(
        service.modifier(ID_ADMIN, { isActive: false }, ID_ADMIN),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(depot.update).not.toHaveBeenCalled();
    });

    it('refuse un utilisateur introuvable', async () => {
      depot.findOneBy.mockResolvedValue(null);

      await expect(
        service.modifier(ID_CIBLE, { role: UserRole.ADMIN }, ID_ADMIN),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(depot.update).not.toHaveBeenCalled();
    });

    it('change le rôle', async () => {
      depot.findOneBy
        .mockResolvedValueOnce(cible)
        .mockResolvedValueOnce({ ...cible, role: UserRole.TECHNICIAN });

      const resultat = await service.modifier(
        ID_CIBLE,
        { role: UserRole.TECHNICIAN },
        ID_ADMIN,
      );

      expect(depot.update).toHaveBeenCalledWith(
        { id: ID_CIBLE },
        { role: UserRole.TECHNICIAN },
      );
      expect(resultat.role).toBe(UserRole.TECHNICIAN);
    });

    it('désactive un compte', async () => {
      depot.findOneBy
        .mockResolvedValueOnce(cible)
        .mockResolvedValueOnce({ ...cible, isActive: false });

      const resultat = await service.modifier(
        ID_CIBLE,
        { isActive: false },
        ID_ADMIN,
      );

      expect(depot.update).toHaveBeenCalledWith(
        { id: ID_CIBLE },
        { isActive: false },
      );
      expect(resultat.isActive).toBe(false);
    });
  });
});
