// Spec 043 US3 (FR-012..FR-016, contracts/post-login-return.md, research.md R3)
//
// Stash/consume the screen a signed-out user was trying to reach before a gated CTA (e.g. Home's
// "Past games" card, Stats' signup prompt) redirected them into the sign-in flow. Sign-in
// (Google OAuth) performs a full-page reload landing on the site root, so the intended
// destination has to survive that reload via sessionStorage rather than in-memory React state.
//
// Single sessionStorage key. Consumption (read+delete) happens from exactly one place in the
// app: Navigator's session-keyed effect in App.jsx (FR-013's "single named consumption point",
// enforced by `rg consumeReturnTo src/` returning exactly one call site outside this module's
// own test file).
//
// Structural note: screenKey validity is checked against the same universe of valid screen keys
// that screenRegistry.jsx's SCREENS is built from — but this module cannot import
// screenRegistry.jsx directly, because that file transitively imports screen .jsx files and
// `node --test` (this repo's test runner) cannot parse JSX. Instead we derive the valid-key set
// from URL_MAP in urlMapping.js, which is already a plain-.js module and already the canonical
// mapping from every URL to its screenKey — every SCREENS key has a corresponding URL_MAP entry.
// This avoids introducing a second, driftable list of screen keys while keeping this module
// (and consumeReturnTo in particular) importable by node:test.
import { URL_MAP } from './urlMapping.js';

const STORAGE_KEY = 'postLoginReturnTo';

const VALID_SCREEN_KEYS = new Set(URL_MAP.map((entry) => entry.screenKey));

/** Stash the screen the user was trying to reach before a sign-in gate interrupted them. */
export function stashReturnTo(screenKey, params = {}) {
  globalThis.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ screenKey, params }));
}

/**
 * Read and clear the stashed destination, if any. Returns null if none was stashed, or if the
 * stashed screenKey is no longer a valid entry in SCREENS.
 */
export function consumeReturnTo() {
  const raw = globalThis.sessionStorage.getItem(STORAGE_KEY);
  if (raw === null) return null;

  globalThis.sessionStorage.removeItem(STORAGE_KEY);

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed.screenKey !== 'string' || !VALID_SCREEN_KEYS.has(parsed.screenKey)) {
    return null;
  }

  return { screenKey: parsed.screenKey, params: parsed.params || {} };
}

/**
 * Clear any stashed destination without consuming it. MUST be called whenever the sign-in
 * prompt (AuthModal) is closed without completing sign-in — dismiss via the backdrop, the
 * "dismiss" button, or (dev-only) the skip-auth button — so a stashed intent never survives past
 * the flow that created it and silently redirects a later, unrelated sign-in.
 */
export function clearReturnTo() {
  globalThis.sessionStorage.removeItem(STORAGE_KEY);
}
