// OI-163 — resigning before playing a single move saved nothing and landed the player on a
// broken `/game/null` review, while STILL incrementing the local sparring record.
//
// The chain (all read at source): useGameBoard.js `handleResign` early-returns only on
// `gameOver`, so at move 0 it calls `onGameEnd('loss', [])` → GameScreen.jsx `saveGame` →
// `POST /api/games` with `moves: ''` → 400 (swallowed, gameId stays null) → but
// `store.saveSparringRecord(result)` runs anyway (GameScreen.jsx:93) and
// `goReplace(pickGameEndScreen(...), { id: null })` navigates to a review of a game that
// does not exist.
//
// Decision (see .superpowers/sdd/qa-2026-09-08-remediation/batch-C.md): a resign at move 0 is
// refused with a visible coach message. There is nothing to save, nothing to review, and no
// loss worth recording — and the player is not trapped (TopBar Back leaves the screen). The
// single seam that decides it is `onGameEnd`: if it never fires, no game row is POSTed, no
// local sparring record is written, and no navigation happens — all three at once.
//
// Harness: a probe component that mounts ONLY the hook, so none of GameScreen's audio/store/
// analytics wiring is involved. i18n provider pattern copied from
// tests/dom/ChallengeScreenDrawStates.dom.test.jsx.
import { test, before, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18next from 'i18next';
import enTranslation from '../../src/i18n/en.json' with { type: 'json' };
import { useGameBoard } from '../../src/lib/useGameBoard.js';

const i18n = i18next.createInstance();
await i18n.init({
  resources: { en: { translation: enTranslation } },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

before(() => {
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
});

beforeEach(() => {
  // The hook only fetches on a move/hint/AI turn; none of those happen in these tests.
  globalThis.fetch = async () => ({ ok: false, status: 404, json: async () => ({}), text: async () => '' });
});

afterEach(cleanup);

function Probe({ initialMoves, onGameEnd }) {
  const { handleResign, coachMessages, moveHistory } = useGameBoard({
    initialMoves,
    side: 'first',
    difficulty: 'easy',
    onGameEnd,
  });
  return (
    <div>
      <button type="button" onClick={handleResign}>resign</button>
      <span data-testid="moves">{moveHistory.length}</span>
      <ul>{coachMessages.map((m, i) => <li key={i}>{m.text}</li>)}</ul>
    </div>
  );
}

function mount(initialMoves, calls) {
  return render(
    <I18nextProvider i18n={i18n}>
      <Probe initialMoves={initialMoves} onGameEnd={(result, moves) => calls.push({ result, moves })} />
    </I18nextProvider>,
  );
}

test('resigning at move 0 does not end the game — no save, no local record, no /game/null', () => {
  const calls = [];
  mount('', calls);
  assert.equal(screen.getByTestId('moves').textContent, '0');

  fireEvent.click(screen.getByText('resign'));

  assert.deepEqual(calls, [], 'onGameEnd must not fire for a 0-move resign — it is the single seam that saves the game, writes the local sparring record and navigates to the review');
});

test('resigning at move 0 tells the player why, in words they can read', () => {
  const calls = [];
  mount('', calls);
  fireEvent.click(screen.getByText('resign'));

  const expected = i18n.t('sparring.resignNoMoves');
  assert.notEqual(expected, 'sparring.resignNoMoves', 'sparring.resignNoMoves must exist in en.json');
  assert.ok(screen.getByText(expected), 'the coach must explain the refused resign');
});

test('resigning after a move still ends the game (no regression)', () => {
  const calls = [];
  mount('0', calls);
  assert.equal(screen.getByTestId('moves').textContent, '1');

  fireEvent.click(screen.getByText('resign'));

  assert.equal(calls.length, 1);
  assert.equal(calls[0].result, 'loss');
});
