# Plan critique — spec 056 (plan_critique stage)

## Blocking issues

**1. The plan's own commit grouping recreates the broken half-migrated state the spec was written to forbid — and the test suite will certify it as green.**

The plan splits User Story 2 (migrate every consumer) into six sequential commit groups. Group A is the server's predicate core (`server/predicates.js`, `server/answerSetInvariant.js`); Group C is the HTTP wire layer (`server/evaluateMoveHandler.js`, `server/index.js`); Group D is the React frontend. Two boundaries break:

- *A → C.* Group A migrates `buildPredicatePuzzle`'s `correctCol` parameter (verified, `server/predicates.js:79`: `export function buildPredicatePuzzle(category, movestring, { correctCol, highlightMetadata, puzzle } = {})`) and removes the legacy fallback (`predicates.js:330`, `puzzle.correctCols ?? (puzzle.correctCol != null ? [puzzle.correctCol] : [])`). But two of its four callers live in Group C — `evaluateMoveHandler.js:250` and `index.js:1908` — and would keep passing the old parameter name for a whole commit. The evaluators would then see an empty accepted set and grade correct answers as wrong.
- *C → D.* Group C retires the singular `correctCol` HTTP field; the only code that sends and reads it is `ChallengeScreen.jsx`, in Group D.

Neither break is caught. I read `connect-four/tests/integration/evaluateMoveMultiSolution.test.js` in full: its live-Express tests post bodies of the form `{ movestring, col, category }` — they never send the field being renamed — and the only thing tying the two sides together is a *source-text regular expression* (`assert.match(block, /correctCol:\s*current\.correct_col/)`) that fires solely on the frontend file. So `npm run test:fast` stays green over an app that cannot grade a lesson-sourced challenge. That is precisely failure mode (b) the spec's "Why one story, not several" rationale says deploy-atomicity eliminates, and it contradicts requirement FR-025 ("There is no commit boundary at which the application is expected to run in a half-migrated state") and success criterion SC-005.

*Recommended fix:* state explicitly that Groups A, C and D are **one commit**, not three (Groups B, E, F may stay separate). If that commit is judged too large, the alternative is to let `buildPredicatePuzzle` accept both the scalar and the array *internally* for the duration of US2 — that is a function parameter, not a wire field, so Settled decision 8's "no deprecated alias" ban does not apply — and say so, because as written the plan reads as forbidding it.

**2. `PuzzlePickerRow.jsx` is dispositioned out of scope, and that disposition silently reintroduces the exact fallback Settled decision 9 forbids.**

The plan's Research D6 traces the data flow correctly — I re-verified it end to end. `AdminLessonEditorScreen.jsx:216` copies `correctCol: puzzleData.correct_col` into the in-memory `lesson.confirmationChallenges` array, and `PuzzlePickerRow.jsx:40` renders `{puzzle.moveString} · col {puzzle.correctCol}` off that array. So the file does not read the database column directly. But the *consequence* is wrong. Today `puzzleData.correct_col` is NULL for `undercut`/`overcut`, so that row renders "col " (nothing) and a null is persisted into the saved lesson JSON. The plan changes the adapter to `puzzleData.correct_cols[0]`, which for those two categories is a meaningless column 0 — so the row will render "col 0" and persist `0` into authored lesson content. Settled decision 9 and requirement FR-010/FR-011 exist specifically to prevent falling back to the array's first element on a single-column display.

Compounding it: requirement FR-016 mandates a DOM test proving "the puzzle-picker row … renders nothing for `undercut` and `overcut`". The plan maps "puzzle-picker row" to `PuzzlePickerModal.jsx`, leaving the file literally named `PuzzlePickerRow.jsx` both unmigrated and untested.

*Recommended fix:* make the `AdminLessonEditorScreen.jsx:216` adapter suppression-aware (write `null` when the puzzle's category is in the suppressed list, matching today's behavior exactly), and add `PuzzlePickerRow.jsx` to FR-016's DOM test. Treat this as a fifth suppression site, not an exemption.

**3. One of the four mandated suppression sites does not exist as described, and installing the check there would break grading.**

Requirement FR-011 demands the new category-based suppression check at four sites, including "**both** `server/index.js` API response sites that currently pass through `correct_col ?? null`". A full grep of `server/index.js` returns exactly two such lines: `2550` and `2602`. But the plan itself establishes (correctly) that line 2602 is *not* a response field — it is the internal object handed to the predicate evaluator inside `/api/puzzles/:id/check`. Suppressing there would empty the accepted-answer set and make every `undercut`/`overcut` answer grade as wrong. Yet Research D2 still lists "`server/index.js`'s other response-shaping site" as one of the four consumers of the shared list. The plan cannot both be right about 2602 and satisfy FR-011 as literally worded.

Separately, two endpoints ship the raw snake_case `correct_col` straight to clients — `/api/puzzles/draw` (`res.json({ puzzles })`, selects at lines 1693/1728/1744/1769) and `/api/admin/puzzles` (line 1038, which is what the puzzle picker reads) — and neither is named in the spec's list of wire sites. The plan handles their `SELECT` lists mechanically but never reconciles them with the site enumeration.

*Recommended fix:* re-derive the suppression site list from the grep rather than from the spec's prose, record `index.js:2602` as an explicit **exemption** (grading input, must keep the full array), and note the two raw-row endpoints so the count in tasks.md is defensible.

## Decisions required

**A. How does the curation endpoint carry a set of columns in its query string?**

`/api/admin/scores` today reads a single value (`server/index.js:3334`: `req.query.correct_col !== undefined ? parseInt(req.query.correct_col, 10) : null`). I checked the handoff's flag: it is accurate that no array-in-query-string convention exists — every one of ~30 `req.query.*` reads in `server/index.js` is scalar. The nearest relative is `server/adminAuth.js:4`, which comma-splits an environment variable.

- *Option 1 (plan's choice):* comma-separated, `?correct_cols=1,3`.
- *Option 2:* Express's native repeated-key form, `?correct_cols=1&correct_cols=3`, which arrives pre-parsed as an array.

**Recommended:** keep Option 1 for readability and consistency with the comma convention already used elsewhere — but the plan must also specify the absent / empty / malformed cases, which it currently does not. Naively, `''.split(',').map(Number)` yields `[NaN]`, which would pass through the existing per-element `isValidCol0` validation path as a 400 where today an absent parameter is a legitimate `null`.

**B. Where does `undercut`/`overcut` suppression live — server or client?**

- *Option 1:* server nulls out the field before responding; clients render whatever they get.
- *Option 2 (plan's choice):* a mirrored constant `SUPPRESSED_SINGLE_COLUMN_CATEGORIES` duplicated into `server/categories.js` and `src/lib/categories.js`, checked at each display site.

I verified the "mirrored, not cross-imported" convention the plan cites is real and quoted accurately — `server/categories.js` carries it verbatim on both `MULTI_SOLUTION_CATEGORIES` and `SINGLE_ANSWER_CATEGORIES` ("Mirrored (duplicate-and-sync, NOT cross-imported) in src/lib/categories.js per research.md R3 — keep both literals identical by hand"), and nothing in the plan cross-imports it. So Option 2 is well-grounded.

**Recommended:** Option 2, with one amendment — the two raw-row endpoints (`/api/puzzles/draw`, `/api/admin/puzzles`) must **not** suppress server-side, because their consumers use the value for grading as well as display. Suppression belongs at the display sites only; say so explicitly, or a well-meaning implementer will null it at the source and break grading.

---

## Handoff context

**Key decisions and reasoning.** I prioritized defects that are invisible to the test suite over documentation or enumeration nitpicks, because this plan's entire safety argument rests on "`test:fast` green after every commit." Issue 1 is first because it invalidates that gate structurally: I confirmed by reading `evaluateMoveMultiSolution.test.js` end to end that its live-Express tests never transmit the field being renamed, so nothing mechanically couples the server and frontend halves of the wire change. Issue 2 is a negative claim that erases work — I re-traced it rather than trusting the handoff, found the data-flow reasoning sound but the conclusion wrong, and the failure is a data-corruption one (a meaningless `0` persisted into authored lesson JSON), not merely cosmetic. Issue 3 came from grepping `server/index.js` exhaustively rather than sampling; it is the kind of contradiction that only surfaces when you enumerate all instances.

**What I verified at source, and what I did not.** Verified directly: the `buildPredicatePuzzle` signature and all four call sites; the `predicates.js:330` fallback; every `correct_col`/`correctCol` occurrence in `server/index.js` (35 lines); the mirrored-constant convention comment in `server/categories.js`; every `req.query.*` read in `server/index.js` (the D3 no-precedent claim — it holds); `PuzzlePickerRow.jsx` in full plus its single render site and the adapter that feeds it; the response shapes of `/api/puzzles/draw` and `/api/admin/puzzles`. **Not** verified: I did not re-run `npm run test:fast` to confirm the 1685/5 baseline — the handoff re-measured it independently the same day and it matched the prior figure, so a third measurement had low information value. I also did not open Groups B, E, or F's files individually; those groups are low-coupling and the plan itself marks most as "TRIAGE AT PICKUP," which is a legitimate deferral under Settled decision 7.

**What I deliberately did not flag.** (a) The plan says "six `.select(...)` query strings" and then lists eleven line numbers — a real inconsistency, but a counting slip that any implementer fixes by grepping; not worth one of three slots. (b) The "TRIAGE AT PICKUP" markers on ~10 files look like vagueness but are correct per Settled decision 7, which requires the triage table to be a fresh pickup-time artifact — treating them as defects would be a misreading of the epic. (c) The plan's ~35-task estimate and its skipping of `research.md`/`contracts/` are both defensible for a plumbing sweep. (d) `/api/puzzles/draw` shipping raw `correct_col` to the player client is technically an unnamed wire site, but the plan does swap those `SELECT` lists, so it is handled in substance; I folded the point into issue 3 rather than spending a slot on it.

**Fragile areas the next agent should scrutinize.** First, my issue-1 fix ("make A, C and D one commit") will produce a large commit touching roughly ten files — if the implementer resists that, the dual-accept escape hatch must be written into the plan explicitly, or they will improvise a split and reintroduce the same hole. Second, the plan's own open question about whether `ChallengeScreen.jsx`'s `highlightMetadata` field becomes dead once the `predicates.js` fallback is removed is still unresolved and I did not resolve it — it is a genuine at-task-time call, but note that `highlightMetadata` is load-bearing for `z_threat` grading (visible in that test file's `z_threat` cases), so dropping it casually would break more than `correct_col`. Third, nobody — not the epic author, the plan author, nor me — has verified the runtime precondition that spec 051's backfill has actually populated `correct_cols` on the target database. That is Settled decision 5 and FR-005, it is a blocking gate on all of User Story 2, and it cannot be checked by reading files.
