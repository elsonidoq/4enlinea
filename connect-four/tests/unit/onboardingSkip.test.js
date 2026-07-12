// Epic 8 — Onboarding Experience, US4 (T042).
//
// Tests the pure factory extracted into src/lib/onboardingSkip.js. Neither
// GameScreen.jsx's nor OnboardingImportOfferScreen.jsx's actual skip button
// is rendered here — `node --test` (this repo's test runner) cannot parse
// JSX (see onboardingRouting.test.js's header for the same documented
// constraint). This test exercises the exact handler both screens wire to
// their skip control, covering T042:
//   tapping skip (from either screen) sets onboarding_status to 'skipped'
//   and routes to 'home' — and, by construction (skipped !== 'seen'), never
//   triggers the Home-fallback import-offer check
//   (shouldShowHomeFallbackOffer from onboardingOfferMarker.js).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createOnboardingSkipHandler } from '../../src/lib/onboardingSkip.js';
import { shouldShowHomeFallbackOffer } from '../../src/lib/onboardingOfferMarker.js';

describe('createOnboardingSkipHandler', () => {
  it('sets onboarding_status to skipped, fires onboarding_skipped, and routes to home', async () => {
    const updateProfileCalls = [];
    const trackCalls = [];
    const goCalls = [];

    const skip = createOnboardingSkipHandler({
      updateProfile: (patch) => { updateProfileCalls.push(patch); return Promise.resolve(); },
      track: (event, data) => trackCalls.push({ event, data }),
      go: (screenKey, params) => goCalls.push({ screenKey, params }),
    });

    skip();
    // updateProfile is invoked fire-and-forget via a microtask chain inside
    // the handler; flush microtasks before asserting the call landed.
    await Promise.resolve();
    await Promise.resolve();

    assert.deepEqual(updateProfileCalls, [{ onboarding_status: 'skipped' }]);
    assert.deepEqual(trackCalls, [{ event: 'onboarding_skipped', data: {} }]);
    assert.deepEqual(goCalls, [{ screenKey: 'home', params: undefined }]);
  });

  it('routes to home synchronously — does not wait on updateProfile to resolve', () => {
    const goCalls = [];
    const skip = createOnboardingSkipHandler({
      updateProfile: () => new Promise(() => {}), // never resolves
      track: () => {},
      go: (screenKey) => goCalls.push(screenKey),
    });

    skip();
    assert.deepEqual(goCalls, ['home']);
  });

  it('swallows a rejected updateProfile without throwing (fire-and-forget posture, Constitution V)', async () => {
    const skip = createOnboardingSkipHandler({
      updateProfile: () => Promise.reject(new Error('network down')),
      track: () => {},
      go: () => {},
    });

    assert.doesNotThrow(() => skip());
    // allow the rejection's .catch to run without an unhandled-rejection
    // warning/failure
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it('skipped status never satisfies the Home-fallback import-offer check (bypass by construction)', () => {
    // A skipped session's onboarding_status is 'skipped', never 'seen' — the
    // fallback check (onboardingOfferMarker.js) requires 'seen' regardless of
    // the marker state, so skip is guaranteed to bypass it without any
    // separate bypass logic in the skip handler itself.
    assert.equal(
      shouldShowHomeFallbackOffer({ onboardingStatus: 'skipped', offerShown: false }),
      false,
    );
    assert.equal(
      shouldShowHomeFallbackOffer({ onboardingStatus: 'skipped', offerShown: true }),
      false,
    );
  });
});
