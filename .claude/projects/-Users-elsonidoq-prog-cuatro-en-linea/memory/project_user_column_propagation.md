---
name: project-user-column-propagation
description: "Adding a users-table column does NOT reach the app automatically — req.user and the anon→account migration both use explicit allowlists you must edit"
metadata:
  node_type: memory
  type: project
---

Surfacing a new `users` table column to the app is **not** a one-place change — nothing uses `select('*')`, so a new column is silently invisible until you edit each explicit allowlist. Two independent allowlists bite here (discovered speccing Epic 8 onboarding's `onboarding_status`, spec 048):

1. **`req.user` server-side hydration** — `loadUser` builds `req.user` from an explicit column list `USER_PROFILE_SELECT_COLUMNS` in `connect-four/server/userHelpers.js` (plus the anonymous fallback shape in `defaultUserProfile()` in the same file). A new column is `undefined` on `req.user` until added to **both**. A pinning test (`userHelpers.test.mjs`, ~line 317) asserts that constant — it uses `.includes()` so it won't fail on a new column, but update it for completeness. This is the same trap behind [[project_auth_payments_state]] OI-2 (`stripe_customer_id` never selected → `/api/stripe/portal` silently broken).

2. **Anonymous→account migration** — `migrateToSupabase` (`IndexedDBStore.js`, ~L206-236) POSTs a **fixed key allowlist** (`puzzle_attempts, session_stats, lesson_progress, sparring_record, streak`) and does **not** copy the local `profile` object at all. So profile-level fields (`tier`, and any new flag like `onboarding_status`) do **not** sync when an anonymous user signs in — you must extend the client payload, the `/api/user/migrate` server handler, AND add the column. There is also **no profile-write method** on `IndexedDBStore` (`getProfile` only auto-inits `{device_uuid, tier}` once); mutating a profile field is net-new (`updateProfile(patch)`).

**Why:** the "just add the column and read it" mental model is wrong on both the server-read and the sign-in-sync paths; each has an allowlist that fails closed (silent `undefined` / silently-not-synced), not open.

**How to apply:** when adding any `users` column, grep for `USER_PROFILE_SELECT_COLUMNS` + `defaultUserProfile` (server read) and `migrateToSupabase` (anon→account sync), and decide explicitly whether the field needs to sync on sign-in. See [[project_indexeddb_signin_hang]] for the IndexedDB profile store, [[project_spec030_server_mediated_data_access]] for the server-mediated access rule.
