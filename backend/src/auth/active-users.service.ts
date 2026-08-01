import { Injectable } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Gauge } from 'prom-client';

const FACTEURS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

// Convertit une durée de la forme « 15m », « 1h », « 7d » en millisecondes.
function dureeEnMillisecondes(valeur: string): number {
  const correspondance = /^(\d+)\s*([smhd])?$/.exec(valeur.trim());
  if (!correspondance) {
    return FACTEURS.h;
  }
  const nombre = Number(correspondance[1]);
  const unite = correspondance[2] ?? 's';
  return nombre * FACTEURS[unite];
}

/**
 * Alimente la jauge « utilisateurs connectés ».
 *
 * Un JWT est sans état : le serveur n'apprend jamais qu'un utilisateur s'est
 * déconnecté, puisqu'il suffit au client de jeter son jeton. Un décompte exact
 * est donc impossible sans sessions côté serveur.
 *
 * La jauge mesure ici les **utilisateurs actifs récemment** : ceux ayant émis
 * au moins une requête authentifiée dans la fenêtre de validité du jeton.
 */
@Injectable()
export class ActiveUsersService {
  private readonly dernieresRequetes = new Map<string, number>();
  private readonly fenetre: number;

  constructor(
    @InjectMetric('taskforge_connected_users')
    private readonly jauge: Gauge<string>,
  ) {
    this.fenetre = dureeEnMillisecondes(process.env.JWT_EXPIRES_IN ?? '1h');
  }

  signaler(idUtilisateur: string): void {
    this.dernieresRequetes.set(idUtilisateur, Date.now());
    this.purger();
    this.jauge.set(this.dernieresRequetes.size);
  }

  nombreActifs(): number {
    this.purger();
    return this.dernieresRequetes.size;
  }

  // Purge à la demande plutôt que par minuterie : un setInterval maintiendrait
  // le processus Node vivant et compliquerait la fermeture propre en test.
  private purger(): void {
    const limite = Date.now() - this.fenetre;
    for (const [identifiant, instant] of this.dernieresRequetes) {
      if (instant < limite) {
        this.dernieresRequetes.delete(identifiant);
      }
    }
  }
}
