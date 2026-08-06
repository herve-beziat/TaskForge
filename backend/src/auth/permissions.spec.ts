import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import type { Request } from 'express';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import type { UtilisateurAuthentifie } from './jwt.strategy';
import { DashboardController } from '../dashboard/dashboard.controller';
import { DashboardService } from '../dashboard/dashboard.service';
import { TicketsController } from '../tickets/tickets.controller';
import { TicketsService } from '../tickets/tickets.service';
import { Ticket, TicketPriority, TicketStatus } from '../tickets/ticket.entity';
import { UsersController } from '../users/users.controller';
import { UsersService } from '../users/users.service';
import { User, UserRole } from '../users/user.entity';

const ID = '11111111-1111-1111-1111-111111111111';

const TICKET = {
  id: ID,
  title: 'Imprimante hors service',
  description: "L'imprimante du deuxième étage ne répond plus.",
  priority: TicketPriority.MEDIUM,
  status: TicketStatus.OPEN,
  reporterId: ID,
  assigneeId: null,
  resolvedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  reporter: { id: ID, name: 'Auteur' },
  assignee: null,
} as Ticket;

const UTILISATEUR = {
  id: ID,
  email: 'compte@exemple.fr',
  name: 'Compte',
  role: UserRole.USER,
  isActive: true,
  createdAt: new Date(),
} as User;

// Renseigné par chaque test avant l'appel, lu par le guard de remplacement.
let utilisateurCourant: UtilisateurAuthentifie | null = null;

// Remplace AuthGuard('jwt'), et lui seul.
//
// RolesGuard reste le vrai : c'est lui, et la métadonnée que pose @Auth(), que
// ce fichier met à l'épreuve. Le guard JWT est déjà couvert par jwt.strategy et
// auth.service.spec ; le simuler évite d'avoir à signer des jetons et à monter
// une base pour vérifier des droits d'accès.
const guardDeRemplacement = {
  canActivate: (contexte: ExecutionContext): boolean => {
    if (utilisateurCourant === null) {
      // Comme le vrai : absence de jeton donne 401, pas 403.
      throw new UnauthorizedException();
    }

    const requete = contexte.switchToHttp().getRequest<Request>();
    Object.assign(requete, { user: utilisateurCourant });

    return true;
  },
};

type Methode = 'get' | 'post' | 'patch';
type Route = [Methode, string];

// Routes exigeant seulement d'être authentifié, quel que soit le rôle.
const ROUTES_AUTHENTIFIEES: Route[] = [
  ['get', '/auth/me'],
  ['get', '/tickets'],
  ['post', '/tickets'],
  ['get', `/tickets/${ID}`],
  ['patch', `/tickets/${ID}`],
  ['patch', `/tickets/${ID}/status`],
  ['patch', `/tickets/${ID}/assignee`],
];

// Routes réservées aux administrateurs.
const ROUTES_ADMIN: Route[] = [
  ['get', '/users'],
  ['patch', `/users/${ID}`],
  ['get', '/dashboard/stats'],
];

const TOUTES_LES_ROUTES: Route[] = [...ROUTES_AUTHENTIFIEES, ...ROUTES_ADMIN];

function connecter(role: UserRole | null): void {
  utilisateurCourant =
    role === null
      ? null
      : {
          id: ID,
          email: 'compte@exemple.fr',
          name: 'Compte',
          role,
          createdAt: new Date(),
        };
}

describe('Permissions des routes', () => {
  // Typé comme dans app.e2e-spec.ts : sans le paramètre, getHttpServer() rend
  // `any` et supertest le reçoit sans contrôle.
  let app: INestApplication<App>;

  function appeler(methode: Methode, chemin: string) {
    const agent = request(app.getHttpServer());

    if (methode === 'get') {
      return agent.get(chemin);
    }
    if (methode === 'post') {
      return agent.post(chemin).send({});
    }
    return agent.patch(chemin).send({});
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [
        AuthController,
        UsersController,
        TicketsController,
        DashboardController,
      ],
      providers: [
        { provide: AuthService, useValue: {} },
        {
          provide: UsersService,
          useValue: {
            lister: jest.fn().mockResolvedValue([UTILISATEUR]),
            modifier: jest.fn().mockResolvedValue(UTILISATEUR),
          },
        },
        {
          provide: TicketsService,
          useValue: {
            creer: jest.fn().mockResolvedValue(TICKET),
            lister: jest.fn().mockResolvedValue({
              donnees: [TICKET],
              total: 1,
              page: 1,
              limit: 20,
              pages: 1,
            }),
            trouverParId: jest.fn().mockResolvedValue(TICKET),
            modifier: jest.fn().mockResolvedValue(TICKET),
            changerStatut: jest.fn().mockResolvedValue(TICKET),
            assigner: jest.fn().mockResolvedValue(TICKET),
          },
        },
        {
          provide: DashboardService,
          useValue: {
            statistiques: jest.fn().mockResolvedValue({
              total: 0,
              parStatut: { OPEN: 0, IN_PROGRESS: 0, RESOLVED: 0, CLOSED: 0 },
              parPriorite: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
              tempsMoyenDeResolution: { secondes: null, lisible: null },
            }),
          },
        },
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue(guardDeRemplacement)
      .compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    connecter(null);
  });

  describe('sans authentification', () => {
    // Le vrai risque n'est pas qu'une route soit mal protégée, c'est qu'elle ne
    // le soit pas du tout : un @Auth() oublié ne casse aucun test métier.
    it.each(TOUTES_LES_ROUTES)(
      'refuse %s %s en 401',
      async (methode, chemin) => {
        await appeler(methode, chemin).expect(401);
      },
    );
  });

  describe('utilisateur ordinaire', () => {
    it.each(ROUTES_AUTHENTIFIEES)(
      'laisse passer %s %s',
      async (methode, chemin) => {
        connecter(UserRole.USER);

        const reponse = await appeler(methode, chemin);
        expect([200, 201]).toContain(reponse.status);
      },
    );

    it.each(ROUTES_ADMIN)('refuse %s %s en 403', async (methode, chemin) => {
      connecter(UserRole.USER);

      await appeler(methode, chemin).expect(403);
    });
  });

  describe('technicien', () => {
    it.each(ROUTES_AUTHENTIFIEES)(
      'laisse passer %s %s',
      async (methode, chemin) => {
        connecter(UserRole.TECHNICIAN);

        const reponse = await appeler(methode, chemin);
        expect([200, 201]).toContain(reponse.status);
      },
    );

    // Un technicien traite des tickets, il n'administre pas les comptes et ne
    // consulte pas les statistiques globales.
    it.each(ROUTES_ADMIN)('refuse %s %s en 403', async (methode, chemin) => {
      connecter(UserRole.TECHNICIAN);

      await appeler(methode, chemin).expect(403);
    });
  });

  describe('administrateur', () => {
    it.each(TOUTES_LES_ROUTES)(
      'laisse passer %s %s',
      async (methode, chemin) => {
        connecter(UserRole.ADMIN);

        const reponse = await appeler(methode, chemin);
        expect([200, 201]).toContain(reponse.status);
      },
    );
  });
});
