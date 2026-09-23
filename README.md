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
| E-mails | nodemailer (SMTP) |
| Vérification d'identité | Onfido Studio (`@onfido/api` côté serveur, `onfido-sdk-ui` côté web) |
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
│       ├── app.ts            Construction de l'app Express + Socket.io (réutilisée par les tests)
│       ├── server.ts         Démarrage (port 3001) + planification des purges
│       ├── api/              Routes REST
│       │   ├── auth.ts       inscription / connexion / me
│       │   ├── account.ts    paramètres, export RGPD, suppression de compte, consentements
│       │   ├── profile.ts    CRUD profil, découverte
│       │   ├── like.ts       likes, matchs, historique des messages
│       │   ├── report.ts     signalements, blocages, back-office modération
│       │   └── verification.ts  statut, jeton Onfido, webhook Onfido
│       ├── socket/chat.ts    Chat temps réel (Socket.io)
│       ├── services/
│       │   ├── account.ts    Suppression complète et export JSON d'un compte
│       │   ├── activity.ts   Dernière activité + journal des IP de connexion
│       │   ├── emailVerification.ts  Liens de vérification d'e-mail (24 h, jeton haché)
│       │   ├── mailer.ts     Envoi d'e-mails (nodemailer ; console si SMTP_URL vide)
│       │   ├── onfido.ts     Client Onfido, vérification de signature des webhooks
│       │   ├── moderation.ts File de signalements (Redis + PostgreSQL)
│       │   ├── profiles.ts   Lecture/projection des profils
│       │   └── payments.ts   Client Stripe
│       ├── jobs/             Purges RGPD planifiées (node-cron) + lancement manuel
│       ├── middleware/       auth JWT (+ journal d'activité), rôles, rate limiting, erreurs
│       ├── db/               schema.ts, migrate.ts, requêtes partagées
│       ├── models/types.ts   Types métier
│       └── utils/            config, pool pg, redis, jwt, helpers
│   └── tests/                Tests d'intégration (Vitest + Supertest, vraie base)
└── frontend/
    ├── .env.example
    ├── app/
    │   ├── (auth)/           /login, /signup
    │   ├── (app)/            /discover, /matches, /chat/[matchId],
    │   │                     /settings, /settings/export-data, /settings/delete-account,
    │   │                     /onboarding/verify-email, /onboarding/identity
    │   ├── verify-email/     page ouverte depuis le lien reçu par e-mail (publique)
    │   └── legal/            /legal/cgu, /legal/politique-confidentialite,
    │                         /legal/charte-communaute (layout + navigation commune)
    ├── components/           ProfileCard, NavBar, ReportButton, Footer, ExportDataButton, VerifiedBadge
    ├── hooks/                useAuth (contexte), useChat (Socket.io)
    ├── lib/api.ts            Client REST
    ├── lib/legal.ts          Mentions légales (à compléter) et version des textes
    └── types/                Types partagés côté client
```

### Modèle de données

| Table | Rôle |
|---|---|
| `users` | Compte : e-mail, hash bcrypt, `account_type` (`homme` \| `femme_trans`), date de naissance (≥ 18 ans, contrainte SQL), rôle, statut, preuves de consentement (`terms_accepted_date`, `terms_version`, `gdpr_consent_date`), activité (`last_activity_at`, `last_ip`, `ip_logs` JSONB `[{ip, date}]`, `inactivity_warned_at`), vérification (`email_verified`, `email_verified_at`, `onfido_applicant_id`, `onfido_check_id`, `onfido_check_status`, `verified_badge` colonne générée) |
| `profiles_homme` | Profil des hommes : pseudo, bio, ville, photos, taille |
| `profiles_femme_trans` | Profil des femmes trans : pseudo, bio, ville, photos, pronoms, `photos_matches_only` |
| `likes` | Like unidirectionnel `(liker_id, liked_id)` |
| `matches` | Like réciproque ; paire ordonnée `user_a < user_b`, `unmatched_at` pour rompre |
| `messages` | Messages d'un match (1 à 2000 caractères), accusé de lecture |
| `reports` | Signalements : motif, message cité, statut, décision du modérateur, `closed_at` (date de clôture) |
| `blocks` | Blocages (masquent les profils dans les deux sens et coupent le chat) |

### Règles métier

- **Consentements** : l'inscription exige deux consentements distincts, `acceptTerms`
  (CGU + charte) et `gdprConsent` (données sensibles, RGPD art. 9.2.a). Leur date et la
  version des textes (`TERMS_VERSION`) sont enregistrées dans `users`.

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
- **Vérification d'e-mail** : un lien (valable 24 h, jeton stocké haché, usage unique)
  est envoyé à l'inscription et peut être renvoyé (3/h) ; un nouvel envoi invalide le précédent.
- **Vérification d'identité (facultative)** : selfie vidéo via un workflow Onfido Studio,
  après consentement explicite (données biométriques). Aucune donnée personnelle n'est
  envoyée à Onfido (applicant au nom générique) ; seuls les identifiants et le statut sont
  stockés. Le webhook est authentifié (HMAC `X-SHA2-Signature`) et le statut est relu via
  l'API Onfido. L'applicant est supprimé chez Onfido avec le compte.
- **Badge « Profil vérifié »** : `verified_badge = email_verified AND onfido_check_status = 'approved'`
  (colonne générée PostgreSQL), exposé comme `verified` dans les profils et les matchs.
- **Journal de connexion** : à chaque inscription/connexion et à chaque changement d'IP,
  une entrée `{ ip, date }` est ajoutée à `users.ip_logs` ; `last_activity_at` est mis à
  jour au plus toutes les 5 minutes (REST et Socket.io). Les entrées de plus d'1 an sont
  supprimées.
- **Suppression de compte** : ressaisie de l'e-mail et du mot de passe ; suppression en
  cascade du profil (photos), des likes, matchs, conversations, blocages et
  signalements ; les matchs sont notifiés (`match:closed`).
- **Rate limiting** (Redis) : inscription 5/h, connexion 10/15 min, likes 200/jour,
  signalements 20/jour, chat 30 messages/10 s.

---

## API

Toutes les routes sauf `signup`/`login` exigent `Authorization: Bearer <jwt>`.

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/auth/signup` | `{ email, password, accountType, birthdate, displayName, acceptTerms: true, gdprConsent: true }` |
| POST | `/api/auth/login` | `{ email, password }` → `{ token, user }` |
| POST | `/api/auth/send-verification-email` | Renvoie le lien de vérification d'e-mail |
| POST | `/api/auth/verify-email` | *(public)* `{ token }` — confirme l'adresse |
| GET | `/api/verification/status` | État des vérifications (e-mail, Onfido, badge) |
| POST | `/api/verification/onfido-token` | `{ consent: true }` → `{ sdkToken, workflowRunId }` |
| POST | `/api/verification/onfido-check` | *(webhook Onfido signé)* enregistre le résultat |
| GET | `/api/auth/me` | Utilisateur courant |
| GET | `/api/account/consent-version` | *(public)* Version en vigueur des textes légaux |
| GET | `/api/account` | Paramètres : dernière activité, historique des IP, consentements |
| POST | `/api/account/consent` | `{ acceptTerms: true, gdprConsent: true }` — accepter la version en vigueur |
| GET | `/api/account/export` | Export RGPD complet (fichier JSON) |
| DELETE | `/api/account/delete` | `{ email, password }` — suppression définitive du compte |
| GET | `/api/profiles/me` | Son profil |
| PUT | `/api/profiles/me` | Mise à jour partielle du profil |
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

### Configurer Onfido

1. Créer un compte Onfido (région **EU**) et un jeton API sandbox → `ONFIDO_API_TOKEN`.
2. Dans Onfido Studio, créer un workflow de vérification par selfie (tâche *Motion* /
   liveness) avec des issues `approved` / `declined` → `ONFIDO_WORKFLOW_ID`.
3. Déclarer un webhook vers `https://<api>/api/verification/onfido-check` pour
   l'événement `workflow_run.completed` → son jeton va dans `ONFIDO_WEBHOOK_TOKEN`.
4. En local, exposer l'API (ex. `ngrok http 3001`) pour recevoir le webhook.

Sans `ONFIDO_API_TOKEN`, l'écran de vérification indique que la fonctionnalité n'est pas
disponible. Sans `SMTP_URL`, les e-mails (et leurs liens) s'affichent dans la console de l'API.

### Purges RGPD automatiques

Le serveur planifie chaque nuit (`CLEANUP_CRON`, défaut `0 3 * * *`, heure de Paris) :

| Purge | Règle |
|---|---|
| Comptes inactifs | Préavis à 23 mois d'inactivité, suppression à 2 ans si le préavis date de 30 jours ; toute activité annule le préavis |
| Signalements clos | Suppression 1 an après `closed_at` (statuts `resolved` / `dismissed`) |
| Données de connexion | Entrées `ip_logs` et `last_ip` de plus d'1 an |

Un verrou PostgreSQL (`pg_try_advisory_lock`) évite les exécutions concurrentes si
plusieurs instances tournent ; mettez `CLEANUP_CRON=` (vide) pour désactiver la
planification sur une instance. Lancement manuel : `npm run jobs:cleanup`.

### Tests

Les tests d'intégration utilisent une vraie base PostgreSQL et un vrai Redis
(la base `coeurvrai_test` est créée automatiquement, puis vidée avant chaque test) :

```bash
docker compose up -d
cd backend && npm test
```

Variables optionnelles : `TEST_DATABASE_URL`, `TEST_REDIS_URL` (défaut : base
`coeurvrai_test` du docker-compose, Redis base 15).

### Scripts utiles

| Dossier | Commande | Effet |
|---|---|---|
| backend | `npm run dev` | API avec rechargement à chaud (tsx) |
| backend | `npm run build && npm start` | Build et lancement production |
| backend | `npm run typecheck` | Vérification TypeScript |
| backend | `npm test` | Tests d'intégration (Vitest) |
| backend | `npm run jobs:cleanup` | Lance les purges RGPD immédiatement |
| frontend | `npm run dev` / `build` / `start` | Next.js |
| frontend | `npm run lint` / `typecheck` | ESLint / TypeScript |

---

## Pages légales

| Route | Contenu |
|---|---|
| `/legal/cgu` | Éditeur, inscription, tolérance zéro (prostitution, outing, transphobie), modération et recours (DSA), abonnement, rétractation, résiliation |
| `/legal/politique-confidentialite` | Données sensibles (art. 9), bases légales, consentement, sous-traitants et transferts, durées de conservation, droits RGPD |
| `/legal/charte-communaute` | Raison d'être, attentes envers les hommes et les femmes trans, tolérance zéro détaillée, conseils de sécurité |

Avant la mise en ligne :

1. compléter les valeurs entre crochets dans `frontend/lib/legal.ts` (raison sociale, RCS, hébergeur, médiateur…) ;
2. faire relire les trois textes par un·e juriste ;
3. à chaque modification des textes, mettre à jour **ensemble** `LEGAL_VERSION`
   (`frontend/lib/legal.ts`) et `TERMS_VERSION` (`backend/src/models/types.ts`).

## Prochaines étapes

- Abonnements premium Stripe (Checkout + webhook `STRIPE_WEBHOOK_SECRET`)
- Upload de photos (stockage S3 + modération d'images) — les photos sont aujourd'hui des URL
- Vérification d'e-mail et réinitialisation de mot de passe
- Jeton en cookie `httpOnly` au lieu du `localStorage`
- Interface web de modération
- Tests automatisés (Vitest + Supertest) et CI
- Envoi réel des e-mails (préavis d'inactivité, `sendInactivityNotice` dans `jobs/cleanup.ts`)
- Empreinte des e-mails bannis conservée 3 ans (promise par la politique de confidentialité)
- Écran d'édition du profil (l'API `PUT /api/profiles/me` existe) et demande de nouvelle
  acceptation à la connexion quand `TERMS_VERSION` change (l'API existe, la bannière est
  dans Paramètres)
