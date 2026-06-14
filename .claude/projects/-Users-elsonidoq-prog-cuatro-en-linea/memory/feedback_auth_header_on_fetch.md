---
name: feedback_auth_header_on_fetch
description: "When adding server-side auth checks to a previously-anonymous fetch, also add the Authorization header at the call site — loadUser only populates req.user if the header is present"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 1261eb41-3fdf-4cee-bfb1-7b89e46714aa
---

When upgrading an endpoint to use `req.user` (e.g. to create a session row for authenticated users), the client-side `fetch` must explicitly send `Authorization: Bearer <token>`. `loadUser` only populates `req.user` when the header is present — it does not infer identity from cookies or other state.

**Why:** Epic 2c bug: `/api/puzzles/draw` was upgraded to create `challenge_sessions` rows for auth users, but `ChallengeScreen.loadPuzzles()` fetched without the header. `req.user` was always `null`; the session branch was never reached; the table stayed empty.

**How to apply:** Any time server code is changed to branch on `req.user`, grep the calling component(s) for the fetch and confirm the `Authorization` header is included when `session` is truthy. Pattern:
```js
const headers = session ? { Authorization: `Bearer ${session.access_token}` } : {};
fetch(`${API}/api/...`, { headers });
```
