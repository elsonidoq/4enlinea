// connect-four/server/scripts/reasonBoardTags.mjs
// Curated per-board tactics (major/immediate/double + a vector-named pattern). Reuses classifier detectors.
// Deliberately EXCLUDES minor threats, scores, move numbers (spec §7 tagging decision).
import { parseBoardState, getMajorThreatCells, Board, detectFigure7, detectDoubleThreat } from '../classifier.js';
import { findMajorThreatWindows } from '../llmCoachHelpers.js';
import { rcToCell } from './reasonCellGrounding.mjs';

export function tagBoard(movestring, perspectivePlayer, opts = {}) {
  const { board, colHeights } = parseBoardState(movestring);
  const majors = getMajorThreatCells(board); // "r,c" -> {rm,rn,ym,yn}
  // The 4-cell LINE each major completes. getMajorThreatCells computes the window in its inner loop
  // and discards it, so a `major` tag could only ever name a square while roleText promised "a
  // square completing ... four-in-a-row line" (feedback ask 2b). findMajorThreatWindows is the
  // canonical group-level scanner (docs/architecture/server-conventions.md) — reused here rather
  // than changing getMajorThreatCells' return shape, which has 8 live call sites.
  const boardObj = new Board(movestring);
  const lineWins = findMajorThreatWindows(boardObj, perspectivePlayer);
  const tags = [];
  const byOwnerCols = { you: new Map(), opp: new Map() }; // owner -> Map<col, cell> for double detection

  for (const [key, flags] of Object.entries(majors)) {
    const [r, c] = key.split(',').map(Number);
    for (const player of [1, 2]) {
      const isMajor = player === 1 ? flags.rm : flags.ym;
      if (!isMajor) continue;
      const owner = player === perspectivePlayer ? 'you' : 'opp';
      const cell = rcToCell(r, c);
      // Deliberately NOT named `window`: tagSpec() converts any window-bearing tag into a
      // `windows:` spec, which would replace every major's single-cell alias, regress the required
      // set, and flip the entry to Decision A's windowOnly bucket. `lineWindow` is additive.
      const w = lineWins.find((x) => (x.owner === 'player' ? 'you' : 'opp') === owner && x.cells.includes(cell));
      tags.push({ cell, kind: r === colHeights[c] ? 'immediate' : 'major', owner,
                  ...(w ? { lineWindow: w.cells } : {}) });
      if (!byOwnerCols[owner].has(c)) byOwnerCols[owner].set(c, cell);
    }
  }
  // Double threat: one owner with majors in >=2 distinct columns.
  for (const owner of ['you', 'opp']) {
    const cells = [...byOwnerCols[owner].values()].sort();
    if (cells.length >= 2) tags.push({ cell: cells[0], kind: 'double', owner, window: cells });
  }
  // Vector-named pattern (figure_7 / double_threat), surfaced verbatim from the reason vector — but
  // ONLY when the discs that pattern requires actually exist on THIS board (FR-010, OI-204, T013).
  // The half that names this pattern (lostResource / opponentPunishment) may belong to a LATER board
  // than the one tagBoard() is currently tagging (e.g. the vector-named fork is only real once the
  // played move hands it to the opponent) — attaching it unconditionally renders a board-false
  // "Major threats" claim on a board that itself has none. I12: probed through the PRODUCTION
  // detector (detectFigure7 / detectDoubleThreat), never a hand-rolled proxy, so both of
  // detectDoubleThreat's Case A/B branches are honored.
  if (opts.patternTag && opts.patternCompletingCell) {
    const patternPlayer = opts.patternOwner === 'you' ? perspectivePlayer : 3 - perspectivePlayer;
    const detected = opts.patternTag === 'figure_7' ? detectFigure7(boardObj, null, patternPlayer)
      : opts.patternTag === 'double_threat' ? detectDoubleThreat(boardObj, patternPlayer)
      : { matched: false };
    if (detected.matched) {
      tags.push({ cell: opts.patternCompletingCell, kind: opts.patternTag, owner: opts.patternOwner ?? 'opp',
                  ...(opts.patternWindow ? { window: opts.patternWindow } : {}) });
    }
  }
  return tags.sort((a, b) => (a.cell < b.cell ? -1 : a.cell > b.cell ? 1 : 0));
}

// FR-009 / OI-188 / T016. The single source of truth for "what grain is this cell, on this board,
// for this owner" — reused by causalLinks.mjs's L3 template so a frame's `immediate_threat`-grain
// claim can never drift from the board's own tactics-block grain (`major` != `immediate`). Returns
// 'immediate' | 'major' | 'double' | null (not a major/immediate/double threat for that owner here —
// e.g. deep, or the cell is not a threat cell on this board at all).
export function grainOf(movestring, perspectivePlayer, cell, owner) {
  if (!movestring || !cell) return null;
  const tags = tagBoard(movestring, perspectivePlayer);
  const t = tags.find((tg) => tg.cell === cell && tg.owner === owner
    && (tg.kind === 'major' || tg.kind === 'immediate' || tg.kind === 'double'));
  return t ? t.kind : null;
}
