# Zone + KB-term annotation tags in the grounded-render path — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the reason-engine grounded-render path (condition D) emit inline `[zone:handle]` board-highlight tags and `[term:slug]` KB-popup tags in the coach `mechanism`, grade them, and cover them — so the production explain engine can eventually be deleted.

**Architecture:** A new render-time builder derives an **offered** set of zone aliases (from the near-term board tags + the two move columns) and a **fired** term vocabulary, keyed by the same objects `tagBoard` already produces. The LLM references only offered handles/slugs inline in `mechanism`; a post-LLM step normalizes, validates-against-offered, expands aliases → real specs, and derives `key_cells`. The render model, the `render_decision` ground truth, the grader rubric (new G7), and the coverage universe all read the one offered set.

**Tech Stack:** Node.js ESM (`.mjs`), `node --test`, existing reason-engine modules under `connect-four/server/scripts/`. Run everything from `connect-four/`.

## Global Constraints

- **Coordinates are 0-indexed internally** (row 0 = bottom, col 0 = left); the two translation boundaries are the frontend (1-based) and c4solver. Zone specs are **1-indexed** (`c1r1` = bottom-left), matching `zoneParser.js`.
- **Zone spec grammar** (`server/zoneParser.js` `isValidSpec`/`expandSpec`): `colN`, `cNrM`, `cells:…`, `windows:…`, `rowN`, `tg`. This plan produces only `cNrM`, `windows:…`, and `colN`.
- **Term ids use the tag-key convention** production uses (`immediate_threat`, `double_threat`, `figure_7`, `claimeven`, `conditional_swindle`) — NOT KB filenames.
- **`mechanism` register contract:** no raw coordinates / field names / engine slugs in the visible prose. Inline `[zone:…]`/`[term:…]` markup is allowed *because the grader strips it before A5*; the LLM only ever writes offered handles/slugs, never a raw `cNrM`.
- **Run tests with** `npm run test:fast` from `connect-four/` (never `npm test` — it calls the real solver and hangs; memory `project_integration_test_slowness`). Every new `*.test.mjs` must be added to the `test:fast` script in `connect-four/package.json`.
- **No new reason-engine case and no new harvested board** — this is an output-format axis on existing cases. `select_boards.mjs` board harvest is untouched; only `renderUniverse.mjs`'s predicate set grows.
- **Zones exist only for condition D.** Conditions A/B/C are unchanged.

---

## File structure

- **Create** `connect-four/server/scripts/reason_engine/zoneAnnotations.mjs` — the single source of truth for annotations: builds the offered alias set + `zoneAliasMap` + term vocabulary (`buildAnnotationOffer`), and post-processes LLM output (`normalizeAnnotationTags`, `processAnnotations`). Pure functions, no engine/solver calls.
- **Create** `connect-four/server/tests/zoneAnnotations.test.mjs` — unit tests for the above.
- **Modify** `connect-four/server/scripts/renderReasonModel.mjs` — `buildReasonRenderModel` adds `zones`; `assembleGroundedPrompt` emits two new prompt sections + the nesting instruction; `buildRenderDecision` adds the `zones` ground-truth element.
- **Modify** `connect-four/server/scripts/compute.mjs` — export `postprocessAnswer`; apply it to condition-D answers after the LLM call.
- **Modify** `connect-four/server/scripts/renderUniverse.mjs` — `renderDecisionPredicates` emits zone/term predicates; add them to `RENDER_UNIVERSE`/`RENDER_PROVISIONAL`.
- **Modify** `connect-four/server/tests/renderReasonModel.test.mjs`, `renderDecisionEmit.test.mjs`, `computeConditionD.test.mjs`, `renderUniverse.test.mjs` — extend for the new behavior.
- **Modify** `connect-four/package.json` — add `zoneAnnotations.test.mjs` to `test:fast`.
- **Modify** `.claude/skills/grade-fv-sufficiency/SKILL.md` — add G7, the `zones` ground-truth block, strip-before-A5, and the schema/axis entries.

---

### Task 1: Offered-annotation builder (`buildAnnotationOffer`)

**Files:**
- Create: `connect-four/server/scripts/reason_engine/zoneAnnotations.mjs`
- Test: `connect-four/server/tests/zoneAnnotations.test.mjs`

**Interfaces:**
- Consumes: `boardSelectionDecisions(fv)` output from `reasonBoardSelect.mjs` — an array of `{ id, shown, movestring, tags, ascii, reason }` where `id ∈ {decision, afterBest, afterPlayed, projectedDeep}` and each tag is `{ cell, kind, owner, window? }` (`kind ∈ {immediate, major, double, figure_7, double_threat}`, `owner ∈ {you, opp}`).
- Produces:
  - `buildAnnotationOffer(pruned, boardDecisions) -> { aliases, zoneAliasMap, terms }`
    - `aliases`: `Array<{ handle: string, spec: string, role: string, truthBoard: 'decision'|'afterBest'|'afterPlayed', kbId: string|null }>`
    - `zoneAliasMap`: `{ [handle: string]: spec: string }`
    - `terms`: `Array<{ slug: string, kbId: string, canonicalPhrase: string, description: string }>`

- [ ] **Step 1: Write the failing test**

```js
// connect-four/server/tests/zoneAnnotations.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAnnotationOffer } from '../scripts/reason_engine/zoneAnnotations.mjs';
import { TAG_PHRASE } from '../scripts/reason_engine/causalLinks.mjs';

// Board-decision fixtures with the shape boardSelectionDecisions() actually produces:
//  - structural tags (immediate/major/double) from getMajorThreatCells, board-true on their board
//  - the vector-named OVERLAY tag (figure_7/double_threat) appears ONLY on the decision board
//    (reasonBoardSelect.mjs patternOpts) and often completes deep -> must NOT become a highlight.
const boards = [
  { id: 'decision', tags: [
      { cell: 'c1r4', kind: 'immediate', owner: 'you' },
      { cell: 'c4r3', kind: 'figure_7', owner: 'opp', window: ['c6r1', 'c5r2', 'c4r3', 'c3r4'] } ] }, // overlay -> excluded
  { id: 'afterPlayed', tags: [
      { cell: 'c5r1', kind: 'double', owner: 'opp', window: ['c5r1', 'c7r1'] },  // structural fork, board-true here
      { cell: 'c1r4', kind: 'immediate', owner: 'you' } ] },                     // duplicate of decision -> dedup
  { id: 'projectedDeep', tags: [{ cell: 'c7r1', kind: 'immediate', owner: 'opp' }] }, // deep board -> ignored
];
const pruned = { bestCol: 2, playedCol: 3, lostResource: {}, opponentPunishment: { tag: 'figure_7' } };

test('aliases: structural tags only (overlay excluded), deduped, deep board ignored, + 2 column aliases', () => {
  const { aliases, zoneAliasMap } = buildAnnotationOffer(pruned, boards);
  const byHandle = Object.fromEntries(aliases.map((a) => [a.handle, a]));
  // move-column aliases always offered
  assert.equal(byHandle['better-col'].spec, 'col3');   // bestCol 2 -> display col3
  assert.equal(byHandle['played-col'].spec, 'col4');   // playedCol 3 -> display col4
  // structural immediate -> cNrM spec, truthBoard = first board it is board-true on (decision)
  const imm = aliases.find((a) => a.spec === 'c1r4');
  assert.equal(imm.truthBoard, 'decision');
  assert.equal(imm.kbId, 'immediate_threat');
  // structural double -> windows: spec, truthBoard afterPlayed (board-true there)
  const dbl = aliases.find((a) => a.spec.startsWith('windows:'));
  assert.equal(dbl.truthBoard, 'afterPlayed');
  assert.equal(dbl.spec, 'windows:c5r1,c7r1');
  assert.equal(dbl.kbId, 'double_threat');
  // the figure_7 OVERLAY tag is NOT offered as an alias (deep -> horizon prose, decision #5)
  assert.ok(!aliases.some((a) => a.kbId === 'figure_7'));
  assert.ok(!aliases.some((a) => a.spec === 'windows:c6r1,c5r2,c4r3,c3r4'));
  // dedup: c1r4 appears once; the deep board's c7r1 tag is NOT offered
  assert.equal(aliases.filter((a) => a.spec === 'c1r4').length, 1);
  assert.ok(!aliases.some((a) => a.spec === 'c7r1'));
  // zoneAliasMap mirrors every alias handle
  for (const a of aliases) assert.equal(zoneAliasMap[a.handle], a.spec);
});

test('terms: KB-backed slugs only, canonicalPhrase from TAG_PHRASE, conditional_swindle never a term', () => {
  const { terms } = buildAnnotationOffer(
    { bestCol: 2, playedCol: 3, lostResource: { kind: 'conditional_swindle' }, opponentPunishment: { tag: 'figure_7' } },
    boards);
  const bySlug = Object.fromEntries(terms.map((t) => [t.slug, t]));
  assert.ok(bySlug['figure_7'], 'figure_7 fired via opponentPunishment.tag');
  assert.equal(bySlug['figure_7'].kbId, 'figure_7');
  assert.equal(bySlug['figure_7'].canonicalPhrase, TAG_PHRASE.figure_7); // imported, no local copy
  assert.ok(bySlug['immediate_threat'], 'immediate fired via a structural board tag');
  assert.ok(bySlug['double_threat'], 'double fired via a structural board tag');
  assert.ok(!bySlug['conditional_swindle'], 'conditional_swindle has no KB entry -> never a term');
  // every offered term id is one of the four KB-backed slugs
  const KB_BACKED = new Set(['immediate_threat', 'double_threat', 'figure_7', 'claimeven']);
  for (const t of terms) assert.ok(KB_BACKED.has(t.kbId), `${t.kbId} must be KB-backed`);
});

test('no tactical aliases when boards carry no structural tags (columns still offered)', () => {
  const bare = buildAnnotationOffer({ bestCol: 0, playedCol: 6, lostResource: {}, opponentPunishment: {} },
    [{ id: 'decision', tags: [] }, { id: 'afterBest', tags: [] }, { id: 'afterPlayed', tags: [] }]);
  const tactical = bare.aliases.filter((a) => !a.spec.startsWith('col'));
  assert.equal(tactical.length, 0);
  assert.equal(bare.terms.length, 0);
  assert.equal(bare.aliases.length, 2); // better-col + played-col only
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd connect-four && node --test server/tests/zoneAnnotations.test.mjs`
Expected: FAIL — `Cannot find module '.../zoneAnnotations.mjs'`.

- [ ] **Step 3a: Export `TAG_PHRASE` from `causalLinks.mjs`**

In `connect-four/server/scripts/reason_engine/causalLinks.mjs`, change the declaration `const TAG_PHRASE = {` (near line 35) to `export const TAG_PHRASE = {`. This is an additive export (no behavior change); `plainTag` and existing consumers are unaffected.

- [ ] **Step 3b: Write the module**

```js
// connect-four/server/scripts/reason_engine/zoneAnnotations.mjs
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd connect-four && node --test server/tests/zoneAnnotations.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 5: Register the test in `test:fast` and commit**

In `connect-four/package.json`, append ` server/tests/zoneAnnotations.test.mjs` to the end of the `test:fast` script string.

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add connect-four/server/scripts/reason_engine/zoneAnnotations.mjs connect-four/server/scripts/reason_engine/causalLinks.mjs connect-four/server/tests/zoneAnnotations.test.mjs connect-four/package.json
git commit -m "feat(reason): offered zone-alias + term-vocab builder for grounded render

Structural board-true tags only (overlay figure_7/double_threat excluded); KB-backed
term vocab (no conditional_swindle); canonicalPhrase imported from causalLinks TAG_PHRASE.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Post-process LLM output (`normalizeAnnotationTags`, `processAnnotations`)

**Files:**
- Modify: `connect-four/server/scripts/reason_engine/zoneAnnotations.mjs`
- Test: `connect-four/server/tests/zoneAnnotations.test.mjs`

**Interfaces:**
- Consumes: the `zones` ground-truth object `{ aliases, terms }` (from Task 1 / `render_decision.zones`), and the raw `mechanism` string from the LLM.
- Produces:
  - `normalizeAnnotationTags(text) -> string` — repairs mismatched close tags (`[zone:X]…[/zone:Y]` → `…[/zone:X]`) for both `zone` and `term`.
  - `processAnnotations(mechanism, zones) -> { mechanism: string, keyCells: string[], zonesEmitted: boolean }` — normalizes, drops any `[zone:handle]`/`[term:slug]` whose handle/slug is not offered (keeping the inner text), expands offered zone handles → real specs, and derives `keyCells` (1-indexed `cNrM`, de-duplicated) from the expanded specs. `zonesEmitted` is true iff the LLM wrapped ≥1 offered zone handle (used by Task 4's transition gate).

- [ ] **Step 1: Write the failing test (append to the same test file)**

```js
import { normalizeAnnotationTags, processAnnotations } from '../scripts/reason_engine/zoneAnnotations.mjs';

const ZONES = {
  aliases: [
    { handle: 'better-col', spec: 'col3', role: 'x', truthBoard: 'decision', kbId: null },
    { handle: 'opp-double', spec: 'windows:c5r1,c7r1', role: 'x', truthBoard: 'afterPlayed', kbId: 'double_threat' },
  ],
  terms: [{ slug: 'double_threat', kbId: 'double_threat', canonicalPhrase: 'double threat (two winning squares at once)', description: 'x' }],
};

test('normalizeAnnotationTags repairs a mismatched close handle', () => {
  const out = normalizeAnnotationTags('a [zone:better-col]col 3[/zone:foo] b');
  assert.match(out, /\[zone:better-col\]col 3\[\/zone:better-col\]/);
});

test('processAnnotations expands offered handles and derives key_cells', () => {
  const raw = 'Column [zone:better-col]3[/zone:better-col] denies the '
    + '[zone:opp-double][term:double_threat]double threat[/term:double_threat][/zone:opp-double].';
  const { mechanism, keyCells, zonesEmitted } = processAnnotations(raw, ZONES);
  assert.equal(zonesEmitted, true);
  // handles expanded to real specs
  assert.match(mechanism, /\[zone:col3\]3\[\/zone:col3\]/);
  assert.match(mechanism, /\[zone:windows:c5r1,c7r1\]/);
  // offered term kept verbatim
  assert.match(mechanism, /\[term:double_threat\]double threat\[\/term:double_threat\]/);
  // key_cells = union of expanded specs (col3 = whole column + the 2 window cells), 1-indexed, deduped
  assert.ok(keyCells.includes('c5r1'));
  assert.ok(keyCells.includes('c3r1')); // col3 row1
  assert.equal(new Set(keyCells).size, keyCells.length);
});

test('processAnnotations drops an unoffered handle/slug but keeps the words', () => {
  const raw = 'take [zone:ghost-handle]that square[/zone:ghost-handle] and a [term:made_up]trick[/term:made_up]';
  const { mechanism } = processAnnotations(raw, ZONES);
  assert.doesNotMatch(mechanism, /zone:ghost-handle/);
  assert.doesNotMatch(mechanism, /term:made_up/);
  assert.match(mechanism, /take that square and a trick/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd connect-four && node --test server/tests/zoneAnnotations.test.mjs`
Expected: FAIL — `normalizeAnnotationTags is not a function`.

- [ ] **Step 3: Add the functions to the module**

```js
// --- Post-LLM processing (append to zoneAnnotations.mjs) ---

// Pair each opening [kind:X] with the NEXT closing [/kind:...] and rewrite the closer to match X.
// Handles the common backreference-drift malformation for both zone and term tags.
export function normalizeAnnotationTags(text) {
  for (const kind of ['zone', 'term']) {
    const OPEN = new RegExp(`\\[${kind}:([^\\]!]+)\\]`, 'g');
    const CLOSE = new RegExp(`\\[/${kind}:[^\\]!]+\\]`, 'g');
    const parts = [];
    let last = 0, m;
    while ((m = OPEN.exec(text)) !== null) {
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

export function processAnnotations(mechanism, zones) {
  const handles = new Set((zones?.aliases ?? []).map((a) => a.handle));
  const slugs = new Set((zones?.terms ?? []).map((t) => t.slug));
  const aliasMap = Object.fromEntries((zones?.aliases ?? []).map((a) => [a.handle, a.spec]));

  let text = normalizeAnnotationTags(mechanism ?? '');
  text = dropUnoffered(text, 'zone', handles);
  text = dropUnoffered(text, 'term', slugs);

  // Expand offered zone handles -> real specs (open + close), and collect the specs for key_cells.
  const usedSpecs = new Set();
  for (const [handle, spec] of Object.entries(aliasMap)) {
    if (text.includes(`[zone:${handle}]`)) usedSpecs.add(spec);
    text = text.replaceAll(`[zone:${handle}]`, `[zone:${spec}]`).replaceAll(`[/zone:${handle}]`, `[/zone:${spec}]`);
  }

  const cells = new Set();
  for (const spec of usedSpecs) for (const rc of expandSpec(spec)) cells.add(rcToCellStr(rc));
  return { mechanism: text, keyCells: [...cells].sort(), zonesEmitted: usedSpecs.size > 0 };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd connect-four && node --test server/tests/zoneAnnotations.test.mjs`
Expected: PASS (6 tests total).

- [ ] **Step 5: Commit**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add connect-four/server/scripts/reason_engine/zoneAnnotations.mjs connect-four/server/tests/zoneAnnotations.test.mjs
git commit -m "feat(reason): normalize/validate/expand LLM annotation tags + derive key_cells

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Wire the offer into the render model, the prompt, and `render_decision`

**Files:**
- Modify: `connect-four/server/scripts/renderReasonModel.mjs`
- Test: `connect-four/server/tests/renderReasonModel.test.mjs`, `renderDecisionEmit.test.mjs`, `computeConditionD.test.mjs`

**Interfaces:**
- Consumes: `buildAnnotationOffer` (Task 1); `boardSelectionDecisions` (already imported in `reasonBoardSelect.mjs`).
- Produces:
  - `buildReasonRenderModel(nv)` gains `model.zones = { aliases, zoneAliasMap, terms }`.
  - `buildRenderDecision(nv)` gains `rd.zones = { aliases, terms }` (the ground truth the grader + `renderUniverse` read; `zoneAliasMap` is a prompt-only convenience, omitted from the decision record).
  - `assembleGroundedPrompt(model)` renders `# Highlightable regions` + `# KB terms you may name` + the no-overlap instruction, before the `# Internal evidence fields` JSON block.

- [ ] **Step 1: Write the failing tests**

Append to `connect-four/server/tests/renderReasonModel.test.mjs` (it already imports `buildReasonRenderModel`, `assembleGroundedPrompt`; add `buildRenderDecision` to that import if absent):

```js
test('render model + prompt expose offered zone handles and term slugs', () => {
  const nv = {
    movestring: '341330613', playedCol: 4, bestCol: 3, player: 2, opponent: 1,
    case: 'win_to_lose', route: 'sign',
    lostResource: { kind: 'winning_line', register: 'forced_sequence', completingCell: 'c6r5' },
    opponentPunishment: { kind: 'winning_line', register: 'forced_sequence', completingCell: 'c3r3',
                          tie: { kind: 'tied', sharedCells: ['c4r5'] } },
    replyHistogram: { afterBest: 0, afterPlayed: 1 },
  };
  const model = buildReasonRenderModel(nv);
  assert.ok(model.zones.aliases.some((a) => a.handle === 'better-col'));
  const prompt = assembleGroundedPrompt(model);
  assert.match(prompt, /# Highlightable regions/);
  assert.match(prompt, /\[zone:better-col\]/);          // handle advertised
  assert.match(prompt, /# KB terms you may name/);
  assert.match(prompt, /do not overlap a highlight and a term/i);  // nesting instruction
  // Scope the null/undefined check to the PROSE half only — the JSON residue after
  // "# Internal evidence fields" legitimately contains `null` (renderedFields keeps null-valued render
  // fields), exactly as reasonRenderFixes.test.mjs scopes its own check. (M2.)
  const prose = prompt.split('# Internal evidence fields')[0];
  assert.doesNotMatch(prose, /\bnull\b|\bundefined\b/);
});
```

Append to `connect-four/server/tests/renderDecisionEmit.test.mjs`:

```js
test('render_decision carries a zones block (aliases + terms, no zoneAliasMap)', () => {
  const rd = buildRenderDecision(NV);
  assert.ok(rd.zones);
  assert.ok(Array.isArray(rd.zones.aliases));
  assert.ok(Array.isArray(rd.zones.terms));
  assert.ok(rd.zones.aliases.some((a) => a.handle === 'better-col'));
  assert.equal(rd.zones.zoneAliasMap, undefined); // ground truth omits the prompt-only map
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd connect-four && node --test server/tests/renderReasonModel.test.mjs server/tests/renderDecisionEmit.test.mjs`
Expected: FAIL — `model.zones` undefined; prompt lacks `# Highlightable regions`.

- [ ] **Step 3: Implement the wiring in `renderReasonModel.mjs`**

Add the import near the top (with the other `reason_engine` imports):

```js
import { buildAnnotationOffer } from './reason_engine/zoneAnnotations.mjs';
```

In `buildReasonRenderModel`, in BOTH the opening-frame branch and the normal branch, compute the offer from the same board decisions and attach it. Concretely, after `const link = classifyCausalLink(...)` / `assertCoverage(...)`, add:

```js
  const allBoards = boardSelectionDecisions(pruned);
  const zones = buildAnnotationOffer(pruned, allBoards);
```

Then add `zones,` to each returned object (opening branch and normal branch). (In the opening branch `boards` is `[decisionBoard]`; still pass `allBoards` to `buildAnnotationOffer` so after-best/after-played tags remain offerable — the display board is decision regardless.)

In `buildRenderDecision`, after `assertCoverage(...)`, add:

```js
  const zones = buildAnnotationOffer(pruned, boardSelectionDecisions(pruned));
```

and add to the returned object:

```js
    zones: { aliases: zones.aliases, terms: zones.terms },
```

In `assembleGroundedPrompt`, build the two sections and insert them immediately before the `# Internal evidence fields` block:

```js
  const regions = model.zones.aliases.length
    ? model.zones.aliases.map((a) => `- [zone:${a.handle}] = ${a.role} (on the ${a.truthBoard} board)`).join('\n')
    : '(no highlightable squares — describe the idea in words)';
  const termLines = model.zones.terms.length
    ? model.zones.terms.map((t) => `- [term:${t.slug}] = ${t.canonicalPhrase}: ${t.description}`).join('\n')
    : '(no named terms apply here)';
```

and add, in the returned array, before `'# Internal evidence fields …'`:

```js
    '# Highlightable regions',
    'To highlight a phrase, wrap it [zone:<handle>]…[/zone:<handle>] using a handle from this list verbatim. Never write a raw square. Do not overlap a highlight and a term on the same words.',
    regions,
    '',
    '# KB terms you may name',
    'When you use one of these ideas, wrap the words [term:<slug>]…[/term:<slug>] using a slug from this list verbatim. Only these slugs, only when you actually use the idea.',
    termLines,
    '',
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd connect-four && node --test server/tests/renderReasonModel.test.mjs server/tests/renderDecisionEmit.test.mjs`
Expected: PASS.

- [ ] **Step 5: Guard the prompt-split regression test**

Run: `cd connect-four && node --test server/tests/reasonRenderFixes.test.mjs server/tests/computeConditionD.test.mjs`
Expected: PASS. `reasonRenderFixes.test.mjs` checks `p.split('# Internal evidence fields')[0]` has no `null`/`undefined` — the Step-3 sections must not emit them (they don't: empty lists fall back to prose). If it fails, fix the fallback text, not the test.

- [ ] **Step 6: Run the full fast suite and commit**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea/connect-four && npm run test:fast
```
Expected: all pass.

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add connect-four/server/scripts/renderReasonModel.mjs connect-four/server/tests/renderReasonModel.test.mjs connect-four/server/tests/renderDecisionEmit.test.mjs
git commit -m "feat(reason): expose offered zones/terms in render model, prompt, and render_decision

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Apply post-processing to condition-D answers in `compute.mjs`

**Files:**
- Modify: `connect-four/server/scripts/compute.mjs`
- Test: `connect-four/server/tests/computeConditionD.test.mjs`

**Interfaces:**
- Consumes: `processAnnotations` (Task 2); the `render_decision` object already built per condition-D record (`renderDecisionForCondition`).
- Produces: `postprocessAnswer(answer, render_decision) -> answer` — returns the answer with `mechanism` expanded/validated and `key_cells` re-derived; a no-op when `render_decision` is null or `answer` is null.

- [ ] **Step 1: Write the failing test (append to `computeConditionD.test.mjs`)**

```js
import { postprocessAnswer } from '../scripts/compute.mjs';

test('postprocessAnswer expands handles + rederives key_cells only when a zone was emitted', () => {
  const rd = { zones: { aliases: [{ handle: 'better-col', spec: 'col3', role: 'x', truthBoard: 'decision', kbId: null }],
                        terms: [] } };
  // a zone WAS emitted -> mechanism expanded, key_cells re-derived from the spec
  const withZone = postprocessAnswer({ mechanism: 'play [zone:better-col]column 3[/zone:better-col]', key_cells: ['c9r9'] }, rd);
  assert.match(withZone.mechanism, /\[zone:col3\]column 3\[\/zone:col3\]/);
  assert.deepEqual(withZone.key_cells, ['c3r1', 'c3r2', 'c3r3', 'c3r4', 'c3r5', 'c3r6']); // col3 expanded
  // NO zone emitted -> key_cells preserved (transition safety, M4): don't zero the model's cells
  // before it is prompted to emit handles
  const noZone = postprocessAnswer({ mechanism: 'just prose', key_cells: ['c1r1'] }, rd);
  assert.deepEqual(noZone.key_cells, ['c1r1']);
  // no-op paths
  const same = { mechanism: 'x', key_cells: ['c1r1'] };
  assert.deepEqual(postprocessAnswer(same, null), same);
  assert.equal(postprocessAnswer(null, rd), null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd connect-four && node --test server/tests/computeConditionD.test.mjs`
Expected: FAIL — `postprocessAnswer is not a function`.

- [ ] **Step 3: Add `postprocessAnswer` and call it in the answer loop**

Add the import near the top of `compute.mjs` (with the other reason imports):

```js
import { processAnnotations } from './reason_engine/zoneAnnotations.mjs';
```

Add the exported helper:

```js
// Condition-D post-processing: expand offered zone handles -> real specs, drop unoffered tags, and
// re-derive key_cells from the expanded specs. No-op for A/B/C (render_decision is null) or a null answer.
// Transition safety (M4): only overwrite key_cells when the model actually emitted >=1 zone handle;
// until it is prompted to emit handles, keep the model's own key_cells so the /admin/fv-suff overlay
// doesn't silently empty out. (G5 grading is unaffected — it reads render_decision, not answer.key_cells.)
export function postprocessAnswer(answer, render_decision) {
  if (!answer || !render_decision?.zones) return answer;
  const { mechanism, keyCells, zonesEmitted } = processAnnotations(answer.mechanism ?? '', render_decision.zones);
  answer.mechanism = mechanism;
  if (zonesEmitted) answer.key_cells = keyCells;
  return answer;
}
```

In the answer loop, the parsed answer is the local `answer` (from `({ answer, parse_error } = parseAnswer(raw))` at `compute.mjs:362`; assigned into the output `line.answer` at `:373`). Right after the `try/catch` that sets `answer` (i.e. after `compute.mjs:365`, before the `const line = {…}` at `:366`), add:

```js
        answer = postprocessAnswer(answer, render_decision);
```

`render_decision` is already in scope (`compute.mjs:356`). This mutates/expands `answer.mechanism` and `answer.key_cells` before it is written into `line.answer`; it is a no-op for A/B/C (null `render_decision`) and for a null `answer` (parse/call error). Do not touch `raw`/`parse_error`/`call_error`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd connect-four && node --test server/tests/computeConditionD.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add connect-four/server/scripts/compute.mjs connect-four/server/tests/computeConditionD.test.mjs
git commit -m "feat(reason): post-process condition-D answers (expand handles, rederive key_cells)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Coverage predicates for the offered annotations

**Files:**
- Modify: `connect-four/server/scripts/renderUniverse.mjs`
- Test: `connect-four/server/tests/renderUniverse.test.mjs`

**Interfaces:**
- Consumes: `render_decision.zones` (Task 3).
- Produces: `renderDecisionPredicates(rd)` additionally emits `zone_speckind_cell`, `zone_speckind_window`, `zone_speckind_col`, `term_emitted`, `zones_no_tactical`; `RENDER_UNIVERSE`/`RENDER_PROVISIONAL` list them.

- [ ] **Step 1: Write the failing test (append to `renderUniverse.test.mjs`)**

```js
test('zone/term coverage predicates fire from render_decision.zones', () => {
  const rd = baseRd({ zones: { aliases: [
      { handle: 'better-col', spec: 'col3', truthBoard: 'decision', kbId: null },
      { handle: 'you-immediate', spec: 'c1r4', truthBoard: 'decision', kbId: 'immediate_threat' },
      { handle: 'opp-double', spec: 'windows:c5r1,c7r1', truthBoard: 'afterPlayed', kbId: 'double_threat' } ],
    terms: [{ slug: 'double_threat', kbId: 'double_threat', canonicalPhrase: 'x', description: 'y' }] } });
  const p = renderDecisionPredicates(rd);
  assert.ok(p.has('zone_speckind_col'));
  assert.ok(p.has('zone_speckind_cell'));
  assert.ok(p.has('zone_speckind_window'));
  assert.ok(p.has('term_emitted'));
  assert.ok(!p.has('zones_no_tactical'));
});

test('zones_no_tactical fires when only column aliases are offered', () => {
  const rd = baseRd({ zones: { aliases: [{ handle: 'better-col', spec: 'col3', truthBoard: 'decision', kbId: null }], terms: [] } });
  const p = renderDecisionPredicates(rd);
  assert.ok(p.has('zones_no_tactical'));
  assert.ok(!p.has('term_emitted'));
});
```

`baseRd(overrides)`: if the test file has no such helper, add a minimal one that returns a valid `render_decision` (`{ link:{id:'L5'}, route:'sign', case:'win_to_lose', direction:null, patternOnAfterBestBoard:null, boards:[], fieldPartition:{covered:[]}, resource:null, ...overrides }`). Match the shape the existing tests in this file already build.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd connect-four && node --test server/tests/renderUniverse.test.mjs`
Expected: FAIL — predicates absent.

- [ ] **Step 3: Implement in `renderUniverse.mjs`**

In `renderDecisionPredicates(rd)`, before `return p;`, add:

```js
  const aliases = rd.zones?.aliases ?? [];
  const kindOf = (spec) => spec.startsWith('col') ? 'col' : spec.startsWith('windows:') || spec.startsWith('cells:') ? 'window' : 'cell';
  for (const a of aliases) p.add(`zone_speckind_${kindOf(a.spec)}`);
  if ((rd.zones?.terms ?? []).length > 0) p.add('term_emitted');
  if (!aliases.some((a) => kindOf(a.spec) !== 'col')) p.add('zones_no_tactical'); // only columns => no tactical highlight
```

Add to `RENDER_UNIVERSE` (append):

```js
  'zone_speckind_cell', 'zone_speckind_window', 'zone_speckind_col',
  'term_emitted', 'zones_no_tactical',
```

Add to `RENDER_PROVISIONAL` the rare ones (self-play may not reach forks / a fully non-tactical case every run):

```js
  'zone_speckind_window',  // fork tags are rarer than single-cell threats
  'zones_no_tactical',     // a case with no tactical highlight at all is rare
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd connect-four && node --test server/tests/renderUniverse.test.mjs`
Expected: PASS.

- [ ] **Step 5: Run the corpus coverage tests; demote any uncovered REQUIRED predicate**

Run: `cd connect-four && node --test server/tests/renderCoverageUniverse.test.mjs server/tests/renderCoverageCorpus.test.mjs`
Expected: PASS. These run the frozen 32-board corpus through the render pipeline and assert every `RENDER_REQUIRED` predicate is hit ≥1. `zone_speckind_col`/`zone_speckind_cell`/`term_emitted` should be covered (tactic cases carry tags; every case has move columns). **If a newly-REQUIRED predicate is uncovered**, move it into `RENDER_PROVISIONAL` (bounded, honest — do NOT harvest new boards this pass; that is the separate `select_boards` targeted-harvest job, out of scope here) and note it in the commit.

- [ ] **Step 6: Commit**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add connect-four/server/scripts/renderUniverse.mjs connect-four/server/tests/renderUniverse.test.mjs
git commit -m "feat(reason): coverage predicates for offered zone specs + fired terms

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Teach the grader about G7 (zone/term annotation fidelity)

**Files:**
- Modify: `.claude/skills/grade-fv-sufficiency/SKILL.md`

**Interfaces:** documentation only — no code, no test. The grader is a Claude-Code skill; verify by reading the edited sections.

- [ ] **Step 1: Add the `zones` ground-truth field to the render_decision description**

In the "Grading condition D — the `render_decision` rubric (G1–G6)" section, extend the `render_decision` shape line to include `zones:{aliases:[{handle,spec,role,truthBoard,kbId}],terms:[{slug,kbId,canonicalPhrase}]}`. State: consume `zones` as GROUND TRUTH like every other `render_decision` element (never re-derive the offered set).

- [ ] **Step 2: Add the G7 rows to the G1–G6 table and rename the section to G1–G7**

Add:

```
| **G7 annotation fidelity** | **G7a (zones):** every emitted `[zone:handle]` in `mechanism` used a handle listed in `render_decision.zones.aliases` (unoffered handles are dropped by the pipeline, so a surviving one is a pipeline bug); each handle wraps a phrase whose meaning matches its `role`; nothing is over-wrapped. Board-truth of the alias's `spec` is delegated to **G5**, checked on the alias's `truthBoard` (not the displayed decision board). **G7b (terms):** every `[term:slug]` used a slug in `render_decision.zones.terms`, and the wrapped phrase genuinely denotes that KB concept. | `render_decision.zones` + `visualize_board.sh` on the alias's `truthBoard` |
```

- [ ] **Step 3: Make the A5 strip-markup step explicit**

In the A5 section (and the sub-agent template's A5 bullet), add: *"Before checking A5, STRIP all `[zone:…]…[/zone:…]` and `[term:…]…[/term:…]` markup from `mechanism` and grade the cleaned prose — the markup is machine tokens the frontend removes, exactly as production `checkP3` strips tags before its jargon scan. Do NOT fail A5 for the presence of a `[zone:…]`/`[term:…]` tag."*

- [ ] **Step 4: Extend the output schema + triage**

- In the sub-agent template's "Score G1–G6" block, add `G7` with the G7a/G7b checks, and note it is condition-D only.
- In the output JSON schema, add `"G7":"pass|fail (condition D only)"` to each `per_run` entry.
- In the counterexample `axis` enum, add `G7`.
- Add the triage rows: handle/slug not offered, or bound to a semantically wrong phrase, or over-wrapped → `prompt_confusion`; an offered alias whose `spec` is board-false on its `truthBoard` → `render_bug` (surfaced by G5); a cell/tactic the case needed that the render layer never offered → `missing_info`.

- [ ] **Step 5: Commit**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add .claude/skills/grade-fv-sufficiency/SKILL.md
git commit -m "docs(grader): add G7 zone/term annotation fidelity + strip-before-A5

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Final integration check + design-doc checklist

**Files:**
- Modify: `docs/superpowers/specs/2026-07-06-grounded-render-zone-tags-design.md` (tick §10 checklist)

- [ ] **Step 1: Run the full fast suite**

Run: `cd /Users/elsonidoq/prog/cuatro_en_linea/connect-four && npm run test:fast`
Expected: all pass (no solver harvest / dev server running concurrently — memory `project_integration_test_slowness`).

- [ ] **Step 2: Smoke-test one condition-D prompt end to end**

Run:
```bash
cd /Users/elsonidoq/prog/cuatro_en_linea/connect-four
node -e "import('./server/scripts/renderReasonModel.mjs').then(m=>{const nv={movestring:'341330613',playedCol:4,bestCol:3,player:2,opponent:1,case:'win_to_lose',route:'sign',lostResource:{kind:'winning_line',register:'forced_sequence',completingCell:'c6r5'},opponentPunishment:{kind:'winning_line',register:'forced_sequence',completingCell:'c3r3',tie:{kind:'tied',sharedCells:['c4r5']}},replyHistogram:{afterBest:0,afterPlayed:1}};console.log(m.assembleGroundedPrompt(m.buildReasonRenderModel(nv)))})"
```
Expected: the printed prompt contains `# Highlightable regions`, `[zone:better-col]`, `# KB terms you may name`, the no-overlap instruction, and no literal `null`/`undefined`.

- [ ] **Step 3: Tick the §10 checklist in the design doc and commit**

Mark the five §10 boxes done in `docs/superpowers/specs/2026-07-06-grounded-render-zone-tags-design.md`.

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add docs/superpowers/specs/2026-07-06-grounded-render-zone-tags-design.md
git commit -m "docs(reason): mark zone-tag design change-discipline checklist complete

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-review notes

- **Spec coverage:** §1 decisions → Tasks 1–6; §2 data model (inline, derived key_cells, abstention) → Tasks 2/4/5; §3 alias+term emission → Task 1 (structural-only highlights + KB-backed term vocab per the C1/C2/M1 design updates); §3d `render_decision.zones` → Task 3; §4 prompt sections → Task 3; §5 post-process pipeline → Tasks 2/4; §6 nesting instruction → Task 3 Step 3; §7 grader G7 → Task 6; §8 coverage → Task 5 (`zone_speckind_*` + `term_emitted` + `zones_no_tactical`, matching the reconciled §8). §10 checklist → Task 7. Frontend serving (§6/§9) is explicitly downstream/out of scope.
- **Abstention (design §2/§8):** the *render-side* no-tactical-highlight case is covered by `zones_no_tactical` (Task 5); the *LLM-side* choice to wrap nothing is per-answer, not a board predicate, and is exercised by the answerer/grader (Task 4's `zonesEmitted` gate), not the sampler — as §8 now states.
- **Not covered by design, intentionally deferred:** retiring `annotationGate.js`/`explainContext.js` production code (§9 item 3) — a later deletion pass once the grounded path is wired to the endpoint; this plan only makes the grounded path *capable*.
- **Type consistency:** `zones = { aliases, zoneAliasMap, terms }` from `buildAnnotationOffer`; `render_decision.zones = { aliases, terms }` (map omitted); `processAnnotations(mechanism, zones)` reads `zones.aliases`/`zones.terms`; alias shape `{handle, spec, role, truthBoard, kbId}` is identical across Tasks 1/3/4/5/6.
