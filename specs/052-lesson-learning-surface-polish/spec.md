# Feature Specification: Lesson Learning Surface & Authoring Polish

**Feature Branch**: `052-lesson-learning-surface-polish`
**Created**: 2026-07-30
**Status**: Draft
**Source epic**: `docs/epics/open-issues-epics.md` — "Epic 6 — Lesson Learning Surface & Authoring Polish"
**Input**: User description: "Create spec 052 for 'Lesson Learning Surface & Authoring Polish' (Epic 6 from docs/epics/open-issues-epics.md)." (full epic text supplied verbatim; see Settled Decisions, Non-Obvious Facts, Out of Scope, and Deferred sections below, which restate it without re-derivation)

**Intent** (from the epic, verbatim): Fix the one lesson behavior bug that makes the coach appear to stop reacting, settle where lesson content lives, and harden the authoring/verification tooling so the next content pass is machine-checked.

## OI-N Traceability

This spec closes out the following `docs/open_issues.md` entries (or explicitly defers them — see Deferred section). Per the Issue closeout convention in `docs/epics/open-issues-epics.md`, each entry must be updated in `docs/open_issues.md` in the same change that ships its fix: **RESOLVED** with a dated status and what shipped, or left open with a dated `UPDATE` naming exactly what remains.

| OI-N | One-line description | User story |
|---|---|---|
| OI-46 | Sticky `showHint` makes the Socratic `correct` message unreachable | US1 |
| OI-44 | `lesson.<id>.title` duplicates the lesson JSON's `title`; `socratic.goalPrompt` authored but unrendered | US2 |
| OI-63 | Six verifier/finder robustness gaps in the lesson content tooling | US3 |
| OI-68 | Window-highlight capsules tint the discs they cover — **removed from scope** by owner decision (overlays kept as-is, assuming slides have no overlapping overlays); closed in `docs/open_issues.md` as a recorded decision, not a code fix | US4 (closeout only, no code change — see Out of Scope) |
| OI-69 | Editor cosmetics + multi-board `aria-label` ambiguity | US4 |
| OI-19 | Remaining hardcoded English strings (e.g. `PlayOnlineScreen.jsx`) | US5 |
| OI-73 | `lesson.*` i18n namespace collision risk | US5 |
| OI-62 | Two knowledge-base content edits | US5 |
| OI-38 | KB `short_summary_es` coverage — **count corrected only; translation deferred to a standalone content spec** (see Deferred) | US5 (count correction only) |

This spec also **files three new** `docs/open_issues.md` entries rather than closing existing ones — tracked backlog, not resolved by this feature (see Deferred): **OI-83** (deferred lesson-editor puzzle-existence check), **OI-84** (US3's widened solver-optimal gate flags an already-shipped board for human review), and **OI-85** (unify the `find_lesson_boards.mjs` spec-matcher / production-detector split into one detector per concept).

Also folds in, as acceptance evidence for US2: two undated `[major]` copy findings from `agentic_QA_2026-07-25-0015.md` (no OI number) — the claimeven confirmation prompt says "secure a draw" on solver-**won** boards, and the undercut prompt names the column the grader rejects. Both are side effects of the `goalPrompt` wiring fix in US2, which also surfaces a third, previously-unnoticed issue folded into US2's own scope (not a new OI number): the `goalPrompt` override changes what's on screen but not what's spoken, so US2 must also silence the now-mismatched pre-generated audio clip (FR-029; see Settled Decisions item 8).

## Settled Decisions (non-negotiable — reflect verbatim, do not re-derive or relitigate)

These were resolved by the project owner before this spec was written. An implementation that contradicts any of them is a defect, not a design choice to revisit.

1. **Lesson content is a thing in itself and must not be assembled from i18n keys** (owner ruling, 2026-07-16, still binding). OI-44 is the remaining application of that rule.
2. `lesson.node.*` / `lesson.confirmation.*` i18n keys are **UI chrome**, not lesson content — they stay in i18n and are out of scope for migration.
3. Negative claims must be verified at source before acting on them. OI-44 asserted `goalPrompt` renders nowhere; this has been confirmed true at source (`ChallengeScreen.jsx:116-123` picks a random `coach.spoken.<category>.prompt.{0,1,2}`; the inline-challenge mapping omits `goalPrompt` entirely).
4. **`goalPrompt` is wired, not deleted** (resolved 2026-07-30 — overrides OI-44's own "wire or delete" framing and overrides `lesson-editor.md`'s current "to change a challenge prompt, edit i18n, not the lesson" guidance, which US2 must correct). `goalPrompt` becomes a **per-lesson override** of the shared `coach.spoken.<category>.prompt.*` text, falling back to the shared random prompt when `goalPrompt` is absent for a given lesson/locale. The shared copy must stay outcome-neutral (it also serves DB-drawn practice boards outside any lesson); the per-lesson override is where board-specific, outcome-correct copy belongs. This is the mechanism that fixes both undated `agentic_QA_2026-07-25-0015.md` `[major]` findings.
5. **Spec matchers must declare the production detector *and side* they validate against** (resolved 2026-07-30, applying the OI-74 shape). There is no epic-wide rule of "just validate against the production detector" — each matcher's declared detector-and-side is a per-matcher decision (see US3).
6. **Hint yields to phase** (OI-46, resolved 2026-07-30): `showHint` resets on every phase transition. Hint and phase messages must never coexist in the coach bubble — the 120px coach-bubble cap that applies on every screen would truncate exactly the reward text (the `correct` message) this story exists to restore.
7. **Lesson-editor puzzle-existence verification for confirmation categories is out of this spec's scope** (resolved 2026-07-30) — retargeted to a new `docs/open_issues.md` entry (see Deferred). It is an admin-only authoring gap with no learner-facing impact.
8. **A `goalPrompt` override is silent, not mis-spoken** (resolved 2026-07-30, closing an audio/text desync found in plan review). `ChallengeScreen.jsx`'s puzzle-init sets two refs from the same picked prompt key — `promptKeyRef.current` and `lastCoachKeyRef.current` — and a separate `useEffect` (keyed on `coachMessages.length`) calls `speakCoachMessage(lastCoachKeyRef.current)`. `speakCoachMessage` (`src/lib/useCoachSpeech.js`) is strictly key-based (`keyToSlug(key)` → manifest lookup → pre-generated mp3); it cannot speak arbitrary text. When a `goalPrompt` override supplies the on-screen text, the system MUST NOT let `speakCoachMessage` fire the old, now-mismatched `coach.spoken.<category>.prompt.N` clip — `lastCoachKeyRef.current` MUST be set to `null` (no clip spoken) rather than left pointing at the stale key. Generating a matching audio clip for override text is out of scope (Epic 5's audio-generation work); silence, not a mismatched clip, is the correct interim behavior. Recorded in `docs/architecture/lesson-editor.md` and in the OI-44 closeout note in `docs/open_issues.md`.

## Non-Obvious Facts (context carried from the epic — informs Edge Cases and Assumptions below)

- Re-measured 2026-07-30: **all 15** `connect-four/lessons/lesson-*.json` files carry `goalPrompt`, and **13 of 15** carry `goalPrompt_es` — OI-44's original counts ("9 of 13, English only") are stale and must be corrected wherever restated.
- The existing OI-43 "V7 Socratic" browser verification procedure is **deliberately split into two runs** (a hint-free run and a separate hint run) because a single linear pass that clicks Hint can never reach the `correct` state today. Do not collapse it back into one run — the split is what makes the hint-vs-phase bug (OI-46) observable at all.
- The lesson-board verification tooling's "spec matchers" (independent re-implementations of production pattern-detection logic, used to validate authored lesson boards) are known to diverge measurably from the production detectors they're meant to mirror — e.g. one matcher's taught column was solver-optimal in only half of a sampled candidate set. One matcher was already corrected to validate against the correct opposite-side production detector (per an earlier, precedent-setting fix, OI-74); the remaining matchers were not audited the same way. One of the remaining matchers depends on a production detector whose own soundness is being fixed concurrently in a separate, parallel workstream (OI-76) — this spec must not race that fix; see US3's per-matcher policy.
- An existing "remediation exemption list" in the strict lesson-content test suite is **inverted-risk**: it exempts nothing today, but would silently exempt any future lesson someone adds to the list without noticing the safety implication. It should become a structurally-empty exemption set (no lesson may ever be added to it), not merely an empty list today.
- House convention: every authoring/verification script must print a real `--help` (purpose + options + defaults) and exit 0, checked **before** any required-argument validation runs — so `--help` never fails on missing args. The primary lesson-board finder tool currently violates this.
- The lesson-content coach bubble has a hard visual cap (~205 characters / 5 rendered lines) on every screen; longer text clips silently and splitting a message across two bubbles makes the clipping worse, not better. This constrains any new or corrected `goalPrompt` copy written under US2.
- The lesson title currently has **three different call sites**, each with a **different fallback behavior** if the shared i18n key backing today's title is ever removed: one falls back to a blank title, the other two fall back to the lesson JSON's own `title` field. A migration that moves `title` into the lesson JSON as sole authority must update all three call sites' fallbacks consistently, or one learner-facing screen will regress to a blank title. (Re-verify current file/line locations before implementation — they drift between epic-writing time and implementation time.)
- An **existing DOM test encodes the exact sticky-hint behavior US1 removes**: `connect-four/tests/dom/SocraticNarration.dom.test.jsx`'s "run 2" case (currently ~lines 219-221) and its header comment (currently ~lines 10-14) are written *around* the OI-46 bug and call the unreachable reward message "a known, accepted" behavior; `SocraticScreen.jsx`'s in-source comment (currently ~lines 116-117) cites a prior spec's decision record ("sticky by design") that FR-001 overturns. This test must be rewritten as part of US1, not discovered later — per the project's "a wrong test is part of the bug" convention.
- `connect-four/package.json`'s `test:dom` and `test:fast` scripts are **hardcoded, space-separated file lists**, not directory globs — a new test file that isn't added to the relevant string literally never runs, and the corresponding success criterion (e.g. SC-001) would be vacuously satisfied. `test:dom` currently enumerates 10 files; `test:fast` contains zero `tests/dom/` entries at all (DOM/jsdom tests only run under `test:dom`).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Socratic hint no longer swallows the solved-it reward (Priority: P1)

A learner working through a Socratic (interactive drill) lesson slide clicks "Hint" because they're stuck, then plays the correct move. Today, the app silently keeps showing the hint text instead of the "you got it" reward message — the coach appears to have stopped reacting, even though the learner solved the puzzle. This is the single most visible behavior bug in the lesson surface and the epic's stated headline fix.

**Why this priority**: It's an active correctness bug in the core learning loop — every learner who ever clicks Hint and then solves the puzzle experiences a coach that looks broken. Fixing it is small, self-contained, and independently shippable.

**Independent Test**: A new automated DOM test (`npm run test:dom`) drives this exact sequence — click Hint, then play the taught correct column — and asserts the "correct" (solved-it) message renders in the coach bubble and is narrated, exactly as it would be for a learner who solved it without ever clicking Hint. A manual browser walkthrough (loading a real Socratic lesson slide) is supplementary evidence, not a substitute for the automated test. This can be verified end-to-end without touching any other story in this spec.

**Acceptance Scenarios**:

1. **Given** a learner is on a Socratic slide and has clicked Hint, **When** they play the correct column, **Then** the coach bubble shows and speaks the "correct" reward message (not the hint text).
2. **Given** a learner has clicked Hint and then plays an incorrect column, **When** the wrong-move feedback is shown, **Then** the hint text does not simultaneously linger in the bubble alongside it.
3. **Given** a learner solves the slide without ever clicking Hint, **When** they play the correct column, **Then** behavior is unchanged from today (regression guard).
4. **Given** a learner has reached the "correct" state, **When** they look at the Continue button, **Then** it is enabled/keyed off the same underlying phase it uses today (no regression to slide advancement).
5. **Given** the existing `tests/dom/SocraticNarration.dom.test.jsx` "run 2" case, which today encodes the sticky-hint behavior as expected, **When** this story ships, **Then** that case (and its header comment) asserts the new hint-yields-to-phase contract instead, and the file is registered in `npm run test:dom`'s file list alongside any newly-added test file.

---

### User Story 2 - Lesson content has one home, and per-lesson prompts actually reach the learner (Priority: P1)

Today, a lesson's displayed title lives in a shared translation file rather than in the lesson's own content file, which means editing a lesson's title requires touching a different system than editing the rest of its content — violating the standing rule that lesson content is authored and owned in one place. Separately, lesson authors can write a board-specific "goal prompt" for a Socratic exercise, but that authored text is never shown to the learner; instead, the learner always sees one of a small set of generic, shared prompts. In at least two shipped lessons, that generic prompt is actively misleading: it tells the learner to "secure a draw" on a board where the solver says the position is actually winning, and it names the very column the grader marks wrong as the one to play.

**Why this priority**: This is the epic's core "own the content" story. It fixes a standing architectural violation (title duplicated across two systems) and two real, misleading pieces of copy currently shown to real learners.

**Independent Test**: (a) Delete/rename the lesson's title source and confirm the title still renders correctly on every screen that shows it, sourced only from the lesson's own content file. (b) Open the two specific lessons named in the known findings (the claimeven lesson and the undercut lesson) and confirm the prompt shown to the learner now states the corrected, board-specific instruction rather than the generic one.

**Acceptance Scenarios**:

1. **Given** a lesson's title is authored only in its own content file (no separate translation-file entry), **When** the learner views that lesson from every screen that displays a lesson title, **Then** the correct title renders on all of them, with no screen falling back to a blank or mismatched title.
2. **Given** a lesson has an authored per-lesson prompt override for its Socratic exercise, **When** a learner reaches that exercise, **Then** they see the lesson's own override text (not the generic shared prompt).
3. **Given** a lesson has no authored per-lesson prompt override, **When** a learner reaches its Socratic exercise, **Then** they see the existing generic shared prompt, unchanged (fallback behavior preserved).
4. **Given** the claimeven lesson identified in the known findings, **When** a learner reaches its confirmation prompt on a solver-won board, **Then** the shown text no longer instructs them to "secure a draw."
5. **Given** the undercut lesson identified in the known findings, **When** a learner reaches its confirmation prompt, **Then** the shown text no longer names the column the grader rejects as the one to play.
6. **Given** the shared generic prompt pool, **When** it is used by a practice board drawn from outside any lesson, **Then** its wording remains outcome-neutral (unchanged by this work).
7. **Given** a lesson's `goalPrompt` override renders as the on-screen prompt text, **When** the coach-audio narration effect fires for that puzzle, **Then** no `coach.spoken.<category>.prompt.N` clip plays (silence, not the old mismatched clip) — verified with audio ON in a real, non-automated browser session (see quickstart.md; automation Chrome fakes autoplay and ships audio silent regardless, so this cannot be verified there).

---

### User Story 3 - Lesson-board verification tooling fails loudly and tells you what it's actually checking (Priority: P2)

The internal tools that verify authored lesson boards (confirming a taught pattern is really present, really the best move, and really matches what the app's live pattern detectors would recognize) have several robustness gaps: a malformed board input can crash a verification run instead of producing a clear failure row; the primary board-finder tool has no usable `--help`; and it's not documented, tool by tool, which specific production pattern-detector (and which side of the board) each verification check is actually validating against — which matters because for at least one pattern, the correct detector to validate against is the *opposite-side* one, not the naively-matching one.

**Why this priority**: This is infrastructure hardening for content quality, not a learner-facing bug — it protects the *next* content pass from silently shipping unverifiable or wrongly-verified boards, but nothing breaks for a learner if this story ships later than P1.

**Independent Test**: Run the verification tooling against a deliberately malformed input and confirm it reports a clear failure instead of crashing; run the board-finder tool with `--help` and confirm it prints usage and exits successfully without requiring any other arguments.

**Acceptance Scenarios**:

1. **Given** an invalid/malformed board input fed to the lesson-content verifier, **When** the verification run executes, **Then** it produces a clear failure result for that one input and continues, rather than crashing the entire run.
2. **Given** the primary lesson-board finder tool, **When** it is invoked with a help flag, **Then** it prints its purpose, options, and defaults and exits successfully — even with no other arguments supplied.
3. **Given** each verification check ("matcher") in the finder tool, **When** its documentation/comments are read, **Then** they state exactly which production pattern-detector, and which side of the board, that check validates against — including the one case where the correct detector is the opposite-side one, stated explicitly rather than left implicit.
4. **Given** a matcher whose correct production detector is itself under a soundness fix in a separate, concurrently-running workstream, **When** this story's tooling changes ship, **Then** that one matcher is either explicitly left pending that fix, or explicitly re-pointed at the detector's corrected version — recorded as a stated decision, not silently left inconsistent.
5. **Given** a matcher is tightened to require the taught column be the true best move, **When** an already-shipped lesson board fails that tightened check, **Then** the tooling flags it as a failure for a human decision — it does not automatically replace the board's content.
6. **Given** the strict lesson-content test suite's remediation-exemption mechanism, **When** it runs today, **Then** it exempts zero lessons, and the mechanism cannot silently grow to exempt a future lesson without that being a visible, reviewable change.

---

### User Story 4 - Editor cosmetics, and the capsule-tinting question is closed as a decision (Priority: P3)

There are a couple of small authoring-tool issues: a free-text authoring field ("infoProse") uses a font that doesn't match the rest of the editor, and screen readers announce which of several boards on one slide ambiguously. Separately, a related visual issue was raised as OI-68 — concept-slide "window highlight" capsules tint the game pieces they're drawn over — but the owner ruled this out of this feature's scope entirely: overlays are kept exactly as they render today, on the explicit assumption that authored slides do not have overlapping overlays. This is a recorded product decision, not a defect fix, and requires no rendering change; it still needs its `docs/open_issues.md` entry closed out with that rationale so the backlog reflects reality.

**Why this priority**: Editorial/cosmetic polish and a scope decision with no functional/correctness impact — appropriate to land last.

**Independent Test**: In the lesson-authoring tool, confirm the free-text prose field renders in the same font family as the rest of the editor (or the mismatch is documented as intentional); confirm `docs/open_issues.md`'s OI-68 entry is closed with a dated note recording the "overlays kept as-is" decision, not left open or marked as a code fix.

**Acceptance Scenarios**:

1. **Given** the lesson-authoring tool's free-text prose field, **When** an author types into it, **Then** it renders in the same font family as the rest of the editor (or the mismatch is explicitly documented as intentional).
2. **Given** the multi-board `aria-label` ambiguity, **When** no broader accessibility pass is separately commissioned as part of this feature, **Then** it is left unaddressed and the reason for doing so is recorded rather than silently dropped.
3. **Given** OI-68 (window-highlight capsules tinting the discs they cover), **When** this feature ships, **Then** `docs/open_issues.md`'s OI-68 entry is closed with a dated note stating the recorded decision — overlays are kept as-is because authored slides are assumed not to have overlapping overlays — and explicitly notes no rendering code changed.

---

### User Story 5 - Remaining hardcoded strings, a namespace safety net, and two KB fixes (Priority: P3)

A handful of user-facing strings elsewhere in the app (for example, on the "Play Online" screen) are still hardcoded in English instead of going through the translation system, so they never appear in Spanish. Separately, lesson content and UI-chrome translation keys currently share one flat namespace by convention only, with no guard preventing a future lesson id from accidentally colliding with a reserved key path. Two small, specific edits are also needed in the strategy knowledge base. A related, larger gap — most knowledge-base entries are missing their short Spanish summary — is explicitly **not** undertaken here (see Deferred); only its previously-stale count gets corrected.

**Why this priority**: Cleanup and safety-net items with narrow, independent blast radius; no dependency on the other stories.

**Independent Test**: Switch the app to Spanish and confirm the previously-hardcoded strings now render in Spanish; attempt to introduce a lesson id that collides with a reserved key path and confirm the guard catches it (e.g., as a failing check).

**Acceptance Scenarios**:

1. **Given** the app is set to Spanish, **When** a learner reaches a screen that previously showed a hardcoded English title, **Then** it now renders in Spanish.
2. **Given** a new lesson id is introduced that would collide with a reserved translation-key sub-path, **When** the safety check runs, **Then** it fails clearly rather than silently shipping a broken/shadowed key.
3. **Given** the two specified knowledge-base content edits, **When** they are made and the KB sync step is re-run, **Then** the change is reflected in both the source KB and its synced copy.
4. **Given** the previously-stale "KB entries missing a Spanish short summary" count, **When** it is corrected in this spec's tracking and in the open-issues log, **Then** it reflects the true current count, with the bulk-translation work itself explicitly deferred (not performed here).

---

### Edge Cases

- What happens if a learner clicks Hint, the phase changes away from the hint state, and then they navigate back (e.g., via back/forward) to a slide where hint was previously shown? The hint must not reappear stuck; it should follow the reset-on-phase-transition rule freshly for that visit.
- What happens when a lesson has a per-lesson prompt override (`goalPrompt`) for only one locale and not the other? The learner in the un-overridden locale must see the shared generic prompt for that locale, never a blank or English-only leak into a Spanish view.
- What happens when the lesson-board verification tooling encounters a matcher whose backing production detector is mid-fix in a concurrent, separate workstream? It must not silently produce a false pass or false fail attributable to that external change — the matcher's status must be an explicit, stated decision (deferred or re-pointed), not an accidental side effect.
- What happens to an already-shipped lesson board that fails a newly-tightened verification check? It must surface as a flagged failure for a human decision, never an automatic content rewrite.
- What happens when a title migration removes the old title source but a caller's fallback still points at it? That screen must not regress to showing a blank or stale title — every call site's fallback must be updated in the same change.
- What happens when Spanish text for a corrected prompt or a newly-localized string runs longer than the English original? It must still fit the existing coach-bubble/UI constraints, or the copy must be shortened to fit — never silently truncated.
- What happens to the coach's spoken narration when a `goalPrompt` override changes the on-screen prompt text but no matching audio clip has been generated for it? The system must go silent for that message (suppress the stale, now-mismatched pre-generated clip), never play audio whose words contradict what the learner just read on screen.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Socratic exercise state MUST reset any active "hint shown" state whenever the underlying exercise phase changes, so a hint can never persist into and visually block a later "correct" or "wrong" phase message.
- **FR-002**: After a learner clicks Hint and then plays the taught correct move, the system MUST display and narrate the same "correct" reward message a learner who never clicked Hint would receive.
- **FR-003**: `docs/architecture/lesson-editor.md` MUST document the hint-yields-to-phase decision (FR-001/FR-002), and `docs/open_issues.md`'s OI-46 entry MUST be closed referencing that documentation.
- **FR-004**: Every lesson's title MUST be sourced solely from that lesson's own content file at every screen that displays a lesson title; no lesson title may be sourced from, or require, a separate shared translation-key entry.
- **FR-005**: Every screen that displays a lesson title MUST have a defined, non-blank fallback behavior if the title field is briefly unavailable, and all such fallbacks MUST agree with each other (no screen may show a blank title while another shows a real one for the same lesson).
- **FR-006**: When a lesson defines a per-lesson override prompt for a Socratic/confirmation exercise (in the learner's current locale, or falling back to English per existing localization rules), the system MUST display that override to the learner instead of the shared generic prompt.
- **FR-007**: When a lesson does NOT define a per-lesson override prompt, the system MUST continue to display the existing shared generic prompt, unchanged.
- **FR-008**: The shared generic prompt pool MUST remain outcome-neutral (must not assert a board-specific verdict), since it is also served to practice boards outside any lesson.
- **FR-009**: The claimeven lesson's confirmation prompt MUST NOT instruct the learner to "secure a draw" on a board the solver evaluates as won.
- **FR-010**: The undercut lesson's confirmation prompt MUST NOT name, as the column to play, the column the grader marks incorrect.
- **FR-011**: The superseded `lesson.<id>.title` i18n keys MUST be removed from both locale files once the title migration (FR-004) ships, and the existing i18n key-parity check MUST continue to pass afterward.
- **FR-012**: `docs/architecture/lesson-editor.md`'s "to change a challenge prompt, edit i18n, not the lesson" paragraph AND its §"Confirmation Challenges" stale "that is Epic 6 scope" pointer MUST both be corrected in the same change — the former to reflect FR-006 (`goalPrompt` is a per-lesson override edited in the lesson JSON, not i18n), the latter to point at the new open-issue entry filed under FR-020 instead of claiming this feature covers it.
- **FR-013**: The lesson-content verification tool MUST report a clear, isolated failure for any single malformed/invalid board input, and MUST continue processing the remainder of a verification run rather than terminating on that input.
- **FR-014**: The lesson-board finder tool MUST support a help invocation that prints its purpose, its options, and their defaults, and MUST exit successfully without requiring any other argument to be supplied.
- **FR-015**: Each verification check ("matcher") in the lesson-board finder tool MUST have a documented statement of which production pattern-detector, and which side of the board, it validates against.
- **FR-016**: Where a verification check's correct production detector is itself being changed by a separate, concurrently-running workstream, this feature MUST record an explicit decision for that check (deferred pending the other workstream, or re-pointed at its result) rather than leaving an implicit, undocumented dependency.
- **FR-017**: When a verification check is tightened to require the taught pattern's column be the true best move and an already-shipped lesson board fails that check, the tooling MUST flag it for human review and MUST NOT automatically replace or rewrite the board.
- **FR-018**: The lesson-content test suite's remediation-exemption mechanism MUST exempt zero lessons, in a form that cannot silently accept new exemptions without a reviewable, visible change. Settled 2026-07-30: this is satisfied by **deleting the `REMEDIATED` set and its three `if (!REMEDIATED.has(...)) continue;` guards entirely** (`tests/unit/lessonContent.test.js`) rather than keeping a permanently-empty named constant — confirmed behavior-neutral today since the set already lists all 15 lesson ids, and deletion is the only form that makes a future exemption impossible rather than merely discouraged.
- **FR-019**: Each authored window/overlay used by the lesson-board verification tooling MUST support a per-overlay `_overlayIntent` annotation that overrides the existing slide-level `_overlayIntent` default (settled 2026-07-30: slide-level stays as the inherited default — backward compatible with the 6 existing usages across 5 lesson files, `lesson-01`, `lesson-02`, `lesson-07`, `lesson-08` ×4, `lesson-09` — a narrower per-overlay value overrides it where present), and the static scan used to catch stray/dead content MUST be extended to also cover i18n lesson-title keys.
- **FR-020**: A new `docs/open_issues.md` entry MUST be filed for the deferred lesson-editor puzzle-existence check (confirming, at authoring time, that puzzles exist for a chosen confirmation category), recording it as admin-only authoring-tool scope explicitly deferred out of this feature.
- **FR-021**: The lesson-authoring tool's `infoProse` free-text field MUST render in the same font family as the rest of the editor, or the mismatch MUST be explicitly documented as intentional.
- **FR-022**: If the multi-board `aria-label` ambiguity is left unaddressed (no broader accessibility pass commissioned as part of this feature), the reason for leaving it unaddressed MUST be recorded rather than silently dropped.
- **FR-023**: `docs/open_issues.md`'s OI-68 entry MUST be closed with a dated note recording the decision that window-highlight capsules are kept as-is (overlays are not changed), on the stated assumption that authored slides do not have overlapping overlays — closed as a recorded decision, explicitly not as a code fix.
- **FR-024**: All identified remaining hardcoded English user-facing strings MUST be made translatable and MUST render correctly in Spanish when the app locale is set to Spanish.
- **FR-025**: The system MUST prevent (via an automated check) a lesson id from colliding with a reserved lesson-related translation-key sub-path.
- **FR-026**: The two specified knowledge-base content edits MUST be made in the knowledge-base source and reflected in its synced copy after the existing sync step is re-run.
- **FR-027**: The previously-stale count of knowledge-base entries missing a Spanish short summary MUST be corrected wherever it is currently stated (in this feature's own tracking and in the open-issues log) to **47 entries, 4 with `short_summary_es`, 43 missing** (excluding `README.md` and `_sketches.md`, which are not entries), without performing the bulk translation itself.
- **FR-028**: For every open-issue entry this feature covers, `docs/open_issues.md` MUST be updated in the same change that ships the corresponding fix — marked resolved with what shipped and where, or left open with a dated note of exactly what remains — per the project's existing issue-closeout convention.
- **FR-029**: When a `goalPrompt` override determines the on-screen confirmation-prompt text (FR-006), the system MUST NOT play the pre-generated `coach.spoken.<category>.prompt.N` audio clip associated with the generic prompt it replaced — no clip plays for that message until Epic 5 synthesizes matching audio for the override text. This applies to `ChallengeScreen.jsx`'s `lastCoachKeyRef`, which drives `speakCoachMessage`.
- **FR-030**: `tests/dom/SocraticNarration.dom.test.jsx`'s existing "run 2" case and header comment, which currently encode the sticky-hint premise FR-001 removes, MUST be rewritten to assert the new hint-yields-to-phase contract instead; `SocraticScreen.jsx`'s in-source comment describing hint as "sticky by design" MUST be corrected in the same change.
- **FR-031**: Every new or modified test file this feature adds MUST be registered in `connect-four/package.json`'s `test:dom` and/or `test:fast` script file lists (whichever suite it belongs to) in the same change that adds it — a test file omitted from both lists never executes and cannot be relied on as acceptance evidence for any success criterion.

### Key Entities

- **Lesson**: A single unit of learning content (its own JSON content file), containing slides, a Socratic exercise, optional confirmation challenges, a title, and localized (`_es`) sibling content including an optional per-lesson prompt override.
- **Socratic exercise phase**: The current state of an in-progress interactive drill within a lesson (e.g., asking, hint-shown, correct, incorrect) — governs which message the coach shows.
- **Prompt override (`goalPrompt`)**: Optional, per-lesson, per-locale authored text that supersedes the shared generic prompt pool for that lesson's confirmation/Socratic exercise.
- **Shared generic prompt pool**: A small, category-keyed set of outcome-neutral prompts used by default and by practice boards outside any lesson.
- **Verification matcher**: An automated check within the lesson-board tooling asserting that an authored board genuinely exhibits a named strategic pattern, cross-checked against the corresponding production pattern-detector.
- **Knowledge-base entry**: A single strategy concept's documented predicate, examples, and (optionally) localized short summary, in the project's strategy knowledge base.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new automated `npm run test:dom` test asserts that after a learner clicks Hint on a Socratic slide and then plays the taught correct move, the coach bubble both renders and narrates the "correct" reward message; this test passes in 100% of CI runs (currently: no such test exists, and the behavior it asserts fails 0% of the time today since the message is unreachable after a hint). A manual browser walkthrough is supplementary evidence, not a substitute for this automated test.
- **SC-002**: 100% of lesson titles render correctly across every screen that shows one, with zero blank or mismatched titles observed, after the title source is consolidated to the lesson's own content file.
- **SC-003**: The two known misleading confirmation-prompt findings (claimeven "secure a draw" on a won board; undercut naming the grader-rejected column) no longer reproduce in a live walkthrough of those two lessons.
- **SC-004**: A deliberately malformed input to the lesson-content verifier produces a reported failure row, not a crashed/incomplete run, in 100% of test attempts.
- **SC-005**: The lesson-board finder tool's help invocation succeeds (exit code indicating success, usage text printed) with no other arguments supplied, in 100% of test attempts.
- **SC-006**: Every verification matcher in the finder tool has a documented detector-and-side statement, verifiable by inspection, with zero matchers left undocumented.
- **SC-007**: `npm run test:fast` and `npm run test:dom` pass at 100%, and the existing full lesson-content audit (`audit_answer_ambiguity.mjs`, which audits every Socratic node plus every confirmation board — a distinct, larger count than the 15 lesson files) continues to pass **39/39**, after this feature ships.
- **SC-008**: Every open-issue entry in scope for this feature (OI-46, OI-44, OI-63, OI-69, OI-19, OI-73, OI-62) is marked resolved in the open-issues log with a dated closure note; OI-68 is also marked resolved, but specifically as a recorded decision (overlays kept as-is) with no code change; OI-38 is marked as deferred to a standalone follow-up spec, not as resolved.
- **SC-009**: Zero previously-hardcoded, identified English-only strings remain untranslated when the app is viewed in Spanish.

## Assumptions

- The existing localization mechanism (per-field `_es` sibling values with English fallback, and the app's existing locale-selection behavior) is reused as-is for the per-lesson prompt override and for any newly-translated strings; no new localization mechanism is introduced.
- The existing lesson-content authoring tool (the in-app lesson editor) remains the single place lesson content, including titles and prompt overrides, is authored; this feature updates what the learner-facing app reads, not the authoring UI's data model, except where a story explicitly names an authoring-tool change (font-family cosmetic, matcher documentation).
- "The correct production detector for a verification matcher" is decided per-matcher by inspecting existing project convention and any prior precedent for that same pattern, not invented fresh in this spec; where a precedent doesn't yet exist (a matcher whose detector is mid-fix elsewhere), this feature records an explicit decision rather than guessing at the other workstream's outcome.
- No new lesson is authored and no existing lesson is re-tiered (moved between free/paid, or reordered in the curriculum) as part of this feature. Where a verification tightening surfaces an existing board that no longer passes, the response is to flag it for a future, separate content-authoring pass — not to author a replacement board here.
- Audio generation/regeneration for any content touched by this feature is explicitly out of scope and is handled by a separate, already-scoped effort (Epic 5); if a prompt's text changes, any audio-content implications are left to that other effort. Concretely, when a `goalPrompt` override changes the on-screen text, this feature's fix is to go silent for that message (suppress the mismatched pre-generated clip via `lastCoachKeyRef.current = null`) rather than either speaking the wrong clip or pulling audio synthesis into this feature's scope (FR-029).
- The bulk translation of missing Spanish short-summaries in the knowledge base is out of scope for this feature and is expected to become its own follow-up feature; only the previously-incorrect count of how many entries are missing it is corrected here.
- A learner-facing accessibility (screen-reader) audit of the multi-board `aria-label` ambiguity is out of scope unless a broader accessibility pass is separately commissioned; if left unaddressed, the reason is recorded rather than silently dropped.
- Window-highlight capsule/disc-tinting (OI-68) is out of scope entirely by owner ruling: overlays are kept exactly as they render today, on the stated assumption that authored slides do not have overlapping overlays; this is a recorded decision, not deferred work awaiting a future spec.
- "Out of Scope" items below are drawn directly from the source epic's own `NOT included` section and are binding exclusions, not merely low priority.

## Out of Scope (binding — from the source epic's "NOT included")

- Generating or regenerating any lesson or coach audio (handled by a separate, already-scoped effort).
- Writing new lessons or re-tiering the curriculum. If a verification tightening causes an already-shipped board to fail, that board is flagged for a human content-authoring decision — it is not silently replaced as part of this feature.
- The knowledge-base window-count round-trip staleness issue (a previously recorded, accepted decision, not a defect) — documented only, not changed.
- Window-highlight capsule/disc-tinting fix and any browser re-check of authored capsules (OI-68) — owner ruling: overlays are kept as-is on the assumption that authored slides will not have overlapping overlays; closed in `docs/open_issues.md` as a recorded decision (FR-023), not implemented as a rendering change.
- Bulk translation of the 43 knowledge-base entries currently missing a Spanish short summary (see Deferred).
- The lesson editor verifying that puzzles exist for a chosen confirmation category before an author saves (see Deferred).

## Deferred (explicitly out of scope, with reason — tracked but not part of this spec)

- **Knowledge-base Spanish short-summary translation** (43 of 47 entries currently missing it — `docs/knowledge-base/` holds 49 `.md` files, but `README.md` (the index) and `_sketches.md` (scratch) are not entries, leaving 47; 4 entries — `allis-claimeven`, `community-double-threat`, `community-figure-7`, `community-immediate-threat` — already carry `short_summary_es`): split into its own standalone content spec. This is a bulk, reviewed-translation content effort with its own review standards (regional voseo, color-term conventions, no fabricated claims) and its own sync/verification path. Folding it into this already content-dense feature risks either bloating it past a reviewable size or having the translation work silently dropped. This feature only corrects the previously-stale count of how many entries are missing it.
- **Lesson-editor puzzle-existence check for confirmation categories**: declared out of this feature's scope by owner decision. It is an admin-only authoring-tool gap (an author could pick a confirmation category with no available puzzles and not find out until a learner hits it) with no direct learner-facing symptom addressed by this feature, so it does not compete with this feature's learner-facing priorities. It is retargeted to a new tracked open-issue entry, **OI-83** (FR-020); a stale documentation pointer that currently (incorrectly) claims this work happens in this feature is corrected under US3 (FR-012).
- **Lesson boards flagged by the widened solver-optimal gate (US3, T031/T032)**: when the tightened gate is applied to every matcher except the overcut pair, any already-shipped board it flags is not fixed here (FR-017) — the flagged list is filed as a new tracked open-issue entry, **OI-84**, for a future human-review/content pass.
- **Unifying the spec-matcher / production-detector split**: `find_lesson_boards.mjs`'s `SPECS` matchers are independent re-implementations of the `classifier.js` concepts they validate against, and are known to diverge from the production detectors (see Non-Obvious Facts). This spec deliberately hardens the matchers in place (documents detector-and-side, widens the solver-optimal gate) rather than unifying them — unification is out of scope here and is filed as a new tracked open-issue entry, **OI-85**, proposing a single detector per concept instead of a matcher/detector pair.

## Open Questions

None. The one previously-open sub-question — whether the outline-only capsule treatment applies to all 48 authored windows or only colour-critical ones — is moot: the owner removed the capsule-tinting fix from this feature's scope entirely (see Assumptions and Out of Scope). OI-68 is closed as a recorded "overlays kept as-is" decision (FR-023), not as an implemented fix.
