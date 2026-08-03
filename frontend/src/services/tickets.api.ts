import { api } from './http'
import type {
  ChampDeTri,
  PageDeTickets,
  SensDeTri,
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

export const ticketsApi = {
  lister: (filtres: FiltresTickets = {}) => api.get<PageDeTickets>('/tickets', filtres),
}
