# Coach Explanation Principles: Grounded, Honest Move Explanations

## Overview

The coach LLM explains why a move the player made was worse than a better
alternative. Today it does this with a single prompt shape that asks the model to
"identify the concrete threats that leave you without a defense" — regardless of
whether any such threats exist. On early-game and quiet positions this forces the
model to invent board facts, producing explanations that are fluent but false.

This document defines a **principled algorithm for building the prompt and context**
for the coach, organized around one overarching design principle — **honesty** —
and a taxonomy of explanation types selected by what evidence the position actually
provides. It is written to drive a plan and implementation; the data each prompt
needs is specified precisely enough to double as a spec for the simulation layer.

---

## The problem, in two real cases

Both are real rows from `llm_feedback` flagged by the user.

### Case A — invented threat on occupied cells (`e86eeac9`, movestring `3444444335311110`)

16 discs on the board. `Major threats: none` for the player. The coach wrote:

> "…creating a parity-sensitive threat in column 2 `[zone:cells:c2r1,c2r2]`…"

But **c2r1 and c2r2 are both already occupied** (Grey and Green respectively). There
is no threat there. The model took z-threat location data that described *downstream
simulated positions* and reattached it to the *current* board, then narrated a threat
on filled cells.

User note: *"I don't understand the parity sensitive threat… I don't see the threat."*

### Case B — winning line through own disc (`8d83947e`, movestring `34`)

2 discs on the board. `Major threats: none`. The coach wrote:

> "…the diagonal through `[zone:cells:c4r3,c5r2,c6r1]`…"

But **c5r2 is a Green disc** — it cannot be part of a Grey winning line. With nothing
concrete to point at, the model fabricated a plausible-sounding diagonal that crosses
its own player's disc.

User note: *"The cells you mention include a green disk."*

### Shared root cause

Both failures share one mechanism: **the model generates spatially specific claims by
reading board geometry itself, and the prompt obliges it to assert a concrete tactical
flaw even when none is visible.** The fix is structural, not cosmetic:

1. The model must never derive cells from the board. The **context block does all
   spatial reasoning** and hands the model a closed set of pre-labeled, pre-validated
   facts. The model composes prose from those facts only.
2. The prompt must **stop forcing a "this is weak" narrative** when the move is only
   marginally worse. The pressure to manufacture a flaw is itself a root cause.

---

## Design principle: honesty

Honesty is the top-level constraint that all other rules serve. Concretely:

- **Never assert a board fact that isn't true.** If a cell is occupied, it is not part
  of a future winning line. If `Major threats: none`, there is no current threat.
- **Never inflate the severity of a move.** If the alternative is only marginally
  better, say so. A near-tie explained as a blunder is dishonest and erodes trust.
- **Prefer "I can point at this" over "this sounds insightful."** A smaller, fully
  grounded claim beats a larger, partly-invented one.
- **When the position offers no concrete crime scene, explain at the level the
  position supports** (structure / parity), rather than fabricating a tactic.

Every rule below is downstream of this principle.

---

## Explanation taxonomy

The explanation **type is selected by the evidence present in the position**, not
chosen freely by the model. Priority order (first match wins):

| Type | Trigger | What the explanation says | Confabulation risk |
|---|---|---|---|
| **1 — Immediate** | A direct win was available, or an opponent immediate threat was ignored | Cite the exact 4-cell winning line | Near-zero (line is explicit) |
| **2 — Tactical** | Critical position shows ≥2 simultaneous opponent major threats, or a named scaffold (Figure-7, J-config) | Describe the fork / same-column double threat with the real cells | Low — only if `Major threats ≠ none` |
| **3 — Parity / structural** | No fork visible, but the `par` row shows a parity shift tied to a real major threat | Explain who now lands on the key cell, using the `par` data | Medium — must use provided parity facts |
| **4 — Development** | Sparse board, `Major threats: none`, no fork — early/quiet position | Explain what the better move *builds toward* (columns + winning parity, concrete group only if earned) | **Highest** — this doc's main subject |

The current single prompt is effectively a always-Type-2 prompt. The two failures are
both Type-4 positions being explained with Type-2 machinery. **The selection step is
the missing piece.**

---

## Core mechanism: winning groups of 4, by frequency, labeled by parity

The unifying idea across all types — and the only honest lever in Type 4 — is the
**specific group of 4 cells**, not abstract pattern names.

> A move is worse because it **reduces how often a specific winning line completes**
> across the best continuations, relative to the better move.

Two layers:

1. **Empirical (which group matters):** Across simulated continuations after move A vs
   move B, count how often each specific group of 4 completes as a win (or becomes a
   major threat). The groups with the largest A-vs-B frequency delta are the subject of
   the explanation. This is strong mid/late, weak early (sparse boards have flat,
   noisy counts).

2. **Structural (why a sparse group already matters):** The knowledge base supplies a
   **parity label** for each group's key completing cell. By `allen-v1`/`allen-v3`
   (Red wins on odd rows) and `allen-v2`/`allen-v4` (Yellow on even rows), a group
   whose completing cell sits on the player's winning parity is structurally valuable
   *even when empty*. This is what makes an early-game explanation honest and
   pointable instead of hand-wavy.

The empirical layer answers **"which group"**; the KB parity layer answers **"why this
sparse group already matters."** Together they let the coach say, on a near-empty
board, *"this move keeps alive a winning line in column X on your odd row"* — pointing
at a real column and a real reason, with no invented cells.

---

## Locked product decisions

| # | Decision | Choice | Rationale |
|---|---|---|---|
| D1 | Tone on near-ties | **Honest about margin** | When the eval gap is small, the coach states both moves are reasonable and the alternative is "slightly more principled." Escalates to mistake-language only when the gap is genuinely large. Removes the structural pressure to invent a flaw. |
| D2 | Concreteness on sparse boards | **Adaptive by disc count** | Highlight a specific group of 4 only when it already holds **≥2 of the player's discs**; otherwise refer to column + winning-row-parity. Concrete when concreteness is earned, abstract when it isn't. |
| D3 | What drives tone | **Eval gap, not stage** | Type 4 is "no concrete crime scene yet," not "everything is fine." A sparse board with a genuinely large gap still gets firm language. Stage selects *what kind of evidence* the explanation uses; the gap selects *how strong the language is*. |

---

## The grounding contract (anti-confabulation)

This is the load-bearing invariant. **The model may only reference cells, columns, and
groups that appear in the context block, and only as labeled there.**

- Every mentionable cell is pre-listed with its **occupant** (`empty` / `Green` /
  `Grey`). The model may never describe an occupied cell as part of a future line.
- Every mentionable group of 4 is pre-listed with its **cells, occupants, key
  completing cell, that cell's row parity, and whether that parity is the player's
  winning parity**.
- Each group is pre-flagged **CONCRETE-ELIGIBLE** (≥2 of the player's discs already in
  it) or **ABSTRACT-ONLY** (fewer). ABSTRACT-ONLY groups may be referred to *only* as
  "a winning line in column X on an odd/even row" — the model may not enumerate their
  bare cells.
- If `Major threats: none`, the model may not assert any *current* threat. It may only
  discuss what moves build *toward*.
- Zone tags (`[zone:...]`) may wrap only cells/columns/groups that appear in the block.

The contract converts spatial reasoning from a model responsibility (error-prone) into
a data-preparation responsibility (testable). This is what makes Cases A and B
*structurally impossible* rather than merely discouraged.

---

## Context block specification

The context handed to the coach is built by the algorithm below. Shape (Type 4 shown;
other types reuse the same blocks plus type-specific evidence):

```
## Move context
- Player: Green (winning parity = ODD rows 1/3/5)   ← from KB parity rule
- Green played col A; best alternative col B
- Eval gap: small | moderate | large                ← drives tone (D1/D3)
- Stage: opening (N discs); major threats: none

## Boards
<before / after-A / after-B ASCII, as today, including the `par` row>

## Winning-line comparison (best vs worst continuations)
For each group of 4 with the largest A-vs-B completion-frequency delta:

GROUP_k:
  cells: c5r3, c6r3, c7r3, c4r3   (horizontal)
  occupants: c5r3=Green, c6r3=Green, c7r3=empty, c4r3=empty
  key completing cell: c4r3 — row 3 — ODD — IS Green's winning parity
  player_discs_in_group: 2          → CONCRETE-ELIGIBLE        (D2)
  completion frequency: after col B 41% | after col A 6%
```

The pre-computed fields are exactly the KB leverage made machine-usable:
`IS Green's winning parity` comes from the parity rules; `CONCRETE-ELIGIBLE` implements
D2; `Eval gap` implements D1/D3.

---

## The prompt-construction algorithm

Deterministic. Given a position, the played move A, and the solver's best move B:

```
1. CLASSIFY STAGE / EVIDENCE
   a. If a direct win existed for the player, or an opponent immediate threat was
      ignored            → Type 1
   b. Else if the critical (post-response) position has ≥2 simultaneous opponent
      major threats, or matches a named scaffold (figure_7 / j_config)
                         → Type 2
   c. Else if `par` shows a parity shift tied to an existing major threat
                         → Type 3
   d. Else               → Type 4

2. COMPUTE EVAL GAP
   gap = score(B) - score(A), bucketed → small | moderate | large   (D1/D3)

3. BUILD EVIDENCE
   - Run the continuation simulation for A and for B.
   - Extract, per continuation, the specific winning groups of 4 (see "Required
     simulation change" below).
   - Aggregate completion frequency per group; take the top-delta groups.
   - For each, fill: cells, occupants, key cell, parity, player-winning-parity flag,
     player_discs_in_group, CONCRETE-ELIGIBLE vs ABSTRACT-ONLY (D2).
   - Attach the KB parity rule that justifies the parity label.

4. ASSEMBLE CONTEXT BLOCK
   - Move context + boards + the type-appropriate evidence block.
   - For Type 4, the Winning-line comparison block; for Type 1/2, the explicit
     threat/winning lines; for Type 3, the `par`-grounded parity story.

5. SELECT FRAMING BY GAP (D1)
   - small    → "both reasonable; B slightly more principled"; no mistake language.
   - moderate → "B is clearly preferable"; explain the developmental edge.
   - large    → "B is important; A gives away real ground."

6. EMIT PROMPT
   - Role + players + winning-parity statement.
   - The grounding contract (verbatim, hard rules).
   - The tone instruction selected in step 5.
   - The task, scaled to type and gap.
```

The model's freedom is reduced to *prose composition over a closed, labeled fact set*.

---

## Type 4 prompt template

```
## Role
You are a Connect Four coach explaining, in the opening, why one move develops
better than another. There are no immediate threats on this board — do not
describe any threat, fork, or winning line as if it exists now. Everything you
say must be about what the moves build TOWARD.

## Players
Green and Grey. Green's winning lines complete on ODD rows (1,3,5); Grey's on
EVEN rows (2,4,6). Use only Connect Four terms.

## Hard grounding rules
- Reference ONLY cells, columns, and groups listed in "Winning-line comparison."
- Never name a cell not listed there.
- Never describe a cell as part of a winning line if its occupants entry is not
  `empty`.
- For ABSTRACT-ONLY groups: refer to "a winning line in column X on an odd row" —
  do NOT enumerate its cells.
- For CONCRETE-ELIGIBLE groups: you MAY highlight the listed empty cells.

## Tone (driven by Eval gap)
- small    → Both moves are reasonable; frame col B as slightly more principled,
             not col A as a mistake. Do not manufacture a flaw.
- moderate → col B is clearly preferable; explain the developmental edge.
- large    → col B is important; col A gives away real ground.

## Task
In 2–3 sentences: lead with what col B builds toward (name the column(s) and the
winning row parity; highlight a concrete group only if one is CONCRETE-ELIGIBLE).
Then say what col A gives up, scaled to the Eval gap. Use [zone:...] only on
cells/columns that appear in the comparison block.
```

Templates for Types 1–3 follow the same skeleton (Role / Players / grounding
contract / tone / task) but swap the evidence block and drop the "build toward"
softening for Types 1–2, where the crime scene is explicit.

---

## KB leverage map (which entries apply at which stage)

| Stage | Load-bearing KB entries | Role in the prompt |
|---|---|---|
| Early (Type 4) | `derived-parity-formula`, `allen-v1`, `allen-v3` (Red), `allen-v2`, `allen-v4` (Yellow) | Parity label on each group's key cell — the "why" for sparse groups |
| Early (Type 4) | `community-claimodd`, `allis-claimeven` | Center-column / odd-even race; why central groups matter early |
| Early→mid | `community-z-threat` | The buildable parity-aware unit bridging empty group → winning group |
| Mid (Type 2) | `allen-j-configuration`, `community-figure-7` | Named scaffolds the better move builds toward; same-column double threat |
| Late (Type 2/3) | `allen-t1`–`t7`, `community-parity-trap`, `community-ghost-threat` | Threat simplification & zugzwang — **only** when threats already exist |

**Explicit non-use:** `t1`–`t7`, `parity-trap`, `ghost-threat`, `overcut`,
`sextuple-threat`, `baseclaim`, `before`, `specialbefore` must **not** be invoked on
sparse boards. They require existing threats or dense positions. The current prompt's
"identify the concrete threats" instruction implicitly invites these onto empty boards
— a direct cause of the failures.

---

## Required simulation change (the concrete enabler)

`explainSimulate.js` today **discards the winning line at terminal leaves**
(`collectLeaves`: won/draw leaves return `patterns: null`). The core mechanism of this
document — comparing *which specific groups of 4 complete a win* between A and B —
requires that data. The minimum change:

- At won leaves, record the **specific 4-cell group** that completed the win (and its
  owner), instead of dropping it.
- Aggregate group completion frequency across continuations, keyed by the canonical
  4-cell group.
- Surface the top A-vs-B delta groups to the context builder with occupants + parity.

This is a focused change to the leaf handling and aggregation; it does not require
restructuring the search.

---

## Worked walkthroughs

### Case A (`3444444335311110`, 16 discs, `Major threats: none`)

- Step 1 → no win/loss available, no fork in critical position, `par` shift not tied to
  a real threat → **Type 4**.
- Step 3 → the differentiating groups are labeled with occupants; the col-2 cells the
  old output tagged (c2r1, c2r2) appear as `Grey` / `Green` occupied, so they are
  **ineligible to mention**. The model instead points at whichever group is genuinely
  CONCRETE-ELIGIBLE, or stays at column/parity level.
- Result: the invented "parity-sensitive threat in column 2" is structurally
  impossible.

### Case B (`34`, 2 discs, `Major threats: none`)

- Step 1 → **Type 4**; Step 2 → gap is essentially nil → **small**.
- No group has ≥2 Green discs this early → all **ABSTRACT-ONLY** → no bare cells
  emitted; c5r2 (a Green disc) can never be named in a Grey line.
- Framing: *"Both col 2 and col 5 are fine this early; col 2 keeps your central
  odd-row lines more flexible. Col 5 commits a touch soon — that's the only
  difference."* No invented diagonal, no green disc in a threat.

---

## Out of scope / open questions

- **Pattern-name vocabulary in output.** This design deliberately leads with the
  specific group of 4, not pattern names. Whether to *also* surface a name
  ("…this is the start of a J-shape") when the better move clearly builds a named
  scaffold is a follow-up decision, not required for correctness.
- **Threshold tuning.** The gap buckets (small/moderate/large) and the ≥2-disc
  CONCRETE-ELIGIBLE cutoff are starting points to validate empirically against flagged
  feedback, not fixed constants.
- **Type 3 grounding depth.** Type 3 (parity/structural) reuses the grounding contract
  but its evidence block (the `par`-derived story) is sketched here, not fully
  specified; it deserves its own pass once Type 4 is validated.
```
