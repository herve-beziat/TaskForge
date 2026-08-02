import {
  formaterDuree,
  tempsMoyenDeResolution,
  type PeriodeDeResolution,
} from './dashboard-metrics';

const OUVERTURE = new Date('2026-08-01T08:00:00.000Z');

// Fabrique un ticket ouvert à une date fixe et résolu N secondes plus tard.
// null signifie « jamais résolu ».
function periode(dureeEnSecondes: number | null): PeriodeDeResolution {
  if (dureeEnSecondes === null) {
    return { createdAt: OUVERTURE, resolvedAt: null };
  }

  return {
    createdAt: OUVERTURE,
    resolvedAt: new Date(OUVERTURE.getTime() + dureeEnSecondes * 1000),
  };
}

const UNE_HEURE = 3600;
const UN_JOUR = 86400;

describe('tempsMoyenDeResolution', () => {
  it('moyenne les durées des tickets résolus', () => {
    const moyenne = tempsMoyenDeResolution([
      periode(UNE_HEURE),
      periode(3 * UNE_HEURE),
    ]);

    expect(moyenne).toBe(2 * UNE_HEURE);
  });

  it('renvoie null sur une liste vide', () => {
    expect(tempsMoyenDeResolution([])).toBeNull();
  });

  it('renvoie null quand aucun ticket n’est résolu', () => {
    // null et non 0 : zéro se lirait « résolus instantanément », alors que
    // l'information réelle est qu'il n'y a rien à mesurer.
    const moyenne = tempsMoyenDeResolution([periode(null), periode(null)]);

    expect(moyenne).toBeNull();
  });

  it('ignore les tickets non résolus au dénominateur', () => {
    // Le test central. Compter le ticket non résolu comme une durée nulle
    // donnerait 1 h 20 au lieu de 2 h — et le temps moyen baisserait à mesure
    // que les tickets s'accumulent sans être traités.
    const moyenne = tempsMoyenDeResolution([
      periode(UNE_HEURE),
      periode(3 * UNE_HEURE),
      periode(null),
    ]);

    expect(moyenne).toBe(2 * UNE_HEURE);
  });

  it('renvoie la durée elle-même sur un seul ticket résolu', () => {
    expect(tempsMoyenDeResolution([periode(90)])).toBe(90);
  });
});

describe('formaterDuree', () => {
  it('annonce les durées inférieures à la minute', () => {
    expect(formaterDuree(20)).toBe("moins d'une minute");
  });

  it('affiche les minutes seules sous une heure', () => {
    expect(formaterDuree(42 * 60)).toBe('42 min');
  });

  it('omet les minutes nulles', () => {
    expect(formaterDuree(3 * UNE_HEURE)).toBe('3 h');
  });

  it('affiche heures et minutes', () => {
    expect(formaterDuree(3 * UNE_HEURE + 20 * 60)).toBe('3 h 20 min');
  });

  it('propage la retenue au lieu d’afficher soixante minutes', () => {
    // 23 h 59 min 30 s. Arrondir chaque unité séparément donnerait
    // « 23 h 60 min » ; l'arrondi du total avant décomposition donne « 1 j ».
    expect(formaterDuree(23 * UNE_HEURE + 59 * 60 + 30)).toBe('1 j');
  });

  it('affiche jours et heures', () => {
    expect(formaterDuree(2 * UN_JOUR + 5 * UNE_HEURE)).toBe('2 j 5 h');
  });

  it('omet les heures nulles', () => {
    expect(formaterDuree(2 * UN_JOUR)).toBe('2 j');
  });
});
