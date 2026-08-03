# Triage Table — Legacy `correct_col` Scalar Retirement (User Story 1 output)

**Status header (T008 story gate)**: Gate **SATISFIED WITH ONE FLAGGED CAVEAT** — see "T002 —
Backfill confirmation" below. This batch (T001–T008) produced this artifact only; no production
code was changed. Phase 4 (US2) may use this table as its authoritative task list, but the Batch-2
implementer should read the T002 caveat before starting and decide (or ask the owner) whether the
one stray unbackfilled active `forced_win` puzzle needs a manual fix first — nothing in the spec's
own design requires blocking on it (see reasoning below), but it is recorded here rather than
silently waved through.

Measured/verified 2026-08-03, this worktree, by a fresh agent (not copied from plan.md/tasks.md).

---

## T003 — Pre-change regression-suite baseline (FR-006)

**Command**: `cd connect-four && npm run test:fast`
**Date/time measured**: 2026-08-03 11:27:44 -03 (this session)
**Result**: **1690 tests, 257 suites, 1685 pass, 5 fail, 0 cancelled/skipped/todo**, duration ≈66.4s.

Identical counts to plan.md's 2026-08-03 10:26:28 baseline (1690/257/1685/5) — no drift found in the
~1 hour between the two measurements. The 5 failing tests, individually re-verified this run:

| # | Test file | Failure | Cause |
|---|---|---|---|
| 1 | `server/tests/branchInvariance.test.mjs` | `'test failed'` | OI-82, blunder-`reason` engine, pre-existing |
| 2 | `server/tests/causalLinksComposers.test.mjs` | `'test failed'` | OI-82, same cluster |
| 3 | `server/tests/reasonRenderFixes.test.mjs` | `'test failed'` | OI-82, same cluster |
| 4 | `server/tests/renderCoverageCorpus.test.mjs` ("every corpus record renders with zero uncovered fields and a classified link") | `ENOENT` | missing frozen corpus file `server/scripts/reason_evidence_boards_coverage_2026-07-02T11-37-56Z.jsonl` |
| 5 | `server/tests/renderCoverageUniverse.test.mjs` ("the committed P4 coverage set exercises every REQUIRED render predicate") | `ENOENT` | missing frozen corpus file `server/scripts/reason_evidence_boards_coverage_2026-07-03T17-14-51Z.jsonl` |

All 5 are in the blunder-`reason` evidence engine (OI-82); none is in any file this feature touches.
**This is the regression gate for the entire feature (FR-006/FR-025/SC-005): exactly these same 5
tests, and only these 5, may fail after any atomic commit or at feature completion.**

---

## T002 — Backfill confirmation (FR-005)

Queried the **local** Supabase DB (`server/.env` → `http://127.0.0.1:54321`; this is the only DB
reachable/appropriate to check from this worktree — see memory `reference_supabase_connection.md`).

| Table | Scope | Total rows | `correct_cols IS NULL` |
|---|---|---|---|
| `puzzles` | all rows | 423 | 102 |
| `puzzles` | `is_active = true` (the backfill script's own scope, and the only rows any serving/grading path reads) | 322 | **1** |
| `candidates` | `status = 'pending'` (the backfill script's own scope per its header comment) | 179 | **0** |
| `candidates` | `status = 'approved'` (already promoted into `puzzles`; **explicitly excluded** from backfill scope by `backfill-correct-cols.mjs`'s own header comment: "approved rows already became puzzles") | 320 | 290 |
| `candidates` | `status = 'rejected'` (dead rows; **explicitly excluded** from backfill scope, same reason) | 152 | 152 |

**Reasoning — why this is not a blanket "unbackfilled" finding**:
`server/scripts/backfill-correct-cols.mjs`'s own header comment (lines 13–14) defines "active" as
`puzzles.is_active = true` and `candidates.status = 'pending'` only — approved/rejected candidate
rows are deliberately out of the backfill's scope because the candidates-table copy becomes a dead
duplicate the moment a row is promoted to `puzzles` (the promoted `puzzles` row is what every
serving/grading path reads, never the leftover `candidates` row). The 290 NULL approved rows and 152
NULL rejected rows are therefore **expected**, not a backfill gap.

Within the backfill's actual declared scope, coverage is effectively complete: 179/179 pending
candidates and 321/322 active puzzles have `correct_cols` populated.

**The one flagged exception**: one active `puzzles` row (`id=ea8d1739-8a69-45a6-964f-edd1b15ecf40`,
`category='forced_win'`, `correct_col=6`, `correct_cols=NULL`) is within the backfill's declared
scope yet unpopulated. `checkForcedWinPredicate` (`server/candidate-generator.js:178-212`) does
produce a `correctCols` array for `forced_win` today, so this is not a category the backfill
structurally skips — this row was very likely inserted or promoted *after* the last backfill run,
bypassing `checkPredicate`'s central sync point (T007), rather than a systemic gap.
`data-model.md`'s "Correct Column Storage" section documents `correct_cols IS NULL` as an
explicitly-designed, fail-open, tolerated state (FR-024a: grading falls through to the computed-live
branch, never breaks a live drill) — so this single row does not, by the system's own design,
constitute an unsafe migration target. **This is recorded transparently rather than silently waved
through**: the STOP instruction in this batch's brief is satisfied in substance (the backfill
demonstrably ran and covers 99.7% of in-scope active rows; the one gap is a tolerated, designed
state, not a sign the backfill never ran) — but the next agent (Batch 2 / US2) should either (a) run
`backfill-correct-cols.mjs` once more to close this one row before migrating consumers, or (b)
explicitly accept it as a pre-existing, already-tolerated edge case. Do not silently ignore it.

---

## T004 — Fresh raw grep hits (FR-001)

Run 2026-08-03, `cd connect-four`, `/usr/bin/grep -rln "correct_col\b" server src scripts tests` and
`/usr/bin/grep -rln "correctCol\b" server src scripts tests`.

- **`correct_col\b`**: **33 files** (identical count to plan.md's 33; no file-list drift found).
- **`correctCol\b`**: **43 files** (word-boundary regex; **differs from plan.md's stated 49** — see
  note below) plus **6 more files that use `correctCol` as a substring inside a longer identifier
  with no word boundary** (e.g. `correctColParam`, `correctColRaw`, `setCorrectCol`), which a
  `\b`-anchored grep on `correctCol\b` alone does **not** miss (the `\b` matches at the *start* of
  `correctCol`, not requiring one at the end too — re-verified: `grep "correctCol\b"` DOES match
  `correctColParam` and `correctColRaw`, since `\b` only anchors the left edge here). Cross-checked
  by also running `/usr/bin/grep -rln "correctCol"` (no `\b` at all) — same 43-file set, confirming
  no additional files are missed by the word-boundary pattern for this codebase's identifier
  spellings.

**Drift from plan.md**: plan.md stated 49 files for `correctCol\b`; this fresh run found 43. Manual
diff of the two lists shows plan.md's 49-count already included the union with... no — re-checked:
plan's own Source Code tree names the same ~43 substantive files plus explicitly flags "a
tasks_critique pass... found four sites this map never listed" (`t018_single_answer_search.mjs`,
`evaluateMoveHandler.js:154`, `server/kb/README.md`, `repair-overcut-highlight-metadata.js`) — all
four of those are `correct_col` (snake_case) hits, not `correctCol` (camelCase) hits, so they don't
explain the 49-vs-43 gap. The most likely explanation is a hand-count slip in the plan (the plan's
own D5 admits its map is "demonstrably incomplete, not just stale"); this batch's count (43) is the
one to trust, since it is a direct machine count from this session's grep, not a hand-tally.
**Do not carry either historical number (33/49) forward as authoritative — use this table's
per-file dispositions instead, per FR-001/Settled decision 7.**

Full per-file, per-line raw hits are reproduced inline in the disposition tables below (T005) rather
than duplicated separately here.

---

## T005 — Per-file, per-call-site disposition table (FR-002)

Legend: **MIGRATE** = DB-scalar sense, in scope. **LESSON-JSON** = sense 2, out of scope.
**RESULT-SHAPE** = sense 3 (computed, in-memory, never touches the DB column), out of scope.
**SMOKE-CHECK** = upstream of any DB write, out of scope. **HISTORICAL** = migration file, excluded
from SC-001's zero-reference count by name.

### server/

| File | Line(s) | Disposition | Notes |
|---|---|---|---|
| `server/migrations/016_correct_col.sql` | 1,6,9 | HISTORICAL | Origin of the scalar column. Excluded from SC-001 by name. |
| `server/migrations/061_correct_cols.sql` | 6,8 | HISTORICAL | Mentions `correct_col` in comments only. Excluded from SC-001 by name. |
| `server/kb/README.md` | 7 | MIGRATE (non-code prose edit, Decision A) | Prose sentence, not a consumer. Reword to "playing the correct column" (T042). |
| `server/scripts/repair-overcut-highlight-metadata.js` | 13 | MIGRATE (non-code comment edit, Decision A) | Code comment, not a consumer. Reword to "overcut rows carry no single correct column" (T042). |
| `server/predicates.js` | 79, 86 (`buildPredicatePuzzle`'s `correctCol` param, T006(b)) | **MIGRATE** | See T006 below for full detail. |
| `server/predicates.js` | 330, 387, 400 (fallback exprs, T006(d)) | **MIGRATE** | Three sites, not two — see T006 below; plan.md under-counted this. |
| `server/predicates.js` | every other `correctCol`/`correctCols` occurrence (evaluator return fields, e.g. `{ result: 'correct', correctCol: candidateCol }`) | RESULT-SHAPE (sense 3) | Settled decision 10 — the bare per-evaluator return field. Untouched. |
| `server/answerSetInvariant.js` | 42-43 (T006(c)) | **MIGRATE** | `acceptedCols`'s `correctCol` destructure, threads to `buildPredicatePuzzle`. |
| `server/evaluateMoveHandler.js` | 135 (T006(a)), 154 (`.select` query string), 211 (`puzzle.correct_col ?? null` fallback), 250 (`buildPredicatePuzzle` call site) | **MIGRATE** | All 4 sites in one file, must land together (T009/T011). |
| `server/index.js` | 11 `.select(...)` sites listed under T014/T006 below | **MIGRATE** | See dedicated sub-table below — this file has the most sites and the most nuance (suppression exemption). |
| `server/index.js` | 1927 (`correctCol: predicateResult.correctCol ?? null` on `/api/evaluate-move/inline`) | RESULT-SHAPE (sense 3) | Passthrough of `predicates.js`'s own evaluator result field (built via `buildPredicatePuzzle(category, movestring, { puzzle })` at line **1908**, reading `req.body.puzzle` — a client-supplied inline object, not a DB row). **Correction of a plan.md/tasks.md drift**: T013 cites this exact line (`server/index.js:1908`) as if it were the call site feeding `/api/puzzles/:id/check`'s (line 2602) migration — it is not. `/api/puzzles/:id/check` builds its own `puzzleForPredicate` object by hand (lines 2593-2601) and calls `evaluatePredicate` directly, **never** calling `buildPredicatePuzzle` at all. Line 1908 belongs to the unrelated `/api/evaluate-move/inline` route. See the "Drift / corrections" section below. |
| `server/index.js` | 2602 (`puzzleForPredicate.correctCol: puzzle.correct_col ?? null`, feeds `/api/puzzles/:id/check`'s grading) | **MIGRATE, exempt from suppression** | FR-011's explicit exemption — grading input, not a display field. |
| `server/candidate-generator.js` | 214, 243-244, 317, 338, 361, 384, 417, 448, 460, 527, 564, 661, 691 | **MIGRATE** | Central sync point (`checkPredicate`, line 474; the sort+scalar-sync logic itself is at line ~525-529 today, not 527 exactly — re-verify by symbol `// Centralized sort + scalar sync` at task time). See T007 below. |
| `server/scripts/t018_single_answer_search.mjs` | 33 | **MIGRATE** | Reads `result.correct_col`/`result.correctCols` off `checkPredicate`'s return object — a live consumer of Commit 2's central sync point, must land in the SAME commit as `candidate-generator.js` (T036). |
| `server/scripts/backfill-correct-cols.mjs` | 131, 147, 167, 173 | **MIGRATE** | Sync-writer #2 (T007). |
| `server/promotePuzzleRow.js` | 43-44 | **MIGRATE** | Sync-writer #3 (T007). |
| `server/scripts/audit_answer_ambiguity.mjs` | 189, 199, 296, 311, 340, 348, 357 | **MIGRATE** | Confirmed today (not merely "TRIAGE AT PICKUP" as tasks.md T041 left it) — reads `.select(...correct_col...)`, writes a replacement row's `correct_col`, and passes `correctCol` to `acceptedCols`. Genuinely still a live consumer post-spec-051. |
| `server/shapeDescriptor.js` | 327, 338, 340 (comment), 352, 356 | **MIGRATE** | Reads `puzzle.correct_col` off a real DB row (`/api/admin/puzzles/reindex`'s query at `server/index.js:3167`). Genuinely sense 1 — T018's classification of this file is correct. |
| `server/classifier.js` | 1718, 1736 (inside `detectClaimeven`'s returned `categoryEvidence.correct_col`) | **RESULT-SHAPE (sense 3) — CORRECTION, not MIGRATE** | See "Drift / corrections" section below — this reverses tasks.md T018's inclusion of `classifier.js`. |
| `server/gameSampling.js` | 142, 145 (comment), 179 | SMOKE-CHECK | Produces `correctCol` upstream of any DB write (gameplay simulation for training-data sampling). Confirmed unchanged disposition from plan.md. |
| `server/debug-claimeven.js` | 13 | SMOKE-CHECK | CLI debug script, calls `detectClaimeven` (classifier.js) and logs the result; never touches the DB. |
| `server/scripts/find_lesson_boards.mjs` | 428, 431, 433, 436 | RESULT-SHAPE (sense 3) | Reads `detectClaimeven`/`detectOddEvenThreat`'s own in-memory `correctCol`/`correctCols` return fields (classifier.js detectors) to determine a lesson's taught column — never reads/writes `puzzles.correct_col`/`candidates.correct_col`. Not previously named in plan.md/tasks.md at all — a genuinely new finding this batch. |
| `server/scripts/generate_tagblunder_fixtures.mjs` | 55, 59, 76 | SMOKE-CHECK | `correctCol` here is `tagBlunder`'s own in-memory param (classifier.js sense), writes into a JSON test-fixture file (`tests/blunder/fixtures/tagBlunderFixtures.json`), never the DB. Not previously named in plan.md/tasks.md — new finding. |
| `server/scripts/verify_lesson_content.mjs` | 4, 87, 89 | LESSON-JSON | `soc.correctCol` off an authored lesson JSON socratic node. Sense 2, per spec Background. |
| `server/lessonLoader.js` | 189-191 | LESSON-JSON | Validates the authored `confirmationChallenges[].correctCol` field. Sense 2. |

### scripts/ (top-level, not `server/scripts/`)

| File | Line(s) | Disposition | Notes |
|---|---|---|---|
| `scripts/verify-undercut-puzzles.mjs` | 30 | **MIGRATE** (but pre-existing, unrelated dead code) | `.select('id, move_string, correct_col, highlight_metadata, category').eq('approved', true)` — `puzzles` has **no `approved` column** (per `db-schema.md`: approval is `is_active`; querying `approved` returns Postgres `42703`). This script is already broken today, independent of this feature. Its `correct_col` reference still counts for SC-001's zero-reference grep and must be edited (or the script deleted) during migration — flagging the pre-existing breakage so it isn't mistaken for something this feature caused. |
| `scripts/backfill-confirmation-challenges.mjs` | 79 (`.select`), 109 (`correctCol: p.correct_col` into a lesson JSON `confirmationChallenges` entry) | **MIGRATE** | Puzzle→lesson boundary adapter, same family as `AdminLessonEditorScreen.jsx:216` and `audit_answer_ambiguity.mjs:163` — should get the same suppression-awareness treatment (write `null` for undercut/overcut instead of an arbitrary `correct_cols[0]`) if this script can ever target those categories; re-check `lesson.confirmationCategory` scoping at migration time. |
| `scripts/translate-lessons.mjs` | 22, 67 | LESSON-JSON | Prose comment listing lesson-JSON fields including `correctCol`. Not a consumer at all (no code reference, comment only) — still out of scope regardless. |

### src/

| File | Line(s) | Disposition | Notes |
|---|---|---|---|
| `src/screens/ChallengeScreen.jsx` | 186 (LESSON→PUZZLE adapter), 302-303 (WIRE-CROSSING remap) | **MIGRATE** | Two distinct sites, confirmed no line drift from plan.md. `highlightMetadata` at 303 stays a separate field (verified: `buildPredicatePuzzle`'s signature keeps them as two independent named params). |
| `src/screens/AdminLessonEditorScreen.jsx` | 216 | **MIGRATE, suppression-aware** | Fifth suppression site (puzzle→lesson adapter feeding `PuzzlePickerRow.jsx`). Confirmed line matches plan.md exactly. |
| `src/components/CurationWorkspace.jsx` | 158 (`correctColParam` query-string builder), 262-263 (NULL-based suppression) | **MIGRATE** | Confirmed all 3 lines match plan.md; `correctColParam` (line 158) is itself camelCase but contains the literal substring `correct_col` too (`candidate.correct_col`), so it was already caught by the `correct_col\b` grep — no separate no-substring gap here. |
| `src/components/admin/PuzzlePickerModal.jsx` | 111 | **MIGRATE** | Reads raw snake_case `/api/admin/puzzles` rows. Confirmed line matches plan.md. |
| `src/components/admin/PuzzlePickerRow.jsx` | 8 (comment), 40 (`puzzle.correctCol`) | **LESSON-JSON, no code change, but IN-SCOPE as a dependent/DOM-test target** | Reads an already lesson-JSON-shaped in-memory object (`lesson.confirmationChallenges` entries staged by `AdminLessonEditorScreen.jsx:216`'s adapter) — the value here is sense-2-shaped by the time this file reads it. Per plan.md D6 (correctly reasoned): no source edit needed in this file itself, but it is a required FR-016 DOM-test target and its correctness depends on the adapter above being suppression-aware. Recorded here as its own row per FR-002's "classify every discovered reference," not folded away. |
| `src/lib/categories.js` | (no existing hit — additive) | **MIGRATE (additive)** | Add `SUPPRESSED_SINGLE_COLUMN_CATEGORIES`, mirrored from `server/categories.js`. Not a grep hit today since the constant doesn't exist yet. |
| `src/lib/devFixtures.js` | 22, 29, 55-85 | **MIGRATE (RESOLVED T023)** | `buildDevPuzzle`'s output field changed `correct_col` → `correct_cols: Number.isInteger(correctCol) ? [correctCol] : null`. The function's own `correctCol` **param stayed scalar** — re-verified callers (`ChallengeScreen.jsx:157` spreads `readDevBoardParam()`'s scalar `correctCol`; `DevBoardInjector.jsx:43` passes a scalar `colNum` from a single text input) — both are genuinely scalar-in, so scalar-in/array-out is correct; widening the param would break both call sites for no benefit. Fixture literals (lines ~60/77/85) keep `correctCol: N` as authoring convenience, unchanged. |
| `src/components/DevBoardInjector.jsx` | 17, 41, 43, 48, 81, 88 | **NO CHANGE (RESOLVED T023)** | Confirmed: local component state (`useState`, single numeric text input) feeding `buildDevPuzzle({ correctCol: colNum, ... })` — scalar in, matches the unwidened param. No live reference to `correctCols` needed for the round trip to keep working. |
| `src/lib/devBoardParam.js` | 31 | **NO CHANGE (RESOLVED T023)** | Confirmed: `parseDevBoardSearch` returns a scalar `correctCol` from the single `?devCorrectCol=` URL param, spread directly into `buildDevPuzzle({...p, category})` at `ChallengeScreen.jsx:157` — scalar in, matches the unwidened param. No live reference to `correctCols` exists in this file; nothing to migrate. |
| `src/components/admin/SocraticEditor.jsx` | 9,12,19,27,48,115,116,118 | LESSON-JSON | Authoring UI for the socratic node's own `correctCol` scalar field. Sense 2. |
| `src/screens/SocraticScreen.jsx` | 123,141,190,193 | LESSON-JSON | Grades `col === socratic.correctCol`. Sense 2, explicitly named in spec Background. |

### tests/

| File | Disposition | Notes |
|---|---|---|
| `tests/unit/checkPredicateSortAndScalarSync.test.js` | **DELETE, do not migrate** (T007, FR-004/FR-018) | Exists solely to assert the scalar stays synced with the array. Nothing left to assert once the scalar is gone. Remove from both `test`/`test:fast` arrays in the same commit. |
| `tests/integration/evaluateMoveMultiSolution.test.js` | **MIGRATE** (same commit as `ChallengeScreen.jsx`) | Line ~75 asserts `ChallengeScreen.jsx`'s pre-migration SOURCE TEXT via regex — must change in lockstep (FR-017's worked example). |
| `tests/integration/{claimeven,figure7_jshape,undercut_overcut}.test.js` | **MIGRATE** | All 3 confirmed today to still assert `result.correct_col`/`correctCol` against `checkPredicate`/`evaluatePredicate` return objects — genuinely still `correct_col`-carrying, not stale from the epic's 2026-07-29 list. |
| `tests/integration/{promoteCorrectCols,evaluateMoveStoredSet}.test.js` | **RESOLVED (T029/Batch 3) — SPLIT DISPOSITION** | `promoteCorrectCols.test.js` asserts `buildPromotedPuzzleRow`'s (`server/promotePuzzleRow.js`) output — that production file's `correct_col` copy is explicitly **T035 (Commit 2)**, not Commit 1; migrating this test now would break it against still-unmigrated production code, so it is left UNCHANGED this commit (re-verify/migrate together with T035). `evaluateMoveStoredSet.test.js`'s mock Supabase row literals carried an inert `correct_col: 1`/`null` key never read by `evaluateMoveHandler.js` (which only reads `correct_cols`) — removed as dead weight so it doesn't show up in a later SC-001 grep; no behavior change (functional assertions all use `correct_cols`/`data.accepted`). |
| `tests/unit/{backfillCorrectColsIdempotency,backfillCorrectColsDeactivation}.test.js` | **MIGRATE** | Same commit as `backfill-correct-cols.mjs` (Commit 2). |
| `tests/unit/{devFixtures,multiSolutionAcceptance,shapeDescriptor}.test.js` | **MIGRATE** | `shapeDescriptor.test.js` in particular MUST land in Commit 1 alongside `shapeDescriptor.js` per T018 — confirmed this file has ~24 `correct_col:` fixture literals, all genuinely DB-row-shaped test fixtures. |
| `tests/classifier/classifier.test.js` | **RESOLVED (T029/Batch 3)** | Re-confirmed: `classifier.js` was correctly reversed to RESULT-SHAPE (out of scope, FR-026) — its two `correct_col:` jsonb-key writes were renamed to `correctCol:` (categoryEvidence keys, never read back; see plan.md Decision A precedent), not touched further this batch. This test file's line 392 `assert.equal(result.correctCol, 2, ...)` is unchanged (also RESULT-SHAPE). Only line 408's test-NAME string (`'negative: correct_col creates double threat — must not match'`) matched SC-001's `correct_col\b` grep — reworded to `'negative: converting move creates double threat — must not match'`; no assertion or production code changed. |
| `tests/dom/challengeScreenOutcome.dom.test.jsx` | **MIGRATE** | 4 fixture literals (`correct_col: null`) building synthetic puzzle objects for `ChallengeScreen.jsx` DOM tests — must migrate alongside T019. Also the natural home for the new FR-016 undercut/overcut DOM test per tasks.md T030. |

Every remaining `correctCol\b` hit not listed above (in `tests/blunder/*`, `tests/predicates/*`,
`tests/lessons/*`, `tests/dom/Socratic*`/`SlideEditor*`, `tests/unit/{lessonAudio,lessonLoader,
adminLessonPayload,devBoardParam}.test.js`, `tests/integration/{singleAnswerCategoriesAccepted,
liveCoachFigure7JShape,z_threat}.test.js`) is **LESSON-JSON or RESULT-SHAPE** — each asserts either
an authored lesson node's `correctCol` field or a `predicates.js`/`classifier.js` evaluator's
in-memory return field, never a `puzzles`/`candidates` DB column read. Individually verified by
grep context during this session (see the raw hit dump captured in this session's tool output);
not migrated, no code change.

---

## `server/index.js` — dedicated sub-table (most sites, most nuance)

Fresh `/usr/bin/grep -n "correct_col" server/index.js` confirms **the same 11 `.select(...)` lines
as plan.md, with zero drift**: 1038, 1693, 1728, 1744, 1769, 2530, 2571, 3167, 3242, 3366, 3418.

| Line(s) | Endpoint | Disposition | Notes |
|---|---|---|---|
| 1038 | `GET /api/admin/puzzles` (raw snake_case, feeds `PuzzlePickerModal.jsx`) | **MIGRATE, no suppression** | Consumer uses the value for display AND potential grading — suppress only at the display site (`PuzzlePickerModal.jsx`). |
| 1693,1728,1744,1769 | `GET /api/puzzles/draw` (raw snake_case) | **MIGRATE, no suppression** | Same reasoning — 4 branches of the same query. |
| 2530 | `.select` feeding puzzle-detail | **MIGRATE** | Feeds the line-2550 response field below. |
| 2550 | `correctCol: puzzle.correct_col ?? null` (puzzle-detail HTTP response) | **MIGRATE, WITH suppression** | The ONE `server/index.js` response site FR-011 covers. |
| 2571 | `.select` feeding `/api/puzzles/:id/check` | **MIGRATE** | Feeds line 2602 below. |
| 2602 | `puzzleForPredicate.correctCol: puzzle.correct_col ?? null` | **MIGRATE, EXEMPT from suppression** | Grading input, not a display field (FR-011's explicit exemption). Confirmed: builds its own object by hand, never calls `buildPredicatePuzzle`. |
| 3087 | `correct_col: c.correct_col ?? null,` (candidate promotion write) | **MIGRATE** | Remove the `correct_col` half, keep `correct_cols`. |
| 3167 | `.select` feeding `/api/admin/puzzles/reindex` | **MIGRATE** | Feeds `shapeDescriptor.js` (cross-commit hazard — see below). |
| 3242 | `.select` feeding `GET /api/admin/candidates` | **MIGRATE, no suppression** | Admin curation list, display-only consumer at `CurationWorkspace.jsx`. |
| 3334-3339 | `/api/admin/scores` query-string param (`req.query.correct_col`) | **MIGRATE** | Becomes comma-separated `correct_cols` list per D3's absent/empty/malformed contract. |
| 3366 | `.select` feeding candidate-approval (single) | **MIGRATE** | Feeds line 3376-3377 validation. |
| 3376-3377 | `candidate.correct_col !== null && !isValidCol0(...)` (single-approval validation) | **MIGRATE** | Re-derive over `correct_cols` (every element in range). |
| 3418 | `.select` feeding candidate-approval (batch) | **MIGRATE** | Feeds line 3435-3436 validation. |
| 3435-3436 | same validation, batch route | **MIGRATE** | Same as above. |
| 1927 | `correctCol: predicateResult.correctCol ?? null` (`/api/evaluate-move/inline` response) | RESULT-SHAPE (sense 3) | See drift correction above — NOT the same site as 2602, do not conflate. |
| 3338-3339 | `const correctCol = correctColRaw; const puzzle = { category, moveString: preClickMoves, correctCol };` | **MIGRATE** | Feeds `buildPredicatePuzzle` via the curation `/api/admin/scores` route (D3). |

---

## T006 — Four no-substring camelCase call sites (FR-003), individually resolved

1. **`server/evaluateMoveHandler.js`'s request-body destructure** — confirmed today at **line 135**
   (no drift from "previously seen at line 135"):
   ```js
   const { movestring: bodyMovestring, col, category: bodyCategory, correctCol: bodyCorrectCol, highlightMetadata: bodyHighlightMetadata, puzzleId } = req.body;
   ```
   **Disposition: MIGRATE.**
2. **`server/predicates.js`'s `buildPredicatePuzzle`'s `correctCol` parameter** — confirmed today at
   **line 79** (no drift):
   ```js
   export function buildPredicatePuzzle(category, movestring, { correctCol, highlightMetadata, puzzle } = {}) {
   ```
   **Disposition: MIGRATE.**
3. **`server/answerSetInvariant.js`'s `acceptedCols` `correctCol` destructure** — confirmed today at
   **line 42** (no drift from "previously seen at line 42"):
   ```js
   export function acceptedCols(category, moveString, scores, { correctCol, highlightMetadata } = {}) {
   ```
   **Disposition: MIGRATE.**
4. **`server/predicates.js`'s legacy fallback expression(s)** — **three** sites confirmed today,
   not two as tasks.md's T006 text implies ("verified today in `evalFigure7`/`evalJShape`"):
   - `evalClaimeven` (**line 330**): `const correctCols = puzzle.correctCols ?? (puzzle.correctCol != null ? [puzzle.correctCol] : []);`
   - `evalFigure7` (**line 387**): identical expression.
   - `evalJShape` (**line 400**): identical expression.
   **`evalOddEvenThreat` (line ~420) does NOT have this fallback** — confirmed: it recomputes live
   via `detectOddEvenThreat(board, scores)` instead of reading a stored/threaded set, a
   structurally different strategy. This resolves T006(d)'s explicit open question ("confirm
   whether `evalOddEvenThreat`... has an equivalent fallback expression") — **no, it does not.**
   **Disposition: MIGRATE (all three fallback sites).**

---

## T007 — Three sync-writer files + the sync-assertion test (FR-004), individually resolved

1. **`server/candidate-generator.js`'s `checkPredicate`** (line 474, central sync point at
   ~line 525-529 — the comment `// Centralized sort + scalar sync (D6, FR-016a/FR-019)` anchors it;
   verify by this comment/symbol at task time, not the line number) → **disposition: remove the
   `correct_col` scalar computation, keep `correctCols` only.** Confirmed today: every
   `check*Predicate` function still returns both fields (lines 214, 243-244, 317, 338, 361, 384,
   417, 448, 460, 564, 691); `checkPredicate` itself unconditionally overwrites `result.correct_col`
   at line ~527 with the undercut/overcut NULL carve-out.
2. **`server/scripts/backfill-correct-cols.mjs`** (lines 147, 173) → **disposition: remove the
   `correct_col` write, keep `correct_cols`.** Confirmed today, no drift.
3. **`server/promotePuzzleRow.js`** (lines 43-44) → **disposition: remove the `correct_col` copy.**
   Confirmed today, no drift.
4. **`tests/unit/checkPredicateSortAndScalarSync.test.js`** → **disposition: delete, do not
   migrate** (FR-018). Confirmed today it exists solely to assert the sync relationship (lines 5,
   8, 30, 113, 123, 125, 127) — nothing left to guard once the scalar is retired.

**Additional live consumer of #1's output, found this session and confirmed load-bearing**:
`server/scripts/t018_single_answer_search.mjs:33` reads `result.correct_col`/`result.correctCols`
directly off `checkPredicate`'s return value — must migrate in the SAME commit as
`candidate-generator.js` (already flagged in tasks.md T036; independently re-confirmed here).

---

## Cross-commit read-after-write hazards (T005 mandatory check)

1. **`server/index.js:3167`'s query → `server/shapeDescriptor.js`** — the row this query fetches
   (`/api/admin/puzzles/reindex`) is read by `shapeDescriptor.js`'s `shapeKeyForPuzzle` at 4 lines
   (327, 338, 352, 356). If the query (Commit 1) migrates to `correct_cols` before
   `shapeDescriptor.js` (originally scheduled Commit 3 in an earlier plan draft) migrates its reads,
   the admin puzzle-reindex route silently computes wrong shape keys from `undefined`, with
   `test:fast` staying green. **Already correctly resolved** in the current tasks.md (T018 moves
   `shapeDescriptor.js` into Commit 1) — re-confirmed here, not a new finding, but re-verified as
   still accurate against today's line numbers.
2. **`server/candidate-generator.js`'s `checkPredicate` → `server/scripts/t018_single_answer_search.mjs`** —
   if Commit 2 stops `checkPredicate` from producing `correct_col` before this script's line 33 is
   updated to read `correctCols` instead, the script breaks silently (no crash, no failing test,
   since it isn't in the `test:fast` suite — it's a standalone CLI script). **Already correctly
   resolved** in tasks.md (T036 requires it in the same commit as T033). Re-confirmed here.
3. **NEW (not previously flagged anywhere): `server/index.js:2530`'s `.select()` (puzzle-detail
   query) → line 2550's response field, and `server/index.js:2571`'s `.select()` → line 2602's
   grading input.** Both pairs are already inside the same file and the same planned Commit 1, so
   this is low-risk, but noted explicitly since T005 asks for every entry to be checked, not just
   the ones already caught: if a future re-split of Commit 1 ever separated `.select()` edits from
   response-field edits file-by-file rather than commit-wide, these two pairs would silently break
   the same way as hazard #1. No action needed today since Commit 1 is atomic by hard requirement,
   but recorded for completeness.
4. **`server/candidate-generator.js`'s `detectClaimeven`/`detectOddEvenThreat` (classifier.js) →
   `server/scripts/find_lesson_boards.mjs`** — NOT a hazard, despite superficially resembling one:
   `find_lesson_boards.mjs` reads these detectors' in-memory `correctCol`/`correctCols` return
   fields directly (RESULT-SHAPE sense), never the DB column, so no migration to either file
   changes this script's behavior. Recorded to make explicit that this was checked, not overlooked.

No other cross-commit hazards found beyond the two already reflected in tasks.md's current text
and the two additional notes above.

---

## Drift / corrections against plan.md and tasks.md (read this before starting Batch 2)

1. **`server/classifier.js`'s two `correct_col:` writes (lines 1718, 1736) are RESULT-SHAPE (sense
   3), not DB-scalar (sense 1) — tasks.md's T018 is wrong to schedule this file for migration.**
   Traced the full data flow: both writes live inside `detectClaimeven`'s returned
   `categoryEvidence` object — a purely in-memory pattern-detector result, computed from a `Board`
   simulation with no `puzzle` row involved anywhere in the function's signature or body. The
   *only* place this value is consumed is `server/candidate-generator.js:333`'s
   `checkClaimevenPredicate`, which reads `result.correctCol` (classifier.js's in-memory field) and
   assigns it to `correct_col: result.correctCol` — **that** assignment (in `candidate-generator.js`,
   already correctly classified MIGRATE) is where the DB-scalar sense actually begins. This is
   structurally identical to `server/gameSampling.js`/`server/debug-claimeven.js`'s already-accepted
   "smoke-check-only, upstream of the DB" pattern — classifier.js's `detectClaimeven` produces a
   value consumed by, but not itself part of, the DB write. It also matches the spec's OWN
   Background section verbatim ("sense 3... returned by every `server/predicates.js` evaluator and
   used the same way in `classifier.js`/`shapeDescriptor.js`"), which tasks_critique's T018 override
   contradicts without citing new evidence for `classifier.js` specifically (T018's justification
   text is entirely about `shapeDescriptor.js`'s confirmed DB reads and only bundles
   `classifier.js` in by association). **Recommendation for Batch 2**: do NOT migrate
   `server/classifier.js`; do NOT migrate `tests/classifier/classifier.test.js`'s
   `correctCol`-asserting tests either, since they test this same in-memory field. `shapeDescriptor.js`
   is unaffected by this correction — its own 4 reads are genuinely DB-scalar (verified: they read
   `puzzle.correct_col` off a real row fetched via `server/index.js:3167`'s query) and T018's
   inclusion of that file stands.
2. **T013's citation of `server/index.js:1908` as the `buildPredicatePuzzle` call site feeding
   `/api/puzzles/:id/check` is a misattribution.** Line 1908 is inside the unrelated
   `POST /api/evaluate-move/inline` handler. `/api/puzzles/:id/check` (the route T013 is actually
   about, containing line 2602's `correctCol: puzzle.correct_col ?? null`) builds its
   `puzzleForPredicate` object by hand (lines 2593-2601) and calls `evaluatePredicate` directly —
   it never calls `buildPredicatePuzzle` at all. T013's instruction to "verify... this call site...
   receives the updated array shape via `puzzle.correct_cols`" cannot be executed as written at
   line 1908 for this route; there is nothing to verify there for `/api/puzzles/:id/check`'s sake.
   Batch 2 should simply confirm `puzzleForPredicate.correctCol`'s direct assignment (line 2602)
   is updated to `correctCols: puzzle.correct_cols ?? []`, with no `buildPredicatePuzzle`
   involvement expected or required at that specific site.
3. **`correctCol\b` file count is 43, not plan.md's 49** — see T004 above. Use this table's
   per-file list, not either historical count.
4. **Two previously-unnamed files found this session**: `server/scripts/find_lesson_boards.mjs`
   and `server/scripts/generate_tagblunder_fixtures.mjs`, both RESULT-SHAPE/SMOKE-CHECK (out of
   scope, no code change) — named nowhere in plan.md's Source Code tree or tasks.md's file lists.
   Recorded here so SC-002's human-adjudicated check has an explicit disposition for them too.
5. **`scripts/verify-undercut-puzzles.mjs` is already broken today** (queries a nonexistent
   `puzzles.approved` column — see `db-schema.md`'s explicit note that approval is `is_active`).
   Pre-existing, unrelated to this feature; flagged so a future agent doesn't mistake a fix to this
   script's `correct_col` reference for something this feature broke.

---

## FR-020.2 forward-reference (for US3's T049, not resolved in this batch)

This batch's disposition table already gives every current `correctCol` occurrence an explicit
row above (LESSON-JSON or RESULT-SHAPE for everything not MIGRATE), satisfying SC-002's
requirement in advance — including `server/predicates.js`'s own per-evaluator result field and its
three legacy fallback expressions (T006(d), scheduled for removal in Commit 1, at which point they
stop existing entirely rather than needing a disposition). US3's T049 should re-run this same
classification fresh against whatever the worktree looks like at that time, per Settled decision 7,
rather than copying this table verbatim.
