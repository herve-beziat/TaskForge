import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { useListeTickets } from '../useListeTickets'
import { ticketsApi, type FiltresTickets } from '@/services/tickets.api'
import { ErreurApi } from '@/services/http'
import { ChampDeTri, SensDeTri, TicketStatus, type PageDeTickets } from '@/types/api'

vi.mock('@/services/tickets.api', () => ({
  ticketsApi: {
    lister: vi.fn<(filtres: FiltresTickets) => Promise<PageDeTickets>>(),
  },
}))

const PAGE_VIDE: PageDeTickets = { donnees: [], total: 0, page: 1, limit: 20, pages: 0 }

const VUE_VIDE = { template: '<div />' }

async function monter(urlInitiale = '/') {
  const routeur: Router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', name: 'tickets', component: VUE_VIDE }],
  })

  await routeur.push(urlInitiale)
  await routeur.isReady()

  let liste!: ReturnType<typeof useListeTickets>

  const Hote = defineComponent({
    setup() {
      liste = useListeTickets()
      return () => h('div')
    },
  })

  mount(Hote, { global: { plugins: [routeur] } })
  await flushPromises()

  return { liste, routeur }
}

// Dernier jeu de filtres transmis à l'API.
function dernierAppel(): FiltresTickets {
  const appels = vi.mocked(ticketsApi.lister).mock.calls
  return appels[appels.length - 1]?.[0] ?? {}
}

describe('useListeTickets', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(ticketsApi.lister).mockResolvedValue(PAGE_VIDE)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('charge la liste au montage avec les valeurs par défaut', async () => {
    await monter()

    expect(ticketsApi.lister).toHaveBeenCalledTimes(1)
    expect(dernierAppel()).toMatchObject({
      page: 1,
      limit: 20,
      sortBy: ChampDeTri.CREATED_AT,
      sortOrder: SensDeTri.DESC,
    })
  })

  it('lit les filtres depuis l’URL', async () => {
    // C'est ce qui rend une vue filtrée partageable, et ce qui la restitue
    // au retour depuis le détail d'un ticket.
    await monter('/?status=OPEN&priority=HIGH&search=imprimante&page=3')

    expect(dernierAppel()).toMatchObject({
      status: TicketStatus.OPEN,
      priority: 'HIGH',
      search: 'imprimante',
      page: 3,
    })
  })

  it('ignore une valeur d’énumération inconnue', async () => {
    // L'URL est saisissable à la main. Transmettre la valeur telle quelle
    // provoquerait un 400 affiché comme une panne, alors qu'il suffit de
    // l'ignorer.
    await monter('/?status=NIMPORTE_QUOI')

    expect(dernierAppel().status).toBeUndefined()
  })

  it('ramène à la première page quand un filtre change', async () => {
    // Rester en page 3 d'un résultat qui n'en compte plus qu'une afficherait
    // une liste vide sans rien expliquer.
    const { liste, routeur } = await monter('/?page=3')

    liste.appliquer({ status: TicketStatus.CLOSED })
    await flushPromises()

    expect(routeur.currentRoute.value.query.page).toBeUndefined()
    expect(dernierAppel().page).toBe(1)
  })

  it('laisse les valeurs par défaut hors de l’URL', async () => {
    const { liste, routeur } = await monter()

    liste.appliquer({ sortBy: ChampDeTri.CREATED_AT, sortOrder: SensDeTri.DESC })
    await flushPromises()

    expect(routeur.currentRoute.value.query).toEqual({})
  })

  it('temporise la recherche et remplace l’entrée d’historique', async () => {
    vi.useFakeTimers()
    const { liste, routeur } = await monter()

    liste.rechercher('imp')
    expect(ticketsApi.lister).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(300)
    await flushPromises()

    expect(routeur.currentRoute.value.query.search).toBe('imp')
    expect(ticketsApi.lister).toHaveBeenCalledTimes(2)
  })

  it('n’envoie pas une recherche d’un seul caractère', async () => {
    // Le DTO impose deux caractères minimum : partir quand même reviendrait à
    // afficher un 400 à chaque première lettre tapée.
    vi.useFakeTimers()
    const { liste, routeur } = await monter()

    liste.rechercher('i')
    vi.advanceTimersByTime(300)
    await flushPromises()

    expect(routeur.currentRoute.value.query.search).toBeUndefined()
  })

  it('annule la frappe précédente', async () => {
    vi.useFakeTimers()
    const { liste, routeur } = await monter()

    liste.rechercher('im')
    vi.advanceTimersByTime(100)
    liste.rechercher('imprimante')
    vi.advanceTimersByTime(300)
    await flushPromises()

    expect(routeur.currentRoute.value.query.search).toBe('imprimante')
  })

  it('vide la liste et expose l’erreur en cas d’échec', async () => {
    // Laisser les anciens résultats à l'écran donnerait à croire qu'ils
    // correspondent aux filtres courants.
    vi.mocked(ticketsApi.lister).mockRejectedValue(new ErreurApi(500, ['Panne.']))

    const { liste } = await monter()

    expect(liste.tickets.value).toEqual([])
    expect(liste.erreur.value?.messages).toEqual(['Panne.'])
  })

  it('signale la présence de filtres actifs', async () => {
    const { liste } = await monter('/?status=OPEN')

    expect(liste.aDesFiltres.value).toBe(true)
  })

  it('efface tous les filtres', async () => {
    const { liste, routeur } = await monter('/?status=OPEN&search=imprimante&page=2')

    liste.reinitialiser()
    await flushPromises()

    expect(routeur.currentRoute.value.query).toEqual({})
    expect(liste.aDesFiltres.value).toBe(false)
  })
})
