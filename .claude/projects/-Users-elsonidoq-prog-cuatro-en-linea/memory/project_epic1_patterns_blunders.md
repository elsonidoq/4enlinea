---
name: project_epic1_patterns_blunders
description: "Epic 1 (patterns-blunders schema + core algorithm) implementation state — what was built, key decisions, open items for Epic 2"
metadata: 
  node_type: memory
  type: project
  originSessionId: 95d2bb46-7ac4-4143-9d33-efa8310599cd
---

Epic 1 of Patterns → Blunders → Challenges shipped 2026-06-06 on branch `101-new-design`. All 38 tasks complete.

## What was built

- **DB migrations 032–034**: TRUNCATE blunders + new CHECK constraint (15 tags, `unknown` excluded, `forbidden_columns` legacy-tolerated) + `reason TEXT` + `direction TEXT` columns. Applied to dev DB.
- **13 detector retrofits** in `server/classifier.js`: all accept `perspective = board.currentPlayer` parameter. 5 score-consuming detectors (detectForcedBlock, detectForcedWin, detectForbiddenColumns, detectZThreat, detectOddEvenThreat) implement FR-033 two-step recursive perspective contract with `solver = null` parameter.
- **`classifyPattern(ms, perspective, solver)`**: new export, returns `Promise<Set<string>>`. Inline detector list (does NOT import DETECTOR_REGISTRY from explainSimulate.js — circular dependency).
- **`tagBlunder(moves, playedCol, correctCol, solver)`**: new export, 5-step priority cascade, never throws. Returns `{ tag, direction, reason }`.
- **Tests**: `tests/blunder/tagBlunder.test.js` — 8 test cases (T-001 through T-006). 321 pass, 1 pre-existing fail (classifier.test.js:83).
- **Docs**: server-conventions.md (new Classifier API section), db-schema.md (blunders table updated).
- **Script patches**: `import_papergames_blunders.mjs` and `reprocess_blunders.mjs` — `'unknown'` → `'suboptimal_move'`.

## Key decisions

- **No production call sites wired** — that is Epic 2's scope. `classifyPattern` and `tagBlunder` are exported but uncalled.
- **FR-033 IIFE pattern**: score-consuming detectors use conditional `(() => { ... })()` IIFE returning Promise when solver provided, NOT `async` keyword — preserves sync return for existing callers (classifyAll, explainSimulate's runDetectors).
- **classifyPattern inline list** must stay in sync with explainSimulate.js's DETECTOR_REGISTRY. A code comment marks this.
- **detectDoubleThreat semantics changed**: now checks "does perspective have threats on current board" instead of "which columns would create threats after playing." Affects explainSimulate histograms.
- **`undercut` uses enabled_self** (blunderer's after-positions) in tagBlunder Step 4, while all other entries use enabled_opp. Per FR-024/FR-025.

## T-002 test gap (Step 3 vs Step 4 priority) — detailed

No position found where both `missed_own` (Step 3) AND `enabled_opponent` (Step 4) independently fire. The existing test validates priority via Step 3 early-return path only — it does not independently verify Step 4 would have fired.

**Constraint that makes this hard**: When `correctCol` is a winning move, `bm(moves + correctCol)` hits a terminal position that the solver rejects with "Invalid position." Step 4's `after_correct` comparison becomes uncomputable. So the position needs:
- `correctCol` NOT an immediate win (both continuations must be valid non-terminal)
- Step 1 doesn't fire (no `forced_block` before)
- Step 2 doesn't fire (opponent gets no `immediate_threat` 1-ply after)
- Step 3 fires (blunderer loses a pattern: `z_threat`, `double_threat`, `figure_7`, `j_shape`, `undercut`, etc.)
- Step 4 fires (opponent gains a pattern 2-ply ahead)

**Movestrings investigated and what they demonstrate**:
- `33333444454552664` + playedCol=6: Step 2 fires (Red gets `immediate_threat` 1-ply after) — good enabled_opponent Step 2 case, but short-circuits before Steps 3/4.
- `33333444454555664` + playedCol=0: Step 3 fires (`z_threat` missed_own), but correctCol=2 wins immediately so Step 4 can't be computed (solver rejects terminal position).
- `021353342445` + playedCol=0: Step 3 fires (`z_threat` missed_own); Step 4 independent verification not done.

**To resolve in Epic 2**: Search the `puzzles` table for positions where `category` is a middle-tier pattern (`double_threat`, `z_threat`, `figure_7`, `j_shape`, `undercut`, `overcut`) and the correct move does NOT end the game. Then test whether a wrong move both loses the pattern AND enables an opponent gain 2-ply ahead.

## Other open items for Epic 2

- Pre-existing classifier.test.js:83 failure (forbidden_columns → suboptimal_move) — not caused by this epic, not yet fixed.
- detectDoubleThreat behavior change may affect explainSimulate callers — verify in Epic 2.
- `classifyAll` and `classifyBestMove` audit: research.md §5 was corrected — classifyAll IS called from server/index.js and classify_all.mjs (research.md originally said zero callers). Epic 2 should audit before retirement.
- Solver rejects won/terminal positions — any Step 4 computation where `correctCol` ends the game will fail at `bm(moves + correctCol)`. TagBlunder's lazy Step 4 design avoids this when Steps 1-3 return early, but it means positions with winning correct moves can never exercise the full priority cascade.
