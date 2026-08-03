import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useTicket } from '../useTicket'
import { ticketsApi, type ModificationTicket } from '@/services/tickets.api'
import { ErreurApi } from '@/services/http'
import { useAuthStore } from '@/stores/auth'
import { TicketPriority, TicketStatus, UserRole } from '@/types/api'
import type { Ticket, UserRole as Role, Utilisateur } from '@/types/api'

vi.mock('@/services/tickets.api', () => ({
  ticketsApi: {
    detail: vi.fn<(id: string) => Promise<Ticket>>(),
    modifier: vi.fn<(id: string, donnees: ModificationTicket) => Promise<Ticket>>(),
    changerStatut: vi.fn<(id: string, statut: TicketStatus) => Promise<Ticket>>(),
    assigner: vi.fn<(id: string, assigneeId: string | null) => Promise<Ticket>>(),
  },
}))

const ID_TICKET = '44444444-4444-4444-4444-444444444444'
const ID_AUTEUR = '11111111-1111-1111-1111-111111111111'
const ID_TECHNICIEN = '22222222-2222-2222-2222-222222222222'
const ID_ADMIN = '33333333-3333-3333-3333-333333333333'

function profil(id: string, role: Role): Utilisateur {
  return { id, email: 'x@exemple.fr', name: 'Testeur', role, createdAt: '2026-08-01T08:00:00.000Z' }
}

function ticketFactice(
  status: TicketStatus,
  assigneeId: string | null = null,
  reporterId = ID_AUTEUR,
): Ticket {
  return {
    id: ID_TICKET,
    title: 'Imprimante hors service',
    description: "L'imprimante du deuxième étage ne répond plus.",
    status,
    priority: TicketPriority.HIGH,
    resolvedAt: null,
    reporterId,
    assigneeId,
    reporter: { id: reporterId, name: 'Auteur' },
    assignee: assigneeId === null ? null : { id: assigneeId, name: 'Technicien' },
    createdAt: '2026-08-01T08:00:00.000Z',
    updatedAt: '2026-08-01T08:00:00.000Z',
  }
}

async function monter(compte: Utilisateur, initial: Ticket | null) {
  setActivePinia(createPinia())
  const auth = useAuthStore()
  auth.utilisateur = compte

  if (initial !== null) {
    vi.mocked(ticketsApi.detail).mockResolvedValue(initial)
  }

  let outil!: ReturnType<typeof useTicket>

  const Hote = defineComponent({
    setup() {
      outil = useTicket(() => ID_TICKET)
      return () => h('div')
    },
  })

  mount(Hote)
  await flushPromises()

  return outil
}

describe('useTicket', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('chargement', () => {
    it('charge le ticket au montage', async () => {
      const outil = await monter(profil(ID_ADMIN, UserRole.ADMIN), ticketFactice(TicketStatus.OPEN))

      expect(ticketsApi.detail).toHaveBeenCalledWith(ID_TICKET)
      expect(outil.ticket.value?.id).toBe(ID_TICKET)
    })

    it('traite un 404 comme « introuvable », sans message d’erreur', async () => {
      // Le backend répond 404 aussi bien pour un ticket inexistant que pour
      // celui d'un autre utilisateur : chercher à distinguer les deux
      // reviendrait à rétablir ce que le 404 protège.
      vi.mocked(ticketsApi.detail).mockRejectedValue(new ErreurApi(404, ['Ticket introuvable.']))

      const outil = await monter(profil(ID_AUTEUR, UserRole.USER), null)

      expect(outil.introuvable.value).toBe(true)
      expect(outil.erreur.value).toBeNull()
      expect(outil.ticket.value).toBeNull()
    })

    it('expose les autres erreurs', async () => {
      vi.mocked(ticketsApi.detail).mockRejectedValue(new ErreurApi(500, ['Panne.']))

      const outil = await monter(profil(ID_ADMIN, UserRole.ADMIN), null)

      expect(outil.introuvable.value).toBe(false)
      expect(outil.erreur.value?.messages).toEqual(['Panne.'])
    })
  })

  describe('droit de modifier', () => {
    it('autorise l’auteur sur un ticket ouvert', async () => {
      const outil = await monter(profil(ID_AUTEUR, UserRole.USER), ticketFactice(TicketStatus.OPEN))

      expect(outil.peutModifier.value).toBe(true)
    })

    it('refuse l’auteur dès la prise en charge', async () => {
      // Modifier la description reviendrait à réécrire l'énoncé du problème
      // sous les pieds du technicien qui y travaille.
      const outil = await monter(
        profil(ID_AUTEUR, UserRole.USER),
        ticketFactice(TicketStatus.IN_PROGRESS),
      )

      expect(outil.peutModifier.value).toBe(false)
    })

    it('autorise un technicien sur un ticket en cours', async () => {
      const outil = await monter(
        profil(ID_TECHNICIEN, UserRole.TECHNICIAN),
        ticketFactice(TicketStatus.IN_PROGRESS),
      )

      expect(outil.peutModifier.value).toBe(true)
    })

    it('refuse tout le monde sur un ticket fermé', async () => {
      const outil = await monter(
        profil(ID_ADMIN, UserRole.ADMIN),
        ticketFactice(TicketStatus.CLOSED),
      )

      expect(outil.peutModifier.value).toBe(false)
    })
  })

  describe('transitions proposées', () => {
    it('propose la prise en charge d’un ticket ouvert à un technicien', async () => {
      const outil = await monter(
        profil(ID_TECHNICIEN, UserRole.TECHNICIAN),
        ticketFactice(TicketStatus.OPEN),
      )

      expect(outil.statutsProposables.value).toEqual([TicketStatus.IN_PROGRESS])
    })

    it('ne propose rien à l’auteur avant la résolution', async () => {
      const outil = await monter(profil(ID_AUTEUR, UserRole.USER), ticketFactice(TicketStatus.OPEN))

      expect(outil.statutsProposables.value).toEqual([])
    })

    it('propose à l’auteur de clore ou de rouvrir un ticket résolu', async () => {
      // C'est au demandeur de confirmer que son problème est réglé, ou de
      // signaler qu'il persiste.
      const outil = await monter(
        profil(ID_AUTEUR, UserRole.USER),
        ticketFactice(TicketStatus.RESOLVED),
      )

      expect(outil.statutsProposables.value).toEqual([
        TicketStatus.CLOSED,
        TicketStatus.IN_PROGRESS,
      ])
    })

    it('ne propose rien sur un ticket fermé', async () => {
      const outil = await monter(
        profil(ID_ADMIN, UserRole.ADMIN),
        ticketFactice(TicketStatus.CLOSED),
      )

      expect(outil.statutsProposables.value).toEqual([])
    })
  })

  describe('droits d’assignation', () => {
    it('propose à un technicien de prendre un ticket libre', async () => {
      const outil = await monter(
        profil(ID_TECHNICIEN, UserRole.TECHNICIAN),
        ticketFactice(TicketStatus.OPEN),
      )

      expect(outil.peutSAttribuer.value).toBe(true)
      expect(outil.peutSeLiberer.value).toBe(false)
    })

    it('propose à un technicien de libérer le ticket qu’il détient', async () => {
      const outil = await monter(
        profil(ID_TECHNICIEN, UserRole.TECHNICIAN),
        ticketFactice(TicketStatus.IN_PROGRESS, ID_TECHNICIEN),
      )

      expect(outil.peutSeLiberer.value).toBe(true)
      expect(outil.peutSAttribuer.value).toBe(false)
    })

    it('ne propose rien à un utilisateur ordinaire', async () => {
      const outil = await monter(profil(ID_AUTEUR, UserRole.USER), ticketFactice(TicketStatus.OPEN))

      expect(outil.peutSAttribuer.value).toBe(false)
      expect(outil.peutSeLiberer.value).toBe(false)
      expect(outil.peutDesassigner.value).toBe(false)
    })

    it('propose à un administrateur de retirer un ticket assigné', async () => {
      const outil = await monter(
        profil(ID_ADMIN, UserRole.ADMIN),
        ticketFactice(TicketStatus.IN_PROGRESS, ID_TECHNICIEN),
      )

      expect(outil.peutDesassigner.value).toBe(true)
    })

    it('ne propose aucune assignation sur un ticket fermé', async () => {
      const outil = await monter(
        profil(ID_TECHNICIEN, UserRole.TECHNICIAN),
        ticketFactice(TicketStatus.CLOSED),
      )

      expect(outil.peutSAttribuer.value).toBe(false)
      expect(outil.peutSeLiberer.value).toBe(false)
    })
  })

  describe('actions', () => {
    it('remplace le ticket courant par celui que renvoie l’API', async () => {
      // Le remplacement remet à jour statut, assigné et droits d'un seul coup :
      // recharger séparément laisserait un écran incohérent entre les deux.
      const outil = await monter(
        profil(ID_TECHNICIEN, UserRole.TECHNICIAN),
        ticketFactice(TicketStatus.OPEN),
      )

      vi.mocked(ticketsApi.changerStatut).mockResolvedValue(
        ticketFactice(TicketStatus.IN_PROGRESS, ID_TECHNICIEN),
      )

      const reussi = await outil.changerStatut(TicketStatus.IN_PROGRESS)

      expect(reussi).toBe(true)
      expect(outil.ticket.value?.status).toBe(TicketStatus.IN_PROGRESS)
      expect(outil.statutsProposables.value).toEqual([TicketStatus.RESOLVED])
    })

    it('expose l’erreur et laisse le ticket intact en cas d’échec', async () => {
      const outil = await monter(profil(ID_AUTEUR, UserRole.USER), ticketFactice(TicketStatus.OPEN))

      vi.mocked(ticketsApi.modifier).mockRejectedValue(
        new ErreurApi(403, ['Ce ticket est pris en charge.']),
      )

      const reussi = await outil.enregistrer({ title: 'Autre titre' })

      expect(reussi).toBe(false)
      expect(outil.erreur.value?.messages).toEqual(['Ce ticket est pris en charge.'])
      expect(outil.ticket.value?.title).toBe('Imprimante hors service')
    })

    it('transmet null pour libérer un ticket', async () => {
      const outil = await monter(
        profil(ID_TECHNICIEN, UserRole.TECHNICIAN),
        ticketFactice(TicketStatus.IN_PROGRESS, ID_TECHNICIEN),
      )

      vi.mocked(ticketsApi.assigner).mockResolvedValue(ticketFactice(TicketStatus.IN_PROGRESS))

      await outil.assigner(null)

      expect(ticketsApi.assigner).toHaveBeenCalledWith(ID_TICKET, null)
    })
  })
})
