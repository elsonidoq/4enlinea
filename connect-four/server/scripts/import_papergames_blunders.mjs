// import_papergames_blunders.mjs
// Fetch Connect 4 games from papergames.io, import games into papergames_games,
// and import blunders into blunders (linked via papergames_game_id).
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
//           replayData.game.actions[0].userId = accountId of the first player
//           replayData.outcome.winnerAccountId — null on draw
//           replayData.outcome.finishReason — e.g. 'connect4', 'time-up'
//           replayData.durationMs — total game duration in ms

import { createClient } from '@supabase/supabase-js';
import { classify, tagBlunder } from '../classifier.js';
import { createSolverProcess } from '../c4solver-wrapper.js';
import { scoreMove, computeBlunderSeverity } from '../moveQualityScorer.js';
import { VALID_BLUNDER_TAGS } from '../blunderTags.js';

const PAPERGAMES_ACCOUNT_ID = '69e773d36bf9938bffc1509a';
const ROOMS_PAGE_SIZE = 50;
const INVALID_MOVE = -1000;
const BLUNDER_SEVERITY_DEPTH = 3;
const EMPTY_BOARD_SCORES = [0, 0, 1, 2, 1, 0, 0];

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
  const firstAction = replayData.game.actions[0];
  if (!firstAction) throw new Error('No actions in replay');
  return firstAction.userId === accountId ? 'first' : 'second';
}

function getOpponent(replayData, accountId) {
  return replayData.players.find(p => p.accountId !== accountId) ?? null;
}

function getResult(replayData, accountId) {
  const winnerId = replayData.game?.outcome?.winnerAccountId ?? null;
  if (!winnerId) return 'draw';
  return winnerId === accountId ? 'win' : 'loss';
}

function buildGameRow(room, replayData, accountId, userId, side) {
  const opponent = getOpponent(replayData, accountId);
  return {
    user_id: userId,
    papergames_room_uid: room.uid,
    papergames_account_id: accountId,
    moves: parseMoves(replayData),
    side,
    result: getResult(replayData, accountId),
    opponent_name: opponent?.name ?? 'Unknown',
    opponent_account_id: opponent?.accountId ?? '',
    opponent_avatar: opponent?.avatar ?? null,
    opponent_country_code: opponent?.countryCode ?? null,
    opponent_elo: opponent?.eloRating != null ? Math.round(opponent.eloRating) : null,
    finish_reason: replayData.game?.outcome?.finishReason ?? null,
    duration_ms: replayData.durationMs ?? null,
    tournament_uid: replayData.tournamentUid ?? null,
    played_at: room.createdAt,
  };
}

function computeSeverity(bestScore, score) {
  return Math.round((bestScore - score) / 36 * 10);
}

// Returns { blunders, accuracy } where accuracy is 0–100 or null if no scored plies.
// papergamesGameId is NOT set here — caller stamps it onto blunders before inserting.
async function extractBlunders(solver, moveString, side, userId) {
  const toInsert = [];
  let scored = 0, optimalCount = 0;
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
    if (legalCount <= 1) continue; // forced move — skip accuracy + blunder scoring
    scored++;
    const { quality, bestCol } = scoreMove(scores, col);
    if (quality === 'optimal') { optimalCount++; continue; }
    if (quality !== 'blunder') continue;
    const score = scores[col];
    const bestScore = scores[bestCol];
    let patternTag = 'suboptimal_move';
    let reason = 'solver error: tagBlunder failed';
    let direction = 'missed_own';
    try {
      const result = await tagBlunder(movesBefore, col, bestCol, solver);
      patternTag = VALID_BLUNDER_TAGS.has(result.tag) ? result.tag : 'suboptimal_move';
      reason = result.reason;
      direction = result.direction;
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
      reason,
      direction,
      severity: computeSeverity(bestScore, score),
      blunder_severity: severityFraction,
    });
  }
  const accuracy = scored > 0 ? Math.round(optimalCount / scored * 100) : null;
  return { blunders: toInsert, accuracy };
}

async function upsertGame(supabase, gameRow) {
  const { data, error } = await supabase
    .from('papergames_games')
    .upsert(gameRow, { onConflict: 'papergames_room_uid', ignoreDuplicates: false })
    .select('id')
    .single();
  if (error) throw new Error(`upsertGame ${gameRow.papergames_room_uid}: ${error.message}`);
  return data.id;
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

    // Run solver analysis first so accuracy is available for the game row.
    let blunders, accuracy;
    try {
      ({ blunders, accuracy } = await extractBlunders(solver, moveString, side, userId));
    } catch (e) {
      process.stderr.write(`\nSolver error ${room.uid}: ${e.message}\n`);
      skippedErrors++; continue;
    }

    let papergamesGameId;
    try {
      const gameRow = { ...buildGameRow(room, replayData, accountId, userId, side), accuracy };
      papergamesGameId = await upsertGame(supabase, gameRow);
    } catch (e) {
      process.stderr.write(`\nGame upsert error ${room.uid}: ${e.message}\n`);
      skippedErrors++; continue;
    }

    // Stamp the game ID onto each blunder now that we have it.
    const toInsert = blunders.map(b => ({ ...b, papergames_game_id: papergamesGameId }));
    totalBlunders += toInsert.length;

    if (toInsert.length > 0) {
      const { error } = await supabase
        .from('blunders')
        .insert(toInsert);
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
