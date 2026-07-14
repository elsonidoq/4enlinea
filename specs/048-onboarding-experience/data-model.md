# Phase 1 Data Model: Onboarding Experience

## Entity: Onboarding status (persisted)

A single `text` field, `onboarding_status`, present on both the anonymous local profile record
and (once linked) the server-side `users` row. Not a new entity/table — a field added to two
existing records. **Three-state model** (aha/coach-reaction detection was dropped by owner
decision; see spec.md Assumptions and research.md R5):

| Value | Set by | Meaning |
|---|---|---|
| `not_encountered` | default (new profile / new `users` row) | Auto-show routing (FR-001) is active. |
| `seen` | FR-005 (user played at least one move of their own in the onboarding game) | Suppresses auto-show; the engagement signal this feature measures. |
| `skipped` | FR-009 (explicit skip) | Suppresses auto-show. |

**State transitions** (one-way in normal flow, but re-enterable via Settings manual replay per R6):

```
not_encountered ──(FR-005: first user move played)──> seen
not_encountered ──(FR-009: skip tapped mid-game or on the import offer)──> skipped
[any state]     ──(manual Settings replay + FR-005/009 fire again)──> re-evaluated per the
                    same rules above (idempotent; does not need to distinguish "first" vs "replay")
```

No transition FROM `seen`/`skipped` back to `not_encountered` exists in this feature — the only
writers are FR-005/FR-009, neither of which ever writes `not_encountered`. A game that ends
(any outcome) with the user never having played a move leaves the status at `not_encountered`
(there is no third "engaged but no move" bucket — see spec.md Edge Cases).

### Storage location 1 — anonymous local profile (`IndexedDBStore`)

Existing object store `profile` (keyPath `device_uuid`), existing row shape:
```js
{ device_uuid: string, tier: 'free' | 'paid' }
```
Extended to:
```js
{ device_uuid: string, tier: 'free' | 'paid', onboarding_status?: 'not_encountered' | 'seen' | 'skipped' }
```
`onboarding_status` is `undefined` on any profile created before this feature ships — all read
sites MUST treat `undefined`/`null` the same as `'not_encountered'` (see research.md R3's
`profile.onboarding_status === 'not_encountered' || profile.onboarding_status == null` check).
No DB version bump needed (no new object store, no new index — plain field addition to an
existing keyPath row).

**The one-time Home-fallback marker is not part of this record.** FR-007's "show the import
offer once on the next Home visit" check needs its own bookkeeping (a user can be `seen` with
the offer not yet shown — they engaged, then left early). Rather than add a fourth persisted
value to the profile row (which would blur the three-state model), this marker is a plain
device-scoped `localStorage` boolean (e.g. `onboarding_offer_shown_v1`), read/written directly by
the Home screen: on mount, if `onboarding_status === 'seen'` and the `localStorage` flag is not
yet set, show the import offer and set the flag. This is deliberately per-browser/per-device
(not synced to the server, not part of `updateProfile`) — a signed-in user on a second device
still gets its own independent one-time check, which is the correct behavior (FR-013 spirit:
don't grow server-side bookkeeping for an ancillary UX nicety).

### Storage location 2 — server `users` row

New column on `public.users` (migration `057_users_onboarding_status.sql`):
```sql
onboarding_status text NOT NULL DEFAULT 'not_encountered'
  CHECK (onboarding_status IN ('not_encountered', 'seen', 'skipped'))
```
`NOT NULL DEFAULT` means every existing and future `users` row is well-formed with no backfill
step required. No new grants needed (see research.md R2). The one-time Home-fallback marker
(above) has no server-side counterpart by design — see the `localStorage` note above.

## Entity: Onboarding session (transient, not persisted beyond the final status)

In-memory/component state for the duration of one pass through the onboarding sparring game:

| Field | Type | Notes |
|---|---|---|
| `movePlayed` | boolean | Flips true the first time the user's own move is submitted in the onboarding game (`GameScreen.jsx`/`useGameBoard.js`'s existing human-move path — no new detection mechanism). Drives the persisted `onboarding_status: 'seen'` write. Never reverts to false. |
| `importOfferShown` | boolean | Set true when the `onboardingImportOffer` screen mounts (game-end path or Home-fallback path). |
| `importOfferOutcome` | `'accepted' \| 'declined' \| null` | Analytics-only; not persisted to the profile. |

This state lives in the `game`/`onboardingImportOffer` screen components (or a small shared hook)
and is discarded once the user reaches `home` — nothing here is written to the profile except
`onboarding_status` (`not_encountered` / `seen` / `skipped`, covered above). The one-time
Home-fallback marker is separately persisted to `localStorage`, not to the profile record (see
above).

## API contract changes

See `contracts/onboarding-api.md` for the full request/response deltas to:
- `GET /api/user/profile`
- `PUT /api/user/profile`
- `POST /api/user/migrate`
- `POST /api/track` (no shape change — client now populates an already-supported field)

## Client store interface changes

See `contracts/onboarding-store-interface.md` for the `updateProfile(patch)` method added to
both `IndexedDBStore` and `SupabaseStore`.
