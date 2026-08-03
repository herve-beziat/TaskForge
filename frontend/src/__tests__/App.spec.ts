import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import App from '../App.vue'
import { useAuthStore } from '@/stores/auth'
import { UserRole, type Utilisateur } from '@/types/api'

const VUE_VIDE = { template: '<div />' }

const PROFIL: Utilisateur = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'herve@exemple.fr',
  name: 'Hervé',
  role: UserRole.ADMIN,
  createdAt: '2026-08-01T08:00:00.000Z',
}

// Routeur en mémoire, sans garde : on vérifie ici la mise en page, pas la
// navigation. Les noms doivent correspondre à ceux qu'utilise App.vue.
function creerRouteur(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'accueil', component: VUE_VIDE },
      { path: '/connexion', name: 'connexion', component: VUE_VIDE },
      // Le profil du test est administrateur : sans cette route, le lien
      // d'administration affiché par la barre ne se résout pas.
      { path: '/administration', name: 'administration', component: VUE_VIDE },
    ],
  })
}

async function monter(profil: Utilisateur | null) {
  const pinia: Pinia = createPinia()
  setActivePinia(pinia)

  const auth = useAuthStore()
  auth.utilisateur = profil

  const routeur = creerRouteur()
  await routeur.push('/')
  await routeur.isReady()

  return mount(App, { global: { plugins: [pinia, routeur] } })
}

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("affiche le nom de l'application et celui de l'utilisateur connecté", async () => {
    const wrapper = await monter(PROFIL)

    expect(wrapper.text()).toContain('TaskForge')
    expect(wrapper.text()).toContain('Hervé')
  })

  it('masque la navigation tant que personne n’est connecté', async () => {
    // Sur l'écran de connexion, des liens qui mènent tous à une redirection
    // sont du bruit.
    const wrapper = await monter(null)

    expect(wrapper.find('header').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Déconnexion')
  })
})
