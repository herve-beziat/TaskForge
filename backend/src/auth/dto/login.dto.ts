import { IsEmail, IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Identifiants invalides.' })
  @MaxLength(255, { message: 'Identifiants invalides.' })
  email: string;

  // Aucune contrainte de longueur minimale, contrairement à l'inscription :
  // un refus pour « mot de passe trop court » apprendrait à un attaquant que
  // sa tentative ne peut pas être la bonne, sans consulter la base. Toute
  // tentative doit échouer de la même manière.
  @IsString()
  @IsNotEmpty({ message: 'Identifiants invalides.' })
  @MaxLength(72, { message: 'Identifiants invalides.' })
  password: string;
}
