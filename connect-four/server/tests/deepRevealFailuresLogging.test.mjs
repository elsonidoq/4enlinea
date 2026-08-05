// deepRevealFailuresLogging.test.mjs — the two-attempt deep_reveal_failures insert path
// (spec 058, US2, T016). No existing file tests this insert shape in isolation.
//
// server/index.js's route handler builds its insert rows via
// server/deepRevealFailuresRow.js's buildTerminalFailureRow/buildMissingRequiredSquaresRow — this
// test imports and calls the SAME functions the route calls (testing-conventions.md, "test the
// real seam, never a copy of it"), rather than reimplementing the insert object inline.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTerminalFailureRow, buildMissingRequiredSquaresRow } from '../deepRevealFailuresRow.js';

test('buildMissingRequiredSquaresRow writes both attempts, missing_handles, and served_attempt=2', () => {
  const attempt1 = { raw: 'raw attempt 1 output', mechanism: 'You gave up the win here.' };
  const missingHandles = [
    { half: 'lostResource', spec: 'c1r1', handle: 'you-immediate', role: 'the square where you can make four next move' },
  ];

  const row = buildMissingRequiredSquaresRow({
    positionHash: 'hash-abc',
    movestring: '3325',
    col: 5,
    endpoint: '/api/explain-move-llm',
    prompt: 'the original prompt',
    raw: 'raw attempt 2 output',
    mechanism: 'You gave up the win at [zone:c1r1]this square[/zone:c1r1].',
    attempt1,
    missingHandles,
  });

  assert.equal(row.position_hash, 'hash-abc');
  assert.equal(row.movestring, '3325');
  assert.equal(row.col, 5);
  assert.equal(row.endpoint, '/api/explain-move-llm');
  assert.equal(row.failure_reason, 'missing_required_squares');

  assert.equal(row.attempt1_raw_llm_output, 'raw attempt 1 output');
  assert.equal(row.attempt1_mechanism, 'You gave up the win here.');
  assert.equal(row.attempt2_raw_llm_output, 'raw attempt 2 output');
  assert.equal(row.attempt2_mechanism, 'You gave up the win at [zone:c1r1]this square[/zone:c1r1].');
  assert.deepEqual(row.missing_handles, missingHandles);
  assert.equal(row.served_attempt, 2);

  // The pre-existing NOT NULL columns are still populated (raw_llm_output mirrors the served —
  // attempt 2 — output, matching the existing terminal-failure row's llm_prompt/raw_llm_output
  // convention of "the attempt this row is actually reporting on").
  assert.equal(row.llm_prompt, 'the original prompt');
  assert.equal(row.raw_llm_output, 'raw attempt 2 output');
  assert.ok(row.created_at);
});

test('buildMissingRequiredSquaresRow tolerates a missing attempt1 (defensive null-safety)', () => {
  const row = buildMissingRequiredSquaresRow({
    positionHash: 'hash-abc', movestring: '3325', col: 5, endpoint: '/api/explain-move-llm',
    prompt: 'p', raw: 'r', mechanism: 'm', attempt1: undefined, missingHandles: [],
  });
  assert.equal(row.attempt1_raw_llm_output, null);
  assert.equal(row.attempt1_mechanism, null);
  assert.deepEqual(row.missing_handles, []);
});

test('buildTerminalFailureRow (existing terminal-failure path) writes only the original columns — unaffected by the new two-attempt columns', () => {
  const row = buildTerminalFailureRow({
    positionHash: 'hash-xyz',
    movestring: '3325',
    col: 5,
    endpoint: '/api/explain-move-llm',
    prompt: 'the prompt',
    raw: 'the raw output',
    failureReason: 'network boom',
  });

  assert.deepEqual(new Set(Object.keys(row)), new Set([
    'position_hash', 'movestring', 'col', 'endpoint', 'llm_prompt', 'raw_llm_output',
    'failure_reason', 'created_at',
  ]));
  assert.equal(row.raw_llm_output, 'the raw output');
  assert.equal(row.failure_reason, 'network boom');
  assert.equal(row.position_hash, 'hash-xyz');

  // None of the new two-attempt columns leak into the terminal-failure row shape.
  for (const newCol of ['attempt1_raw_llm_output', 'attempt1_mechanism', 'attempt2_raw_llm_output', 'attempt2_mechanism', 'missing_handles', 'served_attempt']) {
    assert.ok(!(newCol in row), `terminal-failure row must not carry ${newCol}`);
  }
});

test('buildTerminalFailureRow reports the parseError/callError/"empty mechanism" reasons verbatim (unchanged contract)', () => {
  for (const reason of ['some call error', 'some parse error', 'empty mechanism']) {
    const row = buildTerminalFailureRow({
      positionHash: 'h', movestring: '3325', col: 5, endpoint: '/api/explain-move-llm',
      prompt: 'p', raw: 'r', failureReason: reason,
    });
    assert.equal(row.failure_reason, reason);
  }
});
