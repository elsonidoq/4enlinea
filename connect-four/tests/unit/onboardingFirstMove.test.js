// Epic 8 — Onboarding Experience, US2 (T028, research.md R5).
//
// Tests the pure gate factory `createOnboardingSeenGate` extracted into
// src/lib/onboardingFirstMove.js. GameScreen.jsx's actual column-click
// wrapper is NOT rendered here — `node --test` (this repo's test runner)
// cannot parse JSX (see onboardingRouting.test.js's header for the same
// documented constraint). This test exercises the exact one-shot gate
// GameScreen calls on every human move before delegating to
// useGameBoard's handleColumnClick, covering T028's three scenarios:
//   (a) the first move in an onboarding=true session triggers exactly one
//       updateProfile({onboarding_status:'seen'}) call
//   (b) subsequent moves in the same session do not re-trigger it
//   (c) a non-onboarding (onboarding=false) session never calls it
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createOnboardingSeenGate } from '../../src/lib/onboardingFirstMove.js';

describe('createOnboardingSeenGate', () => {
  it('fires updateProfile({onboarding_status:"seen"}) exactly once on the first move of an onboarding session', async () => {
    const calls = [];
    const gate = createOnboardingSeenGate({
      onboarding: true,
      updateProfile: (patch) => { calls.push(patch); return Promise.resolve(); },
    });

    const firedFirst = gate();
    // updateProfile is invoked fire-and-forget via a microtask chain inside
    // the gate; flush microtasks before asserting the call landed.
    await Promise.resolve();
    await Promise.resolve();

    assert.equal(firedFirst, true);
    assert.deepEqual(calls, [{ onboarding_status: 'seen' }]);
  });

  it('does NOT re-trigger on subsequent moves in the same onboarding session', async () => {
    const calls = [];
    const gate = createOnboardingSeenGate({
      onboarding: true,
      updateProfile: (patch) => { calls.push(patch); return Promise.resolve(); },
    });

    gate(); // move 1 — fires
    const firedSecond = gate(); // move 2 — must not fire
    const firedThird = gate(); // move 3 — must not fire
    await Promise.resolve();
    await Promise.resolve();

    assert.equal(firedSecond, false);
    assert.equal(firedThird, false);
    assert.equal(calls.length, 1, 'updateProfile must be called exactly once across the whole session');
  });

  it('never calls updateProfile in a non-onboarding session', async () => {
    const calls = [];
    const gate = createOnboardingSeenGate({
      onboarding: false,
      updateProfile: (patch) => { calls.push(patch); return Promise.resolve(); },
    });

    gate();
    gate();
    gate();
    await Promise.resolve();
    await Promise.resolve();

    assert.equal(calls.length, 0);
  });

  it('swallows a rejected updateProfile without throwing (fire-and-forget posture, Constitution V)', async () => {
    const gate = createOnboardingSeenGate({
      onboarding: true,
      updateProfile: () => Promise.reject(new Error('network down')),
    });

    assert.doesNotThrow(() => gate());
    // allow the rejection's .catch to run without an unhandled-rejection
    // warning/failure
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
});
