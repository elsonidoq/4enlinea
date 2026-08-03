# Owner answers — spec 056 plan_critique

## Blocking issue 1 — The six-group commit split recreates the half-migrated state the spec forbids
Answer: **Merge groups A, C and D into one commit**

- State explicitly in the plan that the predicate core (`server/predicates.js`, `server/answerSetInvariant.js`), the HTTP wire layer (`server/evaluateMoveHandler.js`, `server/index.js`), and the React frontend (`ChallengeScreen.jsx` and the other screens) ship as **a single commit**. Groups B, E and F may remain separate commits.
- Record WHY, so a future implementer does not "helpfully" re-split it: `buildPredicatePuzzle`'s parameter rename strands two of its four callers across the A→C boundary (they would pass the old parameter name for a whole commit and the evaluator would grade correct answers as WRONG), and the C→D boundary retires the singular wire field while the only code that sends and reads it is on the other side. Neither break is caught by the test suite — the live-Express integration tests post bodies that never contain the field being renamed, and the only coupling is a source-text regex on the frontend file. So the suite would go green over an app that cannot grade a lesson-sourced challenge.
- Acknowledge the cost in the plan: this is a large commit touching roughly ten files. The reviewer warns that an implementer who resists that size will improvise a split and reopen the same hole — so the plan must state the merge as a hard requirement, not a suggestion.
- The rejected alternative (letting `buildPredicatePuzzle` internally accept both the scalar and the array during the migration) should NOT be adopted, but note in passing that if it ever were, it would be legal — it is a function parameter, not a wire field, so Settled decision 8's "no deprecated alias" ban does not reach it.

## Blocking issue 2 — `PuzzlePickerRow.jsx`'s out-of-scope disposition corrupts authored lesson content
Answer: Accept recommendation (auto-applied — no alternative)

- The plan's data-flow tracing is correct (the file does not read the DB column directly) but its CONSEQUENCE is wrong. Today `puzzleData.correct_col` is NULL for `undercut`/`overcut`, so the row renders "col " (nothing) and a null is persisted into saved lesson JSON. Changing the adapter to `puzzleData.correct_cols[0]` makes it render "col 0" and persist `0` into authored lesson content — the exact first-element fallback Settled decision 9 and FR-010/FR-011 exist to prevent.
- Make the `AdminLessonEditorScreen.jsx` adapter **suppression-aware**: write `null` when the puzzle's category is in the suppressed list, matching today's behavior exactly.
- Add `PuzzlePickerRow.jsx` to FR-016's DOM test. FR-016 mandates a test proving "the puzzle-picker row renders nothing" for these categories; the plan mapped that to `PuzzlePickerModal.jsx`, leaving the file literally named `PuzzlePickerRow.jsx` both unmigrated and untested.
- Treat this as a **fifth suppression site**, not an exemption.

## Blocking issue 3 — One mandated suppression site is not a response field; suppressing there breaks grading
Answer: Accept recommendation (auto-applied — no alternative)

- Record `server/index.js:2602` as an explicit **EXEMPTION** with its reason: it is the internal object handed to the predicate evaluator inside `/api/puzzles/:id/check`, not a response field. Suppressing there would empty the accepted-answer set and make every `undercut`/`overcut` answer grade as wrong. FR-011's literal wording ("both `server/index.js` API response sites") cannot be satisfied as written — reconcile the plan's text with it explicitly rather than leaving the contradiction.
- Re-derive the suppression site list from a fresh `/usr/bin/grep` rather than from the spec's prose.
- Note the two endpoints that ship raw snake_case `correct_col` straight to clients and are named nowhere in the spec's wire-site list: `/api/puzzles/draw` and `/api/admin/puzzles` (the latter is what the puzzle picker reads). The plan swaps their `SELECT` lists mechanically but never reconciles them with the site enumeration — make the count in tasks.md defensible.

## Decision A — Query-string format for a set of columns
Answer: **Comma-separated, `?correct_cols=1,3`**

- Keep the plan's existing choice. More readable, and consistent with the comma convention already used elsewhere in this codebase (`server/adminAuth.js` comma-splits an environment variable). The reviewer confirmed there is genuinely no array-in-query-string precedent — all ~30 `req.query.*` reads in `server/index.js` are scalar.
- **Required addition:** the plan MUST specify the absent / empty / malformed cases, which it currently does not. Specifically, an **absent parameter must remain a legitimate `null`**, exactly as today. Naively doing `''.split(',').map(Number)` yields `[NaN]`, which would flow through the existing per-element `isValidCol0` validation and 400 where today an absent parameter is valid. Write the parsing and validation behavior out explicitly.

## Decision B — Where `undercut`/`overcut` suppression lives
Answer: **Mirrored constant checked at each display site**

- Keep the plan's choice: `SUPPRESSED_SINGLE_COLUMN_CATEGORIES` duplicated into both `server/categories.js` and `src/lib/categories.js`, checked at each single-column display site. The reviewer independently verified the "Mirrored (duplicate-and-sync, NOT cross-imported) … keep both literals identical by hand" convention is real and quoted accurately from the existing `MULTI_SOLUTION_CATEGORIES`/`SINGLE_ANSWER_CATEGORIES` constants, and that nothing in the plan cross-imports it.
- **Required amendment — state this explicitly in the plan:** the two raw-row endpoints (`/api/puzzles/draw`, `/api/admin/puzzles`) must **NOT** suppress server-side, because their consumers use the value for grading as well as display. Suppression belongs at the **display sites only**. Without this stated, a well-meaning implementer will null the value at the source and break grading.
