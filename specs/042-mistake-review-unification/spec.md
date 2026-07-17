# Feature Specification: Mistake Review Unification & Deep-Reveal Overhaul

**Feature Branch**: `042-mistake-review-unification`
**Created**: 2026-07-08
**Status**: Draft
**Input**: User description: "Mistake Review Unification & Deep-Reveal Overhaul" (Epic 2 of `polish_epic.md`)

**Depends on**: Epic 1 (Past Games & Mistakes: Server Data Integrity, spec 041) — this feature assumes
Epic 1's unified, correctly-counted, fully-reachable mistake data is already in place. This spec does not
re-implement or duplicate Epic 1's pagination/count-correctness work.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - One screen for every mistake, regardless of severity (Priority: P1)

As a player reviewing my games, when I open any non-optimal move I made — whether it was flagged as a
severe "blunder" or a milder "suboptimal" move — I want to land on the same kind of detail screen, with
the same three actions available ("Start new game from here", "What should I have played?", "Mark as
reviewed"), so that I never encounter a dead-end or an inconsistent experience depending on how bad my
mistake was.

**Why this priority**: This is the foundational unification the rest of the epic assumes. Every other
story (permalinks, navigation, debug-token removal, highlighting) touches the same unified screen. Doing
this first also retires legacy code paths that would otherwise have to be worked around by later stories.

**Independent Test**: Open a suboptimal-quality mistake and a blunder-quality mistake from the same game
and confirm both render the same screen component with all three actions present and enabled (subject to
ownership), differing only in a severity indicator.

**Acceptance Scenarios**:

1. **Given** a completed game with at least one suboptimal-quality move and at least one blunder-quality
   move, **When** the player opens each from the mistake list, **Then** both open the same detail screen
   layout with "Start new game from here", "What should I have played?", and "Mark as reviewed" all
   present, differing only by a severity label/color ("Blunder" vs "Suboptimal").
2. **Given** a mistake the player owns, **When** the detail screen loads, **Then** "Mark as reviewed" is
   available; **given** a mistake the player does not own (or an anonymous visitor), **when** the detail
   screen loads, **then** "Mark as reviewed" is hidden.
3. **Given** the current codebase, **When** the unification is complete, **Then** no leftover legacy
   "explorer" route, component, or dead prop/i18n key referencing the old split view remains reachable.

---

### User Story 2 - Reliable permalinks and reload survival (Priority: P1)

As a player who opens a shared mistake link or reloads the review page, I want to see the correct move
number out of the correct total, correct position among my other mistakes on that game, and every action
button — not a broken "Move 1 of 1" or a screen that silently bounces me to the home screen.

**Why this priority**: This is an active, high-visibility defect that breaks the core sharing and
resume use case; it blocks trust in permalinks and in reload-safety generally.

**Independent Test**: Copy a mistake's permalink URL, open it in a fresh browser tab (no prior in-app
navigation state), and confirm the header shows the correct "Move N / total-moves-in-game" and correct
"X of Y" sibling position; reload the mistakes-by-category screen directly and confirm it stays on the
category list rather than redirecting to the home screen.

**Acceptance Scenarios**:

1. **Given** a mistake permalink is opened directly (no client-side navigation history), **When** the
   page finishes loading, **Then** the header shows "Move N / M" where M is the total move count of the
   parent game, and "Start new game from here" is present and functional.
2. **Given** a mistake permalink is opened directly, **When** the page finishes loading, **Then** the
   sibling position indicator ("X of Y") reflects the true count of mistakes in that game, not a default
   of 1.
3. **Given** the mistakes-by-category screen is open and the player reloads the browser, **When** the
   page finishes loading, **Then** the player remains on the same category list (not redirected home).

---

### User Story 3 - Navigation that goes somewhere, and controls that actually move the board (Priority: P1)

As a player stepping through mistakes in a review session, I want the Back button to always take me one
step closer to Home (never trap me in a loop), and I want the Prev/Next controls and mistake-quality
chips to actually change which position is shown on the board.

**Why this priority**: Also an active, high-visibility defect — without this, the review flow is either
confusing (infinite back-loop) or non-functional (controls that don't do anything).

**Independent Test**: From a past game reached via a mistake's "view game" link, press Back three times
and confirm the trail lands on Home without repeating a screen; separately, click Prev/Next and a
mistake-quality chip in the review stepper and confirm the rendered board changes each time, and that
clicking a chip representing a severe mistake opens that mistake's permalink.

**Acceptance Scenarios**:

1. **Given** a player reaches a mistake detail screen via a game's "view mistake" link, **When** they
   press Back three times, **Then** the sequence is mistake → game → past games list → home, with no
   repeated screen.
2. **Given** the review stepper is open on a game, **When** the player clicks Prev or Next, **Then** the
   board updates to show the corresponding position (verified by a distinct rendered-state signature per
   step).
3. **Given** the review stepper's mistake-quality chip row, **When** the player clicks a chip
   representing a severe mistake, **Then** the app navigates to that mistake's permalink; **when** they
   click any chip, **then** the board updates to the corresponding position, whether the underlying
   mistake came from an AI sparring game or an imported papergames.io game.

---

### User Story 4 - "No mistakes" only means no mistakes (Priority: P2)

As a player who played a game with no severe blunders but at least one suboptimal move, I want the
summary to say I made a mistake — not "no mistakes" — so I'm not given false confidence about a game
that still had room to improve.

**Why this priority**: A real but lower-severity defect: the underlying count is already correct (see
Assumptions), so this is a labeling/copy fix rather than new logic — lower risk, lower urgency than the
P1 navigation/permalink defects.

**Independent Test**: Play (or seed) a game with zero severe mistakes and at least one milder mistake,
and confirm the Past Games list shows a non-zero "mistake" count and no user-facing text claims there
were no mistakes.

**Acceptance Scenarios**:

1. **Given** a completed game with 0 severe mistakes and ≥1 milder mistake, **When** the player views it
   in Past Games, **Then** the mistake count shown is non-zero and no label claims "no mistakes."
2. **Given** any screen that surfaces a "mistake" count sourced from the game/coach data, **When** that
   screen renders, **Then** the label reads "mistake(s)," not "blunder(s)," while the underlying count
   continues to include both severity levels.

---

### User Story 5 - No internal jargon or debug output leaks to players (Priority: P2)

As a player reading a mistake's explanation, I never want to see raw internal debugging output (like
`sev:6 tree:0.28`), an unformatted game-notation string, an internal community-label prefix, or a raw
grid-coordinate token — I want plain, readable language throughout.

**Why this priority**: A trust/polish issue rather than a functional blocker — players can still use the
feature with the leakage present, but every leaked token undermines the feel of a finished product.

**Independent Test**: Open several mistake explanations covering a range of tactical patterns and search
the rendered text for internal debug markers, an internal label prefix, and raw coordinate tokens;
confirm none appear.

**Acceptance Scenarios**:

1. **Given** any mistake detail screen, **When** it renders, **Then** no raw internal severity/score
   debug fields or unformatted move-notation strings are visible anywhere in the UI.
2. **Given** any explanation text generated for a mistake, **When** it references a strategic concept or
   a board square, **Then** it uses plain language (e.g., a concept's plain name, "column 3") — never an
   internal label prefix or a raw grid-coordinate token.

---

### User Story 6 - See exactly which squares matter, with a stable board while adjusting the view (Priority: P3)

As a player reading a deep explanation of a mistake, I want every square the explanation names to be
visibly highlighted on the board, and I want dragging the split between the board and the explanation
panel to never suddenly shrink or re-enlarge the board.

**Why this priority**: Polish — improves comprehension and comfort but does not block completing a
review session; addresses the lowest-severity findings in this epic.

**Independent Test**: Open a mistake explanation that names a two-square fork (a "double threat") and
confirm both named squares are highlighted on the board; separately, drag the panel divider from a
neutral position up past a threshold and confirm the board's zoom level does not change unexpectedly.

**Acceptance Scenarios**:

1. **Given** a mistake explanation that names a double-threat fork with two specific squares, **When**
   the explanation renders, **Then** both named squares are visibly highlighted on the board, using the
   existing player-color highlight convention.
2. **Given** the player is dragging the split divider between the board and the explanation panel,
   **When** they drag it past a point that previously caused the board to shrink or re-enlarge, **Then**
   the board's zoom stays stable and independent of the divider position.

---

### Edge Cases

- What happens when a mistake permalink is opened by someone who does not own it (or is not signed in)?
  The three actions still render as appropriate for a non-owner (no "Mark as reviewed"; deep-reveal
  content may prompt sign-in), and the correct "Move N / M" / "X of Y" figures still display — ownership
  affects available actions, not the correctness of the header/pagination facts.
- What happens when a mistake belongs to an imported papergames.io game rather than an AI sparring game?
  Navigation, chip resolution, and Back trail behavior must work identically regardless of which game
  source the mistake came from.
- What happens when the review stepper is opened on a game that has zero mistakes? Prev/Next and chips
  still function for stepping through the board's optimal moves; there is simply no chip that opens a
  permalink.
- What happens when the same square is named for two different reasons in one explanation (e.g., it is
  both the correct-block cell and part of a highlighted fork)? It must still render highlighted; the
  spec does not require distinguishing overlapping reasons visually beyond the existing highlight
  convention.
- What happens when a game has exactly one mistake? "X of Y" must read "1 of 1" truthfully (this is
  different from today's defect, where "1 of 1" appears even when more mistakes actually exist).
- What happens when Back is pressed on a mistake opened cold via a permalink (no client-side navigation
  history at all, e.g. a fresh tab)? Back goes straight to Home in one press — this preserves the shipped
  spec-037 behavior and is intentionally different from the three-press mistake → game → past games list
  → home trail in FR-012, which applies only when the mistake was reached via in-app navigation.

## Requirements *(mandatory)*

### Functional Requirements

**Unification (User Story 1)**

- **FR-001**: The system MUST present suboptimal-quality and blunder-quality mistakes in the same detail
  screen experience, differing only in a severity indicator (distinct label and color), never in which
  actions are available or how the screen is structured.
- **FR-002**: The system MUST always offer "Start new game from here" and "What should I have played?"
  (deep reveal) on the mistake detail screen for every mistake, regardless of severity.
- **FR-003**: The system MUST offer "Mark as reviewed" on the mistake detail screen only when the
  viewing player owns the mistake; ownership is unknown-but-treated-as-owner in in-app navigation
  contexts and explicitly non-owner only when the server states so.
- **FR-004**: The system MUST NOT retain any reachable legacy "explorer" screen, route, or code path for
  displaying a non-optimal move; every such move must route through the unified mistake detail screen.

**Terminology (User Story 4)**

- **FR-005**: Every user-facing count or aggregate label describing how many mistakes a game contains MUST
  include both suboptimal and blunder severities and MUST use the word "mistake(s)," never "blunder(s)."
  This prohibition applies only to count/aggregate labels; it does not apply to the per-move severity
  indicator (FR-001), which may legitimately read "Blunder" for a blunder-quality mistake.
- **FR-006**: A completed game with zero blunder-severity mistakes but at least one suboptimal-severity
  mistake MUST NOT be described anywhere as having "no mistakes."
- **FR-007**: The underlying identifier used to carry the mistake count between the server and the
  client MAY keep its existing technical name; only the player-facing label changes. (A rename of that
  identifier is explicitly out of scope — see Out of Scope.)

**Permalinks & reload (User Story 2)**

- **FR-008**: Opening a mistake detail screen directly (no prior in-app navigation) MUST show the correct
  move number out of the correct total move count for that mistake's parent game.
- **FR-009**: Opening a mistake detail screen directly MUST show the correct sibling position ("X of Y")
  among all mistakes in that mistake's parent game, not a default/placeholder value.
- **FR-010**: Opening a mistake detail screen directly MUST render "Start new game from here" exactly as
  it renders when reached via in-app navigation.
- **FR-011**: Reloading the mistakes-by-category screen MUST keep the player on that same category list;
  it MUST NOT redirect to the home screen.

**Navigation & stepper (User Story 3)**

- **FR-012**: Pressing Back from a mistake detail screen reached via a game's "view mistake" link MUST
  produce the trail mistake → game → past games list → home, with each Back press advancing exactly one
  step closer to home and never repeating a prior screen. This requirement applies only when in-app
  navigation history exists; see Edge Cases for the cold-opened-permalink case, where Back goes straight to
  Home in one press.
- **FR-013**: The review stepper's Prev/Next controls MUST change the position rendered on the board on
  every activation.
- **FR-014**: The review stepper's mistake-quality chips MUST change the position rendered on the board
  when clicked, and a chip representing a mistake MUST navigate to that mistake's permalink.
- **FR-015**: Chip-to-mistake resolution MUST work for mistakes originating from both AI sparring games
  and imported papergames.io games.

**No internal leakage (User Story 5)**

- **FR-016**: The mistake detail screen MUST NOT display raw internal debug fields (severity/score debug
  values, an unformatted internal game-notation string) anywhere in its UI.
- **FR-017**: Any generated explanation text MUST NOT contain an internal community-label prefix on a
  strategic-concept name; concepts must be referenced by their plain name.
- **FR-018**: Any generated explanation text MUST NOT contain a raw internal grid-coordinate token; board
  squares referenced in prose must be expressed in player-facing terms (e.g., "column N") or conveyed
  solely through the board highlight.
- **FR-019**: The mechanism that removes internal tokens from generated explanation text MUST apply
  uniformly everywhere such text (and any accompanying term-reference map) reaches a player, including
  text served from a cache, so no generation or cache-read path can bypass it. This MUST be implemented
  as a single shared guard function called at one common seam downstream of the explanation cache —
  i.e. at the point where a response is serialized back to the client, not at each upstream
  text-producing module independently — so uniformity is structural rather than a convention that can
  silently drift. (Plan-review finding: a guard placed only at the text-producing modules is bypassed
  by cache-hit responses, which run none of them — see `research.md` §5/§8 for the resolved seam.)

**Highlighting & split-pane (User Story 6)**

- **FR-020**: Every board square explicitly named in a mistake's explanation text MUST be visibly
  highlighted on the board shown with that explanation.
- **FR-021**: Highlight coloring MUST follow the existing player-color convention (the highlighted
  player's own color, not a hardcoded assignment).
- **FR-022**: Dragging the divider between the board and the explanation panel MUST NOT cause the
  board's zoom level to change.

### Key Entities *(include if feature involves data)*

- **Mistake**: A single non-optimal move a player made in a game. Has a severity category (two levels:
  milder and more severe), a link to its parent game (from either game source), the move index within
  that game, the column played, the column that would have been better, and whether the current viewer
  owns it.
- **Parent game**: The completed game (AI sparring or imported papergames.io) a mistake belongs to. Has a
  total move count and an ordered set of mistakes within it, used to compute "Move N / M" and "X of Y."
- **Explanation ("deep reveal")**: The generated text (and any highlighted squares) that explains why a
  played move was worse than the better move for a given mistake.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A player opening any mistake — regardless of severity — always finds all three review
  actions in the same place, in 100% of sampled cases across both severities.
- **SC-002**: Opening a shared mistake link in a brand-new browser session shows the correct move number
  and sibling position in 100% of sampled cases (currently: incorrect in the observed defect). Verified
  against real stored mistakes from a game with a known total move count and at least two mistakes (so
  "X of Y" is non-trivial), plus a broader sample of real stored mistakes.
- **SC-003**: A full Back-navigation walk from a game-reached mistake to Home takes exactly three
  presses and never revisits a screen, in 100% of sampled trails.
- **SC-004**: Every step control (Prev/Next/chip) in the review stepper visibly changes the board in
  100% of interactions during a review session.
- **SC-005**: Zero raw debug tokens, internal label prefixes, or raw coordinate tokens appear in any
  sampled mistake-detail or explanation text after the fix, across a representative set of tactical
  patterns.
- **SC-006**: A game with zero severe mistakes and at least one milder mistake shows a non-zero mistake
  count and no "no mistakes" text, in 100% of sampled such games.
- **SC-007**: All automated tests for this area (`npm run test:fast`) pass with no regressions.
- **SC-008**: For both detector-verified boards named in Assumptions — movestring
  `41442625312235115445550126400` (first-player fork, cells `c1r4`/`c4r3`) and movestring
  `3333364101252113121524` (second-player fork, cells `c5r3`/`c7r2`) — 100% of the named squares render
  highlighted on the board shown with that mistake's explanation.
- **SC-009**: Across the full range of the split-divider drag (including past the point that previously
  triggered a shrink/re-enlarge), the board's rendered zoom level stays constant, in 100% of sampled drag
  sequences.

## Out of Scope

- Reachability/pagination/DB-side counting of mistakes at scale — owned by Epic 1 (spec 041).
- The logic that assigns a move's severity classification (blunder vs. suboptimal) in the first place, or
  which tactical patterns are detected — unchanged by this feature.
- Renaming the technical field name that carries the mistake count on the wire — tracked as an explicit
  follow-up, not built here.
- Any change to the puzzle-practice statistics endpoint (out of scope entirely — it has no
  blunder/suboptimal concept).
- Any change to what the reasoning/evidence engine computes or stores — this feature only changes how
  already-computed evidence is unified, displayed, navigated to, and rendered without leaking internal
  tokens.

## Assumptions

- Epic 1 (spec 041, past-games & mistakes server data integrity) is already landed: the underlying
  mistake count already includes both severities everywhere it is surfaced, and the coach queue is fully
  paginated/reachable. This feature performs a labeling change and a regression audit on top of that — it
  does not change how mistakes are counted.
- The technical field name currently used to carry the mistake count between server and client stays as
  it is; only the word shown to players changes from "blunder(s)" to "mistake(s)." Renaming the technical
  field is an explicit follow-up, out of scope here.
- `/api/stats` is out of scope: it aggregates puzzle-practice data, not game mistakes, and has no
  suboptimal/blunder concept to unify.
- Two severity levels ("suboptimal" and "blunder") share one screen layout; they are visually
  distinguished only by a severity indicator (label + color), not by different screen structure.
- Two detector-verified boards are the canonical fixtures for validating the double-threat highlight
  requirement (FR-020) end to end: movestring `41442625312235115445550126400` (first-player fork at
  cells `c1r4`/`c4r3`) and movestring `3333364101252113121524` (second-player fork at cells
  `c5r3`/`c7r2`). Any invalid or unverified example from earlier drafts of this work must not be used.
- Changing what a move-quality classifier computes, or which tactical patterns are detected, is out of
  scope; this feature only changes how already-computed results are unified, displayed, navigated to, and
  rendered without leaking internal tokens.
- The underlying reasoning/evidence engine that produces explanation content is not weakened, slowed
  down, or made less thorough by this work; only how its output is presented to players changes.
- "Ownership unknown" (e.g., in-app navigation contexts where an ownership flag hasn't been explicitly
  set to false) is treated the same as "owner" for purposes of showing "Mark as reviewed" — only an
  explicit non-owner determination hides it.
