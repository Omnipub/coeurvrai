# Phase 2 — Passer à PostgreSQL managé OVH (plan Production)

Aujourd'hui, PostgreSQL tourne dans un conteneur sur le VPS. En phase 2, la base passe sur
le service **PostgreSQL managé d'OVHcloud (plan Production)** : haute disponibilité,
sauvegardes automatiques et mises à jour assurées par OVH.

Le code est prêt : l'application ne lit la base **que par `DATABASE_URL`**. La migration
consiste donc à **copier les données** puis à **changer deux variables**. Temps d'arrêt
prévu : **10 à 20 minutes** pour une base de quelques Go, à programmer en heure creuse.

---

## 1. Préparation (sans coupure, la veille)

1. **Commander** chez OVH : **Public Cloud** › **Databases** › **PostgreSQL 15**, plan
   **Production**, **même région que le VPS** (GRA ou SBG).
2. **Réseau** : dans la base managée, onglet *Authorized IPs*, n'autoriser **que l'adresse IP
   du VPS**. Si possible, raccorder la base et le VPS au même réseau privé (vRack).
3. **Utilisateurs** : créer `coeurvrai_owner` et `coeurvrai_app` (onglet *Users*), et la base
   `coeurvrai`, propriété de `coeurvrai_owner`. Garder les mots de passe dans le gestionnaire.
4. **Certificat TLS** : télécharger le certificat d'autorité (CA) fourni par OVH et le copier
   sur le VPS, par exemple dans `/opt/coeurvrai/pg-ca.pem`, en droits 644.
5. **Tester la connexion** depuis le VPS :
   ```bash
   docker run --rm -v /opt/coeurvrai/pg-ca.pem:/ca.pem:ro postgres:15.10-alpine \
     psql "postgres://coeurvrai_owner:MOT_DE_PASSE@HOTE_OVH:PORT/coeurvrai?sslmode=verify-full&sslrootcert=/ca.pem" -c 'select version()'
   ```
6. **Répétition générale** : refaire les étapes 2.2 à 2.4 sur une base managée de test (ou la
   même base, vidée ensuite) pour mesurer la durée réelle.

## 2. Bascule (fenêtre de maintenance)

```bash
cd /opt/coeurvrai
alias dc='docker compose --project-name coeurvrai --env-file .env.production -f current/docker-compose.prod.yml'
```

### 2.1 Arrêter les écritures

```bash
dc stop backend backup        # le site affiche une erreur ; plus aucune écriture en base
```

### 2.2 Copier la base

```bash
# Export depuis le conteneur actuel (format custom, compressé)
# (le conteneur « backup » est déjà configuré pour lire la base actuelle)
dc start backup
dc exec -T backup pg_dump --format=custom --no-owner --no-privileges > /tmp/coeurvrai.dump
dc stop backup

# Import dans la base managée, avec l'utilisateur propriétaire
docker run --rm -i -v /opt/coeurvrai/pg-ca.pem:/ca.pem:ro postgres:15.10-alpine \
  pg_restore --no-owner --no-privileges --exit-on-error \
  -d "postgres://coeurvrai_owner:MOT_DE_PASSE@HOTE_OVH:PORT/coeurvrai?sslmode=verify-full&sslrootcert=/ca.pem" < /tmp/coeurvrai.dump
```

### 2.3 Vérifier les comptages

```bash
Q="select 'users',count(*) from users union all select 'messages',count(*) from messages union all select 'photos',count(*) from photos"
dc exec -T postgres sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" psql -U postgres -d coeurvrai -c "$0"' "$Q"   # ancienne base
docker run --rm -v /opt/coeurvrai/pg-ca.pem:/ca.pem:ro postgres:15.10-alpine \
  psql "postgres://coeurvrai_owner:MOT_DE_PASSE@HOTE_OVH:PORT/coeurvrai?sslmode=verify-full&sslrootcert=/ca.pem" -c "$Q"   # nouvelle base
```

Les nombres doivent être identiques. Sinon : **ne pas basculer**, relancer `dc start backend backup` et analyser.

### 2.4 Changer les variables et redémarrer

Dans `.env.production` :

```ini
DATABASE_URL=postgres://coeurvrai_app:MDP_APP@HOTE_OVH:PORT/coeurvrai?sslmode=verify-full&sslrootcert=/run/pg-ca.pem
MIGRATION_DATABASE_URL=postgres://coeurvrai_owner:MDP_OWNER@HOTE_OVH:PORT/coeurvrai?sslmode=verify-full&sslrootcert=/run/pg-ca.pem
PG_OWNER_PASSWORD=MDP_OWNER
PG_BACKUP_HOST=HOTE_OVH
PG_BACKUP_SSLMODE=verify-full
```

Dans `docker-compose.prod.yml` (à commiter dans le dépôt, puis déployer comme une nouvelle version) :

- supprimer le service `postgres`, son volume `pgdata` et les `depends_on: postgres` des
  services `migrate`, `backend` et `backup` ;
- monter le certificat dans `migrate`, `backend` et `backup` :
  `- /opt/coeurvrai/pg-ca.pem:/run/pg-ca.pem:ro`, et pour `backup` ajouter
  `PGSSLROOTCERT: /run/pg-ca.pem` ;
- ajouter le port de la base managée à `PGPORT` du service `backup` s'il n'est pas 5432.

Puis :

```bash
dc run --rm migrate            # applique les droits de coeurvrai_app sur la nouvelle base
dc up -d backend backup
curl -fsS https://coeurvrai.com/health      # doit renvoyer {"status":"ok"}
```

Faire un test complet (connexion, chat, envoi de photo), puis lancer une sauvegarde et un
test de restauration : `dc exec backup backup-db.sh && dc exec backup restore-test.sh`.

> **Test de restauration en phase 2** : il crée une base temporaire. Sur l'offre managée, il
> faut soit autoriser `coeurvrai_owner` à créer des bases, soit créer une base
> `restore_test_<date>` par l'interface OVH avant le test.

## 3. Retour arrière (si quelque chose ne va pas)

Tant que l'ancien volume `pgdata` n'est pas supprimé, revenir en arrière prend deux minutes :
remettre les anciennes valeurs de `DATABASE_URL`, `MIGRATION_DATABASE_URL` et `PG_BACKUP_*`,
redéployer la version précédente (`deploy.sh --rollback`). **Ne supprimer le volume `pgdata`
qu'après deux semaines de fonctionnement sans incident**, et après une sauvegarde finale :

```bash
docker volume rm coeurvrai_pgdata
```

## 4. Variante sans coupure (si la base devient volumineuse)

Au-delà de quelques dizaines de Go, la copie devient trop longue. On utilise alors la
**réplication logique** de PostgreSQL : la base managée s'abonne à l'ancienne
(`CREATE PUBLICATION` / `CREATE SUBSCRIPTION`) et se synchronise pendant que le site tourne.
La coupure se réduit alors au temps de changer `DATABASE_URL` (moins d'une minute). Vérifier
au préalable que l'offre OVH autorise les abonnements logiques, et faire valider la procédure
par un administrateur PostgreSQL.

## 5. Après la migration

- Les **sauvegardes restic continuent** (le conteneur `backup` lit désormais la base managée),
  en plus des sauvegardes automatiques d'OVH : on garde ainsi une copie chiffrée, indépendante
  et testée chaque mois.
- Mettre à jour le registre des traitements : l'hébergeur de la base reste OVH, en France.
- Libérer la mémoire du VPS : les 3 Go réservés à PostgreSQL peuvent être rendus au backend
  (limites mémoire dans `docker-compose.prod.yml`).
