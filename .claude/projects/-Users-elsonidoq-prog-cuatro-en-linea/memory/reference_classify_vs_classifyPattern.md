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
- `forced_win` uses the **same structural `detectForcedWin`** as `classifyPattern` (classifier.js:449 calls it; no score gate). The two entry points differ in scope/return shape, NOT in the `forced_win` predicate — there is no "score-based / losing-position" forced_win. (Corrected 2026-06-25; the earlier "fires when the mover is LOSING (all scores ≤ 0)" claim was wrong.)
- Used by: `POST /api/evaluate-move` (user-move path), `POST /api/evaluate-move/inline`, and the sparring game analysis endpoint

**`classifyPattern(ms, perspective, solver)`** — `classifier.js`
- Async — runs **15** detectors in parallel via `Promise.all` (was 12; +3 parity-aware threats 2026-06-25)
- Returns a `Map` of ALL matched tags (multiple can fire simultaneously)
- Tag set including parity/shape patterns: `claimeven`, `z_threat`, `odd_even_threat`, `figure_7`, `j_shape`, `overcut`, `undercut` (plus the 4 from classify); `claimodd` was removed 2026-06-17
- **Parity-aware threats (added 2026-06-25):** `major_threat_parity`, `major_threat_nonparity`, `minor_threat` — geometry-only detectors built on `categorizeThreats`, each emitting the union of completing cells for the to-move perspective. First-class in the look-ahead, blunder tagging, and coach KB.
- **`odd_even_threat` still fires here but is PUZZLE-ONLY** — de-listed from the coach prompt and the blunder vocabulary 2026-06-25. See [[project_odd_even_threat_puzzle_only]].
- Perspective-aware — `forced_win` correctly detects when the specified `perspective` player is winning
- `detectClaimeven` makes ~20 additional solver calls (expensive)
- Used by: blunder-analysis path (`tagBlunder`), and — after coach commentary epic ships — `POST /api/evaluate-move` when `req.body.aiMove === true`

**To pick one tag from classifyPattern's Map:** `PRIORITY.find(tag => tagMap.has(tag))` — do NOT use `[...tagMap.keys()]` (insertion order from Promise.all is non-deterministic).

**`aiPlayerInt` formula for post-move board:** `(preMoveMovestring.length % 2) + 1` — even length = player 1 (Red) moved, odd = player 2 (Yellow) moved.
