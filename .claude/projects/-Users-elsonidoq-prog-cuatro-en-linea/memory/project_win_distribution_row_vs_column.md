---
name: project_win_distribution_row_vs_column
description: "win_distribution heatmaps: the COLUMN marginal is policy-invariant and safe to teach; the ROW marginal swings with the opponent's mistake rate and is an artifact"
metadata: 
  node_type: memory
  type: project
  originSessionId: 7622effc-b51a-4ecb-aabd-07abd6931e35
  modified: 2026-07-28T16:14:42.168Z
---

Before using anything from `win_distribution_data/` (or `server/scripts/win_distribution/`) as
evidence — in a lesson, a coach explanation, a puzzle category, or a doc — know that the two
dimensions of those heatmaps have **completely different reliability**. Nothing in the README says
this; both look equally like data.

Measured across all 16 policy pairings (2026-07-28):

- **Column marginal — invariant. Safe.** Share of winning-line cells per column is the same curve
  under every skill level: `.073 / .123 / .183 / .235 / .183 / .126 / .077` for `mp10:mp10`,
  `.075/.129/.181/.231/…` for `mp25:mp25`, `.074/.121/.183/.241/…` for `optimal:optimal`,
  `.064/.127/.192/.239/…` for `blocker:blocker`. Centre ≈ 3.2× the edge, always. It reproduces pure
  board geometry (the 69 four-windows give `.087/.130/.174/.217/…`), which is *why* it is invariant —
  the simulation is re-deriving geometry with error bars. **Column 4 is the hottest in 15/15
  pairings.**

- **Row marginal — policy-contaminated. Do not teach.** `optimal:optimal` puts **92%** of P1's mass
  on one row (row 5 of 6) purely because perfect play runs ~41 plies and the win lands near the top;
  `mp25:mp25` puts 28% on the *bottom* row. The single hottest cell moves with the opponent's error
  rate: `mp10:mp10` → row 5 col 4 (.363), `mp25:mp25` → row 1 col 4 (.286), `blocker:blocker` →
  row 3 col 4 (.329), `optimal:blocker` → row 1 col 4 (.333). Quoting "row 5 centre is where green
  wins, p=0.36" teaches the *simulated opponent's mistake rate*, not Connect Four.

- **Parity is the one row-ish fact that IS robust** — but only as a *direction*, never a magnitude.
  P1's odd-row mass > 0.5 in all 14 pairings where P1 wins; P2's even-row mass > 0.5 in all 12 where
  P2 wins. Direction never flips; magnitude ranges 0.54–0.96. The hottest cell sits on an odd row in
  13/15 pairings. (Rows here are 1-indexed per `allen-parity.md`; see the P1/P2 alias table in
  CLAUDE.md.)

**One-line summary: column is geometry, row is parity, the specific cell is noise.**

**How to apply:** if you want a per-cell number for a lesson or overlay, prefer the exact 69-window
count (computable in ~10 lines, no confidence interval, no policy assumption) over the Monte-Carlo
heatmap — that is what `server/windowCounts.js` does and why (contract:
`docs/architecture/lesson-editor.md` §"Window counts"). Reach for the simulation only when the claim
is about *parity direction*, and say which pairing it came from. Related:
[[project_lesson_slide_field_wiring]], [[feedback_verify_at_the_source_layer]].
