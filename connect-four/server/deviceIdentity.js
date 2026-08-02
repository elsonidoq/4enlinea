// Pure device-identity resolution for anonymous writes (spec 054 / D1, FR-001, FR-002).
// server/index.js is not HTTP-harness-testable (the Express app is not exported),
// so the branch logic lives here and is unit-tested; index.js only wires it — same
// pattern as anonBlunderAccess.js.

import { randomUUID } from 'crypto';
import { cookieOpts, REFRESH_TOKEN_MAX_AGE } from './cookieConfig.js';

// FR-003 audit finding (tasks.md T009 / T008): the real no-deviceUuid callers of the
// two sites this module fixes are:
//   - ChallengeScreen.jsx:511 → POST /api/puzzles/:id/check. Sends no deviceUuid body
//     field today and, per spec Decision 2, is NOT modified to start sending one — it
//     permanently relies on this module minting/reading the dc4_device_uuid cookie.
//   - GameScreen.jsx:60-77 → POST /api/games. Already sends `profile.device_uuid`
//     (IndexedDBStore's real per-client UUID) whenever store.getProfile() succeeds;
//     only its `''` fallback (getProfile() throws) falls through to this module.
// POST /api/puzzles/:id/sequence/move (server/index.js ~2558-2625) was audited and
// confirmed to never write puzzle_attempts or reference device_uuid at all — it has
// no device-identifier write to fix, so it is out of scope for this module (T008).
// SupabaseStore.recordPuzzleAttempt → POST /api/user/puzzle-attempts
// (server/userRoutes.js:343-344) opens with `if (!requireUser(req, res)) return;` —
// confirmed always-authenticated, so it never reaches an anonymous fallback and is
// out of scope for this module too.

/**
 * Resolve a stable, reproducible device identifier for an anonymous write.
 * Order: caller-supplied bodyValue → existing dc4_device_uuid cookie → freshly
 * minted crypto.randomUUID(), cookied for next time. Never throws, never 400s —
 * always returns a usable identifier.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {string|undefined|null} bodyValue
 * @returns {string}
 */
export function resolveDeviceUuid(req, res, bodyValue) {
  if (bodyValue) return bodyValue;

  const cookieValue = req.cookies?.dc4_device_uuid;
  if (cookieValue) return cookieValue;

  const minted = randomUUID();
  res.cookie('dc4_device_uuid', minted, { ...cookieOpts(), maxAge: REFRESH_TOKEN_MAX_AGE });
  return minted;
}
