import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { useDashboard } from '../useDashboard'
import { dashboardApi } from '@/services/dashboard.api'
import { ErreurApi } from '@/services/http'
import type { StatistiquesDashboard } from '@/types/api'

vi.mock('@/services/dashboard.api', () => ({
  dashboardApi: {
    statistiques: vi.fn<() => Promise<StatistiquesDashboard>>(),
  },
}))

const STATISTIQUES: StatistiquesDashboard = {
  total: 10,
  parStatut: { OPEN: 4, IN_PROGRESS: 3, RESOLVED: 1, CLOSED: 2 },
  parPriorite: { LOW: 1, MEDIUM: 5, HIGH: 3, CRITICAL: 1 },
  tempsMoyenDeResolution: { secondes: 8446, lisible: '2 h 21 min' },
}

async function monter() {
  let outil!: ReturnType<typeof useDashboard>

  const Hote = defineComponent({
    setup() {
      outil = useDashboard()
      return () => h('div')
    },
  })

  mount(Hote)
  await flushPromises()

  return outil
}

describe('useDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(dashboardApi.statistiques).mockResolvedValue(STATISTIQUES)
  })

  it('charge les statistiques au montage', async () => {
    const outil = await monter()

    expect(dashboardApi.statistiques).toHaveBeenCalledTimes(1)
    expect(outil.total.value).toBe(10)
  })

  it('ordonne les statuts selon le cycle de vie', async () => {
    // L'ordre vient de l'énumération, pas des clés de l'objet reçu : une
    // répartition par statut se lit ouvert, en cours, résolu, fermé.
    const outil = await monter()

    expect(outil.parStatut.value.map((part) => part.cle)).toEqual([
      'OPEN',
      'IN_PROGRESS',
      'RESOLVED',
      'CLOSED',
    ])
    expect(outil.parStatut.value.map((part) => part.valeur)).toEqual([4, 3, 1, 2])
  })

  it('ordonne les priorités de la plus basse à la plus critique', async () => {
    const outil = await monter()

    expect(outil.parPriorite.value.map((part) => part.cle)).toEqual([
      'LOW',
      'MEDIUM',
      'HIGH',
      'CRITICAL',
    ])
  })

  it('traduit les clés en libellés français', async () => {
    const outil = await monter()

    expect(outil.parStatut.value[0]?.libelle).toBe('Ouvert')
    expect(outil.parPriorite.value[3]?.libelle).toBe('Critique')
  })

  it('expose le temps moyen sous sa forme lisible', async () => {
    const outil = await monter()

    expect(outil.tempsMoyen.value).toBe('2 h 21 min')
  })

  it('renvoie null quand aucun ticket n’est résolu', async () => {
    // Le backend renvoie null délibérément : afficher « 0 min » laisserait
    // croire à des résolutions instantanées.
    vi.mocked(dashboardApi.statistiques).mockResolvedValue({
      ...STATISTIQUES,
      tempsMoyenDeResolution: { secondes: null, lisible: null },
    })

    const outil = await monter()

    expect(outil.tempsMoyen.value).toBeNull()
  })

  it('remet toutes les parts à zéro en cas d’échec', async () => {
    // Conserver les anciennes valeurs à l'écran laisserait croire qu'elles sont
    // à jour, alors que la requête a échoué.
    vi.mocked(dashboardApi.statistiques).mockRejectedValue(new ErreurApi(403, ['Accès refusé.']))

    const outil = await monter()

    expect(outil.erreur.value?.messages).toEqual(['Accès refusé.'])
    expect(outil.total.value).toBe(0)
    expect(outil.parStatut.value.every((part) => part.valeur === 0)).toBe(true)
  })
})
