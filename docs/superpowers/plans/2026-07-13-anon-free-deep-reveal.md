# Anonymous Free Deep Reveal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an anonymous onboarding user open exactly ONE free deep reveal of a blunder in the post-game review, then gate further reveals behind sign-up — storing anon blunder rows keyed by `device_uuid` and re-associating them to the account on registration, so anon and signed-in states are technically identical.

**Architecture:** Anonymous sparring games already persist server-side keyed by `device_uuid` and re-associate to `user_id` on `/api/user/migrate` (shipped, OI-20). This plan extends the same `device_uuid` trick to the `blunders` table: (1) a migration makes `blunders` device-keyable; (2) `/api/games/analyze` writes anon blunders under `device_uuid`; (3) `/api/coach/queue` and `/api/explain-move-llm` serve anon callers; (4) `/api/user/migrate` re-associates anon blunders; (5) the client fetches the anon blunder nav-list and enforces the "1 free" limit with a localStorage flag. The three anon-access decisions are extracted into one pure, unit-tested module (`server/anonBlunderAccess.js`) because `server/index.js` is not HTTP-harness-testable; the thin index.js wiring is verified in browser QA.

**Tech Stack:** Node/Express (`server/index.js` monolith + `server/*.js` extracted helpers), Supabase (Postgres, service-role key, RLS bypassed for server queries), React (Vite, `src/`), `node --test` (no supertest, no jsdom for pure helpers), Postgres migrations via `server/migrate.js`.

## Global Constraints

- Signed-in **free tier stays 20/week**; anon gets **exactly 1** free reveal (client-enforced). Deep reveal stays the paid ladder's top rung. Never lower the signed-in quota.
- **Never** re-add a `device_uuid === req.user.id` comparison in `/api/games/analyze` (different id namespaces — 404s every logged-out review).
- Keep onboarding **anonymous-only auto-route** semantics intact (`shouldAutoRouteToOnboarding`); do not touch it.
- All server coordinates 0-indexed; not relevant here but do not introduce 1-indexing.
- New DB index names must be **distinct** — `CREATE UNIQUE INDEX IF NOT EXISTS <name>` silently no-ops if the NAME already exists (even with a different definition). Do NOT reuse `idx_blunders_game_unique`.
- **Blunders only** open the free reveal (suboptimal chips keep the in-place board preview). **AI-sparring only** — no anon papergames path.
- Everything the reveal text names on the board must stay grounded/highlighted (verify in QA; do not fabricate).
- Tests: `npm run test:fast` from inside `connect-four/`. NEVER run full `npm test` (solver IPC hang). New test files are NOT auto-discovered — add them by name to BOTH `test` and `test:fast` in `connect-four/package.json`.
- The dev server has **no hot-reload**; restart it after server changes before QA. Reset to a genuine anonymous state via Settings → "Dev: clear IndexedDB & sign out".

---

## File Structure

**Create:**
- `connect-four/server/migrations/058_blunders_device_uuid.sql` — schema: nullable `user_id`, `device_uuid` column, anon dedup + lookup indexes.
- `connect-four/server/anonBlunderAccess.js` — pure decisions: `resolveGameBlunderOwner`, `resolveQueueOwner`, `resolveExplainQuota`.
- `connect-four/server/anonBlunderAccess.test.mjs` — unit tests for the three helpers.
- `connect-four/src/lib/anonDeepReveal.js` — pure "1 free" localStorage gate: `canRevealAnon`, `markRevealedAnon`.
- `connect-four/tests/unit/anonDeepReveal.test.js` — unit tests for the gate.

**Modify:**
- `connect-four/server/insertGameBlunder.js` — accept `device_uuid`; write under `user_id || device_uuid`.
- `connect-four/tests/blunder/insertGameBlunder.test.js` — cover the anon/device write path.
- `connect-four/server/index.js` — anon blunder write in `/api/games/analyze`; anon serving in `/api/coach/queue`; anon access + quota guard in `/api/explain-move-llm`.
- `connect-four/server/userRoutes.js` — re-associate anon blunders on `/api/user/migrate`.
- `connect-four/server/userEndpoints.test.mjs` — assert the migrate blunder re-association op.
- `connect-four/src/screens/ReviewScreen.jsx` — fetch the blunder nav-list for anon (append `device_uuid`).
- `connect-four/src/components/DeepRevealPane.jsx` — anon "1 free" gate wiring.
- `connect-four/package.json` — register the two new test files in `test` and `test:fast`.
- `connect-four/staging_checks.md` — note migration 058 as a deploy prerequisite.

---

## Task 1: Migration 058 — make `blunders` device-keyable

**Files:**
- Create: `connect-four/server/migrations/058_blunders_device_uuid.sql`

**Interfaces:**
- Produces: `blunders.user_id` nullable; `blunders.device_uuid text` column; unique index `idx_blunders_device_game_unique`; lookup index `idx_blunders_device_created`.

- [ ] **Step 1: Write the migration SQL**

Create `connect-four/server/migrations/058_blunders_device_uuid.sql`:

```sql
-- 058: Make blunders device-keyable so anonymous onboarding users can store
-- (and later re-associate) their blunder rows, mirroring the games device_uuid
-- trick (migration 026 / OI-20). Anon rows have user_id NULL + device_uuid set;
-- /api/user/migrate re-keys them to user_id on sign-up.

-- Anon rows cannot set user_id (no account yet).
ALTER TABLE public.blunders ALTER COLUMN user_id DROP NOT NULL;

-- Device owner for anonymous rows (NULL for authenticated rows). Mirrors games.device_uuid.
ALTER TABLE public.blunders ADD COLUMN IF NOT EXISTS device_uuid text;

-- Dedup for anon AI-sparring rows. The existing (user_id, game_id, move_index)
-- unique index does NOT dedup anon rows: Postgres treats NULL user_id as distinct.
-- DISTINCT NEW NAME (index-name reuse silently no-ops).
CREATE UNIQUE INDEX IF NOT EXISTS idx_blunders_device_game_unique
  ON public.blunders (device_uuid, game_id, move_index)
  WHERE user_id IS NULL AND device_uuid IS NOT NULL AND game_id IS NOT NULL;

-- Lookup index for the anon coach-queue read path.
CREATE INDEX IF NOT EXISTS idx_blunders_device_created
  ON public.blunders (device_uuid, created_at DESC)
  WHERE user_id IS NULL;
```

- [ ] **Step 2: Apply the migration to the dev database**

Run (from `connect-four/`):

```bash
node --env-file=server/.env server/migrate.js
```

Expected: output lists `058_blunders_device_uuid.sql` as applied (prior 001–057 already recorded in `schema_migrations`, skipped). No errors.

- [ ] **Step 3: Verify the schema landed**

Run (from `connect-four/`):

```bash
node --env-file=server/.env -e "import('pg').then(async ({default:pg})=>{const p=new pg.Pool({connectionString:process.env.DATABASE_URL});const c=await p.query(\"select column_name,is_nullable from information_schema.columns where table_name='blunders' and column_name in ('user_id','device_uuid') order by column_name\");console.log(c.rows);const i=await p.query(\"select indexname from pg_indexes where tablename='blunders' and indexname like 'idx_blunders_device%'\");console.log(i.rows);await p.end();})"
```

Expected: `user_id` → `is_nullable: 'YES'`; `device_uuid` row present; both `idx_blunders_device_game_unique` and `idx_blunders_device_created` listed.

- [ ] **Step 4: Note the deploy prerequisite**

Add to `connect-four/staging_checks.md` under an "Anon free deep reveal" heading: "Migration `058_blunders_device_uuid.sql` must be applied before deploy (`node server/migrate.js` runs it automatically on the Railway deploy step). Without it, anon blunder INSERTs fail (NOT NULL on user_id) and the onboarding free reveal is a silent no-op."

- [ ] **Step 5: Commit**

```bash
cd connect-four && git add server/migrations/058_blunders_device_uuid.sql staging_checks.md && git commit -m "feat(db): migration 058 — make blunders device-keyable for anon reveal"
```

---

## Task 2: `insertGameBlunder` — accept a device-keyed row

**Files:**
- Modify: `connect-four/server/insertGameBlunder.js`
- Test: `connect-four/tests/blunder/insertGameBlunder.test.js`

**Interfaces:**
- Consumes: nothing new.
- Produces: `insertGameBlunder(supabase, row)` now accepts `row.device_uuid`; writes when `row.user_id || row.device_uuid` (was: `row.user_id` only). Payload gains `device_uuid: row.device_uuid ?? null`.

- [ ] **Step 1: Write the failing test**

Append to `connect-four/tests/blunder/insertGameBlunder.test.js`:

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { insertGameBlunder } from '../../server/insertGameBlunder.js';

describe('insertGameBlunder — anon device path', () => {
  it('writes a device-keyed row when user_id is absent but device_uuid is present', async () => {
    let captured = null;
    const supabase = { from: () => ({ insert: async (row) => { captured = row; return { error: null }; } }) };
    await insertGameBlunder(supabase, {
      device_uuid: 'dev-123',
      board_state: '3344',
      move_played: 2,
      correct_move: 3,
      pattern_category: 'suboptimal_move',
      quality: 'blunder',
      severity: 5,
      game_id: 'game-abc',
    });
    assert.ok(captured, 'insert was called');
    assert.equal(captured.device_uuid, 'dev-123');
    assert.equal(captured.user_id ?? null, null);
    assert.equal(captured.game_id, 'game-abc');
  });

  it('still no-ops when BOTH user_id and device_uuid are absent', async () => {
    let called = false;
    const supabase = { from: () => ({ insert: async () => { called = true; return { error: null }; } }) };
    await insertGameBlunder(supabase, { board_state: '3344', move_played: 2, correct_move: 3, quality: 'blunder' });
    assert.equal(called, false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run (from `connect-four/`): `node --test tests/blunder/insertGameBlunder.test.js`
Expected: the "device-keyed row" test FAILS — current code early-returns on `!row.user_id`, so `captured` stays `null` and `captured.device_uuid` throws / asserts wrong.

- [ ] **Step 3: Implement the change**

In `connect-four/server/insertGameBlunder.js`, replace the auth gate:

```js
  // Auth gate: anonymous users cannot write blunders
  if (!row.user_id) return;
```

with:

```js
  // Owner gate: authenticated rows carry user_id; anonymous rows carry device_uuid
  // (device-keyed, re-associated to user_id on /api/user/migrate). Reject only
  // when NEITHER identity is present.
  if (!row.user_id && !row.device_uuid) return;
```

And in the `payload` object, add `device_uuid` right after `user_id`:

```js
  const payload = {
    user_id: row.user_id ?? null,
    device_uuid: row.device_uuid ?? null,
    board_state: row.board_state,
```

(Change `user_id: row.user_id,` to `user_id: row.user_id ?? null,` and insert the `device_uuid` line.)

- [ ] **Step 4: Run the test to verify it passes**

Run (from `connect-four/`): `node --test tests/blunder/insertGameBlunder.test.js`
Expected: PASS (all tests, including the pre-existing ones).

- [ ] **Step 5: Commit**

```bash
cd connect-four && git add server/insertGameBlunder.js tests/blunder/insertGameBlunder.test.js && git commit -m "feat(server): insertGameBlunder accepts device-keyed anon rows"
```

---

## Task 3: `anonBlunderAccess.js` — pure anon-access decisions

**Files:**
- Create: `connect-four/server/anonBlunderAccess.js`
- Test: `connect-four/server/anonBlunderAccess.test.mjs`

**Interfaces:**
- Produces:
  - `resolveGameBlunderOwner(reqUser, game) → {user_id, device_uuid} | null`
  - `resolveQueueOwner(reqUser, deviceUuidParam) → {ok:true, scope:'user', userId} | {ok:true, scope:'device', deviceUuid} | {ok:false}`
  - `resolveExplainQuota(reqUser) → boolean`

- [ ] **Step 1: Write the failing test**

Create `connect-four/server/anonBlunderAccess.test.mjs`:

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveGameBlunderOwner, resolveQueueOwner, resolveExplainQuota } from './anonBlunderAccess.js';

const UUID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

describe('resolveGameBlunderOwner', () => {
  it('authenticated caller → user scope, device_uuid null (preserves prior behavior even on an anon game)', () => {
    assert.deepEqual(resolveGameBlunderOwner({ id: 'u1' }, { device_uuid: UUID }), { user_id: 'u1', device_uuid: null });
  });
  it('anonymous caller + device-scoped game → device scope', () => {
    assert.deepEqual(resolveGameBlunderOwner(null, { device_uuid: UUID }), { user_id: null, device_uuid: UUID });
  });
  it('anonymous caller + game without device_uuid → null (no storage)', () => {
    assert.equal(resolveGameBlunderOwner(null, { device_uuid: null }), null);
    assert.equal(resolveGameBlunderOwner(undefined, {}), null);
  });
});

describe('resolveQueueOwner', () => {
  it('authenticated → user scope', () => {
    assert.deepEqual(resolveQueueOwner({ id: 'u1' }, null), { ok: true, scope: 'user', userId: 'u1' });
  });
  it('anonymous + valid device uuid → device scope', () => {
    assert.deepEqual(resolveQueueOwner(null, UUID), { ok: true, scope: 'device', deviceUuid: UUID });
  });
  it('anonymous + missing/invalid device uuid → not ok', () => {
    assert.deepEqual(resolveQueueOwner(null, null), { ok: false });
    assert.deepEqual(resolveQueueOwner(null, 'not-a-uuid'), { ok: false });
  });
});

describe('resolveExplainQuota', () => {
  it('free-tier authenticated → true', () => { assert.equal(resolveExplainQuota({ id: 'u1', tier: 'free' }), true); });
  it('paid authenticated → false', () => { assert.equal(resolveExplainQuota({ id: 'u1', tier: 'paid' }), false); });
  it('anonymous → false (no users row; bounded by rate limiter)', () => { assert.equal(resolveExplainQuota(null), false); assert.equal(resolveExplainQuota(undefined), false); });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run (from `connect-four/`): `node --test server/anonBlunderAccess.test.mjs`
Expected: FAIL — module not found / functions undefined.

- [ ] **Step 3: Implement the module**

Create `connect-four/server/anonBlunderAccess.js`:

```js
// Pure anon-access decisions for the "anonymous free deep reveal" feature.
// server/index.js is not HTTP-harness-testable (the Express app is not exported),
// so the branch logic lives here and is unit-tested; index.js only wires it.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Decide who owns the blunder rows written for a just-analyzed game.
 * Authenticated caller → their user_id (device_uuid null) — preserves the
 * pre-existing behavior exactly (signed-in users always wrote under user_id).
 * Anonymous caller with a device-scoped game → device_uuid, user_id null.
 * Otherwise → null (no blunder storage). NEVER compares device_uuid to a user id.
 * @param {{id:string}|null|undefined} reqUser
 * @param {{device_uuid?:string|null}} game
 * @returns {{user_id:string|null, device_uuid:string|null}|null}
 */
export function resolveGameBlunderOwner(reqUser, game) {
  if (reqUser) return { user_id: reqUser.id, device_uuid: null };
  if (game && game.device_uuid) return { user_id: null, device_uuid: game.device_uuid };
  return null;
}

/**
 * Decide how to scope a GET /api/coach/queue read.
 * @param {{id:string}|null|undefined} reqUser
 * @param {string|null} deviceUuidParam
 * @returns {{ok:true, scope:'user', userId:string}|{ok:true, scope:'device', deviceUuid:string}|{ok:false}}
 */
export function resolveQueueOwner(reqUser, deviceUuidParam) {
  if (reqUser) return { ok: true, scope: 'user', userId: reqUser.id };
  if (typeof deviceUuidParam === 'string' && UUID_RE.test(deviceUuidParam)) {
    return { ok: true, scope: 'device', deviceUuid: deviceUuidParam };
  }
  return { ok: false };
}

/**
 * Whether the free-tier weekly deep-reveal quota should run for this caller.
 * Anonymous callers have no users row → never run quota (bounded by the per-IP
 * rate limiter instead).
 * @param {{tier?:string}|null|undefined} reqUser
 * @returns {boolean}
 */
export function resolveExplainQuota(reqUser) {
  return !!(reqUser && reqUser.tier === 'free');
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run (from `connect-four/`): `node --test server/anonBlunderAccess.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd connect-four && git add server/anonBlunderAccess.js server/anonBlunderAccess.test.mjs && git commit -m "feat(server): pure anon-access decisions for anon deep reveal"
```

---

## Task 4: Wire anon blunder WRITE into `/api/games/analyze`

**Files:**
- Modify: `connect-four/server/index.js` (game-fetch block ~2049-2085; blunder write ~2269-2285)

**Interfaces:**
- Consumes: `resolveGameBlunderOwner` (Task 3), `insertGameBlunder` device path (Task 2).
- Produces: anon AI-sparring games write blunder rows stamped with `device_uuid` (from the fetched game row), `user_id NULL`.

**No unit test** — `server/index.js` is not harness-testable. The decision is covered by Task 3's `resolveGameBlunderOwner` test; the wiring is verified end-to-end in Task 12 QA.

- [ ] **Step 1: Import the helper**

Near the top of `connect-four/server/index.js`, next to the existing `insertGameBlunder` import, add:

```js
import { resolveGameBlunderOwner } from './anonBlunderAccess.js';
```

- [ ] **Step 2: Capture the game's device_uuid at fetch time**

In `/api/games/analyze`, find the declaration `let moves, side, difficulty, created_at, isPapergames = false;` and change it to also declare a device holder:

```js
  let moves, side, difficulty, created_at, isPapergames = false;
  let gameDeviceUuid = null;
```

In the `if (aiGame) { ... }` branch, after the ownership check, change:

```js
      ({ moves, side, difficulty, created_at } = aiGame);
```

to:

```js
      ({ moves, side, difficulty, created_at } = aiGame);
      gameDeviceUuid = aiGame.device_uuid ?? null;
```

(The papergames branch leaves `gameDeviceUuid = null`; anon papergames never occurs.)

- [ ] **Step 3: Use the owner decision at the write site**

Replace the blunder write block:

```js
      // Server-side mistake INSERT — anonymous users skip (user_id would be NULL).
      if (req.user && isMistake) {
        await insertGameBlunder(supabase, {
          user_id: req.user.id,
          board_state: movesBeforeThisPly,
          move_played: col,
          correct_move: bestCol,
          pattern_category: patternTag,
          quality: storedMistake.quality,
          reason,
          direction,
          severity: computeSeverity(bestScore, score),
          blunder_severity: blunderSeverity,
          game_id: isPapergames ? null : gameId,
          papergames_game_id: isPapergames ? gameId : null,
        });
      }
```

with:

```js
      // Server-side mistake INSERT. Authenticated → user-scoped (unchanged).
      // Anonymous AI-sparring → device-scoped (user_id NULL, device_uuid from the
      // game row), re-associated to user_id on /api/user/migrate. resolveGameBlunderOwner
      // NEVER compares device_uuid to a user id.
      const blunderOwner = resolveGameBlunderOwner(req.user, { device_uuid: gameDeviceUuid });
      if (blunderOwner && isMistake) {
        await insertGameBlunder(supabase, {
          user_id: blunderOwner.user_id,
          device_uuid: blunderOwner.device_uuid,
          board_state: movesBeforeThisPly,
          move_played: col,
          correct_move: bestCol,
          pattern_category: patternTag,
          quality: storedMistake.quality,
          reason,
          direction,
          severity: computeSeverity(bestScore, score),
          blunder_severity: blunderSeverity,
          game_id: isPapergames ? null : gameId,
          papergames_game_id: isPapergames ? gameId : null,
        });
      }
```

- [ ] **Step 4: Sanity-check the server boots**

Run (from `connect-four/`): `node --check server/index.js`
Expected: no syntax errors (exit 0).

- [ ] **Step 5: Commit**

```bash
cd connect-four && git add server/index.js && git commit -m "feat(server): write anon blunder rows by device_uuid in /api/games/analyze"
```

---

## Task 5: Serve anon in `/api/coach/queue`

**Files:**
- Modify: `connect-four/server/index.js` (`GET /api/coach/queue` ~2601-2660)

**Interfaces:**
- Consumes: `resolveQueueOwner` (Task 3).
- Produces: anon callers passing `?device_uuid=<uuid>` get their device-scoped blunders; missing/invalid device → 401. Returned shape unchanged.

**No unit test** — covered by Task 3's `resolveQueueOwner` test + Task 12 QA.

- [ ] **Step 1: Extend the import**

Update the `anonBlunderAccess.js` import in `connect-four/server/index.js` to include `resolveQueueOwner`:

```js
import { resolveGameBlunderOwner, resolveQueueOwner } from './anonBlunderAccess.js';
```

- [ ] **Step 2: Replace the auth gate**

In `GET /api/coach/queue`, replace:

```js
  if (!req.user) return res.status(401).json({ error: 'unauthorized' });
```

with:

```js
  // Authenticated → user-scoped. Anonymous → device-scoped via ?device_uuid
  // (onboarding free deep reveal). Missing/invalid device for an anon caller → 401.
  const queueOwner = resolveQueueOwner(req.user, req.query.device_uuid || null);
  if (!queueOwner.ok) return res.status(401).json({ error: 'unauthorized' });
```

- [ ] **Step 3: Scope the filter chain by owner**

In the same handler, replace the first line of `applyFilters`:

```js
    let filtered = q.eq('user_id', req.user.id);
```

with:

```js
    let filtered = queueOwner.scope === 'device'
      ? q.eq('device_uuid', queueOwner.deviceUuid).is('user_id', null)
      : q.eq('user_id', queueOwner.userId);
```

- [ ] **Step 4: Sanity-check the server boots**

Run (from `connect-four/`): `node --check server/index.js`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
cd connect-four && git add server/index.js && git commit -m "feat(server): /api/coach/queue serves anon device-scoped blunders"
```

---

## Task 6: Allow anon in `/api/explain-move-llm` (no quota, rate-cap bounded)

**Files:**
- Modify: `connect-four/server/index.js` (`POST /api/explain-move-llm` ~1104-1237)

**Interfaces:**
- Consumes: `resolveExplainQuota` (Task 3).
- Produces: anon callers get an explanation (bounded by the existing `app.use('/api/explain-move-llm', makeLimit(5))` per-IP limiter); `deep_reveal_count` is never touched for anon; all `req.user.` derefs are null-safe.

**No unit test** — covered by Task 3's `resolveExplainQuota` test + Task 12 QA (both the free reveal AND the "second reveal still allowed server-side but gated client-side" behavior).

- [ ] **Step 1: Extend the import**

Update the `anonBlunderAccess.js` import to include `resolveExplainQuota`:

```js
import { resolveGameBlunderOwner, resolveQueueOwner, resolveExplainQuota } from './anonBlunderAccess.js';
```

- [ ] **Step 2: Remove the hard 401**

At the top of `POST /api/explain-move-llm`, delete:

```js
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
```

(Anon is now allowed; the per-IP `makeLimit(5)` prefix middleware already bounds abuse. The client localStorage gate enforces the "1 free" UX.)

- [ ] **Step 3: Null-safe every `req.user.` dereference in the handler**

Search the handler body (from the route line down to its closing `});`, ~1104-1237) for `req.user.` and make each null-safe. Known sites:

- The `computeMechanism(...)` call — change `userId: req.user.id` to:

```js
      userId: req.user?.id ?? null,
```

- The free-tier quota block — replace:

```js
  if (req.user.tier === 'free' && supabase) {
    const quota = await checkAndDecrementQuota(req.user);
    if (!quota.allowed) {
      return res.status(429).json({ error: 'quota_exceeded', resetsAt: quota.resetsAt });
    }
  }
```

with:

```js
  if (resolveExplainQuota(req.user) && supabase) {
    const quota = await checkAndDecrementQuota(req.user);
    if (!quota.allowed) {
      return res.status(429).json({ error: 'quota_exceeded', resetsAt: quota.resetsAt });
    }
  }
```

- Any `deep_reveal_failures` insert or log line that reads `req.user.id` → change to `req.user?.id ?? null`.

Confirm no bare `req.user.` remains: run (from `connect-four/`):

```bash
awk 'NR>=1104 && NR<=1237 && /req\.user\./ && !/req\.user\?\./' server/index.js
```

Expected: no output (every `req.user.` is now `req.user?.`). If any line prints, null-guard it.

- [ ] **Step 4: Sanity-check the server boots**

Run (from `connect-four/`): `node --check server/index.js`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
cd connect-four && git add server/index.js && git commit -m "feat(server): allow anon /api/explain-move-llm (rate-capped, no quota)"
```

---

## Task 7: Re-associate anon blunders on `/api/user/migrate`

**Files:**
- Modify: `connect-four/server/userRoutes.js` (migrate handler, after the games re-association block)
- Test: `connect-four/server/userEndpoints.test.mjs`

**Interfaces:**
- Consumes: `body.device_uuid` (already sent by the client migrate payload).
- Produces: `UPDATE blunders SET user_id = <account> WHERE device_uuid = body.device_uuid AND user_id IS NULL` runs inside the atomic `operations[]`.

- [ ] **Step 1: Write the failing test**

In `connect-four/server/userEndpoints.test.mjs`, add a test in the migrate `describe` block. It uses a supabase stub that records `.update().eq().is()` chains per table:

```js
describe('POST /api/user/migrate — anon blunder re-association', () => {
  it('re-keys device-scoped blunders to the account, mirroring games', async () => {
    const updates = [];
    const supabase = {
      from: (table) => ({
        update: (patch) => ({
          eq: (col, val) => ({
            eq: () => ({ then: (r) => r({ error: null }) }),
            is: (isCol, isVal) => ({
              then: (r) => { updates.push({ table, patch, col, val, isCol, isVal }); return r({ error: null }); },
            }),
          }),
        }),
      }),
    };
    const app = createApp(supabase, authMiddleware);
    const { status } = await request(app, 'POST', '/api/user/migrate', {
      body: { device_uuid: 'dev-xyz-456' },
    });
    assert.equal(status, 204);
    const blunderOp = updates.find(u => u.table === 'blunders');
    assert.ok(blunderOp, 'a blunders UPDATE op was issued');
    assert.deepEqual(blunderOp.patch, { user_id: TEST_USER.id });
    assert.equal(blunderOp.col, 'device_uuid');
    assert.equal(blunderOp.val, 'dev-xyz-456');
    assert.equal(blunderOp.isCol, 'user_id');
    assert.equal(blunderOp.isVal, null);
  });
});
```

> Note: the migrate handler also touches `users` (device_uuid backfill) and `games`. If the existing stub in this file's migrate tests already handles those tables, reuse/extend it so `from('users')` / `from('games')` don't throw. If the `from()` above is called for `users`/`games`, return a chain whose `.update().eq().is().then()` and `.update().eq().then()` resolve to `{error:null}` — the snippet's `from` already returns a generic chain that satisfies both `.eq().is().then()` and `.eq().eq().then()` shapes; verify against the handler's exact call order and adjust if a table uses a different chain (`users` backfill is `.update().eq()` then awaited).

- [ ] **Step 2: Run the test to verify it fails**

Run (from `connect-four/`): `node --test server/userEndpoints.test.mjs`
Expected: FAIL — no `blunders` UPDATE op is issued yet (`blunderOp` is undefined).

- [ ] **Step 3: Implement the re-association**

In `connect-four/server/userRoutes.js`, immediately AFTER the games re-association block (the `if (typeof body.device_uuid === 'string' && body.device_uuid.length > 0) { operations.push(supabase.from('games')...) }`), add a parallel block:

```js
      // Anon free deep reveal — re-associate anonymous blunder rows, same
      // device_uuid trick as the games block above. Anon blunders were written
      // with user_id=null, device_uuid=<client's>. Key on body.device_uuid (the
      // client's), NOT the derived deviceUuid. Absent/empty is a silent no-op.
      if (typeof body.device_uuid === 'string' && body.device_uuid.length > 0) {
        operations.push(
          supabase
            .from('blunders')
            .update({ user_id: req.user.id })
            .eq('device_uuid', body.device_uuid)
            .is('user_id', null)
            .then(({ error }) => (error ? { error: error.message } : undefined)),
        );
      }
```

- [ ] **Step 4: Run the test to verify it passes**

Run (from `connect-four/`): `node --test server/userEndpoints.test.mjs`
Expected: PASS (the new test and all pre-existing migrate tests).

- [ ] **Step 5: Commit**

```bash
cd connect-four && git add server/userRoutes.js server/userEndpoints.test.mjs && git commit -m "feat(server): re-associate anon blunders to account on /api/user/migrate"
```

---

## Task 8: `anonDeepReveal.js` — the "1 free" localStorage gate

**Files:**
- Create: `connect-four/src/lib/anonDeepReveal.js`
- Test: `connect-four/tests/unit/anonDeepReveal.test.js`

**Interfaces:**
- Produces:
  - `canRevealAnon(blunderKey) → boolean` — true if no reveal used yet, or re-opening the same one.
  - `markRevealedAnon(blunderKey) → void` — records the first revealed key (idempotent; never overwrites).

- [ ] **Step 1: Write the failing test**

Create `connect-four/tests/unit/anonDeepReveal.test.js`:

```js
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Minimal in-memory localStorage shim (repo pattern — see useLanguage.test.js).
beforeEach(() => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
});

const { canRevealAnon, markRevealedAnon } = await import('../../src/lib/anonDeepReveal.js');

describe('anonDeepReveal gate', () => {
  it('allows a reveal when none has been used', () => {
    assert.equal(canRevealAnon('3344:2'), true);
  });

  it('after marking, re-opening the SAME blunder stays free', () => {
    markRevealedAnon('3344:2');
    assert.equal(canRevealAnon('3344:2'), true);
  });

  it('after marking, a DIFFERENT blunder is gated', () => {
    markRevealedAnon('3344:2');
    assert.equal(canRevealAnon('5566:4'), false);
  });

  it('markRevealedAnon is idempotent — the first key wins', () => {
    markRevealedAnon('3344:2');
    markRevealedAnon('5566:4'); // must NOT overwrite
    assert.equal(canRevealAnon('3344:2'), true);
    assert.equal(canRevealAnon('5566:4'), false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run (from `connect-four/`): `node --test tests/unit/anonDeepReveal.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the module**

Create `connect-four/src/lib/anonDeepReveal.js`:

```js
// The anonymous onboarding user gets exactly ONE free deep reveal. We record
// WHICH blunder was revealed (movestring:col) in localStorage so re-opening that
// same reveal stays free, but any NEW reveal is gated behind sign-up. This is the
// honest UX gate; server-side abuse is bounded by the per-IP rate limiter.
const KEY = 'anon_deep_reveal_v1';

function read() {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

/**
 * @param {string} blunderKey - stable per-blunder key, e.g. `${movestring}:${col}`
 * @returns {boolean} true if the free reveal is unused, or this is the same blunder.
 */
export function canRevealAnon(blunderKey) {
  const used = read();
  return used === null || used === blunderKey;
}

/**
 * Record the free reveal as spent on this blunder. Idempotent — the first key wins.
 * @param {string} blunderKey
 */
export function markRevealedAnon(blunderKey) {
  try { if (read() === null) localStorage.setItem(KEY, blunderKey); } catch { /* no-op */ }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run (from `connect-four/`): `node --test tests/unit/anonDeepReveal.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd connect-four && git add src/lib/anonDeepReveal.js tests/unit/anonDeepReveal.test.js && git commit -m "feat(client): anon '1 free deep reveal' localStorage gate"
```

---

## Task 9: `ReviewScreen` — fetch the blunder nav-list for anon

**Files:**
- Modify: `connect-four/src/screens/ReviewScreen.jsx` (`useStore` destructure ~55; the `if (session)` queue-fetch block ~148-159)

**Interfaces:**
- Consumes: `/api/coach/queue?...&device_uuid=<uuid>` (Task 5); `store.getProfile()` for the client device_uuid.
- Produces: `gameBlunderList` populates for anon too, so `navigateToMistake` routes to `blunderDetail`.

**No unit test** — JSX, not `node --test`-parseable. Verified in Task 12 QA. (The pure decisions it relies on — server scoping and the gate — are tested in Tasks 3 and 8.)

- [ ] **Step 1: Add `store` to the store destructure**

Change:

```jsx
  const { session } = useStore();
```

to:

```jsx
  const { session, store } = useStore();
```

- [ ] **Step 2: Fetch the queue for anon too, appending device_uuid**

Replace the `if (session)` fetch block:

```jsx
        // Fire-and-forget: fetch game blunder list for ✕-node navigation, paged to completion
        if (session) {
          const queueParam = data.source === 'papergames'
            ? `papergames_game_id=${id}`
            : `game_id=${id}`;
          fetchAllQueueBlunders(queueParam)
            .then(blunders => {
              const sorted = blunders.slice().sort((a, b) => a.moveIndex - b.moveIndex);
              setGameBlunderList(sorted);
            })
            .catch(() => setGameBlunderList([]));
        }
```

with:

```jsx
        // Fire-and-forget: fetch game blunder list for ✕-node navigation, paged to completion.
        // Signed-in → user-scoped. Anonymous onboarding → device-scoped: append the client's
        // device_uuid so the anon free deep reveal can open the blunder detail (approach a).
        (async () => {
          const queueBase = data.source === 'papergames'
            ? `papergames_game_id=${id}`
            : `game_id=${id}`;
          let queueParam = queueBase;
          if (!session) {
            const profile = await store.getProfile().catch(() => null);
            const deviceUuid = profile?.device_uuid;
            if (!deviceUuid) return; // cannot fetch anon queue without a device id
            queueParam = `${queueBase}&device_uuid=${encodeURIComponent(deviceUuid)}`;
          }
          try {
            const blunders = await fetchAllQueueBlunders(queueParam);
            const sorted = blunders.slice().sort((a, b) => a.moveIndex - b.moveIndex);
            setGameBlunderList(sorted);
          } catch {
            setGameBlunderList([]);
          }
        })();
```

- [ ] **Step 3: Verify the client builds**

Run (from `connect-four/`): `npx vite build --mode development 2>&1 | tail -5`
Expected: build succeeds (no import/JSX errors). (Alternatively confirm the dev server compiles the file without error in Task 12.)

- [ ] **Step 4: Commit**

```bash
cd connect-four && git add src/screens/ReviewScreen.jsx && git commit -m "feat(client): ReviewScreen fetches anon blunder nav-list by device_uuid"
```

---

## Task 10: `DeepRevealPane` — wire the "1 free" gate

**Files:**
- Modify: `connect-four/src/components/DeepRevealPane.jsx` (imports ~1-11; `!session?.user` short-circuit ~89-92; success `.then` handler)

**Interfaces:**
- Consumes: `canRevealAnon`, `markRevealedAnon` (Task 8).
- Produces: anon's first reveal proceeds and is marked on success; a second, different reveal opens the sign-up modal instead of fetching.

**No unit test** — JSX. Verified in Task 12 QA.

- [ ] **Step 1: Import the gate**

Add to the imports in `connect-four/src/components/DeepRevealPane.jsx`:

```jsx
import { canRevealAnon, markRevealedAnon } from '../lib/anonDeepReveal.js';
```

- [ ] **Step 2: Replace the anon short-circuit**

Replace:

```jsx
    if (!session?.user) {
      setAuthOpen(true);
      return;
    }
```

with:

```jsx
    // Anonymous onboarding user: allow ONE free deep reveal (or re-opening that
    // same one). A second, different reveal opens the sign-up gate instead of
    // fetching. The server permits the anon call (rate-capped); this is the UX gate.
    if (!session?.user) {
      if (!canRevealAnon(`${moveString}:${col}`)) {
        setAuthOpen(true);
        return;
      }
    }
```

- [ ] **Step 3: Mark the free reveal as spent on success**

In the fetch `.then` that receives the parsed response (the one AFTER the `if (res.status === 401)…` / `if (res.status === 429)…` branch that returns `null`), add at the top of the success handler — i.e. where the parsed `data` is used and `data.explanation` is present:

```jsx
        if (data && !session?.user) markRevealedAnon(`${moveString}:${col}`);
```

Place it before `onReveal?.(...)` fires, guarded so it only records a genuine anon success (not a 401/429 `null`).

- [ ] **Step 4: (Sign-up gate copy) confirm the AuthModal messaging**

Check `AuthModal`'s props (`src/components/AuthModal.jsx`). If it accepts a context/message prop, pass the existing deep-reveal-gate copy key (`coach.deepRevealGate`) when opening it from the spent-reveal path so the modal reads "create a free account to unlock more deep reveals". If `AuthModal` has no such prop, leave the default sign-up modal (acceptable — do NOT invent a new prop/API for this; note it as a follow-up). Make the minimal change only.

- [ ] **Step 5: Verify the client builds**

Run (from `connect-four/`): `npx vite build --mode development 2>&1 | tail -5`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
cd connect-four && git add src/components/DeepRevealPane.jsx && git commit -m "feat(client): DeepRevealPane enforces anon 1-free-reveal gate"
```

---

## Task 11: Register new tests and run the fast suite green

**Files:**
- Modify: `connect-four/package.json` (`test`, `test:fast` scripts)

- [ ] **Step 1: Add the two new test files to both scripts**

In `connect-four/package.json`, append `server/anonBlunderAccess.test.mjs` and `tests/unit/anonDeepReveal.test.js` to BOTH the `test` and `test:fast` `node --test …` file lists. (`tests/blunder/insertGameBlunder.test.js` and `server/userEndpoints.test.mjs` are already listed — verify.)

- [ ] **Step 2: Run the fast suite**

Run (from `connect-four/`): `npm run test:fast`
Expected: all tests PASS, including `anonBlunderAccess`, `anonDeepReveal`, the extended `insertGameBlunder`, and the migrate re-association test. Do NOT run `npm test` (solver IPC hang).

- [ ] **Step 3: Commit**

```bash
cd connect-four && git add package.json && git commit -m "test: register anon deep-reveal test files in test/test:fast"
```

---

## Task 12: End-to-end browser QA + grounding verification

**Files:** none (verification only). Uses the app-qa skill.

- [ ] **Step 1: Restart the dev server (no hot-reload) and confirm ports**

The dev server does not hot-reload server code. Restart it, then confirm `3001` (API) and `5173` (Vite) are up (`lsof -ti:3001`, `lsof -ti:5173`). Do not `pkill` a shared server without checking.

- [ ] **Step 2: Reset to a genuine anonymous state**

In a clean/incognito Chrome profile, open the app and use Settings → "Dev: clear IndexedDB & sign out" to reach a true anonymous first-run state (`session === null`). Read memory `project_app_qa_setup_gotchas` first — the QA browser mis-reads board discs and disables autoplay-blocking; trust the DB/network over the rendered discs for board/audio claims.

- [ ] **Step 3: Play the onboarding sparring game to a finish**

Follow the onboarding auto-route → mission → sparring game. Play until game-end so it routes to the review screen. Confirm (network tab) `POST /api/games/analyze` fires and returns per-move quality.

- [ ] **Step 4: Verify anon blunders were written**

Query the DB (per memory `reference_supabase_connection`; `.env` at `server/.env`, `cd connect-four`, `SUPABASE_SERVICE_ROLE_KEY`, parse `.env` manually): confirm `blunders` rows exist for this game with `user_id IS NULL` and `device_uuid = <the client's device_uuid>`. Confirm `GET /api/coach/queue?game_id=<id>&device_uuid=<uuid>` returns them (not 401).

- [ ] **Step 5: Open the ONE free deep reveal and verify grounding**

Click a blunder chip → confirm the URL moves to the blunder detail and the deep reveal renders an explanation. For ≥2 real onboarding blunders, verify the explanation is board-grounded: run `./visualize_board.sh <movestring>` (project root) and, if needed, the reason-engine TOOLS (`TOOLS/compute_feature_vector.mjs`), and confirm every board feature the text names (threats, columns, cells) actually exists in that position. No fabricated claims.

- [ ] **Step 6: Verify the gate on the second reveal**

Navigate to a DIFFERENT blunder (back to review → another chip, or Prev/Next) and trigger its reveal. Confirm the sign-up modal (`AuthModal`) appears instead of a second explanation, and re-opening the FIRST (already-revealed) blunder still shows its explanation for free. Confirm the OI-12 soft/hard timeout behaves (a cold call shows "still thinking…", not an immediate failure).

- [ ] **Step 7: Verify sign-up carryover + normal quota**

Sign up / sign in (dev-skip-auth is fine). Confirm via DB that the game's `blunders` rows now have `user_id = <new account>` and `device_uuid` still set (migrate re-association). Confirm the game + its mistakes appear in Past games, and that a signed-in deep reveal now decrements the normal free-tier quota (`deep_reveal_count`), i.e. anon behavior did not leak into the paid ladder.

- [ ] **Step 8: Log QA results**

Record pass/fail per step (app-qa writes to `agentic_QA.md`). File any residual issues in `docs/open_issues.md` (OI-N) per repo convention, not memory.

---

## Self-Review

**Spec coverage:**
- Design §1 (migration) → Task 1. §2 (write) → Tasks 2, 4. §3 (serving) → Task 5 (queue); `/api/blunders/:id` already public + mark-reviewed already `session`-gated (no task, per verified findings). §4 (explain endpoint) → Task 6. §5 (migrate) → Task 7. §6 (client gate/entry) → Tasks 8, 9, 10. §7 (OI-12) → already implemented; verified in Task 12 Step 6. Testable seams → Tasks 2, 3, 7, 8, 11. QA → Task 12.
- Decision "gate on next click" → Task 10 Step 2. "Blunders only" → unchanged `selectStep` (only stored blunder rows navigate; suboptimal falls to preview) — no task needed, preserved by Task 9 leaving `selectStep` intact. "IP rate-cap, no counter" → Task 6 (existing `makeLimit(5)` + `resolveExplainQuota` skips anon quota).

**Placeholder scan:** No TBD/TODO. Every code step shows full code. Task 10 Step 4 intentionally leaves an implementation-time check on `AuthModal` props with an explicit "make the minimal change only / do not invent an API" instruction — bounded, not a placeholder.

**Type consistency:** `resolveGameBlunderOwner` returns `{user_id, device_uuid}|null` (Tasks 3, 4 agree). `resolveQueueOwner` returns `{ok, scope, userId|deviceUuid}` (Tasks 3, 5 agree). `insertGameBlunder` row gains `device_uuid` (Tasks 2, 4 agree). `canRevealAnon`/`markRevealedAnon` keyed by `` `${moveString}:${col}` `` (Tasks 8, 10 agree). Test-file names match `package.json` registration (Tasks 3, 8, 11).

**Note on Task 6 Step 3:** the exact `req.user.` sites inside `/api/explain-move-llm` must be confirmed against the current file (line numbers drift); the `awk` guard makes the "no bare `req.user.` remains" check mechanical rather than eyeballed.
