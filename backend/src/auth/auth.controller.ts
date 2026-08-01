import { Body, Controller, Post } from '@nestjs/common';
import { AuthService, UtilisateurPublic } from './auth.service';
import { RegisterDto } from './dto/register.dto';

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
}
