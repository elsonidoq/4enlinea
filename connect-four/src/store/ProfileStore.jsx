import { createContext, useContext, useEffect, useState } from 'react';
import { IndexedDBStore } from './IndexedDBStore.js';
import { SupabaseStore } from './SupabaseStore.js';
import { track } from '../lib/track.js';
import { clearEntitlement } from '../lib/entitlement.js';

// Exported so tests can supply a lightweight `{ store, session, ... }` value directly
// (a `<StoreContext.Provider>`) instead of standing up the full `ProfileStoreProvider`,
// which does real network calls (checkSession) on mount — heavy for a component test
// that only needs `useStore()` to resolve to a known value. See
// tests/dom/ConceptScreenLocked.dom.test.jsx for the pattern.
/* eslint-disable react-refresh/only-export-components -- same pre-existing non-component-
   export pattern as `useStore` below in this file; not a new violation class. */
export const StoreContext = createContext(null);
/* eslint-enable react-refresh/only-export-components */

export function ProfileStoreProvider({ children }) {
  const [store, setStore] = useState(() => new IndexedDBStore());
  const [session, setSession] = useState(null);
  // Epic 8 — Onboarding Experience (FR-014, research.md R3): true once checkSession()'s
  // entire body (both the OAuth-hash branch and the cookie-restore branch) has resolved,
  // whether or not it ended up finding a session. `session` alone is ambiguous between
  // "still checking" and "confirmed anonymous" — Navigator's first-run redirect effect
  // (App.jsx) must not fire until this is true, so it never races session/OAuth-hash
  // restoration.
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    try {
      // Handle magic-link callback: tokens come in the URL hash
      const hash = window.location.hash;
      console.log('[store] checkSession hash=', hash ? hash.slice(0, 40) + '…' : '(empty)');
      if (hash && hash.includes('access_token=')) {
        try {
          const params = new URLSearchParams(hash.slice(1));
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken) {
            const apiBase = import.meta.env.VITE_API_BASE_URL || '';
            const res = await fetch(`${apiBase}/api/auth/callback`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ access_token: accessToken, refresh_token: refreshToken }),
            });

            console.log('[store] callback response status=', res.status);
            if (res.ok) {
              const { user } = await res.json();
              // Clear the hash from the URL without reload
              window.history.replaceState(null, '', window.location.pathname);
              await switchToSupabase({ user });
              return;
            } else {
              const body = await res.text();
              console.error('[store] callback failed:', res.status, body);
            }
          }
        } catch (err) {
          console.error('[store] callback error:', err.message);
        }
      }

      // No hash — try restoring session from cookie
      try {
        const apiBase = import.meta.env.VITE_API_BASE_URL || '';
        const res = await fetch(`${apiBase}/api/auth/session`, { credentials: 'include' });
        if (res.ok) {
          const { user } = await res.json();
          await switchToSupabase({ user });
        }
      } catch (err) {
        // stay anonymous (IndexedDBStore)
      }
    } finally {
      setSessionChecked(true);
    }
  }

  async function switchToSupabase({ user }) {
    const supabaseStore = new SupabaseStore(user.id);
    // Migrate local state on first sign-in
    const currentStore = store;
    if (currentStore instanceof IndexedDBStore) {
      try {
        await currentStore.migrateToSupabase(supabaseStore);
      } catch (err) {
        console.error('[store] migration error:', err.message);
      }
    }
    setStore(supabaseStore);
    setSession({ user });
  }

  async function signOut() {
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      await fetch(`${apiBase}/api/auth/signout`, { method: 'POST', credentials: 'include' });
    } catch (_) {
      // ignore errors
    }
    setStore(new IndexedDBStore());
    setSession(null);
    // Spec 053 US2: the entitlement cache is module-scoped, not account-scoped.
    // Without this the tab keeps serving the signed-out account's `entitled`
    // answer — and the FR-033 session-lapse branch would re-pin it forever.
    clearEntitlement();
  }

  return (
    <StoreContext.Provider value={{ store, session, sessionChecked, signOut, refetchSession: checkSession }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  return useContext(StoreContext);
}
