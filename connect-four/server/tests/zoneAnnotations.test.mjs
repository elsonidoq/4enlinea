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
// `tacticTag`, not `tag` — halves have never had a `tag` field. The old spelling here was the same
// dead-name mistake production carried until 2026-08-05; it is corrected so the fixture describes a
// half that can actually exist. (This half has no completingCell/window, so it contributes no alias.)
const pruned = { bestCol: 2, playedCol: 3, lostResource: {}, opponentPunishment: { tacticTag: 'figure_7' } };

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

// ── future: deep fork cells (US1, deep-reveal-grounding spec 058, Settled decision 8) ──────────
//
// Harvested (not hand-built), per CLAUDE.md's "Verifying any claim about this codebase": this is
// the REAL `{ pruned, boards }` produced by running the actual production pipeline —
// `computeReason('3154442332131341225551', 5, { solver })` -> `toNarratorVector` -> `pruneVector`
// -> `boardSelectionDecisions(pruned)` — against the solver-verified staging movestring
// `3154442332131341225551` (epic evidence row; `./visualize_board.sh` confirms the board), with
// `playedCol=5` (0-indexed) as the blunder. Trimmed to the fields buildAnnotationOffer reads.
// `opponentPunishment.forkCells: ["c2r6","c5r5"]` + `tacticTag: "double_threat"` match the epic's
// evidence table exactly. Note `boards[3]` (projectedDeep) has EMPTY tags — confirming the new
// alias source must read forkCells/tacticTag off the halves directly, not off board.tags (which
// NEAR_TERM already excludes projectedDeep from in the existing STRUCTURAL loop).
const deepForkPruned = {
  bestCol: 2, playedCol: 5,
  lostResource: {
    kind: 'winning_line', register: 'parity', completingCell: 'c7r3',
    window: ['c7r3', 'c6r4', 'c5r5', 'c4r6'], tacticTag: null, forkCells: undefined,
  },
  opponentPunishment: {
    kind: 'winning_line', register: 'forced_sequence', completingCell: 'c2r6',
    window: ['c5r3', 'c4r4', 'c3r5', 'c2r6'], terminal: 'fork', forkCase: 'A',
    forkCells: ['c2r6', 'c5r5'],
    forkWindows: [['c5r3', 'c4r4', 'c3r5', 'c2r6'], ['c2r5', 'c3r5', 'c4r5', 'c5r5']],
    tacticTag: 'double_threat', tacticCells: ['c2r6', 'c5r5'],
  },
};
const deepForkBoards = [
  { id: 'decision', tags: [
      { cell: 'c1r3', kind: 'major', owner: 'you' },
      { cell: 'c1r4', kind: 'major', owner: 'opp' } ] },
  { id: 'afterPlayed', tags: [
      { cell: 'c1r3', kind: 'major', owner: 'you' },
      { cell: 'c1r3', kind: 'double', owner: 'you', window: ['c1r3', 'c7r6'] },
      { cell: 'c1r4', kind: 'major', owner: 'opp' },
      { cell: 'c7r6', kind: 'major', owner: 'you' } ] },
  { id: 'projectedDeep', tags: [] }, // real production output — empty, confirms the point above
];

test('future: deep fork cells (tacticTag double_threat) are offered as a distinct future: alias', () => {
  const { aliases, zoneAliasMap } = buildAnnotationOffer(deepForkPruned, deepForkBoards);
  const future = aliases.find((a) => a.spec.startsWith('future:'));
  assert.ok(future, 'a future:-prefixed alias must be offered for the deep fork cells');
  assert.equal(future.spec, 'future:windows:c2r6,c5r5');
  assert.equal(zoneAliasMap[future.handle], future.spec);
  assert.equal(future.truthBoard, 'projectedDeep');
  assert.equal(future.kbId, 'double_threat');
});

test('future: alias role text is distinct from the present-tense structural roleText() output', () => {
  const { aliases } = buildAnnotationOffer(deepForkPruned, deepForkBoards);
  const future = aliases.find((a) => a.spec.startsWith('future:'));
  const presentDouble = aliases.find((a) => a.spec.startsWith('windows:') && !a.spec.startsWith('future:'));
  assert.ok(future && presentDouble, 'fixture must offer both a future and a present structural fork alias');
  assert.notEqual(future.role, presentDouble.role);
  // FR-002: never framed as a present threat — future/conditional language only.
  assert.match(future.role, /later|once|not.*right now/i);
  assert.doesNotMatch(future.role, /^the fork square where/); // the present-tense 'double' phrasing
});

test('a MULTI-cell future fork alias is described as more than one square (D45 — it is now required)', () => {
  // Under D45 the `<owner>-future-fork` alias is a REQUIRED group whenever a half is a
  // double_threat with >= 2 forkCells, so its role text is read and paraphrased every time. The
  // singular 'this single square matters later' wording mis-describes a two-cell spec, and the
  // model paraphrased it back as "the later fork square" (measured, t043 run 1).
  const { aliases } = buildAnnotationOffer(deepForkPruned, deepForkBoards);
  const fork = aliases.find((a) => a.handle.endsWith('-future-fork'));
  assert.ok(fork.spec.startsWith('future:windows:'), 'fixture must give a multi-cell fork spec');
  assert.doesNotMatch(fork.role, /single square/);
  assert.match(fork.role, /squares/);
  assert.match(fork.role, /later|once|not.*right now/i);   // FR-002 still holds
});

test('future: alias does not shadow or duplicate the near-term structural aliases', () => {
  const { aliases } = buildAnnotationOffer(deepForkPruned, deepForkBoards);
  // the genuinely near-term fork (c1r3/c7r6, board-true on afterPlayed) is still offered normally
  assert.ok(aliases.some((a) => a.spec === 'windows:c1r3,c7r6'));
  // and the future alias for the deep fork cells is additional, not a replacement: the near-term
  // fork's own spec is never future-prefixed, and the deep fork handle is still present.
  assert.ok(!aliases.some((a) => a.spec === 'future:windows:c1r3,c7r6'));
  assert.ok(aliases.some((a) => a.handle.endsWith('-future-fork')));
});

test('terms: KB-backed slugs only, canonicalPhrase from TAG_PHRASE, conditional_swindle never a term', () => {
  const { terms } = buildAnnotationOffer(
    { bestCol: 2, playedCol: 3, lostResource: { kind: 'conditional_swindle' }, opponentPunishment: { tacticTag: 'figure_7' } },
    boards);
  const bySlug = Object.fromEntries(terms.map((t) => [t.slug, t]));
  assert.ok(bySlug['figure_7'], 'figure_7 fired via opponentPunishment.tacticTag (the real field name; `tag` never existed)');
  assert.equal(bySlug['figure_7'].kbId, 'figure_7');
  assert.equal(bySlug['figure_7'].canonicalPhrase, TAG_PHRASE.figure_7); // imported, no local copy
  assert.ok(bySlug['immediate_threat'], 'immediate fired via a structural board tag');
  assert.ok(bySlug['double_threat'], 'double fired via a structural board tag');
  assert.ok(!bySlug['conditional_swindle'], 'conditional_swindle has no KB entry -> never a term');
  // every offered term id is one of the four KB-backed slugs
  const KB_BACKED = new Set(['immediate_threat', 'double_threat', 'figure_7', 'claimeven']);
  for (const t of terms) assert.ok(KB_BACKED.has(t.kbId), `${t.kbId} must be KB-backed`);
});

test('terms fire from a half tacticTag — measured on the spec-058 feedback board 2 (RC-C)', () => {
  // Harvested: computeReason('315444233213', 1) -> opponentPunishment.tacticTag === 'double_threat'.
  // Before this fix the terms list was [] for this board, so [term:double_threat] was never offered
  // and the coach's "double threat" phrase carried zero markup (feedback ask 2c).
  const { terms } = buildAnnotationOffer(
    { bestCol: 3, playedCol: 1,
      lostResource: { register: 'parity', completingCell: 'c5r5' },
      opponentPunishment: { register: 'forced_sequence', completingCell: 'c3r5',
                            tacticTag: 'double_threat' } },
    []);   // no board decisions: proves the slug comes from the HALF, not a structural board tag
  assert.deepEqual(terms.map((t) => t.slug), ['double_threat']);
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

// ── usedSpecs (spec 058, US2, data-model.md §2 hop 1) ────────────────────────────────────────
// The required-set retry-compliance check (next batch) is pinned to this field, not a raw
// `[zone:handle]` string search — see spec.md's Corrections item 4 / research.md D3.
test('processAnnotations returns usedSpecs: only the expanded specs of handles actually used in the text', () => {
  const raw = 'Column [zone:better-col]3[/zone:better-col] denies the '
    + '[zone:opp-double][term:double_threat]double threat[/term:double_threat][/zone:opp-double].';
  const { usedSpecs } = processAnnotations(raw, ZONES);
  assert.ok(Array.isArray(usedSpecs));
  assert.deepEqual([...usedSpecs].sort(), ['col3', 'windows:c5r1,c7r1']);
});

test('processAnnotations usedSpecs excludes an offered handle that never appears in the text', () => {
  const raw = 'Column [zone:better-col]3[/zone:better-col] alone.'; // opp-double handle never used
  const { usedSpecs } = processAnnotations(raw, ZONES);
  assert.deepEqual(usedSpecs, ['col3']);
});

test('processAnnotations usedSpecs is empty when no offered handle is used at all', () => {
  const { usedSpecs } = processAnnotations('just prose, no zone tags at all.', ZONES);
  assert.deepEqual(usedSpecs, []);
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
  assert.match(mechanism, /You needed to keep the {2}on c2 alive because it is tough\./);
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

test('a major/immediate tag also offers its four-in-a-row LINE as a separate alias (ask 2b)', () => {
  // Harvested from board 315444233213 played col 1: the decision board carries a `you` major at
  // c3r4 whose completing line is the diagonal c6r1-c5r2-c4r3-c3r4. Before this change the ONLY
  // alias for it was the bare cell, so the coach's phrase "four-in-a-row line" was grounded to a
  // single square (feedback ask 2b).
  const boardsFixture = [{ id: 'decision', tags: [
    { cell: 'c3r4', kind: 'major', owner: 'you', lineWindow: ['c6r1', 'c5r2', 'c4r3', 'c3r4'] },
  ] }];
  const { aliases } = buildAnnotationOffer({ bestCol: 3, playedCol: 1 }, boardsFixture);
  const bySpec = Object.fromEntries(aliases.map((a) => [a.spec, a]));
  assert.ok(bySpec['c3r4'], 'the single-cell alias is still offered, unchanged');
  assert.equal(bySpec['c3r4'].handle, 'you-major');
  const line = bySpec['windows:c6r1,c5r2,c4r3,c3r4'];
  assert.ok(line, 'the LINE is offered as an additional alias');
  assert.equal(line.handle, 'you-major-line');
  assert.match(line.role, /four-in-a-row line/);
  assert.doesNotMatch(line.role, /matters later/); // present, board-true: NOT future-framed
});

test('each half offers its own completing cell, line, fork lines and fork squares (RC-B)', () => {
  // Harvested verbatim from computeReason('3154442332131341225551', 5) -> toNarratorVector.
  const halfPruned = {
    bestCol: 2, playedCol: 5,
    lostResource: { kind: 'winning_line', register: 'parity', completingCell: 'c7r3',
                    window: ['c7r3', 'c6r4', 'c5r5', 'c4r6'], pliesToEnd: 16 },
    opponentPunishment: { kind: 'winning_line', register: 'forced_sequence', completingCell: 'c2r6',
                          window: ['c5r3', 'c4r4', 'c3r5', 'c2r6'], pliesToEnd: 1,
                          tacticTag: 'double_threat', forkCells: ['c2r6', 'c5r5'],
                          forkWindows: [['c5r3', 'c4r4', 'c3r5', 'c2r6'],
                                        ['c2r5', 'c3r5', 'c4r5', 'c5r5']] },
  };
  const { aliases } = buildAnnotationOffer(halfPruned, []);
  const byHandle = Object.fromEntries(aliases.map((a) => [a.handle, a.spec]));
  assert.equal(byHandle['you-key-square'], 'future:c7r3');
  assert.equal(byHandle['you-key-line'], 'future:windows:c7r3,c6r4,c5r5,c4r6');
  assert.equal(byHandle['opp-key-square'], 'future:c2r6');
  assert.equal(byHandle['opp-key-line'], 'future:windows:c5r3,c4r4,c3r5,c2r6');
  assert.equal(byHandle['opp-fork-lines'], 'future:windows:c5r3,c4r4,c3r5,c2r6|c2r5,c3r5,c4r5,c5r5');
  // c2r6 is already offered as opp-key-square, so only the OTHER fork cell gets its own alias.
  assert.equal(byHandle['opp-fork-square'], 'future:c5r5');
  // FR-002: every deep handle is future-framed, none reads as a present threat.
  for (const a of aliases.filter((x) => x.spec.startsWith('future:'))) {
    assert.match(a.role, /later|once|not.*right now/i);
    assert.equal(a.truthBoard, 'projectedDeep');
  }
});

test('a half with an `immediate` register is offered WITHOUT the future: prefix', () => {
  const { aliases } = buildAnnotationOffer(
    { bestCol: 1, playedCol: 5,
      lostResource: { register: 'immediate', completingCell: 'c1r1' },
      opponentPunishment: { register: 'immediate', completingCell: 'c2r1' } },
    []);
  const byHandle = Object.fromEntries(aliases.map((a) => [a.handle, a.spec]));
  assert.equal(byHandle['you-key-square'], 'c1r1');
  assert.equal(byHandle['opp-key-square'], 'c2r1');
});

test('a denial half is offered as the OPPONENT geometry, not the player\'s own', async () => {
  // OI-184, task 7 (deep-reveal-render-remediation): buildAnnotationOffer used to hard-map
  // lostResource -> 'you' / opponentPunishment -> 'opp' by POSITION. A denial/neutralization half
  // describes the geometry the OPPONENT was denied, not the mover's own line, so it must flip owner.
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const { toNarratorVector, pruneVector } = await import('../scripts/reasonNarratorVector.mjs');
  const { boardSelectionDecisions } = await import('../scripts/reasonBoardSelect.mjs');
  const here = dirname(fileURLToPath(import.meta.url));
  const rows = readFileSync(join(here, '../scripts/reason_corpus/evidence.jsonl'), 'utf8')
    .trim().split('\n').map((l) => JSON.parse(l));

  const fv = pruneVector(toNarratorVector(rows.find((r) => r.id === 'pin-L2-enabled-opponent').evidence));
  assert.equal(fv.lostResource.kind, 'denial', 'fixture assumption: this half is a denial');
  const zones = buildAnnotationOffer(fv, boardSelectionDecisions(fv));
  for (const a of zones.aliases) {
    if (a.handle.startsWith('you-key')) {
      assert.fail(`denial geometry offered as the player's own: ${a.handle} = ${a.spec} (${a.role})`);
    }
  }
});

test('openingHorizon suppresses the half-geometry family entirely (opening guardrail)', () => {
  const openingPruned = { bestCol: 3, playedCol: 1,
    lostResource: { register: 'parity', completingCell: 'c5r5', window: ['c2r5','c3r5','c4r5','c5r5'] },
    opponentPunishment: { register: 'parity', completingCell: 'c3r3' } };
  const withHalves = buildAnnotationOffer(openingPruned, []).aliases.map((a) => a.handle);
  const suppressed = buildAnnotationOffer(openingPruned, [], { openingHorizon: true }).aliases.map((a) => a.handle);
  assert.ok(withHalves.includes('you-key-square'));
  assert.deepEqual(suppressed, ['better-col', 'played-col']);
});

test('a double_threat half offers the fork PIVOT, distinct from the finishing squares', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const { toNarratorVector, pruneVector } = await import('../scripts/reasonNarratorVector.mjs');
  const { boardSelectionDecisions } = await import('../scripts/reasonBoardSelect.mjs');
  const here = dirname(fileURLToPath(import.meta.url));
  const rows = readFileSync(join(here, '../scripts/reason_corpus/evidence.jsonl'), 'utf8')
    .trim().split('\n').map((l) => JSON.parse(l));

  const fv = pruneVector(toNarratorVector(rows.find((r) => r.id === 'eval-18').evidence));
  const half = fv.lostResource;
  // Harvested, not assumed — printed from the corpus on 2026-08-11:
  //   tacticTag 'double_threat', forkCells ["c5r5","c7r6"], entryCell 'c6r3',
  //   line.length 28, line[27] = {ply:39, mover:1, col:4, cell:'c5r4'}
  assert.equal(half.tacticTag, 'double_threat');
  assert.deepEqual(half.forkCells, ['c5r5', 'c7r6']);

  const zones = buildAnnotationOffer(fv, boardSelectionDecisions(fv));
  const pivot = zones.aliases.find((a) => a.handle.endsWith('-fork-pivot'));
  assert.ok(pivot, `no fork-pivot alias offered; got ${zones.aliases.map((a) => a.handle).join(', ')}`);
  assert.match(pivot.spec, /c5r4$/, 'the pivot is the LAST ply of line[], not entryCell');
  assert.doesNotMatch(pivot.spec, /c6r3/, 'c6r3 is entryCell (line[0]) — the wrong end of the line');
  assert.match(pivot.role, /creates|makes both/i);
  assert.ok(!half.forkCells.includes(pivot.spec.replace('future:', '')),
    'the pivot must be distinct from the finishing squares');
});

test('a figure_7 half also gets fork aliases (it is a 7-shaped double threat)', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const { toNarratorVector, pruneVector } = await import('../scripts/reasonNarratorVector.mjs');
  const { boardSelectionDecisions } = await import('../scripts/reasonBoardSelect.mjs');
  const here = dirname(fileURLToPath(import.meta.url));
  const rows = readFileSync(join(here, '../scripts/reason_corpus/evidence.jsonl'), 'utf8')
    .trim().split('\n').map((l) => JSON.parse(l));

  // eval-12's lostResource is tacticTag 'figure_7', forkCells ["c2r5"] (harvested 2026-08-11).
  const fv = pruneVector(toNarratorVector(rows.find((r) => r.id === 'eval-12').evidence));
  assert.equal(fv.lostResource.tacticTag, 'figure_7');
  const zones = buildAnnotationOffer(fv, boardSelectionDecisions(fv));
  assert.ok(zones.aliases.some((a) => /fork/.test(a.handle)),
    `figure_7 fork got no fork alias; handles: ${zones.aliases.map((a) => a.handle).join(', ')}`);
});
