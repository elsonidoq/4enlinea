# Epic 9 critique (epic_critique stage)

## Blocking issues

**1. The epic's file lists and reference counts are stale by ~35%, and 11 files it never names are load-bearing — including the ones spec 051 itself created to *maintain* the scalar.**

The epic (and OI-81, the backlog entry it is built from) states "105 references across 22 files." A fresh count in this worktree of the unambiguous snake_case form gives **142 references across 33 files**. Per-file drift is small (`server/index.js` 22→20, `candidate-generator.js` 13→14, `classifier.js` 2→3), but eleven whole files are absent from the epic's US9.2–9.4 enumerations, and three of them are the *write* side of the very sync this epic removes:

- `connect-four/server/scripts/backfill-correct-cols.mjs` (writes `correct_col` alongside `correct_cols` on every backfilled row)
- `connect-four/server/promotePuzzleRow.js` (copies the scalar candidate→puzzle on promotion)
- `connect-four/server/candidate-generator.js:527` — the single central sync point that decides the scalar's value per category
- plus `server/scripts/repair-overcut-highlight-metadata.js`, `server/scripts/t018_single_answer_search.mjs`, and six test files. One of those, `tests/unit/checkPredicateSortAndScalarSync.test.js`, exists *only* to assert that the scalar stays in sync — it must be **deleted**, not migrated, and nothing in the epic says so. US9.4 says "the 8 test files"; there are now 13.

The epic does anticipate drift (US9.1 says re-derive), so this is not fatal — but its enumerations read as an authoritative work breakdown, and a spec author will treat them as the task list. Also, the acceptance criterion's grep exclusion list names only `016_correct_col.sql`; `061_correct_cols.sql` mentions the scalar in comments too, so the stated grep cannot return clean as written.

*Recommended resolution:* replace the hard-coded counts and file lists with (a) the re-derivation command, (b) an explicit instruction that US9.1 must produce the per-file triage table that US9.2–9.4 then consume, and (c) name the three sync-writer files and the sync test as known must-handle items with their *disposition* (delete vs. migrate). Fix the acceptance grep's exclusion list to name `016`, `061`, and the drop migration.

**2. Retiring the scalar is a breaking HTTP API change, and the epic treats it as purely internal.**

`correctCol` is not just a variable name — it crosses the wire in three directions:
- **Response field**: `server/index.js` returns `correctCol: puzzle.correct_col` (~lines 2550, 2602) and `correctCol: evaluation.correctCol` (~2643, 1927).
- **Request body field**: `server/evaluateMoveHandler.js:135` destructures a client-supplied `correctCol` from `req.body` — the legacy computed-live grading path.
- **Query-string parameter**: `src/components/CurationWorkspace.jsx:158` builds `&correct_col=${candidate.correct_col}` into a URL.

`docs/architecture/api-conventions.md` documents this contract in three places (the `/api/puzzles/:id` camelCase rename, the `/api/puzzles/draw` snake_case-vs-camelCase mismatch, and the evaluate-move select list). That file is **not** in the epic's "Authoritative sources of truth", and US9.5's documentation task names only `data-model.md` and `db-schema.md`. So a spec written from this epic would ship an API contract change with no contract requirement and no contract doc update.

*Recommended resolution:* add `docs/architecture/api-conventions.md` to the sources and to US9.5's doc-update list; add an explicit requirement covering what each wire field becomes (drop, or replace with a `correctCols` array), and whether the client-supplied request field is retired or kept as a deprecated input.

**3. The `undercut`/`overcut` "no scalar" carve-out that spec 051 deliberately created is nowhere in Epic 9 — and dropping it silently regresses two admin screens.**

Spec 051's FR-019 (the requirement that keeps the legacy scalar synced during that feature) carries an explicit owner carve-out: for the `undercut` and `overcut` puzzle categories the scalar stays `NULL`, *because* `correct_cols[0]` for those categories would typically be column 0 — a semantically meaningless value. Three live consumers rely on `NULL` meaning "draw nothing": the curation board's hint marker (`src/components/CurationWorkspace.jsx:262-263`), the puzzle picker's `col {puzzle.correct_col}` label (`src/components/admin/PuzzlePickerModal.jsx:111`), and the API response sites in `server/index.js`. `candidate-generator.js:361,384` encodes the same rule in code.

Epic 9 never mentions `undercut` or `overcut`. The obvious mechanical migration — swap `correct_col` for `correct_cols[0]` — makes all three start rendering column 0 as "the answer," which is exactly what FR-019 was written to prevent. US9.3 also flags these admin screens as having no test coverage, so nothing would catch it.

*Recommended resolution:* add a Settled decision and an acceptance criterion stating that single-column display consumers must preserve the "nothing to show" behavior for `undercut`/`overcut` (e.g. render nothing when the category is one of the two, or when the set is not a single column), and add a manual QA step naming those two categories specifically.

## Decisions required

**A. Does the epic's "zero references" acceptance criterion cover `correctCol` used as a *computed result* field, not a column read?**

Beyond the two meanings the epic already distinguishes (the DB scalar, in scope; the authored lesson-JSON field, out of scope) there is a **third**: `server/predicates.js` returns `{ result, correctCol }` from every puzzle evaluator (45 occurrences in that one file), and `classifier.js` / `shapeDescriptor.js` use `correctCol` the same way — as the answer a function just computed, never as a value read from the database. In total the singular camelCase identifier appears **329 times across 50 files**; the epic names only three of them. The acceptance criterion as written ("zero remaining references to … the puzzle/candidate-scalar sense of `correctCol`") does not say which side of the line this falls on, and it is genuinely fuzzy because `buildPredicatePuzzle`'s `correctCol` **parameter** — which the epic explicitly lists as must-migrate — feeds exactly these evaluators.

- **Option 1 (recommended):** out of scope. Only camelCase sites that read/write the DB column or cross the HTTP wire get migrated; the result-shape field keeps its name. Cheapest, lowest regression risk, and consistent with "pure plumbing retirement."
- **Option 2:** rename the result-shape field too (e.g. to `acceptedCol`), for a single unambiguous vocabulary.

Whichever is chosen, the acceptance criterion must be reworded to be checkable — under Option 1 a repo-wide "zero references" grep will never return clean, so the criterion needs to be scoped to a named file/pattern set.

**B. When a puzzle's answer set feeds an authored lesson, and a lesson feeds a puzzle-shaped request, which side converts?**

Two call sites sit exactly on the boundary between the in-scope scalar and the explicitly out-of-scope lesson-JSON field of the same name:
- `src/screens/AdminLessonEditorScreen.jsx:216` copies a puzzle's stored scalar *into* an authored lesson node (`correctCol: puzzleData.correct_col`).
- `src/screens/ChallengeScreen.jsx:186` sends an authored lesson node's value *back out* in a puzzle-shaped grading request (`correct_col: ch.correctCol`).

The epic lists both files as "migrate off the scalar" while simultaneously declaring lesson JSON untouchable, without saying how the two meet.

- **Option 1 (recommended):** lesson JSON keeps its single-column scalar unchanged; both seams get a thin adapter (`correct_cols[0]` on the way in, wrap as a one-element set on the way out). Honors the "NOT included" constraint exactly and touches no authored content.
- **Option 2:** widen the lesson-JSON field to a set for symmetry. This contradicts the epic's own "NOT included" section and would require re-authoring lesson content, so it should only be chosen deliberately.

## Handoff context

**Systemic issues affecting the whole epic.** The epic was written on 2026-07-29 *before* spec 051 landed, and it describes a codebase that spec 051 then changed. Every concrete number and file list in it predates the very feature it depends on. That is one systemic defect with three faces: stale counts (blocking #1), unnamed new sync-writer files (also #1), and un-inherited FR-019 carve-outs (#3). A fix agent should assume any *specific* claim in Epic 9 is pre-051 and re-verify it, while any *policy* claim (the lesson carve-out, the drop-last sequencing, Lane C isolation) is still sound. Second systemic gap: the epic frames the work as an internal-refactor sweep, so it has no notion of an external contract — no API requirement, no client-compatibility window, no api-conventions.md. That framing is what let blocking #2 through.

**Reviewer frame.** I weighted, in order: (1) fresh `/usr/bin/grep` output over the working tree — the only non-stale layer, and the one the epic's own US9.1 tells you to trust; (2) spec 051's `spec.md` FR-016a/FR-017/FR-019 verbatim, because they are the *reason* the scalar still exists and therefore define what "retire it safely" means; (3) actual source lines at each named call site, to distinguish a column read from a same-named result field; (4) the architecture docs, mainly to find which ones the epic forgot to list. I deliberately did not treat OI-81 as an independent source — it is the same 2026-07-29 text the epic was distilled from, so it corroborates nothing.

**Non-obvious intent a fix agent should know.** The epic's enumerated file lists were never meant as a task list — US9.1 exists precisely to regenerate them. The right fix is to demote the lists to "known-as-of-2026-07-29, re-derive" and let US9.1's triage table be the contract, *not* to paste in my fresh numbers, which will themselves be stale within days in this concurrently-edited repo. Also note the migration-numbering caveat in Settled decision 4 is sharper than it reads: `061` already collides on disk (`061_correct_cols.sql` and `061_security_lints.sql`), so "max prefix + 1" is ambiguous today; latest on disk is `063_puzzle_attempts_outcome_narrow.sql`.

**What I did not flag, and why.** (a) I did not verify that spec 051's backfill has run against the target DB — the epic's Settled decision 5 makes it a US9.1 runtime precondition, not a spec-readiness gap. (b) I did not flag `server/gameSampling.js` / `debug-claimeven.js`; I confirmed they only produce a `correctCol` value upstream of the DB write, so the epic's "smoke-check, don't migrate" treatment is correct. (c) I did not flag "Open questions: None" as wrong even though decisions A and B above are real open questions — that field will be resolved by the same edit that fixes the blocking issues, and calling it out separately would be double-counting. (d) I did not flag the Lane C isolation reasoning or the 051-merged dependency; both check out and the preceding gate independently confirmed 051 is on this branch.
