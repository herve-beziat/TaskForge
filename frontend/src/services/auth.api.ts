import { api } from './http'
import type { ResultatConnexion, Utilisateur } from '@/types/api'

export interface IdentifiantsConnexion {
  email: string
  password: string
}

export interface DonneesInscription extends IdentifiantsConnexion {
  name: string
}

export const authApi = {
  inscrire: (donnees: DonneesInscription) => api.post<Utilisateur>('/auth/register', donnees),

  connecter: (identifiants: IdentifiantsConnexion) =>
    api.post<ResultatConnexion>('/auth/login', identifiants),

  // Relit le compte côté serveur. C'est ce qui permet de savoir, au
  // rechargement d'une page, si le jeton conservé vaut encore quelque chose —
  // le backend relit la base à chaque requête, donc un compte désactivé ou
  // dont le rôle a changé est détecté ici.
  moi: () => api.get<Utilisateur>('/auth/me'),
}
