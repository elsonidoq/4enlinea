---
name: project_epic3_coach_rebuild
description: "Epic 3 (coach explanation rebuild) — spec/plan/tasks done at specs/025-patterns-blunders-epic3; 26 tasks; key architectural decisions locked"
metadata:
  type: project
---

Spec/plan/tasks completed 2026-06-08 at `specs/025-patterns-blunders-epic3/`. Ready for `/coordinate-implementation`.

**Why:** Replace `explainSimulate`'s heuristic simulation with `tagBlunder`+`classifyPattern` grounding. One clean explanation engine, two clean APIs.

## Key architectural decisions locked in spec/plan

- **`classifyPattern` return type**: Changes from `Set<string>` to `Map<tag, {cells: string[]}>`. Each detector emits `activeCells`. `tagBlunder`'s internal `P()` must be adapted: `const P = async (ms, p) => new Set((await classifyPattern(...)).keys())`.
- **`allowedSet` Tier model** (in `buildExplainContext`, not `classifyPattern`):
  - Tier 1 (concrete cells — most detectors): emit CONCRETE-ELIGIBLE `allowedSet` entry
  - Tier 2 (column-anchored abstract — z_threat): derive ABSTRACT-ONLY entry from capsule column
  - Tier 3 (position-global — forced_win, forced_block, claimeven, odd_even_threat): pass `null` (NOT `[]`) to `validateAnnotation`; `[]` causes P5strong to fail everything
- **`REASON_TEMPLATES`**: 23 entries (not 24 — `forbidden_columns` unreachable), lives in `server/blunderReasons.js`
- **`POSITIVE_TEMPLATES`**: 12 per-tag positive sentences for optimal-move path, same file
- **Optimal-move tag priority**: uses §3.4 blunder cascade ordering, not Map insertion order
- **`direction`-aware `allowedSet`**: `enabled_opponent` adds `classifyPattern(moves+playedCol+oppBestCol, opponent)`; `defensive_miss` adds opponent's `immediate_threat` cells only (forced_block is Tier 3, not emitted)
- **`reason` enrichment**: DB keeps terse strings; `REASON_TEMPLATES` applied only at prompt-build time
- **`classifyAll` replacement**: two `classifyPattern` calls (Red + Yellow perspective) → `{red:[...], yellow:[...]}`

## Deletion scope (full cleanup)

- `explainSimulate.js` — deleted (not just removed from `buildExplainContext`)
- `/api/recommend-move` endpoint + `app.use('/api/recommend-move', makeLimit(5))` rate-limiter line
- `src/pages/HomePage.jsx` + `src/components/RecommendCoach.jsx` — both entirely deleted (dead code on `101-new-design`; sparring uses `GameScreen.jsx`)
- CLI scripts: `review_feedback.mjs`, `recommend_next_move.mjs`, `explain_simulate.mjs`, `explain_move.mjs`

## Key task ordering constraints

- T005 (classifyPattern Map + tagBlunder P() adapter + all callers) MUST be one atomic commit
- T021 (explainSimulate deletion) MUST run before T016 (classifyAll zero-hit check) — explainSimulate has comment refs to classifyAll
- T012 (integration tests) before Phase 5 cleanup — don't delete old helpers until new path confirmed

## DB state

≥48 blunders with tag/direction confirmed in DB (reprocessed + papergames import). Corpus gate (≥50 rows) is met.

## NOT in Epic 3

LLM model changes, annotation gate (spec 021) changes, Deep Reveal UI changes, explanation_cache reprocessing, `/api/recommend-move` migration (endpoint deleted as dead, not migrated).
