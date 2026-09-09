// OI-180 — interactive controls below the 44×44 minimum tap target at 390×844.
//
// Two independent surfaces, and the OI's original "one shared component serves both screens"
// root cause was WRONG: the 36×36 style object was copy-pasted inline SIX times, three in
// GameScreen and three in ChallengeScreen. A test that only covered GameScreen would pass over
// a still-broken /challenge/<cat>, which is exactly the trap this file exists to close — so it
// asserts on all six toggles, in both screens, plus both PastGamesListScreen chip rows.
//
// WHAT THIS TEST CAN AND CANNOT SHOW: jsdom performs no layout, so `getBoundingClientRect()` is
// all zeros here and no rendered pixel size is measured or claimed. It asserts the inline style
// values the components actually set — which is the layer the bug lives in (hardcoded
// `width: 36, height: 36`). Confirming the rendered box at a real 390×844 viewport requires a
// browser; that verification is recorded separately in
// .superpowers/sdd/qa-2026-09-08-remediation/batch-G.md.
import { test, before, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { render, cleanup, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18next from 'i18next';
import enTranslation from '../../src/i18n/en.json' with { type: 'json' };
import { StoreContext } from '../../src/store/ProfileStore.jsx';
import { GameScreen } from '../../src/screens/GameScreen.jsx';
import { ChallengeScreen } from '../../src/screens/ChallengeScreen.jsx';
import { PastGamesListScreen } from '../../src/screens/PastGamesListScreen.jsx';
import { AUDIO_TOGGLE_SIZE } from '../../src/components/AudioToggleButton.jsx';

const MIN_TAP_TARGET = 44;

const i18n = i18next.createInstance();
await i18n.init({
  resources: { en: { translation: enTranslation } },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

before(() => {
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  const proto = globalThis.HTMLMediaElement.prototype;
  proto.play = function play() { return Promise.resolve(); };
  proto.pause = function pause() {};
});

// A minimal but REAL draw response, so ChallengeScreen reaches its playable phase (and hence
// renders its toolbar). Same shape as GET /api/puzzles/draw returns
// (tests/dom/ChallengeScreenDrawStates.dom.test.jsx uses the same envelope).
const DRAW_RESPONSE = {
  puzzles: [{ id: 1, category: 'immediate_threat', move_string: '4433', correct_cols: [2], highlight_metadata: null }],
  session_id: null,
  resume_idx: 0,
};

beforeEach(() => {
  globalThis.fetch = async (url) => {
    if (String(url).includes('/api/puzzles/draw')) {
      return { ok: true, status: 200, json: async () => DRAW_RESPONSE, text: async () => '' };
    }
    return { ok: false, status: 404, json: async () => ({}), text: async () => '' };
  };
});

afterEach(cleanup);

const STORE_CONTEXT_VALUE = {
  store: {
    getProfile: async () => ({}),
    updateProfile: async () => {},
    saveSparringRecord: async () => {},
    getSparringRecord: async () => ({ wins: 0, losses: 0, draws: 0 }),
    getGames: async () => [],
  },
  session: { user: { id: 'u1' } },
  sessionChecked: true,
  signOut: () => {},
  refetchSession: () => {},
};

function wrap(node) {
  return render(
    <I18nextProvider i18n={i18n}>
      <StoreContext.Provider value={STORE_CONTEXT_VALUE}>{node}</StoreContext.Provider>
    </I18nextProvider>,
  );
}

// The three toggles are identified by the i18n-resolved aria-labels the screens set — the same
// strings the QA pass clicked on, not a test-only hook.
const TOGGLE_LABELS = [
  [enTranslation.audio.muteSfx, enTranslation.audio.unmuteSfx],
  [enTranslation.audio.muteMusic, enTranslation.audio.unmuteMusic],
  [enTranslation.audio.muteSpeech, enTranslation.audio.unmuteSpeech],
];

function px(value) {
  // Inline numeric style props come back as e.g. "44px"; a missing one is ''.
  if (!value) return 0;
  return parseFloat(String(value));
}

function assertToggleIsTappable(el, where) {
  assert.ok(el, `${where}: audio toggle not found`);
  const { width, height, minWidth, minHeight } = el.style;
  assert.ok(px(width) >= MIN_TAP_TARGET, `${where}: width ${width || '(unset)'} < ${MIN_TAP_TARGET}px`);
  assert.ok(px(height) >= MIN_TAP_TARGET, `${where}: height ${height || '(unset)'} < ${MIN_TAP_TARGET}px`);
  assert.ok(px(minWidth) >= MIN_TAP_TARGET, `${where}: min-width ${minWidth || '(unset)'} < ${MIN_TAP_TARGET}px`);
  assert.ok(px(minHeight) >= MIN_TAP_TARGET, `${where}: min-height ${minHeight || '(unset)'} < ${MIN_TAP_TARGET}px`);
}

function findToggles(container) {
  return TOGGLE_LABELS.map(([on, off]) =>
    container.querySelector(`button[aria-label="${on}"]`) || container.querySelector(`button[aria-label="${off}"]`));
}

test('the shared AudioToggleButton is at least 44×44', () => {
  assert.ok(AUDIO_TOGGLE_SIZE >= MIN_TAP_TARGET, `AUDIO_TOGGLE_SIZE is ${AUDIO_TOGGLE_SIZE}`);
});

test('GameScreen: all three audio toggles meet the 44×44 minimum', () => {
  const { container } = wrap(
    <GameScreen go={() => {}} goReplace={() => {}} difficulty="easy" side="first" />,
  );
  const toggles = findToggles(container);
  assert.equal(toggles.filter(Boolean).length, 3, 'GameScreen must render three audio toggles');
  toggles.forEach((el, i) => assertToggleIsTappable(el, `GameScreen toggle #${i + 1}`));
});

test('ChallengeScreen: all three audio toggles meet the 44×44 minimum', async () => {
  const { container } = wrap(
    <ChallengeScreen go={() => {}} goBack={() => {}} category="immediate_threat" />,
  );
  let toggles = [];
  await waitFor(() => {
    toggles = findToggles(container);
    assert.equal(toggles.filter(Boolean).length, 3, 'ChallengeScreen must render three audio toggles');
  });
  toggles.forEach((el, i) => assertToggleIsTappable(el, `ChallengeScreen toggle #${i + 1}`));
});

test('PastGamesListScreen: both the sort row and the filter row meet the 44px minimum height', () => {
  const { container } = wrap(<PastGamesListScreen go={() => {}} goBack={() => {}} />);
  // The two chip rows are the first two button rows under the TopBar; identify them by their
  // own labels rather than by DOM position.
  const labelsFor = (keys) => keys.map((k) => k.split('.').reduce((o, part) => o?.[part], enTranslation));
  // Keys copied from PastGamesListScreen.jsx's own SORTS / FILTERS tables.
  const sortLabels = labelsFor(['games.sort_recent', 'games.sort_played_well', 'games.sort_worst_mistakes']);
  const buttons = [...container.querySelectorAll('button')];
  const byText = (text) => buttons.find((b) => b.textContent.trim() === String(text).trim());

  const sortChips = sortLabels.map(byText).filter(Boolean);
  assert.equal(sortChips.length, sortLabels.length, `sort chips found: ${sortChips.length} of ${sortLabels.length}`);
  for (const chip of sortChips) {
    assert.ok(px(chip.style.minHeight) >= MIN_TAP_TARGET,
      `sort chip "${chip.textContent}": min-height ${chip.style.minHeight || '(unset)'} < ${MIN_TAP_TARGET}px`);
  }

  const filterLabels = labelsFor(['games.filter_all', 'games.filter_won', 'games.filter_lost', 'games.filter_draw', 'games.filter_has_blunder']);
  const filterChips = filterLabels.map(byText).filter(Boolean);
  assert.equal(filterChips.length, filterLabels.length, `filter chips found: ${filterChips.length} of ${filterLabels.length}`);
  for (const chip of filterChips) {
    assert.ok(px(chip.style.minHeight) >= MIN_TAP_TARGET,
      `filter chip "${chip.textContent}": min-height ${chip.style.minHeight || '(unset)'} < ${MIN_TAP_TARGET}px`);
  }
});
