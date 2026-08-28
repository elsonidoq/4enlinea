// Board selection (spec §3e Option A) + clean-board ASCII (You/Opp) + threat-list rendering (spec §7.10 (i)).
import { parseBoardState, checkWin } from '../classifier.js';
import { tagBoard } from './reasonBoardTags.mjs';

// FR-008 / OI-203. `afterBest` is terminal when the better move itself completes four — checked via
// the production `checkWin`, never reimplemented. `ms0` is the PRE-move movestring (the decision
// board); the row is read from its own colHeights so the check is independent of any other board.
function isTerminalMove(ms0, col, player) {
  if (col == null) return false;
  const { colHeights } = parseBoardState(ms0);
  const row = colHeights[col];
  if (row == null || row >= 6) return false;
  const { board: afterBoard } = parseBoardState(ms0 + String(col));
  return checkWin(afterBoard, row, col, player);
}

export function renderBoardAscii(movestring, perspectivePlayer) {
  const { board } = parseBoardState(movestring);
  const sym = (v) => (v === 0 ? '.' : v === perspectivePlayer ? 'Y' : 'O');
  const oppPlayer = perspectivePlayer === 1 ? 2 : 1;
  const header = '      ' + Array.from({ length: 7 }, (_, c) => `c${c + 1}`).join(' ');
  const rows = [];
  for (let r = 5; r >= 0; r--) rows.push(` r${r + 1} |  ` + board[r].map(sym).join('  '));
  return `Y = you (player ${perspectivePlayer}), O = opponent (player ${oppPlayer})\n${header}\n${rows.join('\n')}`;
}

export function renderThreatList(tags) {
  if (!tags || tags.length === 0) return '(no tactics)';
  return tags.map((t) => {
    const win = t.window ? `, window ${t.window.join('·')}` : '';
    return `- ${t.kind} at ${t.cell} (${t.owner}${win})`;
  }).join('\n');
}

const DEEP = new Set(['forced_sequence', 'parity']);
const tagKey = (tags) => tags.map((t) => `${t.cell}|${t.kind}|${t.owner}`).sort().join(',');

// Extract a vector-named fork pattern (figure_7 / double_threat) from whichever half realized it,
// so tagBoard's named-pattern overlay (opts) becomes reachable. Owner: lostResource => your tactic
// ('you'); opponentPunishment => the opponent's ('opp'). Non-fork tags stay to structural detection.
const FORK_TAGS = new Set(['figure_7', 'double_threat']);
function namedPatternOpts(fv) {
  for (const [half, owner] of [[fv.lostResource, 'you'], [fv.opponentPunishment, 'opp']]) {
    if (half && FORK_TAGS.has(half.tag) && half.completingCell) {
      return { patternTag: half.tag, patternCompletingCell: half.completingCell,
               patternWindow: half.window ?? undefined, patternOwner: owner };
    }
  }
  return null;
}

// L2-vs-L3 branch-invariance (spec §3b): the opponent pattern is present on the after-best board iff
// that board carries an opponent-owned tag at the pattern's completing cell. Reuses the P2 tagger so
// the check equals what the model sees. Computed only for enabled_opponent records (by the caller).
export function patternOnAfterBestBoard(fv) {
  const cc = fv.opponentPunishment?.completingCell;
  if (cc == null || fv.bestCol == null) return false;
  const ms = (fv.movestring ?? '') + String(fv.bestCol);
  return tagBoard(ms, fv.player).some(
    (t) => t.owner === 'opp' && (t.cell === cc || (t.window || []).includes(cc)));
}

export function boardSelectionDecisions(fv) {
  const you = fv.player;
  const applyCol = (ms, col) => (col == null ? ms : ms + String(col));
  const patternOpts = namedPatternOpts(fv);
  const decisionStructuralTags = tagBoard(fv.movestring ?? '', you);   // selection baseline (structural)
  const decisionKey = tagKey(decisionStructuralTags);
  const decisionTags = patternOpts                                     // displayed tags (+ named pattern)
    ? tagBoard(fv.movestring ?? '', you, patternOpts)
    : decisionStructuralTags;
  const out = [{ id: 'decision', shown: true, movestring: fv.movestring ?? '', tags: decisionTags,
                 terminal: false, ascii: renderBoardAscii(fv.movestring ?? '', you),
                 reason: 'the position under judgment' }];

  for (const [id, col, why] of [['afterBest', fv.bestCol, 'the better move'],
                                ['afterPlayed', fv.playedCol, 'the move you played']]) {
    const ms = applyCol(fv.movestring ?? '', col);
    // Q3 PROVISIONAL: keep the board, suppress tags — see spec.md Q3. A terminal `afterBest` has no
    // live "threats" in the tactics-list sense — the game is already decided there — so its tags are
    // suppressed rather than the board being dropped (D50-style: engine keeps the board, render mutes it).
    const terminal = id === 'afterBest' && isTerminalMove(fv.movestring ?? '', col, you);
    const tags = terminal ? [] : tagBoard(ms, you);
    const shown = terminal || tagKey(tags) !== decisionKey;
    out.push({ id, shown, movestring: ms, tags, terminal, ascii: renderBoardAscii(ms, you),
               reason: terminal ? `${why} — wins outright; the game is over there`
                             : shown ? `${why} — changes the tactical picture`
                             : `${why} — tag-set identical to the decision board, omitted` });
  }

  // OI-190. This used to `.find()` the FIRST deep half and build ONE shared `projectedDeep` board
  // from its line, so any alias belonging to the OTHER half was verified — and, since OI-196,
  // restated in the required block — against a continuation it does not belong to. Measured over the
  // 63-record corpus: 38 records carry two deep halves and in ALL 38 the two `finalMovestring`s
  // differ, so one half's cells were always pointed at a board they are not true on. The graded
  // symptom (eval-11, eval-20, both 5/5) is that the opponent's completing cell is the PLAYER's own
  // disc on the board actually shown, while the opponent's real four completes only on a line that
  // no board rendered at all.
  //
  // Each deep half now gets its OWN board. Ordering and ids are chosen so every existing single-board
  // shape is byte-identical: the first deep half keeps the plain `projectedDeep` id (whichever half
  // it is), and a SECOND board appears only when both halves are deep AND their lines differ. Halves
  // that share one line still share one board. `zoneAnnotations` binds an alias to its board by
  // matching the half's own `finalMovestring` against these `movestring`s, so the two stay in sync
  // without a second source of truth.
  const deepHalves = [fv.lostResource, fv.opponentPunishment].filter(
    (h) => h && DEEP.has(h.register) && h.finalMovestring);
  const deepLines = [...new Set(deepHalves.map((h) => h.finalMovestring))];
  if (!deepLines.length) {
    out.push({ id: 'projectedDeep', shown: false, movestring: null, tags: [], ascii: null,
               reason: 'the resource is not deep (register is immediate) — no projected board' });
    return out;
  }
  deepLines.forEach((ms, i) => {
    const half = deepHalves.find((h) => h.finalMovestring === ms);
    out.push({ id: i === 0 ? 'projectedDeep' : 'projectedDeepOpp', shown: true, movestring: ms,
               tags: tagBoard(ms, you), ascii: renderBoardAscii(ms, you),
               // The two-board suffix must be plain Connect Four English. The first version read
               // "for your opponent's punishment" / "for the move you gave up" — and "opponent
               // punishment" is on A5a's own banned-terminology list. Measured: render/board labels
               // leaked into player-facing prose in 0/125 runs before the second board existed and
               // 10/125 after, on exactly the seven records that gained one, costing A5 88 -> 76.
               reason: `where the deep ${half.register} resource resolves`
                 + (deepLines.length > 1
                   ? (half === fv.lostResource ? ' — your line' : " — your opponent's line")
                   : '') });
  });
  return out;
}

export function selectBoards(fv) {
  return boardSelectionDecisions(fv).filter((b) => b.shown);
}
