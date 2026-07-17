// Task 22 (finding 19) — see src/lib/fetchWithAuthRetry.js for the full rationale.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchWithAuthRetry } from '../../src/lib/fetchWithAuthRetry.js';

function fakeResponse(status) {
  return { status };
}

test('204 on the first attempt: resolves immediately, no refresh call at all', async () => {
  const calls = [];
  const fetchFn = async (url, options) => {
    calls.push({ url, method: options?.method });
    return fakeResponse(204);
  };

  const res = await fetchWithAuthRetry('/api/user/profile', { method: 'PUT' }, { fetchFn });

  assert.equal(res.status, 204);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/api/user/profile');
});

test('401 then 204: refreshes exactly once, retries once, resolves success', async () => {
  const calls = [];
  let profileAttempts = 0;
  const fetchFn = async (url, options) => {
    calls.push({ url, method: options?.method });
    if (url === '/api/auth/refresh') return fakeResponse(204);
    profileAttempts += 1;
    return fakeResponse(profileAttempts === 1 ? 401 : 204);
  };

  const res = await fetchWithAuthRetry('/api/user/profile', { method: 'PUT' }, { fetchFn });

  assert.equal(res.status, 204);
  assert.equal(profileAttempts, 2);
  const refreshCalls = calls.filter(c => c.url === '/api/auth/refresh');
  assert.equal(refreshCalls.length, 1, 'refresh must be called exactly once');
});

test('401 then 401: surfaces the second 401, never retries again (no infinite loop)', async () => {
  const calls = [];
  const fetchFn = async (url) => {
    calls.push(url);
    if (url === '/api/auth/refresh') return fakeResponse(204);
    return fakeResponse(401);
  };

  const res = await fetchWithAuthRetry('/api/user/profile', { method: 'PUT' }, { fetchFn });

  assert.equal(res.status, 401);
  const profileCalls = calls.filter(c => c === '/api/user/profile');
  assert.equal(profileCalls.length, 2, 'exactly one retry, not an infinite loop');
});

test('401 and refresh itself throws (network error): returns the original 401, does not retry', async () => {
  const calls = [];
  const fetchFn = async (url) => {
    calls.push(url);
    if (url === '/api/auth/refresh') throw new Error('network down');
    return fakeResponse(401);
  };

  const res = await fetchWithAuthRetry('/api/user/profile', { method: 'PUT' }, { fetchFn });

  assert.equal(res.status, 401);
  const profileCalls = calls.filter(c => c === '/api/user/profile');
  assert.equal(profileCalls.length, 1, 'no retry when the refresh call itself fails');
});

test('apiBase is prefixed onto the refresh URL', async () => {
  const calls = [];
  let profileAttempts = 0;
  const fetchFn = async (url) => {
    calls.push(url);
    if (url.endsWith('/api/auth/refresh')) return fakeResponse(204);
    profileAttempts += 1;
    return fakeResponse(profileAttempts === 1 ? 401 : 204);
  };

  await fetchWithAuthRetry('/api/user/profile', { method: 'PUT' }, { fetchFn, apiBase: 'http://localhost:3001' });

  assert.ok(calls.includes('http://localhost:3001/api/auth/refresh'));
});
