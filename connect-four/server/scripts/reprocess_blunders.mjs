// Reprocess all game blunders from scratch.
// Fetches every game row (AI sparring + papergames), re-runs the solver over
// each user ply, deletes all existing game blunders (puzzle_id IS NULL), then
// inserts fresh rows for both suboptimal and blunder plies.
//
// Run from project root:
//   node --env-file=connect-four/server/.env connect-four/server/scripts/reprocess_blunders.mjs

import { createClient } from '@supabase/supabase-js';
import { tagBlunder, NotABlunderError } from '../classifier.js';
import { createSolverProcess } from '../c4solver-wrapper.js';
import { scoreMove, computeBlunderSeverity } from '../moveQualityScorer.js';
import { VALID_BLUNDER_TAGS } from '../blunderTags.js';
import { logError } from '../logger.js';

const EMPTY_BOARD_SCORES = [0, 0, 1, 2, 1, 0, 0];
const INVALID_MOVE = -1000;
const BLUNDER_SEVERITY_DEPTH = 3;

function computeSeverity(bestScore, score) {
  return Math.round((bestScore - score) / 36 * 10);
}

async function processGames(supabase, solver, games, { isPapergames }) {
  let totalInserted = 0;
  let skippedNoUser = 0;

  for (let g = 0; g < games.length; g++) {
    const game = games[g];
    const { user_id, moves, side } = game;

    if (!user_id) { skippedNoUser++; continue; }

    process.stderr.write(
      `\r[${g + 1}/${games.length}] ${isPapergames ? 'papergames' : 'ai'} game ${g + 1}  inserted so far: ${totalInserted}`
    );

    const toInsert = [];

    for (let i = 0; i < moves.length; i++) {
      const isUserPly = side === 'first' ? (i % 2 === 0) : (i % 2 === 1);
      if (!isUserPly) continue;

      const movesBeforeThisPly = moves.slice(0, i);
      const col = parseInt(moves[i], 10);

      const scores = movesBeforeThisPly.length === 0
        ? EMPTY_BOARD_SCORES
        : await solver.query(movesBeforeThisPly);

      const legalCount = scores.filter(s => s !== INVALID_MOVE).length;
      if (legalCount <= 1) continue; // forced move — skip

      const { quality, bestCol } = scoreMove(scores, col);
      if (quality === 'optimal') continue;

      const score = scores[col];
      const bestScore = scores[bestCol];

      let patternTag = 'suboptimal_move';
      let reason = 'solver error: tagBlunder failed';
      let direction = 'missed_own';
      try {
        const result = await tagBlunder(movesBeforeThisPly, col, bestCol, solver);
        patternTag = VALID_BLUNDER_TAGS.has(result.tag) ? result.tag : 'suboptimal_move';
        reason = result.reason;
        direction = result.direction;
      } catch (_e) {
        if (_e instanceof NotABlunderError) {
          // Terminal position flagged as a mistake — never record it as a blunder.
          logError('[reprocess/NotABlunderError]', _e);
          continue;
        }
        logError('[reprocess/tagBlunder]', _e); /* leave fallback values */
      }

      let severityFraction = null;
      try {
        const postMistakeMs = movesBeforeThisPly + String(col);
        const sv = await computeBlunderSeverity(solver, postMistakeMs, BLUNDER_SEVERITY_DEPTH);
        severityFraction = sv.severity;
      } catch (_e) { logError('[reprocess/computeBlunderSeverity]', _e); /* leave null */ }

      toInsert.push({
        user_id,
        puzzle_id: null,
        board_state: movesBeforeThisPly,
        move_index: movesBeforeThisPly.length,
        move_played: col,
        correct_move: bestCol,
        pattern_category: patternTag,
        quality,
        reason,
        direction,
        severity: computeSeverity(bestScore, score),
        blunder_severity: severityFraction,
        game_id: isPapergames ? null : game.id,
        papergames_game_id: isPapergames ? game.id : null,
      });
    }

    if (toInsert.length > 0) {
      const { error: insertError } = await supabase.from('blunders').insert(toInsert);
      if (insertError) {
        console.error(`\nFailed to insert blunders for game ${game.id}:`, insertError.message);
      } else {
        totalInserted += toInsert.length;
      }
    }
  }

  process.stderr.write('\n');
  return { totalInserted, skippedNoUser };
}

async function main() {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const solver = createSolverProcess();

  // ── Fetch all games ──────────────────────────────────────────────────────────
  console.log('Fetching AI sparring games...');
  const { data: aiGames, error: aiError } = await supabase
    .from('games')
    .select('id, user_id, moves, side');
  if (aiError) { console.error('Failed to fetch games:', aiError.message); process.exit(1); }
  console.log(`  ${aiGames.length} AI games.`);

  console.log('Fetching papergames...');
  const { data: pgGames, error: pgError } = await supabase
    .from('papergames_games')
    .select('id, user_id, moves, side');
  if (pgError) { console.error('Failed to fetch papergames_games:', pgError.message); process.exit(1); }
  console.log(`  ${pgGames.length} papergames.`);

  // ── Delete all existing game blunders ────────────────────────────────────────
  console.log('Deleting existing game blunders (puzzle_id IS NULL)...');
  const { error: deleteError } = await supabase
    .from('blunders')
    .delete()
    .is('puzzle_id', null);
  if (deleteError) { console.error('Failed to delete blunders:', deleteError.message); process.exit(1); }
  console.log('Deleted.');

  // ── Reprocess AI games ───────────────────────────────────────────────────────
  console.log('\nProcessing AI sparring games...');
  const aiResult = await processGames(supabase, solver, aiGames, { isPapergames: false });

  // ── Reprocess papergames ─────────────────────────────────────────────────────
  console.log('\nProcessing papergames...');
  const pgResult = await processGames(supabase, solver, pgGames, { isPapergames: true });

  solver.destroy();

  console.log('\nDone.');
  console.log(`  AI games   — inserted: ${aiResult.totalInserted}  anonymous skipped: ${aiResult.skippedNoUser}`);
  console.log(`  Papergames — inserted: ${pgResult.totalInserted}  anonymous skipped: ${pgResult.skippedNoUser}`);
}

main().catch(e => { console.error(e); process.exit(1); });
