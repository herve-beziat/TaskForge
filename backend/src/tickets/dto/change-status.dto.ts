import { IsEnum } from 'class-validator';
import { TicketStatus } from '../ticket.entity';

// Champ unique et obligatoire : la route n'existe que pour cela. Un corps vide
// est rejeté par la validation, le service n'a pas à s'en préoccuper.
export class ChangeStatusDto {
  @IsEnum(TicketStatus, {
    message: 'Le statut doit valoir OPEN, IN_PROGRESS, RESOLVED ou CLOSED.',
  })
  status: TicketStatus;
}
