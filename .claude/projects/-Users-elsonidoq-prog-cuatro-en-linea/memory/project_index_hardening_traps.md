---
name: project_index_hardening_traps
description: "req.ip is XFF-spoofable under trust proxy (use req.socket.remoteAddress); 500-body sweep misses {error}-destructure shape"
metadata: 
  node_type: memory
  type: project
  originSessionId: f7f385de-f268-403d-8cea-de2d42418ac5
---

Two traps when hardening `connect-four/server/index.js` gates/error responses (both found in spec-047 QA, both now fixed):

- **`req.ip` is spoofable — localhost/IP gates MUST use `req.socket.remoteAddress`.** With `app.set('trust proxy', 1)` (needed for express-rate-limit behind Railway), Express derives `req.ip` from the client `X-Forwarded-For` header for one hop, so `curl -H 'X-Forwarded-For: 127.0.0.1'` from a non-loopback address passes any `req.ip`-based check. `requireLocalhost` was shipped by spec-047 US3 (T015) STILL spoofable — the planning docs wrongly assumed trust-proxy made `req.ip` safe (see the correction in OI-11). The fix: check `req.socket.remoteAddress` (raw TCP peer, header-immune). In prod it's Railway's proxy IP for all external traffic → rejected; only genuine on-box loopback passes. Now a prescriptive convention in `docs/architecture/server-conventions.md` "Localhost/IP gating under trust proxy".
- **Genericizing 500 bodies: grep for `err.message` alone misses the `{ error }`-destructure shape.** The T017 sweep only caught `catch (err) { res.status(500).json({ error: err.message }) }`. Routes that build the body from a destructured Supabase result — e.g. `GET /api/blunders/:id`'s `res.status(error ? 500 : 404).json({ error: error?.message || 'not found' })` — slipped through and leaked raw DB error text on a public endpoint. When auditing error-body leakage, also grep for `error?.message` / `error.message` in `.json(...)` calls, not just `err.message` in catch blocks.

Related: [[project_admin_localhost_directive]], [[project_spec031_staging_production_deploy]], [[project_blunder_serving_dual_paths]].
