---
name: project_pattern_kb_architecture
description: "PATTERN_KB structure in llmCoachHelpers.js — entry shapes, always_include flag, fork alias pattern, and how kbTermsSection is built"
metadata: 
  node_type: memory
  type: project
  originSessionId: 8b3010d3-7cec-45b3-8dfc-c980649a8ace
---

## PATTERN_KB entry shapes (as of 2026-06-20)

Every entry must have `id` pointing to a KB file. `inline` entries no longer exist — they were migrated to files 2026-06-20.

```js
// Standard pattern-conditional entry (only appears in prompt when pattern fires)
double_threat: { id: 'community-double-threat' },

// Always-include glossary entry (appears in every explain-move prompt)
major_threat: { id: 'allen-major-threat', always_include: true },

// Alias entry — shares a KB file with another entry (fork → same file as double_threat)
fork: { id: 'community-double-threat', always_include: true },
```

## kbTermsSection builder (explainContext.js)

Inclusion rules:
1. Must have `kbEntry.id` (no inline entries remain, but guard is kept)
2. `forced_win` is explicitly excluded (LANGUAGE_RULE bans it from LLM output)
3. Included if `kbEntry.always_include === true` OR pattern key is in `relevantPatternKeys` (patterns that fired in the position)
4. Deduplication by `kbEntry.id` via `seenKbIds` Set — prevents same article appearing twice when both a pattern-conditional and an alias entry are present

## Popup display name (frontend)

`KbTermPopup` reads `KB_TERM_LESSON[kbId].displayName` from `src/lib/kbTermLesson.js`. Falls back to raw kbId if no entry exists (shows ugly slug). **Every new KB file that can appear in a popup must have an entry in kbTermLesson.js.**

`KB_TERM_LESSON` also controls `lessonId` and `practiceCategory` for the CTA button in the popup.

## Adding a new KB term to popups — checklist

1. Create `docs/knowledge-base/<id>.md` with `short_summary` field
2. Add to `PATTERN_KB` in `llmCoachHelpers.js` with `{ id: '<id>' }` (or `always_include: true` for glossary terms)
3. Add entry to `src/lib/kbTermLesson.js` with `displayName` (and `lessonId`/`practiceCategory` if applicable)
4. Smoke test: `loadKBShortSummary('<id>')` must return non-null

**Why:** `loadKBShortSummary` is what the server calls to build `termsMap`. Missing `short_summary` → term silently dropped from map → popup never opens.


---

## (merged from `project_pattern_tier_definitions` — Pattern Tier-1/2/3 grouping lives in explainContext.js, NOT classifier.js; distinct from position tier (WINNING/LOSING))

The deep-reveal **pattern tiers** (Tier-1/Tier-2/Tier-3) are NOT defined in
`classifier.js` — grepping it for "tier" returns nothing. `classifier.js` only
produces the raw `classifyPattern` tags. The tier *grouping* lives in
`server/explainContext.js`:

- `TIER1_TAGS` = `immediate_threat, double_threat, undercut, overcut, figure_7, j_shape`
  (detectors returning concrete `cells[]`).
- `TIER2_TAGS` = `z_threat` (cells `[]`, derives a capsule column).
- Tier-3 (forced_win, forced_block, forbidden_columns, odd_even_threat,
  claimeven, drawing_move, suboptimal_move) is position-global, not added to allowedSet.

A board "with no Tier-1/2 pattern" is exactly the `allowedSet === null` case in
`buildAllowedSetFromPatternMaps` — see [[project_annotation_gate_and_zones]] (null vs []
semantics for validateAnnotation).

**Threat detectors emit cells but are deliberately NOT in `TIER1_TAGS`.** The 3
parity-aware threat detectors added 2026-06-25 (`major_threat_parity`,
`major_threat_nonparity`, `minor_threat`) return concrete `cells[]` like a Tier-1
detector, yet they are intentionally absent from `explainContext.js`'s `TIER1_TAGS`, so
`buildAllowedSetFromPatternMaps` falls them through to "Tier-3: skip" — they do NOT
expand the static `allowedSet`. They flow instead through the **sparse look-ahead's
own** `LOOKAHEAD_TAGS = TIER1 ∪ THREAT_TAGS` set in `sparseLookahead.js` (a separate
tier list from explainContext's). Two distinct tag-tier registries; don't assume a
cell-emitting tag is in `TIER1_TAGS`. See [[project_lookahead_shared_seam]] and
[[project_detect_odd_even_threat_yellow]].

**Beware a second, unrelated "tier":** `getPositionTier` (in `llmCoachHelpers.js`)
returns the *position* tier `WINNING | NEUTRAL | LOSING` from solver scores. Totally
different axis from pattern tiers. And `reference_tier_source` is yet a third meaning
(user subscription tier). Three "tier" concepts; don't conflate.

**How to apply:** When asked anything about "Tier-1/2 patterns", read
`explainContext.js` (TIER1_TAGS/TIER2_TAGS), not classifier.js. To check a board for
no-Tier-1/2 pattern, run `classifyPattern(ms, perspective, solver)` for both
perspectives and test its tag keys against the TIER1∪TIER2 set (the retired
`generate_eval_set.mjs` did this to collect its ≥10 no-Tier-1/2 boards; DELETED 2026-07-01 D22). See
[[project_explain_system]] and the retired old-explain eval (reason eval is now `compute.mjs`, D22).
