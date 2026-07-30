import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap() {
  // bufferLogs met en attente les messages émis pendant l'amorçage, le temps
  // que le logger pino soit disponible : rien n'est perdu ni émis au mauvais format.
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Remplace le logger interne de Nest, pour que ses propres messages
  // (routes montées, modules initialisés) sortent eux aussi en JSON.
  app.useLogger(app.get(Logger));

  // Le front et l'API sont servis sur deux sous-domaines distincts
  // (taskforge.localhost et api.taskforge.localhost), donc deux origines
  // au sens du navigateur. L'origine est lue depuis la configuration plutôt
  // que fixée à « * », qui serait incompatible avec credentials: true.
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://taskforge.localhost',
    credentials: true,
  });

  await app.listen(process.env.BACKEND_PORT ?? 3000);
}

void bootstrap();
