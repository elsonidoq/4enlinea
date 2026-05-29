---
name: project-kb-migration
description: Status of the docs/knowledge-base migration from prose to schema-driven entries; which steps are done and what remains
metadata: 
  node_type: memory
  type: project
  originSessionId: 779b9ed5-3125-4d32-a29b-51e7edc1cca3
---

Migration of `docs/connect-four-strategy-reference.md` into the structured KB at `docs/knowledge-base/`. Schema defined in `docs/knowledge-base/README.md`. Template entry: `allen-t4.md` (only fully solver-verified entry).

**Why:** Primary consumer is Claude Code during implementation. Prose hides errors between paragraphs; schema-driven entries with formal predicates, verbatim quotes, and solver-verified examples make errors structurally visible.

**Steps complete (as of 2026-05-17):**

- Step 1: 8 audit edits applied to prose reference.
- Step 2: Schema designed; `allen-t4.md` created as template.
- Step 3: 22 canonical entries created with verbatim quotes and formal predicates:
  - Allen T1–T7 (`allen-t1` through `allen-t7`)
  - Allen V1–V5 (`allen-v1` through `allen-v5`)
  - Allis's 9 rules (`allis-claimeven`, `allis-baseinverse`, `allis-vertical`, `allis-aftereven`, `allis-lowinverse`, `allis-highinverse`, `allis-baseclaim`, `allis-before`, `allis-specialbefore`)
  - `allen-j-configuration`
  - Backlinks added to prose reference for all 22 entries.
  - Most `worked_examples` are `solver_verified: PENDING`.

**All steps complete as of 2026-05-17:**

- Step 4 (project-local entries): All 8 created with formal predicates, known_limitations, false_positives:
  `community-z-threat`, `community-ghost-threat`, `community-parity-trap`, `community-claimodd`,
  `community-figure-7`, `community-sextuple-threat`, `derived-parity-formula`, `derived-dead-space-parity`.
  - `community-figure-7` and `community-claimodd` have solver-verified worked examples.
  - `community-sextuple-threat`, `community-parity-trap`, and some sextuple FPs are PENDING movestring construction.
  - `community-figure-7` has two solver-verified false positives: `41432254553` (far-arm-end) and `33344646555` (direct-fork).

- Step 5: Backlinks added to prose reference (§2.2, §2.4, §3.4, §4.4, §5.4, §7.2).

- Step 6: Schema-enforcement sentence added to README "Adding a new entry" section.

**What remains:** PENDING movestrings in `community-sextuple-threat` and `community-parity-trap`. Solver verification of all PENDING worked examples across all 30 entries.
