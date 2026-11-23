#!/usr/bin/env bash
# Démarrage du conteneur de sauvegarde.
#  - « cron » (par défaut) : prépare le dépôt restic puis lance la planification ;
#  - toute autre commande (ex. restore.sh, restore-test.sh) est exécutée telle quelle.
set -euo pipefail

if [ "${1:-cron}" != "cron" ]; then
  exec "$@"
fi

# cron ne transmet pas l'environnement aux tâches : on l'écrit dans un fichier
# lisible par root uniquement, relu par lib.sh.
umask 077
for var in $(compgen -e | grep -E '^(PG|RESTIC_|AWS_|SMTP_|ALERT_|HEALTHCHECK_|PHOTOS_|DISK_|TZ$)'); do
  declare -p "$var"   # valeur correctement échappée, quel que soit son contenu
done > /run/backup.env

. /usr/local/bin/lib.sh

# Création du dépôt chiffré au premier démarrage (sans effet s'il existe déjà).
if ! restic cat config >/dev/null 2>&1; then
  log "Initialisation du dépôt restic"
  restic init
fi

cat > /etc/crontabs/root <<CRON
# Base de données : chaque nuit à 3 h (heure de Paris)
0 3 * * * /usr/local/bin/backup-db.sh >> /proc/1/fd/1 2>&1
# Photos : chaque dimanche à 4 h
0 4 * * 0 /usr/local/bin/backup-photos.sh >> /proc/1/fd/1 2>&1
# Vérification de l'intégrité du dépôt : chaque lundi à 5 h
0 5 * * 1 /usr/local/bin/check.sh >> /proc/1/fd/1 2>&1
# Test de restauration : le 1er de chaque mois à 6 h
0 6 1 * * /usr/local/bin/restore-test.sh >> /proc/1/fd/1 2>&1
# Espace disque : toutes les heures
0 * * * * /usr/local/bin/disk-check.sh >> /proc/1/fd/1 2>&1
CRON

log "Planification active (sauvegarde quotidienne à 3 h)"
exec crond -f -l 8
