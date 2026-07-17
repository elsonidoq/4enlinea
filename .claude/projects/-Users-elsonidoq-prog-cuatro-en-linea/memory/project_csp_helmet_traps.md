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

Full current-state rationale (which origins are in/out and why) is in `docs/architecture/server-conventions.md` "CSP Directive Rationale". Related: `docs/architecture/server-conventions.md` §"Localhost/IP gating under `trust proxy`", [[project_papergames_integration]].
