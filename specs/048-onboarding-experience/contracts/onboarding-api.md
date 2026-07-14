# API Contract Deltas: Onboarding Experience

All endpoints below already exist. This feature extends their shape additively; no existing
field, status code, or error contract changes.

## `GET /api/user/profile`

**File**: `connect-four/server/userRoutes.js:93`

Add one field to the existing response object, sourced from the new `users.onboarding_status`
column:

```diff
 res.json({
   device_uuid: req.user.device_uuid ?? null,
   tier: req.user.tier,
   deep_reveal_count: req.user.deep_reveal_count,
   deep_reveal_reset_at: req.user.deep_reveal_reset_at,
   papergames_id: req.user.papergames_id ?? null,
   last_import_at: req.user.last_import_at ?? null,
+  onboarding_status: req.user.onboarding_status,
 });
```

`req.user` is the already-loaded row from `users` (whatever middleware populates it); no new
query — the column just needs to be included wherever that row is selected/hydrated if the
current query is not `select('*')`.

## `PUT /api/user/profile`

**File**: `connect-four/server/userRoutes.js:106`

Currently accepts only `papergames_id` (required, validated as a non-empty string ≤64 chars).
Extend to accept an **optional** `onboarding_status`, validated against the fixed 3-value enum,
independently of `papergames_id` (either field may be present; at least one must be):

```diff
 app.put('/api/user/profile', async (req, res) => {
   if (!requireUser(req, res)) return;
   if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });

-  const { papergames_id } = req.body;
-  if (!papergames_id || typeof papergames_id !== 'string' || papergames_id.length > 64) {
-    return res.status(400).json({ error: 'papergames_id must be a non-empty string (max 64 chars)' });
-  }
+  const { papergames_id, onboarding_status } = req.body;
+  const ONBOARDING_STATES = new Set(['not_encountered', 'seen', 'skipped']);
+  const update = {};
+
+  if (papergames_id !== undefined) {
+    if (typeof papergames_id !== 'string' || !papergames_id || papergames_id.length > 64) {
+      return res.status(400).json({ error: 'papergames_id must be a non-empty string (max 64 chars)' });
+    }
+    update.papergames_id = papergames_id;
+  }
+
+  if (onboarding_status !== undefined) {
+    if (!ONBOARDING_STATES.has(onboarding_status)) {
+      return res.status(400).json({ error: 'invalid onboarding_status' });
+    }
+    update.onboarding_status = onboarding_status;
+  }
+
+  if (Object.keys(update).length === 0) {
+    return res.status(400).json({ error: 'no valid fields provided' });
+  }

   const { error } = await supabase
     .from('users')
-    .update({ papergames_id })
+    .update(update)
     .eq('id', req.user.id);

   if (error) {
-    return res.status(500).json({ error: 'Failed to save papergames_id' });
+    return res.status(500).json({ error: 'Failed to update profile' });
   }

   res.status(204).send();
 });
```

Existing callers that only send `{ papergames_id }` are unaffected (same 204/400/500 contract).

## `POST /api/user/migrate`

**File**: `connect-four/server/userRoutes.js:445`

Add one optional key to the accepted body, alongside the existing five:

```diff
 const {
   puzzle_attempts,
   session_stats,
   lesson_progress,
   sparring_record,
   streak,
+  onboarding_status,
 } = req.body;
```

Handling (placed near the existing `device_uuid` backfill-if-unset block, `userRoutes.js:456-460`,
same conditional-write posture):

```js
if (onboarding_status && ONBOARDING_STATES.has(onboarding_status)) {
  await supabase
    .from('users')
    .update({ onboarding_status })
    .eq('id', req.user.id)
    .eq('onboarding_status', 'not_encountered'); // don't clobber a real prior status
}
```

Invalid/absent `onboarding_status` is a silent no-op — it MUST NOT fail the migration request
(the other five data categories migrate independently of this one optional field, matching the
endpoint's existing per-category tolerance). Response contract (204 on success, existing error
shape on failure) is unchanged.

## `POST /api/track`

**File**: `connect-four/server/index.js` (handler around line 992); client
`connect-four/src/lib/track.js`

No server-side shape change — `const uid = req.user?.device_uuid || req.body.uid || 'unknown';`
(`index.js:996`) already reads `body.uid`. The only change is client-side: `track()` starts
populating `uid` in its POST body for anonymous users (see research.md R7). New onboarding event
names introduced by this feature (fired via the existing `track()`):

| Event | When |
|---|---|
| `onboarding_started` | first-run redirect fires (or manual Settings replay starts) |
| `onboarding_finished` | the import offer is shown, whichever path led there — game-end or the one-time Home fallback (FR-007) |
| `onboarding_skipped` | FR-009 fires |
| `onboarding_import_offer_accepted` | user accepts the offer |
| `onboarding_import_offer_declined` | user dismisses the offer |

No `onboarding_aha_reached` / `onboarding_encountered_no_aha` events exist — aha/coach-reaction
detection was dropped (see spec.md Assumptions, research.md R5). `onboarding_finished` is the
lifecycle event FR-015 requires in place of the old aha-specific funnel step; `movePlayed`
(the `seen` transition, FR-005) is not separately tracked as its own analytics event by this
feature, since `onboarding_started` and `onboarding_finished`/`onboarding_skipped` already bound
the funnel.
