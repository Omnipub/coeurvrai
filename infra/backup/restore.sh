#!/usr/bin/env bash
# Restauration complète à partir d'une date donnée (voir infra/EXPLOITATION.md).
#
#   restore.sh --list                                  liste les sauvegardes disponibles
#   restore.sh --date 2026-11-20 --target coeurvrai --yes          base de données
#   restore.sh --date 2026-11-20 --photos --yes                    photos (vers le bucket)
#
# La sauvegarde retenue est la plus récente faite AU PLUS TARD à la date indiquée (fin de journée).
# Base : la base cible est VIDÉE puis remplie avec la sauvegarde. Arrêter le backend avant.
. /usr/local/bin/lib.sh

date_limit="" target="" photos=false yes=false list=false
while [ $# -gt 0 ]; do
  case "$1" in
    --date) date_limit="$2"; shift 2 ;;
    --target) target="$2"; shift 2 ;;
    --photos) photos=true; shift ;;
    --yes) yes=true; shift ;;
    --list) list=true; shift ;;
    *) echo "Option inconnue : $1"; exit 2 ;;
  esac
done

if $list; then
  restic snapshots --host coeurvrai
  exit 0
fi

tag=db; $photos && tag=photos
limit="${date_limit:-$(date +%F)}T23:59:59"
snapshot=$(restic snapshots --host coeurvrai --tag "$tag" --json \
  | jq -r --arg limit "$limit" '[.[] | select(.time[0:19] <= $limit)] | sort_by(.time) | last | .short_id // empty')
[ -n "$snapshot" ] || { echo "Aucune sauvegarde « $tag » avant le $limit"; exit 1; }
log "Sauvegarde retenue : $snapshot ($tag, au plus tard le $limit)"

$yes || { echo "Ajouter --yes pour confirmer la restauration (opération destructive)."; exit 2; }

work=$(mktemp -d /var/lib/backup/restore.XXXXXX)
trap 'rm -rf "$work"' EXIT
restic restore "$snapshot" --target "$work"

if $photos; then
  : "${PHOTOS_BUCKET:?}"
  src=$(find "$work" -type d -name photos-miroir | head -1)
  export RCLONE_CONFIG_PHOTOS_TYPE=s3 RCLONE_CONFIG_PHOTOS_PROVIDER="${PHOTOS_S3_PROVIDER:-Other}" \
    RCLONE_CONFIG_PHOTOS_ENDPOINT="$PHOTOS_S3_ENDPOINT" RCLONE_CONFIG_PHOTOS_REGION="${PHOTOS_S3_REGION:-gra}" \
    RCLONE_CONFIG_PHOTOS_ACCESS_KEY_ID="${PHOTOS_RESTORE_ACCESS_KEY_ID:-$PHOTOS_S3_ACCESS_KEY_ID}" \
    RCLONE_CONFIG_PHOTOS_SECRET_ACCESS_KEY="${PHOTOS_RESTORE_SECRET_ACCESS_KEY:-$PHOTOS_S3_SECRET_ACCESS_KEY}" \
    RCLONE_CONFIG_PHOTOS_FORCE_PATH_STYLE=true
  # « copy » : remet les fichiers manquants sans supprimer ceux envoyés depuis.
  rclone copy "$src" "photos:$PHOTOS_BUCKET" --transfers 8
  log "Photos restaurées dans le bucket $PHOTOS_BUCKET"
  exit 0
fi

: "${target:?--target requis (nom de la base à restaurer)}"
dump=$(find "$work" -name coeurvrai.dump | head -1)
log "Restauration dans la base « $target »"
pg_restore --dbname="$target" --clean --if-exists --no-owner --no-privileges --exit-on-error "$dump"
log "Base restaurée. Comptages de la sauvegarde : $(jq -c . "$(dirname "$dump")/counts.json")"
log "Relancer ensuite les migrations (droits de l'application) : voir infra/EXPLOITATION.md"
