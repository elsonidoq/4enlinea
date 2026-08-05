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

// ── Required-set compliance (spec 058, US2, FR-007/FR-008) ───────────────────────────────────
// requiredSet entries (renderReasonModel.mjs's deriveRequiredSet, threaded onto renderDecision by
// buildRenderDecision) are matched by their expanded `spec` against the attempt's `usedSpecs` —
// the post-processAnnotations set of specs the LLM's [zone:{handle}] tags actually resolved to
// (data-model.md §2 Consumer 2). A raw `[zone:{handle}]` string search is wrong: processAnnotations
// has already rewritten every offered handle to its expanded spec by the time this runs.
function missingRequiredGroups(requiredSet, attempt) {
  const usedSpecs = attempt.usedSpecs ?? [];
  return (requiredSet ?? []).filter((g) => !usedSpecs.includes(g.spec));
}

// Builds the retry prompt for a required-set miss (FR-008: explicitly name the missing
// square(s)/line(s) to the coach). This is a genuinely amended prompt, not a resend of the
// original — the missing-handle block below is new text appended to the same evidence/instructions.
function buildMissingSquaresRetryPrompt(prompt, missing) {
  const missingLines = missing.map((g) => `- [zone:${g.handle}] = ${g.role}`).join('\n');
  return `${prompt}

---

# Retry: required squares were missing
Your previous answer did not wrap the following required square(s)/line(s) in a
[zone:<handle>]...[/zone:<handle>] tag using the exact handle listed below. Write the explanation
again, following every instruction above, and this time make sure each one of these appears as a
zone tag in your \`mechanism\`:
${missingLines}

Return the full JSON object again (all fields), not just the changed part.`;
}

// ── Compute one board's mechanism (with a single retry — LLM error OR required-square miss) ──
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
    // New trigger (spec 058, US2, FR-008): attempt 1 succeeded as an LLM call but omitted one or
    // more required squares/lines. Retry exactly once, with an amended prompt naming exactly what
    // was missing. An empty requiredSet (FR-006 abstain, ~13/29 of the measured corpus) makes
    // `missing` empty and this is a clean no-op.
    const requiredSet = renderDecision?.requiredSet ?? [];
    const missing = missingRequiredGroups(requiredSet, attempt1);
    if (missing.length > 0) {
      missingHandles = missing;
      const retryPrompt = buildMissingSquaresRetryPrompt(prompt, missing);
      finalAttempt = await runLlmAttempt(retryPrompt, renderDecision, call);
    }
  }

  return { notABlunder: false, evidence, nv, prompt, renderDecision, ...finalAttempt, attempt1, missingHandles };
}
