# Tasks: Dev Infrastructure & Test-Quality Baseline

**Input**: Design documents from `specs/055-dev-infra-test-quality/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md (N/A note), quickstart.md

**Tests**: This feature's "tests" ARE its deliverables (a working lint gate, a fixed DOM suite, a
real regression test) — there is no separate test-then-implement split; each story's tasks include
the verification steps quickstart.md prescribes, run inline as part of the story.

**Organization**: Tasks are grouped by user story (US1/US2/US3, spec.md priorities P1/P2/P3). All
three stories are independently testable and have **no cross-story blocking dependency**
(spec.md:10, plan.md Summary) — except one sequencing note captured in "Dependencies & Execution
Order" below (US1's SC-001a proof vs. US2's `Board.jsx` mutation window must never overlap in the
working tree).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1, US2, or US3
- All file paths are relative to the repo root unless stated otherwise; commands run from
  `connect-four/` unless stated otherwise.

## Path Conventions

Single existing web-app monorepo (`connect-four/` + repo-root docs/hooks) — no new top-level
directory (plan.md "Structure Decision"). The only new file this feature creates is
`connect-four/tests/dom/SplitRevealZoom.dom.test.jsx`.

---

## Phase 1: Setup (fresh baseline measurements)

**Purpose**: Every research.md finding is explicitly a point-in-time measurement in a repo with
concurrent sessions (research.md R1a/R2/R3, epic doc "Re-measure this epic's facts before acting on
them"). Re-measure before touching any file so triage decisions in US1/US3 are based on current
reality, not the numbers cited in spec.md/plan.md/research.md.

- [x] T001 [P] Re-run `npx eslint .` inside `connect-four/` and `npx eslint . -f json` piped through
      a rule×directory aggregation; record the fresh total error/warning count and the fresh
      `no-undef`/`no-unused-vars`/`react-hooks`+`react-refresh`/trivial-rule breakdown — do NOT
      assume research.md's 282/164/76/32/10 figures still hold.
- [x] T002 [P] Re-run the `tests/dom/**` bare-global recount from research.md R3 (dot-access grep
      `document\.|window\.|localStorage\.|globalThis\.(document|window)` across `tests/`, then a
      case-sensitive bare-token grep `\b(document|window)\b` inside each of the 19 `tests/dom/*.dom.test.jsx`
      files already listed in `connect-four/package.json`'s `test:dom` string) to confirm which files
      still need the merged node+browser ruleset in FR-001's `tests/dom/**` block.
- [x] T003 [P] Confirm `find connect-four -name "*.mjs" -not -path "*/node_modules/*" | wc -l` and the
      `.cjs` equivalent are still in the same ballpark as research.md R2's 141/0, so FR-002's glob
      widening scope is current.
- [x] T004 [P] Run `npm run test:fast` inside `connect-four/` once, unmodified, and confirm the
      baseline is still 5 RED (OI-82's ENOENT reason-engine tests — CLAUDE.md/memory
      `project_repo_worktree_setup` §2d), not 0 and not more — this is the number every later
      "confirm nothing new broke" check in this feature is judged against.

**No Foundational (Phase 2) tasks**: the three user stories touch disjoint files/concerns
(`eslint.config.js`+scripts vs. `Board.jsx`/`SplitReveal`/`deepRevealTimeout.js` vs.
`docs/open_issues.md`+CSP) and spec.md/plan.md explicitly state no story blocks another — there is
no shared scaffolding to build before story work can start.

---

## Phase 3: User Story 1 - A lint that can actually fail, and covers the whole tree (Priority: P1) 🎯 MVP

**Goal**: `npm run lint` exits 0 across the whole tree (including `.mjs`/`.cjs`), a deliberately
introduced violation makes it fail, and the gate is wired into both `test:fast` and the pre-commit
hook so a regression can't land silently.

**Independent Test** (spec.md): run `npm run lint` inside `connect-four/` and observe exit 0 across
the whole tree, then deliberately introduce one real violation into a `.mjs` file and observe
`npm run lint` fail with that violation reported.

### Implementation for User Story 1

- [x] T005 [US1] In `connect-four/eslint.config.js`, replace the single `files: ['**/*.{js,jsx}']`
      block (currently `eslint.config.js:10`) with an environment split per FR-001/FR-018: a
      browser-globals block for `src/**`; a node-globals block for `server/**` and `scripts/**`; a
      node-globals block for `tests/**` in general; a **fourth, narrower** block merging node +
      browser globals scoped specifically to `tests/dom/**` (per T002's fresh recount — NOT all of
      `tests/`, a deliberate DEVIATION from the epic's Settled decision #1, recorded in
      `plan.md`'s "Deviations from epic decisions"); and — instead of a glob-based catch-all, which
      cannot express "not matched by another block" under ESLint 9 flat config (config blocks MERGE
      by `files`-glob match, so a `**/*.{js,jsx,mjs,cjs}` catch-all would merge node globals into
      every file including `src/**`, directly breaking T008's own `src/components/Board.jsx`
      no-`process`-global assertion) — an **explicit two-block enumeration** covering exactly the
      files no scoped block reaches: `files: ['vite.config.js', 'eslint.config.js']` with node
      globals, and a separate `files: ['public/sw.js']` block with browser + serviceworker globals,
      so `connect-four/vite.config.js`, `connect-four/eslint.config.js`, and
      `connect-four/public/sw.js` (OI-70's exact defect) are each matched by exactly one explicit
      block, never zero and never every block. Keep `js.configs.recommended` shared across all
      blocks; keep `reactHooks`/`reactRefresh` scoped to the `src/**` block only.
- [x] T006 [US1] In the same `connect-four/eslint.config.js` change, widen every relevant `files`
      glob to include `.mjs` and `.cjs` in addition to `.js`/`.jsx` (FR-002), so
      `server/tests/*.test.mjs`, `server/scripts/*.mjs`, and `server/*.test.mjs` receive real rules
      (confirmed today at 0 applied rules via `npx eslint --print-config`, research.md R1/R2).
- [x] T007 [US1] Verify FR-018's explicit two-block catch-all coverage — run from `connect-four/`
      (paths are relative to that cwd; do NOT prefix them with `connect-four/`, which would point at
      a nonexistent nested path): `npx eslint --print-config vite.config.js`, `npx eslint
      --print-config eslint.config.js`, and `npx eslint --print-config public/sw.js`, confirming each
      returns a non-zero `rules` count, and that `vite.config.js`'s 2 pre-existing real `no-undef`
      errors still surface once `npm run lint` runs (not silently vanish because the file stopped
      being matched).
- [x] T008 [US1] **Blocking gate for T005-T007 — T009 MUST NOT run until this passes with its output
      pasted as evidence** (not a verification afterthought): verify the environment split is scoped
      correctly (FR-001 acceptance scenario 1, quickstart.md "Confirm environment split
      correctness"), run from `connect-four/` (do NOT prefix these with `connect-four/`, same
      nonexistent-path defect as T007): `npx eslint --print-config server/index.js` shows the
      `process` global; `npx eslint --print-config tests/dom/BoardWindowCounts.dom.test.jsx` shows
      the `document` global; `npx eslint --print-config tests/unit/deepRevealTimeout.test.js` shows
      NO `document` global (plain `tests/unit/` stays node-only); `npx eslint --print-config
      src/components/Board.jsx` shows NO `process` global (`src/` stays browser-only, confirming the
      explicit two-block catch-all in T005 did not leak node globals into `src/**`).
- [x] T009 [US1] Re-measure the real error/warning count on the now-widened, now-split config —
      depends on T008's four assertions having passed with their actual output pasted as evidence:
      `cd connect-four && npx eslint . -f json`, aggregated by rule × directory — this is the number
      FR-019's triage below actually operates against (NOT research.md's stale 282/76/32/10, which
      predates the split and the glob widening).
- [x] T010 [P] [US1] Remove the unused `boardToSpec` import from
      `connect-four/src/components/admin/BoardEditor.jsx` (line 4, verbatim today: `parseMovestring,
      boardToSpec, appendMove, undoMove, isColFull,`) per FR-005 — confirmed no other reference to the
      bare identifier exists later in the file (research.md R4).
- [x] T011 [US1] Per FR-019(a): fix every remaining `no-unused-vars` violation across `src/`
      production components (measured at 34 pre-split in research.md R1a, T009's fresh count is
      authoritative) by removing the unused binding — a non-behavior-changing deletion, never a
      refactor. `BoardEditor.jsx`'s `boardToSpec` (T010) is one instance of this set; enumerate the
      full file list fresh from T009's output rather than guessing which other files are affected.
      **Sequencing constraint (tasks-critique Decision 2)**: land all of these `src/` deletions in
      their own commit, separate from the `eslint.config.js` environment-split/glob-widening/
      react-hooks-demotion change (T005/T006/T014) and separate from the `tests/`/`server/` cleanup
      (T012/T013) — this keeps "did the config change break something?" answerable by `git revert`
      on one isolated commit rather than by re-reading up to 34 diffs, which matters more than usual
      here since other epics are concurrently editing `src/`. Stage explicit paths only for this
      commit — never `git add -A` (`project_external_auto_backup_commits`).
- [x] T012 [P] [US1] Per FR-019(a): fix every remaining `no-unused-vars` violation across `tests/`
      (measured at 27 pre-split) and `server/` (measured at 15 pre-split) by removing the unused
      binding, same non-behavior-changing-deletion rule as T011.
- [x] T013 [P] [US1] Per FR-019(b): fix every remaining `no-empty`, `no-regex-spaces`, and
      unused-eslint-disable-directive violation (measured at 10 pre-split, including the 3
      `Unused eslint-disable directive` reports at `server/index.js:4260`,
      `server/tests/renderCoverageUniverse.test.mjs:28`, `tests/classifier/classifier.test.js:221`
      per the epic doc's Non-obvious facts — re-confirm these line numbers against T009's fresh run,
      they will have shifted).
- [x] T014 [US1] Per FR-019(c): in `connect-four/eslint.config.js`'s `src/**` block, demote the
      `react-hooks/*` and `react-refresh/*` rule families from `error` to `warn` (measured at 32
      pre-split, all inside `src/` production React components — `set-state-in-effect` ×21, `refs`
      ×5, `static-components` ×4, per research.md R1a), with a one-line comment in the config stating
      why (fixing them is behavior-affecting UI refactoring, out of this epic's scope) — no other
      rule may be silently disabled or demoted to reach exit-0.
- [x] T015 [US1] Per FR-019(c): open a new tracking issue in `docs/open_issues.md` (next available
      `OI-N` — `OI-119` as of this writing per `grep -oE '^## OI-[0-9]+' docs/open_issues.md`, but
      re-check for a higher number first since concurrent sessions may have added entries) recording
      that `react-hooks/*`/`react-refresh/*` (32 findings, all in `src/` production components) were
      demoted to `warn` rather than fixed in Epic 8, with the exact rule names and file/line
      breakdown from T009/T014, so a future pass can burn them down as a UI-behavior change.
- [x] T016 [US1] Confirm `cd connect-four && npm run lint` now exits 0 (FR-003/SC-001) — depends on
      T005-T015 all landing.
- [x] T017 [US1] Prove the widened glob is a real gate, not just a walked glob (FR-004/SC-001):
      temporarily insert one real violation that the current config's
      `'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }]` rule actually reports — use
      `const unusedProbe = 1;` (lowercase, no leading underscore or capital; **NOT**
      `const _unused = 1;`, which matches `varsIgnorePattern` and would false-negative — the rule's
      ignore pattern is correct, the fixture was wrong, per tasks-critique blocking issue 3) — into a
      `.mjs` file, run `npm run lint`, confirm non-zero exit reporting that violation **by name**
      (`unusedProbe` appears in the eslint output, not merely a non-zero exit code), then revert the
      inserted line.
- [x] T018 [US1] Prefix `eslint . && ` onto the `test:fast` script string in
      `connect-four/package.json` (leaving `test` and `test:dom`'s script strings unchanged per
      FR-006(a)/Settled decision #2 — lint only becomes a gate now that T016 made it green).
- [x] T019 [US1] Extend `.githooks/pre-commit` (repo root) with a new leading block that runs `cd
      connect-four && npm run lint --silent` **before** the existing `sync-kb.mjs` step (per
      research.md R5's decision: lint-fails-fast avoids `sync-kb.mjs` mutating/staging
      `connect-four/server/kb/` ahead of a commit that's going to be rejected anyway) — exit
      non-zero with a clear message (`"pre-commit: lint failed" >&2; exit 1`, matching the existing
      hook's error-message style) if lint fails, and add a one-line comment noting the measured
      full-tree lint wall time (e.g. "~7.5s wall on full-tree lint as of <date re-measured>").
- [x] T020 [US1] Prove FR-006/SC-001a's double-wiring, in a window that does NOT overlap US2's
      `Board.jsx` mutation (see Dependencies note below): insert the same genuinely-reported fixture
      from T017 (`const unusedProbe = 1;` — **NOT** the `_`-prefixed fixture, which the config's
      `varsIgnorePattern` ignores) into a single new throwaway file (e.g.
      `connect-four/scripts/lintProbe.mjs`), run `npm run test:fast` and confirm it fails on the lint
      step reporting `unusedProbe` by name (not merely a non-zero exit); stage **only** that one file
      (`git add connect-four/scripts/lintProbe.mjs` — never `git add -A`, per
      `project_external_auto_backup_commits`); attempt `git commit -m "tmp"` and confirm
      `.githooks/pre-commit` rejects it; run `git restore --staged
      connect-four/scripts/lintProbe.mjs` to unstage (nothing was ever committed); delete the
      throwaway file and revert any other stray change.
- [x] T021 [US1] Mark OI-70 ✅ RESOLVED in `docs/open_issues.md` (currently `**Status**: open —
      pre-existing, long-standing (observed 2026-07-28)` at the "## OI-70" entry, `npx eslint .`
      reporting "268 problems (254 errors, 14 warnings)"), citing this story's evidence: the
      environment split + explicit two-block catch-all (T005-T008), the `.mjs`/`.cjs` glob widening
      (T006), the fresh re-measurement (T009), the triage that got `npm run lint` to exit 0
      (T010-T016), the proven real-violation gate (T017, `unusedProbe`), and the `test:fast`/
      pre-commit wiring (T018-T020) — quote the fresh `npm run lint` exit-0 result and the T017
      real-violation-caught proof inline as the two pieces of evidence.

**Checkpoint**: `npm run lint` exits 0 tree-wide including `.mjs`/`.cjs`, is proven to catch a real
violation, is wired into both `test:fast` and the pre-commit hook, and OI-70 is marked ✅ RESOLVED in
`docs/open_issues.md` citing that evidence. User Story 1 is independently complete and testable.

---

## Phase 4: User Story 2 - The DOM/unit test suite fails loudly instead of hanging or testing the wrong thing (Priority: P2)

**Goal**: The `Board.jsx` windowCounts-guard mutant produces a fast, clear assertion failure instead
of a ~32s hang; a real render-level regression test catches `SplitReveal`'s live-fit sizing bug
(replacing a vacuous pure-function test); the dead `deepRevealPhase` export and only its own test
case are removed.

**Independent Test** (spec.md): delete `&& value === 'empty'` from `Board.jsx`'s windowCounts guard
and confirm `npm run test:dom` now fails with an assertion (not a hang), then revert the mutation
(`git diff` on `Board.jsx` empty at completion); mount `SplitReveal` in a short container and
confirm the new regression test independently catches a spilled/oversized board.

### Implementation for User Story 2

- [x] T022 [US2] Reproduce OI-71's hang: temporarily delete `&& value === 'empty'` from
      `connect-four/src/components/Board.jsx:382` (verbatim today: `{windowCount != null && value
      === 'empty' && (`), then run `timeout 60 npm run test:dom` and confirm it hangs at 0% CPU
      until the 60s timeout kills it (this is the diagnostic starting point for T023 — do not revert
      yet).
- [x] T023 [US2] Bisect which assertion in `connect-four/tests/dom/BoardWindowCounts.dom.test.jsx`
      never returns with the T022 mutation applied — research.md R6's hypothesis (unconfirmed) is
      the 4th of 5 `test(...)` blocks (`'Board never renders a digit on an occupied cell...'`, which
      isolates the `value === 'empty'` half of the guard via a deliberately contract-violating
      fixture, `counts[0][3] = 99`). Confirm by observing which test Node's `--test` runner reports
      as running when the process hangs — do not assume the hypothesis is correct without this
      confirmation.
- [x] T024 [US2] Find and fix the actual root cause identified in T023 (a jsdom/testing-library
      interaction is the working hypothesis, per research.md R6/epic doc, but is NOT assumed here —
      fix whatever T023 bisection actually reveals) so that `npm run test:dom` with T022's mutation
      still applied produces a fast, clear assertion failure instead of a hang.
- [x] T025 [US2] Revert the diagnostic mutation from T022: restore `&& value === 'empty'` in
      `connect-four/src/components/Board.jsx:382` exactly, and confirm `git diff
      connect-four/src/components/Board.jsx` is empty (FR-007/SC-002 — `Board.jsx` is production
      code, the deletion was diagnostic-only).
- [x] T026 [P] [US2] Annotate `specs/042-mistake-review-unification/contracts/split-reveal-zoom-contract.md`'s
      "Current mechanism" section (lines 6-17) as superseded by the shipped
      `computeFrozenBoardWidth` + ref-based freeze mechanism now live in
      `connect-four/src/lib/useDragSplit.js` (FR-009) — do not touch the "Required behavior" section
      (lines 19-40), which already correctly describes the target state (research.md R7); this is an
      annotation of a frozen planning artifact, not a rewrite.
- [x] T027 [US2] Write a new DOM regression test,
      `connect-four/tests/dom/SplitRevealZoom.dom.test.jsx`, that mounts `SplitReveal` in a short
      container and asserts (a) the rendered board width stays `<=` the enclosing pane width and (b)
      the `constrain`/`maxWidth` styling remains applied (FR-008) — this supplements, not replaces,
      the existing pure-function test at `connect-four/tests/unit/splitRevealZoom.test.js` (leave
      that file untouched).
- [x] T028 [US2] Add the new test file **by name** to the `test:dom` script string in
      `connect-four/package.json` (currently 19 space-separated file paths ending in
      `tests/dom/ChallengeScreenGoalPrompt.dom.test.jsx`, no auto-discovery) and run `npm run
      test:dom` to confirm it executes (grep the output for the new test's distinctive name).
- [x] T029 [US2] Prove the new test is not vacuous (SC-003): temporarily reintroduce the original
      live-fit sizing bug (the pre-fix mechanism `split-reveal-zoom-contract.md`'s "Current
      mechanism" section describes, per T026), confirm the T027 test now fails, then revert the
      reintroduced bug.
- [x] T030 [P] [US2] Delete the `deepRevealPhase` export from
      `connect-four/src/lib/deepRevealTimeout.js` (FR-010) — confirm
      `connect-four/src/components/DeepRevealPane.jsx:12` only imports `DEEP_REVEAL_SOFT_MS`/
      `DEEP_REVEAL_HARD_MS` (verbatim: `import { DEEP_REVEAL_SOFT_MS, DEEP_REVEAL_HARD_MS } from
      '../lib/deepRevealTimeout.js';`) and never calls `deepRevealPhase` before deleting.
- [x] T031 [US2] Delete only the `'phase transitions: loading -> slow -> timedOut...'` test block
      from `connect-four/tests/unit/deepRevealTimeout.test.js`, leaving the
      `'hard cap is well beyond the soft hint...'` test (which covers the still-live
      `DEEP_REVEAL_SOFT_MS`/`DEEP_REVEAL_HARD_MS` constants) fully intact. Run `node --test
      connect-four/tests/unit/deepRevealTimeout.test.js` and confirm exactly one test runs and
      passes. Do NOT modify the `test`/`test:fast` script strings — both already list this file by
      name and only one test case (not the whole file) was removed.
- [x] T032 [US2] Run `npm run test:fast` once all of US2's changes have landed and confirm the
      baseline is still exactly 5 RED (T004's number) — no new failures introduced, and OI-82's
      pre-existing failures are not mistaken for a regression.
- [x] T033 [US2] Mark OI-71 ✅ RESOLVED in `docs/open_issues.md` (currently `**Status**: open — low
      priority, cosmetic to the test experience (observed 2026-07-28)` at the "## OI-71" entry),
      citing T022-T025's bisection and fix as evidence: the confirmed hang reproduction (T022), the
      bisected root cause (T023), the actual fix that turns the hang into a fast assertion failure
      (T024), and the reverted diagnostic mutation (T025, `git diff Board.jsx` empty). Quote the root
      cause T023/T024 actually found as evidence — do NOT reuse research.md R6's unconfirmed jsdom/
      testing-library hypothesis verbatim if the bisection found something else.
- [x] T034 [US2] Mark OI-16 ✅ RESOLVED in `docs/open_issues.md` — but ONLY the "Dead tested helper
      (from OI-12)" bullet describing `deepRevealPhase` (currently under `**Status**: deferred
      (accepted as backlog by the final whole-branch review, 2026-07-12; not merge-blocking)` at the
      "## OI-16" entry); the entry's other bullet (the jsdom peer mismatch) is **already** marked
      "✅ RESOLVED 2026-07-14" inline and must not be touched. Cite T030-T031 as evidence: the
      `deepRevealPhase` export deleted from `src/lib/deepRevealTimeout.js` with no remaining caller
      (T030), and the corresponding test case removed while the still-live
      `DEEP_REVEAL_SOFT_MS`/`DEEP_REVEAL_HARD_MS` test stays intact (T031). Resolve inline on that one
      bullet (matching the existing jsdom bullet's inline-resolution style), not by flipping the
      whole entry's Status line.
- [x] T035 [US2] Mark OI-29 ✅ RESOLVED in `docs/open_issues.md` (currently `**Status**: deferred
      (2026-07-14) — fix is shipped & user-verified; only follow-up docs/tests remain` at the
      "## OI-29" entry), citing this story's two follow-ups as evidence: the contract annotation
      (T026, `specs/042-mistake-review-unification/contracts/split-reveal-zoom-contract.md`'s
      "Current mechanism" section marked superseded) and the new render-level DOM regression test
      (T027-T029, `connect-four/tests/dom/SplitRevealZoom.dom.test.jsx`, registered in `test:dom` and
      proven non-vacuous) — both of OI-29's "If picked up" follow-ups are now done.

**Checkpoint**: The windowCounts mutant fails fast instead of hanging, `Board.jsx` is unmodified in
the working tree, the new SplitReveal regression test is registered and proven non-vacuous, the dead
`deepRevealPhase` code is gone with only its own test removed, and OI-71/OI-16/OI-29 are each marked
✅ RESOLVED in `docs/open_issues.md` citing that evidence. User Story 2 is independently complete and
testable.

---

## Phase 5: User Story 3 - CSP close-out is evidence-based and the backlog reflects shipped reality (Priority: P3)

**Goal**: OI-58 is marked ✅ RESOLVED in `docs/open_issues.md` with real diff + commit evidence AND a
real production-build header inspection (not just "it's probably fine"); OI-6/OI-72 entries are
correct; the six named closeout-audit issues are each re-measured and updated or left open with a
dated reason; a new whole-backlog walk-and-flag report is appended.

**Independent Test** (spec.md): diff the `helmet(...)` block between `main` and `stagging`, confirm
byte-identical, cite `ae3c006`, then build and serve a real production-like build and inspect the
actual `Content-Security-Policy` response header for the expected directives — independent of
US8.1/US8.2.

### Implementation for User Story 3

- [x] T036 [P] [US3] Diff `connect-four/server/index.js`'s `helmet(...)` block between `main` and
      `stagging` (`git diff origin/main origin/stagging -- connect-four/server/index.js | grep -A5
      "helmet("`) and confirm it is byte-identical; confirm `git log --oneline -1 ae3c006` and `git
      merge-base --is-ancestor ae3c006 main` (exit 0) (FR-011).
- [x] T037 [US3] Mark OI-58 ✅ RESOLVED in `docs/open_issues.md` (currently `**Status**: deferred /
      open (created 2026-07-18)` at the "## OI-58" entry), citing the byte-identical diff and
      `ae3c006` as evidence — no code change, no worktree, no branch merge (FR-011). Depends on T036.
- [x] T038 [US3] In the same OI-58 entry, disambiguate the existing trailing "**Resolved
      (2026-07-18)**" paragraph (which is entirely about the `@paddle/paddle-node-sdk` static-import
      change) with an explicit gloss (e.g. "(Unrelated to OI-58's CSP gap — see the CSP resolution
      above/below)") so a future reader cannot conflate the two unrelated resolutions (FR-012).
- [x] T039 [US3] Perform a real production-like build + header check (FR-013/SC-004): from the
      worktree root, run `eval "$(./worktree-ports.sh)"` (never a bare port, never `pkill node`),
      `cd connect-four && npm run build`, restart the server so it serves the built `dist/`, then
      `curl -sD - "http://localhost:$API_PORT/" -o /dev/null | grep -i content-security-policy` and
      confirm the actual header carries the directives described in
      `docs/architecture/server-conventions.md` §"CSP Directive Rationale" — `npm run dev` must NOT
      be used for this check (CSP never lands there). Kill the server only by the exact `$API_PORT`
      the script produced.
- [x] T040 [P] [US3] Mark OI-6 ✅ RESOLVED in `docs/open_issues.md`, citing the SUPERSEDED note that
      **already exists** at
      `specs/045-account-session-checkout/contracts/api-auth-session.md:8-13` (dated 2026-07-12,
      confirmed by direct read — research.md R9) as the evidence (FR-014) — this is a citation task,
      not an authoring task; do NOT add a second, redundant SUPERSEDED block to that contract file.
- [x] T041 [P] [US3] Confirm OI-72's `docs/open_issues.md` entry still reads as a recorded decision
      (the `...slide` spread making unknown authored fields, including `_es` siblings, survive a
      round trip is intended behavior) — no code change, no status flip (FR-015).
- [X] T042 [US3] Re-audit OI-1 against shipped reality (spec 049 T012's
      `usesAcceptedGate = isMultiSolutionCategory || SINGLE_ANSWER_CATEGORIES.has(effectiveCategory)`
      in `src/screens/ChallengeScreen.jsx`, per the epic doc's "Already resolved" table) and update
      its `docs/open_issues.md` entry: mark ✅ RESOLVED with that citation if confirmed shipped, or
      leave open with a dated UPDATE naming exactly what remains if re-measurement shows otherwise
      (FR-016).
- [X] T043 [US3] Re-audit OI-15 against shipped reality (i18n switcher shipped per
      `src/i18n/index.js`, but content coverage still incomplete per research.md R11's
      "3 of 25 top-level `es.json` sections complete") — re-measure the exact missing-section count
      fresh and update the `docs/open_issues.md` entry with a dated UPDATE naming exactly what
      remains; do NOT mark fully resolved (FR-016).
- [X] T044 [US3] Re-audit OI-12 — **this is a scope trap, per research.md R11**: confirm that
      no FR in this epic's US1/US2/US3 work touches `DeepRevealPane.jsx`'s underlying 6-second
      deep-reveal fetch timeout (the actual OI-12 bug, distinct from OI-16's dead `deepRevealPhase`
      helper which US2/T030-T031 does fix). Leave OI-12's `docs/open_issues.md` entry open with a
      dated note confirming this epic did NOT close it and explaining the OI-12/OI-16 distinction —
      do NOT mark it resolved (FR-016).
- [X] T045 [US3] Re-audit OI-24 (no evidence of a persistent upgrade CTA having shipped — only the 4
      existing reactive `UpgradeModal` call sites exist, per research.md R11) and update its
      `docs/open_issues.md` entry with a dated confirmation note that it remains open; do NOT
      force-close (FR-016).
- [X] T046 [US3] Re-audit OI-77 (`docs/open_issues.md:2329` already reads "RESOLVED 2026-07-29 ...
      `ConceptScreen` now delegates to ... `InfoProsePanel.jsx`") — confirm this status line is not
      stale (re-verify `ConceptScreen.jsx` still delegates as described); this is expected to be a
      no-op confirmation, not a new edit (FR-016).
- [X] T047 [US3] Re-audit the lesson-text half of OI-18/OI-36/OI-64: re-measure `text_es` coverage
      fresh by grepping every `lessons/lesson-*.json` file for `text_es` fields (do NOT trust either
      OI-18's "46 of 50"/"only lesson 1" framing or OI-36's 2026-08-01 "all 15 lesson files now carry
      text_es" update at face value — research.md R11 flags these as currently contradicting each
      other). Update OI-18's status line to match the fresh measurement and cross-reference OI-36's
      still-open review gate (voseo/verde-gris human review, not presence) rather than duplicating it
      (FR-016).
- [X] T048 [US3] Append a new, separate, dated blockquote/section to `docs/open_issues.md`
      (immediately after the existing 2026-07-29 precedent blockquote at lines 9-16, titled e.g.
      `> **Epic 8 whole-backlog audit (<date>).**`) listing every `OI-N` referenced by
      `docs/epics/open-issues-epics.md` whose code appears to have shipped in Epics 1-7 while its own
      `docs/open_issues.md` entry still reads open — walk the epics doc's full issue list, not just
      the six named in T042-T047 (FR-017, additive to FR-016, per
      `docs/epics/open-issues-epics.md` lines 34-35: "Epic 8's doc-bookkeeping story is the audit of
      this convention across the whole backlog, not the only place it happens"). This pass MUST NOT
      edit any individual `OI-N` entry's body and MUST NOT re-close an issue owned by another epic —
      it only lists candidates in the new section.
- [X] T049 [US3] Amend the **existing** 2026-07-29 header blockquote at `docs/open_issues.md:9-16`
      (the one narrow, explicit exception FR-017 permits) — add a dated correction to its "OI-1,
      OI-15, OI-12, OI-24, OI-77" mention, noting OI-12 specifically is NOT actually done (per T044's
      re-audit), and cross-reference the new T048 section. This is permitted because the blockquote
      is whole-file header prose, not any individual epic's `OI-N` entry body — do not touch any
      other epic's individual entry as part of this task.
- [X] T050 [US3] Confirm, as a final check, that no `OI-N` entry body owned by another epic was
      modified anywhere in this feature — not just by US3's T036-T049. The full permitted set across
      all three stories is: OI-70 (T021, US1); OI-71/OI-16/OI-29 (T033-T035, US2); OI-58/OI-6/OI-72
      and the six T042-T047 issues (US3); plus the T049 blockquote exception. `git diff
      docs/open_issues.md` — the whole-feature diff, not just US3's — should show edits scoped
      exactly to those ten entries, the T048 new section, and the T049 blockquote.

**Checkpoint**: OI-58/OI-6/OI-72 and the six closeout-audit issues are each correctly resolved or
left open with a dated reason in `docs/open_issues.md`; a real production build's CSP headers were
inspected directly; the new whole-backlog audit section exists without touching any other epic's
entry bodies. User Story 3 is independently complete and testable.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T051 [P] Update `docs/architecture/testing-conventions.md` with a short addendum documenting
      the new `eslint.config.js` environment-split convention (browser/node/node+dom-merge on
      `tests/dom/**` only/base-catch-all) and the "bare grep over-matches on the domain term
      'window'" trap this epic's T002 rediscovered (research.md R3/R14) — a new architectural
      convention, per Constitution Principle VIII's mandatory-documentation requirement (plan.md
      Constitution Check item (a)).
- [X] T052 Run the full `quickstart.md` walkthrough end-to-end in this worktree (all three sections)
      as a final sanity pass, confirming every command's stated expected result, and fix anything
      that quickstart.md's own verification catches that an earlier task missed.
- [X] T053 Confirm final repo hygiene: `git status --short` shows only the intended changes for this
      feature (no stray throwaway files from T017/T020/T029/T039 lingering), `git diff
      connect-four/src/components/Board.jsx` is empty (T025, re-confirmed), and `npm run test:fast`
      still shows exactly 5 RED (T004/T032's baseline, not a new count).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — re-measurement only, can start immediately. Each user
  story consumes the specific T001-T004 measurement relevant to it (US1 → T001-T003; US2 → T004;
  US3 → none directly, but T004's 5-RED baseline is the reference point T032/T053 check against).
- **No Foundational phase**: stories are independently testable per spec.md/plan.md; nothing blocks
  starting any of US1/US2/US3 once Phase 1's measurements are in hand.
- **User Stories (Phase 3-5)**: can proceed in parallel in principle — **with one explicit exception
  below**.
- **Polish (Phase 6)**: depends on all three user stories being complete.

### Cross-story sequencing exception (MUST NOT be run in parallel)

- **US1's T020 (SC-001a commit-rejection proof) and US2's T022-T025 (`Board.jsx` diagnostic
  mutation window) must never overlap in the working tree at the same time** (quickstart.md's
  explicit "Ordering note", plan-critique blocking issue 3). Run T020 either fully before T022
  opens, or fully after T025 closes (`git diff src/components/Board.jsx` empty). This is the one
  place this feature's "no cross-story blocking dependency" claim needs a caveat — it is a
  scheduling/sequencing constraint on two diagnostic-mutation windows, not a data or code
  dependency between the stories.

### Within Each User Story

- **US1**: T005-T007 (config split + explicit two-block catch-all) before T008 (the blocking
  verification gate — its four `--print-config` assertions must pass with pasted evidence before
  T009 runs); T009 before T011-T014 (triage, which reads T009's fresh counts); T010 is one specific
  instance of T011's broader fix and can run alongside it; T011's `src/` deletions land in their own
  commit, separate from T005/T006/T014's config change and from T012/T013's `tests/`/`server/`
  cleanup; T014-T015 (demote + open OI-N) can run together; T016 (lint exits 0) depends on all of
  T005-T015; T017 (prove the gate, using the `unusedProbe` fixture — not the `_`-prefixed one) and
  T018-T019 (wire into test:fast/hook) depend on T016; T020 (double-wiring proof, reusing T017's
  fixture) depends on T018-T019 and the cross-story sequencing note above; T021 (mark OI-70
  resolved) depends on T020.
- **US2**: T022 → T023 → T024 → T025 strictly sequential (each depends on the previous state of the
  mutation/investigation); T026 (contract annotation) is independent of the Board.jsx work and can
  run any time; T027 → T028 → T029 sequential (write test → register by name → prove non-vacuous);
  T030 → T031 sequential (delete export → delete its test); T032 (final test:fast check) depends on
  everything else in US2 having landed; T033 (mark OI-71 resolved) depends on T022-T025; T034 (mark
  OI-16 resolved) depends on T030-T031; T035 (mark OI-29 resolved) depends on T026 and T027-T029.
- **US3**: T036 → T037 → T038 sequential (evidence → resolve → disambiguate); T039 is independent
  and can run any time (real build/header check); T040/T041 are independent one-line citation tasks;
  T042-T047 (six-issue audit) can run in parallel with each other (different `docs/open_issues.md`
  entries) but should be applied as sequential edits to the same file to avoid clobbering each
  other's diff; T048 (new report section) is additive and independent of T042-T047's edits; T049
  (blockquote amendment) should run after T048 exists (it cross-references it) and after T044
  (it depends on T044's OI-12 finding); T050 is a final audit-scope check depending on all of
  T036-T049 **plus T021 (US1) and T033-T035 (US2)**, since it audits `docs/open_issues.md` edits
  across the whole feature, not just US3.

### Parallel Opportunities

- All of Phase 1 (T001-T004) can run in parallel — independent read-only measurements.
- T010, T012, T013 (different files/directories within US1's triage) can run in parallel with each
  other and with T011.
- T026, T030 (US2's contract annotation and dead-code deletion) can run in parallel with the
  T022-T025 Board.jsx bisection track and with each other.
- T036, T040, T041 (US3's independent CSP-diff, OI-6 citation, and OI-72 confirmation) can run in
  parallel.
- T051 (documentation) can run in parallel with T052/T053 once the relevant story work is done.
- Different user stories (US1 vs US2 vs US3) can be worked on in parallel by different
  contributors/agents, **except** the one cross-story sequencing exception above.

---

## Parallel Example: User Story 1

```bash
# After T005-T009 land, these can run in parallel (different files/directories):
Task: "Remove the unused boardToSpec import in connect-four/src/components/admin/BoardEditor.jsx"
Task: "Fix remaining no-unused-vars violations across tests/ and server/"
Task: "Fix no-empty/no-regex-spaces/unused-disable-directive violations"
```

## Parallel Example: User Story 3

```bash
# These three are independent of each other and of the six-issue audit:
Task: "Diff helmet(...) between main/stagging and confirm ae3c006 reachability"
Task: "Mark OI-6 resolved citing the pre-existing SUPERSEDED note in api-auth-session.md"
Task: "Confirm OI-72's entry still reads as a recorded decision, no code change"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup — fresh measurements).
2. Complete Phase 3 (User Story 1 — the lint gate).
3. **STOP and VALIDATE**: `npm run lint` exits 0 tree-wide, a `.mjs` violation is caught, `test:fast`
   and the pre-commit hook both gate on it.
4. This alone is a real, deployable improvement — a working lint gate that previously didn't exist.

### Incremental Delivery

1. Setup → US1 (lint gate) → validate independently.
2. Add US2 (DOM/unit suite reliability) → validate independently (respecting the Board.jsx/T020
   sequencing exception if US1's T020 hasn't run yet).
3. Add US3 (CSP close-out + backlog bookkeeping) → validate independently.
4. Phase 6 polish once all three are in.

### Parallel Team Strategy

With multiple contributors/agents:

1. Everyone completes Phase 1 (Setup) together — it's four independent read-only measurements.
2. Once Setup is done:
   - Agent A: User Story 1 (lint gate)
   - Agent B: User Story 2 (DOM/unit suite) — coordinate T020/T022 timing with Agent A per the
     sequencing exception above
   - Agent C: User Story 3 (CSP + backlog bookkeeping)
3. Stories complete and integrate independently; Phase 6 polish runs once all three land.

---

## Notes

- [P] tasks touch different files/directories with no dependency on an incomplete task in the same
  story.
- Every count cited in this file (282 errors, 76 no-unused-vars, 32 react-hooks/react-refresh, 10
  trivial, 141 `.mjs` files, 5 files needing `tests/dom/**` browser globals) is a point-in-time
  measurement from research.md/the epic doc/spec.md — Phase 1's T001-T003 exist specifically to
  re-verify these fresh before they're used to drive triage decisions in T009/T011-T014.
- `Board.jsx`, `deepRevealTimeout.js`/`.test.js`, and the throwaway lint-probe files used in T017/
  T020/T029/T039 are the only places this feature intentionally introduces a temporary,
  to-be-reverted mutation — each such task explicitly states the revert step; verify `git diff`/
  `git status` is clean of them at the end (T053).
- Never `git add -A` (T011, T020); never a bare port number or `pkill node` when restarting the
  server for T039 (`docs/architecture/worktree-conventions.md`, CLAUDE.md); never edit another
  epic's `docs/open_issues.md` entry body outside T021 (OI-70), T033-T035 (OI-71/OI-16/OI-29),
  T037-T041/T042-T047's six named issues (US3), and T049's one narrowly-scoped blockquote exception
  (T050 checks this, across the whole feature).
- `test`/`test:dom` script strings are intentionally left untouched except for T028's one addition
  (US2) — `test:fast` gets the `eslint . && ` prefix (US1, T018) and nothing else.
