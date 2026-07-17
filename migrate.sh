#!/usr/bin/env bash
#
# migrate.sh — apply DB migrations against a named environment.
#
# Reads DATABASE_URL from connect-four/server/.env.<env> and runs the migration
# runner (connect-four/server/migrate.js) against it.
#
# Usage:
#   ./migrate.sh --env <local|staging|production> [extra migrate.js args]
#
# Options:
#   --env <name>   REQUIRED. Selects connect-four/server/.env.<name> and reads DATABASE_URL from it.
#   -y, --yes      Skip the confirmation prompt (required for non-interactive production runs).
#   -h, --help     Show this help and exit.
#
# Any extra args are passed through to migrate.js, e.g.:
#   ./migrate.sh --env staging --baseline   # record filenames without executing SQL
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$SCRIPT_DIR/connect-four/server"

ENV_NAME=""
ASSUME_YES=0
PASSTHROUGH=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env)
      [[ $# -ge 2 ]] || { echo "Error: --env requires a value (local|staging|production)" >&2; exit 1; }
      ENV_NAME="$2"; shift 2 ;;
    --env=*)
      ENV_NAME="${1#*=}"; shift ;;
    -y|--yes)
      ASSUME_YES=1; shift ;;
    -h|--help)
      sed -n '2,17p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *)
      PASSTHROUGH+=("$1"); shift ;;
  esac
done

case "$ENV_NAME" in
  local|staging|production) ;;
  "") echo "Error: --env <local|staging|production> is required" >&2; exit 1 ;;
  *)  echo "Error: unknown env '$ENV_NAME' (expected local|staging|production)" >&2; exit 1 ;;
esac

ENV_FILE="$SERVER_DIR/.env.$ENV_NAME"
[[ -f "$ENV_FILE" ]] || { echo "Error: env file not found: $ENV_FILE" >&2; exit 1; }

# Extract DATABASE_URL: take the last matching line, strip the key, trailing CR, and surrounding quotes.
DB_LINE="$(grep -E '^[[:space:]]*DATABASE_URL=' "$ENV_FILE" | tail -n1 || true)"
[[ -n "$DB_LINE" ]] || { echo "Error: DATABASE_URL not found in $ENV_FILE" >&2; exit 1; }
DB_URL="${DB_LINE#*=}"
DB_URL="${DB_URL%$'\r'}"
DB_URL="${DB_URL%\"}"; DB_URL="${DB_URL#\"}"
DB_URL="${DB_URL%\'}"; DB_URL="${DB_URL#\'}"
[[ -n "$DB_URL" ]] || { echo "Error: DATABASE_URL is empty in $ENV_FILE" >&2; exit 1; }

# Guard: applying to production is hard to reverse — confirm unless -y/--yes was passed.
if [[ "$ENV_NAME" == "production" && "$ASSUME_YES" -ne 1 ]]; then
  # Show host/db only (never the password) so you can confirm the target.
  SAFE="$(printf '%s' "$DB_URL" | sed -E 's#(://[^:]+:)[^@]+@#\1***@#')"
  echo "About to run migrations against PRODUCTION: $SAFE"
  read -r -p "Type 'yes' to continue: " REPLY
  [[ "$REPLY" == "yes" ]] || { echo "Aborted."; exit 1; }
fi

echo "Applying migrations → env=$ENV_NAME${PASSTHROUGH[*]:+ (args: ${PASSTHROUGH[*]})}"
cd "$SERVER_DIR"
DATABASE_URL="$DB_URL" node migrate.js ${PASSTHROUGH[@]+"${PASSTHROUGH[@]}"}
