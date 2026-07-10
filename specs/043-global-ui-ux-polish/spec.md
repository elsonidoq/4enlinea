# Feature Specification: Global UI/UX & Accessibility Polish

**Feature Branch**: `043-global-ui-ux-polish`
**Created**: 2026-07-10
**Status**: Draft
**Input**: User description: "Epic 3 — Global UI/UX & Accessibility Polish" (`polish_epic.md`, Epic 3)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Board accessibility for screen-reader and keyboard users (Priority: P1)

A player who navigates by keyboard or uses a screen reader wants to know which column they are about to play and to be able to drop a disc without using a mouse or touch.

**Why this priority**: Without this, the core gameplay surface (the board) is entirely unusable for assistive-technology users — this is the most severe accessibility gap in the app and blocks the primary interaction loop.

**Independent Test**: With a screen reader or keyboard-only navigation active, tab through a **playable** board (a screen where the user can drop discs, e.g., the game screen) and confirm exactly 7 columns are announced (e.g., "column 3, button") and that pressing Enter/Space on a focused column drops a disc there, identical to a mouse click. Separately, tab through a **read-only** board (e.g., a past-game replay or lesson review board) and confirm zero column controls are announced.

**Acceptance Scenarios**:

1. **Given** a playable game board is rendered with 7 columns, **When** a screen-reader user navigates the board, **Then** they hear exactly 7 distinct, correctly-numbered column controls (not 42 individual cell announcements).
2. **Given** a column control has keyboard focus, **When** the user presses Enter or Space, **Then** a disc drops in that column exactly as if the user had clicked/tapped it.
3. **Given** a column control has keyboard focus, **When** rendered, **Then** a visible focus indicator distinguishes it from unfocused columns.
4. **Given** the current player is Player 1 (green) or Player 2 (gray), **When** the board is announced or highlighted, **Then** the existing player-color/role assignment is unchanged by this work.
5. **Given** a read-only (non-playable) board is rendered, such as in a review, lesson, or past-game replay screen, **When** a screen-reader or keyboard user navigates it, **Then** no per-column interactive controls are announced or focusable (the board remains inspectable but not operable).

---

### User Story 2 - Buttons look and behave like buttons (Priority: P2)

A player looking at the "review past mistakes" control on the Stats screen wants it to visually read as an actionable button, not as plain text, so they know they can tap it.

**Why this priority**: Lower severity than the board a11y gap (the control already works when clicked — the defect is purely about affordance/discoverability), but it's a widespread, quick-to-fix trust/usability issue.

**Independent Test**: Load the Stats screen and visually confirm "review past mistakes" has a visible background/border distinguishing it as tappable, with hover/active/focus states, and that tapping it still navigates to the mistakes list exactly as before.

**Acceptance Scenarios**:

1. **Given** a signed-in user on the Stats screen, **When** the "review past mistakes" control is rendered, **Then** it has a visible background and/or border consistent with other buttons in the app (design-token aligned).
2. **Given** the "review past mistakes" control, **When** a user hovers, presses (active), or focuses it via keyboard, **Then** a distinct visual state is shown for each.
3. **Given** the restyled control, **When** tapped, **Then** it navigates to the mistakes list exactly as it did before this change (no behavior change).
4. **Given** the signed-out "Sign up to track your progress over time" text on the Stats screen (see Appendix), **When** it is restyled, **Then** it reads as a tappable button with the same hover/active/focus states as other buttons in the app.

---

### User Story 3 - Every call-to-action is genuinely actionable, including for logged-out users (Priority: P1)

A user who is not signed in taps the "Past games" card on the Home screen, expecting either to see their past games or to be prompted to sign in — not to land on a screen with no way forward.

**Why this priority**: This is a hard dead end in a primary navigation path — equal severity to the board a11y gap because it silently blocks a core feature for an entire user segment (logged-out users) with no recovery path in the UI.

**Independent Test**: While logged out, tap the "Past games" card on Home; confirm a sign-in prompt appears instead of the "Sign in to see your past games" dead-end text; complete sign-in and confirm landing on the Past Games list (the originally intended destination).

**Acceptance Scenarios**:

1. **Given** a logged-out user on the Home screen, **When** they tap the "Past games" card, **Then** a sign-in prompt is shown instead of navigating to a screen with no way to sign in.
2. **Given** a logged-out user who opened the sign-in prompt from the "Past games" card, **When** they complete sign-in, **Then** they land on the Past Games list (their originally intended destination), not back on Home.
3. **Given** a logged-out user who dismisses the sign-in prompt without signing in, **When** they look at the Home screen, **Then** they remain on Home with no partial/broken navigation state.
4. **Given** the signed-out "Sign up to track your progress over time" text on the Stats screen (see Appendix), **When** a logged-out user taps it, **Then** a sign-in prompt is shown (it is no longer inert text).

---

### User Story 4 - Persistent branding logo and corrected mobile spacing (Priority: P3)

Any user wants a recognizable "DecodeC4" mark visible on every screen that reliably takes them back to Home when tapped, and wants the Past Games screen on a phone to not look visually cramped between the filter chips and the list below.

**Why this priority**: Lowest severity — a branding/polish improvement and a cosmetic spacing defect, neither of which blocks a task, unlike Stories 1 and 3.

**Independent Test**: From any screen in the app, tap the persistent logo and confirm it returns to Home. Load the Past Games screen on a 390×844 viewport and visually confirm comfortable, consistent spacing between the filter chips and the content below.

**Acceptance Scenarios**:

1. **Given** any screen in the app, **When** the top bar is rendered, **Then** a "DecodeC4" logo mark is visible, using the same text/color treatment already used elsewhere in the app for the DecodeC4 wordmark.
2. **Given** any screen, **When** the user taps the logo, **Then** they are taken to the Home screen.
3. **Given** the Past Games screen viewed at a 390×844 mobile viewport, **When** rendered, **Then** the spacing between the filter chips and the content/boundary below them reads as visually correct (no cramped or overlapping appearance), verified against the current default spacing which reads as too tight.
4. **Given** the per-screen title behavior that existed before this change (e.g., other screens' titles such as "Stats" or "Past Games"), **When** the logo is added, **Then** those existing per-screen titles continue to render unchanged alongside the new logo. **Exception**: the Home screen's own "DecodeC4" title is suppressed when the persistent logo ships, so the DecodeC4 mark appears exactly once on Home (see Assumptions).

---

### Edge Cases

- What happens if a logged-out user taps the "Past games" card, opens the sign-in prompt, but the sign-in flow is interrupted (e.g., closes the browser tab mid-flow)? The next visit should not silently redirect them anywhere unexpected — they land on their normal entry point (Home) and can retry the same flow.
- What happens if a logged-out user taps a gated CTA, opens the sign-in prompt, dismisses it without signing in, keeps browsing, and later signs in from a completely unrelated entry point (e.g., the profile icon)? They must NOT be silently redirected to the destination from the earlier, abandoned CTA — dismissing the prompt clears the remembered destination (see FR-014).
- What happens if a user taps the logo while already on the Home screen? Tapping should be a no-op or a harmless re-navigation to Home — it must not error or produce a duplicate/broken navigation entry.
- What happens when a column is full? Its column control must communicate a distinct, non-interactive state to assistive technology (e.g., not announced as "playable") rather than silently doing nothing on activation. This applies only within an already-interactive (playable) board — see FR-002.
- What happens to keyboard focus order across the 7 column controls — is it left-to-right, matching visual layout? Focus order must match the visual column order so keyboard users are not disoriented.
- What happens if a screen has no per-screen title at all — does the persistent logo still render correctly on its own? Yes; the logo's presence must not depend on a `title` being provided. Home is the first such screen once its title is suppressed (see FR-019).
- What happens to a static/read-only board (review, lesson, past-game replay, admin/eval display-only screens — not the admin curation board's playable disc-placement mode, see FR-002)? It must expose zero per-column interactive controls — see FR-002. It remains visually inspectable; only the interactive a11y surface changes.

## Requirements *(mandatory)*

### Functional Requirements

**Board accessibility (User Story 1)**

- **FR-001**: A playable board (one where the user can drop a disc, i.e., rendered with an active column-click handler) MUST expose exactly one accessible, interactive control per column (7 total), not one per individual cell. Individual cells within a column MUST NOT be separately exposed to assistive technology as interactive controls, on any board (playable or not).
- **FR-002**: A read-only/non-playable board (one rendered without an active column-click handler — e.g., review, mistake-detail, lesson, past-game replay, admin/eval display-only contexts such as `PuzzlePickerRow`/`PuzzlePickerModal`/`AdminFvSuffPage`/`AdminDeepRevealEvalPage`, and `BoardEditor`'s overlay-annotation mode) MUST NOT expose any per-column interactive controls to assistive technology. It carries no `role="button"`, no `tabIndex`, and no column-activation affordance. FR-005's non-playable-column-state handling applies only within a board that is otherwise interactive under FR-001; it does not apply to FR-002 boards, which have no interactive columns at all. **Note**: the admin curation board (`CurationWorkspace.jsx`) and `BoardEditor`'s disc-placement mode ARE playable under FR-001 (they pass an active column-click handler for admins placing discs) and correctly gain column controls — they are not FR-002 examples, despite being "admin" surfaces; verified directly against the current implementation (see `research.md` R1) so this feature does not accidentally misclassify them.
- **FR-003**: Each column control MUST have an accessible name identifying it as "column N," using a 1-based number matching what the user sees (the app's internal column indexing stays 0-based and is never exposed to the user).
- **FR-004**: Each column control MUST be reachable via keyboard (Tab/Shift+Tab) and MUST support activation via both Enter and Space, producing the same result as a mouse click/tap on that column, including any non-standard click branch (e.g., multi-select/curation mode) that the same control already handles for mouse clicks.
- **FR-005**: Each column control MUST display a visible focus indicator when it holds keyboard focus.
- **FR-006**: A full or otherwise non-playable column's control, within an interactive board (FR-001), MUST communicate its non-playable state to assistive technology and MUST NOT drop a disc when activated.
- **FR-007**: This work MUST NOT alter which player (Player 1/green vs. Player 2/gray) is assigned which visual role or color on the board.

**Button affordances (User Story 2)**

- **FR-008**: The "review past mistakes" control MUST be visually styled to be recognizable as a button (background and/or border), consistent with the app's existing button styling.
- **FR-009**: The "review past mistakes" control MUST show distinct hover, active (pressed), and keyboard-focus visual states.
- **FR-010**: Restyling the "review past mistakes" control MUST NOT change its click/tap behavior (navigation target and trigger stay the same).
- **FR-011**: The following elements, identified by the one-pass inventory in the Appendix, are the complete and bounded set of additional button-affordance fixes in scope for this feature — no other screens or elements are in scope for FR-011:
  - The Stats screen's signed-out "Sign up to track your progress over time" text (`StatsScreen.jsx:141-145`, key `stats.signup_prompt`) MUST be restyled as a button (background/border, hover/active/focus states), matching the FR-008/FR-009 treatment.
  No other inert-looking-but-clickable or affordance-gap elements were found on Home or Stats during the inventory; if a future audit finds more, they are out of scope for this feature and must be tracked separately.

**Logged-out CTA routing (User Story 3)**

- **FR-012**: When a signed-out user activates the "Past games" call-to-action on Home, the system MUST present a sign-in prompt instead of navigating to a screen the signed-out user cannot use.
- **FR-013**: The system MUST remember which destination the signed-out user was trying to reach when the sign-in prompt was triggered (stashed at the moment the gated CTA is activated, before the sign-in redirect), and MUST route the user to that destination automatically once sign-in completes successfully — even though sign-in involves a full page reload. The stashed destination MUST be read and cleared by a single, well-defined consumption point in the app's post-login bootstrap/routing path (not scattered per-screen), so that any screen reached after login resumes the user's original journey exactly once.
- **FR-014**: If the user dismisses the sign-in prompt without completing sign-in, the system MUST leave them on the screen they started from, with no partial navigation, AND MUST clear any remembered destination that was stashed for FR-013 so that it cannot silently redirect the user on a later, unrelated sign-in (e.g., the user browses elsewhere and signs in from a different entry point sometime after the dismissal).
- **FR-015**: The following element, identified by the one-pass inventory in the Appendix, is the complete and bounded set of additional inert-CTA fixes in scope for this feature — no other screens or elements are in scope for FR-015:
  - The Stats screen's signed-out "Sign up to track your progress over time" text (`StatsScreen.jsx:141-145`, key `stats.signup_prompt`) currently has no click handler at all. It MUST become tappable and route to the same sign-in prompt used elsewhere in this feature (FR-012).
  No other inert CTAs were found on Home or Stats during the inventory (the Home "Past games" card, covered by FR-012–FR-014, was already known and is the only other in-scope item). If a future audit finds more, they are out of scope for this feature and must be tracked separately.
- **FR-016**: This story MUST NOT change how a signed-in user reaches Past Games (that path remains a direct navigation).

**Branding logo & mobile spacing (User Story 4)**

- **FR-017**: A persistent "DecodeC4" logo MUST appear in the same position on every screen's top bar, using the existing DecodeC4 text/color treatment (no new visual asset).
- **FR-018**: Tapping the logo MUST navigate the user to the Home screen from any screen, including screens that show their own per-screen title.
- **FR-019**: Adding the logo MUST NOT remove, replace, or alter any existing per-screen title text or its position, **except on the Home screen**, where the existing "DecodeC4" per-screen title MUST be suppressed so that the new persistent logo is the single DecodeC4 mark shown on Home (avoiding a duplicate wordmark). This is a deliberate exception to the general "titles are unaffected" rule and overrides any prior decision to keep Home's title alongside the logo.
- **FR-020**: The spacing between the Past Games screen's filter chips and the content/boundary rendered immediately below them MUST be visually corrected at a 390×844 viewport, based on a reproduction of the current cramped appearance (the specific cause is not yet identified and must be diagnosed as part of implementation).

### Non-Functional Requirements

- **NFR-001 (documentation)**: The existing top-bar component contract (Spec 010, FR-013/FR-014) MUST be formally amended in this feature's deliverables to document the new persistent-logo capability as an addition to that contract, not a silent, undocumented change. The amendment MUST also note the Home-screen title-suppression exception introduced by FR-019.

### Key Entities

- **Column control**: The accessible, interactive unit representing one board column; carries a 1-based label, playable/non-playable state, and an activation action equivalent to tapping the column. Exists only on playable boards (FR-001); read-only boards have none (FR-002).
- **Sign-in intent / return destination**: The remembered "where the user was trying to go" state, captured when a signed-out user triggers a gated call-to-action, consumed exactly once — by a single named consumption point in the app's post-login bootstrap/routing path (FR-013) — to resume the user's original journey.
- **Persistent logo**: A cross-screen, always-present navigational element distinct from any per-screen title, whose sole behavior is "return to Home." On Home specifically, it is the only DecodeC4 mark rendered (the per-screen title is suppressed there — FR-019).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A keyboard-only or screen-reader user can identify and play any of the 7 columns of a playable board without using a mouse or touch, 100% of the time.
- **SC-002**: Zero individual board cells are exposed as separate interactive controls to assistive technology on any board (down from 42 today on playable boards), and read-only boards expose zero per-column interactive controls as well (down from a would-be 7 if FR-001 were applied unscoped).
- **SC-003**: 100% of users surveyed/tested (informal usability check) correctly identify "review past mistakes" and the restyled "Sign up to track your progress" control as tappable buttons on first glance.
- **SC-004**: A signed-out user who reaches Past Games *via a gated CTA* — the "Past games" card on Home, or the "Sign up to track your progress" control on Stats — arrives at their intended destination (Past Games, or the sign-in flow) within one sign-in flow, encountering zero dead-end screens, 100% of the time. This criterion is scoped to the gated-CTA paths; it makes no claim about a signed-out user who reaches `/pastGames` by direct navigation (see the known limitation under Assumptions).
- **SC-005**: The persistent logo successfully returns the user to Home from every screen in the app, 100% of the time, with zero navigation errors.
- **SC-006**: The Past Games screen at a 390×844 viewport shows corrected chip/content spacing, confirmed by side-by-side visual comparison against the pre-fix state.

## Assumptions

- "Review past mistakes" refers to the existing Stats-screen control (`StatsScreen.jsx:132`) that already navigates to the mistakes list; this feature restyles it and does not add a new control.
- The persistent logo reuses the exact existing DecodeC4 text/color treatment already rendered on the Home screen's title; no new logo mark or icon asset is designed as part of this feature.
- "Sign-in prompt" refers to the app's existing sign-in modal/flow; no new authentication method is introduced.
- The return-to-destination mechanism must survive a full page reload, because the app's existing sign-in flow performs a full-page redirect with no in-memory callback available. It is consumed by a single named point in the app's post-login bootstrap/routing path (FR-013); sessionStorage survival across the redirect round-trip (same origin, same tab) must be empirically confirmed during implementation.
- The Home screen's own "DecodeC4" per-screen title is suppressed once the persistent logo ships (FR-019), so Home shows exactly one DecodeC4 mark. This overrides the earlier default of leaving Home's title untouched alongside the logo — the duplicate-wordmark outcome was judged not acceptable.
- The Past Games screen's logged-out state (the screen a signed-out user would see if they reached it directly) is not rewritten by this feature; only the entry points that currently lead to it unconditionally for a signed-out user (the Home "Past games" card and the Stats "Sign up..." text) are changed so a signed-out user is redirected to sign-in before reaching that screen.
- **Known limitation (accepted, out of scope).** `/pastGames` is a real URL route (`src/lib/urlMapping.js:23`) and the app has no route-level auth guard, so a signed-out user can still reach the inert "Sign in to see your past games" empty state by direct navigation — bookmark, browser Back, page refresh, or a shared link. Gating the Home card gates the card, not the screen. Closing this would require either a sign-in control on that empty state or route-level auth guarding (which the app has nowhere today); both were judged out of scope for this feature. SC-004 is therefore scoped to the gated-CTA paths. If this limitation is later deemed unacceptable, the cheapest fix is adding a real sign-in affordance to `PastGamesListScreen`'s logged-out empty state.
- Preserving existing player-color/role assignment logic on the board is a hard constraint; no visual or behavioral change to which color represents which player is in scope.
- The additional-elements scope for FR-011 (button affordances) and FR-015 (CTA routing) is fixed to the Appendix inventory, produced by a one-pass audit of Home and Stats during spec authoring; it is not open-ended.
- Out of scope for this feature: server/API changes, the onboarding flow, and the definition/counting of "mistakes" (blunders vs. suboptimal moves) — those are handled by other epics.
- Out of scope for this feature: a rewrite of the Past Games screen's signed-out empty state itself, beyond it becoming unreachable via the entry points covered here; a new logo asset/mark design; and any change to disc color/role assignment or board mechanics/state logic.
- The exact cause of the Past Games mobile spacing issue is not yet known and requires visual reproduction at 390×844 as a first implementation step before a fix is designed.

## Appendix: Home/Stats inert & inert-looking element inventory

One-pass audit performed against the current implementation (`connect-four/src/screens/HomeScreen.jsx`, `connect-four/src/screens/StatsScreen.jsx`) to bound FR-011 and FR-015. Every interactive/CTA-shaped element on both screens was enumerated; three are in scope, and the reasons the rest are excluded are recorded here for auditability.

**HomeScreen.jsx**

| Element | Location | Behavior today | In scope? |
|---|---|---|---|
| TopBar "user" icon (`rightIcon="user"`) | `:29-30` | `session ? go('stats') : setAuthOpen(true)` | No — already fully actionable for both auth states. |
| TopBar "gear" icon (`right2="gear"`) | `:27-28` | `session ? go('settings') : setAuthOpen(true)` | No — already fully actionable for both auth states. |
| "Lessons" FeatureCard | `:41-49` | `onClick={() => go('saga')}`, unconditional | No — not auth-gated content; works the same for logged-out users (guest/local progress). |
| "Challenges" FeatureCard | `:50-58` | `onClick={() => go('setpicker')}`, unconditional | No — not auth-gated content. |
| "Sparring" FeatureCard | `:61-70` | `onClick={() => go('difficulty')}`, unconditional | No — not auth-gated content. |
| "Past games" FeatureCard | `:72-81` | `onClick={() => go('pastGames')}`, unconditional — dead-ends logged-out users at `PastGamesListScreen.jsx:206` | **Yes — already the primary US3 target, covered by FR-012–FR-014.** Listed here for completeness, not as a new finding. |
| "Progress & Stats" bottom button | `:86-92` | `<button className="btn btn-ghost" onClick={() => go('stats')}>`, unconditional | No — already a real, styled `<button>`; Stats screen itself handles the logged-out state (see below). |

**StatsScreen.jsx**

| Element | Location | Behavior today | In scope? |
|---|---|---|---|
| "Review past mistakes" button | `:132-137` | Real `<button>`, only rendered `isAuthenticated`, navigates to `mistakes` | No new routing issue — already the primary US2 target, covered by FR-008–FR-010 (styling only). |
| Coach-recommendation button | `:124-130` | Real `<button>`, only rendered when authenticated and a recommendation exists | No — already styled and functional; not rendered for logged-out users, so not inert for them. |
| Sign-out button | `:148-153` | Real `<button>`, only rendered `isAuthenticated` | No — not visible to logged-out users. |
| **"Sign up to track your progress over time" text** | `:141-145`, key `stats.signup_prompt` | Plain `<div>`, no `onClick`, only rendered `!isAuthenticated`. Its copy ("Sign up to...") reads as a call to action but is inert — tapping it does nothing. | **Yes — new finding.** In scope for both FR-011 (needs button styling) and FR-015 (needs to route to the sign-in prompt). |

No other interactive or CTA-shaped elements were found on either screen. This table is the complete definition of "additional elements" for FR-011 and FR-015; it is not a sample.
