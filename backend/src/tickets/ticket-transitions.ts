import { TicketStatus } from './ticket.entity';

/**
 * Transitions autorisées entre statuts.
 *
 *   OPEN → IN_PROGRESS → RESOLVED → CLOSED
 *                   ↑         │
 *                   └─────────┘  réouverture
 *
 * CLOSED est terminal : sa liste est vide.
 *
 * Table déclarative plutôt que cascade de conditions — elle se lit d'un coup
 * d'œil, et elle rend possible un test exhaustif des seize combinaisons.
 */
export const TRANSITIONS_AUTORISEES: Readonly<
  Record<TicketStatus, readonly TicketStatus[]>
> = {
  [TicketStatus.OPEN]: [TicketStatus.IN_PROGRESS],
  [TicketStatus.IN_PROGRESS]: [TicketStatus.RESOLVED],
  // La réouverture couvre le cas réel où l'utilisateur signale que le
  // problème persiste malgré la résolution annoncée.
  [TicketStatus.RESOLVED]: [TicketStatus.CLOSED, TicketStatus.IN_PROGRESS],
  [TicketStatus.CLOSED]: [],
};

export function transitionAutorisee(
  depuis: TicketStatus,
  vers: TicketStatus,
): boolean {
  return TRANSITIONS_AUTORISEES[depuis].includes(vers);
}
