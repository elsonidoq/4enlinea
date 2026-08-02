---
name: project_csp_helmet_traps
description: helmet CSP is invisible under Vite dev; app has browser-side papergames.io deps a same-origin CSP breaks
metadata: 
  node_type: memory
  type: project
  originSessionId: f7f385de-f268-403d-8cea-de2d42418ac5
---

Traps when touching the helmet CSP in `connect-four/server/index.js` (spec 047 US2) or QA'ing security headers:

- **You CANNOT validate the CSP against `npm run dev`.** Vite (port 5173) serves the SPA document itself; Express (3001) only serves the API in dev — so Express's helmet CSP header **never lands on the HTML/WebSocket page** under `npm run dev`. CSP breakage is structurally invisible locally. To actually test it, load the app **served by Express from the built `dist/`** (localhost:3001 / prod) with DevTools console + Application→Service Workers open. Both the FR-005 smoke test and browser QA run against Vite and will give a false PASS on CSP.
- **The app makes browser-side cross-origin calls to papergames.io** that a naive same-origin CSP silently breaks: `PlayOnlineScreen.jsx` opens `wss://papergames.io/socket.io/...` (needs `connect-src`), `PastGamesListScreen.jsx` renders avatar `<img>` from `https://papergames.io` (needs `img-src`). The research phase missed these; caught in code review. They are real load-bearing deps and MUST stay in the CSP — unlike Sentry/OAuth which need no directive.
- **Service-worker registration lives in `src/main.jsx`, not an inline `<script>`** — moved out of `index.html` so `script-src 'self'` stays strict (no `'unsafe-inline'`/nonce). Don't reintroduce inline scripts into `index.html` without a `script-src` hash/nonce.

- **The Express server resolves `dist/index.html` at BOOT, so rebuilding under a running server silently
  serves the OLD asset hashes.** Symptom: a blank page and `Failed to load module script: ... MIME type
  "text/html"` — the stale hashed asset 404s and falls through to the SPA catch-all, which returns HTML.
  It looks like a service-worker or CSP bug and is neither. `curl -s localhost:$API_PORT/<route> | grep -o
  'assets/index-[A-Za-z0-9_-]*\.js'` versus the hash on disk tells you instantly. **Restart the server after
  every rebuild** — this bites precisely during CSP verification, which is the one workflow that forces you
  to rebuild and re-serve repeatedly.
- **You do NOT need a real Paddle client token to exercise the CSP.** `VITE_PADDLE_CLIENT_TOKEN` is unset
  locally (owner-confirmed: Paddle does not work locally), so the checkout button otherwise dead-ends before
  Paddle.js ever loads — `getPaddle()` returns `null` on a falsy token and you verify nothing. Building with
  the **placeholder** token from `.env.example` (`test_...`) makes Paddle.js load from `cdn.paddle.com` and
  the `sandbox-buy.paddle.com` overlay iframe actually render; Paddle then rejects the fake token *inside*
  its own iframe with "Something went wrong" — which is *after* every CSP-governed load has already
  succeeded. That boundary is exactly what CSP verification needs, so a placeholder token is sufficient
  evidence. Verified this way 2026-08-01 (spec 053 T044): zero violations from our policy.
- **A `frame-ancestors` violation in the console may not be yours.** `frame-ancestors` is delivered by the
  **framed** document, so `Framing 'https://sandbox-buy.paddle.com/' violates ... "frame-ancestors
  http://localhost"` is *Paddle's* report-only policy about who may embed *them* (derived from their
  approved-domain list), not a directive from our helmet config. It fires locally only because the dev server
  runs on a non-default port (`:4509` vs. the host-source `http://localhost`, which matches port 80), and it
  is report-only — "no further action has been taken", the overlay still renders. Do not "fix" our CSP in
  response to it.

Full current-state rationale (which origins are in/out and why) is in `docs/architecture/server-conventions.md` "CSP Directive Rationale". Related: `docs/architecture/server-conventions.md` §"Localhost/IP gating under `trust proxy`", [[project_papergames_integration]].
