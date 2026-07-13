# Staging Environment Checks

Verification items that **cannot** (or should not) be exercised in local dev and must be confirmed
against the deployed **staging** environment before a change is considered done. These are the
residue of each epic's acceptance pass: anything that depends on a real external provider, a real
cross-origin redirect round-trip, real deploy-time config/migrations, a genuinely clean signed-out
session, or production-like data.

**This file is append-only per epic.** Each epic in `polish_epic.md` records its staging-only
checks here under its own `## Epic N — <title>` heading (see the "Staging checks" section
convention in `polish_epic.md`). Do not delete an epic's section when it ships — instead tick the
boxes once the checks pass in staging, so this doc doubles as the staging sign-off log.

## How to add checks (for each epic / coordinator)

When an epic's implementation or QA pass produces a verification item that could only be partially
confirmed locally (e.g. "the return-to-target mechanism was verified via a direct fetch, but the
real OAuth redirect was not exercised"), append it here rather than marking it silently done.
For each check record:

- **What** — the concrete action to perform in staging.
- **Why staging** — why local dev could not fully confirm it.
- **Expected** — the pass condition.
- **Source** — the epic / spec / FR it traces to.
- A `- [ ]` checkbox to tick on sign-off (with tester + date).

---

## Epic 3 — Global UI/UX & Accessibility Polish (spec 043)

- [ ] **Real OAuth return-to-destination round-trip.**
  - **What**: While genuinely signed out in staging, tap the Home "Past games" card → complete a
    **real** external sign-in (full `staging-frontend → staging-server → external IdP → staging-frontend`
    redirect). Confirm you land on the **Past Games** list, not Home, and that the
    `postLoginReturnTo` sessionStorage key is gone afterward.
  - **Why staging**: Local dev verified the consumption path only via a direct `/api/auth/anonymous`
    fetch (the identical `Navigator` `session`-effect code path). The actual external redirect
    (with reCAPTCHA / real IdP) cannot be automated locally, and `sessionStorage` survival across a
    real cross-origin redirect round-trip was never exercised end-to-end. (Spec 043 FR-013, T016.)
  - **Expected**: User lands on Past Games within one sign-in flow; no dead-end; stash key cleared.
  - **Source**: Epic 3 / spec 043 US3, FR-013.

- [ ] **Dismiss-then-unrelated-login does not redirect (real sign-in).**
  - **What**: Signed out, tap a gated CTA → dismiss the AuthModal without signing in → browse
    elsewhere → sign in via a **real** OAuth flow from an unrelated entry point (profile icon).
    Confirm you land on the default screen (Home), NOT the earlier abandoned destination.
  - **Why staging**: Verified locally only with the dev-skip button; the real redirect path was not
    exercised. This is the highest-value correctness case in the feature (FR-014).
  - **Expected**: No silent redirect to the abandoned CTA's destination.
  - **Source**: Epic 3 / spec 043 US3, FR-014.

- [x] **Signed-out Stats "Sign up to track your progress" button affordance.** — **RESOLVED
  LOCALLY 2026-07-10; no longer requires staging.**
  - **What**: In a genuinely signed-out session, open Stats and confirm the "Sign up to track your
    progress over time" control renders as a button (background/border + hover/active/focus states)
    and, when tapped, opens the sign-in prompt.
  - **Why it was here**: Local dev originally could not reach a clean signed-out state (the httpOnly
    session cookie can't be cleared from DevTools), so this element's signed-out visual was only
    inferred from shared `className` with the "Review past mistakes" button.
  - **How it was closed**: The dev-only "🛠 Dev: clear IndexedDB & sign out" button on the Settings
    screen (localhost-only) now drops the session cookie + clears local data, giving a real
    signed-out state locally. Confirmed by direct screenshot: the element renders as a button
    (tan/beige background, rounded corners) and is exposed as `role=button`; the tap opens AuthModal
    and stashes `{screenKey:'stats'}` (Batch 2).
  - **Source**: Epic 3 / spec 043 US2 (FR-011) + US3 (FR-015).

<!-- Epics 4–8: append your staging-only checks below under a `## Epic N — <title>` heading. -->

## Epic 5 — Account: Session Persistence & Paid Checkout (spec 045)

- [ ] **Supabase dashboard session/inactivity-timeout verification.**
  - **What**: In the Supabase project dashboard (Authentication → Sessions / Auth settings), confirm
    the identity provider's own session-timeout / inactivity-timeout configuration permits the full
    60-day rolling window the app now relies on (`REFRESH_TOKEN_MAX_AGE = 60 * 24 * 3600_000` in
    `connect-four/server/index.js`). If Supabase's own session lifetime or inactivity timeout is set
    shorter than 60 days, the app's cookie can outlive the identity provider's own session and a
    "silent refresh" will fail even though the cookie hasn't expired.
  - **Why staging**: This is an external identity-provider dashboard setting, not application code —
    local dev has no way to inspect or confirm it; it can only be checked directly in the Supabase
    project console for the staging/production project.
  - **Expected**: The configured Supabase session/inactivity timeout is ≥ 60 days (or disabled), so it
    never becomes the limiting factor ahead of the app's own cookie `maxAge`.
  - **Source**: Epic 5 / spec 045 FR-008.

- [ ] **Deployed (non-local) Stripe webhook delivery.**
  - **What**: With the app running on a real, publicly reachable deployment (not `stripe listen`
    forwarding to localhost), trigger a real or test-mode Stripe payment-confirmation event and confirm
    it reaches `POST /api/stripe/webhook` on the deployed server, passes signature verification, and
    flips `users.tier` for the purchasing account.
  - **Why staging**: Local/test-mode verification (`specs/045-account-session-checkout/quickstart.md`
    US5, T014–T017) only exercises the Stripe CLI's local forwarding tunnel
    (`stripe listen --forward-to localhost:3001/api/stripe/webhook`) against a locally-running server.
    It does not prove a real Stripe-hosted webhook endpoint pointed at a publicly reachable URL can
    successfully deliver to the deployed app (DNS, TLS, firewall, and the registered webhook endpoint
    URL itself are all untested by the local path).
  - **Expected**: A webhook event delivered by Stripe directly to the deployed URL is received,
    verified, and processed exactly once (idempotency via `stripe_events`), with `users.tier` reflecting
    the event outcome per the FR-025 status-mirror table.
  - **Source**: Epic 5 / spec 045 FR-024.

> **No real money required.** Every check below runs against the deployed staging server configured
> with Stripe **test-mode** keys (`sk_test_…` / `pk_test_…`) and test cards — Stripe never charges a
> real card in test mode. Real money moves only if the server is deliberately switched to live-mode
> keys (`sk_live_…`) with a real card (see the optional live smoke at the end). Test cards:
> `4242 4242 4242 4242` = success; `4000 0025 0000 3155` = requires 3-D Secure; `4000 0000 0000 9995`
> = declined; `4000 0000 0000 0341` = attaches but fails on renewal. Use **Stripe Test Clocks** to
> fast-forward a test subscription through renewals/cancellation instead of waiting real calendar time.

- [ ] **Deployed env config — test-mode keys, dashboard webhook secret, redirect URLs, price IDs.**
  - **What**: Confirm the deployed server has, as real environment variables: `STRIPE_SECRET_KEY`
    (`sk_test_…`), `STRIPE_WEBHOOK_SECRET` = the **Dashboard-registered endpoint's** signing secret
    (NOT the local `stripe listen` CLI secret used in dev — they differ), `STRIPE_MONTHLY_PRICE_ID` /
    `STRIPE_ANNUAL_PRICE_ID`, and `FRONTEND_URL` = the real public domain.
  - **Why staging**: All of these are per-environment values; local dev used a CLI-generated webhook
    secret and `localhost` URLs that do not exist on the deployed host. A wrong/absent
    `STRIPE_WEBHOOK_SECRET` makes every event fail signature verification (400); a wrong `FRONTEND_URL`
    makes Stripe's `success_url`/`cancel_url` redirect to the wrong place after checkout.
  - **Expected**: A test purchase redirects back to `https://<real-domain>/?checkout=success`, and the
    webhook (using the dashboard secret) passes signature verification.
  - **Source**: Epic 5 / spec 045 FR-021/FR-022; `contracts/payment-processor-interface.md`.

- [ ] **FR-025 subscription-lifecycle downgrade paths against REAL Stripe events (the biggest local gap).**
  - **What**: Drive the actual subscription-status transitions and confirm `users.tier` mirrors them:
    (a) **cancellation** — cancel the test subscription in the Dashboard → `customer.subscription.deleted`
    → tier drops to `free`; (b) **failed renewal** — subscribe with the failing-renewal card
    `4000 0000 0000 0341`, then use a Test Clock to advance past the renewal date → `past_due`
    (tier MUST stay `paid`, no downgrade) → after retries exhaust, `unpaid`/`canceled` → tier `free`.
  - **Why staging**: Locally we only ever drove `checkout.session.completed`; the FR-025 downgrade
    branches (`past_due` no-op, `canceled`/`unpaid`/`deleted` → free) were exercised **only with mocked
    payloads** in unit tests. This is the first time a real Stripe subscription payload shape hits that
    code path.
  - **Expected**: `past_due` never downgrades; final termination (`canceled`/`unpaid`/`deleted`)
    downgrades to `free` automatically, matching the FR-025 status-mirror table and SC-008.
  - **Source**: Epic 5 / spec 045 FR-025 / SC-008.

- [ ] **Idempotency under Stripe's real retry behavior.**
  - **What**: Cause the webhook to return non-2xx once (e.g. briefly), or use the Dashboard's "resend"
    on a delivered event, and confirm the redelivered event does not double-write — `tier` set once,
    exactly one `upgrade_completed` row in `tracks`.
  - **Why staging**: Stripe genuinely re-delivers failed events with backoff over hours/days; local
    `stripe trigger` doesn't reproduce real retry timing. The `stripe_events`-unique dedup must hold
    against real redelivery.
  - **Expected**: Redelivered events are no-ops (`{ handled: false, eventType: 'duplicate' }`); no
    duplicated downstream effects (FR-018 / SC-005).
  - **Source**: Epic 5 / spec 045 FR-018 / SC-005.

- [ ] **Billing portal round-trip.**
  - **What**: As a paid test user, hit `POST /api/stripe/portal` and confirm it returns a working Stripe
    billing-portal URL (no `400 missing stripe_customer_id`).
  - **Why staging**: The portal was broken pre-045 (`loadUser` omitted `stripe_customer_id`, fixed in
    T034) and has never been exercised against a real Stripe customer created by a real checkout.
  - **Expected**: The portal opens for the user's actual `stripe_customer_id`.
  - **Source**: Epic 5 / spec 045 T034 (OI-2 resolution).

- [ ] **Deployed DB can write `stripe_events` and `tracks`.**
  - **What**: Confirm the deployed Supabase DB's `service_role` can INSERT into `stripe_events` and
    `tracks` (the webhook writes both). Locally these needed migration `055_stripe_events_tracks_grants.sql`
    to avoid `42501 permission denied`.
  - **Why staging**: Hosted Supabase usually auto-grants `service_role`, but this must be *verified* on
    the deployed project — a silent `42501` there would defeat the idempotency ledger and drop the
    upgrade analytics exactly as it did locally before migration 055.
  - **Expected**: A real webhook inserts a `stripe_events` row and an `upgrade_completed` `tracks` row;
    no permission-denied in the server logs.
  - **Source**: Epic 5 / spec 045; migration `055`.

- [ ] **(Optional, pre-launch only) Live-mode smoke test — the one check that uses real money.**
  - **What**: With live-mode keys (`sk_live_…`/`pk_live_…`) and a real card, run one checkout, confirm
    tier flips, then immediately refund/cancel from the Dashboard.
  - **Why staging**: Proves the production keys, the live-mode webhook endpoint + secret, and payout
    wiring — none of which test mode touches. Skip until immediately before go-live.
  - **Expected**: One real subscription created and tier flipped, then refunded/cancelled with no
    lingering charge.
  - **Source**: Epic 5 / spec 045 — production readiness (beyond FR-024's test-mode bar).

## Epic 6 — Lessons: Progression, Audio & Polish (spec 046)

- [ ] **Lesson audio requires a commit + redeploy to serve in production (FR-027 caveat).**
  - **What**: Confirm this operational fact before relying on lesson narration in production: "lesson
    audio only serves in production after the generated MP3s are committed to git and the app is
    redeployed" (generation itself never runs in production — FR-012/FR-012a). The admin "Generate
    audios" action is a `requireLocalhost` dev-machine-only tool; there is no production generation
    path.
  - **Why staging**: This is a deploy-process fact, not something a local test can verify — it must be
    confirmed by actually committing generated MP3s under `public/audio/lessons/` and redeploying, then
    checking narration plays on the deployed app.
  - **Expected**: Narration audio is silent/absent on any deploy that didn't include a commit of the
    relevant `public/audio/lessons/*.mp3` files; it plays correctly on a deploy that did.
  - **Source**: Epic 6 / spec 046 FR-027, FR-012/FR-012a.

- [ ] **Real `OPENAI_API_KEY` TTS generation smoke.**
  - **What**: With a real staging `OPENAI_API_KEY` configured, confirm `server/ttsProvider.js`'s
    `synthesize()` succeeds against the live OpenAI TTS API (e.g. by running the admin "Generate
    audios" action for one lesson and confirming an MP3 is written and playable).
  - **Why staging**: No `OPENAI_API_KEY` was available in the dev environment during implementation
    (T030) — the generation path was exercised only with a stubbed `synthesize` function in unit tests.
  - **Expected**: `synthesize(text)` returns a valid MP3 buffer from the real API; the admin flow writes
    a working file and updates `coachMessages[].audio`.
  - **Source**: Epic 6 / spec 046 US3/US4, T030.

- [ ] **Clean signed-out-session order-gate check (SC-001).**
  - **What**: On staging, in a genuinely clean signed-out/anonymous session (no prior lesson progress),
    open the Saga screen and confirm exactly lesson 1 is unlocked — all others show as order-locked (or
    tier-locked, whichever applies first).
  - **Why staging**: Local dev's IndexedDB/session state tends to carry prior progress from testing; a
    genuinely fresh, never-touched anonymous session is only reliably available in staging (or via the
    same dev-only "clear IndexedDB & sign out" tooling used for spec 043's equivalent check, but this
    item asks for confirmation against a real staging deploy).
  - **Expected**: Only lesson 1 (lowest `order`) is unlocked; all lessons with a higher `order` show as
    locked (order or tier).
  - **Source**: Epic 6 / spec 046 SC-001, US6.1.

## Epic 7 — Platform Hardening & Cost Observability (spec 047)

- [ ] **Production dependency vuln scan against the deployed image.**
  - **What**: run `npm audit --production` against the deployed image.
  - **Why staging**: the production dependency graph as actually built/deployed can differ from local
    node_modules resolution.
  - **Expected**: 0 critical/high findings.
  - **Source**: audit C12, spec US1 AC4, SC-001.

- [ ] **Security response headers present on a live response.**
  - **What**: `curl -sI https://<staging-host>/` and confirm `content-security-policy`,
    `strict-transport-security`, `x-content-type-options: nosniff`, and `referrer-policy` are all present
    (the exact CSP directive set from `server/index.js`'s `helmet` mount).
  - **Why staging**: `npm run test:fast`'s `tests/unit/securityHeaders.test.js` only proves the directive
    set on a local throwaway app; this confirms `helmet` is actually mounted on the deployed process and
    that no reverse-proxy/CDN layer strips or rewrites the headers before they reach the client.
  - **Expected**: all four headers present on every response, values matching T009's directive set.
  - **Source**: audit C1, spec US2 AC2, SC-002.

- [ ] **Plain-HTTP → HTTPS redirect, and `.env`/`.git`/source-map requests return 404.**
  - **What**: (1) `curl -I http://<staging-host>/` (no TLS) and confirm a 301/308 redirect to `https://`;
    (2) `curl -I https://<staging-host>/.env`, `.../.git/config`, and `.../assets/<any>.js.map` and confirm
    each returns 404.
  - **Why staging**: depends on Railway's edge/proxy behavior and the deployed static-file serving
    config — neither exists in local dev.
  - **Expected**: HTTP → HTTPS redirect on every request; `.env`/`.git`/`*.map` all 404, not 200.
  - **Note**: FR-007's redirect/dotfile-404 behavior is **verify-only** in spec 047 — no code task in this
    feature implements the redirect middleware or a dotfile/source-map deny rule. If this check fails, open
    a follow-up code task (Express force-HTTPS redirect behind `trust proxy = 1` reading
    `X-Forwarded-Proto`, plus a dotfile/`.map` deny route or static-serving exclusion) rather than treating
    the failure as merely informational.
  - **Source**: audit C2/C4, spec US2 AC5.

- [ ] **Session cookies carry `Secure; HttpOnly; SameSite=Lax` in production.**
  - **What**: after a real sign-in against staging, inspect the `Set-Cookie` headers (or DevTools
    Application → Cookies) for both `sb_access_token` and `sb_refresh_token`.
  - **Why staging**: `cookieOpts()`'s `secure` flag is `process.env.NODE_ENV === 'production'` — only
    true in the deployed environment, never in local dev.
  - **Expected**: both cookies show `Secure`, `HttpOnly`, and `SameSite=Lax`.
  - **Source**: audit C3, spec US2 AC4.

- [ ] **`NODE_ENV=production` active in Railway, and unauthenticated admin endpoints are rejected.**
  - **What**: (1) confirm via Railway logs/env that the server booted normally (T008's boot assertion did
    NOT fire and exit(1) the process); (2) `curl` (no auth cookies) `GET` and `POST
    https://<staging-host>/api/admin/lessons` and confirm the response.
  - **Why staging**: T008's boot assertion and `requireAdmin`'s `NODE_ENV` bypass can only be observed
    against the real deployed process/env.
  - **Expected**: server boots normally (no fatal boot-assertion exit); unauthenticated admin requests
    return 401/403, not 200.
  - **Source**: audit C5/C6, spec US2 AC1/AC6.

- [ ] **Repeat the FR-005 TTS + Google OAuth smoke-test legs against the real deployed CSP.**
  - **What**: with the CSP live on staging (no local-dev shortcuts), (1) trigger a Deep Reveal and confirm
    coach audio plays; (2) complete a full Google sign-in round-trip and confirm it succeeds; (3) click
    through Home → Board → Deep Reveal with DevTools console open and confirm zero CSP-violation messages;
    (4) **open Play Online and confirm the papergames WebSocket connects** (online play works, no
    `connect-src` violation for `wss://papergames.io`); (5) **open Past Games and confirm papergames avatar
    images render** (no `img-src` violation for `https://papergames.io`); (6) **confirm the service worker
    registers** (Application → Service Workers in DevTools) with no `script-src` violation.
  - **Why staging**: T010 exercised these legs against a **local Vite dev server, where Express's CSP header
    is NOT applied to the SPA document** — so the papergames-WebSocket, papergames-avatar, and inline-script
    CSP interactions are structurally invisible locally and can ONLY be confirmed against Express serving the
    built `dist/` (staging/production). The deployed CSP, Supabase host, and OAuth redirect URIs must also be
    independently confirmed against production config, which does not exist locally.
  - **Expected**: all six legs pass with zero CSP-violation console messages; online play, avatars, and SW
    registration all function.
  - **Source**: spec FR-005 + spec-047 code-review (papergames.io connect-src/img-src, inline-SW-script
    script-src — see `docs/architecture/server-conventions.md` "CSP Directive Rationale").

- [ ] **(OI-10, re-added) Frontend error events reach the Sentry reporting service under the live CSP.**
  - **Prerequisite**: this leg was dropped as N/A by spec 047 FR-005 because frontend Sentry was never
    `init()`'d (see `docs/open_issues.md` OI-10, now RESOLVED). It only applies once `VITE_SENTRY_DSN` is
    set in the frontend build env (so `Sentry.init()` in `src/main.jsx` actually runs) and `SENTRY_DSN`
    is set in the server env. If either is unset in this deploy, skip this leg and note why.
  - **What**: with a real DSN configured and the app built+deployed (Express serving `dist/`, not Vite
    dev — CSP is not applied under Vite dev), trigger a thrown error inside a component (temporary throw,
    or an existing dev-only error trigger if one exists), open DevTools Network tab, and confirm a POST to
    `https://<org>.ingest.sentry.io/...` succeeds (not blocked by CSP) and the event appears in the Sentry
    project dashboard.
  - **Why staging**: CSP `connect-src` is only enforced against the Express-served `dist/` build, not Vite
    dev (see `project_csp_helmet_traps.md`); a genuinely deployed environment with a real DSN is required to
    confirm the ingest POST is neither CSP-blocked nor otherwise dropped.
  - **Expected**: no `connect-src` CSP-violation console message for the Sentry ingest host; the error event
    appears in the Sentry dashboard within a few seconds.
  - **Source**: `docs/open_issues.md` OI-10; `server/index.js` `SENTRY_INGEST` connect-src entry;
    `src/main.jsx` `Sentry.init()`.

- [ ] **Forged `X-Forwarded-For: 127.0.0.1` header does not bypass the localhost admin gate.**
  - **What**: `curl -H 'X-Forwarded-For: 127.0.0.1' <staging-url>/api/admin/candidates` (and one other
    `requireLocalhost`-gated endpoint, e.g. `POST <staging-url>/api/debug/classify-all`), sent from a
    non-localhost client.
  - **Why staging**: `requireLocalhost` now checks `req.socket.remoteAddress` (the raw TCP peer,
    header-immune) rather than `req.ip` (which `trust proxy = 1` derives from `X-Forwarded-For` and is
    therefore spoofable — this was found and fixed in spec-047 QA). In production, `req.socket.remoteAddress`
    is Railway's proxy IP (non-loopback → rejected), so external traffic can never pass; only a genuine
    on-box loopback connection does. Confirm this holds against Railway's actual edge topology, absent in
    local dev.
  - **Expected**: 403, never 200 — both with and without the forged `X-Forwarded-For: 127.0.0.1` header.
  - **Source**: audit C7, spec US3 AC1, FR-009 (+ spec-047 QA fix: raw-socket-peer check).

- [ ] **Anonymous-key data access to a user-data table returns no rows (RLS live-enforced).**
  - **What**: using the Supabase **anon** key (never the service-role key) from a plain `supabase-js`
    client with no session, attempt `select * from blunders limit 1` (or another user-data table) against
    the staging project.
  - **Why staging**: RLS policy *configuration* can be read from the migration files, but only a live query
    against the deployed Supabase project confirms the policy is actually enforced end-to-end — deny-by-
    default in the dashboard, not just in the `.sql` source.
  - **Expected**: zero rows returned (or an explicit permission-denied error) — never real user rows.
  - **Source**: audit C8, spec US4 AC3.

- [ ] **Unsigned public URL to the private `coach-tts` audio bucket returns a client error.**
  - **What**: construct a raw public-style URL to an object in the `coach-tts` storage bucket (no signed-URL
    token) and `curl` it.
  - **Why staging**: bucket privacy is a dashboard/storage-policy setting on the deployed Supabase project;
    it cannot be verified from local config or source alone.
  - **Expected**: 4xx client error (403/404), never the audio file content.
  - **Source**: audit C9, spec US4 AC3.

- [ ] **Sign-in/magic-link redirect allowlist has no wildcard or unintended origin.**
  - **What**: in the Supabase Dashboard → Authentication → URL Configuration, inspect the "Redirect URLs"
    allowlist for the staging/production project.
  - **Why staging**: this is a dashboard-side config value with no local-dev equivalent — it can only be
    read from the deployed project's auth settings.
  - **Expected**: only the known production/staging frontend origin(s) are listed; no `*` wildcard, no
    stray preview/localhost origin left over from earlier testing.
  - **Source**: audit C10, spec US4 AC3.

- [ ] **Rate limiting is effective per-client behind the Railway proxy.**
  - **What**: issue a burst of requests exceeding the configured rate limit (e.g. `for i in $(seq 1 50);
    do curl -s -o /dev/null -w '%{http_code}\n' https://<staging-host>/api/scores; done`) from a single
    client address.
  - **Why staging**: confirms the limiter keys on the real client address as seen through Railway's proxy
    (via `trust proxy = 1` + `X-Forwarded-For`), not on the proxy's own address — a config that only
    manifests against the deployed topology.
  - **Expected**: requests begin returning `429` partway through the burst, not all `200`.
  - **Source**: audit C11, spec US4 AC4.

- [ ] **GitHub `main` branch protection + CI secret-leakage scanning are enabled (dashboard-only, owner-run).**
  - **What**: in the GitHub repo settings → Branches, confirm branch protection is enabled on `main`
    (e.g. required PR review / status checks before merge); in the CI configuration (GitHub Actions or
    equivalent), confirm a secret-leakage scanning step (e.g. gitleaks/trufflehog or GitHub's native
    secret scanning) runs on every push/PR.
  - **Why staging**: this is a **kind-2 dashboard/platform-configuration item** — never code-addressable to
    begin with (no file in this repo enables or disables it); it must be confirmed directly in GitHub's
    settings UI by the repo owner, not inferred from source.
  - **Expected**: `main` branch protection is ON; CI includes an active secret-leakage scan step.
  - **Source**: audit §6, spec US4 (owner-run, dashboard-side verification).

- [ ] **`llm_usage` row count survives a routine staging deploy (no truncation/purge).**
  - **What**: query `llm_usage` row count immediately before and after a routine staging deploy.
  - **Why staging**: only a real deploy cycle can confirm the table is never truncated/purged as a side
    effect of deploy tooling.
  - **Expected**: row count after ≥ row count before (zero loss).
  - **Source**: FR-021/SC-007, spec US5 AC5.

## Epic 8 — Onboarding Experience (spec 048)

- [ ] **SC-005's 7-day unprompted-return correlation.**
  - **What**: Once `onboarding_started`/`onboarding_finished`/`onboarding_skipped` events have
    accumulated real production traffic, compute the correlation between onboarding lifecycle
    completion (finished vs. skipped vs. never-started) and unprompted return within 7 days, using
    each event's `uid` (device_uuid, per FR-015) as the join key against later session activity.
  - **Why staging**: This requires real production analytics history accumulated over at least a
    week of live traffic — no local session or synthetic test run can produce a 7-day return-behavior
    correlation. `track()`'s `uid` population (T011/T012) and the three lifecycle events
    (T018/T038/T041) are unit-verified locally; only the downstream correlation itself is a staging/
    production-only check.
  - **Expected**: The lifecycle events + `uid` are sufficient, on their own, to compute the
    start/finish/skip completion rate and its correlation with 7-day return — no additional ad-hoc
    instrumentation is needed (SC-005).
  - **Source**: Epic 8 / spec 048 SC-005, FR-015.

- [ ] **Genuine end-to-end magic-link email round-trip (FR-014 / User Story 1 Scenario 3).**
  - **What**: From a genuinely clean/anonymous staging session, request a real magic-link sign-in
    email, click the real link from the actual inbox, and confirm sign-in completes correctly AND
    the first-run onboarding auto-route does not fire (no flash of the sparring game before landing
    on the real post-login destination).
  - **Why staging**: The local T025/quickstart.md "OAuth-hash race" check only manually constructs a
    `/#access_token=...&refresh_token=...` hash fragment as if arriving from an email link — it
    exercises the identical `Navigator` `sessionChecked`/session-effect race-guard code path (R3), but
    never a genuine email-provider round-trip (real token issuance, real email delivery, real link
    click). This is the same category of gap as spec 043's OAuth-return-to-destination staging check
    above.
  - **Expected**: Sign-in completes; onboarding is never shown to a user who was mid-sign-in; no
    duplicated or broken intermediate state.
  - **Source**: Epic 8 / spec 048 FR-014, User Story 1 Scenario 3, research.md R3.

- [ ] **Account carryover of `onboarding_status` persists server-side (FR-012 / User Story 1 Scenario 4).**
  - **What**: After migration `057_users_onboarding_status.sql` is applied to the target DB, from a
    fresh anonymous session flip `onboarding_status` to `seen`/`skipped`, sign up, and confirm the
    account's `public.users.onboarding_status` reflects the migrated value (and that a second device
    signing into the same account does not clobber it back to `not_encountered`).
  - **Why staging**: could not be verified in local dev — migration 057 is file-only (never applied),
    and PostgREST **silently drops the unknown column** from the `POST /api/user/migrate` UPDATE, so
    the endpoint returns `204` with no persistence and no error (a silent no-op, not a 500). The
    client-side plumbing (payload construction, sign-in flow, routing) is fully unit- + browser-verified;
    only the final DB-column persistence step is unproven. Requires applying the migration + a real
    account sign-up.
  - **Expected**: The migrated `onboarding_status` lands on the account row via the conditional write
    (`... WHERE onboarding_status = 'not_encountered'`), never overwriting a real prior state.
  - **Source**: Epic 8 / spec 048 FR-012, User Story 1 Scenario 4; `docs/open_issues.md` OI-14.

- [x] **Onboarding mission-screen first-run browser walkthrough (clean anonymous session).** ✅ run 2026-07-13 (onboarding follow-ups QA, isolated/incognito Chrome context): mission screen is the first screen; coach bubble + three pillars render; "Start sparring" → onboarding sparring game (easy, green/first); after a move `onboarding_status` flipped to `seen`; `onboarding_started` + `onboarding_sparring_started` both fired. (Auth-modal open/close was exercised from the home screen, not the mission screen's user icon — the icon wiring is identical.)
  - **What**: From a genuinely clean/incognito session (no session, `onboarding_status`
    `not_encountered`), confirm the mission screen (`OnboardingMissionScreen`) is the first screen
    shown; the coach bubble + three pillars render; the user icon opens the auth modal and closes
    back; "Start sparring" lands in the onboarding sparring game (easy, player green/first); playing
    one move flips `onboarding_status` to `seen` (reload no longer re-shows the mission screen); and
    `track('onboarding_started')` (mount) + `track('onboarding_sparring_started')` (CTA) both fire.
  - **Why staging/blocked**: this feature merged with unit tests + a production build + 3 clean code
    reviews, but the interactive clean-signed-out walkthrough was **not run** — the Chrome DevTools
    browser was occupied by another session. It is locally verifiable in incognito; it was simply
    never executed this session. Run it before treating the mission screen's runtime as confirmed.
  - **Expected**: All steps pass; the mission screen appears exactly once before the game; downstream
    game/aha/import-offer flow is unchanged.
  - **Source**: onboarding mission-screen feature (merged `feature/polish` 2026-07-13); plan
    `docs/superpowers/plans/2026-07-13-onboarding-mission-screen.md` Task 2 Step 6.

- [ ] **Coach greeting is actually AUDIBLE on the mission screen in a real browser (autoplay policy).**
  - **What**: From a clean/incognito session in a real (non-automation) browser, land on the mission
    screen via the first-run auto-route and confirm the coach greeting
    (`coach.onboardingMission.greeting`) is **audibly spoken** on arrival — not just fetched. If the
    browser blocks it, confirm the intended fallback (plays on first interaction, or the replay
    affordance works) and decide whether that is acceptable.
  - **Why staging/real-browser**: the mission screen is reached via first-run auto-route with **no
    prior user gesture**, so a real browser's autoplay policy may block `audio.play()` and leave the
    coach silent. Local QA ran in automation Chrome (chrome-devtools MCP), which disables
    autoplay-blocking — the greeting mp3 was fetched (`206`, no `play()` rejection) but that does NOT
    prove audibility under a real autoplay policy.
  - **Expected**: The greeting plays audibly on mission-screen arrival (or a defined, acceptable
    fallback triggers). If it's silently blocked, that's a bug to file, not a pass.
  - **Source**: Feature 1 (onboarding follow-ups, `feature/polish` 2026-07-13); `useCoachSpeech` +
    `OnboardingMissionScreen` mount effect.

## Anon free deep reveal

- [ ] **Migration `058_blunders_device_uuid.sql` must be applied before deploy.**
  - **What**: Confirm migration `058_blunders_device_uuid.sql` is applied to the target DB before
    deploy (`node server/migrate.js` runs it automatically on the Railway deploy step).
  - **Why staging**: Without it, anon blunder INSERTs fail (NOT NULL on `user_id`) and the onboarding
    free reveal is a silent no-op.
  - **Expected**: The migration is recorded in `schema_migrations` on the deployed DB before the
    anon free deep reveal feature is exercised in staging/production.
  - **Source**: Migration `058_blunders_device_uuid.sql` (anon free deep reveal feature).
