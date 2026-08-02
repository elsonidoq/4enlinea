---

description: "Task list for Entitlement & Payments Consolidation"
---

# Tasks: Entitlement & Payments Consolidation

**Input**: Design documents from `/specs/053-entitlement-payments-consolidation/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/entitlement.md,
contracts/lessons.md, contracts/limits.md, quickstart.md

**Tests**: Included. `plan.md`'s Constitution Check (Principle III) and `docs/architecture/testing-conventions.md`
both require pure-function-extraction unit tests plus the "test the real seam, never a copy of it" extraction
pattern for anything HTTP-shaped, and DOM tests for anything that changes what a screen renders. All test
commands in this file mean `cd connect-four && npm run test:fast` — **never** `npm test` (that suite includes
`tests/integration/candidate-generator.test.js`, which calls the real c4solver up to 400 times and can hang
10+ minutes; it has no bearing on this feature's surface).

**Organization**: Tasks are grouped by user story (US1–US5, matching spec.md's priorities P1/P1/P3/P2/P3).
Delivery order below follows plan.md's sequencing: US1 → US2 (both P1, US1 first per "the epic's namesake
problem" and because it has zero dependency on US2) → US4 (P2) → US3 → US5 (both P3).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on an incomplete task in this list)
- **[Story]**: US1–US5, mapping to spec.md's user stories
- File paths are relative to the repository root unless stated otherwise

## Standing constraints (apply to every task below, not repeated per-task)

- Run `eval "$(./worktree-ports.sh)"` from the repo root before starting/killing any dev server
  (`docs/architecture/worktree-conventions.md`).
- `connect-four/server/pricing.html` is **byte-stable** — no task in this list edits its content. Only the
  server-side route registration changes (T034).
- OI-41 gets a **dated UPDATE**, never a `RESOLVED` flip (T051) — the retained `pricing.html` keeps its
  hand-typed literals by owner decision (research.md Decision 11).
- No task changes the payment-identity binding code in `paddleProcessor.js`'s `transaction.completed`
  cross-check (FR-017) — US3 is documentation plus the OI-34 re-map/fix only, never the identity check itself.
- New test files are **not auto-discovered** — every task that adds a `*.test.js`/`*.test.mjs`/
  `*.dom.test.jsx` file must also be followed by (or bundled with) registering it in
  `connect-four/package.json`'s `test:fast` (and `test:dom` for `.dom.test.jsx` files) script strings, per
  `docs/architecture/testing-conventions.md`'s "A stale registration fails nothing" warning.

---

## Phase 1: Setup

**Purpose**: Establish the one shared fact multiple later tasks need — a concrete free/paid lesson id pair —
before any test references a lesson id.

- [x] T001 Confirm the current free/paid split of lesson ids by reading the `free` field in every
  `connect-four/lessons/*.json` file (do **not** trust the epic's "free 1–10 / paid 11–15" text as
  authoritative — re-derive it, per `quickstart.md`'s US1 step 2 and the project's "verify at the source
  layer" rule). Record one concrete free lesson id and one concrete paid lesson id for use in T007, T011–T013.

**Checkpoint**: A verified (freeId, paidId) pair is available for every later task that needs one.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The single server-side entitlement computation both US1 (server gate) and US2 (client source)
depend on. Nothing in either story can be implemented correctly before this exists.

**⚠️ CRITICAL**: Complete before starting US1 or US2.

- [x] T002 Create `connect-four/server/entitlement.js` exporting `entitlementForRequest(req)` (the sole
  production entry point — reads `req.user`, never issues its own DB query) and `computeEntitlement(user)`
  (internal pure core, exported only for tests). `entitled = user != null && user.tier === 'paid'`;
  `authenticated = user != null`. Never throws — returns `{ entitled: false, authenticated: false }` on any
  unexpected input (FR-010 fail-closed). See `contracts/entitlement.md` for the exact signatures and
  `research.md` Decision 1 for why `req.user` (already populated by the global `loadUser` middleware from a
  real `users.tier` DB read) is consumed directly rather than re-queried.
- [x] T003 [P] Unit test `connect-four/tests/unit/entitlement.test.js` for `computeEntitlement`/
  `entitlementForRequest`: paid user → `{entitled:true, authenticated:true}`; free signed-in user →
  `{entitled:false, authenticated:true}`; `null`/`undefined` user → `{entitled:false, authenticated:false}`;
  malformed user shape → does not throw, returns the fail-closed shape; `entitlementForRequest({user: X})`
  matches `computeEntitlement(X)` exactly for every case above.

**Checkpoint**: `entitlementForRequest`/`computeEntitlement` exist and are unit-tested. US1 and US2 can now
proceed (in parallel, if staffed — US1 does not depend on any US2 task).

---

## Phase 3: User Story 1 - A paid lesson's content is never served to someone who hasn't paid (Priority: P1) 🎯 MVP

**Goal**: `GET /api/lessons/:id` never returns `slides` for a paid lesson to a caller without a paid
entitlement; the three real client consumers of that endpoint handle the resulting `locked: true` stub
without crashing.

**Independent Test**: `curl` a known paid lesson id signed-out → no `slides` key; the same id with a paid
session → full content; a free lesson → full content for any caller. Ships independently of every other
story in this epic.

### Implementation for User Story 1

- [x] T004 [US1] Create `connect-four/server/lessonEntitlement.js` exporting
  `buildLessonResponse(lesson, entitlement)` per `contracts/lessons.md`: returns the lesson unchanged when
  `lesson.free || entitlement.entitled`; otherwise returns exactly
  `{ id, title, order, free, locked: true }` — matching the ratified shape verbatim (spec.md FR-002 / "Lesson
  (locked view)" Key Entity, epic Settled decision #7) — with `slides` absent from the object entirely (not
  `null`, not `[]`) and **no `authenticated` field** (Decision 1: `authenticated` lives only on
  `GET /api/user/entitlement`, T017, where FR-033's session-lapse logic actually consumes it — distinguishing
  "sign in" vs "upgrade" prompts on the lesson screens is a product call nobody has made). Pure, synchronous —
  follows the `blunderDetailResponse.js` shape-builder-as-pure-function precedent
  (`docs/architecture/testing-conventions.md` §"Test the real seam, never a copy of it").
- [x] T005 [P] [US1] Unit test `connect-four/tests/unit/lessonEntitlement.test.js` for
  `buildLessonResponse`: free lesson + any entitlement → full lesson, no `locked` key at all (its absence,
  not `locked: false`, is the "unlocked" signal); paid lesson + `entitled:true` → full lesson; paid lesson +
  `entitled:false, authenticated:true` → the redacted stub `{ id, title, order, free, locked: true }` with no
  `slides` key (assert via `'slides' in result === false`, not `result.slides === undefined`) and **no
  `authenticated` key** (assert `'authenticated' in result === false`); paid lesson +
  `entitled:false, authenticated:false` → the identical stub shape (the two unentitled cases produce the same
  body — `authenticated` is not part of this response).
- [x] T006 [US1] Update the `GET /api/lessons/:id` handler in `connect-four/server/index.js` (currently
  `app.get('/api/lessons/:id', (req, res) => { ... res.json(lesson); })`, exact lines 674–679 per
  `contracts/lessons.md`) to call `entitlementForRequest(req)` (T002) then
  `buildLessonResponse(lesson, entitlement)` (T004) before responding, unchanged on the existing `404` path.
- [x] T007 [P] [US1] Integration test `connect-four/tests/integration/lessonEntitlementGate.test.js`
  exercising `buildLessonResponse` through the real handler-equivalent path (per the "extract the logic, test
  both sides" pattern `blunderPermalinkContext.test.js` establishes — do not reimplement the handler's logic
  inside the test): using T001's verified paid lesson id, assert a signed-out-equivalent entitlement produces
  no `slides` key and `locked: true`; a paid entitlement produces the full lesson; using T001's free lesson
  id, assert every entitlement value produces the full lesson (FR-003). Also assert `GET /api/lessons` (the
  list endpoint, distinct from `GET /api/lessons/:id`) is unaffected by this feature: it still returns its
  existing `{ id, title, order, free }` projection with no `slides`/`locked` field added or removed (FR-005 —
  this endpoint is out of scope for the gate; the test exists so a future accidental edit to the shared
  lesson loader is caught).
- [x] T008 [P] [US1] Add a `locked === true` guard in `connect-four/src/screens/ConceptScreen.jsx`: before
  the unguarded `lesson.slides[slideIndex]` indexing at lines ~78/89/100/166, detect `locked === true` on the
  fetched lesson and render the existing upgrade-prompt affordance (the same one client-side
  `useLessonLockGuard` already shows) instead of indexing the now-absent `slides` array.
- [x] T009 [P] [US1] Add the identical `locked === true` guard in `connect-four/src/screens/SocraticScreen.jsx`
  (same fetch pattern, same upgrade-prompt affordance, per `contracts/lessons.md`'s consumer table).
- [x] T010 [P] [US1] Add the identical `locked === true` guard in `connect-four/src/screens/CLChallengeScreen.jsx`'s
  cold-boot `GET /api/lessons/:lessonId` fetch path (`docs/architecture/frontend-conventions.md` §"`clchallenge`
  cold-boot fetch pattern") — this is the path reachable by a direct reload of a locked lesson's URL, not only
  in-app navigation.
- [x] T011 [P] [US1] Component test `connect-four/tests/dom/ConceptScreenLocked.dom.test.jsx`: mount
  `ConceptScreen` with a mocked `{ locked: true, id, title, order, free: false }` fetch response (the exact
  ratified shape — no `authenticated` field, per Decision 1) for T001's paid lesson id; assert the
  upgrade-prompt affordance renders and the component does not throw/blank out. Break the guard on purpose
  first (temporarily) and confirm the test goes red before restoring it, per `testing-conventions.md`'s
  DOM-test-coverage rule.
- [x] T012 [P] [US1] Component test `connect-four/tests/dom/SocraticScreenLocked.dom.test.jsx` — same pattern
  as T011, for `SocraticScreen.jsx`.
- [x] T013 [P] [US1] Component test `connect-four/tests/dom/CLChallengeScreenLocked.dom.test.jsx` — same
  pattern as T011, for `CLChallengeScreen.jsx`'s cold-boot fetch path.
- [x] T014 [US1] Document the `GET /api/lessons/:id` locked-response contract in
  `docs/architecture/api-conventions.md`: a new `/api/lessons/*` subsection (none exists today) stating the
  exact `{ id, title, order, free, locked: true }` shape (Decision 1 — **no `authenticated` field on this
  endpoint**; that field exists only on `GET /api/user/entitlement`, documented separately in T029 — do not
  document the six-field version), the "absence of `slides`, not `null`/`[]`" convention, and the "absence of
  `locked`, not `locked: false`" convention for full-content responses.
- [x] T015 [US1] Register `tests/unit/lessonEntitlement.test.js` and
  `tests/integration/lessonEntitlementGate.test.js` in `connect-four/package.json`'s `test:fast` script
  string, and `tests/dom/ConceptScreenLocked.dom.test.jsx`, `tests/dom/SocraticScreenLocked.dom.test.jsx`,
  `tests/dom/CLChallengeScreenLocked.dom.test.jsx` in the `test:dom` script string. Verify registration by
  running `npm run test:fast 2>&1 | grep -c "<a distinctive test name from T005/T007>"` and confirming a
  non-zero count (per testing-conventions.md — exit code and grep-for-"Could not find" do NOT catch a stale
  registration).
- [x] T016 [US1] Update `docs/open_issues.md`: close OI-66 (paid lesson JSON served to unauthenticated
  callers) as `✅ RESOLVED <date>`, citing `buildLessonResponse` (`connect-four/server/lessonEntitlement.js`)
  and the `GET /api/lessons/:id` gate (`connect-four/server/index.js`) as what shipped, per the Issue
  closeout convention in `docs/epics/open-issues-epics.md`'s top matter.

**Checkpoint**: US1 is fully functional and independently testable — `npm run test:fast` green, a signed-out
`curl` of a paid lesson id returns no `slides`, and all three lesson screens render the upgrade prompt
instead of crashing on a locked stub.

---

## Phase 4: User Story 2 - One authoritative answer for "is this user entitled to paid content" (Priority: P1)

**Goal**: A single client-side entitlement helper, backed by `GET /api/user/entitlement`, replaces all five
independent client-side tier reads; the server-side lesson gate (US1) and the endpoint both trace back to the
same `entitlementForRequest` (T002) with no HTTP hop between the two server-side decision points.

**Independent Test**: `curl /api/user/entitlement` (no cookie, paid cookie, free cookie) returns the three
distinct `{entitled, authenticated}` shapes; grep confirms zero remaining raw `.tier` reads at the five
migrated call sites.

### Implementation for User Story 2

- [x] T017 [US2] Add `GET /api/user/entitlement` as a thin wrapper in `connect-four/server/userRoutes.js`:
  `router.get('/api/user/entitlement', (req, res) => res.json(entitlementForRequest(req)))`. Per
  `research.md` Decision 4, this endpoint deliberately does **not** follow the `/api/user/*` "401 if
  `req.user` is null" ownership invariant — it always returns `200`, including for anonymous callers
  (`{ entitled: false, authenticated: false }`). This exception is documented in T029.
- [x] T018 [P] [US2] Unit/seam test `connect-four/tests/unit/userEntitlementEndpoint.test.js` asserting the
  wrapper calls `entitlementForRequest(req)` and returns its result verbatim as the JSON body, for a
  paid-user-shaped `req`, a free-user-shaped `req`, and a `req.user === null` (anonymous) case — all `200`,
  per the "test the real seam" extraction pattern (the wrapper itself is the seam under test, not a
  reimplementation of it).
- [x] T019 [US2] Create `connect-four/src/lib/entitlement.js` (new plain `.js` module, following the
  `checkoutReturnFlow.js`/`onboardingRouting.js`/`postLoginReturn.js` pattern — no JSX) exposing
  `getEntitlement(): Promise<{entitled: boolean}>` and `invalidateEntitlement(): void`. Implements: TTL cache
  (`ENTITLEMENT_CACHE_TTL_MS = 5 * 60 * 1000`) via `GET /api/user/entitlement`; fail-open to the last
  successfully-obtained answer on fetch failure, defaulting to `{entitled:false}` only when no answer was
  ever obtained (FR-013); and the session-refresh-before-downgrade path — when a fetch resolves
  `{entitled:false, authenticated:false}` while `lastKnownGood.entitled === true`, attempt one bounded
  refresh reusing `connect-four/src/lib/fetchWithAuthRetry.js`'s existing single-retry pattern (`POST
  /api/auth/refresh` + one re-fetch) before accepting the downgrade (FR-033, `data-model.md`'s state
  transition table). **Decision 2 (DB-outage case, discovered at review):** if that single bounded refresh
  attempt still comes back `{entitled:false, authenticated:false}` (the ambiguous "session lapsed vs.
  transient server failure" case FR-033 names but doesn't fully resolve), do **not** accept the downgrade —
  keep returning the existing `lastKnownGood` (`entitled:true`) until its TTL window naturally expires, and
  only then re-fetch normally. This deliberately pushes the client further open than a literal reading of
  FR-033 might suggest: the server-side gate (FR-010, fail-closed) is the real enforcement point and cannot
  be bypassed by this leniency, so a transient backend blip must never show a paying customer an upgrade
  prompt. Do NOT "harmonize" this with FR-010's server-side fail-closed rule — the asymmetry is the design
  (see also the Standing constraints note at the top of this file).
- [x] T020 [P] [US2] Unit test `connect-four/tests/unit/entitlementClient.test.js` for `src/lib/entitlement.js`:
  cache-first return within TTL (no fetch); fetch triggered once TTL has expired; failed fetch returns the
  last known good value, or `{entitled:false}` if none exists yet; a fetch resolving
  `{entitled:false, authenticated:false}` while `lastKnownGood.entitled===true` triggers exactly one
  session-refresh-and-retry cycle before overwriting `lastKnownGood`; the same resolution with no prior
  `lastKnownGood` skips the refresh and returns `{entitled:false}` immediately; **a sixth scenario (Decision
  2)**: the session-refresh-and-retry cycle still resolves `{entitled:false, authenticated:false}` while a
  prior `lastKnownGood.entitled===true` exists — assert `getEntitlement()` keeps returning `{entitled:true}`
  (the stale-but-good answer, not the downgrade) until the TTL window expires; `invalidateEntitlement()`
  forces the next call to fetch even within an unexpired TTL window.
- [x] T021 [US2] Wire `invalidateEntitlement()` (T019) into `connect-four/src/lib/useUpgradeCheckout.js`'s
  `checkout.completed` handler, immediately alongside its existing `setCheckoutReturnState('activated')`
  call — the single choke point every `UpgradeModal` checkout completion passes through (`research.md`
  Decision 2), satisfying FR-012 for all five call sites at once with no per-site invalidation wiring.
- [x] T022 [P] [US2] Migrate `connect-four/src/screens/SettingsScreen.jsx`: replace
  `setTier(profile.tier === 'paid' ? 'paid' : 'free')` with a call to `getEntitlement()` (T019), converting
  its boolean `entitled` answer into the same `'paid' | 'free'` local shape the screen already renders.
- [x] T023 [P] [US2] Migrate `connect-four/src/screens/PostSetSummaryScreen.jsx`: replace
  `setIsFreeUser(!profile || profile.tier === 'free')` with a call to `getEntitlement()`.
- [x] T024 [P] [US2] Migrate `connect-four/src/screens/SagaScreen.jsx`: replace
  `.then(p => setTier(p?.tier ?? 'free'))` with a call to `getEntitlement()`.
- [x] T025 [P] [US2] Migrate `connect-four/src/components/DeepRevealPane.jsx`: replace the
  `tier: profile?.tier` value fed into `describeQuota` with a call to `getEntitlement()`.
- [x] T026 [P] [US2] Migrate `connect-four/src/lib/useLessonLockGuard.js`: replace
  `store.getProfile().then(p => p?.tier ?? 'free').catch(() => 'free')` with a call to `getEntitlement()`,
  consuming the `{entitled, authenticated}`-derived boolean rather than a raw tier string.
- [x] T027 [US2] Grep-verify no call site outside `connect-four/src/lib/entitlement.js` and
  `connect-four/server/entitlement.js` still reads `.tier` directly at the five migrated locations:
  `grep -rn "\.tier" connect-four/src/screens connect-four/src/components connect-four/src/lib/useLessonLockGuard.js`
  should show zero hits at T022–T026's sites (per `quickstart.md` US2 step 5). Unrelated `.tier` concepts
  (e.g. `colRankings[].tier` in `RecommendCoach`) are a different "tier" per
  `docs/architecture/frontend-conventions.md`'s three-tier-types note — do not touch those.
- [x] T028 [US2] Update `docs/architecture/server-conventions.md` §"PaymentProcessor Seam": replace
  `getSubscriptionStatus`'s "nothing calls this in production, by design" framing with "superseded for
  production entitlement decisions by `server/entitlement.js` (spec 053); still exercised by
  `paymentProcessor.test.mjs`/the `PaymentProcessor` substitutability tests — do not delete those tests or
  the function itself" (FR-015, `research.md` Decision 10). Do not delete `getSubscriptionStatus` or its
  tests.
- [x] T028a [US2] Update `docs/architecture/frontend-conventions.md` §"Reading the user's tier — profile,
  never session" (~line 741): replace the mandated
  `store.getProfile().then(p => setTier(p.tier))   // canonical precedent: PostSetSummaryScreen.jsx` snippet
  and its "Any screen or spec that gates on Pro/free ... MUST use this pattern" instruction with
  `getEntitlement()` (`connect-four/src/lib/entitlement.js`, T019) as the mandated pattern instead — this
  section currently instructs future developers to reintroduce, verbatim, the exact
  `PostSetSummaryScreen.jsx` read that T023 deletes. **Retain** the existing "`session?.tier` is always
  `undefined`, so gating on it fails silently and in the permissive direction" warning — it is still true and
  still worth keeping. This doc edit is load-bearing: leaving the old text stale would point the next
  paid-status feature straight back at a raw cached tier read, recreating a sixth entitlement source
  (Constitution Principle VIII).
- [x] T029 [US2] Document `GET /api/user/entitlement` in `docs/architecture/api-conventions.md`: the
  `{entitled, authenticated}` response shape for all three caller states (anonymous, free signed-in, paid
  signed-in), and an explicit callout that this endpoint is a deliberate, documented exception to the
  `/api/user/*` "401 if `req.user` is null" ownership invariant (`research.md` Decision 4) — so a future
  reader does not "fix" it into a `401`. Also document `entitlementForRequest(req)` as the sole production
  entry point vs. `computeEntitlement(user)` as test-only (`research.md` Decision 1).
- [x] T030 [US2] Register `tests/unit/userEntitlementEndpoint.test.js` and `tests/unit/entitlementClient.test.js`
  in `connect-four/package.json`'s `test:fast` script string; verify registration per T015's method.
- [x] T031 [US2] Update `docs/open_issues.md`: close OI-39 (`getSubscriptionStatus` has no production call
  site; stale four-site count) as `✅ RESOLVED <date>`, citing the shared `entitlementForRequest`/
  `computeEntitlement` module and noting the corrected five-site count (not four, per the epic's Non-obvious
  facts) that was actually migrated.

**Checkpoint**: US1 AND US2 both work independently. `GET /api/user/entitlement` is live; all five former
tier-read call sites source their decision from `getEntitlement()`; `npm run test:fast` green.

---

## Phase 5: User Story 4 - A designed, accurate pricing page (Priority: P2)

**Goal**: `/pricing` becomes an in-app React route reading live prices and quota; `pricing.html` (byte-stable)
is retained at `/pricing-legal`; every static page that linked to the old `/pricing` now links to
`/pricing-legal`; CSP is verified against the Express-served `dist/` build.

**Independent Test**: Load `/pricing` — prices/quota match live sources, zero CSP violations after opening
checkout. Load `/pricing-legal` directly — MoR clause, refund statement, `/terms` link render, unchanged.

### Implementation for User Story 4

- [x] T032 [US4] Add `GET /api/limits` in `connect-four/server/index.js` (near the other public resource
  routes), returning `{ freeDeepRevealWeeklyLimit: number }` sourced live from
  `connect-four/server/quotaLimits.js`'s existing `FREE_DEEP_REVEAL_WEEKLY_LIMIT` export — always `200`, not
  gated behind `PADDLE_API_KEY`, and not folded into `GET /api/paddle/config` (`contracts/limits.md`,
  `research.md` Decision 7).
- [x] T032a [P] [US4] Add a `pricing` i18n namespace and a `footer.pricingLegal` key to
  `connect-four/src/i18n/en.json`: headings/body copy for `PricingScreen.jsx` (T040), the FR-022 degraded
  "pricing temporarily unavailable, no purchase CTA" message, the non-numeric quota-fallback phrase (e.g. "a
  generous weekly allowance") for when only the quota fetch fails, the checkout CTA label, and
  `footer.pricingLegal` (the new `/pricing-legal` footer link label added alongside `footer.pricing` at
  `connect-four/src/i18n/en.json`'s existing `footer` block, ~line 129 — `footer.pricing` itself is
  unaffected). A missing key here falls back to English **silently, with no failing test**, so this task must
  land before T040 and T042 consume these keys, and before T043 asserts against them.
- [x] T032b [P] [US4] Add the Rioplatense-voseo Spanish equivalents of every key from T032a to
  `connect-four/src/i18n/es.json` (same `pricing` namespace, same `footer.pricingLegal` key). Do this as a
  separate task from T032a (different file, independently reviewable), but land it in the same story before
  T040/T042/T043.
- [x] T033 [P] [US4] Integration test `connect-four/tests/integration/limitsEndpoint.test.js`: `GET
  /api/limits` returns `{ freeDeepRevealWeeklyLimit: FREE_DEEP_REVEAL_WEEKLY_LIMIT }` (imported from
  `quotaLimits.js`, not a duplicated literal, so the test fails if the constant and the route ever drift),
  always `200`.
- [x] T034 [US4] In `connect-four/server/index.js`, change the existing static route registration (exact
  line: `app.get('/pricing', (_, res) => res.sendFile(join(__dirname, 'pricing.html'), LEGAL_PAGE_OPTS));`)
  to register at `/pricing-legal` instead, with the identical handler body — same `pricing.html`, same
  `LEGAL_PAGE_OPTS`. Remove the old `/pricing` registration entirely (do not add a second route alongside
  it) so the SPA catch-all, registered later, serves `/pricing` via `index.html` once T038/T039 land
  (`research.md` Decision 6/11 — "whichever handler is registered first at a given path wins").
- [x] T035 [US4] Re-point `connect-four/server/privacy.html`'s `<a href="/pricing">Pricing</a>` (line ~45) to
  `<a href="/pricing-legal">Pricing</a>`.
- [x] T036 [P] [US4] Re-point `connect-four/server/terms.html`'s `<a href="/pricing">Pricing</a>` (line ~49)
  to `<a href="/pricing-legal">Pricing</a>`.
- [x] T037 [P] [US4] Re-point `connect-four/server/refunds.html`'s `<a href="/pricing">Pricing</a>` (line
  ~34) to `<a href="/pricing-legal">Pricing</a>`.
- [x] T038 [US4] Add a `/pricing` entry to the `URL_MAP` table in `connect-four/src/lib/urlMapping.js`.
- [x] T039 [US4] Register the new pricing screen in the `SCREENS` registry in
  `connect-four/src/lib/screenRegistry.jsx` (depends on T040 existing, but the registry entry itself can be
  scaffolded alongside it).
- [x] T040 [US4] Create `connect-four/src/screens/PricingScreen.jsx`: fetch live prices via
  `connect-four/src/lib/usePaddlePrices.js` (`usePaddlePrices`, `formatPrice`, `computeAnnualSavings`) and
  the live quota via `GET /api/limits` (T032); reuse `connect-four/src/components/UpgradeModal.jsx`'s
  monthly/annual toggle and savings-badge treatment for visual consistency (FR-021, Principle IV); wire the
  checkout CTA through `connect-four/src/lib/useUpgradeCheckout.js` unchanged; render all copy via the real
  `pricing.*` i18n keys added in T032a/T032b (Rioplatense voseo in `es.json`) — no hardcoded English strings.
  Degraded state (FR-022): if the live pricing fetch fails, show the `pricing.*` degraded-state key (clear
  non-error, non-blank message) and do not offer a purchase action that cannot succeed; if only the quota
  fetch (T032) fails, fall back to the `pricing.*` generic non-numeric quota-fallback key (e.g. "a generous
  weekly allowance") rather than a hardcoded number (`research.md` Decision 7's degraded-state note) — never
  conflate the two failure modes.
- [x] T041 [US4] Wire the `/pricing` navigation entry point in `connect-four/src/App.jsx`'s
  `window.history.pushState`-based `go()` mechanism.
- [x] T042 [US4] Update `connect-four/src/components/LegalFooter.jsx`: change the existing `/pricing` entry
  from a plain `<a href="/pricing">` to a `go('pricing')` call (the comment claiming these links "live
  outside the SPA" is now false for `/pricing` — `research.md` Decision 6); add a new
  `{ href: '/pricing-legal', label: t('footer.pricingLegal') }` entry as a plain `<a href>` (matching
  `/terms`'s existing style, since `/pricing-legal` genuinely is outside the SPA), using the key added in
  T032a/T032b. **Sub-note:** also correct the file's own header comment (`// /refunds). These live outside
  the SPA, so they must be plain <a href> that`, line ~4) so it no longer claims this of the `/pricing` entry
  specifically — the comment stays accurate for `/terms`, `/privacy`, `/refunds`, and the new
  `/pricing-legal` entry, but must call out that `/pricing` is now the one exception, routed via `go()`.
- [x] T043 [P] [US4] Component test `connect-four/tests/dom/PricingScreen.dom.test.jsx`: renders live
  prices/savings badge and quota figure from mocked `usePaddlePrices`/`GET /api/limits` responses; renders
  the degraded-state message (no purchase CTA) when the pricing fetch is mocked to fail; renders the generic
  quota fallback phrase (no hardcoded number) when only the quota fetch is mocked to fail. Assert against the
  **real `pricing.*` i18n keys** added in T032a (e.g. render with the real `en.json` loaded and match on the
  actual translated strings, or assert the `t()` keys used are the ones T032a defines) — not hardcoded
  strings, so a missing/misspelled key fails this test instead of silently falling back to English.
- [x] T044 [US4] Manual verification (`quickstart.md` US4 steps 1–3, FR-027/SC-008 — **blocking**, per the
  epic's Settled decision #6): `cd connect-four && npm run build`; serve the built `dist/` via the real
  Express server (never `npm run dev` — CSP is invisible under Vite dev); load `/pricing`, confirm prices
  match `GET /api/paddle/config` and quota matches `GET /api/limits`; open devtools' CSP violation console
  and exercise the Paddle checkout overlay; confirm zero CSP violations. Append the result (pass/fail, date,
  directives touched if any) to `/Users/elsonidoq/prog/cuatro_en_linea/.claude/worktrees/epic-1-pattern-acceptance/staging_checks.md`
  under a heading you create named exactly `## Epic 3 — Entitlement & Payments Consolidation (spec 053) —
  added <date>` (matching the file's existing "Epic N — Title (spec NNN) — added <date>" convention, e.g. its
  `## Epic 1 — Pattern Acceptance...`/`## Epic 2 — Detector Perspective Soundness...` headings). **Do not**
  use the file's existing `## Epic 3 — Global UI/UX & Accessibility Polish (spec 043)` heading — that is a
  different, unrelated Epic 3; this task's entries go under their own new heading, never folded into that
  one.
- [x] T045 [US4] Manual verification (`quickstart.md` US4 step 5, FR-023): with JavaScript disabled in the
  browser (or via `curl` following redirects), load `/terms`, `/privacy`, and `/refunds` in turn and follow
  each page's "Pricing" link; confirm each lands on `/pricing-legal` and renders the Merchant-of-Record
  clause, 14-day refund statement, and `/terms` link correctly with no JavaScript at all.
- [x] T046 [US4] Verify `git diff` on `connect-four/server/pricing.html` is **empty** after T034 — confirm
  only the route registration in `server/index.js` changed, never the file's own content (owner decision
  2026-08-01; standing constraint above).
- [x] T047 [US4] Confirm via the `paddle-docs` MCP server that no domain re-submission is required for the
  `/pricing` content change on the already-approved domain (confirmatory, non-blocking per the epic's
  Settled decision #6 — this does NOT gate the rest of the story). Record the confirmation in
  `staging_checks.md` under the same new `## Epic 3 — Entitlement & Payments Consolidation (spec 053) — added
  <date>` heading T044 creates, alongside T044's entry — not the pre-existing spec-043 Epic 3 heading.
- [x] T048 [US4] Document `GET /api/limits` in `docs/architecture/api-conventions.md` under a new "Public
  Config/Limits" subsection (or cross-referenced alongside the existing `GET /api/paddle/config` section) —
  a new, previously-undocumented server convention (a public, provider-independent config endpoint).
- [x] T049 [US4] Document the `/pricing` ↔ `/pricing-legal` split in `docs/architecture/server-conventions.md`:
  the in-app React route takeover of `/pricing`, the retained byte-stable static legal page at
  `/pricing-legal`, and the Express registration-order mechanism that makes the takeover work
  (`research.md` Decision 6).
- [x] T050 [US4] Register `tests/integration/limitsEndpoint.test.js` in `connect-four/package.json`'s
  `test:fast` script string, and `tests/dom/PricingScreen.dom.test.jsx` in the `test:dom` script string;
  verify registration per T015's method.
- [x] T051 [US4] Update `docs/open_issues.md`: OI-41 (bare static pricing page + price drift) gets a dated
  `**UPDATE <date>**` block — **not** a `RESOLVED` flip — naming exactly what remains: the retained
  `/pricing-legal` page's hand-typed price and quota literals, kept by owner decision because the page must
  stay static and JavaScript-free for a payment-provider spot-check (`research.md` Decision 11). State that
  `/pricing` itself is now fully live-sourced (FR-020/SC-004 satisfied on `/pricing`).

**Checkpoint**: US1, US2, and US4 all work independently. `/pricing` is live-data-driven; `/pricing-legal` is
reachable and byte-identical to the old `pricing.html`; CSP verified against `dist/`.

---

## Phase 6: User Story 3 - The accepted payment-identity risk is recorded as settled policy (Priority: P3)

**Goal**: The OI-55 identity-check policy reads as ratified/settled, not provisional; OI-34's analytics gap
is re-evaluated against Paddle and either closed as obsolete or fixed.

**Independent Test**: Read the OI-55 policy record — it states the decision as settled, names the two
residual risks, proposes no code change. If OI-34 is kept open and fixed, a sandboxed fallback-only purchase
writes exactly one `upgrade_completed` row.

### Implementation for User Story 3

- [x] T052 [US3] Update `docs/architecture/server-conventions.md` §"Identity binding on `transaction.completed`
  (OI-55)": replace the closing "this was an unreviewed judgment call... treat this section as a proposal to
  sanity-check, not settled policy" paragraph with a dated (2026-07-31) ratification paragraph naming the two
  accepted residual risks verbatim — "an attacker granting paid access to an account they don't control (at
  their own financial expense)" and "laundering a chargeback-prone payment onto a third party's account"
  (FR-016). No code in this section changes (FR-017). Confirm afterward that no remaining "treat this as
  unreviewed" language exists anywhere in the section (SC-006).
- [x] T053 [US3] Re-evaluate OI-34 (originally written against the removed Stripe integration) against
  `connect-four/server/paddleProcessor.js`'s `verifyTransaction` (the current sync-activation fallback):
  confirm whether it still applies the `tier: 'paid'` write without inserting the `tracks` `upgrade_completed`
  row that `handleWebhook` writes (`research.md` Decision 8; `docs/architecture/server-conventions.md` §
  "Activation: webhook primary + `verify-transaction` fallback"). Record the finding (still applicable /
  obsolete) before proceeding to T054.
- [x] T054 [US3] If T053 finds the gap still applies (per FR-018/FR-019): implement an idempotent
  `upgrade_completed` write in `connect-four/server/paddleProcessor.js`'s `verifyTransaction`, guarded
  against double-writing when the webhook also later lands for the same transaction — check against the
  existing `payment_events` ledger row for that transaction id (already keyed by `event_id`, no new table)
  before inserting. Fire-and-forget, matching the existing `writeTier` pattern (Constitution Principle V). If
  T053 instead finds the gap obsolete, skip this task and record why in T056 directly.
- [x] T055 [P] [US3] Extend `connect-four/server/paddleProcessor.test.mjs` (if T054 was performed) to cover:
  `verifyTransaction` writes exactly one `upgrade_completed` row on a fallback-only activation; a subsequent
  webhook delivery for the same transaction does not insert a second row.
- [x] T056 [US3] Update `docs/open_issues.md`: re-map OI-34 with a dated `**UPDATE <date>**` re-pointing its
  Area to `paddleProcessor.js`'s `verifyTransaction`/`handleWebhook` (noting the Stripe-era description is
  historical only) — mark `✅ RESOLVED <date>` if T054 shipped the fix, or record the obsolete finding with
  its evidence if T053 found no gap remains.
- [x] T057 [US3] Update `docs/open_issues.md`: close OI-55 as `✅ RESOLVED <date>`, citing the ratification
  paragraph landed in T052 (`docs/architecture/server-conventions.md`) as the closeout evidence —
  documentation-only closure, no code symbol.

**Checkpoint**: US1, US2, US4, and US3 all work independently. OI-55's policy reads settled;
`paddleProcessor.test.mjs` (if extended) is green.

---

## Phase 7: User Story 5 - Paying mid-set doesn't erase the set the player just finished (Priority: P3)

**Goal**: A purchase started from `/summary` preserves that set's results across the checkout round trip,
including a full app restart, without disturbing the existing `returnPathOverride='/setpicker'` fallback or
reintroducing a stale purchase outcome (OI-59 regression).

**Independent Test**: Start a purchase from `/summary`, complete it (including with a full app restart mid-flow),
confirm the same results render on return; corrupt the persisted state and confirm the existing fallback still
applies.

### Implementation for User Story 5

- [x] T058 [US5] In `connect-four/src/screens/PostSetSummaryScreen.jsx`, before invoking
  `Paddle.Checkout.open()` for a purchase started from this screen, write
  `{ nonce: crypto.randomUUID(), results, category }` to a fixed `sessionStorage` key (e.g.
  `'pendingSetResults'`) — `data-model.md`'s "Preserved set results" entity. `sessionStorage`, not
  `localStorage`, is the deliberate mechanism: it survives a full page reload/app restart within the same
  tab without leaking across tabs or sessions.
- [x] T059 [US5] **Re-targeted (blocking issue 1 — the original design pointed at a module that is wiped on
  restart).** `connect-four/src/lib/checkoutReturnFlow.js`, read at source: it is a plain in-memory
  module-level `let state = 'idle'` with four string values and no payload field. On a genuine cold boot
  (the app fully closed and reopened, per FR-029/SC-005/US5 AC2) that variable re-initializes to `'idle'` and
  holds nothing from before — it cannot carry a nonce across a restart, and it must **not** be widened to try
  (its header comment names `useUpgradeCheckout.js` as sole writer and `CheckoutReturnBanner.jsx` as pure
  reader, and all five `UpgradeModal` call sites depend on its existing `idle|confirming|activated|failed`
  contract plus the OI-59 replay-on-subscribe/`resetCheckoutReturnState()` behavior — do not add a payload
  field to it). Investigate, then implement whichever of these two carriers actually works, without touching
  `checkoutReturnFlow.js`:
  - **Preferred:** thread the T058 nonce through the checkout **return path** instead —
    `useUpgradeCheckout(returnPathOverride)` (`connect-four/src/lib/useUpgradeCheckout.js`) builds
    `const returnPath = returnPathOverride || window.location.pathname` and sends it to the server as part of
    `POST /api/paddle/create-checkout`'s `{ plan, returnPath }` body; a URL-shaped value survives a full
    restart where in-memory state does not. Have `PostSetSummaryScreen.jsx` pass a
    `returnPathOverride` that embeds the nonce (e.g. `` `/setpicker?resultsNonce=${nonce}` ``, consistent with
    its existing SESSION_ONLY-screen fallback to `/setpicker`). Before committing to this path, confirm at
    source whether anything in the app actually navigates to that URL on checkout completion —
    `useUpgradeCheckout.js`'s `handleCheckoutCompleted` deliberately does **not** forward `successUrl` to
    `Paddle.Checkout.open()` and instead closes the overlay itself once its own `verify-transaction` call
    resolves, specifically so Paddle's own redirect never fires (FR-003/US2 AC1). If nothing in the current
    architecture would land the freshly-booted app on that URL with the query param intact, this carrier does
    not actually solve the cold-boot case — fall through to the alternative below instead of shipping a
    carrier that looks plausible but is never read.
  - **Acceptable alternative:** drop the nonce/return-flow coupling entirely. Have T060 self-validate the
    `sessionStorage` entry written by T058 directly — a freshness timestamp (e.g. reject if older than some
    bounded window) plus a category/shape match against the current app state — with no dependency on
    `checkoutReturnFlow.js` or any return-path threading at all.
  Record which carrier was actually used (and why the other was rejected) as a comment at the T060 call site,
  so a future reader doesn't "helpfully" reintroduce the rejected one.
- [x] T060 [US5] On `PostSetSummaryScreen.jsx`'s mount effect, read the `sessionStorage` entry (T058) and
  validate it via whichever carrier T059 established (a matching `resultsNonce` query param on the current
  URL, or T059's self-validation timestamp/category check); if valid, restore the results and clear the
  stored entry (FR-030). If the entry is missing or fails validation, fall through unchanged to the existing
  `returnPathOverride='/setpicker'` fallback (FR-031 — do not remove or alter that fallback, only make it a
  true fallback instead of the only path).
- [x] T061 [P] [US5] Extend `connect-four/tests/unit/checkoutReturnFlow.test.js` (or a new
  `connect-four/tests/unit/pendingSetResults.test.js` if T059's chosen carrier lives outside
  `checkoutReturnFlow.js` entirely — register whichever file per the Standing constraints note): a valid
  nonce round-trip restores the persisted results after a **simulated genuine cold boot** — reset
  `checkoutReturnFlow.js`'s module-level `state` to its initial `'idle'` (e.g. via `resetCheckoutReturnState()`
  or a fresh module import, not just letting a mounted component re-render) AND re-seed `sessionStorage` as
  if freshly read after a real reload, then mount `PostSetSummaryScreen.jsx` cold and assert the results
  restore. This must be a distinct test from, and must not be satisfiable by, a mere component **remount**
  with the store's in-memory state left untouched — a remount-only test is exactly what would let a broken
  T059 ship green (per the critique). Also assert: a missing/invalid nonce falls back to `/setpicker`
  unchanged; completing one purchase and later reopening the upgrade modal in the same session does not
  resurface the first purchase's outcome (the existing OI-59 replay-on-subscribe fix must keep holding —
  re-run, don't just eyeball, per `quickstart.md`'s US5 step 4).
- [x] T062 [US5] Update `docs/open_issues.md`: close OI-25 (paying from `/summary` loses the summary) as
  `✅ RESOLVED <date>`, citing the `sessionStorage` nonce persistence in `PostSetSummaryScreen.jsx` as what
  shipped.

**Checkpoint**: All five user stories are independently functional. `npm run test:fast` green.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Full-suite verification and backlog-bookkeeping sweep across all five stories.

- [x] T063 Run `cd connect-four && npm run test:fast` — confirm it stays fully green after every story's
  changes (never `npm test` — see Standing constraints above).
- [x] T064 [P] Run `cd connect-four && npm run test:dom` — confirm all new/existing DOM tests pass together.
- [x] T065 [P] Add an entry for spec 053 to `specs/index.md` per the project's documentation-index
  convention (`CLAUDE.md` §Documentation index).
- [x] T066 Spot-check that all six `docs/open_issues.md` closeouts from this epic (OI-66 T016, OI-39 T031,
  OI-41 T051, OI-55 T057, OI-34 T056, OI-25 T062) each follow the Issue closeout convention format defined
  in `docs/epics/open-issues-epics.md`'s top matter (RESOLVED-with-date-and-evidence, or a dated UPDATE
  naming exactly what remains) — a shipped fix with a stale or malformed backlog entry is an incomplete
  story per that convention.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup being at least started (T001 is informational, not blocking) —
  BLOCKS US1 and US2 (both consume `entitlementForRequest`/`computeEntitlement`).
- **US1 (Phase 3)**: Depends on Foundational (T002). Zero dependency on US2 — can ship alone.
- **US2 (Phase 4)**: Depends on Foundational (T002). Independent of US1's completion, though both touch
  `server/entitlement.js`'s consumers (no file conflict — US1 touches `lessonEntitlement.js`/`index.js`'s
  lesson route; US2 touches `userRoutes.js`/`src/lib/entitlement.js`/the five call sites).
- **US4 (Phase 5)**: Independent of US1/US2/US3/US5 at the code level (new route, new screen, static file
  edits) — no shared files with any other story.
- **US3 (Phase 6)**: Fully independent — touches only `server-conventions.md` and (conditionally)
  `paddleProcessor.js`/its test file, none of which any other story touches.
- **US5 (Phase 7)**: Independent — touches `PostSetSummaryScreen.jsx` (shared with T023's tier-read migration
  in US2, but a different code region of the same file — sequence T023 before T058–T060 if worked by the
  same person to avoid a merge conflict, not a functional dependency).
- **Polish (Phase 8)**: Depends on all five stories being complete.

### User Story Dependencies

- US1 (P1): Foundational only.
- US2 (P1): Foundational only. Independently testable and shippable without US1, though US1 ships first in
  this plan's delivery order.
- US4 (P2): No dependency on any other story.
- US3 (P3): No dependency on any other story.
- US5 (P3): No dependency on any other story (shares one file, `PostSetSummaryScreen.jsx`, with US2 — see
  above).

### Parallel Opportunities

- T003 can run alongside nothing else in Foundational (it depends on T002) but is the only task there.
- Within US1: T005/T007 (tests) in parallel with each other once T004/T006 land; T008/T009/T010 (three
  screen guards) fully parallel (different files); T011/T012/T013 (three DOM tests) fully parallel once
  their respective guards land.
- Within US2: T022–T026 (five call-site migrations) fully parallel (different files) once T019 lands.
- Within US4: T035/T036/T037 (three static-page link re-points) fully parallel; T032a/T032b (i18n key
  additions, different files) fully parallel with each other and with T032/T033; T033/T043 parallel once
  T032/T040 land respectively; T043 additionally depends on T032a (real i18n keys to assert against).
- Across stories: once Foundational (Phase 2) is done, US1, US2, US4, US3, and US5 can all be staffed and
  worked in parallel — none share a blocking file dependency (see Phase Dependencies above for the one soft
  file-overlap caution between US2 and US5).

---

## Parallel Example: User Story 2

```bash
# Once T019 (src/lib/entitlement.js) lands, launch all five call-site migrations together:
Task: "Migrate connect-four/src/screens/SettingsScreen.jsx tier read to getEntitlement()"
Task: "Migrate connect-four/src/screens/PostSetSummaryScreen.jsx tier read to getEntitlement()"
Task: "Migrate connect-four/src/screens/SagaScreen.jsx tier read to getEntitlement()"
Task: "Migrate connect-four/src/components/DeepRevealPane.jsx tier read to getEntitlement()"
Task: "Migrate connect-four/src/lib/useLessonLockGuard.js tier read to getEntitlement()"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup) and Phase 2 (Foundational — `server/entitlement.js`).
2. Complete Phase 3 (US1 — the lesson-content leak, the epic's namesake problem).
3. **STOP and VALIDATE**: `curl` a paid lesson id signed-out; confirm no `slides`; confirm the three lesson
   screens don't crash on the locked stub.
4. This alone closes OI-66 and is independently shippable.

### Incremental Delivery

1. Setup + Foundational → foundation ready.
2. US1 → validate → ship (closes OI-66).
3. US2 → validate → ship (closes OI-39; every entitlement decision in the app now agrees, SC-002).
4. US4 → validate → ship (closes/updates OI-41; `/pricing` live, `/pricing-legal` retained).
5. US3 → validate → ship (closes OI-55, re-maps/closes OI-34).
6. US5 → validate → ship (closes OI-25).
7. Polish (Phase 8) → full-suite regression + backlog audit.

### Parallel Team Strategy

Once Foundational (Phase 2) is done, up to five people can take US1, US2, US4, US3, and US5 independently —
no story blocks another at the file level (the one soft overlap: US2's T023 and US5's T058–T060 both touch
`PostSetSummaryScreen.jsx`; sequence within that file if the same person isn't doing both).

---

## Notes

- [P] tasks touch different files with no unfinished dependency between them.
- [Story] labels map every implementation task to its user story for traceability back to spec.md.
- Verify every new test fails for the right reason before the implementation task that makes it pass lands
  (`docs/architecture/testing-conventions.md`'s "break the branch on purpose" rule, called out explicitly in
  T011).
- `docs/open_issues.md` closeout tasks (T016, T031, T051, T056, T057, T062) are **implementation-time work**,
  not a final cleanup pass — each lands in the same change as the story it closes out, per FR-028 and the
  epic's Issue closeout convention.
- Every architecture-doc edit task (T014, T028, T028a, T029, T048, T049, T052) is part of the definition of
  done for its story, per Constitution Principle VIII — not optional polish. T028a additionally prevents the
  stale doc from actively instructing future work back into the pattern this epic removes.
- T032a/T032b (i18n keys for `/pricing` and the new footer link) must land before T040/T042 consume them and
  before T043 asserts against them — a missing key falls back to English **silently, with no failing test**,
  so these are not late-polish tasks despite their letter-suffixed IDs (added post-critique, appended in
  place rather than renumbered per this file's renumbering convention).
