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

// La priorité est le seul champ facultatif : l'entité applique MEDIUM par
// défaut. Le formulaire l'envoie tout de même, il propose un choix explicite.
export type CreationTicket = {
  title: string
  description: string
  priority?: TicketPriority
}

export const ticketsApi = {
  lister: (filtres: FiltresTickets = {}) => api.get<PageDeTickets>('/tickets', filtres),

  creer: (donnees: CreationTicket) => api.post<Ticket>('/tickets', donnees),

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
