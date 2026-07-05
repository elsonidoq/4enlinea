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
// Emits EXACTLY ONE of three mutually-exclusive modes, or `undefined`:
//   - `namedOpening` (all four guards hold; player 1 threw away a known win)
//   - `defense` (D32, NEW): player 2 on an on-book prefix whose beneficiary is player 1, playing a
//     move that loses FASTER than the solver's least-bad reply (`case === 'lose_to_faster_lose'`).
//     The "best defense" is the solver's least-bad legal move (`bestCol`) — NOT a book continuation,
//     because the book line is a first-player win and there is no book move for the losing side to
//     follow. `centralityGrounded` is a conditional, honest note (via `detectCenterDominance`) on
//     whether that best defense is also strictly more central than the played move.
//   - `centrality` (fallback; off-book, or on-book-but-no-real-match/no-realized-mode). Reused
//     verbatim for BOTH winning and losing movers — it is NOT suppressed for a losing mover (dropped
//     "suppress centrality when losing" idea): central play is genuinely good regardless of who is
//     ahead. `resistAndWait` (NEW) is carried for the prompt layer: true iff the mover is player 2 and
//     already losing (`bestScore < 0`), signalling "hold the center and wait for the opponent to slip"
//     rather than "this move wins."
// Returns `undefined` when none applies.
//
// The four namedOpening guards (ALL required):
//   1. `matchOpeningPrefix(movestring)` is non-null (the moves so far are a mirror-normalized prefix
//      of a KB book line) AND `match.family` is non-null (equivalently `matchedPrefixLen > 0`) — a
//      REAL match. On the empty board (movestring === ''), every KB line trivially matches across
//      BOTH families, so `matchOpeningPrefix` returns `family: null` as its own "no real match yet"
//      signal; without this guard a vacuous 0-ply match would render as the literal label "a null"
//      downstream (explainContext.js buildOpeningReason) and falsely claim book provenance for a
//      position where no move has been played (glossary invariant: family always present when
//      namedOpening is present). A real opening prefix (matchedPrefixLen >= its first ply) always has
//      family non-null, so this guard can never wrongly suppress a legitimate named opening.
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
 *          | { defense: {id,family,matchedPrefixLen,bestDefenseCol,centralityGrounded} }
 *          | { centrality: {bestCol,playedCol,betterHasMoreLines,text,resistAndWait} }
 *          | undefined }
 */
export function computeOpeningContext({ movestring, playedCol, bestCol, bestScore, scores, player }) {
  const match = matchOpeningPrefix(movestring);
  const realMatch = match && match.family != null;                    // guard 1b (see header)

  if (realMatch) {
    // ── namedOpening: player 1 threw away a known win (UNCHANGED) ──
    const beneficiaryIsPlayer = player === 1;                         // guard 2
    const bookBest = match.bookNextCol != null
      && bestScore > 0
      && scores[match.bookNextCol] === bestScore;                     // guard 3 (score-equality, D31)
    if (beneficiaryIsPlayer && bookBest) {
      const id = match.ids.length === 1 ? match.ids[0] : null;        // guard 4
      return {
        namedOpening: {
          id, family: match.family,
          matchedPrefixLen: match.matchedPrefixLen,
          bookNextCol: match.bookNextCol,
        },
      };
    }

    // ── defense: player 2 abandoned the defensive hold on a known first-player win (NEW, D32) ──
    // Fires at ALL depths (gated on the on-book prefix, not a disc cap). The book line is a
    // first-player win, so player 2 is theoretically lost; the "most resilient defense" is the
    // solver's least-bad legal move (bestCol) — NOT the book's next column, so no bookNextCol here.
    const playedScore = scores[playedCol];
    const losesFaster = player === 2 && bestScore < 0 && playedScore < bestScore; // === lose_to_faster_lose
    if (losesFaster) {
      const id = match.ids.length === 1 ? match.ids[0] : null;        // guard 4 (same as namedOpening)
      // Centrality is a CONDITIONAL, honest grounding for why bestCol is the more resilient hold:
      // true only when the best defense is strictly more central than the played move (≤6 plies).
      const centralityGrounded = detectCenterDominance({ movestring, playedCol, bestCol }) != null;
      return {
        defense: {
          id, family: match.family,
          matchedPrefixLen: match.matchedPrefixLen,
          bestDefenseCol: bestCol,
          centralityGrounded,
        },
      };
    }
  }

  // ── centrality fallback (off-book, or on-book-but-guards-failed) ──
  // NOT suppressed for a losing mover (owner correction 2026-07-05): central play is genuinely
  // good, and the even rows (2 & 4) favour the second player (KB allen-parity.md). What the losing
  // second player needs is the RESIST-AND-WAIT goal, carried by `resistAndWait` for the prompt.
  const cd = detectCenterDominance({ movestring, playedCol, bestCol });
  if (cd) {
    return {
      centrality: {
        bestCol: cd.bestCol,
        playedCol: cd.playedCol,
        betterHasMoreLines: true,
        text: cd.reason,
        resistAndWait: player === 2 && bestScore < 0,
      },
    };
  }
  return undefined;
}
