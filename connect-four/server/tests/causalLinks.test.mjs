import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { classifyCausalLink, CAUSAL_LINKS, denialCell } from '../scripts/reason_engine/causalLinks.mjs';
import { toNarratorVector, pruneVector } from '../scripts/reasonNarratorVector.mjs';
import { patternOnAfterBestBoard } from '../scripts/reasonBoardSelect.mjs';
import { grainOf } from '../scripts/reasonBoardTags.mjs';
import { checkWin, parseBoardState } from '../classifier.js';
import { composeOpeningFrame } from '../scripts/reason_engine/openingFrame.mjs';
import { buildReasonRenderModel } from '../scripts/renderReasonModel.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORPUS = join(__dirname, '../scripts/reason_corpus/evidence.jsonl');
const corpusRows = readFileSync(CORPUS, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
function classifyRow(row) {
  const fv = pruneVector(toNarratorVector(row.evidence));
  const ctx = fv.direction === 'enabled_opponent' ? { patternOnAfterBestBoard: patternOnAfterBestBoard(fv) } : {};
  return { fv, link: classifyCausalLink(fv, ctx) };
}
function cellOccupiedOn(finalMovestring, cell) {
  if (!finalMovestring || !cell) return false;
  const m = /^c(\d+)r(\d+)$/.exec(cell);
  if (!m) return false;
  const col = Number(m[1]) - 1, row = Number(m[2]) - 1;
  const { board } = parseBoardState(finalMovestring);
  return !!(board[row] && board[row][col]);
}

test('L1 missed_own', () => {
  const fv = { case: 'win_to_lose', route: 'realized_denied', direction: 'missed_own',
               lostResource: { kind: 'realized_pattern' }, opponentPunishment: { kind: 'denial' } };
  assert.equal(classifyCausalLink(fv).id, 'L1');
});

test('L3 enabled_opponent when already losing (branch-invariant default)', () => {
  const fv = { case: 'lose_to_faster_lose', route: 'realized_denied', direction: 'enabled_opponent',
               lostResource: { kind: 'denial' }, opponentPunishment: { kind: 'realized_pattern' } };
  assert.equal(classifyCausalLink(fv).id, 'L3');
});

test('L2 enabled_opponent when winning was available and pattern not branch-invariant', () => {
  const fv = { case: 'win_to_lose', route: 'realized_denied', direction: 'enabled_opponent',
               lostResource: { kind: 'denial' }, opponentPunishment: { kind: 'realized_pattern' } };
  assert.equal(classifyCausalLink(fv, { patternOnAfterBestBoard: false }).id, 'L2');
});

// Fix B (D30): the sign `case` — not the geometric patternOnAfterBestBoard — gates L2 vs L3.
// A win_to_lose / draw_to_lose enabled_opponent case must NEVER route to L3, even when the opponent
// pattern happens to sit on the after-best board (the eval-51/eval-53 misroute).
test('L2 for win_to_lose enabled_opponent even when pattern IS on the after-best board (Fix B)', () => {
  const fv = { case: 'win_to_lose', route: 'realized_denied', direction: 'enabled_opponent',
               lostResource: { kind: 'denial' }, opponentPunishment: { kind: 'realized_pattern' } };
  assert.equal(classifyCausalLink(fv, { patternOnAfterBestBoard: true }).id, 'L2');
});

test('L2 for draw_to_lose enabled_opponent regardless of branch-invariance ctx (Fix B)', () => {
  const fv = { case: 'draw_to_lose', route: 'realized_denied', direction: 'enabled_opponent',
               lostResource: { kind: 'denial' }, opponentPunishment: { kind: 'realized_pattern' } };
  assert.equal(classifyCausalLink(fv, { patternOnAfterBestBoard: true }).id, 'L2');
  assert.equal(classifyCausalLink(fv, { patternOnAfterBestBoard: false }).id, 'L2');
});

test('L3 only fires on lose_to_faster_lose enabled_opponent (Fix B); text is hold-the-line, not defeatist', () => {
  const fv = { case: 'lose_to_faster_lose', route: 'realized_denied', direction: 'enabled_opponent',
               opponentPunishment: { kind: 'realized_pattern', tag: 'figure_7', completingCell: 'c5r4' } };
  const link = classifyCausalLink(fv, { patternOnAfterBestBoard: false });
  assert.equal(link.id, 'L3');
  assert.match(link.text, /didn't create it|work hardest|speeds up/i);
  assert.match(link.text, /7-shaped double threat/);        // figure_7 slug -> plain C4 phrase
  assert.doesNotMatch(link.text, /already losing|neither move wins/i);  // no defeatist framing
  assert.match(link.guardrail, /caused or enabled/i);       // causation guardrail preserved
});

test('L3/L7 guardrail forbids defeatist closing phrases', () => {
  const L3_FV = { case: 'lose_to_faster_lose', route: 'realized_denied', direction: 'enabled_opponent',
    lostResource: {}, opponentPunishment: { tag: 'figure_7', completingCell: 'c4r3' } };
  const L7_FV = { case: 'lose_to_faster_lose', route: 'sign',
    lostResource: { kind: 'conditional_swindle' }, opponentPunishment: {} };
  const l3 = classifyCausalLink(L3_FV);
  const l7 = classifyCausalLink(L7_FV);
  assert.equal(l3.id, 'L3');
  assert.equal(l7.id, 'L7');
  for (const link of [l3, l7]) {
    assert.match(link.guardrail, /end poorly/i);
    assert.match(link.guardrail, /goes against you/i);
  }
});

test('L7 conditional swindle', () => {
  const fv = { case: 'lose_to_faster_lose', route: 'sign',
               lostResource: { kind: 'conditional_swindle', register: 'parity' },
               opponentPunishment: { kind: 'winning_line', register: 'parity' } };
  assert.equal(classifyCausalLink(fv).id, 'L7');
});

test('L9 diffuse parity win (no shared cell) beats L6', () => {
  const fv = { case: 'win_to_lose', route: 'sign',
               lostResource: { kind: 'winning_line', register: 'parity' },
               opponentPunishment: { kind: 'winning_line', register: 'parity', tie: { sharedCells: [] } } };
  assert.equal(classifyCausalLink(fv).id, 'L9');
});

test('L4 defensive_miss', () => {
  const fv = { case: 'draw_to_lose', route: 'realized_denied', direction: 'defensive_miss',
               lostResource: { kind: 'denial' }, opponentPunishment: { kind: 'realized_pattern' } };
  assert.equal(classifyCausalLink(fv).id, 'L4');
});
test('L8 draw abandoned (sign)', () => {
  const fv = { case: 'draw_to_lose', route: 'sign',
               lostResource: { kind: 'denial', register: 'forced_sequence' },
               opponentPunishment: { kind: 'winning_line', register: 'parity' } };
  assert.equal(classifyCausalLink(fv).id, 'L8');
});
test('L6 two winning lines (sign)', () => {
  const fv = { case: 'win_to_lose', route: 'sign',
               lostResource: { kind: 'winning_line', register: 'forced_sequence' },
               opponentPunishment: { kind: 'winning_line', register: 'forced_sequence',
                                     tie: { sharedCells: ['c4r5'] } } };
  assert.equal(classifyCausalLink(fv).id, 'L6');
});

test('no rule matches throws', () => {
  assert.throws(() => classifyCausalLink({ case: 'nonsense', route: 'sign', lostResource: {}, opponentPunishment: {} }));
});

test('every catalog entry has the required shape', () => {
  for (const l of CAUSAL_LINKS) {
    assert.ok(l.id && l.family && l.confidence && typeof l.when === 'function' && Array.isArray(l.covers));
  }
});

// ── denialCell export (spec 058, US2, research.md D1) ────────────────────────────────────────
// deriveRequiredSet (renderReasonModel.mjs) imports and reuses this exact precedence rather than
// reimplementing the `??` chain — export it, no behavior change.
test('denialCell is exported and its cell ?? completingCell ?? null precedence is unchanged', () => {
  assert.equal(typeof denialCell, 'function');
  assert.equal(denialCell({ cell: 'c2r3', completingCell: 'c5r5' }), 'c2r3');   // cell wins over completingCell
  assert.equal(denialCell({ completingCell: 'c5r5' }), 'c5r5');                 // falls back to completingCell
  assert.equal(denialCell({}), null);                                          // neither present -> null
  assert.equal(denialCell(undefined), null);                                   // no half at all -> null
});

// ══════════════════════════════════════════════════════════════════════════════════════════════
// US2 (spec 059, board truth) — T020. NOTE for the next batch: US3 (T036) appends further tests to
// THIS SAME FILE after this block — sequence after, do not interleave.
// ══════════════════════════════════════════════════════════════════════════════════════════════

// ── FR-008 / OI-203 / T012 — eval-41: the better move wins on the spot ─────────────────────────
test('L1 (eval-41): a terminal best move is narrated as a completed, present win — not future tense', () => {
  const row = corpusRows.find((r) => r.id === 'eval-41');
  const { link } = classifyRow(row);
  assert.equal(link.id, 'L1');
  assert.match(link.text, /game is over/i);
  assert.doesNotMatch(link.text, /threat to make four next move/i);
  assert.doesNotMatch(link.text, /next move/i);
  assert.doesNotMatch(link.text, /keep it for/i);
});

// ── FR-009 / OI-188 / T016 — eval-37 and pin-branch-invariance-true-2: L3 grain must match ──────
for (const id of ['eval-37', 'pin-branch-invariance-true-2']) {
  test(`L3 (${id}): "immediate_threat" grain matches the decision board's own tactics grain`, () => {
    const row = corpusRows.find((r) => r.id === id);
    const { fv, link } = classifyRow(row);
    assert.equal(link.id, 'L3');
    const cell = fv.opponentPunishment?.completingCell;
    const grain = grainOf(fv.movestring, fv.player, cell, 'opp');
    assert.equal(grain, 'major', `${id}: expected the decision board's own grain to be 'major' (fixture assumption)`);
    assert.doesNotMatch(link.text, /next move/i);
    assert.match(link.text, /not yet reachable/i);
  });
}

// ── FR-012 / OI-195 remaining half a / T015 — L2's "occupy" verb never claims an empty square ───
// T022 (FR-014a) update: the template now names the conceded cell as "column N" prose, not the raw
// `cNrM` string, so this test's regex checks the CONCEDED CELL'S COLUMN NUMBER rather than the raw
// token — the underlying occupied/open-path guarantee (FR-012) is unchanged.
test('L2 corpus-wide: the "occupy" verb only fires when the conceded cell is occupied on the punishment half\'s own finalMovestring', () => {
  let checkedL2 = 0;
  const violations = [];
  for (const row of corpusRows) {
    if (!row.evidence || row.error) continue;
    let out;
    try { out = classifyRow(row); } catch { continue; }
    const { fv, link } = out;
    if (link.id !== 'L2') continue;
    checkedL2 += 1;
    const conceded = fv.opponentPunishment?.tie?.sharedCells?.[0] ?? fv.opponentPunishment?.completingCell;
    const occupied = cellOccupiedOn(fv.opponentPunishment?.finalMovestring, conceded);
    const concededCol = Number(/^c(\d+)r\d+$/.exec(conceded ?? '')?.[1]);
    const claimsOccupy = new RegExp(`occupy column ${concededCol}\\b`).test(link.text);
    const claimsOpenPath = new RegExp(`open a path to column ${concededCol}\\b`).test(link.text);
    if (occupied && !claimsOccupy) {
      violations.push(`${row.id}: column ${concededCol} (${conceded}) IS occupied on the punishment line but the frame doesn't say "occupy"`);
    }
    if (!occupied && !claimsOpenPath) {
      violations.push(`${row.id}: column ${concededCol} (${conceded}) is EMPTY on the punishment line but the frame doesn't say "open a path to"`);
    }
  }
  assert.ok(checkedL2 >= 5, `expected at least the 5 known L2-routed corpus records, got ${checkedL2}`);
  assert.deepEqual(violations, [], `FR-012 violations:\n${violations.join('\n')}`);
});

test('L2 (eval-33 and eval-45): the conceded cell is a live gravity-top threat, not yet occupied — "open a path to", not "occupy"', () => {
  for (const id of ['eval-33', 'eval-45']) {
    const row = corpusRows.find((r) => r.id === id);
    const { link } = classifyRow(row);
    assert.equal(link.id, 'L2', id);
    assert.doesNotMatch(link.text, /let the opponent occupy/i, id);
    assert.match(link.text, /open a path to/i, id);
  }
});

// ── FR-008 corpus-wide — L1's terminal-vs-future-tense branch, independently re-derived ─────────
test('L1 corpus-wide: a terminal best move is never narrated as a future threat', () => {
  let checkedL1 = 0;
  const violations = [];
  for (const row of corpusRows) {
    if (!row.evidence || row.error) continue;
    let out;
    try { out = classifyRow(row); } catch { continue; }
    const { fv, link } = out;
    if (link.id !== 'L1') continue;
    checkedL1 += 1;
    if (fv.bestCol == null) continue;
    const { colHeights } = parseBoardState(fv.movestring ?? '');
    const landingRow = colHeights[fv.bestCol];
    if (landingRow == null || landingRow >= 6) continue;
    const { board: afterBoard } = parseBoardState((fv.movestring ?? '') + String(fv.bestCol));
    const isTerminal = checkWin(afterBoard, landingRow, fv.bestCol, fv.player);
    if (isTerminal) {
      if (!/game is over/i.test(link.text)) violations.push(`${row.id}: terminal but no "game is over" statement`);
      if (/next move/i.test(link.text)) violations.push(`${row.id}: terminal but still narrates "next move"`);
    }
  }
  assert.ok(checkedL1 > 0, 'expected at least one corpus record routed to L1');
  assert.deepEqual(violations, [], `FR-008 violations:\n${violations.join('\n')}`);
});

// ══════════════════════════════════════════════════════════════════════════════════════════════
// US3 (spec 059) — T036. FR-014a (T022), FR-023 (T032), FR-025 (T034).
// ══════════════════════════════════════════════════════════════════════════════════════════════

const CNRM_RE = /\bc\d+r\d+\b/;

// ── FR-014a / OI-194 / T022 — L1/L2/L3/L4/L8 never leak a raw cNrM square into link.text ─────────
// Baseline before T022 (measured over all 63 corpus records, link.text): 51/63 carried a raw
// coordinate. T022's scope is L1/L2/L3/L4/L8 only (L5/L6/L9 are untouched — see the block comment
// above CAUSAL_LINKS and the handoff note); this sweep asserts the scoped set is now clean.
test('FR-014a corpus-wide: L1/L2/L3/L4/L8 link.text never contains a raw cNrM coordinate', () => {
  const SCOPED = new Set(['L1', 'L2', 'L3', 'L4', 'L8']);
  let checked = 0;
  const violations = [];
  for (const row of corpusRows) {
    if (!row.evidence || row.error) continue;
    let out;
    try { out = classifyRow(row); } catch { continue; }
    const { link } = out;
    if (!SCOPED.has(link.id)) continue;
    checked += 1;
    if (CNRM_RE.test(link.text)) violations.push(`${row.id} (${link.id}): "${link.text}"`);
  }
  assert.ok(checked >= 20, `expected at least 20 corpus records routed to L1/L2/L3/L4/L8, got ${checked}`);
  assert.deepEqual(violations, [], `FR-014a violations:\n${violations.join('\n')}`);
});

// ── Regression fix (2026-08-28, post-Epic-12 review) — a "column N" phrase must never be reused ──
// for two DIFFERENT cells within the same link.text frame. The T022/B1 conversion from raw cNrM to
// "column N" prose fixed OI-194 but introduced a new defect: two genuinely different squares sharing
// a column now collapse to the identical phrase, so the frame can read as self-contradictory.
// Measured, real output BEFORE this fix (L6, the only family with true corpus-wide collisions):
//   eval-11:  "a forced win via column 2 ... opponent force their own win via column 2"
//             (c2r5 vs c2r4 — two DIFFERENT cells in the SAME column)
// This is a *ground-truth* check, not a text-pattern guess: for every corpus record we independently
// re-derive, from the classified link's OWN fv fields (never from the rendered text), every cNrM cell
// the frame is expected to name, and assert that whenever two of them are genuinely different squares
// sharing a column, the rendered phrase distinguishes them (no bare "column N" reused for both).
function frameCellRefs(linkId, fv) {
  switch (linkId) {
    case 'L1': return [fv.lostResource?.completingCell, denialCell(fv.opponentPunishment)];
    case 'L2': return [
      fv.opponentPunishment?.tie?.sharedCells?.[0] ?? fv.opponentPunishment?.completingCell,
      denialCell(fv.lostResource),
    ];
    case 'L4': return [fv.lostResource?.completingCell];
    case 'L5': return [fv.lostResource?.completingCell, denialCell(fv.opponentPunishment)];
    case 'L6': return [fv.lostResource?.completingCell, fv.opponentPunishment?.completingCell];
    case 'L8': return [fv.lostResource?.completingCell, fv.opponentPunishment?.completingCell];
    default: return [];
  }
}
function cellCol(cell) { return /^c(\d+)r\d+$/.exec(cell ?? '')?.[1] ?? null; }

test('FR-014a corpus-wide (regression fix): link.text never repeats an identical bare "column N" ' +
     'phrase for two DIFFERENT cells named in the same frame', () => {
  let checked = 0;
  let checkedWithGenuineConflict = 0;
  const violations = [];
  for (const row of corpusRows) {
    if (!row.evidence || row.error) continue;
    let out;
    try { out = classifyRow(row); } catch { continue; }
    const { fv, link } = out;
    checked += 1;
    const cells = frameCellRefs(link.id, fv).filter(Boolean);
    for (let i = 0; i < cells.length; i++) {
      for (let j = i + 1; j < cells.length; j++) {
        if (cells[i] === cells[j]) continue; // same physical square — reuse is TRUE, not a violation
        if (cellCol(cells[i]) !== cellCol(cells[j])) continue; // different columns — no risk
        checkedWithGenuineConflict += 1;
        const n = cellCol(cells[i]);
        const disambiguated = new RegExp(`(lower|upper) square in column ${n}\\b`);
        if (!disambiguated.test(link.text)) {
          violations.push(`${row.id} (${link.id}): ${cells[i]} vs ${cells[j]} share column ${n} but ` +
            `link.text does not disambiguate them: "${link.text}"`);
        }
      }
    }
  }
  assert.ok(checked >= 60, `expected the full ~63-record corpus, got ${checked}`);
  assert.ok(checkedWithGenuineConflict >= 6,
    `expected at least the 6 known L6 same-column-different-cell records, got ${checkedWithGenuineConflict}`);
  assert.deepEqual(violations, [], `column-collapse violations:\n${violations.join('\n')}`);
});

// ── FR-023 / OI-189 / T032 — a causal/opening frame never introduces vocabulary its own record ───
// doesn't offer. Real producer traced to `openingFrame.mjs`'s `nameTag` (not `causalLinks.mjs` — the
// epic's own file citation for this task was stale; see the handoff note), reproduced on eval-13
// (2026-08-26 subset re-measure runs 1/3): the O2 (defense) lead sentence named every opening `the
// ${family}` even with no `id` to anchor it as a specific book citation, and the bare "the
// central-column opening" phrase read as offerable KB jargon — the model wrapped it in an unoffered
// `[term:central-column opening]` tag (zones.terms never carries opening-family names). Test kept
// here per T036's file assignment even though the fix landed in openingFrame.mjs.
test('FR-023 (eval-13): O2 with no id uses an indefinite article, not "the <family>"', () => {
  const row = corpusRows.find((r) => r.id === 'eval-13');
  // pruneVector drops null-valued keys, so the precondition is checked against the raw evidence.
  assert.equal(row.evidence.openingContext?.defense?.id, null, 'fixture precondition: eval-13 is an id-less O2 defense');
  const fv = pruneVector(toNarratorVector(row.evidence));
  const frame = composeOpeningFrame(fv);
  assert.equal(frame.id, 'O2');
  assert.doesNotMatch(frame.text, /\bthe central-column opening\b/);
  assert.match(frame.text, /\ba central-column opening\b/);
});

test('FR-023 corpus-wide: an id-less O2 defense never names its family with a definite article', () => {
  let checked = 0;
  const violations = [];
  for (const row of corpusRows) {
    if (!row.evidence || row.error) continue;
    const oc = row.evidence.openingContext;
    if (!oc?.defense || oc.defense.id !== null) continue;
    checked += 1;
    const fv = pruneVector(toNarratorVector(row.evidence));
    const frame = composeOpeningFrame(fv);
    const family = oc.defense.family;
    if (new RegExp(`\\bthe ${family}\\b`).test(frame.text)) {
      violations.push(`${row.id}: "the ${family}" (unanchored, definite article) in "${frame.text}"`);
    }
  }
  assert.ok(checked >= 4, `expected at least the 4 known id-less O2 corpus records, got ${checked}`);
  assert.deepEqual(violations, [], `FR-023 violations:\n${violations.join('\n')}`);
});

// ── FR-025 / OI-207 / T034 — a frame never denies locatability of a cell its own required set ────
// obliges the model to name. Fixed in openingFrame.mjs's `horizonTail` (shared helper: `denialCell`,
// imported from causalLinks.mjs, mirrors deriveRequiredSet's own `h.cell ?? h.completingCell`
// precedence). Verified here end-to-end through the real production pipeline
// (buildReasonRenderModel -> requiredSet) rather than re-deriving pinnability by hand (I12).
test('FR-025 (eval-9): the opening frame no longer denies locatability while requiredSet mandates two single squares', () => {
  const row = corpusRows.find((r) => r.id === 'eval-9');
  const nv = toNarratorVector(row.evidence);
  const model = buildReasonRenderModel(nv);
  const singleCellGroups = model.requiredSet.filter((g) => !g.spec.includes('windows:'));
  assert.ok(singleCellGroups.length >= 2, `expected eval-9's requiredSet to mandate >=2 single squares, got ${singleCellGroups.length}`);
  assert.doesNotMatch(model.frames[0].text, /too far to pin to a single square/i);
});

test('FR-025 corpus-wide: no opening frame denies locatability while its own requiredSet mandates a single square', () => {
  let checked = 0;
  const violations = [];
  for (const row of corpusRows) {
    if (!row.evidence || row.error || !row.evidence.openingContext) continue;
    checked += 1;
    let model;
    try { model = buildReasonRenderModel(toNarratorVector(row.evidence)); } catch { continue; }
    const openingFrameText = model.frames[0]?.text ?? '';
    const deniesLocatability = /too far to pin to a single square/i.test(openingFrameText);
    const hasSingleCellRequirement = (model.requiredSet ?? []).some((g) => !g.spec.includes('windows:'));
    if (deniesLocatability && hasSingleCellRequirement) {
      violations.push(`${row.id}: frame denies locatability but requiredSet mandates a single square`);
    }
  }
  assert.ok(checked >= 20, `expected at least 20 opening-context corpus records, got ${checked}`);
  assert.deepEqual(violations, [], `FR-025 violations:\n${violations.join('\n')}`);
});
