#!/usr/bin/env node
// reasonNarratorVector.mjs — the LLM-facing projection of a reason-engine evidence vector.
//
// THE CONTRACT, shared by every consumer of the blunder-reason vector:
//   computeReason(movestring, playedCol, {solver})  ->  raw evidence object
//   toNarratorVector(raw)                            ->  what a NARRATOR LLM is allowed to see
//
// This is a PURE transform with no solver / no I/O, so it is importable by:
//   - the from-vector eval answerer (server/scripts/explain_from_vector.mjs),
//   - the eval-set freezer (server/scripts/build_fv_eval_set.mjs),
//   - (future) the production coach, which will call computeReason LIVE on the request and then
//     this same projection — the eval and production share ONE definition of "what the LLM sees".
//
// Removed from the raw evidence at EVERY depth (see isNarratorHidden):
//   1. The solver-score family — `scores` (per-column oracle), `score` (per-move score inside a
//      shown `line`), and `bestScore` / `playedScore` (the `*Score` decision scores). These are raw
//      solver ground truth. The narrator must explain from the ENGINEERED structure — `case`, the
//      two halves, cells, registers — and NEVER by grounding on a numeric solver score. `case`
//      already carries the outcome sign-pair (win_to_draw = (+,0), win_to_lose = (+,-),
//      draw_to_lose = (0,-), lose_to_faster_lose = (-,-)); the prompt's win/draw/loss outcomes
//      derive from `case`, not from a magnitude. Exposing `|score|` invites "you win in 7" grounding
//      — exactly the fabrication surface I1/I2 forbid.
//   2. `optimalWinSamples` and `winSamples` — evidence-only diagnostics (glossary §7), kept on the
//      raw evidence for /admin/fv-suff (the win-line distribution overlays), never shown to the
//      narrator.
//   Research labels (expectedCase / expectedGate / expectedExhaustive / bucket / caseMatches) now
//   live in the sibling `groundTruth` field of the evidence row (never inside `evidence`), so they
//   are never present in the object passed to toNarratorVector.

// A key is hidden from the narrator if it is in the solver-score family or is an evidence-only
// samples diagnostic. `pliesToEnd` (a counted ply distance, not a score) does NOT match and is kept.
const SCORE_KEY = /^scores?$|Score$/;
export function isNarratorHidden(key) {
  return SCORE_KEY.test(key) || key === 'optimalWinSamples' || key === 'winSamples';
}

/**
 * Project a raw reason-engine evidence object to the narrator-facing feature vector: a DEEP copy
 * with every isNarratorHidden key removed at every depth. PURE — never mutates the input, so the raw
 * evidence object retains all fields (the /admin/fv-suff evidence view and the frozen eval fixtures
 * still carry scores / bestScore / playedScore / line[].score / optimalWinSamples).
 * @param {object} reason  computeReason output (pure evidence, no research labels).
 */
export function toNarratorVector(reason) {
  if (Array.isArray(reason)) return reason.map(toNarratorVector);
  if (reason && typeof reason === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(reason)) if (!isNarratorHidden(k)) out[k] = toNarratorVector(v);
    return out;
  }
  return reason;
}

// ── Pruning: absence = "signal not present" (glossary §pruning). ──
// Drop ONLY empty containers and null/undefined: null, undefined, [], {}. KEEP every meaningful
// scalar — numeric 0 (playedCol 0 = column 1; playedScore 0 = draw; pliesToEnd 0), boolean false
// (tie.tied:false on a temporal non-faster loss), and strings. This is the key difference from the
// OLD feature vector's pruner, which dropped 0/false/'' to collapse all-zero {count,cells} buckets —
// in the reason vector those scalars are load-bearing data, not emptiness.
export function pruneValue(v) {
  if (v === null || v === undefined) return undefined;
  if (Array.isArray(v)) {
    const arr = v.map(pruneValue).filter((x) => x !== undefined);
    return arr.length ? arr : undefined;
  }
  if (typeof v === 'object') {
    const out = {};
    for (const [k, val] of Object.entries(v)) {
      const pv = pruneValue(val);
      if (pv !== undefined) out[k] = pv;
    }
    return Object.keys(out).length ? out : undefined;
  }
  return v; // numbers (incl 0), booleans (incl false), strings (incl "")
}

/**
 * Prune empties from a narrator vector. `movestring` is preserved even when "" (empty board is a
 * meaningful position the model must still reason about).
 */
export function pruneVector(fv) {
  const out = {};
  for (const [k, val] of Object.entries(fv)) {
    if (k === 'movestring') { out.movestring = val ?? ''; continue; }
    const pv = pruneValue(val);
    if (pv !== undefined) out[k] = pv;
  }
  return out;
}
