// connect-four/server/scripts/reasonBoardTags.mjs
// Curated per-board tactics (major/immediate/double + a vector-named pattern). Reuses classifier detectors.
// Deliberately EXCLUDES minor threats, scores, move numbers (spec §7 tagging decision).
import { parseBoardState, getMajorThreatCells, Board } from '../classifier.js';
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
  const lineWins = findMajorThreatWindows(new Board(movestring), perspectivePlayer);
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
  // Vector-named pattern (figure_7 / double_threat), surfaced verbatim from the reason vector.
  if (opts.patternTag && opts.patternCompletingCell) {
    tags.push({ cell: opts.patternCompletingCell, kind: opts.patternTag, owner: opts.patternOwner ?? 'opp',
                ...(opts.patternWindow ? { window: opts.patternWindow } : {}) });
  }
  return tags.sort((a, b) => (a.cell < b.cell ? -1 : a.cell > b.cell ? 1 : 0));
}
