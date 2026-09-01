// retryDecision.mjs — the CONTENT-trigger half of production's retry decision (D51 seam), extracted
// as a leaf module so both `mechanismExplainer.mjs` and `scripts/compute.mjs` can import it without
// closing a cycle (mechanismExplainer.mjs already imports compute.mjs). This module imports neither.
//
// This is a PURE extraction of the body of `computeMechanism`'s `else` branch (task-1-brief.md,
// docs/architecture/reason-DECISIONS.md D51): same guard invocation, same `survivedSpecs` filter,
// same `missingRequiredGroups`/`mentionsBetterColumn`/`buildRetryPrompt` calls, same
// `missing.length > 0 || missingBetterColPhrase` trigger condition. `isLlmError`'s branch is NOT
// here — it stays in `computeMechanism`, untouched; this module handles the two CONTENT triggers
// only (a required-square/line miss and/or an unnamed better column).
//
// No LLM call, no solver, no network. May log: `guardExplainMoveLlmPayload` (via the annotation
// gate) can console.warn as part of its diagnostics.

import { guardExplainMoveLlmPayload, toAllowedSet, stripInternalTokens } from './reasonRenderGuard.mjs';
import { serverT } from './locale.mjs';
import { Board } from './classifier.js';

// ── Required-set compliance (spec 058, US2, FR-007/FR-008) ───────────────────────────────────
// requiredSet entries (renderReasonModel.mjs's deriveRequiredSet, threaded onto renderDecision by
// buildRenderDecision) are matched by their expanded `spec` against the attempt's `usedSpecs` —
// the post-processAnnotations set of specs the LLM's [zone:{handle}] tags actually resolved to
// (data-model.md §2 Consumer 2). A raw `[zone:{handle}]` string search is wrong: processAnnotations
// has already rewritten every offered handle to its expanded spec by the time this runs.
export function missingRequiredGroups(requiredSet, attempt) {
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
// shared (see decideRetry below). Spending it on the column and leaving a required square
// unenforced (or vice versa) would trade one regression for another.
// `missingBetterColPhrase` is the LOCALIZED "column N" / "columna N" wording the retry must produce
// (null when the column was already named): the surrounding prompt is English, but under locale
// 'es' the model writes Spanish prose, so the phrase we demand has to be the Spanish one — it is
// what `mentionsBetterColumn` looks for and what the player reads.
export function buildRetryPrompt(prompt, missing, missingBetterColPhrase) {
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

// ── Decide whether production would retry `attempt1`, and with what prompt ───────────────────
// Pure extraction of computeMechanism's `else` branch (D51's guard-aware required-set check, run
// BEFORE the retry decision, on attempt1). No LLM call, no solver, no network; may log
// (guardExplainMoveLlmPayload can console.warn via the annotation gate).
export function decideRetry({ attempt1, renderDecision, prompt, movestring, bestCol, locale = 'en' }) {
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
  const missingBetterColPhrase = mentionsBetterColumn(attempt1, bestCol, locale)
    ? null
    : serverT(locale, 'column')(bestCol + 1);
  const shouldRetry = missing.length > 0 || Boolean(missingBetterColPhrase);
  const retryPrompt = shouldRetry ? buildRetryPrompt(prompt, missing, missingBetterColPhrase) : null;
  return { shouldRetry, missing, missingBetterColPhrase, retryPrompt };
}
