// Validation guard for GET /api/user/tts/deep-reveal's `moveString` query
// param — extracted per testing-conventions.md's Pure Function Extraction
// Pattern (server/index.js has no HTTP-level test harness) so the route's
// actual validation logic can be imported and regression-tested directly,
// not re-implemented in a test file.
//
// Delegates to the shared `validateMoves` (server/validateMoves.mjs), the
// SAME movestring validator `POST /api/explain-move-llm` already uses
// correctly (`typeof movestring !== 'string' || !MOVES_RE.test(movestring)`).
// Fixes OI-23 / FR-017: the pre-fix inline check in the deep-reveal route was
// `if (!moveString || !/^[0-6]{0,42}$/.test(moveString))` — `!moveString` is
// true for the empty string (JS falsy), so the empty opening-move movestring
// was rejected as "missing" even though the regex itself (`{0,42}`) matches
// it. `isValidDeepRevealMoveString('')` returns true.
import { validateMoves } from './validateMoves.mjs';

export function isValidDeepRevealMoveString(moveString) {
  return validateMoves(moveString) === null;
}
