# MVP Wireframe Plan — DecodeC4

## Overview

A single self-contained HTML file covering the five screens of the MVP
user journey. Pure HTML + CSS + vanilla JS (no frameworks). Wireframe
aesthetic: grayscale palette, real copy, placeholder boards. Interactive
enough to walk through the full flow end to end.

---

## Screens

| # | Screen | Purpose |
|---|---|---|
| 1 | Landing | Acquire visitor, deliver first puzzle, capture email |
| 2 | Puzzle Viewer | Core training loop — solve, fail, retry, read explanation |
| 2b | Session Snapshot | Post-session micro-feedback — accuracy, patterns, week delta |
| 3 | Free Limit / Paywall | Convert free user after value is experienced |
| 4 | Paid Dashboard | Blunder log + full puzzle library + progress trends |
| 5 | Import Review | Post-game analysis flow (paid) |

---

## Navigation Flow

```
Landing
  └─ "Start training" / demo solve → Puzzle Viewer
        └─ Solve puzzles 1–50
              └─ "End session" / back (any time) → Session Snapshot
                    └─ [Free] "Keep going" → Puzzle Viewer
                    └─ [Free] "See full progress" → Paywall
              └─ Puzzle 50 solved → Session Snapshot → Paywall
              └─ "Import game" click (any time) → Paywall
        └─ [Paid] → Paid Dashboard
              └─ "Blunder Log" tab → blunder cards
              └─ "Puzzle Library" tab → category grid
              └─ "Import game" → Import Review
                    └─ Review complete → back to Dashboard
              └─ blunder solved → Session Snapshot → Dashboard
```

Back navigation: every inner screen has a top-left "← back" link that
returns to the previous screen. No browser history manipulation.

---

## Technical Decisions

- **Single file.** All screens live in one HTML file as `<section>`
  elements. JS toggles `display:none / display:block` to navigate.
- **No framework.** Vanilla JS, CSS in `<style>`, no CDN dependencies
  so the file works offline and never breaks.
- **Wireframe palette.** Grayscale only. Avoids debating colors before
  layout is settled.
  - Background: `#f0f0f0`
  - Panels / cards: `#ffffff`
  - Borders: `#cccccc`
  - Primary text: `#222222`
  - Secondary text: `#888888`
  - Correct feedback: `#2d7a2d` (dark green, still readable in gray context)
  - Wrong feedback: `#8b0000` (dark red)
  - CTA buttons: `#222222` fill, `#ffffff` text
  - Disabled / gated: `#dddddd` fill, `#999999` text
- **Responsive.** Mobile-first CSS with a single breakpoint at 700px
  for desktop layouts.
- **Board interaction.** Pre-scripted, not real game logic. Column 4 is
  always "correct." Clicking any other column shows the wrong-move
  state; clicking column 4 shows the correct-move state then the
  explanation panel. Sufficient to validate the interaction pattern.
- **Real copy.** No lorem ipsum. Every headline, button label, and
  explanation uses the actual text from the MVP proposal and launch
  tactic.

---

## Screen 1 — Landing Page

### Purpose
Convert a sceptical competitive player into a first puzzle solve within
60 seconds. Email capture is secondary.

### Layout — mobile (single column, top to bottom)

```
┌─────────────────────────────────┐
│  DecodeC4              [Sign in]│  ← minimal header
├─────────────────────────────────┤
│                                 │
│  Stop guessing.                 │  ← H1, large
│  Start understanding.           │
│                                 │
│  50 mid-game Connect 4 puzzles  │  ← subheadline
│  with pattern-named             │
│  explanations. No account.      │
│  Free.                          │
│                                 │
├─────────────────────────────────┤
│  ── Try a puzzle now ──         │  ← section divider label
│                                 │
│  [Board: 6×7, mid-game state]   │  ← pre-loaded puzzle, interactive
│   1  2  3  4  5  6  7          │
│                                 │
│  Your turn. Find the best move. │  ← prompt, hidden after move
│                                 │
│  [Explanation panel — hidden    │  ← revealed after correct solve
│   until puzzle solved]          │
│                                 │
├─────────────────────────────────┤
│  [  Start training — 50 free  ] │  ← primary CTA, dark button
│     puzzles, no account         │
├─────────────────────────────────┤
│  Get notified when personalized │  ← email capture
│  coaching launches:             │
│  [email input    ] [Notify me]  │
├─────────────────────────────────┤
│  Competing apps show numbers.   │  ← brief differentiator
│  We explain why.                │
│                                 │
│  GameSolver.org → col 4 = +12   │
│  DecodeC4 → "Creates a fork:    │
│  vertical col 4 + diagonal col  │
│  3. Opponent can't block both." │
└─────────────────────────────────┘
```

### Layout — desktop (≥ 700px, two columns)

```
┌──────────────────────────────────────────────────────┐
│  DecodeC4                               [Sign in]    │
├──────────────────────────────────────────────────────┤
│                          │                           │
│  Stop guessing.          │  [Board: 6×7, mid-game]  │
│  Start understanding.    │   1  2  3  4  5  6  7    │
│                          │                           │
│  50 mid-game puzzles     │  Your turn.               │
│  with pattern-named      │  Find the best move.      │
│  explanations.           │                           │
│  No account. Free.       │  [Explanation — hidden    │
│                          │   until solved]           │
│  [Start training →]      │                           │
│                          │                           │
│  [email]  [Notify me]    │                           │
│                          │                           │
│  Competing apps show     │                           │
│  numbers. We explain why.│                           │
└──────────────────────────────────────────────────────┘
```

### Interactive elements
- Board columns: hover highlights column, click triggers correct/wrong
  feedback (pre-scripted: col 4 = correct).
- Correct move: piece appears in col 4, green banner "✓ Correct",
  explanation panel slides into view.
- Wrong move: red banner "Not the best move here — try again." One
  retry allowed, then hint text appears.
- "Start training" button: navigates to Screen 2, puzzle 1.

### Explanation panel (revealed after correct solve on landing)
```
┌─────────────────────────────────┐
│ ✓ Double-threat setup           │  ← pattern name, bold
│                                 │
│ This move creates two threats   │  ← 2-sentence explanation
│ simultaneously: vertical on     │
│ col 4 and diagonal on col 3.    │
│ The opponent can only block one.│
│                                 │
│ [  Start training — 49 more  ] ]│  ← CTA updates to "49 more"
└─────────────────────────────────┘
```

---

## Screen 2 — Puzzle Viewer

### Purpose
Deliver the core training loop: solve → feedback → explanation → next.
All 50 free puzzles live here.

### Layout — mobile

```
┌─────────────────────────────────┐
│ ← DecodeC4          12 / 50    │  ← header: back + progress
├─────────────────────────────────┤
│ [Fork Setup ×] [All] [Mate-in-N]│  ← category filter chips,
│ [Double Threat] [Zugzwang]      │    active chip has border
├─────────────────────────────────┤
│                                 │
│  [Board: 6×7, mid-game]         │
│   1  2  3  4  5  6  7          │
│                                 │
├─────────────────────────────────┤
│  Your turn. Find the best move. │  ← state: idle
│                                 │
│                    [Hint]       │  ← appears after wrong attempt
├─────────────────────────────────┤
│  [Explanation — hidden]         │  ← revealed on correct solve
└─────────────────────────────────┘
```

### States of the status + explanation area

**State A — Idle (waiting for move)**
```
┌─────────────────────────────────┐
│  Your turn. Find the best move. │
│                                 │
│  Category: Fork Setup           │
└─────────────────────────────────┘
```

**State B — Wrong move (first attempt)**
```
┌─────────────────────────────────┐
│  ✗ Not the best move here.      │
│    Try again.                   │
└─────────────────────────────────┘
```

**State C — Wrong move (second attempt) — hint unlocked**
```
┌─────────────────────────────────┐
│  ✗ Not quite.                   │
│                                 │
│  Hint: look for a move that     │
│  creates two threats at once.   │
└─────────────────────────────────┘
```

**State D — Correct move — explanation revealed**
```
┌─────────────────────────────────┐
│  ✓ Correct                      │
│                                 │
│  Fork Setup                     │  ← pattern name, bold
│                                 │
│  This move creates a fork:      │
│  vertical threat on col 4 and   │
│  diagonal threat on col 3.      │
│  The opponent cannot block      │
│  both simultaneously.           │
│                                 │
│  [        Next puzzle →       ] │
└─────────────────────────────────┘
```

### Layout — desktop (≥ 700px)

```
┌──────────────────────────────────────────────────────┐
│ ← DecodeC4                              12 / 50      │
├──────────────────────────────────────────────────────┤
│                          │                           │
│  [All] [Fork] [Mate-in-N]│  [Board: 6×7]            │
│  [Double] [Zugzwang]     │   1  2  3  4  5  6  7    │
│                          │                           │
│  ── Explanation ──       │                           │
│                          │                           │
│  [Revealed after solve]  │                           │
│                          │                           │
│  Fork Setup              │                           │
│  This move creates a     │                           │
│  fork: vertical on col 4 │                           │
│  and diagonal on col 3.  │                           │
│                          │                           │
│  [  Next puzzle →  ]     │                           │
│                          │                           │
│  ── Progress ──          │                           │
│  Puzzle 12 of 50         │                           │
│  ████████░░░░░░░░░░ 24%  │                           │
│                          │                           │
│  Correct first try: 8    │                           │
│  Needed hint: 3          │                           │
│  Missed: 1               │                           │
└──────────────────────────────────────────────────────┘
```

### Pulse survey (appears inline after puzzle 10, one time)
```
┌─────────────────────────────────┐
│  Was that explanation useful?   │
│  [Yes]  [Somewhat]  [Not really]│
└─────────────────────────────────┘
```
Tapping any option dismisses and proceeds to next puzzle.

### Puzzle 50 trigger
After solving puzzle 50, instead of "Next puzzle →", the button reads
"See your results →" which navigates to Screen 3 (Paywall).

---

## Screen 2b — Session Snapshot

### Purpose
Give the user a concrete sense of progress immediately after a session
ends. Free-tier shows in-session stats only; paid tier adds week-over-
week pattern deltas and any newly graduated patterns.

### Trigger contexts
- User clicks "End session" or navigates away from Puzzle Viewer after
  ≥ 1 puzzle solved.
- User solves their last due blunder-log entry in a review session.
- Always shown before the Paywall when puzzle limit is reached.

### Layout — mobile (free tier)

```
┌─────────────────────────────────┐
│ ← DecodeC4                      │
├─────────────────────────────────┤
│                                 │
│  Session complete               │  ← heading
│                                 │
│  ┌─────┐  ┌─────┐  ┌─────┐    │
│  │  8  │  │  6  │  │  2  │    │  ← stat tiles
│  │puzzl│  │ 1st │  │hint │    │
│  │ done│  │ try │  │used │    │
│  └─────┘  └─────┘  └─────┘    │
│                                 │
│  Patterns practiced:            │
│  Fork Setup · 4 ✓ 1 ✗          │  ← per-pattern accuracy, inline
│  Mate-in-2  · 3 ✓ 1 ✗          │
│                                 │
│  [  Keep going  ]               │  ← back to Puzzle Viewer
│  [  See full progress  ]        │  ← → Paywall (upsell hook)
│                                 │
└─────────────────────────────────┘
```

### Layout — mobile (paid tier, same session + week delta)

```
┌─────────────────────────────────┐
│ ← Dashboard                     │
├─────────────────────────────────┤
│                                 │
│  Session complete               │
│                                 │
│  ┌─────┐  ┌─────┐  ┌─────┐    │
│  │  8  │  │  6  │  │  2  │    │
│  │puzzl│  │ 1st │  │hint │    │
│  │ done│  │ try │  │used │    │
│  └─────┘  └─────┘  └─────┘    │
│                                 │
│  Your progress this week:       │
│                                 │
│  Fork Setup    40% → 75%  ↑    │  ← week-over-week delta
│  Mate-in-2     60% → 60%  →    │
│  Double threat 30% → 45%  ↑    │
│                                 │
│  ★ Pattern mastered             │  ← only shown if graduation event
│    Fork Setup — no longer in    │    triggered this session
│    your weak spots.             │
│                                 │
│  [  Back to Dashboard  ]        │
│                                 │
└─────────────────────────────────┘
```

### Layout — desktop

Same content, single centered column max-width 480px. No sidebar.

### Notes
- Stat tiles use the same `.stat-tile` component across free and paid.
- Week delta rows: ↑ green, → gray, ↓ red (dark-mode-safe hex values
  consistent with palette).
- "Pattern mastered" block is conditionally rendered; omit entirely if
  no graduation this session.
- "See full progress" CTA only shown in free tier and only if user has
  been in ≥ 2 sessions (first session, the upsell is premature).

---

## Screen 3 — Free Limit / Paywall

### Trigger contexts
- User solves puzzle 50.
- User clicks "Import game" from anywhere in the free tier.

### Layout — mobile

```
┌─────────────────────────────────┐
│ ← DecodeC4                      │
├─────────────────────────────────┤
│                                 │
│  You've completed all           │  ← context-sensitive headline:
│  50 free puzzles.               │    "Import is a Pro feature."
│                                 │    if triggered by import
│  You got 38/50 correct          │  ← only shown if puzzle-limit
│  on the first try.              │    trigger, not import trigger
│                                 │
│  Your weakest pattern:          │
│  Double-threat defense          │  ← based on session data
│  (missed 4 times)               │
│                                 │
├─────────────────────────────────┤
│         FREE          PRO       │
│         ────          ───       │
│  Puzzles  50        200+        │
│  Explanat. Generic  Personalized│
│  Blunder log  —      ✓         │
│  Game import  —      ✓         │
│  Cross-device —      ✓         │
├─────────────────────────────────┤
│                                 │
│  [ Start Pro — $4.99 / month  ] │  ← primary CTA
│  [ or $39 / year (save 35%)   ] │  ← secondary option
│                                 │
│  ── or ──                       │
│                                 │
│  [email input      ] [Notify me]│
│  Get notified at paid launch    │
│                                 │
│  [← Back to my puzzles]         │  ← let user replay free set
└─────────────────────────────────┘
```

### Layout — desktop

Same content, two-column: feature table left, CTA + pricing right.

---

## Screen 4 — Paid Dashboard

### Purpose
Home screen for paid users. Two tabs: Blunder Log (the retention engine)
and Puzzle Library (content access).

### Layout — mobile, Blunder Log tab active

```
┌─────────────────────────────────┐
│  DecodeC4              [Pro ▾]  │  ← header with account menu
├─────────────────────────────────┤
│  [Blunder Log]  [Puzzle Library]│  ← tabs
├─────────────────────────────────┤
│                                 │
│  5 positions ready for review   │  ← SR queue banner
│                                 │
│  ┌─────────────────────────┐    │
│  │ [board thumbnail 4×4]   │    │  ← blunder card 1
│  │ Double-threat defense   │    │
│  │ Missed · 3 days ago     │    │
│  │              [Review →] │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │ [board thumbnail 4×4]   │    │  ← blunder card 2
│  │ Fork Setup              │    │
│  │ Missed · 7 days ago     │    │
│  │              [Review →] │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │ [board thumbnail 4×4]   │    │  ← blunder card 3
│  │ Zugzwang                │    │
│  │ Missed · 7 days ago     │    │
│  │              [Review →] │    │
│  └─────────────────────────┘    │
│                                 │
│  ── Upcoming (not due yet) ──   │
│  Fork Setup · in 14 days        │
│  Mate-in-2 · in 21 days         │
│                                 │
│  [  Import a game  ]            │  ← secondary CTA
└─────────────────────────────────┘
```

### Layout — mobile, Puzzle Library tab active

```
┌─────────────────────────────────┐
│  DecodeC4              [Pro ▾]  │
├─────────────────────────────────┤
│  [Blunder Log]  [Puzzle Library]│
├─────────────────────────────────┤
│                                 │
│  ┌──────────┐  ┌──────────┐    │
│  │ Mate-in-N│  │   Fork   │    │  ← 2-column category grid
│  │  40 left │  │  Setup   │    │
│  │  60% acc │  │  30 left │    │
│  └──────────┘  │  75% acc │    │
│                │  ★ Master│    │  ← graduation badge if threshold
│                └──────────┘    │    met; card border changes
│  ┌──────────┐  ┌──────────┐    │
│  │ Double   │  │Zugzwang  │    │
│  │ Threat   │  │  12 left │    │
│  │  55 left │  │  50% acc │    │
│  │  45% acc │  │          │    │
│  └──────────┘  └──────────┘    │
│                                 │
│  ── Import & analyze ──         │
│  Paste a game from Papergames   │
│  or Ludoteka to auto-log your   │
│  blunders.                      │
│                                 │
│  [  Import a game  ]            │
└─────────────────────────────────┘
```

Category card states:
- Default: `#ffffff` background, count + accuracy shown.
- Mastered (≥ 80% accuracy, ≥ 10 attempts): `★ Mastered` label,
  border becomes `#2d7a2d`. Card still clickable for more practice.

### Layout — desktop (≥ 700px)

Three columns: sidebar (stats + progress + import) | main content (tab area) | nothing on the right (keep it sparse for launch).

```
┌──────────────────────────────────────────────────────┐
│  DecodeC4                               [Pro ▾]      │
├──────────────────────────────────────────────────────┤
│ ── Stats ──         │ [Blunder Log] [Puzzle Library] │
│                     │                                │
│ Total blunders: 22  │ 5 positions ready for review   │
│ Reviewed: 14        │                                │
│ Mastered: 8         │ [blunder card]                 │
│                     │ [blunder card]                 │
│ ── This month ──    │ [blunder card]                 │
│                     │                                │
│ Fork Setup  40→75%↑ │ ── Upcoming ──                 │
│ Mate-in-2   60→60%→ │ Fork Setup · in 14 days        │
│ Dbl threat  30→45%↑ │ Mate-in-2 · in 21 days         │
│                     │                                │
│ ── Import ──        │                                │
│                     │                                │
│ [Import a game]     │                                │
└──────────────────────────────────────────────────────┘
```

---

## Screen 5 — Import Review

### Purpose
Show the post-game X-AI annotation flow after a user imports a game
from Papergames or Ludoteka. Validates the import → analysis → blunder-
log-population loop.

### Layout — mobile

```
┌─────────────────────────────────┐
│ ← Dashboard         Import      │
├─────────────────────────────────┤
│                                 │
│  Paste your game moves          │  ← shown before import
│  (from Papergames or Ludoteka): │
│                                 │
│  [  4 4 4 5 3 3 2 ...        ] │  ← text input, move string
│                                 │
│  [     Analyze game     ]       │
│                                 │
├─────────────────────────────────┤
│  ── After analysis ──           │  ← below is the result state
│                                 │
│  Game vs. opponent · 32 moves   │
│  Result: You lost               │
│                                 │
│  3 blunders found:              │
│  Added to your blunder log.     │
│                                 │
│  ┌─────────────────────────┐   │
│  │ Move 14 — Your turn     │   │  ← blunder 1
│  │ [board thumbnail]       │   │
│  │ ✗ You played col 3      │   │
│  │ ✓ Best: col 5           │   │
│  │                         │   │
│  │ Fork Setup              │   │  ← pattern name
│  │ Col 5 creates a fork    │   │  ← explanation
│  │ that col 3 misses       │   │
│  │ entirely.               │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │ Move 22 — Your turn     │   │  ← blunder 2
│  │ [board thumbnail]       │   │
│  │ ✗ You played col 2      │   │
│  │ ✓ Best: col 4           │   │
│  │                         │   │
│  │ Double-threat defense   │   │
│  │ ...                     │   │
│  └─────────────────────────┘   │
│                                 │
│  [ Back to Dashboard ]          │
└─────────────────────────────────┘
```

---

## Component Inventory

Shared components that appear across multiple screens. Define once in
CSS, reuse everywhere.

| Component | Used in |
|---|---|
| `.board` — 6×7 grid of circles | Landing, Puzzle Viewer, Import Review cards |
| `.board--thumbnail` — 4×4 smaller version | Blunder Log cards |
| `.btn-primary` — dark fill, full width on mobile | All screens |
| `.btn-secondary` — outline only | Paywall, Dashboard |
| `.btn-ghost` — no border, just text | Back links |
| `.explanation-panel` — revealed state | Landing, Puzzle Viewer |
| `.blunder-card` — thumbnail + pattern + date + CTA | Dashboard, Import Review |
| `.category-chip` — filter pill, active state | Puzzle Viewer |
| `.progress-bar` — filled rect | Puzzle Viewer desktop |
| `.tab-bar` — two tabs, active underline | Dashboard |
| `.feature-table` — free vs paid comparison | Paywall |
| `.stat-tile` — large number + label | Session Snapshot |
| `.pattern-delta-row` — name + before/after % + arrow | Session Snapshot (paid), Dashboard sidebar |
| `.mastery-badge` — "★ Mastered" label + green border state | Puzzle Library cards |

---

## Board Representation

The wireframe board uses a CSS grid. Each cell is a circle (border-
radius 50%). Pre-defined fill states:

- `.cell--empty` → `#d0d0d0` (light gray)
- `.cell--red` → `#888888` (medium gray, represents human/red pieces)
- `.cell--yellow` → `#444444` (dark gray, represents AI/yellow pieces)
- `.cell--highlight` → dashed border, represents the correct move
  column

The board is pre-loaded with a realistic mid-game state defined as a
JS constant. Column click interaction is scripted (col 4 = correct,
anything else = wrong), not computed.

---

## Copy Decisions

All final copy from the MVP proposal and launch tactic, used verbatim
so the wireframe doubles as a content review:

| Element | Copy |
|---|---|
| H1 | "Stop guessing. Start understanding." |
| Sub-headline | "50 mid-game Connect 4 puzzles with pattern-named explanations. No account. Free." |
| Primary CTA | "Start training — 50 free puzzles, no account" |
| Email capture | "Get notified when personalized coaching launches" |
| Puzzle prompt | "Your turn. Find the best move." |
| Wrong move (1st) | "Not the best move here — try again." |
| Wrong move (hint) | "Hint: look for a move that creates two threats at once." |
| Correct | "✓ Correct" |
| Paywall headline (puzzles) | "You've completed all 50 free puzzles." |
| Paywall headline (import) | "Game import is a Pro feature." |
| Paywall CTA | "Start Pro — $4.99 / month" |
| Paywall alt | "or $39 / year (save 35%)" |
| Blunder queue banner | "5 positions ready for review" |
| Import prompt | "Paste your game moves (from Papergames or Ludoteka):" |
| Session snapshot heading | "Session complete" |
| Session snapshot free upsell | "See full progress" |
| Pattern mastered (snapshot) | "★ Pattern mastered — [Pattern] is no longer in your weak spots." |
| Pattern accuracy delta | "[Pattern name]  40% → 75%  ↑" |

---

## What the Wireframe Deliberately Omits

- Real game logic. One pre-scripted "correct" column per board.
- Authentication flow. Clicking "Start Pro" shows a placeholder
  "Checkout coming soon" screen.
- Actual AI explanations. All explanation text is static placeholder
  copy representing the final format.
- Animations. Static states only; transitions are instant.
- Error states. Network errors, invalid imports, full boards.
- Settings, account management, notifications.

These are all post-validation concerns. The wireframe validates
layout, copy, and flow — nothing else.
