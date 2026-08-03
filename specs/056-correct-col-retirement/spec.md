# Feature Specification: Legacy `correct_col` Scalar Retirement

**Feature Branch**: `056-correct-col-retirement`
**Created**: 2026-08-03
**Status**: Draft
**Input**: User description: "Legacy `correct_col` scalar retirement (Epic 9 of `docs/epics/open-issues-epics.md`, OI-81) — finish the retirement spec 051 deliberately left undone. Migrate every remaining server, frontend, script, and test consumer off the `correct_col` DB scalar and its DB-scalar/wire-crossing camelCase mirror `correctCol` onto the `correct_cols`/`correctCols` array form, then drop the `correct_col` column via a migration that lands strictly after every consumer has migrated."

## Background

Spec 051 (Epic 1) introduced `correct_cols integer[]` on the `puzzles` and `candidates` tables as the
computed-once, solver-gated source of truth for a puzzle's accepted answer column(s). It deliberately kept
the legacy scalar column `correct_col` **in sync** (written as `correct_cols[0]`, per spec 051 FR-017/FR-019)
rather than migrating every consumer and dropping it in the same feature — the re-derived consumer inventory
came back at **105 references across 22 files** (not the 62/11 estimate the original decision had been made
on), too large to bolt onto an already-large feature (schema migration + backfill + API contract change).
This is recorded as `docs/open_issues.md` **OI-81** and its spec-ready home, `docs/epics/open-issues-epics.md`
**Epic 9 — Legacy `correct_col` Scalar Retirement**.

This feature is that deferred migration and drop, sized and specced on its own: migrate every remaining
consumer off the scalar, then remove it.

**Critical scoping fact — three distinct senses of `correctCol`.** This name is overloaded across the
codebase and this feature touches only one of the three senses:

1. **The DB scalar** — `puzzles.correct_col` / `candidates.correct_col`, and its camelCase wire/object mirror
   when that mirror carries a value read from or written to this column. **In scope. This feature retires
   it.**
2. **The authored lesson-JSON field** — a `correctCol` field on Socratic/confirmation-challenge nodes
   (`server/lessonLoader.js`, `server/scripts/verify_lesson_content.mjs`, `SocraticScreen.jsx`'s
   `col === socratic.correctCol`). This has nothing to do with the `puzzles`/`candidates` table. **Explicitly
   out of scope — no migration script touches it.**
3. **The computed result-shape field** — returned by every `server/predicates.js` evaluator and used the same
   way in `classifier.js`/`shapeDescriptor.js`. This is an answer a function just computed in memory; it is
   never read from or written to the database. **Out of scope — it keeps its current name.**

Every requirement, acceptance criterion, and "done" check in this spec is scoped to sense 1 only. A
blanket "zero occurrences of the string `correctCol`" check is explicitly rejected as a completion criterion
— senses 2 and 3 legitimately keep the name forever.

**Wire-contract change.** Per epic Settled decision 8, every HTTP-crossing field that currently carries the
DB-scalar sense — the `/api/puzzles/:id` and evaluate-move response fields, the evaluate-move request body
field, and the curation query-string parameter — becomes the array form `correctCols`. The legacy singular
wire field is retired outright in the same change, with **no deprecated alias**, because the frontend and
server ship in the same deploy and there is no independently-versioned stale client to break.

## Dependency

This feature **requires spec 051 (Epic 1) to have shipped and merged**, with its backfill having actually
run against the target database: `correct_cols` must already exist and be populated on every row before any
consumer can be migrated off the scalar. The compatibility sync spec 051 ships (FR-017) is exactly what keeps
`correct_col` safe to read while this feature's migration work is in flight.

## User Scenarios & Testing *(mandatory)*

<!--
  This is an internal engineering/plumbing retirement feature: there is no new end-user-facing surface.
  The "users" of each story below are primarily the engineer(s) performing the migration; secondarily,
  players and admins, whose observable behavior must be UNCHANGED except for the intentional wire rename.
  There are only two independently-shippable slices here, ordered by a hard dependency chain (each story's
  starting state is the prior story merged and green): (1) produce the migration plan, and (2) execute the
  entire breaking migration — server, frontend, scripts, and tests together — as one deploy-atomic unit,
  because the wire contract has no backward-compatible intermediate state. The column drop is a third,
  strictly-final slice gated on the second's completion.
-->

### User Story 1 - Fresh consumer inventory and migration plan (Priority: P1)

An engineer picking up this retirement needs a trustworthy, current map of every place `correct_col` /
`correctCol` (DB-scalar sense) is read or written, because the existing inventory (OI-81, and the epic's own
per-file lists) is a snapshot from 2026-07-29 in a concurrently-edited repository and cannot be trusted as a
task list.

**Why this priority**: Every later story consumes this story's output as its literal task list. Migrating
against a stale inventory risks silently skipping a real consumer (a live bug) or wasting effort on a file
that no longer references the scalar.

**Independent Test**: Can be fully tested by re-running the derivation grep against the current worktree and
confirming the resulting triage table accounts for every hit with an explicit disposition — delivers a
verified, current work breakdown independent of any code change.

**Acceptance Scenarios**:

1. **Given** the current worktree, **When** the engineer searches for every `correct_col`/`correctCol`
   occurrence across `connect-four/server`, `connect-four/src`, `connect-four/scripts`, and
   `connect-four/tests`, **Then** every hit is classified into exactly one of: migrate (DB scalar, in scope),
   lesson-JSON field (out of scope), computed result-shape field (out of scope), or smoke-check-only
   (upstream of the DB, e.g. `gameSampling.js`, `debug-claimeven.js`).
2. **Given** the triage table, **When** the engineer checks it against the four known no-substring camelCase
   call sites (the evaluate-move handler's request-body destructure, the predicate-evaluator puzzle-builder's
   `correctCol` parameter, the answer-set-invariant helper's `correctCol` destructure, and the predicate
   evaluator's own legacy fallback expression that reads `correctCol` when `correctCols` is absent) and the
   three known sync-writer files plus the sync-assertion test, **Then** each of these seven items has an
   explicit, individually-stated disposition in the table (not folded into an aggregate count).
3. **Given** the dependency on spec 051, **When** the engineer checks the target database, **Then** they
   confirm `correct_cols` has actually been populated (backfill complete) before any consumer migration
   begins, and record that confirmation.
4. **Given** the triage table is produced, **When** the migration story is planned, **Then** it references the
   triage table's entries as its task list, not the per-file lists or counts written in the epic or in
   OI-81.
5. **Given** the plan artifact that follows this story, **When** it records its first task output, **Then**
   that output is the measured pre-change regression-suite baseline (the exact command run, the date, the
   pass/fail counts, and the identity of each expected/pre-existing failure) — captured before any migration
   work begins, so that "no failures beyond baseline" (used throughout this feature) has a concrete artifact
   to point at.

---

### User Story 2 - Migrate every consumer and retire the wire contract, as one deploy-atomic unit (Priority: P2)

Server, frontend, scripts, and tests must all move off the `correct_col` scalar together. This is a single
story, not three, because the wire-contract change has no safe intermediate state: the legacy singular field
is retired with no deprecated alias (per Settled decision 8), so a server-only or frontend-only deploy leaves
some caller sending or expecting a field the other side no longer has. Within this one story, work still
proceeds in small, ordered groups (e.g., one server file plus its callers, one frontend screen, one script) —
but each group's production code and the tests that cover it land in the **same commit**, and the suite must
be green after every such commit, not just at the end of the story.

**Why one story, not several**: Splitting this into "server," "frontend," and "tests" sub-stories was tried
and rejected — it produced two problems that cannot be fixed by reordering: (a) at least one existing test
asserts the *pre-migration source text* of a frontend file, so migrating that file and migrating its test are
the same change, not two; and (b) a server-only migration silently breaks lesson-sourced inline-challenge
grading (the request path with no `puzzleId`, which depends entirely on the client-supplied field) with no
test catching it, so a "green server-only" gate would report success over a broken app. Declaring the whole
thing deploy-atomic removes both failure modes: there is no commit boundary at which the app is expected to
work in a half-migrated state, so there is nothing false for the gate to certify.

**Independent Test**: Can be fully tested by running the regression suite after each atomic commit and by
inspecting the HTTP response/request shapes directly (e.g., via the evaluate-move and puzzle-detail
endpoints) to confirm only the array field is present at every point past the first commit that touches the
wire contract; and by exercising the curation workspace, puzzle picker, challenge screen, and admin lesson
editor for a representative `undercut`/`overcut` puzzle to confirm the "nothing to show" behavior is
unchanged.

**Acceptance Scenarios**:

1. **Given** User Story 1's triage table, **When** every server-side entry marked "migrate" is converted to
   read/write `correct_cols`/`correctCols` in the same commit as any test covering it, **Then** no server file
   outside the historical migration files or the two out-of-scope senses references the DB-scalar sense of
   `correct_col`/`correctCol`.
2. **Given** a client request or response that used to carry the singular `correctCol` field over HTTP,
   **When** the same interaction happens after the commit that retires it, **Then** the field present is
   `correctCols` (an array) and the singular field is absent — not present as a deprecated alias alongside it
   — and this holds for the puzzle-detail response, the evaluate-move response, the evaluate-move request
   body, and the curation query-string parameter.
3. **Given** the three known sync-writer files (the backfill script, the candidate-promotion copier, and the
   candidate generator's central sync point), **When** each is migrated, **Then** none of them writes the
   `correct_col` column any longer.
4. **Given** the `undercut`/`overcut` "show nothing" behavior is, before this feature, an emergent side effect
   of `correct_col` being NULL for those two categories (never code anyone wrote), **When** the scalar is
   retired and `correct_cols` — which stays fully populated for these categories — becomes the only source,
   **Then** a newly-authored, explicit, category-based suppression check has been added at every site that
   previously relied on the NULL: the curation workspace's board hint marker, the puzzle picker's column
   label (`PuzzlePickerModal.jsx`), the puzzle-picker row rendered from staged lesson content
   (`PuzzlePickerRow.jsx`, via the puzzle→lesson adapter in `AdminLessonEditorScreen.jsx` that feeds it), and
   `server/index.js`'s puzzle-detail HTTP response site — not just the frontend sites. `server/index.js`'s
   internal predicate-builder input used by `/api/puzzles/:id/check` (which also passes through
   `correct_col ?? null` today) is explicitly **exempt**: it is not a response field, it is the accepted-answer
   set the grading evaluator reads, and suppressing it would grade every correct `undercut`/`overcut` answer as
   wrong.
5. **Given** the category-based suppression check from Scenario 4, **When** it is implemented, **Then** it
   reads from one shared, explicitly-named list of suppressed categories rather than being re-derived
   ad hoc at each site, and that list is **not** `SINGLE_ANSWER_CATEGORIES` in
   `src/lib/categories.js` — `undercut` and `overcut` are both members of that set despite structurally
   admitting multiple accepted columns, so it cannot be the discriminator.
6. **Given** User Story 1's triage table, **When** every frontend and non-test-script entry marked "migrate"
   is converted, **Then** no such file outside the two out-of-scope senses references the DB-scalar sense of
   `correct_col`/`correctCol`.
7. **Given** an admin copies a puzzle's answer into a lesson node via the lesson editor, **When** the copy
   happens, **Then** the lesson node receives the puzzle's first accepted column (from the array) for every
   category **except** `undercut`/`overcut`, for which it receives `null` — matching today's observable
   behavior exactly, since the source `correct_col` is NULL for those categories today — and the authored
   lesson-JSON scalar field itself remains unchanged in shape.
8. **Given** a lesson-sourced inline challenge is graded via the same puzzle-shaped grading request the
   puzzle screen uses, **When** the challenge screen sends that request, **Then** it wraps the lesson node's
   single scalar answer as a one-element array — the lesson content itself is never rewritten to be
   array-valued.
9. **Given** the `undercut` and `overcut` categories have no automated coverage on the admin screens today,
   **When** verification for Scenario 4 is performed, **Then** it happens against a real, locally generated
   and promoted `undercut` puzzle and a real `overcut` puzzle (never skipped for "no such puzzle exists
   locally"), via a manual pass on the curation workspace and the puzzle picker.
10. **Given** the manual pass in Scenario 9, **When** this story completes, **Then** a small DOM test has also
    been added asserting that the puzzle picker's column label (`PuzzlePickerModal.jsx`), the puzzle-picker
    row rendered from staged lesson content (`PuzzlePickerRow.jsx`), and the curation hint marker
    (`CurationWorkspace.jsx`) all render nothing for `undercut` and `overcut` puzzles — converting this from a
    manually-checked risk into a permanent automated guard.
11. **Given** every test file marked "migrate" in the triage table, **When** the production file it covers is
    migrated, **Then** that test is converted to assert against the array form in the **same commit** — never
    deferred to a later commit or story.
12. **Given** the one test that exists purely to assert the scalar stays synchronized with the array, **When**
    this story completes, **Then** that test file has been deleted (not converted to assert something else),
    because there is nothing left for it to guard once the scalar is retired.
13. **Given** the regression suite's documented pre-change baseline (recorded per User Story 1, Scenario 5),
    **When** each atomic commit in this story lands, **Then** the suite is re-run immediately after that
    commit and shows no new failures beyond the baseline — a merge that introduces a new failure MUST be
    fixed before the next commit proceeds.

---

### User Story 3 - Drop the legacy column (Priority: P3)

Once every consumer is confirmed migrated, the `correct_col` column itself must be removed from both tables,
and the project's own documentation of the schema and API contract must reflect that removal.

**Why this priority**: This is the irreversible, highest-risk step and therefore must come last, strictly
after every other story has landed and been verified — dropping the column while any consumer still reads it
produces a silent runtime failure (a missing/undefined value), not a loud migration error.

**Independent Test**: Can be fully tested by confirming a repo-wide search for the DB-scalar sense returns
zero hits before the migration is written, then confirming the migration applies cleanly and the application
continues to function with no references to the dropped column anywhere in the codebase.

**Acceptance Scenarios**:

1. **Given** User Story 2 has landed in full (every atomic commit merged and green), **When** the engineer
   searches the repository for the DB-scalar sense of `correct_col`/`correctCol` (excluding the lesson-JSON
   and computed-result-shape senses, and excluding the historical migration files that introduced/mention the
   column), **Then** the search returns no results.
2. **Given** zero remaining consumers, **When** the engineer writes the column-drop migration, **Then** they
   first re-check the actual latest migration file present on disk at that moment (not a number recorded
   anywhere else in project documentation) and number the new migration accordingly.
3. **Given** the migration is written and applied, **When** the schema and API-contract documentation is
   reviewed, **Then** it no longer describes `correct_col` as "kept in sync" and instead documents the
   `correctCols` array as the sole wire and storage contract.
4. **Given** the column is dropped, **When** the project's open-issue tracker is reviewed, **Then** the entry
   for this retirement is closed out with the evidence of what shipped (the migration file and the
   zero-reference search result).

---

### Edge Cases

- What happens if a consumer is discovered mid-migration that was missed by User Story 1's inventory (e.g.,
  a file created after the inventory was taken)? It must be added to the triage table and migrated within
  User Story 2 (same atomic-commit discipline) before the column-drop story proceeds — the drop story's own
  zero-reference check is the final safety net for this.
- What happens if spec 051's backfill has not actually completed against the target database when this
  feature is picked up? User Story 1 must detect this and block User Story 2 until the backfill is confirmed
  complete — migrating a consumer to read an unpopulated array would silently break grading.
- What happens to a puzzle row whose category is `undercut` or `overcut`, where the array's first element is
  not a meaningful "the" answer? Every single-column display consumer — including `server/index.js`'s
  puzzle-detail response, the puzzle→lesson adapter that feeds `PuzzlePickerRow.jsx`, and not only the
  frontend display screens — must continue to render/return nothing for these two categories, never falling
  back to the array's first element. (The one `server/index.js` site that is a grading input rather than a
  display/response field — the internal predicate-builder input at `:2602` — is exempt; see FR-011.) Before
  this feature, that "nothing" is an emergent side effect of `correct_col` being NULL; after this feature, it
  must be an explicitly-authored category check, since the NULL that produced it for free is gone.
- What happens to an old client request that still sends the legacy singular field after this feature ships?
  Because frontend and server ship together in one deploy, no such old client can exist in practice; the
  server does not need to accept or tolerate the legacy field.
- What happens if the next available migration number is ambiguous when the drop migration is written (e.g.,
  two files already share a numeric prefix)? The engineer must re-verify the actual highest-numbered
  migration file present on disk at that moment and choose the next number from that real state, never from
  a number written earlier in this spec or the epic.
- What happens to the lesson-JSON `correctCol` field and the computed result-shape `correctCol` field during
  this entire feature? Nothing — no story in this feature reads, writes, renames, or otherwise touches either
  of them.

## Requirements *(mandatory)*

### Functional Requirements

**Inventory and planning (User Story 1)**

- **FR-001**: The feature MUST begin by re-deriving, fresh against the current worktree, every reference to
  the DB-scalar sense of `correct_col`/`correctCol` across the server, frontend, scripts, and test
  directories. Any consumer count or per-file list stated elsewhere (this feature's own background section,
  the epic, or OI-81) MUST be treated as a historical snapshot only, never as the authoritative task list.
- **FR-002**: The feature MUST produce a per-file triage table classifying every discovered reference into
  exactly one disposition: migrate (DB scalar, in scope), lesson-JSON field (out of scope), computed
  result-shape field (out of scope), or smoke-check-only (consumes/produces a value upstream of the database
  write, never itself reading or writing the column). This triage table — not any list or count stated
  elsewhere — is the task list that User Story 2 consumes.
- **FR-003**: The triage table MUST explicitly resolve the four known camelCase call sites that carry the
  DB-scalar sense without containing the literal substring `correct_col` (the evaluate-move handler's
  client-supplied request-body field, the predicate-evaluator puzzle-builder's parameter, the
  answer-set-invariant helper's destructured field, and the predicate evaluator's own legacy fallback
  expression that reads the scalar when the array is absent), assigning each an explicit disposition rather
  than omitting them because a plain grep would miss them.
- **FR-004**: The triage table MUST explicitly resolve the three files that keep the scalar synchronized with
  the array under the current (spec 051) design, plus the one test that exists solely to assert that
  synchronization — assigning "remove the scalar write" to each of the three sync-writer files and "delete,
  do not migrate" to the sync-assertion test.
- **FR-005**: The feature MUST NOT begin migrating any consumer until it is confirmed that spec 051's backfill
  has actually populated the array column on the target database — an unpopulated array is not a safe
  migration target.
- **FR-006**: The planning artifact that follows this story MUST record, as its first task output and before
  any migration work begins, the measured pre-change regression-suite baseline: the exact command run, the
  date measured, the pass/fail counts, and the identity of each expected/pre-existing failure. Every later
  requirement's phrase "no failures beyond the documented baseline" refers to this recorded artifact.

**Migrate every consumer and retire the wire contract, as one deploy-atomic unit (User Story 2)**

- **FR-007**: Every server-side file classified "migrate" in the triage table MUST be converted to read and
  write the array form instead of the scalar; no server-side file outside the two out-of-scope senses may
  reference the DB-scalar sense of `correct_col`/`correctCol` once this story completes.
- **FR-008**: Every HTTP response field and request-body field that currently carries the DB-scalar sense of
  `correctCol` (including puzzle-detail responses, evaluate-move responses, the evaluate-move request body,
  and the curation query-string parameter) MUST be replaced by the array field `correctCols`. The singular
  field MUST be removed from the wire contract in the same change — it MUST NOT be retained as a deprecated
  alias alongside the array field, because the frontend migrates in the same deploy-atomic unit and no
  independently-versioned stale client can exist.
- **FR-009**: Each of the three sync-writer files identified in FR-004 MUST stop writing the `correct_col`
  column once migrated.
- **FR-010**: For puzzles in the `undercut` or `overcut` categories, the "show nothing" behavior seen today is
  an emergent side effect of `correct_col` being NULL for those categories while `correct_cols` stays fully
  populated — it is not logic anyone wrote. Retiring the scalar removes that NULL, so this feature MUST author
  a new, explicit, category-based suppression check that reproduces the same observable behavior; it MUST
  NOT be satisfied merely by removing a fallback-to-first-element (there is no such fallback to remove — the
  check itself does not yet exist).
- **FR-011**: The suppression check from FR-010 MUST cover every site that today relies on the NULL: the
  curation workspace's board hint marker, the puzzle picker's column label (`PuzzlePickerModal.jsx`), the
  puzzle-picker row rendered from staged lesson content (`PuzzlePickerRow.jsx`, fed by the puzzle→lesson
  adapter in `AdminLessonEditorScreen.jsx` — see FR-013), and `server/index.js`'s puzzle-detail HTTP response
  site that currently passes through `correct_col ?? null` — not only the frontend sites. `server/index.js`
  has a **second** site that also reads `correct_col ?? null` today (the internal predicate-builder input
  built for `/api/puzzles/:id/check`); that site is explicitly **exempt** from this check — it is not a
  response field, it is the accepted-answer set fed to the grading evaluator, and suppressing it would empty
  that set and grade every correct `undercut`/`overcut` answer as wrong. All non-exempt sites MUST read from
  one shared, explicitly-named list of suppressed categories rather than duplicating the check ad hoc; that
  shared list MUST NOT be `SINGLE_ANSWER_CATEGORIES` (`src/lib/categories.js`), since `undercut` and `overcut`
  are both members of that set despite structurally admitting multiple accepted columns.
- **FR-012**: Every frontend and non-test-script file classified "migrate" in the triage table MUST be
  converted to the array form.
- **FR-013**: The boundary between puzzle-shaped data and lesson-JSON content MUST be handled by thin,
  one-directional adapters on each side: copying a puzzle's answer into a lesson node MUST take the first
  element of the puzzle's array, **except** when the puzzle's category is in the FR-011 suppression list
  (`undercut`/`overcut`), in which case the adapter MUST write `null` — matching today's behavior, where the
  source `correct_col` is already NULL for these categories, and avoiding the exact first-element fallback
  FR-010/FR-011 exist to prevent; sending a lesson node's scalar answer through a puzzle-shaped grading request
  MUST wrap it as a one-element array. Neither adapter may rewrite the authored lesson-JSON content itself to
  be array-valued. The puzzle→lesson adapter (`AdminLessonEditorScreen.jsx`) is one of the FR-011 suppression
  sites: it feeds `PuzzlePickerRow.jsx`, which has no other suppression-check opportunity of its own.
- **FR-014**: Before FR-015's verification, this story MUST generate and locally promote at least one
  `undercut` puzzle and one `overcut` puzzle in the local database, so that "no such puzzle exists locally" is
  never an acceptable reason to skip or declare unverifiable the check in FR-015.
- **FR-015**: A manual verification pass MUST be performed, using the puzzles from FR-014, on every admin
  screen with no automated test coverage that displays a single-column answer (at minimum, the curation
  workspace and the puzzle picker), specifically checking the `undercut` and `overcut` categories against the
  suppression check from FR-010/FR-011.
- **FR-016**: A DOM test MUST be added asserting that the puzzle picker's column label (`PuzzlePickerModal.jsx`),
  the puzzle-picker row rendered from staged lesson content (`PuzzlePickerRow.jsx`), and the curation
  workspace's hint marker (`CurationWorkspace.jsx`) all render nothing for `undercut` and `overcut` puzzles —
  converting FR-015's manual check into a permanent automated guard, since these admin screens otherwise have
  no test coverage of this behavior.
- **FR-017**: Every test file classified "migrate" in the triage table MUST be converted to assert against the
  array form in the **same commit** as the production file it covers — never deferred to a separate,
  later commit. (This resolves the case of a test that asserts a production file's pre-migration source text:
  such a test and the file it reads MUST change together.)
- **FR-018**: The test file that exists solely to assert the scalar stays synchronized with the array MUST be
  deleted, not converted to assert some other property.

**Column drop (User Story 3)**

- **FR-019**: The column-drop migration MUST NOT be written or applied until User Story 2 is complete and
  verified (every triage-table consumer migrated) and a fresh repo-wide search confirms zero remaining
  references to the DB-scalar sense outside the historical migration files that introduced or mention the
  column.
- **FR-020**: The zero-reference verification for FR-019 MUST be performed as two separate checks, not one:
  1. **Mechanical**: `/usr/bin/grep -rn "correct_col\b"` (the literal bare string, not the bare `grep` alias,
     which is `ugrep` in this environment and can silently return zero matches on files it treats as binary)
     run over `server/`, `src/`, `scripts/`, and `tests/` MUST return matches in exactly three files, each
     named explicitly: `016_correct_col.sql`, `061_correct_cols.sql`, and the new column-drop migration file
     created by this feature (which necessarily contains `DROP COLUMN correct_col`). Any other file matching
     is a real, unmigrated reference.
  2. **Human-adjudicated**: every remaining camelCase `correctCol` occurrence (there is no mechanical way to
     separate senses 2 and 3 from sense 1 by filename alone — `server/predicates.js` contains all three) MUST
     map to a row in the triage table dispositioned lesson-JSON or computed-result-shape, with the triage
     table checked in as the audit artifact. This explicitly includes dispositioning `server/predicates.js`'s
     legacy fallback expression identified in FR-003.
- **FR-021**: Before writing the column-drop migration, the engineer MUST re-check the actual highest-numbered
  migration file present on disk at that moment and number the drop migration accordingly. No migration
  number stated anywhere in this specification, the epic, or any other document may be treated as reserved or
  authoritative — the disk state at write time is the only source of truth, because this is a
  concurrently-edited repository where migration filenames have already collided once.
- **FR-022**: The drop migration MUST remove the `correct_col` column from both the `puzzles` and `candidates`
  tables in a single change.
- **FR-023**: Following the column drop, the project's schema, data-model, and API-contract documentation
  MUST be updated to remove any "kept in sync" language describing `correct_col` and to document `correctCols`
  as the sole contract for a puzzle's/candidate's accepted answer.
- **FR-024**: The open-issue tracker entry for this retirement MUST be closed out in the same change that
  ships the column-drop migration, citing the migration file and the zero-reference verification as evidence.

**Cross-cutting**

- **FR-025**: At every merge — each atomic commit within User Story 2 that migrates a group of production
  files together with the tests covering them, and separately the column-drop migration itself — the
  project's fast regression test suite MUST be green relative to the baseline documented per FR-006. Any new
  failure introduced by this feature's changes MUST be fixed before the next merge proceeds. There is no
  commit boundary at which the application is expected to run in a half-migrated (broken) state.
- **FR-026**: No requirement, acceptance check, or "done" verification in this feature may be satisfied by
  migrating, renaming, or otherwise touching the lesson-JSON `correctCol` field or the computed result-shape
  `correctCol` field. Both remain permanently unchanged by this feature.

### Key Entities

- **Puzzle / Candidate row**: A stored tactical position with a category and an accepted-answer set. Prior to
  this feature, it also carries a legacy single-column duplicate of that answer (the scalar this feature
  removes). After this feature, the array is its only representation of the accepted answer.
- **Consumer triage entry**: One row of User Story 1's output — a file (or specific call site within a file)
  that references the scalar sense, together with its assigned disposition (migrate / lesson-JSON /
  computed-result-shape / smoke-check-only) and, once handled, its migration status.
- **Lesson node (Socratic / confirmation-challenge)**: Authored content carrying its own, structurally
  unrelated single-column answer field. Not a database row; not touched by this feature except at the two
  named boundary-adapter sites.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001** *(mechanical)*: `/usr/bin/grep -rn "correct_col\b"` over `server/`, `src/`, `scripts/`, and
  `tests/` returns matches in exactly three files: `016_correct_col.sql`, `061_correct_cols.sql`, and this
  feature's own column-drop migration — and no others.
- **SC-002** *(human-adjudicated)*: Every remaining camelCase `correctCol` occurrence in the repository maps
  to a row in the triage table dispositioned lesson-JSON (out of scope) or computed-result-shape (out of
  scope), with the triage table checked in as the audit artifact — including `server/predicates.js`'s legacy
  fallback expression.
- **SC-003**: Every HTTP interaction that used to carry the singular `correctCol` wire field now carries only
  the array field `correctCols`; no interaction carries both.
- **SC-004**: A player or admin viewing an `undercut` or `overcut` puzzle sees identical "nothing to show"
  behavior before and after this feature, on every affected screen (curation workspace, puzzle picker
  including `PuzzlePickerRow.jsx`, and the admin lesson editor), and the same holds for the `server/index.js`
  puzzle-detail response field those screens consume. (The internal predicate-builder input at
  `server/index.js:2602` is a grading input, not a display field, and is exempt from suppression — see
  FR-011.)
- **SC-005**: The fast regression test suite passes at the end of the feature with no failures beyond the
  documented pre-change baseline (recorded per FR-006), and this was also true after every atomic merge along
  the way — there was no point at which the suite was green over a half-migrated, broken application.
- **SC-006**: The `correct_col` column no longer exists in either the `puzzles` or `candidates` table, and the
  project's own schema/API documentation states this rather than describing a sync relationship.
- **SC-007**: The open-issue tracker shows this retirement's entry closed out with dated evidence, in the same
  change that dropped the column.
- **SC-008**: Neither the authored lesson-JSON answer field nor the in-memory computed result-shape field
  changed name, shape, or behavior at any point during this feature.

## Assumptions

- Spec 051 (Epic 1) has shipped and merged, and its backfill has populated `correct_cols` on every existing
  `puzzles`/`candidates` row, before this feature's work begins. This feature does not itself perform that
  backfill.
- This feature runs in isolation from other concurrent work on the same server/frontend files (per the
  epic's Lane C isolation note) — no other in-flight branch is simultaneously editing the same consumer files
  this feature migrates.
- The frontend and server for this application are deployed together as a single unit, so a breaking wire
  contract change (removing the legacy singular field with no deprecated alias) carries no backward-
  compatibility risk from an independently-versioned stale client. This is exactly why User Story 2 is a
  single deploy-atomic unit rather than separate server/frontend/test stories: there is no independently
  deployable intermediate state to make separate stories meaningful.
- "The fast regression test suite" refers to the project's existing, designated fast-running automated test
  command (excluding the known slow/solver-dependent suite). Its documented pre-change baseline is not fixed
  by this specification — the repository is concurrently edited and the baseline can shift before this
  feature starts — but FR-006 obligates the plan artifact to measure and record the baseline (command, date,
  pass/fail counts, identity of each expected failure) as its first task output, before any migration begins,
  so that every later "no failures beyond baseline" requirement has a concrete artifact to check against.
- The next available database-migration number is determined by inspecting the actual files present on disk
  immediately before the drop migration is authored, not by any number recorded in this specification or in
  related planning documents.
