import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Auth } from '../auth/auth.decorator';
import { PipeUuid } from '../common/uuid.pipe';
import type { UtilisateurAuthentifie } from '../auth/jwt.strategy';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ListTicketsDto } from './dto/list-tickets.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { Ticket, TicketPriority, TicketStatus } from './ticket.entity';
import { TicketsService } from './tickets.service';

export interface TicketPublic {
  id: string;
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  reporterId: string;
  assigneeId: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UtilisateurResume {
  id: string;
  name: string;
}

export interface TicketDetaille extends TicketPublic {
  reporter: UtilisateurResume;
  assignee: UtilisateurResume | null;
}

export interface ListeTicketsPublique {
  donnees: TicketDetaille[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// @Auth() sans argument : tout utilisateur authentifié peut signaler un
// incident, quel que soit son rôle. C'est le principe même d'un helpdesk.
@Controller('tickets')
@Auth()
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Post()
  async creer(
    @Body() donnees: CreateTicketDto,
    @Req() requete: Request,
  ): Promise<TicketPublic> {
    const demandeur = requete.user as UtilisateurAuthentifie;
    const ticket = await this.tickets.creer(donnees, demandeur.id);
    return this.projeter(ticket);
  }

  // Le DTO en @Query bénéficie de la validation et de la conversion de types
  // du pipe global, comme le ferait un corps de requête.
  //
  // Aucune décision de visibilité ici : le contrôleur transmet l'identité de
  // l'appelant, le service applique la règle.
  @Get()
  async lister(
    @Query() options: ListTicketsDto,
    @Req() requete: Request,
  ): Promise<ListeTicketsPublique> {
    const demandeur = requete.user as UtilisateurAuthentifie;
    const resultat = await this.tickets.lister(options, demandeur);

    // projeterEnDetail et non projeter : la liste affiche les noms du
    // rapporteur et de l'assigné, et le service charge désormais les relations
    // pour ça. La projection reste la même que celle du détail — deux formes
    // différentes pour la même ressource obligeraient le front à deux types.
    return {
      ...resultat,
      donnees: resultat.donnees.map((ticket) => this.projeterEnDetail(ticket)),
    };
  }

  // ParseUUIDPipe transforme un identifiant malformé en 400 avant que la
  // requête n'atteigne la base, qui renverrait sinon une erreur de conversion.
  @Get(':id')
  async detail(
    @Param('id', PipeUuid) id: string,
    @Req() requete: Request,
  ): Promise<TicketDetaille> {
    const demandeur = requete.user as UtilisateurAuthentifie;
    const ticket = await this.tickets.trouverParId(id, demandeur);

    return this.projeterEnDetail(ticket);
  }

  // Le nom seul, jamais l'email : le critère demande d'afficher les
  // intervenants, pas de publier leurs coordonnées.
  private projeterEnDetail(ticket: Ticket): TicketDetaille {
    return {
      ...this.projeter(ticket),
      reporter: { id: ticket.reporter.id, name: ticket.reporter.name },
      assignee: ticket.assignee
        ? { id: ticket.assignee.id, name: ticket.assignee.name }
        : null,
    };
  }

  @Patch(':id')
  async modifier(
    @Param('id', PipeUuid) id: string,
    @Body() donnees: UpdateTicketDto,
    @Req() requete: Request,
  ): Promise<TicketDetaille> {
    const demandeur = requete.user as UtilisateurAuthentifie;
    const ticket = await this.tickets.modifier(id, donnees, demandeur);
    return this.projeterEnDetail(ticket);
  }

  // Route dédiée plutôt qu'un champ du PATCH général : le statut n'obéit pas
  // aux mêmes règles que le titre ou la priorité. Il suit une machine à états
  // et des droits distincts — les mélanger rendrait les deux illisibles.
  @Patch(':id/status')
  async changerStatut(
    @Param('id', PipeUuid) id: string,
    @Body() donnees: ChangeStatusDto,
    @Req() requete: Request,
  ): Promise<TicketDetaille> {
    const demandeur = requete.user as UtilisateurAuthentifie;
    const ticket = await this.tickets.changerStatut(
      id,
      donnees.status,
      demandeur,
    );
    return this.projeterEnDetail(ticket);
  }

  // Route dédiée, comme pour le statut : l'assignation obéit à ses propres
  // règles et son propre contrôle du destinataire.
  @Patch(':id/assignee')
  async assigner(
    @Param('id', PipeUuid) id: string,
    @Body() donnees: AssignTicketDto,
    @Req() requete: Request,
  ): Promise<TicketDetaille> {
    const demandeur = requete.user as UtilisateurAuthentifie;
    const ticket = await this.tickets.assigner(
      id,
      donnees.assigneeId,
      demandeur,
    );
    return this.projeterEnDetail(ticket);
  }

  // Expose les identifiants, jamais les entités liées : renvoyer l'objet
  // « reporter » complet ferait sortir l'email et le nom d'un utilisateur à
  // quiconque consulte le ticket.
  private projeter(ticket: Ticket): TicketPublic {
    return {
      id: ticket.id,
      title: ticket.title,
      description: ticket.description,
      priority: ticket.priority,
      status: ticket.status,
      reporterId: ticket.reporterId,
      assigneeId: ticket.assigneeId,
      resolvedAt: ticket.resolvedAt,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    };
  }
}
