import { Board, classifyPattern } from './classifier.js';

const ROWS = 6;
const COLS = 7;

// ── Story A: outcome-timing and decisive-line helpers ──────────────────────────

/**
 * Map a solver score to the short outcome enum ('win'|'draw'|'loss'|null).
 * null when the score is undefined (solver error / not queried).
 */
export function toOutcome(score) {
  if (score === undefined) return null;
  if (score > 0) return 'win';
  if (score === 0) return 'draw';
  return 'loss';
}

/**
 * Map a solver score to the number of plies until the decisive outcome.
 * Returns null for draws (score=0) and solver errors (score=undefined).
 * Uses |score| directly — the bijection |score| = pliesToEnd holds exactly
 * (confirmed in research.md §R1).
 */
export function toPliesToEnd(score) {
  if (score === undefined || score === 0) return null;
  return Math.abs(score);
}

/**
 * Return the `immediate_threat` tally entry way with the minimum ply, or null.
 * Read-only over the tally — does not modify searchOpportunities or recordWay.
 */
export function pickEarliestWay(tally) {
  const entry = tally.get('immediate_threat');
  if (!entry || entry.ways.length === 0) return null;
  return entry.ways.reduce((best, w) => (!best || w.ply < best.ply) ? w : best, null);
}

/**
 * Return the unique gravity-top empty cell in a completing window.
 * `cells` is an array of cNrM strings (1-indexed); `board` is a Board instance.
 * Returns the first cell whose column's gravity-top is at that row, or null.
 */
export function findGravityTopEmpty(cells, board) {
  for (const cell of cells) {
    const m = /^c(\d+)r(\d+)$/.exec(cell);
    if (!m) continue;
    const col0 = Number(m[1]) - 1;
    const row0 = Number(m[2]) - 1;
    if (board.colHeights[col0] === row0) return cell;
  }
  return null;
}

/**
 * Count distinct 4-windows that pass through `cell` and where all OTHER cells in
 * the window are occupied by `ownerPlayer`. Uses Board.winningWindows (which does
 * the same check) — pure board geometry, no solver calls.
 * `cell` is a cNrM string (1-indexed); `ownerPlayer` is 1 or 2.
 * Returns 0 when the cell string is malformed or no windows exist.
 */
export function countWindowsThrough(cell, board, ownerPlayer) {
  const m = /^c(\d+)r(\d+)$/.exec(cell);
  if (!m) return 0;
  const col0 = Number(m[1]) - 1;
  const row0 = Number(m[2]) - 1;
  return board.winningWindows(row0, col0, ownerPlayer).length;
}

/**
 * Assemble a `decisiveLine` object from the correct source tallies and owner.
 *
 * Called at EACH of the four return paths in runSparseLookahead:
 *   - Cases 1/2 (player wins best or played):
 *       buildDecisiveLine(bestTally, playedTally, 'player', rootBoard)
 *   - Case 3 (opponent punishes):
 *       buildDecisiveLine(oppTally, null, 'opponent', rootBoard)
 *
 * Returns the decisiveLine object, or undefined when neither tally has an
 * immediate_threat (horizon-exceeded → absent → pruned by toFeatureVector).
 */
export function buildDecisiveLine(primaryTally, secondaryTally, owner, rootBoard) {
  const primaryWay   = pickEarliestWay(primaryTally);
  const secondaryWay = secondaryTally ? pickEarliestWay(secondaryTally) : null;
  if (!primaryWay && !secondaryWay) return undefined;

  const fastWay  = (primaryWay && (!secondaryWay || primaryWay.ply <= secondaryWay.ply))
                   ? primaryWay : secondaryWay;
  const slowWay  = fastWay === primaryWay ? secondaryWay : primaryWay;
  const fastSide = fastWay === primaryWay ? 'best' : 'played';

  // immediate_threat cells are completing cells (gravity-top at the SEARCH NODE board, not
  // at the pre-move rootBoard). When cells.length <= 2, each cell IS already a completing
  // cell; use cells.length as the fork count. When cells.length >= 3 (a full 4-window passed
  // in from tests or a future detection), locate the gravity-top cell on rootBoard.
  const ownerPlayer = owner === 'player' ? rootBoard.currentPlayer : rootBoard.opponent;
  let completingCell, winningLinesThroughCell;

  if (fastWay.cells.length <= 2) {
    // detectImmediateThreat returns 1 cell per immediate-threat column (or 2 for a fork).
    // These cells are completing cells by construction — use them directly.
    completingCell           = fastWay.cells[0];
    winningLinesThroughCell  = fastWay.cells.length; // 1 = single-line, 2 = fork
  } else {
    // Full 4-window (e.g. from test helpers or a detector that emits the whole window).
    // Find the gravity-top empty cell on rootBoard, then count real winning windows.
    completingCell           = findGravityTopEmpty(fastWay.cells, rootBoard) ?? fastWay.cells[0];
    winningLinesThroughCell  = completingCell
      ? countWindowsThrough(completingCell, rootBoard, ownerPlayer)
      : 0;
  }

  return {
    owner,
    cells:                   fastWay.cells,
    completingCell,
    winningLinesThroughCell,
    fastSide,
    fastSideRealizedOnPly:  fastWay.ply,
    slowSideRealizedOnPly:  slowWay?.ply ?? null,
  };
}

// ── Story B: causation & stakes helpers ───────────────────────────────────────

/**
 * Map a ceilingRef (from a mistake-mode search) to an outcome string.
 * If the ref is null or no player-to-move node was visited (-Infinity), return 'loss'
 * (conservative: the losing side stays 'loss' at ceiling too — equal to floor, valid).
 */
export function toOutcomeFromRef(ref) {
  if (ref === null || ref.value === -Infinity) return 'loss';
  return toOutcome(ref.value);
}

/**
 * Assemble the `reachability` object: { best: { floor, ceiling }, played: { floor, ceiling } }.
 * Only emitted when at least one side's floor is 'loss'.
 * Non-losing side: ceiling = floor (no separate search needed).
 * Losing side: ceiling = toOutcomeFromRef(ceilingRef from mistake-mode search).
 * Returns undefined when neither side is losing (caller omits the field).
 */
export function assembleReachability(outcomeTiming, bestRef, playedRef) {
  const bf = outcomeTiming.best.outcome;
  const pf = outcomeTiming.played.outcome;
  if (bf !== 'loss' && pf !== 'loss') return undefined;
  return {
    best:   { floor: bf, ceiling: bf !== 'loss' ? bf : toOutcomeFromRef(bestRef) },
    played: { floor: pf, ceiling: pf !== 'loss' ? pf : toOutcomeFromRef(playedRef) },
  };
}

/**
 * Merge the two symmetric `collectNovelOpportunities` results (best→played novel and
 * played→best novel) into a single per-tag entry with `bestNovel` and `playedNovel` arrays.
 * Tags with no novel ways on either side are filtered out (shouldn't happen in practice
 * since collectNovelOpportunities already filters empty results, but guard anyway).
 */
export function mergeSymmetricExamples(bestExamples, playedExamples) {
  const map = new Map();
  for (const e of bestExamples) {
    map.set(e.tag, { tag: e.tag, bestNovel: e.ways, playedNovel: [], novelInstances: e.novelInstances });
  }
  for (const e of playedExamples) {
    const existing = map.get(e.tag);
    if (existing) {
      existing.playedNovel = e.ways;
      existing.novelInstances += e.novelInstances;
    } else {
      map.set(e.tag, { tag: e.tag, bestNovel: [], playedNovel: e.ways, novelInstances: e.novelInstances });
    }
  }
  return [...map.values()].filter(e => e.bestNovel.length > 0 || e.playedNovel.length > 0);
}

/**
 * Derive the edge type from outcome timing and decisiveLine presence.
 * 'tactical'   — outcomes differ (best holds, played loses, or vice versa).
 * 'marginal'   — same outcomes but a concrete decisive line was found (timing delta).
 * 'positional' — same outcomes, no decisive line surfaced within budget/depth.
 * Must be present on ALL four return paths of runSparseLookahead.
 */
export function deriveEdgeType(outcomeTiming, decisiveLine) {
  if (outcomeTiming.best.outcome !== outcomeTiming.played.outcome) return 'tactical';
  if (decisiveLine === undefined) return 'positional';
  return 'marginal';
}

export const LOOKAHEAD_DEPTH = 4;
export const EARLY_GAME_DEPTH = 8;   // depth used when board is sparse (< EARLY_GAME_MS_THRESHOLD discs played)
export const EARLY_GAME_MS_THRESHOLD = 8; // movestring.length below which EARLY_GAME_DEPTH applies
// Initial / near-empty positions (opening few plies) have an enormous branching factor and
// no near-term tactical structure, so the early-game budget exhausts before any distinguishing
// pattern surfaces and the look-ahead returns null. There are only a handful of distinct
// opening positions, and the whole deep-reveal is cached per position (explanation_cache), so
// we can afford a far larger one-time search here to actually ground the opening.
export const INITIAL_GAME_MS_THRESHOLD = 4; // movestring.length at or below which the INITIAL tier applies
export const INITIAL_GAME_DEPTH = 10;
export const INITIAL_GAME_CALL_BUDGET = 2000;
export const PLAYER_CAP = 2;
export const OPPONENT_CAP = 4;
export const GLOBAL_CALL_BUDGET = 60; // budget PER CANDIDATE MOVE — each of the two searches (best and played) gets this many classify calls independently
export const CLASSIFY_TIMEOUT_MS = 4000;
export const MAX_WAYS = 2; // cap on the novel cell-sets surfaced PER CATEGORY (best-vs-played)

// Informativeness priority among look-ahead structures — NOT raw quantity, which over-favors
// minor threats (a position spawns many of them). A parity-aligned major threat can be
// game-winning on its own; minors are the weakest signal. The winner surfaced in the prompt
// is the highest-priority category the better move uniquely opens; the full per-category list
// is emitted separately so a downstream consumer can keep them all and decide what to filter.
export const LOOKAHEAD_PRIORITY = [
  'double_threat', 'immediate_threat',
  'major_threat_parity',
  'figure_7', 'j_shape', 'undercut', 'overcut',
  'major_threat_nonparity',
  'minor_threat',
];

function priorityIndex(tag) {
  const i = LOOKAHEAD_PRIORITY.indexOf(tag);
  return i === -1 ? LOOKAHEAD_PRIORITY.length : i; // unknown tags sort last
}

/**
 * 0-indexed opponent "mistake" columns to explore from an opponent-to-move node.
 * Only considers columns whose score <= 0 (the opponent concedes at least a draw).
 * A still-winning sub-optimal reply does NOT hand the player a genuine on-board
 * opportunity — exploring it floods the look-ahead with phantom player structure in
 * positions the player is actually losing (see fv-sufficiency eval-42).
 *
 * Among concessions, accumulates score tiers (best = least-bad for opponent, first)
 * until >=3 columns; never splits a tie tier; a single large tie tier may exceed
 * OPPONENT_CAP rather than force an arbitrary within-tier choice.
 * Returns [] when no legal reply concedes a draw-or-loss.
 */
export function selectOpponentMistakeCols(scores, board) {
  const legal = [];
  for (let c = 0; c < COLS; c++) if (board.colHeights[c] < ROWS) legal.push(c);
  if (legal.length <= 1) return [];

  // Only opponent replies that concede at least a draw (score <= 0 from the opponent's
  // to-move perspective) are real mistakes worth exploring. A still-winning sub-optimal
  // reply does NOT hand the player a genuine on-board opportunity — exploring it floods the
  // look-ahead with phantom player structure in positions the player is actually losing
  // (see the feature-vector glossary §5.3 and the sufficiency report's eval-42).
  const candidates = legal.filter((c) => scores[c] <= 0);
  if (candidates.length === 0) return [];

  // Group concessions into score tiers, best (highest score = least-bad for the opponent,
  // i.e. the most realistic slip) first.
  const byScore = new Map();
  for (const c of candidates) {
    const s = scores[c];
    if (!byScore.has(s)) byScore.set(s, []);
    byScore.get(s).push(c);
  }
  const tiers = [...byScore.entries()].sort((a, b) => b[0] - a[0]).map(([, cols]) => cols);

  // Accumulate whole tiers (best-first) until >=3 columns; never split a tie tier; a single
  // large tie tier may exceed OPPONENT_CAP rather than force an arbitrary within-tier choice.
  const selected = [];
  for (const tier of tiers) {
    if (selected.length >= 3 && selected.length + tier.length > OPPONENT_CAP) break;
    selected.push(...tier);
    if (selected.length >= 3) break;
  }
  return selected;
}

/**
 * 0-indexed columns tied for the opponent's BEST (max) score — their best defense.
 * Keeps all ties. Used by optimal-opponent mode: at opponent-to-move nodes we branch
 * only into the opponent's strongest replies, so a losing played-move surfaces nothing
 * (the better move's surviving structure then yields a positive delta).
 */
export function selectOptimalOpponentCols(scores, board) {
  const legal = [];
  for (let c = 0; c < COLS; c++) if (board.colHeights[c] < ROWS) legal.push(c);
  if (legal.length === 0) return [];
  let max = -Infinity;
  for (const c of legal) if (scores[c] > max) max = scores[c];
  return legal.filter(c => scores[c] === max);
}

/**
 * Runs classifyFn with a hard timeout. Returns an empty Map on throw OR timeout.
 * classifyPattern can hang on IPC deadlock (no throw) — the timeout is mandatory.
 */
export async function classifyPatternWithTimeout(classifyFn, ms, perspective, solver, timeoutMs = CLASSIFY_TIMEOUT_MS) {
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve(new Map()), timeoutMs);
  });
  try {
    const result = await Promise.race([
      Promise.resolve().then(() => classifyFn(ms, perspective, solver)),
      timeout,
    ]);
    return result instanceof Map ? result : new Map();
  } catch {
    return new Map();
  } finally {
    clearTimeout(timer);
  }
}

// Tier-1 tactical structures: each is recorded as a single grouped "way" (one instance
// per detection node, cells kept together).
const TIER1 = new Set(['immediate_threat', 'double_threat', 'undercut', 'overcut', 'figure_7', 'j_shape']);

// Parity-aware threats are first-class look-ahead structures. Unlike Tier-1 groups, a
// threat tag's `cells` array is a UNION of independent completing cells, so each cell is
// expanded into its own way before recordWay (see searchOpportunities) — occurrences and
// instances then count individual threats and each cell is independently pointable.
const THREAT_TAGS = new Set(['major_threat_parity', 'major_threat_nonparity', 'minor_threat']);

// The full set of tags the look-ahead extracts and tallies.
const LOOKAHEAD_TAGS = new Set([...TIER1, ...THREAT_TAGS]);

export function extractLookaheadStructures(patternMap) {
  const out = [];
  for (const [tag, val] of patternMap) {
    if (LOOKAHEAD_TAGS.has(tag) && val && Array.isArray(val.cells) && val.cells.length > 0) {
      out.push({ tag, cells: val.cells });
    }
  }
  return out;
}

function topScoringCols(scores, board, cap) {
  const legal = [];
  for (let c = 0; c < COLS; c++) if (board.colHeights[c] < ROWS) legal.push(c);
  legal.sort((a, b) => scores[b] - scores[a]);
  return legal.slice(0, cap);
}

function recordWay(tally, tag, firstReply, cells, ply) {
  if (!tally.has(tag)) tally.set(tag, { branches: new Set(), ways: [], occurrences: 0 });
  const entry = tally.get(tag);
  entry.branches.add(firstReply);
  entry.occurrences += 1;   // raw count: every node at which the structure was detected
  const key = cells.join(',');
  const existing = entry.ways.find((w) => w.cells.join(',') === key);
  if (existing) {
    if (ply < existing.ply) existing.ply = ply; // keep the EARLIEST realization
  } else {
    entry.ways.push({ cells, ply });
  }
}

// Deduplicate candidate columns by their solver score: keep only the first column for each
// distinct score. Columns with equal scores are tactically interchangeable (mirror/symmetry),
// so exploring one representative per score preserves column diversity while pruning redundant
// branches — e.g. scores [-3,-3,-2,1,-2,-3,-3] collapse to one -3, one -2 and the 1 column.
function dedupeColsByScore(cols, scores) {
  const seen = new Set();
  const out = [];
  for (const c of cols) {
    if (seen.has(scores[c])) continue;
    seen.add(scores[c]);
    out.push(c);
  }
  return out;
}

export async function searchOpportunities(rootMovestring, perspective, deps, budget, depth = LOOKAHEAD_DEPTH) {
  const { solver, classifyFn } = deps;
  // 'mistake' (default) explores the opponent's middle/error tiers; 'optimal' explores
  // only the opponent's best defense (max-tied columns). See module-level docs.
  const opponentMode = deps.opponentMode ?? 'mistake';
  // When set, prune branches whose column shares a solver score with an already-explored
  // sibling (see dedupeColsByScore) — exploits symmetry to shrink the search space.
  const dedupeByScore = deps.dedupeByScore ?? false;
  const tally = new Map();
  const opponent = perspective === 1 ? 2 : 1;

  async function recurse(ms, firstReply, pliesLeft) {
    if (pliesLeft <= 0 || budget.calls <= 0) return;
    const board = new Board(ms);
    // Terminal guard: a position where either side has already won is game-over —
    // the solver rejects it ("Invalid position") and there is nothing to classify.
    // Prune before any solver.query/classify (both modes).
    if (board.hasWon(1) || board.hasWon(2)) return;
    const toMove = board.currentPlayer;

    if (toMove === opponent) {
      let scores;
      try {
        scores = await solver.query(ms);
      } catch {
        return; // solver error — prune this branch
      }
      let cols = opponentMode === 'optimal'
        ? selectOptimalOpponentCols(scores, board)
        : selectOpponentMistakeCols(scores, board);
      if (dedupeByScore) cols = dedupeColsByScore(cols, scores);
      for (const c of cols) {
        if (board.colHeights[c] >= ROWS) continue;
        const nextFirst = firstReply === null ? c : firstReply;
        await recurse(ms + c.toString(), nextFirst, pliesLeft - 1);
      }
    } else {
      // Player to move: detect structures here, then continue down best lines.
      if (budget.calls > 0) {
        budget.calls -= 1;
        const ply = 1 + (depth - pliesLeft); // plies from the pre-move board (root = 1)
        const map = await classifyPatternWithTimeout(classifyFn, ms, perspective, solver);
        for (const { tag, cells } of extractLookaheadStructures(map)) {
          if (THREAT_TAGS.has(tag)) {
            // Expand the union into one instance per completing cell — each threat counts
            // independently and is independently pointable.
            for (const cell of cells) recordWay(tally, tag, firstReply, [cell], ply);
          } else {
            recordWay(tally, tag, firstReply, cells, ply); // Tier-1: single grouped way
          }
        }
      }
      let scores;
      try {
        scores = await solver.query(ms);
      } catch {
        return; // solver error — prune this branch
      }
      // T015: update ceilingRef with the best legal score at this player-to-move node.
      if (deps.ceilingRef) {
        for (let c = 0; c < scores.length; c++) {
          if (scores[c] !== undefined && board.colHeights[c] < ROWS && scores[c] > deps.ceilingRef.value) {
            deps.ceilingRef.value = scores[c];
          }
        }
      }
      let playerCols = topScoringCols(scores, board, PLAYER_CAP);
      if (dedupeByScore) playerCols = dedupeColsByScore(playerCols, scores);
      for (const c of playerCols) {
        await recurse(ms + c.toString(), firstReply, pliesLeft - 1);
      }
    }
  }

  await recurse(rootMovestring, null, depth);
  return tally;
}

// Full per-tag comparison over the union of both tallies' tags. `occurrences` (every node
// the structure was detected at, see recordWay) is the raw signal compareOpportunities
// ranks by; branches.size and instances are recorded too so a reader can see every
// candidate pattern and why one won (or why none did).
export function summarizeTallyComparison(bestTally, playedTally) {
  const tags = new Set([...bestTally.keys(), ...playedTally.keys()]);
  return [...tags].sort().map((tag) => {
    const b = bestTally.get(tag);
    const p = playedTally.get(tag);
    return {
      pattern: tag,
      // occurrences: how many times the structure appeared (every node it was detected at).
      bestOccurrences: b?.occurrences ?? 0,
      playedOccurrences: p?.occurrences ?? 0,
      // distinct instances (unique cell-groups) of the structure.
      bestInstances: b?.ways.length ?? 0,
      playedInstances: p?.ways.length ?? 0,
      // branches: distinct first-reply lines under which it appeared — the ranking metric.
      bestBranches: b?.branches.size ?? 0,
      playedBranches: p?.branches.size ?? 0,
    };
  });
}

/**
 * For EVERY look-ahead category, the cell-sets ("ways") that occur in the BEST branch but
 * NOT in the played branch — concrete examples the better move generates that the blunder
 * move cannot. A category whose ways all also appear in the played line contributes nothing
 * (any occurrence delta there is only a frequency difference) and is omitted. Every
 * qualifying category is returned (its novel ways capped at MAX_WAYS), ordered by
 * informativeness priority (LOOKAHEAD_PRIORITY) so a downstream consumer can keep them all
 * and decide which to surface. `novelInstances` = the count of distinct novel cell-sets (a
 * clean, board-bounded quantity). Raw occurrence counts (DFS detection-node tallies) are
 * intentionally NOT reported here — they are depth/budget artifacts that mislead a reader.
 *
 * @returns {Array<{ tag, ways, novelInstances }>}
 */
export function collectNovelOpportunities(bestTally, playedTally) {
  const out = [];
  for (const [tag, entry] of bestTally) {
    const playedEntry = playedTally.get(tag);
    const playedWayKeys = new Set((playedEntry?.ways ?? []).map((w) => w.cells.join(',')));
    const novelWays = entry.ways.filter((w) => !playedWayKeys.has(w.cells.join(',')));
    if (novelWays.length === 0) continue;
    out.push({
      tag,
      ways: novelWays.slice(0, MAX_WAYS).map((w) => ({ cells: w.cells, realizedOnPly: w.ply })),
      novelInstances: novelWays.length,
    });
  }
  out.sort((a, b) => priorityIndex(a.tag) - priorityIndex(b.tag) || (a.tag < b.tag ? -1 : 1));
  return out;
}

/**
 * The single structure surfaced in the prompt: the highest-PRIORITY category the better move
 * uniquely opens up. Priority — not raw occurrence count — so a lone parity-aligned major
 * (game-winning) wins over a swarm of minor threats. Returns { tag, ways } or null.
 */
export function compareOpportunities(bestTally, playedTally) {
  const novel = collectNovelOpportunities(bestTally, playedTally);
  if (novel.length === 0) return null;
  const top = novel[0];
  return { tag: top.tag, ways: top.ways };
}

/**
 * Anchorless = the explanation has nothing concrete to point at: no threat-comparison
 * row is shown AND no Tier-1/2 pattern cells (allowedSet null). A board may still carry
 * non-meaningful threats (e.g. opponent minors that produce no directional row) and
 * still be anchorless — that is exactly when forward look-ahead must run.
 */
export function isAnchorlessPosition(showFlags, allowedSet) {
  const { showPlayerMajor, showOpponentMajor, showPlayerMinor, showOpponentMinor } = showFlags;
  const noThreatRowsShown = !showPlayerMajor && !showOpponentMajor && !showPlayerMinor && !showOpponentMinor;
  return noThreatRowsShown && allowedSet === null;
}

/**
 * Turns a compareOpportunities winner into the alias-map + allowedSet output shape.
 * `prefix` distinguishes player ('future') from opponent ('opp-future') structures.
 * Returns null when there is no winner.
 */
export function buildAliasOutput(winner, prefix) {
  if (!winner) return null;
  const aliasMap = {};
  const allCells = new Set();
  winner.ways.forEach((way, i) => {
    aliasMap[`${prefix}-${winner.tag}-${i + 1}`] = 'cells:' + way.cells.join(',');
    for (const c of way.cells) allCells.add(c);
  });
  return {
    tag: winner.tag,
    aliasMap,
    allowedSetEntries: [{ cells: [...allCells], validationOnly: true }],
  };
}

export async function runSparseLookahead({ movestring, playedCol, bestCol, perspective }, deps = {}) {
  const solver = deps.solver;
  const classifyFn = deps.classifyFn ?? classifyPattern;
  const dedupeByScore = deps.dedupeByScore;
  const opponent = perspective === 1 ? 2 : 1;
  const bestRoot = movestring + bestCol.toString();
  const playedRoot = movestring + playedCol.toString();
  // Three depth/budget tiers: INITIAL (near-empty opening — large one-time search, cached),
  // EARLY (sparse), and the default mid/late-game tier.
  let depth, budget;
  if (movestring.length <= INITIAL_GAME_MS_THRESHOLD) {
    depth = INITIAL_GAME_DEPTH;
    budget = INITIAL_GAME_CALL_BUDGET;
  } else if (movestring.length < EARLY_GAME_MS_THRESHOLD) {
    depth = EARLY_GAME_DEPTH;
    budget = GLOBAL_CALL_BUDGET;
  } else {
    depth = LOOKAHEAD_DEPTH;
    budget = GLOBAL_CALL_BUDGET;
  }
  // deps.depth / deps.budget override the tier defaults (used by debug/eval tooling).
  // budget: a number caps total classify/solver calls; null means UNBOUNDED (only depth
  // limits the search); undefined keeps the game-stage tier default.
  if (deps.depth != null) depth = deps.depth;
  if (deps.budget !== undefined) budget = deps.budget === null ? Infinity : deps.budget;

  // Choose the opponent-exploration strategy from the PRE-MOVE position. optScore is the
  // best move's score, blunderScore the played move's score (player-to-move perspective:
  // >=0 wins/draws, <0 loses). These also drive the two outcome labels on the result:
  // bestOutcome / postBlunderOutcome ∈ {win,draw,loss}_with_best_play. The "_with_best_play"
  // suffix is load-bearing: a positive score means the side CAN force the win with correct
  // continuation — it is NOT a guarantee from this move alone (only completing a line is).
  // Since the better move is never worse (optScore >= blunderScore), bestOutcome is never
  // worse than postBlunderOutcome. On solver error, fall back to mistake-mode best-vs-played.
  let optScore, blunderScore;
  try {
    const preScores = await solver.query(movestring);
    optScore = preScores[bestCol];
    blunderScore = preScores[playedCol];
  } catch {
    optScore = undefined;
    blunderScore = undefined;
  }
  // Sign of the solver score → with-best-play outcome label (null when score is unknown).
  const outcomeWithBestPlay = (score) => {
    if (score === undefined) return null;
    if (score > 0) return 'win_with_best_play';
    if (score === 0) return 'draw_with_best_play';
    return 'loss_with_best_play';
  };
  const bestOutcome = outcomeWithBestPlay(optScore);
  const postBlunderOutcome = outcomeWithBestPlay(blunderScore);

  // Story A: outcome timing (present on ALL four return paths).
  // outcomeTiming.best/played use short-form outcomes ('win'|'draw'|'loss'|null).
  // pliesToEnd = |score| when score !== 0 and score !== undefined; null otherwise.
  const outcomeTiming = {
    best:   { outcome: toOutcome(optScore),     pliesToEnd: toPliesToEnd(optScore)     },
    played: { outcome: toOutcome(blunderScore), pliesToEnd: toPliesToEnd(blunderScore) },
  };
  // Root board used for geometry helpers in buildDecisiveLine (pre-move position).
  const rootBoard = new Board(movestring);

  // ── Cases 1 & 2: the better move still holds (optScore >= 0) ─────────────────
  // Explore the opponent's BEST defense. A losing/weaker played move surfaces fewer
  // player structures than the better move, yielding a positive delta toward the better move.
  if (optScore === undefined || optScore >= 0) {
    const opMode = optScore === undefined ? 'mistake' : 'optimal';
    const bestTally = await searchOpportunities(bestRoot, perspective, { solver, classifyFn, opponentMode: opMode, dedupeByScore }, { calls: budget }, depth);
    const playedTally = await searchOpportunities(playedRoot, perspective, { solver, classifyFn, opponentMode: opMode, dedupeByScore }, { calls: budget }, depth);

    // T016: When the played move loses, run a separate mistake-mode search on playedRoot
    // (player perspective) to determine how well the player can do if the opponent slips.
    // This populates playedCeilingRef for reachability.played.ceiling. Must run BEFORE
    // any early return so all three sub-paths can include reachability.
    let playedCeilingRef = null;
    if (blunderScore !== undefined && blunderScore < 0) {
      playedCeilingRef = { value: -Infinity };
      await searchOpportunities(playedRoot, perspective, { solver, classifyFn, opponentMode: 'mistake', dedupeByScore, ceilingRef: playedCeilingRef }, { calls: budget }, depth);
    }

    // T017: Assemble reachability (emitted only when played floor = 'loss').
    const reachability = assembleReachability(outcomeTiming, null, playedCeilingRef);

    const tallyComparison = summarizeTallyComparison(bestTally, playedTally);
    // T018: Symmetric categoryExamples — novel ways from both directions.
    const bestExamples = collectNovelOpportunities(bestTally, playedTally);
    const playedExamplesSwap = collectNovelOpportunities(playedTally, bestTally);
    const playerExamples = mergeSymmetricExamples(bestExamples, playedExamplesSwap);

    const out = buildAliasOutput(compareOpportunities(bestTally, playedTally), 'future');
    if (out) {
      const dl1 = buildDecisiveLine(bestTally, playedTally, 'player', rootBoard);
      const edgeType = deriveEdgeType(outcomeTiming, dl1); // T019
      return {
        ...out,
        case: blunderScore !== undefined && blunderScore >= 0 ? 2 : 1,
        bestOutcome,
        postBlunderOutcome,
        outcomeTiming,
        ...(dl1 !== undefined && { decisiveLine: dl1 }),
        categoryExamples: playerExamples,
        oppCategoryExamples: [],
        tallyComparison,
        oppTallyComparison: null,
        edgeType,
        ...(reachability !== undefined && { reachability }),
      };
    }
    // No player-side structure delta distinguishes the moves. If the better move HOLDS
    // (optScore >= 0) but the played move actually LOSES (blunderScore < 0) — a decisive
    // outcome flip — the distinguishing fact is how best play punishes the blunder, not
    // any player structure. Deepen by running the opponent-punishment search (the same
    // machinery Case 3 uses) on the losing played root, so the decisive position is
    // grounded rather than returning null and leaving the prompt with nothing to point
    // at. When the refutation is too deep to surface within the budget (e.g. an
    // empty-board positional loss), oppOut stays null → no winner (honest-minimal fallback).
    let oppTallyComparison = null;
    let oppExamples = [];
    if (blunderScore !== undefined && blunderScore < 0) {
      const oppTally = await searchOpportunities(playedRoot, opponent, { solver, classifyFn, opponentMode: 'optimal', dedupeByScore }, { calls: budget }, depth);
      oppTallyComparison = summarizeTallyComparison(oppTally, new Map());
      oppExamples = collectNovelOpportunities(oppTally, new Map());
      const oppOut = buildAliasOutput(compareOpportunities(oppTally, new Map()), 'opp-future');
      if (oppOut) {
        const dl2 = buildDecisiveLine(oppTally, null, 'opponent', rootBoard);
        const edgeType = deriveEdgeType(outcomeTiming, dl2); // T019
        return {
          case: 3,
          tag: null,
          aliasMap: {},
          allowedSetEntries: [],
          oppTag: oppOut.tag,
          oppAliasMap: oppOut.aliasMap,
          oppAllowedSetEntries: oppOut.allowedSetEntries,
          outcomeTiming,
          ...(dl2 !== undefined && { decisiveLine: dl2 }),
          categoryExamples: [],
          oppCategoryExamples: oppExamples,
          tallyComparison,
          oppTallyComparison,
          edgeType,
          ...(reachability !== undefined && { reachability }),
        };
      }
    }
    // No winner. Return the comparisons anyway so prompt_data records what was searched.
    const dl3 = buildDecisiveLine(bestTally, playedTally, 'player', rootBoard);
    const edgeType3 = deriveEdgeType(outcomeTiming, dl3); // T019
    return {
      case: blunderScore !== undefined && blunderScore >= 0 ? 2 : 1,
      tag: null, aliasMap: {}, allowedSetEntries: [],
      oppTag: null, oppAliasMap: {}, oppAllowedSetEntries: [],
      bestOutcome,
      postBlunderOutcome,
      outcomeTiming,
      ...(dl3 !== undefined && { decisiveLine: dl3 }),
      categoryExamples: playerExamples,
      oppCategoryExamples: oppExamples,
      tallyComparison,
      oppTallyComparison,
      edgeType: edgeType3,
      ...(reachability !== undefined && { reachability }),
    };
  }

  // ── Case 3: losing either way (optScore < 0) ────────────────────────────────
  // (a) Optimal-opponent-from-blunder: how best play punishes the move. Search the
  //     BLUNDER root from the OPPONENT's perspective so classify surfaces the OPPONENT's
  //     punishing structures; compare against an empty tally to extract them.
  const oppTally = await searchOpportunities(playedRoot, opponent, { solver, classifyFn, opponentMode: 'optimal', dedupeByScore }, { calls: budget }, depth);
  const oppTallyComparison = summarizeTallyComparison(oppTally, new Map());
  const oppExamples = collectNovelOpportunities(oppTally, new Map());
  const oppOut = buildAliasOutput(compareOpportunities(oppTally, new Map()), 'opp-future');

  // (b) Player surviving-slip: if the opponent errs, the better move lets the player punish.
  //     Mistake-mode best-vs-played, player perspective (existing machinery).
  //     T016: Pass fresh ceilingRef objects so T017 can compute reachability ceilings.
  const bestCeilingRef = { value: -Infinity };
  const playedCeilingRef = { value: -Infinity };
  const bestTally = await searchOpportunities(bestRoot, perspective, { solver, classifyFn, opponentMode: 'mistake', dedupeByScore, ceilingRef: bestCeilingRef }, { calls: budget }, depth);
  const playedTally = await searchOpportunities(playedRoot, perspective, { solver, classifyFn, opponentMode: 'mistake', dedupeByScore, ceilingRef: playedCeilingRef }, { calls: budget }, depth);
  const tallyComparison = summarizeTallyComparison(bestTally, playedTally);
  // T018: Symmetric categoryExamples — novel ways from both directions.
  const bestExamplesC3 = collectNovelOpportunities(bestTally, playedTally);
  const playedExamplesC3 = collectNovelOpportunities(playedTally, bestTally);
  const playerExamples = mergeSymmetricExamples(bestExamplesC3, playedExamplesC3);
  const playerOut = buildAliasOutput(compareOpportunities(bestTally, playedTally), 'future');

  // T017: Assemble reachability (both floors are 'loss' in Case 3).
  const reachability = assembleReachability(outcomeTiming, bestCeilingRef, playedCeilingRef);

  // Return the comparisons even when neither side has a winner (no prompt structure, but
  // prompt_data still records what was searched). Winner presence = (tag || oppTag).
  const dl4 = buildDecisiveLine(oppTally, null, 'opponent', rootBoard);
  const edgeType4 = deriveEdgeType(outcomeTiming, dl4); // T019
  return {
    case: 3,
    tag: playerOut?.tag ?? null,
    aliasMap: playerOut?.aliasMap ?? {},
    allowedSetEntries: playerOut?.allowedSetEntries ?? [],
    oppTag: oppOut?.tag ?? null,
    oppAliasMap: oppOut?.aliasMap ?? {},
    oppAllowedSetEntries: oppOut?.allowedSetEntries ?? [],
    outcomeTiming,
    ...(dl4 !== undefined && { decisiveLine: dl4 }),
    categoryExamples: playerExamples,
    oppCategoryExamples: oppExamples,
    tallyComparison,
    oppTallyComparison,
    edgeType: edgeType4,
    ...(reachability !== undefined && { reachability }),
  };
}
