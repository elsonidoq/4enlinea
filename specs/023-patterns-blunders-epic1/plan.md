# Implementation Plan: Patterns → Blunders Epic 1 — Schema + Core Algorithm

**Branch**: `101-new-design` | **Date**: 2026-06-06 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/023-patterns-blunders-epic1/spec.md`

---

## Summary

Build the schema foundation and core tagging engine for the three-layer Patterns → Blunders → Challenges model. Deliver three DB migrations (TRUNCATE + constraint update, `reason` column, `direction` column), retrofit all 13 pattern detectors to accept an explicit `perspective` parameter, and implement two new exported functions in `server/classifier.js`: `classifyPattern(ms, perspective, solver)` and `tagBlunder(moves, playedCol, correctCol, solver)`. No production call sites are wired — that is Epic 2.

---

## Technical Context

**Language/Version**: Node.js 20+ (ESM), PostgreSQL 15 (Supabase)  
**Primary Dependencies**: `server/classifier.js` (detector functions), `server/c4solver-wrapper.js` (solver IPC), Supabase DB (migration runner)  
**Storage**: PostgreSQL via Supabase pooler (`aws-1-us-west-2.pooler.supabase.com`)  
**Testing**: Node.js built-in `node:test` + `node:assert/strict`; `npm run test:fast` (omits candidate-generator)  
**Target Platform**: Linux server (Node.js server process)  
**Project Type**: Server-side library additions (new exports to an existing module)  
**Performance Goals**: `tagBlunder` is on the lazy post-game analyze path; no latency budget applies. `classifyPattern` may issue up to ~62 solver queries (1 for scores + up to 60 for `detectClaimeven` + 2 for `bm()` calls). Acceptable.  
**Constraints**: `tagBlunder` MUST NOT throw; `solver.score()` does not exist — derive as `Math.max(...await solver.query(ms))`; `DETECTOR_REGISTRY` in `explainSimulate.js` must not be imported from `classifier.js` (circular dependency); no per-call query budget.  
**Scale/Scope**: 13 detectors retrofitted, 3 migrations, 2 new functions, 6 automated test cases (T-001 to T-006) + 5-item manual DB checklist (T-007/T-008).

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked post-design.*

**Principle I — Explanation Engine as Single Source of Truth**:
- [x] `classifyPattern` routes through the existing detector functions in `classifier.js` — no independent evaluation path is introduced.

**Principle II — Code Quality & Simplicity**:
- [x] No speculative abstractions: `classifyPattern` calls detectors inline (avoids importing `DETECTOR_REGISTRY` from `explainSimulate.js` to prevent circular dep). Three similar detector calls beat a premature abstraction.
- [x] No defensive error handling beyond what FR-023 mandates (solver exception and degenerate-position branches are the only two).
- [x] Comments: only non-obvious WHY (perspective-retrofit default rationale, solver-score derivation, TRUNCATE rationale in migration).

**Principle III — Testing Standards**:
- [x] T-001 (pattern unit tests) uses real solver binary for score fixtures; movestrings sourced from DB/KB.
- [x] T-006 (regression) verifies real `classify()` behavior is unchanged post-retrofit.
- [x] T-003/T-004/T-005 use mock solver — acceptable for isolation tests; they do not replace the integration tests.
- [x] Test fixtures are deterministic and sourced from existing data (DB, KB, git history).

**Principle VI — Implementation & Debugging Methodology**:
- [x] Degenerate-position detection uses `board.hasWon(player)` (concrete board state check), not score-based inference.
- [x] FR-003 audit produces a written two-column table before any detector is touched (see research.md §6).
- [x] `solver.score()` confirmed absent; derivation documented in research.md §2.

**Principle VIII — Documentation as First-Class Deliverable**:
- [x] Existing architecture docs read before planning: `docs/architecture/db-schema.md`, `docs/architecture/server-conventions.md`, `docs/architecture/testing-conventions.md`, plus `docs/mvp/patterns_blunders_challenges_epics.md`.
- [x] New function contracts → `specs/023-patterns-blunders-epic1/data-model.md`.
- [x] New detector retrofit convention → `docs/architecture/server-conventions.md` (task P5-DOC).
- [x] New migration files documented in `docs/architecture/db-schema.md` (task P5-DOC).
- [x] tasks.md will include explicit documentation tasks.

**Principle VII — Software Design Philosophy**:
- [x] Explicit `perspective` parameter beats implicit derivation from `board.currentPlayer`.
- [x] Default `perspective = board.currentPlayer` keeps existing callers unaffected (practicality beats purity — documented here).

**Violations requiring justification**: None.

---

## Project Structure

### Documentation (this feature)

```text
specs/023-patterns-blunders-epic1/
├── plan.md              # This file
├── research.md          # Phase 0 output — resolved unknowns
├── data-model.md        # Phase 1 output — DB schema + function contracts
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code

```text
connect-four/
├── server/
│   ├── classifier.js                    # MODIFIED: detector retrofits + 2 new exports
│   ├── migrations/
│   │   ├── 032_blunders_new_tags.sql    # NEW: TRUNCATE + CHECK constraint update
│   │   ├── 033_blunders_reason.sql      # NEW: reason TEXT column
│   │   └── 034_blunders_direction.sql   # NEW: direction TEXT column
│   └── scripts/
│       ├── import_papergames_blunders.mjs  # MODIFIED: 'unknown' → 'suboptimal_move' patch
│       └── reprocess_blunders.mjs          # MODIFIED: 'unknown' → 'suboptimal_move' patch
└── tests/
    └── blunder/
        └── tagBlunder.test.js           # NEW: T-001 through T-008
```

**Structure Decision**: Single project layout. All changes are in `server/classifier.js` plus three migration files and two script patches. No new modules created.

---

## Phase 0: Pre-Deploy Audits

These tasks produce written findings (recorded as code comments or in this plan) and are HARD PREREQUISITES for all migration and implementation work.

### P0-AUDIT-1: `'unknown'` callsite audit (FR-001)

Run: `rg "'unknown'" server/scripts/ server/index.js`

**Findings** (from research):
- `server/scripts/import_papergames_blunders.mjs`: two callsites (`let patternTag = 'unknown'` and fallback `? raw : 'unknown'`). MUST patch.
- `server/scripts/reprocess_blunders.mjs`: same two callsites. MUST patch.
- `server/index.js`: `'unknown'` used only for device UUID and Stripe plan defaulting — not `pattern_category`. No patch required.

**Patches required** (before migration 032 runs):
1. `import_papergames_blunders.mjs`: `let patternTag = 'unknown'` → `let patternTag = 'suboptimal_move'`; `? raw : 'unknown'` → `? raw : 'suboptimal_move'`; remove `'unknown'` from `VALID_PATTERN_CATEGORIES` set; add `'suboptimal_move'`.
2. `reprocess_blunders.mjs`: same changes.

### P0-AUDIT-2: `'forbidden_columns'` callsite audit (FR-002)

Run: `rg "'forbidden_columns'" server/scripts/ server/index.js`

**Findings** (from research): Three callsites, none insert `forbidden_columns` as a new blunder tag — they list it as valid in existing sets or route game logic. No patches required. Tag stays in the new CHECK constraint.

### P0-AUDIT-3: DETECTOR_REGISTRY enumeration (FR-003)

**Findings** (from research, see research.md §6): 13 detectors, all need perspective retrofit. Two-column table reproduced in research.md.

Key non-obvious finding: `DETECTOR_REGISTRY` lives in `explainSimulate.js`, not `classifier.js`. `classifyPattern` must call detectors inline to avoid a circular import. `odd_even_threat` is in `classifyAll` (classifier.js) but absent from `DETECTOR_REGISTRY` (explainSimulate.js) — include it in `classifyPattern`.

### P0-AUDIT-4: `classifyAll` / `classifyBestMove` caller audit (FR-004)

Run: `rg classifyAll server/` + `rg classifyBestMove server/`

**Findings** (from research): Zero external callers for either function. Both remain as exports; neither is retired in this epic.

---

## Phase 1: DB Migrations

Dependencies: P0-AUDIT-1 patches applied (scripts no longer emit `'unknown'`).

### P1-MIG-A: Migration 032 — TRUNCATE + CHECK constraint (FR-005, FR-006)

File: `connect-four/server/migrations/032_blunders_new_tags.sql`

```sql
-- Epic 1 (patterns-blunders): discard old unknown-tagged rows and tighten
-- the pattern_category constraint to exclude 'unknown'. Rows will be
-- regenerated with correct tags in Epic 2 (reprocess-all-games step).
TRUNCATE public.blunders;

ALTER TABLE public.blunders
  DROP CONSTRAINT IF EXISTS blunders_pattern_category_check;

ALTER TABLE public.blunders
  ADD CONSTRAINT blunders_pattern_category_check
  CHECK (pattern_category IN (
    'immediate_threat', 'forced_block', 'forced_win', 'double_threat',
    'undercut', 'overcut', 'figure_7', 'j_shape', 'z_threat',
    'odd_even_threat', 'claimeven', 'claimodd',
    'drawing_move', 'suboptimal_move',
    'forbidden_columns'
  ));
```

### P1-MIG-B: Migration 033 — reason column (FR-007)

File: `connect-four/server/migrations/033_blunders_reason.sql`

```sql
ALTER TABLE public.blunders ADD COLUMN reason TEXT;
```

### P1-MIG-C: Migration 034 — direction column (FR-008)

File: `connect-four/server/migrations/034_blunders_direction.sql`

```sql
ALTER TABLE public.blunders ADD COLUMN direction TEXT;
-- No CHECK constraint: 'missed_own' | 'enabled_opponent' | 'defensive_miss' are
-- known values but left unconstrained to allow future extensions without a migration.
```

**Sequencing**: 032 → 033 → 034. Not parallelizable. No separate truncation step (it is folded into 032).

---

## Phase 2: Detector Perspective Retrofit

Dependencies: P0-AUDIT-3 output (two-column table from research.md §6).

### P2-RETROFIT: Add `perspective` parameter to all 13 detectors (FR-013, FR-014)

File: `connect-four/server/classifier.js`

**Pattern**: For each detector `detectXxx(board, scores)`, add `perspective = board.currentPlayer` as the last parameter. Replace all internal uses of `board.currentPlayer` that are perspective-sensitive with `perspective`. The rest of the detector logic (board mutation, threat enumeration, opponent references via `3 - perspective`) follows accordingly.

**Static-position semantics (CRITICAL)**: `classifyPattern` evaluates whether `perspective` holds the pattern RIGHT NOW, in the current board state. Detectors called from `classifyPattern` MUST test `reachableThreats(perspective)` (or equivalent) on the board as-is. They must NOT use `board.withMove(col)` or construct a future position when checking whether `perspective` holds the pattern — `withMove` makes sense only when `perspective === board.currentPlayer` (the player actually to move). When `perspective ≠ board.currentPlayer`, any `withMove` invocation places a disc for the wrong player and produces wrong results.

**Required sanity check before retrofitting each detector**: Before adding the `perspective` parameter, read the detector body and answer: "Does this detector test a condition that EXISTS on the current board, or does it test something that is ONE MOVE AWAY?" If the answer is "one move away," the detector's logic must first be corrected to test current board state, and then the perspective parameter is added. This sanity check is a required step for every detector. Explicitly check `detectDoubleThreat`: verify whether it counts immediate threats (`reachableThreats` on the board as-is) or simulates moves to create them.

**Special cases**:

- `detectClaimodd(board, scores, perspective = board.currentPlayer)`: change `if (board.currentPlayer !== 1)` → `if (perspective !== 1)`.
- `detectClaimeven(board, solver, perspective = board.currentPlayer)`: change `board.movestring.length % 2 === 0` → `perspective !== 2` (claimeven is Yellow-only; `board.movestring.length % 2 === 0` means it's Red's turn, same logic expressed via player number).
- `detectImmediateThreat(board, perspective = board.currentPlayer)`: change `board.immediateThreats(board.currentPlayer)` → `board.immediateThreats(perspective)`.
- `detectDoubleThreat(board, perspective = board.currentPlayer)`: after the sanity check above, change `board.currentPlayer` references in `reachableThreats` calls to `perspective`. If the current implementation uses `withMove` to simulate, correct it to evaluate existing threats on the current board.
- `detectForcedBlock`, `detectForcedWin`, `detectForbiddenColumns`, `detectZThreat`, `detectOddEvenThreat`, `detectUndercut`, `detectOvercut`, `detectFigure7`, `detectJShape`: run the same sanity check (current-state vs. one-move-away), correct if needed, then substitute `board.currentPlayer` → `perspective` where perspective-sensitive.

**Invariant**: `opponent` is always `3 - perspective`, not `board.opponent`. All detectors that reference `board.opponent` must change to `3 - perspective` after the retrofit.

**Score-consuming detectors — additional requirement (FR-033)**: Five detectors read raw solver scores which are always signed relative to the player to move, not `perspective`: `detectForcedWin`, `detectForbiddenColumns`, `detectForcedBlock`, `detectZThreat`, `detectOddEvenThreat`. A simple sign flip is wrong (it misidentifies "some blunderer move is bad" as "all blunderer moves are bad"). These five detectors MUST implement a two-step perspective contract:

1. When `perspective === board.currentPlayer`: apply existing score-based logic directly.
2. When `perspective !== board.currentPlayer`: iterate over all playable columns `c`, query fresh scores via `await solver.query(board.movestring + c)`, call the detector recursively on `new Board(board.movestring + c)` with the same `perspective`, return `true` iff ALL playable columns return `true`.

Each of these five detectors receives `solver = null` as an additional parameter. Callers that omit `solver` always pass `perspective === board.currentPlayer` (the `classify()` path), so the recursive branch never fires for them. `classifyPattern` always passes `solver` explicitly.

### P2-REGRESSION: Regression check for `classify()` path (FR-015, T-006)

After retrofitting all detectors, run the full test suite (`npm run test:fast` from `connect-four/`) before implementing `classifyPattern`. This verifies the defaults preserve existing behavior. Do not proceed to Phase 3 if any test fails.

---

## Phase 3: `classifyPattern` Implementation

Dependencies: P2-REGRESSION passes.

### P3-IMPL: Implement `classifyPattern(ms, perspective, solver)` (FR-010 to FR-017)

File: `connect-four/server/classifier.js` — new exported function.

**Algorithm**:

```js
export async function classifyPattern(ms, perspective, solver) {
  const board = new Board(ms);
  const scores = await solver.query(ms);
  const tags = new Set();

  const detectors = [
    // sync detectors — non-score-consuming
    ['immediate_threat',  () => detectImmediateThreat(board, perspective)],
    ['double_threat',     () => detectDoubleThreat(board, perspective)],
    // score-consuming detectors: pass solver for the recursive perspective case (FR-033)
    ['forced_block',      () => detectForcedBlock(board, scores, perspective, solver)],
    ['forced_win',        () => detectForcedWin(board, scores, perspective, solver)],
    ['forbidden_columns', () => detectForbiddenColumns(board, scores, perspective, solver)],
    ['z_threat',          () => detectZThreat(board, scores, perspective, solver)],
    ['odd_even_threat',   () => detectOddEvenThreat(board, scores, perspective, solver)],
    // non-score-consuming (no recursive solver step needed)
    ['undercut',          () => detectUndercut(board, scores, perspective)],
    ['overcut',           () => detectOvercut(board, scores, perspective)],
    ['figure_7',          () => detectFigure7(board, scores, perspective)],
    ['j_shape',           () => detectJShape(board, scores, perspective)],
    ['claimodd',          () => detectClaimodd(board, scores, perspective)],
    // async detector
    ['claimeven',         () => detectClaimeven(board, solver, perspective)],
  ];

  await Promise.all(detectors.map(async ([tag, fn]) => {
    const result = await fn();
    if (result.matched) tags.add(tag);
  }));

  return tags;
}
```

Note: `solver.query(ms)` for the scores call is one round-trip before the detector calls. `detectClaimeven` uses the same `solver` handle for its internal queries (up to 60 calls). The `Promise.all` runs all detectors concurrently — the serialised solver queue in the wrapper handles ordering.

**Important**: `classifyPattern` does NOT import or use `DETECTOR_REGISTRY` from `explainSimulate.js`. The inline list above is canonical for the tagging path. This avoids a circular dependency.

---

## Phase 4: `tagBlunder` Implementation

Dependencies: `classifyPattern` exports correctly.

### P4-IMPL: Implement `tagBlunder(moves, playedCol, correctCol, solver)` (FR-018 to FR-025)

File: `connect-four/server/classifier.js` — new exported function.

**Algorithm**:

```js
export async function tagBlunder(moves, playedCol, correctCol, solver) {
  try {
    // Degenerate detection — BEFORE any solver calls
    const board = new Board(moves);
    if (board.hasWon(1) || board.hasWon(2)) {
      return { tag: 'suboptimal_move', direction: 'missed_own',
               reason: 'degenerate position: board is already won' };
    }
    if (moves.length >= 42) {
      return { tag: 'suboptimal_move', direction: 'missed_own',
               reason: 'degenerate position: board is full' };
    }

    // Derive blunderer and opponent
    const blunderer = moves.length % 2 === 0 ? 1 : 2;  // even move count → Red opens
    const opponent  = 3 - blunderer;

    // Short alias: P(ms, player) = classifyPattern(ms, player, solver)
    const P = (ms, player) => classifyPattern(ms, player, solver);

    // bm(ms) = best move (argmax scores, lowest-index tie-break)
    const bm = async (ms) => {
      const scores = await solver.query(ms);
      return scores.indexOf(Math.max(...scores));
    };

    // --- Steps 1–3: computed upfront; do NOT compute after_blunder/after_correct yet.
    // Eagerly calling bm() on positions reached through winning moves yields meaningless
    // scores. Keeping after_blunder lazy avoids solver calls on those boards entirely.
    const [
      pMovesBlunderer,
      pAfterPlayedBlunderer,
      pAfterPlayedOpponent,
    ] = await Promise.all([
      P(moves,             blunderer),
      P(moves + playedCol, blunderer),
      P(moves + playedCol, opponent),
    ]);

    // Step 1: Defensive miss — blunderer had forced_block before playing
    if (pMovesBlunderer.has('forced_block')) {
      return { tag: 'forced_block', direction: 'defensive_miss',
               reason: 'matched defensive_miss: forced_block' };
    }

    // Step 2: Enabled immediate threat (1-ply) — opponent has immediate_threat after blunder
    if (pAfterPlayedOpponent.has('immediate_threat')) {
      return { tag: 'immediate_threat', direction: 'enabled_opponent',
               reason: 'matched enabled_opponent: immediate_threat' };
    }

    // Step 3: Missed own — tags the blunderer had before but lost after playing
    const MISSED_OWN_PRIORITY = [
      'immediate_threat', 'forced_win', 'double_threat', 'z_threat', 'odd_even_threat',
      'figure_7', 'j_shape', 'overcut', 'claimeven', 'claimodd',
    ];
    for (const t of MISSED_OWN_PRIORITY) {
      if (pMovesBlunderer.has(t) && !pAfterPlayedBlunderer.has(t)) {
        return { tag: t, direction: 'missed_own', reason: `matched missed_own: ${t}` };
      }
    }

    // --- Step 4: Lazy — compute after_blunder and after_correct only after Steps 1–3 miss.
    // Priority order (spec FR-020 step 4):
    //   forced_win > double_threat > z_threat > odd_even_threat > figure_7 > j_shape
    //   > undercut > claimeven > claimodd
    //
    // All entries use enabled_opp predicate EXCEPT undercut, which uses enabled_self
    // (FR-024, FR-025: undercut names the blunderer's exposure, not an opponent gain).
    // undercut is folded into the single loop at its correct position so the priority
    // order is enforced atomically — a separate post-loop check would mis-rank it.
    const afterBlunderMs = moves + playedCol  + (await bm(moves + playedCol)).toString();
    const afterCorrectMs = moves + correctCol + (await bm(moves + correctCol)).toString();

    const [
      pAfterBlunderOpponent,
      pAfterCorrectOpponent,
      pAfterBlunderBlunderer,
      pAfterCorrectBlunderer,
    ] = await Promise.all([
      P(afterBlunderMs, opponent),
      P(afterCorrectMs, opponent),
      P(afterBlunderMs, blunderer),
      P(afterCorrectMs, blunderer),
    ]);

    const STEP4_PRIORITY = [
      { tag: 'forced_win',      check: () => pAfterBlunderOpponent.has('forced_win')      && !pAfterCorrectOpponent.has('forced_win') },
      { tag: 'double_threat',   check: () => pAfterBlunderOpponent.has('double_threat')   && !pAfterCorrectOpponent.has('double_threat') },
      { tag: 'z_threat',        check: () => pAfterBlunderOpponent.has('z_threat')        && !pAfterCorrectOpponent.has('z_threat') },
      { tag: 'odd_even_threat', check: () => pAfterBlunderOpponent.has('odd_even_threat') && !pAfterCorrectOpponent.has('odd_even_threat') },
      { tag: 'figure_7',        check: () => pAfterBlunderOpponent.has('figure_7')        && !pAfterCorrectOpponent.has('figure_7') },
      { tag: 'j_shape',         check: () => pAfterBlunderOpponent.has('j_shape')         && !pAfterCorrectOpponent.has('j_shape') },
      // undercut uses enabled_self (blunderer's after_blunder/after_correct) — see FR-024
      { tag: 'undercut',        check: () => pAfterBlunderBlunderer.has('undercut')       && !pAfterCorrectBlunderer.has('undercut') },
      { tag: 'claimeven',       check: () => pAfterBlunderOpponent.has('claimeven')       && !pAfterCorrectOpponent.has('claimeven') },
      { tag: 'claimodd',        check: () => pAfterBlunderOpponent.has('claimodd')        && !pAfterCorrectOpponent.has('claimodd') },
    ];
    for (const { tag, check } of STEP4_PRIORITY) {
      if (check()) {
        return { tag, direction: 'enabled_opponent', reason: `matched enabled_opponent: ${tag}` };
      }
    }

    // Step 5: Score-based fallbacks — solver.score derived as Math.max(...solver.query(ms))
    const preScores  = await solver.query(moves);
    const postScores = await solver.query(moves + playedCol);
    const preScore   = Math.max(...preScores);
    const postScore  = Math.max(...postScores);

    if (preScore > 0 && postScore === 0) {
      return { tag: 'drawing_move', direction: 'missed_own',
               reason: 'win dropped to draw, no pattern detected' };
    }

    return { tag: 'suboptimal_move', direction: 'missed_own', reason: 'no pattern detected' };

  } catch (err) {
    return { tag: 'suboptimal_move', direction: 'missed_own',
             reason: `solver error: ${err.message}` };
  }
}
```

**Key implementation notes**:
- The outer `try/catch` wraps ALL logic after the degenerate check, so any solver exception anywhere in the cascade resolves to the `"solver error:"` fallback.
- The degenerate check runs BEFORE the `try/catch` entry would catch it — it must be INSIDE the try/catch so it can still fall through to the catch if `new Board(moves)` itself throws. But the degenerate-vs-solver-error distinction is maintained by checking degeneracy before any solver calls.
- **Lazy `after_blunder`**: `afterBlunderMs`, `afterCorrectMs`, and the four pattern sets that depend on them are computed ONLY if Steps 1–3 fail to return. Do NOT compute them upfront. Rationale: calling `bm()` (which issues `solver.query`) on positions reached through a winning move produces meaningless scores; Steps 1–3 catch the common cases that arise from such positions and return early, avoiding the degenerate solver calls entirely.
- `bm()` uses `solver.query()` (serialised queue); `P()` also uses `solver.query()`. All solver calls go through the same serialised queue in the wrapper.
- The `Promise.all` on classifyPattern calls is for logical grouping; each `classifyPattern` itself awaits `solver.query` serially per the wrapper's queue.
- `solver.score(ms)` does NOT exist. Use `Math.max(...await solver.query(ms))` throughout.

---

## Phase 5: Tests

Dependencies: Phases 1–4 complete. Migrations applied to test DB.

### P5-TESTS: Write test suite (T-001 to T-006)

File: `connect-four/tests/blunder/tagBlunder.test.js`

**Wire into package.json (REQUIRED)**: After creating the file, add `tests/blunder/tagBlunder.test.js` to the hardcoded test file list in BOTH the `test` and `test:fast` scripts in `connect-four/package.json`. Without this step, T-001 through T-006 will never run in CI or via `npm run test:fast`.

**T-001 (unit)**: For each of the three priority cascade directions (missed-own, enabled-opponent, defensive-miss), one concrete movestring per direction sourced from DB/KB, asserting `{ tag, direction }`.

**T-002 (integration)**: Position where both `missed_own` and `enabled_opponent` fire; assert result comes from `missed_own` (step 3 precedes step 4).

**T-003 (unit)**: Mock solver that always rejects. `tagBlunder` resolves (does not reject) with `{ tag: 'suboptimal_move', direction: 'missed_own' }` and `reason` starting with `"solver error:"`.

**T-004 (unit)**: `classifyPattern(ms, 2, solver)` on a position where `odd_even_threat` fires for Red — NOT present in Yellow result set. Same for `claimodd`.

**T-005 (unit)**: `classifyPattern(ms, 1, solver)` on a position where `claimeven` fires for Yellow — NOT present in Red result set.

**T-006 (regression)**: All existing `classify()` tests pass without modification.

**T-007 and T-008 (manual DB verification — not automated)**: There is no test harness that connects to the live DB. After applying migrations, the implementer manually verifies the following checklist against the dev DB using `psql` or the Supabase SQL editor:

- [ ] `INSERT INTO blunders (pattern_category, ...) VALUES ('unknown', ...)` → fails with CHECK constraint violation
- [ ] `INSERT INTO blunders (pattern_category, ...) VALUES ('drawing_move', ...)` → succeeds
- [ ] `INSERT INTO blunders (pattern_category, ...) VALUES ('forbidden_columns', ...)` → succeeds (legacy-tolerated)
- [ ] `INSERT INTO blunders (pattern_category, reason, direction, ...) VALUES ('suboptimal_move', 'no pattern detected', 'missed_own', ...)` → succeeds (non-null reason + direction)
- [ ] Same insert with `reason = NULL, direction = NULL` → succeeds (nullable columns)

Record the verification result (pass/fail) as a comment at the bottom of migration 034's SQL file.

**Movestring sourcing rule** (must be enforced in implementation): Never invent a movestring. Source T-001 and T-002 movestrings from:
1. `connect-four/tests/classifier/fixtures/fixtures.json`
2. The knowledge base (KB entries with verified positions)
3. `puzzles` table in the DB
4. Git history (`git log --all --grep="movestring"` or KB file commits)

### P5-DOC: Update architecture docs

1. `docs/architecture/server-conventions.md` — Add section describing the `perspective` parameter convention for detectors and the `classifyPattern` / `tagBlunder` API.
2. `docs/architecture/db-schema.md` — Update `blunders` table entry with the new `reason` and `direction` columns and the updated CHECK constraint.

---

## Phase 6: Verification

After all tasks:

1. Run `npm run test:fast` from `connect-four/` — all tests pass.
2. Verify `INSERT INTO blunders ... VALUES ('unknown', ...)` fails on the target DB.
3. Verify `INSERT INTO blunders (pattern_category, reason, direction, ...) VALUES ('drawing_move', 'test', 'missed_own', ...)` succeeds.
4. Verify `classifyPattern` returns non-empty Set on a known position (e.g., a forced-win position for the test player).
5. Verify `tagBlunder` with a rejecting mock solver resolves to the fallback without throwing.

---

## Complexity Tracking

No constitution violations requiring justification.

**Practicality beat purity (1)**: `classifyPattern` maintains its own inline detector list instead of importing `DETECTOR_REGISTRY` from `explainSimulate.js`. Rationale: importing in the other direction creates a circular dependency. The inline list is 13 lines and is the only correct option. Documented here and in a code comment at the `classifyPattern` definition. The comment must name `explainSimulate.js`'s `DETECTOR_REGISTRY` as the list that must stay in sync.

**Design decision — undercut in Step 4 loop**: `undercut` is folded into `STEP4_PRIORITY` (not checked in a separate post-loop `if`) to enforce the priority order atomically. Its entry uses `pAfterBlunderBlunderer`/`pAfterCorrectBlunderer` (enabled_self predicate) while all other entries use `pAfterBlunderOpponent`/`pAfterCorrectOpponent` (enabled_opp predicate). An inline comment explains the asymmetry.

**Design decision — static-position semantics for detectors**: Detectors called from `classifyPattern` evaluate existing board state for `perspective`; they do NOT simulate future moves via `withMove` when `perspective ≠ board.currentPlayer`. Any detector that currently operates on a future position ("one move away") must be corrected before the perspective retrofit. This is a required sanity check step for each detector, not an optional review.

**DB tests are manual**: T-007/T-008 cannot be automated without a live DB harness. They are a 5-item manual checklist run against the dev DB after migrations apply. The automated test suite covers T-001 to T-006 only.
