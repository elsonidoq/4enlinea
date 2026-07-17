// Epic 8 — Onboarding Experience, US4 (T041, FR-009).
//
// Pure, store-agnostic factory for the "skip onboarding" action, used by both
// GameScreen.jsx (skip control alongside Hint/Resign) and
// OnboardingImportOfferScreen.jsx (skip control alongside Accept/Decline).
// Extracted so the exact skip semantics are unit-testable with plain
// `node --test` — this repo's test runner cannot parse JSX (see
// onboardingRouting.js's header for the same documented constraint/pattern).
//
// Skip semantics (FR-009, settled decision — do not reopen): sets
// onboarding_status to 'skipped' (fire-and-forget, errors swallowed —
// Constitution V never blocks the render the user is watching), fires
// `track('onboarding_skipped', ...)`, and routes directly to 'home'. Because
// 'skipped' is never 'seen', this is guaranteed to bypass the Home-fallback
// import-offer check (onboardingOfferMarker.js's shouldShowHomeFallbackOffer)
// by construction — no separate bypass logic is needed here.

/**
 * @param {{
 *   updateProfile: (patch: object) => Promise<any>,
 *   track: (event: string, data?: object) => void,
 *   go: (screenKey: string, params?: object) => void,
 * }} args
 * @returns {() => void} call on skip-control tap.
 */
export function createOnboardingSkipHandler({ updateProfile, track, go }) {
  return function handleOnboardingSkip() {
    Promise.resolve()
      .then(() => updateProfile({ onboarding_status: 'skipped' }))
      .catch(() => {});
    track('onboarding_skipped', {});
    go('home');
  };
}
