---
name: project-suboptimal-blunder-unification
description: "Suboptimal moves unified with blunders — blunders.quality column, ExplorerScreen deleted, single MistakeDetailScreen for all mistakes"
metadata: 
  node_type: memory
  type: project
  originSessionId: 08d189a6-0456-480f-895e-3cf14198c683
---

Suboptimal moves and blunders are the same concept at different severity levels.

**Schema:** `blunders.quality text NOT NULL DEFAULT 'blunder' CHECK IN ('suboptimal','blunder')`. Both suboptimal and blunder plies are stored in the `blunders` table.

**Routing trap:** `ExplorerScreen` is gone. `ReviewScreen.navigateToMistake` routes ALL non-optimal nodes to `blunderDetail` — no fallback to any explorer route. No-op if `gameBlunderList` match not found yet (queue loading or anonymous user). `difficulty` is passed as a nav param from `ReviewScreen` → `blunderDetail`.

**Analysis caching trap:** `POST /api/games/analyze` has a fast cache path for logged-in users — if `blunders` rows already exist for the user+game, it reconstructs the full response from DB without calling the solver. In the cached path, `score`/`bestScore`/`bestCol` per move are `null`. `scored` counts all user plies rather than only non-forced ones (known approximation, documented in `api-conventions.md`). Do not add a separate cache mechanism without first checking whether the blunders rows already contain all needed data.
