# Specification Quality Checklist: Pattern Acceptance — Multi-Column Answers + Solver-Safety Invariant

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-07-29
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs) — *Note: this is an internal-tool
      correctness feature over an existing codebase; the spec necessarily names existing symbols
      (`evalUndercut`, `checkPredicateRaw`, `answerSetInvariant.js`) as the subject of each requirement,
      per this project's CLAUDE.md mandate that every spec claim carry a `file:line` citation. This is
      consistent with sibling specs in this repo (e.g. `044-puzzle-generation-correctness`). No new
      framework/language/tool choices are introduced.
- [x] Focused on user value and business needs — every user story is framed as "what the learner
      experiences" (correct move accepted / unsafe move rejected / lesson behavior unchanged).
- [x] Written for non-technical stakeholders — user scenarios and success criteria are outcome-framed;
      the Functional Requirements section is necessarily code-symbol-heavy per this project's citation
      convention, matching prior specs in this repo.
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain in the body — one decision (legacy scalar `correct_col`
      fate) was resolved 2026-07-29 (kept and maintained in sync as `correct_cols[0]`; full retirement
      split out to a separate future epic, `docs/open_issues.md` OI-81) and is recorded under
      Clarifications' "Resolved" heading; the remaining open decision (malformed-request behavior,
      Q2/FR-028) is captured under the "Session 2026-07-29 (deferred to `/speckit-clarify`)" heading per
      the epic's explicit instruction that it be resolved during `/speckit-clarify`, not pre-decided.
- [x] Requirements are testable and unambiguous — each FR cites the exact symbol/file it constrains.
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details) — phrased as board/outcome
      assertions, not code-level assertions.
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded — see spec Assumptions and the epic's "NOT included" list it inherits.
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria (traced to a User Story)
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification beyond the required source citations

## Notes

- One open question (Q2: malformed-request fallback, FR-028) remains deliberately deferred to
  `/speckit-clarify` per the source epic's explicit instruction — documented in spec.md's Clarifications
  section rather than left as an unresolved `[NEEDS CLARIFICATION]` marker, since the epic states it must
  be *decided during the spec/plan process*, not treated as a spec gap. Q1 (legacy `correct_col` fate) was
  resolved 2026-07-29: kept and maintained in sync as `correct_cols[0]` for this feature; full retirement
  is deferred to a separate, future epic (`docs/open_issues.md` OI-81) after the consumer inventory came
  back substantially larger than the estimate the earlier "migrate and drop" decision was made on.
- This feature's scope already exceeded this project's usual 3–5 story sizing bar at 4 user stories
  (down from the source epic's 6, collapsed without losing coverage — see
  `docs/epics/open-issues-epics.md` lines 110-114). The 2026-07-29 post-review round grew it further, then
  a same-day reversal (the legacy-scalar retirement decision) shrank it back down: FR-032's
  server-conventions.md doc requirement (now FR-020) and the live-pool-fallout requirements (now
  FR-021–FR-023) still apply, but the consumer-inventory/per-call-site-migration/column-drop requirements
  are gone, replaced by a single kept-in-sync compatibility requirement (FR-019). Net FR count: 28 to 33.
  This is flagged in spec.md's sizing note (top of the Requirements section) rather than absorbed silently
  — the remaining growth closes a real safety gap (live puzzle pool depletion) or documents a deliberate,
  temporary duplication (FR-019), not scope creep.
- 2026-07-29 post-review pass also: (a) narrowed FR-010 so `z_threat`/`overcut` keep their existing
  generation-time uniqueness guard (Decision A) rather than admitting multi-column boards, removing a
  self-contradiction against the Edge Cases section and against `docs/architecture/server-conventions.md:136`
  and `docs/architecture/data-model.md:338`; (b) rescoped SC-001 to the six categories where a
  multi-column answer is structurally possible, naming the reason each of the other six is exempt; (c)
  added FR-020 restoring the `docs/architecture/server-conventions.md` documentation task dropped in the
  6→4 story restructuring.
- Later the same day (2026-07-29), the owner reversed the "migrate and drop `correct_col` in this feature"
  decision after the re-derived consumer inventory came back at 105 references across 22 files (not the
  62/11 estimate the decision had been made on). FR-017 was reverted to "kept in sync", FR-027 (send
  `puzzleId`) no longer requires dropping the client's use of `correctCol`/`highlightMetadata`, and the
  three retirement FRs were replaced by one compatibility FR — renumbering everything from FR-019 onward.
  The full inventory is preserved in `docs/open_issues.md` OI-81 for the split-out future epic.
