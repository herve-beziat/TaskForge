import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  // Index posés dès maintenant : ce sont les filtres et tris d'US11 et US12.
  // Les ajouter plus tard imposerait une modification de schéma sur une table
  // déjà remplie.
  @Index()
  @Column({
    type: 'enum',
    enum: TicketPriority,
    enumName: 'ticket_priority',
    default: TicketPriority.MEDIUM,
  })
  priority: TicketPriority;

  @Index()
  @Column({
    type: 'enum',
    enum: TicketStatus,
    enumName: 'ticket_status',
    default: TicketStatus.OPEN,
  })
  status: TicketStatus;

  // Rempli à la transition vers RESOLVED (US08). C'est lui qui porte le calcul
  // du temps moyen de résolution (US15).
  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;

  // RESTRICT : supprimer un utilisateur ayant créé des tickets devient
  // impossible, plutôt que d'effacer silencieusement son historique. C'est la
  // raison pour laquelle US03 propose une désactivation et non une suppression.
  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'reporter_id' })
  reporter: User;

  @Index()
  @Column({ name: 'reporter_id', type: 'uuid' })
  reporterId: string;

  // SET NULL : un technicien qui quitte l'équipe libère ses tickets au lieu
  // de les emporter avec lui.
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assignee_id' })
  assignee: User | null;

  @Index()
  @Column({ name: 'assignee_id', type: 'uuid', nullable: true })
  assigneeId: string | null;

  @Index()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
