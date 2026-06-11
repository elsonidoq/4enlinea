# Contract: POST /api/evaluate-move — AI-move (no-category) path

**Feature**: 029-coach-commentary / FR-005a  
**Status**: Phase 2 (server change)

## Overview

The `POST /api/evaluate-move` endpoint has two distinct internal paths, selected by the presence of `category` in the request body:

| Condition | Path | Classifier call |
|---|---|---|
| `aiMove` absent or false | User-move path | `classify(movestring, colInt, scores)` — synchronous, pre-move board |
| `aiMove: true` | AI-move path (Phase 2 change) | `await classifyPattern(postMoveMovestring, aiPlayerInt, solver)` — async, post-move board |

## Request

No change to the request shape. The request body is always:

```json
{
  "movestring": "<0–42 digit string, pre-move position>",
  "col": "<0-indexed column>",
  "category": "<optional slug>",
  "aiMove": true
}
```

When `aiMove: true` is present, the handler uses the AI-move (`classifyPattern`) path. When `aiMove` is absent or false, the existing user-move (`classify`) path runs. The sparring `handleColumnClick` path sends `{ movestring, col }` with no `aiMove` field — it always uses the user-move path.

## Response

No change to the response shape:

```json
{
  "badge": "good" | "mid" | "bad",
  "quality": "optimal" | "suboptimal" | "blunder",
  "coachPhraseKey": "<i18n key>" | null,
  "coachMood": "happy" | "think" | "oops",
  "summaryLineKey": "<i18n key>" | null,
  "patternTag": "<classifier tag slug>" | null
}
```

`coachPhraseKey` in the AI-move response is NOT used by the client for the coach message — the client selects from `coach.ai_move.*` pools directly using `quality` and `patternTag` (FR-007). `coachPhraseKey` may be null or a category-specific key; clients must ignore it for AI-move coaching.

## Server-side algorithm (AI-move path, Phase 2)

```js
// post-move board state
const postMoveMovestring = movestring + String(colInt);
// who played: pre-move parity → (even length = player 1, odd = player 2)
const aiPlayerInt = (movestring.length % 2) + 1;

const tagMap = await classifyPattern(postMoveMovestring, aiPlayerInt, solver);

const PRIORITY = [
  'immediate_threat', 'double_threat', 'forced_win', 'forced_block',
  'forbidden_columns', 'z_threat', 'odd_even_threat', 'claimeven',
  'figure_7', 'j_shape', 'overcut', 'undercut', 'claimodd',
];
const patternTag = PRIORITY.find(tag => tagMap.has(tag)) ?? null;
```

The `PRIORITY` constant is the canonical source of truth for tag ordering. It MUST NOT be sorted from the Map or derived from any object iteration order.

## Client-side usage contract (Phase 2)

```js
// In useGameBoard.commitAiMove:
const classification = await classificationPromise;  // { quality, patternTag } | null

let phraseKey, mood;
if (!classification) {
  phraseKey = pickRandomKey(t, 'coach.ai_move.neutral');
  mood = 'think';
} else if (classification.quality !== 'optimal') {
  phraseKey = pickRandomKey(t, 'coach.ai_move.suboptimal');
  mood = 'oops';
} else {
  const probe = `coach.ai_move.${classification.patternTag}.0`;
  if (classification.patternTag && t(probe) !== probe) {
    phraseKey = pickRandomKey(t, `coach.ai_move.${classification.patternTag}`);
  } else {
    phraseKey = pickRandomKey(t, 'coach.ai_move.neutral');
  }
  mood = 'think';
}
updateCoach(t(phraseKey), mood, replace);
```

## Errors

Unchanged from existing endpoint: 400 (invalid params), 500 (solver error).
