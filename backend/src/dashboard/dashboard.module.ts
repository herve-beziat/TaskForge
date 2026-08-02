import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from '../tickets/ticket.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

// Le dépôt Ticket est injecté directement, sans passer par TicketsService.
//
// Ce dernier applique une règle de visibilité par utilisateur, qui n'a pas de
// sens sur une agrégation globale : il faudrait le contourner. Et ses méthodes
// renvoient des entités complètes, là où le dashboard n'a besoin que de
// compteurs et de deux colonnes de dates.
@Module({
  imports: [TypeOrmModule.forFeature([Ticket])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
