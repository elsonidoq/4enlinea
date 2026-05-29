---
name: reference-t4-example-movestring
description: "Solver-verified movestring demonstrating Allen 2010 T4 Case A (same player, same parity, same column) — useful when building or auditing T4 detectors"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 5f33413e-991a-4be1-aa4f-62e105192e09
---

**Movestring:** `1115222555577773663636617`

**What it demonstrates:** Allen 2010 T4 Case A — Red has two major threats at col 4 row 3 and col 4 row 5 (both odd-parity, same column, same player). Column 4 is entirely empty (par=6E). No other Red odd-row major threats on the board. Yellow to move.

**Solver outcome:** All solver scores negative (Yellow wins). The two Red same-column odd threats produce **no** V1 or V3 win — confirming T4 (no cumulative bonus for same-parity threats in one column). Yellow's win comes from external structure, not from the T4 interaction.

**Verified:** 2026-05-17 via `./visualize_board.sh` and c4solver.

**How to apply:** When implementing or testing a T4 detector, claimeven/parity analyzer, or threat-simplifier, use this as the canonical Case A regression position. Lives in [[reference-external-pdfs]] context (Allen 2010 Ch. 4 p. 98). Full entry is at `docs/knowledge-base/allen-t4.md`.

**Still PENDING (need movestrings):**
- T4 Case B (opposite-colour same-parity, same column): Red at (C,3) + Black at (C,5)
- False positive: same-parity different-column (V1 territory)
- False positive: same-column different-parity (T5 territory)
- False positive: same-column adjacent rows (T1 territory)
