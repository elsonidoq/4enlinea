// mechanismExplainer.mjs — production wrapper around the reason-engine mechanism pipeline.
//
// Single source of truth for computing ONE board's coach explanation (`mechanism`) via the
// condition-D grounded-render path that the eval script (scripts/compute.mjs) validated:
//   computeReason → toNarratorVector → grounded prompt → LLM → parseAnswer → postprocessAnswer.
//
// The returned `mechanism` string already carries inline [zone:…] tags, so it drops directly into
// the /api/explain-move-llm response as `explanation` and renders via <AnnotatedExplanation>.
//
// Retry: the LLM call is retried ONCE, and only on an LLM-related error (a call failure or an
// unparseable response). Evidence + prompt are computed a single time and reused across the retry
// (the solver pass is the expensive part). `postprocessAnswer` already repairs zone tags silently,
// so there is no annotation-based retry.
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
// Returns { raw, answer, mechanism, parseError, callError, annotationRepairs }. Pure w.r.t. the
// solver, so it is the unit the retry loop re-runs.
async function runLlmAttempt(prompt, renderDecision, call) {
  let raw = null, answer = null, parseError = null, callError = null;
  try {
    raw = await call(prompt);
    ({ answer, parse_error: parseError } = parseAnswer(raw));
  } catch (err) {
    callError = err.message;
  }
  const { answer: postAnswer, repairs: annotationRepairs } = postprocessAnswer(answer, renderDecision);
  return {
    raw,
    answer: postAnswer,
    mechanism: postAnswer?.mechanism ?? null,
    parseError,
    callError,
    annotationRepairs,
  };
}

// An LLM-related error (call failure or unparseable response) is the ONLY retry trigger.
const isLlmError = (r) => Boolean(r.callError || r.parseError);

// ── Compute one board's mechanism (with a single LLM retry) ──────────────────────────────────
// Returns a discriminated result:
//   { notABlunder: true, evidence }                       — played move is not a blunder
//   { notABlunder: false, evidence, nv, prompt, renderDecision,
//     raw, answer, mechanism, parseError, callError, annotationRepairs }
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

  let attempt = await runLlmAttempt(prompt, renderDecision, call);
  if (isLlmError(attempt)) attempt = await runLlmAttempt(prompt, renderDecision, call); // retry once

  return { notABlunder: false, evidence, nv, prompt, renderDecision, ...attempt };
}
