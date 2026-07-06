// Single source of truth for the causal-explanation rules (spec §3b/§3d).
// Consumed by the render composer, the grader rubric, and the board sampler.
// Phase 1: `when` classification + `covers`/`guardrail` data. Rich `template()` text lands in P3.

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
const denialCell = (h) => h?.cell ?? h?.completingCell ?? null;
const horizonPhrase = (reg) =>
  reg === 'forced_sequence' ? 'deep on a forced line'
  : reg === 'parity' ? 'deep, via a parity battle'
  : 'near-term';
const forkOrParity = (h) => (h?.terminal === 'fork' ? 'fork' : h?.register === 'parity' ? 'parity line' : 'forced line');
const pliesTail = (fv) => (fv?.pliesToEnd != null ? ` (~${fv.pliesToEnd} plies)` : '');
const cells = (w) => (Array.isArray(w) ? w.join('·') : '');

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

export const CAUSAL_LINKS = [
  // ── Family 1: realized_denied (checked first; L3 before L2) ──
  { id: 'L1', family: 'realized_denied', confidence: 'high',
    when: (fv) => fv.route === 'realized_denied' && fv.direction === 'missed_own',
    covers: CODES_REALIZED,
    guardrail: 'The correct move builds/completes YOUR pattern; do not attribute it to the opponent.',
    template: (fv) => `The better move (col ${col1(fv.bestCol)}) completes your ${plainTag(fv.lostResource?.tag)} at ${fv.lostResource?.completingCell}; the played move let the opponent take ${denialCell(fv.opponentPunishment)}, denying it.` },
  { id: 'L4', family: 'realized_denied', confidence: 'high',
    when: (fv) => fv.route === 'realized_denied' && fv.direction === 'defensive_miss',
    covers: CODES_REALIZED,
    guardrail: 'The better move blocks the opponent pattern; frame it as a missed defense.',
    template: (fv) => `The better move (col ${col1(fv.bestCol)}) occupies ${fv.lostResource?.completingCell}, blocking the opponent's threat on ${cells(fv.opponentPunishment?.window)}; the played move skipped that defense.` },
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
    guardrail: 'MUST NOT say the played move caused or enabled the pattern, and MUST NOT tell the player they are lost; both moves lose, but the better one makes the opponent work hardest — frame it as the toughest defense.',
    template: (fv) => `Your opponent's ${plainTag(fv.opponentPunishment?.tag)} at ${fv.opponentPunishment?.completingCell} is coming no matter what you play here — your move didn't create it. Column ${col1(fv.bestCol)} makes your opponent work hardest for it; the move you played only speeds up the finish.` },
  { id: 'L2', family: 'realized_denied', confidence: 'high',
    when: (fv) => fv.route === 'realized_denied' && fv.direction === 'enabled_opponent'
                  && fv.case !== 'lose_to_faster_lose',
    covers: CODES_REALIZED,
    guardrail: 'The played move genuinely handed the opponent the pattern; name the conceded cell.',
    template: (fv) => `Your move let the opponent occupy ${fv.opponentPunishment?.completingCell}, completing their ${plainTag(fv.opponentPunishment?.tag)} on ${cells(fv.opponentPunishment?.window)}; the better move (col ${col1(fv.bestCol)}) denied it${denialCell(fv.lostResource) ? ` at ${denialCell(fv.lostResource)}` : ''}.` },
  // ── Family 2: sign (L9 refinement before L5/L6) ──
  { id: 'L7', family: 'sign', confidence: 'high',
    when: (fv) => fv.route !== 'realized_denied' && fv.lostResource?.kind === 'conditional_swindle',
    covers: CODES_SIGN,
    guardrail: 'Do not claim the better move wins, and do NOT tell the player they are lost; frame the better move as the toughest, most resilient defense that keeps the practical swindle alive.',
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
    template: (fv) => `The position was a draw; the better move (col ${col1(fv.bestCol)}) holds it by occupying ${fv.lostResource?.completingCell}. The played move abandons it — the opponent now has a forced win (${horizonPhrase(fv.opponentPunishment?.register)}${pliesTail(fv)}, completing at ${fv.opponentPunishment?.completingCell}).` },
  { id: 'L9', family: 'sign', confidence: 'low',
    when: (fv) => fv.route !== 'realized_denied' && fv.lostResource?.kind === 'winning_line'
                  && fv.lostResource?.register === 'parity' && !hasSharedCell(fv),
    covers: ['route', 'lostResource.terminal', 'opponentPunishment.terminal'],
    guardrail: 'The culprit square is not cleanly isolable; hedge — do not fabricate a crisp cause.',
    template: (fv) => `You had a parity/zugzwang win (resolves ${horizonPhrase(fv.lostResource?.register)}${pliesTail(fv)}); the played move loses the parity battle — the exact culprit square isn't cleanly isolable. The winning group runs through ${cells(fv.lostResource?.window)}.` },
  { id: 'L5', family: 'sign', confidence: 'high',
    when: (fv) => fv.route !== 'realized_denied' && fv.lostResource?.kind === 'winning_line'
                  && fv.opponentPunishment?.kind === 'denial',
    covers: CODES_SIGN,
    guardrail: 'You had a forced win; state its horizon honestly (may be deep). The played move let the opponent deny it.',
    template: (fv) => `You had a forced win — it resolves ${horizonPhrase(fv.lostResource?.register)}${pliesTail(fv)} via a ${forkOrParity(fv.lostResource)} completing at ${fv.lostResource?.completingCell}. The played move let the opponent deny it at ${denialCell(fv.opponentPunishment)}.` },
  { id: 'L6', family: 'sign', confidence: 'high',
    when: (fv) => fv.route !== 'realized_denied' && fv.lostResource?.kind === 'winning_line'
                  && fv.opponentPunishment?.kind === 'winning_line',
    covers: CODES_SIGN,
    guardrail: 'You gave up a win AND handed the opponent their own; name both lines with their horizons.',
    template: (fv) => `You had a forced win via ${fv.lostResource?.completingCell} (${horizonPhrase(fv.lostResource?.register)}${pliesTail(fv)}); the played move gives it up AND lets the opponent force their own win via ${fv.opponentPunishment?.completingCell}.` },
];

export function classifyCausalLink(fv, ctx = {}) {
  for (const link of CAUSAL_LINKS) {
    if (link.when(fv, ctx)) {
      return { id: link.id, confidence: link.confidence, covers: link.covers,
               guardrail: link.guardrail, text: link.template ? link.template(fv, ctx) : '' };
    }
  }
  throw new Error(`classifyCausalLink: no rule matched (case=${fv.case} route=${fv.route} direction=${fv.direction})`);
}
