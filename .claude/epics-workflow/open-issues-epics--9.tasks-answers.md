# Owner answers — spec 056 tasks_critique

## Blocking issue 1 — `shapeDescriptor.js` / `classifier.js` scheduled three commits too late; their tests three commits too early
Answer: Accept recommendation (auto-applied — no alternative)

- **Resolve the sense question now — it is already resolved by evidence.** `server/shapeDescriptor.js` reads `puzzle.correct_col` in four places (lines 327, 338, 352, 356) off the row fetched by `server/index.js:3167`; `server/classifier.js` *writes* `correct_col:` at lines 1718 and 1736. Both are unambiguously the database-scalar sense (sense 1), not the lesson-JSON or computed-result-shape senses the spec excludes. T040's "triage — confirm whether sense 1 or sense 3" framing must be replaced with the settled disposition.
- **Move `server/shapeDescriptor.js` and `server/classifier.js` into Commit 1**, alongside T014's query changes. Leaving them in Commit 3 means that between Commit 1 and Commit 3 the admin puzzle-reindex route silently computes wrong shape keys from an `undefined` value — no crash, no failing test. That is exactly the "green suite over a half-migrated app" failure Commit 1's atomicity requirement exists to prevent.
- **Keep `tests/unit/shapeDescriptor.test.js` and `tests/classifier/classifier.test.js` with them** in Commit 1. They are currently in T028 (Commit 1) while their production files sit in Commit 3, which directly violates FR-017 — a test must land in the same commit as the production file it covers.

## Blocking issue 2 — Four `correct_col` sites no task names; two make the headline success criterion unsatisfiable
Answer: Accept recommendation (auto-applied — no alternative)

A fresh `/usr/bin/grep -rln "correct_col\b"` over `server/ src/ scripts/ tests/` returns 34 files. Add explicit task coverage for all four missing sites:
- `connect-four/server/scripts/t018_single_answer_search.mjs:33` — **a live consumer** reading `result.correct_col` off the candidate-generator result object. T032 (Commit 2) deletes exactly that field, so this script breaks silently today with no task covering it.
- `connect-four/server/evaluateMoveHandler.js:154` — its own `.select('… correct_col, correct_cols')`, omitted from T011's enumeration. T014's eleven-query sweep is scoped to `server/index.js` only, so this string would survive Commit 1.
- `connect-four/server/kb/README.md:7` — prose mention (see Decision A).
- `connect-four/server/scripts/repair-overcut-highlight-metadata.js:13` — code comment (see Decision A).

Also: **treat plan.md's Source Code file map as under-inventoried, not authoritative.** T005's fresh triage table is the real safety net (Settled decision 7), but tasks.md's own enumerations must not contradict a grep run today.

## Blocking issue 3 — No deployment-prerequisite task; the drop migration's target environment is unnamed
Answer: Accept recommendation (auto-applied — no alternative)

- Add a Phase 5 task creating a `## Spec 056` section in `docs/deployment_steps.md`, following that file's existing "Template for new entries" and the Spec 054 / Spec 055 precedents: what to run, how to verify, and an explicit "not reversible; back up first" warning.
- Add a Phase 5 task registering spec 056 in `specs/index.md` (the project's spec registry, which currently lists 053/055 but has no row for 056).
- Amend T049 so the migration is applied against the **local** database only — see Decision B.

## Decision A — The two non-code mentions of `correct_col`
Answer: **Edit both mentions**

- Reword both as part of the scripts commit (Commit 3): the `server/kb/README.md` sentence becomes "playing the correct column," and the `repair-overcut-highlight-metadata.js` comment becomes "overcut rows carry no single correct column."
- Rationale to record: keeps SC-001's grep check mechanically strict with no exceptions to remember. The rejected alternative — widening the named-exclusion list from three files to five — weakens the exact check the whole feature is graded on, and leaves the next reader to re-derive why two doc files are exempt.

## Decision B — Deploy scope
Answer: **Local only; write the deploy steps for the owner**

- Implementation stops at **merged and green locally**. Amend T049 to state explicitly: apply the drop migration against the **local database only**.
- The agent writes the `docs/deployment_steps.md` entry describing exactly what the owner must run against staging and production — it must never touch a remote database itself.
- Rationale to record: this matches the repo's standing "never write to staging/prod" rule and the existing Spec 054 / Spec 055 precedents. The rejected alternative would put an irreversible `DROP COLUMN` inside an automated agent-run task.
- Also capture in the deployment entry that this is a **breaking wire rename**: server and frontend must deploy together, because a server-only or frontend-only deploy breaks lesson grading.
