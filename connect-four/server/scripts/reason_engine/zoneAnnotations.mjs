// Single source of truth for coach-annotation tags (zones = board highlights; terms = KB popups).
// Render-time: buildAnnotationOffer derives the OFFERED alias set + term vocabulary from the near-term
// board tags + the two move columns. Post-LLM: normalizeAnnotationTags + processAnnotations repair,
// validate-against-offered, expand handles -> real specs, and derive key_cells. Pure; no solver/engine.

import { expandSpec } from '../../zoneParser.js';
import { TAG_PHRASE } from './causalLinks.mjs';   // single source of truth for canonical phrases (M1)

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

// Plain-language role text per (owner, kind) for the prompt's "Highlightable regions" list.
function roleText(owner, kind) {
  const who = owner === 'you' ? 'you' : 'your opponent';
  if (kind === 'immediate') return `the square where ${who} can make four next move`;
  if (kind === 'double') return `the fork square where ${who} gets two winning squares at once`;
  return `a square completing ${who}'s four-in-a-row line`; // major
}

// A window-bearing tag becomes a windows: spec (the whole line); a plain tag becomes its cNrM cell.
function tagSpec(tag) {
  if (Array.isArray(tag.window) && tag.window.length) return 'windows:' + tag.window.join(',');
  return tag.cell; // already cNrM, a valid single-cell spec
}

export function buildAnnotationOffer(pruned, boardDecisions) {
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
    if (half?.tag && TERM_KB[half.tag]) fired.add(half.tag);   // figure_7 fires here even though its
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

const rcToCellStr = ({ col, row }) => `c${col + 1}r${row + 1}`;

// Strip a [kind:X]…[/kind:X] wrapper whose X is not in `allowed`, keeping the inner text. The
// non-greedy backreference handles the common flat case; on malformed *overlapping* same-kind tags a
// stray inner tag may survive — contained blast radius: the frontend degrades an unknown spec to plain
// text (annotatedText.js isValidSpec) and the grader strips all markup before A5. (m3.)
function dropUnoffered(text, kind, allowed) {
  const RE = new RegExp(`\\[${kind}:([^\\]!]+)\\](.*?)\\[/${kind}:\\1\\]`, 'gs');
  return text.replace(RE, (whole, id, inner) => (allowed.has(id) ? whole : inner));
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
  text = dropUnoffered(text, 'zone', handles);
  text = dropUnoffered(text, 'term', slugs);

  const repairs = [];
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
  return { mechanism: text, keyCells: [...cells].sort(), zonesEmitted: usedSpecs.size > 0, repairs };
}
