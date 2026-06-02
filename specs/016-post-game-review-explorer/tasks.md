# Tasks: Post-Game Review & Position Explorer (Epic 3b)

**Branch**: `101-new-design` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

---

## Dependency Graph (summary)

```
A1 (migration) ──────────────────────────────────► C1 (blunder writes need valid CHECK constraint)
A2 (i18n) ───────────────────────────────────────► B1 (summaryPhraseKey pool), C1 (coach phrase renders)
A3 (extract useGameBoard) ───────────────────────► A4 (refactor GameScreen), D1 (ExplorerScreen uses hook)
A4 (refactor GameScreen) ────────────────────────► GATE (verify game still works)
B1 (analyze endpoint) ───────────────────────────► C1 (ReviewScreen calls it)
B2 (from-position endpoint) ─────────────────────► D1d (ExplorerScreen "Start new game" button)
B3 (blunders endpoint) ──────────────────────────► C1 (ReviewScreen fire-and-forget writes)
C1 (ReviewScreen) + C2 (registry) ───────────────► D1 (ExplorerScreen entered from Review)
D1a → D1b → D1c, D1d, D1e (Explorer sub-tasks build on each other)
E1 + E2 (doc updates) ───────────────────────────► [last — capture final implementation]
F1 (QA gate) ────────────────────────────────────► [merge-ready]
```

---

## Phase A: Infrastructure (blocking prerequisites)

### A1 — Migration 027: add `'unknown'` to `blunders.pattern_category` CHECK constraint

**File**: `connect-four/server/migrations/027_blunders_unknown.sql`

**Why first**: The blunder write path in C1 will INSERT rows with `pattern_category = 'unknown'` when the classifier returns `null` or an unrecognized slug. Without this migration, those INSERTs would fail with a constraint violation.

**Implementation**:
```sql
ALTER TABLE public.blunders DROP CONSTRAINT IF EXISTS blunders_pattern_category_check;
ALTER TABLE public.blunders ADD CONSTRAINT blunders_pattern_category_check
  CHECK (pattern_category IN (
    'immediate_threat','forced_block','double_threat','forced_win','forbidden_columns',
    'z_threat','claimeven','undercut','overcut','figure_7','j_shape','unknown'
  ));
```

**Validation**: Run the migration against the local Supabase instance. Verify that inserting a row with `pattern_category = 'unknown'` succeeds, and inserting a row with `pattern_category = 'bogus'` is rejected.

**Dependencies**: None.

---

### A2 — i18n: author `coach.sparring.review.*` key pools in `en.json`

**File**: `connect-four/src/i18n/en.json`

**Add the following subtree** under the existing `coach.sparring` key:

```json
"review": {
  "clean": {
    "0": "Clean game. Nothing to revisit.",
    "1": "Excellent — no mistakes to review."
  },
  "mistakes": {
    "0": "Good game. One parity mistake decided it.",
    "1": "A few moments to learn from — let's look.",
    "2": "You played well. Let's find the edge.",
    "3": "Some tactical moments worth revisiting."
  }
}
```

**Validation**: After adding, verify that `t('coach.sparring.review.clean.0')` returns the English string and `pickFromPool(i18nTranslations, 'coach.sparring.review.clean')` returns one of the 2 keys.

**Dependencies**: None (but B1's `summaryPhraseKey` pool selection requires this to resolve to a real phrase).

---

### A3 — Extract `useGameBoard` hook from `GameScreen.jsx`

**File**: `connect-four/src/lib/useGameBoard.js` (new)

**Goal**: Extract ~200+ lines of interactive board logic from `GameScreen.jsx` into a reusable hook, so `ExplorerScreen` can reuse it without duplicating logic.

**Interface**:
```js
/**
 * @param {{
 *   initialMoves?: string,       // movestring to start from ('' = empty board)
 *   side: 'first' | 'second',
 *   difficulty: string,
 *   onGameEnd?: (result: string, finalMoves: number[]) => void
 * }} opts
 * @returns {{
 *   moveHistory: number[],        // 0-indexed column list
 *   board: string[][],
 *   heights: number[],
 *   fullCols: number[],
 *   lastDrop: {c: number, r: number} | null,
 *   aiThinking: boolean,
 *   gameOver: {result: string, winnerColor?: string} | null,
 *   hintOverlays: {c: number, r: number, type: string}[],
 *   hintActive: boolean,
 *   coachMessages: {text: string, mood: string}[],
 *   handleColumnClick: (col: number) => void,
 *   handleHintToggle: () => void,
 *   handleResign: () => void,
 *   userColor: string,            // 'red' or 'yellow'
 *   aiColor: string,              // 'yellow' or 'red'
 *   userTurn: boolean,
 * }}
 */
export function useGameBoard({ initialMoves = '', side, difficulty, onGameEnd }) { ... }
```

**What to extract** (from current `GameScreen.jsx`):
- All state: `moveHistory`, `coachMessages`, `hintOverlays`, `gameOver`, `aiThinking`, `lastDrop`, `hintActive`, `preHintCoach`.
- Derived values: `userColor`, `aiColor`, `userTurn`, `board`/`heights` (via `buildBoard`), `fullCols`.
- `pickRandomKey` helper.
- `updateCoach` helper.
- `handleHintToggle` — hint toggle logic (calls `POST /api/scores`).
- `handleColumnClick` — user move handler (commit-first, evaluate-move, win/draw check, AI turn trigger).
- `makeAiMove` + `commitAiMove` — AI move logic (solver scores, deliberate mistakes, temperature sampling).
- `handleResign` — resign handler (sets gameOver, calls onGameEnd).
- `useEffect` for intro phrase on mount.
- `useEffect` for AI opening move when `side === 'second'`.

**What stays in `GameScreen`** (NOT extracted):
- `saveGame` function — stays in `GameScreen` (navigates to `review`, calls `POST /api/games`).
- The JSX render tree — stays in `GameScreen`.
- The `TopBar`, `CoachDialog`, `Board`, `Toolbar` JSX — stays in `GameScreen`.

**Key design decisions**:
- `initialMoves` defaults to `''`. When non-empty (from-position flow), the hook initializes `moveHistory` from these moves and skips the AI opening move effect.
- `onGameEnd` is called with `(result, finalMoves)` instead of the hook calling `saveGame` directly. `GameScreen` passes `saveGame` as `onGameEnd`; `ExplorerScreen` passes a no-op.
- The hook must NOT import or reference `GameScreen`-specific logic (navigation, saveGame, screen params).
- `makeAiMove` and `commitAiMove` should be exposed (or at least `commitAiMove`) so the hook internally handles AI turns after user clicks — the caller doesn't need to call them directly.

**Post-extraction validation gate** (do NOT proceed to A4 until this passes):
1. Unit test: instantiate the hook in a test component with `initialMoves=''`, `side='first'`, `difficulty='medium'`. Verify `moveHistory` starts as `[]`, `userColor === 'red'`, `userTurn === true`.
2. Smoke test: render a test component, call `handleColumnClick(3)`, verify `moveHistory` updates with `[3]`.

**Dependencies**: None (pure refactor).

---

### A4 — Refactor `GameScreen.jsx` to consume `useGameBoard`

**File**: `connect-four/src/screens/GameScreen.jsx` (modify)

**Goal**: Replace the extracted logic with a call to `useGameBoard`. `GameScreen` becomes a thin wrapper that:
1. Calls `useGameBoard({ initialMoves: '', side, difficulty, onGameEnd: saveGame })`.
2. Destructures the return values and passes them to the existing JSX render tree.
3. Keeps `saveGame` as a local function (unchanged logic).

**Validation**: Play a full game end-to-end:
1. Start game from `DifficultyPickerScreen`.
2. Make moves, verify Coach phrases appear.
3. Toggle hint, verify green overlays.
4. Resign, verify navigation to `review` screen (though `review` is still a placeholder — just verify `go('review', { id })` is called with a valid `id`).
5. Win a game, verify navigation to `review`.
6. Draw a game (fill to 42 moves), verify navigation to `review`.

**Dependencies**: A3 (must complete first).

---

## Phase B: Backend Endpoints

### B1 — `POST /api/games/analyze` endpoint

**File**: `connect-four/server/index.js` (add route)

**Route**: `POST /api/games/analyze`

**Registration order**: Register in the games-related route block, **before** `GET /api/puzzles/:id` (following the existing route-ordering convention that static routes precede parameterized ones).

**Auth**: `loadUser` runs globally; `req.user` may be null. No auth gating — anonymous users can analyze games.

**Algorithm**:

1. Validate `gameId` is present in `req.body` (400 if missing).
2. Fetch game row from `games` table: `SELECT moves, side, difficulty` by `id` (404 if not found).
3. Report `difficulty` and `side` as top-level fields in the response (needed by the Review screen to forward to Explorer).
4. Initialize counters: `scored = 0`, `optimalCount = 0`, `suboptimalCount = 0`, `blunderCount = 0`, `moves = []`.
5. Iterate over the `moves` string character by character. For each character at position `i`:
   - **Determine if user ply**: `side === 'first'` -> user ply when `i % 2 === 0`; `side === 'second'` -> user ply when `i % 2 === 1`.
   - If not a user ply: skip (continue).
   - `const col = parseInt(moves[i], 10)`.
   - `const movesBeforeThisPly = moves.slice(0, i)`.
   - `const scores = movesBeforeThisPly.length > 0 ? await solver.query(movesBeforeThisPly) : EMPTY_BOARD_SCORES`.
   - Count legal columns: `const legalCount = scores.filter(s => s > INVALID_MOVE).length`.
   - Call `scoreMove(scores, col)` from `moveQualityScorer.js` to get `{ badge, quality, bestCol }`.
   - Derive `score = scores[col]` and `bestScore = scores[bestCol]` **explicitly from the raw `scores` array** (using `bestCol` from `scoreMove`).
   - Call `classify(movesBeforeThisPly, col, scores)` from `classifier.js` to get `{ tag }`. Use `.tag` as `patternTag`.
   - `const userMoveOrdinal = Math.floor(i / 2) + 1` (or compute from a running counter).
   - Build entry:
     ```js
     {
       moveIndex: userMoveOrdinal,
       col,
       quality,
       score,
       bestScore,
       bestCol,
       patternTag,
     }
     ```
   - If `legalCount > 1`: increment `scored`; increment the appropriate quality counter.
   - If `legalCount === 1`: move is forced. Still include in `moves` array with quality, but do NOT increment `scored` or any quality counter.
6. Compute `accuracy = scored > 0 ? Math.round(optimalCount / scored * 100) : 0`. (Client displays `--` when `scored === 0`.)
7. Select `summaryPhraseKey`:
   - If `blunderCount === 0`: `pickFromPool(i18nTranslations, 'coach.sparring.review.clean')`.
   - If `blunderCount > 0`: `pickFromPool(i18nTranslations, 'coach.sparring.review.mistakes')`.
8. Return:
   ```json
   {
     "moves": [...],
     "accuracy": 82,
     "optimalCount": 17,
     "suboptimalCount": 3,
     "blunderCount": 2,
     "scored": 22,
     "summaryPhraseKey": "coach.sparring.review.mistakes.1",
     "fullMovestring": "...",
     "difficulty": "medium",
     "side": "first"
   }
   ```

**Imports needed**: `scoreMove` (already imported in server/index.js), `classify` (already imported). `INVALID_MOVE` from `c4solver-wrapper.js` (verify it's importable — if not, use `-1000` constant inline).

**Error handling**: 
- 400 if `gameId` missing/invalid.
- 404 if game not found.
- 503 if Supabase not configured.
- Solver errors: catch and return 500. Do NOT return partial results.

**Validation**: 
1. Create a known game record in the `games` table with a short movestring (e.g., "3333333" or a real game). Call `POST /api/games/analyze` with the `gameId`. Verify the response has the correct shape, non-empty `moves`, accurate `fullMovestring`, and sensible quality values.
2. Test with `side = 'first'` and `side = 'second'` games — verify only user plies are scored.
3. Test with a game where a move is forced (e.g., a column-filling position). Verify `scored` excludes it.

**Dependencies**: A2 (i18n keys must exist for `pickFromPool` to find them).

**Implementation note — batch vs streaming**: SC-003's "real-time progress" wording in the spec is aspirational. MVP implementation uses batch delivery: all plies are processed synchronously and returned in a single JSON response. No server-sent events or per-move streaming is implemented. The pending-timeline UX renders immediately before analysis arrives; all nodes update simultaneously when the response lands.

---

### B2 — `POST /api/games/from-position` endpoint

**File**: `connect-four/server/index.js` (add route)

**Route**: `POST /api/games/from-position`

**Registration order**: Register after `POST /api/games` and `POST /api/games/analyze` in the games block.

**Auth**: `loadUser` runs; `req.user` may be null. No auth gating.

**Algorithm**:
1. Validate `gameId` (string, required), `N` (integer 0–42, required), `difficulty` (one of `easy|medium|hard|perfect`, required). Return 400 on invalid/missing.
2. Fetch original game row from `games` table: `SELECT moves, side` by `id`. Return 404 if not found.
3. Compute truncated movestring: `const truncated = moves.slice(0, N)`.
4. Return `{ moves: truncated, side, difficulty }` with status 200.
5. **Do NOT insert a `games` row.** The new game row is created later by `GameScreen.saveGame` when the spawned game ends, exactly as it does for any new game. This avoids phantom rows with a fake `result` placeholder.

**Error handling**: 400, 404, 503. Never 201 (no row created).

**Validation**:
1. Call with `{ gameId: <known-id>, N: 4, difficulty: 'medium' }`. Verify response contains `moves` with exactly 4 characters, `side` from the DB, and `difficulty: 'medium'`.
2. Call with `N: 0`. Verify `moves: ''` (empty string, valid for new game).

**Dependencies**: None (pure read + compute, no write).

---

### B3 — `POST /api/blunders` endpoint

**File**: `connect-four/server/index.js` (add route)

**Route**: `POST /api/blunders`

**Registration order**: Register after the games block, before puzzle routes.

**Auth**: `loadUser` runs. Blunder writes require `req.user` (authenticated user). If `req.user` is null, return 401 (the client fire-and-forgets this and the spec allows silent failure).

**Body**: `{ board_state: string, move_played: number, correct_move: number, pattern_category: string }`

**Algorithm**:
1. Validate all 4 fields are present. Return 400 if missing.
2. `board_state` must be a valid movestring (`/^[0-6]{0,42}$/`).
3. `move_played` and `correct_move` must be integers 0–6.
4. `pattern_category` must be a non-empty string.
5. If `!req.user`, return 401 (no silent skip — the client handles this by not calling the endpoint).
6. Insert into `blunders` table:
   ```js
   {
     user_id: req.user.id,
     puzzle_id: null,
     board_state,
     move_played,
     correct_move,
     pattern_category,
   }
   ```
7. Return 201 with `{ id: data.id }` (or 204 no-content — the client fire-and-forgets either way).

**Error handling**: 400, 401, 500, 503.

**Rate limit**: Inherits the `app.use('/api/', makeLimit(120))` catch-all. No separate limit needed.

**Note**: This is a thin write endpoint (~20 lines). The client is responsible for coercing `patternTag` to `'unknown'` before calling this endpoint (see C1).

**Validation**: 
1. With an authenticated session, POST a blunder. Verify a row appears in the `blunders` table with `puzzle_id = null`.
2. Without auth, verify 401.
3. With `pattern_category = 'unknown'`, verify the row is inserted (migration 027 must be applied first).

**Dependencies**: A1 (migration must be applied so `'unknown'` is a valid CHECK value).

---

## Phase C: Review Screen

### C1 — `ReviewScreen.jsx` implementation

**File**: `connect-four/src/screens/ReviewScreen.jsx` (new)

**Props**: `{ go, goBack, id }` — `id` is the `gameId` from navigation params (set by `GameScreen.saveGame` when it calls `go('review', { id: gameId })`).

**Edge case — missing `id`**: If `id` is null/undefined (network failure during game save), render a neutral state: no timeline, no accuracy card, Coach phrase "Game not saved — analysis unavailable.", disabled Prev/Next. Do NOT call `POST /api/games/analyze`.

**State**:
- `analysis: GameAnalysis | null` — populated after fetch completes
- `loading: boolean` — true while fetch is in-flight
- `error: string | null` — set on network failure or 404

**Behavior on mount** (when `id` is present):
1. Set `loading = true`.
2. Call `POST /api/games/analyze` with `{ gameId: id }`.
   - On success: set `analysis = data`, `loading = false`.
   - On network failure: set `error = 'Network error — analysis could not be loaded.'`, `loading = false`.
   - On 404: set `error = 'Game not found.'`, `loading = false`.
3. While loading: show a compact board placeholder (or hide the board), timeline loading indicator, neutral Coach phrase.
4. On error: show error phrase in CoachDialog, disabled Prev/Next.

**Render (on analysis success)**:

**Frozen Board**:
- Build with `buildBoard(analysis.fullMovestring)`.
- Render `Board` with `compact` prop, `canPlay={false}` (non-interactive).
- Show the final disc as `lastDrop` (last column in `fullMovestring`).

**Accuracy Card**:
- When `analysis.scored > 0`: display `Math.round(analysis.optimalCount / analysis.scored * 100)%`.
- When `analysis.scored === 0`: display `--`.
- Show quality counts: Optimal N / Suboptimal N / Blunder N alongside quality-dot legends (green dot, amber dot, red dot).

**Move Timeline** (user moves only):
- Render a horizontal scrollable row of numbered nodes.
- Each node shows the move number (1-based user ordinal) and a quality-colored dot/bar.
- Node color: `var(--eval-good)` for `optimal`, `var(--eval-mid)` for `suboptimal`, `var(--eval-bad)` for `blunder`.
- Tapping a non-optimal node (`quality !== 'optimal'`): `go('explorer', { gameId: id, moveIndex: move.moveIndex, moves: analysis.moves, difficulty: analysis.difficulty, side: analysis.side, fullMovestring: analysis.fullMovestring })`.
- Tapping an optimal node: no action (not interactive).

**Prev/Next mistake navigation**:
- Compute `mistakeIndices = analysis.moves.filter(m => m.quality !== 'optimal').map(m => m.moveIndex)`.
- If `mistakeIndices.length === 0`: Prev and Next buttons are disabled.
- Prev: navigate to previous non-optimal node in the timeline. Disabled when on the first mistake.
- Next: navigate to next non-optimal node. Disabled when on the last mistake.
- Navigation opens the Explorer (same `go('explorer', ...)` call as tapping a node).

**CoachDialog**:
- Once analysis is complete: show `t(analysis.summaryPhraseKey)`.
- The phrase pool is selected server-side based on blunder count (`clean.*` for 0 blunders, `mistakes.*` for >= 1).

**Blunder writes (FR-011)**:
- Trigger only when analysis is complete, `session?.user_id` is present (from `useStore()`), and `blunderCount > 0`.
- For each move in `analysis.moves` where `quality === 'blunder'`:
  1. Compute `board_state = analysis.fullMovestring.slice(0, plyIndex)` where `plyIndex` is the total ply index before this user move:
     - `side === 'first'`: `plyIndex = (move.moveIndex - 1) * 2`
     - `side === 'second'`: `plyIndex = (move.moveIndex - 1) * 2 + 1`
  2. Coerce `pattern_category`:
     ```js
     import { VALID_CATEGORIES } from '../lib/categories.js';
     const category = move.patternTag && VALID_CATEGORIES.has(move.patternTag)
       ? move.patternTag
       : 'unknown';
     ```
  3. Fire-and-forget `POST /api/blunders`:
     ```js
     fetch(`${API}/api/blunders`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
       body: JSON.stringify({
         board_state,
         move_played: move.col,
         correct_move: move.bestCol,
         pattern_category: category,
       }),
     }).catch(() => {}); // silent — never blocks UI
     ```
- This write MUST NOT block any UI update or navigation.

**Tracking (FR-012)**:
- On analysis complete, fire once:
  ```js
  const accuracy = analysis.scored > 0
    ? Math.round(analysis.optimalCount / analysis.scored * 100)
    : null;
  track('game_reviewed', {
    gameId: id,
    accuracy,
    blunderCount: analysis.blunderCount,
  });
  ```

**Validation**:
1. Complete a sparring game, verify navigation to ReviewScreen with frozen board and timeline.
2. Verify accuracy card shows percentage for games with moves, `--` for forced-only games.
3. Tap a blunder node, verify navigation to ExplorerScreen.
4. Verify blunder write: authenticated user, game with blunder -> check `blunders` table for new row with `puzzle_id = null`.
5. Anonymous user: verify no blunder write attempt (401 from `/api/blunders` is silently ignored).
6. Missing `id` param: verify neutral error state renders without crashing.

**Dependencies**: B1 (analyze endpoint), B3 (blunders endpoint), A2 (i18n keys for `summaryPhraseKey` resolution).

---

### C2 — Wire `ReviewScreen` in `screenRegistry.jsx`

**File**: `connect-four/src/lib/screenRegistry.jsx` (modify)

**Change**: Replace the `review` placeholder with the real component.

```js
import { ReviewScreen } from '../screens/ReviewScreen.jsx';
// ...
review: ReviewScreen,
```

**Note**: The `review` key is already mapped to `--bg-spar` in `surfaceGroups.js` — no changes needed there.

**Validation**: After C1 is implemented, navigate to the `review` screen (by completing a game) and verify the ReviewScreen renders instead of the placeholder.

**Dependencies**: C1 (ReviewScreen must exist).

---

## Phase D: Explorer Screen

### D1a — ExplorerScreen shell: rewound board, overlays, and basic structure

**File**: `connect-four/src/screens/ExplorerScreen.jsx` (new)

**Props**: `{ go, goBack, gameId, moveIndex, moves, difficulty, side, fullMovestring }`

**On mount**:

1. **Compute `mistakeIndices`**:
   ```js
   const mistakeIndices = moves
     .filter(m => m.quality !== 'optimal')
     .map(m => m.moveIndex);
   ```

2. **Compute `selectedMistakeIndex`**:
   ```js
   const selectedMistakeIndex = mistakeIndices.indexOf(moveIndex);
   // Fallback to 0 if moveIndex not found (should not happen in normal flow)
   ```

3. **Compute rewound board state**:
   - The selected mistake is at `moveIndex` (1-based user ordinal).
   - Total plies before this user move:
     - `side === 'first'`: `totalPliesBefore = (moveIndex - 1) * 2`
     - `side === 'second'`: `totalPliesBefore = (moveIndex - 1) * 2 + 1`
   - `const rewindedMoves = fullMovestring.slice(0, totalPliesBefore)`.

4. **Render compact, non-interactive Board** with the rewound position:
   - `const { board, heights } = buildBoard(rewindedMoves)`.
   - Show board frozen at the rewound position.

5. **Compute overlays**:
   - **`tr` overlay** (mistake marking): the column played at `moveIndex` — `const mistakeCol = moves.find(m => m.moveIndex === moveIndex).col`. The landing row is `heights[mistakeCol]` (which equals the row where the disc would land in the rewound position). Render `{ c: mistakeCol, r: heights[mistakeCol], type: 'tr' }`.
   - **`td` overlays** (threat cells): call `getMajorThreatCells(board)` to get the major threat cells for the rewound position. For each threat cell, emit `{ c, r, type: 'td' }`. 
     - **Note**: `getMajorThreatCells` currently lives in `server/classifier.js` as a minified function `n`. For the client side, either:
       - (a) Port a lightweight version to `src/lib/board.js`, or
       - (b) Call `POST /api/scores` and derive threats from the scores + board analysis.
     - **Decision**: The plan specifies calling it from `src/lib/board.js`. If the function does not exist there yet, port the algorithm from `server/classifier.js` function `n` into `src/lib/board.js` as a new export `getMajorThreatCells(board)`. This function receives a 2D board array (row 0 = bottom) and returns an object mapping `"row,col"` strings to the threat player (`'red'`, `'yellow'`, or `'both'`).

6. **TopBar**: title "Review Move", back button navigates to the `review` screen (or calls `goBack`).

7. **Toolbar shell**: Prev/Next/Start buttons (wired in D1c/D1d).

**Pass overlays to `useGameBoard`** (wired in D1b): The `tr` overlay should be cleared when the user makes their first move in the Explorer.

**Tracking (FR-024)**: On mount, fire:
```js
const selectedMove = moves.find(m => m.moveIndex === moveIndex);
track('mistake_reviewed', { gameId, moveIndex, category: selectedMove?.patternTag ?? null });
```

**Validation**: 
1. From ReviewScreen, tap a blunder node. Verify Explorer shows the board rewound to before the mistake.
2. Verify the `tr` overlay appears on the mistake column's landing row.
3. Verify `td` overlays appear on threat cells (if any exist at that position).

**Dependencies**: A3 + A4 (useGameBoard hook must exist; ExplorerScreen imports it; GameScreen refactor completed), C1 + C2 (ReviewScreen must be live to navigate from).

---

### D1b — ExplorerScreen: interactive board via `useGameBoard`

**File**: `connect-four/src/screens/ExplorerScreen.jsx` (extend D1a)

**Integration with `useGameBoard`**:
```js
const gameBoard = useGameBoard({
  initialMoves: rewindedMoves,
  side,
  difficulty,
  onGameEnd: () => {}, // no-op in Explorer — from-position is a separate action
});
```

**Board rendering**:
- Replace the static board from D1a with `useGameBoard`'s interactive `board`.
- Pass `Board` component: `canPlay={gameBoard.userTurn && !gameBoard.gameOver && !gameBoard.aiThinking}`, `fullCols={gameBoard.fullCols}`, `lastDrop={gameBoard.lastDrop}`, `overlays={[...threatCellOverlays, ...(gameBoard.hintOverlays)]}`.
- When the user makes their first move, clear the initial `tr` overlay from D1a. (The `td` overlays from threat cells are dynamic — recompute or clear after the first move.)

**CoachDialog**: Show `gameBoard.coachMessages` — AI responds with the same Coach phrases as in a live game.

**Disc color parity (FR-016 gate)**:
- `useGameBoard` derives `userColor = side === 'first' ? 'red' : 'yellow'`.
- The `Board` component renders `'red'` as a green disc and `'yellow'` as a gray disc.
- Verify: when `side === 'second'`, the user's disc renders as gray (not green).
- **Manual QA gate**: play a game as Gray, resign, enter Explorer at move 1, play any column, confirm the disc renders as Gray.

**AI response**: The AI uses the same `difficulty` as the original game. Deliberate-mistake logic is enabled (same as live game — it's built into `useGameBoard`).

**Edge case — terminal position on mount**: If `checkWin(board, row, col, color)` returns true for the rewound position (game was already decided), disable column taps and show "This position is terminal — no moves available."

**Validation**:
1. From ReviewScreen, tap a blunder node at move 1. Play column 3. Verify AI responds, CoachDialog updates, board updates.
2. Play through several moves in Explorer. Verify the game progresses but does NOT save (no `go('review', ...)` call on game end).
3. Verify AI difficulty matches the original game (test with easy vs perfect).

**Dependencies**: D1a (shell must exist), A3 (useGameBoard hook).

---

### D1c — ExplorerScreen: Prev/Next mistake navigation

**File**: `connect-four/src/screens/ExplorerScreen.jsx` (extend D1b)

**Implementation**:
- "Prev" button: navigates to `mistakeIndices[selectedMistakeIndex - 1]`.
  - Disabled when `selectedMistakeIndex === 0`.
- "Next" button: navigates to `mistakeIndices[selectedMistakeIndex + 1]`.
  - Disabled when `selectedMistakeIndex === mistakeIndices.length - 1`.
- **Navigation within Explorer**: Update `selectedMistakeIndex` state, recompute `rewindedMoves`, and reset the `useGameBoard` state to the new rewound position.
  - **Important**: This is NOT a `go()` navigation. The user stays on the `explorer` screen. The `useGameBoard` hook must be re-initialized with the new `initialMoves`.
  - **Implementation options**:
    - (a) Key the `useGameBoard`-wrapping component on `selectedMistakeIndex` so React remounts it (simplest, least error-prone).
    - (b) Add a `resetBoard(newInitialMoves)` method to `useGameBoard` (more complex but avoids remount).
  - **Decision**: Use option (a) — key the board container on `selectedMistakeIndex`. This ensures a clean reset of all internal state (moveHistory, AI thinking, gameOver, etc.) without adding complexity to the hook.
- On navigation, fire `track('mistake_reviewed', ...)` for the new node (same tracking as D1a).
- Optimal nodes are already filtered out by `mistakeIndices` — Prev/Next never land on them.

**Validation**:
1. Navigate to Explorer for a game with 2+ mistakes. Verify Prev is disabled on the first mistake.
2. Tap Next. Verify board rewinds to the next mistake position with correct overlays.
3. On the last mistake, verify Next is disabled.
4. Verify optimal nodes are skipped (Prev from mistake 3 goes to mistake 2, not mistake 1 if move 2 was optimal).

**Dependencies**: D1b (interactive board must be functional to test navigation results).

---

### D1d — ExplorerScreen: "Start new game from here" button

**File**: `connect-four/src/screens/ExplorerScreen.jsx` (extend D1b/D1c)

**Button location**: In the Toolbar row, alongside Prev/Next.

**Behavior on tap**:
1. Compute `N = rewindedMoves.length` (total plies played up to the mistake position).
2. Call `POST /api/games/from-position` with `{ gameId, N, difficulty }`.
3. On success (200): the response contains `{ moves, side, difficulty }`. Navigate:
   ```js
   go('game', { initialMoves: moves, side, difficulty });
   ```
   - `GameScreen` receives `initialMoves` as a navigation param and passes it to `useGameBoard`.
   - When the spawned game ends, `GameScreen.saveGame` calls `POST /api/games` to create the real row — same as a normal new game.
4. On failure: show a brief error message (toast or inline). Do NOT navigate away from Explorer.

**Note**: `GameScreen` currently does not accept `initialMoves`. This task must also add that param:
- In `GameScreen.jsx`: accept `initialMoves` from props, default to `''`. Pass it to `useGameBoard({ initialMoves, ... })`.
- The AI opening move effect in `useGameBoard` must respect `initialMoves` — if `initialMoves` is non-empty AND it would be the AI's turn, trigger the AI move. If `initialMoves` is non-empty AND it would be the user's turn, wait for user input. This logic already works via the existing `userTurn` derivation from `moveHistory.length` and `side`.

**Validation**:
1. In Explorer, tap "Start new game from here". Verify navigation to `game` screen.
2. Verify the board is pre-populated with the rewound position (not empty).
3. Play until game end. Verify a new `games` row is created (separate from the original reviewed game).
4. Test with anonymous user — verify the new game row is created with `device_uuid`.

**Dependencies**: B2 (from-position endpoint), D1b (interactive board context needed). `GameScreen` must accept `initialMoves`.

---

### D1e — ExplorerScreen: Deep Reveal integration

**File**: `connect-four/src/screens/ExplorerScreen.jsx` (extend D1b-D1d)

**Button**: "Deep Reveal" button visible in the Explorer Toolbar when viewing a non-optimal mistake node. (In practice, the Explorer only opens for non-optimal nodes, so this button is always available.)

**Panel**: Renders as a bottom sheet below the board/toolbar area (same pattern as `ChallengeScreen`'s "Learn more" bottom sheet).

**State**:
- `deepRevealOpen: boolean`
- `deepRevealExplanation: string | null`
- `deepRevealBestLine: string[]`
- `deepRevealCached: boolean`
- `deepRevealLoading: boolean`
- `deepRevealError: string | null`

**On panel open**:
1. Set `deepRevealOpen = true`, `deepRevealLoading = true`.
2. Call `POST /api/explain-move-llm` with `{ movestring: rewindedMoves, col: mistakeCol }` and auth header.
   - The endpoint already checks `explanation_cache` (SHA256 hash of `movestring:col`) before calling the LLM.
   - On 401 (anonymous): show `AuthModal` instead of the Deep Reveal panel. Close the panel.
   - On cache hit (response includes `cached: true`): render instantly with no spinner.
   - On cache miss: show spinner during LLM call.
   - **Timeout (>6s)**: use `AbortController` with a 6-second timeout. On timeout, show the Tier 1 classifier phrase (from the analyzed move's `patternTag` if available, otherwise a generic phrase) and "Detailed explanation unavailable." Do NOT retry.
3. On success: render LLM explanation text + `bestLine` chips.
4. Fire `track('deep_reveal_viewed', { context: 'position_explorer', cached: deepRevealCached })` once per panel open.

**Panel content**:
- LLM explanation text.
- `bestLine` chips (sequence of column moves showing what would follow the best alternative).
- "Flag this explanation" button.

**"Flag this explanation" (FR-023)**:
- Call `POST /api/llm-feedback` with:
  ```json
  {
    "movestring": "<rewindedMoves>",
    "llm_prompt": "",
    "llm_response": "<explanation text>",
    "human_note": "",
    "feature": "position_explorer"
  }
  ```
- Show a brief confirmation toast ("Explanation flagged. Thank you!") — do NOT close the panel.

**Navigation between mistakes**: When the user taps Prev/Next in D1c, close the Deep Reveal panel (reset deep reveal state) so the panel for the new position is opened fresh.

**Validation**:
1. Tap Deep Reveal on a blunder node. Verify spinner shows during LLM call, explanation renders after.
2. Tap Deep Reveal on the same position again. Verify instant display (cache hit, `cached: true`).
3. As anonymous user, tap Deep Reveal. Verify `AuthModal` appears instead of the panel.
4. Trigger timeout (may need to simulate by setting a very short timeout in dev). Verify fallback phrase.
5. Tap "Flag this explanation". Verify row appears in `llm_feedback` table with `feature: 'position_explorer'`.

**Dependencies**: D1b (interactive board + mistake context needed). `POST /api/explain-move-llm` must be available (existing endpoint). `AuthModal` component must be accessible (check import path in existing code).

---

### D2 — Wire `ExplorerScreen` in `screenRegistry.jsx`

**File**: `connect-four/src/lib/screenRegistry.jsx` (modify)

**Change**: Replace the `explorer` placeholder with the real component.

```js
import { ExplorerScreen } from '../screens/ExplorerScreen.jsx';
// ...
explorer: ExplorerScreen,
```

**Note**: The `explorer` key is already mapped to `--bg-spar` in `surfaceGroups.js` — no changes needed there.

**Validation**: After D1 is complete, navigate from ReviewScreen to Explorer and verify the real screen renders.

**Dependencies**: D1a-D1e (ExplorerScreen implementation).

---

## Phase E: Documentation Updates

### E1 — Update `docs/architecture/api-conventions.md`

**File**: `docs/architecture/api-conventions.md` (modify)

**Add sections** for the 3 new endpoints:
- `POST /api/games/analyze` — auth, request body, response shape, error codes, notes on forced-move exclusion and `patternTag` nullability.
- `POST /api/games/from-position` — auth, request body (gameId, N, difficulty), response shape (moves, side, difficulty), note that no games row is created.
- `POST /api/blunders` — auth (required), request body, response (201), note that this is fire-and-forget from the client.

**Dependencies**: B1, B2, B3 (endpoints must be implemented to document their final shape).

---

### E2 — Update `docs/architecture/data-model.md`

**File**: `docs/architecture/data-model.md` (modify)

**Add documentation** for:
- Migration 027: `blunders.pattern_category` CHECK constraint change, the `'unknown'` sentinel, and the full slug list.
- `GameAnalysis` and `AnalyzedMove` ephemeral entities (reference `specs/016-post-game-review-explorer/data-model.md`).
- `ExplorerState` client-only entity.
- Navigation params contracts for `review`, `explorer`, and `game` screens (with `initialMoves`).

**Dependencies**: A1 (migration must be applied to document its effects).

---

## Phase F: QA Gates

### F1 — Manual QA: AI-first parity verification (FR-016)

**This is a mandatory merge gate. Do NOT ship without completing this check.**

**Steps**:
1. Play a sparring game as Gray (`side = 'second'`, user is Yellow/second player).
2. Resign after >= 3 moves.
3. Enter Explorer at move 1 (first user mistake).
4. Play any column as an alternative move.
5. Verify the disc renders as **Gray** (not Green).

**Pass**: Disc is Gray — the parity logic in `useGameBoard` correctly assigns `userColor = 'yellow'` when `side = 'second'`, and the `Board` component renders `'yellow'` as a gray disc.

**Fail**: Disc is Green — the parity bug documented in `project_parity_bug_ai_first` is still present. Do NOT ship. Investigate and fix before proceeding.

**Document result** in a comment on this task or in the QA notes for the PR.

**Dependencies**: D1b (Explorer must be functional with interactive board).

---

### F2 — Manual QA: End-to-end golden path

**Steps**:
1. Play a complete sparring game (authenticated user, medium difficulty, side = first).
2. Verify Post-Game Review opens with frozen board and pending timeline.
3. Verify all nodes resolve to quality colors (green/amber/red).
4. Verify accuracy card shows a percentage (not 0, not --).
5. Tap a blunder node. Verify Explorer opens at correct position.
6. Play an alternative move. Verify AI responds.
7. Tap Next mistake. Verify navigation to next non-optimal node.
8. Tap Deep Reveal. Verify explanation panel opens.
9. Tap "Start new game from here". Verify new game starts from the rewound position.
10. Complete the new game. Verify it navigates to its own Review screen.

**Dependencies**: All phases complete.

---

### F3 — Manual QA: Edge cases

Test each edge case from spec.md:

| # | Edge Case | Expected Behavior |
|---|---|---|
| 1 | Missing `gameId` param | Neutral Coach phrase, no timeline, disabled Prev/Next |
| 2 | `POST /api/games/analyze` network failure | Error phrase, neutral nodes, frozen board visible |
| 3 | `POST /api/games/analyze` returns 404 | Same as network failure |
| 4 | Explorer with terminal position | Column taps disabled, "This position is terminal" message |
| 5 | `POST /api/games/from-position` failure | Error message shown, user stays in Explorer |
| 6 | All user moves were forced (`scored === 0`) | Accuracy card shows `--` |
| 7 | Clean game (0 non-optimal moves) | Clean-pool Coach phrase, Prev/Next disabled |
| 8 | Anonymous user — Deep Reveal | AuthModal shown instead of panel |

**Dependencies**: All phases complete.

---

## Task Summary

| ID | Task | Phase | Est. Effort | Dependencies |
|----|------|-------|-------------|--------------|
| A1 | Migration 027 | A | Small | None |
| A2 | i18n key pools | A | Small | None |
| A3 | Extract useGameBoard | A | Large | None |
| A4 | Refactor GameScreen | A | Medium | A3 |
| B1 | POST /api/games/analyze | B | Large | A2 |
| B2 | POST /api/games/from-position | B | Small | None |
| B3 | POST /api/blunders | B | Small | A1 |
| C1 | ReviewScreen.jsx | C | Large | B1, B3, A2 |
| C2 | Wire ReviewScreen | C | Tiny | C1 |
| D1a | Explorer: shell + overlays | D | Medium | A3, A4, C1, C2 |
| D1b | Explorer: interactive board | D | Medium | D1a |
| D1c | Explorer: Prev/Next nav | D | Small | D1b |
| D1d | Explorer: Start new game | D | Medium | B2, D1b |
| D1e | Explorer: Deep Reveal | D | Medium | D1b |
| D2 | Wire ExplorerScreen | D | Tiny | D1a-D1e |
| E1 | Update api-conventions.md | E | Small | B1, B2, B3 |
| E2 | Update data-model.md | E | Small | A1 |
| F1 | QA: parity gate | F | Small | D1b |
| F2 | QA: golden path | F | Medium | All |
| F3 | QA: edge cases | F | Medium | All |

**Recommended implementation order**:
1. A1, A2 (parallel — no dependencies)
2. A3 -> A4 (sequential — refactor then verify)
3. B2, B3 (parallel — no shared dependencies)
4. B1 (after A2 — needs i18n keys)
5. C1 + C2 (after B1 + B3)
6. D1a-D1e + D2 (after A3+A4, B2, C1+C2)
7. E1 + E2 (after all implementation)
8. F1 + F2 + F3 (after all implementation)
