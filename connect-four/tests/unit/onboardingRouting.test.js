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

import { shouldAutoRouteToOnboarding, shouldRouteHomeAfterSignIn, ONBOARDING_GAME_PARAMS } from '../../src/lib/onboardingRouting.js';

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

  // OI-181 (2026-09-09 re-verify): a signed-out DEEP LINK to a gated screen must be honored
  // (the screen renders its own unauthenticated branch) instead of being clobbered by the
  // first-run auto-route. Genuine first-run (landing on '/', i.e. requestedScreen omitted or
  // 'home') must keep auto-routing — that is the entire reason the auto-route exists.
  for (const requestedScreen of ['saga', 'settings', 'stats']) {
    it(`does NOT fire for a signed-out deep link to '${requestedScreen}' (OI-181)`, () => {
      assert.equal(
        shouldAutoRouteToOnboarding({
          sessionChecked: true,
          session: null,
          onboardingStatus: 'not_encountered',
          requestedScreen,
        }),
        false,
      );
    });
  }

  it('still fires for a genuine first-run landing on the app root (OI-181 must not regress first-run)', () => {
    assert.equal(
      shouldAutoRouteToOnboarding({
        sessionChecked: true,
        session: null,
        onboardingStatus: 'not_encountered',
        requestedScreen: 'home',
      }),
      true,
    );
  });

  it('defaults to auto-routing when requestedScreen is absent or unknown (OI-181: never accidentally break first-run)', () => {
    assert.equal(
      shouldAutoRouteToOnboarding({ sessionChecked: true, session: null, onboardingStatus: 'not_encountered' }),
      true,
    );
    assert.equal(
      shouldAutoRouteToOnboarding({
        sessionChecked: true,
        session: null,
        onboardingStatus: 'not_encountered',
        requestedScreen: 'someUnknownScreenKey',
      }),
      true,
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

// 2026-08-23 regression: "I logged out, then when I try to log in, it does not work."
//
// Verified chain: signOut() resets to a fresh IndexedDBStore whose profile row carries no
// onboarding_status (the account's copy lives in Supabase) → the auto-route effect re-fires on
// session→null and lands the user on 'onboardingMission' → signing in from that screen's own
// AuthModal DID succeed (200 + session state set) but nothing routed away from it, because
// App.jsx's [session] effect only navigates when consumeReturnTo() returns a stash. The screen
// was byte-identical before and after a successful sign-in, so sign-in looked broken.
describe('shouldRouteHomeAfterSignIn — never strand a freshly signed-in user on an anonymous-only screen', () => {
  it('routes home when sign-in completes on the anonymous onboarding mission screen', () => {
    assert.equal(shouldRouteHomeAfterSignIn({ screenKey: 'onboardingMission', hasStashedDestination: false }), true);
  });

  it('defers to a stashed post-login destination (FR-013 stays the single consumption point)', () => {
    assert.equal(shouldRouteHomeAfterSignIn({ screenKey: 'onboardingMission', hasStashedDestination: true }), false);
  });

  it('leaves every other screen where it is — signing in from Home/Stats/a game must not navigate', () => {
    for (const screenKey of ['home', 'stats', 'game', 'settings', 'onboardingImportOffer']) {
      assert.equal(shouldRouteHomeAfterSignIn({ screenKey, hasStashedDestination: false }), false, screenKey);
    }
  });
});
