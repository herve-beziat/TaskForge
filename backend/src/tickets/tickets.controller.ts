import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Auth } from '../auth/auth.decorator';
import type { UtilisateurAuthentifie } from '../auth/jwt.strategy';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ListTicketsDto } from './dto/list-tickets.dto';
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

export interface ListeTicketsPublique {
  donnees: TicketPublic[];
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

    return {
      ...resultat,
      donnees: resultat.donnees.map((ticket) => this.projeter(ticket)),
    };
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
