#!/usr/bin/env bash
# Fonctions communes aux scripts de sauvegarde. Les variables viennent de l'environnement
# du conteneur (cron les relit depuis /run/backup.env, lisible par root uniquement).
set -euo pipefail
[ -f /run/backup.env ] && . /run/backup.env

# Tables dont on compte les lignes (sauvegarde et test de restauration).
TABLES=(users profiles_homme profiles_femme_trans photos likes matches messages reports blocks)
export PGHOST="${PGHOST:-postgres}" PGPORT="${PGPORT:-5432}" PGDATABASE="${PGDATABASE:-coeurvrai}"
export PGUSER="${PGUSER:?PGUSER requis}" PGPASSWORD="${PGPASSWORD:?PGPASSWORD requis}"
export RESTIC_CACHE_DIR=/var/cache/restic

log() { echo "$(date -Iseconds) [$(basename "$0")] $*"; }

# Requête SQL : nombre de lignes de chaque table, en un objet JSON trié.
counts_sql() {
  local parts=()
  for t in "${TABLES[@]}"; do parts+=("SELECT '$t' AS t, count(*) AS n FROM $t"); done
  local IFS=$'\n'
  echo "SELECT json_object_agg(t, n ORDER BY t) FROM ($(printf '%s UNION ALL ' "${parts[@]}" | sed 's/ UNION ALL $//')) c;"
}

# Alerte : e-mail via SMTP (Brevo en production, Mailpit en local), et ping de
# surveillance facultatif (HEALTHCHECK_URL, ex. instance Healthchecks auto-hébergée).
notify() {
  local subject="$1" body="$2"
  log "ALERTE : $subject"
  if [ -n "${SMTP_URL:-}" ] && [ -n "${ALERT_EMAIL_TO:-}" ]; then
    local mail; mail=$(mktemp)
    printf 'From: %s\r\nTo: %s\r\nSubject: [Cœur Vrai] %s\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n%s\r\n\r\nServeur : %s — %s\r\n' \
      "${ALERT_EMAIL_FROM:-noreply@coeurvrai.com}" "$ALERT_EMAIL_TO" "$subject" "$body" "$(hostname)" "$(date -Iseconds)" > "$mail"
    local tls=(--ssl-reqd); [ "${SMTP_REQUIRE_TLS:-true}" = "true" ] || tls=()
    curl -sS --max-time 30 "${tls[@]}" --url "$SMTP_URL" \
      --mail-from "${ALERT_EMAIL_FROM:-noreply@coeurvrai.com}" --mail-rcpt "$ALERT_EMAIL_TO" \
      --upload-file "$mail" || log "Envoi de l'alerte par e-mail impossible"
    rm -f "$mail"
  fi
  [ -n "${HEALTHCHECK_URL:-}" ] && curl -fsS --max-time 10 "$HEALTHCHECK_URL/fail" >/dev/null || true
}

# Signal « tout va bien » au service de surveillance (s'il est configuré).
ping_ok() {
  [ -n "${HEALTHCHECK_URL:-}" ] && curl -fsS --max-time 10 "$HEALTHCHECK_URL" >/dev/null || true
}

# Exécute une étape ; en cas d'échec, alerte puis sortie en erreur.
run_or_alert() {
  local what="$1"; shift
  if ! "$@"; then
    notify "Échec : $what" "L'étape « $what » a échoué. Consulter : docker compose logs backup"
    exit 1
  fi
}
