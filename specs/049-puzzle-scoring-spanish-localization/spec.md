# Feature Specification: Puzzle Scoring-by-Pattern & Spanish Localization

**Feature Branch**: `049-puzzle-scoring-spanish-localization`
**Created**: 2026-07-13
**Status**: Draft
**Input**: User description: Epic 9 — Puzzle Scoring-by-Pattern & Spanish Localization (from `polish_epic.md`, origin `docs/open_issues.md` OI-1 + OI-15)

**Origin note**: This feature bundles two independent halves into one speckit cycle purely to share pipeline
overhead (per `docs/best_practices_spec_driven_development.md` §"Epic Sizing" — combined task count lands in
the sweet spot). They share no code, no data, and no design decision:
- **Puzzle scoring** (User Stories 1–2 below, epic-numbered US9.1–US9.2): a learner-facing correctness bug for
  six puzzle categories.
- **Spanish localization** (User Stories 3–4 below, epic-numbered US9.3–US9.4): completing a translation that
  is 3-of-25 top-level sections done (`setcard`, `onboarding`, and a full `settings` section are complete; 22
  sections are missing).

Keep the two halves independent during planning and implementation; do not let one half's ambiguity block the
other.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Learner gets an accurate correct/wrong verdict on single-answer puzzles (Priority: P1)

A learner is solving a puzzle from one of six single-answer categories — `z_threat`, `overcut`, `claimeven`,
`undercut`, `figure_7`, `j_shape` — each of which teaches exactly one correct move (or, for `undercut`, teaches
to avoid exactly one column). Today the app judges the learner's move purely by whether it ties the best raw
solver score, not by whether it actually matches the taught pattern. This produces two observable defects:
1. A column that is **not** the taught pattern can be marked "correct" merely because it ties the top solver
   score with the taught column (a score-tie coincidence).
2. The taught column itself can be marked "Suboptimal" if some other column wins the game slightly faster,
   even though the taught column demonstrates the pattern being taught.

The learner needs the verdict to reflect whether they played the taught pattern, not an incidental score
comparison.

**Why this priority**: This is the core correctness defect (OI-1) — it actively teaches the wrong lesson to
users on two concrete, reproduced boards. It blocks trust in the puzzle feature for exactly the categories that
depend on a single canonical answer.

**Independent Test**: Can be fully tested by loading a known single-answer puzzle board, playing the taught
column and a non-taught column with an equal or higher raw solver score, and confirming the taught column
reads "correct" and the other reads "wrong" — independent of the localization work in User Stories 3–4.

**Acceptance Scenarios**:

1. **Given** a `z_threat` puzzle board where a non-taught column ties the maximum solver score with the taught
   column (repro board `3333302444422222060315555054`, column 0), **When** the learner plays the non-taught
   column, **Then** the verdict reads "wrong" (not "correct").
2. **Given** a `z_threat` puzzle board where the taught column wins slightly slower than another column (repro
   board `3333334512266550121166`, taught column 0), **When** the learner plays the taught column, **Then** the
   verdict reads "correct" (not "Suboptimal").
3. **Given** any of the other five single-answer categories (`overcut`, `claimeven`, `undercut`, `figure_7`,
   `j_shape`) with a known taught column and a known non-pattern column, **When** the learner plays the taught
   column, **Then** the verdict reads "correct"; **When** the learner plays the non-pattern column, **Then**
   the verdict reads "wrong".
4. **Given** an `undercut` puzzle (avoid-the-pattern category), **When** the learner plays the killing column
   (the one column the pattern says to avoid), **Then** the verdict reads "wrong", exactly as before this
   change.
5. **Given** any puzzle category outside the six single-answer categories (e.g. the existing multi-solution
   categories, or any other puzzle category), **When** the learner plays any column, **Then** the verdict and
   all other move-quality signals (badge, coaching message, etc.) are unaffected by this change.

---

### User Story 2 - Correct verdict drives every downstream signal on the Challenge screen (Priority: P1)

Once the verdict itself is fixed (User Story 1), every user-visible and analytics signal that currently derives
from the old (incorrect) verdict must derive from the new one consistently: success sound effects, coach mood/
reaction, whether the attempt counts as a correct first attempt, the win overlay, and analytics events. A
learner should never see a contradictory experience — e.g., a "wrong" sound effect while the on-screen badge
says "correct."

**Why this priority**: Fixing the verdict alone is not user-visible if the screen's derived signals still read
the old value; this story is what actually reaches the learner P1 outcome from User Story 1.

**Independent Test**: Can be tested by driving the Challenge screen through a full attempt on each of the two
OI-1 repro boards and confirming every downstream signal (sound, coach reaction, attempt recording, win
overlay) agrees with the corrected verdict, without needing the localization stories to be done.

**Acceptance Scenarios**:

1. **Given** the OI-1 repro board 1 (non-taught column ties top score), **When** the learner plays the
   non-taught column, **Then** the wrong-answer sound effect, coach reaction, and attempt-recording all agree
   the attempt was incorrect.
2. **Given** the OI-1 repro board 2 (taught column wins slower), **When** the learner plays the taught column,
   **Then** the correct-answer sound effect, coach reaction, win overlay, and attempt-recording all agree the
   attempt was correct — and the display does not show a "Suboptimal" label.
3. **Given** a hand-authored Socratic lesson (not a database puzzle with a category), **When** a learner
   answers it, **Then** its existing correctness check is unaffected by this feature (it has no puzzle category
   or stored pattern metadata to evaluate against).

---

### User Story 3 - Spanish-speaking learner sees the whole app in Spanish (Priority: P2)

A Spanish-speaking user has already been able to switch the app's language to Spanish (the switcher shipped in
a prior change). Today, doing so still shows mostly English, because only 3 of the app's 25 top-level content
sections have been translated; every other screen falls back to English. The user needs every screen — navigation,
puzzles, sparring, coach, account/upgrade, stats, error messages, lessons, onboarding, and more — to render in
correctly translated Spanish, with terminology (especially the two players' disc colors) accurate and
consistent, and with the coach's supportive tone preserved.

**Why this priority**: This is a large, valuable, but non-blocking content completion — the switcher already
works, so this is "finish the job," not "unblock a broken feature." It's independent of and lower urgency than
the puzzle-scoring correctness bug.

**Independent Test**: Can be tested by switching the app language to Spanish and manually walking through
representative screens (home, a puzzle/challenge, the coach, settings, onboarding), confirming no leftover
English text or untranslated raw keys appear.

**Acceptance Scenarios**:

1. **Given** the app language is set to Spanish, **When** a user visits any screen previously untranslated,
   **Then** all user-facing text on that screen appears in Spanish, matching the meaning and tone of the
   English original.
2. **Given** any text that refers to a player's disc color, **When** it renders in Spanish, **Then** it uses
   "verde"/"gris" (never "rojo"/"amarillo"), consistent with the app's actual on-screen disc colors.
3. **Given** any English text containing a dynamic value placeholder (e.g. a player name or a count), **When**
   it is translated, **Then** the Spanish text contains the equivalent placeholder in the same position/role,
   so the app still substitutes the value correctly at runtime.
4. **Given** the coach's Spanish messages, **When** a learner is in a losing position, **Then** the tone remains
   supportive and does not read as defeatist, consistent with the English coach voice.

---

### User Story 4 - Future translation drift is caught automatically (Priority: P3)

A maintainer adds a new piece of English UI copy in the future. Without a guard, it's easy to forget to add the
matching Spanish key, silently reintroducing the English-fallback problem this feature just fixed. The
maintainer needs an automated check that fails when the two language files' key sets diverge.

**Why this priority**: This is a regression guard, not new user-facing value — it protects the investment made
in User Story 3 but delivers no benefit on its own until User Story 3 is complete.

**Independent Test**: Can be tested by intentionally adding a key to only one of the two language files and
confirming the automated check fails; then removing the discrepancy and confirming it passes.

**Acceptance Scenarios**:

1. **Given** the English and Spanish translation files have identical nested key structures, **When** the
   automated check runs, **Then** it passes.
2. **Given** a key exists in the English file but not the Spanish file (or vice versa), **When** the automated
   check runs, **Then** it fails with a clear indication of which key(s) are missing from which file.
3. **Given** a key exists in both files with the same text value (e.g. a proper noun that doesn't need
   translation), **When** the automated check runs, **Then** it still passes — the check compares key
   presence, not text equality.
4. **Given** the project's two standard test suites (full and fast), **When** either is run, **Then** the new
   check is included in both, alongside the pre-existing correctness test from User Story 2 (which today is
   only included in one of the two).

### Edge Cases

- What happens when the client fails to send the puzzle's taught-pattern metadata to the correctness check
  (e.g. a stale or buggy client build)? The verdict for the affected single-answer categories should not
  silently default to "correct" — see Functional Requirements for the required failure behavior.
- What happens for a puzzle category that isn't one of the six single-answer categories and isn't one of the
  existing multi-solution categories (if one exists)? Its verdict behavior must remain exactly what it was
  before this feature.
- What happens on a puzzle board where the taught column and a non-pattern column both happen to win the game,
  but only one is the taught pattern? The verdict must follow pattern membership, not merely "does this move
  win."
- What happens on the `undercut` category (avoid-the-pattern) when the learner plays a column that is neither
  the killing column nor an unrelated column? The existing avoid-the-pattern behavior (unchanged by this
  feature) applies.
- What happens if a translated Spanish string is longer than its English counterpart and doesn't fit the UI
  layout? Out of scope for this feature (a visual/layout QA concern, not a translation-content concern) —
  flagged as an assumption below.

## Requirements *(mandatory)*

### Functional Requirements

**Puzzle scoring (User Stories 1–2)**

- **FR-001**: For each of the six single-answer puzzle categories (`z_threat`, `overcut`, `claimeven`,
  `undercut`, `figure_7`, `j_shape`), the system MUST judge a learner's played column as correct or incorrect
  by whether it matches the category's taught pattern, evaluated by running that category's existing pattern
  check against the resulting board position — not by comparing raw solver scores.
- **FR-002**: The system MUST NOT introduce new pattern semantics for any of the six categories: `undercut`
  remains an avoid-the-pattern category (correct = anything except the killing column); the other five remain
  single-taught-column categories.
- **FR-003**: The corrected pattern-membership verdict MUST be exposed as an additional signal alongside the
  existing move-quality signals (e.g. badge, quality label, coaching phrase) — the system MUST NOT change the
  meaning or values of those existing signals for any caller that doesn't consume the new verdict.
- **FR-004**: The corrected verdict MUST be computed at solve time (when the learner submits a move); the
  system MUST NOT require a schema change or persisted backfill of previously stored puzzles.
- **FR-005**: The correctness check for the six single-answer categories MUST evaluate against the puzzle's
  actual stored taught-pattern data (the canonical answer / pattern location the puzzle was authored with) —
  the system MUST NOT substitute a freshly recomputed pattern detection in place of the stored answer.
- **FR-006**: The mechanism used to deliver the six categories' taught-pattern data to the correctness check
  MUST be the same one already used by the existing pattern-membership check for the other (multi-solution)
  puzzle categories, so there is exactly one way pattern data reaches the correctness check across all
  categories, not two divergent ones. As part of this convergence, the system MUST also fix the inline
  evaluation handler's category-validation bug (`server/index.js:1779`, currently
  `VALID_CATEGORIES.includes(category)` called on `VALID_CATEGORIES`, which is a `Set` — not an array — at
  `server/categories.js:3`, so `.includes` is not a valid method and every `/api/evaluate-move/inline` request
  currently throws a `TypeError` and returns a 500); the fix MUST use `VALID_CATEGORIES.has(category)`. This is
  in scope as part of unifying the two handlers, not deferred.
- **FR-007**: The system MUST fail closed for the six single-answer categories: a client that fails to supply
  the required taught-pattern metadata MUST yield a not-accepted ("wrong") verdict, and the system MUST NOT
  default to "correct" in that situation. This is a fail-closed default, not a hard error/400 response — it
  matches the existing behavior of every single-answer evaluator in `server/predicates.js`, which already
  returns `{ result: 'wrong' }` when metadata is absent.
- **FR-008**: The six single-answer categories MUST be identified through a single, explicit, shared list (not
  inferred as "every category that isn't a multi-solution category"), consistently applied everywhere
  correctness is judged for these categories.
- **FR-009**: Every user-visible or recorded signal that depends on whether the learner's move was correct
  (success/failure feedback, coach reaction, whether the attempt counts toward first-attempt-correct tracking,
  the win/completion presentation, and any recorded analytics) MUST derive from the corrected verdict for the
  six single-answer categories, so no signal contradicts another on the same attempt.
- **FR-010**: A move that matches the taught pattern but is not the fastest-winning column MUST NOT be
  displayed as "Suboptimal" or any other below-"correct" label.
- **FR-011**: Puzzle categories other than the six single-answer categories (including the existing
  multi-solution categories and any hand-authored, non-database lesson content that has its own correctness
  check) MUST be unaffected by this feature — their existing correctness behavior is unchanged.
- **FR-012**: The system MUST provide automated regression coverage proving, for each of the six categories,
  that the taught column reads correct and at least one non-pattern column reads incorrect, using real puzzle
  boards (not synthetically hand-constructed ones), verified through the same correctness check used in
  production.

**Spanish localization (User Stories 3–4)**

- **FR-013**: The system MUST provide a Spanish translation achieving full nested key-parity with the English
  translation file — every top-level section and every nested key within it that currently exists only in
  English — so that switching the app's language to Spanish results in no section, and no individual key
  within a section, falling back to English. The FR-019 key-parity check is the sole source of truth for
  completeness; no fixed section count is normative.
- **FR-014**: Every Spanish translation MUST preserve the structural role of any dynamic value placeholder
  present in the corresponding English text, so runtime value substitution continues to work correctly.
- **FR-015**: Every Spanish translation referring to a player's disc MUST use the Spanish terms for "green" and
  "gray" (verde/gris) and MUST NOT use the terms for "red" or "yellow" (rojo/amarillo).
- **FR-016**: Spanish coach-voice translations MUST preserve the same supportive, non-defeatist tone as their
  English originals, including in losing-position content.
- **FR-017**: This feature MUST NOT modify the existing language-switching mechanism (language selection UI,
  storage of the selected language, or resource-loading wiring) — it is limited to translation content.
- **FR-018**: The English translation file MUST remain the source of truth and fallback language; this feature
  MUST NOT remove or de-register English.
- **FR-019**: The system MUST provide an automated check that fails whenever the English and Spanish
  translation files' key structures diverge (a key present in one file and absent in the other), comparing key
  presence rather than text content.
- **FR-020**: The automated key-parity check MUST be included in both of the project's standard test suites
  (the full suite and the fast/default suite).
- **FR-021**: The existing automated test that currently verifies puzzle-correctness verdicts for the
  multi-solution categories MUST also be included in both of the project's standard test suites (it is
  currently present in only one).

### Key Entities

- **Puzzle attempt verdict**: The correct/incorrect determination for a single learner move on a single-answer
  puzzle category, now derived from taught-pattern membership rather than solver-score comparison. Additive to
  existing move-quality signals (badge/quality/coaching phrase), not a replacement.
- **Taught-pattern metadata**: The puzzle's stored canonical answer/pattern data (e.g. which column or cells
  demonstrate the pattern) that the correctness check evaluates a played move against. Read from the puzzle's
  existing stored data, not recomputed.
- **Single-answer category set**: The explicit grouping of the six categories (`z_threat`, `overcut`,
  `claimeven`, `undercut`, `figure_7`, `j_shape`) that this feature judges by pattern membership, as distinct
  from the pre-existing multi-solution category grouping.
- **Translation key**: A single piece of user-facing text identified by a structured key path (e.g.
  `section.subsection.label`), present in both the English and Spanish translation files after this feature.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On both previously-identified reproduction boards, and for representative boards from each of the
  other five single-answer categories, the puzzle verdict matches taught-pattern membership 100% of the time
  (taught column always reads correct; a known non-pattern column always reads wrong).
- **SC-002**: Zero user-visible signals (sound, coach reaction, badge/label, win overlay) disagree with the
  puzzle verdict on any single attempt, across all six single-answer categories.
- **SC-003**: The Spanish translation file achieves full nested key-parity with the English translation file (as
  verified by the FR-019 parity test, the sole source of truth for completeness — not a fixed section count),
  such that every section and every key renders with no English fallback text and no raw (untranslated) key
  names when the app language is set to Spanish.
- **SC-004**: A deliberately introduced mismatch between the English and Spanish translation files' key sets is
  caught by the automated test suite (both the full and fast runs) on the very next test run, with zero manual
  steps.
- **SC-005**: Existing behavior for every puzzle category and lesson type not covered by this feature shows
  zero regressions (verified by the project's existing automated test coverage continuing to pass unchanged).

## Assumptions

- "The taught pattern" for each single-answer category means the pattern the puzzle was originally authored
  and stored to teach, not a freshly recomputed detection — consistent with the epic's resolved "read stored
  metadata, don't recompute" decision.
- The party responsible for supplying a puzzle's taught-pattern data to the correctness check is trusted to
  supply it accurately; verifying that the supplied data hasn't been tampered with is explicitly out of scope
  for this feature (an accepted trade-off carried over from the precedent this feature extends).
- Layout/visual overflow from longer Spanish strings is a separate visual-QA concern, not addressed by this
  feature's acceptance criteria; the translation content itself is in scope, pixel-level layout fit is not.
- "Both of the project's standard test suites" refers to the project's existing full-run and fast/default test
  configurations; this feature does not introduce a third test configuration.
- The existing hand-authored Socratic lesson correctness check (which has no puzzle category or stored pattern
  metadata to evaluate against) is out of scope and explicitly unaffected by this feature.
- This feature depends on the language-switching mechanism already being in place and working (a prior,
  already-shipped change); it does not re-verify or modify that mechanism beyond confirming translated content
  renders correctly through it.

## Out of Scope

- The three existing multi-solution puzzle categories and their correctness handling (already correct;
  untouched by this feature).
- The hand-authored Socratic lesson correctness check (confirmed non-applicable — no puzzle category or stored
  pattern metadata exists for it to evaluate against).
- Verifying that client-supplied taught-pattern data is authentic/untampered (accepted trade-off, not
  addressed).
- Recomputing a puzzle's taught pattern via a fresh detection pass instead of reading its stored answer
  (explicitly rejected approach).
- Any change to the language-switcher mechanism itself (selection UI, persistence, resource loading) — already
  shipped and out of scope here.
- Re-auditing or backfilling previously stored puzzle data for this scoring change (solve-time evaluation
  only).
- Removing, de-registering, or demoting English as the source/fallback language.
