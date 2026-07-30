// T036 — Undercut and Overcut integration tests using real c4solver binary.
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createSolverProcess } from '../../server/c4solver-wrapper.js';
import { detectUndercutVictim, detectUndercutBeneficiary, detectOvercut, Board, classifyPattern } from '../../server/classifier.js';
import { checkUndercutPredicate, checkOvercutPredicate } from '../../server/candidate-generator.js';
import { evaluatePredicate } from '../../server/predicates.js';

let solver;
before(() => { solver = createSolverProcess(); });
after(() => { solver.destroy(); });

describe('detectUndercutVictim — structure and eval', () => {
  test('returns matched=false for empty board', async () => {
    const ms = '';
    const scores = await solver.query(ms);
    const result = detectUndercutVictim(new Board(ms), scores);
    assert.equal(result.matched, false, 'empty board has no undercut');
  }, { timeout: 10_000 });

  test('when detectUndercutVictim fires, highlightMetadata is structurally valid', async () => {
    const positions = ['654321065432', '01234560123456', '33443322'];
    for (const ms of positions) {
      const scores = await solver.query(ms);
      const result = detectUndercutVictim(new Board(ms), scores);
      if (result.matched) {
        const hm = result.highlightMetadata;
        assert.equal(hm.type, 'cells');
        assert.ok(Array.isArray(hm.cells));
        assert.equal(hm.cells.length, 2, 'undercut has exactly 2 highlight cells');

        const killing = hm.cells.find(c => c.role === 'killing_threat');
        const dead = hm.cells.find(c => c.role === 'dead_threat');
        assert.ok(killing, 'must have killing_threat cell');
        assert.ok(dead, 'must have dead_threat cell');
        assert.equal(killing.column, dead.column, 'both cells must be in same column');
        assert.ok(killing.row < dead.row, 'killing_threat row must be below dead_threat row');

        // undercut column must have negative solver score (playing there is losing)
        assert.ok(scores[killing.column] < 0, 'undercut column must have negative score');
        break;
      }
    }
  }, { timeout: 30_000 });
});

// ── OI-74 — the undercut has two sides, and each is anchored on the side to move ──────────
//
// Both movestrings below are harvested, not hand-built:
//   33211553350634544   — the OI-74 repro position (Gray to move, scores[2] = -12)
//   2501222544566432114 — lesson-11-undercut's socratic board (Gray to move, scores[3] = +11)
// Solver scores are queried live here rather than pasted, so the fixtures cannot drift.
describe('undercut — victim vs beneficiary (OI-74)', () => {
  const VICTIM_MS      = '33211553350634544';
  const BENEFICIARY_MS = '2501222544566432114';

  test('detectUndercutVictim fires on the victim board and NOT on the beneficiary board', async () => {
    const vBoard = new Board(VICTIM_MS);
    const vScores = await solver.query(VICTIM_MS);
    const v = detectUndercutVictim(vBoard, vScores);
    assert.equal(v.matched, true, 'victim board must match the victim detector');
    const kill = v.highlightMetadata.cells.find(c => c.role === 'killing_threat');
    const dead = v.highlightMetadata.cells.find(c => c.role === 'dead_threat');
    // Gray (the mover) owns the dying threat; Green owns the killer underneath it.
    assert.ok(vScores[kill.column] < 0, 'entering the column must lose for the mover');
    assert.ok(
      (vBoard.reachableThreats(vBoard.currentPlayer).get(dead.column) ?? []).includes(dead.row),
      'the dead threat belongs to the side to move (the victim)',
    );
    assert.ok(
      (vBoard.reachableThreats(3 - vBoard.currentPlayer).get(kill.column) ?? []).includes(kill.row),
      'the killing threat belongs to the opponent (the beneficiary)',
    );

    const bScores = await solver.query(BENEFICIARY_MS);
    assert.equal(
      detectUndercutVictim(new Board(BENEFICIARY_MS), bScores).matched, false,
      'a beneficiary-side board must never match the victim detector — its column WINS',
    );
  }, { timeout: 30_000 });

  test('detectUndercutBeneficiary fires on the beneficiary board and NOT on the victim board', async () => {
    const bBoard = new Board(BENEFICIARY_MS);
    const bScores = await solver.query(BENEFICIARY_MS);
    const b = detectUndercutBeneficiary(bBoard, bScores);
    assert.equal(b.matched, true, 'lesson-11 socratic board must match the beneficiary detector');
    const kill = b.highlightMetadata.cells.find(c => c.role === 'killing_threat');
    const dead = b.highlightMetadata.cells.find(c => c.role === 'dead_threat');
    assert.ok(bScores[kill.column] > 0, 'pressing the column must WIN for the mover');
    assert.equal(dead.row, kill.row + 1, 'Allen-T2 sub-case 3: the pair is immediately adjacent');
    // Roles are mirrored relative to the victim case: the mover owns the killer.
    assert.ok(
      (bBoard.reachableThreats(bBoard.currentPlayer).get(kill.column) ?? []).includes(kill.row),
      'the killing threat belongs to the side to move (the beneficiary)',
    );
    assert.ok(
      (bBoard.reachableThreats(3 - bBoard.currentPlayer).get(dead.column) ?? []).includes(dead.row),
      'the dead threat belongs to the opponent (the victim)',
    );

    const vScores = await solver.query(VICTIM_MS);
    assert.equal(
      detectUndercutBeneficiary(new Board(VICTIM_MS), vScores).matched, false,
      'a victim-side board must never match the beneficiary detector — its column LOSES',
    );
  }, { timeout: 30_000 });

  test('the killer search scans every lower threat, not just the lowest', async () => {
    // On the lesson board Gray holds threats at rows 3 and 4 (0-indexed) of column 3 and Green
    // holds one at row 5. The LOWEST Gray threat (row 3) is same-parity with Green's (T4 — it
    // does not kill); the one at row 4 is the adjacent T2 killer. Stopping at the lowest
    // candidate — the original `find(rp => rp < R)` — missed this shape entirely.
    const board = new Board(BENEFICIARY_MS);
    const scores = await solver.query(BENEFICIARY_MS);
    const kill = detectUndercutBeneficiary(board, scores)
      .highlightMetadata.cells.find(c => c.role === 'killing_threat');
    const moverRows = board.reachableThreats(board.currentPlayer).get(kill.column) ?? [];
    assert.ok(moverRows.length > 1, 'fixture must have more than one candidate killer to be meaningful');
    assert.ok(
      moverRows.some(r => r < kill.row),
      'the chosen killer must NOT be the lowest candidate, or this test proves nothing',
    );
  }, { timeout: 30_000 });

  test('classifyPattern returns the same undercut for both perspectives', async () => {
    // The OI-74 defect: `perspective` selected whose threats to read while the score gate kept
    // reading the MOVER's score, so the same column matched twice with opposite owners.
    // undercut ownership is fixed by who is to move, so both perspectives must agree.
    const red    = await classifyPattern(VICTIM_MS, 1, solver);
    const yellow = await classifyPattern(VICTIM_MS, 2, solver);
    assert.deepEqual(
      red.get('undercut'), yellow.get('undercut'),
      'undercut cells must not depend on the requested perspective',
    );
    assert.deepEqual(
      yellow.get('undercut')?.cells, ['c3r3', 'c3r4'],
      'and must be the mover-as-victim reading (Green kills at c3r3, Gray dies at c3r4)',
    );
  }, { timeout: 30_000 });
});

describe('detectOvercut — structure and eval', () => {
  test('returns matched=false for empty board', async () => {
    const ms = '';
    const scores = await solver.query(ms);
    const result = detectOvercut(new Board(ms), scores);
    assert.equal(result.matched, false, 'empty board has no overcut');
  }, { timeout: 10_000 });

  test('when detectOvercut fires, highlightMetadata is structurally valid', async () => {
    const positions = ['654321065432', '01234560123456', '33443322'];
    for (const ms of positions) {
      const scores = await solver.query(ms);
      const result = detectOvercut(new Board(ms), scores);
      if (result.matched) {
        const hm = result.highlightMetadata;
        assert.equal(hm.type, 'cells');
        assert.ok(Array.isArray(hm.cells));
        assert.equal(hm.cells.length, 2, 'overcut has exactly 2 highlight cells');

        const neutralised = hm.cells.find(c => c.role === 'neutralised_threat');
        const major = hm.cells.find(c => c.role === 'major_threat');
        assert.ok(neutralised, 'must have neutralised_threat cell');
        assert.ok(major, 'must have major_threat cell');
        assert.equal(neutralised.column, major.column, 'both cells must be in same column');
        assert.ok(neutralised.row < major.row, 'neutralised_threat row must be below major_threat row');

        // overcut column must have positive solver score (playing there is winning)
        assert.ok(scores[major.column] > 0, 'overcut column must have positive score');
        break;
      }
    }
  }, { timeout: 30_000 });
});

describe('checkUndercutPredicate — end-to-end', () => {
  test('returns passes=false for empty board', async () => {
    const ms = '';
    const scores = await solver.query(ms);
    const result = checkUndercutPredicate(ms, scores);
    assert.equal(result.passes, false);
    assert.deepEqual(result.correctCols, []);
  }, { timeout: 10_000 });

  test('structure is valid when passes=true', async () => {
    const positions = ['654321065432', '01234560123456', '33443322'];
    for (const ms of positions) {
      const scores = await solver.query(ms);
      const result = checkUndercutPredicate(ms, scores);
      if (result.passes) {
        assert.ok(result.correctCols.length >= 1, 'must have at least one correct col');
        assert.equal(result.correct_col, null, 'correct_col must be null for undercut');
        assert.equal(result.highlight_metadata.type, 'cells');
        const killing = result.highlight_metadata.cells.find(c => c.role === 'killing_threat');
        assert.ok(killing, 'must have killing_threat in highlight_metadata');
        assert.ok(!result.correctCols.includes(killing.column), 'killing_threat col must not be in correctCols');
        break;
      }
    }
  }, { timeout: 30_000 });
});

describe('checkOvercutPredicate — end-to-end', () => {
  test('returns passes=false for empty board', async () => {
    const ms = '';
    const scores = await solver.query(ms);
    const result = checkOvercutPredicate(ms, scores);
    assert.equal(result.passes, false);
    assert.deepEqual(result.correctCols, []);
  }, { timeout: 10_000 });

  test('structure is valid when passes=true', async () => {
    const positions = ['654321065432', '01234560123456', '33443322'];
    for (const ms of positions) {
      const scores = await solver.query(ms);
      const result = checkOvercutPredicate(ms, scores);
      if (result.passes) {
        assert.ok(result.correctCols.length >= 1);
        assert.equal(result.correct_col, null, 'correct_col must be null for overcut');
        assert.equal(result.highlight_metadata.type, 'cells');
        const major = result.highlight_metadata.cells.find(c => c.role === 'major_threat');
        assert.ok(major, 'must have major_threat in highlight_metadata');
        assert.ok(result.correctCols.includes(major.column), 'major_threat col must be in correctCols');
        break;
      }
    }
  }, { timeout: 30_000 });
});

// ── Spec 051 Epic 1 US2 (T026/T027) — undercut relative solver-safety floor ─────────────────
// Harvested via playGame (never hand-constructed); scores queried live at test time so this
// fixture cannot drift. '333330654544210414405513' is a genuine LOST-POSITION undercut board
// (every legal column scores negative): killing_threat sits at column 6 (0-indexed), the
// solver-optimal (slowest-loss) columns are {0, 1, 2} (score -6), and non-killing column 5
// (score -8) concedes strictly worse than that optimum — exactly the OI-61 item 1 defect
// (checkUndercutPredicate/evalUndercut used to mark every non-killing column "correct" with no
// score check at all).
describe('undercut — relative solver-safety floor (T024/T025/T026/T027)', () => {
  const MS = '333330654544210414405513';

  test('T026 red-first: a non-killing column that concedes worse than the board optimum is excluded/rejected', async () => {
    const scores = await solver.query(MS);
    const board = new Board(MS);
    const result = detectUndercutVictim(board, scores);
    assert.equal(result.matched, true, 'fixture must be a real undercut match');
    const killingCol = result.highlightMetadata.cells.find(c => c.role === 'killing_threat').column;
    assert.notEqual(killingCol, 5, 'sanity: col 5 must be rejected for the FLOOR, not because it is the killing column');

    const check = checkUndercutPredicate(MS, scores);
    assert.ok(
      !check.correctCols.includes(5),
      'col 5 concedes strictly worse than the board optimum and must not enter the generation-time answer set',
    );
    assert.ok(check.correctCols.length >= 1, 'the safe non-killing columns must still be present');

    const puzzle = { id: 1, category: 'undercut', moveString: MS, highlightMetadata: check.highlight_metadata };
    const evalResult = evaluatePredicate(puzzle, 5, scores);
    assert.equal(evalResult.result, 'wrong', 'evalUndercut must reject a floor-violating non-killing column on the grading path');
  }, { timeout: 30_000 });

  test('T027 regression: a LOST-POSITION board still accepts the slowest-loss non-killing column (relative floor, not absolute)', async () => {
    const scores = await solver.query(MS);
    const legal = [0, 1, 2, 5, 6].filter(c => scores[c] > -1000);
    assert.ok(legal.every(c => scores[c] < 0), 'fixture must be a fully-lost position for this regression to be meaningful');

    const check = checkUndercutPredicate(MS, scores);
    assert.ok(
      check.correctCols.includes(0),
      'col 0 is among the slowest losses (tied-optimal at -6) and must still pass generation despite a negative score',
    );

    const puzzle = { id: 1, category: 'undercut', moveString: MS, highlightMetadata: check.highlight_metadata };
    const evalResult = evaluatePredicate(puzzle, 0, scores);
    assert.equal(evalResult.result, 'correct', 'evalUndercut must accept the slowest-loss column under the relative floor, not reject every negative-score column');
  }, { timeout: 30_000 });
});

describe('evalUndercut — from highlightMetadata', () => {
  test('non-killing col returns correct', () => {
    const puzzle = {
      id: 99, category: 'undercut', moveString: '334455221100',
      highlightMetadata: {
        type: 'cells',
        cells: [
          { column: 3, row: 2, role: 'killing_threat' },
          { column: 3, row: 4, role: 'dead_threat' },
        ],
      },
    };
    const result = evaluatePredicate(puzzle, 0, []);
    assert.equal(result.result, 'correct');
  });

  test('killing col returns wrong', () => {
    const puzzle = {
      id: 99, category: 'undercut', moveString: '334455221100',
      highlightMetadata: {
        type: 'cells',
        cells: [
          { column: 3, row: 2, role: 'killing_threat' },
          { column: 3, row: 4, role: 'dead_threat' },
        ],
      },
    };
    const result = evaluatePredicate(puzzle, 3, []);
    assert.equal(result.result, 'wrong');
  });

  test('missing highlightMetadata returns wrong', () => {
    const puzzle = { id: 99, category: 'undercut', moveString: '334455221100', highlightMetadata: null };
    const result = evaluatePredicate(puzzle, 0, []);
    assert.equal(result.result, 'wrong');
  });
});

describe('evalOvercut — from highlightMetadata', () => {
  test('major_threat col returns correct', () => {
    const puzzle = {
      id: 99, category: 'overcut', moveString: '33445522110033',
      highlightMetadata: {
        type: 'cells',
        cells: [
          { column: 4, row: 1, role: 'neutralised_threat' },
          { column: 4, row: 3, role: 'major_threat' },
        ],
      },
    };
    const result = evaluatePredicate(puzzle, 4, []);
    assert.equal(result.result, 'correct');
    assert.equal(result.correctCol, 4);
  });

  test('non-major col returns wrong', () => {
    const puzzle = {
      id: 99, category: 'overcut', moveString: '33445522110033',
      highlightMetadata: {
        type: 'cells',
        cells: [
          { column: 4, row: 1, role: 'neutralised_threat' },
          { column: 4, row: 3, role: 'major_threat' },
        ],
      },
    };
    const result = evaluatePredicate(puzzle, 0, []);
    assert.equal(result.result, 'wrong');
    assert.equal(result.correctCol, 4);
  });

  test('missing highlightMetadata returns wrong', () => {
    const puzzle = { id: 99, category: 'overcut', moveString: '33445522110033', highlightMetadata: null };
    const result = evaluatePredicate(puzzle, 4, []);
    assert.equal(result.result, 'wrong');
  });
});
