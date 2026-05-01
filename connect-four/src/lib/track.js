const API = import.meta.env.VITE_API_BASE_URL || '';

// Fire-and-forget analytics event. Never throws, never awaited.
export function track(event, data = {}) {
  const path = window.location.pathname;
  fetch(`${API}/api/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, path, data }),
  }).catch(() => {}); // intentionally swallowed
}
