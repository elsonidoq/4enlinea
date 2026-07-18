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

## Production/Railway — unaffected

Railway sets its own `PORT`/`FRONTEND_URL` environment variables in production, and
both are already `process.env.X || <dev default>` in `server/index.js`. `vite.config.js`
never runs in the production build/runtime (the build step runs `vite build`; the
deployed process runs `node server/index.js` directly). This convention only changes
local-dev fallback defaults.
