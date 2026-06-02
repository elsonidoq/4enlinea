#!/bin/bash
set -e
cd "$(dirname "$0")"
node --env-file=connect-four/server/.env connect-four/server/scripts/reprocess_blunders.mjs "$@"
