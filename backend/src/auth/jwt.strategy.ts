import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRole } from '../users/user.entity';
import { ActiveUsersService } from './active-users.service';

export interface ContenuJeton {
  sub: string;
  email: string;
  role: UserRole;
}

export interface UtilisateurAuthentifie {
  id: string;
  email: string;
  role: UserRole;
}

// Échoue bruyamment plutôt que de se rabattre sur une chaîne vide : sans ce
// garde-fou, l'application démarrerait en acceptant des jetons signés avec un
// secret vide, ce qui ne se verrait nulle part.
function secretJwt(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "JWT_SECRET est absent de l'environnement : impossible de valider les jetons.",
    );
  }
  return secret;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly actifs: ActiveUsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Explicite bien que ce soit la valeur par défaut : la gestion de
      // l'expiration est un critère d'acceptation de la story.
      ignoreExpiration: false,
      secretOrKey: secretJwt(),
    });
  }

  // Ce que cette méthode renvoie devient req.user. La configuration de log
  // lit déjà req.user?.id : le champ user_id, resté à null depuis TECH07,
  // se remplit désormais tout seul.
  validate(contenu: ContenuJeton): UtilisateurAuthentifie {
    if (!contenu.sub) {
      throw new UnauthorizedException();
    }

    this.actifs.signaler(contenu.sub);

    return {
      id: contenu.sub,
      email: contenu.email,
      role: contenu.role,
    };
  }
}
