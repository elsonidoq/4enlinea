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
  const logits = legalCols.map(c => scores[c] / T);
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

// T023: Cat 5 Zugzwang depth filter + PV trace (FR-015b/c)
// Returns null if depth filter R > 6 (candidate should be discarded)
async function computeCat5Highlight(solver, moveString, scores) {
  const heights = getHeights(moveString);
  const moveCount = moveString.length;
  const legalScores = [];
  for (let c = 0; c < COLS; c++) {
    if (heights[c] < ROWS) legalScores.push(scores[c]);
  }
  if (legalScores.length === 0) return null;
  const maxScore = Math.max(...legalScores);
  const R = (43 - 2 * Math.abs(maxScore)) - moveCount;
  if (R > 6) return null;

  const K = 6;
  const cells = [];
  let ms = moveString;

  function argmaxLegal(sc, moveStr) {
    const h = getHeights(moveStr);
    let best = null;
    for (let c = 0; c < COLS; c++) {
      if (h[c] >= ROWS) continue;
      if (best === null || sc[c] > sc[best]) { best = c; continue; }
      if (sc[c] === sc[best]) {
        const da = Math.abs(c - 3), db = Math.abs(best - 3);
        if (da < db || (da === db && c < best)) best = c;
      }
    }
    return best;
  }

  while (cells.length < K) {
    let sc;
    try { sc = await solver.query(ms); } catch { break; }
    const loserCol = argmaxLegal(sc, ms);
    if (loserCol === null) break;
    cells.push({ col: loserCol, row: getHeights(ms)[loserCol], role: 'loser' });
    ms += (loserCol + 1).toString();
    if (isGameOver(ms)) break;
    if (cells.length >= K) break;

    let sc2;
    try { sc2 = await solver.query(ms); } catch { break; }
    const winnerCol = argmaxLegal(sc2, ms);
    if (winnerCol === null) break;
    cells.push({ col: winnerCol, row: getHeights(ms)[winnerCol], role: 'winner' });
    ms += (winnerCol + 1).toString();
    if (isGameOver(ms)) break;
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

// T025: Cat 7 — first forbidden column hint
function computeCat7Highlight(moveString, scores) {
  const heights = getHeights(moveString);
  const moveCount = moveString.length;
  const opponentWinScore = -Math.ceil((41 - moveCount) / 2);
  for (let c = 0; c < COLS; c++) {
    if (heights[c] < ROWS && scores[c] === opponentWinScore) {
      return [{ col: c, row: heights[c], role: 'hint' }];
    }
  }
  return [];
}

async function computeHighlightCells(category, moveString, scores, correctCols, solver) {
  if (category >= 1 && category <= 3) return computeCat123Highlight(moveString, correctCols);
  if (category === 4) return computeCat4Highlight(moveString, correctCols);
  if (category === 5) return computeCat5Highlight(solver, moveString, scores);
  if (category === 6) return computeCat6Highlight(moveString);
  if (category === 7) return computeCat7Highlight(moveString, scores);
  return [];
}

async function solverWeightedPosition(solver, targetLen, rng) {
  const T1 = rng() * 2 + 0.1;
  const T2 = rng() * 2 + 0.1;
  const temps = [T1, T2];
  let moveString = '';
  const heights = Array(COLS).fill(0);
  const board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  let player = 1;
  const plies = [];

  for (let i = 0; i < targetLen; i++) {
    const legal = [];
    for (let c = 0; c < COLS; c++) {
      if (heights[c] < ROWS) legal.push(c);
    }
    if (legal.length === 0) return null;

    const scores = await solver.query(moveString);
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
    if (hasWon(board, player)) {
      return { moveString, trace: { temperature_p1: T1, temperature_p2: T2, termination: 'win', plies } };
    }
    player = 3 - player;
  }
  const termination = moveString.length === ROWS * COLS ? 'draw' : 'max_moves';
  return { moveString, trace: { temperature_p1: T1, temperature_p2: T2, termination, plies } };
}

// Check whether the current position satisfies the category predicate.
// Returns { passes, correctCols }.
function checkPredicate(category, moveString, scores) {
  const puzzle = { category, moveString };
  const heights = getHeights(moveString);
  const legalCols = [];
  for (let c = 0; c < COLS; c++) {
    if (heights[c] < ROWS) legalCols.push(c);
  }
  if (legalCols.length === 0) return { passes: false, correctCols: [] };

  if (category === 7) {
    // Cat 7: passes if ≥1 forbidden column AND ≥1 safe column
    const result = evaluatePredicate(puzzle, legalCols[0], scores);
    const forbidden = result.forbiddenCols ?? [];
    const safeCols = legalCols.filter(c => !forbidden.includes(c));
    return {
      passes: forbidden.length >= 1 && safeCols.length >= 1,
      correctCols: safeCols,
    };
  }

  // Cats 1–6: exactly one legal column must return 'correct'
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

  // Rejection counters for diagnosing category 5 (Zugzwang)
  const stats = {
    tooShort: 0,
    predicateFail: 0,
    notClean: 0,
    depthFilter: 0,
    accepted: 0,
  };

  try {
    while (candidates.length < count && attempts < MAX_ATTEMPTS) {
      attempts++;

      const minMoves = 14 + Math.floor(rng() * 21);
      const maxMoves = Math.max(minMoves, category <= 2 ? 20 : 34);
      const result = await solverWeightedPosition(solver, maxMoves, rng);

      if (!result) continue; // board filled with no legal moves
      const { moveString, trace } = result;
      if (moveString.length < minMoves) { stats.tooShort++; continue; }

      let scores;
      try {
        scores = await solver.query(moveString);
      } catch {
        continue;
      }
      if (!scores || scores.length !== COLS) continue;

      // Check predicate at this position
      const { passes, correctCols } = checkPredicate(category, moveString, scores);
      if (!passes) { stats.predicateFail++; }
      else if (!isClean(category, scores, moveString.length)) { stats.notClean++; }
      else {
        const tags = [];
        if (correctCols.length > 0) {
          const cls = classify(moveString, correctCols[0], scores);
          if (cls?.tag) tags.push(cls.tag);
        }
        const highlight_cells = await computeHighlightCells(category, moveString, scores, correctCols, solver);
        if (highlight_cells === null) {
          stats.depthFilter++;
          // Log details when cat 5 depth filter rejects a valid zugzwang
          if (category === 5) {
            const heights = Array(COLS).fill(0);
            for (const ch of moveString) heights[parseInt(ch, 10) - 1]++;
            const legalScores = scores.filter((_, c) => heights[c] < ROWS);
            const maxS = Math.max(...legalScores);
            const R = (43 - 2 * Math.abs(maxS)) - moveString.length;
            console.log(`  [cat5 depth-filter] moves=${moveString.length} maxScore=${maxS} R=${R} scores=[${scores.join(',')}]`);
          }
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
      }

      const now = Date.now();
      if (now - lastLogTime >= LOG_INTERVAL_MS) {
        lastLogTime = now;
        const elapsed = ((now - t0) / 1000).toFixed(1);
        console.log(
          `[generateCandidates cat=${category}] ${elapsed}s | attempt=${attempts}/${MAX_ATTEMPTS} found=${candidates.length}/${count}` +
          ` | rejected: tooShort=${stats.tooShort} predicateFail=${stats.predicateFail} notClean=${stats.notClean} depthFilter=${stats.depthFilter}`
        );
      }
    }
  } finally {
    solver.destroy();
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(
    `[generateCandidates cat=${category}] DONE ${elapsed}s | attempts=${attempts} found=${candidates.length}/${count}` +
    ` | rejected: tooShort=${stats.tooShort} predicateFail=${stats.predicateFail} notClean=${stats.notClean} depthFilter=${stats.depthFilter}`
  );

  return { candidates, seed: usedSeed, durationMs: Date.now() - t0 };
}
