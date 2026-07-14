---
name: project_admin_localhost_directive
description: Owner directive — ALL /admin (API + frontend) localhost-only; requireAdmin is a no-op outside NODE_ENV=production
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 4176d659-b797-4125-825c-a96fa2d4c8f2
---

**Owner directive (2026-07-11, spec 046 FR-028):** every `/admin` surface must be reachable **only from localhost**, on BOTH the API and the frontend URLs. Enforcement must be minimal — a shared reusable guard applied as **at most a one-liner per admin route** (a single `requireLocalhost` middleware ref on each Express admin route; a single route-guard/wrapper on each frontend admin branch), grep-verifiable for coverage. No route exempt.

**Why:** admin routes look protected but aren't, in non-prod. `server/adminAuth.js` `requireAdmin` is `if (process.env.NODE_ENV !== 'production') return next();` — a **no-op outside production**. So the only real gate on admin routes is `requireLocalhost`, and any `/api/admin/*` route lacking it is exposed in prod.

**How to apply:** As of this session, most `/api/admin/*` routes already carry `requireLocalhost, requireAdmin`, but the lesson-editor routes (`/api/admin/lessons*`) and `GET /api/admin/puzzles` did NOT, and the frontend had **zero** client-side admin guard (the 5 `/admin/*` branches in `App.jsx`). Spec 046 adds the frontend guard (project's first-ever) + closes the API gaps. Also verify `NODE_ENV=production` is reliably set in the deploy, and before a blanket lockdown confirm no staging/QA workflow reaches `/admin` from a non-localhost origin. Related: [[project_server_architecture]], [[project_auth_flow_traps]].
