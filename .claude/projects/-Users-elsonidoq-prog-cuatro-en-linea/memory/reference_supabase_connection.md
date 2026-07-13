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

**This project has a REMOTE Supabase instance only — no local Supabase.** There is no `supabase start` / local setup. All migrations must be applied via psql against the remote pooler.

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
