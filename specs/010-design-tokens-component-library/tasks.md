# Tasks: Design Tokens & Component Library (Epic 1a)

**Input**: Design documents from `/specs/010-design-tokens-component-library/`
**Prerequisites**: plan.md ✓, spec.md ✓, data-model.md ✓, contracts/board-api.md ✓, quickstart.md ✓
**Branch**: `101-new-design`

**Verification**: Manual via `quickstart.md` — no automated tests in this epic.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no cross-task dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Token file, Google Fonts, and `Icon` must exist before any component that consumes CSS variables or renders icons.

**⚠️ CRITICAL**: No component work can begin until this phase is complete.

- [X] T001 Add Google Fonts preconnect + `<link>` for Baloo 2 (weights 400 700) and Nunito (weight 400) to `connect-four/index.html` so `var(--font-display)` and `var(--font-body)` render correctly in all downstream components
- [X] T002 Create `connect-four/src/styles/tokens.css` — define all CSS custom properties (FR-001–FR-007): semantic color tokens (`--disc-green`, `--disc-green-hi`, `--disc-gray`, `--disc-gray-hi`, eval tokens, board tokens, threat/overlay tokens, lock tokens, surface-tint tokens `--bg-home/lessons/chal/spar`), typography tokens (`--font-display`, `--font-body`), layout tokens (`--radius`, `--radius-sm`, `--shadow`, `--shadow-sm`); and `@keyframes` for FR-008: `drop`, `pulse`, `bubbleIn`, `spin`, `popIn`, `slideUp`, `fade`, `ring`
- [X] T003 Import `connect-four/src/styles/tokens.css` at app root in `connect-four/src/main.jsx` (single import, before all other stylesheets); verify via DevTools that `--disc-green` resolves to `#2faa5a`
- [X] T004 Create `connect-four/src/components/Icon.jsx` — renders one of 20 named SVG icons (`back`, `chevR`, `chevL`, `chevD`, `gear`, `user`, `bulb`, `undo`, `flag`, `lock`, `check`, `star`, `arrowUp`, `play`, `search`, `retry`, `grad`, `target`, `swords`, `chart`) with props `name`, `size` (default 22), `color` (default `currentColor`), `strokeWidth` (default 2.4); stroke style, `fill:none`, `strokeLinecap:round`, `strokeLinejoin:round`; unknown `name` renders empty `<svg>` without throwing (FR-009, FR-010)

**Checkpoint**: Tokens loaded, fonts linked, Icon available — all component work can now begin.

---

## Phase 3: User Story 1 — Board (Priority: P1) 🎯 MVP

**Goal**: Deliver the redesigned `Board` component with the new green/gray disc palette, locked overlay/badge API, multi-select support (US2), and sequence mode (US3). This phase also builds the simple primitives that Board and the rest of the library depend on.

**Independent Test** (from quickstart.md §2–§5): Navigate to Puzzles — discs are green/gray; hover shows chevD arrow; overlays render as colored rings; a `forced_win` puzzle plays multiple moves without locking; a `forbidden_columns` puzzle shows red tint + ✕ badge on toggled columns.

- [X] T005 [P] [US1] Create `connect-four/src/components/StatusBar.jsx` (time string left, signal bars + Wi-Fi arc + battery pill right; `time` prop default `"9:41"` — FR-011, FR-012), `ProgressBar.jsx` (`value`/`max` or `pct` prop, filled green strip — FR-015), and `Stars.jsx` (`n`/`total` props, faded stars at `opacity: 0.28`, clamp `n` — FR-016)
- [X] T006 [P] [US1] Create `connect-four/src/components/TopBar.jsx` (optional back button, Baloo 2 700 19 px title, optional meta, up to two right icon buttons via `Icon` — FR-013, FR-014), `Toolbar.jsx` (fixed-bottom frosted-glass row — FR-017), and `ToolButton.jsx` (icon above label, `color` prop — FR-018)
- [X] T007 [US1] Redesign `connect-four/src/components/Board.jsx` in-place — absorb `Column.jsx` and `Piece.jsx` logic inline then delete both files; implement: green (`--disc-green`) disc for `'red'` board values and dark-gray (`--disc-gray`) disc for `'yellow'` board values, no hard-coded red/yellow/orange color values anywhere; `overlays` prop (array of `{c, r, type}`, types `tg|td|tr|claim|win` — **`tr` is a fifth case not in the mockup comment; add it**); `badge` prop (`{col, type, label}`, types `good|mid|bad`); `lastDrop` prop triggers `drop` CSS animation class; `compact` prop (9px/6px vs 11px/7px); `fullCols` prop; `canPlay` gate; chevD hover arrow above non-full interactive columns via `Icon`; `selectedCols` + `onColToggle` multi-select mode — red tint + ✕ badge on selected columns, suspends `onColumnClick` when `onColToggle` is provided (FR-032–FR-034); `interactionMode='sequence'` never self-locks (FR-035); `highlightedCells` deprecated shim prop retained for `CurationWorkspace.jsx` only — inlines the old `Piece.jsx` highlight rendering logic for curation roles (FR-026 note, contracts/board-api.md); do not remove `onColumnClick` from the public API (FR-026)

**Checkpoint**: Board fully functional in Puzzles — green/gray discs, overlays, multi-select, and sequence mode all verified manually.

---

## Phase 4: User Story 4 — UpgradeModal (Priority: P1)

**Goal**: Replace all `PaywallModal` / Stripe-redirect paths with a waitlist-capture bottom sheet. UpgradeModal must be complete before the migration phase can start.

**Independent Test** (from quickstart.md §6): Trigger via Coach page — email input present; "Notify me" disabled when empty; fill email → button enables; submit shows confirmation; no network request to `/api/stripe/*`.

- [X] T008 [US4] Update `connect-four/src/i18n/en.json` — add `upgrade.*` namespace (`heading`, `body`, `cta`, `placeholder`, `success`, `error`, `dismiss`) and `common.*` namespace (`dismiss`, `confirm`) per data-model.md i18n key map; remove the entire `paywall.*` namespace (FR-043)
- [X] T009 [US4] Create `connect-four/src/components/UpgradeModal.jsx` — bottom sheet overlay with grab handle, icon (`Icon` component), heading, waitlist email `<input>`, "Notify me" CTA (disabled when email empty), dismiss control; internal `idle | success | error` states; `onDismiss` and `onNotify(email)` props; `popIn` / `slideUp` / `fade` animations from tokens; all strings via `t('upgrade.*')` i18n keys; no Stripe checkout initiated (FR-040, FR-041, SC-007)

**Checkpoint**: UpgradeModal renders in isolation with correct states; zero Stripe-related network calls.

---

## Phase 5: Caller Migration (depends on T007 Board + T009 UpgradeModal)

**Goal**: Migrate all five retired-API callers so the live app continues to work after the Board and UpgradeModal changes.

**⚠️ CRITICAL**: All four tasks depend on both T007 and T009 completing first. The four tasks within this phase are independent of each other.

- [X] T010 [P] [US1] Migrate `connect-four/src/pages/PuzzlesPage.jsx` — replace `highlightedCells` + `highlightMetadata` board props with `overlays`; replace the `forbidden_columns` `'selected'`-role highlight pattern with `selectedCols={Array.from(selectedForbiddenCols)}` + `onColToggle`; move the forbidden-columns toggle out of `handleColumnClick` into an `onColToggle` callback; **preserve `handleForbiddenSubmit` verbatim — do not rewrite its logic**; swap `PaywallModal` import for `UpgradeModal`, switch to mount/unmount conditional render, drop `trigger`/`session` props, wire `onNotify` no-op (FR-044, FR-045)
- [X] T011 [P] [US3] Migrate `connect-four/src/components/SequenceHandler.jsx` — replace `highlightedCells={[]}` prop with `overlays={[]}` and add `interactionMode="sequence"` prop to its Board render; no other changes (FR-044, SC-005)
- [X] T012 [P] [US4] Migrate `connect-four/src/pages/CoachPage.jsx` — swap `PaywallModal` import for `UpgradeModal`, switch to mount/unmount conditional render, drop `trigger`/`session` props, wire `onNotify` no-op (FR-045)
- [X] T013 [US4] Migrate `connect-four/src/components/DeepRevealButton.jsx` — swap `PaywallModal` import for `UpgradeModal`, switch to mount/unmount conditional render, wire `onNotify` no-op; then delete `connect-four/src/components/PaywallModal.jsx` (all three importers must be migrated before deletion — confirm T010 and T012 are done first) (FR-042, FR-045)

**Checkpoint** (quickstart.md §7–§8): `rg "PaywallModal" connect-four/src/` → zero results; `rg "highlightedCells|highlightMetadata" connect-four/src/` → zero results.

---

## Phase 6: User Story 5 — CoachDialog (Priority: P3)

**Goal**: Deliver the coach feedback UI with avatar mood states and animated message bubbles.

**Independent Test** (from spec US5): Render `CoachDialog` with two messages; add a third — `bubbleIn` animation fires on the new bubble; `fixed=true` shows frosted-glass feed.

- [X] T014 [US5] Create `connect-four/src/components/CoachAvatar.jsx` — SVG cartoon figure (bearded, glasses, teal sweater) in three `mood` states: `happy` (smile), `think` (flat mouth), `oops` (downturned eyes + open mouth); `size` prop (default 58), SVG scales proportionally (FR-019, FR-020)
- [X] T015 [US5] Create `connect-four/src/components/CoachDialog.jsx` — `CoachAvatar` left, vertical bubble feed right; avatar mood from last message's `mood` field; fixed visual window (~2 bubbles), internal scroll to latest; each new bubble animates in with `bubbleIn` (translateY 8px → 0, 320ms cubic-bezier); `faded` bubble at `opacity: 0.28` (**not 0.50** — spec edge-case section overrides spec body and mockup CSS); bubble keys use insertion index (not `m.text`) to ensure `bubbleIn` fires on genuinely new messages even when text is repeated; `lead` bold display-font line; `evalNum` float-right chip; `fixed=true` uses frosted-glass `.fixed-feed` style (semi-transparent white, border-radius 18px, backdrop-blur) (FR-021–FR-024)

**Checkpoint**: CoachDialog renders with animation, faded bubbles at 0.28 opacity, frosted-glass variant confirmed in browser.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Remaining card components and mandatory architecture documentation update.

- [X] T016 [P] Create `connect-four/src/components/FeatureCard.jsx` (52×52 px icon container, Baloo 2 700 19 px title, 13 px subtitle, `onClick`, optional `badge` slot, `wide` prop for full-width vs square variant — FR-036, FR-037) and `connect-four/src/components/SetCard.jsx` (`Stars` difficulty, Baloo 2 700 16 px title, position-count meta, `locked` prop uses `--lock-bg` + dimmed title + `lock` Icon — FR-038, FR-039)
- [X] T017 Update `docs/architecture/frontend-conventions.md` Board Component API section — document new `overlays` / `badge` / `selectedCols` / `onColToggle` / `interactionMode` props with their locked enum values; mark `highlightedCells` as deprecated (curation shim only); remove references to `highlightMetadata` (plan.md Principle VIII)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: No external dependencies — start immediately. BLOCKS all component work.
- **Phase 3 (Board + primitives)**: Depends on Phase 2 (tokens, fonts, Icon ready). T005 and T006 can run in parallel.
- **Phase 4 (UpgradeModal)**: Depends on Phase 2 only. Can run in parallel with Phase 3.
- **Phase 5 (Migration)**: Depends on **both** T007 (Board) AND T009 (UpgradeModal). T010–T013 can then run in parallel.
- **Phase 6 (CoachDialog)**: Depends on Phase 2 only. Can run in parallel with Phases 3–5.
- **Phase 7 (Polish)**: Depends on all prior phases complete.

### Critical Path

```
T001 → T002 → T003 → T004
                          ↓
               T005, T006 → T007 ─────────────┐
                                               ↓
               T008 → T009 ───────────── T010, T011, T012, T013
                                               ↓
                                          T016, T017
```

### Parallel Opportunities

```bash
# Phase 2 tasks are sequential (T001→T002→T003→T004 — each depends on the previous)

# Phase 3 + 4 can overlap once Phase 2 is done:
# Dev A: T005, T006, T007  (Board path)
# Dev B: T008, T009        (UpgradeModal path)
# Dev C: T014, T015        (CoachDialog path — only needs Phase 2)

# Phase 5 — four migrations in parallel once T007+T009 are both done:
# T010 || T011 || T012 || T013
```

---

## Implementation Strategy

### MVP First (P1 stories: US1 + US4)

1. Complete Phase 2 (Foundational — CRITICAL)
2. Run Phase 3 and Phase 4 in parallel (Board + UpgradeModal)
3. Complete Phase 5 (Migration — unlocks after both P1 stories done)
4. **STOP and VALIDATE**: run all quickstart.md checkpoints §1–§8
5. Phase 6 + 7 add US5 and polish

### Verification Checkpoints (quickstart.md)

| After | Check |
|-------|-------|
| T003 | DevTools Computed: `--disc-green` = `#2faa5a` |
| T007 | Puzzles: green/gray discs, chevD arrow, overlays render |
| T011 | `forced_win` puzzle: first move → board stays playable → second move succeeds |
| T010 | `forbidden_columns`: tap two columns → red tint + ✕; submit fires correctly |
| T013 | `rg "PaywallModal" connect-four/src/` → zero results |
| T013 | `rg "highlightedCells\|highlightMetadata" connect-four/src/` → zero results |
| T009 | UpgradeModal: email empty → CTA disabled; fill + submit → confirmation; no `/api/stripe/*` request |
| T015 | CoachDialog: third message animates in; faded bubble at 0.28 opacity |

---

## Notes

- **Path convention**: all source under `connect-four/src/` — not the repo root `src/`.
- **`tr` overlay**: not in the mockup board.jsx comment (`tg|td|claim|win`); it **must** be added as a fifth case in T007. See contracts/board-api.md FR-027.
- **Faded bubble opacity**: `0.28` — the spec edge-case section overrides both the spec body (0.50) and the mockup CSS (0.50). Hard-code `0.28` in T015.
- **`handleForbiddenSubmit`**: preserve verbatim in T010 — only rewire its board-state outputs from `highlightedCells` mutation to `onColToggle` callbacks.
- **PaywallModal deletion** (T013): only safe after T010 and T012 confirm zero `PaywallModal` imports remain in `PuzzlesPage` and `CoachPage`.
- **`highlightedCells` shim** (T007): implements the old `[row, col, role, step?]` tuple rendering inlined from `Piece.jsx` — for `CurationWorkspace.jsx` only. Never document or expose this prop to downstream epics.
- **Column.jsx + Piece.jsx deletion** is part of T007 — do not create a separate deletion task.
