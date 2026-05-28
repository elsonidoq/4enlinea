# DecodeC4 — Product Vision
*Goal: sufficient detail for a designer agent to produce mockups of all screens and navigation flows.*

---

## What This App Is

A Connect Four mastery app built around one principle: **explanation before repetition**. Every surface teaches the *why* behind a move — through a Coach that speaks to you, through targeted prompts that name the task, and through retrospective review that anchors learning to moments that actually mattered in your game.

The Coach Avatar is the single voice across all surfaces. It speaks in short phrases — compliments, reactions, narration — and occasionally makes a deliberate mistake to let the user exploit it (Socratic move). It never gives walls of text during play.

---

## Screen Inventory & Navigation

### Top-level flow

```
Home (Hub)
├── Lessons
│   ├── Saga Map
│   └── Lesson [N]
│       ├── Concept screen
│       ├── Socratic board (optional, in some lessons)
│       └── Confirmation challenges (2–3 puzzles)
│
├── Challenges
│   ├── Set picker
│   ├── Challenge board
│   └── Post-set summary
│
└── Sparring
    ├── Difficulty picker
    ├── Game board
    └── Post-game review
        └── Position explorer (rewind + try alternative)
```

---

## Screen-by-Screen Specification

---

### Screen 1 — Home (Hub)

The entry point. Three feature cards in a 2+1 grid layout. Secondary stats access at the bottom or top bar.

**Layout:**
```
┌──────────────────────────────┐
│  DecodeC4              [👤]  │
├──────────────────────────────┤
│                              │
│  ┌──────────┐ ┌───────────┐  │
│  │ Lessons  │ │ Challenges│  │
│  │          │ │           │  │
│  │ [icon]   │ │  [icon]   │  │
│  └──────────┘ └───────────┘  │
│                              │
│       ┌────────────┐         │
│       │  Sparring  │         │
│       │  [icon]    │         │
│       └────────────┘         │
│                              │
│     [Progress & Stats →]     │
└──────────────────────────────┘
```

**Components:**
- Top bar: app name (left), profile/account icon (right)
- Three feature cards: each has an icon, a title, and a one-line subtitle (e.g., *"Learn why patterns win"* / *"Find the best move"* / *"Play a bot, review your game"*)
- Small "Progress & Stats" text link or icon row at the bottom
- Locked feature cards show a padlock badge for paid patterns (if applicable)

**Navigation:**
- Tap Lessons → Saga Map
- Tap Challenges → Set Picker
- Tap Sparring → Difficulty Picker
- Tap Progress → Stats screen (secondary, not MVP-critical)

---

### Screen 2 — Saga Map (inside Lessons)

A vertical, winding path of numbered lesson nodes. This is the Lessons home screen.

**Layout:**
```
┌──────────────────────────────┐
│  ← Lessons                   │
├──────────────────────────────┤
│                              │
│         ●  1. Immediate Threat  ✓  │
│        /                     │
│       ●  2. Forced Block  ✓   │
│        \                     │
│         ●  3. Double Threat  ← current (pulsing) │
│        /                     │
│       ●  4. Fork Setup  🔒    │
│        \                     │
│         ●  5. Claimeven  🔒   │
│                              │
└──────────────────────────────┘
```

**Node states:**
- Completed: filled circle + checkmark
- Current: filled circle + animated pulse ring
- Locked (free user): grayed circle + padlock icon

**Navigation:**
- Tap completed or current node → Lesson Concept screen
- Tap locked node → Paywall / upgrade prompt

---

### Screen 3 — Lesson: Concept Screen

The Coach introduces the pattern before the user touches the board.

**Layout:**
```
┌──────────────────────────────┐
│  ← Double Threat             │
├──────────────────────────────┤
│  ┌──────┐                    │
│  │Coach │ "Two threats at    │  ← Coach Avatar Dialog
│  │Avatar│  once. Your         │
│  └──────┘  opponent can only  │
│            block one."        │
│                              │
│  [Annotated board diagram]   │  ← static board with
│  — threat cells glow red/yel │    colored overlays on
│  — decisive column has arrow │    the critical cells
│                              │
│         [Continue →]         │
└──────────────────────────────┘
```

**Coach Avatar Dialog:**
- Portrait (left) + speech bubble (right)
- Short phrases only — 1–2 sentences max
- Tone is conversational, not academic

**Board diagram:**
- Non-interactive, illustrative
- Threat cells: translucent colored overlay in the relevant player's color
- Decisive column: subtle downward arrow or badge above the column

**Navigation:**
- Continue → next concept screen (if multi-step) or Socratic Board (if lesson includes one) or first Confirmation Challenge

---

### Screen 4 — Lesson: Socratic Board (optional, some lessons)

The Coach deliberately plays a bad move and tells the user. The user's job is to exploit it.

**Layout:** identical to the Challenge Board (Screen 6), with one addition:

```
┌──────────────────────────────┐
│  ┌──────┐                    │
│  │Coach │ "I'm going to      │
│  │Avatar│  make a mistake —  │
│  └──────┘  find the punish." │
│                              │
│  [Interactive board]         │
│                              │
│  [Action Toolbar]            │
└──────────────────────────────┘
```

After the user plays the correct punishing move, the Coach reacts:
- Correct: *"Exactly. That's the fork."*
- Wrong: *"Not quite — Yellow still has time to defend. Try again."*

The board briefly highlights the correct column before moving on (only on second failed attempt).

---

### Screen 5 — Challenge: Set Picker

Entry to the Challenges surface. The user selects a themed set or mixed drill.

**Layout:**
```
┌──────────────────────────────┐
│  ← Challenges                │
├──────────────────────────────┤
│  Choose a set                │
│                              │
│  ┌──────────────────────┐    │
│  │ Mixed (all patterns) │    │
│  │ ★★★  8 positions    │    │
│  └──────────────────────┘    │
│  ┌──────────────────────┐    │
│  │ Immediate Threats    │    │
│  │ ★☆☆  8 positions    │    │
│  └──────────────────────┘    │
│  ┌──────────────────────┐    │
│  │ Forced Block         │    │
│  │ ★☆☆  8 positions    │    │
│  └──────────────────────┘    │
│  ┌──────────────────────┐    │
│  │ Fork Setup  🔒        │    │
│  └──────────────────────┘    │
│                              │
└──────────────────────────────┘
```

**Components:**
- Set cards: title, difficulty stars, position count
- Locked cards: grayed out with padlock, tappable to show upgrade prompt

**Navigation:**
- Tap unlocked set → Challenge Board (first position in set)

---

### Screen 6 — Challenge Board

The core training loop. A board position is shown with a targeted prompt. No category label is visible.

**Layout:**
```
┌──────────────────────────────┐
│  ┌──────┐                    │
│  │Coach │ "You can win right │  ← targeted prompt,
│  │Avatar│  now. Find it."    │    never generic
│  └──────┘                    │
│                              │
│  [Progress bar  ███░░░░░ ]   │  ← position N of M in set
│                              │
│  [Interactive board]         │
│                              │
│  [Action Toolbar]            │
│  Hint   Undo                 │
└──────────────────────────────┘
```

**Prompts by predicate (category label always hidden):**

| Predicate | Prompt |
|---|---|
| Immediate win | *"You can win right now. Find it."* |
| Forced block | *"Yellow is about to win. Stop it."* |
| Forbidden column | *"One column here is a trap. Don't touch it."* |
| Double threat | *"Set up two threats at once."* |
| Fork (figure-7 / j-shape) | *"Create a fork your opponent can't answer."* |
| Compound / mixed | *"This position is complex. Play your best move."* |

**After the user plays a move — inline feedback:**

```
┌──────────────────────────────┐
│  ┌──────┐                    │
│  │Coach │ "Nice. You saw the │  ← 1-line coach reaction
│  │Avatar│  diagonal threat." │
│  └──────┘                    │
│                              │
│  [Board with badge on played │  ← evaluation badge on
│   column: green ✓ / orange ? │    the column played
│   / red ✗]                   │
│                              │
│  [Expandable explanation]    │  ← collapsed by default
│  "Optimal. Builds a fork ... │    tap to expand Deep Reveal
│   [Learn more ▼]"            │
│                              │
│         [Next →]             │
└──────────────────────────────┘
```

**Coach short-phrase register:**
- Optimal move: *"Nice! You saw that fork."* / *"Exactly right."* / *"Perfect."*
- Suboptimal: *"Close — there was something better."* / *"Good instinct, not quite optimal."*
- Blunder: *"Hmm. Yellow's going to like that."* / *"That opens the door."*

**Navigation:**
- Tap column → move committed, inline feedback shown
- Tap "Learn more" → Deep Reveal panel slides up
- Tap "Next" → next position in set, or Post-Set Summary if last

---

### Screen 7 — Challenge: Deep Reveal Panel

Slides up over the board on tap. Full explanation of the position.

**Layout:**
```
┌──────────────────────────────┐
│  ▼ Collapse                  │
├──────────────────────────────┤
│  Pattern: Double Threat      │  ← pattern tag(s)
│  Your move: col 4  ✓ Optimal │
│                              │
│  [Board with threat overlays]│  ← annotated, non-interactive
│                              │
│  "Playing col 4 creates two  │  ← LLM explanation
│   simultaneous threats on    │    (2–4 sentences)
│   row 3 and the diagonal.    │
│   Yellow can only block one."│
│                              │
│  Best continuation:          │
│  Col 4 → Col 2 → Col 6 ...   │  ← optional line preview
└──────────────────────────────┘
```

---

### Screen 8 — Post-Set Summary

Shown after the last position in a challenge set.

**Layout:**
```
┌──────────────────────────────┐
│  Set complete!               │
│                              │
│  6 / 8 optimal moves         │
│  ████████░░  75%             │
│                              │
│  By pattern:                 │
│  Immediate threat   5/5  ✓   │
│  Forced block       1/3  ⚠   │
│                              │
│  ┌──────┐                    │
│  │Coach │ "Forced blocks are │
│  │Avatar│  your weak spot.   │
│  └──────┘  Try that lesson." │
│                              │
│  [Go to Forced Block lesson] │
│  [Back to Challenges]        │
└──────────────────────────────┘
```

---

### Screen 9 — Sparring: Difficulty Picker

```
┌──────────────────────────────┐
│  ← Sparring                  │
├──────────────────────────────┤
│  Choose difficulty           │
│                              │
│  ○ Easy                      │
│  ● Medium          ← default │
│  ○ Hard                      │
│  ○ Perfect                   │
│                              │
│  [Play as Red / Yellow]      │
│                              │
│         [Start game →]       │
└──────────────────────────────┘
```

---

### Screen 10 — Sparring: Game Board

Clean during play. No automatic post-move coaching. Optional overlays only if user turns them on.

**Layout:**
```
┌──────────────────────────────┐
│  ← Game     Move 14    [⚙]  │
├──────────────────────────────┤
│                              │
│  [Interactive board]         │
│  — no overlays by default    │
│                              │
│  [Action Toolbar]            │
│  Hint(opt)  Resign           │
└──────────────────────────────┘
```

**No Coach Avatar during play.** The board is uncluttered. The user develops board vision without the app playing for them.

**Navigation:**
- Tap column → move committed, AI responds
- Tap Hint → optional heatmap overlay (user-initiated only)
- Game ends (win/loss/draw) → Post-Game Review

---

### Screen 11 — Sparring: Post-Game Review

The depth layer. Fires after game ends. This is where the Coach speaks.

**Layout:**
```
┌──────────────────────────────┐
│  ← Game Review               │
├──────────────────────────────┤
│  ┌──────┐                    │
│  │Coach │ "Good game. One    │
│  │Avatar│  parity mistake    │
│  └──────┘  decided it."      │
│                              │
│  [Board — frozen at game end]│
│                              │
│  Accuracy: 82%               │
│  ●●●○  Optimal  ●●○  Good   │
│  ○  Suboptimal  ✗  Blunder  │
│                              │
│  [Move timeline]             │
│  ← 1 2 3 4 5 6 7✗ 8 9 →   │
│  color-coded by quality      │
└──────────────────────────────┘
```

**Move timeline nodes:**
- Green = optimal
- Orange = suboptimal
- Red = blunder
- Tap any node → board rewinds to that position (Screen 12)

**Navigation:**
- Tap timeline node → Position Explorer
- Tap "Back" → Home

---

### Screen 12 — Post-Game: Position Explorer

User rewound to a specific mistake. They can try a different move.

**Layout:**
```
┌──────────────────────────────┐
│  ← Review   Move 7           │
├──────────────────────────────┤
│  ┌──────┐                    │
│  │Coach │ "You played col 3. │
│  │Avatar│  Yellow now has an │
│  └──────┘  odd threat you    │
│            can't stop."      │
│                              │
│  [Board at move 7]           │
│  — blunder column highlighted│
│    in red overlay            │
│  — opponent threat shown in  │
│    translucent yellow        │
│                              │
│  Try a different move:       │
│  [Interactive board]         │
│                              │
│  [← Prev mistake] [Next mistake →] │
└──────────────────────────────┘
```

After the user plays an alternative move, the engine responds and the Coach reacts:
- *"Better — that neutralizes the threat."*
- *"Still not enough — Yellow has another path."*

---

## UI Component System

| Component | Description | Surfaces |
|---|---|---|
| **Coach Avatar Dialog** | Portrait (left) + speech bubble (right). Short phrases only — 5–10 words during play, 1–2 sentences for explanations. | All |
| **Interactive Grid Canvas** | 7×6 board. Base: board + discs. Secondary: translucent colored cell overlays. Tertiary: evaluation badges on columns. | All |
| **Evaluation Badge** | Small circular icon on the played column. Green ✓ = optimal, orange ? = suboptimal, red ✗ = blunder. | Challenges, Post-game |
| **Saga Map** | Vertical winding path of lesson nodes. States: completed (checkmark), current (pulse), locked (padlock). | Lessons |
| **Progress Bar** | Horizontal strip, fills left-to-right. Shows position N of M in a challenge set. | Challenges |
| **Move Timeline** | Horizontal scrollable tape of move nodes, color-coded by quality. Directional arrows for step-back/forward. | Post-game review |
| **Action Toolbar** | Fixed bottom row. Context-sensitive buttons per surface. | All |
| **Deep Reveal Panel** | Slides up from bottom. Pattern tags, annotated board, LLM explanation, optional continuation line. | Challenges |
| **Post-Session Modal / Summary Screen** | Accuracy %, quality breakdown, Coach summary phrase, recommended next action. | Challenges, Sparring |
| **Set Card** | Title, difficulty stars, position count. Locked variant: grayed + padlock. | Challenge set picker |
| **Locked Feature Card** | Blurred/grayed card with padlock badge. Tappable to show upgrade prompt. | Saga Map, Set Picker |

---

## Semantic Color System

| Role | Color | Applied to |
|---|---|---|
| Optimal / best move | Green | Badges, timeline nodes, board overlays |
| Suboptimal / small miss | Orange | Badges, timeline nodes, Coach tip accent |
| Blunder / critical failure | Red | Badges, timeline nodes, board overlays |
| User's discs (Red player) | Red (solid) | Board pieces |
| Opponent's discs (Yellow player) | Yellow (solid) | Board pieces |
| User threat highlight | Translucent red | Cell overlay |
| Opponent threat highlight | Translucent yellow | Cell overlay |
| Locked / unavailable | Gray + padlock | Feature cards, Saga nodes |

---

## Layout Principles

1. **Mobile-first, vertical stack.** Top: Coach Avatar. Center: 7×6 grid (fixed aspect ratio, never compressed). Bottom: Action Toolbar / Progress Bar.
2. **The board is never cluttered during play.** Overlays and badges only appear after a move is committed or in lesson/review mode.
3. **Progressive disclosure.** Coach dialog = 1-line summary by default. Full Deep Reveal on tap.
4. **The Coach is always the voice.** Every piece of feedback — lesson explanation, post-move reaction, post-game summary — comes through the Avatar dialog. Never a toast, never a system alert.
5. **Short phrases during play, depth after.** The Coach speaks in 5–10 word phrases while the user is playing. Longer explanations only appear in the Deep Reveal panel or post-game review.
