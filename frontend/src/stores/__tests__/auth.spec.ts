import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '../auth'
import { authApi } from '@/services/auth.api'
import type { DonneesInscription, IdentifiantsConnexion } from '@/services/auth.api'
import { UserRole, type ResultatConnexion, type Utilisateur } from '@/types/api'

// Les signatures sont explicites : sans elles, mockResolvedValue accepterait
// n'importe quelle valeur et le test cesserait de vérifier le contrat de l'API.
vi.mock('@/services/auth.api', () => ({
  authApi: {
    inscrire: vi.fn<(donnees: DonneesInscription) => Promise<Utilisateur>>(),
    connecter: vi.fn<(identifiants: IdentifiantsConnexion) => Promise<ResultatConnexion>>(),
    moi: vi.fn<() => Promise<Utilisateur>>(),
  },
}))

const PROFIL: Utilisateur = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'herve@exemple.fr',
  name: 'Hervé',
  role: UserRole.ADMIN,
  createdAt: '2026-08-01T08:00:00.000Z',
}

const CLE_JETON = 'taskforge.jeton'

describe('store auth', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('mémorise le jeton et le profil à la connexion', async () => {
    vi.mocked(authApi.connecter).mockResolvedValue({ accessToken: 'jeton', utilisateur: PROFIL })

    const store = useAuthStore()
    await store.connecter({ email: PROFIL.email, password: 'motdepasse' })

    expect(store.estConnecte).toBe(true)
    expect(store.utilisateur).toEqual(PROFIL)
    expect(localStorage.getItem(CLE_JETON)).toBe('jeton')
  })

  it('enchaîne sur une connexion après une inscription', async () => {
    // L'inscription ne renvoie pas de jeton : sans cet enchaînement,
    // l'utilisateur devrait ressaisir ce qu'il vient de taper.
    vi.mocked(authApi.inscrire).mockResolvedValue(PROFIL)
    vi.mocked(authApi.connecter).mockResolvedValue({ accessToken: 'jeton', utilisateur: PROFIL })

    const store = useAuthStore()
    await store.inscrire({ email: PROFIL.email, name: PROFIL.name, password: 'motdepasse' })

    expect(authApi.connecter).toHaveBeenCalledWith({
      email: PROFIL.email,
      password: 'motdepasse',
    })
    expect(store.estConnecte).toBe(true)
  })

  it('purge la session et le stockage à la déconnexion', () => {
    localStorage.setItem(CLE_JETON, 'jeton')

    const store = useAuthStore()
    store.deconnecter()

    expect(store.estConnecte).toBe(false)
    expect(store.jeton).toBeNull()
    expect(localStorage.getItem(CLE_JETON)).toBeNull()
  })

  it('ne contacte pas l’API quand aucun jeton n’est conservé', async () => {
    const store = useAuthStore()
    await store.restaurer()

    expect(authApi.moi).not.toHaveBeenCalled()
    expect(store.sessionRestauree).toBe(true)
    expect(store.estConnecte).toBe(false)
  })

  it('recharge le profil depuis un jeton conservé', async () => {
    // Le profil n'est jamais persisté : il pourrait être périmé, et il serait
    // modifiable depuis la console du navigateur.
    localStorage.setItem(CLE_JETON, 'jeton')
    vi.mocked(authApi.moi).mockResolvedValue(PROFIL)

    const store = useAuthStore()
    await store.restaurer()

    expect(store.utilisateur).toEqual(PROFIL)
    expect(store.estConnecte).toBe(true)
  })

  it('purge le stockage quand le jeton conservé n’est plus valide', async () => {
    // Jeton expiré, compte désactivé, rôle révoqué : le laisser en place
    // ferait boucler la redirection à chaque chargement de page.
    localStorage.setItem(CLE_JETON, 'jeton-mort')
    vi.mocked(authApi.moi).mockRejectedValue(new Error('401'))

    const store = useAuthStore()
    await store.restaurer()

    expect(store.estConnecte).toBe(false)
    expect(localStorage.getItem(CLE_JETON)).toBeNull()
    expect(store.sessionRestauree).toBe(true)
  })

  it('ne lance qu’une requête quand la restauration est demandée plusieurs fois', async () => {
    // La garde de route appelle restaurer() à chaque navigation. Sans la
    // promesse mémorisée, un enchaînement de redirections produirait autant
    // d'appels à /auth/me.
    localStorage.setItem(CLE_JETON, 'jeton')
    vi.mocked(authApi.moi).mockResolvedValue(PROFIL)

    const store = useAuthStore()
    await Promise.all([store.restaurer(), store.restaurer(), store.restaurer()])

    expect(authApi.moi).toHaveBeenCalledTimes(1)
  })

  it('expose le rôle courant pour l’affichage conditionnel', async () => {
    vi.mocked(authApi.connecter).mockResolvedValue({ accessToken: 'jeton', utilisateur: PROFIL })

    const store = useAuthStore()
    await store.connecter({ email: PROFIL.email, password: 'motdepasse' })

    expect(store.aLeRole(UserRole.ADMIN)).toBe(true)
    expect(store.aLeRole(UserRole.TECHNICIAN, UserRole.ADMIN)).toBe(true)
    expect(store.aLeRole(UserRole.USER)).toBe(false)
  })
})
