---
name: project_explain_system
description: "explain-move-llm endpoint + explainSimulate system — architecture, data flow, key design decisions, and review tooling"
metadata: 
  node_type: memory
  type: project
  originSessionId: 04c4bf45-005f-4617-8eae-aeefaab3b257
---

## Endpoints

- `POST /api/explain-move-llm` — explains the user's actual last move; rate-limited 5 req/min; no auth required
- `POST /api/llm-feedback` — stores flagged LLM responses; rate-limited 10 req/min
- `POST /api/recommend-move` — see [[project_recommend_next_move]] (separate but sibling feature)

CLI PoC: `./explain_move.sh <movestring> <col> [rounds=1]` → `connect-four/server/scripts/explain_move.mjs`

## Key files

| File | Role |
|------|------|
| `connect-four/server/llmCoachHelpers.js` | Shared module: `buildExplainPrompt`, `buildRecommendPrompt`, `selectContrastMove`, `computeDeltaTable`, `getPositionTier`, `isMajorThreatForPlayer`, `getBoardVisualization`, `buildKBSection`, `callLLM`, `PATTERN_KB` |
| `connect-four/server/scripts/explain_move.mjs` | CLI PoC — imports from llmCoachHelpers.js |
| `connect-four/server/explainSimulate.js` | Forward-looking pattern aggregation — pluggable `DETECTOR_REGISTRY` |
| `connect-four/src/components/ExplainMoveButton.jsx` | UI trigger (props: `{ moves, col }`) |

## Data flow (explain-move-llm)

1. `perspective = movestring.length % 2 === 0 ? 1 : 2`
2. Pre-move solver scores → `selectContrastMove` (suboptimal → best; optimal → second-best; all-equal → skip LLM call)
3. `getPositionTier(scores, board)`: any score > 0 → WINNING; best = 0 → DRAWING; all < 0 → LOSING. Maps `(tier, isOptimal)` to `moveQualityDesc` + `roleGoal`; LOSING branch explicitly tells LLM not to call the move strong.
4. `explainSimulate(postMove, 2*rounds+1, anchorCell, perspective, solver)` run concurrently for user move + contrast move
5. `computeDeltaTable` — keeps patterns where `max(userRatio, contrastRatio) > 0`, sorted by |Δratio|
6. `getBoardVisualization` on both pre-move and post-move boards; **`scr` row stripped from both** (LLM must not see solver scores — invariant)
7. `buildKBSection` loads KB `statement:` for patterns in delta table only
8. `buildExplainPrompt` → `callLLM`

## Prompt sections (order)

```
## Role
## Move context        ← "Red just played col N" + ⚠️ forced-block / blunder notes
## Board position (BEFORE ...) ← pre-move board, scr stripped
## Board position (AFTER ...)  ← post-move board, scr stripped
## Pattern comparison  ← delta table (or "all lines decided" message)
## Example boards — forced_win  ← leaf board visualizations (when forced_win fires)
## Pattern definitions ← KB statements for active patterns only
## Task
```

## Key design decisions

- **Pre-move board in prompt** — forces LLM to see the opponent's `[Y]` threat before the move; critical for forced-block detection
- **`## Move context`** — names player explicitly; prevents LLM perspective confusion from "Next: Yellow" board header (see [[feedback_llm_perspective_bug]])
- **Forced_win leaf boards** — up to 2 leaf movestrings rendered inline when `forced_win` pattern fires; prevents LLM from restating ratio abstractly. Controlled by `userExamplesByPattern` from `explainSimulate` output.
- **Solver scores never sent to LLM** — `getPositionTier` converts to tier labels; `getBoardVisualization` strips `scr` row. Preserved by all callers.
- **`--env-file` not dotenv** — Node 20.6+ built-in; shell wrapper is the single call site

## explainSimulate.js design

`explainSimulate(movestring, numPlies, anchorCell, perspective, solver, options={})`

Returns `{ totalLeaves, anchorCell, perspective, patterns, outcomes, timing }`.

- `options.detectors` — string[] to enable (default: all 11 in `DETECTOR_REGISTRY` including `claimeven`)
- `patterns[name].examples` — up to 2 leaf movestrings where pattern fired
- `timing` — `{ totalMs, solverCalls, solverCacheHits }`
- `numPlies` must be **odd** for user's perspective to be captured at leaves
- Transposition deduplication via `classCache` (Map<movestring, patterns>)
- Leaf types: `won_by_perspective` / `won_by_opponent` / `draw` / `depth_limit` / `intermediate`
- Pattern ratio denominator = `perspectiveLeaves` (depth_limit + intermediate where currentPlayer === perspective)

## Pattern → KB mapping

`double_threat` → inline | `j_shape` → allen-j-configuration | `figure_7` → community-figure-7 | `claimeven` → allis-claimeven | `baseclaim` → allis-baseclaim | `before` → allis-before | `specialbefore` → allis-specialbefore | `undercut` → allen-t2 | `overcut` → community-overcut | `z_threat` → community-z-threat | `forced_win` → derived-lost-position

## review_feedback.sh

`./review_feedback.sh [--feature <name>] [--limit <n>]` — fetches flagged feedback, renders post-move board, prints stored LLM response, re-runs explain pipeline for comparison. Script: `connect-four/server/scripts/review_feedback.mjs`

## llm_feedback schema

`llm_feedback.movestring` = **pre-move** position. No `col` column — parse from prompt:
```js
const m = llmPrompt.match(/just played \*\*col (\d+)\*\*/);
const col = parseInt(m[1], 10) - 1; // 0-indexed
```
