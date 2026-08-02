import type { UserRole } from '@/types/api'

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

// Erreur porteuse du contexte HTTP. Nest renvoie `message` tantôt en chaîne,
// tantôt en tableau (une entrée par champ invalide) : l'uniformiser ici évite
// que chaque écran ait à gérer les deux formes.
export class ErreurApi extends Error {
  readonly statut: number
  readonly messages: string[]

  constructor(statut: number, messages: string[]) {
    super(messages[0] ?? 'Une erreur inattendue est survenue.')
    this.name = 'ErreurApi'
    this.statut = statut
    this.messages = messages
  }
}

let lireJeton: () => string | null = () => null
let signalerSessionExpiree: () => void = () => {}

// Appelé une seule fois au démarrage, depuis main.ts. Le client ignore tout de
// Pinia et du routeur : il reçoit deux fonctions, rien de plus.
export function configurerClientHttp(options: {
  jeton: () => string | null
  sessionExpiree: () => void
}): void {
  lireJeton = options.jeton
  signalerSessionExpiree = options.sessionExpiree
}

export type ParametresRequete = Record<string, string | number | boolean | undefined>

function construireUrl(chemin: string, parametres?: ParametresRequete): string {
  const url = new URL(chemin, BASE_URL)

  for (const [cle, valeur] of Object.entries(parametres ?? {})) {
    // Les paramètres absents sont omis, pas envoyés vides : `?status=` serait
    // rejeté par la validation du backend, qui attend une valeur d'énumération.
    if (valeur === undefined || valeur === '') {
      continue
    }
    url.searchParams.set(cle, String(valeur))
  }

  return url.toString()
}

function extraireMessages(corps: unknown): string[] {
  if (typeof corps !== 'object' || corps === null) {
    return []
  }

  const message = (corps as { message?: unknown }).message

  if (typeof message === 'string') {
    return [message]
  }

  if (Array.isArray(message)) {
    return message.filter((entree): entree is string => typeof entree === 'string')
  }

  return []
}

async function requete<T>(
  methode: string,
  chemin: string,
  options: { corps?: unknown; parametres?: ParametresRequete } = {},
): Promise<T> {
  const jeton = lireJeton()

  const entetes: Record<string, string> = {}
  if (options.corps !== undefined) {
    entetes['Content-Type'] = 'application/json'
  }
  if (jeton !== null) {
    entetes.Authorization = `Bearer ${jeton}`
  }

  let reponse: Response
  try {
    reponse = await fetch(construireUrl(chemin, options.parametres), {
      method: methode,
      headers: entetes,
      body: options.corps === undefined ? undefined : JSON.stringify(options.corps),
    })
  } catch {
    // fetch ne rejette que sur une panne réseau. La distinguer d'une erreur
    // applicative évite d'afficher « erreur 0 » quand l'API est simplement
    // injoignable.
    throw new ErreurApi(0, ['Impossible de joindre le serveur.'])
  }

  if (reponse.status === 204) {
    return undefined as T
  }

  const corps: unknown = await reponse.json().catch(() => null)

  if (!reponse.ok) {
    // Un 401 sans jeton envoyé est un échec d'identification, pas une session
    // expirée : purger et rediriger renverrait l'écran de connexion sur
    // lui-même à chaque mot de passe erroné.
    if (reponse.status === 401 && jeton !== null) {
      signalerSessionExpiree()
    }

    const messages = extraireMessages(corps)
    throw new ErreurApi(reponse.status, messages.length > 0 ? messages : [reponse.statusText])
  }

  return corps as T
}

export const api = {
  get: <T>(chemin: string, parametres?: ParametresRequete) =>
    requete<T>('GET', chemin, { parametres }),
  post: <T>(chemin: string, corps?: unknown) => requete<T>('POST', chemin, { corps }),
  patch: <T>(chemin: string, corps?: unknown) => requete<T>('PATCH', chemin, { corps }),
}

// Réexporté pour que les gardes de route et les composants n'aient pas à
// importer à la fois le client et les types.
export type { UserRole }
