// Unit tests for server/authRefresh.js — attemptRefresh success/failure paths and the
// FR-002a concurrency regression test (spec 045 US2).
//
// FR-002a note: empirically confirmed (specs/045-account-session-checkout/research.md R1,
// 2026-07-11) that this project's Supabase instance does NOT rotate-with-reuse-detect
// refresh tokens — two concurrent same-token refreshes both succeed independently, and a
// superseded token remains usable. No de-dup Map was built; this file's concurrency test
// asserts the "no coordination needed" outcome directly against the module (with a mock
// authClient standing in for GoTrue), so a regression here would be a genuine signal.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createAttemptRefresh } from './authRefresh.js';

// --- Mock authClient factories ---

function makeSucceedingAuthClient({ callLog, accessToken = 'new-access', refreshToken = 'new-refresh' } = {}) {
  return {
    auth: {
      refreshSession: async ({ refresh_token }) => {
        callLog?.push(refresh_token);
        return {
          data: { session: { access_token: accessToken, refresh_token: refreshToken } },
          error: null,
        };
      },
    },
  };
}

function makeFailingAuthClient({ callLog } = {}) {
  return {
    auth: {
      refreshSession: async ({ refresh_token }) => {
        callLog?.push(refresh_token);
        return { data: null, error: { message: 'invalid_grant' } };
      },
    },
  };
}

function makeThrowingAuthClient() {
  return {
    auth: {
      refreshSession: async () => {
        throw new Error('network blip');
      },
    },
  };
}

// --- attemptRefresh: success path ---

describe('attemptRefresh', () => {
  it('returns { accessToken, refreshToken } on success', async () => {
    const authClient = makeSucceedingAuthClient();
    const attemptRefresh = createAttemptRefresh({ authClient });
    const result = await attemptRefresh('some-refresh-token');
    assert.deepEqual(result, { accessToken: 'new-access', refreshToken: 'new-refresh' });
  });

  it('returns null when Supabase returns an error', async () => {
    const authClient = makeFailingAuthClient();
    const attemptRefresh = createAttemptRefresh({ authClient });
    const result = await attemptRefresh('bad-token');
    assert.equal(result, null);
  });

  it('returns null when Supabase returns no session but no error', async () => {
    const authClient = {
      auth: { refreshSession: async () => ({ data: {}, error: null }) },
    };
    const attemptRefresh = createAttemptRefresh({ authClient });
    const result = await attemptRefresh('some-token');
    assert.equal(result, null);
  });

  it('returns null when refreshSession throws', async () => {
    const authClient = makeThrowingAuthClient();
    const attemptRefresh = createAttemptRefresh({ authClient });
    const result = await attemptRefresh('some-token');
    assert.equal(result, null);
  });

  it('returns null when called with no refresh token', async () => {
    const authClient = makeSucceedingAuthClient();
    const attemptRefresh = createAttemptRefresh({ authClient });
    const result = await attemptRefresh(undefined);
    assert.equal(result, null);
  });

  // FR-002a regression: two concurrent calls presenting the SAME token value both
  // succeed independently (no single-flight de-dup — see file header note).
  it('two concurrent calls with the same token value both succeed independently', async () => {
    const callLog = [];
    const authClient = makeSucceedingAuthClient({ callLog });
    const attemptRefresh = createAttemptRefresh({ authClient });

    const [r1, r2] = await Promise.all([
      attemptRefresh('same-token'),
      attemptRefresh('same-token'),
    ]);

    assert.deepEqual(r1, { accessToken: 'new-access', refreshToken: 'new-refresh' });
    assert.deepEqual(r2, { accessToken: 'new-access', refreshToken: 'new-refresh' });
    // Both calls independently reached the underlying authClient — no coalescing.
    assert.equal(callLog.length, 2);
    assert.deepEqual(callLog, ['same-token', 'same-token']);
  });

  it('two concurrent calls with different token values are never coalesced', async () => {
    const callLog = [];
    const authClient = makeSucceedingAuthClient({ callLog });
    const attemptRefresh = createAttemptRefresh({ authClient });

    const [r1, r2] = await Promise.all([
      attemptRefresh('token-a'),
      attemptRefresh('token-b'),
    ]);

    assert.deepEqual(r1, { accessToken: 'new-access', refreshToken: 'new-refresh' });
    assert.deepEqual(r2, { accessToken: 'new-access', refreshToken: 'new-refresh' });
    assert.equal(callLog.length, 2);
    assert.deepEqual(callLog.sort(), ['token-a', 'token-b']);
  });
});
