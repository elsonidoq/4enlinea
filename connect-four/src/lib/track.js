const API = import.meta.env.VITE_API_BASE_URL || '';

let activeScreen = 'unknown';
export function setActiveScreen(key) { activeScreen = key; }

// Fire-and-forget analytics event. Never throws, never awaited.
export function track(event, data = {}) {
  const path = activeScreen;
  fetch(`${API}/api/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, path, data }),
  }).catch(() => {}); // intentionally swallowed
}
