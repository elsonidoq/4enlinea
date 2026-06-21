---
name: project-error-logging
description: logError helper added 2026-06-21 — server/logger.js centralises console.error + optional Sentry; all silent catches fixed; global Express error middleware added
metadata: 
  node_type: memory
  type: project
  originSessionId: 8e7ee4f6-47d9-48be-9f8f-8ac99fe0844d
---

Implemented 2026-06-21 on branch `stagging`.

**Key additions:**
- `connect-four/server/logger.js` exports `logError(tag, err, extra = {})`:
  - Always calls `console.error(tag, message, stack?, extra?)`
  - If `SENTRY_DSN` is set, calls `Sentry.captureException(err, { tags: { tag }, extra })`
- Global Express 4-arg error middleware added at the end of `index.js` (before `app.listen`) as a safety net for `next(err)` or unhandled async throws:
  ```js
  app.use((err, req, res, next) => {
    logError('[unhandled]', err, { method: req.method, url: req.originalUrl });
    if (res.headersSent) return next(err);
    res.status(500).json({ error: 'Internal server error' });
  });
  ```
- 31 previously-silent catch blocks in `index.js` fixed; 3 in `userRoutes.js`; error-path `console.log` calls in `papergamesImporter.js` and `reprocess_blunders.mjs` replaced with `logError`.

**Intentionally unlogged exception:**
- `catch (e) { return res.status(400).json({ error: \`Invalid movestring: ${e.message}\` }) }` in `index.js` (~line 858) — this is a client-input validation 400, not a server error.

**Known test skip:**
- `tests/classifier/classifier.test.js` has a commented-out `forbidden_columns` board-based test (col5 / movestring `010263`) — classifier returns `suboptimal_move` instead of `forbidden_columns`. Needs investigation.

**How to apply:** When adding new catch blocks anywhere in server code, always use `logError(tag, err)` as the first statement rather than a bare `res.status(500)`. Use `[endpoint-path]` as the tag, e.g. `[scores]`, `[user/migrate]`.
