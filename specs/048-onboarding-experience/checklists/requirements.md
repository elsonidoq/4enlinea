# Specification Quality Checklist: Onboarding Experience

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-07-12
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

- No [NEEDS CLARIFICATION] markers were needed: the epic's "Settled decisions" fully resolved scope, trigger, persistence, and branch-placement questions, so all ambiguity in the source epic had already been closed before this spec was written. The only open item flagged in the epic (OAuth-hash-vs-first-run-redirect sequencing) is captured as a hard requirement (FR-014) and a testable acceptance scenario (US1 scenario 3) rather than left as a clarification — the *mechanism* is a planning-phase concern, but the *behavioral contract* (no race, no duplicate/broken outcome) is specified and testable now.
- All items pass on first pass; no iteration was required.
- **Post-critique correction (2026-07-12)**: An implementation-feasibility critique found three requirements that described behavior the current codebase cannot actually produce as written. All three were corrected in spec.md:
  - FR-012 originally claimed the onboarding flag would be carried over "automatically... without requiring a new bespoke reconciliation path," implying no new code. In fact the existing migration path does not carry any profile fields end-to-end today (client payload omits it, server handler has no branch for it, there is no matching database column). FR-012 now explicitly requires extending the existing migration path across those three layers, while still ruling out a *separate* reconciliation service.
  - FR-011 assumed an existing write path for anonymous-profile fields; there isn't one (the local profile store only sets its initial value once). FR-011 now requires adding a small single-record profile-write capability as part of this feature.
  - FR-018 previously had no state distinct from "completed" or "skipped" for a user who saw the onboarding game end before any coach reaction fired, which silently re-triggered onboarding on their next visit — contradicting FR-001/FR-002 (never show onboarding twice). A four-value onboarding-state model (`not_encountered` / `encountered_no_aha` / `aha_reached` / `skipped`) was added to Key Entities, and FR-001, FR-005, FR-009, and FR-018 were updated to reference it explicitly.
  - Additionally, FR-007 and User Story 3 were relaxed per an explicit product decision: the post-aha import offer is now shown to every user (not gated on "plays online elsewhere"), always dismissible. FR-015 was tightened to specify that anonymous funnel-analytics events must carry the profile's device identifier via the existing analytics anonymous-attribution field, closing the SC-005 measurability gap for anonymous users.
  - All Content Quality / Requirement Completeness / Feature Readiness checklist items above were re-verified against the corrected spec.md and still pass.
- **Post-plan-review correction (2026-07-12, round 2)**: A plan-level critique flagged that plan.md omitted `server/userHelpers.js` (the actual `req.user` population seam — GET/PUT `/api/user/profile` return `req.user.onboarding_status`, which stays `undefined` unless `USER_PROFILE_SELECT_COLUMNS` and `defaultUserProfile()` both gain the column too), that `useGameBoard.js` lives at `src/lib/` not `src/hooks/` and is a pure hook with no store access (so an "aha" callback into it was never viable as originally drafted), and that the end-of-game branch (`GameScreen.jsx`'s `onGameEnd`→`saveGame`→`goReplace('review', ...)`) was unconditional, including the resign path. Separately, the owner made a scope decision in response: **aha/coach-reaction detection is dropped entirely.** This is a spec-level change, not just a plan fix:
  - The four-value state model (`not_encountered` / `encountered_no_aha` / `aha_reached` / `skipped`) added in round 1 is replaced by a **three-value model** (`not_encountered` / `seen` / `skipped`). `seen` is set the first time the user plays a move of their own — a simple engagement signal, not a coach-reaction detector.
  - FR-005 was rewritten to describe the `seen` engagement signal instead of aha detection; FR-006 (the aha-triggered reward acknowledgment) was removed outright (no replacement — the mechanism it depended on no longer exists); FR-018 (the `encountered_no_aha` edge case) was deleted outright, since a game ending with zero moves played now simply leaves the status at `not_encountered` (re-eligible for onboarding, which is acceptable — see spec.md Edge Cases).
  - FR-007 (import offer placement) was rewritten per an additional owner decision: the offer is shown at the sparring game's natural end (covering the previously-unconditional-`review`-routing bug), OR, as a one-time fallback, on the user's next Home visit if they engaged (`seen`) but exited before the game ended — so the offer is never silently lost now that there's no finer-grained aha state to gate it on.
  - data-model.md, research.md, and the two contracts files were updated to match the three-state model throughout, and to document the userHelpers.js fix (research.md R10) and the corrected end-of-game/hook-location facts (research.md R5).
  - Content Quality / Requirement Completeness / Feature Readiness were re-checked against the round-2 spec.md and still pass — the three-state model is simpler and leaves no dangling four-state reference in any artifact (verified by grep across spec.md/plan.md/research.md/data-model.md/contracts/).
