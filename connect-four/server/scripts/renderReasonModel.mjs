// Staged render object between the narrator vector and the prompt text (spec §3c).
// Phase 1: faithful passthrough — classify link, assert completeness, draw an untagged board.
// P2 adds tags/grounding; P3 adds rich causal-frame text.

import { pruneVector } from './reasonNarratorVector.mjs';
import { classifyCausalLink } from './reason_engine/causalLinks.mjs';
import { dispositionOf, assertCoverage } from './fieldDisposition.mjs';
import { selectBoards, renderThreatList, patternOnAfterBestBoard } from './reasonBoardSelect.mjs';

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

export function buildReasonRenderModel(nv) {
  const pruned = pruneVector(nv);
  const ctx = pruned.direction === 'enabled_opponent'
    ? { patternOnAfterBestBoard: patternOnAfterBestBoard(pruned) } : {};
  const link = classifyCausalLink(pruned, ctx);
  assertCoverage(pruned, link.covers);
  return {
    perspective: { you: pruned.player, opponent: pruned.opponent },
    link,
    frames: [{ id: link.id, confidence: link.confidence, text: link.text, covers: link.covers, guardrail: link.guardrail }],
    boards: selectBoards(pruned),
    rendered: renderedFields(pruned, link.covers),
    coverage: { ok: true, unowned: [] },
  };
}

const READING_KEY = `# Reading key (the few coded fields shown below)
- register: how far off the result is — "immediate" (now), "forced_sequence" (a deep forced line), "parity" (a deep zugzwang/parity battle).
- pliesToEnd: plies until the line finishes, when known.
- controllingGroup / parityAttribution: the group of four squares whose parity decides a deep win.
- ownDiscs: how many of your discs already sit on the winning group.
- replyHistogram.afterBest / afterPlayed: how many opponent replies still lose after each move.
- "deep on a forced line" / "deep, via a parity battle": the completing square is many plies away and EMPTY now — not a current threat.
- Cells are cNrM: column then row, 1-indexed (c1r1 = bottom-left).`;

export function assembleGroundedPrompt(model) {
  const boards = model.boards.map((b) =>
    `## Board: ${b.id} (${b.reason})\n${b.ascii}\nTactics:\n${renderThreatList(b.tags)}`).join('\n\n');
  const frames = model.frames.map((f) => f.text).filter(Boolean).join('\n\n');
  return [
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
    '',
    '# Vector facts',
    '```json',
    JSON.stringify(model.rendered, null, 2),
    '```',
  ].join('\n');
}
