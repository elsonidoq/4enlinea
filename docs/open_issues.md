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
>
> **Dated correction (2026-08-02, Epic 8 spec 055 closeout audit, T049).** Of the five entries named
> above, **OI-1, OI-15, OI-12, OI-24, and OI-77 have all since been re-verified and marked ✅ RESOLVED
> in their own entries below**, each with a fresh file:line citation (spec 055 T042-T046) — including
> OI-12, whose actual underlying bug (the `DeepRevealPane.jsx` timeout, not to be confused with OI-16's
> separate dead-helper residue) turned out to have been fixed in commit `51ecab0` back on 2026-07-12,
> contrary to this epic's own initial working assumption that it remained open. See the new
> **"Epic 8 whole-backlog audit (2026-08-02)"** section directly below this blockquote for the
> additive FR-017 whole-backlog walk (a superset check across every `OI-N` in
> `docs/epics/open-issues-epics.md`, not just these five).

> **Epic 8 whole-backlog audit (2026-08-02).** Per FR-017, every `OI-N` referenced by
> [`docs/epics/open-issues-epics.md`](epics/open-issues-epics.md) (70 entries) was walked and its
> `docs/open_issues.md` status line compared against a fresh read of the code it describes. This section
> lists candidates whose code appears to have shipped while the entry's **top** `**Status**:` line still
> reads open — **it does not edit any of those entries' bodies**, per FR-017's "additive, not a
> replacement" rule; each is left for its owning epic to close out formally.
>
> - **OI-17** (`chooseSparringMove` returns `col: undefined` on a full board) — appears **shipped**.
>   `server/classifier.js:545-547`: `if (playable.length === 0) { throw new NoLegalMoveError('no legal
>   move: board is full'); }` replaces the old silent `Math.max(...[])` → `-Infinity` →
>   `pick([])` → `undefined` path; `server/index.js:1082` catches `NoLegalMoveError` explicitly. Shipped
>   in commit `c192454` ("Spec 054 (Epic 4): server/API data integrity & environment correctness",
>   2026-08-02). OI-17's own entry still reads `**Status**: deferred (latent; unreachable via the normal
>   client flow, 2026-07-13)`. Owned by Epic 4/1 (this branch, spec 054) — not Epic 8's to close.
> - **OI-40** (anonymous puzzle-attempt writes fall back to a shared literal `device_uuid: 'anonymous'`)
>   — **already resolved in its own body**, but its **top** status line is stale. The entry's opening
>   line still reads `**Status**: deferred / open (surfaced during Task 23 ...)`, but a second,
>   differently-formatted status marker further down the same entry (`**Status: ✅ RESOLVED
>   2026-08-02** (spec 054, Epic 4, US1)`) documents the actual fix (`resolveDeviceUuid()` in
>   `server/deviceIdentity.js`). A reader or tool that only checks the first `**Status**:` line per
>   entry (as this audit did) will see it as open. Owned by Epic 4 — flagged here as a formatting/scan
>   trap, not a content gap; the fix itself is real.
> - **OI-41** (`/pricing` bare static page) — **the file-location half of the note is stale, the
>   underlying design gap is not**. The entry says "`pricing.html` and its route are **not on this
>   branch**... pull `main`", but `connect-four/server/pricing.html` exists on this branch (shipped in
>   commit `d358ea3`, "paddle migration", 2026-07-18). The substantive complaint (unstyled, no i18n, no
>   real pricing-page design) still holds — this is not a full resolution, only a stale
>   branch-provenance note inside an otherwise-still-accurate open entry. Owned by Epic 6/9 area — not
>   Epic 8's to close.
>
> Also walked and confirmed still genuinely open (no shipped-but-unmarked evidence found): OI-5, OI-14,
> OI-30, OI-31, OI-32, OI-33, OI-36, OI-38, OI-53, OI-72, OI-81, OI-82. OI-16's top status line
> ("deferred...") is likewise stale relative to its own two now-inline-✅-RESOLVED sub-bullets, but
> OI-16 is *this* epic's (Epic 8's) own entry and its top-line update was outside this batch's
> permitted edit set — flagged here as a residual TODO for whichever Epic 8 batch closes it out, not a
> cross-epic finding.

---

## OI-1 — Single-answer puzzle categories score by solver-score, not by pattern (score-tie ≠ pattern-tie)

**Status**: ✅ RESOLVED (verified 2026-08-02, Epic 8 spec 055 closeout audit T042). Spec 049 shipped the
fix: `src/screens/ChallengeScreen.jsx:342-344` — `const isMultiSolutionCategory =
MULTI_SOLUTION_CATEGORIES.has(effectiveCategory); const usesAcceptedGate = isMultiSolutionCategory ||
SINGLE_ANSWER_CATEGORIES.has(effectiveCategory); const isCorrect = usesAcceptedGate ? data.accepted ===
true : data.quality === 'optimal';` — the six single-answer categories now route through the same
`accepted` (pattern-membership) gate as the multi-solution categories, not a bare
`quality === 'optimal'` score check. Server-side: `server/evaluateMoveHandler.js:249` — `if
(MULTI_SOLUTION_CATEGORIES.has(category) || SINGLE_ANSWER_CATEGORIES.has(category)) {` gates the
`evaluatePredicate` path the same way. Regression coverage:
`tests/integration/singleAnswerCategoriesAccepted.test.js` (12/12 passing, mounts the real extracted
`createEvaluateMoveHandler`, asserts both `accepted:true`-on-taught-column and
`accepted:false`-on-non-pattern-column for all six categories). `specs/049-puzzle-scoring-spanish-localization/tasks.md`
is fully checked off except two manual-QA checklist items (T017, T023) that require a running app, not
code. Was: 📋 SPEC-READY 2026-07-13; deferred out of spec 044 per FR-014/FR-015b.
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

**UPDATE 2026-08-02** (spec 054, Epic 4, US4, T045): **not run — owner-gated**, per FR-032's explicit
carve-out. `connect-four/scripts/probe-refresh-rotation.mjs` was confirmed to exist and its `--help`
was read (`node scripts/probe-refresh-rotation.mjs --help` → prints the exact usage below); it
requires a **real** account's email/password, which was not available in this epic's execution
window. Exact command the user (or a future agent with owner credentials) must run:
```
cd connect-four && node --env-file=server/.env scripts/probe-refresh-rotation.mjs <email> <password>
```
If it prints "rotation detected", build the de-dup Map per this entry's original guidance and update
`server-conventions.md`; if "no rotation", mark this OI ✅ RESOLVED. Recorded in `staging_checks.md`
under the Epic 4 section, dated 2026-08-02. This OI remains **open**.

---

## OI-6 — Superseded de-dup language in `contracts/api-auth-session.md`

**Status**: ✅ RESOLVED 2026-08-02 (spec 055, Epic 8, US3, T040) — citation task only, no code/doc change.
**Area**: `specs/045-account-session-checkout/contracts/api-auth-session.md`
**Discovered**: spec `045` T041/T042 (2026-07-11)

The auth-session contract still describes a server-side de-dup Map coalescing concurrent same-token refreshes, which the shipped code deliberately does **not** implement (see OI-5 / research.md R1). The authoritative, current behavior is documented in `docs/architecture/api-conventions.md` and `server-conventions.md`; the contract file's original wording is now superseded.

**Resolution**: the "If picked up" note below already happened before this OI was worked — confirmed by
direct read that `specs/045-account-session-checkout/contracts/api-auth-session.md:8-13` already carries a
`> **SUPERSEDED (OI-6, 2026-07-12):**` blockquote (dated 2026-07-12, i.e. predating this OI's own
2026-07-11 discovery note by a day, meaning it was added essentially immediately) pointing to OI-5,
`research.md` R1, `server-conventions.md`'s "No de-dup Map — documented absence" section, and
`connect-four/server/authRefresh.js` as the live source of truth. No second, redundant SUPERSEDED block was
added — this is a citation of pre-existing evidence, not new authoring.

**Why originally deferred**: cosmetic — the contract is a frozen planning artifact; the architecture docs are the live source of truth.

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

**Status**: ✅ RESOLVED (verified 2026-08-02, Epic 8 spec 055 closeout audit T044). The exact fix this
entry's own "If picked up" section describes shipped the same day it was discovered, in commit
`51ecab0` ("feat(OI-12): add two-stage deep-reveal timeout helper + test", 2026-07-12 22:10:56 -0300)
plus its immediate follow-up wiring commit `6cc5c71` (2026-07-12 22:12:15 -0300) — both predate this
epic by three weeks. `src/lib/deepRevealTimeout.js:4-5` now exports `DEEP_REVEAL_SOFT_MS = 6000` and
`DEEP_REVEAL_HARD_MS = 30000` (raised from a flat 6s hard-abort to a 30s hard-abort). Live in
`src/components/DeepRevealPane.jsx:184-190`: `const softId = setTimeout(() => setSlow(true),
DEEP_REVEAL_SOFT_MS); const hardId = setTimeout(() => { controller.abort(); ... setTimedOut(true); },
DEEP_REVEAL_HARD_MS);`. The render path (`DeepRevealPane.jsx:320-321`) shows a "still thinking…" state
at 6s while the fetch is still in flight — `loading && slow && !timedOut ?
t('deepReveal.stillThinking', 'Still thinking… detailed explanations can take a few seconds on the
first look.')` — and only shows the `deepReveal.unavailable` failure message (`:327-331`) once the 30s
hard timeout actually fires. This is precisely the "show a 'still thinking…' state instead of a
failure message" resolution this entry's own "If picked up" section asked for.
**Do not confuse with OI-16's now-separately-resolved item**: OI-16 tracked a *different*, later
residue — a dead `deepRevealPhase(elapsedMs, resolved)` helper function in the same file
(`src/lib/deepRevealTimeout.js`) that computed `'loading'|'slow'|'timedOut'` from the two constants
above but had zero callers; that dead code was deleted in Epic 8 spec 055 US2 (T030-T031). OI-16's
entry already reads ✅ RESOLVED for that helper-deletion; this OI-12 entry is the separate underlying
timeout-*behavior* bug, and it turns out to have been fixed independently, earlier, and is unrelated
to Epic 8's own changes.
**Superseded status text (kept for history):** deferred (pre-existing; surfaced during spec-047 QA, unrelated to this feature's changes)
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

**Status: ✅ RESOLVED 2026-08-02** (spec 054, Epic 4, US4, T043). Confirmed end-to-end against the
local database: `schema_migrations` shows migration 057 already applied (`applied_at:
2026-07-15T16:37:47.019Z`, pre-dating this batch — no re-application needed). Started a fresh
`server/index.js` process on this worktree's derived port, created a real Supabase test account
(admin API, immediately deleted afterward), confirmed its `users` row started at
`onboarding_status: 'not_encountered'`, called `POST /api/user/migrate` with a real bearer token and
`{ onboarding_status: 'seen' }` → `204`, then read the `users` row directly (service-role query) AND
via `GET /api/user/profile` — both showed `onboarding_status: 'seen'`, proving the write actually
persisted (not the silent-204 no-op this OI describes). Also confirmed the conditional-write guard:
a second `POST /api/user/migrate` with `onboarding_status: 'skipped'` returned `204` but left the row
at `'seen'` (does not clobber a real prior value). Recorded in `staging_checks.md` under the Epic 4
section, dated 2026-08-02.

## OI-15 — Spanish i18n (`es.json`) ships translations but is never registered; app is English-only

**Status**: ✅ RESOLVED (verified 2026-08-02, Epic 8 spec 055 closeout audit T043 — re-measured fresh,
not copied from the stale "3 of 25 sections" figure below). Switcher machinery: `src/i18n/index.js:4,12,14`
registers `es: { translation: es }` alongside `en`, with `lng: readStoredLang('en')` reading a persisted
choice; `SettingsScreen.jsx` has a language `<select>` (`settings.language.label`, options `en`/`es`).
Content coverage, measured fresh via a top-level-key diff and a full leaf-key diff of
`src/i18n/en.json` vs `src/i18n/es.json`: **30 of 30 top-level sections present, 697 of 697 leaf keys
present, 0 empty/null values.** `node --test tests/unit/i18nKeyParity.test.js` passes (4/4) — "en.json
and es.json have identical nested key sets (key presence only)". The "3 of 25 sections, 22 missing"
figure below is stale; the content gap it described has since closed (bulk translation work landed
across specs 049-053, e.g. commits visible in `git log --oneline -- src/i18n/es.json`). Key-*presence*
parity is what the guard test checks, not per-string translation quality — no evidence of untranslated
placeholder/English-leaked values was found (0 leaf entries are English-identical-and-suspicious by a
spot check), but a by-eye Argentinian-voseo quality pass was not re-run as part of this audit.
**Superseded status text (kept for history):** 📋 SPEC-READY 2026-07-13 — the remaining translation-content work is now specced at `specs/049-puzzle-scoring-spanish-localization/` (Epic 9, US9.3–US9.4). Switcher machinery already SHIPPED 2026-07-12 (useLanguage hook, es bundle registered, Settings selector). On-disk reality: `es.json` has 3 of 25 top-level sections complete (`setcard`, `onboarding`, `settings`), 22 missing; selecting es renders English via fallback until spec 049 lands. Spec 049 adds a `node:test` en/es key-parity guard (registered in both `test` + `test:fast`).
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

**Status**: ✅ RESOLVED 2026-08-02 (spec 055, Epic 8) — **both** sub-bullets below are now resolved: the
dead `deepRevealPhase` helper was deleted (US2, T030–T031) and the jsdom peer mismatch was fixed
2026-07-14. This top line previously still read "deferred" while both of its own bullets read ✅ RESOLVED —
exactly the stale-top-line scan trap the Epic 8 whole-backlog audit (see the header section) flags on other
entries, so it is corrected here rather than left for a reader to reconcile.
**Area**: `connect-four/src/components/DeepRevealPane.jsx` + `src/lib/deepRevealTimeout.js`; `connect-four/package.json` (jsdom peer)
**Discovered**: final review of plan `docs/superpowers/plans/2026-07-12-open-issues-remediation.md`

Two small residues from remediating OI-12 and OI-7, both judged defer-not-fix:

- **Dead tested helper (from OI-12): ✅ RESOLVED (Epic 8, spec 055, US2 T030–T031).** `deepRevealPhase(elapsedMs, resolved)` was deleted from `src/lib/deepRevealTimeout.js` — confirmed no remaining caller anywhere in the repo (`DeepRevealPane.jsx:12` only ever imported `DEEP_REVEAL_SOFT_MS`/`DEEP_REVEAL_HARD_MS`) before deleting (T030). Its dedicated test case (`'phase transitions: loading -> slow -> timedOut...'`) was removed from `tests/unit/deepRevealTimeout.test.js`, leaving the sibling `'hard cap is well beyond the soft hint...'` test — which covers the still-live `DEEP_REVEAL_SOFT_MS`/`DEEP_REVEAL_HARD_MS` constants — fully intact; `node --test tests/unit/deepRevealTimeout.test.js` now runs exactly one passing test (T031). The "either wire it in or drop it" choice below was resolved as: drop it.
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

**Status: ✅ RESOLVED 2026-08-02** (spec 054, Epic 4, US1). `chooseSparringMove` (`connect-four/server/classifier.js`) now throws a dedicated `NoLegalMoveError` when `playable.length === 0`, instead of falling through to `pick([])` → `undefined`. `POST /api/scores` (`server/index.js`) catches `NoLegalMoveError` specifically and returns `400 { "error": "no legal move: board is full" }`, matching `docs/architecture/api-conventions.md`'s error-response conventions, instead of `{ scores, col: undefined }`. Regression test: `connect-four/tests/unit/chooseSparringMove.test.js`'s `'full board (no playable column) → explicit terminal signal'` block, confirmed RED (asserting `col !== undefined` failed) before the fix and GREEN after.

## OI-18 — Lesson slide content is hardcoded English, no i18n mechanism (Spanish gap)

**Status**: **mechanism RESOLVED, content RESOLVED, human-review gate still open** (updated 2026-08-02,
Epic 8 spec 055 closeout audit T047 — re-measured fresh rather than trusting either this entry's stale
"46 of 50 missing" figure below or OI-36's 2026-08-01 figure at face value, per
`specs/055-dev-infra-test-quality/research.md` R11's flag that the two entries currently contradict
each other). Fresh count, walking every `lessons/lesson-*.json`'s `slides[].coachMessages[]`: **66 of
66 `coachMessages` entries across all 15 lesson files have a non-empty `text_es`** — 0 missing. This
matches OI-36's 2026-08-01 "all 15 lesson files now carry text_es" update, not this entry's own
now-stale "only lesson 1 … 46 of 50 missing" figure (that figure predates the bulk-translation commit
`cfb2fa8` OI-36 cites). **The content-presence half of this entry is done; do not re-open it for
missing `text_es` fields — none remain.** The mechanism half (`text_es`/`audio_es` sibling fields,
resolved server-side by `localizeLesson`/`pickLocalized` in `lessonLoader.js`, per-language generation
via `generateLessonAudio(lesson, {lang})`) was already resolved 2026-07-16 and is unchanged.
**What remains open is OI-36's own gate, not a new one here**: OI-36 explicitly records that field
*presence* is not the same as a completed voseo/verde-gris human review pass — "Left open
deliberately, because presence ≠ review" (`docs/open_issues.md` OI-36). Track that remaining work
under OI-36; this entry should not duplicate it.
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

**Status**: ✅ RESOLVED 2026-08-01 (spec `053`/Epic 7, US2) — accepted alternative documented; the
runtime bug was already FIXED (2026-07-13) and this closes the remaining product/UX question.
**Area**: `src/screens/OnboardingMissionScreen.jsx`, `src/lib/useCoachSpeech.js` (audio unlock), `src/lib/onboardingRouting.js` (the first-run auto-route).
**Discovered**: onboarding follow-ups coach-speech debugging, 2026-07-13.

Browsers block `audio.play()` until the page has received a user gesture (confirmed observable:
`play()` rejects with `NotAllowedError`, mp3 fetched but silent). The mission screen is reached via
the anonymous first-run **auto-route** (`shouldAutoRouteToOnboarding`) — it appears with **no prior
gesture**, so the coach greeting is autoplay-blocked. The 2026-07-13 fix (`useCoachSpeech`: hold a
blocked clip and replay it on the first `pointerdown`/`keydown`/`touchend`) makes the greeting play
on the user's **first interaction** and makes all later coach speech robust — but on a truly cold
mission screen the greeting still can't sound *the instant the screen appears*, because that is a
hard browser rule, not a code bug.

**Decision (accepted alternative, owner-settled, spec `053` Settled Decision #3): keep
first-interaction playback as-is.** No new splash screen, no welcome card, no routing change, no
speaker/play affordance — the greeting plays on whatever the user first touches. Rationale: any
entry that "naturally elicits a gesture before the mission screen" adds new UI for a narrow win
(shaving off the delay until the first tap), and the text-bubble fallback below already means no
content is lost while waiting. `shouldAutoRouteToOnboarding`'s anonymous-only semantics and the
no-flash-of-the-sparring-game constraint are unchanged (verified 2026-08-01: `git diff` for this
story touches only docs, not `onboardingRouting.js`/`App.jsx`).

**Text-bubble parity verified 2026-08-01 (FR-011, SC-006):** `OnboardingMissionScreen.jsx`'s
`CoachDialog` bubble renders `onboarding.mission.coachLead` + `onboarding.mission.coachText`, which
concatenate to the **exact same string** as the spoken key `coach.spoken.onboardingMission.greeting`,
in both locales — read directly from `connect-four/src/i18n/en.json` and `es.json`:
- EN: `"Hi, I'm your coach."` + `"Here's how we'll make you dangerous at Connect Four."` = the full
  spoken greeting.
- ES: `"Hola, soy tu entrenador."` + `"Así es como te volveremos peligroso en el Cuatro en línea."` =
  the full spoken greeting.
A user who never hears the audio loses nothing.

**`staging_checks.md:495` real-browser audibility check — pending, not yet performed this session
(2026-08-01).** FR-014a requires a human in a real (non-automation) browser, clean incognito, to
confirm the greeting audibly plays on first interaction in EN and ES before that checkbox can be
signed off — `/app-qa` automation/chrome-devtools MCP is explicitly disallowed (fakes autoplay
permission). No human was available to run this manual check this session. **Owner: Pablo
(repo owner). Target: 2026-08-08.** Also recorded in `docs/deploy-runbook.md` (see note there —
`docs/deployment_steps.md` does not exist in this repo, so the pending-check note was filed at the
nearest equivalent, `docs/deploy-runbook.md`, per this spec's Trap #1 handling) and beside the
checkbox itself at `staging_checks.md:495`. This pending state does **not** reopen OI-21 — the
design question above is fully settled and documented independent of this manual check's outcome.

## OI-22 — Anon post-game review re-analysis re-runs the solver (analyze cache-check is `user_id`-only)

**Status**: ✅ RESOLVED 2026-08-02 (spec 054, Epic 4, User Story 3, T031). The `POST
/api/games/analyze` cache-check (`server/index.js`) now reads `if (req.user || gameDeviceUuid) { … }`
instead of `if (req.user) { … }`: the authenticated branch keeps its unchanged
`.eq('user_id', req.user.id)` filter, and the new anonymous branch matches
`.is('user_id', null).eq('device_uuid', gameDeviceUuid)` — `gameDeviceUuid` is the value already
captured earlier in the handler from the game row itself (`aiGame.device_uuid`), the same value
the write path already uses via `resolveGameBlunderOwner`, so no new identifier or client field was
introduced. Both branches now call one shared `reconstructAnalysisFromBlunders(...)` helper
(extracted verbatim from the pre-existing ~70-line reconstruction block, not copy-pasted per
Constitution Principle II / research.md D6) instead of duplicating the loop. Verified live against
the local dev server: a fresh anonymous game's first `POST /api/games/analyze` ran the solver
(real `score`/`bestScore`/`bestCol` values, ~0.2s); the second call on the same `gameId` hit the new
cache branch (`score`/`bestScore`/`bestCol` all `null`, ~0.01s) — confirming the anonymous
short-circuit fires and reconstructs identically to the authenticated path's existing shape.
**Area**: `connect-four/server/index.js` — `POST /api/games/analyze` cache-check
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

**Status**: ✅ RESOLVED (verified 2026-08-02, Epic 8 spec 055 closeout audit T045). This entry's own
"If picked up" section asked for exactly what shipped in commit `8bcfc3d` ("feat: tier-aware
Subscription section in Settings (D3)", 2026-07-16 13:42:43 -0300 — predates this epic by ~2.5 weeks):
`src/screens/SettingsScreen.jsx:486-533` adds a persistent, always-rendered "Subscription" section
(`{t('settings.subscriptionHeading')}`) that shows an always-visible **`settings.upgradeCta`** button
for free-tier users (`tier === 'paid' ? ... : <button ... onClick={() => setUpgradeOpen(true)}>{t('settings.upgradeCta')}</button>`)
— a 5th `UpgradeModal` call site, but unlike the other four, not gated behind hitting a paywall; it is
visible on every visit to Settings regardless of whether the user is currently blocked by anything.
Settings itself is reached via a persistent header icon on the home screen
(`src/screens/HomeScreen.jsx:79` — `onRight2={() => go('settings')}`), so this is discoverable without
first hitting a gate. This directly satisfies this entry's own suggested resolution ("add a persistent
entry point (e.g. an 'Upgrade' row in Settings/account...)"). Note: this contradicts
`specs/055-dev-infra-test-quality/research.md` R11's "no evidence... only 4 reactive `UpgradeModal`
call sites" finding — that finding's grep evidently missed the Settings section; the code and its
commit date (2026-07-16) both confirm it shipped well before this epic started.
**Superseded status text (kept for history):** deferred (surfaced during Stripe staging bring-up, 2026-07-14)
**Area**: `connect-four/src/` — `UpgradeModal` call sites (SetPickerScreen, SagaScreen, PostSetSummaryScreen, DeepRevealPane, **SettingsScreen — the persistent one**)

There is **no always-visible upgrade CTA** anywhere (no nav entry, no banner, no settings/account row).
The only ways a free user reaches checkout are reactive: tapping a locked puzzle set, tapping a
tier-gated lesson node, finishing a set whose recommended lesson is Pro-only, or exhausting the weekly
deep-reveal quota (429). A paid-intent user who is not currently hitting a gate has no discoverable path
to subscribe. This is what prompted the user's "I don't see any call to action" observation.

**If picked up**: add a persistent entry point (e.g. an "Upgrade" row in Settings/account, a home banner,
or a nav item) that opens `UpgradeModal` via `useUpgradeCheckout()` — it should pass a real
`returnPathOverride` if launched from a session-only screen. Cross-ref: memory `project_stripe_traps`.

## OI-25 — Paying from the /summary paywall cannot restore the summary (SESSION_ONLY state lost)

**Status**: ✅ RESOLVED 2026-08-01 (spec 053, Epic — Entitlement & Payments Consolidation, US5)
**Area**: `connect-four/src/screens/PostSetSummaryScreen.jsx`, `connect-four/src/lib/pendingSetResults.js`
(new), `connect-four/src/App.jsx` (`Navigator` boot routing)

`/summary` is a `SESSION_ONLY` screen driven by an in-memory `results` prop; the historical Stripe
full-page-redirect checkout rebooted the SPA on return, so `results` were gone and the cold-boot rule sent
the user to `home`. The original mitigation (`returnPathOverride='/setpicker'`) only softened where the
user landed — it never restored the summary itself.

**Resolution**: `PostSetSummaryScreen.jsx` now persists `{ nonce, results, category, savedAt }` to a
`sessionStorage` key (`pendingSetResults`) immediately before opening the Paddle.js overlay
(`savePendingSetResults`, T058), and its own mount reads + clears that entry via a lazy `useState`
initializer (`readAndClearPendingSetResults`, T060) — self-validated by a 30-minute freshness window, with
**no** dependency on `checkoutReturnFlow.js` or the checkout `returnPath` (see the T059 investigation
record below). `App.jsx`'s `Navigator` boot effect gained a narrow carve-out — a fresh
`pendingSetResults` entry lets a cold boot land on `summary` instead of unconditionally redirecting to
`home`, so the screen can actually mount to consume it (`docs/architecture/frontend-conventions.md`'s
`SESSION_ONLY_SCREENS` entry documents this). If the entry is missing/invalid/expired, the screen falls
through unchanged to its normal empty-props render and the existing `returnPathOverride='/setpicker'` call
is untouched (FR-031).

**T059 investigation record (why sessionStorage self-validation, not the nonce/returnPath carrier)**: the
original design (and this OI's own "if picked up" note below) assumed the nonce could travel through the
checkout `returnPath`. Investigated at source and rejected: `useUpgradeCheckout.js`'s
`handleCheckoutCompleted` deliberately never forwards `successUrl` to `Paddle.Checkout.open()` — it closes
the overlay itself once its own `verify-transaction` call resolves, specifically so Paddle's own redirect
never fires (FR-003/US2 AC1) — and nothing else in the app reads a Paddle-return URL either. A
`returnPath`-embedded nonce would be written to the server and read by nobody on the way back. Full
reasoning lives as a comment in `connect-four/src/lib/pendingSetResults.js`.

Covered by `connect-four/tests/unit/pendingSetResults.test.js` (pure carrier logic) and
`connect-four/tests/dom/PostSetSummaryScreenPendingResults.dom.test.jsx` (a simulated genuine cold boot —
re-seeded `sessionStorage` + a fresh mount with no in-memory props, distinct from a mere remount; the
missing/expired-entry fallback; and a re-run, through the actual screen, of OI-59's replay-on-subscribe
fix). `npm run test:fast`/`npm run test:dom` both green with these added.

**Original report (historical)**: `/summary` is a `SESSION_ONLY` screen driven by an in-memory `results`
prop; a full-page Stripe checkout redirect reboots the SPA, so on return the `results` are gone and the
cold-boot rule sends the user to `home`. Mitigation shipped at the time: `PostSetSummaryScreen` passes
`returnPathOverride='/setpicker'` so the user lands on Challenges instead of home. Cross-ref: memory
`project_stripe_traps`, [[OI-24]].

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

**Status**: ✅ RESOLVED (Epic 8, spec 055, US2) — both "If picked up" follow-ups below are now done.
**Area**: `connect-four/src/components/SplitReveal.jsx`, `specs/042-mistake-review-unification/contracts/split-reveal-zoom-contract.md`, `connect-four/tests/unit/splitRevealZoom.test.js`, `connect-four/tests/dom/SplitRevealZoom.dom.test.jsx`

The board-sizing fix (live-fit `maxWidth` from the current `splitPct`, floored at 120, replacing the
frozen `boardW`/`>=200`-gate) is in and verified, and this story closed the two remaining follow-ups:
(1) `contracts/split-reveal-zoom-contract.md`'s "Current mechanism" section is now annotated
`SUPERSEDED (Epic 8, spec 055, T026)`, pointing forward to the shipped live-fit mechanism instead of
describing it as current;
(2) a new render-level DOM regression test,
`connect-four/tests/dom/SplitRevealZoom.dom.test.jsx` (T027–T029), mounts `SplitReveal` in a short
container and asserts the rendered board's `maxWidth` stays within the enclosing pane and that the
`constrain`/`maxWidth` cap is actually applied — registered by name in the `test:dom` script string
and observed running. Proven non-vacuous (SC-003): temporarily reintroducing the pre-fix mechanism
(`boardW` computed without the `MIN_BOARD_W` floor, gated by `constrain = boardW >= 200`) made the
test fail with `AssertionError: SplitReveal must apply a maxWidth cap, not drop it`; reverting made it
pass again (`git diff connect-four/src/components/SplitReveal.jsx` empty after revert).
`splitRevealZoom.test.js` (the pure `computeFrozenBoardWidth` test) was left untouched, as intended —
the new test supplements it rather than replacing it.

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

**UPDATE 2026-07-30 (spec 052, Epic 2, US5) — PARTIALLY closed: 2 of 7 candidates admitted, 5
excluded with a dated, per-pattern rationale. Not marked RESOLVED — this is an intentional partial
closure, not a defect.**

T052 measured real end-to-end `POST /api/evaluate-move` latency (median 4.6ms / mean 15.0ms against
the Explanation Engine's 2000ms budget, ≈1844–1995ms headroom) and every candidate detector's
marginal cost individually — all seven of `figure_7`, `j_shape`, `z_threat`, `undercut`, `overcut`,
`odd_even_threat`, `claimeven` are cheap enough on a pure latency reading that all seven could fit.
**Latency was not the binding constraint for any of them.** Per
`docs/architecture/reason-DECISIONS.md` D40 (full measurements table + per-candidate rationale
there), the actual admission gate was structural compatibility with the existing absent→present
transition-gate shape:

- **Admitted: `figure_7`, `j_shape`.** Both retain an explicit `perspective` parameter untouched by
  this epic's US1/US2 overcut/undercut work, so they can be called as `detectX(nextBoard, null,
  mover)` — reproducing the exact transition-gate shape Category 3/4 already use, zero solver cost,
  zero interface change. Shipped as `classify()`'s new Category 6, with `eval.figure_7.*.summary` /
  `eval.j_shape.*.summary` pools newly authored in both locales (not just `coach.spoken.*`).
- **Excluded: `undercut`, `overcut`.** Structurally incompatible, not a latency finding — this
  epic's own US1/US2 (FR-001–FR-003) *deliberately dropped* their `perspective` parameter so role is
  resolved only from `board.currentPlayer` (the fix for OI-76). That invariant makes it impossible
  to ask "does the ORIGINAL mover still have this pattern on `nextBoard`" at all, since
  `nextBoard.currentPlayer` is the opponent once the move is played. Reintroducing a caller-supplied
  perspective to enable the gate would directly reopen OI-76.
- **Excluded: `z_threat`, `odd_even_threat`, `claimeven`.** Cheap in isolation, but correctly
  evaluating the "after" half of a transition gate for the ORIGINAL mover's perspective on
  `nextBoard` triggers each detector's own solver-recursion branch (the mover is no longer
  `nextBoard.currentPlayer`), which requires converting `classify()` from a synchronous, solver-free
  pure function into an `async` function with a live solver threaded through — for the first time
  importing a per-move external-process failure mode into a path that today cannot have one.
  `claimeven` is additionally Player-2-only, narrowing scope further. Judged not worth the
  sync→async architectural risk for praise-variety benefit; explicitly revisitable, the measured
  numbers already stand in D40.

**Verified**: `test:fast` green; a dedicated round-trip test
(`tests/integration/liveCoachFigure7JShape.test.js`) exercises the real `POST /api/evaluate-move`
endpoint and confirms each admitted pattern fires exactly once on creation and does not re-fire on a
subsequent persistence-only move. Full rationale, measurements table, and the `eval.*` authoring
decision: `docs/architecture/reason-DECISIONS.md` D40.

**Remains open**: `z_threat`, `odd_even_threat`, `claimeven`, `undercut`, `overcut` are still
unreachable from live sparring praise — closing that gap requires either the `classify()`
sync→async conversion (for the three solver-recursion detectors) or a perspective-preserving
redesign of the overcut/undercut role-split (for the other two), neither undertaken here.

## OI-31 — Staging `.env.staging` DATABASE_URL uses the transaction pooler (6543); `migrate.js` needs the session pooler (5432)

**Status**: latent risk (surfaced 2026-07-14 while building `reset-staging-db.js`; not yet observed to break because no multi-statement DDL was run against staging via this file)
**Area**: `connect-four/server/.env.staging` (`DATABASE_URL=...@aws-1-us-east-1.pooler.supabase.com:6543/...`) vs `connect-four/server/migrate.js` (wraps each migration in `BEGIN ... COMMIT`)

The staging connection string points at the **transaction pooler (port 6543)**. Per the project's own session-vs-transaction-pooler rule (memory [[reference_supabase_connection]]), 6543 is FORBIDDEN for DDL and multi-statement transactions. `migrate.js` runs each migration inside an explicit `BEGIN...COMMIT` with arbitrary DDL, so applying migrations against staging using the `.env.staging` URL as-is can fail or misbehave. Single-statement ops (the `TRUNCATE ... CASCADE` in `reset-staging-db.js`) are unaffected.

**Why deferred**: staging deploys on Railway may inject their own session-pooler `DATABASE_URL`, so this may only bite a *local* `node --env-file=server/.env.staging migrate.js` invocation — unconfirmed either way.

**If picked up**: either change `.env.staging`'s `DATABASE_URL` port to 5432 (session pooler), or have `migrate.js`/the deploy path rewrite 6543→5432 for staging. Verify what URL the staging Railway deploy actually uses for migrations before editing. Cross-ref: [[reference_supabase_connection]], memory `project_spec031_staging_production_deploy`.

**UPDATE 2026-08-02** (spec 054, Epic 4, US4, T044): the open question — whether Railway's own
injection (not just the local `.env.staging` file) is also on 6543 — is now **settled: yes**.
`railway variables --service 4enlinea-staging --environment staging --kv | grep DATABASE_URL` (project
`decode C4`, service id `93d9cd25-077e-4212-9a49-dc4c62e227ad`, environment id
`55bda1d0-5b22-4686-b12a-79753765b2c7`) shows `DATABASE_URL` on port **6543** — the same forbidden
transaction pooler as the local file, confirmed via `railway.json`/`railpack.json`'s start command
(`node server/migrate.js && node server/index.js`) and `server/migrate.js:15`
(`new pg.Pool({ connectionString: process.env.DATABASE_URL })`), i.e. `migrate.js` really does consume
this exact Railway-injected variable — there is no separate pooler-specific var. For comparison, the
**production** service (`4enlinea-production`) was checked the same way and its `DATABASE_URL` is
correctly on port **5432** (session pooler) — so this is a staging-only misconfiguration, not a
systemic one.

This finding was **read-only** (`railway variables --kv`, no writes) per this epic's staging/production
write ban — the actual remediation (updating the `DATABASE_URL` variable on the `4enlinea-staging`
Railway service to the session-pooler port 5432, mirroring the value already correct on
`4enlinea-production`) was **not applied** and requires the user's own action:
```
railway variable set 'DATABASE_URL=<session-pooler-url-port-5432-with-sslmode=no-verify>' \
  --service 4enlinea-staging --environment staging
```
followed by a redeploy so `migrate.js` picks up the corrected value before the next migration run.
Recorded in `staging_checks.md` under the Epic 4 section, dated 2026-08-02. This OI remains **open**
pending that variable change.

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

**UPDATE 2026-07-30 (spec 052, Epic 2, US4) — item 2 RESOLVED; item 1 split: fork half RESOLVED
with real behavior change, forced-win half shipped but proven to have NO observable behavior
change today; a further residual on the forced-win half is tracked as a new standalone entry,
OI-90. Overall status stays open, not resolved — see below for exactly what remains.**

- **Item 2 (`candidate-generator.js` classify-consumer not in `test:fast`) — RESOLVED.** T050 added
  a `test:fast`-safe regression exercising `candidate-generator.js`'s `cls.tag` consumer (`:668`,
  `if (cls?.tag) tags.push(cls.tag)`) via a fixture board that exercises `classify()`'s pure-geometry
  Category 3 gate directly, with no live solver process. It fails on the old boolean gate and passes
  on the new diff — this residual is closed.
- **Item 1, fork half (`hasDoubleThreat`/Category 3) — RESOLVED with a real, observable behavior
  change.** `classify()`'s Category 3 gate now diffs `colsAfter \ colsBefore` (T042/T043) instead of
  the boolean `!hasDoubleThreat(board, player)` gate. T046 harvested a board where the mover already
  holds a fork in columns A/B and creates a second, distinct fork in columns C/D; `classify()` now
  returns `'double_threat'` for that move where it was previously suppressed — a genuine, verified
  behavior change through the production path.
- **Item 1, forced-win half (`detectForcedWin`/Category 4) — code shipped, but proven to change NO
  live behavior today.** T044/T045 replaced the boolean `.matched` transition with a `blockCol`-diff
  (mirroring the fork half). Per `docs/architecture/reason-DECISIONS.md` D41 (Finding B): a rigorous
  proof plus an exhaustive empirical search (~3,400 solver-guided self-play games +
  ~21.8M solver-free random-walk plies, zero counterexamples) shows a single `classify()` move can
  **never** produce "matched both before and after, with a different `blockCol`" — whenever
  `detectForcedWin` matches pre-move with `blockCol = X`, X's winning window is permanently filled
  save its threat cell, so X remains a threat on any `nextBoard` reached by a *different* column
  (playing AT X itself would be Category 1, `immediate_threat`, which fires first). So the new diff
  and the old boolean gate agree on every reachable transition — spec.md's Acceptance Scenario 3 (a
  move creating a *different* forced win while an old one persists) describes an unreachable
  position. T048 was satisfied by a mechanism-level test proving the identity-diff logic is correct
  (two independently-harvested boards fed directly to `detectForcedWin`, not via a move transition,
  since none exists) plus this proof — not a harvested single-move counterexample, because none
  exists to harvest. This is correctness hardening with zero live impact today, not a defect.
- **New residual on the forced-win half, tracked separately as OI-90 (do not fold in here per
  FR-026).** Independent of the "no observable change" finding above: two distinct forced-win
  *lines* sharing the *same* anchoring `blockCol` (same first forcing move, different continuation)
  are still conflated as one instance by the minimal `blockCol`-only identity — a narrower version
  of item 1's original "conflates all forced-win instances" gap, not fully closed by this fix
  (research.md Decision D5 deliberately scoped the fix to the anchoring column only).

**Net**: item 2 is closed. Item 1 is closed for the fork sub-case (real behavior change, verified)
and shipped-but-behaviorally-inert for the forced-win sub-case (proven unreachable today), with a
narrower residual on the forced-win sub-case tracked at OI-90. This entry is not marked RESOLVED
because OI-90's residual means item 1 is only partially addressed on the forced-win side.

## OI-34 — Fallback-only checkout activations do not record the `upgrade_completed` analytics track

**Status**: ✅ RESOLVED 2026-08-01 (spec 053, Epic — Entitlement & Payments Consolidation, US3)
**Area**: `connect-four/server/paddleProcessor.js` — `verifyTransaction` (sync-activation fallback) and `handleWebhook`'s `transaction.completed` branch (primary path)

**UPDATE 2026-08-01**: this entry was originally written against the removed Stripe integration
(`stripeProcessor.js`'s `syncCheckoutSession` vs `handleWebhook` — the description below this line is
**historical only**; that file no longer exists). Re-evaluated against the current Paddle integration
(spec 053 T053): the architecturally identical gap was confirmed still applicable —
`connect-four/server/paddleProcessor.js`'s `verifyTransaction` (lines ~187–213 pre-fix) applied the
same `tier: 'paid'` write `handleWebhook` applies but explicitly did **not** insert the `tracks`
`upgrade_completed` row (the pre-fix code's own comment: "that analytics record is exclusively the
webhook's to write"), so a purchase activated via the fallback with the webhook never delivered at all
was still missing from the `upgrade_completed` analytics stream despite the user being correctly
`paid`.

**Fix shipped (T054)**: `verifyTransaction` now also writes the `upgrade_completed` `tracks` row, via a
new shared helper `recordUpgradeCompletedTrack` (`paddleProcessor.js`) that both `verifyTransaction` and
`handleWebhook`'s `transaction.completed` branch call. Idempotency is per-transaction, reusing
`payment_events`' existing `UNIQUE(event_id)` constraint — no new table: each call first inserts a
synthetic, transaction-id-derived claim row (`event_id: `upgrade_completed_track:<transactionId>``); a
`23505` on that claim means the other path already claimed (and wrote) the analytics row for this
transaction, so the call is a no-op. This holds in **both** arrival orders (fallback-then-webhook and
webhook-then-fallback), not just the one FR-019 named. A write failure inside `verifyTransaction`'s call
is caught and logged, never rethrown (Constitution Principle V — analytics writes must not block/break
the client's activation result); a failure inside `handleWebhook`'s call still throws, preserving that
branch's pre-existing FR-009 durability behavior.

**Verified (T055)**: `connect-four/server/paddleProcessor.test.mjs` — the `verifyTransaction` "activates"
test now asserts exactly one `tracks`/`upgrade_completed` row on a fallback-only activation; the
`createPaddleProcessor — fallback + webhook upgrade_completed dedup (OI-34)` describe block covers both
orderings explicitly (fallback-then-webhook and webhook-then-fallback), each asserting exactly one
`tracks` row total across both calls. `npm run test:fast`: all `paddleProcessor.test.mjs` cases green
(29/29).

**Original report (historical, Stripe-era)**: `syncCheckoutSession` (the fallback that flips
`tier: 'paid'` when the webhook is delayed/undelivered) intentionally did **not** insert the `tracks`
`upgrade_completed` row — that analytics write lived only in `handleWebhook`'s
`checkout.session.completed` branch, to avoid double-tracking when both paths fired (the normal case,
where they raced and converged). Making the track idempotent-per-session was judged more machinery than
the analytics gap warranted at the time (2026-07-15) and deferred; that decision is what spec 053 US3
revisited and closed above.

## OI-35 — QA run 2026-07-15 findings backlog (agentic_QA_2026-07-15-1321.md) — re-triaged and routed

**Status**: ✅ RESOLVED 2026-08-01 (spec `053`/Epic 7, US1). The findings file `agentic_QA_2026-07-15-1321.md` is now committed at the repo root (was untracked at surfacing time — the prior body's "committed findings file" claim was false until this triage; it is now true). Every finding has been re-triaged against the current tree and carries a `DISPOSITION:` line in the file itself (`grep -n "^DISPOSITION:" agentic_QA_2026-07-15-1321.md` → 23 lines). This entry is the durable disposition record — read below, not just the file.
**Area**: multiple (mistake-review nav, lessons/Spanish localization, upgrade funnel, input validation, onboarding, saga progression, DEV tooling)

**Denominator (FR-002/T007)**: the file's 25 `####` blocks split into 23 actual problem reports (dispositioned below) and 2 `[passes]` entries (line 353 "Progression + locking", line 371 "Lesson audio" — excluded by definition, they record successes not findings). Separately, 4 `❌ fail` checklist rows live outside any `####` header (lines 474, 543, 546, 547) — each maps onto one of the 23 findings below and carries that finding's same disposition (noted inline in the table). **Total dispositioned: 23 findings + 4 swept checklist rows, all accounted for.**

### Disposition table (one row per `####` finding, in file order)

| # | Finding (severity) | Batch | Disposition | Evidence |
|---|---|---|---|---|
| 1 | "Replay intro" bypasses mission screen (minor) | A | **fixed** | commit `e85640d` — `SettingsScreen.jsx#handleReplayIntro` now routes through `onboardingMission` |
| 2 | Import offer requires 2 clicks after sign-in (minor) | A | **fixed** | commit `f625de8` — Dev-skip-auth no longer wipes `stashReturnTo('settings')`; `App.jsx` consumes it via `consumeReturnTo()` |
| 3 | Lost games report "No mistakes"/100% accuracy (minor) | A | **owned-by-OI-37/US3** | same spec's US3 (T016–T018) reproduces the in-app resign repro and closes OI-37 with both triggers' evidence; pointer only |
| 4 | Onboarding mission Spanish uses tú, not voseo (minor) | A | **fixed** | commit `99561c7` — `es.json` onboarding strings now voseo (dup of #21; also swept row line 543) |
| 5 | DEV claimeven fixture Green/Gray contradiction (minor) | B | **fixed** | commit `fb7c22c` — `devFixtures.js` sets `CATEGORY_USER_PLAYER.claimeven = 2` |
| 6 | Setpicker pluralizes "1 positions" (polish) | B | **fixed** | commit `8cbd3fd` — i18next `positions_one`/`positions_other` plural keys |
| 7 | `challenge-progress` 401 for signed-in anon (minor) | B | **fixed / still holding** | live-verified 2026-08-01: fresh anon session (`POST /api/auth/anonymous`) → `GET /api/user/challenge-progress` = 200 with real progress, cold and after navigating into a Challenge screen |
| 8 | Candidate generation "fetch failed" (minor) | B | **stale (environmental flake, not reopened)** | already reclassified 2026-07-16 in-file; FR-008 forbids reopening; re-confirmed 2026-08-01 |
| 9 | Anon free deep reveal spendable on suboptimal move (minor) | C | **owned-by-OI-35/US3 (D2)** | Settled Decision #5: retire "blunders only", ship no gate — recorded by this same spec's US3 (T014/T015); pointer only |
| 10 | Back button infinite-toggles `/mistakes ↔ /stats` (major) | C | **fixed** | commit `f4de927`; regression test `categoryListBack.test.js` 5/5 pass; live-verified 2026-08-01 (cold `/mistakes` → 1 Back press → Home) |
| 11 | "Failed to save" papergames_id on first attempt (minor) | C | **fixed** | commit `f76b62d` — `SettingsScreen.jsx` wraps the save in `fetchWithAuthRetry` |
| 12 | Saga map shows stale progress after lesson completion (minor) | D | **fixed** | commit `0de0a8b` — awaits the lesson-progress save before returning to the saga map |
| 13 | English leaks in Spanish UI: sort chips, review/blunder headers (minor) | D | **fixed** | commits `9469a68`, `c995491` (dup of #20/#21 below) |
| 14 | Lesson CONTENT English-only in Spanish (major) | D | **stale** | commit `cfb2fa8` shipped `_es` sibling fields for all 15 lesson files; `lessonLoader.js` merges them per-field for `es` (dup of #18) |
| 15 | No in-app billing-portal UI / no standalone upgrade entry (minor) | E | **owned-by-Epic-3** | Epic 3 ("Entitlement & Payments Consolidation"), still open/running in a parallel worktree (Lane A) — pointer only |
| 16 | Paid gates use scattered `tier` checks, not shared interface (minor) | E | **owned-by-Epic-3** | Epic 3 Settled Decision #1 (OI-39), still open — pointer only (also swept row line 474) |
| 17 | Annual plan shows no savings framing (polish) | E | **owned-by-Epic-3** | Epic 3, still open — pointer only |
| 18 | Lesson Concept/Socratic content English-only (major) | F | **stale** | same evidence as #14 — commit `cfb2fa8` |
| 19 | Onboarding mission-pillar/import-offer titles tú not voseo (minor) | F | **fixed** | same evidence as #4 — commit `99561c7` (also swept row line 543) |
| 20 | Past Games sort chips hardcoded English (minor) | F | **fixed** | commit `9469a68` (also swept row line 547) |
| 21 | Review + Blunder-detail headers hardcoded English (minor) | F | **fixed** | commit `c995491` (also swept row line 547) |
| 22 | KbTermPopup raw-slug title + hardcoded English CTAs (minor) | F | **fixed** | commit `f41dcce` (also swept row line 547; the KB summary body's own Spanish-fallback gap is the separately-tracked OI-38, untouched here) |
| 23 | `/api/scores` 500 on malformed movestring (minor) | F | **fixed** | commit `9a7d42d`; live-verified 2026-08-01: malformed movestring → HTTP 400 with a validation message, not 500 |

**Swept checklist rows (outside any `####` header, FR-002)**: line 474 ("Paid gates read 'is paid' only through shared swappable interface — ❌ fail") → same disposition as finding #16 (owned-by-Epic-3). Line 543 ("Voseo dialect — ❌ FAIL") → same disposition as finding #19 (fixed, `99561c7`). Line 546 ("Lesson content English-only — ❌ CONFIRMED") → same disposition as finding #18 (stale, `cfb2fa8`). Line 547 ("Batch-D minor leaks — ❌ CONFIRMED") → same disposition as findings #20/#21/#22 (fixed).

**Net**: 15 of 23 findings **fixed** (with commit citations, several duplicated across batches so the real fix count is 12 distinct commits); 3 **stale** (candidate-gen flake unchanged-by-design, row 8; lesson-content gap closed by `cfb2fa8`, rows 14 and 18 — the same evidence dispositioning two separately-filed findings); 3 **owned-by-Epic-3** (upgrade-funnel/payments, still open in a parallel worktree); 2 **owned by this same spec's US3** (accuracy-vs-outcome, deep-reveal spend policy — both are this epic's own record-and-close stories, not a different epic, and are pointers only from US1's perspective). Zero findings require further code changes under US1's fix-here scope (FR-004/FR-005/FR-006 all landed as "already fixed, re-verified" — no live-check surprised the triage).

**Side discovery (out of US1's scope, not acted on here)**: while verifying finding #14/#18 (lesson content), the current tree shows `_es` fields for **all 15** lesson files (commit `cfb2fa8` "Spanish translations for all 13 lessons"), which appears to make `docs/open_issues.md`'s separate OI-36 ("only lesson 1 of 13 translated") stale. OI-36 was not re-verified or edited under this US1 batch — flagging for whoever picks it up next.

**If picked up further**: nothing remains under US1. The two US3-owned items (row 3, row 9) close via this spec's US3 (T014–T018); the three Epic-3-owned items (rows 15–17, checklist row 474) stay with Epic 3, Lane A.

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

**UPDATE 2026-08-01 (spec `053`/Epic 7 — surfaced during the OI-35 re-triage, not acted on):** the
headline "only lesson 1 of 13 translated" is **stale**. Commit `cfb2fa8` shipped `_es` sibling fields
across the lesson set, and **all 15** lesson files now carry `text_es` — counted at source
2026-08-01: `lesson-01` 9, `lesson-02` 9, `lesson-03` 15, `lesson-04` 10, `lesson-05` 8, `lesson-06`
9, `lesson-07` 9, `lesson-08` 9, `lesson-09` 9, `lesson-10` 9, `lesson-11` 10, `lesson-12` 9,
`lesson-13` 9, `lesson-14` 9, `lesson-15` 8. (Note the entry's title also predates lessons 14–15
existing.) This is why spec 053's triage dispositioned the findings file's two "lesson content
English-only in Spanish mode" findings (rows 14 and 18 of the OI-35 table) as **stale**.

**Left open deliberately, because presence ≠ review.** The blocker this entry actually records was
never "are the fields there" but "has a human applied the step-2 review checklist — voseo,
verde/gris vs. the `userPerspective` token trap, `[term:]`/`[zone:]` preservation — before the
remaining lessons were bulk-translated on an uncalibrated prompt." That review is **not** evidenced
by the field counts above and was not performed by spec 053 (out of scope: no lesson content or audio
work). **If picked up**: spot-check 2–3 of the bulk-translated lessons against the step-2 checklist;
if they hold, close this entry citing `cfb2fa8` — if a systematic voseo or colour-perspective error
shows up, that is the real remaining work. See [[project_lesson_answer_set_invariant]] and
`docs/knowledge-base/` for the colour-token mapping.
4. **After the text is committed**, generate narration audio for that lesson — preferably via the admin editor's "Generate audios" button with the language toggle on **es** (now lang-wired, commit `2201894`); or `curl -sX POST localhost:3001/api/admin/lessons/<id>/generate-audio -H 'Content-Type: application/json' -d '{"lang":"es"}'` (server running locally). Then verify `prune-audio` reports `{deleted: 0}` before trusting it (Task 3's trap: `collectReferencedAudio` must already cover `audio_es`). **Translate and voice in the same pass**: a lesson translated but not yet voiced serves Spanish text with the **English** audio clip (the per-field fallback backfills `audio` from English), which reads worse than silence.
5. **Terminology drift to fix before/during the bulk pass**: lesson 1 rendered "four-cell window" as both "ventana de cuatro **celdas**" and "ventana de cuatro **casillas**" (visible on one screen). Pin a glossary in the script's prompt so a consistent term is used across all ~6,000 words.
5. Run `npm run test:fast` once per lesson (or batch) before committing.

Heaviest remaining lessons by word count: `lesson-11-figure-7-trap.json` (~860 words), `lesson-10-overcut.json` (~825), `lesson-12-j-shape.json` (~789), `lesson-05-claimeven.json` (~787). Cross-ref: memory `project_spanish_output_silent_fallback`; `docs/architecture/frontend-conventions.md` (Spanish = Argentinian voseo); OI-35 (this gap was originally flagged there as a QA finding); `docs/architecture/` D1 decision record for lesson localization.

## OI-37 — Accuracy 100% still reads oddly next to a lost game (product question, not a bug)

**Status**: ✅ RESOLVED 2026-08-01 (spec `053`/Epic 7, US3) — closed with evidence from both triggers;
no code changed.
**Area**: `connect-four/src/screens/ReviewScreen.jsx` (Accuracy card)

Task 18 fixed the *copy* contradiction: a 0-mistake resigned/lost game now shows `review.cleanButLost` ("No mistakes on the board — but the game was lost. Review how it ended.") instead of the old "Clean game. Nothing to revisit." copy, and the Past Games card suppresses its "No mistakes" chip when `outcome === 'lost'`. **The Accuracy metric itself (100%) was deliberately left unchanged** — it measures board-move optimality (every scored move matched the solver's best line) and is correct on its own terms; resigning isn't a board move and is out of its denominator by design. Do not "fix" this by folding resignation into the accuracy calculation: doing so would conflate two different questions ("did every move I made match the solver's best line?" vs. "did I finish the game?") into one number, destroying the metric's ability to answer either one cleanly.

**Owner-settled 2026-08-01 (spec `053` Settled Decision #4): a minimum-scored-moves threshold was
considered and explicitly rejected** — *"Forget about the short game threshold. Do nothing special to
those games. There are more risks of introducing a new issue than anything else."* No threshold,
suppression rule, or new Stats metric is being added on any surface as a result of this closure.

**Evidence, both triggers:**

1. **Papergames import (342-game dataset, account `69e773d36bf9938bffc1509a`, 171 wins / 160 losses /
   11 draws)** — across the 160 losses with a non-null accuracy:

   | loss `finish_reason` | n | max accuracy | losses at exactly 100% |
   |---|---|---|---|
   | `winner` (decided on the board) | 144 | 94% | 0 |
   | `resignation` | 4 | 89% | 0 |
   | `time-up` | 12 | 100% | 7 |

   All 7 accuracy-100% losses are `time-up` (clock) losses (user-move counts 1, 2, 2, 4, 5, 6, 6); no
   imported `resignation` loss ever hit 100%. This evidence is Papergames-import-only and does not
   exercise the in-app resign path.

2. **In-app resign repro (verified live 2026-08-01, spec `053`/Epic 7 US3 T016)** — started a sparring
   game, played only solver-recommended moves for all 12 user moves (confirmed optimal via the in-game
   Hint toggle, `GameScreen.jsx`'s `handleHintToggle`, matching the highlighted column on every move —
   coach confirmed "Perfect — you created the double threat" partway through), then resigned via
   `handleResign`. Landed on `ReviewScreen.jsx` and observed: **`review.cleanButLost` rendered
   correctly** — "No mistakes on the board — but the game was lost. Review how it ended." — alongside
   "Accuracy 100%", "Optimal 12", "Suboptimal 0", "Blunder 0". The old "Clean game. Nothing to
   revisit." copy did **not** appear. The `isLoss` guard at `ReviewScreen.jsx:280` fired correctly for
   the resign trigger; **no live bug reproduced**, so no code change was made.

**Both triggers now agree**: neither the Papergames-imported `resignation` losses nor the in-app resign
path shows a stale "clean game" reading. `review.cleanButLost` copy confirmed correct in both languages
by reading `connect-four/src/i18n/en.json`/`es.json` directly (EN: "No mistakes on the board — but the
game was lost. Review how it ended."; ES: "No hubo errores en el tablero, pero perdiste la partida.
Mirá cómo terminó.").

Whether a 100%-accuracy badge should still be visually softened, annotated, or paired with an explicit "you resigned" note when the outcome is a loss remains an open product/UX call if ever picked up again — but the original "reads like a bug" contradiction is resolved and closed.

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

**Status**: ✅ RESOLVED 2026-08-01 (spec 053, Epic — Entitlement & Payments Consolidation, US2)
**Area**: `connect-four/server/paymentProcessor.js`; `connect-four/server/entitlement.js`;
`connect-four/src/lib/entitlement.js`; `connect-four/src/screens/sagaLock.js`,
`connect-four/src/screens/SagaScreen.jsx`, `connect-four/src/screens/PostSetSummaryScreen.jsx`,
`connect-four/src/screens/SettingsScreen.jsx`, `connect-four/src/components/DeepRevealPane.jsx`,
`connect-four/src/lib/useLessonLockGuard.js`

Spec-045 item 12 called for tier gates to be checked through a single server-authoritative interface.
`paymentProcessor.js`'s `getSubscriptionStatus` was an existence proof — it satisfied the
`PaymentProcessor` interface's substitutability but had no production caller — while, independently, the
app's paywall gate sites each read the client-cached tier value directly. The stale **four**-site count
recorded above was itself already wrong by the time spec 053 picked this up: a fresh grep found **five**
call sites actually deciding paid-vs-free from a cached `profile.tier` (`SettingsScreen.jsx`,
`PostSetSummaryScreen.jsx`, `SagaScreen.jsx`, `DeepRevealPane.jsx`, `useLessonLockGuard.js` — two of the
original four-site list, `sagaLock.js`/`CheckoutReturnBanner.jsx`, were not independent tier readers at
all). See OI-94 for the drift this caused and why the count needs enforcement going forward.

**Resolution**: spec 053 introduced one shared, server-authoritative computation —
`entitlementForRequest(req)` / `computeEntitlement(user)` in `connect-four/server/entitlement.js` — served
via `GET /api/user/entitlement` (documented in `docs/architecture/api-conventions.md`), and one shared
client-side cache wrapper, `getEntitlement()` in `connect-four/src/lib/entitlement.js`. All five actual
call sites were migrated onto `getEntitlement()` in the same change (T022–T026), verified by a zero-hit
grep for raw `.tier` reads at those five locations (T027). `getSubscriptionStatus` itself was **not**
deleted and remains exercised by `paymentProcessor.test.mjs`/the `PaymentProcessor` substitutability
tests — it is now documented as superseded, not removed, for production entitlement decisions
(`docs/architecture/server-conventions.md` §"PaymentProcessor Seam", FR-015).

## OI-40 — Anonymous puzzle-attempt writes fall back to a shared literal `device_uuid: 'anonymous'`, cross-contaminating unrelated anon users

**Status**: deferred / open (surfaced during Task 23 while verifying the puzzle-attempts write path ahead of fixing the `challenge-progress` read-path 401)
**Area**: `connect-four/server/index.js` (~2458), the `POST /api/user/puzzle-attempts` write path (symbol: the handler computing `deviceUuid`)

The write path already supports anonymous callers by design (`user_id: req.user?.id ?? null`, schema nullable since migration 003), but its device_uuid derivation is:

```js
const deviceUuid = req.user?.device_uuid || req.body.deviceUuid || 'anonymous';
```

The final fallback, `'anonymous'`, is a **string literal**, not a per-device identifier. Any anonymous client that omits `deviceUuid` in its request body (e.g. a stale client build, a client whose local profile hasn't generated a `device_uuid` yet, or a bug in a future caller) has its attempt rows written under that same shared literal — silently merging its puzzle-attempt history with every other anonymous caller that also fell through to the fallback. This is an access-control/data-integrity smell: the now-fixed `GET /api/user/challenge-progress` read path (Task 23) would faithfully **serve back** this cross-contaminated pool to whichever anon device happens to pass `device_uuid=anonymous` (it wouldn't, since that fails UUID validation — but any two real clients that both hit the fallback would still share one one bucket keyed by the literal, invisible to either).

**Do not fix as part of Task 23** — this is a write-path bug, independent of and out of scope for the read-path 401 fix, and deserves its own scoped change (likely: derive/require a real device_uuid client-side before this call, or reject the write with 400 when no identifier is available, rather than defaulting to a shared bucket).

**Status: ✅ RESOLVED 2026-08-02** (spec 054, Epic 4, US1). Fixed by `resolveDeviceUuid(req, res, bodyValue)` (`connect-four/server/deviceIdentity.js`), a shared helper that resolves the identifier as: caller-supplied `bodyValue` → an existing `dc4_device_uuid` cookie (`req.cookies.dc4_device_uuid`) → a freshly minted `crypto.randomUUID()`, cookied via `res.cookie('dc4_device_uuid', ..., { ...cookieOpts(), maxAge: REFRESH_TOKEN_MAX_AGE })` for stability across future requests from the same client. Wired into both write sites that used to fall back to the `'anonymous'` literal:
- `server/index.js`'s `POST /api/puzzles/:id/check` handler (the actual `puzzle_attempts` insert this issue's OI-40 area line described, mislabeled there as `/api/user/puzzle-attempts` — that endpoint, `server/userRoutes.js:343-344`, is a separate always-authenticated route and was never affected).
- `server/index.js`'s `POST /api/games` handler (`device_uuid: req.user?.id ?? resolveDeviceUuid(req, res, device_uuid)`).

`cookieOpts()`/`ACCESS_TOKEN_MAX_AGE`/`REFRESH_TOKEN_MAX_AGE` were extracted from `server/index.js` into `server/cookieConfig.js` so `deviceIdentity.js` could import the exact cookie shape without booting the server (`index.js` calls `app.listen()` at module scope). Tests: `connect-four/server/deviceIdentity.test.mjs`. DB check across local/staging/production found zero existing rows with the literal `device_uuid: 'anonymous'` in `puzzle_attempts` or `games` — no backfill/cleanup needed.

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

**UPDATE 2026-08-01**: Item 1 (real designed pricing page) has shipped — `/pricing` is now an in-app React
route (`connect-four/src/screens/PricingScreen.jsx`, registered in `src/lib/urlMapping.js`/
`src/lib/screenRegistry.jsx`) that sources every price, savings percentage, and quota figure it displays
live: `GET /api/paddle/config` (prices/savings, via `formatPrice`/`computeAnnualSavings` from
`usePaddlePrices.js`) and the new `GET /api/limits` (quota — `docs/architecture/api-conventions.md` §Public
Config/Limits). It visually and behaviorally matches the rest of the app (FR-021), has a distinct FR-022
degraded state with no purchase CTA when pricing is unavailable. Its CSP posture was confirmed via `curl`
against the production Express-served build (live prices/quota render, and the response's
`Content-Security-Policy` header already carries every directive the Paddle checkout overlay needs, with
no new origin added by this change) — **but the live-browser leg (opening the checkout overlay and reading
the DevTools CSP-violation console) has NOT been exercised**; the shared browser automation profile was
held by another live session across two QA passes (2026-08-01). This remains **NOT VERIFIED**, not a pass —
see `staging_checks.md`'s "Epic 3 — Entitlement & Payments Consolidation (spec 053)" section, T044, for the
full record and what's still outstanding. **This is a genuine fix, not a flip to
RESOLVED**, because item 2's underlying literal-drift risk is **deliberately retained** on one page: the old
static `pricing.html` is kept, byte-stable and unchanged, at the new address `/pricing-legal`
(`docs/architecture/server-conventions.md` §"`/pricing` vs `/pricing-legal`") — reachable independent of
`/pricing`'s own availability, per Paddle's requirement that a merchant-of-record/refund-policy page stay
static and JavaScript-free for a reviewer spot-check (`research.md` Decision 11,
`specs/053-entitlement-payments-consolidation/`). `/pricing-legal`'s hand-typed `$2.99`/`$21.99`/`39%`/`$1.83`
literals and its own `20`-per-week quota figure are that retained risk, kept by explicit owner decision, not
an oversight — they can still silently drift the next time a price or the quota changes, exactly as
described above, but only on that one legal-compliance page. `/pricing` itself has no such literals left
anywhere in it (FR-020/FR-026/SC-004 fully satisfied on `/pricing`).

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

**Status**: ✅ RESOLVED 2026-08-02 (spec 054, Epic 4, US2). `GET /api/games`'s three `unified.sort()`
comparators (`sortBy === 'played_well'`/`'worst_blunders'`/else) were audited and confirmed
non-unique on their primary sort key (`accuracy`/`blunder_count`/`created_at`), with the underlying
risk being the *unordered* Postgres fetch that stable-sort ties over, per research.md D2 (this is
the "audit, don't copy" case — the fix is a pure JS comparator change at the `unified.sort()` call
site, not a SQL `.order('id')` clause, since this endpoint has no SQL-level pagination at all).
Comparators extracted into `connect-four/server/gamesSort.js`
(`comparePlayedWell`/`compareWorstBlunders`/`compareRecent`), each now breaking ties with a final
`a.id`-vs-`b.id` string compare; `server/index.js` imports and calls them at the `unified.sort()`
site. Regression test: `connect-four/server/gamesSort.test.mjs` seeds tied rows across a simulated
`slice(offset, offset+limit)` page boundary and asserts every row appears exactly once, in a stable
order, across two successive pages, for all three comparators.

**If picked up**: n/a — resolved.

## OI-48 — Reason engine "Fix 6": a win-forfeiting move is still tagged `drawing_move` upstream

**Status**: ✅ RESOLVED 2026-07-30 (spec 052, Epic 1, US3)
**Area**: `connect-four/server/classifier.js` (`tagBlunder` Phase E, `classify()`), `evaluateMoveHandler.js`, `blunderReasons.js`, `src/i18n/en.json`/`es.json`
**Discovered**: reason-engine Fix-4/Fix-6 backlog (pre-2026-06-25)

**What shipped**: per `docs/architecture/reason-DECISIONS.md` D39, `tagBlunder`'s Phase E gate now
emits `direction: 'forfeited_win'` (not `'missed_own'`) when `preScore > 0 && postScore === 0` —
a forced win that was forfeited is now distinguishable, by `direction`, from a genuine best-is-a-draw
position. The live `/api/evaluate-move` path gets an independent, parallel mechanism: `classify()`
computes `bestScore` and returns `phrasePoolKey: 'forfeited_win'` under the same condition (no
`direction` field — `classify()`'s shape never carried one), and `evaluateMoveHandler.js`'s
`phrasePoolKey` derivation consults it ahead of the `category || patternTag` fallback. New
`coach.spoken.forfeited_win.*` phrase pools shipped in both `en.json`/`es.json`; a new
`'drawing_move:forfeited_win'` key was added to `blunderReasons.js`'s `REASON_TEMPLATES`. No new
`pattern_category` was minted and no migration/CHECK-constraint change was needed (`direction` is
deliberately unconstrained — verified, not assumed, at `migrations/034_blunders_direction.sql`).

**Finding A — FR-017's premise was factually wrong, recorded so it doesn't mislead a future
reader.** Re-reading the pre-change `tagBlunder` (`git show HEAD:connect-four/server/classifier.js`
at the point this fix started) shows Phase E's gate was **already** `preScore > 0 && postScore ===
0` before this epic touched anything — a genuine draw-to-draw position (`preScore === 0`) never
reached `drawing_move` at all on the stored path; it fell through to `{ tag: 'suboptimal_move',
direction: 'missed_own' }`, both before and after this change. So `'drawing_move:missed_own'` is now
a **dead key** on the stored path (kept in `REASON_TEMPLATES` only as a defensive fallback, not
deleted) — FR-017's "a genuine draw-to-draw position MUST continue to receive its current tag
unchanged" describes a `drawing_move` draw-to-draw case that never existed on that path. The one
place "unchanged for draw-to-draw" is a real, non-trivial claim is the live `classify()` fallback:
a genuine draw-to-draw live evaluation still returns plain `{ tag: 'drawing_move' }` with no
`phrasePoolKey`, confirmed unchanged. Full writeup: `docs/architecture/reason-DECISIONS.md` D39
point 6.

**Verified**: harvested boards exercised both the full live path (`POST /api/evaluate-move` →
`phrasePoolKey: 'forfeited_win'`, rendering in both `en`/`es`) and the full stored path (`tagBlunder`
→ `direction: 'forfeited_win'` persisted), plus a genuine draw-to-draw board confirming `direction`
stays `'missed_own'` and the live path does NOT divert to `'forfeited_win'` (I12: both directions
validated). `test:fast` green (only the 5 known-unrelated `ENOENT` failures).

## OI-49 — `/api/puzzles/draw` has no solved/revealed filter; `puzzle_attempts.outcome` enum is partly aspirational

**Status**: ✅ RESOLVED 2026-08-02 (spec 054, Epic 4, User Story 3, T032/T034). The open question is
answered: the never-exclude design is **deliberate and closed**, not aspirational. T032 re-confirmed
`GET /api/puzzles/draw`'s filter set is unchanged and stays exactly `.eq('category', …)`,
`.eq('is_active', true)`, `.not('position', 'is', null)`, `.order('position')` — no
`puzzle_attempts` join, no exhaustion policy, no unseen-first ordering was added by this epic. The
"partly aspirational" half is separately resolved by migration `063_puzzle_attempts_outcome_narrow.sql`
(batch 4 of this epic): `puzzle_attempts.outcome`'s CHECK constraint is narrowed from the original
five-value list to exactly `'correct_first' | 'tied' | 'incorrect' | 'abandoned'` — `'revealed'` is
dropped (no writer ever emitted it) and `'correct_retry'` is dropped (the `first_attempt_correct`
boolean column is the sole first-vs-retry signal; a correct-on-retry attempt is stored as
`'correct_first'`). `'incorrect'` replaces the previous overloaded use of `'abandoned'` for a
submitted-but-wrong answer (T029/T030), so `'abandoned'` is now reserved for leaving without
submitting. `docs/architecture/data-model.md`'s "Puzzle Attempts — `outcome` values and the serving
pool" section (T034) was rewritten to state both of these as settled facts, replacing its previous
open-question framing.
**Area**: puzzle serving (`server/index.js`'s `GET /api/puzzles/draw`) vs. `puzzle_attempts.outcome`

## OI-50 — Candidate-insert retry can double-insert rows (no unique constraint)

**Status**: ✅ RESOLVED 2026-08-02 (spec 054, Epic 4, US2). Migration
`connect-four/server/migrations/062_candidates_generation_run_unique.sql` adds
`idx_candidates_run_move_unique`, a `CREATE UNIQUE INDEX ... ON public.candidates
(generation_run_id, move_string)` (preceded by a deterministic `(created_at, ctid)`-ordered dedupe
`DELETE`, per research.md D4a — a live pre-check against local/staging/production on 2026-08-02
found 0 pre-existing duplicate groups in all three, so the dedupe deleted 0 rows when applied). The
candidate-insert retry loop's `.insert(rows)` (`server/index.js`, `POST /api/admin/generate`) was
switched to `supabase.from('candidates').upsert(rows, { onConflict: 'generation_run_id,move_string',
ignoreDuplicates: true })` (research.md D4 — a bare `.insert(rows)` retry would violate the new
unique index and fail the whole batched multi-row `INSERT` atomically on one `23505`, discarding
every good row; `upsert`/`ignoreDuplicates` makes the retry a provable no-op instead). Regression
test: `connect-four/server/candidatesUpsert.test.mjs` (DB-free source-parse: asserts migration 062
defines the unique index, and that `server/index.js` calls `.upsert(...)` with the exact
`onConflict`/`ignoreDuplicates` shape, not a bare `.insert(rows)`).

**Why previously deferred**: admin/localhost-only surface, run manually, and duplicate candidates
were self-correctable (re-run or dedupe). No user-facing impact — fixed anyway as part of spec 054's
broader retry-safety audit.

**If picked up**: the batch already carries `generation_run_id` + `move_string`, so a dedupe key exists — either add a unique index on `(generation_run_id, move_string)` and treat `23505` as success, or only retry on pre-commit error classes (connection-refused/timeout), never on an ambiguous post-send error.

## OI-51 — worktree-ports self-derive leaks `worktree-ports.sh`'s ownership-probe comments to the dev console

**Status**: ✅ RESOLVED 2026-08-02 (spec 054, Epic 4, US4, T037/T038). Both self-derive
`execSync` calls (`connect-four/vite.config.js`'s `resolvePorts()` and
`connect-four/server/index.js`'s `resolveWorktreePortEnv()`) now pass
`stdio: ['ignore', 'pipe', 'ignore']`, so only stdout (the `export KEY=value` lines) is
captured and `worktree-ports.sh`'s ownership-probe stderr is suppressed on a raw,
un-sourced invocation. Verified 2026-08-02 by real injection: `node server/index.js` run
directly (no `eval "$(...)"` sourcing) inside this linked worktree produced empty stderr
while stdout still showed `Connect4 server running on port 4509` — see `staging_checks.md`'s
"Epic 4" section.

**Area**: `connect-four/vite.config.js` (`resolvePorts()`), `connect-four/server/index.js` (`resolveWorktreePortEnv()`)

Both self-derive helpers call `execSync(scriptPath, { encoding: 'utf8' })` with no `stdio` override, so the child's stderr (the `# API_PORT=... is free/bound by pid(s): ...` ownership-probe lines `worktree-ports.sh` prints for humans running `eval "$(./worktree-ports.sh)"` interactively) is inherited by the parent and printed to the console on every raw, un-sourced `npm run dev`/`npm run vite`/`npm run server`/`node server/index.js` invocation. Harmless — stdout parsing (the actual port values) is unaffected — but it's unexpected noise the first time someone sees it.

**Why deferred**: purely cosmetic; doesn't affect correctness or the port-isolation guarantee.

**If picked up**: pass `stdio: ['ignore', 'pipe', 'ignore']` to both `execSync` calls so only stdout (the `export KEY=value` lines) is captured and stderr is suppressed during self-derive.

## OI-52 — worktree-ports self-derive silently falls back to legacy `3001`/`5173` if `worktree-ports.sh` fails

**Status**: ✅ RESOLVED 2026-08-02 (spec 054, Epic 4, US4, T039/T040). Both self-derive
consumers now detect "this is a linked worktree" via the same `GIT_DIR`/`GIT_COMMON`
check `worktree-ports.sh` itself uses (`worktree-ports.sh:15-17`), re-implemented in a
new shared, side-effect-free module `connect-four/server/worktreePorts.js`
(`detectLinkedWorktree()` + `handleSelfDeriveFailure()`) imported by both
`connect-four/vite.config.js`'s `resolvePorts()` and `connect-four/server/index.js`'s
`resolveWorktreePortEnv()`. A self-derive failure is now fatal (throws, refusing to
start) when the process is definitively inside a linked worktree; it remains the
existing silent fallback to `3001`/`5173` when the check itself throws (no `.git` at
all — e.g. the Railway build container, which must never be made fatal) or when
`GIT_DIR === GIT_COMMON` (main checkout). Regression tests:
`connect-four/server/worktreePorts.test.mjs` (decision logic, both branches, injectable
detector — no real git shelled out) and `connect-four/tests/unit/worktreePortsConsumers.test.js`
(source-parse wiring check confirming both consumers delegate to the shared module
rather than re-implementing the check). Verified 2026-08-02 by real failure injection:
temporarily removing `worktree-ports.sh` from this linked worktree and running
`node server/index.js` refused to start with a clear `Refusing to start: this is a
linked git worktree...` error; the same injection against the main checkout (broken
shebang) still fell back to `3001`/`5173` unchanged. `worktree-ports.sh` was restored
immediately after each injection (confirmed byte-identical via checksum, `git status`
clean). See `staging_checks.md`'s "Epic 4" section for the full dated record.

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

**Status: ✅ RESOLVED 2026-08-02** (spec 054, Epic 4, US1). `loadUser()` (`server/index.js`) now builds `req.user` as `{ id: data.user.id, email: data.user.email, ...profile }` (and the same for the `defaultUserProfile()` fallback branch) — exactly the fix sketched above, no new `public.users` column, `USER_PROFILE_SELECT_COLUMNS` untouched. Verified: `POST /api/paddle/create-checkout` (`server/paddleRoutes.js:50`, unchanged, already read `req.user.email`) now receives a real address — confirmed via a local harness that registers `registerPaddleRoutes` with a mock `paymentProcessor.createCheckout` and a fake `req.user.email`, logging the received `email` argument (`realuser@example.com` observed, not `undefined`). `GET /api/user/profile` (`server/userRoutes.js:109`, explicit-projection response) is unaffected — it does not spread `req.user`. Documented in `docs/architecture/api-conventions.md`'s "Auth Threading" section (`req.user` shape, including the degrades-to-`undefined` no-Supabase-email edge case).

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

**Status**: ✅ RESOLVED 2026-08-01 (spec 053, Epic — Entitlement & Payments Consolidation, US3) — the
2026-07-18 harden-direction trust model below was reviewed and explicitly ratified by the app owner as
settled policy, with both residual risks named explicitly. Closeout evidence:
`docs/architecture/server-conventions.md`'s "Identity binding on `transaction.completed` (OI-55)"
subsection now carries a dated (2026-07-31) ratification paragraph naming the two accepted residual
risks verbatim — "an attacker granting paid access to an account they don't control (at their own
financial expense)" and "laundering a chargeback-prone payment onto a third party's account" — in place
of the prior "treat this section as a proposal to sanity-check, not settled policy" language. This was a
documentation-only closure (FR-017): no code in the identity cross-check changed.
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

**Status**: ✅ RESOLVED 2026-08-02 (spec 055, Epic 8, US3, T036–T039) — the CSP gap this OI described no
longer exists; `main` and `stagging` are byte-identical on this file.

This session fixed five separate CSP gaps on the `stagging` branch (commits `2794793`, `811be2c`, `fb0ecc1`, `ae3c006`, plus the `frameSrc`/`connectSrc` additions in the earlier Paddle-checkout commit): `script-src`/`connect-src`/`frame-src` for Paddle.js + Google Pay, `style-src` for Paddle's inline styles + external stylesheet + Google Fonts' stylesheet, and a new `font-src` directive for Google Fonts' `.woff2` files. All five block real functionality (Paddle checkout, Google Pay, the app's own webfonts) when the CSP header is actually enforced (i.e., any deployed build, not `npm run dev`).

**Why originally deferred**: `main` (production, `decodec4.xyz`) is ~496 commits behind/diverged from `stagging` (per memory `project_paddle_integration` §4/§9) and this project's convention is to ship small prod-facing fixes via a fresh worktree off `origin/main`, not by merging the divergent branch. The user was offered this (a worktree-based PR carrying just the CSP diff) and explicitly declined, choosing to port the fix to `main` themselves.

**Resolution (2026-08-02, CSP gap — no code change, no worktree, no branch merge)**: `git diff origin/main
origin/stagging -- connect-four/server/index.js` returns **empty** — the whole file, including the
`helmet(...)` block, is byte-identical between the two branches today (the user's self-described manual
port, referenced above, evidently landed at some point after this OI was opened). `git log --oneline -1
ae3c006` → `ae3c006 fix(csp): allow Google Fonts stylesheet and font files`; `git merge-base --is-ancestor
ae3c006 main` exits 0 — the fix commit is an ancestor of `main`. Verified beyond the source diff (FR-013/
SC-004): ran a real `npm run build` (not `npm run dev`, which never serves CSP headers) and restarted the
server against the built `dist/`, then `curl -sD -` against the running app. The live
`Content-Security-Policy` response header carries every directive `server-conventions.md`'s "CSP Directive
Rationale" section describes as current: `font-src 'self' https://fonts.gstatic.com`, `style-src 'self'
'unsafe-inline' https://*.paddle.com https://fonts.googleapis.com`, `img-src` and `connect-src` both
carrying `https://papergames.io`, `script-src`/`frame-src` carrying the Paddle + Google Pay origins, and a
`media-src` carrying the Supabase host. No missing directive was found.

**Live production confirmed (2026-08-02)**: the local production-like build proves the *source* is correct,
but not that the deployed instance had been rebuilt since `ae3c006` landed. Checked directly —
`curl -sS -D - https://decodec4.xyz/` returns `HTTP/2 200` with a `content-security-policy` header
**identical** to the locally-built one, directive for directive, the only difference being `media-src`
pointing at the real Supabase host (`https://kxtqwsumojtexokrtlfp.supabase.co`) instead of the local
`https://127.0.0.1:54321`. So the CSP fixes are not merely on `main` — they are live in production. This
was a read-only GET against the public site; nothing was deployed or mutated.

**If picked up** (historical — kept for anyone reconstructing the target state): the `stagging`-side version
(with `PADDLE_CDN`/`PADDLE_ORIGINS`/`GOOGLE_PAY_ORIGINS`/`GOOGLE_FONTS_STYLESHEET`/`GOOGLE_FONTS_FILES`
constants and their per-directive rationale comments) was the target state — see
`docs/architecture/server-conventions.md`'s "CSP Directive Rationale" section for the current, authoritative
description of every directive and why.

**Resolved (2026-07-18)** *(unrelated to the CSP resolution above — this paragraph is entirely about the
`@paddle/paddle-node-sdk` import mechanism, not helmet/CSP; see OI-57)*: `server/index.js` now has a static top-level `import { Paddle, Environment } from '@paddle/paddle-node-sdk'`; the `if (process.env.PADDLE_API_KEY)` block only constructs `new Paddle(...)` conditionally, same as before. Boot-tested both ways: (1) with `PADDLE_API_KEY` set (`server/.env`) — server starts, `GET /api/paddle/config` returns real prices (200). (2) without it — verified by temporarily forcing the guard false in a throwaway local edit (reverted before committing) since this sandbox's environment injects a real `PADDLE_API_KEY` into every child process regardless of the `.env` file or shell overrides used, making a true "unset" boot untestable here; with the guard forced false the server still starts cleanly and `/api/paddle/config` correctly 503s ("Payments not configured"). No behavior change versus the dynamic-import version — only the import timing moved earlier.

## OI-59 — UpgradeModal didn't auto-dismiss after a real (non-simulated) staging payment

**Status**: resolved (2026-07-18)
**Area**: `connect-four/src/lib/checkoutReturnFlow.js`, all 5 `UpgradeModal` call sites

After a real sandbox test purchase completed on staging (the same purchase that finally turned Paddle's "Handle fulfillment and provisioning" onboarding step green — see memory `project_paddle_integration` §11), the upgrade modal did **not** slide away as the earlier fix in this session was built to do. The client's `POST /api/paddle/verify-transaction` call did fire and returned `{"activated":true}` — meaning `checkoutReturnFlow`'s shared store should have been set to `'activated'`, which should have flipped the subscribed screen's `uiState` prop to `'success'` and triggered `UpgradeModal`'s internal auto-dismiss effect. It did not (or if it showed "success" briefly, it never actually dismissed — this distinction was never confirmed).

**Why deferred**: the immediate follow-up investigation got derailed by an unrelated one-off "upstream error" on a reproduction attempt (traced to a transient Railway-edge issue, not this bug — see memory `project_paddle_integration` §12), and root cause was never established. Two clarifying questions were asked but never answered: (1) did the modal show the green "success" message at all before getting stuck, or did it stay on the loading/spinner state the whole time — this distinguishes "checkoutReturnFlow subscription never fired" from "auto-dismiss timer/effect itself failed"; (2) which of the 5 `UpgradeModal` call sites was in use (Settings, Set Picker, Post-Set Summary, Saga, or Deep Reveal) — Deep Reveal's `onDismiss` has an extra `onClose?.()` call the other four don't, so it's the most likely to behave differently if there's a site-specific bug.

**Root cause found (2026-07-18)**: confirmed via a screenshot of the actual stuck modal — it was frozen at its pristine pre-payment `'idle'` state (plan picker, active button), not the loading spinner or a success message. `subscribeCheckoutReturn` never replayed the *current* state to a new subscriber — it only notified listeners of *future* transitions. `useUpgradeCheckout.js`'s `checkout.completed` handler is a module-level singleton independent of which screen is mounted; if a screen's subscription effect wasn't active at the exact instant `setCheckoutReturnState('activated')` broadcast, that one-shot notification was lost forever, even though `checkoutReturnFlow`'s internal `state` variable correctly held `'activated'`. This explained the reported symptom exactly: the account correctly became Pro (the server-side tier flip via the webhook/`verifyTransaction` call is entirely independent of any UI listener), but the modal never learned about it and stayed on `'idle'` until manually dismissed.

**Fix**: `subscribeCheckoutReturn` now immediately invokes the new listener with the current state at subscribe time (closing the race), and each of the 5 call sites now calls the (renamed-to-production-use) `resetCheckoutReturnState()` after consuming a terminal `'activated'`/`'failed'` state, so the replay-on-subscribe fix doesn't leak a stale outcome into some later, unrelated modal open. Covered by 2 new regression tests in `tests/unit/checkoutReturnFlow.test.js`.

## OI-60 — `detectOvercut` taxonomy mismatch: taught gravity-top-adjacent overcut is never tagged; `active_forcing` label actually means T5

**Status**: ✅ RESOLVED 2026-07-30 (spec 052, Epic 2, US2)
**Area**: `connect-four/server/classifier.js` (`detectOvercutCore`, `detectOvercutVictim`/`Beneficiary`), `connect-four/lessons/lesson-12-overcut.json` copy, `docs/knowledge-base/community-overcut.md`/`allen-t2.md`/`allen-t4.md`/`allen-t5.md`
**Discovered**: lesson-content remediation final review (2026-07-24)

The overcut lesson teaches the gravity-top-adjacent shape (opponent threat directly under yours, immediately playable), but `detectOvercut` never tagged that case: its match required one of `isT4SameParity`/`isT5Exception`/`isT2Blocking`, and the `reason` it labeled `'active_forcing'` was in fact the T5 rows-3/6 helper (`isT5Exception` branch). So deep reveals could name shapes the lesson only covered as "family", and the label text misdescribed what matched.

**What shipped**: per `docs/architecture/reason-DECISIONS.md` D38, the misapplied `'active_forcing'` reason was renamed to `'t5_row3_row6'` on the `isT5Exception` branch (logic unchanged), and a new first-class `'active_forcing'` branch was added to `detectOvercutCore` matching `community-overcut.md`'s case (e) exactly (odd-empty-count column, mover's threat immediately above the opponent's blocked threat) — gated additionally on the actual `scores[col] > 0` since, unlike T4/T5/chain-T2, this mechanism is not a standalone theorem (the KB's own false-positive board `331324244556605142` has the identical local shape yet the mover still loses). A structurally-separate `'minor_threat'` branch (research.md Decision D2) was also added: `board.reachableThreats` only ever returned MAJOR threats, so a minor opposing threat below the mover's major threat could never be recognized as a rescue before this batch. All 5 mechanisms (minor-threat, T4, T5, chain-T2, active-forcing) now have dedicated counterexample tests through the production `detectOvercutBeneficiary` in `tests/integration/undercut_overcut.test.js`, plus both documented false positives verified to still fail to match. KB cross-references added to all four files; lesson 12's `_boardInstructions` corrected to name the current branch/function names.

## OI-61 — Challenge grader semantics: `evalUndercut` accepts losing non-killing columns; single-answer categories mark solver-tied/positive alternatives wrong

**Status**: ✅ RESOLVED 2026-07-29 (spec 051, Epic 1, US2/US4 — final closeout for item 1; item 2 was
already resolved 2026-07-28, see below). This supersedes the 2026-07-29 interim `UPDATE`.

**What shipped and where (item 1 — `evalUndercut` had no solver-verdict floor):**
- **T024** (`connect-four/server/candidate-generator.js`, `checkUndercutPredicate`): excludes any
  non-killing column that is not `isSolverSafe(col, scores)` from its `correctCols` answer set at
  generation time — previously it marked every non-killing column "correct" with no score check at
  all.
- **T025** (`connect-four/server/predicates.js`, `evalUndercut`): applies the identical
  `isSolverSafe(candidateCol, scores)` check on the grading path, independently of T024 (both were
  required — either alone leaves the other's defect live).
- Verified with a direct API call against the running local server (2026-07-29), a real active
  `undercut` puzzle row (`d22300db-3f4d-451a-9a25-7f40145ce6cb`, killing_threat col 4,
  `correct_cols [1,2,3,5,6]`): col 0 (non-killing but excluded by the floor) grades
  `accepted:false`; col 1 (in the answer set) grades `accepted:true`; col 4 (the killing column,
  raw `quality:'optimal'`) grades `accepted:false` — concretely proving the drill now grades a
  pattern-matching-but-unsafe or pattern-violating column wrong even when its raw solver quality is
  "optimal," which is exactly the defect this issue named.
- **T026/T027** — a harvested board (`333330654544210414405513`) proved both the red-first
  counterexample (a non-killing column conceding worse than the board's optimum is rejected on both
  paths) and the LOST-POSITION regression (the relative, not absolute, floor keeps a losing board's
  slowest-loss column valid).
- **Before/after pool measurement** (FR-021/FR-022): 28 active rows before the fix → 25 after (3
  newly `NO-CONCEPT`), threshold 14, no remediation required. **Post-backfill** (T048, US3, real
  `checkPredicate` run against every row): still **25 active `undercut` rows**, matching the dry-run
  prediction exactly — `pool-thresholds.md` has the full accounting.
- **T058/T060** (final audit): `audit_answer_ambiguity.mjs` reports 0 failures for `undercut` in both
  the local DB pool and lesson content.
- The sibling **overcut** Finding F1 uniqueness gap (**T032**, `checkOvercutPredicate`'s
  `correctCols.length !== 1` guard) was fixed under the identical before/after discipline; the local
  DB has zero active `overcut` rows before and after (pre-existing gap unrelated to this fix).

Item 2 (solver-tied/positive alternatives marked wrong) was already resolved 2026-07-28 via the
systematic `answerSetInvariant.js` vetting described below — unchanged by this closeout.

---

<details>
<summary>Original report + superseded interim UPDATEs (2026-07-24/28/29) — kept for history</summary>

**Original status**: deferred / open (family of grader-semantics gaps; surfaced 2026-07-24, sibling of OI-1)
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

**UPDATE 2026-07-29** (spec 051, Epic 1, US2 in progress — not fully resolved yet): item 1's
solver-verdict floor is now enforced on both paths, using the *relative* floor (`isSolverSafe`,
`answerSetInvariant.js`) rather than an absolute one — this is exactly what keeps the exemption
above meaningful rather than removing it:

- **T024** (generation path): `checkUndercutPredicate` (`candidate-generator.js`) now excludes any
  non-killing column that is not `isSolverSafe(col, scores)` from its `correctCols` answer set —
  previously it marked every non-killing column "correct" with no score check at all.
- **T025** (grading path): `evalUndercut` (`predicates.js`) applies the identical
  `isSolverSafe(candidateCol, scores)` check before returning `'correct'` — independently of T024;
  both were required, since either alone leaves the other's defect live.
- **T026** (red-first counterexample): a harvested, solver-verified board
  (`333330654544210414405513`, `tests/integration/undercut_overcut.test.js`) has a non-killing
  column (col 5, score -8) that concedes strictly worse than the board's own optimum (cols 0/1/2,
  score -6) — confirmed to fail for the right reason on the pre-fix code (via `git stash`), and to
  pass after T024/T025.
- **T027** (LOST-POSITION exemption verified to survive): the same board is a genuine
  fully-lost position (every legal column negative) where a non-killing column (col 0) is among
  the slowest losses (tied-optimal at -6) — both `checkUndercutPredicate` and `evalUndercut` still
  accept it, proving the relative floor (not an absolute `scores[C] > 0` floor) is what shipped.
- **Before/after pool measurement** (FR-021/FR-022, via `audit_answer_ambiguity.mjs --puzzles
  undercut --env local`, pre-backfill dry run): 28 active rows before the fix (all passing,
  21 LOST-POSITION + 7 OK, as expected of the unfixed code); 25 passing after (18 LOST-POSITION +
  7 OK), 3 newly `NO-CONCEPT` (their entire non-killing answer set collapsed under the floor).
  Threshold set at 14 (50% of the pre-fix pool) — 25 ≥ 14, so **no remediation was required**.
  Full data persisted at `specs/051-pattern-acceptance/pool-thresholds.md`.
- The sibling **overcut** Finding F1 uniqueness gap (a board with 2+ structurally valid overcut
  columns silently entering the pool with only the first recorded) was fixed in the same batch
  (T032, `checkOvercutPredicate`'s `correctCols.length !== 1` guard) under the identical
  before/after discipline — the local DB has **zero** active `overcut` rows before and after
  (a pre-existing gap unrelated to this fix; see `pool-thresholds.md` for detail).

**Superseded 2026-07-29**: see the ✅ RESOLVED closeout at the top of this entry (T065) — the
post-backfill DB audit referenced below has run clean.

</details>

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

**Status**: ✅ RESOLVED 2026-08-01 (spec 053, Epic — Entitlement & Payments Consolidation, US1)
**Area**: `connect-four/server` lesson routes, `src/lib/useLessonLockGuard.js`, `src/screens/sagaLock.js`
**Discovered**: browser QA of the remediated lessons (2026-07-25), documented in PR #19

A free or anonymous caller could fetch a **paid** lesson's full JSON — slides, prose, socratic answer —
directly from `GET /api/lessons/:id`. The paywall was enforced in the client only.

PR #19 added `useLessonLockGuard` so a paid lesson could no longer be opened *or completed* through a
direct URL like `/clchallenge/undercut` (previously it could, leaving "✓ Completed" beside still-locked
free lessons). That closed the **UI** hole; the endpoint itself remained untouched, so `curl` still
returned paid content. With the tier split now at free 1–10 / paid 11–15, five lessons were exposed this
way.

**Resolution**: `GET /api/lessons/:id` (`connect-four/server/index.js`) now computes entitlement via
`entitlementForRequest(req)` (`connect-four/server/entitlement.js`) and builds the response through
`buildLessonResponse(lesson, entitlement)` (`connect-four/server/lessonEntitlement.js`) before responding.
A free lesson, or a paid lesson requested by an entitled (paid-tier, signed-in) caller, still returns the
full lesson unchanged. Any other caller requesting a paid lesson gets a redacted `200` stub — exactly
`{ id, title, order, free, locked: true }`, with `slides` absent (not `null`/`[]`) — so metadata (title,
`free`, `order`) stays public for the saga list while no lesson content leaves the server. Documented in
`docs/architecture/api-conventions.md` §"Lessons Endpoints". The three real client consumers
(`ConceptScreen.jsx`, `SocraticScreen.jsx`, `CLChallengeScreen.jsx`'s cold-boot fetch) all check
`locked === true` before touching any now-absent field and redirect through the same
`useLessonLockGuard`/`SagaScreen` upgrade-prompt affordance already used for a client-side block. Covered
by `connect-four/tests/unit/entitlement.test.js`, `tests/unit/lessonEntitlement.test.js`,
`tests/integration/lessonEntitlementGate.test.js`, and
`tests/dom/{ConceptScreenLocked,SocraticScreenLocked,CLChallengeScreenLocked}.dom.test.jsx`.

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

**Status**: ✅ RESOLVED in spec `055` (T005-T020, 2026-08-02) — the eslint config was split by
environment (browser for `src/`; node for `server/`+`scripts/`; node for `tests/`; node+browser
merged for `tests/dom/`; two explicit catch-all blocks for `vite.config.js`/`eslint.config.js` and
`public/sw.js`), with all globs widened to include `.mjs`/`.cjs` (T005-T008). A fresh re-measurement
against the new config (T009) fed a triage pass (T010-T015) that cleared every error, demoting the
remaining `react-hooks/*`/`react-refresh/*` findings to `warn` (tracked separately as OI-119) rather
than fixing them as a UI-behavior change. Confirmed by direct command execution: `cd connect-four &&
npm run lint` now exits 0 — `✖ 47 problems (0 errors, 47 warnings)` (T016). The gate was proven real,
not just a walked glob: inserting `const unusedProbe = 1;` into a `.mjs` file made lint fail with
`'unusedProbe' is assigned a value but never used. Allowed unused vars must match /^[A-Z_]/u
no-unused-vars`, then reverting brought it back to the same 0-errors/47-warnings result (T017). Lint
is now wired into both `npm run test:fast` (prefixed as `eslint . && `, T018) and `.githooks/pre-commit`
(a new leading block before `sync-kb.mjs`, T019); T020 proved both gates go red on the same
`unusedProbe` fixture and revert cleanly.

**If picked up**: OI-119 tracks burning down the demoted `react-hooks/*`/`react-refresh/*` warnings.

## OI-71 — Removing the `windowCounts` empty-cell guard hangs `test:dom` instead of failing it

**Status**: ✅ RESOLVED (Epic 8, spec 055, US2 T022–T025) — bisected and fixed, not just a
workaround. `git diff connect-four/src/components/Board.jsx` is empty (the diagnostic mutation used
to reproduce the hang was reverted after the fix landed).
**Area**: `connect-four/src/components/Board.jsx` (windowCounts render block), `connect-four/tests/dom/BoardWindowCounts.dom.test.jsx`

Root cause (confirmed by bisection, NOT the unverified jsdom/testing-library suspicion originally
recorded below): the hang was never in jsdom's query implementation, `Board.jsx`'s render, or an
infinite loop. It was `assert.equal`/`assert.strictEqual` being called with a **live mounted DOM
node as the actual operand** (e.g. `assert.equal(screen.queryByText('99'), null)`). When such an
assertion legitimately fails, Node's `util.inspect` tries to format the failure diff by walking the
matched DOM node — which holds circular back-references into the React Fiber tree (including `Error`
objects with full stack traces via `_debugStack`) plus jsdom's getter-heavy prototype chain.
Formatting that graph is unboundedly expensive: measured at 30s+ and never returning, versus **~18ms**
for the equivalent boolean comparison (e.g. `assert.equal(screen.queryByText('99') === null, true)`).
The fix converts every such assertion to compare a derived primitive instead of a raw DOM/React node,
applied across **all 19 sites** of this pattern in the DOM suite, not only the one that originally
hung. See `connect-four/tests/dom/BoardWindowCounts.dom.test.jsx`'s
`'Board never renders a digit on an occupied cell...'` test for the proven repro and the converted
assertion.

Originally observed while mutation-proving the fix for the untested `value === 'empty'` guard —
deleting that half of the condition made `npm run test:dom` hang (~32s, no clean assertion failure)
instead of failing fast. It now fails fast (~18ms) under the same mutation, confirmed by the
bisection above.

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

**Status**: ✅ RESOLVED 2026-07-30 (spec 052 Epic 1 US1)
**Area**: `connect-four/server/classifier.js`, `docs/architecture/server-conventions.md` § "Undercut
has two sides", `docs/architecture/reason-DECISIONS.md` D37

**Resolution**: applied the OI-74 role-split shape (see below), same as undercut. `detectOvercut`'s
`perspective` param is gone; it is replaced by `detectOvercutBeneficiary` (`scores[C] > 0`, rescued)
and `detectOvercutVictim` (`scores[C] < 0`, not rescued) over a shared `detectOvercutCore`. Unlike
undercut, cell ownership does **not** swap between the two roles: the mover always owns the upper
threat, the opponent always owns the lower one — only the rescue-boolean and score gate differ.
`classifyPattern`'s `'overcut'` Phase-C entry now calls `detectOvercutVictim` (the post-move board's
mover is the opponent of the blunderer, so Victim correctly reports the blunderer as holding the
killing threat — see D37); `candidate-generator.js#checkOvercutPredicate` calls
`detectOvercutBeneficiary` (the puzzle's own solver-side mover benefits directly).

**Verified**: a Phase-C-level regression (not a bare unit test) in
`tests/integration/undercut_overcut.test.js` (`tagBlunder Phase C — overcut cells belong to the
blunderer`) runs the full `tagBlunder` pipeline on harvested board
`33341302254244423366` (blunderer plays col 5 instead of col 6) and asserts the killing-threat cell
belongs to the blunderer's own `reachableThreats`, not the opponent's. `test:fast` green (only the 5
known-unrelated `ENOENT` failures on gitignored coverage corpora). The two pre-existing
`overcut`-tagged fixture rows in `tests/blunder/fixtures/tagBlunderFixtures.json` were re-derived and
individually reviewed: both were OI-76 false positives (the old `detectOvercut` mixed the blunderer's
threats with the opponent's score sign) and now correctly fall through to `suboptimal_move`
(confirmed via direct `tagBlunder` calls: both boards now return `reason: 'no pattern detected'`);
two new sound `overcut` rows appeared in their place (games 6 and 30), each independently checked
against `./visualize_board.sh` and `reachableThreats` — the killing_threat cell belongs to the
blunderer in both.

Re-measured the live `overcut` puzzle/candidate pool against the current DB (not assumed from the
prior zero measurement): **local** 0 active puzzles / 0 approved candidates (30 pending); **staging**
10 active puzzles + 10 approved candidates (20 rows); **production** 11 active puzzles + 11 approved
candidates (22 rows) — 42 live rows total, all reachable. Re-derived `highlight_metadata` for every
one of the 42 under `detectOvercutBeneficiary` (the puzzle-pool path): all 42 re-derive
byte-identical `highlight_metadata` (JSONB key-order normalized) and the predicate still passes for
every row — **the pool needed no repair**. This is expected: the candidate-generation path already
used the Beneficiary role/gate before this fix; OI-76's unsoundness only manifested at the
`classifyPattern`/`tagBlunder` (Victim) call site, which does not persist rows to the DB.

**Original report follows, preserved for context:**

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

**Re-verified 2026-08-02 (Epic 8 spec 055 closeout audit T046, expected no-op check):** status is not
stale. `src/screens/ConceptScreen.jsx:7,289` — `import { InfoProsePanel } from
'../components/InfoProsePanel.jsx';` and `<InfoProsePanel infoProse={slide.infoProse} />` — confirms
`ConceptScreen` still delegates exactly as described; `tests/dom/InfoProsePanel.dom.test.jsx` still
exists.

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

**Status**: ✅ RESOLVED 2026-07-29 (spec 051, Epic 1, US1/US4 — final closeout, supersedes the
2026-07-29 interim `UPDATE` below). The single-answer model was chosen and shipped: `odd_even_threat`
is now a graded category end to end.

**What shipped and where:**
- **T005** (`connect-four/server/predicates.js`) fixed the dispatch bug — `evaluatePredicate`'s
  `odd_even_threat` case now passes `scores` through to `evalOddEvenThreat(candidateCol, puzzle,
  scores)` (previously silently dropped even though already in scope at the call site), and
  `evalOddEvenThreat` grades by set membership against `detectOddEvenThreat`'s `correctCols` rather
  than scalar equality.
- **T006/T007** added `'odd_even_threat'` to `SINGLE_ANSWER_CATEGORIES` in both
  `server/categories.js` and the hand-mirrored `src/lib/categories.js` — `ChallengeScreen.jsx`'s
  `usesAcceptedGate` now includes it, so grading uses `data.accepted` (from `evaluatePredicate`), not
  raw solver score. Verified with a direct API call against the running local server (2026-07-29):
  board `33330256555322322` (scores `[4,4,4,-1000,4,4,4]`, taught col 2) — playing col 0 (tied-max
  solver score, does NOT satisfy the pattern) grades `accepted:false`; playing col 2 (taught,
  pattern-satisfying) grades `accepted:true`. This is the concrete proof the drill now grades against
  the taught pattern, not raw score — the exact defect this issue named.
- **T009/T010** — lesson-07's two boards (`3553515566110063` cc 3, `3411022114433433` cc 2) still
  pass `tests/lessons/lessonAnswerSets.test.js`; `tests/predicates/fixtures/fixtures.json` gained the
  category's first fixtures (previously zero): a 3-independently-qualifying-column board and a
  floor-violating rejection.
- **T058/T060** (US3/US4 final audit): `audit_answer_ambiguity.mjs` reports 0 failures for
  `odd_even_threat` in both the lesson content (39/39 OK) and the local DB pool (0 active rows —
  pre-existing, unrelated to this fix; see `pool-thresholds.md`/OI-83 for the local pool's overall
  state).

**Known caveat, tracked separately**: the local DB currently has 0 active `odd_even_threat` puzzle
rows, so this category is only reachable through the live app via the DEV board injector, not a real
puzzle drill — and the DEV board injector currently 404s at grading time for an unrelated reason (a
regression this same feature's T054/T051 introduced for any non-DB-row `puzzleId`, filed as
**OI-84**). OI-75 itself — "is `odd_even_threat` graded against its taught pattern" — is resolved and
verified per the API-level proof above; OI-84 is what blocks exercising it end-to-end through
`ChallengeScreen` today.

---

<details>
<summary>Original report + superseded interim UPDATE (2026-07-28/29) — kept for history</summary>

**Original status**: open — latent, currently masked (observed 2026-07-28)
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

**UPDATE 2026-07-29** (spec 051, Epic 1, US1 in progress — not fully resolved yet): the
single-answer model was chosen and shipped. `odd_even_threat` is now a graded category:

- T005 fixed the actual dispatch bug — `evaluatePredicate`'s `odd_even_threat` case now passes
  `scores` through to `evalOddEvenThreat(candidateCol, puzzle, scores)` (it was silently dropped
  before, even though already in scope at the call site), and `evalOddEvenThreat` grades by set
  membership against `detectOddEvenThreat`'s own `correctCols` (recomputed live — cheap,
  synchronous, no async/solver cost) rather than equality against the stored scalar.
- T006/T007 added `'odd_even_threat'` to `SINGLE_ANSWER_CATEGORIES` in both `server/categories.js`
  and the hand-mirrored `src/lib/categories.js` — this closes the exact gap this issue named
  (`ChallengeScreen.jsx`'s `usesAcceptedGate` now includes it, so grading uses `data.accepted`
  from `evaluatePredicate`, not raw solver score).
- T009 confirmed lesson-07's two boards (`3553515566110063` correct col 3,
  `3411022114433433` correct col 2) still pass `tests/lessons/lessonAnswerSets.test.js` in full
  after the dispatch fix — the "masked by luck" scenario this issue described no longer matters,
  because the drill is now actually graded against the taught concept, not just solver score.
- T010 added the first `odd_even_threat` fixtures to `tests/predicates/fixtures/fixtures.json`
  (previously zero), covering a harvested 3-independently-qualifying-column board and a
  floor-violating board rejected under the shared `isSolverSafe` invariant.

**Superseded 2026-07-29**: see the ✅ RESOLVED closeout at the top of this entry (T065) — the
post-backfill DB audit referenced below has run clean.

</details>

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

## OI-81 — Retire the legacy `correct_col` scalar once `correct_cols` is the source of truth (105 refs / 22 files)

**Status**: open — deferred, split out of spec 051 by owner decision (2026-07-29)
**Area**: `connect-four/server/` (22 files below), `connect-four/src/`, `connect-four/tests/`, `connect-four/scripts/`

Spec 051 (`specs/051-pattern-acceptance/`, Epic 1) introduces `correct_cols integer[]` on `puzzles` and
`candidates` as the solver-gated, set-valued answer computed once at generation time. The original plan for
that spec ("Decision B") was to migrate every remaining consumer off the legacy scalar `correct_col` and
then drop the column in the same feature. The owner reversed that decision on 2026-07-29: the consumer
inventory, once actually re-derived against this worktree, came back at **105 references across 22 files** —
not the "62 references across 11 files" estimate the original decision had been made on — and that scope
sits on top of an already-large feature (schema migration + backfill + API contract change). The retirement
is now split out into its own separate future epic. Spec 051 instead **keeps `correct_col` and maintains it
in sync** as `correct_cols[0]` (FR-017/FR-019) for the duration of that feature.

This entry preserves the inventory work — genuinely valuable, and expensive to re-derive — so it isn't lost.
**Spec-ready home**: this issue is the seed for `docs/epics/open-issues-epics.md` **Epic 9 — Legacy
`correct_col` Scalar Retirement**, which carries the full inventory table, the migration plan, and the
sized user stories. Read Epic 9 before picking this up — it is the canonical work breakdown; this entry is
the issue record it cites.

**What the work is**: retire the legacy `puzzles`/`candidates` scalar column `correct_col` now that
`correct_cols` is the computed-once, solver-gated source of truth. Concretely: migrate every call site
(105 references across 22 files, re-derived 2026-07-29 — full table in Epic 9) off the scalar (DB column and
its camelCase API/object mirror `correctCol`, where it refers to this same puzzle/candidate scalar), then
drop the column via a migration sequenced strictly after every consumer has migrated.

**Why it was deferred**: split out of spec 051 by owner decision on 2026-07-29, after the inventory came
back at 105 references across 22 files — substantially larger than the ~62/11 estimate the original
"migrate and drop in the same feature" decision was made on.

**Critical carve-out — do not naively rewrite by substring**: camelCase `correctCol` is overloaded. It also
names an authored **lesson-JSON** field (`server/lessonLoader.js`, `server/scripts/verify_lesson_content.mjs`)
used by Socratic/confirmation-challenge nodes (e.g. `SocraticScreen.jsx`'s `col === socratic.correctCol`
client-side check — memory `project_lesson_interactivity_evaluation`) that has **nothing to do** with the
`puzzles`/`candidates` table. A naive migration that rewrites every `correctCol` occurrence would wrongly
touch lesson content that was never the scalar this issue is about. The snake_case `correct_col` (DB column)
is the unambiguous form; camelCase call sites must be triaged individually (see Epic 9's inventory).

**Sequencing constraint**: the column-drop migration MUST land strictly after every consumer has migrated to
`correct_cols` — dropping the column while a consumer still reads it produces a silent runtime failure, not
a migration error. The drop migration's number cannot be reserved in advance.

**If picked up**: work this via Epic 9 (`docs/epics/open-issues-epics.md`), not standalone — its inventory
will need re-deriving fresh against the worktree at pickup time (it will have drifted). Related: spec 051
(`specs/051-pattern-acceptance/`, FR-017/FR-019).

---

## OI-82 — `npm run test:fast` baseline is RED on `main`: 5 pre-existing failures, 2 of them a stale fixture path

**Status**: open — measured 2026-07-29 on `feature/finish-lessons` and reproduced identically in the
main checkout, so it is not branch-local
**Area**: `connect-four/server/tests/` — `renderCoverageCorpus.test.mjs`, `renderCoverageUniverse.test.mjs`,
`branchInvariance.test.mjs`, `causalLinksComposers.test.mjs`, `reasonRenderFixes.test.mjs`

`npm run test:fast` reports **1479 pass / 5 fail**. All five fail in the main checkout too — a fresh
worktree inherits them, where they read as damage the new work caused.

**Two have a diagnosed root cause — a stale fixture path.** Both tests build their corpus path as
`../scripts/reason_evidence_boards_coverage_<ts>.jsonl` relative to `server/tests/`:

```js
const CORPUS = join(__dirname, '../scripts/reason_evidence_boards_coverage_2026-07-02T11-37-56Z.jsonl');
```

Nothing matching `reason_evidence_boards_coverage_*.jsonl` exists at `server/scripts/`. The coverage
corpora live one directory deeper, under `server/scripts/fv_suff/`. So both tests die at
`readFileSync` with `ENOENT` before asserting anything — they are not failing, they are not running.
`renderCoverageUniverse` wants the `2026-07-03T17-14-51Z` set, `renderCoverageCorpus` the
`2026-07-02T11-37-56Z` set; `git ls-files` shows both timestamps present under `fv_suff/` as
`boards_coverage_<ts>.jsonl` (note: also without the `reason_evidence_` prefix, so the fix is both a
directory and a filename correction — confirm which artifact each test actually wants before editing).

**The other three are undiagnosed.** `branchInvariance`, `causalLinksComposers` and `reasonRenderFixes`
fail at the file level (whole-file failures, not individual assertions). Not investigated — they were
out of scope for the session that found them.

**Update (spec 051 / Epic 5, 2026-07-30 — independently filed and folded in here on merge).** A second
session hit the same five tests and reports that **all five**, not just two, die at the same `ENOENT`:
each builds its corpus path as `join(__dirname, '../scripts/reason_evidence_boards_coverage_<ts>.jsonl')`
while the corpora live one directory deeper under `server/scripts/fv_suff/`. If that holds, the "other
three" are the same path bug rather than three separate defects — confirm before splitting the work.

That session also stressed *why this is worse than five red tests*: these are the render-coverage and
branch-invariance guards for the blunder-`reason` engine, and because the failure is a file-open, the
coverage walk never executes — they currently assert **nothing**, so any reason-engine regression they
were written to catch ships undetected. A permanently-red baseline also trains every agent and human to
read "5 failures" as normal (spec 051's own `tasks.md` T002/T057 mis-recorded the count as *two*).

**Do not just make the tests green.** After fixing the path, confirm each of the five actually exercises
its assertions and would go RED on a real violation — a test that has never run once is not known to
work. Read `docs/architecture/reason-INVARIANTS.md` (esp. I12) and `reason-DECISIONS.md` before touching
anything under `reason_engine/`. Related: OI-106 (another test registered nowhere / running nowhere —
the same class of silently-absent coverage).

**Why deferred**: surfaced while baselining a worktree for spec 051 (Epic 1); none of the five touches
that feature's surface, so fixing them was out of scope and would have muddied the diff.

**Cost of leaving it**: `test:fast` cannot be used as a clean gate. Every plan in this repo now has to
carry the "these 5 and only these 5 may fail" phrasing instead of "all tests pass" (spec 051's plan and
tasks both do), and a genuine sixth failure is easy to lose in the noise.

**If picked up**: fix the two path bugs first — they are cheap and restore two real coverage gates that
have silently not been running. Then diagnose the remaining three. Verify with
`cd connect-four && npm run test:fast` from the **main checkout**, not a worktree, so an inherited
gitignored-file problem is not mistaken for a code one.

## OI-83 — Backfilling `correct_cols` with real solver scores retires the only `forced_win` puzzle (AMBIGUOUS, tied win column not detected)

**Status**: open — surfaced by the spec 051 (Epic 1, US3) real backfill run, 2026-07-29
**Area**: `connect-four/server/candidate-generator.js` (`checkForcedWinPredicate`), `puzzles` table (`forced_win` category)

Running `server/scripts/backfill-correct-cols.mjs --env local` (T048) against the local DB
recomputed `correct_cols` for every active `puzzles`/`candidates` row via `checkPredicate` with
fresh `solver.query(move_string)` scores (FR-015 — the same detection path fresh generation
uses). The single active `forced_win` puzzle
(`ea8d1739-8a69-45a6-964f-edd1b15ecf40`, board `33343033224450611655500550011116`) was
**deactivated** (FR-016b) as a result: `checkForcedWinPredicate` only detects the forced-win
trace through column 6 (0-indexed), storing `correct_cols: [6]`, but the position's solver
scores show column 2 (0-indexed) is an independently-winning (tied-score) column too —
`checkPredicate`'s `answerSetHolds` guard now correctly classifies this `AMBIGUOUS` (a
solver-optimal column, col 2, is not in the accepted set) and rejects it. This is a genuine
pre-existing content defect the tightened invariant exposes, not a bug in the backfill script:
`checkForcedWinPredicate` finds *a* forced-win trace but does not check whether other legal
columns are *also* outright wins.

**Net effect**: the local `puzzles` table now has **zero** active `forced_win` rows (was 1
before the backfill). No FR-022/FR-022a-style threshold was ever established for `forced_win`
(pool-thresholds.md only measured `undercut`/`overcut`), so this was not in scope for spec 051's
T049 replace-not-exempt remediation step, and doing so was explicitly out of scope for that task
(no threshold to check against, and inventing one there would have contradicted Decision D4 —
"thresholds are set from measured data, not invented in advance").

**Why deferred**: fixing `checkForcedWinPredicate` to detect ties (or generating a fresh
solver-verified `forced_win` replacement board) is real work, orthogonal to the backfill script
itself, and forced_win already had only 1 active row (a marginal category) before this was found.

**If picked up**: either (a) widen `checkForcedWinPredicate` to include every column whose score
ties the maximum (mirroring how `evaluatePredicate` already treats ties for
`immediate_threat`/`forced_block`/`double_threat` — see `candidate-generator.js:556-559`'s
`'tied'` handling), or (b) run `node server/scripts/audit_answer_ambiguity.mjs --repair --yes
--puzzles forced_win --env local` to retire-and-replace with a fresh solver-verified board
(`repairPuzzles` can use the retired row as its template — its own `.select(...)` has no
`is_active` filter). Either way, re-run `audit_answer_ambiguity.mjs --puzzles forced_win --env
local` afterward to confirm `OK`.

## OI-84 — Every lesson confirmation-challenge and DEV-board Challenge play now 404s silently (T054's unconditional `puzzleId` + T051's hard 404-on-miss)

**Status**: ✅ **RESOLVED 2026-07-29** — fixed in the same change that introduced it (see
"What shipped" at the end of this entry). Kept in full because the diagnosis documents a real
seam-failure mode between the client's id minting and the server's stored-set lookup.

*Original status when filed*: open — SEVERE regression, surfaced by spec 051 (Epic 1) US4 T064
browser QA, 2026-07-29. Recommended treating as release-blocking for this feature.
**Area**: `connect-four/src/screens/ChallengeScreen.jsx` (`handleColumnClick`, sends
`puzzleId: current.id` unconditionally), `connect-four/server/evaluateMoveHandler.js` (the T051
stored-set branch: `if (!puzzle) return res.status(404)...`)
**Discovered**: spec 051 US4 T064 manual/browser verification (2026-07-29)

Spec 051's T054 added `puzzleId: current.id` to **every** `/api/evaluate-move` request
`ChallengeScreen.jsx` sends (`handleColumnClick`, ~line 271) — unconditionally, for every code path
that sets `current` (`loadPuzzles`): the real pool draw (`GET /api/puzzles/draw`, real DB uuid),
the lesson-embedded `confirmationChallenges` branch (`id: ch.puzzleId || 'inline-${ch.moveString}'`),
and the DEV board injector (`id: 'dev-${movestring}'`, `devFixtures.js#buildDevPuzzle`). T051's
stored-set branch (`evaluateMoveHandler.js`) then does `.eq('id', puzzleId).single()` and, on a
lookup miss (`data` is `null`), returns a hard `404 { error: 'puzzle not found' }` — there is no
fallback to the computed-live branch for "row not found," only for "row found but `correct_cols`
IS NULL" (FR-024a). The two misses are NOT the same thing, but T051 only handles one of them.

**Confirmed live, three ways (2026-07-29):**
1. **All 24 lesson confirmation-challenge `puzzleId`s, across all 15 lessons, are absent from the
   local `puzzles` table** (`SELECT id FROM puzzles WHERE id IN (<the 24 ids>)` → 0 rows — verified
   both against `is_active` and without that filter). These ids are analytics-only identifiers
   authored into the lesson JSON (`lessons/*.json`), never rows in `puzzles`/`candidates` — grepping
   both tables for two sample ids (`0eb165aa-...`, `25bb4952-...`) confirms zero matches anywhere.
2. **Reproduced via `curl`** against the running local server: the exact request body
   `ChallengeScreen.jsx` would send for lesson-02's first confirmation challenge
   (`movestring: '34133344142', puzzleId: '0eb165aa-2235-4e84-9577-aa03769cb951', ...`) returns
   `404 {"error":"puzzle not found"}`.
3. **Reproduced via a real browser** (chrome-devtools over CDP, fresh anonymous profile): navigating
   to `/challenge/undercut?devBoard=...` (the DEV board injector, used because the local pool has
   0 active `odd_even_threat`/`overcut` rows) and to `/challenge/odd_even_threat?devBoard=...`, then
   clicking a column, both times produced a real `POST /api/evaluate-move` with a `dev-<movestring>`
   `puzzleId` and a genuine `404` response (captured via `Network.responseReceived`). The UI does
   **not** surface this as an error — `setPhase('post-move')` already ran (commit-first, FR-017) and
   the fetch's rejection is swallowed by `.catch(err => console.error(...))`, so the learner sees the
   move committed and a "Next →" button, but **no grading feedback at all**: no correct/wrong
   indicator, no coach reaction. This is a silent failure, not a visible one.

**By contrast**, a real pool-drawn puzzle (`/challenge/immediate_threat`, a genuine DB uuid
`puzzleId`) works end-to-end in the same browser session: `200`, correct `accepted`/`quality`
grading, real coach feedback, and (confirmed) no `correct_cols` field in the response — the
stored-set branch itself (T050–T052) is sound; only the "row not found" edge is broken.

**Net effect**: SC-003 ("identical accept/reject outcomes… across all 39 lesson boards") is
currently **violated** for the subset of lesson content delivered via `ChallengeScreen`'s
`confirmationChallenges` mechanism (at least lessons 01, 02, 06, 08 — likely all 15, since 24/24
sampled ids miss). `tests/lessons/lessonAnswerSets.test.js` (T059) does not catch this because it is
a pure-function test of the predicate/invariant layer, never an HTTP call through
`evaluateMoveHandler.js` with a lesson-shaped `puzzleId`; `tests/integration/
evaluateMoveMultiSolution.test.js` (T053) does not catch it either because its fixtures never send a
`puzzleId` at all. There is no existing automated test that sends a `puzzleId` which fails to
resolve to a row.

**Why not fixed in this batch**: T051's "404 if not found" was a deliberate, already-shipped US3
decision (Blocking #3c / FR-024), and T054 (also already shipped) is what turned every request into
one that exercises it. Changing either is a code change to a prior, verified-complete batch, outside
this batch's assigned scope (T059–T065, verification/closeout only) — flagged here per instruction
rather than patched silently.

**If picked up**: the fix almost certainly belongs in `evaluateMoveHandler.js`, not `ChallengeScreen.jsx`
— treat "puzzleId present but no row found" the same as "row found but `correct_cols` IS NULL"
(FR-024a): fall through to the computed-live branch using the request body's own
`movestring`/`category`/`correctCol`/`highlightMetadata` (which the lesson-embedded and DEV-board
requests already carry in full) instead of hard-404ing. This is a one-branch change, keeps the real
stored-set path (genuine DB uuid → 404 on a truly bad id, e.g. a stale/deleted puzzle) meaningfully
distinct from "this was never a DB row at all," and directly restores FR-025/SC-003's guarantee.
Add a regression test alongside `tests/integration/evaluateMoveStoredSet.test.js` sending a
`puzzleId` that resolves to zero rows, asserting a graded response (not a 404) that matches what the
same request would grade with no `puzzleId` at all.

### What shipped (2026-07-29) — fixed both halves of the seam

The recommendation above was followed, plus a client-side guard so the two defects are fixed
independently rather than relying on one of them:

1. **Server (`connect-four/server/evaluateMoveHandler.js`)** — a `puzzleId` that resolves to no
   active row now logs `console.warn('[evaluate-move] puzzleId … did not resolve …')` and **falls
   through to the computed-live branch**, instead of `404`-ing. The NULL-`correct_cols` fallback's
   row-sourced reassignment is guarded on `puzzle` being non-null, so when there is no row the
   request body's own fields stand — which is exactly the pre-existing computed-live input shape a
   lesson inline challenge already sends. This is a deliberate revision of T051's original
   "404 if not found" instruction, on FR-024a's own fail-open reasoning; documented as such in
   `docs/architecture/api-conventions.md` §"Grading branches".
2. **Client (`connect-four/src/lib/syntheticPuzzleId.js`, new + `ChallengeScreen.jsx`)** —
   `isSyntheticPuzzleId(id)` returns true for the two id shapes this screen mints for row-less
   boards (`dev-…` from `buildDevPuzzle`, `inline-…` from a lesson challenge with no authored
   `puzzleId`) and for a nullish id. The request body now spreads `puzzleId` in only when the id is
   **not** synthetic, so these boards route to the computed-live branch by omission — the branch
   they were always supposed to use (FR-025). Mirrors the existing `dev-` guard already present on
   `recordPuzzleAttempt` in the same file. Lives in `src/lib/` rather than in the component so it
   stays unit-testable without tripping `react-refresh/only-export-components`.

**Note on the authored lesson ids**: fix (2) does *not* cover them — the 24 lesson
confirmation-challenge `puzzleId`s are real-looking uuids, not `inline-`-prefixed, so the client
still sends them. Fix (1) is what makes them grade correctly, and is why both halves were needed.
Whether those 24 authored ids should exist at all (they resolve to zero rows and are analytics-only)
is a separate lesson-content question, not a grading defect any more.

**Tests**: `tests/integration/evaluateMoveStoredSet.test.js` case (c) was rewritten from asserting
`404 { error: 'puzzle not found' }` to asserting a graded `200` with no leaked `correct_cols` — the
old assertion encoded the defective contract. New `tests/unit/syntheticPuzzleId.test.js` (6 tests)
covers both synthetic prefixes, nullish ids, a real uuid, mid-string prefix near-misses, and a
non-string id. Registered in **both** `test` and `test:fast`. Full suite: 1544 pass / 5 fail (the
5 pre-existing reason-engine failures of OI-82, unchanged).

---

## OI-85 — Lesson `confirmationChallenges[].puzzleId` values resolve to no row, so every lesson challenge grades via the fall-through path and logs a warning

**Status**: ✅ **RESOLVED 2026-07-30** (owner decision: "lessons should not use the puzzle id at any
place, since the whole puzzle is inside the lesson"). Remediation (b) below was taken — see
"What shipped" at the end. Kept in full because the analysis explains why the authored ids exist.

*Original status when filed*: deferred (content/data cleanup, not a grading defect)
**Area**: `connect-four/src/lessons/*.json` (`confirmationChallenges[].puzzleId`),
`connect-four/src/screens/ChallengeScreen.jsx`, `connect-four/server/evaluateMoveHandler.js`
**Discovered**: spec 051 (Epic 1) browser QA, 2026-07-29

Every authored `confirmationChallenges[].puzzleId` in the lesson JSON references a `puzzles` row
that does not exist. Verified across 10 lessons (`lesson-01`, `02`, `06`, `07`, `08`, `09`, `11`,
`12`, `13`, `14`); `lesson-07-odd-rows-belong-to-red.json`'s two ids and
`lesson-01-immediate-threat.json`'s ids were each checked directly against the local `puzzles`
table and match **no row, active or inactive**.

Consequence, per play of any such lesson challenge:
1. `ChallengeScreen.jsx` sends the id as `puzzleId` — `src/lib/syntheticPuzzleId.js` cannot catch
   these, because it only recognises ids *minted locally* (`dev-…`, `inline-…`). A real-looking
   UUID that merely doesn't exist in this database is structurally undetectable client-side.
2. The server's stored-set lookup misses, emits
   `[evaluate-move] puzzleId … did not resolve to an active puzzles row — falling through to
   computed-live grading`, and grades via the computed-live branch using the request's own
   `correctCol`/`highlightMetadata`.
3. **Grading is correct and visible** (confirmed live in the browser for lesson-01's
   `immediate_threat` and lesson-07's `odd_even_threat`, both a correct and a wrong column). The
   only real cost is a `console.warn` on every lesson challenge play — genuine production log
   noise once this ships.

**This is not a regression, and it is evidence the OI-84 fix was necessary.** Before spec 051's
fall-through, an unresolvable `puzzleId` returned a hard 404, which silently removed grading
feedback entirely for exactly this request shape. So these lessons' confirmation challenges were
broken the moment `puzzleId` started being sent, and the fall-through is what makes them work.

**Why deferred**: the grading path is correct, so this is stale authored content plus log noise,
not a user-facing defect. Fixing it means either editing lesson JSON across ~10 files or changing
the lesson authoring contract — both outside spec 051's scope (which explicitly does not redesign
lesson content).

**If picked up**: decide which of these two the authored `puzzleId` is *meant* to be —
  (a) **a real row reference** → backfill the ids to actual `puzzles` rows, or
  (b) **analytics-only metadata** (the likelier reading: lesson confirmation challenges are
      inherently row-less content, per memory `project_lesson_interactivity_evaluation`) → stop
      emitting it as `puzzleId` on the wire. Cleanest fix for (b) is to have the lesson-loading
      branch in `ChallengeScreen.jsx` mint `inline-<movestring>` ids **unconditionally**, keeping
      any authored `puzzleId` in a separate non-wire field for analytics — one line, and it makes
      `isSyntheticPuzzleId` sufficient again.
Then drop the `console.warn` to debug level, or leave it (it correctly flags genuinely stale ids).
Cross-refs: OI-84 (the fall-through this depends on), `specs/051-pattern-acceptance/quickstart.md`
step 4 (wording corrected 2026-07-29 to match this reality).

### What shipped (2026-07-30) — remediation (b), per owner decision

`connect-four/src/screens/ChallengeScreen.jsx`'s lesson branch now mints
`id: \`inline-${ch.moveString}\`` **unconditionally**, instead of `ch.puzzleId || \`inline-…\``.
Lesson confirmation challenges are therefore always synthetic, `isSyntheticPuzzleId` always
suppresses them, and the request omits `puzzleId` entirely — routing to the computed-live branch,
which is the branch row-less content is supposed to use (FR-025). No more per-play `console.warn`,
and no lookup that could only ever miss.

**The authored `puzzleId` field stays in the lesson JSON** — it is *authoring provenance*, not a
runtime reference, and it has three real consumers that continue to read it unchanged:
`AdminLessonEditorScreen.jsx` (stamps it when a puzzle is curated into a lesson),
`PuzzlePickerModal.jsx` (dedupes puzzles already added to a lesson), and `PuzzlePickerRow.jsx`
(displays a short form of it). That is why these values look like real UUIDs — they *were* real
puzzle ids in whatever database the lesson author was working against; they simply were never rows
in any database the app grades against at runtime. Nothing about the lesson content needed to
change.

**Relationship to OI-84**: this removes the last *load-bearing* dependency on OI-84's
unresolvable-`puzzleId` fall-through. That fall-through stays as a safety net — it still covers the
real race where a puzzle is drawn and then deactivated (e.g. by a backfill run) before the learner
submits, which `.eq('is_active', true)` would otherwise turn into a silent no-feedback 404 — but it
is no longer what keeps lessons working.

---

## OI-86 — Eight of twelve puzzle categories have zero active puzzles locally, below the N=20 serving floor

**Status**: deferred (content/curation work, not a code defect)
**Area**: `puzzles` / `candidates` tables (local dev DB), curation flow
**Discovered**: spec 051 (Epic 1) pool measurement, 2026-07-30

Measured against the uniform FR-022 floor of **N = 20 active puzzles**
(`specs/051-pattern-acceptance/pool-thresholds.md`), the local DB has:

| passing | below the floor (all at **0** active puzzles) |
|---|---|
| `double_threat` 100, `forced_block` 100, `immediate_threat` 66, `undercut` 25 | `forced_win`, `overcut`, `figure_7`, `j_shape`, `odd_even_threat`, `claimeven`, `z_threat`, `forbidden_columns` |

Only `forced_win` was touched by spec 051 (1 → 0; its single row was retired as AMBIGUOUS — that
half is OI-83). The other seven were at 0 before and after: they have simply never been curated into
this local `puzzles` table.

**This is not a generation failure.** Every one of the eight has valid, `correct_cols`-populated
candidates sitting in the curation queue: `forbidden_columns` 30, `figure_7` 21, `j_shape` 14,
`odd_even_threat` 13, `overcut` 9, `claimeven` 7, `z_threat` 3, `forced_win` 2. Clearing this is a
**promotion pass**, not a generation project — and promotion makes no solver calls.

**Why deferred**: curation is content work, outside spec 051's scope (a predicate/storage change).
It also blocks nothing today in a *local* environment beyond QA reach — several spec 051 scenarios
had to be exercised through the DEV board injector instead of real drills for exactly this reason.

**If picked up**: promote the queued candidates per category
(`POST /api/admin/candidates/approve-batch`, or the CurationWorkspace UI); see
`specs/051-pattern-acceptance/pool-thresholds.md` §"How to fill a category" and memory
`feedback_generate_puzzles_for_local_qa` for the exact commands and the `--port` trap. **Measured on
local only** — staging and production pools were never measured and may be healthy; see
`staging_checks.md` Epic 1.

---

## OI-87 — `--experimental-test-module-mocks` is enabled process-wide for the whole test suite

**Status**: deferred (forward-compatibility risk, no current breakage)
**Area**: `connect-four/package.json` (`test` and `test:fast` scripts)
**Discovered**: spec 051 (Epic 1) code review, 2026-07-30

Both npm test scripts now pass `--experimental-test-module-mocks`, needed by `mock.module()` in
`tests/integration/evaluateMoveStoredSet.test.js` and `tests/unit/sharedSolverSafetyFloor.test.js`
to prove a code path is *not* taken. Only those files use it, but a single `node --test` invocation
takes one flag set for its whole file list, so it cannot be scoped further without splitting the
suite into two invocations.

**Risk**: it is an *experimental* Node API. If a future Node upgrade renames or removes the flag,
**every** test in both suites fails at CLI-parse time — not just the two files that need it — which
presents as a total suite failure with a cause far from the real one. It may also add
`ExperimentalWarning` noise to stderr on every run.

**Why deferred**: no breakage on Node v23.11.0 (measured), and the alternative (a second `node --test`
invocation for just the mock-using files, wired into both scripts) adds permanent complexity to
guard a hypothetical.

**If picked up**: split the mock-using files into their own `test:mocks` script and drop the flag
from the main invocation, or replace `mock.module` with dependency injection — the stored-set branch
could take its evaluator functions as parameters, making the bypass assertable without module
mocking at all. Cross-ref `docs/architecture/testing-conventions.md` §"Proving a code path is *not*
taken".

---

## OI-88 — `audit_answer_ambiguity.mjs --repair` cannot seed a category that has zero rows

**Status**: deferred (tooling gap)
**Area**: `connect-four/server/scripts/audit_answer_ambiguity.mjs` (`repairPuzzles`)
**Discovered**: spec 051 (Epic 1), 2026-07-29/30

`--repair --yes --puzzles <category>` implements FR-023's replace-not-exempt remediation: it retires
failing rows and inserts replacements. But it throws
`'no existing <category> row to inherit goal_prompt from — repair by hand'` when the category has
**zero** rows, because it uses an existing row as the `goal_prompt` template for its replacements.

So the tool can only ever *replace*, never *seed* — and the case where a pool most needs filling
(it is empty) is precisely the case it refuses. This surfaced when `overcut` needed remediation
during spec 051 and could not get it.

**Why deferred**: a working alternative exists (generate + promote, see OI-86), and inventing a
`goal_prompt` for a category with no precedent is a content decision, not a mechanical one.

**If picked up**: let `repairPuzzles` fall back to a per-category default `goal_prompt` (the
category registry or `placeholder_puzzles.json` could supply one), or make it accept
`--goal-prompt "<text>"` so an operator can seed the first row explicitly. Either way it should
stop being an error path.

---

## OI-89 — The FR-033 perspective guard degrades silently to the unsound branch when no solver is passed

**Status**: deferred (latent — no current caller triggers it)
**Area**: `connect-four/server/classifier.js` — `detectZThreat`, `detectOddEvenThreat`,
`detectForcedBlock`, `detectForbiddenColumns`
**Discovered**: spec 052 (Epic 2) planning, 2026-07-30

All four detectors handle the non-mover perspective by recursing into child positions, gated on:

```js
if (perspective !== board.currentPlayer && solver) {
```

The `&& solver` conjunct means that when a caller asks for a **non-mover perspective without
supplying a solver**, the guard is skipped and control falls straight through to the sync branch —
the exact "one player's threats gated on the other player's score sign" defect that OI-74/OI-76 are
about. It fails *open*, silently returning an unsound answer, rather than throwing or returning
`{ matched: false }`.

**Why this is latent, not live.** Every current no-solver call site also omits `perspective`, so it
defaults to `board.currentPlayer` and the guard's first conjunct is false anyway — verified at
`server/predicates.js:420`, `server/candidate-generator.js:308`, `:451`, `:493` (all two-argument
calls). The unsound combination is reachable only by a *future* caller that passes an explicit
perspective and no solver.

**Why deferred**: spec 052's Settled decision 1 mandates the role-split resolution for `detectOvercut`
and explicitly does *not* re-open the FR-033 route for these four; fixing this is a separate,
one-line-per-detector change with its own regression surface.

**If picked up**: make the no-solver non-mover case explicit rather than implicit — either throw
(`perspective requires a solver`) or return `{ matched: false, cells: [] }` — so a future caller gets
a loud failure instead of a wrong tag. Note this also leaves the codebase with **two** competing
solutions to the perspective problem (the role-split used by undercut/overcut, and this solver
recursion); spec 052 T003A records that divergence in `reason-DECISIONS.md`.

## OI-90 — `detectForcedWin`'s `blockCol` identity does not distinguish two forced-win lines sharing the same anchoring column

**Status**: accepted / knowingly-left (2026-07-30, spec 052 (Epic 2) US4 — the minimal per-instance
identity fix for FR-019)
**Area**: `connect-four/server/classifier.js` — `detectForcedWin` (`blockCol` field), `classify()`'s
Category 4 gate

Spec 052 US4 replaced `classify()`'s Category 4 (`forced_win`) creation gate's boolean
`.matched` transition with a per-instance diff on `detectForcedWin`'s new `blockCol` field — the
anchoring immediate-threat column (`myThreats[0]`) that starts the forcing sequence. This correctly
recognizes a forced win newly anchored on a *different* column as a genuine creation (mirroring the
`double_threat` column-set diff for Category 3). Per research.md Decision D5, the fix is
deliberately scoped to **only** the anchoring column — it does not thread the full per-branch
forcing-column recursion (the continuation-move loop inside `detectForcedWin`) through as an
identity.

Consequence: if the mover already has a forced win anchored on column X, and their move replaces it
with a **different** forced-win *line* that happens to still be anchored on the same column X (same
first forcing move, but a different/incompatible continuation sequence from there on), the `blockCol`
diff sees no change and does not recognize the second line as a new creation — the same
under-recognition shape as the pre-fix boolean gate, just narrowed from "any forced win" down to
"forced wins sharing an anchor column." This is a known, accepted residual of the minimal fix, not a
regression: it is strictly better than the pre-fix behavior (which conflated ALL forced-win
instances, not just same-anchor ones), and per Decision D5 the full-recursion identity needed to
close it entirely was explicitly ruled out of scope (more solver-adjacent recursion state than the
gate warrants for a P3 story).

**Why deferred**: same-anchor-column, different-continuation forced-win replacement is a narrow edge
case (the anchoring immediate threat is itself usually the scarce resource in these positions); no
production report of it firing incorrectly. Closing it fully would require carrying an identity for
the *entire* forcing chain (e.g. the continuation column sequence), which reintroduces the
"how much state should the gate track" question research.md's D5 deliberately closed for this batch.

**If picked up**: extend `detectForcedWin`'s return shape with a chain identity beyond `blockCol`
(e.g. the sequence of continuation columns actually taken to reach a terminal), and diff that in
`classify()`'s Category 4 gate instead of (or in addition to) `blockCol`. Cross-ref: spec
052 `research.md` Decision D5; spec 052 `spec.md` Edge Cases (User Story 4); FR-026.

---

## OI-91 — `generate_tagblunder_fixtures.mjs` destroys the fixture corpus when invoked with `--help` (or any non-numeric arg)

**Status**: open (discovered 2026-07-30 during spec 052 (Epic 2) US2; not fixed — out of that spec's scope)
**Area**: `connect-four/server/scripts/generate_tagblunder_fixtures.mjs`,
`connect-four/tests/blunder/fixtures/tagBlunderFixtures.json`

The script takes positional args (`maxGames`, `seed`) and has **no `--help` handling** — it does not
recognize the flag, parses it as `maxGames`, coerces to `NaN`/0, generates zero fixtures, and then
**overwrites `tests/blunder/fixtures/tagBlunderFixtures.json` with an empty array**. There is no
confirmation prompt, no backup, and no dry-run.

Concrete repro (this actually happened mid-epic):

```
node server/scripts/generate_tagblunder_fixtures.mjs --help
# → tests/blunder/fixtures/tagBlunderFixtures.json is now []
```

Recovery was only possible because the file was committed at HEAD; `git checkout --` restored the
committed version but **silently discarded uncommitted working-tree fixture rows** (4 rows were lost
this way and had to be reproduced by a ~5-minute full regeneration run). Had the corpus contained
un-committed human-reviewed rows — exactly the state spec 052's FR-005 review workflow creates —
they would have been unrecoverable.

This also violates the house convention that every script prints purpose + options + defaults and
exits 0 *before* required-arg validation (same convention `find_lesson_boards.mjs` violates, tracked
separately in OI-61 item 5 — that one only errors, this one destroys data).

**Why deferred**: spec 052 was a detector/tag-taxonomy epic; hardening an unrelated dev script was
outside its scope, and the immediate risk was mitigated by documenting the hazard in every batch
handoff. It is a data-loss footgun for the next person who runs it, not a production defect.

**If picked up**: add a real `--help`/`-h` that prints purpose, both positional args and their
defaults, and exits 0 before any work; validate that `maxGames` parses to a positive integer and
exit non-zero otherwise; and refuse to write a fixture file with fewer rows than the existing one
unless `--force` is passed. Cross-ref: memory `feedback_scripts_meaningful_help.md`; OI-61 item 5.

---

## OI-92 — 18 of 42 live `overcut` puzzle/candidate rows are stale under spec 052's widened detector

**Status**: open — **blocks deploying spec 052 (Epic 2) to staging/production** (measured 2026-07-30
against the final post-US2 code; NOT fixed — writing to live data was left for the epic owner)
**Area**: `public.puzzles` / `public.candidates` rows with `category='overcut'` on **staging and
production**; `connect-four/server/candidate-generator.js` (`checkOvercutPredicate`),
`connect-four/server/classifier.js` (`detectOvercutBeneficiary`)

Spec 052 US2 added two new match branches to the overcut detector (`minor_threat`, `active_forcing`)
and US1 split it into role-named functions. The FR-006 re-measurement was performed **mid-epic,
after US1 but before US2's new branches landed**, and correctly concluded "all 42 rows re-derive
identically, no repair needed." That conclusion is now **stale**. Re-measured against the final code:

| Env | table | rows | identical | metadata differs | fails predicate |
|---|---|---|---|---|---|
| local | puzzles / candidates | 0 / 0 | — | — | — |
| staging | puzzles | 10 | 6 | 2 | 2 |
| staging | candidates | 10 | 6 | 2 | 2 |
| production | puzzles | 11 | 6 | 4 | 1 |
| production | candidates | 11 | 6 | 4 | 1 |

**24 identical, 12 with differing `highlight_metadata`, 6 no longer passing the predicate.**

Why it matters — `evalOvercut` grades a player's answer against the **stored**
`highlight_metadata`'s `major_threat` column (overcut sets `correct_col: null` and derives the
accepted answer from the metadata). So:

- **The 6 predicate failures** now report `correctCols` of length 2 (e.g. `333334444630006042121406226`
  → `[1,5]`, `322233353155505310161125` → `[0,4]`), tripping `checkOvercutPredicate`'s singleton
  guard. These boards were *always* ambiguous; the old, narrower detector simply could not see the
  second valid column. They are invalid puzzles under the project's own unique-answer rule.
- **The 12 differing rows** now match an earlier column via a new mechanism (e.g. staging
  `33333444406104511006` → col 2 via `minor_threat`; `3334443433425240110660012222` → col 5 via
  `active_forcing`). A player who plays the newly-valid overcut column is graded **wrong** against
  the stale stored cells.

This is a latent data problem **surfaced** by the more-correct detector, not one created by it —
but it is player-facing the moment spec 052 ships.

**Why deferred**: repairing it means writing to live staging and production data. That is an
outward-facing, hard-to-reverse action and belongs to the epic owner, not to the implementing
agent. The measurement was read-only; no writes were made.

**If picked up**: (1) re-derive `highlight_metadata` for the 12 differing rows and `UPDATE` them in
place; (2) decide the 6 ambiguous rows — either retire them (`is_active=false` / reject the
candidate) or accept multi-column answers for `overcut`, which is a product decision, not a code
one; (3) re-run the measurement to confirm 42/42 identical before deploying. The read-only
re-measurement script pattern is in this epic's session scratchpad; it walks
`.env` / `.env.staging` / `.env.production`, calls `checkOvercutPredicate` per row, and compares
with key-order-canonicalized JSON (raw `JSON.stringify` false-flags every row on JSONB key order —
see memory `project_lesson_answer_set_invariant.md`). Cross-ref: spec 052 FR-006, T003, T013.

---

## OI-93 — Lesson 12's player-facing copy does not teach the two new overcut sub-cases

**Status**: deferred (scoped out of spec 052 (Epic 2) US2 — text/audio desync risk)
**Area**: `connect-four/lessons/lesson-12-overcut.json` (`infoProse` + its narration `.mp3`)
**Discovered**: spec 052, 2026-07-30

Spec 052 US2 added two first-class overcut branches (`minor_threat`, `active_forcing`) and renamed
the T5 branch's reason to `t5_row3_row6`. FR-010 required lesson 12's copy to match the new
labelling; only the **dev-only** `_boardInstructions` field was corrected. The player-facing
`infoProse` still says game reviews recognize "two more" mechanisms (T4, chain-T2) and names neither
`active_forcing` nor `minor_threat` — an undercount, now that freshly-generated overcut content is
**~72% `minor_threat` + `active_forcing`** (measured over 40 locally generated candidates).

**Why deferred**: lesson narration `.mp3` files are generated from the prose verbatim and are keyed
by text hash, so editing the prose without regenerating audio ships a lesson whose spoken and
written versions disagree — a worse defect than the undercount. See memory
`project_lesson_progression_audio_traps.md` and `project_tts_audio_cached_by_text.md`.

**If picked up**: rewrite `infoProse` to name all five mechanisms, regenerate the lesson's narration
audio in the same change, and verify both locales render and speak the new text (Spanish degrades to
English *silently* — see `project_spanish_output_silent_fallback.md`). Cross-ref: spec 052 FR-010,
T024; `docs/architecture/reason-DECISIONS.md` D38.

---

## OI-94 — Nothing prevents a sixth entitlement source: the "no raw `.tier` read" invariant is enforced by a manual grep, not a lint rule

**Status**: deferred (surfaced while planning spec 053 (Epic 3), 2026-08-01 — not yet implemented)
**Area**: `connect-four/src/` (all screens/components), `specs/053-entitlement-payments-consolidation/tasks.md` T027
**Discovered**: spec 053 planning, plan/tasks critique

Spec 053 US2 consolidates five independent `profile.tier` reads (`SettingsScreen.jsx`,
`SagaScreen.jsx`, `PostSetSummaryScreen.jsx`, `DeepRevealPane.jsx`, `useLessonLockGuard.js`) behind a
single `getEntitlement()` helper. The invariant that keeps it consolidated — *no component reads
`.tier` directly ever again* — is verified by **T027, a manual grep step with no automated test
backing it**. Nothing fails if a future PR reintroduces a raw read.

This is a real recurrence risk, not a theoretical one: the list of tier-read sites had *already*
drifted once. OI-39 recorded four call sites; a fresh grep during spec 053's epic review found
**five**, and two of OI-39's four were not tier readers at all. The count went stale precisely
because nothing enforced it.

**Why deferred**: T028a updates `docs/architecture/frontend-conventions.md` to mandate the new
pattern, which addresses the *documentation* half; the manual grep matches this project's existing
precedent for CSP verification. A lint rule is a net-new tooling seam that spec 053 did not scope.

**If picked up**: add an ESLint rule (or a `test:fast`-registered assertion) banning
`.tier` member access outside the entitlement module and its tests, and delete T027's manual step in
the same change. Cross-ref: OI-39, spec 053 FR-011/FR-014, memory
`feedback_plan_file_map_is_coverage_frontier.md`.

---

## OI-95 — A locked lesson cannot tell a signed-out visitor from a signed-in free user, so both see the same "Upgrade" prompt

**Status**: deferred (explicit owner decision, 2026-08-01 — product call not yet made)
**Area**: `GET /api/lessons/:id` response contract; `ConceptScreen.jsx`, `SocraticScreen.jsx`,
`CLChallengeScreen.jsx`
**Discovered**: spec 053 tasks critique

Spec 053's ratified locked-lesson contract is exactly `200 { id, title, order, free, locked: true }`
with `slides` absent. During task generation an `authenticated` flag was added to that body by
inference; the owner ratified **dropping it** (2026-08-01), keeping it only on
`GET /api/user/entitlement`, where the session-lapse logic in FR-033 actually consumes it.

Consequence: the three lesson screens receive an identical stub whether the caller is signed out or
signed in on the free tier, so both audiences get the same upgrade affordance. A signed-out visitor
arguably wants "Sign in" first — they may already have paid on another device.

**Why deferred**: showing distinct prompts is a product decision nobody has made, and making it would
have widened an API contract the owner had already settled verbatim. The entitlement endpoint already
carries the signal, so the client *could* answer the question with a second call if it ever matters.

**If picked up**: decide whether the two audiences deserve different copy; if yes, either re-add
`authenticated` to the lesson stub (amending spec 053 FR-002, its "Lesson (locked view)" entity, and
the epic's Settled decision #7 together — do not amend just one) or have the screens consult the
entitlement endpoint. Cross-ref: spec 053 FR-002/FR-033.
## OI-96 — Spec 053's `/pricing` CSP verification (FR-027/SC-008) was never performed in a real browser

**Status**: ✅ RESOLVED 2026-08-01 (spec 053, T044 — verified in a real browser once the shared
Chrome profile was freed; see the "THIRD PASS" entry in `staging_checks.md` §Epic 3 — Entitlement &
Payments Consolidation). Filed as deferred while the browser was blocked; the check has since been
completed and passed: `/pricing` loaded from the built `dist/` under the real Express server, the
checkout CTA opened the Paddle overlay (`cdn.paddle.com/paddle/v2/paddle.js` 304,
`sandbox-buy.paddle.com` iframe rendered), and our Content-Security-Policy produced **zero**
violations. The single console line was Paddle's own report-only `frame-ancestors` policy, a local
`:4509` port artifact, not our header. A live transaction is still not exercisable locally because
`VITE_PADDLE_CLIENT_TOKEN` is unset (owner-confirmed: Paddle does not work locally) — that is a
staging concern, not a CSP one.

**Original status when filed**: deferred (blocked on tooling, not on code — spec 053 T044)
**Area**: `connect-four/src/screens/PricingScreen.jsx`, `connect-four/server/index.js` (CSP header),
Paddle checkout overlay; recorded in `staging_checks.md` §"Epic 3 — Entitlement & Payments
Consolidation (spec 053)"
**Discovered**: spec 053, 2026-08-01

FR-027/SC-008 require the redesigned `/pricing` page **and its checkout action** to be verified under
the production CSP as actually enforced by the Express-served `dist/` build — never the Vite dev
server, which sends no CSP header at all. Two separate agents attempted this and both were blocked:
the shared Chrome DevTools MCP automation profile was held by a live Chrome process (confirmed via
`ps`, not a stale lock), and per the "concurrent agents clobber" convention neither force-killed it.

What *was* confirmed, by `curl` against the built `dist/` served by the real Express server:
`/pricing` returns 200; `GET /api/paddle/config` and `GET /api/limits` return the live values the page
renders; and the CSP header already carries every origin the Paddle overlay needs
(`cdn.paddle.com`, `*.paddle.com`, `pay.google.com`, `www.google.com` across
`script-src`/`connect-src`/`frame-src`/`img-src`) — this epic added no new origin or directive.

What was **not** observed: the overlay actually opening, and a live DevTools console free of
`Refused to …` violations. The residual risk is low (no directive changed) but non-zero: only a real
overlay launch exercises the runtime origins.

**Why deferred**: purely a tooling block. No code change is pending; the verification is a manual
browser step that needs the shared automation profile free.

**If picked up**: with the shared Chrome profile free, `cd connect-four && npm run build`, serve
`dist/` via `node server/index.js` on the worktree's `$API_PORT` (`eval "$(./worktree-ports.sh)"` —
never `npm run dev`), load `/pricing`, click the checkout CTA, and confirm zero `Refused to …` console
lines. Then flip `staging_checks.md`'s T044 entry from NOT VERIFIED to a real pass/fail. Cross-ref:
spec 053 FR-027/SC-008, OI-41.

---

## OI-97 — Paddle domain re-submission for the `/pricing` change was never confirmed

**Status**: ✅ RESOLVED 2026-08-01 (spec 053, T047 — answered from Paddle's own docs once the owner
authenticated the `paddle-docs` MCP server; see `staging_checks.md` §Epic 3 T047). **No domain
re-submission is required.** Paddle documents no content-change trigger for re-review: a checkout
domain is approved once and stays approved, and the only documented re-submission path
(`POST /checkout-domains/{id}/resubmit`) applies solely to a domain sitting in `action_required`
after a soft decline. Separately, a client-side-rendered pricing page is Paddle's *own* recommended
pattern (their quickstart and Next.js starter kit both build it with Paddle.js `PricePreview()`), so
`/pricing` becoming a React route does not move the site away from what review expects. The standing
criteria — public, no login wall, pricing visible, terms/privacy/refund present, MoR named — all still
hold, and the retained static `/pricing-legal` keeps prices visible in plain HTML even to a
non-JS-rendering crawler.

**Original status when filed**: deferred (blocked on interactive auth; non-blocking by the epic's own Settled decision #6)
**Area**: Paddle domain approval for the already-approved app domain; `staging_checks.md` §"Epic 3 —
Entitlement & Payments Consolidation (spec 053)"
**Discovered**: spec 053, 2026-08-01

Spec 053 T047 called for a confirmatory check — via the `paddle-docs` MCP server — that swapping
`/pricing` from a static page to an in-app React route does not require re-submitting the domain for
Paddle's approval review. The epic's assumptions already state the domain is cleared and that this
check is confirmatory rather than gating. Two agents could not complete it: `paddle-docs` requires an
interactive OAuth flow that cannot be driven autonomously.

**Why deferred**: explicitly non-blocking per the epic's Settled decision #6, and blocked on an
interactive login only the owner can complete.

**New evidence (2026-08-01, from the T044 browser run)**: when the checkout overlay opened locally,
Chrome logged Paddle's own **report-only** `frame-ancestors http://localhost` policy against the
`sandbox-buy.paddle.com` frame. That directive is delivered by Paddle and is derived from the seller
account's approved-domain list — direct confirmation that Paddle does gate framing on approved
domains. It was report-only and did not block the overlay, and it fired only because the local server
runs on a non-default port (`:4509` vs. the host-source `http://localhost`, which matches port 80).
This does not indicate a problem with the production domain, which the epic's assumptions record as
already approved — but it does mean the approved-domain list is the thing to check if the overlay ever
fails to frame in production.

**If picked up**: authenticate the `paddle-docs` MCP server and confirm whether a content change on an
already-approved domain triggers re-review; record the answer in `staging_checks.md` under the spec
053 heading. If re-review *is* required, that becomes a deploy prerequisite — see
`docs/deployment_steps.md`. Cross-ref: spec 053 FR-027, OI-96.

---
## OI-98 — The Paddle default payment link's `?_ptxn=` auto-open checkout is not handled by any page

**Status**: deferred (pre-existing, not introduced by spec 053 — scoped out of that epic)
**Area**: `connect-four/src/lib/useUpgradeCheckout.js`, `connect-four/src/screens/PricingScreen.jsx`,
Paddle dashboard → Checkout → Checkout settings → Default payment link
**Discovered**: spec 053, 2026-08-01 (while confirming T047)

Paddle builds every transaction's checkout link, and the "update your payment method" links it emails
to subscribers, by appending `?_ptxn=<transaction_id>` to the account's **default payment link**. The
target page is required to *include Paddle.js*, which then auto-opens a checkout for that transaction
when the query parameter is present
(`developer.paddle.com/build/transactions/default-payment-link`).

Neither condition is met today:
- `useUpgradeCheckout()` (`src/lib/useUpgradeCheckout.js:139`) has **no mount-time initialization** —
  it returns a `handleUpgrade` closure, and `getPaddle()`/`initializePaddle` only run inside the click
  handler. A visitor who merely *lands* on `/pricing` never initializes Paddle.js.
- `grep -a -rn "_ptxn" connect-four/src connect-four/server` returns **nothing** — no page reads the
  parameter.

Consequence: a subscriber following Paddle's payment-method-update email lands on a page that shows
pricing but never opens the checkout they were sent to complete.

**This is pre-existing, not a spec 053 regression.** The old static `pricing.html` contained no
Paddle.js at all (`grep -a -c paddle` → 0 script includes; the only "Paddle" hits are the
merchant-of-record prose), so the flow was already broken. Spec 053's React `/pricing` is strictly
closer to correct, since it at least loads Paddle.js on interaction.

**Why deferred**: out of spec 053's scope (that epic's stated assumption is that the checkout flow
itself is reused unchanged), and it needs a product decision about which page should be the default
payment link.

**If picked up**: initialize Paddle.js on mount wherever the default payment link points (an effect
calling the existing `getPaddle()`), then read `_ptxn` from the query string and let Paddle.js open the
transaction. Confirm the dashboard's Default payment link points at that page. **Do not point the
default payment link at `/pricing-legal`** — it is deliberately static and JS-free (OI-41), so it can
never satisfy the Paddle.js requirement. Cross-ref: spec 053 FR-024/FR-025, OI-41, OI-97.

---
## OI-99 — Every non-tied puzzle attempt through `POST /api/puzzles/:id/check` is silently discarded

**Status**: ✅ RESOLVED 2026-08-02 (spec 054, Epic 4, US3 / FR-015 + FR-016). The handler now writes
`outcome: toStoredOutcome(evaluation.result)` (`connect-four/server/outcomeVocabulary.js`, a shared
leaf module imported by both `server/index.js` and its test), translating `evaluatePredicate`'s raw
`'correct'|'wrong'|'tied'` vocabulary into the stored enum (`'correct'→'correct_first'`,
`'wrong'→'incorrect'`, `'tied'→'tied'`). Migration
`connect-four/server/migrations/063_puzzle_attempts_outcome_narrow.sql` narrows the CHECK constraint
to `'correct_first'|'tied'|'incorrect'|'abandoned'` so `'incorrect'` is now a legal value. Verified
by real inserts against the local DB: all four kept values accepted, `'revealed'` and
`'correct_retry'` rejected. Tests: `connect-four/server/outcomeVocabulary.test.mjs` and
`connect-four/tests/blunder/outcomeConstraint.test.js`.
**Deploy note**: migration 063 must be applied to staging/production BEFORE the
`'incorrect'`-emitting build is served — see `docs/deployment_steps.md`.
**Area**: `connect-four/server/index.js:2520` (the `puzzle_attempts` insert inside the `POST
/api/puzzles/:id/check` handler at `:2461`), `connect-four/server/predicates.js:95`
(`evaluatePredicate`), `connect-four/server/migrations/003_puzzles.sql:30` (the `outcome` CHECK)
**Discovered**: spec 054 epic review, 2026-08-01

The handler inserts `outcome: evaluation.result`, where `evaluatePredicate` returns
`{ result: 'correct' | 'wrong' | 'tied' }`. Only `'tied'` is a member of the `outcome` CHECK
constraint's value set — `'correct'` and `'wrong'` are not. Those inserts therefore fail the
constraint on every call, and the failure is invisible because the write is fire-and-forget:

```js
  .catch(err => console.error('[puzzle attempt]', err.message));   // server/index.js:2525-2527
```

Consequence: for the whole life of this endpoint, **only tied gradings have ever produced a
`puzzle_attempts` row**; every correct and every wrong attempt through it was dropped. Nothing reads
`puzzle_attempts.outcome` (stats aggregate on `first_attempt_correct`), which is why the loss went
unnoticed.

Two second-order effects worth knowing before touching this area:
- **`'tied'` is a live, written value, not dead vocabulary.** OI-49 and earlier drafts of the Epic 4
  text asserted that only `ChallengeScreen.jsx` writes outcomes and that `'tied'` was unused. Both are
  false; the claims came from reading OI prose rather than grepping `outcome:` across `server/`.
- A narrowing `ALTER TABLE … ADD CONSTRAINT … CHECK` **validates existing rows**, so any live `'tied'`
  row aborts the migration. Query before narrowing; do not assume zero.

**Why deferred**: it is US4.3 of spec 054, which also normalizes the writer to the enum vocabulary
(`'correct' → 'correct_first'`, `'wrong' → 'incorrect'`, `'tied' → 'tied'`).

---

## OI-100 — A wrong answer in a sequence-category puzzle records no attempt row at all

**Status**: ✅ RESOLVED 2026-08-02 (spec 054, Epic 4, US3 / FR-019). A fourth
`store?.recordPuzzleAttempt({...})` call was added in `handleSequenceClick`'s failure (`else`)
branch in `connect-four/src/screens/ChallengeScreen.jsx`, writing `outcome: 'incorrect'`. The two
pre-existing conditional sites (`~:408`, `~:584`) also changed their wrong-answer branch from
`'abandoned'` to `'incorrect'` (FR-018); the unconditional success-only site (`~:659`) is unchanged
(FR-020). Test: `connect-four/tests/dom/challengeScreenOutcome.dom.test.jsx` (registered as the 14th
entry in `test:dom`).
**Note**: during spec 054's code review this new write was found to pass a scalar `moves_tried` into
an `integer[] NOT NULL` column — which Postgres rejects, so the row would never have landed. Fixed
to `moves_tried: [col]` before ship. The two sibling sites carried the same defect and were fixed after the QA pass — see OI-103 (resolved).
**Area**: `connect-four/src/screens/ChallengeScreen.jsx` — `handleSequenceClick`, the `else` branch at
~`:668` sibling to the `data.outcome === 'success'` branch at ~`:659`
**Discovered**: spec 054 epic review, 2026-08-01

`ChallengeScreen.jsx` has three `outcome:` write sites. Two are conditional and record a wrong answer
(as `'abandoned'` — see below): `:408` `outcome: isCorrect ? 'correct_first' : 'abandoned'` and `:584`
`outcome: quality === 'optimal' ? 'correct_first' : 'abandoned'`. The third, `:659`, is
**unconditional** `outcome: 'correct_first'` and sits inside the success branch only. Its sibling
failure branch plays a wrong-move sound and pushes a coach message but never calls
`recordPuzzleAttempt` — so a wrong answer in a sequence puzzle is invisible to stats entirely.

Related and also unfixed: the two conditional sites **conflate "answered incorrectly" with
"abandoned"**, so even where a row is written the distinction is unrecoverable for all data written to
date. Spec 054 adds an explicit `'incorrect'` value and fixes the writers, but deliberately does **not**
backfill — the distinction cannot be reconstructed from existing rows.

**Why deferred**: it is US4.3 of spec 054, which widens the client exception to a fourth
`ChallengeScreen.jsx` touch point covering this branch.

---

## OI-101 — `GET /api/admin/candidates` paginates on a non-unique sort key

**Status**: ✅ RESOLVED 2026-08-02 (spec 054, Epic 4, US2 / FR-012a). `.order('id', { ascending:
true })` was added after the existing `.order('created_at', { ascending: true })` in the
`GET /api/admin/candidates` handler (`connect-four/server/index.js`), matching
`/api/coach/queue`'s `severity DESC, created_at ASC, id ASC` precedent. Test:
`connect-four/tests/unit/adminCandidatesPagination.test.js` (DB-free source-parse asserting the
query-builder chain has both `.order()` calls before its `.range()`). The same epic added an
`id`-based final tiebreaker to all three `GET /api/games` in-JS comparators
(`connect-four/server/gamesSort.js`).
**Area**: `connect-four/server/index.js:3135-3143`
**Discovered**: spec 054 spec review, 2026-08-02

The handler paginates with `.order('created_at', { ascending: true }).range(offset, offset + limit - 1)`
and **no `id` tiebreaker**. Candidates are inserted in generation batches, so a batch shares one
`created_at` — Postgres may order tied rows differently between the two page queries, making some rows
unreachable and others duplicated across pages.

This is the same failure mode already documented for `/api/coach/queue` in
`docs/architecture/api-conventions.md:324`, where QA observed **8 of 137 rows unreachable**. The
tiebreaker rule exists in the conventions doc; this endpoint predates or missed it.

Note that `GET /api/puzzles/draw` (`server/index.js:1640-1665`) also calls `.range()` but is **not**
affected: its offset is a single randomized draw
(`const offset = Math.floor(Math.random() * Math.max(0, totalIndexed - n + 1));` at `:1646`), not
page-to-page traversal, so a stable sort key is semantically inapplicable there.

**Why deferred**: it is spec 054's FR-012a, which also requires an inventory of every offset-paginated
endpoint (`server/index.js:1654`, `:1984`, `:2774`, `:3143`).

---

## OI-102 — `tests/blunder/blunderTagConstraint.test.js` is registered in no npm script, and the three test lists have drifted

**Status**: deferred — surfaced by spec 054 task review, not in that epic's scope
**Area**: `connect-four/package.json` — `test:dom` (line 14), `test` (line 16), `test:fast` (line 17);
`connect-four/tests/blunder/blunderTagConstraint.test.js`
**Discovered**: spec 054 tasks review, 2026-08-02

`docs/architecture/testing-conventions.md:174` already states that tests are explicitly listed with no
automatic discovery, and `:187` gives the correct verification technique (confirm the test's own
distinctive case names appear in the run output; assert the path is present in the script string).
Despite that, `blunderTagConstraint.test.js` exists on disk and `grep -c blunderTagConstraint
connect-four/package.json` returns **0** — it is in none of the three scripts and has never run.
Whatever code-vs-constraint parity it guards is currently unguarded.

Separately, the three lists have drifted from one another (each is hand-maintained), so "which suite
covers this file" is not answerable without diffing the three strings.

**Why deferred**: spec 054 adds registration tasks for the ~9 test files *it* creates, but re-enabling
a pre-existing orphaned test is out of its scope — the test may itself be stale and needs a look before
being switched on.

**If picked up**: run it standalone first (`node --test
connect-four/tests/blunder/blunderTagConstraint.test.js`) to see whether it still passes against the
current migrations before adding it to a script. It is also a useful **pattern** to copy — it asserts
code-vs-constraint parity by parsing the newest migration SQL file, with no DB connection, which is the
only DB-free way to test a CHECK constraint in this repo.

**UPDATE 2026-08-02** — this is one half of a symmetric failure, and the structural fix is now tracked
separately as **OI-118**. The mirror case also exists: `test:fast` lists
`tests/unit/detectClaimodd.test.js`, deleted back in commit `362afcd`, and `node --test` ignores a
missing path **silently** — so the list is wrong in both directions with no signal either way. The same
hand-maintained lines are also the highest-risk conflict in every parallel-lane merge (resolving them by
taking one side unregisters the other lane's tests). Fixing OI-102 by adding one more path to a
hand-maintained list treats the symptom; OI-118 proposes replacing the lists with discovery, which
closes this entry as a side effect.

---

## OI-103 — Two `ChallengeScreen.jsx` puzzle-attempt writes pass a scalar `moves_tried` into an `integer[]` column

**Status**: ✅ RESOLVED 2026-08-02 (spec 054, post-QA). Both sites now pass an array:
`~:584` → `moves_tried: cols` (the columns actually selected, not `cols.length`) and `~:659` →
`moves_tried: [col]`. Verified no consumer reads the field — a repo-wide search for `moves_tried`
found only writes, one verbatim passthrough (`server/userHelpers.js:104`), test fixtures, the schema
line, and docs; there is no reader to break, so storing the list rather than a count is strictly
more information. Guarded by an `Array.isArray` assertion on all four sites in
`connect-four/tests/dom/challengeScreenOutcome.dom.test.jsx`, confirmed to go RED when either fix is
reverted. This closes spec 054's **SC-004** ("100% of wrong Challenge submissions, across every
puzzle type, recorded as `'incorrect'`"), which could not be claimed while the multi-column write
was being rejected.
**Area**: `connect-four/src/screens/ChallengeScreen.jsx` — the `forbidden_columns` write (~`:584`,
`moves_tried: cols.length`) and the unconditional sequence-puzzle SUCCESS write (~`:659`,
`moves_tried: 1`); column declared `connect-four/server/migrations/003_puzzles.sql:28`
**Discovered**: spec 054 code review, 2026-08-02

`puzzle_attempts.moves_tried` is `integer[] NOT NULL DEFAULT '{}'`. Both sites pass a **scalar**
number, not an array. Postgres rejects that outright — measured against the local DB:

```
scalar 1  => REJECTED: malformed array literal: "1"
array [1] => ACCEPTED
```

The write path is fire-and-forget (`SupabaseStore.recordPuzzleAttempt` → `POST
/api/user/puzzle-attempts` → `writePuzzleAttempts`, which passes `moves_tried` through verbatim —
`connect-four/server/userHelpers.js:104`, `src/store/SupabaseStore.js:72` — with no normalization),
so the rejection is invisible: for a **signed-in** user these two attempts are silently discarded.
Anonymous users are unaffected because `IndexedDBStore` has no schema to violate.

This is the same silent-discard class as OI-99, in the client writer rather than the server one.

**Confirmed live in the browser (spec 054 QA pass, 2026-08-02)**: submitting a wrong
`forbidden_columns` answer as a signed-in user produced a `500` from Supabase (visible in the browser
console) and **no `puzzle_attempts` row was inserted** — 0 rows for that puzzle_id. This is a
reproducible data-loss bug on a real user path, not a theoretical one.

**Why deferred**: spec 054's client-side scope was fenced to the four named `outcome:` touch points
(spec.md "Out of Scope" §). The new sequence-failure write it added had the same defect and **was**
fixed (`moves_tried: [col]`); these two sibling sites are pre-existing, and `~:659` is on the
success path, so changing what it stores is a data-semantics decision beyond a correctness fix.

**If picked up**: change `~:584` to the actual columns tried (it currently stores a *count*, so the
fix is a semantic choice — `cols` itself is probably intended) and `~:659` to `[col]`, matching the
`~:668` write spec 054 shipped. Then check whether any consumer reads `moves_tried` expecting a
count. Note the DOM test at `connect-four/tests/dom/challengeScreenOutcome.dom.test.jsx` asserted
the buggy scalar for the ~`:668` site until it was corrected — re-check any fixture you touch
against a real insert, not against the current code's belief.

---

## OI-104 — A move's `quality` label can change between the live analysis and every later cached view

**Status**: deferred (pre-existing; surfaced by spec 054 QA, out of that epic's scope)
**Area**: `connect-four/server/index.js` — `reconstructAnalysisFromBlunders()` and the
`POST /api/games/analyze` solver-driven path; `scoreMove()` vs `classifyStoredMistake()`
**Discovered**: spec 054 QA pass, 2026-08-02

Reproduced: move #1 of a test game was labelled `"blunder"` on the first (solver-driven) analysis,
then `"suboptimal"` on every subsequent view of the same game.

The two views compute `quality` from different sources:
- **live first analysis** — `scoreMove()`, computed from solver scores at request time
- **cached later views** — the stored `blunders.quality` column, written by
  `classifyStoredMistake()`'s separate storage-rule threshold

Those two thresholds are allowed to diverge by design, so a move near the boundary gets one label
live and a different one forever after. The user sees their game silently re-graded on revisit.

**This pre-dates spec 054.** That epic only *extracted* the reconstruction block into a shared
helper (unchanged logic) and additionally reached it from the anonymous caller — which widens the
blast radius from signed-in users to everyone, but did not introduce the divergence.

**Why deferred**: fixing it requires deciding which label is authoritative — the live solver
judgement or the stored storage-rule one — and that is a product/semantics call about what
`blunders.quality` is *for*, not a mechanical correctness fix. Changing the stored value also
retroactively re-grades existing rows.

**If picked up**: start by diffing `scoreMove()`'s thresholds against `classifyStoredMistake()`'s
(memory `project_annotation_gate_and_zones` and `mistakeStorageRule.test.js` cover the storage rule)
and establish whether the gap is intentional. Related: memory
`project_puzzle_grading_reads_stored_metadata` documents the same class of trap — stored metadata
diverging from a recomputed detector.

---

## OI-105 — Migration number 061 is used by two different files; the ledger and disk have diverged

**Status**: deferred (pre-existing; surfaced while measuring spec 054's deploy prerequisites)
**Area**: `connect-four/server/migrations/`, `schema_migrations` on staging and production
**Discovered**: spec 054 deploy-prerequisite measurement, 2026-08-02

Measured 2026-08-02 against both environments:

| Env | recorded as applied | on disk |
|---|---|---|
| staging | `061_security_lints.sql` (2026-07-30) | `061_correct_cols.sql` |
| production | `061_security_lints.sql` (2026-07-30) | `061_correct_cols.sql` |

`061_security_lints.sql` **is not in `server/migrations/`**. Two different migrations share the
number 061, and the on-disk one has never been applied to either environment.

`migrate.js` matches by **filename**, not number, so this is not immediately breaking:
`061_correct_cols.sql` will simply run on the next deploy. The risks are (a) anyone eyeballing
"highest applied number" concludes both environments are current through 061 when they are missing an
061, and (b) the next author picks a number by looking at disk alone and collides again.

**Why deferred**: not blocking — spec 054's own migrations (062, 063) are unaffected, and resolving it
means deciding what happened to `061_security_lints.sql` (renamed? applied out-of-band and deleted?),
which is history this session did not have.

**If picked up**: find out where `061_security_lints.sql` came from (`git log --diff-filter=AD --
'*061*'`) and whether its DDL is still needed. Then decide whether to renumber `061_correct_cols.sql`
or leave it. Add a `migrate.js` pre-flight that warns when a ledger filename has no counterpart on
disk. See memory `project_migration_ledger_and_pooler`.

---
## OI-106 — `generate-tts.locale.test.js` is written in vitest syntax and registered in no test script, so it runs nowhere

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

## OI-107 — The lesson editor never checks that puzzles exist for the chosen confirmation category

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

## OI-108 — Lesson boards flagged by the widened solver-optimal gate — human review pending

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

**Related**: OI-109 (the matcher/detector duplication that made this sweep necessary), OI-76 (why the
overcut matchers are excluded), OI-74 (the precedent for a matcher declaring its detector and side).

## OI-109 — `find_lesson_boards.mjs`'s SPECS matchers are independent re-implementations of `classifier.js` concepts and measurably diverge from them

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
matcher declares detector **and side** — and re-run the OI-108 sweep afterwards, since a unified
detector will re-classify some shipped boards.

---

## OI-110 — Spanish `goalPrompt` copy on lesson-12/lesson-14 overflows the coach bubble

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

## OI-111 — Coach audio is unassertable in jsdom, so FR-029's automated tier is a smoke check only

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

## OI-112 — DOM-test fixture boilerplate is copy-pasted across 4–6 files

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

## OI-113 — `promptKeyRef` in `ChallengeScreen` is write-only dead state

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

## OI-114 — Admin and learner surfaces disagree on whether `lesson.title` can be absent

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

## OI-115 — `scripts/generate-tts.js --key` / `--all-new` is broken: `synthesize()` called without `lang`

**Status**: ✅ RESOLVED 2026-07-31 — `synthesizeAndWrite` now passes `lang` through
(`synthesize(value, lang)`), and `tests/unit/generateTtsLang.test.js` guards it: one case asserts the
argument reaches the provider (via an injected fake — no OpenAI call), the other asserts `synthesize`
still rejects an undefined `lang`, so the first case cannot lose its teeth. Confirmed the test goes RED
when the fix is reverted. Registered in both `test` and `test:fast`. `synthesizeAndWrite` gained an
optional `{ synthesizeFn }` injection point used only by that test; production callers are unchanged.
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

## OI-117 — Anon free deep-reveal spend policy: retire the exclusive-blunder restriction, ship no gate (D2)

**Status**: ✅ RESOLVED 2026-08-01 (spec `053`/Epic 7, US3, D2)
**Area**: `docs/superpowers/specs/2026-07-13-anon-free-deep-reveal-design.md:41` (doc only); no code
path — `connect-four/src/lib/anonDeepReveal.js` (the "1 free reveal" quota gate, unaffected),
`connect-four/server/index.js` (`/api/explain-move-llm`, `/api/games/analyze`).

**Decision (approved 2026-07-16, `docs/superpowers/specs/2026-07-16-qa-remediation-decisions-design.md`
§D2; restated here per spec-053's requirement that the throwaway `docs/superpowers/` substance also
land durably):** the anon free deep reveal's original design intent — restrict the free reveal to
genuine blunders only — is retired, and no code gate of any kind is shipped to enforce it. The reveal
opens on any stored mistake the anon user clicks (blunder or suboptimal), per spec-042 FR-002. This was
never actually a live restriction: `ReviewScreen.selectStep` has always navigated to any non-optimal
move with a stored row, not only blunder rows, so the original design doc's "blunders only" line
described intent, not implementation.

**Rationale for shipping no gate:**
- A server-side gate isn't cleanly implementable — the anon gate is keyed by
  `${movestring}:${col}` (position+column), which maps ambiguously to stored rows: the same
  position+column can appear across multiple games/users with differing quality, and
  `POST /api/explain-move-llm` takes no blunder id to disambiguate.
- A client-only gate would be theatre — `GET /api/blunders/:id` is a public, no-auth permalink, so a
  client-side check blocks nothing an interested user couldn't bypass directly.
- Blocking a click the user deliberately made costs conversion for no real security benefit.
- Shipping a gate here would contradict spec-042's already-shipped invariant that mistake severity is
  "label + color only, never gates an action."

**Documented reversal trigger (kept live, not closed):** if evidence appears that anonymous users
routinely spend the free reveal on suboptimal, non-blunder moves, the response is to *steer* users
toward blunders (copy/UI nudges — e.g. visually distinguishing which mistake is the blunder), never to
*restrict* which moves the reveal can be spent on.

**What shipped**: `docs/superpowers/specs/2026-07-13-anon-free-deep-reveal-design.md:41` edited to
remove the "blunders only" line and record this reversal trigger + response in its place. No server or
client code changed — `grep -rn "blunder" connect-four/server/index.js connect-four/src` around the
deep-reveal routes/components confirms no move-type check exists anywhere in the spend path (the only
existing localStorage gate in `anonDeepReveal.js` enforces the unrelated "exactly 1 free reveal" quota,
not a move-type restriction). `docs/epics/open-issues-epics.md` Epic 7's Settled Decision #5 already
carried this rationale correctly and needed no edit — verified, not duplicated.

## OI-116 — `saveLessonFile` read-modify-write race silently loses a generate-audio write

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

## OI-118 — Replace the hand-maintained `package.json` test lists with discovery; they fail silently in both directions

**Status**: open — proposed structural fix for the root cause behind OI-102
**Area**: `connect-four/package.json` — `test`, `test:fast`, `test:dom`;
`docs/architecture/testing-conventions.md` §"explicitly listed, no automatic discovery"
**Discovered**: 2026-08-02, while merging the Epic 1–4 and Epic 5–7 lanes

The three test scripts are single-line, space-separated, **glob-free** file lists maintained by hand.
That representation has no validation in either direction, and both directions are already broken:

- **Listed but missing.** `test:fast` contains `tests/unit/detectClaimodd.test.js`, which was deleted in
  commit `362afcd` ("bye bye claimodd"). `node --test` **ignores a non-existent path silently** when
  given a list — exit 0, no warning. This trap is already documented, with a measured table, at
  `docs/architecture/testing-conventions.md:176-185` ("A stale registration fails nothing"), and the
  entry has *still* been dead for months: a documented hazard that the representation keeps re-creating
  is the argument for removing the representation, not for documenting it harder.
- **Present but unlisted.** `tests/blunder/blunderTagConstraint.test.js` exists on disk and is in none of
  the three scripts, so it has never run — this is OI-102.

**The merge multiplier.** Because every lane appends to the same three single lines, this file conflicts
on *every* parallel-lane merge, and resolving it with `git checkout --ours`/`--theirs` silently
unregisters the other lane's entire test contribution. The 2026-08-02 two-lane merge required a
174-entry hand union of `test:fast` alone; a single slip there removes coverage with no error anywhere.
See `docs/architecture/parallel-lane-conventions.md` and the `merging-parallel-lanes` skill.

**Proposed fix**: replace the enumerations with directory/glob discovery (`node --test` supports glob
patterns, and `--experimental-test-module-mocks` can stay a flag). Discovery makes all three failure
modes structurally impossible: a new test file is picked up without a registry edit, a deleted one
cannot linger, and the file stops being a merge conflict surface entirely.

**Care required**: `test` and `test:fast` are deliberately *different* sets — `test:fast` omits
`tests/integration/candidate-generator.test.js`, which calls the real c4solver up to 400 times and hangs
on solver IPC deadlock (see `CLAUDE.md` §"Running tests"). Any discovery scheme must preserve that
exclusion — most simply by an explicit ignore/exclude rather than by an opt-in list. Confirm the
resulting counts against the pre-change baseline (currently `test` 125, `test:fast` 174, `test:dom` 19)
and against the known-red baseline in OI-82, and update
`docs/architecture/testing-conventions.md:174/187`, which currently documents the explicit-list rule and
its verification technique.

**Closes when shipped**: OI-102 (registration drift), and the `detectClaimodd` phantom entry above.

## OI-119 — `react-hooks/*` and `react-refresh/*` ESLint findings demoted to `warn`, not fixed (Epic 8)

**Status**: open — tracked for a future UI-behavior-change pass
**Area**: `connect-four/eslint.config.js` `src/**` block; the 14 `src/` production React files listed
below
**Discovered**: 2026-08-02, spec 055 (Epic 8: Dev Infrastructure & Test-Quality Baseline) T014/T015

FR-019(c) requires `npm run lint` to exit 0, but forbids fixing `react-hooks/*`/`react-refresh/*`
violations as part of this epic — actually fixing them means changing effect timing, ref usage, or
component/memoization boundaries, which is a behavior-affecting UI refactor out of scope for a
lint/test-infra epic. Instead, `eslint.config.js`'s `src/**` block demotes the six affected rules from
`error` to `warn` (with a one-line comment pointing at this issue), so `npm run lint` exits 0 while the
findings stay visible as warnings rather than being silently disabled.

**Fresh measurement** (`npx eslint . -f json`, post-split config, 2026-08-02) — 36 findings total, all
inside `src/` production React components:

| Rule | Count | Files:lines |
|---|---|---|
| `react-hooks/set-state-in-effect` | 21 | `src/App.jsx:65,138`; `src/components/admin/PuzzlePickerModal.jsx:33`; `src/components/CurationWorkspace.jsx:121`; `src/components/DeepRevealPane.jsx:140`; `src/components/RejectModal.jsx:19,23`; `src/lib/useGameBoard.js:118,124`; `src/lib/useLessonLockGuard.js:44`; `src/pages/AdminDeepRevealEvalPage.jsx:265,282,300`; `src/pages/AdminFvSuffPage.jsx:237,488`; `src/screens/AdminLessonEditorScreen.jsx:109`; `src/screens/AdminLessonListScreen.jsx:31`; `src/screens/CategoryListScreen.jsx:54`; `src/screens/MistakesListScreen.jsx:80`; `src/screens/PastGamesListScreen.jsx:185`; `src/screens/ReviewScreen.jsx:105` |
| `react-hooks/refs` | 5 | `src/lib/useBoardState.js:47,49,59`; `src/lib/useDragSplit.js:66,69` |
| `react-hooks/static-components` | 4 | `src/App.jsx:195,199,203,207` |
| `react-refresh/only-export-components` | 4 | `src/components/InfoProsePanel.jsx:24`; `src/context/DebugContext.jsx:32`; `src/screens/AdminLessonEditorScreen.jsx:35`; `src/store/ProfileStore.jsx:121` |
| `react-hooks/immutability` | 1 | `src/lib/useDragSplit.js:108` |
| `react-hooks/preserve-manual-memoization` | 1 | `src/pages/AdminFvSuffPage.jsx:531` |

(`react-hooks/exhaustive-deps`, 11 findings, is already `warn` by default in
`reactHooks.configs.flat.recommended` — not part of this demotion, not in scope for this issue.)

**Next step**: a future pass should burn these down file-by-file as an intentional UI-behavior change
(re-verify each fix against the app, not just the lint output — `set-state-in-effect` in particular
often signals a real render-loop or stale-state bug, not just a style nit), then re-promote the six
rules above back to `error` in `eslint.config.js`'s `src/**` block.

**Closes when shipped**: all 36 findings fixed and the six rules restored to `error`.

## OI-120 — `expandedCellsMap` is built but no longer consumed by `checkP2`

**Status**: ✅ RESOLVED 2026-08-03 — answered in the "missing coverage" direction: P2 now validates
every cell-bearing spec, and the orphaned map is gone. See "Resolution" at the end of this entry.
**Area**: `connect-four/server/annotationGate.js:476-486`
**Discovered**: spec 055 (Epic 8) code review, 2026-08-02

`checkP2(zones, expandedCellsMap)` never read its second parameter, so spec 055's FR-019(a)
`no-unused-vars` pass removed it from the signature (`annotationGate.js:126`). The call site at
line 486 still passes the map, and lines 476-480 still build it:

```js
// Build expandedCellsMap for P2 (and potential reuse by callers)
const expandedCellsMap = new Map();
... expandedCellsMap.set(spec, expandSpec(spec));
```

Two things are now true and neither is resolved: (a) the map is dead work — an `expandSpec()` call
per unique spec whose result nothing reads; (b) the comment says it exists "for P2", which raises the
real question of whether `checkP2` was *supposed* to consume it and silently does not — i.e. a latent
gap in the P2 annotation check, not merely dead code.

**Why deferred**: removing the argument orphans the map, which cascades into deleting the build block
— a behavior-adjacent change to server annotation-gate code, made at the end of an epic whose scope
was explicitly non-behavioral. More importantly, deleting it would *cement* possibility (b) rather
than answer it. The deadness is pre-existing; spec 055 only made it visible.

**If picked up**: first answer whether P2's check is correct without expanded cells — read
`checkP2` against what `expandSpec` produces — then either wire the map in (if P2 needs it) or delete
both the argument and the build block. See memory `project_annotation_gate_and_zones`.

**Resolution (2026-08-03)**: the owner confirmed P2 should validate cells as well as columns, so
possibility (b) was the answer — the check *was* incomplete. `checkP2` now expands every zone spec and
compares the prose's column references against **the set of columns the zone actually occupies**:

```js
const cells = expandSpec(spec);
if (cells.length === 0) continue;            // 'tg' (client-only) or invalid — P1's job
const specCols = new Set(cells.map(({ col }) => col + 1));
... if (!specCols.has(refColNum)) failures.push(`P2:col_mismatch:${spec}`);
```

This **generalises rather than special-cases**: for a `colN` zone the set is exactly `{N}`, so the old
behaviour falls out as an instance instead of a separate branch, and a multi-column zone (a horizontal
threat spanning `cells:c3r1..c6r1`) correctly accepts a reference to any column it covers.

`checkP2` now calls `expandSpec` itself rather than taking the caller's memo map, and the
`expandedCellsMap` build block in `validateAnnotation` was deleted — nothing else read it. That choice
is deliberate: the three pre-existing tests all passed `new Map()`, so a map-parameter fix would have
made every new assertion **silently vacuous** (empty map → no cells known → skip). Resolving cells
internally makes the check impossible to defeat by passing an empty map.

Proven non-vacuous: the new cell-zone assertions were run against the old `checkP2` and **2 of them
fail** there (single-cell mismatch, and the multi-column out-of-range case), then pass with the fix.
The existing fixture `{ spec: 'c4r3', innerText: 'column 5 is mentioned here' }` had been asserting the
gap as intended behaviour under the name *'non-col zone → skipped by P2'* — it is now inverted, since a
test that encodes the bug is part of the bug. `tests/annotationGate.test.js` 50/50; `test:fast`
1685/1690 (5 RED = unchanged OI-82 baseline); lint exit 0.

**Scope note**: `validateAnnotation` has **no production caller** — only `server/scripts/run_eval.mjs`
and `server/scripts/corpus_annotation_check.mjs` import it. So tightening P2 cannot reject a
user-facing explanation; it improves offline eval/corpus fidelity. Whether the gate *should* run on the
live deep-reveal path is a separate, larger question — see [[OI-124]].

## OI-121 — `ChallengeScreen` passes an `interactionMode` prop nothing consumes

**Status**: ✅ RESOLVED 2026-08-03 — both call sites deleted; `Board` stays presentational and the
parent keeps sole ownership of interaction semantics. See "Resolution" at the end of this entry.
**Area**: `connect-four/src/screens/ChallengeScreen.jsx:872,900`; `src/components/Board.jsx`
**Discovered**: spec 055 (Epic 8) code review, 2026-08-02

`ChallengeScreen` computes and passes, at two call sites:

```jsx
interactionMode={puzzles[currentIdx]?.interaction_mode === 'sequence' ? 'sequence' : 'single_move'}
```

`Board.jsx` destructured `interactionMode` but never read it, so spec 055's `no-unused-vars` pass
deleted the destructure. `Board.jsx` and `MultiMoveSequencer.jsx` now contain **zero** references to
the identifier, so both call sites pass a prop that is silently discarded.

This is a question, not just a wart: either sequence-mode interaction was meant to change `Board`'s
behavior and never got wired (a real feature gap), or it is handled entirely elsewhere and both call
sites plus the `interaction_mode` read are vestigial. The deadness pre-dates this epic — Board ignored
the prop before the destructure was removed.

**Why deferred**: answering it requires knowing the intended sequence-mode UX, which is out of scope
for a dev-infrastructure epic.

**If picked up**: trace how `interaction_mode === 'sequence'` puzzles actually render (start at
`MultiMoveSequencer.jsx` and the `usesAcceptedGate` path in `ChallengeScreen.jsx`), then either wire
the prop into `Board` or delete both call sites.

**Resolution (2026-08-03)**: traced, and it resolved to *delete*, on the following evidence.

This looked like a UX question ("should a sequence puzzle look different mid-entry?"), but that
presumes `Board` could show something different. It cannot, because **there is no mid-entry state**.
`handleSequenceClick` (`ChallengeScreen.jsx:629-680`) POSTs each click to
`/api/puzzles/:id/sequence/move` immediately, then rebuilds the whole board from the movestring and
pushes it down as ordinary props — first the user's disc, then the AI's reply after `COACH_PACING_MS`:

```js
const { board: bUser, heights: hUser } = buildBoard(userPos);
setBoard(bUser); setHeights(hUser); setLastDrop({ c: col, r: heights[col] });
```

No pending or uncommitted discs exist. From `Board`'s perspective a sequence puzzle is identical input
to a single-move puzzle, so the real question was architectural — *where does interaction semantics
live* — not visual.

`Board` is a controlled presentational component that owns no state a mode flag could change. The
parent already owns mode in exactly the two places that matter: click routing
(`interaction_mode === 'sequence' ? handleSequenceClick : …`, lines 857/887) and hint suppression
(line 938). `interactionMode` was a third, redundant encoding of that same fact handed to the one
component with no use for it, so both call sites were removed. The four legitimate `interaction_mode`
reads remain untouched.

**Why not wire it in instead**: if sequence discs ever need distinct rendering (numbering, say),
`Board` already serves that through generic composable props — `overlays`, `highlightedCells`, and the
numbered `moveLabels` map documented at `Board.jsx:97-99`. A mode enum would duplicate capability those
already provide *and* push a puzzle-category concept into a component that otherwise knows nothing
about puzzles, making it harder to reuse.

**What would overturn this**: sequence puzzles needing to show a move the server has not accepted yet
(optimistic entry, or multi-move-then-submit). That introduces genuine pending state — but it would be
a data-flow change in the parent, and `Board` would still receive it as `overlays`, not as a mode.

Verified: lint exit 0; `test:dom` 64/64; `test:fast` 1685/1690 (5 RED = unchanged OI-82 baseline).

## OI-122 — `server-conventions.md`'s CSP rationale still says Sentry has no `connect-src`

**Status**: deferred (doc staleness, not a defect; found during spec 055's CSP verification)
**Area**: `docs/architecture/server-conventions.md` §"CSP Directive Rationale"
**Discovered**: spec 055 (Epic 8) US3 CSP header verification, 2026-08-02

The section still states there is no `connect-src` entry for Sentry because no `Sentry.init(...)`
call exists. Both halves are now false: `connect-four/server/index.js:119` calls `Sentry.init(...)`,
and the live CSP header carries `https://*.ingest.sentry.io` — verified directly against both a local
production build and `https://decodec4.xyz/` on 2026-08-02.

The **header is correct**; only the prose explaining it is stale, which matters because that section
is the checklist future CSP work verifies against (spec 055 FR-013 used it as exactly that).

**Why deferred**: spec 055's US3 scope fence was the backlog entries and the header check itself; the
architecture doc was read-only reference for it.

**If picked up**: update the section to describe the Sentry `connect-src` entry and cross-reference
OI-10, using the verbatim header captured in OI-58's resolution note as the source of truth.

## OI-123 — `DebugTracePanel` crashes the admin curation page on older `debug_trace` rows

**Status**: deferred (pre-existing; found by spec 055 / Epic 8's QA smoke test, out of that epic's scope)
**Area**: `connect-four/src/components/CurationWorkspace.jsx:450-456` (`DebugTracePanel`)
**Discovered**: spec 055 (Epic 8) QA pass, 2026-08-02

Clicking **"▼ Debug trace"** on a candidate whose stored `debug_trace` lacks `temperature_p1` /
`temperature_p2` throws `TypeError: Cannot read properties of undefined (reading 'toFixed')` and
**blanks the page until reload** — there is no error boundary around the panel (React logs "An error
occurred in `<DebugTracePanel>`… consider adding an error boundary").

```jsx
const { temperature_p1, temperature_p2, termination, plies } = trace;
...
T₁ = {temperature_p1.toFixed(3)} &nbsp; T₂ = {temperature_p2.toFixed(3)}
```

Both fields are dereferenced unguarded. Reproduced live on an `immediate_threat` candidate. The cause
is a **data-shape mismatch, not a rendering bug**: rows written before temperature-based sampling was
introduced have no temperature fields, and nothing migrated or defaulted them — so this is the
"stored rows outlive the code that wrote them" class, and any fix should assume both shapes will
coexist indefinitely rather than assume a backfill.

**Why deferred**: genuinely pre-existing — verified that spec 055's only edits to this file
(commit `b84ac6e`, lines 1/70/163/273) are nowhere near `DebugTracePanel` at line 450. Epic 8's scope
was dev tooling, tests, and doc bookkeeping; fixing an admin-screen crash was not in it.

**If picked up**: guard both dereferences (`typeof temperature_p1 === 'number' ? …toFixed(3) : '—'`)
rather than backfilling, since old rows are legitimately temperature-less; then consider wrapping the
panel in the existing `ErrorBoundary` component (`src/components/ErrorBoundary.jsx`, already DOM-tested)
so a future field mismatch degrades instead of blanking the page. Admin-only, so user impact is low.

## OI-124 — the Deep Reveal annotation gate never runs on the live explanation path

**Status**: deferred (design question, not a regression; surfaced while resolving OI-120)
**Area**: `connect-four/server/annotationGate.js` (`validateAnnotation` and its P1/P2/P3/P5/P5-Strong/P6 checks)
**Discovered**: 2026-08-03, while fixing P2's cell-zone coverage gap

`annotationGate.js` is a complete, well-tested validator for the `[zone:...]` annotations the LLM
embeds in Deep Reveal explanations — it checks spec validity and bounds (P1), column-reference
consistency (P2), forbidden terminology (P3), that each zone has a live 4-window (P5), that zones fall
within the allowed set (P5 Strong), and that no raw coordinates leak into zone text (P6). It carries 50
unit tests and is listed in both `test` and `test:fast`.

**Nothing on the production request path imports it.** The only importers are
`server/scripts/run_eval.mjs` and `server/scripts/corpus_annotation_check.mjs`, both offline. Verified
by grepping the whole `server/` tree for `annotationGate` / `validateAnnotation` / `normalizeZoneTags` /
`checkP1` / `checkP5`: `server/index.js`, `llmCoachHelpers.js` and `explainContext.js` contain no
import (the single mention in `explainContext.js:966` is a comment about `checkP5Strong`).

So an explanation served to a user is **not** gated: a zone that highlights the wrong column, names a
dead window, or leaks raw coordinates reaches the UI unchecked. Every improvement to these predicates
(including OI-120's P2 fix) currently buys offline eval fidelity only.

**The live path replaced it rather than dropping it.** `/api/explain-move-llm` now runs
`computeMechanism(...)` (`server/index.js:1319`), and the code's own comment at :1358-1360 says the
mechanism text — "coach-voice text carrying inline `[zone:…]` tags (→ board highlights via
`<AnnotatedExplanation>`)" — "drops straight into the response as `explanation`". So the tags are
rendered to the board without ever being validated.

**Corollary — a debugging trap**: `deep_reveal_failures` is still written (`index.js:1341`), which makes
it look like gate failures are being captured. They are not. It fires only on
`result.callError || result.parseError || !result.mechanism`, storing
`failure_reason: result.callError ?? result.parseError ?? 'empty mechanism'`. Querying that table for
`P5strong:*` codes will always return nothing — which reads as "the gate is passing" when the gate
never ran.

**Why deferred**: wiring a validator into the live path is a product decision with real failure-mode
choices — on failure, do you strip the annotations, retry the LLM, serve the un-annotated text, or
fail the request? Each has a different latency and UX cost, and the cache path complicates it further
(`explanation_cache` can serve rows produced before any gating existed — see memory
`project_blunder_serving_dual_paths`, where cache-hit responses already bypass producer guards).

**If picked up**: first measure how often the gate would actually fail on real served explanations —
run `corpus_annotation_check.mjs` over recent `explanation_cache` rows to get a failure rate before
designing the enforcement. A gate that fires on 30% of live output needs a different answer than one
that fires on 0.5%. Then decide strip-vs-retry-vs-passthrough, and note that sanitising at the response
seam (as OI's on the dual-path serving recommend) covers both the fresh and cached paths at once.

---

## OI-125 — "mistake counts include suboptimal" is load-bearing but unnamed: every identifier says `blunder`, and only one of the five sites is test-guarded

**Status**: open (latent regression risk; the behavior is currently CORRECT everywhere)
**Area**: `connect-four/server/blunderCountsForGames.js`, `server/index.js` (`/api/games`, `/api/coach/category-counts`, `/api/coach/queue`, both `summaryPhraseKey` branches), `src/screens/PastGamesListScreen.jsx`, `src/i18n/*.json`
**Discovered**: 2026-08-03, while re-verifying `new_TODOs #16` ("'no mistakes' must not mean 'no blunders'") before deleting it from the backlog

`new_TODOs #16` asked to "modify the number of mistakes to be the number of blunders + sub-optimal
moves". That item was closed correctly — but **not** by changing a count. The premise was already
false: the `blunders` table stores *both* severities (`quality ∈ {'blunder','suboptimal'}` — the only
two values present in the local DB), so every count over that table was already a **mistake** count.
Spec 042's real fix was narrower (copy that asserted flawlessness on a lost game). Verified live on
2026-08-03: a papergames game with **0 blunder-quality rows and 7 suboptimal rows**
(`73881223-0001-4e59-a10e-e78553c8261b`) returns `blunder_count: 7` from `GET /api/games` and renders
"**7 mistakes**" in Past Games; a 3-blunder/9-suboptimal game renders "12 mistakes".

**The defect is that the invariant has no name and almost no guard.** The rule — *never filter
`blunders` by `quality` when counting mistakes* — is what makes all of this correct, yet every
identifier in the stack says "blunder" while meaning "mistake":

| Layer | Identifier | Actual meaning |
|---|---|---|
| DB | table `blunders` | all mistakes, both severities |
| Wire | `blunder_count` (`index.js:2153`, `:2170`) | blunders + suboptimal |
| Sort | `sort=worst_blunders` | worst *mistakes* |
| Filter | `hasBlunder` / `?has_blunder` | has *any* mistake |
| i18n | `games.no_blunders` | renders "No mistakes" (`en.json:201`) |
| i18n | `games.filter_has_blunder` | renders "With mistakes" (`en.json:189`) |

So the **label** already says "mistakes" while the **key** says "blunder" — the naming drift is
baked into the translation files too.

**Only one of the five quality-agnostic sites is test-guarded.**
`tests/unit/blunderCountsForGames.test.js:94-112` explicitly asserts
`supabase.calls[0].filters.quality === undefined` with the comment "the count() query must never
filter on quality". Good. But grepping `tests/` and `server/tests/` for `category-counts` /
`categoryCounts` / `summaryPhraseKey` returns **nothing**, so these carry the invariant on a code
comment alone:

- `/api/coach/category-counts` (`index.js:2758-2764`) — comment: "no `quality` filter added (FR-008)
  — blunder- and suboptimal-quality rows are both counted."
- `/api/coach/queue`'s `applyFilters` (`index.js:2840-2855`) — filters on `resolved_at`,
  `pattern_category`, `game_id`, `papergames_game_id`; the *absence* of a `quality` filter is
  unremarked and unasserted.
- `summaryPhraseKey`, **duplicated in two branches** — the cached branch (`index.js:2259-2261`) and
  the fresh-analysis branch (`index.js:2500-2502`), each independently written as
  `(blunderCount === 0 && suboptimalCount === 0) ? '…review.clean' : '…review.mistakes'`. Two copies
  of the same rule, neither covered by a test: fixing one and missing the other silently restores
  "Clean game. Nothing to revisit." on a game with 9 suboptimal moves.

**Why this is a real trap and not just cosmetics**: the names actively invite the regression. A
future endpoint that needs "how many *blunders*" will reasonably add `.eq('quality','blunder')`, and
on a `blunder_count`-named field that reads like a bug fix, not a behavior change. Because `/mistakes`
category cards, the Past Games chip, the `has_blunder` filter and the review summary are computed by
four *independent* queries rather than one shared helper, they can silently disagree — one surface
saying "7 mistakes" while another says "No mistakes" for the same game, which is exactly the
user-visible symptom `new_TODOs #16` complained about.

**If picked up**: don't mass-rename (`blunder_count` is a wire field with a frontend consumer at
`PastGamesListScreen.jsx:110-117`, and `spec 042 FR-007` deliberately froze the wire name). Cheaper
and stronger: (1) add the missing tests — one asserting no `quality` filter reaches the
category-counts and coach/queue queries, and one table-driven test pinning **both** `summaryPhraseKey`
branches so `0 blunders + N suboptimal` never yields the `clean` pool; (2) collapse the duplicated
`summaryPhraseKey` expression into one shared helper so there is a single place to get it wrong;
(3) record the vocabulary in `docs/architecture/data-model.md` — "`blunders` = all mistakes;
`quality` is the severity" — so the next reader doesn't have to infer it from five comments.

---

## OI-126 — the response-boundary guard strips `cXrY` but not bare or ranged column tokens, so `c3-c6` reaches the player

**Status**: open (live defect, reproduced on a served explanation)
**Area**: `connect-four/server/reasonRenderGuard.mjs`
**Discovered**: 2026-08-03, spec 042 manual QA T048 (`agentic_QA_2026-08-03-1208.md`, finding 1)

Spec 042 US5 (FR-017/FR-018/FR-019, QA:minor F) requires that no raw internal coordinate token reach
player-facing prose. The guard implements this with exactly one coordinate rule
(`reasonRenderGuard.mjs:25`):

```js
const CXRY_RE = /\bc(\d+)r\d+\b/gi;
```

It only matches the **paired** `c<col>r<row>` form. A **bare** column token (`c3`) or a **range**
(`c3-c6`) matches neither it nor `LABEL_PREFIX_RE`, so `stripInternalTokens` returns it untouched.

**Reproduced live**, free tier, `POST /api/explain-move-llm` on blunder
`455c5272-3143-43d4-aa3f-c10f9d061666` (category `forced_win`, Move 8/28, Gray). Served text:

> "You needed to keep the deep parity fight alive on the lower side, where your support for the
> **c3-c6** line still matters."

**The guard's placement is right; only its coverage is wrong.** `stripInternalTokens` is correctly
installed at the single response seam (`guardExplainMovePayload` / `guardExplainMoveLlmPayload`), so
it already covers the cache-hit, not-a-blunder, and fresh-generation branches alike — the fix belongs
in the regex, not in the wiring.

**Nothing upstream or downstream catches it either:**
- The prompt *does* instruct against it — `llmCoachHelpers.js:804`: *"The display text inside the tags
  MUST use natural language — never raw coordinates like c4r3 or col5"* — but that is advisory, and
  the model emitted a shape (`c3-c6`) that neither of the two cited examples covers.
- Per **OI-124**, the annotation gate never runs on the live path, so it cannot backstop this.

**If picked up**: widen the coordinate rule to cover a bare column token and a range, rewriting to the
localized "column N" the `cXrY` branch already produces (`serverT(locale,'column')`). Two cautions:
(1) rewrite each endpoint of a range separately so `c3-c6` becomes "column 3-column 6" only if that
reads acceptably — a range may deserve its own "columns 3 through 6" phrasing; (2) keep the match
word-bounded and digit-anchored so ordinary prose is untouched. Add a guard unit test per shape
(`c3`, `c3-c6`, `col5`) — the existing suite pins only `cXrY`, which is why this shipped.

---

## OI-127 — SplitReveal's board-zoom freeze was reverted in code, but the contract, the function name and the unit test all still assert the freeze (and that test is vacuous)

**Status**: open (no user-facing defect believed; documentation + test-integrity defect)
**Area**: `connect-four/src/components/SplitReveal.jsx`, `src/lib/useDragSplit.js`,
`connect-four/tests/unit/splitRevealZoom.test.js`,
`specs/042-mistake-review-unification/contracts/split-reveal-zoom-contract.md`,
`specs/042-mistake-review-unification/quickstart.md`
**Discovered**: 2026-08-03, spec 042 manual QA T058 (`agentic_QA_2026-08-03-1208.md`, finding 3 + Blocked)

Spec 042 US6 / FR-022 / SC-009 required the board's `maxWidth` to be **frozen** at the split-pane's
open-time split so dragging the divider never re-zooms the board (`new_TODOs #7`). **That freeze has
since been deliberately reverted**, but four artifacts still assert it.

**The code says the freeze was the bug.** `SplitReveal.jsx:49-72` derives `boardW` from the **live**
`splitPct` and states verbatim:

> "Supersedes spec 042 US6 (FR-022, SC-009, contracts/split-reveal-zoom-contract.md §2), which FROZE
> boardW to the open-time split to stop the board zooming during a drag. That freeze is the root cause
> of the reported bug: once the pane got short … the frozen height-derived cap either clipped a
> fixed-size square or was dropped entirely (`constrain === false`), leaving `width: 100%` to blow the
> board up to full screen width."

It now uses `Math.max(computeFrozenBoardWidth(containerH, splitPct), MIN_BOARD_W)` with
`MIN_BOARD_W = 120`, so the cap is never dropped to full-bleed.

**Four artifacts contradict that:**

1. **The contract claims the opposite outcome.** `split-reveal-zoom-contract.md`'s spec-055 T026
   annotation says the freeze *shipped*: "`boardW` is now computed by
   `computeFrozenBoardWidth(containerH, initialSplitPct, isDragging)` … and **frozen in a ref**,
   decoupled from live drag state, exactly as this contract's 'Required behavior' section specifies."
   The component does not freeze it in a ref and is not decoupled from live drag state. Two documents
   each labelled "SUPERSEDED", pointing in opposite directions — the code wins, the contract is wrong.
2. **The unit test is vacuous.** `splitRevealZoom.test.js:22-36`'s "invariant across the full simulated
   drag range" loop calls `computeFrozenBoardWidth(CONTAINER_H, INITIAL_SPLIT_PCT, true)` with
   **identical arguments on every iteration** (the loop variable is explicitly discarded:
   `void simulatedSplitPct; // not a valid input to the frozen function — that's the point`) and
   asserts the results are equal. That is `f(a,b,c) === f(a,b,c)` — true for any pure function, and it
   cannot fail regardless of implementation. Critically, the drag-zoom behavior now lives in the
   **caller** (which passes live `splitPct`), so this test could never have detected the reversal.
3. **The function name and JSDoc lie about usage.** `computeFrozenBoardWidth`'s second parameter is
   documented as "`initialSplitPct` - top-pane percentage at open time (pre-drag)", but the sole caller
   passes the live `splitPct`. Its third parameter `isDragging` is dead, carrying an
   `// eslint-disable-line no-unused-vars`.
4. **`quickstart.md` US6 step 3 is unrunnable as written** — "confirm the board's zoom level stays
   constant across the full drag range" now asserts behavior the code deliberately does not have. A
   future QA pass will log a false failure (this one nearly did).

**What actually guards the current behavior**: `tests/dom/SplitRevealZoom.dom.test.jsx` (spec 055
T027-T029) asserts the real post-revert invariant — the board stays inside the pane and a numeric
`maxWidth` cap is always present, because "an empty/absent maxWidth means SplitReveal fell back to
width: 100% — the bug". That test is correct and should be treated as the contract.

**Also blocking manual verification**: the divider is a bare `div` styled `cursor: row-resize` with no
`role`/`aria-label`, so the CDP `drag` tool has no uid to target, and synthetic `PointerEvent`
sequences gave contradictory results across runs (board 181.2px → 126.0px in one attempt, unchanged
through a 200px drag in the next). No automated drag verdict is currently possible.

**If picked up**: (1) rewrite the contract's "Required behavior" to the shipped rule (width tracks the
live split; never full-bleed; `MIN_BOARD_W` floor) instead of the freeze; (2) delete or rewrite
`splitRevealZoom.test.js`'s first case — a tautology is worse than no test, since it reads as coverage;
(3) rename `computeFrozenBoardWidth` → e.g. `computeBoardWidthForSplit` and drop the dead `isDragging`
param; (4) fix `quickstart.md` US6 step 3; (5) consider a `role`/`data-testid` on the divider so the
drag becomes automatable.

---

## OI-128 — the mistake-detail Prev/Next stepper does not update the URL, so a reload silently shows a different mistake

**Status**: open (minor; reload/share correctness)
**Area**: `connect-four/src/screens/MistakeDetailScreen.jsx` (the `Prev`/`Next` handlers behind the "N of M" stepper)
**Discovered**: 2026-08-03, spec 042 manual QA T032 (`agentic_QA_2026-08-03-1208.md`, finding 2)

Spec 042 US2 makes a mistake permalink reload-safe on the way *in*: cold-booting
`/blunder/<id>` reconstructs the correct "Move N / M" header, "X of Y" stepper and all three actions.
That guarantee is lost as soon as the user steps.

**Reproduced**: open `/blunder/fdb371b7-2e18-4c37-8ac6-4e039efc4480` → `Move 16 / 29`, `6 of 12`,
BLUNDER. Click **Prev** → the screen correctly advances to `Move 14 / 29`, `5 of 12`, SUBOPTIMAL, **but
the address bar still reads `/blunder/fdb371b7…`**. Reload → the screen returns to `Move 16 / 29`,
`6 of 12` — a *different* mistake from the one that was on screen.

So the URL identifies the mistake the user *entered* on, not the one they are looking at. Copying the
link mid-review shares the wrong position, and the browser Back button skips the intra-screen steps
entirely.

**Not a spec-042 acceptance failure.** US3's stepper requirement targets the **ReviewScreen** stepper,
which *does* navigate per mistake (verified: chip and Prev/Next both push `/blunder/<id>`). This is the
`MistakeDetailScreen`'s own stepper, which the spec never required to be URL-backed — hence "open", not
"regression".

**If picked up**: mind the interaction with the deliberate Back semantics — `MistakeDetailScreen.jsx:165-176`
comments that this screen is *pushed* onto history from the screen it should return to, so Back must
**pop** (`goBack`/`window.history.back`) rather than push a fresh entry. Stepping should therefore
**replace** the history entry (`history.replaceState`-style), not push one per step; pushing would
restore the ping-pong Back behavior that `new_TODOs #23` was filed for.

---

## OI-129 — deep-reveal prose names board regions that carry no zone annotation, so they cannot be highlighted

**Status**: open (minor; highlight integrity)
**Area**: deep-reveal prompt / `[zone:…]` annotation coverage — `server/llmCoachHelpers.js` (offered-zone builder), `src/components/AnnotatedExplanation.jsx`
**Discovered**: 2026-08-03, spec 042 manual QA T058 (`agentic_QA_2026-08-03-1208.md`, finding 4)

On blunder `a5599ee3-a5f9-404f-b284-014562c6a35e` (`double_threat`, Move 12/31, Gray) the served
explanation names **four** board regions:

> "You played into the one spot that lets your opponent make a 7-shaped double threat on **the bottom
> row** … you cannot block **both winning squares**. The tougher defense was to play **column 7**,
> which takes away that exact bottom-row finish and denies your opponent the fork at **column 6**."

Only **"column 7"** and the term "7-shaped double threat" render as interactive annotated spans.
"column 6" — the fork column the sentence is actually about — and "the bottom row" are plain prose and
highlight nothing. The reader is told to look at a column the board never points to.

**Highlighting itself is working** (this is a coverage gap, not a broken mechanism): "column 7" is
default-active and draws its capsule at `x = 163.146`, exactly column 7's measured centre — no
off-by-one — and clicking the span toggles it off and on.

**Why nothing catches it**: per **OI-124** the annotation gate never runs on the live path, so an
explanation that annotates one of four named regions is served unchallenged. The offline gate's P5/P6
predicates check that *emitted* zones are valid — not that every region *mentioned in prose* got a
zone, which is the missing predicate here.

**If picked up**: this is plausibly a prompt-side fix (instruct the model that every board region it
names must carry a `[zone:…]`) rather than a render-side one, but it needs a measured failure rate
first — sample recent `explanation_cache` rows for named-region-without-zone before designing
enforcement, the same sequencing OI-124 recommends.
