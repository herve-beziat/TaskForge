import { fileURLToPath, URL } from 'node:url'

import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// Le sujet exige un endpoint /healthz côté frontend. En production, nginx le
// sert (voir nginx.conf) ; en développement, c'est ce greffon qui s'en charge,
// pour que la sonde Docker fonctionne dans les deux modes.
function healthz(): Plugin {
  return {
    name: 'taskforge-healthz',
    configureServer(server) {
      server.middlewares.use('/healthz', (_requete, reponse) => {
        reponse.statusCode = 200
        reponse.setHeader('Content-Type', 'application/json')
        reponse.end('{"status":"ok"}')
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    healthz(),
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // Indispensable en conteneur : sans cela Vite n'écoute que sur 127.0.0.1
    // et reste injoignable depuis la machine hôte.
    host: '0.0.0.0',
    port: 5173,
    // Échoue explicitement si le port est pris, au lieu de basculer
    // silencieusement sur 5174 et de casser le routage.
    strictPort: true,
    // Vite rejette les requêtes dont l'en-tête Host lui est inconnu
    // (protection contre la reliaison DNS). Le point initial autorise
    // localhost et l'ensemble de ses sous-domaines.
    allowedHosts: ['.localhost'],
    hmr: {
      // La stack est servie par Traefik sur le port 80 : c'est vers celui-ci
      // que le navigateur doit ouvrir le websocket de rechargement à chaud,
      // et non vers le 5173 interne au conteneur.
      clientPort: 80,
    },
    watch: {
      // Sous Linux natif, inotify traverse correctement les volumes montés.
      // Si le hot-reload ne réagit pas (macOS, Windows, montage réseau),
      // décommenter la ligne suivante — au prix d'une consommation CPU accrue.
      // usePolling: true,
    },
  },
})
