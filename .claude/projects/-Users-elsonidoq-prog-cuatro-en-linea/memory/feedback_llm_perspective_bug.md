---
name: feedback_llm_perspective_bug
description: "LLM adopts opponent's perspective when board header says \"Next: <opponent>\" — always name the player explicitly in the prompt"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: f7245b56-65c5-4c8d-a09c-1fb8c9a80c6a
---

When the LLM receives a Connect Four board where the header reads "Next: Yellow" (post-move board after Red played), it silently adopts Yellow as the subject of its explanation — even if the task asks about Red's move.

**Why:** The board visualization shows the state *after* the move, so the next-to-play label is the opponent. Without an explicit player anchor in the prompt, the LLM infers the perspective from the most salient player signal it sees, which is the "Next:" label.

**How to apply:** Always include a `## Move context` section (or equivalent) at the top of any LLM prompt that involves a post-move board. It must name the player who made the move and explicitly state that all analysis is from that player's perspective. Example:

```
## Move context
**Red** just played **col 3**. The board below shows the position after this move;
it is now Yellow's turn. All pattern data and your explanation must be from **Red's perspective**.
```

This pattern applies to any coach/explanation prompt that passes a board position to an LLM — not just `explain_move.mjs`.
