#!/bin/sh
# Exécuté UNE SEULE FOIS par l'image PostgreSQL, à la création du volume de données.
# Crée deux rôles distincts, aucun n'étant superutilisateur :
#   - PG_OWNER_USER : propriétaire du schéma, utilisé par les migrations, les sauvegardes
#                     et le test de restauration (droit CREATEDB pour une base temporaire) ;
#   - PG_APP_USER   : utilisé par l'application, lecture/écriture des données uniquement
#                     (droits accordés par le programme de migrations, voir backend/src/db/migrations.ts).
set -eu

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres \
  -v owner="$PG_OWNER_USER" -v owner_pw="$PG_OWNER_PASSWORD" \
  -v app="$PG_APP_USER" -v app_pw="$PG_APP_PASSWORD" \
  -v db="$POSTGRES_DB" <<'SQL'
-- CREATEDB : uniquement pour le test mensuel de restauration (base temporaire).
CREATE ROLE :"owner" LOGIN PASSWORD :'owner_pw' NOSUPERUSER CREATEDB NOCREATEROLE;
CREATE ROLE :"app" LOGIN PASSWORD :'app_pw' NOSUPERUSER NOCREATEDB NOCREATEROLE;
ALTER DATABASE :"db" OWNER TO :"owner";
REVOKE ALL ON DATABASE :"db" FROM PUBLIC;
GRANT CONNECT ON DATABASE :"db" TO :"app";
SQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v owner="$PG_OWNER_USER" <<'SQL'
-- Le schéma appartient au propriétaire ; personne d'autre ne peut y créer d'objets.
ALTER SCHEMA public OWNER TO :"owner";
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
SQL
