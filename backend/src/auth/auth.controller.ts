import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Auth } from './auth.decorator';
import {
  AuthService,
  ResultatConnexion,
  UtilisateurPublic,
} from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import type { UtilisateurAuthentifie } from './jwt.strategy';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // Nest répond 201 par défaut sur un @Post, ce qui correspond bien à la
  // création d'une ressource. La validation du corps est assurée par le pipe
  // global déclaré dans main.ts.
  @Post('register')
  inscrire(@Body() donnees: RegisterDto): Promise<UtilisateurPublic> {
    return this.auth.inscrire(donnees);
  }

  // 200 explicite : une connexion ne crée pas de ressource, le 201 par défaut
  // de Nest serait trompeur.
  @Post('login')
  @HttpCode(HttpStatus.OK)
  connecter(@Body() donnees: LoginDto): Promise<ResultatConnexion> {
    return this.auth.connecter(donnees);
  }

  // @Auth() sans argument : authentification requise, rôle indifférent.
  // Un seul chemin de protection dans tout le projet, qu'il y ait un rôle
  // à contrôler ou non.
  @Get('me')
  @Auth()
  moi(@Req() requete: Request): UtilisateurAuthentifie {
    return requete.user as UtilisateurAuthentifie;
  }
}
