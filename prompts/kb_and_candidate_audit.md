You are a coordinator agent auditing Connect Four puzzle classifiers for correctness.

## Context

Repository: /Users/elsonidoq/prog/cuatro_en_linea
Database connection string: in `connect-four/server/.env` as `DATABASE_URL`

The six puzzle categories under review are: z_threat, claimeven, undercut, overcut,
figure_7, j_shape. Each is defined in `specs/008-new-puzzle-categories/spec.md`.
The knowledge base lives in `docs/knowledge-base/`.

Read `docs/architecture/index-conventions.md` before working with any coordinates.
All DB fields (`correct_col`, `highlight_metadata`, movestring digits) are 0-indexed
(columns 0–6, rows 0–5 bottom-to-top). The c4solver binary requires 1-indexed input,
but that conversion happens only inside `c4solver-wrapper.js` — do not apply it yourself.

## Your task

Spawn exactly 6 sub-agents in parallel, one per category, with the instructions below
(substituting {{CATEGORY}} and {{KB_FILES}}). After all 6 finish, collect their reports
and write a unified audit to `reports/candidate-review-v2-2026-05-20.md`.

---

## Sub-agent instructions

You are auditing the Connect Four classifier for category: **{{CATEGORY}}**

Your audit has two phases. Complete Phase 1 fully before starting Phase 2.

---

### Phase 1 — Abstract KB audit

#### Step 1 — Read the knowledge base entry

Read the following file(s) for {{CATEGORY}}:

- **z_threat**: `docs/knowledge-base/community-z-threat.md`
- **claimeven**: `docs/knowledge-base/allis-claimeven.md`
- **undercut**: `docs/knowledge-base/allen-t2.md`
- **overcut**: `docs/knowledge-base/community-overcut.md`
- **figure_7**: `docs/knowledge-base/community-figure-7.md`
- **j_shape**: `docs/knowledge-base/allen-j-configuration.md`

#### Step 2 — Extract the goal

Read the `statement` field. Write one sentence describing what winning outcome the
pattern guarantees — not its shape, but its strategic effect (e.g., "creates three
simultaneous unblockable threats such that blocking any one enables another").

#### Step 3 — Enumerate the winning continuations

List every distinct winning continuation (threat line) the pattern relies on to
achieve that goal. For each continuation name: the cells involved, the direction
(horizontal / diagonal / vertical), and the terminal cell the opponent must be unable
to cover.

#### Step 4 — Audit the formal predicate

For each winning continuation from Step 3, check whether the `formal_predicate`
verifies all of the following conditions for that continuation:

- The terminal cell is on the board (edge proximity)
- The terminal cell is not occupied by the opponent (path not blocked)
- Any intermediate cells along the winning line are not blocked by the opponent
- The continuation's target cell is reachable under gravity (if relevant)

Flag any condition that is absent from the predicate as a **static gap**.

#### Step 5 — Cross-check false_positives and known_limitations

For each entry in `false_positives`: read the `why_not` explanation, identify the
blocking condition it names, and verify that condition is encoded in the
`formal_predicate`. If it is not, flag it as a **documented-but-missing gap**.

For each entry in `known_limitations`: verify the predicate either excludes the
failure case or explicitly documents it as out-of-scope.

#### Step 6 — Compare preconditions against each other

Check whether all arms/continuations of the pattern are treated symmetrically. If one
arm has a stricter check (empty, unblocked) than another arm (on-board only), flag the
asymmetry as a **gap**.

#### Phase 1 output

List all gaps found, each with:
- Gap type: static / documented-but-missing / asymmetric
- The missing condition in predicate language
- Which winning continuation it affects
- Whether the gap appears in the preconditions, the formal_predicate, or both

If no gaps are found, write "Phase 1: no gaps found."

---

### Phase 2 — Empirical candidate review

#### Step 1 — Fetch 8 candidates

```bash
source connect-four/server/.env && psql "$DATABASE_URL" -c \
  "SELECT id, movestring, correct_col, highlight_metadata, category_evidence \
   FROM candidates WHERE category='{{CATEGORY}}' AND status='pending' \
   ORDER BY random() LIMIT 8;"
```

#### Step 2 — For each candidate: visualize and evaluate

For each candidate run from the project root:

```bash
./visualize_board.sh <movestring>
```

Read the output:
- Raw board and annotated board: piece placement and threats
- `par` row: per-column empty-cell parity (O=odd, E=even), columns 0–6 left-to-right
- `scr` row: c4solver scores per column, columns 0–6 left-to-right
- Major threats list: every [R]/[Y] cell as `colC rowR (player)`, 0-indexed

Then evaluate the candidate **against the goal** (not against the formal predicate).
Use the winning continuations enumerated in Phase 1 Step 3 as your checklist: for each
continuation, verify on the board that it is viable — path unobstructed, target cell
reachable, opponent has no immediate block.

A candidate is:
- **VALID**: every named continuation is viable on this board
- **FALSE POSITIVE**: at least one continuation is not viable — state which one and why
- **UNCERTAIN**: you cannot determine viability from the board output alone

When you find a FALSE POSITIVE: check whether it was predictable from a Phase 1 gap
(the predicate was already known to be incomplete) or whether it reveals a **new
empirical gap** — a failure mode not visible from reading the KB alone.

#### Phase 2 output

For each candidate:

```
Candidate <id>
- Movestring: <movestring>
- correct_col: <col>
- Board summary: <2–3 sentences: key threats, parity, relevant structure>
- Verdict: VALID / FALSE POSITIVE / UNCERTAIN
- Reasoning: <cite the specific continuation that passes or fails>
- Gap link: <"predicted by Phase 1 gap: <description>" | "new empirical gap: <description>" | "n/a">
```

Then a phase summary:
```
Phase 2 summary
- Valid: N/8
- False positives: N/8 (IDs: ...)
- Uncertain: N/8 (IDs: ...)
- New empirical gaps: <list, or "none">
```

---

## Coordinator: after all 6 agents finish

Write `reports/candidate-review-v2-2026-05-20.md` with the following structure:

### 1. Executive summary

A table:

| Category | Phase 1 gaps | FP count (8 sampled) | New empirical gaps |
|---|---|---|---|
| z_threat | ... | N/8 | ... |
| claimeven | ... | N/8 | ... |
| undercut | ... | N/8 | ... |
| overcut | ... | N/8 | ... |
| figure_7 | ... | N/8 | ... |
| j_shape | ... | N/8 | ... |

### 2. Per-category full report

Paste each sub-agent's Phase 1 and Phase 2 output verbatim under a `## <category>`
heading.

### 3. Recommended actions

- **KB fixes**: for each Phase 1 gap, state the condition to add to the formal
  predicate and which precondition bullet to update.
- **Classifier fixes**: for each gap (Phase 1 or empirical) that maps to a code
  condition, name the function in `connect-four/server/classifier.js` and the specific
  check to add.
- **DB cleanup**: list all candidate IDs flagged as FALSE POSITIVE and recommend
  `status = 'rejected'`.
- **Healthy classifiers**: note any category where 0 gaps were found in Phase 1 and
  0 false positives in Phase 2.
