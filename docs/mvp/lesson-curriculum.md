# Connect Four Lesson Curriculum

_Research document — no implementation. Based on the strategy KB, classifier, and explanation engine as of 2026-05-28._

---

## Overview

11 MVP lessons + 2 post-MVP lessons (flagged). Target audience: 1000–1500 Elo players.

**What was cut and why:**
- Lessons about playing in a losing position (original L4, L14) — removed. Damage control in a lost position is low value for the target audience.
- Remaining Allis rules beyond Claimeven (baseclaim, before, specialbefore, baseinverse, vertical, aftereven, lowinverse, highinverse) — removed. Too abstract and academic for this Elo range.
- Allen V-rules full pipeline (original L15) — removed. The T1–T7 + V1–V5 system is a backend primitive, not a learner-facing lesson.
- Ghost threats as a single lesson (original L13) — broken into prerequisite pieces. Parity, Claimeven, Claimodd, and Z-Threats are MVP; Zugzwang Basics and Ghost Threats are post-MVP.

**Difficulty key**
- **Easy** — classifier tag exists, explainSimulate already tracks the pattern, LLM helper loads a KB statement. Puzzle filter + narration are production-ready.
- **Medium** — classifier tag exists but narration is partial or missing a KB statement, OR the puzzle filter needs a simple new query predicate with no new solver work.
- **Hard** — no classifier tag for the concept; needs a new detector, new KB prose injection, or cross-column endgame analysis the current engine doesn't support.

---

## MVP Lessons

### Lesson 1: Spot the Win

**Concept**
Before anything else, always check whether you can win right now. A direct winning move — one that places a piece to complete four in a row immediately — beats every other consideration.

**KB entries used**
- None required (trivial to explain from first principles)

**Puzzle filter**
```sql
category = 'immediate_threat'
```

**Explanation coverage**
`detectImmediateThreat` is in DETECTOR_REGISTRY. No `PATTERN_KB` entry in `llmCoachHelpers.js` — needs a one-line inline addition.

**Implementation difficulty: Easy**

---

### Lesson 2: Block Before You Build

**Concept**
If your opponent is one move from winning, stopping them is almost always your only legal good move. Scan the opponent's threats before planning your own attack.

**KB entries used**
- None (self-evident from the classifier predicate)

**Puzzle filter**
```sql
category = 'forced_block'
```

**Explanation coverage**
`detectForcedBlock` is in DETECTOR_REGISTRY. No `PATTERN_KB` entry — needs a brief inline addition.

**Implementation difficulty: Easy**

---

### Lesson 3: The Fork (Double Threat)

**Concept**
A fork is a move that creates two simultaneous threats your opponent cannot both stop. Since your opponent can only play one column per turn, they can block one threat at most — the other wins. Two flavours: (A) two threats in separate columns; (B) two threats in the same column on adjacent rows.

**KB entries used**
- None dedicated (inline `PATTERN_KB` entry already covers both cases)

**Puzzle filter**
```sql
category = 'double_threat'
```

**Explanation coverage**
Fully covered. `detectDoubleThreat` is in DETECTOR_REGISTRY; `PATTERN_KB.double_threat` already has an inline description including both Case A and B.

**Implementation difficulty: Easy** — everything is production-ready.

---

### Lesson 4: Odd Rows Belong to Red

**Concept**
Red always plays first, so if a column fills bottom-up, Red naturally lands on rows 1, 3, 5 (odd) and Yellow on rows 2, 4, 6 (even). A threat placed on your natural row is structurally aligned: all else equal, you reach it before your opponent. This is the foundation for Claimeven (Lesson 5), Z-Threats (Lesson 6), and the undercut/overcut (Lessons 8–9).

**KB entries used**
- `derived-parity-formula` — formal definition of row ownership and parity alignment

**Puzzle filter**
None. This is a reading/diagram lesson — a short interactive board showing which rows belong to each player, with a few illustrative positions. No puzzle or detector needed for MVP.

**Explanation coverage**
No detector or PATTERN_KB entry needed. The `derived-parity-formula` KB statement provides the prose.

**Implementation difficulty: Easy** — zero new code; reading lesson only.

---

### Lesson 5: Claimeven — Yellow's Pairing Strategy

**Concept**
Yellow has a powerful structural weapon: whenever Red plays in a column, Yellow immediately responds in the cell directly above. By doing this everywhere, Yellow guarantees access to all the even-row cells on the board. Since Yellow's threats naturally land on even rows, this systematic mirroring eventually forces Red to fill the cells below Yellow's winning threats. The whole board becomes a trap.

**KB entries used**
- `allis-claimeven` — formal definition, the two-column extension, combination rules

**Puzzle filter**
```sql
category = 'claimeven'
-- optionally filter by userPlayer = 2 (Yellow perspective)
```
`detectClaimeven` fires when ≤2 columns have odd parity and the simulation confirms Yellow wins.

**Explanation coverage**
`detectClaimeven` is in DETECTOR_REGISTRY (isAsync: true). `PATTERN_KB.claimeven` loads `allis-claimeven`. The simulation trace in `categoryEvidence.simulation_trace` enables step-by-step narration ("Red plays C3, Yellow responds C4…") that is not yet written — a basic version ("Yellow wins by always responding above Red") is sufficient for MVP.

**Implementation difficulty: Medium** — classifier and KB loading exist; `detectClaimeven` is expensive (~20 solver queries per position) so puzzle selection should pre-filter by `colHeights` parity count (≤2 odd columns) at generation time before running the full simulation.

---

### Lesson 6: Z-Threats — Own the Column

**Concept**
A Z-Threat is a threat where the number of empty cells between the current column top and your threat cell is odd. This odd count means that if your opponent is ever forced to play into that column, they fill the odd cells leading up to your threat — and then you play the threat cell. You "own" that column's destiny. Z-Threats are the operational form of the parity principle from Lesson 4.

**KB entries used**
- `community-z-threat` — definition, formal predicate, difference from raw row parity
- `derived-parity-formula` — the row-ownership formula (introduced in Lesson 4)

**Puzzle filter**
```sql
category = 'z_threat'
-- detectZThreat.matched === true for correct_col
-- and scores[correct_col] > 0
-- best puzzles: exactly one column has a Z-Threat, all others score ≤ 0
```

**Explanation coverage**
`detectZThreat` is in DETECTOR_REGISTRY with `histType: 'cell'`; emits a capsule highlight. `PATTERN_KB.z_threat` loads `community-z-threat`. The narration template needs to explain why the odd count matters (the zugzwang toggle argument) and cite `badgeCount` from `highlightMetadata`. The KB statement provides the prose — a template that cites the count explicitly is the main gap.

**Implementation difficulty: Medium** — detector and KB loading exist; narration template citing the odd count and linking back to parity is the only gap.

---

### Lesson 7: Claimodd — Red Takes the Center

**Concept**
When the board reaches an "all-even" state — every column has an even number of empty cells — Yellow's claimeven strategy would give Red even rows everywhere, which are the wrong rows for Red. Red's answer is "claimodd": play in the center column first to establish an odd-row anchor. This creates a Z-Threat in the center column that Yellow cannot replicate, giving Red control while Yellow controls all the even rows elsewhere.

**KB entries used**
- `community-claimodd` — definition, all-even precondition, center-column anchor, failure when col D is full
- `community-z-threat` — the Z-Threat the center anchor creates (taught in Lesson 6)

**Puzzle filter**
No classifier category exists. Requires a new synchronous detector:
```
all columns have colHeight % 2 === 0 (all-even parity)
AND it is Red's turn
AND center column (col 3, 0-indexed) is not full
AND scores[3] === max(legal_scores) and scores[3] > 0
```

**Explanation coverage**
No `PATTERN_KB` entry exists for `claimodd`. The KB statement in `community-claimodd.md` provides the prose. Both a new `detectClaimodd` detector and a new `PATTERN_KB` entry are needed.

**Implementation difficulty: Medium** — the detector is ~25 lines of synchronous code (O(7) parity check + scores comparison, no extra solver calls). Simpler than it sounds; originally labelled Hard in a previous draft.

---

### Lesson 8: The Undercut — When Your Threat Disappears

**Concept**
You have a major threat at row 5 in column C. Your opponent has a threat at row 3 in the same column. Because gravity fills the column bottom-up, the opponent's row-3 threat is reached before yours at row 5. When your opponent plays into that column, they win first — your row-5 threat never fires. This is an undercut: a lower opposite-parity threat in the same column kills your upper threat.

**KB entries used**
- `allen-t2` — the formal undercut rule (T2), three sub-cases

**Puzzle filter**
```sql
-- detectUndercut fires for at least one column that is NOT correct_col
-- correct_col has scores[correct_col] > 0
-- framing: "your threat in column X is dead — find the right column instead"
```

**Explanation coverage**
`detectUndercut` is in DETECTOR_REGISTRY with `histType: 'cell'`, reporting `killing_threat` and `dead_threat` cells. `PATTERN_KB.undercut` maps to `allen-t2`. The trap-avoidance framing (don't play the undercut column; find the right column elsewhere) needs a generation-time query adjustment: filter for positions where `detectUndercut` fires on a non-`correct_col` column.

**Implementation difficulty: Medium** — classifier and KB exist; puzzle framing needs a generation-time query tweak.

---

### Lesson 9: The Overcut — When Your Upper Threat Wins

**Concept**
The undercut has a mirror image: sometimes your threat at a high row beats the opponent's lower threat. This happens when the two threats share the same row parity (same-parity threats don't interact — Allen's T4 rule), or when column parity forces you to fill critical rows first. Recognising these overcut situations unlocks moves that look wrong but actually win.

**KB entries used**
- `community-overcut` — four sub-cases (minor-threat, T4, T5, chain-T2, active-forcing)
- `allen-t4` — same-parity no-interaction rule
- `allen-t5` — row-3 + row-6 exception

**Puzzle filter**
```sql
category = 'overcut'
-- scores[correct_col] > 0 and detectOvercut.matched === true for correct_col
```

**Explanation coverage**
`detectOvercut` is in DETECTOR_REGISTRY with `histType: 'cell'`. `PATTERN_KB.overcut` maps to `community-overcut`. Sub-case identification is inside `detectOvercut` but not yet exposed in the result object — adding a `reason` string (~10 lines) enables richer narration of which sub-case applies.

**Implementation difficulty: Medium** — add `reason` field to `detectOvercut` result; everything else is production-ready.

---

### Lesson 10: The Figure-7 Trap

**Concept**
The Figure-7 is a five-disc configuration shaped like the digit "7." It creates two threats in the same column on adjacent rows, one of which is above the current column top. The opponent cannot block both threats in sequence. Recognising the Figure-7 shape lets you plan several moves ahead toward a structurally unblockable position.

**KB entries used**
- `community-figure-7` — definition, four shape variants, gravity-top count rules

**Puzzle filter**
```sql
category = 'figure_7'
-- detectFigure7.matched === true, correctCol confirmed
```

**Explanation coverage**
`detectFigure7` is in DETECTOR_REGISTRY with `histType: 'cell'`. `PATTERN_KB.figure_7` loads `community-figure-7`. `highlightMetadata.cells` has the five pattern cells; `categoryEvidence.threat_cells` has both threat rows. The narration template needs to name both threat rows and explain the zugzwang mechanism — the KB statement covers this; wiring it through the template is the only gap.

**Implementation difficulty: Easy** — full pipeline in place; narration template is the only missing piece.

---

### Lesson 11: The J-Shape Cluster

**Concept**
The J-Shape is four discs arranged in an L-pattern (one tall column, one arm extending diagonally). It creates a triple threat: three possible winning continuations from the same cluster. Because all three threats interact with each other, the opponent cannot block all three in sequence. Allen showed that a J-Shape is strategically equivalent to a single major odd-row threat.

**KB entries used**
- `allen-j-configuration` — formal predicate, anchor-parity requirement, three failure conditions

**Puzzle filter**
```sql
category = 'j_shape'
-- detectJShape.matched === true, correctCol confirmed
```

**Explanation coverage**
`detectJShape` is in DETECTOR_REGISTRY with `histType: 'cell'`. `PATTERN_KB.j_shape` loads `allen-j-configuration`. Pattern cells are in `highlightMetadata.cells`. Narration template needs to cite the three threat directions from the KB statement.

**Implementation difficulty: Easy** — same gap as Figure-7; narration template citing the triple-threat directions is the only missing piece.

---

## Post-MVP Lessons

These lessons are valuable for 1400–1600 Elo players and build directly on the MVP curriculum, but require new detectors or complex puzzle selection. Ship after the MVP is stable.

---

### Lesson 12 (Post-MVP): Zugzwang Basics

**Concept**
Sometimes every move you make helps your opponent. When your opponent has more Z-Threats than you do, they control which columns get played and when — eventually forcing you to fill the cells below their threats while they claim the threat cells. Understanding zugzwang means counting Z-Threats on both sides and recognising when you are the one being squeezed.

**KB entries used**
- `community-z-threat` — the Z-Threat count as a zugzwang proxy
- `derived-parity-formula` — why odd/even parity creates the squeeze

**Puzzle filter**
No dedicated classifier category. Candidate filter: positions where one player has more Z-Threats than the other (count difference ≥ 1) and the solver confirms the Z-Threat-richer player is winning, with the correct column being the one that maximises Z-Threat count. Requires a new generation-time predicate that runs `detectZThreat` across all columns and compares counts.

**Implementation difficulty: Medium-Hard** — uses existing `detectZThreat` as a sub-step; needs a new multi-column aggregation predicate at generation time.

---

### Lesson 13 (Post-MVP): Ghost Threats — When Good-Looking Threats Fail

**Concept**
You have a threat on your natural parity row — it looks great. But if your opponent has a Z-Threat in a different column, they control zugzwang: when that column is played, you fill it, reaching your threat cell first and handing the column to them. Your "good" threat is a ghost: visible on the board, mathematically unreachable. Learning to count Z-Threats on both sides prevents you from building on threats that will never fire.

**KB entries used**
- `community-ghost-threat` — definition, structural check (opponent Z-count > player Z-count)
- `community-parity-trap` — the structural condition that makes threats ghost
- `allen-t7` — cross-column odd-threat cancellation (T7)
- `community-z-threat` — what the opponent holds that kills your threat

**Prerequisite lessons:** 4 (parity), 6 (Z-threats), 12 (zugzwang basics)

**Puzzle filter**
Requires a new async detector:
```
Player has at least one parity-aligned major threat
AND all solver scores favour the opponent
AND a specific opponent Z-Threat column can be identified as the zugzwang dominator
```

**Implementation difficulty: Hard** — new async detector; good puzzle positions may be sparse in the DB.

---

## Implementation Roadmap

### Group A — Ready now (Easy) — Ship first

| Lesson | Main gap |
|--------|----------|
| 1: Spot the Win | Add `immediate_threat` inline entry to `PATTERN_KB` |
| 2: Block Before You Build | Add `forced_block` inline entry to `PATTERN_KB` |
| 3: Fork (Double Threat) | None — already complete |
| 4: Odd Rows Belong to Red | Reading lesson; no code needed |
| 10: Figure-7 Trap | Narration template citing both threat rows |
| 11: J-Shape Cluster | Narration template citing triple-threat directions |

### Group B — Small additions needed (Medium) — Ship second

| Lesson | Main gap |
|--------|----------|
| 5: Claimeven | Pre-filter by parity count at generation time; basic narration prose |
| 6: Z-Threats | Narration template citing odd-count and zugzwang toggle |
| 7: Claimodd | New `detectClaimodd` (~25 lines sync) + `PATTERN_KB` inline entry |
| 8: Undercut | Generation-time query tweak for trap-avoidance framing |
| 9: Overcut | Add `reason` field (~10 lines) to `detectOvercut` result |

### Group C — New work required (Post-MVP)

| Lesson | Main gap |
|--------|----------|
| 12: Zugzwang Basics | New multi-column Z-Threat aggregation predicate at generation time |
| 13: Ghost Threats | New async detector (Z-count comparison + solver confirmation) |

**Suggested MVP ship order:** 1 → 2 → 3 → 4 (all Easy, no interdependencies), then 10 → 11 (Easy patterns), then 5 → 6 → 7 → 8 → 9 (Medium in dependency order: Claimeven before Claimodd; Z-Threats before Claimodd; parity context before undercut/overcut).

**Note on lesson ordering for learners:**
Natural progression is 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11. The parity chain (L4 → L5 Claimeven → L6 Z-Threats → L7 Claimodd) is the key dependency. Undercut/overcut (L8–9) and the shape patterns (L10–11) have no strict dependencies between themselves and can be reordered or interleaved based on puzzle availability.
