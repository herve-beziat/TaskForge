import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import {
  PrometheusModule,
  makeCounterProvider,
  makeGaugeProvider,
  makeHistogramProvider,
} from '@willsoto/nestjs-prometheus';
import { MetricsInterceptor } from './metrics.interceptor';

// Incrémenté en US04, à la création d'un ticket.
const compteurTickets = makeCounterProvider({
  name: 'taskforge_tickets_created_total',
  help: 'Nombre total de tickets créés depuis le démarrage',
});

// Alimenté par l'intercepteur : durée de chaque requête HTTP.
const histogrammeRequetes = makeHistogramProvider({
  name: 'taskforge_http_request_duration_seconds',
  help: 'Durée des requêtes HTTP en secondes',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});

// Alimentée par ActiveUsersService, sur chaque requête authentifiée.
const jaugeUtilisateurs = makeGaugeProvider({
  name: 'taskforge_connected_users',
  help: "Nombre d'utilisateurs ayant émis une requête authentifiée récemment",
});

// Global : les métriques sont injectées depuis les modules auth et tickets,
// sans avoir à importer ce module dans chacun.
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
    compteurTickets,
    histogrammeRequetes,
    jaugeUtilisateurs,
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
  ],
  // @Global() rend disponibles les providers EXPORTÉS, pas l'ensemble des
  // providers du module. Sans cette liste, @InjectMetric échoue partout
  // ailleurs — APP_INTERCEPTOR en est absent à dessein : c'est un
  // enregistrement global, pas une dépendance qu'on injecte.
  exports: [compteurTickets, histogrammeRequetes, jaugeUtilisateurs],
})
export class MetricsModule {}
