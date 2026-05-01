# ProfileStore Interface Contract

**Feature**: `001-decodec4-mvp`
**Date**: 2026-04-30

`ProfileStore` is the storage-agnostic state abstraction. All feature code calls
`ProfileStore` methods. No component or service may reference `IndexedDBStore` or
`SupabaseStore` directly — only the factory that selects the active implementation.

---

## Factory

```js
// store/ProfileStore.js

/**
 * Returns the active ProfileStore implementation.
 * Switches from IndexedDBStore to SupabaseStore when auth state changes.
 * Components never call this directly — use the React context or the store singleton.
 */
export function createProfileStore(supabaseSession) {
  if (supabaseSession) return new SupabaseStore(supabaseSession);
  return new IndexedDBStore();
}
```

---

## Interface Methods

All methods return Promises. Errors propagate as rejected Promises.

### `getProfile(): Promise<Profile>`

Returns the current user profile.

```ts
type Profile = {
  deviceUuid: string;
  tier: 'anonymous' | 'free' | 'paid';
  deepRevealCount: number;
  deepRevealResetAt: string; // ISO date string
}
```

---

### `saveSessionStats(stats: SessionStats): Promise<void>`

Persists the current session's puzzle accuracy by category.

```ts
type SessionStats = {
  date: string; // ISO date string
  byCategory: Record<number, { attempted: number; correct: number }>;
}
```

- For `IndexedDBStore`: writes to `session_stats` object store keyed by `date`.
- For `SupabaseStore`: upserts into a `session_stats` table for paid users; no-ops for free.

---

### `getSessionStats(date: string): Promise<SessionStats | null>`

Returns session stats for a given date. Returns `null` if no record exists.

---

### `recordPuzzleAttempt(attempt: PuzzleAttempt): Promise<void>`

Persists a puzzle attempt record.

```ts
type PuzzleAttempt = {
  puzzleId: string;
  movesTried: number[];
  outcome: 'correct_first' | 'correct_retry' | 'revealed' | 'tied' | 'abandoned';
  firstAttemptCorrect: boolean;
  timeMs: number;
  createdAt: string;
}
```

- `IndexedDBStore`: inserts into `puzzle_attempts` object store.
- `SupabaseStore`: inserts into `puzzle_attempts` table.

---

### `migrateToSupabase(session: SupabaseSession): Promise<void>`

Called once on signup. Reads all local IndexedDB records and bulk-inserts them into
Supabase. Clears IndexedDB after successful migration. Throws on partial failure
(migration is all-or-nothing).

**Only implemented on `IndexedDBStore`**. Calling on `SupabaseStore` throws.

---

## Usage Pattern

```jsx
// All components use the store via React context
import { useStore } from '../store/ProfileStore';

function PuzzlesPage() {
  const store = useStore();

  async function handlePuzzleComplete(attempt) {
    await store.recordPuzzleAttempt(attempt);
  }
}
```

---

## Invariants

- `getProfile()` MUST always return a profile (never null). On first call for an anonymous
  user, `IndexedDBStore` initializes a profile with a new `deviceUuid`.
- `deviceUuid` is stable for the lifetime of the device/browser. It is the `uid` in the
  `tracks` table and survives sign-in.
- After `migrateToSupabase` completes successfully, the store instance is replaced by a
  `SupabaseStore`. The old `IndexedDBStore` is discarded.
- `SupabaseStore` MUST enforce RLS (Row Level Security) at the Supabase level; the client
  never passes a `user_id` — Supabase auth context provides it from the JWT.
