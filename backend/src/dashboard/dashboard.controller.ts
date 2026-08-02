import { Controller, Get } from '@nestjs/common';
import { Auth } from '../auth/auth.decorator';
import { UserRole } from '../users/user.entity';
import { DashboardService, StatistiquesDashboard } from './dashboard.service';

// Le contrôle d'accès porte sur la classe : toute route ajoutée ici hérite de
// la restriction, plutôt que de dépendre de la vigilance de qui l'ajoute.
//
// Les compteurs globaux agrègent des tickets qu'un utilisateur ordinaire ne
// peut pas consulter individuellement — les exposer contournerait la règle de
// visibilité par la porte de derrière.
@Controller('dashboard')
@Auth(UserRole.ADMIN)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('stats')
  statistiques(): Promise<StatistiquesDashboard> {
    return this.dashboard.statistiques();
  }
}
