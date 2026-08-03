<script setup lang="ts">
import { LIBELLE_PRIORITE, LIBELLE_STATUT } from '@/types/api'
import type { TicketPriority, TicketStatus } from '@/types/api'

defineProps<{
  statut?: TicketStatus
  priorite?: TicketPriority
}>()
</script>

<template>
  <span v-if="statut" class="badge" :data-statut="statut">{{ LIBELLE_STATUT[statut] }}</span>
  <span v-else-if="priorite" class="badge" :data-priorite="priorite">
    {{ LIBELLE_PRIORITE[priorite] }}
  </span>
</template>
