# Tasks critique — spec 056 (tasks_critique stage)

**Coverage check (enumerated, not sampled):** all 26 functional requirements (FR-001…FR-026) and all 8 success criteria (SC-001…SC-008) have at least one task. All 14 test files that currently contain `correct_col` are named in a task. The `[P]` parallel markers are clean — the only `[P]` groups are T032/T033/T034 (three different server files) and T050/T051/T052 (three different docs); no two `[P]` tasks touch the same file. The OI-81 closeout task (T053) correctly quotes the real "Issue closeout convention" from the top of `docs/epics/open-issues-epics.md` (prepend `**Status**: ✅ RESOLVED <date>`, replace the "why deferred" body, cite OI-74/OI-59 as models) — it is not an invented format. The five suppression sites and the one exemption are handled correctly: T012/T019/T020/T021 add the category check at the four code sites, `PuzzlePickerRow.jsx` inherits it from T019's adapter, and T013 explicitly forbids suppressing at `server/index.js:2602` because that value is the grading input, not a display field.

The problems are all in **ordering and completeness of the file inventory**, not in requirement coverage.

## Blocking issues

### 1. Two real database-scalar consumers (`shapeDescriptor.js`, `classifier.js`) are scheduled three commits too late, and their tests three commits too early

`server/shapeDescriptor.js` computes a puzzle's "shape key" (used to group visually-equivalent puzzles). It reads `puzzle.correct_col` in four places (lines 327, 338, 352, 356) off a row fetched by `server/index.js` line 3167. `server/classifier.js` *writes* `correct_col:` at lines 1718 and 1736. Both are unambiguously the database-scalar sense — not the two lookalike fields the spec deliberately excludes.

But tasks.md schedules them in **T040, inside Commit 3**, and only as "triage — confirm whether sense 1 or sense 3 before touching either." Meanwhile **T014, inside Commit 1**, swaps that very line-3167 query to fetch `correct_cols` instead. So between Commit 1 landing and Commit 3 landing, the admin puzzle-reindex route silently computes wrong shape keys from an `undefined` value — no crash, no failing test. This is precisely the "green suite over a half-migrated app" failure that the plan's Commit 1 atomicity argument exists to prevent; it simply wasn't applied to these two files because the plan left their disposition open.

Compounding it: `tests/unit/shapeDescriptor.test.js` and `tests/classifier/classifier.test.js` are assigned to **T028, inside Commit 1** — while the production files they cover sit in Commit 3. That directly violates FR-017 (the rule that a test must land in the same commit as the production file it covers).

**Fix:** resolve the sense question now (it is resolved — the greps above are the evidence, and the handoff itself flags T040 as "a real open question"), move `shapeDescriptor.js` and `classifier.js` into Commit 1 alongside T014's query changes, and keep their two test files with them.

### 2. Four `correct_col` sites exist in the working tree that no task names — and two of them make the feature's headline success criterion unsatisfiable

A fresh `/usr/bin/grep -rln "correct_col\b"` over `server/ src/ scripts/ tests/` returns 34 files. Three of them appear nowhere in plan.md's file map or tasks.md:

- `connect-four/server/scripts/t018_single_answer_search.mjs:33` — **a live consumer**: it reads `result.correct_col` off the candidate-generator result object. T032 (Commit 2) deletes exactly that field. This script breaks silently and no task covers it.
- `connect-four/server/kb/README.md:7` — a prose mention.
- `connect-four/server/scripts/repair-overcut-highlight-metadata.js:13` — a code comment.

Separately, **T011 enumerates the sites in `server/evaluateMoveHandler.js` and omits one that exists today**: line 154's own `.select('… correct_col, correct_cols')`. T014's eleven-query sweep is scoped to `server/index.js` only, so this string survives Commit 1.

SC-001 — the feature's primary mechanical done-check — requires that grep to match in **exactly three files** (the two historical migrations plus the new drop migration). With these four, it will match in seven. T046 catches it, but only at the very end of User Story 3, and it instructs "fix it in a Phase 4 commit," which by then is closed.

**Fix:** add these four to the Commit 1/Commit 3 task lists explicitly, and treat plan.md's file map as under-inventoried rather than authoritative (T005's fresh triage table is the real safety net, but tasks.md's own enumerations should not contradict a grep run today).

### 3. No task records the deployment prerequisite, and the drop migration's target environment is unnamed

This repo has `docs/deployment_steps.md`, a per-spec file of deploy prerequisites with existing sections for Spec 054 and Spec 055 and an explicit "Template for new entries." Spec 056 ships an **irreversible column drop** plus a **breaking HTTP field rename** that requires frontend and server to deploy together. Neither gets an entry — no task in the 54 writes to that file. Likewise, `specs/index.md` (the project's spec registry, which lists 053/055) gets no row for 056.

Related: **T049 says "Write and apply the column-drop migration"** without naming an environment. Applying it to staging or production would be both out of scope for an implementation agent and irreversible.

**Fix:** add two tasks to Phase 5 alongside T050–T053 — one adding a `## Spec 056` section to `docs/deployment_steps.md` (what to run, how to verify, "not reversible; back up first"), one registering 056 in `specs/index.md` — and amend T049 to say "apply against the **local** database only."

## Decisions required

### A. How should SC-001 handle the two non-code mentions of `correct_col`?

`server/kb/README.md` and `server/scripts/repair-overcut-highlight-metadata.js` mention `correct_col` in prose and in a comment. They are not consumers, but SC-001's grep cannot tell the difference, so as written the criterion is unsatisfiable.

- **Option 1 (recommended):** edit both mentions as part of Commit 3 — the README sentence becomes "playing the correct column," the comment becomes "overcut rows carry no single correct column." Keeps SC-001 mechanically strict, costs two one-line edits.
- **Option 2:** widen SC-001's named-exclusion list from three files to five. Cheaper, but every future exclusion weakens the check the whole feature is graded on.

### B. Does this feature deploy, or does it stop at "merged and green locally"?

The wire rename means a server-only or frontend-only deploy breaks lesson grading, and the column drop cannot be undone. tasks.md ends at T054 (verify the success criteria) with no deployment step and no environment named.

- **Option 1 (recommended):** implementation is local-only; the agent writes the `docs/deployment_steps.md` entry describing exactly what the owner must run against staging and production, and never touches a remote database. This matches the repo's standing "never write to staging/prod" rule and the 054/055 precedents.
- **Option 2:** treat staging application as in-scope for the feature. Faster to a verified result, but puts an irreversible `DROP COLUMN` in an automated task.

---

## Handoff context

**Key decisions and reasoning.** I ran the coverage enumeration first and found it genuinely complete — every FR-001…FR-026 and SC-001…SC-008 maps to a task, all 14 `correct_col`-carrying test files are named, `[P]` markers have no file collisions, the OI-81 closeout format is verbatim-correct, and the five-suppression-sites/one-exemption structure is right. Because coverage was clean, I redirected effort into verifying the *file inventory* at source with `/usr/bin/grep`, which is where all three blocking issues turned out to live. The handoff explicitly flagged T040 (`shapeDescriptor.js`/`classifier.js` sense) as "genuinely untriaged" — I resolved it by grep (`puzzle.correct_col` read four times; `correct_col:` written twice) and found that the open question was concealing a cross-commit ordering break, so I promoted it to blocking issue 1 rather than treating it as an accepted uncertainty.

**Trade-offs and deferrals.** I did not re-verify frontend line numbers (`ChallengeScreen.jsx:185/302`, `AdminLessonEditorScreen.jsx:216`, `CurationWorkspace.jsx:158/262`, `PuzzlePickerModal.jsx:111`) — tasks.md already anchors by symbol and verbatim text with drift-tolerant phrasing, so exact numbers are not load-bearing. I did not attempt the FR-005 backfill check (whether spec 051's backfill actually ran against the target database); it remains, as the handoff says, unverified by anyone, and it is correctly gated as T002. I did not evaluate whether the DOM test in T025 is technically feasible against `PuzzlePickerRow.jsx`.

**Fragile areas the next agent should scrutinize.** (a) The Commit 1 / Commit 2 boundary generally: I verified the `shapeDescriptor` break, but the same pattern — Commit 1 changing a query that a Commit 2/3 file reads from — may exist elsewhere; `promotePuzzleRow.js` is fed by Commit-1-modified selects and degrades to writing `null`, which is harmless only because Commit 1 removes all readers. Confirm that reasoning holds before relying on it. (b) `src/components/DevBoardInjector.jsx` and `src/lib/devBoardParam.js` carry camelCase `correctCol` and feed `devFixtures.buildDevPuzzle` (T022); no task names them, and T022 explicitly leaves the scalar-in/array-out question open. (c) Plan.md's Source Code file map is demonstrably incomplete (it missed the four sites in blocking issue 2) — treat T005's fresh triage table as the only authority, exactly as Settled decision 7 says.

**What I did not flag, and why.** A counting inconsistency between plan.md D2 (which numbers four suppression sites while calling them five) and tasks.md T019 (which calls `AdminLessonEditorScreen.jsx` "the fifth") — the substance is identical and correct, only the labelling drifts. Phase 2 being empty — that is an intentional, well-explained decision per the handoff, not filler avoidance. The governing-constraint note at the top of tasks.md — I looked specifically for anything permitting a Commit 1 split (a `[P]` marker, a mid-block checkpoint, a gate) and found none; the `[P]` omission is deliberate and reinforced in three places. Minor range drift in T031 ("stage T009–T029") versus the header ("T009–T031 belong to that commit") — harmless.
