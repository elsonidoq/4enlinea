import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAnnotationOffer, normalizeAnnotationTags, processAnnotations } from '../scripts/reason_engine/zoneAnnotations.mjs';
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

test('processAnnotations bare-strips a genuinely unclosed tag and reports it in repairs', () => {
  const raw = 'You needed to keep the [term:double_threat] on c2 alive because it is tough.';
  const { mechanism, repairs } = processAnnotations(raw, ZONES);
  assert.doesNotMatch(mechanism, /\[term:/);
  assert.doesNotMatch(mechanism, /\[\/term:/);
  assert.match(mechanism, /You needed to keep the  on c2 alive because it is tough\./);
  assert.deepEqual(repairs, ['unclosed_tag:term:double_threat']);
});

test('processAnnotations bare-strips an unclosed zone tag used mid-sentence', () => {
  const raw = 'Playing in [zone:better-col] keeps the fight alive; [zone:opp-double] hands them the finish.';
  const { mechanism, repairs } = processAnnotations(raw, ZONES);
  assert.doesNotMatch(mechanism, /\[zone:/);
  assert.deepEqual(repairs, ['unclosed_tag:zone:better-col', 'unclosed_tag:zone:opp-double']);
});

test('processAnnotations reports empty repairs when all tags are properly paired', () => {
  const raw = 'Column [zone:better-col]3[/zone:better-col] denies the double threat.';
  const { repairs } = processAnnotations(raw, ZONES);
  assert.deepEqual(repairs, []);
});

test('stripUnclosedTags does not let a bare opener hide behind a LATER, unrelated properly-paired tag of the same id', () => {
  const raw = '[term:double_threat] intro. Later [term:double_threat]actual phrase[/term:double_threat].';
  const { mechanism, repairs } = processAnnotations(raw, ZONES);
  assert.doesNotMatch(mechanism, /\[term:double_threat\] intro/); // the bare opener is gone
  assert.match(mechanism, /\[term:double_threat\]actual phrase\[\/term:double_threat\]/); // the real pair survives untouched
  assert.deepEqual(repairs, ['unclosed_tag:term:double_threat']);
});
