// Spec 051 (Epic 1) T041 — a promoted puzzle row carries non-null `correct_cols` when the source
// candidate had one, on BOTH promotion routes (`POST /api/admin/candidates/:id/approve` and
// `POST /api/admin/candidates/approve-batch` in `server/index.js`).
//
// This file originally mirrored the routes' insert-object construction with a local copy, which a
// code-review pass correctly flagged as proving nothing: dropping `correct_cols` from either real
// route would not have failed it. It now imports the REAL builder,
// `server/promotePuzzleRow.js#buildPromotedPuzzleRow`, which both routes call — extracted for
// exactly this reason. The routes retain no field list of their own, so a regression there is a
// regression here.
//
// What this does and does not cover: the builder is the whole row shape, so a dropped/renamed
// column is caught. The `supabase.from('puzzles').insert(...)` call itself is not exercised
// (`server/index.js` exports no app and has no per-request supabase seam) — the remaining
// uncovered surface is only "does each route pass the builder's output to insert()", which is a
// single expression per route.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { buildPromotedPuzzleRow } from '../../server/promotePuzzleRow.js';

// Real candidate-row shapes (snake_case, as Supabase returns them). The movestrings are the
// solver-verified boards harvested for this feature's z_threat and figure_7 fixtures.
const Z_THREAT_CANDIDATE = {
  id: 'cand-1',
  category: 'z_threat',
  move_string: '33333555543222060200251661',
  status: 'pending',
  highlight_metadata: null,
  correct_col: 4,
  correct_cols: [4],
  category_evidence: {},
  highlight_cells: null,
};

// figure_7 is genuinely multi-column after this feature (FR-009), so correct_cols has 2 entries
// while correct_col holds the first — the FR-016a/FR-019 relationship.
const FIGURE_7_CANDIDATE = {
  id: 'cand-2',
  category: 'figure_7',
  move_string: '325655363345242660221551',
  status: 'pending',
  highlight_metadata: null,
  correct_col: 1,
  correct_cols: [1, 4],
  category_evidence: {},
  highlight_cells: null,
};

describe('buildPromotedPuzzleRow — T041 correct_cols propagation (both promotion routes)', () => {
  it('propagates a single-element correct_cols, as the :id/approve route calls it', () => {
    // Same arguments the single-approve route passes: its own derived predicate type and the
    // request's cooperative_ai_moves.
    const row = buildPromotedPuzzleRow(Z_THREAT_CANDIDATE, {
      goalPrompt: 'Play the z-threat column',
      goalPredicateType: 'z_threat',
      difficulty: 2,
      cooperativeAiMoves: [],
    });

    assert.notEqual(row.correct_cols, null, 'correct_cols must be non-null when the candidate had one');
    assert.deepEqual(row.correct_cols, [4]);
    assert.equal(row.correct_col, 4);
  });

  it('propagates a multi-element correct_cols, as the approve-batch route calls it', () => {
    // The batch route uses the candidate's own category as the predicate type and never sends
    // cooperative_ai_moves.
    const row = buildPromotedPuzzleRow(FIGURE_7_CANDIDATE, {
      goalPrompt: 'Find the figure-7 column',
      goalPredicateType: FIGURE_7_CANDIDATE.category,
      difficulty: 2,
    });

    assert.deepEqual(row.correct_cols, [1, 4], 'the full set must survive promotion, not just the first column');
    assert.equal(row.correct_col, 1, 'the legacy scalar is correct_cols[0] (FR-019)');
    assert.deepEqual(row.cooperative_ai_moves, [], 'defaults to [] for the batch route');
  });

  it('a candidate with no correct_cols promotes to NULL, not undefined or []', () => {
    // An un-backfilled candidate must land as SQL NULL — the "not yet computed" state the grading
    // handler's FR-024a fallback keys off. `undefined` would be dropped by PostgREST, and `[]`
    // would wrongly read as "the invariant rejected every column" (FR-016b).
    const row = buildPromotedPuzzleRow(
      { ...Z_THREAT_CANDIDATE, correct_col: null, correct_cols: null },
      { goalPrompt: 'x', goalPredicateType: 'z_threat', difficulty: 2 },
    );

    assert.equal(row.correct_cols, null);
    assert.equal(row.correct_col, null);
  });

  it('carries the rest of the row shape both routes depend on', () => {
    // Guards against the extraction having silently dropped a field either route used to set.
    const row = buildPromotedPuzzleRow(Z_THREAT_CANDIDATE, {
      goalPrompt: '  padded  '.trim(),
      goalPredicateType: 'z_threat',
      difficulty: '3',
      cooperativeAiMoves: [1, 2],
    });

    assert.equal(row.category, 'z_threat');
    assert.equal(row.move_string, Z_THREAT_CANDIDATE.move_string);
    assert.equal(row.goal_prompt, 'padded');
    assert.equal(row.goal_predicate_type, 'z_threat');
    assert.deepEqual(row.goal_predicate_params, {});
    assert.deepEqual(row.cooperative_ai_moves, [1, 2]);
    assert.equal(row.difficulty, 3, 'difficulty is coerced to a number');
    assert.equal(row.is_active, true);
    assert.equal(row.interaction_mode, 'single_move');
    assert.equal(row.highlight_metadata, null);
    assert.equal(row.highlight_cells, null);
    // 26 moves is even → P1 to move.
    assert.equal(row.user_player, 1);
    assert.deepEqual(row.simulation_trace, []);
  });

  it('forced_win promotes as a sequence puzzle', () => {
    const row = buildPromotedPuzzleRow(
      { ...Z_THREAT_CANDIDATE, category: 'forced_win' },
      { goalPrompt: 'x', goalPredicateType: 'forced_win', difficulty: 2 },
    );
    assert.equal(row.interaction_mode, 'sequence');
  });

  it('an odd-length movestring promotes with user_player 2', () => {
    const row = buildPromotedPuzzleRow(
      { ...Z_THREAT_CANDIDATE, move_string: '3333355554322206020025166' },
      { goalPrompt: 'x', goalPredicateType: 'z_threat', difficulty: 2 },
    );
    assert.equal(row.user_player, 2);
  });
});
