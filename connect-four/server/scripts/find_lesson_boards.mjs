// find_lesson_boards.mjs — DISPOSABLE curation tool (not production code, not in test suite).
// Finds lesson boards by mistake-weighted self-play + structural spec + solver gate.
// See docs/superpowers/plans/2026-07-23-lesson-content-remediation.md (Task 1) for specs' intents.
//
// Usage (from connect-four/):  node server/scripts/find_lesson_boards.mjs <spec> [--count 5] [--seed 42] [--games 400]
import { createSolverProcess } from '../c4solver-wrapper.js';
import { playGame } from '../gameSampling.js';
import { Board, classifyPattern } from '../classifier.js';

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const legalCols = (scores) => [...Array(7).keys()].filter(c => scores[c] > -1000);
const maxScore  = (scores) => Math.max(...legalCols(scores).map(c => scores[c]));

// A "spec" answers: does this position teach the thing? Return null to reject, or
// a detail object (merged into the candidate printout) to accept.
// Every spec receives (pos = {ms, scores, player}, board = new Board(pos.ms), solver).
const SPECS = {

  // L06 s1/s2: latent Gray z-threat, gap EXACTLY 3, not gravity-top, position not
  // already decided against the side to move by more than a normal margin.
  z_threat_gap3: async (pos, board) => {
    if (pos.ms.length < 8 || pos.ms.length > 20) return null;
    for (const [col, rows] of board.reachableThreats(2)) {
      for (const r of rows) {
        const gap = r - board.colHeights[col] + 1;           // inclusive cell count, KB formula
        if (gap === 3) return { col, row: r, gap };
      }
    }
    return null;
  },

  // L06 s3: same shape but gap EXACTLY 2 (the non-z counterexample).
  z_threat_gap2: async (pos, board) => {
    if (pos.ms.length < 8 || pos.ms.length > 20) return null;
    for (const [col, rows] of board.reachableThreats(2)) {
      for (const r of rows) {
        const gap = r - board.colHeights[col] + 1;
        if (gap === 2) return { col, row: r, gap };
      }
    }
    return null;
  },

  // L06 socratic: Gray z-threat (odd gap, latent) in one column AND a Gray threat at the
  // SAME ROW in another column with an even gap — the "same row, opposite ownership" contrast.
  z_threat_socratic: async (pos, board) => {
    if (pos.ms.length % 2 !== 1) return null;                // Gray to move -> learner plays Gray
    const gaps = [];
    for (const [col, rows] of board.reachableThreats(2)) {
      for (const r of rows) {
        const gap = r - board.colHeights[col] + 1;
        if (gap >= 2) gaps.push({ col, row: r, gap });
      }
    }
    const z  = gaps.find(t => t.gap % 2 === 1);
    const nz = gaps.find(t => t.gap % 2 === 0 && z && t.row === z.row && t.col !== z.col);
    return z && nz ? { zthreat: z, distractor: nz } : null;
  },

  // L09 slides/socratic: Allen-T2 adjacent undercut — Gray threat at row R, Green threat
  // at R+1 directly above, SAME column, both latent. Learner side = Gray.
  undercut_t2_adjacent: async (pos, board) => {
    if (pos.ms.length < 10 || pos.ms.length > 22) return null;
    const gray  = board.reachableThreats(2);
    const green = board.reachableThreats(1);
    for (const [col, rows] of gray) {
      for (const r of rows) {
        if ((green.get(col) ?? []).includes(r + 1) && r > board.colHeights[col]) {
          return { col, lower: r, upper: r + 1 };
        }
      }
    }
    return null;
  },

  // L09 s3: same-parity pair (T4 — neither kills the other): opposite owners, same column,
  // rows two apart.
  same_parity_pair: async (pos, board) => {
    if (pos.ms.length < 10 || pos.ms.length > 22) return null;
    const gray  = board.reachableThreats(2);
    const green = board.reachableThreats(1);
    for (const [col, rows] of gray) {
      for (const r of rows) {
        if ((green.get(col) ?? []).includes(r + 2)) return { col, lower: r, upper: r + 2 };
      }
    }
    return null;
  },

  // L03 socratic replacement: side to move can create a double threat, the fork move WINS
  // (max solver score), and the opponent has NO gravity-top threat anywhere (the exact
  // failure of the current board, CRIT X2.2). Learner side = Green (even ply).
  fork_socratic_clean: async (pos, board, solver) => {
    if (pos.ms.length % 2 !== 0) return null;
    if (pos.ms.length < 8 || pos.ms.length > 16) return null;
    const opp = board.reachableThreats(3 - pos.player);
    for (const [col, rows] of opp) {
      if (rows.includes(board.colHeights[col])) return null; // opponent gravity-top threat -> reject
    }
    const best = maxScore(pos.scores);
    if (best <= 0) return null;                              // fork must win, not save
    for (const c of legalCols(pos.scores)) {
      if (pos.scores[c] !== best) continue;
      const tags = await classifyPattern(pos.ms + String(c), pos.player, solver);
      if (tags.has('double_threat')) return { forkCol: c, score: pos.scores[c] };
    }
    return null;
  },
};

async function main() {
  const [specArg, ...rest] = process.argv.slice(2);
  const opt = (name, dflt) => {
    const i = rest.indexOf(`--${name}`);
    return i === -1 ? dflt : Number(rest[i + 1]);
  };
  const count = opt('count', 5), seed = opt('seed', 42), games = opt('games', 400);

  const solver = createSolverProcess();
  const rng = mulberry32(seed);
  let spec = SPECS[specArg];
  if (!spec && specArg?.startsWith('tag:')) {
    const tag = specArg.slice(4);
    spec = async (pos, _board, solver_) => {
      if (pos.ms.length < 8 || pos.ms.length > 24) return null;
      if (maxScore(pos.scores) < 0) return null;             // side to move must not be lost
      const tags = await classifyPattern(pos.ms, pos.player, solver_);
      return tags.has(tag) ? { tag, cells: tags.get(tag).cells } : null;
    };
  }
  if (!spec) {
    console.error(`Unknown spec "${specArg}". Known: ${Object.keys(SPECS).join(', ')}, or tag:<classifier-tag>`);
    process.exit(2);
  }

  const seen = new Set();
  let found = 0;
  for (let g = 0; g < games && found < count; g++) {
    for await (const pos of playGame(solver, rng, { maxMistakeProb: 0.4 })) {
      if (seen.has(pos.ms)) continue;
      const detail = await spec(pos, new Board(pos.ms), solver);
      if (!detail) continue;
      seen.add(pos.ms);
      found++;
      console.log(`\n=== candidate ${found}  ms=${pos.ms}  ply=${pos.ms.length}  toMove=${pos.player === 1 ? 'Green' : 'Gray'}`);
      console.log(`    detail=${JSON.stringify(detail)}`);
      console.log(`    scores=${JSON.stringify(pos.scores)}`);
      console.log(`    render: ./visualize_board.sh ${pos.ms}`);
      if (found >= count) break;
    }
  }
  solver.destroy();
  if (found < count) { console.error(`Only found ${found}/${count}. Loosen spec or raise --games.`); process.exit(1); }
}
main();
