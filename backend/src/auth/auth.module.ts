import { Module } from '@nestjs/common';
import { JwtModule, type JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { ActiveUsersService } from './active-users.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    // UsersModule exporte UsersService, dont AuthService a besoin.
    UsersModule,
    PassportModule,
    JwtModule.register({
      // Le secret n'est pas re-vérifié ici : JwtStrategy échoue à son
      // instanciation s'il est absent, et cette instanciation a lieu au
      // démarrage. Vérifier ici lèverait dès l'import du module, ce qui
      // casserait les tests important AuthModule.
      secret: process.env.JWT_SECRET,
      // expiresIn attend un type littéral de la bibliothèque « ms », qui décrit
      // les formes acceptées ('15m', '1h'…). Une valeur lue dans l'environnement
      // est inconnue à la compilation : TypeScript ne peut pas la valider, et
      // c'est « ms » qui l'analysera à l'exécution.
      signOptions: {
        expiresIn: process.env.JWT_EXPIRES_IN ?? '1h',
      } as JwtSignOptions,
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, ActiveUsersService],
  // Exporté pour que les autres modules puissent utiliser AuthGuard('jwt') :
  // les tickets en auront besoin dès l'EPIC 2.
  exports: [PassportModule],
})
export class AuthModule {}
