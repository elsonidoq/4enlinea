# Phase 0 Research: Entitlement & Payments Consolidation

All decisions below are grounded either in the epic's own Settled decisions (cited verbatim, not
re-derived) or in source verified this session. Where a claim was previously "verified within the hour"
per the handoff and not independently re-verified by this plan, that is stated explicitly.

## Decision 1 — Entitlement module: consume `req.user`, do not re-query the DB per call; export a
request-taking production API

**Decision**: `connect-four/server/entitlement.js` exports two functions:
- `entitlementForRequest(req)` — the **sole exported production entry point**. Reads `req.user` (populated
  by the global `loadUser` middleware from a real `users.tier` DB read on every request) and returns
  `{ entitled: boolean, authenticated: boolean }`.
- `computeEntitlement(user)` — an internal, test-only pure function taking a bare `{ tier?: string } | null`
  and returning the same shape. `entitlementForRequest` is a thin wrapper: `computeEntitlement(req.user)`.

Neither function issues its own Supabase query (`server/index.js:504-531`, verified this session:
`let { data: profile } = await supabase.from('users').select(USER_PROFILE_SELECT_COLUMNS).eq('id',
data.user.id).single();` — `USER_PROFILE_SELECT_COLUMNS` includes `tier`, per `api-conventions.md` Auth
Threading).

**Why a `req`-taking exported API (owner decision, superseding the plan's original bare-`computeEntitlement`
export)**: a pure function over a loose `{ tier }` object is textually indistinguishable from
`getSubscriptionStatus({ tier })` — the very function this epic supersedes because its input carries no
structural guarantee of DB provenance (its own tests pass literal tier strings). Exporting
`entitlementForRequest(req)` as the production API makes DB-sourced input **structural**, not a comment a
future caller has to remember to honor: nothing outside `entitlement.js` itself can construct a `req.user`
object without going through `loadUser`. `computeEntitlement(user)` still exists, but only as the pure core
`entitlementForRequest` and unit tests call — `docs/architecture/api-conventions.md`'s new entitlement
section MUST say so explicitly, so a future reader doesn't "simplify" by exporting the pure function as the
production entry point again.

**Rationale**: The epic's Non-obvious facts say the new module "must actually read `users.tier` from the
DB" — but `loadUser` already does exactly that, once, before every single request, including
`GET /api/lessons/:id` and `GET /api/user/entitlement`. A second DB read inside the entitlement module
would re-fetch the identical row within the same request with zero freshness benefit — pure redundant I/O,
which Principle II (Code Quality & Simplicity) rules out ("no defensive error handling for scenarios that
cannot occur"). The phrase is best read as distinguishing the new module from `getSubscriptionStatus`
(`server/paymentProcessor.js`), whose `tier` argument is caller-supplied with **no** guarantee it traces to
a DB read at all (tests pass literals) — the new module's guarantee is that its input is *always* DB-sourced,
which `req.user` already is, by construction of the global middleware.

**FR-010 fail-closed contract**: `computeEntitlement` wraps its own logic in try/catch and returns
`{ entitled: false, authenticated: false }` on any unexpected condition (missing/malformed `user` shape)
rather than throwing — this is what "the authoritative entitlement computation cannot complete on the
server" means at the module level, since `loadUser` itself never throws upward (it already degrades any
DB/auth failure to `req.user = null`, which reads as unentitled through the normal `!user` path, not a
special "failure" path). `entitlementForRequest(req)` inherits this contract unchanged, since it is a thin
wrapper.

**`authenticated` field (added per Decision 4 below)**: `authenticated = user != null` — distinct from
`entitled`, which additionally requires `user.tier === 'paid'`. This lets a signed-in free-tier caller
(`{ entitled: false, authenticated: true }`) be distinguished from a session-lapsed or anonymous caller
(`{ entitled: false, authenticated: false }`) by every consumer, closing the session-lapse hole described in
Decision 4.

**Alternative rejected**: Have the module accept a bare `userId` and perform its own
`supabase.from('users').select('tier').eq('id', userId).single()`. Rejected because it duplicates
`loadUser`'s read with no freshness gain within a single request, adds a genuine new DB-failure mode where
none is needed, and contradicts FR-008's spirit (no unnecessary indirection between decision points).

**⚠️ Flagged for the next agent**: this is an interpretation call, not a literal quote from the epic — the
epic's exact words ("must actually read `users.tier` from the DB") could be read either way. If the owner
intended a fresh, independent-of-`loadUser` DB read (e.g. for a future non-Express caller), Decision 1
should be revisited before implementation.

## Decision 2 — Client entitlement helper wraps the new endpoint, not `store.getProfile()`

**Decision**: `src/lib/entitlement.js` is a new plain `.js` module (not JSX — same
`node:test`-parseable-module pattern as `checkoutReturnFlow.js`/`onboardingRouting.js`/
`postLoginReturn.js`, all cited in `frontend-conventions.md`) exposing:
- `getEntitlement()` → `Promise<{ entitled: boolean }>` — returns a cached answer if fresh, else fetches
  `GET /api/user/entitlement` with `credentials: 'include'`.
- `invalidateEntitlement()` — clears the cache, forcing the next `getEntitlement()` call to re-fetch.

**Rationale**: US2 Acceptance Scenario 1 requires the client to "discard the stale cached answer and fetch
a fresh one" specifically when "the account's paid status was just changed on the server" — i.e. the
client's local `store.getProfile()` cache (which is only refreshed through the normal auth/profile flow,
per OI-39's own text) is exactly the stale signal this epic is replacing. Wrapping the *new server
endpoint* (not the profile store) is what makes this a genuinely fresher, single source of truth distinct
from all five current reads.

**Cache TTL**: 5 minutes (`ENTITLEMENT_CACHE_TTL_MS = 5 * 60 * 1000`), a judgment call — the Settled
decision only requires "short-TTL," does not specify a number. Flagged for owner review during
implementation if a different window is preferred; not a blocking ambiguity (any value between ~1–15
minutes satisfies "bounded" per FR-011 and doesn't change the design).

**Fail-open contract (FR-013)**: module-level `let lastKnownGood = null`. On a successful fetch,
`lastKnownGood = { entitled, fetchedAt }`. On a failed fetch (network error, non-2xx `500`), return
`lastKnownGood` if set, else `{ entitled: false }`. A clean `401`/`200 { entitled: false }` response (the
anonymous case — see Decision 4) is **not** a failure; it is a valid, cacheable "no" answer and updates
`lastKnownGood` normally.

**Invalidation trigger placement (FR-012)**: `checkoutReturnFlow.js`'s `setCheckoutReturnState('activated')`
call site — inside `useUpgradeCheckout.js`'s `checkout.completed` handler, the module that already owns the
sole `POST /api/paddle/verify-transaction` call (`server-conventions.md` "Activation: webhook primary +
verify-transaction fallback") — is the single choke point every checkout completion passes through
regardless of which of the 5 `UpgradeModal` call sites opened it. Calling `invalidateEntitlement()` there,
alongside the existing `setCheckoutReturnState('activated')` call, covers FR-012's "immediately upon
returning from a completed checkout/purchase flow" for all 5 call sites at once, with no per-call-site
wiring needed beyond each site already re-fetching entitlement via the migrated helper (Decision 5).

## Decision 3 — Locked-lesson response is a pure function, following the `blunderDetailResponse.js` precedent

**Decision**: `connect-four/server/lessonEntitlement.js` exports
`buildLessonResponse(lesson, entitlement)` — a pure function taking the full in-memory lesson object (as
returned by `getLesson(id, locale)`, unchanged) and an `{ entitled: boolean, authenticated: boolean }`
answer, returning either the full lesson (unchanged) or the redacted stub `{ id, title, order, free,
locked: true, authenticated }` per FR-002/Settled decision #7 (extended with `authenticated` per Decision 4
below). The `GET /api/lessons/:id` handler (`server/index.js:674-679`) calls `getLesson()` (unchanged) then
`entitlementForRequest(req)` (the production entry point, not the internal `computeEntitlement` — Decision 1)
then `buildLessonResponse(lesson, entitlement)`.

**Rationale**: `testing-conventions.md`/`server-conventions.md` establish that `index.js` "is a monolith with
no exportable Express app builder" (verified this session — `tests/integration/blunderPermalinkContext.test.js`'s
own header states this explicitly and drives `buildBlunderDetailResponse`/`fetchBlunderDetailContext`
directly rather than booting a server). `lessonEntitlement.js` follows the identical shape-builder-as-pure-
function pattern so US1's integration test can assert the exact response contract (`slides` absent, not
`null`, not `[]`) without a real HTTP server or DB.

**Why not gate inside `lessonLoader.js`**: `lessonLoader.js` is documented as a boot-time, request-agnostic
cache (`getLessons()`/`getLesson()` "return from the in-memory cache only — no filesystem reads at request
time"). It has no concept of the calling user; folding entitlement logic into it would give a pure content
loader an auth dependency it doesn't otherwise have, and would make it harder to keep `lessonLoader.js`
testable via `tests/lessons/opening-lessons.test.js`'s existing load-by-id pattern.

**All three real consumers of `GET /api/lessons/:id` must be updated, not just `CLChallengeScreen.jsx`**:
grep-verified this session — `GET /api/lessons/:id` is fetched from three screens, not one:
`src/screens/ConceptScreen.jsx:46`, `src/screens/SocraticScreen.jsx:38`, and
`src/screens/CLChallengeScreen.jsx:27`. `ConceptScreen.jsx` indexes `lesson.slides[slideIndex]` unguarded at
lines 78/89/100/166 — a `{ locked: true }` stub (no `slides` key) throws a `TypeError` there today if this
plan added only the server-side gate and stopped. All three screens need a `locked === true` check that
renders the existing upgrade-prompt affordance instead of indexing `slides`, plus one component test each
(US1 task list, and plan.md's Source Code map). This was the single biggest gap in the original plan
(reviewer Blocking issue 2) — the server-side contract alone is necessary but not sufficient; Principle IV
("locked paid-tier content MUST always render a preview card... MUST NOT be invisible or produce an error")
is only satisfied once all three client consumers handle the new shape.

## Decision 4 — `GET /api/user/entitlement` answers anonymous callers with `200 { entitled: false,
authenticated: false }`, not `401`; a session lapse triggers one bounded refresh before the client accepts a
downgrade

**Decision**: Diverging deliberately from the `/api/user/*` ownership-invariant convention ("Every
`/api/user/*` endpoint MUST check `req.user` at the top of the handler and return `401` if null" —
`api-conventions.md` §"`/api/user/*` ownership invariants"), `GET /api/user/entitlement` returns `200` for
an anonymous caller instead of `401`, with body `{ entitled: false, authenticated: false }`.

**Rationale for the 200-not-401 convention**: "Is this caller entitled" is a well-formed, non-error question
for an anonymous caller — the answer is simply "no," matching the pattern-matching gate already used
elsewhere for exactly this shape of question (`userCanAccessCategory(user, categoryId)` returns `false` for
`user == null`, not a thrown error). Every consumer of `getEntitlement()` (Decision 2) needs a boolean, not
an error branch, to decide whether to show an upgrade prompt — an anonymous visitor browsing a locked lesson
preview is the single most common caller of this endpoint. This exception MUST be called out explicitly in
`api-conventions.md`'s new `GET /api/user/entitlement` section (task requirement, Principle VIII) so a
future reader of the ownership invariant doesn't "fix" it into a `401`.

**The session-lapse gap this closes**: without the `authenticated` field, an expired auth cookie is
indistinguishable from a genuinely free/anonymous account — `loadUser` degrades any DB/auth failure to
`req.user = null`, so the endpoint returns a perfectly successful `200 { entitled: false }`, and because the
status is `200` not `401`, `src/lib/fetchWithAuthRetry.js` (which triggers only on `res.status === 401`)
never fires and the session is never repaired. A paying customer whose cookie merely lapsed would see their
UI downgrade to "locked" and stay that way.

**Fix**: the response gains `authenticated: boolean` (`= user != null`, independent of `tier` — see Decision
1). The client helper (`src/lib/entitlement.js`, Decision 2) treats `{ authenticated: false }` **while it
holds a `lastKnownGood` of `entitled: true`** as a signal to attempt one bounded session refresh — `POST
/api/auth/refresh` + retry, reusing `fetchWithAuthRetry.js`'s existing bounded (single-retry) pattern rather
than inventing a new one — before accepting the downgrade and overwriting `lastKnownGood`. Only if the
refresh attempt also comes back `authenticated: false` does the client accept `entitled: false` as the new
settled answer. An anonymous caller with no prior `lastKnownGood` (the common "never signed in" case) skips
the refresh attempt entirely and accepts `{ entitled: false, authenticated: false }` immediately — there is
nothing to refresh. This preserves the 200-for-anonymous convention above; it does not reintroduce a `401`
branch.

**Same reasoning applies to the locked-lesson stub (US1)**: `buildLessonResponse` (contracts/lessons.md)
also carries `authenticated` on its `locked: true` stub, for the identical reason — a lesson screen must not
treat a session-lapse-caused `locked: true` as a settled "this account is free tier" answer either. See
data-model.md's "Lesson (locked view)" entity and contracts/lessons.md.

## Decision 5 — Migration order for the five call sites: entitlement module → endpoint → client helper → call sites, in one change

**Decision**: Sequence US2 as: (a) `server/entitlement.js` (Decision 1); (b) `GET /api/user/entitlement`
wrapper in `userRoutes.js`; (c) `src/lib/entitlement.js` client helper (Decision 2); (d) migrate all five
call sites — `src/screens/SettingsScreen.jsx:108`, `src/screens/PostSetSummaryScreen.jsx:79`,
`src/screens/SagaScreen.jsx:191`, `src/components/DeepRevealPane.jsx:283`,
`src/lib/useLessonLockGuard.js:58` (all five confirmed present at these exact expressions this session,
matching the epic's Non-obvious facts verbatim) — in the same change, per the epic's Settled decision #1
("do not refactor the call sites piecemeal to close the issue"). US1 (the lesson-content gate) depends only
on (a), not on (b)/(c)/(d), and can ship independently per its own Independent Test — but this plan
sequences US1 before US2 in delivery order anyway (matching spec priority P1/P1 tie, broken by "the epic's
namesake problem" framing) since US1 has zero client dependencies and de-risks the module's core contract
first.

**Confirmed NOT tier readers** (do not touch): `src/screens/sagaLock.js`'s `deriveLockReason(lesson,
lessons, progress, tier)` — receives `tier` as a parameter, verified this session (`grep -n
"deriveLockReason"` — the epic's claim holds); `src/store/CheckoutReturnBanner.jsx` — zero `.tier`
references, verified this session.

## Decision 6 — `/pricing` route takeover touches four files, not three

**Decision**: Beyond the epic's three cited structural files (`src/lib/urlMapping.js`'s `URL_MAP`,
`src/lib/screenRegistry.jsx`'s `SCREENS` map, `App.jsx`'s `pushState`-based `go()`), this session found a
**fourth**: `connect-four/src/components/LegalFooter.jsx` renders `{ href: '/pricing', label:
t('footer.pricing') }` as a plain `<a href>` with an explicit comment: "Links to the server-served static
legal pages (/pricing, /terms, /privacy, /refunds). These live outside the SPA, so they must be plain
`<a href>`..." That comment becomes **false** the moment `/pricing` becomes an in-app SPA route — the entry
must change from a plain `<a href="/pricing">` to a `go('pricing')` call (matching how every other in-app
screen link in this codebase navigates, per "Sole navigation mechanism": `go(screenKey, params)` is the
only way to navigate between screens — no `<a href>` for SPA routes). A new entry, `{ href: '/pricing-legal',
label: t('footer.pricingLegal') }`, is added as a plain `<a href>` (matching `/terms`'s existing style,
since `/pricing-legal` genuinely is a server-rendered static page outside the SPA) — this is the "linked
from the footer alongside `/terms`" placement the epic specifies for the retained legal page.

**Server-side route change** (`server/index.js:4088`, verified this session — exact line
`app.get('/pricing', (_, res) => res.sendFile(join(__dirname, 'pricing.html'), LEGAL_PAGE_OPTS));`): change
the path from `/pricing` to `/pricing-legal`, keep the same `pricing.html`/`LEGAL_PAGE_OPTS` handler body
unchanged. Do not add a *new* route alongside the old one — the old `/pricing` registration must be removed
entirely so the SPA catch-all (registered later, per "SPA Catch-all Route"'s documented registration order:
all `/api/*` → static assets → catch-all last) picks up `/pricing` and serves `index.html`, which the client
then resolves via `parseUrl('/pricing')` → the new `URL_MAP` entry → `PricingScreen`. This is the exact
mechanism `server-conventions.md`'s "Registration order... enforced by Express route order" describes:
"Whichever handler is registered first at a given path wins."

## Decision 7 — New `GET /api/limits` endpoint decouples the quota figure from Paddle's availability

**Decision**: Add a new, always-200, public endpoint `GET /api/limits` returning
`{ freeDeepRevealWeeklyLimit: number }`, sourced directly from `server/quotaLimits.js`'s existing
`FREE_DEEP_REVEAL_WEEKLY_LIMIT` export (no new constant, no duplicated value) — registered in `server/index.js`
near the other public resource routes, following the `/api/<resource>` naming convention (`api-conventions.md`
§Route Naming: "Public puzzle/game routes use `/api/<resource>`"). Not gated behind `PADDLE_API_KEY` and not
folded into `GET /api/paddle/config`'s response.

**Rationale (the "known gap" this plan must resolve)**: the handoff's flagged gap is real — no live endpoint
exposes `FREE_DEEP_REVEAL_WEEKLY_LIMIT` today (`quotaLimits.js` is imported only by `server/index.js`'s
quota-check handlers, verified this session: `grep` finds no client-facing route reading it). The natural-
seeming alternative — add the field to `GET /api/paddle/config`'s response, since the pricing page already
fetches that endpoint for prices — is rejected: that endpoint 503s ("Payments not configured") whenever
`PADDLE_API_KEY` is unset (`api-conventions.md` §"Paddle Checkout Config"), which would make the quota figure
unavailable for a reason that has nothing to do with the quota itself. `FREE_DEEP_REVEAL_WEEKLY_LIMIT` is a
static server constant with no Paddle dependency; conflating its availability with Paddle's configuration
state is exactly the kind of accidental coupling Principle VII ("special cases aren't special enough to
break the rules") warns against. A separate, always-available endpoint also means the pricing page's FR-022
degraded state (which is specifically about *live pricing data*, i.e. prices) does not have to special-case
"prices unavailable but quota still fine" vs. "everything unavailable."

**Degraded state for the quota figure specifically**: if `GET /api/limits` itself fails (a genuine server
error, not a designed 503), `PricingScreen` falls back to a generic phrase without a number (e.g. "a generous
weekly allowance") rather than showing a stale/hardcoded figure — this keeps FR-020's "no fixed, hand-typed
... quota figure" invariant even in the failure path. This is a UX judgment call for the tasks/implement
phase, not a re-litigated requirement.

## Decision 8 — OI-34 is re-mapped, not obsolete; the fix targets `paddleProcessor.js`'s `verifyTransaction`

**Decision**: OI-34 ("fallback-only checkout activations do not record the `upgrade_completed` analytics
track") was written against the now-fully-removed Stripe integration (`stripeProcessor.js`'s
`syncCheckoutSession` vs `handleWebhook` — verified this session, `docs/open_issues.md` lines 780-791). The
architecturally identical gap exists in the current Paddle integration: `verifyTransaction` (the sync
activation fallback, `server-conventions.md` §"Activation: webhook primary + `verify-transaction` fallback",
verified this session) applies the same `tier: 'paid'` write as the webhook but explicitly does **not**
insert the `tracks` `upgrade_completed` row ("that analytics record is exclusively the webhook's to write" —
verbatim from the doc). Per FR-018, this is re-evaluated and found **still applicable** (not resolved-as-
obsolete) — the fallback-only-activation edge case (webhook never delivered at all) still produces a
correctly-tiered but analytics-undercounted account. FR-019 requires the same idempotent-per-transaction
`upgrade_completed` write `verifyTransaction` currently skips, guarded so it never double-writes when the
webhook *also* eventually lands for the same transaction (mirroring the `payment_events` ledger's `23505`
dedup pattern used elsewhere in `paddleProcessor.js`, applied here via a check against the existing ledger
row for that transaction id — no new table needed, since `payment_events` already carries every processed
event keyed by `event_id`).

**Closeout**: `docs/open_issues.md`'s OI-34 entry gets a dated `**UPDATE 2026-08-01**` (not a `RESOLVED`
flip) re-pointing its Area to `paddleProcessor.js`'s `verifyTransaction`/`handleWebhook`, stating the fix
shipped, and noting the old Stripe-era description is historical only — per the epic's own re-map
instruction ("Re-map OI-34 against Paddle's `verifyTransaction` sync-activation fallback and close it if
obsolete, or (if still applicable) keep it and add the idempotent `upgrade_completed` write").

## Decision 9 — CSP verification is a manual-plus-scripted gate, not a new automated test

**Decision**: US4's CSP verification (FR-027/SC-008) is executed as a documented manual/quickstart step —
`npm run build` in `connect-four/`, start the Express server against the built `dist/`, load `/pricing` in a
real browser, exercise the checkout CTA, and confirm zero CSP violations in devtools — appended to
`staging_checks.md` under this epic's section, not a new automated Playwright/CI check. This matches the
existing precedent for every prior CSP-affecting change in this codebase (`server-conventions.md` §"CSP
Directive Rationale": "a passing local smoke test proves nothing... test against a deployed build" — this
has always been a manual verification loop, never an automated one, because `npm run dev` cannot exercise
Express's `helmet` middleware at all).

**Directives likely needing extension for `PricingScreen`**: none beyond what Paddle.js's overlay checkout
already requires (`PADDLE_ORIGINS`, `GOOGLE_PAY_ORIGINS`, the `style-src 'unsafe-inline'` allowance) — the
new screen reuses `useUpgradeCheckout.js`'s existing overlay-open call, not a new checkout surface. The one
genuinely new thing on the page is the `GET /api/limits` fetch (Decision 7), which is same-origin
(`'self'`, already covered by `connect-src` default) and needs no new directive. This is a prediction, not a
verified fact — the task list must still include the manual verification pass per FR-027's literal
requirement ("verification performed against a built, server-served artifact"), not skip it on the strength
of this prediction.

## Decision 10 — `getSubscriptionStatus` is documented as superseded, kept for tests

**Decision**: `server/paymentProcessor.js`'s `getSubscriptionStatus({ tier, customerId })` (verified this
session: `export function getSubscriptionStatus({ tier }) { return { status: tier === 'paid' ? 'paid' :
'free' }; }`, pure, synchronous, `customerId` unused) is left in place, unchanged, with its existing "test-
only in production wiring" doc comment in `server-conventions.md` §"PaymentProcessor Seam" updated (not
deleted — FR-015 says "documented as superseded," the epic's US3.2 task list separately says "delete the
'test-only in production wiring' comment," which this plan reconciles as: replace the comment's framing from
"nothing calls this in production, by design" to "superseded for production entitlement decisions by
`server/entitlement.js` (spec 053); still exercised by `paymentProcessor.test.mjs`/the `PaymentProcessor`
substitutability tests — do not delete those tests or the function itself"). No test file changes are needed
purely for this — its existing tests keep passing unmodified, since the function's behavior is unchanged.

## Decision 11 — `pricing.html` is route-only at `/pricing-legal`; three more static pages link to
`/pricing` and must be re-pointed

**Decision**: `server/pricing.html` itself is **not edited** by this feature. The only change is the
server-side route registration: `app.get('/pricing', ...)` (`server/index.js:4088`, verified this session —
exact line `app.get('/pricing', (_, res) => res.sendFile(join(__dirname, 'pricing.html'),
LEGAL_PAGE_OPTS));`) is removed and re-registered at `/pricing-legal` with the identical handler body
(same `pricing.html`, same `LEGAL_PAGE_OPTS`). This is a **owner-ratified constraint (2026-08-01)**: the
retained legal page keeps its hand-typed price and quota literals, stays static, JavaScript-free, and
byte-stable, because Paddle already reviewed that exact wording as part of domain approval. De-hardcoding
(FR-020) scopes to `PricingScreen.jsx`/`/pricing` only. **Consequence for issue closeout**: OI-41 does NOT
get marked `RESOLVED` — it gets a dated `UPDATE 2026-08-01` naming exactly what remains unresolved (the
price and quota literals on the retained `/pricing-legal` page), per the epic's Issue closeout convention.
A task or agent that edits `pricing.html`'s content, or that flips OI-41 to `RESOLVED`, is acting against an
explicit owner decision.

**Three more static pages link to `/pricing` and DO need editing** (this is different from `pricing.html`
itself — editing a *link target* in a *different* file, not touching the retained page's content): grep-
verified this session, `connect-four/server/privacy.html:45`, `terms.html:49`, and `refunds.html:34` each
render `<a href="/pricing">Pricing</a>`. Once the React route takes over `/pricing` (Decision 6), those three
links would silently resolve to the SPA shell instead of the static legal page — defeating the entire reason
`pricing.html` is retained (a JavaScript-free copy reachable by a provider spot-check that may not run JS).
Each of the three gets its `href` changed to `/pricing-legal`. This is permitted and required; only
`pricing.html`'s own content is frozen. Verification: `quickstart.md`'s US4 section gets a step confirming
`/pricing-legal` is reachable by following a link from `/terms` with JavaScript disabled (a real no-JS
check, not just a grep, since a provider spot-check would behave the same way).
