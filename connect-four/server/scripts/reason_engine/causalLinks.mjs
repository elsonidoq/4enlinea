// Single source of truth for the causal-explanation rules (spec §3b/§3d).
// Consumed by the render composer, the grader rubric, and the board sampler.
// Phase 1: `when` classification + `covers`/`guardrail` data. Rich `template()` text lands in P3.

import { parseBoardState, checkWin } from '../../classifier.js';
import { grainOf } from '../reasonBoardTags.mjs';

// FR-008 / OI-203 / T012. L1 asserts the better move "completes" the player's pattern — true even
// when that completion WINS on the spot, but the tag phrase ("threat to make four next move") is
// future tense and contradicts a position that is already over. Checked independently here via the
// production `checkWin` on the engine's own movestring (fv.movestring + fv.bestCol) — never trusted
// from a caller-supplied flag — so this stays correct even if a future caller stops threading one.
function isTerminalBestMove(fv) {
  if (fv?.bestCol == null) return false;
  const ms0 = fv.movestring ?? '';
  const { colHeights } = parseBoardState(ms0);
  const row = colHeights[fv.bestCol];
  if (row == null || row >= 6) return false;
  const { board: afterBoard } = parseBoardState(ms0 + String(fv.bestCol));
  return checkWin(afterBoard, row, fv.bestCol, fv.player);
}

// FR-012 / OI-195 remaining half a / T015. L2's "occupy" verb previously claimed the conceded cell
// unconditionally. On a `register: immediate` `realized_pattern` half (eval-33/eval-44/eval-45) the
// "conceded" cell is the punishment half's own THREAT square — the gravity-top empty cell the
// opponent now threatens, not one they have already taken — so "occupy" over-claims: the square is
// still empty on the engine's own `opponentPunishment.finalMovestring`. Checked directly against
// that movestring, never inferred from `register` or `kind` (a fork's conceded cell IS occupied,
// e.g. pin-L2-enabled-opponent / pin-branch-invariance-false).
function cellOccupiedOn(finalMovestring, cell) {
  if (!finalMovestring || !cell) return false;
  const m = /^c(\d+)r(\d+)$/.exec(cell);
  if (!m) return false;
  const col = Number(m[1]) - 1, row = Number(m[2]) - 1;
  const { board } = parseBoardState(finalMovestring);
  return !!(board[row] && board[row][col]);
}

const CODES_REALIZED = [
  'route', 'tag', 'direction',
  'lostResource.kind', 'lostResource.verdict', 'lostResource.register', 'lostResource.terminal',
  'opponentPunishment.kind', 'opponentPunishment.verdict', 'opponentPunishment.register', 'opponentPunishment.terminal',
  'opponentPunishment.tie.kind',
];
const CODES_SIGN = [
  'route', 'lostResource.kind', 'opponentPunishment.kind', 'opponentPunishment.verdict',
  'lostResource.terminal', 'opponentPunishment.terminal', 'lostResource.forkCase', 'opponentPunishment.forkCase',
  'opponentPunishment.tie.kind', 'opponentPunishment.tie.tied',
  'lostResource.register', 'opponentPunishment.register',
];

const hasSharedCell = (fv) =>
  !!(fv.opponentPunishment?.tie?.sharedCells?.length) || !!(fv.opponentPunishment?.cell);

// ── Composer helpers (P3) ──
const col1 = (c) => (c == null ? '?' : c + 1);
// Exported (spec 058, US2): deriveRequiredSet (renderReasonModel.mjs) reuses this exact precedence
// rather than reimplementing the `??` chain — see spec.md's Derivation Rule.
export const denialCell = (h) => h?.cell ?? h?.completingCell ?? null;
const horizonPhrase = (reg) =>
  reg === 'forced_sequence' ? 'deep on a forced line'
  : reg === 'parity' ? 'deep, via a parity battle'
  : 'near-term';
const forkOrParity = (h) => (h?.terminal === 'fork' ? 'fork' : h?.register === 'parity' ? 'parity line' : 'forced line');
const pliesTail = (fv) => (fv?.pliesToEnd != null ? ` (~${fv.pliesToEnd} plies)` : '');

// FR-014a / OI-194 / T022. `assembleGroundedPrompt` forbids the model from ever writing a raw
// `cNrM` square, but the L1/L2/L3/L4/L8 templates below were interpolating `completingCell`/`window`
// values verbatim into the very frame text the model is told to build on — the same "taught but not
// offered" contradiction as OI-189, one level up. `cellColumn`/`windowColumns` give these templates
// the SAME "column N" display form the col1()-based bestCol/playedCol mentions already use, instead
// of a raw cell token — never the row, which was never load-bearing in prose here. `col1` is not
// reused directly because these take a `cNrM` STRING (1-indexed column baked in), not a 0-indexed
// column number.
const CELL_RE = /^c(\d+)r\d+$/;
function cellColumn(cell) {
  const m = CELL_RE.exec(cell ?? '');
  return m ? `column ${m[1]}` : 'that square';
}

// Regression fix (2026-08-28, post-Epic-12 review). `cellColumn` alone collapses two DIFFERENT
// squares that share a column into the identical phrase within one frame — e.g. eval-11 (L6) named
// both `c2r5` (the player's own completing cell) and `c2r4` (the opponent's completing cell) as
// "column 2", so the frame read as self-contradictory ("you had a win via column 2 ... opponent
// forces their own win via column 2"). `cellPhrase(cell, others)` renders the same "column N" prose
// as before whenever no OTHER cell named in the same frame shares that column (the common case, and
// what keeps existing wording byte-identical for the vast majority of records) — but switches to a
// truthful, height-disambiguated form ("the lower/upper square in column N") when a genuine sibling
// collision exists, decided by the real row values (row 1 = bottom, per this project's convention).
// `others` must include every cNrM cell named in the SAME frame (self-comparisons are filtered out
// by identity, not by omission, so callers can safely pass a fixed list per template).
const CELL_RC_RE = /^c(\d+)r(\d+)$/;
function parseCell(cell) {
  const m = CELL_RC_RE.exec(cell ?? '');
  return m ? { col: Number(m[1]), row: Number(m[2]) } : null;
}
function cellPhrase(cell, others = []) {
  const p = parseCell(cell);
  if (!p) return 'that square';
  const conflicts = others.filter((o) => o && o !== cell).map(parseCell).filter((o) => o && o.col === p.col);
  if (!conflicts.length) return `column ${p.col}`;
  const rows = conflicts.map((c) => c.row);
  if (rows.every((r) => p.row < r)) return `the lower square in column ${p.col}`;
  if (rows.every((r) => p.row > r)) return `the upper square in column ${p.col}`;
  // 3+ distinct heights sharing a column, or a genuine row tie: not observed in the current corpus.
  // Falls back to the plain column phrase rather than asserting an unsupported height claim.
  return `column ${p.col}`;
}
function windowColumns(w) {
  const cols = (Array.isArray(w) ? w : [])
    .map((c) => { const m = CELL_RE.exec(c ?? ''); return m ? Number(m[1]) : null; })
    .filter((c) => c != null);
  const uniq = [...new Set(cols)].sort((a, b) => a - b);
  if (!uniq.length) return 'that line';
  if (uniq.length === 1) return `column ${uniq[0]}`;
  return `columns ${uniq.slice(0, -1).join(', ')} and ${uniq[uniq.length - 1]}`;
}

// Canonical Connect Four vocabulary: the composed player-facing text must speak theory, not engine
// slugs. Every internal tactic tag maps to its plain-language C4 phrase so a downstream coach never
// echoes a raw slug (immediate_threat / double_threat / figure_7). One map, all tags.
export const TAG_PHRASE = {
  immediate_threat: 'threat to make four next move',
  double_threat: 'double threat (two winning squares at once)',
  figure_7: '7-shaped double threat',
  claimeven: 'claimeven',
  conditional_swindle: 'practical swindle',
};
const plainTag = (t) => TAG_PHRASE[t] ?? 'threat';

// FR-009 / OI-188 / T016. `TAG_PHRASE.immediate_threat` ("threat to make four next move") is a
// GLOSSARY definition of the slug, correct wherever it names a concept in the abstract (the required
// block, the term glossary). It over-claims when used to narrate a SPECIFIC cell on a SPECIFIC board:
// on eval-37 / pin-branch-invariance-true-2 the opponent's `immediate_threat` cell is `major` on the
// decision board's own tactics list (column not yet filled to gravity-top) — "next move" is false
// there. `plainTagForCellGrain` checks the board's own grain (via `grainOf`, the same detector the
// rendered tactics block uses) before choosing wording, so the frame can never assert a grain the
// board itself does not carry for that cell.
function plainTagForCellGrain(tag, movestring, perspectivePlayer, cell, owner) {
  if (tag !== 'immediate_threat') return plainTag(tag);
  const grain = grainOf(movestring, perspectivePlayer, cell, owner);
  if (grain === 'immediate') return TAG_PHRASE.immediate_threat;         // gravity-top: "next move" holds
  if (grain === 'major') return 'four-in-a-row threat (not yet reachable — the column needs to fill first)';
  return 'threat';                                                       // deep / not board-true here — hedge
}

// Parenthetical -> prose, 2026-08-25 (L1, L2, L4, L8 — the last four still using `(col N)`).
//
// These four were held back DELIBERATELY as a control group when L5/L6/L9 were converted, on the
// measurement that `(col N)` failed A6 on only ~9% of mid/late runs against 0% for prose — too small
// to justify rewriting four working templates. The control group did its job and returned the
// OPPOSITE answer: on the final 25-board run the gap had WIDENED to 16% vs 0%, i.e. the parenthetical
// form was costing 7 of 45 mid/late runs against 0 of 15 for prose. That fired the deferral's own
// revisit condition, so the control group is now spent and all nine links state the column as prose.
//
// Only the COLUMN MENTION changed. Every cell, tag, window, horizon and clause order in these four
// templates is byte-identical, so the next measurement reads one variable.
//
// 2026-08-27 update (T022, FR-014a): the raw `cNrM` notation these templates carried (OI-194) is now
// fixed too — see `cellColumn`/`windowColumns` above. L1/L2/L3/L4/L8 (L3 was already grain-aware via
// T016) now name every cell/window as "column N" prose instead of a raw square.
//
// 2026-08-28 update (B1, FR-014/SC-011): L5/L6/L9 (the remaining raw-coordinate producers — 9+11+3 =
// 23/63 corpus records measured before this fix) now use the same `cellColumn`/`windowColumns`
// treatment. L7 was already coordinate-free (no cell/window mention in its template). `link.text` is
// now 0/63 raw-coordinate across the corpus (see renderCoverageCorpus.test.mjs's FR-014 sweep).
export const CAUSAL_LINKS = [
  // ── Family 1: realized_denied (checked first; L3 before L2) ──
  { id: 'L1', family: 'realized_denied', confidence: 'high',
    when: (fv) => fv.route === 'realized_denied' && fv.direction === 'missed_own',
    covers: CODES_REALIZED,
    guardrail: 'The correct move builds/completes YOUR pattern; do not attribute it to the opponent.',
    // Parenthetical -> prose (2026-08-25). See the block comment above CAUSAL_LINKS.
    // Q3 PROVISIONAL / T012 (FR-008, OI-203): when the better move WINS on the spot, the plain
    // template's tag phrase ("threat to make four next move") is future tense for a position that is
    // already over — eval-41 (5/5). The terminal branch states the win as a completed, present fact
    // and explicitly says the game is over there, instead of naming the tag at all.
    // FR-014a/T022 kept these as `cellColumn`; the 2026-08-28 fix uses `cellPhrase` so the two
    // named cells (completing cell, denial cell) disambiguate by height when they share a column.
    template: (fv) => {
      const completingCell = fv.lostResource?.completingCell;
      const denial = denialCell(fv.opponentPunishment);
      const others = [completingCell, denial];
      return isTerminalBestMove(fv)
        ? `Column ${col1(fv.bestCol)} was the better move: it wins on the spot, completing four in ${cellPhrase(completingCell, others)} — the game is over there. The played move let the opponent take ${cellPhrase(denial, others)} instead, denying you that win.`
        : `Column ${col1(fv.bestCol)} was the better move: it completes your ${plainTag(fv.lostResource?.tag)} in ${cellPhrase(completingCell, others)}; the played move let the opponent take ${cellPhrase(denial, others)}, denying it.`;
    } },
  // L4 guardrail is case-gated (task 9c): on lose_to_faster_lose both moves lose, so the plain
  // missed-defense framing must gain L3's hold-the-line clause to avoid implying the played move
  // caused the loss or that the player is lost. Every other case keeps the original text verbatim.
  { id: 'L4', family: 'realized_denied', confidence: 'high',
    when: (fv) => fv.route === 'realized_denied' && fv.direction === 'defensive_miss',
    covers: CODES_REALIZED,
    guardrail: (fv) => fv.case === 'lose_to_faster_lose'
      ? 'The better move blocks the opponent pattern; frame it as a missed defense. MUST NOT say the played move caused or enabled the pattern, and MUST NOT tell the player they are lost; both moves lose, but the better one makes the opponent work hardest — frame it as the toughest defense. Do not add a closing caveat like "but the position is still lost," "both lines end poorly," "the result still goes against you," or "you still lose either way" — the practical-resistance framing must stand on its own, with no defeatist final clause.'
      : 'The better move blocks the opponent pattern; frame it as a missed defense.',
    // 2026-08-28 fix: disambiguate the block cell against the opponent's own window cells — but
    // ONLY when the block cell is NOT itself a member of that window. A block cell that literally IS
    // one of the window's own four squares (the common case — blocking directly interrupts the
    // line) is not misleading when both are named "column N"; disambiguation is needed only when a
    // genuinely SEPARATE square happens to share the window's column (see `cellPhrase` above).
    template: (fv) => {
      const completingCell = fv.lostResource?.completingCell;
      const window = fv.opponentPunishment?.window ?? [];
      const others = window.includes(completingCell) ? [completingCell] : [completingCell, ...window];
      return `Column ${col1(fv.bestCol)} was the better move: it occupies ${cellPhrase(completingCell, others)}, blocking the opponent's threat through ${windowColumns(window)}; the played move skipped that defense.`;
    } },
  // L3/L2 discriminator: the SIGN `case` gates the OUTCOME sentence (D30, supersedes D28 sub-decision 3).
  // L3 asserts "you were already losing, both moves lose" — an OUTCOME claim, valid ONLY when both moves
  // lose (lose_to_faster_lose). patternOnAfterBestBoard is a GEOMETRIC fact (opponent threat cell present
  // on the after-best board) and is NOT equivalent to "the best line loses"; using it to pick L3 flipped
  // genuine win_to_lose/draw_to_lose cases into a false loss narration (eval-53 best WINS, eval-51 best
  // DRAWS). It stays informational in render_decision but never drives this routing.
  { id: 'L3', family: 'realized_denied', confidence: 'high',
    when: (fv) => fv.route === 'realized_denied' && fv.direction === 'enabled_opponent'
                  && fv.case === 'lose_to_faster_lose',
    covers: CODES_REALIZED,
    guardrail: 'MUST NOT say the played move caused or enabled the pattern, and MUST NOT tell the player they are lost; both moves lose, but the better one makes the opponent work hardest — frame it as the toughest defense. Do not add a closing caveat like "but the position is still lost," "both lines end poorly," "the result still goes against you," or "you still lose either way" — the practical-resistance framing must stand on its own, with no defeatist final clause.',
    // FR-009 / T016: grain-aware — see plainTagForCellGrain above.
    // FR-014a / T022: cell named as "column N" prose, not a raw cNrM token (OI-194).
    template: (fv) => `Your opponent's ${plainTagForCellGrain(fv.opponentPunishment?.tag, fv.movestring, fv.player, fv.opponentPunishment?.completingCell, 'opp')} in ${cellColumn(fv.opponentPunishment?.completingCell)} is coming no matter what you play here — your move didn't create it. Column ${col1(fv.bestCol)} makes your opponent work hardest for it; the move you played only speeds up the finish.` },
  { id: 'L2', family: 'realized_denied', confidence: 'high',
    when: (fv) => fv.route === 'realized_denied' && fv.direction === 'enabled_opponent'
                  && fv.case !== 'lose_to_faster_lose',
    covers: CODES_REALIZED,
    guardrail: 'The played move genuinely handed the opponent the pattern; name the conceded cell.',
    // OI-195. The conceded square is the one the two halves SHARE — `tie.sharedCells` — not the
    // punishment half's `completingCell`. For a `double_threat` the completing cell is one of the
    // fork's two REMOTE winning squares, which the opponent has not taken and may never take;
    // the shared cell is the square the better move would have occupied and the opponent got
    // instead. Measured on pin-L2-enabled-opponent (and its branch-invariance twin): the template
    // said the opponent occupied `c2r1`, which is still EMPTY on the half's own finalMovestring
    // `33432`, while the opponent actually landed on `c3r1` = tie.sharedCells[0]; 4 of 5 runs
    // repeated the board-false claim. Validated across the full L2 case space (the 5 L2-routed
    // corpus records): in eval-33 / eval-44 / eval-45 `tie.sharedCells[0]` EQUALS the completing
    // cell, so their frame text is byte-identical and only the two defective records move.
    // The `?? completingCell` fallback keeps a half with no tie rendering exactly as before.
    //
    // T015 (FR-012): the verb now checks board truth via `cellOccupiedOn` instead of unconditionally
    // claiming occupation — see the helper's comment above.
    // T022 (FR-014a): every cell/window mention is now "column N" prose, not a raw cNrM token
    // (OI-194) — `cellOccupiedOn` itself still checks the raw `conceded` string, only the rendered
    // text changed.
    // 2026-08-28 fix: `conceded` and `denial` disambiguate against each other by height when they
    // share a column (`cellPhrase`); each also disambiguates against the opponent's own window
    // cells UNLESS it is itself a member of that window (see the L4 comment above for why — a cell
    // literally inside the line it is named alongside is not a collision).
    template: (fv) => {
      const conceded = fv.opponentPunishment?.tie?.sharedCells?.[0]
        ?? fv.opponentPunishment?.completingCell;
      const occupied = cellOccupiedOn(fv.opponentPunishment?.finalMovestring, conceded);
      const window = fv.opponentPunishment?.window ?? [];
      const denial = denialCell(fv.lostResource);
      const concededOthers = [conceded, denial, ...(window.includes(conceded) ? [] : window)].filter(Boolean);
      const concededCol = cellPhrase(conceded, concededOthers);
      const verb = occupied
        ? `occupy ${concededCol}, completing their ${plainTag(fv.opponentPunishment?.tag)} through ${windowColumns(window)}`
        : `open a path to ${concededCol}, threatening their ${plainTag(fv.opponentPunishment?.tag)} through ${windowColumns(window)}`;
      const denialOthers = [denial, conceded, ...(window.includes(denial) ? [] : window)].filter(Boolean);
      return `Your move let the opponent ${verb}; column ${col1(fv.bestCol)} was the better move and would have denied it${denial ? ` in ${cellPhrase(denial, denialOthers)}` : ''}.`;
    } },
  // ── Family 2: sign (L9 refinement before L5/L6) ──
  { id: 'L7', family: 'sign', confidence: 'high',
    when: (fv) => fv.route !== 'realized_denied' && fv.lostResource?.kind === 'conditional_swindle',
    covers: CODES_SIGN,
    guardrail: 'Do not claim the better move wins, and do NOT tell the player they are lost; frame the better move as the toughest, most resilient defense that keeps the practical swindle alive. Do not add a closing caveat like "but the position is still lost," "both lines end poorly," "the result still goes against you," or "you still lose either way" — the practical-resistance framing must stand on its own, with no defeatist final clause.',
    template: (fv) => {
      const w = fv.gate?.witness;
      const op = w?.oppPlies;
      const dc = (w?.devCols ?? []).map((c) => col1(c));
      const watch = dc.length ? ` (watch columns ${dc.join(', ')})` : '';
      const swindle = op == null ? ''
        : op > 0
          ? ` — if your opponent slips within about ${op} moves${watch}, you can climb back in`
          : ` — one slip by your opponent${watch} could let you climb back in`;
      return `Column ${col1(fv.bestCol)} is your most stubborn defense: it keeps a practical swindle alive${swindle}. The move you played gives that up and lets your opponent finish faster.`;
    } },
  { id: 'L8', family: 'sign', confidence: 'high',
    when: (fv) => fv.route !== 'realized_denied' && fv.case === 'draw_to_lose',
    covers: CODES_SIGN,
    guardrail: 'The position was a draw; the played move abandoned a defensive resource.',
    // 2026-08-28 fix: `cellPhrase` disambiguates the hold cell from the opponent's completing cell
    // by height when they are different squares sharing a column.
    template: (fv) => {
      const holdCell = fv.lostResource?.completingCell;
      const oppCell = fv.opponentPunishment?.completingCell;
      const others = [holdCell, oppCell];
      return `The position was a draw; column ${col1(fv.bestCol)} was the better move and holds it by occupying ${cellPhrase(holdCell, others)}. The played move abandons it — the opponent now has a forced win (${horizonPhrase(fv.opponentPunishment?.register)}${pliesTail(fv)}, completing in ${cellPhrase(oppCell, others)}).`;
    } },
  { id: 'L9', family: 'sign', confidence: 'low',
    when: (fv) => fv.route !== 'realized_denied' && fv.lostResource?.kind === 'winning_line'
                  && fv.lostResource?.register === 'parity' && !hasSharedCell(fv),
    covers: ['route', 'lostResource.terminal', 'opponentPunishment.terminal'],
    guardrail: 'The culprit square is not cleanly isolable; hedge — do not fabricate a crisp cause.',
    // B1 (FR-014/SC-011): the winning group is now named as column prose, not a raw `cNrM·cNrM` list.
    template: (fv) => `You had a parity/zugzwang win (resolves ${horizonPhrase(fv.lostResource?.register)}${pliesTail(fv)}), and column ${col1(fv.bestCol)} was the move that kept it. The played move loses the parity battle — the exact culprit square isn't cleanly isolable. The winning group runs through ${windowColumns(fv.lostResource?.window)}.` },
  { id: 'L5', family: 'sign', confidence: 'high',
    when: (fv) => fv.route !== 'realized_denied' && fv.lostResource?.kind === 'winning_line'
                  && fv.opponentPunishment?.kind === 'denial',
    covers: CODES_SIGN,
    guardrail: 'You had a forced win; state its horizon honestly (may be deep). The played move let the opponent deny it.',
    // B1 (FR-014/SC-011): completing/denial cells named as "column N" prose (OI-194 class), not raw cNrM.
    // 2026-08-28 fix: `cellPhrase` disambiguates the two cells by height when they share a column
    // but are genuinely different squares (they are frequently the SAME square — the denial cell
    // IS the completing cell — in which case cellPhrase renders "column N" for both, unchanged).
    template: (fv) => {
      const completingCell = fv.lostResource?.completingCell;
      const denial = denialCell(fv.opponentPunishment);
      const others = [completingCell, denial];
      return `You had a forced win — it resolves ${horizonPhrase(fv.lostResource?.register)}${pliesTail(fv)} via a ${forkOrParity(fv.lostResource)} completing at ${cellPhrase(completingCell, others)}. Column ${col1(fv.bestCol)} was the move that kept it; the played move let the opponent deny it at ${cellPhrase(denial, others)}.`;
    } },
  { id: 'L6', family: 'sign', confidence: 'high',
    when: (fv) => fv.route !== 'realized_denied' && fv.lostResource?.kind === 'winning_line'
                  && fv.opponentPunishment?.kind === 'winning_line',
    covers: CODES_SIGN,
    guardrail: 'You gave up a win AND handed the opponent their own; name both lines with their horizons.',
    // B1 (FR-014/SC-011): both completing cells named as "column N" prose (OI-194 class), not raw cNrM.
    // 2026-08-28 fix: this is the confirmed regression (eval-11: c2r5/c2r6 both rendered "column 2",
    // making the two forced wins sound like the same square). `cellPhrase` disambiguates by height
    // whenever the two completing cells are genuinely different squares in the same column.
    template: (fv) => {
      const yourCell = fv.lostResource?.completingCell;
      const oppCell = fv.opponentPunishment?.completingCell;
      const others = [yourCell, oppCell];
      return `You had a forced win via ${cellPhrase(yourCell, others)} (${horizonPhrase(fv.lostResource?.register)}${pliesTail(fv)}), and column ${col1(fv.bestCol)} was the move that kept it. The played move gives it up AND lets the opponent force their own win via ${cellPhrase(oppCell, others)}.`;
    } },
];

export function classifyCausalLink(fv, ctx = {}) {
  for (const link of CAUSAL_LINKS) {
    if (link.when(fv, ctx)) {
      const guardrail = typeof link.guardrail === 'function' ? link.guardrail(fv, ctx) : link.guardrail;
      return { id: link.id, confidence: link.confidence, covers: link.covers,
               guardrail, text: link.template ? link.template(fv, ctx) : '' };
    }
  }
  throw new Error(`classifyCausalLink: no rule matched (case=${fv.case} route=${fv.route} direction=${fv.direction})`);
}
