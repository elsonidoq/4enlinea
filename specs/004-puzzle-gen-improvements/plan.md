# Implementation Plan: Puzzle Generator Improvements

**Branch**: `main` | **Date**: 2026-05-05 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `specs/004-puzzle-gen-improvements/spec.md`

## Summary

Replace the purely-random move-selection loop in `candidate-generator.js` with solver-weighted softmax sampling (temperature ∈ [1,3] per game, seeded PRNG, opening-book pre-loaded for O(1) early-ply lookups). Separately, normalise the puzzle board renderer in `CurationWorkspace.jsx` so the current player at the puzzle position is always displayed as RED, with a persistent "You are RED ●" badge.

## Technical Context

**Language/Version**: Node.js 20 (ESM), React 18  
**Primary Dependencies**: `c4solver` binary (IPC via stdin/stdout), `mulberry32` PRNG (already in codebase), Supabase (storage)  
**Storage**: PostgreSQL via Supabase — `candidates` and `puzzles` tables  
**Testing**: Node built-in `node:test`, real `c4solver` binary (no mocks)  
**Target Platform**: Local admin tool (localhost-only server + React SPA)  
**Performance Goals**: 30-candidate batch completes in under 5 min; no single rollout exceeds 30 s  
**Constraints**: Opening book must be present at startup; same seed must reproduce identical output  
**Scale/Scope**: Internal one-time generation tool; no multi-user concurrency concerns

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Assessment | Action Required |
|-----------|-----------|-----------------|
| I — Explanation Engine as Single Source of Truth | Not triggered — no move evaluations exposed to end users in this feature | None |
| II — Code Quality & Simplicity | `randomPosition` is a self-contained function; replace it in-place, no new abstractions. Display normalisation is a 3-line change to `buildBoard`. | Follow; delete `randomPosition` entirely |
| III — Testing Standards | Solver-weighted sampling is solver-dependent → integration test required with real binary. Player perspective → manual golden-path verification on two fixture boards (even and odd `moveCount`). | Write integration test; manually verify |
| IV — UX Consistency | Badge must use existing CSS variable color scheme (`var(--red)`, `var(--text-muted)`) consistent with rest of admin UI. | Use existing design tokens |
| V — Performance | Book loading at startup amortises solver cost across all rollout plies 1–8 (O(1) per ply). Mid-game plies still require solver IPC but are bounded by `MAX_ATTEMPTS`. | Verify batch completes within 5-min budget |

**Post-Phase-1 re-check**: Pass — design introduces no new abstractions, no new tiers, no performance regressions.

## Project Structure

### Documentation (this feature)

```text
specs/004-puzzle-gen-improvements/
├── plan.md              # This file
├── research.md          # Phase 0: 5 key decisions (book flag, softmax, rollout, perspective, migration)
├── data-model.md        # Phase 1: migration 008, updated insert shape, buildBoard signature
├── contracts/
│   └── api.md           # Phase 1: no new endpoints; generate endpoint contract unchanged
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (files touched)

```text
connect-four/server/
├── candidate-generator.js        MODIFIED — GeneratorSolver loads book; randomPosition() replaced
│                                 with solverWeightedPosition(); isClean() bug fixed
├── index.js                      MODIFIED — candidate insert rows gain user_player field
└── migrations/
    └── 008_user_player.sql       NEW — ADD COLUMN user_player to candidates + puzzles with backfill

connect-four/src/components/
└── CurationWorkspace.jsx         MODIFIED — buildBoard() normalises colors; badge added

connect-four/tests/integration/
└── candidate-generator.test.js   MODIFIED — add board-density and determinism assertions
```

**Structure Decision**: Web-application layout (`connect-four/server/` + `connect-four/src/`). No new directories created.

---

## Implementation Steps

### Step 1 — Database migration

**File**: `connect-four/server/migrations/008_user_player.sql`  
**Reference**: [data-model.md — Migration 008](data-model.md)

- `ALTER TABLE candidates ADD COLUMN user_player smallint NOT NULL DEFAULT 1 CHECK (user_player IN (1,2));`
- `ALTER TABLE puzzles    ADD COLUMN user_player smallint NOT NULL DEFAULT 1 CHECK (user_player IN (1,2));`
- Backfill both tables: `UPDATE candidates SET user_player = CASE WHEN length(move_string) % 2 = 0 THEN 1 ELSE 2 END;` (same for `puzzles`).

**Test**: Apply migration against local Supabase and confirm both columns exist with the correct default and check constraint.

---

### Step 2 — Load opening book in GeneratorSolver

**File**: `connect-four/server/candidate-generator.js` (lines 34–74, `GeneratorSolver` class)  
**Reference**: [research.md — Decision 1](research.md)

Two changes to `GeneratorSolver`:

1. **Add a book-path existence check** at the top of the constructor (before `spawn`):
   ```js
   import { existsSync } from 'fs';
   const BOOK_PATH = join(__dirname, '7x6.book');
   // in constructor:
   if (!existsSync(BOOK_PATH)) throw new Error(`Opening book not found: ${BOOK_PATH}`);
   ```
   This satisfies FR-004 — generation fails fast with a clear message rather than silently running slowly.

2. **Add the `-b` flag** to the spawn arguments:
   ```js
   // before:  spawn(BINARY_PATH, ['-a'], ...)
   // after:   spawn(BINARY_PATH, ['-a', '-b', BOOK_PATH], ...)
   ```
   With `-b` the solver answers book positions in O(1); all other solver behaviour and output format are unchanged.

No changes to the `query()` method or stdout parser — the 7-score output format is identical with and without the book.

---

### Step 3 — Fix `isClean()` off-by-one

**File**: `connect-four/server/candidate-generator.js` (line 176)  
**Reference**: [research.md — Decision 1 rationale], [docs/mvp/thoughts_on_generate_feedback.md — Bug 1]

```js
// before:
return !scores.some(s => s === winScore && winScore > 0);
// after:
return !scores.some(s => s >= winScore && winScore > 0);
```

Scores strictly greater than `winScore` are also immediate wins (edge case for positions decided before move 17). Using `===` caused the cleanliness filter to pass boards that still had an immediate win available in a non-predicate column.

---

### Step 4 — Replace `randomPosition` with `solverWeightedPosition`

**File**: `connect-four/server/candidate-generator.js` (lines 120–140, `randomPosition` function, and lines 195–205 in `generateCandidates`)  
**Reference**: [research.md — Decisions 2 and 3](research.md)

**4a — Extract and unit-test `softmaxSample` first.**

Before touching the game loop, add a pure helper and test it in isolation:

```js
// pure helper — no solver, no RNG side-effects
export function softmaxSample(legalCols, scores, T, rng) {
  const weights = legalCols.map(c => Math.exp(scores[c] / T));
  const total = weights.reduce((a, b) => a + b, 0);
  const probs = weights.map(w => w / total);
  let r = rng(), cum = 0;
  for (let j = 0; j < legalCols.length; j++) {
    cum += probs[j];
    if (r < cum) return legalCols[j];
  }
  return legalCols[legalCols.length - 1]; // fallback for floating-point edge
}
```

Solver scores are small integers (roughly −20 to +20) and T ≥ 1, so `exp(score / T)` stays well within float64 range — no max-subtraction needed.

Unit tests (add to a new `tests/unit/softmax.test.js` or inline in the integration test file):
- At `T=0.01`, always returns the column with the highest score.
- At `T=1000`, returns each legal column with approximately equal frequency over many draws.
- With a single legal column, always returns that column regardless of T.

**4b — Implement `solverWeightedPosition` with per-player temperatures.**

Only after the unit tests pass, delete `randomPosition` and add:

```js
async function solverWeightedPosition(solver, targetLen, rng) {
  const T1 = 1 + rng() * 4;  // player 1 temperature ∈ [1,5] — Decision 2
  const T2 = 1 + rng() * 4;  // player 2 temperature ∈ [1,5] — Decision 2
  const temps = [T1, T2];
  let moveString = '';
  const heights = Array(COLS).fill(0);
  const board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  let player = 1;

  for (let i = 0; i < targetLen; i++) {
    const legal = [];
    for (let c = 0; c < COLS; c++) {
      if (heights[c] < ROWS) legal.push(c);
    }
    if (legal.length === 0) return null;

    const scores = await solver.query(moveString);  // book covers first ~8 plies in O(1)
    const col = softmaxSample(legal, scores, temps[player - 1], rng);

    board[heights[col]][col] = player;
    heights[col]++;
    moveString += (col + 1).toString();
    if (hasWon(board, player)) return null;
    player = 3 - player;
  }
  return moveString;
}
```

**Why per-player temperatures** (see [research.md — Decision 2](research.md)): a single shared T produces balanced games where neither player accumulates a real advantage. With two independent temperatures, the pair (T1, T2) sometimes puts one player in clear command (e.g. T1=1.2, T2=4.8), which is exactly the asymmetry needed for Cat 3/4/5 puzzle positions. The wider range [1,5] (vs [1,3]) amplifies this effect.

**Not implemented now — temperature variation during simulation**: varying a player's temperature partway through the rollout (e.g. both open at T=1.5, one switches to T=5 after move 15) could further target specific puzzle conditions. This is explicitly deferred: it adds arbitrary thresholds, complicates RNG accounting, and should only be considered if empirical testing shows the two-independent-temperature approach fails for specific categories. See [research.md — Decision 2, "Not Now" note](research.md).

**RNG draw order**: T1 first, T2 second, then one draw per move selection. This order is fixed — changing it breaks determinism.

**Also raise the minimum move floor**: change `minMoves` for all categories to `10` (currently `4` for cats 1–2, `8` for cats 3–7). This ensures no trivially sparse board is accepted even if the predicate happens to pass at move 6. See [research.md — Decision 3](research.md).

**Quick empirical check during implementation**: before running the full generation loop, call `solver.query('')` once and log the round-trip time. With the book loaded this should be near-instant.

In `generateCandidates`, replace the `randomPosition(targetLen, rng)` call at line 204 with `await solverWeightedPosition(solver, targetLen, rng)`.

---

### Step 5 — Add `user_player` to candidate insert

**File**: `connect-four/server/index.js` (lines 842–849, the `rows` mapping inside `POST /api/admin/generate`)  
**Reference**: [data-model.md — Entities Updated](data-model.md)

Add one field to the insert row object:

```js
const rows = result.candidates.map(c => ({
  category: c.category,
  move_string: c.move_string,
  solver_scores: c.solver_scores,
  classifier_tags: c.classifier_tags,
  generation_run_id: runId,
  seed: result.seed,
  user_player: c.move_string.length % 2 === 0 ? 1 : 2,   // NEW
}));
```

No other changes to `index.js`.

---

### Step 6 — Normalise board renderer in CurationWorkspace

**File**: `connect-four/src/components/CurationWorkspace.jsx`  
**Reference**: [research.md — Decision 4](research.md), [spec.md FR-006, FR-007](spec.md)

Two changes:

1. **Update `buildBoard` signature and color logic** (line 21–31):
   ```js
   // before: function buildBoard(moves)
   // after:  function buildBoard(moves, userPlayer)
   //
   // line 27 before: board[heights[col]][col] = i % 2 === 0 ? 'red' : 'yellow';
   // line 27 after:
   board[heights[col]][col] = (i % 2 === 0) === (userPlayer === 1) ? 'red' : 'yellow';
   ```
   Logic: player 1 pieces are at even indices (0, 2, 4…). When `userPlayer === 1` those are red; when `userPlayer === 2` they are yellow. The single boolean expression covers both cases with no branching.

2. **Update the single call site** (line 216) and **add badge**:
   ```js
   // derive perspective before board build
   const userPlayer = candidate.move_string.length % 2 === 0 ? 1 : 2;
   const board = buildBoard(candidate.move_string, userPlayer);
   ```
   Add the badge below the `metaRow` `<div>`:
   ```jsx
   <div style={{ fontSize: 11, color: 'var(--red)', fontWeight: 700 }}>
     You are RED ●
   </div>
   ```
   Uses `var(--red)` — consistent with existing color tokens (Constitution Principle IV).

No changes to predicate evaluation, solver score display, or `move_string` storage (FR-008).

---

### Step 7 — Extend integration tests

**File**: `connect-four/tests/integration/candidate-generator.test.js`  
**Reference**: [spec.md SC-001, SC-002, SC-003](spec.md)

Add the following assertions to the existing test file (the existing seed-99 test can be extended in-place):

1. **Board density** (SC-001, SC-002): call `generateCandidates(1, 10, 42)` and assert:
   - Every returned `move_string` has `length >= 8`.
   - Median `move_string.length` across the batch is ≥ 14.

2. **Determinism** (SC-003): call `generateCandidates(1, 5, 99)` twice; assert the two `move_string` arrays are identical element-by-element. (This test already existed — verify it still passes after the PRNG-order change from Step 4.)

3. **Book fail-fast** (FR-004): instantiating `GeneratorSolver` with a non-existent book path throws an error containing "Opening book not found".  
   To test without side-effects, temporarily rename the constant or pass a bad path via a small test helper — do not mock `fs.existsSync`.

---

### Step 8 — Manual verification

**Reference**: [spec.md — User Story 2 acceptance scenarios](spec.md), [spec.md Success Criteria SC-005, SC-006](spec.md)

Golden path:
1. Open the curation workspace with a candidate where `move_string.length % 2 === 0` (player 1 is current). Confirm all player-1 pieces render RED and the "You are RED ●" badge is visible.
2. Find (or generate) a candidate where `move_string.length % 2 === 1` (player 2 is current). Confirm player-2 pieces render RED, player-1 pieces render YELLOW, badge still visible.
3. Click a column on each board type and verify solver scores and `predicate_pass` values are identical to those returned before this change (SC-006 — no predicate regression).
4. Generate a 10-candidate batch for category 1. Confirm no returned board looks empty (all boards have visible pieces spread across multiple columns).
