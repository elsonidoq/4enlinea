# Data Model: Epic 2a — Challenges: Set Picker, Single-Move Board & Tier-1 Feedback

---

## Entities

### ChallengeSet (server config — not a DB table)

Defined in `connect-four/server/challengeSets.js`. Drives the Set Picker.

| Field | Type | Notes |
|---|---|---|
| `slug` | `string` | Category slug. For all real DB categories uses the same value as `puzzles.category`. `'mixed'` is a pseudo-slug (no DB rows). |
| `displayName` | `string` | Human-readable name shown in the SetCard. |
| `stars` | `1 \| 2 \| 3` | Difficulty star rating (provisional for `double_threat=2`; confirmed in Epic 6). |
| `description` | `string` | Subtitle shown in the SetCard. |
| `free` | `boolean` | `true` = free tier; `false` = Pro-gated. |

No migration required. Pure code module.

---

### DrawnPuzzle (API response shape — not a new DB table)

Returned by `GET /api/puzzles/draw`. Fields are a subset of the existing `puzzles` table.

| Field | Type | Source |
|---|---|---|
| `id` | `uuid` | `puzzles.id` |
| `category` | `string` | `puzzles.category` |
| `move_string` | `string` | `puzzles.move_string` |
| `interaction_mode` | `'single_move' \| 'sequence'` | `puzzles.interaction_mode` |
| `highlight_metadata` | `jsonb \| null` | `puzzles.highlight_metadata` |
| `correct_col` | `integer \| null` | `puzzles.correct_col` |
| `user_player` | `1 \| 2` | `puzzles.user_player` |

No new columns. All fields exist in the current `puzzles` table.

---

### MoveEvaluation (API response shape — in-memory only)

Returned by `POST /api/evaluate-move`. Transient — not persisted.

| Field | Type | Notes |
|---|---|---|
| `badge` | `'good' \| 'mid' \| 'bad'` | Column badge type for the Board component. |
| `quality` | `'optimal' \| 'suboptimal' \| 'blunder'` | Quality label. |
| `coachPhraseKey` | `string` | Full dotted i18n key (e.g. `coach.immediate_threat.optimal.0`). Client resolves with `t()`. |
| `coachMood` | `'happy' \| 'think' \| 'oops'` | Mood for CoachAvatar. |
| `summaryLineKey` | `string` | Full dotted i18n key (e.g. `eval.immediate_threat.optimal.summary.0`). Client resolves with `t()`. |
| `patternTag` | `string` | Category slug from `classify()` output. Display metadata only; not used for phrase-pool selection. |

---

### ChallengeSessionResult (client-side accumulator)

Accumulated in `challenge` screen state as the user progresses. Passed via navigation params to `summary` screen (persisted in Epic 2b).

| Field | Type | Notes |
|---|---|---|
| `puzzleId` | `uuid` | The puzzle's `id`. |
| `quality` | `'optimal' \| 'suboptimal' \| 'blunder'` | Move quality for this puzzle. |
| `category` | `string` | Category slug of the puzzle. |

---

## No New DB Migrations

This epic does not introduce new database tables or columns. All data shapes either:
1. Use existing `puzzles` table columns (DrawnPuzzle), or
2. Are computed at runtime and returned in API responses (MoveEvaluation), or
3. Are code modules (ChallengeSet), or
4. Are transient client-side state (ChallengeSessionResult, challenge session).

The `PAID_CATEGORIES` remap is a code-only change to two TypeScript/JS files.

---

## Categories Registry Changes (Code Only)

### `server/categories.js` — PAID_CATEGORIES remap

Before:
```js
export const PAID_CATEGORIES = new Set([
  'forced_win', 'forbidden_columns',
  'z_threat', 'claimeven', 'undercut', 'overcut', 'figure_7', 'j_shape',
]);
```

After:
```js
export const PAID_CATEGORIES = new Set([
  'forced_win', 'forbidden_columns',
  'mixed', 'undercut', 'overcut', 'figure_7', 'j_shape',
]);
```

`VALID_CATEGORIES` and `CATEGORY_ORDER` are unchanged.

### `connect-four/src/lib/categories.js` — PAID_CATEGORIES remap (mirror)

Same change as server-side. `PAID_CATEGORIES` Set updated to remove `claimeven`/`z_threat` and add `mixed`.

---

## i18n Schema (new namespaces — additions to `en.json`)

### `coach.<category>.*` additions

For each free category (`immediate_threat`, `forced_block`, `double_threat`, `claimeven`, `z_threat`):

```json
"coach": {
  "<category>": {
    "prompt": {
      "0": "...",
      "1": "...",
      "2": "..."
    },
    "hint": {
      "0": "...",
      "1": "..."
    },
    "optimal": {
      "0": "..."
    },
    "suboptimal": {
      "0": "..."
    },
    "blunder": {
      "0": "..."
    }
  }
}
```

### `eval.<category>.*` — new top-level namespace

```json
"eval": {
  "<category>": {
    "optimal": {
      "summary": { "0": "..." }
    },
    "suboptimal": {
      "summary": { "0": "..." }
    },
    "blunder": {
      "summary": { "0": "..." }
    }
  }
}
```

### `setpicker.*` and `challenge.*` — new screen namespaces

```json
"setpicker": {
  "title": "Challenges",
  "subtitle": "No labels on the board — you still have to find the move.",
  "positions_count": "{{count}} positions"
},
"challenge": {
  "progress": "{{current}} / {{total}}",
  "leave_confirm_title": "Leave this set?",
  "leave_confirm_body": "Your progress won't be saved.",
  "leave_keep": "Keep going",
  "leave_leave": "Leave",
  "next": "Next →"
}
```
