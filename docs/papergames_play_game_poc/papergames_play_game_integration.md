# Papergames Live Game Integration Plan

## Goal

Transform the current PoC `PlayOnlineScreen` into a production-quality feature that:

1. Uses the same board and layout abstractions as the sparring screen (`GameScreen`)
2. Saves the completed game to `papergames_games` using the user's papergames account ID
3. Runs the same blunder analysis pipeline used for imported games
4. Navigates to `ReviewScreen` after the game ends, showing the same analysis UI as sparring

---

## Current State (PoC)

File: `connect-four/src/screens/PlayOnlineScreen.jsx`

The PoC works end-to-end but has these rough edges:

- **Custom board rendering** — renders a raw div grid, not the production `Board` component
- **Custom board state** — manages `g.moves[]` in a ref, manually rebuilds the board on every move. Should use the same `buildBoard` utility that sparring uses.
- **Custom layout** — no `TopBar`, no `Toolbar`, no app chrome
- **`playableFrames` used for board rendering** — not needed; `heights` from `buildBoard` is the right abstraction (same as sparring)
- **No persistence** — game is never saved to the DB after it ends
- **No analysis** — no navigation to `ReviewScreen`
- **Guest-only** — always registers as a guest, never links to the user's papergames account

The WebSocket protocol is fully reverse-engineered and working. All state management via refs is correct.

---

## Architecture Context

### `buildBoard` and `checkWin` — shared board utilities

File: `connect-four/src/lib/board.js`

These are imported by `useGameBoard` and are the canonical source of truth for board state in the app:

```js
const { board, heights } = buildBoard(movestring);
// board: string[][] 6×7, values 'empty'|'red'|'yellow', row 0 = bottom
// heights: number[7] — number of discs in each column (0–6)
```

```js
checkWin(board, row, col, color)  // → boolean
```

`fullCols` is derived from `heights`:
```js
const fullCols = heights.map((h, i) => h >= 6 ? i : -1).filter(i => i !== -1);
```

`lastDrop` (for the drop animation) is `{ c: col, r: heights[col] }` — the row where the disc lands equals the current height before the move.

**We must use these instead of the custom `rebuildBoard` function in the PoC.**

### `useGameBoard` — what it does

File: `connect-four/src/lib/useGameBoard.js`

`useGameBoard` combines two concerns that are cleanly separable:

1. **Pure board mechanics** — `moveHistory`, `board`, `heights`, `fullCols`, `lastDrop`, `gameOver`, `userTurn`, win detection.
2. **AI + coach layer** — AI move generation, hint overlays, coach dialog messages. Irrelevant for online play.

`useGameBoard` **cannot be used directly** for online play because it drives AI moves internally and has no mechanism to receive external moves from a WebSocket.

### New hook: `useBoardState`

Extract a lower-level hook from `useGameBoard` that handles only the pure board mechanics. Both `useGameBoard` (sparring) and `PlayOnlineScreen` (online) build on it.

**Signature:**
```js
const {
  moveHistory,   // number[] — column indices committed so far
  board,         // string[][] 6×7 — 'empty'|'red'|'yellow', row 0=bottom
  heights,       // number[7] — discs per column
  fullCols,      // number[] — full columns
  lastDrop,      // {c, r} | null — for drop animation
  gameOver,      // {result: 'win'|'loss'|'draw', winnerColor?: 'red'|'yellow'} | null
  userTurn,      // boolean
  userColor,     // 'red' | 'yellow'
  commitMove,    // (col: number) => {won: boolean, draw: boolean, row: number, color: string}
  reset,         // (newSide?: 'first'|'second') => void
} = useBoardState({ initialMoves = '', side })
```

**`commitMove(col)`** — the key primitive. It:
1. Reads `heights[col]` for the landing row → sets `lastDrop`
2. Appends `col` to `moveHistory`
3. Rebuilds board via `buildBoard`
4. Calls `checkWin(newBoard, row, col, colorJustPlayed)` — sets `gameOver` if won
5. Checks draw (`newHistory.length === 42`) — sets `gameOver` if draw
6. Returns `{ won, draw, row, color }` so the caller can branch

**`onGameEnd` is NOT a parameter of `useBoardState`.** The caller inspects the return value of `commitMove` to decide what to do next. This keeps the hook free of side effects and avoids the double-fire problem in `useGameBoard` (where coach messages and win handling are async and interleaved).

**How `useGameBoard` is refactored:** It calls `useBoardState` internally and adds AI/hints/coach on top. After calling `commitMove`, the existing win/draw logic in `useGameBoard` remains in place — it reads `{ won, draw }` from the return value instead of calling `checkWin` directly. The public API of `useGameBoard` is unchanged.

**How `PlayOnlineScreen` uses it:**
- `side` starts as `'first'` (default). When `game:start` fires from the WebSocket, call `setSide('second')` if we're second. Since no moves exist yet, `userTurn` updates correctly.
- Call `commitMove(col)` when we play a move (click). Read `{ won, draw }` and call `saveAndReview` if the game ended.
- Call `commitMove(opponentCol)` when `game:action` arrives from the WebSocket (opponent's move). Read `{ won, draw }` and call `saveAndReview` if the game ended.

### WebSocket closure safety — `apiRef` pattern

The entire `ws.onmessage` handler is defined once inside `start()`, a `useCallback` with a stable dependency list. It outlives every re-render. The values returned by `useBoardState` (`commitMove`, `heights`, `gameOver`) are recreated every render — if accessed directly from inside `onmessage` they will be frozen at their values from the single render in which `start()` ran (empty board, `side='first'`, `gameOver=null`).

**Fix**: Mirror the live hook values into a single stable ref, updated every render:

```js
const boardApiRef = useRef(null);
boardApiRef.current = { commitMove, heights, gameOver, moveHistory };
```

The `onmessage` handler reads `boardApiRef.current.commitMove(...)`, `boardApiRef.current.heights`, etc. This is the same pattern used in the rest of the PoC (all mutable game state is in `gameRef`). `handleColumnClick` is invoked by React's event system (not the WebSocket closure), so it can safely close over React state directly.

### Single-save guard — `savedRef`

`saveAndReview` can be triggered from two paths: the `commitMove` return value (normal win/loss/draw detected by the board) and the `game:finish` / `game:action.game.isFinished` WebSocket events (timeout, opponent resignation). For a normal win both paths fire. To prevent a double POST and a navigate-after-unmount:

```js
const savedRef = useRef(false);

async function saveAndReview(result, finalMoveHistory) {
  if (savedRef.current) return;
  savedRef.current = true;
  // ... rest of save logic
}
```

Reset `savedRef.current = false` in `retry()`.

The rule: **`commitMove` return value is the primary trigger.** `game:finish` / `game:action.isFinished` are secondary — they call `saveAndReview` only for outcomes that never produce a winning disc (timeout, resignation, opponent disconnect).

### Replacing `playableFrames` with `heights`

The PoC uses `playableFrames` (received from papergames) to determine the landing `y` coordinate when emitting `game:action`. This is unnecessary — `heights` from `useBoardState` is equivalent:

```js
// heights[col] = number of discs in column (0–6)
// papergames y: 5 = bottom row, 0 = top row
// landing y in papergames coords = 5 - heights[col]
const landingY = boardApiRef.current.heights[col] < 6 ? (5 - boardApiRef.current.heights[col]) : null;
```

Drop `playableFrames` from `gameRef` entirely.

### Board component

File: `connect-four/src/components/Board.jsx`

Production Board props (all same as sparring):

```js
<Board
  board={board}
  onColumnClick={handleColumnClick}
  canPlay={userTurn && !gameOver}
  fullCols={fullCols}
  lastDrop={lastDrop}
/>
```

**Color convention**: `'red'` renders as the **green** disc (player 1), `'yellow'` renders as the **gray** disc (player 2). Our player is always `'red'` (green disc). The opponent is always `'yellow'` (gray disc).

The papergames `symbol` field (`'circle-dark'`/`'circle-light'`) is only used to determine `side` at `game:start`. It is not stored in `moveHistory` and does not touch Board.

### GameScreen layout pattern

File: `connect-four/src/screens/GameScreen.jsx`

```
<div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
  <TopBar title="..." onBack={...} meta="Move N" />
  {/* CoachDialog here in sparring — replaced by opponent banner for online */}
  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 12px' }}>
    <div style={{ width: '100%', maxWidth: 380 }}>
      <Board ... />
    </div>
  </div>
  <Toolbar>
    <button>Resign</button>   {/* Hint button omitted for online */}
  </Toolbar>
</div>
```

### Post-game save strategy

**Decision**: Save the game row fast, navigate immediately. Blunder analysis happens in the background.

`saveAndReview` does three things in order:

1. `POST /api/user/papergames/save-live-game` — saves the game row to `papergames_games` only (no blunder analysis). Returns `{ id }` quickly (< 1 s). If the user is not authenticated (401), shows the "Log in to save" prompt and stops.
2. `go('review', { id })` — navigates immediately. ReviewScreen calls `POST /api/games/analyze` for analysis, same as sparring.
3. Fire-and-forget blunder extraction: a separate `POST /api/user/papergames/extract-blunders` (or a background job spawned server-side after the game row is saved) runs the solver pipeline and writes blunder rows. Blunders are only visible in the coach queue, not required for the review summary.

**Alternative considered and rejected**: Blocking the UI until blunder extraction finishes (10–30 s). Rejected because it duplicates work done by `/api/games/analyze` and risks Railway proxy timeouts.

### Anonymous user handling

**Decision**: Allow anonymous play. When the game ends and `save-live-game` returns 401, show a "Log in to save your game and see analysis" prompt instead of navigating to ReviewScreen. This must be an explicit implemented task (not just a Known Unknown).

### Database table: `papergames_games`

```
id                    uuid PK
user_id               uuid nullable FK → auth.users
papergames_room_uid   text UNIQUE NOT NULL   ← deduplication key
papergames_account_id text NOT NULL          ← user's papergames socket userId
moves                 text NOT NULL          ← 0-indexed movestring
side                  text 'first'|'second'
result                text 'win'|'loss'|'draw'
opponent_name         text NOT NULL
opponent_account_id   text NOT NULL
...
accuracy              real nullable
```

`papergames_room_uid` is the dedup key — upsert handles duplicate saves.

### papergames account ID

The `userId` received in the `user:connect` WebSocket event (`payload.userId`) is the same identifier used as `action.userId` in the papergames replay API. It is used as `papergames_account_id` in the DB row. The PoC stores it in `gameRef.current.ourUserId`.

The client sends `papergamesAccountId` in the save request body because it is the guest session's socket-level user ID — not derivable from `req.user.papergames_id` (which holds the user's configured permanent account, not the guest ID). The server should use the body value.

### Existing importer infrastructure

File: `connect-four/server/papergamesImporter.js`

Existing functions to reuse:

- `fetchReplay(roomUid)` — fetches game replay from papergames API
- `buildGameRow(room, replayData, accountId, userId, side)` — constructs the DB row
- `extractBlunders(solver, moveString, side, userId)` — blunder pipeline, returns `{ blunders, accuracy }`
- `upsertGame(supabase, gameRow)` — upserts to `papergames_games`, returns the row `id`
- `insertGameBlunder(supabase, blunder)` — inserts one blunder row

### Analysis endpoint

`POST /api/games/analyze` with `{ gameId }` already handles both `games` (sparring) and `papergames_games` tables. After navigating to `ReviewScreen` with `go('review', { id })`, the screen calls this endpoint and the full review UI works with zero changes.

### Post-game bookkeeping (same as sparring)

```js
store.recordActivityDay();   // marks today as an active day in the streak
track('game_ended', { result, moveCount, source: 'online' });
```

---

## Tasks

### T0 — Extract `useBoardState` hook from `useGameBoard`

**File**: `connect-four/src/lib/useBoardState.js` (new file)

Extract from `useGameBoard`:
- `moveHistory` state and its initialization from `initialMoves`
- `board`, `heights` derived via `buildBoard(moveHistory.join(''))`
- `fullCols` derived from `heights`
- `lastDrop` state
- `gameOver` state
- `userTurn`, `userColor` derived values

Implement `commitMove(col)` as a pure mechanics function:
1. Compute landing row: `const row = heights[col]`
2. Build new history: `const newHistory = [...moveHistory, col]`
3. Rebuild board: `const { board: newBoard, heights: newHeights } = buildBoard(newHistory.join(''))`
4. Set state: `setMoveHistory`, `setLastDrop({ c: col, r: row })`
5. Detect win: `const won = checkWin(newBoard, row, col, colorJustPlayed)`
6. If won or draw: set `gameOver`
7. Return `{ won, draw: !won && newHistory.length === 42, row, color: colorJustPlayed }`

**No `onGameEnd` parameter.** The caller handles end-of-game side effects from the return value.

Implement `reset(newSide)`: resets `moveHistory`, `lastDrop`, `gameOver` to initial values; optionally updates `side`.

**Refactor `useGameBoard`** to call `useBoardState` internally. Replace inline `moveHistory`/`board`/`heights`/`fullCols`/`lastDrop`/`gameOver` state and direct `checkWin` calls with `commitMove` + its return value. Existing coach/AI end handling is preserved — it reads `{ won, draw }` from the return instead of calling `checkWin` itself. The public API of `useGameBoard` is unchanged.

**Test**: Run `npm run test:fast` inside `connect-four/` after this refactor to confirm sparring is unbroken.

**Doc subtask**: Add a "Shared Board State Hook (`useBoardState`)" subsection to `docs/architecture/frontend-conventions.md` documenting:
- Hook signature and `commitMove` contract (no `onGameEnd`; caller inspects return value)
- The `apiRef` rule: any long-lived closure (WebSocket handler, timers) must access hook values through a ref updated each render — never close over them directly

### T1 — Replace PoC board state with `useBoardState`

**File**: `connect-four/src/screens/PlayOnlineScreen.jsx`

Remove from `gameRef`:
- `moves` array → replaced by `moveHistory` from `useBoardState`
- `playableFrames` → replaced by `heights` from `useBoardState` (via `boardApiRef`)
- `isFinished` → replaced by `gameOver` from `useBoardState`

Keep in `gameRef`:
- `ourUserId`, `ourSymbol`, `opponentSymbol` — WebSocket-specific metadata
- `isOurTurn` — WebSocket-level turn signal (cross-check with `userTurn`)
- `winnerId`

Add component state:
```js
const [side, setSide] = useState('first');
```

Add hook call:
```js
const {
  moveHistory, board, heights, fullCols, lastDrop, gameOver,
  userTurn, userColor, commitMove, reset,
} = useBoardState({ initialMoves: '', side });
```

Add the `boardApiRef` (for WebSocket handler access):
```js
const boardApiRef = useRef(null);
boardApiRef.current = { commitMove, heights, gameOver, moveHistory };
```

Update `game:start` handler:
- Determine `side`: `firstPlayerId === g.ourUserId ? 'first' : 'second'`
- Call `setSide(side)`
- Call `reset()` instead of manually clearing `g.moves` / `g.playableFrames`

Remove `rebuildBoard`, `landingForCol`, `emptyBoard`, `triggerRender` — no longer needed.

### T2 — Replace custom board renderer with production `Board` component

**File**: `connect-four/src/screens/PlayOnlineScreen.jsx`

Add imports:
```js
import { TopBar } from '../components/TopBar.jsx';
import { Toolbar } from '../components/Toolbar.jsx';
import { Board } from '../components/Board.jsx';
```

Replace the entire `renderBoard()` helper with direct `Board` usage:
```jsx
<Board
  board={board}
  onColumnClick={handleColumnClick}
  canPlay={userTurn && !gameOver}
  fullCols={fullCols}
  lastDrop={lastDrop}
/>
```

`handleColumnClick(col)` — invoked by React, safe to close over React state directly:
```js
const handleColumnClick = useCallback((col) => {
  const ws = wsRef.current;
  const g = gameRef.current;
  const api = boardApiRef.current;
  if (!g.isOurTurn || api.gameOver || api.heights[col] >= 6 || !ws) return;
  const landingY = 5 - api.heights[col];
  emit(ws, 'game:action', { x: col, y: landingY, roomId: roomUidRef.current }, msgIdRef.current++);
  const { won, draw } = api.commitMove(col);
  g.isOurTurn = false;
  setGameStatus('opponent-turn');
  if (won || draw) saveAndReview(won ? (userColor === 'red' ? 'win' : 'loss') : 'draw', [...api.moveHistory, col]);
}, [userColor, saveAndReview]);
```

Update the `game:action` WebSocket handler. Access hook values through `boardApiRef`:
```js
if (eventName === 'game:action') {
  const act = payload?.action?.action;
  const moverId = payload?.action?.userId;
  const g = gameRef.current;
  const api = boardApiRef.current;

  if (act && moverId && moverId !== g.ourUserId) {
    // Opponent's move
    const { won, draw } = api.commitMove(act.x);
    if (won || draw) {
      const result = draw ? 'draw' : 'you-lose';
      setGameStatus(result === 'draw' ? 'draw' : 'you-lose');
      saveAndReview(draw ? 'draw' : 'loss', api.moveHistory);
    }
  }
  // Our own echo — skip (we already committed optimistically above)

  if (payload?.action?.switchTurn) {
    g.isOurTurn = payload.action.currentUserIdTurn === g.ourUserId;
  }
  if (!api.gameOver) {
    setGameStatus(g.isOurTurn ? 'your-turn' : 'opponent-turn');
  }
}
```

### T3 — Implement GameScreen-style layout

**File**: `connect-four/src/screens/PlayOnlineScreen.jsx`

Add `go` and `goBack` to the component signature (the screen registry passes these automatically):
```js
export function PlayOnlineScreen({ go, goBack }) {
```

Replace the playing-phase render branch:
```jsx
return (
  <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
    <TopBar
      title="Play Online"
      onBack={goBack}
      meta={`Move ${moveHistory.length}`}
    />

    {/* Opponent banner — replaces CoachDialog */}
    <div style={{ padding: '8px 16px', textAlign: 'center', fontSize: 14, color: 'var(--ink-secondary)', minHeight: 36 }}>
      {opponentName
        ? <>vs <strong>{opponentName}</strong></>
        : <span style={{ opacity: 0.5 }}>Waiting for opponent…</span>
      }
    </div>

    {/* Status line */}
    <div style={{ padding: '4px 16px', textAlign: 'center', fontWeight: 600, minHeight: 24 }}>
      {gameStatus === 'your-turn' && 'Your turn'}
      {gameStatus === 'opponent-turn' && `${opponentName || 'Opponent'} is thinking…`}
      {gameStatus === 'you-win' && 'You won!'}
      {gameStatus === 'you-lose' && `${opponentName || 'Opponent'} won`}
      {gameStatus === 'draw' && 'Draw'}
    </div>

    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 12px' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <Board
          board={board}
          onColumnClick={handleColumnClick}
          canPlay={userTurn && !gameOver}
          fullCols={fullCols}
          lastDrop={lastDrop}
        />
      </div>
    </div>

    <Toolbar>
      <button
        type="button"
        onClick={handleResign}
        disabled={!!gameOver}
        style={{
          flex: 1, padding: '10px 0', borderRadius: 14, border: 'none',
          background: 'rgba(232,84,62,0.08)',
          cursor: gameOver ? 'default' : 'pointer',
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15,
          color: 'var(--red)', opacity: gameOver ? 0.4 : 1,
        }}
      >
        Resign
      </button>
    </Toolbar>
  </div>
);
```

For non-playing phases (idle, registering, searching, found, error), wrap in the same chrome:
```jsx
return (
  <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
    <TopBar title="Play Online" onBack={goBack} />
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', textAlign: 'center' }}>
      {/* existing phase content */}
    </div>
  </div>
);
```

Add `handleResign`:
```js
const handleResign = useCallback(() => {
  const ws = wsRef.current;
  if (!ws || boardApiRef.current.gameOver) return;
  // Exact event name TBD — see Known Unknowns. Fallback: ws.close()
  emit(ws, 'game:resign', { roomId: roomUidRef.current }, msgIdRef.current++);
  setGameStatus('you-lose');
  saveAndReview('loss', boardApiRef.current.moveHistory);
}, [saveAndReview]);
```

### T4 — Add `importSingleGame()` to the importer module

**File**: `connect-four/server/papergamesImporter.js`

Add a new exported function. Saves the game row only — blunder extraction is NOT called here (see post-game save strategy above). Blunder extraction happens asynchronously after the row is saved.

```js
/**
 * Save a single live game that just finished.
 * Called by POST /api/user/papergames/save-live-game.
 * Does NOT run blunder extraction — that runs as a background job.
 *
 * @param {object} supabase
 * @param {string} userId — Supabase user UUID
 * @param {string} papergamesAccountId — papergames socket userId (from user:connect event)
 * @param {string} roomUid — from room:join-auto event
 * @returns {Promise<{ id: string }>}
 */
export async function saveLiveGame(supabase, userId, papergamesAccountId, roomUid) {
  const replayData = await fetchReplay(roomUid);
  const side = getUserSide(replayData, papergamesAccountId);
  const room = {
    uid: roomUid,
    createdAt: replayData.createdAt ?? new Date().toISOString(),
  };
  const gameRow = buildGameRow(room, replayData, papergamesAccountId, userId, side);
  const id = await upsertGame(supabase, gameRow);
  return { id };
}

/**
 * Extract blunders for a single game and write them to the DB.
 * Called fire-and-forget after saveLiveGame.
 */
export async function extractAndSaveBlunders(supabase, id, userId, roomUid, papergamesAccountId) {
  const solver = createSolverProcess();
  try {
    const replayData = await fetchReplay(roomUid);
    const side = getUserSide(replayData, papergamesAccountId);
    const moveString = parseMoves(replayData);
    const { blunders, accuracy } = await extractBlunders(solver, moveString, side, userId);

    for (const blunder of blunders) {
      blunder.papergames_game_id = id;
      blunder.move_index = blunder.board_state.length;
      await insertGameBlunder(supabase, blunder);
    }

    if (accuracy != null) {
      await supabase.from('papergames_games').update({ accuracy }).eq('id', id);
    }
  } finally {
    solver.kill();
  }
}
```

### T5 — New server endpoint: `POST /api/user/papergames/save-live-game`

**File**: `connect-four/server/index.js`

Register near the other `/api/user/papergames/` endpoints. Update the import:
```js
import { importForUser, saveLiveGame, extractAndSaveBlunders } from './papergamesImporter.js';
```

```js
app.post('/api/user/papergames/save-live-game', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (!supabase) return res.status(503).json({ error: 'DB not configured' });

  const { roomUid, papergamesAccountId } = req.body;
  if (!roomUid || typeof roomUid !== 'string')
    return res.status(400).json({ error: 'roomUid is required' });
  if (!papergamesAccountId || typeof papergamesAccountId !== 'string')
    return res.status(400).json({ error: 'papergamesAccountId is required' });

  try {
    const { id } = await saveLiveGame(supabase, req.user.id, papergamesAccountId, roomUid);

    // Fire-and-forget blunder extraction — does not block the response
    extractAndSaveBlunders(supabase, id, req.user.id, roomUid, papergamesAccountId)
      .catch(err => console.error('[extract-blunders]', err.message));

    return res.status(201).json({ id });
  } catch (err) {
    console.error('[save-live-game]', err.message);
    return res.status(500).json({ error: err.message });
  }
});
```

**Doc subtask**: Add a `POST /api/user/papergames/save-live-game` entry to the "Papergames Import Endpoints (spec 038)" section in `docs/architecture/api-conventions.md`. Document: request body (`{ roomUid, papergamesAccountId }`), 201 `{ id }` success, standard 400/401/503/500 errors, and the fire-and-forget blunder extraction behavior.

### T6 — Post-game save, analytics, and navigate to ReviewScreen

**File**: `connect-four/src/screens/PlayOnlineScreen.jsx`

Add imports:
```js
import { useStore } from '../store/ProfileStore.jsx';
import { track } from '../lib/track.js';
```

Add to component body:
```js
const { store } = useStore();
const savedRef = useRef(false);
```

Implement `saveAndReview`:
```js
const saveAndReview = useCallback(async (result, finalMoveHistory) => {
  if (savedRef.current) return;  // guard against double-fire
  savedRef.current = true;

  // Update status display
  if (result === 'win') setGameStatus('you-win');
  else if (result === 'loss') setGameStatus('you-lose');
  else setGameStatus('draw');

  // Analytics and streak — same as GameScreen
  track('game_ended', { result, moveCount: finalMoveHistory.length, source: 'online' });
  try { await store.recordActivityDay(); } catch (_e) {}

  const rid = roomUidRef.current;
  const g = gameRef.current;

  if (!rid || !g.ourUserId) return;

  try {
    const res = await fetch('/api/user/papergames/save-live-game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ roomUid: rid, papergamesAccountId: g.ourUserId }),
    });

    if (res.status === 401) {
      // Anonymous user — show login prompt, stay on screen
      setGameStatus(prev => prev);  // keep current result status
      setShowLoginPrompt(true);
      return;
    }

    if (res.ok) {
      const { id } = await res.json();
      go('review', { id });  // same as GameScreen.saveGame()
    }
  } catch (err) {
    console.error('[save-live-game]', err);
  }
}, [go, store]);
```

Add `showLoginPrompt` state and reset it in `retry()`. Render the prompt in the post-game UI:
```jsx
{showLoginPrompt && (
  <p style={{ marginTop: '1rem', color: 'var(--ink-secondary)' }}>
    Log in to save your game and see analysis.
  </p>
)}
```

**`game:finish` handler** — only calls `saveAndReview` for outcomes without a winning disc (timeout, resignation, opponent disconnect):
```js
if (eventName === 'game:finish') {
  const g = gameRef.current;
  const api = boardApiRef.current;
  const winnerId = payload?.winner?.id ?? payload?.winner;
  const result = !winnerId ? 'draw' : winnerId === g.ourUserId ? 'win' : 'loss';
  // Only fire if board didn't already detect the end (no winning disc = timeout/resign)
  if (!api.gameOver) {
    saveAndReview(result, api.moveHistory);
  }
}
```

Reset `savedRef.current = false` inside `retry()`.

### T7 — Documentation

**File**: `docs/architecture/frontend-conventions.md`

Add a "Shared Board State Hook (`useBoardState`)" section documenting:
- Hook signature (as in T0)
- `commitMove` contract: pure mechanics only, no side effects, caller inspects `{ won, draw }` return
- The `boardApiRef` rule: any code in a long-lived closure (WebSocket `onmessage`, `setTimeout`, animation frames) must read hook values through `boardApiRef.current` — never close over them directly from render scope

**File**: `docs/architecture/api-conventions.md`

Add `POST /api/user/papergames/save-live-game` to the "Papergames Import Endpoints (spec 038)" section:
- Request body: `{ roomUid: string, papergamesAccountId: string }`
- `roomUid`: the papergames room UID from the `room:join-auto` WebSocket event
- `papergamesAccountId`: the socket-level user ID from the `user:connect` event (used as the papergames account identifier — same value as `action.userId` in the replay API)
- Response 201: `{ id: string }` — the `papergames_games` row UUID; blunder extraction runs fire-and-forget after the response
- Errors: standard 400/401/503/500

---

## Known Unknowns

### Resign event name on papergames.io

`game:resign` is a guess. To confirm: open papergames.io in a browser with the WebSocket hook script, start a game, and resign. Look for the outgoing event name.

**Safe fallback**: `ws.close()` — papergames awards the win to the other player on disconnect. If using this fallback, do not call `saveAndReview` from `handleResign` directly — let the subsequent `game:finish` event trigger it.

### Replay API availability

`saveLiveGame` calls `fetchReplay(roomUid)` which hits `https://papergames.io/api/room/${uid}/replay`. Verify this is publicly accessible for just-finished games without auth headers. If not, the endpoint needs to accept the access token from the client and include it in the fetch.

---

## Implementation Order

1. **T0** — Extract `useBoardState`. Run `npm run test:fast` to confirm sparring unbroken.
2. **T1** — Wire `useBoardState` + `boardApiRef` into `PlayOnlineScreen`.
3. **T2** — Swap in `Board` component; update WebSocket handler to use `boardApiRef`.
4. **T3** — Add `TopBar`, opponent banner, `Toolbar`, resign. Add `go`/`goBack` props.
5. **T4** — Add `saveLiveGame` + `extractAndSaveBlunders` to importer.
6. **T5** — Add endpoint. Smoke-test with a known room UID.
7. **T6** — Wire `saveAndReview` with `savedRef` guard and anonymous prompt.
8. **T7** — Update `frontend-conventions.md` and `api-conventions.md`.

---

## Files to Touch

| File | Change |
|---|---|
| `connect-four/src/lib/useBoardState.js` | **New file** — extracted from `useGameBoard` (T0) |
| `connect-four/src/lib/useGameBoard.js` | Refactor internals to use `useBoardState` (T0) |
| `connect-four/src/screens/PlayOnlineScreen.jsx` | T1–T3, T6 |
| `connect-four/server/papergamesImporter.js` | Add `saveLiveGame` + `extractAndSaveBlunders` (T4) |
| `connect-four/server/index.js` | Add endpoint + import (T5) |
| `docs/architecture/frontend-conventions.md` | Document `useBoardState` + `boardApiRef` rule (T7) |
| `docs/architecture/api-conventions.md` | Document new endpoint (T7) |

No changes to `urlMapping.js` or `screenRegistry.jsx` — `playOnline` is already registered.
No new DB migrations — `papergames_games` and `blunders.papergames_game_id` already exist.
