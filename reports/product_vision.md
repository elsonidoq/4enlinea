# DecodeC4 — Product Vision
*Goal: sufficient detail for a designer agent to produce mockups of all screens and navigation flows.*

---

## What This App Is

A Connect Four mastery app built around one principle: **explanation before repetition**. Every surface teaches the *why* behind a move — through a Coach that speaks to you, through targeted prompts that name the task, and through retrospective review that anchors learning to moments that actually mattered in your game.

The Coach Avatar is the single voice across all surfaces. It speaks in short phrases — compliments, reactions, narration — and occasionally makes a deliberate mistake to let the user exploit it (Socratic move). It never produces walls of text during play.

---

## Explanation System: Two Tiers

Every piece of feedback has two layers. This affects what the Coach says and what UI states exist:

**Tier 1 — Instant Feedback (always shown)**
Rule-based classifier + solver scores. Fires immediately after every move. Powers the Coach's short reaction phrase and the evaluation badge. No loading state. Example: *"Good block. You stopped an immediate win."*

**Tier 2 — Deep Reveal (on demand)**
LLM explanation grounded in the classifier output and KB patterns. Richer, 2–4 sentences, with an annotated board. Triggered by tapping "Learn more" in Challenges, or by tapping a move in the post-game review. May have a brief loading state (1–2 seconds).

Both tiers always exist. The design must account for the Instant Feedback state as the default and the Deep Reveal as a secondary, expandable state.

---

## Screen Inventory & Navigation

### Top-level flow

```
Home (Hub)
├── Lessons
│   ├── Saga Map
│   └── Lesson [N]
│       ├── Concept screen (one or more slides)
│       ├── Socratic board (optional, in some lessons)
│       └── Confirmation challenges (2–3 puzzles)
│
├── Challenges
│   ├── Set Picker
│   ├── Challenge Board
│   └── Post-Set Summary
│
└── Sparring
    ├── Difficulty Picker
    ├── Game Board (Coach present throughout)
    └── Post-Game Review
        └── Position Explorer (rewind + try alternative → new game)
```

---

## Screen-by-Screen Specification

---

### Screen 1 — Home (Hub)

The entry point. Three feature cards in a 2+1 grid layout. Secondary stats at the bottom.

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
│  │Learn why │ │Find the   │  │
│  │patterns  │ │best move  │  │
│  │win       │ │           │  │
│  └──────────┘ └───────────┘  │
│                              │
│       ┌────────────┐         │
│       │  Sparring  │         │
│       │  [icon]    │         │
│       │ Play a bot │         │
│       └────────────┘         │
│                              │
│     [Progress & Stats →]     │
└──────────────────────────────┘
```

**Components:**
- Top bar: app name (left), profile/account icon (right)
- Three feature cards: icon + title + one-line subtitle
- Small "Progress & Stats" text link at the bottom

**Navigation:**
- Tap Lessons → Saga Map
- Tap Challenges → Set Picker
- Tap Sparring → Difficulty Picker
- Tap Progress → Stats screen

---

### Screen 2 — Saga Map (inside Lessons)

A vertical, winding path of lesson nodes. This is the Lessons home screen. Reflects the 11 MVP lessons in curriculum order.

**Layout:**
```
┌──────────────────────────────┐
│  ← Lessons                   │
├──────────────────────────────┤
│                              │
│    ● 1. Spot the Win      ✓  │
│   /                          │
│  ● 2. Block Before You Build ✓│
│   \                          │
│    ● 3. The Fork          ✓  │
│   /                          │
│  ● 4. Odd Rows Belong to Red ✓│
│   \                          │
│    ● 5. Claimeven         ← current (pulse) │
│   /                          │
│  ● 6. Z-Threats           🔒 │
│   \                          │
│    ● 7. Claimodd          🔒 │
│   /                          │
│  ● 8. The Undercut        🔒 │
│   \                          │
│    ● 9. The Overcut       🔒 │
│   /                          │
│  ● 10. The Figure-7 Trap  🔒 │
│   \                          │
│    ● 11. The J-Shape      🔒 │
│                              │
└──────────────────────────────┘
```

**Node states:**
- Completed: filled circle + checkmark
- Current: filled circle + animated pulse ring
- Next (unlocked but not started): outlined circle
- Locked (paid tier): grayed circle + padlock icon

**Lesson unlocking rule:** each lesson unlocks after the previous one is completed. Lessons 1–7 are free tier. Lessons 8–11 require paid tier (or show a locked card with upgrade prompt).

**Navigation:**
- Tap completed or current node → Lesson Concept screen
- Tap locked node → upgrade prompt modal

---

### Screen 3 — Lesson: Concept Screen

The Coach introduces the pattern. Most lessons have 1–2 concept slides before the interactive portion.

**Layout:**
```
┌──────────────────────────────┐
│  ← Claimeven            2/3  │  ← slide progress (top right)
├──────────────────────────────┤
│  ┌──────┐                    │
│  │Coach │ "Yellow's secret:  │  ← Coach Avatar Dialog
│  │Avatar│  always respond    │
│  └──────┘  above Red. Every  │
│            time."            │
│                              │
│  [Annotated board diagram]   │  ← static, illustrative
│  — claimeven cells glow      │    colored overlays on
│    yellow                    │    the critical cells
│  — response arrows shown     │
│                              │
│         [Continue →]         │
└──────────────────────────────┘
```

**Coach Avatar Dialog:**
- Portrait (left) + speech bubble (right)
- Short phrases — 1–2 sentences max
- Conversational, not academic

**Board diagram:**
- Non-interactive
- Threat cells: translucent colored overlay in the relevant player's color
- Arrows or badges highlighting the key move or response

**Navigation:**
- Continue → next concept slide, or Socratic Board (if lesson includes one), or first Confirmation Challenge

---

### Screen 4 — Lesson: Socratic Board (some lessons)

The Coach makes a deliberate mistake and names it. The user exploits it.

**Layout:**
```
┌──────────────────────────────┐
│  ← Claimeven                 │
├──────────────────────────────┤
│  ┌──────┐                    │
│  │Coach │ "I'm going to make │
│  │Avatar│  a mistake here —  │
│  └──────┘  see if you can    │
│            punish it."       │
│                              │
│  [Interactive board]         │
│  — Coach has just played     │
│                              │
│  [Action Toolbar]            │
└──────────────────────────────┘
```

**After the user plays:**
- Correct: *"Exactly. You saw the pairing."*
- Wrong (first attempt): Coach reacts briefly, user tries again
- Wrong (second attempt): the correct column is briefly highlighted before moving on

**Navigation:**
- Correct move → next slide or first Confirmation Challenge

---

### Screen 5 — Challenge: Set Picker

Entry to the Challenges surface. The user chooses a themed set or mixed drill.

**Why the picker exists:** knowing you're in a "Forced Block" set tells you *someone is about to win*, but you still have to scan the board to find which column to block — the recognition task is intact. The picker also creates a direct loop from lesson to targeted drill: after completing Lesson 5 (Claimeven), the user can immediately practice that specific pattern. The "Mixed" set preserves full blind recognition for users who want no orientation at all.

**Layout:**
```
┌──────────────────────────────┐
│  ← Challenges                │
├──────────────────────────────┤
│  Choose a set                │
│                              │
│  ┌──────────────────────┐    │
│  │ Mixed — all patterns │    │
│  │ ★★★  8 positions    │    │
│  └──────────────────────┘    │
│  ┌──────────────────────┐    │
│  │ Spot the Win         │    │
│  │ ★☆☆  8 positions    │    │
│  └──────────────────────┘    │
│  ┌──────────────────────┐    │
│  │ Block Before You Build│   │
│  │ ★☆☆  8 positions    │    │
│  └──────────────────────┘    │
│  ┌──────────────────────┐    │
│  │ The Fork             │    │
│  │ ★★☆  8 positions    │    │
│  └──────────────────────┘    │
│  ┌──────────────────────┐    │
│  │ … more sets …        │    │
│  └──────────────────────┘    │
│  ┌──────────────────────┐    │
│  │ The Undercut  🔒      │    │
│  └──────────────────────┘    │
│                              │
└──────────────────────────────┘
```

**Set cards:** title, difficulty stars, position count. Locked sets: grayed + padlock.

**Navigation:**
- Tap unlocked set → Challenge Board (first position in set)
- Tap locked set → upgrade prompt

---

### Screen 6 — Challenge Board

The core training loop. A board position with a targeted prompt. No category label.

**Layout:**
```
┌──────────────────────────────┐
│  ┌──────┐                    │
│  │Coach │ "You can win right │  ← targeted prompt,
│  │Avatar│  now. Find it."    │    no category label
│  └──────┘                    │
│                              │
│  [Progress bar  ███░░░░░ ]   │  ← position N of M
│                              │
│  [Interactive board]         │
│                              │
│  [Action Toolbar]            │
│  Hint        Undo            │
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
| Claimeven | *"Yellow can control the endgame here. How?"* |
| Z-Threat | *"Own a column. Find the odd threat."* |
| Compound / mixed | *"This position is complex. Play your best move."* |

---

### Screen 7 — Challenge Board: Post-Move Feedback

Immediately after the user plays a move.

**Layout:**
```
┌──────────────────────────────┐
│  ┌──────┐                    │
│  │Coach │ "Nice. You saw the │  ← Tier 1: instant,
│  │Avatar│  diagonal threat." │    rule-based reaction
│  └──────┘                    │
│                              │
│  [Board with badge on played │  ← evaluation badge on
│   column]                    │    the played column:
│                              │    green ✓ / orange ? / red ✗
│  ┌──────────────────────┐    │
│  │ Optimal move.        │    │  ← Tier 1 summary line
│  │ Builds a fork...     │    │    (always shown)
│  │ Learn more ▼         │    │  ← expands to Tier 2
│  └──────────────────────┘    │
│                              │
│         [Next →]             │
└──────────────────────────────┘
```

**Coach short-phrase register (Tier 1, instant):**
- Optimal: *"Nice! You saw that fork."* / *"Exactly right."* / *"Perfect."*
- Suboptimal: *"Close — there was something better."* / *"Good instinct, not quite there."*
- Blunder: *"Hmm. Yellow's going to like that."* / *"That opens the door."*

**Navigation:**
- Tap "Learn more" → Deep Reveal Panel (Screen 8) slides up
- Tap "Next" → next position, or Post-Set Summary if last

---

### Screen 8 — Deep Reveal Panel (Tier 2)

Slides up over the board on tap. Full LLM explanation. Brief loading state possible.

**Layout:**
```
┌──────────────────────────────┐
│  ▼ Collapse                  │
├──────────────────────────────┤
│  Pattern: Double Threat      │  ← pattern tag(s)
│  Your move: col 4  ✓ Optimal │
│                              │
│  [Annotated board]           │  ← non-interactive, overlays
│  — threat cells highlighted  │    show winning threats
│                              │
│  "Playing col 4 creates two  │  ← LLM explanation
│   simultaneous threats on    │    (2–4 sentences)
│   row 3 and the diagonal.    │
│   Yellow can only block one."│
│                              │
│  Best line:                  │
│  Col 4 → Col 2 → Col 6 …    │  ← optional continuation
└──────────────────────────────┘
```

---

### Screen 9 — Post-Set Summary

After the last position in a challenge set.

**Layout:**
```
┌──────────────────────────────┐
│  Set complete!               │
│                              │
│  6 / 8 optimal moves  75%    │
│  ████████░░                  │
│                              │
│  By pattern:                 │
│  Immediate win     5/5   ✓   │
│  Forced block      1/3   ⚠   │
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

### Screen 10 — Sparring: Difficulty Picker

```
┌──────────────────────────────┐
│  ← Sparring                  │
├──────────────────────────────┤
│  Choose difficulty           │
│                              │
│  ○ Easy                      │
│  ● Medium           ← default│
│  ○ Hard                      │
│  ○ Perfect                   │
│                              │
│  Play as:  [Red]  [Yellow]   │
│                              │
│         [Start game →]       │
└──────────────────────────────┘
```

---

### Screen 11 — Sparring: Game Board

The Coach is **always present and always speaking** — but in a compact form that never touches the board. Short phrases only. The Coach makes deliberate mistakes and says so; it also reacts to the user's every move.

**Layout:**
```
┌──────────────────────────────┐
│  ← Game       Move 14  [⚙]  │
├──────────────────────────────┤
│  ┌──────┐                    │
│  │Coach │ "I'm not sure      │  ← compact Coach dialog,
│  │Avatar│  about that        │    always visible, always
│  └──────┘  last move…"       │    short (5–10 words)
│                              │
│  [Interactive board]         │  ← board is completely
│  — no automatic overlays     │    uncluttered during play
│                              │
│  [Action Toolbar]            │
│  Hint(opt)     Resign        │
└──────────────────────────────┘
```

**Coach phrase types during sparring:**
- After the AI plays a normal move: *"Your turn."* / *"Think carefully."*
- After the AI makes a deliberate mistake: *"Oops. Did I just give you something?"* / *"I'm going to regret that."*
- After the user plays a good move: *"Nice move."* / *"You saw it."*
- After the user plays a mistake: *"Hmm."* / *"I'll take that."*
- Neutral acknowledgement: *"Interesting."* / *"Let's see."*

The Coach dialog area is fixed height — it never expands or shifts the board. If there is nothing notable to say, the Coach is silent (empty bubble or no bubble).

**Optional hint heatmap:** user-initiated only. Tapping Hint shows column scores as an overlay. Dismissed on next move.

**Navigation:**
- Tap column → move committed, AI responds, Coach reacts
- Game ends → Post-Game Review (Screen 12)

---

### Screen 12 — Sparring: Post-Game Review

The depth layer. Fires automatically when the game ends.

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
│  Optimal ●●●  Good ●●        │
│  Suboptimal ○   Blunder ✗    │
│                              │
│  [Move timeline]             │
│  ◀ 1 2 3 4 5 6 7✗ 8 9 … ▶  │
│    color-coded by quality    │
└──────────────────────────────┘
```

**Move timeline nodes:**
- Green = optimal
- Orange = suboptimal
- Red = blunder
- Tap any node → board rewinds, Position Explorer activates (Screen 13)

**Navigation:**
- Tap timeline node → Position Explorer
- Tap Back → Home

---

### Screen 13 — Post-Game: Position Explorer

The user has tapped a mistake on the timeline. The board shows the position at that moment.

**Layout:**
```
┌──────────────────────────────┐
│  ← Review        Move 7 / 22 │
├──────────────────────────────┤
│  ┌──────┐                    │
│  │Coach │ "You played col 3. │
│  │Avatar│  Yellow now has an │
│  └──────┘  odd threat you    │
│            can't stop."      │
│                              │
│  [Board at move 7]           │
│  — your move: red overlay    │
│    on the column you played  │
│  — opponent threat: translucent yellow │
│    on the threat cell        │
│                              │
│  Try a different move:       │
│  [Interactive board]         │
│                              │
│  [Start new game from here]  │
│  [← Prev mistake] [Next mistake →] │
└──────────────────────────────┘
```

**After the user tries an alternative move:**
- The engine responds; the Coach reacts with a short phrase
- The user can continue exploring from that position

**"Start new game from here":**
- Creates a new sparring game in the DB whose opening is the first N moves of the current game (moves 1 through the rewound point)
- The user continues from that exact position against the bot at the same difficulty level
- The original reviewed game is preserved in history

**Navigation:**
- "Start new game from here" → Sparring Game Board (Screen 11), pre-loaded with opening moves
- Prev / Next mistake → navigate between flagged nodes on the timeline
- Back → Post-Game Review (Screen 12)

---

## UI Component System

| Component | Description | Surfaces |
|---|---|---|
| **Coach Avatar Dialog** | Portrait (left) + speech bubble (right). Fixed height. Short phrases during play; 1–2 sentences in lesson/review contexts. | All |
| **Interactive Grid Canvas** | 7×6 board. Base: board + discs. Secondary: translucent colored cell overlays. Tertiary: evaluation badges on columns. | All |
| **Evaluation Badge** | Small circular icon on the played column. Green ✓ = optimal, orange ? = suboptimal, red ✗ = blunder. | Challenges, Post-game |
| **Saga Map** | Vertical winding path. Node states: completed (checkmark), current (pulse), unlocked (outlined), locked (padlock). | Lessons |
| **Progress Bar** | Horizontal strip, fills left-to-right. Position N of M in a set or lesson. | Challenges, Lessons |
| **Move Timeline** | Horizontal scrollable tape of move nodes, color-coded by quality. Tap to rewind. | Post-game review |
| **Action Toolbar** | Fixed bottom row. Context-sensitive: Hint / Undo / Resign in sparring; Next / Skip in challenges. | All |
| **Tier 1 Feedback Strip** | Single-line summary below the board after a move. Always shown, instant. Expands to Deep Reveal on tap. | Challenges |
| **Deep Reveal Panel** | Slides up from bottom. Pattern tags, annotated board, LLM explanation, optional continuation. | Challenges, Post-game |
| **Post-Session Modal / Summary Screen** | Accuracy %, quality breakdown, Coach phrase, recommended next action. | Challenges, Sparring |
| **Set Card** | Title, difficulty stars, position count. Locked variant: grayed + padlock. | Challenge Set Picker |
| **Locked Feature Card** | Grayed card with padlock badge. Tappable to show upgrade prompt. | Saga Map, Set Picker |

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

1. **Mobile-first, vertical stack.** Top: Coach Avatar (fixed height). Center: 7×6 grid (fixed aspect ratio, never compressed). Bottom: Action Toolbar / Progress Bar.
2. **The board is never cluttered during play.** Overlays and badges only appear after a move is committed or in lesson/review mode.
3. **Two explanation tiers, always.** Tier 1 (instant, rule-based) is always shown. Tier 2 (Deep Reveal, LLM) is always available on tap. The design must show both states.
4. **The Coach is always visible, always brief.** Fixed-height dialog above the board. 5–10 words during play, silence when nothing is notable. Never expands or shifts the board.
5. **Progressive disclosure.** Tier 1 summary = default. Deep Reveal = opt-in. Post-game review = always available, not forced.
6. **Socratic move is named explicitly.** When the Coach makes a deliberate mistake in lessons or sparring, it says so in the speech bubble. The board does not highlight the mistake — the user must find it.
