import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';
import { TicketPriority, TicketStatus } from '../ticket.entity';

// Énumération et non chaîne libre : la valeur finit dans la clause ORDER BY,
// une chaîne arbitraire y ouvrirait une injection SQL.
export enum ChampDeTri {
  CREATED_AT = 'createdAt',
  PRIORITY = 'priority',
  STATUS = 'status',
}

export enum SensDeTri {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class ListTicketsDto {
  // Les paramètres d'URL arrivent en chaînes de caractères : sans cette
  // conversion, « ?page=2 » échouerait sur @IsInt alors que la valeur est
  // valide. C'est le piège classique de la validation sur une requête GET.
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La page doit être un entier.' })
  @Min(1, { message: 'La page doit valoir au moins 1.' })
  page?: number = 1;

  // La borne haute n'est pas cosmétique : sans elle, « ?limit=1000000 »
  // chargerait toute la table en mémoire — un déni de service à la portée de
  // n'importe quel utilisateur authentifié.
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La taille de page doit être un entier.' })
  @Min(1, { message: 'La taille de page doit valoir au moins 1.' })
  @Max(100, { message: 'La taille de page ne peut pas dépasser 100.' })
  limit?: number = 20;

  @IsOptional()
  @IsEnum(TicketStatus, {
    message: 'Le statut doit valoir OPEN, IN_PROGRESS, RESOLVED ou CLOSED.',
  })
  status?: TicketStatus;

  @IsOptional()
  @IsEnum(TicketPriority, {
    message: 'La priorité doit valoir LOW, MEDIUM, HIGH ou CRITICAL.',
  })
  priority?: TicketPriority;

  @IsOptional()
  @IsUUID(undefined, {
    message: "L'identifiant du technicien n'est pas valide.",
  })
  assigneeId?: string;

  // Borne basse à deux caractères : une recherche sur une seule lettre
  // ramènerait la quasi-totalité de la table pour aucun usage réel.
  @IsOptional()
  @IsString()
  @Length(2, 100, {
    message: 'La recherche doit contenir entre 2 et 100 caractères.',
  })
  search?: string;

  @IsOptional()
  @IsEnum(ChampDeTri, {
    message: 'Le tri doit porter sur createdAt, priority ou status.',
  })
  sortBy?: ChampDeTri = ChampDeTri.CREATED_AT;

  @IsOptional()
  @IsEnum(SensDeTri, { message: 'Le sens du tri doit valoir ASC ou DESC.' })
  sortOrder?: SensDeTri = SensDeTri.DESC;
}
