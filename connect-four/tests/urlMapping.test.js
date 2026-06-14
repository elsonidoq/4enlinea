import { test } from 'node:test';
import assert from 'node:assert/strict';
import { URL_MAP, SESSION_ONLY_SCREENS, buildUrl, parseUrl } from '../src/lib/urlMapping.js';

// All screen keys known to the registry (hardcoded to avoid importing JSX)
const KNOWN_SCREEN_KEYS = [
  'home', 'stats', 'saga', 'concept', 'socratic', 'clchallenge',
  'setpicker', 'challenge', 'summary', 'difficulty', 'game',
  'review', 'explorer', 'mistakes', 'mistakeDetail',
];

// Test 1 — no two URL_MAP entries share the same (screenKey × params-shape) pair
test('URL_MAP: no two entries share the same (screenKey × params-shape) pair', () => {
  const seen = new Set();
  for (const { screenKey, paramNames } of URL_MAP) {
    const key = `${screenKey}|${[...paramNames].sort().join(',')}`;
    assert.ok(!seen.has(key), `Duplicate (screenKey × params-shape): ${key}`);
    seen.add(key);
  }
});

// Test 2
test('buildUrl("saga", {}) → "/saga"', () => {
  assert.equal(buildUrl('saga', {}), '/saga');
});

// Test 3
test('buildUrl("saga", { highlightSlug: "claimeven" }) → "/saga/claimeven"', () => {
  assert.equal(buildUrl('saga', { highlightSlug: 'claimeven' }), '/saga/claimeven');
});

// Test 4
test('buildUrl("game", {}) → "/game"', () => {
  assert.equal(buildUrl('game', {}), '/game');
});

// Test 5
test('buildUrl("review", { id: "abc" }) → "/game/abc"', () => {
  assert.equal(buildUrl('review', { id: 'abc' }), '/game/abc');
});

// Test 6
test('buildUrl("home", {}) → "/"', () => {
  assert.equal(buildUrl('home', {}), '/');
});

// Test 7
test('parseUrl("/challenge/immediate_threat") → { screenKey: "challenge", params: { category: "immediate_threat" } }', () => {
  const result = parseUrl('/challenge/immediate_threat');
  assert.deepEqual(result, { screenKey: 'challenge', params: { category: 'immediate_threat' } });
});

// Test 8
test('parseUrl("/game/abc123") → { screenKey: "review", params: { id: "abc123" } }', () => {
  const result = parseUrl('/game/abc123');
  assert.deepEqual(result, { screenKey: 'review', params: { id: 'abc123' } });
});

// Test 9
test('parseUrl("/game") → { screenKey: "game", params: {} }', () => {
  const result = parseUrl('/game');
  assert.deepEqual(result, { screenKey: 'game', params: {} });
});

// Test 10
test('parseUrl("/saga/claimeven") → { screenKey: "saga", params: { highlightSlug: "claimeven" } }', () => {
  const result = parseUrl('/saga/claimeven');
  assert.deepEqual(result, { screenKey: 'saga', params: { highlightSlug: 'claimeven' } });
});

// Test 11
test('parseUrl("/xyz/unknown") → { screenKey: "home", params: {} }', () => {
  const result = parseUrl('/xyz/unknown');
  assert.deepEqual(result, { screenKey: 'home', params: {} });
});

// Test 12 — buildUrl returns a non-null non-undefined string for every screen key
test('buildUrl returns a valid string for every known screen key', () => {
  // Sample params for parameterised screens
  const sampleParams = {
    saga: [
      {},
      { highlightSlug: 'claimeven' },
    ],
    concept: [{ lessonId: 'lesson-01' }],
    socratic: [{ lessonId: 'lesson-01' }],
    clchallenge: [{ lessonId: 'lesson-01' }],
    challenge: [{ category: 'immediate_threat' }],
    review: [{ id: 'abc123' }],
  };

  for (const key of KNOWN_SCREEN_KEYS) {
    const paramsVariants = sampleParams[key] || [{}];
    for (const params of paramsVariants) {
      const url = buildUrl(key, params);
      assert.ok(url !== null && url !== undefined, `buildUrl('${key}', ...) returned null/undefined`);
      assert.equal(typeof url, 'string', `buildUrl('${key}', ...) did not return a string`);
      assert.ok(url.length > 0, `buildUrl('${key}', ...) returned empty string`);
    }
  }
});
