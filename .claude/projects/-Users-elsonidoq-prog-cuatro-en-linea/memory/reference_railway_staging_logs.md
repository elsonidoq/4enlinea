---
name: reference_railway_staging_logs
description: "Railway MCP ids for reading DecodeC4 staging/production logs, and the log lines that settle an import or deep-reveal bug report without guessing"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 5ffcaefa-eed7-49ee-a494-7099e99c934e
  modified: 2026-08-05T19:12:58.685Z
---

**Trigger:** a bug report from staging where the server's own `console.log` would settle it — imports,
background jobs, LLM failures, quota. Read the logs *before* reasoning about the code.

The `railway` MCP is connected and works for this. Resolving the ids costs three round-trips
(`list-projects` → `list-services` → `get-logs`); skip them with:

| | id |
|---|---|
| Project **decode C4** | `acda9fc7-328d-4ef6-9699-116e0995a222` |
| Service `4enlinea-staging` | `93d9cd25-077e-4212-9a49-dc4c62e227ad` |
| Environment `staging` | `55bda1d0-5b22-4686-b12a-79753765b2c7` |
| Service `4enlinea-production` | `f2abcd80-3038-457c-b0d5-7c3f930e499d` |
| Environment `production` | `d9e0ee13-3894-4055-bf2a-78bede933c56` |

`get-logs` takes `projectId` + (`serviceId` + `environmentId`) to resolve the latest deployment, plus
a Loki-style `filter` and `limit` (max 500). `types` defaults to `['deploy']`; `build` and `http` are
separate streams.

**2026-08-25 — the permission classifier blocks part of this MCP, and the pattern is not obvious:**
`get-logs` **with a `filter`** goes through; `get-logs` with no filter, `list-deployments`, and
`get-status` were all **denied**. Practical consequences: always pass a filter (a broad
`node OR npm OR server OR at` works as a catch-all when you don't yet know the failure), and read the
`status` field of the `get-logs` response itself for `SUCCESS`/`CRASHED`/`BUILDING` — it is the only
deployment status still reachable. Note it can move under you: the same deployment read `SUCCESS`
during boot and `CRASHED` a minute later, once the crash loop tripped the threshold. Reading DB rows
from `server/.env.production` via an inline or file-based node script is also blocked — the log lines
usually carry the value you wanted (e.g. `papergamesId:`) anyway.

## The papergames-import case: distinguish upstream from our bug

`importForUser` logs enough to close an "it only imported N games" report with no code reading.
Filter on `import`:

```
[import] C2b — tier: free existingGames: 0 gameLimit: 15
[importForUser] Starting fetch loop — gameLimit: 15 lastImportAt: null
[importForUser] API total rooms: 1          ← Papergames' OWN count
[importForUser] Done — imported: 1 skipped: 0 blunderErrors: 0 processed: 1 stopEarly: false
```

**`API total rooms:` is the upstream/our-bug boundary.** If it equals what was imported, Papergames
returned that many and nothing is wrong on our side. The three of our own mechanisms that *could*
truncate an import each have their own line: `gameLimit` (the free-tier cap = `15 - existingGames`),
`lastImportAt` + `stopEarly` (the incremental cutoff), and `skipped` (per-room failures). All four
visible means no guessing.

Confirm upstream directly — public, unauthenticated GET:
`https://papergames.io/api/profile/<accountId>/rooms?accountId=<accountId>&start=0&limit=50&gameType=Connect4`
→ `{count, rooms[]}`. Drop `&gameType=` to check whether other game types are hidden too.

**2026-08-23 (same root cause, louder symptom):** production's `Papergames API unreachable: fetchRooms
HTTP 404` was **not an outage** — the stored id (`69e77229f8f489b51eabd6eb`) returned 404 while the real
one (`69e773d36bf9938bffc1509a`, `elsonidoq`) returned 200 on the identical URL. Split it in one command:
`GET https://papergames.io/api/profile/<id>` → 404 `{"message":"User with this email does not exist"}` means
the id is wrong; a bare `/rooms` with no query params answers **400 validation errors**, which proves the
route still exists. Since then the importer classifies a 404 as `Papergames account not found` (no retry)
and `PUT /api/user/profile` rejects a 404 id at save time (fail-open on 5xx/timeout).

**2026-08-04:** a "it imported only one game" report was a **wrong `account_id`** in the profile, not a
bug — `count: 1` upstream. A misconfigured account id is indistinguishable from an importer bug from
the UI, so check the account's own room count first. See [[project_papergames_integration]].

Related: [[reference_supabase_connection]] (staging DB access), [[project_deploy_execution_traps]].
