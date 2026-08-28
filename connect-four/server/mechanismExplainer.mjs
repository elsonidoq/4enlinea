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
import { stripInternalTokens, guardExplainMoveLlmPayload, toAllowedSet } from './reasonRenderGuard.mjs';
import { serverT } from './locale.mjs';
import { Board } from './classifier.js';

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

// ── Better-column compliance (the "what should I have played instead?" floor) ────────────────
// A deep reveal that never names the column the player should have played instead is not an
// explanation the player can act on. The information is already in the prompt verbatim
// (renderReasonModel.mjs's `renderDecision`: "- Better move: column N (lands at cNrM)"), so this
// is an enforcement gap, not a context gap — and prompt wording alone was measured INERT for this
// class of instruction (0/12 runs), while the required-set retry moved it (12/12). Hence a
// post-check on the same single retry, not more prompt text.
//
// WHICH STRING IS TESTED, and why: the attempt's POST-`processAnnotations` `mechanism`
// (`attempt.mechanism`), run through the guard's own `stripInternalTokens` — i.e. our closest
// available prediction of the text the player is actually served.
//   - Not the RAW LLM string: `postprocessAnswer` has already rewritten every offered
//     `[zone:{handle}]` to its expanded `cNrM`/`windows:` spec by the time we see the attempt, so
//     the raw string is not what ships and is not what the rest of this module reasons about.
//   - Not a bare `/column N/` search on `mechanism`: `guardExplainMoveLlmPayload` rewrites raw
//     `cN` / `cNrM` / `colN` prose tokens into "column N" (locale-aware) before serving, so a
//     mechanism reading "you should have played c2r1" DOES reach the player as "column 2". A naive
//     literal search would call that a miss and burn the single shared retry on nothing.
//   - `stripInternalTokens` is the right predictor because it is the guard's FINAL pass over every
//     served explanation, and it skips `[zone:…]` DELIMITERS byte-for-byte — so a bare
//     `[zone:c2r1]` tag with no prose naming the column correctly does NOT satisfy this check
//     (that square's coverage is the required-set check's job, not this one's).
// Residual, accepted imprecision: the endpoint's earlier `stripFailingZoneSpans` can delete a span
// whose text carried the column word, so a satisfied check can still, rarely, be served without it.
// Erring that way is deliberate — it costs a missing mention, never a wasted retry.
export function mentionsBetterColumn(attempt, bestCol, locale = 'en') {
  if (bestCol == null) return true;              // nothing to require — abstain, do not invent
  const mechanism = attempt?.mechanism;
  if (!mechanism) return true;                   // no text at all is an LLM-error case; that retry trigger owns it
  // bestCol is 0-indexed like every other coordinate in server code; the +1 here is the display
  // conversion, matching renderDecision()'s own `column ${col + 1}`.
  const columnWord = serverT(locale, 'column')(bestCol + 1); // "column 2" | "columna 2"
  const served = stripInternalTokens(mechanism, locale);
  return new RegExp(`\\b${columnWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(served);
}

// Builds the retry prompt for a required-set miss (FR-008: explicitly name the missing
// square(s)/line(s) to the coach) and/or a missing better-column mention. This is a genuinely
// amended prompt, not a resend of the original — each block below is new text appended to the same
// evidence/instructions.
//
// The two misses are folded into ONE prompt on purpose: the retry budget is exactly one and it is
// shared (see computeMechanism below). Spending it on the column and leaving a required square
// unenforced (or vice versa) would trade one regression for another.
// `missingBetterColPhrase` is the LOCALIZED "column N" / "columna N" wording the retry must produce
// (null when the column was already named): the surrounding prompt is English, but under locale
// 'es' the model writes Spanish prose, so the phrase we demand has to be the Spanish one — it is
// what `mentionsBetterColumn` looks for and what the player reads.
function buildRetryPrompt(prompt, missing, missingBetterColPhrase) {
  const blocks = [];
  if (missing.length > 0) {
    const missingLines = missing.map((g) => `- [zone:${g.handle}] = ${g.role}`).join('\n');
    blocks.push(`# Retry: required squares were missing
Your previous answer did not wrap the following required square(s)/line(s) in a
[zone:<handle>]...[/zone:<handle>] tag using the exact handle listed below. Write the explanation
again, following every instruction above, and this time make sure each one of these appears as a
zone tag in your \`mechanism\`:
${missingLines}`);
  }
  if (missingBetterColPhrase) {
    blocks.push(`# Retry: the better move's column was never named
Your previous answer never told the player which column they should have played instead. The
Decision block above is canonical: the better move is **${missingBetterColPhrase}**. Write the
explanation again, following every instruction above, and this time say that column explicitly in
the prose of your \`mechanism\`, spelled out as "${missingBetterColPhrase}" — not only as a
[zone:…] tag, and never as a raw cNrM/cN token.`);
  }
  return `${prompt}

---

${blocks.join('\n\n')}

Return the full JSON object again (all fields), not just the changed part.`;
}

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
    // compliant answer is a clean no-op.
    //
    // BOTH misses are computed BEFORE the retry and folded into ONE amended prompt: the budget is a
    // single retry, and it is shared. There is deliberately no second pass — spending the retry on
    // the column and then having none left for a missing required square (or vice versa) would just
    // move the regression.
    const requiredSet = renderDecision?.requiredSet ?? [];
    // FR-013 / OI-177 / Design Decision 1 (plan.md): `attempt1.usedSpecs` is derived by
    // `processAnnotations` from the model's `[zone:…]` tags BEFORE the guard runs — a spec can be
    // "successfully offered-and-resolved" there and still have its span stripped later by
    // `guardExplainMoveLlmPayload` (served text, index.js) for an unrelated reason (e.g. a raw
    // coordinate the guard's P6 check rejects). Re-run the guard here, guard-aware, on `attempt1`
    // BEFORE the existing retry check — this is a NEW, first invocation used only to decide the
    // retry; the endpoint's own guard call on `finalAttempt.mechanism` (index.js) is unaffected.
    const board = new Board(movestring);
    const allowedSet = toAllowedSet(renderDecision?.zones?.aliases ?? []);
    const { diagnostics } = guardExplainMoveLlmPayload({
      explanation: attempt1.mechanism, board, allowedSet, diagnostics: true,
    });
    const survivedSpecs = (attempt1.usedSpecs ?? []).filter((s) => !diagnostics.strippedSpecs.includes(s));
    const missing = missingRequiredGroups(requiredSet, { usedSpecs: survivedSpecs });
    // bestCol is 0-indexed on the narrator vector, exactly as on the evidence it came from.
    const bestCol = nv?.bestCol ?? null;
    const missingBetterColPhrase = mentionsBetterColumn(attempt1, bestCol, locale)
      ? null
      : serverT(locale, 'column')(bestCol + 1);
    if (missing.length > 0 || missingBetterColPhrase) {
      missingHandles = missing;
      const retryPrompt = buildRetryPrompt(prompt, missing, missingBetterColPhrase);
      finalAttempt = await runLlmAttempt(retryPrompt, renderDecision, call);
    }
  }

  return { notABlunder: false, evidence, nv, prompt, renderDecision, ...finalAttempt, attempt1, missingHandles };
}
