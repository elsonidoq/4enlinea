import { createContext, useContext, useEffect, useState } from 'react';
import { IndexedDBStore } from './IndexedDBStore.js';
import { SupabaseStore } from './SupabaseStore.js';
import { track } from '../lib/track.js';

const StoreContext = createContext(null);

export function ProfileStoreProvider({ children }) {
  const [store, setStore] = useState(() => new IndexedDBStore());
  const [session, setSession] = useState(null);

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
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
  }

  return (
    <StoreContext.Provider value={{ store, session, signOut, refetchSession: checkSession }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  return useContext(StoreContext);
}
