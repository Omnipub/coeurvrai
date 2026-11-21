#!/usr/bin/env bash
# TEST DE RESTAURATION : restaure la dernière sauvegarde dans une base temporaire,
# compare le nombre de lignes de chaque table avec celui relevé au moment de la
# sauvegarde, puis supprime la base temporaire. À lancer avant la mise en ligne,
# puis chaque mois (planifié le 1er du mois). Code de sortie 0 = restauration réussie.
. /usr/local/bin/lib.sh

work=$(mktemp -d /var/lib/backup/test.XXXXXX)
tmpdb="restore_test_$(date +%Y%m%d%H%M%S)"
cleanup() { dropdb --if-exists "$tmpdb" 2>/dev/null || true; rm -rf "$work"; }
trap cleanup EXIT

snapshot=$(restic snapshots --host coeurvrai --tag db --json | jq -r 'sort_by(.time) | last | .short_id // empty')
[ -n "$snapshot" ] || { notify "Test de restauration impossible" "Aucune sauvegarde de base trouvée."; exit 1; }
log "Test de restauration de la sauvegarde $snapshot dans la base temporaire $tmpdb"

run_or_alert "restic restore (test)" restic restore "$snapshot" --target "$work"
dump=$(find "$work" -name coeurvrai.dump | head -1)
expected=$(jq -cS . "$(dirname "$dump")/counts.json")

run_or_alert "création de la base temporaire" createdb "$tmpdb"
run_or_alert "pg_restore (test)" pg_restore --dbname="$tmpdb" --no-owner --no-privileges --exit-on-error "$dump"
actual=$(PGDATABASE="$tmpdb" psql -X -qtA -c "$(counts_sql)" | jq -cS .)

log "Attendu  : $expected"
log "Restauré : $actual"
if [ "$expected" != "$actual" ]; then
  notify "Test de restauration ÉCHOUÉ" "Les comptages diffèrent. Attendu : $expected — Restauré : $actual"
  exit 1
fi
log "TEST DE RESTAURATION RÉUSSI : les comptages correspondent."
