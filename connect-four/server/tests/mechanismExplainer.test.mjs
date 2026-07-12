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

const okAnswer = JSON.stringify({
  better_move: 4, played_outcome: 'draw', best_outcome: 'win',
  mechanism: 'You gave up the win here.',
  key_cells: [], fields_relied_on: [], unsure_about: '', confidence: 'high',
});

let solver;
before(async () => { solver = await createSolverProcess(); });
after(() => { if (solver) solver.destroy(); });

test('returns the mechanism on a clean first attempt — no retry', async () => {
  let calls = 0;
  const res = await computeMechanism(MOVESTRING, PLAYED_COL, {
    solver, callLLM: async () => { calls++; return okAnswer; },
  });
  assert.equal(res.notABlunder, false);
  assert.equal(res.mechanism, 'You gave up the win here.');
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
  assert.equal(res.mechanism, 'You gave up the win here.');
  assert.equal(res.callError, null);
});

test('retries exactly once on an unparseable response, then succeeds', async () => {
  let calls = 0;
  const callLLM = async () => { calls++; return calls === 1 ? 'not json at all' : okAnswer; };
  const res = await computeMechanism(MOVESTRING, PLAYED_COL, { solver, callLLM });
  assert.equal(calls, 2);
  assert.equal(res.mechanism, 'You gave up the win here.');
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
