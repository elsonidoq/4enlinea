import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEEP_REVEAL_SOFT_MS,
  DEEP_REVEAL_HARD_MS,
} from '../../src/lib/deepRevealTimeout.js';

test('hard cap is well beyond the soft hint and covers cold reasoning-model calls', () => {
  assert.ok(DEEP_REVEAL_HARD_MS > DEEP_REVEAL_SOFT_MS);
  assert.ok(DEEP_REVEAL_HARD_MS >= 20000);
});
