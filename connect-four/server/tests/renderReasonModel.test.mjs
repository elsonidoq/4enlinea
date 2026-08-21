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
  const { OFFERABLE_TERM_SLUGS } = await import('../scripts/reason_engine/zoneAnnotations.mjs');
  const here = dirname(fileURLToPath(import.meta.url));
  const rows = readFileSync(join(here, '../scripts/reason_corpus/evidence.jsonl'), 'utf8')
    .trim().split('\n').map((l) => JSON.parse(l));

  const violations = [];
  for (const r of rows) {
    const fv = pruneVector(toNarratorVector(r.evidence));
    const model = buildReasonRenderModel(fv);
    const prompt = assembleGroundedPrompt(model);

    const offeredTerms = new Set((model.zones.terms ?? []).map((t) => t.slug));
    for (const slug of OFFERABLE_TERM_SLUGS) {
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
test('O3 centrality opening record (eval-11): the reading key positively states no book line applies', async () => {
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
  assert.match(readingKeySection, /centrality, parity/i,
    'O3 reading key must still teach the centrality/parity vocabulary it DOES need');
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
