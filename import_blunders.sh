#!/usr/bin/env bash
# Wrapper for import_papergames_blunders.mjs
# Usage: ./import_blunders.sh --user-id <uuid> [--account-id <id>] [--min-severity N] [--limit N]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

node --env-file="$SCRIPT_DIR/connect-four/server/.env" \
  "$SCRIPT_DIR/connect-four/server/scripts/import_papergames_blunders.mjs" \
  "$@"
