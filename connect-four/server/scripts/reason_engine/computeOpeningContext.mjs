// ── Shared opening-context derivation (opening-theory PART B, Decision D4) ──
//
// SINGLE SOURCE OF TRUTH for the four-guard opening-provenance logic. Both consumers derive their
// opening reason from THIS function so they can never silently diverge:
//   - the OFFLINE reason vector (reasonEngine.mjs `computeReason` -> `out.openingContext`)
//   - the PRODUCTION deep-reveal prompt (explainContext.js `buildOpeningReason`, which adds the
//     grounded prompt-section TEXT on top of this pure derivation)
//
// IMPORT-CLEAN / SOLVER-FREE: this module imports ONLY the pure KB prefix matcher and the pure
// centrality detector. It MUST NOT import reasonEngine.mjs (or anything that runs loadEnv /
// createSolverProcess at import time) — that top-level side effect is exactly why this logic had to
// be extracted so the production module can import it. No new solver query happens here: the caller
// passes the scores/bestScore it already has (I0).
//
// Emits EITHER a `namedOpening` (all four guards hold) OR a `centrality` fallback (opening phase,
// better move strictly more central) — NEVER both (mutually exclusive: namedOpening short-circuits).
// Returns `undefined` when neither applies.
//
// The four namedOpening guards (ALL required):
//   1. `matchOpeningPrefix(movestring)` is non-null (the moves so far are a mirror-normalized prefix
//      of a KB book line).
//   2. The blundering player is the line's BENEFICIARY. Every KB opening line is a first-player win
//      (beneficiary 1; see openingMatch.loadOpeningLines), so this is `player === 1`.
//   3. `bookNextCol` is SOLVER-VERIFIED best at this node: its score equals the max (bestScore) AND
//      the position is winning (bestScore > 0). A null `bookNextCol` (KB lines disagree / no
//      continuation) or a book move whose score is below the max fails this guard -> no false "best"
//      claim (I2), fall through to centrality. (Score-equality — not `bookNextCol === bestCol` — is
//      used so a book move that ties the max is still credited when the engine's argmax picked a
//      different equally-optimal column.)
//   4. `id` names a SPECIFIC opening only when the match is consistent with a single KB id; a shared
//      prefix (multiple ids) keeps `id: null` and reports the shared `family`.

import { matchOpeningPrefix } from './openingMatch.mjs';
import { detectCenterDominance } from '../../centerDominance.js';

/**
 * @param {object} args
 * @param {string} args.movestring  pre-move movestring (0-indexed columns)
 * @param {number} args.playedCol   0-indexed column actually played (the blunder)
 * @param {number} args.bestCol     0-indexed better column (a max-score legal column)
 * @param {number} args.bestScore   the max legal score at this node
 * @param {number[]} args.scores    per-column solver scores at this node
 * @param {number} args.player      1 or 2 — the player to move (the blundering player)
 * @returns {{ namedOpening: {id,family,matchedPrefixLen,bookNextCol} }
 *          | { centrality: {bestCol,playedCol,betterHasMoreLines,text} }
 *          | undefined }
 */
export function computeOpeningContext({ movestring, playedCol, bestCol, bestScore, scores, player }) {
  const match = matchOpeningPrefix(movestring);
  if (match) {
    const beneficiaryIsPlayer = player === 1;                                   // guard 2
    const bookBest = match.bookNextCol != null
      && bestScore > 0
      && scores[match.bookNextCol] === bestScore;                              // guard 3
    if (beneficiaryIsPlayer && bookBest) {
      const id = match.ids.length === 1 ? match.ids[0] : null;                 // guard 4
      return {
        namedOpening: {
          id,
          family: match.family,
          matchedPrefixLen: match.matchedPrefixLen,
          bookNextCol: match.bookNextCol,
        },
      };
    }
  }
  // Off-book (or on-book-but-guards-failed) opening-phase fallback: the honest board-findable reason
  // is centrality. detectCenterDominance (I8 reuse) confines this to early boards where the better
  // move is strictly more central; it returns null otherwise -> openingContext absent.
  const cd = detectCenterDominance({ movestring, playedCol, bestCol });
  if (cd) {
    return {
      centrality: {
        bestCol: cd.bestCol,
        playedCol: cd.playedCol,
        betterHasMoreLines: true,
        text: cd.reason,
      },
    };
  }
  return undefined;
}
