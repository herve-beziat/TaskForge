<script setup lang="ts">
import { useId } from 'vue'

const modele = defineModel<string>({ required: true })

withDefaults(
  defineProps<{
    etiquette: string
    type?: string
    autocomplete?: string
    erreurs?: string[]
  }>(),
  { type: 'text', autocomplete: undefined, erreurs: () => [] },
)

const idChamp = useId()
const idErreur = useId()
</script>

<template>
  <div class="champ">
    <label :for="idChamp">{{ etiquette }}</label>

    <input
      :id="idChamp"
      v-model="modele"
      :type="type"
      :autocomplete="autocomplete"
      :aria-invalid="erreurs.length > 0"
      :aria-describedby="erreurs.length > 0 ? idErreur : undefined"
    />

    <ul v-if="erreurs.length > 0" :id="idErreur" class="messages-champ">
      <li v-for="message in erreurs" :key="message">{{ message }}</li>
    </ul>
  </div>
</template>

<style scoped>
.champ {
  display: flex;
  flex-direction: column;
  gap: var(--espace-1);
}

/* La bordure rouge seule ne suffit pas : environ un homme sur douze distingue
   mal le rouge du vert. Le message écrit reste le porteur de l'information. */
input[aria-invalid='true'] {
  border-color: var(--couleur-danger);
}

.messages-champ {
  margin: 0;
  padding-left: var(--espace-4);
  color: var(--couleur-danger);
  font-size: 0.875rem;
}
</style>
