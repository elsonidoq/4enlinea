---
name: project_indexeddb_signin_hang
description: "indexedDB.deleteDatabase is blocked by any open connection (incl. OTHER TABS) → next open() hangs → sign-in silently stalls because switchToSupabase awaits _db() before setSession"
metadata:
  node_type: memory
  type: project
---

Two coupled traps around the frontend store/auth layer (`src/store/ProfileStore.jsx`,
`src/store/IndexedDBStore.js`). Read before writing any local-state reset tooling or debugging a
"server says signed in but the UI is stuck signed-out" symptom.

**1. `indexedDB.deleteDatabase(name)` is BLOCKED as long as ANY connection holds the DB open —
including connections in OTHER TABS.** A blocked delete stays pending, and any subsequent
`indexedDB.open(name)` queues behind it and **hangs indefinitely** (empirically confirmed: while a
connection is open, delete reports `blocked` and a concurrent `open` sits `pending` until every
connection closes). The app opens `decodec4` on mount (`new IndexedDBStore()` → `openDB()`), so a
single tab reloading after a `deleteDatabase` races; with multiple tabs open it deterministically
hangs. **Never use `deleteDatabase` to reset local state. Clear the object stores in place instead**
(open the DB, `tx.objectStore(n).clear()` for each `db.objectStoreNames` in one readwrite
transaction) — a clear transaction needs no exclusive lock, so it never blocks.

**2. Sign-in silently depends on IndexedDB opening.** `ProfileStore.switchToSupabase` does
`await currentStore.migrateToSupabase(...)` **before** `setSession({ user })`. `migrateToSupabase`
starts with `const db = await this._db()` (the IndexedDB open promise). So if that open hangs (trap 1
above, or any other reason), sign-in never completes on the client: the server session cookie is
valid (`GET /api/auth/session` → 200), but React `session` stays null, the UI stays signed-out, and
**there is NO console error** (the `try/catch` around migrate only catches rejections, not a hang).
The dev "🛠 Dev: clear IndexedDB & sign out" button on Settings hit exactly this when it used
`deleteDatabase`; the fix clears stores in place. See the ordering invariant now documented in
`docs/architecture/frontend-conventions.md` §Auth Integration step 5. Related: [[project_auth_flow_traps]],
[[project_app_qa_setup_gotchas]].
