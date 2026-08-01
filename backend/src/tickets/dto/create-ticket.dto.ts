import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { TicketPriority } from '../ticket.entity';

export class CreateTicketDto {
  @IsString()
  @Length(3, 200, {
    message: 'Le titre doit contenir entre 3 et 200 caractères.',
  })
  title: string;

  // Borne haute arbitraire : la colonne est un « text » sans limite côté base,
  // mais rien ne justifie d'accepter un mégaoctet de description.
  @IsString()
  @Length(10, 5000, {
    message: 'La description doit contenir entre 10 et 5000 caractères.',
  })
  description: string;

  // Seul champ facultatif : l'entité applique MEDIUM par défaut.
  @IsOptional()
  @IsEnum(TicketPriority, {
    message: 'La priorité doit valoir LOW, MEDIUM, HIGH ou CRITICAL.',
  })
  priority?: TicketPriority;
}
