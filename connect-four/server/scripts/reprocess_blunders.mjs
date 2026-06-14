// Reprocess all game blunders from scratch.
// Fetches every game row, re-runs the solver over each user ply, deletes all
// existing game blunders (puzzle_id IS NULL), then inserts fresh rows.
//
// Run from project root:
//   node --env-file=connect-four/server/.env connect-four/server/scripts/reprocess_blunders.mjs

import { createClient } from '@supabase/supabase-js';
import { classify, tagBlunder } from '../classifier.js';
import { createSolverProcess } from '../c4solver-wrapper.js';
import { scoreMove, computeBlunderSeverity } from '../moveQualityScorer.js';
import { VALID_BLUNDER_TAGS } from '../blunderTags.js';

const EMPTY_BOARD_SCORES = [0, 0, 1, 2, 1, 0, 0];
const INVALID_MOVE = -1000;
const BLUNDER_SEVERITY_DEPTH = 3;

function computeSeverity(bestScore, score) {
  return Math.round((bestScore - score) / 36 * 10);
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
  console.log('Fetching games...');
  const { data: games, error: gamesError } = await supabase
    .from('games')
    .select('id, user_id, moves, side');

  if (gamesError) { console.error('Failed to fetch games:', gamesError.message); process.exit(1); }
  console.log(`Fetched ${games.length} games.`);

  // ── Delete all existing game blunders ────────────────────────────────────────
  console.log('Deleting existing game blunders (puzzle_id IS NULL)...');
  const { error: deleteError } = await supabase
    .from('blunders')
    .delete()
    .is('puzzle_id', null);

  if (deleteError) { console.error('Failed to delete blunders:', deleteError.message); process.exit(1); }
  console.log('Deleted.');

  // ── Reprocess ────────────────────────────────────────────────────────────────
  let totalBlunders = 0;
  let skippedNoUser = 0;

  for (let g = 0; g < games.length; g++) {
    const { user_id, moves, side } = games[g];

    if (!user_id) { skippedNoUser++; continue; }

    process.stderr.write(`\r[${g + 1}/${games.length}] game ${g + 1}  blunders so far: ${totalBlunders}`);

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
      if (quality !== 'blunder') continue;

      const score = scores[col];
      const bestScore = scores[bestCol];

      // Blunders from losing positions are no longer skipped — blunder_severity
      // provides the graduated measure. A drop from -2 to -15 is a meaningful
      // blunder even if the position was already theoretically lost.

      let patternTag = 'suboptimal_move';
      let reason = 'solver error: tagBlunder failed';
      let direction = 'missed_own';
      try {
        const result = await tagBlunder(movesBeforeThisPly, col, bestCol, solver);
        patternTag = VALID_BLUNDER_TAGS.has(result.tag) ? result.tag : 'suboptimal_move';
        reason = result.reason;
        direction = result.direction;
      } catch (_e) { /* leave fallback values */ }

      let severityFraction = null;
      try {
        const postBlunderMs = movesBeforeThisPly + String(col);
        const sv = await computeBlunderSeverity(solver, postBlunderMs, BLUNDER_SEVERITY_DEPTH);
        severityFraction = sv.severity;
      } catch (_e) { /* leave null */ }

      toInsert.push({
        user_id,
        puzzle_id: null,
        board_state: movesBeforeThisPly,
        move_played: col,
        correct_move: bestCol,
        pattern_category: patternTag,
        reason,
        direction,
        severity: computeSeverity(bestScore, score),
        // blunder_severity stores the tree-scan fraction (0–1); null if scan failed.
        // This column may not exist yet — the insert will succeed anyway since
        // Supabase ignores unknown keys only if the column is missing from the schema.
        // Add a migration (ALTER TABLE blunders ADD COLUMN blunder_severity real)
        // before relying on this field.
        blunder_severity: severityFraction,
      });
    }

    if (toInsert.length > 0) {
      const { error: insertError } = await supabase.from('blunders').insert(toInsert);
      if (insertError) {
        console.error(`\nFailed to insert blunders for game ${games[g].id}:`, insertError.message);
      } else {
        totalBlunders += toInsert.length;
      }
    }
  }

  solver.destroy();
  process.stderr.write('\n');
  console.log(`Done.`);
  console.log(`  Blunders inserted : ${totalBlunders}`);
  console.log(`  Anonymous games skipped: ${skippedNoUser}`);
}

main().catch(e => { console.error(e); process.exit(1); });
