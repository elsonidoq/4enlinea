// Spec 045 US3 (T030) — bounded-wait poll state machine for the post-Checkout
// return flow. Verifies the idle/polling/activated/timeout transitions and the
// [0,2,4,7,10]s schedule via an injected fake sleepFn (no real timers).
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { runCheckoutPoll, POLL_SCHEDULE_SECONDS } from '../../src/lib/checkoutReturnFlow.js';

function fakeSleep(calls) {
  return async (ms) => { calls.push(ms); };
}

test('POLL_SCHEDULE_SECONDS is the spec-mandated [0,2,4,7,10]', () => {
  assert.deepEqual(POLL_SCHEDULE_SECONDS, [0, 2, 4, 7, 10]);
});

test('resolves "activated" as soon as checkPaid() returns true, without exhausting the schedule', async () => {
  const states = [];
  const sleeps = [];
  let calls = 0;
  const checkPaid = async () => {
    calls += 1;
    return calls === 2; // paid on the 2nd attempt (after the first 2s wait)
  };

  const result = await runCheckoutPoll({ checkPaid, onState: (s) => states.push(s), sleepFn: fakeSleep(sleeps) });

  assert.equal(result, 'activated');
  assert.deepEqual(states, ['polling', 'activated']);
  assert.equal(calls, 2);
  // Only the wait before the 2nd attempt (2s) was consumed.
  assert.deepEqual(sleeps, [2000]);
});

test('resolves "timeout" after exhausting all 5 attempts, sleeping the correct deltas', async () => {
  const states = [];
  const sleeps = [];
  let calls = 0;
  const checkPaid = async () => { calls += 1; return false; };

  const result = await runCheckoutPoll({ checkPaid, onState: (s) => states.push(s), sleepFn: fakeSleep(sleeps) });

  assert.equal(result, 'timeout');
  assert.deepEqual(states, ['polling', 'timeout']);
  assert.equal(calls, 5);
  // Deltas between [0,2,4,7,10] => wait 0 (no sleep call), then 2s, 2s, 3s, 3s.
  assert.deepEqual(sleeps, [2000, 2000, 3000, 3000]);
});

test('first attempt fires immediately with no sleep beforehand', async () => {
  const sleeps = [];
  let calls = 0;
  const checkPaid = async () => { calls += 1; return true; };

  const result = await runCheckoutPoll({ checkPaid, sleepFn: fakeSleep(sleeps) });

  assert.equal(result, 'activated');
  assert.equal(calls, 1);
  assert.deepEqual(sleeps, []);
});

test('a custom schedule is honored (manual-refresh re-run uses the same schedule shape)', async () => {
  const sleeps = [];
  let calls = 0;
  const checkPaid = async () => { calls += 1; return false; };

  const result = await runCheckoutPoll({
    checkPaid,
    schedule: [0, 1, 3],
    sleepFn: fakeSleep(sleeps),
  });

  assert.equal(result, 'timeout');
  assert.equal(calls, 3);
  assert.deepEqual(sleeps, [1000, 2000]);
});

test('onState is optional — runCheckoutPoll does not throw without it', async () => {
  const checkPaid = async () => true;
  await assert.doesNotReject(runCheckoutPoll({ checkPaid, sleepFn: fakeSleep([]) }));
});
