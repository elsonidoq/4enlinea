---
name: project_mvp_epic_plan
description: "Current MVP epic breakdown (v4, 2026-05-29) — 10 epics in ship order, key product decisions (gaps 1–30), and product-vs-code mismatches"
metadata: 
  node_type: memory
  type: project
  originSessionId: 04c4bf45-005f-4617-8eae-aeefaab3b257
---

Authoritative plan: `docs/mvp/epics.md` (v4). Product decisions: `docs/mvp/product_decisions.md` (gaps 1–30). Visual spec: `docs/mvp/mockup/project/*.jsx`.

## 10 epics in ship order

- **1a**: Design Tokens & Component Library
- **1b**: App Shell + Navigation Migration (keeps i18n, adds analytics)
- **7**: Auth & Progress Persistence (reskin existing auth; no payments)
- **2a**: Set Picker, single-move board, Tier-1 feedback. **DONE (2026-05-31).** See [[project_epic2a_implementation]].
- **2b**: Deep Reveal, Forbidden Columns multi-select, `forced_win` sequence set, Post-Set Summary, Flag icon on Tier-1 strip, weekly Deep Reveal quota limit
- **3a**: Sparring: Game Board (saves to new `games` table)
- **3b**: Post-Game Review + Explorer (blunder writes as side effect)
- **3c**: Past Mistakes Review (authenticated users only; reuses `GET /api/coach/queue` + `POST /api/coach/queue/:id/resolve`)
- **4**: Lesson Infrastructure + Saga Map (Variant C only)
- **5**: Lesson Content (11 JSON files + minor backend additions)
- **6**: Data Pipeline (puzzle counts + generation predicates, new `odd_even_threat` category)

## Key product decisions (gaps 18–30)

- **Anonymous Deep Reveals**: same 20/week cap as free users (IndexedDB counter); no separate lockout
- **Game persistence**: new `games` table (migration needed); saved on game completion
- **Blunder capture**: side effect of opening Post-Game Review; no async job
- **Past Mistakes**: authenticated only; browse `blunders`; Deep Reveal on demand; mark as reviewed
- **Forbidden Columns**: multi-select tagging; exact-match predicate; both FP and FN are wrong
- **Personal AI Coach MVP**: real-time one-liners + past mistake review; no weakness map, no SR queue
- **Prompt caching**: `explanation_cache` keyed on `SHA256(movestring + ":" + col)`
- **Payments**: deferred; `UpgradeModal` shows waitlist email only; Stripe routes exist but not wired
- **i18n**: react-i18next everywhere; Spanish = post-MVP

## Product-vs-code mismatches (traps for implementers)

- **Deep Reveal quota**: `checkAndDecrementQuota` in `server/index.js` is 3/day on `/api/explain-move` — but MVP Deep Reveal uses `/api/explain-move-llm` which has **no quota**. Product wants 20/week Monday-reset for all users via IndexedDB.
- **`blunders` table already exists** (migrations 001/005); `CoachPage.jsx` + coach/queue endpoints already exist. `coach/queue/:id/resolve` has a `parseInt-on-uuid` bug.
- **`PAID_CATEGORIES`** — RESOLVED (Epic 2a). Both files now: free = `immediate_threat`, `forced_block`, `double_threat`, `claimeven`, `z_threat`; Pro = `forced_win`, `forbidden_columns`, `mixed`, `undercut`, `overcut`, `figure_7`, `j_shape`.
- **Gap-1 quality scorer** — RESOLVED (Epic 2a). `server/moveQualityScorer.js` exports `scoreMove(scores, playedCol)` → `{ badge, quality, bestCol }`. Shared module for 2a + 3b.
- **`challengeSets.js` / `mixed` category** — RESOLVED (Epic 2a).
- **`track()` + `/api/track` already exist** — modify, don't rebuild. `PaywallModal.jsx` still wired to Stripe; needs replacement with `UpgradeModal`.
- **No `games` table, no lessons infra** — still pending (Epics 3a, 4).
- **`odd_even_threat`** puzzle category (Epic 6): positions with two threat options (one odd-row, one even-row); correct = parity-aligned choice. New category, no existing code.

## Free/Pro category mapping (Gap 3)

Free: `immediate_threat`, `forced_block`, `double_threat`, `claimeven`, `z_threat`
Pro: `forced_win`, `undercut`, `overcut`, `figure_7`, `j_shape`, `mixed` (new pseudo-category)
`forbidden_columns`/`odd_even_threat`: defaulted free pending confirmation.
