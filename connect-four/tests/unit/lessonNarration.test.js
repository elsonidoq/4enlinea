import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getNarrationQueue } from '../../src/lib/lessonNarration.js';

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
