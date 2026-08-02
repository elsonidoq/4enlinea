# Implementation Plan: Lesson Learning Surface & Authoring Polish

**Branch**: `worktree-epic-5-audio-verification-tts` | **Date**: 2026-07-30 | **Spec**: `specs/052-lesson-learning-surface-polish/spec.md`
**Input**: Feature specification from `/specs/052-lesson-learning-surface-polish/spec.md`
**Source epic**: `docs/epics/open-issues-epics.md` — "Epic 6 — Lesson Learning Surface & Authoring Polish"

## Summary

Fix the Socratic hint/phase interaction bug that makes the coach appear to stop reacting after a
learner clicks Hint (US1) — including rewriting the existing `SocraticNarration.dom.test.jsx` case
that currently encodes the sticky-hint behavior being removed; consolidate lesson titles into the
lesson JSON as sole authority and wire the already-authored `goalPrompt` field as a per-lesson
override of the shared confirmation-prompt pool, fixing two shipped misleading prompts (US2) — and,
because `ChallengeScreen.jsx` sets *two* refs (`promptKeyRef` and `lastCoachKeyRef`) from the same
picked prompt key at puzzle-init, explicitly silencing `lastCoachKeyRef`-driven narration
(`speakCoachMessage`) so an override never plays the old, now-mismatched `coach.spoken.*` audio clip
while the corrected text is on screen; harden the lesson-board verification/finder tooling so it
fails loudly, documents which production detector each check validates against, and deletes the
`REMEDIATED` exemption mechanism entirely rather than exempting future lessons from strict checks
(US3); apply two small editor cosmetic fixes and close out the OI-68 capsule-tinting question as a
recorded non-fix decision (US4); and close the remaining hardcoded-English gaps, add an i18n
namespace-collision guard, make two knowledge-base content edits, and correct a stale KB coverage
count (US5). Every new/modified test file is registered in `package.json`'s hardcoded `test:dom`/
`test:fast` file lists in the same change that adds it — neither script globs a directory, so an
unregistered file silently never runs. Every `docs/open_issues.md` entry this spec closes is updated
in the same change that ships its fix, per the project's mandatory issue-closeout convention.

Technically this is **five independent, additive changes to already-existing surfaces** — no new
database tables, no new API endpoints, no new response fields (the two lesson-JSON fields this spec
newly *renders*, `title` and `confirmationChallenges[].goalPrompt`, are already served by the
existing `GET /api/lessons/:id` payload). The work is client-side React logic, two Node scripts, test
files, i18n JSON, and markdown documentation.

## Technical Context

**Language/Version**: JavaScript (Node.js, ES modules) server-side; React 18 (JSX, Vite) client-side.
**Primary Dependencies**: Express (server), React + react-router-dom (client), `node:test` +
React Testing Library (tests), no new dependencies introduced.
**Storage**: Lesson content is flat-file JSON (`connect-four/lessons/lesson-NN-slug.json`), loaded
and cached in-memory by `server/lessonLoader.js`. No Supabase/Postgres schema touched by this spec.
**Testing**: `node --test` via `npm run test:fast` (unit + lesson-content gates) and `npm run
test:dom` (React Testing Library/jsdom) inside `connect-four/`. `npm test` (full suite, includes
`candidate-generator.test.js`) is NOT used for this spec's regression gate — see
`docs/architecture/testing-conventions.md` and `CLAUDE.md` §Running tests.
**Target Platform**: Existing web app (Vite dev server + Express API), local dev only for this
spec's verification — no deployment changes.
**Project Type**: Web application (existing `connect-four/` monorepo: `src/` frontend, `server/`
backend, `lessons/` content, `tests/` — Option 2 shape below, already established).
**Performance Goals**: N/A — no new latency-sensitive path. The Socratic phase-reset effect and the
goalPrompt override are synchronous, in-memory reads with no added network calls.
**Constraints**: 120px/~205-character coach-bubble cap applies to any `goalPrompt` copy this spec
surfaces (unchanged copy, already authored under that constraint — see
`docs/architecture/lesson-editor.md` §"Text length limits"). Must not race Epic 2's concurrent OI-76
fix (`detectOvercut` perspective) — the overcut matchers in US3 are explicitly deferred/documented,
not re-pointed, until that lane ships. Generating audio for `goalPrompt` override text is explicitly
out of scope (Epic 5's audio-generation work) — the override's narration constraint is therefore to
go **silent**, not mis-speak: `ChallengeScreen.jsx`'s `lastCoachKeyRef` (which drives
`speakCoachMessage`, a strictly key-based mp3 lookup with no text-to-speech fallback) must be set to
`null` when a `goalPrompt` override renders, per FR-029. See `data-model.md` §"Entity: Coach-speech
ref pair" for the full ref-pair shape.
**Scale/Scope**: 15 lesson JSON files, 3 title call sites, 1 prompt-selection call site, 2 verification
scripts, ~7 `docs/open_issues.md` entries to close plus 3 new entries (OI-107 deferred lesson-editor
puzzle-existence check, OI-108 T031's flagged-board human-review backlog, OI-109 the spec-matcher/
production-detector unification refactor), 2 KB entries, an unknown-but-
bounded number of hardcoded-English JSX literals (US5 starts with an inventory grep, not a
pre-enumerated list).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Explanation Engine as Single Source of Truth** — N/A. This spec touches lesson-content
  presentation and authoring tooling, not move evaluation/explanation generation. `PASS`.
- **II. Code Quality & Simplicity** — The `showHint` reset is a one-line `useEffect`; the
  `goalPrompt` override is an `if (goalPrompt) ... else <existing pool logic>` branch at the
  display-text call site, plus a one-line `lastCoachKeyRef.current = null` in that same branch to
  silence narration (FR-029) — not a rewrite of either the pool mechanism or `speakCoachMessage`.
  The `REMEDIATED`-gate removal in US3 *reduces* code (deletes a set and its guards) rather
  than adding an abstraction. `PASS`.
- **III. Testing Standards** — US1 and US2 add DOM/unit tests exercising real component behavior
  (not solver-dependent, so the "real solver, no mocks" clause doesn't apply here); US1 also rewrites
  the existing `SocraticNarration.dom.test.jsx` case that currently encodes the sticky-hint bug as
  expected behavior, rather than leaving a test asserting the old, now-wrong contract (FR-030); every
  new/modified test file is registered in `package.json`'s `test:dom`/`test:fast` lists in the same
  change (FR-031), since an unregistered file would otherwise pass silently by never running; US3's
  tooling changes are verified against the real solver via `verify_lesson_content.mjs`/
  `find_lesson_boards.mjs --check` on real boards, per the constitution's "no mocked solver" spirit.
  `PASS`.
- **IV. UX Consistency & Progressive Disclosure** — The `goalPrompt` override changes *which* text
  renders in an already-existing prompt slot; it does not add a new disclosure level or change the
  progressive-disclosure model. `PASS`.
- **V. Performance Requirements** — No new network round-trip; `goalPrompt` is already in the
  payload the client holds. `PASS`.
- **VI. Implementation & Debugging Methodology** — This plan is built from concrete reproductions:
  the actual current `SocraticScreen.jsx`/`ChallengeScreen.jsx` source, the actual QA repro
  movestrings, the actual `SPECS` object in `find_lesson_boards.mjs`. See `research.md` for the
  verified-at-source citations. `PASS`.
- **VII. Software Design Philosophy** — The title-consolidation fix removes a two-homed-data
  violation (i18n key duplicating JSON field) — "there should be one obvious way to do it." `PASS`.
- **VIII. Documentation as First-Class Deliverable**:
  - [x] Existing architecture docs read before this plan was drafted: `docs/architecture/
    lesson-editor.md`, `frontend-conventions.md`, `server-conventions.md` (Answer sets /
    Undercut-has-two-sides sections), `testing-conventions.md` (Lesson content gates, i18n
    key-parity guard), `docs/knowledge-base/README.md`, plus every relevant `docs/open_issues.md`
    entry (OI-46, OI-44, OI-63, OI-69, OI-73, OI-19, OI-62, OI-68, OI-74, OI-76, OI-38).
  - [x] No undocumented conventions were discovered during this review that block planning — the
    one genuine gap found (`socratic.goalPrompt` has no wireable consumer, unlike
    `confirmationChallenges[].goalPrompt`) is documented in `research.md` and will be written into
    `lesson-editor.md`'s "Fields the learner UI ignores" table as part of US2's tasks.
  - [x] `tasks.md` (next phase) will include explicit documentation tasks for: the hint-yields-to-
    phase decision (FR-003, into `lesson-editor.md`) plus correcting `SocraticScreen.jsx`'s
    "sticky by design" in-source comment to cite FR-001 instead of the superseded prior-spec
    decision (FR-030); the title/goalPrompt correction to `lesson-editor.md`'s "Curriculum ordering"
    and prompt-editing paragraphs (FR-012); the "override prompts are silent until Epic 5
    synthesizes them" decision (FR-029) into both `lesson-editor.md` and the OI-44 closeout note in
    `docs/open_issues.md`; the per-matcher detector-and-side comments (FR-015, in-code); the
    `_overlayIntent` per-overlay schema change (settled: slide-level inherits, per-overlay
    overrides — into `lesson-editor.md`'s "Window highlights" section); the `REMEDIATED`-set
    deletion and its header-comment rewrite (settled, US3); and every `docs/open_issues.md`
    closeout write.

No violations requiring the Complexity Tracking table.

## Project Structure

### Documentation (this feature)

```text
specs/052-lesson-learning-surface-polish/
├── plan.md              # This file
├── research.md           # Phase 0 output
├── data-model.md          # Phase 1 output
├── quickstart.md          # Phase 1 output
└── tasks.md              # Phase 2 output (/speckit-tasks — not created by this command)
```

No `contracts/` directory: this spec adds no new API endpoints, no new request/response shapes, and
no new external interface. The two lesson-JSON fields it newly *renders* client-side (`title`,
`confirmationChallenges[].goalPrompt`) are already present in the existing `GET /api/lessons/:id`
response shape — see `data-model.md` for the client-side object-shape changes: one added field
(`goal_prompt`) on an in-memory puzzle object, and one changed write (`lastCoachKeyRef.current =
null`) on the pre-existing coach-speech ref pair `promptKeyRef`/`lastCoachKeyRef` — neither is a wire
contract.

### Source Code (repository root)

Existing web-application layout (`connect-four/`), unchanged by this spec — no new top-level
directories:

```text
connect-four/
├── package.json                      # US1/US2/US3/US5: register every new/modified test file in
│                                      # test:dom (DOM/jsdom) or test:fast (node --test) — both are
│                                      # hardcoded file-name lists, not directory globs (FR-031)
├── src/
│   ├── screens/
│   │   ├── SocraticScreen.jsx        # US1: showHint reset effect; correct the "sticky by design"
│   │   │                              # in-source comment (FR-030)
│   │   ├── ChallengeScreen.jsx       # US2: goalPrompt override at the display-text call site, plus
│   │   │                              # lastCoachKeyRef.current = null in the same branch (FR-029);
│   │   │                              # inline-challenge mapping threads goal_prompt through
│   │   ├── ConceptScreen.jsx         # US2: title fallback
│   │   ├── SagaScreen.jsx            # US2: title fallback
│   │   └── PlayOnlineScreen.jsx      # US5: hardcoded "Play Online" title
│   ├── lib/
│   │   └── useCoachSpeech.js         # US2 (read + reference only): speakCoachMessage is the
│   │                                  # strictly key-based mp3 lookup that FR-029 must not call with
│   │                                  # a stale key; no change to this file itself is expected
│   ├── components/admin/
│   │   └── SlideEditor.jsx           # US4: infoProse font-family
│   └── i18n/
│       ├── en.json                   # US2 (remove lesson.<id>.title), US5 (add keys)
│       └── es.json                   # same
├── server/
│   ├── lessonLoader.js               # read-only for this spec (localizeLesson already handles
│   │                                  # goalPrompt/title correctly server-side — no change expected,
│   │                                  # confirm during implementation rather than assumed)
│   └── scripts/
│       ├── verify_lesson_content.mjs # US3: try/catch around solver.query
│       └── find_lesson_boards.mjs    # US3: --help, per-matcher doc comments, REMEDIATED-equivalent
├── lessons/
│   └── lesson-*.json                 # US2 (goalPrompt already authored, no content edit expected
│                                      # unless the answer-set/solver-optimal re-checks in US3 flag one)
├── tests/
│   ├── dom/
│   │   ├── SocraticHintPhase.dom.test.jsx     # US1: new hint/phase test — must be added to
│   │   │                                       # package.json's test:dom list (FR-031)
│   │   ├── SocraticNarration.dom.test.jsx     # US1: rewrite "run 2" + header comment away from the
│   │   │                                       # sticky-hint premise (FR-030); already registered
│   │   └── ChallengeScreen*.dom.test.jsx      # US2: goalPrompt override text + FR-029's
│   │                                           # no-mismatched-clip assertion — new or extended file,
│   │                                           # must be in test:dom if new
│   ├── unit/
│   │   ├── lessonContent.test.js     # US3: REMEDIATED set + its 3 guards deleted entirely,
│   │   │                              # header comment rewritten; i18n-title static scan added
│   │   └── i18nKeyParity.test.js     # US5: lesson-id namespace-collision guard (or a sibling file)
│   └── lessons/                      # unaffected unless a US3 re-check flags a board (out of scope
│                                      # to fix per epic — flag only)
docs/
├── architecture/
│   └── lesson-editor.md              # US1/US2/US3/US4 documentation updates (FR-003/012/019)
├── knowledge-base/
│   ├── allen-j-configuration.md      # US5: OI-62 edit 1
│   └── community-figure-7.md         # US5: OI-62 edit 2
└── open_issues.md                    # every story: closeout writes
```

**Structure Decision**: No structural change. This spec edits existing files in their established
locations across `connect-four/src/`, `connect-four/server/`, `connect-four/lessons/`,
`connect-four/tests/`, and `docs/`. The genuinely new files expected are DOM test files under
`tests/dom/` (exact names/locations TBD in tasks.md, following the existing `*.dom.test.jsx`
convention) — at minimum one for US1's hint/phase behavior and, if not folded into an existing
`ChallengeScreen` test file, one for US2's `goalPrompt` override and its FR-029 no-mismatched-clip
assertion. Every such new file MUST be added to `package.json`'s `test:dom` list in the same change
(FR-031) — this is now called out explicitly in the source tree above rather than left implicit.

## Complexity Tracking

*No Constitution Check violations — table intentionally empty.*
