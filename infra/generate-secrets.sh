#!/usr/bin/env bash
# =============================================================================
# Génère .env.production à partir de .env.production.example, avec des secrets
# forts (générateur aléatoire du système via openssl).
#
#   bash infra/generate-secrets.sh [chemin du fichier à créer]
#
# - Remplace chaque valeur « <généré> » ; laisse « <à renseigner> » à compléter.
# - Refuse d'écraser un fichier existant (les secrets protègent des données déjà chiffrées).
# - Fichier créé en chmod 600.
# =============================================================================
set -euo pipefail

here="$(cd "$(dirname "$0")/.." && pwd)"
template="$here/.env.production.example"
target="${1:-$here/.env.production}"

if [ -e "$target" ]; then
  echo "ERREUR : $target existe déjà. Les secrets existants ne sont jamais écrasés." >&2
  echo "Pour renouveler un secret précis, suivre infra/EXPLOITATION.md." >&2
  exit 1
fi
command -v openssl >/dev/null || { echo "openssl est requis" >&2; exit 1; }

hex() { openssl rand -hex "$1"; }                 # caractères 0-9a-f : sûrs dans une URL
b64() { openssl rand -base64 "$1" | tr -d '\n'; }

declare -A secret=(
  [POSTGRES_PASSWORD]="$(hex 32)"
  [PG_OWNER_PASSWORD]="$(hex 32)"
  [PG_APP_PASSWORD]="$(hex 32)"
  [REDIS_PASSWORD]="$(hex 32)"
  [JWT_SECRET]="$(hex 64)"
  [ENCRYPTION_KEYS]="k$(date +%Y%m):$(b64 32)"
  [LOG_PSEUDONYM_KEY]="$(hex 32)"
  [RESTIC_PASSWORD]="$(hex 32)"
)
owner_user=$(grep -E '^PG_OWNER_USER=' "$template" | cut -d= -f2)
app_user=$(grep -E '^PG_APP_USER=' "$template" | cut -d= -f2)
secret[DATABASE_URL]="postgres://${app_user}:${secret[PG_APP_PASSWORD]}@postgres:5432/coeurvrai"
secret[MIGRATION_DATABASE_URL]="postgres://${owner_user}:${secret[PG_OWNER_PASSWORD]}@postgres:5432/coeurvrai"

umask 077
while IFS= read -r line || [ -n "$line" ]; do
  key="${line%%=*}"
  if [[ "$line" == *"=<généré>" ]] && [ -n "${secret[$key]:-}" ]; then
    printf '%s=%s\n' "$key" "${secret[$key]}"
  else
    printf '%s\n' "$line"
  fi
done < "$template" > "$target"
chmod 600 "$target"

if grep -qE '^[A-Z_]+=<généré>$' "$target"; then
  echo "ERREUR : une valeur « <généré> » n'a pas été remplacée." >&2
  exit 1
fi

cat <<MSG

$target créé (droits 600).

  ┌──────────────────────────────────────────────────────────────────────┐
  │  COPIER MAINTENANT dans le gestionnaire de mots de passe :            │
  │    - RESTIC_PASSWORD  (sans lui, les sauvegardes sont ILLISIBLES)     │
  │    - ENCRYPTION_KEYS  (sans elle, messages et IP sont ILLISIBLES)     │
  │  Puis compléter les valeurs « <à renseigner> » :                       │
MSG
grep -nE '^[A-Z_]+=<à renseigner>' "$target" | sed 's/^/  │    /'
echo "  └──────────────────────────────────────────────────────────────────────┘"
