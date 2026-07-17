# Critique prompt — Papergames Live Game Integration

Use this prompt verbatim with a fresh agent (no prior context needed).

---

## Your task

You are reviewing an implementation plan for integrating a live papergames.io game feature into a Connect Four app. The plan is at `docs/mvp/papergames_play_game_integration.md`. Your job is to identify blocking issues and decisions that must be resolved before a developer can implement the plan correctly.

## Background you need

This is a Connect Four web app (Express backend + React frontend). The relevant existing code:

- `connect-four/src/lib/useGameBoard.js` — the existing hook that manages board state + AI moves for sparring games. The plan proposes extracting its pure board mechanics into a new `useBoardState` hook.
- `connect-four/src/lib/board.js` — exports `buildBoard(movestring)` and `checkWin(board, row, col, color)`.
- `connect-four/src/screens/GameScreen.jsx` — the sparring game screen. The plan says `PlayOnlineScreen` should match its layout and reuse its patterns.
- `connect-four/src/screens/PlayOnlineScreen.jsx` — the current PoC that works end-to-end but uses custom rendering. This is the primary file being refactored.
- `connect-four/server/papergamesImporter.js` — existing importer; the plan adds `importSingleGame()` to it.
- `connect-four/server/index.js` — the Express server; the plan adds a new endpoint here.
- `docs/architecture/api-conventions.md` — API naming, error shape, auth threading conventions. All new endpoints must follow these.
- `docs/architecture/frontend-conventions.md` — frontend hook and component conventions.
- `docs/architecture/server-conventions.md` — server-side patterns.

## What to read

Before reviewing, read all of the following:

1. `docs/mvp/papergames_play_game_integration.md` — the plan being critiqued (primary artifact)
2. `connect-four/src/lib/useGameBoard.js` — to verify the extraction boundary for `useBoardState`
3. `connect-four/src/lib/board.js` — to verify `buildBoard` / `checkWin` signatures
4. `connect-four/src/screens/PlayOnlineScreen.jsx` — current PoC state
5. `connect-four/src/screens/GameScreen.jsx` — layout pattern to match
6. `connect-four/server/papergamesImporter.js` — importer to extend
7. `docs/architecture/api-conventions.md`
8. `docs/architecture/frontend-conventions.md`

## What to evaluate

Review the plan's tasks (T0–T6) on three dimensions:

### 1. Correctness
- Does `useBoardState`'s proposed signature and `commitMove` contract match what can actually be extracted from `useGameBoard`? Verify against the real `useGameBoard.js` source.
- Does the `game:action` handler in T2 correctly skip the echo of our own moves? The PoC used a duplicate-detection check on `(x, y, userId)` — the plan uses `moverId !== g.ourUserId`. Are these equivalent? Could the server echo our own `userId` in the action?
- T1 states `side` starts as `'first'` and `setSide` is called when `game:start` fires. But `useBoardState` is called at render time before `game:start`. Is there a window where `userTurn` is wrong? Trace the exact sequence.
- T6 passes `saveAndReview` as `onGameEnd` to `useBoardState`, which calls it when `checkWin` detects a win. But the plan also says to call `saveAndReview` directly from `game:finish` for timeouts/resignations. Could `saveAndReview` be called twice (once from `useBoardState` + once from `game:finish`) for a normal win?

### 2. Completeness
- The plan lists 7 tasks (T0–T6) but contains **no documentation tasks**. This app maintains architecture docs in `docs/architecture/`. Check which of these files need to be updated for this feature:
  - `docs/architecture/api-conventions.md` — should the new `POST /api/user/papergames/save-live-game` endpoint be documented here?
  - `docs/architecture/frontend-conventions.md` — should `useBoardState` as a new shared hook be documented here?
  - Any other `docs/architecture/` files that are affected.
  - For each doc that needs an update, specify what section should be added/changed.
- Are there missing tasks? Consider: error handling for `importSingleGame` timeout (blunder analysis can take 30+ seconds per game); the "Log in to save" UI prompt mentioned in Known Unknowns but not in any task; the `gameOver` state from `useBoardState` vs the `game:finish` papergames event — is there a task that reconciles these two sources of game-end truth?

### 3. Task ordering and dependencies
- T1 depends on T0 (useBoardState must exist before PlayOnlineScreen can use it). ✓
- T2 and T3 both modify `PlayOnlineScreen.jsx`. Can they be done independently or must they be sequential?
- T6 references `saveAndReview` which is wired as `onGameEnd` in T1, but `go` (navigation) is only added as a prop in T3. Is this ordering safe or does it create a dependency gap?

## Output format

Produce a structured report with exactly two sections:

### Blocking issues
Issues that would cause incorrect behavior, a broken build, missing functionality, or violate architecture conventions if left unresolved. For each:
- Describe the issue clearly (self-contained — no bare task references like "T2 is wrong")
- Give your recommended fix

### Decisions required
Choices that are not answerable from the current plan text and must be made before implementation. For each:
- State the question with enough context to understand it without prior knowledge
- List 2–3 options
- State your recommended default

**Limit to the top 3 blocking issues and top 2 decisions.** No nitpicks.

Also append a third section:

### Missing documentation tasks
For each `docs/architecture/` file that needs an update:
- Which file
- What content should be added (one paragraph description is enough — not the full text)
- Which plan task it should be added to, or whether it deserves its own task
