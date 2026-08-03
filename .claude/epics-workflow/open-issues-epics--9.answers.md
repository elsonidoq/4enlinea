# Owner answers — Epic 9 epic_critique

## Blocking issue 1 — Stale file lists and reference counts (105/22 → 142/33); 11 unnamed files; sync-writer files and the sync-assertion test
Answer: Accept recommendation (auto-applied — no alternative)

Apply the critique's recommended resolution in full:
(a) Replace the hard-coded counts and file lists with the re-derivation command.
(b) State explicitly that US9.1 must produce the per-file triage table that US9.2–9.4 then consume — the triage table is the contract, the enumerated lists are not.
(c) Demote the existing enumerations to "known-as-of-2026-07-29, re-derive at pickup" rather than pasting in today's fresh numbers, which will themselves be stale within days in this concurrently-edited repo.
(d) Name the three sync-writer files (`server/scripts/backfill-correct-cols.mjs`, `server/promotePuzzleRow.js`, `server/candidate-generator.js`'s central sync point) and `tests/unit/checkPredicateSortAndScalarSync.test.js` as known must-handle items, each with its **disposition** — note specifically that the sync-assertion test must be **DELETED, not migrated**, because it exists only to assert the scalar stays in sync with the set.
(e) Fix the acceptance-criterion grep's exclusion list to name `016_correct_col.sql`, `061_correct_cols.sql`, and the new drop migration.

## Blocking issue 2 — Retiring the scalar is a breaking HTTP API change the epic treats as internal
Answer: Accept recommendation, resolved as **Replace with `correctCols` array**

- Add `docs/architecture/api-conventions.md` to the epic's `Authoritative sources of truth` AND to US9.5's documentation-update list.
- Add an explicit requirement covering the wire contract. The owner's decision: **every wire field becomes the array form.** API responses send `correctCols`; the evaluate-move request body accepts `correctCols`; the curation query string carries the set. The legacy single-number `correctCol` request/response field is **retired outright, not kept as a deprecated alias** — keeping it would preserve exactly the duplicate source of truth this epic exists to eliminate.
- Rationale to record: this is safe because the frontend ships in the same deploy as the server, so there is no independently-versioned stale client to break.

## Blocking issue 3 — The `undercut`/`overcut` NULL carve-out from spec 051 is absent from Epic 9
Answer: Accept recommendation (auto-applied — no alternative)

- Add a Settled decision and an acceptance criterion stating that single-column display consumers must preserve the "nothing to show" behavior for the `undercut` and `overcut` categories — a naive `correct_cols[0]` swap would render column 0 as "the answer," which is precisely what spec 051's FR-019 was written to prevent.
- Name the affected consumers: the curation board hint marker (`src/components/CurationWorkspace.jsx`), the puzzle picker's `col {puzzle.correct_col}` label (`src/components/admin/PuzzlePickerModal.jsx`), and the API response sites in `server/index.js`.
- Add a manual QA step naming `undercut` and `overcut` specifically, since these admin screens have no automated test coverage.

## Decision A — Does "zero references" cover the *computed result-shape* `correctCol` (a third meaning)?
Answer: **Out of scope — leave it named as-is**

- Only camelCase sites that read/write the DB column or cross the HTTP wire are migrated. The computed result-shape field returned by `server/predicates.js` evaluators (and used the same way in `classifier.js` / `shapeDescriptor.js`) keeps its current name.
- Rationale to record: cheapest, lowest regression risk, and consistent with the epic's own framing as "pure plumbing retirement, not a second pass at Epic 1's grading semantics." Renaming ~45 sites in `predicates.js` plus `classifier.js`/`shapeDescriptor.js` would be a materially larger mechanical sweep on files Epic 2 is concurrently touching, for naming clarity rather than correctness.
- **Required consequence:** the acceptance criterion MUST be reworded to be checkable. A repo-wide "zero references to `correctCol`" grep will never return clean under this decision, so the criterion must be scoped to a named file/pattern set (the DB-column and wire-crossing sites), not stated as a global zero-reference grep. Make the distinction between the three senses explicit in the epic: (1) DB scalar — in scope; (2) authored lesson-JSON field — out of scope; (3) computed result-shape field — out of scope.

## Decision B — Which side converts at the puzzle↔lesson boundary?
Answer: **Thin adapters at both seams**

- Lesson JSON keeps its single-column scalar completely unchanged; no authored lesson content is edited.
- Convert at the boundary: take `correct_cols[0]` on the way *into* the lesson editor (`src/screens/AdminLessonEditorScreen.jsx`), and wrap the lesson node's value as a one-element set on the way *out* to grading (`src/screens/ChallengeScreen.jsx`).
- Rationale to record: honors the epic's `NOT included` constraint exactly and touches zero authored lesson content.
