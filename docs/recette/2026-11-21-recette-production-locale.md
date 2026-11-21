# Recette locale de la pile de production — 21 novembre 2026

Recette réalisée sur la branche `infra/production`, avec `docker-compose.prod.yml` et
`docker-compose.local.yml` (mêmes images, même Caddyfile, mêmes réseaux qu'en production ;
S3 = SeaweedFS, e-mails = Mailpit, certificats émis par l'autorité locale de Caddy).
Les vrais noms de domaine sont utilisés (`curl --resolve`, règles de résolution du navigateur).
Toutes les valeurs visibles ci-dessous sont **factices** (pile locale).

## Synthèse des critères d'acceptation

| Critère du brief | Résultat |
|---|---|
| La pile démarre ; inscription, connexion, découverte, match, chat temps réel, signalement et envoi de photo fonctionnent | ✅ section 1 |
| PostgreSQL et Redis injoignables depuis l'extérieur des conteneurs | ✅ section 2 |
| Photo sans métadonnées EXIF, accessible uniquement par URL signée, expirée ensuite | ✅ sections 1 et 3 |
| Sauvegarde chiffrée vers un bucket S3 de test ; restauration complète dans une base vide, comptages identiques | ✅ section 4 |
| Redirections 301 des domaines secondaires | ✅ section 5 |
| En-têtes de sécurité présents (`curl -I`) | ✅ section 5 |
| CI prête ; déploiement impossible sans les secrets du VPS | ✅ workflows validés par actionlint ; garde `DEPLOY_ENABLED` + vérification des secrets |
| Aucun secret dans l'historique Git (gitleaks) | ✅ section 7 |
| Déploiement et retour automatique en arrière (bonus) | ✅ section 6 |

Tests automatisés : 59 tests backend (Vitest, PostgreSQL et Redis réels), lint, types et build du frontend, audit SEO, shellcheck et actionlint.

## 1. Parcours complet dans le navigateur (https://coeurvrai.com, à travers Caddy)

```
OK    inscription de deux membres via https://coeurvrai.com
OK    cookie de session : __Host-cv_session, HttpOnly=true, Secure=true, SameSite=Strict
OK    e-mail de vérification reçu (Mailpit)
OK    déconnexion puis connexion
OK    profil mis à jour (photos réservées aux matchs)
OK    photo envoyée, affichée par URL signée (10 min)
OK    photo stockée : webp 1600x1200, EXIF=absent, GPS=absent
OK    même photo sans signature : HTTP 403 (bucket privé)
OK    découverte : photo de Léa floutée avant le match (version floue signée côté serveur)
OK    match réciproque
OK    chat temps réel dans les deux sens (Socket.io à travers Caddy)
OK    après le match : photo nette signée
OK    signalement envoyé (la personne est bloquée)
OK    contrôle d'origine actif (requête légitime du site : HTTP 400)
```

## 2. PostgreSQL et Redis injoignables depuis l'extérieur

```
$ docker ps --format "{{.Names}}  {{.Ports}}"
coeurvrai-backend-1  3001/tcp
coeurvrai-backup-1  
coeurvrai-caddy-1  127.0.0.1:80->80/tcp, 127.0.0.1:443->443/tcp, 443/udp, 2019/tcp
coeurvrai-frontend-1  3000/tcp
coeurvrai-mailpit-1  1025/tcp, 1110/tcp, 127.0.0.1:8025->8025/tcp
coeurvrai-postgres-1  5432/tcp
coeurvrai-redis-1  6379/tcp
coeurvrai-seaweedfs-1  7333/tcp, 8080/tcp, 8333/tcp, 8888/tcp, 9333/tcp, 18080/tcp, 18888/tcp, 19333/tcp

# Ports PostgreSQL/Redis publiés sur l'hôte (attendu : aucun)
coeurvrai-postgres-1 : {}
coeurvrai-redis-1 : {}

# Depuis l'hôte (= « Internet » pour le serveur) :
127.0.0.1:5432 refusé
127.0.0.1:6379 refusé
192.0.2.2:5432 refusé
192.0.2.2:6379 refusé

# Réseau « internal » : internal=true (aucune route vers l'extérieur)
coeurvrai_internal internal=true

# Depuis un conteneur du réseau « web » (comme Caddy ou le frontend) :
postgres:5432 - no response
nc: bad address 'redis'
postgres : nom introuvable depuis le réseau web
redis : nom introuvable depuis le réseau web

# Contrôle positif : depuis le backend (réseaux web + internal), PostgreSQL et Redis répondent
postgres:5432 joignable depuis le backend
redis:6379 joignable depuis le backend

# Le conteneur PostgreSQL n'a aucun accès à Internet :
Internet injoignable depuis postgres
wget: bad address 'example.com'

# Redis exige un mot de passe (depuis le réseau interne, sans mot de passe) :
NOAUTH Authentication required.
```

## 3. URL signée des photos : valable 10 minutes, puis refusée

```
2026-11-21T18:36:47.051Z — même URL signée (émise à 20261121T183006Z, valable 600 s) : HTTP 200 
2026-11-21T18:40:18.493Z — même URL signée (émise à 20261121T183006Z, valable 600 s) : HTTP 403 AccessDenied
```

## 4. Sauvegardes chiffrées, test de restauration, restauration complète, alertes

```
### 1. Sauvegarde chiffrée de la base (pg_dump + restic → bucket S3 de test)
2026-11-21T19:31:59+01:00 [backup-db.sh] Début de la sauvegarde de la base
2026-11-21T19:31:59+01:00 [backup-db.sh] Lignes sauvegardées : {"blocks":1,"likes":4,"matches":2,"messages":2,"photos":3,"profiles_femme_trans":5,"profiles_homme":4,"reports":1,"users":9}
no parent snapshot found, will read all files
Files:           2 new,     0 changed,     0 unmodified
Dirs:            4 new,     0 changed,     0 unmodified
Added to the repository: 31.996 KiB (10.933 KiB stored)
processed 2 files, 29.869 KiB in 0:00
snapshot ddd1e363 saved
Applying Policy: keep 30 daily, 6 monthly snapshots
keep 1 snapshots:
ID        Time                 Host        Tags        Reasons           Paths
--------------------------------------------------------------------------------------------------
ddd1e363  2026-11-21 19:31:59  coeurvrai   db          daily snapshot    /var/lib/backup/db.TvDSWV
                                                       monthly snapshot
--------------------------------------------------------------------------------------------------
1 snapshots
2026-11-21T19:32:01+01:00 [backup-db.sh] Sauvegarde de la base terminée
### Instantanés présents dans le dépôt chiffré
ID        Time                 Host        Tags        Paths
--------------------------------------------------------------------------------
ddd1e363  2026-11-21 19:31:59  coeurvrai   db          /var/lib/backup/db.TvDSWV
--------------------------------------------------------------------------------
1 snapshots
### Le bucket ne contient que des données chiffrées (aucun texte lisible)
config
data/0d/0df4dcc86c050a3d1f2614f9c5d9a98e8f7761c67a265185849d8cbe160f82d2
data/ee/eecc7de0deb81d09d38711781ea5f23c271ab2e277f22b31f82b16190e4c9ecd
index/4807108071996cd047be8ba44c4301e4035efee2d8c6c6b2dc34c36addc65506
keys/60c19ea2f69e6324c8d588744b68d6603e54aa50f71eaef8af07a3640f23e358
snapshots/ddd1e36384df64884bf24a94aa8b0802e9622ee4559d2d8cdc35d6baf6a0f4db
data/
data/0d/
0
0 occurrence de texte en clair dans un bloc de données
### 2. Test de restauration (base temporaire + comparaison des comptages)
2026-11-21T19:32:03+01:00 [restore-test.sh] Test de restauration de la sauvegarde ddd1e363 dans la base temporaire restore_test_20261121193202
restoring <Snapshot ddd1e363 of [/var/lib/backup/db.TvDSWV] at 2026-11-21 19:31:59.800185295 +0100 CET by root@coeurvrai> to /var/lib/backup/test.ANBhkp
Summary: Restored 6 files/dirs (29.869 KiB) in 0:00
2026-11-21T19:32:04+01:00 [restore-test.sh] Attendu  : {"blocks":1,"likes":4,"matches":2,"messages":2,"photos":3,"profiles_femme_trans":5,"profiles_homme":4,"reports":1,"users":9}
2026-11-21T19:32:04+01:00 [restore-test.sh] Restauré : {"blocks":1,"likes":4,"matches":2,"messages":2,"photos":3,"profiles_femme_trans":5,"profiles_homme":4,"reports":1,"users":9}
2026-11-21T19:32:04+01:00 [restore-test.sh] TEST DE RESTAURATION RÉUSSI : les comptages correspondent.
### 3. Restauration complète dans une base VIDE (restore.sh, par date)
Base vide créée : 0 table(s)
2026-11-21T19:32:23+01:00 [restore.sh] Sauvegarde retenue : ddd1e363 (db, au plus tard le 2026-11-21T23:59:59)
restoring <Snapshot ddd1e363 of [/var/lib/backup/db.TvDSWV] at 2026-11-21 19:31:59.800185295 +0100 CET by root@coeurvrai> to /var/lib/backup/restore.8ubm95
Summary: Restored 6 files/dirs (29.869 KiB) in 0:00
2026-11-21T19:32:24+01:00 [restore.sh] Restauration dans la base « restauration_complete »
2026-11-21T19:32:24+01:00 [restore.sh] Base restaurée. Comptages de la sauvegarde : {"blocks":1,"likes":4,"matches":2,"messages":2,"photos":3,"profiles_femme_trans":5,"profiles_homme":4,"reports":1,"users":9}
2026-11-21T19:32:24+01:00 [restore.sh] Relancer ensuite les migrations (droits de l'application) : voir infra/EXPLOITATION.md
Comptages dans la base restaurée :
{ "blocks" : 1, "likes" : 4, "matches" : 2, "messages" : 2, "photos" : 3, "profiles_femme_trans" : 5, "profiles_homme" : 4, "reports" : 1, "users" : 9 }
Comptages de la base de production locale au même moment :
{ "blocks" : 1, "likes" : 4, "matches" : 2, "messages" : 2, "photos" : 3, "profiles_femme_trans" : 5, "profiles_homme" : 4, "reports" : 1, "users" : 9 }
Les messages restaurés restent chiffrés (AES-256-GCM) :
enc:v1:local:AlcW0rxxI…
enc:v1:local:f7kih9nIh…
### 4. Photos : sauvegarde, suppression de tous les fichiers, restauration
2026-11-21T19:32:24+01:00 [backup-photos.sh] Début de la sauvegarde des photos
Files:           6 new,     0 changed,     0 unmodified
snapshot b6646cab saved
b6646cab  2026-11-21 19:32:25  coeurvrai   photos      weekly snapshot   /var/lib/backup/photos-miroir
2026-11-21T19:32:26+01:00 [backup-photos.sh] Sauvegarde des photos terminée
Fichiers dans le bucket photos avant : 6
Après suppression : 0
2026-11-21T19:32:27+01:00 [restore.sh] Sauvegarde retenue : b6646cab (photos, au plus tard le 2026-11-21T23:59:59)
2026-11-21T19:32:28+01:00 [restore.sh] Photos restaurées dans le bucket coeurvrai-photos
Après restauration : 6
### 5. Vérification hebdomadaire de l'intégrité (restic check)
2026-11-21T19:32:39+01:00 [check.sh] Vérification du dépôt restic
using temporary cache in /var/cache/restic/restic-check-cache-2616677724
check all packs
check snapshots, trees and blobs
no errors were found
2026-11-21T19:32:40+01:00 [check.sh] Dépôt restic intègre
### 6. Alerte en cas d'échec : stockage S3 coupé pendant une sauvegarde
2026-11-21T19:32:50+01:00 [backup-db.sh] Début de la sauvegarde de la base
2026-11-21T19:33:01+01:00 [backup-db.sh] ALERTE : Échec : envoi restic (base)
code de sortie : 1
E-mail reçu par la boîte de test (Mailpit) :
[Cœur Vrai] Échec : envoi restic (base) → alertes@example.invalid
```

## 5. Redirections 301 et en-têtes de sécurité

```
# Redirections 301 (curl --resolve vers la pile locale, chemin et paramètres conservés)
www.coeurvrai.com      → 301 https://coeurvrai.com/faq?source=test
coeur-vrai.com         → 301 https://coeurvrai.com/faq?source=test
www.coeur-vrai.com     → 301 https://coeurvrai.com/faq?source=test
coeurvrai.fr           → 301 https://coeurvrai.com/faq?source=test
www.coeurvrai.fr       → 301 https://coeurvrai.com/faq?source=test
coeur-vrai.fr          → 301 https://coeurvrai.com/faq?source=test
www.coeur-vrai.fr      → 301 https://coeurvrai.com/faq?source=test
http://coeurvrai.com   → 308 https://coeurvrai.com/securite

$ curl -sI https://coeurvrai.com/
HTTP/2 200 
alt-svc: h3=":443"; ma=2592000
cache-control: s-maxage=31536000, stale-while-revalidate
content-security-policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://sdk.onfido.com; style-src 'self' 'unsafe-inline' https://sdk.onfido.com; img-src 'self' data: blob: https://s3.coeurvrai.localhost https://*.onfido.com; font-src 'self' data: https://sdk.onfido.com; connect-src 'self' wss://coeurvrai.com https://*.onfido.com wss://*.onfido.com; media-src 'self' blob:; frame-src https://sdk.onfido.com; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests
content-type: text/html; charset=utf-8
cross-origin-opener-policy: same-origin
date: Sat, 21 Nov 2026 18:31:23 GMT
etag: "cu0zuzhm3bsf6"
permissions-policy: camera=(self "https://sdk.onfido.com"), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), browsing-topics=()
referrer-policy: strict-origin-when-cross-origin
strict-transport-security: max-age=31536000; includeSubDomains
vary: RSC, Next-Router-State-Tree, Next-Router-Prefetch, Accept-Encoding
x-content-type-options: nosniff
x-frame-options: DENY
x-nextjs-cache: HIT
content-length: 37275

$ curl -sI https://coeurvrai.com/api/auth/me
HTTP/2 401 
access-control-allow-credentials: true
access-control-expose-headers: Content-Disposition
alt-svc: h3=":443"; ma=2592000
content-security-policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://sdk.onfido.com; style-src 'self' 'unsafe-inline' https://sdk.onfido.com; img-src 'self' data: blob: https://s3.coeurvrai.localhost https://*.onfido.com; font-src 'self' data: https://sdk.onfido.com; connect-src 'self' wss://coeurvrai.com https://*.onfido.com wss://*.onfido.com; media-src 'self' blob:; frame-src https://sdk.onfido.com; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests
content-type: application/json; charset=utf-8
cross-origin-opener-policy: same-origin
cross-origin-resource-policy: same-origin
date: Sat, 21 Nov 2026 18:31:23 GMT
etag: W/"24-rTKG8DBWOshvJjSKGMBZ8X3cois"
origin-agent-cluster: ?1
permissions-policy: camera=(self "https://sdk.onfido.com"), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), browsing-topics=()
referrer-policy: strict-origin-when-cross-origin
strict-transport-security: max-age=31536000; includeSubDomains
vary: Origin
x-content-type-options: nosniff
x-dns-prefetch-control: off
x-download-options: noopen
x-frame-options: DENY
x-permitted-cross-domain-policies: none
x-robots-tag: noindex, nofollow, noarchive
x-xss-protection: 0
content-length: 36

$ curl -sI https://coeurvrai.com/_next/static/… (fichier statique)
HTTP/2 200 
cache-control: public, max-age=31536000, immutable
cache-control: public, max-age=31536000, immutable
content-encoding: zstd

# CSRF : modification depuis un autre site, avec un cookie de session (refusée)
{"error":"Origine de la requête non autorisée"}
```

## 6. Déploiement et retour automatique en arrière (`infra/deploy.sh`)

```
### Déploiement de v1
2026-11-21T18:40:57+00:00 [deploy] Déploiement de v1 (version actuelle : aucune)
2026-11-21T18:40:57+00:00 [deploy] Migrations puis démarrage
2026-11-21T18:42:09+00:00 [deploy] Version v1 en service.
code de sortie : 0
current -> v1 ; APP_VERSION=v1
### Déploiement de v2-casse (le frontend ne démarre pas) → retour automatique attendu
2026-11-21T18:42:09+00:00 [deploy] Déploiement de v2-casse (version actuelle : v1)
2026-11-21T18:42:09+00:00 [deploy] Migrations puis démarrage
 Container coeurvrai-frontend-1 Error dependency frontend failed to start
 Container coeurvrai-postgres-1 Skipped: condition "service_healthy" of service "postgres" not reached: interrupted by the unmet condition "service_healthy" of service "frontend" 
 Container coeurvrai-migrate-1 not started: condition "service_healthy" of service "postgres" not reached: interrupted by the unmet condition "service_healthy" of service "frontend" 
 Container coeurvrai-backup-1 not started: condition "service_healthy" of service "postgres" not reached: interrupted by the unmet condition "service_healthy" of service "frontend" 
 Container coeurvrai-caddy-1 not started: condition "service_healthy" of service "frontend" not met 
 Container coeurvrai-backend-1 not started: condition "service_completed_successfully" of service "migrate" not reached: interrupted by the unmet condition "service_healthy" of service "frontend" 
dependency failed to start: container coeurvrai-frontend-1 is unhealthy
2026-11-21T18:42:21+00:00 [deploy] ÉCHEC du contrôle de santé de v2-casse
2026-11-21T18:42:21+00:00 [deploy] Retour automatique à la version v1
2026-11-21T18:42:21+00:00 [deploy] Migrations puis démarrage
2026-11-21T18:43:33+00:00 [deploy] Version v1 remise en service.
code de sortie : 1
current -> v1 ; APP_VERSION=v1
Site après le retour arrière : {"status":"ok"}
coeurvrai-backend-1 coeurvrai-local/backend:v1
coeurvrai-frontend-1 coeurvrai-local/frontend:v1
```

## 7. Recherche de secrets dans l'historique Git (gitleaks 8.21.2)

```
    ░    gitleaks
6:44PM INF 20 commits scanned.
6:44PM INF scan completed in 155ms
6:44PM INF no leaks found
```

## 8. Audit des dépendances et nouvelle recette après mises à jour de sécurité

`npm audit` signalait des failles que seules des mises à jour majeures corrigent :
Next.js 14 (failles **critiques**, dont une exécution de code à distance via `/_next/image`),
sharp (failles de libvips, alors que sharp traite les fichiers envoyés par les membres) et zod.
Mises à jour effectuées : **Next.js 15.5.29 + React 19**, **sharp 0.35**, **zod 4**, **node-cron 4** ;
`postcss` et `source-map-js` forcés en version corrigée. L'API `/_next/image`, inutilisée, est
en plus désactivée.

```
backend  : npm audit --omit=dev → found 0 vulnerabilities
frontend : npm audit --omit=dev → found 0 vulnerabilities
https://coeurvrai.com/_next/image?… → 404 (désactivée)
```

Recette complète rejouée sur les images reconstruites :

```
OK    inscription de deux membres via https://coeurvrai.com
OK    cookie de session : __Host-cv_session, HttpOnly=true, Secure=true, SameSite=Strict
OK    e-mail de vérification reçu (Mailpit)
OK    déconnexion puis connexion
OK    profil mis à jour (photos réservées aux matchs)
OK    photo envoyée, affichée par URL signée (10 min)
OK    photo stockée : webp 1600x1200, EXIF=absent, GPS=absent
OK    même photo sans signature : HTTP 403 (bucket privé)
OK    découverte : photo de Léa floutée avant le match (version floue signée côté serveur)
OK    match réciproque
OK    chat temps réel dans les deux sens (Socket.io à travers Caddy)
OK    après le match : photo nette signée
OK    signalement envoyé (la personne est bloquée)
OK    contrôle d'origine actif (requête légitime du site : HTTP 400)
```
