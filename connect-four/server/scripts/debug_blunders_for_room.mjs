// debug_blunders_for_room.mjs
// Fetch a single room replay and run blunder extraction without writing to the DB.
//
// Usage:
//   node --env-file=connect-four/server/.env \
//     connect-four/server/scripts/debug_blunders_for_room.mjs \
//     --room-uid <uid> \
//     [--account-id <papergames-id>]

import { tagBlunder } from '../classifier.js';
import { createSolverProcess } from '../c4solver-wrapper.js';
import { scoreMove, computeBlunderSeverity } from '../moveQualityScorer.js';
import { VALID_BLUNDER_TAGS } from '../blunderTags.js';

const PAPERGAMES_ACCOUNT_ID = '69e773d36bf9938bffc1509a';
const INVALID_MOVE = -1000;
const BLUNDER_SEVERITY_DEPTH = 3;
const EMPTY_BOARD_SCORES = [0, 0, 1, 2, 1, 0, 0];

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--room-uid') args.roomUid = argv[i + 1];
    if (argv[i] === '--account-id') args.accountId = argv[i + 1];
  }
  return args;
}

const { roomUid, accountId = PAPERGAMES_ACCOUNT_ID } = parseArgs(process.argv.slice(2));
if (!roomUid) { console.error('Missing --room-uid <uid>'); process.exit(1); }

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

function computeSeverity(bestScore, score) {
  return Math.round((bestScore - score) / 36 * 10);
}

async function extractBlunders(solver, moveString, side) {
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
    if (legalCount <= 1) {
      console.log(`  ply ${i}: forced move (col ${col}), skipping`);
      continue;
    }
    scored++;
    const { quality, bestCol } = scoreMove(scores, col);
    console.log(`  ply ${i}: col=${col} scores=${JSON.stringify(scores)} quality=${quality} bestCol=${bestCol}`);
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
    } catch (e) {
      console.warn(`    tagBlunder failed: ${e.message}`);
    }
    let severityFraction = null;
    try {
      const sv = await computeBlunderSeverity(solver, movesBefore + String(col), BLUNDER_SEVERITY_DEPTH);
      severityFraction = sv.severity;
    } catch (e) {
      console.warn(`    computeBlunderSeverity failed: ${e.message}`);
    }
    toInsert.push({
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
  return { blunders: toInsert, accuracy, scored, optimalCount };
}

async function main() {
  const solver = createSolverProcess();

  console.log(`Fetching replay for room ${roomUid}...`);
  const replayData = await fetchReplay(roomUid);

  const moveString = parseMoves(replayData);
  const side = getUserSide(replayData, accountId);
  console.log(`moves: ${moveString}`);
  console.log(`side:  ${side} (account ${accountId})`);
  console.log(`total plies: ${moveString.length}, user plies: ${moveString.length % 2 === 0 ? moveString.length / 2 : side === 'first' ? Math.ceil(moveString.length / 2) : Math.floor(moveString.length / 2)}`);
  console.log('');
  console.log('--- per-ply analysis ---');

  const { blunders, accuracy, scored, optimalCount } = await extractBlunders(solver, moveString, side);

  solver.destroy();

  console.log('');
  console.log('--- results ---');
  console.log(`scored plies : ${scored}`);
  console.log(`optimal      : ${optimalCount}`);
  console.log(`blunders     : ${blunders.length}`);
  console.log(`accuracy     : ${accuracy ?? 'n/a'}`);
  if (blunders.length > 0) {
    console.log('');
    console.log('blunder list:');
    for (const b of blunders) {
      console.log(`  ply ${b.board_state.length}: col=${b.move_played} best=${b.correct_move} tag=${b.pattern_category} dir=${b.direction} sev=${b.severity} blunder_sev=${b.blunder_severity}`);
      console.log(`    reason: ${b.reason}`);
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
