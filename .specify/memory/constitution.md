<!--
SYNC IMPACT REPORT
==================
Version change: (unversioned) → 1.0.0
Added sections:
  - Core Principles (5 principles)
  - Tier & Access Control Constraints
  - Governance
Modified principles: N/A (initial ratification)
Removed sections: N/A
Templates requiring updates:
  ✅ .specify/templates/plan-template.md — Constitution Check section is generic; gates are applied per-feature at plan time
  ✅ .specify/templates/spec-template.md — no structural changes required; principles inform acceptance criteria
  ✅ .specify/templates/tasks-template.md — no structural changes required
Deferred TODOs: none
-->

# DecodeC4 Constitution

## Core Principles

### I. Explanation Engine as Single Source of Truth

Every feature that exposes a move or board position to the user MUST route through the shared
Explanation Engine. No feature may produce move evaluations, pattern labels, or natural-language
annotations independently.

The engine operates in exactly three layers — solver scores, rule-based pattern classifier,
LLM annotation — in that order. The LLM layer MUST NOT speculate beyond what the classifier
found; annotations must be grounded in classifier output only.

All user-facing explanations MUST include:
- At minimum a one-line summary (always visible).
- A full Deep Reveal available on demand (progressive disclosure).

**Rationale**: Consistency of explanation is the product's core differentiator. Divergent
explanations across Puzzles, Sparring, and Papergames review would destroy user trust.

### II. Code Quality & Simplicity

Code MUST be written for the next reader, not the current task:
- No speculative abstractions. Three similar lines beat a premature helper.
- No half-finished implementations. Stub only what is covered by a failing test.
- No defensive error handling for scenarios that cannot occur; validate only at system
  boundaries (user input, external APIs, solver IPC).
- Comments are written only for non-obvious WHY — a hidden constraint, a subtle invariant,
  a workaround. Comments describing WHAT the code does are prohibited.
- The storage-agnostic interface for app state (IndexedDB ↔ backend) MUST be honored;
  no component may reference a concrete storage backend directly.

**Rationale**: The codebase is maintained by a small team. Complexity compounds; simplicity
compounds too.

### III. Testing Standards

- Every solver-dependent feature (pattern classification, puzzle goal predicates, heatmap
  generation) MUST have integration tests that exercise the real C++ solver binary, not a
  mock.
- Puzzle goal predicates MUST be tested with at least one positive and one negative board
  fixture per predicate type.
- UI features MUST be manually verified on the golden path and at least one edge case before
  being reported complete. Type checking and automated tests verify code correctness, not
  feature correctness.
- Free/paid tier gating MUST be tested for every new feature that touches account tiers:
  anonymous, signed-in free, and paid paths each require an acceptance scenario.
- Test data (board fixtures) MUST be deterministic and checked into the repo; no tests may
  depend on random board generation.

**Rationale**: A mocked solver test gives false confidence; the prior heatmap bug
(`possibleNonLosingMoves()==0` branch) was only caught by running the real solver.

### IV. UX Consistency & Progressive Disclosure

- All board visualizations (heatmaps, move timelines, Deep Reveal overlays) MUST use the
  same color scale and legend across every feature surface.
- Contextual suggestions in Sparring and pattern labels in Puzzles MUST use identical
  terminology (e.g., "double threat" is always "double threat", never "two-way threat").
- Progressive disclosure MUST be applied universally: one-line summary by default, full
  detail on explicit user action. No feature may surface full Deep Reveal content without
  a user gesture.
- Commit-first mode in Sparring MUST suppress ALL evaluative information (scores, heatmaps,
  hints) until the user commits. No partial disclosure.
- Locked paid-tier content MUST always render a preview card with a clear upgrade prompt;
  it MUST NOT be invisible or produce an error.

**Rationale**: Users move between Puzzles, Sparring, and Coach views in a single session.
Inconsistent terminology or visual language breaks the learning loop.

### V. Performance Requirements

- The Explanation Engine MUST return a complete response (solver score + pattern tags +
  LLM annotation) in under 2 seconds for any position reachable during normal gameplay.
- Heatmap generation for the current board MUST complete in under 500 ms.
- Puzzle goal predicate evaluation (bitboard-only, categories 1–3) MUST complete in under
  100 ms.
- Solver-required predicate evaluation (categories 4–6) MUST complete in under 3 seconds.
- Any operation that cannot meet its latency budget MUST show a loading indicator within
  200 ms of initiation; silent hangs are prohibited.
- Analytics writes to the `tracks` table MUST be fire-and-forget and MUST NOT block any
  user-facing operation.

**Rationale**: The app is interactive and real-time. A slow explanation breaks the feedback
loop that makes training effective.

## Tier & Access Control Constraints

These constraints apply across all features and MUST be enforced server-side; client-side
gating is presentational only.

| Tier | Capabilities |
|---|---|
| Anonymous | Basic puzzles (categories 1–3), Sparring, one-line summaries only |
| Signed-in (free) | Same as anonymous + 3 Deep Reveals per day |
| Paid | All 6 pattern categories, unlimited Deep Reveals, Personal AI Coach, Premium Analytics, Advanced Training Paths, cross-device sync |

- The free/paid split is a single configuration value. No feature may hard-code tier logic.
- Deep Reveal quota (3/day for free users) is tracked server-side, keyed to the Supabase
  user ID. Anonymous quota is keyed to the device-bound UUID and is not migrated on signup.
- Local IndexedDB state MUST migrate to the backend seamlessly on signup with no data loss.

## Governance

This constitution supersedes all other practices, coding guidelines, and informal agreements.
Any practice that conflicts with a principle stated here MUST be updated to comply.

**Amendments**: Any change to a principle or section requires:
1. A written rationale referencing the triggering product or technical decision.
2. Version bump per semantic versioning:
   - MAJOR: removal or redefinition of a principle.
   - MINOR: new principle or materially expanded guidance.
   - PATCH: clarifications, wording, non-semantic refinements.
3. Update of this file and re-check of all templates listed in the Sync Impact Report.

**Compliance review**: The Constitution Check section of every `plan.md` MUST explicitly
verify each principle before implementation begins, and again after Phase 1 design is
complete.

**Version**: 1.0.0 | **Ratified**: 2026-04-30 | **Last Amended**: 2026-04-30
