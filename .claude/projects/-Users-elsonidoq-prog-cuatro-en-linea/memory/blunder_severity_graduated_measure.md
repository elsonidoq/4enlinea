---
name: blunder_severity_graduated_measure
description: Why bestScore<0 guard was removed and blunder_severity is the primary quality measure
metadata: 
  node_type: memory
  type: project
  originSessionId: 4a3f280e-b330-47c8-953d-8c75cbbf4aa0
---

Blunder detection formerly skipped all moves from already-losing positions (`bestScore < 0`), with the rationale "the real blunder happened earlier." This made the blunder system blind to virtually all second-player (Yellow) games, since Red has a theoretical forced win from the opening.

**2026-06-03 change:** Removed the `bestScore < 0` guard from `POST /api/blunders`, `POST /api/games/analyze`, and `reprocess_blunders.mjs`. Blunders from losing positions are now recorded.

**Why:** [[project_scoreMove_losing_branch]] already has a graded blunder definition for losing positions (`played < bestScore - 4`), but the `bestScore < 0` skip was applied before that logic could run. With the skip removed, the losing-branch definition correctly identifies blunders like moving from -2 to -15 (a real mistake that accelerates the opponent's win) while ignoring -2 to -1 (negligible difference).

**The key graduated measure is `blunder_severity`** (migration 029): a 3-ply tree scan computing the fraction of post-blunder continuations ending in opponent win. This captures how much the move *actually* increases losing scenarios vs winning scenarios, regardless of whether the theoretical position was already lost. `blunder_severity` is now computed for ALL blunders in the analyze endpoint (not just `bestScore >= 0`).

**Dedup is now atomic** (migration 030): partial unique index on `(user_id, board_state, move_played) WHERE puzzle_id IS NULL`. `POST /api/blunders` uses `.upsert()` with `ignoreDuplicates: true` — no more check-then-insert race window.

See also: `connect-four/server/scripts/diagnose_blunders.mjs` for per-ply blunder diagnostics on any movestring.
