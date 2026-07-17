// Epic 8 — Onboarding Experience, US3 (T037, T050).
//
// Tests the marker read/write + pure decision logic in src/lib/onboardingOfferMarker.js.
// HomeScreen.jsx's actual mount effect and OnboardingImportOfferScreen.jsx's actual mount write
// are NOT rendered here — `node --test` (this repo's test runner) cannot parse JSX (see
// postLoginReturn.test.js's header for the same documented constraint/localStorage-stub
// pattern, adapted here from sessionStorage to localStorage).
//
// T037: Home-fallback fires exactly once when onboarding_status === 'seen' and the marker is
// unset; a second Home mount with the marker now set (by the offer screen's own mount, T032)
// does not re-trigger it; skipped/not_encountered never trigger it.
//
// T050: cross-path regression (B2) — simulate the game-end path (an onboarding game ending
// routes to onboardingImportOffer per T034, and per T032 that screen's mount writes the marker),
// then assert a later HomeScreen mount with onboarding_status === 'seen' does NOT re-route —
// i.e. the marker is a single cross-path guard, not scoped to the Home-fallback branch alone.
// Distinct from T037, which only exercises the Home-fallback path in isolation.
import { test } from 'node:test';
import assert from 'node:assert/strict';

function installLocalStorageStub() {
  let store = new Map();
  globalThis.localStorage = {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
  return () => store.clear();
}

const resetStorage = installLocalStorageStub();

const {
  isOfferShownMarkerSet,
  setOfferShownMarker,
  shouldShowHomeFallbackOffer,
  OFFER_SHOWN_MARKER_KEY,
} = await import('../../src/lib/onboardingOfferMarker.js');

test('isOfferShownMarkerSet/setOfferShownMarker round-trip against the real key', () => {
  resetStorage();
  assert.equal(isOfferShownMarkerSet(), false);
  setOfferShownMarker();
  assert.equal(isOfferShownMarkerSet(), true);
  assert.equal(globalThis.localStorage.getItem(OFFER_SHOWN_MARKER_KEY), '1');
});

test('T037 (a): Home-fallback fires exactly once — seen + marker unset => true', () => {
  resetStorage();
  assert.equal(
    shouldShowHomeFallbackOffer({ onboardingStatus: 'seen', offerShown: isOfferShownMarkerSet() }),
    true,
  );
});

test('T037 (b): a second Home mount after the marker is set (by the offer screen) does not re-trigger', () => {
  resetStorage();
  // First Home mount: fallback fires and routes to the offer screen, whose own mount (T032)
  // writes the marker.
  assert.equal(
    shouldShowHomeFallbackOffer({ onboardingStatus: 'seen', offerShown: isOfferShownMarkerSet() }),
    true,
  );
  setOfferShownMarker();
  // Second Home mount: marker is now set.
  assert.equal(
    shouldShowHomeFallbackOffer({ onboardingStatus: 'seen', offerShown: isOfferShownMarkerSet() }),
    false,
  );
});

test('T037 (c): skipped and not_encountered never trigger the fallback, marker set or not', () => {
  resetStorage();
  assert.equal(shouldShowHomeFallbackOffer({ onboardingStatus: 'skipped', offerShown: false }), false);
  assert.equal(shouldShowHomeFallbackOffer({ onboardingStatus: 'not_encountered', offerShown: false }), false);
  assert.equal(shouldShowHomeFallbackOffer({ onboardingStatus: null, offerShown: false }), false);
  assert.equal(shouldShowHomeFallbackOffer({ onboardingStatus: undefined, offerShown: false }), false);

  setOfferShownMarker();
  assert.equal(
    shouldShowHomeFallbackOffer({ onboardingStatus: 'skipped', offerShown: isOfferShownMarkerSet() }),
    false,
  );
});

test('T050: game-end path setting the marker suppresses a LATER, independent Home-fallback check', () => {
  resetStorage();
  // Simulate the game-end path: an onboarding game ends, saveGame() routes to
  // onboardingImportOffer (T034), and that screen's OWN mount writes the marker (T032) — the
  // single write site, not scoped to the Home-fallback branch.
  setOfferShownMarker();

  // Later, and independently, the user lands on Home with onboarding_status === 'seen'.
  assert.equal(
    shouldShowHomeFallbackOffer({ onboardingStatus: 'seen', offerShown: isOfferShownMarkerSet() }),
    false,
  );
});
