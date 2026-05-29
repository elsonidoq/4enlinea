#!/usr/bin/env bash
# Usage: ./recommend_next_move.sh <movestring> [rounds=1]
#
#   movestring  — current board position as 0-indexed column digits
#                 (e.g. "3344" or "" for an opening move)
#   rounds      — simulation depth (default 1); controls how many rounds of
#                 optimal play are simulated per column (numPlies = 2*rounds+1)
node --env-file=connect-four/server/.env connect-four/server/scripts/recommend_next_move.mjs "$@"
