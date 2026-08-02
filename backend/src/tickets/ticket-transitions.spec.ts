import { TicketStatus } from './ticket.entity';
import {
  TRANSITIONS_AUTORISEES,
  transitionAutorisee,
} from './ticket-transitions';

const TOUS_LES_STATUTS = Object.values(TicketStatus);

// La référence, écrite une seule fois. Tout le reste en découle.
const AUTORISEES: [TicketStatus, TicketStatus][] = [
  [TicketStatus.OPEN, TicketStatus.IN_PROGRESS],
  [TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED],
  [TicketStatus.RESOLVED, TicketStatus.CLOSED],
  [TicketStatus.RESOLVED, TicketStatus.IN_PROGRESS],
];

// Les seize combinaisons possibles, générées plutôt qu'énumérées : une liste
// écrite à la main ne couvrirait que les cas auxquels on a pensé.
const TOUTES: [TicketStatus, TicketStatus][] = TOUS_LES_STATUTS.flatMap(
  (depuis) =>
    TOUS_LES_STATUTS.map(
      (vers) => [depuis, vers] as [TicketStatus, TicketStatus],
    ),
);

const INTERDITES = TOUTES.filter(
  ([depuis, vers]) => !AUTORISEES.some(([a, b]) => a === depuis && b === vers),
);

describe('transitions de statut', () => {
  it('couvre bien les seize combinaisons', () => {
    expect(TOUTES).toHaveLength(16);
    expect(AUTORISEES).toHaveLength(4);
    expect(INTERDITES).toHaveLength(12);
  });

  it.each(AUTORISEES)('autorise %s vers %s', (depuis, vers) => {
    expect(transitionAutorisee(depuis, vers)).toBe(true);
  });

  it.each(INTERDITES)('refuse %s vers %s', (depuis, vers) => {
    expect(transitionAutorisee(depuis, vers)).toBe(false);
  });

  it('rend CLOSED terminal', () => {
    expect(TRANSITIONS_AUTORISEES[TicketStatus.CLOSED]).toHaveLength(0);
  });

  it("n'autorise aucun statut à transiter vers lui-même", () => {
    for (const statut of TOUS_LES_STATUTS) {
      expect(transitionAutorisee(statut, statut)).toBe(false);
    }
  });
});
