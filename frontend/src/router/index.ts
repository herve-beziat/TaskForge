import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import TicketsView from '@/views/TicketsView.vue'
import type { UserRole } from '@/types/api'

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
