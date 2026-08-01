## Handoff context (accumulated through the `epic_fix` stage)

### From the epic_fix agent (most recent)
- Applied all five critique resolutions exactly: the five verified tier-read sites, the routing-structure facts, the "shared server module + thin wrapper endpoint" architecture, the `/pricing` takeover + `/pricing-legal` retask, and the redacted-stub lesson response (added as new Settled decision 7).
- **Deferred / untouched on purpose:** the Overview triage table (still says "Full speckit" — deliberately stale, do NOT reconcile it); US3.5; the OI-34/`verifyTransaction` re-map. All three are internally consistent.
- Did NOT independently re-verify the five tier-read-site citations or the routing-file claims at source — they were trusted as reviewer-verified within the hour.
- **Fragile:** Settled decision 6 uses inline strikethrough to preserve why the epic used to say something different; if the file has a convention against history-in-place, move it to a changelog. Task-count hints (8/9/5/10/6) are now slightly stale because US3.1 dropped its "decide response shape" task — counts are explicitly non-binding and `/speckit-tasks` regenerates them.
- **Watch for naming drift:** `/pricing-legal` is carried through Settled decision 6, US3.4, Acceptance criteria, and NOT included. A future edit must not reintroduce a variant (e.g. `/legal/pricing`) in only one place.
- The five verified tier-read sites and the two verified NON-readers are stated with their exact code expressions in `Non-obvious facts` specifically so a plan agent can grep-verify without re-deriving from OI-39.

### From the reviewer (epic_critique)
- **Systemic:** the epic's factual bullets were largely inherited from `docs/open_issues.md` rather than measured against the working tree; OI-39 in particular is stale (it predates `SagaScreen`/`DeepRevealPane`/`useLessonLockGuard` in their current form). Re-measure, never re-quote. Second pattern: the epic names *helper* modules to reuse but never the *structural* files a change must touch (routing table, screen registry, Express route ordering).
- **Trustworthy source:** `docs/architecture/server-conventions.md` §PaymentProcessor Seam / §Identity binding / §Activation were read directly and are accurate. `docs/open_issues.md` is *history*, not a source of truth about current code.
- Verified at source and holding: `getSubscriptionStatus`'s body is a pure synchronous `tier === 'paid'` ternary with no I/O; `usePaddlePrices.js` exports `usePaddlePrices`/`formatPrice`/`computeAnnualSavings`; `/api/paddle/*` all 503 when `PADDLE_API_KEY` is unset, including the public `GET /api/paddle/config`.
- `app.use(loadUser)` is global and registered before the lesson routes, so `req.user.tier` is already available on `GET /api/lessons/:id` — no auth wiring needed for US3.1. `getLessons()` already projects to `{ id, title, order, free }`, so only `getLesson(id)` leaks slides.
- CSP is invisible under `npm run dev` (Vite enforces none); only the Express-served `dist/` build enforces it. Paddle CSP took five rounds of discovery.

### Owner decisions (2026-07-31) — ratifications, not new work
1. Entitlement is a **shared server module**; `GET /api/user/entitlement` is a thin wrapper; `GET /api/lessons/:id` calls the module directly. The spec must define the fail-open/fail-closed policy, the client cache TTL, and every invalidation trigger.
2. The first-payment identity window is **accepted, not closed** — Settled decision #4 means **no code change** to the identity binding. US3.3 is a documentation story plus the OI-34 re-map.
3. **Paddle has already approved this domain.** Approval is per-domain, not per-page, so a content change at `/pricing` needs no re-submission. React takes `/pricing`; `pricing.html` moves to `/pricing-legal` and is retained (never deleted) as a server-rendered copy of the Merchant-of-Record clause, refund statement, and `/terms` link. US3.4's domain-review task is a confirmatory note, NOT a blocking gate.
4. Unentitled `GET /api/lessons/:id` returns `200 { id, title, order, free, locked: true }` with no `slides`.
- Still blocking regardless: CSP re-verified against the Express-served `dist/` build (never `npm run dev`), and a defined degraded state for the pricing page when `GET /api/paddle/config` 503s.

### From the spec_create agent (spec dir: specs/053-entitlement-payments-consolidation)
- Kept the spec body outcome-focused per the speckit template (no tech stack / file names / endpoint names), even though the epic's Settled decisions are highly implementation-specific. The reasoning: that detail is preserved verbatim in the epic doc for `/speckit-plan` to consume. FRs describe the behavioral contract instead — e.g. FR-007/008/009/010 together reconstruct "single server module, thin wrapper endpoint, no HTTP hop, fail-closed" without naming the module.
- FR mapping: FR-001–006 lesson gate contract (FR-002 spells out the `{id, title, order, free, locked:true}` shape in prose); FR-007–014 single entitlement module + fail-closed + cache TTL + invalidation + 5-site migration + `getSubscriptionStatus` supersession; FR-015–018 identity ratification (doc-only) + OI-34 re-map; FR-019–025 pricing page + `/pricing` takeover + `/pricing-legal` retention + degraded state + de-hardcoding; FR-026–029 checkout return continuity + OI-59 non-regression.
- Story priorities: US1 P1, US2 P1, US3 P3, US4 P2, US5 P3. Zero `[NEEDS CLARIFICATION]` markers.
- FR-016 forbids touching identity-binding code, repeated twice on purpose — the epic's most fragile hard constraint (an agent could easily "fix" OI-55 further).
- **Deferred:** OI-N codes are NOT referenced in the spec body, so the plan/tasks stage must re-consult the Issue closeout convention in the epics file's top matter — it is not spec-scoped. `specs/index.md` was NOT updated.
- **Fragile:** FR-013 names the five call sites by screen/component role, not exact filename — re-derive exact paths from the epic's Non-obvious facts (verified this session), do not re-grep. The Assumptions section states the domain is already cleared and this epic does not wait on a provider review — must not be walked back into a blocking gate at plan time. SC-004 ("no remaining hand-typed figures") should become an explicit grep-for-price-literals verification step.

### From the spec_fix agent (spec now at FR-001…FR-032)
- **Renumbered FR-002 through FR-032.** Only one external FR reference existed outside the Requirements section (Assumptions → FR-018, now FR-019); it was updated. All internal FR-to-FR references re-checked and consistent. Nothing enforces the numbering — re-grep for `FR-0` before inserting or removing an FR.
- Applied: literal locked-lesson contract in FR-002 + the "Lesson (locked view)" Key Entity (HTTP 200, `{ id, title, order, free, locked: true }`, `slides` absent — not null, not empty array); new FR-013 client fail-open-to-last-known-good (explicitly the deliberate opposite of FR-010's server fail-closed, with FR-014 referencing it); FR-020/FR-026 broadened to quota figures but scoped to `/pricing` only; new FR-027 CSP verified against the Express-served `dist/` build + SC-008 + US4 acceptance scenario 6; new FR-028 backlog closeout; a new **Out of Scope** section transcribing the epic's five `NOT included` items; SC-004 and US4 scenario 5 rescoped to `/pricing`.
- The accepted `/pricing-legal` drift risk lives in the spec's **Assumptions** section (alongside the identity-window bullet), not a separate Deferred subsection — accepted risks are kept in one place.
- FR-028 does not name OI-N codes inline but names all six issues descriptively, and explicitly states an issue need only be accurately updated, NOT closed — so it does not contradict OI-41 staying open.
- `docs/epics/open-issues-epics.md` §Epic 3 Acceptance criteria was amended in the same pass so the epic and spec agree on the `/pricing`-only scope with the `/pricing-legal` exemption.
- **NEW fragile area, not in the original critique:** FR-020 requires quota figures on `/pricing` to be live-sourced, and the quota source is `FREE_DEEP_REVEAL_WEEKLY_LIMIT` in `connect-four/server/quotaLimits.js` — but **there is currently no live endpoint exposing it** (only the Paddle price config endpoint exists). Exposing that server constant to the client is NEW plumbing that no artifact previously called out. The plan must account for it.
- Did NOT re-verify any code-level claims at source in this pass — trusted the reviewer's verifications; this was spec-editing only.

### Owner decision added at the spec_critique stage (2026-08-01)
- **The retained legal page keeps its hardcoded price and quota literals.** `connect-four/server/pricing.html` stays byte-stable, static, server-rendered and JavaScript-free — the owner chose not to edit a page the payment provider has already reviewed. De-hardcoding scopes to `/pricing` ONLY.
- Consequence: **OI-41 must NOT be marked resolved.** Under the epic's Issue closeout convention it stays open with a dated update naming exactly what remains — the price and quota literals on the retained legal page.
- **Client-side entitlement lookup fails OPEN to the last known good answer**; falls back to free/locked only when no answer was ever obtained. This REVERSES today's `.catch(() => 'free')` in `src/lib/useLessonLockGuard.js`. The server-side rule (FR-010) stays fail-CLOSED — the asymmetry is deliberate.

### From the plan_create agent (plan at specs/053-entitlement-payments-consolidation/)
Artifacts: `plan.md`, `research.md` (10 grounded decisions, each citing source lines verified this session), `data-model.md` (6 entities), `contracts/entitlement.md`, `contracts/lessons.md`, `contracts/limits.md`, `quickstart.md`. No extension hooks configured and no `SPECKIT START/END` markers in `CLAUDE.md` — those steps were skipped per the skill's own instructions.

**Key decisions:**
1. **The entitlement module reads `req.user`, NOT a fresh DB query** (research.md Decision 1). `loadUser` already reads `users.tier` from the DB on every request, so a second read would be redundant I/O. Flagged by its own author as an interpretation call — the epic's "must actually read `users.tier` from the DB" can be read either way. **This is the single highest-uncertainty design call in the plan; scrutinize it first.**
2. The client entitlement helper wraps the NEW endpoint, not `store.getProfile()` — that is what makes it genuinely fresher than the five reads it replaces.
3. **New `GET /api/limits` endpoint**, deliberately decoupled from `GET /api/paddle/config`, to solve the quota-plumbing gap — avoids coupling the quota figure's availability to `PADDLE_API_KEY` being set.
4. **A FOURTH navigation touch point beyond the epic's three:** `connect-four/src/components/LegalFooter.jsx:16` — its `/pricing` link is a plain `<a href>` with a comment claiming the page "lives outside the SPA", which becomes false once `/pricing` is an in-app route. Must become `go('pricing')`; a new `/pricing-legal` entry is added as a plain `<a href>`.
5. `GET /api/user/entitlement` deliberately returns `200 {entitled:false}` for anonymous callers rather than the usual `/api/user/*` 401 convention — documented as an intentional exception so it isn't "fixed" later.
6. **OI-34 re-mapped to `paddleProcessor.js`'s `verifyTransaction`** (the Stripe-era text is stale). Found still APPLICABLE, not obsolete — the fix targets the missing `upgrade_completed` write on the fallback-only activation path.

**Deferred / uncertain, for tasks or implementation:**
- Entitlement cache TTL set to 5 minutes — explicitly a judgment call, not a hard requirement.
- The quota-fetch failure fallback copy ("a generous weekly allowance") is a placeholder UX call.
- CSP verification is manual via quickstart, not automated — matches project precedent.
- Whether `PricingScreen.jsx` extracts a shared sub-component from `UpgradeModal.jsx`'s toggle/badge JSX or duplicates it minimally was left unresolved — an implementation detail, not plan-blocking.

**Not independently re-verified:** the exact wording that will land in `staging_checks.md`'s Epic 3 section, and the current free/paid lesson id split (quickstart tells the implementer to confirm against `lessons/*.json` rather than hardcoding ids).

### From the plan_fix agent + orchestrator verification
Applied all three blocking fixes and both owner decisions across `plan.md`, `research.md`, `data-model.md`, `contracts/entitlement.md`, `contracts/lessons.md`, `quickstart.md`, and one spec addition.

- `plan.md` Source Code map (the binding contract `/speckit-tasks` reads) now carries: the corrected `pricing.html` line (route path only, byte-stable, literals retained, OI-41 = dated UPDATE not RESOLVED); `ConceptScreen.jsx` / `SocraticScreen.jsx` / `CLChallengeScreen.jsx` with `locked === true` guard tasks; `privacy.html` / `terms.html` / `refunds.html` with `/pricing` → `/pricing-legal` link re-pointing; `entitlementForRequest(req)` as the exported production API with `computeEntitlement(user)` internal/test-only; the `{ entitled, authenticated }` shape and the session-refresh path.
- `research.md`: Decision 1 rewritten (exported request-taking wrapper); Decision 3 extended to all three lesson-screen consumers; Decision 4 rewritten (`authenticated` + bounded session-refresh-before-downgrade); new Decision 11 (`pricing.html` byte-stable + the three legal-page link fixes).
- **`authenticated` was added to the locked-lesson stub as well as the entitlement endpoint** — extended by inference from the Decision 2 answer, not a literal instruction about the lesson endpoint. Sanity-check if it causes friction.
- **`spec.md` gained FR-033** (session-lapse vs genuine-free-tier, behavior-only, no endpoint shape named), appended rather than renumbered to avoid disturbing the FR cross-reference network. FR-013 cross-references it. **Not swept:** whether Key Entities / Assumptions sections need a matching update for FR-033.
- **RESOLVED by the orchestrator at source:** `POST /api/auth/refresh` DOES exist (`connect-four/server/index.js:393`), with shared refresh-token exchange logic in `connect-four/server/authRefresh.js`. The session-refresh path reuses existing machinery — it is NOT a new seam. The plan_fix agent had flagged this as unverified; it is now verified.
- **Still not done, correctly:** `docs/open_issues.md` was NOT edited. The plan asserts OI-41 gets a dated UPDATE rather than RESOLVED, but the actual entry edit is implementation-time work.
- The whole `specs/053-entitlement-payments-consolidation/` directory is untracked in git — new work, nothing committed.

### From the tasks_create agent (tasks.md — 66 tasks)
Phases: Setup (T001), Foundational (T002–T003), US1 (T004–T016), US2 (T017–T031), US4 (T032–T051), US3 (T052–T057), US5 (T058–T062), Polish (T063–T066). Delivery order US1 → US2 → US4 → US3 → US5.

**Key decisions:**
- `server/entitlement.js` (T002–T003) is the SOLE Foundational item — the only thing both P1 stories structurally require before either can start.
- Every one of the five call-site migrations, three lesson-screen guards, three legal-page re-points, and three per-screen DOM tests is a separate `[P]` task, for independent verifiability.
- Every `docs/open_issues.md` closeout (OI-66, OI-39, OI-41, OI-55, OI-34, OI-25) is its own task INSIDE the story that ships the corresponding work — flagged in Notes as implementation-time, not final-cleanup.
- T051 (OI-41) is worded as a dated UPDATE, never RESOLVED. T046 is an explicit `git diff` byte-stability check on `pricing.html`.
- T053/T054 split the OI-34 re-map into investigate + implement-if-still-applicable; T056 records whichever outcome occurred.
- Each architecture-doc edit (api-conventions ×3, server-conventions ×3) is its own task — Constitution Principle VIII makes doc edits part of the definition of done.
- No task for `POST /api/auth/refresh` itself — verified to exist and is reused, not built. T019 references it as an existing dependency.
- `.specify/extensions.yml` does not exist → hooks skipped. `check-prerequisites.sh --json` failed because the branch is `worktree-epic-1-pattern-acceptance`, not a `###-feature-name` branch — the documented non-fatal case; the agent read the spec dir directly instead.

**Fragile areas:**
1. **T019's session-refresh path is the most complex new logic in the feature** — cache TTL + fail-open + nested refresh-retry-then-accept-downgrade, all in one client module. Highest risk of a subtly wrong state transition. T020's 5-scenario unit test list is deliberately exhaustive; implementation must not skip any.
2. **T006's line numbers (674–679) and T034's route-registration line were NOT re-verified by this agent** — they come from earlier "verified this session" citations. Locate by symbol (`app.get('/api/lessons/:id'`, `app.get('/pricing'`), never by line number.
3. **T027's grep-verification has no automated test backing it** — a manual check embedded in the task list. If implementation assumes the unit tests cover it, the zero-raw-`.tier`-reads invariant across the tree won't actually be re-verified.
4. **US4 (T032–T051, 20 tasks) shares zero files with US1/US2/US3** — the best candidate for a separate worktree or parallel agent if concurrency is wanted.
5. **NOT verified at source:** whether `connect-four/src/lib/checkoutReturnFlow.js` has a hook point T059's nonce-threading can attach to cleanly, or needs new plumbing. `data-model.md` describes intent but the file's current shape was never read. Flag for whoever implements T059/T060.
