// sampleWins.mjs — sample optimal winning-line realizations from a won root.
//
// PURELY ADDITIVE EVIDENCE. For a distant parity/zugzwang win, walkOptimal emits exactly ONE
// terminal line; that single window/orientation is an artifact of one walk, not a canonical
// property of the position. This samples the DISTRIBUTION of optimal realizations (orientation,
// completing-cell parity) via seeded random walks so the output is reproducible for the frozen
// eval vectors. Both sides play optimally (argmax score at every node); only the TIE-BREAK among
// argmax columns is randomized. Evidence-only: never wired into toNarratorVector.
import { COLS, INVALID_MOVE, buildBoard, winningWindows, cellStr, parseCell } from './lib/boardUtils.mjs';

// The set of columns achieving the mover's max score (ties included, ascending), minus illegal moves.
// walkOptimal picks optimalCols(scores)[0]; the sampler picks a random element.
export function optimalCols(scores) {
  let best = -Infinity;
  for (let c = 0; c < COLS; c++) { if (scores[c] === INVALID_MOVE) continue; if (scores[c] > best) best = scores[c]; }
  const out = [];
  for (let c = 0; c < COLS; c++) { if (scores[c] !== INVALID_MOVE && scores[c] === best) out.push(c); }
  return out;
}

// Orientation of a solver-realized 4-window (array of cNrM cell strings).
export function orientationOf(window) {
  const pts = window.map(parseCell);
  if (pts.every((p) => p.r === pts[0].r)) return 'horizontal';
  if (pts.every((p) => p.c === pts[0].c)) return 'vertical';
  return 'diagonal';
}

// Deterministic 32-bit FNV-1a hash of a string (seed source).
function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

// mulberry32 PRNG — deterministic given the seed.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function aggregate(samples) {
  const orientation = { horizontal: 0, vertical: 0, diagonal: 0 };
  let odd = 0;
  const byWindow = new Map();
  for (const s of samples) {
    orientation[s.orientation]++;
    if (s.completingParity === 'odd') odd++;
    const key = [...s.window].sort().join('|');
    const prev = byWindow.get(key);
    if (prev) prev.count++;
    else byWindow.set(key, { ...s, count: 1 });
  }
  const lines = [...byWindow.values()].sort((a, b) => b.count - a.count);
  return {
    n: samples.length,
    distinct: lines.length,
    orientation,
    oddCompletingFraction: samples.length ? odd / samples.length : 0,
    lines,
  };
}

// Sample N optimal winning realizations from a root, restricted to wins by `winnerMark`. When
// `winnerMark` is set (the intended side), only that side's forced fours are recorded — a root where
// `winnerMark` has no forced win (a draw, or a loss to the other side) yields ZERO lines. When it is
// null the walk records whichever side completes four (legacy detect-any behaviour). completingParity
// uses the zcount convention (1-indexed row minus occupied count at rootMs) — the same odd/even-threat
// notion attributeParityWin uses in reasonEngine.mjs.
export async function sampleOptimalWins(solver, rootMs, winnerMark, { n = 20 } = {}) {
  const rng = mulberry32(hashStr(rootMs));
  const enforce = winnerMark != null;              // filter samples to winnerMark's own wins
  const { grid: rootGrid, heights: rootHeights } = buildBoard(rootMs);
  // Already-won root: the move that produced rootMs completed a four (e.g. best is an immediate
  // winning drop). The solver REJECTS a terminal position, so we must not query it — the winning
  // line IS that completing window. Return a single-sample distribution (no walk needed) when the
  // winner is the intended side, else empty. This is the only reachable terminal here:
  // opening/mid-game roots are never board-full draws.
  if (rootMs.length) {
    const lastMover = (rootMs.length % 2 === 1) ? 1 : 2;
    const rootWins = winningWindows(rootGrid, lastMover);
    if (rootWins.length) {
      if (enforce && lastMover !== winnerMark) return aggregate([]);
      const lastCol = Number(rootMs[rootMs.length - 1]);
      const window = rootWins[0].map(([rr, cc]) => cellStr(rr, cc));
      const completingCell = cellStr(rootHeights[lastCol] - 1, lastCol);
      return aggregate([{
        window, completingCell, orientation: orientationOf(window),
        completingParity: 'even', pliesToEnd: 0,
      }]);
    }
  }
  const samples = [];
  for (let w = 0; w < n; w++) {
    let cur = rootMs;
    for (let step = 0; step < 50; step++) {
      const scores = await solver.query(cur);
      const cols = optimalCols(scores);
      if (!cols.length) break;
      const col = cols[Math.floor(rng() * cols.length)];
      const mover = (cur.length % 2 === 0) ? 1 : 2;
      const { heights } = buildBoard(cur);
      const r = heights[col];
      cur += String(col);
      const { grid } = buildBoard(cur);
      const wins = winningWindows(grid, mover);
      if (wins.length) {
        // A four ends the walk. Record it only if it belongs to the intended winner; otherwise the
        // intended side has no forced win from this root (e.g. the position is already lost).
        if (!enforce || mover === winnerMark) {
          const window = wins[0].map(([rr, cc]) => cellStr(rr, cc));
          const completingCell = cellStr(r, col);
          const p = parseCell(completingCell);
          const zcount = (p.r + 1) - rootHeights[p.c];
          samples.push({
            window,
            completingCell,
            orientation: orientationOf(window),
            completingParity: zcount % 2 === 1 ? 'odd' : 'even',
            pliesToEnd: cur.length - rootMs.length,
          });
        }
        break;
      }
    }
  }
  return aggregate(samples);
}

// Attach optimalWinSamples to a lostResource half IN PLACE, gated to distant parity wins
// (register 'parity' + a real winning window) — the same class attributeParityWin fires on.
// n defaults to env REASON_WIN_SAMPLES (fallback 40).
export async function attachWinSamples(solver, half, { rootMs, winnerMark, n } = {}) {
  if (!half || half.register !== 'parity' || !half.window) return;
  const count = n ?? parseInt(process.env.REASON_WIN_SAMPLES ?? '40', 10);
  half.optimalWinSamples = await sampleOptimalWins(solver, rootMs, winnerMark, { n: count });
}
