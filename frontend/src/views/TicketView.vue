<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import BadgeTicket from '@/components/BadgeTicket.vue'
import ChampDeFormulaire from '@/components/ChampDeFormulaire.vue'
import { useTicket } from '@/composables/useTicket'
import { useAuthStore } from '@/stores/auth'
import { LIBELLE_PRIORITE, TicketPriority, TicketStatus } from '@/types/api'
import type { ModificationTicket } from '@/services/tickets.api'

const route = useRoute()
const auth = useAuthStore()

const {
  ticket,
  enCours,
  enAction,
  erreur,
  introuvable,
  peutModifier,
  statutsProposables,
  peutSAttribuer,
  peutSeLiberer,
  peutDesassigner,
  enregistrer,
  changerStatut,
  assigner,
} = useTicket(() => String(route.params.id))

const enEdition = ref(false)
const brouillonTitre = ref('')
const brouillonDescription = ref('')
const brouillonPriorite = ref<TicketPriority>(TicketPriority.MEDIUM)

function ouvrirEdition(): void {
  if (!ticket.value) {
    return
  }
  brouillonTitre.value = ticket.value.title
  brouillonDescription.value = ticket.value.description
  brouillonPriorite.value = ticket.value.priority
  enEdition.value = true
}

// N'envoie que les champs réellement modifiés : le backend refuse un corps vide,
// et réécrire les trois à l'identique ferait avancer updatedAt sans raison.
function modificationsDuBrouillon(): ModificationTicket {
  const modifications: ModificationTicket = {}

  if (ticket.value === null) {
    return modifications
  }
  if (brouillonTitre.value !== ticket.value.title) {
    modifications.title = brouillonTitre.value
  }
  if (brouillonDescription.value !== ticket.value.description) {
    modifications.description = brouillonDescription.value
  }
  if (brouillonPriorite.value !== ticket.value.priority) {
    modifications.priority = brouillonPriorite.value
  }

  return modifications
}

async function soumettre(): Promise<void> {
  const modifications = modificationsDuBrouillon()

  if (Object.keys(modifications).length === 0) {
    enEdition.value = false
    return
  }

  if (await enregistrer(modifications)) {
    enEdition.value = false
  }
}

// Même transition, geste différent selon l'état de départ.
function libelleTransition(cible: TicketStatus): string {
  if (cible === TicketStatus.IN_PROGRESS) {
    return ticket.value?.status === TicketStatus.RESOLVED ? 'Rouvrir' : 'Prendre en charge'
  }
  if (cible === TicketStatus.RESOLVED) {
    return 'Marquer comme résolu'
  }
  return 'Clore le ticket'
}

const dateFr = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' })

function formaterDate(iso: string): string {
  return dateFr.format(new Date(iso))
}

const aDesActions = computed(
  () =>
    statutsProposables.value.length > 0 ||
    peutSAttribuer.value ||
    peutSeLiberer.value ||
    peutDesassigner.value,
)
</script>

<template>
  <section class="pile">
    <RouterLink :to="{ name: 'accueil' }" class="retour">← Retour à la liste</RouterLink>

    <!-- Hors des branches conditionnées au ticket : un échec de chargement
         laisse `ticket` à null, et le message n'avait alors nulle part où
         s'afficher — un identifiant malformé donnait un écran vide. -->
    <div v-if="erreur" class="message erreur" role="alert">
      <ul>
        <li v-for="message in erreur.messages" :key="message">{{ message }}</li>
      </ul>
    </div>

    <p v-if="enCours" class="etat-vide carte">Chargement…</p>

    <!-- 404 volontairement indifférencié : le backend répond la même chose pour
         un ticket inexistant et pour celui d'un autre utilisateur. -->
    <div v-else-if="introuvable" class="carte etat-vide">
      <h1>Ticket introuvable</h1>
      <p>Ce ticket n'existe pas, ou n'est pas accessible avec ce compte.</p>
    </div>

    <template v-else-if="ticket">
      <div class="carte pile">
        <div class="ligne entete">
          <div class="ligne">
            <BadgeTicket :statut="ticket.status" />
            <BadgeTicket :priorite="ticket.priority" />
          </div>

          <button
            v-if="peutModifier && !enEdition"
            type="button"
            class="secondaire"
            @click="ouvrirEdition"
          >
            Modifier
          </button>
        </div>

        <template v-if="!enEdition">
          <h1>{{ ticket.title }}</h1>
          <p class="description">{{ ticket.description }}</p>
        </template>

        <form v-else class="pile" novalidate @submit.prevent="soumettre">
          <ChampDeFormulaire
            v-model="brouillonTitre"
            etiquette="Titre"
            :erreurs="erreur?.erreursDe('title') ?? []"
          />

          <div class="champ">
            <label for="description">Description</label>
            <textarea id="description" v-model="brouillonDescription"></textarea>
            <ul v-if="erreur?.erreursDe('description').length" class="messages-champ">
              <li v-for="message in erreur.erreursDe('description')" :key="message">
                {{ message }}
              </li>
            </ul>
          </div>

          <div class="champ">
            <label for="priorite">Priorité</label>
            <select id="priorite" v-model="brouillonPriorite">
              <option v-for="(libelle, valeur) in LIBELLE_PRIORITE" :key="valeur" :value="valeur">
                {{ libelle }}
              </option>
            </select>
          </div>

          <div class="ligne">
            <button type="submit" :disabled="enAction">
              {{ enAction ? 'Enregistrement…' : 'Enregistrer' }}
            </button>
            <button
              type="button"
              class="secondaire"
              :disabled="enAction"
              @click="enEdition = false"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>

      <div class="carte pile">
        <h2>Informations</h2>
        <dl class="informations">
          <dt>Rapporteur</dt>
          <dd>{{ ticket.reporter.name }}</dd>

          <dt>Assigné</dt>
          <dd>
            <span v-if="ticket.assignee">{{ ticket.assignee.name }}</span>
            <span v-else class="attenue">Non assigné</span>
          </dd>

          <dt>Créé le</dt>
          <dd>{{ formaterDate(ticket.createdAt) }}</dd>

          <dt>Dernière modification</dt>
          <dd>{{ formaterDate(ticket.updatedAt) }}</dd>

          <template v-if="ticket.resolvedAt">
            <dt>Résolu le</dt>
            <dd>{{ formaterDate(ticket.resolvedAt) }}</dd>
          </template>
        </dl>
      </div>

      <!-- Les actions interdites sont absentes, pas grisées : un bouton
           désactivé sans explication est plus frustrant qu'un bouton qui
           n'existe pas, et les droits par rôle ne se devinent pas à l'écran. -->
      <div v-if="aDesActions" class="carte pile">
        <h2>Actions</h2>

        <div class="ligne">
          <button
            v-for="cible in statutsProposables"
            :key="cible"
            type="button"
            :disabled="enAction"
            @click="changerStatut(cible)"
          >
            {{ libelleTransition(cible) }}
          </button>

          <button
            v-if="peutSAttribuer"
            type="button"
            class="secondaire"
            :disabled="enAction"
            @click="assigner(auth.utilisateur?.id ?? null)"
          >
            Me l'attribuer
          </button>

          <button
            v-if="peutSeLiberer"
            type="button"
            class="secondaire"
            :disabled="enAction"
            @click="assigner(null)"
          >
            Me retirer du ticket
          </button>

          <button
            v-if="peutDesassigner"
            type="button"
            class="secondaire"
            :disabled="enAction"
            @click="assigner(null)"
          >
            Retirer l'assignation
          </button>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.retour {
  align-self: flex-start;
}

.entete {
  justify-content: space-between;
}

/* Les retours à la ligne saisis par le rapporteur sont conservés : une
   description structurée devient illisible s'ils sont écrasés. */
.description {
  white-space: pre-wrap;
  margin: 0;
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

.informations {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--espace-2) var(--espace-6);
  margin: 0;
}

.informations dt {
  color: var(--couleur-texte-attenue);
  font-size: 0.875rem;
}

.informations dd {
  margin: 0;
}
</style>
