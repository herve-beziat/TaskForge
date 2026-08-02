import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { configurerClientHttp } from './services/http'
import { useAuthStore } from './stores/auth'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// Après app.use(createPinia()) : un store n'est instanciable qu'une fois Pinia
// installée sur l'application.
const auth = useAuthStore()

configurerClientHttp({
  jeton: () => auth.jeton,
  sessionExpiree: () => {
    auth.deconnecter()
    void router.push({ name: 'connexion' })
  },
})

app.mount('#app')
