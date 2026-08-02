import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { InjectRepository } from '@nestjs/typeorm';
import { Counter } from 'prom-client';
import { FindOptionsWhere, Repository } from 'typeorm';
import { UserRole } from '../users/user.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ListTicketsDto } from './dto/list-tickets.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { Ticket, TicketStatus } from './ticket.entity';
import { transitionAutorisee } from './ticket-transitions';

// Réduit à ce dont le service a besoin : il n'a pas à connaître le type
// produit par la stratégie d'authentification, et les tests non plus.
export interface Demandeur {
  id: string;
  role: UserRole;
}

export interface ResultatPagine {
  donnees: Ticket[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly depot: Repository<Ticket>,
    @InjectMetric('taskforge_tickets_created_total')
    private readonly compteurCreations: Counter<string>,
  ) {}

  // reporterId vient du jeton, jamais du corps de la requête : personne ne
  // peut créer un ticket au nom d'un autre.
  //
  // Le statut n'est pas fixé ici — l'entité porte OPEN par défaut. Une seule
  // source pour cette règle plutôt que deux à garder cohérentes.
  async creer(donnees: CreateTicketDto, reporterId: string): Promise<Ticket> {
    const ticket = this.depot.create({ ...donnees, reporterId });
    const enregistre = await this.depot.save(ticket);

    // Après la persistance uniquement : compter les créations qui échouent
    // donnerait une métrique fausse, ce qui est pire qu'une métrique absente.
    this.compteurCreations.inc();

    return enregistre;
  }

  async lister(
    options: ListTicketsDto,
    demandeur: Demandeur,
  ): Promise<ResultatPagine> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;

    const [donnees, total] = await this.depot.findAndCount({
      where: this.filtreDeVisibilite(demandeur),
      // Du plus récent au plus ancien : le dernier incident signalé est
      // celui qui intéresse.
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      donnees,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async trouverParId(id: string, demandeur: Demandeur): Promise<Ticket> {
    const ticket = await this.depot.findOne({
      where: { id },
      // Le hachage du mot de passe reste exclu de ces relations : la colonne
      // porte select: false depuis US01.
      relations: { reporter: true, assignee: true },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket introuvable.');
    }

    // 404 et non 403 : un 403 confirmerait l'existence du ticket, et il
    // suffirait d'énumérer des identifiants pour cartographier la base. Le
    // refus doit être indiscernable de l'absence.
    if (
      demandeur.role === UserRole.USER &&
      ticket.reporterId !== demandeur.id
    ) {
      throw new NotFoundException('Ticket introuvable.');
    }

    return ticket;
  }

  async modifier(
    id: string,
    donnees: UpdateTicketDto,
    demandeur: Demandeur,
  ): Promise<Ticket> {
    // Un corps vide passerait la validation, ne ferait rien, et renverrait
    // un 200 trompeur.
    if (
      donnees.title === undefined &&
      donnees.description === undefined &&
      donnees.priority === undefined
    ) {
      throw new BadRequestException('Aucune modification demandée.');
    }

    // Réutilise le contrôle de visibilité et le 404 : un utilisateur ordinaire
    // qui vise le ticket d'un autre obtient la même réponse qu'à la
    // consultation, et cette règle n'existe qu'à un seul endroit.
    const ticket = await this.trouverParId(id, demandeur);

    this.verifierDroitDeModifier(ticket, demandeur);

    await this.depot.update({ id }, donnees);

    return this.trouverParId(id, demandeur);
  }

  async changerStatut(
    id: string,
    nouveauStatut: TicketStatus,
    demandeur: Demandeur,
  ): Promise<Ticket> {
    const ticket = await this.trouverParId(id, demandeur);

    // Validée avant les droits : un statut impossible est une erreur de forme,
    // pas de permission, et la réponse ne doit pas dépendre du demandeur.
    if (!transitionAutorisee(ticket.status, nouveauStatut)) {
      throw new BadRequestException(
        `Transition impossible : ${ticket.status} vers ${nouveauStatut}.`,
      );
    }

    this.verifierDroitDeChangerStatut(ticket, nouveauStatut, demandeur);

    // Piloté par la transition, jamais par le client, et seulement quand la
    // transition le justifie :
    //   - vers RESOLVED : on horodate ;
    //   - réouverture depuis RESOLVED : on efface, sinon un ticket rouvert
    //     puis re-résolu garderait la date de sa première résolution ;
    //   - tout le reste, dont la clôture : on n'y touche pas. Un ticket clos
    //     doit conserver sa date de résolution, c'est elle que mesure US15.
    const misesAJour: { status: TicketStatus; resolvedAt?: Date | null } = {
      status: nouveauStatut,
    };

    if (nouveauStatut === TicketStatus.RESOLVED) {
      misesAJour.resolvedAt = new Date();
    } else if (
      nouveauStatut === TicketStatus.IN_PROGRESS &&
      ticket.status === TicketStatus.RESOLVED
    ) {
      misesAJour.resolvedAt = null;
    }

    await this.depot.update({ id }, misesAJour);

    return this.trouverParId(id, demandeur);
  }

  // Technicien et administrateur pilotent l'ensemble du cycle. Le rapporteur
  // n'intervient qu'une fois le problème déclaré résolu : c'est à lui de
  // confirmer que c'est bien le cas, ou de signaler qu'il persiste.
  private verifierDroitDeChangerStatut(
    ticket: Ticket,
    nouveauStatut: TicketStatus,
    demandeur: Demandeur,
  ): void {
    if (demandeur.role !== UserRole.USER) {
      return;
    }

    const validationParLeDemandeur =
      ticket.status === TicketStatus.RESOLVED &&
      (nouveauStatut === TicketStatus.CLOSED ||
        nouveauStatut === TicketStatus.IN_PROGRESS);

    if (!validationParLeDemandeur) {
      throw new ForbiddenException(
        'Seul un technicien peut faire évoluer ce ticket.',
      );
    }
  }

  // L'auteur peut corriger son signalement tant que personne ne l'a pris en
  // charge. Passé ce stade, modifier la description reviendrait à réécrire
  // l'énoncé du problème sous les pieds du technicien qui y travaille.
  //
  // Technicien et administrateur gardent la main jusqu'à la fermeture : ajuster
  // la priorité d'un incident en cours fait partie de leur métier.
  private verifierDroitDeModifier(ticket: Ticket, demandeur: Demandeur): void {
    if (demandeur.role === UserRole.USER) {
      if (ticket.status !== TicketStatus.OPEN) {
        throw new ForbiddenException(
          'Ce ticket est pris en charge et ne peut plus être modifié par son auteur.',
        );
      }
      return;
    }

    if (ticket.status === TicketStatus.CLOSED) {
      throw new ForbiddenException(
        'Un ticket fermé ne peut plus être modifié.',
      );
    }
  }

  // Règle métier, pas détail de présentation : un utilisateur ordinaire ne
  // voit que ses propres signalements. Technicien et administrateur voient
  // l'ensemble — un technicien doit pouvoir reprendre le ticket d'un collègue
  // absent.
  private filtreDeVisibilite(
    demandeur: Demandeur,
  ): FindOptionsWhere<Ticket> | undefined {
    if (demandeur.role === UserRole.USER) {
      return { reporterId: demandeur.id };
    }
    return undefined;
  }
}
