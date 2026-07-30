// Builds the `puzzles` row inserted when a curated candidate is promoted.
//
// Extracted so the two admin promotion routes in `server/index.js`
// (`POST /api/admin/candidates/:id/approve` and `POST /api/admin/candidates/approve-batch`) share
// ONE definition of the row shape instead of two hand-maintained copies. They were duplicated, and
// a column added to one but not the other is invisible — `puzzles` has no NOT NULL constraint on
// the columns that matter here, so a forgotten field inserts as NULL and the puzzle simply serves
// wrong (spec 051's `correct_cols` was exactly this hazard, and `docs/architecture/data-model.md`
// §"Where puzzle/candidate answer columns are written" exists because of it).
//
// This is also what makes `tests/integration/promoteCorrectCols.test.js` meaningful: it can assert
// against the real builder both routes use, rather than a copy that can silently drift from them.
//
// The two routes differ in only two fields, both passed in explicitly:
//   - `goalPredicateType` — the single-approve route derives it from the request's predicate type;
//     the batch route uses the candidate's own category.
//   - `cooperativeAiMoves` — supplied by the single-approve route; always `[]` for the batch route.

/**
 * @param {object} candidate  the `candidates` row being promoted (snake_case, straight from Supabase)
 * @param {object} opts
 * @param {string} opts.goalPrompt           already-trimmed prompt text
 * @param {string} opts.goalPredicateType
 * @param {number|string} opts.difficulty
 * @param {Array} [opts.cooperativeAiMoves]
 * @returns {object} the object to pass to `supabase.from('puzzles').insert(...)`
 */
export function buildPromotedPuzzleRow(candidate, { goalPrompt, goalPredicateType, difficulty, cooperativeAiMoves = [] }) {
  return {
    category: candidate.category,
    move_string: candidate.move_string,
    goal_prompt: goalPrompt,
    goal_predicate_type: goalPredicateType,
    goal_predicate_params: {},
    cooperative_ai_moves: cooperativeAiMoves,
    difficulty: Number(difficulty),
    is_active: true,
    interaction_mode: candidate.category === 'forced_win' ? 'sequence' : 'single_move',
    highlight_metadata: candidate.highlight_metadata ?? null,
    // Spec 051: the stored answer set, and the legacy scalar kept in sync alongside it (FR-017 —
    // deliberately NOT dropped in that feature). Both come from the candidate row as written at
    // generation time; neither is recomputed here.
    correct_col: candidate.correct_col ?? null,
    correct_cols: candidate.correct_cols ?? null,
    highlight_cells: candidate.highlight_cells ?? null,
    // 0-indexed convention: an even-length movestring means P1 is to move.
    user_player: candidate.move_string.length % 2 === 0 ? 1 : 2,
    simulation_trace: candidate.category_evidence?.simulation_trace ?? [],
  };
}
