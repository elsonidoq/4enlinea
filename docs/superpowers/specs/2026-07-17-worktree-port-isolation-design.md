# Worktree port isolation — design

## Problem

Multiple sessions/agents now work concurrently in different git worktrees of this repo.
Every worktree today assumes the same hardcoded dev ports (API `3001`, Vite `5173`), and
`vite.config.js` hardcodes its `/api` proxy target to `http://localhost:3001`. Two worktrees
running `npm run dev` at once collide, and an agent following `app-qa`'s hardcoded
`lsof -ti tcp:3001 | xargs kill` can kill *another worktree's* server. This must stop being
a source of errors, and the agent must be aware of the convention at all times — not only
inside the `app-qa` skill.

## Design

### Port derivation — deterministic from worktree path

New script `worktree-ports.sh` at repo root:

1. Detects whether the current checkout is the **main checkout** or a **linked worktree**,
   using the same check as `superpowers:using-git-worktrees`:
   `git rev-parse --git-dir` vs `git rev-parse --git-common-dir` (resolved to real paths).
2. **Main checkout** (`GIT_DIR == GIT_COMMON`): prints the unchanged legacy defaults,
   `API_PORT=3001`, `VITE_PORT=5173`. The derived ports themselves are unchanged for the
   main checkout — existing hardcoded references elsewhere (Stripe CLI webhook forwarding,
   the Google OAuth redirect configured in Supabase) keep working untouched. The one
   exception is `strictPort` (see the `vite.config.js` section below): if `5173` is already
   bound by something else, `npm run dev` now fails loudly instead of silently binding the
   next free port — an intentional, desirable behavior change, not a "zero behavior change"
   claim.
3. **Linked worktree**: hashes the worktree's own absolute path
   (`git rev-parse --show-toplevel`, via `cksum`) into a stable offset using the pinned
   formula `offset = (hash + SALT) % 900` (`SALT` = `WORKTREE_PORT_SALT`, defaulting to `0`
   when unset — see step 6), which always wraps back into `0..899` regardless of what salt
   is applied. This gives:
   - `API_PORT = 4100 + offset` (band `4100-4999`)
   - `VITE_PORT = 6100 + offset` (band `6100-6999`)

   The Vite band is deliberately rebased away from the legacy `5xxx` neighborhood — a band
   of `5100-5999` would itself contain `5173` (a worktree hashing to offset `73` would get
   `VITE_PORT=5173` and collide with the main checkout, the exact failure this design exists
   to prevent). Neither derived band can ever equal `3001` or `5173`: `4100-4999` and
   `6100-6999` both sit strictly outside `{3001, 5173}` for every possible offset.

   Same worktree path → same ports every time, across sessions, with no registry file to
   create/maintain/clean up. The 800-slot range (`0..899`, wrapped by `% 900`) keeps
   collision probability low for the realistic number of concurrent worktrees (a handful).
4. Also exports `PORT` (alias of `API_PORT`, consumed directly by `server/index.js`'s
   `process.env.PORT || 3001`) and `FRONTEND_URL=http://localhost:$VITE_PORT` (consumed by
   `process.env.FRONTEND_URL || 'http://localhost:5173'` in `index.js`, used in Stripe/Paddle
   redirect URLs). Verified: neither `PORT` nor `FRONTEND_URL` is set in `server/.env` today,
   so these shell-exported values are never silently overridden by the `--env-file` load.
5. Runs a `lsof -ti tcp:$PORT` ownership probe for both ports and prints whether each looks
   already bound, so an agent doesn't have to guess before deciding it's safe to reuse
   (their own prior run) vs. investigate (someone/something else).
6. **Escape hatch for a hash collision**: setting `WORKTREE_PORT_SALT=<n>` before invoking
   the script feeds `n` into the pinned formula (`offset = (hash + n) % 900`), so two
   worktrees that happen to collide can be deterministically separated by whoever notices
   first — the `% 900` reduction guarantees the result always stays inside the intended band
   (never spills out of `0..899` and never reintroduces a collision with `3001`/`5173`), no
   matter what value of `n` is chosen.

Usage: `eval "$(./worktree-ports.sh)"` before starting or killing any server. `npm run
dev`/`server`/`vite` need **no script changes** — `npm run` inherits the shell environment.

### vite.config.js

Reads `API_PORT`/`VITE_PORT` from `process.env`. If either is **unset**, `vite.config.js`
shells out to `./worktree-ports.sh` itself (e.g. via `execSync`) and parses its output before
falling back to any hardcoded default. This makes a raw, un-sourced `npm run dev`/`npm run
vite` run inside a worktree automatically safe — there is no agent-memory requirement to
`eval` the script first, because the config file does it on the worktree's behalf. In the
main checkout this self-derive path still resolves to the legacy `3001`/`5173`, since that's
what `worktree-ports.sh` itself returns there (see Design step 2) — so the self-derive
behavior is uniform code, not a worktree-only branch.

Sets `server.port` to `VITE_PORT`, proxy target to `http://localhost:${API_PORT}`, and
**`strictPort: true`, unconditionally, including in the main checkout** — if the resolved
port is already bound, Vite fails loudly instead of silently picking the next free port.
Silent drift is exactly the failure mode that turns this into "a source of errors": the
agent's belief about "my port" would desync from reality. This is **not** a zero-behavior-
change for the main checkout: today, a stray process already squatting on `5173` causes
Vite to silently bind the next free port (e.g. `5174`) and keep working; after this change,
`npm run dev` in the main checkout will instead hard-fail with a clear `EADDRINUSE`-style
error in that scenario. That is an intentional, desirable change — loud failure surfacing a
real problem (a stray old process) — not a regression, and the spec explicitly calls it out
rather than leaving a "zero behavior change" claim standing.

### server/index.js

Same self-derive principle as `vite.config.js`: if `PORT`/`FRONTEND_URL` are **not already
in the environment** when `server/index.js` starts, it shells out to `./worktree-ports.sh`
itself and parses `PORT`/`FRONTEND_URL` from its output before falling back to the legacy
`process.env.PORT || 3001` / `process.env.FRONTEND_URL || 'http://localhost:5173'` literals.
This closes the same gap as for Vite: a raw `node server/index.js` (or `npm run server`)
run inside a worktree without first sourcing the script no longer silently recreates the
`3001`/`5173` collision — the server derives its own worktree-correct ports automatically.
As with Vite, in the main checkout this self-derive path still resolves to the unchanged
legacy defaults, since that's what `worktree-ports.sh` returns there.

### Documentation — always-visible, not gated behind a task type

- **New `docs/architecture/worktree-conventions.md`**: the full convention — detection,
  script usage, port ranges, the kill-by-derived-port-only rule, what stays untouched (main
  checkout), the collision escape hatch, and the known pre-existing limitation that Google
  OAuth's redirect is hardcoded both server-side (Supabase-configured, to `:3001`) and
  client-side (`connect-four/src/components/AuthModal.jsx:46`,
  `const oauthBase = import.meta.env.DEV ? 'http://localhost:3001' : API;`) — regardless of
  Vite's proxy or the derived port scheme (out of scope for this change — not something a
  local port scheme can fix; see the OAuth note below for the consequence).
- **`CLAUDE.md`**: a new **standing-rule section**, not merely a "mandatory read before
  touching server/" bullet — because the trigger is broader than editing server code
  ("run a test that needs the servers running", "do QA", "start the app") and needs to be
  visible on every session, not just server-focused ones. The rule is **unconditional**,
  with no branching on a self-assessment of "am I in a worktree": always
  `eval "$(./worktree-ports.sh)"` before starting or killing any server, every session,
  regardless of where the checkout is. It is deliberately **not** worded as "IF in a linked
  worktree, always eval worktree-ports.sh" — that phrasing forces the agent to judge
  worktree-vs-main before deciding to source it, and a wrong judgment silently falls back to
  the legacy ports with no warning. `worktree-ports.sh` already detects main-checkout vs.
  worktree internally (Design step 1) and returns the legacy `3001`/`5173` defaults for the
  main checkout, so sourcing it is always safe no matter where the agent is — there is
  nothing to get wrong by always running it. The rule also states: never act on a port you
  didn't derive from the script yourself (no `pkill node`, no bare `3001` inside a
  worktree).
- **`.claude/skills/app-qa/references/environment.md` + `SKILL.md`**: replace every
  hardcoded `:3001`/`:5173` and the `lsof -ti tcp:3001 | xargs kill` relaunch command with
  the sourced `$API_PORT`/`$VITE_PORT` variables — this skill is today's highest-risk spot
  for cross-worktree collisions since it's the one place that already kills servers by port.
  `environment.md:72` also echoes the client-side OAuth `:3001` hardcode (same one as
  `AuthModal.jsx:46`) — annotate it in place as the same documented, out-of-scope OAuth
  limitation rather than rewriting it as a `$API_PORT`-driven value (rewriting it would be
  misleading: the real login flow still hits the hardcoded `:3001`, not the derived port).
- **Memory `project_repo_worktree_setup.md`**: append a one-line pointer to the new doc
  (conventions live in docs per the project's two-destination rule; memory stays a gotcha
  pointer, not a duplicate of the convention).

## Edge cases

- Worktree port ranges (`4100-4999` for API, `6100-6999` for Vite) never overlap the main
  checkout's (`3001`/`5173`) and never overlap each other — every offset produced by
  `offset = (hash + SALT) % 900` stays inside `0..899`, so `4100+offset` and `6100+offset`
  can never equal `3001` or `5173` for any hash or salt value. A worktree agent can
  therefore never kill the main dev server via a wrong port guess.
- Hash collision between two worktrees: `strictPort` turns it into a loud `EADDRINUSE`
  instead of silent reassignment; `WORKTREE_PORT_SALT` is the documented manual tie-break,
  and because the offset formula always reduces `% 900`, applying a salt can never push the
  result out of band or accidentally reintroduce a collision with `3001`/`5173`.
- Solver subprocess (c4solver) communicates over stdio/IPC, not TCP — verified by checking
  `index.js`'s spawn call — so it needs no port allocation and is unaffected.
- Railway/production impact: none. `railpack.json` and Railway set their own `PORT` /
  `FRONTEND_URL` env vars in production, and both are already `process.env.X || <dev
  default>` in `server/index.js` (verified). `vite.config.js` never runs in the production
  build/runtime. This change only alters local-dev fallback defaults.
- Google OAuth is already broken end-to-end inside any worktree, independent of this fix, on
  **two** hardcodes, not one: the server-side redirect (configured in Supabase to
  `localhost:3001`) and the client-side `oauthBase` in
  `connect-four/src/components/AuthModal.jsx:46`
  (`const oauthBase = import.meta.env.DEV ? 'http://localhost:3001' : API;`), also echoed in
  `.claude/skills/app-qa/references/environment.md:72`. The consequence is stronger than
  "untestable": a worktree's login button issues its OAuth request to the **main checkout's**
  server, not merely to a dead redirect — a stray cross-worktree request, not just a broken
  one. The Supabase-side redirect can't be fixed by any local port scheme, so this is
  documented as a known, pre-existing, out-of-scope limitation rather than silently glossed
  over.

## Testing plan

- Main checkout: `./worktree-ports.sh` still prints `3001`/`5173`; `npm run dev` behaves
  exactly as before *except* that a pre-occupied `5173` now fails loudly (`strictPort`)
  instead of silently drifting to `5174` — verify both the unaffected common case and this
  intentional new failure mode.
- A real second worktree: derives a different, stable pair inside the rebased bands
  (`4100-4999`/`6100-6999`); `npm run dev` binds there, `/api/*` proxies correctly, and it
  runs concurrently with the main checkout's server without collision.
- A raw, un-sourced `npm run dev` (no prior `eval`) run inside a worktree: confirm
  `vite.config.js` and `server/index.js` self-derive via `worktree-ports.sh` and still bind
  to the worktree-correct ports, not `3001`/`5173`.
- Confirm `strictPort` fails loudly (does not silently reassign) when the target port is
  pre-occupied, in both the main checkout and a worktree.
- Confirm `WORKTREE_PORT_SALT` changes the resolved ports per the pinned formula
  (`offset = (hash + SALT) % 900`) and never produces an offset outside `0..899`.
- `npm run test:fast` — unaffected (dev-server-only change, no runtime/test code touched).
