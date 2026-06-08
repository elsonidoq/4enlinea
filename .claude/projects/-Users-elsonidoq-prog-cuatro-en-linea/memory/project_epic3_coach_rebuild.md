---
name: project_epic3_coach_rebuild
description: "Epic 3 (coach explanation rebuild) scope — replace explainSimulate with tagBlunder+classifyPattern, remove classifyAll; defined in epics doc"
metadata:
  type: project
---

Epic 3 defined 2026-06-07 in `docs/mvp/patterns_blunders_challenges_epics.md`. Not yet specced. Depends on Epic 2 (tagBlunder must produce non-null reason/direction on stored blunder rows).

**Why:** The user wants one clear explanation engine. After Epic 2, the blunder classification produces `{tag, reason, direction}` — richer and more accurate than `explainSimulate`'s heuristic simulation. Epic 3 makes that the LLM grounding signal.

## Goal

Replace `explainSimulate`-based LLM grounding with `tagBlunder` output. After Epic 3:
- Two clean APIs: `classifyPattern` (board-level detection) and `tagBlunder` (blunder analysis + coach grounding).
- `explainSimulate.js` deleted.
- `classifyAll` deleted (callers adapted to `classifyPattern`/`tagBlunder`).

## Key complexity: `allowedSet` spatial grounding

`explainSimulate` currently provides cell location data that constrains which board cells the LLM may reference (the `allowedSet` mechanism from spec 021). `classifyPattern` currently returns only `Set<string>` (tag names). Epic 3 must extend `classifyPattern` to return `Map<string, {cells}>` so `allowedSet` can be built without simulation.

## Key complexity: reason string enrichment

`tagBlunder`'s `reason` strings are terse internal codes (`"matched missed_own: double_threat"`). Epic 3 adds a `REASON_TEMPLATES` map covering all `{tag, direction}` pairs with human-readable sentences for the LLM prompt.

## Key complexity: `buildExplainContext` rework

Currently dispatches to 4 explanation types (type1/2/3/4) with different prompt templates. Epic 3 replaces with a single unified prompt that takes `{tag, direction, reason, blunderPatternCells, correctMovePatterns, boardViz, allowedSet}`. The `validateAnnotation` gate (spec 021 P1–P6) is retained unchanged.

## Estimated scope

13–17 tasks. `explanation_cache` gets a `template_version TEXT` column (nullable, no data backfill). Old cached explanations remain valid — users see the explanation text, not the prompt.

## NOT in Epic 3

LLM model changes, annotation integrity spec (021) changes, Deep Reveal product (022) changes, UI changes to explanation display, reprocessing explanation_cache.
