import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { databaseConfig } from './database/database.config';
import { HealthModule } from './health/health.module';
import { loggerConfig } from './logger/logger.config';

@Module({
  imports: [
    LoggerModule.forRoot(loggerConfig),
    TypeOrmModule.forRoot(databaseConfig),
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
