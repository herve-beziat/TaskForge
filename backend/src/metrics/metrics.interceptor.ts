import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import type { Request, Response } from 'express';
import { Histogram } from 'prom-client';
import { Observable } from 'rxjs';

// Express déclare « route » en propriété obligatoire de type any : une interface
// qui l'étend ne peut pas la rendre optionnelle. On se contente donc de la typer
// plus précisément. À l'exécution elle reste absente sur une 404, d'où le
// chaînage optionnel au moment de la lecture.
interface RequeteAvecRoute extends Request {
  route: { path?: string };
}

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric('taskforge_http_request_duration_seconds')
    private readonly duree: Histogram<string>,
  ) {}

  intercept(
    contexte: ExecutionContext,
    suite: CallHandler,
  ): Observable<unknown> {
    // Les contextes non HTTP (websockets, tâches planifiées) n'ont ni requête
    // ni réponse : rien à mesurer ici.
    if (contexte.getType() !== 'http') {
      return suite.handle();
    }

    const http = contexte.switchToHttp();
    const requete = http.getRequest<RequeteAvecRoute>();
    const reponse = http.getResponse<Response>();

    const chrono = this.duree.startTimer();

    // Sur « finish » plutôt que dans un opérateur RxJS : le code de statut y est
    // définitif, y compris lorsqu'un filtre d'exception l'a transformé en 500.
    reponse.once('finish', () => {
      chrono({
        method: requete.method,
        // Le motif de route (/tickets/:id), jamais l'URL réelle (/tickets/42) :
        // chaque valeur d'étiquette crée une série temporelle, et l'URL brute
        // en produirait une par ressource consultée.
        // Sur une 404, aucun motif n'existe — « unknown » évite qu'une rafale
        // d'URL aléatoires ne fasse enfler la mémoire.
        route: requete.route?.path ?? 'unknown',
        status: String(reponse.statusCode),
      });
    });

    return suite.handle();
  }
}
