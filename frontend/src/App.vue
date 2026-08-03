<script setup lang="ts">
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { UserRole } from '@/types/api'

const auth = useAuthStore()
const router = useRouter()

async function seDeconnecter(): Promise<void> {
  auth.deconnecter()
  await router.push({ name: 'connexion' })
}
</script>

<template>
  <header v-if="auth.estConnecte" class="entete">
    <div class="contenu entete-interieur">
      <RouterLink :to="{ name: 'accueil' }" class="marque">TaskForge</RouterLink>

      <nav class="ligne">
        <RouterLink :to="{ name: 'accueil' }">Tickets</RouterLink>
        <RouterLink v-if="auth.aLeRole(UserRole.ADMIN)" :to="{ name: 'administration' }">
          Administration
        </RouterLink>
      </nav>

      <div class="ligne">
        <span class="attenue">{{ auth.utilisateur?.name }}</span>
        <button type="button" class="secondaire" @click="seDeconnecter">Déconnexion</button>
      </div>
    </div>
  </header>

  <main class="contenu">
    <RouterView />
  </main>
</template>

<style scoped>
.entete {
  background: var(--couleur-surface);
  border-bottom: 1px solid var(--couleur-bordure);
}

.entete-interieur {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--espace-6);
  padding-block: var(--espace-4);
}

.marque {
  font-weight: 700;
  font-size: 1.125rem;
  color: var(--couleur-texte);
  text-decoration: none;
}

/* Le lien de la route courante doit se distinguer : sans repère, on ne sait
   pas où l'on est dès qu'il y aura plus de deux entrées. */
nav a {
  text-decoration: none;
  padding: var(--espace-1) var(--espace-2);
  border-radius: var(--rayon);
}

nav a.router-link-active {
  background: var(--couleur-fond);
  font-weight: 600;
}
</style>
