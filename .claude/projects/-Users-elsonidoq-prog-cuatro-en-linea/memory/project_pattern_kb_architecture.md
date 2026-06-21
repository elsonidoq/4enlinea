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
