# Connect Four Strategic Principles (Parity-Neutral)

## Core Concept: Parity Control

### What "the parity-controlling player" means

In Connect Four, squares are classified by row parity:
- **Odd squares**: rows 1, 3, 5 (counting from the bottom)
- **Even squares**: rows 2, 4, 6

When all remaining columns have an **even number of empty squares**, the player whose turn it is (White, the first player) is in a bind: any column they enter will leave an odd number of empty squares in that column, allowing the opponent to immediately respond in the same column. If Black (the second player) follows this "follow-up" strategy — always responding in the same column — Black will obtain all even squares and White will obtain all odd squares, with White having no way to break this.

**Formal definition (Allis 1988):** *A player is in control of the Zugzwang if they are able to guide the way odd and even squares are divided among both players.*

In the initial position, Black controls the Zugzwang because all columns are empty (even number of empty squares in each), so White must move first and Black can always play follow-up.

**Practical consequence:** The parity-controlling player can guarantee ownership of even squares — and therefore invalidate opponent threats that require odd squares — without needing to calculate specific move sequences. The strategic rules below describe how this guarantee is exercised or maintained.

### How White gains control

White starts without control — Black holds it by default because all columns begin with an even number of empty squares. Black cannot exploit this immediately, however: pure follow-up from move 1 gives White all of row 1 and an instant win. Black is therefore forced to take some odd squares early, and this is White's window.

**The mechanism:** White creates an **odd threat** (a winning threat on an odd-numbered row) in a column that Black cannot safely enter. That column is effectively removed from Black's follow-up calculus. If White then plays elsewhere so that all remaining accessible columns have an even number of empty squares, it becomes Black's turn on a fully even board — and White can play follow-up. Control has shifted.

**The core trade:** Black gives up an odd square to contest something critical; White responds by establishing a poisoned odd-threat column. Once Black is locked out of that column, White restructures the rest of the board to even and seizes Zugzwang.

A player who controls parity (zugzwang/follow-up) can predict which rows they will naturally obtain in future play.

Most strategic rules are mechanisms for guaranteeing ownership — or denial — of critical squares.

---

# Claimeven

## Structure

A vertical pair of empty squares:

```text
upper square  ← controlled parity square
lower square  ← must be played first
```

Example:

```text
e4
e3
```

## Principle

If the opponent must play the lower square before accessing the upper square, the parity-controlling player can guarantee ownership of the upper square.

## Result

Any opponent threat requiring the upper square becomes impossible.

## Abstract Idea

```text
If you open this column,
I get the important square above.
```

---

# Vertical

## Structure

A vertical pair of empty squares:

```text
upper square
lower square
```

Example:

```text
e5
e4
```

## Principle

The parity-controlling player can guarantee that the opponent will not safely obtain both squares.

## Result

Many vertical or diagonal threats requiring ownership of both squares become impossible.

## Abstract Idea

```text
You cannot safely control this vertical pair.
```

---

# Baseinverse

## Structure

Two directly playable squares.

Example:

```text
a1 and b1
```

## Principle

If the opponent takes one square, the controller immediately takes the other.

## Result

The opponent cannot obtain both squares simultaneously.

## Abstract Idea

```text
You choose one;
I get the other.
```

---

# Aftereven

## Structure

A collection of Claimevens whose controlled parity squares invalidate larger structures.

## Principle

If certain parity squares are guaranteed, then all opponent groups requiring those squares become impossible.

This effect propagates upward through future structures.

## Result

Entire families of threats become dead.

## Abstract Idea

```text
Because I control these parity squares,
all structures depending on them collapse.
```

---

# Lowinverse

## Structure

Two vertical pairs across two columns.

Example:

```text
a5/a4
b5/b4
```

## Principle

The controller can guarantee that the opponent will not safely obtain both important upper squares.

## Result

Coupled threats across the two columns are neutralized.

## Abstract Idea

```text
You cannot successfully control both columns.
```

---

# Highinverse

## Structure

A taller extension of Lowinverse involving three-square vertical structures.

Example:

```text
a6
a5
a4

b6
b5
b4
```

## Principle

The controller uses parity and vertical relationships to guarantee ownership denial across larger structures.

## Result

Multiple future threats become impossible simultaneously.

## Abstract Idea

```text
The upper structure is parity-locked.
```

---

# Baseclaim

## Structure

A combination of:
- Baseinverse
- Claimeven

## Principle

If the opponent attacks through one route, the controller responds through the Baseinverse relationship.

If the opponent attacks through another route, the controller responds through parity control.

## Result

At least one defensive mechanism always survives.

## Abstract Idea

```text
Whichever path you choose,
a defensive response remains available.
```

---

# Human Interpretation of These Rules

These principles are not primarily about:
- tactics,
- immediate moves,
- or local patterns.

They are mostly about:
- move order,
- parity,
- ownership guarantees,
- and denying future structures.

The core strategic question is usually:

```text
Who will eventually be forced
to open which columns?
```
