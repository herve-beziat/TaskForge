import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private readonly sante: HealthCheckService,
    private readonly baseDeDonnees: TypeOrmHealthIndicator,
  ) {}

  // Renvoie 200 si tous les indicateurs répondent, 503 dès que l'un échoue.
  // C'est ce code que la sonde Docker interprète.
  @Get()
  @HealthCheck()
  verifier() {
    return this.sante.check([
      // Exécute une vraie requête sur la connexion TypeORM : une base qui
      // accepte les connexions mais refuse les requêtes est détectée.
      () => this.baseDeDonnees.pingCheck('database', { timeout: 1500 }),
    ]);
  }
}
