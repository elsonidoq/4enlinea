// Opening-phase primary frame (spec 2026-07-05-opening-frame-render-design.md). Additive to L1-L9:
// the opening IS the teachable reason; the deep two halves demote to a horizon tail. No deep-cell grounding.
import { parseBoardState } from '../../classifier.js';
import { winProbability, playerFavorsRow } from './winningCellHeatmap.mjs';
import { denialCell } from './causalLinks.mjs';

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
// B2 (same OI-194 class as T022/B1): the opening frame's own centrality clause used to interpolate a
// raw `cNrM` cell (e.g. "through c4r4 than through c7r1") into prose the reading key forbids the model
// to echo. Column-only prose, matching causalLinks.mjs's cellColumn/windowColumns treatment.
const columnPhrase = (l) => (l ? `column ${l.col0 + 1}` : 'that column');

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
  let clause = ` It'll be ${adverb} to build a connected four through ${columnPhrase(b)} than through ${columnPhrase(p)}.`;
  // Parity rider only when the better cell's row favors the mover and the played cell's does not.
  if (playerFavorsRow(fv.player, b.row0) && !playerFavorsRow(fv.player, p.row0)) {
    const rows = fv.player === 1 ? 'odd' : 'even';
    clause += winningFraming
      ? ` That square sits on the ${rows} rows your winning lines tend to run through.`
      : ` The more central hold also contests the rows the opponent needs and is harder to break through.`;
  }
  return clause;
}

// T034 (FR-025, OI-207): the tail used to assert "too far to pin to a single square"
// unconditionally — but `deriveRequiredSet` (renderReasonModel.mjs) derives its own required cells
// from these SAME halves via `denialCell` (`h.cell ?? h.completingCell`), so a half that DOES carry a
// nameable cell (eval-9's lostResource.completingCell=c6r5, opponentPunishment.cell=c3r5) gets told
// "too far to pin" while the record's own required block goes on to obligate naming that exact
// square — the frame denying what its own data (and the block built from it) requires (same class as
// OI-199: a guardrail/frame inviting or denying what the record itself contradicts). `denialCell` is
// imported from causalLinks.mjs rather than re-derived, so this stays in lockstep with
// deriveRequiredSet's own precedence without duplicating it. Only the FALSE DENIAL is dropped, never
// asserted the opposite way (I0: no overclaim either).
// F8 (task-3): 1 of 30 opening-context records (`eval-44`) is `register === 'immediate'` — the
// opponent's punishment lands on the very next ply, so the unconditional "settles a long way out"
// framing was board-false for it. Gate on `register === 'immediate'` ONLY: `forced_sequence` (15
// records) and `parity` (14 records) keep the existing wording byte-identical — for those, "settles a
// long way out" remains board-true (genuinely a multi-ply forced line), and D46's guardrail
// (GUARDRAIL_DEEP_RESOURCE, below) still needs to apply to stop a deep, currently-empty cell reading
// as a present threat. Do not widen this gate to `forced_sequence`. NOTE: the task brief's own sample
// code for this branch collapsed `forced_sequence` into the generic 'a deep line' wording (dropping
// the pre-existing 'a deep forced line' text) — that would have changed the frame text for all 15
// forced_sequence records, contradicting the "byte-identical" requirement, so the original
// parity/forced_sequence/default three-way `battle` ternary is preserved unchanged below.
function horizonTail(fv) {
  const half = fv.case && fv.case.startsWith('win_') ? fv.lostResource : fv.opponentPunishment;
  const reg = half?.register;
  if (reg === 'immediate') return ' The punishment lands almost at once — within the next move or two.';
  const battle = reg === 'parity' ? 'a parity battle'
    : reg === 'forced_sequence' ? 'a deep forced line' : 'a deep line';
  const pinnable = denialCell(half) != null;
  return pinnable
    ? ` This one only settles a long way out, through ${battle} — the lesson is the opening.`
    : ` This one only settles a long way out, through ${battle} — too far to pin to a single square; the lesson is the opening.`;
}

// FR-023 / OI-189 / T032. Traced from eval-13 (subset re-measure runs 1/3): the O2 lead sentence
// used to name every opening as `the ${family}` regardless of whether `id` is set. With no `id` to
// anchor it as a specific book-opening citation (a defense fallback where `id` is null — the "family
// only" case), the bare "the central-column opening" phrase reads exactly like offerable KB jargon —
// the model wrapped it in an unoffered `[term:central-column opening]` tag even though `zones.terms`
// never carries opening-family names (only the four KB-backed slugs: double_threat / figure_7 /
// immediate_threat / claimeven). This is the causal frame's OWN prose introducing vocabulary outside
// its own offer set (FR-023) — not a display-path leak (that class is D48/I13, already fixed). O1
// (namedOpening) always carries an `id`, so its parenthetical book-opening citation already anchors
// the phrase as specific and does not reproduce this; only the id-less O2 fallback does. Swapping the
// definite article for an indefinite one when there is no id to anchor it keeps the same information
// (the family name still prints) while dropping the "the X" proper-noun-shaped signal.
const nameTag = (oc) => (oc.id ? `the ${oc.family} (${oc.id})` : `a ${oc.family}`);

// Task 9d fix round 1 (spec 058 feedback remediation). The first sentence enumerates the admissible
// framings for the blunder explanation; on an O3 (centrality-fallback) record there is no book line
// at all, so unconditionally offering "book line" as a framing actively directs the model toward the
// fabrication this task exists to prevent (measured on eval-11: 3/5 runs fabricated specific
// book-line adherence). Split on that first sentence only, by frame kind — O1 (namedOpening) and O2
// (defense) genuinely have a book/defense line, O3 (centrality) does not. The second sentence (the
// deep-resource "matters LATER" text) is D46's settled substance and stays BYTE-IDENTICAL across
// both variants — this fix does not touch it.
const GUARDRAIL_ADMISSIBLE_FRAMINGS_BOOK_LINE = 'Explain the blunder through the opening — book line, centrality, parity. ';
const GUARDRAIL_ADMISSIBLE_FRAMINGS_BOOK_LINE_NO_CENTRALITY = 'Explain the blunder through the opening — book line, parity. ';
const GUARDRAIL_ADMISSIBLE_FRAMINGS_CENTRALITY_ONLY = 'Explain the blunder through the opening — centrality, parity. ';
const GUARDRAIL_ADMISSIBLE_FRAMINGS_PARITY_ONLY = 'Explain the blunder through the opening — parity. ';
const GUARDRAIL_DEEP_RESOURCE = 'The deep resource resolves a long way out: when you name its square or line, say plainly that it '
  + 'matters LATER, once the forced sequence reaches it — never describe it as a threat that exists now.';
// F8 (task-3, mirrors horizonTail's gate): the 1 `register === 'immediate'` record (eval-44) needs
// the opposite instruction — its decisive square is NOW, not later, so telling the model to defer it
// to "LATER" would itself be board-false. `forced_sequence`/`parity` keep GUARDRAIL_DEEP_RESOURCE
// byte-identical; do not widen this gate.
const GUARDRAIL_NEAR_RESOURCE = 'The decisive squares land within the next few moves: state that timing plainly — '
  + 'never stretch it into a distant, abstract resource.';
function deepResourceGuardrail(fv) {
  const half = fv.case && fv.case.startsWith('win_') ? fv.lostResource : fv.opponentPunishment;
  return half?.register === 'immediate' ? GUARDRAIL_NEAR_RESOURCE : GUARDRAIL_DEEP_RESOURCE;
}

const GUARDRAIL_NO_CENTRALITY = ' The two landing cells are NOT stated to differ in centrality or '
  + 'difficulty here — do not say one column is "more central," "the stronger column," or "easier '
  + 'to win through" than the other unless this vector gives you that comparison.';

export function composeOpeningFrame(fv) {
  const oc = fv.openingContext;
  if (!oc) return null;
  // The prohibition is gated on the EMITTED clause, never on a predicate the branch may override:
  // O2 suppresses the clause on centralityGrounded:false while centralityQualitative can still be
  // non-null, which previously dropped both the clause and its prohibition (eval-21). Composes with
  // the book-line/centrality-only split above: GUARDRAIL_NO_CENTRALITY is appended after whichever
  // admissible-framings sentence applies, unchanged.
  //
  // Q5 PROVISIONAL / T029 (FR-020, OI-199): the admissible-framings sentence used to invite
  // "centrality" unconditionally by `kind`, independent of whether the clause was actually emitted —
  // so a record with clause==='' (eval-11, eval-21) was told BOTH "explain via centrality" and,
  // one sentence later, "do not say one column is more central" — the guardrail inviting what it
  // itself forbids (OI-199's class). Gate the admissible-framings choice on the SAME `clause === ''`
  // condition GUARDRAIL_NO_CENTRALITY already uses: when the clause is suppressed, drop "centrality"
  // from the invitation and offer parity alone (still naming "book line" for O1/O2, since that half
  // of the invitation is untouched by centrality data). The guardrail itself (GUARDRAIL_NO_CENTRALITY,
  // GUARDRAIL_DEEP_RESOURCE, the eval-21 gate) is UNCHANGED — this only drops the invitation.
  const mk = (id, kind, lead, clause) => {
    const centralityOffered = clause !== '';
    const admissibleFramings = kind === 'centrality'
      ? (centralityOffered ? GUARDRAIL_ADMISSIBLE_FRAMINGS_CENTRALITY_ONLY : GUARDRAIL_ADMISSIBLE_FRAMINGS_PARITY_ONLY)
      : (centralityOffered ? GUARDRAIL_ADMISSIBLE_FRAMINGS_BOOK_LINE : GUARDRAIL_ADMISSIBLE_FRAMINGS_BOOK_LINE_NO_CENTRALITY);
    return {
      id, kind, confidence: 'high', covers: [],
      // B3 (same class as OI-199/T029): exposed so renderReasonModel.mjs's OPENING_READING_KEY_*
      // gating can agree with the guardrail's own admissible-framings choice above, instead of
      // re-deriving (or worse, hardcoding) whether centrality was actually offered this record.
      centralityOffered,
      guardrail: admissibleFramings + deepResourceGuardrail(fv) + (clause === '' ? GUARDRAIL_NO_CENTRALITY : ''),
      text: lead + clause + horizonTail(fv),
    };
  };

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
