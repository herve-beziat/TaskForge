import { IsEmail, IsString, Length, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: "L'adresse email n'est pas valide." })
  @MaxLength(255, { message: "L'adresse email est trop longue." })
  email: string;

  @IsString()
  @Length(2, 120, {
    message: 'Le nom doit contenir entre 2 et 120 caractères.',
  })
  name: string;

  // Borne haute imposée par bcrypt, qui ignore tout au-delà de 72 octets et
  // tronque sans avertissement : sans elle, deux mots de passe partageant
  // leurs 72 premiers octets ouvriraient le même compte.
  // Borne basse en longueur seule, sans règle de composition : les
  // recommandations du NIST les ont abandonnées, car elles poussent vers des
  // schémas prévisibles pour un gain d'entropie faible.
  @IsString()
  @Length(10, 72, {
    message: 'Le mot de passe doit contenir entre 10 et 72 caractères.',
  })
  password: string;
}
