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

// Placeholder outcomes for IMMEDIATE WIN columns — we skip processing for
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
  double_threat:   { id: 'community-double-threat' },
  immediate_threat: { id: 'community-immediate-threat' },
  j_shape:         { id: 'allen-j-configuration' },
  figure_7:        { id: 'community-figure-7' },
  forced_block:    { id: 'community-forced-block' },
  claimeven:       { id: 'allis-claimeven' },
  baseclaim:       { id: 'allis-baseclaim' },
  before:          { id: 'allis-before' },
  specialbefore:   { id: 'allis-specialbefore' },
  undercut:        { id: 'allen-t2' },
  overcut:         { id: 'community-overcut' },
  z_threat:        { id: 'community-z-threat' },
  forced_win:      { id: 'derived-lost-position' },
  odd_even_threat: { id: 'derived-odd-even-threat' },
  // Always-include glossary terms: surfaced in every explain-move prompt regardless
  // of which tactical patterns fired. These appear in the board visualisation legend
  // and the LLM will always encounter them.
  major_threat:    { id: 'allen-major-threat',       always_include: true },
  minor_threat:    { id: 'allen-minor-threat',       always_include: true },
  gravity_top:     { id: 'community-gravity-top',    always_include: true },
  parity:          { id: 'allen-parity',             always_include: true },
  // Alias: fork is a synonym for double_threat; shares the same KB article.
  fork:            { id: 'community-double-threat' },
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
 * Extracts the `short_summary` field from a KB article's YAML frontmatter.
 * Returns null if the file cannot be read or the field is missing.
 */
function _loadKBShortSummaryRaw(id) {
  try {
    const text = readFileSync(join(KB_DIR, `${id}.md`), 'utf8');
    const fmMatch = text.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) return null;
    const fm = fmMatch[1];
    const lines = fm.split('\n');
    let inSummary = false;
    const summaryLines = [];
    for (const line of lines) {
      if (!inSummary) {
        if (/^short_summary:\s*\|/.test(line)) { inSummary = true; }
        continue;
      }
      if (line.length > 0 && !/^\s/.test(line)) break;
      summaryLines.push(line.replace(/^  /, ''));
    }
    return summaryLines.join('\n').trim() || null;
  } catch {
    return null;
  }
}

export function loadKBShortSummary(id) {
  const result = _loadKBShortSummaryRaw(id);
  if (result !== null) return result;
  // Alias fallback: if id matches a PATTERN_KB key (e.g. 'fork'), resolve through to the real slug
  const kb = PATTERN_KB[id];
  return kb ? _loadKBShortSummaryRaw(kb.id) : null;
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
    const statement = loadKBStatement(kb.id);
    if (!statement) continue;
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

// ─────────────────────────────────────────────────────────────────────────────
// Explain-move gap/framing helpers
// ─────────────────────────────────────────────────────────────────────────────

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

// classifyExplanationType, selectTopGroups, buildAllowedSet, buildType1AllowedSet,
// buildGroupContextBlock, buildType4Prompt, buildType12Prompt, buildType3Prompt
// were removed in Epic 3 Batch 3 (T013). The old type1/2/3/4 dispatch is no
// longer needed — the unified blunder/optimal flow in explainContext.js replaced it.

// ─────────────────────────────────────────────────────────────────────────────
// Blunder/Optimal explain prompt builder (Epic 3, Batch 2)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds the LLM prompt for the unified blunder/optimal explain-move endpoint.
 *
 * Blunder path (tag + direction + humanReason non-null, positiveReason null):
 *   Frame the explanation around what went wrong, using humanReason as the key sentence.
 *
 * Optimal path (tag/direction/humanReason null, positiveReason non-null):
 *   Frame the explanation positively using positiveReason.
 *
 * P1–P6 annotation constraints are preserved via the grounding section.
 * Solver scores MUST NOT appear in the prompt (FR-015).
 *
 * @param {object} params
 * @param {string|null} params.tag               — null on optimal-move path
 * @param {string|null} params.direction         — null on optimal-move path
 * @param {string|null} params.humanReason       — human-readable reason from REASON_TEMPLATES
 * @param {string|null} params.positiveReason    — from POSITIVE_TEMPLATES (null on blunder path)
 * @param {Map<string,{cells:string[]}>} params.correctMovePatterns — patterns after best move
 * @param {string} params.boardViz               — pre-move board visualization (scr stripped)
 * @param {string} params.postBoardViz           — post-move board visualization (scr stripped)
 * @param {'Green'|'Grey'} params.playerName
 * @param {number} params.gap
 * @param {'small'|'moderate'|'large'} params.gapBucket
 * @param {Array|null} params.allowedSet         — AllowedSetEntry[] or null
 * @returns {string}
 */
export function buildBlunderExplainPrompt({
  tag,
  direction,
  humanReason,
  positiveReason,
  correctMovePatterns,
  boardViz,
  bestMoveBoardViz,   // board after the correct move (blunder path only)
  postBoardViz,
  playerName,
  gap,
  gapBucket,
  allowedSet,
  playedCol,              // 0-indexed; undefined = not provided
  contrastCol,            // 0-indexed best column on blunder path; undefined = not provided
  kbTermsSection,         // pre-formatted KB term definitions section (from buildExplainContext)
  threatComparisonSection, // pre-formatted threat count diff (from buildExplainContext)
}) {
  const opponentName = playerName === 'Green' ? 'Gray' : 'Green';
  const perspective = playerName === 'Green' ? 1 : 2;
  const winningParity = perspective === 1 ? 'ODD' : 'EVEN';
  const winningRows = perspective === 1 ? '1,3,5' : '2,4,6';
  const losingRows  = perspective === 1 ? '2,4,6' : '1,3,5';

  const isBlunder = tag !== null && direction !== null && humanReason !== null;

  const LANGUAGE_RULE = `**Language rule:** Never use these internal technical terms: forced_win, losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".`;

  const sections = [];

  // ── Role ──────────────────────────────────────────────────────────────────
  if (isBlunder) {
    sections.push(`## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.`);
  } else {
    sections.push(`## Role
You are a Connect Four coach explaining why a move was a strong choice.`);
  }

  sections.push(LANGUAGE_RULE);

  // ── Players ───────────────────────────────────────────────────────────────
  sections.push(`## Players
You win by completing a line on ${winningParity} rows (${winningRows}).
Your opponent wins on ${perspective === 1 ? 'EVEN' : 'ODD'} rows (${losingRows}).`);

  // ── Boards ────────────────────────────────────────────────────────────────
  const boardLines = ['## Boards'];
  boardLines.push('### Before the move');
  boardLines.push(boardViz || '[unavailable]');
  boardLines.push('');
  if (isBlunder && bestMoveBoardViz) {
    boardLines.push('### After the best move');
    boardLines.push(bestMoveBoardViz);
    boardLines.push('');
  }
  boardLines.push('### After the move played');
  boardLines.push(postBoardViz || '[unavailable]');
  boardLines.push('');
  const yourGlyph = playerName === 'Green' ? 'Gn' : 'Gy';
  const oppGlyph  = playerName === 'Green' ? 'Gy' : 'Gn';
  boardLines.push(`Note: In the board, ${yourGlyph} = your discs, ${oppGlyph} = your opponent's discs.`);
  sections.push(boardLines.join('\n'));

  // ── Move context ──────────────────────────────────────────────────────────
  const contextLines = ['## Move context'];
  contextLines.push(`- Your winning rows: ${winningParity} (${winningRows})`);
  contextLines.push(`- Eval gap: ${gapBucket}`);
  if (playedCol !== undefined) {
    contextLines.push(`- Move played: column ${playedCol + 1}`);
  }
  if (isBlunder && contrastCol !== undefined) {
    contextLines.push(`- Better move: column ${contrastCol + 1}`);
  }
  if (isBlunder) {
    contextLines.push(`- Key insight: ${humanReason}`);
  } else {
    contextLines.push(`- Key insight: ${positiveReason ?? 'This was the strongest move available.'}`);
  }
  sections.push(contextLines.join('\n'));

  // ── Threat comparison ─────────────────────────────────────────────────────
  if (threatComparisonSection) {
    sections.push(threatComparisonSection);
  }

  // ── Best-move patterns (grounding evidence) ───────────────────────────────
  if (correctMovePatterns && correctMovePatterns.size > 0) {
    const patternLines = ['## Best-move tactical evidence'];
    patternLines.push('The following tactical patterns were present after the best move:');
    for (const [patternTag, { cells }] of correctMovePatterns) {
      if (cells.length > 0) {
        patternLines.push(`- ${patternTag}: cells [${cells.join(', ')}]`);
      } else {
        patternLines.push(`- ${patternTag} (position-level pattern)`);
      }
    }
    sections.push(patternLines.join('\n'));
  }

  // ── Hard grounding rules ──────────────────────────────────────────────────
  const groundingLines = ['## Hard grounding rules'];
  // Collect allowed columns for the prompt
  const allowedCols = [];
  if (playedCol !== undefined) allowedCols.push(playedCol);
  if (contrastCol !== undefined && contrastCol !== playedCol) allowedCols.push(contrastCol);

  if (allowedSet !== null) {
    // Add pattern-derived columns
    for (const entry of allowedSet) {
      if (entry.col !== undefined && !allowedCols.includes(entry.col)) {
        allowedCols.push(entry.col);
      }
    }
    groundingLines.push('You may reference these columns using zone tags:');
    groundingLines.push(allowedCols.map(c => `[zone:col${c + 1}]column ${c + 1}[/zone:col${c + 1}]`).join(', '));
    groundingLines.push('');
    // Build strategic cells list (non-validationOnly, cell-type entries only)
    const strategicCells = [];
    for (const entry of allowedSet) {
      if (entry.validationOnly) continue;
      if (entry.cells && entry.cells.length > 0) {
        strategicCells.push(...entry.cells);
      }
    }
    if (strategicCells.length > 0) {
      groundingLines.push('### Strategic reference cells');
      groundingLines.push('These cells are tactical reference points for your explanation.');
      groundingLines.push(`- Concrete cells: [${strategicCells.join(', ')}]`);
    } else {
      groundingLines.push('(no specific cell references — use the allowed columns above and describe patterns in general terms)');
    }
  } else {
    groundingLines.push('Column numbers (1–7) are always valid to reference — they appear in every board header.');
    groundingLines.push('Only omit specific CELL references (e.g. c4r3) if the cell is not listed in the boards above.');
  }
  sections.push(groundingLines.join('\n'));

  // ── Tone ──────────────────────────────────────────────────────────────────
  if (isBlunder) {
    let toneText;
    if (gapBucket === 'small') {
      toneText = 'This was a minor inaccuracy; frame it gently, not as a severe blunder.';
    } else if (gapBucket === 'moderate') {
      toneText = 'This move gave away a real advantage; explain the concrete consequence.';
    } else {
      toneText = 'This was a significant mistake; explain clearly what was lost.';
    }
    sections.push(`## Tone\n${toneText}`);
  } else {
    let toneText;
    if (gap === 0) {
      toneText = 'Both this move and the alternative are equivalent; the move is fine.';
    } else {
      toneText = 'This was the strongest move here; explain what it builds or preserves.';
    }
    sections.push(`## Tone\n${toneText}`);
  }

  // ── KB term definitions (pre-formatted by buildExplainContext) ─────────────
  if (kbTermsSection) {
    sections.push(kbTermsSection);
  }

  // ── Output format ─────────────────────────────────────────────────────────
  const formatLines = ['## Output format'];
  formatLines.push('When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.');
  formatLines.push('The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag\'s spec).');
  formatLines.push('');
  formatLines.push('Syntax (use EXACTLY these patterns — the closing tag MUST repeat the same spec as the opening tag):');
  formatLines.push('  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]');
  formatLines.push('  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]');
  formatLines.push('  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells:c1r2,c2r3] — for multiple cells');
  formatLines.push('  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]');
  formatLines.push('');
  formatLines.push('IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].');
  formatLines.push('IMPORTANT: The closing tag must repeat the EXACT spec: [zone:col3]...[/zone:col3], NOT [/zone:column] or [/zone:col].');
  formatLines.push('');
  if (kbTermsSection) {
    formatLines.push('When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:');
    formatLines.push('  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.');
    formatLines.push('  Only tag terms that appear in the definitions above. Do not invent kbIds.');
    formatLines.push('');
  }
  formatLines.push('When you write a minor threat count, do not write a bare number — replace it with the full [zone:cells:…]N[/zone:cells:…] token from the matching line in the threat comparison section. The token is already formatted there; copy it verbatim into your sentence.');
  formatLines.push('Only tag EXPLICIT spatial references. Do not tag abstract concepts.');
  formatLines.push('Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).');
  sections.push(formatLines.join('\n'));

  // ── Task ──────────────────────────────────────────────────────────────────
  if (isBlunder) {
    const patternInstruction = kbTermsSection
      ? 'Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above).'
      : 'Do not invent tactical concept names — describe only what you can see changing between the two boards.';
    sections.push(`## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
${patternInstruction} Say what the better move would have accomplished.
When the threat comparison shows a meaningful difference, compare branches against the pre-move baseline — and replace every minor threat count with its zone tag token from the threat comparison (e.g. "the best move would have cut your opponent's minor threats from [zone:cells:…]4[/zone:cells:…] to [zone:cells:…]1[/zone:cells:…]; your move left them at [zone:cells:…]3[/zone:cells:…]").
Do not use internal tag names or direction labels.`);
  } else {
    sections.push(`## Task
In 2–3 sentences: explain why this was a strong move, using the key insight as your starting point.
Name the tactical pattern or strategic benefit it creates. Scaled to the eval gap: for a small gap,
acknowledge both moves have merit; for a large gap, highlight what this move uniquely achieves.`);
  }

  return sections.join('\n\n');
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
