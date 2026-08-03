// T036 — Undercut and Overcut integration tests using real c4solver binary.
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createSolverProcess } from '../../server/c4solver-wrapper.js';
import { detectUndercutVictim, detectUndercutBeneficiary, detectOvercutVictim, detectOvercutBeneficiary, Board, classifyPattern, tagBlunder, minorThreatRowsInColumn } from '../../server/classifier.js';
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

describe('detectOvercutBeneficiary — structure and eval', () => {
  test('returns matched=false for empty board', async () => {
    const ms = '';
    const scores = await solver.query(ms);
    const result = detectOvercutBeneficiary(new Board(ms), scores);
    assert.equal(result.matched, false, 'empty board has no overcut');
  }, { timeout: 10_000 });

  test('when detectOvercutBeneficiary fires, highlightMetadata is structurally valid', async () => {
    const positions = ['654321065432', '01234560123456', '33443322'];
    for (const ms of positions) {
      const scores = await solver.query(ms);
      const result = detectOvercutBeneficiary(new Board(ms), scores);
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

// ── Spec 052 (Epic 2) T004/T005/T006 — characterization across the detectOvercut split ─────
// T004 captured today's (pre-fix) `detectOvercut(board, scores)` output for every reachable
// branch BEFORE the T005 split; this block now runs the SAME assertions against
// `detectOvercutBeneficiary` (the direct migration, per contracts C2) to confirm the split is
// behavior-preserving for the Beneficiary role, plus new coverage for `detectOvercutVictim`
// (T006 — the losing-mover predicate that has no pre-split equivalent to characterize; see
// contracts C1 / research.md D1 "Harvest gap").
//
// Diff recorded (I12): for all three original branches (same_parity_t4, active_forcing-labeled
// T5 gap [renamed t5_row3_row6, D38], chain_t2) and the empty board, `detectOvercutBeneficiary`'s
// output is BYTE-IDENTICAL to pre-split `detectOvercut`'s output except for the T5 branch's
// `reason` string (verified by direct comparison at implementation time) — the split introduced
// zero *behavior* change for the Beneficiary role, only the recorded D38 rename. `detectOvercutVictim`
// never matches any of those four boards (none of them is a losing-mover position) and correctly
// matches the new sixth harvested board below with reason `'t2_kill'`.
//
// Harvested movestrings per quickstart.md/tasks.md T004/T022 — never hand-constructed.
describe('detectOvercutBeneficiary/Victim — T004/T006 split characterization (spec 052)', () => {
  const SAME_PARITY_T4_MS = '26533454144531123345224155';
  const CHAIN_T2_MS       = '32640344326334662063620';
  // T006 — harvested via gameSampling.js's playGame (never hand-built), flagged UNVERIFIED
  // SKETCH — adapt if a future story needs a different shape: mover (Gray/O) owns a major threat
  // at col4 row5 (0-indexed col3 row4), the opponent (Green/X) owns a major threat at col4 row4
  // (0-indexed col3 row3) directly below it, no T4/T5/chain-T2 rescue applies (different parity,
  // not the {2,5} T5 pair, and no other mover threat sits below the killer), so the mover's
  // threat genuinely dies and scores[3] = -11 (losing for the mover).
  const VICTIM_NEW_MS = '4244522236352415160';

  test('same_parity_t4 board: Beneficiary matches with reason same_parity_t4, Victim does not match', async () => {
    const scores = await solver.query(SAME_PARITY_T4_MS);
    const ben = detectOvercutBeneficiary(new Board(SAME_PARITY_T4_MS), scores);
    assert.equal(ben.matched, true);
    assert.equal(ben.reason, 'same_parity_t4');
    assert.deepEqual(ben.cells, ['c7r4', 'c7r6']);
    assert.deepEqual(ben.correctCols, [6]);

    const vic = detectOvercutVictim(new Board(SAME_PARITY_T4_MS), scores);
    assert.equal(vic.matched, false, 'a beneficiary-shaped board must never match the victim detector');
  }, { timeout: 30_000 });

  test('chain_t2 board: Beneficiary matches with reason chain_t2, Victim does not match', async () => {
    const scores = await solver.query(CHAIN_T2_MS);
    const ben = detectOvercutBeneficiary(new Board(CHAIN_T2_MS), scores);
    assert.equal(ben.matched, true);
    assert.equal(ben.reason, 'chain_t2');
    assert.deepEqual(ben.cells, ['c2r3', 'c2r4']);
    assert.deepEqual(ben.correctCols, [1]);

    const vic = detectOvercutVictim(new Board(CHAIN_T2_MS), scores);
    assert.equal(vic.matched, false, 'a beneficiary-shaped board must never match the victim detector');
  }, { timeout: 30_000 });

  test('empty board: neither role matches', async () => {
    const scores = await solver.query('');
    const ben = detectOvercutBeneficiary(new Board(''), scores);
    const vic = detectOvercutVictim(new Board(''), scores);
    assert.equal(ben.matched, false);
    assert.equal(vic.matched, false);
    assert.deepEqual(ben.correctCols, []);
    assert.deepEqual(vic.correctCols, []);
  }, { timeout: 10_000 });

  test('T006 — detectOvercutVictim fires on the harvested losing-mover board; Beneficiary does not', async () => {
    const scores = await solver.query(VICTIM_NEW_MS);
    const board = new Board(VICTIM_NEW_MS);
    assert.ok(scores[3] < 0, 'sanity: entering the column must be losing for the mover');

    const vic = detectOvercutVictim(board, scores);
    assert.equal(vic.matched, true, 'the harvested board must be a genuine overcut-victim match');
    assert.equal(vic.reason, 't2_kill');
    const dead = vic.highlightMetadata.cells.find(c => c.role === 'dead_threat');
    const kill = vic.highlightMetadata.cells.find(c => c.role === 'killing_threat');
    assert.ok(dead && kill, 'must have both dead_threat and killing_threat cells');
    assert.ok(kill.row < dead.row, 'killing_threat row must sit below dead_threat row');
    assert.ok(
      (board.reachableThreats(board.currentPlayer).get(dead.column) ?? []).includes(dead.row),
      'the dead threat belongs to the side to move (the victim)',
    );
    assert.ok(
      (board.reachableThreats(3 - board.currentPlayer).get(kill.column) ?? []).includes(kill.row),
      'the killing threat belongs to the opponent (the beneficiary)',
    );

    const ben = detectOvercutBeneficiary(new Board(VICTIM_NEW_MS), scores);
    assert.equal(ben.matched, false, 'a victim-side board must never match the beneficiary detector — its column LOSES');
  }, { timeout: 30_000 });
});

// ── Spec 052 (Epic 2) T017–T022 — the full 5-mechanism overcut sub-case taxonomy ────────────
// FR-009/SC-003: each of the 5 documented mechanisms that rescue the mover's upper threat
// (minor-threat, T4 same-parity, T5 rows-3/6, chain-T2, active-forcing) gets its OWN dedicated
// counterexample board, exercised through the production `detectOvercutBeneficiary` — no board or
// hand-rolled proxy stands in for more than one case. T017/D38 renamed the T5 branch's reason
// from the misapplied `'active_forcing'` to `'t5_row3_row6'` and reserved `'active_forcing'` for
// the new gravity-top-adjacent branch (T021) that actually matches community-overcut.md's case
// (e). T020 added the `'minor_threat'` branch (research.md Decision D2 — structurally unreachable
// before this batch, since `board.reachableThreats` only returns MAJOR threats).
//
// All five movestrings below were harvested via `gameSampling.js`'s `playGame` (T5, minor_threat)
// or are the exact boards named in `docs/knowledge-base/community-overcut.md`'s `worked_examples`
// (same_parity_t4, chain_t2, active_forcing) — never hand-constructed.
describe('detectOvercutBeneficiary — 5-mechanism sub-case taxonomy (spec 052 US2, FR-009/SC-003)', () => {
  test('minor_threat: opponent has NO major threat below R, only a minor one — automatic rescue', async () => {
    // Harvested via playGame (seed 12345-derived rng). Mover (Green/X) has a major threat at
    // col2 row6 (0-indexed col1 row5); the opponent (Gray/O) has NO major threat anywhere in
    // col2, only a minor (2-disc) threat at col2 row4 (0-indexed row3), strictly below R. T2
    // cannot neutralize a minor threat by definition, so this is an automatic rescue — scr col2
    // (1-indexed) = +4.
    const ms = '4243134413363122662324';
    const scores = await solver.query(ms);
    const board = new Board(ms);
    assert.ok(scores[1] > 0, 'sanity: entering the column must be winning for the mover');

    const ben = detectOvercutBeneficiary(board, scores);
    assert.equal(ben.matched, true);
    assert.equal(ben.reason, 'minor_threat');
    assert.deepEqual(ben.correctCols, [1]);
    const major = ben.highlightMetadata.cells.find(c => c.role === 'major_threat');
    const neutralised = ben.highlightMetadata.cells.find(c => c.role === 'neutralised_threat');
    assert.ok(major && neutralised, 'must have both major_threat and neutralised_threat cells');
    assert.equal(major.row, 5, 'the mover\'s major threat is at 0-indexed row5 (col2 row6, 1-indexed)');
    assert.equal(neutralised.row, 3, 'the minor threat sits at 0-indexed row3 (col2 row4, 1-indexed)');
    // A threat cell is by definition EMPTY. `minorThreatRowsInColumn` originally walked all four
    // cells of each minor window — including its two placed discs — so it could name an occupied
    // cell as `neutralised_threat` (54.5% of matches across a 40k-board scan) and could match a
    // column whose only "minor row" was a disc below the column height. Asserting the row index
    // alone did not catch that; assert the cell is actually empty.
    assert.equal(board.board[neutralised.row][neutralised.column], 0,
      'neutralised_threat must name an EMPTY cell — a placed disc is not a threat');

    const vic = detectOvercutVictim(new Board(ms), scores);
    assert.equal(vic.matched, false, 'a beneficiary-shaped board must never match the victim detector');
  }, { timeout: 30_000 });

  test('minorThreatRowsInColumn returns only EMPTY cells, ascending (regression)', () => {
    // Boards where the helper previously returned rows of already-placed discs.
    for (const ms of ['4243134413363122662324', '43210232654064400543546203', '162326644335']) {
      const board = new Board(ms);
      for (const opponent of [1, 2]) {
        for (let col = 0; col < 7; col++) {
          const rows = minorThreatRowsInColumn(board, opponent, col, 6); // 6 = ROWS (not exported)
          for (const r of rows) {
            assert.equal(board.board[r][col], 0,
              `${ms}: minor-threat row ${r} in col ${col} must be an empty cell, not a placed disc`);
          }
          assert.deepEqual(rows, [...rows].sort((a, b) => a - b),
            `${ms}: rows must be ascending — the caller takes the last element as "nearest below R"`);
        }
      }
    }
  });

  test('same_parity_t4 (repeat coverage — see the T004/T006 block above for full assertions)', async () => {
    const ms = '26533454144531123345224155';
    const scores = await solver.query(ms);
    const ben = detectOvercutBeneficiary(new Board(ms), scores);
    assert.equal(ben.matched, true);
    assert.equal(ben.reason, 'same_parity_t4');
  }, { timeout: 30_000 });

  test('t5_row3_row6: {R, Rp} = {2, 5} (0-indexed) rescues despite opposite parity — T5 override', async () => {
    // Harvested via playGame (rng seed 999-derived). Mover (Green/X) has major threats at col5
    // row4 and row6 (1-indexed; 0-indexed rows 3 and 5); the opponent (Gray/O) has a major threat
    // at col5 row3 (1-indexed; 0-indexed row2), which pairs with the mover's 0-indexed row5 threat
    // as exactly Allen's {3, 6} (0-indexed {2, 5}) exception pair. scr col5 (1-indexed) = +3.
    const ms = '333332222402114530211115';
    const scores = await solver.query(ms);
    const board = new Board(ms);
    assert.ok(scores[4] > 0, 'sanity: entering the column must be winning for the mover');

    const ben = detectOvercutBeneficiary(board, scores);
    assert.equal(ben.matched, true);
    assert.equal(ben.reason, 't5_row3_row6', 'D38 renamed this branch away from the misapplied active_forcing label');
    assert.deepEqual(ben.correctCols, [4]);
    const major = ben.highlightMetadata.cells.find(c => c.role === 'major_threat');
    const neutralised = ben.highlightMetadata.cells.find(c => c.role === 'neutralised_threat');
    assert.ok(
      (major.row === 5 && neutralised.row === 2) || (major.row === 2 && neutralised.row === 5),
      'the T5 exception pair is exactly 0-indexed rows {2, 5}',
    );

    const vic = detectOvercutVictim(new Board(ms), scores);
    assert.equal(vic.matched, false, 'a beneficiary-shaped board must never match the victim detector');
  }, { timeout: 30_000 });

  test('chain_t2 (repeat coverage — see the T004/T006 block above for full assertions)', async () => {
    const ms = '32640344326334662063620';
    const scores = await solver.query(ms);
    const ben = detectOvercutBeneficiary(new Board(ms), scores);
    assert.equal(ben.matched, true);
    assert.equal(ben.reason, 'chain_t2');
  }, { timeout: 30_000 });

  test('active_forcing: gravity-top-adjacent shape (community-overcut.md case (e)) — the US2 fix', async () => {
    // community-overcut.md worked_examples: move 31, Yellow (Gray/O, the mover) to move. Column 3
    // has 3 empty cells (odd parity). Yellow has a major threat at col3 row5 (0-indexed row4);
    // Red (Green/X) has a major threat at col3 row4 (0-indexed row3), directly below and adjacent
    // (R === Rp + 1). Before this batch, NEITHER role matched this board (documented pre-fix gap,
    // OI-60) — this is the exact board that motivated US2.
    const ms = '2365213030023306446354465055546';
    const scores = await solver.query(ms);
    const board = new Board(ms);
    assert.ok(scores[2] > 0, 'sanity (community-overcut.md): scr col3 = +1, winning for the mover');

    const ben = detectOvercutBeneficiary(board, scores);
    assert.equal(ben.matched, true, 'US2 fix: this board must now match — it was the documented pre-fix gap');
    assert.equal(ben.reason, 'active_forcing');
    assert.deepEqual(ben.correctCols, [2]);
    const major = ben.highlightMetadata.cells.find(c => c.role === 'major_threat');
    const neutralised = ben.highlightMetadata.cells.find(c => c.role === 'neutralised_threat');
    assert.equal(major.row, 4, 'the mover\'s threat (0-indexed row4 = col3 row5, 1-indexed)');
    assert.equal(neutralised.row, 3, 'the blocked opponent threat (0-indexed row3 = col3 row4, 1-indexed)');
    assert.equal(major.row, neutralised.row + 1, 'active_forcing requires R immediately above Rp');

    const vic = detectOvercutVictim(new Board(ms), scores);
    assert.equal(vic.matched, false, 'a beneficiary-shaped board must never match the victim detector');
  }, { timeout: 30_000 });
});

// ── Spec 052 (Epic 2) T023 — the two documented community-overcut.md false positives ───────
// Both boards are named in community-overcut.md's `false_positives` section as cases where
// `is_overcut` (the KB's own formal_predicate) must return False. `detectOvercutBeneficiary` must
// not report a match (under `active_forcing` or any other reason) for either.
describe('detectOvercutBeneficiary — documented false positives must not match (spec 052 T023)', () => {
  test('331324244556605142: T2 legitimately fires (opposite parity, no T4/T5/chain/active-forcing rescue)', async () => {
    // community-overcut.md false_positives: Red (Green/X, the mover) has a major threat at col4
    // row5 (0-indexed row4); Yellow (Gray/O) has a major threat at col4 row4 (0-indexed row3),
    // directly below and adjacent — the IDENTICAL local geometric shape as the active_forcing
    // true positive above (adjacent, odd column parity) — yet every column scores -12: the
    // mover LOSES regardless. This is exactly why `isActiveForcing` alone is insufficient and
    // `detectOvercutCore` additionally requires `scores[col] > 0` (see the code comment on
    // `isActiveForcing`) — without that extra check this board would misfire as active_forcing.
    const ms = '331324244556605142';
    const scores = await solver.query(ms);
    const board = new Board(ms);
    assert.ok(scores[3] < 0, 'sanity (community-overcut.md): all columns score -12, mover loses');

    const ben = detectOvercutBeneficiary(board, scores);
    assert.equal(ben.matched, false, 'active_forcing must not backfire on this board — the KB\'s own false positive');
    assert.deepEqual(ben.correctCols, []);

    // The board legitimately IS a t2_kill victim — confirms this false positive is not simply
    // "no overcut anywhere", it's specifically "not a rescue" (see D2/D38 doc comments).
    const vic = detectOvercutVictim(new Board(ms), scores);
    assert.equal(vic.matched, true, 'this column is a genuine, unrescued T2 kill for the mover');
    assert.equal(vic.reason, 't2_kill');
  }, { timeout: 30_000 });

  test('10231405030112342031435: mutual [*]-contested row — active-forcing must not backfire', async () => {
    // community-overcut.md false_positives: Yellow (Gray/O, the mover) has a major threat at col3
    // row5 (0-indexed row4); Red (Green/X) has major threats at BOTH col3 row4 (0-indexed row3,
    // below) AND col3 row5 (0-indexed row4, mutual with Yellow's own threat — a [*] cell). If
    // Yellow tries the active-forcing sequence, Red wins immediately by completing their own
    // row5 threat first. scr col3 (1-indexed) = -9; Yellow actually wins via col7.
    const ms = '10231405030112342031435';
    const scores = await solver.query(ms);
    const board = new Board(ms);
    assert.ok(scores[2] < 0, 'sanity (community-overcut.md): scr col3 = -9, losing for the mover');

    const ben = detectOvercutBeneficiary(board, scores);
    assert.equal(ben.matched, false, 'active_forcing must not backfire on the mutually-contested row');
    assert.deepEqual(ben.correctCols, []);
  }, { timeout: 30_000 });
});

// ── Spec 052 (Epic 2) T007 — Phase-C-level regression: classifyPattern's 'overcut' entry ────
// must call detectOvercutVictim, not Beneficiary. A bare detectOvercutVictim unit test cannot
// catch a correct function wired to the wrong call site, so this runs the full tagBlunder
// pipeline on a real, harvested blunder board (via gameSampling.js's harvestBlunders — never
// hand-built) and asserts the tagged cells genuinely belong to the blunderer.
//
// '33341302254244423366' (blunderer Green/P1 plays col 5 instead of the correct col 6): after
// playing correctCol, classifyPattern(moves + correctCol, blunderer, solver) evaluates the
// post-move board, where the side to move is the OPPONENT (Gray) — detectOvercutVictim resolves
// its own role from board.currentPlayer, so on this board the opponent is the reported "victim"
// (their own threat dies) and the blunderer holds the killing_threat that neutralises it. That is
// exactly the "the undercut/overcut you just landed" reading for the player who just moved
// (research.md D1) — the killing_threat cell must belong to the blunderer.
describe('tagBlunder Phase C — overcut cells belong to the blunderer (spec 052 T007)', () => {
  const MOVES = '33341302254244423366';
  const PLAYED_COL = 5;
  const CORRECT_COL = 6;

  test('tagBlunder tags this real blunder as overcut, and the killing_threat cell is the blunderer\'s own', async () => {
    const tag = await tagBlunder(MOVES, PLAYED_COL, CORRECT_COL, solver);
    assert.equal(tag.tag, 'overcut', 'fixture must exercise the overcut MISSED_OWN branch');
    assert.equal(tag.direction, 'missed_own');

    const blunderer = MOVES.length % 2 === 0 ? 1 : 2; // even move count → Red/Green opens
    const boardAfterCorrect = new Board(MOVES + CORRECT_COL);
    const patterns = await classifyPattern(MOVES + CORRECT_COL, blunderer, solver);
    const overcut = patterns.get('overcut');
    assert.ok(overcut, 'classifyPattern must report an overcut match on the post-move board');

    const killCellStr = overcut.cells[0]; // e.g. 'c6r3' — lower of the two cells, per role ordering
    const [, colStr, rowStr] = killCellStr.match(/^c(\d+)r(\d+)$/);
    const killCol = Number(colStr) - 1;
    const killRow = Number(rowStr) - 1;
    assert.ok(
      (boardAfterCorrect.reachableThreats(blunderer).get(killCol) ?? []).includes(killRow),
      'the killing_threat cell must belong to the blunderer, not the opponent — this is the ' +
      'wrong-player defect OI-76/spec 052 US1 exists to fix',
    );
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
