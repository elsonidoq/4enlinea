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

## Key files

| File | Role |
|------|------|
| `server/explainContext.js` | `buildExplainContext(ms, col, rounds)` — runs solver+classifyPattern+board viz+prompt assembly; also exports `expandZoneAliases` |
| `server/llmCoachHelpers.js` | `buildBlunderExplainPrompt`, `selectContrastMove`, `getPositionTier`, `getBoardVisualization`, `buildKBSection`, `callLLM`, `classifyExplanationType` (Types 1–4) |
| `server/annotationGate.js` | `validateAnnotation`, `normalizeZoneTags` (exported — was private in index.js before 2026-06-23) |
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
- **LANGUAGE_RULE bans internal terms only** — no positive vocabulary list. LLM describes only what it sees on boards + KB terms when present.
- **Term-tagging instructions are conditional** — only emitted in `## Output format` when `## KB term definitions` section exists. No definitions = no term-tagging instruction → prevents hallucination.
- **`## Task` section varies** — when KB terms exist: "Name the tactical pattern that was missed"; when absent: "Do not invent tactical concept names — describe only what you can see changing between the two boards."

## Prompt sections

Sequence: `Role` → `Language rule` → `Players` → `Boards` (3 boards: Before / After best move / After played) → `Move context` → `Threat comparison` → `Best-move tactical evidence` (conditional) → `Hard grounding rules` → `Tone` → `KB term definitions` (conditional) → `Output format` → `Task`.

**`## Threat comparison`** (always present, pre-computed server-side):

Both major and minor threat rows are conditional — each only appears when the comparison is directionally meaningful (best gives the player MORE of their own threats, or FEWER opponent threats). Example when both fire:

```
Before the move:
- Your major threats: [zone:player-major-pre]3[/zone:player-major-pre]
- Your minor threats: [zone:player-minor-pre]2[/zone:player-minor-pre]
- Opponent major threats: [zone:opponent-major-pre]1[/zone:opponent-major-pre]

After the best move (column N):
- Your major threats: [zone:player-major-best]3[/zone:player-major-best]
- Opponent major threats: [zone:opponent-major-best]0[/zone:opponent-major-best]

After the move played (column M):
- Your major threats: [zone:player-major-played]2[/zone:player-major-played]
- Opponent major threats: [zone:opponent-major-played]1[/zone:opponent-major-played]
```

**Major threats** = count of unique empty cells that complete a 4-in-a-row for that player, EXCLUDING immediately-playable cells (gravity-top). Computed from `getMajorThreatCells`. No parity/playable breakdown.

**Minor threats** = count of unique empty cells across 2-disc+2-empty windows (shadow windows filtered).

**Zone alias invariant** (critical): rows are hidden entirely when not meaningful, and aliases are only added to `zoneAliasMap` when the row is shown. This is what prevents `P1:invalid_spec` — if a row isn't shown, no alias exists, so the LLM can't write a zone tag for it. The invariant is: *alias in map ↔ row visible in prompt*. See [[project_annotation_gate_and_zones]].

`cellsToZoneSpec(cells)` returns `'tg'` for empty cell lists so the gate skips gracefully.
Computed by `summarizeThreats()` + `formatThreatStats()` in `explainContext.js`.

**`## KB term definitions`** entries are driven by the union of `classifyPattern` results from all 3 boards + `tagBlunder.tag`. Forced_win is excluded (banned by LANGUAGE_RULE). Alias entries (e.g. fork→community-double-threat) emit the alias key as the term tag id with combined display name: `[term:fork] **community double threat / fork** (fork): <summary>`.

**`major_threat` and `minor_threat` are conditionally included** (Step 7a in `explainContext.js`): they are added to `relevantPatternKeys` only when at least one major/minor threat actually exists across the three board states (pre, best-move, post-move). They do NOT have `always_include: true` in PATTERN_KB. On empty or near-empty boards, injecting their definitions causes the LLM to hallucinate threats. Do not revert this to `always_include: true`.

## `## Hard grounding rules` section

- When `allowedSet` is **non-null**: "Reference ONLY cells in Strategic reference cells — NOT where the move was played." `validationOnly: true` entries are skipped in rendering.
- When `allowedSet` is **null**: "Column numbers (1–7) are always valid to reference. Only omit specific CELL references if not in the boards above."

## No server-side post-processing of LLM output

`injectDefaultActiveZone` was removed. The LLM output is used as-is. Zone tag `!` (active highlight) is no longer injected anywhere — removed from prompt instructions and from `index.js`.

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


---

## (merged from `project_kb_major_minor_threat_not_always_include` — The always_include KB-term mechanism was removed entirely (2026-06-25) — NO term injects without its pattern firing; reverting causes hallucinations)

There is **no `always_include` glossary path** in `PATTERN_KB` (`server/llmCoachHelpers.js`) anymore. Every KB term is injected into a prompt **only** when its pattern actually fires (added to `relevantPatternKeys` in `explainContext.js`). The inclusion gate is now simply `if (!relevantPatternKeys.has(patternKey)) continue;` — no `always_include` branch.

**Why:** injecting a term definition on a board with no instance leads the LLM to fabricate/misapply it. This was first found for `major_threat`/`minor_threat` (e.g. "your major threat was kept alive" on an empty board). The **2026-06-25 deep-reveal judge** (`eval_set_large_2_nonfiring_lookup_evals`) showed `parity` and `gravity_top` — long thought safe "legend" terms — caused the **same** failure: parity invoked as a fake mechanism on a bare board, gravity_top misapplied to a column-filling move. So `always_include: true` was dropped from those two as well, and the whole mechanism was deleted.

**How to apply:** do NOT re-add `always_include: true` to any `PATTERN_KB` entry. `major_threat`/`minor_threat` are added to `relevantPatternKeys` only when `hasMajorThreats`/`hasMinorThreats` is true; all other terms only when their detector fires. See [[project_drawing_move_mislabels_wins]] and [[project_lookahead_shared_seam]] (same eval round). The `## KB term definitions` section is empty (and now, per the no-empty-section rule, omitted) on anchorless boards — that is correct.


---

## (merged from `project_coach_deep_reveal_docs` — MVP product docs for the coach-explanation rebuild + Deep Reveal annotation layer; which is authoritative; what's already shipped vs the real remaining work)

Four docs in `docs/mvp/` govern the coach-explanation / Deep Reveal work:

- **`coach_explanation_principles.md`** — **AUTHORITATIVE** content layer: *what the coach says*. Honesty as top principle; Type 1–4 explanation taxonomy (immediate / tactical / parity / development) selected by evidence present. Algorithm mechanics pinned in sections M1/M2/M3: simulation aggregates specific winning groups (not classifier tags); draw leaves contribute `draw_threat` records; union rule for which groups enter the context (groups appearing in either branch A or B); top-5 per branch with discard logging. Eval gap thresholds: small ≤3 / moderate 4–9 / large ≥10 (c4solver range [-18,+18]); sign-change override (win→draw/loss treated as at least moderate/large). Type 1 skips simulation entirely (evidence is already on the board). `buildExplainContext` return value extended in Epic B to carry `allowedSet` alongside `prompt`.

- **`deep_reveal_product.md`** — **AUTHORITATIVE** product description for the *interactive annotation/highlight layer* of the existing Deep Reveal Panel (Tier 2). Supersedes `product_vision.md` Screen 8 "non-interactive." Defines **Annotation Integrity Principles P1–P6**. Scoped to 3 surfaces: Challenges, Position Explorer, Past Mistakes. Read-aloud/TTS DEFERRED. Authenticated-only; 20/week free quota. P5 traceability: `e86eeac9`/`8d83947e` = blocked-group failures (Epic A); `403a21c9` = non-existent-threat (requires strong P5, Epic B).

- **`deep_reveal_epics.md`** — **two implementation epics** in strict order. Epic A before Epic B (hard dependency). Epic A: server-side validate-then-cache gate enforcing P1–P4 + board-only P5 (blocked groups + out-of-bounds); gate inserts *after* `injectDefaultActiveZone` and *before* the Tier-2 cache write only (not the Tier-1 `/api/explain-move` path). Epic B: coach rebuild — `explainSimulate.js` won-leaf change, Type 1–4 taxonomy, M1/M2/M3 aggregation, grounding contract, strong-form P5 upgrade. P5 seam: Epic A board-only → Epic B plugs in `allowedSet` for strong form.

- **`deep_reveal_improvements.md`** — **non-binding PRIOR ART, partly stale.** Has a staleness banner. Trust code over its claims.

Key invariants: The `opponentResponseMovestring` for Type 2 critical-position check is already computed in `buildExplainContext` — no new solver calls needed. The pre-built pattern narrations (`claimevenNarration`, `zThreatNarration`, etc.) in `buildExplainContext` are **replaced**, not extended, by Epic B.

Related: `docs/architecture/server-conventions.md` §`tagBlunder` — the pattern→blunder→challenge system that feeds blunder statistics into the coach. Its authoritative doc is `docs/mvp/patterns_blunders_challenges.md`.
