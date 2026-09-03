// mechanismExplainer.test.mjs — computeMechanism retry orchestration + parse behavior.
//
// The LLM call is injected (callLLM) so no network is used; the solver is real (a single
// computeReason pass per test, same as the reasonEngine.* fast tests). The board is a committed
// fixture blunder (reason_fixture.jsonl row 0: "3325" played 5 → win_to_draw), so computeReason
// yields a real, non-notABlunder evidence object.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync as _readFileSync2 } from 'node:fs';
import { join as _join2, dirname as _dirname2 } from 'node:path';
import { fileURLToPath as _fileURLToPath2 } from 'node:url';
import { createSolverProcess } from '../c4solver-wrapper.js';
import { computeMechanism, parseAnswer, mentionsBetterColumn } from '../mechanismExplainer.mjs';
import { computeReason } from '../scripts/reason_engine/reasonEngine.mjs';
import { toNarratorVector } from '../scripts/reasonNarratorVector.mjs';
import { renderDecisionForCondition, postprocessAnswer, shapeRetryFields } from '../scripts/compute.mjs';
import { decideRetry, chooseRetryWinner, ensureBetterColumnMention } from '../retryDecision.mjs';

const MOVESTRING = '3325';
const PLAYED_COL = 5;
// Harvested live (computeMechanism on MOVESTRING/PLAYED_COL): evidence.bestCol === nv.bestCol === 1
// (0-indexed) and the prompt's canonical Decision block reads
// "- Better move: column 2 (lands at c2r1). Outcome: win." — so DISPLAY column 2.
const BEST_COL = 1;

// This fixture's real requiredSet (harvested live for MOVESTRING/PLAYED_COL via
// buildRenderDecision, re-harvested after D45, and again after task 7/OI-184) is THREE groups:
// { half: 'lostResource', spec: 'c1r1', handle: 'you-immediate' }, { half: 'opponentPunishment',
// spec: 'c2r1', handle: 'you-key-square' }, and — new under D45, the single line/window slot —
// { half: 'lostResource', spec: 'windows:c1r1,c2r1,c3r1,c4r1', handle: 'you-immediate-line' }.
// The opponentPunishment half's handle is 'you-key-square', not 'opp-key-square': this board's
// opponentPunishment is `kind: 'denial'` (the opponent occupying c2r1 to kill the mover's OWN
// double-threat window, D20 realized/denied fastpath) — the geometry is the mover's own line
// (window === lostResource's shared window), not the opponent's, so task 7's `halfOwner` derives
// owner 'you' here even though this is the opponentPunishment half (OI-184: owner follows the
// half's kind, not its position). `okAnswer` wraps all three so it satisfies the required set on the first
// attempt, keeping every pre-existing test in this file (predating the required-set retry
// trigger) exercising exactly the retry count its name says. `missingAnswer`, further down, is
// the deliberate required-set MISS fixture used by the required-set retry tests.
//
// `okAnswer` ALSO names the better column in prose ("column 2"), because a fully compliant answer
// must now satisfy BOTH content checks — the required set and `mentionsBetterColumn` — or it would
// trigger the (single, shared) retry. `noColumnAnswer` below is the byte-for-byte prior text, kept
// as the fixture that isolates a column-only miss.
const okAnswer = JSON.stringify({
  better_move: 4, played_outcome: 'draw', best_outcome: 'win',
  mechanism: 'You gave up the win at [zone:you-immediate]this square[/zone:you-immediate] on [zone:you-immediate-line]the bottom row of four[/zone:you-immediate-line], and left [zone:you-key-square]the square you needed to keep[/zone:you-key-square] open. Playing column 2 instead would have kept the win.',
  key_cells: [], fields_relied_on: [], unsure_about: '', confidence: 'high',
});
const OK_MECHANISM = 'You gave up the win at [zone:c1r1]this square[/zone:c1r1] on [zone:windows:c1r1,c2r1,c3r1,c4r1]the bottom row of four[/zone:windows:c1r1,c2r1,c3r1,c4r1], and left [zone:c2r1]the square you needed to keep[/zone:c2r1] open. Playing column 2 instead would have kept the win.'; // okAnswer, post processAnnotations (handle -> expanded spec)

let solver;
before(async () => { solver = await createSolverProcess(); });
after(() => { if (solver) solver.destroy(); });

test('returns the mechanism on a clean first attempt — no retry', async () => {
  let calls = 0;
  const res = await computeMechanism(MOVESTRING, PLAYED_COL, {
    solver, callLLM: async () => { calls++; return okAnswer; },
  });
  assert.equal(res.notABlunder, false);
  assert.equal(res.mechanism, OK_MECHANISM);
  assert.equal(res.callError, null);
  assert.equal(res.parseError, null);
  assert.equal(calls, 1);
});

test('retries exactly once on a call error, then succeeds', async () => {
  let calls = 0;
  const callLLM = async () => {
    calls++;
    if (calls === 1) throw new Error('network boom');
    return okAnswer;
  };
  const res = await computeMechanism(MOVESTRING, PLAYED_COL, { solver, callLLM });
  assert.equal(calls, 2);
  assert.equal(res.mechanism, OK_MECHANISM);
  assert.equal(res.callError, null);
});

test('retries exactly once on an unparseable response, then succeeds', async () => {
  let calls = 0;
  const callLLM = async () => { calls++; return calls === 1 ? 'not json at all' : okAnswer; };
  const res = await computeMechanism(MOVESTRING, PLAYED_COL, { solver, callLLM });
  assert.equal(calls, 2);
  assert.equal(res.mechanism, OK_MECHANISM);
  assert.equal(res.parseError, null);
});

test('two LLM failures surface the error without throwing and without a third attempt', async () => {
  let calls = 0;
  const callLLM = async () => { calls++; throw new Error('persistent boom'); };
  const res = await computeMechanism(MOVESTRING, PLAYED_COL, { solver, callLLM });
  assert.equal(calls, 2);
  assert.equal(res.mechanism, null);
  assert.match(res.callError, /persistent boom/);
});

test('threads a non-null userId to the injected callLLM (spec 047 T034 propagation)', async () => {
  let seenUserId;
  const res = await computeMechanism(MOVESTRING, PLAYED_COL, {
    solver,
    userId: 'user-abc-123',
    callLLM: async (prompt, ctx) => { seenUserId = ctx?.userId; return okAnswer; },
  });
  assert.equal(res.notABlunder, false);
  assert.equal(seenUserId, 'user-abc-123');
});

test('defaults userId to null when the caller supplies none', async () => {
  let seenUserId = 'not-yet-set';
  await computeMechanism(MOVESTRING, PLAYED_COL, {
    solver,
    callLLM: async (prompt, ctx) => { seenUserId = ctx?.userId; return okAnswer; },
  });
  assert.equal(seenUserId, null);
});

test('parseAnswer extracts a JSON object from prose-wrapped output', () => {
  const { answer, parse_error } = parseAnswer('Here you go: {"mechanism":"x"} thanks');
  assert.equal(parse_error, null);
  assert.equal(answer.mechanism, 'x');
});

// ── Locale threading (spec 051 FR-019/020, OI-28) ──────────────────────────────────────────────
// computeMechanism is the production function behind the ONLY live one-liner-equivalent surface
// (POST /api/explain-move-llm's `explanation` field, confirmed via a captured live network
// request — see specs/051-audio-verification-tts/tasks.md T033). It already threads `locale` into
// buildPromptForCondition, which appends SPANISH_OUTPUT_DIRECTIVE only for locale === 'es'. These
// tests pin that behavior at the prompt-construction seam (the prompt is what the LLM — and in
// production, a real Spanish-speaking learner's experience — actually depends on).
test('locale "es" threads the Spanish output directive into the prompt sent to the LLM', async () => {
  let seenPrompt;
  const res = await computeMechanism(MOVESTRING, PLAYED_COL, {
    solver,
    locale: 'es',
    callLLM: async (prompt) => { seenPrompt = prompt; return okAnswer; },
  });
  assert.equal(res.notABlunder, false);
  assert.match(seenPrompt, /Argentinian Spanish/);
  assert.match(seenPrompt, /vos/);
});

// ── Required-set retry (spec 058, US2, FR-007/FR-008/FR-009/FR-010) ──────────────────────────
// `missingAnswer`'s mechanism carries no zone tags at all, so it is deliberately a required-set
// MISS — distinct from `okAnswer` above, which was made to satisfy this fixture's required set so
// the pre-existing (non-US2) tests in this file keep their original retry-count semantics.
const missingAnswer = JSON.stringify({
  better_move: 4, played_outcome: 'draw', best_outcome: 'win',
  mechanism: 'You gave up the win here.',
  key_cells: [], fields_relied_on: [], unsure_about: '', confidence: 'high',
});

test('a required-set miss triggers exactly one retry with an amended prompt naming the missing handle; both attempts survive', async () => {
  let calls = 0;
  const seenPrompts = [];
  const callLLM = async (prompt) => {
    calls++;
    seenPrompts.push(prompt);
    return calls === 1 ? missingAnswer : okAnswer;
  };
  const res = await computeMechanism(MOVESTRING, PLAYED_COL, { solver, callLLM });

  assert.equal(calls, 2, 'exactly one retry, not zero and not two');
  assert.notEqual(seenPrompts[0], undefined);
  assert.notEqual(seenPrompts[1], seenPrompts[0], 'retry prompt must be amended, never the identical prompt resent');
  assert.match(seenPrompts[1], /you-immediate/, 'retry prompt must explicitly name the missing handle');

  // Both attempts are present — attempt1 is never silently dropped (research.md D3).
  assert.equal(res.attempt1.mechanism, 'You gave up the win here.');
  assert.deepEqual(res.attempt1.usedSpecs, []);
  assert.equal(res.missingHandles.length, 3);
  assert.equal(res.missingHandles[0].handle, 'you-immediate');
  assert.equal(res.missingHandles[0].spec, 'c1r1');
  assert.equal(res.missingHandles[1].handle, 'you-key-square');
  assert.equal(res.missingHandles[1].spec, 'c2r1');
  // D45: the line slot. Before D45 this group did not exist — the line was offered, never required.
  assert.equal(res.missingHandles[2].handle, 'you-immediate-line');
  assert.equal(res.missingHandles[2].spec, 'windows:c1r1,c2r1,c3r1,c4r1');

  // The served top-level result is attempt 2 (FR-009: always the retried attempt).
  assert.equal(res.mechanism, OK_MECHANISM);
  assert.ok(res.usedSpecs.includes('c1r1'));
  assert.ok(res.usedSpecs.includes('c2r1'));

  // The compliance check itself, run against the real production shape (data-model.md §2
  // Consumer 2) — pinned to usedSpecs/spec, never a raw [zone:handle] string search.
  assert.ok(res.renderDecision.requiredSet.every((g) => res.usedSpecs.includes(g.spec)));
});

test('a required-set miss that is STILL missed on the retry is still served — never re-evaluated, never a third attempt', async () => {
  let calls = 0;
  const callLLM = async () => { calls++; return missingAnswer; }; // never includes any zone tag, on either attempt
  const res = await computeMechanism(MOVESTRING, PLAYED_COL, { solver, callLLM });

  assert.equal(calls, 2, 'still exactly one retry — no third attempt even though the retry also missed');
  // attempt 2's mechanism is served regardless — and, since it never names the column either, the
  // D63/OI-224 post-repair (Task 3) appends the deterministic sentence to the SERVED text only.
  assert.equal(res.mechanism, 'You gave up the win here. Your better move was column 2.');
  assert.equal(res.betterColRepaired, true);
  assert.equal(res.missingHandles.length, 3);
  assert.equal(res.attempt1.mechanism, 'You gave up the win here.', 'attempt1 stays unrepaired');
});

test('an empty required set is a clean no-op — no retry triggered solely by the required-set check', async () => {
  // A blunder whose requiredSet is [] (measured: 13/29 of the corpus) must not force a retry.
  // This fixture's own requiredSet is non-empty, so the no-op is demonstrated the other way: when
  // attempt 1 already satisfies it (okAnswer), there is no second attempt at all.
  let calls = 0;
  const res = await computeMechanism(MOVESTRING, PLAYED_COL, {
    solver, callLLM: async () => { calls++; return okAnswer; },
  });
  assert.equal(calls, 1, 'no retry when attempt 1 already satisfies the required set');
  assert.equal(res.missingHandles.length, 0);
  assert.deepEqual(res.attempt1.usedSpecs.sort(), ['c1r1', 'c2r1', 'windows:c1r1,c2r1,c3r1,c4r1']);
});

// ── Better-column compliance + the COMBINED single retry ─────────────────────────────────────
// The regression: 3 of the 4 spec-058 staging-feedback boards were served an explanation that
// never named the column the player should have played instead (groundingDiffCases.js, attempt 8).
//
// `noColumnAnswer` is the previous `okAnswer` text verbatim: it satisfies this fixture's whole
// required set (all three zone handles) while never naming column 2 — so it isolates a
// column-only miss from a required-square miss.
const noColumnAnswer = JSON.stringify({
  better_move: 4, played_outcome: 'draw', best_outcome: 'win',
  mechanism: 'You gave up the win at [zone:you-immediate]this square[/zone:you-immediate] on [zone:you-immediate-line]the bottom row of four[/zone:you-immediate-line], and left [zone:you-key-square]the square you needed to keep[/zone:you-key-square] open.',
  key_cells: [], fields_relied_on: [], unsure_about: '', confidence: 'high',
});

test('mentionsBetterColumn: literal display wording counts; the wrong column does not', () => {
  assert.equal(mentionsBetterColumn({ mechanism: 'Playing column 2 keeps the win.' }, BEST_COL), true);
  assert.equal(mentionsBetterColumn({ mechanism: 'Playing column 5 keeps the win.' }, BEST_COL), false);
  // 0-indexed in, 1-indexed out: bestCol 1 is display column 2, never "column 1".
  assert.equal(mentionsBetterColumn({ mechanism: 'Playing column 1 keeps the win.' }, BEST_COL), false);
});

test('mentionsBetterColumn: a raw coordinate the guard rewrites to "column N" counts', () => {
  // guardExplainMoveLlmPayload's stripInternalTokens turns "c2r1"/"c2" into "column 2" before the
  // player sees it, so these ARE named columns in the served text.
  assert.equal(mentionsBetterColumn({ mechanism: 'You should have played c2r1.' }, BEST_COL), true);
  assert.equal(mentionsBetterColumn({ mechanism: 'You should have played c2.' }, BEST_COL), true);
  assert.equal(mentionsBetterColumn({ mechanism: 'You should have played c5r1.' }, BEST_COL), false);
});

test('mentionsBetterColumn: a bare zone TAG is not a mention — the delimiter never reaches the reader', () => {
  // stripInternalTokens passes [zone:…] delimiters through byte-for-byte; only the prose between
  // them is rewritten. A highlight with no wording leaves the player without a column to play.
  assert.equal(
    mentionsBetterColumn({ mechanism: 'Take [zone:c2r1]this square[/zone:c2r1].' }, BEST_COL), false);
  assert.equal(
    mentionsBetterColumn({ mechanism: 'Take [zone:c2r1]the c2r1 square[/zone:c2r1].' }, BEST_COL), true);
});

test('mentionsBetterColumn: locale "es" looks for the Spanish wording', () => {
  assert.equal(mentionsBetterColumn({ mechanism: 'Jugá en la columna 2.' }, BEST_COL, 'es'), true);
  assert.equal(mentionsBetterColumn({ mechanism: 'Play in column 2.' }, BEST_COL, 'es'), false);
});

test('mentionsBetterColumn: abstains (true) when there is no better column or no text', () => {
  assert.equal(mentionsBetterColumn({ mechanism: 'anything' }, null), true);
  assert.equal(mentionsBetterColumn({ mechanism: null }, BEST_COL), true);
});

test('a column-only miss (required set fully satisfied) triggers exactly one retry naming the column', async () => {
  let calls = 0;
  const seenPrompts = [];
  const callLLM = async (prompt) => {
    calls++;
    seenPrompts.push(prompt);
    return calls === 1 ? noColumnAnswer : okAnswer;
  };
  const res = await computeMechanism(MOVESTRING, PLAYED_COL, { solver, callLLM });

  assert.equal(calls, 2, 'exactly one retry — the column miss alone must trigger it');
  assert.notEqual(seenPrompts[1], seenPrompts[0], 'retry prompt must be amended, never resent unchanged');
  // Assert against the APPENDED block only. The base prompt already contains "column 2" in its
  // canonical Decision block, so a match against the whole retry prompt would be vacuous.
  assert.ok(seenPrompts[1].startsWith(seenPrompts[0]), 'retry prompt is the original plus new text');
  const appended = seenPrompts[1].slice(seenPrompts[0].length);
  assert.match(appended, /was never named/, 'the appended block is the better-column block');
  assert.match(appended, /column 2/, 'and it names the better column in display form');
  // The required set was already satisfied, so the squares block must NOT be in the retry prompt.
  assert.doesNotMatch(appended, /required squares were missing/);
  assert.equal(res.missingHandles.length, 0, 'no required square was missing');
  assert.equal(res.mechanism, OK_MECHANISM);
});

test('a required-square miss AND a column miss share ONE retry, in ONE amended prompt naming both', async () => {
  let calls = 0;
  const seenPrompts = [];
  const callLLM = async (prompt) => {
    calls++;
    seenPrompts.push(prompt);
    return calls === 1 ? missingAnswer : okAnswer; // missingAnswer misses every handle AND the column
  };
  const res = await computeMechanism(MOVESTRING, PLAYED_COL, { solver, callLLM });

  assert.equal(calls, 2, 'still exactly one retry — never one per miss');
  // Again: only the APPENDED text counts. "column 2" appears in the base prompt's Decision block,
  // and matching the whole prompt would pass even with the column trigger removed.
  assert.ok(seenPrompts[1].startsWith(seenPrompts[0]));
  const appended = seenPrompts[1].slice(seenPrompts[0].length);
  assert.match(appended, /you-immediate/, 'the single retry prompt names the missing handle(s)');
  assert.match(appended, /was never named[\s\S]*column 2/, '…and, in the same prompt, the missing better column');
  assert.equal(res.missingHandles.length, 3);
  assert.equal(res.mechanism, OK_MECHANISM);
});

test('an answer that names the column but misses a required square retries without the column block', async () => {
  let calls = 0;
  const seenPrompts = [];
  const columnOnlyAnswer = JSON.stringify({
    better_move: 4, played_outcome: 'draw', best_outcome: 'win',
    mechanism: 'You gave up the win — column 2 was the move.',
    key_cells: [], fields_relied_on: [], unsure_about: '', confidence: 'high',
  });
  const callLLM = async (prompt) => {
    calls++;
    seenPrompts.push(prompt);
    return calls === 1 ? columnOnlyAnswer : okAnswer;
  };
  await computeMechanism(MOVESTRING, PLAYED_COL, { solver, callLLM });

  assert.equal(calls, 2);
  assert.match(seenPrompts[1], /required squares were missing/);
  assert.doesNotMatch(seenPrompts[1], /was never named/, 'the column block must be omitted when the column was named');
});

test('locale "en" (and the default) omit the Spanish output directive — unchanged from current behavior', async () => {
  let seenPromptEn, seenPromptDefault;
  await computeMechanism(MOVESTRING, PLAYED_COL, {
    solver, locale: 'en',
    callLLM: async (prompt) => { seenPromptEn = prompt; return okAnswer; },
  });
  await computeMechanism(MOVESTRING, PLAYED_COL, {
    solver, // no locale passed — exercises the locale = 'en' default
    callLLM: async (prompt) => { seenPromptDefault = prompt; return okAnswer; },
  });
  assert.doesNotMatch(seenPromptEn, /Argentinian Spanish/);
  assert.doesNotMatch(seenPromptDefault, /Argentinian Spanish/);
});

// ── FR-013 / OI-177 / T017 — the required-set post-check is guard-aware, on a REAL span-losing
// run harvested from the US1 fixture ────────────────────────────────────────────────────────────
//
// Board/answer harvested verbatim (not hand-written) from
// `scripts/reason_corpus/runs/fv_suff_answers_boards_subset_2026-08-26T15-47-56Z.jsonl`, row
// `id: "eval-5", run_index: 0` — one of the 5 real span-losing rows T009/computePostGuard.test.mjs
// pins (all 5 fail `P6:raw_coordinate`). The model's raw text wraps `[zone:you-key-square]` around
// the words "the square at c6r6" — a raw coordinate ("c6r6") that does NOT match the tag's own
// promoted cell (`future:c6r4`), so `guardExplainMoveLlmPayload`'s P6 check strips that span from
// the served text. `future:c6r4` is a REQUIRED spec (`you-key-square`, half `lostResource`) on
// this board. Before T017, `future:c6r4` still counted as "used" (pre-guard `usedSpecs` includes
// it — processAnnotations resolved the tag successfully), so no retry fired (verified live via
// `git stash` on mechanismExplainer.mjs: calls === 1, missingHandles === []). After T017, the
// guard-aware `survivedSpecs` filter drops `future:c6r4` (its span was stripped), so
// `missingRequiredGroups` now reports it missing and the single retry fires (calls === 2).
const MOVESTRING5 = '33322';
const PLAYED_COL5 = 0;
const SPAN_LOSING_RAW = `{
  "better_move": 3,
  "played_outcome": "loss",
  "best_outcome": "loss",
  "mechanism": "You should keep the [zone:better-col]central column 3[/zone:better-col] instead of giving ground with [zone:played-col]column 1[/zone:played-col]; that opening choice is the tougher defense because it keeps your shape connected and makes the later parity fight harder to unravel. Much later, once the forced line reaches it, [zone:you-key-line]your four-in-a-row line on c3-c6[/zone:you-key-line] and [zone:you-key-square]the square at c6r6[/zone:you-key-square] are the practical swindle you want to keep alive, while your opponent's matching later resource on [zone:opp-key-square]c2r3[/zone:opp-key-square] shows how the reply pressure lands on the other side of the board.",
  "key_cells": ["c6r6", "c2r3"],
  "fields_relied_on": ["openingContext.defense.family", "openingContext.defense.matchedPrefixLen", "openingContext.defense.centralityGrounded", "case", "lostResource.parityAttribution", "opponentPunishment.parityAttribution", "replyHistogram.afterBest", "replyHistogram.afterPlayed", "lostResource.tacticTag", "opponentPunishment.tacticTag"],
  "unsure_about": "",
  "confidence": "high"
}`;

test('FR-013/OI-177: a required spec whose zone span the guard strips is treated as missing and triggers the retry (real span-losing corpus row, eval-5 run 0)', async () => {
  let calls = 0;
  const res = await computeMechanism(MOVESTRING5, PLAYED_COL5, {
    solver, callLLM: async () => { calls++; return SPAN_LOSING_RAW; },
  });
  // `future:c6r4` (handle `you-key-square`) is a required group on this board.
  assert.ok(res.renderDecision.requiredSet.some((g) => g.spec === 'future:c6r4' && g.handle === 'you-key-square'));
  // Pre-guard: processAnnotations DID resolve the tag — the spec is genuinely in usedSpecs.
  assert.ok(res.attempt1.usedSpecs.includes('future:c6r4'));
  // Guard-aware: the retry fires anyway, because the guard strips that spec's span (P6 raw
  // coordinate mismatch), and missingHandles names exactly that required group.
  assert.equal(calls, 2, 'the guard-aware post-check must trigger exactly one retry');
  assert.ok(res.missingHandles.some((g) => g.spec === 'future:c6r4' && g.handle === 'you-key-square'),
    'missingHandles must name the required group whose span the guard stripped');
});

// ── decideRetry extraction (task-1: retryDecision.mjs, D51 seam) ─────────────────────────────
// decideRetry is the extracted content-trigger decision computeMechanism now delegates to. Build
// the renderDecision and attempt1 the REAL way — via computeReason/toNarratorVector/
// renderDecisionForCondition/postprocessAnswer over a real solver — never a hand-authored
// renderDecision/requiredSet object (I12: that would be the hand-rolled proxy the invariant forbids).
test('decideRetry reproduces computeMechanism\'s own trigger decision (D51 seam, extracted)', async () => {
  const nv = toNarratorVector(await computeReason(MOVESTRING, PLAYED_COL, { solver }));
  const renderDecision = renderDecisionForCondition(nv, 'D');
  const { answer } = parseAnswer(missingAnswer);
  const { mechanism, usedSpecs } = postprocessAnswer(answer, renderDecision);

  // A required-set MISS must decide shouldRetry === true and name the missing group.
  const d = decideRetry({ attempt1: { mechanism, usedSpecs, answer }, renderDecision, prompt: 'P',
                          movestring: MOVESTRING, bestCol: nv?.bestCol ?? null, locale: 'en' });
  assert.equal(d.shouldRetry, true);
  assert.ok(d.missing.length > 0);
  assert.ok(d.retryPrompt.startsWith('P'));            // amended prompt extends the original
  assert.match(d.retryPrompt, /Retry: required squares were missing/);
});

// ── compute.mjs `shapeRetryFields` — pure row-shaping, no network (task-2, harness --retry) ────
// This is the same seam compute.mjs's runLlm uses to turn a real decideRetry() outcome into the
// three additive answers-row fields (`retry_fired`/`retry_reason`/`attempt1`). Every fixture below
// is a REAL decideRetry() outcome, built the same way the extraction test above does — via
// computeReason/toNarratorVector/renderDecisionForCondition/postprocessAnswer over a real solver —
// never a hand-authored { shouldRetry, missing, ... } stub (I12: that would be the hand-rolled
// proxy invariant forbids). No LLM/network call anywhere in this block.
test('shapeRetryFields: retry off (no outcome) — row unchanged from today\'s shape', () => {
  const attempt1Row = {
    raw: 'r', answer: { mechanism: 'm' }, parse_error: null, call_error: null,
    guardDiagnostics: { x: 1 }, annotationRepairs: [], servedExplanation: 's',
  };
  const shaped = shapeRetryFields({ shouldRetry: false }, attempt1Row);
  assert.deepEqual(shaped, { retry_fired: false, retry_reason: null, attempt1: null });
});

test('shapeRetryFields: also treats a missing/null outcome as no retry', () => {
  const shaped = shapeRetryFields(null, { raw: 'r' });
  assert.deepEqual(shaped, { retry_fired: false, retry_reason: null, attempt1: null });
});

test('shapeRetryFields: a real required-set-miss decideRetry outcome shapes retry_fired/retry_reason/attempt1', async () => {
  const nv = toNarratorVector(await computeReason(MOVESTRING, PLAYED_COL, { solver }));
  const renderDecision = renderDecisionForCondition(nv, 'D');
  const { answer: rawAnswer } = parseAnswer(missingAnswer);
  const { answer, usedSpecs } = postprocessAnswer(rawAnswer, renderDecision);
  const d = decideRetry({
    attempt1: { mechanism: answer?.mechanism ?? null, usedSpecs, answer }, renderDecision, prompt: 'P',
    movestring: MOVESTRING, bestCol: nv?.bestCol ?? null, locale: 'en',
  });
  assert.equal(d.shouldRetry, true); // sanity: this fixture's real trigger, per the extraction test above

  const attempt1Row = {
    raw: missingAnswer, answer, parse_error: null, call_error: null,
    guardDiagnostics: { some: 'diagnostics' }, annotationRepairs: [], servedExplanation: 'served text',
  };
  const shaped = shapeRetryFields(d, attempt1Row);
  assert.equal(shaped.retry_fired, true);
  assert.deepEqual(shaped.retry_reason.missingHandles, ['you-immediate', 'you-key-square', 'you-immediate-line']);
  assert.equal(typeof shaped.retry_reason.missingBetterCol, 'boolean');
  // attempt1 preserves the FIRST attempt's row data verbatim — never recomputed.
  assert.equal(shaped.attempt1, attempt1Row);
});

test('shapeRetryFields: a column-only miss reports missingHandles: [] and missingBetterCol: true', async () => {
  const nv = toNarratorVector(await computeReason(MOVESTRING, PLAYED_COL, { solver }));
  const renderDecision = renderDecisionForCondition(nv, 'D');
  const { answer: rawAnswer } = parseAnswer(noColumnAnswer); // satisfies the required set, never names the column
  // Mirrors compute.mjs's own runLlm call site exactly: postprocessAnswer's return has no
  // top-level `mechanism` field — it lives on the returned `answer` (postprocessAnswer's
  // `{ answer, repairs, usedSpecs }`), matching `answer?.mechanism ?? null` in compute.mjs.
  const { answer, usedSpecs } = postprocessAnswer(rawAnswer, renderDecision);
  const d = decideRetry({
    attempt1: { mechanism: answer?.mechanism ?? null, usedSpecs, answer }, renderDecision, prompt: 'P',
    movestring: MOVESTRING, bestCol: nv?.bestCol ?? null, locale: 'en',
  });
  assert.equal(d.shouldRetry, true);
  assert.equal(d.missing.length, 0, 'sanity: the required set is fully satisfied here');

  const shaped = shapeRetryFields(d, { raw: noColumnAnswer });
  assert.equal(shaped.retry_fired, true);
  assert.deepEqual(shaped.retry_reason.missingHandles, []);
  assert.equal(shaped.retry_reason.missingBetterCol, true);
});

// ── chooseRetryWinner (D51 follow-up: keep the better attempt) ───────────────────────────────
// Measured over the v3retry63 corpus: the retry can lose ground the first attempt already held
// (required-set: 6/81 regressed; better-column: 11/81 regressed) even though it is net-positive
// overall. `chooseRetryWinner` prefers the retry, falling back to attempt1 only when attempt1 is
// STRICTLY better (more required groups satisfied, or equal groups + attempt1 names the column and
// the retry does not). Every case below is scored against this fixture's REAL requiredSet
// (`c1r1`/`you-immediate`, `c2r1`/`you-key-square`, `windows:c1r1,c2r1,c3r1,c4r1`/`you-immediate-line`
// — harvested via computeReason/toNarratorVector/renderDecisionForCondition, never hand-authored,
// per I12) — only the attempts themselves (`mechanism` + `usedSpecs`) are hand-built, mirroring the
// `decideRetry` extraction tests above. `scoreAttempt`'s guard pass only strips a spec whose zone tag
// is actually present-but-invalid in `mechanism`; a spec listed in `usedSpecs` with no corresponding
// tag in the text is never stripped, so a bare `usedSpecs` list is a valid, guard-safe stand-in for
// "this many required groups were satisfied" without needing real zone-tag text for each case.
test('chooseRetryWinner: retry satisfies more required groups than attempt1 → retry served', async () => {
  const nv = toNarratorVector(await computeReason(MOVESTRING, PLAYED_COL, { solver }));
  const renderDecision = renderDecisionForCondition(nv, 'D');
  const attempt1 = { mechanism: 'You gave up the win here.', usedSpecs: [] };
  const retriedAttempt = {
    mechanism: 'You gave up the win here, with more detail.',
    usedSpecs: ['c1r1', 'c2r1', 'windows:c1r1,c2r1,c3r1,c4r1'],
  };
  const { chosen, attempt } = chooseRetryWinner({
    attempt1, retriedAttempt, renderDecision, movestring: MOVESTRING, bestCol: nv?.bestCol ?? null, locale: 'en',
  });
  assert.equal(chosen, 'retry');
  assert.equal(attempt, retriedAttempt);
});

test('chooseRetryWinner: retry regresses on the required set → attempt1 served', async () => {
  const nv = toNarratorVector(await computeReason(MOVESTRING, PLAYED_COL, { solver }));
  const renderDecision = renderDecisionForCondition(nv, 'D');
  // attempt1 satisfies 2/3 required groups and names the column — this is what triggered the
  // retry in the first place (missing the 3rd group).
  const attempt1 = {
    mechanism: 'You gave up the win here. Playing column 2 instead would have kept the win.',
    usedSpecs: ['c1r1', 'windows:c1r1,c2r1,c3r1,c4r1'],
  };
  // The retry loses ALL of it — a genuine regression the retry never should have shipped.
  const retriedAttempt = { mechanism: 'You gave up the win here.', usedSpecs: [] };
  const { chosen, attempt } = chooseRetryWinner({
    attempt1, retriedAttempt, renderDecision, movestring: MOVESTRING, bestCol: nv?.bestCol ?? null, locale: 'en',
  });
  assert.equal(chosen, 'attempt1');
  assert.equal(attempt, attempt1);
});

test('chooseRetryWinner: equal required-groups but retry regresses on the better column only → attempt1 served', async () => {
  const nv = toNarratorVector(await computeReason(MOVESTRING, PLAYED_COL, { solver }));
  const renderDecision = renderDecisionForCondition(nv, 'D');
  const sharedUsedSpecs = ['c1r1', 'windows:c1r1,c2r1,c3r1,c4r1']; // same 2/3 groups on both attempts
  const attempt1 = {
    mechanism: 'You gave up the win here. Playing column 2 instead would have kept the win.',
    usedSpecs: sharedUsedSpecs,
  };
  const retriedAttempt = {
    mechanism: 'You gave up the win here, explained differently, but never says which column.',
    usedSpecs: sharedUsedSpecs,
  };
  const { chosen, attempt } = chooseRetryWinner({
    attempt1, retriedAttempt, renderDecision, movestring: MOVESTRING, bestCol: nv?.bestCol ?? null, locale: 'en',
  });
  assert.equal(chosen, 'attempt1');
  assert.equal(attempt, attempt1);
});

test('chooseRetryWinner: a tie (equal required-groups, equal column status) goes to the retry', async () => {
  const nv = toNarratorVector(await computeReason(MOVESTRING, PLAYED_COL, { solver }));
  const renderDecision = renderDecisionForCondition(nv, 'D');
  const attempt1 = { mechanism: 'You gave up the win here.', usedSpecs: [] };
  const retriedAttempt = { mechanism: 'You gave up the win here, phrased differently.', usedSpecs: [] };
  const { chosen, attempt } = chooseRetryWinner({
    attempt1, retriedAttempt, renderDecision, movestring: MOVESTRING, bestCol: nv?.bestCol ?? null, locale: 'en',
  });
  assert.equal(chosen, 'retry');
  assert.equal(attempt, retriedAttempt);
});

// ── computeMechanism wiring (mechanismExplainer.mjs:143-147) — servedAttempt end-to-end ──────
test('computeMechanism: retry improves the required set → servedAttempt is "retry" and the retried mechanism is served', async () => {
  let calls = 0;
  const callLLM = async () => { calls++; return calls === 1 ? missingAnswer : okAnswer; };
  const res = await computeMechanism(MOVESTRING, PLAYED_COL, { solver, callLLM });
  assert.equal(calls, 2);
  assert.equal(res.servedAttempt, 'retry');
  assert.equal(res.mechanism, OK_MECHANISM);
});

test('computeMechanism: retry regresses the required set → servedAttempt is "attempt1" and attempt1\'s mechanism is served', async () => {
  // Attempt 1: names the column, wraps 2 of the 3 required groups (missing you-key-square) — a
  // genuine trigger. Attempt 2 (the retry, injected as a worse answer): loses all zone coverage.
  const partialAnswerWithCol = JSON.stringify({
    better_move: 4, played_outcome: 'draw', best_outcome: 'win',
    mechanism: 'You gave up the win at [zone:you-immediate]this square[/zone:you-immediate] on '
      + '[zone:you-immediate-line]the bottom row of four[/zone:you-immediate-line]. Playing column 2 instead would have kept the win.',
    key_cells: [], fields_relied_on: [], unsure_about: '', confidence: 'high',
  });
  let calls = 0;
  const callLLM = async () => { calls++; return calls === 1 ? partialAnswerWithCol : missingAnswer; };
  const res = await computeMechanism(MOVESTRING, PLAYED_COL, { solver, callLLM });
  assert.equal(calls, 2, 'the retry still fires — attempt1 missed a required group');
  assert.equal(res.servedAttempt, 'attempt1');
  assert.equal(res.mechanism, res.attempt1.mechanism, 'attempt1 is what gets served, not the regressed retry');
  assert.ok(res.attempt1.usedSpecs.includes('c1r1'));
  assert.ok(!res.usedSpecs.includes('c2r1'), 'the served (attempt1) mechanism never covered you-key-square either');
});

// ── computeMechanism: contentRetryFired / missingBetterCol (migration 066 telemetry fields) ──
test('no retry: contentRetryFired and missingBetterCol are both false, servedAttempt is "attempt1"', async () => {
  const res = await computeMechanism(MOVESTRING, PLAYED_COL, {
    solver, callLLM: async () => okAnswer,
  });
  assert.equal(res.contentRetryFired, false);
  assert.equal(res.missingBetterCol, false);
  assert.equal(res.servedAttempt, 'attempt1');
});

test('content retry fired and the retry is served: contentRetryFired true, servedAttempt "retry"', async () => {
  let calls = 0;
  const callLLM = async () => { calls++; return calls === 1 ? missingAnswer : okAnswer; };
  const res = await computeMechanism(MOVESTRING, PLAYED_COL, { solver, callLLM });
  assert.equal(calls, 2);
  assert.equal(res.contentRetryFired, true);
  assert.equal(res.missingBetterCol, true, 'missingAnswer also misses the column, not only the required set');
  assert.equal(res.servedAttempt, 'retry');
});

test('content retry fired but attempt1 is served (retry regressed): contentRetryFired stays true, servedAttempt "attempt1"', async () => {
  // Same fixture as the "retry regresses the required set" servedAttempt test above: attempt1
  // names the column and wraps 2 of 3 required groups (a genuine trigger); the retry loses all
  // zone coverage and is rejected by chooseRetryWinner. contentRetryFired records that a retry was
  // ATTEMPTED, independent of which attempt chooseRetryWinner ultimately serves.
  const partialAnswerWithCol = JSON.stringify({
    better_move: 4, played_outcome: 'draw', best_outcome: 'win',
    mechanism: 'You gave up the win at [zone:you-immediate]this square[/zone:you-immediate] on '
      + '[zone:you-immediate-line]the bottom row of four[/zone:you-immediate-line]. Playing column 2 instead would have kept the win.',
    key_cells: [], fields_relied_on: [], unsure_about: '', confidence: 'high',
  });
  let calls = 0;
  const callLLM = async () => { calls++; return calls === 1 ? partialAnswerWithCol : missingAnswer; };
  const res = await computeMechanism(MOVESTRING, PLAYED_COL, { solver, callLLM });
  assert.equal(calls, 2);
  assert.equal(res.contentRetryFired, true);
  assert.equal(res.missingBetterCol, false, 'partialAnswerWithCol already named the column — only the required set triggered the retry');
  assert.equal(res.servedAttempt, 'attempt1');
});

test('a column-only miss sets missingBetterCol true with an empty missingHandles list', async () => {
  let calls = 0;
  const callLLM = async () => { calls++; return calls === 1 ? noColumnAnswer : okAnswer; };
  const res = await computeMechanism(MOVESTRING, PLAYED_COL, { solver, callLLM });
  assert.equal(calls, 2);
  assert.equal(res.contentRetryFired, true);
  assert.equal(res.missingBetterCol, true);
  assert.equal(res.missingHandles.length, 0);
});

test('an LLM-error retry (call/parse failure) does NOT set contentRetryFired — a different trigger, no content reason', async () => {
  let calls = 0;
  const callLLM = async () => {
    calls++;
    if (calls === 1) throw new Error('network boom');
    return okAnswer;
  };
  const res = await computeMechanism(MOVESTRING, PLAYED_COL, { solver, callLLM });
  assert.equal(calls, 2, 'the LLM-error retry still fires — unaffected by this change');
  assert.equal(res.servedAttempt, 'retry', 'the resent attempt is served as-is');
  assert.equal(res.contentRetryFired, false, 'contentRetryFired covers only the content-trigger branch, not the LLM-error resend');
  assert.equal(res.missingBetterCol, false);
});

// ── D63 / OI-224: deterministic better-column post-repair ─────────────────────────────────────
// WHY this exists and not a re-ranked chooser: replaying all 189 runs of the v3retry63 corpus and
// scoring the SERVED attempt, every alternative chooser ranking that cut the "no better column"
// count cost strictly MORE required-set than it bought (column-first: column 13->0 but required-set
// misses 14->26 runs / 15->38 groups). The repair is not a ranking — simulated over the same 189
// runs it measured column 13->0 with the required-set axis unchanged at 14. See D63.

test('ensureBetterColumnMention: appends the localized column sentence when the text lacks it', () => {
  const { mechanism, repaired } = ensureBetterColumnMention(
    'You handed your opponent the tempo here.', 2, 'en');
  assert.equal(repaired, true);
  // bestCol is 0-indexed; the reader sees 1-indexed.
  assert.match(mechanism, /\bcolumn 3\b/);
  assert.ok(mechanism.startsWith('You handed your opponent the tempo here.'));
});

test('ensureBetterColumnMention: the repaired text satisfies mentionsBetterColumn (the check that '
  + 'declared it missing)', () => {
  const before = 'You handed your opponent the tempo here.';
  assert.equal(mentionsBetterColumn({ mechanism: before }, 2, 'en'), false);
  const { mechanism } = ensureBetterColumnMention(before, 2, 'en');
  assert.equal(mentionsBetterColumn({ mechanism }, 2, 'en'), true);
});

test('ensureBetterColumnMention: no-ops when the column is already named (prose or raw coordinate)', () => {
  const plain = ensureBetterColumnMention('Play column 3 instead.', 2, 'en');
  assert.equal(plain.repaired, false);
  assert.equal(plain.mechanism, 'Play column 3 instead.');
  // The guard rewrites a raw cNrM to "column N" before serving, so mentionsBetterColumn counts it —
  // the repair must respect that and not double up.
  const raw = ensureBetterColumnMention('You should have played c3r1.', 2, 'en');
  assert.equal(raw.repaired, false);
});

test('ensureBetterColumnMention: abstains on no better column, empty text, or a non-string', () => {
  assert.deepEqual(ensureBetterColumnMention('anything', null, 'en'),
    { mechanism: 'anything', repaired: false });
  assert.deepEqual(ensureBetterColumnMention(null, 2, 'en'), { mechanism: null, repaired: false });
  assert.deepEqual(ensureBetterColumnMention('', 2, 'en'), { mechanism: '', repaired: false });
  assert.deepEqual(ensureBetterColumnMention('   ', 2, 'en'), { mechanism: '   ', repaired: false });
});

test('ensureBetterColumnMention: locale "es" appends the Spanish wording and satisfies the es check', () => {
  const before = 'Le regalaste el tempo a tu rival.';
  assert.equal(mentionsBetterColumn({ mechanism: before }, 2, 'es'), false);
  const { mechanism, repaired } = ensureBetterColumnMention(before, 2, 'es');
  assert.equal(repaired, true);
  assert.match(mechanism, /\bcolumna 3\b/);
  assert.equal(mentionsBetterColumn({ mechanism }, 2, 'es'), true);
  // Must NOT ship the English string under es (the silent-English-fallback trap).
  assert.doesNotMatch(mechanism, /\bcolumn 3\b/);
});

test('ensureBetterColumnMention: the appended sentence carries no zone tag and no raw coordinate, '
  + 'so the annotation gate cannot strip it', () => {
  const { mechanism } = ensureBetterColumnMention('Some coach prose.', 2, 'en');
  const appended = mechanism.slice('Some coach prose.'.length);
  assert.doesNotMatch(appended, /\[\/?zone:/);
  assert.doesNotMatch(appended, /\[\/?term:/);
  assert.doesNotMatch(appended, /\bc\d+r\d+\b/i);
  assert.doesNotMatch(appended, /\bcol\d+\b/i);
});

// M7: the repair must not produce a run-on sentence when the mechanism ends without punctuation.
test('ensureBetterColumnMention: inserts a "." before the appended sentence when the mechanism ' +
  'does not already end in sentence punctuation', () => {
  const { mechanism } = ensureBetterColumnMention('You gave up the tempo', 2, 'en');
  assert.equal(mechanism, 'You gave up the tempo. Your better move was column 3.');
});

test('ensureBetterColumnMention: does not double up punctuation when the mechanism already ends ' +
  'in ".", "!", "?" or "…" (including trailing whitespace)', () => {
  assert.equal(
    ensureBetterColumnMention('You gave up the tempo.', 2, 'en').mechanism,
    'You gave up the tempo. Your better move was column 3.');
  assert.equal(
    ensureBetterColumnMention('You gave up the tempo!', 2, 'en').mechanism,
    'You gave up the tempo! Your better move was column 3.');
  assert.equal(
    ensureBetterColumnMention('Did you see that coming?', 2, 'en').mechanism,
    'Did you see that coming? Your better move was column 3.');
  assert.equal(
    ensureBetterColumnMention('You gave up the tempo…', 2, 'en').mechanism,
    'You gave up the tempo… Your better move was column 3.');
  // Trailing whitespace before the punctuation must not defeat the check.
  assert.equal(
    ensureBetterColumnMention('You gave up the tempo.   ', 2, 'en').mechanism,
    'You gave up the tempo. Your better move was column 3.');
});

test('ensureBetterColumnMention: checks the last NON-TAG character when the mechanism ends in a ' +
  'closing [/zone:...] tag', () => {
  const { mechanism } = ensureBetterColumnMention(
    'The threat sat at [zone:opp-major]c4r3[/zone:opp-major]', 2, 'en');
  assert.equal(mechanism,
    'The threat sat at [zone:opp-major]c4r3[/zone:opp-major]. Your better move was column 3.');
  const { mechanism: alreadyPunctuated } = ensureBetterColumnMention(
    'The threat sat at [zone:opp-major]c4r3[/zone:opp-major].', 2, 'en');
  assert.equal(alreadyPunctuated,
    'The threat sat at [zone:opp-major]c4r3[/zone:opp-major]. Your better move was column 3.');
});

// ── computeMechanism wiring for the D63/OI-224 post-repair (Task 3) ──────────────────────────
test('computeMechanism: a served answer that never names the better column is repaired, and the '
  + 'repair is reported via betterColRepaired', async () => {
  // Both attempts omit the column (noColumnAnswer, reused for both calls): the required set is
  // fully satisfied so the chooser ties and serves the retry, but the served text still lacks the
  // column — exactly the 13-run population OI-224 measured. Production must not ship that.
  const result = await computeMechanism(MOVESTRING, PLAYED_COL, {
    solver, callLLM: async () => noColumnAnswer,
  });
  assert.equal(result.betterColRepaired, true);
  assert.equal(mentionsBetterColumn({ mechanism: result.mechanism }, result.nv.bestCol), true);
  assert.equal(result.answer.mechanism, result.mechanism, 'answer.mechanism must carry the repair too');
});

test('computeMechanism: an answer that already names the better column is untouched '
  + '(betterColRepaired false, text byte-identical)', async () => {
  const result = await computeMechanism(MOVESTRING, PLAYED_COL, {
    solver, callLLM: async () => okAnswer,
  });
  assert.equal(result.betterColRepaired, false);
  assert.ok(!/Your better move was column/.test(result.mechanism));
  assert.equal(result.mechanism, OK_MECHANISM, 'no repair means byte-identical to the pre-existing served text');
});

test('computeMechanism: attempt1 stays UNREPAIRED even when it is also the served attempt and the '
  + 'repair fires', async () => {
  // attempt1 = noColumnAnswer: satisfies the required set fully but omits the column, so
  // chooseRetryWinner picks it over a strictly worse retry (missingAnswer, 0/3 required groups) —
  // servedAttempt is 'attempt1' with no required-set trigger of its own, and the post-repair still
  // has to run on it. Verifies the object-identity claim (spread-not-mutate) with a real fixture.
  let calls = 0;
  const callLLM = async () => { calls++; return calls === 1 ? noColumnAnswer : missingAnswer; };
  const result = await computeMechanism(MOVESTRING, PLAYED_COL, { solver, callLLM });
  assert.equal(result.servedAttempt, 'attempt1');
  assert.equal(result.betterColRepaired, true);
  assert.notEqual(result.mechanism, result.attempt1.mechanism,
    'attempt1 must stay unrepaired even though it is what gets served');
  assert.equal(mentionsBetterColumn({ mechanism: result.attempt1.mechanism }, result.nv.bestCol), false,
    'attempt1.mechanism is the model\'s original text — still missing the column');
});

test('compute.mjs --retry parity: the harness applies the SAME better-column repair production '
  + 'applies, via the same exported function (never a reimplementation)', () => {
  // I12: probe the property through the production function, never a hand-rolled proxy.
  // SHAPE, not a bare source regex: computePostGuard.test.mjs:55-70 pairs a source-import regex with
  // a BEHAVIOURAL companion at :72 — a lone `assert.match(src, /better_col_repaired/)` would pass on
  // the COMMENT this task's Step 4 inserts, before any field is emitted, so that half is dropped
  // rather than kept as padding.
  // The harness applies the repair inline — a 3-line block inside the un-exported `runLlm` — so
  // there is no exported harness-side helper to call directly. The honest coverage is (a) this
  // import check, that compute.mjs shares the ONE implementation rather than reimplementing it, plus
  // (b) the direct `ensureBetterColumnMention` behaviour check already in Task 2. The harness's OWN
  // wiring — that `runLlm` actually calls the imported function at the right point and the row field
  // lands correctly — is covered by Task 6's probe re-run over real harness output, not by a unit
  // test here.
  const src = _readFileSync2(_join2(_dirname2(_fileURLToPath2(import.meta.url)),
    '../scripts/compute.mjs'), 'utf8');
  assert.match(src, /import\s*\{[^}]*\bensureBetterColumnMention\b[^}]*\}\s*from\s*'\.\.\/retryDecision\.mjs';/,
    'compute.mjs must import the real ensureBetterColumnMention symbol from retryDecision.mjs, not reimplement it');
  assert.doesNotMatch(src, /function\s+ensureBetterColumnMention/,
    'compute.mjs must not define a local ensureBetterColumnMention');
  // Behavioural half: same function, same contract — verified directly, never via compute.mjs's source.
  const { mechanism, repaired } = ensureBetterColumnMention('No column named here.', 4, 'en');
  assert.equal(repaired, true);
  assert.match(mechanism, /\bcolumn 5\b/);
});
