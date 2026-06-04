// import_papergames_blunders.mjs
// Fetch Connect 4 games from papergames.io and import blunders into Supabase.
//
// Usage:
//   node --env-file=connect-four/server/.env \
//     connect-four/server/scripts/import_papergames_blunders.mjs \
//     --user-id <supabase-uuid> \
//     [--account-id <papergames-id>]
//
// Papergames API (verified 2026-06-04):
//   Rooms:  GET /api/profile/:id/rooms?accountId=X&start=N&limit=50&gameType=Connect4
//           Response: { rooms: [...], count: number }
//   Replay: GET /api/room/:uid/replay
//           game.actions[i].action.x = 0-indexed column (0–6, no adjustment needed)
//           replayData.players[j].symbol = 'circle-dark' (first) | 'circle-light' (second)

import { createClient } from '@supabase/supabase-js';
import { classify } from '../classifier.js';
import { createSolverProcess } from '../c4solver-wrapper.js';
import { scoreMove, computeBlunderSeverity } from '../moveQualityScorer.js';

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

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--user-id') args.userId = argv[i + 1];
    if (argv[i] === '--account-id') args.accountId = argv[i + 1];
    if (argv[i] === '--limit') args.limit = parseInt(argv[i + 1], 10);
  }
  return args;
}

const { userId, accountId = PAPERGAMES_ACCOUNT_ID } = parseArgs(process.argv.slice(2));
if (!userId) { console.error('Missing --user-id <supabase-uuid>'); process.exit(1); }
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) { console.error('Missing env vars'); process.exit(1); }

async function fetchWithTimeout(url, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchRooms(accountId, start) {
  const url = `https://papergames.io/api/profile/${accountId}/rooms?accountId=${accountId}&start=${start}&limit=${ROOMS_PAGE_SIZE}&gameType=Connect4&_t=${Date.now()}`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`fetchRooms HTTP ${res.status}`);
  return res.json();
}

async function fetchReplay(uid) {
  const url = `https://papergames.io/api/room/${uid}/replay?_t=${Date.now()}`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`fetchReplay HTTP ${res.status} uid=${uid}`);
  return res.json();
}

function parseMoves(replayData) {
  return replayData.game.actions.map(a => String(a.action.x)).join('');
}

function getUserSide(replayData, accountId) {
  const p = replayData.players.find(p => p.accountId === accountId);
  if (!p) throw new Error(`accountId ${accountId} not in replay`);
  return p.symbol === 'circle-dark' ? 'first' : 'second';
}

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
    if (col < 0 || col > 6) continue;
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
      const r = classify(movesBefore, col, scores);
      const raw = r?.tag;
      patternTag = raw && VALID_PATTERN_CATEGORIES.has(raw) ? raw : 'unknown';
    } catch (_e) {}
    let severityFraction = null;
    try {
      const sv = await computeBlunderSeverity(solver, movesBefore + String(col), BLUNDER_SEVERITY_DEPTH);
      severityFraction = sv.severity;
    } catch (_e) {}
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

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const solver = createSolverProcess();

  console.log(`Fetching rooms for account ${accountId}...`);
  const allRooms = [];
  let start = 0;
  let total = null;
  do {
    const { rooms, count } = await fetchRooms(accountId, start);
    if (total === null) { total = count; console.log(`Total games: ${total}`); }
    if (rooms.length === 0) break; // guard: API returned empty page — stop pagination
    allRooms.push(...rooms);
    start += rooms.length;
    process.stderr.write(`\r  Fetched ${allRooms.length}/${total} room headers...`);
    if (start < total) await new Promise(r => setTimeout(r, 200));
  } while (start < total);
  process.stderr.write('\n');
  console.log(`Fetched ${allRooms.length} room headers.`);

  const { limit } = parseArgs(process.argv.slice(2));
  const roomsToProcess = limit ? allRooms.slice(0, limit) : allRooms;
  if (limit) console.log(`Limiting to ${roomsToProcess.length} rooms (--limit ${limit}).`);

  let totalBlunders = 0, totalInserted = 0, skippedNoMoves = 0, skippedErrors = 0;

  for (let g = 0; g < roomsToProcess.length; g++) {
    const room = roomsToProcess[g];
    process.stderr.write(`\r[${g + 1}/${roomsToProcess.length}] uid=${room.uid}  blunders=${totalBlunders}`);

    let replayData;
    try { replayData = await fetchReplay(room.uid); }
    catch (e) { process.stderr.write(`\nSkip ${room.uid}: ${e.message}\n`); skippedErrors++; continue; }

    let moveString, side;
    try {
      moveString = parseMoves(replayData);
      side = getUserSide(replayData, accountId);
    } catch (e) {
      process.stderr.write(`\nParse error ${room.uid}: ${e.message}\n`);
      skippedErrors++; continue;
    }

    if (!moveString || moveString.length === 0) { skippedNoMoves++; continue; }

    let toInsert;
    try { toInsert = await extractBlunders(solver, moveString, side, userId); }
    catch (e) {
      process.stderr.write(`\nSolver error ${room.uid}: ${e.message}\n`);
      skippedErrors++; continue;
    }

    totalBlunders += toInsert.length;

    if (toInsert.length > 0) {
      const { error } = await supabase
        .from('blunders')
        .upsert(toInsert, { onConflict: 'user_id,board_state,move_played', ignoreDuplicates: true });
      if (error) {
        process.stderr.write(`\nInsert error ${room.uid}: ${error.message}\n`);
      } else {
        totalInserted += toInsert.length;
      }
    }

    await new Promise(r => setTimeout(r, 100));
  }

  solver.destroy();
  process.stderr.write('\n');
  console.log(`Done.`);
  console.log(`  Rooms processed   : ${roomsToProcess.length}`);
  console.log(`  Blunders found    : ${totalBlunders}`);
  console.log(`  Blunders inserted : ${totalInserted}`);
  console.log(`  Skipped (no moves): ${skippedNoMoves}`);
  console.log(`  Skipped (errors)  : ${skippedErrors}`);
}

main().catch(e => { console.error(e); process.exit(1); });
