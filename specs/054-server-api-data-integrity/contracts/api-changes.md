# Contract changes: Server/API Data Integrity & Environment Correctness

Additive/behavioral changes only — no endpoint is removed or renamed. Full contract lives in
`docs/architecture/api-conventions.md`; this file lists what this feature adds to it (FR-009's
target for the `req.user` shape doc, plus the two response/request additions FR-001/FR-002 require).

## `req.user` shape (new doc section, FR-009)

Populated by `loadUser()` (`server/index.js:506-533`). Current shape (post `loadUser()`, once
signed in): `{ id, ...USER_PROFILE_SELECT_COLUMNS row }` — `tier, deep_reveal_count,
deep_reveal_reset_at, device_uuid, papergames_id, last_import_at, paddle_customer_id,
onboarding_status`. This feature adds `email` (from `data.user.email`, the raw Supabase auth user
object already returned by `authClient.auth.getUser(token)` — no new DB column). `req.user` is
`null` for anonymous/invalid-token requests, unchanged.

**Degrades-to-blank case (edge case in spec.md)**: if the Supabase auth record has no email set,
`data.user.email` is `undefined`, so `req.user.email` is `undefined` — the same "field silently
absent from the JSON response" behavior `create-checkout` already exhibits today for every caller
(pre-fix), now scoped to only the rare no-email account instead of every account.

## `POST /api/puzzles/:id/check` (FR-001)

**Request body** — new optional field, accepted but **not sent by any current caller**
(`ChallengeScreen.jsx:511` — the only real caller of this endpoint — does not send it; see Decision 2,
`research.md` D1's amendment):
```json
{ "candidateCol": 3, "moveHistory": [], "attemptNumber": 1, "deviceUuid": "<uuid-or-absent>" }
```
The field stays part of the handler's accepted shape (client-supplied-first remains the resolution
order inside `resolveDeviceUuid`) for forward-compatibility with any future/other caller that does
send one; it is simply not exercised by `ChallengeScreen.jsx` today.

**Response body** — new field, always present:
```json
{ "result": "correct", "correctCol": 3, "tiedWith": null, "threatCells": null,
  "forbiddenCols": null, "deviceUuid": "<uuid the write landed under>" }
```
`deviceUuid` in the response is the identifier the server actually used for this write — in
practice, for `ChallengeScreen.jsx`'s calls, always the value read from (or freshly minted into) the
`dc4_device_uuid` cookie, since this endpoint's real caller sends no request-body `deviceUuid`. A
client that receives this value has no required action (the cookie already makes the identifier
reproducible on the next request via `credentials: 'include'`), but MAY persist it locally if a
future feature needs it outside the cookie's reach. `ChallengeScreen.jsx` itself is not changed to do
anything with this field (Decision 2 — no client-side adoption plumbing added).

## `POST /api/puzzles/:id/sequence/move` — audited, unchanged (FR-003)

**Struck (plan-critique step, 2026-08-02): this endpoint does NOT gain a `deviceUuid` field.** An
earlier draft of this contract claimed the same `deviceUuid` request/response addition as
`POST /api/puzzles/:id/check` above. Verified at source: the only `puzzle_attempts` insert anywhere
in `server/index.js` is at `:2525`, inside the `/check` handler; the `/sequence/move` handler
(`server/index.js:2558-2625`) never inserts a `puzzle_attempts` row and never references
`device_uuid` at all — it returns only `{ outcome, threatCells|aiCol|reason }`. There is therefore no
device-identifier write for this endpoint to fix, and no request or response field is added. This
finding is tracked as tasks.md's T008 (FR-003's audit).

## `POST /api/games` (FR-002)

No request/response shape change — `device_uuid` was already an accepted request-body field
(`server/index.js:1862`). Only the server's internal fallback-when-absent behavior changes (mints +
cookies + echoes, rather than the literal `'anonymous'`). Response shape unchanged (`{ id: ... }` at
`:1910`+); the minted identifier is delivered via the `dc4_device_uuid` cookie on this path, mirroring
`POST /api/puzzles/:id/check`'s cookie-set behavior — no new `deviceUuid` response field is required
here since the caller already has (or can read) `profile.device_uuid` client-side, unlike the two
Challenge endpoints which today send nothing.

## Unaffected endpoints (confirmed during Phase 0 research, not re-litigated in Phase 2)

- `GET /api/puzzles/draw` — filtering logic and response shape unchanged (FR-014).
- `GET /api/games`, `GET /api/admin/candidates` — response shape unchanged; only row order at tie
  boundaries becomes deterministic (FR-010/FR-012a).
