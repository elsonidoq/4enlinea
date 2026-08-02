// Integration tests for GET /api/user/challenge-progress
// Tests the HTTP handler logic with mock supabase stubs — no real DB.
// Uses node:test + node:assert/strict (same pattern as userEndpoints.test.mjs).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';

import { registerUserRoutes } from '../../server/userRoutes.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function createApp(supabase, userMiddleware) {
  const app = express();
  app.use(express.json());
  if (userMiddleware) {
    app.use((req, _res, next) => {
      userMiddleware(req);
      next();
    });
  }
  registerUserRoutes(app, supabase);
  return app;
}

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
};

function authMiddleware(req) {
  req.user = TEST_USER;
}

function anonMiddleware() {
  // req.user stays undefined
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/user/challenge-progress', () => {
  it('returns 401 without auth', async () => {
    const app = createApp({}, anonMiddleware);
    const { status, body } = await request(app, 'GET', '/api/user/challenge-progress');
    assert.equal(status, 401);
    assert.deepEqual(body, { error: 'Unauthorized' });
  });

  it('returns 503 when supabase is null', async () => {
    const app = createApp(null, authMiddleware);
    const { status, body } = await request(app, 'GET', '/api/user/challenge-progress');
    assert.equal(status, 503);
    assert.ok(body.error);
  });

  it('returns correct progress shape for user with mixed attempts', async () => {
    // Active puzzles: 2 immediate_threat, 1 forced_block
    const activePuzzles = [
      { id: 'p1', category: 'immediate_threat' },
      { id: 'p2', category: 'immediate_threat' },
      { id: 'p3', category: 'forced_block' },
    ];

    // User attempts: p1 correct, p2 wrong (both attempted), plus a non-active puzzle p99
    const attempts = [
      { puzzle_id: 'p1', first_attempt_correct: true, puzzles: { category: 'immediate_threat' } },
      { puzzle_id: 'p2', first_attempt_correct: false, puzzles: { category: 'immediate_threat' } },
      { puzzle_id: 'p99', first_attempt_correct: true, puzzles: { category: 'immediate_threat' } }, // not active
    ];

    const supabase = {
      from: (table) => {
        if (table === 'puzzles') {
          return {
            select: () => ({
              eq: (col, val) => {
                assert.equal(col, 'is_active');
                assert.equal(val, true);
                return Promise.resolve({ data: activePuzzles, error: null });
              },
            }),
          };
        }
        if (table === 'puzzle_attempts') {
          return {
            select: () => ({
              eq: (col, val) => {
                assert.equal(col, 'user_id');
                assert.equal(val, TEST_USER.id);
                return Promise.resolve({ data: attempts, error: null });
              },
            }),
          };
        }
        return { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) };
      },
    };

    const app = createApp(supabase, authMiddleware);
    const { status, body } = await request(app, 'GET', '/api/user/challenge-progress');
    assert.equal(status, 200);
    assert.ok(body.progress);

    // immediate_threat: total=2, attempted=2 (p1, p2), correct=1 (p1)
    const itp = body.progress.immediate_threat;
    assert.equal(itp.total, 2);
    assert.equal(itp.attempted, 2);
    assert.equal(itp.correct, 1);
    assert.equal(itp.accuracy, 0.5);
    assert.equal(itp.cleared, false);

    // forced_block: total=1, attempted=0, correct=0
    const fb = body.progress.forced_block;
    assert.equal(fb.total, 1);
    assert.equal(fb.attempted, 0);
    assert.equal(fb.correct, 0);
    assert.equal(fb.accuracy, 0);
    assert.equal(fb.cleared, false);

    // Non-active puzzle p99 should not count
    // Verified: immediate_threat attempted=2 not 3
  });

  it('returns defaults for categories with no data', async () => {
    const activePuzzles = [
      { id: 'p1', category: 'immediate_threat' },
    ];

    const supabase = {
      from: (table) => {
        if (table === 'puzzles') {
          return {
            select: () => ({
              eq: () => Promise.resolve({ data: activePuzzles, error: null }),
            }),
          };
        }
        if (table === 'puzzle_attempts') {
          return {
            select: () => ({
              eq: () => Promise.resolve({ data: [], error: null }),
            }),
          };
        }
        return { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) };
      },
    };

    const app = createApp(supabase, authMiddleware);
    const { status, body } = await request(app, 'GET', '/api/user/challenge-progress');
    assert.equal(status, 200);

    // A category with active puzzles but no attempts
    const itp = body.progress.immediate_threat;
    assert.equal(itp.total, 1);
    assert.equal(itp.attempted, 0);
    assert.equal(itp.correct, 0);
    assert.equal(itp.accuracy, 0);
    assert.equal(itp.cleared, false);

    // A category with no active puzzles (e.g. z_threat)
    assert.ok(body.progress.z_threat);
    assert.equal(body.progress.z_threat.total, 0);
    assert.equal(body.progress.z_threat.attempted, 0);
    assert.equal(body.progress.z_threat.cleared, false);

    // All CHALLENGE_SETS categories are present
    assert.ok(body.progress.claimeven);
    assert.ok(body.progress.double_threat);
    assert.ok(body.progress.figure_7);
    assert.ok(body.progress.forced_win);
    assert.ok(body.progress.forbidden_columns);
    assert.ok(body.progress.j_shape);
    assert.ok(body.progress.mixed);
    assert.ok(body.progress.odd_even_threat);
    assert.ok(body.progress.overcut);
    assert.ok(body.progress.undercut);
  });

  it('cleared is true when correct === total and total > 0', async () => {
    const activePuzzles = [
      { id: 'p1', category: 'immediate_threat' },
      { id: 'p2', category: 'immediate_threat' },
    ];

    const attempts = [
      { puzzle_id: 'p1', first_attempt_correct: true, puzzles: { category: 'immediate_threat' } },
      { puzzle_id: 'p2', first_attempt_correct: true, puzzles: { category: 'immediate_threat' } },
    ];

    const supabase = {
      from: (table) => {
        if (table === 'puzzles') {
          return {
            select: () => ({
              eq: () => Promise.resolve({ data: activePuzzles, error: null }),
            }),
          };
        }
        if (table === 'puzzle_attempts') {
          return {
            select: () => ({
              eq: () => Promise.resolve({ data: attempts, error: null }),
            }),
          };
        }
        return { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) };
      },
    };

    const app = createApp(supabase, authMiddleware);
    const { status, body } = await request(app, 'GET', '/api/user/challenge-progress');
    assert.equal(status, 200);

    const itp = body.progress.immediate_threat;
    assert.equal(itp.total, 2);
    assert.equal(itp.correct, 2);
    assert.equal(itp.cleared, true);
  });

  it('cleared is false when total === 0', async () => {
    const supabase = {
      from: (table) => {
        if (table === 'puzzles') {
          return {
            select: () => ({
              eq: () => Promise.resolve({ data: [], error: null }),
            }),
          };
        }
        if (table === 'puzzle_attempts') {
          return {
            select: () => ({
              eq: () => Promise.resolve({ data: [], error: null }),
            }),
          };
        }
        return { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) };
      },
    };

    const app = createApp(supabase, authMiddleware);
    const { status, body } = await request(app, 'GET', '/api/user/challenge-progress');
    assert.equal(status, 200);

    // All categories should have cleared: false when total === 0
    for (const [slug, data] of Object.entries(body.progress)) {
      assert.equal(data.cleared, false, `${slug} cleared should be false when total=0`);
    }
  });

  it('accuracy is correct / attempted when attempted > 0, 0 when attempted === 0', async () => {
    const activePuzzles = [
      { id: 'p1', category: 'immediate_threat' },
      { id: 'p2', category: 'immediate_threat' },
      { id: 'p3', category: 'immediate_threat' },
      { id: 'p4', category: 'immediate_threat' },
    ];

    // 3 correct out of 4 attempted = 0.75 accuracy
    const attempts = [
      { puzzle_id: 'p1', first_attempt_correct: true, puzzles: { category: 'immediate_threat' } },
      { puzzle_id: 'p2', first_attempt_correct: true, puzzles: { category: 'immediate_threat' } },
      { puzzle_id: 'p3', first_attempt_correct: true, puzzles: { category: 'immediate_threat' } },
      { puzzle_id: 'p4', first_attempt_correct: false, puzzles: { category: 'immediate_threat' } },
    ];

    const supabase = {
      from: (table) => {
        if (table === 'puzzles') {
          return {
            select: () => ({
              eq: () => Promise.resolve({ data: activePuzzles, error: null }),
            }),
          };
        }
        if (table === 'puzzle_attempts') {
          return {
            select: () => ({
              eq: () => Promise.resolve({ data: attempts, error: null }),
            }),
          };
        }
        return { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) };
      },
    };

    const app = createApp(supabase, authMiddleware);
    const { status, body } = await request(app, 'GET', '/api/user/challenge-progress');
    assert.equal(status, 200);

    const itp = body.progress.immediate_threat;
    assert.equal(itp.attempted, 4);
    assert.equal(itp.correct, 3);
    assert.equal(itp.accuracy, 0.75);

    // Category with 0 attempts should have accuracy 0
    const fb = body.progress.forced_block;
    assert.equal(fb.attempted, 0);
    assert.equal(fb.accuracy, 0);
  });

  it('handles DB error gracefully', async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => Promise.resolve({ data: null, error: { message: 'DB connection lost' } }),
        }),
      }),
    };

    const app = createApp(supabase, authMiddleware);
    const { status, body } = await request(app, 'GET', '/api/user/challenge-progress');
    assert.equal(status, 500);
    assert.ok(body.error);
  });
});
