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

## Trap: `res.sendFile()` 404s inside a worktree (the `.claude/` dot-segment)

Worktrees live under `.claude/worktrees/<branch>/`, so **every absolute path the server
builds from `__dirname` contains a dot-segment**. Express's `res.sendFile()` delegates to
`send`, whose `dotfiles` option defaults to `'ignore'` — it refuses any path with a
dot-segment and raises `NotFoundError`, which the global error handler then surfaces as a
generic **500 `{"error":"Internal server error"}`**. The file exists; an `existsSync()`
guard immediately above the `sendFile()` call passes; nothing in the response hints at the
real cause.

It works fine on the main checkout (`/Users/.../cuatro_en_linea/`, no dot-segment), so this
reproduces **only** in a worktree — i.e. only in the normal way feature branches are run here.

This has bitten twice:
- the legal-page routes (`/privacy`, `/terms`, `/pricing`, `/refunds`, `/legal.css`) — fixed
  via `LEGAL_PAGE_OPTS = { dotfiles: 'allow' }` in `connect-four/server/index.js`
- `GET /api/admin/audio/play/:slug` — every coach clip on `/admin/audio` failed to play

**Rule: any new `res.sendFile()` in this codebase must pass `{ dotfiles: 'allow' }`.** It
carries no path-traversal risk at these call sites because the filename is either hardcoded
or built from an already-sanitised token (the audio route restricts `slug` to alphanumerics
and hyphens — no dots, no slashes — and is `requireLocalhost`-gated). `express.static()` is
**not** affected: its `dotfiles` check applies to the request path relative to `root`, not to
`root` itself.

Symptom to recognise: a static asset route returning 500 (or 404) in a worktree while the
same route works on the main checkout, with `NotFoundError ... send/index.js` in the log.
