---
name: project_recommend_next_move
description: "recommend_next_move — server endpoint, UI component, feedback table; sparring page Recommend+Why feature shipped 2026-05-28"
metadata: 
  node_type: memory
  type: project
  originSessionId: e9134e90-f147-4ce2-8fbe-21db2c76773a
---

Promoted from CLI PoC to a full server endpoint + UI feature on 2026-05-27. Companion to [[project_llm_explain_poc]].

**2026-05-28**: Sparring page Recommend + Why feature shipped. `RecommendButton.jsx` deleted; replaced by `RecommendCoach.jsx` + `BadgeRow.jsx`. Both buttons always visible in footer regardless of game state.

## Key files

| File | Role |
|------|------|
| `connect-four/server/llmCoachHelpers.js` | Shared module for all LLM coaching endpoints (extracted from CLI) |
| `connect-four/server/scripts/recommend_next_move.mjs` | CLI PoC — now imports from `llmCoachHelpers.js` |
| `connect-four/server/index.js` | `POST /api/recommend-move` + `POST /api/llm-feedback` routes |
| `connect-four/src/components/RecommendCoach.jsx` | Both pill buttons + inline coach card + flag button (replaces deleted `RecommendButton.jsx`) |
| `connect-four/src/components/BadgeRow.jsx` | Stateless 7-cell row rendering ★1/★2 badges above board columns |
| `connect-four/server/migrations/017_llm_feedback.sql` | `llm_feedback` table (migration NOT yet applied as of 2026-05-27) |

## `llmCoachHelpers.js` exports

`buildRecommendPrompt`, `buildFlatTable`, `getScoreTier`, `isMajorThreatForPlayer` (NOT in classifier.js — canonical location is this helper), `getBoardVisualization`, `buildKBSection`, `loadKBStatement`, `callLLM`, `TIER_ORDER`, `IMMEDIATE_WIN_OUTCOMES`, `PATTERN_KB`.

**Critical invariant**: solver scores are NEVER passed to the LLM — `getScoreTier` converts to tier labels; `getBoardVisualization` strips the `scr` row. This must be preserved by all callers.

## Endpoint: POST /api/recommend-move

- Body: `{ movestring: string, rounds?: 1|2 }`
- Response: `{ recommendation: string, prompt: string, colRankings: [{col: number, tier: string}] }` — top-2 columns best-first; no solver scores (Principle IV)
- No auth required. Rate-limited to 5 req/min.
- Guards: `OPENAI_API_KEY`/`OPENAI_MODEL` absent → 503.
- Reuses the server-managed `solver` singleton — does NOT spawn a new process.

## Endpoint: POST /api/llm-feedback

- Body: `{ movestring, llm_prompt, llm_response, human_note, feature }`
- Response: `{ id: uuid }`
- No auth required. Rate-limited to 10 req/min.
- Inserts into `llm_feedback` table.

## Data flow (recommend-move)

1. `perspective = movestring.length % 2 === 0 ? 1 : 2`
2. `solver.query(movestring)` → 7-element score array (for non-immediate tier labeling only)
3. Board-logic special case detection (NO solver scores — see [[reference_cat5_forced_block_detection]]):
   - `immediateWinSet` ← `getImmediateThreats(board, board.colHeights, perspective)`
   - `forcedBlockCols` ← columns where `isMajorThreatForPlayer(board, c, colHeights[c], opponent)` is true
   - `immediateLossSet` ← columns where playing creates opponent immediate win
4. `explainSimulate(movestring+c, 2*rounds+1, anchorCell, perspective, solver)` in parallel for all playable columns **except** IMMEDIATE WIN (solver rejects positions through winning moves)
5. Each column assigned tier: `IMMEDIATE WIN / WINS / DRAWS / LOSES / IMMEDIATE LOSS`
6. Sorted best-tier-first, then by column index; flat table built
7. `buildKBSection` loads KB statements for patterns with ratio > 0
8. `buildRecommendPrompt` → `callLLM` (OpenAI, `max_completion_tokens: 400`)

## UI: RecommendCoach.jsx + BadgeRow.jsx

Always visible in sparring page footer (not tied to commit-first mode). `RecommendCoach` owns all coach state; delegates badge state upward to `HomePage` via `onBadgesChange(colRankings|null)`. `BadgeRow` is purely presentational — 48px-wide cells (= CELL_SIZE+2×COL_PAD_H) centered via `justifyContent: center` to align with Board columns.

**Recommend** (pre-move): disabled when `gameOver`. Calls `POST /api/recommend-move`. On success: fires `onBadgesChange(colRankings)` + renders coach card with ★1/★2 col pills (1-indexed display) + LLM text.

**Why** (post-move): disabled when `humanMovestring === ''`. Calls `POST /api/explain-move-llm` with `{movestring: humanMovestring.slice(0,-1), col: parseInt(humanMovestring.at(-1))}`. Clears badges.

Badges reset in `HomePage` on every `commitMove`, `handleUndo`, and `resetGame`. Coach card text persists until next button click.

## Score tier derivation

Priority order: `immediateWinSet.has(c)` → IMMEDIATE WIN | `immediateLossSet.has(c)` → IMMEDIATE LOSS | `score > 0` → WINS | `score === 0` → DRAWS | else → LOSES.

## Pattern → KB mapping

`double_threat` → inline | `j_shape` → allen-j-configuration | `figure_7` → community-figure-7 | `claimeven` → allis-claimeven | `baseclaim` → allis-baseclaim | `before` → allis-before | `specialbefore` → allis-specialbefore | `undercut` → allen-t2 | `overcut` → community-overcut | `z_threat` → community-z-threat | `forced_win` → inline. Patterns without KB entries (`immediate_threat`, `forced_block`, `forbidden_columns`) appear in the table but are omitted from the KB section.
