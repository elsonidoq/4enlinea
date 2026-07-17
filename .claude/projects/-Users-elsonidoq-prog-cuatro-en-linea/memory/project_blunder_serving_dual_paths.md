---
name: project-blunder-serving-dual-paths
description: Blunder detail is served by TWO independent response builders (GET /api/blunders/:id AND the enriched map ~index.js:2560); explanation_cache read path bypasses any producer-level text transform
metadata: 
  node_type: memory
  type: project
  originSessionId: cbd2dbfa-285b-41d5-a248-5b4a3ead8e5a
---

Three cross-path traps around serving blunder/mistake data, discovered during spec-042 planning (2026-07-08, pre-implementation — spec 042 fixes the first two; verify status before assuming fixed):

1. **Two independent blunder-shape builders.** `GET /api/blunders/:id` (handler `.select()` around `index.js:2597`) serves cold-boot permalinks; a SEPARATE `enriched` map inside the paginated queue-style handler (~`index.js:2560`) serves in-app navigation (ReviewScreen → blunderDetail). The 2560 map does **not** delegate to the `:id` handler — it independently builds `threat_cells`/`game_id`/`papergames_game_id`. **Any field added to the blunder payload must be added to BOTH builders**, or the feature works only on one path (cold-boot vs in-app) and fails silently on the other.

2. **`:id` handler `.select()` omits `papergames_game_id`** (open bug until spec 042 T002A lands) — breaks "Start new game from here" for cold-opened papergames-mistake permalinks.

3. **`explanation_cache` read path bypasses producer-level transforms.** Explanations are served from `explanation_cache` on cache hits (index.js ~907/~999/~3676) without re-running `reasonEngine.mjs` / `explainContext.js` / `llmCoachHelpers.js`. Any sanitization/rewrite placed inside those producers does NOT apply to previously cached text. Correct seam = the response/serialization boundary in `index.js`, downstream of the cache, + `TRUNCATE explanation_cache` at deploy (spec-039 precedent). Also: raw internal term ids (e.g. `[term:community-z-threat]`) leak to the client via the `terms` response map and render as `KbTermPopup` titles when `kbTermLesson.js` lacks a displayName — sanitize the `terms` keys too.

**Why:** each trap is invisible from any single file — the dual builders look like one endpoint from the frontend, and the cache bypass only bites on the (common) cache-hit path that tests rarely exercise.

**How to apply:** when touching the blunder payload shape or explanation text handling, grep for BOTH builders and check the cache-hit path explicitly; a cache-hit test must seed a poisoned cache row (see spec 042 T041). Related: [[project_explain_system]], the polish-epics backlog (git history).
