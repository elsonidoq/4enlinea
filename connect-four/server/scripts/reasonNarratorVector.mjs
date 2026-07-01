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
// One thing is removed from the raw evidence:
//   1. HIDDEN_FIELDS — raw solver ground truth the narrator must not see (per-column `scores`).
//      The engineered halves (lostResource / opponentPunishment / case / bestScore / playedScore)
//      carry the reason; the raw all-column score array is oracle leakage (cf. the old experiment's
//      forbidden premove_scores). I1/I2: the vector is the artifact, not a solver dump.
//   Research labels (expectedCase / expectedGate / expectedExhaustive / bucket / caseMatches) now
//   live in the sibling `groundTruth` field of the evidence row (never inside `evidence`), so they
//   are never present in the object passed to toNarratorVector.

// Raw solver oracle — present on computeReason output, hidden from the narrator.
export const HIDDEN_FIELDS = ['scores'];

// Fields hidden from the narrator that live INSIDE an engineered half (lostResource /
// opponentPunishment), not at the top level. `optimalWinSamples` is an evidence-only diagnostic
// (the distribution of optimal winning realizations, for /admin/fv-suff inspection) — it must
// never enter the LLM-facing vector. It stays on the raw evidence object; only this projection
// drops it.
const HIDDEN_HALF_FIELDS = ['optimalWinSamples'];

function stripHalf(half) {
  if (!half || typeof half !== 'object') return half;
  if (!HIDDEN_HALF_FIELDS.some((f) => f in half)) return half;
  const out = {};
  for (const [k, v] of Object.entries(half)) if (!HIDDEN_HALF_FIELDS.includes(k)) out[k] = v;
  return out;
}

/**
 * Project a raw reason-engine evidence object to the narrator-facing feature vector.
 * @param {object} reason  computeReason output (pure evidence, no research labels).
 * @returns {object} a shallow copy with HIDDEN_FIELDS removed at top level and HIDDEN_HALF_FIELDS
 *   removed from the lostResource / opponentPunishment halves.
 */
export function toNarratorVector(reason) {
  const omit = new Set(HIDDEN_FIELDS);
  const out = {};
  for (const [k, v] of Object.entries(reason)) if (!omit.has(k)) out[k] = v;
  if (out.lostResource) out.lostResource = stripHalf(out.lostResource);
  if (out.opponentPunishment) out.opponentPunishment = stripHalf(out.opponentPunishment);
  return out;
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
