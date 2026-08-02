import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

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
}
