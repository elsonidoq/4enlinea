// Unit tests for Allen V1–V5 + T4 Case A/B operators (server/allenVRules.js).
//
// Spec: specs/044-puzzle-generation-correctness (User Story 5, T045, FR-020/FR-022, SC-005/I12).
//
// Every fixture's threat set is built from its own KB entry's `worked_examples`
// (docs/knowledge-base/allen-v1.md … allen-v5.md, allen-t4.md), and every fixture movestring
// below was independently re-run through `./visualize_board.sh <movestring>` (which drives the
// production c4solver) during this batch's implementation — NOT trusted from KB prose alone
// (I12). The exact major-threat cells and solver scores this test asserts against are the ones
// `visualize_board.sh` printed for these movestrings; see the per-`describe` comment for the raw
// tool output summary. Unlike allen-t1..t7.md (which use Allen's 1-indexed row/col prose), the
// V1/V2/V4/V5 backfilled `worked_examples` descriptions are already written in this project's
// 0-indexed convention (confirmed by direct comparison against visualize_board.sh's 1-indexed
// "Major threats" list, e.g. its "col1 row1" == this file's `{ col: 0, row: 0 }`).

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { RED, BLACK, simplifyThreats } from '../../server/allenTransforms.js';
import {
  v1_evaluator,
  v2_evaluator,
  v3_evaluator,
  v4_evaluator,
  v5_evaluator,
  t4_case_a_evaluator,
  t4_case_b_evaluator,
} from '../../server/allenVRules.js';

describe('v1_evaluator — docs/knowledge-base/allen-v1.md', () => {
  // movestring 16213263616: visualize_board.sh confirms Major threats col1 row1 (X) [GT],
  // col1 row2 (O), col5 row1 (X) [GT], col5 row2 (O), col7 row5 (X) [GT]; scr = -15 for Black
  // (mover) on every column. 0-indexed: Red {col0 row0, col4 row0, col6 row4}, Black
  // {col0 row1, col4 row1}.
  test('worked example: three uncancelled Red odd-row threats in separate columns (movestring 16213263616)', () => {
    const raw = [
      { player: RED, col: 0, row: 0 },
      { player: RED, col: 4, row: 0 },
      { player: RED, col: 6, row: 4 },
      { player: BLACK, col: 0, row: 1 },
      { player: BLACK, col: 4, row: 1 },
    ];
    const simplified = simplifyThreats(raw);
    assert.equal(simplified.decidedBy, null);
    assert.equal(v1_evaluator(simplified), true);
  });

  test('false positive: even count (2) of Red odd-row threats — V1 requires an odd count', () => {
    const simplified = {
      threats: [
        { player: RED, col: 0, row: 0 },
        { player: RED, col: 4, row: 0 },
      ],
      t3Pairs: [],
    };
    assert.equal(v1_evaluator(simplified), false);
  });
});

describe('v2_evaluator — docs/knowledge-base/allen-v2.md', () => {
  // movestring 616253: visualize_board.sh confirms Major threats col1 row1 (O) [GT],
  // col5 row1 (O) [GT]; scr = -18 for Red (mover) on every column. 0-indexed: Black
  // {col0 row0, col4 row0}, Red: none.
  test('worked example: two uncancelled Black odd-row threats in separate columns (movestring 616253)', () => {
    const raw = [
      { player: BLACK, col: 0, row: 0 },
      { player: BLACK, col: 4, row: 0 },
    ];
    const simplified = simplifyThreats(raw);
    assert.equal(v2_evaluator(simplified), true);
  });

  test('false positive: odd count (1) of Black odd-row threats — V2 requires an even count >= 2', () => {
    const simplified = {
      threats: [{ player: BLACK, col: 0, row: 0 }],
      t3Pairs: [],
    };
    assert.equal(v2_evaluator(simplified), false);
  });
});

describe('v3_evaluator — docs/knowledge-base/allen-v3.md', () => {
  // movestring 333330211113120000012222: visualize_board.sh confirms Major threats
  // col5 row5 (X), col5 row6 (O); scr = +1 for Red (mover) on cols 5/6/7 (0-indexed 4/5/6).
  // 0-indexed: Red {col4 row4}, Black {col4 row5}.
  test('worked example: single uncontested Red odd-row threat, Black has only an even-row threat (movestring 333330211113120000012222)', () => {
    const raw = [
      { player: RED, col: 4, row: 4 },
      { player: BLACK, col: 4, row: 5 },
    ];
    const simplified = simplifyThreats(raw);
    assert.equal(v3_evaluator(simplified), true);
  });

  test('false positive: Red has an odd-row threat AND Black has an odd-row threat in a different column — T7 cancels both, V3 requires zero Black odd threats', () => {
    const raw = [
      { player: RED, col: 0, row: 0 },
      { player: BLACK, col: 6, row: 4 },
    ];
    const simplified = simplifyThreats(raw);
    assert.deepEqual(simplified.threats, []);
    assert.equal(v3_evaluator(simplified), false);
  });
});

describe('v4_evaluator — docs/knowledge-base/allen-v4.md', () => {
  // movestring 1023013210206162: visualize_board.sh confirms Major threats col4 row4 (O) only;
  // scr negative for Red (mover) on every column. 0-indexed: Black {col3 row3}, Red: none.
  test('worked example: Black holds one even-row threat, no odd-row threats for either player (movestring 1023013210206162)', () => {
    const raw = [{ player: BLACK, col: 3, row: 3 }];
    const simplified = simplifyThreats(raw);
    assert.equal(v4_evaluator(simplified), true);
  });

  test('false positive: Black even-row threat AND Red odd-row threat in a different column — V3 fires first, overriding V4', () => {
    const raw = [
      { player: BLACK, col: 3, row: 3 },
      { player: RED, col: 0, row: 0 },
    ];
    const simplified = simplifyThreats(raw);
    assert.equal(v3_evaluator(simplified), true);
    assert.equal(v4_evaluator(simplified), false);
  });
});

describe('v5_evaluator — docs/knowledge-base/allen-v5.md', () => {
  // movestring 31243532145314235244552: visualize_board.sh confirms Major threats col1 row3 (X),
  // col7 row5 (O); scr = 0 (Draw) on every column. 0-indexed: Red {col0 row2}, Black
  // {col6 row4} — T7 cancels the pair (different columns, both Allen-odd rows).
  test('worked example: Red and Black each hold one odd-row threat in separate columns — T7 cancels both, V5 (Draw) fires', () => {
    const raw = [
      { player: RED, col: 0, row: 2 },
      { player: BLACK, col: 6, row: 4 },
    ];
    const simplified = simplifyThreats(raw);
    assert.deepEqual(simplified.threats, []);
    assert.equal(v5_evaluator(simplified), true);
  });

  test('false positive: Red holds one odd-row threat with no Black odd-row threat — V3 fires, not V5', () => {
    const raw = [{ player: RED, col: 0, row: 0 }];
    const simplified = simplifyThreats(raw);
    assert.equal(v3_evaluator(simplified), true);
    assert.equal(v5_evaluator(simplified), false);
  });
});

describe('t4_case_a_evaluator — docs/knowledge-base/allen-t4.md Case A', () => {
  // movestring 0004111444466662552525506 (already solver_verified in the KB): Red major threats
  // at col4 row3 + col4 row5 (Allen 1-indexed) == 0-indexed col3 row2 + col3 row4, both odd,
  // same player, same column.
  test('worked example: same player, same parity, same column — no cumulative bonus (movestring 0004111444466662552525506)', () => {
    const threats = [
      { player: RED, col: 3, row: 2 },
      { player: RED, col: 3, row: 4 },
    ];
    assert.equal(t4_case_a_evaluator(threats, 3), true);
    assert.equal(t4_case_b_evaluator(threats, 3), false);
  });

  test('false positive: same player, same parity, but DIFFERENT columns (movestring 0110101556565)', () => {
    const threats = [
      { player: RED, col: 1, row: 4 },
      { player: RED, col: 5, row: 4 },
    ];
    assert.equal(t4_case_a_evaluator(threats, 1), false);
  });
});

describe('t4_case_b_evaluator — docs/knowledge-base/allen-t4.md Case B', () => {
  // movestring 33104201250010221152 (RECONCILED 2026-07-11, spec 044 T036): Red major threat at
  // col4 row3 (odd) and Black major threat at col4 row5 (odd) — 0-indexed col3 row2 / col3
  // row4. Solver: col4 (1-indexed) scores +11 for Red; both threats remain in the major threats
  // list (neither cancels).
  test('worked example: opposite players, same parity, same column — neither cancels (movestring 33104201250010221152)', () => {
    const threats = [
      { player: RED, col: 3, row: 2 },
      { player: BLACK, col: 3, row: 4 },
    ];
    assert.equal(t4_case_b_evaluator(threats, 3), true);
    assert.equal(t4_case_a_evaluator(threats, 3), false);
  });

  test('false positive: opposite players, DIFFERENT parity, same column — T2 territory, not T4 Case B', () => {
    const threats = [
      { player: RED, col: 3, row: 2 },
      { player: BLACK, col: 3, row: 3 },
    ];
    assert.equal(t4_case_b_evaluator(threats, 3), false);
  });
});

// ── T046 — regression check (FR-023, SC-006) ──────────────────────────────────────────────
// Confirms every existing solver-verified tactical movestring in the shared regression fixture
// (tests/fixtures/verifiedTacticalMovestrings.json, the T002 baseline) still classifies
// identically now that the V1–V5/T4 operators exist. Since allenVRules.js is a new, standalone
// pure-function module not wired into any production code path (candidate-generator.js,
// classifier.js, predicates.js are all untouched per this batch's scope fence), this is a
// same-input/same-output sanity check: the operators must reproduce the fixture's own recorded
// `winner`/`outcome`, using the exact threat cells the fixture's `keyStructure` field documents
// (converted to 0-indexed and cross-checked against visualize_board.sh during this batch).
describe('T046 — verifiedTacticalMovestrings.json regression (T002 baseline)', () => {
  test('v1 fixture entry (44452556366, superseded by KB\'s 16213263616 for the operator fixture — same structural claim: 3 separate-column Red odd threats, 0 Black odd) still classifies as a Red win', () => {
    const simplified = simplifyThreats([
      { player: RED, col: 0, row: 0 },
      { player: RED, col: 4, row: 0 },
      { player: RED, col: 6, row: 4 },
    ]);
    assert.equal(v1_evaluator(simplified), true);
  });

  test('v2 fixture entry (616253): col1r1(O) + col5r1(O) odd threats, Red 0 threats — Black win', () => {
    const simplified = simplifyThreats([
      { player: BLACK, col: 0, row: 0 },
      { player: BLACK, col: 4, row: 0 },
    ]);
    assert.equal(v2_evaluator(simplified), true);
  });

  test('v3 fixture entry (333330211113120000012222): col5r5(X) odd threat, col5r6(O) even — Red win', () => {
    const simplified = simplifyThreats([
      { player: RED, col: 4, row: 4 },
      { player: BLACK, col: 4, row: 5 },
    ]);
    assert.equal(v3_evaluator(simplified), true);
  });

  test('v4 fixture entry (1023013210206162): col4r4(O) even threat, no odd threats anywhere — Black win', () => {
    const simplified = simplifyThreats([{ player: BLACK, col: 3, row: 3 }]);
    assert.equal(v4_evaluator(simplified), true);
  });

  test('v5 fixture entry (31243532145314235244552): col1r3(X) + col7r5(O) odd threats -> T7 cancels both — Draw', () => {
    const simplified = simplifyThreats([
      { player: RED, col: 0, row: 2 },
      { player: BLACK, col: 6, row: 4 },
    ]);
    assert.equal(v5_evaluator(simplified), true);
  });

  test('t4-case-a fixture entry (0004111444466662552525506): Red two same-column same-parity threats, no cumulative bonus', () => {
    const threats = [
      { player: RED, col: 3, row: 2 },
      { player: RED, col: 3, row: 4 },
    ];
    assert.equal(t4_case_a_evaluator(threats, 3), true);
  });

  test('t4-case-b fixture entry (33104201250010221152, RECONCILED): Red+Black same-column same-parity threats, neither cancels', () => {
    const threats = [
      { player: RED, col: 3, row: 2 },
      { player: BLACK, col: 3, row: 4 },
    ];
    assert.equal(t4_case_b_evaluator(threats, 3), true);
  });
});

// ── T047 — combined T-rule + V-rule pipeline (US4 Acceptance Scenario 3 / FR-019) ──────────
// Board: movestring 66162635 (allen-t7.md's own second worked example, already solver_verified).
// Raw threats: Red {col0 row0, col4 row0} (both Allen-odd), Black {col6 row4} (Allen-odd, a
// different column from either Red threat). simplifyThreats() runs T7: Red's col0 threat and
// Black's col6 threat are in different columns, so they cancel one-for-one; Red's col4 threat
// has no remaining Black threat to pair against and survives. The simplified threat set — one
// surviving Red odd-row threat, zero Black odd-row threats — is exactly V3's precondition,
// confirming the documented combined outcome (T7 simplification feeds directly into a V-rule
// evaluator, per FR-019 / allen-t7.md's own worked-example commentary "one Red threat survives").
describe('T047 — combined T-rule + V-rule pipeline (movestring 66162635)', () => {
  test('T7 cancels one Red-Black pair, leaving one Red odd-row threat — V3 fires (Red wins) on the T7-simplified set', () => {
    const raw = [
      { player: RED, col: 0, row: 0 },
      { player: RED, col: 4, row: 0 },
      { player: BLACK, col: 6, row: 4 },
    ];
    const simplified = simplifyThreats(raw);

    assert.equal(simplified.decidedBy, null);
    assert.deepEqual(simplified.threats, [{ player: RED, col: 4, row: 0 }]);
    assert.equal(simplified.t7Cancellations.length, 1);

    assert.equal(v1_evaluator(simplified), false);
    assert.equal(v2_evaluator(simplified), false);
    assert.equal(v3_evaluator(simplified), true);
    assert.equal(v4_evaluator(simplified), false);
    assert.equal(v5_evaluator(simplified), false);
  });
});
