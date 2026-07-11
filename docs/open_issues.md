# Open Issues

A human-triageable backlog of known-but-deferred issues: latent bugs, quality gaps, and
scoped-out work that we've consciously decided *not* to fix yet. Distinct from auto-memory
(which holds trigger-first gotchas that ambush an agent editing the relevant code) — this file
is the browsable list of "things we know are wrong and might fix later."

Each entry: what's wrong, why it's deferred, where it lives, and a concrete repro if we have one.

---

## OI-1 — Single-answer puzzle categories score by solver-score, not by pattern (score-tie ≠ pattern-tie)

**Status**: deferred (out of scope for spec 044; explicitly untouched per FR-014/FR-015b)
**Area**: client-side puzzle scoring — `src/screens/ChallengeScreen.jsx`, `server/moveQualityScorer.js` (`scoreMove`)
**Discovered**: spec 044 QA (2026-07-11)

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

**Status**: deferred (empirical gate satisfied for the shipped scope, but narrow)
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

**Status**: deferred (standing gap, not a blocker for any single feature)
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
