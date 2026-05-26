<!--
SYNC IMPACT REPORT
==================
Version change: 1.3.0 → 1.3.1
Bump type: PATCH — clarification and pointer update; no new principle.

Modified sections:
  - Principle VIII: Documentation as First-Class Deliverable
      · "Before planning" paragraph: added docs/architecture/ to the required reading list.
      · "Concretely" bullet list: replaced with per-file mapping under docs/architecture/.
      · "During implementation" paragraph: updated artifact pointer to docs/architecture/.

Rationale: docs/architecture/ was created and populated as of 2026-05-15 and is now the
single source of truth for conventions. Principle VIII was written before that directory
existed, so all pointers still referenced data-model.md, contracts/, and plan.md directly.

Added sections: N/A
Removed sections: N/A

Templates requiring updates:
  ✅ .specify/templates/plan-template.md — Constitution Check Principle VIII bullet updated
     to include docs/architecture/ in the required reading list.
  ✅ .specify/templates/tasks-template.md — Phase N: Polish architecture doc tasks updated
     to reference docs/architecture/ files per the new mapping.

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
- Solver-required predicate evaluation (`forced_win`, `forbidden_columns`) MUST complete in under 3 seconds.
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
Known failure mode: solver scores are flat at forced-win terminals — all opponent columns score
identically, so scores cannot identify the forced block. Direct board threat detection is
required in that case. Analogs exist for any component with edge-case output behavior.

**Make load-bearing assumptions explicit.** Any assumption that affects correctness (e.g.,
move-parity convention, cache behavior of an admin endpoint, which player opens the game)
MUST be enforced by a runtime guard or documented in a code comment at the exact point where
it is load-bearing. Assumptions that hold only on the happy path and fail silently on edge
cases are bugs waiting to happen.

**Rationale**: The heatmap parity bug (swap when AI opens), the curation re-review join miss
(`annotator_note` discovered only after shipping), and the forced-win forced-block misdiagnosis
(flat solver scores cannot select a column) each stem from one of these failures — writing
before mapping, using a signal without validating it, or leaving a critical assumption
implicit. The heatmap bug investigation also spent 40+ rounds on theoretical analysis that
two bash commands with a real moves string would have resolved immediately.

### VII. Software Design Philosophy

These aphorisms govern all design and implementation decisions across the codebase. When two
approaches are equally valid by other measures, prefer the one that satisfies more of these.

- Beautiful is better than ugly.
- Explicit is better than implicit.
- Simple is better than complex.
- Complex is better than complicated.
- Flat is better than nested.
- Sparse is better than dense.
- Readability counts.
- Special cases aren't special enough to break the rules.
- Although practicality beats purity.
- Errors MUST NOT pass silently — unless explicitly silenced.
- In the face of ambiguity, refuse the temptation to guess.
- There should be one — and preferably only one — obvious way to do it.

**Rationale**: These are the properties that make software maintainable long-term. They are
not aspirational; they are constraints. "Practicality beats purity" is the sole escape hatch,
and it requires a documented justification at the call site when invoked.

### VIII. Documentation as First-Class Deliverable

Documentation is as important as code. An architectural decision, convention, or design
pattern that is not documented does not exist as a constraint — agents and developers MUST
NOT be required to infer it by reading source code.

**Before planning a new spec**, the author MUST read all existing architecture documentation
(docs/architecture/, plan.md, data-model.md, contracts/, and the constitution) and ensure the
new spec is consistent with established decisions. Undocumented decisions discovered during
this review MUST be documented before planning continues.

**During implementation**, any task that introduces a new architectural decision, convention,
or design pattern MUST include documentation as part of its definition of done. The
documentation MUST be present in the appropriate file under docs/architecture/ or contracts/,
as mapped above, before the task is marked complete. A task that changes how something works
without updating the corresponding spec artifact is not done.

**Concretely**:
- New DB schema decisions → docs/architecture/data-model.md
- New API endpoint shape or error contract → docs/architecture/api-conventions.md
- New server-side patterns (solver IPC, category registry, predicate evaluators) →
  docs/architecture/server-conventions.md
- New frontend patterns (state management, store interface, analytics, board API) →
  docs/architecture/frontend-conventions.md
- New testing patterns (fixture format, test types, runner config) →
  docs/architecture/testing-conventions.md
- New API contracts for a specific feature → contracts/ under the relevant spec
- New cross-cutting invariants with no existing home → constitution amendment
- Newly discovered gaps or unresolved decisions → docs/architecture/gap-report.md

**Rationale**: Consistency across features is only possible when the source of truth for
architectural decisions is the spec artifacts, not the code. When agents must read the
implementation to understand conventions, they introduce inconsistencies proportional to how
much of the codebase they must read. Explicit documentation closes this gap and makes future
planning sessions fast and reliable.

## Tier & Access Control Constraints

These constraints apply across all features and MUST be enforced server-side; client-side
gating is presentational only.

| Tier | Capabilities |
|---|---|
| Anonymous | Basic puzzles (`immediate_threat`, `forced_block`, `double_threat`), Sparring, one-line summaries only |
| Signed-in (free) | Same as anonymous + 3 Deep Reveals per day |
| Paid | All pattern categories beyond the three free ones: `forced_win`, `forbidden_columns`, `z_threat`, `claimeven`, `undercut`, `overcut`, `figure_7`, `j_shape` (8 total as of spec 008); unlimited Deep Reveals, Personal AI Coach, Premium Analytics, Advanced Training Paths, cross-device sync |

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

**Version**: 1.3.1 | **Ratified**: 2026-04-30 | **Last Amended**: 2026-05-15
