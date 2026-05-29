---
name: project-explain-move-llm
description: explain-move-llm endpoint — server route, ExplainMoveButton, forced_win leaf boards in prompt, review_feedback.sh
metadata: 
  node_type: memory
  type: project
  originSessionId: bbd27509-430c-48fc-b736-d23bed33498e
---

## What was done (2026-05-27)

Promoted `explain_move.mjs` CLI PoC to a production server endpoint and wired it into the
`postReveal` section of `HomePage.jsx`, replacing `RecommendButton` (which showed AI
recommendation for next move) with `ExplainMoveButton` (which explains the user's actual move).

## Files changed

| File | Change |
|------|--------|
| `connect-four/server/llmCoachHelpers.js` | Added `PATTERN_NAMES`, `selectContrastMove`, `computeDeltaTable`, `buildExplainPrompt` |
| `connect-four/server/scripts/explain_move.mjs` | Stripped local duplicates; imports from `llmCoachHelpers.js` |
| `connect-four/server/index.js` | Rate limit + `POST /api/explain-move-llm` route |
| `connect-four/src/components/ExplainMoveButton.jsx` | New component (props: `{ moves, col }`) |
| `connect-four/src/pages/HomePage.jsx` | Swapped `RecommendButton` → `ExplainMoveButton` |
| `docs/architecture/server-conventions.md` | Documented new helper exports + endpoint |

## Key design decisions

- `selectContrastMove` returns `{ contrastCol, isOptimal }` or `null` (all-equal scores → no LLM call)
- All-equal scores returns `{ explanation: "All legal moves are equally scored…", prompt: null }` (200, not error)
- Reuses module-level `solver` singleton — never spawns a new process per request
- `buildExplainPrompt` renamed from `buildPrompt` to avoid clash with `buildRecommendPrompt`; param names: `boardViz` (pre-move), `postBoardViz` (post-move), `playerName` (instead of `perspective`)
- Rate limit: 5 req/min (same as `/api/recommend-move`)
- Flag feature string: `'explain_move_llm'`
- **`getPositionTier(scores, board)` — position-aware quality framing (2026-05-27):** `isOptimal` alone is insufficient; "best of losing options" ≠ "strong". Tier is derived from pre-move scores (legal columns only): any score > 0 → `WINNING`, best = 0 → `DRAWING`, all < 0 → `LOSING`. `buildExplainPrompt` maps `(tier, isOptimal)` to both `moveQualityDesc` and `roleGoal`; the LOSING branch explicitly instructs the LLM *not* to call any move strong.

## Smoke test curl

```bash
curl -s -X POST http://localhost:3001/api/explain-move-llm \
  -H 'Content-Type: application/json' \
  -d '{"movestring":"3334","col":2,"rounds":1}' | jq .
```

## forced_win leaf boards — 2026-05-27

Two `llm_feedback` records showed the LLM restating `forced_win: 0.50 ratio` abstractly
instead of naming concrete threats. Fix: plumb leaf movestrings through the pipeline and
render 1–2 board visualizations inline in the prompt.

Changes:
- `explainSimulate.js`: `collectLeaves` adds `ms` to depth_limit/intermediate leaves; `aggregateLeaves` collects up to 2 examples per pattern in `entry.examples`
- `llmCoachHelpers.js`: `buildExplainPrompt` accepts `userExamplesByPattern`; renders `## Example boards — forced_win` section with `getBoardVisualization()` calls; `PATTERN_KB.forced_win` rewritten to point at the boards; Task instruction updated to prioritize board-level reasoning over abstract labels
- `index.js`: extracts `userExamplesByPattern` from `userResult.patterns` and passes to `buildExplainPrompt`

Only `forced_win` is rendered for now; structure is generic (any pattern with examples in `userExamplesByPattern` can be wired up by adding a branch in `buildExplainPrompt`).

`explain_move.mjs` was also missing `userExamplesByPattern` — fixed 2026-05-28.

## forced_win KB entry — derived-lost-position (2026-05-28)

`PATTERN_KB.forced_win` now points to `derived-lost-position.md` (was inline, then a board-pointer string).

Key facts about the detector and entry:
- Naming: `forced_win` is from the *opponent's* perspective. The KB entry is named `derived-lost-position` to speak clearly to the losing player.
- The detector fires when all legal scores ≤ 0 AND at least one strictly worse option exists. It marks the best available losing column(s) only.
- Edge case: the outer guard is `all scores ≤ 0` (not `< 0`), so the detector fires even when drawing moves (score = 0) exist alongside losing ones — the "forced loss" label is misleading in that case. Always check `positionTier` first.
- Worked examples pulled from `puzzles` DB: `23254501231` (col 3 best, all others −15) and `42234305233` (col 5 best at −2).

## llm_feedback schema note

`llm_feedback.movestring` = **pre-move** position. No `col` column — col is parsed from `llm_prompt` via:
```js
const m = llmPrompt.match(/just played \*\*col (\d+)\*\*/);
const col = parseInt(m[1], 10) - 1; // 0-indexed
```

## review_feedback.sh

`./review_feedback.sh [--feature <name>] [--limit <n>]` — fetches flagged feedback rows, renders the post-move board, prints the stored LLM response, and re-runs the full explain pipeline for comparison.
Script: `connect-four/server/scripts/review_feedback.mjs`

**Why:** [[project-llm-explain-poc]] [[project-recommend-next-move]]
