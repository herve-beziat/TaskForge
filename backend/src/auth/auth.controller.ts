import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
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

  // Permet de vérifier qu'un jeton est valide, non expiré, et que req.user
  // est correctement alimenté par la stratégie.
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  moi(@Req() requete: Request): UtilisateurAuthentifie {
    return requete.user as UtilisateurAuthentifie;
  }
}
