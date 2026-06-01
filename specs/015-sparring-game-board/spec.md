# Feature Specification: Sparring — Difficulty Picker & Game Board (Epic 3a)

**Feature Branch**: `101-new-design`
**Created**: 2026-06-01
**Status**: Draft

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Choose Difficulty and Start a Game (Priority: P1)

A user opens Sparring from the Home Hub. They arrive at the Difficulty Picker, choose a difficulty level and which player color to be, then tap "Start game" to begin.

**Why this priority**: The Difficulty Picker is the entry point to all Sparring. Without it the Game Board is unreachable and nothing else in this epic can be tested.

**Independent Test**: Navigate to the `difficulty` screen, verify the four radio rows are displayed with Medium pre-selected, toggle the "Play as" cards, tap "Start game", and confirm the `game` screen opens.

**Acceptance Scenarios**:

1. **Given** the user is on the `difficulty` screen, **When** it renders, **Then** four difficulty radio rows appear (Easy / Medium / Hard / Perfect) with Medium selected by default and a "DEFAULT" badge next to Medium.
2. **Given** the user taps a different difficulty row, **When** the selection changes, **Then** the newly tapped row shows the selected state and Medium is deselected.
3. **Given** the "Play as" section is visible, **When** the user taps the Green card, **Then** `side` is set to `'first'` (moves first); tapping the Gray card sets `side` to `'second'` (moves second). Display labels read "moves first" and "moves second".
4. **Given** difficulty and side are chosen, **When** the user taps "Start game", **Then** `track('game_started', { difficulty, side })` fires and navigation goes to the `game` screen with the chosen `difficulty` and `side` as params.
5. **Given** the user is on the `difficulty` screen, **When** they tap the back arrow, **Then** they navigate to the `home` screen.

---

### User Story 2 — Play a Game Against the AI (Priority: P1)

A user on the Game Board sees the board, the Coach dialog, and taps columns to play moves. The AI responds after each human move. The Coach reacts after every move (human and AI).

**Why this priority**: This is the core interactive loop of the Sparring surface. All commentary, game state, and record persistence depend on moves being committed and AI responses arriving correctly.

**Independent Test**: Start a game as Green (first), tap a column, verify the disc animates in, `POST /api/evaluate-move` is called with the correct movestring and col, the Coach dialog updates with a phrase, and the AI responds after a short delay with its own disc.

**Acceptance Scenarios**:

1. **Given** the game screen is open and it is the user's turn, **When** the user taps a column, **Then** the disc animates into the lowest available row (drop animation via `lastDrop` prop) and `POST /api/evaluate-move` is called immediately with the movestring before the play and the 0-indexed column.
2. **Given** `POST /api/evaluate-move` responds, **When** the `coachPhraseKey` field is received, **Then** the CoachDialog updates with `t(coachPhraseKey)` and the mood from `coachMood`.
3. **Given** the user has played, **When** the AI computes its move, **Then** the AI's disc animates into place and the CoachDialog shows a phrase from the `coach.sparring.ai_move.*` i18n pool (resolved via `t()`).
4. **Given** `side='second'`, **When** the `game` screen mounts, **Then** the AI auto-plays its opening move immediately before the user can interact; the board becomes interactive only after the AI move settles.
5. **Given** a column is already full, **When** the user taps it, **Then** no move is made (the `Board` blocks taps on full columns).
6. **Given** the game is in progress, **When** the "Move N" meta counter is shown in the TopBar, **Then** N increments by 1 after every move (human or AI).

---

### User Story 3 — Receive Optional Hint (Priority: P2)

During the user's turn the user taps "Hint". The Coach highlights the best column(s) on the board with a green overlay and names the reason in the Coach dialog. The hint is dismissed when the next move is played.

**Why this priority**: Hints are the primary teaching mechanism during Sparring. They must be non-intrusive (no numeric scores) and accurate (derived from the solver + classifier).

**Independent Test**: During the user's turn tap "Hint", verify `tg` overlays appear on the column(s) whose solver score ties the maximum, and verify the CoachDialog phrase is resolved from `coach.sparring.hint.generic.*` without any raw scores in the UI.

**Acceptance Scenarios**:

1. **Given** it is the user's turn, **When** the Hint button is tapped, **Then** the board shows `tg`-type overlays on the landing row of every column whose solver score ties the best score. No numeric scores appear anywhere.
2. **Given** the hint is shown (MVP), **When** the CoachDialog updates, **Then** it always shows a phrase from `coach.sparring.hint.generic.*`. Pattern-named hint phrases are a post-MVP follow-up and require no new endpoint in this epic.
3. **Given** the hint is shown, **When** the CoachDialog updates, **Then** the phrase is resolved via `t(key)` (never a raw string).
4. **Given** the hint is active, **When** the user plays a move, **Then** the `tg` overlays are removed immediately before or as the disc animates in.
5. **Given** the hint is active, **When** the user taps the Hint button again, **Then** the hint toggles off (overlays removed, Coach dialog returns to its last non-hint message).

---

### User Story 4 — AI Makes a Deliberate Mistake (Priority: P2)

Occasionally the AI plays a suboptimal move intentionally and announces it via the Coach dialog. The rate depends on the chosen difficulty.

**Why this priority**: Deliberate mistakes are the core pedagogical mechanic of the Sparring surface. They must be reliably triggered at the configured rate and clearly announced without revealing numeric scores.

**Independent Test**: At Easy difficulty, play through several games; verify that roughly every 4 AI moves the Coach dialog shows a phrase from the `coach.sparring.deliberate_mistake.*` pool and the move played was the second-best by solver score (not the optimal move).

**Acceptance Scenarios**:

1. **Given** difficulty is Easy, **When** the deliberate-mistake trigger fires (approximately every 4 AI moves on average), **Then** the AI plays the second-best column (by solver score) instead of the sampled move, and the CoachDialog shows a phrase from `coach.sparring.deliberate_mistake.*`.
2. **Given** difficulty is Perfect, **When** any AI move executes, **Then** no deliberate mistake is ever triggered; the AI always plays from temperature sampling without override.
3. **Given** a deliberate mistake fires, **When** `POST /api/scores` responds with `{ scores: number[7] }`, **Then** the AI plays the legal column with the highest score strictly below the maximum (second-best). If no such column exists (all legal columns tie), the mistake is aborted and the AI plays normally via `coach.sparring.ai_move.*`.
4. **Given** a deliberate mistake does NOT fire, **When** the AI plays a normal move, **Then** the CoachDialog shows a phrase from `coach.sparring.ai_move.*` (not `deliberate_mistake.*`).
5. **Given** a deliberate mistake fires but the position has only one legal move, **When** there is no second-best column, **Then** the AI plays the only available move and announces via `coach.sparring.ai_move.*` (no mistake announcement for forced moves).

---

### User Story 5 — Game Ends and Record Is Saved (Priority: P1)

When the game ends (4-in-a-row, board full, or Resign), the completed game record is saved to the server and the user is navigated to the Post-Game Review screen.

**Why this priority**: Game record persistence is a hard requirement for Epic 3b (Post-Game Review uses the saved movestring). Without this the downstream epic cannot function.

**Independent Test**: Complete a game to any end condition, verify `POST /api/games` is called with the correct body fields, the returned `id` is included in the navigation params to the `review` screen, and `store.saveSparringRecord(result)` is also called.

**Acceptance Scenarios**:

1. **Given** the user completes a 4-in-a-row win, **When** the win is detected client-side by `checkWin(board, row, col, color)` (called with the coordinates of the last placed disc), **Then** `POST /api/games` is called with `{ device_uuid, moves, difficulty, side, result: 'win' }`, and navigation goes to `review` with the returned `{ id }` as a param.
2. **Given** the board becomes completely filled with no winner, **When** the draw condition is detected, **Then** `POST /api/games` is called with `result: 'draw'` and the full movestring, and navigation goes to `review`.
3. **Given** the user taps "Resign", **When** the resign action fires, **Then** `POST /api/games` is called with `result: 'loss'`, and navigation goes to `review`.
4. **Given** any game end condition, **When** `POST /api/games` responds with `{ id }`, **Then** `store.saveSparringRecord(result)` and `store.recordActivityDay()` are called, and `track('game_ended', { result, moveCount, difficulty })` fires before navigation.
5. **Given** the user is anonymous (no authenticated session), **When** the game ends, **Then** `POST /api/games` is called without an Authorization header; the server creates a row with `user_id = null` keyed by `device_uuid`, and a game `id` is still returned and passed to the review screen.

---

### Edge Cases

- **Mid-game app navigation**: If the user navigates away (taps back, etc.) during an active game without Resign, the game is silently abandoned — no record is written and no error is shown.
- **`POST /api/games` network failure**: If the save fails, show no blocking error to the user; navigate to `review` with no `id` param. The `review` screen (Epic 3b) must handle a missing game ID gracefully.
- **AI response timeout**: If the server call for AI move selection takes too long, the board must remain in a loading state (not interactive) until the AI move resolves or an error is shown.
- **Forced move (one legal column)**: If exactly one column is legal, the user's column tap fires normally (accuracy formula excludes forced moves from denominator — handled in Epic 3b scorer, not here).
- **`side='second'` + AI-first parity**: When the AI plays move 1, the user's first move evaluation must pass the full movestring (AI's move + user's move) to `POST /api/evaluate-move`. **Known bug note**: the human/AI move-perspective was historically swapped in AI-first games (`project_parity_bug_ai_first`). This spec does NOT fix the bug but the implementation must verify that the coach phrase quality (optimal/suboptimal/blunder) is computed from the *user's* perspective, not the AI's. A manual verification step is required: after implementing, test an AI-first game and confirm the quality badge reflects the user's move quality.
- **All columns full before game-end detection**: Board-full detection must fire after every AI move as well as every human move.

---

## Requirements *(mandatory)*

### Functional Requirements

**Difficulty Picker screen (`difficulty`)**

- **FR-001**: The screen MUST display four difficulty options as selectable radio rows: Easy, Medium, Hard, Perfect. Medium MUST be pre-selected on first load.
- **FR-002**: Each difficulty row MUST show its name and a subtitle description. Medium MUST display a "DEFAULT" badge.
- **FR-003**: The "Play as" section MUST display two card buttons (Green / Gray) representing `side='first'` (moves first) and `side='second'` (moves second). The currently selected side MUST be visually distinguished.
- **FR-004**: Tapping "Start game" MUST call `track('game_started', { difficulty, side })` with `side` encoded as `'first'` or `'second'` (never color words), then navigate to the `game` screen passing `difficulty` and `side` as params.
- **FR-005**: Tapping the back arrow MUST navigate to the `home` screen.

**Game Board screen (`game`)**

- **FR-006**: The screen MUST show a `CoachDialog` with the `fixed` prop above the board. The dialog MUST always be visible and MUST NOT shift the board position.
- **FR-007**: The board MUST be interactive only during the user's turn (`canPlay={userTurn && !gameOver}`). Tapping a column commits the move immediately (no confirmation step).
- **FR-008**: After every user move, the client MUST call `POST /api/evaluate-move` with the movestring before the move and the 0-indexed column. The `coachPhraseKey` and `coachMood` in the response MUST be used to update the CoachDialog. If `coachPhraseKey` is `null` (no pattern detected on a non-tactical move), the client MUST instead pick a random phrase from the `coach.sparring.user_move.generic.*` pool — the CoachDialog MUST NOT be left blank.
- **FR-009**: After the AI plays a move, the CoachDialog MUST update with a phrase resolved from `coach.sparring.ai_move.*` (normal move) or `coach.sparring.deliberate_mistake.*` (deliberate mistake). No raw scores may appear.
- **FR-010**: The TopBar MUST show title "Game", a back arrow (→ `difficulty` screen), a "Move N" meta counter that increments after each move (human or AI), and a non-functional `gear` icon placeholder.
- **FR-011**: The Toolbar MUST contain a "Hint" toggle button and a "Resign" button. No Undo button.
- **FR-012**: Tapping "Hint" MUST call `POST /api/scores` with body `{ moves }` for the current position. The response `{ scores: number[7] }` is a 7-element array of per-column solver scores; invalid/full columns are masked with a sentinel value and MUST be filtered out before ranking. The implementation MUST identify all legal columns tied at the best score and render `tg`-type overlays on the landing row of those columns. A Coach phrase MUST be shown from `coach.sparring.hint.generic.*`. No numeric scores may appear anywhere. *(Pattern-named hint phrases are post-MVP.)*
- **FR-013**: The hint MUST be dismissed (overlays removed) when the user plays their next move.
- **FR-014**: Win detection MUST be performed client-side after every move (human and AI) using `checkWin(board, row, col, color)` called with the row, column, and color of the disc just placed. `checkWin` currently exists only as a private function inside `HomePage.jsx`; it MUST be extracted into `src/lib/board.js` (which already exports `buildBoard`) and exported from there before use here. Board-full detection MUST also run after every move.
- **FR-015**: On game end (win / draw / resign), the client MUST call `POST /api/games` with `{ device_uuid, moves, difficulty, side, result }`. The `side` field MUST be `'first'` or `'second'`. The endpoint returns `{ id }` which MUST be passed as a navigation param to the `review` screen.
- **FR-016**: On game end, `store.saveSparringRecord(result)` and `store.recordActivityDay()` MUST be called via `useStore()`. `track('game_ended', { result, moveCount, difficulty })` MUST fire before navigation to `review`.

**AI player logic**

- **FR-017**: When `side='second'`, the AI MUST auto-play its opening move immediately when the `game` screen mounts, before the board becomes interactive for the user.
- **FR-018**: Normal AI moves MUST use temperature-based softmax sampling as implemented in `aiDifficulty.js` (existing behavior, unchanged).
- **FR-019**: On each AI move, the deliberate-mistake trigger MUST be evaluated independently (not as a replacement for sampling). Trigger rates: Easy ~1/4 moves, Medium ~1/7, Hard ~1/15, Perfect never.
- **FR-020**: When a deliberate-mistake triggers, the client MUST call `POST /api/scores` with body `{ moves }`, filter out invalid/full-column sentinel values, then identify the second-best column: the legal column with the highest score strictly below the maximum. If all remaining legal columns share the same score (no strictly-lower alternative), the deliberate-mistake is aborted and the AI plays a normal move announced via `coach.sparring.ai_move.*`.
- **FR-021**: When only one legal column exists (forced move), the deliberate-mistake mechanic MUST be skipped and the AI plays the only legal move, announced via `coach.sparring.ai_move.*`.

**Backend**

- **FR-022**: `POST /api/games` MUST accept `{ device_uuid, moves, difficulty, side, result }`, validate all fields, insert a row into the `games` table (with `user_id` from `req.user` or `null`), and return `{ id }` with HTTP 201.
- **FR-023**: The `games` table MUST be created via a new DB migration with columns: `id` (uuid PK), `user_id` (uuid nullable FK), `device_uuid` (text not null), `moves` (text not null), `difficulty` (text not null), `side` (text not null), `result` (text not null), `created_at` (timestamptz default now()).

**i18n**

- **FR-024**: All Coach phrases MUST be resolved client-side via `t(key)`. The following key pools MUST be authored in `en.json` with at least 2 entries each: `coach.sparring.ai_move.*`, `coach.sparring.deliberate_mistake.*`, `coach.sparring.hint.generic.*`, `coach.sparring.intro.*`, `coach.sparring.user_move.generic.*` (fallback used when `POST /api/evaluate-move` returns `coachPhraseKey: null`; CoachDialog MUST never be left blank after a user move).
- **FR-025**: No raw English strings may be emitted by the server for Coach phrases. `coachPhraseKey` from `POST /api/evaluate-move` is always an i18n key string.
- **FR-026**: On mount, the CoachDialog MUST show a randomly selected phrase from the `coach.sparring.intro.*` pool. For `side='second'`, this intro phrase is immediately replaced by the AI's opening `coach.sparring.ai_move.*` phrase once the AI's opening move settles.

### Key Entities

- **Game**: A completed sparring game record. Fields: `id` (uuid), `user_id` (nullable), `device_uuid`, `moves` (0-indexed column movestring), `difficulty` (`'easy'|'medium'|'hard'|'perfect'`), `side` (`'first'|'second'`), `result` (`'win'|'loss'|'draw'`), `created_at`.
- **Move**: A single column choice (0-indexed integer 0–6) appended to the movestring. Alternates between user and AI.
- **Deliberate mistake**: An AI move where the second-best solver column overrides the sampled column. Announced via `coach.sparring.deliberate_mistake.*` pool.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can start a sparring game from the Home Hub in 3 taps or fewer (Hub → Difficulty Picker → Start game).
- **SC-002**: After every move, the Coach dialog updates within 1 second (human move: after `POST /api/evaluate-move` responds; AI move: after the AI disc settles).
- **SC-003**: The Hint shows the correct best-column overlays for every position tested (verified against c4solver scores for at least 5 sample positions).
- **SC-004**: A completed game record (any outcome) is successfully written to the server in 100% of cases when the network is available, including for anonymous users.
- **SC-005**: Deliberate mistakes fire at a rate within ±30% of the target frequency per difficulty across a sample of 20+ AI games (verified by logging or unit test of the trigger logic).
- **SC-006**: The `gear` icon is visible in the TopBar but produces no action when tapped (no crash, no navigation).

---

## Assumptions

- The `Board` component (from Epic 1a) is fully implemented with `overlays`, `lastDrop`, `canPlay`, `fullCols`, `badge`, and `compact` props as specified in `docs/architecture/frontend-conventions.md`.
- The `go(screenKey, params)` navigator (Epic 1b) is in place; no router API is used.
- `track()` from `src/lib/track.js` and `POST /api/track` are available (Epic 1b).
- `useStore()` returns a store with `saveSparringRecord(result)` and `recordActivityDay()` (Epic 7).
- `POST /api/evaluate-move` is available and returns `{ badge, quality, coachPhraseKey, coachMood, summaryLineKey, patternTag }` (Epic 2a).
- `POST /api/scores` is available (`app.post('/api/scores', ...)` in `server/index.js`). It accepts `{ moves, depth }` (depth is optional) and returns `{ scores: number[7] }` — a 7-element array where invalid/full columns are masked with a sentinel value. All callers must filter out the sentinel before ranking columns.
- `aiDifficulty.js` with temperature-based softmax sampling is already implemented; this epic extends it with the deliberate-mistake layer.
- `buildBoard(moves)` from `src/lib/board.js` is available for converting movestrings to board arrays.
- `checkWin(board, row, col, color)` currently exists as a private function inside `src/pages/HomePage.jsx` and is NOT exported. It must be extracted into `src/lib/board.js` as part of this epic's implementation tasks before any caller can use it.
- The `'red'` cell value renders as a green disc and `'yellow'` as a gray disc (board color inversion quirk). The implementation must account for this: when `side='first'` the user plays `'red'` discs (which render green); when `side='second'` the user plays `'yellow'` discs (which render gray).
- The `games` table does not yet exist; a new migration is required before this epic ships.
- Anonymous game rows (no `user_id`) are allowed and expected; the existing `loadUser` middleware handling of null users covers this.
- The `review` screen (Epic 3b) is not part of this epic. Navigation to `review` with the game `id` param is this epic's terminal action; what happens on that screen is out of scope here.
- Mid-game app abandonment (navigating away without Resign) results in no record being written; this is acceptable for MVP.
- The AI-first parity bug is known and not fixed in this epic. The implementation must manually verify correct move-quality perspective assignment in AI-first games.
