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

export function selectBoards(fv) {
  const you = fv.player;
  const applyCol = (ms, col) => (col == null ? ms : ms + String(col));
  const decisionTags = tagBoard(fv.movestring ?? '', you);
  const decisionKey = tagKey(decisionTags);
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
