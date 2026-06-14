---
name: bug_railway_trust_proxy
description: express-rate-limit throws ValidationError on Railway unless trust proxy is set
metadata: 
  node_type: memory
  type: project
  originSessionId: 477d4e49-b083-47b9-8ed4-3e917f0b9c34
---

Railway injects `X-Forwarded-For` on every request. `express-rate-limit` detects this and throws a `ValidationError` if Express's `trust proxy` is false (the default), causing every rate-limited endpoint to return 500.

**Why:** Discovered 2026-06-13 from Railway access logs showing 500 on `/api/user/migrate`.

**How to apply:** `app.set('trust proxy', 1)` must appear right after `const app = express()` in `index.js`. Already fixed. If deploying to a new Railway service, verify this line is present before any other middleware.
