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

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import { spawnSync } from 'child_process';
import { Board, getImmediateThreats } from '../classifier.js';
import { explainSimulate } from '../explainSimulate.js';
import { createSolverProcess } from '../c4solver-wrapper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const EMPTY_BOARD_SCORES = [0, 0, 1, 2, 1, 0, 0];
const ROWS = 6;
const PATTERN_NAMES = [
  'double_threat', 'j_shape', 'figure_7', 'claimeven',
  'baseclaim', 'before', 'specialbefore',
  'undercut', 'overcut', 'z_threat', 'forced_win',
];

// Maps each pattern name to a KB article slug under docs/knowledge-base/,
// or to an inline string for patterns that have no dedicated KB entry.
// Only entries for patterns that appear in the delta table are loaded at runtime.
const PATTERN_KB = {
  double_threat:  { inline: 'A double threat (or fork) occurs when a player creates two simultaneous winning threats in a single move that the opponent cannot both block. The two threats may be in different columns (the opponent can only play one column per turn) or in adjacent rows of the same column (T1: adjacent threats win unconditionally). The double-threat move is decisive because it guarantees a win on the very next move.' },
  j_shape:        { id: 'allen-j-configuration' },
  figure_7:       { id: 'community-figure-7' },
  claimeven:      { id: 'allis-claimeven' },
  baseclaim:      { id: 'allis-baseclaim' },
  before:         { id: 'allis-before' },
  specialbefore:  { id: 'allis-specialbefore' },
  undercut:       { id: 'allen-t2' },
  overcut:        { id: 'community-overcut' },
  z_threat:       { id: 'community-z-threat' },
  forced_win:     { inline: 'A forced win (here: forced loss for the current player) occurs when the opponent has established a winning sequence that cannot be stopped by any legal move. In the simulation context, a forced_win leaf means that at this position the player to move is already in a losing position — all legal moves allow the opponent to maintain their winning advantage. Its presence in the pattern comparison indicates that one move leads into these unavoidable-loss positions more often than the other.' },
};

const KB_DIR = join(__dirname, '../../../docs/knowledge-base');

/**
 * Extracts the `statement` field from a KB article's YAML frontmatter.
 * Parses the block scalar (`statement: |`) without a YAML library.
 * Returns null if the file cannot be read or the field is missing.
 */
function loadKBStatement(id) {
  try {
    const text = readFileSync(join(KB_DIR, `${id}.md`), 'utf8');
    // Extract frontmatter block (between the first two `---` lines)
    const fmMatch = text.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) return null;
    const fm = fmMatch[1];

    // Find `statement: |` and collect the following indented lines
    const lines = fm.split('\n');
    let inStatement = false;
    const statementLines = [];
    for (const line of lines) {
      if (!inStatement) {
        if (/^statement:\s*\|/.test(line)) { inStatement = true; }
        continue;
      }
      // A non-indented non-empty line signals the next top-level key
      if (line.length > 0 && !/^\s/.test(line)) break;
      statementLines.push(line.replace(/^  /, '')); // strip exactly 2-space indent
    }
    return statementLines.join('\n').trim() || null;
  } catch {
    return null;
  }
}

/**
 * Builds a "## Pattern definitions" section for patterns that appear in the
 * delta table. Only loads KB content for the patterns in `patternNames`.
 */
function buildKBSection(patternNames) {
  const entries = [];
  for (const name of patternNames) {
    const kb = PATTERN_KB[name];
    if (!kb) continue;
    let statement;
    if (kb.inline) {
      statement = kb.inline;
    } else {
      statement = loadKBStatement(kb.id);
      if (!statement) continue;
    }
    entries.push(`### ${name}\n${statement}`);
  }
  if (entries.length === 0) return '';
  return `## Pattern definitions\n\n${entries.join('\n\n')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Solver helpers
// ─────────────────────────────────────────────────────────────────────────────

async function getScores(solver, movestring) {
  if (movestring === '') return EMPTY_BOARD_SCORES;
  return solver.query(movestring);
}

// ─────────────────────────────────────────────────────────────────────────────
// Contrast move selection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns { contrastCol, isOptimal } or null if all legal scores are equal
 * (no meaningful contrast exists).
 *
 * scores: 7-element array relative to current player at the GIVEN position.
 * For contrast selection we need scores at `movestring` (before user's move),
 * relative to the user.
 *
 * isOptimal = true  → user played a best move; contrast = second-best
 * isOptimal = false → user played suboptimally; contrast = best move
 */
function selectContrastMove(scores, userCol, board) {
  const legalCols = [0, 1, 2, 3, 4, 5, 6].filter(c => board.colHeights[c] < ROWS);
  const legalScores = legalCols.map(c => scores[c]);

  const allEqual = legalScores.every(s => s === legalScores[0]);
  if (allEqual) return null;

  const bestScore = Math.max(...legalScores);
  const bestCols = legalCols.filter(c => scores[c] === bestScore);
  const userScore = scores[userCol];

  function centerMost(cols) {
    return [...cols].sort((a, b) => Math.abs(a - 3) - Math.abs(b - 3))[0];
  }

  if (userScore === bestScore) {
    // User played optimally — find second-best
    const secondBestScore = Math.max(...legalScores.filter(s => s < bestScore));
    if (!isFinite(secondBestScore)) return null; // only one distinct score
    const secondBestCols = legalCols.filter(c => scores[c] === secondBestScore);
    return { contrastCol: centerMost(secondBestCols), isOptimal: true };
  } else {
    // User played suboptimally — best move is the contrast
    return { contrastCol: centerMost(bestCols), isOptimal: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Delta table
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compare user move patterns vs contrast move patterns.
 * Returns { rows, insufficientTacticalData }.
 *
 * Each row: { name, userRatio, contrastRatio, delta, userTop2, contrastTop2 }
 * where Top2 is a short string of the top-2 histogram entries.
 */
function computeDeltaTable(userPatterns, contrastPatterns) {
  function top2String(entry) {
    const h = entry.cellHistogram ?? entry.colHistogram;
    if (!h || Object.keys(h).length === 0) return '';
    return Object.entries(h)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([k, v]) => `${k}×${v}`)
      .join(' ');
  }

  const rows = [];
  for (const name of PATTERN_NAMES) {
    const u = userPatterns[name];
    const c = contrastPatterns[name];
    if (!u || !c) continue;
    const userRatio = u.ratio;
    const contrastRatio = c.ratio;
    if (Math.max(userRatio, contrastRatio) <= 0) continue;
    rows.push({
      name,
      userRatio,
      contrastRatio,
      delta: Math.abs(userRatio - contrastRatio),
      userTop2: top2String(u),
      contrastTop2: top2String(c),
    });
  }
  rows.sort((a, b) => b.delta - a.delta);
  return { rows, insufficientTacticalData: rows.length === 0 };
}

// ─────────────────────────────────────────────────────────────────────────────
// Board visualization (captured from visualize_board.mjs)
// ─────────────────────────────────────────────────────────────────────────────

function getBoardVisualization(movestring) {
  const vizScript = join(__dirname, 'visualize_board.mjs');
  const result = spawnSync(process.execPath, [vizScript, movestring], {
    encoding: 'utf8',
    env: process.env,
  });
  if (result.status !== 0 || result.error) {
    return '[Board visualization unavailable]';
  }
  // Strip the solver scores row so the LLM reasons from tactical patterns only.
  const lines = result.stdout.split('\n').filter(l => !l.trimStart().startsWith('scr'));
  return lines.join('\n').trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Prompt builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true if the cell (col, row) is a major threat for `threatPlayer`
 * in the given board position (before the move is made).
 * A major threat = 3 discs of that player + 1 empty in some 4-window that
 * includes this cell.
 */
function isMajorThreatForPlayer(board, col, row, threatPlayer) {
  const COLS = 7;
  const ROWS = 6;
  const directions = [[1,0],[0,1],[1,1],[1,-1]];
  for (const [dc, dr] of directions) {
    for (let offset = -3; offset <= 0; offset++) {
      let playerCount = 0;
      let emptyCount = 0;
      let containsTarget = false;
      for (let step = 0; step < 4; step++) {
        const c = col + (offset + step) * dc;
        const r = row + (offset + step) * dr;
        if (c < 0 || c >= COLS || r < 0 || r >= ROWS) { playerCount = -1; break; }
        if (c === col && r === row) { containsTarget = true; emptyCount++; continue; }
        const cell = board.board[r][c];
        if (cell === threatPlayer) playerCount++;
        else if (cell === 0) emptyCount++;
        else { playerCount = -1; break; }
      }
      if (playerCount === 3 && emptyCount === 1 && containsTarget) return true;
    }
  }
  return false;
}

/**
 * Builds the full LLM prompt string.
 *
 * All column references shown to the LLM are 1-indexed (col+1).
 * Solver scores are intentionally excluded so the LLM reasons from
 * human-readable tactical patterns and KB definitions only.
 *
 * `perspective` is passed explicitly so the prompt names the player
 * who made the move — the board visualization shows the post-move board
 * with "Next: <opponent>" which would otherwise mislead the LLM.
 */
function buildPrompt({ preBoardViz, boardViz, userCol, contrastCol, isOptimal,
                        deltaRows, insufficientTacticalData, allLinesDecided,
                        rounds, totalLeaves, userOutcomes, contrastOutcomes,
                        kbSection, perspective,
                        forcedBlockNote, blunderNote }) {
  const playerName = perspective === 1 ? 'Red' : 'Yellow';
  const opponentName = perspective === 1 ? 'Yellow' : 'Red';

  // Outcome summary line (shown above the pattern table)
  function outcomeStr(outcomes) {
    const parts = [];
    if (outcomes.winRate  > 0) parts.push(`wins ${(outcomes.winRate  * 100).toFixed(0)}%`);
    if (outcomes.lossRate > 0) parts.push(`loses ${(outcomes.lossRate * 100).toFixed(0)}%`);
    if (outcomes.drawRate > 0) parts.push(`draws ${(outcomes.drawRate * 100).toFixed(0)}%`);
    return parts.length > 0 ? parts.join(', ') : 'no decisive lines';
  }
  const outcomeLine =
    `${playerName} (user move col ${userCol + 1}): ${outcomeStr(userOutcomes)} | ` +
    `${playerName} (contrast col ${contrastCol + 1}): ${outcomeStr(contrastOutcomes)}`;

  // Pattern table
  let patternSection;
  if (allLinesDecided) {
    patternSection =
      `All ${totalLeaves} simulated lines are decided before the depth limit — ` +
      `no open positions remain for ${playerName} to analyze tactically.\n` +
      outcomeLine;
  } else if (insufficientTacticalData) {
    patternSection =
      `No tactical patterns detected across ${userOutcomes.perspectiveLeaves} open leaf positions.\n` +
      outcomeLine;
  } else {
    const header = `${'PATTERN'.padEnd(18)} ${'USER'.padStart(6)} ${'CONTRAST'.padStart(9)} ${'ΔRATIO'.padStart(8)}  USER_TOP2           CONTRAST_TOP2`;
    const sep = '-'.repeat(header.length);
    const tableRows = deltaRows.map(r => {
      const n = r.name.padEnd(18);
      const ur = r.userRatio.toFixed(2).padStart(6);
      const cr = r.contrastRatio.toFixed(2).padStart(9);
      const d = r.delta.toFixed(2).padStart(8);
      const u2 = (r.userTop2 || '—').padEnd(20);
      const c2 = r.contrastTop2 || '—';
      return `${n} ${ur} ${cr} ${d}  ${u2} ${c2}`;
    });
    patternSection = [outcomeLine, header, sep, ...tableRows].join('\n');
  }

  const moveQualityDesc = isOptimal
    ? `a strong move`
    : `a weaker move than col ${contrastCol + 1}`;

  return `## Role
You are an expert Connect Four coach. Your goal is to give a grounded, concise explanation of why a specific move is ${isOptimal ? 'strong' : 'weak'}.

## Move context
**${playerName}** just played **col ${userCol + 1}**. The boards below show the position before and after this move; it is now ${opponentName}'s turn. All pattern data and your explanation must be from **${playerName}'s perspective**.
${forcedBlockNote ? `\n⚠️ ${forcedBlockNote}\n` : ''}${blunderNote ? `\n${blunderNote}\n` : ''}

## Board position (BEFORE ${playerName} plays col ${userCol + 1})
${preBoardViz}

## Board position (AFTER ${playerName} plays col ${userCol + 1})
${boardViz}

## Pattern comparison (${rounds} round${rounds !== 1 ? 's' : ''} of optimal play, ${totalLeaves} total leaves / ${userOutcomes.perspectiveLeaves} perspective-to-move samples)
${patternSection}
${kbSection ? '\n' + kbSection + '\n' : ''}
## Task
Explain in 2–4 sentences why col ${userCol + 1} is ${moveQualityDesc} for **${playerName}**.
Ground your explanation in the tactical patterns and their definitions above. If no pattern data is available, say so honestly and give only a high-level observation from the board position.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// LLM call
// ─────────────────────────────────────────────────────────────────────────────

async function callLLM(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set in environment');
  if (!model) throw new Error('OPENAI_MODEL not set in environment');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_completion_tokens: 300,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${body}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
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

    // 2. Select contrast move
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
    const preBoardViz = getBoardVisualization(rawMoves || '');
    const boardViz = getBoardVisualization(postMove);

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

    // 6. Build prompt (solver scores intentionally excluded — see buildPrompt)
    // Load KB definitions only for patterns that appear in the delta table.
    const activePatterns = deltaRows.map(r => r.name);
    const kbSection = buildKBSection(activePatterns);

    const prompt = buildPrompt({
      preBoardViz,
      boardViz,
      userCol,
      contrastCol,
      isOptimal,
      deltaRows,
      insufficientTacticalData,
      allLinesDecided,
      rounds,
      totalLeaves: userResult.totalLeaves,
      userOutcomes: userResult.outcomes,
      contrastOutcomes: contrastResult.outcomes,
      kbSection,
      perspective,
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
    console.log(boardViz);

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
