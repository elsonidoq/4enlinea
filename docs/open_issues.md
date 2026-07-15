# Open Issues

A human-triageable backlog of known-but-deferred issues: latent bugs, quality gaps, and
scoped-out work that we've consciously decided *not* to fix yet. Distinct from auto-memory
(which holds trigger-first gotchas that ambush an agent editing the relevant code) — this file
is the browsable list of "things we know are wrong and might fix later."

Each entry: what's wrong, why it's deferred, where it lives, and a concrete repro if we have one.

---

## OI-1 — Single-answer puzzle categories score by solver-score, not by pattern (score-tie ≠ pattern-tie)

**Status**: 📋 SPEC-READY 2026-07-13 — full speckit artifacts authored at `specs/049-puzzle-scoring-spanish-localization/` (Epic 9, via `/epics-manager`); run `/coordinate-implementation` to build. Was: deferred out of spec 044 per FR-014/FR-015b.
**Area**: client-side puzzle scoring — `src/screens/ChallengeScreen.jsx`, `server/moveQualityScorer.js` (`scoreMove`), `server/predicates.js`, `/api/evaluate-move` (+ `/inline`)
**Discovered**: spec 044 QA (2026-07-11)
**Spec 049 approach**: extend the `evaluatePredicate`-gated `accepted` path to the six single-answer categories at the Challenge seam; client sends camelCase `correctCol`/`highlightMetadata` (remap from snake_case — see `project_puzzle_correctness_seams.md`); read stored metadata (no detector recompute); converge the plain + `/inline` handlers (extracted to `server/evaluateMoveHandler.js`) and fix the live `VALID_CATEGORIES.includes`-on-a-`Set` 500 in `/inline` as part of that convergence.

For the single-answer categories (`z_threat`, `overcut`, `claimeven`, `undercut`, `figure_7`,
`j_shape`), the Challenge screen judges correctness purely by the solver-score verdict
(`quality === 'optimal'`), **not** by whether the played column matches the taught pattern. Spec
044's multi-solution fix deliberately routes only `immediate_threat`/`forced_block`/`double_threat`
through the `accepted`-set path (`/api/evaluate-move` returns `accepted: null` for every other
category), so this behavior is unchanged and correct *for that feature's scope* — but the
underlying quality gap remains:

- On a board where several columns share the max solver score, a column that is **not** the taught
  pattern can read as "correct." Repro: `z_threat` board `3333302444422222060315555054`, playing
  col 0 reads correct despite not being the z-threat answer.
- On a board where the stored pattern answer is a *slower* win than another column, the **canonical
  answer itself** reads "Suboptimal." Repro: `z_threat` board `3333334512266550121166`,
  `correct_col` 0 has a below-max solver score.

**Why deferred**: fixing this means judging single-answer categories by pattern membership (like the
multi-solution categories now do via `evaluatePredicate`), which is a larger correctness-model change
than spec 044 took on. FR-014/FR-015b intentionally fenced it off.

**If picked up**: extend the `evaluatePredicate`-gated `accepted` path (or an analogous
pattern-membership check) to the single-answer categories, replacing the bare `scoreMove`
`quality==='optimal'` judgment on `ChallengeScreen.jsx`. Related memory:
`project_puzzle_correctness_seams.md` (ChallengeScreen bypasses via scoreMove).

---

## OI-2 — `/api/stripe/portal` silently broken: `loadUser` never selects `stripe_customer_id`

**Status**: ✅ RESOLVED in spec `045` (T034, 2026-07-11) — `loadUser` now selects `stripe_customer_id` on all three code paths via shared `USER_PROFILE_SELECT_COLUMNS`/`defaultUserProfile()` in `connect-four/server/userHelpers.js`; regression test in `userHelpers.test.mjs`.
**Original status**: latent bug; scheduled for fix under spec `045-account-session-checkout` (US5.4 / R3)
**Area**: `connect-four/server/index.js` — `loadUser` middleware + `POST /api/stripe/portal`
**Discovered**: Epic 5 planning audit (2026-07-11)

`loadUser` populates `req.user` but does not `select` `stripe_customer_id`, so
`req.user.stripe_customer_id` is always `undefined`. The customer-portal route depends on it, so the
portal has been broken since inception (no user has exercised it — Stripe was never live). Spec 045
fixes it because `getSubscriptionStatus`/portal need the column.

**If picked up independently of 045**: add `stripe_customer_id` to `loadUser`'s select; verify the
portal route reads it.

---

## OI-3 — Stripe webhook double-fires analytics on duplicate delivery (no idempotency short-circuit)

**Status**: ✅ RESOLVED in spec `045` (T033, 2026-07-11) — `handleWebhook` now checks the `stripe_events` insert result and short-circuits on `23505` (returns `{handled:false, eventType:'duplicate'}`), skipping the tier write and `upgrade_completed` track. Regression tests in `stripeProcessor.test.mjs`.
**Original status**: latent bug; scheduled for fix under spec `045` (US4 / R2)
**Area**: `connect-four/server/index.js` — `POST /api/stripe/webhook`
**Discovered**: Epic 5 planning audit (2026-07-11)

The webhook has a unique `stripe_events.stripe_event_id` but no early idempotency check, so a
duplicate Stripe delivery re-runs the handler and double-inserts the `upgrade_completed` analytics
track (the unique constraint stops the second `stripe_events` row, not the analytics side-effect).
Spec 045 adds a short-circuit-on-already-seen-event guard.

---

## OI-4 — Stripe webhook treats `customer.subscription.updated` as always → paid

**Status**: ✅ RESOLVED in spec `045` (T033a, 2026-07-11) — `handleWebhook` now derives `tier` from the subscription `status`: active/trialing→paid, past_due→no write, canceled/unpaid→free, `subscription.deleted`→free. `users.tier` is a live mirror of Stripe status. Regression tests in `stripeProcessor.test.mjs`.
**Original status**: latent correctness bug; fixed under spec `045` (FR-025 / R2a) as part of the tier-mirror requirement
**Area**: `connect-four/server/index.js` — `POST /api/stripe/webhook`
**Discovered**: Epic 5 planning audit (2026-07-11)

The webhook unconditionally sets `users.tier = 'paid'` on `customer.subscription.updated`, regardless
of the subscription's actual status. Under the spec-045 requirement that `tier` be a live mirror of
Stripe, this is wrong: an `.updated` carrying `past_due`/`canceled`/`unpaid` would keep a user wrongly
paid. Fix (spec 045): derive tier from the subscription status — active/trialing→paid,
canceled/unpaid→free, `past_due`→leave unchanged (downgrade only on final termination). Related
memory: `reference_tier_source`, `project_auth_payments_state`.

---

## OI-5 — FR-002a "no refresh-token rotation" finding verified only against anonymous sessions

**Status**: ⏳ probe-ready (2026-07-12) — a runnable re-verification harness now exists at `connect-four/scripts/probe-refresh-rotation.mjs`; the actual run is **owner-gated** (needs a real test account's email/password, unavailable headlessly). Run: `cd connect-four && node --env-file=server/.env scripts/probe-refresh-rotation.mjs <email> <password>`. If it prints "rotation detected", build the de-dup Map (plan Task F2) and update `server-conventions.md`; if "no rotation", close OI-5. Plan: `docs/superpowers/plans/2026-07-12-open-issues-remediation.md` Theme F.
**Area**: `connect-four/server/authRefresh.js` (no de-dup Map), `GET /api/auth/session` silent refresh
**Discovered**: spec `045` T002 (2026-07-11)

The FR-002a empirical check (spec 045 T002, recorded in `specs/045-account-session-checkout/research.md` R1) concluded this project's Supabase/GoTrue does **not** enforce rotation-with-reuse-detection — a superseded refresh token still works — so **no single-flight de-dup was built** in `attemptRefresh`. That check was run only against `signInAnonymously()` sessions; a real email/OAuth session was not available in the test environment. Rotation policy is a GoTrue project-level setting (not grant-type-specific), so this is very likely fine — but if Supabase's refresh-rotation setting is ever enabled, two concurrent same-token `/api/auth/refresh` calls (two tabs whose access tokens expire in the same tick) could spuriously sign a user out. `docs/architecture/server-conventions.md` documents the absence deliberately so it isn't "re-added" blindly.

**Why deferred**: the shipped behavior is correct for the observed GoTrue config; building a de-dup Map now would be unmotivated machinery (Principle II).
**If picked up**: re-run T002's two-concurrent-refresh probe against a real email/OAuth session (not anonymous); if the second call fails with `refresh_token_already_used`, build the TTL-bounded single-flight de-dup Map in `authRefresh.js` per research.md R1's design, and update the server-conventions.md note. Also worth pairing with the FR-008 staging check (Supabase dashboard session-timeout config).

---

## OI-6 — Superseded de-dup language in `contracts/api-auth-session.md`

**Status**: deferred (doc staleness, non-functional)
**Area**: `specs/045-account-session-checkout/contracts/api-auth-session.md`
**Discovered**: spec `045` T041/T042 (2026-07-11)

The auth-session contract still describes a server-side de-dup Map coalescing concurrent same-token refreshes, which the shipped code deliberately does **not** implement (see OI-5 / research.md R1). The authoritative, current behavior is documented in `docs/architecture/api-conventions.md` and `server-conventions.md`; the contract file's original wording is now superseded.

**Why deferred**: cosmetic — the contract is a frozen planning artifact; the architecture docs are the live source of truth.
**If picked up**: add a one-line "SUPERSEDED — see OI-5 / server-conventions.md" note at the top of the relevant section in `contracts/api-auth-session.md`.

---

## OI-7 — No DOM/browser test harness exists in this repo

**Status**: ✅ RESOLVED 2026-07-12 — React Testing Library + jsdom adopted under `npm run test:dom`; documented in testing-conventions.md
**Area**: project-wide test infrastructure — `connect-four/tests/`, `testing-conventions.md`
**Discovered**: spec `046` plan review (2026-07-11), while resolving the FR-024/SC-007 board-flicker
regression-check design

This project has `node:test`-based unit tests for pure server/frontend logic (per
`testing-conventions.md`'s Pure Function Extraction Pattern) but no React Testing Library, jsdom, Playwright,
or equivalent component/DOM-level test harness. Any regression check that would naturally want to assert on
rendered DOM/component behavior (e.g. "does this component re-render/remount under state X") instead has to
be satisfied by extracting the relevant logic into a pure, non-DOM function and unit-testing that — which
works, but is a workaround, not a substitute for real component testing when the defect is genuinely about
render/remount behavior rather than pure computation.

**Why deferred**: no single feature has needed DOM testing badly enough to justify introducing new test
infra (a real cost: new dependency, CI wiring, maintenance surface) — spec 046's board-flicker check (FR-024/
SC-007) was resolvable via the pure-function-extraction workaround, so it did not force the issue. The owner
acknowledges a DOM/browser harness would be valuable but this is a standing gap, not a blocker.

**If picked up**: evaluate React Testing Library (jsdom-based, no browser needed, lightest-weight fit for
this stack) vs. leaning further on the existing `chrome-devtools-mcp`/`app-qa` skill for real-browser manual/
agentic QA; either way, document the choice in `testing-conventions.md` once adopted.

## OI-8 — RESOLVED: board "flicker" was a layout reflow on ChallengeScreen (US5 root cause corrected)

**Status**: resolved 2026-07-11 (real root cause found + fixed; Batch-4 memoization retained as harmless perf hardening)
**Area**: `connect-four/src/screens/ChallengeScreen.jsx` (fix site), `src/components/CoachDialog.jsx` (`fixed` reserved-height mode)

**Discovered**: spec `046` US5 implementation (2026-07-11); **corrected same day** via
`/scientific-method-debugging` with an owner-supplied live repro.

The originally-shipped US5 work (Batch 4) misdiagnosed the defect: it memoized `Board`
(`memo(BoardImpl, boardPropsAreEqual)` + `deriveBoardSignature`, backed by
`tests/unit/boardMemoStability.test.js`) on the theory that already-placed discs were re-rendering. That
was **not** the bug. The owner clarified the real symptom — "in practice 1 of immediate threat, after the
disc is placed a new coach message bubble appears and the board **moves down**" — and it reproduces on the
**ChallengeScreen** (`/clchallenge/…`, "Immediate Threats — Practice"), not Concept/Socratic.

**Confirmed root cause (browser-measured):** ChallengeScreen's outer container is a `flex column` rendering
`<CoachDialog messages={coachMessages} …>` directly above the board. `coachMessages` **accumulates** (the
post-move feedback bubble is appended below the prompt bubble), so the coach region grows in height and the
board — the next flow sibling — reflows downward. Measured: placing the winning disc appended a 2nd bubble,
the coach region grew ~99px→136px, and the board top moved 195→232 (**down 37px**). Nothing about disc
rendering was involved. Concept/Socratic stayed put only because they *replace* their single coach message
rather than accumulate.

**Fix:** pass the existing `fixed` prop — `<CoachDialog fixed messages={coachMessages} size={58} />` — which
reserves a stable `height:140` (inner `maxHeight:120, overflowY:auto`), so appended bubbles scroll within the
region instead of growing it. This matches the pre-existing `GameScreen.jsx`/`ReviewScreen.jsx` pattern for
accumulating coach messages over an interactive board. Verified in-browser: board top now **236 before and
236 after** the move (0px shift); coach region held 140px; both bubbles + win highlight render correctly.

**Regression check (FR-024 — documented manual procedure, per OI-7 no-DOM-harness):** on
`/clchallenge/immediate-threat`, measure the board container's `getBoundingClientRect().top` before and after
placing the winning disc (which appends a feedback bubble); the two values must be equal. The Batch-4
`boardMemoStability.test.js` remains green and is kept (referential stability is still a valid, if unrelated,
property). Cross-ref: spec 046 US5, [[OI-7]] (no DOM harness).

## OI-9 — Only `immediate-threat` has generated narration audio; 12 lessons still silent

**Status**: deferred (content-population step, not a bug — scoped out of spec 046 verification)
**Area**: `connect-four/lessons/*.json` (`coachMessages[].audio`), `connect-four/public/audio/lessons/`

**Discovered**: spec `046` T030 verification (2026-07-11)

Spec 046 shipped the lesson-narration generation/playback machinery and verified it end-to-end by
generating audio for **one** lesson (`immediate-threat`: 4 clips, committed). The other 12 lessons have no
`coachMessages[].audio` populated, so their concept slides display silently (graceful per FR-017, but no
narration). This is a content step, not a defect.

**Why deferred**: generation is a per-lesson admin action with real OpenAI TTS cost; the owner decides which
lessons get audio and when. Verifying the mechanism on one lesson was sufficient for the epic.

**If picked up**: for each remaining lesson, run the localhost admin "Generate audios" action (editor button,
or `POST /api/admin/lessons/:id/generate-audio`), then `git add` the new `public/audio/lessons/*.mp3` + the
updated lesson JSON and redeploy (per FR-012a, generation never runs in prod). Real key is in
`connect-four/server/.env` ([[feedback_openai_key_present]]). Cross-ref: spec 046 US3/US4.

## OI-10 — Frontend Sentry is imported but never initialized (error reporting is a silent no-op)

**Status**: ✅ RESOLVED 2026-07-12 — `Sentry.init()` added in `connect-four/src/main.jsx`, gated on
`import.meta.env.VITE_SENTRY_DSN` (mirrors the server's existing `SENTRY_DSN` gate). `.env.example`
documents the new frontend DSN var. CSP `connect-src` (`connect-four/server/index.js`) now allows the
Sentry ingest host via an env-derived `SENTRY_INGEST` (`process.env.SENTRY_INGEST_HOST` or a
`*.ingest.sentry.io` wildcard default). The CSP smoke-test error-reporting leg dropped by spec 047 FR-005
has been re-added in `staging_checks.md`. **Deploy prerequisite**: `VITE_SENTRY_DSN` must be set in the
frontend build env and `SENTRY_DSN` in the server env for either side to actually report; both remain
no-ops (safe defaults) if unset.

**Area**: `connect-four/src/components/ErrorBoundary.jsx`, `connect-four/src/main.jsx`;
`connect-four/server/index.js` (CSP `connect-src`); `connect-four/.env.example` (`SENTRY_DSN`,
`VITE_SENTRY_DSN`)

**Discovered**: spec `047` (Epic 7) plan verification (2026-07-12)

**Original gap** (historical, now fixed): `ErrorBoundary.jsx` imports `@sentry/react` and calls
`Sentry.captureException(error, { extra: info })`, but there was **no `Sentry.init()` anywhere in `src/`**
and no frontend DSN env var — so the SDK was uninitialized and `captureException` was a no-op. Frontend
errors were silently dropped. Server-side Sentry is separately gated on `SENTRY_DSN` (`index.js`,
`logger.js`), which is documented (commented out by default) in `.env.example`; its live-deploy
configuration is unconfirmed and out of scope for this fix.

**Consequence for spec 047 (historical)**: this is why FR-005's CSP smoke test **dropped** the "error
events still reach the reporting service" leg (marked N/A — nothing to break), and why the CSP had **no**
Sentry `connect-src` entry (no browser-side Sentry traffic existed to allow). Spec 047 US2 task T012 filed
the formal backlog note for the frontend gap — this entry is that backlog item, now resolved.

**Resolution**: `Sentry.init()` now runs in `src/main.jsx` gated on `VITE_SENTRY_DSN`; the CSP `connect-src`
now allows the Sentry ingest host (`SENTRY_INGEST` in `server/index.js`); the CSP smoke-test error-reporting
leg is re-added in `staging_checks.md`. Remaining work is operational, not code: provision a real
`VITE_SENTRY_DSN` (frontend) and confirm `SENTRY_DSN` (server) in the deploy env, then run the re-added
staging smoke-test leg.

## OI-11 — Admin gate has no second factor beyond `requireLocalhost` (FR-009 deferred scope)

**Status**: ✅ CLOSED — won't-fix (accepted risk, owner-confirmed 2026-07-12). The header-spoof hardening (FR-009, `req.socket.remoteAddress`) is delivered; adding a mandatory authenticated admin session on top of `requireLocalhost` remains deliberately out of scope. Reopen only if the threat model changes (e.g. shared-host / SSH-forward exposure becomes real).
**Area**: `connect-four/server/index.js` — all `/api/admin/*` and `/api/debug/*` routes gated by `requireLocalhost`

**Discovered**: spec `047` (Epic 7) US3 implementation (2026-07-12)

Spec 047 US3 (T015) consolidated the debug endpoint's duplicated inline localhost check onto the shared
`requireLocalhost` middleware. **Correction (spec-047 QA, 2026-07-12):** the original planning assumption —
that `trust proxy = 1` made `req.ip` unspoofable — was WRONG. With `trust proxy = 1` (needed for
`express-rate-limit`), Express derives `req.ip` FROM the client-supplied `X-Forwarded-For` header for one
hop, so a direct (non-proxied) caller sending `X-Forwarded-For: 127.0.0.1` from a non-loopback address
passed the gate (reproduced live). This was fixed by changing `requireLocalhost` to check
`req.socket.remoteAddress` (the raw TCP peer, header-immune) instead of `req.ip`. That now genuinely
hardens the gate against header-spoofing (FR-009 delivered), but the gate itself remains **localhost-only,
with no authenticated admin session as a second factor**. Anyone who can reach the app process on
`127.0.0.1` (e.g. via SSH port-forward or a compromised sibling process on the same host/container) has
full admin access with no login check.

**Why deferred**: FR-009 only required the gate be unspoofable by a forged header, which T015 delivers. Adding
a mandatory authenticated admin session on top of `requireLocalhost` is a separate, larger change (session
plumbing, an admin-role check, likely reusing `requireAdmin`'s `ADMIN_EMAILS` allowlist alongside the localhost
gate rather than instead of it) and was explicitly out of scope for this feature.

**If picked up**: require both `requireLocalhost` AND an authenticated session whose user is in `ADMIN_EMAILS`
(see `server/adminAuth.js`'s `requireAdmin`, already used as a second gate on the `/api/admin/*` routes at
`docs/architecture` review time — audit whether every admin/debug route already stacks `requireAdmin` alongside
`requireLocalhost`, since `/api/debug/classify-all` and some `/api/admin/candidates*` routes currently do not).

## OI-12 — Deep-reveal first (uncached) load can time out client-side before the LLM returns

**Status**: deferred (pre-existing; surfaced during spec-047 QA, unrelated to this feature's changes)
**Area**: `connect-four/src/components/DeepRevealPane.jsx` — client-side fetch timeout
**Discovered**: spec `047` (Epic 7) QA (2026-07-12)

`DeepRevealPane.jsx` uses a fixed ~6-second client-side timeout on the deep-reveal explanation fetch. A
genuine *uncached* `POST /api/explain-move-llm` call to the OpenAI reasoning model can take longer than 6s
to return, so the UI shows "Detailed explanation unavailable." even though the call actually succeeds
server-side (confirmed during QA: the underlying response was valid and the `llm_usage` telemetry row was
written correctly). A second (now-cached) request for the same position rendered in <1s. This predates spec
047 (the file is untouched by this feature — confirmed via `git diff`) and is not caused by the telemetry
wrapper (the ledger write is fire-and-forget and does not add latency).

**Why deferred**: out of scope for spec 047 (a hardening/observability feature); it's a UX-latency issue in
an unrelated component. Only reliably reproduces on a cold/uncached reasoning-model call.

**If picked up**: raise or remove the fixed 6s client timeout in `DeepRevealPane.jsx` (reasoning-model calls
are legitimately slow on first load), or show a "still thinking…" state instead of a failure message when the
timeout elapses while the request is still in flight. Verify against a cold call in staging (cache TRUNCATEd
on deploy per `project_spec039_audio_interactive_coach`, so the first post-deploy call is always uncached).

## OI-13 — Onboarding "import offer shown once" marker is per-browser (localStorage), not per-account

**Status**: ✅ CLOSED — accepted design limitation (owner-confirmed 2026-07-12). The `onboarding_offer_shown_v1` localStorage marker stays per-browser; a benign always-dismissible import offer re-showing on a new device is acceptable, and syncing it would reintroduce the server-row-for-anonymous problem the design avoids. Reopen only if the offer becomes non-dismissible or costly to re-show.
**Area**: `connect-four/src/lib/onboardingOfferMarker.js` + `OnboardingImportOfferScreen.jsx` mount (the `onboarding_offer_shown_v1` localStorage marker)
**Discovered**: spec 048 (Epic 8, onboarding) planning/review (2026-07-12)

Onboarding's post-aha "import your real games" offer must appear **exactly once** per user. The three-state
`onboarding_status` enum (`not_encountered | seen | skipped`) has no terminal "offer done" state by design
(FR-013 forbids growing server-side bookkeeping for anonymous users), so idempotency is delegated to a
device-local `localStorage` marker (`onboarding_offer_shown_v1`), written on the offer screen's mount. Because
the marker is per-browser and never synced to the account, a user who saw and dismissed the offer in one
browser, then signs in (or just opens the app) in a **different browser/device**, will see the one-time offer
again. Judged acceptable during planning (import is a benign, always-dismissible offer; syncing it would
reintroduce the server-row-for-anonymous problem the design deliberately avoids), but explicitly flagged to
re-confirm with the owner during implementation.

**Why deferred**: it's an accepted trade-off of the anonymous-first, no-anon-server-bookkeeping design, not a
bug to fix now; the feature is not yet built.

**If picked up**: decide whether "offer already shown" should become per-account (e.g. fold into the migrated
profile / a `users` column) for signed-in users, accepting the extra column + migration cost — or leave
per-browser. Cross-ref: `specs/048-onboarding-experience/{plan,research,data-model}.md`,
[[project-user-column-propagation]].

## OI-14 — Account carryover of `onboarding_status` unverified end-to-end; silently no-ops if migration 057 isn't applied

**Status**: deferred verification + deploy prerequisite (spec 048 — client side fully verified, server persistence not)
**Area**: `connect-four/server/migrations/057_users_onboarding_status.sql` (unapplied), `POST /api/user/migrate`, `GET`/`PUT /api/user/profile`
**Discovered**: spec 048 (Epic 8) QA (2026-07-12)

US1 Scenario 4 (an anonymous user's `onboarding_status` carrying over to their account on sign-up)
could not be verified end-to-end in local dev: (a) migration `057_users_onboarding_status.sql` is
file-only and was never applied, so `public.users` has no `onboarding_status` column locally, and
(b) the running dev server process predates the Epic 8 server code (no server hot-reload). The
compounding trap surfaced during QA: **PostgREST silently drops an unknown column from an UPDATE
rather than erroring**, so `POST /api/user/migrate` returns `204` with the correct
`onboarding_status` in the request body while the value is **never persisted** — a silent no-op, not
a 500. The client side (migrate-payload construction, sign-in flow, routing to the import entry
point) is fully verified; only the final DB-column persistence is unproven.

**Why deferred**: verifying it requires applying migration 057 to a DB and restarting the server —
a deploy/ops step, not a code change. The behavior is correct by construction once the column exists.

**If picked up**: apply migration 057 (see `reference_supabase_connection.md`), restart `npm run dev`,
then run `specs/048-onboarding-experience/quickstart.md`'s "account carryover" section and confirm the
account row's `onboarding_status` reflects the migrated anonymous value. This is already noted in
`staging_checks.md` under Epic 8. Cross-ref: [[project_user_column_propagation]], [[OI-13]].

## OI-15 — Spanish i18n (`es.json`) ships translations but is never registered; app is English-only

**Status**: 📋 SPEC-READY 2026-07-13 — the remaining translation-content work is now specced at `specs/049-puzzle-scoring-spanish-localization/` (Epic 9, US9.3–US9.4). Switcher machinery already SHIPPED 2026-07-12 (useLanguage hook, es bundle registered, Settings selector). On-disk reality: `es.json` has 3 of 25 top-level sections complete (`setcard`, `onboarding`, `settings`), 22 missing; selecting es renders English via fallback until spec 049 lands. Spec 049 adds a `node:test` en/es key-parity guard (registered in both `test` + `test:fast`).
**Area**: `connect-four/src/i18n/index.js` (`lng: 'en'`, only `en` resource registered), `connect-four/src/i18n/es.json`
**Discovered**: spec 048 (Epic 8) QA (2026-07-12)

`src/i18n/index.js` hardcodes `lng: 'en'` and registers only the `en` resource bundle; `es.json`
exists on disk (and spec 048 dutifully added `onboarding.*` keys to it) but is never wired into i18next
and there is no in-app language switcher. So every Spanish translation in the repo — including the new
onboarding copy — is dead. US4 Scenario 4 ("onboarding copy shown in the selected language") is
therefore only satisfiable in principle (all copy correctly routes through `t('onboarding.*')` keys);
it can't be exercised because language selection doesn't exist. This predates Epic 8 and affects the
whole app, not just onboarding.

**Why deferred**: wiring a language switcher + `es` resource is an app-wide i18n feature, out of scope
for the onboarding epic; nothing in spec 048 regressed it.

**If picked up**: register the `es` bundle in `src/i18n/index.js`, add a language selector (Settings is
the natural home), and verify onboarding + the rest of the app render under `es`. Keep `es.json` keys
in lockstep with `en.json` if the switcher goes live.

## OI-16 — Follow-ups from the Open-Issues Remediation branch (low-risk polish)

**Status**: deferred (accepted as backlog by the final whole-branch review, 2026-07-12; not merge-blocking)
**Area**: `connect-four/src/components/DeepRevealPane.jsx` + `src/lib/deepRevealTimeout.js`; `connect-four/package.json` (jsdom peer)
**Discovered**: final review of plan `docs/superpowers/plans/2026-07-12-open-issues-remediation.md`

Two small residues from remediating OI-12 and OI-7, both judged defer-not-fix:

- **Dead tested helper (from OI-12):** `deepRevealPhase(elapsedMs, resolved)` in `src/lib/deepRevealTimeout.js` is unit-tested but **not consumed** — `DeepRevealPane.jsx` drives the `slow`/`timedOut` states inline via `setTimeout`, reimplementing the same 3-way branch. Both sides import the shared `DEEP_REVEAL_SOFT_MS`/`DEEP_REVEAL_HARD_MS` constants, so the timing can't drift, only the branch shape. If picked up: either wire `deepRevealPhase` into the render, or drop the helper + its test.
- **jsdom peer mismatch (from OI-7): ✅ RESOLVED 2026-07-14.** This bit the **staging deploy** — Railway's `npm ci` (strict peer resolution) aborted with `ERESOLVE` (`global-jsdom@29` peer-wants `jsdom >=29 <30`, tree has `jsdom@27`), failing the build. Fixed by aligning `global-jsdom` `^29.0.0` → `^27.0.0` (its major tracks jsdom's, so `^27` matches the pinned `jsdom@27`) + regenerated lock — the root cause (version mismatch) is removed, so `npm ci` now passes strictly with **no flag / no `.npmrc`** (verified `npm ci --dry-run` + `npm run test:dom`, both green). Chosen over the originally-suggested "bump jsdom to `^29`" (2 majors, test-breakage risk) and over an `.npmrc legacy-peer-deps=true` (suppresses rather than fixes, and depends on railpack copying `.npmrc`). Also un-staled memory `project_repo_worktree_setup` 2b (no longer needs `--legacy-peer-deps`).

## OI-17 — `chooseSparringMove` returns `col: undefined` on a terminal/full board

**Status**: deferred (latent; unreachable via the normal client flow, 2026-07-13)
**Area**: `connect-four/server/classifier.js` (`chooseSparringMove`) via `POST /api/scores` with `difficulty`
**Discovered**: implementing the sparring move-selection rewrite (2026-07-13)

If `chooseSparringMove` is called on a position with **no playable columns** (a full/drawn board),
`playable` is empty → `Math.max(...[])` is `-Infinity`, `bestCols` is `[]`, and `pick([])` returns
`undefined`, so the endpoint responds `{ scores, col: undefined }` (serialized as `col` absent/null)
rather than a clean error. Not a crash, but a malformed response.

**Why deferred**: unreachable through the app — `makeAiMove` only runs when the game is not over, so
the AI is never asked to move on a terminal board. It's only hittable by calling `POST /api/scores`
directly with a full 42-char movestring + `difficulty`.

**If picked up**: guard `chooseSparringMove` (or the endpoint) to return a 4xx / explicit terminal
signal when `playable.length === 0`, instead of `undefined`.

## OI-18 — Lesson slide content is hardcoded English, no i18n mechanism (Spanish gap)

**Status**: deferred (large content task, scoped out of spec 049 Spanish localization; 2026-07-13)
**Area**: `connect-four/lessons/*.json` (~13 files, ~50 `coachMessages[].text` strings) consumed by `ConceptScreen.jsx` / `SocraticScreen.jsx`
**Discovered**: spec 049 QA (browser walkthrough, 2026-07-13)

Lesson *body* content — every slide's `coachMessages[].text` across all lesson JSON files — is raw
hardcoded English data with **no i18n lookup at all**, unlike lesson *titles* (which do resolve via
`t(\`lesson.<id>.title\`, {defaultValue})`). So when the app language is Spanish, lesson slides
still render in English. This is a separate content-authoring system from `src/i18n/*.json` and was
never in scope of the "translate the 22 missing `es.json` sections" work — the FR-019 key-parity
guard cannot catch it because these strings are not i18n keys.

**Why deferred**: translating it requires either a parallel-language lesson content pack or
per-slide i18n keys wired into `ConceptScreen.jsx`/`SocraticScreen.jsx` — a distinct, large content
task, not a translation-file edit. Sized as its own follow-up.
**If picked up**: decide on a mechanism (parallel `lessons/es/*.json` vs per-slide keys), then
translate to Argentinian voseo per memory [[project_spanish_is_argentinian_voseo]].

## OI-19 — Hardcoded-English UI strings bypass the i18n key-parity guard

**Status**: deferred (several instances fixed during spec 049 QA; audit for the rest outstanding; 2026-07-13)
**Area**: `connect-four/src/screens/*.jsx` (TopBar titles, button labels, aria-labels not wired to `t()`)
**Discovered**: spec 049 QA (2026-07-13)

The FR-019 key-parity test only proves `en.json` and `es.json` have the same *keys* — it is blind to
user-facing strings that were never wired to `t()` at all (hardcoded English literals in JSX). QA
found and fixed a batch of these (Stats "Log out", the entire Settings→Papergames Import section,
Game/Sparring TopBar title + move counter + "Resign", audio toggle aria-labels, the Lessons list
titles/status labels), adding the missing keys to both locales. **Known-remaining instances not yet
fixed**: `ReviewScreen.jsx` (`title="Review"`) and `PlayOnlineScreen.jsx` (`title="Play Online"`)
TopBar titles; other screens were not exhaustively audited.

**Why deferred**: the remaining instances are outside the screens spec 049's QA walked
(Home/Challenge/Coach/Settings/Onboarding); a full sweep is its own task.
**If picked up**: grep the `src/screens`/`src/components` JSX for string literals in user-facing
positions (`title=`, `aria-label=`, button/label children) not wrapped in `t()`; add keys to both
`en.json`/`es.json` (Spanish = Argentinian voseo, [[project_spanish_is_argentinian_voseo]]).
Consider a lint/test that flags hardcoded JSX text to prevent regressions.

## OI-20 — Onboarding post-game value loop incomplete (coach silent, no analysis, game lost on signup)

**Status**: ✅ RESOLVED 2026-07-13 (onboarding follow-ups, branch `feature/polish`, commits `ef24f17`/`4522e78`/`ffca704`/`a21bff8`). All three gaps fixed and verified end-to-end in a real browser + DB: (1) coach speaks the greeting from `coach.onboardingMission.greeting` via `useCoachSpeech` (mp3 generated + approved); (2) game-end routes onboarding → review → onboarding-only "Continue" CTA → import offer (`pickGameEndScreen` returns `'review'` for both); (3) anon games re-associate on migrate via `device_uuid` and appear in Past games after sign-up. Regression confirmed: `puzzle_attempts` + `lesson_progress` still migrate. See [[project_games_dont_migrate]] and `api-conventions.md` Migrate Endpoint. One residual staging item logged (real-browser autoplay of the greeting — see `staging_checks.md` Epic 8).
**Area**: `src/screens/OnboardingMissionScreen.jsx`, `src/lib/onboardingGameEnd.js`, `GameScreen.jsx`, `src/screens/ReviewScreen.jsx`, `src/store/IndexedDBStore.js` + `server/userRoutes.js` (`/api/user/migrate`), `server/index.js` (`/api/games`)
**Discovered**: onboarding polish review, 2026-07-13 (post mission-screen merge)

Three related gaps in the onboarding "play → learn" loop the mission screen feeds into. All are
pre-existing Epic 8 behavior, not regressions from the mission screen:

1. **Coach greeting is text-only, never spoken.** `OnboardingMissionScreen` shows the greeting via
   `<CoachDialog>` but never calls `speakCoachMessage`, and the phrase lives under
   `onboarding.mission.*` not the `coach.*` TTS namespace — so it isn't in `tts-registry.json` /
   `/admin/audios` and has no audio. Fix needs: re-key under `coach.*`, generate+approve the clip,
   and wire `useCoachSpeech()`. See [[project_lesson_progression_audio_traps]].
2. **Game-end skips the post-game review.** `pickGameEndScreen(onboarding)` routes onboarding to
   `'onboardingImportOffer'` instead of `'review'` — so the user never sees the mistake analysis
   that is the whole point of starting with a game. `/api/games/analyze` already supports the
   anonymous game, so routing onboarding → review works; decision needed on where the import offer
   then lands (recommend review → then import offer). Update `tests/unit/onboardingGameEnd.test.js`.
3. **Anonymous game is orphaned — never in Past games.** The onboarding game is written to the
   server `games` table with `user_id: null` and is never re-associated on signup, and Past games
   401s anon + filters by `user_id`. Fix options (server-side `device_uuid`→`user_id`
   re-association in `/api/user/migrate`, vs replicating games into IndexedDB). See
   [[project_games_dont_migrate]] for full detail.

## OI-21 — Onboarding greeting cannot autoplay on a cold load; design a gesture-first entry so the coach can speak on arrival

**Status**: open — product/UX design task (the runtime bug is FIXED; this is about making the greeting play *on arrival* rather than *on first interaction*).
**Area**: `src/screens/OnboardingMissionScreen.jsx`, `src/lib/useCoachSpeech.js` (audio unlock), `src/lib/onboardingRouting.js` (the first-run auto-route), and whatever precedes the mission screen.
**Discovered**: onboarding follow-ups coach-speech debugging, 2026-07-13.

Browsers block `audio.play()` until the page has received a user gesture (confirmed observable:
`play()` rejects with `NotAllowedError`, mp3 fetched but silent). The mission screen is reached via
the anonymous first-run **auto-route** — it appears with **no prior gesture**, so the coach greeting
is autoplay-blocked. The 2026-07-13 fix (`useCoachSpeech`: hold a blocked clip and replay it on the
first `pointerdown`/`keydown`/`touchend`) makes the greeting play on the user's **first interaction**
and makes all later coach speech robust — but on a truly cold mission screen the greeting still can't
sound *the instant the screen appears*, because that is a hard browser rule, not a code bug.

The product task: design a first-run entry that **naturally elicits a gesture before (or as) the
mission screen is shown**, so the greeting can play on arrival without an awkward "click anywhere"
gap. Options to weigh (do NOT just pick one — brainstorm):
- A one-tap "Meet your coach" / "Start" splash *before* the mission screen; the tap both advances
  and unlocks audio, so the greeting plays as the mission screen mounts.
- Make the auto-route itself require a tap (e.g. land on a minimal welcome card whose only CTA
  enters onboarding), instead of silently routing into the mission screen.
- A visible speaker / "tap to hear the coach" affordance on the mission bubble (explicit, but adds
  a tap and some UI).
- Accept first-interaction playback (current behavior) + ensure the text bubble fully conveys the
  greeting meanwhile; lowest effort, no new UI.

Constraint: whatever the entry, it must not reintroduce a flash of the sparring game before the
gesture, and must keep the anonymous-only auto-route semantics (`shouldAutoRouteToOnboarding`).
Cross-ref: staging_checks.md Epic 8 "Coach greeting is actually AUDIBLE" item; `useCoachSpeech`
unlock mechanism.

## OI-22 — Anon post-game review re-analysis re-runs the solver (analyze cache-check is `user_id`-only)

**Status**: deferred (accepted deviation from the anon-free-deep-reveal design §2; low impact, 2026-07-13)
**Area**: `connect-four/server/index.js` — `POST /api/games/analyze` cache-check (`if (req.user) { … }` ~line 2097)
**Discovered**: anon free deep reveal — final whole-branch review (2026-07-13)

The analyze endpoint's "reconstruct from stored blunders instead of re-running the solver" cache-check
is gated on `if (req.user)`, so an **anonymous** re-analysis of the same game (e.g. re-opening the
review) always recomputes the full solver pass and re-inserts (deduped via `23505`). The design
(`docs/superpowers/specs/2026-07-13-anon-free-deep-reveal-design.md` §2, bullet 3) recommended
extending the cache-check to also short-circuit anon by `device_uuid`; it was **deliberately dropped**
to keep the sensitive handler change minimal. Not a correctness bug — anon blunders are written
correctly on first analyze (awaited before the response), so the subsequent coach/queue fetch sees
them; this is purely a redundant-solver-cost issue, bounded by the `/api/` 120-req/min limiter and the
fact that onboarding visits the review once.

**If picked up**: generalize the cache-check owner filter — when `!req.user`, match
`.eq('device_uuid', gameDeviceUuid).is('user_id', null)` (the `gameDeviceUuid` already captured for the
write path), mirroring the authenticated branch. Cross-ref: [[project_anon_deep_reveal_gates]].

## OI-23 — Deep-reveal TTS 400s on the opening move (empty movestring) for ALL users

**Status**: deferred (pre-existing; surfaced during anon free deep reveal QA, 2026-07-13)
**Area**: `connect-four/server/index.js` — `GET /api/user/tts/deep-reveal` param validation (`if (!moveString || …)`)
**Discovered**: anon free deep reveal QA (2026-07-13)

The TTS endpoint validates `if (!moveString || !/^[0-6]{0,42}$/.test(moveString))` → `400`. Because
`!""` is `true`, an **empty** `moveString` (the opening move — a first-move blunder such as playing an
edge column) is rejected, so its deep reveal renders text but is **silently voiceless** (the client's
TTS fetch 400s). Affects authenticated and anonymous callers equally — the regex itself allows 0 chars
(`{0,42}`), so only the `!moveString` truthiness guard is wrong for the empty-but-valid case. Low impact
(only the very first ply, and only its spoken audio), which is why it went unnoticed until the anon
onboarding reveal (whose first blunder is often the opening move) exposed it.

**If picked up**: change the guard to `typeof moveString !== 'string' || !/^[0-6]{0,42}$/.test(moveString)`
(accept the empty string), matching how `POST /api/explain-move-llm` already validates its `movestring`.
Cross-ref: [[project_anon_deep_reveal_gates]].

## OI-24 — No persistent / discoverable "upgrade to Pro" CTA; all four paywall entries are reactive

**Status**: deferred (surfaced during Stripe staging bring-up, 2026-07-14)
**Area**: `connect-four/src/` — `UpgradeModal` call sites (SetPickerScreen, SagaScreen, PostSetSummaryScreen, DeepRevealPane)

There is **no always-visible upgrade CTA** anywhere (no nav entry, no banner, no settings/account row).
The only ways a free user reaches checkout are reactive: tapping a locked puzzle set, tapping a
tier-gated lesson node, finishing a set whose recommended lesson is Pro-only, or exhausting the weekly
deep-reveal quota (429). A paid-intent user who is not currently hitting a gate has no discoverable path
to subscribe. This is what prompted the user's "I don't see any call to action" observation.

**If picked up**: add a persistent entry point (e.g. an "Upgrade" row in Settings/account, a home banner,
or a nav item) that opens `UpgradeModal` via `useUpgradeCheckout()` — it should pass a real
`returnPathOverride` if launched from a session-only screen. Cross-ref: [[project_auth_payments_state]].

## OI-25 — Paying from the /summary paywall cannot restore the summary (SESSION_ONLY state lost)

**Status**: mitigated, full fix deferred (2026-07-14)
**Area**: `connect-four/src/screens/PostSetSummaryScreen.jsx`, `src/lib/urlMapping.js` (`SESSION_ONLY_SCREENS`)

`/summary` is a `SESSION_ONLY` screen driven by an in-memory `results` prop; a full-page Stripe checkout
redirect reboots the SPA, so on return the `results` are gone and the cold-boot rule sends the user to
`home`. **Mitigation shipped**: `PostSetSummaryScreen` passes `returnPathOverride='/setpicker'` so the
user lands on Challenges (the screen's own back-button destination) instead of home — acceptable, since
they have already seen the summary. A true restore would require persisting `results` (e.g. sessionStorage)
so `/summary` can rehydrate after the round-trip; judged not worth it for now.

**If picked up**: persist the set `results` to sessionStorage keyed by a nonce, include the nonce in the
returnPath, and rehydrate on cold boot. Cross-ref: [[project_auth_payments_state]], [[OI-24]].

## OI-26 — Admin TTS cleanup nulls audio cross-locale under composite explanation_cache key

**Status**: deferred (2026-07-14), non-blocking — localhost/admin-only, self-healing
**Area**: `connect-four/server/index.js` `POST /api/admin/tts/cleanup` (~line 3958)

Since migration 059 made `explanation_cache` PK composite `(position_hash, locale)`, the cleanup's
`.update({ audio_path: null, ... }).in('position_hash', hashes)` filters by bare `position_hash`, so
expiring the `en` row's audio also nulls a **non-expired** `es` row's `audio_path` (while the Storage
object is deleted only for the expired path) — orphaning the `es` object and forcing needless
re-synthesis on next request. Low impact: admin-only, self-heals on the next deep-reveal TTS request.

**If picked up**: scope the `.update()` by the selected rows' `locale` too (join the pruned set on
`(position_hash, locale)`, not `position_hash` alone). Cross-ref: [[project_spanish_output_silent_fallback]].

## OI-27 — Spanish coach audio clips not yet generated (bulk content step)

**Status**: partially resolved (2026-07-14) — admin UI gap CLOSED; only bulk content generation remains
**Area**: `connect-four/scripts/generate-tts.js`, `/admin/audio`

The per-language coach-audio machinery shipped (es clips → `public/audio/coach/es/`, per-lang manifest,
client selection with English fallback). **Admin-UI half RESOLVED**: `/admin/audio` now has a language
dropdown (en/es) and the `/api/admin/audio/*` endpoints are language-aware — Spanish clips can be
generated/approved/previewed through the UI, writing `server/tts-registry.es.json` +
`public/audio/coach/es/coach-audio-manifest.json`. **Remaining gap**: only one smoke clip (`coach.title`)
exists; the ~220-key es set has not been bulk-generated, so Spanish users hear English coach audio (graceful
fallback) for every un-generated key.

**If picked up**: from `/admin/audio` pick "es" and "Generate All New" + "Approve All", or run
`node --env-file=server/.env scripts/generate-tts.js --scan-only --lang es` then `--all-new --lang es`
(note: the CLI has no approve command — approve via the admin UI). ~220 keys, OpenAI cost. Cross-ref:
[[project_spanish_output_silent_fallback]], [[project_lesson_progression_audio_traps]].

## OI-28 — Spanish deep-reveal descoped siblings: lesson-narration audio & blunder one-liner badge

**Status**: descoped by design (2026-07-14) — documented in the plan/spec
**Area**: `connect-four/lessons/*.json`, `server/llmCoachHelpers.js` (`buildBlunderExplainPrompt`)

Two deep-reveal-adjacent surfaces were left English. **Lesson narration**: lesson prose in
`lessons/lesson-*.json` is inline English (not i18n keys), so Spanish lesson audio needs the lesson
*content* translated first — a separate content project; lessons fall back to English audio meanwhile.
**Blunder one-liner badge**: generated in the server-side harvest pipeline with no request/`req.locale`
context, so `Accept-Language` can't reach it — localizing needs a locale threaded through harvest.

**If picked up**: (lessons) translate lesson JSON content, then run per-language `generateLessonAudio`
and store a per-locale audio path per message; (one-liner) thread a locale through the harvest/tagging
pipeline into `buildBlunderExplainPrompt`'s `LANGUAGE_RULE`. Cross-ref: [[project_spanish_output_silent_fallback]].

## OI-29 — SplitReveal live-fit: stale spec-042 contract + missing render-level regression test

**Status**: deferred (2026-07-14) — fix is shipped & user-verified; only follow-up docs/tests remain
**Area**: `connect-four/src/components/SplitReveal.jsx`, `specs/042-mistake-review-unification/contracts/split-reveal-zoom-contract.md`, `connect-four/tests/unit/splitRevealZoom.test.js`

The board-sizing fix (live-fit `maxWidth` from the current `splitPct`, floored at 120, replacing the
frozen `boardW`/`>=200`-gate) is in and verified, but two follow-ups were left:
(1) `contracts/split-reveal-zoom-contract.md §2` still describes the SUPERSEDED frozen behavior (FR-022,
SC-009) and should be updated/annotated so it doesn't mislead;
(2) `splitRevealZoom.test.js` only tests the pure `computeFrozenBoardWidth` (still frozen-by-signature),
so it passes unchanged and gives NO coverage of the actual bug. Add a render-level regression test
asserting the board never spills to full viewport width and never exceeds the top pane when the
container's available height is small.

**If picked up**: update the contract doc; add a DOM/jsdom test that mounts `SplitReveal` with a short
container and asserts `board rendered width <= pane width` and `constrain`/maxWidth stays applied.
Cross-ref: [[project_split_reveal_board_fit]].

## OI-30 — `figure_7` (and other multi-tag patterns) never praised on live user moves; would need transition-gating if added

**Status**: deferred (feature gap, not a bug; surfaced while designing the coach creation-pattern transition fix, 2026-07-14)
**Area**: `connect-four/server/classifier.js` — `classify()` (live user-move single-tag path, ~line 627) vs `classifyPattern()` (multi-tag blunder/puzzle path, ~line 1607); coach phrase pools `coach.figure_7.*` etc. in `src/i18n/en.json`/`es.json`

The live sparring coach round-trip (`POST /api/evaluate-move` → `classify()`) only ever emits one of:
`immediate_threat`, `double_threat`, `forced_win`, `forced_block`, `forbidden_columns`,
`best_move`, `drawing_move`, `suboptimal_move`. The other named tactics — **`figure_7`**, `j_shape`,
`z_threat`, `undercut`, `overcut`, `odd_even_threat`, `claimeven` — are produced **only** by
`classifyPattern()` (the async multi-tag detector powering blunder analysis and puzzles), never by
`classify()`. So although `coach.figure_7.*` (and sibling) phrase pools exist in the i18n bundles,
they are **unreachable on live user moves** (only selectable when a request passes an explicit
`category: 'figure_7'`, i.e. a puzzle). The coach therefore never says "you built a figure-7" during
normal sparring.

**Why deferred**: making the live coach praise `figure_7` et al. is a *new feature* (extend
`classify()`'s single-tag priority chain to run those detectors), not part of the reported
double-threat/forced-win repeat fix. It also carries cost/complexity: those detectors are `async` and
several call the solver (`detectZThreat`, `detectOddEvenThreat`, `detectClaimeven`), unlike the pure
geometry checks `classify()` uses today — adding them to the per-move live path has latency
implications.

**If picked up**: decide which of the multi-tag tactics deserve live coach praise, add them to
`classify()`'s priority chain (mind the sync→async change and solver-call cost), and — critically —
apply the **same absent→present transition-gating** the double-threat/forced-win fix introduces
(design: `docs/superpowers/specs/2026-07-14-coach-creation-pattern-transition-design.md`). These are
all persist-across-moves "creation" patterns, so without transition-gating they would exhibit the
identical repeat bug from day one. Cross-ref: the creation-pattern transition design; memory
[[reference_tactical_pattern_definitions]].

## OI-31 — Staging `.env.staging` DATABASE_URL uses the transaction pooler (6543); `migrate.js` needs the session pooler (5432)

**Status**: latent risk (surfaced 2026-07-14 while building `reset-staging-db.js`; not yet observed to break because no multi-statement DDL was run against staging via this file)
**Area**: `connect-four/server/.env.staging` (`DATABASE_URL=...@aws-1-us-east-1.pooler.supabase.com:6543/...`) vs `connect-four/server/migrate.js` (wraps each migration in `BEGIN ... COMMIT`)

The staging connection string points at the **transaction pooler (port 6543)**. Per the project's own session-vs-transaction-pooler rule (memory [[reference_supabase_connection]]), 6543 is FORBIDDEN for DDL and multi-statement transactions. `migrate.js` runs each migration inside an explicit `BEGIN...COMMIT` with arbitrary DDL, so applying migrations against staging using the `.env.staging` URL as-is can fail or misbehave. Single-statement ops (the `TRUNCATE ... CASCADE` in `reset-staging-db.js`) are unaffected.

**Why deferred**: staging deploys on Railway may inject their own session-pooler `DATABASE_URL`, so this may only bite a *local* `node --env-file=server/.env.staging migrate.js` invocation — unconfirmed either way.

**If picked up**: either change `.env.staging`'s `DATABASE_URL` port to 5432 (session pooler), or have `migrate.js`/the deploy path rewrite 6543→5432 for staging. Verify what URL the staging Railway deploy actually uses for migrations before editing. Cross-ref: [[reference_supabase_connection]], memory `project_spec031_staging_production_deploy`.

## OI-32 — Existing English coach + lesson clips are stale-model (tts-1), not regenerated onto gpt-4o-mini-tts

**Status**: deferred (2026-07-14) — content/quality follow-up; harmless mix, each clip still plays
**Area**: `connect-four/public/audio/coach/*.mp3`, `connect-four/public/audio/lessons/*.mp3`, `scripts/generate-tts.js`, `server/lessonAudio.js`

The TTS default was switched from `tts-1` to `gpt-4o-mini-tts` (which honors the voice-instructions
`prompt` — `tts-1` ignored it entirely). But all audio is cached by a hash of the *text*, so existing
clips do NOT auto-regenerate: the ~220 approved English coach clips and all lesson-narration clips were
synthesized on `tts-1` with **no voice styling** and keep playing until manually regenerated. New/changed
text uses the new model. Result: an inconsistent voice character across old vs new clips, and the
carefully-authored coaching-voice prompt is absent from the old English clips.

**If picked up**: regenerate + re-approve English coach clips (`/admin/audio` en → Generate All New →
Approve All, or `scripts/generate-tts.js --lang en --all-new`), and re-run `generateLessonAudio` for
lessons. Costs OpenAI credit (~220 coach keys + lesson set). Cross-ref: memory
`project_tts_audio_cached_by_text`, [[project_spanish_output_silent_fallback]].

## OI-33 — Coach creation-transition gate: two accepted residuals (edge over-suppression + candidate-generator not in test:fast)

**Status**: accepted / knowingly-left (surfaced 2026-07-14 by the final whole-branch review of the coach creation-pattern transition fix, commits 7be5c7f/0393258/882209b/ebfe335; both judged no-production-risk, not fixed)
**Area**: `connect-four/server/classifier.js` — `classify()` Category 3/4 gates (`hasDoubleThreat`, `detectForcedWin`); `connect-four/server/candidate-generator.js:607`; test excluded from `npm run test:fast` per CLAUDE.md

Two low-severity residuals were deliberately left when the transition gate shipped (it praises `double_threat`/`forced_win` only on an absent→present transition):

1. **Distinct-second-fork over-suppression.** The gate suppresses the tag whenever the mover *already* held the pattern pre-move (`!hasDoubleThreat(board, player)`). If a player already holds a standing fork in cols A&B and this move *creates a second, distinct* fork in cols C&D, the new creation is suppressed too — `hasDoubleThreat(board, player)` is already true. Harmless (the player already had a winning fork, so the coaching truth "you have a winning position" is unchanged), but it is a real "creation" the coach won't call out. Same latent shape applies to `forced_win` via `detectForcedWin`'s inherited geometric imprecision.

2. **`candidate-generator.js:607` classify() consumer is not covered by `test:fast`.** It pushes `cls.tag` into puzzle-generation metadata; its test `candidate-generator.test.js` is excluded from `npm run test:fast` (solver-IPC hang), so the transition change's effect there rode on manual reasoning, not an automated gate. Direction is the same/low-severity, but a regression here would not be caught by the fast suite.

**Why deferred**: both are same-direction (more accurate, fires on creation not persistence) and carry no production risk per the final review. Fixing #1 would require tracking *which* fork columns are new (per-column diff, not a boolean), i.e. more state than the boolean gate; #2 needs a `test:fast`-safe candidate-generator path or a targeted non-hanging fixture.

**If picked up**: for #1, diff pre/post threat *columns* (or gravity-top cells) rather than the boolean `hasDoubleThreat`, so a genuinely-new fork alongside an existing one still counts as creation; for #2, add a non-solver-hanging regression that runs `candidate-generator`'s classify path under `test:fast`. Cross-ref: memory [[project_coach_creation_transition_gate]], [[OI-30]].

## OI-34 — Fallback-only checkout activations do not record the `upgrade_completed` analytics track

**Status**: accepted / knowingly-left (2026-07-15, when the `/api/stripe/verify-session` synchronous activation fallback shipped)
**Area**: `connect-four/server/stripeProcessor.js` — `syncCheckoutSession` vs `handleWebhook`

`syncCheckoutSession` (the fallback that flips `tier: 'paid'` when the webhook is delayed/undelivered) intentionally does **not** insert the `tracks` `upgrade_completed` row — that analytics write lives only in `handleWebhook`'s `checkout.session.completed` branch, to avoid double-tracking when both paths fire (the normal case, where they race and converge). Consequence: if a purchase activates via the fallback **and the webhook never arrives at all** (e.g. a permanently misconfigured/undelivered webhook endpoint in some environment), that upgrade is missing from the `upgrade_completed` analytics stream even though the user is correctly `paid`. Tier correctness is unaffected — this is purely an analytics undercount in the webhook-fully-down edge case.

**Why deferred**: the webhook is the primary path and is expected to deliver in staging/prod (a registered endpoint); the fallback firing *alone* (no webhook ever) is an operational-failure edge, not the steady state. Making the track idempotent-per-session (so either path could safely write it) would need a dedup key (e.g. a `stripe_events`-style ledger keyed on the checkout session id, or an upsert on `(user_id, session_id)`), which is more machinery than the analytics gap warrants today.

**If picked up**: give `syncCheckoutSession` the same `upgrade_completed` insert guarded by an idempotency key on the checkout session id so exactly one track is written whichever path wins. Cross-ref: memory [[project_checkout_verify_session_fallback]]; server-conventions.md "Activation: webhook primary + verify-session fallback".
