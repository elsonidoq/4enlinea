// Single source of truth for coach-annotation tags (zones = board highlights; terms = KB popups).
// Render-time: buildAnnotationOffer derives the OFFERED alias set + term vocabulary from the near-term
// board tags + the two move columns. Post-LLM: normalizeAnnotationTags + processAnnotations repair,
// validate-against-offered, expand handles -> real specs, and derive key_cells. Pure; no solver/engine.

import { expandSpec } from '../../zoneParser.js';
import { TAG_PHRASE } from './causalLinks.mjs';   // single source of truth for canonical phrases (M1)
import { horizonForRegister, statusOf } from '../reasonCellGrounding.mjs';
import { parseBoardState } from '../../classifier.js';

// Boards whose tags may become highlights: near-term only (spec decision #5 — the projected-deep board
// stays horizon prose so an empty deep cell never reads as a present threat).
const NEAR_TERM = new Set(['decision', 'afterBest', 'afterPlayed']);

// Only STRUCTURAL, board-true tag kinds (from getMajorThreatCells) become highlights. The vector-named
// OVERLAY kinds (figure_7 / double_threat, injected onto the DECISION board by reasonBoardSelect.mjs's
// patternOpts) are deliberately EXCLUDED: they often name a resource that completes deep, and
// highlighting a deep, currently-empty square is exactly the eval-3 present-threat trap decision #5
// forbids. A genuinely near-term fork still surfaces as a structural 'double' on the board where it is
// real; a deep fork gets no highlight and stays horizon prose. (C1 fix.)
const STRUCTURAL = new Set(['immediate', 'major', 'double']);

// Structural kind -> KB term slug. Only kinds with a KB-backed entry ('major' has none).
const KIND_TO_SLUG = { immediate: 'immediate_threat', double: 'double_threat' };

// The ONLY slugs with a resolvable KB entry (through production's PATTERN_KB -> a KB file). kbId is the
// tag key (production's [term:<key>] convention). canonicalPhrase is imported from TAG_PHRASE (no local
// copy); only description (the one-line prompt gloss) + kbId are local. conditional_swindle is
// intentionally ABSENT — it has no KB entry, so a [term:...] popup would render empty. (C2 fix.)
const TERM_KB = {
  immediate_threat: { kbId: 'immediate_threat', description: 'a square where four-in-a-row completes on the very next move' },
  double_threat:    { kbId: 'double_threat', description: 'two winning squares at once — the opponent cannot block both' },
  figure_7:         { kbId: 'figure_7', description: 'a 7-shaped fork giving two winning squares at once' },
  claimeven:        { kbId: 'claimeven', description: 'controlling the even squares of a column to guarantee a threat' },
};

// T033 (FR-024, OI-184). TERM_KB.double_threat's static description silently assumes the fork
// belongs to the reader's side ("the opponent cannot block both") — board-false whenever the
// OPPONENT is the one holding the fork (eval-13: only `opponentPunishment.tacticTag ===
// 'double_threat'` fires it, owner 'opp'). `describeTerm` re-derives the description from the actual
// owner(s) that fired the slug in THIS record (tracked as a Set in `fired`, below) — a single owner
// gets a directional description; a slug fired by BOTH owners in one record (ownership genuinely not
// determinable from the term alone) falls back to a neutral, side-agnostic phrasing. Only
// `double_threat` carries a directional claim today — `immediate_threat`/`figure_7`/`claimeven` are
// already side-neutral and pass through unchanged.
function describeTerm(slug, owners) {
  if (slug === 'double_threat' && owners && owners.size === 1) {
    const [owner] = owners;
    return owner === 'you'
      ? 'two winning squares at once — your opponent cannot block both'
      : 'two winning squares at once — you cannot block both';
  }
  if (slug === 'double_threat') {
    return 'two winning squares at once for whichever side holds it — the other side cannot block both';
  }
  return TERM_KB[slug].description;
}

// The closed set of slugs that can ever be OFFERED as a [term:...] (task 9b): the render layer needs
// this to know which slugs are safe to display unconditionally vs which must be redacted/conditioned
// on `zones.terms`. Exported so renderReasonModel.mjs has one source of truth instead of a mirrored
// literal.
export const OFFERABLE_TERM_SLUGS = Object.keys(TERM_KB);

// Plain-language role text per (owner, kind) for the prompt's "Highlightable regions" list.
// kind === 'future' (US1, deep-reveal-grounding spec 058) is a deep fork cell — it must read as
// something that matters LATER, once a forced sequence reaches it, never as a present threat
// (FR-002; Settled decision 8(b)). This is deliberately distinct wording from the 'double' branch
// below, which describes a genuinely near-term, right-now fork.
// The LINE-vs-SQUARE steer (spec 058 feedback remediation, attempt 2 — fix 2). Measured: the engine
// offered the real line (`future:windows:c2r5,c3r5,c4r5,c5r5` — the "column 2 to column 5 strip" the
// human asked for) and the model still wrote "the square that keeps your later four-in-a-row line
// alive", grounding a LINE phrase on a single endpoint cell. The role text is where the model reads
// what a handle IS, so the disambiguation belongs here, not only in the block-level instructions.
const LINE_STEER = 'a LINE of four squares, not a single square — use this handle, not a single-square '
  + 'handle, whenever your words say "line", "strip" or "row of four"';

// T030 (FR-021, OI-198). The possessive/verb-agreement defect is a CLASS, not one string: any branch
// that interpolates `${who}` ("you" / "your opponent") into a verb or possessive position must
// conjugate for BOTH — "you" takes the bare/plural verb form ("you get", "you play"), "your opponent"
// takes third-person singular ("your opponent gets", "your opponent plays"), and "you" possessive is
// "your" (never "you's"). These two helpers are the single conjugation point every branch below goes
// through — no branch may interpolate `${who}` directly into a verb or possessive again.
function possessive(owner) {
  return owner === 'you' ? 'your' : "your opponent's";
}
function conj(owner, base) {
  return owner === 'you' ? base : `${base}s`;
}

function roleText(owner, kind) {
  const who = owner === 'you' ? 'you' : 'your opponent';
  if (kind === 'immediate') return `the single square where ${who} can make four next move`;
  // T031 (FR-022, OI-180). The spec this role text describes (`window`) can carry more than 2 cells
  // — a board-tag 'double' fires whenever one owner has majors in >=2 distinct columns, and
  // `halfForkCellsSpec` (reasonBoardTags.mjs, OI-180, out of scope for this file) can bundle 3+
  // disjoint endpoints into one `windows:` group (eval-47: `you-double` = 3 cells). This file cannot
  // change the producer, so THIS side is the authoritative fix: the role text no longer claims a
  // singular "fork square" — it names the squares generically, correct for 2 or more.
  if (kind === 'double') return `the fork squares where ${who} ${conj(owner, 'get')} winning squares at once`;
  if (kind === 'line') return `the whole four-in-a-row line ${who} ${owner === 'you' ? 'are' : 'is'} playing for (${LINE_STEER})`;
  // T024 (FR-015, OI-201). This branch used to omit the owner entirely — the model then had to guess
  // whose line it was reading and, measured on eval-2 (2/5 runs), handed the player's own winning
  // line to the opponent. Name the owner the same way the 'line' branch above does.
  if (kind === 'future-line') return `the whole four-in-a-row line ${who} ${owner === 'you' ? 'are' : 'is'} playing for — it decides this later, once the forced sequence reaches it, not a threat right now (${LINE_STEER})`;
  if (kind === 'future') return `this single square matters later, once the forced sequence reaches it — not a threat right now`;
  // D45: the multi-cell fork alias is now a REQUIRED group, so its role text is paraphrased on every
  // run — the singular 'future' wording made the model call a two-square fork "the later fork
  // square" (measured, t043 run 1).
  if (kind === 'future-fork') return `BOTH of the two squares ${who} can finish on — this is the fork itself, and it matters later, once the forced sequence reaches it, not right now`;
  // Fix round 4 (finding 2): `${who} plays` produced "the square you plays to CREATE the fork" —
  // ungrammatical, and it reached the model twice per record (Highlightable regions AND the required
  // set) on 13 corpus records. The surrounding branches conjugate explicitly (see the 'line' branch
  // above); these two now do the same.
  const plays = `${who} ${conj(owner, 'play')}`;
  // Fix 1 (spec 058 post-measure remediation, pin-L5-deep-fork): every OTHER 'future*' branch above
  // carries an explicit "not right now" contrast (`not a threat right now` / `not right now`); this
  // branch omitted it, and the model conflated a fork-creating cell 28 plies away with the actual
  // immediate best move. The contrast must rule out "play this now", not merely omit a claim about it.
  if (kind === 'fork-pivot') return `the square ${plays} to CREATE the fork — the move that makes both winning squares live at once; it matters later, once the forced sequence reaches it — it is NOT the move to play right now`;
  if (kind === 'fork-pivot-now') return `the square ${plays} to CREATE the fork — the move that makes both winning squares live at once`;
  // T030: was `${who}'s` — grammatical for "your opponent's" but produced "you's" for the owner
  // side. `possessive()` handles both.
  return `a single square completing ${possessive(owner)} four-in-a-row line`; // major
}

// Both tags are forks — figure_7's canonical phrase is literally '7-shaped double threat'
// (causalLinks.mjs TAG_PHRASE). All three fork branches below previously gated on 'double_threat'
// alone, so a figure_7 half got no fork alias at all (6 of the 20 fork halves in the corpus).
const FORK_TAGS = new Set(['double_threat', 'figure_7']);

// The square that CREATES the fork = the LAST ply of the half's own line. NOT `entryCell`, which the
// glossary defines as the FIRST move of `line` (feature-vector-glossary.md:168, reasonEngine.mjs:646)
// — the opposite end. On eval-18 entryCell is c6r3 (ply 1 of 28) while the fork is created at c5r4
// (ply 39); the two forkCells c5r5/c7r6 never appear in `line` at all, because they are the
// gravity-next squares above it, which is precisely why the last ply makes both live at once.
// Validated over the full case space: 20/20 fork halves in the corpus have a non-empty `line` whose
// last ply is neither a forkCell nor entryCell.
export function forkPivotCell(half) {
  if (!half || !FORK_TAGS.has(half.tacticTag)) return null;
  const line = half.line;
  if (!Array.isArray(line) || !line.length) return null;      // abstain, never guess (I2)
  const cell = line[line.length - 1]?.cell ?? null;
  if (!cell || (half.forkCells ?? []).includes(cell)) return null;
  return cell;
}

// A window-bearing tag becomes a windows: spec (the whole line); a plain tag becomes its cNrM cell.
function tagSpec(tag) {
  if (Array.isArray(tag.window) && tag.window.length) return 'windows:' + tag.window.join(',');
  return tag.cell; // already cNrM, a valid single-cell spec
}

// Which player does this half's GEOMETRY belong to? The half's position is not the answer: a
// `lostResource` whose kind is 'denial' or 'neutralization' describes the OPPONENT's line that the
// better move would have taken away, so offering it as "the line you are playing for" is board-false
// (measured: pin-L2, board 334 — the c2r1-c5r1 window holds two player-1 discs and none of player 2's,
// yet it was offered to the player-2 mover as their own). Only a half the mover would COMPLETE is
// theirs.
const OPPONENT_OWNED = new Set(['denial', 'neutralization']);
export function halfOwner(half, side) {
  const flipped = OPPONENT_OWNED.has(half?.kind);
  if (side === 'you') return flipped ? 'opp' : 'you';
  return flipped ? 'you' : 'opp';
}

export function buildAnnotationOffer(pruned, boardDecisions, opts = {}) {
  const aliases = [];
  const zoneAliasMap = {};
  const seen = new Set();           // dedup key: spec (first board wins => stable, board-true truthBoard)
  const handleCounts = new Map();   // for unique handle suffixes

  // OI-190. A deep alias used to be labelled with whichever projected board was built first, so on
  // the 38 corpus records where both halves are deep (and, measured, ALL 38 have different lines) one
  // half's cells named a continuation they are not true on. `boardSelectionDecisions` now renders one
  // projected board per deep line; this picks which of them an alias should name.
  //
  // The rule is BOARD TRUTH, not provenance: pick the deep board on which this alias's OWNER actually
  // occupies the geometry. Provenance alone is wrong for a flipped half — `halfOwner` re-owns a
  // `denial`/`neutralization` half to the other player, so e.g. eval-9's `you-key-square-2` (c3r5)
  // comes from `opponentPunishment` but is one of YOUR line's squares, and it is your disc only on
  // `lostResource`'s line. Binding it to its producing half's board would put an OPPONENT disc under a
  // `you-` handle — the exact contradiction OI-190 is about, reintroduced from the other side.
  //
  // Decided ONCE PER HALF over all that half's candidate cells (not per alias) so siblings never split
  // across boards, using the production board model (`parseBoardState` + `statusOf`) rather than a
  // hand-rolled occupancy proxy. Ties and a no-evidence result fall back to the half's own line, and
  // with fewer than two deep boards the answer is the single `projectedDeep` — so every pre-OI-190
  // single-board shape is byte-identical.
  const deepBoards = (boardDecisions ?? []).filter(
    (b) => b.shown && typeof b.id === 'string' && b.id.startsWith('projectedDeep') && b.movestring);
  const specCells = (raw) => (raw.startsWith('windows:')
    ? raw.slice('windows:'.length).split('|').flatMap((g) => g.split(','))
    : [raw]).filter((c) => /^c\d+r\d+$/.test(c));
  const ownLineBoard = (half) =>
    deepBoards.find((b) => b.movestring === half?.finalMovestring)?.id ?? 'projectedDeep';
  const deepBoardFor = (half, owner, rawSpecs) => {
    const own = ownLineBoard(half);
    if (deepBoards.length < 2) return own;
    const cells = [...new Set(rawSpecs.flatMap(specCells))];
    if (!cells.length) return own;
    const want = owner === 'you' ? 'occupied-you' : 'occupied-opp';
    let best = own, bestScore = 0;
    for (const b of deepBoards) {
      const { board, colHeights } = parseBoardState(b.movestring);
      const score = cells.filter(
        (c) => statusOf(c, board, colHeights, pruned.player) === want).length;
      if (score > bestScore || (score === bestScore && b.id === own)) { bestScore = score; best = b.id; }
    }
    return bestScore > 0 ? best : own;
  };

  // Resolved ONCE PER HALF, up front, over every cell that half can contribute — the deep-fork loop
  // below and the half-resource loop further down must agree, or one half's fork alias ends up on a
  // different board from its own key square and the two describe one idea from two continuations
  // (measured on eval-13/22/23 while the two loops each decided for themselves).
  const halfCellSpecs = (half) => [
    half?.completingCell,
    ...(half?.forkCells ?? []),
    ...(Array.isArray(half?.window) && half.window.length ? ['windows:' + half.window.join(',')] : []),
    ...(half?.forkWindows ?? []).map((w) => 'windows:' + w.join(',')),
  ].filter(Boolean);
  const deepBoardByHalf = new Map();
  for (const [half, side] of [[pruned.lostResource, 'you'], [pruned.opponentPunishment, 'opp']]) {
    if (!half) continue;
    deepBoardByHalf.set(half, deepBoardFor(half, halfOwner(half, side), halfCellSpecs(half)));
  }

  const mkHandle = (base) => {
    const n = (handleCounts.get(base) ?? 0) + 1;
    handleCounts.set(base, n);
    return n === 1 ? base : `${base}-${n}`;
  };

  // Move-column aliases — always offered (columns are never the "present-threat" trap).
  for (const [key, col, role] of [
    ['better-col', pruned.bestCol, 'the column of the better move'],
    ['played-col', pruned.playedCol, 'the column you played'],
  ]) {
    if (col == null) continue;
    const spec = `col${col + 1}`;
    aliases.push({ handle: key, spec, role, truthBoard: 'decision', kbId: null });
    zoneAliasMap[key] = spec;
  }

  // T025 (FR-016, OI-193). `forkPivotCell` (below) only ever sees a TAGGED half — `eval-47` has
  // neither half carrying a `tacticTag` at all, yet the board tags themselves carry a structural
  // 'double' (a board-geometry fork: majors for one owner in >=2 distinct columns), and that fork
  // gets NO pivot handle today. The pivot for a board-tag fork is the move that turned the board
  // from "no fork" into "fork" — i.e. the move applied to reach THIS board from the decision board
  // (the same `applyCol` construction `boardSelectionDecisions` itself uses: 'afterBest' <-
  // `pruned.bestCol`, 'afterPlayed' <- `pruned.playedCol`; 'decision' has no creating move — abstain,
  // I2). Verified on eval-47: bestCol lands at c5r4 (not in the afterBest double's own window
  // c3r6/c6r5/c7r2) and playedCol lands at c3r6 (not in the afterPlayed double's window c5r4/c7r4) —
  // in both cases the landing cell is genuinely the pivot, not one of the fork's own finishing
  // squares.
  const decisionMovestring = boardDecisions.find((b) => b.id === 'decision')?.movestring ?? '';
  const pivotCreatingCol = (boardId) => (boardId === 'afterBest' ? pruned.bestCol
    : boardId === 'afterPlayed' ? pruned.playedCol : null);
  const boardTagPivotCell = (boardId) => {
    const col = pivotCreatingCol(boardId);
    if (col == null || !decisionMovestring) return null;
    let colHeights;
    try { ({ colHeights } = parseBoardState(decisionMovestring)); } catch { return null; }
    const row = colHeights[col];
    if (row == null || row >= 6) return null;
    return rcToCellStr({ col, row });
  };

  // Structural tag aliases from near-term boards, in board order so truthBoard = first appearance
  // (which, for a structural tag, is a board where the tactic is genuinely board-true).
  for (const board of boardDecisions) {
    if (!NEAR_TERM.has(board.id)) continue;
    for (const tag of board.tags ?? []) {
      if (!STRUCTURAL.has(tag.kind)) continue;         // skip overlay named-pattern tags (deep) — C1
      const spec = tagSpec(tag);
      if (seen.has(spec)) continue;
      seen.add(spec);
      const handle = mkHandle(`${tag.owner}-${tag.kind}`);  // kinds are already [a-z-]-safe
      aliases.push({ handle, spec, role: roleText(tag.owner, tag.kind), truthBoard: board.id,
                     kbId: KIND_TO_SLUG[tag.kind] ?? null });
      zoneAliasMap[handle] = spec;
      // Additive line alias (ask 2b): the same board-true major also offers the 4-cell line it
      // completes, so the phrase "four-in-a-row line" can be grounded to a LINE, not one square.
      // The cell alias above is untouched — both are offered.
      if (Array.isArray(tag.lineWindow) && tag.lineWindow.length) {
        const lineSpec = 'windows:' + tag.lineWindow.join(',');
        if (!seen.has(lineSpec)) {
          seen.add(lineSpec);
          const lh = mkHandle(`${tag.owner}-${tag.kind}-line`);
          aliases.push({ handle: lh, spec: lineSpec, role: roleText(tag.owner, 'line'),
                         truthBoard: board.id, kbId: null });
          zoneAliasMap[lh] = lineSpec;
        }
      }
      // T025: only when this owner has no TAGGED-half fork of their own — that case already gets its
      // pivot from the `halfPairs` loop below (forkPivotCell).
      if (tag.kind === 'double') {
        const ownerHalf = tag.owner === 'you' ? pruned.lostResource : pruned.opponentPunishment;
        const hasTaggedFork = ownerHalf && FORK_TAGS.has(ownerHalf.tacticTag);
        if (!hasTaggedFork) {
          const pivot = boardTagPivotCell(board.id);
          const windowCells = tag.window ?? [tag.cell];
          // Guard is SAME-BOARD only — a cell can legitimately carry a different, non-contradictory
          // role on a DIFFERENT board (exactly like a structural tag and a `future:` alias for the
          // same geometry already coexist elsewhere in this file), so this deliberately does NOT
          // consult the cross-board `seen` set or add to it. Measured on eval-47: BOTH candidate
          // pivot cells (c5r4 for afterBest, c3r6 for afterPlayed) are themselves immediate-threat
          // cells on the OTHER near-term board — a cross-board dedupe here would let whichever board
          // is iterated first silently swallow the other's pivot, leaving eval-47 with zero again.
          const sameBoardTaken = new Set((board.tags ?? []).flatMap((t) => t.window ?? [t.cell]));
          const alreadyOnThisBoard = aliases.some((a) => a.spec === pivot && a.truthBoard === board.id);
          if (pivot && !windowCells.includes(pivot) && !sameBoardTaken.has(pivot) && !alreadyOnThisBoard) {
            const ph = mkHandle(`${tag.owner}-fork-pivot`);
            aliases.push({ handle: ph, spec: pivot, role: roleText(tag.owner, 'fork-pivot-now'),
                           truthBoard: board.id, kbId: null });
            zoneAliasMap[ph] = pivot;
          }
        }
      }
    }
  }

  // Deep fork cells (US1, deep-reveal-grounding spec 058 / Settled decision 8): a half's own
  // `tacticTag: 'double_threat'` + `forkCells` names a fork the STRUCTURAL loop above never sees
  // (NEAR_TERM excludes the projectedDeep board, and the vector-named overlay kinds are excluded by
  // design — see the STRUCTURAL comment above). These forkCells are real, solver-grounded, but
  // often complete several plies away — offering them as an ordinary present-tense alias would be
  // the eval-3 present-threat trap. Instead they get a distinct `future:`-prefixed spec + role, so
  // the prompt and client can frame them as "matters later," never as a present threat (FR-002).
  for (const [half, side] of [[pruned.lostResource, 'you'], [pruned.opponentPunishment, 'opp']]) {
    if (!half || !FORK_TAGS.has(half.tacticTag) || !half.forkCells?.length) continue;
    const owner = halfOwner(half, side);
    const rawSpec = half.forkCells.length === 1 ? half.forkCells[0] : 'windows:' + half.forkCells.join(',');
    const spec = 'future:' + rawSpec;
    if (seen.has(spec)) continue;
    seen.add(spec);
    const handle = mkHandle(`${owner}-future-fork`);
    const forkKind = half.forkCells.length === 1 ? 'future' : 'future-fork';
    aliases.push({ handle, spec, role: roleText(owner, forkKind), truthBoard: deepBoardByHalf.get(half) ?? 'projectedDeep',
                   kbId: TERM_KB.double_threat ? 'double_threat' : null });
    zoneAliasMap[handle] = spec;
  }

  // Half-resource geometry (RC-B): the two causal halves carry the cells and lines the explanation
  // is actually ABOUT — completingCell, window, forkWindows, forkCells — and none of them was ever
  // offered. The STRUCTURAL loop above only sees near-term board tags, and the deep-fork loop only
  // sees forkCells as one combined spec. Without these, prose like "the central threat", "the key
  // four-in-a-row line", "the column-2-to-column-5 strip" had no legal handle at all.
  //
  // Present vs future: a half whose register is not 'immediate' resolves many plies away and its
  // cells are EMPTY now, so it gets the `future:` prefix + future role text (FR-002, Settled
  // decision 8(b), the eval-3 present-threat trap). The rule reuses horizonForRegister rather than
  // a new plies threshold. Opening records are NO LONGER suppressed here (Task 6, spec 058): this
  // family is now offered on an opening record too, always under the `future:` decorator — the
  // guardrail (openingFrame.mjs's GUARDRAIL, now "matters LATER … never describe it as a threat
  // that exists now") is what keeps the model from reading a deep cell as a present threat, not
  // withholding the handle. `opts.openingHorizon` is kept as a caller-controlled override (unused
  // by either production caller) rather than removed outright.
  // OI-192: the half-loop aliases indexed by their UNPREFIXED geometry, so a later half offering the
  // same cells under a present-tense horizon can upgrade the framing in place instead of being
  // silently dropped. Only half aliases are indexed — a structural alias is already board-true and
  // present-tense on the near-term board it names, so it never needs upgrading.
  const halfAliasByGeometry = new Map();
  const halfPairs = opts.openingHorizon
    ? []
    : [[pruned.lostResource, 'you'], [pruned.opponentPunishment, 'opp']];
  for (const [half, side] of halfPairs) {
    if (!half) continue;
    const owner = halfOwner(half, side);
    const isFuture = horizonForRegister(half.register) !== 'immediate';
    const pre = isFuture ? 'future:' : '';
    const cellKind = isFuture ? 'future' : 'major';   // 'major' never over-claims immediacy
    const lineKind = isFuture ? 'future-line' : 'line';
    const offers = [];
    if (half.completingCell) offers.push([`${owner}-key-square`, half.completingCell, cellKind]);
    if (Array.isArray(half.window) && half.window.length) {
      offers.push([`${owner}-key-line`, 'windows:' + half.window.join(','), lineKind]);
    }
    if (FORK_TAGS.has(half.tacticTag) && (half.forkWindows?.length ?? 0) >= 2) {
      offers.push([`${owner}-fork-lines`,
                   'windows:' + half.forkWindows.map((w) => w.join(',')).join('|'), lineKind]);
    }
    // Each fork cell ALSO standalone: Decision A makes a `windows:` alias satisfiable only as the
    // whole window, so a correct single-cell fork highlight was being stripped (OI-172, measured:
    // c2r6 and c5r5 on 3154442332131341225551). Offering the cells individually closes that
    // without weakening Decision A — a window member that is never offered standalone still fails.
    for (const fc of (FORK_TAGS.has(half.tacticTag) ? half.forkCells ?? [] : [])) {
      offers.push([`${owner}-fork-square`, fc, cellKind]);
    }
    // The fork PIVOT (OI-182). forkCells are the squares the fork FINISHES on; the pivot is the move
    // that creates it — the only part a player can learn to see coming. Offered separately so an
    // explanation can name the cause, not just the effects.
    // Fix round 4 (finding 3). The pivot is offered from the FIRST half in `halfPairs`, and the
    // dedupe below is first-offer-wins — so when the pivot cell coincides with the OTHER half's
    // completing square, the pivot EVICTS that half's `-key-square` alias and the same cell is
    // relabelled as "the square you play to CREATE the fork" while the causal link in the same
    // prompt says the opponent forces their win there. Both labels are true of different lines,
    // which is exactly why it reads as a contradiction. Abstain (I2 — never guess) rather than pick
    // one, consistent with forkPivotCell's existing forkCells guard. Measured: 3 of the 20 fork
    // halves in the corpus (eval-11, eval-12, eval-26); the other 17 still offer their pivot.
    const otherHalf = half === pruned.lostResource ? pruned.opponentPunishment : pruned.lostResource;
    const otherCells = new Set([otherHalf?.completingCell, otherHalf?.cell].filter(Boolean));
    const pivot = forkPivotCell(half);
    if (pivot && !otherCells.has(pivot)) {
      offers.push([`${owner}-fork-pivot`, pivot, isFuture ? 'fork-pivot' : 'fork-pivot-now']);
    }
    // OI-190: the per-half decision resolved above — never re-derived here, so this half's fork alias
    // and its key square always name the same continuation.
    const halfDeepBoard = isFuture ? (deepBoardByHalf.get(half) ?? 'projectedDeep') : null;
    for (const [base, rawSpec, kind] of offers) {
      // Dedup on the UNPREFIXED geometry so a cell already offered as a present structural alias
      // is never re-offered under a future: framing (and vice versa) — first offer wins.
      //
      // OI-192: first-offer-wins is now HORIZON-AWARE. When the two halves reference the SAME
      // geometry with different horizons, whichever half is iterated first used to claim it —
      // including its tense — and a window that is a present threat on a shown board was described
      // as "not a threat right now". Measured deterministically on eval-33 (5/5): the REQUIRED
      // handle `opp-key-line` (windows:c4r6,c5r6,c6r6,c7r6) carried `lostResource`'s
      // `forced_sequence` framing while `opponentPunishment` had `register: immediate` on that
      // identical window, and the window is tagged `immediate at c5r6` on the afterPlayed board the
      // prompt shows. All 5 runs read the board correctly and contradicted the handle's own role
      // text — the model was right and the render was wrong.
      //
      // Present tense wins, in one direction only: a future framing may be UPGRADED to immediate,
      // never the reverse. That is the board-truth direction (an immediate offer is board-true on a
      // shown near-term board; the future framing is a horizon claim about the same cells), and it
      // keeps the eval-3 present-threat trap closed — nothing here can turn a genuinely deep cell
      // into a present threat. Handle, position and offer identity are preserved so `requiredSet`
      // (which matches on the unprefixed spec, D43) and I13's display-⊆-offer contract are untouched.
      if (seen.has(rawSpec) || seen.has('future:' + rawSpec)) {
        if (isFuture) continue;                       // the retained offer is at least as present
        const stale = halfAliasByGeometry.get(rawSpec);
        if (!stale || !stale.spec.startsWith('future:')) continue;
        stale.spec = rawSpec;
        stale.role = roleText(owner, kind);
        stale.truthBoard = 'decision';
        zoneAliasMap[stale.handle] = rawSpec;
        seen.add(rawSpec);
        continue;
      }
      const spec = pre + rawSpec;
      seen.add(rawSpec);
      seen.add(spec);
      const handle = mkHandle(base);
      const alias = { handle, spec, role: roleText(owner, kind),
                      truthBoard: isFuture ? halfDeepBoard : 'decision', kbId: null };
      aliases.push(alias);
      halfAliasByGeometry.set(rawSpec, alias);
      zoneAliasMap[handle] = spec;
    }
  }

  // Fired term vocabulary: structural board tags that map to a KB slug + the two halves' tags,
  // intersected with the KB-backed set (TERM_KB). T033 (FR-024, OI-184): also track WHICH owner(s)
  // fired each slug, so `describeTerm` can attribute a directional description (e.g. double_threat's
  // "the opponent cannot block both") to whichever side actually holds it, rather than assuming it is
  // always the reader's own pattern — `eval-13` fires `double_threat` from `opponentPunishment` only
  // (owner 'opp'), and the un-attributed description handed the reader's own pattern to the opponent.
  const fired = new Set();
  const firedOwners = new Map(); // slug -> Set<'you'|'opp'>
  const noteFired = (slug, owner) => {
    if (!slug || !TERM_KB[slug]) return;
    fired.add(slug);
    if (!firedOwners.has(slug)) firedOwners.set(slug, new Set());
    if (owner) firedOwners.get(slug).add(owner);
  };
  for (const board of boardDecisions) {
    if (!NEAR_TERM.has(board.id)) continue;
    for (const tag of board.tags ?? []) {
      noteFired(KIND_TO_SLUG[tag.kind], tag.owner);
    }
  }
  for (const [half, side] of [[pruned.lostResource, 'you'], [pruned.opponentPunishment, 'opp']]) {
    // `tacticTag`, not `tag` — halves have never had a `tag` field (measured Object.keys(half):
    // kind,register,completingCell,window,pliesToEnd,line,finalMovestring,entryCell,terminal,
    // forkCase,forkCells,forkWindows,tacticTag,tacticCells,tacticFromDiff,tie). This read was dead
    // from the day it was written; a fixture using the same wrong name kept the test green.
    // owner via halfOwner (not the raw `side`) — a denial/neutralization half is re-owned to the
    // OTHER player, same as every other owner-determination in this file (D50, halfOwner).
    if (half?.tacticTag) noteFired(half.tacticTag, halfOwner(half, side));   // figure_7 fires here even
    // though its overlay tag is not an alias — terms are independent of zones (design §3c).
  }
  const terms = [...fired].sort().map((slug) => ({
    slug, kbId: TERM_KB[slug].kbId, canonicalPhrase: TAG_PHRASE[slug],
    description: describeTerm(slug, firedOwners.get(slug)),
  }));

  // OI-191 — sibling aliases must not restate byte-identically. `mkHandle` disambiguates the HANDLE
  // (`you-key-square`, `you-key-square-2`) but roleText is a pure (owner, kind) function, so two
  // different squares were described with the same words and the model had nothing to bind on.
  // Measured on eval-9 (runs 1 and 3 swapped `future:c6r5` / `future:c3r5`) and on
  // pin-L2-enabled-opponent (3/5 runs bound the wrong `opp-key-square` and never named the cell
  // link.text says was denied); corpus-wide 48 of 63 records carried at least one collision.
  //
  // The collision key is (role, truthBoard), because that pair is exactly what the prompt prints —
  // both `assembleGroundedPrompt`'s Highlightable-regions line and, since OI-196, its required
  // block append "(on the <truthBoard> board)". Aliases separated by their board are already
  // distinguishable and are left alone, so this fires only where the model genuinely cannot choose.
  //
  // T023 (FR-014b, OI-194, Q8 PROVISIONAL): the disambiguating hint used to be `"the one at c6r5: \u2026"`
  // \u2014 a raw cNrM coordinate the model then had grounds to echo verbatim (OI-194's own class: the
  // prompt forbids raw squares in the model's own prose, but the render layer was itself the source
  // of one). `ordinalLocator` replaces it with a plain-English ordinal tied to a stable,
  // board-then-row-then-column sort of the sibling group \u2014 never a coordinate. `alias.spec` /
  // `requiredSet[].spec` are UNTOUCHED here (they are the `aliasBySpec` match key, never printed).
  disambiguateSiblingRoles(aliases);
  return { aliases, zoneAliasMap, terms };
}

// Q8 PROVISIONAL: ordinal locator, not raw coordinates \u2014 see spec.md Q8.
//
// `future:` is a render-framing decorator (D43), not geometry \u2014 strip it before sorting. A
// `windows:`-bearing spec is a whole line: represent it by its LOWEST (row, then col) cell, so a
// fork's two lines sort the same way a single completing cell would. `col\u2026` specs never collide
// (their role text is always distinct \u2014 "the column of the better move" vs "the column you
// played") and are never routed through this sort in practice.
function specSortKey(spec) {
  const raw = spec.startsWith('future:') ? spec.slice('future:'.length) : spec;
  const cellStrs = raw.startsWith('windows:')
    ? raw.slice('windows:'.length).split('|').flatMap((g) => g.split(','))
    : [raw];
  let best = null;
  for (const c of cellStrs) {
    const m = /^c(\d+)r(\d+)$/.exec(c);
    if (!m) continue;
    const col = Number(m[1]), row = Number(m[2]);
    if (!best || row < best.row || (row === best.row && col < best.col)) best = { row, col };
  }
  return best ?? { row: 0, col: 0 };
}

const ORDINAL_WORDS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'];
const HEIGHT_WORDS = ['lowest', 'second-lowest', 'third-lowest', 'fourth-lowest', 'fifth-lowest'];

// Regression fix (2026-08-28, post-Epic-12 review). The locator this replaces rendered a HEIGHT
// claim ("the lower one" / "the higher one", or an ordinal "counting from the bottom of the board")
// for every group, even when the sort that assigned positions was decided by the COLUMN tiebreak or
// original array order, not by row — i.e. it asserted vertical position for cells that are not, in
// fact, at different heights. Measured, real output before this fix: eval-9's `future:c3r5` /
// `future:c6r5` (both row 5) rendered "the lower one" / "the higher one"; eval-19's `c3r5` / `c5r5`
// (both row 5) rendered "the first one, counting from the bottom" / "the second one…".
//
// `locatorsForGroup` replaces the single ordinal function with a strategy ladder — each rung states
// something TRUE of the group by construction; the first rung that makes every member's label
// unique wins:
//   1. COLUMN — "the one in column N". Always true of the representative cell, and (per
//      `specSortKey`) the group members usually differ in column already, so this is the common case
//      and needs no height claim at all.
//   2. COLUMN + HEIGHT — "the lower one in column N" / "the upper one in column N" (or a
//      lowest/second-lowest/… ladder for 3+), used ONLY for the subset of members that genuinely
//      share a column with a sibling AND differ in row — the one case a height claim is true.
//   3. LISTING ORDINAL, no geometry — "the first one listed" / "the second one listed" — the
//      residual case where two members share their exact representative (column, row) (e.g. two
//      different windows whose lowest cell coincides) and no spatial statement can distinguish them.
function locatorsForGroup(sortedKeys) {
  const colCounts = new Map();
  for (const k of sortedKeys) colCounts.set(k.col, (colCounts.get(k.col) ?? 0) + 1);

  // Rung 1: column alone.
  const colOnly = sortedKeys.map((k) => `the one in column ${k.col}`);
  if (new Set(colOnly).size === colOnly.length) return colOnly;

  // Rung 2: column, with height disambiguation only where a column is genuinely shared.
  const withHeight = sortedKeys.map((k) => {
    if (colCounts.get(k.col) === 1) return `the one in column ${k.col}`;
    const sameColRows = [...new Set(sortedKeys.filter((k2) => k2.col === k.col).map((k2) => k2.row))]
      .sort((a, b) => a - b);
    if (sameColRows.length === 1) return null; // exact (col,row) tie — rung 2 cannot distinguish
    if (sameColRows.length === 2) {
      return k.row === sameColRows[0] ? `the lower one in column ${k.col}` : `the upper one in column ${k.col}`;
    }
    const rank = sameColRows.indexOf(k.row);
    const word = HEIGHT_WORDS[rank] ?? `${rank + 1}th-lowest`;
    return `the ${word} one in column ${k.col}`;
  });
  if (withHeight.every(Boolean) && new Set(withHeight).size === withHeight.length) return withHeight;

  // Rung 3: listing ordinal — asserts position in the list, never height or column.
  return sortedKeys.map((_, idx) => `the ${ORDINAL_WORDS[idx] ?? `${idx + 1}th`} one listed`);
}

export function disambiguateSiblingRoles(aliases) {
  const key = (a) => `${a.role}|${a.truthBoard}`;
  const groups = new Map();
  aliases.forEach((a, i) => {
    const k = key(a);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push({ a, i });
  });
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    // Stable, deterministic sort: board-then-row-then-column (the truthBoard is already fixed
    // within a group by the collision key itself), with original alias order as the final tie-break
    // so the order is total even when two siblings share a representative cell.
    const sorted = [...group].sort((x, y) => {
      const kx = specSortKey(x.a.spec), ky = specSortKey(y.a.spec);
      return (kx.row - ky.row) || (kx.col - ky.col) || (x.i - y.i);
    });
    const locators = locatorsForGroup(sorted.map((item) => specSortKey(item.a.spec)));
    // Front-loaded, not appended: the LINE_STEER roles already END in a parenthetical, so a
    // trailing hint reads as part of that aside. Leading with the geometry also puts the one
    // distinguishing token first, where the model binds the handle.
    sorted.forEach((item, idx) => {
      item.a.role = `${locators[idx]}: ${item.a.role}`;
    });
  }
  return aliases;
}

// --- Post-LLM processing ---

// Pair each opening [kind:X] with the NEXT closing [/kind:...] and rewrite the closer to match X.
// Handles the common backreference-drift malformation for both zone and term tags.
export function normalizeAnnotationTags(text) {
  for (const kind of ['zone', 'term']) {
    const OPEN = new RegExp(`\\[${kind}:([^\\]!]+)\\]`, 'g');
    const CLOSE = new RegExp(`\\[/${kind}:[^\\]!]+\\]`, 'g');
    const parts = [];
    let last = 0, m;
    while ((m = OPEN.exec(text)) !== null) {
      if (m.index < last) continue; // already consumed as inner content of a previous pair on this kind
      parts.push(text.slice(last, m.index + m[0].length));
      CLOSE.lastIndex = m.index + m[0].length;
      const c = CLOSE.exec(text);
      if (c) {
        parts.push(text.slice(m.index + m[0].length, c.index));
        parts.push(`[/${kind}:${m[1]}]`);
        last = c.index + c[0].length;
      } else {
        last = m.index + m[0].length;
      }
    }
    parts.push(text.slice(last));
    text = parts.join('');
  }
  return text;
}

// Exported for reasonRenderGuard.mjs's toAllowedSet adapter (spec 058, US3, data-model.md §3) — no
// other export in this file uses this name, verified before exporting.
export const rcToCellStr = ({ col, row }) => `c${col + 1}r${row + 1}`;

// Strip a [kind:X]…[/kind:X] wrapper whose X is not in `allowed`, keeping the inner text, and RECORD
// each removal. Without the record an invented slug is invisible: annotationRepairs stayed [] while
// the model emitted [term:central] against an empty term vocabulary (measured, eval-1 run 0), so G7's
// auto-fail never fired and nothing downstream could see the defect. The non-greedy backreference
// handles the common flat case; on malformed *overlapping* same-kind tags a stray inner tag may
// survive — contained blast radius: the frontend degrades an unknown spec to plain text
// (annotatedText.js isValidSpec) and the grader strips all markup before A5. (m3.)
function dropUnoffered(text, kind, allowed) {
  const RE = new RegExp(`\\[${kind}:([^\\]!]+)\\](.*?)\\[/${kind}:\\1\\]`, 'gs');
  const repairs = [];
  const out = text.replace(RE, (whole, id, inner) => {
    if (allowed.has(id)) return whole;
    repairs.push(`unoffered_${kind}:${id}`);
    return inner;
  });
  return { text: out, repairs };
}

// Delete a [kind:id] opener that has no matching [/kind:id] anywhere later in the text — the model
// used the tag as a bare noun instead of wrapping a phrase (e.g. "the [term:immediate_threat] on
// c2"). Bare-strip: remove just the token, leave the surrounding words as-is (no attempt to
// substitute a canonical phrase — simplicity over prose smoothness on this rare repair path).
// Returns the repaired text + one 'unclosed_tag:<kind>:<id>' entry per removal, consumed by
// compute.mjs (-> annotationRepairs, for grade-fv-sufficiency G7) and, in production, by a future
// deep_reveal_failures write (see reason-render-grounded-prompt.md §10 TODO).
// LIFO stack-pair each closer with the NEAREST preceding still-open opener of the same id (a single
// ordered token stream of opens+closes, not an "any closer exists later" scan) — a bare opener that
// happens to precede an unrelated, properly-paired later tag of the same id must not hide behind that
// pair's closer.
function stripUnclosedTags(text, kind) {
  const TOKEN = new RegExp(`\\[(/?)${kind}:([^\\]!]+)\\]`, 'g');
  const pending = new Map(); // id -> stack of pending open-token matches
  let m;
  while ((m = TOKEN.exec(text)) !== null) {
    const isClose = m[1] === '/';
    const id = m[2];
    if (isClose) {
      const stack = pending.get(id);
      if (stack && stack.length) stack.pop(); // pairs with the nearest still-open opener of this id
    } else {
      if (!pending.has(id)) pending.set(id, []);
      pending.get(id).push(m);
    }
  }
  const unclosed = [];
  for (const stack of pending.values()) unclosed.push(...stack);
  unclosed.sort((a, b) => a.index - b.index);

  const repairs = [];
  let result = '';
  let last = 0;
  for (const m of unclosed) {
    result += text.slice(last, m.index);
    last = m.index + m[0].length;
    repairs.push(`unclosed_tag:${kind}:${m[2]}`);
  }
  result += text.slice(last);
  return { text: result, repairs };
}

export function processAnnotations(mechanism, zones) {
  const handles = new Set((zones?.aliases ?? []).map((a) => a.handle));
  const slugs = new Set((zones?.terms ?? []).map((t) => t.slug));
  const aliasMap = Object.fromEntries((zones?.aliases ?? []).map((a) => [a.handle, a.spec]));

  let text = normalizeAnnotationTags(mechanism ?? '');
  const repairs = [];
  for (const [kind, allowed] of [['zone', handles], ['term', slugs]]) {
    const dropped = dropUnoffered(text, kind, allowed);
    text = dropped.text;
    repairs.push(...dropped.repairs);
  }

  for (const kind of ['zone', 'term']) {
    const stripped = stripUnclosedTags(text, kind);
    text = stripped.text;
    repairs.push(...stripped.repairs);
  }

  // Expand offered zone handles -> real specs (open + close), and collect the specs for key_cells.
  const usedSpecs = new Set();
  for (const [handle, spec] of Object.entries(aliasMap)) {
    if (text.includes(`[zone:${handle}]`)) usedSpecs.add(spec);
    text = text.replaceAll(`[zone:${handle}]`, `[zone:${spec}]`).replaceAll(`[/zone:${handle}]`, `[/zone:${spec}]`);
  }

  const cells = new Set();
  for (const spec of usedSpecs) for (const rc of expandSpec(spec)) cells.add(rcToCellStr(rc));
  // usedSpecs (spec 058, US2 data-model.md §2 Consumer 2): the expanded specs actually emitted by the
  // LLM's mechanism — the exact membership test the required-set retry-compliance check needs
  // (`requiredSet.every(g => attempt.usedSpecs.includes(g.spec))`). Surfaced here, not reimplemented
  // downstream, since this Set already excludes a handle that merely appears as unrelated prose.
  return { mechanism: text, keyCells: [...cells].sort(), zonesEmitted: usedSpecs.size > 0, repairs,
           usedSpecs: [...usedSpecs] };
}
