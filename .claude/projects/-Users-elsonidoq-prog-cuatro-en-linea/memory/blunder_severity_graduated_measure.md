---
name: blunder_severity_graduated_measure
description: Why bestScore<0 guard was removed and blunder_severity is the primary quality measure
metadata: 
  node_type: memory
  type: project
  originSessionId: 4a3f280e-b330-47c8-953d-8c75cbbf4aa0
---

The `bestScore < 0` guard was removed from `POST /api/blunders`, `POST /api/games/analyze`, and `reprocess_blunders.mjs`. Do NOT re-add it — it made the blunder system blind to virtually all Yellow games, since Red has a theoretical forced win from the opening.

**Why the guard is wrong:** `scoreMove_losing_branch` already has a graded blunder definition for losing positions (`played < bestScore - 4`), correctly identifying moves like -2 → -15 (real mistake) while ignoring -2 → -1 (negligible). The `bestScore < 0` guard prevented that logic from ever running.

**The key graduated measure is `blunder_severity`** (migration 029): a 3-ply tree scan computing the fraction of post-blunder continuations ending in opponent win. This captures how much the move *actually* increases losing scenarios vs winning scenarios, regardless of whether the theoretical position was already lost. `blunder_severity` is now computed for ALL blunders in the analyze endpoint (not just `bestScore >= 0`).

**Dedup is now atomic** (migration 030): partial unique index on `(user_id, board_state, move_played) WHERE puzzle_id IS NULL`. `POST /api/blunders` uses `.upsert()` with `ignoreDuplicates: true` — no more check-then-insert race window.

See also: `connect-four/server/scripts/diagnose_blunders.mjs` for per-ply blunder diagnostics on any movestring.
