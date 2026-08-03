<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ChampDeFormulaire from '@/components/ChampDeFormulaire.vue'
import { ErreurApi } from '@/services/http'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const email = ref('')
const motDePasse = ref('')
const erreur = ref<ErreurApi | null>(null)
const enCours = ref(false)

// La garde de route dépose le chemin refusé dans ?suite=, pour y revenir une
// fois identifié. La valeur vient de l'URL : elle n'est pas digne de confiance.
//
// Seul un chemin interne est accepté. « //exemple.fr » est une URL absolue pour
// le navigateur, et « /\exemple.fr » l'est aussi dans la plupart d'entre eux :
// les laisser passer transformerait cet écran en tremplin de redirection, juste
// après la saisie du mot de passe.
function destinationApresConnexion(): string {
  const suite = route.query.suite

  if (typeof suite !== 'string' || !suite.startsWith('/')) {
    return '/'
  }

  if (suite.startsWith('//') || suite.startsWith('/\\')) {
    return '/'
  }

  return suite
}

async function soumettre(): Promise<void> {
  erreur.value = null
  enCours.value = true

  try {
    await auth.connecter({ email: email.value, password: motDePasse.value })
    await router.replace(destinationApresConnexion())
  } catch (cause) {
    erreur.value =
      cause instanceof ErreurApi ? cause : new ErreurApi(0, ['Une erreur inattendue est survenue.'])
  } finally {
    enCours.value = false
  }
}
</script>

<template>
  <section class="ecran-auth">
    <form class="carte pile" novalidate @submit.prevent="soumettre">
      <h1>Connexion</h1>

      <!-- Le backend renvoie le même message que l'email soit inconnu, le mot
           de passe faux ou le compte désactivé (US02). Le front se contente de
           l'afficher : préciser d'après le code HTTP annulerait la protection. -->
      <div v-if="erreur" class="message erreur" role="alert">
        <ul>
          <li v-for="message in erreur.messages" :key="message">{{ message }}</li>
        </ul>
      </div>

      <ChampDeFormulaire
        v-model="email"
        etiquette="Adresse email"
        type="email"
        autocomplete="email"
        :erreurs="erreur?.erreursDe('email') ?? []"
      />

      <ChampDeFormulaire
        v-model="motDePasse"
        etiquette="Mot de passe"
        type="password"
        autocomplete="current-password"
        :erreurs="erreur?.erreursDe('password') ?? []"
      />

      <!-- Désactivé pendant l'envoi : sans cela, un double clic déclenche deux
           connexions et deux jetons. -->
      <button type="submit" :disabled="enCours">
        {{ enCours ? 'Connexion…' : 'Se connecter' }}
      </button>

      <p class="attenue">
        Pas encore de compte ?
        <RouterLink :to="{ name: 'inscription' }">Créer un compte</RouterLink>
      </p>
    </form>
  </section>
</template>

<style scoped>
.ecran-auth {
  max-width: 26rem;
  margin: var(--espace-8) auto;
}
</style>
