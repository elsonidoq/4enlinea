// Single source of truth for coach-annotation tags (zones = board highlights; terms = KB popups).
// Render-time: buildAnnotationOffer derives the OFFERED alias set + term vocabulary from the near-term
// board tags + the two move columns. Post-LLM: normalizeAnnotationTags + processAnnotations repair,
// validate-against-offered, expand handles -> real specs, and derive key_cells. Pure; no solver/engine.

import { expandSpec } from '../../zoneParser.js';
import { TAG_PHRASE } from './causalLinks.mjs';   // single source of truth for canonical phrases (M1)
import { horizonForRegister } from '../reasonCellGrounding.mjs';

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

function roleText(owner, kind) {
  const who = owner === 'you' ? 'you' : 'your opponent';
  if (kind === 'immediate') return `the single square where ${who} can make four next move`;
  if (kind === 'double') return `the single fork square where ${who} gets two winning squares at once`;
  if (kind === 'line') return `the whole four-in-a-row line ${who} ${owner === 'you' ? 'are' : 'is'} playing for (${LINE_STEER})`;
  if (kind === 'future-line') return `the whole four-in-a-row line that decides this later, once the forced sequence reaches it — not a threat right now (${LINE_STEER})`;
  if (kind === 'future') return `this single square matters later, once the forced sequence reaches it — not a threat right now`;
  // D45: the multi-cell fork alias is now a REQUIRED group, so its role text is paraphrased on every
  // run — the singular 'future' wording made the model call a two-square fork "the later fork
  // square" (measured, t043 run 1).
  if (kind === 'future-fork') return `BOTH of the two squares ${who} can finish on — this is the fork itself, and it matters later, once the forced sequence reaches it, not right now`;
  if (kind === 'fork-pivot') return `the square ${who} plays to CREATE the fork — the move that makes both winning squares live at once; it matters later, once the forced sequence reaches it`;
  if (kind === 'fork-pivot-now') return `the square ${who} plays to CREATE the fork — the move that makes both winning squares live at once`;
  return `a single square completing ${who}'s four-in-a-row line`; // major
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
    aliases.push({ handle, spec, role: roleText(owner, forkKind), truthBoard: 'projectedDeep',
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
    const pivot = forkPivotCell(half);
    if (pivot) offers.push([`${owner}-fork-pivot`, pivot, isFuture ? 'fork-pivot' : 'fork-pivot-now']);
    for (const [base, rawSpec, kind] of offers) {
      // Dedup on the UNPREFIXED geometry so a cell already offered as a present structural alias
      // is never re-offered under a future: framing (and vice versa) — first offer wins.
      if (seen.has(rawSpec) || seen.has('future:' + rawSpec)) continue;
      const spec = pre + rawSpec;
      seen.add(rawSpec);
      seen.add(spec);
      const handle = mkHandle(base);
      aliases.push({ handle, spec, role: roleText(owner, kind),
                     truthBoard: isFuture ? 'projectedDeep' : 'decision', kbId: null });
      zoneAliasMap[handle] = spec;
    }
  }

  // Fired term vocabulary: structural board tags that map to a KB slug + the two halves' tags,
  // intersected with the KB-backed set (TERM_KB).
  const fired = new Set();
  for (const board of boardDecisions) {
    if (!NEAR_TERM.has(board.id)) continue;
    for (const tag of board.tags ?? []) {
      const slug = KIND_TO_SLUG[tag.kind];
      if (slug && TERM_KB[slug]) fired.add(slug);
    }
  }
  for (const half of [pruned.lostResource, pruned.opponentPunishment]) {
    // `tacticTag`, not `tag` — halves have never had a `tag` field (measured Object.keys(half):
    // kind,register,completingCell,window,pliesToEnd,line,finalMovestring,entryCell,terminal,
    // forkCase,forkCells,forkWindows,tacticTag,tacticCells,tacticFromDiff,tie). This read was dead
    // from the day it was written; a fixture using the same wrong name kept the test green.
    if (half?.tacticTag && TERM_KB[half.tacticTag]) fired.add(half.tacticTag);   // figure_7 fires here even though its
    // overlay tag is not an alias — terms are independent of zones (design §3c).
  }
  const terms = [...fired].sort().map((slug) => ({
    slug, kbId: TERM_KB[slug].kbId, canonicalPhrase: TAG_PHRASE[slug], description: TERM_KB[slug].description,
  }));

  return { aliases, zoneAliasMap, terms };
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
