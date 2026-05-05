# Tasks: Puzzle Generator Improvements

**Input**: Design documents from `specs/004-puzzle-gen-improvements/`  
**Plan**: [plan.md](plan.md) | **Spec**: [spec.md](spec.md) | **Data model**: [data-model.md](data-model.md) | **Research**: [research.md](research.md)

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: Which user story this task belongs to
- Exact file paths in every description

---

## Phase 1: Setup

**Purpose**: Database foundation — required before any code runs against real storage.

- [X] T001 Write and apply migration `connect-four/server/migrations/008_user_player.sql`: `ALTER TABLE candidates ADD COLUMN user_player smallint NOT NULL DEFAULT 1 CHECK (user_player IN (1,2))`, same for `puzzles`, then backfill both with `UPDATE … SET user_player = CASE WHEN length(move_string) % 2 = 0 THEN 1 ELSE 2 END`. See [data-model.md](data-model.md).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The `softmaxSample` helper must exist and be tested before the game loop is written. The book-loading change must be in place before any generation attempt.

**⚠️ CRITICAL**: US1 game-loop work (T004–T007) cannot begin until T002 and T003 are complete.

- [X] T002 Export pure helper `softmaxSample(legalCols, scores, T, rng)` from `connect-four/server/candidate-generator.js`: `weights = legalCols.map(c => Math.exp(scores[c] / T))`, normalise, sample with `rng()`. Add fallback `return legalCols[legalCols.length - 1]` for floating-point edge. See [plan.md Step 4a](plan.md).

- [X] T003 [P] Write unit tests for `softmaxSample` in `connect-four/tests/unit/softmax.test.js` (create file): (1) at T=0.01 always returns the column with the highest score; (2) at T=1000 each legal column is returned with approximately equal frequency over 10 000 draws; (3) with a single legal column always returns it regardless of T. Import `softmaxSample` directly — no solver involved. See [plan.md Step 4a](plan.md).

**Checkpoint**: `softmaxSample` is tested and correct. Book-loading is verified. US1 game-loop work can begin.

---

## Phase 3: User Story 1 — Realistic Board Sampling (Priority: P1) 🎯 MVP

**Goal**: Replace purely-random position generation with solver-weighted softmax sampling using per-player temperatures and a pre-loaded opening book. All generated boards have ≥ 10 moves and pass the density and determinism checks.

**Independent Test**: Run `node -e "import('./connect-four/server/candidate-generator.js').then(m => m.generateCandidates(1, 10, 42)).then(r => { console.log(r.candidates.map(c => c.move_string.length)); })"` and verify every printed length is ≥ 10. Re-run with seed 42 and confirm identical output.

- [X] T004 [US1] Update `GeneratorSolver` constructor in `connect-four/server/candidate-generator.js` (lines 34–74): (1) add `import { existsSync } from 'fs'` and `const BOOK_PATH = join(__dirname, '7x6.book')`; (2) throw `new Error('Opening book not found: ' + BOOK_PATH)` if `!existsSync(BOOK_PATH)`; (3) change spawn args from `['-a']` to `['-a', '-b', BOOK_PATH]`. No other changes to the class. See [research.md Decision 1](research.md) and [plan.md Step 2](plan.md).

- [X] T005 [US1] Fix `isClean()` off-by-one in `connect-four/server/candidate-generator.js` (line 176): change `s === winScore` to `s >= winScore`. Rationale: scores strictly above `winScore` are also immediate wins (edge case for positions decided before move 17). See [plan.md Step 3](plan.md) and [docs/mvp/thoughts_on_generate_feedback.md Bug 1](../../../docs/mvp/thoughts_on_generate_feedback.md).

- [X] T006 [US1] Replace `randomPosition` with `solverWeightedPosition` in `connect-four/server/candidate-generator.js`: delete `randomPosition` entirely; add the new async function that (1) draws `T1 = 1 + rng() * 4`, then `T2 = 1 + rng() * 4` (T1 first, T2 second — order is fixed for determinism); (2) loops up to `targetLen` plies; (3) at each ply calls `await solver.query(moveString)`, then calls `softmaxSample(legal, scores, temps[player - 1], rng)`; (4) returns null if `hasWon` or board full before `targetLen`. Also raise the move floor: change `minMoves` to `10` for all categories (replace the existing `category <= 2 ? 4 : 8` expression). See [plan.md Step 4b](plan.md) and [research.md Decisions 2 and 3](research.md).

- [X] T007 [US1] Quick empirical check (manual, not automated): after T006, start the server locally and call `POST /api/admin/generate` with `{ category: 1, count: 5, seed: 42 }`. Log each candidate's `move_string.length` and confirm all are ≥ 10. Also call `solver.query('')` once from a scratch script and confirm it returns in < 1 s with the book loaded. Document result as a comment in the PR or task notes. See [plan.md Step 4b](plan.md).

- [X] T008 [US1] Add `user_player` field to candidate insert rows in `connect-four/server/index.js` (lines 842–849): add `user_player: c.move_string.length % 2 === 0 ? 1 : 2` to the `rows` mapping inside `POST /api/admin/generate`. No other changes to `index.js`. See [data-model.md — Entities Updated](data-model.md) and [plan.md Step 5](plan.md).

- [X] T009 [US1] Extend integration tests in `connect-four/tests/integration/candidate-generator.test.js`: (1) board-density assertion — call `generateCandidates(1, 10, 42)`, assert every `move_string.length >= 10` and median length ≥ 14 (SC-001, SC-002); (2) determinism — call `generateCandidates(1, 5, 99)` twice, assert `move_string` arrays are element-identical (SC-003); (3) book fail-fast — construct a `GeneratorSolver`-equivalent with a non-existent book path and assert it throws an error containing `'Opening book not found'` (FR-004). See [plan.md Step 7](plan.md) and [spec.md SC-001–SC-003](spec.md).

**Checkpoint**: `POST /api/admin/generate` produces boards with ≥ 10 moves, generation is deterministic under a fixed seed, and the opening-book fail-fast fires correctly.

---

## Phase 4: User Story 2 — Normalised Player Perspective (Priority: P2)

**Goal**: Every puzzle board in the curation workspace shows the current player's pieces as RED, with a persistent "You are RED ●" badge. Solver scores and predicate results are unchanged.

**Independent Test**: Open the curation workspace with a candidate where `move_string.length % 2 === 1` (user is player 2) and confirm player-2 pieces render RED and the badge is visible. Repeat with an even-length candidate.

- [X] T010 [P] [US2] Update `buildBoard(moves, userPlayer)` signature and color logic in `connect-four/src/components/CurationWorkspace.jsx` (line 21): add `userPlayer` second parameter; change line 27 from `i % 2 === 0 ? 'red' : 'yellow'` to `(i % 2 === 0) === (userPlayer === 1) ? 'red' : 'yellow'`. Logic: player-1 pieces are at even indices; when `userPlayer === 2` the mapping inverts. See [plan.md Step 6](plan.md) and [research.md Decision 4](research.md).

- [X] T011 [US2] Update the single `buildBoard` call site and add the player badge in `connect-four/src/components/CurationWorkspace.jsx` (line 216): (1) derive `const userPlayer = candidate.move_string.length % 2 === 0 ? 1 : 2` before the board build; (2) pass it: `const board = buildBoard(candidate.move_string, userPlayer)`; (3) add badge JSX directly below the `metaRow` div: `<div style={{ fontSize: 11, color: 'var(--red)', fontWeight: 700 }}>You are RED ●</div>`. Uses `var(--red)` — consistent with existing tokens (Constitution Principle IV). Depends on T010. See [plan.md Step 6](plan.md) and [spec.md FR-006, FR-007](spec.md).

**Checkpoint**: Both even and odd `moveCount` boards render current player as RED with the badge visible. Solver scores, predicate pass/fail, and `move_string` storage are unaffected.

---

## Phase 5: Polish & Verification

**Purpose**: Manual golden-path verification across both user stories.

- [X] T012 Manual verification per [plan.md Step 8](plan.md): (1) open a candidate with even `move_string.length` — confirm player-1 pieces are RED, badge shows; (2) open a candidate with odd `move_string.length` — confirm player-2 pieces are RED, badge shows; (3) click a column on each board type and verify solver scores and `predicate_pass` are identical to pre-change values (SC-006 — no predicate regression); (4) generate a 10-candidate batch for category 1 and confirm no board looks empty (all have visible pieces across multiple columns). See [spec.md SC-005, SC-006](spec.md).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — apply migration first.
- **Phase 2 (Foundational)**: Depends on Phase 1. T003 [P] can run alongside T002 once the helper signature is known.
- **Phase 3 (US1)**: Depends on Phase 2 (T002 must pass before T006 uses `softmaxSample`). T004 and T005 are independent of each other and can run in parallel.
- **Phase 4 (US2)**: Independent of Phase 3 — touches different files entirely. Can start as soon as Phase 1 is done.
- **Phase 5 (Polish)**: Depends on Phase 3 and Phase 4 both complete.

### Within US1

```
T004 (book loading) ──┐
T005 (isClean fix)  ──┤── T006 (game loop) ── T007 (empirical check) ── T008 (insert) ── T009 (tests)
```

T004 and T005 are independent of each other — both must complete before T006.

### Within US2

```
T010 (buildBoard signature) ── T011 (call site + badge)
```

### Parallel Opportunities

```bash
# After Phase 1, these can run in parallel:
Task T002: "Export softmaxSample helper"
Task T010: "Update buildBoard signature"   # different file — fully independent
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: apply migration 008.
2. Complete Phase 2: implement and test `softmaxSample`.
3. Complete Phase 3: book loading, isClean fix, new game loop, insert update, integration tests.
4. **Stop and validate**: run integration tests, run empirical batch check.
5. US2 can follow independently.

### Incremental Delivery

1. Phase 1 + Phase 2 → foundation ready.
2. Phase 3 → realistic boards, deterministic generation, book fail-fast.
3. Phase 4 → unambiguous player perspective in curation UI.
4. Phase 5 → manual sign-off.
