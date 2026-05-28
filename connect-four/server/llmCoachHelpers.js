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

// Placeholder outcomes for IMMEDIATE WIN columns — we skip explainSimulate for
// these because the game ends on the very next move and c4solver rejects positions
// reached through a winning alignment (it would error on the children).
export const IMMEDIATE_WIN_OUTCOMES = {
  total: 1, wonByPerspective: 1, wonByOpponent: 0, draws: 0,
  perspectiveLeaves: 0, winRate: 1, lossRate: 0, drawRate: 0,
};

// Maps each pattern name to a KB article slug under docs/knowledge-base/,
// or to an inline string for patterns that have no dedicated KB entry.
// Only entries for patterns with ratio > 0 in any column are loaded at runtime.
export const PATTERN_KB = {
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
  forced_win:     { id: 'derived-lost-position' },
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
    entries.push(`### ${name}\n${statement}`);
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
      `${firstName.padEnd(PATTERN_W)} ${firstEntry.ratio.toFixed(2).padStart(RATIO_W)}  ${top2String(firstEntry)}`
    );

    for (let i = 1; i < nonZero.length; i++) {
      const [name, entry] = nonZero[i];
      rows.push(
        `${blankPrefix}${name.padEnd(PATTERN_W)} ${entry.ratio.toFixed(2).padStart(RATIO_W)}  ${top2String(entry)}`
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
 * Ordered list of tactical pattern names used by computeDeltaTable.
 */
export const PATTERN_NAMES = [
  'double_threat', 'j_shape', 'figure_7', 'claimeven',
  'baseclaim', 'before', 'specialbefore',
  'undercut', 'overcut', 'z_threat', 'forced_win',
];

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
 * Compare user move patterns vs contrast move patterns.
 * Returns { rows, insufficientTacticalData }.
 *
 * Each row: { name, userRatio, contrastRatio, delta, userTop2, contrastTop2 }
 * where Top2 is a short string of the top-2 histogram entries.
 * Rows are sorted by delta descending.
 */
export function computeDeltaTable(userPatterns, contrastPatterns) {
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
export function buildExplainPrompt({
  boardViz, postBoardViz, afterOpponentBoardViz, opponentResponseCol,
  userCol, contrastCol, isOptimal,
  deltaRows, insufficientTacticalData, allLinesDecided,
  rounds, totalLeaves, userOutcomes, contrastOutcomes,
  kbSection, playerName, positionTier,
  forcedBlockNote, blunderNote,
  userExamplesByPattern,
}) {
  const opponentName = playerName === 'Red' ? 'Yellow' : 'Red';

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
      const n  = r.name.padEnd(18);
      const ur = r.userRatio.toFixed(2).padStart(6);
      const cr = r.contrastRatio.toFixed(2).padStart(9);
      const d  = r.delta.toFixed(2).padStart(8);
      const u2 = (r.userTop2 || '—').padEnd(20);
      const c2 = r.contrastTop2 || '—';
      return `${n} ${ur} ${cr} ${d}  ${u2} ${c2}`;
    });
    patternSection = [outcomeLine, header, sep, ...tableRows].join('\n');
  }

  // Move quality label depends on both optimality and game-theoretic position tier.
  // A move is only "strong" if it comes from a winning position; when losing,
  // even the best option cannot be called strong.
  let moveQualityDesc;
  let roleGoal;
  if (positionTier === 'WINNING') {
    moveQualityDesc = isOptimal
      ? `a strong move`
      : `a weaker move than col ${contrastCol + 1}`;
    roleGoal = `give a grounded, concise explanation of why a specific move is ${isOptimal ? 'strong' : 'weak'}`;
  } else if (positionTier === 'DRAWING') {
    moveQualityDesc = isOptimal
      ? `a solid move that preserves the draw`
      : `a move that gives up the drawing advantage (col ${contrastCol + 1} keeps the draw)`;
    roleGoal = `explain how this move ${isOptimal ? 'maintains' : 'throws away'} a drawable position`;
  } else {
    // LOSING — no move can be called "strong"
    moveQualityDesc = isOptimal
      ? `the best available move in a losing position`
      : `a weaker choice in an already losing position (col ${contrastCol + 1} resists longer)`;
    roleGoal = `explain what this move does in an already losing position — do NOT call any move strong`;
  }

  const forcedWinExamples = userExamplesByPattern?.forced_win ?? [];
  let exampleBoardsSection = '';
  if (forcedWinExamples.length > 0) {
    const boards = forcedWinExamples.map((ms, i) => {
      const viz = getBoardVisualization(ms);
      return `### Leaf board ${i + 1} (movestring: ${ms})\n${viz}`;
    });
    exampleBoardsSection =
      `\n## Example boards — forced_win\n` +
      `The simulation reached these positions where ${playerName} faced a forced-win (losing) situation:\n\n` +
      boards.join('\n\n') +
      `\n\nLook at these boards: identify the concrete threats (columns, rows, directions) that leave ${playerName} without a defense. Name them in your explanation.\n`;
  }

  const afterOpponentSection = afterOpponentBoardViz
    ? `\n## Board position (AFTER ${opponentName} responds col ${opponentResponseCol + 1})\n${afterOpponentBoardViz}\n`
    : '';

  return `## Role
You are an expert Connect Four coach. Your goal is to ${roleGoal}.

## Move context
**${playerName}** just played **col ${userCol + 1}**. The boards below show the position before the move, after the move, and after ${opponentName}'s best response. All pattern data and your explanation must be from **${playerName}'s perspective**.
${forcedBlockNote ? `\n⚠️ ${forcedBlockNote}\n` : ''}${blunderNote ? `\n${blunderNote}\n` : ''}
## Board position (BEFORE ${playerName} plays col ${userCol + 1})
${boardViz}

## Board position (AFTER ${playerName} plays col ${userCol + 1})
${postBoardViz}
${afterOpponentSection}
## Pattern comparison (${rounds} round${rounds !== 1 ? 's' : ''} of optimal play, ${totalLeaves} total leaves / ${userOutcomes.perspectiveLeaves} perspective-to-move samples)
${patternSection}
${kbSection ? '\n' + kbSection + '\n' : ''}${exampleBoardsSection}
## Task
Explain in 2–4 sentences why col ${userCol + 1} is ${moveQualityDesc} for **${playerName}**.
Ground your explanation first in the concrete board positions shown above — name specific columns and rows where decisive threats exist. Use the tactical pattern labels as supporting vocabulary, not as the explanation itself. If no pattern data is available, say so honestly and give only a high-level observation from the board position.`;
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

  return `## Role
You are an expert Connect Four coach. Your goal is to recommend which column(s) to play next and explain the strategic reasoning to the player.

Do not mention solver scores or numerical evaluations — reason purely from tactical patterns, score tiers, and the board position.

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
