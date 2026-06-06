// Tests for explainSimulate.js group-related additions (T01a, T01, T02, T03).
// Uses node:test + node:assert/strict (project convention — no Jest).
//
// Tests 1 and 5 are integration-style (call explainSimulate with a mock solver).
// Tests 2, 3, 4 use synthetic leaf arrays passed directly to aggregateLeaves.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { explainSimulate, aggregateLeaves } from './explainSimulate.js';
import { findMajorThreatWindows } from './llmCoachHelpers.js';
import { Board } from './classifier.js';

// ---------------------------------------------------------------------------
// Mock solver — returns all zeros for every position.
// ---------------------------------------------------------------------------

const mockSolver = {
  query: async () => [0, 0, 0, 0, 0, 0, 0],
};

// ---------------------------------------------------------------------------
// Acceptance quick-check for T01a — findMajorThreatWindows
// ---------------------------------------------------------------------------

describe('findMajorThreatWindows (T01a acceptance)', () => {
  test('returns empty array for sparse position "34"', () => {
    const board = new Board('34');
    const result = findMajorThreatWindows(board, 1);
    assert.equal(Array.isArray(result), true);
    assert.equal(result.length, 0);
  });

  test('returns 3-player windows for a 3-in-a-row diagonal', () => {
    // Build a board where Red (1) has a diagonal 3-in-a-row with 1 empty cell.
    // We place Red at: (r=0,c=0), (r=1,c=1), (r=2,c=2).
    // The diagonal window (r=0-3,c=0-3) would have 3 Reds + 1 empty at (r=3,c=3).
    // Movestring: 1,3,0,3,0,3 = Red in col 0,1,2; Yellow in col 3
    // Wait, let me think more carefully about a real movestring.
    //
    // Actually let me use a direct board construction for a quick smoke test
    // of findMajorThreatWindows specifically.
    const grid = Array.from({ length: 6 }, () => Array(7).fill(0));
    // Place 3 Red discs in a diagonal:
    grid[0][0] = 1; // c1r1
    grid[1][1] = 1; // c2r2
    grid[2][2] = 1; // c3r3
    // (3,3) is empty — so window (0,0)-(1,1)-(2,2)-(3,3) is a major threat for Red
    const fakeBoard = { board: grid };
    const result = findMajorThreatWindows(fakeBoard, 1);
    assert.ok(result.length >= 1);
    // At least one window should have 3 reds + 1 empty (owner='player')
    const playerWindows = result.filter(g => g.owner === 'player');
    assert.ok(playerWindows.length >= 1);
    // One of them should be the diagonal window
    const diagWin = playerWindows.find(g =>
      g.cells.includes('c1r1') &&
      g.cells.includes('c2r2') &&
      g.cells.includes('c3r3') &&
      g.cells.includes('c4r4')
    );
    assert.ok(diagWin, 'Expected diagonal major threat window [c1r1,c2r2,c3r3,c4r4]');
  });
});

// ---------------------------------------------------------------------------
// T01 acceptance — findWinningGroup via collectLeaves terminal output
// ---------------------------------------------------------------------------

describe('Won leaf produces groups (T01/T03 test 1)', () => {
  test('explainSimulate returns groups with completed entry for a won position', async () => {
    // Movestring '1212121' (0-indexed: cols 1,2,1,2,1,2,1):
    //  Red in col 1 on turns 1,3,5,7 → rows 0,1,2,3 → vertical win for Red
    //  Yellow in col 2 on turns 2,4,6 → rows 0,1,2
    const ms = '1212121';
    const perspective = 1; // Red
    const anchorCell = { col: 0, row: 3 }; // last Red disc in col 1 at row 3
    // numPlies=0, position is already terminal (won_by_perspective)
    const result = await explainSimulate(ms, 0, anchorCell, perspective, mockSolver);

    // Should have groups as a Map
    assert.ok(result.groups instanceof Map, 'groups should be a Map');
    // A won leaf should have at least 1 completed entry
    let foundCompleted = false;
    for (const [, entry] of result.groups) {
      if (entry.completed_freq > 0) {
        foundCompleted = true;
        // The winning line: vertical in col 1 (0-indexed), rows 0-3 (0-indexed)
        // Corresponds to 1-indexed: col 2, rows 1-4 → c2r1..c2r4
        assert.deepEqual(entry.cells, ['c2r1', 'c2r2', 'c2r3', 'c2r4']);
        assert.equal(entry.owner, 'player');
      }
    }
    assert.ok(foundCompleted, 'Expected at least one completed group entry');
  });
});

// ---------------------------------------------------------------------------
// Test 2 — Draw leaf produces groups (synthetic data)
// ---------------------------------------------------------------------------

describe('Draw leaf produces groups (T03 test 2)', () => {
  test('aggregateLeaves correctly accumulates draw_threat groups', () => {
    const syntheticLeaves = [
      {
        leafType: 'draw',
        patterns: null,
        currentPlayer: 1,
        groups: [
          { cells: ['c3r2', 'c4r2', 'c5r2', 'c6r2'], owner: 'player', type: 'draw_threat' },
          { cells: ['c3r2', 'c4r2', 'c5r2', 'c6r2'], owner: 'opponent', type: 'draw_threat' },
        ],
      },
    ];
    const result = aggregateLeaves(syntheticLeaves, { col: 0, row: 0 }, 1, []);
    assert.ok(result.groups instanceof Map);
    // Should have 2 entries (same cells, different owners)
    assert.equal(result.groups.size, 2);

    // Check frequencies: 1 draw leaf out of 1 total → draw_freq = 1.0
    for (const [, entry] of result.groups) {
      assert.equal(entry.draw_freq, 1.0);
      assert.equal(entry.completed_freq, 0);
    }
  });
});

// ---------------------------------------------------------------------------
// Test 3 — total_leaves denominator (synthetic data)
// ---------------------------------------------------------------------------

describe('total_leaves denominator (T03 test 3)', () => {
  test('totalLeaves equals sum of all leaf types', () => {
    const syntheticLeaves = [
      { leafType: 'won_by_perspective', patterns: null, currentPlayer: 1, groups: [] },
      { leafType: 'won_by_opponent', patterns: null, currentPlayer: 1, groups: [] },
      { leafType: 'draw', patterns: null, currentPlayer: 1, groups: [] },
      { leafType: 'depth_limit', patterns: null, currentPlayer: 1, groups: [] },
      { leafType: 'depth_limit', patterns: null, currentPlayer: 2, groups: [] },
      // perspectiveLeaves (currentPlayer === perspective && patterns !== null)
      { leafType: 'depth_limit', patterns: [], currentPlayer: 1, groups: [] },
      { leafType: 'intermediate', patterns: [], currentPlayer: 1, groups: [] },
    ];
    const result = aggregateLeaves(syntheticLeaves, { col: 0, row: 0 }, 1, []);
    assert.equal(result.totalLeaves, 7);
    assert.equal(result.outcomes.total, 7);
    // Verify individual counters
    assert.equal(result.outcomes.wonByPerspective, 1);
    assert.equal(result.outcomes.wonByOpponent, 1);
    assert.equal(result.outcomes.draws, 1);
    assert.equal(result.outcomes.perspectiveLeaves, 2); // 2 classified leaves where currentPlayer === 1
  });
});

// ---------------------------------------------------------------------------
// Test 4 — Separate records for different owners (synthetic data)
// ---------------------------------------------------------------------------

describe('Separate records for different owners (T03 test 4)', () => {
  test('same 4-window with different owners produces two Map entries', () => {
    const cells = ['c3r2', 'c4r2', 'c5r2', 'c6r2'];
    const syntheticLeaves = [
      {
        leafType: 'draw',
        patterns: null,
        currentPlayer: 1,
        groups: [
          { cells, owner: 'player', type: 'draw_threat' },
          { cells, owner: 'opponent', type: 'draw_threat' },
        ],
      },
    ];
    const result = aggregateLeaves(syntheticLeaves, { col: 0, row: 0 }, 1, []);
    assert.equal(result.groups.size, 2);

    // Verify both entries exist with correct owners
    const keys = [...result.groups.keys()];
    const owners = keys.map(k => k.split(':')[1]).sort();
    assert.deepEqual(owners, ['opponent', 'player']);

    // Verify AggregatedGroup shape (no completedCount/drawCount artifacts)
    for (const [, entry] of result.groups) {
      assert.ok(Array.isArray(entry.cells));
      assert.match(entry.owner, /^(player|opponent)$/);
      assert.equal(typeof entry.completed_freq, 'number');
      assert.equal(typeof entry.draw_freq, 'number');
      assert.equal(entry.completedCount, undefined);
      assert.equal(entry.drawCount, undefined);
    }
  });
});

// ---------------------------------------------------------------------------
// Test 5 — Sparse fixture "34" (integration through explainSimulate)
// ---------------------------------------------------------------------------

describe('Sparse fixture "34" (T03 test 5)', () => {
  test('explainSimulate on "34" runs without errors and returns groups Map', async () => {
    const ms = '34';
    const perspective = 1; // Red to move (2 discs → currentPlayer = 1)
    const anchorCell = { col: 4, row: 0 }; // last move in col 4 (0-indexed)
    const numPlies = 2;

    const result = await explainSimulate(ms, numPlies, anchorCell, perspective, mockSolver);

    assert.ok(result.groups instanceof Map);
    assert.equal(typeof result.totalLeaves, 'number');
    assert.ok(result.totalLeaves > 0);
    // For a sparse 2-disc position with no threats, groups should be empty
    assert.equal(result.groups.size, 0);
    // Verify existing fields are still present
    assert.ok(result.patterns);
    assert.ok(result.outcomes);
    assert.ok(result.timing);
  });
});
