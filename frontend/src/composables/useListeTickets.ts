import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { LocationQueryValue } from 'vue-router'
import { ErreurApi } from '@/services/http'
import { ticketsApi, type FiltresTickets } from '@/services/tickets.api'
import { ChampDeTri, SensDeTri, TicketPriority, TicketStatus } from '@/types/api'
import type { Ticket } from '@/types/api'

const LIMITE = 20
const DELAI_RECHERCHE_MS = 300
// Imposé par le DTO côté backend : en deçà, la requête part et revient en 400.
const LONGUEUR_MINIMALE_RECHERCHE = 2

type ValeurQuery = LocationQueryValue | LocationQueryValue[] | undefined

function lireTexte(valeur: ValeurQuery): string | undefined {
  return typeof valeur === 'string' && valeur !== '' ? valeur : undefined
}

function lireParmi<T extends string>(valeur: ValeurQuery, autorisees: readonly T[]): T | undefined {
  const texte = lireTexte(valeur)
  return texte !== undefined && (autorisees as readonly string[]).includes(texte)
    ? (texte as T)
    : undefined
}

function lirePage(valeur: ValeurQuery): number {
  const nombre = Number(lireTexte(valeur))
  return Number.isInteger(nombre) && nombre > 0 ? nombre : 1
}

// L'URL est l'unique source de vérité des filtres.
//
// Ce n'est pas seulement pour rendre une vue partageable : c'est ce qui fait
// que le bouton retour du navigateur se comporte correctement, et qu'on
// retrouve ses filtres en revenant du détail d'un ticket.
export function useListeTickets() {
  const route = useRoute()
  const router = useRouter()

  const tickets = ref<Ticket[]>([])
  const total = ref(0)
  const pages = ref(0)
  const enCours = ref(false)
  const erreur = ref<ErreurApi | null>(null)

  const filtres = computed<FiltresTickets>(() => ({
    page: lirePage(route.query.page),
    limit: LIMITE,
    status: lireParmi(route.query.status, Object.values(TicketStatus)),
    priority: lireParmi(route.query.priority, Object.values(TicketPriority)),
    assigneeId: lireTexte(route.query.assigneeId),
    search: lireTexte(route.query.search),
    sortBy: lireParmi(route.query.sortBy, Object.values(ChampDeTri)) ?? ChampDeTri.CREATED_AT,
    sortOrder: lireParmi(route.query.sortOrder, Object.values(SensDeTri)) ?? SensDeTri.DESC,
  }))

  async function charger(): Promise<void> {
    enCours.value = true
    erreur.value = null

    try {
      const page = await ticketsApi.lister(filtres.value)
      tickets.value = page.donnees
      total.value = page.total
      pages.value = page.pages
    } catch (cause) {
      erreur.value =
        cause instanceof ErreurApi
          ? cause
          : new ErreurApi(0, ['Impossible de charger les tickets.'])
      tickets.value = []
      total.value = 0
      pages.value = 0
    } finally {
      enCours.value = false
    }
  }

  // La clé sérialisée évite de recharger quand l'objet est reconstruit à
  // l'identique : un computed renvoie une nouvelle référence à chaque
  // évaluation, et surveiller l'objet lui-même relancerait la requête pour rien.
  watch(() => JSON.stringify(filtres.value), charger, { immediate: true })

  function construireQuery(suivants: FiltresTickets): Record<string, string> {
    const query: Record<string, string> = {}

    if (suivants.page !== undefined && suivants.page > 1) {
      query.page = String(suivants.page)
    }
    if (suivants.status !== undefined) {
      query.status = suivants.status
    }
    if (suivants.priority !== undefined) {
      query.priority = suivants.priority
    }
    if (suivants.assigneeId !== undefined) {
      query.assigneeId = suivants.assigneeId
    }
    if (suivants.search !== undefined) {
      query.search = suivants.search
    }
    // Les valeurs par défaut restent hors de l'URL : une adresse encombrée de
    // paramètres qui ne changent rien est illisible et se partage mal.
    if (suivants.sortBy !== undefined && suivants.sortBy !== ChampDeTri.CREATED_AT) {
      query.sortBy = suivants.sortBy
    }
    if (suivants.sortOrder !== undefined && suivants.sortOrder !== SensDeTri.DESC) {
      query.sortOrder = suivants.sortOrder
    }

    return query
  }

  function appliquer(modifications: Partial<FiltresTickets>, remplacer = false): void {
    const suivants: FiltresTickets = { ...filtres.value, ...modifications }

    // Tout changement autre que la pagination ramène à la première page :
    // rester en page 4 d'un résultat qui n'en compte plus qu'une afficherait
    // une liste vide sans rien expliquer.
    if (modifications.page === undefined) {
      suivants.page = 1
    }

    const query = construireQuery(suivants)

    void (remplacer ? router.replace({ query }) : router.push({ query }))
  }

  let minuterie: ReturnType<typeof setTimeout> | undefined

  function rechercher(texte: string): void {
    clearTimeout(minuterie)

    minuterie = setTimeout(() => {
      const propre = texte.trim()
      appliquer(
        { search: propre.length >= LONGUEUR_MINIMALE_RECHERCHE ? propre : undefined },
        // replace et non push : une pause en cours de frappe laisserait sinon
        // une entrée d'historique par mot, et le retour arrière redéroulerait
        // la saisie.
        true,
      )
    }, DELAI_RECHERCHE_MS)
  }

  function reinitialiser(): void {
    clearTimeout(minuterie)
    void router.push({ query: {} })
  }

  const aDesFiltres = computed(
    () =>
      filtres.value.status !== undefined ||
      filtres.value.priority !== undefined ||
      filtres.value.assigneeId !== undefined ||
      filtres.value.search !== undefined,
  )

  return {
    tickets,
    total,
    pages,
    enCours,
    erreur,
    filtres,
    aDesFiltres,
    appliquer,
    rechercher,
    reinitialiser,
    recharger: charger,
  }
}
