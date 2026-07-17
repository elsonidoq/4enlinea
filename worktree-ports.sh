#!/usr/bin/env bash
# Prints a stable, collision-free port pair for this git checkout.
#
# Main checkout -> legacy defaults (API 3001, Vite 5173), unchanged.
# Linked worktree -> hash of the worktree's own absolute path into
#   API_PORT in 4100-4999, VITE_PORT in 6100-6999 (never able to equal
#   3001/5173 - see docs/architecture/worktree-conventions.md).
#
# Usage: eval "$(./worktree-ports.sh)"
# Escape hatch for a hash collision between two worktrees:
#   WORKTREE_PORT_SALT=<n> eval "$(./worktree-ports.sh)"

set -euo pipefail

GIT_DIR=$(cd "$(git rev-parse --git-dir)" && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" && pwd -P)
TOPLEVEL=$(git rev-parse --show-toplevel)

if [ "$GIT_DIR" = "$GIT_COMMON" ]; then
  API_PORT=3001
  VITE_PORT=5173
else
  SALT="${WORKTREE_PORT_SALT:-0}"
  HASH=$(printf '%s' "$TOPLEVEL" | cksum | cut -d' ' -f1)
  OFFSET=$(( (HASH + SALT) % 900 ))
  API_PORT=$((4100 + OFFSET))
  VITE_PORT=$((6100 + OFFSET))
fi

echo "export API_PORT=$API_PORT"
echo "export VITE_PORT=$VITE_PORT"
echo "export PORT=$API_PORT"
echo "export FRONTEND_URL=http://localhost:$VITE_PORT"

for pair in "API_PORT:$API_PORT" "VITE_PORT:$VITE_PORT"; do
  name="${pair%%:*}"
  port="${pair##*:}"
  pid=$(lsof -ti tcp:"$port" 2>/dev/null || true)
  if [ -n "$pid" ]; then
    echo "# $name=$port already bound by pid(s): $pid — reuse if it's your own prior run, investigate otherwise" >&2
  else
    echo "# $name=$port is free" >&2
  fi
done
