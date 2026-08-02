import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { TicketPriority } from '../ticket.entity';

// Ni status, ni reporterId, ni assigneeId : chacun relève d'une route et de
// règles distinctes (US08 pour le statut, US09 pour l'assignation). Le pipe
// global rejette toute tentative d'en glisser un ici.
export class UpdateTicketDto {
  @IsOptional()
  @IsString()
  @Length(3, 200, {
    message: 'Le titre doit contenir entre 3 et 200 caractères.',
  })
  title?: string;

  @IsOptional()
  @IsString()
  @Length(10, 5000, {
    message: 'La description doit contenir entre 10 et 5000 caractères.',
  })
  description?: string;

  @IsOptional()
  @IsEnum(TicketPriority, {
    message: 'La priorité doit valoir LOW, MEDIUM, HIGH ou CRITICAL.',
  })
  priority?: TicketPriority;
}
