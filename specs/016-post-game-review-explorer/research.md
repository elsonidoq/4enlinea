# Research: Post-Game Review & Position Explorer (Epic 3b)

## Decision 1: Blunders `pattern_category` CHECK constraint migration

**Decision**: A new migration (027) is required to add `'unknown'` to the `blunders.pattern_category` CHECK constraint before FR-011 blunder writes can be exercised.

**Rationale**: Migration 013 (`013_category_cleanup.sql`) set the current constraint to:
`CHECK (pattern_category IN ('immediate_threat','forced_block','double_threat','forced_win','forbidden_columns'))`.
Game-analysis blunders may come from positions where `patternTag` is `null` (no classifier match). FR-011 requires coercing these to `'unknown'`. Without the migration, the DB INSERT would violate the constraint and be rejected.

**Implementation**: Drop and re-add the constraint via:
```sql
ALTER TABLE public.blunders DROP CONSTRAINT IF EXISTS blunders_pattern_category_check;
ALTER TABLE public.blunders ADD CONSTRAINT blunders_pattern_category_check
  CHECK (pattern_category IN ('immediate_threat','forced_block','double_threat',
    'forced_win','forbidden_columns','z_threat','claimeven','undercut','overcut',
    'figure_7','j_shape','unknown'));
```
Including all current valid category slugs plus `'unknown'`. This migration must also re-add newer slugs (z_threat, claimeven, etc.) that were added after migration 013.

**Alternatives considered**: Client-side filter to only write blunders where `patternTag` is non-null — rejected because FR-011 explicitly requires capturing all blunders (with 'unknown' as sentinel).

---

## Decision 2: `POST /api/games/analyze` implementation approach

**Decision**: The endpoint iterates over the movestring character by character, keeping a running `Board` state. For each user ply (determined by `side`), it calls `solver.query(movesBeforeThisPly)` to get the 7 scores, then calls `scoreMove(scores, col)` from `moveQualityScorer.js`. Forced-move detection is done inline: count scores that are `> INVALID_MOVE` (not `-1000`); if exactly 1, the move is forced and excluded from `scored`.

**Rationale**: `moveQualityScorer.js` is already the canonical shared scorer module (`scoreMove` exported). The solver persistent process is the right integration point — NOT spawning one-shot processes (too slow for 20+ moves). The solver query must be for the movestring *before* the ply being scored (the position at which that move was made).

**Parity**: `side='first'` → user plies are at 0-indexed positions 0, 2, 4, … in the full movestring. `side='second'` → user plies are at positions 1, 3, 5, …

**Pattern tag**: Call `classify(movesBeforeThisPly)` (from `classifier.js`) after scoring. The endpoint returns `patternTag` per move (may be `null`).

**Alternatives considered**: Per-move timeout — dropped (solver is fast; spec confirmed no timeout needed).

---

## Decision 3: `POST /api/games/from-position` — new game row on call

**Decision**: On call, immediately create a new row in `games` with `moves = first N chars of original movestring`, `side`, `difficulty` (from the request body), `user_id` (from `req.user?.id ?? null`), `device_uuid`. The existing `POST /api/games` code is the template. The response returns the new `gameId` alongside `moves`, `side`, `difficulty` so the `game` screen can mount as if `GameScreen` was called fresh.

**Rationale**: The `game` screen already expects `{ id }` from game save. Reusing the same `games` table row immediately enables analysis of the new from-position game later.

---

## Decision 4: ExplorerScreen board logic reuse strategy

**Decision**: Extract the interactive board interaction logic from `GameScreen.jsx` into a shared custom hook `useGameBoard({ initialMoves, side, difficulty })` that lives in `src/lib/useGameBoard.js`. Both `GameScreen` and `ExplorerScreen` consume this hook. The hook owns: `moveHistory`, `board`, `heights`, `fullCols`, `lastDrop`, `aiThinking`, `gameOver`, `handleColumnClick`, `makeAiMove`.

**Rationale**: FR-015 mandates reuse. `GameScreen.jsx` is 430 lines. The interactive board logic (AI move, column click, coach feedback) is the bulk of it. Extracting a hook makes the dependency clean and testable.

**Scope difference**: `ExplorerScreen` mounts with a pre-populated `initialMoves` (rewound to mistake position) and additionally tracks `selectedMistakeIndex`, `mistakeIndices`, `deepRevealOpen`. It does NOT call `saveGame` on game end — from-position games are started separately via the dedicated button.

---

## Decision 5: Deep Reveal panel placement in ExplorerScreen

**Decision**: The Deep Reveal panel renders as a **bottom sheet** that slides up below the board/toolbar area, overlaying the lower portion of the screen. It does NOT render above the board. The "Deep Reveal" button appears in the Toolbar row alongside Prev/Next/Start-new-game. This matches the Deep Reveal bottom-sheet pattern already established in `ChallengeScreen`.

**Rationale**: Consistency with Challenges surface (ChallengeScreen's "Learn more ▼" bottom sheet). The mockup shows the Toolbar at the bottom with Prev/Next/Start buttons; the Deep Reveal button fits naturally in this row or as an additional row above.

---

## Decision 6: Timeline node rendering — user-moves-only

**Decision**: The `review` screen renders timeline nodes for user moves only, numbered 1, 2, 3, … in user-move order. AI moves are never shown. This contradicts the mockup (which shows all 22 moves) — but FR-003 and Gap 12 in the epics doc are authoritative over the mockup.

**Rationale**: Gap 12 (from epics.md) governs: "the build shows only the user's moves numbered in user-move order". The mockup is documented as wrong on this point.

---

## Decision 7: `patternTag` coercion location for blunder writes

**Decision**: Coerce in the client, immediately before the fire-and-forget `blunders` table write. The coercion: `const category = patternTag && validCategorySlugs.has(patternTag) ? patternTag : 'unknown'`. The `validCategorySlugs` set is imported from `src/lib/categories.js` (which already exists as the canonical client-side category list).

**Rationale**: Avoids an extra server round-trip. The client has the data. The write is already fire-and-forget (FR-011 explicitly says the write must not block UI). The coercion is simple.

---

## Decision 8: `explain-move-llm` caching interaction for Explorer

**Decision**: The Explorer calls `POST /api/explain-move-llm` for Deep Reveal. The endpoint already implements the cache check (SHA256 of `movestring:col`). The Explorer passes `movestring` = position before the mistake move, and `col` = the mistake column. No new caching logic is needed server-side; this reuses the existing cache path 100%.

**Rationale**: The cache key contract is already defined in `api-conventions.md` and implemented in `server/index.js`. The Explorer just calls the same endpoint as Challenges.

---

## Decision 9: `review` and `explorer` screen registration

**Decision**: Both screen keys are already registered in `screenRegistry.jsx` (as `PlaceholderScreen`) and `surfaceGroups.js` (mapped to `--bg-spar`). The implementation tasks replace the `PlaceholderScreen` wrappers with the real components. No changes to `surfaceGroups.js` are needed.

**Rationale**: The infrastructure is already wired from Epic 1b / 3a. Only the component mapping needs updating.

---

## Decision 10: `summaryPhraseKey` pool selection server-side

**Decision**: The server uses `pickFromPool(i18nTranslations, 'coach.sparring.review.clean')` when `blunderCount === 0`, otherwise `pickFromPool(i18nTranslations, 'coach.sparring.review.mistakes')`. The `pickFromPool` helper already exists in `server/index.js` and handles the indexed key pool pattern. The i18n keys are authored in `en.json` with at least 2 entries each (FR-036).

**Rationale**: Pattern is identical to `POST /api/evaluate-move` which uses `pickFromPool` for `coachPhraseKey`. Direct reuse.
