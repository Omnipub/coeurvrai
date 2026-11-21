#!/usr/bin/env bash
# Vérification hebdomadaire de l'intégrité du dépôt restic (structure + 5 % des données relues).
. /usr/local/bin/lib.sh
log "Vérification du dépôt restic"
run_or_alert "restic check" restic check --read-data-subset=5%
log "Dépôt restic intègre"
