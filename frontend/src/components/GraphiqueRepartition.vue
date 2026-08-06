<script setup lang="ts">
import { computed } from 'vue'
import type { PartDeRepartition } from '@/composables/useDashboard'

const props = defineProps<{
  titre: string
  parts: PartDeRepartition[]
  // Détermine la palette : les mêmes couleurs que les badges de la liste.
  famille: 'statut' | 'priorite'
}>()

const total = computed(() => props.parts.reduce((somme, part) => somme + part.valeur, 0))

// Échelle calée sur la plus grande valeur : sur quatre catégories dont une
// majoritaire, une échelle sur le total réduirait les trois autres à un trait.
const maximum = computed(() => Math.max(...props.parts.map((part) => part.valeur), 1))

function largeur(valeur: number): number {
  return (valeur / maximum.value) * 100
}

function pourcentage(valeur: number): string {
  if (total.value === 0) {
    return '0 %'
  }
  return `${Math.round((valeur / total.value) * 100)} %`
}
</script>

<template>
  <div class="carte pile">
    <h2>{{ titre }}</h2>

    <p v-if="total === 0" class="attenue">Aucun ticket à représenter.</p>

    <div v-else class="graphique">
      <template v-for="part in parts" :key="part.cle">
        <span class="libelle">{{ part.libelle }}</span>

        <!-- Décoratif : le libellé et la valeur sont du texte à côté, l'annoncer
             en plus ferait répéter la même information. -->
        <svg
          class="barre"
          viewBox="0 0 100 10"
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          <rect x="0" y="0" width="100" height="10" class="fond" />
          <rect
            x="0"
            y="0"
            :width="largeur(part.valeur)"
            height="10"
            :data-statut="famille === 'statut' ? part.cle : undefined"
            :data-priorite="famille === 'priorite' ? part.cle : undefined"
          />
        </svg>

        <span class="valeur">
          {{ part.valeur }}
          <span class="attenue">({{ pourcentage(part.valeur) }})</span>
        </span>
      </template>
    </div>
  </div>
</template>

<style scoped>
.graphique {
  display: grid;
  grid-template-columns: 7rem 1fr auto;
  align-items: center;
  gap: var(--espace-2) var(--espace-3);
}

.libelle {
  font-size: 0.875rem;
  font-weight: 500;
}

.barre {
  width: 100%;
  height: 1.25rem;
  display: block;
}

.fond {
  fill: var(--couleur-fond);
}

/* Mêmes couleurs que les badges de la liste : un statut garde sa teinte d'un
   écran à l'autre, sinon il faut réapprendre le code à chaque page. */
rect[data-statut='OPEN'] {
  fill: #93c5fd;
}
rect[data-statut='IN_PROGRESS'] {
  fill: #fcd34d;
}
rect[data-statut='RESOLVED'] {
  fill: #86efac;
}
rect[data-statut='CLOSED'] {
  fill: #cbd5e1;
}

rect[data-priorite='LOW'] {
  fill: #cbd5e1;
}
rect[data-priorite='MEDIUM'] {
  fill: #7dd3fc;
}
rect[data-priorite='HIGH'] {
  fill: #fdba74;
}
rect[data-priorite='CRITICAL'] {
  fill: #fca5a5;
}

.valeur {
  font-variant-numeric: tabular-nums;
  font-size: 0.875rem;
  white-space: nowrap;
}
</style>
