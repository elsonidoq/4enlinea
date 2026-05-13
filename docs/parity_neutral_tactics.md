# Connect Four Strategic Principles (Parity-Neutral)

## Core Concept: Parity Control

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
