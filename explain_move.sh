#!/usr/bin/env bash
# Usage: ./explain_move.sh <movestring> <col> [rounds=1]
#
#   movestring  — position BEFORE the user's move as 0-indexed column digits
#                 (e.g. "33412" or "" for an opening move)
#   col         — 0-indexed column the user played (0–6)
#   rounds      — simulation depth (default 1); controls how many rounds of
#                 optimal play are simulated after the move (numPlies = 2*rounds+1)
node --env-file=connect-four/server/.env connect-four/server/scripts/explain_move.mjs "$@"
