import { computed, ref } from 'vue'
import { ErreurApi } from '@/services/http'
import { usersApi, type ModificationUtilisateur } from '@/services/users.api'
import { useAuthStore } from '@/stores/auth'
import type { UserRole, UtilisateurAdministre } from '@/types/api'

export function useUtilisateurs() {
  const auth = useAuthStore()

  const utilisateurs = ref<UtilisateurAdministre[]>([])
  const enCours = ref(false)
  // Identifiant de la ligne en cours de modification, plutôt qu'un booléen :
  // figer tout le tableau parce qu'une seule ligne travaille est inutile.
  const enAction = ref<string | null>(null)
  const erreur = ref<ErreurApi | null>(null)

  async function charger(): Promise<void> {
    enCours.value = true
    erreur.value = null

    try {
      const liste = await usersApi.lister()
      // Trié par nom : le backend ne garantit aucun ordre, et une liste dont
      // les lignes changent de place à chaque rechargement est pénible à
      // relire après une modification.
      utilisateurs.value = [...liste].sort((a, b) => a.name.localeCompare(b.name, 'fr'))
    } catch (cause) {
      erreur.value =
        cause instanceof ErreurApi
          ? cause
          : new ErreurApi(0, ['Impossible de charger les comptes.'])
      utilisateurs.value = []
    } finally {
      enCours.value = false
    }
  }

  const estMoi = (id: string): boolean => id === auth.utilisateur?.id

  // Le backend refuse qu'un administrateur modifie son propre compte : sans
  // cette règle, il pourrait se retirer ses droits ou se désactiver, et plus
  // personne ne pourrait administrer l'application.
  const peutModifier = (id: string): boolean => !estMoi(id)

  async function appliquer(id: string, modifications: ModificationUtilisateur): Promise<boolean> {
    enAction.value = id
    erreur.value = null

    try {
      const misAJour = await usersApi.modifier(id, modifications)
      const index = utilisateurs.value.findIndex((compte) => compte.id === id)

      if (index !== -1) {
        // Remplacement ciblé plutôt que rechargement complet : la liste ne
        // sautille pas, et une seule requête suffit.
        utilisateurs.value[index] = misAJour
      }

      return true
    } catch (cause) {
      erreur.value = cause instanceof ErreurApi ? cause : new ErreurApi(0, ["L'action a échoué."])
      return false
    } finally {
      enAction.value = null
    }
  }

  function changerRole(id: string, role: UserRole): Promise<boolean> {
    return appliquer(id, { role })
  }

  function basculerActivation(compte: UtilisateurAdministre): Promise<boolean> {
    return appliquer(compte.id, { isActive: !compte.isActive })
  }

  const total = computed(() => utilisateurs.value.length)

  void charger()

  return {
    utilisateurs,
    total,
    enCours,
    enAction,
    erreur,
    estMoi,
    peutModifier,
    charger,
    changerRole,
    basculerActivation,
  }
}
