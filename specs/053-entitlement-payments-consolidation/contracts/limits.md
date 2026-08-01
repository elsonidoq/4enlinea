# Contract: `GET /api/limits` (new)

**Purpose**: give `/pricing` (and any future caller) a live source for the free-tier Deep Reveal weekly
quota figure, closing the gap flagged in the handoff — no endpoint exposes
`quotaLimits.js#FREE_DEEP_REVEAL_WEEKLY_LIMIT` today.

**Auth**: None — public, unauthenticated, like `GET /api/paddle/config` and `GET /api/lessons`.

**Request**: No params, no body.

**Response `200`** (always — no failure branch; this is a bare in-process constant read):
```json
{ "freeDeepRevealWeeklyLimit": 20 }
```

**Implementation**:
```js
// server/index.js, near the other public resource routes
import { FREE_DEEP_REVEAL_WEEKLY_LIMIT } from './quotaLimits.js'; // already imported for the quota gate

app.get('/api/limits', (req, res) => {
  res.json({ freeDeepRevealWeeklyLimit: FREE_DEEP_REVEAL_WEEKLY_LIMIT });
});
```

**Why a new endpoint and not a field on `GET /api/paddle/config`**: see research.md Decision 7 — coupling
the quota figure's availability to `PADDLE_API_KEY` being configured would make an unrelated constant
disappear whenever Paddle is unset, which has nothing to do with the quota itself.

**Consumer**: `src/screens/PricingScreen.jsx` fetches this once on mount, alongside its existing
`usePaddlePrices()` call. If the fetch fails, the screen falls back to a generic non-numeric phrase (see
data-model.md) rather than a hardcoded number — this keeps FR-020's "no hand-typed... quota figure"
invariant intact even in the failure path.

**Documentation task**: add this route to `docs/architecture/api-conventions.md` under a new "Public
Config/Limits" subsection (or alongside `GET /api/paddle/config`, cross-referenced) — this is a new,
previously-undocumented server convention (a public, provider-independent config endpoint) per constitution
Principle VIII.
