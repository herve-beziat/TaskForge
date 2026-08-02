import { IsUUID, ValidateIf } from 'class-validator';

export class AssignTicketDto {
  // null désassigne le ticket. @ValidateIf court-circuite la validation d'UUID
  // dans ce cas précis, mais pas si le champ est absent : un corps vide est
  // donc bien refusé.
  @ValidateIf((objet: AssignTicketDto) => objet.assigneeId !== null)
  @IsUUID(undefined, {
    message: "L'identifiant du technicien n'est pas valide.",
  })
  assigneeId: string | null;
}
