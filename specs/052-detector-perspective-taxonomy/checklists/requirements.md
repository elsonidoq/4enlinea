# Specification Quality Checklist: Detector Perspective Soundness & Blunder Tag Taxonomy

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-07-30
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs) — *Note: this epic is an internal-correctness/data-migration epic explicitly scoped by function/file/table identity (per the epic's own hard constraints and the project's CLAUDE.md citation requirement). Symbol/file citations appear only in the "Context this spec inherits" background section and as parenthetical grounding inside requirements; the User Scenarios and the requirement statements themselves are phrased as observable system behavior, not implementation instructions (no chosen data structures, algorithms, or code layout are mandated beyond what the epic's hard constraints already fix).*
- [x] Focused on user value and business needs — each user story states the player-visible or reviewer-visible consequence (correct tag, correct pattern recognition, correct labeling) before any mechanism.
- [x] Written for non-technical stakeholders — user stories and acceptance scenarios are phrased in terms of board positions, player experience, and review workflow, not code paths.
- [x] All mandatory sections completed — User Scenarios & Testing, Requirements, Success Criteria, Assumptions all present.

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain — the three genuine open decisions are captured in a dedicated "Open Questions" section (matching the source epic's own explicit Open Questions), not as inline markers, because the epic itself mandates they be decided during planning/implementation with the owner, not guessed at spec time.
- [x] Requirements are testable and unambiguous — each FR names a specific, checkable behavior (e.g., "MUST NOT accept a `perspective` parameter that can diverge from the side to move").
- [x] Success criteria are measurable — each SC is a yes/no or percentage-verifiable statement.
- [x] Success criteria are technology-agnostic — phrased as detector behavior/player experience outcomes, not framework or library specifics.
- [x] All acceptance scenarios are defined — every user story has Given/When/Then scenarios.
- [x] Edge cases are identified — seven edge cases covering co-occurring matches, mutual threats, rename-only diffs, false-negative fixes, bidirectional taxonomy validation, column overlap in fork diffing, and solver unavailability.
- [x] Scope is clearly bounded — "Context this spec inherits" explicitly states what is a precondition (already shipped) and what must NOT be touched (detectFigure7/detectJShape signatures, set-valued accumulation).
- [x] Dependencies and assumptions identified — Assumptions section lists six explicit assumptions, including the two-role-split template and the fast-test-suite exclusion boundary.

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria — FRs map to the Acceptance Scenarios of their originating user story.
- [x] User scenarios cover primary flows — all five source user stories (US2.1–US2.5) are preserved 1:1 as User Story 1–5.
- [x] Feature meets measurable outcomes defined in Success Criteria — SC-001 through SC-007 each trace to at least one FR/user story.
- [x] No implementation details leak into specification — see Content Quality note above; the one deliberate exception (grounding citations in the inherited-context section) is disclosed, not hidden.

## Notes

- This spec preserves the source epic's `Settled decisions`, `Non-obvious facts`, and `NOT included` as hard constraints per the reading contract that produced it; it does not re-derive or relitigate them.
- The three Open Questions are intentional carry-overs from the source epic, not gaps in this spec — the epic explicitly requires the owner to decide them, not the spec author.
- All file:line citations in this spec were verified against the working tree at authoring time (`connect-four/server/classifier.js:1020-1073`, `:1961`, `:1052`, `:981`, `:1003`, `:696`) rather than copied from the epic verbatim.
- Post-review revision (2026-07-30): FR-002 was rewritten from a preference to a mandate and a new FR-003 was added requiring the two-function `detectOvercutVictim`/`detectOvercutBeneficiary` split (mirroring the shipped undercut pair), closing a gap where the spec had reopened the epic's Settled decision 1. Two deliverables the epic tasks out — KB cross-references (now FR-011) and the Fix 4 grounding-rule-text check (now FR-016) — were added, and FR-013 (originally) was split into FR-015/FR-016 so the LLM-context tag list in server code (`explainContext.js`) and the LLM-facing glossary document are tracked as two distinct touchpoints. FR-020 (originally) was changed to require the existing absent→present transition gate (`classifier.js:696`) rather than machinery from User Story 4, and a new optional FR-024 was added so User Story 5 no longer depends on User Story 4. All FR numbers from FR-003 onward shifted by two to four positions versus the original draft; all in-spec cross-references (Open Questions, later FRs) were updated to match — always locate by requirement text/symbol name, not by a remembered number, since this renumbering may not be the last.
