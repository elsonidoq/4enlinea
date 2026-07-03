// Staged render object between the narrator vector and the prompt text (spec §3c).
// Phase 1: faithful passthrough — classify link, assert completeness, draw an untagged board.
// P2 adds tags/grounding; P3 adds rich causal-frame text.

import { pruneVector } from './reasonNarratorVector.mjs';
import { classifyCausalLink } from './reason_engine/causalLinks.mjs';
import { dispositionOf, assertCoverage } from './fieldDisposition.mjs';
import { selectBoards, renderThreatList } from './reasonBoardSelect.mjs';

// The pruned vector minus fields the board carries (transformed) or statically excluded.
// Path-precise: recurse into plain-object containers; classify arrays/primitives by their own path;
// drop 'transformed'/'exclude', keep 'render' and (in P1, unapplied) 'causal-code'. Prune empties.
// For object arrays (e.g., window = [{cell, status, ...}]), recurse into each element and prune
// transformed/excluded subfields element-wise, mirroring leafPaths' element-leaf enumeration.
function renderedFields(prunedFv) {
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
          copy[key] = pruneArray(val, path);           // object array: prune each element
        } else {
          const d = dispositionOf(path);               // scalar/empty array: classify by path
          if (d !== 'transformed' && d !== 'exclude') copy[key] = val;
        }
      } else if (val !== null && typeof val === 'object') {
        const child = prune(val, path);                 // object container: recurse, keep if non-empty
        if (Object.keys(child).length) copy[key] = child;
      } else {
        const d = dispositionOf(path);
        if (d !== 'transformed' && d !== 'exclude') copy[key] = val;
      }
    }
    return copy;
  }
  return prune(prunedFv, '');
}

export function buildReasonRenderModel(nv) {
  const pruned = pruneVector(nv);
  const link = classifyCausalLink(pruned, {});
  // NOTE (P3): P1 registers all causal-code fields unconditionally (2nd arg unused); P3 must wire
  // real covers-gating from the fired link or drop the param.
  assertCoverage(pruned, link.covers);
  return {
    perspective: { you: pruned.player, opponent: pruned.opponent },
    link,
    boards: selectBoards(pruned),
    rendered: renderedFields(pruned),
    coverage: { ok: true, unowned: [] },
  };
}

export function assembleGroundedPrompt(model) {
  const boards = model.boards.map((b) =>
    `## Board: ${b.id} (${b.reason})\n${b.ascii}\nTactics:\n${renderThreatList(b.tags)}`).join('\n\n');
  return [
    `# Boards (you = player ${model.perspective.you})`,
    '',
    boards,
    '',
    `# Reason (causal link ${model.link.id}, confidence ${model.link.confidence})`,
    model.link.guardrail,
    '',
    '# Vector facts',
    '```json',
    JSON.stringify(model.rendered, null, 2),
    '```',
  ].join('\n');
}
