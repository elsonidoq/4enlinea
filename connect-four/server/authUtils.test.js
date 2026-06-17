import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildGoogleAuthorizeUrl } from './authUtils.js';

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
