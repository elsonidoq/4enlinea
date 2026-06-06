/**
 * Shared helpers for LLM coaching endpoints.
 *
 * Extracted from scripts/recommend_next_move.mjs so the server endpoint
 * (index.js) and the CLI PoC both use the same pure functions.
 *
 * All column-to-LLM conversions use 1-indexed display; internal logic stays 0-indexed.
 * Solver scores are NEVER passed to the LLM — tier labels only.
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import { spawnSync } from 'child_process';
import { Board, getImmediateThreats, detectFigure7, detectJShape } from './classifier.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const KB_DIR = join(__dirname, '../../docs/knowledge-base');

// Score tier ordering for table sort (lower index = better for current player)
export const TIER_ORDER = {
  'IMMEDIATE WIN':  0,
  'WINS':           1,
  'DRAWS':          2,
  'LOSES':          3,
  'IMMEDIATE LOSS': 4,
};

// Placeholder outcomes for IMMEDIATE WIN columns — we skip explainSimulate for
// these because the game ends on the very next move and c4solver rejects positions
// reached through a winning alignment (it would error on the children).
export const IMMEDIATE_WIN_OUTCOMES = {
  total: 1, wonByPerspective: 1, wonByOpponent: 0, draws: 0,
  perspectiveLeaves: 0, winRate: 1, lossRate: 0, drawRate: 0,
};

// User-facing display names for internal pattern labels.
// Internal names are used for KB lookups; display names appear in LLM prompts.
const PATTERN_DISPLAY = {
  forced_win: 'losing_position',
};

function displayName(name) {
  return PATTERN_DISPLAY[name] ?? name;
}

// Maps each pattern name to a KB article slug under docs/knowledge-base/,
// or to an inline string for patterns that have no dedicated KB entry.
// Only entries for patterns with ratio > 0 in any column are loaded at runtime.
export const PATTERN_KB = {
  double_threat:  { inline: 'A double threat (or fork) occurs when a player creates two simultaneous winning threats in a single move that the opponent cannot both block. The two threats may be in different columns (the opponent can only play one column per turn) or in adjacent rows of the same column (T1: adjacent threats win unconditionally). The double-threat move is decisive because it guarantees a win on the very next move.' },
  immediate_threat: { inline: 'An immediate threat is a move that creates four-in-a-row on the very next turn. When a player has three discs in a row with an open space at either end, that space is their winning cell. Immediate threats are decisive because they end the game before the opponent can respond.' },
  j_shape:        { id: 'allen-j-configuration' },
  figure_7:       { id: 'community-figure-7' },
  forced_block: { inline: 'A forced block occurs when the opponent has an immediate winning threat and only a specific set of columns can neutralise it. All other legal moves leave the threat unanswered and lose immediately. Blocking a forced threat is the only legal good move.' },
  claimeven:      { id: 'allis-claimeven' },
  claimodd:       { id: 'community-claimodd' },
  baseclaim:      { id: 'allis-baseclaim' },
  before:         { id: 'allis-before' },
  specialbefore:  { id: 'allis-specialbefore' },
  undercut:       { id: 'allen-t2' },
  overcut:        { id: 'community-overcut' },
  z_threat:       { id: 'community-z-threat' },
  forced_win:     { id: 'derived-lost-position' },
  odd_even_threat: { inline: 'An odd-even threat position occurs when Red has two candidate moves each creating an immediate threat, but one lands on an odd row (rows 0, 2, or 4 — Red\'s natural parity) and the other on an even row. The odd-row threat is strategically superior because Yellow\'s claimeven strategy cannot neutralise threats on odd rows. Red must always prefer the odd-row threat move.' },
};

/**
 * Extracts the `statement` field from a KB article's YAML frontmatter.
 * Returns null if the file cannot be read or the field is missing.
 */
export function loadKBStatement(id) {
  try {
    const text = readFileSync(join(KB_DIR, `${id}.md`), 'utf8');
    const fmMatch = text.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) return null;
    const fm = fmMatch[1];
    const lines = fm.split('\n');
    let inStatement = false;
    const statementLines = [];
    for (const line of lines) {
      if (!inStatement) {
        if (/^statement:\s*\|/.test(line)) { inStatement = true; }
        continue;
      }
      if (line.length > 0 && !/^\s/.test(line)) break;
      statementLines.push(line.replace(/^  /, ''));
    }
    return statementLines.join('\n').trim() || null;
  } catch {
    return null;
  }
}

/**
 * Builds a "## Pattern definitions" section for the given pattern names.
 * Only loads KB content for patterns that have a KB entry.
 */
export function buildKBSection(patternNames) {
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
    entries.push(`### ${displayName(name)}\n${statement}`);
  }
  if (entries.length === 0) return '';
  return `## Pattern definitions\n\n${entries.join('\n\n')}`;
}

/**
 * Runs visualize_board.mjs for the given movestring and strips the solver scores
 * row (scr) so the LLM reasons from tactical patterns only.
 */
export function getBoardVisualization(movestring) {
  const vizScript = join(__dirname, 'scripts/visualize_board.mjs');
  const result = spawnSync(process.execPath, [vizScript, movestring], {
    encoding: 'utf8',
    env: process.env,
  });
  if (result.status !== 0 || result.error) {
    return '[Board visualization unavailable]';
  }
  const lines = result.stdout.split('\n').filter(l => !l.trimStart().startsWith('scr'));
  return lines.join('\n').trim();
}

/**
 * Calls the OpenAI chat completions API and returns the assistant message content.
 * Reads OPENAI_API_KEY and OPENAI_MODEL from process.env.
 */
export async function callLLM(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model  = process.env.OPENAI_MODEL;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set in environment');
  if (!model)  throw new Error('OPENAI_MODEL not set in environment');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_completion_tokens: 400,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${body}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

/**
 * Classifies a column into a score tier.
 *
 * IMPORTANT: IMMEDIATE WIN and IMMEDIATE LOSS are determined by board logic
 * (Sets passed in), NOT by solver scores. Solver scores have false positives
 * at these boundaries: in forced-win terminal positions all opponent scores
 * are identical (flat), and immediateWinScore has an off-by-1 for odd moveCount.
 * See memory: reference_cat5_forced_block_detection.
 */
export function getScoreTier(col, score, immediateWinSet, immediateLossSet) {
  if (immediateWinSet.has(col))  return 'IMMEDIATE WIN';
  if (immediateLossSet.has(col)) return 'IMMEDIATE LOSS';
  if (score > 0)   return 'WINS';
  if (score === 0) return 'DRAWS';
  return 'LOSES';
}

/**
 * Returns true if the cell (col, row) is a major threat for `threatPlayer`
 * in the given board position — i.e., 3 discs of that player + 1 empty
 * in some 4-window containing this cell.
 *
 * Not exported from classifier.js — this is the canonical location for server use.
 */
export function isMajorThreatForPlayer(board, col, row, threatPlayer) {
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
 * Builds the per-column flat table string for the LLM prompt.
 *
 * Layout (one row per pattern per column, outcomes shown on first row only):
 *   COL  TIER           OUTCOMES                 PATTERN            RATIO  TOP2
 *   4    WINS           win 85% draw 10% loss 5% z_threat            0.42  col3r4×18 col3r2×12
 *                                                j_shape             0.28  col3r3×9
 *
 * Columns with no non-zero patterns show a single placeholder row.
 * Immediate-win columns skip pattern data (simulation tree is a single terminal leaf).
 */
export function buildFlatTable(colData, rounds) {
  function outcomeStr(outcomes) {
    const parts = [];
    if (outcomes.winRate  > 0) parts.push(`win ${(outcomes.winRate  * 100).toFixed(0)}%`);
    if (outcomes.drawRate > 0) parts.push(`draw ${(outcomes.drawRate * 100).toFixed(0)}%`);
    if (outcomes.lossRate > 0) parts.push(`loss ${(outcomes.lossRate * 100).toFixed(0)}%`);
    return parts.length > 0 ? parts.join(' ') : '—';
  }

  function top2String(entry) {
    const h = entry.cellHistogram ?? entry.colHistogram;
    if (!h || Object.keys(h).length === 0) return '';
    return Object.entries(h)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([k, v]) => `${k}×${v}`)
      .join(' ');
  }

  const COL_W      = 4;
  const TIER_W     = 14;
  const OUTCOME_W  = 24;
  const PATTERN_W  = 18;
  const RATIO_W    = 6;

  const header =
    `${'COL'.padEnd(COL_W)} ${'TIER'.padEnd(TIER_W)} ${'OUTCOMES'.padEnd(OUTCOME_W)} ` +
    `${'PATTERN'.padEnd(PATTERN_W)} ${'RATIO'.padStart(RATIO_W)}  TOP2`;
  const sep = '-'.repeat(header.length);

  const rows = [header, sep];
  const blankPrefix = ' '.repeat(COL_W + 1 + TIER_W + 1 + OUTCOME_W + 1);

  for (const { col, tier, outcomes, patterns } of colData) {
    const colStr     = String(col + 1).padEnd(COL_W);       // 1-indexed for LLM
    const tierStr    = tier.padEnd(TIER_W);
    const outStr     = outcomeStr(outcomes).padEnd(OUTCOME_W);

    if (tier === 'IMMEDIATE WIN') {
      rows.push(`${colStr} ${tierStr} ${outStr} (wins immediately — no pattern analysis needed)`);
      continue;
    }

    const nonZero = Object.entries(patterns)
      .filter(([, e]) => e.ratio > 0)
      .sort((a, b) => b[1].ratio - a[1].ratio);

    if (nonZero.length === 0) {
      rows.push(`${colStr} ${tierStr} ${outStr} (no tactical patterns detected)`);
      continue;
    }

    const [firstName, firstEntry] = nonZero[0];
    rows.push(
      `${colStr} ${tierStr} ${outStr}` +
      `${displayName(firstName).padEnd(PATTERN_W)} ${firstEntry.ratio.toFixed(2).padStart(RATIO_W)}  ${top2String(firstEntry)}`
    );

    for (let i = 1; i < nonZero.length; i++) {
      const [name, entry] = nonZero[i];
      rows.push(
        `${blankPrefix}${displayName(name).padEnd(PATTERN_W)} ${entry.ratio.toFixed(2).padStart(RATIO_W)}  ${top2String(entry)}`
      );
    }
  }

  rows.push('');
  rows.push(`(Simulation: ${rounds} round${rounds !== 1 ? 's' : ''} of optimal play per column)`);
  return rows.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Explain-move helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns { contrastCol, isOptimal } or null if all legal scores are equal
 * (no meaningful contrast exists).
 *
 * isOptimal = true  → user played a best move; contrast = second-best column
 * isOptimal = false → user played suboptimally; contrast = best column
 * Tie-break: center-most column (closest to col 3).
 */
export function selectContrastMove(scores, userCol, board) {
  const legalCols = [0, 1, 2, 3, 4, 5, 6].filter(c => board.colHeights[c] < 6);
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
    const secondBestScore = Math.max(...legalScores.filter(s => s < bestScore));
    if (!isFinite(secondBestScore)) return null;
    const secondBestCols = legalCols.filter(c => scores[c] === secondBestScore);
    return { contrastCol: centerMost(secondBestCols), isOptimal: true };
  } else {
    return { contrastCol: centerMost(bestCols), isOptimal: false };
  }
}


/**
 * Derives the game-theoretic tier of a position from the pre-move solver scores.
 *
 * Returns 'WINNING' if any legal score > 0, 'DRAWING' if best is 0, 'LOSING' if all < 0.
 * Only legal (non-full) columns are considered.
 *
 * @param {number[]} scores — full 7-element score array
 * @param {Board} board     — position before the move (used to filter full columns)
 */
export function getPositionTier(scores, board) {
  const legalScores = [0, 1, 2, 3, 4, 5, 6]
    .filter(c => board.colHeights[c] < 6)
    .map(c => scores[c]);
  const best = Math.max(...legalScores);
  if (best > 0)  return 'WINNING';
  if (best === 0) return 'DRAWING';
  return 'LOSING';
}

/**
 * Scans all 4-windows (horizontal, vertical, diagonal-up, diagonal-down) across the full
 * 7x6 board and returns windows with exactly 3 discs of one color and 1 empty cell.
 *
 * NOT to use: getMajorThreatCells returns a per-cell flag map {rm, rn, ym, yn} — it
 * cannot yield 4-cell group objects with owners. This helper is the correct tool for all
 * group-level major-threat operations.
 *
 * Cell format: wire format c${col+1}r${row+1} (1-indexed) for ALL cells in the window
 * (occupied cells included). This matches allowedSet.cells format.
 *
 * Deterministic ordering: horizontally first (cols inner, rows outer), then vertically,
 * diag-up, diag-down.
 *
 * @param {Board} board  Board instance with board.board[row][col] (0 = empty, 1 = Red, 2 = Yellow)
 * @param {number} perspective  1 = Red, 2 = Yellow (coached player's color)
 * @returns {Array<{cells: string[], owner: 'player'|'opponent'}>}
 */
export function findMajorThreatWindows(board, perspective) {
  const ROWS = 6;
  const COLS = 7;
  const opponent = 3 - perspective;
  const results = [];

  /** Checks a 4-cell window and pushes a record if it qualifies as a major threat. */
  function checkWindow(cells) {
    let playerCount = 0;
    let oppCount = 0;
    let emptyCount = 0;

    for (const { r, c } of cells) {
      const val = board.board[r][c];
      if (val === perspective) playerCount++;
      else if (val === opponent) oppCount++;
      else if (val === 0) emptyCount++;
      // mixed disc colors — skip without checking
    }

    if (playerCount === 3 && emptyCount === 1) {
      results.push({
        cells: cells.map(({ r, c }) => `c${c + 1}r${r + 1}`),
        owner: 'player',
      });
    } else if (oppCount === 3 && emptyCount === 1) {
      results.push({
        cells: cells.map(({ r, c }) => `c${c + 1}r${r + 1}`),
        owner: 'opponent',
      });
    }
  }

  // Direction order: horizontal, vertical, diagonal-up, diagonal-down

  // Horizontal (same row, col +1)
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      checkWindow([
        { r, c }, { r, c: c + 1 }, { r, c: c + 2 }, { r, c: c + 3 },
      ]);
    }
  }

  // Vertical (row +1, same col)
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 0; c < COLS; c++) {
      checkWindow([
        { r, c }, { r: r + 1, c }, { r: r + 2, c }, { r: r + 3, c },
      ]);
    }
  }

  // Diagonal-up (row +1, col +1)
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      checkWindow([
        { r, c }, { r: r + 1, c: c + 1 }, { r: r + 2, c: c + 2 }, { r: r + 3, c: c + 3 },
      ]);
    }
  }

  // Diagonal-down (row +1, col -1)
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 3; c < COLS; c++) {
      checkWindow([
        { r, c }, { r: r + 1, c: c - 1 }, { r: r + 2, c: c - 2 }, { r: r + 3, c: c - 3 },
      ]);
    }
  }

  return results;
}

/**
 * Returns the movestring after the opponent plays their best response to postMovestring,
 * or null if the game is already over or the board is full.
 *
 * - If the player who just moved has won: no response (returns null).
 * - If the opponent has an immediate win (blunder): plays the first winning col.
 * - Otherwise: queries the solver and picks the opponent's highest-scored legal col,
 *   tie-breaking toward the center (col 3).
 *
 * @param {string}   postMovestring   movestring after the user's move
 * @param {Board}    postBoard        Board object for postMovestring
 * @param {number[]} opponentWinCols  0-indexed cols where opponent wins immediately (may be empty)
 * @param {number}   perspective      1 or 2 — the player who just moved
 * @param {object}   solver           c4solver wrapper with .query()
 * @returns {Promise<string|null>}
 */
export async function getOpponentResponseMs(postMovestring, postBoard, opponentWinCols, perspective, solver) {
  if (postBoard.hasWon(perspective)) return null;
  if (postBoard.colHeights.every(h => h >= 6)) return null;
  if (opponentWinCols.length > 0) return postMovestring + opponentWinCols[0];
  const scores = await solver.query(postMovestring);
  const legalCols = [0, 1, 2, 3, 4, 5, 6].filter(c => postBoard.colHeights[c] < 6);
  const bestScore = Math.max(...legalCols.map(c => scores[c]));
  const bestCols = legalCols.filter(c => scores[c] === bestScore);
  const opponentBestCol = [...bestCols].sort((a, b) => Math.abs(a - 3) - Math.abs(b - 3))[0];
  return postMovestring + opponentBestCol;
}

/**
 * Builds the full LLM prompt string for the explain-move endpoint.
 *
 * All column references shown to the LLM are 1-indexed (col+1).
 * Solver scores are intentionally excluded — the LLM reasons from
 * tactical patterns and KB definitions only.
 *
 * boardViz              — board BEFORE the user's move
 * postBoardViz          — board AFTER the user's move
 * afterOpponentBoardViz — board after opponent's best response (null if game over)
 * opponentResponseCol   — 0-indexed col the opponent played (null if game over)
 * playerName            — 'Red' or 'Yellow' (the player who just moved)
 * positionTier          — 'WINNING' | 'DRAWING' | 'LOSING' (derived from pre-move scores)
 */
// ─────────────────────────────────────────────────────────────────────────────
// Classification, grouping, and prompt building helpers
// ─────────────────────────────────────────────────────────────────────────────

export const ROWS = 6;
const COLS = 7;

/**
 * T04 — checkAllMovesEqual
 * Determines if all legal moves have the same solver score for the coached player.
 *
 * @param {number[]} preScores  raw solver scores (current-player perspective)
 * @param {Board} board         Board instance
 * @returns {{ isSettled: boolean, allMovesEqual: boolean }}
 */
export function checkAllMovesEqual(preScores, board) {
  const legalCols = [0, 1, 2, 3, 4, 5, 6].filter(c => board.colHeights[c] < 6);
  if (legalCols.length === 0) return { isSettled: false, allMovesEqual: false };
  const legalScoresCoached = legalCols.map(c => -preScores[c]);
  const allMovesEqual = legalScoresCoached.every(s => s === legalScoresCoached[0]);
  const isSettled = allMovesEqual && legalCols.every(c => preScores[c] === 0);
  return { isSettled, allMovesEqual };
}

/**
 * T04 — getGapAndFraming
 * Computes the eval gap between the user's column and the contrast column.
 *
 * @param {number[]} preScores    raw solver scores (current-player perspective)
 * @param {number} col            user's column (0-indexed)
 * @param {number} contrastCol    contrast column (0-indexed)
 * @returns {{ gap: number, inverted: boolean, forceBucket: 'moderate'|'large'|null, gapBucket: 'small'|'moderate'|'large' }}
 */
export function getGapAndFraming(preScores, col, contrastCol) {
  const scoreA = -preScores[col];
  const scoreB = -preScores[contrastCol];
  const gap = scoreB - scoreA;
  const inverted = scoreA >= scoreB;

  let forceBucket = null;
  const signA = Math.sign(preScores[col]);
  const signB = Math.sign(preScores[contrastCol]);
  if (signA !== signB) {
    // Sign change: at least one outcome crosses a game-theoretic boundary
    const bothNonZero = (signA !== 0 && signB !== 0);
    forceBucket = bothNonZero ? 'large' : 'moderate';
  }

  let gapBucket;
  if (forceBucket) {
    gapBucket = forceBucket;
  } else {
    const absGap = Math.abs(gap);
    if (absGap <= 3) gapBucket = 'small';
    else if (absGap <= 9) gapBucket = 'moderate';
    else gapBucket = 'large';
  }

  return { gap, inverted, forceBucket, gapBucket };
}

/**
 * T06/T14 — classifyExplanationType
 * Routes a position to Type 1, 2, 3, or 4 based on available evidence.
 * Priority order: Type 1 > 2 > 3 > 4 (first match wins).
 *
 * @param {Board} preMoveBoard       Board before the user's move A
 * @param {Board} postABoard         Board after the user's move A
 * @param {string|null} criticalPositionMs  Movestring of critical position (after opponent's best response), or null
 * @param {number} perspective       1 (Red) or 2 (Yellow) — coached player
 * @param {number} playedCol         0-indexed column the user played
 * @returns {{ type: string }|{ type: string, parityFlipData: object }}
 */
export function classifyExplanationType(preMoveBoard, postABoard, criticalPositionMs, perspective, playedCol) {
  // ── Type 1 (FR-011): immediate threat existed before the move ─────────────
  const playerThreats = getImmediateThreats(preMoveBoard.board, preMoveBoard.colHeights, perspective);
  const opponentThreats = getImmediateThreats(preMoveBoard.board, preMoveBoard.colHeights, 3 - perspective);
  if (playerThreats.length > 0 || opponentThreats.length > 0) {
    return { type: 'type1' };
  }

  // ── Type 2 (FR-012): critical position has structural threats ────────────
  if (criticalPositionMs != null) {
    const criticalBoard = new Board(criticalPositionMs);
    const opponentThreatWindows = findMajorThreatWindows(criticalBoard, perspective)
      .filter(g => g.owner === 'opponent');

    if (opponentThreatWindows.length >= 2) {
      return { type: 'type2' };
    }

    // ZERO_SCORES avoids new solver call — detectors use scores only for
    // threat-type filtering, which doesn't affect structural match detection.
    const ZERO_SCORES = [0, 0, 0, 0, 0, 0, 0];
    if (detectFigure7(criticalBoard, ZERO_SCORES).matched) {
      return { type: 'type2' };
    }
    if (detectJShape(criticalBoard, ZERO_SCORES).matched) {
      return { type: 'type2' };
    }
  }

  // ── Type 3 (FR-013): major threat adjacent to parity-flipped column ──────
  const threatWindows = findMajorThreatWindows(postABoard, perspective);
  if (threatWindows.length > 0) {
    const threatCols = new Set();
    for (const win of threatWindows) {
      for (const cell of win.cells) {
        const match = cell.match(/c(\d+)r(\d+)/);
        if (match) threatCols.add(parseInt(match[1], 10) - 1);
      }
    }

    // playedCol is same as or adjacent to (±1) any threat column
    const isAdjacent = [...threatCols].some(tc => Math.abs(tc - playedCol) <= 1);
    if (isAdjacent) {
      const hasPlayerThreat = threatWindows.some(g => g.owner === 'player');
      return {
        type: 'type3',
        parityFlipData: {
          colA: playedCol + 1,
          colX: playedCol + 1,
          rowR: ROWS - preMoveBoard.colHeights[playedCol],
          playerLabel: hasPlayerThreat ? 'you' : 'your opponent',
        },
      };
    }
  }

  // ── Type 4 (default) ─────────────────────────────────────────────────────
  return { type: 'type4' };
}

/**
 * T08 — selectTopGroups (M3)
 * Selects top 5 groups per branch by completed_freq, merges by canonical key.
 *
 * @param {Map<string, AggregatedGroup>} aGroups  A-branch groups
 * @param {Map<string, AggregatedGroup>} bGroups  B-branch groups
 * @returns {Array<{cells, owner, aCompleted, aDraw, bCompleted, bDraw}>}
 */
export function selectTopGroups(aGroups, bGroups) {
  if (!aGroups || !bGroups) return [];
  const aArr = [...aGroups.entries()].map(([key, g]) => ({ key, ...g }));
  const bArr = [...bGroups.entries()].map(([key, g]) => ({ key, ...g }));

  aArr.sort((a, b) => b.completed_freq - a.completed_freq);
  bArr.sort((a, b) => b.completed_freq - a.completed_freq);

  const aTop5 = aArr.slice(0, 5);
  const bTop5 = bArr.slice(0, 5);

  // Discard logging
  if (aArr.length > 5) {
    const discarded = aArr.slice(5);
    const freqs = discarded.map(g => g.completed_freq);
    console.debug(`[explain] discarded ${aArr.length - 5} groups (freq range [${Math.min(...freqs)}–${Math.max(...freqs)}]); kept 5 per branch.`);
  }
  if (bArr.length > 5) {
    const discarded = bArr.slice(5);
    const freqs = discarded.map(g => g.completed_freq);
    console.debug(`[explain] discarded ${bArr.length - 5} groups (freq range [${Math.min(...freqs)}–${Math.max(...freqs)}]); kept 5 per branch.`);
  }

  // Union key sets
  const keySet = new Set([...aTop5.map(g => g.key), ...bTop5.map(g => g.key)]);

  const result = [];
  for (const key of keySet) {
    const aEntry = aGroups.get(key);
    const bEntry = bGroups.get(key);
    result.push({
      cells: (aEntry || bEntry).cells,
      owner: (aEntry || bEntry).owner,
      aCompleted: aEntry?.completed_freq ?? 0,
      aDraw: aEntry?.draw_freq ?? 0,
      bCompleted: bEntry?.completed_freq ?? 0,
      bDraw: bEntry?.draw_freq ?? 0,
    });
  }

  return result;
}

/**
 * T09 — buildAllowedSet
 * Builds the allowed set of groups from selectTopGroups output and the post-A board.
 * Each group becomes either CONCRETE-ELIGIBLE or ABSTRACT-ONLY.
 *
 * @param {Array} groups   Output of selectTopGroups
 * @param {Board} board    Post-A Board instance
 * @param {number} perspective  1 (Red) or 2 (Yellow) — coached player
 * @returns {Array<{cells?: string[], zoneSpec: string}|{col: number, parity: string, zoneSpec: string}>}
 *   CONCRETE-ELIGIBLE: { cells, zoneSpec }
 *   ABSTRACT-ONLY:     { col, parity, zoneSpec }  (no cells field)
 */
export function buildAllowedSet(groups, board, perspective) {
  const result = [];
  const opponent = 3 - perspective;

  for (const group of groups) {
    // Parse cell coordinates
    const parsedCells = [];
    for (const cellStr of group.cells) {
      const match = cellStr.match(/c(\d+)r(\d+)/);
      if (!match) continue;
      parsedCells.push({ col: parseInt(match[1], 10) - 1, row: parseInt(match[2], 10) - 1, wire: cellStr });
    }

    // Count owner discs
    let ownerDiscs = 0;
    for (const { col, row } of parsedCells) {
      const occupant = board.board[row][col];
      if (group.owner === 'player' && occupant === perspective) ownerDiscs++;
      else if (group.owner === 'opponent' && occupant === opponent) ownerDiscs++;
    }

    // Determine zone spec
    const uniqueCols = new Set(parsedCells.map(c => c.col));
    if (ownerDiscs >= 2) {
      // CONCRETE-ELIGIBLE
      let zoneSpec;
      if (uniqueCols.size === 1) {
        zoneSpec = `col${[...uniqueCols][0] + 1}`;
      } else {
        zoneSpec = `cells:${group.cells.join(',')}`;
      }
      result.push({ cells: group.cells, zoneSpec });
    } else {
      // ABSTRACT-ONLY
      const colCounts = {};
      for (const { col } of parsedCells) {
        colCounts[col] = (colCounts[col] || 0) + 1;
      }
      const mostCommonCol = parseInt(
        Object.entries(colCounts).sort((a, b) => b[1] - a[1])[0][0], 10
      );

      // Find key completing cell (first empty cell in group)
      let keyParity = 'odd';
      for (const { col, row } of parsedCells) {
        if (board.board[row][col] === 0) {
          keyParity = (row + 1) % 2 === 0 ? 'even' : 'odd';
          break;
        }
      }

      result.push({ col: mostCommonCol, parity: keyParity, zoneSpec: `col${mostCommonCol + 1}` });
    }
  }

  return result;
}

/**
 * T09b — buildType1AllowedSet
 * Builds the allowed set for Type 1 explanations from immediate threats.
 *
 * @param {Board} preMoveBoard  Board before the user's move A
 * @param {number} perspective  1 or 2 (coached player)
 * @returns {Array<{cells: string[], zoneSpec: string}>}
 */
export function buildType1AllowedSet(preMoveBoard, perspective) {
  const playerImmediate = getImmediateThreats(preMoveBoard.board, preMoveBoard.colHeights, perspective);
  const opponentImmediate = getImmediateThreats(preMoveBoard.board, preMoveBoard.colHeights, 3 - perspective);

  console.log('[DEBUG buildType1AllowedSet] perspective:', perspective);
  console.log('[DEBUG buildType1AllowedSet] playerImmediate (0-indexed cols):', playerImmediate);
  console.log('[DEBUG buildType1AllowedSet] opponentImmediate (0-indexed cols):', opponentImmediate);
  console.log('[DEBUG buildType1AllowedSet] colHeights:', preMoveBoard.colHeights);

  if (playerImmediate.length === 0 && opponentImmediate.length === 0) return [];

  // Helper: find windows where the empty cell is at gravity top and column is in immediate set
  function filterWindows(windows, immediateCols) {
    return windows
      .filter(w => {
        // Find the empty cell
        for (const cellStr of w.cells) {
          const match = cellStr.match(/c(\d+)r(\d+)/);
          if (!match) continue;
          const col = parseInt(match[1], 10) - 1;
          const row = parseInt(match[2], 10) - 1;
          if (preMoveBoard.board[row][col] === 0) {
            // Must be at gravity top of a column in the immediate threat set
            return row === preMoveBoard.colHeights[col] && immediateCols.includes(col);
          }
        }
        return false;
      })
      .map(w => {
        // Build zone spec
        const cols = new Set(w.cells.map(c => parseInt(c.match(/c(\d+)/)[1], 10)));
        const zoneSpec = cols.size === 1
          ? `col${[...cols][0]}`
          : `cells:${w.cells.join(',')}`;
        return { cells: w.cells, zoneSpec };
      });
  }

  const playerWindows = findMajorThreatWindows(preMoveBoard, perspective);
  const oppWindows = findMajorThreatWindows(preMoveBoard, 3 - perspective);

  console.log('[DEBUG buildType1AllowedSet] playerWindows (all major threat windows):', JSON.stringify(playerWindows));
  console.log('[DEBUG buildType1AllowedSet] oppWindows (all major threat windows):', JSON.stringify(oppWindows));

  const playerEntries = filterWindows(playerWindows, playerImmediate);
  const oppEntries = filterWindows(oppWindows, opponentImmediate);

  console.log('[DEBUG buildType1AllowedSet] playerEntries (after filter):', JSON.stringify(playerEntries));
  console.log('[DEBUG buildType1AllowedSet] oppEntries (after filter):', JSON.stringify(oppEntries));

  const result = [...playerEntries, ...oppEntries];
  console.log('[DEBUG buildType1AllowedSet] final allowedSet:', JSON.stringify(result));
  return result;
}

/**
 * Loads the KB parity-relevant statements for the given perspective and returns
 * a map of slug → statement text.
 * @param {number} perspective  1 (Green) or 2 (Grey)
 * @returns {Map<string, string>}
 */
function loadParityKBStatements(perspective) {
  const slugs = ['derived-parity-formula', 'community-claimodd', 'allis-claimeven'];
  if (perspective === 1) {
    slugs.push('allen-v1', 'allen-v3');
  } else {
    slugs.push('allen-v2', 'allen-v4');
  }

  const map = new Map();
  for (const slug of slugs) {
    const stmt = loadKBStatement(slug);
    if (stmt) map.set(slug, stmt);
  }
  return map;
}

/**
 * T10 — buildGroupContextBlock
 * Builds the "Move context", "Boards", and "Winning-line comparison" sections
 * for the LLM prompt.
 *
 * @param {Array} groups       Output of selectTopGroups (may be empty for Type 1)
 * @param {Array} allowedSet   Output of buildAllowedSet or buildType1AllowedSet
 * @param {Board} board        Post-A Board instance
 * @param {number} perspective  1 or 2 (coached player)
 * @param {object} [options]
 * @param {number} [options.userCol]         0-indexed user's column
 * @param {number} [options.contrastCol]     0-indexed contrast column
 * @param {string} [options.gapBucket]       'small'|'moderate'|'large'
 * @param {number} [options.gap]             eval gap
 * @param {boolean} [options.inverted]       true if user's move is optimal/superior
 * @param {string} [options.preViz]          pre-move board visualization (with scr already stripped)
 * @param {string} [options.afterViz]        post-opponent-response board visualization (with scr already stripped)
 * @returns {string}
 */
export function buildGroupContextBlock(groups, allowedSet, board, perspective, options = {}) {
  const { userCol, contrastCol, gapBucket, gap, inverted, preViz, afterViz } = options;
  const playerName = perspective === 1 ? 'Green' : 'Grey';
  const opponentName = perspective === 1 ? 'Grey' : 'Green';
  const winningParity = perspective === 1 ? 'ODD' : 'EVEN';
  const lines = [];

  // ── Move context (FR-021) ─────────────────────────────────────────────────
  lines.push('## Move context');
  lines.push(`- Player: ${playerName} (winning parity = ${winningParity} rows 1/3/5)`);
  if (userCol != null && contrastCol != null) {
    // board is postBoard: col A height already incremented, col B unchanged
    const colALandingRow = board.colHeights[userCol];          // 1-indexed
    const colBLandingRow = board.colHeights[contrastCol] + 1;  // 1-indexed
    lines.push(`- ${playerName} played col ${userCol + 1} (landing at c${userCol + 1}r${colALandingRow}); best alternative col ${contrastCol + 1} (landing at c${contrastCol + 1}r${colBLandingRow})`);
  }
  if (gapBucket) {
    lines.push(`- Eval gap: ${gapBucket}`);
  }

  // Stage and major threats
  const discCount = board.movestring ? board.movestring.length : 0;
  const threatWindows = findMajorThreatWindows(board, perspective);
  if (threatWindows.length === 0) {
    lines.push(`- Stage: opening (${discCount} discs); major threats: none`);
  } else {
    lines.push(`- Stage: ${discCount} discs; major threats: ${threatWindows.length}`);
  }
  lines.push('');

  // ── Boards (FR-023) — pre-move, post-move, post-opponent ──────────────────
  lines.push('## Boards');
  if (preViz) {
    const viz = preViz.replace(/\bR\b/g, 'Green').replace(/\bY\b/g, 'Grey');
    lines.push('### Before the move');
    lines.push(viz);
    lines.push('');
  }
  if (board.movestring != null) {
    let viz = getBoardVisualization(board.movestring);
    viz = viz.replace(/\bR\b/g, 'Green').replace(/\bY\b/g, 'Grey');
    if (preViz || afterViz) lines.push('### After the move');
    lines.push(viz);
    lines.push('');
  }
  if (afterViz) {
    const viz = afterViz.replace(/\bR\b/g, 'Green').replace(/\bY\b/g, 'Grey');
    lines.push('### After opponent\'s response');
    lines.push(viz);
    lines.push('');
  }
  lines.push('Note: In the board diagrams, "Green" denotes Green discs and "Grey" denotes Grey discs.');
  lines.push('');

  // ── Winning-line comparison ───────────────────────────────────────────────
  const { type1ThreatEntries } = options;
  if (groups.length === 0 && type1ThreatEntries && type1ThreatEntries.length > 0) {
    // Type 1: no simulation groups, but opponent has an immediate winning threat.
    // Emit a minimal comparison block so the hard grounding rule has cells to anchor to.
    lines.push('## Winning-line comparison (immediate threat)');
    for (let k = 0; k < type1ThreatEntries.length; k++) {
      const entry = type1ThreatEntries[k];
      const cells = entry.cells;
      let completingCell = '';
      let completingRow = 0;
      const occupants = cells.map(cellStr => {
        const m = cellStr.match(/c(\d+)r(\d+)/);
        if (!m) return 'unknown';
        const c = parseInt(m[1], 10) - 1;
        const r = parseInt(m[2], 10) - 1;
        const val = board.board[r][c];
        if (val === 0) {
          completingCell = cellStr;
          completingRow = r + 1; // 1-indexed
          return 'empty';
        }
        return val === perspective ? playerName : opponentName;
      });
      const parity = completingRow % 2 === 0 ? 'even' : 'odd';
      lines.push('');
      lines.push(`THREAT_${k}:`);
      lines.push(`  cells=[${cells.join(',')}] occupants=[${occupants.join(',')}]`);
      if (completingCell) {
        lines.push(`  completing cell: ${completingCell} (row ${completingRow} = ${parity}) — CONCRETE-ELIGIBLE`);
      }
    }
  } else if (groups.length > 0) {
    lines.push('## Winning-line comparison (best vs worst continuations)');

    // Load KB parity statements once
    const kbStatements = loadParityKBStatements(perspective);

    const opponentNameCapitalized = perspective === 1 ? 'Grey' : 'Green';

    for (let k = 0; k < groups.length; k++) {
      const g = groups[k];
      lines.push('');

      // Find matching allowedSet entry
      const allowedEntry = allowedSet.find(a => {
        if (a.cells) {
          return a.cells.length === g.cells.length &&
            a.cells.every((c, i) => c === g.cells[i]);
        }
        return false;
      });

      const isConcreteEligible = !!(allowedEntry && allowedEntry.cells);

      // Format occupant list
      const occupants = g.cells.map(cellStr => {
        const m = cellStr.match(/c(\d+)r(\d+)/);
        if (!m) return 'unknown';
        const col = parseInt(m[1], 10) - 1;
        const row = parseInt(m[2], 10) - 1;
        const val = board.board[row][col];
        if (val === 0) return 'empty';
        if (val === perspective) return playerName;
        return opponentName;
      });

      // Key completing cell
      let keyCellStr = '';
      let keyParity = '';
      let winningParityLabel = '';
      for (const cellStr of g.cells) {
        const m = cellStr.match(/c(\d+)r(\d+)/);
        if (!m) continue;
        const col = parseInt(m[1], 10) - 1;
        const row = parseInt(m[2], 10) - 1;
        if (board.board[row][col] === 0) {
          keyCellStr = cellStr;
          keyParity = (row + 1) % 2 === 0 ? 'even' : 'odd';
          const isWinningParity = (perspective === 1 && keyParity === 'odd') ||
            (perspective === 2 && keyParity === 'even');
          winningParityLabel = isWinningParity ? 'IS' : 'NOT';
          break;
        }
      }

      // Player discs count
      let playerDiscs = 0;
      for (const cellStr of g.cells) {
        const m = cellStr.match(/c(\d+)r(\d+)/);
        if (!m) continue;
        const col = parseInt(m[1], 10) - 1;
        const row = parseInt(m[2], 10) - 1;
        if (board.board[row][col] === perspective) playerDiscs++;
      }

      const eligibilityLabel = isConcreteEligible ? 'CONCRETE-ELIGIBLE' : 'ABSTRACT-ONLY';

      // Format cells list
      const cellsStr = `cells=[${g.cells.join(',')}]`;
      const occupantsStr = `occupants=[${occupants.join(',')}]`;

      lines.push(`GROUP_${k}:`);
      lines.push(`  ${cellsStr} ${occupantsStr}`);
      lines.push(`    key completing cell: ${keyCellStr} (row ${parseInt(keyCellStr.match(/r(\d+)/)[1], 10)} = ${keyParity}, ${winningParityLabel} winning parity for ${playerName})`);
      lines.push(`    player_discs_in_group: ${playerDiscs} — ${eligibilityLabel}`);
      lines.push(`    A-branch: completed=${g.aCompleted.toFixed(2)} draw=${g.aDraw.toFixed(2)} | B-branch: completed=${g.bCompleted.toFixed(2)} draw=${g.bDraw.toFixed(2)}`);

      // KB justification
      for (const [, stmt] of kbStatements) {
        lines.push(`    KB justification: ${stmt}`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * Builds the common section for all prompt types: LANGUAGE_RULE, Players,
 * Hard grounding rules, Tone, zone tag instructions, and KB section.
 *
 * @param {{ playerName: string, gap: number, gapBucket: string, inverted: boolean, contextBlock: string }} params
 * @param {'type4'|'type12'|'type3'} promptType
 * @param {object} [typeSpecific]
 * @returns {string}
 */
function buildCommonPromptSections({ playerName, gap, gapBucket, inverted, contextBlock }, promptType, typeSpecific = {}) {
  const opponentName = playerName === 'Green' ? 'Grey' : 'Green';
  const perspective = playerName === 'Green' ? 1 : 2;
  const sections = [];

  // ── Role ──────────────────────────────────────────────────────────────────
  if (promptType === 'type4') {
    sections.push(`## Role
You are a Connect Four coach explaining, in the opening, why one move develops
better than another. There are no immediate threats on this board — do not
describe any threat, fork, or winning line as if it exists now. Everything you
say must be about what the moves build TOWARD.`);
  } else if (promptType === 'type12') {
    sections.push(`## Role
You are a Connect Four coach explaining why one move was stronger than another.`);
  } else {
    // type3 — same as type12 role (type-neutral)
    sections.push(`## Role
You are a Connect Four coach explaining why one move was stronger than another.`);
  }

  // ── LANGUAGE_RULE ─────────────────────────────────────────────────────────
  const LANGUAGE_RULE = `**Language rule:** Use only Connect Four terminology in your response. Never use these internal technical terms: forced_win, losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score. Explain everything using board concepts: threats, columns, rows, diagonals, blocking, winning line, fork, etc. The players are called **${playerName}** and **${opponentName}** — use no other names.`;
  sections.push(LANGUAGE_RULE);

  // ── Players ───────────────────────────────────────────────────────────────
  sections.push(`## Players
${playerName} and ${opponentName}. ${playerName}'s winning lines complete on ${perspective === 1 ? 'ODD' : 'EVEN'} rows (${perspective === 1 ? '1,3,5' : '2,4,6'}); ${opponentName}'s on ${perspective === 1 ? 'EVEN' : 'ODD'} rows (${perspective === 1 ? '2,4,6' : '1,3,5'}). Use only Connect Four terms.`);

  // ── Hard grounding rules ──────────────────────────────────────────────────
  sections.push(`## Hard grounding rules
- Reference ONLY cells and columns that appear in "Winning-line comparison" OR are named as landing cells in "Move context."
- Never name a cell not listed in one of those two sections.
- Never describe a cell as part of a winning line if its occupants entry is not
  \`empty\`.
- For ABSTRACT-ONLY groups: refer to "a winning line in column X on an odd row" —
  do NOT enumerate its cells.
- For CONCRETE-ELIGIBLE groups: you MAY highlight the listed empty cells.`);

  // ── Context block ─────────────────────────────────────────────────────────
  sections.push(contextBlock);

  // ── Tone (driven by Eval gap) ─────────────────────────────────────────────
  if (inverted) {
    let text;
    if (gap === 0) {
      text = 'Both A and the alternative are equivalent; your move is fine.';
    } else if (gap > -3) {
      text = 'Your move is solid; the alternative is a touch more flexible but the difference is minor.';
    } else {
      text = 'Your move is the strongest here; what it preserves or builds.';
    }
    sections.push(`## Tone\n${text}`);
  } else {
    let text;
    if (gapBucket === 'small') {
      text = 'Both moves are reasonable; frame col B as slightly more principled,\n             not col A as a mistake. Do not manufacture a flaw.';
    } else if (gapBucket === 'moderate') {
      text = 'col B is clearly preferable; explain the developmental edge.';
    } else {
      text = 'col B is important; col A gives away real ground.';
    }
    sections.push(`## Tone (driven by Eval gap)\n- ${gapBucket}    → ${text}`);
  }

  // ── KB section (FR-024) ────────────────────────────────────────────────────
  const kbEntries = ['derived-parity-formula'];
  if (perspective === 1) {
    kbEntries.push('allen-v1', 'allen-v3');
  } else {
    kbEntries.push('allen-v2', 'allen-v4');
  }
  kbEntries.push('community-claimodd', 'allis-claimeven');
  const kbSection = buildKBSection(kbEntries);
  if (kbSection) sections.push(kbSection);

  return sections.join('\n\n');
}

/**
 * Builds the zone tag instructions section common to all prompt types.
 * @returns {string}
 */
function buildZoneTagInstructions() {
  return `## Output format
Wrap any reference to a specific board location in zone tags:

- \`[zone:colN]column N[/zone:colN]\` — a single column
- \`[zone:cNrM]the cell at row M[/zone:cNrM]\` — a single cell
- \`[zone:cells:c1r2,c2r3]these cells[/zone:cells:c1r2,c2r3]\` — multiple cells (comma-separated)
- \`[zone:rowN]row N[/zone:rowN]\` — an entire row
- \`[zone:tg]this threat[/zone:tg]\` — all current major threat cells for the player

Rules:
- Only tag EXPLICIT spatial references. Do NOT tag abstract concepts like "the position" or "the tactic."
- Use column numbers as they appear in the board context above (1-indexed columns, row 1 = bottom).
- The board has 7 columns (1–7, left to right) and 6 rows (1–6, bottom to top).`;
}

/**
 * T11 — buildType4Prompt
 * Builds the full prompt for Type 4 (developmental / opening) explanations.
 *
 * @param {{ playerName: string, gap: number, gapBucket: string, contextBlock: string, inverted: boolean }}
 * @returns {string}
 */
export function buildType4Prompt({ playerName, gap, gapBucket, contextBlock, inverted }) {
  const common = buildCommonPromptSections(
    { playerName, gap, gapBucket, inverted, contextBlock },
    'type4'
  );

  // Task section
  let taskSection;
  if (inverted) {
    taskSection = `## Task
In 2–3 sentences: lead with what your move (col A) builds toward (name the column(s) and the
winning row parity; highlight a concrete group only if one is CONCRETE-ELIGIBLE).
Then say what the alternative gives up, scaled to the Eval gap. Use [zone:...] only on
cells/columns that appear in the comparison block.`;
  } else {
    taskSection = `## Task
In 2–3 sentences: lead with what col B builds toward (name the column(s) and the
winning row parity; highlight a concrete group only if one is CONCRETE-ELIGIBLE).
Then say what col A gives up, scaled to the Eval gap. Use [zone:...] only on
cells/columns that appear in the comparison block.`;
  }

  const zoneTagInstructions = buildZoneTagInstructions();

  return `${common}

${zoneTagInstructions}

${taskSection}`;
}

/**
 * T12 — buildType12Prompt
 * Builds the full prompt for Type 1 and Type 2 explanations.
 *
 * @param {{ playerName: string, gap: number, gapBucket: string, contextBlock: string, explainType: 'type1'|'type2' }}
 * @returns {string}
 */
export function buildType12Prompt({ playerName, gap, gapBucket, contextBlock, explainType }) {
  const common = buildCommonPromptSections(
    { playerName, gap, gapBucket, inverted: false, contextBlock },
    'type12'
  );

  let taskSection;
  if (explainType === 'type1') {
    taskSection = `## Task
In 2–3 sentences: explain why the missed immediate threat exists. Name the specific
column, row, and the 4-cell line. Say why the better move (col B) was the correct
choice and what col A gave up, scaled to the Eval gap. Use [zone:...] only on
cells/columns that appear in the comparison block.`;
  } else {
    taskSection = `## Task
In 2–3 sentences: explain the tactical pattern (fork or scaffold) that the better
move (col B) leads to. Name the specific columns and winning lines from the tactical
analysis. Say what col A gives up, scaled to the Eval gap. Use [zone:...] only on
cells/columns that appear in the comparison block.`;
  }

  const zoneTagInstructions = buildZoneTagInstructions();

  return `${common}

${zoneTagInstructions}

${taskSection}`;
}

/**
 * T13 — buildType3Prompt
 * Builds the full prompt for Type 3 (parity / structural) explanations.
 *
 * @param {{ playerName: string, gap: number, gapBucket: string, contextBlock: string, parityFlipData: { colA: number, colX: number, rowR: number, playerLabel: string } }}
 * @returns {string}
 */
export function buildType3Prompt({ playerName, gap, gapBucket, contextBlock, parityFlipData }) {
  const common = buildCommonPromptSections(
    { playerName, gap, gapBucket, inverted: false, contextBlock },
    'type3'
  );

  const { colA, colX, rowR, playerLabel } = parityFlipData;

  const taskSection = `## Task
In 2–3 sentences: lead with what col B builds toward (name the column(s) and the
winning row parity; highlight a concrete group only if one is CONCRETE-ELIGIBLE).
Then say what col A gives up, scaled to the Eval gap. Use [zone:...] only on
cells/columns that appear in the comparison block.

Important: Playing in column ${colA} changes the number of empty squares in column ${colX}, so ${playerLabel} will now land on row ${rowR} — the row that matters for winning there.`;

  const zoneTagInstructions = buildZoneTagInstructions();

  return `${common}

${zoneTagInstructions}

${taskSection}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Recommend-move helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds the full LLM prompt for move recommendation.
 *
 * All column references shown to the LLM are 1-indexed.
 * Solver scores are intentionally excluded — the LLM reasons from
 * score tiers (WINS/DRAWS/LOSES/etc.), tactical patterns, and KB definitions.
 */
export function buildRecommendPrompt({
  boardViz, playerName, opponentName,
  positionAssessment, colData,
  immediateWinSet, forcedBlockCols, immediateLossSet,
  kbSection, rounds,
}) {
  const annotations = [];

  if (immediateWinSet.size > 0) {
    const cols = [...immediateWinSet].sort((a,b) => a-b).map(c => `col ${c+1}`).join(', ');
    annotations.push(`⚡ IMMEDIATE WIN available: ${cols} — playing here wins the game right now.`);
  }
  if (forcedBlockCols.length > 0) {
    const cols = forcedBlockCols.map(c => `col ${c+1}`).join(', ');
    annotations.push(`🛡 FORCED BLOCK required: ${cols} — ${opponentName} wins immediately if ${playerName} skips this column.`);
  }
  if (immediateLossSet.size > 0) {
    const cols = [...immediateLossSet].sort((a,b) => a-b).map(c => `col ${c+1}`).join(', ');
    annotations.push(`⚠️ IMMEDIATE LOSS: ${cols} — playing here gives ${opponentName} an immediate winning response; avoid.`);
  }

  const annotationSection = annotations.length > 0
    ? `## Special move annotations\n${annotations.join('\n')}\n\n`
    : '';

  const tableStr = buildFlatTable(colData, rounds);

  const LANGUAGE_RULE = `**Language rule:** Use only Connect Four terminology in your response. Never use these internal technical terms: forced_win, losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, numerical evaluation. Explain everything using board concepts: threats, columns, rows, diagonals, blocking, winning line, fork, etc. The players are called **${playerName}** and **${opponentName}** — use no other names.`;

  return `## Role
You are an expert Connect Four coach. Your goal is to recommend which column(s) to play next and explain the strategic reasoning to the player.

${LANGUAGE_RULE}

## Move context
- Current player: **${playerName}**
- Position assessment: **${playerName} is ${positionAssessment}**

${annotationSection}## Board (current position — ${playerName} to move)
${boardViz}

## Per-column tactical analysis
Each playable column is labeled with a tier (IMMEDIATE WIN / WINS / DRAWS / LOSES / IMMEDIATE LOSS) and its simulated tactical patterns. Columns are sorted best-first.

${tableStr}
${kbSection ? '\n' + kbSection + '\n' : ''}
## Task
Recommend which column(s) to play next and explain the strategic reasoning in 3–5 sentences. If multiple columns share the same tier, explain what each offers tactically rather than saying one is strictly better than another. Do not mention solver scores or numerical evaluations.`;
}
