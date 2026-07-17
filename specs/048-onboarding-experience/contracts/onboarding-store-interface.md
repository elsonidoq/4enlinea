# Store Interface Contract: `updateProfile(patch)`

Both storage-agnostic backends behind `useStore()` (`connect-four/src/store/ProfileStore.jsx`)
gain one new method, matching the existing `getProfile()` pairing already present in both:

## `IndexedDBStore.updateProfile(patch)`

**File**: `connect-four/src/store/IndexedDBStore.js` (near `getProfile()`, line 42)

```js
async updateProfile(patch) {
  const db = await this._db();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('profile', 'readwrite');
    const store = tx.objectStore('profile');
    const req = store.getAll();
    req.onsuccess = () => {
      const existing = req.result[0] ?? { device_uuid: /* fallback, should not happen post-getProfile */ undefined };
      const updated = { ...existing, ...patch };
      store.put(updated);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
```

Contract: merges `patch` into the single existing `profile` row and persists it. Callers MUST
have called `getProfile()` at least once already this session (guaranteed by every call site in
this feature — the profile is always read before it is patched). No return value (matches the
existing fire-and-forget posture of other IndexedDBStore write methods, e.g. `saveSessionStats`).

## `SupabaseStore.updateProfile(patch)`

**File**: `connect-four/src/store/SupabaseStore.js` (near `getProfile()`, line 28)

```js
async updateProfile(patch) {
  const apiBase = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || '';
  await fetch(`${apiBase}/api/user/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
    credentials: 'include',
  });
  // Silent no-op on non-ok, matching this class's existing _fetchPost posture.
}
```

Contract: PATCHes (via the existing `PUT /api/user/profile`, extended per
`contracts/onboarding-api.md`) the caller's own `users` row with whatever fields `patch` contains
(this feature only ever sends `{ onboarding_status }`, but the method itself is not restricted to
that field — it forwards whatever `PUT /api/user/profile` is extended to accept). Errors are
swallowed client-side (same posture as `_fetchPost`) — onboarding-status writes are best-effort
and MUST NOT block or interrupt the coach-reaction UX per Constitution V (fire-and-forget writes
must never gate a user-facing operation).

## Call-site usage (both backends, identical call shape)

```js
const { store } = useStore();
await store.updateProfile({ onboarding_status: 'seen' });
```

No caller needs to know which backend is active — this is the entire point of the
storage-agnostic interface (`frontend-conventions.md`), and this feature must not special-case
either backend at any call site.

**Note on the one-time Home-fallback marker**: FR-007's "show the import offer once on the next
Home visit" marker is **not** part of `updateProfile`/the profile record at all — it is a plain
browser `localStorage` boolean (e.g. `onboarding_offer_shown_v1`), read/written directly by the
Home screen, independent of which store backend (`IndexedDBStore`/`SupabaseStore`) is active. This
keeps `updateProfile` itself backend-agnostic with no special-casing, and sidesteps needing a
server column for a marker that is inherently per-browser/per-device (a signed-in user on a
second device correctly gets their own independent fallback check). See data-model.md.
