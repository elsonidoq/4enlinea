## Auth conventions doc — stale Bearer token claim

`docs/architecture/frontend-conventions.md` line ~196 still states:
> "Authenticated requests include `Authorization: Bearer <session.access_token>`"

This is wrong under the server-mediated httpOnly-cookie auth model introduced in commit `87f2818`.
The correct behavior: auth is established via `sb_access_token`/`sb_refresh_token` httpOnly cookies;
no `Authorization` header is set by the frontend for server requests.

Left intentionally out of Epic 7 scope (Epic 7 task T-003 updates the SDK/env-var section only).
Fix in a future repo-hygiene pass.
