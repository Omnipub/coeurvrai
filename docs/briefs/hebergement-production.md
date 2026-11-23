# Brief Claude Code — Préparation de l'hébergement de production Cœur Vrai

> À coller dans Claude Code, dans le dépôt `Omnipub/coeurvrai`.
> **Rien n'est encore acheté** (ni VPS, ni stockage). Ton travail : tout préparer dans le dépôt pour que la mise en production se fasse en moins d'une heure le jour de l'achat, et pouvoir tout tester **en local** avant.

---

## 1. Contexte et décisions déjà prises (ne pas les remettre en cause)

- **Site** : Cœur Vrai, un site de rencontre (Next.js 14 + Express/Node 20 + PostgreSQL 15 + Redis + Socket.io).
- **Données sensibles au sens de l'article 9 du RGPD** (identité de genre, orientation). Une fuite serait grave pour les membres. **La sécurité passe avant le confort.**
- **Domaine principal : `coeurvrai.com`**. Les domaines `coeur-vrai.com`, `coeurvrai.fr` et `coeur-vrai.fr` redirigent en **301** vers `https://coeurvrai.com` (chemin conservé).
- **Hébergement retenu (option économique et sécurisée)** :
  - **un seul VPS OVHcloud VPS-3** (6 vCores, 12 Go RAM, 100 Go NVMe), **Ubuntu 24.04 LTS**, datacenter **en France** (Gravelines ou Strasbourg) ;
  - tout le site tourne dessus en **Docker Compose** : reverse proxy, frontend, backend, PostgreSQL, Redis ;
  - **OVHcloud Object Storage** (compatible S3, région France) pour : (a) les **photos** dans un bucket privé, (b) les **sauvegardes chiffrées** dans un bucket séparé.
- **Plus tard (phase 2)** : la base migrera vers PostgreSQL managé OVH (plan Production). Le code doit donc lire la base **uniquement via `DATABASE_URL`**, TLS compris, pour que la migration se limite à changer cette variable.
- **Aucune donnée personnelle de production chez un prestataire américain** : pas de Vercel ni de Render en production, pas de Sentry avec données personnelles. Render reste l'environnement de **staging, avec données fictives uniquement**.
- **E-mails transactionnels** : **Brevo** (SMTP, société française), depuis `noreply@coeurvrai.com`.

---

## 2. Livrables attendus dans le dépôt

### 2.1 Conteneurs et orchestration
- `docker-compose.prod.yml` avec ces services :
  - **caddy** : reverse proxy, HTTPS automatique Let's Encrypt, HTTP/2, WebSocket (Socket.io) ;
  - **frontend** : Next.js en mode `output: 'standalone'`, image multi-étapes, utilisateur non-root ;
  - **backend** : Express + Socket.io, image multi-étapes, utilisateur non-root ;
  - **postgres** : PostgreSQL 15, volume nommé, **aucun port publié sur l'hôte** ;
  - **redis** : mot de passe obligatoire, **aucun port publié**, persistance AOF ;
  - **backup** : conteneur de sauvegarde (voir 2.4).
- Deux réseaux Docker : `web` (caddy ↔ frontend/backend) et `internal` (backend ↔ postgres/redis, `internal: true`). PostgreSQL et Redis **ne sont jamais joignables depuis Internet**.
- `restart: unless-stopped`, healthchecks sur chaque service, limites mémoire raisonnables pour 12 Go.
- Images figées sur une version précise (pas de `latest`), rotation des logs Docker (`max-size`, `max-file`).
- `docker-compose.local.yml` (ou profil) pour **tester toute la pile de prod en local**, avec certificats auto-signés ou `localhost`.

### 2.2 Caddyfile
- `coeurvrai.com` vers les services ; `www.coeurvrai.com`, `coeur-vrai.com`, `www.coeur-vrai.com`, `coeurvrai.fr`, `www.coeurvrai.fr`, `coeur-vrai.fr`, `www.coeur-vrai.fr` → **301** vers `https://coeurvrai.com{uri}`.
- En-têtes de sécurité : HSTS (`max-age=31536000; includeSubDomains`, sans `preload` au début), `Content-Security-Policy` stricte et adaptée à Next.js et aux domaines réellement utilisés (Onfido, Brevo, Object Storage), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` restrictive, `X-Frame-Options: DENY`. Supprimer l'en-tête `Server`.
- Compression gzip/zstd. Les fichiers statiques Next.js en cache long.
- Logs d'accès **sans query string** (risque de données personnelles dans les URL), avec rotation.

### 2.3 Durcissement du serveur — `infra/setup-vps.sh`
Script idempotent, lancé une fois sur le VPS neuf, commenté ligne par ligne en français :
- création d'un utilisateur `deploy` avec sudo ; **connexion SSH par clé uniquement**, `root` interdit en SSH, mot de passe désactivé ;
- pare-feu **UFW** : seuls 22, 80 et 443 ouverts (option : port SSH personnalisé) ;
- **fail2ban** pour SSH ;
- **unattended-upgrades** pour les mises à jour de sécurité automatiques ;
- installation de Docker Engine et du plugin Compose depuis le dépôt officiel ;
- fuseau `Europe/Paris`, NTP actif, swap de 2 Go ;
- rappel en fin de script : vérifier que Docker ne contourne pas UFW pour des ports publiés (seul Caddy publie 80/443).

### 2.4 Sauvegardes — le point le plus important
- Outil : **restic**, pour le chiffrement côté client, la déduplication et la rétention, vers le bucket **sauvegardes** de l'OVH Object Storage (S3).
- **Chaque nuit à 3 h** : `pg_dump` au format custom, puis envoi restic. Les photos sont sauvegardées par réplication vers le bucket de sauvegarde, ou par snapshot hebdomadaire.
- **Rétention** : 30 sauvegardes quotidiennes et 6 mensuelles (`restic forget --prune`).
- Le **mot de passe restic** est conservé hors du serveur, dans le gestionnaire de mots de passe de Sylvain. **Le documenter en gras** : sans lui, les sauvegardes sont illisibles.
- `restic check` hebdomadaire.
- **Alerte si une sauvegarde échoue** : e-mail via Brevo, ou ping vers un service de surveillance européen, par exemple Healthchecks.io auto-hébergé. Choisis la solution la plus simple et documente-la.
- Script `infra/restore.sh` : restauration complète de la base (et des photos) à partir d'une date donnée.
- **Test de restauration obligatoire** : script ou procédure qui restaure la dernière sauvegarde dans une base temporaire et vérifie le nombre de lignes des tables principales. À exécuter en local avant la mise en ligne, puis une fois par mois en production.

### 2.5 Photos et fichiers des membres
- Stockage dans un **bucket privé** OVH Object Storage, sans aucune URL publique permanente.
- Accès uniquement par **URL signées à durée courte** (5 à 15 min), générées par le backend après vérification des droits (photos floutées pour les hommes non abonnés, côté serveur).
- **Suppression systématique des métadonnées EXIF** à l'envoi (localisation GPS en particulier), redimensionnement et conversion en WebP côté serveur (`sharp`).
- Les **selfies de vérification Onfido** ne sont pas conservés au-delà de ce qu'exige la vérification. Documenter la durée.
- Suppression réelle des fichiers dans le bucket lors de la suppression d'un compte (lien avec la fonctionnalité de suppression de compte).
- En local et en staging : utiliser MinIO, ou un bucket de test, avec la même interface S3.

### 2.6 Base de données
- Accès **uniquement via `DATABASE_URL`**, avec `?sslmode=require` prévu pour la phase 2 (PostgreSQL managé).
- Utilisateur applicatif **sans droits superuser** ; les migrations passent par un utilisateur dédié ou une étape séparée.
- Migrations versionnées, jouées automatiquement au déploiement avant le démarrage du backend.
- Chiffrement applicatif (AES-256-GCM, clé dans les secrets) des champs les plus sensibles qui ne servent pas aux filtres de recherche, si ce n'est pas déjà fait. Liste à proposer et à justifier.

### 2.7 Secrets et configuration
- `.env.production.example` qui liste **toutes** les variables, avec description et sans valeur réelle.
- Le vrai `.env.production` n'est **jamais** commité (`.gitignore` vérifié) : il est créé sur le serveur, en `chmod 600`, propriétaire `deploy`.
- Secrets forts générés par un script (`infra/generate-secrets.sh`) : JWT, mots de passe PostgreSQL et Redis, clé de chiffrement applicatif, mot de passe restic.

### 2.8 Déploiement continu — GitHub Actions
- À chaque push sur `main` : lint, tests (les 23 tests serveur et plus), build des images.
- Images poussées vers **GitHub Container Registry**. Elles ne contiennent aucune donnée ni aucun secret.
- Déploiement **manuel déclenché** (`workflow_dispatch`) ou sur tag `v*` : connexion SSH au VPS avec une clé dédiée stockée dans GitHub Secrets, `docker compose pull`, migrations, `up -d`, healthcheck, et **retour automatique à la version précédente** si le healthcheck échoue.
- Le déploiement en production ne se déclenche **jamais** automatiquement sur un simple push.

### 2.9 Supervision et journaux
- Endpoint `/health` (backend), qui vérifie la connexion à PostgreSQL et à Redis.
- Surveillance de disponibilité externe : un service européen, ou un deuxième petit outil documenté. Alerte par e-mail.
- Alerte disque au-delà de 80 % (script cron et e-mail).
- **Journaux applicatifs sans données personnelles** : pas de contenu de messages, pas d'e-mails ni de mots de passe, identifiants pseudonymisés. Conservation des IP de connexion pendant 1 an, conformément aux pages légales déjà intégrées. Rotation automatique.

### 2.10 E-mails
- Envoi par SMTP Brevo, configuré par variables d'environnement.
- Documenter les enregistrements DNS à créer chez OVH : **SPF, DKIM (fourni par Brevo), DMARC** (`p=quarantine` après une période d'observation en `p=none`).

### 2.11 Sécurité applicative (vérifier, compléter si besoin)
- Rate limiting (connexion, inscription, envoi de messages, signalements) adossé à Redis.
- Cookies `Secure`, `HttpOnly`, `SameSite=Lax` ou `Strict` ; protection CSRF si des cookies portent la session.
- Validation stricte des entrées et des fichiers envoyés (type MIME réel, taille maximale).
- `npm audit` dans la CI ; Dependabot activé.
- Le port Socket.io passe par Caddy (WSS) et n'est pas exposé directement.

---

## 3. Documentation à produire

1. **`infra/DEPLOIEMENT.md`** : la procédure **pas à pas, en français, pour Sylvain**, le jour de l'achat :
   - ce qu'il faut commander chez OVH (VPS-3 en France, Object Storage, 2 buckets) ;
   - les enregistrements DNS à créer pour les 4 domaines (A et AAAA vers le VPS, MX si besoin, SPF, DKIM, DMARC) ;
   - les commandes à lancer, dans l'ordre (setup-vps, génération des secrets, premier déploiement, premier test de restauration) ;
   - une checklist finale « avant d'ouvrir aux membres ».
2. **`infra/EXPLOITATION.md`** : les gestes courants (déployer une nouvelle version, revenir en arrière, restaurer une sauvegarde, lire les journaux, renouveler un secret, que faire en cas d'incident ou de fuite suspectée, notification CNIL sous 72 h).
3. **`infra/MIGRATION-BDD-MANAGEE.md`** : la procédure pour passer à PostgreSQL managé OVH (plan Production) en phase 2, avec un temps d'arrêt minimal.

---

## 4. Critères d'acceptation (à valider en local avant de dire « terminé »)

- [ ] `docker compose -f docker-compose.prod.yml` (variante locale) démarre toute la pile ; inscription, connexion, découverte, match, chat temps réel, signalement et envoi de photo fonctionnent.
- [ ] Depuis l'extérieur des conteneurs, PostgreSQL et Redis sont injoignables (le prouver).
- [ ] Une photo envoyée n'a plus de métadonnées EXIF (le prouver) et n'est accessible que par URL signée, expirée ensuite.
- [ ] Une sauvegarde chiffrée part vers un bucket S3 de test (MinIO) ; **une restauration complète dans une base vide réussit** et les comptages correspondent.
- [ ] Les redirections 301 des 3 domaines secondaires sont testées (fichier hosts ou `curl --resolve`).
- [ ] Les en-têtes de sécurité sont présents (sortie de `curl -I` jointe).
- [ ] La CI passe ; le workflow de déploiement est prêt, sans pouvoir se déclencher tant que les secrets du VPS ne sont pas renseignés.
- [ ] Aucun secret n'est présent dans l'historique Git (`gitleaks` ou équivalent lancé).
- [ ] Les 3 documents de la section 3 sont rédigés.

---

## 5. Méthode de travail

- Travaille sur une branche `infra/production`, en commits petits et lisibles ; ouvre une PR à la fin, avec un résumé.
- **N'achète rien, ne crée aucun compte, ne contacte aucun service externe payant.** Si un choix technique a un coût ou un impact juridique, arrête-toi et pose la question.
- Explique tes choix en français, simplement : Sylvain gère le projet et n'est pas administrateur système.
- Si quelque chose dans ce brief te semble dangereux ou contradictoire avec le code existant, signale-le avant d'agir.
