# Onboarding Follow-ups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the onboarding coach speak on the mission screen, route the onboarding sparring game-end through the post-game review before the import offer, and re-associate anonymous sparring games to the account on sign-up so they appear in Past games.

**Architecture:** Three independent slices. (1) A new `coach.*` i18n key + `useCoachSpeech` wiring makes the mission screen speak (audio produced by an owner-run TTS step). (2) `pickGameEndScreen` now returns `'review'` for everyone; the `onboarding` flag rides into `ReviewScreen`, which shows an onboarding-only "Continue" CTA that advances to the existing import-offer screen. (3) A single `UPDATE games SET user_id=… WHERE device_uuid=… AND user_id IS NULL` inside the existing `/api/user/migrate` flow claims the anonymous game rows (which are already on the server); no IndexedDB change.

**Tech Stack:** React (Vite) frontend under `connect-four/src`; Express + Supabase (Postgres) server under `connect-four/server`; tests via `node --test` (`npm run test:fast` from `connect-four/`).

**Design doc:** `docs/superpowers/specs/2026-07-13-onboarding-followups-design.md`

## Global Constraints

- Run tests with `npm run test:fast` from inside `connect-four/` (never full `npm test` — it hangs on solver IPC). Individual `node --test <file>` is fine per-step.
- Any i18n key added to `en.json` MUST be added to `es.json` with the same key path (enforced by `tests/unit/i18nKeyParity.test.js`).
- Spanish (`es.json`) MUST be Rioplatense voseo — reuse the existing verified strings given verbatim in this plan; do not re-translate.
- Row/column and player conventions are irrelevant here (no board logic touched).
- `device_uuid` is client-supplied; re-association keys on the **client's** `device_uuid` sent in the migrate body, NOT the endpoint's locally-derived `deviceUuid`.
- Commit after each task (frequent commits).

---

## File Structure

- `connect-four/server/userRoutes.js` — add games re-association to the `/api/user/migrate` handler. (modify)
- `connect-four/server/userEndpoints.test.mjs` — add re-association tests to the existing `POST /api/user/migrate` describe block. (modify)
- `connect-four/src/store/IndexedDBStore.js` — add `device_uuid` to the migrate POST body. (modify)
- `connect-four/src/lib/onboardingGameEnd.js` — `pickGameEndScreen` returns `'review'` for both cases. (modify)
- `connect-four/tests/unit/onboardingGameEnd.test.js` — update assertions to expect `'review'` for onboarding. (modify)
- `connect-four/src/screens/GameScreen.jsx` — pass `onboarding` into the review nav params. (modify, line ~106)
- `connect-four/src/screens/ReviewScreen.jsx` — accept `onboarding` prop; render an onboarding-only "Continue" CTA → `onboardingImportOffer`. (modify)
- `connect-four/src/i18n/en.json` + `es.json` — add `coach.onboardingMission.greeting` and `review.onboardingContinue`. (modify)
- `connect-four/src/screens/OnboardingMissionScreen.jsx` — wire `useCoachSpeech` + speak the greeting on mount. (modify)
- Owner/manual: `connect-four/scripts/generate-tts.js` run + `/admin/audios` approval → produces committed `.mp3` under `public/audio/coach/` and a manifest entry in `public/audio/coach/coach-audio-manifest.json`.

---

## Task 1: Feature 3 — Re-associate anonymous sparring games on migrate

**Files:**
- Modify: `connect-four/server/userRoutes.js` (the `app.post('/api/user/migrate', …)` handler, ~lines 465-550)
- Modify: `connect-four/server/userEndpoints.test.mjs` (inside `describe('POST /api/user/migrate', …)`, after the existing tests ~line 1131)
- Modify: `connect-four/src/store/IndexedDBStore.js` (`migrateToSupabase`, ~lines 263-278)

**Interfaces:**
- Consumes: the existing test harness in `userEndpoints.test.mjs` — `createApp(supabase, authMiddleware)`, `request(app, method, path, { body })`, `authMiddleware` (sets `req.user = { id: 'user-abc-123', device_uuid: 'dev-xyz-456', … }`).
- Produces: `/api/user/migrate` now honors a `device_uuid` body field and, when present and non-empty, issues `supabase.from('games').update({ user_id }).eq('device_uuid', <body.device_uuid>).is('user_id', null)` as part of the atomic `operations[]`. The client (`migrateToSupabase`) sends `device_uuid: profile?.device_uuid` in the body.

- [ ] **Step 1: Write the failing tests**

Add these three tests inside the `describe('POST /api/user/migrate', …)` block in `connect-four/server/userEndpoints.test.mjs`, right after the "skips empty arrays" test (before the `// ── T022 …` comment at ~line 1133):

```javascript
  // ── Feature 3: anonymous games re-association ─────────────────────────────
  // The client sends its own device_uuid; the endpoint re-keys any anon game
  // rows (user_id IS NULL) with that device_uuid to the signed-in user.

  /** users-table stub that accepts the onboarding conditional-update chain and a
   *  plain update().eq() (sparring_record/streak/onboarding), plus a games-table
   *  stub that records the update payload + filters. */
  function buildGamesMigrateSupabase() {
    const calls = { gamesUpdate: null, gamesEqDeviceUuid: null, gamesIsUserId: undefined };
    const supabase = {
      from: (table) => {
        if (table === 'games') {
          return {
            update: (payload) => {
              calls.gamesUpdate = payload;
              return {
                eq: (col, val) => {
                  if (col === 'device_uuid') calls.gamesEqDeviceUuid = val;
                  return {
                    is: async (col2, val2) => {
                      calls.gamesIsUserId = { col: col2, val: val2 };
                      return { error: null };
                    },
                  };
                },
              };
            },
          };
        }
        if (table === 'users') {
          return { update: () => ({ eq: () => ({ eq: async () => ({ error: null }), then: (r) => r({ error: null }) }) }) };
        }
        if (table === 'session_stats') return { upsert: async () => ({ error: null }) };
        if (table === 'puzzle_attempts') return { insert: async () => ({ error: null }) };
        if (table === 'lesson_progress') return { upsert: async () => ({ error: null }) };
        return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) };
      },
    };
    return { supabase, calls };
  }

  it('re-keys anon games with the client-supplied device_uuid to the user, WHERE user_id IS NULL', async () => {
    const { supabase, calls } = buildGamesMigrateSupabase();
    const app = createApp(supabase, authMiddleware);
    const { status } = await request(app, 'POST', '/api/user/migrate', {
      body: {
        puzzle_attempts: [], session_stats: [], lesson_progress: [],
        sparring_record: null, streak: null,
        device_uuid: 'client-anon-uuid', // distinct from req.user.device_uuid ('dev-xyz-456')
      },
    });
    assert.equal(status, 204);
    assert.deepEqual(calls.gamesUpdate, { user_id: 'user-abc-123' });
    assert.equal(calls.gamesEqDeviceUuid, 'client-anon-uuid'); // keyed on CLIENT uuid, not req.user.device_uuid
    assert.deepEqual(calls.gamesIsUserId, { col: 'user_id', val: null });
  });

  it('does NOT touch games when device_uuid is absent (no-op)', async () => {
    const { supabase, calls } = buildGamesMigrateSupabase();
    const app = createApp(supabase, authMiddleware);
    const { status } = await request(app, 'POST', '/api/user/migrate', {
      body: { puzzle_attempts: [], session_stats: [], lesson_progress: [], sparring_record: null, streak: null },
    });
    assert.equal(status, 204);
    assert.equal(calls.gamesUpdate, null); // games.update never called
  });

  it('does NOT touch games when device_uuid is an empty string (no-op)', async () => {
    const { supabase, calls } = buildGamesMigrateSupabase();
    const app = createApp(supabase, authMiddleware);
    const { status } = await request(app, 'POST', '/api/user/migrate', {
      body: { puzzle_attempts: [], session_stats: [], lesson_progress: [], sparring_record: null, streak: null, device_uuid: '' },
    });
    assert.equal(status, 204);
    assert.equal(calls.gamesUpdate, null);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd connect-four && node --test server/userEndpoints.test.mjs`
Expected: the three new tests FAIL — the first because `games.update` is never called (`calls.gamesUpdate` stays `null`, so `assert.deepEqual(calls.gamesUpdate, {...})` fails). The two no-op tests will PASS trivially (they already assert `null`), but keep them — they lock in the guard once Step 3 lands.

- [ ] **Step 3: Add the re-association to the migrate handler**

In `connect-four/server/userRoutes.js`, inside the `app.post('/api/user/migrate', …)` handler, add a new block to the `operations` array. Place it immediately after the `// streak` block and before the `// onboarding_status` block (~line 526):

```javascript
      // Feature 3 — re-associate anonymous sparring games. The anon game rows were
      // written to `games` with user_id=null, keyed by the CLIENT's device_uuid. Claim
      // them for this account. Key on body.device_uuid (the client's), NOT the derived
      // `deviceUuid` above (which for a new user is freshly generated and won't match).
      // Absent/empty device_uuid is a silent no-op. Trust model matches the rest of migrate.
      if (typeof body.device_uuid === 'string' && body.device_uuid.length > 0) {
        operations.push(
          supabase
            .from('games')
            .update({ user_id: req.user.id })
            .eq('device_uuid', body.device_uuid)
            .is('user_id', null)
            .then(({ error }) => (error ? { error: error.message } : undefined)),
        );
      }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd connect-four && node --test server/userEndpoints.test.mjs`
Expected: PASS — all existing migrate tests plus the three new ones.

- [ ] **Step 5: Send device_uuid from the client**

In `connect-four/src/store/IndexedDBStore.js`, in `migrateToSupabase`, add `device_uuid` to the POST body. The method already reads `profile` (via `this.getProfile()` in the `Promise.all`). Change the `body: JSON.stringify({ … })` object (~lines 269-276) to include the field:

```javascript
      body: JSON.stringify({
        puzzle_attempts: attempts,
        session_stats: sessionRows,
        lesson_progress: lessonRows,
        sparring_record: sparringRecord,
        streak,
        onboarding_status: profile?.onboarding_status,
        device_uuid: profile?.device_uuid,
      }),
```

- [ ] **Step 6: Run the fast suite to confirm nothing regressed**

Run: `cd connect-four && npm run test:fast`
Expected: PASS (all suites, including `userEndpoints.test.mjs` and `onboardingStatusMigration.test.js`).

- [ ] **Step 7: Commit**

```bash
git add connect-four/server/userRoutes.js connect-four/server/userEndpoints.test.mjs connect-four/src/store/IndexedDBStore.js
git commit -m "feat(onboarding): re-associate anon sparring games to account on migrate"
```

---

## Task 2: Feature 2 — Route onboarding game-end through review, then the import offer

**Files:**
- Modify: `connect-four/src/lib/onboardingGameEnd.js`
- Modify: `connect-four/tests/unit/onboardingGameEnd.test.js`
- Modify: `connect-four/src/screens/GameScreen.jsx` (~line 106)
- Modify: `connect-four/src/screens/ReviewScreen.jsx` (signature ~line 54; render an onboarding-only CTA)
- Modify: `connect-four/src/i18n/en.json` + `connect-four/src/i18n/es.json` (add `review.onboardingContinue`)

**Interfaces:**
- Consumes: the router spreads nav params into screens as props (`App.jsx:162` — `<ScreenComponent go={go} goBack={goBack} goReplace={goReplace} {...params} />`), so `goReplace('review', { id, onboarding })` delivers `onboarding` as a prop to `ReviewScreen`.
- Produces: `pickGameEndScreen(onboarding)` returns `'review'` for both `true` and `false`. `ReviewScreen({ go, goBack, id, onboarding })` renders a "Continue" primary button (only when `onboarding` is truthy) that calls `go('onboardingImportOffer')`.

- [ ] **Step 1: Rewrite the onboardingGameEnd test to expect review for both**

Replace the body of the `describe('pickGameEndScreen', …)` block in `connect-four/tests/unit/onboardingGameEnd.test.js` with:

```javascript
describe('pickGameEndScreen', () => {
  it('routes an onboarding session to review for every outcome (win/loss/draw/resign)', () => {
    // Feature 2: onboarding now goes through the post-game review (see mistakes) before the
    // import offer. saveGame() is the SAME call site for every outcome, so the branch only
    // needs the `onboarding` flag, not the outcome.
    for (const outcome of ['win', 'loss', 'draw', 'resign']) {
      assert.equal(pickGameEndScreen(true), 'review', `outcome=${outcome}`);
    }
  });

  it('a non-onboarding session game-end also routes to review', () => {
    for (const outcome of ['win', 'loss', 'draw', 'resign']) {
      assert.equal(pickGameEndScreen(false), 'review', `outcome=${outcome}`);
    }
  });

  it('never routes to onboardingImportOffer directly (review advances there instead)', () => {
    assert.notEqual(pickGameEndScreen(true), 'onboardingImportOffer');
  });
});
```

Also update the file's header comment (the paragraph mentioning `'onboardingImportOffer'`) to state that onboarding now routes to `'review'` and the import offer is reached from review's Continue CTA.

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd connect-four && node --test tests/unit/onboardingGameEnd.test.js`
Expected: FAIL — `pickGameEndScreen(true)` currently returns `'onboardingImportOffer'`, so the first assertion fails.

- [ ] **Step 3: Update pickGameEndScreen**

Replace the function body in `connect-four/src/lib/onboardingGameEnd.js`:

```javascript
/**
 * Feature 2: every end-of-game outcome routes to the post-game review screen. For an
 * onboarding session, review then advances to the import offer via its own Continue CTA
 * (ReviewScreen reads the `onboarding` nav param); the destination here is 'review' for both.
 * @param {boolean} _onboarding - retained for call-site symmetry; no longer branches the destination
 * @returns {'review'}
 */
export function pickGameEndScreen(_onboarding) {
  return 'review';
}
```

Update the top-of-file header comment block accordingly (it currently describes the onboarding→import-offer branch).

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd connect-four && node --test tests/unit/onboardingGameEnd.test.js`
Expected: PASS.

- [ ] **Step 5: Pass the onboarding flag into review from GameScreen**

In `connect-four/src/screens/GameScreen.jsx`, change the game-end navigation (~line 106) from:

```javascript
    goReplace(pickGameEndScreen(onboarding), { id: gameId });
```

to:

```javascript
    goReplace(pickGameEndScreen(onboarding), { id: gameId, onboarding });
```

- [ ] **Step 6: Add the Continue CTA i18n key to BOTH locales**

In `connect-four/src/i18n/en.json`, under the top-level `"review"` object (which currently holds `"share"`), add:

```json
    "onboardingContinue": "Continue"
```

In `connect-four/src/i18n/es.json`, under the top-level `"review"` object, add:

```json
    "onboardingContinue": "Continuar"
```

(Place the new key alongside the existing `"share"` sub-object; mind trailing commas.)

- [ ] **Step 7: Render the onboarding-only Continue CTA in ReviewScreen**

In `connect-four/src/screens/ReviewScreen.jsx`:

(a) Add `onboarding` to the component signature (~line 54):

```javascript
export function ReviewScreen({ go, goBack, id, onboarding }) {
```

(b) Add the CTA just before the component's outermost closing `</div>` (i.e. after the `{analysis && ( … )}` bottom-area block, ~after line 436's region — place it as the last child inside the root `<div>`). It is always shown in an onboarding session so the user can advance even before analysis loads:

```jsx
      {onboarding && (
        <div style={{ padding: '16px', marginTop: 'auto' }}>
          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={() => go('onboardingImportOffer')}
          >
            {t('review.onboardingContinue')}
          </button>
        </div>
      )}
```

(`t` is already in scope in this component.)

- [ ] **Step 8: Run i18n parity + the onboarding suite**

Run: `cd connect-four && node --test tests/unit/i18nKeyParity.test.js tests/unit/onboardingGameEnd.test.js tests/urlMapping.test.js`
Expected: PASS. (Parity confirms the new `review.onboardingContinue` exists in both locales; urlMapping confirms `review` routing is intact.)

- [ ] **Step 9: Build the frontend to catch JSX/import errors**

Run: `cd connect-four && npm run build`
Expected: build succeeds (no syntax/reference errors in the edited screens).

- [ ] **Step 10: Commit**

```bash
git add connect-four/src/lib/onboardingGameEnd.js connect-four/tests/unit/onboardingGameEnd.test.js connect-four/src/screens/GameScreen.jsx connect-four/src/screens/ReviewScreen.jsx connect-four/src/i18n/en.json connect-four/src/i18n/es.json
git commit -m "feat(onboarding): route sparring game-end through review before import offer"
```

---

## Task 3: Feature 1 — Coach speaks the greeting on the mission screen

**Files:**
- Modify: `connect-four/src/i18n/en.json` + `connect-four/src/i18n/es.json` (add `coach.onboardingMission.greeting`)
- Modify: `connect-four/src/screens/OnboardingMissionScreen.jsx`

**Interfaces:**
- Consumes: `useCoachSpeech()` → `{ speakCoachMessage }` (from `connect-four/src/lib/useCoachSpeech.js`). `speakCoachMessage('coach.onboardingMission.greeting')` maps the key to slug `coach--onboardingMission--greeting`, and only plays if that slug is in the approved manifest (no-ops gracefully until Task 4 approves it).
- Produces: a new `coach.*` key whose text value is the full spoken greeting — this is what `scripts/generate-tts.js` synthesizes in Task 4.

- [ ] **Step 1: Add the combined greeting key to BOTH locales**

In `connect-four/src/i18n/en.json`, inside the top-level `"coach"` object (line ~156), add a nested entry (the value is `coachLead` + " " + `coachText`, so audio matches the on-screen bubble):

```json
    "onboardingMission": {
      "greeting": "Hi, I'm your coach. Here's how we'll make you dangerous at Connect Four."
    }
```

In `connect-four/src/i18n/es.json`, inside the top-level `"coach"` object, add the Rioplatense-voseo equivalent (verbatim concatenation of the existing `onboarding.mission.coachLead` + `coachText` es strings):

```json
    "onboardingMission": {
      "greeting": "Hola, soy tu entrenador. Así es como te volveremos peligroso en el Conecta 4."
    }
```

- [ ] **Step 2: Run i18n parity to verify the key is present in both locales**

Run: `cd connect-four && node --test tests/unit/i18nKeyParity.test.js`
Expected: PASS (fails if the key is missing from one locale — this is the guard for Step 1).

- [ ] **Step 3: Wire the mission screen to speak on mount**

In `connect-four/src/screens/OnboardingMissionScreen.jsx`:

(a) Add the import near the other lib imports (after line 9):

```javascript
import { useCoachSpeech } from '../lib/useCoachSpeech.js';
```

(b) Inside the component, after `const [authOpen, setAuthOpen] = useState(false);` (~line 44), add:

```javascript
  const { speakCoachMessage } = useCoachSpeech();
```

(c) In the existing guarded mount effect (the `startedRef` block, ~lines 50-54), speak the greeting alongside the analytics event so the StrictMode double-invoke guard covers both:

```javascript
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    track('onboarding_started', {});
    speakCoachMessage('coach.onboardingMission.greeting');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
```

- [ ] **Step 4: Build the frontend to catch JSX/import errors**

Run: `cd connect-four && npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add connect-four/src/i18n/en.json connect-four/src/i18n/es.json connect-four/src/screens/OnboardingMissionScreen.jsx
git commit -m "feat(onboarding): speak coach greeting on mission screen"
```

---

## Task 4: Owner/manual — Generate and approve the coach audio

> **This is a manual owner step, not an automated code change.** `speakCoachMessage` no-ops until the slug is in the approved manifest, so the app already ships silent-safe after Task 3. This task produces the committed audio artifact.

**Files (produced, then committed):**
- `connect-four/public/audio/coach/coach--onboardingMission--greeting.mp3` (generated)
- `connect-four/public/audio/coach/coach-audio-manifest.json` (new approved entry)
- possibly `connect-four/server/tts-registry.json` (registry entry, if committed by convention)

- [ ] **Step 1: Generate the TTS clip**

The real OPENAI/TTS key is present in `connect-four/server/.env`. Run the generator (it scans `en.json` for `coach.*` keys, so the new `coach.onboardingMission.greeting` is picked up):

```bash
cd connect-four && node scripts/generate-tts.js
```

Confirm output includes a clip for slug `coach--onboardingMission--greeting`. (Check `scripts/generate-tts.js --help` first if the invocation differs.)

- [ ] **Step 2: Approve the slug in /admin/audios**

Start the local server + app (admin is localhost-only), open `/admin/audios`, find the `coach--onboardingMission--greeting` entry, and approve it. Approval writes the slug into `public/audio/coach/coach-audio-manifest.json` (via `writeTtsManifest`).

- [ ] **Step 3: Verify the slug is in the approved manifest**

Run: `cd connect-four && node -e "const m=require('./public/audio/coach/coach-audio-manifest.json'); const has = JSON.stringify(m).includes('coach--onboardingMission--greeting'); console.log('approved:', has); process.exit(has?0:1)"`
Expected: `approved: true`.

- [ ] **Step 4: Commit the audio artifacts**

```bash
git add connect-four/public/audio/coach/coach--onboardingMission--greeting.mp3 connect-four/public/audio/coach/coach-audio-manifest.json connect-four/server/tts-registry.json
git commit -m "chore(onboarding): generate + approve coach mission greeting audio"
```

(Drop `tts-registry.json` from the `git add` if it is gitignored / not tracked.)

---

## Task 5: QA — End-to-end onboarding flow in a clean incognito profile

> Use the **app-qa** skill (it drives the local dev app in Chrome and logs findings to `agentic_QA.md`). **Before starting a dev server, check ports 3001 and 5173** — if a dev server is already running, reuse it rather than launching another (avoids solver IPC contention). Use a clean/incognito profile so `onboarding_status` is `not_encountered` and there is no session.

- [ ] **Step 1: Reach the mission screen as a fresh anonymous user**

Open the app in an incognito Chrome profile at the app root. Confirm the auto-route lands on the onboarding mission screen (`shouldAutoRouteToOnboarding` is anonymous-only).

- [ ] **Step 2: Confirm the coach speaks on arrival**

Verify audio plays the greeting on mission-screen load (requires Task 4 done). If the browser blocks autoplay before user interaction, note it in `agentic_QA.md`; if so, verify the greeting plays on the first interaction / the replay affordance works. Expected: greeting is audible.

- [ ] **Step 3: Play the onboarding sparring game to completion**

Click the CTA to start sparring, play until the game ends (win/loss/draw).

- [ ] **Step 4: Confirm game-end lands on review with mistake analysis**

Expected: after the end-of-game sound, the screen is the **review** screen showing the accuracy card and move timeline (mistake analysis), NOT the import offer directly. Confirm analysis loaded for the anonymous game (analyze allows `user_id:null`).

- [ ] **Step 5: Confirm the import offer is reachable from review**

Click the onboarding "Continue" CTA on review. Expected: the import-offer screen appears. Confirm the sign-up prompt is present.

- [ ] **Step 6: Sign up, then confirm the game appears in Past games**

Complete sign-up from the import offer. Then navigate to Past games. Expected: the onboarding sparring game now appears (re-association ran during migrate on first sign-in). If Past games requires reload, note it.

- [ ] **Step 7: Log results**

Record pass/fail per step in `agentic_QA.md`. Any failure → stop and fix before proceeding (systematic-debugging).

---

## Task 6: QA — Regression: lessons & puzzles still migrate (empirical)

> Verify empirically (not by code-reading) that the games change did not break existing migration. Same incognito discipline as Task 5.

- [ ] **Step 1: As a fresh anonymous user, complete a challenge (puzzle) and a lesson**

In a clean incognito profile, complete one challenge puzzle and one lesson.

- [ ] **Step 2: Confirm they landed in IndexedDB locally**

In DevTools → Application → IndexedDB, confirm a row exists in the `puzzle_attempts` store and in the `lesson_progress` store. (Read memory `reference_supabase_connection.md` before any DB script.)

- [ ] **Step 3: Sign up to trigger migration**

Sign up (or sign in) to trigger `migrateToSupabase` → `POST /api/user/migrate`.

- [ ] **Step 4: Confirm server-side migration for the new user_id**

Query Supabase for the new user's rows (per `reference_supabase_connection.md`: `.env` at `connect-four/server/.env`, `cd connect-four` first, service key var `SUPABASE_SERVICE_ROLE_KEY`, parse `.env` manually). Confirm `puzzle_attempts` and `lesson_progress` rows exist for the new `user_id`. Alternatively/additionally confirm via the in-app stats and lessons screens that progress carried over.

- [ ] **Step 5: Confirm the sparring game ALSO migrated (Feature 3 cross-check)**

Confirm a `games` row for the new `user_id` exists (or the game shows in Past games) — the Feature-3 re-association alongside the unchanged lesson/puzzle migration.

- [ ] **Step 6: Log results**

Record findings in `agentic_QA.md`. Any regression → stop and fix.

---

## Self-Review

**Spec coverage:**
- Feature 1 (coach speaks): Task 3 (key + wiring) + Task 4 (owner audio) + Task 5 Step 2 (QA). ✓
- Feature 2 (game-end → review → import offer): Task 2 (pickGameEndScreen + GameScreen param + ReviewScreen CTA + i18n) + Task 5 Steps 4-5 (QA). ✓
- Feature 3 Option A (server re-association): Task 1 (server UPDATE + client payload + tests) + Task 5 Step 6 + Task 6 Step 5 (QA). ✓
- Import offer preserved as a later step: Task 2 Step 7 CTA → `onboardingImportOffer`. ✓
- One combined audio clip: Task 3 Step 1 single key. ✓
- QA in incognito + regression migration check: Tasks 5 & 6. ✓
- Owner audio step called out explicitly: Task 4. ✓

**Placeholder scan:** No TBD/TODO; every code step shows exact code and exact commands with expected output. ✓

**Type/name consistency:** `device_uuid` body field, `req.user.id`, `.eq('device_uuid', …).is('user_id', null)`, slug `coach--onboardingMission--greeting`, key `coach.onboardingMission.greeting`, prop `onboarding`, i18n `review.onboardingContinue` — all consistent across tasks. `pickGameEndScreen` returns `'review'` in both the impl (Task 2 Step 3) and its tests (Task 2 Step 1). ✓

**Known non-blocking note:** the `onboarding` review param rides in `history.state`, not the URL (`buildUrl` won't encode it), so on a hard reload of `/review/:id` the Continue CTA would not render. This is acceptable — the onboarding forward action is taken immediately after game-end, consistent with the other session-only onboarding screens. No task needed.
