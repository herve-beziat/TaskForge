import { api } from './http'
import type { StatistiquesDashboard } from '@/types/api'

export const dashboardApi = {
  // Route réservée à ADMIN côté backend : les compteurs agrègent des tickets
  // qu'un utilisateur ordinaire ne peut pas consulter un par un.
  statistiques: () => api.get<StatistiquesDashboard>('/dashboard/stats'),
}
