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
- Tromp, J. Solver and state-space resources. tromp.github.io/c4/c4.html

---

## 2. Parity Theory

### 2.1 Row Ownership

The board has 6 rows (even). Red moves first. In any column that fills completely, Red places discs on rows 1, 3, 5 and Black on rows 2, 4, 6.

**Mantra: "Red likes odd numbers."** Red's natural rows are 1, 3, 5 (odd). Black's natural rows are 2, 4, 6 (even). A threat on a naturally-owned row is *parity-aligned*. (Source: Allis 1988 thesis §3.3 — "White likes to get odd threats"; tromp.github.io/c4/connect4_thesis.pdf)

A parity-aligned threat is strategically valuable because, all else being equal, if the column must be filled, the owning player will be the one to place the disc that completes it.

### 2.2 Parity Detection Formula

For a given column c with current height h (discs already in c), the next disc played in c lands on row h+1. Whether that row belongs to Red or Black depends on whose turn it is when that disc is played:

```
row_owner(c, move_number) = (move_number % 2 == 1) ? Red : Black
```

A threat at (c, r) is parity-aligned for Red if r is odd; for Black if r is even.

### 2.3 Endgame Parity Outcome Table

*Note: this table is a project-specific generalization extending Allis 1988 §3.3 cases 1–4 (one threat per player, different columns) to multiple threats. Several entries are disputed or confirmed wrong — **prefer the formula at the bottom of this section** over the table where they conflict.*

When the board is nearly full and both players have only latent threats remaining, the outcome is determined by the *net parity of unshared odd-row threats*:

| Red unshared odd threats | Black unshared odd threats | Result |
|---|---|---|
| 1 | 0 | Red wins |
| 3 | 0 | Red wins |
| 0 | 0 | Draw |
| 2 | 0 | Draw (even net — Red does not control zugzwang) *(disputed — formula predicts Red wins)* |
| 1 | 1 | Red wins (Black's odd-row threat is on Red's natural parity rows; Red controls zugzwang and Black's threat is useless) |
| 0 | 1 | Black wins *(disputed — formula predicts Draw; Black's odd-row threat may be asymmetrically weak)* |
| 0 | 2 | Black wins (Black uses claimeven to guarantee even rows) |
| 1 | 2 | Draw (Black's net advantage is +1, one short of the +2 needed to force a win; threats are mutually sacrificed) |

**General formula** (Allen, formalized in Bagan et al. 2025): Red wins if `Red_odd > Black_odd`; Black wins if `Black_odd ≥ Red_odd + 2`; otherwise Draw. *Note: the (1R, 1B) case is an exception — Red wins due to parity asymmetry (Black's odd-row threat is on Red's natural row and is functionally useless, per Allis). The simplified formula does not capture this asymmetry.* Where this table conflicts with the formula, the formula takes precedence — except for the (1,1) case above.

### 2.4 Parity Traps and Ghost Threats

A **parity trap** is a structural state where a player is compelled to fill the cell beneath their opponent's threat, handing the opponent the win. It occurs when a column has k empty cells, the opponent's threat sits at the top, and the player has no Z-threats elsewhere to toggle zugzwang.

A **ghost threat** is a visually apparent winning line that is mathematically unreachable. The most common cause: the cell is on the player's parity row, but the opponent holds a Z-threat in another column that flips who must play next, leaving the player unable to reach the threat before the column is consumed.

### 2.5 Threat Interaction Rules (T1–T7)

*Note: T1–T7 are project-specific formalizations derived from Allis 1988 parity theory. This naming scheme does not appear in any external source verified during cross-reference. The canonical mathematical framework is Allis's nine proven strategic rules (§10); T1–T7 are derived project heuristics, not those theorems.*

These rules determine whether two threats in the same column neutralize each other:

- **T1 (Adjacent pair — terminal):** Two major threats at rows r and r+1 in the same column for the same player = guaranteed win; one of them will be reached regardless of play order.
- **T2 (Cross-parity undercut):** A threat at an even row undercuts a same-player threat at the row above (odd). The lower, even-row threat is reached first, neutralizing the upper.
- **T3 (Double toggle):** Threats at rows 2 and 5 in the same column control zugzwang twice — equivalent to two independent odd-row threats.
- **T4 (Same parity, same column — independent):** Two threats at rows 3 and 5 (both odd) in the same column do not undercut each other; both remain active.
- **T5 (Different parity, different column — independent):** Threats at rows 3 (odd) and 6 (even) in separate columns do not interact.
- **T6 (Red even-row threat — worthless):** An isolated Red threat on an even row has zero strategic value unless it creates an adjacent pair with an odd-row threat.
- **T7 (Parity asymmetry — odd threats are not symmetric):** Red holding one odd-row threat and Black holding one odd-row threat in a different column = **Red wins**. Black's odd-row threat is on Red's naturally-owned parity rows; Red is not forced to sacrifice into it and simply controls zugzwang via its own threat. This is why Black needs a net +2 advantage in odd threats to overcome Red's structural parity advantage.

### 2.6 Victory Rules (V1–V5)

*Note: V1–V5 are project-specific formalizations generalizing Allis 1988 §3.3. This naming scheme does not appear in any external source verified during cross-reference. The canonical mathematical framework is Allis's nine proven strategic rules (§10); V1–V5 are derived project heuristics, not those theorems.*

Simplified endgame outcome rules when no immediate tactical sequences exist:

- **V1:** Red wins with three or more odd-row threats in separate columns (odd net advantage ≥ 3).
- **V2:** Black wins with two odd-row threats in separate columns (Black controls zugzwang via even count).
- **V3:** Red wins with one uncontested odd-row threat (no Black counter in the same column).
- **V4:** Black wins with an even-row threat if Red has no odd-row threats.
- **V5:** Otherwise, draw.

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

- **Offensive zugzwang:** Player holds an odd number of odd-row threats in separate columns, forcing the opponent to eventually play into one of those columns.
- **Defensive zugzwang:** Player is forced to make the next non-dead move, handing the opponent the right to play last in the critical column.
- **Mutual zugzwang:** Both players hold major threats at the same cell (or adjacent pair). Whoever is forced to play that column loses.

### 3.3 Dead Columns

A **dead column** is one where no four-in-a-row is formable for either player in any remaining empty cell. Dead columns contribute no threats but consume turns as they fill.

*Terminology note: "dead column" / "dead space" is used throughout this document as a project-local term. The Wikibooks Connect Four article (en.wikibooks.org/wiki/Connect_Four) uses "zugzwang spaces" for the related concept of cells that precede a critical square but are themselves non-decisive — a stricter definition than "dead column" as used here.*

Detection: for each empty cell (c, r) in column c, check all four directions (horizontal, vertical, two diagonals). If no direction contains a window of four that is free of opponent discs, all empty cells in c are dead.

### 3.4 Dead-Space Parity Formula

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

A **claimeven position** is one where every column has an *even* number of empty spaces. Black wins any claimeven position — **provided Red has no unrefuted odd-row threat** — by following a single rule: whenever Red plays in a column, Black immediately plays in the same column (the cell directly above Red's disc). (Source: Allis 1988 thesis §4.2–4.3, tromp.github.io/c4/connect4_thesis.pdf — "An odd threat for White gives him control of the Zugzwang … White will win the game, if Black cannot connect four men.")

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

### 4.4 Claimodd (Red's Variant)

*Note: "Claimodd" is not one of Allis's nine original strategic rules, nor does the term appear in Allen or any other canonical source. The label was coined by the WeakC4 project (2swap.github.io/WeakC4/explanation/) as part of its Steady-State Language. The underlying concept — Red forcing an odd-row threat while Black takes even rows — is canonical and appears in Allis under "odd threats," Baseinverse, and Vertical. "Claimodd" is used here as a compact label for that idea, but it is a WeakC4 term.*

When Red faces an all-even position, simple claimeven would give Red even rows — the wrong parity. Red's strategy is **"claimeven everywhere except claimodd in the center column."**

By responding above Black in all columns *except* column D, and playing *below* Black's moves in column D (or playing first in D), Red secures an odd-row threat in the center column while Black gets even rows everywhere else. Red then wins via the center column threat before the even-row resolution is needed.

### 4.5 Role in Allis's Proof

Claimeven and claimodd positions form an "island of simplicity" in Connect Four's enormous game tree. Allis's 1988 proof uses claimeven positions as **footholds**: once a position is recognized as claimeven, the entire subtree collapses to a simple pairing argument without search. Positions not directly claimeven are reduced toward claimeven configurations through forced sequences.

---

## 5. Threat Taxonomy

A single threat can have multiple properties simultaneously. These axes are orthogonal.

*Canonical taxonomy note: Allen's *Expert Play in Connect-Four* (tromp.github.io/c4.html) uses: Major (1 cell missing), Minor (2+ cells missing), Odd/Even (threat on an odd/even row), Mixed (window contains both players' discs — dead). The multi-axis taxonomy below extends these concepts; the Z-Threat/0-Threat/#-Threat labels do not appear in Allen or Allis.*

### 5.1 Structural Axis (how many cells missing)

| Property | Definition |
|---|---|
| **Major** | Exactly 1 cell missing to complete four-in-a-row |
| **Minor** | 2 or more cells missing |

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

### 5.4 Zugzwang Axis (parity interaction)

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

### 7.1 J Configuration (project alias: J-Shape)

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
(Source: Tromp's glossary at tromp.github.io/c4.html names this the "J Configuration," defined as "the common winning Eques configuration comprising D1-D3-E2-E3 or its mirror image." The name "J-Shape" used elsewhere in this project is a local alias for the same pattern.)

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

### 7.2 Figure-7

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

Opening theory beyond the 5-4 and 3-4 lines is not formally catalogued in canonical sources; positions are best evaluated via the solver.

---

## 10. Allis's Nine Strategic Rules

These are the nine mathematically proven strategic constructions used by Allis's VICTOR program to solve Connect Four (Allis 1988 thesis, Chapter 6; tromp.github.io/c4/connect4_thesis.pdf). They are proven theorems, not heuristics — Allis explicitly distinguishes them from approximate strategies. The project-specific T1–T7 and V1–V5 rules in §§2.5–2.6 are derived heuristics that approximate these constructions for programmatic evaluation.

| # | Rule | Thesis § | Definition |
|---|---|---|---|
| 1 | Claimeven | §6.1 | Two vertically adjacent empty squares where the upper is even. If the opponent plays the lower (odd) square, the controller immediately plays the upper (even) square, guaranteeing ownership of it. |
| 2 | Baseinverse | §6.2 | Two directly playable squares paired together. The opponent can only play one, so the controller always obtains the other. |
| 3 | Vertical | §6.3 | Two vertically adjacent empty squares where the upper is odd. Guarantees access to at least one of the two squares. |
| 4 | Aftereven | §6.4 | A group completed through a collection of Claimevens. When the opponent opens a Claimeven column, the controller responds above, preserving the required even squares. |
| 5 | Lowinverse | §6.5 | Two columns each containing a Vertical configuration (odd number of empty squares). Because two odd counts sum to an even number, the opponent is forced to open one column first, surrendering its upper odd square to the controller. Two isolated odd-parity columns become a paired zugzwang asset. |
| 6 | Highinverse | §6.6 | Extends Lowinverse to also include the even-numbered squares directly above each Vertical pair. The controller gains not just the upper odd squares but also the even squares above them, compounding the parity advantage across two rows. |
| 7 | Baseclaim | §6.7 | One Claimeven + two Baseinverses. Depending on the opponent's move order, either the Claimeven response or a Baseinverse secures the critical square. |
| 8 | Before | §6.8 | A winning group prepared in advance using embedded Claimevens and Verticals before the opponent can interfere. |
| 9 | Specialbefore | §6.9 | A specialized Before with one directly playable square and an additional external playable square that together preserve the winning structure. |

**Claimeven family** (rules that directly encode or build on the "respond directly above" invariant): Claimeven, Aftereven, Baseclaim, Before, Specialbefore.

**Parity control family** (rules related to structural parity without being plain Claimeven constructions): Vertical, Lowinverse, Highinverse, Baseinverse.

