/**
 * Fetches llm_feedback rows for explain_move_llm, visualizes each board,
 * then re-runs the explain-move pipeline so you can compare the new output
 * against the stored (problematic) response.
 *
 * Usage:
 *   ./review_feedback.sh [--feature <name>] [--limit <n>]
 *
 * Defaults: feature=explain_move_llm, limit=10
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in connect-four/server/.env
 * (loaded via --env-file in the shell wrapper).
 */

import { createClient } from '@supabase/supabase-js';
import { Board, getImmediateThreats } from '../classifier.js';
import { explainSimulate } from '../explainSimulate.js';
import { createSolverProcess } from '../c4solver-wrapper.js';
import {
  getBoardVisualization, callLLM, buildKBSection,
  isMajorThreatForPlayer,
  selectContrastMove, computeDeltaTable, buildExplainPrompt,
  getPositionTier,
} from '../llmCoachHelpers.js';

const EMPTY_BOARD_SCORES = [0, 0, 1, 2, 1, 0, 0];
const ROWS = 6;

// ─── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
let feature = 'explain_move_llm';
let limit = 10;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--feature' && args[i + 1]) feature = args[++i];
  if (args[i] === '--limit'   && args[i + 1]) limit   = parseInt(args[++i], 10);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extracts the 0-indexed column from the stored llm_prompt.
 * The prompt always contains "**<Player>** just played **col N**" (1-indexed).
 * Returns null if not found.
 */
function extractColFromPrompt(llmPrompt) {
  const m = llmPrompt.match(/just played \*\*col (\d+)\*\*/);
  if (!m) return null;
  return parseInt(m[1], 10) - 1; // convert to 0-indexed
}

function divider(char = '─', width = 72) {
  return char.repeat(width);
}

async function runExplain(solver, movestring, userCol) {
  const board = new Board(movestring);
  if (board.colHeights[userCol] >= ROWS) {
    return { error: `col ${userCol} is full` };
  }

  const perspective = movestring.length % 2 === 0 ? 1 : 2;
  const playerName  = perspective === 1 ? 'Red' : 'Yellow';
  const postMove    = movestring + userCol;
  const rounds      = 1;
  const numPlies    = 2 * rounds + 1;

  const preScores = movestring.length === 0
    ? EMPTY_BOARD_SCORES
    : await solver.query(movestring);

  const positionTier = getPositionTier(preScores, board);
  const contrast     = selectContrastMove(preScores, userCol, board);
  if (!contrast) return { error: 'all moves equally scored — no contrast available' };

  const { contrastCol, isOptimal } = contrast;
  const anchorRow         = board.colHeights[userCol];
  const contrastAnchorRow = board.colHeights[contrastCol];

  const [userResult, contrastResult] = await Promise.all([
    explainSimulate(postMove, numPlies, { col: userCol, row: anchorRow }, perspective, solver),
    explainSimulate(movestring + contrastCol, numPlies, { col: contrastCol, row: contrastAnchorRow }, perspective, solver),
  ]);

  const { rows: deltaRows, insufficientTacticalData } =
    computeDeltaTable(userResult.patterns, contrastResult.patterns);
  const allLinesDecided = userResult.outcomes.perspectiveLeaves === 0;

  const boardViz     = getBoardVisualization(movestring || '');
  const postBoardViz = getBoardVisualization(postMove);

  const opponentPlayer = perspective === 1 ? 2 : 1;
  const opponentName   = perspective === 1 ? 'Yellow' : 'Red';

  const forcedBlock     = isMajorThreatForPlayer(board, userCol, anchorRow, opponentPlayer);
  const forcedBlockNote = forcedBlock
    ? `Before this move, ${opponentName} had an immediate winning threat at col ${userCol + 1} row ${anchorRow + 1}. ${playerName} playing col ${userCol + 1} was a forced block — without it, ${opponentName} would have won on the very next move.`
    : null;

  const postBoard      = new Board(postMove);
  const opponentWinCols = getImmediateThreats(postBoard.board, postBoard.colHeights, opponentPlayer);
  const blunderNote = opponentWinCols.length > 0
    ? `⚠️ After ${playerName} plays col ${userCol + 1}, ${opponentName} can immediately win by playing col${opponentWinCols.length > 1 ? 's' : ''} ${opponentWinCols.map(c => c + 1).join(' or ')}. This move is a blunder.`
    : null;

  const kbSection = buildKBSection(deltaRows.map(r => r.name));

  const userExamplesByPattern = {};
  for (const [name, entry] of Object.entries(userResult.patterns)) {
    if (entry.examples?.length > 0) userExamplesByPattern[name] = entry.examples;
  }

  const prompt = buildExplainPrompt({
    boardViz, postBoardViz, userCol, contrastCol, isOptimal,
    positionTier, deltaRows, insufficientTacticalData, allLinesDecided,
    rounds, totalLeaves: userResult.totalLeaves,
    userOutcomes: userResult.outcomes,
    contrastOutcomes: contrastResult.outcomes,
    kbSection, playerName, forcedBlockNote, blunderNote,
    userExamplesByPattern,
  });

  const explanation = await callLLM(prompt);

  return { prompt, explanation, postBoardViz, playerName, userCol, contrastCol, isOptimal };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    process.exit(1);
  }
  if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_MODEL) {
    console.error('Error: OPENAI_API_KEY and OPENAI_MODEL must be set');
    process.exit(1);
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const { data: rows, error } = await supabase
    .from('llm_feedback')
    .select('id, movestring, llm_prompt, llm_response, human_note, feature, created_at')
    .eq('feature', feature)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Supabase error:', error.message);
    process.exit(1);
  }
  if (!rows || rows.length === 0) {
    console.log(`No feedback rows found for feature="${feature}".`);
    return;
  }

  console.log(`\nFound ${rows.length} feedback row(s) for feature="${feature}"\n`);

  const solver = createSolverProcess();

  try {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const userCol = extractColFromPrompt(row.llm_prompt);

      console.log(divider('═'));
      console.log(`  [${i + 1}/${rows.length}]  id: ${row.id}`);
      console.log(`  created_at : ${row.created_at}`);
      console.log(`  movestring : ${row.movestring || '(opening)'}`);
      console.log(`  col played : ${userCol !== null ? `${userCol + 1} (1-indexed) / ${userCol} (0-indexed)` : 'UNKNOWN — could not parse from prompt'}`);
      console.log(`  human_note : ${row.human_note}`);
      console.log(divider('═'));

      // Board visualization (post-move board)
      if (userCol !== null) {
        const postMove = row.movestring + userCol;
        console.log('\n  Board AFTER the move:\n');
        console.log(getBoardVisualization(postMove));
      } else {
        console.log('\n  Board (pre-move, col unknown):\n');
        console.log(getBoardVisualization(row.movestring || ''));
      }

      // Stored LLM response
      console.log(`\n${divider('─')}`);
      console.log('  STORED LLM RESPONSE (what was flagged)');
      console.log(divider('─'));
      console.log(row.llm_response);

      // Re-run the pipeline
      if (userCol === null) {
        console.log('\n  [skipping re-run — col could not be determined from prompt]\n');
        continue;
      }

      console.log(`\n${divider('─')}`);
      console.log('  RE-RUNNING EXPLAIN PIPELINE …');
      console.log(divider('─'));

      let result;
      try {
        result = await runExplain(solver, row.movestring, userCol);
      } catch (err) {
        console.log(`  Error during re-run: ${err.message}\n`);
        continue;
      }

      if (result.error) {
        console.log(`  Skipped: ${result.error}\n`);
        continue;
      }

      console.log('\n  NEW LLM RESPONSE');
      console.log(divider('─'));
      console.log(result.explanation);
      console.log('');
    }
  } finally {
    solver.destroy();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
