// OI-168, legend half — rendered proof that ConceptScreen's legend swatch agrees with
// the ring Board.jsx draws for the same `win` overlay.
//
// tests/unit/winLegendSwatch.test.js pins the pure rule; this file pins the WIRING —
// that ConceptScreen actually feeds the slide's board + overlays into it rather than
// keying the swatch off the overlay type alone.
//
// Fixtures are the REAL shipped lesson JSON, served through a mocked /api/lessons/:id,
// so a content edit that moves a `win` overlay onto a different disc shows up here.
//
// jsdom does not resolve CSS custom properties or paint: these assertions are on the
// TOKEN STRING the component writes into style.background, not on a rendered colour.
import { test, before, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

before(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const { render, cleanup, waitFor } = await import('@testing-library/react');
const { I18nextProvider } = await import('react-i18next');
const { default: i18next } = await import('i18next');
const { default: enTranslation } = await import('../../src/i18n/en.json', { with: { type: 'json' } });
const { StoreContext } = await import('../../src/store/ProfileStore.jsx');
const { ConceptScreen } = await import('../../src/screens/ConceptScreen.jsx');
const { WIN_OVERLAY_GREEN, WIN_OVERLAY_GRAY } = await import('../../src/lib/overlayColors.js');

const i18n = i18next.createInstance();
await i18n.init({
  resources: { en: { translation: enTranslation } },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

afterEach(() => cleanup());

const lessonsDir = fileURLToPath(new URL('../../lessons/', import.meta.url));
const lesson = (file) => JSON.parse(readFileSync(lessonsDir + file, 'utf8'));

const STORE_CONTEXT_VALUE = { store: null, session: null, sessionChecked: true, signOut: () => {}, refetchSession: () => {} };

function mockFetch(lessonJson) {
  return (url) => {
    const u = String(url);
    if (u.includes(`/api/lessons/${lessonJson.id}`)) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(lessonJson) });
    }
    if (u.endsWith('/api/lessons')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([{ id: lessonJson.id, title: lessonJson.title, order: lessonJson.order, free: true }]),
      });
    }
    // Anything else (telemetry, audio) is irrelevant to the legend.
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  };
}

/**
 * The legend swatch is the 14x14 rounded span that precedes the label text.
 * Returns [{ label, background }] as plain STRINGS — never a mounted node, since
 * inspecting a React Fiber in an assertion reads as a hang (see OI-71).
 */
function legendRows(container) {
  return [...container.querySelectorAll('span')]
    .filter(el => el.style.width === '14px' && el.style.height === '14px')
    .map(el => ({
      background: el.style.background || el.style.backgroundColor,
      label: el.nextElementSibling ? el.nextElementSibling.textContent : null,
    }));
}

async function renderSlide(lessonJson, slideIndex) {
    // Only slide 0 is reachable without clicking; for later slides, serve a lesson
    // whose slides array STARTS at the slide under test. The component reads
    // `lesson.slides[slideIndex]`, so this is the same code path with the same data.
  const trimmed = { ...lessonJson, slides: lessonJson.slides.slice(slideIndex) };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch(trimmed);
  try {
    const { container } = render(
      <I18nextProvider i18n={i18n}>
        <StoreContext.Provider value={STORE_CONTEXT_VALUE}>
          <ConceptScreen go={() => {}} goBack={() => {}} goReplace={() => {}} lessonId={trimmed.id} />
        </StoreContext.Provider>
      </I18nextProvider>,
    );
    let rows = [];
    await waitFor(() => {
      rows = legendRows(container);
      assert.ok(rows.length > 0, 'legend never rendered');
    });
    return rows;
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test('lesson-02 slide 0: the "Gray\'s three in a row" swatch is GRAY, not green', async () => {
  // container is torn down by the afterEach below.
  const rows = await renderSlide(lesson('lesson-02-block-before-build.json'), 0);
  const win = rows.find(r => r.label === "Gray's three in a row");
  assert.ok(win, `expected the win legend row, got ${JSON.stringify(rows)}`);
  assert.equal(
    win.background.includes('--eval-good') || win.background.includes('76, 175, 80'), false,
    `a legend for GRAY's discs must not be green, got: ${win.background}`,
  );
  assert.equal(win.background, WIN_OVERLAY_GRAY);
});

test('lesson-06 slide 0: the "Gray\'s connected discs" swatch is GRAY', async () => {
  // container is torn down by the afterEach below.
  const rows = await renderSlide(lesson('lesson-06-the-fork.json'), 0);
  const win = rows.find(r => r.label === "Gray's connected discs");
  assert.ok(win, `expected the win legend row, got ${JSON.stringify(rows)}`);
  assert.equal(win.background, WIN_OVERLAY_GRAY);
});

test('lesson-01 slide 0: a win legend over GREEN discs stays green', async () => {
  // container is torn down by the afterEach below.
  const rows = await renderSlide(lesson('lesson-01-immediate-threat.json'), 0);
  const win = rows.find(r => r.label === 'Three connected discs');
  assert.ok(win, `expected the win legend row, got ${JSON.stringify(rows)}`);
  assert.equal(win.background, WIN_OVERLAY_GREEN);
});

// The trap case: lesson-06 slide 3's `win` overlay sits on the EMPTY cell (c0,r0) —
// a "play here" target marker with no occupant. Board.jsx rings it green; the legend
// must stay green too.
test('lesson-06 slide 3: the EMPTY-cell "Real immediate threat" swatch stays GREEN', async () => {
  // container is torn down by the afterEach below.
  const rows = await renderSlide(lesson('lesson-06-the-fork.json'), 3);
  const win = rows.find(r => r.label === 'Real immediate threat');
  assert.ok(win, `expected the win legend row, got ${JSON.stringify(rows)}`);
  assert.equal(win.background, WIN_OVERLAY_GREEN);
});
