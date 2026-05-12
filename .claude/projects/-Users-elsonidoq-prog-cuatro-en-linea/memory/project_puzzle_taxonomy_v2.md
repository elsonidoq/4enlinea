---
name: Puzzle taxonomy v2 — Allis rules expansion
description: Full new puzzle category taxonomy for feature 007, including renames, removals, new categories, predicate decisions, and open TODOs
metadata:
  type: project
---

Canonical reference for Allis's nine VICTOR rules: `docs/allis_thesis_report.md`
Active spec: `specs/007-allis-puzzle-categories/spec.md` (branch `007-allis-puzzle-categories`)
Spec has been through two full clarification rounds + one Gemini thesis review round as of 2026-05-12.

**Why:** After reviewing the Allis PhD thesis, `zugzwang` was misnamed (detects a forcing chain, not structural parity control) and `parity_control` was a heuristic with no grounding in Allis's rules. The full VICTOR rule set was mapped to puzzle categories.

---

## Renames and removals

| Old slug | Action | New slug / Reason |
|---|---|---|
| `zugzwang` | Rename | `forced_win_sequence` — detects forcing chain (all scores ≤ 0), NOT Allis's structural zugzwang |
| `parity_control` | Remove | Heuristic (score ≥ avg positive), not an Allis rule; no DB rows exist |
| `zugzwang` (proposed new) | Removed from spec | Redundant — any position where exactly one move maintains zugzwang control also satisfies a structural Allis predicate (Claimeven, Lowinverse, etc.); concept taught implicitly by all paid-tier categories |

---

## New categories

### Free tier (zugzwang-independent)
- **`baseinverse`**: pair any two directly playable squares (lowest empty in their columns) belonging to the same opponent 4-in-a-row line. NOT restricted to row 1 — mid-board pairs like {c4, d3} are valid. Opponent must have ≥ 1 disc in the line. Both paired squares accepted as correct (tied). Zugzwang-independent.
- **`vertical`**: opponent has exactly 1 disc at row 1 of a column and has just played row 2 (trigger). Correct response = row 3 (odd). Pair {row 2, row 3} must belong to opponent's 4-in-a-row group. {row 4, row 5} variant is intentionally out of scope (noted in FR-006). Zugzwang-independent.

### Paid tier (zugzwang-dependent)
- **`claimeven`**: opponent just played an odd square in a column with even empties; correct response = even square directly above. Requires zugzwang control. Implement first among paid rules.
- **`lowinverse`**: two columns each with a consecutive 2-square pair where upper is odd (row 3 or 5). Column may have additional empties above the pair. "No Claimeven below" constraint applies. Parity constraint for extra empties above is a TODO (see below). Opponent must have a threat requiring BOTH upper squares simultaneously.
- **`highinverse`**: two columns each with exactly 3 consecutive empty squares, top on even row (row 6 in practice). "No Claimeven below" constraint applies. Same parity TODO as lowinverse.
- **`baseclaim`**: three directly playable squares (`left`, `mid`, `right` — NOT required to be adjacent or on row 1, just lowest empty in their columns) + `above_mid` (empty square directly above `mid`). Opponent must have groups through {mid, right} and {left, above_mid}.

### Baseclaim branch logic (corrected)
- opponent plays `left` → respond `right` (enables Claimeven for {`mid`, `above_mid`} — same column, odd→even)
- opponent plays `mid` → respond `right` (enables Baseinverse for {`left`, `above_mid`} — different columns)
- opponent plays `right` → respond `mid` (enables Baseinverse for {`left`, `above_mid`})

---

## Classifier tags (not categories)
Appear in `classifier_tags` field, used by Explanation Engine only:
- `7_trap`: 3 horizontal + 2 diagonal discs forming a "7" shape (within fork_setup or double_threat)
- `zig_zag`: alternating-column diagonal setup across 2–3 columns
- `useless_threat`: Aftereven-style pattern — opponent has a high-row threat that is provably unreachable because controller will win on even squares below it first

---

## Implementation ordering
`claimeven` → `lowinverse` → `highinverse` (strict dependency chain)
`baseinverse` + `claimeven` → `baseclaim`

---

## Phase 2 boundary — explicitly deferred
- **Aftereven**, **Before**, **Specialbefore**: out of scope, no stubs
- **Vertical {row 4, row 5} variant**: out of scope intentionally (noted in FR-006)

---

## Open TODO — must resolve before implementing Lowinverse/Highinverse

The thesis states that for Lowinverse and Highinverse to preserve zugzwang control, the number of "extra squares available" outside the inverse structure must satisfy a parity condition. This is currently a TODO in FR-011 and FR-013.

**What's known**: geometric analysis shows all valid Lowinverse pairs always have odd empty squares above the pair (3 for {row2,row3}; 1 for {row4,row5}), and all valid Highinverse stacks always have even empty squares above (2 for {row2-4}; 0 for {row4-6}). Gemini cited "even extra squares" for Lowinverse and "odd extra squares" for Highinverse — both contradict the geometry, suggesting "extra squares" is not a simple per-column count above the pair but may be a combined or global board-level constraint.

**Resolution**: verify from the thesis PDF exactly what "extra squares" means and under what conditions the parity condition is violated. This affects predicate validity and candidate filtering.
