# Tasks critique — specs/053-entitlement-payments-consolidation

## Blocking issues

**1. User Story 5's cold-boot recovery cannot work as designed — T059 points at a module that is wiped on restart.**

US5 says a player who buys from the "set results" screen must get those results back afterwards, *even if the app is fully closed and reopened mid-purchase* (FR-029, acceptance scenario 2, SC-005). The task list implements it in three steps: T058 saves `{nonce, results}` into `sessionStorage` before opening checkout; T059 "threads the nonce through the checkout return path in `connect-four/src/lib/checkoutReturnFlow.js`"; T060 restores the results only if the saved nonce matches what the return flow expects.

`checkoutReturnFlow.js` read at source (80 lines): it is a **plain in-memory module-level variable** — `let state = 'idle'` with four possible string values (`idle|confirming|activated|failed`), no payload field, no persistence. On a cold boot it resets to `'idle'` and holds no nonce. T060's comparison can never match after a restart, and the flow falls through to the existing `/setpicker` fallback — the exact failure US5 exists to fix. The task list would go green on the in-session case and silently miss the cold-boot case that is the story's whole point.

Widening that store to carry a payload is not a small edit: its header comment declares `useUpgradeCheckout.js` the *sole writer* and `CheckoutReturnBanner.jsx` a pure reader, and `docs/architecture/frontend-conventions.md` documents that all five `UpgradeModal` call sites subscribe to it and must call `resetCheckoutReturnState()` — the OI-59 "stale outcome replays" fix that T061 must keep green.

*Fix:* re-target T059. The durable carrier that already exists is the checkout **return path**: `useUpgradeCheckout(returnPathOverride)` builds `const returnPath = returnPathOverride || window.location.pathname` and hands it to Paddle — a URL survives a restart, the in-memory store does not. Either append the nonce to that return path, or drop the nonce/return-flow coupling entirely and have T060 self-validate the `sessionStorage` entry (freshness timestamp + category match), needing no change to `checkoutReturnFlow.js` at all. Add an explicit acceptance step to T061 simulating a genuine cold boot (fresh module state *and* a reset return-flow store), not just a remount.

**2. No task adds any user-facing text — the new pricing page and footer link have no i18n entries, and Spanish fails silently.**

FR-021 requires the redesigned `/pricing` page to match the app's translated-language support, and T042 introduces a footer link labelled `t('footer.pricingLegal')`. In `connect-four/src/i18n/en.json`, `footer` contains only `pricing`, `terms`, `privacy`, `refunds` — there is no `pricingLegal` key, and no `pricing` top-level namespace at all for the new screen's copy (headings, the "pricing temporarily unavailable" degraded-state message in FR-022, the quota fallback, the CTA). Neither `en.json` nor `es.json` appears in `plan.md`'s Source Code map or in any of the 66 tasks.

This matters more than a missing file reference because of how this codebase degrades: a missing translation key falls back to English **silently, with no error**, so the Spanish build ships a half-English pricing page with no failing test. T043 (the pricing-page DOM test) mocks the data sources, not the translation layer.

*Fix:* add two US4 tasks — one adding the full `pricing.*` and `footer.pricingLegal` key sets to `en.json`, a paired one adding the Rioplatense-voseo Spanish equivalents to `es.json` — and add both files to `plan.md`'s Source Code map. Make T043 assert against real keys rather than hardcoded strings.

**3. A lockstep doc edit is missing: `frontend-conventions.md` will actively instruct future developers to reintroduce the exact pattern this epic removes.**

The epic's Authoritative sources of truth names `docs/architecture/frontend-conventions.md` for the tier-reading convention. That file (§"Reading the user's tier — profile, never session") currently states: *"`store.getProfile().then(p => setTier(p.tier))` — canonical precedent: `PostSetSummaryScreen.jsx`. Any screen or spec that gates on Pro/free … MUST use this pattern."*

That is precisely the pattern T022–T026 delete from all five call sites — including, verbatim, the `PostSetSummaryScreen.jsx` line the doc holds up as canonical. The task list has doc-edit tasks only for `api-conventions.md` (T014/T029/T048), `server-conventions.md` (T028/T049/T052), and `staging_checks.md` (T044/T047). Constitution Principle VIII makes doc lockstep part of "done"; leaving this stale points the next paid-status feature straight back at the raw cached tier read, creating a sixth entitlement source.

That same file documents the `checkoutReturnFlow.js` contract blocking issue 1 touches, so both fixes land in one edit.

*Fix:* add a US2 task updating §"Reading the user's tier" to make `getEntitlement()` the mandated pattern (retaining the "never `session.tier`" warning), and a US4 sub-note correcting `LegalFooter.jsx`'s documented "these links live outside the SPA" claim.

*Minor, non-blocking:* `staging_checks.md` already contains a section headed **"## Epic 3 — Global UI/UX & Accessibility Polish (spec 043)"** — a different Epic 3. T044/T047 say "under this epic's section" and could land in the wrong place; specify the heading text explicitly. And FR-005 (the lesson *list* endpoint stays unchanged) has no verifying task — low risk, since no task touches it.

## Verification results

- **FR coverage:** all of FR-001…FR-033 map to at least one task. No orphans. (FR-005 covered only by omission.)
- **Five tier-read call sites** (T022 Settings, T023 PostSetSummary, T024 Saga, T025 DeepRevealPane, T026 useLessonLockGuard): each its own `[P]` task. ✅
- **Three lesson-screen guards** (T008/T009/T010) plus three matching DOM tests (T011–T013): each separate. ✅
- **Three static legal-page link re-points** (T035/T036/T037): each separate; all three `<a href="/pricing">` links confirmed at the cited locations. ✅
- **Six issue closeouts** present (T016 OI-66, T031 OI-39, T051 OI-41, T056 OI-34, T057 OI-55, T062 OI-25) plus audit task T066. **T051 correctly worded as a dated `UPDATE`, never `RESOLVED`.** ✅
- **Shared module before consumers:** `server/entitlement.js` (T002–T003) is the sole Foundational phase, explicitly blocking US1 and US2. ✅
- **`pricing.html` untouched:** no task edits its content; T034 changes only route registration; T046 is an explicit `git diff`-is-empty check. ✅
- **No task changes payment identity-binding code.** ✅
- **CSP:** T044 targets the built `dist/` served by the real Express server and explicitly forbids `npm run dev`. All test tasks specify `npm run test:fast`. ✅
- **T006 and T034 resolve by symbol:** `app.get('/api/lessons/:id',` at index.js:674; `app.get('/pricing', (_, res) => res.sendFile(join(__dirname, 'pricing.html'), LEGAL_PAGE_OPTS));` verbatim at index.js:4088. Both real. ✅
- **The plan's highest-uncertainty design call is sound.** `loadUser` (`server/index.js:504`) performs a fresh `supabase.from('users').select(...)` on **every** request, so `req.user.tier` genuinely carries per-request DB provenance; its `catch {}` sets `req.user = null`, which the module maps to unentitled — fail-closed as FR-010 requires. No change needed.
- **`test:dom` script and `tests/dom/` directory both exist**, so T011–T013/T043 placement and T015/T030/T050 registration are viable. ✅

## Decisions required

**Decision 1 — Should the locked-lesson response carry an `authenticated` flag, or match the ratified shape exactly?**

Both the spec (FR-002, "Lesson (locked view)" entity) and the epic's Settled decision #7 define the body as exactly `{ id, title, order, free, locked: true }`. The task list (T004, T005, T011, T014) adds a sixth field, `authenticated`. The handoff records this as an inference carried over from a different decision, not an instruction — so the artifacts currently disagree about the API contract, and T014 would document the divergent version.

- **Option A (recommended): drop `authenticated` from the lesson stub**, keeping it only on `GET /api/user/entitlement` where FR-033's session-lapse logic consumes it. Matches the ratified contract verbatim. Edit T004/T005/T011/T014.
- **Option B: keep it, and amend spec FR-002, the Key Entity, and the epic's acceptance criteria.** Justified only if the three lesson screens should show "Sign in" versus "Upgrade" as different prompts — a product call nobody has made.

**Decision 2 — During a database outage, should a paying customer briefly see an upgrade prompt?**

Discovered at source, not previously raised: if the DB read inside `loadUser` fails, the server treats the request as fully anonymous — correct and safe server-side. But a genuinely signed-in **paid** customer then receives `{entitled: false, authenticated: false}` during a transient outage. The client helper (T019) responds by attempting one session refresh and then, if it still comes back the same, accepting the downgrade — showing a paying customer an upgrade prompt because the database blinked. FR-013's intent is explicitly the opposite.

- **Option A (recommended): treat "signed in previously, now `authenticated:false`" as a transient failure, not a downgrade** — keep serving the last known "paid" answer until the cache window expires, since the server-side gate is the real enforcement point and cannot be bypassed by a lenient client. One clarifying sentence in T019, one extra case in T020's test list.
- **Option B: accept the current behavior.** A real cancellation propagates faster, at the cost of a false upgrade prompt during any backend blip.

## Handoff context

**Systemic issues.** Two patterns produced all three blocking findings. First, **artifacts absent from the plan's Source Code map are invisible to the task generator** — `src/i18n/en.json`/`es.json` and `docs/architecture/frontend-conventions.md` were never listed, so no task exists for either, and no amount of care in `/speckit-tasks` would have caught it. Treat the plan's file map as the coverage frontier and independently ask "what else does this change make stale?" Second, **the task list cites modules by intent rather than by shape** — T059 says "thread the nonce through `checkoutReturnFlow.js`" without anyone having opened that 80-line file to see it is a bare in-memory string. The tasks author flagged this exact file as unverified; the flag was correct and the underlying assumption was wrong. Every "attach X to existing module Y" task deserves a read of Y.

**Reviewer frame.** The epic doc's Settled decisions and acceptance criteria as the binding contract, the spec's FRs as the behavioral restatement, tasks as the delivery proof — checked in all three directions, not just spec→tasks. Every code-level claim re-derived at source this session by symbol name (`app.get('/api/lessons/:id'`, `app.get('/pricing'`, `loadUser`, `SESSION_ONLY_SCREENS`, `returnPathOverride`), never by line number, never by quoting a prior agent.

**Non-obvious intent a fix agent must preserve.**
- The **server fail-closed / client fail-open asymmetry** (FR-010 vs FR-013) is deliberate and load-bearing. Decision 2 pushes the client *further* open on purpose; do not "harmonize" them.
- `connect-four/server/pricing.html` is **byte-stable by owner decision**; OI-41 stays open with a dated UPDATE. Its hand-typed literals are a knowingly accepted drift risk because the payment provider reviewed that exact wording. Any agent that "helpfully" de-hardcodes it has broken the epic.
- **No code change to payment identity binding** (FR-017). The first-payment forgery window is accepted, ratified, documentation-only. An agent reading OI-55 could easily try to close it.
- `checkoutReturnFlow.js`'s **immediate replay-on-subscribe** behavior is the OI-59 fix; the five `UpgradeModal` call sites depend on calling `resetCheckoutReturnState()` after consuming a terminal state. Any restructuring for US5 must keep that intact — T061 tests it.

**What was not flagged, and why.** The `req.user`-versus-fresh-DB-query question the handoff nominated as highest-uncertainty — verified `loadUser`, it is sound; raising it would have burned a decision slot on a settled matter. Nothing on the owner's ratified list was relitigated. Also not flagged: T039 listed before T040 (self-documents the dependency); T027's manual grep lacking automated backing (already flagged by the tasks author; matches project precedent for manual CSP verification); the transient window where `/pricing` is unserved between T034 and T041 (an intra-story artifact, not a shipping state); the conditional T053→T054→T055 chain (correctly structured as investigate-then-implement with T056 recording either outcome). No test suite was run and no server started — this was a documentation-consistency review; nothing is implemented yet.
