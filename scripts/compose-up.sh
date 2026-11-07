#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SECRETS_DIR="${SBS_ENV_DIR:-$REPO_DIR/.secrets}"
SHARED_ENV="$SECRETS_DIR/compose.env"
PROFILE="default"

if [ "${1:-}" = "default" ] || [ "${1:-}" = "gateway" ] || [ "${1:-}" = "tls" ]; then
  PROFILE="$1"
  shift
fi

case "$PROFILE" in
  default)
    PROFILE_ENV=""
    ;;
  gateway)
    PROFILE_ENV="$REPO_DIR/.env.gateway.example"
    ;;
  tls)
    PROFILE_ENV="$REPO_DIR/.env.tls.example"
    ;;
  *)
    printf 'usage: %s [default|gateway|tls] [docker compose arguments...]\n' "$0" >&2
    exit 64
    ;;
esac

node "$REPO_DIR/scripts/seed-compose-env.mjs" --output "$SHARED_ENV"

# An earlier revision told operators to copy .env.example to .env. Nothing reads
# that file now, so say so instead of starting with values that were ignored.
if [ -f "$REPO_DIR/.env" ]; then
  printf 'note: .env is not read; set values in .env.example or export them\n' >&2
fi

compose_args=("$@")
if [ "${#compose_args[@]}" -eq 0 ]; then
  compose_args=(up -d)
fi

# Order is precedence: the shared template, then the project-specific file, then
# the generated secrets last so no other file can blank them.
env_args=(--env-file "$REPO_DIR/.env.example")
if [ -n "$PROFILE_ENV" ]; then
  env_args+=(--env-file "$PROFILE_ENV")
fi
env_args+=(--env-file "$SHARED_ENV")

cd "$REPO_DIR"
exec docker compose "${env_args[@]}" "${compose_args[@]}"
