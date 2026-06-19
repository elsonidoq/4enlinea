---
name: project-lesson-curriculum
description: "Lesson curriculum scope decisions for 1000–1500 Elo MVP — what was cut, what was kept, and why"
metadata: 
  node_type: memory
  type: project
  originSessionId: fc412ead-b83c-4db1-8238-d7666fa2182e
---

Canonical curriculum doc: `docs/mvp/lesson-curriculum.md`. **9 MVP lessons + 2 post-MVP** (updated 2026-06-19 — restructured from 11).

**Why:** Target audience is 1000–1500 Elo players for the MVP.

**What was cut and the rationale:**
- Lost-position lessons — user decision: if you're losing you lose anyway, not worth teaching at this Elo.
- Most Allis rules (baseclaim, before, specialbefore, baseinverse, vertical, aftereven, lowinverse, highinverse) — too abstract and academic.
- Allen V-rules full pipeline (T1–T7 + V1–V5) — backend primitive, not a learner lesson.
- Ghost threats as a single lesson — broken into prerequisites; zugzwang basics and ghost threats remain post-MVP.
- Claimodd — removed entirely (wrong implementation + ~2/400 generation rate).
- Standalone "Odd Rows Belong to Red" parity lesson — merged into L4 Z-Threats. Parity slides are now the first half of the Z-Threats lesson, giving the conceptual intro an immediate practical payoff.

**Current lesson order (lesson files in `connect-four/lessons/`):**
1. Spot the Win (`immediate_threat`)
2. Block Before You Build (`forced_block`)
3. The Fork (`double_threat`)
4. Z-Threats — Own the Column (`z_threat`) ← parity intro merged here
5. Claimeven (`claimeven`)
6. The Undercut (`undercut`)
7. The Overcut (`overcut`)
8. Figure-7 Trap (`figure_7`)
9. J-Shape (`j_shape`)

**Post-MVP:** Zugzwang Basics (L10), Ghost Threats (L11)

**Key sequencing dependency:** L4 Z-Threats (parity intro + capsule puzzle) → L5 Claimeven → L6–7 Undercut/Overcut → L8–9 shapes.

**How to apply:** When adding new lessons or features, check against these cuts. Claimeven is the only Allis exception. Do not propose standalone parity lesson — it is now the first half of Z-Threats. Do not propose Claimodd — it was removed.
