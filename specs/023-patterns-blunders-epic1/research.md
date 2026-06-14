# Research: Patterns → Blunders Epic 1

**Date**: 2026-06-06  
**Branch**: `101-new-design`  
**Resolved from**: spec.md handoff context + live codebase inspection

---

## 1. DETECTOR_REGISTRY location

**Decision**: `DETECTOR_REGISTRY` lives in `server/explainSimulate.js`, not `classifier.js`.

All 12 detector functions (`detectImmediateThreat` … `detectClaimeven`) are defined and exported from `classifier.js` and imported by `explainSimulate.js`. The registry is a thin list of references to those functions.

**Implication for `classifyPattern`**: Since `classifyPattern` must live in `classifier.js` (FR-010) and `explainSimulate.js` imports from `classifier.js`, importing `DETECTOR_REGISTRY` from `explainSimulate.js` inside `classifier.js` would create a circular dependency. Resolution: `classifyPattern` calls detector functions directly — all are in the same file. No `DETECTOR_REGISTRY` import is needed.

**Implication for `odd_even_threat`**: `detectOddEvenThreat` exists in `classifier.js` and is used in `classifyAll`, but is NOT in `DETECTOR_REGISTRY` in `explainSimulate.js`. `classifyPattern` must include it because it is a valid blunder tag. Include it in `classifyPattern`'s inline detector list.

---

## 2. `solver.score()` does not exist

**Decision**: Derive a single position score as `Math.max(...scores)` where `scores = await solver.query(ms)`.

The solver singleton (created by `createSolverProcess()` in `c4solver-wrapper.js`) exposes only one method: `query(moveString) → Promise<number[7]>`. There is no `.score()` method.

c4solver scores are from the perspective of the player to move. Score range `[-18, +18]`; 0 = draw; positive = current player wins.

For the `drawing_move` check (FR-020 step 5):
```
preScore  = Math.max(...await solver.query(moves))
postScore = Math.max(...await solver.query(moves + playedCol))
```
Both calls produce a max-over-7-columns value from the perspective of the player to move at the given position. `preScore > 0` means the blunderer was winning; `postScore === 0` means the resulting position is a draw.

Note: columns that are full return a solver score of 0 (not a sentinel) in the raw output. No filtering needed for full columns in the `Math.max` call.

**Verification**: Confirmed by reading `c4solver-wrapper.js` lines 42–71. The `query()` method returns the 7 raw solver scores. No `.score()` wrapper exists anywhere in the server.

---

## 3. `'unknown'` callsites requiring patches before migration (a)

**Decision**: Patch both scripts to replace `'unknown'` fallback with `'suboptimal_move'` before migration (a) runs.

Callsites found:

| File | Line | Context |
|------|------|---------|
| `server/scripts/import_papergames_blunders.mjs` | `let patternTag = 'unknown'` | Default value before classify runs |
| `server/scripts/import_papergames_blunders.mjs` | `VALID_PATTERN_CATEGORIES.has(raw) ? raw : 'unknown'` | Fallback when raw tag not recognized |
| `server/scripts/reprocess_blunders.mjs` | `let patternTag = 'unknown'` | Same pattern |
| `server/scripts/reprocess_blunders.mjs` | `VALID_PATTERN_CATEGORIES.has(raw) ? raw : 'unknown'` | Same pattern |

`server/index.js` uses `'unknown'` only for device UUID defaulting and Stripe plan defaulting — not for `pattern_category`. No patch required.

The VALID_PATTERN_CATEGORIES sets in both scripts also include `'unknown'` — remove it. Add `'suboptimal_move'` to both sets.

These patches are NOT the Epic 2 call-site migration (which replaces `classify()` with `tagBlunder()`). They are a minimal guard to prevent the migration from blocking future script runs.

**Audit confirmation (2026-06-06)**: Re-verified via `rg "'unknown'" server/scripts/ server/index.js`. All four callsites confirmed as documented above. `server/index.js` uses `'unknown'` only for device UUID defaulting (`req.body.uid || 'unknown'`) and Stripe plan defaulting (`plan ?? 'unknown'`), never for `pattern_category`. No new `'unknown'` callsites found. Patches applied: both scripts now default to `'suboptimal_move'`, fallback to `'suboptimal_move'`, and have `'suboptimal_move'` in `VALID_PATTERN_CATEGORIES` in place of `'unknown'`.

---

## 4. `'forbidden_columns'` callsites (informational — no patches required)

| File | Context |
|------|---------|
| `server/index.js` | Route handler `if (category === 'forbidden_columns')` — game routing, not blunder insert |
| `server/scripts/import_papergames_blunders.mjs` | `'forbidden_columns'` in VALID_PATTERN_CATEGORIES set |
| `server/scripts/reprocess_blunders.mjs` | `'forbidden_columns'` in VALID_PATTERN_CATEGORIES set |

None of these actively insert `'forbidden_columns'` as a blunder tag today — they just list it as valid. The tag stays in the new CHECK constraint as a legacy-tolerated value. No patches required.

**Audit confirmation (2026-06-06)**: Re-verified via `rg "'forbidden_columns'" server/scripts/ server/index.js`. Three callsites confirmed: `server/index.js` route handler (`category === 'forbidden_columns'`, game routing), and list entries in both scripts' `VALID_PATTERN_CATEGORIES` sets. No callsite inserts `forbidden_columns` as a blunder tag. No patch required.

---

## 5. `classifyAll` and `classifyBestMove` callers

**Decision**: Neither function is retired in this epic.

`rg classifyAll server/` — zero external callers. The function is defined and exported in `classifier.js:1217` but never called outside `classifier.js`.

`rg classifyBestMove server/` — zero external callers. Defined and exported at `classifier.js:1245`, never called outside.

Both functions remain exportable and callable. Their caller audit is complete: they exist for future use or as legacy code pending Epic 2 retirement review.

---

## 6. Detector perspective audit (FR-003 output)

All 13 detectors currently derive perspective from `board.currentPlayer` (or the equivalent `board.movestring.length % 2`). None accept an explicit `perspective` parameter.

| Detector | Perspective derivation | Retrofit needed |
|----------|----------------------|-----------------|
| `detectImmediateThreat(board)` | `board.immediateThreats(board.currentPlayer)` | YES |
| `detectDoubleThreat(board)` | `board.currentPlayer` in `reachableThreats(board.currentPlayer)` | YES |
| `detectForcedBlock(board, scores)` | `board.currentPlayer` / `board.opponent` | YES |
| `detectForcedWin(board, scores)` | `board.currentPlayer` | YES |
| `detectForbiddenColumns(board, scores)` | `board.currentPlayer` / `board.opponent` | YES |
| `detectZThreat(board, scores)` | `board.currentPlayer` in `checkWin` call | YES |
| `detectOddEvenThreat(board, scores)` | `board.currentPlayer !== 1` guard | YES |
| `detectUndercut(board, scores)` | `board.currentPlayer` / `board.opponent` | YES |
| `detectOvercut(board, scores)` | `board.currentPlayer` / `board.opponent` | YES |
| `detectFigure7(board, scores)` | `board.currentPlayer` | YES |
| `detectJShape(board, scores)` | `board.currentPlayer` | YES |
| `detectClaimodd(board, scores)` | `board.currentPlayer !== 1` guard | YES |
| `detectClaimeven(board, solver)` | `board.movestring.length % 2 === 0` guard | YES |

**Retrofit pattern**: add `perspective = board.currentPlayer` as the last parameter to each detector. Replace all references to `board.currentPlayer` (where perspective-sensitive) with the `perspective` parameter. The default ensures `classify()` callers are unaffected.

**Medium-risk detector**: `detectClaimeven` — currently uses `board.movestring.length % 2 === 0` as a Yellow-turn guard. Retrofit to `perspective !== 2`. The solver handle used remains the explicit parameter already present in the signature.

**Audit confirmation (2026-06-06)**: Re-verified via `rg DETECTOR_REGISTRY server/` and `rg '^export (async )?function detect' server/classifier.js`. The registry lives only in `explainSimulate.js` (12 entries). All 13 detector functions exist in `classifier.js` with the names listed above. `detectOddEvenThreat` is correctly NOT in `DETECTOR_REGISTRY` (as documented in §1). Every detector currently derives perspective from `board.currentPlayer` — none has a `perspective` parameter yet. The 12th entry `detectClaimeven` is marked `isAsync: true` in the registry (consistent with its solver-dependent detection).

---

## 7. Degenerate position detection

**Decision**: Use `board.hasWon(1) || board.hasWon(2)` and `moves.length >= 42`.

`Board.hasWon(player)` exists (cached) at `classifier.js:313`. Combined with a move-count check, this covers all terminal/degenerate states. Detection MUST happen before any solver calls to ensure the `"degenerate position:"` branch fires instead of `"solver error:"`.

---

## 8. Migration numbering

**Decision**: Next available sequential migration numbers are 032, 033, 034.

Last existing migration: `031_deep_reveal_failures.sql`.

Migration files:
- `032_blunders_new_tags.sql` — migration (a): TRUNCATE + CHECK constraint update
- `033_blunders_reason.sql` — migration (b): `reason TEXT` column
- `034_blunders_direction.sql` — migration (c): `direction TEXT` column

---

## 9. `classifyPattern` scores requirement

`classifyPattern(ms, perspective, solver)` needs solver scores for most detectors (`detectForcedBlock`, `detectForcedWin`, `detectForbiddenColumns`, `detectZThreat`, `detectOddEvenThreat`, `detectUndercut`, `detectOvercut`, `detectFigure7`, `detectJShape`, `detectClaimodd`). These all take `(board, scores)`.

The function will call `solver.query(ms)` once at the start to get the 7-column scores, then pass them to all score-dependent detectors. This adds one solver round-trip at the beginning of each `classifyPattern` call.

For `tagBlunder`, this means each `P(ms, player)` call costs approximately 1 (scores) + up to 60 (claimeven) solver queries.

---

## 10. `bm(ms)` implementation

`bm(ms) = argmax(solver.query(ms))` with lowest-index tie-break.

```js
const scores = await solver.query(ms);
const maxScore = Math.max(...scores);
const bestCol = scores.indexOf(maxScore); // indexOf finds lowest index on tie
```

Used in `tagBlunder` to compute `after_blunder` and `after_correct` (one solver call each).
