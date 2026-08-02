# Worktree conventions — port isolation

Read this before starting, restarting, or killing any dev server (Express API or Vite)
from inside a git worktree of this repo — or from the main checkout, since the same
script now governs both.

## The rule

**Always** run this before starting or killing any server, every session, regardless of
whether you believe you're in the main checkout or a linked worktree:

```bash
eval "$(./worktree-ports.sh)"   # from repo root
```

This is deliberately **unconditional** — do not gate it behind "if I'm in a worktree."
`worktree-ports.sh` detects that for you internally and returns the unchanged legacy
`3001`/`5173` for the main checkout, so sourcing it is always safe no matter where you
are. Gating it behind a self-judgment ("am I in a worktree?") is exactly the failure
mode this convention exists to prevent — a wrong judgment silently falls back to the
shared legacy ports and collides with whatever else is running on them.

After sourcing, `$API_PORT`, `$VITE_PORT`, `$PORT` (alias of `$API_PORT`), and
`$FRONTEND_URL` are exported in your shell. `npm run dev`/`server`/`vite` need no
further arguments — they inherit the shell environment.

## Port bands

| Checkout | API_PORT | VITE_PORT |
|---|---|---|
| Main checkout | `3001` (unchanged) | `5173` (unchanged) |
| Linked worktree | `4100-4999` | `6100-6999` |

The worktree bands are derived deterministically from the worktree's own absolute path
(`git rev-parse --show-toplevel`, hashed via `cksum`) using the pinned formula
`offset = (hash + SALT) % 900` (`SALT` = `WORKTREE_PORT_SALT`, default `0`). Same
worktree path → same ports every time, across sessions — no registry file to create or
clean up.

**Why these specific bands:** they are chosen so that **no possible offset** can produce
`3001` or `5173` — the two legacy ports. An earlier draft of this design used
`5100-5999` for Vite, which itself contains `5173` and could recreate the exact
collision this scheme exists to prevent. `6100-6999` cannot.

## Self-deriving fallback — a raw command is always safe

`connect-four/vite.config.js` and `connect-four/server/index.js` both shell out to
`worktree-ports.sh` themselves whenever `API_PORT`/`VITE_PORT`/`PORT`/`FRONTEND_URL`
aren't already in the environment. This means even a raw, un-sourced `npm run dev` run
inside a worktree derives the correct ports automatically — there's no way to "forget"
and silently recreate a collision by skipping the `eval` step. Sourcing the script
yourself is still the recommended habit (it also runs the ownership probe below), but
it is not a silent single point of failure.

Both self-derive `execSync` calls pass `stdio: ['ignore', 'pipe', 'ignore']`, so only
stdout (the `export KEY=value` lines) is captured — `worktree-ports.sh`'s ownership-probe
stderr lines (`# API_PORT=... is free/bound by pid(s): ...`) never print on a raw,
un-sourced invocation (OI-51). They still print when you source the script yourself via
`eval "$(./worktree-ports.sh)"`, since that runs the script directly rather than through
one of these two self-derive call sites.

## Fail-loudly guarantee — a self-derive failure is fatal inside a linked worktree

If `worktree-ports.sh` is missing, non-executable, or throws (e.g. `git`/`cksum`/`lsof`
unavailable, or the file was deleted/renamed) while `API_PORT`/`VITE_PORT`/`PORT`/
`FRONTEND_URL` are unset, **what happens next depends on where the process is running**
(OI-52, spec 054 Epic 4 US4 / FR-025–FR-027):

- **Inside a linked worktree** — `resolvePorts()` (`connect-four/vite.config.js`) and
  `resolveWorktreePortEnv()` (`connect-four/server/index.js`) both refuse to start:
  they throw a fatal error naming the problem, rather than silently falling back to the
  main checkout's `3001`/`5173` — the exact port collision this whole scheme exists to
  prevent. Fix or restore `worktree-ports.sh`, or run `eval "$(./worktree-ports.sh)"`
  yourself to set the env vars before starting.
- **In the main checkout (not a linked worktree)** — unchanged: falls back to the
  legacy `3001`/`5173` defaults, exactly as before this guarantee existed.
- **Not a git checkout at all (no `.git`, e.g. the Railway build container)** —
  unchanged: falls back to the legacy defaults. This case is deliberately **never**
  fatal — see the "Production/Railway" section below for why getting this wrong breaks
  the production deploy.

Both consumers detect which of these three cases applies using the same `GIT_DIR`/
`GIT_COMMON` check `worktree-ports.sh` itself uses (`worktree-ports.sh:15-17`),
re-implemented as a shared, unit-tested Node module at
`connect-four/server/worktreePorts.js` (`detectLinkedWorktree()` for the detection,
`handleSelfDeriveFailure()` for the fatal-vs-fallback decision) — imported by both
`vite.config.js` and `server/index.js` rather than duplicated. The detection itself is
wrapped in its own try/catch, separate from the port-derivation try/catch: a failure
there (no `.git` at all) is treated as "not a linked worktree," never as "linked
worktree with a broken self-derive."

Verified 2026-08-02 by real failure injection from both this linked worktree (refused
to start) and the main checkout (fell back to `3001`/`5173` unchanged) — see
`staging_checks.md`'s "Epic 4" section for the dated results.

## Kill discipline

Only ever kill a server by the **exact port you derived**:

```bash
lsof -ti tcp:$API_PORT | xargs kill    # never a bare 3001 inside a worktree
```

Never `pkill node` or `pkill -f vite` — those can kill an unrelated worktree's server,
the solver, or a test run. Never guess a port number; always derive it first.

## Collision escape hatch

If two worktrees happen to hash to the same offset (rare, but possible with enough
concurrent worktrees), `strictPort: true` in `vite.config.js` turns it into a loud,
immediate `EADDRINUSE` failure rather than a silent reassignment. Whoever hits it first
can deterministically shift their own ports:

```bash
WORKTREE_PORT_SALT=1 eval "$(./worktree-ports.sh)"
```

The `% 900` reduction in the offset formula guarantees the result always stays inside
the intended band — it can never spill out of range or reintroduce a collision with
`3001`/`5173`, no matter what salt value is chosen.

## Known limitation — Google OAuth (out of scope for this convention)

Google OAuth's redirect is hardcoded to `localhost:3001` in **two** places, neither of
which this port scheme fixes:

- Server-side: the OAuth redirect target is configured in the Supabase project itself.
- Client-side: `connect-four/src/components/AuthModal.jsx:46` —
  `const oauthBase = import.meta.env.DEV ? 'http://localhost:3001' : API;`

The consequence inside a worktree is stronger than "OAuth doesn't work there": clicking
the Google login button issues a full-page navigation to the **main checkout's**
server, not merely to a dead redirect. This is a pre-existing limitation, documented
here so it isn't mistaken for a bug introduced by this scheme — do not attempt to test
Google OAuth login from inside a worktree.

## Solver subprocess — unaffected

The c4solver subprocess (`connect-four/server/index.js`, spawned via `child_process`)
communicates over stdio/IPC with its parent process, not a TCP port, so it needs no
port allocation and is entirely unaffected by this scheme.

## Production/Railway — mostly unaffected, but `vite.config.js` DOES run at build time

Railway sets its own `PORT`/`FRONTEND_URL` environment variables in production, and
both are already `process.env.X || <dev default>` in `server/index.js`. The *deployed
runtime* (`node server/index.js`) never touches `vite.config.js` — only `server/index.js`'s
own `PORT`/`FRONTEND_URL` fallbacks matter there.

**CORRECTION (2026-07-18): the claim that "`vite.config.js` never runs in the production
build" was wrong and caused a real Railway deploy failure.** The build step's `npm run
build` → `vite build` DOES load and execute `vite.config.js` — including its top-level
`resolvePorts()` call — to construct the config object, even though the resulting
`server.port`/`server.proxy` settings are irrelevant to a static `vite build` output.
Railway's build container has no `worktree-ports.sh` (it's a local dev-worktree
convenience requiring `git`/`lsof`) and doesn't set `API_PORT`/`VITE_PORT`, so
`resolvePorts()`'s `execSync(scriptPath)` threw `ENOENT`, uncaught, and crashed the
entire build with `/bin/sh: 1: /worktree-ports.sh: not found`. Fixed by wrapping that
`execSync` call in try/catch, falling back to the existing hardcoded defaults
(`3001`/`5173`) on any failure — see `connect-four/vite.config.js`'s `resolvePorts()`.
**Lesson: any dev-convenience shell-out added to build-time code (a `vite.config.js`
top-level call, not just runtime `server/index.js` code) must degrade gracefully — the
Railway build container does not have this repo's dev tooling available.**
