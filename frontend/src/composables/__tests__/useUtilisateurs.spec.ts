import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useUtilisateurs } from '../useUtilisateurs'
import { usersApi, type ModificationUtilisateur } from '@/services/users.api'
import { ErreurApi } from '@/services/http'
import { useAuthStore } from '@/stores/auth'
import { UserRole } from '@/types/api'
import type { UtilisateurAdministre, Utilisateur } from '@/types/api'

vi.mock('@/services/users.api', () => ({
  usersApi: {
    lister: vi.fn<() => Promise<UtilisateurAdministre[]>>(),
    modifier:
      vi.fn<(id: string, donnees: ModificationUtilisateur) => Promise<UtilisateurAdministre>>(),
  },
}))

const ID_ADMIN = '33333333-3333-3333-3333-333333333333'
const ID_TECHNICIEN = '22222222-2222-2222-2222-222222222222'

function compte(
  id: string,
  name: string,
  role: UserRole = UserRole.USER,
  isActive = true,
): UtilisateurAdministre {
  return {
    id,
    name,
    email: `${name.toLowerCase()}@exemple.fr`,
    role,
    isActive,
    createdAt: '2026-08-01T08:00:00.000Z',
  }
}

const MOI: Utilisateur = {
  id: ID_ADMIN,
  email: 'admin@exemple.fr',
  name: 'Admin',
  role: UserRole.ADMIN,
  createdAt: '2026-08-01T08:00:00.000Z',
}

async function monter() {
  setActivePinia(createPinia())
  const auth = useAuthStore()
  auth.utilisateur = MOI

  let outil!: ReturnType<typeof useUtilisateurs>

  const Hote = defineComponent({
    setup() {
      outil = useUtilisateurs()
      return () => h('div')
    },
  })

  mount(Hote)
  await flushPromises()

  return outil
}

describe('useUtilisateurs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(usersApi.lister).mockResolvedValue([
      compte(ID_TECHNICIEN, 'Zoé', UserRole.TECHNICIAN),
      compte(ID_ADMIN, 'Admin', UserRole.ADMIN),
      compte('44444444-4444-4444-4444-444444444444', 'Bernard'),
    ])
  })

  it('charge les comptes et les trie par nom', async () => {
    // Le backend ne garantit aucun ordre : une liste qui se réorganise après
    // chaque modification est pénible à relire.
    const outil = await monter()

    expect(outil.utilisateurs.value.map((c) => c.name)).toEqual(['Admin', 'Bernard', 'Zoé'])
    expect(outil.total.value).toBe(3)
  })

  it('expose l’erreur et vide la liste en cas d’échec', async () => {
    vi.mocked(usersApi.lister).mockRejectedValue(new ErreurApi(403, ['Accès refusé.']))

    const outil = await monter()

    expect(outil.utilisateurs.value).toEqual([])
    expect(outil.erreur.value?.messages).toEqual(['Accès refusé.'])
  })

  it('interdit la modification de son propre compte', async () => {
    // Sans cette règle, un administrateur pourrait se retirer ses droits ou se
    // désactiver, et plus personne ne pourrait administrer l'application.
    const outil = await monter()

    expect(outil.estMoi(ID_ADMIN)).toBe(true)
    expect(outil.peutModifier(ID_ADMIN)).toBe(false)
    expect(outil.peutModifier(ID_TECHNICIEN)).toBe(true)
  })

  it('remplace la ligne modifiée sans recharger la liste', async () => {
    const outil = await monter()

    vi.mocked(usersApi.modifier).mockResolvedValue(compte(ID_TECHNICIEN, 'Zoé', UserRole.ADMIN))

    const reussi = await outil.changerRole(ID_TECHNICIEN, UserRole.ADMIN)

    expect(reussi).toBe(true)
    expect(usersApi.modifier).toHaveBeenCalledWith(ID_TECHNICIEN, { role: UserRole.ADMIN })
    // Une seule requête de liste, celle du montage.
    expect(usersApi.lister).toHaveBeenCalledTimes(1)
    expect(outil.utilisateurs.value.find((c) => c.id === ID_TECHNICIEN)?.role).toBe(UserRole.ADMIN)
  })

  it('envoie l’inverse de l’état d’activation courant', async () => {
    const outil = await monter()

    const zoe = outil.utilisateurs.value.find((c) => c.id === ID_TECHNICIEN)
    vi.mocked(usersApi.modifier).mockResolvedValue(
      compte(ID_TECHNICIEN, 'Zoé', UserRole.TECHNICIAN, false),
    )

    await outil.basculerActivation(zoe!)

    expect(usersApi.modifier).toHaveBeenCalledWith(ID_TECHNICIEN, { isActive: false })
    expect(outil.utilisateurs.value.find((c) => c.id === ID_TECHNICIEN)?.isActive).toBe(false)
  })

  it('laisse la liste intacte quand une modification échoue', async () => {
    const outil = await monter()

    vi.mocked(usersApi.modifier).mockRejectedValue(new ErreurApi(403, ['Action refusée.']))

    const reussi = await outil.changerRole(ID_TECHNICIEN, UserRole.ADMIN)

    expect(reussi).toBe(false)
    expect(outil.erreur.value?.messages).toEqual(['Action refusée.'])
    expect(outil.utilisateurs.value.find((c) => c.id === ID_TECHNICIEN)?.role).toBe(
      UserRole.TECHNICIAN,
    )
  })

  it('ne bloque que la ligne en cours de modification', async () => {
    // Un booléen global figerait tout le tableau parce qu'une seule ligne
    // travaille.
    const outil = await monter()

    let resoudre!: (compte: UtilisateurAdministre) => void
    vi.mocked(usersApi.modifier).mockReturnValue(
      new Promise((resolve) => {
        resoudre = resolve
      }),
    )

    const promesse = outil.changerRole(ID_TECHNICIEN, UserRole.ADMIN)
    expect(outil.enAction.value).toBe(ID_TECHNICIEN)

    resoudre(compte(ID_TECHNICIEN, 'Zoé', UserRole.ADMIN))
    await promesse

    expect(outil.enAction.value).toBeNull()
  })
})
