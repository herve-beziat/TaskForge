import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Counter } from 'prom-client';
import { FindOptionsWhere, Repository } from 'typeorm';
import { User, UserRole } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { Ticket, TicketPriority, TicketStatus } from './ticket.entity';
import { TicketsService } from './tickets.service';
import { ChampDeTri, SensDeTri } from './dto/list-tickets.dto';

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
  Pick<
    Repository<Ticket>,
    'create' | 'save' | 'findAndCount' | 'findOne' | 'update'
  >
>;
type CompteurSimule = jest.Mocked<Pick<Counter<string>, 'inc'>>;
type UtilisateursSimule = jest.Mocked<Pick<UsersService, 'trouverParId'>>;

describe('TicketsService', () => {
  let depot: DepotSimule;
  let compteur: CompteurSimule;
  let utilisateurs: UtilisateursSimule;
  let service: TicketsService;

  beforeEach(() => {
    depot = {
      create: jest.fn(),
      save: jest.fn(),
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };
    compteur = { inc: jest.fn() };
    utilisateurs = { trouverParId: jest.fn() };
    service = new TicketsService(
      depot as unknown as Repository<Ticket>,
      compteur as unknown as Counter<string>,
      utilisateurs as unknown as UsersService,
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
      // Filtre vide et non absent : aucune restriction de visibilité.
      expect(appel?.where).toEqual({});
    });

    it('laisse un administrateur voir tous les tickets', async () => {
      await service.lister({}, admin);

      const appel = depot.findAndCount.mock.calls[0][0];
      expect(appel?.where).toEqual({});
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

    it('filtre par statut, priorité et technicien assigné', async () => {
      await service.lister(
        {
          status: TicketStatus.OPEN,
          priority: TicketPriority.HIGH,
          assigneeId: technicien.id,
        },
        admin,
      );

      const appel = depot.findAndCount.mock.calls[0][0];
      expect(appel?.where).toEqual({
        status: TicketStatus.OPEN,
        priority: TicketPriority.HIGH,
        assigneeId: technicien.id,
      });
    });

    it('trie par date décroissante par défaut', async () => {
      await service.lister({}, admin);

      const appel = depot.findAndCount.mock.calls[0][0];
      expect(appel?.order).toEqual({ createdAt: 'DESC' });
    });

    it('applique le tri demandé', async () => {
      await service.lister(
        { sortBy: ChampDeTri.PRIORITY, sortOrder: SensDeTri.ASC },
        admin,
      );

      const appel = depot.findAndCount.mock.calls[0][0];
      expect(appel?.order).toEqual({ priority: 'ASC' });
    });

    it('transforme une recherche en deux conditions alternatives', async () => {
      await service.lister({ search: 'imprimante' }, admin);

      const where = depot.findAndCount.mock.calls[0][0]
        ?.where as FindOptionsWhere<Ticket>[];
      expect(where).toHaveLength(2);
      expect(where[0].title).toBeDefined();
      expect(where[1].description).toBeDefined();
    });

    it('conserve la visibilité dans les deux branches de la recherche', async () => {
      // Le test le plus important du lot. TypeORM interprète un tableau comme
      // un OU : si la restriction de visibilité n'était posée que sur la
      // première branche, un utilisateur ordinaire verrait les tickets d'autrui
      // dès qu'il lance une recherche — et la liste sans recherche resterait
      // correcte, ce qui rendrait la faille invisible.
      await service.lister({ search: 'imprimante' }, utilisateur);

      const where = depot.findAndCount.mock.calls[0][0]
        ?.where as FindOptionsWhere<Ticket>[];
      expect(where[0].reporterId).toBe(ID_RAPPORTEUR);
      expect(where[1].reporterId).toBe(ID_RAPPORTEUR);
    });

    it('conserve les autres filtres dans les deux branches', async () => {
      await service.lister(
        { search: 'imprimante', status: TicketStatus.OPEN },
        admin,
      );

      const where = depot.findAndCount.mock.calls[0][0]
        ?.where as FindOptionsWhere<Ticket>[];
      expect(where[0].status).toBe(TicketStatus.OPEN);
      expect(where[1].status).toBe(TicketStatus.OPEN);
    });

    it('charge les noms du rapporteur et de l’assigné', async () => {
      await service.lister({}, admin);

      const appel = depot.findAndCount.mock.calls[0][0];
      expect(appel?.relations).toEqual({ reporter: true, assignee: true });
    });
  });

  describe('trouverParId', () => {
    const ticketDuSimple = {
      id: '44444444-4444-4444-4444-444444444444',
      reporterId: ID_RAPPORTEUR,
    } as Ticket;

    it('renvoie son ticket au rapporteur', async () => {
      depot.findOne.mockResolvedValue(ticketDuSimple);

      const resultat = await service.trouverParId(
        ticketDuSimple.id,
        utilisateur,
      );

      expect(resultat).toBe(ticketDuSimple);
    });

    it("renvoie le ticket d'autrui à un technicien", async () => {
      depot.findOne.mockResolvedValue(ticketDuSimple);

      const resultat = await service.trouverParId(
        ticketDuSimple.id,
        technicien,
      );

      expect(resultat).toBe(ticketDuSimple);
    });

    it("lève une erreur quand le ticket n'existe pas", async () => {
      depot.findOne.mockResolvedValue(null);

      await expect(
        service.trouverParId(ticketDuSimple.id, admin),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("renvoie 404 et non 403 sur le ticket d'un autre utilisateur", async () => {
      // Un 403 confirmerait l'existence du ticket : il suffirait d'énumérer
      // des identifiants pour cartographier la base. Ce test interdit de
      // « clarifier » la réponse en 403, ce qui paraîtrait pourtant plus juste.
      depot.findOne.mockResolvedValue({
        ...ticketDuSimple,
        reporterId: '99999999-9999-9999-9999-999999999999',
      });

      await expect(
        service.trouverParId(ticketDuSimple.id, utilisateur),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('charge le rapporteur et l’assigné', async () => {
      depot.findOne.mockResolvedValue(ticketDuSimple);

      await service.trouverParId(ticketDuSimple.id, admin);

      const appel = depot.findOne.mock.calls[0][0];
      expect(appel?.relations).toEqual({ reporter: true, assignee: true });
    });
  });

  describe('modifier', () => {
    const ID_TICKET = '55555555-5555-5555-5555-555555555555';

    function ticketAuStatut(status: TicketStatus): Ticket {
      return { id: ID_TICKET, reporterId: ID_RAPPORTEUR, status } as Ticket;
    }

    it('refuse un corps vide', async () => {
      await expect(
        service.modifier(ID_TICKET, {}, utilisateur),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(depot.update).not.toHaveBeenCalled();
    });

    it("laisse l'auteur corriger son ticket tant qu'il est ouvert", async () => {
      depot.findOne.mockResolvedValue(ticketAuStatut(TicketStatus.OPEN));

      await service.modifier(
        ID_TICKET,
        { title: 'Titre corrigé' },
        utilisateur,
      );

      expect(depot.update).toHaveBeenCalledWith(
        { id: ID_TICKET },
        { title: 'Titre corrigé' },
      );
    });

    it("empêche l'auteur de modifier un ticket pris en charge", async () => {
      // Modifier la description reviendrait à réécrire l'énoncé du problème
      // sous les pieds du technicien qui y travaille.
      depot.findOne.mockResolvedValue(ticketAuStatut(TicketStatus.IN_PROGRESS));

      await expect(
        service.modifier(ID_TICKET, { title: 'Titre corrigé' }, utilisateur),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(depot.update).not.toHaveBeenCalled();
    });

    it('laisse un technicien modifier un ticket en cours', async () => {
      // Ajuster la priorité d'un incident en cours fait partie de son métier.
      depot.findOne.mockResolvedValue(ticketAuStatut(TicketStatus.IN_PROGRESS));

      await service.modifier(
        ID_TICKET,
        { priority: TicketPriority.CRITICAL },
        technicien,
      );

      expect(depot.update).toHaveBeenCalledWith(
        { id: ID_TICKET },
        { priority: TicketPriority.CRITICAL },
      );
    });

    it('interdit toute modification sur un ticket fermé', async () => {
      depot.findOne.mockResolvedValue(ticketAuStatut(TicketStatus.CLOSED));

      await expect(
        service.modifier(ID_TICKET, { title: 'Titre corrigé' }, admin),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(depot.update).not.toHaveBeenCalled();
    });
  });

  describe('changerStatut', () => {
    const ID_TICKET = '66666666-6666-6666-6666-666666666666';

    function ticketAuStatut(status: TicketStatus): Ticket {
      return { id: ID_TICKET, reporterId: ID_RAPPORTEUR, status } as Ticket;
    }

    it('refuse une transition impossible', async () => {
      depot.findOne.mockResolvedValue(ticketAuStatut(TicketStatus.OPEN));

      await expect(
        service.changerStatut(ID_TICKET, TicketStatus.CLOSED, technicien),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(depot.update).not.toHaveBeenCalled();
    });

    it('laisse un technicien prendre en charge un ticket ouvert', async () => {
      depot.findOne.mockResolvedValue(ticketAuStatut(TicketStatus.OPEN));

      await service.changerStatut(
        ID_TICKET,
        TicketStatus.IN_PROGRESS,
        technicien,
      );

      // Aucun resolvedAt : une prise en charge depuis OPEN n'a rien à effacer,
      // la colonne est déjà nulle.
      expect(depot.update).toHaveBeenCalledWith(
        { id: ID_TICKET },
        { status: TicketStatus.IN_PROGRESS },
      );
    });

    it("empêche l'auteur de prendre en charge son propre ticket", async () => {
      depot.findOne.mockResolvedValue(ticketAuStatut(TicketStatus.OPEN));

      await expect(
        service.changerStatut(ID_TICKET, TicketStatus.IN_PROGRESS, utilisateur),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(depot.update).not.toHaveBeenCalled();
    });

    it("laisse l'auteur clore son ticket une fois résolu", async () => {
      // C'est au demandeur de confirmer que son problème est réglé.
      depot.findOne.mockResolvedValue(ticketAuStatut(TicketStatus.RESOLVED));

      await service.changerStatut(ID_TICKET, TicketStatus.CLOSED, utilisateur);

      expect(depot.update).toHaveBeenCalled();
    });

    it('horodate la résolution', async () => {
      depot.findOne.mockResolvedValue(ticketAuStatut(TicketStatus.IN_PROGRESS));

      await service.changerStatut(ID_TICKET, TicketStatus.RESOLVED, technicien);

      const [, valeurs] = depot.update.mock.calls[0];
      expect(valeurs.status).toBe(TicketStatus.RESOLVED);
      expect(valeurs.resolvedAt).toBeInstanceOf(Date);
    });

    it('conserve la date de résolution à la clôture', async () => {
      // CLOSED est l'état final normal d'un ticket résolu : effacer sa date
      // de résolution priverait le temps moyen d'US15 de toute donnée. C'est
      // exactement le bug qu'une validation de bout en bout a révélé ici.
      depot.findOne.mockResolvedValue(ticketAuStatut(TicketStatus.RESOLVED));

      await service.changerStatut(ID_TICKET, TicketStatus.CLOSED, technicien);

      const [, valeurs] = depot.update.mock.calls[0];
      expect(valeurs.status).toBe(TicketStatus.CLOSED);
      expect(valeurs).not.toHaveProperty('resolvedAt');
    });

    it('efface la date de résolution à la réouverture', async () => {
      // Sans cela, un ticket rouvert puis re-résolu garderait la date de sa
      // première résolution, et le temps moyen de résolution mesurerait
      // n'importe quoi — sans que rien ne le signale.
      depot.findOne.mockResolvedValue(ticketAuStatut(TicketStatus.RESOLVED));

      await service.changerStatut(
        ID_TICKET,
        TicketStatus.IN_PROGRESS,
        technicien,
      );

      const [, valeurs] = depot.update.mock.calls[0];
      expect(valeurs.resolvedAt).toBeNull();
    });
  });

  describe('assigner', () => {
    const ID_TICKET = '77777777-7777-7777-7777-777777777777';

    function ticket(
      status = TicketStatus.OPEN,
      assigneeId: string | null = null,
    ): Ticket {
      return {
        id: ID_TICKET,
        reporterId: ID_RAPPORTEUR,
        status,
        assigneeId,
      } as Ticket;
    }

    function destinataire(role: UserRole, isActive = true): User {
      return { id: technicien.id, role, isActive } as User;
    }

    it('laisse un administrateur assigner à un technicien', async () => {
      depot.findOne.mockResolvedValue(ticket());
      utilisateurs.trouverParId.mockResolvedValue(
        destinataire(UserRole.TECHNICIAN),
      );

      await service.assigner(ID_TICKET, technicien.id, admin);

      expect(depot.update).toHaveBeenCalledWith(
        { id: ID_TICKET },
        { assigneeId: technicien.id },
      );
    });

    it("refuse un destinataire qui n'est pas technicien", async () => {
      // La clé étrangère garantit que l'utilisateur existe, pas qu'il sait
      // traiter un ticket.
      depot.findOne.mockResolvedValue(ticket());
      utilisateurs.trouverParId.mockResolvedValue(destinataire(UserRole.USER));

      await expect(
        service.assigner(ID_TICKET, technicien.id, admin),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(depot.update).not.toHaveBeenCalled();
    });

    it('refuse un destinataire désactivé', async () => {
      depot.findOne.mockResolvedValue(ticket());
      utilisateurs.trouverParId.mockResolvedValue(
        destinataire(UserRole.TECHNICIAN, false),
      );

      await expect(
        service.assigner(ID_TICKET, technicien.id, admin),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuse un destinataire inexistant', async () => {
      depot.findOne.mockResolvedValue(ticket());
      utilisateurs.trouverParId.mockResolvedValue(null);

      await expect(
        service.assigner(ID_TICKET, technicien.id, admin),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("laisse un technicien s'attribuer un ticket", async () => {
      depot.findOne.mockResolvedValue(ticket());
      utilisateurs.trouverParId.mockResolvedValue(
        destinataire(UserRole.TECHNICIAN),
      );

      await service.assigner(ID_TICKET, technicien.id, technicien);

      expect(depot.update).toHaveBeenCalled();
    });

    it("empêche un technicien d'attribuer un ticket à quelqu'un d'autre", async () => {
      depot.findOne.mockResolvedValue(ticket());

      await expect(
        service.assigner(
          ID_TICKET,
          '88888888-8888-8888-8888-888888888888',
          technicien,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(depot.update).not.toHaveBeenCalled();
    });

    it('laisse un technicien libérer le ticket qu il détient', async () => {
      depot.findOne.mockResolvedValue(
        ticket(TicketStatus.IN_PROGRESS, technicien.id),
      );

      await service.assigner(ID_TICKET, null, technicien);

      expect(depot.update).toHaveBeenCalledWith(
        { id: ID_TICKET },
        { assigneeId: null },
      );
    });

    it("empêche un utilisateur ordinaire d'assigner", async () => {
      depot.findOne.mockResolvedValue(ticket());

      await expect(
        service.assigner(ID_TICKET, technicien.id, utilisateur),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("refuse d'assigner un ticket fermé", async () => {
      depot.findOne.mockResolvedValue(ticket(TicketStatus.CLOSED));

      await expect(
        service.assigner(ID_TICKET, technicien.id, admin),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
