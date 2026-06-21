---
name: project_explain_system
description: "explain-move-llm endpoint architecture, data flow, explanation_cache schema, and LLM prompt invariants"
metadata: 
  node_type: memory
  type: project
  originSessionId: 8b3010d3-7cec-45b3-8dfc-c980649a8ace
---

## Endpoints (current — post Epic 3)

- `POST /api/explain-move-llm` — auth required (401 for anon); rate-limited 5 req/min; free-tier quota 20/week (429, resets Monday). Response: `{ explanation, prompt, cached? }`. Cache hits do NOT decrement quota.
- `POST /api/llm-feedback` — rate-limited 10 req/min; no auth. Stores flagged LLM responses.

**Deleted in Epic 3:** `/api/recommend-move`, `/api/coach/explain-simulate`.

## Key files (current)

| File | Role |
|------|------|
| `server/explainContext.js` | `buildExplainContext(ms, col, rounds)` — runs solver+classifyPattern+board viz+prompt assembly |
| `server/llmCoachHelpers.js` | `buildBlunderExplainPrompt`, `selectContrastMove`, `getPositionTier`, `getBoardVisualization`, `buildKBSection`, `callLLM`, `classifyExplanationType` (Types 1–4) |
| `server/index.js` | thin `buildExplainContextActive` wrapper injecting module-level solver |

## explanation_cache schema

`explanation_cache.deep_reveal_json` (JSONB): `{ explanation, prompt, terms }`. The `prompt` field allows `llm_feedback` to capture full LLM context. Old entries may lack `prompt` — the llm-feedback endpoint rebuilds it from `buildExplainContext` on cache miss. `terms` is a `{ [kbId]: shortSummary }` map for all `[term:kbId]` tags found in the explanation. The kbId used as the key is exactly what the LLM wrote (e.g. `fork`), not necessarily the KB file slug.

Cache key: `SHA256(movestring + ":" + col)`. `template_version = 'v2'` set on all new inserts (migration 035 adds the column).

## Data flow (explain-move-llm)

1. Auth gate → 401 if no user
2. Cache check → return `{ explanation, prompt, cached: true }` on hit (no quota decrement)
3. Quota decrement (cache miss only)
4. `classifyExplanationType` — must run BEFORE simulation; Type 1 bypasses simulation entirely
5. For Types 2–4: `buildExplainContext` runs solver + `classifyPattern` + board visualization
6. LLM call → cache write

## LLM prompt invariants (never violate)

- **Solver scores are NEVER sent to LLM** — `getPositionTier` converts to tier labels; `getBoardVisualization` strips the `scr` row. Preserved by all callers.
- **`## Move context` section** — must explicitly name the player who moved; prevents LLM from adopting opponent's perspective from "Next: Yellow" board header. See [[feedback_llm_perspective_bug]].
- **Pre-move board in prompt** — forces LLM to see opponent's threat before the move; critical for forced-block detection.

## `## Move context` fields (as of 2026-06-11)

```
- Player: Green (winning parity = ODD rows 1,3,5)
- Eval gap: moderate
- Move played: column 5          ← playedCol + 1 (always present)
- Better move: column 2          ← contrastCol + 1 (blunder path only)
- Key insight: <humanReason or positiveReason>
```

`contrastCol` is also appended to `allowedSet` as `{ col: contrastCol, validationOnly: true }` when `allowedSet` is non-null on the blunder path — this whitelists it for P5Strong zone-tag validation without affecting prompt rendering.

## `## Hard grounding rules` section

- When `allowedSet` is **non-null**: "Reference ONLY cells in Strategic reference cells — NOT where the move was played." `validationOnly: true` entries are skipped in rendering.
- When `allowedSet` is **null**: "Column numbers (1–7) are always valid to reference. Only omit specific CELL references if not in the boards above."

## No server-side post-processing of LLM output

`injectDefaultActiveZone` was removed (2026-06-11). The LLM output is used as-is. Zone tag `!` (active highlight) is no longer injected anywhere — removed from prompt instructions and from `index.js`.

## `llm_feedback` schema

`llm_feedback.movestring` = **pre-move** position. Parse played column from stored prompt:
```js
const m = llmPrompt.match(/Move played: column (\d+)/);
const col = parseInt(m[1], 10) - 1; // 0-indexed
```

## Type 1–4 explanation taxonomy

Defined in `server/llmCoachHelpers.js` (`classifyExplanationType`):
- **Type 1**: immediate / forced-block (evidence already on board, skip simulation)
- **Type 2**: tactical patterns (classifyPattern fires a named tag)
- **Type 3**: parity / structural
- **Type 4**: development (fallback)
