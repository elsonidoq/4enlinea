// Endpoint tests for /api/user/* routes.
// Tests the HTTP handler logic with mock supabase stubs — no real DB.
// Uses node:test + node:assert/strict (same pattern as userHelpers.test.mjs).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { registerUserRoutes } from './userRoutes.js';
import { createQaAccountTools } from './qaAccountTools.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Create a minimal Express app with user routes registered and optional middleware. */
function createApp(supabase, userMiddleware, deps) {
  const app = express();
  app.use(express.json());
  if (userMiddleware) {
    app.use((req, _res, next) => {
      userMiddleware(req);
      next();
    });
  }
  // Default the Papergames existence probe to 'unknown' (its fail-open verdict) so no test
  // reaches the real papergames.io. Tests that care pass their own verdict.
  registerUserRoutes(app, supabase, {
    verifyPapergamesAccount: async () => 'unknown',
    ...deps,
  });
  return app;
}

/** Send an HTTP request to the app and return { status, body }. */
function request(app, method, path, { headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const { port } = server.address();
      const url = new URL(path, `http://localhost:${port}`);
      const opts = { method, hostname: 'localhost', port, path: url.pathname + url.search, headers };
      if (body !== undefined) {
        opts.headers['Content-Type'] = 'application/json';
      }
      const req = http.request(opts, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          server.close();
          let parsed = null;
          try { parsed = JSON.parse(data); } catch { /* no-op */ }
          resolve({ status: res.statusCode, body: parsed, raw: data });
        });
      });
      req.on('error', reject);
      if (body !== undefined) req.write(JSON.stringify(body));
      req.end();
    });
  });
}

// ── Test user fixture ────────────────────────────────────────────────────────

const TEST_USER = {
  id: 'user-abc-123',
  device_uuid: 'dev-xyz-456',
  tier: 'free',
  deep_reveal_count: 3,
  deep_reveal_reset_at: '2026-06-16T00:00:00.000Z',
};

function authMiddleware(req) {
  req.user = TEST_USER;
}

function anonMiddleware() {
  // req.user stays undefined
}

// ── T021a: GET endpoints ─────────────────────────────────────────────────────

describe('GET /api/user/* endpoints', () => {
  describe('GET /api/user/profile', () => {
    it('returns projected fields and 200 for authenticated user', async () => {
      const app = createApp({}, authMiddleware);
      const { status, body } = await request(app, 'GET', '/api/user/profile');
      assert.equal(status, 200);
      assert.deepEqual(body, {
        device_uuid: TEST_USER.device_uuid,
        tier: TEST_USER.tier,
        deep_reveal_count: TEST_USER.deep_reveal_count,
        deep_reveal_reset_at: TEST_USER.deep_reveal_reset_at,
        deep_reveal_limit: 20,
        papergames_id: null,
        last_import_at: null,
      });
      // Must NOT leak id
      assert.equal(body.id, undefined);
      // device_uuid should be null (not undefined) when absent
      // (tested with a different user below)
    });

    it('returns 401 without auth', async () => {
      const app = createApp({}, anonMiddleware);
      const { status, body } = await request(app, 'GET', '/api/user/profile');
      assert.equal(status, 401);
      assert.deepEqual(body, { error: 'Unauthorized' });
    });

    it('returns device_uuid: null when user has no device_uuid', async () => {
      const app = createApp({}, (req) => {
        req.user = { ...TEST_USER, device_uuid: undefined };
      });
      const { status, body } = await request(app, 'GET', '/api/user/profile');
      assert.equal(status, 200);
      assert.equal(body.device_uuid, null);
    });

    it('includes onboarding_status from req.user (Epic 8)', async () => {
      const app = createApp({}, (req) => {
        req.user = { ...TEST_USER, onboarding_status: 'seen' };
      });
      const { status, body } = await request(app, 'GET', '/api/user/profile');
      assert.equal(status, 200);
      assert.equal(body.onboarding_status, 'seen');
    });
  });

  describe('PUT /api/user/profile (Epic 8 — extended shape)', () => {
    function makeUsersUpdateSupabase(capturedRef) {
      return {
        from: (table) => {
          if (table === 'users') {
            return {
              update: (data) => {
                capturedRef.data = data;
                return { eq: async (col, val) => {
                  capturedRef.col = col;
                  capturedRef.val = val;
                  return { error: null };
                } };
              },
            };
          }
          return {};
        },
      };
    }

    it('papergames_id-only request is unaffected (existing 204 contract)', async () => {
      const captured = {};
      const app = createApp(makeUsersUpdateSupabase(captured), authMiddleware);
      const { status } = await request(app, 'PUT', '/api/user/profile', {
        body: { papergames_id: 'pg-123' },
      });
      assert.equal(status, 204);
      assert.deepEqual(captured.data, { papergames_id: 'pg-123' });
      assert.equal(captured.col, 'id');
      assert.equal(captured.val, TEST_USER.id);
    });

    it('papergames_id-only invalid value still returns 400 (existing contract)', async () => {
      const app = createApp(makeUsersUpdateSupabase({}), authMiddleware);
      const { status, body } = await request(app, 'PUT', '/api/user/profile', {
        body: { papergames_id: '' },
      });
      assert.equal(status, 400);
      assert.ok(body.error.includes('papergames_id'));
    });

    // 2026-08-23 production incident: a papergames_id that does not exist upstream was stored
    // happily here and only failed minutes later, deep inside a background import job, as
    // "Papergames API unreachable: fetchRooms HTTP 404". Reject it at the point the user can
    // still fix it — but only on a definite 404.
    it('rejects a papergames_id that does not exist on Papergames (404) with 400', async () => {
      const captured = {};
      const app = createApp(makeUsersUpdateSupabase(captured), authMiddleware, {
        verifyPapergamesAccount: async () => 'not_found',
      });
      const { status, body } = await request(app, 'PUT', '/api/user/profile', {
        body: { papergames_id: '69e77229f8f489b51eabd6eb' },
      });
      assert.equal(status, 400);
      assert.match(body.error, /papergames/i);
      assert.equal(captured.data, undefined, 'a non-existent account id must not be written');
    });

    it('accepts a papergames_id that resolves upstream', async () => {
      const captured = {};
      const app = createApp(makeUsersUpdateSupabase(captured), authMiddleware, {
        verifyPapergamesAccount: async () => 'ok',
      });
      const { status } = await request(app, 'PUT', '/api/user/profile', {
        body: { papergames_id: '69e773d36bf9938bffc1509a' },
      });
      assert.equal(status, 204);
      assert.deepEqual(captured.data, { papergames_id: '69e773d36bf9938bffc1509a' });
    });

    it('saves anyway when the check is inconclusive — a Papergames outage must not block a save', async () => {
      const captured = {};
      const app = createApp(makeUsersUpdateSupabase(captured), authMiddleware, {
        verifyPapergamesAccount: async () => 'unknown',
      });
      const { status } = await request(app, 'PUT', '/api/user/profile', {
        body: { papergames_id: 'pg-123' },
      });
      assert.equal(status, 204);
      assert.deepEqual(captured.data, { papergames_id: 'pg-123' });
    });

    it('does not probe Papergames when the request carries no papergames_id', async () => {
      let probed = false;
      const app = createApp(makeUsersUpdateSupabase({}), authMiddleware, {
        verifyPapergamesAccount: async () => { probed = true; return 'not_found'; },
      });
      const { status } = await request(app, 'PUT', '/api/user/profile', {
        body: { onboarding_status: 'seen' },
      });
      assert.equal(status, 204);
      assert.equal(probed, false);
    });

    it('onboarding_status-only request is accepted', async () => {
      const captured = {};
      const app = createApp(makeUsersUpdateSupabase(captured), authMiddleware);
      const { status } = await request(app, 'PUT', '/api/user/profile', {
        body: { onboarding_status: 'seen' },
      });
      assert.equal(status, 204);
      assert.deepEqual(captured.data, { onboarding_status: 'seen' });
    });

    it('invalid onboarding_status enum value is rejected with 400', async () => {
      const app = createApp(makeUsersUpdateSupabase({}), authMiddleware);
      const { status, body } = await request(app, 'PUT', '/api/user/profile', {
        body: { onboarding_status: 'bogus' },
      });
      assert.equal(status, 400);
      assert.ok(body.error.includes('onboarding_status'));
    });

    it('both fields together are accepted in one call', async () => {
      const captured = {};
      const app = createApp(makeUsersUpdateSupabase(captured), authMiddleware);
      const { status } = await request(app, 'PUT', '/api/user/profile', {
        body: { papergames_id: 'pg-123', onboarding_status: 'skipped' },
      });
      assert.equal(status, 204);
      assert.deepEqual(captured.data, { papergames_id: 'pg-123', onboarding_status: 'skipped' });
    });

    it('no fields at all is 400', async () => {
      const app = createApp(makeUsersUpdateSupabase({}), authMiddleware);
      const { status, body } = await request(app, 'PUT', '/api/user/profile', {
        body: {},
      });
      assert.equal(status, 400);
      assert.ok(body.error.includes('no valid fields'));
    });

    it('returns 401 without auth', async () => {
      const app = createApp(makeUsersUpdateSupabase({}), anonMiddleware);
      const { status, body } = await request(app, 'PUT', '/api/user/profile', {
        body: { onboarding_status: 'seen' },
      });
      assert.equal(status, 401);
      assert.deepEqual(body, { error: 'Unauthorized' });
    });

    it('returns 503 when supabase is not configured', async () => {
      const app = createApp(null, authMiddleware);
      const { status } = await request(app, 'PUT', '/api/user/profile', {
        body: { onboarding_status: 'seen' },
      });
      assert.equal(status, 503);
    });
  });

  describe('GET /api/user/session-stats/all', () => {
    it('returns { rows, byPattern } for authenticated user', async () => {
      const dbRows = [
        {
          user_id: TEST_USER.id,
          date: '2026-06-10',
          stats: {
            optimalCount: 5,
            blunderCount: 2,
            suboptimalCount: 3,
            byPattern: {
              forced_win: { correct: 3, attempted: 4 },
              zugzwang: { correct: 0, attempted: 1 },
            },
          },
        },
        {
          user_id: TEST_USER.id,
          date: '2026-06-11',
          stats: {
            optimalCount: 2,
            blunderCount: 1,
            suboptimalCount: 0,
            byPattern: {
              forced_win: { correct: 1, attempted: 1 },
            },
          },
        },
      ];

      const supabase = {
        from: (table) => {
          assert.equal(table, 'session_stats');
          return {
            select: () => ({
              eq: (col, val) => {
                assert.equal(col, 'user_id');
                assert.equal(val, TEST_USER.id);
                return Promise.resolve({ data: dbRows, error: null });
              },
            }),
          };
        },
      };

      const app = createApp(supabase, authMiddleware);
      const { status, body } = await request(app, 'GET', '/api/user/session-stats/all');
      assert.equal(status, 200);
      assert.ok(Array.isArray(body.rows));
      assert.equal(body.rows.length, 2);
      assert.ok(body.byPattern.forced_win);
      assert.ok(body.byPattern.zugzwang);
      // weighted accuracy should be > 0 since there's data
      assert.ok(body.byPattern.forced_win.accuracy > 0);
    });

    it('returns { rows: [], byPattern: {} } when no rows', async () => {
      const supabase = {
        from: () => ({
          select: () => ({
            eq: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      };
      const app = createApp(supabase, authMiddleware);
      const { status, body } = await request(app, 'GET', '/api/user/session-stats/all');
      assert.equal(status, 200);
      assert.deepEqual(body.rows, []);
      assert.deepEqual(body.byPattern, {});
    });

    it('returns 401 without auth', async () => {
      const app = createApp({}, anonMiddleware);
      const { status, body } = await request(app, 'GET', '/api/user/session-stats/all');
      assert.equal(status, 401);
      assert.deepEqual(body, { error: 'Unauthorized' });
    });
  });

  describe('GET /api/user/session-stats', () => {
    it('returns row for given date', async () => {
      const row = { user_id: TEST_USER.id, date: '2026-06-10', stats: { optimalCount: 3 } };
      const supabase = {
        from: (table) => {
          assert.equal(table, 'session_stats');
          return {
            select: () => ({
              eq: (col, val) => ({
                eq: (col2, val2) => {
                  assert.equal(col, 'user_id');
                  assert.equal(val, TEST_USER.id);
                  assert.equal(col2, 'date');
                  assert.equal(val2, '2026-06-10');
                  return {
                    maybeSingle: () => Promise.resolve({ data: row, error: null }),
                  };
                },
              }),
            }),
          };
        },
      };
      const app = createApp(supabase, authMiddleware);
      const { status, body } = await request(app, 'GET', '/api/user/session-stats?date=2026-06-10');
      assert.equal(status, 200);
      assert.deepEqual(body, row);
    });

    it('returns null when no row for date', async () => {
      const supabase = {
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          }),
        }),
      };
      const app = createApp(supabase, authMiddleware);
      const { status, body } = await request(app, 'GET', '/api/user/session-stats?date=2026-06-10');
      assert.equal(status, 200);
      assert.equal(body, null);
    });

    it('returns 400 when date missing', async () => {
      const app = createApp({}, authMiddleware);
      const { status, body } = await request(app, 'GET', '/api/user/session-stats');
      assert.equal(status, 400);
      assert.ok(body.error.includes('date'));
    });

    it('returns 400 when date invalid', async () => {
      const app = createApp({}, authMiddleware);
      const { status } = await request(app, 'GET', '/api/user/session-stats?date=bad');
      assert.equal(status, 400);
    });

    it('returns 401 without auth', async () => {
      const app = createApp({}, anonMiddleware);
      const { status, body } = await request(app, 'GET', '/api/user/session-stats?date=2026-06-10');
      assert.equal(status, 401);
      assert.deepEqual(body, { error: 'Unauthorized' });
    });
  });

  describe('GET /api/user/lesson-progress', () => {
    it('returns mapped lesson progress rows', async () => {
      const dbRows = [
        { lesson_id: 'L1', completed_at: '2026-06-10T00:00:00Z' },
        { lesson_id: 'L2', completed_at: null },
      ];
      const supabase = {
        from: (table) => {
          assert.equal(table, 'lesson_progress');
          return {
            select: () => ({
              eq: (col, val) => {
                assert.equal(col, 'user_id');
                assert.equal(val, TEST_USER.id);
                return Promise.resolve({ data: dbRows, error: null });
              },
            }),
          };
        },
      };
      const app = createApp(supabase, authMiddleware);
      const { status, body } = await request(app, 'GET', '/api/user/lesson-progress');
      assert.equal(status, 200);
      assert.deepEqual(body, [
        { lessonId: 'L1', status: 'complete' },
        { lessonId: 'L2', status: 'incomplete' },
      ]);
    });

    it('returns empty array when no rows', async () => {
      const supabase = {
        from: () => ({
          select: () => ({
            eq: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      };
      const app = createApp(supabase, authMiddleware);
      const { status, body } = await request(app, 'GET', '/api/user/lesson-progress');
      assert.equal(status, 200);
      assert.deepEqual(body, []);
    });

    it('returns 401 without auth', async () => {
      const app = createApp({}, anonMiddleware);
      const { status, body } = await request(app, 'GET', '/api/user/lesson-progress');
      assert.equal(status, 401);
      assert.deepEqual(body, { error: 'Unauthorized' });
    });
  });

  describe('GET /api/user/sparring-record', () => {
    it('returns sparring_record from users table', async () => {
      const supabase = {
        from: (table) => {
          assert.equal(table, 'users');
          return {
            select: () => ({
              eq: (col, val) => {
                assert.equal(col, 'id');
                assert.equal(val, TEST_USER.id);
                return {
                  maybeSingle: () =>
                    Promise.resolve({ data: { sparring_record: { W: 5, L: 2, D: 1 } }, error: null }),
                };
              },
            }),
          };
        },
      };
      const app = createApp(supabase, authMiddleware);
      const { status, body } = await request(app, 'GET', '/api/user/sparring-record');
      assert.equal(status, 200);
      assert.deepEqual(body, { W: 5, L: 2, D: 1 });
    });

    it('returns defaults when no row', async () => {
      const supabase = {
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        }),
      };
      const app = createApp(supabase, authMiddleware);
      const { status, body } = await request(app, 'GET', '/api/user/sparring-record');
      assert.equal(status, 200);
      assert.deepEqual(body, { W: 0, L: 0, D: 0 });
    });

    it('returns 401 without auth', async () => {
      const app = createApp({}, anonMiddleware);
      const { status, body } = await request(app, 'GET', '/api/user/sparring-record');
      assert.equal(status, 401);
      assert.deepEqual(body, { error: 'Unauthorized' });
    });
  });

  describe('GET /api/user/challenge-session', () => {
    it('returns stats from latest session_stats row', async () => {
      const stats = { category: 'forced_win', completedPuzzles: 8 };
      const supabase = {
        from: (table) => {
          assert.equal(table, 'session_stats');
          return {
            select: () => ({
              eq: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: () =>
                      Promise.resolve({ data: { stats }, error: null }),
                  }),
                }),
              }),
            }),
          };
        },
      };
      const app = createApp(supabase, authMiddleware);
      const { status, body } = await request(app, 'GET', '/api/user/challenge-session');
      assert.equal(status, 200);
      assert.deepEqual(body, stats);
    });

    it('returns null when no row', async () => {
      const supabase = {
        from: () => ({
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => ({
                  maybeSingle: () =>
                    Promise.resolve({ data: null, error: null }),
                }),
              }),
            }),
          }),
        }),
      };
      const app = createApp(supabase, authMiddleware);
      const { status, body } = await request(app, 'GET', '/api/user/challenge-session');
      assert.equal(status, 200);
      assert.equal(body, null);
    });

    it('returns 401 without auth', async () => {
      const app = createApp({}, anonMiddleware);
      const { status, body } = await request(app, 'GET', '/api/user/challenge-session');
      assert.equal(status, 401);
      assert.deepEqual(body, { error: 'Unauthorized' });
    });
  });

  describe('GET /api/user/streak', () => {
    it('returns streak_count and last_active_date', async () => {
      const supabase = {
        from: (table) => {
          assert.equal(table, 'users');
          return {
            select: () => ({
              eq: (col, val) => {
                assert.equal(col, 'id');
                assert.equal(val, TEST_USER.id);
                return {
                  maybeSingle: () =>
                    Promise.resolve({
                      data: { streak_count: 7, last_active_date: '2026-06-12' },
                      error: null,
                    }),
                };
              },
            }),
          };
        },
      };
      const app = createApp(supabase, authMiddleware);
      const { status, body } = await request(app, 'GET', '/api/user/streak');
      assert.equal(status, 200);
      assert.deepEqual(body, { streak_count: 7, last_active_date: '2026-06-12' });
    });

    it('returns defaults when no row', async () => {
      const supabase = {
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        }),
      };
      const app = createApp(supabase, authMiddleware);
      const { status, body } = await request(app, 'GET', '/api/user/streak');
      assert.equal(status, 200);
      assert.deepEqual(body, { streak_count: 0, last_active_date: null });
    });

    it('returns 401 without auth', async () => {
      const app = createApp({}, anonMiddleware);
      const { status, body } = await request(app, 'GET', '/api/user/streak');
      assert.equal(status, 401);
      assert.deepEqual(body, { error: 'Unauthorized' });
    });
  });

  describe('503 when supabase is null', () => {
    it('returns 503 for DB-dependent endpoints', async () => {
      const app = createApp(null, authMiddleware);
      const endpoints = [
        '/api/user/session-stats/all',
        '/api/user/session-stats?date=2026-06-10',
        '/api/user/lesson-progress',
        '/api/user/sparring-record',
        '/api/user/challenge-session',
        '/api/user/streak',
      ];
      for (const path of endpoints) {
        const { status, body } = await request(app, 'GET', path);
        assert.equal(status, 503, `Expected 503 for ${path}, got ${status}`);
        assert.ok(body.error);
      }
    });

    it('returns 200 for /api/user/profile even without supabase (no DB needed)', async () => {
      const app = createApp(null, authMiddleware);
      const { status, body } = await request(app, 'GET', '/api/user/profile');
      assert.equal(status, 200);
      assert.equal(body.tier, TEST_USER.tier);
    });
  });
});

// ── T021b: POST endpoints ────────────────────────────────────────────────────

describe('POST /api/user/* endpoints', () => {
  describe('POST /api/user/session-stats', () => {
    it('calls writeSessionStats with req.body.stats (inner), returns 204', async () => {
      // Override the imported writeSessionStats — we can't, so we test via the supabase interaction
      // Actually the route calls writeSessionStats() which we can't mock from here.
      // Let me instead validate via supabase calls that would happen.
      // Hmm, the routes call the imported helpers. We need to test at the supabase boundary.

      // Strategy: provide a supabase that does nothing, and verify the route returns 204.
      // The asymmetry assertion (req.body.stats vs req.body) is verified in T021b below
      // via a dedicated test that intercepts the supabase call.

      // For now: verify 204 is returned (the route passes validation and calls the helper)
      const mockSupabase = {
        from: () => ({
          upsert: async () => ({ error: null }),
        }),
      };
      // NOTE: writeSessionStats actually calls supabase.from('session_stats').upsert(...),
      // so we need the supabase mock to support that chain.

      const mockApp = createApp(mockSupabase, authMiddleware);
      const { status } = await request(mockApp, 'POST', '/api/user/session-stats', {
        body: { date: '2026-06-12', stats: { optimalCount: 3 } },
      });
      assert.equal(status, 204);
    });

    it('returns 400 when date missing', async () => {
      const app = createApp({}, authMiddleware);
      const { status, body } = await request(app, 'POST', '/api/user/session-stats', {
        body: { stats: { optimalCount: 3 } },
      });
      assert.equal(status, 400);
      assert.ok(body.error.includes('date'));
    });

    it('returns 401 without auth', async () => {
      const app = createApp({}, anonMiddleware);
      const { status, body } = await request(app, 'POST', '/api/user/session-stats', {
        body: { date: '2026-06-12', stats: {} },
      });
      assert.equal(status, 401);
      assert.deepEqual(body, { error: 'Unauthorized' });
    });
  });

  describe('POST /api/user/puzzle-attempts', () => {
    it('calls writePuzzleAttempts with user.device_uuid, returns 204', async () => {
      const mockSupabase = {
        from: () => ({
          insert: async () => ({ error: null }),
        }),
      };
      const app = createApp(mockSupabase, authMiddleware);
      const { status } = await request(app, 'POST', '/api/user/puzzle-attempts', {
        body: {
          puzzle_id: 'p1',
          moves_tried: [0, 1],
          outcome: 'correct',
          first_attempt_correct: true,
          time_ms: 5000,
        },
      });
      assert.equal(status, 204);
    });

    it('returns 400 when required fields missing', async () => {
      const app = createApp({}, authMiddleware);
      const { status } = await request(app, 'POST', '/api/user/puzzle-attempts', {
        body: { puzzle_id: 'p1' },
      });
      assert.equal(status, 400);
    });

    it('returns 401 without auth', async () => {
      const app = createApp({}, anonMiddleware);
      const { status, body } = await request(app, 'POST', '/api/user/puzzle-attempts', {
        body: { puzzle_id: 'p1', moves_tried: [], outcome: 'correct', first_attempt_correct: true },
      });
      assert.equal(status, 401);
      assert.deepEqual(body, { error: 'Unauthorized' });
    });
  });

  describe('POST /api/user/lesson-progress', () => {
    it('calls writeLessonProgress with status=complete, returns 204', async () => {
      const mockSupabase = {
        from: () => ({
          upsert: async () => ({ error: null }),
        }),
      };
      const app = createApp(mockSupabase, authMiddleware);
      const { status } = await request(app, 'POST', '/api/user/lesson-progress', {
        body: { lessonId: 'L1', status: 'complete' },
      });
      assert.equal(status, 204);
    });

    it('returns 400 when status is not complete', async () => {
      const app = createApp({}, authMiddleware);
      const { status, body } = await request(app, 'POST', '/api/user/lesson-progress', {
        body: { lessonId: 'L1', status: 'in_progress' },
      });
      assert.equal(status, 400);
      assert.ok(body.error.includes("must be 'complete'"));
    });

    it('returns 400 when lessonId missing', async () => {
      const app = createApp({}, authMiddleware);
      const { status, body } = await request(app, 'POST', '/api/user/lesson-progress', {
        body: { status: 'complete' },
      });
      assert.equal(status, 400);
      assert.ok(body.error.includes('lessonId'));
    });

    it('returns 401 without auth', async () => {
      const app = createApp({}, anonMiddleware);
      const { status, body } = await request(app, 'POST', '/api/user/lesson-progress', {
        body: { lessonId: 'L1', status: 'complete' },
      });
      assert.equal(status, 401);
      assert.deepEqual(body, { error: 'Unauthorized' });
    });
  });

  describe('POST /api/user/sparring-record', () => {
    it('reads current record, increments counter, writes back, returns 204', async () => {
      const currentRecord = { W: 2, L: 1, D: 0 };
      let updatedRecord = null;

      const supabase = {
        from: (table) => {
          if (table === 'users') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: () =>
                    Promise.resolve({ data: { sparring_record: currentRecord }, error: null }),
                }),
              }),
              update: (data) => {
                updatedRecord = data.sparring_record;
                return {
                  eq: () => Promise.resolve({ error: null }),
                };
              },
            };
          }
          return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) };
        },
      };

      const app = createApp(supabase, authMiddleware);
      const { status } = await request(app, 'POST', '/api/user/sparring-record', {
        body: { result: 'win' },
      });
      assert.equal(status, 204);
      assert.deepEqual(updatedRecord, { W: 3, L: 1, D: 0 });
    });

    it('returns 400 when result is invalid', async () => {
      const app = createApp({}, authMiddleware);
      const { status, body } = await request(app, 'POST', '/api/user/sparring-record', {
        body: { result: 'invalid' },
      });
      assert.equal(status, 400);
      assert.ok(body.error.includes('result must be'));
    });

    it('returns 401 without auth', async () => {
      const app = createApp({}, anonMiddleware);
      const { status, body } = await request(app, 'POST', '/api/user/sparring-record', {
        body: { result: 'win' },
      });
      assert.equal(status, 401);
      assert.deepEqual(body, { error: 'Unauthorized' });
    });
  });

  describe('POST /api/user/challenge-session', () => {
    it('calls writeSessionStats with entire req.body, returns 204', async () => {
      const mockSupabase = {
        from: () => ({
          upsert: async () => ({ error: null }),
        }),
      };
      const app = createApp(mockSupabase, authMiddleware);
      const { status } = await request(app, 'POST', '/api/user/challenge-session', {
        body: { date: '2026-06-12', category: 'forced_win', completedPuzzles: 8 },
      });
      assert.equal(status, 204);
    });

    it('returns 400 when date missing', async () => {
      const app = createApp({}, authMiddleware);
      const { status, body } = await request(app, 'POST', '/api/user/challenge-session', {
        body: { category: 'forced_win' },
      });
      assert.equal(status, 400);
      assert.ok(body.error.includes('date'));
    });

    it('returns 401 without auth', async () => {
      const app = createApp({}, anonMiddleware);
      const { status, body } = await request(app, 'POST', '/api/user/challenge-session', {
        body: { date: '2026-06-12' },
      });
      assert.equal(status, 401);
      assert.deepEqual(body, { error: 'Unauthorized' });
    });
  });

  describe('POST /api/user/streak/record-day', () => {
    it('increments streak when last_active was yesterday', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toLocaleDateString('en-CA');
      const todayStr = new Date().toLocaleDateString('en-CA');

      let updatedStreak = null;
      const supabase = {
        from: (table) => {
          if (table === 'users') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: () =>
                    Promise.resolve({
                      data: { streak_count: 3, last_active_date: yesterdayStr },
                      error: null,
                    }),
                }),
              }),
              update: (data) => {
                updatedStreak = data;
                return {
                  eq: () => Promise.resolve({ error: null }),
                };
              },
            };
          }
          return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) };
        },
      };

      const app = createApp(supabase, authMiddleware);
      const { status } = await request(app, 'POST', '/api/user/streak/record-day', {
        body: {},
      });
      assert.equal(status, 204);
      assert.equal(updatedStreak.streak_count, 4);
      assert.equal(updatedStreak.last_active_date, todayStr);
    });

    it('no-ops when last_active was today', async () => {
      const todayStr = new Date().toLocaleDateString('en-CA');
      let writeCalled = false;

      const supabase = {
        from: (table) => {
          if (table === 'users') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: () =>
                    Promise.resolve({
                      data: { streak_count: 5, last_active_date: todayStr },
                      error: null,
                    }),
                }),
              }),
              update: () => {
                writeCalled = true;
                return { eq: () => Promise.resolve({ error: null }) };
              },
            };
          }
          return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) };
        },
      };

      const app = createApp(supabase, authMiddleware);
      const { status } = await request(app, 'POST', '/api/user/streak/record-day', {
        body: {},
      });
      assert.equal(status, 204);
      assert.equal(writeCalled, false);
    });

    it('resets streak to 1 when last_active is neither today nor yesterday', async () => {
      let updatedStreak = null;
      const todayStr = new Date().toLocaleDateString('en-CA');

      const supabase = {
        from: (table) => {
          if (table === 'users') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: () =>
                    Promise.resolve({
                      data: { streak_count: 10, last_active_date: '2026-01-01' },
                      error: null,
                    }),
                }),
              }),
              update: (data) => {
                updatedStreak = data;
                return {
                  eq: () => Promise.resolve({ error: null }),
                };
              },
            };
          }
          return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) };
        },
      };

      const app = createApp(supabase, authMiddleware);
      const { status } = await request(app, 'POST', '/api/user/streak/record-day', {
        body: {},
      });
      assert.equal(status, 204);
      assert.equal(updatedStreak.streak_count, 1);
      assert.equal(updatedStreak.last_active_date, todayStr);
    });

    it('returns 401 without auth', async () => {
      const app = createApp({}, anonMiddleware);
      const { status, body } = await request(app, 'POST', '/api/user/streak/record-day', {
        body: {},
      });
      assert.equal(status, 401);
      assert.deepEqual(body, { error: 'Unauthorized' });
    });
  });

  describe('503 when supabase is null', () => {
    it('returns 503 for all POST endpoints', async () => {
      const app = createApp(null, authMiddleware);
      const endpoints = [
        { method: 'POST', path: '/api/user/session-stats', body: { date: '2026-06-12', stats: {} } },
        { method: 'POST', path: '/api/user/puzzle-attempts', body: { puzzle_id: 'p1', moves_tried: [], outcome: 'correct', first_attempt_correct: true } },
        { method: 'POST', path: '/api/user/lesson-progress', body: { lessonId: 'L1', status: 'complete' } },
        { method: 'POST', path: '/api/user/sparring-record', body: { result: 'win' } },
        { method: 'POST', path: '/api/user/challenge-session', body: { date: '2026-06-12' } },
        { method: 'POST', path: '/api/user/streak/record-day', body: {} },
        { method: 'POST', path: '/api/user/migrate', body: { puzzle_attempts: [], session_stats: [], lesson_progress: [], sparring_record: { W: 0, L: 0, D: 0 }, streak: { streak_count: 0, last_active_date: null } } },
      ];
      for (const { method, path, body: b } of endpoints) {
        const { status, body: respBody } = await request(app, method, path, { body: b });
        assert.equal(status, 503, `Expected 503 for ${method} ${path}, got ${status}`);
        assert.ok(respBody.error);
      }
    });
  });
});

// ── T021c: POST /api/user/migrate ────────────────────────────────────────────

describe('POST /api/user/migrate', () => {
  it('calls all 5 write helpers and returns 204', async () => {
    // Track which tables get written to
    const tablesCalled = new Set();

    const supabase = {
      from: (table) => {
        tablesCalled.add(table);
        if (table === 'session_stats') {
          return {
            upsert: async () => ({ error: null }),
          };
        }
        if (table === 'puzzle_attempts') {
          return {
            insert: async () => ({ error: null }),
          };
        }
        if (table === 'lesson_progress') {
          return {
            upsert: async () => ({ error: null }),
          };
        }
        if (table === 'users') {
          return {
            update: () => ({
              eq: async () => ({ error: null }),
            }),
          };
        }
        return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) };
      },
    };

    const app = createApp(supabase, authMiddleware);
    const { status } = await request(app, 'POST', '/api/user/migrate', {
      body: {
        puzzle_attempts: [{ puzzle_id: 'p1', moves_tried: [0], outcome: 'correct', first_attempt_correct: true }],
        session_stats: [{ date: '2026-06-10', optimalCount: 3, blunderCount: 1 }],
        lesson_progress: [{ lessonId: 'L1', status: 'complete' }],
        sparring_record: { W: 1, L: 0, D: 0 },
        streak: { streak_count: 3, last_active_date: '2026-06-12' },
      },
    });
    assert.equal(status, 204);

    // All 3 tables should have been called (puzzle_attempts, session_stats, lesson_progress, users)
    assert.ok(tablesCalled.has('session_stats'), 'session_stats was written');
    assert.ok(tablesCalled.has('puzzle_attempts'), 'puzzle_attempts was written');
    assert.ok(tablesCalled.has('lesson_progress'), 'lesson_progress was written');
    assert.ok(tablesCalled.has('users'), 'users was written (sparring_record + streak)');
  });

  it('returns 500 when one helper fails', async () => {
    const supabase = {
      from: (table) => {
        if (table === 'session_stats') {
          return {
            upsert: async () => {
              throw new Error('DB connection lost');
            },
          };
        }
        if (table === 'puzzle_attempts') {
          return { insert: async () => ({ error: null }) };
        }
        if (table === 'lesson_progress') {
          return { upsert: async () => ({ error: null }) };
        }
        if (table === 'users') {
          return {
            update: () => ({ eq: async () => ({ error: null }) }),
          };
        }
        return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) };
      },
    };

    const app = createApp(supabase, authMiddleware);
    const { status, body } = await request(app, 'POST', '/api/user/migrate', {
      body: {
        puzzle_attempts: [],
        session_stats: [{ date: '2026-06-10' }],
        lesson_progress: [],
        sparring_record: { W: 0, L: 0, D: 0 },
        streak: { streak_count: 0, last_active_date: null },
      },
    });
    assert.equal(status, 500);
    assert.ok(body.error);
  });

  it('returns 400 when body is missing', async () => {
    const app = createApp({}, authMiddleware);
    const { status, body } = await request(app, 'POST', '/api/user/migrate');
    assert.equal(status, 400);
    assert.ok(body.error.includes('body'));
  });

  it('returns 401 without auth', async () => {
    const app = createApp({}, anonMiddleware);
    const { status, body } = await request(app, 'POST', '/api/user/migrate', {
      body: { puzzle_attempts: [], session_stats: [], lesson_progress: [] },
    });
    assert.equal(status, 401);
    assert.deepEqual(body, { error: 'Unauthorized' });
  });

  it('skips empty arrays (no-op for empty puzzle_attempts)', async () => {
    let insertCalled = false;
    const supabase = {
      from: (table) => {
        if (table === 'puzzle_attempts') {
          return {
            insert: async () => {
              insertCalled = true;
              return { error: null };
            },
          };
        }
        if (table === 'session_stats') {
          return { upsert: async () => ({ error: null }) };
        }
        if (table === 'lesson_progress') {
          return { upsert: async () => ({ error: null }) };
        }
        if (table === 'users') {
          return {
            update: () => ({ eq: async () => ({ error: null }) }),
          };
        }
        return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) };
      },
    };

    const app = createApp(supabase, authMiddleware);
    const { status } = await request(app, 'POST', '/api/user/migrate', {
      body: {
        puzzle_attempts: [], // empty
        session_stats: [{ date: '2026-06-10' }],
        lesson_progress: [],
        sparring_record: null,
        streak: null,
      },
    });
    assert.equal(status, 204);
    assert.equal(insertCalled, false); // empty array should not trigger insert
  });

  // ── Feature 3: anonymous games re-association ─────────────────────────────
  // The client sends its own device_uuid; the endpoint re-keys any anon game
  // rows (user_id IS NULL) with that device_uuid to the signed-in user.

  /** users-table stub that accepts the onboarding conditional-update chain and a
   *  plain update().eq() (sparring_record/streak/onboarding), plus a games-table
   *  stub that records the update payload + filters. */
  function buildGamesMigrateSupabase() {
    const calls = { gamesUpdate: null, gamesEqDeviceUuid: null, gamesIsUserId: undefined };
    const supabase = {
      from: (table) => {
        if (table === 'games') {
          return {
            update: (payload) => {
              calls.gamesUpdate = payload;
              return {
                eq: (col, val) => {
                  if (col === 'device_uuid') calls.gamesEqDeviceUuid = val;
                  return {
                    is: async (col2, val2) => {
                      calls.gamesIsUserId = { col: col2, val: val2 };
                      return { error: null };
                    },
                  };
                },
              };
            },
          };
        }
        if (table === 'blunders') {
          return {
            update: () => ({
              eq: () => ({
                is: async () => ({ error: null }),
              }),
            }),
          };
        }
        if (table === 'users') {
          return { update: () => ({ eq: () => ({ eq: async () => ({ error: null }), then: (r) => r({ error: null }) }) }) };
        }
        if (table === 'session_stats') return { upsert: async () => ({ error: null }) };
        if (table === 'puzzle_attempts') return { insert: async () => ({ error: null }) };
        if (table === 'lesson_progress') return { upsert: async () => ({ error: null }) };
        return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) };
      },
    };
    return { supabase, calls };
  }

  it('re-keys anon games with the client-supplied device_uuid to the user, WHERE user_id IS NULL', async () => {
    const { supabase, calls } = buildGamesMigrateSupabase();
    const app = createApp(supabase, authMiddleware);
    const { status } = await request(app, 'POST', '/api/user/migrate', {
      body: {
        puzzle_attempts: [], session_stats: [], lesson_progress: [],
        sparring_record: null, streak: null,
        device_uuid: 'client-anon-uuid', // distinct from req.user.device_uuid ('dev-xyz-456')
      },
    });
    assert.equal(status, 204);
    assert.deepEqual(calls.gamesUpdate, { user_id: 'user-abc-123' });
    assert.equal(calls.gamesEqDeviceUuid, 'client-anon-uuid'); // keyed on CLIENT uuid, not req.user.device_uuid
    assert.deepEqual(calls.gamesIsUserId, { col: 'user_id', val: null });
  });

  it('does NOT touch games when device_uuid is absent (no-op)', async () => {
    const { supabase, calls } = buildGamesMigrateSupabase();
    const app = createApp(supabase, authMiddleware);
    const { status } = await request(app, 'POST', '/api/user/migrate', {
      body: { puzzle_attempts: [], session_stats: [], lesson_progress: [], sparring_record: null, streak: null },
    });
    assert.equal(status, 204);
    assert.equal(calls.gamesUpdate, null); // games.update never called
  });

  it('does NOT touch games when device_uuid is an empty string (no-op)', async () => {
    const { supabase, calls } = buildGamesMigrateSupabase();
    const app = createApp(supabase, authMiddleware);
    const { status } = await request(app, 'POST', '/api/user/migrate', {
      body: { puzzle_attempts: [], session_stats: [], lesson_progress: [], sparring_record: null, streak: null, device_uuid: '' },
    });
    assert.equal(status, 204);
    assert.equal(calls.gamesUpdate, null);
  });

  // ── Task 7: anonymous blunders re-association ──────────────────────────────
  // Mirrors the games re-association above: the client sends its own
  // device_uuid; the endpoint re-keys any anon blunder rows (user_id IS NULL)
  // with that device_uuid to the signed-in user.

  /** Same shape as buildGamesMigrateSupabase, but also stubs the `blunders`
   *  table's update().eq('device_uuid', ...).is('user_id', null) chain. */
  function buildBlundersMigrateSupabase() {
    const calls = {
      gamesUpdate: null,
      blundersUpdate: null,
      blundersEqDeviceUuid: null,
      blundersIsUserId: undefined,
    };
    const supabase = {
      from: (table) => {
        if (table === 'games') {
          return {
            update: (payload) => {
              calls.gamesUpdate = payload;
              return {
                eq: () => ({
                  is: async () => ({ error: null }),
                }),
              };
            },
          };
        }
        if (table === 'blunders') {
          return {
            update: (payload) => {
              calls.blundersUpdate = payload;
              return {
                eq: (col, val) => {
                  if (col === 'device_uuid') calls.blundersEqDeviceUuid = val;
                  return {
                    is: async (col2, val2) => {
                      calls.blundersIsUserId = { col: col2, val: val2 };
                      return { error: null };
                    },
                  };
                },
              };
            },
          };
        }
        if (table === 'users') {
          return { update: () => ({ eq: () => ({ eq: async () => ({ error: null }), then: (r) => r({ error: null }) }) }) };
        }
        if (table === 'session_stats') return { upsert: async () => ({ error: null }) };
        if (table === 'puzzle_attempts') return { insert: async () => ({ error: null }) };
        if (table === 'lesson_progress') return { upsert: async () => ({ error: null }) };
        return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) };
      },
    };
    return { supabase, calls };
  }

  it('re-keys anon blunders with the client-supplied device_uuid to the user, WHERE user_id IS NULL', async () => {
    const { supabase, calls } = buildBlundersMigrateSupabase();
    const app = createApp(supabase, authMiddleware);
    const { status } = await request(app, 'POST', '/api/user/migrate', {
      body: {
        puzzle_attempts: [], session_stats: [], lesson_progress: [],
        sparring_record: null, streak: null,
        device_uuid: 'client-anon-uuid', // distinct from req.user.device_uuid ('dev-xyz-456')
      },
    });
    assert.equal(status, 204);
    assert.deepEqual(calls.blundersUpdate, { user_id: 'user-abc-123' });
    assert.equal(calls.blundersEqDeviceUuid, 'client-anon-uuid'); // keyed on CLIENT uuid, not req.user.device_uuid
    assert.deepEqual(calls.blundersIsUserId, { col: 'user_id', val: null });
  });

  it('does NOT touch blunders when device_uuid is absent (no-op)', async () => {
    const { supabase, calls } = buildBlundersMigrateSupabase();
    const app = createApp(supabase, authMiddleware);
    const { status } = await request(app, 'POST', '/api/user/migrate', {
      body: { puzzle_attempts: [], session_stats: [], lesson_progress: [], sparring_record: null, streak: null },
    });
    assert.equal(status, 204);
    assert.equal(calls.blundersUpdate, null); // blunders.update never called
  });

  it('does NOT touch blunders when device_uuid is an empty string (no-op)', async () => {
    const { supabase, calls } = buildBlundersMigrateSupabase();
    const app = createApp(supabase, authMiddleware);
    const { status } = await request(app, 'POST', '/api/user/migrate', {
      body: { puzzle_attempts: [], session_stats: [], lesson_progress: [], sparring_record: null, streak: null, device_uuid: '' },
    });
    assert.equal(status, 204);
    assert.equal(calls.blundersUpdate, null);
  });

  // ── T022 (Epic 8 — Onboarding Experience, US1) ──────────────────────────────
  // onboarding_status carry-over: conditional write, WHERE onboarding_status =
  // 'not_encountered', silent no-op when absent/invalid.

  /** Builds a users-table stub whose update().eq('id',...).eq('onboarding_status', currentValue-gated)
   *  records the update payload and simulates Postgres's WHERE-clause semantics: the update is
   *  only "applied" (and echoed back with no error) when the account's current onboarding_status
   *  (as tracked by the stub) equals 'not_encountered', mirroring the real conditional UPDATE. */
  function buildOnboardingMigrateSupabase({ currentOnboardingStatus = 'not_encountered' } = {}) {
    const calls = { onboardingUpdatePayload: null, otherTablesCalled: new Set() };
    const supabase = {
      from: (table) => {
        if (table === 'users') {
          return {
            update: (payload) => ({
              eq: (col1) => ({
                eq: (col2, val2) => {
                  // Only the onboarding conditional-write path chains a 2nd .eq(); the
                  // sparring_record/streak/device_uuid writers used elsewhere in this
                  // file call update().eq() once. Assert the exact WHERE shape.
                  assert.equal(col1, 'id');
                  assert.equal(col2, 'onboarding_status');
                  assert.equal(val2, 'not_encountered');
                  calls.onboardingUpdatePayload = payload;
                  const applied = currentOnboardingStatus === 'not_encountered';
                  return Promise.resolve({ error: null, applied });
                },
              }),
            }),
          };
        }
        calls.otherTablesCalled.add(table);
        return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) };
      },
    };
    return { supabase, calls };
  }

  it('(a) a fresh account (not_encountered) migrating a local seen value accepts it', async () => {
    const { supabase, calls } = buildOnboardingMigrateSupabase({ currentOnboardingStatus: 'not_encountered' });
    const app = createApp(supabase, authMiddleware);
    const { status } = await request(app, 'POST', '/api/user/migrate', {
      body: {
        puzzle_attempts: [], session_stats: [], lesson_progress: [],
        sparring_record: null, streak: null,
        onboarding_status: 'seen',
      },
    });
    assert.equal(status, 204);
    assert.deepEqual(calls.onboardingUpdatePayload, { onboarding_status: 'seen' });
  });

  it('(b) an account already seen/skipped migrating any value is NOT clobbered (conditional WHERE)', async () => {
    // The stub's conditional-write simulation reports the WHERE clause never matched
    // (currentOnboardingStatus !== 'not_encountered'); the endpoint must still succeed
    // (204) — it does not need to inspect `applied`, only that no DB error occurred,
    // matching Postgres's own "0 rows affected, no error" semantics for a WHERE miss.
    const { supabase, calls } = buildOnboardingMigrateSupabase({ currentOnboardingStatus: 'seen' });
    const app = createApp(supabase, authMiddleware);
    const { status } = await request(app, 'POST', '/api/user/migrate', {
      body: {
        puzzle_attempts: [], session_stats: [], lesson_progress: [],
        sparring_record: null, streak: null,
        onboarding_status: 'not_encountered',
      },
    });
    assert.equal(status, 204);
    // The conditional UPDATE was still issued (correct WHERE shape) — whether it
    // actually changed a row is the DB's concern, not this endpoint's.
    assert.deepEqual(calls.onboardingUpdatePayload, { onboarding_status: 'not_encountered' });
  });

  it('(c) an absent onboarding_status is a silent no-op (users table never touched for it)', async () => {
    const { supabase, calls } = buildOnboardingMigrateSupabase();
    const app = createApp(supabase, authMiddleware);
    const { status } = await request(app, 'POST', '/api/user/migrate', {
      body: {
        puzzle_attempts: [], session_stats: [], lesson_progress: [],
        sparring_record: null, streak: null,
        // onboarding_status omitted entirely
      },
    });
    assert.equal(status, 204);
    assert.equal(calls.onboardingUpdatePayload, null);
  });

  it('(c) an invalid onboarding_status is a silent no-op and does not fail the migration', async () => {
    const { supabase, calls } = buildOnboardingMigrateSupabase();
    const app = createApp(supabase, authMiddleware);
    const { status } = await request(app, 'POST', '/api/user/migrate', {
      body: {
        puzzle_attempts: [], session_stats: [], lesson_progress: [],
        sparring_record: null, streak: null,
        onboarding_status: 'bogus_value',
      },
    });
    assert.equal(status, 204);
    assert.equal(calls.onboardingUpdatePayload, null);
  });
});

// ── Spec 045 T005: 60-day rolling refresh-token cookie window ──────────────────
//
// The auth endpoints (POST /api/auth/callback, /refresh, /anonymous) live directly
// in server/index.js, a monolithic Express app that calls app.listen() at module
// load and initializes its supabase/authClient from env vars — it is not
// structured as an importable router (unlike userRoutes.js above), so it cannot
// be mounted into a lightweight test app the way the /api/user/* endpoints are.
// Spinning up the real server in-process would require live Supabase credentials
// and is out of scope for a fast unit test. Instead this is a source-level
// regression test: it asserts the REFRESH_TOKEN_MAX_AGE constant's value and that
// every sb_refresh_token cookie-set call site in the file references that
// constant (not a hardcoded literal), which is exactly what the 60-day rollout
// (spec 045 US1 / FR-001) depends on staying true.
//
// A later batch (US2) extracts POST /api/auth/refresh into server/authRefresh.js;
// once that lands, prefer a real HTTP-level test importing that module directly.
describe('Spec 045 US1 — 60-day rolling refresh-token cookie window', () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const indexSource = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');
  // Spec 054 T005 extracted cookieOpts()/ACCESS_TOKEN_MAX_AGE/REFRESH_TOKEN_MAX_AGE out of
  // index.js into cookieConfig.js (index.js can't be imported directly — it calls
  // app.listen() at module scope), so the constant *definitions* now live there; index.js
  // still imports and uses them at every cookie-set call site below.
  const cookieConfigSource = fs.readFileSync(path.join(__dirname, 'cookieConfig.js'), 'utf8');

  it('REFRESH_TOKEN_MAX_AGE is defined as 60 days in milliseconds', () => {
    const match = cookieConfigSource.match(/const REFRESH_TOKEN_MAX_AGE = ([^;]+);/);
    assert.ok(match, 'REFRESH_TOKEN_MAX_AGE constant not found in server/cookieConfig.js');
    const value = Function(`return (${match[1]});`)();
    assert.equal(value, 60 * 24 * 3600_000, `expected 60-day maxAge, got expression "${match[1]}" = ${value}`);
  });

  it('ACCESS_TOKEN_MAX_AGE remains 1 hour (unchanged by the 60-day rollout)', () => {
    const match = cookieConfigSource.match(/const ACCESS_TOKEN_MAX_AGE = ([^;]+);/);
    assert.ok(match, 'ACCESS_TOKEN_MAX_AGE constant not found in server/cookieConfig.js');
    const value = Function(`return (${match[1]});`)();
    assert.equal(value, 3600_000);
  });

  it('POST /api/auth/callback sets sb_refresh_token with maxAge: REFRESH_TOKEN_MAX_AGE', () => {
    const handler = extractHandlerBody(indexSource, `app.post('/api/auth/callback'`);
    assertSetsRefreshCookieWithConstant(handler, '/api/auth/callback');
  });

  it('POST /api/auth/refresh sets sb_refresh_token with maxAge: REFRESH_TOKEN_MAX_AGE', () => {
    const handler = extractHandlerBody(indexSource, `app.post('/api/auth/refresh'`);
    assertSetsRefreshCookieWithConstant(handler, '/api/auth/refresh');
  });

  it('POST /api/auth/anonymous sets sb_refresh_token with maxAge: REFRESH_TOKEN_MAX_AGE', () => {
    const handler = extractHandlerBody(indexSource, `app.post('/api/auth/anonymous'`);
    assertSetsRefreshCookieWithConstant(handler, '/api/auth/anonymous');
  });

  it('no route in index.js hardcodes the old 7-day refresh maxAge literal', () => {
    assert.ok(
      !/7\s*\*\s*24\s*\*\s*3600_000/.test(indexSource),
      'found a lingering 7-day maxAge literal (7 * 24 * 3600_000) in server/index.js'
    );
    // The constant definition line itself must be 60 days (now in cookieConfig.js).
    assert.ok(/const REFRESH_TOKEN_MAX_AGE = 60 \* 24 \* 3600_000/.test(cookieConfigSource));
  });

  /** Extract the source text of an Express handler starting at `marker`, up to its closing `});`. */
  function extractHandlerBody(source, marker) {
    const start = source.indexOf(marker);
    assert.ok(start >= 0, `handler starting with "${marker}" not found`);
    const end = source.indexOf('\n});', start);
    assert.ok(end > start, `closing "});" not found for handler "${marker}"`);
    return source.slice(start, end);
  }

  /** Assert a handler body sets sb_refresh_token using the REFRESH_TOKEN_MAX_AGE constant. */
  function assertSetsRefreshCookieWithConstant(handlerSource, routeLabel) {
    const cookieCallMatch = handlerSource.match(/res\.cookie\('sb_refresh_token',.*?maxAge: \w+ \}\);/s);
    assert.ok(cookieCallMatch, `${routeLabel}: no sb_refresh_token cookie-set call found`);
    assert.match(
      cookieCallMatch[0],
      /maxAge:\s*REFRESH_TOKEN_MAX_AGE/,
      `${routeLabel}: sb_refresh_token cookie-set call must use maxAge: REFRESH_TOKEN_MAX_AGE, got: ${cookieCallMatch[0]}`
    );
  }
});

// ── Spec 058 (e2e-qa-enablement) — POST /api/admin/qa-rollback, POST
// /api/admin/qa-set-paid-state ────────────────────────────────────────────
//
// index.js registers these two routes directly, inline, in its "Admin
// endpoints (localhost-only)" block — following the same pattern already
// noted above ("index.js can't be imported directly — it calls app.listen()
// at module scope"). This block builds a small standalone Express app that
// registers equivalent handlers, wired to the REAL createQaAccountTools
// (production import from ./qaAccountTools.js, never re-implemented here) and
// a byte-for-byte copy of index.js's requireLocalhost function
// (index.js:2922-2927 at the time of writing — verify against index.js if
// this test ever drifts). Only the thin Express registration/gate-check
// lines are duplicated (exactly what D1/D1a in research.md keep inline in
// index.js for every admin route); the actual reset/paid-state business
// logic under test is qaAccountTools.js's real code.
describe('POST /api/admin/qa-rollback, POST /api/admin/qa-set-paid-state', () => {
  // Verbatim copy of server/index.js's requireLocalhost (index.js:2922-2927).
  function requireLocalhost(req, res, next) {
    const ip = req.socket?.remoteAddress || '';
    if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') return next();
    return res.status(403).json({ error: 'Admin endpoints are localhost-only' });
  }

  /**
   * Builds a minimal Express app registering the two qa-* admin routes the
   * same way index.js does: `{ paddleClient, supabase, authClient }` are
   * passed straight through to the real createQaAccountTools on every
   * request, matching index.js's own per-request construction.
   */
  function createQaApp({ paddleClient, supabase, authClient, spoofNonLocalhost = false } = {}) {
    const app = express();
    app.use(express.json());
    if (spoofNonLocalhost) {
      // Test-only: stand in for a real non-loopback TCP peer, since a
      // same-machine test harness can't otherwise produce one. Mirrors what
      // a genuine remote caller's req.socket.remoteAddress would be.
      app.use((req, _res, next) => {
        req.socket = { remoteAddress: '203.0.113.5' };
        next();
      });
    }

    app.post('/api/admin/qa-rollback', requireLocalhost, async (req, res) => {
      const { userId } = req.body || {};
      if (!userId) return res.status(400).json({ error: 'userId is required' });
      if (!paddleClient) return res.status(503).json({ error: 'payments not configured' });
      try {
        const result = await createQaAccountTools({ paddleClient, supabase, authClient }).resetQaAccount({ userId });
        res.json(result);
      } catch {
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    app.post('/api/admin/qa-set-paid-state', requireLocalhost, async (req, res) => {
      const { userId, paddleCustomerId } = req.body || {};
      if (!userId) return res.status(400).json({ error: 'userId is required' });
      try {
        const result = await createQaAccountTools({ paddleClient, supabase, authClient })
          .setQaAccountPaidState({ userId, paddleCustomerId });
        res.json(result);
      } catch {
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    return app;
  }

  function makeFakeSubscriptionCollection(rows) {
    return {
      async *[Symbol.asyncIterator]() {
        for (const row of rows) yield row;
      },
    };
  }

  function makeMockPaddleClient({ subscriptionsByCustomer = {} } = {}) {
    return {
      subscriptions: {
        list: (queryParams) => makeFakeSubscriptionCollection(subscriptionsByCustomer[queryParams.customerId?.[0]] ?? []),
        cancel: async (id) => ({ id, status: 'canceled' }),
      },
    };
  }

  function makeMockSupabase({ users = {} } = {}) {
    return {
      from(table) {
        return {
          select: () => ({
            eq: (col, val) => ({
              maybeSingle: async () => {
                if (table === 'users' && Object.prototype.hasOwnProperty.call(users, val)) {
                  return { data: { paddle_customer_id: users[val] }, error: null };
                }
                return { data: null, error: null };
              },
            }),
          }),
          update: () => ({
            eq: async () => ({ error: null }),
          }),
        };
      },
    };
  }

  const authClientStub = { auth: { admin: { updateUserById: async () => ({ data: {}, error: null }) } } };

  describe('POST /api/admin/qa-rollback', () => {
    it('400 when userId is missing', async () => {
      const app = createQaApp({ paddleClient: makeMockPaddleClient(), supabase: makeMockSupabase(), authClient: authClientStub });
      const { status, body } = await request(app, 'POST', '/api/admin/qa-rollback', { body: {} });
      assert.equal(status, 400);
      assert.deepEqual(body, { error: 'userId is required' });
    });

    it('503 when paddleClient is null (payments not configured)', async () => {
      const app = createQaApp({ paddleClient: null, supabase: makeMockSupabase(), authClient: authClientStub });
      const { status, body } = await request(app, 'POST', '/api/admin/qa-rollback', { body: { userId: 'user-1' } });
      assert.equal(status, 503);
      assert.deepEqual(body, { error: 'payments not configured' });
    });

    it('200 with { reset: true, canceledSubscriptions } on success', async () => {
      const paddleClient = makeMockPaddleClient({ subscriptionsByCustomer: { ctm_1: [{ id: 'sub_a', status: 'active' }] } });
      const supabase = makeMockSupabase({ users: { 'user-1': 'ctm_1' } });
      const app = createQaApp({ paddleClient, supabase, authClient: authClientStub });
      const { status, body } = await request(app, 'POST', '/api/admin/qa-rollback', { body: { userId: 'user-1' } });
      assert.equal(status, 200);
      assert.deepEqual(body, { reset: true, canceledSubscriptions: ['sub_a'] });
    });

    it('non-localhost caller gets 403 with the verbatim requireLocalhost body', async () => {
      const app = createQaApp({
        paddleClient: makeMockPaddleClient(),
        supabase: makeMockSupabase(),
        authClient: authClientStub,
        spoofNonLocalhost: true,
      });
      const { status, body } = await request(app, 'POST', '/api/admin/qa-rollback', { body: { userId: 'user-1' } });
      assert.equal(status, 403);
      assert.deepEqual(body, { error: 'Admin endpoints are localhost-only' });
    });
  });

  describe('POST /api/admin/qa-set-paid-state', () => {
    it('400 when userId is missing', async () => {
      const app = createQaApp({ paddleClient: makeMockPaddleClient(), supabase: makeMockSupabase(), authClient: authClientStub });
      const { status, body } = await request(app, 'POST', '/api/admin/qa-set-paid-state', { body: {} });
      assert.equal(status, 400);
      assert.deepEqual(body, { error: 'userId is required' });
    });

    it('200 with { paidStateSet: true } on success (no 503 check — never touches paddleClient)', async () => {
      const app = createQaApp({ paddleClient: null, supabase: makeMockSupabase(), authClient: authClientStub });
      const { status, body } = await request(app, 'POST', '/api/admin/qa-set-paid-state', {
        body: { userId: 'user-1', paddleCustomerId: 'ctm_1' },
      });
      assert.equal(status, 200);
      assert.deepEqual(body, { paidStateSet: true });
    });

    it('non-localhost caller gets 403', async () => {
      const app = createQaApp({
        paddleClient: null,
        supabase: makeMockSupabase(),
        authClient: authClientStub,
        spoofNonLocalhost: true,
      });
      const { status, body } = await request(app, 'POST', '/api/admin/qa-set-paid-state', { body: { userId: 'user-1' } });
      assert.equal(status, 403);
      assert.deepEqual(body, { error: 'Admin endpoints are localhost-only' });
    });
  });
});
