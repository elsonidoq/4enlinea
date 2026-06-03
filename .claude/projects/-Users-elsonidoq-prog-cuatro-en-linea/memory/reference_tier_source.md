---
name: reference_tier_source
description: User tier (free/paid) is on the profile, not the session — read via store.getProfile().tier, not session.tier
metadata:
  type: reference
---

The `session` object exposed by `useStore()` is the **Supabase auth session**. It has no `tier` field.

Tier lives on the **user profile**, read asynchronously:

```js
store.getProfile().then(p => setTier(p.tier))
```

Canonical precedent: `PostSetSummaryScreen.jsx:50`.

Any spec or screen that gates on Pro/free (`locked` nodes, UpgradeModal, etc.) must use this pattern — `session?.tier` is always `undefined` and will silently treat every user as free tier.
