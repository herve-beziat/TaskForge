import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Params } from 'nestjs-pino';
import pino from 'pino';

interface RequeteAuthentifiee extends IncomingMessage {
  user?: { id?: string };
}

const niveau = (process.env.LOG_LEVEL ?? 'info') as pino.Level;
const enDeveloppement = process.env.NODE_ENV !== 'production';
const dossierLogs = process.env.LOG_DIR ?? '/var/log/taskforge';

// pino-pretty n'est qu'une dépendance de développement : l'image de production
// ne l'installe pas. Le chargement est donc conditionnel et non statique.
function fluxSortieStandard(): pino.DestinationStream {
  if (!enDeveloppement) {
    return process.stdout;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const embellir = require('pino-pretty') as (
    options: Record<string, unknown>,
  ) => pino.DestinationStream;
  return embellir({
    colorize: true,
    singleLine: true,
    translateTime: 'HH:MM:ss',
  });
}

// multistream écrit vers plusieurs destinations dans le même processus.
// C'est ce qui autorise les formateurs personnalisés ci-dessous : un transport
// classique s'exécuterait dans un fil séparé, où une fonction n'est pas
// sérialisable — pino rejette d'ailleurs explicitement cette combinaison.
const flux = pino.multistream([
  { level: niveau, stream: fluxSortieStandard() },
  {
    level: niveau,
    stream: pino.destination({ dest: `${dossierLogs}/app.log`, mkdir: true }),
  },
]);

export const loggerConfig: Params = {
  pinoHttp: [
    {
      level: niveau,

      // Le sujet impose les noms de champs suivants : timestamp, level, message,
      // request_id, user_id. Pino émet par défaut « time », un « level » numérique
      // et « msg » : les trois sont donc renommés.
      messageKey: 'message',
      timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
      formatters: {
        level: (label) => ({ level: label }),
      },

      // Un identifiant entrant est réutilisé s'il existe, ce qui permet de suivre
      // une requête à travers plusieurs services. Il est renvoyé au client pour
      // qu'une erreur signalée puisse être reliée à sa ligne de log.
      genReqId: (req: IncomingMessage, res: ServerResponse) => {
        const entete = req.headers['x-request-id'];
        const identifiant =
          typeof entete === 'string' && entete.length > 0
            ? entete
            : randomUUID();
        res.setHeader('x-request-id', identifiant);
        return identifiant;
      },

      customProps: (req: IncomingMessage) => ({
        request_id: req.id,
        // Reste null tant que l'authentification n'alimente pas req.user (US02).
        user_id: (req as RequeteAuthentifiee).user?.id ?? null,
      }),

      // Suppression déclarative plutôt que vigilance au cas par cas.
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'res.headers["set-cookie"]',
          '*.password',
          '*.password_hash',
          '*.token',
        ],
        remove: true,
      },

      // Docker sonde /health toutes les dix secondes et Prometheus collecte
      // /metrics tout aussi régulièrement : sans ces exclusions, le fichier de
      // logs serait noyé sous des lignes sans valeur.
      autoLogging: {
        ignore: (req: IncomingMessage) =>
          req.url === '/health' || req.url === '/metrics',
      },
    },
    flux,
  ],
};
