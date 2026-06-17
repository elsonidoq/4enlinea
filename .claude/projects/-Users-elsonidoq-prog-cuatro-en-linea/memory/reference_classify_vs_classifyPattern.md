---
name: reference-classify-vs-classifypattern
description: "classify() vs classifyPattern() — scope, tags, sync/async, perspective, and which endpoints use which"
metadata: 
  node_type: memory
  type: reference
  originSessionId: e2c1cdc1-0979-476c-b4f4-7486ff14dfb3
---

Two classifier entry points with very different scopes:

**`classify(moves, candidateCol, scores)`** — `classifier.js:407`
- Synchronous
- Returns exactly ONE tag from: `immediate_threat`, `double_threat`, `forced_block`, `forced_win`, `forbidden_columns`, `best_move`, `drawing_move`, `suboptimal_move`
- No perspective parameter — always evaluates from the mover's view
- `forced_win` fires when the mover is LOSING (all scores ≤ 0) — semantics are inverted relative to `classifyPattern`
- Used by: `POST /api/evaluate-move` (user-move path), `POST /api/evaluate-move/inline`, and the sparring game analysis endpoint

**`classifyPattern(ms, perspective, solver)`** — `classifier.js:1354`
- Async — runs 12 detectors in parallel via `Promise.all`
- Returns a `Map` of ALL matched tags (multiple can fire simultaneously)
- Full 11-tag set including parity/shape patterns: `claimeven`, `z_threat`, `odd_even_threat`, `figure_7`, `j_shape`, `overcut`, `undercut` (plus the 4 from classify); `claimodd` was removed 2026-06-17
- Perspective-aware — `forced_win` correctly detects when the specified `perspective` player is winning
- `detectClaimeven` makes ~20 additional solver calls (expensive)
- Used by: blunder-analysis path (`tagBlunder`), and — after coach commentary epic ships — `POST /api/evaluate-move` when `req.body.aiMove === true`

**To pick one tag from classifyPattern's Map:** `PRIORITY.find(tag => tagMap.has(tag))` — do NOT use `[...tagMap.keys()]` (insertion order from Promise.all is non-deterministic).

**`aiPlayerInt` formula for post-move board:** `(preMoveMovestring.length % 2) + 1` — even length = player 1 (Red) moved, odd = player 2 (Yellow) moved.
