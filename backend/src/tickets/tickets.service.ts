import { Injectable } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { InjectRepository } from '@nestjs/typeorm';
import { Counter } from 'prom-client';
import { FindOptionsWhere, Repository } from 'typeorm';
import { UserRole } from '../users/user.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ListTicketsDto } from './dto/list-tickets.dto';
import { Ticket } from './ticket.entity';

// Réduit à ce dont le service a besoin : il n'a pas à connaître le type
// produit par la stratégie d'authentification, et les tests non plus.
export interface Demandeur {
  id: string;
  role: UserRole;
}

export interface ResultatPagine {
  donnees: Ticket[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly depot: Repository<Ticket>,
    @InjectMetric('taskforge_tickets_created_total')
    private readonly compteurCreations: Counter<string>,
  ) {}

  // reporterId vient du jeton, jamais du corps de la requête : personne ne
  // peut créer un ticket au nom d'un autre.
  //
  // Le statut n'est pas fixé ici — l'entité porte OPEN par défaut. Une seule
  // source pour cette règle plutôt que deux à garder cohérentes.
  async creer(donnees: CreateTicketDto, reporterId: string): Promise<Ticket> {
    const ticket = this.depot.create({ ...donnees, reporterId });
    const enregistre = await this.depot.save(ticket);

    // Après la persistance uniquement : compter les créations qui échouent
    // donnerait une métrique fausse, ce qui est pire qu'une métrique absente.
    this.compteurCreations.inc();

    return enregistre;
  }

  async lister(
    options: ListTicketsDto,
    demandeur: Demandeur,
  ): Promise<ResultatPagine> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;

    const [donnees, total] = await this.depot.findAndCount({
      where: this.filtreDeVisibilite(demandeur),
      // Du plus récent au plus ancien : le dernier incident signalé est
      // celui qui intéresse.
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      donnees,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  // Règle métier, pas détail de présentation : un utilisateur ordinaire ne
  // voit que ses propres signalements. Technicien et administrateur voient
  // l'ensemble — un technicien doit pouvoir reprendre le ticket d'un collègue
  // absent.
  private filtreDeVisibilite(
    demandeur: Demandeur,
  ): FindOptionsWhere<Ticket> | undefined {
    if (demandeur.role === UserRole.USER) {
      return { reporterId: demandeur.id };
    }
    return undefined;
  }
}
