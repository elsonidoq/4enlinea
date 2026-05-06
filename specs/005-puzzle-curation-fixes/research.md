# Research: Puzzle Curation & Classifier Fixes

## R-001: c4solver output format — does it ever echo the move string?

**Decision**: The `GeneratorSolver` (candidate-generator.js) already handles both formats with `parts.length === 8 ? parts.slice(1) : parts`. The move-string echo only occurs when the book is NOT loaded (`-nb` flag or no book file). The generator always loads the book (`-b 7x6.book`), so it never echoes. `Connect4Solver` in index.js uses `-a` (no book) and always echoes.

**Rationale**: Confirmed by reading both constructors. The shared wrapper must always use the book path to guarantee 7 scores with no echo; callers that need depth-limited scoring (the `queryDepth` path in index.js) spawn a separate child process and are outside the shared persistent-process model.

**Alternatives considered**: Stripping the move string echo at parse time regardless (the existing `parts.length === 8` check) — but normalising at the wrapper level is cleaner and removes the ambiguity.

**Behavioral note**: Replacing `Connect4Solver` in `index.js` with the shared wrapper (which always loads the book) upgrades the `/api/scores` endpoint from iterative-deepening to O(1) book-based lookups for all in-book positions. This is intentional and an improvement — the book covers the full game tree. Existing tests may observe different (more accurate) score values for positions the book resolves; this is expected and correct, not a regression.

## R-002: DB schema changes needed for `highlight_cells` and `debug_trace`

**Decision**: Add two nullable JSONB columns to the `candidates` table: `highlight_cells jsonb` and `debug_trace jsonb`. A new migration file `009_curation_fixes.sql` covers this. No separate tables needed (per spec assumption: data volume per record is small).

**Rationale**: Both fields are tightly coupled to the candidate record; separate tables would add JOIN overhead for no benefit.

**Alternatives considered**: Storing as TEXT with JSON.stringify — rejected; JSONB gives indexing and query capability if needed later.

## R-003: Cat 5 PV trace — solver call count at generation time

**Decision**: At most K=6 solver calls per Cat 5 candidate (one per PV ply). The depth filter `R ≤ 6` guarantees the loop terminates in ≤ 6 iterations. This is acceptable at generation time; the curation view reads `highlight_cells` directly with zero solver calls.

**Rationale**: Generation is a background batch job; a few extra solver calls per candidate is negligible. The depth filter also reduces Cat 5 yield but ensures the highlights are short enough to be reviewable.

**Alternatives considered**: Pre-computing highlight_cells from score arithmetic alone — not possible for Cat 5 because we need to trace actual game moves.

## R-004: `countWinningThreats` signature difference between classifier.js and candidate-generator.js

**Decision**: `classifier.js` exports `countWinningThreats(board, colHeights, player)` which uses `colHeights` to find the next empty row. The Cat 4 highlight algorithm (FR-015a) needs this function from inside `candidate-generator.js`. Since the generator already imports from `classifier.js`, it should import `countWinningThreats` from there. Similarly, `checkWin` from `classifier.js` is needed for Cat 4 and Cat 6.

**Rationale**: Avoids duplicating board utilities across files. The generator already imports `classify` from `classifier.js`.

**Alternatives considered**: Copying the functions into candidate-generator.js — rejected; violates constitution principle II (no duplication without reason).

## R-005: React keyboard event for Escape in RejectModal

**Decision**: Add a `useEffect` in `RejectModal` that listens for `keydown` and calls `onClose` when `e.key === 'Escape'`. Clean up on unmount.

**Rationale**: Standard pattern; no library needed.

## R-006: Category name map location

**Decision**: `CATEGORY_NAMES` already exists in `CandidateDashboard.jsx`. Add an identical (or imported) map in `CurationWorkspace.jsx` to display the name next to the category number.

**Rationale**: Both components need it; keeping it co-located in each file avoids creating a shared constants file for a single 7-entry object. If it grows, extract to a constants module in a future iteration.

## R-007: "Delete all pending" API endpoint — does it already exist?

**Decision**: The endpoint `POST /api/admin/candidates/reject-batch` exists in `index.js` (called by `handleRejectAll` in `CandidateDashboard`). Only the label and confirmation text in the UI need to change; no backend changes required.

## R-008: Skip action — client-side only or server API change?

**Decision**: Skip is purely client-side: advance the local index without making any API call. The candidate remains in "pending" state in the DB by definition (no status update is sent). No backend changes required.

**Rationale**: The spec explicitly states "the skipped candidate still has status 'pending'" — this is the default when no approve/reject is called.

## R-009: Cat 1 board-level `checkWin` — does the helper accept a partially applied board?

**Decision**: `checkWin(board, row, col, player)` in `classifier.js` checks all four directions from `(row, col)`. It requires the piece to already be placed on the board at that position. The fix in `classify()` must: (1) parse the board, (2) place the piece at `(colHeights[candidateCol], candidateCol)`, (3) call `checkWin`, (4) remove the piece. The `parseBoardState` function already exists in `classifier.js`.

## R-010: Minimum move count — what replaces the current hardcoded 10?

**Decision**: Per spec FR-011, draw `minMoves = 10 + Math.floor(rng() * 21)` which gives a uniform integer in [10, 30] — wait, the spec says `randint(14, 34)` (inclusive). Current code has `minMoves = 10` and `maxMoves = category <= 2 ? 16 : 24`. The new logic: draw `minMoves = 14 + Math.floor(rng() * 21)` → range [14, 34]. `maxMoves` must be at least `minMoves`; set `maxMoves = Math.max(minMoves, category <= 2 ? 20 : 34)` so that there is always a valid range. A candidate whose final `moveString.length < minMoves` is discarded.

**Rationale**: The spec says "discard any candidate that does not meet it." The rollout already stops early on a win — so we check length after the fact.
