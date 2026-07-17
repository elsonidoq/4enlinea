// Unit tests for Allen T1–T7 threat-simplification detectors (server/allenTransforms.js).
//
// Spec: specs/044-puzzle-generation-correctness (User Story 4, T028, FR-018, SC-005).
//
// Every fixture below is sourced from its own KB entry's `worked_examples`/`false_positives`
// (docs/knowledge-base/allen-t1.md … allen-t7.md), with row/col converted from Allen's own
// 1-indexed numbering (used throughout the KB prose, e.g. "col4 row3") to this project's
// mandatory 0-indexed convention (row 0 = bottom, col 0 = leftmost — CLAUDE.md). Concretely:
// Allen col c / row r  →  { col: c - 1, row: r - 1 }.
//
// Where a KB `false_positives` entry has `movestring: PENDING` (no solver-verified board), the
// entry's own prose description is still used to build a synthetic threat-set fixture — per
// spec.md Edge Case 3, a threat set that does not correspond to a single coherent board is a
// valid input for these threat-set-in/out detectors, not an error case.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  RED,
  BLACK,
  t1_winner,
  t2_neutralized,
  t3_pairs,
  t3_pairs_minor,
  t4_applies,
  t5_applies,
  t6_worthless,
  t7_cancellations,
  simplifyThreats,
} from '../../server/allenTransforms.js';

describe('t1_winner — docs/knowledge-base/allen-t1.md', () => {
  test('worked example: Red adjacent major threats at col4 row3+row4 (movestring 502350542445136045)', () => {
    const threats = [
      { player: RED, col: 3, row: 2 },
      { player: RED, col: 3, row: 3 },
    ];
    assert.deepEqual(t1_winner(threats), { player: RED, col: 3 });
  });

  test('false positive: Red threats at col4 row3+row5 (rows differ by 2, NOT adjacent) — movestring 0004111444466662552525506', () => {
    const threats = [
      { player: RED, col: 3, row: 2 },
      { player: RED, col: 3, row: 4 },
    ];
    assert.equal(t1_winner(threats), null);
  });
});

describe('t2_neutralized — docs/knowledge-base/allen-t2.md', () => {
  test('worked example (sub-case 2): Black even col4 row4 undercuts Red odd col4 row5 (movestring 331324244556605142)', () => {
    const threats = [
      { player: BLACK, col: 3, row: 3 },
      { player: RED, col: 3, row: 4 },
    ];
    const result = [...t2_neutralized(threats)];
    assert.deepEqual(result, [{ player: RED, col: 3, row: 4 }]);
  });

  test('worked example (sub-case 1): Red even col4 row4 undercuts Black odd col4 row5 (movestring 012321300214001122)', () => {
    const threats = [
      { player: RED, col: 3, row: 3 },
      { player: BLACK, col: 3, row: 4 },
    ];
    const result = [...t2_neutralized(threats)];
    assert.deepEqual(result, [{ player: BLACK, col: 3, row: 4 }]);
  });

  test('false positive: Red same-player same-parity pair at col4 rows 3+5 — not opposite players (movestring 0004111444466662552525506)', () => {
    const threats = [
      { player: RED, col: 3, row: 2 },
      { player: RED, col: 3, row: 4 },
    ];
    assert.deepEqual(t2_neutralized(threats), new Set());
  });
});

describe('t3_pairs — docs/knowledge-base/allen-t3.md', () => {
  test('worked example: Red col4 row2+row5 T3 pair, Black co-threat col4 row3 (movestring 2001102102011226)', () => {
    const threats = [
      { player: RED, col: 3, row: 1 },
      { player: RED, col: 3, row: 4 },
      { player: BLACK, col: 3, row: 2 },
    ];
    assert.deepEqual(t3_pairs(threats), [{ col: 3, player: RED }]);
  });

  test('worked example: Black col4 row2+row5 T3 pair (movestring 0005406051411611225222)', () => {
    const threats = [
      { player: BLACK, col: 3, row: 1 },
      { player: BLACK, col: 3, row: 4 },
    ];
    assert.deepEqual(t3_pairs(threats), [{ col: 3, player: BLACK }]);
  });

  test('false positive (synthetic, KB false_positives entry is PENDING): same player row2+row4 — not row2+row5', () => {
    const threats = [
      { player: RED, col: 2, row: 1 },
      { player: RED, col: 2, row: 3 },
    ];
    assert.deepEqual(t3_pairs(threats), []);
  });

  test('t3_pairs_minor mirrors t3_pairs for a minor-threat set (Allen: "also applies to minor threats")', () => {
    const minorThreats = [
      { player: RED, col: 1, row: 1 },
      { player: RED, col: 1, row: 4 },
    ];
    assert.deepEqual(t3_pairs_minor(minorThreats), [{ col: 1, player: RED }]);
  });
});

describe('t4_applies — docs/knowledge-base/allen-t4.md', () => {
  test('worked example Case A: Red col4 row3+row5 (both odd, same column) — movestring 0004111444466662552525506', () => {
    const threats = [
      { player: RED, col: 3, row: 2 },
      { player: RED, col: 3, row: 4 },
    ];
    assert.equal(t4_applies(threats, 3), true);
  });

  test('worked example Case B: Red col4 row3 (odd) + Black col4 row5 (odd), opposite players — movestring 33104201250010221152', () => {
    const threats = [
      { player: RED, col: 3, row: 2 },
      { player: BLACK, col: 3, row: 4 },
    ];
    assert.equal(t4_applies(threats, 3), true);
  });

  test('false positive: Red threats at col2 row5 and col6 row5 — same parity but DIFFERENT columns (movestring 0110101556565)', () => {
    const threats = [
      { player: RED, col: 1, row: 4 },
      { player: RED, col: 5, row: 4 },
    ];
    assert.equal(t4_applies(threats, 1), false);
    assert.equal(t4_applies(threats, 5), false);
  });

  test('false positive: Red threats at col4 row1+row2 — same column but DIFFERENT parity/adjacent (movestring 061625051021)', () => {
    const threats = [
      { player: RED, col: 3, row: 0 },
      { player: RED, col: 3, row: 1 },
    ];
    assert.equal(t4_applies(threats, 3), false);
  });
});

describe('t5_applies — docs/knowledge-base/allen-t5.md', () => {
  test('worked example: Red col4 row3, Black col4 row6 (plus Black row4 / Red row5 co-threats) — movestring 100221001122001122', () => {
    const threats = [
      { player: RED, col: 3, row: 2 },
      { player: BLACK, col: 3, row: 3 },
      { player: RED, col: 3, row: 4 },
      { player: BLACK, col: 3, row: 5 },
    ];
    assert.equal(t5_applies(threats, 3), true);
  });

  test('worked example: Red col1 row3+row6, same player (movestring 123021133024412334311224)', () => {
    const threats = [
      { player: RED, col: 0, row: 2 },
      { player: RED, col: 0, row: 5 },
    ];
    assert.equal(t5_applies(threats, 0), true);
  });

  test('false positive (synthetic, KB false_positives entry is PENDING): opposite players rows 3+5 (same parity) is a T4 case, not T5', () => {
    const threats = [
      { player: RED, col: 3, row: 2 },
      { player: BLACK, col: 3, row: 4 },
    ];
    assert.equal(t5_applies(threats, 3), false);
  });
});

describe('t6_worthless — docs/knowledge-base/allen-t6.md', () => {
  test('worked example: Red isolated even-row threat at col3 row2 (movestring 30412536041)', () => {
    const threats = [{ player: RED, col: 2, row: 1 }];
    assert.deepEqual([...t6_worthless(threats)], [{ player: RED, col: 2, row: 1 }]);
  });

  test('worked example: Red even-row threat isolated from a Red odd-row threat in a different column (movestring 20202101145)', () => {
    const threats = [
      { player: RED, col: 0, row: 3 }, // even row (Allen row4), isolated
      { player: RED, col: 1, row: 2 }, // odd row (Allen row3), different column — irrelevant to this column's worthlessness
    ];
    const result = [...t6_worthless(threats)];
    assert.deepEqual(result, [{ player: RED, col: 0, row: 3 }]);
  });

  test('false positive (synthetic, KB false_positives entry is PENDING): T1 adjacent-pair exception — Red col4 row4(even)+row5(odd)', () => {
    const threats = [
      { player: RED, col: 4, row: 3 },
      { player: RED, col: 4, row: 4 },
    ];
    assert.deepEqual(t6_worthless(threats), new Set());
  });

  test('false positive (synthetic, KB false_positives entry is PENDING): T3 row2+row5 exception — Red col6 row2(even)+row5(odd)', () => {
    const threats = [
      { player: RED, col: 5, row: 1 },
      { player: RED, col: 5, row: 4 },
    ];
    assert.deepEqual(t6_worthless(threats), new Set());
  });
});

describe('t7_cancellations — docs/knowledge-base/allen-t7.md', () => {
  test('worked example: Red col1 row3 vs Black col7 row5, different columns — cancel (movestring 31243532145314235244552)', () => {
    const threats = [
      { player: RED, col: 0, row: 2 },
      { player: BLACK, col: 6, row: 4 },
    ];
    assert.deepEqual(t7_cancellations(threats), [
      [
        { player: RED, col: 0, row: 2 },
        { player: BLACK, col: 6, row: 4 },
      ],
    ]);
  });

  test('worked example: Red col1 row1 + col5 row1 vs Black col7 row5 — one cancellation, one Red threat survives (movestring 66162635)', () => {
    const threats = [
      { player: RED, col: 0, row: 0 },
      { player: RED, col: 4, row: 0 },
      { player: BLACK, col: 6, row: 4 },
    ];
    const result = t7_cancellations(threats);
    assert.equal(result.length, 1);
    assert.deepEqual(result[0], [
      { player: RED, col: 0, row: 0 },
      { player: BLACK, col: 6, row: 4 },
    ]);
  });

  test('false positive: two Red odd-row threats in the SAME column, no Black threat — no cancellation (movestring 0004111444466662552525506)', () => {
    const threats = [
      { player: RED, col: 3, row: 2 },
      { player: RED, col: 3, row: 4 },
    ];
    assert.deepEqual(t7_cancellations(threats), []);
  });
});

describe('simplifyThreats — T027 composition helper (FR-019)', () => {
  test('T1-decided board short-circuits: returns decidedBy and leaves the threat set untouched', () => {
    const threats = [
      { player: RED, col: 3, row: 2 },
      { player: RED, col: 3, row: 3 },
    ];
    const result = simplifyThreats(threats);
    assert.deepEqual(result.decidedBy, { rule: 'T1', winner: RED, col: 3 });
    assert.deepEqual(result.threats, threats);
  });

  test('T2 neutralization removes the neutralized threat from the simplified set', () => {
    const threats = [
      { player: BLACK, col: 3, row: 3 },
      { player: RED, col: 3, row: 4 },
    ];
    const result = simplifyThreats(threats);
    assert.deepEqual(result.threats, [{ player: BLACK, col: 3, row: 3 }]);
  });

  test('T6 worthlessness removes an isolated Red even-row threat from the simplified set', () => {
    const threats = [{ player: RED, col: 2, row: 1 }];
    const result = simplifyThreats(threats);
    assert.deepEqual(result.threats, []);
  });

  test('T7 cancellation removes both cancelled threats, leaving the uncancelled Red threat', () => {
    const threats = [
      { player: RED, col: 0, row: 0 },
      { player: RED, col: 4, row: 0 },
      { player: BLACK, col: 6, row: 4 },
    ];
    const result = simplifyThreats(threats);
    assert.deepEqual(result.threats, [{ player: RED, col: 4, row: 0 }]);
    assert.equal(result.t7Cancellations.length, 1);
  });
});
