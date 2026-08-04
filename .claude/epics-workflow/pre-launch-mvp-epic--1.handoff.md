**Plan and all sibling artifacts are fixed and current. This handoff supersedes all earlier ones.**

## OWNER DIRECTIVE — binding across every story
Nobody uses staging or production; both databases are **disposable** and can be dropped and regenerated. This is now written into the project `CLAUDE.md` §"Staging and production databases are disposable (pre-launch)" — read it. Consequences: prefer regenerate-from-scratch over surgical repair; production work is **documentation** in `docs/deployment_steps.md`, not safety tooling; a pending deploy backlog is not an ordering puzzle ("deploy current code, then regenerate the content"); do not inflate a defect's severity on the premise that a real user is hitting it. Code correctness is NOT weakened — only the live-data choreography collapses. The rule expires at launch.

## Owner decisions already settled (do NOT re-open)
- **Empty puzzle pools are routine work**, never a blocker or a design fork: promote queued candidates, generate fresh otherwise, approve through admin tooling until every category clears N=20. Nothing is hidden, exempted, or deferred. FR-031 was deleted; do not revive it.
- OI-5, OI-31, OI-41 are owned by Epic 10, not by Epics 3/4.
- OI-95 = a client-side branch. But the mechanism was WRONG in the epic and is now corrected — see FR-017 below.
- Paddle default payment link → **`/pricing`** (existing PricingScreen) with mount-time Paddle.js init + `_ptxn` read. No new screen. Its dashboard action **folds into the existing PENDING Spec 053 `deployment_steps.md` entry** rather than adding a second entry about one setting.
- Stale-metadata audit covers **all three** metadata-graded categories (`overcut`, `undercut`, `z_threat`).
- **D4 is EXEMPT from the pre-tasks gate**: generate the OI-104 trace task and FR-021 NOW; gate only FR-019/FR-020 implementation on D4. **D1 and D3 remain open** `/clarify` targets — D1 is flagged as "likely collapses to simplest-implementation" under the owner directive but was deliberately NOT closed.

## The single new script this feature adds
`connect-four/server/scripts/fill-candidate-pools.mjs` — **does not exist yet; `/speckit-tasks` must generate a task to author it.** It is the only way FR-003/FR-004 can reach staging/production, because the admin approve endpoints are `requireLocalhost`-gated and `generate_all_candidates.mjs` needs the solver binary (absent on Railway). Required shape, mirroring the existing `repair-overcut-highlight-metadata.js`: Supabase service-role client, `--dry-run` as the DEFAULT posture, a required `--env` flag with no default, a guard that the env file's project ref matches the named environment, a typed confirmation before any write (twice for production), a real `--help` that exits 0 before required-arg validation, and a distinct exit code for "drift found".

## FR-017 — the epic's file map was WRONG; use this one
The three lesson screens (`ConceptScreen.jsx`, `SocraticScreen.jsx`, `CLChallengeScreen.jsx`) **never render locked-lesson copy** — `useLessonLockGuard.js` redirects to `'saga'` before they mount. Verified at source. The real chain is `useLessonLockGuard.js` → `sagaLock.js` → `SagaScreen.jsx` / `UpgradeModal.jsx` / `AuthModal.jsx` (AuthModal already exists, so no new component).
- `sagaLock.js` carries **three** chained functions with distinct return sets: `deriveLockReason` (`'none'|'tier'|'order'|'both'`), `dispatchLockAction` (`'upgrade'|'orderLock'|'navigate'`), `deriveLessonAccess` (`'allowed'|'upgrade'|'orderLock'`). A new `'signin'` value threads through **all three**.
- The `authenticated` signal from `getEntitlement()` (`src/lib/entitlement.js`) is **not currently threaded into `sagaLock.js`'s `tier` parameter** — that wiring is genuinely new work, not a copy change.
- **Scrutinize**: how `'signin'` interacts with the existing `'both'` (tier + order locked) case is not obviously a simple substitution, and was not implemented or tested.

## Re-measured this session — these CONTRADICT the epic, trust these
- **All 5 `test:fast` failures share ONE root cause**: a missing `fv_suff/` directory segment in 5 separate string literals. Fixing all 5 clears the suite to **zero** — the spec's "only 2 tests" floor understates what's reachable. Real corpus path: `connect-four/server/scripts/fv_suff/reason_evidence_boards_coverage_<ts>.jsonl` (prefix intact; the epic's "drop the prefix" claim is wrong).
- **OI-105's premise is false today**: `061_security_lints.sql` IS on disk, git-committed (`1fbcd4f`). The real gap is a 4-migration backlog (`061_correct_cols`, `062`, `063`, `064`) never applied to staging/production — which the owner directive turns into part of "deploy, then regenerate", not a reconciliation project.
- **OI-31 is already mostly resolved in the docs**: `docs/architecture/server-conventions.md:1501` walked back the "6543 forbidden" framing on 2026-08-02; `docs/open_issues.md`'s OI-31 entry hasn't caught up. FR-025 is a doc-sync task.
- **Pools as measured**: staging has all 12 categories below floor with zero pending candidates anywhere (pure generation); production has 4 below floor (`claimeven`, `figure_7`, `overcut`, `odd_even_threat`=0); local `forbidden_columns` self-healed 0→30 since the epic triage.
- **OI-125's "5 call sites" is UNCONFIRMED**: 8 in-code `quality` references found by grep, none as a literal `.eq('quality'` DB filter, and `server/blunderCountsForGames.js` — named in OI-125's own "Area" field — was never grepped. Make this an explicit first task, not a settled number.

## State of the artifacts
- `specs/057-mvp-launch-gate/` holds `spec.md`, `plan.md`, `research.md`, `data-model.md`, `quickstart.md`, `contracts/README.md`, `checklists/requirements.md`. All untracked in git — `git diff` will not show them.
- FR sequence ends at **FR-030**. FR-031 was deleted and NOT renumbered.
- `docs/deployment_steps.md` is on the plan's **Source Code map** (so `/speckit-tasks` will task it) but was **NOT itself edited** — do not assume it already reflects these plans.
- `docs/open_issues.md` has NOT been touched by any pipeline stage. All 16 closeouts are still to do.
- Only OI-31/OI-41/OI-105 got a close read of their `docs/open_issues.md` text this session; the other 13 are spot-checks. Verify directly rather than trusting a summary.

---

## Tasks generated: `specs/057-mvp-launch-gate/tasks.md` — 53 tasks (T001–T053)
Phases are in the epic's **execution** order (US1→US5→US2→US4→US3 = spec priorities P1→P5), NOT US1..US5 numeric order. This is intentional.

- **16 OI closeouts** land as the last task of each story's phase: T015 (OI-92/86/83/130), T022 (OI-82/31/105 fully-fixed + OI-5 deferred), T029 (OI-126/124/129), T037 (OI-104/125), T048 (OI-98/95/41).
- **`fill-candidate-pools.mjs` = T009**, with the full required shape (service-role client, `--dry-run` default, required `--env`, project-ref guard reusing the existing `STAGING_REF`/`PRODUCTION_REF` constants, typed confirmation twice for production, real `--help` before arg validation, distinct drift exit code).
- **Gated tasks are LISTED, not omitted**: T008 `[GATED:D1]` (the repair/retire write), T027 `[GATED:D3]` (annotation-gate live wiring, default skip), T034 `[GATED:D4]` (scoreMove/classifyStoredMistake reconciliation). Everything around them is ungated and should be worked immediately — T032 (OI-104 trace) and T035 (FR-021 invariant guard) in particular.
- **The recommended defaults baked into gated task text are NOT decisions** — D1's in-place repair, D3's regex-only floor, D4's stored-rule-authoritative are `research.md` recommendations only, stated as such in the task text.
- **T031 establishes OI-125's real call-site set** (grep + check `blunderCountsForGames.js`); it is sequenced before T035 precisely so nobody implements against the stale "five sites" number in `data-model.md`.
- **Deploy prerequisites**: T013/T014, T020, T030, T046 plus a cross-story sweep T049 — all local-only doc edits. T046 **amends the existing PENDING Spec 053 entry** rather than adding a second one about the Paddle dashboard setting.
- **No task writes to staging or production.** Every live measurement task (T005 pool counts, T007 audit, T018 migration ledger, T026 explanation_cache sample) is read-only.

### Known soft spots in tasks.md
- **T041→T044 (US3 sagaLock) ordering is a judgment call**, not verified against the current file beyond the cited `sagaLock.js:12/:30/:44` and `SagaScreen.jsx:305`. The `'signin'` vs existing `'both'` (tier+order locked) interaction is surfaced in T039/T042 but deliberately not prescribed.
- **T044 is intentionally vague.** `plan.md` says `UpgradeModal.jsx` "needs to distinguish sign-in vs upgrade copy" while FR-017 says the distinction happens by routing to `AuthModal.jsx` instead. Mild contradiction; resolved by making T043 (routing) primary and T044 a verification/cleanup task. Worth settling.
- `/speckit-analyze` and `/speckit-checklist` were NOT run after generation.
