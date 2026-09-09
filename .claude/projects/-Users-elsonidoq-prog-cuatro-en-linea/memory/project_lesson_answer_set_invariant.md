---
name: project_lesson_answer_set_invariant
description: "Board-sourcing traps — an undercut board is valid for exactly ONE side (victim or beneficiary), so validating it against the wrong detector always fails; plus JSONB key-order false drift when diffing stored highlight_metadata"
metadata: 
  node_type: memory
  type: project
  originSessionId: d7194ddb-70f6-4602-a846-18bfc9014c46
  modified: 2026-07-28T21:33:26.727Z
---

**Before validating a lesson board against a `classifier.js` detector, or sourcing a replacement
board, know which SIDE of the pattern the content teaches.**

An undercut is one situation with two roles, and the two detectors are mutually exclusive by
construction — a board that matches one can **never** match the other:

| | learner is | fires when | used by |
|---|---|---|---|
| `detectUndercutVictim` | the **victim** | `scores[C] < 0` — entering the column loses | the `undercut` puzzle category (`evalUndercut`, avoid-the-column) + the `undercut` tag |
| `detectUndercutBeneficiary` | the **beneficiary** | `scores[C] > 0` — pressing the column wins | `find_lesson_boards.mjs` spec `undercut_t2_adjacent` → `lesson-11-undercut` |

So **a correct lesson-11 board must FAIL `detectUndercutVictim`** — not a defect, and the board must
not be "fixed" to match it. Since 2026-07-28 `undercut_t2_adjacent` validates against the
*beneficiary* detector, so a lesson board is checkable by something; before that it was checkable by
nothing and the mismatch read as a bug every time anyone looked (the old "13 of 50 candidates agree
with the detector" measurement was this, not a tooling defect). Keeping **both** sides — defensive
drill *and* offensive lesson — is the owner's product decision (2026-07-28); do not align one to the
other. See **OI-74** (resolved) and `docs/architecture/server-conventions.md` §"Undercut has two
sides".

Validate an already-adopted board without re-deriving a spec's conditions by hand:
`node server/scripts/find_lesson_boards.mjs <spec> --check <movestring>` (MATCH → exit 0).

Traps that bite when auditing:

- **`undercut` boards are losing by definition**, so `LOST-POSITION` is the *expected* audit verdict
  for that category, never a defect. Judging them by "the taught answer must be solver-optimal"
  retires perfectly good puzzles — it did exactly that to 7 rows before the exemption existed.
- **`immediate_threat` / `forced_block` are board-derived and are legitimately called with
  `scores = []`.** Any new score-based guard must no-op there or it rejects every such candidate.
- **Diffing a detector's fresh output against stored `highlight_metadata` with `JSON.stringify`
  reports 100% false drift.** JSONB comes back from Supabase with a different key order
  (`{row,role,column}`) than the detector emits (`{column,row,role}`), so string comparison says all
  28 rows drifted when every value is identical. Normalise to tuples before comparing.

The rule itself (`optimalCols ⊆ acceptedCols` and `acceptedCols ∩ optimalCols ≠ ∅`) lives in
**`server/answerSetInvariant.js`** — import it, never restate it; the two copies that briefly
existed drifted within the hour. Check content with
`node server/scripts/audit_answer_ambiguity.mjs` (add `--puzzles --env local` for DB rows,
`--source <category>` to find replacement boards, `--repair --yes` to fix a pool). See
`docs/architecture/server-conventions.md` §"Answer sets are derived, never re-implemented".

Related: [[project_classify_pattern_perspective_trap]], [[project_lesson_interactivity_evaluation]],
[[feedback_wrong_test_is_part_of_the_bug]], [[reference_verified_tactical_movestrings]].

---

## A lesson slide's board may be a `boardSpec`, NOT a movestring — `visualize_board.sh` is then the WRONG oracle (2026-09-09)

**Trigger: verifying anything about a lesson slide's board — which disc occupies a cell, whose discs
an overlay marks, whether a cell is empty.**

`CLAUDE.md` says never reason about a movestring by hand, always run `./visualize_board.sh`. True —
but **many lesson slides carry a `boardSpec`, not a `movestring`**, and the visualizer cannot read
one. For those slides the oracle is the production decoder **`boardSpecToBoard`
(`src/lib/board.js`)**, and nothing else.

Caught while fixing OI-168 (a green `win` overlay drawn on Gray's discs): I briefed an agent to
verify with `visualize_board.sh`; it correctly refused, used `boardSpecToBoard`, and reached the
same 4-slide answer through the right layer. A second agent on the same issue made the opposite
mistake first — it hand-rolled a movestring parser with **1-indexed columns**, produced a
confidently wrong and self-contradictory table, then redid it through `src/lib/movestring.js` and
got the right answer.

**Rule: replay through the production parser for the representation the slide actually uses.** Never
a hand-rolled parser (the repo is 0-indexed everywhere: row 0 = bottom, col 0 = leftmost), and never
the movestring visualizer for a `boardSpec` slide.
