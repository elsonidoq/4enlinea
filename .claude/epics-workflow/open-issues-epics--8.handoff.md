## Handoff context (from tasks_create)

`specs/055-dev-infra-test-quality/tasks.md` — 49 tasks (4 Setup, 16 US1, 11 US2, 15 US3, 3 Polish). No Foundational phase: spec/plan explicitly state no cross-story blocking dependency.

**Key decisions:**
- Split FR-016 (six named issues, T038–T043) and FR-017 (whole-backlog walk, T044) into distinct task ranges, per plan.md "Open questions this plan resolves" #5 — both are additive edits to different regions of `docs/open_issues.md`.
- Every triage/count task (T009, T011–T014) explicitly depends on a FRESH re-measurement (T009) rather than hard-coding research.md's 76/32/10 numbers.
- OI-12 (T040) is written as an explicit "do NOT close" task with the scope-trap reasoning inline (research.md R11).
- T046 added as a final "did we touch anything we shouldn't have" check on `docs/open_issues.md`.
- T047 (Polish) adds a `docs/architecture/testing-conventions.md` addendum for the new eslint environment-split convention, per CLAUDE.md's two-destination rule.
- T015's new tracking OI for the demoted react-hooks/react-refresh rules was computed as `OI-119` (highest existing heading via `grep -oE '^## OI-[0-9]+'` was OI-118); the task text tells the implementer to RE-CHECK this number first, since concurrent sessions may have added entries.

**Trade-offs / deferred:**
- Did NOT enumerate the ~34 `src/` files with `no-unused-vars` violations (T011) — deferred to implementation ("harvest fixtures, don't invent them"); a list authored now would likely be stale given concurrent epics touching `src/`.
- Did NOT pre-guess which `BoardWindowCounts.dom.test.jsx` block is the hang culprit — T022 requires confirming via the `--test` runner output, not accepting research.md R6's unconfirmed hypothesis.
- US1's 16 and US2's 11 diverge from the epic's estimates ("TBD" / "7 tasks"). Intentional granularity; every task cites a specific FR/acceptance-scenario/quickstart command. If closer to 7 is wanted for US2, T021–T024 (the bisect chain) and T029–T030 (the dead-code pair) are the mergeable spots.

**Uncertain / fragile:**
- **T005/T006 (the eslint config split) is the highest-risk task in the list.** No eslint.config.js code has been written or tested anywhere in this pipeline. T007's `--print-config` checks are the ONLY guardrail — do not mark T005/T006/T007 done without literally running those three commands and seeing non-zero rule counts.
- `public/sw.js`'s exact required globals (`self`, `caches`, `clients`?) were never confirmed by reading the file. Read `connect-four/public/sw.js` before picking serviceworker globals.
- T009's re-measurement is load-bearing for T011–T015. If the fresh count diverges from 76/32/10, the triage tasks' targets need RE-DERIVING, not just re-running mechanically.
- T038–T043 touch the same file as T033/T034/T036/T037/T044/T045 — apply as sequential edits even though conceptually parallel. This is the seam most likely to silently clobber if two agents work US3 concurrently (memory `feedback_concurrent_agents_clobber`).
- OI-1/OI-15/OI-24/OI-77/OI-18/OI-36 statuses were NOT re-verified in this pass — research.md R11's table is a starting hypothesis; T038–T043 delegate re-measurement to implementation.
