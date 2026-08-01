import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from './ticket.entity';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

// AuthModule n'est pas importé : Passport enregistre ses stratégies dans un
// registre global, et AuthGuard('jwt') retrouve la sienne depuis n'importe où
// dès lors qu'AuthModule l'a instanciée.
@Module({
  imports: [TypeOrmModule.forFeature([Ticket])],
  controllers: [TicketsController],
  providers: [TicketsService],
  // Exporté par anticipation : le tableau de bord (US14 à US16) en aura besoin.
  exports: [TicketsService],
})
export class TicketsModule {}
