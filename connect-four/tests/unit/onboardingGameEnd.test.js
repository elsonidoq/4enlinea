// Epic 8 — Onboarding Experience, US3 (T035).
//
// Tests the pure decision extracted into src/lib/onboardingGameEnd.js. GameScreen.jsx's actual
// saveGame() is NOT rendered here — `node --test` (this repo's test runner) cannot parse JSX
// (see onboardingRouting.test.js's header for the same documented constraint). This test
// exercises the exact branch saveGame() consumes before calling
// goReplace(pickGameEndScreen(onboarding), { id: gameId, onboarding }).
//
// Feature 2: onboarding game-end now routes through the post-game review screen (so the user
// sees their mistakes) before advancing to the import offer — review's own onboarding-only
// "Continue" CTA calls go('onboardingImportOffer'). So pickGameEndScreen returns 'review' for
// BOTH onboarding and non-onboarding sessions; it no longer branches to 'onboardingImportOffer'.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { pickGameEndScreen } from '../../src/lib/onboardingGameEnd.js';

describe('pickGameEndScreen', () => {
  it('routes an onboarding session to review for every outcome (win/loss/draw/resign)', () => {
    // Feature 2: onboarding now goes through the post-game review (see mistakes) before the
    // import offer. saveGame() is the SAME call site for every outcome, so the branch only
    // needs the `onboarding` flag, not the outcome.
    for (const outcome of ['win', 'loss', 'draw', 'resign']) {
      assert.equal(pickGameEndScreen(true), 'review', `outcome=${outcome}`);
    }
  });

  it('a non-onboarding session game-end also routes to review', () => {
    for (const outcome of ['win', 'loss', 'draw', 'resign']) {
      assert.equal(pickGameEndScreen(false), 'review', `outcome=${outcome}`);
    }
  });

  it('never routes to onboardingImportOffer directly (review advances there instead)', () => {
    assert.notEqual(pickGameEndScreen(true), 'onboardingImportOffer');
  });
});
