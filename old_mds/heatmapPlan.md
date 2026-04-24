# Plan: Winning-line heatmap per suggested move

## What we're building

For each suggested column, an "Explain" button shows a heatmap overlay on the board.
The heatmap shows — for the position **after** that move is played — every 4-cell winning
pattern that the solver's search actually visited, colored by player (red = human, yellow = AI).
Cells that appear in more winning lines are more opaque.

**Known limitation:** positions answered by the opening book produce no traversal, so
no patterns are collected for them. Accepted for now.

---

## Step 1 — Add `findWinningCells()` helper to Position.hpp

Add a public method that, given the current player's bitboard **after** a winning move
has been played, finds the 4 cells that form the winning line.

Bit layout: bit at position `col*(HEIGHT+1) + row` → cell (row, col).

```cpp
// Returns {row,col} pairs of the 4 winning cells, or empty if none found.
std::vector<std::pair<int,int>> findWinningCells(position_t position) const {
  const int steps[] = {1, HEIGHT+1, HEIGHT, HEIGHT+2}; // vertical, horizontal, diag1, diag2
  for (int step : steps) {
    for (int bit = 0; bit < WIDTH*(HEIGHT+1); bit++) {
      if (bit % (HEIGHT+1) == HEIGHT) continue; // sentinel row, skip
      bool ok = true;
      for (int k = 0; k < 4; k++) {
        int b = bit + k*step;
        if (!(position & (position_t(1) << b))) { ok = false; break; }
      }
      if (ok) {
        std::vector<std::pair<int,int>> cells;
        for (int k = 0; k < 4; k++) {
          int b = bit + k*step;
          cells.push_back({b % (HEIGHT+1), b / (HEIGHT+1)});
        }
        return cells;
      }
    }
  }
  return {};
}
```

---

## Step 2 — Add `explainSearch()` to Solver

Add a new method to `Solver` that traverses the game tree (with alpha-beta) and,
whenever a terminal winning state is found, decodes the 4 winning cells and increments
a frequency counter in a 6×7 grid per player.

```cpp
// heatP0[row][col] counts winning lines for player 0 (the one who played first from P0)
// heatP1[row][col] counts winning lines for their opponent
void explainSearch(const Position &P, int alpha, int beta,
                   int heatP0[HEIGHT][WIDTH], int heatP1[HEIGHT][WIDTH],
                   int depth0);
```

The logic mirrors `negamax()`:
- If `P.canWinNext()`: enumerate all winning moves, call `findWinningCells()` on the
  resulting position, increment `heatP0` (current player wins) for each of the 4 cells.
  Return without recursing further.
- If `possibleNonLosingMoves() == 0`: opponent wins next. Call `findWinningCells()` on
  the opponent's winning position, increment `heatP1`. Return.
- If draw or depth limit: return.
- Otherwise: recurse with swapped heatP0/heatP1 (since players alternate).
- Use transposition table to skip already-visited positions (same as negamax).
- Opening book hits: return immediately, no patterns collected.

The "swap" on recursion is key: from the child's perspective, current/opponent are
flipped, so we pass `(heatP1, heatP0)` to the recursive call.

---

## Step 3 — Add `explain()` public method to Solver

```cpp
// Runs explainSearch from position P (after candidate move already applied)
// Returns two flat arrays of 42 ints (row-major, 6 rows × 7 cols)
void explain(const Position &P,
             int heatCurrent[HEIGHT][WIDTH],
             int heatOpponent[HEIGHT][WIDTH]);
```

Calls `explainSearch(P, MIN_SCORE, MAX_SCORE, heatCurrent, heatOpponent, 0)`.

---

## Step 4 — Add `-x` flag to main.cpp

New mode triggered by `-x`. For each input line (move sequence):
1. Parse position normally.
2. Call `solver.explain(P, heatCurrent, heatOpponent)`.
3. Output: `{moves} {42 ints for current player} {42 ints for opponent}` — 85 tokens
   per line, space-separated, followed by newline.

The 42 ints are row-major: row 0 col 0, row 0 col 1, ..., row 5 col 6.
"Current player" = whoever moves next from position P (i.e. the opponent of whoever
just played the candidate move — so the human's piece was just dropped, AI moves next).

To distinguish human vs AI in the output, prepend the move count modulo 2 (0 = first
player's patterns first, 1 = second player's patterns first). Actually simpler: always
output `{human_heat_42} {ai_heat_42}` by tracking which player is which from move count.

---

## Step 5 — Rebuild the binary

```bash
cd solver-src && make
cp c4solver ../connect-four/server/c4solver
```

---

## Step 6 — Add `/api/explain` endpoint to the server

The existing solver process uses `-a` mode (persistent stdin/stdout loop).
The explain mode produces much more output and is used on-demand, so spawn a
**separate one-shot process** per explain request (no persistent process):

```js
app.post('/api/explain', async (req, res) => {
  const { moves } = req.body;
  // spawn c4solver -x, write moves\n to stdin, read one line from stdout
  // parse the 84 numbers into { human: number[][], ai: number[][] } (6×7 grids)
  res.json({ human: grid6x7, ai: grid6x7 });
});
```

One-shot is fine here since explain is triggered by user interaction, not on every move.

---

## Step 7 — Add "Explicaciones" toggle + hover-triggered explain

Add a `showExplanations` boolean toggle in Row 1 (next to "Sugerencias").

When `showExplanations` is ON and `hintsEnabled` is ON:
- On `mouseenter` of any board column:
  - If the column is in `suggestedCols`, debounce 200 ms then fetch
    `POST /api/explain` with `moves = movesToString([...moveHistory, {player: hintPlayer, col: hoveredCol}])`.
  - Cancel any pending timer or in-flight fetch on `mouseleave` or column change.
- On `mouseleave` from the board: clear `explainData` / `explainCol`.

State additions:
```
const [showExplanations, setShowExplanations] = useState(false);
const [explainData, setExplainData] = useState(null); // {human: grid6x7, ai: grid6x7}
const [explainCol, setExplainCol] = useState(null);
const explainTimerRef = useRef(null);
const explainAbortRef = useRef(null);
```

---

## Step 8 — Render heatmap overlay on the board

When `explainData` is set (user is hovering a suggested column with explanations ON),
render a semi-transparent colored ring on each cell, layered on top of the existing piece:

- Red ring: opacity ∝ `explainData.human[cppRow][col] / maxHuman` (0 → 0.0, max → 0.6).
- Yellow ring: opacity ∝ `explainData.ai[cppRow][col] / maxAI`.

Note: C++ row 0 = bottom visual row. React renders row 0 at top, so
`cppRow = ROWS - 1 - reactRow`.

Both overlays coexist on the same cell. No close button needed — the overlay
disappears automatically when the user stops hovering over a suggested column.

---

## Summary

| Component | Change |
|---|---|
| `Position.hpp` | Add `findWinningCells()` |
| `Solver.hpp` | Add `explainSearch()` + `explain()` declarations |
| `Solver.cpp` | Implement `explainSearch()` + `explain()` |
| `main.cpp` | Add `-x` flag |
| `server/index.js` | Add `POST /api/explain` (one-shot spawn) |
| `App.jsx` | `explainCol` state, "?" buttons, fetch, heatmap overlay |
