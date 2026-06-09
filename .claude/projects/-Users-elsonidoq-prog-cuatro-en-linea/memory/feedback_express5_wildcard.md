---
name: feedback_express5_wildcard
description: Express 5 rejects app.get('*', ...) — use app.get('/{*path}', ...) for catch-all routes
metadata:
  type: feedback
---

`app.get('*', handler)` throws a `PathError` at startup in Express 5 (path-to-regexp no longer accepts bare `*`).

**Why:** Express 5 upgraded path-to-regexp to a version that requires named parameters — `*` alone is invalid syntax.

**How to apply:** Whenever adding a catch-all GET route to `server/index.js`, use `app.get('/{*path}', handler)` instead of `app.get('*', handler)`. This is the Express 5 canonical wildcard syntax.
