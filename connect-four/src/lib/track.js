import { IndexedDBStore } from '../store/IndexedDBStore.js';

const API = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || '';

let activeScreen = 'unknown';
export function setActiveScreen(key) { activeScreen = key; }

// Epic 8 — Onboarding Experience (FR-015): track() always carries the local
// anonymous profile's device_uuid as `uid`, for anonymous attribution across
// ALL events project-wide — not just onboarding ones. This is a narrow,
// justified direct read of IndexedDBStore from a non-component module,
// confined to this file (research.md R7). A single lazily-constructed
// instance is reused across calls. The read uses peekProfile() (read-only,
// non-creating) so firing an event never side-effect-creates a profile row.
let _localStore = null;
function getLocalStore() {
  if (!_localStore) _localStore = new IndexedDBStore();
  return _localStore;
}

// Fire-and-forget analytics event. Never throws, never awaited.
export function track(event, data = {}) {
  const path = activeScreen;
  getLocalStore()
    .peekProfile()
    .then((profile) => profile?.device_uuid ?? null)
    .catch(() => null)
    .then((uid) => {
      return fetch(`${API}/api/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, path, data, uid }),
      });
    })
    .catch(() => {}); // intentionally swallowed
}
