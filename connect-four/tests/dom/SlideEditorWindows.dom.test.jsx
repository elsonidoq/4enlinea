// What the admin actually sees for `slides[].windowHighlights` in the lesson editor.
//
// Two things this pins that pure helper tests cannot:
//   1. A draft that fails isStraightLineWindow is NEVER written into the slide. The whole
//      hazard of this field is that Board draws blindly from cells[0] to cells[last], so a
//      bent/out-of-order window renders as a plausible capsule over the wrong cells.
//   2. SocraticEditor — which shares BoardEditor but whose node does NOT support
//      windowHighlights — shows no window UI at all. Verified by rendering it, not by
//      reasoning about the props.
//
// jsdom has no ResizeObserver; Board's capsule-measuring effect constructs one
// unconditionally, so it must be stubbed before any render here.
import { test, before, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React, { useState } from 'react';

before(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const { render, screen, cleanup, within, fireEvent } = await import('@testing-library/react');
const { default: SlideEditor } = await import('../../src/components/admin/SlideEditor.jsx');
const { default: SocraticEditor } = await import('../../src/components/admin/SocraticEditor.jsx');

afterEach(() => cleanup());

const BASE_SLIDE = {
  movestring: '3344',
  overlays: [],
  coachMessages: [],
  legendItems: [],
  infoProse: '',
};

/** Controlled harness: SlideEditor is a pure controlled component, so the test owns state. */
function Harness({ initial, lang = 'en', onSlide }) {
  const [slide, setSlide] = useState(initial);
  return (
    <SlideEditor
      slide={slide}
      index={0}
      total={1}
      lang={lang}
      onChange={s => { onSlide?.(s); setSlide(s); }}
      onMoveUp={() => {}}
      onMoveDown={() => {}}
      onDelete={() => {}}
    />
  );
}

/**
 * The board cell div for (col, row). Board renders each column's cells top-down
 * (row 5 → row 0) as the trailing children of its `.board-col` wrapper.
 */
function cellAt(container, c, r) {
  const cols = container.querySelectorAll('.board-col');
  assert.equal(cols.length, 7, 'expected 7 board columns');
  const cells = cols[c].querySelectorAll(':scope > div');
  assert.equal(cells.length, 6, `expected 6 cells in column ${c}`);
  return cells[5 - r];
}

/** The BoardEditor belonging to the slide (the only board inside SlideEditor). */
function slideBoard(container) {
  return container;
}

test('windowHighlights section lists an authored window and edits its label', () => {
  const seen = [];
  render(<Harness
    initial={{
      ...BASE_SLIDE,
      windowHighlights: [{
        type: 'tg',
        cells: [{ c: 2, r: 0 }, { c: 3, r: 0 }, { c: 4, r: 0 }, { c: 5, r: 0 }],
        label: 'Green minor-threat window',
        label_es: 'Ventana de amenaza menor',
      }],
    }}
    onSlide={s => seen.push(s)}
  />);

  assert.ok(screen.getByText(/window highlights/i), 'section heading missing');
  // Cells are surfaced 0-indexed, matching the rest of this admin editor.
  assert.ok(screen.getByText('c2,r0 → c5,r0'), 'window cell span not shown');

  const labelInput = screen.getByPlaceholderText(/window label/i);
  assert.equal(labelInput.value, 'Green minor-threat window');

  fireEvent.change(labelInput, { target: { value: 'Green minor-threat window!' } });
  const last = seen.at(-1);
  assert.equal(last.windowHighlights[0].label, 'Green minor-threat window!');
  assert.equal(last.windowHighlights[0].label_es, 'Ventana de amenaza menor', 'es sibling must survive an en edit');
});

test('lang="es" edits label_es, not label', () => {
  const seen = [];
  render(<Harness
    lang="es"
    initial={{
      ...BASE_SLIDE,
      windowHighlights: [{ type: 'tg', cells: [{ c: 2, r: 0 }, { c: 3, r: 0 }], label: 'EN', label_es: 'ES' }],
    }}
    onSlide={s => seen.push(s)}
  />);

  const labelInput = screen.getByLabelText('Slide 1 window 1 label');
  assert.equal(labelInput.value, 'ES');
  assert.equal(labelInput.placeholder, '(no Spanish translation yet)');
  fireEvent.change(labelInput, { target: { value: 'ES!' } });
  const last = seen.at(-1);
  assert.equal(last.windowHighlights[0].label_es, 'ES!');
  assert.equal(last.windowHighlights[0].label, 'EN', 'English label must be untouched in es mode');
});

test('clicking cells in order builds a window and commits it in click order', () => {
  const seen = [];
  const { container } = render(<Harness initial={{ ...BASE_SLIDE }} onSlide={s => seen.push(s)} />);

  fireEvent.click(screen.getByRole('button', { name: /add window/i }));

  // Right-to-left click order must be preserved verbatim — it is a valid traversal order.
  for (const [c, r] of [[5, 0], [4, 0], [3, 0], [2, 0]]) {
    fireEvent.click(cellAt(slideBoard(container), c, r));
  }

  const commit = screen.getByRole('button', { name: /^save window$/i });
  assert.equal(commit.disabled, false, 'a valid straight-line draft must be committable');
  fireEvent.click(commit);

  const last = seen.at(-1);
  assert.deepEqual(last.windowHighlights, [{
    type: 'claim',
    cells: [{ c: 5, r: 0 }, { c: 4, r: 0 }, { c: 3, r: 0 }, { c: 2, r: 0 }],
  }]);
});

test('a bent draft is rejected: commit stays disabled and nothing is written to the slide', () => {
  const seen = [];
  const { container } = render(<Harness initial={{ ...BASE_SLIDE }} onSlide={s => seen.push(s)} />);

  fireEvent.click(screen.getByRole('button', { name: /add window/i }));
  for (const [c, r] of [[2, 0], [3, 0], [3, 1]]) {
    fireEvent.click(cellAt(slideBoard(container), c, r));
  }

  assert.ok(screen.getByText(/not a contiguous straight line/i), 'admin is not told why it was rejected');
  assert.equal(screen.getByRole('button', { name: /^save window$/i }).disabled, true);
  assert.ok(
    seen.every(s => s.windowHighlights === undefined),
    'an invalid draft must never reach the slide',
  );
});

test('an out-of-order line is flagged and "Fix order" makes it committable', () => {
  const seen = [];
  const { container } = render(<Harness initial={{ ...BASE_SLIDE }} onSlide={s => seen.push(s)} />);

  fireEvent.click(screen.getByRole('button', { name: /add window/i }));
  for (const [c, r] of [[2, 0], [4, 0], [3, 0], [5, 0]]) {
    fireEvent.click(cellAt(slideBoard(container), c, r));
  }

  assert.ok(screen.getByText(/clicked out of order/i));
  assert.equal(screen.getByRole('button', { name: /^save window$/i }).disabled, true);

  fireEvent.click(screen.getByRole('button', { name: /fix order/i }));
  assert.equal(screen.getByRole('button', { name: /^save window$/i }).disabled, false);

  fireEvent.click(screen.getByRole('button', { name: /^save window$/i }));
  assert.deepEqual(seen.at(-1).windowHighlights[0].cells,
    [{ c: 2, r: 0 }, { c: 3, r: 0 }, { c: 4, r: 0 }, { c: 5, r: 0 }]);
});

test('deleting the last window removes the key rather than leaving an empty array', () => {
  const seen = [];
  render(<Harness
    initial={{ ...BASE_SLIDE, windowHighlights: [{ type: 'tg', cells: [{ c: 2, r: 0 }, { c: 3, r: 0 }] }] }}
    onSlide={s => seen.push(s)}
  />);

  fireEvent.click(screen.getByRole('button', { name: /remove window/i }));
  const last = seen.at(-1);
  assert.equal('windowHighlights' in last, false, 'unedited slides must stay windowHighlights-free');
});

test('SocraticEditor shows no window UI — its node does not support windowHighlights', () => {
  const { container } = render(
    <SocraticEditor
      enabled
      socratic={{ movestring: '3344', overlays: [], correctCol: 3 }}
      lang="en"
      onChange={() => {}}
    />
  );
  assert.equal(within(container).queryByText(/window/i), null,
    'the shared BoardEditor must not surface window controls in the socratic editor');
});
