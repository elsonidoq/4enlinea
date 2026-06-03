# Data Model: Lesson Content (Epic 5)

## Lesson JSON Schema

### File location
`connect-four/lessons/lesson-NN-<slug>.json` where NN = 01–11 (zero-padded 2-digit order).

### Validation
Performed by `server/lessonLoader.js` at server startup. Malformed files are logged and excluded.

### Schema

```typescript
interface Lesson {
  // Required fields
  id: string;                    // Slug matching filename, e.g. "lesson-05-claimeven"
  title: string;                 // Display name
  free: boolean;                 // true for lessons 1–7, false for 8–11 (Pro)
  userPerspective: "red" | "yellow";  // Which player the learner controls
  slides: Slide[];               // Non-empty array of concept slides
  
  // Socratic board (null for reading-only lessons)
  socratic: SocraticConfig | null;
  
  // Confirmation challenge config (null for reading-only lessons)
  confirmationCategory: string | null;  // Category slug for puzzle draw
  confirmationCount: number;           // Integer >= 0, number of puzzles to draw
}

interface Slide {
  coachMessages: CoachMessage[];
  boardSpec: string[7];          // Column-major, bottom-to-top: 'g'=green(Red), 'd'=gray(Yellow)
  overlays: Overlay[];
  legendItems: LegendItem[];
  infoProse: string;
}

interface CoachMessage {
  text: string;                  // Message text (English — used as defaultValue for i18n)
  lead?: string;                 // Optional lead/speaker tag
  faded?: boolean;               // Greyed out (previous message)
  mood?: "happy" | "think" | "oops";
}

interface Overlay {
  c: number;                     // Column (0-indexed, 0–6)
  r: number;                     // Row (0-indexed, 0–5)
  type: "tg" | "td" | "claim" | "win";  // Locked overlay enum
}

interface LegendItem {
  type: "tg" | "td" | "claim" | "win";
  label: string;                 // Legend text (English — used as defaultValue for i18n)
}

interface SocraticConfig {
  boardSpec: string[7];          // Same format as Slide.boardSpec
  correctCol: number;            // 0-indexed column (0–6) that wins
}
```

### BoardSpec format
- Array of exactly 7 strings, one per column (index = column number, 0-indexed)
- Each string: characters from bottom to top
  - `'g'` = Green disc (player 1 / Red, renders green on board)
  - `'d'` = Gray disc (player 2 / Yellow, renders gray on board)
  - Empty string `""` = empty column
- Example: `["dg", "g", "dgd", "gdg", "dg", "d", ""]`

### Overlay type enum (LOCKED — cross-epic contract)

| Value | Visual | Usage in lessons |
|---|---|---|
| `tg` | green translucent ring | Player threat highlight / winning move |
| `td` | gray translucent ring | Opponent threat highlight |
| `claim` | amber translucent fill | Claimeven cell, Claimodd center anchor |
| `win` | pulsing green outline | Winning-line flash (Socratic correct) |

**`tr` is NOT used in lesson content** (FR-003) — it is reserved for Position Explorer.

---

## Backend Data (Existing — Extended in This Epic)

### PATTERN_KB (`llmCoachHelpers.js`)

```typescript
// Existing structure — entries added:
PATTERN_KB = {
  immediate_threat: { inline: string },  // NEW
  forced_block:     { inline: string },  // NEW
  claimodd:         { inline: string },  // NEW (or { id: 'community-claimodd' })
  // ... existing entries unchanged
}
```

### DETECTOR_REGISTRY (`explainSimulate.js`)

```typescript
// New entry added to DETECTOR_REGISTRY array:
{
  name: 'claimodd',
  fn: detectClaimodd,       // sync function
  isAsync: false,
  histType: 'col'            // column-level histogram
}
```

### detectClaimodd return type (`classifier.js`)

```typescript
{
  matched: boolean;          // true when position exhibits claimodd
  correctCol: number | null; // 3 (center column, 0-indexed) when matched
}
```

### detectOvercut extended return type (`classifier.js`)

```typescript
{
  matched: boolean;
  correctCol: number | null;
  reason: string | null;     // NEW: null when matched === false;
                             // Values: "same_parity_t4" | "active_forcing" |
                             //         "chain_t2" | "minor_threat" when matched === true
  // ... existing fields unchanged
}
```

### Category registration (`server/categories.js` + `src/lib/categories.js`)

```typescript
// Both files updated identically:
VALID_CATEGORIES: Set([
  'immediate_threat', 'forced_block', 'double_threat',
  'forced_win', 'forbidden_columns',
  'z_threat', 'claimeven', 'claimodd',    // ← NEW: claimodd added here
  'undercut', 'overcut', 'figure_7', 'j_shape',
]);

PAID_CATEGORIES: Set([          // UNCHANGED — claimodd NOT added
  'mixed', 'undercut', 'overcut', 'figure_7', 'j_shape',
]);

CATEGORY_ORDER: [               // claimodd inserted after z_threat
  'immediate_threat', 'forced_block', 'double_threat',
  'forced_win', 'forbidden_columns',
  'z_threat', 'claimeven', 'claimodd',    // ← NEW
  'undercut', 'overcut', 'figure_7', 'j_shape',
];
```

### challengeSets.js

```typescript
// New entry — added after the `z_threat` entry (or after `claimeven` — follows alphabetical/display order):
{ slug: 'claimodd', displayNameKey: 'challengeSet.claimodd.displayName',
  descriptionKey: 'challengeSet.claimodd.description', stars: 3, free: true }
```

### i18n Key Pools (`en.json`)

**Coach phrase pool template** (applied to claimodd, undercut, overcut, figure_7, j_shape):
```json
{
  "coach": {
    "<category>": {
      "prompt":  { "0": "...", "1": "...", "2": "..." },
      "hint":    { "0": "...", "1": "..." },
      "optimal":  { "0": "...", "1": "...", "2": "...", "3": "..." },
      "suboptimal": { "0": "...", "1": "..." },
      "blunder": { "0": "...", "1": "...", "2": "...", "3": "..." }
    }
  }
}
```

**Challenge set i18n keys** (claimodd):
```json
{
  "challengeSet": {
    "claimodd": {
      "displayName": "Claimodd",
      "description": "Take the center to break the all-even parity."
    }
  }
}
```

## State Transitions

### Lesson completion state machine

```
start → Slide 0 → Slide 1 → ... → Last slide
                                    │
                          ┌─────────┴────────────┐
                          │                      │
                    socratic !== null       socratic === null
                          │                      │
                     Socratic screen         Lesson complete
                          │                 (reading-only)
                    ┌─────┴──────┐
                    │            │
              correct         wrong2
                    │            │
               Continue →   auto-advance
                    │            │
                    └─────┬──────┘
                          │
              ┌───────────┴────────────┐
              │                       │
    confirmationCategory !== null   confirmationCategory === null
              │                       │
    CLChallenge screen            Lesson complete
        (N puzzles)                 (Lesson 4 only)
              │
     ≥1 correct → Lesson complete
     0 correct  → Lesson NOT complete (user must retry)
```

Note: The Epic 4 infrastructure handles all screen transitions. This epic only authors the content JSON that drives these transitions.
