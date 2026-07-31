# Open Issues

A human-triageable backlog of known-but-deferred issues: latent bugs, quality gaps, and
scoped-out work that we've consciously decided *not* to fix yet. Distinct from auto-memory
(which holds trigger-first gotchas that ambush an agent editing the relevant code) — this file
is the browsable list of "things we know are wrong and might fix later."

Each entry: what's wrong, why it's deferred, where it lives, and a concrete repro if we have one.

> **Before working any `OI-N`, read [`docs/epics/open-issues-epics.md`](epics/open-issues-epics.md)** (2026-07-29).
> It groups every still-open entry into 8 lane-ordered, spec-ready epics for `/epics-manager`, and its
> *"Already resolved"* section lists the entries below whose **status here is stale** — verified against the
> working tree on 2026-07-29: **OI-1, OI-15, OI-12, OI-24, OI-77**, the *text* half of **OI-18/OI-36/OI-64**,
> and most of **OI-19** are done despite still reading as open. Each is being closed out by the epic that
> covers it, per that file's *Issue closeout convention* (updating this file is a per-epic acceptance
> criterion, not a final cleanup pass).

---

## OI-1 — Single-answer puzzle categories score by solver-score, not by pattern (score-tie ≠ pattern-tie)

**Status**: 📋 SPEC-READY 2026-07-13 — full speckit artifacts authored at `specs/049-puzzle-scoring-spanish-localization/` (Epic 9, via `/epics-manager`); run `/coordinate-implementation` to build. Was: deferred out of spec 044 per FR-014/FR-015b.
**Area**: client-side puzzle scoring — `src/screens/ChallengeScreen.jsx`, `server/moveQualityScorer.js` (`scoreMove`), `server/predicates.js`, `/api/evaluate-move` (+ `/inline`)
**Discovered**: spec 044 QA (2026-07-11)
**Spec 049 approach**: extend the `evaluatePredicate`-gated `accepted` path to the six single-answer categories at the Challenge seam; client sends camelCase `correctCol`/`highlightMetadata` (remap from snake_case — see `docs/architecture/server-conventions.md` §Predicate Evaluator); read stored metadata (no detector recompute); converge the plain + `/inline` handlers (extracted to `server/evaluateMoveHandler.js`) and fix the live `VALID_CATEGORIES.includes`-on-a-`Set` 500 in `/inline` as part of that convergence.

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
`docs/architecture/server-conventions.md` §Predicate Evaluator (ChallengeScreen bypasses via scoreMove).

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
memory: `project_stripe_traps`; `docs/architecture/frontend-conventions.md` (tier source: `store.getProfile()`, never `session.tier`).

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

**Status**: ✅ RESOLVED 2026-07-29 (spec 051 / Epic 5, US1) — subsumed by OI-65's fix. All 15 lessons now
have complete narration audio for every narratable message. `connect-four/tests/lessons/
lessonAudioCoverage.test.js` (new, registered in both `test`/`test:fast`) walks every lesson via the
production `collectMessages()` walker and asserts every populated-text field has a populated,
on-disk audio path: **0 missing** across all 15 lessons. The ad hoc `quickstart.md` step-2 snippet
independently confirms `{ missing: 0, referencedCount: 348, diskCount: 348, orphanCount: 0 }`.
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
on deploy per `docs/architecture/coach-audio-conventions.md`, so the first post-deploy call is always uncached).

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

**Status**: **mechanism RESOLVED, content still open** (updated 2026-07-16) — the "decide on a mechanism" half is done: sibling `text_es`/`audio_es` fields on each `coachMessages[]` entry, resolved server-side by `localizeLesson`/`pickLocalized` in `lessonLoader.js`, with per-language generation via `generateLessonAudio(lesson, {lang})`. **Only lesson 1 (`immediate-threat`) is translated**: measured 2026-07-16, **46 of 50** `coachMessages` across the 13 lessons still have no `text_es`. The remaining work is pure content translation, no longer a design decision.
**Area**: `connect-four/lessons/*.json` (13 files, 50 `coachMessages[].text` strings) consumed by `ConceptScreen.jsx` / `SocraticScreen.jsx`
**Discovered**: spec 049 QA (browser walkthrough, 2026-07-13)
**Silent-failure warning**: `pickLocalized` falls back to the English base value when `_es` is missing or empty, so an untranslated lesson renders English **without any error** — the gap is invisible from the UI. `generateLessonAudio` likewise skips a message with no `text_es`, so clicking "Generate audios" on an untranslated lesson is a legitimate no-op, not a bug. Socratic text is a separate gap: OI-43.

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
translate to Argentinian voseo per `docs/architecture/frontend-conventions.md` (Spanish = Argentinian voseo).

## OI-19 — Hardcoded-English UI strings bypass the i18n key-parity guard

**Status**: ✅ RESOLVED 2026-07-30 (spec `052` / Epic 6, US5 T048–T050) — see the **UPDATE** below:
the first closeout was premature and a browser pass the same day found five more.

> **UPDATE 2026-07-30 (spec 052 browser QA).** This entry was marked resolved on the strength of a
> `grep` inventory, and that inventory missed strings a human sees immediately:
>
> - `ChallengeScreen.jsx` rendered a literal **"Hint"** button (and **"Submit"** for multi-column
>   categories) on every challenge screen, in English, beside otherwise fully-Spanish content —
>   while its sibling `SocraticScreen` already used `t('common.hint')`. Fixed: both now route
>   through `common.hint` / a new `common.submit` key.
> - `PlayOnlineScreen.jsx` — the very file this entry names — still had three literals
>   (`'Opponent'`, `'WebSocket connection failed'`, `'Something went wrong'`). They sat inside a
>   `useCallback([])` websocket closure where the component's `t` isn't naturally reachable, which
>   is why the sweep skipped them. Fixed: `errorMsg` now stores a translation *key* resolved at
>   render (which also avoids a stale-language `t` captured in that closure), and the opponent-name
>   fallback uses the shared `i18n` singleton.
>
> **Lesson for the next sweep**: a grep for `title=`/`aria-label=`/`placeholder=` does not catch a
> bare JSX text child (`>Submit<`), a `label=` prop, or a string literal inside a closure. Confirm
> an i18n sweep in the browser with the app set to Spanish before closing it.

The audit called for below was run (T048 inventory: `grep` over `src/screens` + `src/components` for
`title=`, `aria-label=`, `placeholder=`, and bare JSX text children not wrapped in `t()`). Findings
and disposition:

- **Fixed — learner-facing.** `PlayOnlineScreen.jsx` was un-i18n'd end to end (it did not even
  import `useTranslation`); all 16 of its user-visible literals now route through a new
  `playOnline.*` namespace in both locales — the two `title="Play Online"` TopBars named in this
  issue plus "Waiting for opponent…", "Your turn", "`<name>` is thinking…", "You won!",
  "`<name>` won", "Draw", "Log in to save your game and see analysis.", "Play again", "Resign",
  "Play online", "Setting up your account…", "Looking for opponent…" (+ its hand-rolled
  `player/players in queue` plural, now `queueCount_one`/`_other`), "Match found! Loading game…",
  and "Try again".
- **Fixed — learner-facing.** `CoachDialog.jsx` "Replay narration"/"Stop narration"
  (`audio.replayNarration`/`audio.stopNarration`), `PastGamesListScreen.jsx` "Sign in to see your
  past games" (`games.signin_prompt`), `CLChallengeScreen.jsx` "Loading…"×2 / "Lesson not found."
  (`common.loading`, new `lesson.notFound`), `KbTermPopup.jsx` `aria-label="Close"`
  (`common.close`), `CoachAvatar.jsx` `aria-label="Coach"` (`common.coach`).
- **Already fixed before this pass.** `ReviewScreen.jsx`'s `title="Review"`, listed above as
  known-remaining, reads `t('review.title')` today — re-verified at source, no change needed.
- **Scoped out by owner decision (spec 052 Decision 2, 2026-07-30) — NOT an oversight.** The
  admin-only literals stay English: `CandidateDashboard.jsx` (`title="Puzzles need reindexing"`,
  `placeholder="Count (1–100)"`, `placeholder="Seed (optional)"`),
  `admin/PuzzlePickerRow.jsx` (`title="Move up"/"Move down"/"Remove"` + their `aria-label`s),
  `admin/SlideEditor.jsx` / `admin/LessonMetaForm.jsx` / `AdminLessonListScreen.jsx` /
  `AdminLessonEditorScreen.jsx` labels and `aria-label`s, and `RejectModal.jsx`'s
  `placeholder="Describe the issue..."`. The project treats admin tooling as English-only; the
  owner ruled translating it out of scope to keep this P3 story small. Revisit only if admin
  tooling is ever handed to non-English authors.
- **Deliberately left as-is.** `PlayOnlineScreen.jsx`'s "Open room on papergames ↗" link is marked
  `DEBUG-ONLY … Remove/hide before launch` in the source — translating a link scheduled for
  deletion would be waste.
- **Still not done (the lint idea below).** No automated "flag hardcoded JSX text" check exists;
  that remains a nice-to-have, not tracked here.

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
`en.json`/`es.json` (Spanish = Argentinian voseo, `docs/architecture/frontend-conventions.md`).
Consider a lint/test that flags hardcoded JSX text to prevent regressions.

## OI-20 — Onboarding post-game value loop incomplete (coach silent, no analysis, game lost on signup)

**Status**: ✅ RESOLVED 2026-07-13 (onboarding follow-ups, branch `feature/polish`, commits `ef24f17`/`4522e78`/`ffca704`/`a21bff8`). All three gaps fixed and verified end-to-end in a real browser + DB: (1) coach speaks the greeting from `coach.onboardingMission.greeting` via `useCoachSpeech` (mp3 generated + approved); (2) game-end routes onboarding → review → onboarding-only "Continue" CTA → import offer (`pickGameEndScreen` returns `'review'` for both); (3) anon games re-associate on migrate via `device_uuid` and appear in Past games after sign-up. Regression confirmed: `puzzle_attempts` + `lesson_progress` still migrate. See `api-conventions.md` Migrate Endpoint. One residual staging item logged (real-browser autoplay of the greeting — see `staging_checks.md` Epic 8).
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
   `docs/architecture/api-conventions.md` for full detail.

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
write path), mirroring the authenticated branch. Cross-ref: `docs/architecture/api-conventions.md`.

## OI-23 — Deep-reveal TTS 400s on the opening move (empty movestring) for ALL users

**Status**: ✅ RESOLVED 2026-07-29 (spec 051 / Epic 5, US3 Fix 3)
**Area**: `connect-four/server/index.js` — `GET /api/user/tts/deep-reveal` param validation;
`connect-four/server/deepRevealMoveStringGuard.mjs` (new)

**Was**: the route validated `if (!moveString || !/^[0-6]{0,42}$/.test(moveString))` → `400`. Because
`!""` is `true`, an **empty** `moveString` (the opening move) was rejected as "missing" even though the
regex itself allows 0 chars (`{0,42}`), so its deep reveal rendered text but was silently voiceless.

**Resolution**: the route's validation was extracted to `isValidDeepRevealMoveString()`
(`server/deepRevealMoveStringGuard.mjs`), which delegates to the same `validateMoves` shared validator
`POST /api/explain-move-llm` already used correctly — `typeof moveString !== 'string'` instead of the
falsy `!moveString` short-circuit. Regression test:
`connect-four/tests/unit/deepRevealMovestring.test.js` (registered in both `test` and `test:fast`),
confirmed RED against the literal pre-fix predicate (`!!(moveString && /^[0-6]{0,42}$/.test(moveString))`)
before the fix landed.

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
`returnPathOverride` if launched from a session-only screen. Cross-ref: memory `project_stripe_traps`.

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
returnPath, and rehydrate on cold boot. Cross-ref: memory `project_stripe_traps`, [[OI-24]].

## OI-26 — Admin TTS cleanup nulls audio cross-locale under composite explanation_cache key

**Status**: ✅ RESOLVED 2026-07-29 (spec 051 / Epic 5, US3 Fix 2)
**Area**: `connect-four/server/index.js` `POST /api/admin/tts/cleanup`;
`connect-four/server/explanationCacheCleanup.js` (new)

**Was**: since migration 059 made `explanation_cache` PK composite `(position_hash, locale)`, the
cleanup's `.update({ audio_path: null, ... }).in('position_hash', hashes)` filtered by bare
`position_hash`, so expiring the `en` row's audio also nulled a **non-expired** `es` row's
`audio_path` for the same position.

**Resolution**: the update logic was extracted to `cleanupExpiredExplanationAudio()`
(`server/explanationCacheCleanup.js`), which now selects `locale` alongside `position_hash`/
`audio_path`, groups expired rows by `locale`, and issues one `.update({...}).eq('locale', loc)
.in('position_hash', hashesForLoc)` per locale present in the batch — a different locale's row for
the same `position_hash` is never touched by another locale's cleanup. Regression test:
`connect-four/server/explanationCacheCleanup.test.js` (registered in both `test` and `test:fast`),
confirmed RED against the pre-fix ungrouped `.in('position_hash', hashes)` update before the fix
landed. Cross-ref: [[project_spanish_output_silent_fallback]].

## OI-27 — Spanish coach audio clips not yet generated (bulk content step)

**Status**: ✅ RESOLVED 2026-07-29 (spec 051 / Epic 5, US1) — the remaining bulk-generation gap is closed.
`server/tts-registry.es.json` now holds 218 entries (217 `approved`, 1 `ineligible`), an exact match to
`server/tts-registry.json`'s (English) 218/217/1 split, and `public/audio/coach/es/` holds 218 mp3s with
217 in the approved manifest — the ~220-key es set is fully generated and approved, not just the one
smoke clip (`coach.title`) this entry originally described. Verified 2026-07-29 via direct registry/
manifest counts (T009 evidence, spec 051 T011). The admin-UI half was already resolved 2026-07-14.
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

**Status**: ✅ RESOLVED (blunder one-liner half) 2026-07-29 — spec 051 US4 (`specs/051-audio-verification-tts/`, T033–T038); lesson-narration-audio half remains open, unchanged, see below.
**Area**: `connect-four/lessons/*.json` (open half); `connect-four/server/mechanismExplainer.mjs`, `connect-four/server/scripts/compute.mjs`, `connect-four/server/index.js` (resolved half)

Two deep-reveal-adjacent surfaces were originally reported English-only.

**Blunder one-liner — resolved, but not by fixing the code this entry originally named.** T033
(spec 051) drove the live app in Chrome via chrome-devtools MCP and captured real
`POST /api/explain-move-llm` network requests (not a static grep) to find which server response
actually populates the mistake explanation a learner reads. Verdict: `composeExplanation`
(`server/index.js`, sole caller of the harvest-pipeline-style `POST /api/explain-move`) and
`buildBlunderExplainPrompt` (`server/llmCoachHelpers.js`, this entry's originally-named target) are
**both dead code from the learner's point of view** — no frontend caller of either exists (confirmed
both by `grep -a` over `src/` and by the captured network trace showing zero requests to
`/api/explain-move`). The live one-liner-equivalent is `POST /api/explain-move-llm`'s `explanation`
field, produced by `computeMechanism` (`server/mechanismExplainer.mjs`) →
`buildPromptForCondition` (`server/scripts/compute.mjs`). That function **already threads a
`locale` argument** (`buildPromptForCondition(glossary, fv, condition, locale = 'en')`) and appends
`SPANISH_OUTPUT_DIRECTIVE` (Rioplatense voseo, verde/gris terminology) whenever `locale === 'es'` —
shipped previously in commit `da8a916` ("feat(i18n): deep-reveal Spanish output directive"), an
unrelated prior epic, independent of the `composeExplanation`/`buildBlunderExplainPrompt` path this
entry named. Confirmed live end-to-end in the running app: switching the Settings language toggle to
Español and re-requesting the same blunder position (a locale-keyed cache miss — `explanation_cache`
is matched on `(position_hash, locale)`, so an English row for that position does not shadow the
Spanish request) returned a fresh Spanish `explanation` field with `accept-language: es` on the
request. English-locale behavior is unchanged (verified against the same position with
`accept-language: en`). Regression coverage: `server/tests/mechanismExplainer.test.mjs` (two new
tests — `locale "es"` threads `SPANISH_OUTPUT_DIRECTIVE` into the LLM prompt; `locale "en"` and the
unset default omit it). **FR-021 (owner-ratified, do not relitigate)**: already-cached English
`explanation_cache` rows are NOT backfilled to Spanish — the `(position_hash, locale)` cache key
already means an English row and a Spanish row for the same position simply coexist as separate
rows; the English row is naturally superseded only when regenerated by a future Spanish-locale
request for that position, no migration or purge was written.

**Lesson narration audio — still open, unchanged.** Lesson prose in `lessons/lesson-*.json` is
inline English (not i18n keys), so Spanish lesson audio needs the lesson *content* translated first —
a separate content project; lessons fall back to English audio meanwhile.

**If picked up** (lesson-narration half only): translate lesson JSON content, then run per-language
`generateLessonAudio` and store a per-locale audio path per message. Cross-ref:
[[project_spanish_output_silent_fallback]].

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
Cross-ref: `docs/architecture/frontend-conventions.md` (SplitReveal board fit).

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
`docs/knowledge-base/` (tactical pattern predicates).

## OI-31 — Staging `.env.staging` DATABASE_URL uses the transaction pooler (6543); `migrate.js` needs the session pooler (5432)

**Status**: latent risk (surfaced 2026-07-14 while building `reset-staging-db.js`; not yet observed to break because no multi-statement DDL was run against staging via this file)
**Area**: `connect-four/server/.env.staging` (`DATABASE_URL=...@aws-1-us-east-1.pooler.supabase.com:6543/...`) vs `connect-four/server/migrate.js` (wraps each migration in `BEGIN ... COMMIT`)

The staging connection string points at the **transaction pooler (port 6543)**. Per the project's own session-vs-transaction-pooler rule (memory [[reference_supabase_connection]]), 6543 is FORBIDDEN for DDL and multi-statement transactions. `migrate.js` runs each migration inside an explicit `BEGIN...COMMIT` with arbitrary DDL, so applying migrations against staging using the `.env.staging` URL as-is can fail or misbehave. Single-statement ops (the `TRUNCATE ... CASCADE` in `reset-staging-db.js`) are unaffected.

**Why deferred**: staging deploys on Railway may inject their own session-pooler `DATABASE_URL`, so this may only bite a *local* `node --env-file=server/.env.staging migrate.js` invocation — unconfirmed either way.

**If picked up**: either change `.env.staging`'s `DATABASE_URL` port to 5432 (session pooler), or have `migrate.js`/the deploy path rewrite 6543→5432 for staging. Verify what URL the staging Railway deploy actually uses for migrations before editing. Cross-ref: [[reference_supabase_connection]], memory `project_spec031_staging_production_deploy`.

## OI-32 — Existing English coach + lesson clips are stale-model (tts-1), not regenerated onto gpt-4o-mini-tts

**Status**: ⚠️ PARTIALLY FIXED, STAYING OPEN 2026-07-30 (spec 051 / Epic 5, US5 T050/T055) — the drift
*mechanism* is closed, but the bulk re-voicing this entry originally asked for is deliberately incomplete,
pending an explicit owner go-ahead. Specifically:
- **Shipped**: the single-synthesis-path fix (batch 5, T039–T048) — every production caller now goes
  through `synthesize(text, lang)`/`synthesizeStream(text, lang)` in `server/ttsProvider.js`, which
  resolves config internally and refuses any model outside `ALLOWED_TTS_MODELS = ['gpt-4o-mini-tts']`
  before any network call, so a future clip cannot regress onto a legacy silently-instructionless model
  again (see `docs/architecture/coach-audio-conventions.md` §"The single-synthesis-path guarantee").
- **Shipped**: the lesson fleet was checked, not blindly regenerated (batch 1, T008) — of 348
  lesson-audio mp3s, only **2** predate the 2026-07-14 model-switch commits (`slides[1].coachMessages[0]`
  = `41dcfb2a0d945146.mp3` and `slides[2].coachMessages[0]` = `4d377642248f22e2.mp3`, both in
  `connect-four/lessons/lesson-01-immediate-threat.json`); the other 346 are already on the current model.
- **Shipped this batch (2026-07-30)**: a **5-clip English coach sample** regenerated via the surgical
  per-key `POST /api/admin/audio/generate` (not a bulk `generate-all`), per an explicit owner decision to
  audition quality before authorizing the full spend — `coach.spoken.sparring.outcome.win`,
  `coach.spoken.sparring.outcome.loss`, `coach.spoken.immediate_threat.hint.0`,
  `coach.spoken.figure_7.blunder.2`, `coach.spoken.undercut.optimal.2` (`generated_at` moved from
  2026-06-19 to 2026-07-30 for all 5; confirmed `model=gpt-4o-mini-tts`, non-empty
  `instructions` via the `/tmp/epic5-server.log` diagnostic line). These sit `awaiting_approval` on
  `/admin/audio`, un-approved by design (approval is a separate, deliberate step).
- **Still open, pending owner sign-off**: the remaining **~212** English coach clips (of 217 total minus
  the 5 sampled) are still on the pre-2026-07-14 model and not regenerated; none of the 5 sampled clips
  (nor any others) have been re-approved; the 2 stale lesson clips above are not regenerated. Ready-to-run
  commands are recorded in `specs/051-audio-verification-tts/tasks.md` T051/T052.

**Original status (superseded by the above)**: deferred (2026-07-14) — content/quality follow-up;
harmless mix, each clip still plays
**Area**: `connect-four/public/audio/coach/*.mp3`, `connect-four/public/audio/lessons/*.mp3`, `scripts/generate-tts.js`, `server/lessonAudio.js`, `connect-four/server/ttsProvider.js`

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

**If picked up**: give `syncCheckoutSession` the same `upgrade_completed` insert guarded by an idempotency key on the checkout session id so exactly one track is written whichever path wins. Cross-ref: memory `project_stripe_traps`; server-conventions.md "Activation: webhook primary + verify-session fallback".

## OI-35 — QA run 2026-07-15 findings backlog (agentic_QA_2026-07-15-1321.md) — unfixed at close

**Status**: deferred / open (surfaced 2026-07-15 by the 6-batch `/app-qa` coordinator run; a plan to address the full findings set is queued via a `superpowers:writing-plans` prompt, not yet executed). **The authoritative, full-detail backlog for this run is the committed findings file `agentic_QA_2026-07-15-1321.md` at repo root** — this OI is a discoverability pointer, not a re-listing. Read that file (per-finding severity, exact code location, repro) before working any item.
**Area**: multiple (mistake-review nav, lessons/Spanish localization, upgrade funnel, input validation)

Headline items still unfixed at session close (see the file for the rest — several [minor] English-in-Spanish leaks, `/api/scores` 500 on malformed movestring, scattered `tier==='paid'` checks, anon challenge-progress 401):

- **[major] Back button infinite-toggles `/mistakes ↔ /stats` on a COLD-loaded `/mistakes`** (empty nav stack), never reaching Home. In-session nav unwinds fine — bug is cold-load specific.
- **[major] Lesson CONTENT is English-only in Spanish mode** — lesson JSON has no `_es` fields and `lessonLoader.js` has no locale logic; narration/concept/highlight text renders English. The whole "Learn" surface degrades. (Needs a product decision on approach — static `_es` vs reuse the deep-reveal LLM localization path vs deferral.)
- **[product decision] Anon single free deep-reveal is spendable on a *suboptimal* move**, contradicting the "blunders only" design intent — needs a product call, not a mechanical fix.
- **[product/UX] Upgrade funnel has orphaned ends**: `/api/stripe/portal` has zero frontend call sites (paid users can't manage/cancel in-app); no standalone Settings upgrade entry (free users can only upgrade by hitting a specific paywall); annual plan has no savings framing.

**Reclassified during the session (NOT a bug)**: the candidate-generation "fetch failed" finding was downgraded [major]→[minor] as an environmental flake — see memory [[project_generate_candidates_fetch_failed_flake]]. The paid-puzzle-category paywall it left unexercised is now positively testable (generate→approve→reindex a paid category, then confirm a free user hits the paywall).

**Why deferred**: this was a QA + planning session, not an implementation one; fixes are being routed through a plan. **If picked up**: consume `agentic_QA_2026-07-15-1321.md` as the work-list and `staging_checks.md` for the deploy-only verification residue.

## OI-36 — Spanish lesson content: only lesson 1 of 13 translated; lessons 2–13 (~6,000 words) remain English-only

**Status**: deferred / open (scoped down by explicit user decision 2026-07-16 — see Task 4 in `.superpowers/sdd/`; NOT an oversight)
**Area**: `connect-four/lessons/lesson-02-*.json` through `lesson-13-*.json`; `connect-four/scripts/translate-lessons.mjs` (script, validated); `server/lessonLoader.js#localizeLesson` (plumbing, already shipped and unaffected by this gap)

D1 (offline `_es` sibling fields, human-reviewed, no request-time LLM) shipped for **lesson 1 (`immediate-threat`) only**. The drafting script (`connect-four/scripts/translate-lessons.mjs`) is written, has a real `--help`/`-h` that exits 0 doing no work, supports `--lesson <id>` / `--dry-run` / `--force`, and was validated end-to-end on lesson 1 (dry-run reviewed for voseo + verde/gris correctness, real run diffed line-by-line, `npm run test:fast` green). Lessons 2–13 were deliberately **not** run: translating ~6,860 words across 12 lessons on a still-unvalidated prompt in one shot would let a systematic voseo or green/gray-perspective error land in all of them before a human ever reviewed one. Lesson 1 was the calibration sample; the user reviews it before authorizing the rest.

**Non-breaking in the meantime**: `localizeLesson`'s per-field English fallback means every untranslated lesson (2–13) simply renders English text in Spanish mode — the same behavior as before this task, not a regression. No code changes are needed to "support" the gap; it self-resolves as each lesson gets translated.

**If picked up**, per lesson id:
1. `cd connect-four && node --env-file=server/.env scripts/translate-lessons.mjs --lesson <id> --dry-run` — read the printed Spanish first.
2. Review checklist on the dry-run output before running for real:
   - **Voseo**: `usá/tenés/podés/jugá/encontrá/sos/vos` — never tú-Spanish (`usa/tienes/puedes/juega/encuentra/eres/tú`).
   - **verde/gris**, never rojo/amarillo or the raw English words green/gray. Remember `userPerspective: 'red'` → player 1 = **verde**; `'yellow'` → player 2 = **gris**. This is the internal-token trap that inverts a lesson's meaning if mistranslated.
   - `[term:...]`/`[zone:...]` tags and `columna N` references preserved verbatim.
   - Diff contains **only** added `_es` keys — no reformatting/reordering churn.
3. `node --env-file=server/.env scripts/translate-lessons.mjs --lesson <id>` (real run), then `git diff` line-by-line before committing.
4. **After the text is committed**, generate narration audio for that lesson — preferably via the admin editor's "Generate audios" button with the language toggle on **es** (now lang-wired, commit `2201894`); or `curl -sX POST localhost:3001/api/admin/lessons/<id>/generate-audio -H 'Content-Type: application/json' -d '{"lang":"es"}'` (server running locally). Then verify `prune-audio` reports `{deleted: 0}` before trusting it (Task 3's trap: `collectReferencedAudio` must already cover `audio_es`). **Translate and voice in the same pass**: a lesson translated but not yet voiced serves Spanish text with the **English** audio clip (the per-field fallback backfills `audio` from English), which reads worse than silence.
5. **Terminology drift to fix before/during the bulk pass**: lesson 1 rendered "four-cell window" as both "ventana de cuatro **celdas**" and "ventana de cuatro **casillas**" (visible on one screen). Pin a glossary in the script's prompt so a consistent term is used across all ~6,000 words.
5. Run `npm run test:fast` once per lesson (or batch) before committing.

Heaviest remaining lessons by word count: `lesson-11-figure-7-trap.json` (~860 words), `lesson-10-overcut.json` (~825), `lesson-12-j-shape.json` (~789), `lesson-05-claimeven.json` (~787). Cross-ref: memory `project_spanish_output_silent_fallback`; `docs/architecture/frontend-conventions.md` (Spanish = Argentinian voseo); OI-35 (this gap was originally flagged there as a QA finding); `docs/architecture/` D1 decision record for lesson localization.

## OI-37 — Accuracy 100% still reads oddly next to a lost game (product question, not a bug)

**Status**: deferred / open (surfaced during Batch B task 18, finding 15)
**Area**: `connect-four/src/screens/ReviewScreen.jsx` (Accuracy card)

Task 18 fixed the *copy* contradiction: a 0-mistake resigned/lost game now shows `review.cleanButLost` ("No mistakes on the board — but the game was lost. Review how it ended.") instead of the old "Clean game. Nothing to revisit." copy, and the Past Games card suppresses its "No mistakes" chip when `outcome === 'lost'`. **The Accuracy metric itself (100%) was deliberately left unchanged** — it measures board-move optimality (every scored move matched the solver's best line) and is correct on its own terms; resigning isn't a board move and is out of its denominator by design. Do not "fix" this by folding resignation into the accuracy calculation: doing so would conflate two different questions ("did every move I made match the solver's best line?" vs. "did I finish the game?") into one number, destroying the metric's ability to answer either one cleanly.

Whether a 100%-accuracy badge should still be visually softened, annotated, or paired with an explicit "you resigned" note when the outcome is a loss is a product/UX call, not a mechanical fix — needs its own brainstorm if picked up. Not blocking; the copy fix already removes the "flawless" contradiction from the coach line.

## OI-38 — KB term popup summary body has no Spanish fallback for entries missing `short_summary_es`

**Status**: deferred / **OPEN** (surfaced during Batch B task 13, finding 10 — explicitly out of scope for that task; count re-verified and corrected 2026-07-30 by spec `052` T056, translation still not done — see the UPDATE at the end of this entry)
**Area**: `docs/knowledge-base/*.md` (KB content); wherever `/api/explain-move-llm`'s `terms` map is built server-side

Task 13 fixed the KbTermPopup UI leaks: the popup header no longer shows a raw KB slug (now `kb.term.<kbId>` i18n-driven, humanized fallback for anything not yet keyed) and the CTA buttons ("Go to lesson"/"Go to practice") are now localized. The popup **body** (the 1-2 sentence summary) is a different, non-UI gap: it is sourced directly from each KB entry's `short_summary` (English) or `short_summary_es` (Spanish) field in `docs/knowledge-base/<id>.md`. Entries without a populated `short_summary_es` silently render the English `short_summary` in Spanish mode — this is KB *content* coverage, not a UI hardcoding bug (compare OI-36, the same shape of gap for lesson content). Batch D item 34 confirmed the ones that do have `short_summary_es` render correctly.

If picked up: audit which of the KB entries have `short_summary_es` populated vs falling back to English, and extend the same reviewed-translation-batch approach used for OI-36 (voseo, verde/gris, no silent fabrication).

**UPDATE 2026-07-30 (spec `052` / Epic 6, US5 T056) — count corrected, issue stays OPEN.** The
"45 of 49" figure quoted above was stale and conflated file count with entry count. Re-counted at
source in `docs/knowledge-base/`:

```
ls docs/knowledge-base/*.md | wc -l                                  # 49 files
ls *.md | grep -v '^README.md$' | grep -v '^_sketches.md$' | wc -l    # 47 entries
grep -la short_summary_es *.md | grep -v README | grep -v _sketches   # 4 entries
```

**47 entries** (`README.md` and `_sketches.md` are not entries), **4** carry a `short_summary_es`
(`allis-claimeven.md`, `community-immediate-threat.md`, `community-double-threat.md`,
`community-figure-7.md`), **43 missing**. Spec 052 corrected the count only — the bulk translation
of those 43 short summaries was explicitly **deferred to a standalone content spec** and was NOT
performed. Until it is, Spanish KB-term popups keep falling back to the English `short_summary` for
43 of 47 entries. This entry stays **open**.

## OI-39 — `getSubscriptionStatus` (paymentProcessor.js) has no production call site; three (soon four) tier-gate sites read the client-cached tier directly

**Status**: logged for traceability, not a bug — an explicit spec-intent-vs-implementation gap, not a runtime defect that breaks any flow. See Batch B task 16 (finding 13).
**Area**: `connect-four/server/paymentProcessor.js:31-46`; `connect-four/src/screens/sagaLock.js:13`; `connect-four/src/screens/PostSetSummaryScreen.jsx:55`; `connect-four/src/store/CheckoutReturnBanner.jsx:72`

Spec-045 item 12 called for tier gates to be checked through a single server-authoritative interface. `paymentProcessor.js:31-46` deliberately documents `getSubscriptionStatus` as "test-only in production wiring: no production call site is wired through it today" — an existence proof that the function exists and is exercised by tests, but nothing in the running app actually calls it. In practice, all three current paywall gate sites (`sagaLock.js:13`, `PostSetSummaryScreen.jsx:55`, `CheckoutReturnBanner.jsx:72`) instead read the client-cached tier value directly (`store.getProfile()`/session tier), never a fresh server check.

**Do not refactor the three call sites to close this issue.** Routing them through a server-side interface from the frontend is an architecture decision needing its own brainstorm — it would touch every paywall in the app for zero user-visible benefit today, since nothing currently exploits the gap (the client-cached tier is refreshed through the normal auth/profile flow).

**Strengthens the case for future consolidation**: W4 Task 9 adds a **fourth** independent tier read, in `SettingsScreen`, for its new Subscription section — meaning there are now four places that each independently decide "is this user paid," none of them going through `getSubscriptionStatus`. If/when this is picked up, design a single tier-check interface first, then migrate all four (not three) call sites together.

## OI-40 — Anonymous puzzle-attempt writes fall back to a shared literal `device_uuid: 'anonymous'`, cross-contaminating unrelated anon users

**Status**: deferred / open (surfaced during Task 23 while verifying the puzzle-attempts write path ahead of fixing the `challenge-progress` read-path 401)
**Area**: `connect-four/server/index.js` (~2458), the `POST /api/user/puzzle-attempts` write path (symbol: the handler computing `deviceUuid`)

The write path already supports anonymous callers by design (`user_id: req.user?.id ?? null`, schema nullable since migration 003), but its device_uuid derivation is:

```js
const deviceUuid = req.user?.device_uuid || req.body.deviceUuid || 'anonymous';
```

The final fallback, `'anonymous'`, is a **string literal**, not a per-device identifier. Any anonymous client that omits `deviceUuid` in its request body (e.g. a stale client build, a client whose local profile hasn't generated a `device_uuid` yet, or a bug in a future caller) has its attempt rows written under that same shared literal — silently merging its puzzle-attempt history with every other anonymous caller that also fell through to the fallback. This is an access-control/data-integrity smell: the now-fixed `GET /api/user/challenge-progress` read path (Task 23) would faithfully **serve back** this cross-contaminated pool to whichever anon device happens to pass `device_uuid=anonymous` (it wouldn't, since that fails UUID validation — but any two real clients that both hit the fallback would still share one one bucket keyed by the literal, invisible to either).

**Do not fix as part of Task 23** — this is a write-path bug, independent of and out of scope for the read-path 401 fix, and deserves its own scoped change (likely: derive/require a real device_uuid client-side before this call, or reject the write with 400 when no identifier is available, rather than defaulting to a shared bucket).

## OI-41 — `/pricing` is a bare static page; needs a real designed pricing page, and its prices are hardcoded

**Status**: deferred / open (created 2026-07-16 while unblocking Paddle domain review)
**Area**: `connect-four/server/pricing.html`, route registered in `connect-four/server/index.js` (symbol: the `app.get('/pricing', ...)` sendFile line beside `/terms` and `/privacy`)

> **Where the code is**: `pricing.html` and its route are **not on this branch**. They ship to `main` separately via the `chore/legal-pages` PR (branched from `origin/main`, 4 files), because Paddle domain review blocks on them and this branch is ~496 commits from merging. This branch deliberately carries only the issue, not a second copy of the pages — one source of truth. If you are reading this and `connect-four/server/pricing.html` does not exist, pull `main`.

`pricing.html` was written to satisfy a hard Paddle requirement — domain review demands publicly reachable pricing — not as a product surface. It is a plain unstyled table matching `terms.html`'s minimal CSS, with no design, no plan comparison beyond one row, no CTA into checkout, and no i18n (English only, while the app ships full es.json key parity per spec 049).

**Two distinct pieces of work, do not conflate them:**

1. **Design work** — a real pricing page: plan comparison, annual/monthly toggle, CTA into the existing checkout flow, Spanish copy (Rioplatense voseo per `docs/architecture/frontend-conventions.md`). This is what the issue is nominally about.

2. **The drift bug, which is the more dangerous half.** `pricing.html` hardcodes `$2.99`/`$21.99`/`39%`/`$1.83` as literal HTML text. The app itself never hardcodes prices: `useStripePrices.js` fetches them live from `GET /api/stripe/config`, which reads the real Stripe price objects precisely so "the amounts shown in UpgradeModal never drift from what we charge". The static page reintroduces exactly the drift that endpoint exists to prevent — change a price in the processor dashboard and this page silently lies, on the page a payment provider's reviewer reads. The `20` Deep Reveals/week figure is likewise a literal, duplicating `quotaLimits.js:FREE_DEEP_REVEAL_WEEKLY_LIMIT` (which has its own history of drifting — see the QA 2026-07-15 / D4 comment there, where the constant was 5 while copy promised 20).

**Compounding factor**: the Paddle migration will move the price source of truth off Stripe entirely. Whatever replaces this page should read prices from the live config endpoint (or its Paddle equivalent, e.g. Paddle.js `PricePreview`, which also gives country-localized prices), never from static text.

**Also carried by this page** (must survive any redesign — they are Paddle domain-review requirements, not decoration): the verbatim Merchant of Record clause ("Our order process is conducted by our online reseller Paddle.com…"), the 14-day refund statement, and the link to `/terms`.

**Update (2026-07-18, verified during a live domain-review resubmission)**: two premises above are now stale — `connect-four/server/pricing.html` **does** exist on this branch/checkout (the "not on this branch" note is outdated), and the price source of truth has finished moving off Stripe to Paddle (`usePaddlePrices.js` / `GET /api/paddle/config`, not the `useStripePrices`/`/api/stripe/config` referenced above). The drift bug (item 2) is **not currently manifesting**: `pricing.html`'s hardcoded `$2.99`/`$21.99`, `en.json`'s `upgrade.body`/`upgrade.price` strings, and the **live** Paddle catalog's actual price objects were all cross-checked and agree, and this was the pricing consistency Paddle's domain reviewer flagged and (pending resubmission) should now clear. The underlying risk itself is unchanged and unfixed — nothing prevents these three from drifting apart again the next time a price changes, since `pricing.html`/`en.json` are still hand-maintained literals, not derived from the live config endpoint. Item 1 (real designed pricing page) is still fully open.

## OI-42 — Lesson audio is not manageable from `/admin/audio`

**Status**: ✅ RESOLVED 2026-07-29 (spec 051 / Epic 5, US2) — `/admin/audio` now has a second, independent
"Lesson Audio Manager" section alongside the pre-existing Coach Audio Manager. It lists every lesson's
narratable messages (concept-slide `coachMessages`, slide `infoProse`, and `socratic.messages[phase][]`),
grouped by `"Slide N"` / `"Socratic"`, with an inline `<audio>` player and a per-message Generate/
Regenerate button, reusing the page's existing en/es toggle (no second language selector). Status is
computed live from the on-disk lesson JSON on every fetch — no new registry, index, or cache was
introduced, honoring FR-013's original registry-free decision this entry called out. Shipped via:
`GET /api/admin/lessons/:id/audio-status?lang=en|es` (new, `connect-four/server/index.js`) — calls
`reloadLessons()` before every read so status reflects a same-session on-disk edit without a server
restart; an optional `locator` field on the existing `POST /api/admin/lessons/:id/generate-audio`
(threaded through `generateLessonAudio()` in `connect-four/server/lessonAudio.js`) that (re)synthesizes
exactly one message, settling on `200 { generated: [], failed: [] }` (not `404`) for a stale/no-match
locator; and the new section in `connect-four/src/pages/AdminAudioPage.jsx`. Contract:
`specs/051-audio-verification-tts/contracts/admin-lesson-audio-endpoints.md`; architecture doc:
`docs/architecture/lesson-editor.md` §"Lesson audio audition & management"; API doc:
`docs/architecture/api-conventions.md` §"Lesson Audio Generation & Pruning Endpoints". Verified end-to-end
in a real browser against the running dev server: lesson picker lists all 15 lessons, en/es toggle swaps
both text and audio for the lesson section, a single-message Regenerate fires exactly one `generate-audio`
POST with that message's `locator` and re-fetches status, and a hand-edit to a lesson JSON on disk is
reflected in the status response on the very next fetch with no server restart (closes the liveness half
this entry originally flagged as unaddressed). None of the pre-existing coach-audio status list, config
editor, or TTS sandbox changed behavior.

**Area**: `connect-four/src/pages/AdminAudioPage.jsx` (coach audio admin UI) vs. `connect-four/src/screens/AdminLessonEditorScreen.jsx` + `connect-four/server/index.js` (lesson audio endpoints)

`/admin/audio` manages **coach** clips only, and does it well: a grouped status list (`awaiting_approval` / `needs_audio` / `approved` / `ineligible`) via `GET /api/admin/audio/status?lang=`, per-key generation (`POST /api/admin/audio/generate`), an inline player (`GET /api/admin/audio/play/:slug?lang=`), an en/es dropdown, and a TTS prompt/speed/voice/model editor.

**Lesson** narration has none of that. The lesson editor only exposes a whole-lesson `POST /api/admin/lessons/:id/generate-audio` and a separate `POST /api/admin/lessons/prune-audio`. There is no way to audition a lesson clip in-app — the filename is `sha256(text).slice(0,16) + '.mp3'`, so auditing one today means hand-resolving the hash and finding the file on disk.

**Why this isn't a trivial merge into the existing coach admin UI** — the two systems differ on every axis:
- **Keying**: lesson clips are keyed by `sha256` of the narration text; coach clips are keyed by an i18n key/slug.
- **Source of truth**: lesson audio paths live on the lesson JSON's own `audio`/`audio_es` fields, which FR-013 deliberately keeps registry-free (no separate DB/JSON index to drift from the lesson content); coach audio has an explicit registry (`tts-registry.json` / `tts-registry.es.json`) with an approval workflow (`awaiting_approval` etc.) that lesson audio has no equivalent of.
- **Storage layout**: lesson clips sit flat in `public/audio/lessons/`; coach clips are nested `public/audio/coach/<lang>/`.

**Suggested shape if picked up**: add a Lessons section to `/admin/audio` that lists each lesson's `coachMessages` per language, with status **derived live from the lesson JSON** (not stored, to respect FR-013's registry-free decision), plus an inline player and a per-message generate action — mirroring the coach UX without introducing a second registry.

**Motivation**: the repo owner wants a single place to manage and audition all TTS audio in the app, including judging whether the Argentinian-accent narration on lesson clips actually sounds right — something currently impossible without leaving the admin UI.

## OI-43 — Socratic coach text is i18n-keyed, so it is never narrated (silent in every language)

**Status**: ✅ RESOLVED 2026-07-29 (spec 051 / Epic 5, US1) — Task 8 (per-lesson `generate-audio` for
`en`/`es`) is confirmed done: `lessonAudioCoverage.test.js`'s coverage assertion covers
`socratic.messages[phase][]` (via `collectMessages()`, which walks slides AND socratic) with 0 missing
audio across all 15 lessons/both languages. The plan's V7 browser check is now an automated,
programmatic replacement rather than a manual pass: `connect-four/tests/dom/SocraticNarration.dom.test.jsx`
(new, registered in `test:dom`) drives the real `SocraticScreen` against lesson-01's real socratic
content and asserts, via stubbed `HTMLMediaElement.play()`/`.pause()`, that the `ask`, `hint`, and
`correct` (reward) messages each narrate their own clip and that unmounting mid-narration calls
`pause()` (stops playback on navigate-away) — in both a Hint-never-clicked run and a Hint-clicked run,
per FR-004's explicit two-run requirement. Plan: `docs/superpowers/plans/2026-07-16-socratic-lesson-content.md` (Tasks 1–7 done, `test:fast` green at 1413 pass).
**Area**: `connect-four/src/screens/SocraticScreen.jsx`, `connect-four/server/lessonAudio.js`, `connect-four/server/lessonLoader.js`, `connect-four/scripts/translate-lessons.mjs`

**What landed**: the text now lives in lesson JSON at `socratic.messages` (phase→array map, `text`/`text_es`/`audio`/`audio_es` shape); 12 lessons migrated (`lesson-04` has `socratic: null`); the i18n `socratic.*` and `lesson.<id>.socratic.*` keys are **deleted** from both locales; `SocraticScreen` narrates via `getNarrationQueue` + `speakLessonAudio` mirroring `ConceptScreen`, with a replay button; `collectMessages` now unifies the two audio walkers, and `translate-lessons.mjs` was extended to cover `socratic.messages[phase][].text`.

**Task 8 prerequisite (silent data loss if skipped)**: the migration wrote the lesson files on disk; nothing watches `lessons/`. A server started before that migration holds a stale boot-time cache, and `generate-audio` reads that cache and `saveLessonFile`s it back — **reverting the migration while returning a normal-looking 200**. Restart the server first, then confirm with `curl -s localhost:3001/api/admin/lessons/immediate-threat | grep -c messages` (0 ⇒ stale). See [[project_lesson_disk_edit_cache_clobber]].

Arriving at a lesson's Socratic board shows a coach bubble (e.g. *"Voy a cometer un error aquí. Mirá si podés castigarlo."*) but **no speech plays**. This is not a Spanish bug — it is silent in English too.

The text is **not lesson content**. It lives in i18n under a top-level `socratic.*` namespace (`ask`, `wrong1`, `wrong2`, `correct`, `hint`), rendered via ``t(`lesson.${lessonId}.socratic.ask`, { defaultValue: t('socratic.ask') })``. `SocraticScreen` contains **zero** `speakCoachMessage` / `speakLessonAudio` / `useCoachSpeech` calls.

It falls between both TTS pipelines: the coach pipeline only sees `coach.spoken.*` (0 registry entries match socratic), and `generateLessonAudio` only walks `slides[].coachMessages`, never `lesson.socratic`.

**Owner's ruling (2026-07-16)**: *lesson content is a thing in itself and must not be assembled from i18n keys.* So the fix is to move the text into the lesson JSON with the same `text`/`text_es`/`audio`/`audio_es` shape the slides already use.

**Two facts that make it cheap**: (1) the Spanish is already written — all five generic strings and the three per-lesson overrides exist in `es.json` (unlike slide content, 46/50 untranslated), so this ships Spanish Socratic voice for all 13 lessons with no translation work; (2) audio is content-addressed by text hash, so the 12 lessons sharing an identical generic string share **one** mp3 — duplicating the text into each lesson costs ~14 files per language, not 13×.

**The trap any implementation must respect**: `generateLessonAudio` and `collectReferencedAudio` walk the lesson tree **independently**. Add socratic audio to the first without the second and `pruneOrphanedLessonAudio` deletes the new clips as orphans. Extract one shared walker used by both rather than patching each.

**Scope note**: only 3 lessons override socratic text in i18n (`opening-centre`, `opening-imitate`, `opening-sharp`), and only keys `ask`/`hint`/`correct` — never `wrong1`/`wrong2`. `lesson.node.*` and `lesson.confirmation.*` are UI chrome, not lesson content — leave them alone. Related: [[project_lesson_progression_audio_traps]], OI-18, OI-44.

## OI-44 — More lesson content assembled from i18n keys: `lesson.<id>.title` duplicates the lesson JSON's own `title`, and `socratic.goalPrompt` is authored but rendered nowhere

**Status**: ✅ RESOLVED 2026-07-30 (spec 052 "Lesson learning surface & authoring polish" US2, both halves)
**Area**: `connect-four/lessons/*.json`, `connect-four/src/i18n/{en,es}.json` (`lesson.<id>.title`), `connect-four/server/lessonLoader.js` (`localizeLesson`), `connect-four/src/screens/ChallengeScreen.jsx`

Two more instances of the same "lesson content built from i18n keys" pattern OI-43 rejects:

1. **`lesson.<id>.title`** resolves via `t()` with a `defaultValue`, while **every lesson JSON also carries its own `title` field**. Two homes for one string; unclear which is authoritative.
2. **`socratic.goalPrompt`** is authored in **9 of 13** lesson JSONs (English only — no `goalPrompt_es` anywhere) and `localizeLesson` has a dedicated branch localizing it — but **nothing renders it**. The only `goalPrompt` hits in `src/` are the unrelated `GOAL_PROMPTS` map in `CandidateDashboard.jsx` (puzzle generation). It is authored dead data with live localization plumbing.

**Resolution — title (US2 title half)**: `lesson.title` is now the sole source of truth. `SagaScreen.jsx`,
`ConceptScreen.jsx`, and `SocraticScreen.jsx` all read `lesson.title` directly (no `t()` call); the
full `lesson.<id>` i18n subtrees (all 15 lesson ids) were removed from `en.json`/`es.json`. Regression
guard: `connect-four/tests/dom/LessonTitleConsolidation.dom.test.jsx` mounts all three screens against a
real lesson fixture with **empty** i18n resources and asserts the title still renders.

> **Correction, same day (2026-07-30), found in this spec's own code review.** The step above, shipped
> alone, was a **learner-facing regression**: the deleted `es.json` subtree was the only thing
> localizing lesson titles, so 14 of 15 titles silently rendered in English for Spanish learners
> (`"Immediate Threats"` for `"Amenazas Inmediatas"`, `"I Play Where You Play"` for `"Yo Juego Donde
> Vos Jugás"`, …). Nothing threw — the classic graceful-fallback trap.
>
> The spec's own T016 rule ("do NOT localize `title`; no `title_es`") caused it. That rule's stated
> justification was that the i18n key owned titles and a `title_es` would silently lose to it — a
> justification this very migration deleted. The rule outlived its reason.
>
> **Fixed by** (owner decision, overriding T016): `title_es` restored on all 15 lesson JSONs with the
> exact Spanish strings from the deleted `es.json` block; `title` added to `localizeLesson`'s `_es`
> merge; `getLessons()` made locale-scoped (`GET /api/lessons` now passes `req.locale`) because the
> Saga list renders the title directly; `langHeaders()` added to the list fetches in `SagaScreen.jsx`
> and `StatsScreen.jsx` and to `CLChallengeScreen.jsx`'s cold-boot lesson fetch. Guarded by a new
> `tests/unit/lessonContent.test.js` case asserting every lesson carries a non-empty `title_es`.
> Docs corrected: `docs/architecture/lesson-editor.md` and `api-conventions.md` both asserted the now
> false "title is deliberately NOT localized".

**Resolution — `goalPrompt` (US2 prompt half, Settled Decision 4/8)**: `confirmationChallenges[].goalPrompt`
is now wired as a per-lesson **override** of the confirmation challenge's coach-bubble prompt.
`ChallengeScreen.jsx`'s `initPuzzle` uses `puzzle.goal_prompt` (threaded through from `ch.goalPrompt`
in the lesson-mode inline-challenge mapping) as the displayed text when present, falling back to the
existing random `coach.spoken.<category>.prompt.{0,1,2}` pool pick when absent — the shared pool stays
untouched and outcome-neutral (it also serves DB-drawn practice boards). Per Settled Decision 8, no
pre-generated audio clip exists for override text yet, so the same branch sets
`lastCoachKeyRef.current = null` instead of the picked pool key — the coach bubble goes silent for
that message instead of playing the old, now-mismatched `coach.spoken.<category>.prompt.N` clip
(FR-029). `socratic.goalPrompt` remains **unrendered by design** — the interactive Socratic phase's
prompt is already served by `socratic.messages.ask`, which plays that per-lesson-prompt role; see
`docs/architecture/lesson-editor.md` (rewritten "Fields the learner UI ignores" table + "To change a
challenge prompt" paragraph + the audio-silence note).

**Counts, re-measured 2026-07-30** (grepped fresh — supersedes the stale "9 of 13, English only" above,
which described `socratic.goalPrompt`, not the field this fix wires):
- `confirmationChallenges[].goalPrompt`: **24/24** confirmation challenges across the 10 lessons that
  have any (`confirmationChallenges.length > 0`) carry a `goalPrompt`, and **24/24** also carry a
  `goalPrompt_es` — full English+Spanish coverage on the field that now renders.
- `socratic.goalPrompt` (still dead, unaffected by this fix): present in **15/15** lesson files;
  `socratic.goalPrompt_es` present in only **13/15** (2 lessons fall back to the English text per
  `localizeLesson`'s per-field fallback — harmless since the field is never rendered either way).

**Acceptance evidence**: closes both `agentic_QA_2026-07-25-0015.md` `[major]` findings — "Claimeven
confirmation-challenge copy calls a WON position a draw" (the claimeven lesson's `goalPrompt` already
stated the win correctly pre-fix; it is now actually rendered, and was reshaped to fit the ~205-char
coach-bubble cap) and "Undercut challenge prompt tells the learner to 'Find the undercut' — but the
grader marks the undercut column WRONG" (the undercut lesson's `goalPrompt` already said "play any
other column" pre-fix, generically, naming no column; it too is now rendered, reshaped to fit the cap).
New regression test: `connect-four/tests/dom/ChallengeScreenGoalPrompt.dom.test.jsx`.

## OI-45 — Regenerating an approved coach clip puts the new take live, unapproved

**Status**: ✅ RESOLVED 2026-07-29 (spec 051 / Epic 5, US3 Fix 1) — disclosure added; publish-immediately
behavior deliberately kept (see spec's ratified Assumption: "Publish-immediately stays the model for
approval" — gating playback behind approval was considered and rejected as it could take a
currently-working clip offline the moment someone clicks regenerate).
**Area**: `connect-four/scripts/generate-tts.js`, `connect-four/src/pages/AdminAudioPage.jsx`
(`handleGenerate`)

Approval controls **entry into the manifest**, and the manifest is the only thing the client consults
(`enqueueIfApproved`). Regenerating a clip overwrites the mp3 **in place at the same path** and flips
`status` to `awaiting_approval` **without touching the manifest**, so the slug stays published and the
new, unreviewed recording goes live immediately.

**Mitigation shipped 2026-07-16**: `generate-tts.js --key <k>` prompts before overwriting an approved
clip. **Resolution 2026-07-29**: the admin UI's per-key `handleGenerate(key)` now shows the same
warning (`window.confirm`, reusing the CLI's copy minus the CLI-specific `git checkout` recovery line)
before sending the request whenever the item's current status is `'approved'`; cancelling aborts with
no fetch sent. This remains disclosure, not a gate — a regenerated clip still publishes immediately
once the admin proceeds. Regression test:
`connect-four/tests/dom/AdminAudioPageWarning.dom.test.jsx` (registered in `test:dom`), confirmed RED
against the pre-fix `handleGenerate` (no warning at all for a single-key regenerate) before the fix
landed.

## OI-46 — `SocraticScreen`'s `showHint` is sticky, so the `correct` message can never render (and now, never narrates)

**Status**: ✅ RESOLVED 2026-07-30 (spec 052 Epic 6 US1, FR-001/FR-002)
**Area**: `connect-four/src/screens/SocraticScreen.jsx`

**Resolution**: `showHint` now resets on every phase transition via
`useEffect(() => { setShowHint(false); }, [phase])`, so hint and phase messages never
coexist in the bubble — see `docs/architecture/lesson-editor.md` §"Hint yields to phase"
for the documented decision and rationale. Regression tests:
`connect-four/tests/dom/SocraticHintPhase.dom.test.jsx` (new; three cases — hint-then-correct,
hint-then-wrong, no-hint-then-correct) and `connect-four/tests/dom/SocraticNarration.dom.test.jsx`'s
rewritten "run 2" case; both confirmed RED against the pre-fix `showHint` (sticky) before the fix
landed. Both registered in `test:dom`.

`showHint` was `useState(false)`, set `true` by the Hint toolbar button, and previously **never reset** — not on a phase transition, not on a drop. The coach-message selector short-circuits the phase map entirely:

```js
const currentMessages = socratic?.messages?.[showHint ? 'hint' : phase] ?? [];
```

So once the student clicks Hint, the bubble is pinned to the hint text for the rest of the exercise: solving the puzzle never shows *"Exactly! You saw it."* — the reward message is unreachable. Since the Socratic narration effect keys off the same expression, that message is now also never **spoken**. The Continue button still appears (it keys off `phase`, not `showHint`), so the exercise is completable and the bug reads as "the coach just stopped reacting".

**Why it wasn't fixed with OI-43**: that change was content plumbing — moving copy out of i18n into lesson JSON. Altering the phase/hint interaction is a behavior change with no test pinning it, and it would have inflated a diff whose whole value was being narrow and verifiable.

**Testing consequence, already applied**: the OI-43 plan's V7 browser pass is deliberately split in two — a Hint-free run that verifies `correct` narration, then a separate Hint run — because a single linear pass that clicks Hint can never reach `correct`. Do not "simplify" it back into one pass.

**Fix applied**: exactly the one-line fix anticipated above —
`useEffect(() => { setShowHint(false); }, [phase])` — with hint-then-wrong-move confirmed
(via `SocraticHintPhase.dom.test.jsx` case (b)) to drop the hint rather than let it coexist
with the wrong-move message. Related: OI-43, [[project_lesson_progression_audio_traps]].

## OI-47 — `GET /api/games` predates the offset-pagination `id`-tiebreaker finding and is unaudited

**Status**: deferred / open
**Area**: `connect-four/server/index.js` (`GET /api/games`, offset/limit pagination)

`/api/coach/queue` was fixed to append a unique `id ASC` tiebreaker after its semantic ordering, because `ORDER BY <non-unique columns>` + `OFFSET`/`LIMIT` is nondeterministic when rows share sort-key values (e.g. a batch import stamping many rows with the same `created_at`) — ties can shuffle between pages across separate queries, silently skipping some rows and duplicating others. That rule is documented in `docs/architecture/api-conventions.md`. `GET /api/games` predates the finding and has never been audited against it: it fetches from both `games` and `papergames_games`, sorts/paginates in JS rather than in SQL, so the failure mode may differ from the SQL `OFFSET`/`LIMIT` case — but the underlying risk (a non-unique sort key across a paginated result set) has not been checked.

**If picked up**: verify whether the in-JS sort key used for `/api/games` pagination is unique per row (add an `id` tiebreaker if not), and confirm the two-table merge can't reorder rows across pages independently of the tiebreaker fix.

## OI-48 — Reason engine "Fix 6": a win-forfeiting move is still tagged `drawing_move` upstream

**Status**: deferred / open
**Area**: blunder-tagging pipeline (upstream of `server/llmCoachHelpers.js`'s `drawing_move` grounding-rule branch)

The `drawing_move` blunder tag is applied whenever the **played** move only draws, even when the **better** move was a forced win — conflating "best draws" with "best WINS". Repro: on an empty/near-empty board, center (col 4, 0-idx 3) is a first-player forced win while col 3/col 5 only draw; playing a drawing column gets tagged `drawing_move`. A text-level patch (Fix 4, 2026-06-25) reworded the grounding rule to stop asserting "not a win for either side," but the tag itself is still assigned by the upstream tagging pipeline without distinguishing "forfeited a win" from "played a genuine draw."

**If picked up**: Fix 6 — categorize a move that forfeits a forced win as a missed-win / outcome-flip case in the upstream blunder-tagging pipeline, not `drawing_move`.

## OI-49 — `/api/puzzles/draw` has no solved/revealed filter; `puzzle_attempts.outcome` enum is partly aspirational

**Status**: deferred / open
**Area**: puzzle serving (`server/index.js`'s `GET /api/puzzles/draw`) vs. `puzzle_attempts.outcome`

`GET /api/puzzles/draw` filters only on `.eq('category', …)`, `.eq('is_active', true)`, `.not('position','is',null)`, `.order('position')` — it never reads `puzzle_attempts`, so there is no exclusion of already-solved or already-revealed puzzles from the serving pool at all. Meanwhile `puzzle_attempts.outcome` is constrained to `'correct_first' | 'correct_retry' | 'revealed' | 'tied' | 'abandoned'`, but only `'correct_first'` and `'abandoned'` are ever written by any code path (`ChallengeScreen.jsx`) — `'revealed'`, `'correct_retry'`, and `'tied'` are unused. Is the enum aspirational (a filter was planned but never built), or is the intent genuinely "never exclude anything from the pool" (in which case the unused outcomes and their CHECK-constraint entries are dead)?

## OI-50 — Candidate-insert retry can double-insert rows (no unique constraint)

**Status**: deferred (flagged by the final whole-branch review, QA-remediation 2026-07-16; not fixed — low blast radius)
**Area**: `connect-four/server/index.js` (the `supabase.from('candidates').insert(rows)` retry added by W11 Task 26); `connect-four/server/migrations/011_category_slugs.sql`

Task 26 added bounded retry/backoff on the candidate-insert path so a transient dropped connection no longer aborts a whole category with 0 inserted. But the retry fires on **any** error, including a network blip that lands *after* Postgres has already committed the insert — precisely the failure it targets. On retry, the same `rows` are inserted again.

`candidates` has **no unique constraint** to catch this — only the non-unique `idx_candidates_move_string` (see `011_category_slugs.sql`). So a mid-insert network hiccup can silently double a batch.

**Why deferred**: admin/localhost-only surface, run manually, and duplicate candidates are self-correctable (re-run or dedupe). No user-facing impact.

**If picked up**: the batch already carries `generation_run_id` + `move_string`, so a dedupe key exists — either add a unique index on `(generation_run_id, move_string)` and treat `23505` as success, or only retry on pre-commit error classes (connection-refused/timeout), never on an ambiguous post-send error.

## OI-51 — worktree-ports self-derive leaks `worktree-ports.sh`'s ownership-probe comments to the dev console

**Status**: deferred (flagged by code review during worktree-port-isolation implementation, 2026-07-17; not fixed — cosmetic only)
**Area**: `connect-four/vite.config.js` (`resolvePorts()`), `connect-four/server/index.js` (`resolveWorktreePortEnv()`)

Both self-derive helpers call `execSync(scriptPath, { encoding: 'utf8' })` with no `stdio` override, so the child's stderr (the `# API_PORT=... is free/bound by pid(s): ...` ownership-probe lines `worktree-ports.sh` prints for humans running `eval "$(./worktree-ports.sh)"` interactively) is inherited by the parent and printed to the console on every raw, un-sourced `npm run dev`/`npm run vite`/`npm run server`/`node server/index.js` invocation. Harmless — stdout parsing (the actual port values) is unaffected — but it's unexpected noise the first time someone sees it.

**Why deferred**: purely cosmetic; doesn't affect correctness or the port-isolation guarantee.

**If picked up**: pass `stdio: ['ignore', 'pipe', 'ignore']` to both `execSync` calls so only stdout (the `export KEY=value` lines) is captured and stderr is suppressed during self-derive.

## OI-52 — worktree-ports self-derive silently falls back to legacy `3001`/`5173` if `worktree-ports.sh` fails

**Status**: deferred (flagged by code review during worktree-port-isolation implementation, 2026-07-17; not fixed — low probability)
**Area**: `connect-four/vite.config.js` (`resolvePorts()`), `connect-four/server/index.js` (`resolveWorktreePortEnv()`)

If `worktree-ports.sh` is missing, not executable, or throws (e.g. `git`/`cksum`/`lsof` unavailable, or the file was deleted) while running inside a **linked worktree** with `API_PORT`/`VITE_PORT`/`PORT`/`FRONTEND_URL` unset, both self-derive helpers fall back to the hardcoded legacy defaults (`vite.config.js`: `Number(apiPort) || 3001`, `Number(vitePort) || 5173`; `server/index.js`: `process.env.PORT || 3001` after `resolveWorktreePortEnv()`'s catch-and-warn). That silently rebinds the worktree's dev server into the main checkout's port range — the exact collision this whole feature exists to prevent — rather than failing loudly. `strictPort` only catches this if the main checkout's Vite happens to already be bound to `5173` at that moment; if the main checkout isn't running, the worktree would silently start on `5173`/`3001` with no error.

**Why deferred**: `worktree-ports.sh` is a simple, already-tested bash script with no external dependencies beyond `git`/`cksum`/`lsof` (all present on any dev machine that can run this repo), so the failure mode is low-probability. Documented here rather than fixed immediately since it needs a deliberate design choice (fail loudly vs. warn-and-continue) rather than a one-line patch.

**If picked up**: detect "this is a linked worktree" (the same `GIT_DIR`/`GIT_COMMON` check `worktree-ports.sh` uses) directly in `vite.config.js`/`server/index.js`, and if so, treat a self-derive failure as fatal (throw / refuse to start) instead of silently defaulting to the legacy ports.

## OI-53 — `req.user.email` is always `undefined` server-side (Paddle/Stripe `customerEmail` never pre-fills)

**Status**: deferred (found during spec 050 US2 manual T029 verification, 2026-07-18; not fixed — pre-existing, inherited from Stripe, not introduced by this batch)
**Area**: `connect-four/server/index.js` (`loadUser()`), `connect-four/server/userHelpers.js` (`USER_PROFILE_SELECT_COLUMNS`), `connect-four/server/paddleRoutes.js`/`stripeRoutes.js` (`email: req.user.email`)

`loadUser()` builds `req.user` as `{ id: data.user.id, ...profile }`, where `profile` is read via `USER_PROFILE_SELECT_COLUMNS` (`server/userHelpers.js:15`: `'tier, deep_reveal_count, deep_reveal_reset_at, device_uuid, papergames_id, last_import_at, paddle_customer_id, onboarding_status'`) — this list never includes `email`. The raw Supabase auth user's email lives on `data.user.email`, which `loadUser()` discards. Confirmed live: `POST /api/paddle/create-checkout`'s response was `{"priceId":"...","successUrl":"/settings"}` with `customerEmail` silently absent (JSON drops the `undefined` key) for both an anonymous test user and by code-reading `stripeRoutes.js:49`'s identical `email: req.user.email` pattern — so Stripe's checkout customer pre-fill has had this same gap since spec 045.

**Impact**: `Paddle.Checkout.open({ customer: { email: undefined } })` — the checkout overlay's email field is never pre-filled for a signed-in user; they must type it manually. Does not block checkout from completing.

**Why deferred**: cosmetic UX gap (one extra keystroke-field for the user), not a functional or security defect; pre-existing in the Stripe path this migration mirrors — fixing it is a `loadUser()`/`USER_PROFILE_SELECT_COLUMNS` change outside spec 050 US2's scope.

**If picked up**: thread `data.user.email` into `req.user` in `loadUser()` (`server/index.js`) alongside the `profile` spread — no new DB column needed, the email is already on the Supabase auth user object returned by `authClient.auth.getUser(token)`.

## OI-54 — Paddle sandbox account has no default payment link set (manual dashboard step blocks full T029 sandbox checkout)

**Status**: resolved (2026-07-18) — user set the default payment link to `http://localhost:6397` in the sandbox dashboard. A full end-to-end sandbox checkout (test card `4242 4242 4242 4242`) was completed live and confirmed: `users.tier` flipped to `paid`, `paddle_customer_id` was set, Settings correctly rendered "DecodeC4 Pro" + "Manage subscription". Verification of this fix directly surfaced two further real bugs, both fixed in the same pass — see below.

**Two bugs found and fixed during this verification** (2026-07-18, not filed as separate OI entries since both were fixed immediately, not deferred):
1. **`Paddle.Checkout.open()`'s `settings.successUrl` caused a genuine full-page browser reload on checkout completion** — confirmed via Paddle's own docs ("Handle checkout success": passing `successUrl` navigates the parent window there) and via the network log (a hard `GET /settings` reloading every JS module). This violated FR-003/US2 AC1 ("no full-page redirect") and raced with the in-flight `verify-transaction` fetch, silently losing the tier grant. Fixed in `connect-four/src/lib/useUpgradeCheckout.js`: `successUrl` is no longer passed to `Paddle.Checkout.open()`; `handleCheckoutCompleted` now explicitly calls `paddle.Checkout.close()` once `verify-transaction` resolves, keeping the whole flow in-app with no navigation.
2. **`verifyTransaction`'s single check ran before Paddle's own transaction record had settled to `completed`** — confirmed via Paddle's docs (`build/checkout/upsell-checkout`: "this typically takes less than a second") and live repro (the same transaction, re-queried via the Paddle API a few seconds later, showed `status: 'completed'` when the immediate check had returned an earlier status). This silently defeated the synchronous activation fallback for every real checkout. Fixed in `connect-four/server/paddleProcessor.js`: `verifyTransaction` now does one bounded retry after a 1200ms delay before concluding `not_completed` — not an open-ended poll, consistent with this feature's single-check design, but enough to cover Paddle's documented settle time.

Also fixed in the same pass, per user request: the checkout's quantity stepper (nonsensical for a single-seat subscription) was removed by setting `quantity: { minimum: 1, maximum: 1 }` on both Paddle prices via the Paddle API (`client.prices.update`) — Paddle's overlay checkout has no client-side setting to hide it; the quantity-limit approach is Paddle's own documented workaround (`build/checkout/pass-update-checkout-items`).

`npm run test:fast`: 1417/1417 passing after all fixes.

---
**Original entry (superseded by the above, kept for history):**

~~**Status**: deferred (found during spec 050 US2 manual T029 verification, 2026-07-18; needs a one-time manual dashboard action, no code fix)~~
**Area**: Paddle sandbox dashboard account settings (external to the repo) — affects `connect-four/src/lib/useUpgradeCheckout.js`'s manual verification only

Opening the Paddle.js overlay checkout in this sandbox account (after fixing OI's sibling `successUrl` bug — see the `useUpgradeCheckout.js` fix landed in spec 050 US2 T023) renders a **"Something went wrong"** dialog instead of the checkout form. Root-caused via the `paddle-docs` MCP: every Paddle account (sandbox or live) requires a **default payment link** set under **Paddle > Checkout > Checkout settings > Default payment link** before `Paddle.Checkout.open()` will render anything; this sandbox account (verified via `checkoutDomains.list()` and the absence of any working checkout) has none configured, and no API method is exposed to a direct (non-partner-embedded) seller account to set it programmatically — `PATCH /settings/account` is documented only under the partner/embed-billing seller-API-key surface, not for a direct seller's own sandbox account.

**Impact**: blocks the card-entry portion of T029's manual verification (completing a sandbox checkout with test card `4242 4242 4242 4242` on both plans, confirming the transaction appears in the sandbox Transactions dashboard). Everything upstream of this — `GET /api/paddle/config`, `POST /api/paddle/create-checkout`, Paddle.js `initializePaddle()`/`Checkout.open()` being invoked with correct sandbox-environment args, no full-page navigation (URL bar never changed host/path) — was verified working via Chrome DevTools MCP against the running dev server.

**Why deferred**: requires a one-time manual action in the Paddle sandbox dashboard (`https://sandbox-vendors.paddle.com/checkout-settings`, set Default payment link to e.g. `http://localhost:5173/` or any placeholder — sandbox doesn't verify it), which no available tool (MCP or otherwise) can perform on this account's behalf.

**If picked up**: sign in to `https://sandbox-vendors.paddle.com/checkout-settings`, set the Default payment link field to any URL (`http://localhost/` is Paddle's own suggested placeholder), save, then re-run T029's card-entry steps.

## OI-55 — Paddle tier-grant identity (`customData.app_user_id`) is client-supplied with no server-side binding

**Status**: partially resolved (2026-07-18, unreviewed judgment call — see below; not a rubber-stamped requirement, sanity-check before trusting it as settled)
**Area**: `connect-four/server/paddleProcessor.js` (`createCheckout`, `handleWebhook`), `connect-four/src/lib/useUpgradeCheckout.js`

`server/paddleRoutes.js` calls `createCheckout({ userId: req.user.id, ... })`, but `createCheckout` never uses `userId` — it's silently dropped. The frontend independently sets `customData: { app_user_id: session?.user?.id }` when opening the Paddle.js overlay, reading it from client-side React store state. `handleWebhook`'s `transaction.completed` branch trusts `data.customData?.app_user_id` unconditionally to decide which user's tier to flip to `'paid'`, with no server-side cross-check — unlike `verifyTransaction` (the sync fallback), which does check `customData.app_user_id` against the authenticated `req.user.id`.

A code-review verification pass ruled out the session-load-race variant of this concern (the UI gates all screens on `sessionChecked`, so `session.user.id` is guaranteed populated by the time Upgrade is clickable). What remains is a forgery vector: since Paddle's `custom_data` is plain client-supplied checkout metadata that Paddle echoes back verbatim on the webhook with no re-validation, a user could edit `customData.app_user_id` via devtools before opening the overlay and have a real payment grant paid tier to an arbitrary account — though the practical incentive is unclear (the attacker spends real money to upgrade someone else's account, not their own).

**Why deferred**: fixing this requires an architecture decision (e.g. binding checkout to a Paddle-side `customer_id` created server-side and looked up on `handleWebhook`, vs. accepting client-supplied `custom_data` as the standard/expected Paddle integration pattern) rather than a safe one-line patch. Paddle's own `checkout-web` skill docs don't offer a stronger built-in binding mechanism for this exact case.
**If picked up**: decide whether to harden this (e.g. only trust `custom_data` on a user's *first* payment, and cross-check `data.customerId` against an already-established `users.paddle_customer_id` for every subsequent event) or explicitly accept the current trust model as adequate for this app's risk profile; document the decision in `docs/architecture/server-conventions.md`'s "PaymentProcessor Seam" section either way.

**Resolved (2026-07-18, non-interactive judgment call, NOT human-reviewed)**: implemented the harden direction. `handleWebhook`'s `transaction.completed` branch now reads `users.paddle_customer_id` for the target userId before granting tier; a user's first-ever payment (no established `paddle_customer_id`) is still trusted as before (nothing to cross-check against), but every subsequent `transaction.completed` claiming that userId must match the already-established `paddle_customer_id` or the tier/`tracks` write is skipped (`{ handled: true, eventType, securityRejected: true }`, logged via `logError`) rather than granted. See `docs/architecture/server-conventions.md`'s new "Identity binding on `transaction.completed` (OI-55)" subsection (under "PaymentProcessor Seam") for the full behavior, and `server/paddleProcessor.test.mjs`'s 4 new `OI-55:` test cases. **This does NOT close the first-payment forgery window** (a forged `customData.app_user_id` on the TARGET account's own first payment is still possible in principle) — closing that fully needs a different binding mechanism (e.g. a server-minted Paddle customer id at checkout time) and was judged out of scope for this pass. Flagging explicitly: this direction was chosen unilaterally because no human was available to make the product-risk call the issue originally asked for — treat it as a proposal to sanity-check, not settled policy.

## OI-56 — Paddle migration dropped two test-coverage areas with no replacement

**Status**: resolved (2026-07-18)
**Area**: `connect-four/tests/unit/paddlePrices.test.js`, `connect-four/server/paddleProcessor.test.mjs`

1. The deleted `tests/unit/stripePrices.test.js` covered `computeAnnualSavings`/`formatPrice` pure-function logic (discount math, null-safety, es/en locale suffix behavior, and a named regression guard for a "doubled `/mo/mo`" bug). These functions now live in `src/lib/usePaddlePrices.js` and are still used in production (`src/components/UpgradeModal.jsx`), but no test file calls them post-migration — `paddlePrices.test.js` only covers `GET /api/paddle/config` route wiring.
2. The deleted `server/stripeRoutes.substitutability.test.mjs` built a real Express app + `http.createServer` and sent real HTTP requests to `/api/stripe/webhook`, exercising the route's own raw-body middleware ordering end-to-end. `paddleProcessor.test.mjs` only calls `handleWebhook(...)` as a plain function — no test exercises `/api/paddle/webhook` over real HTTP, so a future accidental reordering of `express.raw()` ahead of the global JSON parser in `server/index.js` would go undetected by the suite.

**Why deferred**: both are genuine regression-coverage gaps but require writing new test suites rather than a quick fix; the underlying production code is confirmed correct today (verified by manual/live checks during batch implementation and QA).
**If picked up**: (1) port `stripePrices.test.js`'s pure-function cases to call `computeAnnualSavings`/`formatPrice` directly from `usePaddlePrices.js`; (2) add an HTTP-level test (real Express app + `http.createServer`, mirroring the deleted Stripe test's pattern) that POSTs a signed payload to `/api/paddle/webhook` and asserts the raw-body middleware ordering holds.

**Resolved (2026-07-18)**: (1) `connect-four/tests/unit/usePaddlePrices.test.js` ports all 8 of `stripePrices.test.js`'s cases verbatim (fixtures unchanged) against `computeAnnualSavings`/`formatPrice` in `src/lib/usePaddlePrices.js` — confirmed red-for-the-right-reason by temporarily reintroducing the "doubled /mo/mo" bug (`interval: 'month'` instead of `null` in `computeAnnualSavings`'s `perMonth`) and observing the regression-guard test fail, then reverting. (2) `connect-four/server/paddleWebhookHttp.test.mjs` builds a real Express app + `http.createServer`, mounts the exact two middleware lines `server/index.js` uses (route-scoped `express.raw()` before the global `express.json()`), and POSTs an HMAC-SHA256-signed payload (mirroring the real Paddle Node SDK's `ts=<unix>;h1=<hex>` / `${ts}:${rawBody}` algorithm, confirmed against the paddle-docs MCP) to `/api/paddle/webhook` via a mock `paddleClient.webhooks.unmarshal` that performs the actual verification math against whatever raw bytes arrive. A second test in the same file builds an app with the two middlewares in the WRONG order and asserts the request now fails signature verification — proving the correct-ordering test is not vacuous. Both files are wired into `package.json`'s `test` and `test:fast` scripts. `npm run test:fast`: 1417/1417 passing (1402 baseline + 8 new `usePaddlePrices.test.js` cases + 3 new `paddleWebhookHttp.test.mjs` cases + 4 new OI-55 `paddleProcessor.test.mjs` cases).

## OI-57 — Paddle Node SDK import blocks server boot path

**Status**: resolved (2026-07-18)
**Area**: `connect-four/server/index.js` (Paddle wiring block, ~line 2833)

`await import('@paddle/paddle-node-sdk')` runs as a dynamic import mid-module in `index.js`, serializing every top-level statement after it (including the final `app.listen(...)`) behind the import's resolution — unlike a static top-level `import`, which Node's module loader would resolve concurrently with the file's other imports.

**Why deferred**: adds avoidable but small startup latency on every boot/restart when `PADDLE_API_KEY` is set (dev restarts, CI, prod deploys); no correctness impact.
**If picked up**: convert to a static `import { Paddle, Environment } from '@paddle/paddle-node-sdk'` at the top of `server/index.js`, then only construct the client conditionally inside the existing `if (process.env.PADDLE_API_KEY)` block (the SDK's presence in `node_modules` is guaranteed since it's now a hard dependency).

## OI-58 — `main`/production `server/index.js` CSP is missing 5 fixes shipped to `stagging`

**Status**: deferred / open (created 2026-07-18)
**Area**: `connect-four/server/index.js`'s `helmet({ contentSecurityPolicy: { directives: {...} } })` block

This session fixed five separate CSP gaps on the `stagging` branch (commits `2794793`, `811be2c`, `fb0ecc1`, `ae3c006`, plus the `frameSrc`/`connectSrc` additions in the earlier Paddle-checkout commit): `script-src`/`connect-src`/`frame-src` for Paddle.js + Google Pay, `style-src` for Paddle's inline styles + external stylesheet + Google Fonts' stylesheet, and a new `font-src` directive for Google Fonts' `.woff2` files. All five block real functionality (Paddle checkout, Google Pay, the app's own webfonts) when the CSP header is actually enforced (i.e., any deployed build, not `npm run dev`).

**Why deferred**: `main` (production, `decodec4.xyz`) is ~496 commits behind/diverged from `stagging` (per memory `project_paddle_integration` §4/§9) and this project's convention is to ship small prod-facing fixes via a fresh worktree off `origin/main`, not by merging the divergent branch. The user was offered this (a worktree-based PR carrying just the CSP diff) and explicitly declined, choosing to port the fix to `main` themselves.
**If picked up**: diff `server/index.js`'s `helmet(...)` block between `stagging`'s current HEAD and `main`'s current HEAD; the `stagging`-side version (with `PADDLE_CDN`/`PADDLE_ORIGINS`/`GOOGLE_PAY_ORIGINS`/`GOOGLE_FONTS_STYLESHEET`/`GOOGLE_FONTS_FILES` constants and their per-directive rationale comments) is the target state — see `docs/architecture/server-conventions.md`'s "CSP Directive Rationale" section for the current, authoritative description of every directive and why.

**Resolved (2026-07-18)**: `server/index.js` now has a static top-level `import { Paddle, Environment } from '@paddle/paddle-node-sdk'`; the `if (process.env.PADDLE_API_KEY)` block only constructs `new Paddle(...)` conditionally, same as before. Boot-tested both ways: (1) with `PADDLE_API_KEY` set (`server/.env`) — server starts, `GET /api/paddle/config` returns real prices (200). (2) without it — verified by temporarily forcing the guard false in a throwaway local edit (reverted before committing) since this sandbox's environment injects a real `PADDLE_API_KEY` into every child process regardless of the `.env` file or shell overrides used, making a true "unset" boot untestable here; with the guard forced false the server still starts cleanly and `/api/paddle/config` correctly 503s ("Payments not configured"). No behavior change versus the dynamic-import version — only the import timing moved earlier.

## OI-59 — UpgradeModal didn't auto-dismiss after a real (non-simulated) staging payment

**Status**: resolved (2026-07-18)
**Area**: `connect-four/src/lib/checkoutReturnFlow.js`, all 5 `UpgradeModal` call sites

After a real sandbox test purchase completed on staging (the same purchase that finally turned Paddle's "Handle fulfillment and provisioning" onboarding step green — see memory `project_paddle_integration` §11), the upgrade modal did **not** slide away as the earlier fix in this session was built to do. The client's `POST /api/paddle/verify-transaction` call did fire and returned `{"activated":true}` — meaning `checkoutReturnFlow`'s shared store should have been set to `'activated'`, which should have flipped the subscribed screen's `uiState` prop to `'success'` and triggered `UpgradeModal`'s internal auto-dismiss effect. It did not (or if it showed "success" briefly, it never actually dismissed — this distinction was never confirmed).

**Why deferred**: the immediate follow-up investigation got derailed by an unrelated one-off "upstream error" on a reproduction attempt (traced to a transient Railway-edge issue, not this bug — see memory `project_paddle_integration` §12), and root cause was never established. Two clarifying questions were asked but never answered: (1) did the modal show the green "success" message at all before getting stuck, or did it stay on the loading/spinner state the whole time — this distinguishes "checkoutReturnFlow subscription never fired" from "auto-dismiss timer/effect itself failed"; (2) which of the 5 `UpgradeModal` call sites was in use (Settings, Set Picker, Post-Set Summary, Saga, or Deep Reveal) — Deep Reveal's `onDismiss` has an extra `onClose?.()` call the other four don't, so it's the most likely to behave differently if there's a site-specific bug.

**Root cause found (2026-07-18)**: confirmed via a screenshot of the actual stuck modal — it was frozen at its pristine pre-payment `'idle'` state (plan picker, active button), not the loading spinner or a success message. `subscribeCheckoutReturn` never replayed the *current* state to a new subscriber — it only notified listeners of *future* transitions. `useUpgradeCheckout.js`'s `checkout.completed` handler is a module-level singleton independent of which screen is mounted; if a screen's subscription effect wasn't active at the exact instant `setCheckoutReturnState('activated')` broadcast, that one-shot notification was lost forever, even though `checkoutReturnFlow`'s internal `state` variable correctly held `'activated'`. This explained the reported symptom exactly: the account correctly became Pro (the server-side tier flip via the webhook/`verifyTransaction` call is entirely independent of any UI listener), but the modal never learned about it and stayed on `'idle'` until manually dismissed.

**Fix**: `subscribeCheckoutReturn` now immediately invokes the new listener with the current state at subscribe time (closing the race), and each of the 5 call sites now calls the (renamed-to-production-use) `resetCheckoutReturnState()` after consuming a terminal `'activated'`/`'failed'` state, so the replay-on-subscribe fix doesn't leak a stale outcome into some later, unrelated modal open. Covered by 2 new regression tests in `tests/unit/checkoutReturnFlow.test.js`.

## OI-60 — `detectOvercut` taxonomy mismatch: taught gravity-top-adjacent overcut is never tagged; `active_forcing` label actually means T5

**Status**: deferred / open — needs a classifier-owner decision (surfaced by the lesson-content final whole-branch review, 2026-07-24)
**Area**: `connect-four/server/classifier.js` (`detectOvercut`, ~lines 959–985), lesson 07 (overcut) copy, deep-reveal shape naming
**Discovered**: lesson-content remediation final review (2026-07-24)

The overcut lesson teaches the gravity-top-adjacent shape (opponent threat directly under yours, immediately playable), but `detectOvercut` never tags that case: its match requires one of `isT4SameParity`/`isT5Exception`/`isT2Blocking`, and the `reason` it labels `'active_forcing'` is in fact the T5 rows-3/6 helper (`isT5Exception` branch). So deep reveals may name shapes the lesson only covers as "family", and the label text misdescribes what matched.

**Why deferred**: fixing it means either extending the detector's case set or renaming/re-scoping the reason labels — a taxonomy decision for the classifier owner, not a copy fix.
**If picked up**: decide whether the taught adjacent case should be a first-class overcut match (new T-rule branch) or whether the lesson should be re-scoped to the detector's actual cases; rename `active_forcing` to say T5 either way. Validate per reason-INVARIANTS I12 (full case-space + counterexample per case, through the production detector).

## OI-61 — Challenge grader semantics: `evalUndercut` accepts losing non-killing columns; single-answer categories mark solver-tied/positive alternatives wrong

**Status**: deferred / open (family of grader-semantics gaps; surfaced 2026-07-24, sibling of OI-1)
**Area**: `connect-four/server/predicates.js` (`evalUndercut`), single-answer challenge grading (`ChallengeScreen.jsx` / `scoreMove` path), lessons 04/06/08 challenge boards
**Discovered**: lesson-content remediation final review (2026-07-24)

Two related acceptance-semantics gaps:
1. `evalUndercut` accepts columns that lose outright as long as they are non-killing — the predicate checks the pattern condition but not the solver verdict.
2. Single-answer categories mark solver-tied or even solver-positive alternative columns wrong when they don't match the stored answer. Concrete examples from the remediation pass: L06 ch2, L08 ch1, L04 ch2 each have a defensible alternative column that grades as incorrect.

**Why deferred**: the fix is a correctness-model choice (tie-aware acceptance vs per-board vetting of alternatives), overlapping OI-1's pattern-vs-score question; not a one-line patch.
**If picked up**: either make acceptance tie-aware (accept any column whose solver score ties the stored answer, optionally gated on pattern membership) or vet each shipped challenge board so the stored answer is the unique max; and add a solver-verdict floor to `evalUndercut`.

**UPDATE 2026-07-28 — item 2 RESOLVED, item 1 still open.**

Item 2 was fixed by the "vet each board" route, made systematic rather than per-board:
`server/answerSetInvariant.js` now defines `optimalCols ⊆ acceptedCols ∧ acceptedCols ∩ optimalCols ≠ ∅`,
enforced at three points — `candidate-generator.js#checkPredicate` (generation), the new
`tests/lessons/lessonAnswerSets.test.js` (blocking, in `test` and `test:fast`), and
`server/scripts/audit_answer_ambiguity.mjs` (on-demand, incl. DB rows). Eight ambiguous lesson
boards were replaced; lessons now audit 39/39 and the local DB 295/295. The concrete examples cited
above no longer exist in the shipped content.

Item 1 (`evalUndercut` has no solver-verdict floor) **remains**: the invariant deliberately exempts
**lost positions**, and `detectUndercut` only fires when `scores[C] < 0`, so undercut boards are
routinely losing — exactly where the exemption applies. A losing non-killing column can therefore
still grade "correct" in an undercut drill. Cross-ref OI-74, which shows the undercut lesson and the
undercut puzzle category model opposite sides of the pattern; item 1 is probably not fixable in
isolation from that decision.

## OI-62 — KB touch-ups from the lesson remediation: `3334434` now solver-verified; figure-7 `gravity_top>=2` filter note

**Status**: ✅ RESOLVED 2026-07-30 (spec `052` / Epic 6, US5 T053–T055) — both edits made and synced.
1. `allen-j-configuration.md`'s `3334434` worked example: `solver_verified: PENDING` → `true`, but
   **re-verified from scratch first** rather than stamped on the 2026-07-24 claim. `./visualize_board.sh
   3334434` shows Gray (Black/P2) to move with column scores `[-5, -3, -4, -5, -4, -5, -5]` — every
   column negative, so Black loses whatever he plays, which is exactly what the example asserts. The
   canonical J cells ({D1, D3, E2, E3} for Green) and the claimed triple threat (F3, G3, G4, all
   Green minor threats, no major threat on the board) were confirmed on the same render. The
   verification evidence is written into the example's `notes` block, not just the boolean.
2. `community-figure-7.md`: the `gravity_top_count >= 2` branch (and the redundant `== 2` follow-up)
   is now annotated as dead code with the reason — both threat cells are in the same column `x+3` at
   adjacent rows `y+2`/`y+3`, and only one row per column can be the gravity top, so
   `gravity_top_count ∈ {0, 1}` structurally. The live check is `above_gravity == 0`.
3. `npm run sync-kb` re-run; `git diff --stat connect-four/server/kb/` shows both files updated
   (`allen-j-configuration.md` +15/-1, `community-figure-7.md` +9); `tests/unit/kbSync.test.js` green.
**Area**: `docs/knowledge-base/allen-j-configuration.md`, `docs/knowledge-base/community-figure-7.md`
**Discovered**: lesson-content remediation (2026-07-24)

1. `allen-j-configuration.md`'s worked example `3334434` was solver-verified during the 2026-07-24 remediation (used as the J-shape lesson's canonical board); the entry should record that verification.
2. `community-figure-7.md` should note that the `gravity_top>=2` filter is dead code for same-column adjacent-row threats — the case it ostensibly guards can't occur there.

**Why deferred**: pure documentation polish; no behavior at stake.
**If picked up**: make both edits in the KB entries (and re-run `npm run sync-kb` so the app copy matches).

## OI-63 — Lesson verifier/finder robustness gaps (solver crash on bad movestring, coarse `_overlayIntent`, unscanned i18n titles, vestigial REMEDIATED gate)

**Status**: ✅ RESOLVED 2026-07-30 (spec 052 / Epic 6, US3). All six items closed:
1. **Solver crash on bad input** → `verify_lesson_content.mjs` now routes every `solver.query` and
   every `new Board(...)` through `safeQuery`/`safeBoard`, and wraps per-lesson `JSON.parse` +
   `checkLesson`; a malformed movestring produces one FAIL row and the run continues (T027).
   Demonstrated by temporarily injecting `"999999999"` as a socratic movestring plus an illegal
   over-long challenge movestring: both printed FAIL rows, all 15 lessons were still reported. The
   injected fixture was reverted, not committed.
2. **Per-overlay `_overlayIntent`** → `overlayIntent(node, overlay)` resolves
   `overlay._overlayIntent ?? node._overlayIntent`, so an individual overlay overrides the
   node-level default in either direction; all 8 shipped node-level usages are untouched (T036).
   Documented in `docs/architecture/lesson-editor.md` §"Overlay intent (`_overlayIntent`)" (T037).
3. **Unscanned i18n titles** → `lessonContent.test.js` now asserts no `lesson.<id>.title` survives in
   `en.json`/`es.json` for any current lesson id, complementing `i18nKeyParity.test.js`'s symmetry
   check (which a title re-added to *both* files would pass). Confirmed RED by re-adding one (T038).
4. **Vestigial REMEDIATED gate** → the set and all three `if (!REMEDIATED.has(...)) continue;` guards
   are **deleted**, not emptied — there is no longer a place to add an exemption. It listed all 15
   lesson ids, so the deletion was behaviour-neutral (T035, FR-018).
5. **No `--help`** → `find_lesson_boards.mjs --help` / `-h` (and a bare invocation) prints purpose,
   spec list, `tag:` form, option defaults and exit codes, then exits 0 as the **first** statement in
   `main()` — before `createSolverProcess()`, verified by solver process count (T028).
6. **Matcher/detector divergence** → every matcher now carries a "Production detector / side" doc
   comment (T029), the overcut pair carries an explicit "deferred pending OI-76" decision (T030), and
   the solver-optimal gate was widened to every matcher except that pair (T031). The remaining
   duplication is NOT resolved here — it is tracked as **OI-85**, and the shipped boards the widened
   gate flags are tracked as **OI-84**; both were filed by this same story as new backlog rather than
   fixed inside it.

Was: deferred / open (tooling hardening backlog, 2026-07-24)
**Area**: `connect-four/server/scripts/verify_lesson_content.mjs`, `server/scripts/find_lesson_boards.mjs`, `connect-four/tests/unit/lessonContent.test.js`
**Discovered**: lesson-content remediation final review (2026-07-24)

Four residues in the remediation tooling:
1. Neither verifier nor finder wraps `solver.query` in try/catch — an invalid movestring crashes the whole run instead of producing a FAIL row for that item.
2. `_overlayIntent` is per-slide; a slide mixing annotation and threat overlays can't declare intent per overlay.
3. `lessonContent.test.js` scans lesson JSON copy but not i18n lesson titles (`lesson.<id>.title`), so a 0-indexed or off-voice title would pass.
4. The strict tests' REMEDIATED gate is now vestigial and inverted-risk: every lesson is remediated, so the gate exempts nothing today but would silently exempt any *future* lesson added to the list.
5. (added 2026-07-28) `find_lesson_boards.mjs` has **no `--help`**, violating the house convention that every script prints purpose + options + defaults and exits 0 *before* required-arg validation. `node server/scripts/find_lesson_boards.mjs --help` currently errors with `Unknown spec "--help"`, so the only way to learn the spec names is to trigger that error or read the source.
6. (added 2026-07-28) The spec matchers in `find_lesson_boards.mjs` are **independent re-implementations** of the concepts in `classifier.js`, and they diverge: of 50 `undercut_t2_adjacent` candidates only 13 are recognised by `detectUndercut`. Partly legitimate (they model opposite sides — see OI-74), but nothing in either file says so, and the finder never checks that the pattern column is a *good* move, **[undercut resolved 2026-07-28 — `undercut_t2_adjacent` now validates against the production `detectUndercutBeneficiary` and requires the column to be the solver max; the other specs are unchanged and this item still stands for them]** so it happily returns boards where the detected pattern isn't even solver-optimal (measured: the z-threat column was among the optimal set in only 25 of 50 `z_threat_socratic` candidates).

**Why deferred**: none blocks the shipped content; all are robustness/regression-surface improvements.
**If picked up**: wrap solver calls per-check and emit FAIL rows; support per-overlay intent; extend the static scan to i18n titles; flip the REMEDIATED mechanism to an empty exemption set (strict by default, exemptions opt-in).

## OI-64 — Owner decisions pending from the lesson remediation (paywall split, Spanish pass, two recommended new lessons)

**Status**: ✅ RESOLVED 2026-07-29 (spec 051 / Epic 5, US1) — the last remaining item (Spanish audio) is
now closed; see OI-65's closeout for the evidence. All three items are done.
**Area**: `connect-four/lessons/*.json` (`free` flags), Task 14 of the remediation plan, lesson curriculum
**Discovered**: lesson-content remediation final review (2026-07-24)

1. ~~**Non-contiguous paywall after renumbering**: free 1–6 + 11–12, paid 7–10 + 13.~~ **RESOLVED 2026-07-25.** Re-tiered to **15 lessons, free 1–10 / paid 11–15 — exactly one free→paid transition**, openings early at 4–5. Enforced by a loader check; the contiguity rule is now documented in `docs/architecture/lesson-editor.md` §"Curriculum ordering and the free/paid boundary".
2. ~~**Spanish TEXT done, AUDIO still open.**~~ **RESOLVED 2026-07-29.** All 15 lessons' `_es` audio fields
   are populated and on-disk — see OI-65.
3. ~~**Two recommended new lessons.**~~ **RESOLVED 2026-07-25.** Both written on solver-verified boards and shipped free: `threat-vocabulary` (#3, defines major/minor/immediate/gravity-top before L06/L07/L10 use the terms) and `zugzwang-tempo` (#10).

Cross-ref: OI-18, OI-43, OI-63, OI-65.

## OI-65 — All 15 lessons are translated to Spanish but have NO Spanish audio; `es` learners get English clips

**Status**: ✅ RESOLVED 2026-07-29 (spec 051 / Epic 5, US1) — every lesson's `audio_es` field (concept-slide
coach messages, slide `infoProseAudio_es`, and `socratic.messages[phase][].audio_es`) is now populated
and the referenced file exists on disk. `connect-four/tests/lessons/lessonAudioCoverage.test.js` (new,
registered in `test`/`test:fast`) walks every lesson via the production `collectMessages()` walker and
asserts, for every entry with non-empty `_es` text, a populated + on-disk `audio_es` path — **0
failures** across all 15 lessons. The companion prune-parity assertion in the same file confirms the
referenced-audio set and the on-disk `public/audio/lessons/` set agree exactly (348 referenced = 348 on
disk, 0 orphans), so no clip is missing and none is a leftover. The ad hoc `quickstart.md` step-2
snippet independently reproduces the same counts: `{ missing: 0, referencedCount: 348, diskCount: 348,
orphanCount: 0 }`. **What this does NOT cover** (by design, non-blocking per FR-003): whether each
`audio_es` clip is genuinely Spanish-sounding by ear, vs. the failure mode this entry called out
(`pickLocalized` silently falling back to the English clip) — that by-ear check is recorded as a
`staging_checks.md` sign-off item under "Epic 5 — Audio Verification & TTS Management", not gated on
this closeout. Coach-fleet Spanish audio (a related but separate surface) is OI-27, also resolved.
**Area**: `connect-four/lessons/*.json` (`coachMessages[].audio_es`, `socratic.messages[phase][].audio_es`), `POST /api/admin/lessons/:id/generate-audio`
**Discovered**: lesson localization + new-lesson fan-out (2026-07-25), merged in PR #19

All 15 lessons now carry complete Spanish text (~280 `_es` fields), but **not one Spanish audio clip was
generated** — including for the two new lessons (`threat-vocabulary`, `zugzwang-tempo`), whose English
audio is also missing.

The failure mode is worse than silence: `pickLocalized` backfills `audio` from English per field, so an
`es` learner hears the **English clip** under the Spanish text. `lesson-editor.md` already flags this
("translated but not yet voiced… arguably worse than silence — translate and run generate-audio
`{lang:'es'}` together"); this session did the first half only.

**Why deferred**: the work ran in a remote Claude-Code-on-the-web container, which has **no
`connect-four/server/.env`** (verified — the file simply doesn't exist there), so `OPENAI_API_KEY` was
unavailable. On a local checkout the key is present and this is fully runnable; it is not blocked on
provisioning anything.

**If picked up**: from a local session, run `generate-audio` for each of the 15 lessons in both `en` and
`es`, confirm `audio_es` is populated everywhere (and that `prune-audio`'s `audio_es` invariant still
holds), then spot-check playback on `:5173` — **not** `:3001`, which does not serve `public/`. Cross-ref:
OI-18, OI-64.

## OI-66 — `GET /api/lessons/:id` serves paid lesson content to unauthenticated callers

**Status**: open — architectural decision, deliberately out of scope for the content/QA work (2026-07-25)
**Area**: `connect-four/server` lesson routes, `src/lib/useLessonLockGuard.js`, `src/screens/sagaLock.js`
**Discovered**: browser QA of the remediated lessons (2026-07-25), documented in PR #19

A free or anonymous caller can fetch a **paid** lesson's full JSON — slides, prose, socratic answer —
directly from `GET /api/lessons/:id`. The paywall is enforced in the client only.

PR #19 added `useLessonLockGuard` so a paid lesson can no longer be opened *or completed* through a
direct URL like `/clchallenge/undercut` (previously it could, leaving "✓ Completed" beside still-locked
free lessons). That closes the **UI** hole; the endpoint is untouched, so `curl` still returns paid
content. With the tier split now at free 1–10 / paid 11–15, five lessons are exposed this way.

**Why deferred**: adding server-side entitlement means deciding how the endpoint authenticates and what
it returns to an unentitled caller (404 vs 402 vs a redacted stub) — an architecture call, not a QA fix.
**If picked up**: gate the handler on the caller's tier, reusing the same `free`-flag/tier source
`deriveLockReason` uses so client and server cannot drift; decide the unentitled response shape; keep
metadata (title, `free`, `order`) public so the saga list still renders. Add an integration test that a
signed-out fetch of a paid id does not return `slides`.

## OI-67 — Admin lesson editor has no UI control for `slides[].windowHighlights`

**Status**: RESOLVED 2026-07-28 — control shipped; see `docs/architecture/lesson-editor.md`
§"Window highlights" → "Authoring one in the editor". Decisions taken: control lives in
`SlideEditor` (BoardEditor gained only optional, inert-by-default cell-picking props, so
`SocraticEditor` surfaces nothing); click-in-sequence order capture with per-cell toggle, "Undo
last" and a "Fix order" affordance for the collinear-but-unordered case; commit gated on
`isStraightLineWindow`; `emptySlide()` left unchanged (absent, not `[]`).
**Area**: `connect-four/src/components/admin/SlideEditor.jsx`, `src/components/admin/BoardEditor.jsx`,
`src/lib/windowDraft.js`
**Discovered**: while wiring `windowHighlights` end to end

Concept slides can carry `windowHighlights` (translucent capsules over a line of cells — contract in
`docs/architecture/lesson-editor.md` §"Window highlights"). The field renders in the app, validates,
and survives save/load via the object spreads in `lessonToJsonPayload` / `hydrateLesson` — but the
**admin editor has no control for it**. An admin can neither author one nor see that a slide already
has one; today the only way to add a capsule is hand-editing the lesson JSON. All 48 windows across
13 lessons were authored that way.

**Why deferred**: it is a genuine interaction-design task, not a wiring gap — how cell *order* gets
captured is the crux (click-in-sequence, where click order **is** array order and you need a visible
in-progress state plus undo; versus pick-two-endpoints-and-interpolate). Worth a decision with the
owner rather than an agent's default.

**If picked up**:
- Gate on `isStraightLineWindow()` from `src/lib/lessonWindows.js` — never write a window that fails
  it; show the admin why instead. Bent/gapped selections are the likely authoring mistake.
- Respect the editor's `lang` toggle: `fk('label')` yields `label` / `label_es` (`label_es` is
  required whenever `label` is present, per the content gate).
- Do **not** feed windows into `syncLegend`/`legendItems` — the content test requires every
  `legendItems[].type` to have a matching per-cell overlay, which a window has none of.
- **`BoardEditor` is shared with `SocraticEditor`**, and the socratic node does not support the
  field. Any new prop must be optional and the window mode must not appear when it is absent — or
  keep the control in `SlideEditor` and pass `zhCells` down for a read-only preview.
- Type-picker swatches should use `WINDOW_HIGHLIGHT_COLOR` (opaque), not `BoardEditor`'s
  `OVERLAY_COLORS`; the values differ deliberately because Board composites capsules at 0.4 opacity.
- Verify by save → reload editor → open the lesson in the app. React state alone proves nothing:
  the server caches lessons at startup, so restart `$API_PORT` before trusting a re-test.

## OI-68 — `windowHighlights` visual + content review items

**Status**: ✅ RESOLVED 2026-07-30 (spec `052` / Epic 6, US4 T045) — **closed as a recorded product
decision, not as a code fix. No rendering code changed.** The owner ruled capsule/disc tinting out
of spec 052's scope entirely: `windowHighlights` capsules are kept exactly as they render today
(SVG at `zIndex: 2` above the discs, opacity as shipped), on the explicit stated assumption that
authored slides do not have overlapping overlays. `Board.jsx`'s `zhSvg` and every authored
`windowHighlights` payload are untouched by spec 052; the two options sketched below (dropping the
capsule below the discs, or an outline-only variant) were considered and deliberately not taken.
Item 2 (the sparse `opening-centre` slide-1 window) is likewise left as authored — it matches its
prose and is not wrong. If disc colour ever becomes the teaching point of a slide *and* reads
wrong in a real browser, reopen with that slide as the motivating example.
**Area**: `connect-four/src/components/Board.jsx` (`zhSvg`), `connect-four/lessons/lesson-04-opening-centre.json`
**Discovered**: browser spot-checks of the 48 authored windows

Two things noticed while reviewing the rendered capsules, neither worth blocking on:

1. **Capsules tint the discs they cover.** The SVG sits at `zIndex: 2` above the board, so an amber
   (`claim`) capsule over a gray disc reads brown and over green reads olive. Legible everywhere it
   currently ships, and the labels disambiguate — but it is a real cost on any slide whose teaching
   point *is* disc colour (e.g. lesson-03 slide 1, "one gray disc and two green"). Fixing it means
   either dropping the capsule below the discs (loses the highlighter feel) or an outline-only
   variant like the settled z-threat badge spec in `frontend-conventions.md`. Do not simply lower
   the opacity — at 0.4 it is already near the floor of visibility.
2. **`opening-centre` slide index 1 draws a window over one disc and three empty cells.** It is
   exactly what the prose asserts ("Green is the only one who can threaten a horizontal connection
   on the third row nearby") and it is the only Gray-free four-window on that row, so it is not
   wrong — but it is the sparsest of the 48 and reads as a window that barely exists yet. Worth an
   editorial second opinion on whether the prose or the capsule should go.

## OI-69 — Admin lesson-editor cosmetic + a11y nits left after the `windowHighlights` control

**Status**: ✅ RESOLVED 2026-07-30 (spec `052` / Epic 6, US4 T043/T044/T046)
- Item 1 **fixed**: the `infoProse` `<textarea>` in `SlideEditor.jsx` now sets
  `fontFamily: 'inherit', lineHeight: 1.4`, matching the adjacent coach-message textarea. Confirmed
  by source inspection that the shared `input` style object (`SlideEditor.jsx`, `const input = …`)
  sets no `font-family`, so the bare textarea really was falling back to the UA monospace default
  while its neighbour already set `fontFamily: 'inherit'`.
- Item 2 **left unaddressed by decision, and the reason is now recorded in-repo** (spec 052 FR-022):
  see the comment above `getColumnA11yProps` in `connect-four/src/components/boardA11y.js`. Board
  `aria-label`s stay board-local; fixing the multi-board ambiguity would change the locked spec-043
  a11y contract used by every game screen, spec 052 commissioned no broader accessibility pass, and
  the ambiguity is confined to the admin-only lesson editor. Revisit during a real a11y pass.
**Area**: `connect-four/src/components/admin/SlideEditor.jsx`, `connect-four/src/components/Board.jsx`
**Discovered**: shipping the `windowHighlights` control and the coach-message textarea change

1. **`infoProse` renders in the browser-default monospace.** The coach-message field was converted
   from `<input>` to `<textarea>` and given `fontFamily: 'inherit'`; `infoProse` is an older
   `<textarea>` that never set one, so browsers apply their monospace default. The two now sit
   adjacent in the same card in different typefaces, which reads as a bug rather than a choice. Fix
   is one line (`fontFamily: 'inherit'` on the `infoProse` textarea) — deliberately not taken,
   because it is a visual change to a field outside the requested scope and the owner has not
   weighed in. Decide, then either apply it or record that monospace is intentional there.
2. **`Board`'s per-column `aria-label`s ("column 1".."column 7") repeat once per board on the same
   page.** The admin lesson editor renders four boards (three slides + socratic), so a screen reader
   hears seven ambiguous "column N" targets four times over. Pre-existing, from
   `getColumnA11yProps` (spec 043) — it is correct for a single-board game screen and only becomes
   ambiguous on multi-board admin pages. Fixing it means threading a board-scope label into
   `getColumnA11yProps`, which touches the locked a11y contract; not worth it for an admin-only
   surface unless someone is doing an a11y pass anyway. Every `aria-label` `SlideEditor` itself
   emits is already index-scoped (`Slide N …`) and unique.

## OI-70 — `npm run lint` is red repo-wide (254 errors), so lint gates nothing

**Status**: open — pre-existing, long-standing (observed 2026-07-28)
**Area**: `connect-four/eslint.config.js` and the whole tree
**Discovered**: running `npx eslint` on touched files during the `windowHighlights` work

`npx eslint .` reports **268 problems (254 errors, 14 warnings)**. A large share are environment
rules misfiring rather than real defects — e.g. `'process' is not defined` (`no-undef`) in Node-side
scripts that the config lints with browser globals only. Because the baseline is red, `npm run lint`
cannot be used as a gate, is not in CI, and a genuinely new lint error is invisible in the noise.

Concretely observed: `src/components/admin/BoardEditor.jsx` imports `boardToSpec` and never uses it
(`no-unused-vars`) — harmless, pre-existing, and exactly the kind of thing a working lint would have
caught at authoring time.

**If picked up**: split the eslint config by environment (browser for `src/`, node for `server/`,
`scripts/`, `tests/`) before touching any individual rule — that alone should clear most of the 254.
Then run `--fix`, triage the remainder, and only then consider adding `lint` to the test scripts.
Until that happens, run `npx eslint <files-you-touched>` and compare against the same files on
`main` rather than trusting a clean/dirty verdict.

## OI-71 — Removing the `windowCounts` empty-cell guard hangs `test:dom` instead of failing it

**Status**: open — low priority, cosmetic to the test experience (observed 2026-07-28)
**Area**: `connect-four/src/components/Board.jsx` (windowCounts render block), `connect-four/tests/dom/BoardWindowCounts.dom.test.jsx`

While mutation-proving the fix for the untested `value === 'empty'` guard, deleting that half of the
condition did **not** produce a clean assertion failure. `npm run test:dom` instead hung and was
killed after ~32s (0% CPU, stable low RSS across three separate runs — a genuine block, not a busy
loop). The unmutated suite passes in under a second.

This does not weaken the test — the mutant never goes green, which is what the guard needs — but a
hang is a poor failure mode: a future regression here will read as flaky infrastructure rather than
as a broken guard. Root cause was not investigated. Suspicion (unverified) is that rendering a digit
into every occupied cell interacts badly with jsdom or the testing-library query used, rather than
anything in `Board` itself.

**If picked up**: reproduce by deleting `&& value === 'empty'` from the windowCounts block in
`Board.jsx`, then bisect the assertion in `BoardWindowCounts.dom.test.jsx` that stops returning.

## OI-72 — Lesson editor re-submits a stale `windowCounts` array on every save

**Status**: open — harmless, noise only (observed 2026-07-28)
**Area**: `connect-four/src/lib/lessonPayload.js`, `connect-four/src/components/admin/SlideEditor.jsx`

`lessonToJsonPayload` spreads `...slide`, so the 42-number `windowCounts` array the editor loaded is
PUT back to the server on every save. `saveLessonFile` immediately recomputes and overwrites it, so
the stored value is always correct — this costs only payload size and a moment's confusion for anyone
reading the request body and assuming the client authored those numbers.

Deliberately not "fixed" by stripping the field client-side: the spread is what makes every unknown
authored field (including `_es` siblings the editor does not surface) survive a round trip, and
special-casing one field there is a worse trade than the noise. If it is ever addressed, do it by
having the editor drop *all* server-derived fields via a single declared list, not an ad-hoc delete.

Related: the editor's board preview does not render the counts until after a save, for the same
reason `boardSpec` is re-derived server-side. Documented as intended behaviour in
`docs/architecture/lesson-editor.md` §"Window counts" → "Authoring one in the editor"; listed here
only so a future reader knows it was a decision, not an oversight.

## OI-73 — `lesson.windowCounts` shares the i18n namespace with per-lesson-id keys

**Status**: ✅ RESOLVED 2026-07-30 (spec `052` / Epic 6, US5 T051–T052) — the guard option was taken.
`tests/unit/i18nKeyParity.test.js` now carries "no lesson id collides with a reserved `lesson.*` i18n
sub-key", which reads every `lessons/lesson-*.json`'s `id` and fails if any equals a child of
`en.json`'s `lesson` object. The reserved set is **derived at run time**, not hardcoded, so new
chrome keys are covered automatically; it also asserts `en.json`/`es.json` agree on that set. As of
this closeout the derived set is `["confirmation", "node", "notFound", "windowCounts"]` — spec 052's
FR-011 had already removed every per-lesson `lesson.<id>` object, so every remaining child really is
shared chrome. Demonstrated RED before shipping: a temporary `lessons/lesson-16-node.json` with
`"id": "node"` made the test fail with `Colliding: [{"file":"lesson-16-node.json","id":"node"}]`
(temp file deleted, never committed). The heavier `lessonUi.*` re-namespacing was considered and not
taken — the guard is the two-line-sized fix this entry itself recommended. Already registered in
`test:fast`, so no `package.json` change was needed.
**Area**: `connect-four/src/i18n/en.json`, `es.json`

Lesson-scoped UI copy lives under `lesson.<something>`, where `<something>` is normally a **lesson
id** (`lesson.opening-centre.title`, `lesson.j-shape.title`, …). Two shared sub-trees already break
that pattern — `lesson.node.*` and `lesson.confirmation.*` — and this session added a third,
`lesson.windowCounts.legend`.

The collision only becomes real if a lesson is ever given the id `windowCounts` (or `node`, or
`confirmation`), which would silently shadow the shared key. Nothing enforces the separation.

**If picked up**: move the shared sub-trees under an explicit namespace (`lessonUi.*`) so lesson ids
own `lesson.*` outright, or add an assertion to `tests/unit/i18nKeyParity.test.js` that no lesson id
collides with a reserved sub-key. The latter is a two-line guard and probably the right size.

---

## OI-74 — `detectUndercut`'s `perspective` parameter is unsound; the undercut lesson and the undercut puzzle category teach opposite sides

**Status**: ✅ RESOLVED 2026-07-28
**Area**: `connect-four/server/classifier.js`, `server/scripts/find_lesson_boards.mjs`,
`docs/architecture/server-conventions.md` § "Undercut has two sides"

**Was**: `detectUndercut(board, scores, perspective)` read `perspective`'s threats while the
`scores[col] < 0` gate kept reading the **mover's** score, so the same column matched twice with
opposite owners. Repro `33211553350634544` (Gray to move, `scores[2] = -12`) returned
killing/dead at rows (2,3) for `perspective=2` and at (3,4) for `perspective=1`; the second is
incoherent. Separately, `lesson-11-undercut` teaches the *beneficiary* side while the detector and
the `undercut` puzzle category model the *victim*, so a correct lesson board could not be validated
against anything.

**Resolution** — all three sub-decisions taken:

- **(a)** The `perspective` parameter is **gone**. It was not merely unused (`classifyPattern`
  *did* pass it, and `classifyAiMove` / `explainContext` reach it with `perspective !==
  board.currentPlayer` in production) — it was meaningless: which player is victim and which is
  beneficiary is fixed by who is to move, because c4solver scores are always the mover's.
  `classifyPattern`'s `undercut` tag is now perspective-independent and both perspectives agree.
- **(b)** The two sides are named: `detectUndercutVictim` (mover is the victim, `scores[C] < 0`)
  and `detectUndercutBeneficiary` (mover owns the killer, `scores[C] > 0`), over a shared core.
  `find_lesson_boards.mjs`'s `undercut_t2_adjacent` now validates against the beneficiary detector
  (plus adjacency, latency, and a solver-max gate), so lesson-11 boards are machine-checkable.
- **(c)** Product call (owner, 2026-07-28): **keep both sides.** The `undercut` puzzle category
  stays the victim-side defensive drill; lesson 11 stays the beneficiary-side offensive lesson.
  The split is documented in `server-conventions.md` so it stops reading as a defect.

Found and fixed along the way: the killer search used `find(rp => rp < R)`, inspecting only the
**lowest** lower threat. An adjacent T2 killer sitting above a same-parity T4 pair was therefore
missed — which is exactly lesson 11's shape. It now scans every lower threat.

**Verified**: `test:fast` 1483/1483; `verify_lesson_content.mjs` all PASS; lesson audit 39/39 OK;
`--puzzles undercut --env local` 28 rows, 0 failures. All 28 active `undercut` rows re-derive
byte-identical `highlight_metadata` under the new detector, so **the pool needed no repair**.

## OI-76 — `detectOvercut` has the same unsound `perspective` that OI-74 removed from undercut

**Status**: open — latent (observed 2026-07-28)
**Area**: `connect-four/server/classifier.js#detectOvercut`

```js
export function detectOvercut(board, scores, perspective = board.currentPlayer) {
  const threats = board.reachableThreats(perspective);
  ...
  if (!scores || scores[col] <= 0) continue; // overcut requires playing C to be winning
```

`threats` follow `perspective`; `scores` are **always** the side to move's. Passing the opponent
mixes one player's threats with the other player's score sign. This is literally the OI-74 defect;
only undercut was in scope for that fix.

Blast radius is larger than undercut's was, which is why it was not swept in: `overcut` is in
`MISSED_OWN_PRIORITY` (`tagBlunder` Phase C), which evaluates it on `moves + correctCol` where the
blunderer is **not** the mover — i.e. always the unsound branch. Fixing it changes blunder tags,
which are stored and user-visible.

**Not affected — do not "fix" these**: `detectFigure7` and `detectJShape` also take three arguments,
but their second parameter is `_scores` and is genuinely unused ("kept for caller signature
compatibility"). They are pure kernel convolutions over `perspective`'s own discs
(`convolve(board, perspective, kernel)`), with no score gate to mix, and are sound for any
perspective. They were wrongly named in the first draft of this entry, by argument shape rather than
by what the body reads.

**If picked up**: apply the OI-74 shape — decide whether the role is fixed by who is to move (then
drop `perspective`, as undercut did) or whether the non-mover case genuinely needs a child-position
solver query (then follow `detectForbiddenColumns`'s FR-033 recursion). Do not just flip the gate's
sign without deciding which. Re-run `tests/blunder/tagBlunderFixtures.test.js` and expect real diffs
there — read each changed fixture before preserving it.

## OI-77 — `infoProse` paragraph breaks (`\n\n`) do not render; multi-paragraph lesson prose reads as one wall of text

**Status**: RESOLVED 2026-07-29. `ConceptScreen` now delegates to `src/components/InfoProsePanel.jsx`,
which splits on `/\n\s*\n/` into `<p>` elements (the second of the two options below). The predicted
side effect — longer prose on screen — was handled at the same time: the panel scrolls internally
under a pinned board, so Continue never moves. Pinned by `tests/dom/InfoProsePanel.dom.test.jsx`;
conventions in `frontend-conventions.md` §"Lesson concept slides".

**Surfaced**: 2026-07-28, while shortening `lesson-03-threat-vocabulary`.

`ConceptScreen` renders the field as a bare text node:

```jsx
          }}>
            {slide.infoProse}
          </div>
```

The wrapping `<div>` carries inline styles only (`padding`, `background`, `borderRadius`, `fontSize`,
`lineHeight`, `color`) — no `white-space: pre-wrap`, and no split-on-`\n\n` into `<p>` elements. HTML
collapses the newlines, so every authored paragraph break disappears and the block renders as a single
run-on paragraph.

Most lessons author `infoProse` as 2–4 paragraphs separated by `\n\n`, so this affects the whole
curriculum, not one lesson. It is invisible to the test suite (`lessonContent.test.js` only inspects
the string) and invisible in the **admin editor**, where the field is a `<textarea>` that shows the
newlines faithfully — so authoring and learner surfaces disagree, the same class of trap as the
`socratic.overlays` row in `lesson-editor.md` §"Fields the learner UI ignores".

**Workaround in force**: `lesson-03` was rewritten to one short paragraph per slide, which sidesteps
the bug rather than fixing it. Other lessons still carry multi-paragraph prose.

**If picked up**: either add `whiteSpace: 'pre-wrap'` to that div (one line, preserves authored
breaks, cheapest), or split on `/\n\n+/` and map to `<p>` with real paragraph spacing (better
typography, since `pre-wrap` also preserves incidental single newlines). Prefer the second if any
lesson relies on soft-wrapping inside a paragraph. Whichever is chosen, re-read the changed lessons
in the browser afterwards — restoring the breaks will lengthen every prose block on screen and may
push the Continue button below the fold on mobile, which is what the `height`/`minHeight:0` scroller
comment in `ConceptScreen` was added to prevent.

---

## OI-75 — `odd_even_threat` is in neither acceptance set, so its stored `correctCol` is never consulted

**Status**: open — latent, currently masked (observed 2026-07-28)
**Area**: `connect-four/server/categories.js`, `src/lib/categories.js`, `src/screens/ChallengeScreen.jsx`, `connect-four/lessons/lesson-07-odd-rows-belong-to-red.json`

`categories.js` deliberately keeps `odd_even_threat` out of both `MULTI_SOLUTION_CATEGORIES` and
`SINGLE_ANSWER_CATEGORIES` (the comment there is explicit that membership must not be derived by
negation). The consequence is not: `ChallengeScreen.jsx` computes

```js
const usesAcceptedGate = isMultiSolutionCategory || SINGLE_ANSWER_CATEGORIES.has(effectiveCategory);
const isCorrect = usesAcceptedGate ? data.accepted === true : data.quality === 'optimal';
```

so an `odd_even_threat` drill is graded purely on **solver score**, and the authored `correctCol`
(and `evalOddEvenThreat`) is never consulted at grading time. The drill does not actually test the
taught concept — any solver-optimal column passes.

Masked today because lesson 07's two challenges happen to have their taught column *be* the unique
solver optimum (verified 2026-07-28, boards `3553515566110063` cc 3 and `3411022114433433` cc 2), so
the two agree by luck. The day an author picks a concept-correct column that is not solver-max, the
lesson will mark its own taught answer wrong.

**Why deferred**: fixing it means deciding whether `odd_even_threat` is a single-answer category
(add it to the set and let `evalOddEvenThreat` grade) or a genuinely score-graded one (then the
stored `correctCol` should be dropped, not silently ignored). That is the same modelling question as
OI-1 / OI-61.

**If picked up**: pick one of the two models; if single-answer, add the slug to
`SINGLE_ANSWER_CATEGORIES` in **both** `server/categories.js` and the hand-mirrored
`src/lib/categories.js`, and confirm the lesson-07 boards still pass
`tests/lessons/lessonAnswerSets.test.js`.

---

## OI-78 — No pacing-aware tooling for corpus-wide lesson audio regeneration; ad-hoc loops trip the shared rate limiter

**Status**: RESOLVED (spec 051 US5 / FR-031, 2026-07-29) — `connect-four/scripts/generate-lesson-audio.mjs`
added: `--lesson <id>` (repeatable/comma-list, default all 15, discovered from `lessons/*.json`),
`--lang <en|es|all>` (default `all`), `--delay-ms`/`--max-retries` pacing/retry knobs, a real `--help`
that exits 0 before arg validation, 429 handling that reads the plain-text body via `.text()` (never a
bare `.json()`) and honors `RateLimit-Reset` before retrying, and a final summary listing exactly which
(lesson, lang) jobs succeeded/failed so an interrupted run leaves no silent gap. Documented in
`docs/architecture/server-conventions.md` ("Lesson audio corpus CLI"). Verified via `--help` and a
single-lesson dry path (`--lesson does-not-exist` → clean 404 handling; a fake local rate-limited server
→ confirmed the 429/`RateLimit-Reset` retry path). NOT yet run against the full corpus — that's a
separate, later batch (spends real money).

**Status (historical)**: open — tooling gap (surfaced 2026-07-29)
**Area**: `connect-four/server/index.js` (`POST /api/admin/lessons/:id/generate-audio`), `connect-four/scripts/`

`generate-audio` is a **per-lesson, per-language** route, and that is the right unit for the admin
editor's button. But corpus-wide regeneration is now a routine need — a voice/prompt change in
`tts-prompt.<lang>.json` is invisible to the text hash, so re-voicing means 15 lessons x 2 languages,
and the route regenerates unconditionally by design. There is no script for it, so it gets done with
an ad-hoc `curl` loop each time.

That loop is fragile in a way that is not obvious. The route falls under the default `/api/` limiter
at **120 req/min per IP**, a single budget shared with every other caller on the machine — including
a browser QA sweep in another tab. When it trips, `express-rate-limit`'s default handler returns a
**plain-text** 429 body, so a loop piping responses into a JSON parser dies with
`JSONDecodeError: Expecting value: line 1 column 1`, and the server log shows the `[req] POST` line
with **no handler output at all** (the middleware runs before the route). Both signals point at the
handler rather than the limiter. Reproduced 2026-07-29: 6 of 15 lessons completed, the remaining 9
failed instantly and identically.

**Why deferred**: the run itself is easy to redo with `sleep` between requests (done — all 15 lessons
are voiced), so this is ergonomics, not correctness.

**If picked up**: add `connect-four/scripts/generate-lesson-audio.mjs` alongside
`translate-lessons.mjs` — `--lesson <id>` / all, `--lang en|es|both`, a real `--help` (see
`feedback_scripts_meaningful_help`), inter-request pacing, retry-on-429 honouring the
`RateLimit-Reset` header, and a non-zero exit with the raw body printed when a response is not JSON.
Report per-lesson `generated`/`failed` counts and a final orphan audit. Related: OI-18.

---

## OI-79 — Legend shortening dropped ~40 explanatory clauses that were never folded into the slide prose

**Status**: open — content debt (created deliberately 2026-07-29)
**Area**: `connect-four/lessons/*.json` (`slides[].legendItems[].label`, `slides[].windowHighlights[].label`, + `_es`)

All 147 lesson legend labels were rewritten to the identifying noun phrase, because a legend row that
wraps to two lines costs ~24px out of the info-prose panel's budget and four wrapping rows on one
slide cost more than the panel's entire floor (`lesson-editor.md` §"Text length limits"). The rule
applied was: keep the head, drop the clause after the em dash or parenthesis.

For most labels the dropped clause was redundant with the prose. For roughly 40 it was not — it
carried teaching content that now exists **nowhere**. Worst cases:

- `lesson-08` s3: *"A true Claimeven square — even row, directly above a Green disc on an odd row"* →
  `"A true Claimeven square"`. The clause **was the definition**.
- `lesson-08` s3: *"An odd-row square — Green's natural territory, not a Claimeven"* →
  `"An odd-row square"`. The contrast that made the row worth showing is gone.
- `lesson-03` s3: *"Empty cells below it — they must fill before the threat cell is reachable"* →
  `"Empty cells below it"`.
- `lesson-11` s4: *"The cell a real undercut would need — Gray has no completed three aiming here"* →
  `"Where an undercut would go"`. The negative — why this is *not* an undercut — is the whole point
  of the slide.

**Why deferred**: the layout fix was the blocking problem and the legend rewrite unblocked it. Moving
each clause into its slide's `infoProse` is editorial work in two languages that wants the owner's
voice, not a mechanical transform.

**If picked up**: walk the labels changed in the 2026-07-29 diff, and for each dropped clause decide
"already said in the prose" (drop for good) or "fold into the prose sentence about that cell". Do it
in `en` and `_es` together, then re-run `translate-lessons.mjs` only for genuinely new strings.
Re-measure prose panel heights afterwards — longer prose is free now that the panel scrolls, but the
coach bubble's 120px cap is not. Related: OI-77 (closed).

---

## OI-80 — `saveLessonFile` derives the filename from `lesson.id`, so a lesson whose filename slug differs from its id is silently FORKED into a second file

**Status**: open — root cause live; the one offending lesson was renamed 2026-07-29
**Area**: `connect-four/server/lessonAdmin.js` (`lessonFilePath`, `findLessonFile`, `saveLessonFile`)

`saveLessonFile` writes to `lessonFilePath(dir, lesson)`, which **constructs** a path rather than
locating the existing one:

```js
export function lessonFilePath(dir, lesson) {
  const prefix = String(lesson.order).padStart(2, '0');
  return path.join(dir, `lesson-${prefix}-${lesson.id}.json`);
}
```

If the on-disk filename slug is not byte-identical to `lesson.id`, every admin write — save, and
notably `generate-audio` — creates a **new file** and leaves the original untouched. The loader then
reads both, so the app is serving **two lessons with the same id**.

Reproduced 2026-07-29: `lessons/lesson-13-figure-7-trap.json` carries `id: "figure-7"`. Running
`POST /api/admin/lessons/figure-7/generate-audio` produced a brand-new
`lessons/lesson-13-figure-7.json`; the tracked file kept zero audio. The second call then compounded
it — `getLessonsAll().find(l => l.id === 'figure-7')` matched the `-trap` entry (readdir order puts
`-trap` first, since `-` < `.`), so the Spanish run started from the audio-less copy and **overwrote
the freshly-written English file with a Spanish-only one**. Net effect: 16 lesson files, a duplicate
id, and one lesson silently unvoiced in English. Nothing errored; both calls returned
`200 { generated: [13 locators], failed: [] }`.

`findLessonFile` shares the flaw — its regex is `^lesson-\d+-${id}\.json$`, so `deleteLessonFile` and
the rename branch of `saveLessonFile` also fail to see a mismatched file.

**Mitigated, not fixed**: the file was renamed to `lesson-13-figure-7.json` (id and order prefix
unchanged, so `lesson_progress` records and curriculum order are unaffected) and all 15 lessons now
have slug == id, leaving the trap dormant. Nothing prevents the next mismatch.

**If picked up**: make `findLessonFile` identify a lesson by **reading each file's `id`** rather than
by filename regex, and have `saveLessonFile` write to `findLessonFile(dir, lesson.id) ?? lessonFilePath(...)`
so an existing file is updated in place regardless of its slug. Add a `lessonContent.test.js` gate
asserting `basename` slug == `id` and `prefix` == `order` for every lesson file — that alone would
have caught this before it forked anything. Related: OI-78; the filename prefix is also what
`lessonLoader.js` uses for ordering (the JSON `order` field is overwritten).

---

## OI-81 — `generate-tts.locale.test.js` is written in vitest syntax and registered in no test script, so it runs nowhere

**Status**: open — dead test (surfaced 2026-07-29, during spec 051 planning)
**Area**: `connect-four/scripts/generate-tts.locale.test.js`, `connect-four/package.json`

The file looks like a live guard on the CLI's per-language audio paths:

```js
import { describe, it, expect } from 'vitest';
import { audioDirForLang, manifestPathForLang } from './generate-tts.js';

describe('generate-tts locale paths', () => {
  it('en writes to the root coach dir (unchanged)', () => {
```

It is not run by anything. Both `npm test` and `npm run test:fast` are `node --test` with **explicit
file lists**, and this path appears in neither (`grep -a "generate-tts.locale" package.json` → no
match). Adding it to either list would not help on its own: it is written for **vitest**
(`describe`/`it`/`expect` imported from `'vitest'`), which `node --test` does not provide.

**Why it matters**: it covers `audioDirForLang` / `manifestPathForLang` — the functions that decide
whether a clip lands in `public/audio/coach/` or `public/audio/coach/es/`. Spec 051 changes
`generate-tts.js`'s synthesis call path, so a reader can easily believe this locale behavior is
regression-guarded when nothing executes these assertions. A green `test:fast` says nothing about them.

**If picked up**: either port it to `node --test` (`node:test` + `node:assert/strict`, matching every
other test in the repo) and add it to **both** the `test` and `test:fast` lists, or delete it. Do not
leave it as-is. Note the general trap it exemplifies — because both scripts enumerate files
explicitly, **a new test file added to neither list runs nowhere and fails silently**; check
registration whenever adding a test. Related: OI-78 (same `generate-tts.js` / lesson-audio tooling area).

## OI-82 — 5 reason-engine tests are permanently red: they read `server/scripts/*.jsonl` but the corpora live in `server/scripts/fv_suff/`

**Status**: deferred (out of scope for spec 051 — pre-existing and unrelated to audio/TTS)
**Area**: `connect-four/server/tests/{branchInvariance,causalLinksComposers,reasonRenderFixes,renderCoverageCorpus,renderCoverageUniverse}.test.mjs`
**Discovered**: spec 051 / Epic 5, 2026-07-30

Five tests in `test`/`test:fast` fail on every run with `ENOENT`, all from one cause: they build their
corpus path as `join(__dirname, '../scripts/reason_evidence_boards_coverage_<ts>.jsonl')`, but no such
file exists at `server/scripts/` — the coverage corpora live one directory deeper, in
`server/scripts/fv_suff/`. Verified at source:

```
$ ls connect-four/server/scripts/reason_evidence_boards_coverage_*.jsonl
zsh: no matches found
$ ls connect-four/server/scripts/fv_suff/reason_evidence_boards_coverage_*.jsonl
.../fv_suff/reason_evidence_boards_coverage_2026-07-02T11-37-56Z.jsonl
.../fv_suff/reason_evidence_boards_coverage_2026-07-03T17-14-51Z.jsonl
$ grep -a reason_evidence_boards server/tests/renderCoverageCorpus.test.mjs
const CORPUS = join(__dirname, '../scripts/reason_evidence_boards_coverage_2026-07-02T11-37-56Z.jsonl');
```

Reproduces identically on the **main checkout**, so it is repo-wide, not a worktree artifact.

**Why it matters — this is worse than 5 red tests.** These are the render-coverage and branch-invariance
guards for the blunder-`reason` engine (see `docs/architecture/reason-INVARIANTS.md`). They currently
assert **nothing**: the failure is a file-open, so the actual coverage walk never executes. Any reason-engine
regression they were written to catch would ship undetected. Worse, a permanently-red baseline trains every
agent and every human to read "5 failures" as normal — spec 051 spent coordination effort in six separate
batches distinguishing these from real regressions, and the spec's own `tasks.md` (T002/T057) mis-recorded
the count as *two*, which is itself evidence the baseline is not being looked at.

**Why deferred**: entirely unrelated to spec 051's audio/TTS scope, and touching the reason engine requires
reading the four mandatory docs named in `CLAUDE.md` first — not something to do incidentally at the tail of
an unrelated epic.

**If picked up**: first confirm whether `fv_suff/` is the intended home (the corpora may have been moved
there deliberately by a later fv-sufficiency pass) — if so this is a 5-line path fix; if the files were meant
to stay at `scripts/`, the move is the bug. **Do not just make the tests green**: after fixing the path,
confirm each of the 5 actually exercises its assertions and would go red on a real violation — a test that
has never run once is not known to work. Read `docs/architecture/reason-INVARIANTS.md` (esp. I12) and
`reason-DECISIONS.md` before changing anything under `reason_engine/`. Related: OI-81 (another test
registered nowhere / running nowhere — same class of silently-absent coverage).

## OI-83 — The lesson editor never checks that puzzles exist for the chosen confirmation category

**Status**: deferred (admin-only authoring-tool scope, explicitly scoped out of spec 052 / FR-020)
**Area**: `connect-four/src/screens/AdminLessonEditorScreen.jsx` (`confirmationCategory` /
`confirmationCount` fields), `docs/architecture/lesson-editor.md` §"Confirmation Challenges"
**Discovered**: spec 052 / Epic 6, 2026-07-30

An author can pick any `confirmationCategory` in the lesson editor and save. Nothing — not the
editor, not `saveLessonFile`, not `validateLesson` — checks that the `puzzles` table actually holds
`confirmationCount` promoted puzzles for that category. The lesson saves clean and the gap only
surfaces at runtime, when the learner reaches the confirmation gate and the pool comes back short
or empty. This is the same class of trap as memory `feedback_generate_puzzles_for_local_qa`: the
local `puzzles` table is empty for most categories, so a locally-authored lesson looks fine.

`docs/architecture/lesson-editor.md` previously claimed this was "Epic 6 scope"; that pointer was
stale and has been corrected (spec 052 / T040) to point here.

**Why deferred**: admin-only authoring surface with a single internal user; it costs a lesson
author one manual check, and no learner-facing behaviour is wrong today.
**If picked up**: an existence probe at save time (count promoted puzzles for the category, warn —
do not block, since a category can legitimately be populated after authoring). Note the endpoint
must not be a new localhost-only route if the editor is ever used against staging — read
`docs/architecture/api-conventions.md` and memory `project_admin_localhost_directive` first.

## OI-84 — Lesson boards flagged by the widened solver-optimal gate — human review pending

**Status**: open — awaiting a human content decision (filed 2026-07-30 by spec 052 / T032–T033)
**Area**: `connect-four/lessons/lesson-{08,09,11,13,14}-*.json` (concept slides only),
`connect-four/server/scripts/find_lesson_boards.mjs`
**Discovered**: spec 052 / Epic 6, US3 (2026-07-30)

Spec 052 widened `find_lesson_boards.mjs`'s solver-optimal gate (previously only on
`undercut_t2_adjacent`) to every matcher except the overcut pair: a candidate is now rejected
unless the pattern owner is the side to move **and** the taught column is in the solver's argmax
set. **The gate governs candidate search only. No lesson board content was altered by this work** —
this entry is the flag, per FR-017 ("flag for human review, never auto-rewrite").

**Method (so this is reproducible, not a spot check)**: every board (all concept slides + the
socratic node) of the six lessons whose concept maps to a gated matcher was re-checked with
`node server/scripts/find_lesson_boards.mjs <matcher> --check <movestring>` — **51 (board, matcher)
pairs over 26 distinct boards**, covering `z_threat_gap3`, `z_threat_stacked`, `z_threat_socratic`,
`tag:z_threat`, `undercut_t2_adjacent`, `same_parity_pair`, `fork_socratic_clean`, `tag:claimeven`,
`tag:figure_7`, `tag:j_shape`. Each pair was then re-run against a temporary copy of the script with
the gate disabled, so the flags below are exactly the boards the **new** gate rejects — not
long-standing mismatches. (`overcut_active` / `overcut_shared_cell` and lesson-12 are out of scope:
deferred pending OI-76.)

**Headline: zero socratic boards are flagged.** Every board where a taught column actually exists
(the socratic answer) still passes: `the-fork`, `z-threats`, `undercut` (both matchers) and
`figure-7`. All flags are **concept-slide illustration boards**, which have no taught move at all.

| Lesson | Node | Movestring | Matcher(s) | Taught col | True best col (score) |
|---|---|---|---|---|---|
| `claimeven` (L08) | slides[1] | `32332533350` | `tag:claimeven` | 0 (score 2) | 5 (score 4) |
| `z-threats` (L09) | slides[0] & slides[1] | `22343321` | `z_threat_gap3` | 4 (score −5), owned by Gray while **Green** is to move | 2 or 3 (score −2) |
| `z-threats` (L09) | slides[3] | `33332422213100002524` | `z_threat_gap3`, `z_threat_stacked` | 4 — **already the argmax** (score −2 = max); fails only the owner-to-move half of the gate (Gray owns the threat, Green is to move) | 4 |
| `undercut` (L11) | slides[3] | `326223332522553365501` | `same_parity_pair` | 4 (score −1) | 1 (score 7) |
| `figure-7` (L13) | slides[1] | `43222430403555` | `tag:figure_7` | pattern spans cols 1–4 | 5 (score 14) |
| `j-shape` (L14) | slides[2] | `43344032` | `tag:j_shape` | pattern spans cols 3–4 | 1 (score 5) |

**How to read these before "fixing" anything.** Board provenance is not recorded per slide, so this
sweep is a superset: it checks every board of a matching lesson, not only boards actually curated by
that matcher. A flag therefore means *"today's matcher would not produce this board"*, which for a
concept slide is often fine — a slide that illustrates the shape of a pattern does not have to sit
on a position where playing it is best, and several of these boards are deliberately positions where
the pattern's owner is NOT on move. The `z-threats` slides[3] row is the clearest example: its column
IS the best move; only the owner-to-move clause rejects it.

**Decision needed from a human**: for each row, either (a) accept the board as an intentional
illustration and record that, or (b) re-curate it with the gated matcher. Do not batch-replace.

**Related**: OI-85 (the matcher/detector duplication that made this sweep necessary), OI-76 (why the
overcut matchers are excluded), OI-74 (the precedent for a matcher declaring its detector and side).

## OI-85 — `find_lesson_boards.mjs`'s SPECS matchers are independent re-implementations of `classifier.js` concepts and measurably diverge from them

**Status**: deferred — owner-requested tracked follow-up (filed 2026-07-30 by spec 052 / T034)
**Area**: `connect-four/server/scripts/find_lesson_boards.mjs` (`SPECS`, `TAUGHT_COLUMNS`),
`connect-four/server/classifier.js` (the detector table inside `classifyPattern`)
**Discovered**: lesson-content remediation review 2026-07-28 (as OI-63 item 6); split out and
scoped by spec 052

Most matchers in `find_lesson_boards.mjs` do **not** call the production detector for the concept
they curate — they re-derive it from `board.reachableThreats()` geometry. One concept therefore has
two implementations that can disagree, and they do:

- `z_threat_socratic`: the taught z-threat column was in the solver's optimal set in only **25 of 50**
  sampled candidates (measured 2026-07-28).
- `undercut_t2_adjacent`: of 50 candidates only 13 were recognised by `detectUndercut` — that one was
  fixed in 2026-07-28 by pointing it at `detectUndercutBeneficiary` (OI-74), and it is the model.
- `figure_7` / `j_shape` taught columns cannot be derived from production output at all:
  `classifyPattern` stores only `{ cells }` per tag, and those `cells` are the pattern's OCCUPIED
  disc cells. `detectFigure7` at least exposes `threatCells`; `detectJShape` exposes no equivalent.
  Spec 052's gate for these two is consequently **loose** (best move must lie in a column the pattern
  occupies or completes) — weaker than every other matcher's gate, and recorded here rather than
  hidden.

**What spec 052 did and deliberately did not do.** It hardened the matchers *in place*: every one now
carries a "Production detector / side" doc comment naming the classifier.js detector and the player
it validates against (FR-015), the overcut pair carries an explicit OI-76 deferral (FR-016), and the
solver-optimal gate was widened to all but the overcut pair (FR-017). It did **not** unify the two
implementations — that is out of scope for a lesson-surface spec and is this entry.

**Proposal**: one detector per concept. Move whatever a matcher genuinely needs beyond the production
detector (ply windows, cleanliness caps, "latent, not gravity-top", the specific sub-shape a slide
illustrates) into *filters layered on top of* the detector's output, so the pattern definition itself
exists exactly once. Where a detector cannot supply the taught column (`figure_7`, `j_shape`), fix
that at the detector — expose the completing cells the way `detectFigure7` already does — rather than
guessing in the script.

**Why deferred**: unification touches `classifier.js`, which is production code behind the puzzle
categories and the blunder pipeline; the finder is a disposable curation script. The two must not be
refactored together under a content spec's schedule.
**If picked up**: do `figure_7`/`j_shape` first (they expose the real gap), keep OI-74's shape — each
matcher declares detector **and side** — and re-run the OI-84 sweep afterwards, since a unified
detector will re-classify some shipped boards.

---

## OI-86 — Spanish `goalPrompt` copy on lesson-12/lesson-14 overflows the coach bubble

**Status**: ✅ RESOLVED 2026-07-31 — copy shortened and clips regenerated (owner decision to fix
rather than defer). All 22 `goalPrompt`s now fit the measured ~130-char budget in both locales; the
11 rewritten prompts had their clips regenerated and the 16 superseded clips pruned. The original
entry below is kept for the measurement record and the corrected-budget finding.
**Area**: `connect-four/lessons/lesson-12-overcut.json`, `lesson-14-j-shape.json`, `src/components/CoachDialog.jsx:58`
**Discovered**: spec 052, 2026-07-30 (code review)

`confirmationChallenges[].goalPrompt` began rendering to learners in spec 052. Only the two lessons
named in the QA findings (claimeven, undercut) had their copy reshaped to the ~205-char coach-bubble
budget. Measured lengths elsewhere (en / es):

| Lesson | Challenge | en | es |
|---|---|---|---|
| lesson-12-overcut | ch0 | 244 | 275 |
| lesson-14-j-shape | ch0 | 230 | 252 |
| lesson-12-overcut | ch1 | 199 | 217 |
| lesson-13-figure-7 | ch0 | 191 | 210 |

`CoachDialog` caps the bubble at `maxHeight: 120, overflowY: 'auto'`; with the disc-label header row
consuming ~25px, roughly 3–4 lines are visible while a 275-char Spanish prompt needs ~7. It
**scrolls rather than clips**, so nothing is silently truncated — but it is the case
`specs/052-lesson-learning-surface-polish/spec.md` line 155 flagged ("Spanish longer than English …
must still fit … or the copy must be shortened"). These prompts were never rendered before spec 052,
so this is new exposure, not a pre-existing defect.

**UPDATE 2026-07-30 (spec 052 browser QA)** — measured in Chrome against the running dev app, not
from char counts. The bubble's own `scrollHeight` vs its `clientHeight` (the 120px cap) on the
**first** confirmation challenge of each lesson, Spanish locale:

| Lesson | 390×844 mobile (sh/ch) | 1512×900 desktop (sh/ch) |
|---|---|---|
| immediate-threat | 64 / 64 ✓ | — |
| block-before-build | 83 / 83 ✓ | — |
| the-fork | 83 / 83 ✓ | — |
| z-threats | 103 / 103 ✓ | — |
| odd-rows-belong-to-red | **142 / 120** | **122 / 120** |
| claimeven | **161 / 120** | **142 / 120** |
| undercut | **161 / 120** | **142 / 120** |
| figure-7 | **180 / 120** | **142 / 120** |
| j-shape | **200 / 120** | **161 / 120** |
| overcut | **219 / 120** | **161 / 120** |

Two corrections to the entry above: (a) **claimeven and undercut do NOT fit** — their reshaped copy
(183–197 chars) still overflows at both viewports, so the "~205-char budget" is wrong; the bubble
also carries the "Estás jugando con Gris/Verde" side-label row, leaving roughly **≤130 chars** of
real budget. (b) **lesson-07 odd-rows-belong-to-red** overflows too and was not previously listed.
Six of the ten lessons with confirmation challenges are affected, on desktop as well as mobile.

**Why deferred**: rewriting teaching copy for 4 challenges in two languages is a content pass with
its own review bar (voseo, colour terms, no fabricated claims), not a code fix.
**If picked up**: target ≤130 chars per locale (measured, not the stale ~205 figure) and re-measure
in the browser with the side-label row present, for all six lessons in the table above. See
`docs/architecture/frontend-conventions.md` §text length limits.

---

## OI-87 — Coach audio is unassertable in jsdom, so FR-029's automated tier is a smoke check only

**Status**: open — test-infrastructure gap
**Area**: `connect-four/src/lib/useCoachSpeech.js`, `tests/dom/ChallengeScreenGoalPrompt.dom.test.jsx`
**Discovered**: spec 052, 2026-07-30 (code review)

`useCoachSpeech` imports the **module singleton** `src/i18n/index.js` rather than receiving an i18n
instance via context. In a DOM test that mounts with its own `I18nextProvider` instance,
`speakCoachMessage` parks the key in `pendingKeyRef` and the `lang === i18n.language` gate never
opens, so **no coach clip can play at all** — verified by building a control that mounts the pool
(non-override) path under the same harness and serving a real manifest from the fetch stub: it still
records zero `/audio/coach/` plays.

Consequence: the FR-029 assertion "no clip plays when `goal_prompt` overrides" is **not
differential** — it passes against reverted code too. It is documented as such in the test file.
FR-029's real evidence remains T024 (a manual audio-ON browser session), which is **still
outstanding**.

**Why deferred**: fixing it means changing production audio wiring (inject i18n via context/param)
under a spec whose scope is lesson content, not the audio layer.
**If picked up**: parameterise `useCoachSpeech`'s i18n dependency, then convert the control described
above into a passing differential test. Related memory: `project_tts_audio_cached_by_text`,
`project_lesson_progression_audio_traps`.

---

## OI-88 — DOM-test fixture boilerplate is copy-pasted across 4–6 files

**Status**: open — test maintainability
**Area**: `connect-four/tests/dom/*.dom.test.jsx`
**Discovered**: spec 052, 2026-07-30 (code review)

The ~40-line in-memory IndexedDB fake (`FakeRequest`/`FakeObjectStore`/`FakeDB` + `indexedDB.open`,
needed because `ProfileStoreProvider` opens IndexedDB synchronously in its constructor) is duplicated
verbatim across `SocraticNarration`, `SocraticHintPhase`, `LessonTitleConsolidation`, and
`ChallengeScreenGoalPrompt` — each copy's own comment says it "mirrors" another. Separately, the
`i18next.createInstance()` + `init({...})` block is hand-rolled in 6 files. `tests/dom/setup.js`
registers jsdom and the JSX loader but exposes no shared fixtures.

Each `.dom.test.jsx` runs in its own child process, so **process isolation is not a reason** to
re-type these — an importable factory called from each file's own `before()` gives every file a fresh
instance with zero duplication.

**Why deferred**: touches 6 files at the tail of a feature; pure refactor with no behaviour change.
**If picked up**: extract `tests/dom/fakeIndexedDB.js` (`installFakeIndexedDB()`) and
`tests/dom/testI18n.js` (`createTestI18n(resources)`), then point all callers at them. The 3-line
`ResizeObserver` stub is sanctioned per-file boilerplate in
`docs/architecture/testing-conventions.md` and should be left alone.

---

## OI-89 — `promptKeyRef` in `ChallengeScreen` is write-only dead state

**Status**: open — dead code
**Area**: `connect-four/src/screens/ChallengeScreen.jsx:80,123`
**Discovered**: spec 052, 2026-07-30 (code review)

`promptKeyRef` is declared and assigned (`promptKeyRef.current = pickedKey`) but **read nowhere** in
the file — confirmed by grep. It predates spec 052. It matters more now: spec 052 made
`lastCoachKeyRef` diverge from `pickedKey` (it is `null` on the `goal_prompt` override path), so the
two refs look like a pair tracking "the current prompt key" while one silently does nothing and the
other no longer agrees with it — an inviting misread for the next person in this function.

**Why deferred**: spec 052's task T019 explicitly instructed "leave `promptKeyRef` unaffected";
deleting it was outside that task's mandate.
**If picked up**: delete the `useRef` and its single assignment, or, if it is a deliberate hook for
future work, add a comment saying so.

---

## OI-90 — Admin and learner surfaces disagree on whether `lesson.title` can be absent

**Status**: open — minor inconsistency
**Area**: `connect-four/src/screens/AdminLessonListScreen.jsx:104`, `AdminLessonEditorScreen.jsx:248,431`
**Discovered**: spec 052, 2026-07-30 (code review)

Spec 052 consolidated learner-facing lesson titles onto a direct `lesson.title` read (no fallback,
since the field is now required and gated by `tests/unit/lessonContent.test.js`). The admin screens
still use `lesson.title || lesson.id`, a fallback the learner surface no longer has. Harmless today,
but it encodes two different beliefs about whether `title` is optional.

**Why deferred**: cosmetic, admin-only, no learner impact.
**If picked up**: drop the `|| lesson.id` fallback to match the learner surface, or document why admin
tolerates a titleless lesson (e.g. a half-authored draft).

---

## OI-91 — `scripts/generate-tts.js --key` / `--all-new` is broken: `synthesize()` called without `lang`

**Status**: open — verified broken 2026-07-31
**Area**: `connect-four/scripts/generate-tts.js` (`synthesizeAndWrite`), `connect-four/server/ttsProvider.js`
**Discovered**: spec 052 follow-on, 2026-07-31 (pipeline audit)

`synthesizeAndWrite(entry, value, lang = 'en')` calls `synthesize(value)` — dropping its `lang`
argument. `synthesize(text, lang)` requires it and validates it, so every synthesis path through this
script throws:

```
synthesize: invalid lang 'undefined' — must be one of: en, es
```

Verified by running it, not inferred. This breaks `--key` and `--all-new` for **every** language,
including `en`. The registry/manifest/sync subcommands are unaffected and still work.

**Consequence**: coach audio is currently generatable **only** through `/admin/audio`
(`POST /api/admin/audio/generate` / `generate-all`), which do pass `lang` correctly. Anyone reaching
for the documented CLI will hit an opaque throw and may conclude their API key or env is wrong.

**Why deferred**: not on spec 052's path — that work used the lesson-audio endpoint, which is a
different code path entirely. Filed rather than fixed to avoid unrelated scope in an epic closeout.
**If picked up**: pass `lang` through (`synthesize(value, lang)`) and add a smoke test — the bug is a
one-word fix that no test covers, which is why it survived. Related memory:
`project_lesson_audio_generation_traps`, `project_tts_audio_cached_by_text`.

---

## OI-92 — `saveLessonFile` read-modify-write race silently loses a generate-audio write

**Status**: open — reproduced 2026-07-31
**Area**: `connect-four/server/index.js` (`POST /api/admin/lessons/:id/generate-audio`), `saveLessonFile`
**Discovered**: spec 052 follow-on, 2026-07-31

Two `generate-audio` calls against the **same lesson** in quick succession (the natural
`lang:'en'` then `lang:'es'` pair) can lose the second write while still returning a success body:

```
undercut ch0/es: 1 gen 0 fail        ← reported success
$ jq '.confirmationChallenges[0].goalPromptAudio_es' lessons/lesson-11-undercut.json
null                                  ← never persisted
```

`saveLessonFile` is read-modify-write with no locking or compare-and-swap, so the second handler can
read a copy of the lesson from before the first handler's write and clobber it. Reproduced on 1 of 10
lessons while voicing `confirmationChallenges[].goalPrompt`; re-running the losing call with a delay
persisted correctly.

**Impact**: a caller that trusts the `200 {generated:[...], failed:[]}` response records success for a
field that was never written. Only the `lessonAudioCoverage` gate caught it here; a script without that
gate would ship a silently-missing clip. Same family as OI-tracked lesson-write clobbering (see memory
`project_lesson_disk_edit_cache_clobber`).

**Why deferred**: the workaround (serialise per-lesson calls, verify by re-reading the JSON) is cheap
and is now documented in `docs/architecture/api-conventions.md`; a proper fix means adding locking or
CAS to the lesson-write path, which is broader than this epic.
**If picked up**: serialise writes per lesson id (a simple in-process mutex keyed by id would cover the
admin single-writer case), or make `saveLessonFile` re-read-and-merge under a lock. Add a test that
fires two concurrent generate-audio calls for different langs and asserts both fields persist.
