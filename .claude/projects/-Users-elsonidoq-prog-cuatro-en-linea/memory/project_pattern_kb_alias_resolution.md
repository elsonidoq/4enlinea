---
name: project_pattern_kb_alias_resolution
description: "PATTERN_KB alias entries (e.g. fork→community-double-threat): how they appear in prompts and how loadKBShortSummary resolves them"
metadata: 
  node_type: memory
  type: project
  originSessionId: 4df31b00-24d6-4eaa-a70c-088e1e45610b
---

## Problem

`PATTERN_KB` in `llmCoachHelpers.js` has alias entries where `patternKey !== kbEntry.id` (e.g. `fork: { id: 'community-double-threat', always_include: true }`). Before 2026-06-21, the KB term line in the prompt used `kbEntry.id` as the tag id, so the LLM was told to write `[term:community-double-threat]`. But because the LANGUAGE_RULE also mentions "fork" as a natural board concept, the LLM often wrote `[term:fork]` instead. `loadKBShortSummary('fork')` found no `fork.md` file → returned null → term silently dropped from `termsMap`.

## Fix (2026-06-21)

**Prompt side (`explainContext.js`):** For alias entries, the KB term line now uses `patternKey` as the tag id and shows a combined display name:
```
- [term:fork] **community double threat / fork** (fork): <short_summary>
```
Non-alias entries unchanged (tag id = KB slug).

**Sink side (`llmCoachHelpers.js`):** `loadKBShortSummary` now has an alias fallback — if direct file read returns null and the id matches a `PATTERN_KB` key, it retries with `PATTERN_KB[id].id`. The implementation was split into private `_loadKBShortSummaryRaw` + public wrapper.

## Invariant

- `seenKbIds` in `explainContext.js` still deduplicates by `kbEntry.id`, so `double_threat` and `fork` (same KB article) only produce one term line — the alias wins because `fork` comes later in PATTERN_KB.
- `terms` map keys match exactly what the LLM wrote in `[term:X]` tags (could be an alias like `fork` or a slug like `community-z-threat`).
- To test a cached position after a prompt change: delete the row from `explanation_cache` by `position_hash`, then retrigger the deep reveal.
