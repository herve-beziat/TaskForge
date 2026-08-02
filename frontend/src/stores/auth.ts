import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { authApi, type DonneesInscription, type IdentifiantsConnexion } from '@/services/auth.api'
import type { UserRole, Utilisateur } from '@/types/api'

const CLE_JETON = 'taskforge.jeton'

export const useAuthStore = defineStore('auth', () => {
  const jeton = ref<string | null>(localStorage.getItem(CLE_JETON))
  const utilisateur = ref<Utilisateur | null>(null)

  // Vrai une fois qu'on sait si le jeton conservé est valide ou non — que la
  // réponse soit positive ou négative.
  const sessionRestauree = ref(false)
  let enCoursDeRestauration: Promise<void> | null = null

  const estConnecte = computed(() => utilisateur.value !== null)
  const role = computed(() => utilisateur.value?.role ?? null)

  function aLeRole(...roles: UserRole[]): boolean {
    const actuel = utilisateur.value?.role
    return actuel !== undefined && roles.includes(actuel)
  }

  function memoriser(nouveauJeton: string, profil: Utilisateur): void {
    jeton.value = nouveauJeton
    utilisateur.value = profil
    sessionRestauree.value = true
    localStorage.setItem(CLE_JETON, nouveauJeton)
  }

  function oublier(): void {
    jeton.value = null
    utilisateur.value = null
    sessionRestauree.value = true
    enCoursDeRestauration = null
    localStorage.removeItem(CLE_JETON)
  }

  async function connecter(identifiants: IdentifiantsConnexion): Promise<void> {
    const resultat = await authApi.connecter(identifiants)
    memoriser(resultat.accessToken, resultat.utilisateur)
  }

  // L'inscription ne renvoie pas de jeton : le backend crée le compte et s'en
  // tient là. On enchaîne donc sur une connexion, pour éviter à l'utilisateur
  // de ressaisir ce qu'il vient de taper.
  async function inscrire(donnees: DonneesInscription): Promise<void> {
    await authApi.inscrire(donnees)
    await connecter({ email: donnees.email, password: donnees.password })
  }

  function deconnecter(): void {
    oublier()
  }

  // Appelée par la garde de route avant toute navigation. Sans elle, un
  // rechargement sur une page protégée renverrait vers la connexion : le jeton
  // est là, mais l'utilisateur n'est pas encore chargé.
  function restaurer(): Promise<void> {
    if (sessionRestauree.value) {
      return Promise.resolve()
    }

    // Mémorisée : plusieurs navigations peuvent se déclencher avant la fin de
    // l'appel, une seule requête doit partir.
    if (enCoursDeRestauration !== null) {
      return enCoursDeRestauration
    }

    if (jeton.value === null) {
      sessionRestauree.value = true
      return Promise.resolve()
    }

    enCoursDeRestauration = authApi
      .moi()
      .then((profil) => {
        utilisateur.value = profil
        sessionRestauree.value = true
      })
      .catch(() => {
        // Jeton expiré, compte désactivé, rôle révoqué : dans tous les cas la
        // session ne vaut plus rien et il faut repartir propre.
        oublier()
      })
      .finally(() => {
        enCoursDeRestauration = null
      })

    return enCoursDeRestauration
  }

  return {
    jeton,
    utilisateur,
    sessionRestauree,
    estConnecte,
    role,
    aLeRole,
    connecter,
    inscrire,
    deconnecter,
    restaurer,
  }
})
