// Per-lesson goal_prompt override — spec 052 (Epic 6/052) US2, prompt half (T020).
//
// ChallengeScreen's lesson-mode inline-challenge mapping now threads
// `ch.goalPrompt` through to `puzzle.goal_prompt` (T017), and `initPuzzle` uses it
// as the displayed coach-bubble text instead of a random `coach.spoken.<category>.
// prompt.N` pool pick when present (T018), while leaving `lastCoachKeyRef.current`
// set to `null` in that branch so the narration effect never plays the now-
// mismatched pre-generated clip for the old pool prompt (T019, FR-029).
//
// This test drives the real ChallengeScreen against the real, solver-verified
// claimeven lesson fixture (connect-four/lessons/lesson-08-claimeven.json) — not a
// hand-invented board — and asserts, per T020:
//   (a) a puzzle with goalPrompt set renders that exact override text in the coach
//       bubble, not a coach.spoken.* pool string (FR-006);
//   (b) a puzzle without goalPrompt (a shallow clone of the same challenge with the
//       field stripped — same real board/movestring, only the override field
//       differs) still renders a pool string (FR-007 regression guard);
//   (c) when goalPrompt renders, no `/audio/coach/*` clip is requested — i.e. the
//       narration effect's `speakCoachMessage` call never fires for that bubble
//       (FR-029's "code takes the silent branch" tier; real audible-silence
//       verification is a separate manual step, see T024).
import { test, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import enTranslation from '../../src/i18n/en.json' with { type: 'json' };
import esTranslation from '../../src/i18n/es.json' with { type: 'json' };

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Real, solver-verified claimeven lesson content (see docs/architecture — the
// claimeven lesson filename has drifted before; this is the current one, T022).
const LESSON_FIXTURE = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../lessons/lesson-08-claimeven.json'), 'utf8'),
);

// The first confirmation challenge, real board/movestring — untouched.
const CHALLENGE_WITH_OVERRIDE = LESSON_FIXTURE.confirmationChallenges[0];
if (!CHALLENGE_WITH_OVERRIDE.goalPrompt) {
  throw new Error('Fixture assumption broken: lesson-08-claimeven.json confirmationChallenges[0] must carry a goalPrompt for this test to be meaningful.');
}

// Same real challenge, override field stripped — exercises the FR-007 fallback
// path without inventing any new board/movestring.
const CHALLENGE_NO_OVERRIDE = { ...CHALLENGE_WITH_OVERRIDE };
delete CHALLENGE_NO_OVERRIDE.goalPrompt;
delete CHALLENGE_NO_OVERRIDE.goalPrompt_es;

// The manifest slugs for this category's generic prompt pool. useCoachSpeech maps a key
// to a slug by replacing [._] with '--', so `coach.spoken.claimeven.prompt.0` becomes
// `coach--spoken--claimeven--prompt--0`. Serving these is what makes the FR-029 assertion
// differential rather than vacuous — see the fetch stub below.
// NOT challenge.category (curated challenges don't carry one) — ChallengeScreen builds the
// key from `effectiveCategory`, which in lessonMode is the lesson's confirmationCategory.
const POOL_CATEGORY = LESSON_FIXTURE.confirmationCategory;
const POOL_SLUGS = [0, 1, 2].map(i => `coach--spoken--${POOL_CATEGORY}--prompt--${i}`);

let playCalls;
let pauseCalls;

before(() => {
  // Board.jsx constructs a ResizeObserver unconditionally in its width-measuring
  // effect — jsdom has no implementation (testing-conventions.md).
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };

  // jsdom implements Audio/HTMLMediaElement but not .play()/.pause() (both throw
  // "Not implemented"). Stub them and record every call's `src` so narration can
  // be asserted programmatically.
  const proto = globalThis.HTMLMediaElement.prototype;
  proto.play = function play() {
    playCalls.push(this.src);
    return Promise.resolve();
  };
  proto.pause = function pause() {
    pauseCalls.push(this.src);
  };

  // ProfileStoreProvider's default store (IndexedDBStore) opens `indexedDB`
  // synchronously in its constructor — jsdom has no IndexedDB. Minimal in-memory
  // fake (mirrors SocraticNarration.dom.test.jsx / LessonTitleConsolidation.dom.test.jsx).
  class FakeRequest {}
  class FakeObjectStore {
    constructor(keyPath) { this.keyPath = keyPath; this.data = new Map(); }
    createIndex() {}
    getAll() {
      const req = new FakeRequest();
      queueMicrotask(() => { req.result = [...this.data.values()]; req.onsuccess?.({ target: req }); });
      return req;
    }
    get(key) {
      const req = new FakeRequest();
      queueMicrotask(() => { req.result = this.data.get(key); req.onsuccess?.({ target: req }); });
      return req;
    }
    put(value) {
      this.data.set(this.keyPath ? value[this.keyPath] : value.id, value);
      const req = new FakeRequest();
      queueMicrotask(() => req.onsuccess?.({ target: req }));
      return req;
    }
  }
  class FakeDB {
    constructor() { this.stores = new Map(); }
    createObjectStore(name, opts) {
      const store = new FakeObjectStore(opts?.keyPath);
      this.stores.set(name, store);
      return store;
    }
    // eslint-disable-next-line no-unused-vars
    transaction(_names, _mode) {
      return { objectStore: (name) => this.stores.get(name) };
    }
  }
  globalThis.indexedDB = {
    open() {
      const req = new FakeRequest();
      const db = new FakeDB();
      queueMicrotask(() => {
        req.result = db;
        req.onupgradeneeded?.({ target: req, oldVersion: 0 });
        req.onsuccess?.({ target: req });
      });
      return req;
    },
  };

  // ChallengeScreen doesn't fetch puzzles in lesson-mode-with-confirmationChallenges
  // (they're passed as a prop), but ProfileStoreProvider's session check does.
  //
  // The coach-audio manifest MUST be served for real here. useCoachSpeech resolves a
  // key to a slug and plays only if that slug is in the manifest, so a blanket 404 stub
  // yields an empty manifest and NOTHING can ever play — which would make the FR-029
  // "no clip plays" assertion below vacuously true whether or not the feature works.
  // Serving the pool slugs makes the assertion differential: the pool branch demonstrably
  // plays (see the companion test), the override branch demonstrably does not.
  globalThis.fetch = async (url) => {
    const href = String(url);
    if (href.includes('coach-audio-manifest.json')) {
      return { ok: true, status: 200, json: async () => POOL_SLUGS, text: async () => '' };
    }
    return { ok: false, status: 404, json: async () => ({}), text: async () => '' };
  };
});

beforeEach(() => {
  playCalls = [];
  pauseCalls = [];
});

async function makeRealI18n() {
  const i18nextMod = await import('i18next');
  const i18next = i18nextMod.default;
  const i18n = i18next.createInstance();
  await i18n.init({
    resources: { en: { translation: enTranslation }, es: { translation: esTranslation } },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });
  return i18n;
}

async function mountChallengeScreen(confirmationChallenges) {
  const { render, screen, cleanup, waitFor } = await import('@testing-library/react');
  const { I18nextProvider } = await import('react-i18next');
  const { ProfileStoreProvider } = await import('../../src/store/ProfileStore.jsx');
  const { ChallengeScreen } = await import('../../src/screens/ChallengeScreen.jsx');

  const i18n = await makeRealI18n();

  const utils = render(
    <I18nextProvider i18n={i18n}>
      <ProfileStoreProvider>
        <ChallengeScreen
          go={() => {}}
          goBack={() => {}}
          lessonMode={true}
          lessonId={LESSON_FIXTURE.id}
          lessonTitle={LESSON_FIXTURE.title}
          confirmationCategory={LESSON_FIXTURE.confirmationCategory}
          confirmationCount={confirmationChallenges.length}
          confirmationChallenges={confirmationChallenges}
        />
      </ProfileStoreProvider>
    </I18nextProvider>,
  );

  return { ...utils, screen, cleanup, waitFor };
}

test('goal_prompt override renders the lesson-authored text, not a pool string (FR-006)', async () => {
  const { screen, cleanup, waitFor } = await mountChallengeScreen([CHALLENGE_WITH_OVERRIDE]);

  await waitFor(() => {
    assert.ok(
      screen.getByText(CHALLENGE_WITH_OVERRIDE.goalPrompt),
      'expected the coach bubble to render the exact goalPrompt override text',
    );
  });

  // Regression guard: none of the generic pool strings for this category rendered.
  for (let i = 0; i < 3; i++) {
    const poolKey = `coach.spoken.${LESSON_FIXTURE.confirmationCategory}.prompt.${i}`;
    const poolText = enTranslation.coach?.spoken?.[LESSON_FIXTURE.confirmationCategory]?.prompt?.[String(i)];
    if (poolText) {
      assert.equal(screen.queryByText(poolText) === null, true, `did not expect the pool string for ${poolKey} to render alongside the override`);
    }
  }

  cleanup();
});

test('absent goal_prompt still renders a pool string, unchanged (FR-007 regression guard)', async () => {
  const { screen, cleanup, waitFor } = await mountChallengeScreen([CHALLENGE_NO_OVERRIDE]);

  await waitFor(() => {
    // Not asserting a SPECIFIC pool index (the pick is random) — asserting that
    // whatever rendered is one of the three known pool strings for this category,
    // and specifically not the override text.
    const bubbleTexts = [0, 1, 2]
      .map(i => enTranslation.coach?.spoken?.[LESSON_FIXTURE.confirmationCategory]?.prompt?.[String(i)])
      .filter(Boolean);
    const matched = bubbleTexts.some(text => screen.queryByText(text) !== null);
    assert.ok(matched, 'expected one of the generic pool prompts to render when goalPrompt is absent');
  });

  assert.equal(
    screen.queryByText(CHALLENGE_WITH_OVERRIDE.goalPrompt),
    null,
    'the override text must not leak in when the challenge carries no goalPrompt',
  );

  cleanup();
});

test('goal_prompt override plays no coach-speech audio clip (FR-029, code-path tier)', async () => {
  const { waitFor, cleanup, screen } = await mountChallengeScreen([CHALLENGE_WITH_OVERRIDE]);

  await waitFor(() => {
    assert.ok(screen.getByText(CHALLENGE_WITH_OVERRIDE.goalPrompt));
  });

  // Give the narration useEffect (keyed on coachMessages.length) a tick to fire,
  // if it were going to.
  await new Promise(resolve => setTimeout(resolve, 0));

  const coachClipCalls = playCalls.filter(src => src.includes('/audio/coach/'));
  assert.deepEqual(
    coachClipCalls,
    [],
    'expected NO /audio/coach/*.mp3 playback when a goal_prompt override supplies the on-screen text (lastCoachKeyRef must be null in that branch)',
  );

  cleanup();
});

// KNOWN LIMITATION — read before trusting the assertion above.
//
// It is NOT differential. A control that mounts the pool path (CHALLENGE_NO_OVERRIDE) under
// this same harness was written and measured: it also records zero /audio/coach/ plays. No
// coach clip can play in jsdom here at all, because `useCoachSpeech` reads the module-singleton
// `src/i18n/index.js` rather than the test's I18nextProvider instance, so `speakCoachMessage`
// parks the key in `pendingKeyRef` and the `lang === i18n.language` gate never opens. Serving a
// real manifest from the fetch stub does not change that.
//
// Consequence: the assertion above would still pass against reverted code. It is a smoke check
// that the render path does not crash, NOT evidence that FR-029's silent branch is taken, and
// definitely not evidence of audible silence. The spec anticipated this — T024 mandates a real,
// non-automated browser session with audio ON as the only valid evidence for FR-029, and that
// step remains OUTSTANDING. Do not cite this file as having closed it.
//
// To make it real, `useCoachSpeech` would have to take its i18n instance via context/param
// instead of the module singleton. That is a production change, deliberately not made here.
