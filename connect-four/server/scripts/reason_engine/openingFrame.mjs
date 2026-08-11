// Opening-phase primary frame (spec 2026-07-05-opening-frame-render-design.md). Additive to L1-L9:
// the opening IS the teachable reason; the deep two halves demote to a horizon tail. No deep-cell grounding.
import { parseBoardState } from '../../classifier.js';
import { winProbability, playerFavorsRow } from './winningCellHeatmap.mjs';

export const MUCH_EASIER_RATIO = 2;
export const EASIER_RATIO = 1.15;
export const MIN_BETTER_MASS = 0.05;

const col1 = (c) => (c == null ? '?' : c + 1);

// 0-indexed {row0,col0} landing spot for dropping `col` on `movestring`; null on null/full column.
function landing(movestring, col) {
  if (col == null) return null;
  const { colHeights } = parseBoardState(movestring ?? '');
  const row0 = colHeights[col];
  if (row0 == null || row0 >= 6) return null;
  return { row0, col0: col };
}
const cellStr = (l) => (l ? `c${l.col0 + 1}r${l.row0 + 1}` : null);

// Compare the mover's winning-cell mass on the better vs played landing cell.
export function centralityQualitative(fv) {
  const b = landing(fv.movestring, fv.bestCol);
  const p = landing(fv.movestring, fv.playedCol);
  if (!b || !p) return null;
  const pb = winProbability(fv.player, b.row0, b.col0);
  const pp = winProbability(fv.player, p.row0, p.col0);
  if (pb < MIN_BETTER_MASS) return null;
  const ratio = pb / Math.max(pp, 1e-6);
  if (ratio >= MUCH_EASIER_RATIO) return 'much_easier';
  if (ratio >= EASIER_RATIO) return 'easier';
  return null;
}

// Shared centrality/parity clause. `winningFraming` false => resistance wording (O2).
function centralityClause(fv, winningFraming) {
  const qual = centralityQualitative(fv);
  if (!qual) return '';
  const b = landing(fv.movestring, fv.bestCol);
  const p = landing(fv.movestring, fv.playedCol);
  const adverb = qual === 'much_easier' ? 'much easier' : 'easier';
  let clause = ` It'll be ${adverb} to build a connected four through ${cellStr(b)} than through ${cellStr(p)}.`;
  // Parity rider only when the better cell's row favors the mover and the played cell's does not.
  if (playerFavorsRow(fv.player, b.row0) && !playerFavorsRow(fv.player, p.row0)) {
    const rows = fv.player === 1 ? 'odd' : 'even';
    clause += winningFraming
      ? ` That square sits on the ${rows} rows your winning lines tend to run through.`
      : ` The more central hold also contests the rows the opponent needs and is harder to break through.`;
  }
  return clause;
}

function horizonTail(fv) {
  const half = fv.case && fv.case.startsWith('win_') ? fv.lostResource : fv.opponentPunishment;
  const battle = half?.register === 'parity' ? 'a parity battle'
    : half?.register === 'forced_sequence' ? 'a deep forced line' : 'a deep line';
  return ` This one only settles a long way out, through ${battle} — too far to pin to a single square; the lesson is the opening.`;
}

const nameTag = (oc) => `the ${oc.family}${oc.id ? ` (${oc.id})` : ''}`;

const GUARDRAIL = 'Explain the blunder through the opening — book line, centrality, parity. '
  + 'The deep resource resolves a long way out: when you name its square or line, say plainly that it '
  + 'matters LATER, once the forced sequence reaches it — never describe it as a threat that exists now.';

const GUARDRAIL_NO_CENTRALITY = ' The two landing cells are NOT stated to differ in centrality or '
  + 'difficulty here — do not say one column is "more central," "the stronger column," or "easier '
  + 'to win through" than the other unless this vector gives you that comparison.';

export function composeOpeningFrame(fv) {
  const oc = fv.openingContext;
  if (!oc) return null;
  // The prohibition is gated on the EMITTED clause, never on a predicate the branch may override:
  // O2 suppresses the clause on centralityGrounded:false while centralityQualitative can still be
  // non-null, which previously dropped both the clause and its prohibition (eval-21).
  const mk = (id, kind, lead, clause) => ({
    id, kind, confidence: 'high', covers: [],
    guardrail: GUARDRAIL + (clause === '' ? GUARDRAIL_NO_CENTRALITY : ''),
    text: lead + clause + horizonTail(fv),
  });

  if (oc.namedOpening) {
    const o = oc.namedOpening;
    return mk('O1', 'namedOpening',
      `In the opening you were following ${nameTag(o)}. The book move is column ${col1(o.bookNextCol)}; `
      + `you played column ${col1(fv.playedCol)}, leaving the line.`,
      centralityClause(fv, true));
  }
  if (oc.defense) {
    const o = oc.defense;
    return mk('O2', 'defense',
      `In the opening you were following ${nameTag(o)}. The more resilient move is column ${col1(o.bestDefenseCol)}; `
      + `column ${col1(fv.playedCol)} gives ground faster.`,
      o.centralityGrounded ? centralityClause(fv, false) : '');
  }
  const o = oc.centrality;
  return mk('O3', 'centrality', `${o.text}`, centralityClause(fv, fv.player === 1));
}
