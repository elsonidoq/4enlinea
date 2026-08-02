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
import { callOpenAIChat } from './llmChat.js';
import { KB_DIR } from './kbDir.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
  forced_win: 'forced win',
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
  forced_win:      { id: 'community-forced-win' },
  // odd_even_threat de-listed from the coach 2026-06-25: its detector + puzzle category
  // stay, but it is never injected as a [term:...] in the explain prompt. The parity-aware
  // threat tags below replace its coaching role.
  major_threat_parity:    { id: 'derived-parity-aligned-threat' },
  major_threat_nonparity: { id: 'allen-major-threat' },
  // KB terms are injected into a prompt ONLY when their pattern actually fires on the
  // board (relevantPatternKeys in explainContext.js). The former `always_include`
  // glossary path was removed: injecting a term with no instance — even parity /
  // gravity_top, which were thought to be safe "legend" terms — led the LLM to
  // fabricate or misapply it on sparse boards (deep-reveal eval, 2026-06-25). This is
  // the same remedy already applied to major_threat / minor_threat.
  major_threat:    { id: 'allen-major-threat' },
  minor_threat:    { id: 'allen-minor-threat' },
  gravity_top:     { id: 'community-gravity-top' },
  parity:          { id: 'allen-parity' },
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
      statementLines.push(line.replace(/^ {2}/, ''));
    }
    return statementLines.join('\n').trim() || null;
  } catch {
    return null;
  }
}

/**
 * Extracts a block-scalar frontmatter field (e.g. `short_summary` or
 * `short_summary_es`) from a KB article's YAML frontmatter.
 * Returns null if the file cannot be read or the field is missing.
 */
function _loadKBFieldRaw(id, field) {
  try {
    const text = readFileSync(join(KB_DIR, `${id}.md`), 'utf8');
    const fmMatch = text.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) return null;
    const fm = fmMatch[1];
    const lines = fm.split('\n');
    let inField = false;
    const out = [];
    const re = new RegExp(`^${field}:\\s*\\|`);
    for (const line of lines) {
      if (!inField) { if (re.test(line)) inField = true; continue; }
      if (line.length > 0 && !/^\s/.test(line)) break;
      out.push(line.replace(/^ {2}/, ''));
    }
    return out.join('\n').trim() || null;
  } catch {
    return null;
  }
}

/**
 * Extracts the `short_summary` field from a KB article's YAML frontmatter,
 * localized when `locale === 'es'` and a `short_summary_es` field is present.
 * Falls back to English `short_summary` (same id, then alias resolution)
 * when the localized field is missing. Returns null only when no English
 * summary is available either.
 */
export function loadKBShortSummary(id, locale = 'en') {
  // Resolve the alias (e.g. 'claimeven' -> 'allis-claimeven') once; PATTERN_KB keys are
  // caller-facing pattern names, but the localized field lives on the resolved KB file,
  // so both the localized and English lookups below must go through the same resolved
  // slug, not just the caller's raw id.
  const kb = PATTERN_KB[id];
  const resolvedId = kb ? kb.id : id;
  if (locale === 'es') {
    const localized = _loadKBFieldRaw(resolvedId, 'short_summary_es');
    if (localized !== null) return localized;
  }
  return _loadKBFieldRaw(resolvedId, 'short_summary');
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

  return callOpenAIChat(prompt, {
    model,
    apiKey,
    endpoint: 'run-eval',
    userId: null,
    purpose: 'offline-eval',
    maxCompletionTokens: 400,
    useJsonFormat: false,
  });
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
  playedCell,             // 1-indexed cNrM where the played disc landed; undefined = not provided
  bestCell,               // 1-indexed cNrM where the better move lands; undefined = not provided
  kbTermsSection,         // pre-formatted KB term definitions section (from buildExplainContext)
  threatComparisonSection, // pre-formatted threat count diff (from buildExplainContext)
  lookaheadSection,       // pre-formatted sparse-board forward look-ahead section
  openingSection,         // pre-formatted opening-provenance reason (named book-line deviation)
  centerDominanceSection, // pre-formatted opening center-dominance reason (no-structure path)
}) {
  const perspective = playerName === 'Green' ? 1 : 2;
  const winningParity = perspective === 1 ? 'ODD' : 'EVEN';
  const winningRows = perspective === 1 ? '1,3,5' : '2,4,6';
  const losingRows  = perspective === 1 ? '2,4,6' : '1,3,5';

  const isBlunder = tag !== null && direction !== null && humanReason !== null;

  const LANGUAGE_RULE = `**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".`;

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
  if (playedCell) {
    contextLines.push(`- Your move placed a disc on ${playedCell}.`);
  }
  if (isBlunder && contrastCol !== undefined) {
    contextLines.push(`- Better move: column ${contrastCol + 1}`);
  }
  if (isBlunder && bestCell) {
    contextLines.push(`- The better move places a disc on ${bestCell}.`);
  }
  if (isBlunder) {
    contextLines.push(`- Key insight: ${humanReason}`);
    if (tag === 'forced_win' && contrastCol !== undefined) {
      const mechanism = direction === 'missed_own'
        ? `Column ${contrastCol + 1} would have started a forced win — a sequence of moves that guarantees a win regardless of your opponent's defense.`
        : `Your move gave your opponent a forced win — a sequence of forcing moves that guarantees their win regardless of your defense. Column ${contrastCol + 1} would have kept this sequence unavailable.`;
      contextLines.push(`- Pattern mechanism: ${mechanism}`);
    }
  } else {
    contextLines.push(`- Key insight: ${positiveReason ?? 'This was the strongest move available.'}`);
  }
  sections.push(contextLines.join('\n'));

  // ── Opening theory (named book-line deviation) ────────────────────────────
  // Provenance frame: it states the book line + the deviation and DEFERS the why-it-loses to the
  // tactical sections below. Placed early so it frames the position; it never asserts a tactic.
  if (openingSection) {
    sections.push(openingSection);
  }

  // ── Threat comparison ─────────────────────────────────────────────────────
  if (threatComparisonSection) {
    sections.push(threatComparisonSection);
  }

  // ── What the better move leads to (sparse-board forward look-ahead) ────────
  if (lookaheadSection) {
    sections.push(lookaheadSection);
  }

  // ── Why the better move is stronger (opening center-dominance reason) ──────
  if (centerDominanceSection) {
    sections.push(centerDominanceSection);
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
  groundingLines.push('Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT\'s only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT\'s threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.');
  if (tag === 'drawing_move') {
    groundingLines.push('The move you played results in a draw, but a stronger move was available — explain what that better move would have secured. Do NOT claim the position AFTER your move is winning for you or for your opponent; describe only what the better move would have held or built. (A better move may itself have been stronger than a draw — do not deny that a better option existed.)');
  }
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
    // Build strategic cells list, grouped by owner so the LLM never guesses whose
    // threat a cell belongs to (non-validationOnly, cell-type entries only).
    const yourCells = [];
    const oppCells = [];
    const unlabeledCells = [];
    for (const entry of allowedSet) {
      if (entry.validationOnly) continue;
      if (entry.cells && entry.cells.length > 0) {
        const bucket = entry.owner === 'you' ? yourCells
                     : entry.owner === 'opponent' ? oppCells
                     : unlabeledCells;
        bucket.push(...entry.cells);
      }
    }
    if (yourCells.length + oppCells.length + unlabeledCells.length > 0) {
      groundingLines.push('### Strategic reference cells');
      groundingLines.push('These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.');
      if (yourCells.length > 0)      groundingLines.push(`- YOUR threat cells: [${yourCells.join(', ')}]`);
      if (oppCells.length > 0)       groundingLines.push(`- YOUR OPPONENT's threat cells: [${oppCells.join(', ')}]`);
      if (unlabeledCells.length > 0) groundingLines.push(`- Other reference cells (ownership not determined — do not assert who owns these): [${unlabeledCells.join(', ')}]`);
    } else if (lookaheadSection) {
      // Sparse look-ahead fired: the future cells are validation-only (so they don't
      // appear as Strategic reference cells), but the model MUST still point at the
      // structure via the zone tag(s) in the look-ahead section. Do NOT tell it to stay
      // vague here — that instruction directly defeated the feature.
      groundingLines.push('Specific present-board cells are not pre-listed here. To point at the future follow-up, use the zone tag(s) provided in the "What the better move leads to" section above — they mark the exact square(s) where it would form.');
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
  formatLines.push('Syntax (use EXACTLY these patterns):');
  formatLines.push('  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]');
  formatLines.push('  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]');
  formatLines.push('  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)');
  formatLines.push('  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]');
  formatLines.push('');
  formatLines.push('IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].');
  formatLines.push('IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].');
  formatLines.push('IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.');
  formatLines.push('');
  if (kbTermsSection) {
    formatLines.push('When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:');
    formatLines.push('  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.');
    formatLines.push('  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.');
    formatLines.push('  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].');
    formatLines.push('');
  }
  formatLines.push('When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.');
  formatLines.push('Only tag EXPLICIT spatial references. Do not tag abstract concepts.');
  formatLines.push('Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).');
  sections.push(formatLines.join('\n'));

  // ── Task ──────────────────────────────────────────────────────────────────
  if (isBlunder) {
    // Only ask the model to NAME a tactical pattern when one is actually grounded in
    // the prompt: a KB term fired, a threat row is shown, the forward look-ahead fired,
    // or pattern cells are whitelisted (allowedSet). Otherwise telling it to "name the
    // pattern" with no instance present makes it fabricate one (deep-reveal eval).
    const hasGroundedPattern = Boolean(kbTermsSection) || Boolean(threatComparisonSection)
      || Boolean(lookaheadSection) || allowedSet !== null;
    const patternInstruction = hasGroundedPattern
      ? 'Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above).'
      : 'Do not invent tactical concept names — describe only what you can see changing between the two boards.';
    sections.push(`## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
${patternInstruction} Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play.${openingSection ? ' An "## Opening theory" section above frames this position on a known book line — either you (the first player) left a winning plan and it names the column that keeps the win, OR you are the second player on a first-player-win line and your job is to hold the toughest defense and wait for a slip. Lead with whichever frame that section states; name the opening only as given, do not invent a name, and for the defender do NOT claim you are building a win.' : ''}${centerDominanceSection ? ' A "## Why the better move is stronger" section above gives the concrete reason for THIS position — build your explanation on it (centrality / number of winning lines), do not substitute a vaguer one.' : ''} Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.`);
  } else {
    sections.push(`## Task
In 2–3 sentences: explain why this was a strong move, using the key insight as your starting point.
Name the tactical pattern or strategic benefit it creates. Scaled to the eval gap: for a small gap,
acknowledge both moves have merit; for a large gap, highlight what this move uniquely achieves.`);
  }

  // No section may be rendered with an empty body. A section is "informationally
  // empty" when everything after its `## Heading` line (ignoring blank lines) is
  // whitespace — such a section conveys nothing and primes the LLM to invent content.
  // This is a structural property of the whole prompt, not a per-section special case.
  const nonEmptySections = sections.filter((s) => {
    if (s == null) return false;
    const text = String(s);
    // Strip a single leading `## Heading` line, then check for any real content.
    const body = text.replace(/^\s*#{1,6}[^\n]*\n?/, '');
    return body.trim().length > 0;
  });

  return nonEmptySections.join('\n\n');
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
