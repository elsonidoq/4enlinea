---
name: mistake-storage-rule-quality-seam
description: classifyStoredMistake gates all blunder writes; analyze-badge quality ≠ stored quality; suboptimal timeline chips may have no DB row
metadata: 
  node_type: memory
  type: project
  originSessionId: d65bf268-f657-430b-8ce4-f35ac9997fb2
---

Since 2026-07, `server/mistakeStorageRule.js#classifyStoredMistake` is the single gate for all
three `blunders` write paths (analyze endpoint, papergames importer, POST /api/blunders). Full
rule lives in `docs/architecture/data-model.md` (Storage rule paragraph) — read that, not this.

Non-obvious traps:
- **Two different `quality` values exist for the same ply.** `scoreMove`'s quality still drives
  the analyze response badges/counters (a slower win reads `suboptimal` in the ReviewScreen
  timeline), but the STORED row's quality is graded independently by score drop (`>4` → blunder).
  A ply can show a suboptimal chip yet have NO `blunders` row — ReviewScreen's `selectStep`
  falls back to board preview via `gameBlunderList` membership; don't "fix" that back to
  unconditional navigation.
- **Deadness gate ≠ the forbidden `bestScore < 0` skip.** data-model.md's migration-029 warning
  (never re-add the bestScore<0 guard) still stands; the aliveness check
  (`playerHasPotentialWin`, no opponent-free 4-window) only exempts truly dead movers.
- **Why slower wins are excluded**: reasonEngine's `win_to_slower_win` is `notABlunder`
  (reasonEngine.mjs ~911), so a stored slower-win row served the contradictory "no better
  alternative" deep reveal AND a TTS 404 (notABlunder responses are never cached). That was the
  original bug (blunder 84a72068, movestring 332434101112336).
- Dead-position + alive-faster-loss test fixtures were sampled via gameSampling.playGame
  (tests/unit/mistakeStorageRule.test.js) — don't hand-construct replacements.
- Related: [[project-blunder-serving-dual-paths]], [[project_suboptimal_blunder_unification]].
