import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { Ticket } from './ticket.entity';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

// AuthModule n'est pas importé : Passport enregistre ses stratégies dans un
// registre global, et AuthGuard('jwt') retrouve la sienne depuis n'importe où
// dès lors qu'AuthModule l'a instanciée.
//
// UsersModule, en revanche, l'est : le service doit vérifier que le
// destinataire d'une assignation est bien un technicien actif.
@Module({
  imports: [TypeOrmModule.forFeature([Ticket]), UsersModule],
  controllers: [TicketsController],
  providers: [TicketsService],
  // Exporté sans consommateur à ce jour. Le dashboard, qu'on attendait ici,
  // injecte finalement le dépôt Ticket : la règle de visibilité par utilisateur
  // qu'applique ce service n'a pas de sens sur une agrégation globale.
  exports: [TicketsService],
})
export class TicketsModule {}
