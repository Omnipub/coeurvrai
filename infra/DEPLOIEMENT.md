# Mise en production de Cœur Vrai — procédure pas à pas

Ce document s'adresse à Sylvain, le jour de l'achat. Suivez les étapes **dans l'ordre**.
Comptez environ une heure, hors délai de propagation DNS.

> **Avant de commencer**, ouvrez votre gestionnaire de mots de passe : vous allez y
> enregistrer plusieurs secrets. Deux sont **vitaux** :
>
> - **`RESTIC_PASSWORD`** : **sans lui, les sauvegardes sont illisibles et irrécupérables.**
> - **`ENCRYPTION_KEYS`** : **sans elle, les messages des membres et leurs adresses IP sont illisibles.**
>
> Ces deux valeurs ne doivent exister qu'à deux endroits : sur le serveur et dans votre
> gestionnaire de mots de passe. Jamais dans un e-mail, un document partagé ou Git.

---

## Vue d'ensemble

```
Internet ──► Caddy (HTTPS, ports 80/443) ──► site Next.js
                     │                   └──► API (Express + chat temps réel)
                     │                              │  réseau interne, sans accès Internet
                     │                              ├──► PostgreSQL 15
                     │                              └──► Redis
                     │
OVH Object Storage (France) : bucket « photos » (privé) + bucket « sauvegardes » (chiffrées)
Brevo (France) : envoi des e-mails
```

Tout tourne sur **un seul VPS OVHcloud** avec Docker Compose. Le code est construit par
GitHub Actions sous forme d'images, sans aucune donnée ni aucun secret.

---

## Étape 1 — Commandes chez OVHcloud (environ 15 minutes)

### 1.1 Le serveur

1. Commandez un **VPS-3** (6 vCores, 12 Go de RAM, 100 Go NVMe).
2. Choisissez un **datacenter en France** : **Gravelines (GRA)** ou **Strasbourg (SBG)**.
3. Système : **Ubuntu 24.04 LTS**.
4. Ajoutez votre **clé SSH publique** au moment de la commande (fichier `~/.ssh/id_ed25519.pub`
   sur votre ordinateur). Si vous n'en avez pas, créez-en une avec `ssh-keygen -t ed25519`.
5. Notez l'**adresse IPv4** et l'**adresse IPv6** du serveur (e-mail de livraison).

### 1.2 Le stockage objet (photos et sauvegardes)

Dans l'espace client OVH : **Public Cloud** › votre projet › **Object Storage** :

1. Créez un **conteneur S3** nommé **`coeurvrai-photos`** :
   - région : **la même que le VPS** (GRA ou SBG) ;
   - accès : **privé**. Ne jamais le rendre public.
2. Créez un second conteneur S3, **`coeurvrai-sauvegardes`**, lui aussi **privé**, dans la même
   région. Activez la **gestion des versions** (*versioning*) si elle est proposée : une
   sauvegarde effacée par erreur, ou par un attaquant, reste alors récupérable.
3. Créez **trois utilisateurs S3**, chacun avec des droits limités :

   | Utilisateur | Droits | Variables de `.env.production` |
   |---|---|---|
   | `coeurvrai-app` | lecture et écriture sur `coeurvrai-photos` **uniquement** | `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` |
   | `coeurvrai-backup` | lecture et écriture sur `coeurvrai-sauvegardes` **uniquement** | `BACKUP_S3_ACCESS_KEY_ID`, `BACKUP_S3_SECRET_ACCESS_KEY` |
   | `coeurvrai-backup-photos` | **lecture seule** sur `coeurvrai-photos` | `PHOTOS_BACKUP_ACCESS_KEY_ID`, `PHOTOS_BACKUP_SECRET_ACCESS_KEY` |

   Pourquoi trois ? Si l'application était compromise, sa clé ne permettrait **ni de lire
   ni d'effacer les sauvegardes**.
4. Notez le **point d'accès S3** de la région, par exemple `https://s3.gra.io.cloud.ovh.net`.

> Coût : le VPS et l'Object Storage sont facturés au mois. Vérifiez les tarifs affichés
> par OVH au moment de la commande.

---

## Étape 2 — Brevo (e-mails), environ 10 minutes

1. Créez un compte Brevo (offre gratuite suffisante au démarrage).
2. **Expéditeurs et domaines** › ajoutez le domaine **`coeurvrai.com`**. Brevo affiche les
   enregistrements DNS à créer (code de vérification et **DKIM**) : gardez cette page ouverte
   pour l'étape 3.
3. **SMTP et API** › créez une **clé SMTP**. Notez l'**identifiant SMTP** (de la forme
   `xxxxxxx@smtp-brevo.com`) et la **clé**.
4. Composez la variable `SMTP_URL` ainsi, en remplaçant le `@` de l'identifiant par `%40` :
   ```
   smtp://xxxxxxx%40smtp-brevo.com:CLE_SMTP@smtp-relay.brevo.com:587
   ```

---

## Étape 3 — Enregistrements DNS chez OVH, environ 15 minutes

Dans l'espace client : **Noms de domaine** › chaque domaine › **Zone DNS**.

### 3.1 Les 4 domaines pointent vers le VPS

Pour **chacun** des domaines `coeurvrai.com`, `coeur-vrai.com`, `coeurvrai.fr` et `coeur-vrai.fr` :

| Type | Sous-domaine | Valeur |
|---|---|---|
| A | *(vide)* | IPv4 du VPS |
| A | `www` | IPv4 du VPS |
| AAAA | *(vide)* | IPv6 du VPS |
| AAAA | `www` | IPv6 du VPS |
| CAA | *(vide)* | `0 issue "letsencrypt.org"` |

Supprimez les anciens enregistrements A et AAAA (page parking d'OVH) s'il en existe.
L'enregistrement CAA indique que seul Let's Encrypt peut émettre des certificats pour ces domaines.

Le serveur se chargera ensuite de tout : `coeurvrai.com` affiche le site, et les sept autres
adresses (`www.` et les domaines secondaires) **redirigent en 301** vers `https://coeurvrai.com`,
en conservant le chemin.

### 3.2 E-mails de `coeurvrai.com` (Brevo)

| Type | Sous-domaine | Valeur |
|---|---|---|
| TXT | *(vide)* | `v=spf1 include:spf.brevo.com ~all` |
| TXT (ou CNAME) | indiqué par Brevo | **clé DKIM fournie par Brevo** |
| TXT | indiqué par Brevo | code de vérification Brevo |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@coeurvrai.com; fo=1` |

**DMARC en deux temps** : laissez `p=none` (observation) pendant **2 à 4 semaines**, vérifiez
dans Brevo que les e-mails sont bien authentifiés (SPF et DKIM « OK »), puis passez à :

```
v=DMARC1; p=quarantine; rua=mailto:dmarc@coeurvrai.com; fo=1
```

> **Recevoir des e-mails** (contact@, dpo@, moderation@…) : Brevo n'en reçoit pas. Il faut
> un service de messagerie (par exemple une offre e-mail OVH), qui fournira ses propres
> enregistrements **MX**. Si une messagerie OVH est utilisée, ajoutez `include:mx.ovh.com`
> dans l'enregistrement SPF ci-dessus.

### 3.3 Les domaines qui n'envoient pas d'e-mails

Pour `coeur-vrai.com`, `coeurvrai.fr` et `coeur-vrai.fr`, empêchez qu'on usurpe leur nom :

| Type | Sous-domaine | Valeur |
|---|---|---|
| TXT | *(vide)* | `v=spf1 -all` |
| TXT | `_dmarc` | `v=DMARC1; p=reject` |

Vérification, depuis votre ordinateur, après quelques minutes :
`dig +short coeurvrai.com` doit afficher l'adresse IPv4 du VPS.

---

## Étape 4 — Préparer le serveur, environ 10 minutes

Depuis votre ordinateur, dans le dossier du dépôt `coeurvrai` :

```bash
# 1. Envoyer le script de durcissement (OVH crée l'utilisateur « ubuntu »)
scp infra/setup-vps.sh ubuntu@IP_DU_VPS:/tmp/

# 2. Le lancer (il demande de choisir le mot de passe sudo du compte « deploy »)
ssh ubuntu@IP_DU_VPS 'sudo bash /tmp/setup-vps.sh'
```

Le script :

- crée l'utilisateur `deploy` et interdit la connexion SSH par mot de passe et en `root` ;
- active le pare-feu (seuls SSH, 80 et 443 sont ouverts), fail2ban et les mises à jour de
  sécurité automatiques ;
- installe Docker et règle l'heure (Europe/Paris) ;
- ajoute 2 Go de swap.

**Sans fermer la première fenêtre**, vérifiez dans un **nouveau terminal** que vous pouvez
vous connecter :

```bash
ssh deploy@IP_DU_VPS
```

Si cela ne fonctionne pas, revenez dans la première fenêtre pour corriger : ne vous
déconnectez pas avant d'avoir réussi.

---

## Étape 5 — Générer les secrets, environ 10 minutes

```bash
# Depuis votre ordinateur : envoyer le modèle et le générateur
ssh deploy@IP_DU_VPS 'mkdir -p /opt/coeurvrai/infra'
scp .env.production.example deploy@IP_DU_VPS:/opt/coeurvrai/
scp infra/generate-secrets.sh deploy@IP_DU_VPS:/opt/coeurvrai/infra/

# Sur le serveur
ssh deploy@IP_DU_VPS
cd /opt/coeurvrai
bash infra/generate-secrets.sh          # crée .env.production (droits 600)
```

1. **Copiez immédiatement** `RESTIC_PASSWORD` et `ENCRYPTION_KEYS` dans votre gestionnaire
   de mots de passe (`grep -E '^(RESTIC_PASSWORD|ENCRYPTION_KEYS)=' .env.production`).
2. Complétez les valeurs `<à renseigner>` avec `nano .env.production` :
   - `ACME_EMAIL` : votre adresse (avertissements Let's Encrypt) ;
   - `SMTP_URL` : voir l'étape 2 ;
   - les **clés S3** des trois utilisateurs de l'étape 1.2 ;
   - `S3_ENDPOINT`, `S3_PUBLIC_ORIGIN`, `RESTIC_REPOSITORY` : remplacez `gra` par `sbg` si le
     VPS est à Strasbourg ;
   - `ALERT_EMAIL_TO` : l'adresse qui recevra les alertes (sauvegarde en échec, disque plein) ;
   - `APP_VERSION` : laissez la valeur, le premier déploiement la remplit.
3. Vérifiez les droits : `ls -l .env.production` doit afficher `-rw-------  deploy deploy`.

---

## Étape 6 — Brancher le déploiement automatique, environ 10 minutes

### 6.1 Une clé SSH réservée à GitHub

Sur **votre ordinateur** :

```bash
ssh-keygen -t ed25519 -N "" -C "github-deploy-coeurvrai" -f ~/.ssh/coeurvrai_deploy
ssh-copy-id -i ~/.ssh/coeurvrai_deploy.pub deploy@IP_DU_VPS
ssh-keyscan -H IP_DU_VPS > /tmp/known_hosts_vps       # empreinte du serveur
```

### 6.2 Secrets et variable dans GitHub

Dans le dépôt **Omnipub/coeurvrai** › **Settings** :

1. **Environments** › **New environment** › `production`. Cochez **Required reviewers** et
   ajoutez-vous : chaque déploiement attendra votre validation.
2. **Secrets and variables** › **Actions** › **Secrets** :

   | Nom | Valeur |
   |---|---|
   | `VPS_HOST` | adresse IPv4 du VPS |
   | `VPS_SSH_PORT` | `22` (ou le port choisi au lancement de setup-vps.sh) |
   | `VPS_SSH_KEY` | contenu de `~/.ssh/coeurvrai_deploy` (la clé **privée**) |
   | `VPS_SSH_KNOWN_HOSTS` | contenu de `/tmp/known_hosts_vps` |

3. **Variables** › `DEPLOY_ENABLED` = `true`.

Tant que cette variable et ces secrets n'existent pas, le workflow de déploiement **ne peut
rien faire**. C'est voulu.

---

## Étape 7 — Premier déploiement, environ 5 minutes

1. Vérifiez que la CI est verte sur `main` (onglet **Actions** › **CI**).
2. Créez la version : **Releases** › **Draft a new release** › tag **`v1.0.0`** › **Publish**.
3. Onglet **Actions** › **Déploiement production** › validez le déploiement (*Review deployments*).
4. Le workflow construit les images, les envoie sur le serveur, joue les migrations de la base,
   démarre le site et vérifie qu'il répond. En cas d'échec, il remet en service la version
   précédente.
5. Ouvrez **https://coeurvrai.com** : le cadenas doit apparaître, avec un certificat Let's Encrypt.

Vérifiez sur le serveur que **seul Caddy expose des ports** :

```bash
ssh deploy@IP_DU_VPS
docker ps --format '{{.Names}}  {{.Ports}}'        # seul « caddy » a des ports 0.0.0.0:80/443
sudo ss -tlnp | grep -v -E ':(22|80|443)\b'         # ne doit rien afficher d'exposé à Internet
```

---

## Étape 8 — Premier test de restauration (obligatoire), environ 5 minutes

```bash
ssh deploy@IP_DU_VPS
cd /opt/coeurvrai
alias dc='docker compose --project-name coeurvrai --env-file .env.production -f current/docker-compose.prod.yml'

dc exec backup backup-db.sh        # première sauvegarde, sans attendre 3 h du matin
dc exec backup restore-test.sh     # restaure dans une base temporaire et compare les comptages
```

La dernière ligne doit être : **`TEST DE RESTAURATION RÉUSSI : les comptages correspondent.`**
Ce test se relance ensuite tout seul le 1er de chaque mois ; en cas d'échec, vous recevez un e-mail.

Testez aussi l'alerte : `dc exec backup bash -c '. /usr/local/bin/lib.sh; notify "Test" "Alerte de test"'`
doit vous envoyer un e-mail.

---

## Checklist finale — avant d'ouvrir aux membres

**Accès et réseau**
- [ ] `https://coeurvrai.com` s'affiche avec un certificat valide.
- [ ] `http://coeurvrai.com`, `www.coeurvrai.com`, `coeur-vrai.com`, `coeurvrai.fr`, `coeur-vrai.fr` et leurs `www.` mènent tous à `https://coeurvrai.com`.
- [ ] Connexion SSH en `root` refusée ; connexion par mot de passe refusée.
- [ ] Seul Caddy expose des ports (`docker ps`).
- [ ] [securityheaders.com](https://securityheaders.com) donne au moins la note **A** pour `https://coeurvrai.com`.

**Données**
- [ ] `RESTIC_PASSWORD` et `ENCRYPTION_KEYS` sont dans le gestionnaire de mots de passe.
- [ ] Le test de restauration de l'étape 8 a réussi.
- [ ] L'e-mail d'alerte de test est arrivé.
- [ ] Les buckets `coeurvrai-photos` et `coeurvrai-sauvegardes` sont **privés** (ouvrir l'URL d'une photo sans signature doit renvoyer une erreur 403).

**Fonctionnel** (avec deux comptes de test, supprimés ensuite)
- [ ] Inscription et e-mail de confirmation reçu (pas dans les indésirables).
- [ ] Envoi d'une photo, découverte, match, chat en temps réel, signalement.
- [ ] Suppression des deux comptes de test (Paramètres › Supprimer mon compte).

**Surveillance**
- [ ] Surveillance de disponibilité externe en place (voir `EXPLOITATION.md`, « Surveillance »).
- [ ] DMARC en `p=none` : rappel noté dans l'agenda pour passer en `p=quarantine` dans 3 semaines.

**Juridique**
- [ ] Mentions légales complétées (`frontend/lib/legal.ts` : raison sociale, hébergeur OVH…).
- [ ] Registre des traitements RGPD à jour (hébergeur OVH, Brevo, Onfido).
- [ ] Contrats de sous-traitance (DPA) acceptés chez OVH, Brevo et Onfido.

Les gestes du quotidien (nouvelle version, retour en arrière, restauration, incident) sont
décrits dans **[EXPLOITATION.md](EXPLOITATION.md)**.
