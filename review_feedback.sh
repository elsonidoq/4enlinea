#!/usr/bin/env bash
# Usage: ./review_feedback.sh [--feature <name>] [--limit <n>]
#
#   --feature  feature name to filter (default: explain_move_llm)
#   --limit    max rows to fetch      (default: 10)
node --env-file=connect-four/server/.env connect-four/server/scripts/review_feedback.mjs "$@"
