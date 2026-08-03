import { api } from './http'
import type {
  ChampDeTri,
  PageDeTickets,
  SensDeTri,
  Ticket,
  TicketPriority,
  TicketStatus,
} from '@/types/api'

// Miroir de ListTicketsDto côté backend. Les valeurs absentes sont omises de
// l'URL par le client HTTP : `?status=` serait rejeté par la validation, qui
// attend une valeur d'énumération.
export type FiltresTickets = {
  page?: number
  limit?: number
  status?: TicketStatus
  priority?: TicketPriority
  assigneeId?: string
  search?: string
  sortBy?: ChampDeTri
  sortOrder?: SensDeTri
}

export type ModificationTicket = {
  title?: string
  description?: string
  priority?: TicketPriority
}

export const ticketsApi = {
  lister: (filtres: FiltresTickets = {}) => api.get<PageDeTickets>('/tickets', filtres),

  detail: (id: string) => api.get<Ticket>(`/tickets/${id}`),

  modifier: (id: string, donnees: ModificationTicket) =>
    api.patch<Ticket>(`/tickets/${id}`, donnees),

  // Routes distinctes côté backend, et à raison : le statut suit une machine à
  // états et l'assignation contrôle son destinataire. Les fondre dans le PATCH
  // général rendrait les trois règles illisibles.
  changerStatut: (id: string, status: TicketStatus) =>
    api.patch<Ticket>(`/tickets/${id}/status`, { status }),

  assigner: (id: string, assigneeId: string | null) =>
    api.patch<Ticket>(`/tickets/${id}/assignee`, { assigneeId }),
}
