// CoachDialog's narration controls. Two things are easy to get wrong here:
//
//   * The stop button must exist at all — lesson info-prose clips run 50–70s, and
//     the only previous escape was disabling speech globally.
//   * The controls' visibility used to be derived solely from messages[].audio. A
//     concept slide whose only clip is the prose narration has no message audio, so
//     it would have rendered no controls. ConceptScreen passes hasNarration in.
//
// Spec 052 (US5/T050): the button labels now come from `audio.replayNarration` /
// `audio.stopNarration` instead of English literals, so CoachDialog needs a live i18next
// instance in scope. Without an I18nextProvider `t()` would echo the raw key back and every
// getByLabelText below would miss — the provider is load-bearing, not boilerplate.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { I18nextProvider } from 'react-i18next';
import i18next from 'i18next';
import enTranslation from '../../src/i18n/en.json' with { type: 'json' };
import esTranslation from '../../src/i18n/es.json' with { type: 'json' };

const { render, screen, cleanup, fireEvent } = await import('@testing-library/react');
const { CoachDialog } = await import('../../src/components/CoachDialog.jsx');

const i18n = i18next.createInstance();
await i18n.init({
  resources: {
    en: { translation: enTranslation },
    es: { translation: esTranslation },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

const renderDialog = (ui, lang = 'en') => {
  i18n.changeLanguage(lang);
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
};

const WITH_AUDIO = [{ text: 'Hello', audio: '/audio/lessons/a.mp3' }];
const NO_AUDIO = [{ text: 'Hello' }];

test('renders both controls and wires them to their handlers', () => {
  cleanup();
  let replayed = 0;
  let stopped = 0;
  renderDialog(
    <CoachDialog messages={WITH_AUDIO} onReplay={() => { replayed++; }} onStop={() => { stopped++; }} />,
  );

  fireEvent.click(screen.getByLabelText('Replay narration'));
  fireEvent.click(screen.getByLabelText('Stop narration'));
  assert.equal(replayed, 1);
  assert.equal(stopped, 1);
});

test('hasNarration override shows controls for a slide whose only clip is the prose', () => {
  cleanup();
  renderDialog(<CoachDialog messages={NO_AUDIO} onReplay={() => {}} onStop={() => {}} hasNarration />);
  assert.ok(screen.getByLabelText('Replay narration'));
  assert.ok(screen.getByLabelText('Stop narration'));
});

test('without the override, no message audio still means no controls', () => {
  cleanup();
  renderDialog(<CoachDialog messages={NO_AUDIO} onReplay={() => {}} onStop={() => {}} />);
  assert.equal(screen.queryByLabelText('Replay narration'), null);
  assert.equal(screen.queryByLabelText('Stop narration'), null);
});

test('hasNarration={false} suppresses the controls even when messages carry audio', () => {
  cleanup();
  renderDialog(<CoachDialog messages={WITH_AUDIO} onReplay={() => {}} onStop={() => {}} hasNarration={false} />);
  assert.equal(screen.queryByLabelText('Replay narration'), null);
});

test('screens that pass no onStop (SocraticScreen, GameScreen) keep the replay button alone', () => {
  cleanup();
  renderDialog(<CoachDialog messages={WITH_AUDIO} onReplay={() => {}} />);
  assert.ok(screen.getByLabelText('Replay narration'));
  assert.equal(screen.queryByLabelText('Stop narration'), null);
});

test('screens that pass neither handler render no controls', () => {
  cleanup();
  renderDialog(<CoachDialog messages={WITH_AUDIO} />);
  assert.equal(screen.queryByLabelText('Replay narration'), null);
  assert.equal(screen.queryByLabelText('Stop narration'), null);
});

test('narration control labels are translated, not hardcoded English (spec 052 FR-024)', () => {
  cleanup();
  renderDialog(<CoachDialog messages={WITH_AUDIO} onReplay={() => {}} onStop={() => {}} />, 'es');
  assert.ok(screen.getByLabelText('Repetir narración'));
  assert.ok(screen.getByLabelText('Detener narración'));
  assert.equal(screen.queryByLabelText('Replay narration'), null);
  cleanup();
  i18n.changeLanguage('en');
});
