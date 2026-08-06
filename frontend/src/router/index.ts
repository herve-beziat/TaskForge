import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import TicketsView from '@/views/TicketsView.vue'
import { UserRole } from '@/types/api'

declare module 'vue-router' {
  interface RouteMeta {
    // Accessible sans être connecté.
    publique?: boolean
    // Rôles autorisés. Absent = tout compte connecté.
    roles?: UserRole[]
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'accueil',
      component: TicketsView,
    },
    // Déclarée avant `/tickets/:id`. Vue Router privilégie les segments
    // statiques, l'ordre n'est donc pas strictement nécessaire — mais il rend
    // la règle lisible plutôt que dépendante d'un comportement du routeur.
    {
      path: '/tickets/nouveau',
      name: 'nouveau-ticket',
      component: () => import('@/views/NouveauTicketView.vue'),
    },
    {
      path: '/tickets/:id',
      name: 'ticket',
      component: () => import('@/views/TicketView.vue'),
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue'),
      // Comme l'endpoint : GET /dashboard/stats est réservé à ADMIN depuis le
      // jour 6, les compteurs agrégeant des tickets qu'un utilisateur ordinaire
      // ne peut pas consulter un par un.
      meta: { roles: [UserRole.ADMIN] },
    },
    {
      path: '/administration',
      name: 'administration',
      component: () => import('@/views/AdministrationView.vue'),
      // Première utilisation réelle de meta.roles, déclaré en TECH23. Confort
      // d'affichage uniquement : le backend répond 403 de toute façon, mais
      // afficher un écran vide à qui n'y a pas droit n'aide personne.
      meta: { roles: [UserRole.ADMIN] },
    },
    {
      path: '/connexion',
      name: 'connexion',
      component: () => import('@/views/ConnexionView.vue'),
      meta: { publique: true },
    },
    {
      path: '/inscription',
      name: 'inscription',
      component: () => import('@/views/InscriptionView.vue'),
      meta: { publique: true },
    },
    {
      // Chargées à la demande : l'écran d'accueil est le seul à faire partie du
      // paquet initial, les autres n'alourdissent pas le premier rendu.
      path: '/:chemin(.*)*',
      name: 'introuvable',
      component: () => import('@/views/NotFoundView.vue'),
      meta: { publique: true },
    },
  ],
})

// Ces gardes ne protègent rien. Elles évitent d'afficher un écran vide ou un
// bouton qui échouera, mais le JavaScript s'édite depuis la console du
// navigateur : la seule protection réelle est celle du backend, qui relit le
// compte et son rôle à chaque requête.
router.beforeEach(async (destination) => {
  const auth = useAuthStore()

  // Indispensable : au rechargement d'une page protégée, le jeton est en
  // mémoire mais le profil n'est pas encore chargé. Décider avant la réponse
  // renverrait systématiquement vers la connexion.
  await auth.restaurer()

  if (destination.meta.publique === true) {
    // Un utilisateur déjà connecté qui revient sur la connexion ou
    // l'inscription est renvoyé vers l'application, plutôt que de voir un
    // formulaire sans objet.
    if (
      auth.estConnecte &&
      (destination.name === 'connexion' || destination.name === 'inscription')
    ) {
      return { name: 'accueil' }
    }
    return true
  }

  if (!auth.estConnecte) {
    // La destination est conservée pour y revenir après identification :
    // sans cela, un lien profond ramène toujours à l'accueil.
    return { name: 'connexion', query: { suite: destination.fullPath } }
  }

  const roles = destination.meta.roles

  if (roles !== undefined && !auth.aLeRole(...roles)) {
    return { name: 'accueil' }
  }

  return true
})

export default router
