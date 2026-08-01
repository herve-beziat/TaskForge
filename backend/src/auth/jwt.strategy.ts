import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRole } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { ActiveUsersService } from './active-users.service';

// Le rôle ne figure volontairement pas dans le jeton : il est relu en base à
// chaque requête. Une donnée d'autorisation transportée mais non fiable serait
// un piège pour qui la lirait plus tard.
export interface ContenuJeton {
  sub: string;
  email: string;
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
  constructor(
    private readonly actifs: ActiveUsersService,
    private readonly utilisateurs: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Explicite bien que ce soit la valeur par défaut : la gestion de
      // l'expiration est un critère d'acceptation de US02.
      ignoreExpiration: false,
      secretOrKey: secretJwt(),
    });
  }

  // Ce que cette méthode renvoie devient req.user, ce qui alimente à la fois
  // le champ user_id des logs et le guard de rôles.
  //
  // Le compte est relu en base à chaque requête : c'est ce qui rend une
  // désactivation et un changement de rôle immédiats, au lieu d'attendre
  // l'expiration du jeton.
  async validate(contenu: ContenuJeton): Promise<UtilisateurAuthentifie> {
    if (!contenu.sub) {
      throw new UnauthorizedException();
    }

    const utilisateur = await this.utilisateurs.trouverParId(contenu.sub);

    if (!utilisateur) {
      throw new UnauthorizedException('Compte introuvable.');
    }

    if (!utilisateur.isActive) {
      throw new UnauthorizedException('Compte désactivé.');
    }

    this.actifs.signaler(utilisateur.id);

    return {
      id: utilisateur.id,
      email: utilisateur.email,
      // Lu en base, jamais dans le jeton : c'est la base qui fait autorité.
      role: utilisateur.role,
    };
  }
}
