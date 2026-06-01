# Tasks: Sparring — Difficulty Picker & Game Board (Epic 3a)

**Input**: `specs/015-sparring-game-board/`  
**Branch**: `101-new-design`  
**Date**: 2026-06-01

**Organization**: Tasks are grouped by user story to enable independent implementation and testing. Phases A–D are foundational and must complete before Phase E (screens).

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other [P] tasks in the same phase (different files, no shared dependency)
- **[Story]**: User story this task belongs to (US1–US5)
- Exact file paths are included in every task description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: No new project initialization needed — existing React SPA. This phase covers the one structural prerequisite that all screens and logic depend on.

- [ ] T001 Extract `checkWin(board, row, col, color)` from `connect-four/src/pages/HomePage.jsx` (line 39) into `connect-four/src/lib/board.js` as a named export alongside `buildBoard`; update `HomePage.jsx` to import it from `board.js` instead of defining it locally; add a smoke assertion (inline comment or console assert) calling `checkWin` on a known 4-in-a-row position produced by `buildBoard` to confirm row-major indexing is consistent

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend table, endpoint, logic-layer extensions, and i18n key pools that US2–US5 depend on. These can be worked in parallel with each other after Phase 1, but ALL must complete before any screen task begins.

**⚠️ CRITICAL**: No user story screen work (Phase 3+) can begin until this phase is complete.

- [ ] T002 [P] Create DB migration `connect-four/server/migrations/026_games.sql` with the `games` table schema (columns: `id`, `user_id`, `device_uuid`, `moves`, `difficulty`, `side`, `result`, `created_at`), the composite index on `(device_uuid, created_at DESC)`, and `GRANT SELECT, INSERT ON games TO anon, authenticated;` — apply migration to development DB before proceeding
- [ ] T003 [P] Add `POST /api/games` handler to `connect-four/server/index.js`: validate all five body fields per `contracts/api-games.md` (moves regex `/^[0-6]{0,42}$/`, difficulty/side/result enum checks), insert into `games` table via supabase service-role client with `user_id: req.user?.id ?? null`, return `{ id }` with HTTP 201; handle 400 validation errors and 503 if supabase not configured (depends on T002 for table to exist)
- [ ] T004 [P] Extend `connect-four/src/lib/aiDifficulty.js`: add exported constant `MISTAKE_RATES = { easy: 1/4, medium: 1/7, hard: 1/15, perfect: 0 }` and exported function `secondBestColumn(scores)` that imports `INVALID_MOVE` from the top of the same file (do NOT redeclare it), filters out sentinel values, finds the highest score strictly below the maximum, and returns `null` if fewer than 2 legal columns or all legal columns tie the maximum
- [ ] T005 [P] Write unit tests for `secondBestColumn()` in `connect-four/src/lib/aiDifficulty.test.js` (or nearest existing test file): cover (a) normal case — second-best column returned, (b) all-tied abort — returns `null`, (c) sentinel filtering — columns with score `<= INVALID_MOVE` excluded, (d) single legal column — returns `null`; run tests and confirm all pass (depends on T004)
- [ ] T006 [P] Author all `coach.sparring.*` key pools in `connect-four/src/i18n/en.json`: add `coach.sparring.intro.0`, `coach.sparring.intro.1`; `coach.sparring.ai_move.0`, `.1`, `.2`; `coach.sparring.deliberate_mistake.0`, `.1`; `coach.sparring.hint.generic.0`, `.1`; **`coach.sparring.user_move.generic.0`, `.1`, `.2`** (2–3 entries, used as fallback when `POST /api/evaluate-move` returns `coachPhraseKey: null`) — minimum 2 entries per pool, all in English, no raw scores; in `GameScreen.jsx` T009 step 5, after receiving the `evaluate-move` response, if `coachPhraseKey` is null pick a random phrase from the `coach.sparring.user_move.generic.*` pool instead of leaving CoachDialog blank (see FR-024)

**Checkpoint**: Foundation complete — T001–T006 all done. Screen implementation (Phase 3+) can now begin.

---

## Phase 3: User Story 1 — Choose Difficulty and Start a Game (Priority: P1) 🎯 MVP

**Goal**: Deliver the Difficulty Picker screen so a user can select difficulty + side and navigate to the game screen.

**Independent Test**: Navigate to the `difficulty` screen; verify four radio rows render with Medium pre-selected and DEFAULT badge visible; tap Hard; confirm Hard is selected and Medium deselected; tap the Gray card and confirm `side` changes to `'second'`; tap "Start game"; confirm navigation goes to the `game` screen passing `difficulty` and `side` params; tap back arrow and confirm navigation goes to `home`.

### Implementation for User Story 1

- [ ] T007 [US1] Create `connect-four/src/screens/DifficultyPickerScreen.jsx` with local state `diff='medium'` and `side='first'`; render four difficulty radio rows (Easy/Medium/Hard/Perfect) with row descriptions, Medium pre-selected, and a "DEFAULT" badge on the Medium row; render "Play as" section with two card buttons (Green card = `side='first'` / "moves first", Gray card = `side='second'` / "moves second") with visual distinction for selected state; render a TopBar with back arrow (`goBack()` → `home`), title "Game"; render a "Start game" button that calls `track('game_started', { difficulty: diff, side })` then `go('game', { difficulty: diff, side })`; use `t()` for all user-facing strings
- [ ] T008 [US1] Register `DifficultyPickerScreen` under the `'difficulty'` screen key in `connect-four/src/lib/screenRegistry.jsx`, replacing the existing `PlaceholderScreen` stub

**Checkpoint**: US1 complete — difficulty picker renders, navigates forward to game screen, navigates back to home.

---

## Phase 4: User Story 2 — Play a Game Against the AI (Priority: P1)

**Goal**: Deliver the full move/AI loop in `GameScreen` — board renders, user taps commit moves, AI responds, CoachDialog updates, move counter increments.

**Independent Test**: Start a game as Green (first); tap column 3; verify the disc animates into the lowest available row via `lastDrop` prop, `POST /api/evaluate-move` fires with the pre-move movestring and col=3, and the CoachDialog text updates; verify the AI places a disc and CoachDialog shows a phrase from `coach.sparring.ai_move.*`; verify "Move N" counter in TopBar incremented by 2 after both moves.

### Implementation for User Story 2

- [ ] T009 [US2] Create `connect-four/src/screens/GameScreen.jsx` — Part A (board + move commit loop): initialize state (`moveHistory=[]`, `board`, `heights`, `lastDrop`, `aiThinking=false`, `gameOver=null`, `hintOverlays=[]`); derive `userTurn`, `userColor` (`side==='first'?'red':'yellow'`), `aiColor`, `movesString`, `fullCols` from `moveHistory`; render `Board` with `onColumnClick`, `canPlay={userTurn && !gameOver && !aiThinking}`, `fullCols`, `lastDrop`, `overlays` props; on column tap: (1) clear `hintOverlays`, (2) compute new `moveHistory` and new `board`/`heights` via `buildBoard`, (3) update `lastDrop`, (4) call `POST /api/evaluate-move` with `{ movestring: pre-move-string, col }`, (5) update CoachDialog with `coachPhraseKey`/`coachMood` from response; render `CoachDialog` with `fixed` prop above board; import `checkWin` and `buildBoard` from `connect-four/src/lib/board.js`
- [ ] T010 [US2] Add AI move logic to `GameScreen.jsx` — Part B (AI move + deliberate-mistake wiring): implement `makeAiMove(currentMoves)` that: (1) evaluates Bernoulli trial `Math.random() < MISTAKE_RATES[difficulty]` — if fires, call `POST /api/scores` with `{ moves: currentMoves }`, call `secondBestColumn(scores)`, play that column with `coach.sparring.deliberate_mistake.*` phrase (if `secondBestColumn` returns `null`, fall through to normal play); (2) for normal play call `POST /api/scores`, pass scores to `sampleColumnFromScores` from `aiDifficulty.js`, play result with `coach.sparring.ai_move.*` phrase; set `aiThinking=true` before fetch, `aiThinking=false` after; import `MISTAKE_RATES`, `secondBestColumn`, `sampleColumnFromScores`, `INVALID_MOVE` from `connect-four/src/lib/aiDifficulty.js`
- [ ] T011 [US2] Add TopBar and intro phrase to `GameScreen.jsx`: render `TopBar` with `title="Game"`, back arrow (`go('difficulty')`), `meta={'Move ' + moveHistory.length}` counter, `rightIcon="gear"` with `onRight={() => {}}` (non-functional); on mount show randomly selected phrase from `coach.sparring.intro.*` in CoachDialog; wire `side='second'` auto-play path — on mount when `side==='second'`, immediately call `makeAiMove('')` before board becomes interactive; **for `side='second'`, the intro phrase is REPLACED (not appended) by the AI opening `coach.sparring.ai_move.*` phrase when `makeAiMove('')` resolves — do NOT push both phrases onto the `coachMessages` array; instead overwrite the intro entry with the AI-move phrase**
- [ ] T012 [US2] Register `GameScreen` under the `'game'` screen key in `connect-four/src/lib/screenRegistry.jsx`, replacing the existing `PlaceholderScreen` stub; pass `difficulty` and `side` route params through to `GameScreen`

**Checkpoint**: US2 complete — full move/AI loop works for both `side='first'` and `side='second'`; CoachDialog updates correctly after every move.

---

## Phase 5: User Story 3 — Receive Optional Hint (Priority: P2)

**Goal**: Tapping "Hint" shows `tg`-type overlays on the best column(s) and shows a generic hint phrase in CoachDialog; overlays clear on next move.

**Independent Test**: During user's turn tap "Hint"; verify `POST /api/scores` is called; verify `tg` overlays appear only on landing rows of the column(s) tied at the maximum solver score (no numeric scores shown anywhere); verify CoachDialog phrase is from `coach.sparring.hint.generic.*`; play a move; verify overlays disappear immediately.

### Implementation for User Story 3

- [ ] T013 [US3] Add Hint feature to `GameScreen.jsx`: add `hintActive` state (boolean); render a "Hint" toggle button in the Toolbar (visible only during user's turn, not during `gameOver`); on tap: call `POST /api/scores` with `{ moves: movesString }`, compute `maxScore = Math.max(...scores.filter(s => s > INVALID_MOVE))`, collect all legal columns tied at `maxScore`, build `tg`-type overlays `{ c: col, r: heights[col], type: 'tg' }` for each, set `hintOverlays`; show phrase from `coach.sparring.hint.generic.*` in CoachDialog; second tap toggles hint off (clear overlays, restore previous coach message); ensure hint overlays are cleared in the column-tap handler before committing the move (already handled in T009's step 1 — confirm integration)

**Checkpoint**: US3 complete — hint toggle works; overlays appear and disappear correctly; no numeric scores surfaced.

---

## Phase 6: User Story 4 — AI Makes a Deliberate Mistake (Priority: P2)

**Goal**: The deliberate-mistake mechanic fires at the configured rate per difficulty and announces via `coach.sparring.deliberate_mistake.*`.

**Note**: The core `secondBestColumn` logic and `MISTAKE_RATES` are already implemented in Phase 2 (T004/T005) and wired in Phase 4 (T010). This phase covers verification and edge-case hardening only — the unit tests (T005) serve as the primary verification. A manual gameplay check at Easy difficulty is required here.

**Independent Test**: At Easy difficulty, play through 20+ AI moves (across several games if needed); verify ~25% of AI moves show `coach.sparring.deliberate_mistake.*` phrase in CoachDialog; verify at Perfect difficulty no deliberate mistake phrase ever appears.

### Implementation for User Story 4

- [ ] T014 [US4] Verify deliberate-mistake edge cases in `GameScreen.jsx` + `aiDifficulty.js`: confirm that when `secondBestColumn` returns `null` (all-tied or forced move), the AI plays a normal move announced via `coach.sparring.ai_move.*` — not `deliberate_mistake.*`; confirm Perfect difficulty (`MISTAKE_RATES.perfect === 0`) never triggers the mistake path; add a console log (guarded by `import.meta.env.DEV`) to trace mistake trigger events for manual QA

**Checkpoint**: US4 complete — deliberate mistake fires at configured rates, announces correctly, degrades gracefully when no second-best column exists.

---

## Phase 7: User Story 5 — Game Ends and Record Is Saved (Priority: P1)

**Goal**: Win/draw/resign detection triggers `POST /api/games`, store methods, analytics, and navigation to `review` with game `id`.

**Independent Test**: Complete a 4-in-a-row win game; verify `POST /api/games` is called with correct body fields (especially `moves`, `side`, `result='win'`, `device_uuid`); verify returned `id` is passed as param to `go('review', { id })`; verify `store.saveSparringRecord('win')` and `store.recordActivityDay()` are called; simulate a network error on `POST /api/games`; verify navigation still proceeds with `id: null`.

### Implementation for User Story 5

- [ ] T015 [US5] Add game-end detection and persistence to `GameScreen.jsx` — Part C: after every move (human and AI) call `checkWin(newBoard, row, col, movedColor)` — if true set `gameOver = { result: 'win', winnerColor: movedColor }` (for AI win, `result='loss'`); if `newMoves.length === 42` set `gameOver = { result: 'draw' }` (board-full check must run after both human AND AI moves); on `gameOver` change: call `saveGame(result)` (fire-and-forget via try/catch returning `null` on failure), then call `store.saveSparringRecord(result)`, `store.recordActivityDay()`, `track('game_ended', { result, moveCount: moveHistory.length, difficulty })`, then `go('review', { id })`; obtain `device_uuid` via `const profile = await store.getProfile()` (async — must be awaited); include optional Authorization header if `session?.access_token` is available
- [ ] T016 [US5] Add Resign button to `GameScreen.jsx` Toolbar and Resign handler: render "Resign" button in Toolbar (disabled when `gameOver !== null`); on tap: set `gameOver = { result: 'loss' }` immediately (skip win detection), then trigger the same persistence + navigation flow as T015; ensure Resign does not call `POST /api/evaluate-move` or further AI moves

**Checkpoint**: US5 complete — all three end conditions (win, draw, resign) persist records and navigate to `review` with correct params; anonymous games work (no auth header); network failure degrades gracefully.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Documentation updates, manual QA verification, and edge-case checks that span multiple user stories.

- [ ] T017 [P] Update `docs/architecture/api-conventions.md` with the `POST /api/games` contract (method, path, auth, request shape, response shape, error codes) — this is a mandatory Constitution Principle VIII task
- [ ] T018 [P] Update `docs/architecture/data-model.md` with the `games` table schema (columns, types, constraints, index, FK, grants) — mandatory Constitution Principle VIII task
- [ ] T019 Manual golden-path QA: start a game as `side='first'` (Green/moves first), play to a 4-in-a-row win, verify: (a) Coach phrases update after every move, (b) hint overlays appear and clear correctly, (c) `POST /api/games` fires with correct body, (d) navigation reaches `review` screen with a non-null `id` param, (e) no numeric solver scores ever appear in the UI
- [ ] T020 Manual edge-case QA (`side='second'` AI-first): start a game as `side='second'`, verify the AI auto-plays its opening move before the board becomes interactive; verify CoachDialog shows `intro.*` then `ai_move.*`; then verify the *user's* first move evaluation passes movestring = AI-move + user-move to `POST /api/evaluate-move` and the quality badge reflects the user's move quality — document result of parity bug check (known bug: `project_parity_bug_ai_first`; do NOT fix, just record outcome)
- [ ] T021 Manual edge-case QA (resign): during an active game tap "Resign"; verify `POST /api/games` fires with `result='loss'`, navigation goes to `review`, no further AI moves are attempted
- [ ] T022 Manual edge-case QA (network failure): disable network; complete a game; verify no blocking error is shown and navigation still reaches `review` with `id=null`

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (T001 — checkWin extraction)
  ↓  BLOCKS
Phase 2 (T002–T006 — backend, logic, i18n) — T002/T004/T006 can run in parallel; T003 depends on T002; T005 depends on T004
  ↓  BLOCKS
Phase 3 (T007–T008 — DifficultyPickerScreen)  ←── can start as soon as Phase 2 done
Phase 4 (T009–T012 — GameScreen core loop)     ←── depends on T001, T004, T006
Phase 5 (T013 — Hint)                          ←── depends on T009
Phase 6 (T014 — Deliberate-mistake QA)         ←── depends on T010, T005
Phase 7 (T015–T016 — Game end + persistence)   ←── depends on T009, T003, T002
  ↓
Phase 8 (T017–T022 — Polish + Manual QA)       ←── depends on all prior phases
```

### Critical Serial Chain

**T001 → T004 → T005 → T010** — `checkWin` extraction must land first; `secondBestColumn` must be tested before it is wired into the game loop.

**T002 → T003 → T015** — migration must be applied before the endpoint is testable; endpoint must exist before game-end persistence works.

### Parallel Opportunities

Within Phase 2 (once T001 is done):
- T002 (migration), T004 (aiDifficulty extension), T006 (i18n) can all start simultaneously
- T003 starts after T002; T005 starts after T004

Within Phase 3–5 (once Phase 2 is done):
- T007 (DifficultyPickerScreen) can proceed in parallel with T009 (GameScreen Part A)

Within Phase 8:
- T017 and T018 (doc updates) can be done in parallel

---

## Implementation Strategy

### MVP First (P1 Stories Only)

1. Complete Phase 1: T001 (checkWin extraction)
2. Complete Phase 2: T002–T006 in dependency order (T002→T003, T004→T005, T006 independent)
3. Complete Phase 3: T007–T008 (DifficultyPickerScreen)
4. Complete Phase 4: T009–T012 (GameScreen core loop)
5. Complete Phase 7: T015–T016 (Game end + persistence)
6. **STOP and VALIDATE**: Manual golden-path (T019) — game starts, plays, ends, record saved
7. Ship P1 MVP

### Incremental Delivery

1. Foundation + P1 → playable game with record persistence (MVP)
2. Add US3 (Hint, T013) → teaching layer added
3. Add US4 verification (T014) → deliberate-mistake polish confirmed
4. Polish (T017–T022) → docs + edge-case QA complete

---

## Notes

- `INVALID_MOVE = -1000` is defined and exported at line 1 of `aiDifficulty.js`. `secondBestColumn` MUST import it — never redeclare.
- `store.getProfile()` is async — always `await` before reading `device_uuid`.
- Board color inversion: `'red'` renders as green disc; `'yellow'` as gray. `side='first'` user plays `'red'` (green visually). Confirm this is consistent throughout `GameScreen`.
- `onColumnClick` is the correct prop name on the `Board` component — not `onColumn`.
- The mockup's numeric heat-row of per-column solver scores is **explicitly NOT implemented**. Hint shows only `tg` overlays + generic coach phrase.
- AI-first parity bug (`project_parity_bug_ai_first`) is known and NOT fixed in this epic. T020 documents the verification outcome only.
- `go('review', { id })` — `id` may be `null` on `POST /api/games` failure. Epic 3b handles missing ID gracefully.
