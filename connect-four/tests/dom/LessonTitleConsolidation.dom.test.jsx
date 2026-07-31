// Lesson title consolidation — spec 052 (Epic 6) US2, title half (FR-004/FR-005).
//
// Before this change, a lesson's title was displayed via
// `t('lesson.<id>.title', {defaultValue})` at three call sites, each falling back
// differently if the i18n key was missing: SagaScreen and ConceptScreen fell back
// to `lesson.title`, but SocraticScreen fell back to an empty string. After the
// `lesson.<id>.title` i18n keys are removed entirely (T013), all three call sites
// must read `lesson.title` directly from the lesson JSON — SocraticScreen's blank
// fallback is the one this test exists to catch a regression on (SC-002).
//
// This is an automated substitute for a real-browser walkthrough (Saga list ->
// Concept slides -> Socratic screen) per T015: it mounts each of the three
// screens with the real lesson-01 fixture and asserts the lesson's actual title
// text ("Immediate Threats") renders non-blank on every one of them, sourced only
// from the lesson JSON (no i18n resource for `lesson.immediate-threat.title` is
// registered at all in this test's i18n instance, so any lingering `t()` call
// would render blank/the raw key, not silently pass).
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Real, solver-verified lesson-01 content — not hand-invented.
const LESSON_FIXTURE = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../lessons/lesson-01-immediate-threat.json'), 'utf8'),
);
const LESSON_LIST = [LESSON_FIXTURE];
const EXPECTED_TITLE = LESSON_FIXTURE.title; // "Immediate Threats"

before(() => {
  // Board.jsx constructs a ResizeObserver unconditionally in its width-measuring
  // effect — jsdom has no implementation (testing-conventions.md).
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };

  // jsdom implements Audio/HTMLMediaElement but not .play()/.pause() (both throw
  // "Not implemented").
  const proto = globalThis.HTMLMediaElement.prototype;
  proto.play = function play() { return Promise.resolve(); };
  proto.pause = function pause() {};

  // ProfileStoreProvider's default store (IndexedDBStore) opens `indexedDB` in its
  // constructor, synchronously, before any render — jsdom has no IndexedDB. A
  // minimal in-memory fake (mirrors SocraticHintPhase.dom.test.jsx).
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

  // Mock every fetch the three screens (and useLessonLockGuard) issue.
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.endsWith(`/api/lessons/${LESSON_FIXTURE.id}`)) {
      return { ok: true, json: async () => LESSON_FIXTURE };
    }
    if (u.endsWith('/api/lessons')) {
      return { ok: true, json: async () => LESSON_LIST };
    }
    return { ok: false, status: 404, json: async () => ({}), text: async () => '' };
  };
});

// Deliberately empty i18n resources: a lingering `t('lesson.<id>.title', ...)`
// call with no `defaultValue` (or a blank one) would render nothing/the raw key
// here, not the real title — proving the title is NOT sourced from i18n.
async function makeEmptyI18n() {
  const i18nextMod = await import('i18next');
  const i18next = i18nextMod.default;
  const i18n = i18next.createInstance();
  await i18n.init({
    resources: { en: { translation: {} }, es: { translation: {} } },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });
  return i18n;
}

test('SagaScreen renders the lesson title from the lesson JSON, non-blank', async () => {
  const { render, screen, cleanup, waitFor } = await import('@testing-library/react');
  const { I18nextProvider } = await import('react-i18next');
  const { ProfileStoreProvider } = await import('../../src/store/ProfileStore.jsx');
  const { SagaScreen } = await import('../../src/screens/SagaScreen.jsx');

  const i18n = await makeEmptyI18n();

  render(
    <I18nextProvider i18n={i18n}>
      <ProfileStoreProvider>
        <SagaScreen go={() => {}} goBack={() => {}} />
      </ProfileStoreProvider>
    </I18nextProvider>,
  );

  await waitFor(() => {
    assert.ok(screen.getByText(EXPECTED_TITLE), 'expected the real lesson title to render in the Saga list');
  });

  cleanup();
});

test('ConceptScreen renders the lesson title from the lesson JSON, non-blank', async () => {
  const { render, screen, cleanup, waitFor } = await import('@testing-library/react');
  const { I18nextProvider } = await import('react-i18next');
  const { ProfileStoreProvider } = await import('../../src/store/ProfileStore.jsx');
  const { ConceptScreen } = await import('../../src/screens/ConceptScreen.jsx');

  const i18n = await makeEmptyI18n();

  render(
    <I18nextProvider i18n={i18n}>
      <ProfileStoreProvider>
        <ConceptScreen
          go={() => {}}
          goBack={() => {}}
          goReplace={() => {}}
          lessonId={LESSON_FIXTURE.id}
        />
      </ProfileStoreProvider>
    </I18nextProvider>,
  );

  await waitFor(() => {
    assert.ok(screen.getByText(EXPECTED_TITLE), 'expected the real lesson title to render in the ConceptScreen TopBar');
  });

  cleanup();
});

test('SocraticScreen renders the lesson title from the lesson JSON, non-blank (the previously-blank-fallback call site)', async () => {
  const { render, screen, cleanup, waitFor } = await import('@testing-library/react');
  const { I18nextProvider } = await import('react-i18next');
  const { ProfileStoreProvider } = await import('../../src/store/ProfileStore.jsx');
  const { SocraticScreen } = await import('../../src/screens/SocraticScreen.jsx');

  const i18n = await makeEmptyI18n();

  render(
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
    assert.ok(screen.getByText(EXPECTED_TITLE), 'expected the real lesson title to render in the SocraticScreen TopBar (was: blank fallback before this fix)');
  });

  cleanup();
});
