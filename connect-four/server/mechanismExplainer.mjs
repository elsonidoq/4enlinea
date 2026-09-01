// mechanismExplainer.mjs — production wrapper around the reason-engine mechanism pipeline.
//
// Single source of truth for computing ONE board's coach explanation (`mechanism`) via the
// condition-D grounded-render path that the eval script (scripts/compute.mjs) validated:
//   computeReason → toNarratorVector → grounded prompt → LLM → parseAnswer → postprocessAnswer.
//
// The returned `mechanism` string already carries inline [zone:…] tags, so it drops directly into
// the /api/explain-move-llm response as `explanation` and renders via <AnnotatedExplanation>.
//
// Retry: the LLM call is retried ONCE — a single budget shared by every trigger. It fires on an
// LLM-related error (a call failure or an unparseable response), OR, for an otherwise-successful
// attempt, on a content miss: a required square/line the answer failed to tag, and/or a failure to
// name the column the player should have played instead. The two content misses are computed
// together and folded into ONE amended prompt (never one retry each). Evidence + prompt are
// computed a single time and reused across the retry (the solver pass is the expensive part).
// `postprocessAnswer` already repairs zone tags silently, so there is no annotation-repair retry.
//
// Errors: LLM errors never throw — they surface in callError/parseError so the endpoint can log to
// deep_reveal_failures and return 500. A genuine terminal board (computeReason throwing) DOES
// propagate, matching the endpoint's existing outer try/catch → 500 behavior.

import { computeReason } from './scripts/reason_engine/reasonEngine.mjs';
import { toNarratorVector } from './scripts/reasonNarratorVector.mjs';
import {
  buildPromptForCondition,
  renderDecisionForCondition,
  postprocessAnswer,
} from './scripts/compute.mjs';
import { callOpenAIChat } from './llmChat.js';
import { decideRetry, mentionsBetterColumn } from './retryDecision.mjs';

// ── OpenAI call (thin wrapper around the unified, instrumented helper; spec 047 US5) ─────────
// Preserves the pre-existing bare-string-content contract for computeMechanism's callers.
export async function defaultCallLLM(prompt, { model, apiKey, endpoint, userId, purpose }) {
  const { content } = await callOpenAIChat(prompt, { model, apiKey, endpoint, userId, purpose });
  return content;
}

// ── Lenient JSON parse (handles fenced or prose-wrapped output; ported from compute.mjs) ─────
export function parseAnswer(raw) {
  try { return { answer: JSON.parse(raw), parse_error: null }; } catch { /* fall through to fenced/prose extraction below */ }
  const m = raw && raw.match(/\{[\s\S]*\}/);
  if (m) {
    try { return { answer: JSON.parse(m[0]), parse_error: null }; } catch (e) {
      return { answer: null, parse_error: e.message };
    }
  }
  return { answer: null, parse_error: 'no JSON object found in response' };
}

// ── One LLM attempt for a prebuilt prompt (no solver) ────────────────────────────────────────
// Returns { raw, answer, mechanism, parseError, callError, annotationRepairs, usedSpecs }. Pure
// w.r.t. the solver, so it is the unit the retry loop re-runs.
async function runLlmAttempt(prompt, renderDecision, call) {
  let raw = null, answer = null, parseError = null, callError = null;
  try {
    raw = await call(prompt);
    ({ answer, parse_error: parseError } = parseAnswer(raw));
  } catch (err) {
    callError = err.message;
  }
  const { answer: postAnswer, repairs: annotationRepairs, usedSpecs } = postprocessAnswer(answer, renderDecision);
  return {
    raw,
    answer: postAnswer,
    mechanism: postAnswer?.mechanism ?? null,
    parseError,
    callError,
    annotationRepairs,
    usedSpecs,
  };
}

// An LLM-related error (call failure or unparseable response) is the ONLY retry trigger for the
// pre-existing retry path (identical prompt resent).
const isLlmError = (r) => Boolean(r.callError || r.parseError);

// `missingRequiredGroups`, `mentionsBetterColumn` and `buildRetryPrompt` now live in
// `./retryDecision.mjs` (a leaf module both this file and `scripts/compute.mjs` can import without
// closing a cycle — see docs/architecture/reason-DECISIONS.md D51/task-1-brief.md). `decideRetry`
// there is the pure extraction of this module's content-trigger decision; `mentionsBetterColumn` is
// re-exported below unchanged so existing callers/tests importing it from this module keep working.
export { mentionsBetterColumn };

// ── Compute one board's mechanism ────────────────────────────────────────────────────────────
// A SINGLE retry, shared across every trigger: LLM error, required-square miss, and/or an
// unnamed better column. The two content misses are folded into one amended prompt.
// Returns a discriminated result:
//   { notABlunder: true, evidence }                       — played move is not a blunder
//   { notABlunder: false, evidence, nv, prompt, renderDecision,
//     raw, answer, mechanism, parseError, callError, annotationRepairs, usedSpecs,
//     attempt1, missingHandles }
// The top-level raw/answer/mechanism/... fields are always the LAST attempt made (attempt2 when a
// retry happened, attempt1 otherwise) — `attempt1` is additionally always present so the caller
// never silently loses the first attempt, and `missingHandles` is the (possibly empty) list of
// required-set groups attempt 1 omitted, when that is what triggered the retry (FR-009/FR-010: the
// second attempt is always served, deterministically, never re-evaluated for quality against the
// first — even if the second attempt itself still misses a required square).
// `callLLM` may be injected (tests); otherwise defaultCallLLM(model, OPENAI_API_KEY) is used.
export async function computeMechanism(movestring, col, { solver, model, callLLM, userId = null, locale = 'en' } = {}) {
  const evidence = await computeReason(movestring, col, { solver }); // terminal boards throw → propagate
  if (!evidence || evidence.notABlunder) return { notABlunder: true, evidence: evidence ?? null };

  const nv = toNarratorVector(evidence);
  const prompt = buildPromptForCondition(null, nv, 'D', locale); // condition D ignores the glossary arg
  const renderDecision = renderDecisionForCondition(nv, 'D');
  // userId is threaded to BOTH the default closure and an injected callLLM (as a second arg) so
  // that (a) production calls always carry the caller's userId and (b) tests can assert
  // propagation end-to-end without relying solely on the default (network) closure.
  const call = callLLM
    ? (p) => callLLM(p, { userId })
    : (p) => defaultCallLLM(p, {
      model,
      apiKey: process.env.OPENAI_API_KEY,
      endpoint: 'explain-move-llm',
      userId,
      purpose: 'deep-reveal',
    });

  const attempt1 = await runLlmAttempt(prompt, renderDecision, call);
  let finalAttempt = attempt1;
  let missingHandles = [];

  if (isLlmError(attempt1)) {
    // Pre-existing retry trigger: resend the identical prompt once (an LLM-level failure, not a
    // content problem the prompt can address).
    finalAttempt = await runLlmAttempt(prompt, renderDecision, call);
  } else {
    // Content triggers: attempt 1 succeeded as an LLM call but (a) omitted one or more required
    // squares/lines (spec 058, US2, FR-008) and/or (b) never named the column the player should
    // have played instead. An empty requiredSet (FR-006 abstain, ~13/29 of the measured corpus)
    // makes `missing` empty, and a compliant attempt makes the column check pass, so a fully
    // compliant answer is a clean no-op. `decideRetry` (retryDecision.mjs, D51 seam) computes BOTH
    // misses BEFORE the retry and folds them into ONE amended prompt — the budget is a single
    // retry, shared: spending it on the column and then having none left for a missing required
    // square (or vice versa) would just move the regression.
    // bestCol is 0-indexed on the narrator vector, exactly as on the evidence it came from.
    const { shouldRetry, missing, retryPrompt } = decideRetry({
      attempt1, renderDecision, prompt, movestring, bestCol: nv?.bestCol ?? null, locale,
    });
    if (shouldRetry) {
      missingHandles = missing;
      finalAttempt = await runLlmAttempt(retryPrompt, renderDecision, call);
    }
  }

  return { notABlunder: false, evidence, nv, prompt, renderDecision, ...finalAttempt, attempt1, missingHandles };
}
