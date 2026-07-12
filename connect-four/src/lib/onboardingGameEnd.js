// Epic 8 — Onboarding Experience, US3 (T034, research.md R5).
//
// Pure decision for GameScreen.jsx's saveGame() end-of-game routing branch. Extracted so the
// branch is unit-testable with plain `node --test` (this repo's test runner cannot parse JSX;
// see onboardingRouting.js's header for the same documented constraint/pattern).
//
// Every end-of-game outcome (win/loss/draw via the normal flow, resign via handleResign()'s
// existing onGameEnd?.(...) call) funnels through saveGame() and therefore through this single
// branch point — no separate resign-path handling is needed; the branch only ever needs the
// `onboarding` flag, not the outcome.

/**
 * @param {boolean} onboarding
 * @returns {'onboardingImportOffer' | 'review'}
 */
export function pickGameEndScreen(onboarding) {
  return onboarding ? 'onboardingImportOffer' : 'review';
}
