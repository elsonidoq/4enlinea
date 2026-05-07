import { evaluatePredicate } from './predicates.js';
import { classify, checkWin, countWinningThreats } from './classifier.js';
import { createSolverProcess } from './c4solver-wrapper.js';
const ROWS = 6;
const COLS = 7;
const EMPTY_BOARD_SCORES = [0, 0, 1, 2, 1, 0, 0];

// mulberry32 PRNG — 4 lines, no dependency
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function softmaxSample(legalCols, scores, T, rng) {
  const raw = legalCols.map(c => scores[c]);
  const minS = Math.min(...raw);
  const maxS = Math.max(...raw);
  const range = maxS - minS;
  const normalized = range === 0
    ? raw.map(() => 0)
    : raw.map(s => (s - minS) / range * 2 - 1);
  const logits = normalized.map(n => n / T);
  const maxLogit = Math.max(...logits);
  const weights = logits.map(l => Math.exp(l - maxLogit));
  const total = weights.reduce((a, b) => a + b, 0);
  const probs = weights.map(w => w / total);

  let r = rng(), cum = 0;
  for (let j = 0; j < legalCols.length; j++) {
    cum += probs[j];
    if (r < cum) return legalCols[j];
  }
  return legalCols[legalCols.length - 1];
}

function immediateWinScore(moveCount) {
  return Math.floor((42 - moveCount) / 2);
}

function getHeights(moveString) {
  const heights = Array(COLS).fill(0);
  for (const ch of moveString) heights[parseInt(ch, 10) - 1]++;
  return heights;
}

// Build a 2D board array from a move string. board[row][col], row 0 = bottom.
// Returns null if any column is overfilled.
function buildBoard(moveString) {
  const board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  const heights = Array(COLS).fill(0);
  let player = 1;
  for (const ch of moveString) {
    const col = parseInt(ch, 10) - 1;
    if (heights[col] >= ROWS) return null;
    board[heights[col]][col] = player;
    heights[col]++;
    player = 3 - player;
  }
  return board;
}

// Return true if `player` (1 or 2) has four in a row on `board`.
function hasWon(board, player) {
  const DIRS = [[0,1],[1,0],[1,1],[1,-1]];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] !== player) continue;
      for (const [dr, dc] of DIRS) {
        let len = 1;
        while (len < 4) {
          const nr = r + dr * len, nc = c + dc * len;
          if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || board[nr][nc] !== player) break;
          len++;
        }
        if (len === 4) return true;
      }
    }
  }
  return false;
}

// Return true if the position is finished (someone won or board is full).
function isGameOver(moveString) {
  const board = buildBoard(moveString);
  if (!board) return true;
  return hasWon(board, 1) || hasWon(board, 2) || moveString.length === ROWS * COLS;
}

function copyBoard(board) {
  return board.map(row => [...row]);
}

// T021: Cat 1/2/3 — single hint cell
function computeCat123Highlight(moveString, correctCols) {
  if (correctCols.length === 0) return [];
  const heights = getHeights(moveString);
  const col = correctCols[0];
  return [{ col, row: heights[col], role: 'hint' }];
}

// T022: Cat 4 Fork Setup highlight (FR-015a)
function computeCat4Highlight(moveString, correctCols) {
  if (correctCols.length === 0) return [];
  const C = correctCols[0];
  const board0 = buildBoard(moveString);
  if (!board0) return [];
  const H0 = getHeights(moveString);
  if (H0[C] >= ROWS) return [];
  const currentPlayer = moveString.length % 2 === 0 ? 1 : 2;

  const setupCell = { col: C, row: H0[C], role: 'hint' };
  const B1 = copyBoard(board0);
  const H1 = [...H0];
  B1[H1[C]][C] = currentPlayer;
  H1[C]++;

  const forkCandidates = [];
  for (let f = 0; f < COLS; f++) {
    if (H1[f] >= ROWS) continue;
    const B2f = copyBoard(B1);
    const H2f = [...H1];
    B2f[H2f[f]][f] = currentPlayer;
    H2f[f]++;
    const count = countWinningThreats(B2f, H2f, currentPlayer);
    if (count >= 2) forkCandidates.push({ f, count });
  }

  if (forkCandidates.length === 0) return [setupCell];

  forkCandidates.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    const da = Math.abs(a.f - 3), db = Math.abs(b.f - 3);
    if (da !== db) return da - db;
    return a.f - b.f;
  });
  const forkCol = forkCandidates[0].f;
  const forkCell = { col: forkCol, row: H1[forkCol], role: 'hint' };

  const B2 = copyBoard(B1);
  const H2 = [...H1];
  B2[H2[forkCol]][forkCol] = currentPlayer;
  H2[forkCol]++;

  const threatCells = [];
  for (let t = 0; t < COLS; t++) {
    if (H2[t] >= ROWS) continue;
    B2[H2[t]][t] = currentPlayer;
    if (checkWin(B2, H2[t], t, currentPlayer)) {
      threatCells.push({ col: t, row: H2[t], role: 'threat' });
    }
    B2[H2[t]][t] = 0;
  }

  return [setupCell, forkCell, ...threatCells];
}

// Returns the single forced-block column for the current player, or null if not strictly forced.
// "Forced" means exactly one legal col has score > opponentImmediateWin (the blocking col,
// which may still be a losing score — Yellow is losing but not immediately) and all others
// equal opponentImmediateWin (Red wins immediately if Yellow plays there).
// Note: the blocking col score must be NEGATIVE (< 0) for Red to be winning at ms2.
// Using >= 0 was wrong: it required Yellow to be non-losing, making Red unable to win at ms2.
function getForcedBlock(moveString, scores) {
  const moveCount = moveString.length;
  const heights = getHeights(moveString);
  const opponentImmediateWin = -Math.floor((41 - moveCount) / 2);

  const betterThanImmediateLoss = [];
  for (let c = 0; c < COLS; c++) {
    if (heights[c] >= ROWS) continue;
    if (scores[c] > opponentImmediateWin) {
      betterThanImmediateLoss.push(c);
    }
    // scores[c] === opponentImmediateWin: immediate loss — skip
    // scores[c] < opponentImmediateWin: impossible for legal cols, skip
  }
  if (betterThanImmediateLoss.length !== 1) return null;
  return betterThanImmediateLoss[0];
}

// Recursively trace a zugzwang sequence starting with Red playing redCol on ms.
// Returns an array [redCol, yellowCol, ..., finalWinnerCol] or null.
// depth = number of Red plays so far (starts at 1, max 4).
//
// Two cases after Red plays redCol → ms1 (Yellow's turn):
//   Case A (double/multi-threat terminal): ALL Yellow legal cols score == oiw1.
//     Yellow plays any col → ms2 → Red wins immediately.  ← terminal
//   Case B (single forced block): EXACTLY ONE Yellow col scores > oiw1, others == oiw1.
//     Yellow must play that col → ms2 → recurse at ms2.
//
// Case A is the terminal: after any Yellow move Red wins immediately (sign-flip: oiw1 = -winScore2).
// Case B recurses, building up forced moves until Case A is reached.
async function traceZugzwang(ms, redCol, depth, solver) {
  const indent = '  '.repeat(depth);
  console.log(`${indent}[depth=${depth}] traceZugzwang ms="${ms}" redCol=${redCol+1}`);

  const ms1 = ms + (redCol + 1);
  if (isGameOver(ms1)) { console.log(`${indent}  → game over after redCol, return null`); return null; }
  let scores1;
  try { scores1 = await solver.query(ms1); } catch { console.log(`${indent}  → solver error, return null`); return null; }

  const oiw1 = -Math.floor((41 - ms1.length) / 2);
  const heights1 = getHeights(ms1);
  console.log(`${indent}  ms1="${ms1}" oiw1=${oiw1} scores1=[${scores1.join(', ')}]`);

  // Classify each legal opponent col.
  // score >= oiw1: opponent has at least one immediate threat to deal with (possible forced block).
  // score < oiw1: initiator already has multiple threats — no block is possible.
  const betterCols = [];
  let allForced = true;
  let hasLegal = false;
  for (let c = 0; c < COLS; c++) {
    if (heights1[c] >= ROWS) continue;
    hasLegal = true;
    if (scores1[c] >= oiw1) { betterCols.push(c); allForced = false; }
  }
  console.log(`${indent}  allForced=${allForced} betterCols(1-indexed)=[${betterCols.map(x=>x+1).join(', ')}]`);
  if (!hasLegal) return null;

  // Case A: all opponent cols score < oiw1 → multi-threat terminal, initiator wins after any reply.
  // Find initiator's immediate winning threat directly on the board: the opponent is forced to
  // play into that column, and the initiator wins by playing there next (one row higher).
  if (allForced) {
    console.log(`${indent}  → Case A`);
    const board1 = buildBoard(ms1);
    const redPlayer = ms.length % 2 === 0 ? 1 : 2;
    for (let wc = 0; wc < COLS; wc++) {
      if (heights1[wc] >= ROWS) continue;
      board1[heights1[wc]][wc] = redPlayer;
      const wins = checkWin(board1, heights1[wc], wc, redPlayer);
      board1[heights1[wc]][wc] = 0;
      if (wins) {
        console.log(`${indent}    Red threat at col ${wc+1}, opponent forced there, initiator wins`);
        return [redCol, wc, wc];
      }
    }
    console.log(`${indent}  → Case A: no direct threat found, return null`);
    return null;
  }

  // Case B: exactly one opponent col avoids immediate multi-threat → forced block, recurse.
  if (betterCols.length !== 1) {
    console.log(`${indent}  → Case B fail: ${betterCols.length} betterCols, return null`);
    return null;
  }
  const yellowCol = betterCols[0];
  console.log(`${indent}  → Case B: forced block col ${yellowCol+1}`);

  const ms2 = ms1 + (yellowCol + 1);
  if (isGameOver(ms2)) { console.log(`${indent}  → game over after forced block, return null`); return null; }
  if (depth >= 4) { console.log(`${indent}  → max depth, return null`); return null; }

  const heights2 = getHeights(ms2);
  for (let c = 0; c < COLS; c++) {
    if (heights2[c] >= ROWS) continue;
    const subTrace = await traceZugzwang(ms2, c, depth + 1, solver);
    if (subTrace !== null) return [redCol, yellowCol, ...subTrace];
  }
  console.log(`${indent}  → no sub-trace found, return null`);
  return null;
}

// Cat 5 predicate: exactly one column initiates a valid zugzwang sequence.
export async function checkCat5Predicate(ms, solver) {
  const heights = getHeights(ms);
  const redPlayer = ms.length % 2 === 0 ? 1 : 2;
  const correctCols = [];
  for (let c = 0; c < COLS; c++) {
    if (heights[c] >= ROWS) continue;
    const trace = await traceZugzwang(ms, c, 1, solver);
    if (trace === null) continue;
    let msEnd = ms;
    for (const col of trace) msEnd += (col + 1);
    const boardEnd = buildBoard(msEnd);
    if (boardEnd && hasWon(boardEnd, redPlayer)) correctCols.push(c);
  }
  return { passes: correctCols.length === 1, correctCols };
}

// Cat 7 predicate: at least one column is forbidden (opponent wins immediately after it).
export async function checkCat7Predicate(ms, solver) {
  const heights = getHeights(ms);
  const legalCols = [];
  for (let c = 0; c < COLS; c++) {
    if (heights[c] < ROWS) legalCols.push(c);
  }
  if (legalCols.length === 0) return { passes: false, correctCols: [] };

  const forbiddenCols = [];
  for (const c of legalCols) {
    const ms1 = ms + (c + 1);
    let scores1;
    try { scores1 = await solver.query(ms1); } catch { continue; }
    const winScore = immediateWinScore(ms1.length);
    if (winScore > 0 && Math.max(...scores1) >= winScore) {
      forbiddenCols.push(c);
    }
  }

  const safeCols = legalCols.filter(c => !forbiddenCols.includes(c));
  return {
    passes: forbiddenCols.length >= 1 && safeCols.length >= 1,
    correctCols: safeCols,
  };
}

// T023: Cat 5 Zugzwang highlight — trace forced sequence from the initiating move.
export async function computeCat5Highlight(solver, moveString, correctCols) {
  if (correctCols.length === 0) return [];

  const redCol = correctCols[0];
  const trace = await traceZugzwang(moveString, redCol, 1, solver);
  if (!trace) return [];

  const cells = [];
  let ms = moveString;

  for (let i = 0; i < trace.length; i++) {
    const col = trace[i];
    const h = getHeights(ms);
    if (h[col] >= ROWS) break;

    const isLast = (i === trace.length - 1);
    const isRedTurn = (i % 2 === 0);

    if (isLast) {
      cells.push({ col, row: h[col], role: 'winner' });
    } else if (isRedTurn) {
      cells.push({ col, row: h[col], role: 'hint' });
    } else {
      cells.push({ col, row: h[col], role: 'loser' });
    }

    ms += (col + 1);
  }

  return cells;
}

// T024: Cat 6 Parity Control highlight (FR-015d)
function computeCat6Highlight(moveString) {
  const board0 = buildBoard(moveString);
  if (!board0) return [];
  const heights = getHeights(moveString);
  const currentPlayer = moveString.length % 2 === 0 ? 1 : 2;
  const opponent = 3 - currentPlayer;

  const liveThreats = [];
  for (let c = 0; c < COLS; c++) {
    for (let r = heights[c]; r < ROWS; r++) {
      if ((r - heights[c]) % 2 !== 0) continue;
      const board = copyBoard(board0);
      board[r][c] = currentPlayer;
      if (!checkWin(board, r, c, currentPlayer)) continue;
      board[r][c] = 0; // restore before undercut check
      if (r > heights[c]) {
        board[r - 1][c] = opponent;
        if (checkWin(board, r - 1, c, opponent)) continue;
      }
      liveThreats.push({ col: c, row: r });
    }
  }

  if (liveThreats.length === 0) return [];

  const cells = [];
  for (const { col: c, row: r } of liveThreats) {
    cells.push({ col: c, row: r, role: 'threat' });
    if (r > heights[c]) cells.push({ col: c, row: r - 1, role: 'support' });
  }
  return cells;
}

// T025: Cat 7 — safe column hint (correctCols[0] is the safe col to play)
function computeCat7Highlight(moveString, correctCols) {
  if (correctCols.length === 0) return [];
  const heights = getHeights(moveString);
  const col = correctCols[0];
  return [{ col, row: heights[col], role: 'hint' }];
}

async function computeHighlightCells(category, moveString, scores, correctCols, solver) {
  if (category >= 1 && category <= 3) return computeCat123Highlight(moveString, correctCols);
  if (category === 4) return computeCat4Highlight(moveString, correctCols);
  if (category === 5) return computeCat5Highlight(solver, moveString, correctCols);
  if (category === 6) return computeCat6Highlight(moveString);
  if (category === 7) return computeCat7Highlight(moveString, correctCols);
  return [];
}

// Simulate a softmax-weighted game up to maxMoves plies, calling onPosition(moveString, scores)
// after each solver query. Returns { moveString, scores, trace } on first match, null otherwise.
async function solverWeightedPosition(solver, maxMoves, rng, onPosition) {
  const T1 = rng() * 4 + 0.1;
  const T2 = rng() * 4 + 0.1;
  const temps = [T1, T2];
  let moveString = '';
  const heights = Array(COLS).fill(0);
  const board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  let player = 1;
  const plies = [];

  for (let i = 0; i < maxMoves; i++) {
    const legal = [];
    for (let c = 0; c < COLS; c++) {
      if (heights[c] < ROWS) legal.push(c);
    }
    if (legal.length === 0) return null;

    const scores = await solver.query(moveString);

    if (await onPosition(moveString, scores)) {
      return { moveString, scores, trace: { temperature_p1: T1, temperature_p2: T2, termination: 'predicate_match', plies } };
    }

    const T = temps[player - 1];
    const rawWeights = legal.map(c => Math.exp(scores[c] / T));
    const total = rawWeights.reduce((a, b) => a + b, 0);
    const probs = Array(COLS).fill(0);
    legal.forEach((c, j) => { probs[c] = rawWeights[j] / total; });

    const col = softmaxSample(legal, scores, T, rng);
    plies.push({ ply: i, player, scores: [...scores], weights: probs, sampled_col: col });

    board[heights[col]][col] = player;
    heights[col]++;
    moveString += (col + 1).toString();
    if (hasWon(board, player)) return null;
    player = 3 - player;
  }
  return null;
}

// Check whether the current position satisfies the category predicate.
// Returns { passes, correctCols }.
async function checkPredicate(category, moveString, scores, solver) {
  if (category === 5) return checkCat5Predicate(moveString, solver);
  if (category === 7) return checkCat7Predicate(moveString, solver);

  const puzzle = { category, moveString };
  const heights = getHeights(moveString);
  const legalCols = [];
  for (let c = 0; c < COLS; c++) {
    if (heights[c] < ROWS) legalCols.push(c);
  }
  if (legalCols.length === 0) return { passes: false, correctCols: [] };

  // Cats 1–4, 6: exactly one legal column must return 'correct'
  const correctCols = legalCols.filter(c => {
    const r = evaluatePredicate(puzzle, c, scores);
    return r.result === 'correct';
  });
  return { passes: correctCols.length === 1, correctCols };
}

// For cats 2–7: reject if any column would be an immediate win (distractor).
function isClean(category, scores, moveCount) {
  if (category === 1) return true;
  const winScore = immediateWinScore(moveCount);
  return !scores.some(s => s >= winScore && winScore > 0);
}

/**
 * Generate up to `count` puzzle candidates for `category`.
 * Returns { candidates[], seed, durationMs }.
 */
export async function generateCandidates(category, count, seed) {
  const usedSeed = seed !== undefined ? seed : Math.floor(Math.random() * 2 ** 32);
  console.log('generateCandidates called', { category, count, seed: usedSeed });
  const rng = mulberry32(usedSeed);
  const t0 = Date.now();

  const solver = createSolverProcess();

  const candidates = [];
  let attempts = 0;
  const MAX_ATTEMPTS = 400;
  let lastLogTime = t0;
  const LOG_INTERVAL_MS = 5000;

  const stats = { noMatch: 0, depthFilter: 0, accepted: 0 };

  try {
    while (candidates.length < count && attempts < MAX_ATTEMPTS) {
      attempts++;

      const rawMinMoves = 14 + Math.floor(rng() * 21);
      const maxMoves = category <= 2 ? 20 : Math.max(rawMinMoves, 34);
      const minMoves = Math.min(rawMinMoves, maxMoves);

      let matchedCorrectCols = null;
      const onPosition = async (ms, sc) => {
        if (ms.length < minMoves) return false;
        const { passes, correctCols } = await checkPredicate(category, ms, sc, solver);
        if (!passes) return false;
        if (!isClean(category, sc, ms.length)) return false;
        matchedCorrectCols = correctCols;
        return true;
      };

      const result = await solverWeightedPosition(solver, maxMoves, rng, onPosition);
      if (!result) { stats.noMatch++; continue; }

      const { moveString, scores, trace } = result;
      const correctCols = matchedCorrectCols;

      const tags = [];
      if (correctCols.length > 0) {
        const cls = classify(moveString, correctCols[0], scores);
        if (cls?.tag) tags.push(cls.tag);
      }

      const highlight_cells = await computeHighlightCells(category, moveString, scores, correctCols, solver);
      if (highlight_cells === null) {
        stats.depthFilter++;
        continue;
      }

      stats.accepted++;
      candidates.push({
        category,
        move_string: moveString,
        solver_scores: scores,
        classifier_tags: tags,
        debug_trace: trace,
        highlight_cells,
      });

      const now = Date.now();
      if (now - lastLogTime >= LOG_INTERVAL_MS) {
        lastLogTime = now;
        const elapsed = ((now - t0) / 1000).toFixed(1);
        console.log(
          `[generateCandidates cat=${category}] ${elapsed}s | attempt=${attempts}/${MAX_ATTEMPTS} found=${candidates.length}/${count}` +
          ` | noMatch=${stats.noMatch} depthFilter=${stats.depthFilter}`
        );
      }
    }
  } finally {
    solver.destroy();
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(
    `[generateCandidates cat=${category}] DONE ${elapsed}s | attempts=${attempts} found=${candidates.length}/${count}` +
    ` | noMatch=${stats.noMatch} depthFilter=${stats.depthFilter}`
  );

  return { candidates, seed: usedSeed, durationMs: Date.now() - t0 };
}
