# coeur-vrai.com

Site de rencontre bienveillant entre **hommes cis** et **femmes trans**.
Ce dépôt contient le MVP : API temps réel + application web.

> Priorités produit : **sécurité** (majorité obligatoire, blocage, signalement,
> modération humaine) et **discrétion** (photos visibles seulement après un match,
> sur choix de la membre).

---

## Stack

| Couche | Technologie |
|---|---|
| Runtime | Node.js 20 |
| API | Express 4 + TypeScript, validation Zod |
| Temps réel | Socket.io 4 |
| Base de données | PostgreSQL 15 (driver `pg`, SQL brut) |
| Cache / files | Redis 7 (file de modération, rate limiting) |
| Authentification | JWT (`jsonwebtoken`) + mots de passe `bcrypt` |
| Paiements | Stripe API (client prêt, abonnements à venir) |
| Frontend | Next.js 14 (App Router) + React 18 + Tailwind CSS 3 |

---

## Architecture

```
coeurvrai/
├── docker-compose.yml        PostgreSQL 15 + Redis 7 pour le dev local
├── backend/
│   ├── .env.example
│   └── src/
│       ├── server.ts         Express + Socket.io (port 3001)
│       ├── api/              Routes REST
│       │   ├── auth.ts       inscription / connexion / me
│       │   ├── profile.ts    CRUD profil, découverte
│       │   ├── like.ts       likes, matchs, historique des messages
│       │   └── report.ts     signalements, blocages, back-office modération
│       ├── socket/chat.ts    Chat temps réel (Socket.io)
│       ├── services/
│       │   ├── moderation.ts File de signalements (Redis + PostgreSQL)
│       │   ├── profiles.ts   Lecture/projection des profils
│       │   └── payments.ts   Client Stripe
│       ├── middleware/       auth JWT, rôles, rate limiting, erreurs
│       ├── db/               schema.ts, migrate.ts, requêtes partagées
│       ├── models/types.ts   Types métier
│       └── utils/            config, pool pg, redis, jwt, helpers
└── frontend/
    ├── .env.example
    ├── app/
    │   ├── (auth)/           /login, /signup
    │   └── (app)/            /discover, /matches, /chat/[matchId] (espace connecté)
    ├── components/           ProfileCard, NavBar, ReportButton
    ├── hooks/                useAuth (contexte), useChat (Socket.io)
    ├── lib/api.ts            Client REST
    └── types/                Types partagés côté client
```

### Modèle de données

| Table | Rôle |
|---|---|
| `users` | Compte : e-mail, hash bcrypt, `account_type` (`homme` \| `femme_trans`), date de naissance (≥ 18 ans, contrainte SQL), rôle, statut |
| `profiles_homme` | Profil des hommes : pseudo, bio, ville, photos, taille |
| `profiles_femme_trans` | Profil des femmes trans : pseudo, bio, ville, photos, pronoms, `photos_matches_only` |
| `likes` | Like unidirectionnel `(liker_id, liked_id)` |
| `matches` | Like réciproque ; paire ordonnée `user_a < user_b`, `unmatched_at` pour rompre |
| `messages` | Messages d'un match (1 à 2000 caractères), accusé de lecture |
| `reports` | Signalements : motif, message cité, statut, décision du modérateur |
| `blocks` | Blocages (masquent les profils dans les deux sens et coupent le chat) |

### Règles métier

- **Compatibilité** : un homme ne voit et ne like que des femmes trans, et inversement.
- **Match** : créé automatiquement quand deux likes sont réciproques ; les deux
  membres reçoivent l'événement socket `match:new`. Un match rompu n'est pas recréé.
- **Photos privées** : si `photos_matches_only` est activé, les photos d'une
  femme trans ne sont renvoyées par l'API qu'aux personnes avec qui elle a matché.
- **Signalement** : bloque immédiatement la personne signalée, puis place le cas
  dans la file de modération. Les motifs `mineur` et les comptes signalés par
  ≥ 3 personnes en 24 h passent en **file prioritaire**.
- **Sanctions** : `suspend` / `ban` changent le statut du compte ; ses sockets
  sont déconnectés et toutes ses requêtes sont refusées (le statut est vérifié en base à chaque requête).
- **Rate limiting** (Redis) : inscription 5/h, connexion 10/15 min, likes 200/jour,
  signalements 20/jour, chat 30 messages/10 s.

---

## API

Toutes les routes sauf `signup`/`login` exigent `Authorization: Bearer <jwt>`.

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/auth/signup` | `{ email, password, accountType, birthdate, displayName }` |
| POST | `/api/auth/login` | `{ email, password }` → `{ token, user }` |
| GET | `/api/auth/me` | Utilisateur courant |
| GET | `/api/profiles/me` | Son profil |
| PUT | `/api/profiles/me` | Mise à jour partielle du profil |
| DELETE | `/api/profiles/me` | Suppression définitive du compte |
| GET | `/api/profiles/discover` | Profils compatibles non encore likés |
| GET | `/api/profiles/:id` | Profil d'un membre |
| POST | `/api/likes/:userId` | Like → `{ matched, matchId }` |
| DELETE | `/api/likes/:userId` | Retirer un like |
| GET | `/api/likes/matches` | Matchs actifs + dernier message |
| DELETE | `/api/likes/matches/:matchId` | Rompre un match |
| GET | `/api/likes/matches/:matchId/messages?before=` | Historique (50 par page) |
| POST | `/api/reports` | `{ reportedId, reason, details?, messageId? }` |
| POST | `/api/blocks/:userId` | Bloquer un membre |
| GET | `/api/moderation/stats` | *(modérateur)* Taille des files |
| POST | `/api/moderation/next` | *(modérateur)* Prendre le prochain signalement |
| POST | `/api/moderation/:id/resolve` | *(modérateur)* `{ action: dismiss\|warn\|suspend\|ban, note? }` |
| GET | `/health` | État PostgreSQL + Redis |

### Socket.io

Connexion : `io(API_URL, { auth: { token } })`.

| Sens | Événement | Données |
|---|---|---|
| → serveur | `chat:join` | `{ matchId }` |
| → serveur | `chat:message` | `{ matchId, content }` (ack : `{ ok, message }` ou `{ error }`) |
| → serveur | `chat:typing` / `chat:read` | `{ matchId }` |
| ← client | `chat:message`, `chat:typing`, `chat:read` | |
| ← client | `match:new` / `match:closed` | `{ matchId }` |

---

## Démarrage local

Prérequis : Node.js 20+, Docker (ou PostgreSQL 15 et Redis installés localement).

```bash
# 1. Base de données et Redis
docker compose up -d

# 2. Backend
cd backend
cp .env.example .env          # renseigner JWT_SECRET (openssl rand -hex 64)
npm install
npm run db:migrate            # crée les tables (idempotent)
npm run dev                   # http://localhost:3001

# 3. Frontend (autre terminal)
cd frontend
cp .env.example .env.local
npm install
npm run dev                   # http://localhost:3000
```

Pour donner le rôle modérateur à un compte :

```bash
docker compose exec postgres psql -U coeurvrai -c \
  "UPDATE users SET role = 'moderator' WHERE email = 'moi@exemple.fr';"
```

### Scripts utiles

| Dossier | Commande | Effet |
|---|---|---|
| backend | `npm run dev` | API avec rechargement à chaud (tsx) |
| backend | `npm run build && npm start` | Build et lancement production |
| backend | `npm run typecheck` | Vérification TypeScript |
| frontend | `npm run dev` / `build` / `start` | Next.js |
| frontend | `npm run lint` / `typecheck` | ESLint / TypeScript |

---

## Prochaines étapes

- Abonnements premium Stripe (Checkout + webhook `STRIPE_WEBHOOK_SECRET`)
- Upload de photos (stockage S3 + modération d'images) — les photos sont aujourd'hui des URL
- Vérification d'e-mail et réinitialisation de mot de passe
- Jeton en cookie `httpOnly` au lieu du `localStorage`
- Interface web de modération
- Tests automatisés (Vitest + Supertest) et CI
- Pages légales : CGU, charte de la communauté, politique de confidentialité (RGPD)
