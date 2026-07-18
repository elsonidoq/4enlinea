# Worktree Port Isolation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let every git worktree of this repo run its own isolated dev servers (Express API + Vite) on a deterministic, collision-free port pair, so concurrent agents in different worktrees can never step on each other's servers.

**Architecture:** A new `worktree-ports.sh` script at repo root detects main-checkout vs. linked worktree and either returns the legacy `3001`/`5173` (main) or a stable hash-derived pair in fixed non-overlapping bands (worktree). `vite.config.js` and `connect-four/server/index.js` both self-derive from this script when the port env vars aren't already set, so even a raw un-sourced `npm run dev` is safe. The convention is documented as an always-visible standing rule in `CLAUDE.md` (not gated behind any task type), with the full mechanics in a new `docs/architecture/worktree-conventions.md`, and the `app-qa` skill (today's only place that kills servers by hardcoded port) is updated to use the derived ports.

**Tech Stack:** Bash (`worktree-ports.sh`), Node.js ESM (`vite.config.js`, `connect-four/server/index.js` — both already `"type": "module"` / `import` style), Vite 6 config, existing `node:test`-based test suite (unaffected by this change — no runtime/test code touched, verified via `test:fast`).

## Global Constraints

- Main checkout behavior stays as close to today's as possible. The **one** intentional exception, called out explicitly wherever it appears: `strictPort: true` in Vite means a pre-occupied `5173` now fails loudly instead of silently auto-incrementing to `5174`.
- Worktree port bands: `API_PORT` in `4100-4999`, `VITE_PORT` in `6100-6999`. Neither band may ever be able to produce `3001` or `5173` (verified arithmetically, not just asserted) — this is the single most important invariant in the whole design, per the committed design spec's blocking-issue fix.
- Offset formula is pinned exactly: `offset = (hash + SALT) % 900`, where `hash` comes from `cksum` of the worktree's absolute path and `SALT` defaults to `0` (overridable via `WORKTREE_PORT_SALT`). Never deviate from this formula — an unclamped variant is what caused the original design defect.
- `worktree-ports.sh`'s **stdout** must contain only the four `export KEY=value` lines (so `eval "$(./worktree-ports.sh)"` works cleanly); all human-readable diagnostics (ownership probe) go to **stderr**.
- Never hardcode `pkill node` or a bare port number in any doc/script touched by this plan — always reference the derived `$API_PORT`/`$VITE_PORT` variables.
- Design reference: `docs/superpowers/specs/2026-07-17-worktree-port-isolation-design.md` (already committed, already through one critique+fix cycle — treat its Design/Edge cases/Testing plan sections as authoritative; every claim in this plan traces back to a line in that file).

---

## File Structure

| File | Responsibility |
|---|---|
| `worktree-ports.sh` (new, repo root) | Sole source of port-derivation logic: detect main vs. worktree, compute the pair, print exports, probe ownership |
| `connect-four/vite.config.js` (modify) | Read `API_PORT`/`VITE_PORT` from env; self-derive via the script if unset; `strictPort: true` |
| `connect-four/server/index.js` (modify) | Self-derive `PORT`/`FRONTEND_URL` via the script if unset, before `app.listen` |
| `docs/architecture/worktree-conventions.md` (new) | The full convention: detection, script usage, bands, kill discipline, collision escape hatch, OAuth limitation |
| `docs/architecture/index.md` (modify) | One new table row pointing at the new doc |
| `CLAUDE.md` (modify) | New unconditional standing-rule section |
| `.claude/skills/app-qa/references/environment.md` (modify) | Replace hardcoded ports/kill command with derived vars |
| `.claude/skills/app-qa/SKILL.md` (modify) | Update the two lines that state the hardcoded ports |
| memory `project_repo_worktree_setup.md` (modify) | One-line pointer to the new doc |

---

## Task 1: `worktree-ports.sh` — port derivation script

**Files:**
- Create: `worktree-ports.sh` (repo root, executable)

**Interfaces:**
- Produces: a shell script, invoked as `./worktree-ports.sh` (from repo root) or by absolute path (from `vite.config.js`/`index.js` in Task 2/3). Prints to **stdout** exactly:
  ```
  export API_PORT=<int>
  export VITE_PORT=<int>
  export PORT=<int>          # alias of API_PORT
  export FRONTEND_URL=http://localhost:<VITE_PORT>
  ```
  and to **stderr**, two human-readable ownership lines (not part of the contract other tasks depend on).

- [ ] **Step 1: Write the script**

```bash
#!/usr/bin/env bash
# Prints a stable, collision-free port pair for this git checkout.
#
# Main checkout -> legacy defaults (API 3001, Vite 5173), unchanged.
# Linked worktree -> hash of the worktree's own absolute path into
#   API_PORT in 4100-4999, VITE_PORT in 6100-6999 (never able to equal
#   3001/5173 - see docs/architecture/worktree-conventions.md).
#
# Usage: eval "$(./worktree-ports.sh)"
# Escape hatch for a hash collision between two worktrees:
#   WORKTREE_PORT_SALT=<n> eval "$(./worktree-ports.sh)"

set -euo pipefail

GIT_DIR=$(cd "$(git rev-parse --git-dir)" && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" && pwd -P)
TOPLEVEL=$(git rev-parse --show-toplevel)

if [ "$GIT_DIR" = "$GIT_COMMON" ]; then
  API_PORT=3001
  VITE_PORT=5173
else
  SALT="${WORKTREE_PORT_SALT:-0}"
  HASH=$(printf '%s' "$TOPLEVEL" | cksum | cut -d' ' -f1)
  OFFSET=$(( (HASH + SALT) % 900 ))
  API_PORT=$((4100 + OFFSET))
  VITE_PORT=$((6100 + OFFSET))
fi

echo "export API_PORT=$API_PORT"
echo "export VITE_PORT=$VITE_PORT"
echo "export PORT=$API_PORT"
echo "export FRONTEND_URL=http://localhost:$VITE_PORT"

for pair in "API_PORT:$API_PORT" "VITE_PORT:$VITE_PORT"; do
  name="${pair%%:*}"
  port="${pair##*:}"
  pid=$(lsof -ti tcp:"$port" 2>/dev/null || true)
  if [ -n "$pid" ]; then
    echo "# $name=$port already bound by pid(s): $pid — reuse if it's your own prior run, investigate otherwise" >&2
  else
    echo "# $name=$port is free" >&2
  fi
done
```

- [ ] **Step 2: Make it executable**

```bash
chmod +x worktree-ports.sh
```

- [ ] **Step 3: Verify main-checkout output**

Run from repo root:
```bash
./worktree-ports.sh
```
Expected stdout:
```
export API_PORT=3001
export VITE_PORT=5173
export PORT=3001
export FRONTEND_URL=http://localhost:5173
```
(plus two `# ... is free` or `already bound` lines on stderr — ignore their exact content here).

- [ ] **Step 4: Verify worktree output is different, stable, and in-band**

Create a throwaway worktree to test against (clean up at the end of this step):
```bash
git worktree add /tmp/wtports-test HEAD
cd /tmp/wtports-test
/Users/elsonidoq/prog/cuatro_en_linea/worktree-ports.sh
```
Expected: `API_PORT` in `4100-4999`, `VITE_PORT` in `6100-6999`, **not** `3001`/`5173`. Run it again — confirm identical output (determinism). Then confirm the values match the pinned formula by hand:
```bash
HASH=$(printf '%s' "$(git rev-parse --show-toplevel)" | cksum | cut -d' ' -f1)
echo $(( HASH % 900 ))          # should equal (API_PORT - 4100) and (VITE_PORT - 6100)
```
Clean up:
```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git worktree remove /tmp/wtports-test --force
```

- [ ] **Step 5: Verify the salt escape hatch stays in-band**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
WORKTREE_PORT_SALT=500 ./worktree-ports.sh   # still main checkout -> still 3001/5173, salt ignored (expected: main checkout path never reads SALT)
```
Then repeat Step 4's worktree creation, and inside it run `WORKTREE_PORT_SALT=500 /Users/elsonidoq/prog/cuatro_en_linea/worktree-ports.sh` — confirm the resulting `API_PORT`/`VITE_PORT` are still inside `4100-4999`/`6100-6999` (never spill out, never equal `3001`/`5173`), and differ from the unsalted run. Clean up the worktree again with `git worktree remove --force`.

- [ ] **Step 6: Commit**

```bash
git add worktree-ports.sh
git commit -m "feat: add worktree-ports.sh for deterministic per-worktree dev ports"
```

---

## Task 2: `vite.config.js` — env-driven ports with self-derive + strictPort

**Files:**
- Modify: `connect-four/vite.config.js` (currently, verbatim):
  ```js
  import { defineConfig } from 'vite'
  import react from '@vitejs/plugin-react'

  // https://vite.dev/config/
  export default defineConfig({
    plugins: [react()],
    resolve: {
      dedupe: ['react', 'react-dom'],
    },
    server: {
      host: true,
      proxy: {
        '/api': 'http://localhost:3001',
      },
    },
  })
  ```

**Interfaces:**
- Consumes: `worktree-ports.sh` (Task 1) — output contract `export API_PORT=<int>` / `export VITE_PORT=<int>` lines on stdout.
- Produces: Vite dev server bound to the resolved `vitePort`, proxying `/api` to the resolved `apiPort`. Nothing downstream in this plan consumes this file's exports directly (it's a build-tool config, not an importable module).

- [ ] **Step 1: Replace the file**

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

function resolvePorts() {
  let apiPort = process.env.API_PORT
  let vitePort = process.env.VITE_PORT
  if (!apiPort || !vitePort) {
    const scriptPath = resolve(__dirname, '..', 'worktree-ports.sh')
    const output = execSync(scriptPath, { encoding: 'utf8' })
    for (const line of output.split('\n')) {
      const match = line.match(/^export (\w+)=(.+)$/)
      if (!match) continue
      if (match[1] === 'API_PORT' && !apiPort) apiPort = match[2]
      if (match[1] === 'VITE_PORT' && !vitePort) vitePort = match[2]
    }
  }
  return { apiPort: Number(apiPort) || 3001, vitePort: Number(vitePort) || 5173 }
}

const { apiPort, vitePort } = resolvePorts()

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  server: {
    host: true,
    port: vitePort,
    strictPort: true,
    proxy: {
      '/api': `http://localhost:${apiPort}`,
    },
  },
})
```

- [ ] **Step 2: Verify main-checkout behavior is unchanged (except strictPort)**

From `connect-four/`:
```bash
npm run vite
```
Expected: Vite starts and reports `Local: http://localhost:5173/`. Stop it (Ctrl-C or `lsof -ti tcp:5173 | xargs kill`).

- [ ] **Step 3: Verify strictPort fails loudly on a busy port**

```bash
cd connect-four
python3 -m http.server 5173 &     # occupy 5173 with something unrelated
BUSY_PID=$!
npm run vite
```
Expected: Vite **fails** with an `EADDRINUSE`/"Port 5173 is already in use" error — it must NOT silently start on `5174`. Then clean up:
```bash
kill $BUSY_PID
```

- [ ] **Step 4: Verify explicit env override works**

```bash
cd connect-four
API_PORT=4321 VITE_PORT=6321 npm run vite
```
Expected: Vite reports `Local: http://localhost:6321/`. Confirm the proxy target by checking a request to `/api/...` fails to reach anything on `4321` (no server there yet — that's fine, Task 3 wires the server) but does NOT get proxied to `3001`. Stop it:
```bash
lsof -ti tcp:6321 | xargs kill
```

- [ ] **Step 5: Verify self-derive fires when env is unset, inside a worktree**

```bash
git worktree add /tmp/wtports-test2 HEAD
cd /tmp/wtports-test2/connect-four
npm install
npm run vite
```
Expected: Vite reports a port in `6100-6999` (NOT `5173`), matching what `/tmp/wtports-test2/../worktree-ports.sh` would print for that path — i.e. no env was set, yet it did not fall back to `5173`. Stop it, clean up:
```bash
lsof -ti tcp:<the-port-it-printed> | xargs kill
cd /Users/elsonidoq/prog/cuatro_en_linea
git worktree remove /tmp/wtports-test2 --force
```

- [ ] **Step 6: Commit**

```bash
git add connect-four/vite.config.js
git commit -m "feat: make vite.config.js port/proxy env-driven with worktree self-derive"
```

---

## Task 3: `connect-four/server/index.js` — self-derive `PORT`/`FRONTEND_URL`

**Files:**
- Modify: `connect-four/server/index.js:2` (imports — add `execSync`):
  ```js
  import { spawn } from 'child_process';
  ```
- Modify: `connect-four/server/index.js:58` (right after `__dirname` is defined):
  ```js
  const __dirname = dirname(fileURLToPath(import.meta.url));
  ```
- Modify: `connect-four/server/index.js:4137` (server start):
  ```js
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => console.log(`Connect4 server running on port ${PORT}`));
  ```

**Interfaces:**
- Consumes: `worktree-ports.sh` (Task 1), same output contract as Task 2.
- Produces: `process.env.PORT` and `process.env.FRONTEND_URL` guaranteed to be worktree-correct by the time `app.listen` runs and by the time any request handler reads `process.env.FRONTEND_URL` (e.g. the `GET /api/auth/oauth/google` handler at `index.js:298`, which reads it lazily per-request — setting it once at module load, before `app.listen`, is sufficient since Node evaluates top-to-bottom and the server only starts accepting connections at `app.listen`).

- [ ] **Step 1: Add the `execSync` import**

Change:
```js
import { spawn } from 'child_process';
```
to:
```js
import { spawn, execSync } from 'child_process';
```

- [ ] **Step 2: Add the self-derive helper right after `__dirname` is defined**

Insert immediately after `const __dirname = dirname(fileURLToPath(import.meta.url));` (line 58):

```js
function resolveWorktreePortEnv() {
  if (process.env.PORT && process.env.FRONTEND_URL) return;
  try {
    const scriptPath = join(__dirname, '..', '..', 'worktree-ports.sh');
    const output = execSync(scriptPath, { encoding: 'utf8' });
    for (const line of output.split('\n')) {
      const match = line.match(/^export (\w+)=(.+)$/);
      if (!match) continue;
      if (!process.env[match[1]]) process.env[match[1]] = match[2];
    }
  } catch (err) {
    console.warn('[worktree-ports] could not self-derive ports, using defaults:', err.message);
  }
}
resolveWorktreePortEnv();
```

(`join` is already imported at `index.js:4` — `import { dirname, join, basename } from 'path';` — no new import needed for it.)

- [ ] **Step 3: Verify main-checkout server start is unchanged**

From `connect-four/`:
```bash
node --env-file=server/.env server/index.js &
SERVER_PID=$!
sleep 1
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3001/api/puzzles/counts
kill $SERVER_PID
```
Expected: server log shows `Connect4 server running on port 3001`; curl returns a non-`000` HTTP status (server answered — 401/200/etc, doesn't matter which).

- [ ] **Step 4: Verify explicit `PORT` override still wins (self-derive is a fallback, not an override)**

```bash
cd connect-four
PORT=4321 node --env-file=server/.env server/index.js &
SERVER_PID=$!
sleep 1
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:4321/api/puzzles/counts
kill $SERVER_PID
```
Expected: server log shows `Connect4 server running on port 4321`; curl succeeds against `4321`.

- [ ] **Step 5: Verify self-derive fires inside a worktree with no env set**

```bash
git worktree add /tmp/wtports-test3 HEAD
cd /tmp/wtports-test3/connect-four
npm install
cp /Users/elsonidoq/prog/cuatro_en_linea/connect-four/server/.env server/.env
node --env-file=server/.env server/index.js &
SERVER_PID=$!
sleep 1
```
Read the server's stdout — expect `Connect4 server running on port <N>` where `N` is in `4100-4999` and matches what `/tmp/wtports-test3/worktree-ports.sh` (run separately) prints for `API_PORT`. Confirm it is NOT `3001`.
```bash
kill $SERVER_PID
cd /Users/elsonidoq/prog/cuatro_en_linea
git worktree remove /tmp/wtports-test3 --force
```
(This mirrors the known `.env`-copy trap from memory `project_repo_worktree_setup.md` — a fresh worktree lacks `server/.env` since it's gitignored, so this step copies it in first, exactly as that memory documents.)

- [ ] **Step 6: Commit**

```bash
git add connect-four/server/index.js
git commit -m "feat: self-derive server PORT/FRONTEND_URL from worktree-ports.sh when unset"
```

---

## Task 4: `docs/architecture/worktree-conventions.md` + index entry

**Files:**
- Create: `docs/architecture/worktree-conventions.md`
- Modify: `docs/architecture/index.md:9-17` (the "Conventions — mandatory reads" table)

**Interfaces:**
- Consumes: the design spec's Design/Edge cases sections (`docs/superpowers/specs/2026-07-17-worktree-port-isolation-design.md`) as the source of truth for every claim below.
- Produces: nothing code-facing — this is the doc that Task 5's CLAUDE.md rule points to.

- [ ] **Step 1: Write the new doc**

```markdown
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
```

- [ ] **Step 2: Add the index entry**

In `docs/architecture/index.md`, in the "Conventions — mandatory reads" table (currently ending with the `coach-audio-conventions.md` row), add a new row:

```
| [worktree-conventions.md](./worktree-conventions.md) | starting, restarting, or killing any dev server (Express API or Vite) from any checkout — main or a linked worktree |
```

- [ ] **Step 3: Commit**

```bash
git add docs/architecture/worktree-conventions.md docs/architecture/index.md
git commit -m "docs: add worktree-conventions.md (port isolation convention)"
```

---

## Task 5: `CLAUDE.md` — unconditional standing-rule section

**Files:**
- Modify: `CLAUDE.md` (insert a new section right after the existing "## Documentation index" section, i.e. right before the "## Where information lives: memory vs. docs/architecture" heading)

**Interfaces:**
- Consumes: `docs/architecture/worktree-conventions.md` (Task 4) by reference.

- [ ] **Step 1: Insert the new section**

Immediately after this existing paragraph in `CLAUDE.md`:
```
Read the relevant index before starting any task that touches architecture, data model, API contracts, or product decisions.
```
and before:
```
## Where information lives: memory vs. docs/architecture
```
insert:
```markdown

## Working in a git worktree — ports (always read, not gated behind a task type)

This is a **standing rule**, not conditioned on "if I'm touching server code" — the
trigger is any moment you're about to start, restart, or kill a dev server, or run
anything (a test, a QA pass) that needs one running. Read
`docs/architecture/worktree-conventions.md` for the full mechanics; the summary:

Always run `eval "$(./worktree-ports.sh)"` from the repo root before starting or
killing any server — every session, unconditionally. Do **not** first ask yourself "am
I in a worktree?" and only source it if the answer is yes — the script detects that
internally and returns the unchanged legacy `3001`/`5173` for the main checkout, so
running it is always safe. Never kill a server by a bare port number or `pkill node` —
only by the exact `$API_PORT`/`$VITE_PORT` the script gave you.
```

- [ ] **Step 2: Verify the doc still renders sanely**

```bash
sed -n '1,20p' CLAUDE.md
```
Confirm the new section appears once, in the right place, with no duplicated heading.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add unconditional worktree-ports standing rule to CLAUDE.md"
```

---

## Task 6: Update `app-qa` skill — derived ports, not hardcoded

**Files:**
- Modify: `.claude/skills/app-qa/references/environment.md`
- Modify: `.claude/skills/app-qa/SKILL.md:52-58`

**Interfaces:**
- Consumes: `worktree-ports.sh` (Task 1) via `eval "$(./worktree-ports.sh)"`.

- [ ] **Step 1: Update `environment.md`'s URL section**

Replace (currently, verbatim):
```markdown
## URLs / ports

- Frontend (Vite dev): **http://localhost:5173** (`server.host: true`, so also on LAN IP).
- API (Express): **http://localhost:3001**, proxied under `/api` by Vite.
```
with:
```markdown
## URLs / ports

**Before anything else, run `eval "$(./worktree-ports.sh)"` from the repo root** (see
`docs/architecture/worktree-conventions.md`) — this exports `$API_PORT`/`$VITE_PORT` for
your checkout (main checkout: unchanged `3001`/`5173`; a linked worktree: its own stable
derived pair). Every command below uses these variables — never the literal `3001`/`5173`.

- Frontend (Vite dev): **http://localhost:$VITE_PORT** (`server.host: true`, so also on LAN IP).
- API (Express): **http://localhost:$API_PORT**, proxied under `/api` by Vite.
```

- [ ] **Step 2: Update the launch commands**

Replace:
```markdown
Launch (run each in the background):

```
# API server → log file. Own PID/port so it can be relaunched alone.
LOG_PATH=<scratchpad>/app-qa-server.log
cd connect-four && node --env-file=server/.env server/index.js > "$LOG_PATH" 2>&1

# Frontend (rarely needs restarting; its output is noise for stack traces).
cd connect-four && npm run vite
```

`server/.env` (NOT the repo-root `.env`) holds the local env for the dev server. Wait for
`Connect4 server running on port 3001` in `$LOG_PATH` and for Vite to report :5173 before driving.
```
with:
```markdown
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
```

- [ ] **Step 3: Update the health-check/relaunch block**

Replace:
```markdown
```
# health probe: 000 = down (nothing listening); any other code = up
test "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/api/puzzles/counts)" != 000 \
  && echo up || echo down
lsof -ti tcp:3001 | xargs kill                 # stop ONLY the API server (leaves Vite alone)
: > "$LOG_PATH"                                 # TRUNCATE so line offsets reset to 0
cd connect-four && node --env-file=server/.env server/index.js > "$LOG_PATH" 2>&1   # restart (bg)
```
```
with:
```markdown
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
```

- [ ] **Step 4: Annotate the OAuth line**

Replace:
```markdown
- Click the **`🛠 Dev: skip auth`** button in the AuthModal. It POSTs `/api/auth/anonymous`
  → `signInAnonymously()` → sets `sb_access_token` / `sb_refresh_token` httpOnly cookies.
- The resulting user is **anonymous, tier `free`, and has NO email**.
- Magic-link login does not work locally (no email delivery). Google OAuth targets
  `http://localhost:3001` directly (Vite proxy doesn't cover full-page nav).
```
with:
```markdown
- Click the **`🛠 Dev: skip auth`** button in the AuthModal. It POSTs `/api/auth/anonymous`
  → `signInAnonymously()` → sets `sb_access_token` / `sb_refresh_token` httpOnly cookies.
- The resulting user is **anonymous, tier `free`, and has NO email**.
- Magic-link login does not work locally (no email delivery). Google OAuth targets
  `http://localhost:3001` directly (Vite proxy doesn't cover full-page nav) — this is
  hardcoded both server-side (Supabase project config) and client-side
  (`AuthModal.jsx:46`), so it is **not** derived-port-aware. Inside a worktree, do not
  attempt Google OAuth login — it will issue its request to the **main checkout's**
  server, not yours. See `docs/architecture/worktree-conventions.md`.
```

- [ ] **Step 5: Update `SKILL.md`'s server-lifecycle bullet**

Replace (currently, verbatim, `SKILL.md:52-58`):
```markdown
3. **Start the app + own the server lifecycle.** Launch the **API server as its own background
   process redirected to a log FILE** (`$LOG_PATH`) and Vite separately — a background shell's
   buffer isn't readable by subagents, but a file is. Vite serves **http://localhost:5173**, API
   **:3001**. See `references/environment.md` for the exact launch, health-check, **relaunch**
   (kill port 3001 + truncate log), and the **delta log-read** pattern (offset before an action,
   `tail -n +$START` after — never re-`tail` the whole log). You own the server: relaunch it when
   a health probe fails or server code changed. Pass `$LOG_PATH` to every subagent.
```
with:
```markdown
3. **Run `eval "$(./worktree-ports.sh)"` from the repo root first** (see
   `docs/architecture/worktree-conventions.md`) — exports `$API_PORT`/`$VITE_PORT` for your
   checkout. **Start the app + own the server lifecycle.** Launch the **API server as its own
   background process redirected to a log FILE** (`$LOG_PATH`) and Vite separately — a background
   shell's buffer isn't readable by subagents, but a file is. Vite serves
   **http://localhost:$VITE_PORT**, API **:$API_PORT**. See `references/environment.md` for the
   exact launch, health-check, **relaunch** (kill `$API_PORT` + truncate log — never a hardcoded
   port, never `pkill node`), and the **delta log-read** pattern (offset before an action,
   `tail -n +$START` after — never re-`tail` the whole log). You own the server: relaunch it when
   a health probe fails or server code changed. Pass `$LOG_PATH` **and** `$API_PORT`/`$VITE_PORT`
   to every subagent.
```

- [ ] **Step 6: Commit**

```bash
git add .claude/skills/app-qa/references/environment.md .claude/skills/app-qa/SKILL.md
git commit -m "docs: make app-qa skill worktree-port-aware, drop hardcoded 3001/5173"
```

---

## Task 7: Memory pointer update

**Files:**
- Modify: `/Users/elsonidoq/.claude/projects/-Users-elsonidoq-prog-cuatro-en-linea/memory/project_repo_worktree_setup.md`

- [ ] **Step 1: Append a pointer line**

Read the file first, then append (after its existing final paragraph, before the `Related:` line) a new paragraph:

```markdown
**3. Port collisions across concurrent worktrees are now handled — see
`docs/architecture/worktree-conventions.md`.** Always `eval "$(./worktree-ports.sh)"`
from the repo root before starting/killing any server in this or any worktree; it's an
unconditional rule (in `CLAUDE.md`), not gated behind "am I in a worktree."
```

- [ ] **Step 2: No commit** (memory files are outside the git repo — nothing to commit here; this step just confirms the edit was saved).

---

## Task 8: End-to-end validation

**Files:** none (verification only — no new files).

- [ ] **Step 1: Confirm `test:fast` is unaffected**

```bash
cd connect-four && npm run test:fast
```
Expected: same pass/fail status as before this plan started (this change touches no
runtime/test code — only dev-server config and docs).

- [ ] **Step 2: Run main checkout and a real worktree concurrently**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
eval "$(./worktree-ports.sh)"     # main checkout -> API_PORT=3001, VITE_PORT=5173
cd connect-four && npm run dev &
MAIN_PID=$!
sleep 2

cd /Users/elsonidoq/prog/cuatro_en_linea
git worktree add /tmp/wt-e2e HEAD
cd /tmp/wt-e2e/connect-four
npm install
cp /Users/elsonidoq/prog/cuatro_en_linea/connect-four/server/.env server/.env
eval "$(../worktree-ports.sh)"    # worktree -> its own derived pair
echo "Worktree got API_PORT=$API_PORT VITE_PORT=$VITE_PORT"
npm run dev &
WT_PID=$!
sleep 2
```

- [ ] **Step 3: Verify both stacks answer independently, on their own ports**

```bash
curl -s -o /dev/null -w 'main API: %{http_code}\n' http://localhost:3001/api/puzzles/counts
curl -s -o /dev/null -w 'main Vite: %{http_code}\n' http://localhost:5173/
curl -s -o /dev/null -w 'worktree API: %{http_code}\n' "http://localhost:$API_PORT/api/puzzles/counts"
curl -s -o /dev/null -w 'worktree Vite: %{http_code}\n' "http://localhost:$VITE_PORT/"
```
Expected: all four return a non-`000` status, and the worktree's ports differ from `3001`/`5173`.

- [ ] **Step 4: Clean up**

```bash
kill $MAIN_PID $WT_PID
lsof -ti tcp:3001,5173 | xargs kill 2>/dev/null || true
cd /Users/elsonidoq/prog/cuatro_en_linea
git worktree remove /tmp/wt-e2e --force
```

- [ ] **Step 5: Final commit (if any cleanup edits were needed)**

If Steps 1-4 all passed with no code changes required, there is nothing further to
commit — this task is verification-only. If a fix was needed, return to the relevant
earlier task, apply it there, and re-run this task's verification steps.
