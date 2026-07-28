// What the admin actually sees for `slides[].showWindowCounts` in the lesson editor.
//
// The flag is the ONLY authored half of the window-count overlay — the 6x7 `windowCounts`
// array is a derived cache stamped by saveLessonFile. So the thing worth pinning here is
// narrow but load-bearing: the checkbox must write a real boolean onto the slide, and it
// must NOT write a windowCounts array (an editor that authored numbers would defeat the
// whole derived-cache design and the staleness gate that guards it).
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

const { render, screen, cleanup, fireEvent } = await import('@testing-library/react');
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

const checkbox = () => screen.getByLabelText('Slide 1 show window counts');

test('SlideEditor: the window-counts checkbox is unchecked for a slide without the flag', () => {
  render(<Harness initial={{ ...BASE_SLIDE }} />);
  assert.equal(checkbox().checked, false);
});

test('SlideEditor: the checkbox reflects an already-opted-in slide', () => {
  render(<Harness initial={{ ...BASE_SLIDE, showWindowCounts: true }} />);
  assert.equal(checkbox().checked, true);
});

test('SlideEditor: ticking the box writes showWindowCounts:true and authors NO numbers', () => {
  let latest = null;
  render(<Harness initial={{ ...BASE_SLIDE }} onSlide={s => { latest = s; }} />);

  fireEvent.click(checkbox());

  assert.equal(latest.showWindowCounts, true, 'must write a real boolean, not a truthy string');
  // The array is server-derived. An editor that wrote one here would bypass saveLessonFile's
  // recompute and put hand-authored numbers on the board.
  assert.equal(latest.windowCounts, undefined, 'the editor must never author windowCounts');
  assert.equal(checkbox().checked, true);
});

test('SlideEditor: unticking writes false rather than leaving the flag set', () => {
  let latest = null;
  render(<Harness initial={{ ...BASE_SLIDE, showWindowCounts: true }} onSlide={s => { latest = s; }} />);

  fireEvent.click(checkbox());

  assert.equal(latest.showWindowCounts, false);
  assert.equal(checkbox().checked, false);
});

test('SlideEditor: toggling window counts leaves the rest of the slide untouched', () => {
  // Guards the spread in updateField: a slide carries _es siblings and other authored
  // fields the editor UI does not surface, and they must survive a toggle.
  const rich = {
    ...BASE_SLIDE,
    infoProse: 'English prose',
    infoProse_es: 'Prosa en español',
    windowHighlights: [{ type: 'claim', cells: [{ c: 3, r: 0 }, { c: 4, r: 0 }] }],
  };
  let latest = null;
  render(<Harness initial={rich} onSlide={s => { latest = s; }} />);

  fireEvent.click(checkbox());

  assert.equal(latest.infoProse, 'English prose');
  assert.equal(latest.infoProse_es, 'Prosa en español');
  assert.deepEqual(latest.windowHighlights, rich.windowHighlights);
  assert.equal(latest.movestring, '3344');
});

test('SocraticEditor shows no window-counts control — the field is concept-slide only', () => {
  // Verified by rendering, not by reasoning about props: the content gate asserts that
  // socratic nodes never carry showWindowCounts, so the UI must not offer it there.
  render(
    <SocraticEditor
      socratic={{ movestring: '3344', overlays: [], correctCol: 3, messages: {} }}
      lang="en"
      onChange={() => {}}
    />
  );
  assert.equal(screen.queryByText(/Window counts/i), null);
  assert.equal(screen.queryByLabelText(/show window counts/i), null);
});
