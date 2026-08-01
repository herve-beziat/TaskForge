import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  // Enregistre le dépôt de l'entité et la fait découvrir par autoLoadEntities.
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
  // Exporté pour le module d'authentification, puis pour celui des tickets.
  exports: [UsersService],
})
export class UsersModule {}
