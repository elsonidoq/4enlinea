# Implementation Plan: Global UI/UX & Accessibility Polish

**Branch**: `feature/polish` | **Date**: 2026-07-10 | **Spec**: `specs/043-global-ui-ux-polish/spec.md`
**Input**: Feature specification from `/specs/043-global-ui-ux-polish/spec.md` (Epic 3 of `polish_epic.md`)

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Four independent, frontend-only polish fixes to the shared app shell: (1) make the board's 7
column controls a real keyboard/screen-reader-operable control on playable boards only, with zero
controls on read-only boards; (2) restyle two inert-looking-but-clickable elements
("review past mistakes", Stats "Sign up..." text) as visible buttons; (3) gate the Home
past-games CTA (and the Stats "Sign up..." text) behind sign-in for logged-out users, with a
single named post-login consumption point that returns them to their intended destination; (4)
add a persistent DecodeC4 logo to `TopBar` that navigates home from every screen (suppressing
Home's duplicate per-screen title), and fix Past Games' mobile chip/content spacing at 390×844.

Technical approach: every change is additive to existing, already-threaded props/state
(`Board`'s `canPlay`, `TopBar`'s optional `title`, `ProfileStore`'s `session`) rather than new
architecture. The one genuinely new piece of client state is a `sessionStorage`-backed
`postLoginReturn` module with exactly one write path per gated CTA, exactly one read path
(`Navigator`'s `session`-effect in `App.jsx`, newly wired to `useStore()`, calling the module's own
`consumeReturnTo()` directly rather than inlining the parse/validity logic), and exactly one clear
path (`AuthModal.jsx`'s own close handling, wrapping every dismissal route — backdrop, dismiss
button, dev skip-auth button — so a stashed destination can never survive a dismissed prompt and
fire on a later, unrelated sign-in). This fulfills FR-013's "single named consumption point"
requirement literally, not just conceptually, and closes a correctness gap (stale-stash-on-dismiss)
found during plan review — see `research.md` R3.

**Two facts surfaced during plan review that are load-bearing for US3 and are recorded here
because they are easy to miss by reading only the individual artifacts**: (1) the OAuth redirect
target is the site root `/` (`FRONTEND_URL`, `server/index.js:207`), not the screen the user
started from — every gated CTA in this feature, not only Past Games, therefore depends on the
stash/consume mechanism to return the user anywhere other than Home; the Stats `signup_prompt` CTA
stashes `{screenKey:'stats'}` for this reason (see `data-model.md`, resolved — no longer an
implementation-time open question). (2) The admin curation board (`CurationWorkspace.jsx`) and
`BoardEditor.jsx`'s disc-placement mode both pass `canPlay={true}` **and** `onColumnClick` — they
are correctly playable under FR-001/US1, not read-only exceptions; the a11y gate stays `canPlay`
(verified against every call site in the repo — see `research.md` R1, `contracts/board-a11y-contract.md`).

## Technical Context

**Language/Version**: JavaScript (ES2022+), React 19, JSX — no TypeScript in this codebase.
**Primary Dependencies**: React 19, `react-i18next` (i18n), `react-router-dom` **absent by design**
(Spec 011 FR-001 invariant — navigation is exclusively via `go()`/`urlMapping.js`).
**Storage**: `sessionStorage` (new, transient, one key: `postLoginReturnTo`); no DB/API changes.
**Testing**: Node.js built-in `node:test` + `node:assert/strict` (no Jest, no jsdom/RTL — see
`research.md` R6); `npm run test:fast` inside `connect-four/`. Manual verification via
`chrome-devtools-mcp`/`a11y-debugging` skills for real-DOM/real-focus/real-viewport checks
(`quickstart.md`), per Constitution III.
**Target Platform**: Mobile-first web SPA (`#root` capped at 480px shell), evergreen browsers;
390×844 explicit viewport target for US4's mobile-spacing fix.
**Project Type**: Web application — existing `connect-four/src/` (frontend) + `connect-four/server/`
(backend, untouched by this feature).
**Performance Goals**: N/A beyond existing Constitution V budgets — no new solver-dependent or
network-latency-sensitive path is introduced (this feature adds no new fetch/endpoint).
**Constraints**: No data/endpoint changes; no onboarding; no "mistakes" count-semantics change
(all per epic's NOT-included list). Board a11y changes must not alter `userIsYellow` P1/P2 color
role assignment (FR-007). `TopBar`'s existing prop contract must stay backward-compatible
(additive only).
**Scale/Scope**: 4 user stories, ~4-6 files touched in `src/components/` + `src/screens/` +
`src/App.jsx`, 1 new small `src/lib/` module, 1 cross-epic doc amendment (Spec 010 FR-013/FR-014).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I — Explanation Engine as Single Source of Truth**: N/A. This feature touches no move
  evaluation, pattern label, or LLM annotation surface.
- **II — Code Quality & Simplicity**: PASS. Every change reuses an existing prop/state
  (`canPlay`, `session`, `title`) rather than introducing new abstractions; the one new module
  (`postLoginReturn.js`) is justified because FR-013 explicitly requires a single, named,
  greppable consumption point — a bare inline `sessionStorage.getItem` scattered at the call site
  would not satisfy that requirement testably.
- **III — Testing Standards**: PASS with an explicit adaptation — this feature has no
  solver-dependent logic, so the "real C++ binary" clause is N/A. Pure a11y-derivation and
  stash/consume logic get `node:test` unit coverage (`research.md` R6); the DOM/focus/visual
  surface (which this repo has no harness for) gets mandatory manual golden-path + edge-case
  verification per `quickstart.md`, satisfying Constitution III's explicit manual-verification
  clause for UI features.
- **IV — UX Consistency & Progressive Disclosure**: PASS. No new evaluative/heatmap/Deep-Reveal
  surface is added; button restyling explicitly reuses existing design tokens (FR-008/FR-009).
- **V — Performance**: PASS, N/A — no new network call, no new solver call. `sessionStorage`
  read/write is synchronous and negligible.
- **VI — Implementation & Debugging Methodology**: PASS, actively applied — R5 (mobile-spacing
  root cause) and R3 (sessionStorage survival) are both explicitly deferred to empirical
  reproduction rather than assumed, per "reproduce before theorizing."
- **VII — Software Design Philosophy**: PASS. Reusing `canPlay`/`title`/`session` rather than
  adding parallel signals satisfies "one — and preferably only one — obvious way to do it."

**Principle VIII — Documentation (MUST check before planning)**:
- [x] Existing architecture docs (`docs/architecture/frontend-conventions.md`,
  `docs/architecture/testing-conventions.md`, constitution, Spec 010, `polish_epic.md` Epic 3)
  were read before this plan was drafted.
- [x] Undocumented conventions discovered during review have been documented before planning
  continued: the actual post-login consumption point did not exist prior to this plan (confirmed
  by reading `App.jsx`/`ProfileStore.jsx` in full — no existing `session`-reactive effect in
  `Navigator`); this plan specifies exactly where it will live (`research.md` R3) rather than
  leaving it open.
- [x] `tasks.md` (next phase) will include explicit documentation tasks for: the Spec 010
  FR-013/FR-014 amendment (`contracts/topbar-api-amendment.md` is the drafted amendment text to be
  applied in-place to `specs/010-design-tokens-component-library/spec.md`), and the Board a11y
  contract addition to `docs/architecture/frontend-conventions.md`'s "Board Component API" section.

No violations requiring Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/043-global-ui-ux-polish/
├── spec.md               # already exists (input to this plan)
├── plan.md                # this file
├── research.md             # Phase 0 output
├── data-model.md           # Phase 1 output
├── quickstart.md           # Phase 1 output
├── contracts/               # Phase 1 output
│   ├── topbar-api-amendment.md
│   ├── board-a11y-contract.md
│   └── post-login-return.md
└── tasks.md                # Phase 2 output (/speckit-tasks — NOT created by this command)
```

### Source Code (repository root)

This is an existing single web application (React SPA frontend + Express backend in one repo,
already established by specs 001-042). This feature is **frontend-only**:

```text
connect-four/
├── src/
│   ├── App.jsx                       # MODIFIED — Navigator wires useStore(), new session effect calling consumeReturnTo() (US3)
│   ├── components/
│   │   ├── AuthModal.jsx              # MODIFIED — wraps every close path (backdrop/dismiss/dev-skip) with clearReturnTo() (US3)
│   │   ├── Board.jsx                  # MODIFIED — per-column wrapper a11y attrs (US1)
│   │   └── TopBar.jsx                 # MODIFIED — logo element + onLogoClick prop (US4)
│   ├── screens/
│   │   ├── HomeScreen.jsx              # MODIFIED — gated past-games CTA + stash; drop title prop (US3, US4)
│   │   ├── StatsScreen.jsx             # MODIFIED — button restyle + gains AuthModal (import/state/render, mirroring HomeScreen) + gated onClick + stash 'stats' (US2, US3)
│   │   └── PastGamesListScreen.jsx     # MODIFIED — mobile chip/content spacing fix only (US4)
│   └── lib/
│       └── postLoginReturn.js          # NEW — stashReturnTo/consumeReturnTo/clearReturnTo (US3)
└── tests/
    └── unit/
        ├── boardA11y.test.js           # NEW — pure a11y-derivation unit tests (US1)
        └── postLoginReturn.test.js     # NEW — stash/consume/clear unit tests, incl. dismiss-then-unrelated-login-is-no-op (US3)

specs/010-design-tokens-component-library/
└── spec.md                            # MODIFIED — FR-013/FR-014 amendment (documentation deliverable)

docs/architecture/
└── frontend-conventions.md            # MODIFIED — Board Component API section gets the a11y addendum
```

**Structure Decision**: No new top-level directory or project. All changes land inside the
existing `connect-four/src/` frontend tree and its existing `tests/unit/` convention; the one
cross-cutting doc change (Spec 010 amendment) is applied in place per the epic's established
"visible superseding note" convention (`polish_epic.md` line-level corrections), and the Board a11y
addendum lands in the existing `frontend-conventions.md` "Board Component API" section rather than
a new file.

## Complexity Tracking

*No Constitution Check violations — table intentionally empty.*
