import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeReturnPath } from '../../server/stripeProcessor.js';

test('a valid relative path passes through', () => {
  assert.strictEqual(sanitizeReturnPath('/settings'), '/settings');
});

test('an absolute URL is rejected (open redirect)', () => {
  assert.strictEqual(sanitizeReturnPath('https://evil.com/x'), '/');
});

test('a protocol-relative URL is rejected', () => {
  assert.strictEqual(sanitizeReturnPath('//evil.com'), '/');
});

test('an absent returnPath falls back to root', () => {
  assert.strictEqual(sanitizeReturnPath(undefined), '/');
});
