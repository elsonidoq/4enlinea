// Staged render object between the narrator vector and the prompt text (spec §3c).
// Phase 1: faithful passthrough — classify link, assert completeness, draw an untagged board.
// P2 adds tags/grounding; P3 adds rich causal-frame text.

import { pruneVector } from './reasonNarratorVector.mjs';
import { classifyCausalLink } from './reason_engine/causalLinks.mjs';
import { leafPaths, dispositionOf, assertCoverage } from './fieldDisposition.mjs';

// Rebuild a 6x7 board (row 0 bottom) from a 0-indexed movestring; render as ASCII.
function boardFromMovestring(ms) {
  const cols = 7, rows = 6;
  const heights = Array(cols).fill(0);
  const grid = Array.from({ length: rows }, () => Array(cols).fill('.'));
  [...(ms || '')].forEach((ch, i) => {
    const c = Number(ch);
    if (Number.isNaN(c) || c < 0 || c >= cols || heights[c] >= rows) return;
    grid[heights[c]][c] = (i % 2 === 0) ? 'A' : 'B'; // A = player 1 move, B = player 2 move
    heights[c] += 1;
  });
  return grid;
}
function asciiBoard(ms) {
  const grid = boardFromMovestring(ms);
  const header = '     ' + Array.from({ length: 7 }, (_, c) => `c${c + 1}`).join(' ');
  const body = [];
  for (let r = 5; r >= 0; r--) body.push(` r${r + 1} | ` + grid[r].join('  '));
  return [header, ...body].join('\n');
}

// The pruned vector minus fields the board carries (transformed) or statically excluded.
// Path-precise: recurse into plain-object containers; classify arrays/primitives by their own path;
// drop 'transformed'/'exclude', keep 'render' and (in P1, unapplied) 'causal-code'. Prune empties.
function renderedFields(prunedFv) {
  function prune(node, prefix) {
    if (node === null || typeof node !== 'object' || Array.isArray(node)) return node;
    const copy = {};
    for (const [key, val] of Object.entries(node)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
        const child = prune(val, path);            // container: recurse, keep if non-empty
        if (Object.keys(child).length) copy[key] = child;
      } else {
        const d = dispositionOf(path);             // array or primitive: classify by path
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
  assertCoverage(pruned, link.covers);
  return {
    perspective: { you: pruned.player, opponent: pruned.opponent },
    link,
    boards: { decision: { ascii: asciiBoard(pruned.movestring), tags: [] } },
    rendered: renderedFields(pruned),
    coverage: { ok: true, unowned: [] },
  };
}

export function assembleGroundedPrompt(model) {
  return [
    '# Board (you = player ' + model.perspective.you + ')',
    '',
    model.boards.decision.ascii,
    '',
    '# Reason (causal link ' + model.link.id + ', confidence ' + model.link.confidence + ')',
    model.link.guardrail,
    '',
    '# Vector facts',
    '```json',
    JSON.stringify(model.rendered, null, 2),
    '```',
  ].join('\n');
}
