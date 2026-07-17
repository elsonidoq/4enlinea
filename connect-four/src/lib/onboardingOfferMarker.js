// Epic 8 — Onboarding Experience, US3 (T032/T036, data-model.md "Storage location 1").
//
// The one-time Home-fallback marker `onboarding_offer_shown_v1` is a plain, device-scoped
// localStorage boolean — NOT part of the profile record, NOT synced to the server (FR-013
// spirit). Single-write-site invariant: `OnboardingImportOfferScreen.jsx`'s own mount is the
// ONLY place that calls `setOfferShownMarker()` (covers both the game-end path, T034, and the
// Home-fallback path, T036 — both routes land on that screen). `HomeScreen.jsx`'s fallback check
// (T036) only ever calls `isOfferShownMarkerSet()` — it is read-only and must never write the
// marker itself; this is what makes the cross-path guard (T050) hold: whichever path reaches the
// offer screen first sets the marker, so the other path's later check sees it already set.
//
// Extracted as a plain module (not inlined in the screens) so the marker + the pure decision
// function below are unit-testable with plain `node --test` (same JSX-import constraint
// documented in postLoginReturn.js / onboardingRouting.js).

export const OFFER_SHOWN_MARKER_KEY = 'onboarding_offer_shown_v1';

/** Read the one-time marker. Never throws (private-browsing / storage-disabled safe). */
export function isOfferShownMarkerSet() {
  try {
    return globalThis.localStorage?.getItem(OFFER_SHOWN_MARKER_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Write the one-time marker. SINGLE call site in the app:
 * OnboardingImportOfferScreen's own mount (T032). Never throws.
 */
export function setOfferShownMarker() {
  try {
    globalThis.localStorage?.setItem(OFFER_SHOWN_MARKER_KEY, '1');
  } catch {
    // ignore — private-browsing/storage-disabled; worst case the offer can show again
  }
}

/**
 * Read-only decision for HomeScreen's mount fallback check (T036/FR-007 Scenario 5).
 * `skipped`/`not_encountered` never trigger it — only 'seen' + marker-unset does.
 *
 * @param {{ onboardingStatus: string|null|undefined, offerShown: boolean }} args
 * @returns {boolean}
 */
export function shouldShowHomeFallbackOffer({ onboardingStatus, offerShown }) {
  return onboardingStatus === 'seen' && !offerShown;
}
