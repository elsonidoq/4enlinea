// Spec 042 (Mistake Review Unification), US5 / T040.
// Unit tests for the shared response-boundary render guard (research.md §5, FR-017/FR-018/SC-005).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { stripInternalTokens, sanitizeTermsMap } from '../reasonRenderGuard.mjs';

describe('stripInternalTokens', () => {
  it('strips a community- prefixed token from prose', () => {
    const text = 'This position sets up a community-z-threat that wins the odd rows.';
    const result = stripInternalTokens(text);
    assert.ok(!/community-/i.test(result), 'community- prefix must not remain');
    assert.equal(result, 'This position sets up a z-threat that wins the odd rows.');
  });

  it('strips an allen- prefixed token from prose', () => {
    const text = 'This follows allen-v1, a classic defensive pattern.';
    const result = stripInternalTokens(text);
    assert.ok(!/allen-/i.test(result), 'allen- prefix must not remain');
    assert.equal(result, 'This follows v1, a classic defensive pattern.');
  });

  it('rewrites a raw cXrY token to plain "column N" (1-based, row dropped)', () => {
    const text = 'You missed the fork at c1r4 and c4r3.';
    const result = stripInternalTokens(text);
    assert.ok(!/c\d+r\d+/i.test(result), 'no raw cXrY token may remain');
    assert.equal(result, 'You missed the fork at column 1 and column 4.');
  });

  it('handles both a label prefix and a cXrY token in the same string', () => {
    const text = 'The community-double-threat forms at c5r3.';
    const result = stripInternalTokens(text);
    assert.ok(!/community-/i.test(result));
    assert.ok(!/c\d+r\d+/i.test(result));
    assert.equal(result, 'The double-threat forms at column 5.');
  });

  it('passes clean text through unchanged (negative case)', () => {
    const text = 'Playing column 3 blocks the opponent\'s threat and keeps your best line alive.';
    assert.equal(stripInternalTokens(text), text);
  });

  it('is a no-op on non-string / empty input', () => {
    assert.equal(stripInternalTokens(''), '');
    assert.equal(stripInternalTokens(undefined), undefined);
    assert.equal(stripInternalTokens(null), null);
  });
});

describe('sanitizeTermsMap', () => {
  it('rewrites a terms map key with a community- prefix', () => {
    const terms = { 'community-z-threat': 'A parity-based winning strategy.' };
    const result = sanitizeTermsMap(terms);
    assert.deepEqual(Object.keys(result), ['z-threat']);
    assert.equal(result['z-threat'], 'A parity-based winning strategy.');
    assert.ok(!('community-z-threat' in result));
  });

  it('rewrites a terms map key with an allen- prefix', () => {
    const terms = { 'allen-v3': 'A classic rule from Allen (2010).' };
    const result = sanitizeTermsMap(terms);
    assert.deepEqual(Object.keys(result), ['v3']);
  });

  it('passes a clean terms map through unchanged (negative case)', () => {
    const terms = { z_threat: 'A parity-based winning strategy.', figure_7: 'A shape pattern.' };
    const result = sanitizeTermsMap(terms);
    assert.deepEqual(result, terms);
  });

  it('handles null/undefined/empty input defensively', () => {
    assert.deepEqual(sanitizeTermsMap(null), {});
    assert.deepEqual(sanitizeTermsMap(undefined), {});
    assert.deepEqual(sanitizeTermsMap({}), {});
  });
});
