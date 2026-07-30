// Spec 051 (Epic 1) US3 — which puzzle ids can actually resolve to a `puzzles` row server-side.
//
// ChallengeScreen mints two synthetic id shapes for boards that have no DB row:
//   - `dev-<movestring>`    — the DEV board injector (see `devFixtures.js#buildDevPuzzle`)
//   - `inline-<movestring>` — a lesson confirmation challenge (ALWAYS, see below)
//
// Lesson confirmation challenges are always synthetic, even when the lesson JSON carries an
// authored `confirmationChallenges[].puzzleId`. A lesson challenge *is* the whole puzzle — board,
// correct column and highlight metadata all live in the lesson file — so it has no `puzzles` row.
// The authored `puzzleId` is **authoring provenance**, not a runtime reference: the lesson editor
// stamps it (`AdminLessonEditorScreen.jsx`) and uses it to dedupe puzzles already added to a
// lesson (`PuzzlePickerModal.jsx`) and to display a short id (`PuzzlePickerRow.jsx`). It stays in
// the JSON for those tools; it must never travel on the /api/evaluate-move wire.
//
// Neither can be looked up, so neither may be sent as `puzzleId` on POST /api/evaluate-move: the
// stored-set grading branch would find no row. Boards in this state belong on the computed-live
// branch (FR-025), which is selected precisely by the *absence* of `puzzleId`.
//
// Lives in its own module rather than inside ChallengeScreen.jsx so it stays unit-testable without
// tripping the `react-refresh/only-export-components` rule that fires on a non-component export
// from a component file.

const SYNTHETIC_PUZZLE_ID_PREFIXES = ['dev-', 'inline-'];

/**
 * True when `id` is a locally-minted id with no corresponding `puzzles` row (or is missing
 * entirely). A nullish id counts as synthetic: there is nothing for the server to look up.
 */
export function isSyntheticPuzzleId(id) {
  if (id == null) return true;
  const s = String(id);
  return SYNTHETIC_PUZZLE_ID_PREFIXES.some(prefix => s.startsWith(prefix));
}
