import { computed, ref } from 'vue'
import { ErreurApi } from '@/services/http'
import { dashboardApi } from '@/services/dashboard.api'
import { LIBELLE_PRIORITE, LIBELLE_STATUT, TicketPriority, TicketStatus } from '@/types/api'
import type { StatistiquesDashboard } from '@/types/api'

export interface PartDeRepartition {
  cle: string
  libelle: string
  valeur: number
}

export function useDashboard() {
  const statistiques = ref<StatistiquesDashboard | null>(null)
  const enCours = ref(false)
  const erreur = ref<ErreurApi | null>(null)

  async function charger(): Promise<void> {
    enCours.value = true
    erreur.value = null

    try {
      statistiques.value = await dashboardApi.statistiques()
    } catch (cause) {
      erreur.value =
        cause instanceof ErreurApi
          ? cause
          : new ErreurApi(0, ['Impossible de charger les statistiques.'])
      statistiques.value = null
    } finally {
      enCours.value = false
    }
  }

  // L'ordre vient de l'énumération et non des clés de l'objet reçu : une
  // répartition par statut se lit dans l'ordre du cycle de vie, pas dans celui
  // où la base a rendu ses groupes.
  const parStatut = computed<PartDeRepartition[]>(() =>
    Object.values(TicketStatus).map((statut) => ({
      cle: statut,
      libelle: LIBELLE_STATUT[statut],
      valeur: statistiques.value?.parStatut[statut] ?? 0,
    })),
  )

  // De la plus basse à la plus critique : c'est l'ordre déclaré dans
  // l'énumération, et celui dans lequel la gravité se lit.
  const parPriorite = computed<PartDeRepartition[]>(() =>
    Object.values(TicketPriority).map((priorite) => ({
      cle: priorite,
      libelle: LIBELLE_PRIORITE[priorite],
      valeur: statistiques.value?.parPriorite[priorite] ?? 0,
    })),
  )

  const total = computed(() => statistiques.value?.total ?? 0)

  // null et non « 0 min » : le backend renvoie null quand rien n'est résolu, et
  // afficher une durée nulle laisserait croire à des résolutions instantanées.
  const tempsMoyen = computed(() => statistiques.value?.tempsMoyenDeResolution.lisible ?? null)

  void charger()

  return {
    statistiques,
    enCours,
    erreur,
    total,
    parStatut,
    parPriorite,
    tempsMoyen,
    charger,
  }
}
