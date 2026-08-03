<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import ChampDeFormulaire from '@/components/ChampDeFormulaire.vue'
import { ErreurApi } from '@/services/http'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const email = ref('')
const nom = ref('')
const motDePasse = ref('')
const erreur = ref<ErreurApi | null>(null)
const enCours = ref(false)

async function soumettre(): Promise<void> {
  erreur.value = null
  enCours.value = true

  try {
    // Le store enchaîne inscription puis connexion : le backend ne renvoie pas
    // de jeton à la création, et faire ressaisir ce qui vient d'être tapé
    // n'aurait aucun sens.
    await auth.inscrire({ email: email.value, name: nom.value, password: motDePasse.value })
    await router.replace({ name: 'accueil' })
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
      <h1>Créer un compte</h1>

      <!-- Seuls les messages sans champ rattaché : l'email déjà pris renvoie un
           409 sans index, tandis qu'une erreur de validation s'affiche sous son
           propre champ. Les montrer aux deux endroits ferait doublon. -->
      <div v-if="erreur && erreur.messagesGeneraux.length > 0" class="message erreur" role="alert">
        <ul>
          <li v-for="message in erreur.messagesGeneraux" :key="message">{{ message }}</li>
        </ul>
      </div>

      <ChampDeFormulaire
        v-model="nom"
        etiquette="Nom"
        autocomplete="name"
        :erreurs="erreur?.erreursDe('name') ?? []"
      />

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
        autocomplete="new-password"
        :erreurs="erreur?.erreursDe('password') ?? []"
      />

      <p class="attenue indication">Dix caractères minimum, aucune autre contrainte.</p>

      <button type="submit" :disabled="enCours">
        {{ enCours ? 'Création…' : 'Créer mon compte' }}
      </button>

      <p class="attenue">
        Déjà inscrit ?
        <RouterLink :to="{ name: 'connexion' }">Se connecter</RouterLink>
      </p>
    </form>
  </section>
</template>

<style scoped>
.ecran-auth {
  max-width: 26rem;
  margin: var(--espace-8) auto;
}

/* Annoncer la règle avant la saisie vaut mieux que la sanctionner après. */
.indication {
  margin: 0;
  font-size: 0.875rem;
}
</style>
