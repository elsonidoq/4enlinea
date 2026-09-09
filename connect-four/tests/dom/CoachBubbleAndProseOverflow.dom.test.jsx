// OI-167 (coach bubble clips its FIRST line) + OI-166 (infoProse truncates with no
// affordance). Both are clipping bugs, so both are asserted the way the QA run measured
// them: on real DOM metrics (clientHeight vs scrollHeight), never on a screenshot.
//
// What jsdom CAN and CANNOT do here, stated explicitly because a vacuous test would be
// worse than none:
//   * jsdom does NO layout — every element reports clientHeight/scrollHeight 0. It can
//     therefore never *reproduce* the overflow; only a real browser can.
//   * What it CAN pin is (a) the declared caps that decide the overflow
//     (CoachDialog's bubbles maxHeight, ConceptScreen's opt-in) and (b) the panel's
//     REACTION to overflow metrics, by defining the same scrollHeight/clientHeight/
//     scrollTop getters the browser would report. That is the production code path
//     reading real DOM APIs, with the numbers the QA run actually measured
//     (coach 120/139 on /concept/claimeven slide 1).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render, screen, cleanup, waitFor, act } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18next from 'i18next';
import enTranslation from '../../src/i18n/en.json' with { type: 'json' };
import lesson08 from '../../lessons/lesson-08-claimeven.json' with { type: 'json' };
import { StoreContext } from '../../src/store/ProfileStore.jsx';
import { ConceptScreen } from '../../src/screens/ConceptScreen.jsx';
import { CoachDialog } from '../../src/components/CoachDialog.jsx';
import { InfoProsePanel } from '../../src/components/InfoProsePanel.jsx';

const i18n = i18next.createInstance();
await i18n.init({
  resources: { en: { translation: enTranslation } },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

const wrap = (ui) => render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);

// The exact message that overflows in production: /concept/claimeven slide 1, 221 chars,
// measured 120/139 by the 2026-09-08 QA run.
const CLAIMEVEN_SLIDE_1_COACH = lesson08.slides[0].coachMessages;

test('OI-167: CoachDialog caps its bubbles at 120px by default — every existing call site unchanged', () => {
  cleanup();
  wrap(<CoachDialog messages={CLAIMEVEN_SLIDE_1_COACH} />);
  const bubbles = screen.getByTestId('coach-bubbles');
  assert.equal(bubbles.style.maxHeight, '120px');
});

test('OI-167: a screen can opt into a taller bubble cap without touching the shared default', () => {
  cleanup();
  wrap(<CoachDialog messages={CLAIMEVEN_SLIDE_1_COACH} maxBubblesHeight={200} />);
  assert.equal(screen.getByTestId('coach-bubbles').style.maxHeight, '200px');
});

test('OI-167: the fixed variant still reserves its stable 140px height (board screens must not shift)', () => {
  cleanup();
  const { container } = wrap(<CoachDialog messages={CLAIMEVEN_SLIDE_1_COACH} fixed maxBubblesHeight={200} />);
  assert.equal(container.firstChild.style.height, '140px');
});

// ---------------------------------------------------------------------------
// ConceptScreen must actually opt in — asserting the prop exists proves nothing
// about the lesson screen the bug was reported on.
// ---------------------------------------------------------------------------

const STORE_CONTEXT_VALUE = { store: null, session: null, sessionChecked: true, signOut: () => {}, refetchSession: () => {} };
const LESSONS_LIST = [{ id: lesson08.id, title: lesson08.title, order: lesson08.order, free: true }];

function mockFetch(url) {
  const u = String(url);
  if (u.includes(`/api/lessons/${lesson08.id}`)) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve(lesson08) });
  }
  if (u.includes('/api/lessons')) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve(LESSONS_LIST) });
  }
  return Promise.reject(new Error(`unexpected fetch: ${u}`));
}

test('OI-167: /concept/claimeven renders its coach bubbles with the taller cap', async () => {
  cleanup();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;
  try {
    wrap(
      <StoreContext.Provider value={STORE_CONTEXT_VALUE}>
        <ConceptScreen go={() => {}} goBack={() => {}} goReplace={() => {}} lessonId={lesson08.id} />
      </StoreContext.Provider>,
    );
    const bubbles = await waitFor(() => screen.getByTestId('coach-bubbles'));
    // 221 chars needed 139px at the QA viewport; the cap must clear that with headroom
    // for Spanish, which runs ~20% longer than the English it is translated from.
    assert.ok(
      parseInt(bubbles.style.maxHeight, 10) >= 160,
      `expected the lesson screen to opt into a taller coach cap, got ${bubbles.style.maxHeight}`,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ---------------------------------------------------------------------------
// OI-166 — the panel already scrolls; what is missing is the affordance.
// ---------------------------------------------------------------------------

/** Make every element report the metrics a real browser would for an overflowing panel. */
function withMetrics({ scrollHeight, clientHeight, scrollTop = 0 }, fn) {
  const proto = window.HTMLElement.prototype;
  const saved = ['scrollHeight', 'clientHeight', 'scrollTop'].map(
    (k) => [k, Object.getOwnPropertyDescriptor(proto, k)],
  );
  Object.defineProperty(proto, 'scrollHeight', { configurable: true, get: () => scrollHeight });
  Object.defineProperty(proto, 'clientHeight', { configurable: true, get: () => clientHeight });
  Object.defineProperty(proto, 'scrollTop', { configurable: true, get: () => scrollTop, set: () => {} });
  try {
    return fn();
  } finally {
    for (const [k, desc] of saved) {
      if (desc) Object.defineProperty(proto, k, desc);
      else delete proto[k];
    }
  }
}

// claimeven slide 4 — the worst case in the QA table: 752 chars, 131 visible of 338.
const CLAIMEVEN_SLIDE_4_PROSE = lesson08.slides[3].infoProse;

test('OI-166: an overflowing prose panel shows a "more below" affordance', () => {
  cleanup();
  withMetrics({ scrollHeight: 338, clientHeight: 131 }, () => {
    wrap(<InfoProsePanel infoProse={CLAIMEVEN_SLIDE_4_PROSE} />);
    const panel = screen.getByTestId('info-prose');
    assert.ok(panel.scrollHeight > panel.clientHeight + 4, 'fixture must actually overflow');
    assert.ok(
      screen.queryByTestId('info-prose-more'),
      'overflowing prose must advertise that more text exists',
    );
  });
});

test('OI-166: prose that fits shows no affordance', () => {
  cleanup();
  withMetrics({ scrollHeight: 120, clientHeight: 200 }, () => {
    wrap(<InfoProsePanel infoProse="Short." />);
    assert.equal(screen.queryByTestId('info-prose-more'), null);
  });
});

test('OI-166: the affordance disappears once the reader has scrolled to the end', () => {
  cleanup();
  withMetrics({ scrollHeight: 338, clientHeight: 131, scrollTop: 207 }, () => {
    wrap(<InfoProsePanel infoProse={CLAIMEVEN_SLIDE_4_PROSE} />);
    assert.equal(screen.queryByTestId('info-prose-more'), null);
  });
});

test('OI-166: the affordance appears/disappears as the reader scrolls (live, not mount-only)', () => {
  cleanup();
  let scrollTop = 0;
  const proto = window.HTMLElement.prototype;
  const saved = ['scrollHeight', 'clientHeight', 'scrollTop'].map(
    (k) => [k, Object.getOwnPropertyDescriptor(proto, k)],
  );
  Object.defineProperty(proto, 'scrollHeight', { configurable: true, get: () => 338 });
  Object.defineProperty(proto, 'clientHeight', { configurable: true, get: () => 131 });
  Object.defineProperty(proto, 'scrollTop', { configurable: true, get: () => scrollTop, set: (v) => { scrollTop = v; } });
  try {
    wrap(<InfoProsePanel infoProse={CLAIMEVEN_SLIDE_4_PROSE} />);
    const panel = screen.getByTestId('info-prose');
    assert.ok(screen.queryByTestId('info-prose-more'), 'affordance expected at the top of the panel');
    scrollTop = 207;
    act(() => { panel.dispatchEvent(new window.Event('scroll')); });
    assert.equal(screen.queryByTestId('info-prose-more'), null, 'affordance must clear at the end of the text');
  } finally {
    for (const [k, desc] of saved) {
      if (desc) Object.defineProperty(proto, k, desc);
      else delete proto[k];
    }
  }
});

// The panel's existing contract must survive the affordance.
test('OI-166: the panel keeps scrolling itself (flex 0 1 auto, overflowY auto, 96px floor)', () => {
  cleanup();
  wrap(<InfoProsePanel infoProse={CLAIMEVEN_SLIDE_4_PROSE} />);
  const panel = screen.getByTestId('info-prose');
  assert.equal(panel.style.overflowY, 'auto');
  assert.equal(panel.style.flex, '0 1 auto');
  assert.equal(panel.style.minHeight, '96px');
});
