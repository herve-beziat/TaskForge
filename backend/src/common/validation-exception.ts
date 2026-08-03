import { BadRequestException } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

// Indexe les messages de validation par propriété.
//
// class-validator produit une structure arborescente ; Nest l'aplatit par
// défaut en un simple tableau de chaînes, où plus rien n'indique le champ en
// cause. Un formulaire ne peut alors afficher l'erreur sous le bon champ qu'en
// reconnaissant les messages à leur texte — ce qui casse à la première
// reformulation.
//
// La récursion couvre les objets imbriqués : aucun DTO du projet n'en a
// aujourd'hui, mais le cas se traiterait silencieusement de travers.
export function indexerParChamp(
  erreurs: ValidationError[],
  prefixe = '',
): Record<string, string[]> {
  const champs: Record<string, string[]> = {};

  for (const erreur of erreurs) {
    const chemin =
      prefixe === '' ? erreur.property : `${prefixe}.${erreur.property}`;

    if (erreur.constraints) {
      champs[chemin] = Object.values(erreur.constraints);
    }

    if (erreur.children && erreur.children.length > 0) {
      Object.assign(champs, indexerParChamp(erreur.children, chemin));
    }
  }

  return champs;
}

export function construireErreurDeValidation(
  erreurs: ValidationError[],
): BadRequestException {
  const champs = indexerParChamp(erreurs);

  return new BadRequestException({
    statusCode: 400,
    error: 'Bad Request',
    // Conservé tel quel : c'est la forme que Nest renvoie par défaut, et des
    // clients existants — dont les tests de recette — s'y appuient.
    message: Object.values(champs).flat(),
    champs,
  });
}
