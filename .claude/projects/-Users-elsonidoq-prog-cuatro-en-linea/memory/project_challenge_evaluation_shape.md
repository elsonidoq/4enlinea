---
name: project_challenge_evaluation_shape
description: "ChallengeScreen evaluation state shape is polymorphic — forbidden_columns uses summaryLine (pre-rendered), others use summaryLineKey (i18n key)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 40af3bb0-5c87-41a4-8c01-3200a52676f6
---

`ChallengeScreen.jsx` uses an `evaluation` state object. Its shape differs by category:

- **Standard single-move categories** (immediate_threat, forced_block, etc.): `{ quality, badge, summaryLineKey, patternTag?, coachMood? }` — `summaryLineKey` is an i18n key passed to `t()` at render time.
- **forbidden_columns**: `{ quality, badge, summaryLine }` — `summaryLine` is a **pre-rendered string** (because the suboptimal case needs `{{found}}/{{total}}` interpolation that can't be deferred). No `summaryLineKey` field.

**Why:** `t(evaluation.summaryLineKey)` at render time can't pass interpolation values unless you also store them in evaluation. The pre-render approach avoids extending the evaluation shape further.

**How to apply:** The Tier-1 strip renders `evaluation.summaryLine ?? t(evaluation.summaryLineKey)` — always use this fallback pattern, never assume one field or the other is present. Any new category that needs i18n interpolation in its summary line should follow the `summaryLine` (pre-rendered) approach.
