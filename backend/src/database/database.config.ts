import type { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST ?? 'postgres',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,

  // Chaque module déclarant TypeOrmModule.forFeature enregistre ses entités
  // automatiquement : aucune liste à maintenir à la main.
  autoLoadEntities: true,

  // Aligne le schéma de la base sur les entités à chaque démarrage. Confortable
  // tant que le modèle évolue, mais destructeur en production, où cette option
  // supprimerait des colonnes sans avertissement : des migrations prendront le
  // relais le moment venu.
  synchronize: process.env.NODE_ENV !== 'production',
};
