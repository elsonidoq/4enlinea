// OI-173 — one-time marker for the local(IndexedDB)→Supabase migration.
//
// `ProfileStore.jsx`'s `switchToSupabase` used to gate the migration on
// `currentStore instanceof IndexedDBStore`. A hard reload always re-mounts the
// provider with a fresh `IndexedDBStore` before the session check resolves, so that
// condition is true on EVERY load — the migration re-ran and POSTed the (now empty)
// local stores over the account's real sparring_record and streak.
//
// Same shape and rationale as `onboardingOfferMarker.js`: a plain localStorage module
// (not part of the profile record, not synced to the server), extracted rather than
// inlined in the screen so it is unit-testable with plain `node --test`. Two
// differences, both deliberate:
//   * the key is scoped BY ACCOUNT (`<key>:<userId>`), because signing into a second
//     account on the same device must still migrate that device's local state once;
//   * localStorage, not IndexedDB and not a new `users` column — it survives a hard
//     reload, needs no DB migration, and the server-side content guard in
//     `server/userHelpers.js` (writeSparringRecord / writeStreak) is the backstop for
//     the cases where the marker is legitimately lost (private browsing, or
//     SettingsScreen's `localStorage.clear()`).

const MARKER_KEY_PREFIX = 'local_migration_done_v1';

/** @param {string} userId */
function markerKey(userId) {
  return `${MARKER_KEY_PREFIX}:${userId}`;
}

/**
 * Has this account already migrated its local state on this device?
 * Never throws (private-browsing / storage-disabled safe). A missing/blank userId
 * reads as "not migrated" so the caller falls through to the normal path.
 * @param {string} userId
 * @returns {boolean}
 */
export function isLocalMigrationDone(userId) {
  if (!userId) return false;
  try {
    return globalThis.localStorage?.getItem(markerKey(userId)) === '1';
  } catch {
    return false;
  }
}

/**
 * Record that this account has migrated. SINGLE call site in the app:
 * `ProfileStore.jsx`'s `switchToSupabase`, and only AFTER `migrateToSupabase()`
 * resolves — a failed migration must be retried on the next load. Never throws.
 * @param {string} userId
 */
export function setLocalMigrationDone(userId) {
  if (!userId) return;
  try {
    globalThis.localStorage?.setItem(markerKey(userId), '1');
  } catch {
    // ignore — private-browsing/storage-disabled. The migration may then re-run on
    // the next load; the server-side empty-payload guard (OI-173) makes that harmless.
  }
}

/**
 * Forget the marker for one account. SINGLE call site: `ProfileStore.jsx`'s `signOut`.
 * Signing out installs a fresh `IndexedDBStore`, so any play that follows is NEW local
 * state that a later sign-in must still be able to migrate — the marker means "this
 * account has already consumed this device's local state", and sign-out ends that
 * claim. Never throws.
 * @param {string} userId
 */
export function clearLocalMigrationDone(userId) {
  if (!userId) return;
  try {
    globalThis.localStorage?.removeItem(markerKey(userId));
  } catch {
    // ignore — private-browsing/storage-disabled
  }
}

export { MARKER_KEY_PREFIX };
