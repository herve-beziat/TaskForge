<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import ChampDeFormulaire from '@/components/ChampDeFormulaire.vue'
import { ErreurApi } from '@/services/http'
import { ticketsApi } from '@/services/tickets.api'
import { LIBELLE_PRIORITE, TicketPriority } from '@/types/api'

const router = useRouter()

const titre = ref('')
const description = ref('')
const priorite = ref<TicketPriority>(TicketPriority.MEDIUM)
const erreur = ref<ErreurApi | null>(null)
const enCours = ref(false)

async function soumettre(): Promise<void> {
  erreur.value = null
  enCours.value = true

  try {
    const ticket = await ticketsApi.creer({
      title: titre.value,
      description: description.value,
      priority: priorite.value,
    })

    // Vers le détail et non vers la liste : on vient de décrire un incident, on
    // veut le voir enregistré — et c'est là que se trouvent les actions.
    // `replace` plutôt que `push` : revenir en arrière ne doit pas ramener sur
    // un formulaire dont le contenu est déjà envoyé.
    await router.replace({ name: 'ticket', params: { id: ticket.id } })
  } catch (cause) {
    erreur.value =
      cause instanceof ErreurApi ? cause : new ErreurApi(0, ['Une erreur inattendue est survenue.'])
  } finally {
    enCours.value = false
  }
}
</script>

<template>
  <section class="pile">
    <RouterLink :to="{ name: 'accueil' }" class="retour">← Retour à la liste</RouterLink>

    <form class="carte pile" novalidate @submit.prevent="soumettre">
      <h1>Signaler un incident</h1>

      <!-- Seulement ce qui n'est rattaché à aucun champ : les erreurs de
           validation s'affichent sous leur propre libellé. -->
      <div v-if="erreur && erreur.messagesGeneraux.length > 0" class="message erreur" role="alert">
        <ul>
          <li v-for="message in erreur.messagesGeneraux" :key="message">{{ message }}</li>
        </ul>
      </div>

      <ChampDeFormulaire
        v-model="titre"
        etiquette="Titre"
        :erreurs="erreur?.erreursDe('title') ?? []"
      />
      <p class="attenue indication">Entre 3 et 200 caractères.</p>

      <div class="champ">
        <label for="description">Description</label>
        <textarea
          id="description"
          v-model="description"
          placeholder="Ce qui se passe, depuis quand, ce que vous avez déjà tenté."
        ></textarea>
        <ul v-if="erreur?.erreursDe('description').length" class="messages-champ">
          <li v-for="message in erreur.erreursDe('description')" :key="message">{{ message }}</li>
        </ul>
        <p class="attenue indication">
          Entre 10 et 5000 caractères. Plus c'est précis, plus vite c'est traité.
        </p>
      </div>

      <div class="champ">
        <label for="priorite">Priorité</label>
        <select id="priorite" v-model="priorite">
          <option v-for="(libelle, valeur) in LIBELLE_PRIORITE" :key="valeur" :value="valeur">
            {{ libelle }}
          </option>
        </select>
        <ul v-if="erreur?.erreursDe('priority').length" class="messages-champ">
          <li v-for="message in erreur.erreursDe('priority')" :key="message">{{ message }}</li>
        </ul>
      </div>

      <!-- Désactivé pendant l'envoi : sans cela, un double clic crée deux
           tickets identiques, et rien ne les distinguerait ensuite. -->
      <div class="ligne">
        <button type="submit" :disabled="enCours">
          {{ enCours ? 'Création…' : 'Créer le ticket' }}
        </button>
        <!-- Un lien, pas un bouton : il navigue, il n'agit pas. Et un <button>
             imbriqué dans un <a> serait du HTML invalide. -->
        <RouterLink :to="{ name: 'accueil' }" class="lien-bouton secondaire">Annuler</RouterLink>
      </div>
    </form>
  </section>
</template>

<style scoped>
.retour {
  align-self: flex-start;
}

.champ {
  display: flex;
  flex-direction: column;
  gap: var(--espace-1);
}

.champ label {
  font-weight: 500;
}

.messages-champ {
  margin: 0;
  padding-left: var(--espace-4);
  color: var(--couleur-danger);
  font-size: 0.875rem;
}

/* Annoncer la règle avant la saisie vaut mieux que la sanctionner après. */
.indication {
  margin: 0;
  font-size: 0.875rem;
}

/* Le lien-bouton et le bouton d'envoi doivent s'aligner sur la même ligne de
   base malgré leurs boîtes différentes. */
.ligne .lien-bouton {
  line-height: 1.5;
}
</style>
