// Debug tool: fetch all blunders, print raw board + solver scores + severity breakdown.
// Run from project root: node --env-file=connect-four/server/.env connect-four/server/scripts/debug_blunder_severity.mjs
import { parseBoardState, checkWin } from '../classifier.js';
import { createSolverProcess } from '../c4solver-wrapper.js';
import { createClient } from '@supabase/supabase-js';

const ROWS = 6;
const COLS = 7;
const EMPTY_BOARD_SCORES = [0, 0, 1, 2, 1, 0, 0];

const SEVERITY_LEVELS = [
  { min: 0, max: 0,  label: 'none (legacy/unknown)' },
  { min: 1, max: 3,  label: 'Minor'    },
  { min: 4, max: 6,  label: 'Moderate' },
  { min: 7, max: 10, label: 'Critical' },
];

function severityLabel(s) {
  return SEVERITY_LEVELS.find(l => s >= l.min && s <= l.max)?.label ?? '?';
}

function rawBoard(board) {
  const lines = [];
  lines.push('     ' + Array.from({ length: COLS }, (_, i) => `  ${i + 1} `).join(''));
  for (let row = ROWS - 1; row >= 0; row--) {
    const cells = board[row].map(v => v === 1 ? ' R ' : v === 2 ? ' Y ' : '   ').join('|');
    lines.push(`  ${row + 1}  |${cells}|`);
  }
  return lines.join('\n');
}

function scoresRow(scores, colHeights) {
  const cells = scores.map((s, c) =>
    colHeights[c] >= ROWS ? '  -- ' : ' ' + String(s).padStart(3) + ' '
  ).join('|');
  return ` scr |${cells}|`;
}

async function main() {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: blunders, error } = await supabase
    .from('blunders')
    .select('id, board_state, move_played, correct_move, pattern_category, severity, created_at')
    .order('severity', { ascending: false })
    .limit(100);

  if (error) { console.error('DB error:', error.message); process.exit(1); }
  if (!blunders?.length) { console.log('No blunders found.'); return; }

  const solver = createSolverProcess();

  for (const b of blunders) {
    const moves = b.board_state || '';
    const { board, colHeights } = parseBoardState(moves);

    let gameOver = false;
    if (moves.length > 0) {
      const lastCol = parseInt(moves[moves.length - 1], 10);
      const lastRow = colHeights[lastCol] - 1;
      const lastPlayer = moves.length % 2 === 1 ? 1 : 2;
      gameOver = checkWin(board, lastRow, lastCol, lastPlayer);
    }

    let scores = null;
    if (!gameOver) {
      try {
        scores = moves.length === 0 ? EMPTY_BOARD_SCORES : await solver.query(moves);
      } catch {
        scores = null;
      }
    }

    const bestScore = scores ? Math.max(...scores.filter(s => s > -1000)) : null;
    const playedScore = scores ? scores[b.move_played] : null;
    const rawDiff = (bestScore !== null && playedScore !== null) ? bestScore - playedScore : null;
    const expectedSeverity = rawDiff !== null ? Math.round(rawDiff / 36 * 10) : null;

    console.log('═'.repeat(60));
    console.log(`ID:       ${b.id}`);
    console.log(`Category: ${b.pattern_category}   Created: ${b.created_at?.slice(0, 10)}`);
    console.log(`Played:   col ${b.move_played}   Correct: col ${b.correct_move}`);
    console.log(`Severity: ${b.severity} (${severityLabel(b.severity)})`);
    if (expectedSeverity !== null) {
      console.log(`Expected: ${expectedSeverity}  [best=${bestScore} played=${playedScore} diff=${rawDiff} → round(${rawDiff}/36*10)]`);
    } else {
      console.log(`Expected: n/a (game over or solver unavailable)`);
    }
    console.log('');
    console.log(rawBoard(board));
    if (scores) {
      console.log('');
      console.log(scoresRow(scores, colHeights));
      const colHeader = '     ' + Array.from({ length: COLS }, (_, i) => `  ${i + 1} `).join('');
      console.log(colHeader.replace('     ', ' col '));
    }
    console.log('');
  }

  solver.destroy();
}

main().catch(e => { console.error(e); process.exit(1); });
