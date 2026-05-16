# Connect Four — Implementation Guide

Engineering reference for detecting strategy, running search, and generating puzzles. Theory is in `connect-four-strategy-reference.md`; pedagogy is in `connect-four-curriculum-guide.md`.

---

## 1. Bitboard Encoding

### 1.1 Layout

Represent the 7×6 board as a 64-bit unsigned integer. Allocate 7 bits per column (rows 1–6 plus one buffer bit at the top), bottom-to-top:

```
Bit index for cell (col c, row r):  c * 7 + (r - 1)
  col A = bits 0–6
  col B = bits 7–13
  ...
  col G = bits 42–48
  bits 49–63: unused
```

Maintain two bitboards per position:

```
bitboard_player  — bits set where the current player has discs
bitboard_mask    — bits set where any disc exists (either player)
```

The opponent's bitboard = `bitboard_mask XOR bitboard_player`.

### 1.2 Playable Cells

The next playable row in each column is the lowest unset bit in that column's 6-bit slice of `bitboard_mask`:

```
playable_mask = (bitboard_mask + bottom_mask) & board_mask
```

where `bottom_mask` has bit 0 set for each column (row 1 of every column) and `board_mask` has the 42 valid cell bits set.

### 1.3 Making a Move

```
bitboard_player ^= playable_bit(col)  // toggle current player's bit
bitboard_mask   |= playable_bit(col)  // mark cell occupied
// then swap player and opponent
```

---

## 2. Win Detection (O(1) Bitwise)

Check whether `bitboard_player` contains four-in-a-row using bitwise shifts and AND:

```javascript
function hasWon(pos) {
  // Horizontal: shift by 7 (one column)
  let m = pos & (pos >> 7);
  if (m & (m >> 14)) return true;

  // Diagonal (\): shift by 6
  m = pos & (pos >> 6);
  if (m & (m >> 12)) return true;

  // Diagonal (/): shift by 8
  m = pos & (pos >> 8);
  if (m & (m >> 16)) return true;

  // Vertical: shift by 1 (one row)
  m = pos & (pos >> 1);
  if (m & (m >> 2)) return true;

  return false;
}
```

All four directions are checked in O(1). Call this after every move using the *previous* player's bitboard (the one who just placed a disc).

---

## 3. Pattern Detection Predicates

### 3.1 Threat Detection

A **Major Direct threat** (check) for player P is an empty cell that, if filled by P, wins immediately:

```javascript
function directThreats(player_bits, mask_bits) {
  const empty = board_mask & ~mask_bits;
  const playable = (mask_bits + bottom_mask) & board_mask;
  // candidate winning cells: winning cells that are empty and playable
  return winningCells(player_bits) & empty & playable;
}
```

`winningCells(pos)` returns all cells that complete a four-in-a-row for `pos` — computed by scanning all 4-windows containing exactly 3 set bits.

A **Latent major threat** is a winning cell that is empty but *not* playable:
```javascript
latentThreats = winningCells(player_bits) & empty & ~playable;
```

### 3.2 Undercut Detection

A latent threat at (c, r) is undercut (Deceptive) if the opponent has any threat at (c, r′) with r′ < r:

```javascript
function isUndercut(threat_col, threat_row, opponent_threats) {
  // mask all rows below threat_row in threat_col
  const below_mask = column_mask(threat_col) & rows_below(threat_row);
  return (opponent_threats & below_mask) !== 0n;
}
```

Strip all Deceptive threats before strategic evaluation.

### 3.3 Z-Threat Detection

A threat at (c, r) is a Z-threat if the number of empty cells in column c from the current height up to and including r is odd:

```javascript
function isZThreat(col, threat_row, current_height) {
  const cells_to_reach = threat_row - current_height; // includes the threat cell
  return cells_to_reach % 2 === 1;
}
```

### 3.4 J-Shape Detection

```javascript
function detectJShape(player_bits, x, y) {
  // x = column index (0-based), y = row index (1-based)
  return owns(player_bits, x, y) &&
         owns(player_bits, x, y + 2) &&
         owns(player_bits, x + 1, y + 1) &&
         owns(player_bits, x + 1, y + 2);
}

function findAllJShapes(player_bits) {
  const shapes = [];
  for (let x = 0; x <= 5; x++) {      // cols A–F (need x+1)
    for (let y = 1; y <= 4; y++) {    // rows 1–4 (need y+2)
      if (detectJShape(player_bits, x, y)) shapes.push({x, y});
    }
  }
  return shapes;
}
```

Also check the mirror variant by testing `(x-1, y+1)` and `(x-1, y+2)` instead of `(x+1, ...)`.

### 3.5 Figure-7 Detection

The canonical Figure-7 requires a diagonal arm and a horizontal arm sharing a hinge cell, with both threat extensions landing in the **same column**:

```javascript
function detectFigure7(player_bits, x, y) {
  // Diagonal arm: (x,y), (x+1,y+1), (x+2,y+2)
  // Horizontal arm: (x+2,y+2), (x+3,y+2), (x+4,y+2)
  // Threats: (x+5, y+2) [horizontal] and (x+2, y+3) [diagonal]
  // Same-column check: (x+5) must equal the column of the diagonal extension
  // This holds only for the specific geometry where col(x+5) = col of diag tip + 1
  // i.e., x+5 == x+2 + 3 -- always true, but the two threats are at:
  //   horizontal: col x+5, row y+2
  //   diagonal:   col x+2, row y+3
  // Same column requires x+5 == x+2, i.e., 5==2 -- impossible for the generic form.
  // The canonical same-column variant uses x=0 (col A), targeting col F (index 5):
  //   diagonal {A1,B2,C3} + horizontal {C3,D3,E3} → threats at F3 and F4
  // General same-column Figure-7: diagonal and horizontal arms must be arranged
  // so that col(diagonal_tip + 1 row) == col(horizontal_tip + 1 col).
  // Detector: enumerate all (diag_arm, horiz_arm) pairs sharing a hinge,
  // then verify both threat cells share a column.

  const diag = [bit(x,y), bit(x+1,y+1), bit(x+2,y+2)];
  const horiz = [bit(x+2,y+2), bit(x+3,y+2), bit(x+4,y+2)];
  const allOwned = [...diag, ...horiz].every(b => (player_bits & b) !== 0n);

  if (!allOwned) return false;

  // Threat cells
  const threat1 = {col: x+5, row: y+2}; // horizontal extension
  const threat2 = {col: x+2, row: y+3}; // diagonal extension
  const sameColumn = threat1.col === threat2.col;

  return sameColumn; // only a Figure-7 if same-column property holds
}
```

Mirror variant: replace `(x+1, y+1), (x+2, y+2)` with `(x−1, y+1), (x−2, y+2)` and adjust horizontal arm accordingly.

### 3.6 Zugzwang Detection

Exact zugzwang detection requires a full game-tree search (negamax with the solver). For heuristic detection:

```javascript
function heuristicZugzwang(position) {
  // Count dead columns
  const deadCols = countDeadColumns(position);
  const movesPlayed = popcount(position.mask);
  const S_dead = deadCols * 6; // rough estimate; refine with exact cell count

  // (n + S_dead) mod 2 == 0 → Red forced
  return (movesPlayed + S_dead) % 2 === 0 ? 'red_forced' : 'black_forced';
}
```

For precise detection, call the solver: a position is zugzwang if `solver.score(pos) < 0` for the current player and `solver.score(null_move(pos)) < 0` for the opponent (mutual zugzwang) or `> 0` (one-sided).

---

## 4. Solver Integration

### 4.1 Engine

Use Pascal Pons' C++ negamax solver with alpha-beta pruning, iterative deepening, and Zobrist-hashed transposition tables. The JS server wraps the solver binary via child process or WASM compilation.

Reference: https://blog.gamesolver.org/

### 4.2 Score Semantics

The solver returns a signed integer score from the perspective of the **current player**:

```
score > 0:  current player wins
            moves_to_win = (43 - moves_played - score) / 2  (approximately)

score < 0:  current player loses
            |score| encodes how long they can delay

score = 0:  theoretical draw
```

Precise Win-in-N formula:

```
win_in_N = ceil((MAX_SCORE - |score|) / 2)
```

where `MAX_SCORE = 18` (half of 42 minus 6 for the board size) — check Pons' documentation for exact constants.

### 4.3 Calling the Solver

The solver rejects move strings that pass through a winning position — it only accepts strings where the game is still undecided. Validate before calling:

```javascript
function safeScore(movestring) {
  // verify no prior move in the sequence was a win
  for (let i = 1; i <= movestring.length; i++) {
    const sub = movestring.slice(0, i);
    if (hasWon(replay(sub))) return null; // reject
  }
  return solver.score(movestring);
}
```

### 4.4 Column Score Array

Request scores for all 7 columns in one call. The solver returns `--` for a full column and a signed integer for each playable column. Use this for puzzle validation and explanation generation.

---

## 5. Threat-Space Search Algorithm

### 5.1 Node Expansion

At each TSS node, generate only moves that create or block a threat:

**Attacker node:**
1. If any direct threat exists → play it (forced win check).
2. Enumerate moves that extend a 2-in-a-row or 3-in-a-row into a new threat window.
3. Priority: horizontal > diagonal > vertical.

**Defender node:**
1. If attacker has a direct threat → must block (unique response).
2. If attacker has two direct threats → loss (can't block both; Baseinverse principle).
3. Otherwise, enumerate blocks of attacker's latent threats.

### 5.2 VCF Search (Mate-in-N)

Depth-first search, attacker only plays checks (Major Direct threats):

```javascript
function vcfSearch(position, depth, isAttacker) {
  if (depth === 0) return false;
  const threats = directThreats(position.current_player);

  if (isAttacker) {
    for (const t of threats) {
      const next = position.play(t.col);
      if (hasWon(next)) return true; // win found
      if (vcfSearch(next, depth - 1, false)) return true;
    }
    return false;
  } else {
    // defender must block all attacker threats
    const attackerThreats = directThreats(position.other_player);
    if (attackerThreats.length >= 2) return true; // can't block both
    if (attackerThreats.length === 0) return false; // no forcing
    return vcfSearch(position.play(attackerThreats[0].col), depth - 1, true);
  }
}
```

### 5.3 Termination Conditions

- **Win:** A path is found where every attacker move is a check and the sequence terminates in four-in-a-row.
- **Proven loss:** All attacker branches are refuted by the defender.
- **Draw/Unknown:** Board fills or max depth reached without a VCF sequence.

---

## 6. Puzzle Generation Pipeline

### 6.1 Overview

```
MCTS self-play → position pool → solver filter → uniqueness check → predicate classification → puzzle DB
```

### 6.2 Position Generation

Run MCTS with UCT exploration to generate a pool of naturalistic mid-game positions. Supplement with human opening books for early-game variety. Target 15–35 discs on board for most puzzle archetypes.

### 6.3 Solver Filter

Reject positions where:
- The solver score is 0 (draw) — unless the puzzle is specifically about identifying draws
- The current player wins in ≤ 2 moves (too trivial) — except for Win-in-1 archetype
- No legal moves exist (game already over)

### 6.4 Uniqueness Check

A valid puzzle has **exactly one winning move**:

```javascript
function isUnique(position) {
  const scores = solver.allColumnScores(position);
  const winningCols = scores.filter(s => s > 0);
  return winningCols.length === 1;
}
```

Positions with multiple winning columns are rejected — the puzzle must have a single correct answer.

### 6.5 Predicate Classification

Run boolean predicates to tag each position with its tactical motif:

```javascript
const tags = [];
if (isVCF(position))          tags.push('vcf');
if (isZugzwang(position))     tags.push('zugzwang');
if (hasFork(position))        tags.push('fork');
if (hasJShape(position))      tags.push('j_shape');
if (hasFigure7(position))     tags.push('figure_7');
if (hasParityTrap(position))  tags.push('parity_trap');
if (hasUndercut(position))    tags.push('undercut');
```

Assign the **highest-priority** matching tag as the primary archetype:

```
Priority: vcf > fork > figure_7 > j_shape > undercut > parity_trap > zugzwang
```

### 6.6 Difficulty Score

Use Win-in-N from the solver as the base difficulty:

```
difficulty = win_in_N + pattern_complexity_bonus
```

Pattern complexity bonuses (additive):
- Zugzwang position: +3
- Parity trap: +2
- J-shape or Figure-7: +2
- Simple fork: +1

---

## 7. Automatic Explanation Generation

### 7.1 Template Engine

Map each tactical tag to a natural-language template. Inject cell coordinates from the predicate's output:

```javascript
const templates = {
  vcf: (data) =>
    `Mate in ${data.depth}. Play ${data.first_move} — every response is forced.`,

  fork: (data) =>
    `Playing ${data.move} creates two simultaneous threats at ${data.threat1} and ${data.threat2}. Your opponent can only block one.`,

  figure_7: (data) =>
    `The Figure-7 at ${data.hinge} generates threats at ${data.threat1} and ${data.threat2} — both in column ${data.col}. Blocking either one enables the other.`,

  j_shape: (data) =>
    `The J-shape at ${data.anchor} forces a triple minor threat. No matter how your opponent responds on columns ${data.col1} and ${data.col2}, you reach row 3 on column ${data.target_col}.`,

  parity_trap: (data) =>
    `Your opponent is in a parity trap. Column ${data.col} has ${data.empty_count} empty spaces — they must eventually play into it, and you win at row ${data.threat_row}.`,

  zugzwang: (data) =>
    `Every move your opponent makes concedes a critical column. With ${data.dead_cols} dead column(s) remaining, they are forced to play into column ${data.critical_col}.`,

  undercut: (data) =>
    `Their threat at ${data.upper_threat} is dead — you have a threat at ${data.lower_threat} in the same column. They can't reach ${data.upper_threat} without losing first.`,
};
```

### 7.2 Classification Confidence

Report confidence based on how the pattern was detected:

| Detection method | Confidence |
|---|---|
| Bitboard mask (O(1) — fork, direct threat) | High |
| Shallow TSS (≤ 5 ply VCF) | High |
| Pattern predicate (J-shape, Figure-7) | Medium-High |
| Parity / zugzwang heuristic | Medium |
| Deep VCF (> 10 ply) | Low — flag for human review |

---

## 8. False Positive Handling

### 8.1 Ghost Threats

A threat that appears valid structurally but is unreachable due to parity. Detection:

1. Check whether the threat cell is parity-aligned for the player.
2. If not aligned, check whether the player holds a Z-threat in another column that toggles zugzwang in their favor.
3. If neither, mark the threat as a ghost.

### 8.2 Gravity Check

Before classifying any board state in a simulation, verify that every disc obeys gravity: for each occupied cell (c, r), confirm (c, r−1) is also occupied (or r = 1). Discard any generated position that fails this check.

### 8.3 Temporal Check

A threat is only valid if the required discs can be placed in legal alternating order. For minor threats requiring 2+ additional discs, simulate the filling sequence and verify it doesn't require either player to place two discs in a row.

### 8.4 Solver Validation

The final check for any pattern classification: run the solver on the position. If the solver says the tagged winning move is *not* best (another column scores higher), the classification is a false positive. Log it and queue for human review.

```javascript
function validatePuzzle(position, tagged_move_col) {
  const scores = solver.allColumnScores(position);
  const best_score = Math.max(...scores.filter(s => s !== null));
  const tagged_score = scores[tagged_move_col];
  return tagged_score === best_score;
}
```
