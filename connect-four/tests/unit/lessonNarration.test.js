import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getNarrationQueue, getSlideNarrationQueue } from '../../src/lib/lessonNarration.js';

test('speechEnabled:false returns [] regardless of populated audio', () => {
  const messages = [
    { audio: '/audio/lessons/abc123.mp3' },
    { audio: '/audio/lessons/def456.mp3' },
  ];
  assert.deepEqual(getNarrationQueue(messages, false), []);
});

test('audio: null is skipped', () => {
  const messages = [
    { audio: '/audio/lessons/abc123.mp3' },
    { audio: null },
    { audio: '/audio/lessons/def456.mp3' },
  ];
  assert.deepEqual(getNarrationQueue(messages, true), [
    '/audio/lessons/abc123.mp3',
    '/audio/lessons/def456.mp3',
  ]);
});

test('audio missing (undefined) is skipped', () => {
  const messages = [
    { text: 'no audio field at all' },
    { audio: '/audio/lessons/def456.mp3' },
  ];
  assert.deepEqual(getNarrationQueue(messages, true), ['/audio/lessons/def456.mp3']);
});

test('audio: "" (empty string) is skipped', () => {
  const messages = [
    { audio: '' },
    { audio: '/audio/lessons/def456.mp3' },
  ];
  assert.deepEqual(getNarrationQueue(messages, true), ['/audio/lessons/def456.mp3']);
});

test('audio: whitespace-only is skipped', () => {
  const messages = [
    { audio: '   ' },
    { audio: '/audio/lessons/def456.mp3' },
  ];
  assert.deepEqual(getNarrationQueue(messages, true), ['/audio/lessons/def456.mp3']);
});

test('returned order matches input order', () => {
  const messages = [
    { audio: '/audio/lessons/a.mp3' },
    { audio: '/audio/lessons/b.mp3' },
    { audio: '/audio/lessons/c.mp3' },
  ];
  assert.deepEqual(getNarrationQueue(messages, true), [
    '/audio/lessons/a.mp3',
    '/audio/lessons/b.mp3',
    '/audio/lessons/c.mp3',
  ]);
});

test('all messages null/missing audio returns []', () => {
  const messages = [{ audio: null }, { text: 'x' }, { audio: '' }];
  assert.deepEqual(getNarrationQueue(messages, true), []);
});

test('empty coachMessages array returns []', () => {
  assert.deepEqual(getNarrationQueue([], true), []);
});

test('non-array coachMessages returns [] defensively', () => {
  assert.deepEqual(getNarrationQueue(undefined, true), []);
  assert.deepEqual(getNarrationQueue(null, true), []);
});

test('accepts a socratic message array unmodified (same shape as coachMessages)', () => {
  // socratic.messages[phase] is structurally identical to slides[].coachMessages, so
  // getNarrationQueue consumes it verbatim — no change to this helper was needed.
  const socraticAsk = [
    { text: 'Punish it', mood: 'think', audio: '/audio/lessons/soc1.mp3' },
  ];
  assert.deepEqual(getNarrationQueue(socraticAsk, true), ['/audio/lessons/soc1.mp3']);
  assert.deepEqual(getNarrationQueue(socraticAsk, false), []);
  // An unsynthesized phase (migration landed, audio not generated yet) narrates nothing.
  assert.deepEqual(getNarrationQueue([{ text: 'Punish it', mood: 'think' }], true), []);
});

// --- getSlideNarrationQueue: coach bubbles, then the info prose ---------------

test('getSlideNarrationQueue: bubbles first, then infoProse', () => {
  const slide = {
    coachMessages: [{ audio: '/audio/lessons/a.mp3' }, { audio: '/audio/lessons/b.mp3' }],
    infoProseAudio: '/audio/lessons/prose.mp3',
  };
  assert.deepEqual(getSlideNarrationQueue(slide, true), [
    '/audio/lessons/a.mp3',
    '/audio/lessons/b.mp3',
    '/audio/lessons/prose.mp3',
  ]);
});

test('getSlideNarrationQueue: a prose-only slide still narrates', () => {
  const slide = { coachMessages: [{ text: 'no clip yet' }], infoProseAudio: '/audio/lessons/prose.mp3' };
  assert.deepEqual(getSlideNarrationQueue(slide, true), ['/audio/lessons/prose.mp3']);
});

test('getSlideNarrationQueue: no infoProseAudio behaves exactly like getNarrationQueue', () => {
  const slide = { coachMessages: [{ audio: '/audio/lessons/a.mp3' }] };
  assert.deepEqual(getSlideNarrationQueue(slide, true), ['/audio/lessons/a.mp3']);
});

test('getSlideNarrationQueue: speechEnabled:false returns [] even with prose audio', () => {
  const slide = {
    coachMessages: [{ audio: '/audio/lessons/a.mp3' }],
    infoProseAudio: '/audio/lessons/prose.mp3',
  };
  assert.deepEqual(getSlideNarrationQueue(slide, false), []);
});

test('getSlideNarrationQueue: empty/whitespace/null infoProseAudio is skipped', () => {
  for (const bad of ['', '   ', null, undefined]) {
    assert.deepEqual(
      getSlideNarrationQueue({ coachMessages: [{ audio: '/audio/lessons/a.mp3' }], infoProseAudio: bad }, true),
      ['/audio/lessons/a.mp3'],
      `infoProseAudio ${JSON.stringify(bad)} should be skipped`,
    );
  }
});

test('getSlideNarrationQueue: tolerates undefined/empty slides', () => {
  assert.deepEqual(getSlideNarrationQueue(undefined, true), []);
  assert.deepEqual(getSlideNarrationQueue({}, true), []);
});

test('getSlideNarrationQueue: does not mutate the caller\'s coachMessages array', () => {
  const coachMessages = [{ audio: '/audio/lessons/a.mp3' }];
  getSlideNarrationQueue({ coachMessages, infoProseAudio: '/audio/lessons/prose.mp3' }, true);
  assert.equal(coachMessages.length, 1);
});
