import { Board, classifyPattern } from './classifier.js';

const ROWS = 6;
const COLS = 7;

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
 * Excludes the best score tier and the single worst tier; accumulates middle tiers
 * (best-first) until >=3 columns, never splitting a tier, capped by OPPONENT_CAP.
 *
 * Uniform-score exception: when every legal column scores the same (one tier), the
 * opponent has no mistake gradient to rank — but the position can still be one the
 * player wins only if the opponent errs (e.g. a winning-under-optimal-play position
 * with no immediate forcing threat — NOT a forced win in the classifier sense). In
 * that case we explore ALL legal replies rather than pruning, so the search can find
 * the threats the player builds down any opponent line. This case is rare, so the
 * extra branching has negligible cost.
 */
export function selectOpponentMistakeCols(scores, board) {
  const legal = [];
  for (let c = 0; c < COLS; c++) if (board.colHeights[c] < ROWS) legal.push(c);
  if (legal.length <= 1) return [];

  // Group legal columns into score tiers, best (highest score) first.
  const byScore = new Map();
  for (const c of legal) {
    const s = scores[c];
    if (!byScore.has(s)) byScore.set(s, []);
    byScore.get(s).push(c);
  }
  const tiers = [...byScore.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, cols]) => cols);

  if (tiers.length <= 1) return legal; // all scores equal — explore every legal reply (see uniform-score exception above)
  // Drop best tier (index 0). Drop worst tier (last) unless that leaves nothing.
  const middle = tiers.slice(1, tiers.length > 2 ? tiers.length - 1 : tiers.length);

  // Accumulate middle tiers whole; never-split takes precedence over OPPONENT_CAP.
  // A single large tie tier may exceed the cap (e.g., 5 columns) rather than force
  // an arbitrary within-tier choice.
  const selected = [];
  for (const tier of middle) {
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

function recordWay(tally, tag, firstReply, cells) {
  if (!tally.has(tag)) tally.set(tag, { branches: new Set(), ways: [], occurrences: 0 });
  const entry = tally.get(tag);
  entry.branches.add(firstReply);
  entry.occurrences += 1;   // raw count: every node at which the structure was detected
  const key = cells.join(',');
  if (!entry.ways.some(w => w.join(',') === key)) entry.ways.push(cells);
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
        const map = await classifyPatternWithTimeout(classifyFn, ms, perspective, solver);
        for (const { tag, cells } of extractLookaheadStructures(map)) {
          if (THREAT_TAGS.has(tag)) {
            // Expand the union into one instance per completing cell — each threat counts
            // independently and is independently pointable.
            for (const cell of cells) recordWay(tally, tag, firstReply, [cell]);
          } else {
            recordWay(tally, tag, firstReply, cells); // Tier-1: single grouped way
          }
        }
      }
      let scores;
      try {
        scores = await solver.query(ms);
      } catch {
        return; // solver error — prune this branch
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
 * and decide which to surface. Quantity (occurrences) is reported but is NOT the sort key.
 *
 * @returns {Array<{ tag, ways, novelInstances, bestOccurrences, playedOccurrences }>}
 */
export function collectNovelOpportunities(bestTally, playedTally) {
  const out = [];
  for (const [tag, entry] of bestTally) {
    const playedEntry = playedTally.get(tag);
    const playedWayKeys = new Set((playedEntry?.ways ?? []).map(w => w.join(',')));
    const novelWays = entry.ways.filter(w => !playedWayKeys.has(w.join(',')));
    if (novelWays.length === 0) continue;
    out.push({
      tag,
      ways: novelWays.slice(0, MAX_WAYS),
      novelInstances: novelWays.length,
      bestOccurrences: entry.occurrences,
      playedOccurrences: playedEntry?.occurrences ?? 0,
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
  winner.ways.forEach((cells, i) => {
    aliasMap[`${prefix}-${winner.tag}-${i + 1}`] = 'cells:' + cells.join(',');
    for (const c of cells) allCells.add(c);
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
  // >=0 wins/draws, <0 loses). On solver error, fall back to mistake-mode best-vs-played.
  let optScore, blunderScore;
  try {
    const preScores = await solver.query(movestring);
    optScore = preScores[bestCol];
    blunderScore = preScores[playedCol];
  } catch {
    optScore = undefined;
    blunderScore = undefined;
  }

  // ── Cases 1 & 2: the better move still holds (optScore >= 0) ─────────────────
  // Explore the opponent's BEST defense. A losing/weaker played move surfaces fewer
  // player structures than the better move, yielding a positive delta toward the better move.
  if (optScore === undefined || optScore >= 0) {
    const opMode = optScore === undefined ? 'mistake' : 'optimal';
    const bestTally = await searchOpportunities(bestRoot, perspective, { solver, classifyFn, opponentMode: opMode, dedupeByScore }, { calls: budget }, depth);
    const playedTally = await searchOpportunities(playedRoot, perspective, { solver, classifyFn, opponentMode: opMode, dedupeByScore }, { calls: budget }, depth);
    const tallyComparison = summarizeTallyComparison(bestTally, playedTally);
    const playerExamples = collectNovelOpportunities(bestTally, playedTally);
    const out = buildAliasOutput(compareOpportunities(bestTally, playedTally), 'future');
    if (out) {
      return {
        ...out,
        case: blunderScore !== undefined && blunderScore >= 0 ? 2 : 1,
        playedStillWins: blunderScore !== undefined && blunderScore > 0,
        categoryExamples: playerExamples,
        oppCategoryExamples: [],
        tallyComparison,
        oppTallyComparison: null,
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
        return {
          case: 3,
          tag: null,
          aliasMap: {},
          allowedSetEntries: [],
          oppTag: oppOut.tag,
          oppAliasMap: oppOut.aliasMap,
          oppAllowedSetEntries: oppOut.allowedSetEntries,
          categoryExamples: [],
          oppCategoryExamples: oppExamples,
          tallyComparison,
          oppTallyComparison,
        };
      }
    }
    // No winner. Return the comparisons anyway so prompt_data records what was searched.
    return {
      case: blunderScore !== undefined && blunderScore >= 0 ? 2 : 1,
      tag: null, aliasMap: {}, allowedSetEntries: [],
      oppTag: null, oppAliasMap: {}, oppAllowedSetEntries: [],
      playedStillWins: blunderScore !== undefined && blunderScore > 0,
      categoryExamples: playerExamples,
      oppCategoryExamples: oppExamples,
      tallyComparison,
      oppTallyComparison,
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
  const bestTally = await searchOpportunities(bestRoot, perspective, { solver, classifyFn, opponentMode: 'mistake', dedupeByScore }, { calls: budget }, depth);
  const playedTally = await searchOpportunities(playedRoot, perspective, { solver, classifyFn, opponentMode: 'mistake', dedupeByScore }, { calls: budget }, depth);
  const tallyComparison = summarizeTallyComparison(bestTally, playedTally);
  const playerExamples = collectNovelOpportunities(bestTally, playedTally);
  const playerOut = buildAliasOutput(compareOpportunities(bestTally, playedTally), 'future');

  // Return the comparisons even when neither side has a winner (no prompt structure, but
  // prompt_data still records what was searched). Winner presence = (tag || oppTag).
  return {
    case: 3,
    tag: playerOut?.tag ?? null,
    aliasMap: playerOut?.aliasMap ?? {},
    allowedSetEntries: playerOut?.allowedSetEntries ?? [],
    oppTag: oppOut?.tag ?? null,
    oppAliasMap: oppOut?.aliasMap ?? {},
    oppAllowedSetEntries: oppOut?.allowedSetEntries ?? [],
    categoryExamples: playerExamples,
    oppCategoryExamples: oppExamples,
    tallyComparison,
    oppTallyComparison,
  };
}
