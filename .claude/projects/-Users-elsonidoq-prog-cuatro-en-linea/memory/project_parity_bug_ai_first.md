---
name: Server parity bug — AI-first games
description: The /api/explain parity mapping breaks when AI opens the game, swapping the human and ai heatmaps.
type: project
originSessionId: b0f55ba3-5d89-4123-8903-e23bf84def14
---
In `connect-four/server/index.js` the heatmap assignment is:

```js
const humanIsCurrentInPosition = moves.length % 2 === 1;
const human = humanIsCurrentInPosition ? opponent : current;
const ai    = humanIsCurrentInPosition ? current  : opponent;
```

This assumes Human (Red) always plays first (C++ player 0 = Human). When AI opens the game ("🤖 IA abre"), C++ player 0 = AI (Yellow), so `current` and `opponent` are swapped relative to what the server expects. The result: `explainData.human` contains AI's winning patterns and `explainData.ai` contains Human's — the heatmap colors are inverted.

**Why:** The fix needs to know which player went first. Either pass that information from the frontend (e.g., include a `humanFirst` flag in the request body), or infer it from the move history player field.

**How to apply:** Not yet fixed. Check for this when working on the explain feature or parity-related issues.
