# Papergames Blunder Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Write a standalone script that fetches all Connect 4 games for the user from the papergames.io API, runs each user ply through the c4solver, and inserts detected blunders into the Supabase `blunders` table.

**Architecture:** The script follows the pattern of `reprocess_blunders.mjs` — it owns a single solver process, iterates over games sequentially to respect solver IPC, and upserts blunder rows with `ON CONFLICT DO NOTHING` via the existing unique index on `(user_id, board_state, move_played) WHERE puzzle_id IS NULL`. Papergames games are fetched directly from the papergames public API (no local DB needed for game storage).

**Tech Stack:** Node 20+ ESM, `@supabase/supabase-js`, `node-fetch` (or built-in `fetch`), existing `createSolverProcess`, `scoreMove`, `computeBlunderSeverity`, `classify` from the project.

---

## File Structure

| File | Action | Purpose |
|---|---|---|
| `connect-four/server/scripts/import_papergames_blunders.mjs` | **Create** | Main import script |
| _(no other files changed)_ | — | All logic is self-contained in the script |

The script follows the exact pattern of `connect-four/server/scripts/reprocess_blunders.mjs` — no new modules, no new DB tables.

---

## Task 1: Empirically understand the papergames replay API format

**Files:**
- No file changes — this is a research step.

- [ ] **Step 1: Fetch a sample replay from the papergames API**

Run from terminal (no auth required — the API is public):

```bash
curl -s "https://papergames.io/api/room/swrtVlFR5I/replay" | python3 -m json.tool | head -80
```

Expected: JSON object. Note the exact field names for the move list (likely `moves`, `history`, or `actions`), and the format of each move (column number as 1-indexed integer? 0-indexed? string? object?).

- [ ] **Step 2: Check what column numbering the replay uses**

Look at the first move in the returned data. In Connect 4 on papergames, the center column is typically column 4 (1-indexed, range 1–7). Confirm this by cross-referencing with one of the known room replays. Record:
- Field name that holds the list of moves
- Data type of each move entry (integer, string, object)
- Column range (1–7 or 0–6)

- [ ] **Step 3: Fetch the rooms page to confirm pagination fields**

```bash
curl -s "https://papergames.io/api/profile/69e773d36bf9938bffc1509a/rooms?accountId=69e773d36bf9938bffc1509a&start=0&limit=50&gameType=Connect4" | python3 -m json.tool | python3 -c "import sys,json; d=json.load(sys.stdin); print('count:', d['count']); print('first room keys:', list(d['rooms'][0].keys()))"
```

Expected: `count: 775`, and the field names on each room object (confirm `uid` is the replay ID, `players` contains `accountId`, `score`).

- [ ] **Step 4: Document findings**

Write the format summary as a comment block at the top of the script (Task 2 step 1). The comment must answer:
- Field that holds moves in the replay response (e.g., `data.moves`)
- Move encoding (e.g., `{ column: 3 }` where column is 1-indexed)
- How to detect winner from room object (check `players[i].score` — score 1 = won)

---

## Task 2: Write the import script

**Files:**
- Create: `connect-four/server/scripts/import_papergames_blunders.mjs`

The script accepts two required CLI args:
- `--user-id <supabase-uuid>` — the user's Supabase `users.id`
- `--account-id <papergames-id>` — the papergames account ID (default: `69e773d36bf9938bffc1509a`)

Run command:
```bash
node --env-file=connect-four/server/.env connect-four/server/scripts/import_papergames_blunders.mjs \
  --user-id <your-supabase-uuid> \
  --account-id 69e773d36bf9938bffc1509a
```

- [ ] **Step 1: Write the file skeleton with constants and arg parsing**

```js
// import_papergames_blunders.mjs
// Fetch Connect 4 games from papergames.io and import blunders into Supabase.
//
// Usage:
//   node --env-file=connect-four/server/.env \
//     connect-four/server/scripts/import_papergames_blunders.mjs \
//     --user-id <supabase-uuid> \
//     [--account-id <papergames-id>]
//
// Papergames API notes (verified empirically — see Task 1):
//   Rooms:  GET /api/profile/:accountId/rooms?accountId=X&start=N&limit=50&gameType=Connect4
//   Replay: GET /api/room/:uid/replay
//   Move format: <TO BE FILLED IN AFTER TASK 1 STEP 2>

import { createClient } from '@supabase/supabase-js';
import { createSolverProcess } from '../c4solver-wrapper.js';
import { scoreMove, computeBlunderSeverity } from '../moveQualityScorer.js';
import { classify } from '../classifier.js';

const PAPERGAMES_ACCOUNT_ID = '69e773d36bf9938bffc1509a';
const ROOMS_PAGE_SIZE = 50;
const INVALID_MOVE = -1000;
const BLUNDER_SEVERITY_DEPTH = 3;
const EMPTY_BOARD_SCORES = [0, 0, 1, 2, 1, 0, 0];

const VALID_PATTERN_CATEGORIES = new Set([
  'immediate_threat', 'forced_block', 'double_threat', 'forced_win',
  'forbidden_columns', 'z_threat', 'claimeven', 'undercut', 'overcut',
  'figure_7', 'j_shape', 'unknown',
]);

// Parse CLI args
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--user-id') args.userId = argv[i + 1];
    if (argv[i] === '--account-id') args.accountId = argv[i + 1];
  }
  return args;
}

const { userId, accountId = PAPERGAMES_ACCOUNT_ID } = parseArgs(process.argv.slice(2));

if (!userId) {
  console.error('Missing --user-id <supabase-uuid>');
  process.exit(1);
}

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env');
  process.exit(1);
}
```

- [ ] **Step 2: Add the papergames fetch helpers**

Add after the constants:

```js
// Fetch one page of rooms from papergames.
async function fetchRooms(accountId, start) {
  const url = `https://papergames.io/api/profile/${accountId}/rooms?accountId=${accountId}&start=${start}&limit=${ROOMS_PAGE_SIZE}&gameType=Connect4&_t=${Date.now()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetchRooms HTTP ${res.status}`);
  return res.json(); // { rooms: [...], count: number }
}

// Fetch the full replay for a room.
async function fetchReplay(uid) {
  const url = `https://papergames.io/api/room/${uid}/replay?_t=${Date.now()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetchReplay HTTP ${res.status} for uid=${uid}`);
  return res.json();
}

// Extract the move sequence from the replay response.
// Returns a string of 0-indexed column digits, e.g. "3245601".
// UPDATE THIS FUNCTION after Task 1 confirms the actual replay format.
function parseMoves(replayData) {
  // TODO: replace with actual field and conversion after Task 1 step 2.
  // Expected pattern for 1-indexed column format:
  //   replayData.moves.map(m => String(m.column - 1)).join('')
  // Or if 0-indexed:
  //   replayData.moves.map(m => String(m.column)).join('')
  throw new Error('parseMoves: fill in after Task 1 empirical check');
}

// Determine if the user was the first mover (Red) in this room.
// Returns 'first' or 'second'.
function getUserSide(room, accountId) {
  const playerIndex = room.players.findIndex(p => p.accountId === accountId);
  if (playerIndex === -1) throw new Error(`Account ${accountId} not found in room ${room.uid}`);
  return playerIndex === 0 ? 'first' : 'second';
}
```

- [ ] **Step 3: Add the blunder processing function**

This function takes a single game's movestring and the user's side, runs the solver on each user ply, and returns blunder rows to insert.

```js
function computeSeverity(bestScore, score) {
  return Math.round((bestScore - score) / 36 * 10);
}

async function extractBlunders(solver, moveString, side, userId) {
  const toInsert = [];

  for (let i = 0; i < moveString.length; i++) {
    const isUserPly = side === 'first' ? (i % 2 === 0) : (i % 2 === 1);
    if (!isUserPly) continue;

    const movesBefore = moveString.slice(0, i);
    const col = parseInt(moveString[i], 10);

    if (col < 0 || col > 6) continue; // sanity check

    const scores = movesBefore.length === 0
      ? EMPTY_BOARD_SCORES
      : await solver.query(movesBefore);

    const legalCount = scores.filter(s => s !== INVALID_MOVE).length;
    if (legalCount <= 1) continue; // forced move — skip

    const { quality, bestCol } = scoreMove(scores, col);
    if (quality !== 'blunder') continue;

    const score = scores[col];
    const bestScore = scores[bestCol];

    let patternTag = 'unknown';
    try {
      const classifyResult = classify(movesBefore, col, scores);
      const raw = classifyResult?.tag;
      patternTag = raw && VALID_PATTERN_CATEGORIES.has(raw) ? raw : 'unknown';
    } catch (_e) { /* leave unknown */ }

    let severityFraction = null;
    try {
      const postBlunderMs = movesBefore + String(col);
      const sv = await computeBlunderSeverity(solver, postBlunderMs, BLUNDER_SEVERITY_DEPTH);
      severityFraction = sv.severity;
    } catch (_e) { /* leave null */ }

    toInsert.push({
      user_id: userId,
      puzzle_id: null,
      board_state: movesBefore,
      move_played: col,
      correct_move: bestCol,
      pattern_category: patternTag,
      severity: computeSeverity(bestScore, score),
      blunder_severity: severityFraction,
    });
  }

  return toInsert;
}
```

- [ ] **Step 4: Write the main function**

```js
async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const solver = createSolverProcess();

  // ── Paginate through all rooms ───────────────────────────────────────────────
  console.log(`Fetching all rooms for account ${accountId}...`);
  const allRooms = [];
  let start = 0;
  let total = null;

  do {
    const { rooms, count } = await fetchRooms(accountId, start);
    if (total === null) { total = count; console.log(`Total games: ${total}`); }
    allRooms.push(...rooms);
    start += rooms.length;
    // Polite rate limit: 200ms between pages
    if (start < total) await new Promise(r => setTimeout(r, 200));
  } while (start < total);

  console.log(`Fetched ${allRooms.length} room headers.`);

  // ── Process each room ────────────────────────────────────────────────────────
  let totalBlunders = 0;
  let totalInserted = 0;
  let skippedNoMoves = 0;
  let skippedErrors = 0;

  for (let g = 0; g < allRooms.length; g++) {
    const room = allRooms[g];
    process.stderr.write(`\r[${g + 1}/${allRooms.length}] room ${room.uid}  blunders: ${totalBlunders}`);

    let replayData;
    try {
      replayData = await fetchReplay(room.uid);
    } catch (e) {
      process.stderr.write(`\nSkipping ${room.uid}: ${e.message}\n`);
      skippedErrors++;
      continue;
    }

    let moveString;
    try {
      moveString = parseMoves(replayData);
    } catch (e) {
      process.stderr.write(`\nSkipping ${room.uid} (parse error): ${e.message}\n`);
      skippedErrors++;
      continue;
    }

    if (!moveString || moveString.length === 0) { skippedNoMoves++; continue; }

    const side = getUserSide(room, accountId);

    let toInsert;
    try {
      toInsert = await extractBlunders(solver, moveString, side, userId);
    } catch (e) {
      process.stderr.write(`\nSolver error on ${room.uid}: ${e.message}\n`);
      skippedErrors++;
      continue;
    }

    totalBlunders += toInsert.length;

    if (toInsert.length > 0) {
      // ON CONFLICT DO NOTHING uses unique index idx_blunders_game_unique:
      // UNIQUE (user_id, board_state, move_played) WHERE puzzle_id IS NULL
      const { error } = await supabase
        .from('blunders')
        .upsert(toInsert, { onConflict: 'user_id,board_state,move_played', ignoreDuplicates: true });
      if (error) {
        process.stderr.write(`\nInsert error for ${room.uid}: ${error.message}\n`);
      } else {
        totalInserted += toInsert.length;
      }
    }

    // Polite delay between games to avoid hammering papergames API
    await new Promise(r => setTimeout(r, 100));
  }

  solver.destroy();
  process.stderr.write('\n');
  console.log(`Done.`);
  console.log(`  Rooms processed  : ${allRooms.length}`);
  console.log(`  Blunders found   : ${totalBlunders}`);
  console.log(`  Blunders inserted: ${totalInserted}`);
  console.log(`  Skipped (no moves): ${skippedNoMoves}`);
  console.log(`  Skipped (errors)  : ${skippedErrors}`);
}

main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 5: Fill in `parseMoves` from Task 1 findings**

After completing Task 1 step 2, return to the `parseMoves` function and replace the placeholder with the real implementation. Common cases:

If replay returns `{ moves: [{ column: 4 }, { column: 3 }, ...] }` (1-indexed):
```js
function parseMoves(replayData) {
  return replayData.moves.map(m => String(m.column - 1)).join('');
}
```

If replay returns `{ moves: [4, 3, ...] }` (1-indexed integers):
```js
function parseMoves(replayData) {
  return replayData.moves.map(m => String(m - 1)).join('');
}
```

If replay returns `{ history: [...] }` or another field name — adapt accordingly.

- [ ] **Step 6: Commit the script**

```bash
git add connect-four/server/scripts/import_papergames_blunders.mjs
git commit -m "feat: add papergames blunder import script"
```

---

## Task 3: Dry-run on a single game to verify correctness

**Files:**
- No changes — this is a validation step.

- [ ] **Step 1: Get your Supabase user UUID**

Run:
```bash
node --env-file=connect-four/server/.env -e "
  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data } = await sb.from('users').select('id').limit(5);
  console.log(data);
"
```

Or look it up from your auth email in the Supabase dashboard.

- [ ] **Step 2: Test against the single known room uid `swrtVlFR5I`**

Temporarily add a flag `--single-room swrtVlFR5I` to the script (or just hardcode a filter in `main` for one pass), run it, and inspect the output:

```bash
node --env-file=connect-four/server/.env \
  connect-four/server/scripts/import_papergames_blunders.mjs \
  --user-id <your-supabase-uuid>
```

Check: the solver output is sane (severity values between 0–1, pattern tags are valid strings).

- [ ] **Step 3: Verify a blunder row in Supabase**

```bash
node --env-file=connect-four/server/.env -e "
  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data } = await sb.from('blunders')
    .select('board_state, move_played, correct_move, pattern_category, severity, blunder_severity')
    .is('puzzle_id', null)
    .order('created_at', { ascending: false })
    .limit(5);
  console.log(JSON.stringify(data, null, 2));
"
```

Expected: 5 rows with non-null `board_state`, valid 0-indexed `move_played` (0–6), `severity` 0–10.

- [ ] **Step 4: Visualize one blunder to confirm correctness**

Take the `board_state` from one of the inserted rows and run:

```bash
./visualize_board.sh <board_state>
```

Confirm that the board is a legal game position (not garbage), and that the solver's `scr` row in the output shows a meaningfully better score for `correct_move` than `move_played`.

---

## Task 4: Full import run

**Files:**
- No changes.

- [ ] **Step 1: Run the full import**

```bash
node --env-file=connect-four/server/.env \
  connect-four/server/scripts/import_papergames_blunders.mjs \
  --user-id <your-supabase-uuid> \
  --account-id 69e773d36bf9938bffc1509a \
  2>&1 | tee /tmp/papergames_import.log
```

Expected runtime: ~775 games × ~(3–5s solver time per user ply per game) = estimate 30–60 minutes for the full run. Let it complete.

- [ ] **Step 2: Check summary stats**

```bash
tail -10 /tmp/papergames_import.log
```

Expected: non-zero blunders inserted, errors close to 0.

- [ ] **Step 3: Verify in DB**

```bash
node --env-file=connect-four/server/.env -e "
  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data } = await sb.from('blunders')
    .select('pattern_category')
    .is('puzzle_id', null)
    .not('pattern_category', 'is', null);
  const counts = {};
  for (const r of data) counts[r.pattern_category] = (counts[r.pattern_category] || 0) + 1;
  console.log(counts);
"
```

Expected: a breakdown by category. `unknown` will dominate (positions outside recognized patterns), but you should see non-zero `immediate_threat`, `forced_block`, etc.
