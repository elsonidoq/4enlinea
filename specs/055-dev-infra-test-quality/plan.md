# Implementation Plan: Dev Infrastructure & Test-Quality Baseline

**Branch**: `055-dev-infra-test-quality` | **Date**: 2026-08-02 | **Spec**: `specs/055-dev-infra-test-quality/spec.md`
**Input**: Feature specification from `specs/055-dev-infra-test-quality/spec.md` (Epic 8,
`docs/epics/open-issues-epics.md` §"Epic 8 — Dev Infrastructure & Test-Quality Baseline")

**Note**: This template is filled in by the `/speckit-plan` command. See
`.specify/templates/plan-template.md` for the execution workflow.

## Summary

Make the repo's own quality gates trustworthy across three independent, non-blocking areas:

1. **US1 — a lint that can fail and covers the whole tree.** Split `connect-four/eslint.config.js`
   by environment — browser (`src/`), node (`server/`, `scripts/`, and `tests/` in general), and a
   node+browser merge scoped specifically to `tests/dom/**` (a deliberate DEVIATION from the epic's
   Settled decision #1, which assigned all of `tests/` to the node ruleset — see "Deviations from
   epic decisions" below) — plus a base/catch-all block so no file (e.g. `vite.config.js`,
   `eslint.config.js`, `public/sw.js`) is ever matched by zero blocks, which is OI-70's exact defect
   (FR-018). Widen the `files` glob to include `.mjs`/`.cjs` (141 `.mjs` files currently receive
   zero rules — `research.md` R2). Remove one confirmed unused import (`BoardEditor.jsx`, FR-005)
   plus every other `no-unused-vars`/trivial-rule violation surfaced by the split (measured at 76 +
   10 respectively against the pre-split 282-error baseline; `no-unused-vars` touches 34 `src/`
   production files as non-behavior-changing deletions); demote `react-hooks/*`/`react-refresh/*`
   (32 errors, all in `src/` production components) to `warn` with a stated reason and open a new
   follow-up `OI-N`, rather than refactor shipped UI behavior as config work (FR-019's explicit
   triage policy). Get `npm run lint` to exit 0 under that policy, prove the widened glob is a real
   gate (not just a walked glob) by inserting and reverting a violation in a `.mjs` file *and*
   confirming coverage on the base/catch-all files via `--print-config` (FR-018), then wire `lint`
   into `test:fast` and `.githooks/pre-commit` — with lint running *before* the existing KB-sync
   step (`research.md` R5).
2. **US2 — the DOM/unit suite fails loudly instead of hanging or testing nothing.** Bisect and fix
   OI-71's genuine hang (not a busy loop — 0% CPU, stable RSS) so the `Board.jsx` windowCounts-guard
   mutant produces a fast assertion failure; add a real render-level SplitReveal regression
   (`research.md` R7) registered by name in `test:dom`; annotate the SplitReveal contract's stale
   "Current mechanism" section as superseded; delete the dead `deepRevealPhase` export and only its
   own test case (`research.md` R8).
3. **US3 — CSP close-out is evidence-based and the backlog reflects shipped reality.** Close OI-58
   with the byte-identical `helmet(...)` diff + `ae3c006` as evidence and a real
   build+restart+header-inspection check; disambiguate OI-58's confusing trailing paragraph; cite
   (not re-author) OI-6's already-existing SUPERSEDED note (`research.md` R9); audit the six named
   closeout candidates against freshly-measured reality (`research.md` R11 surfaces that OI-12 is
   likely mis-scoped in the epic's own list and that OI-18/OI-36 currently contradict each other);
   run the additive whole-backlog walk-and-flag pass as a new dated section appended to
   `docs/open_issues.md` (`research.md` R12), never editing another epic's entry body — with one
   narrow, explicit exception: the existing 2026-07-29 header blockquote at
   `docs/open_issues.md:9-16` gets a dated correction on its OI-12 mention (OI-12 is not actually
   done, per FR-016's own re-audit) plus a cross-reference to the new section, since that
   blockquote is whole-file header prose, not any epic's `OI-N` entry body (FR-017, `research.md`
   R12).

No new architecture, no schema/data-model change, no new runtime dependency, and no *behavior*
change to any production code path. This is primarily configuration, test-file, and
documentation-bookkeeping work plus one small dead-code deletion — but FR-019's triage additionally
requires removing ~34 unused-variable bindings across `src/` production components (non-behavior-
changing deletions, not refactors) to get `npm run lint` to exit 0.

## Technical Context

**Language/Version**: JavaScript (ESM, `"type": "module"` — `connect-four/package.json`), Node.js
(version per `connect-four/.nvmrc`/CI, not changed by this epic), React 19 (frontend only).
**Primary Dependencies**: ESLint 9 flat config (`eslint.config.js`, `@eslint/js`,
`eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`), `node:test` (test runner), React
Testing Library + jsdom (`test:dom`), `helmet` (CSP, untouched by this epic — verification only).
**Storage**: N/A — no schema/data changes (spec.md:130, confirmed).
**Testing**: `npm run test:fast` (regular gate), `npm run test:dom` (DOM/render suite), `npm run
lint` (currently inert, this epic's US1 makes it real) — all per `docs/architecture/
testing-conventions.md` and `CLAUDE.md` §Running tests.
**Target Platform**: Node server (Railway) + Vite/React SPA; this epic's changes are dev-tooling
and test-suite only. No production code path's *behavior* changes: FR-005's and FR-019(a)'s
unused-import/unused-variable removals across `src/` production components are non-behavior-
changing deletions (removing a binding nothing reads), not refactors; `react-hooks`/`react-refresh`
findings (FR-019(c)) are demoted to `warn` in config only, never touched in code; and the
`Board.jsx`/`deepRevealTimeout.js` changes in US2 are diagnostic-then-reverted or dead-code-removal.
**Project Type**: Web application monorepo (`connect-four/` — `src/` frontend + `server/` +
`scripts/` node + `tests/` mixed).
**Performance Goals**: N/A (no perf-sensitive code touched).
**Constraints**: `npm run lint` MUST exit 0 on the widened glob before it becomes a gate (Settled
decision #2, epic doc) — sequencing, not a performance constraint. `npm run test:dom`'s windowCounts
mutant MUST fail in "sub-few-seconds" (SC-002), replacing today's ~32s hang.
**Scale/Scope**: 71 files currently lint-covered (282 errors/14 warnings baseline, `.js`/`.jsx`
only) + 141 newly-covered `.mjs` files (error count on that slice is measured fresh at
implementation time, not predicted here — `research.md` R2). Of the 282-error baseline: ~164
`no-undef` errors are fixed by FR-001/FR-018's environment split alone (server 121, tests 27,
scripts 14, `vite.config.js` 2); 76 `no-unused-vars` and 10 trivial-rule errors are fixed directly
(FR-019(a)/(b)); 32 `react-hooks`/`react-refresh` errors are demoted to `warn` with a new follow-up
`OI-N` (FR-019(c)) rather than fixed in this epic. Three independently-testable user stories, no
cross-story blocking dependency (spec.md:10).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

This epic touches only dev-tooling config, test files, and documentation — it does not add a new
user-facing feature, so the Explanation Engine (Principle I), UX Consistency (Principle IV), and
Performance (Principle V) principles are not engaged. Relevant gates:

- **Principle II (Code Quality & Simplicity)**: FR-005's and FR-019(a)'s unused-import/unused-
  variable removals and FR-010's dead-code deletion (`deepRevealPhase`) are direct instances of
  this principle ("no half-finished implementations… only what is covered by a failing test" / no
  speculative surface). FR-019(c)'s demotion of `react-hooks`/`react-refresh` to `warn` (rather
  than silently fixing 32 findings as out-of-scope UI refactors) is a deliberate scope boundary,
  made explicit with a stated reason and a tracking `OI-N`, not a silent suppression. PASS.
- **Principle III (Testing Standards)**: US2 directly serves this principle — replacing a hang with
  a real assertion failure, and replacing a vacuous pure-function test with a render-level
  regression that actually exercises the bug. PASS (this epic is the mechanism, not a violation).
- **Principle VIII — Documentation (MUST check before planning)**:
  - [x] Existing architecture docs were read before drafting this plan:
    `docs/architecture/testing-conventions.md`, `docs/architecture/worktree-conventions.md`,
    `docs/architecture/server-conventions.md` §"CSP Directive Rationale", `docs/epics/
    open-issues-epics.md` §Epic 8, `docs/open_issues.md` (OI-70/71/16/29/58/6/72 plus the six
    closeout-audit entries and the file's existing header blockquote), the two frozen contract
    docs this epic annotates (`specs/042-.../contracts/split-reveal-zoom-contract.md`,
    `specs/045-.../contracts/api-auth-session.md`), `connect-four/package.json`,
    `connect-four/eslint.config.js`, `.githooks/pre-commit`.
  - [x] Undocumented conventions discovered during review: (a) the bare-grep-over-matches trap for
    the domain term "window" in this test suite (`research.md` R3) — worth a short testing-
    conventions.md addendum if this epic's tasks.md includes a doc-update task; (b) OI-6's
    SUPERSEDED note already exists and predates this epic (`research.md` R9) — not a new
    convention, but a correction to what the backlog entry implies is still missing.
  - [x] `tasks.md` (Phase 2, not authored by `/speckit-plan`) will need an explicit task for: the
    pre-commit hook ordering decision (R5) documented inline as a hook comment (the hook file
    itself is the "doc" for its own behavior, per its existing header-comment convention); and the
    FR-017 audit section's placement convention (R12) needs no separate doc — it follows the
    existing in-file precedent exactly, so no new documentation surface is introduced.

No constitution violations requiring justification. **Gate: PASS.**

## Project Structure

### Documentation (this feature)

```text
specs/055-dev-infra-test-quality/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output — all citations + the two open-question decisions
├── data-model.md        # Phase 1 output — N/A note (no entities)
├── quickstart.md        # Phase 1 output — manual verification walkthrough per user story
└── tasks.md             # Phase 2 output (/speckit-tasks command — NOT created here)
```

No `contracts/` directory: this feature is purely internal dev-tooling/test-infra/doc-bookkeeping
with no new external interface (no new API endpoint, no new CLI, no new UI contract) — it is
purely internal, matching the "Skip if project is purely internal" instruction in the plan
workflow. The two *existing* frontend contract docs it touches
(`split-reveal-zoom-contract.md`, `api-auth-session.md`) get one-line superseded annotations, not
new contracts.

### Source Code (repository root)

```text
connect-four/
├── eslint.config.js                       # US1 — environment split (browser/node/node+dom-merge
│                                           #   on tests/dom/** only, FR-001) + base/catch-all
│                                           #   block (FR-018) + .mjs/.cjs glob widening (FR-002)
│                                           #   + react-hooks/react-refresh demoted to warn (FR-019c)
├── vite.config.js                         # US1 — base/catch-all coverage target (FR-018),
│                                           #   read-only reference; already has 2 real no-undef
│                                           #   errors that MUST remain visible post-split
├── public/sw.js                           # US1 — base/catch-all coverage target (FR-018)
├── package.json                           # US1 (lint prefixed onto test:fast; new test:dom
│                                           #   entry for the SplitReveal regression) — US2 does
│                                           #   NOT touch test/test:fast script strings (FR-010)
├── src/
│   ├── components/
│   │   ├── Board.jsx                      # US2 — diagnostic mutation only, reverted (FR-007)
│   │   ├── admin/BoardEditor.jsx          # US1 — remove unused `boardToSpec` import (FR-005);
│   │   │                                   #   one of ~34 src/ production files with a
│   │   │                                   #   no-unused-vars violation (FR-019a) — the full
│   │   │                                   #   file list is enumerated fresh at implementation
│   │   │                                   #   time, not predicted here
│   │   └── SplitReveal.jsx                # US2 — subject of the new regression test (no
│   │                                       #   production change expected; the live-fit fix is
│   │                                       #   already shipped per research.md R7)
│   └── lib/
│       ├── useDragSplit.js                # US2 — read-only reference for the new test
│       └── deepRevealTimeout.js           # US2 — delete `deepRevealPhase` export (FR-010)
├── tests/
│   ├── dom/
│   │   ├── BoardWindowCounts.dom.test.jsx # US2 — bisect target for OI-71's hang
│   │   └── SplitRevealZoom.dom.test.jsx   # US2 — NEW file, added by name to test:dom (FR-008)
│   └── unit/
│       ├── splitRevealZoom.test.js        # US2 — untouched (still valid, just insufficient
│       │                                   #   alone; the new DOM test supplements it)
│       └── deepRevealTimeout.test.js      # US2 — remove one test case only (FR-010)
└── server/
    ├── tests/*.test.mjs                   # US1 — newly linted once glob widens (FR-002)
    └── scripts/*.mjs                      # US1 — newly linted once glob widens (FR-002)

.githooks/pre-commit                       # US1 — extended with a leading lint step (FR-006b)

docs/open_issues.md                        # US3 — OI-58/6/72 entries updated; six-issue audit
                                            #   (FR-016); new dated whole-backlog-audit section
                                            #   appended near the top (FR-017, research.md R12)
docs/architecture/server-conventions.md    # US3 — read-only reference for FR-013's verification
specs/042-mistake-review-unification/contracts/split-reveal-zoom-contract.md   # US2 — FR-009
specs/045-account-session-checkout/contracts/api-auth-session.md              # US3 — FR-014
                                            #   (citation only — note already exists, research.md R9)
```

**Structure Decision**: single existing web-app monorepo (`connect-four/` + repo-root docs/hooks)
— no new top-level directory. All work lands in already-established locations; the only new file
is the SplitReveal DOM regression test.

## Complexity Tracking

*No constitution violations — table intentionally omitted.*

## Deviations from epic decisions

- **Settled decision #1 (ruleset environment split)**: the epic assigned the node ruleset to
  `server/`, `scripts/`, and all of `tests/`. This plan DEVIATES: `tests/` in general gets node
  globals, and a merged node+browser ruleset is layered on top scoped to `tests/dom/**` only — the
  5 files with genuine bare `document`/`window` usage all live there (`research.md` R3). This is a
  deliberate deviation, not a clarification: it keeps a non-DOM unit test that accidentally reaches
  for a bare browser global caught by `no-undef`, which is exactly the gate this epic exists to
  build. `spec.md` FR-001 and US1 acceptance scenario 1 state this explicitly as a DEVIATION, not a
  clarification, per the plan-critique's decision 1 (this supersedes the owner's earlier "three
  environments, all of `tests/` merged" answer at the spec-critique stage, on new evidence).
- **"Wired into the test scripts" (epic acceptance criterion, plural) — narrowed to `test:fast` +
  pre-commit only** (tasks-critique Decision 1): the epic's acceptance criterion says lint must be
  "wired into the test scripts" (plural). This plan/FR-006 wires it into `test:fast` and the
  `.githooks/pre-commit` hook only (`tasks.md` T018/T019), leaving `test` and `test:dom`'s script
  strings untouched. This is a deliberate narrowing, not an oversight: `test:fast` is the command
  CLAUDE.md designates for all regular development and CI, while plain `test` calls the real
  c4solver and routinely hangs 10+ minutes, so gating it would add no real coverage. Recorded here
  because, unlike the `tests/dom/**` scoping deviation above (already flagged in three places), this
  narrowing previously went unflagged.

## Open questions this plan resolves (per the coordinating agent's brief)

1. **FR-017's report location**: a new, dated blockquote/section appended near the top of
   `docs/open_issues.md` (immediately following the existing 2026-07-29 precedent blockquote at
   lines 9-16), never editing any individual `OI-N` entry's body — **with one narrow, explicit
   exception** (plan-critique decision 2): the existing 2026-07-29 blockquote itself gets a dated
   correction on its OI-12 mention (OI-12 is not actually done, per FR-016's own re-audit) plus a
   cross-reference to the new section, because that blockquote is whole-file header prose, not any
   individual epic's `OI-N` entry body. See `research.md` R12 for the full rationale and rejected
   alternatives (a new standalone doc; a task artifact under this spec's own folder).
2. **`.githooks/pre-commit` lint-vs-KB-sync ordering**: lint runs **first**. If lint fails, the
   commit is rejected before `sync-kb.mjs` ever mutates/stages the KB mirror — avoiding a rejected
   commit that nonetheless leaves a freshly-rewritten, freshly-staged `connect-four/server/kb/`
   sitting in the working tree/index. See `research.md` R5.
3. **US1's lint-error triage policy** (plan-critique blocking issue 1, resolved): fix
   `no-unused-vars` (76) and trivial rules (10) directly; demote `react-hooks/*`/`react-refresh/*`
   (32, all in `src/` production components) to `warn` with a stated reason and a new tracking
   `OI-N`, rather than refactor shipped UI behavior as config work. See `spec.md` FR-019 and
   `research.md` R1a.
4. **The base/catch-all eslint block** (plan-critique blocking issue 2, refined by tasks-critique
   blocking issue 2, resolved): NOT a glob-based catch-all — under ESLint 9 flat config, blocks
   MERGE by `files`-glob match, so a `**/*.{js,jsx,mjs,cjs}` catch-all would leak node globals into
   every file including `src/**`. Instead, an **explicit two-block enumeration** covers exactly the
   files no environment-scoped block reaches: `files: ['vite.config.js', 'eslint.config.js']` (node
   globals) and `files: ['public/sw.js']` (browser + serviceworker globals), verified via
   `--print-config` returning non-zero rules before and after the split, and confirming
   `src/components/Board.jsx` still shows no `process` global post-split. See `spec.md` FR-018,
   `research.md` R1, and `tasks.md` T005/T007/T008.
5. **FR-016/FR-017 task split** (raised as fragile in the plan-critique handoff, resolved): safe
   to split into two separate tasks — both are additive appends to different regions of
   `docs/open_issues.md`, so a naive split does not conflict.
6. **FR-019(a)'s `src/` unused-variable cleanup sequencing** (tasks-critique Decision 2, resolved):
   all ~34 `no-unused-vars` deletions across `src/` production components are still done in full
   (not demoted, not deferred) — but they land in their own commit, separate from the
   `eslint.config.js` environment-split/glob-widening/react-hooks-demotion change and separate from
   the `tests/`/`server/` cleanup (`tasks.md` T011 vs. T005/T006/T014/T012/T013). This makes "did the
   config change break something?" answerable by `git revert` on one isolated commit rather than by
   re-reading up to 34 diffs, and matters more than usual here because `tasks.md` T011 deliberately
   does not enumerate the 34 files upfront (harvest-don't-invent — the list is measured fresh at
   implementation time) and other epics are concurrently editing `src/`.
