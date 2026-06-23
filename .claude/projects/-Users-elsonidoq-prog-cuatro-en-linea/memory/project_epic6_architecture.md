---
name: project_epic6_architecture
description: "Epic 6 (Challenge Progression & Variety) — shape reindex, position-based draw, challenge-progress endpoint"
metadata: 
  node_type: memory
  type: project
  originSessionId: 8e7f98dd-1a31-40fd-9f3a-a9839cc9bdbe
---

## Core architecture

- **Shape reindex runs at curation time, not draw time.** Round-robin algorithm per category: group puzzles by `shape_key`, interleave, assign sequential `position` values.
- **Draw endpoint is sequential by position with random offset.** `ORDER BY position ASC` with `.not('position', 'is', null)`. Un-reindexed categories return empty arrays (by design).
- **`shape_key` uses canonical `key=value` serializer**, NOT `JSON.stringify`. Keys sorted alphabetically, joined by `|`, nested objects recursively serialized in parentheses.
- **New puzzle columns**: `shape_key TEXT`, `position INTEGER` (NULL = unindexed), `highlight_cells jsonb`.

## Key endpoints

- `GET /api/user/challenge-progress` — in `userRoutes.js:172`, two supabase-js queries + JS merge, returns `{ progress: { [slug]: { attempted, correct, total, accuracy, cleared } } }`
- `POST /api/admin/puzzles/reindex` — at `index.js:2543`, `requireLocalhost`, returns `{ category, indexed, shapeGroups }`
- Draw endpoint modified at `index.js:1222-1280` — position-based with random offset + wrap-around for single-category, interleaved pools for mixed.

## Key traps

- **Plan line numbers are all wrong.** File grew ~150 lines since plan was written. Stats endpoint is at 2524 (plan said 2313), single approve at 2738/2770 (plan said 2467/2487), batch at 2800/2836 (plan said 2528/2552).
- **Un-reindexed categories return empty draws.** All positions are NULL → `.not('position', 'is', null)` filters everything out. Admin must reindex first.
- **Accuracy bar hidden when `attempted === 0`** (SetCard line 91). Category with no attempts shows only the progress bar.
- **Locked (paid) cards never show progress UI** — `showProgress = isAuthenticated && progress && !locked`.
- **`requireLocalhost` is inline** in `index.js`, not a separate module like `requireAdmin`.
- **Batch 3 sub-agent registered reindex endpoint at line 2545**, which pushed the existing `GET /api/admin/candidates` route from line 2487 to line 2601.

## Related

- [[project_new_puzzle_categories]] — highlight_metadata schema
- [[project_forced_win_refactor]] — forced_win CompletionStrategy
- [[reference_highlight_metadata_null_categories]] — which categories have null highlight_metadata
