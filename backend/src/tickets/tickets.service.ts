import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { InjectRepository } from '@nestjs/typeorm';
import { Counter } from 'prom-client';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { UserRole } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ChampDeTri, ListTicketsDto, SensDeTri } from './dto/list-tickets.dto';
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

// Projection commune à la liste et au détail.
//
// Les relations sont réduites à l'identifiant et au nom. Les charger entières
// fait partir l'email, isActive, createdAt et updatedAt de chaque rapporteur
// dans la réponse — gratuitement, et pour tout utilisateur autorisé à voir le
// ticket. La colonne du hachage est déjà écartée par select: false, mais elle
// n'est pas la seule donnée à ne pas diffuser.
//
// Les colonnes racine sont listées explicitement : dès qu'une projection porte
// sur une relation, TypeORM restreint aussi la table principale à ce qui est
// nommé. Une colonne ajoutée à l'entité et oubliée ici disparaîtrait de l'API.

const RELATIONS_TICKET = { reporter: true, assignee: true };

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly depot: Repository<Ticket>,
    @InjectMetric('taskforge_tickets_created_total')
    private readonly compteurCreations: Counter<string>,
    // Nécessaire pour vérifier que le destinataire est bien un technicien
    // actif : la contrainte de clé étrangère garantit qu'il existe, pas qu'il
    // a le bon rôle.
    private readonly utilisateurs: UsersService,
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
    //
    // Avant la relecture, en revanche : le ticket existe dès le save, et un
    // échec de relecture ne doit pas faire disparaître une création réelle du
    // compteur.
    this.compteurCreations.inc();

    // `save` renvoie l'entité telle qu'écrite, sans reporter ni assignee. Sans
    // cette relecture, POST /tickets serait la seule route de la ressource à
    // renvoyer une forme différente des cinq autres — et le type `Ticket` du
    // front serait faux pour ce seul cas.
    return this.depot.findOneOrFail({
      where: { id: enregistre.id },
      relations: RELATIONS_TICKET,
    });
  }

  async lister(
    options: ListTicketsDto,
    demandeur: Demandeur,
  ): Promise<ResultatPagine> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;

    const champ = options.sortBy ?? ChampDeTri.CREATED_AT;
    const sens = options.sortOrder ?? SensDeTri.DESC;

    const [donnees, total] = await this.depot.findAndCount({
      where: this.construireFiltre(options, demandeur),
      // Charger les noms coûte une jointure par page de vingt lignes, et évite
      // à l'interface d'afficher des identifiants illisibles ou de lancer une
      // requête par ligne pour les résoudre.
      // Le contrôleur expose ces noms dans la liste ; sans la jointure, il
      // faudrait une requête par ligne pour les résoudre.
      relations: RELATIONS_TICKET,
      // La clé est calculée, mais ChampDeTri est une union de littéraux : le
      // typage tient sans conversion. C'est cette énumération, déclarée dans le
      // DTO, qui garantit qu'aucune chaîne arbitraire n'atteint la clause
      // ORDER BY — le point sensible, puisqu'elle n'est pas paramétrable.
      order: { [champ]: sens },
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
      // Le hachage du mot de passe est écarté par select: false depuis US01.
      // Le reste de l'entité ne sort pas non plus : c'est le contrôleur qui
      // projette, dans projeterEnDetail.
      relations: RELATIONS_TICKET,
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

  async assigner(
    id: string,
    assigneeId: string | null,
    demandeur: Demandeur,
  ): Promise<Ticket> {
    const ticket = await this.trouverParId(id, demandeur);

    if (ticket.status === TicketStatus.CLOSED) {
      throw new ForbiddenException(
        'Un ticket fermé ne peut plus être assigné.',
      );
    }

    this.verifierDroitDAssigner(ticket, assigneeId, demandeur);
    await this.verifierDestinataire(assigneeId);

    await this.depot.update({ id }, { assigneeId });

    return this.trouverParId(id, demandeur);
  }

  // L'administrateur répartit la charge à sa guise. Le technicien ne dispose
  // que de lui-même : il prend un ticket, ou libère celui qu'il détient. C'est
  // le fonctionnement réel d'un helpdesk, où l'on ne passe pas par sa
  // hiérarchie pour se saisir d'un incident.
  private verifierDroitDAssigner(
    ticket: Ticket,
    assigneeId: string | null,
    demandeur: Demandeur,
  ): void {
    if (demandeur.role === UserRole.ADMIN) {
      return;
    }

    if (demandeur.role !== UserRole.TECHNICIAN) {
      throw new ForbiddenException(
        'Seul un administrateur ou un technicien peut assigner un ticket.',
      );
    }

    const sAttribue = assigneeId === demandeur.id;
    const seRetire = assigneeId === null && ticket.assigneeId === demandeur.id;

    if (!sAttribue && !seRetire) {
      throw new ForbiddenException(
        "Un technicien ne peut s'attribuer qu'un ticket pour lui-même, ou libérer le sien.",
      );
    }
  }

  // La clé étrangère garantit que l'utilisateur existe, rien de plus. Rien
  // n'empêcherait sans cela d'assigner un ticket à un compte désactivé, ou à
  // un utilisateur ordinaire qui n'a aucun moyen de le traiter.
  private async verifierDestinataire(assigneeId: string | null): Promise<void> {
    if (assigneeId === null) {
      return;
    }

    const cible = await this.utilisateurs.trouverParId(assigneeId);

    if (!cible) {
      throw new BadRequestException('Utilisateur introuvable.');
    }

    if (cible.role !== UserRole.TECHNICIAN) {
      throw new BadRequestException(
        'Seul un technicien peut se voir assigner un ticket.',
      );
    }

    if (!cible.isActive) {
      throw new BadRequestException('Ce compte est désactivé.');
    }
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

  // Assemble la visibilité et les filtres demandés.
  //
  // Visibilité : un utilisateur ordinaire ne voit que ses propres signalements.
  // Technicien et administrateur voient l'ensemble — un technicien doit pouvoir
  // reprendre le ticket d'un collègue absent.
  private construireFiltre(
    options: ListTicketsDto,
    demandeur: Demandeur,
  ): FindOptionsWhere<Ticket> | FindOptionsWhere<Ticket>[] {
    const base: FindOptionsWhere<Ticket> = {};

    if (demandeur.role === UserRole.USER) {
      base.reporterId = demandeur.id;
    }
    if (options.status !== undefined) {
      base.status = options.status;
    }
    if (options.priority !== undefined) {
      base.priority = options.priority;
    }
    if (options.assigneeId !== undefined) {
      base.assigneeId = options.assigneeId;
    }

    if (options.search === undefined) {
      return base;
    }

    const motif = ILike(`%${options.search}%`);

    // Un tableau est interprété par TypeORM comme un OU. La base doit être
    // répétée dans chaque branche : sans cela, la règle de visibilité et les
    // filtres ne s'appliqueraient qu'à la première, et un utilisateur ordinaire
    // verrait les tickets d'autrui dès qu'il lance une recherche.
    return [
      { ...base, title: motif },
      { ...base, description: motif },
    ];
  }
}
