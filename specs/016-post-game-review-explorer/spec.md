# Feature Specification: Post-Game Review & Position Explorer (Epic 3b)

**Feature Branch**: `101-new-design`
**Created**: 2026-06-01
**Status**: Draft

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — View Post-Game Analysis After a Completed Game (Priority: P1)

After a sparring game ends (any outcome: win, loss, draw, or resign), the user is navigated to the Post-Game Review screen. The screen shows the board frozen at game end, a Coach summary phrase, and a move timeline that starts gray (pending) and fills in with quality colors as analysis resolves.

**Why this priority**: This is the entry point for all post-game learning. Without it, no game outcome yields educational value, blunders cannot be captured, and the Position Explorer is unreachable.

**Independent Test**: Complete a sparring game (any outcome), confirm the `review` screen opens, the board is frozen in the final position, the timeline shows only user-move nodes in pending state, and then scores arrive and update node colors one by one.

**Acceptance Scenarios**:

1. **Given** a game has just ended, **When** the `review` screen opens with a `gameId` param, **Then** `POST /api/games/analyze` is called immediately with `{ gameId }`; the Coach dialog shows a loading/neutral phrase while analysis is pending.
2. **Given** analysis is in progress, **When** per-move scores arrive, **Then** each timeline node updates from gray to the appropriate quality color (green = optimal, amber = suboptimal, red = blunder) as its score resolves.
3. **Given** analysis is complete, **When** `summaryPhraseKey` is received, **Then** the CoachDialog shows the phrase resolved via `t(summaryPhraseKey)` with no raw English string crossing the API.
4. **Given** analysis is complete and `scored > 0`, **When** the accuracy card renders, **Then** it displays `Math.round(optimalCount / scored * 100)%` and counts for Optimal / Suboptimal / Blunder alongside quality-dot legends.
5. **Given** analysis is complete and `scored === 0`, **When** the accuracy card renders, **Then** it shows `--` (not `0%`, not a division error) and the quality counts still display.
6. **Given** analysis completes with one or more blunders and the user is authenticated, **When** blunder data is available, **Then** a fire-and-forget write is made to the `blunders` table for each blunder move (`puzzle_id = null`); this write does not block navigation or UI.
7. **Given** the user is anonymous, **When** blunders are found in analysis, **Then** no blunder write is attempted (requires `user_id`).
8. **Given** analysis completes, **When** `track` fires, **Then** `track('game_reviewed', { gameId, accuracy, blunderCount })` is called exactly once.

---

### User Story 2 — Navigate the Move Timeline and Enter Position Explorer (Priority: P1)

The user sees the timeline of their moves and taps a non-optimal node to rewind the board and explore that mistake in the Position Explorer.

**Why this priority**: The timeline and Position Explorer are the core learning loop. Without tappable nodes, no mistake review is possible.

**Independent Test**: After analysis, tap a suboptimal or blunder node; verify the `explorer` screen opens with the board rewound to that position, showing a `tr` overlay on the user's played column.

**Acceptance Scenarios**:

1. **Given** the timeline is rendered, **When** the user inspects it, **Then** only user moves appear, numbered sequentially 1, 2, 3, … in user-move order (AI moves are not shown and not counted).
2. **Given** a node has quality `suboptimal` or `blunder`, **When** the user taps it, **Then** navigation goes to the `explorer` screen with the game ID, the selected `moveIndex`, and the full move history context.
3. **Given** a node has quality `optimal`, **When** the user taps it, **Then** nothing happens (optimal nodes are not interactive).
4. **Given** the game has no non-optimal moves (clean game), **When** analysis completes, **Then** the CoachDialog shows a phrase from the `coach.sparring.review.clean.*` pool, and Prev/Next mistake navigation buttons are disabled.
5. **Given** the game has at least one mistake, **When** analysis completes, **Then** the CoachDialog shows a phrase from the `coach.sparring.review.mistakes.*` pool.

---

### User Story 3 — Explore a Mistake Position and Try Alternative Moves (Priority: P1)

The user is in Position Explorer at a specific mistake position. The board is rewound to that move, overlays show what happened, and the user can play a different column to see how the game could have gone. The AI responds at the same difficulty as the original game.

**Why this priority**: The interactive exploration is the core learning mechanism. Seeing the consequence of a better move cements understanding.

**Independent Test**: Navigate to the Explorer from a blunder node; verify the board shows the position before the mistake with `tr` overlay on the played column; tap a different column; verify the AI responds and the CoachDialog updates.

**Acceptance Scenarios**:

1. **Given** the Explorer opens for a mistake at `moveIndex N`, **When** the board renders, **Then** the position reflects the game state just before move N; the column played at move N carries a `tr` overlay; threat cells carry `td` overlays.
2. **Given** the board is rewound and it is the user's turn, **When** the user taps a column, **Then** the disc animates in, `POST /api/evaluate-move` is called, and the CoachDialog updates with the response phrase. The AI then responds at the original game's difficulty.
3. **Given** the user tries an alternative move, **When** the AI responds, **Then** the AI uses the same difficulty level as the original sparring game (passed as a param from the Review screen).
4. **Given** the Explorer is open, **When** the user taps "Start new game from here", **Then** `POST /api/games/from-position` is called with `{ gameId, N, difficulty }` and the response payload is used to navigate to the `game` screen; the original reviewed game record is unchanged.
5. **Given** the game had multiple mistakes, **When** the user taps "Prev mistake" or "Next mistake", **Then** the Explorer navigates to the adjacent non-optimal user-move node (skipping optimal nodes).
6. **Given** the user is on the first mistake, **When** the user taps "Prev mistake", **Then** the button is disabled (no previous mistake exists).
7. **Given** the user is on the last mistake, **When** the user taps "Next mistake", **Then** the button is disabled (no next mistake exists).

---

### User Story 4 — Use Deep Reveal on a Mistake Move (Priority: P2)

From the Position Explorer, the user taps a "Deep Reveal" button visible while viewing a mistake node to get an LLM explanation of the mistake position, with caching and flag support.

**Why this priority**: Deep Reveal is the Tier 2 learning layer. It requires the basic Explorer flow (User Story 3) to be functional first.

**Independent Test**: Navigate to Explorer for a blunder node, tap the "Deep Reveal" button in the Explorer toolbar; verify the cache is checked first, the LLM is called on miss, the explanation panel renders below the board, and the flag button writes to `llm_feedback`.

**Acceptance Scenarios**:

1. **Given** the Explorer shows a non-optimal mistake node, **When** the user taps the "Deep Reveal" button, **Then** the cache key `SHA256(movestring + ":" + col)` is checked in `explanation_cache` first; on a hit the panel renders instantly with no spinner and `cached: true`.
2. **Given** a cache miss, **When** the Deep Reveal is triggered, **Then** `POST /api/explain-move-llm` is called, a loading spinner is shown; on response the panel shows the LLM explanation and `bestLine` chips; the result is written to `explanation_cache` (fire-and-forget).
3. **Given** the Deep Reveal panel is open, **When** the user taps "Flag this explanation", **Then** a write is made to the `llm_feedback` table with `feature: 'position_explorer'`; a brief confirmation is shown; the panel remains open.
4. **Given** the Deep Reveal panel opens (cache hit or miss), **When** tracking fires, **Then** `track('deep_reveal_viewed', { context: 'position_explorer', cached })` is called exactly once per panel open.
5. **Given** the mistake_reviewed tracking, **When** the user enters Explorer for a node, **Then** `track('mistake_reviewed', { gameId, moveIndex, category })` fires where `category` is the `patternTag` from the analyze response (may be `null`).
6. **Given** the Deep Reveal LLM call times out (>6s), **When** the timeout fires, **Then** the panel shows the Tier 1 classifier phrase (from `patternTag` if available, otherwise a generic phrase) and "Detailed explanation unavailable." — no retry is attempted.
7. **Given** the Deep Reveal is triggered by an anonymous user, **When** the `/api/explain-move-llm` endpoint returns 401, **Then** the Explorer shows the `AuthModal` instead of the Deep Reveal panel.

---

### Edge Cases

- **Missing `gameId` param**: If the `review` screen opens without a `gameId` (e.g., network failure during game save), the screen must render gracefully — show no timeline, show no accuracy card, display a neutral Coach phrase ("Game not saved — analysis unavailable."), and disable Prev/Next.
- **`POST /api/games/analyze` network failure**: Show all nodes in an error/neutral state, display an error Coach phrase, keep the frozen board visible so the user can see the end position.
- **`POST /api/games/analyze` returns 404**: The game ID was not found (e.g., anonymous user whose row was never written). Same treatment as network failure — show neutral nodes, neutral phrase.
- **Explorer with no legal moves at rewound position**: Position is terminal (game was already decided). Disable column taps; show "This position is terminal — no moves available."
- **`POST /api/games/from-position` failure**: Show a brief error message; keep the user in Explorer (do not navigate away).
- **Deep Reveal LLM timeout (>6s)**: Show the Tier 1 classifier phrase + "Detailed explanation unavailable."
- **Deep Reveal for anonymous user**: The quota gate (Epic 7) returns 401 for unauthenticated requests to `/api/explain-move-llm`; the Explorer must show the `AuthModal` instead of the Deep Reveal panel.
- **All user moves were forced**: `scored === 0`. Accuracy card shows `--`. All timeline nodes render with their quality color (the server still assigns quality to forced moves); only the accuracy denominator excludes them.
- **AI-first parity verification gate**: When `side = 'second'` (user was the second mover), the Explorer board must assign the correct disc color to the user's alternative moves. This must be manually verified before shipping: play as Gray, resign, enter Explorer, try a move, and confirm the user's disc renders as Gray (not Green).

---

## Requirements *(mandatory)*

### Functional Requirements

**Post-Game Review screen (`review`)**

- **FR-001**: On mount, the screen MUST call `POST /api/games/analyze` with `{ gameId }`. The `gameId` is received as a navigation param from the Game Board.
- **FR-002**: The screen MUST display a compact, non-interactive Board frozen at game end using the full movestring returned by the analyze endpoint (derived from the `games` table, not stored separately in the client).
- **FR-003**: The move timeline MUST show **only user moves** numbered 1, 2, 3, … in the order they were played. AI moves MUST NOT appear as nodes.
- **FR-004**: Each timeline node MUST start in a pending (neutral gray) state. As each move's analysis resolves, the node MUST update to: green (optimal), amber (suboptimal), or red (blunder).
- **FR-005**: Tapping a non-optimal node (suboptimal or blunder) MUST navigate to the `explorer` screen, passing the `gameId`, `moveIndex`, the full `moves` array from analysis, and the original game's `difficulty` and `side`.
- **FR-006**: Optimal nodes MUST NOT be tappable (no navigation on tap).
- **FR-007**: When `scored > 0`, the accuracy card MUST display `Math.round(optimalCount / scored * 100)` as a percentage, and counts for each quality tier (Optimal / Suboptimal / Blunder).
- **FR-008**: When `scored === 0`, the accuracy card MUST display `--` for accuracy (never divide by zero).
- **FR-009**: The CoachDialog MUST show the phrase `t(summaryPhraseKey)` once analysis is complete. The `summaryPhraseKey` is returned by the server from the `coach.sparring.review.clean.*` pool (zero blunders) or `coach.sparring.review.mistakes.*` pool (≥1 blunder). The client MUST NOT construct or guess this key.
- **FR-010**: If the game has zero non-optimal moves (no suboptimal, no blunder nodes), the Prev/Next mistake navigation buttons MUST be disabled.
- **FR-011**: On analysis complete, for each move where `quality === 'blunder'`, the client MUST fire-and-forget a write to the `blunders` table with `{ user_id, board_state, move_played, correct_move: bestCol, pattern_category: <coerced>, puzzle_id: null }`. The `pattern_category` field is NOT NULL and constrained to the valid slug set by a CHECK constraint. The server (or client just before the write) MUST coerce a `null` or unrecognized `patternTag` to the sentinel slug `'unknown'`. A new migration MUST add `'unknown'` to the `blunders.pattern_category` CHECK constraint before this write path is exercised. This write MUST only execute when `req.user` / `session.user_id` is present. The write MUST NOT block any UI update or navigation.
- **FR-012**: `track('game_reviewed', { gameId, accuracy, blunderCount })` MUST fire once when analysis completes. `accuracy` is `Math.round(optimalCount / scored * 100)` (or `null` when `scored === 0`); `blunderCount` is the count of `quality === 'blunder'` moves.
- **FR-013**: The `review` and `explorer` screen keys MUST be in the `sparring` surface group, mapped to `--bg-sparring` via `surfaceGroups.js`.

**Position Explorer screen (`explorer`)**

- **FR-014**: On mount, the Explorer MUST show the board rewound to the game state immediately before the selected `moveIndex` (i.e., the movestring for the first `userMoveOrdinal × 2 - (side==='first' ? 1 : 0)` total plies, depending on who opened). The selected column (where the user played at that move) MUST have a `tr` overlay on its landing row. Threat cells MUST have `td` overlays.
- **FR-015**: The Explorer MUST reuse the interactive board logic from the Epic 3a `GameScreen` (extracted hooks or sub-components) rather than implementing an independent board engine. The disc color assigned to the user in the Explorer MUST match the original game's `side` value.
- **FR-016**: **AI-first parity verification (QA gate)**: When `side = 'second'`, the Explorer must correctly assign Gray discs to the user's alternative moves. Before shipping, a manual QA step MUST confirm this: play a game as Gray, resign after ≥3 moves, enter Explorer at move 1, play any column, and verify the disc renders as Gray. This check catches the parity bug documented in project memory (`project_parity_bug_ai_first`).
- **FR-017**: The AI MUST respond to the user's alternative moves using the same difficulty setting as the original game (received as `difficulty` param). Deliberate-mistake logic MAY be enabled (same as live game).
- **FR-018**: The "Start new game from here" button MUST call `POST /api/games/from-position` with `{ gameId, N, difficulty }` where `N` is the total number of moves played up to the selected mistake position (not user-move ordinal). On success, the response payload MUST be used to navigate to the `game` screen as if starting a new game from that position. The original `gameId` record is not modified.
- **FR-019**: Prev/Next mistake buttons MUST navigate between adjacent non-optimal nodes in user-move order. Optimal nodes MUST be skipped. Buttons MUST be disabled at the boundaries (first/last mistake).
- **FR-020**: A "Deep Reveal" button MUST be visible in the Explorer toolbar/footer whenever a non-optimal mistake node is selected. Tapping the button opens the Deep Reveal panel below (or overlaying) the board. The button MUST NOT appear when an optimal node is selected.
- **FR-021**: When the Deep Reveal panel is opened, it MUST check `explanation_cache` using key `SHA256(movestring + ":" + col)` before calling the LLM. On cache hit, render instantly with no spinner. On cache miss, call `POST /api/explain-move-llm`, show spinner, write result to cache on response (fire-and-forget). The panel MUST show the LLM explanation text and `bestLine` chips once loaded.
- **FR-022**: When the Deep Reveal LLM call times out (>6s) or returns an error, the panel MUST show the Tier 1 classifier phrase (from `patternTag` if available, otherwise a generic phrase) and "Detailed explanation unavailable." No LLM retry is attempted.
- **FR-023**: "Flag this explanation" MUST call `POST /api/llm-feedback` with `{ movestring, llm_prompt, llm_response, human_note: '', feature: 'position_explorer' }`. A brief confirmation toast/message MUST be shown. The panel MUST remain open.
- **FR-024**: `track('mistake_reviewed', { gameId, moveIndex, category })` MUST fire when the Explorer mounts for a given node, where `category` is the `patternTag` from the analyze response (may be `null`).
- **FR-025**: `track('deep_reveal_viewed', { context: 'position_explorer', cached })` MUST fire when the Deep Reveal panel opens, where `cached` reflects whether the response was served from cache.

**Backend: `POST /api/games/analyze`**

- **FR-026**: The endpoint MUST accept `{ gameId }` only. It MUST NOT require `side` or `difficulty` in the request body — these are fetched from the `games` table by `gameId`. If `gameId` is missing or the game is not found, return 400 or 404 respectively.
- **FR-027**: The endpoint MUST score only user plies. Given the `side` from the `games` row: if `side = 'first'`, user plies are at 0-indexed positions 0, 2, 4, … in the movestring; if `side = 'second'`, user plies are at 1, 3, 5, ….
- **FR-028**: For each user ply, the endpoint MUST apply the shared move-quality scorer (from Epic 2a). Every non-forced user move receives a quality score: `'optimal'`, `'suboptimal'`, or `'blunder'`. There is no timeout-based null quality.
- **FR-029**: A forced move (the position has exactly one legal column) MUST be excluded from `scored`. Forced-move detection: a position has exactly one legal column when all other 6 columns are either full or would be an invalid move. Forced moves still appear in the `moves` array with their quality color assigned by the scorer; only the accuracy denominator excludes them.
- **FR-030**: The endpoint MUST return:
  ```json
  {
    "moves": [{ "moveIndex": 1, "col": 3, "quality": "optimal"|"suboptimal"|"blunder", "score": number, "bestScore": number, "bestCol": number, "patternTag": string|null }],
    "accuracy": number,
    "optimalCount": number,
    "suboptimalCount": number,
    "blunderCount": number,
    "scored": number,
    "summaryPhraseKey": "coach.sparring.review.clean.0" | "coach.sparring.review.mistakes.1" | ...,
    "fullMovestring": "<complete game movestring>",
    "difficulty": "easy"|"medium"|"hard"|"perfect",
    "side": "first"|"second"
  }
  ```
  `fullMovestring` is the complete game movestring (needed by the client to render the frozen board without storing it separately). `accuracy` is `optimalCount / scored` (0 if `scored === 0`). `summaryPhraseKey` is selected via `pickFromPool` from the appropriate key pool based on blunder count. `difficulty` and `side` are top-level fields fetched from the `games` row — passed through so the Review screen can forward them to the Explorer without a second DB call.
- **FR-031**: Auth: the endpoint MUST work for both authenticated and anonymous users (`loadUser` runs; `req.user` may be null). No auth required to analyze a game.

**Backend: `POST /api/games/from-position`**

- **FR-032**: The endpoint MUST accept `{ gameId, N, difficulty }`. It MUST fetch `side` from the `games` row by `gameId` (never from the client). If the game is not found, return 404.
- **FR-033**: The endpoint MUST compute which player moves next: `N % 2 === 0 ? firstPlayer : secondPlayer`, where `firstPlayer` is the user if `side = 'first'`, or the AI if `side = 'second'`.
- **FR-034**: The response MUST be a game init payload sufficient for the `game` screen to start from position N: `{ moves: <first N chars of movestring>, side, difficulty }`. No `gameId` is returned and no `games` row is inserted at this point. When the spawned game ends, `GameScreen.saveGame` calls `POST /api/games` to create the real row — exactly as it does for any new game. This avoids phantom rows with a fake `result` placeholder.
- **FR-035**: Auth: same as `POST /api/games` — optional auth; anonymous users may start from-position games and their new game row is persisted with `device_uuid`.

**i18n**

- **FR-036**: The following key pools MUST be authored in `en.json` with at least 2 entries each:
  - `coach.sparring.review.clean.*` — e.g., "Clean game. Nothing to revisit.", "Excellent — no mistakes to review."
  - `coach.sparring.review.mistakes.*` — e.g., "Good game. One parity mistake decided it.", "A few moments to learn from — let's look."
- **FR-037**: All Coach phrases in Post-Game Review and Explorer MUST be resolved via `t(key)`. No raw English string may cross the API boundary.

### Key Entities

- **GameAnalysis**: The result of `POST /api/games/analyze`. Contains `moves` array (user plies only), `accuracy`, `optimalCount`, `suboptimalCount`, `blunderCount`, `scored`, `summaryPhraseKey`, `fullMovestring`, `difficulty`, and `side`. Ephemeral — not persisted; computed on demand.
- **AnalyzedMove**: One entry in the `moves` array. Fields: `moveIndex` (1-based user ordinal), `col` (0-indexed), `quality` (`'optimal'|'suboptimal'|'blunder'`), `score`, `bestScore`, `bestCol`, `patternTag`. Quality is never null — every non-forced move gets a definitive score.
- **Blunder** (existing `blunders` table): Written as a side-effect of analysis. `puzzle_id = null` for game-sourced blunders; `user_id` required. `pattern_category` is coerced to `'unknown'` when `patternTag` is null or unrecognized; the CHECK constraint must include `'unknown'` (new migration required).
- **ExplorerState**: Client-only ephemeral state. Tracks the rewound movestring, which mistake is selected, and the list of non-optimal `moveIndex` values for Prev/Next navigation.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can open Post-Game Review, see the full analysis timeline, and tap a mistake to enter Position Explorer — all within 15 seconds of the game ending (assuming network available and <20 user moves analyzed).
- **SC-002**: The frozen board and pending timeline render immediately on screen open (before any analysis arrives), with no blank-screen flash.
- **SC-003**: Per-move analysis nodes update in real time as scores arrive — the user can see progress during analysis, not only the final result.
- **SC-004**: Accuracy is displayed correctly for all games tested: clean games show the actual percentage; short games where all moves were forced show `--`.
- **SC-005**: The Position Explorer correctly assigns the user's disc color (Green or Gray) based on the original game's `side` for all games tested — including games where the AI moved first.
- **SC-006**: Deep Reveal opens instantly for any position that has been previously analyzed by any user (cache hit), with no loading spinner.
- **SC-007**: Blunder writes for an authenticated user's game with 3 blunders result in exactly 3 rows in the `blunders` table, each with `puzzle_id = null` and `pattern_category` set to a valid slug (or `'unknown'`), without blocking navigation to the Explorer.

---

## Assumptions

- The `games` table exists and is populated by Epic 3a (`POST /api/games`); migration 026 is applied.
- The `blunders` table exists (from earlier migrations 001/005) with columns `id`, `user_id`, `puzzle_id`, `board_state`, `move_played`, `correct_move`, `pattern_category`, `resolved_at`, `created_at`. **A new migration IS required** to add `'unknown'` to the `blunders.pattern_category` CHECK constraint, enabling the sentinel write path in FR-011.
- The shared move-quality scorer module from Epic 2a is importable server-side and accepts a movestring + column; this epic calls it per-ply without going through the full `/api/evaluate-move` HTTP handler.
- The `explanation_cache` table exists (from earlier migrations) with columns `position_hash`, `one_liner`, `deep_reveal_json`.
- `POST /api/explain-move-llm` is available and handles auth gating (401 for anonymous), quota enforcement (429 for free-tier exhausted), and cache writing — as specified in `docs/architecture/api-conventions.md`.
- `POST /api/llm-feedback` is available for flag writes.
- The `Board` component (Epic 1a) supports `overlays`, `lastDrop`, `canPlay`, `compact`, and `fullCols` props as defined in `docs/architecture/frontend-conventions.md`.
- `go(screenKey, params)` is the sole navigation mechanism; no router API is used.
- `useStore()` returns a store with the methods required for blunder writes (the `user_id` is accessible via `session` from `useStore()`).
- `track()` from `src/lib/track.js` is available; it never blocks and swallows errors.
- The `review` and `explorer` screen keys are already registered (or will be registered in this epic) in `src/lib/screenRegistry.jsx` and mapped to `--bg-sparring` via `src/lib/surfaceGroups.js`.
- The AI-first parity bug (`project_parity_bug_ai_first`) is **not fixed** in this epic. The spec includes a manual QA gate (FR-016) to detect it; the fix itself is deferred.
- The `from-position` endpoint creates a new `games` row immediately (persisted with `device_uuid` for anonymous users). The new game is a separate entity from the reviewed game and proceeds through the same Game Board flow.
- `patternTag` in the analyze response may be `null` for moves on positions that do not match any named pattern. The client must guard against this when passing `category` to `track('mistake_reviewed', ...)`, and must coerce it to `'unknown'` for the `blunders.pattern_category` write.
- The solver used in the analyze endpoint is fast enough that no per-move timeout is required. All non-forced user moves receive a definitive quality score.
