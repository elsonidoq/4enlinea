# Tasks: Global UI/UX & Accessibility Polish

**Input**: Design documents from `/specs/043-global-ui-ux-polish/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md, contracts/

**Tests**: Included — `research.md` R6 establishes the repo's pure-function-extraction test
pattern (`node:test`, no jsdom/RTL) for the two new logic modules this feature introduces
(`getColumnA11yProps`, `postLoginReturn.js`). DOM/focus/visual behavior has no test harness in
this repo and is covered by mandatory manual verification (`quickstart.md`) per Constitution III.

**Organization**: Tasks are grouped by user story (US1–US4, per `spec.md`) to keep each story
independently implementable and testable. Phase order follows priority: US1 (P1) → US3 (P1,
spec-numeric tiebreak after US1) → US2 (P2) → US4 (P3).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1 / US2 / US3 / US4, per `spec.md`
- All file paths are relative to the repo root unless stated otherwise

---

## Phase 1: Setup

- [x] T001 Run `npm run test:fast` inside `connect-four/` to confirm the current suite is green
  before any change in this feature lands (Constitution VI — establish the baseline before
  touching code)

---

## Phase 2: Foundational (Blocking Prerequisites)

**None.** Each user story in this feature owns its own self-contained infra (`Board.jsx`'s
`getColumnA11yProps` for US1; `src/lib/postLoginReturn.js` for US3; `StatsScreen.jsx` styling for
US2; `TopBar.jsx`'s logo/`onLogoClick` for US4) — there is no shared module or schema change that
blocks more than one story (`plan.md` Technical Context: "no data/endpoint changes"). US1, US3, and
US4 can proceed in any order once Phase 1 is done; US2 is the exception — its T019 hard-depends on
US3's T012 (see Dependencies below) — so the phase ordering below (P1 → P1 → P2 → P3) is both the
sane incremental-delivery default and, for US2, a real dependency.

---

## Phase 3: User Story 1 - Board accessibility for screen-reader and keyboard users (Priority: P1) 🎯 MVP candidate

**Goal**: Every playable board exposes exactly 7 keyboard/screen-reader-operable column controls;
every read-only board exposes zero. Player color/role assignment is untouched.

**Independent Test**: Tab through a playable board (e.g. Sparring `game` screen) and confirm 7
`role="button"` elements labeled "column 1".."column 7", Enter/Space drops a disc. Tab through a
read-only board (e.g. `review` or `mistakeDetail`) and confirm zero column controls.

### Tests for User Story 1

- [x] T002 [P] [US1] Write failing `node:test` unit tests in
  `connect-four/tests/unit/boardA11y.test.js` for a `getColumnA11yProps({ col, canPlay, colFull })`
  pure function per `data-model.md`'s `ColumnA11yProps` table: (a) `canPlay=true, colFull=false` →
  `role='button'`, `ariaLabel='column N'` (1-based, `col=0`→"column 1"), `tabIndex=0`,
  `ariaDisabled=undefined`, for all 7 columns; (b) `canPlay=true, colFull=true` → `role='button'`,
  `tabIndex=-1`, `ariaDisabled=true`; (c) `canPlay=false` → all four fields `undefined` regardless
  of `colFull`

### Implementation for User Story 1

- [x] T003 [US1] Implement and export `getColumnA11yProps` in
  `connect-four/src/components/Board.jsx` per the table in `data-model.md` /
  `contracts/board-a11y-contract.md`, so T002 passes (depends on T002 existing and failing first)
- [x] T004 [US1] Wire the per-column wrapper `<div>` at `connect-four/src/components/Board.jsx:211-229`
  to call `getColumnA11yProps` and spread the resulting `role`/`aria-label`/`tabIndex`/
  `aria-disabled` attributes onto the wrapper (contract Invariant I1: exactly 7 controls on a
  playable board, 0 on read-only)
- [x] T005 [US1] Add an `onKeyDown` handler to the same wrapper in `Board.jsx` that calls the
  *exact same* `handleClick` function reference already used by `onClick` (line ~196) on Enter or
  Space — do not reimplement the `multiSelectMode`/`onColToggle` vs `onColumnClick` branch
  (contract Invariant I2, FR-004)
- [x] T006 [US1] Add a `:focus-visible` outline style to the per-column wrapper in `Board.jsx`,
  visually distinct from the existing hover background (`isHovered`, line ~223) (contract
  Invariant I4, FR-005)
- [x] T007 [US1] Run `npm run test:fast` inside `connect-four/`; confirm `boardA11y.test.js`
  passes and no existing suite regresses
- [x] T008 [US1] Manual verification — `quickstart.md` US1 steps 1–6, using the
  `chrome-devtools-mcp`/`a11y-debugging` skill against the local dev app: (1) exactly 7
  `role="button"` elements labeled "column 1".."column 7" on a playable board; (2) Tab order
  matches visual left-to-right order with a visible focus ring on each; (3) Space on column 4
  drops a disc identically to a click; (4) a full column reports disabled and does not drop on
  Enter/Space; (5) a read-only board (e.g. `review` or `mistakeDetail`) shows zero `role="button"`
  column elements; (6) green=P1/gray=P2 disc colors are visually unchanged. `research.md` R1's
  claim that the `canPlay` prop is correctly set (true only for genuinely playable boards) at
  every `Board` call site was taken on trust and not re-verified — as part of steps 1 and 5, spot-
  check `canPlay` at a few more `Board` call sites beyond just `game`/`review`/`mistakeDetail`
  (e.g. `socratic`, `challenge`) rather than assuming the pattern holds everywhere

**Checkpoint**: US1 is independently shippable — a keyboard/screen-reader user can play any
playable board end-to-end; read-only boards are unaffected.

---

## Phase 4: User Story 3 - Every call-to-action is genuinely actionable, including for logged-out users (Priority: P1)

**Goal**: A logged-out tap on Home's "Past games" card or Stats' "Sign up to track your progress"
text opens the sign-in prompt instead of dead-ending; completing sign-in lands the user on their
originally-intended destination via a single named post-login consumption point; dismissing the
prompt leaves no stale remembered destination behind.

**Independent Test**: Logged out, tap "Past games" on Home → `AuthModal` opens (not a navigation
to the dead-end screen). Complete sign-in → land on Past Games, not Home. Dismiss without signing
in → remain on Home with no partial navigation. Separately, sign in later from an unrelated entry
point (e.g. the profile icon) after having dismissed an earlier gated CTA → land on the default
screen (Home), not silently redirected to the earlier abandoned destination.

### Tests for User Story 3

- [x] T009 [P] [US3] Write failing `node:test` unit tests in
  `connect-four/tests/unit/postLoginReturn.test.js` for the module contracted in
  `contracts/post-login-return.md`, covering: `stashReturnTo` → `consumeReturnTo` round trip
  returns `{ screenKey, params }` and deletes the sessionStorage key; `consumeReturnTo()` returns
  `null` when nothing is stashed; `consumeReturnTo()` returns `null` (and deletes the entry) when
  the stashed `screenKey` is not a valid `SCREENS` key; malformed JSON in the stashed value does
  not throw out of `consumeReturnTo`; **the dismiss-then-unrelated-login regression** —
  `stashReturnTo('pastGames')` followed by `clearReturnTo()` followed by `consumeReturnTo()` MUST
  return `null` (this is the correctness gap closed in `research.md` R3 point 4 / `data-model.md`
  state transition 4 — it is the single highest-value test in this feature); `clearReturnTo()` is
  a safe no-op when nothing was stashed

### Implementation for User Story 3

- [x] T010 [US3] Create `connect-four/src/lib/postLoginReturn.js` implementing
  `stashReturnTo(screenKey, params = {})`, `consumeReturnTo()`, and `clearReturnTo()` exactly per
  `contracts/post-login-return.md` (single `sessionStorage` key `'postLoginReturnTo'`; validates
  `screenKey` against `SCREENS` from `connect-four/src/lib/screenRegistry.jsx` at consumption
  time), so T009 passes (depends on T009 existing and failing first)
- [x] T011 [US3] In `connect-four/src/screens/HomeScreen.jsx`, change the past-games
  `FeatureCard.onClick` (currently `() => go('pastGames')`, line ~80): if `session` is falsy, call
  `stashReturnTo('pastGames')` then `setAuthOpen(true)`; if truthy, keep `go('pastGames')`
  unchanged (FR-012, FR-016)
- [x] T012 [US3] `StatsScreen.jsx` does not currently import or render `AuthModal` (unlike
  `HomeScreen.jsx`, which has `import { AuthModal }`, an `authOpen` `useState`, and
  `{authOpen && <AuthModal onClose={...} />}`) — this task *introduces* that flow, not reuses
  it. In `connect-four/src/screens/StatsScreen.jsx`: (1) import `AuthModal` and add an `authOpen`
  `useState`, mirroring `HomeScreen.jsx`'s pattern; (2) render `{authOpen && <AuthModal
  onClose={() => setAuthOpen(false)} />}`; (3) add an `onClick` to the signed-out
  `stats.signup_prompt` element (currently a plain `<div>`, lines ~141–145) that calls
  `stashReturnTo('stats')` then `setAuthOpen(true)` (FR-015). *(Coordinate with T019 in Phase 5 —
  both tasks touch this element; T012 lands first since US3 precedes US2 in this ordering, and
  T019's styling verification assumes this `onClick`/`AuthModal` already exists.)*
- [x] T013 [US3] In `connect-four/src/App.jsx`, wire `Navigator` to call `useStore()` for
  `session` (not currently called there), and add `useEffect(() => { if (!session) return; const
  dest = consumeReturnTo(); if (dest) go(dest.screenKey, dest.params); }, [session])` — this is
  FR-013's single named consumption point; `consumeReturnTo` itself performs the `SCREENS`
  validity check, so this effect calls it directly with no inlined parse/validity logic
  (`research.md` R3, contract greppability invariant: `rg consumeReturnTo src/` must return
  exactly one call site outside the module's own test). `research.md` R3's claim that `Navigator`
  sits inside `ProfileStoreProvider` (making `useStore()` safe here) was taken on trust and not
  re-verified — before wiring the effect, confirm in `App.jsx` that `Navigator` does render inside
  `ProfileStoreProvider`
- [x] T014 [US3] In `connect-four/src/components/AuthModal.jsx`, wrap all three dismissal paths —
  the backdrop `onClick`, the "dismiss" button's `onClick`, and the dev-only "skip auth" button's
  `onClick` — so each calls `clearReturnTo()` before invoking the caller-supplied `onClose`
  (`research.md` R3 point 4, FR-014; this covers every `AuthModal` consumer — `HomeScreen.jsx`,
  `StatsScreen.jsx` (an `AuthModal` consumer only as of T012, which must land before this task's
  claim holds for `StatsScreen.jsx`), `DeepRevealPane.jsx`, and `AuthGate`'s inline modal —
  without per-caller changes)
- [x] T015 [US3] Run `npm run test:fast` inside `connect-four/`; confirm
  `postLoginReturn.test.js` passes (including the dismiss-then-unrelated-login case) and no
  existing suite regresses
- [x] T016 [US3] Empirical `sessionStorage` survival check (`quickstart.md` US3 step 3,
  `research.md` R3's "to be re-confirmed live" caveat): in the local dev environment, tap "Past
  games" while logged out, confirm `postLoginReturnTo` is present in DevTools → Application →
  Session Storage immediately after; complete the OAuth redirect round-trip (5173 → 3001 →
  external → 5173) and confirm the key is gone and the app lands on `pastGames`
- [x] T017 [US3] Manual verification — `quickstart.md` US3 steps 1, 2, 4, 5: gated Home CTA opens
  `AuthModal` (not a dead-end navigation); completing sign-in lands on Past Games, not Home;
  dismissing the prompt leaves the user on Home with no partial navigation; the Stats
  `signup_prompt` tap opens `AuthModal`. Verify SC-004 **only along the gated-CTA paths** — do NOT
  assert "zero dead-end screens" for direct navigation to `/pastGames` while signed out, which
  still reaches the inert empty state by design (see spec.md Assumptions, "Known limitation"):
  the route has no auth guard and this feature does not add one

**Checkpoint**: US1 and US3 both independently shippable — the two P1 stories are complete.

---

## Phase 5: User Story 2 - Buttons look and behave like buttons (Priority: P2)

**Goal**: "Review past mistakes" and the Stats "Sign up to track your progress over time" element
both visually read as buttons with distinct hover/active/focus states, with no behavior change.

**Test** (not independent — T019's signed-out half requires US3's T012 to have landed first,
since T012 is what gives `stats.signup_prompt` its `onClick`/`AuthModal`; only the signed-in
"review past mistakes" half of this story is independent of US3): Load Stats signed in — "review
past mistakes" has a visible background/border, distinct hover/active/focus states, and still
navigates to `mistakes` on tap. Signed out, the "Sign up..." element reads as a button with the
same states.

### Implementation for User Story 2

- [x] T018 [P] [US2] Restyle the "review past mistakes" `<button>` in
  `connect-four/src/screens/StatsScreen.jsx` (~line 132) with a visible background/border
  consistent with the app's existing button design tokens (FR-008) plus distinct hover, active
  (pressed), and keyboard-focus states (FR-009); do not change its `onClick` (`go('mistakes')`) or
  any other behavior (FR-010)
- [x] T019 [US2] Restyle the Stats screen's signed-out `stats.signup_prompt` element
  (`connect-four/src/screens/StatsScreen.jsx`, ~lines 141–145) with the same button treatment as
  T018 — background/border, hover/active/focus states (FR-011). *(This is the styling half of the
  same element T012 in Phase 4 makes clickable; land after T012 so the element already has its
  `onClick` before the visual restyle is verified end-to-end.)*
- [x] T020 [US2] Manual verification — `quickstart.md` US2 steps 1–2: "review past mistakes" shows
  3 distinct visual states (hover/active/focus) and still navigates to `mistakes` on click; the
  signed-out `signup_prompt` element now reads as a button with the same states

**Checkpoint**: US1 and US3 are independently shippable. US2 is shippable only once US3's T012
has landed (see Dependencies).

---

## Phase 6: User Story 4 - Persistent branding logo and corrected mobile spacing (Priority: P3)

**Goal**: A DecodeC4 logo appears in the same `TopBar` position on every screen and always
navigates Home (with Home showing exactly one DecodeC4 mark, its own title suppressed); Past
Games' mobile chip/content spacing at 390×844 is visually corrected.

**Independent Test**: From any screen, tap the logo and land on Home. At 390×844, Past Games'
filter-chip-to-content spacing no longer reads as cramped, compared against a pre-fix screenshot.

### Implementation for User Story 4

- [x] T021 [US4] In `connect-four/src/components/TopBar.jsx`, add an `onLogoClick` prop and an
  unconditionally-rendered DecodeC4 logo element — reusing the exact existing lockup markup from
  `connect-four/src/screens/HomeScreen.jsx:26` (`Decode<span
  style={{color:'var(--disc-green)'}}>C4</span>`) — positioned left of `title`, after the optional
  back button, per `contracts/topbar-api-amendment.md`'s render order
  (`[back button?] [logo] [title?] [spacer] [meta?] [right2?] [rightIcon?]`); clicking it calls
  `onLogoClick`. `title` stays optional and unchanged for every existing caller (FR-017, FR-018)
- [x] T022 [US4] In `connect-four/src/screens/HomeScreen.jsx`, drop the `title` prop from the
  `<TopBar>` call (lines ~25–31) and add `onLogoClick={() => go('home')}`, so Home renders exactly
  one DecodeC4 mark (FR-019) (depends on T021)

The following 16 tasks each add `onLogoClick={() => go('home')}` to every remaining existing
`<TopBar>` call site in the named file (some files render `<TopBar>` more than once, e.g. in a
loading/error early-return branch — update every occurrence in that file), leaving every other
existing prop (`title`, `onBack`, `meta`, `rightIcon`/`onRight`, `right2`/`onRight2`) unchanged
(FR-017, FR-018; depends on T021):

- [x] T023 [P] [US4] `connect-four/src/screens/PastGamesListScreen.jsx` — 2 `<TopBar>` call sites
- [x] T024 [P] [US4] `connect-four/src/screens/DifficultyPickerScreen.jsx`
- [x] T025 [P] [US4] `connect-four/src/screens/SocraticScreen.jsx` — 4 `<TopBar>` call sites
  (lines 95, 106, 118 — self-closing `onBack`-only bars in loading/early-return branches — and
  154, the primary multiline bar; update all four)
- [x] T026 [P] [US4] `connect-four/src/screens/SettingsScreen.jsx` — 2 `<TopBar>` call sites
- [x] T027 [P] [US4] `connect-four/src/screens/ConceptScreen.jsx` — 3 `<TopBar>` call sites
- [x] T028 [P] [US4] `connect-four/src/screens/GameScreen.jsx`
- [x] T029 [P] [US4] `connect-four/src/screens/CategoryListScreen.jsx`
- [x] T030 [P] [US4] `connect-four/src/screens/SetPickerScreen.jsx`
- [x] T031 [P] [US4] `connect-four/src/screens/PostSetSummaryScreen.jsx`
- [x] T032 [P] [US4] `connect-four/src/screens/SagaScreen.jsx`
- [x] T033 [P] [US4] `connect-four/src/screens/MistakesListScreen.jsx`
- [x] T034 [P] [US4] `connect-four/src/screens/ChallengeScreen.jsx` — 3 `<TopBar>` call sites
- [x] T035 [P] [US4] `connect-four/src/screens/StatsScreen.jsx` (the `<TopBar>` call at ~line 84
  — a different location from T018/T019's button restyles)
- [x] T036 [P] [US4] `connect-four/src/screens/PlayOnlineScreen.jsx` — 2 `<TopBar>` call sites
- [x] T037 [P] [US4] `connect-four/src/screens/MistakeDetailScreen.jsx`
- [x] T038 [P] [US4] `connect-four/src/screens/ReviewScreen.jsx`

- [x] T039 [P] [US4] Diagnose the Past Games mobile spacing root cause (`research.md` R5,
  Constitution VI "reproduce before theorizing" — no cause is assumed ahead of this task): using
  `chrome-devtools-mcp` device emulation, render `PastGamesListScreen` at 390×844, inspect the
  computed box model between the filter-pills row (`connect-four/src/screens/PastGamesListScreen.jsx:257-283`)
  and the content list (`:286-334`), and capture a pre-fix baseline screenshot
- [x] T040 [US4] Fix the diagnosed spacing issue in
  `connect-four/src/screens/PastGamesListScreen.jsx` (FR-020) (depends on T039's diagnosis)
- [x] T041 [US4] Manual verification — `quickstart.md` US4 steps 1–4: the logo renders in the same
  `TopBar` position and navigates Home from every screen type (Home, Stats, Past Games, a lesson
  screen, a sparring game); Home shows exactly one DecodeC4 mark; tapping the logo while already
  on Home is a no-op/harmless re-navigation with no error and no broken/duplicate history entry;
  at 390×844, Past Games' chip-to-content spacing no longer reads as cramped versus the T039
  baseline screenshot

**Checkpoint**: All four user stories are complete and shippable (US2 having landed after its
US3/T012 dependency, per Dependencies above).

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Lockstep documentation deliverables (Constitution Principle VIII — part of this
feature's definition of done, not a follow-up) and final full-feature regression/acceptance.

- [x] T042 [P] Apply the Spec 010 FR-013/FR-014 amendment to
  `specs/010-design-tokens-component-library/spec.md`, using the drafted text in
  `contracts/topbar-api-amendment.md` as a visible superseding correction (old text struck
  through inline, new text follows — matching the convention already used in `polish_epic.md`):
  the logo element in the FR-013 render list, `onLogoClick` in the FR-014 prop list, and the note
  that `title` is optional with Home omitting it by convention post-043 (NFR-001)
- [x] T043 [P] Add the Board a11y contract addendum to
  `docs/architecture/frontend-conventions.md`'s "Board Component API" section, using
  `contracts/board-a11y-contract.md` as source: the per-column wrapper attribute table
  (`canPlay`/`colFull` → `role`/`aria-label`/`tabIndex`/`aria-disabled`) and invariants I1–I4,
  including the explicit "gate is `canPlay`, not `onColumnClick` presence" verification note so
  a future reader does not relitigate it (NFR-001, Constitution Principle VIII)
- [x] T044 Run `npm run test:fast` inside `connect-four/` for a full regression pass — every
  existing suite plus `boardA11y.test.js` and `postLoginReturn.test.js` must be green
  (`quickstart.md` "Regression check")
- [x] T045 Full `quickstart.md` walkthrough across all four user stories in one session as the
  feature's final acceptance pass, confirming every epic acceptance criterion in `polish_epic.md`
  Epic 3 ("Acceptance criteria") is met

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — run first
- **Foundational (Phase 2)**: Empty — no cross-story blocker (see rationale above)
- **User Stories (Phases 3–6)**: US1, US3, and US4 depend only on Phase 1 and do not depend on
  each other or on US2; those three may be implemented/tested in any order or in parallel by
  different people. **US2 is not independent: T019 hard-depends on T012 (US3)**, since T012 is
  what adds the `onClick`/`AuthModal` to the `stats.signup_prompt` element that T019 restyles and
  verifies — US2 cannot be validated (T020) until US3's T012 has landed. The phase ordering here
  (US1 → US3 → US2 → US4) follows spec priority (P1, P1, P2, P3) for a sane default
  incremental-delivery sequence, and for US2 specifically also satisfies its T012 dependency
- **Polish (Phase 7)**: T042 depends on T021/T022 (US4) landing; T043 depends on T003–T006 (US1)
  landing; T044/T045 depend on all four stories being complete

### Within Each User Story

- US1: T002 (test) → T003 (implementation, makes T002 pass) → T004 → T005 → T006 → T007 (verify
  tests) → T008 (manual)
- US3: T009 (test) → T010 (implementation) → T011, T012 (write sites, either order) → T013 (read
  site) → T014 (clear site) → T015 (verify tests) → T016 → T017 (manual)
- US2: T018 [P] independent of T019; T019 depends on T012 (US3) having already added the
  `onClick` to the same element → T020 (manual)
- US4: T021 (TopBar core change) → T022 (Home) and T023–T038 (all other screens, parallel, each a
  distinct file) → in parallel, T039 (diagnose) → T040 (fix) → T041 (manual)

### Parallel Opportunities

- T002 (US1 test) can be written while Phase 1 is still running its baseline check
- T009 (US3 test) is independent of the entire US1 phase — a second contributor could start US3
  while US1 is in progress
- T018 (US2) has no dependency on US1/US3/US4 and can start any time after Phase 1
- T023–T038 (16 files) are all `[P]` — one per distinct file, no shared state, ideal for
  fan-out across parallel agents once T021 lands
- T039 (mobile-spacing diagnosis) has no dependency on any other US4 task and can run in parallel
  with T021–T038
- T042 and T043 (documentation) can be written in parallel with each other once their respective
  source stories (US4, US1) are implemented

---

## Parallel Example: User Story 4 (logo wiring fan-out)

```bash
# After T021 (TopBar.jsx core change) lands, fan out the 16 per-screen wiring tasks:
Task: "T023 Add onLogoClick to PastGamesListScreen.jsx's 2 TopBar call sites"
Task: "T024 Add onLogoClick to DifficultyPickerScreen.jsx's TopBar call site"
Task: "T025 Add onLogoClick to SocraticScreen.jsx's 4 TopBar call sites"
# ... T026–T038 similarly, one per file
```

---

## Implementation Strategy

### MVP First

US1 (board accessibility) is the smallest fully independent, highest-severity increment — it
touches only `Board.jsx` and its new test file, has zero cross-story dependency, and closes the
epic's most severe gap (assistive-technology users cannot play at all today). US3 is equally P1
in the spec and should follow immediately after, since it closes the other hard dead-end
(logged-out "Past games").

1. Phase 1 (Setup)
2. Phase 3 (US1) — **STOP and VALIDATE** independently (T008)
3. Phase 4 (US3) — **STOP and VALIDATE** independently (T017); both P1 stories now done
4. Phase 5 (US2) — validate (T020)
5. Phase 6 (US4) — validate (T041)
6. Phase 7 (Polish/docs + final regression + full acceptance pass)

### Incremental Delivery

Each phase checkpoint above is independently demoable/shippable — a partial deploy after Phase 3
alone already fixes the most severe accessibility gap without needing US2–US4 to land first.

---

## Notes

- `[P]` tasks touch different files with no dependency on an incomplete task in this list.
- No task in this feature touches `connect-four/server/` — this is a frontend-only feature
  (`plan.md` Project Structure).
- T012 (US3) and T019 (US2) both edit the same `StatsScreen.jsx` `signup_prompt` element
  (`onClick`/`AuthModal` introduction vs. styling) — land T012 first per the phase ordering above
  to avoid a conflicting concurrent edit.
- `StatsScreen.jsx` is touched by 4 tasks across 3 phases — T012 (US3, Phase 4), T018/T019 (US2,
  Phase 5), T035 (US4, Phase 6) — at three distinct regions of the file: the `signup_prompt`
  element (~lines 141–145), the "review past mistakes" button (~line 132), and the `<TopBar>` call
  (~line 84). The phasing above sequences these so no two land concurrently; T035 is safely
  marked `[P]` within the US4 fan-out because no other US4 file task touches `StatsScreen.jsx`.
- `AuthModal`'s "sign in" action redirects without firing `onClose`, so a stashed
  `postLoginReturnTo` correctly survives sign-in; only an explicit dismiss (backdrop/dismiss/dev-
  skip, per T014) clears it. This asymmetry is intended — do not "fix" it into symmetry.
- Commit after each task or logical group, per repo convention.
