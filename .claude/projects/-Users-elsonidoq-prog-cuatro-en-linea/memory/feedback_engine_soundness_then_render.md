---
name: feedback_engine_soundness_then_render
description: "The reason engine must store the SOUNDEST/most COMPLETE evidence; what+how to feed the LLM (pruning, long-line rendering) is a SEPARATE downstream step — don't let render constraints narrow what the engine stores"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 04ae8730-8a09-4697-9921-750a15ecac49
---

Owner directive during D26 (2026-07-02): **make the reason feature-vector as sound and complete as
possible first; deciding WHAT and HOW to feed it to the LLM is a separate downstream preprocessing
step.**

**Why:** soundness of the evidence vector is the acceptance bar (I0/I2/I3). Rendering concerns —
D5/D10 "don't show a 25-ply line", the `parity` register nulling `line`, prompt pruning — belong to
the render/feed layer, which is independently tunable. If you let a rendering constraint decide what
the engine *stores*, you throw away sound evidence you can't get back.

**How to apply:**
- Do NOT restrict an engine mechanism to "short/tactical" cases just because the deep case would be
  awkward to render. (D26: the occupation-witness denial applies to ALL non-fork `win_to_draw`,
  including deep parity wins, not just `immediate`/`forced_sequence` ones.)
- Do NOT null / drop a field to match a render rule. (D26: `denial` halves keep the FULL `line` even
  at `parity` register, bypassing `renderHalf`'s null-for-parity.) `register` becomes a *label*, not a
  data gate, on such paths.
- When a value like `register` is derived from `fwd` on a non-walked half, treat it as descriptive
  metadata; the load-bearing evidence (line, finalMovestring, witness cell) is stored regardless.

Related: `reason-DECISIONS.md` D1 (correctness over solver cost — same spirit,
different axis), `reason-DECISIONS.md` D18/D26 (D26 concrete change),
`reason-DECISIONS.md` D21 (toNarratorVector is the projection/prune layer that decides
what actually reaches the LLM — the downstream step this principle defers to).
