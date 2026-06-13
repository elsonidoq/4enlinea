---
name: magic-link-auth-hash-race
description: Auth magic link fails because Navigator mount useEffect clears
metadata: 
  node_type: memory
  type: project
  originSessionId: d5fc9c08-c38f-4637-8716-9aed7fa9081b
---

## Root cause

`App.jsx` Navigator's mount `useEffect` calls `window.history.replaceState(state, '', '/')` which strips the `#access_token=...` hash fragment before GoTrueClient's async `_initialize()` can process it.

The race:
1. Module-level `createClient()` → GoTrueClient constructor calls `initialize()` → yields at async lock acquisition
2. React commits → `useEffect` runs synchronously → `replaceState(state, '', '/')` → hash destroyed
3. GoTrueClient acquires lock → `parseParametersFromURL(window.location.href)` → no `access_token` → `callbackUrlType = 'none'` → skips session recovery

**Why**: `_initialize()` is async and yields at `_acquireLock()`. React's commit phase runs before the lock is acquired, so the `useEffect` fires in between.

## Fix

Changed `replaceState` to preserve `window.location.hash`:
```js
window.history.replaceState({...}, '', resolvedUrl + window.location.hash);
```

The GoTrueClient then finds the hash, processes it, and clears it with `window.location.hash = ''` (its normal post-processing behavior).

## Related

- [[bug_service_worker_stale_cache]] — the second bug that prevented auth from working (SW served stale index.html before the JS could even run)
- File: `connect-four/src/App.jsx` line 29
