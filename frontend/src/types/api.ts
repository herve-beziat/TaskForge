// Reflet des contrats du backend. Toute divergence ici se paie en erreurs
// silencieuses à l'exécution : ces types ne sont pas générés, ils sont tenus
// à la main et doivent suivre les DTO et entités côté API.

export const UserRole = {
  USER: 'USER',
  TECHNICIAN: 'TECHNICIAN',
  ADMIN: 'ADMIN',
} as const

export type UserRole = (typeof UserRole)[keyof typeof UserRole]

export const TicketStatus = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
} as const

export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus]

export const TicketPriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const

export type TicketPriority = (typeof TicketPriority)[keyof typeof TicketPriority]

// Libellés d'affichage. Regroupés ici pour que l'ajout d'un statut côté API
// provoque une erreur de typage plutôt qu'une case vide dans l'interface.
export const LIBELLE_STATUT: Record<TicketStatus, string> = {
  OPEN: 'Ouvert',
  IN_PROGRESS: 'En cours',
  RESOLVED: 'Résolu',
  CLOSED: 'Fermé',
}

export const LIBELLE_PRIORITE: Record<TicketPriority, string> = {
  LOW: 'Basse',
  MEDIUM: 'Moyenne',
  HIGH: 'Haute',
  CRITICAL: 'Critique',
}

export const LIBELLE_ROLE: Record<UserRole, string> = {
  USER: 'Utilisateur',
  TECHNICIAN: 'Technicien',
  ADMIN: 'Administrateur',
}

export interface Utilisateur {
  id: string
  email: string
  name: string
  role: UserRole
  createdAt: string
}

// L'administration expose en plus l'état d'activation du compte.
export interface UtilisateurAdministre extends Utilisateur {
  isActive: boolean
}

export interface ResultatConnexion {
  accessToken: string
  utilisateur: Utilisateur
}

// Les dates arrivent en chaînes ISO : JSON n'a pas de type date, et les
// convertir à la volée masquerait le fait qu'elles ne sont pas des Date.
export interface Ticket {
  id: string
  title: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  resolvedAt: string | null
  reporterId: string
  assigneeId: string | null
  createdAt: string
  updatedAt: string
}

// Le détail charge les relations, la liste ne les charge pas.
export interface TicketDetaille extends Ticket {
  reporter: Utilisateur
  assignee: Utilisateur | null
}

export interface PageDeTickets {
  donnees: Ticket[]
  total: number
  page: number
  limit: number
  pages: number
}

export interface StatistiquesDashboard {
  total: number
  parStatut: Record<TicketStatus, number>
  parPriorite: Record<TicketPriority, number>
  tempsMoyenDeResolution: {
    secondes: number | null
    lisible: string | null
  }
}
