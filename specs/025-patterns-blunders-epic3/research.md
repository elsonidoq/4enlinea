# Research: Patterns → Blunders Epic 3 — Coach Explanation Rebuild

All findings are empirically derived from reading the codebase. No NEEDS CLARIFICATION items.

## R-001: Audit A — `explainSimulate` callers

**Command**: `rg explainSimulate connect-four/server/ --no-heading -l`

**Files with hits**:
- `server/explainSimulate.js` — definition
- `server/llmCoachHelpers.js` — imports for type-dispatch helpers and DETECTOR_REGISTRY reference
- `server/classifier.js` — comment only ("must stay in sync with DETECTOR_REGISTRY")
- `server/scripts/review_feedback.mjs` — offline prompt rebuild
- `server/index.js` — two parallel calls in `buildExplainContext` (types 2/3/4)
- `server/scripts/explain_move.mjs` — CLI script
- `server/explainSimulate.test.js` — test file
- `server/scripts/explain_simulate.mjs` — CLI wrapper

**Fields consumed from result**:
- `groups` (Map) — consumed by `selectTopGroups` → `buildAllowedSet` in `buildExplainContext`
- `patterns`, `timing` — consumed by CLI diagnostic scripts

**Removal plan**: Delete `explainSimulate.js` and `explainSimulate.test.js` after zero-caller
confirmation. Update or delete CLI scripts that import it (`explain_simulate.mjs`,
`explain_move.mjs`, `review_feedback.mjs`).

---

## R-002: Audit B — `classifyAll` callers

**Command**: `rg classifyAll connect-four/server/ --no-heading -l`

| File | Role | Replacement |
|---|---|---|
| `server/classifier.js` | Definition | Delete after all callers adapted |
| `server/explainSimulate.js` | Definition (not a caller) | Deleted with file |
| `server/index.js` | `/api/debug/classify-all` endpoint | Two `classifyPattern` calls (Red + Yellow) |
| `server/scripts/classify_all.mjs` | CLI script | Two `classifyPattern` calls |

---

## R-003: Audit C — `classifyPattern` callers

**Command**: `rg classifyPattern connect-four/server/ --no-heading -n`

| File | Line | Usage | Adaptation |
|---|---|---|---|
| `server/classifier.js` | ~1364 | Definition | Change return `Set` → `Map` |
| `server/classifier.js` | ~1430 | `tagBlunder` P() helper | Adapt to `new Set((await classifyPattern(...)).keys())` |

No other direct callers at audit time. The new `buildExplainContext` will be the primary
call site after the rework.

---

## R-004: Audit D — `buildExplainContext` structure

**Location**: `server/index.js` lines 620–728.

**Current type dispatch**:
- Type 1: `classifyExplanationType` detects immediate threat before move → `buildType1AllowedSet` (no simulation)
- Types 2/3/4: two parallel `explainSimulate` calls → `selectTopGroups` → `buildAllowedSet`
- Dispatch to `buildType12Prompt`, `buildType3Prompt`, or `buildType4Prompt`

**Functions exclusively called from `buildExplainContext`** (all removal candidates after rework):
- `classifyExplanationType`
- `buildType1AllowedSet`
- `selectTopGroups`, `buildAllowedSet`
- `buildGroupContextBlock`
- `buildType12Prompt`, `buildType3Prompt`, `buildType4Prompt`

**Retained**:
- `checkAllMovesEqual`, `selectContrastMove`, `getGapAndFraming`
- `getBoardVisualization`, `getOpponentResponseMs`
- `validateAnnotation` gate

---

## R-005: Audit E — Detector return shapes (Cells Derivation Map)

| Detector | Return when matched | FR-005 cells |
|---|---|---|
| `detectImmediateThreat` | `{ matched, cols }` | `cols.map(c => "c${c+1}r${board.colHeights[c]+1}")` |
| `detectDoubleThreat` | `{ matched, cols }` | Same as above |
| `detectForcedWin` | `{ matched }` | `[]` (ABSTRACT-ONLY) |
| `detectForcedBlock` | `{ matched }` | `[]` (ABSTRACT-ONLY) |
| `detectForbiddenColumns` | `{ matched }` | `[]` (ABSTRACT-ONLY) |
| `detectZThreat` | `{ matched }` | `[]` (ABSTRACT-ONLY) |
| `detectOddEvenThreat` | `{ matched }` | `[]` (ABSTRACT-ONLY) |
| `detectClaimodd` | `{ matched, correctCol: 3 }` | `["c4r${board.colHeights[3]+1}"]` |
| `detectClaimeven` | `{ matched }` | `[]` (ABSTRACT-ONLY) |
| `detectUndercut` | `{ matched, highlightMetadata: { cells: [{column, row},...] } }` | `highlightMetadata.cells.map(c => "c${c.column+1}r${c.row+1}")` |
| `detectOvercut` | `{ matched, highlightMetadata: { cells: [{column, row},...] } }` | Same as undercut |
| `detectFigure7` | `{ matched, highlightMetadata: { cells: [...] }, correctCol }` | Same as undercut |
| `detectJShape` | `{ matched, highlightMetadata: { cells: [...] }, correctCol }` | Same as undercut |

**When `matched == false`**: `cells: []` (required by spec, never undefined).

---

## R-006: `getOpponentResponseMs` — retain

Called from:
- `server/index.js` `buildExplainContext` — for third board visualization
- `server/scripts/explain_move.mjs` — CLI

**Decision**: Retain. The new `buildExplainContext` still builds `afterOpponentBoardViz` for
the `enabled_opponent` direction.

---

## R-007: Next migration number

Last migration: `034_blunders_direction.sql`. Next: **035**.

---

## R-008: DETECTOR_REGISTRY reconciliation

`classifyPattern` (classifier.js line ~1369) maintains an inline list of 13 detectors.
`DETECTOR_REGISTRY` in `explainSimulate.js` has a separate list.
Before deleting `explainSimulate.js`: read both lists side-by-side and confirm identical
coverage. Update `classifyPattern`'s inline list if any drift found.

---

## R-009: `oppBestCol` derivation for enabled_opponent augmentation

No new helper needed. Use `solver.query(movestring + playedCol)` → argmax (ignoring -1000 sentinels).

---

## R-010: `allowedSet` entry shape

Only non-empty-cells entries from `classifyPattern` are emitted into `allowedSet`.
ABSTRACT-ONLY detectors (empty cells) contribute only to `humanReason`/`positiveReason` lookup.
Wire format for CONCRETE entries: `{ cells: string[], zoneSpec: 'tg' }`.
