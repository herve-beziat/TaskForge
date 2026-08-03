import { BadRequestException, ParseUUIDPipe } from '@nestjs/common';

// Le message par défaut de ParseUUIDPipe est en anglais et parle de validation
// de format — deux choses que l'utilisateur n'a pas à connaître. Instance
// unique, partagée par tous les contrôleurs : un seul libellé à maintenir.
export const PipeUuid = new ParseUUIDPipe({
  exceptionFactory: () =>
    new BadRequestException("Cet identifiant n'est pas valide."),
});
