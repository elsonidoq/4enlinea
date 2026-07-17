# app-qa — environment & commands reference

All commands run from the repo root (`/Users/elsonidoq/prog/cuatro_en_linea`) unless noted.

## URLs / ports

**Before anything else, run `eval "$(./worktree-ports.sh)"` from the repo root** (see
`docs/architecture/worktree-conventions.md`) — this exports `$API_PORT`/`$VITE_PORT` for
your checkout (main checkout: unchanged `3001`/`5173`; a linked worktree: its own stable
derived pair). Every command below uses these variables — never the literal `3001`/`5173`.

- Frontend (Vite dev): **http://localhost:$VITE_PORT** (`server.host: true`, so also on LAN IP).
- API (Express): **http://localhost:$API_PORT**, proxied under `/api` by Vite.

## Start the app + own the server lifecycle

The server writes errors to **stdout/stderr only** (no built-in logfile), and a background
shell's buffer is **not** readable by subagents. So the coordinator launches the **API server as
its own process, redirected to a log FILE** — a shared channel every subagent can `tail`, and one
that can be restarted independently of Vite. Pick a stable path and pass it to subagents as
`LOG_PATH` (e.g. the session scratchpad).

Launch (run each in the background — `$API_PORT`/`$VITE_PORT` already exported from the
step above):

```
# API server → log file. Own PID/port so it can be relaunched alone.
LOG_PATH=<scratchpad>/app-qa-server.log
cd connect-four && node --env-file=server/.env server/index.js > "$LOG_PATH" 2>&1

# Frontend (rarely needs restarting; its output is noise for stack traces).
cd connect-four && npm run vite
```

`server/.env` (NOT the repo-root `.env`) holds the local env for the dev server. Wait for
`Connect4 server running on port $API_PORT` in `$LOG_PATH` and for Vite to report
`:$VITE_PORT` before driving.

### Health check + relaunch (when to, how to)

Relaunch the API server when: a health probe fails (it crashed), you changed server code, or the
log shows an unrecoverable crash. Vite usually needs no restart.

There is **no** `/api/health` route — probe a cheap real endpoint instead and treat any non-000
HTTP status as "up" (even a 400/401 means the server is answering):

```
# health probe: 000 = down (nothing listening); any other code = up
test "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$API_PORT/api/puzzles/counts)" != 000 \
  && echo up || echo down
lsof -ti tcp:$API_PORT | xargs kill            # stop ONLY the API server (leaves Vite alone)
: > "$LOG_PATH"                                 # TRUNCATE so line offsets reset to 0
cd connect-four && node --env-file=server/.env server/index.js > "$LOG_PATH" 2>&1   # restart (bg)
```

Never `lsof -ti tcp:3001` literally, and never `pkill node` — either can kill a
**different worktree's** server. Always use `$API_PORT` as derived for *your*
checkout by `worktree-ports.sh`.

### Read server logs efficiently — delta, not re-read

Do NOT `tail -n X` on every action (it re-reads lines you've already seen). Instead capture a line
offset before a suspicious action and read only the delta after; only bother when a request
actually misbehaves (5xx / UI breakage), and grep-filter to signal:

```
START=$(wc -l < "$LOG_PATH")                    # before the action
# ... perform the UI action in Chrome ...
tail -n +$((START+1)) "$LOG_PATH" | grep -iE 'error|throw|at .*\(|unhandled|ECONN'
```

Paste the matched lines into the finding's Evidence. Because relaunch truncates `$LOG_PATH`,
offsets stay valid within one server lifetime; reset your saved `START` after any relaunch.

## Auth (dev)

- Click the **`🛠 Dev: skip auth`** button in the AuthModal. It POSTs `/api/auth/anonymous`
  → `signInAnonymously()` → sets `sb_access_token` / `sb_refresh_token` httpOnly cookies.
- The resulting user is **anonymous, tier `free`, and has NO email**.
- Magic-link login does not work locally (no email delivery). Google OAuth targets
  `http://localhost:3001` directly (Vite proxy doesn't cover full-page nav) — this is
  hardcoded both server-side (Supabase project config) and client-side
  (`AuthModal.jsx:46`), so it is **not** derived-port-aware. Inside a worktree, do not
  attempt Google OAuth login — it will issue its request to the **main checkout's**
  server, not yours. See `docs/architecture/worktree-conventions.md`.

## Reset the DB to a clean slate (ONLY after the user confirms)

```
./reset_local_supabase.sh          # supabase db reset
./migrate.sh --env local           # apply migrations (reads server/.env.local DATABASE_URL)
```

Then: create a user via first login (`🛠 Dev: skip auth`) → set tier if desired → import
games with papergames id `69e773d36bf9938bffc1509a`.

## Flip tier (for the free→paid journey pass)

`scripts/set-tier.js` looks up users **by email** — the dev-skip-auth user has **no email**,
so it will NOT find it. Flip by direct DB update instead.

To paid (flips every local user; there's normally just the one test user):

```
cd connect-four && node --env-file=server/.env -e "import('@supabase/supabase-js').then(async ({createClient})=>{const s=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY);const {data,error}=await s.from('users').update({tier:'paid'}).neq('tier','paid').select('id,tier');console.log(error||data);})"
```

Back to free (swap `'paid'`→`'free'` and `.neq('tier','paid')`→`.neq('tier','free')`).

After flipping, **reload the page** in Chrome so the session re-reads the tier (tier comes
from the server profile, not the JWT).

If a real email user exists (not the anon one), `set-tier.js` works:
`cd connect-four && node --env-file=server/.env scripts/set-tier.js <email> paid`.

## Chrome (chrome-devtools MCP)

Prefer the MCP tools over launching Chrome yourself:
`new_page` → `navigate_page` → `take_snapshot` (a11y tree, gives element uids for `click`/
`fill`) → after each action `list_console_messages` + `list_network_requests` →
`take_screenshot` for visual bugs. `emulate`/`resize_page` to test mobile layouts.

## Board / deep-reveal verification

`./visualize_board.sh <movestring>` prints a raw board, an annotated board (each disc as
`X 17`/`O 4` with its move number; threat markers `<X>`/`<O>` = gravity-top major threat,
`[X]`/`[O]` = non-gravity major, `(x)`/`(o)` = minor, `[*]`/`(*)` = both players), an `ht`
(disc-count) row, a `par` (empty-cell parity: O=odd, E=even) row, a `scr` (solver score) row, and
an explicit major-threat list. Disc tokens: **`X`=player1=GREEN**, **`O`=player2=GRAY** (the in-app
colors); the header also prints move number + whose turn. The script has a legend at the bottom —
read it if unsure. Use it to fact-check any concrete board claim in a deep reveal before logging it
as a fabrication (or as correct).
