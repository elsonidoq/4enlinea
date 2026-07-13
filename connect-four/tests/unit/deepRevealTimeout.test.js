import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEEP_REVEAL_SOFT_MS,
  DEEP_REVEAL_HARD_MS,
  deepRevealPhase,
} from '../../src/lib/deepRevealTimeout.js';

test('hard cap is well beyond the soft hint and covers cold reasoning-model calls', () => {
  assert.ok(DEEP_REVEAL_HARD_MS > DEEP_REVEAL_SOFT_MS);
  assert.ok(DEEP_REVEAL_HARD_MS >= 20000);
});

test('phase transitions: loading -> slow -> timedOut, and done wins whenever resolved', () => {
  assert.equal(deepRevealPhase(0, false), 'loading');
  assert.equal(deepRevealPhase(DEEP_REVEAL_SOFT_MS - 1, false), 'loading');
  assert.equal(deepRevealPhase(DEEP_REVEAL_SOFT_MS, false), 'slow');
  assert.equal(deepRevealPhase(DEEP_REVEAL_HARD_MS, false), 'timedOut');
  assert.equal(deepRevealPhase(DEEP_REVEAL_HARD_MS + 5000, true), 'done');
  assert.equal(deepRevealPhase(1000, true), 'done');
});
