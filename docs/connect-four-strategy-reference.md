# Connect Four — Strategy Reference

Authoritative reference for Connect Four strategy theory. Covers everything needed to understand *why* positions win or lose. For implementation details see `connect-four-implementation-guide.md`; for the teaching curriculum see `connect-four-curriculum-guide.md`.

---

## 1. Board Fundamentals

**Dimensions:** 7 columns (A–G, left to right) × 6 rows (1–6, bottom to top).

**Gravity:** A disc dropped in column C falls to the lowest unoccupied row in C. Cell (c, r) is legally playable only if r = 1 or (c, r−1) is already occupied.

**Win condition:** First player to place four discs in an unbroken horizontal, vertical, or diagonal line wins.

**Players:** Red moves first (odd move numbers: 1, 3, 5…). Yellow/Black moves second (even move numbers: 2, 4, 6…).

**Solution:** Connect Four is a solved game (Allen and Allis, independently, October 1988; see Allis 1988 thesis at tromp.github.io/c4/connect4_thesis.pdf and Wikipedia). With perfect play:
- Red wins if the first move is in column D (center).
- The game is drawn if Red opens in columns C or E.
- Black wins if Red opens in columns B or F (Black wins on or before move 42).
- Black wins if Red opens in columns A or G (Black wins on or before move 40).

**State space:** ~4.53 trillion reachable positions (4,531,985,219,092 exactly; source: en.wikipedia.org/wiki/Connect_Four).

**Primary sources:**
- Allis, V. (1988). *A Knowledge-based Approach of Connect-Four*. tromp.github.io/c4/connect4_thesis.pdf
- Allen, J.D. (1990). *Expert Play in Connect-Four*. tromp.github.io/c4.html (hosted by Tromp)
- Allen, J. D. (2010). *The Complete Book of Connect 4: Puzzles, Strategies, the Stories Behind the World's Most Popular Game.* Sterling Publishing. Chapter 4 ("Major Threat Analysis") is the canonical home of the T1–T7 and V1–V5 rule labels used throughout this document.
- Tromp, J. Solver and state-space resources. tromp.github.io/c4/c4.html

---

## 2. Parity Theory

### 2.1 Row Ownership

The board has 6 rows (even). Red moves first. In any column that fills completely, Red places discs on rows 1, 3, 5 and Black on rows 2, 4, 6.

**Mantra: "Red likes odd numbers."** Red's natural rows are 1, 3, 5 (odd). Black's natural rows are 2, 4, 6 (even). A threat on a naturally-owned row is *parity-aligned*. (Source: Allis 1988 thesis §3.3 — "White likes to get odd threats"; tromp.github.io/c4/connect4_thesis.pdf)

A parity-aligned threat is strategically valuable because, all else being equal, if the column must be filled, the owning player will be the one to place the disc that completes it.

### 2.2 Parity Detection Formula → KB: [derived-parity-formula](knowledge-base/derived-parity-formula.md)

For a given column c with current height h (discs already in c), the next disc played in c lands on row h+1. Whether that row belongs to Red or Black depends on whose turn it is when that disc is played:

```
row_owner(c, move_number) = (move_number % 2 == 1) ? Red : Black
```

A threat at (c, r) is parity-aligned for Red if r is odd; for Black if r is even.

### 2.3 Endgame Parity Outcome Table

*Note: this table is derived from Allis 1988 §3.3 cases 1–4 and Allen Ch. 4 (T1–T7, V1–V5). All entries are consistent with those canonical sources.*

*Preconditions: the table assumes (a) only major threats are present, (b) at most one threat per column per player, and (c) no further tactical interactions between columns. Allen explicitly states these limits (Allen 2010 ch. 4 preamble: "The rules in this chapter are not complete, because they do not cover the following points: Complicated configurations of minor threats; Columns with three or more major threats; Tactical interactions between columns.").*

When the board is nearly full and both players have only latent threats remaining, the outcome is determined by the *count of unshared odd-row threats*:

| Red unshared odd threats | Black unshared odd threats | Result |
|---|---|---|
| 1 | 0 | Red wins |
| 3 | 0 | Red wins |
| 0 | 0 | Draw |
| 2 | 0 | Draw (even count — Red is forced first; Allis §3.3: odd+odd=even turns, Red sacrifices one threat, leaving the other to be lost too) |
| 1 | 1 | Draw (Allen T7: Red and Black odd-row threats in separate columns cancel each other; Allis §3.3 case 4: odd+odd=even, Red forced first, both threats lost) |
| 0 | 1 | Draw (Black's single odd-row threat cannot override zugzwang; Black needs two, per Allen V2) |
| 0 | 2 | Black wins (Black uses claimeven to guarantee even rows; Allen V2) |
| 1 | 2 | Draw (after T7 cancels Red's one odd threat against one of Black's, Black holds one remaining odd threat — insufficient for V2) |

**Correct principle** (Allen Ch. 4, G3/T7/V1–V5; Allis §3.3): Red wins with an **odd count** of uncancelled odd-row threats (1 or 3). An even count (2) yields Draw — Red is forced first and sacrifices threats pairwise. Black wins with 2+ uncancelled odd-row threats (Allen V2). Red and Black odd-row threats in separate columns cancel each other (Allen T7). Red's isolated even-row threats are always worthless (Allen T6). *A previous version of this document cited the formula `Red_odd > Black_odd` attributed to "Bagan et al. 2025" — both the formula and the attribution are incorrect. Bagan et al. (2024/2025) study Poset Positional Games (Maker-Breaker complexity on posets); they do not formalize standard Connect Four parity rules.*

### 2.4 Parity Traps and Ghost Threats → KB: [community-parity-trap](knowledge-base/community-parity-trap.md) · [community-ghost-threat](knowledge-base/community-ghost-threat.md)

*Note: "Parity trap" and "ghost threat" are project-local labels for canonical phenomena. "Parity trap" corresponds to Allen's general description of zugzwang resolution (G2–G3); "ghost threat" is a consequence of an opponent's odd-column Z-threat (Allis §3.3, case 1). Neither term appears in Allis, Allen, or Tromp.*

A **parity trap** is a structural state where a player is compelled to fill the cell beneath their opponent's threat, handing the opponent the win. It occurs when a column has k empty cells, the opponent's threat sits at the top, and the player has no Z-threats elsewhere to toggle zugzwang.

A **ghost threat** is a visually apparent winning line that is mathematically unreachable. The most common cause: the cell is on the player's parity row, but the opponent holds a Z-threat in another column that flips who must play next, leaving the player unable to reach the threat before the column is consumed.

### 2.5 Threat Interaction Rules (T1–T7)

*Note: T1–T7 follow Allen's Chapter 4 transformation rules, which share the same T1–T7 naming and numbering. Allen's T rules are proven rules for simplifying major-threat endgame analysis; they are not the same as Allis's nine strategic rules in §10, which are geometric constructions used by Black to draw against any White strategy.*

These rules determine whether two threats in the same column neutralize each other:

- **T1 (Adjacent pair — terminal):** Two major threats at rows r and r+1 in the same column for the same player = guaranteed win; one of them will be reached regardless of play order. → KB: [allen-t1](knowledge-base/allen-t1.md)
- **T2 (Cross-parity undercut):** An opponent's threat at an even row undercuts your threat at the row above (odd) in the same column. The lower, even-row threat is reached first, ending the game in the opponent's favor before your upper threat can be played. (Allen T2: "Threats may neutralize (undercut) opponents threats with opposite row parity.") Symmetrically, a Red odd-row threat at row r in column c neutralizes a Black even-row threat immediately above it at row r+1 (Allen 2010 T2, third sub-case). → KB: [allen-t2](knowledge-base/allen-t2.md)
- **T3 (Double toggle):** Threats at rows 2 and 5 in the same column control zugzwang twice — equivalent to two independent odd-row threats. → KB: [allen-t3](knowledge-base/allen-t3.md)
- **T4 (Same parity, same column — independent):** Two same-parity threats in the same column do not interact: same-coloured pairs give no bonus (both remain active but cumulative parity is unchanged); opposite-coloured pairs do not cancel either. (Allen 2010 T4.) → KB: [allen-t4](knowledge-base/allen-t4.md)
- **T5 (Different parity, same column — independent):** Threats at rows 3 (odd) and 6 (even) in the same column do not interact. By the time the column fills to row 6, the row-3 threat has long since been resolved (taken, blocked, or made irrelevant), so the two threats cannot affect each other's playability. (Allen T5.) → KB: [allen-t5](knowledge-base/allen-t5.md)
- **T6 (Red even-row threat — worthless):** An isolated Red threat on an even row has zero strategic value unless it creates an adjacent pair with an odd-row threat. → KB: [allen-t6](knowledge-base/allen-t6.md)
- **T7 (Odd threat cancellation):** Red holding one odd-row threat and Black holding one odd-row threat in a **different** column = **Draw** — the threats cancel each other (Allen T7: "Red and Black odd-row threats in separate columns cancel each other"). Mechanism: the combined odd+odd empty-cell count is even, so Red is forced to move first into one of the two odd-threated columns, sacrificing Red's own threat; Black's threat is then also lost. This is why Black needs **two** odd-row threats (V2) — not just one — to overcome Red's structural parity advantage. → KB: [allen-t7](knowledge-base/allen-t7.md)

### 2.6 Victory Rules (V1–V5)

*Note: V1–V5 follow Allen's Chapter 4 Victory Rules, which share the same V1–V5 naming and numbering. They are applied after first simplifying threats with T1–T7. They are not the same as Allis's nine strategic rules in §10.*

Simplified endgame outcome rules when no immediate tactical sequences exist:

- **V1:** Red wins with three odd-row threats in separate columns (after T7 cancellation). Four uncancelled odd-threated columns favor Black; Allen calls this 'rarer than a four-leaf clover' (Allen 2010 p. 100). For practical purposes, treat V1 as firing only at an odd uncancelled count ≥ 3. → KB: [allen-v1](knowledge-base/allen-v1.md)
- **V2:** Black wins with two odd-row threats in separate columns (Black controls zugzwang via even count). → KB: [allen-v2](knowledge-base/allen-v2.md)
- **V3:** Red wins with one uncontested odd-row threat (no Black counter in the same column). → KB: [allen-v3](knowledge-base/allen-v3.md)
- **V4:** Black wins with an even-row threat if Red has no odd-row threats. → KB: [allen-v4](knowledge-base/allen-v4.md)
- **V5:** Otherwise, draw. → KB: [allen-v5](knowledge-base/allen-v5.md)

---

## 3. Zugzwang

### 3.1 Definition

Zugzwang (German: "compulsion to move") is a state where the player to move would achieve a better outcome if they could pass. Formally:

```
Eval(S, P) < Eval(Pass(S), P)
```

In Connect Four, zugzwang arises when all neutral (dead) columns are exhausted and every remaining legal move plays into a column containing the opponent's threat at a higher row.

Unlike chess, Connect Four has no passing moves — the obligation to move is permanent. However, *control* of zugzwang (who is ultimately forced into a critical column) is fluid: forcing moves that open odd-count board regions can transfer that control from one player to the other. (Allis 1988, Chapter 4: "moves in Connect-Four are also governed by such actions where a misplaced chip can cause the influence and control of Zugzwang to shift.")

### 3.2 Types

*Note: the three-way "offensive / defensive / mutual" classification is a project-local convenience taxonomy. Allis and Allen treat zugzwang as a single phenomenon and do not subdivide it by type in this way.*

- **Offensive zugzwang:** Player holds an odd number of odd-row threats in separate columns, forcing the opponent to eventually play into one of those columns.
- **Defensive zugzwang:** Player is forced to make the next non-dead move, handing the opponent the right to play last in the critical column.
- **Mutual zugzwang:** Both players hold major threats at the same cell (or adjacent pair). Whoever is forced to play that column loses.

### 3.3 Dead Columns

A **dead column** is one where no four-in-a-row is formable for either player in any remaining empty cell. Dead columns contribute no threats but consume turns as they fill.

*Terminology note: "dead column" / "dead space" is used throughout this document as a project-local term. The Wikibooks Connect Four article (en.wikibooks.org/wiki/Connect_Four) uses "zugzwang spaces" for the related concept of cells that precede a critical square but are themselves non-decisive — a stricter definition than "dead column" as used here.*

Detection: for each empty cell (c, r) in column c, check all four directions (horizontal, vertical, two diagonals). If no direction contains a window of four that is free of opponent discs, all empty cells in c are dead.

### 3.4 Dead-Space Parity Formula → KB: [derived-dead-space-parity](knowledge-base/derived-dead-space-parity.md)

After all dead-space moves are exhausted, the player forced to make the first meaningful (non-dead) move is determined by:

```
(n + S_dead) mod 2
```

where:
- `n` = number of moves already played at the time of analysis
- `S_dead` = number of dead-space cells remaining

**Result = 0 → Red is forced** to make the next non-dead move.  
**Result = 1 → Black is forced.**

**Why n matters:** Zugzwang depends on whose turn it is *after* all dead moves are exhausted, not just how many dead cells exist. At game start (n = 0) the formula simplifies to `S_dead mod 2`, which is why some sources omit n — but that shortcut is only valid at the start or when n is known to be even.

**Derivation:** The formula follows from the basic turn-order rule: when an even number of empty spaces remains, it is Red's turn (source: en.wikibooks.org/wiki/Connect_Four). After n moves with S_dead dead-space moves still to come, the first non-dead move arrives when 42 − n − S_dead spaces remain; that count is even iff (n + S_dead) is even, giving Result = 0 → Red is forced.

**Caveat:** the formula assumes S_dead is stable, i.e., no currently-dead cell becomes live (or vice versa) during the remaining play. For end-of-game zugzwang analysis this typically holds; for mid-game positions, recompute S_dead at each step.

### 3.5 Precursor Structures

Three board configurations reliably precede zugzwang:

- **Threat stacks:** A column containing 2+ threats for the same player. If the two threats are on adjacent rows (r and r+1), this is an adjacent pair — terminal and always winning (T1). Non-adjacent threat stacks may interact with parity (T2–T4).
- **Dead columns:** Columns with no threat formable; pure zugzwang fuel.
- **Segmented boards:** The center column (D) is full or contains a mutual threat, splitting the remaining board into two independent sub-games. Zugzwang is analyzed per sub-game.

### 3.6 Claimeven as Zugzwang Tool

Black can maintain a zugzwang-neutral or zugzwang-favorable position by responding to every Red move in the same column (see §5). By ensuring every column has an even number of empty spaces, Black guarantees that Red is always forced to make the next meaningful move. This is Black's primary structural defense.

### 3.7 Tempo Management

Techniques for controlling or escaping zugzwang:

- **Sacrificial forcing move:** Play a "useless" disc in a completely neutral column to pass the zugzwang burden back to the opponent.
- **Column exhaustion:** Systematically fill dead columns to advance the endgame until the opponent is forced into the critical column.
- **Threat timing:** Hold a latent forcing sequence in reserve; deploying it too early may give the opponent a disc that creates their own counter-threat.

---

## 4. Claimeven

### 4.1 Mechanics

A **claimeven position** is one where every column has an *even* number of empty spaces. Black wins any claimeven position — **provided Red has no unrefuted odd-row threat** — by following a single rule: whenever Red plays in a column, Black immediately plays in the same column (the cell directly above Red's disc). (Source: Allis 1988 thesis §5.2 [informal] and §6.1 [formal definition], tromp.github.io/c4/connect4_thesis.pdf. The control-of-zugzwang preconditions are developed in §4 — see §4.5 for 'An odd threat for White gives him control of the Zugzwang.')

**Why it works:** By responding in the same column, Black ensures:
1. Red fills all odd rows (1, 3, 5) in every column.
2. Black fills all even rows (2, 4, 6).
3. If Red has no odd-row winning line that isn't undercut by a Black even-row line, Black wins.

**Critical precondition:** If Red has already created an odd-row threat (a threat on an odd row that Black cannot refute via the §4.2 failure conditions), Red — not Black — controls the Zugzwang, and the follow-up strategy no longer guarantees Black a win.

### 4.2 Failure Conditions

Claimeven fails in two situations:

1. **Red has an unundercut odd-row threat.** If Red possesses a threat at row 3 or row 5 in some column c, and Black has no threat at row 2 or row 4 in column c below it, then Red's threat is not undercut. Black must deviate from the naive call-and-response.

2. **Column has odd empty spaces.** If a column has an odd number of empty spaces, the naive "respond above Red" rule breaks the even-parity invariant for that column.

### 4.3 Handling Odd Columns

When a column has odd empty spaces, Black's correction is:

> If Red plays in the odd-space column, Black also plays in that column (converting it from odd to even spaces remaining), then resumes claimeven everywhere else.

This reduces the position to a simpler claimeven configuration.

### 4.4 Role in Allis's Proof

Claimeven positions form an "island of simplicity" in Connect Four's enormous game tree. Allis's 1988 proof uses claimeven positions as **footholds**: once a position is recognized as claimeven, the entire subtree collapses to a simple pairing argument without search. Positions not directly claimeven are reduced toward claimeven configurations through forced sequences.

---

## 5. Threat Taxonomy

A single threat can have multiple properties simultaneously. These axes are orthogonal.

*Canonical taxonomy note: Allen's *Expert Play in Connect-Four* (tromp.github.io/c4.html) uses: Major (exactly 1 non-vertical cell missing), Minor (exactly 2 cells missing in a non-vertical window), Odd/Even (threat on an odd/even row), Mixed (window contains both players' discs — dead). Vertical threats are classified as Atari (immediately playable) rather than Major or Minor. The multi-axis taxonomy below extends these concepts; the Z-Threat/0-Threat/#-Threat labels do not appear in Allen or Allis.*

### 5.1 Structural Axis (how many cells missing)

| Property | Definition |
|---|---|
| **Major** | Exactly 1 (non-vertical) cell missing to complete a four-in-a-row. *Vertical threats are excluded from this classification — they are either immediately playable (atari) or not yet relevant.* (Allen 1990 glossary; Allen 2010 ch. 3.) |
| **Minor** | Exactly 2 cells missing in a non-vertical four-in-a-row. *(Configurations with 3 or 4 empty cells are not separately classified in canonical literature.)* (Allen 1990 glossary.) |

### 5.2 Playability Axis (can it be played now)

| Property | Definition |
|---|---|
| **Direct** | The threat cell is the next legal move in its column (immediately playable) |
| **Latent** | The threat cell is floating — one or more cells below it are still empty |

A "Major Direct" threat (3 discs + immediately playable empty cell) is a check — the opponent must block or lose.

### 5.3 Topological Axis (spatial relationships)

| Property | Definition |
|---|---|
| **Compound** | Two or more threats intersect at a single empty cell (a fork) |
| **Unavoidable** | Latent + parity-aligned + no opponent threat below it in the same column |
| **Mutual** | Both players can win by playing the same cell |

### 5.4 Zugzwang Axis (parity interaction) → KB: [community-z-threat](knowledge-base/community-z-threat.md)

| Property | Definition |
|---|---|
| **Z-Threat** | Odd number of empty cells between the current column height and the threat cell (inclusive). Owning this threat lets the player toggle zugzwang control. |
| **0-Threat** | Even number of empty cells to reach it — zugzwang-inert unless directly terminal |
| **#-Threat** | A mutual terminal threat pair; whoever is forced to play that column loses |

### 5.5 Undercut Axis (reachability)

| Property | Definition |
|---|---|
| **Deceptive** | Vertically undercut by an opponent threat below it — mathematically unreachable without losing first |

---

## 6. Undercutting and Overcutting

### 6.1 Undercutting

**Undercutting** occurs when an opponent has a threat at (c, r′) with r′ < r, in the same column as your threat at (c, r). Because r′ is reached before r (gravity fills columns bottom-up), filling cell (c, r′) ends the game in the opponent's favor before (c, r) can be played.

```
Undercut(T_high, T_low) ⟺
  Column(T_high) = Column(T_low) ∧
  Row(T_high) > Row(T_low) ∧
  Color(T_high) ≠ Color(T_low)
```

A threat that is undercut becomes **Deceptive** — it has zero strategic value.

**Example:** Red has a threat at C5. Black has a threat at c4. If Red ever plays c4 to reach C5, Black wins immediately at c4. Red's C5 threat is dead.

### 6.2 Overcutting

**Overcutting** occurs when your major threat at (c, r) neutralizes the opponent's minor threat at (c, r′) with r′ < r. Because your major threat is in the same column and at a higher row, the opponent is forced to play column c to build toward their threat — but playing c eventually delivers the column to you, completing your major threat first.

Overcutting is less absolute than undercutting; it depends on the column filling order and parity.

### 6.3 Self-Overcut (Forbidden Squares)

A **forbidden square** is a cell where playing immediately enables the opponent to win on the next turn (the cell directly above becomes a Major Direct threat for the opponent). Playing a forbidden square is a one-move self-overcut.

Detection: for each legal column c, simulate placing a disc and check whether the resulting position gives the opponent a Major Direct threat at (c, height+1).

### 6.4 Threat Resurrection

A dead (undercut) threat can be **resurrected** if the killing disc is played but does not result in an immediate win. This occurs when the opponent's killing threat (the one that undercut yours) is itself blocked or undercut by a third threat. In practice this is rare, but detectors must account for it — a threat's status is conditional on the full column context, not just the current snapshot.

### 6.5 Claimeven as Systematic Undercutting

In a claimeven position, Black's call-and-response strategy undercuts every Red odd-row threat with a Black even-row threat in the same column: Red places at (c, 2k−1), Black immediately places at (c, 2k). Black's even-row (c, 2k) is below any future Red odd-row threat at (c, 2k+1), ensuring that Red must fill through Black's disc first.

---

## 7. Tactical Patterns

All fork-based patterns work by the same principle (**Baseinverse**): a player creates two simultaneous threats that require blocking, but the opponent can only block one per turn. The patterns below are canonical realizations of this principle.

### 7.1 J Configuration / J-Shape → KB: [allen-j-configuration](knowledge-base/allen-j-configuration.md)

**What it is:** A cluster of four discs that generates a triple minor threat — three separate winning continuations — making it practically impossible to block.

**Canonical configuration (Red):**
```
Col:   A  B  C  D  E  F  G
Row 3:          R  R  .        ← Red discs at D3, E3; primary threat at F3
Row 2:             R  .        ← Red disc at E2; F2 empty
Row 1:          R              ← Red disc at D1
```

Canonical cells Red must own: **{D1, D3, E2, E3}**  
Primary threat target: **F3** (completes horizontal D3–E3–F3–G3)  
Secondary targets: **G3** or **G4** via diagonal continuations  
(Sources: Allen 1990 glossary at tromp.github.io/c4.html names this the "J Configuration," defined as "the common winning Eques configuration comprising D1-D3-E2-E3 or its mirror image." Allen's later Hasbro book (Allen 2010 ch. 5) uses "J-Shape" and "J-Shape Races." Both terms are canonical synonyms from different Allen works.)

**Generalized predicate:**
```
J_Shape(P, x, y) ⟺
  Owns(P, x, y) ∧ Owns(P, x, y+2) ∧
  Owns(P, x+1, y+1) ∧ Owns(P, x+1, y+2)
```

**Variants:**
- **Mirror J Configuration:** {(x, y), (x, y+2), (x−1, y+1), (x−1, y+2)} — horizontal reflection
- **Shifted J Configuration:** canonical at (C1, C3, D2, D3) — one column left

**Mechanism:** Once Red owns the J Configuration, play inevitably progresses up the adjacent columns. Whether Black responds on column F or column G, Red eventually gains F3 as a Major Direct threat. At that point Red possesses zugzwang control.

**Failure conditions:**
- **Overcutting:** Black controls f4 or d4/e4, preventing Red from marching up toward F3 safely.
- **Edge proximity:** The required extension cells (e.g., H3) are off the board.
- **Parity cancellation:** Black holds two odd-row threats in separate columns, canceling Red's zugzwang advantage.

### 7.2 Figure-7 → KB: [community-figure-7](knowledge-base/community-figure-7.md) · [community-sextuple-threat](knowledge-base/community-sextuple-threat.md)

*(The "Figure-7" or "Figure Seven Trap" is a widely used community term — standard in play guides and tutorials (play4row, Reader's Digest, YouTube) but not found in academic Connect Four literature (Allis, Tromp, Allen). The geometry and forced-win logic are independently verified.)*

**What it is:** Five discs forming the shape of the digit "7" — three in a diagonal, three in a horizontal, sharing one disc at the intersection. The defining property is that it generates two threats **in the same column** on adjacent rows, making it impossible to block both.

**Canonical configuration (Red):**
```
Diagonal arm: {C1, D2, E3}
Horizontal arm: {C3, D3, E3}
Shared disc: E3 (the "hinge")
Threat cells: F3 (horizontal extension) and F4 (diagonal extension)
```

Both F3 and F4 are in **column F**. Blocking F3 (playing f3) immediately makes F4 a Major Direct threat, and vice versa.

**Formal predicate:**
```
Fig7(P, x, y) ⟺
  Owns(P, {(x,y), (x+1,y+1), (x+2,y+2)})      -- diagonal arm (ascending, hinge at top-right)
  ∧ Owns(P, {(x,y+2), (x+1,y+2), (x+2,y+2)})  -- horizontal arm (left base to hinge)
  -- threats at (x+3, y+2) [horizontal ext.] and (x+3, y+3) [diagonal ext.]
  -- both in column x+3 — the same-column property is always satisfied
```

**The same-column property is the defining characteristic.** A configuration with a diagonal arm and horizontal arm sharing a hinge cell, but whose two threat extensions land in *different* columns, is a fork but not a Figure-7.

**Variants:**
- **Mirror-7:** `f(col) = G − col` (horizontal reflection)
- **Inverted-7:** Diagonal descends instead of ascending; uses rows 4–6
- **Incomplete-7:** The hinge cell is empty; both arms have only 2 discs each. Creates a shared-threat predicate when completed.

**Failure conditions:** If the hinge cell (E3 in the canonical example) is occupied by the opponent, both arms are broken simultaneously.

*A denser overlap — sometimes called a "Sextuple Threat" in this project — can arise when J Configuration and Figure-7 structures share adjacent columns. This is a project-specific heuristic label; no external source catalogues it.*

---

## 8. Threat-Space Search, VCF, and VCT

*Note: TSS, VCF, and VCT are canonical Gomoku/Renju terms (TSS formalized by Allis et al. 1993 for Gomoku). VCF = "Victory by Continuous Fours" (every attacking move creates an unblocked four); VCT = "Victory by Continuous Threats" (broader forcing sequences including threes and preparatory moves). Neither acronym appears in canonical Connect Four literature (Allis 1988, Allen, Tromp), which instead uses threats, parity, zugzwang, and the nine strategic rules. They are adapted here as a conceptual scaffold because the underlying ideas — chains of forced checks and strategic threat accumulation — translate directly to Connect Four even though the terminology is non-native.*

### 8.1 Threat-Space Search (TSS)

TSS is a search algorithm that drastically reduces the branching factor by restricting node expansion to **threat-generating moves** only.

**Attacker's moves:** Only moves that create at least one new winning line of three discs + one empty cell.

**Defender's moves:** Only moves that block the attacker's most dangerous threats (Major Direct threats first).

**Node expansion priorities (attacker):** Horizontal threats > Diagonal threats > Vertical threats.

**Termination:**
- **Win:** A forcing sequence is found where every attacker move is a check and every defender response is unique → VCF found.
- **Loss:** All attacker sequences are refuted.
- **Draw:** Board fills with no forced sequence achieved.

TSS identifies forcing sequences of 5–20 plies that mimic human expert focus on favorable board sections.

### 8.2 VCF — Victory by Continuous Fours (Gomoku origin, adapted)

**VCF** (canonically "Victory by Continuous Fours" in Gomoku; adapted here as a sequence of continuous forcing checks) is a strict subset of TSS where every attacker move is a **Major Direct threat** (check). The defender's response at each step is uniquely forced (block or lose immediately). A VCF sequence is a "mate-in-N" sequence.

**Properties:**
- Defender moves are 100% determined — no branching on defense.
- Can be found by depth-first search exploring only checking nodes.
- Difficulty scales with the ply depth of the forcing sequence.

**Canonical example (mate in 3):** Move sequence C3 (check) → Black blocks → B2 (check) → Black blocks → A2 (win).

### 8.3 VCT — Victory by Continuous Threats (Gomoku origin, adapted)

**VCT** is the broader category where the attacker creates a new threat every move, but not all moves need to be immediate checks. Some attacker moves may create **Latent major threats** or **Z-threats** that constrain the opponent strategically.

VCT requires deeper search than VCF because the defender has more options at each step. The attacker's goal is to accumulate threats faster than the defender can neutralize them, eventually reaching a zugzwang or VCF position.

**VCF ⊂ VCT ⊂ TSS.**

---

## 9. Opening Theory

### 9.1 The 5-4 Opening

Red builds a stack of 5 discs in column D (D1, D3, D5 own; d2, d4 opponent's responses) then 4 in column E. With perfect continuation, Red wins. The critical deviation: if Red deviates to C1 instead of D5, the advantage flips to Black. (Source: tromp.github.io/c4.html — "Joseki 7-8"; 5-4 line confirmed.)

### 9.2 The 3-4 Opening

A variation of 5-4 where Red delays the D5 capture, allowing more diagonal variety. Red accepts a slightly longer forcing sequence in exchange for less predictable mid-game patterns. (Source: James D. Allen's Joseki analyses of forced Connect Four sequences, late 1980s.)

Allen 2010 catalogues 26+ josekis (Chapters 9, 12, 13). Beyond what a human can reasonably memorize, positions are best evaluated via the solver.

---

## 10. Allis's Nine Strategic Rules

These are the nine mathematically proven strategic constructions used by Allis's VICTOR program to solve Connect Four (Allis 1988 thesis, Chapter 6; tromp.github.io/c4/connect4_thesis.pdf). They are proven theorems, not heuristics — Allis explicitly distinguishes them from approximate strategies. Allen 2010's T1–T7 and V1–V5 (§§2.5–2.6) are a complementary canonical formalization, focused on major-threat endgame analysis. They are not derived from Allis's nine rules but address an adjacent problem (predicting endgame outcomes from a stable major-threat configuration) and are themselves proven correct in Allen 2010 Chapter 4.

| # | Rule | Thesis § | Definition |
|---|---|---|---|
| 1 | Claimeven | §6.1 | Two vertically adjacent empty squares where the upper is even. If the opponent plays the lower (odd) square, the controller immediately plays the upper (even) square, guaranteeing ownership of it. → KB: [allis-claimeven](knowledge-base/allis-claimeven.md) |
| 2 | Baseinverse | §6.2 | Two directly playable squares paired together. The opponent can only play one, so the controller always obtains the other. → KB: [allis-baseinverse](knowledge-base/allis-baseinverse.md) |
| 3 | Vertical | §6.3 | Two vertically adjacent empty squares where the upper is odd. Guarantees access to at least one of the two squares. → KB: [allis-vertical](knowledge-base/allis-vertical.md) |
| 4 | Aftereven | §6.4 | A group completed through a collection of Claimevens. When the opponent opens a Claimeven column, the controller responds above, preserving the required even squares. → KB: [allis-aftereven](knowledge-base/allis-aftereven.md) |
| 5 | Lowinverse | §6.5 | Two columns each containing a Vertical configuration (odd number of empty squares). Because two odd counts sum to an even number, the opponent is forced to open one column first, surrendering its upper odd square to the controller. Two isolated odd-parity columns become a paired zugzwang asset. → KB: [allis-lowinverse](knowledge-base/allis-lowinverse.md) |
| 6 | Highinverse | §6.6 | Extends Lowinverse to also include the even-numbered squares directly above each Vertical pair. The controller gains not just the upper odd squares but also the even squares above them, compounding the parity advantage across two rows. → KB: [allis-highinverse](knowledge-base/allis-highinverse.md) |
| 7 | Baseclaim | §6.7 | One Claimeven + two Baseinverses. Depending on the opponent's move order, either the Claimeven response or a Baseinverse secures the critical square. → KB: [allis-baseclaim](knowledge-base/allis-baseclaim.md) |
| 8 | Before | §6.8 | A winning group prepared in advance using embedded Claimevens and Verticals before the opponent can interfere. → KB: [allis-before](knowledge-base/allis-before.md) |
| 9 | Specialbefore | §6.9 | A specialized Before with one directly playable square and an additional external playable square that together preserve the winning structure. → KB: [allis-specialbefore](knowledge-base/allis-specialbefore.md) |

**Claimeven family** (rules that directly encode or build on the "respond directly above" invariant): Claimeven, Aftereven, Baseclaim, Before, Specialbefore.

**Parity control family** (rules related to structural parity without being plain Claimeven constructions): Vertical, Lowinverse, Highinverse, Baseinverse.

