# Quickstart: Verifying Pattern Acceptance

## Automated verification (required before claiming any task done)

```bash
cd connect-four
npm run test:fast
```

**Baseline gate**: exactly these 5 tests may fail (pre-existing, unrelated to this feature —
verified 2026-07-29, this worktree):
- `server/tests/branchInvariance.test.mjs`
- `server/tests/causalLinksComposers.test.mjs`
- `server/tests/reasonRenderFixes.test.mjs`
- `server/tests/renderCoverageCorpus.test.mjs` (ENOENT on a missing coverage-corpus fixture file)
- `server/tests/renderCoverageUniverse.test.mjs` (ENOENT, same cause)

If any *other* test fails, or if one of these 5 starts failing for a *different* reason than its
current one, treat it as a regression this feature introduced.

Never run `npm test` for this feature's regular verification loop — it includes
`tests/integration/candidate-generator.test.js`, which calls the real solver up to 400×/test and
routinely hangs 10+ minutes (CLAUDE.md, `docs/architecture/testing-conventions.md`). Run it only
when explicitly verifying candidate generation.

## Per-user-story verification

**US1 (set-valued acceptance)**: for each of `odd_even_threat`, `figure_7`, `j_shape`, `z_threat`,
`overcut`, `claimeven`, take (or generate via `gameSampling.js#playGame` — never hand-construct) a
solver-verified board with 2+ independently pattern-satisfying, solver-safe columns; call
`evaluatePredicate` directly for each qualifying column and confirm `result ∈ {'correct','tied'}`
for every one, and `'wrong'` for a non-qualifying column.

**US2 (solver-safety floor)**: take a solver-verified `undercut` board where a non-killing column
concedes strictly more than the board's optimum; confirm `checkUndercutPredicate` rejects the
board as an invalid candidate, and `evaluatePredicate`/`evalUndercut` returns `'wrong'` for that
column at grading time. Also confirm a genuine `LOST-POSITION` `undercut` board (every move loses)
still passes when the taught column is among the slowest losses.

**US3 (computed once, stored)**: generate (or re-verify) a puzzle of any category; confirm its
`correct_cols` is populated (non-`NULL`, non-empty) immediately after generation with no serving-time
recomputation; confirm a fresh backfill run against an existing row is idempotent (same array,
same order, on a second run); confirm a grading request that supplies a real `puzzleId` grades
**directly** as `correct_cols.includes(playedCol)` (e.g. by instrumenting/spying that
`evaluatePredicate`/`buildPredicatePuzzle` are never invoked for that request — Decision D2a) rather
than recomputing from the request body; confirm a `puzzleId` whose row has `correct_cols === null`
(not yet backfilled) falls through to the computed-live branch instead of grading every column wrong
(FR-024a); confirm the backfill deactivates (rather than stores empty-active) any row whose
recomputed `correctCols` comes back empty (FR-016b).

**US4 (row-less path unchanged)**: run `npm run test:fast` and confirm
`tests/lessons/lessonAnswerSets.test.js` still passes for every lesson board (dynamically globbed
from `connect-four/lessons/*.json` — not a fixed count); run `server/scripts/
audit_answer_ambiguity.mjs` (no `--puzzles` flag defaults to `--lessons`) and confirm 0 failures.

## Manual/DB verification (US3 backfill + US2 pool-fallout)

```bash
# ORDER MATTERS (Decision #2): the audit script's correct_cols cross-check update (FR-023a) MUST
# land BEFORE any of the measurements below are taken — otherwise the measurement (a live
# re-derivation) and the eventual backfill write could silently disagree about how many puzzles
# survive. This script is the single measurement path; the backfill's own --dry-run is NOT a second
# source of these numbers.

# Dry-run measurement BEFORE setting the FR-022 threshold (research.md D4) — no writes:
node server/scripts/audit_answer_ambiguity.mjs --puzzles undercut --env local

# After the floor lands, re-run to see the before/after delta for undercut specifically.

# Same procedure for overcut, BEFORE the FR-010/Finding-F1 uniqueness fix lands (Decision #1
# guard rails, FR-021a/FR-022a) — do not skip this because the code change looks like a one-liner:
node server/scripts/audit_answer_ambiguity.mjs --puzzles overcut --env local
# ...then re-run after the fix lands to see the before/after delta for overcut.

# Repeat for every other category touched by this feature.

# Backfill dry-run (once server/scripts/backfill-correct-cols.mjs exists) — prints what it would
# WRITE, not a substitute for the audit-script measurement above:
node server/scripts/backfill-correct-cols.mjs --dry-run --env local

# Real backfill (after thresholds are set and remediation plans are in place):
node server/scripts/backfill-correct-cols.mjs --env local
# then:
node server/scripts/audit_answer_ambiguity.mjs --puzzles --env local
# must report 0 failures across all categories, per-category counts at or above the FR-022/FR-022a
# thresholds (FR-031) — achieved via FR-023 replace-not-exempt, never by silent depletion. The audit
# must also report 0 mismatches between stored correct_cols and its own live re-derivation (FR-023a).
```

## Frontend manual check (Constitution III — UI features need a real browser pass)

1. `eval "$(./worktree-ports.sh)"` from the repo root, then start the dev server.
2. Play an `odd_even_threat` challenge whose taught column is NOT the sole solver optimum (once
   such a board exists in the pool — today lesson 07's two boards happen to coincide with the
   optimum by luck, per OI-75); confirm the drill now grades against the taught pattern, not raw
   solver score.
3. Play an `undercut` challenge and confirm a genuinely unsafe non-killing column is now graded
   wrong, and a safe one is graded correct/tied.
4. Confirm `ChallengeScreen.jsx`'s network request to `/api/evaluate-move` includes `puzzleId` in
   the request body (DevTools Network tab) for a real puzzle drill, and that grading still works
   identically for a lesson inline challenge. Confirm the response body does NOT include a
   `correct_cols` field on either branch (owner clarification #2 — D2b: no client-side grading, no
   UI-hint field added in this feature).

   **Corrected 2026-07-29 after QA**: an earlier version of this step said a lesson inline challenge
   sends *no* `puzzleId`. That is only true for challenges authored without one (their id is minted
   locally as `inline-<movestring>` and suppressed by `src/lib/syntheticPuzzleId.js`). Lessons whose
   JSON *does* carry an authored `confirmationChallenges[].puzzleId` still send it — and every such
   id currently resolves to no row, so the request lands on the fall-through path (a `console.warn`
   plus computed-live grading), which grades correctly and visibly. Verify **grading works**, not
   that the field is absent; see `docs/open_issues.md` OI-85 for the stale-id cleanup.
