# Security Hardening Review — DecodeC4 (Connect Four)

**Scope:** Defensive review of source code, configuration, and git history in this
repository, plus static review of the local Node server (`connect-four/server`). No live
remote host was contacted. Items that can only be confirmed against the deployed app are
collected in the **Production Verification Checklist**.

**Date:** 2026-07-07
**Reviewer:** automated defensive review (Claude Fable)
**Central question:** *How well-protected is the application's source code and the
credentials that guard it, and what currently weakens that protection?*

---

## 1. Executive Summary

The headline is good news: **no real secret values are committed anywhere in tracked
files or in git history.** Every credential-shaped string found in the repo and history is
a placeholder (`sb_secret_...`, `PASSWORD`, `whsec_...`, `sk-ant-...`). The real `.env`
lives only on disk at `connect-four/server/.env`, is correctly gitignored, and never
enters version control. The architecture is fundamentally sound: the frontend has **no**
Supabase client SDK (all data access is server-mediated), the service-role key is
server-only, RLS is enabled deny-by-default on every user-data table, the native solver is
spawned with array arguments (no shell injection surface), and user tier/role is enforced
server-side.

The things worth fixing, ranked by risk:

1. **Dependency vulnerabilities, incl. 2 critical / 1 high** *(High)* — `npm audit`
   reports a critical (`shell-quote`, pulled in by `concurrently`), a high (`ws`), and
   several moderates. `concurrency` is miscategorised as a **production** dependency; it is
   a dev tool. Fix with `npm audit fix` and move `concurrently` to `devDependencies`.
2. **`NODE_ENV=production` is load-bearing for two security controls and is not set in
   committed config** *(High — needs prod verification)* — the auth-cookie `Secure` flag
   AND the `requireAdmin` gate both key off `NODE_ENV === 'production'`. If Railway does not
   set it, session cookies ship without `Secure` **and** every `requireAdmin`-guarded admin
   endpoint (lesson CRUD, puzzle CRUD) becomes world-open.
3. **No security response headers** *(Medium)* — the Express app installs no `helmet`/CSP/
   HSTS/`X-Frame-Options`/`X-Content-Type-Options`/`Referrer-Policy`. Add `helmet` and
   verify headers on the live host.
4. **Admin localhost gate depends on `req.ip` behind a proxy** *(Medium — verify)* —
   `requireLocalhost` compares `req.ip` to `127.0.0.1`. With `trust proxy = 1` this is safe
   on a single-hop Railway proxy, but must be verified that a spoofed `X-Forwarded-For`
   cannot make `req.ip` read `127.0.0.1`.
5. **Raw `err.message` returned to clients on 500s** *(Low)* — ~53 handlers echo the raw
   error message; can leak internal detail. Return a generic message; log the detail.
6. **Committed artefacts that should not be tracked** *(Low)* — a 673 KB dev-server log
   (`connect-four/log`) containing request traces, and three `.DS_Store` files.

Nothing here indicates an active compromise or an exposed key requiring emergency rotation.
The work is hardening and hygiene.

---

## 2. Codebase & Credential Exposure Assessment

**How exposed are the source and its credentials today? — Low exposure.**

### Secrets in the repo / history
- **Tracked files:** the only credential-shaped tokens are in `connect-four/.env.example`
  (`connect-four/.env.example:13`, `:22`, etc.) and are all documentation placeholders.
  No real key is committed.
- **Git history:** a pickaxe search (`-S` over `sb_secret_`, `sk-ant-api`, `sk_live_`,
  JWT-format `eyJhbGciOiJIUzI1NiI`, `whsec_`) surfaced five commits — `efb8723`, `476b365`,
  `acf7ae3`, `91529cc`, `e69b534`. Each was inspected. Every hit is a placeholder:
  - The Supabase connection string committed in the auto-memory file
    (`.claude/.../memory/reference_supabase_connection.md`, first added in `91529cc`) reads
    `postgresql://postgres.kxtqwsumojtexokrtlfp:PASSWORD@aws-1-us-west-2.pooler.supabase.com:5432/postgres`
    — the password literal is the word **`PASSWORD`**, and the service key is the literal
    **`sb_secret_...`**. Not real.
  - `whsec_...`, `sk-ant-...`, `sk_test_...` in `e69b534` are all `.env.example` template
    text.
  - **Conclusion: no secret in git history requires rotation.**

### Could an exposed credential reach the source or the deploy pipeline?
No credential is exposed, so there is no committed path to the source or pipeline. The
real secrets live in `connect-four/server/.env` (local, gitignored) and in Railway's
environment (not in the repo). The keys that *would* be high-value if ever leaked — and
that the owner should treat as crown jewels — are: `SUPABASE_SERVICE_ROLE_KEY` (full DB
access, bypasses RLS), `DATABASE_URL` (direct pooler creds), `ANTHROPIC_API_KEY`,
`OPENAI_API_KEY`, and (in prod) `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`. None are
currently exposed.

### Repository access controls
- **Remote:** `git@github.com:elsonidoq/4enlinea.git` (private, per owner). Branch
  protection and CI-secret handling **could not be verified** (no `gh` auth in this
  environment) — see the checklist.
- **Recon exposure (Info):** the `.claude/` auto-memory (172 tracked files) is committed to
  the repo. It contains no secrets, but it does document operational internals — the
  Supabase project ref `kxtqwsumojtexokrtlfp`, the pooler hostname/region, the default
  admin email (`elsonidoq@gmail.com`), infra layout, and admin endpoint behaviour. If the
  repo were ever made public or a collaborator's access were abused, this is a
  reconnaissance gift. Consider whether `.claude/` belongs in the tracked tree.

### Ranking of exposures by how much they weaken codebase protection
| Rank | Exposure | Weakens protection because |
|---|---|---|
| 1 | Dependency vulns (§ finding F1) | Reachable at runtime; `ws`/`qs`/`ip-address` DoS + `shell-quote` in build tooling |
| 2 | `NODE_ENV` gating (F2) | If unset, admin write endpoints open + cookies lose `Secure` |
| 3 | `.claude/` memory tracked (F9) | Recon detail on infra + admin identity (no secrets) |
| 4 | Committed dev log + `.DS_Store` (F6/F7) | Request traces (user IDs/IPs); minor path/host leak |

**Bottom line:** the source and its credentials are currently well-protected. The exposures
are about *reducing runtime attack surface* and *not regressing* the good posture (e.g. by
letting `NODE_ENV` drift), not about a live leak.

---

## 3. Findings Table

| ID | Title | Severity | Area | Status | Location |
|----|-------|----------|------|--------|----------|
| F1 | Vulnerable dependencies; `concurrently` is a prod dep | High | Dependencies | confirmed (local audit) | `connect-four/package.json` |
| F2 | `NODE_ENV=production` gates cookie `Secure` + `requireAdmin` | High | Deploy / Auth | needs-verification | `index.js:208`, `adminAuth.js:2` |
| F3 | No security response headers (CSP/HSTS/XFO/XCTO/Referrer) | Medium | Deploy / Server | confirmed (absent in code) | `connect-four/server/index.js` (no `helmet`) |
| F4 | Admin localhost gate depends on `req.ip` behind proxy | Medium | Server / Deploy | needs-verification | `index.js:2763` |
| F5 | Raw `err.message` echoed to clients on 500 | Low | Server | confirmed | `index.js` (~53 sites) |
| F6 | 673 KB dev log `connect-four/log` tracked in git | Low | Hygiene | confirmed | `connect-four/log` |
| F7 | `.DS_Store` tracked; root `.gitignore` omits it | Low | Hygiene | confirmed | `.claude/.DS_Store`, `docs/**/.DS_Store` |
| F8 | Debug endpoint has no input validation (localhost-only) | Info | Server | confirmed | `index.js:2720` |
| F9 | `.claude/` memory (infra recon) tracked in repo | Info | Hygiene | confirmed | `.claude/**` |
| F10 | Positive controls (see §4) — verified sound | Info | All | confirmed | multiple |

---

## 4. Detailed Findings

### F1 — Vulnerable dependencies; `concurrently` mis-scoped as production *(High)*
**What:** `npm audit --production` (run locally) reports **12 vulnerabilities (2 critical,
1 high, 9 moderate)**:
- `shell-quote` **critical** (via `concurrently`) — improper newline escaping.
- `ws` **high** — uninitialised memory disclosure + memory-exhaustion DoS (transitive, via
  `@supabase/supabase-js` realtime).
- `qs`, `ip-address` (via `express-rate-limit`), `@opentelemetry/core`, `brace-expansion` —
  **moderate**, several remotely-triggerable DoS.

**Evidence:** `connect-four/package.json` lists `concurrently` under `dependencies`
(alongside `express`, `stripe`, `pg`), not `devDependencies`. `concurrently` is only used
by the `dev` script — it should never ship to production.

**Why it matters:** `ws` and `qs`/`ip-address` are reachable at runtime; the DoS advisories
apply to a live server. `shell-quote` ships only because a dev tool is mis-scoped.

**Fix:**
1. Move `concurrently` to `devDependencies` in `connect-four/package.json`.
2. Run `npm audit fix` (all four fixable items have non-breaking fixes per the audit).
3. Re-run `npm audit --production` and confirm 0 critical/high.
4. Rebuild the deployed image so the fixes land in production.

---

### F2 — `NODE_ENV=production` gates two security controls *(High — verify on Railway)*
**What:** Two independent security behaviours are switched by `NODE_ENV`:
- **Cookie `Secure` flag** — `cookieOpts()` sets `secure: process.env.NODE_ENV === 'production'`
  (`index.js:208`). If `NODE_ENV` is anything else, `sb_access_token` / `sb_refresh_token`
  are sent over plaintext-eligible cookies.
- **Admin authorisation** — `requireAdmin` returns `next()` unconditionally when
  `NODE_ENV !== 'production'` (`adminAuth.js:2`). The lesson CRUD endpoints
  (`POST/PUT/DELETE /api/admin/lessons*`, `index.js:721/735/750`) and
  `GET /api/admin/puzzles` (`index.js:763`) are guarded **only** by `requireAdmin` (no
  localhost check). If `NODE_ENV` is unset in prod, these become world-writable.

**Why it matters:** A single missing env var silently downgrades both session-cookie
security and admin-endpoint authorisation.

**Fix:** Ensure `NODE_ENV=production` is set in the Railway service environment. Consider a
startup assertion in `index.js` that refuses to boot (or loudly warns) if `NODE_ENV` is not
`production` when `SUPABASE_URL` points at the prod project. See checklist items C5/C6.

---

### F3 — No security response headers *(Medium)*
**What:** The Express app (`connect-four/server/index.js`) registers `express.json`,
`cookie-parser`, a request logger, rate limiters, and routes — but **no** `helmet` or
manual security headers. There is no CSP, HSTS, `X-Content-Type-Options: nosniff`,
`X-Frame-Options`/`frame-ancestors`, or `Referrer-Policy`.

**Why it matters:** Without `X-Frame-Options`/CSP `frame-ancestors`, the app can be framed
(clickjacking). Without `nosniff`, MIME-confusion is possible. Without HSTS, a first-visit
downgrade is possible. The app renders LLM-generated coaching text, so a CSP is defence in
depth even though no `dangerouslySetInnerHTML` was found (see F10).

**Fix:** Add `helmet` with a tuned CSP:
```js
import helmet from 'helmet';
app.use(helmet({
  contentSecurityPolicy: { directives: { /* self + needed origins */ } },
  hsts: { maxAge: 31536000, includeSubDomains: true },
}));
```
Then confirm headers on the live host (checklist C1).

---

### F4 — Admin localhost gate depends on `req.ip` behind a proxy *(Medium — verify)*
**What:** `requireLocalhost` (`index.js:2763`) allows the request when
`req.ip ∈ {127.0.0.1, ::1, ::ffff:127.0.0.1}`. It guards the generation/curation/audio
admin endpoints (`/api/admin/generate`, `/api/admin/candidates*`, `/api/admin/puzzles`,
`/api/admin/audio/*`, `/api/debug/classify-all`). `app.set('trust proxy', 1)`
(`index.js:45`) means `req.ip` is derived from the last hop of `X-Forwarded-For`.

**Why it matters:** With `trust proxy = 1`, Express trusts exactly one proxy hop, so a
client-supplied `X-Forwarded-For: 127.0.0.1` is normally overwritten by Railway's edge and
cannot forge `req.ip`. This is *probably* safe — but it depends on there being exactly one
trusted hop in front of the app. If Railway inserts an additional proxy, `trust proxy = 1`
could expose the client-controlled XFF value.

**Fix:** Verify on the live host (checklist C7) that
`curl -H 'X-Forwarded-For: 127.0.0.1' https://<host>/api/admin/candidates` returns **403**.
Consider hardening these endpoints to *also* require an admin session, so localhost is a
second factor rather than the only one.

---

### F5 — Raw `err.message` returned to clients on 500 *(Low)*
**What:** ~53 handlers use `res.status(500).json({ error: err.message })` (e.g.
`index.js:259, 285, 321, 552, 595, ...`). The global handler
(`index.js:3931`) logs via `logError` but individual handlers still echo the raw message.

**Why it matters:** DB/driver/SQL error messages can leak schema or internal paths to a
remote caller. Stack traces are not exposed (good), but messages can still be informative
to an attacker.

**Fix:** Return a generic `{ error: 'internal error' }` on 500 for public endpoints; keep
the detailed message in `logError`/Sentry only. Client-input 4xx messages can stay.

---

### F6 — 673 KB dev log tracked in git *(Low)*
**What:** `connect-four/log` is a tracked 673 KB UTF-8 file — captured `npm run dev`
output including the `[req] <method> <url> ip=<ip>` request logger (`index.js:48`) and
`[auth/callback] user verified: <uuid>` lines. `grep` found **no** tokens/keys in it, but
it does contain user IDs, IPs, and movestrings.

**Why it matters:** Request traces with user IDs and IPs shouldn't live in version control;
it is a slow privacy/recon leak and bloats the repo. `connect-four/.gitignore` covers
`logs`/`*.log` but not a file literally named `log`.

**Fix:** `git rm --cached connect-four/log`, add `log` (or `connect-four/log`) to
`.gitignore`, and stop redirecting dev output into a tracked path.

---

### F7 — `.DS_Store` tracked; root `.gitignore` omits it *(Low)*
**What:** `.claude/.DS_Store`, `docs/external_references/.DS_Store`, and
`docs/mvp/mockup/.DS_Store` are tracked. The **root** `.gitignore` does not list
`.DS_Store` (only `connect-four/.gitignore` does). `git status` also shows new untracked
`.DS_Store` files at the root and in `docs/`.

**Why it matters:** `.DS_Store` leaks local directory listings (filenames) and is pure
noise. Minor.

**Fix:** Add `.DS_Store` to the **root** `.gitignore`, then
`git rm --cached '**/.DS_Store'`.

---

### F8 — Debug endpoint lacks input validation *(Info)*
**What:** `POST /api/debug/classify-all` (`index.js:2720`) enforces a localhost check but
passes `req.body.moves` to `solver.query(ms)` without the `^[0-6]{0,42}$` validation used
elsewhere.

**Why it matters:** Localhost-only, so low reachability; a malformed movestring could hang
or error the solver. Defence in depth only.

**Fix:** Apply the standard movestring regex before `solver.query`.

---

### F9 — `.claude/` memory tracked in repo *(Info)*
**What:** 172 files under `.claude/` are tracked, including auto-memory that documents the
Supabase project ref, pooler host, default admin email, and admin-endpoint behaviour. No
secrets, but recon-useful.

**Fix:** Decide deliberately whether `.claude/` should be tracked. If it stays, treat the
repo's confidentiality accordingly (it already must be private).

---

### F10 — Positive controls verified sound *(Info)*
These were checked and found correctly implemented — record them so they are not
regressed:
- **Service-role key is server-only.** No `createClient`, `SUPABASE_SERVICE_ROLE_KEY`, or
  `sb_secret` appears anywhere under `connect-four/src/`. The client-side Supabase SDK was
  removed (commit `87f2818`); the frontend talks only to `/api/*` with `credentials:
  'include'`.
- **RLS enabled deny-by-default** on every user-data and backend table — `users`,
  `blunders`, `games`, `puzzle_attempts`, `session_stats`, `lesson_progress`, `tracks`,
  `stripe_events`, `explanation_cache`, `puzzles`, `candidates`, `false_positive_records`
  (migrations `010`, `037`, `006`, `021`, `049`, `001`, `003`, `011`). Access is mediated
  by the service-role key through the Express server. *(Live enforcement still worth a
  dashboard check — checklist C8.)*
- **No shell injection.** All three native-solver invocations
  (`c4solver-wrapper.js:12`, `index.js:141`, `index.js:818`) and the board-visualisation
  call (`llmCoachHelpers.js:169`) use `spawn`/`spawnSync` with **array args and no
  `shell: true`**. Movestrings are validated with `^[0-6]{0,42}$` at route handlers and
  written to stdin, never interpolated into a command line.
- **No CORS middleware** — the API is same-origin (server also serves the SPA), so there is
  no `credentials:'include'` + permissive-origin footgun.
- **No unsafe HTML rendering.** No `dangerouslySetInnerHTML`, `innerHTML`, `eval`, or
  `new Function` in `connect-four/src/`. LLM/coach text is not injected as raw HTML.
- **Tier/role is server-enforced.** `tier` is written only by the Stripe webhook
  (`index.js:2685/2691`); client bodies never set it. Frontend reads tier for UI only
  (`PostSetSummaryScreen.jsx:50`).
- **Stripe webhook verifies signatures** via `stripe.webhooks.constructEvent(..., STRIPE_WEBHOOK_SECRET)`
  (`index.js:2649`) on a raw body (`express.raw`).
- **Rate limiting** is applied per route prefix behind `trust proxy = 1` (`index.js:88–94`).
- **Vite** produces no source maps by default (no `build.sourcemap` override in
  `vite.config.js`), and `dist/` is gitignored.
- **`.env` is correctly ignored** (`connect-four/.gitignore:2` → `.env`, `.env.*`,
  `!.env.example`) and confirmed untracked.

---

## 5. Production Verification Checklist

Run against the live deployment (replace `$HOST` with the production origin). Each item is
self-contained.

- [ ] **C1 — Security headers present**
  - **Run:** `curl -sI https://$HOST/ | grep -iE 'content-security-policy|strict-transport-security|x-frame-options|x-content-type-options|referrer-policy'`
  - **Motivated by:** F3 — no `helmet`/header middleware in `connect-four/server/index.js`.
  - **Expected/safe:** all five headers present (HSTS with a long `max-age`, `nosniff`, a
    `frame-ancestors`/`X-Frame-Options` deny/self, a CSP, a Referrer-Policy).
  - **Bad result:** any missing → **Medium** (clickjacking / MIME sniffing / downgrade).

- [ ] **C2 — HTTPS enforced / no plaintext**
  - **Run:** `curl -sI http://$HOST/ -o /dev/null -w '%{http_code} %{redirect_url}\n'`
  - **Motivated by:** F2 (cookie `Secure`) — cookies are only safe if transport is HTTPS.
  - **Expected/safe:** 301/308 redirect to `https://`.
  - **Bad result:** 200 over HTTP → **Medium**.

- [ ] **C3 — Auth cookie flags**
  - **Run:** perform a login and inspect `Set-Cookie` for `sb_access_token`:
    `curl -sI ... | grep -i set-cookie` (or DevTools → Application → Cookies).
  - **Motivated by:** `index.js:204–210` (`httpOnly`, `sameSite:'lax'`, `secure` gated on
    `NODE_ENV`).
  - **Expected/safe:** `HttpOnly; Secure; SameSite=Lax` on both `sb_access_token` and
    `sb_refresh_token`.
  - **Bad result:** missing `Secure` or `HttpOnly` → **High** (session theft).

- [ ] **C4 — `.env` / `.git` / source maps not served**
  - **Run:**
    `for p in /.env /server/.env /.git/config /connect-four/server/.env; do echo -n "$p "; curl -s -o /dev/null -w '%{http_code}\n' https://$HOST$p; done`
    and `curl -s https://$HOST/ | grep -oE '/assets/[^"]+\.js' | head -1` then request that
    file with `.map` appended.
  - **Motivated by:** static serve is `express.static('../dist')` only (`index.js:3847`);
    verify no dotfiles/maps leak.
  - **Expected/safe:** 404 for every path above; `.map` request 404.
  - **Bad result:** any 200 → **Critical** (`.env`) / **High** (`.git`, source maps).

- [ ] **C5 — `NODE_ENV=production` is set (admin gate active)**
  - **Run:** `curl -s -o /dev/null -w '%{http_code}\n' https://$HOST/api/admin/lessons`
    (unauthenticated).
  - **Motivated by:** `adminAuth.js:2` — `requireAdmin` allows all when
    `NODE_ENV !== 'production'`.
  - **Expected/safe:** **403** (or 401).
  - **Bad result:** **200** with lesson data → **Critical** (admin endpoints open;
    `NODE_ENV` not set).

- [ ] **C6 — Admin write endpoints reject non-admins**
  - **Run:** `curl -s -X POST https://$HOST/api/admin/lessons -H 'Content-Type: application/json' -d '{}' -o /dev/null -w '%{http_code}\n'`
  - **Motivated by:** `index.js:721/735/750` guarded only by `requireAdmin`.
  - **Expected/safe:** 401/403.
  - **Bad result:** 201/400-validation (i.e. it *processed* the body) → **Critical**.

- [ ] **C7 — Localhost admin gate not bypassable via XFF**
  - **Run:** `curl -s -H 'X-Forwarded-For: 127.0.0.1' -o /dev/null -w '%{http_code}\n' https://$HOST/api/admin/candidates`
  - **Motivated by:** F4 — `requireLocalhost` trusts `req.ip` with `trust proxy = 1`.
  - **Expected/safe:** **403**.
  - **Bad result:** 200 → **High** (spoofable admin access).

- [ ] **C8 — Supabase RLS actually enforced live**
  - **Run:** with the **anon/publishable** key, attempt a direct REST read of a user table:
    `curl -s 'https://kxtqwsumojtexokrtlfp.supabase.co/rest/v1/blunders?select=*&limit=1' -H "apikey: $ANON" -H "Authorization: Bearer $ANON"`
  - **Motivated by:** migration `010_rls_backend_tables.sql` (RLS enabled, no policies).
  - **Expected/safe:** empty array `[]` or permission error — never real rows.
  - **Bad result:** rows returned → **Critical** (RLS off / anon key over-privileged).

- [ ] **C9 — TTS storage bucket is private**
  - **Run:** obtain an `audio_path` and try the unsigned public URL:
    `curl -s -o /dev/null -w '%{http_code}\n' 'https://kxtqwsumojtexokrtlfp.supabase.co/storage/v1/object/public/coach-tts/<path>.mp3'`
  - **Motivated by:** `index.js:3689` uses `createSignedUrl` (1-week) and `:3750` uploads to
    the `coach-tts` bucket — implies the bucket should be **private**.
  - **Expected/safe:** 400/403/404 for the *public* path; access only via the signed URL.
  - **Bad result:** 200 on the public path → **Medium** (bucket is public).

- [ ] **C10 — OAuth / magic-link redirect allowlist**
  - **Run:** in the Supabase dashboard (Auth → URL Configuration), confirm the redirect
    allowlist contains only the production `FRONTEND_URL` (and intended dev origins).
  - **Motivated by:** `index.js:219` builds the Google authorize URL from `FRONTEND_URL`;
    magic-link/OAuth security depends on the Supabase-side allowlist.
  - **Expected/safe:** no wildcard, no stray origins.
  - **Bad result:** wildcard or attacker-controllable origin → **High** (token redirect).

- [ ] **C11 — Rate limiting effective behind proxy**
  - **Run:** `for i in $(seq 1 10); do curl -s -o /dev/null -w '%{http_code} ' -X POST https://$HOST/api/explain-move-llm -H 'Content-Type: application/json' -d '{}'; done; echo`
  - **Motivated by:** `index.js:89` (5 req/min) + `trust proxy = 1` (`:45`).
  - **Expected/safe:** 429s appear after the limit; per-IP not per-server.
  - **Bad result:** never 429 → **Medium** (limiter not seeing real client IP).

- [ ] **C12 — Deployed image has audit fixes**
  - **Run:** in the deployed build context, `npm audit --production` (or check the built
    image's lockfile).
  - **Motivated by:** F1.
  - **Expected/safe:** 0 critical/high.
  - **Bad result:** criticals present → **High**.

---

## 6. What Could Not Be Verified

- **Railway environment variables** — whether `NODE_ENV`, `SUPABASE_SERVICE_ROLE_KEY`,
  `DATABASE_URL`, `ADMIN_EMAILS`, `STRIPE_*`, `OPENAI_*`, `ANTHROPIC_API_KEY`,
  `SENTRY_DSN`, `FRONTEND_URL` are set correctly and scoped to the service (not exposed to
  build logs). Owner must check the Railway dashboard.
- **Live Supabase configuration** — actual RLS policy enforcement, storage bucket
  public/private state, and the auth redirect allowlist (checklist C8–C10 probe these, but
  authoritative confirmation is dashboard-side).
- **GitHub repository settings** — branch protection on `main`, required reviews, and
  whether any CI workflow prints secrets. `gh` is not authenticated in this environment, and
  no `.github/workflows` were part of this local tree. Owner should confirm branch
  protection and audit CI secret usage.
- **The running local server** — this was a **static** review; the Node server was not
  started (to avoid interfering with any solver harvest/dev session, and because live
  behaviour is not required to reach these findings). Dynamic confirmation of headers/error
  bodies is folded into the production checklist.
- **Secret rotation status** — since no secret is exposed in the repo, no rotation is
  indicated; but the owner alone knows whether any of these keys were ever pasted into a
  chat, PR, or external service outside this repo.

---

## 7. Prioritized Remediation Checklist

**Do now (High):**
- [ ] Move `concurrently` to `devDependencies`; run `npm audit fix`; rebuild & redeploy
      (F1, C12).
- [ ] Confirm `NODE_ENV=production` on Railway; add a boot-time assertion/warning (F2, C5/C6).
- [ ] Verify auth cookies ship `Secure; HttpOnly; SameSite=Lax` in prod (C3).
- [ ] Verify `.env`/`.git`/source maps are not served (C4).

**Next (Medium):**
- [ ] Add `helmet` with CSP + HSTS; verify headers live (F3, C1/C2).
- [ ] Verify the localhost admin gate is not XFF-bypassable; consider adding an admin-session
      requirement to those endpoints (F4, C7).
- [ ] Confirm live RLS, private TTS bucket, and OAuth redirect allowlist (C8–C10).
- [ ] Confirm rate limiting works per-IP behind the proxy (C11).

**Hygiene (Low/Info):**
- [ ] Return generic 500 bodies; keep raw messages in logs only (F5).
- [ ] `git rm --cached connect-four/log`; gitignore it (F6).
- [ ] Add `.DS_Store` to the **root** `.gitignore`; `git rm --cached` the tracked ones (F7).
- [ ] Validate the movestring in `/api/debug/classify-all` (F8).
- [ ] Decide whether `.claude/` memory should remain tracked given its recon content (F9).
- [ ] Confirm GitHub branch protection on `main` and audit CI for secret leakage (§6).
