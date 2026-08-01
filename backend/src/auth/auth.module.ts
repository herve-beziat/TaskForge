import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  // UsersModule exporte UsersService, dont AuthService a besoin.
  // Le module JWT et la stratégie Passport viendront s'ajouter ici en US02.
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
