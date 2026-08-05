import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { buildReasonRenderModel, assembleGroundedPrompt, buildRenderDecision, deriveRequiredSet } from '../scripts/renderReasonModel.mjs';

const OPENING = JSON.parse(readFileSync(new URL('./fixtures/opening_vectors.json', import.meta.url)));

const NV = {
  movestring: '341330613', playedCol: 4, bestCol: 3, player: 2, opponent: 1,
  case: 'win_to_lose', route: 'sign',
  lostResource: { kind: 'winning_line', register: 'forced_sequence', completingCell: 'c6r5' },
  opponentPunishment: { kind: 'winning_line', register: 'forced_sequence', completingCell: 'c3r3',
                        tie: { kind: 'tied', sharedCells: ['c4r5'] } },
  replyHistogram: { afterBest: 0, afterPlayed: 1 },
};

test('buildReasonRenderModel classifies link and passes coverage', () => {
  const m = buildReasonRenderModel(NV);
  assert.equal(m.link.id, 'L6');
  assert.equal(m.coverage.ok, true);
  assert.equal(m.perspective.you, 2);
});

test('rendered fields keep render cells but drop transformed/excluded (path-precise)', () => {
  const m = buildReasonRenderModel({ ...NV, notABlunder: false,
    lostResource: { ...NV.lostResource, finalMovestring: '34133061334', exhaustive: true } });
  assert.equal(m.rendered.lostResource.completingCell, 'c6r5');      // render cell survives
  assert.ok(!('finalMovestring' in m.rendered.lostResource));         // transformed dropped
  assert.ok(!('exhaustive' in m.rendered.lostResource));              // excluded dropped
  assert.ok(!('notABlunder' in m.rendered));                          // excluded dropped
  assert.ok(!('movestring' in m.rendered));                          // transformed dropped
});

test('render model draws an ASCII decision board', () => {
  const m = buildReasonRenderModel(NV);
  const decision = m.boards.find((b) => b.id === 'decision');
  assert.ok(decision);
  assert.match(decision.ascii, /c1|col|\|/); // some board scaffold
});

test('assembled prompt contains the board and omits scores/movestring dump', () => {
  const prompt = assembleGroundedPrompt(buildReasonRenderModel(NV));
  assert.match(prompt, /Board/);
  assert.doesNotMatch(prompt, /"scores"/);
  assert.doesNotMatch(prompt, /"movestring"/); // raw movestring is transformed into the board
});

test('assembled prompt renders composed frame text + guardrail + reading key', () => {
  const m = buildReasonRenderModel(NV);
  assert.ok(m.frames && m.frames[0].text.length > 0);
  const prompt = assembleGroundedPrompt(m);
  assert.match(prompt, /causal link L6/);          // machine marker preserved (computeConditionD test)
  assert.match(prompt, /forced win via c6r5/);     // composed L6 text present (NV's actual completingCell)
  assert.match(prompt, /Guardrail:/);
  assert.match(prompt, /# Reading key/);
  assert.match(prompt, /register:/);               // key explains a residual coded field
  assert.doesNotMatch(prompt, /"scores"/);
  assert.doesNotMatch(prompt, /"movestring"/);
});

test('assembled prompt leads with a canonical 1-indexed Decision block (Fix A)', () => {
  const prompt = assembleGroundedPrompt(buildReasonRenderModel(NV));
  // Decision block is at the TOP, before the boards.
  assert.ok(prompt.indexOf('# Decision') >= 0 && prompt.indexOf('# Decision') < prompt.indexOf('# Boards'));
  assert.match(prompt, /you = player 2/);
  // bestCol 3 -> display column 4, lands c4r5; playedCol 4 -> column 5, lands c5r2.
  assert.match(prompt, /Better move: column 4 \(lands at c4r5\)/);
  assert.match(prompt, /Played move: column 5 \(lands at c5r2\)/);
  // win_to_lose -> best win, played loss.
  assert.match(prompt, /Better move: column 4[^\n]*Outcome: win/);
  assert.match(prompt, /Played move: column 5[^\n]*Outcome: loss/);
});

test('assembled prompt never leaks 0-indexed bestCol/playedCol into the Vector facts JSON (Fix A)', () => {
  const prompt = assembleGroundedPrompt(buildReasonRenderModel(NV));
  assert.doesNotMatch(prompt, /"bestCol"/);
  assert.doesNotMatch(prompt, /"playedCol"/);
});

test('rendered fields drop bestCol/playedCol (transformed via Decision block, Fix A)', () => {
  const m = buildReasonRenderModel(NV);
  assert.ok(!('bestCol' in m.rendered));
  assert.ok(!('playedCol' in m.rendered));
});

test('READING_KEY states the 1-indexed display-column convention (Fix A)', () => {
  const prompt = assembleGroundedPrompt(buildReasonRenderModel(NV));
  assert.match(prompt, /1-indexed display column/);
});

test('an unregistered field makes the model throw', () => {
  assert.throws(() => buildReasonRenderModel({ ...NV, opponentPunishment: { ...NV.opponentPunishment, brandNewField: 1 } }));
});

test('renderedFields prunes transformed/excluded subfields inside object arrays', () => {
  // window as an array of grounded-cell objects; `finalMovestring` (transformed) nested per element
  // must be dropped, while `cell`/`status` (render) survive.
  const m = buildReasonRenderModel({ ...NV,
    lostResource: { ...NV.lostResource,
      window: [{ cell: 'c4r3', status: 'empty', finalMovestring: 'zzz' },
               { cell: 'c5r4', status: 'occupied-you', finalMovestring: 'zzz' }] } });
  const w = m.rendered.lostResource.window;
  assert.equal(w[0].cell, 'c4r3');                 // render subfield kept
  assert.equal(w[0].status, 'empty');              // render subfield kept
  assert.ok(!('finalMovestring' in w[0]));          // transformed subfield dropped
});

test('assembled prompt renders selected boards each with a Tactics list', () => {
  const m = buildReasonRenderModel(NV);
  assert.ok(Array.isArray(m.boards) && m.boards.length >= 1);
  assert.ok(m.boards.every((b) => b.ascii && Array.isArray(b.tags) && b.reason));
  const prompt = assembleGroundedPrompt(m);
  assert.match(prompt, /Y = you \(player 2\)/);   // You/Opp board present
  assert.match(prompt, /Tactics:/);               // threat list section present
  assert.doesNotMatch(prompt, /"scores"/);
  assert.doesNotMatch(prompt, /"movestring"/);
});

test('buildRenderDecision assembles the full decision set from render helpers', () => {
  const rd = buildRenderDecision(NV); // NV from the top of this file (win_to_lose, sign, L6)
  assert.equal(rd.link.id, 'L6');
  assert.equal(rd.route, 'sign');
  assert.equal(rd.case, 'win_to_lose');
  assert.equal(rd.direction, null);              // sign route → no direction
  assert.equal(rd.patternOnAfterBestBoard, null); // only computed for enabled_opponent
  assert.ok(rd.boards.some((b) => b.id === 'decision' && b.shown === true));
  assert.ok(rd.boards.every((b) => typeof b.shown === 'boolean' && b.reason));
  // field partition classifies present leaves into exactly the three buckets
  const all = [...rd.fieldPartition.rendered, ...rd.fieldPartition.covered, ...rd.fieldPartition.excluded];
  assert.ok(all.includes('case'));                        // render
  assert.ok(rd.fieldPartition.covered.includes('route')); // L6 covers route (present code → hidden)
});

test('buildRenderDecision records branch-invariance + finalMovestring for enabled_opponent', () => {
  const fv = {
    movestring: '341330613', playedCol: 4, bestCol: 3, player: 2, opponent: 1,
    case: 'lose_to_faster_lose', route: 'realized_denied', direction: 'enabled_opponent',
    tag: 'double_threat',
    lostResource: { kind: 'denial', verdict: 'occupation' },
    opponentPunishment: { kind: 'realized_pattern', register: 'immediate', completingCell: 'c3r3',
                          window: ['c3r3', 'c4r3', 'c5r3', 'c6r3'], finalMovestring: '3413306133' },
  };
  const rd = buildRenderDecision(fv);
  assert.equal(rd.direction, 'enabled_opponent');
  assert.equal(typeof rd.patternOnAfterBestBoard, 'boolean'); // computed, not null
  assert.equal(rd.link.id, 'L3');                             // lose_to_faster_lose → branch-invariant
  assert.equal(rd.finalMovestring, '3413306133');            // opponent's line (no lostResource winning_line)
});

test('opening vectors no longer throw and lead with the opening frame', () => {
  for (const kind of ['namedOpening', 'defense', 'centrality']) {
    const model = buildReasonRenderModel(OPENING[kind]);   // was: throws UncoveredVectorFieldError
    assert.equal(model.frames.length, 1);
    assert.ok(/opening/i.test(model.frames[0].text));
    assert.deepEqual(model.boards.map((b) => b.id), ['decision']);   // decision board only
  }
});

test('opening prompt has the opening reading key and no deep board', () => {
  const model = buildReasonRenderModel(OPENING.centrality);
  const prompt = assembleGroundedPrompt(model);
  assert.match(prompt, /book line|opening/i);
  assert.doesNotMatch(prompt, /projectedDeep/);
});

test('opening records never offer or require a deep half cell (guardrail + pruneOpeningResidue)', () => {
  for (const kind of ['namedOpening', 'defense', 'centrality']) {
    const model = buildReasonRenderModel(OPENING[kind]);
    assert.deepEqual(model.zones.aliases.filter((a) => a.spec.startsWith('future:')), [],
      `${kind}: opening records must offer no future: handle`);
    assert.deepEqual(model.requiredSet, [], `${kind}: opening records require nothing`);
  }
});

test('opening prompt never leaks a deep completing cell or parityAttribution into Vector facts', () => {
  for (const kind of ['namedOpening', 'defense', 'centrality']) {
    const prompt = assembleGroundedPrompt(buildReasonRenderModel(OPENING[kind]));
    assert.doesNotMatch(prompt, /"completingCell"/);
    assert.doesNotMatch(prompt, /"parityAttribution"/);
  }
});

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

test('annotation instructions require a paired close tag with a bad/good example', () => {
  const prompt = assembleGroundedPrompt(buildReasonRenderModel(NV));
  assert.match(prompt, /MUST have a matching closing tag/i);
  assert.match(prompt, /Bad:.*no closing tag/i);
  assert.match(prompt, /Good:.*\[term:/i);
});

test('assembled prompt does not duplicate the guardrail on a non-opening record', () => {
  const prompt = assembleGroundedPrompt(buildReasonRenderModel(NV));
  const occurrences = prompt.split('You gave up a win AND handed the opponent their own').length - 1;
  assert.equal(occurrences, 1); // L6's guardrail text must appear exactly once, not doubled
});

test('assembled prompt includes the opening frame\'s own guardrail alongside the link guardrail', () => {
  const prompt = assembleGroundedPrompt(buildReasonRenderModel(OPENING.namedOpening));
  assert.match(prompt, /do not ground a specific deep/i); // openingFrame.mjs's own GUARDRAIL text
});

// ── deriveRequiredSet (spec 058, US2 — Derivation Rule, spec.md, verbatim from the epic) ────────

test('deriveRequiredSet returns 1-3 {half,spec,handle,role} entries matched by exact spec equality (D2)', () => {
  const pruned = {
    lostResource: { completingCell: 'c6r5' },
    opponentPunishment: { completingCell: 'c3r3' },
  };
  const zones = { aliases: [
    { handle: 'you-cell', spec: 'c6r5', role: 'the square you needed', truthBoard: 'decision', kbId: null },
    { handle: 'opp-cell', spec: 'c3r3', role: 'the square the opponent took', truthBoard: 'decision', kbId: null },
  ] };
  const req = deriveRequiredSet(pruned, zones);
  assert.ok(req.length >= 1 && req.length <= 3);
  assert.equal(req.length, 2);
  for (const g of req) {
    assert.deepEqual(Object.keys(g).sort(), ['half', 'handle', 'role', 'spec']);
    assert.ok(['lostResource', 'opponentPunishment'].includes(g.half));
  }
  const lr = req.find((g) => g.half === 'lostResource');
  assert.equal(lr.spec, 'c6r5');
  assert.equal(lr.handle, 'you-cell');
  assert.equal(lr.role, 'the square you needed');
});

test('deriveRequiredSet drops a group silently (no error, no placeholder) on match failure (FR-004/FR-006)', () => {
  const pruned = {
    lostResource: { completingCell: 'c6r5' },       // no offered alias for c6r5 below
    opponentPunishment: { completingCell: 'c3r3' },
  };
  const zones = { aliases: [
    { handle: 'opp-cell', spec: 'c3r3', role: 'the square the opponent took', truthBoard: 'decision', kbId: null },
  ] };
  const req = deriveRequiredSet(pruned, zones);
  assert.equal(req.length, 1);
  assert.equal(req[0].half, 'opponentPunishment');
  assert.equal(req[0].spec, 'c3r3');
});

test('deriveRequiredSet yields no entry (not a forced placeholder) when a half has neither cell nor window', () => {
  const pruned = { lostResource: {}, opponentPunishment: { kind: 'denial' } };
  const zones = { aliases: [] };
  assert.deepEqual(deriveRequiredSet(pruned, zones), []);
});

test('deriveRequiredSet falls back to the full half.window array (T-parity worked example, covers: [route, lostResource.terminal, opponentPunishment.terminal])', () => {
  // The Derivation Rule's own worked example (spec.md): a half with no cell/completingCell but a
  // window falls back to the window as a line, matched against a windows: alias spec.
  const pruned = {
    lostResource: { kind: 'winning_line', register: 'parity', window: ['c1r1', 'c2r2', 'c3r3', 'c4r4'] },
    opponentPunishment: { kind: 'winning_line', register: 'parity' }, // no cell/completingCell/window -> no entry
  };
  const zones = { aliases: [
    { handle: 'parity-line', spec: 'windows:c1r1,c2r2,c3r3,c4r4', role: 'the parity group', truthBoard: 'decision', kbId: null },
  ] };
  const req = deriveRequiredSet(pruned, zones);
  assert.equal(req.length, 1);
  assert.equal(req[0].half, 'lostResource');
  assert.equal(req[0].spec, 'windows:c1r1,c2r2,c3r3,c4r4');
  assert.equal(req[0].handle, 'parity-line');
});

test('deriveRequiredSet matches a future:-prefixed alias against a plain derived cell, and keeps the future framing (D43)', () => {
  // Supersedes the spec-058 invariant "a future: alias can never satisfy a derived plain cell".
  // The Derivation Rule matches GEOMETRY; `future:` is a render-framing decorator that
  // zoneParser.isValidSpec/expandSpec, annotationGate.checkP5Strong, reasonRenderGuard.toAllowedSet
  // and the client's annotatedText all already strip before matching. Normalizing the alias INDEX
  // the same way leaves required ⊆ offered intact — the matched alias IS an offered alias.
  const pruned = { lostResource: { completingCell: 'c7r3' }, opponentPunishment: {} };
  const zones = { aliases: [
    { handle: 'you-key-square', spec: 'future:c7r3', role: 'this square matters later', truthBoard: 'projectedDeep', kbId: null },
  ] };
  const groups = deriveRequiredSet(pruned, zones);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].handle, 'you-key-square');
  // The group carries the alias's OWN (prefixed) spec — that is what mechanismExplainer's
  // missingRequiredGroups compares against processAnnotations' usedSpecs.
  assert.equal(groups[0].spec, 'future:c7r3');
  assert.match(groups[0].role, /matters later/);
});

test('deriveRequiredSet still drops a derived cell with no offered alias at all (FR-004)', () => {
  const pruned = { lostResource: { completingCell: 'c7r3' }, opponentPunishment: {} };
  const zones = { aliases: [{ handle: 'better-col', spec: 'col4', role: 'x', truthBoard: 'decision', kbId: null }] };
  assert.deepEqual(deriveRequiredSet(pruned, zones), []);
});

test('buildReasonRenderModel and buildRenderDecision both expose requiredSet (research.md D1 — identical routing)', () => {
  const model = buildReasonRenderModel(NV);
  const rd = buildRenderDecision(NV);
  assert.ok(Array.isArray(model.requiredSet));
  assert.ok(Array.isArray(rd.requiredSet));
  // NV's two halves are both deep (register 'forced_sequence'), so each contributes a future:-framed
  // group (D43). Both builders must agree exactly — research.md D1, identical routing.
  assert.deepEqual(model.requiredSet.map((g) => g.handle), ['you-key-square', 'opp-key-square']);
  assert.deepEqual(model.requiredSet.map((g) => g.spec), ['future:c6r5', 'future:c3r3']);
  assert.deepEqual(rd.requiredSet, model.requiredSet);
});

test('opening records also compute requiredSet (deriveRequiredSet runs on both buildReasonRenderModel branches)', () => {
  const model = buildReasonRenderModel(OPENING.centrality);
  assert.ok(Array.isArray(model.requiredSet));
});

test('assembled prompt includes the "You MUST build the explanation around these" block, naming required handles', () => {
  const model = buildReasonRenderModel(NV);
  model.requiredSet = [{ half: 'lostResource', spec: 'c6r5', handle: 'you-major', role: 'the square you needed' }];
  const prompt = assembleGroundedPrompt(model);
  assert.match(prompt, /# You MUST build the explanation around these/);
  assert.match(prompt, /\[zone:you-major\] = the square you needed/);
});

test('the required-set prompt block states explicitly when there is nothing required, without inventing one', () => {
  // A record whose halves carry neither a cell nor a window abstains (FR-006) — the prompt must SAY
  // so rather than silently omitting the block.
  const model = buildReasonRenderModel({ ...NV,
    lostResource: { kind: 'winning_line', register: 'forced_sequence' },
    opponentPunishment: { kind: 'winning_line', register: 'forced_sequence',
                          tie: { kind: 'tied', sharedCells: ['c4r5'] } } });
  assert.deepEqual(model.requiredSet, []);
  const prompt = assembleGroundedPrompt(model);
  assert.match(prompt, /# You MUST build the explanation around these/);
  assert.match(prompt, /none for this explanation/i);
});
