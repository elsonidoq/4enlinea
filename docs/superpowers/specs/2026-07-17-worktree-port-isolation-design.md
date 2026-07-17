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
   `API_PORT=3001`, `VITE_PORT=5173`. Zero behavior change for the common case — existing
   hardcoded references elsewhere (Stripe CLI webhook forwarding, the Google OAuth redirect
   configured in Supabase) keep working untouched.
3. **Linked worktree**: hashes the worktree's own absolute path
   (`git rev-parse --show-toplevel`, via `cksum`) into a stable offset in `0..899`, giving:
   - `API_PORT = 4100 + offset`
   - `VITE_PORT = 5100 + offset`

   Same worktree path → same ports every time, across sessions, with no registry file to
   create/maintain/clean up. The 800-slot range keeps collision probability low for the
   realistic number of concurrent worktrees (a handful).
4. Also exports `PORT` (alias of `API_PORT`, consumed directly by `server/index.js`'s
   `process.env.PORT || 3001`) and `FRONTEND_URL=http://localhost:$VITE_PORT` (consumed by
   `process.env.FRONTEND_URL || 'http://localhost:5173'` in `index.js`, used in Stripe/Paddle
   redirect URLs). Verified: neither `PORT` nor `FRONTEND_URL` is set in `server/.env` today,
   so these shell-exported values are never silently overridden by the `--env-file` load.
5. Runs a `lsof -ti tcp:$PORT` ownership probe for both ports and prints whether each looks
   already bound, so an agent doesn't have to guess before deciding it's safe to reuse
   (their own prior run) vs. investigate (someone/something else).
6. **Escape hatch for a hash collision**: setting `WORKTREE_PORT_SALT=<n>` before invoking
   the script shifts the offset by `n`, so two worktrees that happen to collide can be
   deterministically separated by whoever notices first.

Usage: `eval "$(./worktree-ports.sh)"` before starting or killing any server. `npm run
dev`/`server`/`vite` need **no script changes** — `npm run` inherits the shell environment.

### vite.config.js

Reads `API_PORT`/`VITE_PORT` from `process.env` (default `3001`/`5173` when unset, matching
today's behavior for anyone who doesn't source the script). Sets `server.port` to
`VITE_PORT`, proxy target to `http://localhost:${API_PORT}`, and **`strictPort: true`** —
if the derived port is already bound, Vite fails loudly instead of silently picking the next
free port. Silent drift is exactly the failure mode that turns this into "a source of
errors": the agent's belief about "my port" would desync from reality.

### Documentation — always-visible, not gated behind a task type

- **New `docs/architecture/worktree-conventions.md`**: the full convention — detection,
  script usage, port ranges, the kill-by-derived-port-only rule, what stays untouched (main
  checkout), the collision escape hatch, and the known pre-existing limitation that Google
  OAuth's redirect is hardcoded server-side to `:3001` regardless of Vite's proxy (out of
  scope for this change — not something a port scheme can fix).
- **`CLAUDE.md`**: a new **standing-rule section**, not merely a "mandatory read before
  touching server/" bullet — because the trigger is broader than editing server code
  ("run a test that needs the servers running", "do QA", "start the app") and needs to be
  visible on every session, not just server-focused ones. States: if in a linked worktree,
  always `eval "$(./worktree-ports.sh)"` before starting/killing any server, and never act
  on a port you didn't derive from the script yourself (no `pkill node`, no bare `3001`
  inside a worktree).
- **`.claude/skills/app-qa/references/environment.md` + `SKILL.md`**: replace every
  hardcoded `:3001`/`:5173` and the `lsof -ti tcp:3001 | xargs kill` relaunch command with
  the sourced `$API_PORT`/`$VITE_PORT` variables — this skill is today's highest-risk spot
  for cross-worktree collisions since it's the one place that already kills servers by port.
- **Memory `project_repo_worktree_setup.md`**: append a one-line pointer to the new doc
  (conventions live in docs per the project's two-destination rule; memory stays a gotcha
  pointer, not a duplicate of the convention).

## Edge cases

- Worktree port ranges (`4100+`/`5100+`) never overlap the main checkout's (`3001`/`5173`),
  so a worktree agent can never kill the main dev server via a wrong port guess.
- Hash collision between two worktrees: `strictPort` turns it into a loud `EADDRINUSE`
  instead of silent reassignment; `WORKTREE_PORT_SALT` is the documented manual tie-break.
- Solver subprocess (c4solver) communicates over stdio/IPC, not TCP — verified by checking
  `index.js`'s spawn call — so it needs no port allocation and is unaffected.
- Railway/production impact: none. `railpack.json` and Railway set their own `PORT` /
  `FRONTEND_URL` env vars in production, and both are already `process.env.X || <dev
  default>` in `server/index.js` (verified). `vite.config.js` never runs in the production
  build/runtime. This change only alters local-dev fallback defaults.
- Google OAuth full-page redirect (configured server-side in Supabase to `localhost:3001`)
  cannot be tested from inside a worktree regardless of this change — documented as a known,
  pre-existing, out-of-scope limitation rather than silently glossed over.

## Testing plan

- Main checkout: `./worktree-ports.sh` still prints `3001`/`5173`; `npm run dev` behaves
  exactly as before.
- A real second worktree: derives a different, stable pair; `npm run dev` binds there,
  `/api/*` proxies correctly, and it runs concurrently with the main checkout's server
  without collision.
- Confirm `strictPort` fails loudly (does not silently reassign) when the target port is
  pre-occupied.
- `npm run test:fast` — unaffected (dev-server-only change, no runtime/test code touched).
