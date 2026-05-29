---
name: project_epics_revision
description: docs/mvp/epics.md v4 revision — epic-structure decisions + product-vs-code mismatches found during review
metadata: 
  node_type: memory
  type: project
  originSessionId: 8bcc3e8f-7189-4137-a4cc-ce7ff789b34f
---

`docs/mvp/epics.md` is the DecodeC4 MVP implementation epic breakdown. Reviewed + revised to **v4** on 2026-05-29 against product_vision.md, product_decisions.md (Gaps 1–30), lesson-curriculum.md, db-schema.md, the mockup (`docs/mvp/mockup/project/*.jsx`), and the live code.

**Structural decisions locked in v4 (user-approved):**
- Epic 2 was **split into 2a** (Set Picker, single-move board, Tier-1 feedback, shared move-quality scorer, `/api/evaluate-move`, `/api/puzzles/draw`, `challengeSets.js`) and **2b** (Deep Reveal, Forbidden Columns multi-select, Post-Set Summary). Original Epic 2 overflowed the ~25-task bound.
- Epic 3c (Past Mistakes) **reuses** existing `GET /api/coach/queue` + `POST /api/coach/queue/:id/resolve`; the proposed `/api/blunders` endpoints were dropped.
- Free/Pro mapping follows **Gap 3** (authoritative over code): Claimeven & Z-Threat are FREE, Mixed is a new Pro pseudo-category. `forbidden_columns`/`forced_win` defaulted free pending product confirmation.
- Added new **`odd_even_threat`** puzzle category (Epic 6) to source the mockup's "Odd & Even Threats" set: positions with two threat options (one odd-row, one even-row); correct = parity-aligned choice.

**Product-vs-code mismatches confirmed during review (these are real traps for implementers):**
- Deep Reveal quota: `server/index.js` `checkAndDecrementQuota` is **3/day, UTC-midnight reset**, gated on `/api/explain-move` (which 403s anonymous). But MVP Deep Reveal uses **`/api/explain-move-llm`, which has NO quota**. Product wants 20/week Monday-reset for all users incl. anonymous (IndexedDB counter).
- `blunders` table already exists (migrations 001/005); `CoachPage.jsx` + coach/queue endpoints already implement blunder review. `coach/queue/:id/resolve` has a **parseInt-on-uuid bug** (blunders.id is uuid).
- `PAID_CATEGORIES` (server + src `lib/categories.js`) wrongly marks `claimeven`/`z_threat` paid; must be remapped per Gap 3.
- The **Gap-1 three-tier quality scorer** (Optimal/Suboptimal/Blunder by score-sign comparison) does NOT exist — predicate engine returns only correct/wrong/tied. Needed as a shared module by 2a + 3b.
- `track()` + `/api/track` already exist (modify, not build). `PaywallModal.jsx` still wired to Stripe (Gap 19 wants waitlist-only → new `UpgradeModal`). No `games` table, no lessons infra, no `challengeSets.js`, no `mixed` category yet.

Related: [[project_mvp_planning]], [[project_lesson_curriculum]], [[project_mvp_v2_scope]].
