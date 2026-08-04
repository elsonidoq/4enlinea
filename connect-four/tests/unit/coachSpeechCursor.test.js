// Fix 1: the GameScreen coach-speech effect used to key on `coachMessages.length` and read a
// single `lastCoachKeyRef`, so (a) a replace-mode update (length 1 -> 1) never fired it,
// (b) a batched double-update (length +2, one run) spoke only the last key, and (c) restoring
// the pre-hint snapshot re-fired it on a stale key. This module is the pure core of the fix:
// each message carries its own key and a monotonic seq, and the screen speaks everything past
// its cursor.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectUnspokenKeys } from '../../src/lib/coachSpeechCursor.js';

const msg = (seq, key) => ({ text: 't', mood: 'happy', seq, key });

test('speaks a replace-mode message even though the array length did not change', () => {
  // FR-008 path: side === 'second' on an empty board replaces the intro bubble in place.
  const before = [msg(1, 'coach.spoken.sparring.intro.0')];
  const after = [msg(2, 'coach.spoken.ai_move.neutral.0')];
  assert.deepEqual(selectUnspokenKeys(before, 0).keys, ['coach.spoken.sparring.intro.0']);
  assert.deepEqual(
    selectUnspokenKeys(after, 1),
    { keys: ['coach.spoken.ai_move.neutral.0'], nextSeq: 2 },
  );
});

test('speaks BOTH keys when two updates land in one React batch', () => {
  // The move-feedback bubble and the game-ending bubble are appended in the same batch.
  const messages = [
    msg(1, 'coach.spoken.sparring.intro.0'),
    msg(2, 'coach.spoken.generic.optimal.0'),
    msg(3, 'coach.spoken.sparring.outcome.loss'),
  ];
  assert.deepEqual(
    selectUnspokenKeys(messages, 1),
    { keys: ['coach.spoken.generic.optimal.0', 'coach.spoken.sparring.outcome.loss'], nextSeq: 3 },
  );
});

test('restoring the pre-hint snapshot re-speaks nothing', () => {
  const snapshot = [msg(1, 'coach.spoken.sparring.intro.0')];
  // Hint ON appended seq 2 and it was spoken; hint OFF restores the snapshot.
  assert.deepEqual(selectUnspokenKeys(snapshot, 2), { keys: [], nextSeq: 2 });
});

test('a message with no key advances the cursor but speaks nothing', () => {
  const messages = [msg(1, 'coach.spoken.sparring.intro.0'), msg(2, null)];
  assert.deepEqual(selectUnspokenKeys(messages, 1), { keys: [], nextSeq: 2 });
});

test('the cursor never moves backwards', () => {
  assert.deepEqual(selectUnspokenKeys([], 7), { keys: [], nextSeq: 7 });
  assert.deepEqual(selectUnspokenKeys([msg(3, 'a')], 7), { keys: [], nextSeq: 7 });
});

test('keys come back in message order, not reversed', () => {
  const messages = [msg(5, 'first'), msg(6, 'second')];
  assert.deepEqual(selectUnspokenKeys(messages, 4).keys, ['first', 'second']);
});
