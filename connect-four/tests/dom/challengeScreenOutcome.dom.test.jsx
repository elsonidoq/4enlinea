// Spec 054 (Epic 4) User Story 3, T024/FR-023 (client-writer half). Component tests
// exercising ChallengeScreen.jsx itself (research.md D10) — NOT a pure-helper extraction —
// covering the four outcome-writing sites:
//   ~:408  single-answer wrong submission          -> outcome: 'incorrect' (was 'abandoned')
//   ~:584  forbidden_columns wrong submission       -> outcome: 'incorrect' (was 'abandoned')
//   ~:659  sequence-puzzle SUCCESS (unconditional)  -> outcome: 'correct_first' (FR-020: unchanged)
//   ~:668  sequence-puzzle FAILURE (new call, T030) -> outcome: 'incorrect' (previously recorded nothing)
//
// jsdom has no ResizeObserver; Board's capsule-measuring effect constructs one
// unconditionally, so it must be stubbed before any render here (same pattern as
// SlideEditorWindowCounts.dom.test.jsx).
import { test, before, afterEach } from 'node:test';
import assert from 'node:assert/strict';

before(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  // jsdom's HTMLMediaElement.play() is "not implemented" and returns undefined rather
  // than a Promise; useAudio.js's playSfx() unconditionally chains `.catch()` on the
  // return value, which throws under jsdom without this stub.
  globalThis.HTMLMediaElement.prototype.play = () => Promise.resolve();
  globalThis.HTMLMediaElement.prototype.pause = () => {};
});

const { render, screen, cleanup, fireEvent, waitFor } = await import('@testing-library/react');
const { I18nextProvider } = await import('react-i18next');
const i18next = (await import('i18next')).default;
const { default: enTranslation } = await import('../../src/i18n/en.json', { with: { type: 'json' } });
const { StoreContext } = await import('../../src/store/ProfileStore.jsx');
const { ChallengeScreen } = await import('../../src/screens/ChallengeScreen.jsx');

const i18n = i18next.createInstance();
await i18n.init({
  resources: { en: { translation: enTranslation } },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

afterEach(() => cleanup());

/** Any URL not explicitly handled resolves to a benign non-ok response instead of
 * rejecting — mirrors real fetch's behavior for a 404 and keeps incidental background
 * calls (coach-speech manifest, /api/track analytics) from throwing unhandled rejections. */
function makeFetchMock(handlers) {
  return function mockFetch(url, opts) {
    const u = String(url);
    for (const [match, handler] of handlers) {
      const matches = typeof match === 'string' ? u.includes(match) : match.test(u);
      if (matches) return handler(u, opts);
    }
    return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
  };
}

function makeStore() {
  const attemptCalls = [];
  return {
    attemptCalls,
    store: {
      recordPuzzleAttempt: (row) => { attemptCalls.push(row); },
      recordActivityDay: () => Promise.resolve(),
    },
  };
}

function renderChallengeScreen({ store, category }) {
  const storeContextValue = { store, session: null, sessionChecked: true, signOut: () => {}, refetchSession: () => {} };
  return render(
    <I18nextProvider i18n={i18n}>
      <StoreContext.Provider value={storeContextValue}>
        <ChallengeScreen go={() => {}} goBack={() => {}} category={category} />
      </StoreContext.Provider>
    </I18nextProvider>,
  );
}

test('ChallengeScreen ~:408 — a wrong single-answer submission records outcome "incorrect"', async () => {
  const { store, attemptCalls } = makeStore();
  const PUZZLE = { id: 'puzzle-single-1', category: 'demo_single', move_string: '', correct_cols: null, highlight_metadata: null, interaction_mode: 'single_move' };

  globalThis.fetch = makeFetchMock([
    ['/api/puzzles/draw', () => Promise.resolve({ ok: true, json: () => Promise.resolve({ puzzles: [PUZZLE], session_id: null, resume_idx: 0 }) })],
    ['/api/evaluate-move', () => Promise.resolve({ ok: true, json: () => Promise.resolve({ quality: 'blunder' }) })],
  ]);

  try {
    renderChallengeScreen({ store, category: 'demo_single' });

    const colButton = await waitFor(() => screen.getByRole('button', { name: 'column 1' }));
    fireEvent.click(colButton);

    await waitFor(() => assert.ok(attemptCalls.length > 0, 'expected recordPuzzleAttempt to have been called'));

    assert.equal(attemptCalls[0].outcome, 'incorrect');
    assert.equal(attemptCalls[0].puzzle_id, PUZZLE.id);
    assert.equal(attemptCalls[0].first_attempt_correct, false);
    // moves_tried must be an ARRAY of the columns tried, never a scalar/count — the column is
    // `integer[] NOT NULL` (003_puzzles.sql:28) and Postgres rejects a scalar with "malformed
    // array literal", which the fire-and-forget write path then swallows. QA reproduced that
    // data loss live on the forbidden_columns site before it was fixed (OI-103, spec 054 SC-004).
    assert.ok(Array.isArray(attemptCalls[0].moves_tried), 'moves_tried must be an array, not a count');
  } finally {
    cleanup();
  }
});

test('ChallengeScreen ~:584 — a wrong forbidden_columns submission records outcome "incorrect"', async () => {
  const { store, attemptCalls } = makeStore();
  const PUZZLE = { id: 'puzzle-forbidden-1', category: 'forbidden_columns', move_string: '', correct_cols: null, highlight_metadata: null, interaction_mode: 'single_move' };

  globalThis.fetch = makeFetchMock([
    ['/api/puzzles/draw', () => Promise.resolve({ ok: true, json: () => Promise.resolve({ puzzles: [PUZZLE], session_id: null, resume_idx: 0 }) })],
    // Selecting column 1 (col index 0) but the ONLY forbidden column is index 2 — a false
    // positive AND a missed forbidden column, so quality resolves to 'blunder', not 'optimal'.
    [/\/api\/puzzles\/.*\/check/, () => Promise.resolve({ ok: true, json: () => Promise.resolve({ forbiddenCols: [2] }) })],
  ]);

  try {
    renderChallengeScreen({ store, category: 'forbidden_columns' });

    const colButton = await waitFor(() => screen.getByRole('button', { name: 'column 1' }));
    fireEvent.click(colButton);

    const submitButton = await waitFor(() => screen.getByText('Submit'));
    fireEvent.click(submitButton);

    await waitFor(() => assert.ok(attemptCalls.length > 0, 'expected recordPuzzleAttempt to have been called'));

    assert.equal(attemptCalls[0].outcome, 'incorrect');
    assert.equal(attemptCalls[0].puzzle_id, PUZZLE.id);
    assert.equal(attemptCalls[0].first_attempt_correct, false);
    // moves_tried must be an ARRAY of the columns tried, never a scalar/count — the column is
    // `integer[] NOT NULL` (003_puzzles.sql:28) and Postgres rejects a scalar with "malformed
    // array literal", which the fire-and-forget write path then swallows. QA reproduced that
    // data loss live on the forbidden_columns site before it was fixed (OI-103, spec 054 SC-004).
    assert.ok(Array.isArray(attemptCalls[0].moves_tried), 'moves_tried must be an array, not a count');
  } finally {
    cleanup();
  }
});

test('ChallengeScreen ~:668 — a wrong sequence-puzzle submission now records outcome "incorrect" (T030: previously recorded nothing)', async () => {
  const { store, attemptCalls } = makeStore();
  const PUZZLE = { id: 'puzzle-sequence-1', category: 'forced_win', move_string: '', correct_cols: null, highlight_metadata: null, interaction_mode: 'sequence' };

  globalThis.fetch = makeFetchMock([
    ['/api/puzzles/draw', () => Promise.resolve({ ok: true, json: () => Promise.resolve({ puzzles: [PUZZLE], session_id: null, resume_idx: 0 }) })],
    [/\/sequence\/move/, () => Promise.resolve({ ok: true, json: () => Promise.resolve({ outcome: 'blunder' }) })],
  ]);

  try {
    renderChallengeScreen({ store, category: 'forced_win' });

    const colButton = await waitFor(() => screen.getByRole('button', { name: 'column 1' }));
    fireEvent.click(colButton);

    await waitFor(() => assert.ok(attemptCalls.length > 0, 'expected recordPuzzleAttempt to have been called'));

    assert.equal(attemptCalls[0].outcome, 'incorrect');
    assert.equal(attemptCalls[0].puzzle_id, PUZZLE.id);
    assert.equal(attemptCalls[0].first_attempt_correct, false);
    // puzzle_attempts.moves_tried is `integer[] NOT NULL` (003_puzzles.sql:28); a scalar is
    // rejected by Postgres ("malformed array literal") and the insert is silently swallowed
    // by the fire-and-forget .catch, so this write must carry an ARRAY of the columns tried
    // for FR-019/SC-004 to actually hold. Verified against a real local insert, not assumed.
    assert.deepEqual(attemptCalls[0].moves_tried, [0]);
  } finally {
    cleanup();
  }
});

test('ChallengeScreen ~:659 — the unconditional sequence-puzzle SUCCESS write is unchanged (FR-020)', async () => {
  const { store, attemptCalls } = makeStore();
  const PUZZLE = { id: 'puzzle-sequence-2', category: 'forced_win', move_string: '', correct_cols: null, highlight_metadata: null, interaction_mode: 'sequence' };

  globalThis.fetch = makeFetchMock([
    ['/api/puzzles/draw', () => Promise.resolve({ ok: true, json: () => Promise.resolve({ puzzles: [PUZZLE], session_id: null, resume_idx: 0 }) })],
    [/\/sequence\/move/, () => Promise.resolve({ ok: true, json: () => Promise.resolve({ outcome: 'success', threatCells: [] }) })],
  ]);

  try {
    renderChallengeScreen({ store, category: 'forced_win' });

    const colButton = await waitFor(() => screen.getByRole('button', { name: 'column 1' }));
    fireEvent.click(colButton);

    await waitFor(() => assert.ok(attemptCalls.length > 0, 'expected recordPuzzleAttempt to have been called'));

    assert.equal(attemptCalls[0].outcome, 'correct_first');
    assert.equal(attemptCalls[0].puzzle_id, PUZZLE.id);
    assert.equal(attemptCalls[0].first_attempt_correct, true);
    // FR-020 keeps this site's OUTCOME unchanged, but its moves_tried was a scalar `1`,
    // which Postgres rejects for an `integer[]` column — so this success write never landed
    // for signed-in users either. Fixed to `[col]` alongside OI-103; asserted here so the
    // shape cannot regress. (The outcome value above is what FR-020 freezes, not the shape.)
    assert.ok(Array.isArray(attemptCalls[0].moves_tried), 'moves_tried must be an array, not a count');
  } finally {
    cleanup();
  }
});
