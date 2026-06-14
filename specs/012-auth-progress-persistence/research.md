# Research: Auth & Progress Persistence (Epic 7)

**Branch**: `101-new-design` | **Date**: 2026-05-30

---

## Decision 1: AuthModal prop contract change (`isOpen` removal)

**Decision**: Drop the `isOpen` prop from `AuthModal`; switch all callers to conditional mounting.

**Current callers** (found by grep):
- `connect-four/src/screens/HomeScreen.jsx:72` — `<AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />`
- `connect-four/src/components/DeepRevealButton.jsx:72` — `<AuthModal isOpen={showAuth} onClose={...} reason={...} />`
- `connect-four/src/components/AuthModal.jsx:69` — `AuthGate` internal self-reference (must update too)

**Conversion pattern**:
```jsx
// Before
<AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />

// After
{authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
```

**Rationale**: The mockup uses conditional mount. Removing `isOpen` eliminates the dual-control pattern (both `isOpen=false` and unmounting can suppress the modal) and makes the component's lifetime explicit. The spec (FR-004) locks this.

**Alternatives considered**: Keep `isOpen` as a convenience passthrough. Rejected — the spec is explicit, and conditional mounting is the simpler pattern per Constitution §II.

---

## Decision 2: IndexedDB version bump strategy

**Decision**: Bump `DB_VERSION` from 1 to 2 in `openDB()`. The `onupgradeneeded` handler uses `e.oldVersion` to gate new store creation, ensuring existing data in `profile`, `puzzle_attempts`, and `session_stats` is preserved on upgrade.

**New stores**: `lesson_progress` (keyPath: `lessonId`), `sparring_record` (keyPath: `id`), `streak` (keyPath: `id`).

**Implementation sketch**:
```js
req.onupgradeneeded = (e) => {
  const db = e.target.result;
  // Existing stores (version 1)
  if (e.oldVersion < 1) {
    db.createObjectStore('profile', { keyPath: 'device_uuid' });
    db.createObjectStore('puzzle_attempts', { autoIncrement: true });
    db.createObjectStore('session_stats', { keyPath: 'date' });
  }
  // New stores (version 2)
  if (e.oldVersion < 2) {
    db.createObjectStore('lesson_progress', { keyPath: 'lessonId' });
    db.createObjectStore('sparring_record', { keyPath: 'id' });
    db.createObjectStore('streak', { keyPath: 'id' });
  }
};
```

**Rationale**: Standard IndexedDB upgrade pattern. Adding the version guard preserves existing data; a fresh install skips `oldVersion < 1` naturally (oldVersion is 0 for new installs).

**Note on existing code**: The current `openDB()` does NOT use `e.oldVersion` — it only guards by `db.objectStoreNames.contains()`. The refactor must switch to the `oldVersion` pattern for correctness, because `onupgradeneeded` is called for ALL version transitions including 1→2, and `contains()` would silently skip already-existing stores rather than creating the new ones.

---

## Decision 3: Streak logic — "same day" definition

**Decision**: Compare `last_active_date` (a date-only string `YYYY-MM-DD`) against today's date in the local timezone using `new Date().toISOString().slice(0, 10)`.

**Streak rules** (from FR-010):
- `last_active_date === today` → no-op
- `last_active_date === yesterday` → `streak_count += 1`, `last_active_date = today`
- `last_active_date < yesterday` OR `last_active_date === null` → `streak_count = 1`, `last_active_date = today`

**"Yesterday" computation**:
```js
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const yesterdayStr = yesterday.toISOString().slice(0, 10);
```

**Rationale**: The spec stores `last_active_date` as a DATE column in Supabase and as a date string in IndexedDB. Using ISO date slice is consistent across both. The spec does not require UTC-relative streaks — local date is the intended behavior (users think of "today" in their timezone).

**Alternatives considered**: UTC-only date comparison. Rejected — streaks are user-facing; a session at 11pm local that rolls into the next UTC day should still count for "today."

---

## Decision 4: `migrateToSupabase` atomicity

**Decision**: Collect all Supabase writes into a single try block. Only clear IndexedDB stores after ALL writes succeed. Use `Promise.all` for parallel writes where order doesn't matter (lesson_progress, sparring_record, session_stats, streak, puzzle_attempts). If any write throws, catch the error, re-throw, and skip the clear step.

**Migration payload additions** (beyond existing puzzle_attempts):
1. All `lesson_progress` rows → `lesson_progress` table (bulk upsert)
2. `sparring_record` singleton → `users` JSONB column (`sparring_record`)
3. All `session_stats` rows → `session_stats` table (bulk upsert)
4. `streak` singleton → `users.streak_count` + `users.last_active_date`

**Clear step**: After all writes succeed, clear `lesson_progress`, `sparring_record`, `streak`, `puzzle_attempts`, `session_stats` stores in a single IndexedDB transaction.

**Rationale**: FR-018 is explicit — no partial clears. Constitution §VI (make load-bearing assumptions explicit): the atomicity contract is preserved by the try/catch structure, not by a DB transaction (IndexedDB and Supabase are independent systems, so true atomicity is impossible; we use best-effort with rollback-by-omission).

---

## Decision 5: Deep Reveal quota — weekly reset boundary

**Decision**: "Next Monday 00:00 UTC" is computed as:
```js
function nextMondayUtcMidnight(from = new Date()) {
  const d = new Date(from);
  const dayOfWeek = d.getUTCDay(); // 0=Sun, 1=Mon, ... 6=Sat
  const daysUntilMonday = dayOfWeek === 1 ? 7 : (8 - dayOfWeek) % 7;
  d.setUTCDate(d.getUTCDate() + daysUntilMonday);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
```
Edge case: if called exactly on a Monday 00:00 UTC, returns the next Monday (7 days out), not the same instant. This matches FR-024's "resets Monday" semantics — the reset happens once per week, not at the moment of the request.

**Cap**: 20 (was 3). Reset: weekly Monday (was daily midnight).

**Rationale**: FR-025 is explicit. The current `checkAndDecrementQuota` uses cap-3/daily; the new function uses cap-20/weekly-Monday. The `nextMondayUtcMidnight` helper replaces `nextMidnight` inline computation.

**`deep_reveal_reset_at` null handling**: Per FR-spec edge case, treat null as "already expired" — reset to next Monday and allow the request.

---

## Decision 6: SupabaseStore `saveSparringRecord` — read-modify-write

**Decision**: Read `users.sparring_record` JSONB, merge with defaults `{W:0,L:0,D:0}`, increment the matching key, write back. Use `update` (not `upsert`) since the user row always exists by the time `SupabaseStore` is active.

```js
async saveSparringRecord(result) {
  const { data } = await this._supabase
    .from('users')
    .select('sparring_record')
    .eq('id', this._userId)
    .single();
  const current = data?.sparring_record ?? { W: 0, L: 0, D: 0 };
  const key = result === 'win' ? 'W' : result === 'loss' ? 'L' : 'D';
  await this._supabase
    .from('users')
    .update({ sparring_record: { ...current, [key]: (current[key] ?? 0) + 1 } })
    .eq('id', this._userId);
}
```

**Rationale**: FR-015 specifies read-modify-write. Supabase has no atomic JSONB field increment via PostgREST, so this is the correct approach. Concurrent sessions on the same user are unlikely (mobile app, one session at a time), so the race condition is acceptable.

---

## Decision 7: `SupabaseStore.getAllSessionStats()` — per-pattern accuracy aggregation

**Decision**: Fetch all `session_stats` rows for the user. Each row has a `stats` JSONB field. Aggregate per-pattern accuracy in JavaScript (not SQL) by summing `correct` and `attempted` counts per category across all rows.

**Expected `stats` shape** (from existing `saveSessionStats` callers):
```json
{ "category": "immediate_threat", "accuracy": 0.75, "optimalCount": 6, "blunderCount": 2, "date": "2026-05-30" }
```
If `optimalCount`/`blunderCount` are present, derive attempted = optimalCount + blunderCount. If only `accuracy` is available, weight equally by row count.

**Return shape**:
```js
{
  rows: [...],  // raw session_stats rows
  byPattern: {
    immediate_threat: { accuracy: 0.78, attempted: 9 },
    ...
  }
}
```

**Rationale**: FR-014 says aggregation lives in the method. SQL aggregation would require a Supabase RPC; PostgREST-level JS is simpler and avoids a new server function for a read-only computation.

---

## Decision 8: i18n key additions and removals

**New keys** (to add to `en.json` under `auth`):
- `auth.subtitle` = "Save your progress, streaks, and stats across devices."
- `auth.checkInbox` = "Check your inbox"
- `auth.magicLinkSent` = "We sent a magic link to your email. Tap it to sign in."

**Preserved keys**: `auth.signIn`, `auth.email`, `auth.signUp`, `auth.signOut`, `auth.deepRevealGate`

**Deprecated keys** (still present in `en.json` to avoid breakage until callers are updated):
- `auth.checkEmail` — replaced by `auth.checkInbox` in `AuthModal`; keep in file for any other references
- `auth.sendLink` — replaced by "Continue with email" button label (new literal key `auth.continueWithEmail`); keep in file

**New key**: `auth.continueWithEmail` = "Continue with email" (the primary button label on the email stage)
**New key**: `auth.maybeLater` = "Maybe later" (ghost button label, both email and sent stages share this concept)
**New key**: `auth.back` = "Back" (sent stage back button) — but `common.back` already exists; reuse it.

**Rationale**: Spec FR-002/FR-003/FR-005 mandates i18n for all user-facing strings. The mockup shows exact copy strings; these are the translation keys.

---

## Decision 9: `loadUser` middleware scope — `/api/explain-move-llm`

**Current state**: `app.use(loadUser)` is already applied globally (line 166 in `index.js`). This means `/api/explain-move-llm` already gets `req.user` populated when a bearer token is present.

**What is missing**: The handler at line 574 does NOT enforce authentication — it has a comment "No auth required." The fix is to add an early-return 401 guard at the top of the handler, and wire quota enforcement.

**No middleware wiring changes needed** — `loadUser` is global. The handler just needs to check `if (!req.user) return res.status(401).json({ error: 'Unauthorized' })`.

**Rationale**: FR-023 is correct but slightly misleading — the middleware is already wired. The fix is handler-level, not middleware-level.

---

## Decision 10: Old `/api/explain-move` quota (FR-026)

**Decision**: Remove the quota call from `/api/explain-move`. The `requestDeepReveal && req.user` check at line 416 that calls `checkAndDecrementQuota` should be deleted. The deep reveal payload on that endpoint is still returned for free (no quota gate). Anonymous users still get the 403 gate via `requestDeepReveal && !req.user` check at line 353.

**Rationale**: FR-026 — quota enforcement lives on `/api/explain-move-llm` only. The old endpoint's quota was cap-3/daily; removing it avoids double-counting and keeps the codebase clean.

---

## Decision 11: `getProfile()` — anonymous profile `deep_reveal_count` / `deep_reveal_reset_at`

**Spec (FR-011)**: `IndexedDBStore.getProfile()` MUST return only `{ device_uuid, tier }`. The fields `deep_reveal_count` and `deep_reveal_reset_at` are NOT stored in IndexedDB.

**Current code**: The existing `getProfile()` initializes `deep_reveal_count: 0` and `deep_reveal_reset_at: new Date().toISOString()` in the anonymous profile object and persists it in IndexedDB. The `tier` is currently `'anonymous'` (not `'free'`).

**Change**: Remove `deep_reveal_count` and `deep_reveal_reset_at` from the anonymous profile shape. Change tier initialization from `'anonymous'` to `'free'` (aligns with the constitution's tier table which uses `free` as the default signed-in tier; anonymous users are also `free`).

**Compatibility**: `SupabaseStore.getProfile()` returns `deep_reveal_count` and `deep_reveal_reset_at` from the `users` table — these fields are only relevant when authenticated. `ProfileStore` components that call `getProfile()` and read these fields must be guarded.

**Rationale**: FR-011 is explicit. Removing quota fields from IndexedDB prevents anonymous quota tracking, which the spec explicitly forbids.
