import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UsersService } from './users.service';

@Module({
  // Enregistre le dépôt de l'entité et la fait découvrir par autoLoadEntities :
  // la table sera créée au prochain démarrage.
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersService],
  // Exporté pour le module d'authentification, puis pour celui des tickets.
  exports: [UsersService],
})
export class UsersModule {}
