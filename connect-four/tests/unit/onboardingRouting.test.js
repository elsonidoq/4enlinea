// Epic 8 — Onboarding Experience, US1 (T019).
//
// Tests the pure decision logic extracted into src/lib/onboardingRouting.js
// (shouldAutoRouteToOnboarding). Navigator's actual effect in App.jsx is NOT
// rendered here — `node --test` (this repo's test runner) cannot parse JSX
// (see src/lib/postLoginReturn.js's test file header for the same documented
// constraint). This test exercises the exact boolean decision the effect
// consumes before calling go('game', ONBOARDING_GAME_PARAMS) +
// track('onboarding_started', ...), covering the three scenarios T019
// specifies:
//   (a) sessionChecked=true, session=null, onboardingStatus='not_encountered'
//       => true (the effect would fire go(...) exactly once)
//   (b) sessionChecked=true, session={...} => false (never fires for a
//       signed-in user — settled decision B3/D1)
//   (c) sessionChecked=false => false (Navigator renders only the boot-gate
//       frame; ScreenComponent, and therefore any effect touching it, never
//       runs while sessionChecked is false)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { shouldAutoRouteToOnboarding, ONBOARDING_GAME_PARAMS } from '../../src/lib/onboardingRouting.js';

describe('shouldAutoRouteToOnboarding', () => {
  it('fires for a confirmed-anonymous first-time visitor (not_encountered)', () => {
    assert.equal(
      shouldAutoRouteToOnboarding({ sessionChecked: true, session: null, onboardingStatus: 'not_encountered' }),
      true,
    );
  });

  it('treats null/undefined onboardingStatus identically to not_encountered', () => {
    assert.equal(
      shouldAutoRouteToOnboarding({ sessionChecked: true, session: null, onboardingStatus: null }),
      true,
    );
    assert.equal(
      shouldAutoRouteToOnboarding({ sessionChecked: true, session: null, onboardingStatus: undefined }),
      true,
    );
  });

  it('does NOT fire once onboarding_status is seen or skipped (SC-002: never repeats)', () => {
    assert.equal(
      shouldAutoRouteToOnboarding({ sessionChecked: true, session: null, onboardingStatus: 'seen' }),
      false,
    );
    assert.equal(
      shouldAutoRouteToOnboarding({ sessionChecked: true, session: null, onboardingStatus: 'skipped' }),
      false,
    );
  });

  it('does NOT fire for a signed-in user, even if not_encountered (settled decision B3/D1, anonymous-only)', () => {
    assert.equal(
      shouldAutoRouteToOnboarding({
        sessionChecked: true,
        session: { user: { id: 'abc' } },
        onboardingStatus: 'not_encountered',
      }),
      false,
    );
  });

  it('does NOT fire while sessionChecked is false, regardless of session/status (FR-014 race guard)', () => {
    assert.equal(
      shouldAutoRouteToOnboarding({ sessionChecked: false, session: null, onboardingStatus: 'not_encountered' }),
      false,
    );
    assert.equal(
      shouldAutoRouteToOnboarding({ sessionChecked: false, session: { user: {} }, onboardingStatus: null }),
      false,
    );
  });

  it('ONBOARDING_GAME_PARAMS matches the spec-mandated route (Easy difficulty, first side, onboarding flag)', () => {
    assert.deepEqual(ONBOARDING_GAME_PARAMS, { difficulty: 'easy', side: 'first', onboarding: true });
  });
});
