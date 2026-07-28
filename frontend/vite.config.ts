import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
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
    // silencieusement sur 5174 et de casser la redirection docker-compose.
    strictPort: true,
    watch: {
      // Sous Linux natif, inotify traverse correctement les volumes montés.
      // Si le hot-reload ne réagit pas (macOS, Windows, montage réseau),
      // décommenter la ligne suivante — au prix d'une consommation CPU accrue.
      // usePolling: true,
    },
  },
})