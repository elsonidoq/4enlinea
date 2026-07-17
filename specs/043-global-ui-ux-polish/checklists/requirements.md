# Specification Quality Checklist: Global UI/UX & Accessibility Polish

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-07-10
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- All decisions in this spec (board a11y control granularity, logo placement/reuse, logged-out gating mechanism) were pre-settled by the epic owner prior to spec creation and are reflected here as hard constraints, not open clarification points — see the epic's "Settled decisions" section (`polish_epic.md`, Epic 3) for the resolution history.
- A post-authoring review (2026-07-10) resolved the three previously-flagged open items:
  1. **Inventory of inert logged-out CTAs** — RESOLVED. A one-pass audit of `HomeScreen.jsx` and `StatsScreen.jsx` is now recorded in the spec's Appendix and encoded as the bounded, named-target lists in FR-011 and FR-015. No open-ended "audit everything" language remains.
  2. **Exact cause of the Past Games mobile spacing issue** — still requires visual reproduction at 390×844 as a first implementation step (FR-020); this remains an implementation-time diagnosis, not a scope question, and does not block planning.
  3. **Mechanism + consumption point for the sign-in return destination** — RESOLVED. FR-013 now names the consumption point explicitly (a single reader/clearer in the app's post-login bootstrap/routing path) rather than leaving it unspecified; `sessionStorage` survival across the OAuth redirect round-trip must still be empirically confirmed during implementation (see Assumptions).
- The same review also corrected two factual issues carried over from the epic: (a) FR-001/FR-002 now scope the per-column interactive control to *playable* boards only, so read-only boards (review, mistake-detail, lessons, past-game replay, admin/eval) are not regressed with phantom column-button announcements; (b) the epic's prior claim that `Board.jsx` attaches its primary click handler per-cell at `:287` was factually wrong and has been corrected in `polish_epic.md` — the per-column wrapper already exists at `:211-229`. Decision 2 (Home title suppression, FR-019) also overrides the epic's prior "Home's title is unaffected" resolution — Home now shows exactly one DecodeC4 mark.
