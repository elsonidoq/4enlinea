# Data Model: Lesson Infrastructure & Saga Map (Epic 4)

## Entities

### Lesson (server-side, JSON file)

Lives at `connect-four/lessons/lesson-NN-<slug>.json`. Loaded at server startup by
`lessonLoader.js`. Never stored in the DB — the server is the source of truth.

```typescript
interface Lesson {
  id: string;               // slug, e.g. "lesson-05-claimeven"
  title: string;            // English display title
  free: boolean;            // false → Pro-gated
  userPerspective: "red" | "yellow";
  slides: Slide[];          // at least 1 element; validated at load time
  socratic: SocraticConfig | null;
  confirmationCategory: string | null;  // puzzle category slug or null
  confirmationCount: number;            // integer ≥ 0; 0 → reading-only
}
```

`order` is NOT stored in the JSON. It is derived at load time from the filename numeric prefix
(`lesson-05-claimeven.json` → `order: 5`) and attached to the in-memory object.

### Slide

```typescript
interface Slide {
  coachMessages: CoachMessage[];
  boardSpec: string[];      // Array[7]; index = col (0-indexed); value = 'g'/'d' chars
  overlays: Overlay[];      // {c, r, type: 'tg'|'td'|'claim'|'win'} — locked enum from Epic 1a
  legendItems: LegendItem[];// may be empty
  infoProse: string;        // may be empty string
}

interface CoachMessage {
  text: string;
  lead?: string;            // bold lead-in text
  faded?: boolean;
}

interface Overlay {
  c: number;   // 0-indexed column
  r: number;   // 0-indexed row
  type: "tg" | "td" | "claim" | "win";
}

interface LegendItem {
  type: "tg" | "td" | "claim" | "win";
  label: string;
}
```

### SocraticConfig

```typescript
interface SocraticConfig {
  boardSpec: string[];   // Array[7]; same format as Slide.boardSpec
  correctCol: number;    // 0-indexed
  // All coach messages are sourced from i18n — no message fields here
}
```

### LessonProgress (store-side; already in IndexedDBStore + SupabaseStore)

```typescript
// IndexedDB object store: 'lesson_progress', keyPath: 'lessonId'
interface LessonProgressRecord {
  lessonId: string;   // lesson id slug
  status: "complete";
}

// Supabase: lesson_progress table (migration added in Epic 7)
// Columns: user_id (FK), lesson_id (text), completed_at (timestamptz)
// Unique constraint: (user_id, lesson_id)
```

Store interface (already implemented — no changes needed):
- `store.saveLessonProgress(lessonId, 'complete')` → void
- `store.getLessonProgress()` → `Array<{ lessonId: string, status: string }>`

### NodeState (client-side derived enum)

Derived in `SagaScreen` from API lesson list + `store.getLessonProgress()` + async profile tier.

```typescript
type NodeState = "done" | "current" | "unlocked" | "locked";
```

Derivation rules (must be implemented exactly as FR-003):
1. `done` — `getLessonProgress()` has `{ lessonId: lesson.id, status: 'complete' }`
2. `current` — first lesson by `order` that is not `done` AND (`free === true` OR tier is paid)
3. `unlocked` — `free === true` AND not `done` AND not `current`
4. `locked` — `free === false` AND `tier !== 'paid'`

**Tier source**: `tier` is NOT on the `session` object from `useStore()`. It is read via
`store.getProfile().then(p => setTier(p.tier))` on mount (async). Initialize `tier` state to
`'free'` (safe default: free users see locked nodes until profile resolves). Canonical pattern:
`PostSetSummaryScreen.jsx:50`.

## API Wire Shapes

### `GET /api/lessons` response
```json
[
  { "id": "lesson-01-spot-the-win", "title": "Spot the Win", "order": 1, "free": true },
  ...
]
```
Sorted ascending by `order`. No node state — computed client-side.

### `GET /api/lessons/:id` response
Full lesson JSON object (all fields). Same shape as the in-memory `Lesson` + `order`.

### `GET /api/lessons/:id` error
```json
{ "error": "not_found" }
```
HTTP 404.

## `boardSpec` → `board` Conversion

The `boardSpecToBoard(boardSpec)` utility converts from lesson JSON format to the production
`Board` component's `board` prop format:

```
boardSpec[c][r_char_index] === 'g'  →  board[r][c] = 'red'   (renders green disc)
boardSpec[c][r_char_index] === 'd'  →  board[r][c] = 'yellow' (renders gray disc)
boardSpec[c] length < 6 (missing r) →  board[r][c] = 'empty'
```

This function belongs in `src/lib/board.js` and is exported for use by `ConceptScreen` and
`SocraticScreen`.

## Validation Rules (server-side, applied at load time)

A lesson file is excluded (logged, not thrown) if any of the following fail:
- `id` missing or not a string
- `title` missing or not a string
- `free` missing or not a boolean
- `userPerspective` not `"red"` or `"yellow"`
- `slides` missing, not an array, or empty
- `socratic` not an object or null
- `confirmationCategory` not a string or null
- `confirmationCount` not an integer ≥ 0
- Any `slide.boardSpec` element count ≠ 7 (if present)
