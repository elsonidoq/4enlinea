// CoachDialog's narration controls. Two things are easy to get wrong here:
//
//   * The stop button must exist at all — lesson info-prose clips run 50–70s, and
//     the only previous escape was disabling speech globally.
//   * The controls' visibility used to be derived solely from messages[].audio. A
//     concept slide whose only clip is the prose narration has no message audio, so
//     it would have rendered no controls. ConceptScreen passes hasNarration in.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { render, screen, cleanup, fireEvent } = await import('@testing-library/react');
const { CoachDialog } = await import('../../src/components/CoachDialog.jsx');

const WITH_AUDIO = [{ text: 'Hello', audio: '/audio/lessons/a.mp3' }];
const NO_AUDIO = [{ text: 'Hello' }];

test('renders both controls and wires them to their handlers', () => {
  cleanup();
  let replayed = 0;
  let stopped = 0;
  render(
    <CoachDialog messages={WITH_AUDIO} onReplay={() => { replayed++; }} onStop={() => { stopped++; }} />,
  );

  fireEvent.click(screen.getByLabelText('Replay narration'));
  fireEvent.click(screen.getByLabelText('Stop narration'));
  assert.equal(replayed, 1);
  assert.equal(stopped, 1);
});

test('hasNarration override shows controls for a slide whose only clip is the prose', () => {
  cleanup();
  render(<CoachDialog messages={NO_AUDIO} onReplay={() => {}} onStop={() => {}} hasNarration />);
  assert.ok(screen.getByLabelText('Replay narration'));
  assert.ok(screen.getByLabelText('Stop narration'));
});

test('without the override, no message audio still means no controls', () => {
  cleanup();
  render(<CoachDialog messages={NO_AUDIO} onReplay={() => {}} onStop={() => {}} />);
  assert.equal(screen.queryByLabelText('Replay narration'), null);
  assert.equal(screen.queryByLabelText('Stop narration'), null);
});

test('hasNarration={false} suppresses the controls even when messages carry audio', () => {
  cleanup();
  render(<CoachDialog messages={WITH_AUDIO} onReplay={() => {}} onStop={() => {}} hasNarration={false} />);
  assert.equal(screen.queryByLabelText('Replay narration'), null);
});

test('screens that pass no onStop (SocraticScreen, GameScreen) keep the replay button alone', () => {
  cleanup();
  render(<CoachDialog messages={WITH_AUDIO} onReplay={() => {}} />);
  assert.ok(screen.getByLabelText('Replay narration'));
  assert.equal(screen.queryByLabelText('Stop narration'), null);
});

test('screens that pass neither handler render no controls', () => {
  cleanup();
  render(<CoachDialog messages={WITH_AUDIO} />);
  assert.equal(screen.queryByLabelText('Replay narration'), null);
  assert.equal(screen.queryByLabelText('Stop narration'), null);
});
