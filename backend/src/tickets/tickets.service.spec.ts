import { Counter } from 'prom-client';
import { Repository } from 'typeorm';
import { Ticket, TicketPriority } from './ticket.entity';
import { TicketsService } from './tickets.service';

const ID_RAPPORTEUR = '11111111-1111-1111-1111-111111111111';

const donnees = {
  title: 'Imprimante hors service',
  description: "L'imprimante du deuxième étage ne répond plus depuis ce matin.",
  priority: TicketPriority.HIGH,
};

type DepotSimule = jest.Mocked<Pick<Repository<Ticket>, 'create' | 'save'>>;
type CompteurSimule = jest.Mocked<Pick<Counter<string>, 'inc'>>;

describe('TicketsService', () => {
  let depot: DepotSimule;
  let compteur: CompteurSimule;
  let service: TicketsService;

  beforeEach(() => {
    depot = { create: jest.fn(), save: jest.fn() };
    compteur = { inc: jest.fn() };
    service = new TicketsService(
      depot as unknown as Repository<Ticket>,
      compteur as unknown as Counter<string>,
    );
  });

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
