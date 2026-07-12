// Epic 8 — Onboarding Experience, US3 (T035).
//
// Tests the pure decision extracted into src/lib/onboardingGameEnd.js. GameScreen.jsx's actual
// saveGame() is NOT rendered here — `node --test` (this repo's test runner) cannot parse JSX
// (see onboardingRouting.test.js's header for the same documented constraint). This test
// exercises the exact branch saveGame() consumes before calling
// goReplace(pickGameEndScreen(onboarding), { id: gameId }), covering T035's two scenarios:
//   (a) an onboarding session's game-end via each of win/loss/draw/resign routes to
//       'onboardingImportOffer', never 'review'
//   (b) a non-onboarding session's game-end is unaffected — still 'review'
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { pickGameEndScreen } from '../../src/lib/onboardingGameEnd.js';

describe('pickGameEndScreen', () => {
  it('routes an onboarding session to onboardingImportOffer for every outcome (win/loss/draw/resign)', () => {
    // saveGame() is the SAME call site for every outcome — win/loss/draw via the normal flow,
    // resign via handleResign()'s existing onGameEnd?.(...) call into that same seam
    // (research.md R5) — so the branch only needs the `onboarding` flag, not the outcome.
    for (const outcome of ['win', 'loss', 'draw', 'resign']) {
      assert.equal(pickGameEndScreen(true), 'onboardingImportOffer', `outcome=${outcome}`);
    }
  });

  it('never routes an onboarding session to review', () => {
    assert.notEqual(pickGameEndScreen(true), 'review');
  });

  it('a non-onboarding session game-end is unaffected — still routes to review', () => {
    for (const outcome of ['win', 'loss', 'draw', 'resign']) {
      assert.equal(pickGameEndScreen(false), 'review', `outcome=${outcome}`);
    }
  });
});
