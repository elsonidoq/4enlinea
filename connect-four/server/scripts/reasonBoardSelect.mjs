// Board selection (spec §3e Option A) + clean-board ASCII (You/Opp) + threat-list rendering (spec §7.10 (i)).
import { parseBoardState } from '../classifier.js';
import { tagBoard } from './reasonBoardTags.mjs';

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

export function selectBoards(fv) {
  const you = fv.player;
  const applyCol = (ms, col) => (col == null ? ms : ms + String(col));
  const patternOpts = namedPatternOpts(fv);
  const decisionStructuralTags = tagBoard(fv.movestring ?? '', you);   // selection baseline (structural)
  const decisionKey = tagKey(decisionStructuralTags);
  const decisionTags = patternOpts                                     // displayed tags (+ named pattern)
    ? tagBoard(fv.movestring ?? '', you, patternOpts)
    : decisionStructuralTags;
  const out = [{ id: 'decision', movestring: fv.movestring ?? '', tags: decisionTags,
                 ascii: renderBoardAscii(fv.movestring ?? '', you),
                 reason: 'the position under judgment' }];

  for (const [id, col, why] of [['afterBest', fv.bestCol, 'the better move'],
                                ['afterPlayed', fv.playedCol, 'the move you played']]) {
    const ms = applyCol(fv.movestring ?? '', col);
    const tags = tagBoard(ms, you);
    if (tagKey(tags) !== decisionKey) {
      out.push({ id, movestring: ms, tags, ascii: renderBoardAscii(ms, you),
                 reason: `${why} — changes the tactical picture` });
    }
  }

  const deepHalf = [fv.lostResource, fv.opponentPunishment].find(
    (h) => h && DEEP.has(h.register) && h.finalMovestring);
  if (deepHalf) {
    out.push({ id: 'projectedDeep', movestring: deepHalf.finalMovestring,
               tags: tagBoard(deepHalf.finalMovestring, you),
               ascii: renderBoardAscii(deepHalf.finalMovestring, you),
               reason: `where the deep ${deepHalf.register} resource resolves` });
  }
  return out;
}
