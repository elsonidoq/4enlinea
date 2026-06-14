# Implementation Plan: Patterns → Blunders Epic 3 — Coach Explanation Rebuild

**Branch**: `101-new-design` | **Date**: 2026-06-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/025-patterns-blunders-epic3/spec.md`

---

## Summary

Replace `explainSimulate`-based LLM grounding in `buildExplainContext` with a unified two-sided
approach: `tagBlunder` describes what went wrong (blunder path), `classifyPattern` on the
best-move board describes what the best move achieves (optimal-move path). Ship `REASON_TEMPLATES`
and `POSITIVE_TEMPLATES` in a new `server/blunderReasons.js` module. Extend `classifyPattern` to
return `Map<string, {cells: string[]}>` (from `Set<string>`), adapting all callers atomically.
Delete `explainSimulate.js` and remove `classifyAll` from `classifier.js`. Add migration 035 for
`explanation_cache.template_version`.

---

## Technical Context

**Language/Version**: Node.js ESM (`node:test`, `node:assert/strict`), server-side only  
**Primary Dependencies**: `classifier.js` (tagBlunder, classifyPattern), `llmCoachHelpers.js`,
`server/index.js` (`buildExplainContext`, `/api/explain-move-llm`), `annotationGate.js`
(validateAnnotation, P1–P6 checks), `explainSimulate.js` (removal target), `blunderTags.js`  
**Storage**: PostgreSQL via Supabase — `explanation_cache` table (adding `template_version` column)  
**Testing**: `node --test` (never Jest). Test files in `connect-four/tests/blunder/`. Added to
`test` and `test:fast` scripts in `package.json` when ready.  
**Target Platform**: Node.js 20.6+ server process (ESM, `--env-file` for .env)  
**Performance Goals**: No regression — `tagBlunder` (up to 60+ solver queries) + 2 `classifyPattern`
calls replace 2 `explainSimulate` deep-simulation calls. Overall solver query budget expected to
decrease. Acceptable on post-game, non-UI-blocking path.  
**Constraints**: Atomic commit required for FR-004 + FR-006 + FR-007 (classifyPattern return-type
change + P() adapter + all caller adaptations). Audit E must complete before any FR-005 work.  
**Scale/Scope**: Single server module set; no frontend changes; no i18n changes needed.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Principle I — Explanation Engine as Single Source of Truth**:
- [x] The rework routes all explanations through the same `buildExplainContext` + `validateAnnotation`
  pipeline. LLM grounding is now classifier-derived (`tagBlunder` + `classifyPattern`), not
  simulation-speculative. This tightens compliance with Principle I.

**Principle II — Code Quality & Simplicity**:
- [x] Removing 520-line `explainSimulate.js`, three prompt-builder functions, and the four-type
  dispatch is a net simplification. The new `buildBlunderExplainPrompt` is a single unified builder.
- [x] `REASON_TEMPLATES` and `POSITIVE_TEMPLATES` are plain Maps — no abstraction overhead.
- [x] No speculative abstractions introduced.

**Principle III — Testing Standards**:
- [x] FR-T02 and FR-T03 use real solver binary (not mocked). FR-T04/T05 use real
  `buildExplainContext` logic extracted as testable helper. FR-T06 corpus gate uses DB-sourced
  movestrings.
- [x] All fixture movestrings must be sourced from DB or codebase history — never invented.
- [x] `feedback_no_random_boards.md` invariant explicitly honored in FR-006a, FR-T02, FR-T03.

**Principle VI — Implementation & Debugging Methodology**:
- [x] Audit A–E are required pre-implementation steps that map all removal surfaces before any
  code is deleted. This satisfies "map data dependencies before writing."
- [x] Audit E requires reading every `detect*` function return shape empirically — no guessing.

**Principle VIII — Documentation as First-Class Deliverable**:
- [x] `server-conventions.md` must be updated to remove the `explainSimulate` section and update
  the `classifyPattern` API signature description after the epic ships.
- [x] `server-conventions.md` `LLM Coach Helpers` section must be updated: remove the four
  type-dispatch builder references; document `buildBlunderExplainPrompt`.
- [x] `docs/architecture/db-schema.md` must document the new `template_version` column.
- [x] `testing-conventions.md` must confirm that new blunder test files have been added to the
  `test` and `test:fast` scripts.

**No constitution violations.** No complexity tracking required.

---

## Project Structure

### Documentation (this feature)

```text
specs/025-patterns-blunders-epic3/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (speckit-tasks)
```

### Source Code (affected files)

```text
connect-four/server/
├── blunderReasons.js          # NEW — REASON_TEMPLATES + POSITIVE_TEMPLATES
├── classifier.js              # MODIFY — classifyPattern Map return; detector cells; tagBlunder P()
├── llmCoachHelpers.js         # MODIFY — add buildBlunderExplainPrompt; remove old type builders
├── index.js                   # MODIFY — buildExplainContext rework; delete /api/recommend-move; debug endpoint; template_version
├── explainSimulate.js         # DELETE (after zero-caller confirmation)
├── explainSimulate.test.js    # DELETE (with the source)
├── scripts/
│   ├── classify_all.mjs           # MODIFY — use classifyPattern both perspectives
│   ├── corpus_annotation_check.mjs  # NEW — FR-T06 automated corpus gate
│   ├── review_feedback.mjs        # DELETE
│   ├── explain_move.mjs           # DELETE
│   ├── explain_simulate.mjs       # DELETE
│   └── recommend_next_move.mjs    # DELETE
└── migrations/
    └── 035_explanation_cache_template_version.sql  # NEW

connect-four/src/pages/
└── HomePage.jsx               # DELETE — entire file is unrouted dead code on this branch

connect-four/src/components/
└── RecommendCoach.jsx         # DELETE — only consumed by HomePage.jsx (no other callers)

connect-four/tests/blunder/
├── blunderReasons.test.js     # NEW — FR-T01
├── classifyPatternCells.test.js # NEW — FR-T02
├── tagBlunderPAdaptation.test.js # NEW — FR-T03
└── buildExplainContext.test.js   # NEW — FR-T04, FR-T05
```

---

## Phase 0: Research

*(All required findings below are empirically confirmed from reading the codebase.
No NEEDS CLARIFICATION items remain.)*

---

### research.md

#### R-001: Audit A — `explainSimulate` callers

**Command**: `rg explainSimulate connect-four/server/ --no-heading -l`

**Findings**:

| File | Usage | Action |
|---|---|---|
| `server/explainSimulate.js` | Definition (the file itself) | Delete |
| `server/llmCoachHelpers.js` | Uses `DETECTOR_REGISTRY`, imports for type-dispatch helpers | Rework (FR-009) |
| `server/classifier.js` | NOTE: `classifyPattern` inline detector comment says it must stay in sync with `DETECTOR_REGISTRY` in `explainSimulate.js` — this comment is the only coupling | Update comment after deletion |
| `server/index.js` | Called from `buildExplainContext` (two parallel calls for types 2/3/4), imported at top | Rework (FR-008); also delete the `/api/recommend-move` endpoint (see below) |
| `server/index.js` | `/api/recommend-move` endpoint calls `explainSimulate` directly — dead code: `RecommendCoach.jsx` is only used in the old `HomePage.jsx` sparring flow which no longer runs on this branch (sparring now uses `GameScreen.jsx`) | Delete endpoint |
| `src/pages/HomePage.jsx` | Entire file is unrouted dead code on this branch | Delete the file outright |
| `src/components/RecommendCoach.jsx` | Only consumed by `src/pages/HomePage.jsx` (no other callers) | Delete the file outright |
| `server/scripts/review_feedback.mjs` | Imports `explainSimulate` for offline prompt rebuild | Delete script |
| `server/scripts/explain_move.mjs` | CLI script that calls `explainSimulate` directly | Delete script |
| `server/scripts/explain_simulate.mjs` | CLI wrapper around `explainSimulate` | Delete script |
| `server/scripts/recommend_next_move.mjs` | Imports `explainSimulate` for offline recommend flow | Delete script |
| `server/explainSimulate.test.js` | Test file for `explainSimulate` | Delete with the source |

**Consumed fields from result**: `groups` (Map), `patterns` (by pattern name), `timing`.
`buildExplainContext` consumes `groups` from both parallel calls, passes them to `selectTopGroups`
→ `buildAllowedSet`.

**Removal plan**: Perform all deletions as a batch before T16. The full deletion sequence is:
1. Delete the four CLI scripts: `review_feedback.mjs`, `explain_move.mjs`, `explain_simulate.mjs`, `recommend_next_move.mjs`.
2. Delete the `/api/recommend-move` endpoint block from `server/index.js`.
3. Delete `src/pages/HomePage.jsx` (entire file — unrouted dead code) and `src/components/RecommendCoach.jsx` (its only consumer).
4. Re-run Audit A to confirm zero live callers remain.
5. Delete `explainSimulate.js` and `explainSimulate.test.js`.

---

#### R-002: Audit B — `classifyAll` callers

**Command**: `rg classifyAll connect-four/server/ --no-heading -l`

**Findings**:

| File | Usage | Replacement |
|---|---|---|
| `server/explainSimulate.js` | Definition only (not a caller) | Deleted with file |
| `server/classifier.js` | Definition (the function itself) | Delete the function after all callers adapted |
| `server/index.js` | `/api/debug/classify-all` endpoint (~line 2055) | Replace with two `classifyPattern` calls (Red + Yellow) |
| `server/scripts/classify_all.mjs` | CLI script | Replace with two `classifyPattern` calls |

**Plan**: FR-020 adapts the debug endpoint; FR-021 adapts the script; FR-022 confirms zero hits
then deletes `classifyAll` from `classifier.js`.

---

#### R-003: Audit C — `classifyPattern` callers

**Command**: `rg classifyPattern connect-four/server/ --no-heading -n`

**Findings**:

| File | Line | Usage | Adaptation needed |
|---|---|---|---|
| `server/classifier.js` | ~1364 | Definition | Change return from `Set` to `Map` |
| `server/classifier.js` | ~1430 | `tagBlunder` P() helper: `const P = (ms, player) => classifyPattern(ms, player, solver)` | Adapt to `new Set((await classifyPattern(...)).keys())` |

No other direct callers found at audit time. The debug endpoint and classify_all.mjs use
`classifyAll`, not `classifyPattern` directly. After FR-004, the new `buildExplainContext` will
be the primary caller of `classifyPattern`.

---

#### R-004: Audit D — `buildExplainContext` top-to-bottom

**Location**: `server/index.js` line ~620–728.

**Current flow**:

1. Build `board`, compute `preScores`, `isSettled`, `contrast`, `gap/gapBucket/inverted`.
2. Compute `opponentResponseMovestring` via `getOpponentResponseMs` (used for Type 2 classification
   and for the third board visualization).
3. `classifyExplanationType(board, postBoard, opponentResponseMovestring, perspective, col)`
   → `{type: 'type1'|'type2'|'type3'|'type4'}`.
4. **Type 1 path**: `buildType1AllowedSet(board, perspective)` → `allowedSet` (no simulation).
5. **Types 2/3/4 path**: parallel `explainSimulate` calls on `postMovestring` and
   `movestring + contrastCol` → `selectTopGroups` → `buildAllowedSet` → `allowedSet`.
6. Build board visualizations (3x: pre, post, after-opponent-response).
7. `buildGroupContextBlock(topGroups, allowedSet, postBoard, perspective, {...})`.
8. Dispatch to `buildType12Prompt`, `buildType3Prompt`, or `buildType4Prompt`.

**Functions called exclusively from `buildExplainContext`** (removal candidates):
- `classifyExplanationType` (from `llmCoachHelpers.js`)
- `buildType1AllowedSet` (from `llmCoachHelpers.js`)
- `selectTopGroups` (from `llmCoachHelpers.js`)
- `buildAllowedSet` (from `llmCoachHelpers.js`)
- `buildGroupContextBlock` (from `llmCoachHelpers.js`)
- `buildType12Prompt`, `buildType3Prompt`, `buildType4Prompt` (from `llmCoachHelpers.js`)

**Functions retained from `buildExplainContext`**:
- `checkAllMovesEqual` — retained unchanged
- `selectContrastMove` — retained unchanged; early-return on `null` retained
- `getGapAndFraming` — retained unchanged
- `getBoardVisualization` — retained unchanged
- `getOpponentResponseMs` — retained; used by `buildExplainContext` for board viz (third board);
  also used by `scripts/explain_move.mjs`. **Do not delete without verifying all call sites.**
- `validateAnnotation` gate — retained unchanged

---

#### R-005: Audit E — Detector return shapes (cells derivation plan for FR-005)

**Method**: Read every `detect*` function in `classifier.js` and record actual return value shape.

| Detector | Return shape when matched | `cells` derivation for FR-005 |
|---|---|---|
| `detectImmediateThreat` | `{ matched: true, cols }` — col indices (gravity-top threats) | Map each col to landing row: `"c${col+1}r${board.colHeights[col]+1}"` |
| `detectDoubleThreat` | `{ matched: true, cols: [...gravityTopCols] }` — col indices | Same as `detectImmediateThreat` |
| `detectForcedWin` | `{ matched: true }` — solver-score based, no spatial output | POSITION-GLOBAL: `cells: []`. No column anchor derivable. When `forced_win` is the sole or dominant pattern, `allowedSet` is set to `null` (not `[]`) so `validateAnnotation` skips the P5strong check entirely. |
| `detectForcedBlock` | `{ matched: true }` — solver-score based (same IIFE pattern as ForcedWin) | POSITION-GLOBAL: `cells: []`. Same null-allowedSet treatment as `forced_win`. |
| `detectForbiddenColumns` | `{ matched: true }` — solver-score based (same IIFE pattern) | POSITION-GLOBAL: `cells: []`. Same null-allowedSet treatment. |
| `detectZThreat` | `{ matched: true }` — parity count only, no per-cell spatial output | COLUMN-ANCHORED ABSTRACT-ONLY: `cells: []`. The z_threat capsule column (the odd-parity column) is derivable from `board.colHeights` independently of the detector return value. In `buildExplainContext`, when `z_threat` is matched, compute `capsuleCol = columns.find(c => (board.height - board.colHeights[c]) % 2 === 1)` and emit `{ col: capsuleCol, parity: 'odd', zoneSpec: 'tg' }` as an ABSTRACT-ONLY allowedSet entry. |
| `detectOddEvenThreat` | `{ matched: true }` — two-move check, no per-cell spatial output | POSITION-GLOBAL: `cells: []`. Same null-allowedSet treatment as `forced_win`. |
| `detectClaimodd` | `{ matched: true, correctCol: 3 }` — single col index only | CONCRETE-ELIGIBLE via landing cell: `"c4r${board.colHeights[3]+1}"` (correctCol is always 3) |
| `detectClaimeven` | `{ matched: ... }` — simulation-based, no per-cell spatial output | POSITION-GLOBAL: `cells: []`. Same null-allowedSet treatment. |
| `detectUndercut` | `{ matched: true, highlightMetadata: { type: 'cells', cells: [{column, row, role}, ...] } }` | Map `highlightMetadata.cells` → `"c${c.column+1}r${c.row+1}"` |
| `detectOvercut` | `{ matched: true, highlightMetadata: { type: 'cells', cells: [{column, row, role}, ...] } }` | Same as `detectUndercut` |
| `detectFigure7` | `{ matched: true, highlightMetadata: { type: 'cells', cells: [...] }, correctCol, categoryEvidence }` | Map `highlightMetadata.cells` → `"c${c.column+1}r${c.row+1}"` |
| `detectJShape` | `{ matched: true, highlightMetadata: { type: 'cells', cells: [...] }, correctCol, categoryEvidence }` | Same as `detectFigure7` |

**When `matched` is `false`**: `cells: []` (never undefined or absent).

**Known-correct rules confirmed by audit** (as required by spec):
- `detectImmediateThreat` and `detectDoubleThreat` return `{ matched, cols }` — column indices.
  Map each column index to landing-row cell: `"c${col+1}r${colHeights[col]+1}"`. ✓
- `detectForcedWin` is solver-score based with no spatial output. Must emit empty `cells`. ✓

**Additional findings**:
- `detectUndercut`, `detectOvercut`, `detectFigure7`, `detectJShape` already carry rich spatial
  output in `highlightMetadata.cells` (`{column, row}` objects). These translate directly to
  wire-format strings. No new geometry computation needed.
- `detectClaimodd` carries `correctCol: 3` — the center column is the only valid claimodd move.
  Map to one landing-cell entry.
- All remaining detectors (ZThreat, OddEvenThreat, ForcedBlock, ForbiddenColumns, Claimeven)
  have no spatial output and must be ABSTRACT-ONLY.

---

#### R-006: `getOpponentResponseMs` — retain or remove?

**Finding**: `getOpponentResponseMs` is called in:
- `server/index.js` (`buildExplainContext`) — for computing `opponentResponseMovestring` used
  in the third board visualization (`afterOpponentBoardViz`).
- `server/scripts/explain_move.mjs` — CLI script. **This script is deleted in this epic (see
  R-001 removal plan)**, so this call site is removed.

**Decision**: **Retain** in `llmCoachHelpers.js`. The new `buildExplainContext` still builds
a third board visualization for `enabled_opponent` direction paths. The CLI caller
(`explain_move.mjs`) is deleted, but the `buildExplainContext` usage alone justifies retention.

---

#### R-007: Migration number for `explanation_cache.template_version`

**Finding**: Last migration in `connect-four/server/migrations/` is `034_blunders_direction.sql`.
Next available number: **035**.

**File**: `connect-four/server/migrations/035_explanation_cache_template_version.sql`

---

#### R-008: `DETECTOR_REGISTRY` reconciliation plan (prerequisite for explainSimulate deletion)

`server-conventions.md` states: "`classifyPattern` maintains its own inline list of 13 detectors.
This list MUST be kept in sync with `DETECTOR_REGISTRY` in `explainSimulate.js`."

**Plan**: Before deleting `explainSimulate.js`, read both lists side-by-side and verify they
contain the same 13 detector entries. If they have drifted, update `classifyPattern`'s inline
list to match the fuller set. After deletion, the `classifyPattern` inline list becomes the
sole registry. The comment in `server-conventions.md` must be updated to remove the reference
to `explainSimulate.js`.

---

#### R-009: `oppBestCol` derivation for `enabled_opponent` direction (FR-008)

The `enabled_opponent` augmentation in `buildExplainContext` requires computing `oppBestCol` —
the opponent's best response after the blunder. This is the same `selectContrastMove` / solver
score-ranking logic already used in `buildExplainContext`:

```js
const oppScores = await solver.query(movestring + playedCol);
const oppBestCol = oppScores.indexOf(Math.max(...oppScores.filter(s => s !== -1000)));
```

No new solver API or helper needed. Use `solver.query` directly, filter INVALID_MOVE (-1000)
sentinels, take argmax with lowest-index tie-break.

---

#### R-010: `allowedSet` entry shape for classifyPattern-derived entries

The existing `AllowedSetEntry` shape (from spec 021 / annotationGate) accepts:
- CONCRETE-ELIGIBLE: `{ cells: string[], zoneSpec: string }` — cells is non-empty.
- ABSTRACT-ONLY: `{ col: number, parity: string, zoneSpec: string }` — no cells field.

For the new `buildExplainContext`, three tiers of grounding exist:

**Tier 1 — CONCRETE-ELIGIBLE** (non-empty `cells` from detector):
`immediate_threat`, `double_threat`, `claimodd`, `undercut`, `overcut`, `figure_7`, `j_shape`.
Emit: `{ cells, zoneSpec: 'tg' }`.

**Tier 2 — COLUMN-ANCHORED ABSTRACT-ONLY** (no cells, but column derivable from position):
`z_threat` only. The odd-parity capsule column is derived in `buildExplainContext` from
`board.colHeights`, not from the detector return value. Emit: `{ col: capsuleCol, parity: 'odd', zoneSpec: 'tg' }`.

**Tier 3 — POSITION-GLOBAL** (no cells, no derivable column anchor):
`forced_win`, `forced_block`, `forbidden_columns`, `odd_even_threat`, `claimeven`.
These patterns cannot ground the LLM to any specific board cell or column. They contribute only
to `humanReason`/`positiveReason` template lookup.

**`allowedSet` null rule**: When **all** matched patterns across all `classifyPattern` calls are
Tier 3 (no Tier 1 or Tier 2 entries exist), pass `allowedSet = null` (not `[]`) to
`validateAnnotation`. This causes `validateAnnotation` to skip the P5strong check entirely,
leaving the LLM unconstrained in which cells it references. An empty array `[]` would cause
every `tg` zone to fail P5strong — that is the bug this rule prevents. If at least one
Tier 1 or Tier 2 entry exists, build `allowedSet` normally from those entries.

**Decision**: Tier 1 and Tier 2 entries are emitted into `allowedSet`. Tier 3 patterns contribute
to template lookup only. When all matched patterns are Tier 3, pass `null` to `validateAnnotation`.

---

## Phase 1: Design & Contracts

### data-model.md

#### DM-001: `explanation_cache` schema change

**Migration 035** — adds one nullable column:

```sql
-- connect-four/server/migrations/035_explanation_cache_template_version.sql
ALTER TABLE explanation_cache ADD COLUMN IF NOT EXISTS template_version TEXT;
```

No DEFAULT clause. Old rows stay NULL. New rows are written with `template_version = 'v2'`
by the server. No data backfill. No index needed (column is for operator inspection only).

---

#### DM-002: `REASON_TEMPLATES` map structure

Module: `connect-four/server/blunderReasons.js`

```js
export const REASON_TEMPLATES = new Map([
  ['immediate_threat:missed_own',     "You had a winning move right there and didn't take it."],
  ['immediate_threat:enabled_opponent', "That move handed your opponent an immediate win."],
  ['forced_block:defensive_miss',     "Your opponent was about to win. You had to block and didn't."],
  // ... 20 more entries per FR-002 table
]);

export const POSITIVE_TEMPLATES = new Map([
  ['immediate_threat', "You spotted the immediate win and took it — the clearest winning move available."],
  // ... 11 more entries per FR-003b table
]);
```

**Key invariant**: Both maps are lookup-only. Neither is imported by `tagBlunder`. Neither value
is stored to DB. Generic fallbacks:
- `REASON_TEMPLATES` miss: `"A stronger move was available."`
- `POSITIVE_TEMPLATES` miss or empty patterns: `"This was the strongest move available."`

---

#### DM-003: `classifyPattern` new return type

```
Before: Promise<Set<string>>
After:  Promise<Map<string, { cells: string[] }>>
```

Wire-format cell string: `"c{col+1}r{row+1}"` (1-indexed, matching annotationGate convention).

`cells: []` on ABSTRACT-ONLY detectors. `cells: [...]` on CONCRETE detectors. Never undefined.

---

#### DM-004: `buildBlunderExplainPrompt` parameters

```js
buildBlunderExplainPrompt({
  tag,            // string | null — null on optimal-move path
  direction,      // 'missed_own' | 'enabled_opponent' | 'defensive_miss' | null
  humanReason,    // string from REASON_TEMPLATES | null
  positiveReason, // string from POSITIVE_TEMPLATES (keyed by highest-priority tag per blunder cascade ordering) | null
  correctMovePatterns,  // Map<string, {cells: string[]}> from classifyPattern(ms + bestCol)
  boardViz,       // string (pre-move board)
  postBoardViz,   // string (post-move board)
  playerName,     // 'Green' | 'Grey'
  gap,            // number
  gapBucket,      // 'small' | 'moderate' | 'large'
  allowedSet,     // AllowedSetEntry[] — passed to validateAnnotation
})
→ string (prompt)
```

---

### contracts/

#### contracts/blunderReasons-api.md

```
Module: connect-four/server/blunderReasons.js
Exports: REASON_TEMPLATES, POSITIVE_TEMPLATES

REASON_TEMPLATES: Map<string, string>
  Key format: "${tag}:${direction}"
  Required keys: 23 entries (see FR-002 in spec.md)
  Generic fallback (caller-side): "A stronger move was available."

POSITIVE_TEMPLATES: Map<string, string>
  Key format: "${tag}" (no direction suffix)
  Required keys: 12 entries (see FR-003b in spec.md)
  Generic fallback (caller-side): "This was the strongest move available."

Invariants:
  - Never imported by tagBlunder
  - Never stored to DB
  - Never returned to clients
  - Applied only inside buildBlunderExplainPrompt
```

#### contracts/classifyPattern-v2-api.md

```
Function: classifyPattern(ms, perspective, solver)
Module: connect-four/server/classifier.js

Before (v1): Promise<Set<string>>
After (v2):  Promise<Map<string, { cells: string[] }>>

cells wire format: "c{col+1}r{row+1}" (1-indexed)
cells: [] when detector has no spatial output (ABSTRACT-ONLY)

Callers that need only tag names (set-membership):
  new Set(result.keys())

tagBlunder P() helper (MUST ship in same commit as signature change):
  const P = async (ms, player) => new Set((await classifyPattern(ms, player, solver)).keys())
```

#### contracts/buildExplainContext-v2.md

```
Function: buildExplainContext(movestring, col, rounds = 1)
Module: connect-four/server/index.js (private to the module)

Returns:
  null                                        — no contrast move available
  { prompt: null, allowedSet: null, allMovesEqual: true }  — all moves settled
  { prompt: string, allowedSet: AllowedSetEntry[] }        — normal path

Two-sided grounding flow:
  Blunder path (col ≠ bestCol, inverted == false):
    tagBlunder(movestring, col, bestCol, solver) → {tag, reason, direction}
    classifyPattern(movestring + bestCol, perspective, solver) → correctMovePatterns
    REASON_TEMPLATES.get(`${tag}:${direction}`) ?? "A stronger move was available." → humanReason

  Optimal path (col == bestCol, inverted == true):
    classifyPattern(movestring + col, perspective, solver) → correctMovePatterns
    tag = null, direction = null, humanReason = null

  allowedSet derivation (both paths):
    Base: union of classifyPattern(movestring, ...) + classifyPattern(movestring + bestCol, ...)
    enabled_opponent augmentation: classifyPattern(movestring + playedCol + oppBestCol, opponentPerspective, ...)
    defensive_miss augmentation: classifyPattern(movestring, opponentPerspective, ...) filtered to
      forced_block + immediate_threat entries only
    Tier 1 entries (non-empty cells) → CONCRETE-ELIGIBLE: { cells, zoneSpec: 'tg' }
    Tier 2 entries (z_threat, column derived from board.colHeights) → ABSTRACT-ONLY: { col, parity: 'odd', zoneSpec: 'tg' }
    Tier 3 entries (forced_win, forced_block, odd_even_threat, claimeven, forbidden_columns) → template lookup only, not emitted into allowedSet
    NULL rule: if only Tier 3 patterns matched across all calls, pass allowedSet=null (not []) to validateAnnotation

Retained unchanged: checkAllMovesEqual, selectContrastMove, getGapAndFraming,
  getBoardVisualization, getOpponentResponseMs, validateAnnotation gate
```

---

### quickstart.md

#### Implementation Quick Reference

**Atomic commit required**: FR-004 (classifyPattern return type) + FR-006 (P() adapter) +
FR-007 (all callers) must land in the same commit. Stagger: implement FR-005 (detector cells)
first so the Map values are ready before the return type changes.

**Task ordering (dependency-safe)**:

```
Pre-work:
  T01  Audit A–E (document findings in research.md) — no code changes
  T02  Migration 035 — explanation_cache.template_version column

Module creation (no dependencies):
  T03  Create server/blunderReasons.js (REASON_TEMPLATES + POSITIVE_TEMPLATES)
  T04  Unit test FR-T01 (blunderReasons.test.js) — add to package.json scripts

Detector extension (pre-requisite for T06):
  T05  Extend detector return shapes — add cells to each detect* function per Audit E mapping
       (undercut/overcut/figure7/jshape: read from highlightMetadata.cells;
        immediateThreat/doubleThreat: derive from cols + colHeights;
        claimodd: derive from correctCol + colHeights;
        all others: empty cells [])

Atomic classifyPattern change (T05 must be done first):
  T06  classifyPattern: change return Set → Map; P() adapter; all caller adaptations
       (Must be one commit: classifier.js Map return + tagBlunder P() adaptation)
  T07  Unit tests FR-T02 (classifyPatternCells) and FR-T03 (tagBlunderPAdaptation) — add to scripts

Prompt builder (no dependency on T06, but T03 must be done):
  T08  Add buildBlunderExplainPrompt to llmCoachHelpers.js

Explain context rework (T06 + T08 must be done):
  T09  Rework buildExplainContext (remove type1/2/3/4 dispatch, use tagBlunder + classifyPattern)
       Note: Do NOT delete old functions yet — rework and test first
  T10  Integration tests FR-T04, FR-T05 (buildExplainContext.test.js) — add to scripts
  T11  Wire template_version = 'v2' on explanation_cache inserts (FR-017)

Cleanup (T09 + T10 must pass first):
  T12  Remove old prompt builders and type-dispatch functions from llmCoachHelpers.js (FR-009)
       getOpponentResponseMs: verify no callers other than buildExplainContext (CLI scripts deleted)
  T13  Adapt debug endpoint /api/debug/classify-all (FR-020)
  T14  Adapt scripts/classify_all.mjs (FR-021)
  T15  Confirm zero classifyAll hits, delete classifyAll from classifier.js (FR-022)

Dead-code removal (prerequisite for T16):
  T16a Delete four CLI scripts: review_feedback.mjs, explain_move.mjs, explain_simulate.mjs,
       recommend_next_move.mjs (all import explainSimulate; all dead code on current branch)
  T16b Delete /api/recommend-move endpoint block from server/index.js (calls explainSimulate;
       dead because RecommendCoach.jsx is only in dead-code HomePage.jsx sparring flow)
  T16c Delete src/pages/HomePage.jsx and src/components/RecommendCoach.jsx (both are dead code)
  T16d Re-run Audit A (rg explainSimulate connect-four/) — must return zero hits before T16e

  T16  Confirm zero explainSimulate hits, delete explainSimulate.js + explainSimulate.test.js (FR-018, FR-019)
       DETECTOR_REGISTRY reconciliation must happen before this step

Quality gates:
  T17  Write corpus_annotation_check.mjs (FR-T06 automated corpus gate ≥50 positions, ≥95% pass)
  T18  Update docs (server-conventions.md, db-schema.md, testing-conventions.md)
```

**Key sequencing constraints**:

1. **T05 before T06**: Detectors must emit `cells` before `classifyPattern` can build the Map.
2. **T06 is atomic**: classifyPattern return-type change + P() adapter + all callers in one commit.
   If the commit is split, `tagBlunder` silently breaks between commits.
3. **T08 before T09**: `buildBlunderExplainPrompt` must exist before `buildExplainContext` calls it.
4. **T09 + T10 before T12**: Do not delete old prompt builders until the new path is tested.
5. **T09 + T10 before T15**: Do not delete `classifyAll` until the debug endpoint and scripts
   are adapted (T13, T14).
6. **T16a–T16d before T16**: All four CLI scripts and the `/api/recommend-move` endpoint must be
   deleted and the Audit A re-run must confirm zero hits before `explainSimulate.js` is deleted.
7. **T16 last**: `explainSimulate.js` deletion requires zero-caller confirmation via Audit A
   re-run (T16d) AND `DETECTOR_REGISTRY` reconciliation.
8. **FR-T06b (manual quality gate)**: Runs after T17 (automated gate passes). Human step;
   blocks shipping if regression found.

**`getOpponentResponseMs` retention rule**: The new `buildExplainContext` still builds a third
board visualization (`afterOpponentBoardViz`) for the `enabled_opponent` direction. Retain
`getOpponentResponseMs`. Note: `explain_move.mjs` (a former CLI caller) is deleted in T16a,
so the only remaining call site is `buildExplainContext` in `server/index.js`.

**`allowedSet` null vs. empty-array rule**: Do NOT pass `[]` to `validateAnnotation` when all
matched patterns are position-global (Tier 3 per R-010). `validateAnnotation` called with `[]`
fails every `tg` zone on P5strong — the LLM produces annotation violations on every response.
The correct fallback is `null`, which causes `validateAnnotation` to skip P5strong entirely.
Rule: if any Tier 1 (non-empty cells) or Tier 2 (z_threat column-anchor) entry exists,
pass the normal `allowedSet` array. If only Tier 3 patterns matched (or no patterns matched),
pass `null`. `buildBlunderExplainPrompt` must handle `null` allowedSet gracefully and must
handle empty `correctMovePatterns` gracefully — use generic fallback sentence in both cases.

**FR-T06 corpus gate execution**: Run after T17 is written. Requires DB access + live solver.
Fetch ≥50 blunder rows from `blunders` table (with `reason` and `direction` populated by Epic 2),
reconstruct `movestring` + `col` from `game_id` join, run `buildExplainContext`, submit to
`validateAnnotation`. ≥95% pass rate (≥48/50) required before shipping.

---

## Complexity Tracking

No constitution violations. No complexity entries required.

---

## Agent Context Update

<!-- SPECKIT START -->
Current plan: specs/025-patterns-blunders-epic3/plan.md
<!-- SPECKIT END -->
