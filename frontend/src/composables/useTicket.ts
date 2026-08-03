import { computed, ref, watch } from 'vue'
import { ErreurApi } from '@/services/http'
import { ticketsApi, type ModificationTicket } from '@/services/tickets.api'
import { useAuthStore } from '@/stores/auth'
import { TicketStatus, UserRole, type Ticket } from '@/types/api'

// Copie de backend/src/tickets/ticket-transitions.ts.
//
// Duplication assumée : sans elle, l'écran proposerait des transitions vouées à
// un 400. Le backend reste seul juge — si les deux tables divergent, l'API
// refuse et le message s'affiche. Le front n'anticipe que l'affichage.
const TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  OPEN: [TicketStatus.IN_PROGRESS],
  IN_PROGRESS: [TicketStatus.RESOLVED],
  RESOLVED: [TicketStatus.CLOSED, TicketStatus.IN_PROGRESS],
  CLOSED: [],
}

export function useTicket(identifiant: () => string) {
  const auth = useAuthStore()

  const ticket = ref<Ticket | null>(null)
  const enCours = ref(false)
  const enAction = ref(false)
  const erreur = ref<ErreurApi | null>(null)
  const introuvable = ref(false)

  async function charger(): Promise<void> {
    enCours.value = true
    erreur.value = null
    introuvable.value = false

    try {
      ticket.value = await ticketsApi.detail(identifiant())
    } catch (cause) {
      const echec =
        cause instanceof ErreurApi ? cause : new ErreurApi(0, ['Impossible de charger le ticket.'])

      // Le backend répond 404 aussi bien pour un ticket inexistant que pour
      // celui d'un autre utilisateur — c'est délibéré, un 403 permettrait
      // d'énumérer les identifiants. L'écran ne cherche donc pas à distinguer.
      if (echec.statut === 404) {
        introuvable.value = true
      } else {
        erreur.value = echec
      }
      ticket.value = null
    } finally {
      enCours.value = false
    }
  }

  watch(identifiant, charger, { immediate: true })

  // Enveloppe commune aux actions : le ticket renvoyé remplace le courant, ce
  // qui remet à jour statut, assigné et droits d'un seul coup.
  async function agir(action: () => Promise<Ticket>): Promise<boolean> {
    enAction.value = true
    erreur.value = null

    try {
      ticket.value = await action()
      return true
    } catch (cause) {
      erreur.value = cause instanceof ErreurApi ? cause : new ErreurApi(0, ["L'action a échoué."])
      return false
    } finally {
      enAction.value = false
    }
  }

  const estAuteur = computed(() => ticket.value?.reporterId === auth.utilisateur?.id)

  // L'auteur peut corriger son signalement tant que personne ne l'a pris en
  // charge. Technicien et administrateur gardent la main jusqu'à la fermeture.
  const peutModifier = computed(() => {
    if (!ticket.value) {
      return false
    }
    if (auth.aLeRole(UserRole.USER)) {
      return estAuteur.value && ticket.value.status === TicketStatus.OPEN
    }
    return ticket.value.status !== TicketStatus.CLOSED
  })

  // Transitions à proposer, une fois les droits appliqués.
  //
  // Le rapporteur n'intervient qu'une fois le problème déclaré résolu : c'est à
  // lui de confirmer, ou de signaler qu'il persiste.
  const statutsProposables = computed<TicketStatus[]>(() => {
    if (!ticket.value) {
      return []
    }

    const possibles = TRANSITIONS[ticket.value.status]

    if (!auth.aLeRole(UserRole.USER)) {
      return possibles
    }

    return ticket.value.status === TicketStatus.RESOLVED ? possibles : []
  })

  const estOuvertALAssignation = computed(
    () => ticket.value !== null && ticket.value.status !== TicketStatus.CLOSED,
  )

  const peutSAttribuer = computed(
    () =>
      estOuvertALAssignation.value &&
      auth.aLeRole(UserRole.TECHNICIAN) &&
      ticket.value?.assigneeId !== auth.utilisateur?.id,
  )

  const peutSeLiberer = computed(
    () =>
      estOuvertALAssignation.value &&
      auth.aLeRole(UserRole.TECHNICIAN) &&
      ticket.value?.assigneeId === auth.utilisateur?.id,
  )

  // L'administrateur répartit la charge : il peut retirer un ticket à celui qui
  // le détient. Le lui attribuer à un autre technicien suppose la liste des
  // comptes, qui arrive avec US21.
  const peutDesassigner = computed(
    () =>
      estOuvertALAssignation.value &&
      auth.aLeRole(UserRole.ADMIN) &&
      ticket.value?.assigneeId !== null,
  )

  function enregistrer(modifications: ModificationTicket): Promise<boolean> {
    return agir(() => ticketsApi.modifier(identifiant(), modifications))
  }

  function changerStatut(statut: TicketStatus): Promise<boolean> {
    return agir(() => ticketsApi.changerStatut(identifiant(), statut))
  }

  function assigner(assigneeId: string | null): Promise<boolean> {
    return agir(() => ticketsApi.assigner(identifiant(), assigneeId))
  }

  return {
    ticket,
    enCours,
    enAction,
    erreur,
    introuvable,
    estAuteur,
    peutModifier,
    statutsProposables,
    peutSAttribuer,
    peutSeLiberer,
    peutDesassigner,
    charger,
    enregistrer,
    changerStatut,
    assigner,
  }
}
