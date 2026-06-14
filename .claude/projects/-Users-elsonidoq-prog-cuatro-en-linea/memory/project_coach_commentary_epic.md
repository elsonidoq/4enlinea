---
name: project_coach_commentary_epic
description: "Board-grounded coach commentary epic — fully specced at specs/029-coach-commentary (16 tasks), key architectural decisions locked"
metadata: 
  node_type: memory
  type: project
  originSessionId: 872f9e0a-15a7-4e5b-9a05-8ab5ca10ae24
---

**Status:** Spec/plan/tasks complete at `specs/029-coach-commentary/`. 16 tasks. Run `/coordinate-implementation specs/029-coach-commentary` to begin.

Epic doc at `docs/mvp/coach-commentary-epic.md`. Two phases:

**Phase 1 (surgical, frontend only):** Fix two ChallengeScreen bugs — (1) `handleColumnClick` sends undefined `category` in lesson mode (must use `effectiveCategory = lessonMode ? confirmationCategory : category`); (2) fallback when `coachPhraseKey` is null always uses blunder pool regardless of quality — must use quality-aware pools `coach.generic.{optimal,suboptimal,blunder}.*`. Also extracts `pickRandomKey` to `src/lib/coachUtils.js` (shared by Phase 2).

**Phase 2 (board-grounded AI commentary):** `makeAiMove` calls `POST /api/evaluate-move` with `{ movestring, col, aiMove: true }`. Server gates `classifyPattern(postMoveMovestring, aiPlayerInt, solver)` on `req.body.aiMove === true` — existing `classify()` path for user moves is untouched. Returns `patternTag` (priority-ordered from Map) + `quality`. Frontend selects from `coach.ai_move.<tag>.*` pools. Quality gates BEFORE pattern tag. Removes 8 old `coach.sparring.*` pools. `coach.sparring.review.*` and hint/explorer pools are retained (server-side only).

**Critical architectural decisions locked:**
- `aiMove: true` flag distinguishes AI-move path from sparring user-move path on the server — do NOT branch on `category` absence (sparring user moves also lack `category`).
- `classifyPattern()` (async, 12 tags, perspective-aware) is used for AI moves only. `classify()` (sync, 8 tags) retained for user-move path.
- `coach.ai_move.*` pool count is **30** (12 pattern pools × 2 + suboptimal×3 + neutral×3); no `forbidden_columns` pool — it falls through to neutral.
- Pattern phrases only fire on `quality === 'optimal'` AI moves (high-difficulty feature by design).
- `classifyPattern` returns a `Map` — use `PRIORITY.find(tag => tagMap.has(tag))` to pick one tag.
- Opening auto-play (side=second, currentMoves.length===0) skips evaluate-move entirely.
- HTTP 500 from classifyPattern solver errors must be normalized to null in `makeAiMove` (check `!r.ok || !data.quality`).

**Known tracked exception:** classifyPattern's `forced_win` detector can exceed the 2s latency guideline. Accepted at current scale.

**NOT included:** es.json localization, `coach.sparring.review.*` changes, ExplorerScreen deep-reveal commentary.
