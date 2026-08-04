# Implementation Plan: MVP Launch Gate

**Branch**: `057-mvp-launch-gate` | **Date**: 2026-08-03 | **Spec**: `specs/057-mvp-launch-gate/spec.md`
**Input**: Feature specification from `specs/057-mvp-launch-gate/spec.md`, sourced from Epic 10 —
MVP Launch Gate (`docs/epics/pre-launch-mvp-epic.md`)

**Note**: This template is filled in by the `/speckit-plan` command. See
`.specify/templates/plan-template.md` for the execution workflow.

## Summary

Sixteen `OI-N` defects, grouped into 5 independent user stories, are the only gate between the
current tree and the public paid launch of the web app at `decodec4.xyz`. This feature removes
blockers — it adds no new lesson, category, screen, or coach behavior.

**Owner directive (2026-08-03), applies across every story below**: nobody uses staging or
production today, the database can be dropped and regenerated, and there is no live data worth
preserving. This collapses the plan's live-data machinery wherever it appeared: US1's repair work
no longer weighs "preserve attempt history" against safety, and the standing procedure for
staging/production is simply **"deploy current code, then regenerate the database content from
scratch,"** stated once in `docs/deployment_steps.md` rather than choreographed per story (see
§Deploy Prerequisites). The code itself — detectors, guards, tests, grading logic — is unaffected;
only the live-data ceremony around it collapses.

US1 (pool health + stale puzzle-metadata grading) is a re-measurement pass, a script fix
(`verify-undercut-puzzles.mjs`), a single owner-run service-role script that fills any below-floor
category on a target environment — promoting queued candidates where they exist, inserting
locally-generated rows otherwise (the `requireLocalhost`-gated admin endpoints and
`generate_all_candidates.mjs` can't reach staging/production directly; §Deploy Prerequisites item
3) — and a regression test. US2 (response-seam text integrity) widens a regex and resolves whether
`annotationGate.js` (well-tested but production-disconnected) gets wired into the live path. US3
(billing recovery/conversion) adds a mount-time Paddle.js init + `?_ptxn=` auto-open to
`PricingScreen`, and threads a new `'signin'` outcome through the lesson-lock guard chain
(`useLessonLockGuard.js` → `sagaLock.js` → `SagaScreen.jsx`/`UpgradeModal.jsx`, not the three lesson
screens the epic named — see FR-017's corrected file map) so a signed-out visitor sees "Sign in"
instead of "Upgrade". US4 (grading stability) resolves which of two already-diverging
quality-scoring code paths is authoritative and names/guards the never-filter-by-quality invariant.
US5 (release-gate trustworthiness) repoints 5 test files at their real fixture corpus (all 5 of
`test:fast`'s current RED failures share one root cause — a missing `fv_suff/` path segment — so
this plan targets zero failures, not just the two the spec names as the floor), and closes out three
migration/auth OIs by measurement rather than by editing config on a now-superseded rationale.

Re-measurement for this plan (2026-08-03 — `research.md` §Re-measured baseline) found several of
the epic's dated numbers had already drifted, itself evidence for why FR-003/Settled Decision 7
insist on re-measuring at execution time: staging has **all 12 categories** below the N=20 floor
(worse than the epic assumed), 4 categories are below floor on production, and
`061_security_lints.sql` — which the epic claimed was "absent from disk" — is in fact present and
git-committed (`1fbcd4f`). Each user story's tasks must re-measure again immediately before
execution per FR-003's edge case ("every measurement expires").

**D4 is exempted from the pre-`/speckit-tasks` gate** (D1/D3 are not): the trace task that would
answer D4 — where `scoreMove` and `classifyStoredMistake`'s divergence actually lives, given the two
thresholds are mathematically identical — is itself a task inside the D4-gated subtree, so gating
`/speckit-tasks` on D4 is circular. `/speckit-tasks` generates the trace task and FR-021's
invariant-guard task now; only FR-019/FR-020's *implementation* tasks are gated on D4's answer.

## Technical Context

**Language/Version**: Node.js (server, ESM `.mjs`/`.js` mixed — see `server-conventions.md`), React
18 (frontend, `src/`)
**Primary Dependencies**: Express (`server/index.js`), `@supabase/supabase-js` (Postgres access),
`c4solver` (native binary via IPC wrapper), Paddle.js (`@paddle/paddle-js`, client-side only),
`node --test` (test runner, no external framework)
**Storage**: Supabase Postgres (`puzzles`, `candidates`, `blunders`, `explanation_cache`,
`schema_migrations`, `puzzle_attempts` tables — see `docs/architecture/db-schema.md`)
**Testing**: `npm run test:fast` (`connect-four/`) — `eslint . && node --test` across
`server/tests/`, `tests/`, `src/**/*.test.*`; `npm test` additionally runs
`candidate-generator.test.js` (real solver calls, excluded from `test:fast` — do not add new
solver-heavy tests to the fast lane)
**Target Platform**: Railway-hosted Node server + static SPA bundle, Supabase-hosted Postgres;
staging and production are separate Supabase projects/Railway environments
**Project Type**: Web application — `connect-four/server/` (API) + `connect-four/src/` (React SPA),
plus root-level `docs/`, `specs/`, `staging_checks.md` or repo-root ops files
**Performance Goals**: No new latency-sensitive path is introduced by this feature except US2's
regex widening on the existing `<2s` Explanation Engine budget (Constitution V) — regex work is O(text
length), negligible; and US2/D3's possible `annotationGate.js` wiring, which — if chosen — adds an
extra classifier pass to the same hot path and must be measured against the 2s budget as part of
that story's own acceptance, not assumed free
**Constraints**: No agent session writes to staging or production (epic Settled Decision 4); every
live-data repair ships as a reviewed, `--dry-run`-first script the owner runs — per the owner
directive above, these scripts need not be complex in-place-repair machinery, since there is no live
data worth preserving; "regenerate from scratch" beats "surgically repair" wherever it is simpler.
Spanish is explicitly not a launch gate (Settled Decision 1) so no i18n completeness work is in scope
beyond not regressing existing English strings
**Scale/Scope**: 5 user stories, 16 `OI-N` issues, 30 functional requirements (FR-001…FR-030,
FR-031 deleted), touching `server/predicates.js`, `server/reasonRenderGuard.mjs`,
`server/annotationGate.js`, `server/mistakeStorageRule.js`, `server/moveQualityScorer.js`,
`server/index.js`, `server/migrate.js`, `server/migrations/`, 3 frontend screens, `PricingScreen.jsx`,
`useUpgradeCheckout.js`, plus `docs/open_issues.md` (16 closeouts) and `docs/deployment_steps.md`
(new entries — see §Deploy Prerequisites below)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**I. Explanation Engine as Single Source of Truth** — US2 touches the response seam
(`guardExplainMovePayload`/`guardExplainMoveLlmPayload`) that every explanation already passes
through (`server/reasonRenderGuard.mjs:80,99`), and D3's annotation-gate question is specifically
about whether classifier-grounding validation runs live. This story is *tightening* enforcement of
Principle I, not routing around it. PASS.

**II. Code Quality & Simplicity** — **D1 is RESOLVED (2026-08-03) — retire and refill**: stale
`overcut`/`undercut`/`z_threat` rows are marked inactive and the category is refilled to the N=20
floor by `fill-candidate-pools.mjs` (already required by FR-003/FR-004), not by extending
`repair-overcut-highlight-metadata.js` to a second/third role-name shape. This is the simpler
implementation the owner directive favors, and it sidesteps the per-category branch logic an
in-place-repair generalization would have required (the speculative abstraction Constitution II
forbids) — see Complexity Tracking, resolved. Separately, FR-006 requires `evalOvercut`/`evalUndercut`/
`evalZThreat` to cross-check `correct_cols` before rejecting an answer, following the existing
`evalFigure7` pattern — a grading-correctness fix, not a repair-tooling one. US4's "which quality label
wins" (D4) removes a divergence rather than adding a second code path to reconcile it — whichever way
D4 resolves, the losing path is *removed or made to defer to* the winning one, not kept alongside it.
PASS, contingent on D4 resolving toward removing divergence, not toward a permanent reconciliation
layer.

**III. Testing Standards** — FR-006, FR-009, FR-020 all require regression tests against real
fixtures (a real stale-metadata puzzle row, the real OI-126 explanation string, a real boundary-case
move) — no invented fixtures, consistent with this principle and with `CLAUDE.md`'s "harvest
fixtures, never invent them." US5's fixture-path fix is itself a Testing Standards repair: the
current 5 RED tests violate "Test data MUST be deterministic and checked into the repo" only in the
sense that the *path to* that checked-in data is wrong, not the data itself. PASS.

**IV. UX Consistency & Progressive Disclosure** — US3's Sign-in vs Upgrade copy branch must reuse
existing i18n keys/copy patterns, not invent new terminology inconsistent with existing upgrade CTAs
elsewhere in the app (`PricingScreen.jsx`, other locked-content cards). Task-level check required.
PASS, contingent on that reuse. **Literal tension flagged and resolved, not silently dropped**:
Constitution IV (line 91) requires locked paid-tier content to "always render a preview card with a
clear upgrade prompt," while FR-017 routes a *signed-out* visitor to a sign-in prompt (`AuthModal.jsx`)
instead of an upgrade prompt. This is the correct product call — a signed-out visitor's blocker is
authentication, not tier, and OI-95 asks for exactly this distinction — but it is a literal conflict
with a MUST as worded. Recorded here so a later reviewer does not rediscover it as a defect; the
signed-in free-tier case still gets the upgrade-prompt preview card unchanged.

**V. Performance Requirements** — see Technical Context note above on D3. If D3 resolves toward
wiring `annotationGate.js` into the live path, that story's own acceptance MUST include measuring the
added latency against the Explanation Engine's <2s budget before considering it done — this is not
optional or assumed-safe. Flagged as a gate to verify at D3-resolution time, not deferred silently.

**VI. Implementation & Debugging Methodology** — "Reproduce before theorizing" is already satisfied
for this plan: the `test:fast` baseline was re-run this session (not assumed from the epic), staging
and production pool counts were queried live and read-only this session (not assumed from local),
and the migration ledger was queried live on both environments (not assumed from the epic's dated
claim, which turned out to be wrong). "Map data dependencies before writing" applies directly to
US1's overcut/undercut/z_threat audit (three different `highlightMetadata` shapes — `.column` vs
`.cells` — see `research.md`) and to US4's five-call-site invariant guard. PASS.

**VII. Software Design Philosophy** — "In the face of ambiguity, refuse the temptation to guess"
governs how D1/D3/D4 are handled in this plan: each is recorded as an explicit open decision in
`research.md` with a recommended default and its rationale, not silently resolved. PASS.

**VIII. Documentation as First-Class Deliverable** — checked below.

- [x] Existing architecture docs (`docs/architecture/`, `data-model.md`, `contracts/`, prior
  `plan.md` files, constitution) were read before this plan was drafted — `api-conventions.md`,
  `server-conventions.md`, `data-model.md`, `db-schema.md`, `testing-conventions.md` TOCs and
  most-relevant sections were reviewed (see `research.md` §Architecture doc citations); the epic
  itself, the spec, the handoff, `deployment_steps.md`, and `pool-thresholds.md` were read in full.
- [x] One undocumented-convention gap was found during review and is recorded here rather than
  left implicit: `docs/architecture/server-conventions.md:1501` already **corrects** OI-31's
  "6543 is forbidden" framing ("not the supported configuration... treat as configuration drift to
  fix on its own schedule, not as a broken deploy") but `docs/open_issues.md`'s OI-31 entry has not
  been updated to reflect that correction. This plan's US5/OI-31 task closes that gap as part of
  FR-025, not as a separate undocumented finding left to rot.
- [ ] `tasks.md` (generated by `/speckit-tasks`, not this plan) MUST include explicit documentation
  tasks for every architectural decision this feature introduces or resolves: D1's now-resolved
  retire-and-refill disposition → a note in `db-schema.md`'s `puzzles`/`candidates` sections naming it
  as the policy for future detector changes; D3's outcome → `server-conventions.md`'s existing
  Annotation Gate section (`server-conventions.md:1166-1209`), with a skip-and-record fallback if D3 is
  still unresolved at close; D4's outcome → `db-schema.md`'s `blunders` section documenting which of
  `scoreMove`/`classifyStoredMistake` is authoritative and why the other still exists, with the same
  skip-and-record fallback if D4 is still unresolved at close.

## Project Structure

### Documentation (this feature)

```text
specs/057-mvp-launch-gate/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command) — README only, no new endpoints
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

This is an existing web application (Node/Express API + React SPA), not a new project. Everything
below `connect-four/` except where noted; `docs/`, `specs/`, `staging_checks.md`,
`visualize_board.sh`, `worktree-ports.sh` live at the repo root (per `CLAUDE.md`).

```text
connect-four/
├── server/
│   ├── predicates.js                          # US1 — evalOvercut/evalUndercut/evalZThreat: FR-006 makes each
│   │                                           #        cross-check correct_cols before rejecting, following
│   │                                           #        evalFigure7's pattern (D1's audit target, separately)
│   ├── scripts/
│   │   ├── repair-overcut-highlight-metadata.js  # US1 — existing overcut repair pattern; D1 (RESOLVED —
│   │   │                                           #        retire and refill) does NOT extend this to
│   │   │                                           #        undercut/z_threat, see fill-candidate-pools.mjs below
│   │   ├── generate_all_candidates.mjs           # US1 FR-003/FR-004 — LOCAL generation only (c4solver binary
│   │   │                                           #        isn't on Railway); exports rows for the script below
│   │   ├── <new> fill-candidate-pools.mjs        # US1 FR-003/FR-004 — NEW, owner-run, service-role client, same
│   │   │                                           #        safety shape as repair-overcut-highlight-metadata.js
│   │   │                                           #        (`--dry-run` default, required `--env`, project-ref guard,
│   │   │                                           #        typed confirmation twice for production); per
│   │   │                                           #        (category, env) promotes queued candidates or inserts
│   │   │                                           #        locally-generated rows, overwriting a pool wholesale where
│   │   │                                           #        simpler. The ONLY way to reach staging/production — the
│   │   │                                           #        approve/approve-batch endpoints below are `requireLocalhost`
│   │   └── audit_answer_ambiguity.mjs            # US1 — referenced by pool-thresholds.md, repair-only (not seed)
│   ├── index.js                                # US1 (admin approve/approve-batch ~3374/3430 — `requireLocalhost`,
│   │                                           #        local only; explanation_cache read/write ~1205-1447/4028-4126),
│   │                                           #        US4 (reconstructAnalysisFromBlunders ~2223/2378, quality call
│   │                                           #        sites ~2249/2498-2499)
│   ├── reasonRenderGuard.mjs                   # US2 — CXRY_RE (:25), stripInternalTokens (:41), guard* (:80,:99)
│   ├── annotationGate.js                       # US2/D3 — validateAnnotation (:486) + checkP1..checkP6
│   ├── moveQualityScorer.js                    # US4/D4 — scoreMove (:9)
│   ├── mistakeStorageRule.js                   # US4/D4 — classifyStoredMistake (:81)
│   ├── evaluateMoveHandler.js                  # US4 — quality call site (:109, suppressCreationPraise)
│   ├── gameSampling.js                         # US4 — quality call site (:170)
│   ├── insertGameBlunder.js                    # US4 — quality call site (:28)
│   ├── papergamesImporter.js                   # US4 — quality call site (:116)
│   ├── blunderCountsForGames.js                # US4 — OI-125's named Area, read before assuming grep found all 5 sites
│   ├── adminAuth.js                            # US1 context (requireLocalhost gate for admin approve endpoints)
│   ├── migrate.js                              # US5 — filename-based ledger logic (:22,:28-29,:79-93)
│   ├── migrations/
│   │   ├── 061_correct_cols.sql                # US5 — on disk, NOT applied to staging/production (re-measured)
│   │   ├── 061_security_lints.sql              # US5 — on disk (contra epic's stale claim), applied on both
│   │   ├── 062_candidates_generation_run_unique.sql  # US5 — on disk, NOT applied to staging/production
│   │   ├── 063_puzzle_attempts_outcome_narrow.sql    # US5 — on disk, NOT applied to staging/production
│   │   └── 064_drop_correct_col.sql            # US5 — on disk, spec-056's own ordering constraint applies
│   │                                           #        (already documented, see deployment_steps.md)
│   └── tests/
│       ├── branchInvariance.test.mjs           # US5 FR-022/023 — stale CORPUS path (:12)
│       ├── causalLinksComposers.test.mjs       # US5 FR-022/023 — stale CORPUS path (:11)
│       ├── reasonRenderFixes.test.mjs          # US5 FR-022/023 — stale CORPUS path (:10)
│       ├── renderCoverageCorpus.test.mjs       # US5 FR-023 — stale CORPUS path (:10), the spec's "test #1"
│       ├── renderCoverageUniverse.test.mjs     # US5 FR-023 — stale EVIDENCE_FILE path (:14), the spec's "test #2"
│       └── <new> reasonRenderGuard.test.mjs additions or existing test file  # US2 FR-008/FR-009 regression
├── scripts/
│   ├── verify-undercut-puzzles.mjs             # US1 FR-002 — .eq('approved', true) bug (:32), fix to is_active
│   └── probe-refresh-rotation.mjs              # US5 FR-024 — owner-run, already exists
├── src/
│   ├── lib/
│   │   ├── useUpgradeCheckout.js               # US3 FR-013 — getPaddle() lazy-only (:32,:119,:160)
│   │   └── useLessonLockGuard.js               # US3 FR-017 — real entry point: fetches lessons/progress/tier,
│   │                                           #        calls deriveLessonAccess(), redirects to 'saga' (:28,:68)
│   ├── screens/
│   │   ├── PricingScreen.jsx                   # US3 FR-013 — mount useEffect exists (:36-48) but doesn't call
│   │   │                                       #        getPaddle(); needs mount-time init + ?_ptxn= read
│   │   ├── sagaLock.js                         # US3 FR-017 — 3 chained functions must each thread a new 'signin'
│   │   │                                       #        outcome: deriveLockReason (:12) → dispatchLockAction (:31)
│   │   │                                       #        → deriveLessonAccess (:47) — not just deriveLessonAccess alone
│   │   └── SagaScreen.jsx                      # US3 FR-017 — renders UpgradeModal on lockAction:'upgrade' (:304);
│   │                                           #        needs a signed-out branch to AuthModal instead
│   └── components/
│       ├── UpgradeModal.jsx                    # US3 FR-017 — does NOT need to distinguish "sign in" vs "upgrade"
│       │                                       #        copy/CTA itself; SagaScreen.jsx routes the signed-out
│       │                                       #        case to AuthModal.jsx instead (FR-017 is authoritative)
│       └── AuthModal.jsx                       # US3 FR-017 — EXISTING (HomeScreen.jsx:156 precedent), reused for
│                                               #        the sign-in branch — no new component
│   # NOTE: NOT ConceptScreen.jsx/SocraticScreen.jsx/CLChallengeScreen.jsx (the epic's original FR-017 file
│   # map) — useLessonLockGuard redirects away from all three before any of them render locked-lesson copy.
└── server/scripts/fv_suff/
    ├── reason_evidence_boards_coverage_2026-07-02T11-37-56Z.jsonl  # US5 — real corpus, re-measured location
    └── reason_evidence_boards_coverage_2026-07-03T17-14-51Z.jsonl  # US5 — real corpus, re-measured location

docs/
├── open_issues.md                              # ALL 16 in-scope OI-N closeouts (FR-027) — every story writes here
├── deployment_steps.md                         # New entries required — see §Deploy Prerequisites below
├── deploy-runbook.md                           # Only if OI-31/OI-105 change the STANDING procedure (FR-029)
└── architecture/
    ├── server-conventions.md                   # D3 outcome documented in existing Annotation Gate section (:1166-1209)
    ├── db-schema.md                            # D1's resolved retire-and-refill policy + D4's authoritative-label
    │                                            #        decision (or skip-and-record if D4 still open) documented here
    └── data-model.md                           # Only if D1/D4 introduce a new stored-field meaning

staging_checks.md                                # repo root — US3 (OI-98 owner half), US5 (OI-5 probe run) sign-offs
```

**Structure Decision**: No new top-level directory or service. This feature is entirely within the
existing `connect-four/server/` + `connect-four/src/` split (API + SPA), touching existing files
only, plus the standing `docs/` ops paperwork (`open_issues.md`, `deployment_steps.md`). No new
package, no new deploy target, no new migration *tooling* (existing `migrate.js` runs the backlog
that already exists on disk).

## Deploy Prerequisites — walked explicitly against the standing checklist

*(Per this plan's directive: decide explicitly, including "none" only if genuinely checked. All six
categories from `docs/deployment_steps.md`'s Standing Checklist are walked below — now mostly
documentation of what the owner does, per the owner directive, not agent-built safety tooling.
Standing procedure for all live-data items below: **deploy current code, then regenerate database
content from scratch** — this supersedes the per-spec live-repair entries queued for specs
052/054/056 as far as *data* is concerned; the code deploys behind them still have to happen.
FR-016's owner action — pointing Paddle's dashboard default-payment-link at `/pricing` — is the
**same** action already queued in the Spec 053 entry ("Paddle dashboard config" §); amend that
entry rather than add a second one about the same setting.)*

1. **Schema migration** — **NO new file added by this feature.** `061_correct_cols.sql`, `062`,
   `063`, `064` already exist on disk (pre-existing, from specs 054/056) and are simply unapplied to
   staging/production — US5/FR-025/FR-026 is a *measurement and application* task against
   already-authored migrations, not new schema authorship. **Action**: `docs/deployment_steps.md`
   needs a new entry (or an extension of the existing Spec 054/056 entries) recording that this
   backlog is being cleared as part of this feature's close, cross-referencing the already-documented
   `064_drop_correct_col.sql` ordering constraint (code-before-migration, pre-flight `at_risk` check)
   verbatim rather than restating it. Applying this backlog is itself part of the "deploy, then
   regenerate" procedure above, not a separate reconciliation project.
2. **Data migration / backfill — collapsed by the owner directive, and D1 is now RESOLVED (2026-08-03,
   retire and refill).** Stale `overcut`/`undercut`/`z_threat` rows are marked `is_active=false` and the
   category is refilled to the N=20 floor by `fill-candidate-pools.mjs` (the same script FR-003/FR-004
   already require) — no second repair script, no extension of
   `repair-overcut-highlight-metadata.js` to `undercut`/`z_threat`. **Action**: one collapsed
   `docs/deployment_steps.md` entry, following the existing "Spec 052 — overcut pool repair" template,
   pointing at `fill-candidate-pools.mjs --apply` as the retire-and-refill mechanism; no multi-phase
   rollout.
3. **Content pools — YES, and a named launch gate (Decision D-b).** FR-003/FR-004's per-environment
   fill pass is itself a content-pool change; the owner's `fill-candidate-pools.mjs --apply` run against
   staging and production is on the launch-readiness closeout's explicit pending-items list, and
   `staging_checks.md` records the post-fill per-category active-puzzle counts for both environments —
   shipping the mechanism alone does not satisfy SC-001.
   Per-environment counts (staging: all 12 below floor, zero promotable candidates anywhere;
   production: 4 below floor, 3 of those 4 have no promotable candidates either) are recorded as this
   feature's own dated measurement in `research.md`, not left to go stale like the epic's did.
   **Action**: the new owner-run `fill-candidate-pools.mjs` script (Source Code map above) is the
   mechanism — it is the only way to reach staging/production at all, since the admin
   approve/approve-batch endpoints and `generate_all_candidates.mjs` are `requireLocalhost`-gated and
   solver-bound respectively. Per the owner directive, this script overwrites/replaces a category's
   pool wholesale where that is simpler than merging with existing rows — it does not need to preserve
   or merge with what's already there. `docs/deployment_steps.md` gets one entry naming the exact
   remedy per category per environment (generate vs promote) and pointing at the script.
4. **Secrets / env vars — NO new one identified by current research.** US3's Paddle mount-time init
   reads the same `VITE_PADDLE_CLIENT_TOKEN` that already exists (unset locally, present on
   staging/production per OI-96) — no new key. Flagged as a `research.md` open item to re-confirm once
   US3's actual diff exists (a `NEEDS CLARIFICATION` in Technical Context is not appropriate here
   since the epic's Non-obvious facts already establish this; task-level re-verification is
   sufficient).
5. **Caches — YES.** US2's `stripInternalTokens` regex widening changes what
   `guardExplainMovePayload`/`guardExplainMoveLlmPayload` produce for text already sitting in
   `explanation_cache` (FR-012 states this explicitly). **Action**: `deployment_steps.md` needs a new
   entry stating the truncation requirement, following the existing entries' template, with its own
   `Applies to` / `When` fields (after the US2 code deploy, per the same ordering logic as Spec 052's
   overcut entry — repaired text must not be masked by stale cache rows written under the old regex).
   `TRUNCATE explanation_cache` is itself a "regenerate from scratch" action, consistent with the
   owner directive — no attempt to selectively repair cached rows.
6. **Ordering — YES, multiple constraints identified**:
   - US1's pool-fill script runs **after** its corresponding code deploy (same logic as the existing
     Spec 052 entry — re-deriving against the *current* detector requires the current detector to be
     live).
   - US5's migration backlog: `064_drop_correct_col.sql` MUST run after its code deploy per the
     existing Spec 056 entry (already documented, do not re-litigate); `061_correct_cols.sql`/`062`/`063`
     have their own ordering per the existing Spec 054 entry (063 before code deploy — narrows a CHECK
     constraint the new code's `outcome: 'incorrect'` value depends on). This plan's US5 tasks must
     apply the *existing* documented ordering, not invent a new one.
   - US2's cache truncation runs **after** the regex-fix code deploy (see #5).
   - Server + frontend must ship together for US3 (mount-time Paddle init changes client behavior
     that the server's CSP already accommodates per OI-96/OI-97 — no server-side CSP change
     identified, but re-verify per FR-014 against a real production build, owner-run).

**Conclusion**: real deploy prerequisites in 4 of 6 checklist categories (data migration, content
pools, caches, ordering) plus one already-authored-but-unapplied schema-migration backlog.
`docs/deployment_steps.md` MUST receive new or extended entries as each story lands — not deferred to
a final cleanup pass (epic Settled Decision 6). Per the owner directive, most entries are now short
("deploy, then regenerate/promote via the owner script"), not multi-step repair runbooks.

## Complexity Tracking

> Fill ONLY if Constitution Check has violations that must be justified

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| ~~D1 may require a second repair script (undercut/z_threat) sibling to the existing overcut one~~ — **RESOLVED, not a violation**: D1 closed toward retire-and-refill (2026-08-03), which reuses `fill-candidate-pools.mjs` uniformly across all three categories instead of writing per-category repair branch logic | — | The complexity this row originally flagged (branch logic per category's differing `highlight_metadata` shape) never gets built — retire-and-refill sidesteps it entirely by not repairing in place at all. Kept here, struck through, as the record of why no second script exists. |
| D3 may add a second annotation-validation pass to the live explanation hot path (Constitution V risk) | OI-124/OI-126/OI-129 share a root cause: nothing gates the live path today, so regex patches only close individually-discovered holes | Regex-only (the simpler alternative) is explicitly on the table as D3's other branch and remains the default unless the owner's resolution and a measured latency check both clear it — this is not resolved unilaterally by this plan |
| US1 may require a second repair script (undercut/z_threat) sibling to the existing overcut one, rather than generalizing `repair-overcut-highlight-metadata.js` | The three categories' `highlight_metadata` shapes differ (`evalZThreat` reads `.column`; `evalUndercut`/`evalOvercut` read `.cells` with different `role` values) and `evalUndercut` additionally consults live solver `scores` — a single generalized script would need branch logic per category, which the existing script's author avoided | A shared script was considered (DRY) but rejected in this plan's default recommendation because the existing script's overcut-specific role name (`major_threat`) and predicate import are load-bearing, not incidental — generalizing prematurely risks the exact "speculative abstraction" Constitution II forbids; D1's resolution should confirm this at implementation time against the *actual* undercut/z_threat drift counts, not against the overcut precedent alone |
