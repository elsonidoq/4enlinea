// Staged render object between the narrator vector and the prompt text (spec §3c).
// Phase 1: faithful passthrough — classify link, assert completeness, draw an untagged board.
// P2 adds tags/grounding; P3 adds rich causal-frame text.

import { pruneVector } from './reasonNarratorVector.mjs';
import { classifyCausalLink } from './reason_engine/causalLinks.mjs';
import { dispositionOf, assertCoverage, leafPaths } from './fieldDisposition.mjs';
import { selectBoards, renderThreatList, patternOnAfterBestBoard, boardSelectionDecisions } from './reasonBoardSelect.mjs';
import { groundCell, horizonForRegister } from './reasonCellGrounding.mjs';
import { parseBoardState } from '../classifier.js';
import { composeOpeningFrame, centralityQualitative } from './reason_engine/openingFrame.mjs';

// The pruned vector minus fields the board carries (transformed) or statically excluded.
// Path-precise: recurse into plain-object containers; classify arrays/primitives by their own path;
// drop 'transformed'/'exclude', keep 'render' and (in P1, unapplied) 'causal-code'. Prune empties.
// For object arrays (e.g., window = [{cell, status, ...}]), recurse into each element and prune
// transformed/excluded subfields element-wise, mirroring leafPaths' element-leaf enumeration.
function renderedFields(prunedFv, firedCovers = []) {
  const covered = new Set(firedCovers);
  const keep = (path) => {
    const d = dispositionOf(path);
    if (d === 'transformed' || d === 'exclude') return false;
    if (d === 'causal-code' && covered.has(path)) return false;   // hidden — the frame restates it
    return true;                                                   // render + uncovered causal-code
  };
  function pruneArray(arr, prefix) {
    return arr.map((el) => (el !== null && typeof el === 'object' && !Array.isArray(el))
      ? prune(el, prefix + '[]')
      : el);
  }
  function prune(node, prefix) {
    if (node === null || typeof node !== 'object' || Array.isArray(node)) return node;
    const copy = {};
    for (const [key, val] of Object.entries(node)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (Array.isArray(val)) {
        if (val.length && val[0] !== null && typeof val[0] === 'object') {
          copy[key] = pruneArray(val, path);
        } else if (keep(path)) {
          copy[key] = val;
        }
      } else if (val !== null && typeof val === 'object') {
        const child = prune(val, path);
        if (Object.keys(child).length) copy[key] = child;
      } else if (keep(path)) {
        copy[key] = val;
      }
    }
    return copy;
  }
  return prune(prunedFv, '');
}

// Fix A: the canonical, board-anchored, schema-shaped Decision block that leads the grounded prompt.
// bestCol/playedCol are 0-indexed internally; here they become 1-indexed DISPLAY columns + landing
// cells (from movestring + col), and best/played outcomes come from `case` — never from a solver score
// (D21). This is the single authoritative statement of which move is best vs played and where each
// lands; the raw 0-indexed leaves are withheld from the JSON residue (fieldDisposition: transformed).
const CASE_OUTCOMES = {
  win_to_draw: ['win', 'draw'],
  win_to_lose: ['win', 'loss'],
  draw_to_lose: ['draw', 'loss'],
  lose_to_faster_lose: ['loss', 'loss'],   // both lose; played loses faster
};

// 1-indexed landing cell for dropping into `col` on `movestring`; null on a null/full column.
function landingCell(movestring, col) {
  if (col == null) return null;
  const { colHeights } = parseBoardState(movestring ?? '');
  const row = colHeights[col];
  if (row == null || row >= 6) return null;
  return `c${col + 1}r${row + 1}`;
}

function buildDecision(pruned) {
  const [bestOutcome, playedOutcome] = CASE_OUTCOMES[pruned.case] ?? [null, null];
  return {
    you: pruned.player,
    bestCol: pruned.bestCol, playedCol: pruned.playedCol,
    bestCell: landingCell(pruned.movestring, pruned.bestCol),
    playedCell: landingCell(pruned.movestring, pruned.playedCol),
    bestOutcome, playedOutcome,
  };
}

// Opening residue: the deep halves demote to a horizon; strip their cells so no deep cNrM leaks into the prompt.
function pruneOpeningResidue(rendered) {
  const horizonOnly = (h) => (h && typeof h === 'object')
    ? Object.fromEntries(['register', 'pliesToEnd'].filter((k) => k in h).map((k) => [k, h[k]]))
    : h;
  const out = { ...rendered };
  if (out.lostResource) out.lostResource = horizonOnly(out.lostResource);
  if (out.opponentPunishment) out.opponentPunishment = horizonOnly(out.opponentPunishment);
  return out;
}

export function buildReasonRenderModel(nv) {
  const pruned = pruneVector(nv);
  const ctx = pruned.direction === 'enabled_opponent'
    ? { patternOnAfterBestBoard: patternOnAfterBestBoard(pruned) } : {};
  const link = classifyCausalLink(pruned, ctx);
  assertCoverage(pruned, link.covers);

  const openingFrame = composeOpeningFrame(pruned);
  if (openingFrame) {
    const decisionBoard = boardSelectionDecisions(pruned).find((b) => b.id === 'decision');
    return {
      perspective: { you: pruned.player, opponent: pruned.opponent },
      decision: buildDecision(pruned),
      link,
      frames: [{ id: openingFrame.id, confidence: openingFrame.confidence, text: openingFrame.text,
                 covers: openingFrame.covers, guardrail: openingFrame.guardrail }],
      boards: [decisionBoard],
      rendered: pruneOpeningResidue(renderedFields(pruned, link.covers)),
      openingReadingKey: OPENING_READING_KEY,
      coverage: { ok: true, unowned: [] },
    };
  }

  return {
    perspective: { you: pruned.player, opponent: pruned.opponent },
    decision: buildDecision(pruned),
    link,
    frames: [{ id: link.id, confidence: link.confidence, text: link.text, covers: link.covers, guardrail: link.guardrail }],
    boards: selectBoards(pruned),
    rendered: renderedFields(pruned, link.covers),
    coverage: { ok: true, unowned: [] },
  };
}

// The engine's own decisive line for cell grounding (G4): the winning half's finalMovestring when
// the lostResource is a winning line; otherwise the opponent's realized line. Never an alternate PV.
function decisiveFinalMovestring(fv) {
  const lr = fv.lostResource, op = fv.opponentPunishment;
  if (lr?.kind === 'winning_line' && lr.finalMovestring) return lr.finalMovestring;
  if (op?.finalMovestring) return op.finalMovestring;
  return lr?.finalMovestring ?? null;
}

// Partition every PRESENT leaf path into rendered | covered | excluded (spec §3f), from the grader's
// "what did the model see" viewpoint: exclude → excluded; covered causal-code → covered; everything else
// → rendered. NOTE: unlike renderedFields' keep() (which DROPS `transformed` from the JSON residue),
// `transformed` fields are shown to the model via the board, so here they count as rendered (not excluded)
// — the distinction that matters for the G2 over-removal audit is shown-anywhere vs. hidden.
function fieldPartition(pruned, covers) {
  const covered = new Set(covers);
  const out = { rendered: [], covered: [], excluded: [] };
  for (const path of leafPaths(pruned)) {
    const d = dispositionOf(path);
    if (d === 'exclude') out.excluded.push(path);
    else if (d === 'causal-code' && covered.has(path)) out.covered.push(path);
    else out.rendered.push(path);
  }
  return out;
}

// Ground the load-bearing resource cell (status/horizon/reachableInPlies) against the decisive line.
function groundResource(pruned) {
  const half = pruned.lostResource?.kind === 'winning_line' ? pruned.lostResource
    : (pruned.opponentPunishment?.completingCell ? pruned.opponentPunishment : pruned.lostResource);
  const cell = half?.completingCell;
  if (!cell) return null;
  const { board, colHeights } = parseBoardState(pruned.movestring ?? '');
  const grounded = groundCell(cell, {
    board, colHeights, finalMovestring: decisiveFinalMovestring(pruned),
    register: half.register, role: 'where the load-bearing resource completes',
    perspectivePlayer: pruned.player,
  });
  return { completingCell: grounded,
           registerToHorizon: { register: half.register ?? null, horizon: horizonForRegister(half.register) } };
}

// The complete render-layer decision set the grader consumes as ground truth (spec §3f). Derived
// PURELY from the render helpers — no engine call. Reuses the same classify+assert path as
// buildReasonRenderModel so routing is identical.
export function buildRenderDecision(nv) {
  const pruned = pruneVector(nv);
  const ctx = pruned.direction === 'enabled_opponent'
    ? { patternOnAfterBestBoard: patternOnAfterBestBoard(pruned) } : {};
  const link = classifyCausalLink(pruned, ctx);
  assertCoverage(pruned, link.covers);

  const openingFrame = composeOpeningFrame(pruned);
  let openingContext = null;
  if (openingFrame) {
    const oc = pruned.openingContext;
    const variant = oc.namedOpening ?? oc.defense ?? oc.centrality;
    const bCell = landingCell(pruned.movestring, pruned.bestCol);
    const pCell = landingCell(pruned.movestring, pruned.playedCol);
    const bRow0 = bCell ? Number(bCell.match(/r(\d+)/)[1]) - 1 : null;
    const half = horizonHalf(pruned);
    openingContext = {
      kind: openingFrame.kind,
      frameId: openingFrame.id,
      lead: {
        id: variant.id ?? null,
        family: variant.family ?? null,
        matchedPrefixLen: variant.matchedPrefixLen ?? null,
        bookCol: oc.namedOpening ? oc.namedOpening.bookNextCol + 1 : null,
        holdCol: oc.defense ? oc.defense.bestDefenseCol + 1 : null,
      },
      centralityComparison: {
        player: pruned.player, betterCell: bCell, playedCell: pCell,
        qualitative: centralityQualitative(pruned),
      },
      parityFavor: bRow0 == null ? null : {
        betterCellRowParity: bRow0 % 2 === 0 ? 'odd' : 'even',   // display parity of the better cell's row
        favorsMover: pruned.player === 1 ? bRow0 % 2 === 0 : bRow0 % 2 === 1,
      },
      deepResourceGrounded: false,
      horizon: { register: half?.register ?? null, pliesToEnd: half?.pliesToEnd ?? null },
    };
  }

  return {
    case: pruned.case ?? null,
    route: pruned.route === 'realized_denied' ? 'realized_denied' : 'sign',
    direction: pruned.direction ?? null,
    patternOnAfterBestBoard: pruned.direction === 'enabled_opponent' ? ctx.patternOnAfterBestBoard : null,
    link: { id: link.id, confidence: link.confidence, covers: link.covers,
            guardrail: link.guardrail, text: link.text },
    boards: boardSelectionDecisions(pruned).map(({ id, shown, reason }) => ({ id, shown, reason })),
    resource: groundResource(pruned),
    fieldPartition: fieldPartition(pruned, link.covers),
    finalMovestring: decisiveFinalMovestring(pruned),
    openingContext,
  };
}

const READING_KEY = `# Reading key (the few coded fields shown below)
- register: how far off the result is — "immediate" (now), "forced_sequence" (a deep forced line), "parity" (a deep zugzwang/parity battle).
- pliesToEnd: plies until the line finishes, when known.
- controllingGroup / parityAttribution: the group of four squares whose parity decides a deep win.
- ownDiscs: how many of your discs already sit on the winning group.
- replyHistogram.afterBest / afterPlayed: how many ways your opponent still has to hold the result after each move — fewer means the tougher, more resilient defense.
- "deep on a forced line" / "deep, via a parity battle": the winning square is many plies away and EMPTY now — not a current threat.
- Cells are cNrM: column then row, 1-indexed (c1r1 = bottom-left).
- Every column number shown anywhere in this prompt is a 1-indexed display column (column 1 = leftmost). The move columns and their landing cells are given in the Decision block above — use them verbatim; do not re-derive move→cell→role.
- These coded names are for YOUR reading only. Never repeat a field name, "histogram", "window", "completing cell", "solver", or "score" in your answer's \`mechanism\` — say it in plain Connect Four instead (threat, fork, double threat, four-in-a-row line, block, central).`;

const OPENING_READING_KEY = `# Opening reading key
- family / id: the named opening line this position is on (id absent = shared prefix, family only).
- matchedPrefixLen: how many opening plies matched the book line.
- The blunder is explained through the opening (book line, centrality, parity), NOT a deep tactical cell.
- The winning resolution is deep (many plies away) and is stated only as a horizon — there is no near-term threat cell to read.`;

// The outcome-defining half for the horizon summary.
function horizonHalf(pruned) {
  return pruned.case && pruned.case.startsWith('win_') ? pruned.lostResource : pruned.opponentPunishment;
}

// The canonical Decision block (Fix A) — leads the prompt so the model never re-derives columns/roles.
function renderDecision(d) {
  const outcome = (o) => (o ? `. Outcome: ${o}` : '');
  const move = (label, col, cell, o) =>
    `- ${label} move: column ${col == null ? '?' : col + 1}${cell ? ` (lands at ${cell})` : ''}${outcome(o)}.`;
  return [
    '# Decision (canonical — use these columns/cells verbatim; do not re-derive)',
    `- you = player ${d.you}`,
    move('Better', d.bestCol, d.bestCell, d.bestOutcome),
    move('Played', d.playedCol, d.playedCell, d.playedOutcome),
  ].join('\n');
}

export function assembleGroundedPrompt(model) {
  const boards = model.boards.map((b) =>
    `## Board: ${b.id} (${b.reason})\n${b.ascii}\nTactics:\n${renderThreatList(b.tags)}`).join('\n\n');
  const frames = model.frames.map((f) => f.text).filter(Boolean).join('\n\n');
  return [
    renderDecision(model.decision),
    '',
    `# Boards (you = player ${model.perspective.you})`,
    '',
    boards,
    '',
    `# Why this move was a blunder (causal link ${model.link.id}, confidence ${model.link.confidence})`,
    frames,
    '',
    `Guardrail: ${model.link.guardrail}`,
    '',
    READING_KEY,
    ...(model.openingReadingKey ? ['', model.openingReadingKey] : []),
    '',
    '# Internal evidence fields (for your reading only — do NOT name these in `mechanism`; cite paths in `fields_relied_on`)',
    '```json',
    JSON.stringify(model.rendered, null, 2),
    '```',
  ].join('\n');
}
