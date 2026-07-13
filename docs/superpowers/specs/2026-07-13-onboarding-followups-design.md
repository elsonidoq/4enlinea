# Onboarding follow-ups — design

**Date:** 2026-07-13
**Branch:** feature/polish
**Scope:** Three small follow-ups to the onboarding experience (spec 048): make the coach
speak on the mission screen, route the onboarding sparring game-end through the post-game
review, and make anonymous sparring games migrate into the account on sign-up.

All three findings below were verified firsthand against current code (line numbers current
as of this date).

---

## Feature 1 — Coach speaks on the onboarding mission screen

### Goal
When the user arrives on `OnboardingMissionScreen`, the coach audibly speaks the greeting
("Hi, I'm your coach. Here's how we'll make you dangerous at Connect Four.").

### Why it's silent today
- `OnboardingMissionScreen.jsx:71-78` renders `<CoachDialog>` with text from
  `onboarding.mission.coachLead` / `onboarding.mission.coachText`, and imports no speech hook.
- `CoachDialog` never plays audio on its own; it only renders a 🔁 replay button (gated on
  `onReplay && hasNarration`).
- Speech is done by the parent via `useCoachSpeech().speakCoachMessage(i18nKey)` — it maps
  key→slug, and **only plays a slug present in the approved manifest**
  (`public/audio/coach/coach-audio-manifest.json`).
- `connect-four/scripts/generate-tts.js` scans en.json but keeps **only** keys under the
  top-level `coach.*` namespace (`flattenKeys(enRaw, 'coach.')`). The greeting lives under
  `onboarding.mission.*`, so it is never scanned, never generated, never in the manifest.

### Design
1. **Add one `coach.*` audio key.** Add `coach.onboardingMission.greeting` to `en.json` and
   `es.json` (kept in lockstep by `tests/unit/i18nKeyParity.test.js`). Its value is the full
   spoken greeting — the concatenation of the two displayed sentences so audio and on-screen
   text agree:
   - en: `"Hi, I'm your coach. Here's how we'll make you dangerous at Connect Four."`
   - es: the existing Rioplatense voseo equivalents of `coachLead` + `coachText`, concatenated.
   - **Sync note:** if `onboarding.mission.coachLead/coachText` ever change, this greeting key
     must be updated and re-synthesized. Call this out in the plan.
2. **Keep the visual bubble unchanged.** `CoachDialog` continues to display the existing
   `coachLead` (lead) + `coachText` (body). Only the *audio* uses the new combined key. No
   change to `CoachDialog`.
3. **Wire the mission screen to speech.** In `OnboardingMissionScreen`:
   - `const { speakCoachMessage } = useCoachSpeech();`
   - On mount, `speakCoachMessage('coach.onboardingMission.greeting')` — mirror
     `GameScreen.jsx:158-160`. Guard against React 18 StrictMode double-invoke with a ref
     (the screen already uses `startedRef` for its analytics event — use the same pattern).
   - Optionally pass `onReplay` to `CoachDialog` so the replay button appears. (YAGNI-optional;
     include only if trivial.)
4. **Owner/manual step — generate + approve the audio (called out explicitly).**
   `speakCoachMessage` no-ops gracefully until the slug is approved, so the code can ship and
   stay silent until this step runs:
   - Owner runs `connect-four/scripts/generate-tts.js` (real OPENAI/TTS key is present in
     `connect-four/server/.env`, so generation works locally).
   - Owner approves the new slug in `/admin/audios` (`GET /api/admin/audio/status` reads
     `server/tts-registry.json`; approval writes the slug into
     `public/audio/coach/coach-audio-manifest.json` via `writeTtsManifest`).
   - This produces committed artifacts: the generated `.mp3` under `public/audio/coach/` and
     the new manifest entry. The plan must not silently assume the slug is already approved.

### Testable seam
- `i18nKeyParity.test.js` enforces the new key exists in both locales.
- The speak-on-mount wiring is JSX + audio → not unit-testable here; covered by manual QA.

---

## Feature 2 — Onboarding game-end goes through review

### Goal
When the onboarding sparring game ends, the user lands on the post-game review screen (to see
their mistakes) **and then** continues to the import offer. The import offer (a deliberate
spec-048 onboarding step) must not vanish.

### Current behavior
- `GameScreen.jsx:106`: `goReplace(pickGameEndScreen(onboarding), { id: gameId })`.
- `src/lib/onboardingGameEnd.js`: `pickGameEndScreen(onboarding) => onboarding ?
  'onboardingImportOffer' : 'review'`. Onboarding currently **skips review** and goes straight
  to the import offer.
- `ReviewScreen({ go, goBack, id })` analyzes via `POST /api/games/analyze` (by `id`). The
  analyze endpoint **allows anonymous `user_id:null` sparring games** (gate at
  `server/index.js:2065-2072`: a null-`user_id` game passes for anyone). At onboarding-review
  time the user is still anonymous (sign-up happens later, at the import offer), so review
  works.
- **ReviewScreen has no forward/continue CTA** — its only exit is the TopBar back button
  (`onBack={goBack}`). So sequencing review → import offer requires review to know it's an
  onboarding session and render a forward affordance.

### Design (decision: **review → then import offer**, as a sequence)
1. **Route the game-end to review for everyone.** `pickGameEndScreen` no longer needs to
   branch on `onboarding` for the *destination* — both paths return `'review'`. Simplify the
   function accordingly (or inline it) and update `tests/unit/onboardingGameEnd.test.js` to
   assert `'review'` for both onboarding and non-onboarding.
2. **Carry the onboarding flag into review.** `GameScreen.saveGame` passes the flag forward:
   `goReplace('review', { id: gameId, onboarding })`. The router already forwards named nav
   params (it forwards `id`), so `ReviewScreen` destructures `onboarding` from its props.
3. **Add an onboarding-only forward CTA in ReviewScreen.** When `onboarding` is set, render a
   primary "Continue" button (bottom of the screen) that calls `go('onboardingImportOffer')`.
   Non-onboarding review is unchanged (no CTA; back button only). This is the single UI
   addition. Use existing button styling from the screen; add an i18n key for the label in
   both locales (e.g. `review.onboardingContinue`).
4. **Import offer unchanged.** `onboardingImportOffer` screen already exists and handles the
   sign-up prompt; it is simply reached one step later in the flow.

### Resulting onboarding arc
mission (coach speaks) → sparring game → **review (see mistakes)** → import offer (sign up) →
game now in Past games.

### Testable seam
- `pickGameEndScreen` stays a pure, unit-tested function (now returns `'review'` for both).
- The review CTA + forward routing is JSX → manual QA.

---

## Feature 3 — Anonymous sparring games migrate to the account

### Goal
After an anonymous user signs up, the sparring games they played appear in **Past games** —
the same "your progress follows you" promise as challenges and lessons.

### Decision: **Option A — server-side re-association** (chosen over in-browser replication)

Rationale: the finished game is **already written to the server** for all users (anon rows
have `user_id: null`, keyed by `device_uuid`). The migrate endpoint already knows both the
new `user_id` and can receive the client's `device_uuid`. Re-associating is a single UPDATE —
no new IndexedDB store, no dual-write, and Feature 2's analyze-by-id keeps working unchanged
because the game never leaves the server. Option B (replicate games into IndexedDB) was
rejected: it creates two sources of truth and still needs a server row for analyze-by-id, for
strictly more surface area and no user-visible benefit.

### Current behavior (verified)
- `GameScreen.jsx:72-83` POSTs `/api/games` for all users; server writes
  `user_id: req.user?.id ?? null, device_uuid` (`server/index.js:1804-1805`). The anon
  `device_uuid` is the client's `store.getProfile().device_uuid`.
- `games` table (`migration 026_games.sql`) has both `user_id uuid ... ON DELETE SET NULL`
  and `device_uuid text NOT NULL`, with index `idx_games_device_created (device_uuid,
  created_at)` — which supports the re-association WHERE.
- `IndexedDBStore.migrateToSupabase` → `POST /api/user/migrate` (allowlist: `puzzle_attempts,
  session_stats, lesson_progress, sparring_record, streak, onboarding_status`). It **never
  touches `games`** and nothing re-keys anon `device_uuid` rows.
- `GET /api/games` 401s anon and filters `.eq('user_id', signed-in id)`, so an anon
  `user_id:null` game never appears — even after sign-up — until re-associated.

### Design
1. **Client sends its `device_uuid` in the migrate body.** `migrateToSupabase` already reads
   the profile (`getProfile()` for `onboarding_status`); add `device_uuid: profile?.device_uuid`
   to the `POST /api/user/migrate` payload.
2. **Server re-associates games atomically within migrate.** In `/api/user/migrate`
   (`userRoutes.js`), add to the existing `operations[]` array (so it shares the all-or-nothing
   `Promise.all`):
   ```sql
   UPDATE games SET user_id = <req.user.id>
     WHERE device_uuid = <body.device_uuid> AND user_id IS NULL
   ```
   **Critical:** key on `body.device_uuid` (the client's, used when the anon rows were
   written), **not** the endpoint's locally-derived `deviceUuid` (which for a brand-new user
   is freshly generated and would not match the anon rows). Only run the UPDATE when
   `body.device_uuid` is a non-empty string; a missing value is a silent no-op (must not fail
   the rest of the migration).
3. **Scope: sparring `games` only.** Do **not** touch `papergames_games` — anonymous users
   don't import Papergames games (that flow requires an account), so there are no anon
   `papergames_games` rows to claim.
4. **No IndexedDB change, no `GET /api/games` change.** Past games remains account-gated; the
   re-keyed game simply appears there after sign-up. No change to `games` write path at play
   time.

### Trust / safety
`device_uuid` is client-supplied — the same trust model the migrate endpoint already uses for
`puzzle_attempts` etc. A malicious client could pass another device's uuid to claim its
**unclaimed** anon games; the `user_id IS NULL` guard limits impact to orphan anon sparring
rows, and this is accepted as consistent with the existing migrate trust model. Not in scope
to harden further.

### Testable seam
- Server-side: unit/integration test the re-association — a game with matching `device_uuid`
  and `user_id IS NULL` is re-keyed to `req.user.id`; a game with a different `device_uuid`
  or an already-owned game is left untouched; a missing/empty `body.device_uuid` is a no-op.

---

## QA & verification (must be phases in the plan)

1. **End-to-end QA in a clean/incognito Chrome profile** (via the app-qa skill; check ports
   3001/5173 before starting a dev server so onboarding_status is `not_encountered` and there
   is no session). Cover:
   - Coach **speaks** the greeting on mission-screen arrival (after the owner audio step).
   - Onboarding game ends → lands on **review** with mistake analysis.
   - **Continue** from review → **import offer** still reachable.
   - Sign up → the onboarding sparring game now appears in **Past games**.
2. **Regression: existing migration still works (empirical, not code-reading).** As an
   anonymous user, complete a challenge (puzzle) and a lesson; confirm they land in the
   IndexedDB `puzzle_attempts` / `lesson_progress` stores; then sign up and confirm they
   migrate server-side (verify via DB rows for the new `user_id` and/or the in-app
   stats/lessons screens). This guards against the games change breaking existing migration.

---

## Out of scope (YAGNI)
- No IndexedDB games store; no dual-write.
- No change to the anon `POST /api/games` write path.
- No `papergames_games` re-association.
- No two-clip / sequential coach audio (one combined greeting clip).
- No hardening of the client-supplied `device_uuid` trust model beyond the existing one.
