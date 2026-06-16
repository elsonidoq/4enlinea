---
name: project_epic6_architecture
description: Epic 6 (Challenge Progression & Variety) — key architectural decisions from the full speckit pipeline
metadata:
  type: project
---

Epic 6 spec/plan/tasks are complete at `specs/035-challenge-progression-variety/`.

## Core architecture

- **Shape reindex runs at curation time, not draw time.** The user explicitly rejected the original draw-time greedy max-heap design. A "reindex puzzles" button on the curation tool runs a round robin algorithm per category: group puzzles by `shape_key`, interleave (A, B, C, A, B, C...), assign sequential `position` values (0, 1, 2, ...).
- **Draw endpoint is sequential by position with random offset.** `ORDER BY position ASC` with a random starting offset per session (so different sessions see different puzzle sequences). No shape algorithm at serve time.
- **`shape_key` uses canonical `key=value` serializer**, NOT `JSON.stringify`. Keys sorted alphabetically, joined by `|`, nested objects (double_threat arms) recursively serialized in parentheses. Example: `col_zone=center|orientation=H|row_zone=top|subtype=run3`. This is deterministic regardless of property insertion order.
- **New puzzle columns**: `shape_key TEXT`, `position INTEGER` (NULL = unindexed), `highlight_cells jsonb` (for forced_win). Migration 044.
- **`position` formula**: `groupIndex + sortedGroupPosition * numGroups`. Outer loop over sortedGroupPosition, inner over groupIndex. Produces A0, B0, C0, A1, B1, C1... (round-robin).

**Why:** The user wanted zero shape-computation logic at serve time. Pre-computing shape + position at curation time keeps the draw endpoint trivially simple and avoids all the edge cases (resume path ordering, board replay for forced_win, canonical serialization races).

## Endpoints

- `GET /api/user/challenge-progress` — in `userRoutes.js` (NOT inline in index.js), two supabase-js queries + JS merge
- `POST /api/admin/puzzles/reindex` — admin-only, `requireLocalhost` (existing `GET /api/admin/puzzles` uses `requireAdmin` — split is intentional)
- Draw endpoint modified: `WHERE position IS NOT NULL ORDER BY position ASC` with random offset

## Key traps

- **forced_win `highlight_metadata` is always null** on the puzzles table. The 5-cell structure (`computeForcedWinHighlight`) exists only on `candidates.highlight_cells`. The approval endpoint discards it. Epic 6 adds `highlight_cells` to puzzles and fixes the approval copy.
- **claimodd has no candidate generation infrastructure.** `detectClaimodd` exists in classifier.js but `candidate-generator.js` has no `checkClaimoddPredicate`. Treated as manual-curation-only in this epic.
- **CHALLENGE_SETS is in `server/challengeSets.js`**, not `server/categories.js`. Separate modules.
- **Cross-draw adjacency is NOT guaranteed.** Every fresh draw starts from position 0 with no cursor. Within-draw only.

## Related

- [[project_new_puzzle_categories]] — highlight_metadata schema for z_threat, undercut, overcut, figure_7, j_shape
- [[project_forced_win_refactor]] — forced_win CompletionStrategy and sequence mode
- [[reference_puzzles_table_columns]] — puzzles table column reference
