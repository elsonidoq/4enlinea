# Implementation Plan: Puzzle Generation & Correctness

**Branch**: `feature/polish` | **Date**: 2026-07-10 | **Spec**: `specs/044-puzzle-generation-correctness/spec.md`
**Input**: Feature specification from `specs/044-puzzle-generation-correctness/spec.md` (Epic 4 of `polish_epic.md`)

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

This feature audits and corrects the puzzle correctness predicates that already exist at two
seams — generation-time (`server/candidate-generator.js:checkPredicate`) and solve-time
(`server/predicates.js:evaluatePredicate`) — plus a client-side seam
(`src/screens/ChallengeScreen.jsx`'s consumption of `/api/evaluate-move`) discovered during
routing-trace research, and adds net-new, KB-sourced Allen T1–T7 threat-simplification detectors
and V1–V5/T4(A/B) pattern operators. It does **not** redesign the per-category correctness model,
does **not** widen the candidate pool via board mutation, and does **not** touch the reason-engine
or sparring/blunder color rules.

Primary technical approach: (1) generator-side, relax the multi-solution acceptance filter from
`correctCols.length === 1` to `>= 1` for exactly three categories, and make every caller of
`evaluatePredicate` that currently branches on `result === 'correct'` also accept `'tied'` for
those three categories — closed via an exhaustive `rg 'evaluatePredicate'` sweep, a hard gate before
US3 is done (see Gating task below); (2) client-side, extend `/api/evaluate-move` in place (request
gains `category`+`movestring`, response gains an additive accepted-answer field gated to the three
multi-solution categories) and update `ChallengeScreen.jsx` to consume it instead of the current pure
`scoreMove` comparison — `SocraticScreen.jsx` is excluded from this fix per routing-trace findings
(see research.md R2) and this exclusion is now ratified directly in spec.md; (3) sequence a one-time
KB backfill (FR-020a) for V1/V2/V4/V5 and a reconciliation for T4 Case B before implementing any
operator for those five; T1–T7 are already fully KB-verified and can start immediately; (4) implement
T1–T7/V1–V5/T4(A,B) as pure, threat-set-in functions with no board-mutation step, each validated
against its own KB `worked_examples` and `false_positives` through the production detector (I12).

## Technical Context

**Language/Version**: JavaScript (ES modules), Node.js — existing `connect-four/server` and
`connect-four/src` codebases; no new runtime.
**Primary Dependencies**: existing `c4solver` binary via `c4solver-wrapper.js` (IPC), existing
`classifier.js`/`predicates.js`/`candidate-generator.js`; no new third-party dependency introduced.
**Storage**: Supabase/Postgres (`candidates`, `puzzles` tables) — no schema change; data-model.md
resolves persistence and the client endpoint mechanism as one coupled decision: recompute
`correctCols`/`'tied'` at solve time via `evaluatePredicate` rather than persisting the full array
(the function already re-derives correctness per submitted column with no extra storage needed),
serving that recomputation through an in-place extension of `/api/evaluate-move`.
**Testing**: `npm run test:fast` (Vitest) inside `connect-four/` for all iterative work; extend
`tests/predicates/predicates.test.js` for the acceptance-path fix; new
`tests/unit/allenTransforms.test.js` / `tests/unit/allenVRules.test.js` (or similarly named) for
US4/US5, sourcing fixtures from KB `worked_examples`/`false_positives`. `tests/integration/
candidate-generator.test.js` (full `npm test`, real solver, ~400 calls/test) is reserved for a
final validation pass only — never run in the iterative loop (IPC deadlock risk, per memory
`project_integration_test_slowness`).
**Target Platform**: existing web app (React frontend + Express/Node server), no platform change.
**Project Type**: Web application (frontend `connect-four/src` + backend `connect-four/server`) —
matches "Option 2: Web application" in the structure template below, using this repo's actual
directory names rather than the generic `frontend/`/`backend/` placeholders.
**Performance Goals**: no new latency budget beyond the constitution's existing ones (Principle V:
puzzle goal predicate evaluation for `immediate_threat`/`forced_block`/`double_threat` under 100ms
— the `correctCols.length >= 1` change does not add solver calls, only changes an accept/reject
threshold on already-computed results, so this budget is unaffected).
**Constraints**: no board-mutation/candidate-pool-widening mechanism (explicit `NOT included`);
must not alter `undercut`/`claimeven`/`overcut`/`z_threat` acceptance behavior (regression-tested);
must not touch `server/scripts/reason_engine/`; solver-call budget discipline — do not add solver
queries to the hot generation/solve path merely to re-verify KB fixtures (fixture re-verification
happens once, offline, via `TOOLS/optimal_line.mjs`, not on every generation run).
**Scale/Scope**: 5 user stories (3 audit/fix + 2 net-new), touching ~4 server files
(`candidate-generator.js`, `predicates.js`, `index.js`, a new `allenTransforms`/`allenVRules`
module), 1 client file (`ChallengeScreen.jsx`), 5 KB files needing backfill/reconciliation
(`allen-v1.md`, `allen-v2.md`, `allen-v3.md`, `allen-v4.md`, `allen-v5.md`'s re-verify pass, plus
`allen-t4.md`'s Case B reconciliation and the stale memory file
`reference_verified_tactical_movestrings.md`), and 2+ new test files.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Explanation Engine as Single Source of Truth** — PASS. This feature does not add a new
  independent move-evaluation surface; it corrects the existing `evaluatePredicate`/`checkPredicate`
  seam and makes the client consume the server's verdict instead of a bypass, which *strengthens*
  single-source-of-truth compliance (the client no longer diverges from the server for the three
  multi-solution categories). T1–T7/V1–V5 operators are content-pipeline tooling, not a new
  user-facing explanation surface.
- **II. Code Quality & Simplicity** — PASS. No speculative abstraction: the acceptance-filter fix
  is a threshold change (`=== 1` → `>= 1`) plus caller updates, not a new framework. New
  T1–T7/V1–V5 functions are one-function-per-rule, matching the KB's own `formal_predicate` shape.
- **III. Testing Standards** — PASS, with an explicit task: every corrected category and every new
  T/V-rule operator gets a positive AND negative fixture (KB `worked_examples` + `false_positives`),
  run through the real solver where the category is solver-dependent, per I12 (production detector,
  not the motivating example).
- **IV. UX Consistency & Progressive Disclosure** — PASS. US1's green/gray terminology requirement
  is exactly this principle applied to puzzle color casting; no new visualization surface is added.
- **V. Performance Requirements** — PASS (see Technical Context: Performance Goals). No new solver
  calls added to the hot path.
- **VI. Implementation & Debugging Methodology** — PASS, directly informs the plan's Phase 0/1
  research: "reproduce before theorizing" is why the client-routing trace (research.md R2) reads
  the actual `ChallengeScreen.jsx`/`server/index.js` code rather than trusting the spec's original
  assumption about a bare `col === correctCol` comparison — that assumption turned out to be
  correct for `SocraticScreen.jsx` but wrong for `ChallengeScreen.jsx` (the real gap there is a
  score-only `quality` computation that never calls `evaluatePredicate`).
- **VII. Software Design Philosophy** — PASS. "Special cases aren't special enough to break the
  rules": `undercut`'s avoid-the-pattern and the unique-answer categories' single-column model are
  explicitly preserved as their own special cases per FR-013/FR-014, not folded into a false-generic
  "any generating column" rule.
- **VIII. Documentation** — PASS, see checklist below.

**Principle VIII — Documentation (MUST check before planning)**:
- [x] Existing architecture docs (docs/architecture/, data-model.md, contracts/, prior plan.md
  files, constitution) were read before this plan was drafted. (`api-conventions.md`/
  `server-conventions.md` were not modified by prior specs in a way that conflicts here; spec 007/
  008 read for `CompletionStrategy`/category-wiring context per the epic's Authoritative sources.)
- [x] Any undocumented conventions discovered during review have been documented before planning
  continued — see research.md R2 (client routing reality) and R4 (KB-vs-memory staleness on T4
  Case B), both written up rather than left implicit.
- [x] tasks.md will include explicit documentation tasks for every new architectural decision this
  feature introduces: (a) the corrected multi-solution acceptance rule → belongs in
  `docs/architecture/server-conventions.md` (or a new note if that file doesn't yet cover
  `predicates.js`/`candidate-generator.js` conventions — confirm during task-writing); (b) the new
  `allenTransforms`/`allenVRules` module → a short module-purpose note in the same file or
  `index-conventions.md`; (c) the KB backfill itself is documentation (the KB files ARE the
  doc-of-record for these rules — no separate write-up needed beyond the KB edits).

## Project Structure

### Documentation (this feature)

```text
specs/044-puzzle-generation-correctness/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── contracts/
│   └── internal-function-contracts.md
└── tasks.md              # Phase 2 output (/speckit-tasks — not created by this command)
```

### Source Code (repository root)

```text
connect-four/
├── server/
│   ├── candidate-generator.js     # checkPredicate multi-solution acceptance fix (US3)
│   ├── predicates.js               # evaluatePredicate — no logic change; callers audited (US3)
│   ├── index.js                    # /api/evaluate-move + /inline — caller fix for 'tied' (US3)
│   ├── classifier.js               # read-only reference: getImmediateThreats/detectForcedBlock
│   │                                #   (reused, not modified, for US1/US2 gravity-top logic)
│   ├── allenTransforms.js          # NEW — T1–T7 threat-set-in/winner-out detectors (US4)
│   └── allenVRules.js              # NEW — V1–V5 + T4(A,B) operators (US5)
├── src/
│   └── screens/
│       └── ChallengeScreen.jsx     # client accepted-answer fix (US3 / FR-015a) — scoped IN
│       # SocraticScreen.jsx is explicitly OUT of the FR-015a fix (research.md R2)
├── tests/
│   ├── predicates/predicates.test.js         # extend: FR-010/012/013/014 regression cases
│   ├── unit/allenTransforms.test.js           # NEW — T1–T7 fixtures from KB
│   ├── unit/allenVRules.test.js               # NEW — V1–V5/T4(A,B) fixtures from KB
│   └── integration/candidate-generator.test.js  # final-pass only, real solver, not iterative
docs/knowledge-base/
├── allen-v1.md, allen-v2.md, allen-v4.md, allen-v5.md   # backfill worked_examples (FR-020a)
├── allen-v3.md                                           # re-verify existing worked_example
└── allen-t4.md                                           # reconcile Case B against memory claim
```

**Structure Decision**: Existing web application layout (`connect-four/server` +
`connect-four/src`), matching Option 2 of the template but using this repo's real directory names.
No new top-level directories. Two new server-side modules (`allenTransforms.js`, `allenVRules.js`)
house the net-new pure-function operators; everything else is a targeted edit to an existing file.

## Complexity Tracking

*No constitution violations requiring justification. Table intentionally empty.*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |

## Sequencing (binding on tasks.md)

1. **US1 (color casting)** and **US2 (stray forced_block)** — independent of US3/US4/US5, can
   proceed immediately; both reuse existing detectors (`getImmediateThreats`/`detectForcedBlock`).
2. **US3 (multi-solution acceptance audit)** — server fix first (`checkPredicate` +
   `evaluatePredicate` callers, gated on the exhaustive caller sweep closing — see Gating task
   below), validated per-category (I12) including the undercut/unique-answer regression guard
   (FR-013/FR-014), THEN the client fix (`ChallengeScreen.jsx` + in-place `/api/evaluate-move`
   extension per the coupled Q1/Q2 decision), since the client fix's correctness depends on the
   server already emitting the right accepted-answer verdict.
3. **FR-020a KB backfill/reconciliation** — MUST complete (with independent re-verification via
   `optimal_line.mjs`/`playGame`) for V1, V2, V3(re-verify only), V4, V5, and T4 Case B before any
   task in step 5 touching those specific rules begins. This can run in parallel with steps 1–3
   since it only touches `docs/knowledge-base/` files.
4. **US4 (T1–T7 detectors)** — no backfill dependency (R4: already fully KB-verified); can start
   as soon as step 1–2 land conceptually, but has no hard code dependency on them either — may run
   in parallel with step 3.
5. **US5 (V1–V5/T4 operators)** — gated per-rule on step 3's completion for that specific rule
   (FR-021); consumes US4's detectors as an input-simplification step per the spec's data flow.

## Gating task — exhaustive `evaluatePredicate` caller sweep (MUST close before US3 is done)

Run `rg 'evaluatePredicate'` across the full codebase (not just the four call sites listed in
`contracts/internal-function-contracts.md`, which are a starting point, not confirmed-exhaustive) and
classify **every** hit as either (a) branches on `result === 'correct'` only — needs the `'tied'`-
as-correct fix — or (b) does not need it (e.g. already handles `'tied'`, or is in a category-agnostic
context). US3 is not done until this sweep is closed with every caller reconciled; a single missed
caller reintroduces the "false wrong" bug for a legitimately tied answer. This is a hard gate, not a
best-effort pass.

## Risks / fragile areas flagged for the tasks-writing and implementation agents

- **Resolved** (was open): the client-side fix's mechanism is to extend `/api/evaluate-move` in
  place — pass `category`+`movestring` in the request, add an `evaluatePredicate`-gated
  accepted-answer check for the three multi-solution categories only, expose it as an additive
  response field, recompute at solve time with no persistence and no schema change (data-model.md's
  coupled Q1/Q2 resolution). The `/inline` endpoint alternative is rejected — it requires a `puzzle`
  object payload the current call site doesn't send. **Before implementation starts on this task**,
  confirm empirically whether the current `/api/evaluate-move` request body already carries
  `category`+`movestring` or needs the client updated to send them — this is the one remaining
  unknown the decision depends on. Also re-verify the score-tie vs. fork-tie assumption for
  `double_threat` empirically (a concrete board where the max-score column is not the fork column)
  before trusting `scoreMove`'s output as agreeing with `evaluatePredicate`'s for any purpose.
- FR-015a's scope narrowing (excluding `SocraticScreen.jsx`) is a plan-level interpretation of an
  empirical routing trace, ratified by the spec owner and now reflected directly in spec.md (FR-015a,
  Acceptance Scenario 7, and User Story 3's "Why this priority" note all say "Challenge" only, with
  an explicit non-applicability note for Socratic) — no longer an open interpretation gap.
- FR-020a's reconciliation step may find the KB (not memory) is correct for T4 Case B (research.md
  R4 already shows the KB has a `solver_verified` date for it) — the task must still independently
  re-run `optimal_line.mjs` against the KB's movestring rather than accepting the existing
  `solver_verified` stamp at face value, per I12 and per FR-020a's explicit "not copied
  uncritically" wording. T1–T7 need NO backfill at all (already solver_verified in KB) — only
  V1/V2/V4/V5 have real backfill work (`movestring: PENDING`); V3 needs re-verify only.
- The exhaustive `evaluatePredicate` caller sweep (see Gating task above) is approximate/un-audited
  until it actually runs — do not trust the four call sites named in
  `contracts/internal-function-contracts.md` as a complete list.
