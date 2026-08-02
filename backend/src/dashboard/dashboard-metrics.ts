// Les deux seules colonnes nécessaires au calcul. Un type minimal plutôt que
// l'entité Ticket : le service ne charge que ces champs, et le test n'a pas à
// fabriquer un ticket complet pour vérifier une moyenne.
export interface PeriodeDeResolution {
  createdAt: Date;
  resolvedAt: Date | null;
}

const SECONDES_PAR_MINUTE = 60;
const MINUTES_PAR_HEURE = 60;
const HEURES_PAR_JOUR = 24;

// Moyenne des durées de résolution, en secondes.
//
// Renvoie null — et non 0 — quand aucun ticket n'est résolu. Zéro se lirait
// « résolus instantanément » et se propagerait tel quel dans le dashboard,
// alors que l'information réelle est qu'il n'y a rien à mesurer.
//
// Les tickets non résolus sont ignorés, pas comptés comme durée nulle : les
// inclure diviserait la moyenne par un dénominateur sans rapport avec elle.
export function tempsMoyenDeResolution(
  tickets: readonly PeriodeDeResolution[],
): number | null {
  const durees: number[] = [];

  for (const ticket of tickets) {
    if (ticket.resolvedAt === null) {
      continue;
    }
    const ecart = ticket.resolvedAt.getTime() - ticket.createdAt.getTime();
    durees.push(ecart / 1000);
  }

  if (durees.length === 0) {
    return null;
  }

  const total = durees.reduce((somme, duree) => somme + duree, 0);

  return total / durees.length;
}

// Met en forme une durée pour l'affichage : « 42 min », « 3 h 20 min », « 2 j 5 h ».
//
// Le total est arrondi à la minute une seule fois, avant décomposition. Arrondir
// chaque unité séparément produirait des retenues invalides — 23 h 59 min 30 s
// s'afficherait « 23 h 60 min ». Ici la retenue se propage d'elle-même et donne
// « 1 j ».
export function formaterDuree(secondes: number): string {
  const minutesTotales = Math.round(secondes / SECONDES_PAR_MINUTE);

  if (minutesTotales === 0) {
    return "moins d'une minute";
  }

  if (minutesTotales < MINUTES_PAR_HEURE) {
    return `${minutesTotales} min`;
  }

  const heuresTotales = Math.floor(minutesTotales / MINUTES_PAR_HEURE);
  const minutes = minutesTotales % MINUTES_PAR_HEURE;

  if (heuresTotales < HEURES_PAR_JOUR) {
    return minutes === 0
      ? `${heuresTotales} h`
      : `${heuresTotales} h ${minutes} min`;
  }

  const jours = Math.floor(heuresTotales / HEURES_PAR_JOUR);
  const heures = heuresTotales % HEURES_PAR_JOUR;

  return heures === 0 ? `${jours} j` : `${jours} j ${heures} h`;
}
