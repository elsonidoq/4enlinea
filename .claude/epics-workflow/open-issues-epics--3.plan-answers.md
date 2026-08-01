## Blocking issue 1 — the plan orders an edit to `pricing.html` that the owner ratified as forbidden
Answer: Accept recommendation (auto-applied — no alternative)

In `plan.md`'s Source Code map, replace
`│   └── pricing.html   # US4: served at /pricing-legal instead of /pricing; de-hardcoded figures`
with
`│   └── pricing.html   # US4: route path only (/pricing → /pricing-legal); file content byte-stable, literals retained (owner 2026-08-01)`
This is the line `/speckit-tasks` consumes, so it must be right even though the Summary and quickstart step US4.4 are already correct. Add an explicit note in the plan that **OI-41's closeout is a dated UPDATE, not a RESOLVED flip** — the price and quota literals remain on the retained legal page by owner decision, so the issue stays open naming exactly what remains.

## Blocking issue 2 — the locked-lesson stub crashes its three real consumers
Answer: Accept recommendation (auto-applied — no alternative)

`GET /api/lessons/:id` is fetched by `src/screens/ConceptScreen.jsx`, `src/screens/SocraticScreen.jsx`, and `src/screens/CLChallengeScreen.jsx`. `ConceptScreen` indexes `lesson.slides[slideIndex]` with no guard, so a `{ locked: true }` stub with no `slides` throws a TypeError and yields a blank/error screen — which the project constitution's Principle IV explicitly forbids ("locked paid-tier content MUST always render a preview card... MUST NOT be invisible or produce an error"), and which the plan's own Constitution Check wrongly claims is satisfied.

Add explicit tasks under US1 for **all three** screens: detect `locked === true` and render the existing upgrade-prompt affordance instead of indexing `slides`, plus one component test per screen. **Add all three files to `plan.md`'s Source Code map** — prose in `contracts/lessons.md` is not enough, the map is what the task generator reads. Note this is not hypothetical: the guard that today prevents the fetch (`src/lib/useLessonLockGuard.js`) is client-side, and FR-013's fail-open-to-last-known-good rule deliberately widens the window where the client believes "paid" while the server says "locked".

## Blocking issue 3 — three static legal pages link to `/pricing`
Answer: Accept recommendation (auto-applied — no alternative)

`connect-four/server/privacy.html`, `terms.html`, and `refunds.html` each render `<a href="/pricing">Pricing</a>`. Once the React route takes `/pricing`, those resolve to the SPA shell — defeating the reason `pricing.html` is retained (a JavaScript-free, server-rendered copy of the Merchant-of-Record clause and refund statement reachable by a provider spot-check that may not run JS). Editing these three is permitted; only `pricing.html` itself must stay byte-stable.

Add a US4 task re-pointing those three links to `/pricing-legal`, and a quickstart check that `/pricing-legal` is reachable by following a link from `/terms` **with JavaScript disabled**.

## Decision 1 — the entitlement module's exported production entry point
Answer: Export a request-taking function; keep the pure one internal

Keep the `req.user` design and the pure core, but make the **exported production API** `entitlementForRequest(req)`. The pure `computeEntitlement(user)` becomes internal / test-only and is documented as such in `docs/architecture/api-conventions.md`. Rationale: zero extra I/O, and the DB provenance of the tier becomes **structural** rather than a convention someone must remember — which is precisely the property the epic rejected `getSubscriptionStatus({ tier })` for lacking.

Context confirmed at source by the reviewer, so the plan may rely on it: `loadUser` (`connect-four/server/index.js`) issues a real per-request `supabase.from('users').select(USER_PROFILE_SELECT_COLUMNS)` query; `USER_PROFILE_SELECT_COLUMNS` (`connect-four/server/userHelpers.js`) includes `tier`; it is registered globally BEFORE both `registerUserRoutes` and `app.get('/api/lessons/:id')`; there is no memoization. So `req.user.tier` is DB-fresh on both paths. **Do NOT flip this to a second DB query** on the strength of the epic's literal wording — that was considered and rejected.

## Decision 2 — distinguishing "session lapsed" from "signed in, free tier"
Answer: Add an `authenticated` flag and attempt a session refresh before accepting a downgrade

Add `authenticated: boolean` to the `GET /api/user/entitlement` response. The client entitlement helper must treat `{ authenticated: false }` **while it holds a last-known-good of `entitled: true`** as a session-refresh trigger: one bounded `POST /api/auth/refresh` + retry, reusing the existing bounded pattern in `src/lib/fetchWithAuthRetry.js`, before accepting the downgrade. Only if the refresh also comes back unauthenticated does the client accept `entitled: false` and overwrite its cached answer.

This preserves the `200`-for-anonymous convention research Decision 4 documented (anonymous locked-lesson previews stay a success case, not an error branch). It closes a real hole: today an expired auth cookie makes `loadUser` set `req.user = null`, the endpoint returns a perfectly successful `200 { entitled: false }`, the client caches it as a valid answer and downgrades a paying customer's UI to locked — and because the status is 200, not 401, `fetchWithAuthRetry` never fires and the session is never repaired.

Apply the same reasoning to the locked lesson stub: a `locked: true` response to a caller whose session merely lapsed must not be cached as a settled entitlement answer. Update `contracts/entitlement.md` and `data-model.md`'s "Entitlement answer" and "Client-cached entitlement answer" entities accordingly, and add a quickstart step covering the expired-session case.

## Cross-cutting instruction (from the reviewer's systemic finding)
The plan is strong on the *server* half of every seam and thin on the *client* half — blocking issues 2 and 3 are the same failure twice. **Treat `plan.md`'s Source Code map as the binding contract** and reconcile it against every prose claim in `research.md` and `contracts/`: any consumer that must absorb a new response shape or a moved URL belongs in that map, not only in prose. Research Decision 6 found one such omission (`LegalFooter.jsx`) by sweeping the SPA; the same sweep was never run over `connect-four/server/*.html` or over the lesson screens. Run it before finishing.
