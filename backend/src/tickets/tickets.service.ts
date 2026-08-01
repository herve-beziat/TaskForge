import { Injectable } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { InjectRepository } from '@nestjs/typeorm';
import { Counter } from 'prom-client';
import { Repository } from 'typeorm';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { Ticket } from './ticket.entity';

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
}
