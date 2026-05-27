/**
 * CLI PoC: LLM-grounded natural-language explanation of a Connect Four move.
 *
 * Usage:
 *   ./explain_move.sh <movestring> <col> [rounds=1]
 *
 *   movestring  — position BEFORE the user's move (0-indexed column digits, or "" for opening)
 *   col         — 0-indexed column the user played
 *   rounds      — simulation depth (default 1); numPlies = 2*rounds+1
 *
 * Requires OPENAI_API_KEY and OPENAI_MODEL in connect-four/server/.env
 * (loaded via --env-file in the shell wrapper; no dotenv needed).
 *
 * Output order:
 *   1. Board + scores summary (from visualize_board.mjs)
 *   2. Full LLM prompt (delimited)
 *   3. LLM response
 */

import { Board, getImmediateThreats } from '../classifier.js';
import { explainSimulate } from '../explainSimulate.js';
import { createSolverProcess } from '../c4solver-wrapper.js';
import {
  getBoardVisualization, callLLM, buildKBSection,
  isMajorThreatForPlayer,
  selectContrastMove, computeDeltaTable, buildExplainPrompt,
  getPositionTier,
} from '../llmCoachHelpers.js';

const ROWS = 6;
const EMPTY_BOARD_SCORES = [0, 0, 1, 2, 1, 0, 0];

// ─────────────────────────────────────────────────────────────────────────────
// Solver helpers
// ─────────────────────────────────────────────────────────────────────────────

async function getScores(solver, movestring) {
  if (movestring === '') return EMPTY_BOARD_SCORES;
  return solver.query(movestring);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const [,, rawMoves = '', rawCol, rawRounds = '1'] = process.argv;

  // Parse col
  const userCol = parseInt(rawCol, 10);
  if (isNaN(userCol) || userCol < 0 || userCol > 6) {
    console.error('Error: col must be 0–6');
    process.exit(1);
  }

  // Parse rounds
  const rounds = parseInt(rawRounds, 10);
  if (isNaN(rounds) || rounds < 1) {
    console.error('Error: rounds must be a positive integer');
    process.exit(1);
  }
  const numPlies = 2 * rounds + 1;

  // Validate movestring and col legality
  if (!/^[0-6]{0,42}$/.test(rawMoves)) {
    console.error('Error: movestring must be 0–42 digits in range 0–6');
    process.exit(1);
  }

  let board;
  try {
    board = new Board(rawMoves);
  } catch (e) {
    console.error(`Error parsing movestring: ${e.message}`);
    process.exit(1);
  }

  if (board.colHeights[userCol] >= ROWS) {
    console.error(`Error: col ${userCol} is full — cannot play there`);
    process.exit(1);
  }

  // Perspective = user's player (who plays at even-length positions = player 1)
  const perspective = rawMoves.length % 2 === 0 ? 1 : 2;
  const playerName = perspective === 1 ? 'Red' : 'Yellow';
  const postMove = rawMoves + userCol;

  const solver = createSolverProcess();

  try {
    // 1. Get pre-move scores (user's perspective) for contrast selection
    const preScores = await getScores(solver, rawMoves);

    // 2. Derive position tier and select contrast move
    const positionTier = getPositionTier(preScores, board);
    const contrast = selectContrastMove(preScores, userCol, board);
    if (contrast === null) {
      console.log('All legal moves have equal solver scores; no meaningful contrast available.');
      return;
    }
    const { contrastCol, isOptimal } = contrast;
    const contrastPostMove = rawMoves + contrastCol;

    // 3. Run explainSimulate concurrently for user move and contrast move
    const anchorRow = board.colHeights[userCol];
    const anchorCell = { col: userCol, row: anchorRow };
    const contrastAnchorRow = board.colHeights[contrastCol];
    const contrastAnchorCell = { col: contrastCol, row: contrastAnchorRow };

    const [userResult, contrastResult] = await Promise.all([
      explainSimulate(postMove, numPlies, anchorCell, perspective, solver),
      explainSimulate(contrastPostMove, numPlies, contrastAnchorCell, perspective, solver),
    ]);

    // 4. Compute delta table
    const { rows: deltaRows, insufficientTacticalData } =
      computeDeltaTable(userResult.patterns, contrastResult.patterns);
    const allLinesDecided = userResult.outcomes.perspectiveLeaves === 0;

    // 5. Board visualizations (pre-move and post-move)
    const boardViz = getBoardVisualization(rawMoves || '');
    const postBoardViz = getBoardVisualization(postMove);

    // Detect forced block: did the played cell carry a major threat for the opponent?
    const opponentPlayer = perspective === 1 ? 2 : 1;
    const playedRow = board.colHeights[userCol]; // row where the disc lands (0-indexed)
    const forcedBlock = isMajorThreatForPlayer(board, userCol, playedRow, opponentPlayer);
    const opponentName = perspective === 1 ? 'Yellow' : 'Red';
    const forcedBlockNote = forcedBlock
      ? `Before this move, ${opponentName} had an immediate winning threat at col ${userCol + 1} row ${playedRow + 1}. ${playerName} playing col ${userCol + 1} was a forced block — without it, ${opponentName} would have won on the very next move.`
      : null;

    // Detect blunder: does the played move give the opponent an immediate win?
    const postBoard = new Board(postMove);
    const opponentWinCols = getImmediateThreats(postBoard.board, postBoard.colHeights, opponentPlayer);
    const blunderNote = opponentWinCols.length > 0
      ? `⚠️ After ${playerName} plays col ${userCol + 1}, ${opponentName} can immediately win by playing col${opponentWinCols.length > 1 ? 's' : ''} ${opponentWinCols.map(c => c + 1).join(' or ')}. This move is a blunder — it hands ${opponentName} a free win on the very next move.`
      : null;

    // 6. Build prompt (solver scores intentionally excluded — see buildExplainPrompt)
    const activePatterns = deltaRows.map(r => r.name);
    const kbSection = buildKBSection(activePatterns);

    const prompt = buildExplainPrompt({
      boardViz,
      postBoardViz,
      userCol,
      contrastCol,
      isOptimal,
      positionTier,
      deltaRows,
      insufficientTacticalData,
      allLinesDecided,
      rounds,
      totalLeaves: userResult.totalLeaves,
      userOutcomes: userResult.outcomes,
      contrastOutcomes: contrastResult.outcomes,
      kbSection,
      playerName,
      forcedBlockNote,
      blunderNote,
    });

    // 7. Print board summary, prompt, and call LLM
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`  Position: ${rawMoves || '(opening)'}`);
    console.log(`  Player:   ${playerName} (player ${perspective})`);
    console.log(`  Move:     col ${userCol + 1} (0-indexed: ${userCol}) — ${isOptimal ? 'OPTIMAL' : 'SUBOPTIMAL'}`);
    console.log(`  Contrast: col ${contrastCol + 1} (0-indexed: ${contrastCol})`);
    console.log(`${'═'.repeat(70)}\n`);
    console.log(postBoardViz);

    console.log(`\n${'─'.repeat(70)}`);
    console.log('  PROMPT');
    console.log(`${'─'.repeat(70)}\n`);
    console.log(prompt);

    console.log(`\n${'─'.repeat(70)}`);
    console.log('  LLM RESPONSE');
    console.log(`${'─'.repeat(70)}\n`);
    const response = await callLLM(prompt);
    console.log(response);
    console.log('');

  } finally {
    solver.destroy();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
