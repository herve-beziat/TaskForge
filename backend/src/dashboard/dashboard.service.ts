import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { Ticket, TicketPriority, TicketStatus } from '../tickets/ticket.entity';
import { formaterDuree, tempsMoyenDeResolution } from './dashboard-metrics';

export interface StatistiquesDashboard {
  total: number;
  parStatut: Record<TicketStatus, number>;
  parPriorite: Record<TicketPriority, number>;
  tempsMoyenDeResolution: {
    secondes: number | null;
    lisible: string | null;
  };
}

interface LigneAgregee {
  valeur: string;
  total: string;
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Ticket)
    private readonly depot: Repository<Ticket>,
  ) {}

  async statistiques(): Promise<StatistiquesDashboard> {
    // En parallèle : les trois requêtes sont indépendantes, les enchaîner
    // tripleraient la latence sans rien apporter.
    const [statuts, priorites, resolus] = await Promise.all([
      this.compterPar('status'),
      this.compterPar('priority'),
      // Le filtre porte sur resolvedAt et non sur le statut : un ticket clos
      // conserve sa date de résolution, et c'est l'état final normal. Filtrer
      // sur RESOLVED écarterait l'essentiel de la mesure.
      this.depot.find({
        select: { createdAt: true, resolvedAt: true },
        where: { resolvedAt: Not(IsNull()) },
      }),
    ]);

    const parStatut = this.normaliser(
      Object.values(TicketStatus),
      statuts,
    ) as Record<TicketStatus, number>;

    const parPriorite = this.normaliser(
      Object.values(TicketPriority),
      priorites,
    ) as Record<TicketPriority, number>;

    const moyenne = tempsMoyenDeResolution(resolus);

    return {
      total: Object.values(parStatut).reduce((somme, n) => somme + n, 0),
      parStatut,
      parPriorite,
      tempsMoyenDeResolution: {
        secondes: moyenne,
        lisible: moyenne === null ? null : formaterDuree(moyenne),
      },
    };
  }

  // La colonne est une union de littéraux, jamais une entrée utilisateur :
  // l'interpolation est sûre ici, et le resterait mal si le type s'élargissait
  // un jour à string.
  private async compterPar(
    colonne: 'status' | 'priority',
  ): Promise<LigneAgregee[]> {
    const lignes: LigneAgregee[] = await this.depot
      .createQueryBuilder('ticket')
      .select(`ticket.${colonne}`, 'valeur')
      .addSelect('COUNT(*)', 'total')
      .groupBy(`ticket.${colonne}`)
      .getRawMany();

    return lignes;
  }

  // GROUP BY n'émet aucune ligne pour une valeur sans ticket. Sans cette
  // remise à plat, « Résolus » disparaîtrait du dashboard au lieu d'afficher
  // zéro, et le front devrait deviner les clés manquantes.
  //
  // COUNT renvoie une chaîne en PostgreSQL — un bigint ne tient pas toujours
  // dans un number, le pilote refuse donc de le convertir en silence.
  private normaliser(
    valeursPossibles: readonly string[],
    lignes: LigneAgregee[],
  ): Record<string, number> {
    const compteurs: Record<string, number> = {};

    for (const valeur of valeursPossibles) {
      compteurs[valeur] = 0;
    }

    for (const ligne of lignes) {
      compteurs[ligne.valeur] = Number(ligne.total);
    }

    return compteurs;
  }
}
