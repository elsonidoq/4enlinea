// Socratic exercise narration — spec 051 (Epic 5) US1, T006/FR-004.
//
// SocraticScreen speaks the current phase's bubble via speakLessonAudio()
// (src/lib/useCoachSpeech.js), which constructs a real `Audio` element and calls
// `.play()`, and stops it on navigation/unmount via `stopSpeech()`. This test
// drives the real screen against real lesson-01 socratic content (solver-verified,
// not hand-invented — see CLAUDE.md's movestring rule) and asserts
// programmatically, via stubbed HTMLMediaElement.play()/.pause() calls, that:
//   - every phase's bubble narrates its own message (including the reward message
//     on a correct answer) when Hint is never clicked (run 1), and
//   - clicking Hint and then playing the taught correct move still narrates the
//     'correct' reward message, not the hint text (run 2) — per FR-001/FR-002
//     (spec 052 US1), showHint resets on every phase transition, so hint and
//     phase messages never coexist in the bubble.
//   - navigating away (unmounting) mid-narration stops playback (pause() fires).
//
// A single combined pass is NOT sufficient per FR-004 — hence two independent runs.
import { test, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import enTranslation from '../../src/i18n/en.json' with { type: 'json' };
import esTranslation from '../../src/i18n/es.json' with { type: 'json' };

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Real, solver-verified lesson-01 content (correctCol: 0, socratic messages with
// real audio paths) — not hand-invented board/message data.
const LESSON_FIXTURE = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../lessons/lesson-01-immediate-threat.json'), 'utf8'),
);

let playCalls;
let pauseCalls;

before(() => {
  // Board.jsx constructs a ResizeObserver unconditionally in its width-measuring
  // effect — jsdom has no implementation (testing-conventions.md).
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };

  // jsdom implements Audio/HTMLMediaElement but not .play()/.pause() (both throw
  // "Not implemented"). Stub them and record every call so narration can be
  // asserted programmatically rather than by ear.
  const proto = globalThis.HTMLMediaElement.prototype;
  proto.play = function play() {
    playCalls.push(this.src);
    return Promise.resolve();
  };
  proto.pause = function pause() {
    pauseCalls.push(this.src);
  };

  // ProfileStoreProvider's default store (IndexedDBStore) opens `indexedDB` in its
  // constructor, synchronously, before any render — jsdom has no IndexedDB. A
  // minimal in-memory fake is enough: SocraticScreen's own interactions
  // (handleColumnClick, the Hint button) never touch the store at all; only
  // useLessonLockGuard's Promise.all(getLessonProgress(), getProfile()) does, and
  // both are wrapped in .catch() there — but the store must still be
  // constructible and those two calls must resolve (not throw synchronously) for
  // openDB()'s promise chain to settle.
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

  // Mock every fetch SocraticScreen (and its dependencies) issue. `/api/lessons`
  // (the plain list, used by useLessonLockGuard) resolves empty on purpose —
  // deriveLessonAccess() returns 'allowed' for any lessonId absent from that list
  // (sagaLock.js), so the guard clears immediately without needing real
  // progress/tier data. `/api/lessons/<id>` serves the real lesson-01 fixture.
  // `/api/auth/session` (ProfileStoreProvider's checkSession) fails softly —
  // already wrapped in a try/catch there, so a non-ok response is fine.
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.endsWith(`/api/lessons/${LESSON_FIXTURE.id}`)) {
      return { ok: true, json: async () => LESSON_FIXTURE };
    }
    if (u.endsWith('/api/lessons')) {
      return { ok: true, json: async () => [] };
    }
    return { ok: false, status: 404, json: async () => ({}), text: async () => '' };
  };
});

beforeEach(() => {
  playCalls = [];
  pauseCalls = [];
});

async function renderSocratic() {
  const { render, screen, cleanup, fireEvent, waitFor } = await import('@testing-library/react');
  const { I18nextProvider } = await import('react-i18next');
  const i18nextMod = await import('i18next');
  const i18next = i18nextMod.default;
  const { ProfileStoreProvider } = await import('../../src/store/ProfileStore.jsx');
  const { SocraticScreen } = await import('../../src/screens/SocraticScreen.jsx');

  const i18n = i18next.createInstance();
  await i18n.init({
    resources: { en: { translation: enTranslation }, es: { translation: esTranslation } },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

  const nav = { goBackCalls: 0 };
  const utils = render(
    <I18nextProvider i18n={i18n}>
      <ProfileStoreProvider>
        <SocraticScreen
          go={() => {}}
          goBack={() => { nav.goBackCalls++; }}
          goReplace={() => {}}
          lessonId={LESSON_FIXTURE.id}
        />
      </ProfileStoreProvider>
    </I18nextProvider>,
  );

  // Wait for the lesson fetch + lock guard to resolve and the board to render, AND
  // for the mount-time narration effect to have actually fired — both are async
  // (fetch + effect-commit timing), so polling with waitFor rather than a bare
  // synchronous check right after render avoids a flake under system load (the
  // narration effect commits in the same React cycle as the board, but not
  // necessarily before this function's next synchronous line runs).
  await waitFor(() => {
    assert.ok(screen.getByRole('button', { name: 'column 1' }));
    assert.ok(playCalls.some((src) => src.endsWith(ASK_AUDIO)), `expected ask-phase audio to play; got ${JSON.stringify(playCalls)}`);
  });

  return { ...utils, screen, cleanup, fireEvent, waitFor };
}

// The lesson-01 socratic fixture's audio basenames per phase, for readable assertions.
const ASK_AUDIO = '/audio/lessons/a5dcd125ce91fddb.mp3';
const CORRECT_AUDIO = '/audio/lessons/ce4e7549ac16e9f8.mp3';
const HINT_AUDIO = '/audio/lessons/40579c8f05d14ca7.mp3';

test('run 1 (Hint never clicked): every phase narrates its own message, including the reward message on a correct answer, and unmounting stops playback', async () => {
  const { screen, cleanup, fireEvent, waitFor } = await renderSocratic();

  // 'ask' phase narration is already confirmed by renderSocratic()'s own waitFor.

  // Answer correctly (lesson-01's correctCol is 0 -> "column 1").
  fireEvent.click(screen.getByRole('button', { name: 'column 1' }));

  // 'correct' phase's reward message narrates (async: phase-change effect).
  await waitFor(() => {
    assert.ok(playCalls.some((src) => src.endsWith(CORRECT_AUDIO)), `expected the reward message to narrate; got ${JSON.stringify(playCalls)}`);
    // The phase transition's cleanup stopped the previous ('ask') clip.
    assert.ok(pauseCalls.some((src) => src.endsWith(ASK_AUDIO)), `expected the ask-phase clip to be paused on phase change; got ${JSON.stringify(pauseCalls)}`);
  });

  // Navigating away mid-narration stops playback.
  const pauseCallsBeforeUnmount = pauseCalls.length;
  cleanup();
  assert.ok(pauseCalls.length > pauseCallsBeforeUnmount, 'expected unmount to call pause() (stopSpeech on cleanup)');
  assert.ok(pauseCalls.some((src) => src.endsWith(CORRECT_AUDIO)), `expected the still-playing reward clip to be paused on unmount; got ${JSON.stringify(pauseCalls)}`);
});

test('run 2 (Hint clicked, then correct move played): the reward message narrates, not the hint text (FR-001/FR-002)', async () => {
  const { screen, cleanup, fireEvent, waitFor } = await renderSocratic();

  // 'ask' phase narration is already confirmed by renderSocratic()'s own waitFor.

  // Trigger Hint.
  fireEvent.click(screen.getByText('Hint'));

  // The hint message narrates (showHint short-circuits the phase->message map).
  await waitFor(() => {
    assert.ok(playCalls.some((src) => src.endsWith(HINT_AUDIO)), `expected the hint message to narrate; got ${JSON.stringify(playCalls)}`);
    assert.ok(pauseCalls.some((src) => src.endsWith(ASK_AUDIO)), `expected the ask-phase clip to be paused when Hint fires; got ${JSON.stringify(pauseCalls)}`);
  });

  // Answer correctly (lesson-01's correctCol is 0 -> "column 1"). Per FR-001,
  // showHint resets on the phase transition to 'correct', so the reward
  // message — not the lingering hint text — renders and narrates.
  fireEvent.click(screen.getByRole('button', { name: 'column 1' }));

  await waitFor(() => {
    assert.ok(playCalls.some((src) => src.endsWith(CORRECT_AUDIO)), `expected the reward message to narrate after Hint; got ${JSON.stringify(playCalls)}`);
    assert.ok(pauseCalls.some((src) => src.endsWith(HINT_AUDIO)), `expected the hint clip to be paused on the transition to 'correct'; got ${JSON.stringify(pauseCalls)}`);
  });

  // Navigating away mid-narration still stops playback.
  const pauseCallsBeforeUnmount = pauseCalls.length;
  cleanup();
  assert.ok(pauseCalls.length > pauseCallsBeforeUnmount, 'expected unmount to call pause() (stopSpeech on cleanup) even in the Hint-triggered run');
  assert.ok(pauseCalls.some((src) => src.endsWith(CORRECT_AUDIO)), `expected the still-playing reward clip to be paused on unmount; got ${JSON.stringify(pauseCalls)}`);
});
