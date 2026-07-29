// Renders the lesson info-prose panel for real, per the CLAUDE.md rule that a green
// test on the producer alone is not evidence the app shows the right thing.
//
// Two regressions are pinned here:
//   * OI-77 — authored `\n\n` collapsed into one wall of text because the prose went
//     into a plain <div>. 33 slides across 13 lessons are written as 2–4 paragraphs.
//   * The panel must scroll ITSELF. Before this, ConceptScreen's whole content column
//     scrolled, so reading long prose pushed the board off screen.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { render, screen, cleanup } = await import('@testing-library/react');
const { InfoProsePanel, splitInfoProse } = await import('../../src/components/InfoProsePanel.jsx');

const THREE_PARAGRAPHS = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.';

test('splitInfoProse: blank lines separate paragraphs; single-paragraph prose is one entry', () => {
  assert.deepEqual(splitInfoProse(THREE_PARAGRAPHS), [
    'First paragraph.',
    'Second paragraph.',
    'Third paragraph.',
  ]);
  assert.deepEqual(splitInfoProse('Just one.'), ['Just one.']);
  // A single newline is a soft wrap in the authored JSON, not a paragraph break.
  assert.deepEqual(splitInfoProse('One line.\nStill the same paragraph.'), [
    'One line.\nStill the same paragraph.',
  ]);
  // Blank lines carrying whitespace still split, and trailing blanks add no empties.
  assert.deepEqual(splitInfoProse('A.\n   \nB.\n\n'), ['A.', 'B.']);
  for (const empty of ['', '   ', null, undefined, 42]) {
    assert.deepEqual(splitInfoProse(empty), [], `${JSON.stringify(empty)} should yield no paragraphs`);
  }
});

test('InfoProsePanel renders one <p> per authored paragraph', () => {
  cleanup();
  const { container } = render(<InfoProsePanel infoProse={THREE_PARAGRAPHS} />);
  const paragraphs = container.querySelectorAll('p');
  assert.equal(paragraphs.length, 3);
  assert.equal(paragraphs[0].textContent, 'First paragraph.');
  assert.equal(paragraphs[2].textContent, 'Third paragraph.');
  // The text is not run together — the wall-of-text symptom of OI-77.
  assert.ok(!container.textContent.includes('First paragraph. Second paragraph.'));
});

test('InfoProsePanel scrolls internally instead of scrolling the page', () => {
  cleanup();
  render(<InfoProsePanel infoProse={THREE_PARAGRAPHS} />);
  const panel = screen.getByTestId('info-prose');
  assert.equal(panel.style.overflowY, 'auto');
  // flex-grow MUST stay 0: with '1 1 auto' the panel stretched into all the leftover
  // space, leaving a tall empty white box under short prose on a desktop viewport.
  // flex-shrink 1 + the minHeight floor is what makes it (and not the board) give way
  // when the viewport is too short.
  assert.equal(panel.style.flex, '0 1 auto');
  assert.equal(panel.style.minHeight, '96px');
});

test('InfoProsePanel renders nothing when there is no prose', () => {
  cleanup();
  const { container } = render(<InfoProsePanel infoProse="" />);
  assert.equal(container.innerHTML, '');
  cleanup();
  const { container: c2 } = render(<InfoProsePanel />);
  assert.equal(c2.innerHTML, '');
});
