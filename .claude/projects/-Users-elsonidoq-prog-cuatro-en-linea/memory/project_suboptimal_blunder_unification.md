---
name: project-suboptimal-blunder-unification
description: "Suboptimal moves unified with blunders (2026-06-21) — blunders.quality column, both persisted, ExplorerScreen deleted, single MistakeDetailScreen for all mistakes"
metadata: 
  node_type: memory
  type: project
  originSessionId: 08d189a6-0456-480f-895e-3cf14198c683
---

Implemented 2026-06-21. Suboptimal moves and blunders are now the same concept at different severity levels.

**Key changes:**
- Migration 051: `blunders.quality text NOT NULL DEFAULT 'blunder' CHECK IN ('suboptimal','blunder')`.
- `POST /api/games/analyze` and `papergamesImporter.extractBlunders` now insert BOTH suboptimal and blunder plies (was blunder-only).
- `GET /api/coach/queue` and `GET /api/blunders/:id` expose `quality` in their responses.
- `ExplorerScreen` deleted entirely; `explorer` route, URL map entry, and surface group entry all removed.
- `MistakeDetailScreen` (route: `blunderDetail`) is the single mistake review screen for all non-optimal moves. Gained: "Start a new game from here" button + difficulty picker (for papergames games with unknown difficulty).
- `ReviewScreen.navigateToMistake` routes ALL non-optimal nodes to `blunderDetail` — no fallback to explorer. No-op if `gameBlunderList` match not found yet (queue loading or anonymous user).
- `difficulty` is now passed as a nav param from `ReviewScreen` → `blunderDetail` for "Start from here".

**Why:** The old two-screen design created inconsistency. Both review actions (deep reveal, mark reviewed, start-from-here) should apply to all mistakes equally.

**How to apply:** If touching mistake review flows, assume all non-optimal moves route to `blunderDetail` and are in the `blunders` table. See [[reference-review-screen-navigate-to-mistake]].
