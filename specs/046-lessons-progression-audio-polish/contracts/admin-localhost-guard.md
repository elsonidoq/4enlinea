# Contract: `/admin` Localhost Lockdown (FR-028)

## API guard (server-side)

Every `/api/admin/*` Express route MUST carry `requireLocalhost` as a middleware argument, positioned before
(or alongside, order between `requireLocalhost`/`requireAdmin` does not matter functionally since both
independently 403) `requireAdmin`:

```js
app.get('/api/admin/<resource>', requireLocalhost, requireAdmin, handler);
```

**Coverage** (verified inventory, 2026-07-11): all routes already carry it except the 6 listed in
`contracts/lesson-audio-generation.md`'s table, which this feature closes. No new `/api/admin/*` route may
ship without `requireLocalhost` from this point forward — reviewers should grep before merging any new admin
route.

**`requireLocalhost` behavior** (existing, unchanged, `server/index.js:2795`): checks `req.ip` against
`127.0.0.1`, `::1`, `::ffff:127.0.0.1`; `403` for anything else. `requireAdmin` (`server/adminAuth.js`) is a
no-op outside `NODE_ENV=production` and checks `req.user.email` against `ADMIN_EMAILS` in production — the
two guards are complementary, not redundant: `requireLocalhost` blocks *where* the request can come from,
`requireAdmin` blocks *who* (in prod only).

## Frontend guard (client-side)

New pure module `src/lib/isLocalhostOrigin.js`:

```js
export function isLocalhostOrigin(hostname = window.location.hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}
```

`App.jsx`'s admin routing (`App.jsx:114-133`) is restructured from 5 independent
`if (pathname.startsWith('/admin/...'))` branches into one outer guard:

```js
if (window.location.pathname.startsWith('/admin')) {
  if (!isLocalhostOrigin()) {
    return <AdminBlockedPage />; // small "not available" component, no lazy admin import
  }
  if (pathname.startsWith('/admin/audio')) { ... }
  if (pathname.startsWith('/admin/lessons')) { ... }
  if (pathname.startsWith('/admin/deep-reveal-eval')) { ... }
  if (pathname.startsWith('/admin/fv-suff')) { ... }
  return <Suspense fallback={null}><AdminCuratePage /></Suspense>; // bare /admin fallback
}
```

**`AdminBlockedPage`**: minimal, no data fetch, no admin bundle import — just a static "This page is only
available from localhost" message. Lives in `src/pages/` alongside the other admin pages for discoverability,
but is NOT lazy-imported behind the guard it protects (it must render even when nothing else does).

**Coverage**: grep `isLocalhostOrigin` in `App.jsx` — exactly one call site, guarding the single outer
`/admin` prefix check that all 5 sub-branches sit inside.

## Pre-ship risk check (owner directive, not grep-verifiable — manual)

Before merging: confirm no staging/QA workflow relies on reaching any `/admin/*` page or
`/api/admin/*` endpoint from a non-localhost origin (e.g. a remote staging box's admin UI accessed by IP/
domain rather than SSH-tunnel-to-localhost). If such a workflow exists, it becomes a blocker to surface to
the epic owner — not something to silently work around (e.g. by carving out an exception), per the spec's
explicit "no exceptions" requirement.
