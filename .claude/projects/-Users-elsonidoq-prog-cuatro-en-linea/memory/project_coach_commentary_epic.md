---
name: project_coach_commentary_epic
description: "Board-grounded coach commentary epic — fully specced at specs/029-coach-commentary (16 tasks), key architectural decisions locked"
metadata: 
  node_type: memory
  type: project
  originSessionId: 872f9e0a-15a7-4e5b-9a05-8ab5ca10ae24
---

**Architectural decisions — coach commentary:**
- `aiMove: true` flag distinguishes AI-move path from sparring user-move path on the server — do NOT branch on `category` absence (sparring user moves also lack `category`).
- `classifyPattern()` (async, 12 tags, perspective-aware) is used for AI moves only. `classify()` (sync, 8 tags) retained for user-move path.
- `coach.ai_move.*` pool count is **30** (12 pattern pools × 2 + suboptimal×3 + neutral×3); no `forbidden_columns` pool — it falls through to neutral.
- Pattern phrases only fire on `quality === 'optimal'` AI moves (high-difficulty feature by design).
- `classifyPattern` returns a `Map` — use `PRIORITY.find(tag => tagMap.has(tag))` to pick one tag.
- Opening auto-play (side=second, currentMoves.length===0) skips evaluate-move entirely.
- HTTP 500 from classifyPattern solver errors must be normalized to null in `makeAiMove` (check `!r.ok || !data.quality`).

**Known tracked exception:** classifyPattern's `forced_win` detector can exceed the 2s latency guideline. Accepted at current scale.

