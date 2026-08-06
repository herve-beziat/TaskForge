<script setup lang="ts">
import GraphiqueRepartition from '@/components/GraphiqueRepartition.vue'
import { useDashboard } from '@/composables/useDashboard'
import { TicketStatus } from '@/types/api'

const { statistiques, enCours, erreur, total, parStatut, parPriorite, tempsMoyen } = useDashboard()
</script>

<template>
  <section class="pile">
    <h1>Tableau de bord</h1>

    <div v-if="erreur" class="message erreur" role="alert">
      <ul>
        <li v-for="message in erreur.messages" :key="message">{{ message }}</li>
      </ul>
    </div>

    <p v-if="enCours" class="etat-vide carte">Chargement…</p>

    <template v-else-if="statistiques">
      <div class="compteurs">
        <!-- Chaque compteur mène à la liste filtrée : les filtres vivent dans
             l'URL depuis US18, le lien ne coûte rien et évite un tableau de
             bord dont on ne peut rien faire. -->
        <RouterLink :to="{ name: 'accueil' }" class="carte compteur">
          <span class="valeur">{{ total }}</span>
          <span class="attenue">Tickets au total</span>
        </RouterLink>

        <RouterLink
          :to="{ name: 'accueil', query: { status: TicketStatus.OPEN } }"
          class="carte compteur"
        >
          <span class="valeur">{{ statistiques.parStatut.OPEN }}</span>
          <span class="attenue">Ouverts</span>
        </RouterLink>

        <RouterLink
          :to="{ name: 'accueil', query: { status: TicketStatus.IN_PROGRESS } }"
          class="carte compteur"
        >
          <span class="valeur">{{ statistiques.parStatut.IN_PROGRESS }}</span>
          <span class="attenue">En cours</span>
        </RouterLink>

        <RouterLink
          :to="{ name: 'accueil', query: { status: TicketStatus.RESOLVED } }"
          class="carte compteur"
        >
          <span class="valeur">{{ statistiques.parStatut.RESOLVED }}</span>
          <span class="attenue">Résolus</span>
        </RouterLink>

        <div class="carte compteur">
          <!-- null et non « 0 min » : le backend distingue « aucun ticket
               résolu » de « résolus instantanément ». -->
          <span class="valeur" :class="{ absent: tempsMoyen === null }">
            {{ tempsMoyen ?? '—' }}
          </span>
          <span class="attenue">
            {{
              tempsMoyen === null ? 'Aucun ticket résolu à ce jour' : 'Temps moyen de résolution'
            }}
          </span>
        </div>
      </div>

      <div class="graphiques">
        <GraphiqueRepartition titre="Répartition par statut" :parts="parStatut" famille="statut" />
        <GraphiqueRepartition
          titre="Répartition par priorité"
          :parts="parPriorite"
          famille="priorite"
        />
      </div>
    </template>
  </section>
</template>

<style scoped>
.compteurs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
  gap: var(--espace-4);
}

.compteur {
  display: flex;
  flex-direction: column;
  gap: var(--espace-1);
  text-align: center;
  text-decoration: none;
  color: inherit;
}

a.compteur:hover {
  border-color: var(--couleur-primaire);
}

.valeur {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

/* Le tiret d'absence ne doit pas avoir le poids visuel d'un chiffre : il ne
   dit pas « zéro », il dit « rien à mesurer ». */
.valeur.absent {
  color: var(--couleur-texte-attenue);
  font-weight: 400;
}

.graphiques {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr));
  gap: var(--espace-4);
}
</style>
