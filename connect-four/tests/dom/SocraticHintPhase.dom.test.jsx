// Socratic hint-yields-to-phase contract — spec 052 (Epic 6) US1, FR-001/FR-002.
//
// SocraticScreen's `showHint` state used to be sticky: once a learner clicked
// Hint, the bubble stayed pinned to the hint text even after the phase machine
// advanced to 'correct' or 'wrong2', silently swallowing the reward message.
// FR-001 fixes this by resetting `showHint` on every phase transition, so hint
// and phase messages never coexist in the bubble. This file is the dedicated
// regression suite for that contract (see also SocraticNarration.dom.test.jsx's
// "run 2", which covers the narration side of the same fix).
//
// Three cases:
//   (a) Hint clicked -> correct column played -> the 'correct' reward message
//       renders in the bubble AND narrates (SC-001).
//   (b) Hint clicked -> wrong column played -> the hint text does not linger
//       alongside the wrong-move message (AC2).
//   (c) Hint never clicked -> correct column played -> behavior unchanged from
//       today (AC3, regression guard).
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
  // minimal in-memory fake is enough (mirrors SocraticNarration.dom.test.jsx).
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

  // Mock every fetch SocraticScreen (and its dependencies) issue.
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

  const utils = render(
    <I18nextProvider i18n={i18n}>
      <ProfileStoreProvider>
        <SocraticScreen
          go={() => {}}
          goBack={() => {}}
          goReplace={() => {}}
          lessonId={LESSON_FIXTURE.id}
        />
      </ProfileStoreProvider>
    </I18nextProvider>,
  );

  await waitFor(() => {
    assert.ok(screen.getByRole('button', { name: 'column 1' }));
    assert.ok(playCalls.some((src) => src.endsWith(ASK_AUDIO)), `expected ask-phase audio to play; got ${JSON.stringify(playCalls)}`);
  });

  return { ...utils, screen, cleanup, fireEvent, waitFor };
}

// The lesson-01 socratic fixture's per-phase text/audio basenames, for readable assertions.
const ASK_AUDIO = '/audio/lessons/a5dcd125ce91fddb.mp3';
const CORRECT_AUDIO = '/audio/lessons/ce4e7549ac16e9f8.mp3';
const WRONG1_AUDIO = '/audio/lessons/c1623a9ecce9ac3e.mp3';
const HINT_AUDIO = '/audio/lessons/40579c8f05d14ca7.mp3';
const CORRECT_TEXT = LESSON_FIXTURE.socratic.messages.correct[0].text;
const HINT_TEXT = LESSON_FIXTURE.socratic.messages.hint[0].text;
const WRONG1_TEXT = LESSON_FIXTURE.socratic.messages.wrong1[0].text;

// lesson-01's correctCol is 0 ("column 1"); any other in-range column is wrong.
const WRONG_COLUMN_NAME = 'column 2';

test('(a) Hint clicked, then correct move played: the correct message renders and narrates (SC-001)', async () => {
  const { screen, cleanup, fireEvent, waitFor } = await renderSocratic();

  fireEvent.click(screen.getByText('Hint'));
  await waitFor(() => {
    assert.ok(screen.getByText(HINT_TEXT), 'expected the hint text to render after clicking Hint');
    assert.ok(playCalls.some((src) => src.endsWith(HINT_AUDIO)), `expected the hint message to narrate; got ${JSON.stringify(playCalls)}`);
  });

  fireEvent.click(screen.getByRole('button', { name: 'column 1' }));

  await waitFor(() => {
    assert.ok(screen.getByText(CORRECT_TEXT), 'expected the correct/reward message to render in the bubble after Hint');
    assert.equal(screen.queryByText(HINT_TEXT), null, 'expected the hint text to no longer render once the phase reaches correct');
    assert.ok(playCalls.some((src) => src.endsWith(CORRECT_AUDIO)), `expected the reward message to narrate; got ${JSON.stringify(playCalls)}`);
  });

  // The hint clip must narrate exactly once — when Hint was clicked. If `showHint`
  // is reset in an effect rather than in the click handler, React commits the new
  // phase while `showHint` is still true, the narration effect re-fires on the hint
  // text, and the clip audibly restarts before being cut a tick later. That stutter
  // is what FR-002 ("narrate the same reward message") rules out.
  assert.equal(
    playCalls.filter((src) => src.endsWith(HINT_AUDIO)).length,
    1,
    `expected the hint clip to narrate exactly once (on the Hint click), never restarted by the phase transition; got ${JSON.stringify(playCalls)}`,
  );

  cleanup();
});

test('(b) Hint clicked, then wrong move played: the hint text does not linger alongside the wrong-move message (AC2)', async () => {
  const { screen, cleanup, fireEvent, waitFor } = await renderSocratic();

  fireEvent.click(screen.getByText('Hint'));
  await waitFor(() => {
    assert.ok(screen.getByText(HINT_TEXT), 'expected the hint text to render after clicking Hint');
  });

  fireEvent.click(screen.getByRole('button', { name: WRONG_COLUMN_NAME }));

  await waitFor(() => {
    assert.ok(screen.getByText(WRONG1_TEXT), 'expected the wrong-move message to render');
    assert.ok(playCalls.some((src) => src.endsWith(WRONG1_AUDIO)), `expected the wrong-move message to narrate; got ${JSON.stringify(playCalls)}`);
  });
  assert.equal(screen.queryByText(HINT_TEXT), null, 'expected the hint text to no longer render alongside the wrong-move message');

  cleanup();
});

test('(c) Hint never clicked, correct move played: behavior unchanged from today (AC3, regression guard)', async () => {
  const { screen, cleanup, fireEvent, waitFor } = await renderSocratic();

  fireEvent.click(screen.getByRole('button', { name: 'column 1' }));

  await waitFor(() => {
    assert.ok(screen.getByText(CORRECT_TEXT), 'expected the correct/reward message to render in the bubble');
    assert.ok(playCalls.some((src) => src.endsWith(CORRECT_AUDIO)), `expected the reward message to narrate; got ${JSON.stringify(playCalls)}`);
  });
  assert.equal(screen.queryByText(HINT_TEXT), null, 'expected the hint text to never have rendered when Hint was never clicked');

  cleanup();
});
