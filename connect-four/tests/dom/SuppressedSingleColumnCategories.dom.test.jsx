// Spec 056 (Epic 9) T026 / FR-016: `undercut`/`overcut` used to show "nothing" for a correct-
// column hint everywhere as an EMERGENT side effect of the legacy scalar column being NULL for
// exactly those two categories, while `correct_cols` stayed fully populated. Retiring that
// scalar (T009-T023) replaced the free NULL with an explicit, shared
// SUPPRESSED_SINGLE_COLUMN_CATEGORIES check at five sites. This file pins that the three sites with
// no other automated coverage (PuzzlePickerModal.jsx's column label, PuzzlePickerRow.jsx's row —
// fed by AdminLessonEditorScreen.jsx's adapter — and CurationWorkspace.jsx's board hint marker)
// still render nothing for undercut/overcut, and (as a control) still DO render a hint for a
// non-suppressed single-answer category (claimeven), proving the suppression is category-specific
// and not an accidental universal regression.
import { test, before, afterEach } from 'node:test';
import assert from 'node:assert/strict';

before(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const { render, cleanup } = await import('@testing-library/react');
const { default: PuzzlePickerModal } = await import('../../src/components/admin/PuzzlePickerModal.jsx');
const { default: PuzzlePickerRow } = await import('../../src/components/admin/PuzzlePickerRow.jsx');
const { CurationWorkspace } = await import('../../src/components/CurationWorkspace.jsx');

afterEach(() => cleanup());

function makeFetchMock(handlers) {
  return function mockFetch(url) {
    const u = String(url);
    for (const [match, handler] of handlers) {
      const matches = typeof match === 'string' ? u.includes(match) : match.test(u);
      if (matches) return handler(u);
    }
    return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
  };
}

// ── PuzzlePickerModal — column label ─────────────────────────────────────────

test('PuzzlePickerModal renders no column label for an undercut puzzle', async () => {
  globalThis.fetch = makeFetchMock([[
    '/api/admin/puzzles',
    () => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        puzzles: [{
          id: 'p1', category: 'undercut', move_string: '33333222220056056',
          goal_prompt: 'Undercut drill', correct_cols: [0, 1, 2],
        }],
      }),
    }),
  ]]);

  const { container, findByText } = render(
    <PuzzlePickerModal category="undercut" existingPuzzles={[]} onAdd={() => {}} onClose={() => {}} />,
  );
  await findByText('Undercut drill');
  assert.equal(/col \d/.test(container.textContent), false, 'must not render a "col N" label for undercut');
});

test('PuzzlePickerModal renders no column label for an overcut puzzle', async () => {
  globalThis.fetch = makeFetchMock([[
    '/api/admin/puzzles',
    () => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        puzzles: [{
          id: 'p2', category: 'overcut', move_string: '333332222200560560655351',
          goal_prompt: 'Overcut drill', correct_cols: [4],
        }],
      }),
    }),
  ]]);

  const { container, findByText } = render(
    <PuzzlePickerModal category="overcut" existingPuzzles={[]} onAdd={() => {}} onClose={() => {}} />,
  );
  await findByText('Overcut drill');
  assert.equal(/col \d/.test(container.textContent), false, 'must not render a "col N" label for overcut');
});

test('PuzzlePickerModal — control: DOES render a column label for a non-suppressed category (claimeven)', async () => {
  globalThis.fetch = makeFetchMock([[
    '/api/admin/puzzles',
    () => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        puzzles: [{
          id: 'p3', category: 'claimeven', move_string: '3233333556',
          goal_prompt: 'Claimeven drill', correct_cols: [2],
        }],
      }),
    }),
  ]]);

  const { container, findByText } = render(
    <PuzzlePickerModal category="claimeven" existingPuzzles={[]} onAdd={() => {}} onClose={() => {}} />,
  );
  await findByText('Claimeven drill');
  assert.equal(/col 2/.test(container.textContent), true, 'must still render "col 2" for a non-suppressed category');
});

// ── PuzzlePickerRow — staged confirmationChallenges entry ────────────────────
// Fed by AdminLessonEditorScreen.jsx's handleAddPuzzle adapter (T020), which writes
// correctCol: null for undercut/overcut and correctCol: correct_cols[0] otherwise.

test('PuzzlePickerRow renders no column digit when correctCol is null (undercut/overcut adapter output)', () => {
  const puzzle = { moveString: '33333222220056056', goalPrompt: 'Undercut drill', correctCol: null, puzzleId: 'p1' };
  const { container } = render(
    <PuzzlePickerRow puzzle={puzzle} index={0} total={1} onRemove={() => {}} onMoveUp={() => {}} onMoveDown={() => {}} />,
  );
  assert.equal(/col \d/.test(container.textContent), false, 'must not render a "col N" digit when correctCol is null');
});

test('PuzzlePickerRow — control: DOES render a column digit for a non-suppressed category', () => {
  const puzzle = { moveString: '3233333556', goalPrompt: 'Claimeven drill', correctCol: 2, puzzleId: 'p3' };
  const { container } = render(
    <PuzzlePickerRow puzzle={puzzle} index={0} total={1} onRemove={() => {}} onMoveUp={() => {}} onMoveDown={() => {}} />,
  );
  assert.equal(/col 2/.test(container.textContent), true, 'must still render "col 2" for a non-suppressed category');
});

// ── CurationWorkspace — board hint marker ────────────────────────────────────
// The hint overlay is a purely visual (inline-style) cell — role='hint' produces an extra
// absolutely-positioned div with the green hint background `rgba(34,197,94,.18)` (Board.jsx's
// shimStyle). Query for that exact background string rather than any text, since no text label
// exists for this site.
function hasHintCell(container) {
  return Array.from(container.querySelectorAll('div')).some(
    el => (el.style.background || '').replace(/\s+/g, '').includes('34,197,94'),
  );
}

test('CurationWorkspace renders no hint-colored cell for an undercut candidate', async () => {
  globalThis.fetch = makeFetchMock([[
    '/api/admin/candidates',
    () => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        candidates: [{
          id: 'c1', category: 'undercut', move_string: '33333222220056056',
          solver_scores: null, correct_cols: [0, 1, 2],
          highlight_metadata: {
            type: 'cells',
            cells: [
              { column: 4, row: 1, role: 'killing_threat' },
              { column: 4, row: 2, role: 'dead_threat' },
            ],
          },
        }],
      }),
    }),
  ]]);

  const { container, findByText } = render(
    <CurationWorkspace category="undercut" onBack={() => {}} />,
  );
  await findByText('Undercut');
  assert.equal(hasHintCell(container), false, 'must not render a hint-colored cell for undercut');
});

test('CurationWorkspace — control: DOES render a hint-colored cell for figure_7 (non-suppressed)', async () => {
  globalThis.fetch = makeFetchMock([[
    '/api/admin/candidates',
    () => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        candidates: [{
          id: 'c2', category: 'figure_7', move_string: '4322243040',
          solver_scores: null, correct_cols: [3],
          highlight_metadata: { type: 'cells', cells: [] },
        }],
      }),
    }),
  ]]);

  const { container, findByText } = render(
    <CurationWorkspace category="figure_7" onBack={() => {}} />,
  );
  await findByText('Figure 7');
  assert.equal(hasHintCell(container), true, 'must still render a hint-colored cell for figure_7');
});
