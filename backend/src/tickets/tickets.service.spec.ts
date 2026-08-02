import { Counter } from 'prom-client';
import { Repository } from 'typeorm';
import { UserRole } from '../users/user.entity';
import { Ticket, TicketPriority } from './ticket.entity';
import { TicketsService } from './tickets.service';

const ID_RAPPORTEUR = '11111111-1111-1111-1111-111111111111';

const donnees = {
  title: 'Imprimante hors service',
  description: "L'imprimante du deuxième étage ne répond plus depuis ce matin.",
  priority: TicketPriority.HIGH,
};

const utilisateur = { id: ID_RAPPORTEUR, role: UserRole.USER };
const technicien = {
  id: '22222222-2222-2222-2222-222222222222',
  role: UserRole.TECHNICIAN,
};
const admin = {
  id: '33333333-3333-3333-3333-333333333333',
  role: UserRole.ADMIN,
};

type DepotSimule = jest.Mocked<
  Pick<Repository<Ticket>, 'create' | 'save' | 'findAndCount'>
>;
type CompteurSimule = jest.Mocked<Pick<Counter<string>, 'inc'>>;

describe('TicketsService', () => {
  let depot: DepotSimule;
  let compteur: CompteurSimule;
  let service: TicketsService;

  beforeEach(() => {
    depot = { create: jest.fn(), save: jest.fn(), findAndCount: jest.fn() };
    compteur = { inc: jest.fn() };
    service = new TicketsService(
      depot as unknown as Repository<Ticket>,
      compteur as unknown as Counter<string>,
    );
  });

  describe('creer', () => {
    it('attache le rapporteur issu du jeton, jamais du corps de la requête', async () => {
      const attendu = { ...donnees, reporterId: ID_RAPPORTEUR } as Ticket;
      depot.create.mockReturnValue(attendu);
      depot.save.mockResolvedValue(attendu);

      await service.creer(donnees, ID_RAPPORTEUR);

      expect(depot.create).toHaveBeenCalledWith({
        ...donnees,
        reporterId: ID_RAPPORTEUR,
      });
      expect(depot.save).toHaveBeenCalledWith(attendu);
    });

    it('incrémente le compteur de tickets créés', async () => {
      const enregistre = { ...donnees, reporterId: ID_RAPPORTEUR } as Ticket;
      depot.create.mockReturnValue(enregistre);
      depot.save.mockResolvedValue(enregistre);

      await service.creer(donnees, ID_RAPPORTEUR);

      expect(compteur.inc).toHaveBeenCalledTimes(1);
    });

    it("n'incrémente pas le compteur si la persistance échoue", async () => {
      // Déplacer l'incrément avant le save ne casserait rien de visible et
      // fausserait le compteur à chaque échec. Ce test l'interdit.
      depot.create.mockReturnValue({} as Ticket);
      depot.save.mockRejectedValue(new Error('base indisponible'));

      await expect(service.creer(donnees, ID_RAPPORTEUR)).rejects.toThrow();
      expect(compteur.inc).not.toHaveBeenCalled();
    });
  });

  describe('lister', () => {
    beforeEach(() => {
      depot.findAndCount.mockResolvedValue([[], 0]);
    });

    it('restreint un utilisateur ordinaire à ses propres tickets', async () => {
      await service.lister({}, utilisateur);

      const appel = depot.findAndCount.mock.calls[0][0];
      expect(appel?.where).toEqual({ reporterId: ID_RAPPORTEUR });
    });

    it('laisse un technicien voir tous les tickets', async () => {
      // Un technicien doit pouvoir reprendre le ticket d'un collègue absent.
      await service.lister({}, technicien);

      const appel = depot.findAndCount.mock.calls[0][0];
      expect(appel?.where).toBeUndefined();
    });

    it('laisse un administrateur voir tous les tickets', async () => {
      await service.lister({}, admin);

      const appel = depot.findAndCount.mock.calls[0][0];
      expect(appel?.where).toBeUndefined();
    });

    it('traduit la page et la taille en décalage et limite', async () => {
      await service.lister({ page: 3, limit: 10 }, admin);

      const appel = depot.findAndCount.mock.calls[0][0];
      expect(appel?.skip).toBe(20);
      expect(appel?.take).toBe(10);
    });

    it('calcule le nombre de pages', async () => {
      depot.findAndCount.mockResolvedValue([[], 25]);

      const resultat = await service.lister({ limit: 10 }, admin);

      expect(resultat.total).toBe(25);
      expect(resultat.pages).toBe(3);
      expect(resultat.page).toBe(1);
    });
  });
});
