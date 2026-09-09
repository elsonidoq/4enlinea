// OI-173 — the local→Supabase migration must run ONCE per account, not on every load.
//
// `ProfileStore.jsx`'s `switchToSupabase` carries the comment "Migrate local state on
// first sign-in" directly above `if (currentStore instanceof IndexedDBStore)`. That
// guard is true on EVERY page load, because a hard reload always re-mounts the provider
// with a fresh `IndexedDBStore` before the session check resolves — the comment asserts
// a precondition the code never enforced. The re-run POSTs the now-EMPTY local stores
// (they were cleared by the first migration) to /api/user/migrate, which wiped the
// account's sparring_record and streak.
//
// This test drives the real `ProfileStoreProvider` through the real production path
// (mount -> checkSession -> /api/auth/session -> switchToSupabase). The two stores are
// module-mocked (node:test `--experimental-test-module-mocks`, same mechanism as
// PricingScreenPaddleInit.dom.test.jsx) because jsdom has no `indexedDB` and this test
// is about the GATE, not about IndexedDB. The mock class is what ProfileStore itself
// imports, so its `instanceof` check still sees the same class it does in production.
//
// The second render is the "hard reload": a brand-new provider, hence a brand-new
// IndexedDBStore instance, in the same browser (same localStorage).
import { test, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { render, cleanup, waitFor, screen, act } from '@testing-library/react';

let migrateCalls = 0;

class FakeIndexedDBStore {
  async migrateToSupabase() {
    migrateCalls += 1;
  }
}
class FakeSupabaseStore {
  constructor(userId) { this.userId = userId; }
}

mock.module('../../src/store/IndexedDBStore.js', {
  exports: { IndexedDBStore: FakeIndexedDBStore },
});
mock.module('../../src/store/SupabaseStore.js', {
  exports: { SupabaseStore: FakeSupabaseStore },
});

const { ProfileStoreProvider, useStore } = await import('../../src/store/ProfileStore.jsx');

const USER = { id: 'user-abc-123' };

function SessionProbe() {
  const { session, sessionChecked, signOut } = useStore();
  if (!sessionChecked) return <span>checking</span>;
  return (
    <>
      <span>{session ? `signed-in:${session.user.id}` : 'anonymous'}</span>
      <button onClick={signOut}>sign out</button>
    </>
  );
}

function stubFetch() {
  const original = globalThis.fetch;
  globalThis.fetch = (url) => {
    const u = String(url);
    if (u.endsWith('/api/auth/session')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ user: USER }) });
    }
    if (u.endsWith('/api/auth/signout')) return Promise.resolve({ ok: true });
    return Promise.reject(new Error(`unexpected fetch: ${u}`));
  };
  return () => { globalThis.fetch = original; };
}

afterEach(cleanup);

test('the local→Supabase migration runs once per account, not on every page load', async () => {
  const restoreFetch = stubFetch();
  try {
    globalThis.localStorage.clear();
    migrateCalls = 0;

    // ── Load 1: first sign-in. The migration SHOULD run.
    render(<ProfileStoreProvider><SessionProbe /></ProfileStoreProvider>);
    await waitFor(() => screen.getByText(`signed-in:${USER.id}`));
    assert.equal(migrateCalls, 1, 'first sign-in migrates local state');

    cleanup();

    // ── Load 2: hard reload. Fresh provider, fresh IndexedDBStore, same localStorage.
    // The migration must NOT run again — its payload would now be the empty local
    // stores, and the server treats it as a whole-value overwrite.
    render(<ProfileStoreProvider><SessionProbe /></ProfileStoreProvider>);
    await waitFor(() => screen.getByText(`signed-in:${USER.id}`));
    assert.equal(migrateCalls, 1, 'a hard reload must NOT re-run the migration');

    // ── Load 3, for good measure.
    cleanup();
    render(<ProfileStoreProvider><SessionProbe /></ProfileStoreProvider>);
    await waitFor(() => screen.getByText(`signed-in:${USER.id}`));
    assert.equal(migrateCalls, 1, 'still exactly one migration after a second reload');
  } finally {
    restoreFetch();
  }
});

test('a DIFFERENT account on the same device still migrates (the marker is per-account)', async () => {
  const original = globalThis.fetch;
  const OTHER = { id: 'user-second-999' };
  globalThis.fetch = (url) => {
    const u = String(url);
    if (u.endsWith('/api/auth/session')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ user: OTHER }) });
    }
    return Promise.reject(new Error(`unexpected fetch: ${u}`));
  };
  try {
    // localStorage still carries the first account's marker from the test above.
    const before = migrateCalls;
    render(<ProfileStoreProvider><SessionProbe /></ProfileStoreProvider>);
    await waitFor(() => screen.getByText(`signed-in:${OTHER.id}`));
    assert.equal(migrateCalls, before + 1, 'a second account on the same device migrates its own local state');
  } finally {
    globalThis.fetch = original;
  }
});

// Behaviour the gate must NOT break: signing out and playing anonymously, then signing
// back into the SAME account, still migrates that new local state. The marker records
// "this account has consumed this device's local state" — signing out starts a fresh
// IndexedDBStore, so there is new local state to consume.
test('signing out clears the marker, so a later sign-in migrates the new anonymous state', async () => {
  const restoreFetch = stubFetch();
  try {
    globalThis.localStorage.clear();
    migrateCalls = 0;

    render(<ProfileStoreProvider><SessionProbe /></ProfileStoreProvider>);
    await waitFor(() => screen.getByText(`signed-in:${USER.id}`));
    assert.equal(migrateCalls, 1);

    await act(async () => {
      screen.getByText('sign out').click();
    });
    await waitFor(() => screen.getByText('anonymous'));

    cleanup();

    // Sign back in (a fresh load, as after sign-out the app is anonymous again).
    render(<ProfileStoreProvider><SessionProbe /></ProfileStoreProvider>);
    await waitFor(() => screen.getByText(`signed-in:${USER.id}`));
    assert.equal(migrateCalls, 2, 'post-sign-out anonymous state is migrated on the next sign-in');
  } finally {
    restoreFetch();
  }
});
