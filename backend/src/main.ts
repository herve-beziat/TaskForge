import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
bootstrap();