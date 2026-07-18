// DISPOSITION (spec 050 T002/T025): kept, edited in place — this file tests
// pure vendor-agnostic state-store logic (no payment-provider-specific types
// or calls). Spec 050 US2 (Research §4/§11): the pre-migration bounded-wait
// poll state machine ([0,2,4,7,10]s schedule) is collapsed to single-check
// states, since the Paddle.js overlay model has no return-URL round-trip to
// poll against — `checkout.completed` already tells the client synchronously
// that payment succeeded.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  getCheckoutReturnState,
  setCheckoutReturnState,
  subscribeCheckoutReturn,
  resetCheckoutReturnState,
} from '../../src/lib/checkoutReturnFlow.js';

test('starts at "idle"', () => {
  resetCheckoutReturnState();
  assert.equal(getCheckoutReturnState(), 'idle');
});

test('setCheckoutReturnState updates the current state', () => {
  resetCheckoutReturnState();
  setCheckoutReturnState('confirming');
  assert.equal(getCheckoutReturnState(), 'confirming');
  setCheckoutReturnState('activated');
  assert.equal(getCheckoutReturnState(), 'activated');
});

test('subscribeCheckoutReturn notifies subscribers of every state change, in order', () => {
  resetCheckoutReturnState();
  const seen = [];
  const unsubscribe = subscribeCheckoutReturn((s) => seen.push(s));

  setCheckoutReturnState('confirming');
  setCheckoutReturnState('activated');

  assert.deepEqual(seen, ['confirming', 'activated']);
  unsubscribe();
});

test('unsubscribe stops further notifications', () => {
  resetCheckoutReturnState();
  const seen = [];
  const unsubscribe = subscribeCheckoutReturn((s) => seen.push(s));
  setCheckoutReturnState('confirming');
  unsubscribe();
  setCheckoutReturnState('failed');

  assert.deepEqual(seen, ['confirming']);
});

test('a failed confirmation lands on "failed", not silently on "idle" (never a silent free-tier render)', () => {
  resetCheckoutReturnState();
  setCheckoutReturnState('confirming');
  setCheckoutReturnState('failed');
  assert.equal(getCheckoutReturnState(), 'failed');
});

test('resetCheckoutReturnState returns the store to "idle"', () => {
  setCheckoutReturnState('activated');
  resetCheckoutReturnState();
  assert.equal(getCheckoutReturnState(), 'idle');
});
