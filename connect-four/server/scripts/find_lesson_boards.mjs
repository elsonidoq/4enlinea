// find_lesson_boards.mjs — DISPOSABLE curation tool (not production code, not in test suite).
// Finds lesson boards by mistake-weighted self-play + structural spec + solver gate.
// See docs/superpowers/plans/2026-07-23-lesson-content-remediation.md (Task 1) for specs' intents.
//
// Usage (from connect-four/):
//   node server/scripts/find_lesson_boards.mjs --help
//   node server/scripts/find_lesson_boards.mjs <spec> [--count 5] [--seed 42] [--games 400]
//   node server/scripts/find_lesson_boards.mjs <spec> --check <movestring>
//     Run <spec> against ONE board instead of searching. Prints MATCH + detail (exit 0) or
//     NO MATCH (exit 1) — use it to re-validate a board already adopted into a lesson.
//
// Every matcher below carries a "Production detector / side" line (spec 052, FR-015): which
// detector in classifier.js it is validating against and for WHICH player, because a matcher and
// its production detector can legitimately model opposite sides of the same pattern (OI-74) —
// and where they diverge for no good reason, that is tracked as OI-85.
import { createSolverProcess } from '../c4solver-wrapper.js';
import { optimalCols } from '../answerSetInvariant.js';
import { playGame } from '../gameSampling.js';
import {
  Board, classifyPattern,
  detectFigure7, detectJShape, detectUndercutBeneficiary,
  detectZThreat, detectClaimeven, detectOddEvenThreat,
} from '../classifier.js';

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Tags already warned about in this run — see the `taughtCols.length === 0` branch.
const warnedUnresolvableTags = new Set();

const legalCols = (scores) => [...Array(7).keys()].filter(c => scores[c] > -1000);
const maxScore  = (scores) => Math.max(...legalCols(scores).map(c => scores[c]));

// --- Refinement 2: owner-not-lost gate -------------------------------------------
// A spec matches a *pattern* (e.g. "Gray owns a z-threat"), but that's not enough --
// if the pattern owner is already dead lost, the board teaches "having the pattern
// didn't matter", which is worse than not teaching it at all (pilot z-threat
// candidate 1 was exactly this).
//
// `pos.scores` are exact minimax values from the SIDE TO MOVE's perspective, so the
// check is symmetric once expressed that way, but the sign flips depending on
// whether the pattern owner IS the side to move:
//   - owner === side to move: their own best legal continuation must not be losing,
//     i.e. maxScore(pos.scores) >= 0.
//   - owner !== side to move (the opponent/mover is on move): maxScore(pos.scores)
//     is the mover's best guaranteed outcome. If it is > 0, the mover has a FORCED
//     WIN against perfect play, which means the owner is dead lost no matter what
//     they do -- reject. So the owner survives only when maxScore(pos.scores) <= 0
//     (mover's best is a draw or a loss for the mover, i.e. a non-losing outcome
//     for the owner).
function ownerNotLost(pos, owner) {
  if (owner === pos.player) return maxScore(pos.scores) >= 0;
  return maxScore(pos.scores) <= 0;
}

// --- Spec 052 / FR-017: solver-optimal gate ---------------------------------------
// Decision 1 (2026-07-30, Option B): a candidate is only useful as lesson material if the column
// the lesson would TEACH is actually the best move on that board. Without this, the finder
// happily returns boards where the taught pattern is present but playing it is a mistake
// (measured before the gate: the z-threat column was in the optimal set in only 25 of 50
// `z_threat_socratic` candidates — OI-63 item 6, now OI-85).
//
// `pos.scores` are exact minimax values from the SIDE TO MOVE's perspective, so "column C is the
// best move" is only a statement about the pattern owner when the owner IS on move. Every gated
// matcher therefore also asserts owner-to-move (`undercut_t2_adjacent`, `z_threat_socratic`,
// `overcut_*` and `fork_socratic_clean` already did; the two z-threat slide specs and
// `same_parity_pair` gained it with the gate).
//
// APPLIED TO: z_threat_gap3, z_threat_stacked, z_threat_socratic, undercut_t2_adjacent,
//   same_parity_pair, fork_socratic_clean, and the generic `tag:` branch.
// NOT APPLIED TO: overcut_active / overcut_shared_cell (deferred pending OI-76 — see their doc
//   comments) and z_threat_gap2 (a deliberate NEGATIVE/counterexample spec: its whole point is a
//   gap-2 column that is NOT the taught z-threat, so "taught column is best" is undefined there).
//
// Scope: this gate governs CANDIDATE SEARCH OUTPUT only. It is never applied retroactively to
// already-shipped lesson content — a shipped board that fails it is FLAGGED for a human
// (`--check` prints NO MATCH), never rewritten. See OI-84.
// "Is this column in the solver-optimal set" is the answer-set rule, which
// `server/answerSetInvariant.js` owns as `optimalCols` — that module exists because this
// exact rule was once written out twice and the two copies drifted (see its header). Import
// it; do not restate it. See docs/architecture/server-conventions.md §"Answer sets are
// derived, never re-implemented".
function taughtColumnIsBest(pos, owner, col) {
  if (pos.player !== owner) return false;          // "best move" is only meaningful for the mover
  return optimalCols(pos.scores).includes(col);
}

// --- Refinement 3: cleanliness cap -----------------------------------------------
// Counts every major-threat cell (both players, from `board.reachableThreats`) minus
// the cells that belong to the matched pattern itself, so cluttered boards (extra
// unrelated threats fighting for the learner's attention) can be capped/sorted on.
function countMajorThreats(board) {
  let total = 0;
  for (const player of [1, 2]) {
    for (const [, rows] of board.reachableThreats(player)) total += rows.length;
  }
  return total;
}
// Only subtract patternCells that are themselves counted in countMajorThreats (i.e.
// actual empty major-threat cells for some player). Some tag: specs (figure_7,
// j_shape) report their pattern's OCCUPIED disc cells in `cells` -- those are never
// threat cells and must not be subtracted, or the count is deflated by up to 5.
// Consequence: for those pattern-piece tags, the pattern's own pair of threat cells
// (if the pattern also happens to create empty completing cells) is NOT excluded
// from the count, so a "clean" figure-7/j_shape reads extraThreats=2 (its own
// threat pair) rather than 0 -- the >2 cap for those tags means "no unrelated
// threats beyond the pattern's own pair", not "zero threats besides the pattern".
function extraThreats(board, patternCells) {
  const isThreat = ({ col, row }) => [1, 2].some(p => (board.reachableThreats(p).get(col) ?? []).includes(row));
  return countMajorThreats(board) - patternCells.filter(isThreat).length;
}
// Converts a classifier "cNrM" 1-indexed cell string (e.g. from tags.get(tag).cells)
// into a 0-indexed { col, row } pair matching board.reachableThreats' coordinates.
function parseCellStr(s) {
  const [, colStr, rowStr] = /^c(\d+)r(\d+)$/.exec(s);
  return { col: Number(colStr) - 1, row: Number(rowStr) - 1 };
}

// A "spec" answers: does this position teach the thing? Return null to reject, or
// a detail object (merged into the candidate printout) to accept.
// Every spec receives (pos = {ms, scores, player}, board = new Board(pos.ms), solver).
const SPECS = {

  // L06 s1/s2: latent Gray z-threat, gap EXACTLY 3, not gravity-top, position not
  // already decided against the side to move by more than a normal margin.
  //
  // Production detector / side: `detectZThreat(board, scores, perspective)` (classifier.js,
  // tag + puzzle category `z_threat`), for **GRAY (player 2)** — the pattern owner and, once the
  // solver-optimal gate below is satisfied, the side to move.
  // This matcher re-derives the KB gap formula from `board.reachableThreats(2)` instead of
  // calling the detector, deliberately: `detectZThreat` matches only when the odd-gap column is
  // the UNIQUE such column on the board and `scores[col] > 0` (a confirmed solver win), whereas a
  // slide needs one clean, latent, gap-3 illustration on a board that need only be non-losing.
  // The gate below closes the part of that divergence that actually mattered (the taught column
  // was not always a good move); the residual re-implementation is tracked as OI-85.
  z_threat_gap3: async (pos, board) => {
    if (pos.ms.length < 8 || pos.ms.length > 20) return null;
    if (!ownerNotLost(pos, 2)) return null;                  // Gray owns the z-threat
    for (const [col, rows] of board.reachableThreats(2)) {
      for (const r of rows) {
        const gap = r - board.colHeights[col] + 1;           // inclusive cell count, KB formula
        if (gap === 3) {
          if (!taughtColumnIsBest(pos, 2, col)) continue;    // FR-017 solver-optimal gate
          const extra = extraThreats(board, [{ col, row: r }]);
          if (extra > 2) return null;
          return { col, row: r, gap, extraThreats: extra };
        }
      }
    }
    return null;
  },

  // L06 s4: stacked-column z-threat — same as z_threat_gap3 but the column must
  // already hold discs, and the stack height must be EVEN so that row-parity
  // intuition and the count disagree: with height h and gap 3 the threat sits at
  // 0-ind row h+2, i.e. 1-based row h+3, which is ODD when h is even — "Green's
  // natural row" by raw row parity, yet the odd count (3) makes it Gray's z-threat.
  // (gap 1 is excluded by construction: gap 1 means the threat is gravity-top, an
  // immediate threat — the degenerate case a z-threat lesson must avoid.)
  //
  // Production detector / side: same as `z_threat_gap3` — `detectZThreat` for **GRAY (player 2)**,
  // re-derived rather than called, for the same reason; solver-optimal gate applies.
  z_threat_stacked: async (pos, board) => {
    if (pos.ms.length < 8 || pos.ms.length > 22) return null;
    if (!ownerNotLost(pos, 2)) return null;                  // Gray owns the z-threat
    for (const [col, rows] of board.reachableThreats(2)) {
      for (const r of rows) {
        const h = board.colHeights[col];
        const gap = r - h + 1;                               // inclusive cell count, KB formula
        if (gap === 3 && h >= 2 && h % 2 === 0) {
          if (!taughtColumnIsBest(pos, 2, col)) continue;    // FR-017 solver-optimal gate
          const extra = extraThreats(board, [{ col, row: r }]);
          if (extra > 2) return null;
          return { col, row: r, gap, stackHeight: h, extraThreats: extra };
        }
      }
    }
    return null;
  },

  // L06 s3: same shape but gap EXACTLY 2 (the non-z counterexample).
  //
  // Production detector / side: `detectZThreat` for **GRAY (player 2)** as the NEGATIVE case —
  // a board matching this spec must NOT be a z-threat (the gap is even), so the detector is the
  // authority on what this spec is deliberately failing. Intentionally NOT solver-optimal-gated:
  // the taught point is that this column is not the z-threat answer, so "the taught column is the
  // best move" has no meaning here (spec 052 / T031 scope note).
  z_threat_gap2: async (pos, board) => {
    if (pos.ms.length < 8 || pos.ms.length > 20) return null;
    if (!ownerNotLost(pos, 2)) return null;                  // Gray owns the z-threat
    for (const [col, rows] of board.reachableThreats(2)) {
      for (const r of rows) {
        const gap = r - board.colHeights[col] + 1;
        if (gap === 2) {
          const extra = extraThreats(board, [{ col, row: r }]);
          if (extra > 2) return null;
          return { col, row: r, gap, extraThreats: extra };
        }
      }
    }
    return null;
  },

  // L06 socratic: Gray z-threat (odd gap, latent) in one column AND a Gray threat at the
  // SAME ROW in another column with an even gap — the "same row, opposite ownership" contrast.
  //
  // Production detector / side: `detectZThreat` for **GRAY (player 2)**, who is the side to move
  // and the learner here. Re-derived rather than called for the same reason as `z_threat_gap3`,
  // plus one this spec adds: the detector requires the odd-gap column to be UNIQUE, while this
  // spec needs exactly two same-row threats (one odd-gap, one even-gap) to exist side by side.
  // Solver-optimal gate applies to the z-threat column (the socratic answer).
  z_threat_socratic: async (pos, board) => {
    if (pos.ms.length % 2 !== 1) return null;                // Gray to move -> learner plays Gray
    if (!ownerNotLost(pos, 2)) return null;                  // Gray owns both cells in the contrast
    const gaps = [];
    for (const [col, rows] of board.reachableThreats(2)) {
      for (const r of rows) {
        const gap = r - board.colHeights[col] + 1;
        if (gap >= 2) gaps.push({ col, row: r, gap });
      }
    }
    const z  = gaps.find(t => t.gap % 2 === 1);
    const nz = gaps.find(t => t.gap % 2 === 0 && z && t.row === z.row && t.col !== z.col);
    if (!z || !nz) return null;
    if (!taughtColumnIsBest(pos, 2, z.col)) return null;     // FR-017 solver-optimal gate
    const extra = extraThreats(board, [{ col: z.col, row: z.row }, { col: nz.col, row: nz.row }]);
    if (extra > 2) return null;
    return { zthreat: z, distractor: nz, extraThreats: extra };
  },

  // L09 slides/socratic: Allen-T2 adjacent undercut — Gray threat at row R, Green threat
  // at R+1 directly above, SAME column, both latent. Learner side = Gray.
  //
  // Production detector / side: `detectUndercutBeneficiary(board, scores)` for **GRAY (player 2)**,
  // who is the side to move. This is the one matcher that already called its production detector
  // (OI-74, 2026-07-28) — the precedent every other "Production detector / side" line here follows.
  //
  // This is the BENEFICIARY side of the undercut (Gray owns the lower killing threat and
  // pressing the column wins), so it is validated against `detectUndercutBeneficiary`, NOT
  // against `detectUndercutVictim` / the `undercut` puzzle category — those model the mover
  // as the victim and only fire when the column LOSES. A correct board for this spec can
  // never match the victim detector. See docs/architecture/server-conventions.md
  // § "Undercut has two sides" and OI-74.
  undercut_t2_adjacent: async (pos, board) => {
    if (pos.ms.length < 10 || pos.ms.length > 22) return null;
    if (pos.player !== 2) return null;                       // Gray on move — she is the beneficiary
    if (!ownerNotLost(pos, 2)) return null;                  // Gray owns the undercut threat
    // The production detector is the authority on which lower threat actually kills the upper
    // one (Allen T2/T4/T5) and on the score gate; the spec only ADDS the adjacency this
    // lesson slide illustrates.
    const uc = detectUndercutBeneficiary(board, pos.scores);
    if (!uc.matched) return null;
    const kill = uc.highlightMetadata.cells.find(c => c.role === 'killing_threat');
    const dead = uc.highlightMetadata.cells.find(c => c.role === 'dead_threat');
    if (dead.row !== kill.row + 1) return null;              // T2 sub-case 3: immediately adjacent
    if (kill.row <= board.colHeights[kill.column]) return null; // both latent, not gravity-top
    // The undercut column must be the solver's best move, or the socratic answer built from
    // this board is not optimal and the answer-set invariant rejects it downstream.
    // (This IS the FR-017 solver-optimal gate — it predates spec 052 and set its shape; expressed
    // through the shared helper so all gated matchers read identically.)
    if (!taughtColumnIsBest(pos, 2, kill.column)) return null;
    const extra = extraThreats(board, [{ col: kill.column, row: kill.row }, { col: dead.column, row: dead.row }]);
    if (extra > 2) return null;
    return { col: kill.column, lower: kill.row, upper: dead.row, score: pos.scores[kill.column], extraThreats: extra };
  },

  // L09 s3: same-parity pair (T4 — neither kills the other): opposite owners, same column,
  // rows two apart.
  //
  // Production detector / side: this is the T4 **non-match** of the undercut family, so the
  // authority is `undercutKills`'s `isT4SameParity` rule inside `detectUndercutCore`
  // (classifier.js) — as exercised through `detectUndercutBeneficiary` for **GRAY (player 2)**,
  // the same side as `undercut_t2_adjacent`. Neither undercut detector can be called to CONFIRM
  // this spec (a same-parity pair is precisely what they refuse to match); the rows-two-apart test
  // below is the local restatement of `isT4SameParity` for the adjacent-but-one case. Solver-
  // optimal gate applies to the shared column, so the slide's board still teaches a live position.
  same_parity_pair: async (pos, board) => {
    if (pos.ms.length < 10 || pos.ms.length > 22) return null;
    if (!ownerNotLost(pos, 2)) return null;                  // Gray owns the lower threat
    const gray  = board.reachableThreats(2);
    const green = board.reachableThreats(1);
    for (const [col, rows] of gray) {
      for (const r of rows) {
        if ((green.get(col) ?? []).includes(r + 2)) {
          if (!taughtColumnIsBest(pos, 2, col)) continue;    // FR-017 solver-optimal gate
          const extra = extraThreats(board, [{ col, row: r }, { col, row: r + 2 }]);
          if (extra > 2) return null;
          return { col, lower: r, upper: r + 2, extraThreats: extra };
        }
      }
    }
    return null;
  },

  // L10 slides/socratic: active-forcing overcut — Green threat at the column's
  // gravity-top cell (the next playable cell), Gray threat directly above it,
  // Gray to move, and playing that column is the solver's best legal move (>= 0):
  // one drop blocks Green's cell and makes Gray's own threat the next playable
  // cell. Learner side = Gray (odd ply).
  //
  // Production detector / side: **NO SINGLE DETECTOR — this is a hand-rolled geometry check.**
  // The nearest production detector is `detectOvercut(board, scores, perspective)` (classifier.js,
  // tag + puzzle category `overcut`) for **GRAY (player 2)**, but this spec is NOT validated
  // against it: `detectOvercut` accepts any T2/T4/T5 neutralisation at any height, while this spec
  // requires the specific active-forcing shape (Green's cell exactly at gravity-top, Gray's
  // directly above it) that the lesson slide illustrates.
  //
  // DEFERRAL (spec 052 / T030, FR-016): re-pointing this matcher at `detectOvercut` is DEFERRED
  // until Epic 2 (Lane A) ships OI-76's `detectOvercut` perspective fix. `detectOvercut` today
  // takes a caller-supplied `perspective` while gating on `scores[col] > 0`, which are the mover's
  // scores — i.e. it mixes one player's threats with the other player's score sign, the exact
  // OI-74 defect. Calling it now would bake that unsoundness into lesson curation and would have
  // to be redone. For the same reason the FR-017 solver-optimal gate is NOT applied to this
  // matcher: the correct "taught column is best" predicate depends on which side OI-76 settles the
  // detector on. Revisit both together when OI-76 closes.
  overcut_active: async (pos, board) => {
    if (pos.ms.length % 2 !== 1) return null;                // Gray to move
    if (pos.ms.length < 10 || pos.ms.length > 22) return null;
    if (!ownerNotLost(pos, 2)) return null;                  // Gray owns the overcut threat
    const gray  = board.reachableThreats(2);
    const green = board.reachableThreats(1);
    for (const [col, rows] of green) {
      for (const r of rows) {
        if (r !== board.colHeights[col]) continue;           // Green's cell is gravity-top
        if (!(gray.get(col) ?? []).includes(r + 1)) continue; // Gray's cell directly above
        if (pos.scores[col] !== maxScore(pos.scores) || maxScore(pos.scores) < 0) continue;
        const extra = extraThreats(board, [{ col, row: r }, { col, row: r + 1 }]);
        if (extra > 2) return null;
        return { col, lower: r, upper: r + 1, score: pos.scores[col], extraThreats: extra };
      }
    }
    return null;
  },

  // L10 s4 (shared-cell gotcha): same shape as overcut_active but the upper cell
  // is ALSO a Green threat (a shared [*] cell) and playing the column backfires
  // (solver-negative): Gray's block opens the shared cell and Green completes
  // four there first. ownerNotLost keeps Gray alive, so the board also carries
  // Gray's actual saving move elsewhere. Note extraThreats reads >= 1 on a
  // "clean" find: the shared upper cell is counted for both players but
  // subtracted only once.
  //
  // Production detector / side: **NO SINGLE DETECTOR — hand-rolled geometry check**, same as
  // `overcut_active` and doubly so: this is the overcut that BACKFIRES (`scores[col] < 0`), which
  // `detectOvercut` can never match — it requires `scores[col] > 0` by construction. The nearest
  // detector is still `detectOvercut` for **GRAY (player 2)**, used here as the negative reference.
  //
  // DEFERRAL (spec 052 / T030, FR-016): as with `overcut_active`, tightening or re-pointing this
  // matcher at `detectOvercut` is DEFERRED until Epic 2 (Lane A) ships OI-76's `detectOvercut`
  // perspective fix, and the FR-017 solver-optimal gate is deliberately NOT applied here (it would
  // also be wrong on its face for a spec whose defining property is a losing column).
  overcut_shared_cell: async (pos, board) => {
    if (pos.ms.length % 2 !== 1) return null;                // Gray to move
    if (pos.ms.length < 10 || pos.ms.length > 24) return null;
    if (!ownerNotLost(pos, 2)) return null;                  // Gray must not be dead lost
    const gray  = board.reachableThreats(2);
    const green = board.reachableThreats(1);
    for (const [col, rows] of green) {
      for (const r of rows) {
        if (r !== board.colHeights[col]) continue;           // Green's cell is gravity-top
        if (!(gray.get(col) ?? []).includes(r + 1)) continue; // Gray's cell directly above
        if (!(green.get(col) ?? []).includes(r + 1)) continue; // ...but Green completes there too
        if (pos.scores[col] >= 0) continue;                  // the would-be overcut loses
        const extra = extraThreats(board, [{ col, row: r }, { col, row: r + 1 }]);
        if (extra > 2) return null;
        return { col, lower: r, upper: r + 1, score: pos.scores[col], extraThreats: extra };
      }
    }
    return null;
  },

  // L03 socratic replacement: side to move can create a double threat, the fork move WINS
  // (max solver score), and the opponent has NO gravity-top threat anywhere (the exact
  // failure of the current board, CRIT X2.2). Learner side = Green (even ply).
  //
  // Production detector / side: `detectDoubleThreat` — reached through
  // `classifyPattern(ms + col, pos.player, solver)`'s `double_threat` tag — for **GREEN (player 1)**,
  // the side to move and the learner. Unlike the z-threat/overcut specs this one really does call
  // production code, and it classifies the POST-move board (the fork exists only after the move),
  // which is why the tag is read at `pos.ms + c` rather than at `pos.ms`.
  // The FR-017 solver-optimal gate is satisfied inline: the candidate column `c` is drawn from the
  // solver's argmax set (`pos.scores[c] === best`) and `best > 0` additionally demands a win.
  fork_socratic_clean: async (pos, board, solver) => {
    if (pos.ms.length % 2 !== 0) return null;
    if (pos.ms.length < 8 || pos.ms.length > 16) return null;
    const opp = board.reachableThreats(3 - pos.player);
    for (const [col, rows] of opp) {
      if (rows.includes(board.colHeights[col])) return null; // opponent gravity-top threat -> reject
    }
    const best = maxScore(pos.scores);
    if (best <= 0) return null;                              // fork must win, not save
    // owner === pos.player here (side to move creates the fork); `best > 0` above is
    // already strictly stronger than ownerNotLost's `maxScore >= 0`, so no separate
    // owner-not-lost call is needed for this spec.
    for (const c of legalCols(pos.scores)) {
      if (pos.scores[c] !== best) continue;
      const tags = await classifyPattern(pos.ms + String(c), pos.player, solver);
      if (tags.has('double_threat')) {
        // the fork's own cells live on the post-move board, not this one, so there
        // are no "pattern cells" to exclude here -- count all pre-move threat clutter
        const extra = extraThreats(board, []);
        if (extra > 2) return null;
        return { forkCol: c, score: pos.scores[c], extraThreats: extra };
      }
    }
    return null;
  },
};

// Taught-column resolvers for the generic `tag:` branch's FR-017 gate. `classifyPattern` stores
// only `{ cells: result.cells }` per tag (classifier.js, inside `classifyPattern`), so the column
// a lesson would TEACH has to be re-derived by calling the tag's own production detector on the
// same board / scores / perspective. `pos.player` is always `board.currentPlayer` here, so none of
// these hit the detectors' recursive (perspective != mover) branch and none need the solver except
// `detectClaimeven`, which simulates internally.
const TAUGHT_COLUMNS = {
  // detectZThreat reports its column in highlightMetadata (capsule), and `cells` is [].
  z_threat: (board, pos) => {
    const r = detectZThreat(board, pos.scores, pos.player);
    return r.matched ? [r.highlightMetadata.column] : [];
  },
  // detectOddEvenThreat exposes correctCols (+ correctCol for backward compat); `cells` is [].
  odd_even_threat: (board, pos) => {
    const r = detectOddEvenThreat(board, pos.scores, pos.player);
    return r.matched ? (r.correctCols ?? [r.correctCol]) : [];
  },
  // detectClaimeven exposes correctCol; `cells` is [].
  claimeven: async (board, pos, solver) => {
    const r = await detectClaimeven(board, solver, pos.player);
    return r.matched && r.correctCol !== undefined ? [r.correctCol] : [];
  },
  // figure_7 / j_shape report their pattern's OCCUPIED disc cells, never a move column.
  // detectFigure7 additionally exposes the pattern's empty completing cells as `threatCells`;
  // detectJShape has no equivalent (documented gap, see the tag: branch below). The gate for
  // these two is therefore LOOSE by construction: it requires the solver's best move to lie in a
  // column the pattern actually occupies or completes, not that it be one specific taught column.
  // That is weaker than the gate on every other matcher — recorded in OI-85, not papered over.
  figure_7: (board, pos, _solver, patternCells) => {
    const r = detectFigure7(board, pos.scores, pos.player);
    const threat = r.matched && r.threatCells ? r.threatCells.map(t => t.col) : [];
    return [...patternCells.map(c => c.col), ...threat];
  },
  j_shape: (board, pos, _solver, patternCells) => patternCells.map(c => c.col),
};

function helpText() {
  return `find_lesson_boards.mjs — DISPOSABLE lesson-board curation tool (not production code).

Purpose
  Search mistake-weighted self-play games for board positions that teach a specific Connect Four
  pattern, then gate them on structure + the c4solver, so a lesson slide or socratic node can be
  built on a position that is genuinely clean, genuinely non-losing, and whose taught column is
  genuinely the best move. Also re-validates a board already adopted into a lesson (--check).

Usage (run from connect-four/)
  node server/scripts/find_lesson_boards.mjs --help
  node server/scripts/find_lesson_boards.mjs <spec> [--count N] [--seed N] [--games N]
  node server/scripts/find_lesson_boards.mjs <spec> --check <movestring>

Specs
  ${Object.keys(SPECS).join('\n  ')}
  tag:<classifier-tag>   generic matcher: accepts any board where classifyPattern() reports
                         <classifier-tag> for the side to move (e.g. tag:claimeven, tag:figure_7,
                         tag:j_shape, tag:z_threat, tag:odd_even_threat).

Options
  --count N       how many candidates to print before stopping   (default 5)
  --seed  N       mulberry32 seed for the self-play sampler      (default 42)
  --games N       how many self-play games to search             (default 400)
  --check MS      run <spec> against the single board MS instead of searching. Prints
                  "MATCH detail=..." and exits 0, or "NO MATCH" and exits 1.
  --help, -h      print this help and exit 0 (no solver process is started)

Exit codes
  0  candidates found (or --check matched, or --help)
  1  fewer than --count candidates found, or --check did not match
  2  unknown spec

Notes
  Every matcher carries a "Production detector / side" doc comment in this file naming the
  classifier.js detector and the player it validates against (spec 052 / FR-015). The solver-optimal
  gate (FR-017) applies to every matcher EXCEPT overcut_active / overcut_shared_cell (deferred
  pending OI-76) and z_threat_gap2 (a deliberate counterexample spec). A shipped lesson board that
  fails --check is FLAGGED for human review (OI-84) — this tool never rewrites lesson content.`;
}

async function main() {
  const [specArg, ...rest] = process.argv.slice(2);

  // FR-014 / house convention: --help is the FIRST thing done — before createSolverProcess(), so
  // no c4solver process is ever spawned just to print usage, and before any required-arg check.
  if (specArg === undefined || [specArg, ...rest].some(a => a === '--help' || a === '-h')) {
    console.log(helpText());
    process.exit(0);
  }

  const opt = (name, dflt) => {
    const i = rest.indexOf(`--${name}`);
    return i === -1 ? dflt : Number(rest[i + 1]);
  };
  const count = opt('count', 5), seed = opt('seed', 42), games = opt('games', 400);
  // --check <movestring>: run the spec against ONE board instead of searching. Exists so a board
  // already adopted into a lesson can be re-validated against the spec that curated it, without
  // re-deriving the spec's conditions by hand.
  const checkIdx = rest.indexOf('--check');
  const checkMs = checkIdx === -1 ? null : rest[checkIdx + 1];

  const solver = createSolverProcess();
  const rng = mulberry32(seed);
  let spec = SPECS[specArg];
  if (!spec && specArg?.startsWith('tag:')) {
    const tag = specArg.slice(4);
    // Generic matcher (claimeven / figure_7 / j_shape / z_threat / odd_even_threat / ...).
    //
    // Production detector / side: whichever detector `classifyPattern` registers for <tag>
    // (classifier.js's `detectors` table: `claimeven` -> detectClaimeven, `figure_7` ->
    // detectFigure7, `j_shape` -> detectJShape, `z_threat` -> detectZThreat, ...), always for
    // **the side to move** (`pos.player`) — this branch passes `pos.player` as the perspective, so
    // the matched side is the mover and the learner by construction. This is the ONE branch that
    // delegates wholesale to production detection rather than re-deriving it, so it cannot drift
    // in the way the hand-rolled specs above can; what it still needs is the taught column, which
    // classifyPattern does not carry — see TAUGHT_COLUMNS.
    spec = async (pos, board, solver_) => {
      if (pos.ms.length < 8 || pos.ms.length > 24) return null;
      // tag: specs' owner is always the side to move (pos.player) -- see ownerNotLost's
      // to-move branch above (require maxScore(pos.scores) >= 0). The not-to-move branch
      // never applies here since a tag is always evaluated for whoever is on move.
      if (!ownerNotLost(pos, pos.player)) return null;
      const tags = await classifyPattern(pos.ms, pos.player, solver_);
      if (!tags.has(tag)) return null;
      const cells = tags.get(tag).cells;                     // "cNrM" 1-indexed strings
      let patternCells = cells.map(parseCellStr);
      // figure_7/j_shape's `cells` are the pattern's OCCUPIED disc cells (role:
      // 'pattern_piece'), never the pattern's own completing threat cells -- without
      // folding those in too, extraThreats would count them as "extra" even on an
      // otherwise-clean board. detectFigure7 exposes the true empty completing cells
      // via its `threatCells` field (classifier.js:1045-1055 -- kernel.emptyCells
      // mapped through the match anchor, 0-indexed {row,col}); re-run it directly
      // (same board/scores/perspective) and concatenate those cells in.
      // detectJShape has NO equivalent field in its return value (classifier.js:1074-1092
      // returns only matched/cells/highlightMetadata/categoryEvidence -- all
      // pattern-piece cells), even though the J kernel does define emptyCells
      // (classifier.js:822-834, 3 cells vs figure_7's 2). Obtaining j_shape's real
      // threat cells would require classifier.js to expose them (as detectFigure7
      // does) or exporting `convolve`/`J`/`J_FLIPPED`, which is out of scope for this
      // script-only fix -- so this branch is a documented no-op for j_shape rather
      // than a guessed value (see task-1-report.md for this gap).
      if (tag === 'figure_7' || tag === 'j_shape') {
        const detectFn = tag === 'figure_7' ? detectFigure7 : detectJShape;
        const result = detectFn(board, pos.scores, pos.player);
        if (result.matched && result.threatCells) {
          patternCells = patternCells.concat(result.threatCells.map(t => ({ col: t.col, row: t.row })));
        }
      }
      // FR-017 solver-optimal gate. The taught column comes from the tag's own detector
      // (TAUGHT_COLUMNS) when classifyPattern's `{ cells }` payload can't supply it; otherwise the
      // pattern's own cell columns are used. A tag with neither is REJECTED LOUDLY — an ungated
      // candidate must never pass silently as if it had been checked.
      const resolver = TAUGHT_COLUMNS[tag];
      const taughtCols = resolver
        ? await resolver(board, pos, solver_, patternCells)
        : patternCells.map(c => c.col);
      if (!taughtCols.length) {
        // Warn ONCE per tag, not once per rejected candidate: this sits in the per-position
        // loop of a many-hundred-game search, so an unconditional log buries the run's real
        // output under thousands of identical lines. The rejection itself is unconditional.
        if (!warnedUnresolvableTags.has(tag)) {
          warnedUnresolvableTags.add(tag);
          console.error(`tag:${tag}: cannot derive a taught column (no TAUGHT_COLUMNS resolver and ` +
                        `no pattern cells) — candidates rejected rather than left ungated (FR-017, OI-85). ` +
                        `This warning is printed once per tag per run.`);
        }
        return null;
      }
      if (!taughtCols.some(c => taughtColumnIsBest(pos, pos.player, c))) return null;
      const extra = extraThreats(board, patternCells);
      if (extra > 2) return null;
      return { tag, cells, taughtCols: [...new Set(taughtCols)], extraThreats: extra };
    };
  }
  if (!spec) {
    console.error(`Unknown spec "${specArg}". Known: ${Object.keys(SPECS).join(', ')}, or tag:<classifier-tag>`);
    process.exit(2);
  }

  if (checkMs) {
    const scores = await solver.query(checkMs);
    const pos = { ms: checkMs, scores, player: (checkMs.length % 2) + 1 };
    const detail = await spec(pos, new Board(checkMs), solver);
    console.log(`${specArg}  ms=${checkMs}  ply=${checkMs.length}  toMove=${pos.player === 1 ? 'Green' : 'Gray'}`);
    console.log(`  scores=${JSON.stringify(scores)}`);
    console.log(detail ? `  MATCH   detail=${JSON.stringify(detail)}` : '  NO MATCH');
    solver.destroy();
    process.exit(detail ? 0 : 1);
  }

  const seen = new Set();
  let found = 0;
  for (let g = 0; g < games && found < count; g++) {
    for await (const pos of playGame(solver, rng, { maxMistakeProb: 0.4 })) {
      if (seen.has(pos.ms)) continue;
      const detail = await spec(pos, new Board(pos.ms), solver);
      if (!detail) continue;
      seen.add(pos.ms);
      found++;
      console.log(`\n=== candidate ${found}  ms=${pos.ms}  ply=${pos.ms.length}  toMove=${pos.player === 1 ? 'Green' : 'Gray'}`);
      console.log(`    detail=${JSON.stringify(detail)}`);
      console.log(`    scores=${JSON.stringify(pos.scores)}`);
      console.log(`    render: ./visualize_board.sh ${pos.ms}`);
      break; // Refinement 1: one candidate per game -- later plies of the same self-play
             // trajectory are near-prefixes of this one, so stop searching this game now.
    }
  }
  solver.destroy();
  if (found < count) { console.error(`Only found ${found}/${count}. Loosen spec or raise --games.`); process.exit(1); }
}
main();
