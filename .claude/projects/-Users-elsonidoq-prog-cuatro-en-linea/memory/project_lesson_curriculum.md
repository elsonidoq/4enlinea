---
name: project-lesson-curriculum
description: "Lesson curriculum scope decisions for 1000–1500 Elo MVP — what was cut, what was kept, and why"
metadata: 
  node_type: memory
  type: project
  originSessionId: fc412ead-b83c-4db1-8238-d7666fa2182e
---

Canonical curriculum doc: `docs/lesson-curriculum.md` (updated 2026-05-28). 11 MVP lessons + 2 post-MVP.

**Why:** Target audience is 1000–1500 Elo players for the MVP.

**What was cut and the rationale:**
- Lost-position lessons (original "Don't Make It Worse", "Survival Mode") — user decision: if you're losing you lose anyway, not worth teaching at this Elo.
- Most Allis rules (baseclaim, before, specialbefore, baseinverse, vertical, aftereven, lowinverse, highinverse) — too abstract and academic for 1000–1500 Elo.
- Allen V-rules full pipeline (T1–T7 + V1–V5) — build as a backend explanation primitive, not a learner lesson.
- Ghost threats as a single lesson — broken into prerequisite pieces; zugzwang basics and ghost threats are post-MVP.

**What was kept despite being Allis rules:** Claimeven and Claimodd — user explicitly wants these. They are concrete and visual, unlike the other Allis rules.

**MVP parity dependency chain (critical sequencing):**
L4 (Odd Rows — reading lesson, zero code) → L5 (Claimeven) → L6 (Z-Threats) → L7 (Claimodd) → L8–9 (Undercut/Overcut) → L10–11 (Figure-7, J-Shape)

**Claimodd implementation note:** Originally labelled Hard; actually Medium. Detector is ~25 lines synchronous code (O(7) parity check + scores comparison, no extra solver calls). Build after Claimeven is stable.

**How to apply:** When adding new lessons or features, check against these cuts before proposing anything in the "lost position" or "abstract Allis rules" space. Claimeven/Claimodd are the only Allis exceptions.
