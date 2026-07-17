---
name: Supabase connection details — DecodeC4
description: How to connect to the DecodeC4 Supabase project; new key format and pooler hostname
type: reference
originSessionId: 5719c43c-8011-4e5d-a333-7894384b241b
---
**Project ref:** `kxtqwsumojtexokrtlfp`
**Dashboard:** https://supabase.com (project: DecodeC4)

**New Supabase key format (this project uses it):**
- Anon/publishable key: `sb_publishable_...` (used as VITE_SUPABASE_ANON_KEY and VITE_SUPABASE_PUBLISHABLE_KEY)
- Service role/secret key: `sb_secret_...` (used as SUPABASE_SERVICE_ROLE_KEY)
- Old JWT format (`eyJ...`) is under "Legacy anon, service_role API keys" tab in Settings → API Keys

> **Correction (2026-07-16):** this file used to claim *"This project has a REMOTE Supabase instance only — no local Supabase. There is no `supabase start`"*. **That was FALSE and self-contradicted by the env table below**, which has always listed a `local` row. Local Supabase DOES exist (`supabase start`, `supabase db reset`) — see §Local Supabase.

**There are THREE distinct environments — do not mix them up (easy way to hit the WRONG DB):**
| Env | File | SUPABASE_URL host / project ref | DATABASE_URL pooler |
|---|---|---|---|
| local | `server/.env` (and `.env.local`) | `127.0.0.1:54321` (local Supabase, port 54322) | local |
| **staging** | `server/.env.staging` | `jkqilynpshutqcceopdn.supabase.co` (us-east-1) | `aws-1-us-east-1.pooler.supabase.com:6543` ⚠️ **transaction pooler** |
| **production** | `server/.env.production` | `kxtqwsumojtexokrtlfp.supabase.co` (us-west-2) = **DecodeC4** | `aws-1-us-west-2.pooler.supabase.com:5432` (session pooler) |

The prod ref `kxtqwsumojtexokrtlfp` is the one this memory's other sections describe. Staging is a SEPARATE project. `server/.env` (root, unsuffixed) points at LOCAL, not staging/prod.

**Staging DATABASE_URL trap:** `.env.staging` uses the **transaction pooler (port 6543)**, which per the session-vs-transaction rule below is FORBIDDEN for DDL / multi-statement transactions. A single-statement op (e.g. one `TRUNCATE ... CASCADE`) works fine; but `migrate.js` (wraps each migration in `BEGIN...COMMIT` DDL) needs port 5432 — swap the port before running migrations against staging. See [[OI-31]].

**Wiping staging data:** `connect-four/server/scripts/reset-staging-db.js` TRUNCATEs all `public` tables except `schema_migrations` (keeps schema + migration history). Reads `.env.staging` only, hard-refuses the prod ref, requires typing `Yes` twice. `--dry-run` lists targets. Uses a single TRUNCATE statement so the 6543 pooler is OK.

**Applying migrations:**
```
psql "$DATABASE_URL" -f connect-four/server/migrations/NNN_slug.sql
```
`DATABASE_URL` is in `connect-four/server/.env` — it already points to the pooler.

**Direct DB connection:**
- Hostname `db.kxtqwsumojtexokrtlfp.supabase.co` does NOT resolve (new platform)
- Use the **session pooler** (port **5432**): `aws-1-us-west-2.pooler.supabase.com:5432`
- Full format: `postgresql://postgres.kxtqwsumojtexokrtlfp:PASSWORD@aws-1-us-west-2.pooler.supabase.com:5432/postgres`
- Get connection string from dashboard → Connect button → URI tab

**Session pooler vs transaction pooler — critical distinction:**
- **Session pooler (port 5432)** — required for: DDL migrations (`migrate.js`), `pg_dump`/`psql` data export/import, any multi-statement transaction. Use this for `DATABASE_URL`.
- **Transaction pooler (port 6543)** — pgBouncer transaction mode; FORBIDDEN for DDL and `pg_dump`. Do not use for migrations.
- Always include `sslmode=require` in the connection string.

**Querying from Node.js (inline script pattern):**
- `.env` file is at `connect-four/server/.env` (not project root)
- Service key env var name is `SUPABASE_SERVICE_ROLE_KEY` (not `SUPABASE_SERVICE_KEY`)
- **`server/.env` has ONLY `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` — NO anon/publishable key** (the anon key `VITE_SUPABASE_ANON_KEY` lives in the *frontend* Vite env, not here). Trap for any inline/CLI script that needs client-style auth (`signInWithPassword`, `refreshSession`): loading `--env-file=server/.env` gives you no anon key, so use the service-role key as the `createClient` apikey fallback (`SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY`). Verified 2026-07-12 while building `connect-four/scripts/probe-refresh-rotation.mjs` (OI-5).
- `dotenv` is not reliably available in `node -e`; parse the file manually:

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea/connect-four && node -e "
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('server/.env', 'utf8');
env.split('\n').forEach(line => { const [k,...v] = line.split('='); if(k&&k.trim()) process.env[k.trim()] = v.join('=').trim(); });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
// ... query here
"
```


---

## Local Supabase (merged from `project_local_supabase_setup`)

Local Supabase runs at `http://127.0.0.1:54321` (DB on 54322, Studio 54323, Mailpit 54324).

- **THE key trap — `SUPABASE_SERVICE_ROLE_KEY` must be the JWT-format key locally** (`eyJ...`, from `supabase status`), **NOT** the `sb_secret_*` key that the REMOTE envs use. PostgREST decodes the JWT to read `role: service_role`; `sb_secret_*` is an opaque token it cannot parse, so it silently falls back to the `anon` role → **42501 permission denied** on every insert. (This is why the key-format note at the top of this file applies to remote only.)
- `SUPABASE_URL` must be `http://127.0.0.1:54321` — **not** the storage S3 URL (`/storage/v1/s3`).
- `VITE_SUPABASE_ANON_KEY` = the `sb_publishable_...` key from `supabase status`.
- Emails go to **Mailpit** at `http://127.0.0.1:54324` — never sent externally.
- `supabase/config.toml` IS committed (so `supabase start` works without `supabase init`); `supabase/migrations/` is **NOT** — `connect-four/server/migrations/` is the source of truth.
- **Workflow:** `supabase db reset` (wipes) → run the migration script → `npm run dev`. No migration tracking needed locally; reset starts from zero.
- **Grants:** local Supabase does not auto-grant, and `040_service_role_grants.sql` is **NOT exhaustive** — the trail is `040` (main batch) + `046`/`048` (papergames) + `055` (`stripe_events`/`tracks`). A new table must include its own `GRANT ... TO anon, authenticated` / `service_role` in its creation migration; don't rely on a `040`-style catch-all. (Full list: `docs/architecture/db-schema.md`.) **Matchable symptom:** `GET /api/games` → `{"error":"permission denied for table papergames_games"}` is fixed by migration `046_papergames_games_grants.sql` (`GRANT SELECT ON public.papergames_games TO anon, authenticated`).
- **Production/staging Supabase config IS modifiable** via the dashboard — do not assume it's off-limits and code a workaround. If a feature is disabled by default (aggregate functions, `max_rows`), propose enabling it.

---

## (merged from `reference_supabase_storage_api` — Verified Supabase Storage JS API shapes — upload, createSignedUrl, FileOptions; from supabase/storage-js source)

Verified against `supabase/storage-js` TypeScript source 2026-06-19. Supabase Storage
methods return `{ data, error }` — never throw. The `supabase.storage` client is
available on the same `createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)` instance
used for DB queries. No separate initialization needed.

## `upload(path, fileBody, fileOptions?)`

```js
const { data, error } = await supabase.storage
  .from('bucket-name')
  .upload(path, buffer, { contentType: 'audio/mpeg', upsert: true });
```

**FileBody** union: `ArrayBuffer | ArrayBufferView | Blob | Buffer | File | FormData | NodeJS.ReadableStream | ReadableStream<Uint8Array> | URLSearchParams | string`

**FileOptions**:
- `cacheControl?: string`
- `contentType?: string`
- `upsert?: boolean` — **CRITICAL**: when true, overwrites existing file at same path; when false (default), throws error if file exists
- `duplex?: string`
- `metadata?: Record<string, any>`
- `headers?: Record<string, string>`

**Return — success**: `{ data: { id: string, path: string, fullPath: string }, error: null }`
**Return — failure**: `{ data: null, error: StorageError }`

## `createSignedUrl(path, expiresIn, options?)`

```js
const { data, error } = await supabase.storage
  .from('bucket-name')
  .createSignedUrl(path, 604800); // 604800s = 1 week
```

**expiresIn**: seconds (required). No maximum documented.

**options**: `{ download?: string | boolean, transform?: TransformOptions }`

**Return — success**: `{ data: { signedUrl: string }, error: null }`
**Return — failure**: `{ data: null, error: StorageError }`

**⚠️ Field is `signedUrl`, not `url` or `signed_url`.**

## `remove(paths)`

```js
const { data, error } = await supabase.storage
  .from('bucket-name')
  .remove(['path/to/file.mp3']);
```

**paths**: `string[]` — array of object paths to delete. No bulk endpoint — one call per batch.

**Return — success**: `{ data: Array<{ id, path, fullPath }>, error: null }`
