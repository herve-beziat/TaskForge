import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import {
  PrometheusModule,
  makeCounterProvider,
  makeGaugeProvider,
  makeHistogramProvider,
} from '@willsoto/nestjs-prometheus';
import { MetricsInterceptor } from './metrics.interceptor';

// Global : les métriques seront injectées depuis les modules tickets et auth,
// sans avoir à importer ce module dans chacun d'eux.
@Global()
@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      // Métriques du processus Node : mémoire, boucle d'événements,
      // ramasse-miettes. Une ligne, et le tableau de bord devient crédible.
      defaultMetrics: { enabled: true },
    }),
  ],
  providers: [
    // Incrémenté en US04, à la création d'un ticket.
    makeCounterProvider({
      name: 'taskforge_tickets_created_total',
      help: 'Nombre total de tickets créés depuis le démarrage',
    }),

    // Alimenté par l'intercepteur : durée de chaque requête HTTP.
    makeHistogramProvider({
      name: 'taskforge_http_request_duration_seconds',
      help: 'Durée des requêtes HTTP en secondes',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    }),

    // Ajusté à la connexion et à la déconnexion, en US02.
    makeGaugeProvider({
      name: 'taskforge_connected_users',
      help: "Nombre d'utilisateurs actuellement authentifiés",
    }),

    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
  ],
})
export class MetricsModule {}
