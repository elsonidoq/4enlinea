import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildGoogleAuthorizeUrl, resolveAuthToken } from './authUtils.js';

test('buildGoogleAuthorizeUrl — starts with correct base', () => {
  const url = buildGoogleAuthorizeUrl('https://xyz.supabase.co', 'https://app.example.com');
  assert.ok(url.startsWith('https://xyz.supabase.co/auth/v1/authorize?provider=google'));
});

test('buildGoogleAuthorizeUrl — redirect_to is percent-encoded', () => {
  const url = buildGoogleAuthorizeUrl('https://xyz.supabase.co', 'https://app.example.com');
  const params = new URLSearchParams(url.split('?')[1]);
  assert.ok(!url.includes('redirect_to=https://'), 'redirect_to must be percent-encoded');
  assert.equal(params.get('redirect_to'), 'https://app.example.com');
});

// ── resolveAuthToken — pins the real QA-finding defect ──────────────────────
//
// Regression: a broken client sent `Authorization: Bearer undefined` (a string
// interpolation bug — `session.access_token` is always undefined for this
// project, since auth is httpOnly-cookie based). That header passes
// `startsWith('Bearer ')`, so a naive resolver would resolve the token to the
// literal string 'undefined' and skip the cookie fallback entirely — turning
// every signed-in request into a 401, even with a perfectly good session
// cookie present.

test('resolveAuthToken — "Bearer undefined" must NOT swallow a valid cookie', () => {
  const token = resolveAuthToken('Bearer undefined', { sb_access_token: 'X' });
  assert.notEqual(token, 'undefined');
  assert.equal(token, 'X');
});

test('resolveAuthToken — "Bearer null" must NOT swallow a valid cookie', () => {
  const token = resolveAuthToken('Bearer null', { sb_access_token: 'X' });
  assert.notEqual(token, 'null');
  assert.equal(token, 'X');
});

test('resolveAuthToken — well-formed Bearer header wins over the cookie (unchanged behavior)', () => {
  const token = resolveAuthToken('Bearer real-token-123', { sb_access_token: 'X' });
  assert.equal(token, 'real-token-123');
});

test('resolveAuthToken — cookie-only case (no Authorization header, unchanged behavior)', () => {
  const token = resolveAuthToken(undefined, { sb_access_token: 'X' });
  assert.equal(token, 'X');
});

test('resolveAuthToken — neither header nor cookie present resolves to undefined', () => {
  const token = resolveAuthToken(undefined, undefined);
  assert.equal(token, undefined);
});

test('resolveAuthToken — non-Bearer Authorization header falls back to cookie', () => {
  const token = resolveAuthToken('Basic abc123', { sb_access_token: 'X' });
  assert.equal(token, 'X');
});
