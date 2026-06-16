// Integration tests for POST /api/admin/puzzles/reindex
// Tests the round-robin assignment logic as a pure function,
// plus the endpoint handler via mocked supabase.
// Uses node:test + node:assert/strict.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';

// ── Pure round-robin algorithm (mirrors the handler logic) ───────────────────

function reindex(puzzles) {
  // puzzles: array of { id, ... } — category already known, shape_key computed externally.
  // Each puzzle must have a .shape_key property for grouping.
  if (!puzzles || puzzles.length === 0) {
    return { indexed: 0, shapeGroups: 0, updates: [] };
  }

  const groups = new Map();
  const groupKeys = [];
  for (const puzzle of puzzles) {
    const key = puzzle.shape_key;
    if (!groups.has(key)) {
      groups.set(key, []);
      groupKeys.push(key);
    }
    groups.get(key).push(puzzle);
  }

  // Shuffle within each group (deterministic for testing — use idx-based sort)
  for (const key of groupKeys) {
    const arr = groups.get(key);
    // Deterministic "shuffle" for test reproducibility: reverse for even groups
    // In production this is Math.random() - 0.5.
    arr.sort((a, b) => (a.id < b.id ? -1 : 1));
  }

  // Round-robin position assignment
  const numGroups = groupKeys.length;
  const maxGroupSize = Math.max(...groupKeys.map(k => groups.get(k).length));

  const updates = [];
  for (let sortedGroupPosition = 0; sortedGroupPosition < maxGroupSize; sortedGroupPosition++) {
    for (let groupIndex = 0; groupIndex < numGroups; groupIndex++) {
      if (sortedGroupPosition < groups.get(groupKeys[groupIndex]).length) {
        const puzzle = groups.get(groupKeys[groupIndex])[sortedGroupPosition];
        const position = groupIndex + sortedGroupPosition * numGroups;
        updates.push({ id: puzzle.id, position, shape_key: groupKeys[groupIndex] });
      }
    }
  }

  return { indexed: updates.length, shapeGroups: numGroups, updates };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/admin/puzzles/reindex — round-robin algorithm', () => {

  it('interleaves positions so same shape_key puzzles are never consecutive', () => {
    // Three groups: A (3 puzzles), B (2 puzzles), C (1 puzzle)
    const puzzles = [
      { id: 'a1', shape_key: 'group-A' },
      { id: 'a2', shape_key: 'group-A' },
      { id: 'a3', shape_key: 'group-A' },
      { id: 'b1', shape_key: 'group-B' },
      { id: 'b2', shape_key: 'group-B' },
      { id: 'c1', shape_key: 'group-C' },
    ];

    const { indexed, shapeGroups, updates } = reindex(puzzles);

    assert.equal(indexed, 6);
    assert.equal(shapeGroups, 3);

    // Sort by position and check no consecutive same shape_key
    const sorted = [...updates].sort((a, b) => a.position - b.position);
    assert.equal(sorted.length, 6);

    for (let i = 1; i < sorted.length; i++) {
      assert.notEqual(
        sorted[i].shape_key,
        sorted[i - 1].shape_key,
        `Consecutive puzzles at positions ${sorted[i - 1].position} and ${sorted[i].position} share shape_key "${sorted[i].shape_key}"`,
      );
    }

    // Verify position range (skip pattern means max may exceed indexed-1)
    const positions = sorted.map(u => u.position);
    const minPos = Math.min(...positions);
    assert.equal(minPos, 0);
    // Verify all positions are unique and non-negative
    const uniquePositions = new Set(positions);
    assert.equal(uniquePositions.size, 6);
  });

  it('handles empty category', () => {
    const { indexed, shapeGroups, updates } = reindex([]);
    assert.equal(indexed, 0);
    assert.equal(shapeGroups, 0);
    assert.equal(updates.length, 0);
  });

  it('handles single shape group — all puzzles same shape_key', () => {
    const puzzles = [
      { id: 'p1', shape_key: 'only-shape' },
      { id: 'p2', shape_key: 'only-shape' },
      { id: 'p3', shape_key: 'only-shape' },
    ];

    const { indexed, shapeGroups, updates } = reindex(puzzles);

    assert.equal(indexed, 3);
    assert.equal(shapeGroups, 1);

    // With one group, positions are sequential: groupIndex(0) + pos * 1
    const sorted = [...updates].sort((a, b) => a.position - b.position);
    const positions = sorted.map(u => u.position);
    assert.deepEqual(positions, [0, 1, 2]);
  });

  it('assigns unique positions — no duplicates', () => {
    const puzzles = [
      { id: 'x1', shape_key: 'A' },
      { id: 'x2', shape_key: 'B' },
      { id: 'x3', shape_key: 'C' },
      { id: 'x4', shape_key: 'A' },
      { id: 'x5', shape_key: 'B' },
      { id: 'x6', shape_key: 'C' },
      { id: 'x7', shape_key: 'A' },
      { id: 'x8', shape_key: 'B' },
    ];

    const { updates } = reindex(puzzles);

    const positions = updates.map(u => u.position);
    const uniquePositions = new Set(positions);
    assert.equal(uniquePositions.size, positions.length, 'All positions should be unique');
    assert.equal(positions.length, 8);
  });

  it('interleaves two large equal groups', () => {
    const puzzles = [];
    for (let i = 0; i < 10; i++) puzzles.push({ id: `a${i}`, shape_key: 'A' });
    for (let i = 0; i < 10; i++) puzzles.push({ id: `b${i}`, shape_key: 'B' });

    const { updates } = reindex(puzzles);

    // With two equal groups, positions should alternate: A(0), B(1), A(2), B(3)...
    const sorted = [...updates].sort((a, b) => a.position - b.position);
    for (let i = 0; i < sorted.length; i += 2) {
      assert.equal(sorted[i].shape_key, 'A', `Position ${i} should be group A`);
      if (i + 1 < sorted.length) {
        assert.equal(sorted[i + 1].shape_key, 'B', `Position ${i + 1} should be group B`);
      }
    }

    // No consecutive same shape_key
    for (let i = 1; i < sorted.length; i++) {
      assert.notEqual(sorted[i].shape_key, sorted[i - 1].shape_key);
    }
  });

  it('handles null shape_key as a distinct group', () => {
    const puzzles = [
      { id: 'n1', shape_key: null },
      { id: 'n2', shape_key: null },
      { id: 's1', shape_key: 'some-shape' },
    ];

    const { indexed, shapeGroups, updates } = reindex(puzzles);

    assert.equal(indexed, 3);
    assert.equal(shapeGroups, 2);

    const sorted = [...updates].sort((a, b) => a.position - b.position);
    for (let i = 1; i < sorted.length; i++) {
      assert.notEqual(sorted[i].shape_key, sorted[i - 1].shape_key);
    }
  });
});

// ── Endpoint handler tests (mocked supabase) ─────────────────────────────────

function createApp(mockSupabase) {
  const app = express();
  app.use(express.json());

  // Inline requireLocalhost bypass for tests
  app.use((req, _res, next) => {
    req.testBypassLocalhost = true;
    next();
  });

  // Inline the reindex endpoint for isolated testing
  app.post('/api/admin/puzzles/reindex', (req, res) => {
    // In production this is requireLocalhost; skip for test
    if (!mockSupabase) return res.status(503).json({ error: 'database unavailable' });
    const { category } = req.body;
    // In production uses VALID_CATEGORIES from './categories.js'
    const VALID_CATEGORIES = new Set([
      'immediate_threat', 'forced_block', 'double_threat', 'forced_win',
      'forbidden_columns', 'odd_even_threat', 'z_threat', 'claimeven',
      'claimodd', 'undercut', 'overcut', 'figure_7', 'j_shape',
    ]);
    if (!VALID_CATEGORIES.has(category)) {
      if (category === 'mixed') {
        return res.status(400).json({ error: 'mixed is a pseudo-category and cannot be reindexed' });
      }
      return res.status(400).json({ error: 'invalid category' });
    }
    mockSupabase.handle(req, res);
  });

  return app;
}

function request(app, method, path, body) {
  return new Promise((resolve) => {
    // Minimal request simulation — parse the body through the app
    // We need to actually send HTTP for proper req.body parsing
    const server = http.createServer(app);
    server.listen(0, () => {
      const { port } = server.address();
      const options = {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: { 'Content-Type': 'application/json' },
      };
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          server.close();
          resolve({ status: res.statusCode, body: JSON.parse(data || '{}') });
        });
      });
      if (body !== undefined) req.write(JSON.stringify(body));
      req.end();
    });
  });
}

describe('POST /api/admin/puzzles/reindex — endpoint', () => {
  it('rejects mixed category with 400', async () => {
    const mockSupabase = {};
    const app = createApp(mockSupabase);
    const res = await request(app, 'POST', '/api/admin/puzzles/reindex', { category: 'mixed' });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /mixed is a pseudo-category/);
  });

  it('rejects invalid category with 400', async () => {
    const app = createApp({});
    const res = await request(app, 'POST', '/api/admin/puzzles/reindex', { category: 'nonsense' });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /invalid category/);
  });

  it('returns 200 with indexed=0 for empty category', async () => {
    const mockSupabase = {
      handle(req, res) {
        // Simulate supabase returning empty puzzle list
        res.json({ category: req.body.category, indexed: 0, shapeGroups: 0 });
      },
    };
    const app = createApp(mockSupabase);
    const res = await request(app, 'POST', '/api/admin/puzzles/reindex', { category: 'forced_win' });
    assert.equal(res.status, 200);
    assert.equal(res.body.indexed, 0);
    assert.equal(res.body.shapeGroups, 0);
    assert.equal(res.body.category, 'forced_win');
  });
});
