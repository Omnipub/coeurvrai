#!/usr/bin/env bash
# Sauvegarde nocturne de la base : pg_dump (format custom) + comptage des lignes,
# pris dans le MÊME instantané PostgreSQL, puis envoi chiffré par restic.
# Rétention : 30 sauvegardes quotidiennes et 6 mensuelles.
. /usr/local/bin/lib.sh

work=$(mktemp -d /var/lib/backup/db.XXXXXX)
trap 'rm -rf "$work"' EXIT
log "Début de la sauvegarde de la base"

# Une session psql garde ouverte une transaction en lecture seule dont l'instantané
# est partagé avec pg_dump : les comptages correspondent exactement au contenu du dump.
coproc PSQL { psql -X -qtA -v ON_ERROR_STOP=1; }
echo "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY; SELECT pg_export_snapshot();" >&"${PSQL[1]}"
read -r snapshot <&"${PSQL[0]}"
echo "$(counts_sql)" >&"${PSQL[1]}"
read -r counts <&"${PSQL[0]}"

run_or_alert "pg_dump" pg_dump --format=custom --compress=6 --no-owner --no-privileges \
  --snapshot="$snapshot" --file="$work/coeurvrai.dump"
echo "COMMIT;" >&"${PSQL[1]}"
exec {PSQL[1]}>&-
wait "$PSQL_PID" || true

echo "$counts" | jq . > "$work/counts.json"
log "Lignes sauvegardées : $(jq -c . "$work/counts.json")"

run_or_alert "envoi restic (base)" restic backup --host coeurvrai --tag db --no-scan "$work"
run_or_alert "rétention restic (base)" restic forget --host coeurvrai --tag db \
  --keep-daily 30 --keep-monthly 6 --prune

log "Sauvegarde de la base terminée"
ping_ok
