/**
 * Unified two-sided grounding flow for the LLM explain-move endpoint.
 * Extracted from index.js for testability.
 *
 * buildExplainContext(movestring, col, rounds, solver) → { prompt, allowedSet }
 *   Returns null if the contrast move could not be determined.
 *   Returns { prompt: null, allowedSet: null, allMovesEqual: true } when all moves are settled.
 */

import {
  classifyPattern, tagBlunder, Board,
  getMinorThreatWindows, categorizeThreats,
} from './classifier.js';
import { runSparseLookahead, isAnchorlessPosition } from './sparseLookahead.js';
import { detectCenterDominance } from './centerDominance.js';
import { computeOpeningContext } from './scripts/reason_engine/computeOpeningContext.mjs';
import { REASON_TEMPLATES, POSITIVE_TEMPLATES } from './blunderReasons.js';
import {
  checkAllMovesEqual,
  getGapAndFraming,
  getPositionTier,
  selectContrastMove,
  getBoardVisualization,
  buildBlunderExplainPrompt,
  loadKBShortSummary,
  PATTERN_KB,
} from './llmCoachHelpers.js';

const EMPTY_BOARD_SCORES = [0, 0, 1, 2, 1, 0, 0];
const ROWS = 6;
const COLS = 7;

// Declarative slugs for runSparseLookahead's numeric `case` (sparseLookahead.js):
//   1 → better move holds (>=0) but the played move loses (<0)
//   2 → both moves hold/win, but the better move is stronger
//   3 → losing either way (better move's score < 0)
const LOOKAHEAD_CASE_SLUGS = {
  1: 'better_holds_played_loses',
  2: 'both_moves_hold_better_stronger',
  3: 'losing_either_way',
};

// "Zero-or-blank, deeply": null/undefined/'' and the number 0 carry no information, an
// empty array/object does too, and an OBJECT all of whose values are zero-or-blank is
// itself blank — this is what makes an all-zero stats block (e.g. threatStats) bubble up
// and get dropped entirely. Booleans, non-empty strings, non-zero numbers, and NON-EMPTY
// arrays are meaningful: a score vector of zeros is still data, so a non-empty array
// always counts as informative.
function isZeroOrBlankDeep(v) {
  if (v === null || v === undefined || v === '') return true;
  if (typeof v === 'number') return v === 0;
  if (typeof v === 'boolean' || typeof v === 'string') return false;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') return Object.values(v).every(isZeroOrBlankDeep);
  return false;
}

// Whether an already-pruned value should be omitted. Scalar 0 and false are KEPT as leaves
// (gap:0, isOptimal:false are meaningful); empty OR all-zero containers are dropped.
function isDroppable(v) {
  if (v === null || v === undefined || v === '') return true;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') return Object.keys(v).length === 0 || isZeroOrBlankDeep(v);
  return false;
}

// Recursively drop empty / all-zero containers (see isDroppable) from objects and arrays.
function pruneEmpty(value) {
  if (Array.isArray(value)) {
    return value.map(pruneEmpty).filter((v) => !isDroppable(v));
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      const pv = pruneEmpty(v);
      if (!isDroppable(pv)) out[k] = pv;
    }
    return out;
  }
  return value;
}

// Severity vocabulary for threat-window cells: minor (2-in-window), major (3-in-window
// latent, not playable now), immediate (major whose completing cell is gravity-top — a
// win this move). Structural tactical tags name a SHAPE, not a threat window, so they
// carry no severity (the tag is the meaning).
const IMMEDIATE_TAGS = new Set(['immediate_threat', 'double_threat']);
const MAJOR_TAGS = new Set(['major_threat_parity', 'major_threat_nonparity']);
const MINOR_TAGS = new Set(['minor_threat']);

// Severity for a pattern-map / lookahead tag. Returns undefined for structural tags.
function patternSeverity(tag) {
  if (IMMEDIATE_TAGS.has(tag)) return 'immediate';
  if (MAJOR_TAGS.has(tag)) return 'major';
  if (MINOR_TAGS.has(tag)) return 'minor';
  return undefined;
}

// True when cell string `cNrM` is the next square gravity will fill in its column on a board
// with the given 0-indexed `colHeights` (i.e. playing that column lands exactly there).
function isGravityTop(cellStr, colHeights) {
  const m = /^c(\d)r(\d)$/.exec(cellStr);
  if (!m) return false;
  const col0 = Number(m[1]) - 1;
  const row0 = Number(m[2]) - 1;
  return colHeights[col0] === row0;
}

// Stamp a lookahead example entry with severity derived from its tag (omit for structural tags).
function severityTag(entry) {
  const sev = patternSeverity(entry.tag);
  return sev ? { ...entry, severity: sev } : entry;
}

// Attach provenance labels to a cell group WITHOUT defeating the prune contract: a group
// with no cells stays a bare {cells: []} (so pruneEmpty still drops it); a non-empty group
// gains `owner` (and `severity` when provided).
function labelGroup(group, owner, severity) {
  const cells = group?.cells ?? [];
  if (cells.length === 0) return { cells: [] };
  const out = { cells, owner };
  if (severity) out.severity = severity;
  return out;
}

// Map a serialized pattern map ({tag → {cells}}) to a labeled one, stamping each non-empty
// group with `owner` (and a per-tag `severity` from patternSeverity).
function labelPatternMap(patternMap, owner) {
  if (!patternMap) return patternMap;
  const out = {};
  for (const [tag, value] of Object.entries(patternMap)) {
    out[tag] = labelGroup(value, owner, patternSeverity(tag));
  }
  return out;
}

// Project a board state's threat snapshot (summarizeThreats output) to parity buckets, each
// {count, cells}. Cells are kept — they are grounded squares that complement the movestring.
// Only the verbose 4-cell `windows` and the redundant non-split aggregates are dropped.
// Non-empty buckets carry `owner` and `severity`; empty buckets stay bare {count,cells} so
// pruneEmpty still collapses them. Major buckets carry severity:'immediate' iff all their
// cells are gravity-top on the snapshot board (bucket is atomic), else severity:'major'.
function compactThreats(s, colHeights) {
  if (!s) return null;
  const majorSeverity = (cells) =>
    cells.length && cells.every((c) => isGravityTop(c, colHeights)) ? 'immediate' : 'major';
  const major = (count, cells, owner) =>
    (cells?.length ? { count: count ?? 0, cells, owner, severity: majorSeverity(cells) }
                   : { count: count ?? 0, cells: cells ?? [] });
  const minor = (count, cells, owner) =>
    (cells?.length ? { count: count ?? 0, cells, owner, severity: 'minor' }
                   : { count: count ?? 0, cells: cells ?? [] });
  const pmajP = s.playerMajorParityAligned   ?? { count: 0, cells: [] };
  const pmajN = s.playerMajorNonParity        ?? { count: 0, cells: [] };
  const omajP = s.opponentMajorParityAligned ?? { count: 0, cells: [] };
  const omajN = s.opponentMajorNonParity      ?? { count: 0, cells: [] };
  const playerMajorTotal   = (pmajP.count ?? 0) + (pmajN.count ?? 0);
  const opponentMajorTotal = (omajP.count ?? 0) + (omajN.count ?? 0);
  return {
    playerMajorParityAligned:   major(pmajP.count, pmajP.cells, 'player'),
    playerMajorNonParity:       major(pmajN.count, pmajN.cells, 'player'),
    playerMinor:                minor(s.playerMinor, s.playerMinorCells, 'player'),
    opponentMajorParityAligned: major(omajP.count, omajP.cells, 'opponent'),
    opponentMajorNonParity:     major(omajN.count, omajN.cells, 'opponent'),
    opponentMinor:              minor(s.opponentMinor, s.opponentMinorCells, 'opponent'),
    // Totals — emitted only when > 0 so that absence = "no major threats" even in prune:false mode.
    // "Zero parity-aligned majors ≠ zero majors" — playerMajorNonParity alone keeps this > 0.
    ...(playerMajorTotal   > 0 ? { playerMajorTotal }   : {}),
    ...(opponentMajorTotal > 0 ? { opponentMajorTotal } : {}),
  };
}

// Parity-aware threat tags whose cells duplicate threatStats' player-side buckets
// (classifier.js detectMajorThreatParity / detectMajorThreatNonParity / detectMinorThreat
// each return categorizeThreats().player.<bucket>.cells). Stripped from the feature-vector
// patterns* maps so the parity threats live in one place: threatStats.
const THREAT_TAGS_IN_THREATSTATS = ['major_threat_parity', 'major_threat_nonparity', 'minor_threat'];

// Drop the parity-threat dupe tags from a serialized pattern map (tag → {cells}). Falsy
// inputs (null/undefined — an absent board state) pass through unchanged.
function stripThreatDupeTags(patternMap) {
  if (!patternMap) return patternMap;
  const out = {};
  for (const [tag, value] of Object.entries(patternMap)) {
    if (!THREAT_TAGS_IN_THREATSTATS.includes(tag)) out[tag] = value;
  }
  return out;
}

/**
 * Project the full (uncensored) promptData into a tactics-only FEATURE VECTOR: decision
 * primitives + blunder classification + the static pattern detections + parity-bucket threats
 * (count + cells) + the sparse look-ahead. Grounded cells are KEPT throughout — they complement
 * the movestring with specific board detail not recoverable from counts alone.
 *
 * Only LLM-prompt plumbing, prose, and pure derivations are dropped: the annotation whitelist
 * (`allowedSet`), the capsule-expansion spec (`zoneAliasMap`), all reason prose
 * (`humanReason`/`positiveReason`/`terseReason`), KB-term plumbing
 * (`relevantPatternKeys`/`kbTerms`), display labels (`playerName`), the rendered
 * `threatComparison`/`threatShowFlags`, the redundant `lookaheadRaw`, and trivially-derived
 * scalars (`positionTier`, `isOptimal`, `opponentPerspective`, `lookaheadFired`).
 * Raw solver scores (`preScores`/`gap`) are dropped too — their magnitudes are misleading
 * engine artifacts; the qualitative `gapBucket` (small/moderate/large) is surfaced instead,
 * and the with-best-play outcomes ride on `lookahead.bestOutcome`/`postBlunderOutcome`.
 * The three parity-aware threat tags (`major_threat_parity`/`major_threat_nonparity`/
 * `minor_threat`) are also stripped from the `patterns*` maps — they are an exact duplicate
 * of `threatStats`' player-side buckets (see `stripThreatDupeTags`).
 *
 * @param {object} promptData
 * @param {object} [opts]
 * @param {boolean} [opts.prune=true]  when true (the default), recursively drop empty / all-zero
 *   containers (the "recursive elimination" — see pruneEmpty). Callers that need the full
 *   fixed-shape vector (e.g. so a UI can toggle the collapse both ways) pass `{ prune: false }`.
 */
export function toFeatureVector(promptData, { prune = true } = {}) {
  if (!promptData) return promptData;
  const la = promptData.lookahead;
  const vector = {
    // decision primitives
    movestring: promptData.movestring,
    perspective: promptData.perspective,
    playedCol: promptData.playedCol,
    bestCol: promptData.bestCol,
    playedCell: promptData.playedCell,   // exact square the played disc lands on
    bestCell: promptData.bestCell,       // exact square the better move lands on
    // Raw solver scores (preScores/gap) are intentionally NOT surfaced: their magnitudes are
    // engine artifacts a reader misreads (see feedback_deep_reveal_product_mindset — score is a
    // compass, not the reason). The qualitative severity lives in `gapBucket`, and the
    // with-best-play outcomes live in lookahead.bestOutcome / postBlunderOutcome.
    gapBucket: promptData.gapBucket,     // 'small' | 'moderate' | 'large' (from getGapAndFraming)
    // blunder classification
    tag: promptData.tag,
    direction: promptData.direction,
    // sparseness / opening signal
    isSparse: promptData.isSparse,
    openingContext: promptData.openingContext,     // { namedOpening } XOR { centrality } on book/opening boards
    centerDominance: !!promptData.centerDominance, // sole signal on early/positional boards
    // static pattern detections (tag → {cells}) at the key board states. The three
    // parity-aware threat tags are stripped here: their cells are a strict, exact duplicate
    // of threatStats' player-side buckets (all derived from categorizeThreats().player.*),
    // and threatStats is the richer home (parity split + opponent side + count).
    patternsBest:        labelPatternMap(stripThreatDupeTags(promptData.patternsBest),        'player'),
    patternsPreMove:     labelPatternMap(stripThreatDupeTags(promptData.patternsPreMove),     'player'),
    patternsPostBlunder: labelPatternMap(stripThreatDupeTags(promptData.patternsPostBlunder), 'player'),
    patternsOpponent:    labelPatternMap(stripThreatDupeTags(promptData.patternsOpponent),    'opponent'),
    // parity-bucket threats — count + CELLS — at each board state.
    // colHeights are needed per-snapshot to classify gravity-top majors. Guard the Board
    // construction: bestCol/playedCol can be absent on synthetic promptData (tests, eval harness).
    ...(() => {
      const ms = promptData.movestring ?? '';
      const preH    = new Board(ms).colHeights;
      const bestH   = promptData.bestCol   != null ? new Board(ms + promptData.bestCol).colHeights   : preH;
      const playedH = promptData.playedCol != null ? new Board(ms + promptData.playedCol).colHeights : preH;
      return {
        threatStats: {
          pre:    compactThreats(promptData.threatStats?.pre,    preH),
          best:   compactThreats(promptData.threatStats?.best,   bestH),
          played: compactThreats(promptData.threatStats?.played, playedH),
        },
      };
    })(),
    // sparse look-ahead. `categoryExamples` / `oppCategoryExamples` carry the NOVEL cell-sets
    // (the squares the better move opens that the played move cannot) — grounded tactical
    // detail that complements the movestring and is NOT recoverable from counts alone. They
    // are priority-ordered and carry `novelInstances` (distinct novel cells). Story B:
    // `categoryExamples` is now a SYMMETRIC cell-set diff — each entry carries `bestNovel`
    // (cells the better move opens that the played move cannot) AND `playedNovel` (cells the
    // played move opens that the better move cannot), each with per-cell `realizedOnPly`.
    // The old count-based `perCategory` table is removed (superseded by the symmetric diff);
    // `tallyComparison` remains on `rawLookahead` for prompt_data/debugging but is NOT
    // projected here. `reachability` (floor/ceiling) and `edgeType` ground causation/stakes.
    lookahead: la ? {
      case: la.case,
      bestOutcome: la.bestOutcome ?? null,                 // {win,draw,loss}_with_best_play — better move
      postBlunderOutcome: la.postBlunderOutcome ?? null,   // {win,draw,loss}_with_best_play — played move
      // Story A: outcome timing (always present when lookahead ran)
      outcomeTiming: la.outcomeTiming ?? undefined,
      // Story A: completing 4-window found within search horizon (absent when not found)
      decisiveLine: la.decisiveLine ?? undefined,
      // Story B: floor/ceiling per side — present only when at least one floor is 'loss'
      reachability: la.reachability ?? undefined,
      // Story B: nature of the positional difference — always present when lookahead ran
      edgeType: la.edgeType,
      // Story B: symmetric cell-set diff — bestNovel/playedNovel each pruned when empty
      categoryExamples: (la.categoryExamples ?? []).map((e) => {
        const tagged = severityTag({ ...e, owner: 'player' });
        return {
          tag: tagged.tag,
          owner: tagged.owner,
          severity: tagged.severity,
          bestNovel: e.bestNovel?.length ? e.bestNovel : undefined,       // pruned if empty
          playedNovel: e.playedNovel?.length ? e.playedNovel : undefined, // pruned if empty
          novelInstances: e.novelInstances,
        };
      }),
      oppCategoryExamples: (la.oppCategoryExamples ?? []).map((e) => severityTag({ ...e, owner: 'opponent' })),
    } : null,
  };
  return prune ? pruneEmpty(vector) : vector;
}

// buildMajorDiscPairSet, getMinorThreatWindows, and emptyCellsFromWindows moved to
// classifier.js (low-level, so categorizeThreats / classifyPattern detectors and the
// sparse look-ahead can share them without an import cycle). Imported at top of file.

// Convert a sorted array of "cNrM" cell strings to a zone spec where each cell is its own window.
//   "windows:c2r4|c5r3"
// Returns 'tg' for an empty list so the gate skips it gracefully (same as tg vacuous-valid rule).
function cellsToZoneSpec(cells) {
  if (!cells || cells.length === 0) return 'tg';
  return 'windows:' + cells.join('|');
}

// Convert a list of windows to the zone alias expansion spec:
//   "windows:c2r4,c3r4,c4r4,c5r4|c3r5,c4r5,c5r5,c6r5"
// Each window becomes a pipe-separated group; cells within a window are comma-separated.
function windowsToZoneSpec(windows) {
  if (!windows || windows.length === 0) return 'windows:';
  return 'windows:' + windows
    .map(w => w.map(([r, c]) => `c${c + 1}r${r + 1}`).join(','))
    .join('|');
}

// Replace [zone:alias] / [/zone:alias] tokens in LLM output with their expanded
// [zone:windows:...] / [/zone:windows:...] equivalents.
// Expansion must happen before annotation validation so the gate sees valid specs.
export function expandZoneAliases(text, aliasMap) {
  let result = text;
  for (const [alias, spec] of Object.entries(aliasMap)) {
    result = result.replaceAll(`[zone:${alias}]`, `[zone:${spec}]`);
    result = result.replaceAll(`[/zone:${alias}]`, `[/zone:${spec}]`);
  }
  return result;
}

// Green = player 1 (rm/rn in getMajorThreatCells); wins on 0-indexed even rows (0,2,4).
// Gray  = player 2 (ym/yn in getMajorThreatCells); wins on 0-indexed odd rows  (1,3,5).
function summarizeThreats(board, perspective) {
  // Delegate the parity-aware split + immediate-cell / shadow-minor exclusion to the
  // canonical categorizer; keep this function's legacy output shape unchanged so the
  // threatComparison / zoneAliasMap / prompt path is byte-identical.
  const cat = categorizeThreats(board, perspective);
  const playerDisc   = perspective === 1 ? 1 : 2;
  const opponentDisc = perspective === 1 ? 2 : 1;

  const mergeMajor = (side) =>
    [...side.majorParityAligned.cells, ...side.majorNonParity.cells].sort();
  const playerMajorCells   = mergeMajor(cat.player);
  const opponentMajorCells = mergeMajor(cat.opponent);
  const playerMinorCells   = cat.player.minor.cells;
  const opponentMinorCells = cat.opponent.minor.cells;

  // Windows are still needed for the minor-threat zone aliases (categorizeThreats only
  // returns the empty completing cells, not the full 4-cell windows).
  const playerWindows   = getMinorThreatWindows(board.board, playerDisc);
  const opponentWindows = getMinorThreatWindows(board.board, opponentDisc);

  return {
    playerMajor: playerMajorCells.length,
    playerMajorCells,
    playerMinor: playerMinorCells.length,
    playerMinorCells,
    opponentMajor: opponentMajorCells.length,
    opponentMajorCells,
    opponentMinor: opponentMinorCells.length,
    opponentMinorCells,
    playerWindows,
    opponentWindows,
    // Parity split (new) — count + cells per bucket.
    playerMajorParityAligned: cat.player.majorParityAligned,
    playerMajorNonParity:     cat.player.majorNonParity,
    opponentMajorParityAligned: cat.opponent.majorParityAligned,
    opponentMajorNonParity:     cat.opponent.majorNonParity,
  };
}

function formatThreatStats(
  s,
  playerMajorAlias, opponentMajorAlias,
  playerMinorAlias, opponentMinorAlias,
  showPlayerMajor = true, showOpponentMajor = true,
  showPlayerMinor = true, showOpponentMinor = true,
) {
  const fmt = (count, alias) => {
    // Zero counts render as a word, not a digit: there is no zone tag to copy on a
    // zero line, and a bare "0" tempts the model to wrap it in the banned [zone:tg]
    // placeholder (→ P3:engine_jargon). "none" reads naturally and carries no tag.
    if (count === 0) return 'none';
    return `[zone:${alias}]${count}[/zone:${alias}]`;
  };
  const lines = [];
  if (showPlayerMajor)   lines.push(`- Your major threats: ${fmt(s.playerMajor,   playerMajorAlias)}`);
  if (showPlayerMinor)   lines.push(`- Your minor threats: ${fmt(s.playerMinor,   playerMinorAlias)}`);
  if (showOpponentMajor) lines.push(`- Opponent major threats: ${fmt(s.opponentMajor, opponentMajorAlias)}`);
  if (showOpponentMinor) lines.push(`- Opponent minor threats: ${fmt(s.opponentMinor, opponentMinorAlias)}`);
  return lines.join('\n');
}

// Priority cascade for positive-framing on optimal moves (FR-013).
// First matching tag wins.
const POSITIVE_CASCADE = [
  'forced_win',
  'double_threat',
  'immediate_threat',
  'undercut',
  'overcut',
  'figure_7',
  'j_shape',
  'z_threat',
  // odd_even_threat de-listed from the coach 2026-06-25; parity-aware threats take its slot.
  'major_threat_parity',
  'major_threat_nonparity',
  'claimeven',
  'minor_threat',
  'drawing_move',
  'suboptimal_move',
];

// Tier 1 tags: detectors that return concrete cells[].
const TIER1_TAGS = new Set([
  'immediate_threat', 'double_threat',
  'undercut', 'overcut', 'figure_7', 'j_shape',
]);

// Tier 2 tags: z_threat returns cells:[] but can derive a capsule column.
const TIER2_TAGS = new Set(['z_threat']);

// Tier 3 tags: position-global, not added to allowedSet.
// const TIER3_TAGS = new Set(['forced_win', 'forced_block', 'forbidden_columns', 'odd_even_threat', 'claimeven']);

/**
 * Safely run classifyPattern and return an empty Map on error.
 * c4solver errors on won positions; we need graceful fallback.
 */
async function safeClassifyPattern(ms, perspective, solver) {
  try {
    return await classifyPattern(ms, perspective, solver);
  } catch {
    return new Map();
  }
}

/**
 * Build allowedSet from the union of all classifyPattern Map results.
 *
 * Tier 1 (concrete cells): immediate_threat, double_threat, undercut, overcut, figure_7, j_shape
 *   → emit { cells, zoneSpec: 'tg' }
 * Tier 2 (z_threat, cells []): derive capsuleCol from the board at `boardForCapsule`
 *   → emit { col: capsuleCol, parity: 'odd', zoneSpec: 'tg' }
 * Tier 3 (forced_win, forced_block, forbidden_columns, odd_even_threat, claimeven): skip.
 *
 * NULL rule: if no Tier 1 or Tier 2 entry exists across all calls, return null.
 *
 * @param {Array<Map<string,{cells:string[]}>>} patternMaps  array of classifyPattern results
 * @param {Board} boardForCapsule  board used for z_threat capsule column derivation
 * @returns {Array|null}
 */
function buildAllowedSetFromPatternMaps(patternMaps, boardForCapsule) {
  const entries = [];
  const seenCells = new Set();

  for (const { map, owner } of patternMaps) {
    for (const [tag, { cells }] of map) {
      if (TIER1_TAGS.has(tag) && cells.length > 0) {
        const dedupedCells = cells.filter(c => {
          if (seenCells.has(c)) return false;
          seenCells.add(c);
          return true;
        });
        if (dedupedCells.length > 0) entries.push({ cells: dedupedCells, zoneSpec: 'tg', owner });
      } else if (TIER2_TAGS.has(tag)) {
        // Derive capsule column: first col where (ROWS - colHeights[c]) % 2 === 1
        const { colHeights } = boardForCapsule;
        let capsuleCol = -1;
        for (let c = 0; c < 7; c++) {
          if (colHeights[c] < ROWS && (ROWS - colHeights[c]) % 2 === 1) {
            capsuleCol = c;
            break;
          }
        }
        if (capsuleCol >= 0) {
          entries.push({ col: capsuleCol, parity: 'odd', zoneSpec: 'tg', owner });
        }
        // If no odd-parity column exists, treat as Tier 3 (skip)
      }
      // Tier 3: skip
    }
  }

  return entries.length > 0 ? entries : null;
}

/**
 * Opening-provenance reason for the deep-reveal prompt (opening-theory PART B).
 *
 * The four-guard derivation (namedOpening XOR centrality) comes from the SHARED, side-effect-free
 * module `computeOpeningContext` (scripts/reason_engine/computeOpeningContext.mjs) — the SAME
 * function the offline reason vector uses, so the production prompt and the offline vector can never
 * silently diverge if the guards change. This wrapper ADDS the grounded prompt-section TEXT on the
 * `namedOpening` branch and normalizes the "no reason" case to `null`.
 *
 * SOLVER-FREE: it reuses the pre-move `scores` the caller already has — no new solver query (I0).
 *
 * @returns {{ namedOpening: {id,family,matchedPrefixLen,bookNextCol}, section: string }
 *          | { defense: {id,family,matchedPrefixLen,bestDefenseCol,centralityGrounded}, section: string }
 *          | { centrality: {bestCol,playedCol,betterHasMoreLines,text,resistAndWait} }
 *          | null }
 */
export function buildOpeningReason({ movestring, playedCol, bestCol, bestScore, scores, player }) {
  const oc = computeOpeningContext({ movestring, playedCol, bestCol, bestScore, scores, player });
  if (!oc) return null;
  if (oc.centrality) return oc;   // centrality carries no bespoke section (centerDominance renders it)

  if (oc.defense) {
    const { id, family, bestDefenseCol, centralityGrounded } = oc.defense;
    // Mechanical human label from the canonical KB id (strip `allen-`, hyphens → spaces — EXCEPT a
    // hyphen between two digits, e.g. "5-4", which is a numeric column pair and must stay hyphenated);
    // a shared prefix reports the family only (id null). "second side of …" makes the P2 perspective
    // explicit.
    const label = id
      ? `the ${id.replace(/^allen-/, '').replace(/-(?!\d)/g, ' ')}`
      : `a ${family}`;
    const centralClause = centralityGrounded
      ? ` The most resilient hold is column ${bestDefenseCol + 1}: it is more central, running through `
        + `more potential fours — including your even rows (2 and 4), which favour the second player.`
      : ` The most resilient hold is column ${bestDefenseCol + 1} — it loses more slowly than the move you played.`;
    // Provenance + canon frame ONLY; DEFERS the concrete why-it-loses to the two-halves sections.
    const section = [
      '## Opening theory',
      '',
      `This position is the second side of ${label}, a known first-player winning plan — so it is `
        + `already theoretically lost for you. Your only practical chance is to resist and hold the `
        + `toughest line, waiting for the first player to slip.` + centralClause + ` You left the most `
        + `resilient defense by playing column ${playedCol + 1}. `
        + `Explain the consequence using ONLY the evidence in the other sections; do not invent a tactic `
        + `or claim a threat the boards do not show.`,
    ].join('\n');
    return { defense: oc.defense, section };
  }

  const { id, family, bookNextCol } = oc.namedOpening;
  // Grounded human label. A SPECIFIC opening name only when `id` is unique (I2 — guard 4 already set
  // `id: null` for a shared prefix); a shared prefix reports the family only. The specific label is
  // derived MECHANICALLY from the canonical KB id (strip `allen-` vendor prefix, hyphens → spaces) —
  // no invented words.
  const label = id
    ? `the ${id.replace(/^allen-/, '').replace(/-/g, ' ')}`
    : `a ${family}`;
  // Provenance only: it states the book line + the deviation, and DEFERS the why-it-loses to the
  // other prompt sections (the two-halves evidence). It never asserts a tactic or a threat.
  const section = [
    '## Opening theory',
    '',
    `This position is on ${label}, a known first-player winning plan. The book continuation is `
      + `column ${bookNextCol + 1}, which keeps the win. You left the book line by playing `
      + `column ${playedCol + 1}. Explain the consequence of that deviation using ONLY the evidence `
      + `in the other sections; do not invent a tactic or claim a threat the boards do not show.`,
  ].join('\n');
  return { namedOpening: oc.namedOpening, section };
}

/**
 * Shared: build the LLM prompt for a given (movestring, col) without calling the LLM.
 *
 * @param {string} movestring   movestring of the position before the user's move
 * @param {number} col          0-indexed column the user played
 * @param {number} [rounds=1]   number of simulation rounds (currently unused in new flow)
 * @param {object} solver       c4solver wrapper (required)
 * @returns {Promise<{prompt: string, allowedSet: Array|null}
 *                  |{prompt: null, allowedSet: null, allMovesEqual: true}
 *                  |null>}
 */
export async function buildExplainContext(movestring, col, rounds = 1, solver, deps = {}) {
  const board = new Board(movestring);
  const perspective = movestring.length % 2 === 0 ? 1 : 2;
  const playerName = perspective === 1 ? 'Green' : 'Gray';
  const opponentPerspective = perspective === 1 ? 2 : 1;

  // ── Step 1: Solver scores + settled check + contrast move ─────────────────
  const preScores = movestring.length > 0
    ? await solver.query(movestring)
    : EMPTY_BOARD_SCORES;

  const { isSettled } = checkAllMovesEqual(preScores, board);
  if (isSettled) {
    return { prompt: null, allowedSet: null, allMovesEqual: true };
  }

  const contrast = selectContrastMove(preScores, col, board);
  if (contrast === null) return null;
  const { contrastCol, isOptimal } = contrast;

  const { gap, gapBucket } = getGapAndFraming(preScores, col, contrastCol);

  // ── Trivial-optimal guard ──────────────────────────────────────────────────
  // When the user played an optimal move and the gap is small, all alternatives
  // are equivalent in practice. Calling the LLM forces it to fabricate nuance.
  // Return a canned message instead.
  const positionTier = getPositionTier(preScores, board);
  if (isOptimal && gapBucket === 'small') {
    let trivialExplanation;
    if (positionTier === 'WINNING') {
      trivialExplanation = `All available moves maintain your winning position — this is solid. No single column decisively outperforms the others here.`;
    } else if (positionTier === 'LOSING') {
      trivialExplanation = `All available moves lead to difficult positions — your opponent holds the advantage regardless. No column changes the fundamental outlook.`;
    } else {
      trivialExplanation = `All available moves are roughly equivalent. There is no clear best choice in this balanced position.`;
    }
    return { prompt: null, allowedSet: null, trivial: true, trivialExplanation };
  }

  // ── Step 2: Determine bestCol ─────────────────────────────────────────────
  // isOptimal = true → user played the best move; bestCol = col (their move)
  // isOptimal = false → user made a blunder; bestCol = contrastCol (the better move)
  const bestCol = isOptimal ? col : contrastCol;

  // ── Step 3 / 4: Blunder or Optimal path ───────────────────────────────────
  let tag = null;
  let direction = null;
  let humanReason = null;
  let positiveReason = null;
  let terseReason = null;        // tagBlunder's internal `reason` (e.g. "matched missed_own: figure_7")
  let opponentPatterns = null;   // patOpp / patOppPre, when a direction-specific augmentation runs

  // correctMovePatterns: patterns at the best-move position
  const correctMovePatterns = await safeClassifyPattern(
    movestring + bestCol, perspective, solver
  );

  if (!isOptimal) {
    // Blunder path
    const blunderResult = await tagBlunder(movestring, col, bestCol, solver);
    tag = blunderResult.tag;
    direction = blunderResult.direction;
    terseReason = blunderResult.reason ?? null;
    humanReason = REASON_TEMPLATES.get(`${tag}:${direction}`) ?? 'A stronger move was available.';
    positiveReason = null;
  } else {
    // Optimal path — use priority cascade (NOT Map insertion order)
    let matchedTag = null;
    for (const t of POSITIVE_CASCADE) {
      if (correctMovePatterns.has(t)) {
        matchedTag = t;
        break;
      }
    }
    positiveReason = matchedTag
      ? (POSITIVE_TEMPLATES.get(matchedTag) ?? 'This was the strongest move available.')
      : 'This was the strongest move available.';
  }

  // ── Step 5: allowedSet derivation ─────────────────────────────────────────
  // Base union: patterns at played position + patterns at best-move position
  // Each entry carries an `owner` so cell references can be labeled in the prompt
  // as belonging to "you" or "your opponent" (prevents the LLM from guessing/flipping
  // threat ownership). Player-perspective maps → 'you'; opponent-perspective → 'opponent'.
  const patMaps = [];

  const patPlayed = await safeClassifyPattern(movestring, perspective, solver);
  patMaps.push({ map: patPlayed, owner: 'you' });
  patMaps.push({ map: correctMovePatterns, owner: 'you' }); // already computed above

  // Direction-specific augmentations
  if (!isOptimal && direction === 'enabled_opponent') {
    // Opponent's best response after the blunder
    try {
      const oppScores = await solver.query(movestring + col);
      const validOppScores = oppScores.map((s, i) => ({ s, i })).filter(({ s }) => s !== -1000);
      if (validOppScores.length > 0) {
        const oppBestCol = validOppScores.reduce((best, cur) => cur.s > best.s ? cur : best).i;
        const patOpp = await safeClassifyPattern(
          movestring + col + oppBestCol, opponentPerspective, solver
        );
        patMaps.push({ map: patOpp, owner: 'opponent' });
        opponentPatterns = patOpp;
      }
    } catch {
      // solver error on won position or other; skip augmentation
    }
  } else if (!isOptimal && direction === 'defensive_miss') {
    // Opponent's existing threats before the move
    const patOppPre = await safeClassifyPattern(movestring, opponentPerspective, solver);
    // Restrict to forced_block and immediate_threat only
    const restricted = new Map();
    for (const t of ['forced_block', 'immediate_threat']) {
      if (patOppPre.has(t)) restricted.set(t, patOppPre.get(t));
    }
    if (restricted.size > 0) { patMaps.push({ map: restricted, owner: 'opponent' }); opponentPatterns = restricted; }
  }

  const postBestBoard = new Board(movestring + bestCol);
  const allowedSet = buildAllowedSetFromPatternMaps(patMaps, postBestBoard);

  // Whitelist the played column and contrast column in P5Strong when allowedSet is non-null.
  // P5Strong only fires when allowedSet is provided; if null, all column refs are unchecked.
  // Landing squares (1-indexed display form, matching cell refs elsewhere). The played
  // and better moves are alternatives from the same pre-move board, so both heights
  // come from `board`. These give the LLM a concrete anchor even when no threats exist.
  const playedCell = `c${col + 1}r${board.colHeights[col] + 1}`;
  const bestCell   = `c${bestCol + 1}r${board.colHeights[bestCol] + 1}`;

  if (allowedSet !== null) {
    allowedSet.push({ col, validationOnly: true }); // the move being explained
    // Whitelist the exact cell where the played disc landed (1-indexed cNrM).
    allowedSet.push({ cells: [playedCell], validationOnly: true });
    if (!isOptimal) {
      allowedSet.push({ col: contrastCol, validationOnly: true }); // the better move
      allowedSet.push({ cells: [bestCell], validationOnly: true }); // where it lands
    }
  }

  // ── Step 6: Board visualizations ──────────────────────────────────────────
  const postMovestring = movestring + col;
  const bestMovestring = movestring + bestCol;
  const [boardViz, bestMoveBoardViz, postBoardViz] = await Promise.all([
    getBoardVisualization(movestring || ''),
    getBoardVisualization(bestMovestring),
    getBoardVisualization(postMovestring),
  ]);

  // ── Step 7: KB terms section ───────────────────────────────────────────────
  // Gather pattern keys from all three boards + the blunder tag itself.
  const patPostBlunder = await safeClassifyPattern(postMovestring, perspective, solver);

  const relevantPatternKeys = new Set();
  for (const key of patPlayed.keys()) relevantPatternKeys.add(key);
  for (const key of correctMovePatterns.keys()) relevantPatternKeys.add(key);
  for (const key of patPostBlunder.keys()) relevantPatternKeys.add(key);
  if (tag) relevantPatternKeys.add(tag);

  // ── Step 7a: Threat stats (needed for KB term filtering and threat comparison) ──
  // Compute here so they're available both for conditional KB term inclusion and
  // for the threat comparison section (Step 8), avoiding duplicate computation.
  const preStats     = summarizeThreats(board, perspective);
  const bestBoard    = new Board(bestMovestring);
  const blunderBoard = new Board(postMovestring);
  const bestStats    = summarizeThreats(bestBoard, perspective);
  const blunderStats = summarizeThreats(blunderBoard, perspective);

  // Show a threat metric whenever the move choice CHANGED it — i.e. the count is not
  // identical across all three board states (pre / best / played). This gives the LLM
  // the full picture, including a threat the PLAYED move created that the better move
  // did not, so it can produce educated feedback ("even though your move creates a
  // minor threat, the better move is stronger because…"). Rows whose count is identical
  // across all three boards do not distinguish the moves and are omitted — that also
  // keeps the KB term injection (below) backed by a concrete data row, preventing the
  // empty-vocab hallucination where the LLM invents a threat it was named but not shown.
  const differs3 = (a, b, c) => !(a === b && b === c);
  const showPlayerMajor   = differs3(preStats.playerMajor,   bestStats.playerMajor,   blunderStats.playerMajor);
  const showOpponentMajor = differs3(preStats.opponentMajor, bestStats.opponentMajor, blunderStats.opponentMajor);
  const showPlayerMinor   = differs3(preStats.playerMinor,   bestStats.playerMinor,   blunderStats.playerMinor);
  const showOpponentMinor = differs3(preStats.opponentMinor, bestStats.opponentMinor, blunderStats.opponentMinor);

  // major_threat / minor_threat: include their KB definitions ONLY when a corresponding
  // threat-comparison row is actually shown. The two criteria MUST agree — injecting a
  // term with no data row led the LLM to fabricate/misattribute it (deep-reveal eval).
  if (showPlayerMajor || showOpponentMajor) relevantPatternKeys.add('major_threat');
  if (showPlayerMinor || showOpponentMinor) relevantPatternKeys.add('minor_threat');

  const kbTermLines = [];
  const kbTermIds = [];
  const kbTerms = [];
  const seenKbIds = new Set();
  for (const [patternKey, kbEntry] of Object.entries(PATTERN_KB)) {
    // Only entries with a file-backed KB article
    if (!kbEntry.id) continue;
    // Include ONLY when the pattern actually fired in this position. There is no
    // "always_include glossary" path: injecting a term with no instance on the board
    // led the LLM to fabricate/misapply it (parity, gravity_top — see deep-reveal eval).
    if (!relevantPatternKeys.has(patternKey)) continue;

    if (seenKbIds.has(kbEntry.id)) continue;
    seenKbIds.add(kbEntry.id);

    const shortSummary = loadKBShortSummary(kbEntry.id);
    if (!shortSummary) continue;

    // Always use the pattern key as the tag id so the LLM writes e.g. [term:fork].
    // Display name is the human-readable pattern key (underscores → spaces).
    // KB article slugs with provenance prefixes (community-/allen-) must not appear
    // in the prompt — the LLM copies them verbatim into its output.
    const tagId = patternKey;
    const displayName = patternKey.replace(/_/g, ' ');
    kbTermLines.push(
      `- [term:${tagId}] **${displayName}** (${tagId}): ${shortSummary}`
    );
    kbTermIds.push(tagId);
    kbTerms.push({ tagId, kbId: kbEntry.id, displayName, summary: shortSummary });
  }

  const kbTermsSection = kbTermLines.length > 0
    ? `## KB term definitions\n\nThe following tactical concepts apply to this position:\n\n${kbTermLines.join('\n')}`
    : '';

  // ── Step 8: Threat comparison section ─────────────────────────────────────
  // preStats / bestStats / blunderStats / bestBoard / blunderBoard computed in Step 7a.
  // show* flags (computed above, alongside KB-term gating) drive which rows render:
  // a metric is shown whenever it differs across the three board states.

  // Aliases are only added when their row appears in the prompt — alias in map ↔ row shown.
  const zoneAliasMap = {};
  if (showPlayerMajor) {
    zoneAliasMap['player-major-pre']    = cellsToZoneSpec(preStats.playerMajorCells);
    zoneAliasMap['player-major-best']   = cellsToZoneSpec(bestStats.playerMajorCells);
    zoneAliasMap['player-major-played'] = cellsToZoneSpec(blunderStats.playerMajorCells);
  }
  if (showOpponentMajor) {
    zoneAliasMap['opponent-major-pre']    = cellsToZoneSpec(preStats.opponentMajorCells);
    zoneAliasMap['opponent-major-best']   = cellsToZoneSpec(bestStats.opponentMajorCells);
    zoneAliasMap['opponent-major-played'] = cellsToZoneSpec(blunderStats.opponentMajorCells);
  }
  if (showPlayerMinor) {
    zoneAliasMap['player-minor-pre']    = cellsToZoneSpec(preStats.playerMinorCells);
    zoneAliasMap['player-minor-best']   = cellsToZoneSpec(bestStats.playerMinorCells);
    zoneAliasMap['player-minor-played'] = cellsToZoneSpec(blunderStats.playerMinorCells);
  }
  if (showOpponentMinor) {
    zoneAliasMap['opponent-minor-pre']    = cellsToZoneSpec(preStats.opponentMinorCells);
    zoneAliasMap['opponent-minor-best']   = cellsToZoneSpec(bestStats.opponentMinorCells);
    zoneAliasMap['opponent-minor-played'] = cellsToZoneSpec(blunderStats.opponentMinorCells);
  }

  const minorNoteClause = (showPlayerMajor || showOpponentMajor || showPlayerMinor || showOpponentMinor)
    ? ' Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.'
    : '';

  // When no threat row is directionally meaningful (all four show* flags false), the
  // section would render only its labels with empty bodies — an informationally-empty
  // section that primes the LLM to invent threats. Omit it entirely in that case.
  const anyThreatRow = showPlayerMajor || showOpponentMajor || showPlayerMinor || showOpponentMinor;
  const threatComparisonSection = !anyThreatRow ? undefined : [
    '## Threat comparison',
    '',
    `Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing an actual count, copy the zone tag shown on that line and wrap the count with it; when a line shows "none", just say so in plain words (e.g. "no minor threats") with no tag.${minorNoteClause}`,
    '',
    'Before the move:',
    formatThreatStats(
      preStats,
      'player-major-pre', 'opponent-major-pre',
      'player-minor-pre', 'opponent-minor-pre',
      showPlayerMajor, showOpponentMajor, showPlayerMinor, showOpponentMinor,
    ),
    '',
    `After the best move (column ${bestCol + 1}):`,
    formatThreatStats(
      bestStats,
      'player-major-best', 'opponent-major-best',
      'player-minor-best', 'opponent-minor-best',
      showPlayerMajor, showOpponentMajor, showPlayerMinor, showOpponentMinor,
    ),
    '',
    `After the move played (column ${col + 1}):`,
    formatThreatStats(
      blunderStats,
      'player-major-played', 'opponent-major-played',
      'player-minor-played', 'opponent-minor-played',
      showPlayerMajor, showOpponentMajor, showPlayerMinor, showOpponentMinor,
    ),
  ].join('\n');

  // Uncensored structured threat comparison for the eval harness (prompt_data). ALL four
  // metrics are always included across all three board states; `differs` carries the same
  // show* gate the prompt uses (which rows it would render), but no metric is dropped and
  // the immediate_threat suppression is NOT applied here — field selection is a Step-2
  // concern, this stage must expose everything computed.
  const threatComparisonData = [
    { metric: 'player_major',   differs: showPlayerMajor,   pre: preStats.playerMajor,   best: bestStats.playerMajor,   played: blunderStats.playerMajor,   preCells: preStats.playerMajorCells,   bestCells: bestStats.playerMajorCells,   playedCells: blunderStats.playerMajorCells },
    { metric: 'opponent_major', differs: showOpponentMajor, pre: preStats.opponentMajor, best: bestStats.opponentMajor, played: blunderStats.opponentMajor, preCells: preStats.opponentMajorCells, bestCells: bestStats.opponentMajorCells, playedCells: blunderStats.opponentMajorCells },
    { metric: 'player_minor',   differs: showPlayerMinor,   pre: preStats.playerMinor,   best: bestStats.playerMinor,   played: blunderStats.playerMinor,   preCells: preStats.playerMinorCells,   bestCells: bestStats.playerMinorCells,   playedCells: blunderStats.playerMinorCells },
    { metric: 'opponent_minor', differs: showOpponentMinor, pre: preStats.opponentMinor, best: bestStats.opponentMinor, played: blunderStats.opponentMinor, preCells: preStats.opponentMinorCells, bestCells: bestStats.opponentMinorCells, playedCells: blunderStats.opponentMinorCells },
  ];

  // Whitelist all threat cells across all three board states so P5Strong passes
  // after alias expansion (expanded windows: specs are validated against these cells).
  if (allowedSet !== null) {
    const allThreatCells = new Set([
      ...preStats.playerMajorCells,
      ...preStats.opponentMajorCells,
      ...preStats.playerMinorCells,
      ...preStats.opponentMinorCells,
      ...bestStats.playerMajorCells,
      ...bestStats.opponentMajorCells,
      ...bestStats.playerMinorCells,
      ...bestStats.opponentMinorCells,
      ...blunderStats.playerMajorCells,
      ...blunderStats.opponentMajorCells,
      ...blunderStats.playerMinorCells,
      ...blunderStats.opponentMinorCells,
    ]);
    if (allThreatCells.size > 0) {
      allowedSet.push({ cells: [...allThreatCells], validationOnly: true });
    }
  }

  // ── Step 8b: Sparse-board forward look-ahead ──────────────────────────────
  const isSparse = isAnchorlessPosition(
    { showPlayerMajor, showOpponentMajor, showPlayerMinor, showOpponentMinor },
    allowedSet,
  );
  let lookaheadSection;
  let lookaheadFired = false;
  let lookaheadData = null;
  let rawLookahead = null;      // the full runSparseLookahead return, uncensored
  let resolvedAllowedSet = allowedSet;
  // deps.skipLookahead skips the search entirely (eval-set generation just wants the
  // isSparse gate decision). deps.alwaysLookahead forces the search even on non-sparse
  // positions, but ONLY to populate prompt_data — it never injects the look-ahead section
  // or mutates the prompt's allowedSet/aliasMap (those stay gated on isSparse, preserving
  // production prompt behavior). The search is the expensive part.
  const lookaheadForPrompt = isSparse && !isOptimal && !deps.skipLookahead;
  // Data path: when alwaysLookahead is set (eval harness), compute the look-ahead for
  // prompt_data UNCONDITIONALLY — not gated on isOptimal. On a genuinely optimal position
  // bestCol === playedCol so the search has no "better vs played" delta and returns null
  // by construction, but we always attempt it so prompt_data carries the look-ahead
  // whenever one exists.
  const lookaheadForData = !!deps.alwaysLookahead && !deps.skipLookahead;
  if (lookaheadForPrompt || lookaheadForData) {
    let la = null;
    try {
      la = await runSparseLookahead(
        { movestring, playedCol: col, bestCol, perspective },
        { solver, classifyFn: deps.classifyFn, depth: deps.lookaheadDepth, budget: deps.lookaheadBudget, dedupeByScore: deps.lookaheadDedupeByScore },
      );
    } catch {
      // transient solver error in this optional section — treat as if look-ahead returned null
    }
    if (la) {
      rawLookahead = la;
      // Structured mirror for the eval harness (prompt_data). Cells come from the
      // already-deduped allowedSetEntries, not by re-parsing the alias cell strings.
      const flat = (entries) => (entries ?? []).flatMap((e) => e.cells);
      lookaheadData = {
        case: LOOKAHEAD_CASE_SLUGS[la.case] ?? `case_${la.case}`,
        player: la.tag ? { tag: la.tag, cells: flat(la.allowedSetEntries) } : null,
        opponent: la.oppTag ? { tag: la.oppTag, cells: flat(la.oppAllowedSetEntries) } : null,
        bestOutcome: la.bestOutcome ?? null,
        postBlunderOutcome: la.postBlunderOutcome ?? null,
        // Story A: outcome timing (always present from runSparseLookahead)
        outcomeTiming: la.outcomeTiming,
        // Story A: decisive line — omit key when buildDecisiveLine returned undefined
        ...(la.decisiveLine !== undefined && { decisiveLine: la.decisiveLine }),
        // Story B: reachability (floor/ceiling per side) — absent when no side's floor is 'loss'
        ...(la.reachability !== undefined && { reachability: la.reachability }),
        // Story B: edge type — always present when lookahead ran
        edgeType: la.edgeType,
        // Per-category novel examples (every category the better move opens that the played
        // move cannot), priority-ordered, ≤MAX_WAYS ways each. The prompt surfaces only the
        // top-priority `player`/`opponent` winner above; this carries the full set so a
        // downstream consumer can keep them all and decide what to filter.
        categoryExamples: la.categoryExamples ?? null,
        oppCategoryExamples: la.oppCategoryExamples ?? null,
        // Per-tag {pattern, bestCnt, playedCnt} over every Tier-1 structure the search saw —
        // the raw branch counts compareOpportunities ranks by (null when not computed).
        tallyComparison: la.tallyComparison ?? null,
        oppTallyComparison: la.oppTallyComparison ?? null,
      };

      // Prompt-affecting mutations are gated on isSparse AND a winner existing. runSparseLookahead
      // now always returns an object (to carry tallyComparison even with no winner), so we can no
      // longer key off `la` truthiness — fire only when there is a player or opponent structure.
      if (lookaheadForPrompt && (la.tag || la.oppTag)) {
        lookaheadFired = true;
        // Per-tag natural-language label + the "way" label used inside each zone tag.
        const NL = (t) => ({ double_threat: 'a double threat', immediate_threat: 'a winning move', undercut: 'an undercut threat', overcut: 'an overcut threat', figure_7: 'a figure-7 fork', j_shape: 'a J-shape threat' }[t] ?? 'a stronger structure');
        // Each alias expands server-side to the concrete cells the look-ahead found, so
        // the model never has to emit raw coordinates — it just drops the zone tag in.
        const wayLabel = (t) => ({ immediate_threat: 'the square that completes the win', double_threat: 'the square that forks two threats', undercut: 'the square that lands the undercut', overcut: 'the square that lands the overcut', figure_7: 'the square that completes the figure-7', j_shape: 'the square that completes the J-shape' }[t] ?? 'the key square');
        const wayLinesFor = (aliasMap, label) => Object.keys(aliasMap)
          .map((alias, i) => `- [zone:${alias}]${i === 0 ? label : 'another square that gets there'}[/zone:${alias}]`)
          .join('\n');
        // Providing a non-null allowedSet turns checkP5Strong ON (it was OFF while null).
        // The explanation unavoidably references the played and better COLUMNS and their
        // landing cells, so they MUST be whitelisted here too — mirror the existing
        // non-null block (explainContext.js:421-429). playedCell/bestCell already exist
        // in scope (computed at lines 418-419); do NOT recompute them.
        const moveCells = [
          { col, validationOnly: true },                 // the move played
          { cells: [playedCell], validationOnly: true }, // where it landed
          { col: contrastCol, validationOnly: true },    // the better move
          { cells: [bestCell], validationOnly: true },   // where it lands
        ];

        if (la.case === 3) {
          // Case 3 (losing either way): surface how best play punishes the move (opponent
          // structures) and, when present, how the player could punish an opponent slip.
          // CHECKPOINT: this framing is validated via the eval/judge-deep-reveals harness.
          Object.assign(zoneAliasMap, la.aliasMap, la.oppAliasMap);
          resolvedAllowedSet = [
            ...la.allowedSetEntries,
            ...la.oppAllowedSetEntries,
            ...moveCells,
          ];
          const parts = ['## What the better move leads to', ''];
          if (la.oppTag) {
            parts.push(`Your move loses to best play: if your opponent responds perfectly, they punish it by building toward ${NL(la.oppTag)}. This is a future possibility, NOT a fact on the board yet — these cells are empty now. Point the player at how the opponent would punish by USING the zone tag(s) below (they mark the exact square(s) where the opponent's threat would form); describe it as something the opponent could do next, never as already present:`);
            parts.push(wayLinesFor(la.oppAliasMap, wayLabel(la.oppTag)));
          }
          if (la.tag) {
            if (la.oppTag) parts.push('');
            parts.push(`This does not guarantee you a win, but if your opponent slips, the better move lets you punish by building toward ${NL(la.tag)} — again a future possibility, not a fact on the board yet. Point at it by USING the zone tag(s) below:`);
            parts.push(wayLinesFor(la.aliasMap, wayLabel(la.tag)));
          }
          lookaheadSection = parts.join('\n');
        } else {
          // Cases 1 & 2: structurally identical to the prior single-mode behavior.
          Object.assign(zoneAliasMap, la.aliasMap);
          resolvedAllowedSet = [...la.allowedSetEntries, ...moveCells];
          const wayLines = wayLinesFor(la.aliasMap, wayLabel(la.tag));
          lookaheadSection = `## What the better move leads to\n\nThis is a future possibility, NOT a fact on the board yet — these cells are empty now. If your opponent does not defend perfectly, the better move lets you build toward ${NL(la.tag)}. In your explanation, point the player at this concrete follow-up by USING the zone tag(s) below (they mark the exact square(s) where it forms); always describe it as something they could build next, never as already present:\n${wayLines}`;
        }
      }
    }
  }

  // ── Step 8c: Opening-provenance reason, then center-dominance reason ───────
  // On a blunder that leaves a KNOWN book winning line, the strongest honest, board-findable
  // reason is provenance: "you left <named opening>, a winning plan; the book move keeps the win."
  // It is orthogonal to the tactical sections (it defers the why-it-loses to the two-halves
  // evidence), so it renders whenever the named-opening guards hold — it frames the position, it
  // does not compete with a threat row or look-ahead. Off-book, the fallback is center-dominance.
  let openingSection;
  let openingContextData = null;
  let centerDominanceSection;
  let centerDominanceData = null;
  if (!isOptimal) {
    // contrastCol is a max-score legal column (selectContrastMove picks the centre-most argmax on
    // the blunder path), so preScores[contrastCol] is the true max legal score used by guard 3.
    const bestScore = preScores[contrastCol];
    const openingReason = buildOpeningReason({
      movestring, playedCol: col, bestCol: contrastCol, bestScore, scores: preScores, player: perspective,
    });
    // Tracks whether openingSection is a full "why the better move is stronger" framing (namedOpening
    // / defense) that must not double up with center-dominance, vs. the resist-and-wait canon frame
    // below, which carries NO geometric claim and explicitly defers to the center-dominance section.
    let openingSectionCompetesWithCenterDominance = false;
    if (openingReason?.namedOpening) {
      openingContextData = { namedOpening: openingReason.namedOpening };
      openingSection = openingReason.section;
      openingSectionCompetesWithCenterDominance = true;
    } else if (openingReason?.defense) {
      openingContextData = { defense: openingReason.defense };
      openingSection = openingReason.section;
      openingSectionCompetesWithCenterDominance = true;
    } else if (openingReason?.centrality) {
      openingContextData = { centrality: openingReason.centrality };
      if (openingReason.centrality.resistAndWait) {
        openingSection = [
          '## Opening theory',
          '',
          'You are the second player here and already on the back foot: your practical goal is to '
            + 'resist and hold, waiting for the first player to slip. The "## Why the better move is '
            + 'stronger" section explains why the more central column is the tougher hold.',
        ].join('\n');
      }
    }

    // Center-dominance (the pre-existing opening reason): compute on the whole blunder path so
    // prompt_data always carries it when available; the prompt SECTION keeps its original gate
    // (no threat row / look-ahead) AND yields to the named-opening/defense section when that fired,
    // so the two "why the better move is stronger" framings never double up (they are mutually
    // exclusive). The resist-and-wait canon frame does NOT compete — it explicitly defers.
    const cd = detectCenterDominance({ movestring, playedCol: col, bestCol: contrastCol });
    if (cd) {
      centerDominanceData = { reason: cd.reason };
      if (!lookaheadFired && !threatComparisonSection && !openingSectionCompetesWithCenterDominance) {
        centerDominanceSection = `## Why the better move is stronger\n\n${cd.reason}`;
      }
    }
  }

  // ── Step 9: Build prompt ───────────────────────────────────────────────────
  // Suppress threat comparison when tag is immediate_threat: one board state is
  // terminal (the game-ending move), so post-move threat counts are incoherent.
  const effectiveThreatComparison = tag === 'immediate_threat' ? undefined : threatComparisonSection;

  const prompt = buildBlunderExplainPrompt({
    tag,
    direction,
    humanReason,
    positiveReason,
    correctMovePatterns,
    boardViz,
    bestMoveBoardViz,
    postBoardViz,
    playerName,
    gap,
    gapBucket,
    allowedSet: resolvedAllowedSet,
    playedCol: col,
    contrastCol: isOptimal ? undefined : contrastCol,
    playedCell,
    bestCell: isOptimal ? undefined : bestCell,
    kbTermsSection: kbTermsSection || undefined,
    threatComparisonSection: effectiveThreatComparison,
    lookaheadSection,
    openingSection,
    centerDominanceSection,
  });

  // ── Uncensored snapshot of EVERYTHING buildExplainContext computes (Step-1 goal) ──
  // This is deliberately complete, not curated: a human or a thinking model should be able
  // to derive the deep reason a move is a blunder (and why the better move is stronger)
  // from this object alone. Field SELECTION + the prompt-shaping suppressions are Step-2/3
  // concerns and must NOT be applied here. classifyPattern returns Maps, which JSON-encode
  // to {} unless converted — serialize every pattern Map with m2o.
  const m2o = (m) => (m ? Object.fromEntries(m) : null);
  const promptData = {
    // ── identity / framing ──
    movestring,
    playedCol: col,
    perspective,
    playerName,
    opponentPerspective,

    // ── solver ground truth ──
    preScores,                                  // per-column scores from the pre-move position
    positionTier,                               // WINNING / LOSING / DRAW
    contrastCol,                                // the better column (always, even when optimal)
    bestCol,
    isOptimal,
    gap,
    gapBucket,

    // ── blunder framing ──
    tag,
    direction,
    terseReason,                                // tagBlunder's internal reason string
    humanReason,
    positiveReason,

    // ── pattern detections (Maps → plain objects) ──
    patternsBest: m2o(correctMovePatterns),     // patterns at the best-move position
    patternsPreMove: m2o(patPlayed),            // patterns at the pre-move decision position
    patternsPostBlunder: m2o(patPostBlunder),   // patterns after the played move
    patternsOpponent: m2o(opponentPatterns),    // direction-specific opponent augmentation, if any
    relevantPatternKeys: [...relevantPatternKeys],

    // ── concrete anchors ──
    playedCell,
    bestCell,
    allowedSet: resolvedAllowedSet,
    zoneAliasMap,

    // ── threats (full, uncensored) ──
    threatStats: { pre: preStats, best: bestStats, played: blunderStats },
    threatShowFlags: { showPlayerMajor, showOpponentMajor, showPlayerMinor, showOpponentMinor },
    threatComparison: threatComparisonData,     // all 4 metrics, each carries `differs`

    // ── KB terms ──
    kbTermIds,
    kbTerms,                                     // [{ tagId, kbId, displayName, summary }]

    // ── sparse look-ahead ──
    isSparse,
    lookaheadFired,
    lookahead: lookaheadData,                    // distilled view
    lookaheadRaw: rawLookahead,                  // full runSparseLookahead return

    // ── opening provenance (engine-aligned) + center dominance (legacy prod field) ──
    openingContext: openingContextData,          // { namedOpening } XOR { centrality }, else null
    centerDominance: centerDominanceData,
    // boardViz intentionally omitted — movestring + preScores + threatStats capture the
    // board state structurally; Step 1 tests whether the model needs the ASCII boards.
  };

  // Wire the FULL (unpruned) vector so the admin tool's "collapse empty" toggle works both
  // ways; the recursive elimination defaults ON in toFeatureVector for any other caller.
  const featureVector = toFeatureVector(promptData, { prune: false });

  return { prompt, promptData, featureVector, allowedSet: resolvedAllowedSet, zoneAliasMap, contrastCol: isOptimal ? undefined : contrastCol, isSparse, lookaheadFired };
}
