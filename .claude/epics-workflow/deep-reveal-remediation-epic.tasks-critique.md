## Blocking issues

**1. One requirement has a fix but no test — FR-011 / OI-202 (the "replyHistogram" comparative).**
`T014` (tasks.md:231) fixes this in `renderReasonModel.mjs`. **No task tests it.** `FR-011` appears exactly once in the whole 602-line task list — on `T014` (verified: `grep -n "FR-011" tasks.md` returns only :231). The six US2/US3 test tasks cover FR-008/009/010/012/013/014/015/016/017/018/019/020/021/022/023/024/025 — FR-011 is the only gap.
This breaks two contracts: `spec.md:417` FR-031 ("US2 and US3 requirements MUST **each** be validated by a deterministic, model-free corpus test"), and `spec.md:475` SC-008. It also makes the US2 checkpoint claim at `tasks.md:288` — "every FR-008..FR-013 invariant has a corpus-wide, model-free test" — false as written.
Root cause is upstream: `plan.md:367` lists `renderReasonModel.mjs` as covering "FR-014/017/018/019/022/025" and `plan.md:387` lists `renderReasonModel.test.mjs` as covering "FR-018/019" — FR-011 is absent from the plan's Source Code map, which is the map task generation reads.
**Fix:** add a test task extending `connect-four/server/tests/renderReasonModel.test.mjs` with a corpus-wide FR-011/SC-008 assertion, depending on T014 — and sequence it against `T038`, which edits that same file.

**2. The open-issue bookkeeping task covers 3 issues; the epic requires ~18.**
`T040` (tasks.md:463) closes OI-187, OI-188, OI-182 and narrows OI-140/170/172/208. The epic's own rule is broader: *"Each task's definition of done includes updating the status of every issue it resolves"* (`docs/epics/deep-reveal-remediation-epic.md:360`). This epic's tasks resolve or materially change **fifteen more** filed issues (OI-177, 180, 184, 189, 193, 194, 195, 198, 199, 201, 202, 203, 204, 205, 206, 207) and no task touches their status.
The case the epic calls out is **already demonstrably stale today**: `docs/open_issues.md:7042` records OI-189 as *"open (fix specified as Task 9b of the 2026-08-11 remediation plan; not yet implemented)"*, while the epic (`:346`) documents that the display-path half **already shipped** as D48/I13 and moved 49/63 records → 0/63. `T032` fixes the remaining half; nothing corrects the status line.
**Fix:** rewrite T040 to enumerate every issue, splitting into (a) close, (b) narrow-and-restate scope, (c) correct-stale-status (OI-189 explicitly).

**3. `T046` has the task list writing to the staging and production databases — which this file's own rules forbid from a producer role.**
`T046` (tasks.md:525) says: *"Run T043's extended `docs/deployment_steps.md` entry (the `explanation_cache` purge) against staging, then production."* `docs/deployment_steps.md:31-33` defines the three roles and states that producers *"never run a step against staging or production"*, closing with `:50-51`: **"Never write to staging or production from a producer role. Measuring is read-only and fine; mutating live data is the owner's call."** Spec 059 is a producer. The epic agrees — `NOT included` (`:471`).
**`T043` is correct and verified at source** — the entry it extends is real (`docs/deployment_steps.md:1952`), already extended twice at `:1966` and `:1975`, T043 matches that "Updated `<date>`" paragraph shape rather than filing a new entry, and it carries the required run-again sentence whose precedent is at `:1823-1826`. Only T046 is the problem.
**Fix:** delete T046, or reduce it to a non-executing note. One wording nit in T043 while editing: it says "do not change the entry's `Status`, `Command`, or `Verify` sections" — the entry has no `Command` section; the headings are `### Run it` / `### Verify` / `### Roll back`.

## Decisions required

**1. The epic still asks the guard diagnostics to record coordinate promotions; the plan's contract cut them.**
The epic's tasks 1.2 and 1.7 (`:316`, `:321`) require recording *"spans stripped and their failure codes, **coordinates promoted/humanized**"*. `contracts/guard-diagnostics-contract.md:86-99` cuts the coordinate half. `T002` and `T011c` correctly implement the narrowed shape. But `spec.md:6-10` declares the epic "authoritative", so the epic currently reads as an unmet requirement.
- **(a) Amend the epic's tasks 1.2/1.7 to the two-field shape** and cite the contract. *(recommended)*
- (b) Leave the epic and add a D-log entry in `T041` recording the divergence.
- (c) Re-widen scope. *(Not recommended.)*

**2. Nothing verifies the grading-dispatch freeze, which is half of US1's point.**
`T006` edits the grading skill so every run reads one checked-in rubric file. The epic requires more: AC 3a (`:391`) *"A test or manual check confirms the dispatch instruction names the checked-in path,"* and AC 4 (`:394`) byte-identical dispatch messages. `SC-002`/`SC-004` restate both. No task verifies either.
- **(a) Add a small task asserting the SKILL.md dispatch step names `GRADER_INSTRUCTIONS_v2.md` and carries the no-out-of-rubric-context rule** — grep-level, no LLM call. *(recommended)*
- (b) Accept as a manual check, stated explicitly in T006.

## Systemic issues (additional required fixes)

- **The plan's Source Code map is the coverage frontier and under-specifies.** Blocking #1 and #2 both trace to `plan.md:350-403`. **Patch plan.md's map and tasks.md together**, or the next regeneration reintroduces the same holes.
- **Cross-story same-file collisions are only half-mapped.** tasks.md flags T020 → T036 (`causalLinks.test.mjs`). Two more exist, unflagged, in *source* files: `causalLinks.mjs` edited by T012/T015/T016 (US2) **and** T022/T032/T034 (US3); `renderReasonModel.mjs` by T014 (US2) **and** T026/T027/T034 (US3). **No `[P]` marker is wrong** — all of T005/T007/T009/T010/T018/T019/T035/T037 genuinely touch distinct files — so this is an execution-guidance gap. Add a sentence to "Parallel Opportunities".
- **`T041` omits the Q1 pick.** It requires D-log entries for the Q2/Q3/Q4/Q5/Q8 picks but not for the Q1 pick, which `T003` does make (store both pre- and post-guard strings).
- **Minor label drift:** `research.md` asks tasks 3.1 and 3.4 to be marked `PENDING-with-question`; `T023`/`T026` carry the `// Qn PROVISIONAL` code comment but not that label.
- **`spec.md` has no FR-026** — numbering jumps FR-025 → FR-027. A gap, not a dropped requirement; nothing references FR-026. Leave or note.

## Verified correct, do NOT change
- **T002 → T017 edge** is encoded four times (`:57`, `:59-62`, `:251`, `:549-553`). Over-determined and correct.
- **Epic task-table coverage**: all 24 map 1:1 (1.1→T003 … 3.11→T034; 3.1 splits into T022/T023 along the Q8 fault line). No orphans.
- **Scope leakage: none.** The deferred `eval-33` remedy is refused in three places; OI-186, a second retry/budget/trigger and reason-engine changes are named out of scope; no task touches `connect-four/src/`.
- **Owner gating**: `T045`/`T046` are the only `[OWNER APPROVAL REQUIRED]` tasks; `grep -- "--llm"` matches exactly one line (T045:519).
- **`T044`'s claim that ten touched test files are already in `test:fast`** is verified true (checked with `grep -c` only). Only the three named new files need human registration.
- **T002's three production call sites `index.js:1327,1365,1470` are exactly right** — this reconciles a discrepancy in the incoming handoff, which listed "1296/1469/1470"; those are the lines where `board`/`allowedSet` are computed, not the call sites.
- **Baseline independently re-measured: 1999 pass / 0 fail / 278 suites, exit 0** at this worktree HEAD.
