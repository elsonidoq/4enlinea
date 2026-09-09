// OI-173 — an empty/zeroed payload must never overwrite stored user data.
//
// Root cause (OI-173, re-verified 2026-09-09): `IndexedDBStore.getSparringRecord()`
// returns `{ W: 0, L: 0, D: 0 }` and `getStreak()` returns
// `{ streak_count: 0, last_active_date: null }` for an EMPTY local store. Both are
// truthy objects, so `POST /api/user/migrate`'s `if (body.sparring_record)` /
// `if (body.streak)` guards do not skip them, and `writeSparringRecord` /
// `writeStreak` are whole-value `.update()`s — so a re-run of the migration wipes
// the two `users` columns back to zero.
//
// The guard under test lives in the HELPERS (userHelpers.js), not in the route:
// `writeSparringRecord`/`writeStreak` are also called by POST /api/user/sparring-record
// and POST /api/user/streak/record-day, so the helper is the lowest layer that makes
// the server refuse to destroy data for EVERY caller, present and future. Neither
// legit caller can send an empty payload (both are read-modify-write increments that
// produce W|L|D >= 1 / streak_count >= 1 with today's date), so the guard cannot
// suppress a real write — the positive cases below pin that.
//
// Fixtures are the real producer's real output, not hand-written: they are the
// literal defaults returned by IndexedDBStore.getSparringRecord()/getStreak() on an
// empty store (src/store/IndexedDBStore.js).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';

import { writeSparringRecord, writeStreak } from './userHelpers.js';
import { registerUserRoutes } from './userRoutes.js';

// The exact values IndexedDBStore returns when its object stores are empty.
const EMPTY_SPARRING = { W: 0, L: 0, D: 0 };
const EMPTY_STREAK = { streak_count: 0, last_active_date: null };

function makeUpdateSpy() {
  const calls = [];
  const supabase = {
    from: (table) => ({
      update: (data) => ({
        eq: async (col, val) => {
          calls.push({ table, data, col, val });
          return { error: null };
        },
      }),
    }),
  };
  return { supabase, calls };
}

describe('writeSparringRecord — empty-payload clobber guard (OI-173)', () => {
  it('does NOT write when the record is all zeroes', async () => {
    const { supabase, calls } = makeUpdateSpy();
    const result = await writeSparringRecord(supabase, 'user-1', EMPTY_SPARRING);
    assert.equal(result, undefined, 'reports success (nothing to migrate is not an error)');
    assert.deepEqual(calls, [], 'no UPDATE issued for a zeroed sparring_record');
  });

  it('does NOT write for a null/undefined/non-object record', async () => {
    for (const bad of [null, undefined, 'nope', 42, {}]) {
      const { supabase, calls } = makeUpdateSpy();
      await writeSparringRecord(supabase, 'user-1', bad);
      assert.deepEqual(calls, [], `no UPDATE issued for ${JSON.stringify(bad)}`);
    }
  });

  it('STILL writes a record with any non-zero counter', async () => {
    for (const good of [{ W: 1, L: 0, D: 0 }, { W: 0, L: 2, D: 0 }, { W: 0, L: 0, D: 3 }]) {
      const { supabase, calls } = makeUpdateSpy();
      const result = await writeSparringRecord(supabase, 'user-1', good);
      assert.equal(result, undefined);
      assert.equal(calls.length, 1, `writes ${JSON.stringify(good)}`);
      assert.deepEqual(calls[0].data, { sparring_record: good });
      assert.equal(calls[0].col, 'id');
      assert.equal(calls[0].val, 'user-1');
    }
  });
});

describe('writeStreak — empty-payload clobber guard (OI-173)', () => {
  it('does NOT write when streak_count is 0 and last_active_date is null', async () => {
    const { supabase, calls } = makeUpdateSpy();
    const result = await writeStreak(supabase, 'user-1', EMPTY_STREAK);
    assert.equal(result, undefined, 'reports success');
    assert.deepEqual(calls, [], 'no UPDATE issued for a zeroed streak');
  });

  it('does NOT write for a null/undefined/non-object streak', async () => {
    for (const bad of [null, undefined, 'nope', {}]) {
      const { supabase, calls } = makeUpdateSpy();
      await writeStreak(supabase, 'user-1', bad);
      assert.deepEqual(calls, [], `no UPDATE issued for ${JSON.stringify(bad)}`);
    }
  });

  it('STILL writes a real streak', async () => {
    const { supabase, calls } = makeUpdateSpy();
    const result = await writeStreak(supabase, 'user-1', { streak_count: 3, last_active_date: '2026-09-09' });
    assert.equal(result, undefined);
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].data, { streak_count: 3, last_active_date: '2026-09-09' });
  });

  it('STILL writes a day-1 streak (streak_count 1, today) — the record-day path', async () => {
    const { supabase, calls } = makeUpdateSpy();
    await writeStreak(supabase, 'user-1', { streak_count: 1, last_active_date: '2026-09-09' });
    assert.equal(calls.length, 1, 'the /api/user/streak/record-day write must not be suppressed');
  });
});

// ── End-to-end through the real route ────────────────────────────────────────

const TEST_USER = { id: 'user-abc-123', device_uuid: 'dev-xyz-456', tier: 'free' };

function createApp(supabase) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.user = TEST_USER; next(); });
  registerUserRoutes(app, supabase, { verifyPapergamesAccount: async () => 'unknown' });
  return app;
}

function request(app, method, path, body) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const { port } = server.address();
      const opts = { method, hostname: 'localhost', port, path, headers: { 'Content-Type': 'application/json' } };
      const req = http.request(opts, (res) => {
        let data = '';
        res.on('data', (c) => { data += c; });
        res.on('end', () => { server.close(); resolve({ status: res.statusCode, raw: data }); });
      });
      req.on('error', reject);
      req.write(JSON.stringify(body));
      req.end();
    });
  });
}

describe('POST /api/user/migrate — a re-run with an emptied local store cannot wipe users columns', () => {
  it('issues no sparring_record / streak UPDATE for IndexedDBStore\'s empty defaults', async () => {
    const userUpdates = [];
    // `users` .update() is used in two shapes in the route (.eq('id') terminal, and
    // .eq().eq() for onboarding_status), so `eq` returns a thenable chain.
    const supabase = {
      from: (table) => {
        if (table === 'users') {
          return {
            update: (data) => {
              userUpdates.push(data);
              const chain = {
                eq: () => chain,
                is: () => chain,
                then: (resolve) => resolve({ error: null }),
              };
              return chain;
            },
          };
        }
        if (table === 'games' || table === 'blunders') {
          return {
            update: () => {
              const chain = {
                eq: () => chain,
                is: () => chain,
                then: (resolve) => resolve({ error: null }),
              };
              return chain;
            },
          };
        }
        return { insert: async () => ({ error: null }), upsert: async () => ({ error: null }) };
      },
    };

    const app = createApp(supabase);
    const { status } = await request(app, 'POST', '/api/user/migrate', {
      // exactly what IndexedDBStore.migrateToSupabase POSTs after a previous
      // successful migration cleared the local stores
      puzzle_attempts: [],
      session_stats: [],
      lesson_progress: [],
      sparring_record: EMPTY_SPARRING,
      streak: EMPTY_STREAK,
      device_uuid: TEST_USER.device_uuid,
    });
    assert.equal(status, 204);
    const keys = userUpdates.flatMap((u) => Object.keys(u));
    assert.ok(!keys.includes('sparring_record'), `sparring_record must not be updated; saw ${JSON.stringify(userUpdates)}`);
    assert.ok(!keys.includes('streak_count'), `streak_count must not be updated; saw ${JSON.stringify(userUpdates)}`);
    assert.ok(!keys.includes('last_active_date'), `last_active_date must not be updated; saw ${JSON.stringify(userUpdates)}`);
  });
});
