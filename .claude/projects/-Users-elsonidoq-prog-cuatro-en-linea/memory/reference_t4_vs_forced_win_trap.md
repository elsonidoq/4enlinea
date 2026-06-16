---
name: reference_t4_vs_forced_win_trap
description: "Movestring 1115222555577773663636617 is a T4 classification example, NOT a forced_win puzzle; also 1-indexed"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 955cee10-9c24-40aa-a8a6-2e8b988965be
---

The movestring `1115222555577773663636617` (stored in project KB as `reference_t4_example_movestring.md`) is a **T4 Case A classification example** from Allen 2010 — it demonstrates two Red odd-row threats at col4. It is NOT a valid forced_win sequence puzzle.

**Two reasons it fails as a forced_win source:**
1. **Wrong category**: All 7 columns fail `ForcedWinStrategy.validateMove()` — the position has no valid forcing move from Yellow's perspective.
2. **1-indexed digits**: The movestring uses digits 1-7. The server's `SEQUENCE_POSITION_RE = /^[0-6]{0,41}$/` regex rejects 1-indexed digits. The project uses 0-indexed movestrings everywhere.

**What to use instead:** Query the `puzzles` table for `category = 'forced_win' AND is_active = true`, or pull from the `candidates` table. The known-good double-threat puzzle is `d05f7be5-97ee-4686-b194-23ee0951ebd9` (movestring `3332253320451552466226`, returns 2 threatCells `[{c:1,r:2},{c:4,r:4}]` at success).

**Why:** Discovered during spec 034 T006b when the spec-suggested movestring failed validation for all 7 columns. The KB reference never claimed it was a forced_win puzzle — it was always a T4 example.

**How to apply:** Never use this movestring for forced_win testing or puzzle seeding. When reading KB reference movestrings, always verify the index base (0-indexed vs 1-indexed) — KB entries may be 1-indexed.
