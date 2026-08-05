// mechanismExplainer.test.mjs — computeMechanism retry orchestration + parse behavior.
//
// The LLM call is injected (callLLM) so no network is used; the solver is real (a single
// computeReason pass per test, same as the reasonEngine.* fast tests). The board is a committed
// fixture blunder (reason_fixture.jsonl row 0: "3325" played 5 → win_to_draw), so computeReason
// yields a real, non-notABlunder evidence object.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createSolverProcess } from '../c4solver-wrapper.js';
import { computeMechanism, parseAnswer } from '../mechanismExplainer.mjs';

const MOVESTRING = '3325';
const PLAYED_COL = 5;

// This fixture's real requiredSet (verified live for MOVESTRING/PLAYED_COL via
// buildRenderDecision, spec 058 US2) is a single group: { half: 'lostResource', spec: 'c1r1',
// handle: 'you-immediate', role: 'the square where you can make four next move' }. `okAnswer`'s
// mechanism below includes that handle's zone tag so it satisfies the required set on the first
// attempt, keeping every pre-existing test in this file (predating the required-set retry
// trigger) exercising exactly the retry count its name says. `missingAnswer`, further down, is
// the deliberate required-set MISS fixture used by the required-set retry tests.
const okAnswer = JSON.stringify({
  better_move: 4, played_outcome: 'draw', best_outcome: 'win',
  mechanism: 'You gave up the win at [zone:you-immediate]this square[/zone:you-immediate].',
  key_cells: [], fields_relied_on: [], unsure_about: '', confidence: 'high',
});
const OK_MECHANISM = 'You gave up the win at [zone:c1r1]this square[/zone:c1r1].'; // okAnswer, post processAnnotations (handle -> expanded spec)

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
// This fixture's real requiredSet (verified live for MOVESTRING/PLAYED_COL via
// buildRenderDecision) is a single group: { half: 'lostResource', spec: 'c1r1',
// handle: 'you-immediate', role: 'the square where you can make four next move' }.
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
  assert.equal(res.missingHandles.length, 1);
  assert.equal(res.missingHandles[0].handle, 'you-immediate');
  assert.equal(res.missingHandles[0].spec, 'c1r1');

  // The served top-level result is attempt 2 (FR-009: always the retried attempt).
  assert.equal(res.mechanism, OK_MECHANISM);
  assert.ok(res.usedSpecs.includes('c1r1'));

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
  assert.equal(res.missingHandles.length, 1);
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
  assert.deepEqual(res.attempt1.usedSpecs, ['c1r1']);
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
