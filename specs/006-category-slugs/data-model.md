# Data Model: Category Slug Refactor

## Category Entity — Authoritative Slug List

This section is the single canonical reference for valid slugs. All other documents, code, and DB constraints derive from this list. Do not define the slug list anywhere else.

```
Valid slugs (ordered, authoritative — position matches old integer 1–7):
  1  →  'immediate_threat'
  2  →  'forced_block'
  3  →  'double_threat'
  4  →  'fork_setup'
  5  →  'zugzwang'
  6  →  'parity_control'
  7  →  'forbidden_columns'
```

The CHECK constraint on every affected column is:
```sql
CHECK (col IN (
  'immediate_threat','forced_block','double_threat',
  'fork_setup','zugzwang','parity_control','forbidden_columns'
))
```

---

## Affected DB Tables

### `public.puzzles`

| Column | Old Type | New Type |
|--------|----------|----------|
| `category` | `integer NOT NULL CHECK (category BETWEEN 1 AND 7)` | `text NOT NULL CHECK (category IN (...slugs...))` |

Migration: drop + recreate (existing rows discarded). Recreate index `idx_puzzles_category ON (category) WHERE is_active = true`.

---

### `public.candidates`

| Column | Old Type | New Type |
|--------|----------|----------|
| `category` | `integer NOT NULL CHECK (category BETWEEN 1 AND 7)` | `text NOT NULL CHECK (category IN (...slugs...))` |

Migration: drop + recreate. Recreate index `idx_candidates_category_status ON (category, status)`.

---

### `public.false_positive_records`

| Column | Old Type | New Type |
|--------|----------|----------|
| `category` | `integer NOT NULL CHECK (category BETWEEN 1 AND 7)` | `text NOT NULL CHECK (category IN (...slugs...))` |

Migration: drop + recreate. Recreate index `idx_false_positives_category ON (category)`.

---

### `public.blunders`

> Note: the spec calls this table `coach_blunders` — that is incorrect. The actual table name in migrations and code is `public.blunders`.

| Column | Old Type | New Type |
|--------|----------|----------|
| `pattern_category` | `integer NOT NULL CHECK (pattern_category BETWEEN 1 AND 6)` | `text NOT NULL CHECK (pattern_category IN (...slugs...))` |

Column name (`pattern_category`) is unchanged. CHECK expands from 1–6 to include `forbidden_columns`.  
Migration: drop + recreate.

---

## State Transitions

No state machine changes. `candidates.status` (pending/approved/rejected) and `puzzles.is_active` are unchanged. Category is immutable once written.

---

## Validation Rules

- **Server**: `VALID_CATEGORIES` set in `server/categories.js` is checked on all inbound category values before they reach the DB. Invalid → HTTP 400 `{ "error": "invalid category" }`.
- **DB**: CHECK constraint is a second-line defense; it should never fire if server validation is correct.
- **Frontend**: No validation — the UI only allows selection from `CATEGORY_ORDER`.

---

## Constants Files (full content)

### `server/categories.js` (new file)

Shared by `server/index.js` and `server/candidate-generator.js`. No other file should define these values.

```js
export const VALID_CATEGORIES = new Set([
  'immediate_threat', 'forced_block', 'double_threat',
  'fork_setup', 'zugzwang', 'parity_control', 'forbidden_columns',
]);

export const PAID_CATEGORIES = new Set([
  'fork_setup', 'zugzwang', 'parity_control',
]);

export const CATEGORY_ORDER = [
  'immediate_threat', 'forced_block', 'double_threat',
  'fork_setup', 'zugzwang', 'parity_control', 'forbidden_columns',
];

export const CATEGORY_NAMES = {
  immediate_threat:  'Immediate Threat',
  forced_block:      'Forced Block',
  double_threat:     'Double Threat',
  fork_setup:        'Fork Setup',
  zugzwang:          'Zugzwang',
  parity_control:    'Parity Control',
  forbidden_columns: 'Forbidden Columns',
};
```

### `src/lib/categories.js` (new file)

Shared by all frontend components. No component may define its own `CATEGORY_NAMES` or `CATEGORY_CHIPS` map.

```js
export const CATEGORY_ORDER = [
  'immediate_threat', 'forced_block', 'double_threat',
  'fork_setup', 'zugzwang', 'parity_control', 'forbidden_columns',
];

export const CATEGORY_NAMES = {
  immediate_threat:  'Immediate Threat',
  forced_block:      'Forced Block',
  double_threat:     'Double Threat',
  fork_setup:        'Fork Setup',
  zugzwang:          'Zugzwang',
  parity_control:    'Parity Control',
  forbidden_columns: 'Forbidden Columns',
};

// Chip styling used by PuzzlesPage, CandidateDashboard, CurationWorkspace.
// forbidden_columns chip is new — neutral slate, no prior assignment.
export const CATEGORY_CHIPS = {
  immediate_threat:  { label: 'Immediate', color: '#60a5fa', bg: 'rgba(37,99,235,.2)',   border: 'rgba(37,99,235,.4)'  },
  forced_block:      { label: 'Block',     color: '#f87171', bg: 'rgba(220,38,38,.2)',   border: 'rgba(220,38,38,.4)'  },
  double_threat:     { label: 'Double',    color: '#fb923c', bg: 'rgba(234,88,12,.2)',   border: 'rgba(234,88,12,.4)'  },
  fork_setup:        { label: 'Fork',      color: '#2dd4bf', bg: 'rgba(13,148,136,.2)',  border: 'rgba(13,148,136,.4)' },
  zugzwang:          { label: 'Zugzwang',  color: '#c084fc', bg: 'rgba(147,51,234,.2)',  border: 'rgba(147,51,234,.4)' },
  parity_control:    { label: 'Parity',    color: '#fcd34d', bg: 'rgba(245,184,32,.2)',  border: 'rgba(245,184,32,.4)' },
  forbidden_columns: { label: 'Forbidden', color: '#94a3b8', bg: 'rgba(100,116,139,.2)', border: 'rgba(100,116,139,.4)'},
};

export const PAID_CATEGORIES = new Set([
  'fork_setup', 'zugzwang', 'parity_control',
]);
```
