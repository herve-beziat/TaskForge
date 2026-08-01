import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { databaseConfig } from './database/database.config';
import { HealthModule } from './health/health.module';
import { loggerConfig } from './logger/logger.config';
import { MetricsModule } from './metrics/metrics.module';
import { TicketsModule } from './tickets/tickets.module';

@Module({
  imports: [
    LoggerModule.forRoot(loggerConfig),
    TypeOrmModule.forRoot(databaseConfig),
    MetricsModule,
    HealthModule,
    // UsersModule n'est pas listé ici : AuthModule l'importe déjà,
    // et Nest ne l'instancie qu'une seule fois.
    AuthModule,
    TicketsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
