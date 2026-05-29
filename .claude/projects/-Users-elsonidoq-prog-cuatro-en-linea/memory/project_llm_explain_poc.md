---
name: project_llm_explain_poc
description: "explain_move.sh PoC — implementation state, data flow, and key design decisions"
metadata: 
  node_type: memory
  type: project
  originSessionId: 653e898a-f710-48ce-abdf-a19e2db4c6c5
---

CLI PoC that explains a Connect Four move in natural language, grounded in solver scores + forward-simulation pattern data + KB articles.

**Entry point:** `./explain_move.sh <movestring> <col> [rounds=1]`  
**Main script:** `connect-four/server/scripts/explain_move.mjs`  
**Shell wrapper:** `explain_move.sh` (project root) — loads `.env` via `--env-file`

## Data flow

1. `perspective = movestring.length % 2 === 0 ? 1 : 2` (user's player)
2. Pre-move solver scores → `selectContrastMove` (suboptimal → best; optimal → second-best; all-equal → exit)
3. `explainSimulate(postMove, 2*rounds+1, anchorCell, perspective, solver)` run concurrently for user move and contrast move
4. `computeDeltaTable` — keeps patterns where `max(userRatio, contrastRatio) > 0`, sorted by |Δratio|
5. `getBoardVisualization` called for **both pre-move and post-move** boards via spawnSync; **`scr` row stripped** from both (LLM must not see solver scores)
6. `buildKBSection(activePatterns)` — loads `statement:` from KB frontmatter for patterns in delta table only
7. `buildPrompt` → `callLLM` (native fetch, `max_completion_tokens`)

## Prompt sections (in order)

```
## Role
## Move context        ← "Red just played col N" + ⚠️ forced-block / blunder notes if applicable
## Board position (BEFORE ...)   ← pre-move board, scr row stripped
## Board position (AFTER ...)    ← post-move board, scr row stripped
## Pattern comparison  ← outcome line + delta table (or "all lines decided" message)
## Pattern definitions ← KB statements for active patterns only
## Task
```

## Key design decisions

- **Pre-move board in prompt** — LLM sees both before and after; critical for detecting forced blocks (opponent's `[Y]` threat visible before the move)
- **Forced-block note** (`isMajorThreatForPlayer`) — explicit `⚠️` warning when the played cell was the opponent's major threat; computed in `explain_move.mjs` by checking all 4-windows through the played cell against `board.board[r][c]`
- **Blunder note** (`getImmediateThreats` from classifier.js) — explicit `⚠️` warning when the move hands the opponent an immediate win on the very next move
- **No solver scores in prompt** — LLM must reason from tactical patterns, not numbers
- **`## Move context` section** — names the player explicitly; fixes LLM perspective confusion caused by "Next: Yellow" in the board header (see [[feedback_llm_perspective_bug]])
- **KB articles loaded at runtime** — only for patterns that appear in the delta table
- **`--env-file` not dotenv** — Node 20.6+ built-in; shell wrapper is the single call site

## Pattern → KB mapping

`double_threat` → inline | `j_shape` → allen-j-configuration | `figure_7` → community-figure-7 | `claimeven` → allis-claimeven | `baseclaim` → allis-baseclaim | `before` → allis-before | `specialbefore` → allis-specialbefore | `undercut` → allen-t2 | `overcut` → community-overcut | `z_threat` → community-z-threat | `forced_win` → inline

See [[project_explain_simulate]] for explainSimulate.js design decisions.
