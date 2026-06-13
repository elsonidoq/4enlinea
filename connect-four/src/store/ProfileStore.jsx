import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { IndexedDBStore } from './IndexedDBStore.js';
import { SupabaseStore } from './SupabaseStore.js';
import { track } from '../lib/track.js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export function getSupabaseClient() {
  return supabase;
}

const StoreContext = createContext(null);

export function ProfileStoreProvider({ children }) {
  const [store, setStore] = useState(() => new IndexedDBStore());
  const [session, setSession] = useState(null);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      console.log('[auth] getSession:', data.session ? 'session found' : 'no session');
      if (data.session) switchToSupabase(data.session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log('[auth] onAuthStateChange event=%s hasSession=%s', event, !!newSession);
      if (newSession) {
        switchToSupabase(newSession, event);
      } else {
        setStore(new IndexedDBStore());
        setSession(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function switchToSupabase(newSession, event) {
    const supabaseStore = new SupabaseStore(supabase, newSession.user.id);
    // Migrate local state on first sign-in
    const currentStore = store;
    if (currentStore instanceof IndexedDBStore) {
      try {
        await currentStore.migrateToSupabase(supabaseStore, supabase);
      } catch (err) {
        console.error('[store] migration error:', err.message);
      }
    }
    if (event === 'SIGNED_IN') {
      track('signup_completed', { method: 'magic_link' });
    }
    setStore(supabaseStore);
    setSession(newSession);
  }

  return <StoreContext.Provider value={{ store, session, supabase }}>{children}</StoreContext.Provider>;
}

export function useStore() {
  return useContext(StoreContext);
}
