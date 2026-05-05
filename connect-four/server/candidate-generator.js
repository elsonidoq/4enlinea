import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { evaluatePredicate } from './predicates.js';
import { classify } from './classifier.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BINARY_PATH = join(__dirname, 'c4solver');
const BOOK_PATH = join(__dirname, '7x6.book');
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
  const maxScore = Math.max(...legalCols.map(c => scores[c]));
  const weights = legalCols.map(c => Math.exp((scores[c] - maxScore) / T));
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

// Persistent solver process — book-accurate, fast via stdin/stdout.
class GeneratorSolver {
  constructor() {
    if (!existsSync(BOOK_PATH)) throw new Error('Opening book not found: ' + BOOK_PATH);
    this.process = spawn(BINARY_PATH, ['-a', '-b', BOOK_PATH], { cwd: __dirname });
    this.queue = [];
    this.buffer = '';

    this.process.stdout.on('data', (data) => {
      this.buffer += data.toString();
      const lines = this.buffer.split('\n');
      this.buffer = lines.pop();
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const parts = trimmed.split(/\s+/);
        const scores = parts.slice(1).map(Number);
        const entry = this.queue.shift();
        if (entry) entry.resolve(scores);
      }
    });

    this.process.stderr.on('data', () => {});

    this.process.on('exit', () => {
      for (const entry of this.queue) entry.reject(new Error('Solver exited'));
    });
  }

  query(moves) {
    this._pending = (this._pending || Promise.resolve()).then(() =>
      new Promise((resolve, reject) => {
        this.queue.push({ resolve, reject });
        this.process.stdin.write(moves + '\n');
      })
    );
    return this._pending;
  }

  destroy() {
    try { this.process.kill(); } catch {}
  }
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

async function solverWeightedPosition(solver, targetLen, rng) {
  const T1 = rng() * .05;
  const T2 = rng() * .05;
  console.log(T1);
  const temps = [T1, T2];
  let moveString = '';
  const heights = Array(COLS).fill(0);
  const board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  let player = 1;

  for (let i = 0; i < targetLen; i++) {
    const legal = [];
    for (let c = 0; c < COLS; c++) {
      if (heights[c] < ROWS) legal.push(c);
    }
    if (legal.length === 0) return null;

    const scores = await solver.query(moveString);
    const col = softmaxSample(legal, scores, temps[player - 1], rng);

    board[heights[col]][col] = player;
    heights[col]++;
    moveString += (col + 1).toString();
    if (hasWon(board, player)) return null;
    player = 3 - player;
  }
  return moveString;
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
  1/0;
  const usedSeed = seed !== undefined ? seed : Math.floor(Math.random() * 2 ** 32);
  console.log('generateCandidates called', { category, count, seed: usedSeed });
  const rng = mulberry32(usedSeed);
  const t0 = Date.now();

  const solver = new GeneratorSolver();

  const candidates = [];
  let attempts = 0;
  const MAX_ATTEMPTS = 400;

  try {
    while (candidates.length < count && attempts < MAX_ATTEMPTS) {
      attempts++;

      const minMoves = 10;
      const maxMoves = category <= 2 ? 16 : 24;
      const targetLen = minMoves + Math.floor(rng() * (maxMoves - minMoves + 1));
      const moveString = await solverWeightedPosition(solver, targetLen, rng);

      if (moveString === null) continue; // game ended during random playout

      let scores;
      try {
        scores = await solver.query(moveString);
      } catch {
        continue;
      }
      if (!scores || scores.length !== COLS) continue;

      // Check predicate at this position
      const { passes, correctCols } = checkPredicate(category, moveString, scores);
      if (passes && isClean(category, scores, moveString.length)) {
        const tags = [];
        if (correctCols.length > 0) {
          const cls = classify(moveString, correctCols[0], scores);
          if (cls?.tag) tags.push(cls.tag);
        }
        candidates.push({
          category,
          move_string: moveString,
          solver_scores: scores,
          classifier_tags: tags,
        });
      }
    }
  } finally {
    solver.destroy();
  }

  return { candidates, seed: usedSeed, durationMs: Date.now() - t0 };
}
