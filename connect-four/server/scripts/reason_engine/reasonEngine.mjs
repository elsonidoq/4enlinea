#!/usr/bin/env node
// reasonEngine.mjs — blunder-reason EVIDENCE engine (evidence computation only; no LLM prose).
//
// Given a board (movestring) and the column actually played, emit a STRUCTURED JSON evidence
// vector explaining why the move was a blunder. Authoritative design:
//   docs/architecture/my_pseudocode.md            (5-case sign taxonomy)
//   docs/architecture/blunder-reason-evidence.md  (two-half engine, registers, gate, validated boards)
//
// CLI (run from connect-four/):
//   node server/scripts/reason_engine/reasonEngine.mjs <movestring> <playedCol>
//
// Every reason = TWO HALVES kept in SEPARATE fields:
//   lostResource       (a) — what the BEST move preserved (kind varies by case)
//   opponentPunishment (b) — how the PLAYED move loses / fails to win
// plus the opponent reply-histogram (counterplay signal) and, for lose_to_faster_lose, the gate.
//
// Solver-backed; O(plies) queries per board (no combinatorial explosion: optimal play collapses to
// one argmax line per half). The only branching search is the lose_to_faster_lose gate (bounded,
// or exhaustive when <= GATE_EXHAUSTIVE_EMPTIES empty cells).
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createSolverProcess } from '../../c4solver-wrapper.js';
import {
  ROWS, COLS, INVALID_MOVE, loadEnv, buildBoard, winningWindows, cellStr, legalCols, emptyCellCount,
  parseCell,
} from './lib/boardUtils.mjs';
import {
  classifyPattern, Board, detectDoubleThreat, detectImmediateThreat, getWinningWindows,
  tagBlunder, NotABlunderError,
} from '../../classifier.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv(join(__dirname, '../../.env'));

// ── Provisional config (decision 3): single named object, NOT tuned (no labeled set exists). ──
export const REASON_CONFIG = {
  // register thresholds on fwd = 43 - 2*|score| - discs (the show/don't-show boundary is
  // forcedSequenceMax: <= it we render the line, above it we do not). parityMin documents where
  // deep zugzwang clusters per the companion doc; it is not a separate operative cutoff.
  immediateMax: 2,
  forcedSequenceMax: 6,
  parityMin: 12,
  // win_to_draw denial search depth cap (D17).
  denialDepth: 8,
  // lose_to_faster_lose gate budget (provisional).
  gateDepth: 6,        // opponent plies
  gateBranch: 3,       // winning opponent moves explored per node (least-winning first)
  gatePlayerTiedCap: 2,
  gateExhaustiveEmpties: 10, // <= this many empty cells -> run the gate exhaustively (exact verdict)
  // board_state bands (my_pseudocode.md §opening/mid-game/closing).
  openingMaxDiscs: 15,
  midgameMaxDiscs: 30,
};

const CASES = {
  WIN_TO_SLOWER_WIN: 'win_to_slower_win',
  WIN_TO_DRAW: 'win_to_draw',
  WIN_TO_LOSE: 'win_to_lose',
  DRAW_TO_LOSE: 'draw_to_lose',
  LOSE_TO_FASTER_LOSE: 'lose_to_faster_lose',
};

// Tags routed through the realized/denied fast path (docs/architecture/reason-tag-fastpath-pseudocode.md).
export const REALIZED_DENIED_TAGS = new Set(['immediate_threat', 'forced_block', 'double_threat', 'figure_7']);

function classifySignCase(bestScore, playedScore) {
  if (bestScore > 0 && playedScore === 0) return CASES.WIN_TO_DRAW;
  if (bestScore > 0 && playedScore < 0) return CASES.WIN_TO_LOSE;
  if (bestScore === 0 && playedScore < 0) return CASES.DRAW_TO_LOSE;
  if (bestScore < 0 && playedScore < 0) return CASES.LOSE_TO_FASTER_LOSE;
  return 'unclassified';
}

// ── register selection (fwd proxy; the search ALWAYS runs to terminal regardless) ──
export function fwdOf(score, discs) {
  if (score === undefined || score === INVALID_MOVE || score === 0) return null; // draw / invalid
  return 43 - 2 * Math.abs(score) - discs;
}
export function registerOf(fwd) {
  if (fwd == null) return 'parity'; // no win-distance proxy -> treat as non-renderable (draw/zugzwang)
  if (fwd <= REASON_CONFIG.immediateMax) return 'immediate';
  if (fwd <= REASON_CONFIG.forcedSequenceMax) return 'forced_sequence';
  return 'parity';
}
const showsLine = (reg) => reg === 'immediate' || reg === 'forced_sequence';

const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];

// ── tactic NAMING via the production classifier (classifyPattern) ──
// The solver stays authoritative (it decides the case / register / optimal line); classifyPattern
// only NAMES the tactic and grounds its cells. Priority: most specific/decisive first (mirrors the
// spirit of tagBlunder's phase order). A fork outranks the immediate_threat it subsumes, etc.
const TAG_PRIORITY = [
  'double_threat', 'immediate_threat', 'forced_win', 'z_threat', 'odd_even_threat',
  'figure_7', 'j_shape', 'undercut', 'overcut', 'claimeven',
  'major_threat_parity', 'major_threat_nonparity', 'forced_block', 'forbidden_columns', 'minor_threat',
];

// GATE 1 class map. INVARIANT: register is a function of win-distance, so a short tactic cannot win
// a long (parity) position and vice-versa. contextual = weak/defensive, admissible in any register.
const REGISTER_CLASS = {
  immediate_threat: 'tactical', double_threat: 'tactical', forced_win: 'tactical',
  figure_7: 'tactical', j_shape: 'tactical', undercut: 'tactical', overcut: 'tactical',
  z_threat: 'structural', odd_even_threat: 'structural', claimeven: 'structural',
  major_threat_parity: 'structural', major_threat_nonparity: 'structural',
  forced_block: 'contextual', forbidden_columns: 'contextual', minor_threat: 'contextual',
};
function registerClassOk(tag, register) {
  const cls = REGISTER_CLASS[tag] || 'contextual';
  if (cls === 'contextual') return true;                  // last-resort, any register
  return register === 'parity' ? cls === 'structural' : cls === 'tactical';
}
function cellsTouch(cells, anchor) {
  return (cells || []).some((c) => anchor.has(c));
}
// GATE 2 anchor: the cells the solver's realized win actually occupies/rides.
function realizedLocus(half) {
  const s = new Set();
  for (const c of (half.window || [])) s.add(c);
  for (const m of (half.line || [])) s.add(m.cell);
  const pa = half.parityAttribution;
  if (pa && pa.controllingGroup) for (const c of pa.controllingGroup) s.add(c);
  return s;
}
// Name a half via classifyPattern. With `diffAgainst`, prefer the highest-priority tactic that the
// half's board has but the comparison board does NOT (the tagBlunder Phase-C "best BUILDS, played
// doesn't" diff); fall back to the highest-priority tactic overall. With optional `register` + `anchor`,
// gates by register class and realized-locus touch. Solver-error safe.
async function nameHalf(solver, rootMs, perspective, { diffAgainst, register, anchor } = {}) {
  try {
    const pRoot = await classifyPattern(rootMs, perspective, solver);
    const exclude = diffAgainst != null ? await classifyPattern(diffAgainst, perspective, solver) : null;
    const ok = (tag) => (register == null || registerClassOk(tag, register))
                     && (anchor == null || cellsTouch(pRoot.get(tag).cells, anchor));
    const admissible = [...pRoot.keys()].filter(ok);
    if (!admissible.length) return { tacticTag: null, tacticCells: [], tacticFromDiff: false };
    const inDiff = (t) => (exclude ? !exclude.has(t) : false);
    const rank = (t) => { const i = TAG_PRIORITY.indexOf(t); return i === -1 ? Infinity : i; };
    admissible.sort((a, b) => (inDiff(b) - inDiff(a)) || (rank(a) - rank(b)));   // diff = tiebreak, NOT a gate
    const tag = admissible[0];
    return { tacticTag: tag, tacticCells: pRoot.get(tag).cells || [], tacticFromDiff: inDiff(tag) };
  } catch {
    return { tacticTag: null, tacticCells: [], tacticFromDiff: false };
  }
}

// Does the last disc of `ms` complete a 4 for the player who just moved?
function lastMoveWon(ms) {
  if (!ms.length) return null;
  const { grid, heights } = buildBoard(ms);
  const mover = (ms.length % 2 === 1) ? 1 : 2; // who placed the last disc
  const wins = winningWindows(grid, mover);
  if (!wins.length) return null;
  const lastCol = Number(ms[ms.length - 1]);
  const r = heights[lastCol] - 1;
  return { mover, completingCell: cellStr(r, lastCol), window: wins[0].map(([rr, cc]) => cellStr(rr, cc)) };
}

// A position the solver legitimately REJECTS (throws) as terminal: someone just won, or the board is
// full. Used to tell a genuine terminal rejection apart from a transient IPC error — only the latter
// must downgrade an `exhaustive` claim (M3: never inflate a solver error into a full-tree proof; I2).
function isTerminalPosition(ms) {
  return lastMoveWon(ms) !== null || ms.length >= ROWS * COLS;
}

// ── fork detection (D16): an unstoppable double-threat for `winnerMark` on board `ms`. ──
// Reuses the PRODUCTION detectors (I8/I12): detectDoubleThreat (Case A = >=2 gravity-top cols;
// Case B = stacked consecutive in one col) gated by detectImmediateThreat(opponent) === false (the
// opponent has no immediate win of its own). Solver-free — the caller's walk already proved the win
// (I2); this only LOCATES the deciding resource. Returns null when there is no fork.
function detectForkAt(ms, winnerMark) {
  const board = new Board(ms);
  const opp = winnerMark === 1 ? 2 : 1;
  const dt = detectDoubleThreat(board, winnerMark);
  if (!dt.matched) return null;
  if (detectImmediateThreat(board, opp).matched) return null; // opponent wins first → not unstoppable
  const forkCase = (dt.cols && dt.cols.length >= 2) ? 'A' : 'B';
  const forkCells = dt.cells || [];
  const { grid } = buildBoard(ms);
  const forkWindows = [];
  for (const cs of forkCells) {
    const p = parseCell(cs);
    if (!p) continue;
    for (const w of getWinningWindows(grid, p.r, p.c, winnerMark)) {
      forkWindows.push(w.map(({ row, col }) => cellStr(row, col)));
    }
  }
  return { forkCase, forkCells, forkWindows, completingCell: forkCells[0] ?? null, window: forkWindows[0] ?? null };
}

// Realized half (trivial): the pattern `owner` forms in ONE move on `rootMs`, straight from the
// production detectors (I8). Forks (double_threat/figure_7) reuse detectForkAt so windows match D16/D18;
// immediate_threat/forced_block use the win-in-1 detector + getWinningWindows. Returns null if absent.
export function realizedPattern(rootMs, owner, tag) {
  if (tag === 'double_threat' || tag === 'figure_7') {
    const fork = detectForkAt(rootMs, owner);
    if (!fork) return null;
    return { cells: fork.forkCells, windows: fork.forkWindows, completingCell: fork.completingCell };
  }
  // immediate_threat / forced_block: the owner's win-in-1.
  const cboard = new Board(rootMs);
  const it = detectImmediateThreat(cboard, owner);
  if (!it.matched) return null;
  const { grid } = buildBoard(rootMs);
  const windows = [];
  for (const cs of it.cells) {
    const p = parseCell(cs);
    if (!p) continue;
    for (const w of getWinningWindows(grid, p.r, p.c, owner)) {
      windows.push(w.map(({ row, col }) => cellStr(row, col)));
    }
  }
  return { cells: it.cells, windows, completingCell: it.cells[0] ?? null };
}

// Realized/denied reason builder (docs/architecture/reason-tag-fastpath-pseudocode.md).
// One half is the pattern realized in one move (realizedPattern); the other is the pattern denied
// (findOccupationWitness) with denier/root flipped by `direction`. Owner of the pattern decides which
// half is lostResource vs opponentPunishment.
export async function realizedDeniedReason(out, tag, direction, { solver }) {
  const { movestring, playedCol, bestCol, player, opponent, bestScore, playedScore } = out;
  const correctRoot = movestring + String(bestCol);
  const playedRoot = movestring + String(playedCol);

  let owner, denier, realizedRoot, deniedRoot;
  if (direction === 'missed_own') {
    owner = player; denier = opponent; realizedRoot = correctRoot; deniedRoot = playedRoot;
  } else { // enabled_opponent | defensive_miss
    owner = opponent; denier = player;
    realizedRoot = (direction === 'defensive_miss') ? movestring : playedRoot;
    deniedRoot = correctRoot;
  }

  const rp = realizedPattern(realizedRoot, owner, tag);
  if (!rp) return null; // detector can't confirm the tag as a one-move pattern -> fall through (I2: don't fabricate)

  const realized = {
    kind: 'realized_pattern', tag, owner, register: 'immediate',
    cells: rp.cells, windows: rp.windows,
    completingCell: rp.completingCell, window: rp.windows[0] ?? null,
    finalMovestring: realizedRoot, entryCell: rp.completingCell,
    anchorCells: rp.cells,
  };

  const witness = await findOccupationWitness(solver, deniedRoot, {
    denier, windows: rp.windows, depthCap: ROWS * COLS - deniedRoot.length,
  });
  const denied = {
    kind: 'denial', verdict: witness.verdict,
    register: (witness.line && witness.line.length > 1) ? 'forced_sequence' : 'immediate',
    line: witness.line, finalMovestring: witness.finalMovestring,
    completingCell: witness.cell ?? null, window: witness.window ?? null,
    cell: witness.cell ?? null, exhaustive: witness.exhaustive,
    entryCell: witness.cell ?? null,
    anchorCells: witness.cell ? [witness.cell] : [],
  };

  if (owner === player) { out.lostResource = realized; out.opponentPunishment = denied; }
  else { out.lostResource = denied; out.opponentPunishment = realized; }

  const tie = witness.verdict === 'occupation'
    ? { kind: 'tied', sharedCells: [witness.cell] }
    : { kind: 'independent', sharedCells: [] };
  out.opponentPunishment.tie = tie;

  out.route = 'realized_denied';
  out.tag = tag;
  out.direction = direction;
  out.case = classifySignCase(bestScore, playedScore);
  out.replyHistogram = {
    afterBest: await nonLosingReplyCount(solver, correctRoot),
    afterPlayed: await nonLosingReplyCount(solver, playedRoot),
  };
  out.gate = null;
  return out;
}

// Name a fork half via classifyPattern (I8): Case A → double_threat; Case B → figure_7 if that
// (more specific) shape is present, else the co-present double_threat. classifyPattern PROPOSES; the
// fork node IS the solver-realized win so Gate-2 (locus) is satisfied by construction.
async function nameFork(solver, forkNode, winnerMark, forkCase) {
  try {
    const pat = await classifyPattern(forkNode, winnerMark, solver);
    let tag = null;
    if (forkCase === 'B' && pat.has('figure_7')) tag = 'figure_7';
    else if (pat.has('double_threat')) tag = 'double_threat';
    else if (pat.has('figure_7')) tag = 'figure_7';
    if (!tag) return { tacticTag: null, tacticCells: [], tacticFromDiff: false };
    return { tacticTag: tag, tacticCells: pat.get(tag).cells || [], tacticFromDiff: false };
  } catch { return { tacticTag: null, tacticCells: [], tacticFromDiff: false }; }
}

// anchorCells for a fork = every cell of its winning windows (completing cells AND the player's
// constituent discs), so the tie (Task 3) can detect when the opponent's punishment sits on a square
// of the fork the best move was building (validated: c3r3 on 214444115623).
function forkAnchorCells(half) {
  const s = new Set();
  for (const w of (half.forkWindows || [])) for (const c of w) s.add(c);
  for (const c of (half.forkCells || [])) s.add(c);
  return [...s];
}

// Name a WALKED win-half (fork-aware). A fork is named at the FORK NODE (where the deciding tactic
// materialized), not at the root decision board (where it may not exist yet); a non-fork win is named
// at the root as before. Used for both halves.
async function nameWalkedHalf(solver, half, rootMs, perspective, { diffAgainst } = {}) {
  if (half.terminal === 'fork') {
    return nameFork(solver, half.finalMovestring, perspective, half.forkCase);
  }
  return nameHalf(solver, rootMs, perspective,
    { diffAgainst, register: half.register, anchor: realizedLocus(half) });
}

// Walk solver-optimal moves (BOTH sides) from `ms` to terminal. Returns the resolution. With
// `winnerMark`, STOPS at the first deciding double-threat fork after a winner move (D16) instead of
// walking to the completed four.
async function walkOptimal(solver, ms, winnerMark = null) {
  const start = ms.length;
  const pre = lastMoveWon(ms);
  if (pre) {
    return {
      terminal: 'win', winner: pre.mover, completingCell: pre.completingCell,
      window: pre.window, pliesToEnd: 0, line: [], finalMovestring: ms,
    };
  }
  // D16: the deciding fork may already exist at the root (the winner's move that created it is the
  // last disc of `ms`, e.g. bestRoot). Check before walking, else the loop's first move (opponent's)
  // skips it.
  if (winnerMark != null && ((ms.length % 2 === 1) ? 1 : 2) === winnerMark) {
    const fork = detectForkAt(ms, winnerMark);
    if (fork) return { terminal: 'fork', winner: winnerMark, ...fork, pliesToEnd: 0, line: [], finalMovestring: ms };
  }
  let cur = ms;
  const moves = [];
  for (let step = 0; step < 50; step++) {
    const scores = await solver.query(cur);
    const mover = (cur.length % 2 === 0) ? 1 : 2;
    let bestCol = -1, bestScore = -Infinity;
    for (let c = 0; c < COLS; c++) { if (scores[c] === INVALID_MOVE) continue; if (scores[c] > bestScore) { bestScore = scores[c]; bestCol = c; } }
    if (bestCol === -1) break;
    const { heights } = buildBoard(cur);
    const r = heights[bestCol];
    cur += String(bestCol);
    moves.push({ ply: cur.length, mover, col: bestCol, cell: cellStr(r, bestCol), score: bestScore });
    const { grid } = buildBoard(cur);
    const wins = winningWindows(grid, mover);
    if (wins.length) {
      return {
        terminal: 'win', winner: mover, completingCell: cellStr(r, bestCol),
        window: wins[0].map(([rr, cc]) => cellStr(rr, cc)),
        pliesToEnd: cur.length - start, line: moves, finalMovestring: cur,
      };
    }
    // D16: after the winner moves, stop at the deciding fork (do not walk on to the four).
    if (winnerMark != null && mover === winnerMark) {
      const fork = detectForkAt(cur, winnerMark);
      if (fork) {
        return {
          terminal: 'fork', winner: winnerMark, ...fork,
          pliesToEnd: cur.length - start, line: moves, finalMovestring: cur,
        };
      }
    }
    if (cur.length === 42) break;
  }
  return { terminal: 'draw', winner: null, completingCell: null, window: null, pliesToEnd: cur.length - start, line: moves, finalMovestring: cur };
}

// Parity-attribution (PROTOTYPE): for a win whose line is too long to render (register=parity),
// project the solver-realized winning `window` back onto the root board and describe the
// CONTROLLING GROUP structurally instead of emitting a bare distant terminal cell.
//   - height-relative parity per empty cell: zcount = (1-indexed row) - colHeight  (KB community-z-threat)
//   - leverCells = empties with ODD zcount (the zugzwang levers); raw row parity is NOT used (KB
//     allen-parity known-limitation: raw row inverts mid-game).
//   - forcedFirstRequired = true when there is NO odd z-threat lever: the win rests on the global
//     forced-first / Aftereven argument (KB derived-dead-space-parity / allis-aftereven), which is a
//     DEFERRED later milestone — this payload flags that, it does not name the rule.
// The window is already solver-validated (it came from walkOptimal), so this step is solver-free.
function attributeParityWin(rootMs, window, completingCell, winnerMark) {
  if (!window || !window.length) return null;
  const { grid, heights } = buildBoard(rootMs);
  const loser = winnerMark === 1 ? 2 : 1;
  let own = 0, loserDiscs = 0;
  const empties = [];
  for (const s of window) {
    const p = parseCell(s);
    if (!p) return { nameable: false, reason: 'bad_cell' };
    const v = grid[p.r][p.c];
    if (v === winnerMark) own++;
    else if (v === loser) loserDiscs++;
    else {
      const zcount = (p.r + 1) - heights[p.c]; // 1-indexed row minus occupied count
      empties.push({ cell: s, zcount, parity: zcount % 2 === 1 ? 'odd' : 'even' });
    }
  }
  if (loserDiscs > 0) return { nameable: false, reason: 'loser_disc_in_window' }; // multi-window board-fill
  if (completingCell && !window.includes(completingCell)) return { nameable: false, reason: 'completing_not_in_window' };
  const leverCells = empties.filter((e) => e.parity === 'odd').map((e) => e.cell);
  return {
    nameable: true,
    controllingGroup: window,
    ownDiscs: own,
    groupKind: own === 3 ? 'major' : 'minor',
    empties,
    leverCells,
    forcedFirstRequired: leverCells.length === 0,
    completingCell: completingCell ?? null,
    parityNamingDeferred: true,
    namedRule: null,
  };
}

// The MOVE-LEVEL squares that define the lost resource (the winning moves the player had).
// The tie (Task 3) is verified against these, not against the eventual completing cell.
function winningMoveCells(movestring, scores) {
  const { heights } = buildBoard(movestring);
  const out = [];
  for (let c = 0; c < COLS; c++) if (scores[c] !== INVALID_MOVE && scores[c] > 0) out.push(cellStr(heights[c], c));
  return out;
}

// The tie: is the opponent's punishment exploiting the very resource that was given up?
// spatial for most cases; temporal for lose_to_faster_lose. May legitimately be 'independent'.
function tieTo(caseName, lost, punish) {
  if (caseName === CASES.LOSE_TO_FASTER_LOSE) {
    const playedPlies = punish.pliesToEnd ?? null, swindlePlies = lost.pliesToEnd ?? null;
    return { kind: 'temporal', playedPlies, swindlePlies,
      tied: (playedPlies != null && swindlePlies != null && playedPlies < swindlePlies) };
  }
  const anchor = new Set(lost.anchorCells || []);
  const shared = [...new Set([punish.entryCell, punish.completingCell])].filter((c) => c && anchor.has(c));
  return { kind: shared.length ? 'tied' : 'independent', sharedCells: shared };
}

// Render a half: attach register and null out the line when the register forbids showing it.
// `extra.rootMs` + `extra.winnerMark` (when present) drive the parity-attribution enrichment for
// parity-register wins; they are consumed here and not emitted as raw fields.
function renderHalf(kind, walk, fwd, extra = {}) {
  const isFork = walk.terminal === 'fork';
  // D16: a fork is a tactical resolution (decisive in <=3 plies), NEVER a parity win. Its register is
  // tactical — `immediate` when the fork exists at the decision board, else `forced_sequence` (show
  // the line to it). `fwd` is no longer consulted for forks (this supersedes D5's parity proxy).
  const register = isFork
    ? ((walk.line && walk.line.length > 0) ? 'forced_sequence' : 'immediate')
    : registerOf(fwd);
  const { rootMs, winnerMark, ...rest } = extra;
  const half = {
    kind,
    register,
    completingCell: walk.completingCell ?? null,
    window: walk.window ?? null,
    pliesToEnd: walk.pliesToEnd ?? null,
    line: showsLine(register) ? (walk.line ?? null) : null,
    finalMovestring: walk.finalMovestring ?? null, // board on which completingCell is occupied
    entryCell: (walk.line && walk.line[0]) ? walk.line[0].cell : (walk.completingCell ?? null),
    ...rest,
  };
  if (isFork) {
    half.terminal = 'fork';
    half.forkCase = walk.forkCase;
    half.forkCells = walk.forkCells;
    half.forkWindows = walk.forkWindows;
  }
  // parityAttribution fires ONLY for a genuine parity win (no fork found on the whole PV) — D16/D7.
  if (register === 'parity' && walk.terminal === 'win' && rootMs != null && winnerMark != null) {
    const attr = attributeParityWin(rootMs, walk.window, walk.completingCell, winnerMark);
    if (attr) half.parityAttribution = attr;
  }
  return half;
}

// Count opponent replies that are NON-LOSING for the opponent (oppScore >= 0) at node `ms`
// (opponent to move). This is the "counterplay the opponent retains" signal. Returns null if
// the node is already terminal (the mover before `ms` just won → opponent has no reply).
async function nonLosingReplyCount(solver, ms) {
  if (lastMoveWon(ms)) return 0;
  const scores = await solver.query(ms);
  const legal = legalCols(scores);
  if (!legal.length) return 0;
  return legal.filter((c) => scores[c] >= 0).length;
}

// ── ADMISSIBLE opponent moves (D19: the opponent always blocks IMMEDIATE threats) ──
// A move is admissible iff, AFTER the opponent plays it, the PLAYER has no immediate (win-in-1,
// gravity-top) threat — i.e. it neither ignores an existing win-in-1 nor gifts a new one. This one
// predicate collapses three ideas: block the existing threat, don't create one, and (when the set is
// empty because the player has an unblockable win-in-1: double threat / forced-only-column / poisoned
// block) the player simply wins. IMMEDIATE threat only (never MAJOR) — via `detectImmediateThreat`,
// the gravity-top production detector (I8). Winning opponent replies (oppScore>0) can never leave the
// player a win-in-1 (the opponent would win first), so this filter only ever removes NON-winning
// replies — exactly the inadmissible "swindles" the old any-non-winning-reply rule over-credited.
function admissibleOpponentCols(ms, legal, player) {
  const board = new Board(ms);
  const threatened = board.immediateThreats(player).length > 0;
  const adm = legal.filter((c) => board.withMove(c).immediateThreats(player).length === 0);
  return { adm, unblockable: threatened && adm.length === 0 };
}

// ── lose_to_faster_lose GATE (D4 + D19) ──
// From opponent-to-move `node`, search for an opponent node where the opponent has an ADMISSIBLE
// non-winning reply (oppScore <= 0 AND it blocks the player's immediate threats) => a practical
// swindle that survives an opponent who blocks win-in-1 threats. `unblockable` (the opponent has NO
// move clearing the player's win-in-1) is the strongest swindle — the player wins outright. A
// non-winning reply that ignores/creates a win-in-1 is NOT counted (D19): assuming an opponent that
// hangs an immediate threat is not a lesson worth teaching. Preserves the branching search over
// admissible winning replies (I0 — don't weaken the search).
export async function swindleGate(solver, node, { exhaustive }) {
  const { gateDepth, gateBranch, gatePlayerTiedCap } = REASON_CONFIG;
  // player = the side that just moved into `node` (the blunderer); opponent is to move at `node`.
  const player = ((node.length - 1) % 2 === 0) ? 1 : 2;
  const stack = [{ ms: node, oppPlies: 0 }];
  const seen = new Set();
  let nodesVisited = 0;
  let errored = false; // a non-terminal solver throw skipped a real subtree -> exhaustion not clean (M3)
  while (stack.length) {
    const { ms, oppPlies } = stack.pop();
    if (!exhaustive && oppPlies > gateDepth) continue;
    if (seen.has(ms)) continue;
    seen.add(ms);
    nodesVisited++;
    let oppScores;
    try { oppScores = await solver.query(ms); } catch { if (!isTerminalPosition(ms)) errored = true; continue; }
    const legal = legalCols(oppScores);
    if (!legal.length) continue;
    const { adm, unblockable } = admissibleOpponentCols(ms, legal, player);
    if (unblockable) {
      // The player has an immediate threat the opponent CANNOT clear -> the player wins outright.
      // Witness the opponent's least-bad legal try; every legal reply loses to a win-in-1.
      let dev = legal[0];
      for (const c of legal) if (oppScores[c] > oppScores[dev]) dev = c;
      return {
        found: true, node: ms, devCols: legal, devCol: dev, devVal: oppScores[dev],
        oppPlies, nodesVisited, oppScores, errored, unblockable: true,
      };
    }
    const nonWin = adm.filter((c) => oppScores[c] <= 0); // admissible AND non-winning for opponent
    if (nonWin.length) {
      // SWINDLE: the opponent could block the immediate threat yet still deviate into a losing/drawing
      // reply — a mistake a threat-blocking opponent could realistically make.
      let dev = nonWin[0];
      for (const c of nonWin) if (oppScores[c] < oppScores[dev]) dev = c;
      return {
        found: true, node: ms, devCols: nonWin, devCol: dev, devVal: oppScores[dev],
        oppPlies, nodesVisited, oppScores, errored,
      };
    }
    // every admissible reply wins for the opponent: branch over them (least-winning first = most
    // fragile) and let the player reply optimally, looking deeper for an admissible swindle.
    const winning = adm.filter((c) => oppScores[c] > 0).sort((a, b) => oppScores[a] - oppScores[b]);
    const branchCap = exhaustive ? winning.length : gateBranch;
    let branches = 0;
    for (const oc of winning) {
      if (branches >= branchCap) break;
      branches++;
      const afterOpp = ms + String(oc);
      let pScores;
      try { pScores = await solver.query(afterOpp); } catch { if (!isTerminalPosition(afterOpp)) errored = true; continue; }
      const pLegal = legalCols(pScores);
      if (!pLegal.length) continue;
      const maxP = Math.max(...pLegal.map((c) => pScores[c]));
      const tied = pLegal.filter((c) => pScores[c] === maxP);
      const best = exhaustive ? tied : tied.slice(0, gatePlayerTiedCap);
      for (const pc of best) stack.push({ ms: afterOpp + String(pc), oppPlies: oppPlies + 1 });
    }
  }
  return { found: false, nodesVisited, errored };
}

// A window (array of cellStr) is LIVE for the winner on `ms` if it holds no opponent disc; the
// opponent's move into `cell` kills it. Returns the killed window or null.
function killedWindow(ms, cell, forkWindows, opponent) {
  const { grid } = buildBoard(ms);                 // board BEFORE the opponent move
  const p = parseCell(cell); if (!p) return null;
  for (const w of forkWindows) {
    if (!w.includes(cell)) continue;
    const live = w.every((s) => { const q = parseCell(s); return grid[q.r][q.c] !== opponent; });
    if (live) return w;                             // live before -> dead after this move
  }
  return null;
}

// Generalized occupation-witness PV walk (D18 — supersedes denyOpponentPunishment's BFS).
// Walks the canonical optimal (argmax, both-sides) line from `root` and returns the first node where
// `denier` occupies a cell of `windows`, that window being LIVE before (no denier disc) and DEAD after.
// THEOREM: a draw is a full board with no four, so every winning-for-S 4-window holds >=1 not-S disc;
// thus once the walk reaches the full-board terminal the witness ALWAYS exists -> no branching needed
// (I9/Occam; the BFS this replaces was over-built). `depthCap` only bounds the walk; reaching it (or a
// solver error on a non-terminal node) yields the honest residual no_occupation (exhaustive:false). I0/I2/I6.
export async function findOccupationWitness(solver, root, { denier, windows, depthCap }) {
  const wins = windows || [];
  const patternCells = new Set(wins.flat());

  // Root pre-check: the move that produced `root` may ITSELF be the denial — the denier's last disc
  // already sits in a window (draw_to_lose TACTICAL defensive_hold: the best move occupies the
  // opponent's win-in-one cell). killedWindow's LIVE-before test cannot see a window already DEAD at
  // root, so detect it here (honest-limit: already-dead-at-root window). This NEVER fires for
  // win_to_draw, where root's last disc is the PLAYER's played move, not the denier's (=opponent).
  if (root.length) {
    const mover = (root.length % 2 === 1) ? 1 : 2;     // who placed root's last disc
    if (mover === denier) {
      const { heights } = buildBoard(root);
      const lastCol = Number(root[root.length - 1]);
      const cell = cellStr(heights[lastCol] - 1, lastCol);
      for (const w of wins) {
        if (w.includes(cell)) {
          return { verdict: 'occupation', line: [], finalMovestring: root, cell, window: w, exhaustive: true };
        }
      }
    }
  }

  const parent = new Map();
  const lineTo = (ms) => { const out = []; let c = ms; while (parent.has(c)) { const e = parent.get(c); out.unshift({ ply: c.length, mover: e.mover, col: e.col, cell: e.cell, score: e.score }); c = e.ms; } return out; };

  let cur = root;
  let errored = false, reachedTerminal = false;
  for (let step = 0; step < depthCap; step++) {
    let scores;
    try { scores = await solver.query(cur); }
    catch { if (!isTerminalPosition(cur)) errored = true; else reachedTerminal = true; break; }
    const mover = (cur.length % 2 === 0) ? 1 : 2;
    let bestCol = -1, best = -Infinity;
    for (let c = 0; c < COLS; c++) { if (scores[c] === INVALID_MOVE) continue; if (scores[c] > best) { best = scores[c]; bestCol = c; } }
    if (bestCol === -1) { reachedTerminal = true; break; }   // no legal move -> terminal
    const { heights } = buildBoard(cur);
    const cell = cellStr(heights[bestCol], bestCol);
    const child = cur + String(bestCol);
    if (mover === denier && patternCells.has(cell)) {
      const w = killedWindow(cur, cell, wins, denier);       // LIVE before -> DEAD after
      if (w) {
        parent.set(child, { ms: cur, mover, col: bestCol, cell, score: scores[bestCol] });
        return { verdict: 'occupation', line: lineTo(child), finalMovestring: child, cell, window: w, exhaustive: true };
      }
    }
    parent.set(child, { ms: cur, mover, col: bestCol, cell, score: scores[bestCol] });
    cur = child;
    if (cur.length >= ROWS * COLS) { reachedTerminal = true; break; }   // full board reached
  }
  return { verdict: 'no_occupation', line: [], finalMovestring: root, exhaustive: reachedTerminal && !errored };
}

/**
 * Compute the structured blunder-reason evidence vector.
 * @param {string} movestring  pre-move board (0-indexed columns)
 * @param {number} playedCol   the column actually played (0-indexed)
 * @param {{ solver: any }} ctx
 */
export async function computeReason(movestring, playedCol, { solver }) {
  const discs = movestring.length;
  const scores = await solver.query(movestring);
  if (scores[playedCol] === INVALID_MOVE) throw new Error(`playedCol ${playedCol} is full / illegal on "${movestring}"`);

  const legal = legalCols(scores);
  let bestCol = legal[0], bestScore = scores[legal[0]];
  for (const c of legal) if (scores[c] > bestScore) { bestScore = scores[c]; bestCol = c; }
  const playedScore = scores[playedCol];

  const board = buildBoard(movestring);
  const player = (discs % 2 === 0) ? 1 : 2;
  const opponent = player === 1 ? 2 : 1;
  void board;

  const boardState = discs < REASON_CONFIG.openingMaxDiscs ? 'opening'
    : discs < REASON_CONFIG.midgameMaxDiscs ? 'mid-game' : 'closing';

  const out = {
    movestring, playedCol, bestCol, scores, discs, boardState,
    player, opponent, bestScore, playedScore,
    case: null, notABlunder: false,
    lostResource: null, opponentPunishment: null,
    replyHistogram: null, gate: null,
  };

  // ── classify ──
  // NOTE: my_pseudocode.md's first branch `bestScore*playedScore>0` ALSO matches both-negative,
  // which would make lose_to_faster_lose unreachable. The companion doc treats both-negative as
  // in-scope, so win_to_slower_win is only when BOTH scores are positive.
  if (bestScore > 0 && playedScore > 0) {
    out.case = CASES.WIN_TO_SLOWER_WIN;
    out.notABlunder = true; // out of scope per my_pseudocode.md
    return out;
  }

  // Nothing lost -> not a blunder (best is the max, so playedScore <= bestScore).
  if (playedScore === bestScore) {
    out.case = classifySignCase(bestScore, playedScore);
    out.notABlunder = true;
    return out;
  }

  // ── tag-first realized/denied router (reason-tag-fastpath-pseudocode.md) ──
  let tagged;
  try {
    tagged = await tagBlunder(movestring, playedCol, bestCol, solver);
  } catch (err) {
    if (err instanceof NotABlunderError) { out.notABlunder = true; out.case = 'not_a_blunder'; return out; }
    throw err;
  }
  if (REALIZED_DENIED_TAGS.has(tagged.tag)) {
    const rd = await realizedDeniedReason(out, tagged.tag, tagged.direction, { solver });
    if (rd) return rd;
    // realizedPattern could not exhibit the named tag as a one-move pattern -> fall through
    // to the sign-taxonomy engine (honest: don't fabricate a resource we can't show). I2.
  }

  const playedRoot = movestring + String(playedCol);
  const bestRoot = movestring + String(bestCol);

  if (bestScore > 0 && playedScore === 0) {
    // ── win_to_draw ──
    out.case = CASES.WIN_TO_DRAW;
    const aWalk = await walkOptimal(solver, bestRoot, player);
    out.lostResource = renderHalf('winning_line', aWalk, fwdOf(bestScore, discs), { rootMs: bestRoot, winnerMark: player });
    Object.assign(out.lostResource, await nameWalkedHalf(solver, out.lostResource, bestRoot, player, { diffAgainst: playedRoot }));
    out.lostResource.anchorCells = out.lostResource.terminal === 'fork'
      ? forkAnchorCells(out.lostResource) : winningMoveCells(movestring, scores);
    // half (b): how the played move allows the opponent to deny the fork resource (D17) —
    // or, when lostResource is not a fork, the legacy neutralization saving-reply.
    if (out.lostResource.terminal === 'fork') {
      // Fork win_to_draw (D18): the opponent (denier) occupies a fork-window cell under optimal play.
      const denial = await findOccupationWitness(solver, playedRoot, {
        denier: opponent, windows: out.lostResource.forkWindows || [],
        depthCap: ROWS * COLS - playedRoot.length,
      });
      out.opponentPunishment = {
        kind: 'denial', verdict: denial.verdict,
        register: (denial.line && denial.line.length > 1) ? 'forced_sequence' : 'immediate',
        line: denial.line, finalMovestring: denial.finalMovestring,
        completingCell: denial.cell ?? null, window: denial.window ?? null,
        cell: denial.cell ?? null, exhaustive: denial.exhaustive,
        entryCell: denial.cell ?? null,
      };
      out.opponentPunishment.tie = denial.verdict === 'occupation'
        ? { kind: 'tied', sharedCells: [denial.cell] }
        : { kind: 'independent', sharedCells: [] };
    } else {
      // Genuine-parity win_to_draw (no fork): keep the legacy neutralization block.
      const oppScores = await solver.query(playedRoot);
      const oppLegal = legalCols(oppScores);
      const saving = oppLegal.filter((c) => oppScores[c] >= 0).sort((a, b) => oppScores[a] - oppScores[b]);
      const saveCol = saving.length ? saving[saving.length - 1] : null; // the draw (score 0); prefer least-bad
      let saveCell = null, saveWindow = null;
      if (saveCol != null) {
        const { heights } = buildBoard(playedRoot);
        saveCell = cellStr(heights[saveCol], saveCol);
      }
      out.opponentPunishment = {
        kind: 'neutralization', register: 'immediate',
        completingCell: saveCell, window: saveWindow, pliesToEnd: null, line: null,
        finalMovestring: saveCol != null ? playedRoot + String(saveCol) : null,
        entryCell: saveCell,
        savingCol: saveCol, savingReplyCount: saving.length,
      };
      Object.assign(out.opponentPunishment, await nameHalf(solver, playedRoot, opponent));
    }
  } else if (bestScore > 0 && playedScore < 0) {
    // ── win_to_lose ──
    out.case = CASES.WIN_TO_LOSE;
    const aWalk = await walkOptimal(solver, bestRoot, player);
    out.lostResource = renderHalf('winning_line', aWalk, fwdOf(bestScore, discs), { rootMs: bestRoot, winnerMark: player });
    Object.assign(out.lostResource, await nameWalkedHalf(solver, out.lostResource, bestRoot, player, { diffAgainst: playedRoot }));
    out.lostResource.anchorCells = out.lostResource.terminal === 'fork'
      ? forkAnchorCells(out.lostResource) : winningMoveCells(movestring, scores);
    const bWalk = await walkOptimal(solver, playedRoot, opponent);
    out.opponentPunishment = renderHalf('winning_line', bWalk, fwdOf(playedScore, discs), { rootMs: playedRoot, winnerMark: opponent });
    Object.assign(out.opponentPunishment, await nameWalkedHalf(solver, out.opponentPunishment, playedRoot, opponent));
  } else if (bestScore === 0 && playedScore < 0) {
    // ── draw_to_lose (D18 flip) ──
    out.case = CASES.DRAW_TO_LOSE;
    // half (b) FIRST, UNCHANGED: the opponent's conceded winning line after the blunder.
    const bWalk = await walkOptimal(solver, playedRoot, opponent);
    out.opponentPunishment = renderHalf('winning_line', bWalk, fwdOf(playedScore, discs), { rootMs: playedRoot, winnerMark: opponent });
    Object.assign(out.opponentPunishment, await nameWalkedHalf(solver, out.opponentPunishment, playedRoot, opponent));
    // the window(s) the opponent rides: fork windows if fork-stopped, else the single winning window.
    const concededWindows = (out.opponentPunishment.terminal === 'fork')
      ? (out.opponentPunishment.forkWindows || [])
      : (out.opponentPunishment.window ? [out.opponentPunishment.window] : []);
    // half (a): how the BEST (draw) move denies that window — the player (denier) occupies a cell of W.
    // THEOREM: bestRoot draws -> its full-board terminal fills W with >=1 player disc -> occupation
    // always exists; tactical defensive_hold falls out as a ply-0 root occupation (no special-case).
    const denial = await findOccupationWitness(solver, bestRoot, {
      denier: player, windows: concededWindows, depthCap: ROWS * COLS - bestRoot.length,
    });
    out.lostResource = {
      kind: 'denial', verdict: denial.verdict,
      register: (denial.line && denial.line.length > 0) ? 'forced_sequence' : 'immediate',
      line: denial.line, finalMovestring: denial.finalMovestring,
      completingCell: denial.cell ?? null, window: denial.window ?? null,
      cell: denial.cell ?? null, exhaustive: denial.exhaustive,
      anchorCells: denial.cell ? [denial.cell] : [],
    };
    Object.assign(out.lostResource, await nameHalf(solver, bestRoot, player, { diffAgainst: playedRoot }));
    // constructive, window-aware tie (fixes the false `independent`): the player's blocking cell is
    // inside the opponent's window -> tied at that cell. (D8: still two separate fields.)
    out.opponentPunishment.tie = denial.verdict === 'occupation'
      ? { kind: 'tied', sharedCells: [denial.cell] }
      : { kind: 'independent', sharedCells: [] };
  } else if (bestScore < 0 && playedScore < 0) {
    // ── lose_to_faster_lose ── (only real search: the gate)
    out.case = CASES.LOSE_TO_FASTER_LOSE;
    const empties = emptyCellCount(movestring);
    const exhaustive = empties <= REASON_CONFIG.gateExhaustiveEmpties;
    const gate = await swindleGate(solver, bestRoot, { exhaustive });
    if (!gate.found) {
      out.notABlunder = true;
      out.gate = {
        ran: true, exhaustive: exhaustive && !gate.errored, verdict: 'NotABlunder', witness: null,
        nodesVisited: gate.nodesVisited,
      };
      return out;
    }
    out.gate = {
      ran: true, exhaustive: exhaustive && !gate.errored, verdict: 'Blunder',
      witness: { node: gate.node, devCols: gate.devCols, devCol: gate.devCol, devVal: gate.devVal, oppPlies: gate.oppPlies },
      nodesVisited: gate.nodesVisited,
    };
    // half (a): conditional_swindle — demonstrate the win available after the opponent's mistake.
    const swindleRoot = gate.node + String(gate.devCol);
    const aWalk = await walkOptimal(solver, swindleRoot, player);
    const aFwd = fwdOf(gate.devVal, gate.node.length); // |devVal| ~ player's win magnitude after mistake
    out.lostResource = renderHalf('conditional_swindle', aWalk, aFwd, {
      rootMs: swindleRoot, winnerMark: player,
      witness: { node: gate.node, devCol: gate.devCol, devCols: gate.devCols, oppPlies: gate.oppPlies },
    });
    const { heights: gh } = buildBoard(gate.node);
    Object.assign(out.lostResource, await nameWalkedHalf(solver, out.lostResource, swindleRoot, player));
    // anchor stays the practical-chance MOVE (the deviation), even when the swindle resolves via a fork.
    out.lostResource.anchorCells = [cellStr(gh[gate.devCol], gate.devCol)];
    // half (b): the faster forced loss the played move walks into.
    const bWalk = await walkOptimal(solver, playedRoot, opponent);
    out.opponentPunishment = renderHalf('winning_line', bWalk, fwdOf(playedScore, discs), { rootMs: playedRoot, winnerMark: opponent });
    Object.assign(out.opponentPunishment, await nameWalkedHalf(solver, out.opponentPunishment, playedRoot, opponent));
  } else {
    // bestScore < 0 && playedScore === 0  -> played is BETTER than best (impossible: best is max).
    // bestScore === 0 && playedScore === 0 -> not a blunder (both draw).
    out.case = bestScore === 0 ? 'draw_to_draw' : 'unclassified';
    out.notABlunder = true;
    return out;
  }

  // Constructive denial ties (win_to_draw half b; draw_to_lose half a) are already set — do not overwrite.
  if (out.lostResource && out.opponentPunishment
      && out.lostResource.kind !== 'denial' && out.opponentPunishment.kind !== 'denial') {
    out.opponentPunishment.tie = tieTo(out.case, out.lostResource, out.opponentPunishment);
  }

  // ── reply histogram (shared counterplay signal) ──
  out.replyHistogram = {
    afterBest: await nonLosingReplyCount(solver, bestRoot),
    afterPlayed: await nonLosingReplyCount(solver, playedRoot),
  };
  return out;
}

// ── CLI ──
if (import.meta.url === `file://${process.argv[1]}`) {
  const movestring = process.argv[2];
  const playedCol = Number(process.argv[3]);
  if (movestring == null || Number.isNaN(playedCol)) {
    console.error('Usage: node reasonEngine.mjs <movestring> <playedCol>');
    process.exit(1);
  }
  const solver = await createSolverProcess();
  try {
    const result = await computeReason(movestring, playedCol, { solver });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    solver.destroy();
  }
}
