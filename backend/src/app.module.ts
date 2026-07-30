import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { loggerConfig } from './logger/logger.config';

@Module({
  imports: [LoggerModule.forRoot(loggerConfig)],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
