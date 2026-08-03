import { BadRequestException } from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import {
  construireErreurDeValidation,
  indexerParChamp,
} from './validation-exception';

function erreur(
  property: string,
  constraints?: Record<string, string>,
  children?: ValidationError[],
): ValidationError {
  return { property, constraints, children };
}

describe('indexerParChamp', () => {
  it('range les messages sous le nom de la propriété', () => {
    const champs = indexerParChamp([
      erreur('email', { isEmail: "L'adresse email n'est pas valide." }),
    ]);

    expect(champs).toEqual({
      email: ["L'adresse email n'est pas valide."],
    });
  });

  it('conserve toutes les contraintes violées d’un même champ', () => {
    // N'en garder qu'une afficherait « trop court » puis, une fois corrigé,
    // « caractères interdits » — l'utilisateur découvrirait les règles une par
    // une, à chaque soumission.
    const champs = indexerParChamp([
      erreur('password', {
        isString: 'Le mot de passe doit être une chaîne.',
        length: 'Le mot de passe doit contenir entre 10 et 72 caractères.',
      }),
    ]);

    expect(champs.password).toHaveLength(2);
  });

  it('préfixe les propriétés imbriquées par leur chemin', () => {
    const champs = indexerParChamp([
      erreur('filtre', undefined, [
        erreur('status', { isEnum: 'Statut inconnu.' }),
      ]),
    ]);

    expect(champs).toEqual({ 'filtre.status': ['Statut inconnu.'] });
  });

  it('n’émet pas de clé pour un conteneur sans contrainte propre', () => {
    // Un objet imbriqué invalide porte des enfants mais aucune contrainte :
    // lui créer une entrée vide donnerait un champ d'erreur sans message.
    const champs = indexerParChamp([
      erreur('filtre', undefined, [
        erreur('status', { isEnum: 'Statut inconnu.' }),
      ]),
    ]);

    expect(champs.filtre).toBeUndefined();
  });

  it('renvoie un objet vide sans erreur', () => {
    expect(indexerParChamp([])).toEqual({});
  });
});

describe('construireErreurDeValidation', () => {
  it('produit un 400 portant à la fois le tableau et l’index', () => {
    // Le tableau `message` est la forme renvoyée par Nest par défaut : le
    // supprimer romprait le contrat pour les clients existants, dont les
    // vérifications de recette.
    const exception = construireErreurDeValidation([
      erreur('email', { isEmail: "L'adresse email n'est pas valide." }),
      erreur('name', {
        length: 'Le nom doit contenir entre 2 et 120 caractères.',
      }),
    ]);

    expect(exception).toBeInstanceOf(BadRequestException);

    const corps = exception.getResponse() as {
      statusCode: number;
      message: string[];
      champs: Record<string, string[]>;
    };

    expect(corps.statusCode).toBe(400);
    expect(corps.message).toEqual([
      "L'adresse email n'est pas valide.",
      'Le nom doit contenir entre 2 et 120 caractères.',
    ]);
    expect(corps.champs).toEqual({
      email: ["L'adresse email n'est pas valide."],
      name: ['Le nom doit contenir entre 2 et 120 caractères.'],
    });
  });
});
