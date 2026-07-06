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
