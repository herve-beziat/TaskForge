import { api } from './http'
import type { UserRole, UtilisateurAdministre } from '@/types/api'

// Miroir d'UpdateUserDto : les deux champs sont facultatifs, mais le backend
// refuse un corps entièrement vide — modifier « rien » renverrait un 200
// trompeur.
export type ModificationUtilisateur = {
  role?: UserRole
  isActive?: boolean
}

export const usersApi = {
  // Route réservée à ADMIN côté backend. La garde de route côté front n'est
  // qu'un confort d'affichage : c'est ce 403 qui protège réellement.
  lister: () => api.get<UtilisateurAdministre[]>('/users'),

  modifier: (id: string, donnees: ModificationUtilisateur) =>
    api.patch<UtilisateurAdministre>(`/users/${id}`, donnees),
}
