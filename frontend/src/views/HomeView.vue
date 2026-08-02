<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { LIBELLE_ROLE } from '@/types/api'

const auth = useAuthStore()
</script>

<template>
  <section class="pile">
    <h1>Tableau de bord</h1>

    <div class="carte pile">
      <p v-if="auth.utilisateur">
        Connecté en tant que <strong>{{ auth.utilisateur.name }}</strong>
        <span class="attenue"> — {{ LIBELLE_ROLE[auth.utilisateur.role] }}</span>
      </p>

      <p class="attenue">
        La liste des tickets prendra la place de cet écran (US18). Le socle d'authentification, les
        gardes de route et le client HTTP sont en place.
      </p>
    </div>
  </section>
</template>
