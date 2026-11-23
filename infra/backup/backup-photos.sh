#!/usr/bin/env bash
# Sauvegarde hebdomadaire des photos : copie incrémentale du bucket photos dans un
# miroir local (seuls les fichiers nouveaux ou modifiés sont téléchargés), puis
# instantané chiffré restic. Rétention : 8 hebdomadaires et 6 mensuelles.
. /usr/local/bin/lib.sh

: "${PHOTOS_BUCKET:?PHOTOS_BUCKET requis}"
mirror=/var/lib/backup/photos-miroir
mkdir -p "$mirror"
log "Début de la sauvegarde des photos"

# Accès au bucket photos (identifiants en LECTURE SEULE de préférence), via variables RCLONE_*.
export RCLONE_CONFIG_PHOTOS_TYPE=s3
export RCLONE_CONFIG_PHOTOS_PROVIDER="${PHOTOS_S3_PROVIDER:-Other}"
export RCLONE_CONFIG_PHOTOS_ENDPOINT="${PHOTOS_S3_ENDPOINT:?PHOTOS_S3_ENDPOINT requis}"
export RCLONE_CONFIG_PHOTOS_REGION="${PHOTOS_S3_REGION:-gra}"
export RCLONE_CONFIG_PHOTOS_ACCESS_KEY_ID="${PHOTOS_S3_ACCESS_KEY_ID:?}"
export RCLONE_CONFIG_PHOTOS_SECRET_ACCESS_KEY="${PHOTOS_S3_SECRET_ACCESS_KEY:?}"
export RCLONE_CONFIG_PHOTOS_FORCE_PATH_STYLE=true

run_or_alert "copie du bucket photos" rclone sync "photos:$PHOTOS_BUCKET" "$mirror" --fast-list --transfers 8
run_or_alert "envoi restic (photos)" restic backup --host coeurvrai --tag photos --no-scan "$mirror"
run_or_alert "rétention restic (photos)" restic forget --host coeurvrai --tag photos \
  --keep-weekly 8 --keep-monthly 6 --prune

log "Sauvegarde des photos terminée"
