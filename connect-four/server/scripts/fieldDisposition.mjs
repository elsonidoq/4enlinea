// Closed field-disposition registry + coverage assertion (spec §6).
// Every leaf path present in a pruned narrator vector must map to a disposition;
// an unmapped path throws so a new engine field forces a conscious render/exclude decision.

export class UncoveredVectorFieldError extends Error {
  constructor(path) { super(`UncoveredVectorFieldError: ${path}`); this.name = 'UncoveredVectorFieldError'; this.path = path; }
}

export function leafPaths(obj, pre = '') {
  const out = [];
  if (Array.isArray(obj)) {
    if (obj.length === 0) return pre ? [pre + '[]'] : [];
    // collapse: element shape from the first element only
    const first = obj[0];
    if (first !== null && typeof first === 'object') return leafPaths(first, pre + '[]');
    return [pre + '[]'];
  }
  if (obj !== null && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) out.push(...leafPaths(v, pre ? `${pre}.${k}` : k));
    return out;
  }
  return pre ? [pre] : [];
}

// Nested arrays (e.g. `windows[][]` = array-of-windows, each a cell array) collapse to one leaf name.
const leaf = (path) => path.replace(/(\[\])+$/, '').split('.').pop();

// A. statically excluded (spec §6 C1); the score/samples family is already gone upstream.
const EXCLUDE_LEAVES = new Set(['notABlunder', 'discs', 'exhaustive', 'tacticFromDiff', 'nameable', 'parityNamingDeferred']);
const EXCLUDE_PATHS = new Set([
  'gate.ran', 'gate.nodesVisited', 'gate.witness.node', 'gate.witness.devVal',
  // opaque solver-PV node id, same diagnostic role as gate.witness.node — not renderable.
  'lostResource.witness.node',
]);

// B. transformed → the rendered board / canonical Decision block carries the info (raw field withheld).
// bestCol/playedCol are 0-indexed internally; the top-of-prompt Decision block renders them as
// 1-indexed display columns + landing cells, so the raw 0-indexed leaf must NOT leak into the JSON
// residue (the Fix-A coordinate-leak fix). They count as SHOWN (via the Decision block), like movestring.
const TRANSFORMED_LEAVES = new Set(['movestring', 'finalMovestring', 'bestCol', 'playedCol']);
const isTransformed = (p) => TRANSFORMED_LEAVES.has(leaf(p)) || /(^|\.)line(\[\]|\.|$)/.test(p);

// C. causal-code → conditionally hidden by a live frame's covers; otherwise renders.
// devCol/devCols/oppPlies: solver-PV bookkeeping used to support a causal-link's branch-invariance
// reasoning (e.g. L3's branchInvariant), not literal board cells — same disposition wherever nested
// under a `witness` (gate.witness.* or lostResource.witness.*).
const CODE_LEAVES = new Set(['route', 'tag', 'direction', 'kind', 'verdict', 'register', 'terminal', 'forkCase', 'devCol', 'devCols', 'oppPlies']);
const CODE_PATHS = new Set([
  'opponentPunishment.tie.kind', 'opponentPunishment.tie.tied',
]);
const isCode = (p) => CODE_LEAVES.has(leaf(p)) || CODE_PATHS.has(p);

// D. render (literal or grounded-cell). Closed allowlist of known leaves + a few full paths.
const RENDER_LEAVES = new Set([
  'case', 'player', 'opponent', 'boardState', 'owner',   // bestCol/playedCol → transformed (Decision block)
  'completingCell', 'window', 'windows', 'cell', 'cells', 'entryCell', 'anchorCells',
  'forkCells', 'forkWindows', 'tacticCells', 'tacticTag', 'supportingDiscs',
  'pliesToEnd', 'controllingGroup', 'ownDiscs', 'zcount', 'parity', 'basis', 'lockInPly', 'rule',
  'afterBest', 'afterPlayed', 'sharedCells', 'playedPlies', 'swindlePlies', 'status',
]);
const RENDER_PATHS = new Set(['gate.verdict']);
const isRender = (p) => RENDER_LEAVES.has(leaf(p)) || RENDER_PATHS.has(p);

export function dispositionOf(path) {
  if (isTransformed(path)) return 'transformed';
  if (EXCLUDE_PATHS.has(path)) return 'exclude';
  if (RENDER_PATHS.has(path)) return 'render';
  if (EXCLUDE_LEAVES.has(leaf(path))) return 'exclude';
  if (isCode(path)) return 'causal-code';
  if (isRender(path)) return 'render';
  return null; // unknown → tripwire
}

export function assertCoverage(prunedFv, firedCovers = []) {
  for (const path of leafPaths(prunedFv)) {
    if (dispositionOf(path) === null) throw new UncoveredVectorFieldError(path);
  }
  // A frame may only cover semantic CODES (never cells/counts/plumbing). A non-code covers entry
  // is a catalog bug — throw loudly. (Absent codes are allowed: covers lists are family supersets.)
  for (const c of firedCovers) {
    if (dispositionOf(c) !== 'causal-code') {
      throw new Error(`covers entry "${c}" is not a causal-code field (disposition=${dispositionOf(c)}); frames may only cover semantic codes`);
    }
  }
}
