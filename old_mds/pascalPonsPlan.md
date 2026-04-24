# Plan: Replace minimax with Pascal Pons solver

## Context

The solver is a C++ binary that reads a **move sequence string** (e.g. `"4415263"` — 1-indexed columns in play order) from stdin and outputs **7 space-separated scores**, one per column, from the current player's perspective:
- `> 0` → current player wins in that many plies
- `= 0` → draw with perfect play
- `< 0` → current player loses in that many plies

The app already tracks `moveHistory: [{player, col}]`, which is exactly the input the solver needs.

---

## Step 1 — Build the solver binary

```bash
git clone https://github.com/PascalPons/connect4.git
cd connect4
make
# produces ./solve binary
```

Place the binary at `server/solve`.

---

## Step 2 — Create an Express backend

Create `server/index.js` using the `Connect4Solver` class from the tutorial.
Spawn the solver process once and keep it alive across requests.

Expose one endpoint:

```
POST /api/scores
Body:     { moves: "4415263" }   ← 1-indexed cols in play order
Response: { scores: [s0, s1, s2, s3, s4, s5, s6] }
```

Add a `concurrently` script to `package.json` to run Vite and the server together.

---

## Step 3 — Add move string helper

```js
function movesToString(moveHistory) {
  return moveHistory.map(m => m.col + 1).join(''); // 0-indexed → 1-indexed
}
```

---

## Step 4 — Replace AI move

The AI move `useEffect` is already async. Replace the `aiMove(board, depth)` call with:

```js
const res = await fetch('/api/scores', { method:'POST', body: JSON.stringify({ moves: movesToString(moveHistory) }) });
const { scores } = await res.json();
// pick column with highest score, random tie-break among equals
```

---

## Step 5 — Replace hints and column scores

Add state:

```js
const [solverScores, setSolverScores] = useState(null);
```

Add a `useEffect` that fires whenever `board` changes (i.e. after every move):

```js
useEffect(() => {
  if (gameOver) return;
  fetch('/api/scores', { ... moves: movesToString(moveHistory) ... })
    .then(r => r.json())
    .then(({ scores }) => setSolverScores(scores));
}, [board]);
```

Never reset `solverScores` to `null` — just overwrite with the new values when they arrive. This avoids any flicker: the table always shows the previous scores until the new ones are ready.

Derive `suggestedCols` and `colScores` directly from `solverScores`:

```js
const suggestedCols = solverScores
  ? solverScores.map((s, c) => ({ s, c }))
      .filter(x => x.s === Math.max(...solverScores))
      .map(x => x.c)
  : [];
```

Drop the `hintsDepth` state and the `− N +` depth control from the UI — the solver is always exact regardless.

---

## Step 6 — Remove difficulty

- Delete the `difficulty` state and `setDifficulty`.
- Delete the `Fácil` / `Difícil` buttons from Row 2.
- Remove Row 2 entirely if it becomes empty, or consolidate the remaining controls.

---

## Step 7 — Delete minimax code

Once all call sites are covered, delete from `App.jsx`:
- `minimax`
- `aiMove`
- `scoreBoard`
- `scoreWindow`
- `allBestHumanMoves`
- `bestHumanMove`

---

## Step 8 — Derive `board` from `moveHistory`

`board` is fully determined by `moveHistory`:

```js
const board = moveHistory.reduce(
  (b, { player, col }) => dropPiece(b, col, player),
  createBoard()
);
```

Remove `board` as state. This also simplifies undo: instead of snapshotting `{ board, moveHistory, ... }`, undo just pops the last entry (or last two entries in AI mode) from `moveHistory`.

---

## Step 9 — Derive `humanMoveCount` from `moveHistory`

Replace the `humanMoveCount` state with:

```js
const humanMoveCount = moveHistory.filter(m => m.player === HUMAN).length;
```

Remove `setHumanMoveCount` and all its update sites.

---

---

## Optional: Claude integration (Steps 10–11)

These steps are only needed if the Claude feedback feature is kept.

### Step 10 — Replace `bestHumanMove` in the analysis prompt

`analyzeHumanMove` is already async. Add one `await fetch('/api/scores', ...)` call there, using `moveHistory` **before** the human's move was appended, to find the optimal column for the prompt.

### Step 11 — Move analysis entirely to the server

- Add a second endpoint `POST /api/analyze` that receives `{ moveHistory, col }` and returns `{ text }`.
- The server reconstructs the board, computes threats, builds the prompt, calls the Anthropic API (with the key stored server-side, not in the browser), and returns the analysis text.
- Delete `analyzeHumanMove`, `boardToText`, and `getActiveThreats` from `App.jsx`.
- The server uses the solver to compute `optimalCol` directly — no need to send it from the frontend.

---

## Summary of state/UI changes

| What | Change |
|---|---|
| `difficulty` state | Removed |
| `hintsDepth` state | Removed |
| `suggestedCols` | Derived from `solverScores` |
| `colScores` | Derived from `solverScores` |
| `solverScores` state | New — updated after every move |
| `board` state | Removed — derived from `moveHistory` |
| `humanMoveCount` state | Removed — derived from `moveHistory` |
| Fácil/Difícil buttons | Removed |
| `− N +` depth control | Removed |
| `analyzeHumanMove` | Moved to server |
| `boardToText` | Moved to server |
| `getActiveThreats` | Moved to server |
| `bestHumanMove` | Moved to server (solver computes it) |
| Anthropic API key | Moved to server, out of browser |
| Undo logic | Simplified — just pop `moveHistory` |
