<script setup lang="ts">
import { ref, watch } from 'vue'
import BadgeTicket from '@/components/BadgeTicket.vue'
import { useListeTickets } from '@/composables/useListeTickets'
import { useAuthStore } from '@/stores/auth'
import {
  ChampDeTri,
  LIBELLE_PRIORITE,
  LIBELLE_STATUT,
  SensDeTri,
  TicketPriority,
  TicketStatus,
  UserRole,
} from '@/types/api'

const auth = useAuthStore()
const {
  tickets,
  total,
  pages,
  enCours,
  erreur,
  filtres,
  aDesFiltres,
  appliquer,
  rechercher,
  reinitialiser,
} = useListeTickets()

// Copie locale de la saisie : le champ doit répondre à chaque frappe, alors
// que l'URL n'est mise à jour qu'après la temporisation.
const saisie = ref(filtres.value.search ?? '')

// Resynchronise quand l'URL change sans passer par le champ — retour arrière
// du navigateur, ou bouton de réinitialisation.
watch(
  () => filtres.value.search,
  (valeur) => {
    if ((valeur ?? '') !== saisie.value.trim()) {
      saisie.value = valeur ?? ''
    }
  },
)

const dateFr = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' })

function formaterDate(iso: string): string {
  return dateFr.format(new Date(iso))
}

function valeurDe(evenement: Event): string {
  return (evenement.target as HTMLSelectElement).value
}

function changerStatut(evenement: Event): void {
  const valeur = valeurDe(evenement)
  appliquer({ status: valeur === '' ? undefined : (valeur as TicketStatus) })
}

function changerPriorite(evenement: Event): void {
  const valeur = valeurDe(evenement)
  appliquer({ priority: valeur === '' ? undefined : (valeur as TicketPriority) })
}

// Premier clic sur une colonne : décroissant. C'est ce qu'on cherche —
// CRITICAL en tête pour la priorité, le plus récent pour la date. Un second
// clic sur la même colonne inverse.
function trier(champ: ChampDeTri): void {
  const dejaTrie = filtres.value.sortBy === champ
  const descendant = filtres.value.sortOrder === SensDeTri.DESC

  appliquer({
    sortBy: champ,
    sortOrder: dejaTrie && descendant ? SensDeTri.ASC : SensDeTri.DESC,
  })
}

// Valeur de l'attribut aria-sort : c'est par lui qu'un lecteur d'écran annonce
// la colonne active et son sens. La flèche seule ne serait perçue par personne.
function sensDe(champ: ChampDeTri): 'ascending' | 'descending' | 'none' {
  if (filtres.value.sortBy !== champ) {
    return 'none'
  }
  return filtres.value.sortOrder === SensDeTri.ASC ? 'ascending' : 'descending'
}

function flecheDe(champ: ChampDeTri): string {
  const sens = sensDe(champ)
  if (sens === 'none') {
    return ''
  }
  return sens === 'ascending' ? ' ↑' : ' ↓'
}

function basculerMesTickets(evenement: Event): void {
  const coche = (evenement.target as HTMLInputElement).checked
  appliquer({ assigneeId: coche ? auth.utilisateur?.id : undefined })
}

function allerALaPage(numero: number): void {
  appliquer({ page: numero })
}
</script>

<template>
  <section class="pile">
    <h1>Tickets</h1>

    <div class="carte pile">
      <div class="ligne filtres">
        <label class="filtre">
          <span>Recherche</span>
          <input
            v-model="saisie"
            type="search"
            placeholder="Titre ou description…"
            @input="rechercher(saisie)"
          />
        </label>

        <label class="filtre">
          <span>Statut</span>
          <select :value="filtres.status ?? ''" @change="changerStatut">
            <option value="">Tous</option>
            <option v-for="(libelle, valeur) in LIBELLE_STATUT" :key="valeur" :value="valeur">
              {{ libelle }}
            </option>
          </select>
        </label>

        <label class="filtre">
          <span>Priorité</span>
          <select :value="filtres.priority ?? ''" @change="changerPriorite">
            <option value="">Toutes</option>
            <option v-for="(libelle, valeur) in LIBELLE_PRIORITE" :key="valeur" :value="valeur">
              {{ libelle }}
            </option>
          </select>
        </label>
      </div>

      <div class="ligne">
        <!-- Un utilisateur ordinaire ne voit déjà que ses propres tickets :
             la case n'aurait aucun effet pour lui. -->
        <label v-if="auth.aLeRole(UserRole.TECHNICIAN, UserRole.ADMIN)" class="ligne case">
          <input
            type="checkbox"
            :checked="filtres.assigneeId === auth.utilisateur?.id"
            @change="basculerMesTickets"
          />
          <span>Assignés à moi</span>
        </label>

        <button v-if="aDesFiltres" type="button" class="secondaire" @click="reinitialiser">
          Effacer les filtres
        </button>
      </div>
    </div>

    <div v-if="erreur" class="message erreur" role="alert">
      <ul>
        <li v-for="message in erreur.messages" :key="message">{{ message }}</li>
      </ul>
    </div>

    <!-- Chargement et absence de résultat sont deux états distincts : « aucun
         ticket » et « je n'ai pas encore répondu » n'appellent pas la même
         réaction. -->
    <p v-if="enCours" class="etat-vide carte">Chargement…</p>

    <p v-else-if="tickets.length === 0" class="etat-vide carte">
      {{
        aDesFiltres ? 'Aucun ticket ne correspond à ces critères.' : 'Aucun ticket pour le moment.'
      }}
    </p>

    <template v-else>
      <div class="carte tableau">
        <table>
          <thead>
            <tr>
              <!-- Des boutons et non des th cliquables : un gestionnaire de clic
                   sur un th n'est atteignable ni au clavier ni au lecteur
                   d'écran. -->
              <th :aria-sort="sensDe(ChampDeTri.STATUS)">
                <button type="button" class="tri" @click="trier(ChampDeTri.STATUS)">
                  Statut<span aria-hidden="true">{{ flecheDe(ChampDeTri.STATUS) }}</span>
                </button>
              </th>
              <th :aria-sort="sensDe(ChampDeTri.PRIORITY)">
                <button type="button" class="tri" @click="trier(ChampDeTri.PRIORITY)">
                  Priorité<span aria-hidden="true">{{ flecheDe(ChampDeTri.PRIORITY) }}</span>
                </button>
              </th>
              <th>Titre</th>
              <th>Rapporteur</th>
              <th>Assigné</th>
              <th :aria-sort="sensDe(ChampDeTri.CREATED_AT)">
                <button type="button" class="tri" @click="trier(ChampDeTri.CREATED_AT)">
                  Créé le<span aria-hidden="true">{{ flecheDe(ChampDeTri.CREATED_AT) }}</span>
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ticket in tickets" :key="ticket.id">
              <td><BadgeTicket :statut="ticket.status" /></td>
              <td><BadgeTicket :priorite="ticket.priority" /></td>
              <td>{{ ticket.title }}</td>
              <td>{{ ticket.reporter.name }}</td>
              <td>
                <span v-if="ticket.assignee">{{ ticket.assignee.name }}</span>
                <span v-else class="attenue">Non assigné</span>
              </td>
              <td class="attenue">{{ formaterDate(ticket.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="ligne pagination">
        <button
          type="button"
          class="secondaire"
          :disabled="(filtres.page ?? 1) <= 1"
          @click="allerALaPage((filtres.page ?? 1) - 1)"
        >
          Précédent
        </button>

        <span class="attenue">
          Page {{ filtres.page ?? 1 }} sur {{ pages }} — {{ total }} ticket{{
            total > 1 ? 's' : ''
          }}
        </span>

        <button
          type="button"
          class="secondaire"
          :disabled="(filtres.page ?? 1) >= pages"
          @click="allerALaPage((filtres.page ?? 1) + 1)"
        >
          Suivant
        </button>
      </div>
    </template>
  </section>
</template>

<style scoped>
.filtres {
  align-items: flex-end;
}

.filtre {
  display: flex;
  flex-direction: column;
  gap: var(--espace-1);
  font-weight: 500;
  min-width: 12rem;
  flex: 1;
}

.case {
  font-weight: 500;
  gap: var(--espace-2);
}

.case input {
  width: auto;
}

/* Un tableau à six colonnes déborde sur un écran étroit : le faire défiler
   horizontalement vaut mieux que de le laisser casser la mise en page. */
.tableau {
  padding: 0;
  overflow-x: auto;
}

th:has(.tri) {
  padding: 0;
}

/* Le bouton occupe toute la cellule : la zone cliquable correspond à ce que
   l'utilisateur perçoit comme l'en-tête. */
.tri {
  width: 100%;
  background: none;
  border: none;
  border-radius: 0;
  padding: var(--espace-3);
  text-align: left;
  font: inherit;
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--couleur-texte-attenue);
}

.tri:hover:not(:disabled) {
  background: var(--couleur-fond);
  color: var(--couleur-texte);
}

th[aria-sort]:not([aria-sort='none']) .tri {
  color: var(--couleur-primaire);
}

.pagination {
  justify-content: space-between;
}
</style>
