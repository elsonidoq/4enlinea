# Owner answers — spec 056 spec_critique

## Blocking issue 1 — Story order makes the "green at every boundary" gate impossible; intermediate states break the app
Answer: **Make server+frontend+tests deploy-atomic**

- Collapse US2 (server) / US3 (frontend) / US4 (tests) into a single **deploy-atomic unit**. They are no longer three independently shippable stories.
- Each test MUST be updated in the **same commit** as the production code it covers. This directly resolves the FR-014 vs FR-015 contradiction: `tests/integration/evaluateMoveMultiSolution.test.js:75` asserts the pre-migration *source text* of `ChallengeScreen.jsx`, so it must change in the same commit as that file, not in a later test-migration story.
- Rewrite the green-suite gate (FR-024 and the per-story gates FR-009/FR-014/FR-017) as **"green at each merge"** rather than "green at each story boundary."
- Delete the false independence claim at spec.md ~line 112-113 that US2 "delivers a fully scalar-free server with no frontend changes required yet." Because the legacy singular wire field is retired outright with no alias (Settled decision 8), a server-only migration breaks lesson-sourced inline-challenge grading — the no-`puzzleId` path in `server/evaluateMoveHandler.js` that depends entirely on the client-supplied field — and no test covers it, so the gate would report green over a broken app.
- Accept the trade-off: the epic's "independently testable stories" shape is sacrificed here because a breaking wire change genuinely cannot ship half-migrated.

## Blocking issue 2 — `undercut`/`overcut` "show nothing" is emergent from a NULL, not implemented; server half omitted
Answer: Accept recommendation (auto-applied — no alternative)

- Rewrite FR-011 from a **prohibition** ("MUST NOT fall back to the array's first element") into a **requirement to build** explicit category-based suppression, naming where the category list lives.
- Record the mechanism plainly in the spec: today `candidate-generator.js` forces `correct_col = null` for `undercut`/`overcut` while `correct_cols` stays **fully populated**, and all consumers merely null-test the scalar. Retiring the scalar deletes that mechanism — the suppression must be newly authored, not "preserved."
- Cover **all four** sites, not two: the curation board hint marker (`src/components/CurationWorkspace.jsx`), the puzzle picker label (`src/components/admin/PuzzlePickerModal.jsx`), and **both** `server/index.js` response sites. The epic's acceptance criteria name the server sites; the spec silently narrowed the carve-out to the frontend.
- Add a corresponding acceptance scenario under the server-side story so the server half is not orphaned in the frontend story.
- Note for implementers: do NOT use `SINGLE_ANSWER_CATEGORIES` in `src/lib/categories.js` as the discriminator — `undercut` and `overcut` are both members of it despite structurally admitting many accepted columns.

## Blocking issue 3 — SC-001's zero-reference criterion can never return clean
Answer: Accept recommendation (auto-applied — no alternative)

Split SC-001 into two separate claims:
- **Mechanical:** `/usr/bin/grep -rn "correct_col\b"` over `server/`, `src/`, `scripts/`, `tests/` returns only three files, named explicitly: `016_correct_col.sql`, `061_correct_cols.sql`, and the new drop migration. (The old criterion excluded only "historical" migrations, so the feature's own drop migration — which must contain `DROP COLUMN correct_col` — failed the feature's own success criterion.)
- **Human-adjudicated:** every remaining camelCase `correctCol` occurrence maps to a row in US9.1's triage table dispositioned as sense-2 (lesson-JSON) or sense-3 (computed result shape), with the triage table checked in as the audit artifact. A file-level exclusion list cannot work mechanically because `server/predicates.js` contains BOTH an in-scope sense-1 hit (`buildPredicatePuzzle`'s DB-fed `correctCol` parameter) and many out-of-scope sense-3 hits.
- Record the project trap in the criterion itself: a bare `grep` in this environment is `ugrep` and can silently return ZERO matches on files it treats as binary, so the verification command MUST be `/usr/bin/grep`.
- Also disposition `server/predicates.js`'s live legacy fallback `puzzle.correctCols ?? (puzzle.correctCol != null ? [puzzle.correctCol] : [])` — a sense-1 hit inside a heavily sense-3 file that neither the epic nor the spec currently mentions.

## Decision D1 — Should the concrete test baseline live in spec.md?
Answer: **Keep it out of spec.md, but require the plan to record it**

- spec.md stays free of the drifting numbers — the reasoning that it is a durable artifact in a concurrently-edited repo is accepted.
- The **plan** is now explicitly obligated to record the measured baseline as its **first task output, before any migration work begins**: the exact command, the date measured, pass/fail counts, and the identity of each expected failure.
- This closes the gap the reviewer found: the spec's repeated phrase "no failures beyond the documented baseline" is load-bearing but currently points at nothing. It only works if some artifact is required to produce that baseline.

## Decision D2 — How does the `undercut`/`overcut` manual verification actually happen?
Answer: **Generate local puzzles AND add a DOM test**

Require both halves:
- (i) Generate and promote local `undercut` and `overcut` puzzles as a **prerequisite step of the story** — this project supports doing that locally, so "no such puzzle exists locally" is never an acceptable reason to skip the check.
- (ii) Add a small **DOM test** asserting that the puzzle-picker row and the curation hint marker render nothing for these two categories.
- Rationale to record: this converts the highest-risk silent regression in the entire feature into a permanent automated guard, at low cost. These admin screens otherwise have zero test coverage, and the mechanical migration breaks this behavior by default.
