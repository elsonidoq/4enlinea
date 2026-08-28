// mechanismExplainer.test.mjs — computeMechanism retry orchestration + parse behavior.
//
// The LLM call is injected (callLLM) so no network is used; the solver is real (a single
// computeReason pass per test, same as the reasonEngine.* fast tests). The board is a committed
// fixture blunder (reason_fixture.jsonl row 0: "3325" played 5 → win_to_draw), so computeReason
// yields a real, non-notABlunder evidence object.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createSolverProcess } from '../c4solver-wrapper.js';
import { computeMechanism, parseAnswer, mentionsBetterColumn } from '../mechanismExplainer.mjs';

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
  assert.equal(res.mechanism, 'You gave up the win here.'); // attempt 2's mechanism is served regardless
  assert.equal(res.missingHandles.length, 3);
  assert.equal(res.attempt1.mechanism, 'You gave up the win here.');
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
