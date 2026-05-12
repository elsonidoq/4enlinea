<!--
SYNC IMPACT REPORT
==================
Version change: 1.0.0 → 1.1.0
Bump type: MINOR — new principle added (VI), materially expanded guidance in existing sections.

Modified sections:
  - Principle I: "Papergames review" softened to "future Papergames integration" (not a live surface)
  - Principle V (Performance): numeric category references replaced with slug names
  - Tier & Access Control table: numeric category references replaced with slugs; "All 6 pattern
    categories" updated to "All 7 pattern categories" (forbidden_columns now a live category)
Added sections:
  - Principle VI: Implementation & Debugging Methodology
Removed sections: N/A

Templates requiring updates:
  ✅ .specify/templates/plan-template.md — Constitution Check section is generic; no structural
     changes required; Principle VI compliance can be noted at plan-time as needed
  ✅ .specify/templates/spec-template.md — no structural changes required; Principle VI informs
     the Assumptions section (load-bearing assumptions should be surfaced there)
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
explanations across Puzzles, Sparring, and future Papergames integration would destroy user
trust.

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
- Puzzle goal predicate evaluation (bitboard-only: `immediate_threat`, `forced_block`,
  `double_threat`) MUST complete in under 100 ms.
- Solver-required predicate evaluation (`fork_setup`, `zugzwang`, `parity_control`,
  `forbidden_columns`) MUST complete in under 3 seconds.
- Any operation that cannot meet its latency budget MUST show a loading indicator within
  200 ms of initiation; silent hangs are prohibited.
- Analytics writes to the `tracks` table MUST be fire-and-forget and MUST NOT block any
  user-facing operation.

**Rationale**: The app is interactive and real-time. A slow explanation breaks the feedback
loop that makes training effective.

### VI. Implementation & Debugging Methodology

These practices MUST govern how features are built and bugs are diagnosed. They exist because
the most expensive incidents on this codebase were not caused by wrong code — they were caused
by wrong process.

**Reproduce before theorizing.** When investigating a bug, the first action is to obtain a
concrete reproducing artifact: a moves string, a network request/response, a failing test
invocation, or an exact API call. Analysis without a concrete reproduction is speculation.
Reserve theoretical reasoning for explaining *why* after the empirical result is known —
never to predict what the result will be.

**Map data dependencies before writing.** Before implementing any feature that reads or writes
across multiple tables or endpoints, explicitly list every field the UI needs and trace each
to its source table. All required selects and joins MUST be identified before any code is
written. Discovering a missing join mid-implementation is a process failure, not a surprise.

**Validate signal validity before using it.** Before using a component's output to drive logic,
verify with a concrete test case that the signal actually distinguishes the relevant cases.
Known failure mode: solver scores are flat at zugzwang terminals — all opponent columns score
identically, so scores cannot identify the forced block. Direct board threat detection is
required in that case. Analogs exist for any component with edge-case output behavior.

**Make load-bearing assumptions explicit.** Any assumption that affects correctness (e.g.,
move-parity convention, cache behavior of an admin endpoint, which player opens the game)
MUST be enforced by a runtime guard or documented in a code comment at the exact point where
it is load-bearing. Assumptions that hold only on the happy path and fail silently on edge
cases are bugs waiting to happen.

**Rationale**: The heatmap parity bug (swap when AI opens), the curation re-review join miss
(`annotator_note` discovered only after shipping), and the zugzwang forced-block misdiagnosis
(flat solver scores cannot select a column) each stem from one of these failures — writing
before mapping, using a signal without validating it, or leaving a critical assumption
implicit. The heatmap bug investigation also spent 40+ rounds on theoretical analysis that
two bash commands with a real moves string would have resolved immediately.

## Tier & Access Control Constraints

These constraints apply across all features and MUST be enforced server-side; client-side
gating is presentational only.

| Tier | Capabilities |
|---|---|
| Anonymous | Basic puzzles (`immediate_threat`, `forced_block`, `double_threat`), Sparring, one-line summaries only |
| Signed-in (free) | Same as anonymous + 3 Deep Reveals per day |
| Paid | All 7 pattern categories (including `fork_setup`, `zugzwang`, `parity_control`, `forbidden_columns`), unlimited Deep Reveals, Personal AI Coach, Premium Analytics, Advanced Training Paths, cross-device sync |

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

**Version**: 1.1.0 | **Ratified**: 2026-04-30 | **Last Amended**: 2026-05-12
