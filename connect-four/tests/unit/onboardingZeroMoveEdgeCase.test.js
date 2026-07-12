// Epic 8 — Onboarding Experience, US4 (T045, spec.md Edge Cases).
//
// Documents/verifies, at the unit level, the zero-move edge case: a game
// closed/abandoned mid-onboarding before the user ever played a move leaves
// onboarding_status at 'not_encountered' — FR-005 only fires the 'seen'
// write on an actual human move via the gate in onboardingFirstMove.js, and
// resign (handleResign in useGameBoard.js) never calls that gate. This is
// NOT a bug: a subsequent app load still auto-routes into onboarding again,
// per shouldAutoRouteToOnboarding in onboardingRouting.js, because
// 'not_encountered' (and null/undefined) both re-trigger the auto-route.
//
// GameScreen.jsx's actual resign flow is not rendered here — `node --test`
// (this repo's test runner) cannot parse JSX (see onboardingRouting.test.js's
// header for the same documented constraint). This test exercises the exact
// two pure decision points that together produce the documented behavior.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createOnboardingSeenGate } from '../../src/lib/onboardingFirstMove.js';
import { shouldAutoRouteToOnboarding } from '../../src/lib/onboardingRouting.js';

describe('zero-move onboarding abandonment (spec.md Edge Cases)', () => {
  it('never writes onboarding_status when the seen gate is never invoked (no move played)', async () => {
    const calls = [];
    // The gate is constructed on GameScreen mount but, in the zero-move
    // scenario, is never called — the user resigns/abandons/the game ends
    // without any handleColumnClickWithOnboarding invocation.
    createOnboardingSeenGate({
      onboarding: true,
      updateProfile: (patch) => { calls.push(patch); return Promise.resolve(); },
    });
    // (intentionally not calling the returned gate function)

    await Promise.resolve();
    await Promise.resolve();

    assert.equal(calls.length, 0, 'no updateProfile call should fire without a move ever being played');
  });

  it('a game ending with zero moves leaves onboarding_status effectively "not_encountered", which still re-triggers the auto-route on the next app load', () => {
    // Simulates: profile.onboarding_status is still 'not_encountered' (default,
    // untouched by the zero-move session) on a later app load.
    const stillRoutes = shouldAutoRouteToOnboarding({
      sessionChecked: true,
      session: null,
      onboardingStatus: 'not_encountered',
    });
    assert.equal(stillRoutes, true, 'a later app load must still auto-route into onboarding — this is expected, not a bug');
  });

  it('null/undefined onboarding_status (equivalent read-site treatment) also still re-triggers the auto-route', () => {
    assert.equal(
      shouldAutoRouteToOnboarding({ sessionChecked: true, session: null, onboardingStatus: null }),
      true,
    );
    assert.equal(
      shouldAutoRouteToOnboarding({ sessionChecked: true, session: null, onboardingStatus: undefined }),
      true,
    );
  });
});
