# DecodeC4 — Implementation Epic Breakdown (Revised)

*Based on the mockup prototype (`docs/mvp/mockup/project/`), the existing codebase audit, product_vision.md, product_decisions.md, and lesson-curriculum.md.*

---

## Critique of the original proposal

Before the revised breakdown, here is what the first draft got wrong:

### 1. Epic 1 (Design System) was too large and under-scoped simultaneously

It listed the Board and CoachDialog as simple primitives alongside CSS tokens, but missed the most disruptive fact: the existing `App.jsx` uses `BrowserRouter` + `BottomNav` + `AppHeader` with `react-router-dom` and emoji icons. The mockup uses a flat state-based navigator with no BottomNav, no persistent AppHeader, and per-surface background tints. Swapping the routing architecture is a separate engineering task from building component primitives. Bundled together, the spec would exceed 300 lines and 25 tasks. Split into 1a (primitives) and 1b (shell + migration).

### 2. Epic 7 (Auth/Progress) is not MVP

`product_decisions.md` Gap 2 is explicit: *"No anonymous server rows are created for unauthenticated users. All data is lost when localStorage is cleared."* Every data type (lesson progress, challenge history, sparring record, streak) is localStorage for MVP. Account creation and server migration are post-MVP. Epic 7 was wrong to claim "without this, nothing persists across sessions." Removed from MVP scope.

### 3. Epic 3 (Sparring) was too large

Game Board + Difficulty Picker are one unit. Post-Game Review + Position Explorer are an entirely separate experience: new backend endpoints (`/api/games/analyze`, `/api/games/from-position`), lazy per-move analysis, timeline rewind logic, and try-alternative interactive board. These alone would produce 25+ tasks. Split into 3a and 3b.

### 4. Epic 5 (Lessons) was far too large

Entirely greenfield — no DB tables (lesson content lives in JSON files per Gap 5), no server routes, no UI screens. It conflated: infrastructure (saga map, concept/socratic screens, lesson routing), content authoring (11 lesson JSON files with positions and slides), and several minor backend additions (detectClaimodd, PATTERN_KB entries, narration templates). Each of those is a distinct work stream. Split into Epic 4 (infrastructure) and Epic 5 (content).

### 5. Epic 4 (Explanation Engine) conflated UI wiring with backend gaps

The proposed ordering (`Epic 1 → Epic 4 → Epic 2 → ...`) front-loaded backend detector work before any surface existed. But the existing `/api/explain-move-llm` already works for Tier 2. The detector gaps (detectClaimodd, overcut reason field, narration templates) are only needed when the corresponding lessons (7, 9, 10, 11) go live. These belong inside Epic 5 (Lesson Content), not in a standalone pre-requisite epic. What Epic 2 (Challenges) actually needs is a new `POST /api/evaluate-move` Tier 1 endpoint (badge + coach phrase + summary line) — that work belongs in Epic 2.

### 6. Dependency order was inverted

The proposed ship order put the Explanation Engine before Challenges, but Challenges can wire directly to the existing `/api/explain-move-llm` for Tier 2. The first deployable surface should be Challenges, not the explanation engine.

---

## Revised Epic Breakdown

---

### Epic 1a — Design Tokens & Component Library

All shared primitives. Nothing surface-specific. Pure build artifacts; no API calls.

**Scope:**

*CSS design tokens (`styles.css` or equivalent):*
- Semantic color variables: `--disc-green`, `--disc-gray`, `--eval-good`, `--eval-mid`, `--eval-bad`, `--eval-good-bg`; surface tints for Lessons / Challenges / Sparring / Home; `--lock`, `--lock-bg`, `--claim`
- Typography: Baloo 2 (display) + Nunito (body); size + weight scale
- Spacing, border-radius, shadow scale
- `@keyframes` for disc drop, pulse ring, bubble slide-in, spinner

*Shared primitive components:*
- `Icon` — SVG stroke icon set (back, chevR/L/D, gear, user, bulb, undo, flag, lock, check, star, arrowUp, play, search, retry, grad, target, swords, chart)
- `StatusBar` — top status row (time + signal + battery)
- `TopBar` — title, back button, meta slot, right icon buttons
- `ProgressBar` — horizontal fill strip with value/max or pct prop
- `Stars` — N of total filled stars
- `Toolbar` + `ToolButton` — fixed bottom action row

*Coach components:*
- `CoachAvatar` — SVG cartoon figure, 3 moods (happy / think / oops), size prop
- `CoachDialog` — fixed-height chat feed; avatar left + bubble stack right; newest bubble slides in; `faded` + `lead` bubble props; `fixed` prop for sparring mode

*Board component (complete redesign):*
- 7×6 grid, column-major; green + dark-gray discs (replace existing red/yellow)
- Column tap handler + hover arrow (chevD)
- Drop animation (`lastDrop` prop)
- Overlay system: `tg` (green translucent threat), `td` (gray translucent threat), `claim` (claimeven cell), `win` (win line)
- Column badge (`good` ✓ / `mid` ? / `bad` ✕)
- Compact mode (shrinks for post-game review)
- `fullCols` prop to block tapping full columns

*Other shared components:*
- `FeatureCard` — icon + title + subtitle + optional badge; two size variants (square 2-up and wide 1-up)
- `SetCard` — title + difficulty stars + position count; locked variant (grayed + padlock)
- `UpgradeModal` — sheet overlay: icon + heading + "join the waitlist" email input + dismiss; no payment

**NOT included:** routing, screens, API calls, per-surface background application.

**Estimated spec:** 150–170 lines. **Estimated tasks:** 14–16.

---

### Epic 1b — App Shell & Navigation Migration

Replace the existing routing architecture with the prototype's state-based navigator. Wire Home Hub and Stats screens with localStorage data.

**Scope:**

*Routing migration:*
- Remove `BrowserRouter`, `react-router-dom` routes, `BottomNav`, old `AppHeader`
- Replace with a single `App` state variable (current screen key) and a `go(screen)` dispatcher
- Screen registry mapping key → component (mirrors `app.jsx` in the mockup)
- Per-surface background tint: apply `--bg-lessons` / `--bg-challenges` / `--bg-sparring` / `--bg-home` based on active screen group

*Home Hub screen:*
- Top bar: app name left (DecodeC4), profile icon right (→ Stats)
- 2+1 feature card grid: Lessons (blue), Challenges (peach), Sparring (lavender)
- Daily Coach nudge: static Coach dialog with hardcoded placeholder phrase (dynamic nudge is Epic 6)
- "Progress & Stats" ghost button → Stats screen

*Stats screen (all values from localStorage):*
- Top stats card: avg accuracy, lessons done (N / 11), day streak
- "Accuracy by pattern" bar list — one row per classifier category that has any attempts, colored by quality threshold
- Sparring record: W / L / D
- Coach recommendation phrase + CTA to weakest lesson
- Empty state: show zeros, no gate (Gap 6c)
- localStorage read helpers: `getStats()`, `getLessonProgress()`, `getSparringRecord()`

*Shell cleanup:*
- Remove i18n / `useTranslation` usage
- Remove `ProfileStore` if unused by new screens
- Remove `DebugProvider` / `DebugContext` if unused
- Preserve existing admin/curation pages at `/admin/curate` (keep their BrowserRouter route separately or behind a hidden path)

**NOT included:** actual surface screens (Challenges, Lessons, Sparring), any API calls, auth.

**Estimated spec:** 120–140 lines. **Estimated tasks:** 10–13.

**Depends on:** Epic 1a.

---

### Epic 2 — Challenges Surface

The highest standalone value. First fully interactive surface. Redesigns the existing `PuzzlesPage.jsx` (708 lines); the new design adds Set Picker, 3 feedback layout variants, Deep Reveal panel, and Post-Set Summary which do not exist today.

**Frontend screens:**

*Set Picker (`setpicker` screen):*
- Scrollable list of `SetCard` components with category metadata
- Free sets unlocked; locked sets grayed + padlock; tap locked → `UpgradeModal`
- Back → Home Hub

*Challenge Board — pre-move (`challenge` screen):*
- TopBar (back → Set Picker, gear icon)
- Coach dialog: category-specific prompt (no label — "You can win right now. Find it." etc.)
- Progress indicator: "N / M" label + ProgressBar
- Interactive Board (no overlays until move committed)
- Toolbar: Hint (toggle column score heatmap) + spacer + Undo (disabled per Gap 8)
- Back-navigation dialog: "Leave this set? Your progress won't be saved." (Gap 14)

*Challenge Board — post-move (Tier 1 feedback, 3 layout variants):*
- Variant A (default): Tier 1 feedback strip below board (tag + lead + body + "Learn more ▼")
- Variant B (compact inline): badge + lead + body inside coach area, slim strip
- Variant C (docked card): white rounded card consolidating Coach + Tier 1 + "Learn more ▼"
- Evaluation badge on played column (✓ / ? / ✕)
- Coach phrase + mood derived from badge type
- Next → button advances to next position or Post-Set Summary

*Deep Reveal Panel (Tier 2):*
- Slide-up sheet over board (backdrop tap to dismiss)
- Loading state: spinner + "Reading the position…" (1–1.5s mock delay until API responds)
- Loaded: pattern tag(s), badge + quality label, compact annotated Board with overlays, LLM explanation text (2–4 sentences), "Best line" chip row with continuation moves
- On LLM timeout (>6s): show Tier 1 text + "Detailed explanation unavailable." (Gap 6b)

*Post-Set Summary:*
- Checkmark icon + "Set complete!" heading
- Optimal count + accuracy %; ProgressBar
- By-pattern breakdown rows (pattern name + score + quality dot)
- Coach phrase recommending weakest pattern's lesson (Gap 15 tie-break logic)
- CTA: "Go to [lesson name]" → navigate to lesson; disabled / shows upgrade if lesson is Pro-gated
- Secondary CTA: "Back to Challenges"
- Session data written to localStorage on summary screen load

**Backend / API (new work):**

- `POST /api/evaluate-move` — Tier 1 endpoint: `{ movestring, col }` → `{ badge, coachPhrase, coachMood, summaryLine, patternTag }`. Uses existing `classify()` + `c4solver` scores; phrase selected from phrase library. **This endpoint does not exist today.**
- Coach phrase library: JSON or in-memory map of `{ category × quality → string[] }` (3–5 variants each to avoid repetition); included with this epic's backend work
- Challenge-set metadata config: JS/JSON object mapping category key → `{ displayName, stars, description, free: bool }`; no DB table needed

**Data / localStorage:**
- Session state: current set category, current puzzle index, per-puzzle result (`{ puzzleId, playedCol, badge }`)
- Session written to `challenge_history[]` in localStorage on Post-Set Summary load
- Per-set accuracy computed client-side from session array

**NOT included:** actual detector improvements (those are Epic 5), lesson confirmation challenge mode (Epic 4), game history, auth.

**Estimated spec:** 200–220 lines. **Estimated tasks:** 18–21.

**Depends on:** Epic 1a, Epic 1b.

---

### Epic 3a — Sparring: Difficulty Picker & Game Board

Live game experience. Redesigns `HomePage.jsx` (560 lines, current sparring board) to match the new design: compact fixed-height Coach dialog, no overlays during play, difficulty-aware AI, deliberate mistake mechanic.

**Frontend screens:**

*Difficulty Picker (`difficulty` screen):*
- TopBar (back → Home Hub)
- Radio-row list: Easy / Medium (default) / Hard / Perfect, each with description subtitle
- "Play as" toggle: Green disc (moves first) vs Gray disc (moves second)
- Start game CTA → Game Board
- Difficulty and side stored in component state, passed as props to Game Board

*Game Board (`game` screen):*
- TopBar: "Game" title left, "Move N" center, gear icon right
- `CoachDialog` with `fixed` prop — always visible, never moves board
- Interactive Board: no automatic overlays during play; column drop animation
- Optional Hint heatmap: column scores as `heat-row` above board (user-triggered; dismissed on next move)
- Toolbar: Hint (toggle) + spacer + Resign (→ Post-Game Review)
- AI responds after user move with ~720ms delay; Coach reacts to every move (user good / user blunder / AI normal / AI deliberate mistake)
- Game-end detection: 4-in-a-row (win/loss) or board full (draw) → navigate to Post-Game Review
- Current game record written to localStorage: `{ movestring, difficulty, side, result, timestamp }`

**AI move logic (backend):**
- Difficulty → deliberate mistake rate (Gap 11): Easy ~every 4 moves, Medium ~every 7, Hard ~every 15, Perfect never
- When deliberate mistake fires: AI plays second-best move + emits Coach phrase "Oops. Did I just give you something?"
- Temperature-based sampling applies between deliberate mistakes
- Verify existing AI move endpoint supports difficulty param; add deliberate-mistake trigger logic if missing

**Coach phrase dispatch:**
- After user move: classify move quality via Tier 1 endpoint → select phrase from quality register
- After AI normal move: neutral phrase ("Your turn." / "Think carefully.")
- After AI deliberate mistake: "Oops. Did I just give you something?" (fixed)
- After user blunder: "Hmm. I'll take that."
- Coach mood updates on each phrase

**NOT included:** post-game analysis, timeline, Position Explorer.

**Estimated spec:** 150–170 lines. **Estimated tasks:** 14–16.

**Depends on:** Epic 1a, Epic 1b, Epic 2 (reuses `POST /api/evaluate-move` for real-time coach phrase).

---

### Epic 3b — Sparring: Post-Game Review & Position Explorer

Heavy analysis surface. Two new screens with new backend endpoints. Lazy analysis, timeline rewind, try-alternative mechanic.

**Frontend screens:**

*Post-Game Review (`review` screen):*
- TopBar: "Game Review" + search icon (Deepreveal shortcut) + gear
- Coach summary phrase at top (rendered once analysis completes)
- Compact Board (frozen at game end)
- Accuracy card: accuracy %, quality dot legend (optimal N / suboptimal N / blunder N)
- Move timeline: horizontal scrollable tape of nodes, color-coded by quality; `?` nodes for timed-out moves; "Move N and move M were the blunders." hint text
- Timeline nodes initially gray ("pending"); update to color as each move's score resolves (lazy streaming pattern)
- Tap non-optimal node → Position Explorer

*Analysis triggering (lazy — fires when review screen opens, Gap 4):*
- Client calls `POST /api/games/analyze` with full move sequence + difficulty
- Streams (or polls) results; update timeline nodes one by one as scores arrive
- Timeout per move: 8s → mark node `?`, excluded from accuracy denominator
- Accuracy display: round to nearest int; show `--` if `scored_moves === 0`

*Position Explorer (`explorer` screen):*
- TopBar: "Review" + "Move N / M"
- Coach dialog: explains the mistake (LLM via existing `/api/explain-move-llm`)
- Board rewound to mistake position: overlay user's played column in red (`tr`), opponent threat cells in gray (`td`)
- Legend row: "your move" (red swatch) + "opponent threat" (gray swatch)
- Interactive board below with prompt "Try a different move — tap any column."
- After user plays alternative: AI responds at same difficulty; Coach reacts; user can continue exploring
- "Start new game from here": calls `POST /api/games/from-position` → new game state; navigates to Game Board pre-loaded with opening moves
- Toolbar: Prev mistake / Next mistake navigation (skip optimal nodes; disabled if no more mistakes in direction)
- Back → Post-Game Review

**Backend / API (new):**

- `POST /api/games/analyze` — accepts `{ moves: string, difficulty }`, returns array of per-move analysis: `{ moveIndex, col, quality: 'optimal'|'suboptimal'|'blunder'|'unknown', score, bestScore }`. Runs c4solver on each user move (skips forced moves). 8s timeout per move → `quality: 'unknown'`. Also returns `accuracy` and `summary` phrase.
- `POST /api/games/from-position` — accepts `{ moves: string, N: int, difficulty, side }` → returns a game init payload (first N moves of `moves`) that the Game Board can use to pre-populate state.

**NOT included:** server-side game history persistence (localStorage covers MVP per Gap 2), auth, Deep Reveal integration on `?` nodes (Tier 1 fallback text shown inline — no LLM call).

**Estimated spec:** 180–200 lines. **Estimated tasks:** 16–19.

**Depends on:** Epic 3a (needs game record), Epic 2 (shares Deep Reveal panel).

---

### Epic 4 — Lesson Infrastructure & Saga Map

Entirely greenfield. No DB tables exist for lessons. Per Gap 5, content lives in JSON files in the repo; server loads them at startup; progress lives in localStorage.

**Frontend screens:**

*Saga Map (`saga` screen):*
- TopBar: "Lessons" + back → Home Hub
- Three visual variants (Variant C = clean list is minimum; A = winding path and B = meadow stones are polish — implement all three, toggle in prototype)
- Node states: done (green filled + checkmark), current (pulse ring), unlocked (outlined), locked (padlock + grayed)
- Pro badge on Lessons 8–11
- Tap done/current/unlocked → Concept Screen; tap locked → `UpgradeModal`

*Concept Screen (`concept` screen):*
- TopBar: lesson name + back → Saga Map; slide counter "N / M" in meta slot
- `CoachDialog`: multi-message feed (preceding messages faded, new message slides in)
- Static annotated Board: non-interactive; overlays from lesson JSON; legend row below board
- Info card below board for additional prose
- Continue → next slide, or Socratic Board (if lesson has one), or first Confirmation Challenge

*Socratic Board (`socratic` screen):*
- TopBar: lesson name + back → Concept
- Coach phrase: "I'm going to make a mistake here. See if you can punish it."
- Interactive Board at lesson's Socratic position
- States: `ask` → `wrong` (first attempt, Coach reacts, user tries again) → `correct` (Coach affirms) or 2nd wrong (correct column briefly highlighted as `win` overlay → auto-advance)
- Toolbar: Hint button (static; no server call in Socratic) + Continue button (appears on correct)

*Confirmation Challenges (`clchallenge` screen):*
- Reuses the existing Challenge Board component with a `lessonMode` flag
- Header shows lesson name ("← Claimeven — Practice") instead of "← Challenges"
- Progress tracks confirmation challenges (2–3 per lesson)
- "Next" on last challenge → return to Saga Map
- Lesson marked complete in localStorage (Gap 7 completion definition: past all slides + ≥ 1 correct answer)
- Replay behavior: completed node remains checked on replay

**Backend / API:**

- `GET /api/lessons` — returns array of `{ id, title, status }` where status is derived from localStorage on client (not server-computed for MVP); server just returns static lesson list
- `GET /api/lessons/:id` — returns lesson JSON: `{ id, title, slides: [{ coachMessages, boardSpec, overlays, legendItems, infoProse }], socratic: { boardSpec, correctCol } | null, confirmationCategory }`
- Server loads all lesson JSON files from `lessons/` directory at startup

**localStorage helpers:**
- `getLessonProgress()` → `{ [lessonId]: 'not_started' | 'in_progress' | 'complete' }`
- `setLessonComplete(id)` — writes immediately when last step submitted (Gap 7)
- `setLessonInProgress(id)` — writes when lesson is entered

**NOT included:** actual lesson JSON content (Epic 5), puzzle data population (Epic 6), auth.

**Estimated spec:** 200–230 lines. **Estimated tasks:** 17–20.

**Depends on:** Epic 1a, Epic 1b. (Can be developed in parallel with Epics 2 and 3a.)

---

### Epic 5 — Lesson Content (11 Lessons)

Content authoring + minor backend additions. One task per lesson JSON file, plus backend gaps from lesson-curriculum.md. The 11 lesson files are the primary deliverable.

**Content work (one JSON file per lesson):**

Each file: `lessons/lesson-NN-<slug>.json` containing slides array, optional Socratic position, confirmation challenge category. Board positions may be derived from the puzzle DB or hand-authored.

| Lesson | Main gap per curriculum | Backend addition |
|--------|------------------------|------------------|
| 1: Spot the Win | None | Add `immediate_threat` entry to `PATTERN_KB` in `llmCoachHelpers.js` |
| 2: Block Before You Build | None | Add `forced_block` entry to `PATTERN_KB` |
| 3: The Fork | None (already complete) | None |
| 4: Odd Rows Belong to Red | Reading-only, no Socratic | None |
| 5: Claimeven | Parity pre-filter for puzzle selection | Add narration prose for simulation trace |
| 6: Z-Threats | Narration template citing odd count | Template citing `badgeCount` from `highlightMetadata` |
| 7: Claimodd | **New detector** | Add `detectClaimodd` (~25 lines sync); add `PATTERN_KB.claimodd` entry |
| 8: Undercut | Generation-time query tweak | Puzzle filter: `detectUndercut` fires on non-`correct_col` column |
| 9: Overcut | Add `reason` field | Add `reason: string` (~10 lines) to `detectOvercut` result object |
| 10: Figure-7 | Narration template | Template citing both threat rows from `categoryEvidence.threat_cells` |
| 11: J-Shape | Narration template | Template citing triple-threat directions from `PATTERN_KB` |

**Challenge-set metadata:**
- `server/challengeSets.js` (or equivalent): maps category key → `{ displayName, stars, description, free: bool }` for all 8 sets
- Free sets: Spot the Win, Block Before You Build, The Fork, Claimeven, Z-Threats
- Pro-gated: Mixed, Undercut, Overcut, Figure-7, J-Shape

**NOT included:** puzzle DB population (Epic 6), infrastructure routing (Epic 4), auth.

**Estimated spec:** 180–200 lines (heavily table-driven). **Estimated tasks:** 18–22.

**Depends on:** Epic 4 (infrastructure must exist to serve the JSON files).

---

### Epic 6 — Data Pipeline & Puzzle Counts

Ensure the puzzle DB has sufficient approved positions for each active challenge set and each lesson's confirmation challenges.

**Scope:**

- Audit: run per-category count query; target ≥ 8 approved clean positions per active set
- Fill gaps: run puzzle factory for under-populated categories; submit for auto-approval where classifier confidence is high
- Claimeven pre-filter: at generation time, filter candidates by `colHeights` parity count ≤ 2 odd columns before running the expensive `detectClaimeven` simulation
- Claimodd puzzle generation predicate: all columns have `colHeight % 2 === 0` AND Red's turn AND center column not full AND `scores[3] === max(legal_scores)` AND `scores[3] > 0`
- Undercut puzzle framing query: filter for positions where `detectUndercut` fires on a non-`correct_col` column
- Hand-select lesson Socratic positions (one exploitable position per applicable lesson): document selected movestrings in lesson JSON files
- Validation script: for each lesson JSON, assert that all confirmation puzzle IDs exist in the DB as approved and have the correct category

**NOT included:** new detector code (that's Epic 5), auth, schema changes.

**Estimated spec:** 100–120 lines. **Estimated tasks:** 10–12.

**Depends on:** Epic 5 (needs final category list + detectClaimodd); can run partially in parallel from Epic 1b onward for categories that are already stable.

---

## Dependency Graph

```
Epic 1a (Design Tokens & Component Library)
  └─► Epic 1b (App Shell & Navigation Migration)
        ├─► Epic 2 (Challenges Surface)
        │     └─► Epic 3a (Sparring: Game Board)  [reuses /api/evaluate-move]
        │               └─► Epic 3b (Sparring: Post-Game Review & Explorer)
        ├─► Epic 4 (Lesson Infrastructure & Saga Map)
        │     └─► Epic 5 (Lesson Content — 11 Lessons)
        │               └─► Epic 6 (Data Pipeline)  [can also start earlier for stable categories]
        └─► Epic 3a (also depends on 1b directly)

Epic 6 can begin partial runs (immediate_win, forced_block, double_threat) as soon as the existing
puzzle factory is reachable (Epic 1b not required). Full validation requires Epic 5 to be complete.
```

**Parallelism opportunities:**
- Epic 2 (Challenges) and Epic 3a (Sparring Game) can be built in parallel once Epic 1b is done — they share only the `POST /api/evaluate-move` endpoint (which is small and can be done once)
- Epic 4 (Lesson Infra) can be started alongside Epic 2; it has no dependency on Challenges or Sparring
- Epic 6 data pipeline tasks for stable categories (Lessons 1–3) can run as soon as a developer is available, independently of UI work
- Backend detector work in Epic 5 (detectClaimodd, overcut reason) can be done while Epic 4 UI is in review

---

## Suggested Ship Order

```
Epic 1a → Epic 1b → Epic 2 → Epic 3a → Epic 3b
                  → Epic 4 → Epic 5 → Epic 6
```

First milestone (first deployable loop): **Epic 1a + 1b + 2** — Home Hub, Stats screen, full Challenges surface with Tier 1 + Tier 2 feedback.

Second milestone: **+ Epic 3a** — Sparring game board with Coach commentary.

Third milestone: **+ Epic 3b** — Post-Game Review and Position Explorer.

Fourth milestone: **+ Epic 4 + Epic 5 + Epic 6** — Full Lessons surface with all 11 lessons.

---

## Summary Table

| Epic | Surfaces / screens | New backend work | Spec (lines) | Tasks |
|------|-------------------|-----------------|-------------|-------|
| 1a. Design Tokens & Components | Shared primitives | None | 150–170 | 14–16 |
| 1b. App Shell & Navigation | Home Hub, Stats | None | 120–140 | 10–13 |
| 2. Challenges | Set Picker, Challenge Board (3 variants), Deep Reveal, Post-Set Summary | `POST /api/evaluate-move`, phrase library, set metadata | 200–220 | 18–21 |
| 3a. Sparring: Game Board | Difficulty Picker, Game Board | AI difficulty + deliberate mistake logic (extend existing) | 150–170 | 14–16 |
| 3b. Sparring: Post-Game Review + Explorer | Post-Game Review, Position Explorer | `POST /api/games/analyze`, `POST /api/games/from-position` | 180–200 | 16–19 |
| 4. Lesson Infrastructure & Saga Map | Saga Map (3 variants), Concept, Socratic, Confirmation Challenges | `GET /api/lessons`, `GET /api/lessons/:id`, localStorage helpers | 200–230 | 17–20 |
| 5. Lesson Content | — (content + backend additions) | detectClaimodd, PATTERN_KB entries, narration templates, overcut reason | 180–200 | 18–22 |
| 6. Data Pipeline | — (data work) | Puzzle factory runs, filter predicates, validation script | 100–120 | 10–12 |
| **Total** | | | **1280–1450** | **117–139** |

**Post-MVP (not in this breakdown):**
- Epic 7: User Auth & Server-Side Progress Persistence (Supabase auth, server rows, localStorage migration)
- Lesson 12: Zugzwang Basics (new multi-column Z-Threat aggregation predicate)
- Lesson 13: Ghost Threats (new async detector)
- Saga Map variant A and B polish (clean-list variant C ships first)
