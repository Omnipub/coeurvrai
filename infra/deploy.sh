#!/usr/bin/env bash
# =============================================================================
# Déploiement d'une version sur le VPS, avec retour automatique en arrière.
# Appelé par GitHub Actions (.github/workflows/deploy.yml) ou à la main :
#
#   infra/deploy.sh --version v1.2.0 --bundle /opt/coeurvrai/bundle-v1.2.0.tgz
#   infra/deploy.sh --rollback          # revient à la version précédente
#
# Organisation sur le serveur (/opt/coeurvrai) :
#   .env.production          secrets (chmod 600), jamais dans Git
#   releases/<version>/      fichiers de déploiement de chaque version (compose, Caddy…)
#   current -> releases/…    version en service ; previous -> version d'avant
# Étapes : docker compose pull → migrations → démarrage → contrôle de santé.
# Si le contrôle échoue, la version précédente est remise en service.
# =============================================================================
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/coeurvrai}"
ENV_FILE="$APP_DIR/.env.production"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-180}"
version="" bundle="" rollback=false ghcr_user="" ghcr_token_stdin=false

while [ $# -gt 0 ]; do
  case "$1" in
    --version) version="$2"; shift 2 ;;
    --bundle) bundle="$2"; shift 2 ;;
    --rollback) rollback=true; shift ;;
    --ghcr-user) ghcr_user="$2"; shift 2 ;;
    --ghcr-token-stdin) ghcr_token_stdin=true; shift ;;
    *) echo "Option inconnue : $1" >&2; exit 2 ;;
  esac
done

log() { echo "$(date -Iseconds) [deploy] $*"; }
[ -f "$ENV_FILE" ] || { echo "Fichier $ENV_FILE introuvable (voir infra/DEPLOIEMENT.md)" >&2; exit 1; }
[ "$(stat -c %a "$ENV_FILE")" = "600" ] || { echo "$ENV_FILE doit être en chmod 600" >&2; exit 1; }
domain=$(grep -E '^SITE_DOMAIN=' "$ENV_FILE" | cut -d= -f2)

compose() {
  # $1 : dossier de la version ; le nom de projet fixe garde les mêmes volumes de données.
  local dir="$1"; shift
  docker compose --project-name coeurvrai --env-file "$ENV_FILE" -f "$dir/docker-compose.prod.yml" "$@"
}

set_version() { sed -i "s/^APP_VERSION=.*/APP_VERSION=$1/" "$ENV_FILE"; }

healthy() {
  # Le site répond-il, à travers Caddy, avec PostgreSQL et Redis joignables ?
  local deadline=$(( $(date +%s) + HEALTH_TIMEOUT ))
  while [ "$(date +%s)" -lt "$deadline" ]; do
    if curl -fsS --max-time 5 --resolve "$domain:443:127.0.0.1" "https://$domain/health" | grep -q '"ok"' \
       && curl -fsS --max-time 5 -o /dev/null --resolve "$domain:443:127.0.0.1" "https://$domain/"; then
      return 0
    fi
    sleep 5
  done
  return 1
}

activate() {
  # Met en service la version $1 (dossier releases/$1).
  local ver="$1" dir="$APP_DIR/releases/$1"
  set_version "$ver"
  if [ "${SKIP_PULL:-false}" != "true" ]; then   # SKIP_PULL=true : images déjà présentes (tests locaux)
    log "Téléchargement des images $ver"
    compose "$dir" pull --quiet
  fi
  log "Migrations puis démarrage"
  compose "$dir" up -d --remove-orphans --wait --wait-timeout "$HEALTH_TIMEOUT"
}

if $rollback; then
  target=$(readlink "$APP_DIR/previous" 2>/dev/null | xargs -r basename)
  [ -n "$target" ] || { echo "Aucune version précédente enregistrée." >&2; exit 1; }
  log "Retour manuel à la version $target"
  activate "$target"
  current=$(readlink "$APP_DIR/current" | xargs basename)
  ln -sfn "$APP_DIR/releases/$target" "$APP_DIR/current"
  ln -sfn "$APP_DIR/releases/$current" "$APP_DIR/previous"
  healthy && log "Version $target en service." || { log "ÉCHEC du contrôle de santé après retour arrière"; exit 1; }
  exit 0
fi

[ -n "$version" ] && [ -n "$bundle" ] || { echo "--version et --bundle sont requis" >&2; exit 2; }
[[ "$version" =~ ^[A-Za-z0-9._-]+$ ]] || { echo "Version invalide : $version" >&2; exit 2; }

# Connexion au registre d'images avec le jeton éphémère du workflow (lu sur l'entrée standard,
# jamais en argument : il n'apparaît ni dans l'historique ni dans la liste des processus).
if $ghcr_token_stdin; then
  docker login ghcr.io -u "$ghcr_user" --password-stdin >/dev/null
  trap 'docker logout ghcr.io >/dev/null 2>&1 || true' EXIT
fi

release="$APP_DIR/releases/$version"
mkdir -p "$release"
tar -xzf "$bundle" -C "$release"
rm -f "$bundle"
previous=$(readlink "$APP_DIR/current" 2>/dev/null | xargs -r basename || true)

log "Déploiement de $version (version actuelle : ${previous:-aucune})"
if activate "$version" && healthy; then
  [ -n "$previous" ] && [ "$previous" != "$version" ] && ln -sfn "$APP_DIR/releases/$previous" "$APP_DIR/previous"
  ln -sfn "$release" "$APP_DIR/current"
  # Garde les 5 dernières versions.
  ls -1dt "$APP_DIR"/releases/*/ | tail -n +6 | xargs -r rm -rf
  log "Version $version en service."
  exit 0
fi

log "ÉCHEC du contrôle de santé de $version"
if [ -n "$previous" ]; then
  log "Retour automatique à la version $previous"
  activate "$previous" || true
  healthy && log "Version $previous remise en service." || log "ATTENTION : la version précédente ne répond pas non plus."
fi
exit 1
