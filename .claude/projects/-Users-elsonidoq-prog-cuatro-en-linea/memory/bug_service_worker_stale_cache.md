---
name: service-worker-stale-cache
description: SW cache-first on index.html breaks app after every deploy; must use network-first for HTML
metadata: 
  node_type: memory
  type: project
  originSessionId: d5fc9c08-c38f-4637-8716-9aed7fa9081b
---

## Root cause

`public/sw.js` used cache-first strategy for `/` (index.html):
```js
caches.match(event.request).then(cached => cached || fetch(event.request))
```

After every Railway deploy:
1. SW serves cached `index.html` → references old hashed JS files (e.g., `index-TgmDuOIa.js`)
2. New deploy replaced those files with new hashes (e.g., `index-C1l7p6Wh.js`)
3. Browser tries to load old JS → Express catch-all returns `index.html` (text/html)
4. Browser rejects module script with wrong MIME type → app never loads → auth never runs

**Why**: Vite generates content-hashed JS filenames. `index.html` changes every deploy. The SW cached it permanently with no update mechanism. `skipWaiting()` + `clients.claim()` meant the SW activated immediately, but the cache was populated once and never refreshed.

## Fix

Changed to:
- **Navigation requests**: network-first (cache on success, fall back to cache when offline)
- **Hashed assets** (`/assets/*`): cache-first (immutable filenames are safe to cache)
- **Other static assets**: cache-first with network update
- Bumped `CACHE_NAME` to `v2` to invalidate all stale cache
- Removed eager pre-cache of `/` on install

File: `connect-four/public/sw.js`

## Related

- [[magic-link-auth-hash-race]] — the first bug preventing auth; this SW bug compounded it
- [[spec031-production-deploy]] — Railway edge CDN can also serve stale files across different edge nodes
