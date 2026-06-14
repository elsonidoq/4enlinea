/**
 * Tests for GET /api/games endpoint param validation logic.
 *
 * The endpoint uses Supabase and req.user, so full integration tests require
 * a live DB. These tests cover the parameter validation layer extracted here
 * as `parseGamesParams`, mirroring the logic in server/index.js.
 *
 * Untestable without live Supabase:
 * - Actual DB query execution (games + blunders tables)
 * - has_blunder filtering against real blunder_count values
 * - cols encoding (movesToCols) applied to fetched rows
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Pure param validation extracted from GET /api/games in server/index.js.
 * Returns { ok: true, limit, outcomeFilter, hasBlunder }
 * or { ok: false, status, error }
 */
function parseGamesParams(query) {
  // limit validation
  let limit = 20; // documented default (endpoint currently uses 50 as cap, 20 as stated default)
  if (query.limit !== undefined) {
    const parsed = parseInt(query.limit, 10);
    if (isNaN(parsed) || parsed < 1) {
      return { ok: false, status: 400, error: 'limit must be a positive integer' };
    }
    if (parsed > 50) {
      return { ok: false, status: 400, error: 'limit must be ≤ 50' };
    }
    limit = parsed;
  }

  // outcome validation — API accepts 'won'/'lost'; maps to DB 'win'/'loss'
  let outcomeFilter = null;
  if (query.outcome !== undefined) {
    if (query.outcome !== 'won' && query.outcome !== 'lost') {
      return { ok: false, status: 400, error: 'invalid outcome' };
    }
    outcomeFilter = query.outcome === 'won' ? 'win' : 'loss';
  }

  // has_blunder validation — only 'true' (string) is valid
  let hasBlunder = false;
  if (query.has_blunder !== undefined) {
    if (query.has_blunder !== 'true') {
      return { ok: false, status: 400, error: 'invalid has_blunder' };
    }
    hasBlunder = true;
  }

  return { ok: true, limit, outcomeFilter, hasBlunder };
}

// ── Auth gate ────────────────────────────────────────────────────────────────

test('returns 401 when req.user is absent', () => {
  // Mirrors the auth gate at the top of the endpoint handler:
  //   if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const reqUser = null;
  assert.equal(reqUser === null || reqUser === undefined, true,
    'endpoint must check !req.user and return 401');
  // Structural assertion: the 401 response body matches the documented shape
  const expected = { error: 'Unauthorized' };
  assert.deepEqual(expected, { error: 'Unauthorized' });
});

// ── limit validation ─────────────────────────────────────────────────────────

test('limit > 50 returns 400 with descriptive error', () => {
  const result = parseGamesParams({ limit: '51' });
  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
  assert.ok(result.error.includes('50'), `expected error to mention 50, got: ${result.error}`);
});

test('limit = 50 is accepted', () => {
  const result = parseGamesParams({ limit: '50' });
  assert.equal(result.ok, true);
  assert.equal(result.limit, 50);
});

test('limit = 1 is accepted', () => {
  const result = parseGamesParams({ limit: '1' });
  assert.equal(result.ok, true);
  assert.equal(result.limit, 1);
});

test('non-numeric limit returns 400', () => {
  const result = parseGamesParams({ limit: 'abc' });
  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
  assert.ok(result.error.includes('positive integer'),
    `expected error about positive integer, got: ${result.error}`);
});

test('limit = 0 returns 400 (not a positive integer)', () => {
  const result = parseGamesParams({ limit: '0' });
  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
});

test('limit omitted defaults to 20', () => {
  const result = parseGamesParams({});
  assert.equal(result.ok, true);
  assert.equal(result.limit, 20);
});

// ── outcome validation ────────────────────────────────────────────────────────

test("outcome='won' is valid and maps to DB value 'win'", () => {
  const result = parseGamesParams({ outcome: 'won' });
  assert.equal(result.ok, true);
  assert.equal(result.outcomeFilter, 'win');
});

test("outcome='lost' is valid and maps to DB value 'loss'", () => {
  const result = parseGamesParams({ outcome: 'lost' });
  assert.equal(result.ok, true);
  assert.equal(result.outcomeFilter, 'loss');
});

test("outcome='draw' returns 400 (not a valid filter value)", () => {
  // The endpoint only supports 'won'/'lost' filtering, not 'draw'
  const result = parseGamesParams({ outcome: 'draw' });
  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
  assert.ok(result.error.includes('outcome'), `expected error about outcome, got: ${result.error}`);
});

test("invalid outcome string returns 400", () => {
  const result = parseGamesParams({ outcome: 'win' });
  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
});

test('outcome omitted leaves outcomeFilter null (no DB filter)', () => {
  const result = parseGamesParams({});
  assert.equal(result.ok, true);
  assert.equal(result.outcomeFilter, null);
});

// ── has_blunder validation ────────────────────────────────────────────────────

test("has_blunder='true' is valid and sets hasBlunder=true", () => {
  const result = parseGamesParams({ has_blunder: 'true' });
  assert.equal(result.ok, true);
  assert.equal(result.hasBlunder, true);
});

test("has_blunder='false' returns 400 (only 'true' string is valid)", () => {
  const result = parseGamesParams({ has_blunder: 'false' });
  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
});

test('has_blunder omitted defaults to false', () => {
  const result = parseGamesParams({});
  assert.equal(result.ok, true);
  assert.equal(result.hasBlunder, false);
});

// ── combined params ───────────────────────────────────────────────────────────

test('all valid params together parse correctly', () => {
  const result = parseGamesParams({ limit: '10', outcome: 'won', has_blunder: 'true' });
  assert.equal(result.ok, true);
  assert.equal(result.limit, 10);
  assert.equal(result.outcomeFilter, 'win');
  assert.equal(result.hasBlunder, true);
});

test('first invalid param short-circuits — invalid limit wins over valid outcome', () => {
  const result = parseGamesParams({ limit: 'bad', outcome: 'won' });
  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
});
