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

`connect-four/server/scripts/set-tier.js` looks up users **by email**
(`set-tier.js:20-23`, `supabase.auth.admin.listUsers()` then `.find(u => u.email === email)`).
The dev-skip-auth user starts with **no email**, so before an email has been seeded on it the
lookup finds nothing. This is no longer a hard limitation: the **"🛠 Dev: Set QA email"** button
(see "Rollback and paid-state tools" below) seeds `qa-agent@example.test` on the current session's
account, and once that has run, `set-tier.js <email> paid` works against it.

What is true **regardless of whether an email has been seeded**, and is the load-bearing
limitation: `set-tier.js`'s only write is `.from('users').update({ tier })` (`set-tier.js:26-29`)
— it never touches `paddle_customer_id`. It can flip the `tier` column but it can **never
re-establish a `paddle_customer_id`**, so it cannot recreate the DB state a real checkout would
have left behind (what the downgrade fixtures or a post-reset replay need to act on). For that,
use `setQaAccountPaidState` / `POST /api/admin/qa-set-paid-state` (see below), which writes
`tier` and `paddle_customer_id` together.

To paid (flips every local user; there's normally just the one test user):

```
cd connect-four && node --env-file=server/.env -e "import('@supabase/supabase-js').then(async ({createClient})=>{const s=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY);const {data,error}=await s.from('users').update({tier:'paid'}).neq('tier','paid').select('id,tier');console.log(error||data);})"
```

Back to free (swap `'paid'`→`'free'` and `.neq('tier','paid')`→`.neq('tier','free')`).

After flipping, **reload the page** in Chrome so the session re-reads the tier (tier comes
from the server profile, not the JWT).

If a real email user exists (either a naturally-authenticated one, or the anon dev user after
the "Set QA email" button has run), `set-tier.js` works:
`cd connect-four && node --env-file=server/.env server/scripts/set-tier.js <email> paid`.

## Worktree bootstrap

A freshly created worktree is missing two things a checkout normally has — set both up before
starting the server:

- **`node_modules`**: not present. Run `cd connect-four && npm install` first.
- **`.env` / `.env.local` files**: gitignored, so a new worktree has none. Copy them from the
  main checkout: `connect-four/.env.local` (needs `VITE_PADDLE_CLIENT_TOKEN` for the frontend)
  and `connect-four/server/.env` (needs `PADDLE_NOTIFICATION_WEBHOOK_SECRET`, among other
  server-side vars, for the backend). Never print the values of either — copy the files, don't
  retype their contents.

Also see "URLs / ports" above: ports come from `eval "$(./worktree-ports.sh)"` at the worktree
root, never the literal `3001`/`5173`. This matches `specs/057-mvp-launch-gate/quickstart.md`'s
Prerequisites section.

## Rate limits

The API applies a **120 requests/minute per IP** limit, and an agent driving the browser QA
session shares that budget with its own `curl`/script calls against the same server (they hit
the same IP). If you blow through it, the **429 response body is plain text**, not JSON — a
caller that blindly does `res.json()` gets an **opaque JSON-decode error, with no corresponding
line in the server log** (the request never reached application code that would log anything).
If you see a JSON-parse failure with nothing in `$LOG_PATH` to explain it, suspect the rate
limit first, not a server bug — back off and retry rather than chasing a phantom parsing bug.

## Rollback and paid-state tools (QA account reset)

> **These endpoints exist only outside production.** They are registered inside an
> `if (process.env.NODE_ENV !== 'production')` block. Local dev leaves `NODE_ENV` unset so they
> are available to you; if you ever run the local server with `NODE_ENV=production` they 404 by
> design, and that is not a bug to report.


Three dev-only HTTP endpoints, all in `connect-four/server/index.js`, all gated by
**`requireLocalhost` only** — never `requireAdmin`, which is a no-op outside
`NODE_ENV=production`. A non-localhost caller gets `403 { "error": "Admin endpoints are
localhost-only" }`. All three back onto `connect-four/server/qaAccountTools.js`'s
`createQaAccountTools({ paddleClient, supabase, authClient })`.

| Endpoint | Body | Success | Notes |
|---|---|---|---|
| `POST /api/admin/qa-rollback` | `{ userId }` | 200 `{ reset: true, canceledSubscriptions: [ids] }` | 400 if `userId` missing; **503 `{ error: 'payments not configured' }`** when `PADDLE_API_KEY` is unset (the only one of the three that touches `paddleClient`) |
| `POST /api/admin/qa-set-paid-state` | `{ userId, paddleCustomerId }` (`paddleCustomerId` may be `null`) | 200 `{ paidStateSet: true }` | 400 if `userId` missing; no 503 check — DB-only write, never calls `paddleClient` |
| `POST /api/admin/qa-set-email` | `{ userId, email }` | 200 `{ emailSet: true }` | 400 if either missing; no 503 check — talks only to Supabase auth (`auth.admin.updateUserById`) |

500s return the generic `{ error: 'Internal server error' }` body (per
`docs/architecture/server-conventions.md`'s "never `err.message` in the body" rule) — the real
error lands in the server log via `logError`, not in the response.

**What `resetQaAccount` (behind `qa-rollback`) actually does**: lists the account's Paddle
sandbox subscriptions via the SDK and cancels every cancelable one (`active`/`trialing`/
`past_due`/`paused`) with `effectiveFrom: 'immediately'` — **before** nulling
`paddle_customer_id` (nulling first would make the subscription unrecoverable; no subscription
id is stored anywhere outside Paddle itself, `users` only carries `paddle_customer_id`) — then
writes `tier: 'free'` and `paddle_customer_id: null` together in **one** update, so the account
is never left in an intermediate "free tier, still linked to a Paddle customer" state. It does
**not** touch `payment_events` and does **not** clear the account's email. It is idempotent —
re-running it against an already-reset account is a success no-op.

**CLI**: `connect-four/server/scripts/qa-rollback-cli.js` — thin wrapper over `resetQaAccount`.
Takes the user id **positionally**, not as a `--user` flag, and refuses to run without `--yes`:

```
cd connect-four && node --env-file=server/.env server/scripts/qa-rollback-cli.js <userId> --yes
```

**CLI**: `connect-four/server/scripts/send-synthetic-webhook.js` — loads a harvested fixture
from `connect-four/server/scripts/webhook-fixtures/<name>.json`, re-stamps a fresh `event_id`
and re-signs it at send time, then POSTs it to this server's own `/api/paddle/webhook` (no
tunnel, no Paddle simulator):

```
cd connect-four && node --env-file=server/.env server/scripts/send-synthetic-webhook.js \
  --fixture <basename> --customer-id <paddleCustomerId> [--subscription-id <id>]
```

**Dev-only UI**: a **"🛠 Dev: Set QA email"** button in `connect-four/src/screens/
SettingsScreen.jsx`, inside the existing `import.meta.env.DEV`-gated dev block, right below
"🛠 Dev: clear IndexedDB & sign out". It POSTs the current session's `userId` to
`/api/admin/qa-set-email` with a hardcoded `email: 'qa-agent@example.test'` — use it to seed an
email on the anonymous dev-skip-auth user (see "Flip tier" above and "Auth (dev)") so
Paddle checkout can be driven without a `customer` param collision.

**Mandatory step after any reset: reload the page.** This is the *only* way to see the effect —
there is no server-reachable cache-invalidation call, and none may be added. The client's
`invalidateEntitlement()` is a *soft* invalidation: it zeroes `lastFetchedAt` but deliberately
keeps `lastKnownGood`, so on the next fetch the fail-open branch can re-pin a stale
`entitled: true` right after a downgrade — it will NOT surface the reset. Only a full page reload
discards the module-scoped entitlement cache wholesale. After calling `qa-rollback` or
`qa-set-paid-state`, reload in Chrome before asserting anything about tier/entitlement UI.

## Paddle sandbox checkout — test cards

Local and staging checkouts run against the **Paddle sandbox**, which accepts **test cards only**;
a real card is rejected. Sandbox vs live is decided by the **key prefix**, never `NODE_ENV` — the
client token is `test_...` and the API key `pdl_sdbx_apikey_...`.

Standard card (valid, no 3-D Secure) — use this for the normal free-to-paid pass:

```
Card number: 4242 4242 4242 4242
Expiry:      any FUTURE month/year   (e.g. 11/28)
CVC:         any 3 digits            (e.g. 123)
ZIP/Postal:  any value
Name:        any value
```

Scenario cards, for exercising the failure paths rather than the happy one:

| Card number           | Result                                                 |
| --------------------- | ------------------------------------------------------ |
| `4242 4242 4242 4242` | Valid card, no 3DS — the default |
| `4000 0038 0000 0446` | Valid card **with** 3DS — checks the challenge step is drivable |
| `4000 0566 5566 5556` | Valid Visa **debit** |
| `4000 0000 0000 0002` | **Declined** — checks `checkout.payment-error` handling |
| `4000 0027 6000 3184` | Succeeds, then renewals decline — checks dunning / `subscription.past_due` |

Source: the `paddle:sandbox-testing` skill (§"Step 2: Use test cards"), which mirrors
[developer.paddle.com/sdks/sandbox#test-cards](https://developer.paddle.com/sdks/sandbox#test-cards).
Re-check that page before treating this table as current — Paddle's card list changes.

The overlay is a cross-origin iframe, but the chrome-devtools MCP a11y tree **does** penetrate it:
the email textbox, country combobox, Continue and Close all come back as addressable uids from
`take_snapshot`. Driving the checkout from an agent session is supported (verified 2026-09-07).

**Never** use `paddle-live`, and never enter a real card.

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
