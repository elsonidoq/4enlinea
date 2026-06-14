# Store Interface Contract — Epic 7 Extension

**Feature**: Auth & Progress Persistence (Epic 7)  
**Branch**: `101-new-design`  
**Date**: 2026-05-30  
**Status**: Locked — cross-epic contract (consumed by Epics 2a, 2b, 3a, 3b, 3c)

---

## Overview

Both `IndexedDBStore` and `SupabaseStore` MUST implement an identical method signature set. `ProfileStore` swaps between them transparently on sign-in. All methods added in this epic extend the shared interface.

---

## Complete Interface (after Epic 7)

```typescript
interface AppStore {
  // ── Profile ──────────────────────────────────────────────────────────────
  // Returns the user/device profile.
  // IndexedDBStore: { device_uuid: string, tier: 'free' }
  // SupabaseStore: { device_uuid: string | null, tier: 'free' | 'paid',
  //                  deep_reveal_count: number, deep_reveal_reset_at: string }
  getProfile(): Promise<ProfileShape>;

  // ── Puzzle Attempts ───────────────────────────────────────────────────────
  recordPuzzleAttempt(attempt: PuzzleAttempt): Promise<void>;

  // ── Challenge Sessions ────────────────────────────────────────────────────
  // Saves a challenge session, keyed by date (one row per calendar day, put semantics).
  saveChallengeSession(session: ChallengeSession): Promise<void>;

  // Returns the most recent session_stats row, or null if none exist.
  getLastChallengeSession(): Promise<ChallengeSession | null>;

  // ── Session Stats (existing) ──────────────────────────────────────────────
  saveSessionStats(stats: SessionStats): Promise<void>;
  getSessionStats(date: string): Promise<SessionStats | null>;

  // ── Lesson Progress ───────────────────────────────────────────────────────
  // Upserts progress for a single lesson.
  saveLessonProgress(lessonId: string, status: 'complete'): Promise<void>;

  // Returns all lesson progress entries for this user/device.
  getLessonProgress(): Promise<Array<{ lessonId: string; status: string }>>;

  // ── Sparring Record ───────────────────────────────────────────────────────
  // Increments the win/loss/draw counter.
  saveSparringRecord(result: 'win' | 'loss' | 'draw'): Promise<void>;

  // Returns the current win/loss/draw counts. Defaults to { W: 0, L: 0, D: 0 }.
  getSparringRecord(): Promise<{ W: number; L: number; D: number }>;

  // ── Streak ────────────────────────────────────────────────────────────────
  // Records that the user was active today. Idempotent within a calendar day.
  // Streak logic: today → no-op; yesterday → +1; older → reset to 1.
  recordActivityDay(): Promise<void>;

  // Returns { streak_count, last_active_date } or defaults if no data.
  getStreak(): Promise<{ streak_count: number; last_active_date: string | null }>;
}
```

---

## SupabaseStore-only methods (NOT part of shared interface)

```typescript
// Returns all session_stats rows for the user, with per-pattern accuracy aggregated.
getAllSessionStats(): Promise<{
  rows: SessionStats[];
  byPattern: Record<string, { accuracy: number; attempted: number }>;
}>;

// Migration source (IndexedDBStore only — throws on SupabaseStore):
migrateToSupabase(supabaseStore: SupabaseStore, supabaseClient: SupabaseClient): Promise<void>;
```

---

## Type Shapes

```typescript
type ProfileShape = {
  device_uuid: string | null;
  tier: 'free' | 'paid';
  // SupabaseStore only:
  deep_reveal_count?: number;
  deep_reveal_reset_at?: string;
};

type ChallengeSession = {
  date: string;          // YYYY-MM-DD, keyPath for IndexedDB
  category: string;
  accuracy: number;      // 0–1
  optimalCount?: number;
  blunderCount?: number;
};

type SessionStats = {
  date: string;
  stats: Record<string, unknown>;  // JSONB-encoded shape
};

type PuzzleAttempt = {
  puzzle_id: string;
  moves_tried: number[];
  outcome: string;
  first_attempt_correct: boolean;
  time_ms?: number;
};
```

---

## Streak Trigger Contract

Per FR-027, `recordActivityDay()` MUST be called from exactly two call sites:

1. After a puzzle attempt is recorded (Challenges surface — Epic 2a).
2. After a sparring game ends (Sparring surface — Epic 3a).

No other surface may call `recordActivityDay()`.

---

## Quota Enforcement Contract

Deep Reveal quota is server-enforced only. Client-side rules:

| User state | Client action | Server response |
|---|---|---|
| Unauthenticated | Show `AuthModal` before request | 401 if request reaches server |
| Authenticated free (quota remaining) | Allow request | 200 + explanation |
| Authenticated free (quota exhausted) | Show `UpgradeModal` on 429 | 429 + `{ error: 'quota_exceeded', resetsAt: ISO }` |
| Authenticated paid | Allow request | 200 + explanation (no quota check) |

Cap: 20 per week. Reset: next Monday 00:00 UTC.
