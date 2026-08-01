import { Body, Controller, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Auth } from '../auth/auth.decorator';
import type { UtilisateurAuthentifie } from '../auth/jwt.strategy';
import { CreateTicketDto } from './dto/create-ticket.dto';
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
