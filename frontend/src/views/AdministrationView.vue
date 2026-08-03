<script setup lang="ts">
import { useUtilisateurs } from '@/composables/useUtilisateurs'
import { LIBELLE_ROLE, UserRole } from '@/types/api'
import type { UtilisateurAdministre } from '@/types/api'

const {
  utilisateurs,
  total,
  enCours,
  enAction,
  erreur,
  estMoi,
  peutModifier,
  changerRole,
  basculerActivation,
} = useUtilisateurs()

const dateFr = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' })

function formaterDate(iso: string): string {
  return dateFr.format(new Date(iso))
}

function surChangementDeRole(compte: UtilisateurAdministre, evenement: Event): void {
  const valeur = (evenement.target as HTMLSelectElement).value as UserRole
  void changerRole(compte.id, valeur)
}
</script>

<template>
  <section class="pile">
    <h1>Administration des comptes</h1>

    <div v-if="erreur" class="message erreur" role="alert">
      <ul>
        <li v-for="message in erreur.messages" :key="message">{{ message }}</li>
      </ul>
    </div>

    <p v-if="enCours" class="etat-vide carte">Chargement…</p>

    <template v-else>
      <div class="carte tableau">
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Adresse email</th>
              <th>Rôle</th>
              <th>État</th>
              <th>Inscrit le</th>
              <th><span class="hors-ecran">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="compte in utilisateurs"
              :key="compte.id"
              :class="{ inactif: !compte.isActive }"
            >
              <td>
                {{ compte.name }}
                <!-- Le backend refuse qu'un administrateur modifie son propre
                     compte : sans cette règle il pourrait se retirer ses droits
                     ou se désactiver, et plus personne n'administrerait rien. -->
                <span v-if="estMoi(compte.id)" class="attenue"> — vous</span>
              </td>

              <td class="attenue">{{ compte.email }}</td>

              <td>
                <select
                  v-if="peutModifier(compte.id)"
                  :value="compte.role"
                  :disabled="enAction === compte.id"
                  :aria-label="`Rôle de ${compte.name}`"
                  @change="surChangementDeRole(compte, $event)"
                >
                  <option v-for="(libelle, valeur) in LIBELLE_ROLE" :key="valeur" :value="valeur">
                    {{ libelle }}
                  </option>
                </select>
                <span v-else>{{ LIBELLE_ROLE[compte.role] }}</span>
              </td>

              <td>
                <span class="badge" :data-etat="compte.isActive ? 'actif' : 'inactif'">
                  {{ compte.isActive ? 'Actif' : 'Désactivé' }}
                </span>
              </td>

              <td class="attenue">{{ formaterDate(compte.createdAt) }}</td>

              <td class="actions">
                <button
                  v-if="peutModifier(compte.id)"
                  type="button"
                  :class="compte.isActive ? 'danger' : 'secondaire'"
                  :disabled="enAction === compte.id"
                  @click="basculerActivation(compte)"
                >
                  {{ compte.isActive ? 'Désactiver' : 'Réactiver' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="attenue">
        {{ total }} compte{{ total > 1 ? 's' : '' }}. La désactivation prend effet immédiatement :
        le compte est relu à chaque requête, sans attendre l'expiration de son jeton.
      </p>
    </template>
  </section>
</template>

<style scoped>
.tableau {
  padding: 0;
  overflow-x: auto;
}

/* La ligne d'un compte désactivé est atténuée, mais reste lisible : elle porte
   aussi un libellé écrit, la couleur seule ne suffit pas à porter l'information. */
.inactif {
  background: var(--couleur-fond);
}

.inactif td:not(.actions) {
  opacity: 0.6;
}

.badge[data-etat='actif'] {
  background: #dcfce7;
  color: #166534;
}

.badge[data-etat='inactif'] {
  background: #fee2e2;
  color: #991b1b;
}

.actions {
  text-align: right;
}

/* Visible des seules technologies d'assistance. `display: none` la retirerait
   aussi de leur arbre, ce qui reviendrait à ne rien annoncer du tout. */
.hors-ecran {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
