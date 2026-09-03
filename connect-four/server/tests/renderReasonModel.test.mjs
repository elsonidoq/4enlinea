import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { buildReasonRenderModel, assembleGroundedPrompt, buildRenderDecision, deriveRequiredSet, halfCarriesFork } from '../scripts/renderReasonModel.mjs';

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
  // B1 (FR-014/SC-011): L6 now names the completing cell as column prose (NV's completingCell
  // c6r5 -> column 6), not the raw cNrM token.
  assert.match(prompt, /forced win via column 6/);
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

test('opening vectors no longer throw and lead with the opening frame, and now carry the causal frame too', () => {
  // Re-pointed for Task 6 (spec 058): the opening branch used to REPLACE the causal frame and print
  // only the decision board; it now MERGES both frames and shows whatever boards the causal link
  // needs (selectBoards(pruned)), same as a non-opening record.
  for (const kind of ['namedOpening', 'defense', 'centrality']) {
    const model = buildReasonRenderModel(OPENING[kind]);   // was: throws UncoveredVectorFieldError
    assert.equal(model.frames.length, 2);
    assert.ok(/opening/i.test(model.frames[0].text));
    assert.equal(model.frames[1].id, model.link.id);
    assert.ok(model.boards.some((b) => b.id === 'decision'));
  }
});

test('opening prompt has the opening reading key and shows the deep board when the link needs it', () => {
  // Re-pointed for Task 6 (spec 058): suppressing the projectedDeep board on an opening record was
  // the bug (eval-13/20/35 — render_decision reported it shown but the prompt never printed it). The
  // deep board now prints like any other record; it is the `future:` decorator + GUARDRAIL wording
  // that keep it from reading as a present threat, not omitting it.
  const model = buildReasonRenderModel(OPENING.centrality);
  const prompt = assembleGroundedPrompt(model);
  // Fix round 2 (task 9b, IMPORTANT 4): `/book line|opening/i` was VACUOUS — it matched every prompt,
  // opening or not, because the tag-pairing instruction contains the words "an opening and a closing
  // tag". Assert the actual section header instead, as the O1 test below does via indexOf.
  assert.match(prompt, /# Opening reading key/);
  assert.match(prompt, /projectedDeep/);
});

test('opening records offer the deep half cell under future: framing, and require it (Task 6, spec 058)', () => {
  // Re-pointed for Task 6 (spec 058): this test used to assert the SUPPRESSION this task reverses.
  // The half-geometry family is now offered on an opening record too, always future:-prefixed.
  for (const kind of ['namedOpening', 'defense', 'centrality']) {
    const model = buildReasonRenderModel(OPENING[kind]);
    const futureAliases = model.zones.aliases.filter((a) => a.spec.startsWith('future:'));
    assert.ok(futureAliases.length > 0, `${kind}: opening records must offer future: handles`);
    assert.ok(model.requiredSet.length > 0, `${kind}: opening records must require something`);
  }
});

test('opening prompt names the deep completing cell, always under future/later framing', () => {
  // Re-pointed for Task 6 (spec 058): the deep completing cell and parityAttribution used to be
  // stripped from the JSON residue by pruneOpeningResidue (now deleted). They now appear like any
  // other record's residue; the GUARDRAIL + role text are what stop the model from reading the cell
  // as a present threat, not withholding the field.
  for (const kind of ['namedOpening', 'defense', 'centrality']) {
    const prompt = assembleGroundedPrompt(buildReasonRenderModel(OPENING[kind]));
    assert.match(prompt, /"completingCell"/);
    assert.match(prompt, /matters later|not a threat right now/i);
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
  // NV offers no terms (task-9b finding 1: a term-tag worked example is illegitimate here), so the
  // worked pair falls back to the zone syntax it DOES have (NV offers zone aliases like better-col).
  const prompt = assembleGroundedPrompt(buildReasonRenderModel(NV));
  assert.match(prompt, /MUST have a matching closing tag/i);
  assert.match(prompt, /Bad:.*no closing tag/i);
  assert.match(prompt, /Good:.*\[zone:/i);
  assert.doesNotMatch(prompt, /\[term:/i, 'NV offers no terms — the literal [term: substring must not appear anywhere');
});

test('annotation instructions demonstrate [term:] syntax when a term IS offered, with the matching canonical phrase', () => {
  const model = buildReasonRenderModel(NV);
  model.zones = {
    aliases: model.zones.aliases,
    terms: [{ slug: 'figure_7', kbId: 'figure_7', canonicalPhrase: '7-shaped double threat',
              description: 'a 7-shaped fork giving two winning squares at once' }],
  };
  const prompt = assembleGroundedPrompt(model);
  assert.match(prompt, /Good:.*\[term:figure_7\]/i);
  // Finding 2: the words wrapped by the example tag must be the offered term's OWN canonicalPhrase,
  // never a hardcoded phrase that could name the wrong idea for whatever slug is actually offered.
  assert.match(prompt, /\[term:figure_7\]7-shaped double threat\[\/term:figure_7\]/);
});

test('assembled prompt does not duplicate the guardrail on a non-opening record', () => {
  const prompt = assembleGroundedPrompt(buildReasonRenderModel(NV));
  const occurrences = prompt.split('You gave up a win AND handed the opponent their own').length - 1;
  assert.equal(occurrences, 1); // L6's guardrail text must appear exactly once, not doubled
});

test('assembled prompt includes the opening frame\'s own guardrail alongside the link guardrail', () => {
  const prompt = assembleGroundedPrompt(buildReasonRenderModel(OPENING.namedOpening));
  // Re-pointed for Task 6 (spec 058): openingFrame.mjs's own GUARDRAIL text now reads "matters LATER"
  // instead of "do not ground a specific deep completing cell" — see Task 6, openingFrame.mjs GUARDRAIL.
  assert.match(prompt, /matters LATER/i);
});

// ── deriveRequiredSet (spec 058, US2 — Derivation Rule, spec.md, verbatim from the epic) ────────

test('deriveRequiredSet returns 1-3 {half,spec,handle,role,truthBoard} entries matched by exact spec equality (D2)', () => {
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
    // truthBoard added by OI-196 so the required block can restate the board disambiguator.
    assert.deepEqual(Object.keys(g).sort(), ['half', 'handle', 'role', 'spec', 'truthBoard']);
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

// ── D45: the line is REQUIRED, not merely offered ───────────────────────────────────────────────
// Before D45 the derived spec was `denialCell(h) ?? window`, so the `windows:` branch was dead
// whenever a half had a completingCell (i.e. almost always) and the line was never required.
// Measured: ZERO `windows:` specs emitted across 12 real board-runs under prompt steering alone.

const LINE_ALIASES = [
  { handle: 'you-key-square', spec: 'future:c5r5', role: 'this single square matters later', truthBoard: 'projectedDeep', kbId: null },
  { handle: 'you-key-line', spec: 'future:windows:c2r5,c3r5,c4r5,c5r5', role: 'the whole four-in-a-row line (a LINE of four squares)', truthBoard: 'projectedDeep', kbId: null },
  { handle: 'opp-key-square', spec: 'future:c3r5', role: 'this single square matters later', truthBoard: 'projectedDeep', kbId: null },
  { handle: 'opp-key-line', spec: 'future:windows:c6r2,c5r3,c4r4,c3r5', role: 'the whole opponent line', truthBoard: 'projectedDeep', kbId: null },
];

test('D45: a half whose story is a LINE contributes its line handle IN ADDITION to its completing cell', () => {
  const pruned = {
    lostResource: { completingCell: 'c5r5', window: ['c2r5', 'c3r5', 'c4r5', 'c5r5'] },
    opponentPunishment: { completingCell: 'c3r5' },
  };
  const req = deriveRequiredSet(pruned, { aliases: LINE_ALIASES });
  assert.deepEqual(req.map((g) => g.handle), ['you-key-square', 'opp-key-square', 'you-key-line']);
  assert.equal(req.find((g) => g.handle === 'you-key-line').spec,
    'future:windows:c2r5,c3r5,c4r5,c5r5');
});

test('D45: exactly ONE line slot (FR-005 cap of 3), and lostResource wins it over opponentPunishment', () => {
  const pruned = {
    lostResource: { completingCell: 'c5r5', window: ['c2r5', 'c3r5', 'c4r5', 'c5r5'] },
    opponentPunishment: { completingCell: 'c3r5', window: ['c6r2', 'c5r3', 'c4r4', 'c3r5'] },
  };
  const req = deriveRequiredSet(pruned, { aliases: LINE_ALIASES });
  assert.equal(req.length, 3);
  assert.deepEqual(req.map((g) => g.handle), ['you-key-square', 'opp-key-square', 'you-key-line']);
});

test('D45: the line slot falls through to opponentPunishment when lostResource offers no line', () => {
  const pruned = {
    lostResource: { completingCell: 'c5r5' },
    opponentPunishment: { completingCell: 'c3r5', window: ['c6r2', 'c5r3', 'c4r4', 'c3r5'] },
  };
  const req = deriveRequiredSet(pruned, { aliases: LINE_ALIASES });
  assert.deepEqual(req.map((g) => g.handle), ['you-key-square', 'opp-key-square', 'opp-key-line']);
});

test('D45: a double_threat half\'s line geometry is its forkWindows (both lines), not its single window', () => {
  const pruned = {
    lostResource: { completingCell: 'c5r5' },
    opponentPunishment: { completingCell: 'c3r5', tacticTag: 'double_threat',
                          window: ['c6r2', 'c5r3', 'c4r4', 'c3r5'],
                          forkWindows: [['c6r2', 'c5r3', 'c4r4', 'c3r5'], ['c7r1', 'c6r2', 'c5r3', 'c4r4']] },
  };
  const zones = { aliases: [...LINE_ALIASES,
    { handle: 'opp-fork-lines', spec: 'future:windows:c6r2,c5r3,c4r4,c3r5|c7r1,c6r2,c5r3,c4r4',
      role: 'both lines of the fork', truthBoard: 'projectedDeep', kbId: null }] };
  const req = deriveRequiredSet(pruned, zones);
  assert.deepEqual(req.map((g) => g.handle), ['you-key-square', 'opp-key-square', 'opp-fork-lines']);
});

test('D45: a line with no offered alias is DROPPED, not invented (FR-004 required ⊆ offered)', () => {
  const pruned = {
    lostResource: { completingCell: 'c5r5', window: ['c1r1', 'c2r2', 'c3r3', 'c4r4'] },
    opponentPunishment: { completingCell: 'c3r5' },
  };
  const req = deriveRequiredSet(pruned, { aliases: LINE_ALIASES });
  assert.deepEqual(req.map((g) => g.handle), ['you-key-square', 'opp-key-square']);
});

test('D45: a double_threat half\'s CELL group is its two fork squares, not one of them (ask 2c/4b)', () => {
  // A double threat's load-bearing geometry is TWO squares — requiring only completingCell leaves
  // the other fork square dark and the [term:double_threat] pointing at nothing.
  const pruned = {
    lostResource: { completingCell: 'c5r5' },
    opponentPunishment: { completingCell: 'c3r5', tacticTag: 'double_threat',
                          forkCells: ['c3r5', 'c7r1'] },
  };
  const zones = { aliases: [...LINE_ALIASES,
    { handle: 'opp-future-fork', spec: 'future:windows:c3r5,c7r1', role: 'the two fork squares',
      truthBoard: 'projectedDeep', kbId: 'double_threat' }] };
  const req = deriveRequiredSet(pruned, zones);
  assert.deepEqual(req.map((g) => g.handle), ['you-key-square', 'opp-future-fork']);
});

test('D45: a double_threat half falls back to its completing cell when the fork-squares handle is not offered (FR-004)', () => {
  const pruned = {
    lostResource: { completingCell: 'c5r5' },
    opponentPunishment: { completingCell: 'c3r5', tacticTag: 'double_threat',
                          forkCells: ['c3r5', 'c7r1'] },
  };
  const req = deriveRequiredSet(pruned, { aliases: LINE_ALIASES }); // no fork-squares alias
  assert.deepEqual(req.map((g) => g.handle), ['you-key-square', 'opp-key-square']);
});

test('D45: a term whose idea has an offered pointing handle is bound to it in the prompt (ask 2c)', () => {
  const model = buildReasonRenderModel(NV);
  model.zones = {
    aliases: [{ handle: 'opp-future-fork', spec: 'future:windows:c3r5,c7r1', role: 'the two fork squares',
                truthBoard: 'projectedDeep', kbId: 'double_threat' }],
    terms: [{ slug: 'double_threat', kbId: 'double_threat', canonicalPhrase: 'double threat',
              description: 'two winning squares at once' }],
  };
  const prompt = assembleGroundedPrompt(model);
  assert.match(prompt, /\[term:double_threat\][\s\S]*?\[zone:opp-future-fork\]/);
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
  // group (D43), leaving one free slot that T026's better-col push (FR-017) now fills. Both builders
  // must agree exactly — research.md D1, identical routing.
  assert.deepEqual(model.requiredSet.map((g) => g.handle), ['you-key-square', 'opp-key-square', 'better-col']);
  assert.deepEqual(model.requiredSet.map((g) => g.spec), ['future:c6r5', 'future:c3r3', 'col4']);
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
  // so rather than silently omitting the block. T026's better-col push (FR-017) only fires when
  // bestCol is known, so bestCol is nulled here to isolate the genuine-empty case from that push —
  // a record WITH a bestCol is covered separately below.
  const model = buildReasonRenderModel({ ...NV, bestCol: null,
    lostResource: { kind: 'winning_line', register: 'forced_sequence' },
    opponentPunishment: { kind: 'winning_line', register: 'forced_sequence',
                          tie: { kind: 'tied', sharedCells: ['c4r5'] } } });
  assert.deepEqual(model.requiredSet, []);
  const prompt = assembleGroundedPrompt(model);
  assert.match(prompt, /# You MUST build the explanation around these/);
  assert.match(prompt, /none for this explanation/i);
});

test('the required-set falls back to better-col (T026, FR-017) when geometry derivation leaves every slot free', () => {
  // Same "no cell/window" halves as above, but WITH a bestCol — Q2 PROVISIONAL: the free slot(s)
  // left by geometry derivation are filled by the always-offered better-col handle rather than left
  // empty, even though the prompt block still fires "none for this explanation" only when truly empty.
  const model = buildReasonRenderModel({ ...NV,
    lostResource: { kind: 'winning_line', register: 'forced_sequence' },
    opponentPunishment: { kind: 'winning_line', register: 'forced_sequence',
                          tie: { kind: 'tied', sharedCells: ['c4r5'] } } });
  assert.deepEqual(model.requiredSet.map((g) => g.handle), ['better-col']);
  assert.deepEqual(model.requiredSet.map((g) => g.spec), ['col4']);
});

// ── Spec 058 feedback remediation, attempt 2 — prompt fixes 2 & 3 ───────────────────────────────
//
// Fix 2 (asks 1c / 2b): the engine now OFFERS the real line (`windows:c2r5,c3r5,c4r5,c5r5` — the
// "column 2 to column 5 strip" the human asked for), but the model wrote "the square that keeps
// your later four-in-a-row line alive" and grounded it on the single endpoint cell. Words that name
// a LINE must use the `windows:`-backed handle; a single-cell handle is reserved for words naming a
// SQUARE. This repo's experience is that an abstract prompt rule gets ignored while a worked
// example lands, so both the rule and a good/bad pair are asserted.
//
// Fix 3 (ask 2c): `[term:double_threat]` renders a glossary popup and never highlights the board,
// and a term and a zone can NEVER wrap the SAME phrase (`parseAnnotatedText`'s `combinedRegex` is
// single-pass and non-nesting — the inner tag survives as literal visible text). The only way to
// both name the idea and point at it is ADJACENCY: the term on one phrase, a separate zone on the
// neighbouring words. The pre-existing "do not overlap" instruction is necessary but not
// sufficient — it forbids the wrong shape without ever asking for the right one.

test('fix 2: the prompt states the line-vs-square handle rule with a worked good/bad example', () => {
  const prompt = assembleGroundedPrompt(buildReasonRenderModel(NV));
  assert.match(prompt, /line, strip, or row of four/i, 'the rule must name the words that demand a line handle');
  assert.match(prompt, /whole-line handle|line handle/i);
  const ruleBlock = prompt.split('# Highlightable regions')[1].split('# You MUST build')[0];
  assert.match(ruleBlock, /Bad:[\s\S]*four-in-a-row line/i, 'a BAD example must show a line named but grounded on one square');
  assert.match(ruleBlock, /Good:[\s\S]*\[zone:[^\]]*line/i, 'a GOOD example must show the line words wrapped in a line handle');
});

test('fix 2: a line-kind role tells the model to prefer it over a single-square handle', () => {
  const nv = {
    movestring: '341330613', playedCol: 4, bestCol: 3, player: 2, opponent: 1,
    case: 'win_to_lose', route: 'sign',
    lostResource: { kind: 'winning_line', register: 'forced_sequence', completingCell: 'c6r5',
                    window: ['c4r5', 'c5r5', 'c6r5', 'c7r5'] },
    opponentPunishment: { kind: 'winning_line', register: 'forced_sequence', completingCell: 'c3r3' },
    replyHistogram: { afterBest: 0, afterPlayed: 1 },
  };
  const model = buildReasonRenderModel(nv);
  const lineAlias = model.zones.aliases.find((a) => a.spec.endsWith('windows:c4r5,c5r5,c6r5,c7r5'));
  assert.ok(lineAlias, 'fixture must offer the half window as a windows: alias');
  assert.match(lineAlias.role, /line of four squares|whole four-in-a-row line/i);
  assert.match(lineAlias.role, /not a single square|rather than one square|not one square/i,
    `a line role must steer the model off the endpoint cell: ${lineAlias.role}`);
});

test('fix 3: the prompt requires a term to be PAIRED with an adjacent zone, with a worked example', () => {
  // This adjacency worked-example only applies when a term is actually offered (task-9b finding 1) —
  // NV offers none, so override zones with an offered term, mirroring the D45 "term whose idea has an
  // offered pointing handle" fixture above.
  const model = buildReasonRenderModel(NV);
  model.zones = {
    aliases: model.zones.aliases,
    terms: [{ slug: 'double_threat', kbId: 'double_threat', canonicalPhrase: 'double threat',
              description: 'two winning squares at once' }],
  };
  const prompt = assembleGroundedPrompt(model);
  const termBlock = prompt.split('# KB terms you may name')[1];
  assert.match(termBlock, /never highlight|does not highlight|no highlight/i,
    'the prompt must say a term alone points at nothing on the board');
  assert.match(termBlock, /next to|adjacent|alongside/i, 'the prompt must ask for adjacency');
  assert.match(termBlock, /Bad:[\s\S]*Good:/i, 'a worked bad/good example must accompany the rule');
});

test('fix round 1 (finding 1): a record with no offered terms shows NO [term: substring anywhere in the prompt', () => {
  const prompt = assembleGroundedPrompt(buildReasonRenderModel(NV)); // NV offers zero terms
  // Not just no CONCRETE worked example (e.g. [term:immediate_threat] or the old [term:the_idea]
  // placeholder) — the literal `[term:` substring must not appear at all, including in the
  // prohibition sentence itself, which is phrased in words rather than in bracket notation for
  // exactly this reason.
  assert.doesNotMatch(prompt, /\[term:/i);
  assert.match(prompt, /No named KB terms apply to this record/i);
  assert.match(prompt, /Do NOT tag any phrase as a named term/i);
});

// ── Task 6 (spec 058): opening path merges the causal frame instead of replacing it ─────────────

test('opening record: the causal frame reaches the prompt alongside the opening frame', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const { toNarratorVector, pruneVector } = await import('../scripts/reasonNarratorVector.mjs');
  const here = dirname(fileURLToPath(import.meta.url));
  const rows = readFileSync(join(here, '../scripts/reason_corpus/evidence.jsonl'), 'utf8')
    .trim().split('\n').map((l) => JSON.parse(l));

  // eval-12 is an opening record whose L6 link names both completing cells.
  const fv = pruneVector(toNarratorVector(rows.find((r) => r.id === 'eval-12').evidence));
  const model = buildReasonRenderModel(fv);
  const prompt = assembleGroundedPrompt(model);

  assert.equal(model.frames.length, 2, 'opening record must carry BOTH frames');
  assert.ok(prompt.includes(model.link.text),
    'link.text is absent from the prompt — the model cannot use what it was never shown');
  assert.ok(prompt.includes(fv.lostResource.completingCell),
    `completing cell ${fv.lostResource.completingCell} is absent from the prompt`);
});

test('opening record: half-geometry aliases are offered, under future: framing', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const { toNarratorVector, pruneVector } = await import('../scripts/reasonNarratorVector.mjs');
  const here = dirname(fileURLToPath(import.meta.url));
  const rows = readFileSync(join(here, '../scripts/reason_corpus/evidence.jsonl'), 'utf8')
    .trim().split('\n').map((l) => JSON.parse(l));
  const fv = pruneVector(toNarratorVector(rows.find((r) => r.id === 'eval-12').evidence));
  const model = buildReasonRenderModel(fv);

  const handles = model.zones.aliases.map((a) => a.handle);
  assert.ok(handles.some((h) => /key-square|key-line/.test(h)),
    `no half-geometry alias offered; got ${handles.join(', ')}`);
  // A deep half must NOT be offered as a present threat (the eval-3 trap the suppression guarded).
  for (const a of model.zones.aliases) {
    if (/key-square|key-line/.test(a.handle)) {
      assert.match(a.spec, /^future:/, `${a.handle} must carry the future: decorator`);
      assert.match(a.role, /matters later|not a threat right now/);
    }
  }
});

// ── Task 9b: never display a term slug OR a zone handle the prompt does not offer ───────────────
// Measured over 125 graded runs (task-9b-brief.md): prompts that DISPLAY a TERM_KB slug they do not
// OFFER pass G7b 74/90 (82%); prompts that don't display an unoffered slug pass 35/35 (100%). Every
// G7b failure fell in the "taught but not offered" condition. `pin-L2-enabled-opponent` reaches the
// model with `double_threat` shown three times against an empty `zones.terms`.
//
// Fix round 2 (task 9b, IMPORTANT 1 + item 5): the same defect, one level over, landed on axis G7a —
// two hardcoded worked-example zone handles (`you-key-square`/`you-key-line`/`opp-fork-lines`) leaked
// on 44/63 corpus records (130 instances). Extended here to cover both halves in one corpus-wide
// sweep, and importing OFFERABLE_TERM_SLUGS (zoneAnnotations.mjs) rather than mirroring TERM_KB's key
// set as a literal — a 5th TERM_KB key would otherwise silently under-check the term half.
test('assembled prompt never names a TERM_KB slug or a zone handle it does not offer (task 9b, corpus-wide)', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const { toNarratorVector, pruneVector } = await import('../scripts/reasonNarratorVector.mjs');
  // Fix round 4 (finding 6): this loop swept only OFFERABLE_TERM_SLUGS — 4 of the 15 redactable
  // slugs — so z_threat / minor_threat / forced_block / major_threat_* had NO corpus-wide guard,
  // which is how a raw-slug leak survived an earlier review round. Sweep the full redactable set.
  const { REDACTABLE_TAG_SLUGS } = await import('../scripts/renderReasonModel.mjs');
  const here = dirname(fileURLToPath(import.meta.url));
  const rows = readFileSync(join(here, '../scripts/reason_corpus/evidence.jsonl'), 'utf8')
    .trim().split('\n').map((l) => JSON.parse(l));

  const violations = [];
  for (const r of rows) {
    const fv = pruneVector(toNarratorVector(r.evidence));
    const model = buildReasonRenderModel(fv);
    const prompt = assembleGroundedPrompt(model);

    const offeredTerms = new Set((model.zones.terms ?? []).map((t) => t.slug));
    for (const slug of REDACTABLE_TAG_SLUGS) {
      if (offeredTerms.has(slug)) continue;
      if (new RegExp(`\\b${slug}\\b`).test(prompt)) violations.push(`${r.id}: term ${slug}`);
    }

    // Zone-handle half: every concrete [zone:<handle>] in the prompt must name a handle THIS record
    // actually offers (model.zones.aliases). An abstract placeholder like [zone:<line-handle>] never
    // matches this pattern (it contains `<`/`>`, outside the handle character class), so it is not a
    // false positive here.
    const offeredHandles = new Set((model.zones.aliases ?? []).map((a) => a.handle));
    const zoneTagRe = /\[zone:([a-zA-Z0-9_-]+)\]/g;
    let m;
    while ((m = zoneTagRe.exec(prompt))) {
      if (!offeredHandles.has(m[1])) violations.push(`${r.id}: zone ${m[1]}`);
    }
  }
  assert.deepEqual(violations, [], `unoffered slugs/handles leaked into the prompt:\n${violations.join('\n')}`);
});

test('regression: pin-L2-enabled-opponent must not display double_threat when it is not offered', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const { toNarratorVector, pruneVector } = await import('../scripts/reasonNarratorVector.mjs');
  const here = dirname(fileURLToPath(import.meta.url));
  const rows = readFileSync(join(here, '../scripts/reason_corpus/evidence.jsonl'), 'utf8')
    .trim().split('\n').map((l) => JSON.parse(l));
  const record = rows.find((r) => r.id === 'pin-L2-enabled-opponent');
  assert.ok(record, 'pin-L2-enabled-opponent must exist in the corpus');

  const fv = pruneVector(toNarratorVector(record.evidence));
  const model = buildReasonRenderModel(fv);
  const prompt = assembleGroundedPrompt(model);
  const offered = new Set((model.zones.terms ?? []).map((t) => t.slug));

  assert.equal(offered.has('double_threat'), false, 'this regression fixture must have an empty double_threat offer');
  assert.doesNotMatch(prompt, /\bdouble_threat\b/,
    'double_threat must not appear anywhere in the prompt when zones.terms does not offer it');
});

// ── Fix round 1 (finding 1/2): harvested corpus coverage, both directions ───────────────────────
// Finding 1: `pin-L2-enabled-opponent` was CLAIMED to have an empty `zones.terms` offer; verify that
// directly here (rather than assuming it) before relying on it as the no-terms exemplar.
test('fix round 1: pin-L2-enabled-opponent (verified empty zones.terms) shows NO [term: substring anywhere in the prompt', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const { toNarratorVector, pruneVector } = await import('../scripts/reasonNarratorVector.mjs');
  const here = dirname(fileURLToPath(import.meta.url));
  const rows = readFileSync(join(here, '../scripts/reason_corpus/evidence.jsonl'), 'utf8')
    .trim().split('\n').map((l) => JSON.parse(l));
  const record = rows.find((r) => r.id === 'pin-L2-enabled-opponent');
  assert.ok(record, 'pin-L2-enabled-opponent must exist in the corpus');

  const fv = pruneVector(toNarratorVector(record.evidence));
  const model = buildReasonRenderModel(fv);
  assert.deepEqual(model.zones.terms ?? [], [], 'harvested check: this record must offer zero terms');

  const prompt = assembleGroundedPrompt(model);
  assert.doesNotMatch(prompt, /\[term:/i,
    'no [term:...] tag or syntax demo may appear anywhere when the record offers zero terms');
});

// ── Task 9d: opening reading key only teaches book-line vocabulary when there is one ─────────────
// Measured on eval-11 (an O3 centrality opening record — no namedOpening, no defense, so
// openingContext has no book line at all): 3/5 runs fabricated specific book-line adherence the
// record cannot support (graded A4/A7b failures) because the reading key taught "book line" /
// "family" / "id" / "matchedPrefixLen" vocabulary unconditionally.
test('O3 centrality opening record (eval-11, harvested/verified): prompt must not teach book-line vocabulary', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const { toNarratorVector, pruneVector } = await import('../scripts/reasonNarratorVector.mjs');
  const { composeOpeningFrame } = await import('../scripts/reason_engine/openingFrame.mjs');
  const here = dirname(fileURLToPath(import.meta.url));
  const rows = readFileSync(join(here, '../scripts/reason_corpus/evidence.jsonl'), 'utf8')
    .trim().split('\n').map((l) => JSON.parse(l));
  const record = rows.find((r) => r.id === 'eval-11');
  assert.ok(record, 'eval-11 must exist in the corpus');

  const fv = pruneVector(toNarratorVector(record.evidence));
  assert.equal(composeOpeningFrame(fv).kind, 'centrality', 'harvested check: eval-11 must be the O3 centrality frame');

  const model = buildReasonRenderModel(fv);
  const prompt = assembleGroundedPrompt(model);
  // Fix round 1 (task 9d): originally scoped to just the reading-key section because
  // openingFrame.mjs's GUARDRAIL constant unconditionally named "book line" in every opening
  // record's guardrail line. The coordinator ruled that clause was never part of D46's settled
  // substance and lifted the prohibition for it (openingFrame.mjs's GUARDRAIL_ADMISSIBLE_FRAMINGS_*
  // split) — the WHOLE assembled prompt is now checked, per the brief's original Step 1 wording.
  assert.doesNotMatch(prompt, /book line/i, 'O3 record must not be taught "book line" vocabulary anywhere in the prompt');
  assert.doesNotMatch(prompt, /book move/i, 'O3 record must not be taught "book move" vocabulary anywhere in the prompt');
  assert.doesNotMatch(prompt, /matchedPrefixLen/, 'O3 record must not be taught the matchedPrefixLen field — it has no matched opening');
});

// Fix round 2 (task 9b, IMPORTANT 4). The three doesNotMatch checks above prove what an O3 record
// does NOT receive; nothing previously asserted what it DOES positively receive. Assert the actual
// centrality-only reading key content (OPENING_READING_KEY_CENTRALITY_ONLY, renderReasonModel.mjs).
//
// B3 update (same class as OI-199/T029): eval-11's own openingFrame.mjs guardrail already says
// "Explain the blunder through the opening — parity." (centralityOffered: false — its
// centrality clause is suppressed, same as eval-21) — this test's ORIGINAL assertion of
// "centrality, parity" in the reading key was inconsistent with that guardrail (the exact
// contradiction B3 fixes: the reading key taught "centrality" for a record whose own guardrail
// never offers it). Corrected to assert the parity-only reading key that now agrees with the
// guardrail; see openingReadingKeyFor's OPENING_READING_KEY_PARITY_ONLY branch.
test('O3 centrality opening record (eval-11): the reading key agrees with the guardrail on parity-only (B3)', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const { toNarratorVector, pruneVector } = await import('../scripts/reasonNarratorVector.mjs');
  const { composeOpeningFrame } = await import('../scripts/reason_engine/openingFrame.mjs');
  const here = dirname(fileURLToPath(import.meta.url));
  const rows = readFileSync(join(here, '../scripts/reason_corpus/evidence.jsonl'), 'utf8')
    .trim().split('\n').map((l) => JSON.parse(l));
  const record = rows.find((r) => r.id === 'eval-11');
  const fv = pruneVector(toNarratorVector(record.evidence));
  assert.equal(composeOpeningFrame(fv).kind, 'centrality', 'harvested check: eval-11 must be the O3 centrality frame');

  const prompt = assembleGroundedPrompt(buildReasonRenderModel(fv));
  const readingKeySection = prompt.slice(prompt.indexOf('# Opening reading key'), prompt.indexOf('# Highlightable regions'));
  assert.match(readingKeySection, /matches no named opening or defense line/i,
    'O3 reading key must positively state that no book/defense line applies to this record');
  assert.match(readingKeySection, /\(parity\)/i,
    'O3 reading key must teach parity vocabulary');
  assert.doesNotMatch(readingKeySection, /centrality/i,
    'B3: eval-11\'s centrality clause is suppressed (same as eval-21) — the reading key must not invite what the guardrail forbids');
});

// Positive counterpart (gating, not blanket deletion): an O1 namedOpening record still DOES teach
// the book-line vocabulary, in BOTH places that can carry it — the reading key (renderReasonModel.mjs)
// AND the guardrail (openingFrame.mjs) — proving the gating composes correctly rather than having
// silently deleted the vocabulary from one of the two sites. eval-9 was harvested as the corpus's O1
// example (see the composeOpeningFrame sweep in the task-9d report).
test('O1 namedOpening opening record (eval-9, harvested/verified): prompt still teaches book-line vocabulary in the reading key AND the guardrail', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const { toNarratorVector, pruneVector } = await import('../scripts/reasonNarratorVector.mjs');
  const { composeOpeningFrame } = await import('../scripts/reason_engine/openingFrame.mjs');
  const here = dirname(fileURLToPath(import.meta.url));
  const rows = readFileSync(join(here, '../scripts/reason_corpus/evidence.jsonl'), 'utf8')
    .trim().split('\n').map((l) => JSON.parse(l));
  const record = rows.find((r) => r.id === 'eval-9');
  assert.ok(record, 'eval-9 must exist in the corpus');

  const fv = pruneVector(toNarratorVector(record.evidence));
  assert.equal(composeOpeningFrame(fv).kind, 'namedOpening', 'harvested check: eval-9 must be the O1 namedOpening frame');

  const model = buildReasonRenderModel(fv);
  const prompt = assembleGroundedPrompt(model);
  assert.match(prompt, /matchedPrefixLen/, 'O1 record must still be taught the matchedPrefixLen field (reading key)');
  const readingKeySection = prompt.slice(prompt.indexOf('# Opening reading key'), prompt.indexOf('# Highlightable regions'));
  assert.match(readingKeySection, /book line/i, 'O1 reading key must still teach "book line" vocabulary');
  const guardrailLine = prompt.split('Guardrail: ')[1].split('\n')[0];
  assert.match(guardrailLine, /book line/i, 'O1 guardrail line must still offer "book line" as an admissible framing');
});

// Finding 1's other direction: a record that DOES offer a term must still demonstrate the [term:...]
// syntax, using a slug it actually offers. Harvested (not invented): the corpus's first record whose
// zones.terms is non-empty is eval-7, offering `figure_7`.
test('fix round 1: a record that DOES offer a term (eval-7, harvested) still demonstrates [term:<offered-slug>] syntax', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const { toNarratorVector, pruneVector } = await import('../scripts/reasonNarratorVector.mjs');
  const here = dirname(fileURLToPath(import.meta.url));
  const rows = readFileSync(join(here, '../scripts/reason_corpus/evidence.jsonl'), 'utf8')
    .trim().split('\n').map((l) => JSON.parse(l));
  const record = rows.find((r) => r.id === 'eval-7');
  assert.ok(record, 'eval-7 must exist in the corpus');

  const fv = pruneVector(toNarratorVector(record.evidence));
  const model = buildReasonRenderModel(fv);
  const offeredSlugs = (model.zones.terms ?? []).map((t) => t.slug);
  assert.ok(offeredSlugs.length > 0, 'harvested check: this record must offer at least one term');

  const prompt = assembleGroundedPrompt(model);
  const usedSlug = model.zones.terms[0].slug;
  const usedPhrase = model.zones.terms[0].canonicalPhrase;
  assert.match(prompt, new RegExp(`\\[term:${usedSlug}\\]`),
    `the prompt must demonstrate [term:...] syntax with an offered slug (${usedSlug})`);
  // Finding 2: the demonstrated tag's own worked-example wraps that term's canonicalPhrase, never a
  // hardcoded/mismatched phrase.
  assert.match(prompt, new RegExp(`\\[term:${usedSlug}\\]${usedPhrase.replace(/[()]/g, '\\$&')}`),
    `the worked example must wrap ${usedSlug}'s own canonicalPhrase ("${usedPhrase}"), not a hardcoded phrase`);
});

// Fix round 2 (task 9b, item 9). The zero-alias branch (abstract <handle>/<line-handle>/
// <square-handle> placeholders) has no test and no corpus record exercises it (0/63 have empty
// zones.aliases). Force it with an overridden model.zones, mirroring the D45/fix-round-1 override
// fixtures above.
test('fix round 2: zero offered aliases falls back to the abstract <handle>/<line-handle>/<square-handle> placeholders', () => {
  const model = buildReasonRenderModel(NV);
  model.zones = { aliases: [], terms: [] };
  // requiredSet was computed against the ORIGINAL (real) aliases and would itself violate
  // required-⊆-offered (D2/FR-004) once zones is overridden empty — clear it too, consistent with an
  // empty-alias world (D45's own override fixtures above make the same requiredSet/zones pairing).
  model.requiredSet = [];
  const prompt = assembleGroundedPrompt(model);

  // Highlightable-regions worked example: no term, no zone alias offered at all.
  assert.match(prompt, /\[zone:<handle>\]/, 'the generic Bad/Good example must fall back to the abstract <handle> form');
  // MATCH-THE-SHAPE worked example: no line-kind or square-kind alias offered.
  assert.match(prompt, /\[zone:<line-handle>\]/, 'the shape example must fall back to the abstract <line-handle> form');
  assert.match(prompt, /\[zone:<square-handle>\]/, 'the shape example must fall back to the abstract <square-handle> form');
  // No concrete handle may appear anywhere — zero aliases were offered.
  assert.doesNotMatch(prompt, /\[zone:(?!<[a-z-]+>)[a-zA-Z0-9_-]+\]/,
    'no concrete [zone:<handle>] may appear when zero aliases are offered');
  // No term worked example either — zero terms were offered.
  assert.doesNotMatch(prompt, /\[term:/i, 'no [term:] syntax may appear when zero terms are offered');
});

// ── Fix round 3 (task 9b, finding 2, reopened) ───────────────────────────────────────────────────
// `displayPhraseFor`'s round-2 form was `TAG_PHRASE[slug] ?? RENDER_DISPLAY_PHRASE[slug] ?? slug` —
// `TAG_PHRASE.claimeven` is the STRING 'claimeven' (truthy), so `??` never fell through and the
// redaction stayed an identity substitution for exactly the slug it was written to fix. This test
// exercises the PRODUCTION path end to end (not displayPhraseFor in isolation, which the dead branch
// would have passed): take a real corpus record, inject an unoffered `claimeven` board tag the way
// the checkpoint reviewer did, and assert the rendered Tactics list carries the vetted phrase, never
// the bare slug.
test('fix round 3: an unoffered claimeven board tag renders its vetted phrase, never the bare slug, through the real prompt-assembly path', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const { toNarratorVector, pruneVector } = await import('../scripts/reasonNarratorVector.mjs');
  const here = dirname(fileURLToPath(import.meta.url));
  const rows = readFileSync(join(here, '../scripts/reason_corpus/evidence.jsonl'), 'utf8')
    .trim().split('\n').map((l) => JSON.parse(l));
  const record = rows.find((r) => r.id === 'pin-L2-enabled-opponent');
  assert.ok(record, 'pin-L2-enabled-opponent must exist in the corpus');

  const fv = pruneVector(toNarratorVector(record.evidence));
  const model = buildReasonRenderModel(fv);
  assert.equal((model.zones.terms ?? []).some((t) => t.slug === 'claimeven'), false,
    'harvested check: this record must not already offer claimeven');

  // Inject an unoffered claimeven board tag onto the decision board, mirroring the reviewer's
  // injection method — a real board-tag shape (kind/cell/owner), not a synthetic string.
  const decisionBoard = model.boards.find((b) => b.id === 'decision');
  assert.ok(decisionBoard, 'model must carry a decision board to inject onto');
  decisionBoard.tags.push({ kind: 'claimeven', cell: 'c1r1', owner: 'you' });

  const prompt = assembleGroundedPrompt(model);
  const tacticsBlock = prompt.split('Tactics:')[1].split('\n\n')[0];
  assert.match(tacticsBlock, /controlling the even squares of a column to guarantee a threat/,
    'the injected claimeven tag must render its vetted phrase in the Tactics list');
  assert.doesNotMatch(prompt, /\bclaimeven\b/,
    'the bare word "claimeven" must not appear anywhere in the prompt as a standalone token');
});


// ── Fix round 4 (whole-branch review) ────────────────────────────────────────────────────────────
// Shared corpus loader for the round-4 regressions below (same shape the tests above use inline).
async function loadCorpus() {
  const { readFileSync: rf } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const here = dirname(fileURLToPath(import.meta.url));
  return rf(join(here, '../scripts/reason_corpus/evidence.jsonl'), 'utf8')
    .trim().split('\n').map((l) => JSON.parse(l));
}

// Finding 1. redactUnofferedSlugsInTree drops a display phrase into WHICHEVER half carries the tag,
// including `opponentPunishment` — so a second-person phrase becomes a confidently-worded FALSE
// attribution about the half punishing the player. Measured at HEAD 77e8024: eval-21 / eval-38
// (`opponentPunishment.basis` = "a threat square you're guaranteed to reach…"), eval-31
// (`opponentPunishment.tacticTag` = "…a row you're favored to reach first"), eval-36
// (`opponentPunishment.tacticTag` = "…parity does not favor you to reach first").
// Asserted through the PRODUCTION path (assembleGroundedPrompt(buildReasonRenderModel(...))).
test('fix round 4 (finding 1): display phrases are owner-neutral on every corpus record — no second person, and none inside the opponent half', async () => {
  const { toNarratorVector, pruneVector } = await import('../scripts/reasonNarratorVector.mjs');
  const { RENDER_DISPLAY_PHRASE } = await import('../scripts/renderReasonModel.mjs');
  const rows = await loadCorpus();
  const SECOND_PERSON = /\byou\b|\byour\b|\byou're\b|\byourself\b/i;
  const violations = [];
  for (const [slug, phrase] of Object.entries(RENDER_DISPLAY_PHRASE)) {
    if (SECOND_PERSON.test(phrase)) violations.push(`RENDER_DISPLAY_PHRASE.${slug} is second-person: ${phrase}`);
  }
  // And the same phrases as they actually reach the model, per record.
  for (const r of rows) {
    const prompt = assembleGroundedPrompt(buildReasonRenderModel(pruneVector(toNarratorVector(r.evidence))));
    for (const [slug, phrase] of Object.entries(RENDER_DISPLAY_PHRASE)) {
      if (prompt.includes(phrase) && SECOND_PERSON.test(phrase)) violations.push(`${r.id}: ${slug}`);
    }
  }
  assert.deepEqual(violations, [], `owner-asserting display phrases:\n${violations.join('\n')}`);
});

test('fix round 4 (finding 1, named regression records): eval-21/31/36/38 never receive a second-person parity/zugzwang phrase', async () => {
  const { toNarratorVector, pruneVector } = await import('../scripts/reasonNarratorVector.mjs');
  const rows = await loadCorpus();
  for (const id of ['eval-21', 'eval-31', 'eval-36', 'eval-38']) {
    const record = rows.find((r) => r.id === id);
    assert.ok(record, `${id} must exist in the corpus`);
    const prompt = assembleGroundedPrompt(buildReasonRenderModel(pruneVector(toNarratorVector(record.evidence))));
    assert.doesNotMatch(prompt, /you're guaranteed to reach/, `${id}: z_threat phrase must not assert the player's perspective`);
    assert.doesNotMatch(prompt, /you're favored to reach first/, `${id}: major_threat_parity phrase must not assert the player's perspective`);
    assert.doesNotMatch(prompt, /parity does not favor you to reach/, `${id}: major_threat_nonparity phrase must not assert the player's perspective`);
  }
  // Positive counterpart: the neutral wording IS delivered (the redaction still fires).
  const e21 = rows.find((r) => r.id === 'eval-21');
  const p21 = assembleGroundedPrompt(buildReasonRenderModel(pruneVector(toNarratorVector(e21.evidence))));
  assert.match(p21, /a threat square the column's parity guarantees its owner reaches first \(zugzwang\)/);
  const e36 = rows.find((r) => r.id === 'eval-36');
  const p36 = assembleGroundedPrompt(buildReasonRenderModel(pruneVector(toNarratorVector(e36.evidence))));
  assert.match(p36, /parity does not deliver to its owner/);
});

// Finding 4. The reading key in the SAME prompt forbids the model to repeat "window"; the
// minor_threat phrase contained "four-window". Measured at HEAD on 11 records (eval-5/6/9/10/11/12/
// 27/31, pin-L6/L7/L8). Also restores the KB predicate (allen-minor-threat.md: "two discs and two
// empty cells (and no opponent disc)").
test('fix round 4 (finding 4): no display phrase reaching the model contains a token the reading key bans', async () => {
  const { toNarratorVector, pruneVector } = await import('../scripts/reasonNarratorVector.mjs');
  const { RENDER_DISPLAY_PHRASE } = await import('../scripts/renderReasonModel.mjs');
  const BANNED = /\bhistogram\b|\bwindows?\b|completing cell|\bsolver\b|\bscore\b/i;
  const bad = Object.entries(RENDER_DISPLAY_PHRASE).filter(([, p]) => BANNED.test(p)).map(([s]) => s);
  assert.deepEqual(bad, [], `display phrases containing a banned token: ${bad.join(', ')}`);
  const rows = await loadCorpus();
  const e5 = rows.find((r) => r.id === 'eval-5');
  assert.ok(e5, 'eval-5 must exist in the corpus');
  const prompt = assembleGroundedPrompt(buildReasonRenderModel(pruneVector(toNarratorVector(e5.evidence))));
  assert.doesNotMatch(prompt, /two discs and two empty squares in that four-window/);
  assert.match(prompt, /a minor threat — two discs and two empty squares in the same line of four, with none of the opponent's/);
});

// Finding 5. The KB-terms adjacency worked example fell back to an UNRELATED real handle when the
// demonstrated term has no pointer of its own — measured on eval-7/8/11/12/15/16, e.g.
// "…[term:figure_7]…[/term:figure_7] on [zone:better-col]where it lives[/zone:better-col]": the fork
// does not live on the better column. Prefer the abstract placeholder.
test('fix round 4 (finding 5): the adjacency worked example uses the abstract placeholder, never an unrelated real handle', async () => {
  const { toNarratorVector, pruneVector } = await import('../scripts/reasonNarratorVector.mjs');
  const rows = await loadCorpus();
  const record = rows.find((r) => r.id === 'eval-7');
  assert.ok(record, 'eval-7 must exist in the corpus');
  const model = buildReasonRenderModel(pruneVector(toNarratorVector(record.evidence)));
  const term = model.zones.terms[0];
  assert.ok(term, 'harvested check: eval-7 must offer at least one term');
  assert.deepEqual(model.zones.aliases.filter((a) => a.kbId === term.slug).map((a) => a.handle), [],
    'harvested check: eval-7 offers no alias tied to the demonstrated term — this is the fallback case');
  const prompt = assembleGroundedPrompt(model);
  assert.match(prompt, /\[zone:<handle>\]where it lives\[\/zone:<handle>\]/,
    'the worked example must use the abstract <handle> placeholder when no pointer exists for the demonstrated term');
  assert.doesNotMatch(prompt, /\[zone:better-col\]where it lives/,
    'the worked example must not point the demonstrated term at an unrelated real handle');
});

// Finding 3. First-offer-wins dedupe let the fork pivot EVICT the other half's key square and
// relabel the OPPONENT's completing square as YOUR pivot. Measured at HEAD: eval-11 and eval-12
// (lostResource pivot c2r4 === opponentPunishment.completingCell c2r4) — the required set read
// `[zone:you-fork-pivot] = the square you play to CREATE the fork` for c2r4 while the causal link in
// the same prompt said the opponent forces their win via c2r4. Abstain instead.
test('fix round 4 (finding 3): eval-11/eval-12 abstain from the pivot and keep the opponent key square in the required set', async () => {
  const { toNarratorVector, pruneVector } = await import('../scripts/reasonNarratorVector.mjs');
  const rows = await loadCorpus();
  for (const id of ['eval-11', 'eval-12']) {
    const record = rows.find((r) => r.id === id);
    assert.ok(record, `${id} must exist in the corpus`);
    const fv = pruneVector(toNarratorVector(record.evidence));
    assert.equal(fv.opponentPunishment.completingCell, 'c2r4', `harvested check: ${id}'s opponent completing square`);
    const model = buildReasonRenderModel(fv);
    assert.deepEqual(model.zones.aliases.filter((a) => a.handle.endsWith('-fork-pivot')).map((a) => a.handle), [],
      `${id}: no pivot may be offered when the pivot cell is the other half's completing square`);
    const opp = model.zones.aliases.find((a) => a.handle === 'opp-key-square');
    assert.ok(opp && opp.spec.endsWith('c2r4'), `${id}: opp-key-square must survive for c2r4`);
    assert.ok((model.requiredSet ?? []).some((g) => g.handle === 'opp-key-square'),
      `${id}: the opponent's key square must be back in the required set`);
    const prompt = assembleGroundedPrompt(model);
    assert.doesNotMatch(prompt, /to CREATE the fork/, `${id}: no pivot role text may reach the model`);
  }
});

test('fix round 4 (finding 3): the pivot feature is NOT disabled — records with a non-clashing pivot still offer and require it', async () => {
  const { toNarratorVector, pruneVector } = await import('../scripts/reasonNarratorVector.mjs');
  const rows = await loadCorpus();
  const offering = [];
  for (const r of rows) {
    const model = buildReasonRenderModel(pruneVector(toNarratorVector(r.evidence)));
    if (model.zones.aliases.some((a) => a.handle.endsWith('-fork-pivot'))) offering.push(r.id);
  }
  // Measured after the abstain rule: 16 of the 18 previously-offering records (eval-11, eval-12 now
  // abstain). A regression that disabled the feature would show a much smaller number.
  assert.ok(offering.length >= 15, `pivot offering collapsed to ${offering.length} records: ${offering.join(',')}`);
  assert.ok(offering.includes('eval-16') && offering.includes('eval-20') && offering.includes('pin-L5-deep-fork'),
    `expected pivot still offered on the non-clashing records; got ${offering.join(',')}`);
  assert.ok(!offering.includes('eval-11') && !offering.includes('eval-12'));
});

// Finding 2. `roleText`'s two fork-pivot branches interpolated `${who} plays`, producing "the square
// you plays to CREATE the fork" — measured 0 occurrences at base, 13 records at HEAD, twice each
// (Highlightable regions AND the required set), incl. eval-16, eval-20, pin-L5-deep-fork.
test('fix round 4 (finding 2): the fork-pivot role text is grammatical for both owners, corpus-wide and through the prompt', async () => {
  const { toNarratorVector, pruneVector } = await import('../scripts/reasonNarratorVector.mjs');
  const rows = await loadCorpus();
  const violations = [];
  let sawPivot = 0;
  for (const r of rows) {
    const prompt = assembleGroundedPrompt(buildReasonRenderModel(pruneVector(toNarratorVector(r.evidence))));
    if (/to CREATE the fork/.test(prompt)) sawPivot += 1;
    if (/\byou plays\b/.test(prompt)) violations.push(`${r.id}: "you plays"`);
    if (/\byour opponent play\b/.test(prompt)) violations.push(`${r.id}: "your opponent play"`);
  }
  assert.ok(sawPivot > 0, 'harvested check: at least one corpus record must still show a fork-pivot role');
  assert.deepEqual(violations, [], `ungrammatical fork-pivot role text:\n${violations.join('\n')}`);
  const e16 = rows.find((r) => r.id === 'eval-16');
  const p16 = assembleGroundedPrompt(buildReasonRenderModel(pruneVector(toNarratorVector(e16.evidence))));
  assert.match(p16, /the square you play to CREATE the fork/);
});

// ── Fix 2 (spec 058 post-measure remediation) ────────────────────────────────────────────────────
// The "handed him" worked example used to wrap the term's RAW canonicalPhrase, producing
// ungrammatical prose ("you handed him double threat (two winning squares at once)") and modeling
// an inline technical-parenthetical dump — suspected mechanism for eval-37's coach-voice regression.
// Through the production path, using eval-7 (offers `figure_7`), same record fix round 1 uses.
test('fix 2: the "handed him" worked example wraps a natural noun phrase, not the raw canonicalPhrase', async () => {
  const rows = await loadCorpus();
  const record = rows.find((r) => r.id === 'eval-7');
  assert.ok(record, 'eval-7 must exist in the corpus');
  const { toNarratorVector, pruneVector } = await import('../scripts/reasonNarratorVector.mjs');
  const model = buildReasonRenderModel(pruneVector(toNarratorVector(record.evidence)));
  const usedSlug = model.zones.terms[0].slug;
  const usedPhrase = model.zones.terms[0].canonicalPhrase;
  const prompt = assembleGroundedPrompt(model);

  // The bare canonicalPhrase must never be wrapped directly after "handed him" (that was the bug).
  assert.doesNotMatch(prompt, new RegExp(`handed him \\[term:${usedSlug}\\]${usedPhrase.replace(/[()]/g, '\\$&')}\\[`),
    'the "handed him" example must not wrap the raw canonicalPhrase verbatim');
  // It must instead read as a natural noun phrase with an article, still wrapping the tag.
  assert.match(prompt, new RegExp(`handed him \\[term:${usedSlug}\\](a|an) [a-z0-9-]`),
    `the "handed him" example must wrap an article + noun phrase for ${usedSlug}`);
});

// A term whose canonicalPhrase carries a parenthetical gloss (double_threat) must not dump that
// parenthetical inline into the "handed him" sentence. Built via override (no corpus record offers
// double_threat as a KB term on its own — figure_7 and immediate_threat dominate), but still
// asserted through assembleGroundedPrompt(buildReasonRenderModel(...)), the production composer.
test('fix 2: a term whose canonicalPhrase carries a parenthetical gloss (double_threat) does not dump it inline', async () => {
  const { TAG_PHRASE } = await import('../scripts/reason_engine/causalLinks.mjs');
  assert.equal(TAG_PHRASE.double_threat, 'double threat (two winning squares at once)');
  const model = buildReasonRenderModel(NV);
  model.zones = { aliases: [{ handle: 'you-key-square', spec: 'c1r1', role: 'x', truthBoard: 'decision', kbId: 'double_threat' }],
    terms: [{ slug: 'double_threat', kbId: 'double_threat', canonicalPhrase: TAG_PHRASE.double_threat,
      description: 'two winning squares at once' }] };
  model.requiredSet = [];
  const prompt = assembleGroundedPrompt(model);

  assert.doesNotMatch(prompt, /handed him \[term:double_threat\]double threat \(two winning squares at once\)/,
    'the parenthetical gloss must not be dumped inline after "handed him"');
  assert.match(prompt, /handed him \[term:double_threat\]a double threat\[\/term:double_threat\]/,
    'the wrapped words must be a natural noun phrase ("a double threat"), still denoting double_threat');
});

// ── OI-196 — the REQUIRED-handle block must carry the same board disambiguator ─────────────────
//
// `:564` (Highlightable regions) appends "(on the <truthBoard> board)"; the required block at `:600`
// dropped it, so two required handles differing ONLY by which board their role is true on restated
// identically in the block the prompt calls mandatory. Measured on eval-47: `you-immediate` (c3r6,
// afterBest) and `you-immediate-3` (c5r4, afterPlayed) became indistinguishable and 4/5 runs
// conflated the two squares — two of them recommending the column the player had just blundered.
test('OI-196: the required-set block carries the truthBoard disambiguator, like the regions block', () => {
  const model = buildReasonRenderModel(NV);
  model.requiredSet = [
    { half: 'lostResource', spec: 'c3r6', handle: 'you-immediate', role: 'a square you can complete', truthBoard: 'afterBest' },
    { half: 'opponentPunishment', spec: 'c5r4', handle: 'you-immediate-3', role: 'a square you can complete', truthBoard: 'afterPlayed' },
  ];
  const prompt = assembleGroundedPrompt(model);
  assert.match(prompt, /\[zone:you-immediate\] = a square you can complete \(on the afterBest board\)/);
  assert.match(prompt, /\[zone:you-immediate-3\] = a square you can complete \(on the afterPlayed board\)/);
});

test('OI-196: a required group with no truthBoard renders without a dangling suffix', () => {
  const model = buildReasonRenderModel(NV);
  model.requiredSet = [{ half: 'lostResource', spec: 'c6r5', handle: 'you-major', role: 'the square you needed' }];
  const prompt = assembleGroundedPrompt(model);
  assert.match(prompt, /- \[zone:you-major\] = the square you needed\n/);
  assert.doesNotMatch(prompt, /on the undefined board/);
});

test('OI-196: deriveRequiredSet carries truthBoard through from the matched offered alias', () => {
  const model = buildReasonRenderModel(NV);
  for (const g of model.requiredSet) {
    const alias = model.zones.aliases.find((a) => a.handle === g.handle);
    assert.equal(g.truthBoard, alias.truthBoard);
  }
});

// ══════════════════════════════════════════════════════════════════════════════════════════════
// Batch 3b (T021a) starts here. Next batch (T038, FR-017/FR-018) appends AFTER this banner's tests
// — do not interleave; see tasks.md's file-collision note (T021a before T038, sequential not [P]).
// ══════════════════════════════════════════════════════════════════════════════════════════════

// ── FR-011 / OI-202 / SC-008 / T014 — replyHistogram comparative must match its own stated
// direction, corpus-wide ──────────────────────────────────────────────────────────────────────
//
// The READING_KEY's replyHistogram bullet ("fewer means the tougher, more resilient defense") is
// always applied by the engine's own framing (causalLinks.mjs L2/L4 guardrails) to the BETTER move
// — so the bullet is only honest when afterBest <= afterPlayed. T014 gates the bullet on that
// direction (Q4 PROVISIONAL: drop rather than restate). Measured directly against the corpus's own
// raw evidence.jsonl replyHistogram counts (not re-deriving the guard's own logic, per I12): of the
// 63 corpus records, all 63 carry a replyHistogram, 57 support the stated direction (afterBest <=
// afterPlayed) and 6 do not (eval-29, eval-37, eval-44, eval-45, pin-branch-invariance-true-2,
// pin-branch-invariance-true-3).
test('FR-011/SC-008: replyHistogram comparative, when rendered, matches the direction the raw counts support (corpus-wide)', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const { toNarratorVector, pruneVector } = await import('../scripts/reasonNarratorVector.mjs');
  const here = dirname(fileURLToPath(import.meta.url));
  const rows = readFileSync(join(here, '../scripts/reason_corpus/evidence.jsonl'), 'utf8')
    .trim().split('\n').map((l) => JSON.parse(l));

  const REPLY_HISTOGRAM_RE = /replyHistogram\.afterBest \/ afterPlayed: how many ways your opponent/;
  const violations = [];
  let sawSupported = false;
  let sawUnsupported = false;
  for (const r of rows) {
    // Ground truth taken independently from the corpus's OWN raw evidence, not from the render
    // model's internal guard function — I12 requires validating against a real counterexample per
    // case through the production detector, not a proxy that could share the bug it is checking for.
    const rawReplyHistogram = r.evidence?.replyHistogram;
    const fv = pruneVector(toNarratorVector(r.evidence));
    const model = buildReasonRenderModel(fv);
    const prompt = assembleGroundedPrompt(model);
    const sentenceEmitted = REPLY_HISTOGRAM_RE.test(prompt);

    if (!rawReplyHistogram) {
      if (sentenceEmitted) violations.push(`${r.id}: no replyHistogram in evidence but sentence rendered`);
      continue;
    }
    const supportsStatedDirection = rawReplyHistogram.afterBest <= rawReplyHistogram.afterPlayed;
    if (supportsStatedDirection) sawSupported = true; else sawUnsupported = true;

    if (sentenceEmitted && !supportsStatedDirection) {
      violations.push(`${r.id}: comparative rendered but afterBest=${rawReplyHistogram.afterBest} > `
        + `afterPlayed=${rawReplyHistogram.afterPlayed} contradicts the stated direction`);
    }
    if (!sentenceEmitted && supportsStatedDirection) {
      violations.push(`${r.id}: direction is supported (afterBest=${rawReplyHistogram.afterBest} <= `
        + `afterPlayed=${rawReplyHistogram.afterPlayed}) but the comparative was omitted`);
    }
    // For a record where the sentence is omitted, no OTHER comparative claim about reply counts
    // may leak into the prompt either — the field itself must not appear bare (FR-011's "otherwise
    // it MUST NOT be offered" applies to the claim, not just this one exact bullet sentence).
    if (!sentenceEmitted && !supportsStatedDirection && /fewer means the tougher/.test(prompt)) {
      violations.push(`${r.id}: an unsupported record still contains the "fewer means the tougher" claim`);
    }
  }
  assert.ok(sawSupported, 'corpus fixture sanity: expected at least one record with a supported direction');
  assert.ok(sawUnsupported, 'corpus fixture sanity: expected at least one record with an unsupported direction (regression guard against a no-op corpus)');
  assert.deepEqual(violations, [], `replyHistogram comparative direction mismatches:\n${violations.join('\n')}`);
});

// ══════════════════════════════════════════════════════════════════════════════════════════════
// T038 (FR-017/FR-018) starts here — appended after the T021a banner per tasks.md's file-collision
// note (same file, sequential, not [P]).
// ══════════════════════════════════════════════════════════════════════════════════════════════

// ── FR-017 / T026 / OI-205/OI-187 — deriveRequiredSet's better-col push, corpus-wide ─────────────
test('FR-017/T026: deriveRequiredSet\'s better-col push never breaks required ⊆ offered or the 3-slot cap (corpus-wide)', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const { toNarratorVector, pruneVector } = await import('../scripts/reasonNarratorVector.mjs');
  const here = dirname(fileURLToPath(import.meta.url));
  const rows = readFileSync(join(here, '../scripts/reason_corpus/evidence.jsonl'), 'utf8')
    .trim().split('\n').map((l) => JSON.parse(l));

  let offeredBetterCol = 0;
  let atCapUnresolved = 0;
  const violations = [];
  for (const r of rows) {
    if (!r.evidence || r.error) continue;
    const fv = pruneVector(toNarratorVector(r.evidence));
    const model = buildReasonRenderModel(fv);
    const req = model.requiredSet ?? [];
    if (req.length > 3) violations.push(`${r.id}: requiredSet has ${req.length} groups (cap is 3)`);
    const offeredSpecs = new Set((model.zones.aliases ?? []).map((a) => a.spec));
    for (const g of req) {
      if (!offeredSpecs.has(g.spec)) violations.push(`${r.id}: required spec ${g.spec} not in offered set (required ⊆ offered broken)`);
    }
    const betterColGroup = req.find((g) => g.handle === 'better-col');
    if (betterColGroup) {
      offeredBetterCol++;
      assert.equal(betterColGroup.spec, `col${fv.bestCol + 1}`, `${r.id}: better-col spec must be col${fv.bestCol + 1}`);
    } else if (req.length >= 3) {
      atCapUnresolved++;
    }
  }
  assert.deepEqual(violations, [], `FR-017 violations:\n${violations.join('\n')}`);
  // Q2 PROVISIONAL sanity: some records get the push, some stay at-cap and unresolved by design.
  assert.ok(offeredBetterCol > 0, 'expected at least one record to receive the better-col push');
  assert.ok(atCapUnresolved > 0, 'expected at least one record to remain at-cap and unresolved (Q2 PROVISIONAL)');
});

// ── FR-018 / T027 / OI-206 — array-branch empty-drop regression, corpus-wide ─────────────────────
test('FR-018/T027: renderedFields never emits an empty [{},{},...] array literal (corpus-wide)', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const { toNarratorVector } = await import('../scripts/reasonNarratorVector.mjs');
  const here = dirname(fileURLToPath(import.meta.url));
  const rows = readFileSync(join(here, '../scripts/reason_corpus/evidence.jsonl'), 'utf8')
    .trim().split('\n').map((l) => JSON.parse(l));

  const offenders = [];
  for (const r of rows) {
    if (!r.evidence || r.error) continue;
    const model = buildReasonRenderModel(toNarratorVector(r.evidence));
    const json = JSON.stringify(model.rendered);
    if (/\[\{\}(,\{\})*\]/.test(json)) offenders.push(r.id);
  }
  assert.deepEqual(offenders, [], `empty array literal found for: ${offenders.join(', ')}`);
});

test('FR-018/T027: unit regression — an array whose every element prunes empty is dropped, not emitted as [{},{}]', () => {
  const pruned = { ...NV,
    lostResource: { ...NV.lostResource,
      line: [{ ply: 39, mover: 2, col: 3, cell: 'c4r5' }, { ply: 40, mover: 1, col: 2, cell: 'c3r5' }] },
  };
  const m = buildReasonRenderModel(pruned);
  // Every `line[]` subfield (ply/mover/col/cell) is 'transformed' by disposition (fieldDisposition.mjs's
  // isTransformed line regex), so every mapped element becomes {} — the array must be omitted from
  // `rendered` entirely, not emitted as `[{},{}]`.
  assert.ok(!('line' in (m.rendered.lostResource ?? {})), 'an all-empty-element array must not appear in rendered at all');
});

test('D3 fix: aliases owned by different players never share a role string (corpus-wide)', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const { toNarratorVector, pruneVector } = await import('../scripts/reasonNarratorVector.mjs');
  const here = dirname(fileURLToPath(import.meta.url));
  const rows = readFileSync(join(here, '../scripts/reason_corpus/evidence.jsonl'), 'utf8')
    .trim().split('\n').map((l) => JSON.parse(l));
  for (const row of rows) {
    const fv = pruneVector(toNarratorVector(row.evidence));
    const model = buildReasonRenderModel(fv);
    const roleOwner = new Map(); // role string -> 'you' | 'opp'
    for (const a of model.zones.aliases) {
      // Exemption (Task 5): the afterPlayed board-tag pivot role is deliberately owner-neutral —
      // the mover of an afterPlayed board is always the player, so no possessive applies.
      if (a.role === "the square your last move just filled — that move is what set up the fork") continue;
      const owner = a.handle.startsWith('you-') ? 'you' : a.handle.startsWith('opp-') ? 'opp' : null;
      if (!owner) continue;
      const prev = roleOwner.get(a.role);
      assert.ok(prev === undefined || prev === owner,
        `${row.id}: role string shared across owners: "${a.role}" (${a.handle})`);
      roleOwner.set(a.role, owner);
    }
  }
});

test('eval-47: an afterPlayed board-tag pivot is described as the move already made, not a move to play', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const { toNarratorVector, pruneVector } = await import('../scripts/reasonNarratorVector.mjs');
  const here = dirname(fileURLToPath(import.meta.url));
  const rows = readFileSync(join(here, '../scripts/reason_corpus/evidence.jsonl'), 'utf8')
    .trim().split('\n').map((l) => JSON.parse(l));
  const row = rows.find((r) => r.id === 'eval-47');
  assert.ok(row, 'corpus must contain eval-47');
  const fv = pruneVector(toNarratorVector(row.evidence));
  const model = buildReasonRenderModel(fv);
  const pivots = model.zones.aliases.filter((a) => a.handle.includes('fork-pivot') && a.truthBoard === 'afterPlayed');
  assert.ok(pivots.length, 'eval-47 must offer an afterPlayed board-tag pivot');
  for (const p of pivots) {
    assert.ok(!/to CREATE the fork/.test(p.role) || /just|already/.test(p.role),
      `${p.handle}: role still instructs playing an occupied square: "${p.role}"`);
  }
});

// ---------------------------------------------------------------------------------------------
// Task 7 (D48 known-limit closure): realized-pattern fork halves.
//
// Every fork family in zoneAnnotations.mjs keys off `half.tacticTag` + `forkCells`/`line`; a
// `realized_pattern` half carries `tag`/`cells`/`windows`/`finalMovestring` instead, so its fork got
// neither a prong pair nor a pivot. 13 corpus records have a realized fork half.
//
// The pivot rule ("the landing cell of the LAST ply of the half's own finalMovestring") was validated
// through the PRODUCTION detector `detectDoubleThreat` (I12 — never a hand-rolled proxy) over all
// 10 realized-fork records in the task scope: for every one, the tag's owner HAS a double threat on
// `finalMovestring` and does NOT on `finalMovestring` minus its last ply. 10/10 PASS.
//
// Two families of principled abstention are pinned below, because "no pivot offered" must be
// distinguishable from "the loop silently missed one":
//   * PIVOT_ABSTAIN — the pivot coincides with the OTHER half's completing square. Both labels are
//     true of different lines and read as a contradiction in one prompt, so the existing round-4
//     guard abstains (I2). The cell is still offered, under the other half's own handle.
//   * eval-47 / eval-48 / pin-L1-completes-your-tactic — realized forks whose pattern is already
//     board-true on a shown near-term board, where the structural loop offers it (with its pivot)
//     already. The containment guard keeps this loop from restating a weaker, present-tense copy.
const REALIZED_FORK_IDS = ['eval-42', 'eval-43', 'eval-44', 'eval-46', 'eval-49', 'eval-50',
  'pin-L2-enabled-opponent', 'pin-L3-no-causation', 'pin-branch-invariance-true-1',
  'pin-branch-invariance-false'];
// ids -> the exact prong-pair spec expected. The other 6 have `cells.length === 1` (a single-cell
// realized pattern, not a prong pair): nothing to pair, and nothing is asserted for them.
const PRONG_PAIR = {
  'eval-43': 'windows:c4r3,c6r2',
  'eval-44': 'windows:c3r1,c7r1',
  'pin-L2-enabled-opponent': 'windows:c2r1,c6r1',
  'pin-branch-invariance-false': 'windows:c2r1,c6r1',
};
// ids -> the pivot cell offered (all validated PASS through detectDoubleThreat).
const PIVOT_OFFERED = {
  'eval-43': 'c4r2',
  'eval-44': 'c6r1',
  'eval-46': 'c6r2',
  'pin-L3-no-causation': 'c4r2',
  'pin-branch-invariance-true-1': 'c5r3',
};
// ids where the validated pivot is deliberately NOT offered, and the cell it collides with.
const PIVOT_ABSTAIN = {
  'eval-42': 'c1r4',
  'eval-49': 'c3r4',
  'eval-50': 'c3r4',
  'pin-L2-enabled-opponent': 'c3r1',
  'pin-branch-invariance-false': 'c3r1',
};

async function loadRealizedForkCorpus() {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const { toNarratorVector, pruneVector } = await import('../scripts/reasonNarratorVector.mjs');
  const here = dirname(fileURLToPath(import.meta.url));
  const rows = readFileSync(join(here, '../scripts/reason_corpus/evidence.jsonl'), 'utf8')
    .trim().split('\n').map((l) => JSON.parse(l));
  return { rows, prune: (ev) => pruneVector(toNarratorVector(ev)) };
}

test('Task 7: the realized-fork pivot rule holds through the production detectDoubleThreat (I12 gate)', async () => {
  const { rows, prune } = await loadRealizedForkCorpus();
  const { Board, detectDoubleThreat, parseBoardState } = await import('../classifier.js');
  for (const id of REALIZED_FORK_IDS) {
    const fv = prune(rows.find((r) => r.id === id).evidence);
    const half = [fv.lostResource, fv.opponentPunishment].find((h) => h?.kind === 'realized_pattern');
    assert.ok(half, `${id}: expected a realized_pattern half`);
    const ms = half.finalMovestring;
    assert.ok(ms && ms.length > 1, `${id}: realized half must carry a finalMovestring`);
    // The pivot rule itself: the LAST ply is what makes both winning squares live at once.
    assert.equal(detectDoubleThreat(new Board(ms), half.owner).matched, true,
      `${id}: owner ${half.owner} must hold a double threat on ${ms}`);
    assert.equal(detectDoubleThreat(new Board(ms.slice(0, -1)), half.owner).matched, false,
      `${id}: owner ${half.owner} must NOT already hold it before the last ply of ${ms}`);
    // ...and the cell that ply lands on is the pivot the offer uses.
    const col = Number(ms.at(-1));
    const { colHeights } = parseBoardState(ms.slice(0, -1));
    const pivot = `c${col + 1}r${colHeights[col] + 1}`;
    const expected = PIVOT_OFFERED[id] ?? PIVOT_ABSTAIN[id];
    assert.equal(pivot, expected, `${id}: pivot cell drifted`);
  }
});

test('Task 7: realized fork halves offer a prong pair (2-prong records) and a validated pivot', async () => {
  const { rows, prune } = await loadRealizedForkCorpus();
  for (const id of REALIZED_FORK_IDS) {
    const fv = prune(rows.find((r) => r.id === id).evidence);
    const model = buildReasonRenderModel(fv);
    const half = [fv.lostResource, fv.opponentPunishment].find((h) => h?.kind === 'realized_pattern');
    const unprefixed = (a) => a.spec.replace(/^future:/, '');

    if (PRONG_PAIR[id]) {
      assert.equal(half.cells.length, 2, `${id}: expected a 2-prong realized fork`);
      const prongSpec = 'windows:' + half.cells.join(',');
      assert.equal(prongSpec, PRONG_PAIR[id], `${id}: prong spec drifted`);
      const prong = model.zones.aliases.find((a) => unprefixed(a) === prongSpec);
      assert.ok(prong, `${id}: fork prongs ${prongSpec} not offered`);
      assert.match(prong.handle, /-double(-\d+)?$/, `${id}: prong pair must use the double family`);
      assert.match(prong.role, /fork squares/, `${id}: prong pair must carry the fork role text`);
      // M4 — pins the truthBoard ruling. F7's provenance rule ('afterPlayed' for an
      // opponentPunishment half) would put these on a board shown on ZERO of these records; the loop
      // reuses the half-resource loop's own horizon derivation instead, and all 10 realized forks are
      // `register: 'immediate'`, so the answer is the present tense on `decision`. A silent revert to
      // provenance, or a silent switch to `future:` framing, must go red here.
      assert.equal(prong.truthBoard, 'decision', `${id}: prong pair must name the decision board`);
      assert.ok(!prong.spec.startsWith('future:'),
        `${id}: an immediate-register fork must not be offered under the future: decorator`);
      // OI-172: a `windows:` alias is satisfiable only as the WHOLE window, so the pair alone leaves
      // a correct single-prong highlight illegal — which is exactly the pin-L2 render bug ("c6r1 has
      // no handle"). Each prong must ALSO be reachable on its own, under some alias of this owner.
      for (const c of half.cells) {
        assert.ok(model.zones.aliases.some((a) => unprefixed(a) === c),
          `${id}: prong ${c} has no standalone single-cell handle`);
      }
    } else {
      assert.equal(half.cells.length, 1,
        `${id}: not listed as 2-prong, so cells must be single (F4 scope correction)`);
    }

    const pivots = model.zones.aliases.filter((a) => a.handle.includes('fork-pivot'));
    if (PIVOT_OFFERED[id]) {
      assert.ok(pivots.some((a) => unprefixed(a) === PIVOT_OFFERED[id]),
        `${id}: validated pivot ${PIVOT_OFFERED[id]} not offered (offered: ${pivots.map((a) => a.spec).join(', ') || 'none'})`);
    } else {
      // Abstention, not omission: the pivot IS the other half's completing square, and that cell is
      // still reachable — under the other half's handle, with the other half's (also true) label.
      const other = half === fv.lostResource ? fv.opponentPunishment : fv.lostResource;
      const collidesWith = other?.completingCell ?? other?.cell;
      assert.equal(collidesWith, PIVOT_ABSTAIN[id],
        `${id}: pivot abstention must be the other-half collision, not a silent miss`);
      assert.ok(model.zones.aliases.some((a) => unprefixed(a) === PIVOT_ABSTAIN[id]),
        `${id}: the abstained pivot cell must still be offered under the other half's handle`);
      assert.ok(!pivots.some((a) => unprefixed(a) === PIVOT_ABSTAIN[id]),
        `${id}: the colliding cell must not ALSO be relabelled as a fork pivot`);
    }
  }
});

test('Task 7: the containment guard keeps an already-board-true realized fork from being restated on the decision board', async () => {
  // The realized-fork set is 13 records, not the brief's 10. On eval-47 / eval-48 /
  // pin-L1-completes-your-tactic the realized fork is ALREADY board-true on a shown near-term board,
  // where the structural loop offers it (with its pivot). Without the owner-scoped containment guard
  // the realized-fork loop adds a weaker, present-tense copy on `decision` — measured on eval-47:
  // `you-double-3 = windows:c3r6,c6r5 @ decision`, a 2-cell restatement of the board-true 3-cell
  // `you-double = windows:c3r6,c6r5,c7r2 @ afterBest`, on a board the fork does not exist on.
  // Delete the guard and this test goes red.
  const { rows, prune } = await loadRealizedForkCorpus();
  const unprefix = (s) => s.replace(/^future:/, '');

  const evalFortySeven = buildReasonRenderModel(prune(rows.find((r) => r.id === 'eval-47').evidence));
  const doubles47 = evalFortySeven.zones.aliases.filter((a) => /^you-double(-\d+)?$/.test(a.handle));
  // Exactly the two pre-existing structural forks — one per near-term board the fork is real on.
  assert.equal(doubles47.length, 2,
    `eval-47: expected only the 2 board-true fork aliases, got ${doubles47.map((a) => `${a.handle}=${a.spec}@${a.truthBoard}`).join(', ')}`);
  assert.ok(doubles47.some((a) => a.truthBoard === 'afterBest' && unprefix(a.spec).includes('c7r2')),
    'eval-47: the board-true afterBest fork (the one carrying the third endpoint c7r2) must survive');
  assert.ok(doubles47.every((a) => a.truthBoard !== 'decision'),
    'eval-47: no fork alias may be restated on the decision board, where the fork is not yet real');
  assert.ok(!evalFortySeven.zones.aliases.some((a) => unprefix(a.spec) === 'windows:c3r6,c6r5'),
    'eval-47: the guarded-against 2-cell restatement windows:c3r6,c6r5 must not be offered');

  for (const id of ['eval-48', 'pin-L1-completes-your-tactic']) {
    const model = buildReasonRenderModel(prune(rows.find((r) => r.id === id).evidence));
    const doubles = model.zones.aliases.filter((a) => /^you-double(-\d+)?$/.test(a.handle));
    assert.equal(doubles.length, 1,
      `${id}: expected exactly one fork alias, got ${doubles.map((a) => `${a.handle}=${a.spec}@${a.truthBoard}`).join(', ')}`);
    assert.equal(doubles[0].truthBoard, 'afterBest',
      `${id}: the fork is board-true on afterBest and must be offered there, not restated on decision`);
  }
});

test('Task 7 (F5): the realized-fork loop only WIDENS the offer — no pre-change handle is evicted', async () => {
  // Pinned from a corpus run on the code immediately BEFORE the realized-fork loop landed.
  const PRE = {
    'eval-42': ['better-col', 'played-col', 'opp-major', 'opp-major-line', 'you-major', 'you-major-line', 'opp-key-square', 'opp-key-line', 'opp-key-square-2'],
    'eval-43': ['better-col', 'played-col', 'opp-major', 'opp-major-line', 'opp-major-2', 'opp-major-line-2'],
    'eval-44': ['better-col', 'played-col', 'opp-key-square', 'opp-key-line'],
    'eval-46': ['better-col', 'played-col', 'opp-major', 'opp-major-line', 'opp-double', 'opp-major-2', 'opp-major-line-2', 'opp-major-3', 'opp-major-line-3', 'you-immediate', 'you-immediate-line'],
    'eval-49': ['better-col', 'played-col', 'you-major', 'you-major-line', 'you-immediate', 'you-immediate-line', 'you-key-square'],
    'eval-50': ['better-col', 'played-col', 'you-major', 'you-major-line', 'you-immediate', 'you-immediate-line', 'you-key-square'],
    'pin-L2-enabled-opponent': ['better-col', 'played-col', 'opp-key-square', 'opp-key-line', 'opp-key-square-2'],
    'pin-L3-no-causation': ['better-col', 'played-col', 'opp-major', 'opp-major-line', 'opp-major-2', 'opp-major-line-2', 'you-immediate', 'you-immediate-line'],
    'pin-branch-invariance-true-1': ['better-col', 'played-col', 'opp-major', 'opp-major-line', 'opp-major-2', 'opp-major-line-2'],
    'pin-branch-invariance-false': ['better-col', 'played-col', 'opp-key-square', 'opp-key-line', 'opp-key-square-2'],
  };
  const { rows, prune } = await loadRealizedForkCorpus();
  for (const [id, handles] of Object.entries(PRE)) {
    const model = buildReasonRenderModel(prune(rows.find((r) => r.id === id).evidence));
    const now = model.zones.aliases.map((a) => a.handle);
    for (const h of handles) assert.ok(now.includes(h), `${id}: handle ${h} was evicted`);
  }
});

test('Task 7: every offered alias names a board the prompt actually renders (corpus-wide)', async () => {
  // The F7 provenance rule ('afterPlayed' for an opponentPunishment half) would have broken this on
  // 8 of the 10 realized-fork records: `afterPlayed` is shown on ZERO of them, so those aliases would
  // have pointed at a board the prompt never prints. The realized-fork loop uses the half-resource
  // loop's own horizon derivation instead.
  const { rows, prune } = await loadRealizedForkCorpus();
  for (const row of rows) {
    const model = buildReasonRenderModel(prune(row.evidence));
    const shown = new Set(model.boards.map((b) => b.id));
    for (const a of model.zones.aliases) {
      assert.ok(shown.has(a.truthBoard),
        `${row.id}: alias ${a.handle} names board "${a.truthBoard}", not among [${[...shown].join(', ')}]`);
    }
  }
});

test('Task 7 (fix round 1, I1): a DEEP realized fork carries the future: decorator on the prongs, each prong, AND the pivot', async () => {
  // Every realized fork in the corpus today is `register: 'immediate'`, so the loop's `future:` branch
  // is unreachable from `evidence.jsonl` — which is exactly why the pivot's missing prefix could sit
  // there unnoticed. This drives `buildAnnotationOffer` (the production function, no mock) directly
  // with a deep-register realized half so the branch is exercised rather than argued about.
  //
  // The half's geometry is eval-44's real, solver-grounded one (`cells` / `finalMovestring` verbatim);
  // only `register` is changed, which is the one field that selects the horizon. A bare `cNrM` spec
  // carrying `truthBoard: 'projectedDeep'` is the eval-3 present-threat shape the decorator exists to
  // prevent, so all four offers must be prefixed.
  const { buildAnnotationOffer } = await import('../scripts/reason_engine/zoneAnnotations.mjs');
  const half = { kind: 'realized_pattern', tag: 'double_threat', register: 'parity', owner: 1,
                 cells: ['c3r1', 'c7r1'], completingCell: 'c3r1', finalMovestring: '44315' };
  const pruned = { player: 2, opponent: 1, bestCol: 2, playedCol: 1,
                   lostResource: null, opponentPunishment: half };
  const boards = [{ id: 'decision', shown: true, movestring: '443', tags: [] },
                  { id: 'projectedDeep', shown: true, movestring: '44315', tags: [] }];
  const { aliases, zoneAliasMap } = buildAnnotationOffer(pruned, boards);

  const byHandle = (re) => aliases.find((a) => re.test(a.handle));
  const pair = byHandle(/^opp-double/);
  const prong = byHandle(/^opp-fork-square/);
  const pivot = byHandle(/^opp-fork-pivot/);
  for (const [what, a] of [['prong pair', pair], ['standalone prong', prong], ['pivot', pivot]]) {
    assert.ok(a, `deep realized fork must still offer its ${what}`);
    assert.equal(a.truthBoard, 'projectedDeep', `${what}: a deep offer must name the projected board`);
    assert.ok(a.spec.startsWith('future:'),
      `${what}: a deep offer must carry the future: decorator, got "${a.spec}"`);
    assert.equal(zoneAliasMap[a.handle], a.spec, `${what}: zoneAliasMap must agree with the alias spec`);
  }
  assert.equal(pivot.spec, 'future:c6r1');
  assert.match(pivot.role, /NOT the move to play right now/, 'a deep pivot takes the "not right now" role');
});

// ---------------------------------------------------------------------------------------------
// Task 2 (D2 fix, D49-addendum-governed): a `windows:` spec spanning multiple columns is a LINE,
// not a single cell — `disambiguateSiblingRoles`' rung-1 column locator ("the one in column N")
// used to fire on it anyway (`specSortKey` collapses the whole spec to one representative cell),
// so the model faithfully echoed a board-false claim ("your line in column 4") about a line that
// actually spans columns 4–7. `lineLocator` asserts the *true* geometry — a row range or a
// diagonal direction — and returns `null` when no true single-line claim can be made, in which
// case the caller falls back to the existing (still-true) rungs.
//
// Controller ruling (task-2-ruling.md) AMENDS the brief's Step-1 test: measured against the live
// corpus, the brief's unscoped assertion ("no multi-column windows: alias may ever carry a
// single-column locator") flags 58 aliases today, 9 of which are `|`-joined combined fork-lines
// specs (two or three 4-cell windows glued together — NOT one line) that `lineLocator` is
// REQUIRED by its own F10 contract to refuse, after which they correctly fall back to the column
// rung the brief's test forbids. So Step 1 is scoped here to genuine single-line specs only: no
// `|`, exactly 4 cells, constant (col, row) step across the sorted cells. `|`-joined and disjoint
// specs are explicitly out of scope (pre-existing wording, not a Task 2 regression) and are
// covered instead by the negative `lineLocator(...) === null` cases below.
function isSingleLineWindowsSpec(rawSpec) {
  if (rawSpec.includes('|')) return false;
  const cells = [...rawSpec.matchAll(/c(\d+)r(\d+)/g)].map((m) => ({ col: +m[1], row: +m[2] }));
  if (cells.length !== 4) return false;
  const sorted = [...cells].sort((a, b) => (a.col - b.col) || (a.row - b.row));
  const colStep = sorted[1].col - sorted[0].col;
  const rowStep = sorted[1].row - sorted[0].row;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].col - sorted[i - 1].col !== colStep || sorted[i].row - sorted[i - 1].row !== rowStep) return false;
  }
  return true;
}

test('D2 fix: a genuine multi-column windows: line never gets a single-column locator (corpus-wide, scoped per task-2-ruling.md)', async () => {
  const { toNarratorVector, pruneVector } = await import('../scripts/reasonNarratorVector.mjs');
  const rows = await loadCorpus();
  let sawAtLeastOneMultiColumnLine = false;
  for (const row of rows) {
    const fv = pruneVector(toNarratorVector(row.evidence));
    const model = buildReasonRenderModel(fv);
    for (const a of model.zones.aliases) {
      const raw = a.spec.replace(/^future:/, '');
      if (!raw.startsWith('windows:')) continue;
      const body = raw.slice('windows:'.length);
      if (!isSingleLineWindowsSpec(body)) continue; // ruling: |-joined / disjoint specs out of scope
      const cols = new Set([...body.matchAll(/c(\d+)r\d+/g)].map((m) => m[1]));
      if (cols.size < 2) continue; // vertical line — a column locator IS true, leave it alone
      sawAtLeastOneMultiColumnLine = true;
      assert.ok(!/^the (lower |upper |[a-z-]+ )?one in column \d+:/.test(a.role),
        `${row.id} ${a.handle}: multi-column line labelled by a single column: "${a.role}"`);
    }
  }
  assert.ok(sawAtLeastOneMultiColumnLine, 'fixture sanity: corpus must contain at least one multi-column line alias');
});

test('D2 fix: lineLocator refuses |-joined fork-lines specs and disjoint fork-cell specs (F10, negative cases)', async () => {
  const { lineLocator } = await import('../scripts/reason_engine/zoneAnnotations.mjs');
  const { toNarratorVector, pruneVector } = await import('../scripts/reasonNarratorVector.mjs');
  const rows = await loadCorpus();

  // |-joined combined fork-lines specs (task-2-ruling.md's own examples): two or three 4-cell
  // windows glued by `|` are NOT one line.
  for (const id of ['eval-17', 'eval-18', 'eval-19', 'eval-20']) {
    const row = rows.find((r) => r.id === id);
    assert.ok(row, `corpus must contain ${id}`);
    const fv = pruneVector(toNarratorVector(row.evidence));
    const model = buildReasonRenderModel(fv);
    const forkLines = model.zones.aliases.find((a) => a.handle.includes('fork-lines'));
    assert.ok(forkLines, `${id}: must offer a fork-lines alias`);
    assert.ok(forkLines.spec.includes('|'), `${id}: fixture sanity — expected a |-joined spec, got "${forkLines.spec}"`);
    assert.equal(lineLocator(forkLines.spec), null, `${id}: |-joined spec must not be called a line`);
  }

  // eval-47's disjoint fork-cell spec: three cells, none contiguous.
  const row47 = rows.find((r) => r.id === 'eval-47');
  const fv47 = pruneVector(toNarratorVector(row47.evidence));
  const model47 = buildReasonRenderModel(fv47);
  const disjoint = model47.zones.aliases.find((a) => a.spec.replace(/^future:/, '') === 'windows:c3r6,c6r5,c7r2');
  assert.ok(disjoint, 'eval-47: fixture sanity — expected the windows:c3r6,c6r5,c7r2 alias');
  assert.equal(lineLocator(disjoint.spec), null, 'eval-47: disjoint fork-cell spec must not be called a line');

  // Direct unit cases, independent of the corpus, for the boundary conditions the brief calls out.
  assert.equal(lineLocator('windows:c3r5,c4r5,c5r5,c6r5|c4r3,c5r4,c6r5,c7r6'), null, 'a | anywhere in the spec refuses');
  assert.equal(lineLocator('windows:c3r6,c6r5,c7r2'), null, 'not exactly 4 cells refuses');
  assert.equal(lineLocator('windows:c3r5,c4r5,c5r5,c7r5'), null, 'non-constant step (gap) refuses');
  assert.equal(lineLocator('col3'), null, 'a col… spec is never a windows: line');
  assert.equal(lineLocator('c3r5'), null, 'a bare single-cell spec is never a windows: line');
});

test('D2 fix: every locator lineLocator actually emits for the corpus is true of its spec\'s own geometry (F10 positive truth-reconstruction)', async () => {
  const { lineLocator } = await import('../scripts/reason_engine/zoneAnnotations.mjs');
  const { toNarratorVector, pruneVector } = await import('../scripts/reasonNarratorVector.mjs');
  const rows = await loadCorpus();
  let sawRowLocator = false, sawDiagonalLocator = false;
  for (const row of rows) {
    const fv = pruneVector(toNarratorVector(row.evidence));
    const model = buildReasonRenderModel(fv);
    for (const a of model.zones.aliases) {
      const raw = a.spec.replace(/^future:/, '');
      if (!raw.startsWith('windows:')) continue;
      const locator = lineLocator(a.spec);
      if (locator === null) continue;
      const body = raw.slice('windows:'.length);
      const cells = [...body.matchAll(/c(\d+)r(\d+)/g)].map((m) => ({ col: +m[1], row: +m[2] }));
      const cols = [...new Set(cells.map((c) => c.col))].sort((x, y) => x - y);
      const rows_ = [...new Set(cells.map((c) => c.row))].sort((x, y) => x - y);

      const rowMatch = /^the line across columns (\d+)–(\d+) on row (\d+)$/.exec(locator);
      // Fix round 1: the diagonal wording now names both row endpoints (not just the column span),
      // so two parallel diagonals sharing a direction and column span render distinguishable labels.
      const diagMatch = /^the diagonal line (rising|falling) from column (\d+) on row (\d+) to column (\d+) on row (\d+)$/.exec(locator);
      assert.ok(rowMatch || diagMatch, `${row.id} ${a.handle}: unrecognized locator shape "${locator}"`);

      if (rowMatch) {
        sawRowLocator = true;
        // A row locator's cells must all share that row.
        assert.equal(rows_.length, 1, `${row.id} ${a.handle}: row locator but cells span multiple rows`);
        assert.equal(rows_[0], Number(rowMatch[3]), `${row.id} ${a.handle}: row locator names the wrong row`);
        assert.equal(cols[0], Number(rowMatch[1]), `${row.id} ${a.handle}: row locator names the wrong lowest column`);
        assert.equal(cols[cols.length - 1], Number(rowMatch[2]), `${row.id} ${a.handle}: row locator names the wrong highest column`);
      } else {
        sawDiagonalLocator = true;
        // A diagonal locator's cells must be contiguous with a constant, non-zero row step.
        assert.ok(cols.length >= 2 && rows_.length >= 2, `${row.id} ${a.handle}: diagonal locator but cells don't vary in both axes`);
        const sorted = [...cells].sort((c1, c2) => (c1.col - c2.col) || (c1.row - c2.row));
        const rowStep = sorted[1].row - sorted[0].row;
        for (let i = 1; i < sorted.length; i++) {
          assert.equal(sorted[i].row - sorted[i - 1].row, rowStep,
            `${row.id} ${a.handle}: diagonal locator but row step is not constant across the sorted cells`);
        }
        const first = cells.reduce((x, y) => (x.col <= y.col ? x : y));
        const last = cells.reduce((x, y) => (x.col >= y.col ? x : y));
        const expectedDir = last.row > first.row ? 'rising' : 'falling';
        assert.equal(diagMatch[1], expectedDir, `${row.id} ${a.handle}: diagonal locator names the wrong direction`);
        assert.equal(Number(diagMatch[2]), cols[0], `${row.id} ${a.handle}: diagonal locator names the wrong lowest column`);
        assert.equal(Number(diagMatch[3]), first.row, `${row.id} ${a.handle}: diagonal locator names the wrong row at its lowest column`);
        assert.equal(Number(diagMatch[4]), cols[cols.length - 1], `${row.id} ${a.handle}: diagonal locator names the wrong highest column`);
        assert.equal(Number(diagMatch[5]), last.row, `${row.id} ${a.handle}: diagonal locator names the wrong row at its highest column`);
      }
    }
  }
  assert.ok(sawRowLocator, 'fixture sanity: corpus must exercise the row-locator branch');
  assert.ok(sawDiagonalLocator, 'fixture sanity: corpus must exercise the diagonal-locator branch');
});

// Fix round 1 (Important finding, since SUPERSEDED by round 2 below). The initial D2 fix let
// `opp-key-line` win a true rung-1 diagonal label, which made rung 1's uniqueness check pass for the
// whole sibling GROUP — and so promoted its sibling `opp-fork-lines` (a `|`-joined spec `lineLocator`
// correctly refuses) UP into rung 1's plain column wording too: "the one in column 3", a board-false
// claim about a spec spanning columns 3-7. Round 1 fixed that by making BOTH siblings fall to the
// claim-free ordinal rung whenever either one couldn't get a true column/geometric label — safe, but
// it also threw away `opp-key-line`'s true diagonal label, which is exactly the informativeness cost
// round 2 (below) exists to recover: the fix in this block is what round 2's per-member restructure
// replaces, not what it currently produces. Superseded by the round-2 test.
//
// Fix round 2 (per-member restructure). Each member of a sibling group now takes the most informative
// TRUE label for ITSELF — `lineLocator`'s geometric wording where its own spec supports it, a column
// label only where its own spec genuinely occupies one column, the claim-free ordinal only where
// neither is available (a `|`-joined or disjoint spec). `opp-fork-lines` must still never regain a
// column label — `multiColumnWindowsWithoutLine` still refuses it outright — but `opp-key-line` must
// no longer be dragged down to ordinal by its sibling's failure: it gets its true diagonal back.
test('D2 fix round 2: each fork-lines pair\'s *-key-line sibling regains a true geometric label while *-fork-lines keeps a claim-free ordinal, corpus-wide (10 pairs)', async () => {
  const { toNarratorVector, pruneVector } = await import('../scripts/reasonNarratorVector.mjs');
  const rows = await loadCorpus();
  const COLUMN_FAMILY = /^the (lower |upper |[a-z-]+ )?one in column \d+:/;
  const LINE_FAMILY = /^the (line across columns|diagonal line)/;
  const ORDINAL = /^the [\w-]+ one listed: /;
  let pairsChecked = 0;
  for (const row of rows) {
    const fv = pruneVector(toNarratorVector(row.evidence));
    const model = buildReasonRenderModel(fv);
    const forkLinesAliases = model.zones.aliases.filter((a) =>
      a.handle.includes('fork-lines') && a.spec.replace(/^future:/, '').includes('|'));
    for (const forkLines of forkLinesAliases) {
      const owner = forkLines.handle.startsWith('you-') ? 'you' : 'opp';
      const keyLine = model.zones.aliases.find((a) => a.handle === `${owner}-key-line`);
      if (!keyLine) continue; // not every |-joined fork-lines record also offers a plain key-line
      // Both must be in the SAME sibling group (same collision key) for this to be a meaningful check.
      if (`${keyLine.role.replace(/^[^:]*:\s*/, '')}|${keyLine.truthBoard}` !==
          `${forkLines.role.replace(/^[^:]*:\s*/, '')}|${forkLines.truthBoard}`) continue;
      pairsChecked += 1;
      assert.ok(!COLUMN_FAMILY.test(forkLines.role),
        `${row.id}: ${forkLines.handle} must never carry a column-family locator, got "${forkLines.role}"`);
      assert.ok(ORDINAL.test(forkLines.role),
        `${row.id}: ${forkLines.handle} should land on the claim-free ordinal rung, got "${forkLines.role}"`);
      assert.ok(LINE_FAMILY.test(keyLine.role),
        `${row.id}: ${keyLine.handle} should regain its true geometric label, got "${keyLine.role}"`);
      assert.notEqual(keyLine.role, forkLines.role, `${row.id}: the two siblings must render distinguishable roles`);
    }
  }
  assert.equal(pairsChecked, 10, `expected exactly the 10 known fork-lines/key-line pairs, checked ${pairsChecked}`);
});

// Task 4 (deep-reveal-a7-remediation): `immediate_threat`'s canonicalPhrase ("threat to make four next
// move") is board-false whenever the tag never fired on the DECISION board — it fired only on a
// follow-up board (afterPlayed/afterBest), and the model applied "next move" to the board in front of
// the player instead. Grader-verified board-false echoes: eval-29 (A7b, non-retry), eval-37 run 1,
// pin-branch-invariance-true-2. Uses `boardSelectionDecisions` directly (production's `noteFired`
// scope, the FULL decision set) rather than `model.boards`, which is shown-only.
test('immediate_threat term gloss names its board when the tag never fired on the decision board', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const { toNarratorVector, pruneVector } = await import('../scripts/reasonNarratorVector.mjs');
  const { boardSelectionDecisions } = await import('../scripts/reasonBoardSelect.mjs');
  const here = dirname(fileURLToPath(import.meta.url));
  const rows = readFileSync(join(here, '../scripts/reason_corpus/evidence.jsonl'), 'utf8')
    .trim().split('\n').map((l) => JSON.parse(l));

  let checked = 0;
  for (const row of rows) {
    const fv = pruneVector(toNarratorVector(row.evidence));
    const model = buildReasonRenderModel(fv);
    const t = model.zones.terms.find((x) => x.slug === 'immediate_threat');
    if (!t) continue;
    // Recompute where the tag fired from ALL board-selection decisions (production's noteFired scope),
    // not just the shown subset on model.boards.
    const decisions = boardSelectionDecisions(fv);
    const firedBoards = decisions
      .filter((b) => ['decision', 'afterBest', 'afterPlayed'].includes(b.id))
      .filter((b) => (b.tags ?? []).some((tag) => tag.kind === 'immediate'))
      .map((b) => b.id);
    if (firedBoards.length && !firedBoards.includes('decision')) {
      checked += 1;
      assert.match(t.description, /after the (move|better move)/,
        `${row.id}: immediate_threat fired only on ${firedBoards.join(',')} but the gloss carries no board qualifier: "${t.description}"`);
    }
  }
  assert.ok(checked > 0, 'expected at least one corpus record to exercise the board-qualified gloss');
});

// ── Task 8 (2026-09-01): L6 requires BOTH lines (swap, cap stays 3); L7 requires the player's own
// counterplay. `deriveRequiredSet` gained a third parameter, the ROUTED link id — never a re-derived
// `kind` test, which would capture the L9 records (see the D-2026-09-01 L9 pin below).

async function loadTask8Corpus() {
  const { toNarratorVector, pruneVector } = await import('../scripts/reasonNarratorVector.mjs');
  const { fileURLToPath } = await import('url');
  const { dirname, join } = await import('path');
  const here = dirname(fileURLToPath(import.meta.url));
  const rows = readFileSync(join(here, '../scripts/reason_corpus/evidence.jsonl'), 'utf8')
    .trim().split('\n').map((l) => JSON.parse(l));
  return { rows, toNarratorVector, pruneVector };
}

// Harvested from the live corpus 2026-09-01 (evidence.jsonl, by id): eval-4's two offered line
// handles are you-key-line (future:windows:c2r5,c3r5,c4r5,c5r5) and opp-key-line
// (future:windows:c3r2,c4r2,c5r2,c6r2). Before this task the required set was
// you-key-square / opp-key-square / you-key-line — one line only, while L6's guardrail says
// "name BOTH lines with their horizons".
test('D-2026-09-01: an L6 record requires BOTH lines plus one key square (eval-4)', async () => {
  const { rows, toNarratorVector, pruneVector } = await loadTask8Corpus();
  const fv = pruneVector(toNarratorVector(rows.find((r) => r.id === 'eval-4').evidence));
  const model = buildReasonRenderModel(fv);
  assert.equal(model.link.id, 'L6');
  const specs = model.requiredSet.map((g) => g.spec);
  assert.ok(specs.includes('future:windows:c2r5,c3r5,c4r5,c5r5'), 'you-key-line missing: ' + specs);
  assert.ok(specs.includes('future:windows:c3r2,c4r2,c5r2,c6r2'), 'opp-key-line missing: ' + specs);
  assert.equal(model.requiredSet.length, 3);
  // The third slot is ONE key square — the swap keeps the cap at 3, it does not widen it.
  assert.deepEqual(model.requiredSet.map((g) => g.handle),
    ['you-key-line', 'opp-key-line', 'you-key-square']);
});

// Measured on eval-30 (A7b 2/3, render_bug, non-retry): all three slots went to the opponent's
// geometry while `you-double` sat offered-only. L7's guardrail asks for the player's own most
// stubborn defense, so the required set must carry something the PLAYER owns.
test('D-2026-09-01: an L7 record with an offered you-fork requires it (eval-30)', async () => {
  const { rows, toNarratorVector, pruneVector } = await loadTask8Corpus();
  const fv = pruneVector(toNarratorVector(rows.find((r) => r.id === 'eval-30').evidence));
  const model = buildReasonRenderModel(fv);
  assert.equal(model.link.id, 'L7');
  const handles = model.requiredSet.map((g) => g.handle);
  assert.ok(handles.some((h) => h.startsWith('you-double') || h.startsWith('you-fork-pivot')),
    'no player-owned counterplay handle required: ' + handles);
  assert.ok(model.requiredSet.length <= 3);
});

test('D-2026-09-01: no non-fork L6 record leaves an offered line handle unrequired (corpus-wide)', async () => {
  const { rows, toNarratorVector, pruneVector } = await loadTask8Corpus();
  let checked = 0;
  for (const row of rows) {
    const fv = pruneVector(toNarratorVector(row.evidence));
    const model = buildReasonRenderModel(fv);
    if (model.link.id !== 'L6') continue;
    // Fork-carrying L6 records follow a different rule (D48 rule 3: a fork's pivot is offered AND
    // required) — skipped through the PRODUCTION predicate, never a hand-rolled proxy.
    if (halfCarriesFork(fv.lostResource) || halfCarriesFork(fv.opponentPunishment)) continue;
    checked += 1;
    const lineSpecs = model.zones.aliases.filter((a) => a.spec.includes('windows:')).map((a) => a.spec);
    const requiredLines = model.requiredSet.filter((g) => g.spec.includes('windows:'));
    assert.ok(requiredLines.length >= Math.min(2, lineSpecs.length),
      `${row.id}: L6 with ${lineSpecs.length} offered lines but only ${requiredLines.length} required`);
  }
  assert.ok(checked >= 2, `expected at least 2 non-fork L6 records, saw ${checked}`);
});

// Pinned from a snapshot taken on the PRE-Task-8 code (2026-09-01, all 63 corpus records built with
// buildReasonRenderModel). Byte-identical after the change: the both-lines swap must never reach a
// fork-carrying L6 record, because requiring both lines there would delete the fork pivot D48 rule 3
// requires. Pins (half, spec, handle, truthBoard) — role is a pure function of (owner, kind) and is
// pinned by the D49 sibling-role tests.
const TASK8_FORK_L6_PINS = {
  'eval-7': [['lostResource', 'future:c2r5', 'you-future-fork', 'projectedDeep'],
    ['opponentPunishment', 'future:c6r2', 'opp-key-square', 'projectedDeepOpp'],
    ['lostResource', 'future:c2r4', 'you-fork-pivot', 'projectedDeep']],
  'eval-8': [['lostResource', 'future:c2r5', 'you-future-fork', 'projectedDeep'],
    ['opponentPunishment', 'future:c6r2', 'opp-key-square', 'projectedDeepOpp'],
    ['lostResource', 'future:c2r4', 'you-fork-pivot', 'projectedDeep']],
  'eval-11': [['lostResource', 'future:c2r5', 'you-future-fork', 'projectedDeep'],
    ['opponentPunishment', 'future:c2r4', 'opp-key-square', 'projectedDeepOpp'],
    ['lostResource', 'future:windows:c2r5,c3r5,c4r5,c5r5', 'you-key-line', 'projectedDeep']],
  'eval-12': [['lostResource', 'future:c2r5', 'you-future-fork', 'projectedDeep'],
    ['opponentPunishment', 'future:c2r4', 'opp-key-square', 'projectedDeepOpp'],
    ['lostResource', 'future:windows:c2r5,c3r5,c4r5,c5r5', 'you-key-line', 'projectedDeep']],
  'eval-18': [['lostResource', 'future:windows:c5r5,c7r6', 'you-future-fork', 'projectedDeep'],
    ['opponentPunishment', 'future:c5r2', 'opp-key-square', 'projectedDeepOpp'],
    ['lostResource', 'future:c5r4', 'you-fork-pivot', 'projectedDeep']],
  'eval-20': [['lostResource', 'future:windows:c5r5,c7r6', 'you-future-fork', 'projectedDeep'],
    ['opponentPunishment', 'future:c5r2', 'opp-key-square', 'projectedDeepOpp'],
    ['lostResource', 'future:c5r4', 'you-fork-pivot', 'projectedDeep']],
  'eval-25': [['lostResource', 'future:windows:c5r6,c7r3', 'you-future-fork', 'projectedDeep'],
    ['opponentPunishment', 'future:c1r5', 'opp-key-square', 'projectedDeepOpp'],
    ['lostResource', 'future:c5r5', 'you-fork-pivot', 'projectedDeep']],
  'eval-26': [['lostResource', 'future:windows:c5r6,c7r3', 'you-future-fork', 'projectedDeep'],
    ['opponentPunishment', 'future:c5r5', 'opp-future-fork', 'projectedDeepOpp'],
    ['opponentPunishment', 'future:c5r4', 'opp-fork-pivot', 'projectedDeepOpp']],
};

test('D-2026-09-01: fork-carrying L6 records keep their existing (unswapped) required set (corpus-wide)', async () => {
  const { rows, toNarratorVector, pruneVector } = await loadTask8Corpus();
  for (const [id, pin] of Object.entries(TASK8_FORK_L6_PINS)) {
    const fv = pruneVector(toNarratorVector(rows.find((r) => r.id === id).evidence));
    const model = buildReasonRenderModel(fv);
    assert.equal(model.link.id, 'L6', `${id}: expected L6 routing`);
    assert.deepEqual(model.requiredSet.map((g) => [g.half, g.spec, g.handle, g.truthBoard]), pin,
      `${id}: fork-carrying L6 required set drifted from its pre-Task-8 snapshot`);
  }
});

// L9's guardrail ("hedge — do not fabricate a crisp cause") forbids the both-lines rewrite, and L9
// precedes L6 in the link table while satisfying the same `winning_line`/`winning_line` kind shape —
// which is exactly why the branch keys on the ROUTED link id, not on kind fields.
const TASK8_L9_PINS = {
  'eval-31': [['lostResource', 'future:c6r5', 'you-key-square', 'projectedDeep'],
    ['opponentPunishment', 'c6r2', 'opp-major', 'decision'],
    ['lostResource', 'future:windows:c4r3,c5r4,c6r5,c7r6', 'you-key-line', 'projectedDeep']],
  'eval-35': [['lostResource', 'future:c5r5', 'you-key-square', 'projectedDeep'],
    ['opponentPunishment', 'future:c5r4', 'opp-key-square', 'projectedDeepOpp'],
    ['lostResource', 'future:windows:c2r5,c3r5,c4r5,c5r5', 'you-key-line', 'projectedDeep']],
  'pin-L9-hedged-parity': [['lostResource', 'future:c5r5', 'you-key-square', 'projectedDeep'],
    ['opponentPunishment', 'future:c5r4', 'opp-key-square', 'projectedDeepOpp'],
    ['lostResource', 'future:windows:c2r5,c3r5,c4r5,c5r5', 'you-key-line', 'projectedDeep']],
};

test('D-2026-09-01: L9 required sets are untouched by the L6 swap (eval-31, eval-35, pin-L9-hedged-parity)', async () => {
  const { rows, toNarratorVector, pruneVector } = await loadTask8Corpus();
  for (const [id, pin] of Object.entries(TASK8_L9_PINS)) {
    const fv = pruneVector(toNarratorVector(rows.find((r) => r.id === id).evidence));
    const model = buildReasonRenderModel(fv);
    assert.equal(model.link.id, 'L9', `${id}: expected L9 routing`);
    assert.deepEqual(model.requiredSet.map((g) => [g.half, g.spec, g.handle, g.truthBoard]), pin,
      `${id}: L9 required set drifted — the both-lines swap must never reach an L9 record`);
  }
});

test('D-2026-09-01: FR-004 (required ⊆ offered) and the 1-3 cap hold corpus-wide after the swap', async () => {
  const { rows, toNarratorVector, pruneVector } = await loadTask8Corpus();
  for (const row of rows) {
    const fv = pruneVector(toNarratorVector(row.evidence));
    const model = buildReasonRenderModel(fv);
    const offered = new Set(model.zones.aliases.map((a) => a.spec));
    assert.ok(model.requiredSet.length <= 3, `${row.id}: required set over cap`);
    for (const g of model.requiredSet) {
      assert.ok(offered.has(g.spec), `${row.id}: required spec ${g.spec} (${g.handle}) is not offered`);
    }
    // buildRenderDecision must derive the SAME required set (it routes the same link id).
    assert.deepEqual(buildRenderDecision(fv).requiredSet, model.requiredSet,
      `${row.id}: buildRenderDecision required set diverged from buildReasonRenderModel`);
  }
});

test('D-2026-09-01: deriveRequiredSet with no linkId keeps the pre-Task-8 derivation (default arg)', () => {
  const pruned = {
    lostResource: { completingCell: 'c5r5', window: ['c2r5', 'c3r5', 'c4r5', 'c5r5'] },
    opponentPunishment: { completingCell: 'c3r5', window: ['c6r2', 'c5r3', 'c4r4', 'c3r5'] },
  };
  const twoArg = deriveRequiredSet(pruned, { aliases: LINE_ALIASES });
  const explicitNonL6 = deriveRequiredSet(pruned, { aliases: LINE_ALIASES }, 'L5');
  assert.deepEqual(twoArg.map((g) => g.handle), ['you-key-square', 'opp-key-square', 'you-key-line']);
  assert.deepEqual(explicitNonL6, twoArg);
  // Same fixture routed as L6 swaps to both lines + one square, still capped at 3.
  const asL6 = deriveRequiredSet(pruned, { aliases: LINE_ALIASES }, 'L6');
  assert.deepEqual(asL6.map((g) => g.handle), ['you-key-line', 'opp-key-line', 'you-key-square']);
});

// ── Task 8, fix round 1 (2026-09-01): the L7 swap must never evict a fork PIVOT ──────────────────
// D48 rule 3: "a fork's pivot is offered AND required". The swap's last-resort victim (at cap, with
// no `opp-…-line` group to give up) used to overwrite the LAST-derived group unconditionally — which
// on an L7 fork record can be `opp-fork-pivot`, trading one invariant for another. It now ABSTAINS
// (I2). Dead on today's corpus (only eval-30 triggers the swap at all, and it has a line victim), so
// these are unit tests on `deriveRequiredSet` with the routed link id passed explicitly — the same
// entry point production uses, just fed a shape the 63 records do not currently contain.

// At cap, no line group, last-derived group is a fork pivot. Derivation:
//   point(lostResource)      -> c6r2                 -> opp-key-square
//   point(opponentPunishment)-> windows:c3r5,c7r1    -> opp-future-fork   (double_threat forkCells)
//   pivot(opponentPunishment)-> c5r4                 -> opp-fork-pivot    (last ply of its line)
const L7_PIVOT_TAIL_PRUNED = {
  lostResource: { completingCell: 'c6r2' },
  opponentPunishment: {
    tacticTag: 'double_threat', completingCell: 'c3r5', forkCells: ['c3r5', 'c7r1'],
    line: [{ cell: 'c4r3' }, { cell: 'c5r4' }],
  },
};
const L7_PIVOT_TAIL_ALIASES = [
  { handle: 'opp-key-square', spec: 'c6r2', role: 'a square on the opponent line', truthBoard: 'decision', kbId: null },
  { handle: 'opp-future-fork', spec: 'windows:c3r5,c7r1', role: 'both fork squares', truthBoard: 'afterPlayed', kbId: 'double_threat' },
  { handle: 'opp-fork-pivot', spec: 'c5r4', role: 'the square that creates the fork', truthBoard: 'afterPlayed', kbId: null },
  { handle: 'you-double', spec: 'windows:c1r4,c2r2', role: 'your own counterplay', truthBoard: 'decision', kbId: 'double_threat' },
];

test('D-2026-09-01 (fix round 1): the L7 swap ABSTAINS when the only victim would be a fork pivot (D48 rule 3)', () => {
  const req = deriveRequiredSet(L7_PIVOT_TAIL_PRUNED, { aliases: L7_PIVOT_TAIL_ALIASES }, 'L7');
  // Preconditions the abstention depends on — asserted, not assumed.
  assert.equal(req.length, 3, 'fixture must be AT CAP for the last-resort branch to be reachable');
  assert.ok(!req.some((g) => /-line(-\d+)?$/.test(g.handle)), 'fixture must offer NO line victim');
  assert.match(req[req.length - 1].handle, /-fork-pivot$/, 'fixture must end on a fork pivot');
  // The abstention itself: the pivot survives and the swap did not fire.
  assert.deepEqual(req.map((g) => g.handle), ['opp-key-square', 'opp-future-fork', 'opp-fork-pivot']);
  assert.ok(!req.some((g) => g.handle.startsWith('you-')),
    'the swap must not fire here — requiring you-double would have deleted the fork pivot D48 rule 3 requires');
});

test('D-2026-09-01 (fix round 1): the L7 last-resort swap STILL fires when the tail group is not a pivot', () => {
  // Same shape, but the opponent half carries no pivot (no `line`), so the third slot is filled by a
  // second key square — an ordinary group the swap may evict. This is the positive control proving
  // the abstention is scoped to fork pivots and did not disable the last-resort branch outright.
  const pruned = {
    lostResource: { completingCell: 'c6r2' },
    opponentPunishment: { tacticTag: 'double_threat', completingCell: 'c3r5', forkCells: ['c3r5', 'c7r1'] },
  };
  const aliases = [...L7_PIVOT_TAIL_ALIASES.filter((a) => a.handle !== 'opp-fork-pivot'),
    { handle: 'opp-key-square-2', spec: 'col4', role: 'the better column', truthBoard: 'decision', kbId: null }];
  const req = deriveRequiredSet({ ...pruned, bestCol: 3 }, { aliases }, 'L7');
  assert.deepEqual(req.map((g) => g.handle), ['opp-key-square', 'opp-future-fork', 'you-double'],
    'the non-pivot tail group is a legitimate victim and must still be swapped out');
});

test('D-2026-09-01 (fix round 1): an offered LINE remains the preferred victim, and the fork pivot survives beside it', () => {
  // Line victim present AND a pivot present: the line goes, the pivot survives — the ordering the
  // swap was written with, re-pinned so a future edit cannot quietly promote the pivot to victim.
  const aliases = [...L7_PIVOT_TAIL_ALIASES,
    { handle: 'opp-key-line', spec: 'windows:c6r2,c5r3,c4r4,c3r5', role: 'the opponent line', truthBoard: 'decision', kbId: null }];
  const pruned = {
    lostResource: { window: ['c6r2', 'c5r3', 'c4r4', 'c3r5'] },   // no cell -> its group IS the line
    opponentPunishment: {
      tacticTag: 'double_threat', completingCell: 'c3r5', forkCells: ['c3r5', 'c7r1'],
      line: [{ cell: 'c4r3' }, { cell: 'c5r4' }],
    },
  };
  const req = deriveRequiredSet(pruned, { aliases }, 'L7');
  assert.ok(req.some((g) => g.handle === 'you-double'), 'the swap must fire: ' + req.map((g) => g.handle));
  assert.ok(req.some((g) => g.handle === 'opp-fork-pivot'), 'the fork pivot must survive: ' + req.map((g) => g.handle));
  assert.ok(!req.some((g) => g.handle === 'opp-key-line'), 'the LINE is the victim: ' + req.map((g) => g.handle));
});

// ── Offer/require seam mismatch fix: deriveRequiredSet's pivot loop falls back to an
// already-offered `*-fork-pivot` alias for the half's owner when `forkPivotCell(half)` abstains.
// zoneAnnotations.mjs mints a `*-fork-pivot` alias via THREE paths (half-based `forkPivotCell`,
// board-tag `boardTagPivotCell`, and the realized-pattern loop); `deriveRequiredSet` used to call
// only `forkPivotCell`, so a pivot minted by either of the other two paths was structurally
// impossible to require even though it was offered. Measured on the 63-record corpus: 25 records
// offer a `*-fork-pivot` alias, 10 never required it — 6 of the 10 (eval-30, eval-43, eval-44,
// eval-46, pin-L3-no-causation, pin-branch-invariance-true-1) are fixed by this fallback (each had a
// free `better-col` slot the pivot now wins instead); the other 4 stay correctly unresolved for
// reasons pinned below (eval-36: neither half's OWNER is the pivot's owner; eval-47: cap already
// full with a different pivot for the same owner already required; eval-48/pin-L1-completes-your-
// tactic: the fallback candidate's spec is the SAME cell as a group already required under a
// different handle name, and the existing no-duplicate-spec guard correctly declines to require it
// twice under two names).
const FORK_PIVOT_FALLBACK_ALIASES = [
  { handle: 'you-key-square', spec: 'c1r1', role: 'the square you needed', truthBoard: 'decision', kbId: null },
  { handle: 'opp-key-square', spec: 'c3r5', role: 'the square the opponent took', truthBoard: 'decision', kbId: null },
  // Not derivable via forkPivotCell: no half below carries a `tacticTag`/`line`, so this alias can
  // only have been minted by the board-tag or realized-pattern path (paths 2/3 in the task brief).
  { handle: 'you-fork-pivot', spec: 'c2r1', role: 'the square you play to CREATE the fork', truthBoard: 'decision', kbId: null },
  { handle: 'better-col', spec: 'col4', role: 'the column of the better move', truthBoard: 'decision', kbId: null },
];

test('fork-pivot fallback: a pivot offered by the HALF-BASED path (forkPivotCell matches directly) is still required — no regression', () => {
  const pruned = {
    lostResource: { tacticTag: 'double_threat', completingCell: 'c3r5', forkCells: ['c3r5', 'c7r1'],
                    line: [{ cell: 'c4r3' }, { cell: 'c5r4' }] },
    opponentPunishment: {},
  };
  const aliases = [
    { handle: 'you-future-fork', spec: 'windows:c3r5,c7r1', role: 'both fork squares', truthBoard: 'projectedDeep', kbId: 'double_threat' },
    { handle: 'you-fork-pivot', spec: 'c5r4', role: 'the square that creates the fork', truthBoard: 'projectedDeep', kbId: null },
  ];
  const req = deriveRequiredSet(pruned, { aliases });
  assert.deepEqual(req.map((g) => g.handle), ['you-future-fork', 'you-fork-pivot']);
  assert.equal(req.find((g) => g.handle === 'you-fork-pivot').spec, 'c5r4');
});

test('fork-pivot fallback: a pivot offered ONLY by a non-half path (forkPivotCell abstains) is now required, by owner', () => {
  // lostResource carries no `tacticTag`, so forkPivotCell(lostResource) returns null (abstains) —
  // exactly the shape a board-tag- or realized-pattern-minted pivot leaves behind. The fallback must
  // find the offered `you-fork-pivot` alias by OWNER (halfOwner(lostResource, 'you') === 'you' here,
  // since `kind` is not 'denial'/'neutralization') and require it, without deriving new geometry.
  const pruned = { lostResource: { completingCell: 'c1r1' }, opponentPunishment: {} };
  const aliases = FORK_PIVOT_FALLBACK_ALIASES.filter((a) => a.handle !== 'opp-key-square' && a.handle !== 'better-col');
  const req = deriveRequiredSet(pruned, { aliases });
  assert.deepEqual(req.map((g) => g.handle), ['you-key-square', 'you-fork-pivot']);
  assert.equal(req.find((g) => g.handle === 'you-fork-pivot').spec, 'c2r1');
});

test('fork-pivot fallback: a half whose OWNER does not match the offered pivot never requires it (denial/neutralization flip)', () => {
  // halfOwner flips a 'denial'/'neutralization' half to the OTHER side's owner (D47) — a `you-`
  // pivot offered on the board has no half to anchor to when both halves resolve to 'opp'. This is
  // the eval-36 shape: the fallback must not require a handle whose owner neither half maps to.
  const pruned = {
    lostResource: { kind: 'denial', completingCell: 'c1r1' },       // halfOwner -> 'opp'
    opponentPunishment: { completingCell: 'c3r5' },                  // halfOwner -> 'opp'
  };
  const aliases = FORK_PIVOT_FALLBACK_ALIASES.map((a) => (a.handle === 'you-key-square'
    ? { ...a, handle: 'opp-key-square-x', spec: 'c1r1' } : a)).filter((a) => a.handle !== 'better-col');
  const req = deriveRequiredSet(pruned, { aliases });
  assert.ok(!req.some((g) => g.handle === 'you-fork-pivot'),
    'no half owns "you" in this record — the you-fork-pivot alias must stay offered-only: ' + req.map((g) => g.handle));
});

test('fork-pivot fallback: better-col yields its free slot to the fallback pivot (Q2 priority — pivot beats the provisional better-col fill)', () => {
  const pruned = {
    lostResource: { completingCell: 'c1r1' },
    opponentPunishment: { completingCell: 'c3r5' },
    bestCol: 3,
  };
  const withPivot = deriveRequiredSet(pruned, { aliases: FORK_PIVOT_FALLBACK_ALIASES });
  assert.deepEqual(withPivot.map((g) => g.handle), ['you-key-square', 'opp-key-square', 'you-fork-pivot']);
  assert.ok(!withPivot.some((g) => g.handle === 'better-col'), 'the pivot must win the slot over better-col');
  // Control: with the pivot alias NOT offered, the exact same record falls through to better-col —
  // proving the slot really was free (this is not slot starvation, matching the task's own finding).
  const withoutPivot = deriveRequiredSet(pruned,
    { aliases: FORK_PIVOT_FALLBACK_ALIASES.filter((a) => a.handle !== 'you-fork-pivot') });
  assert.deepEqual(withoutPivot.map((g) => g.handle), ['you-key-square', 'opp-key-square', 'better-col']);
});

test('fork-pivot fallback: the 3-slot cap still holds even when both halves have a fallback pivot on offer', () => {
  const pruned = {
    lostResource: { completingCell: 'c1r1' },
    opponentPunishment: { completingCell: 'c3r5' },
    bestCol: 3,
  };
  const aliases = [...FORK_PIVOT_FALLBACK_ALIASES,
    { handle: 'opp-fork-pivot', spec: 'c4r5', role: 'the square the opponent plays to CREATE the fork', truthBoard: 'decision', kbId: null }];
  const req = deriveRequiredSet(pruned, { aliases });
  assert.equal(req.length, 3);
  // First-half-first fills the pivot slot with 'you'; the opponent's fallback pivot is a legitimate
  // group that is correctly left offered-but-unrequired once the cap is reached, same as any other
  // FR-005 cap overflow — not a fresh bug this fallback introduces.
  assert.deepEqual(req.map((g) => g.handle), ['you-key-square', 'opp-key-square', 'you-fork-pivot']);
});

test('fork-pivot fallback: never double-requires the same cell under two different handles (no-duplicate-spec guard, eval-48/pin-L1 shape)', () => {
  // The fallback candidate's spec is the SAME geometry as a group already required under a
  // different handle name — the pre-existing "a subset has no duplicates" guard (see `push`, D2)
  // must decline the fallback rather than print the identical square twice under two labels.
  const pruned = { lostResource: { completingCell: 'c1r1' }, opponentPunishment: {} };
  const aliases = [
    { handle: 'you-key-square', spec: 'c1r1', role: 'the key square', truthBoard: 'decision', kbId: null },
    { handle: 'you-fork-pivot', spec: 'c1r1', role: 'the square you play to CREATE the fork', truthBoard: 'decision', kbId: null },
  ];
  const req = deriveRequiredSet(pruned, { aliases });
  assert.equal(req.length, 1, 'the same cell must not be required twice under two different handles');
});

// ── Task 9: by-design OMITs raise a typed NotABlunder error instead of falling through to
// classifyCausalLink's opaque "no rule matched" (I4/D3/D4/D23). Minimal vector shape per the task
// brief — the guard keys only on `case` and `gate.verdict`, so this exercises the real branch
// without a live solver call. Guarded in BOTH buildRenderDecision (what the frequency probe calls,
// and which calls classifyCausalLink itself) and buildReasonRenderModel (F9).

test('a by-design OMIT (win_to_slower_win) raises NotABlunder, not "no rule matched" (via buildRenderDecision)', () => {
  const fv = { case: 'win_to_slower_win' };
  assert.throws(() => buildRenderDecision(fv), /NotABlunder/);
});

test('a by-design OMIT (win_to_slower_win) raises NotABlunder from buildReasonRenderModel too', () => {
  const fv = { case: 'win_to_slower_win' };
  assert.throws(() => buildReasonRenderModel(fv), /NotABlunder/);
});

test('a by-design OMIT (lose_to_faster_lose gate NotABlunder) raises NotABlunder (via buildRenderDecision)', () => {
  const fv = { case: 'lose_to_faster_lose', gate: { verdict: 'NotABlunder' } };
  assert.throws(() => buildRenderDecision(fv), /NotABlunder/);
});

test('a by-design OMIT (lose_to_faster_lose gate NotABlunder) raises NotABlunder from buildReasonRenderModel too', () => {
  const fv = { case: 'lose_to_faster_lose', gate: { verdict: 'NotABlunder' } };
  assert.throws(() => buildReasonRenderModel(fv), /NotABlunder/);
});

test('lose_to_faster_lose with gate.verdict Blunder does NOT trip the guard (only NotABlunder does)', () => {
  // Sanity control: a real, gated Blunder on this case must not be swallowed by the guard. The
  // minimal fixture is missing other fields buildRenderDecision needs downstream, so it may still
  // throw for an unrelated reason (or run to completion) — what this test pins is that the guard's
  // own typed error never fires here.
  const fv = { case: 'lose_to_faster_lose', gate: { verdict: 'Blunder' } };
  try {
    buildRenderDecision(fv);
  } catch (err) {
    assert.ok(!/NotABlunder: by-design OMIT/.test(err.message),
      `guard must not fire on gate.verdict === 'Blunder', got: ${err.message}`);
  }
});

// ── Final-review fixes (2026-09-01) ─────────────────────────────────────────────────────────────

// Fix 2. A realized-fork pivot may take the PRESENT-tense `fork-pivot-now` role ("the square <owner>
// plays to CREATE the fork") only when the square is genuinely playable on the board the alias names.
// `pin-branch-invariance-true-1`'s `opp-fork-pivot = c5r3` is `register: 'immediate'` (so the old
// `isFuture`-only choice gave it the present tense) but on the `decision` board it is EMPTY AND NOT
// GRAVITY-TOP — the column top is row 2 (0-indexed 1) and the cell's row is 2 — so the opponent
// cannot play it. Blast radius measured corpus-wide: 1 of 63 records.
test('Fix 2: a realized-fork pivot that is not gravity-top on its own truthBoard takes the NON-present-tense role', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const { toNarratorVector, pruneVector } = await import('../scripts/reasonNarratorVector.mjs');
  const { parseBoardState } = await import('../classifier.js');
  const here = dirname(fileURLToPath(import.meta.url));
  const rows = readFileSync(join(here, '../scripts/reason_corpus/evidence.jsonl'), 'utf8')
    .trim().split('\n').map((l) => JSON.parse(l));

  const fv = pruneVector(toNarratorVector(rows.find((r) => r.id === 'pin-branch-invariance-true-1').evidence));
  const model = buildReasonRenderModel(fv);
  const pivot = model.zones.aliases.find((a) => a.handle === 'opp-fork-pivot');
  assert.ok(pivot, 'fixture premise: this record offers a realized-fork pivot');
  assert.equal(pivot.spec, 'c5r3');
  assert.equal(pivot.truthBoard, 'decision');

  // The premise, checked through the production board model rather than asserted as a constant.
  const board = model.boards.find((b) => b.id === pivot.truthBoard);
  const { colHeights } = parseBoardState(board.movestring);
  assert.notEqual(colHeights[4], 2, 'fixture premise: c5r3 must NOT be gravity-top on the decision board');

  assert.match(pivot.role, /it is NOT the move to play right now/,
    'a square the opponent cannot play must not be described as the square they play');
  assert.doesNotMatch(pivot.role, /CREATE the fork — the move that makes both winning squares live at once$/);
});

test('Fix 2: every fork pivot claiming the present tense IS gravity-top on the board it names (corpus-wide)', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const { toNarratorVector, pruneVector } = await import('../scripts/reasonNarratorVector.mjs');
  const { parseBoardState } = await import('../classifier.js');
  const here = dirname(fileURLToPath(import.meta.url));
  const rows = readFileSync(join(here, '../scripts/reason_corpus/evidence.jsonl'), 'utf8')
    .trim().split('\n').map((l) => JSON.parse(l));

  // Scoped to the realized-fork family this fix touches: those pivots name a board the prompt shows
  // and carry a bare (non-`future:`) spec. The board-tag pivots (T025, `afterBest`/`afterPlayed`) are
  // a different construction — there the pivot cell is the creating move itself, already PLAYED on
  // the board it names — and are deliberately out of scope.
  const FORK_TAGS = new Set(['double_threat', 'figure_7']);
  let checked = 0, presentTense = 0;
  for (const r of rows) {
    const fv = pruneVector(toNarratorVector(r.evidence));
    const realized = [fv.lostResource, fv.opponentPunishment]
      .filter((h) => h && h.kind === 'realized_pattern' && FORK_TAGS.has(h.tag));
    if (!realized.length) continue;
    const model = buildReasonRenderModel(fv);
    for (const a of model.zones.aliases) {
      if (!/-fork-pivot(-\d+)?$/.test(a.handle)) continue;
      if (a.spec.startsWith('future:')) continue;
      if (a.truthBoard === 'afterBest' || a.truthBoard === 'afterPlayed') continue;   // board-tag pivots
      const board = model.boards.find((b) => b.id === a.truthBoard);
      if (!board) continue;
      checked++;
      const m = /^c(\d+)r(\d+)$/.exec(a.spec);
      const { colHeights } = parseBoardState(board.movestring);
      const gravityTop = colHeights[Number(m[1]) - 1] === Number(m[2]) - 1;
      const claimsNow = !/NOT the move to play right now/.test(a.role)
        && /plays? to CREATE the fork/.test(a.role);
      if (claimsNow) presentTense++;
      assert.equal(claimsNow, gravityTop,
        `${r.id} ${a.handle} (${a.spec} on ${a.truthBoard}): present-tense=${claimsNow} but gravity-top=${gravityTop}`);
    }
  }
  assert.ok(checked >= 5, `expected the realized-fork pivots to still be offered; checked ${checked}`);
  // The gravity-top ones keep `fork-pivot-now`: eval-43, eval-44, eval-46, pin-L3-no-causation.
  assert.equal(presentTense, 4, `expected 4 present-tense realized-fork pivots; got ${presentTense}`);
});

// Fix 5a. `FORK_PIVOT_HANDLE` (and the L7 victim search's `LINE_GROUP_HANDLE`) MIRROR `mkHandle`'s
// naming scheme in zoneAnnotations.mjs. A rename there would silently turn the D48-rule-3 abstention
// into a no-op on a path that is dead on today's corpus, so no existing test would go red. This
// asserts the mirror against what the offer layer actually produces.
test('Fix 5a: every fork-pivot handle the offer layer produces matches FORK_PIVOT_HANDLE (corpus-wide)', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const { toNarratorVector, pruneVector } = await import('../scripts/reasonNarratorVector.mjs');
  const { FORK_PIVOT_HANDLE, LINE_GROUP_HANDLE } = await import('../scripts/renderReasonModel.mjs');
  const here = dirname(fileURLToPath(import.meta.url));
  const rows = readFileSync(join(here, '../scripts/reason_corpus/evidence.jsonl'), 'utf8')
    .trim().split('\n').map((l) => JSON.parse(l));

  let pivots = 0, lines = 0;
  for (const r of rows) {
    const model = buildReasonRenderModel(pruneVector(toNarratorVector(r.evidence)));
    for (const a of model.zones.aliases) {
      // "A fork pivot" is identified by the ROLE TEXT (what the reader is told the handle is), never
      // by the regex under test — otherwise the assertion would be f(a) === f(a) and vacuous.
      if (/to CREATE the fork|that move is what set up the fork/.test(a.role)) {
        pivots++;
        assert.match(a.handle, FORK_PIVOT_HANDLE,
          `${r.id}: ${a.handle} is a fork pivot by its role text but FORK_PIVOT_HANDLE does not match it — `
          + 'the L7 D48-rule-3 abstention would silently stop protecting it');
      }
      // Same mirror risk for the L7 victim search. Scoped to the `*-key-line` / `*-<kind>-line`
      // family it actually targets; `*-fork-lines` (plural, the D45 both-lines group) is a separate
      // handle family the swap deliberately does not treat as a line victim.
      if (/-key-line(-\d+)?$/.test(a.handle)) {
        lines++;
        assert.match(a.handle, LINE_GROUP_HANDLE, `${r.id}: ${a.handle} must be recognisable as a line group`);
      }
    }
  }
  assert.ok(pivots >= 20, `expected the corpus to still offer fork pivots; got ${pivots}`);
  assert.ok(lines >= 20, `expected the corpus to still offer key-line groups; got ${lines}`);
});

// Fix 5b. The realized-fork prong pair's `kbId` is derived from the half's own tag, not hard-coded to
// 'double_threat'. Inert on today's corpus (every realized `figure_7` half is single-cell and never
// reaches the pair block), so this drives the branch directly.
test('Fix 5b: a realized-fork prong pair takes its kbId from the half\'s own tag, not a hard-coded double_threat', async () => {
  const { buildAnnotationOffer } = await import('../scripts/reason_engine/zoneAnnotations.mjs');
  const boards = [{ id: 'decision', movestring: '3323', shown: true, tags: [] }];
  const mk = (tag) => ({
    bestCol: 0, playedCol: 1, movestring: '3323',
    opponentPunishment: { kind: 'realized_pattern', tag, owner: 2, register: 'immediate',
      cells: ['c2r1', 'c6r1'], finalMovestring: '33232' },
  });
  const pairOf = (tag) => buildAnnotationOffer(mk(tag), boards).aliases
    .find((a) => /-double(-\d+)?$/.test(a.handle));

  const f7 = pairOf('figure_7');
  assert.ok(f7, 'the figure_7 two-prong half must still get a pair');
  assert.equal(f7.kbId, 'figure_7', 'the pair must be glossed as the tag it actually is');

  const dt = pairOf('double_threat');
  assert.equal(dt.kbId, 'double_threat', 'the double_threat path is unchanged');
});
