#!/usr/bin/env bash
# Alerte si le disque du serveur dépasse le seuil (80 % par défaut), au plus une fois par jour.
. /usr/local/bin/lib.sh
threshold="${DISK_ALERT_THRESHOLD:-80}"
used=$(df -P / | awk 'NR==2 {gsub("%","",$5); print $5}')
marker=/var/lib/backup/.alerte-disque-$(date +%F)
if [ "$used" -ge "$threshold" ] && [ ! -f "$marker" ]; then
  notify "Disque rempli à ${used} %" "Le disque du serveur est utilisé à ${used} % (seuil : ${threshold} %). Libérer de la place : voir infra/EXPLOITATION.md."
  touch "$marker"
fi
