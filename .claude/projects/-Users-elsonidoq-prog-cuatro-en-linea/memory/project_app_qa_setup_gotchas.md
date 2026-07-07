---
name: project_app_qa_setup_gotchas
description: "app-qa run traps — dev-skip-auth strands data, resize_page broken, session drops mid-run, blunder unique-index cross-user collision"
metadata: 
  node_type: memory
  type: project
  originSessionId: 6f71b68c-1af2-4e0c-82e4-d2be1a57e597
---

Non-obvious traps hit during the mobile `/app-qa` sweep (2026-07-07). Read before running app-qa.

- **`🛠 Dev: skip auth` mints a NEW empty anonymous user every time** (`signInAnonymously()`), keyed to a fresh device_uuid. It does NOT reuse the prior QA user, so pre-populated games/blunders (owned by an earlier user) are invisible. To QA data-dependent areas: flip the new user to paid + set papergames_id + import via the app, then (because of the bug below) **reassign existing blunders' `user_id` to the new user** — the import's deterministic game ids mean games transfer via upsert but blunders don't.
- **`idx_blunders_papergames_unique` is `(papergames_game_id, move_index)` with NO `user_id`** → a 2nd user importing the same papergames account has ALL blunder inserts dropped as 23505 duplicates (importer reports `blunderErrors:0`, silently). Real product bug (multi-user data loss) AND the reason import yields 0 stored blunders for a 2nd user. Logged in agentic_QA.md.
- **`resize_page` (chrome-devtools MCP) does NOT actually resize here** — `window.innerWidth` stays put. Use `emulate({viewport:"390x844x2,mobile,touch"})` instead; it persists across navigation.
- **The session drops mid-run** (access token expires, client never auto-refreshes → app shows logged-out "Sign up"). Self-heal WITHOUT re-clicking dev-skip-auth (which strands data): `await fetch('/api/auth/refresh',{method:'POST',credentials:'include'})` then reload. This is itself a shipped bug (client should call refresh on 401).
- **Fresh full-DB wipe = clean single-user path (no blunder reassignment needed):** if the user has wiped the local DB, dev-skip-auth is the *only* user, so importing papergames as that user stores blunders normally (137 for account `69e773d36bf9938bffc1509a`); the unique-index collision only bites the 2nd user. So a fresh DB is the way to QA blunder-dependent flows without the reassignment dance — but it does NOT prove the index bug is fixed (verify `pg_indexes` for `user_id` in `idx_blunders_papergames_unique`; still absent as of 2026-07-07 round 2).
- **Board discs render as radial-gradient `background-image`, NOT `backgroundColor`** → naive `evaluate_script` disc detectors keyed on `backgroundColor` return 0 filled cells and you'll wrongly think the board is empty. Detect via `getComputedStyle(e).backgroundImage` containing `rgb(67, 198, 115)` (green/P1) vs `rgb(82, 90, 107)` (gray/P2); empty cells are `rgb(251, 244, 227)`. Board cells still lack `role`/`aria-label`, so a11y snapshots can't map the grid. Highlights: light-green ring = correct move, red/salmon ring = played move.
- **Coach queue `.limit(50)` cap** (`server/index.js:2508`, no pagination): `/mistakes` category cards are derived from the top-50-by-severity list, so with >50 blunders whole categories (undercut, forced_win) vanish from the UI though reachable via `?category=`. Logged in agentic_QA.md + new_TODOs.md.
- **Local `puzzles` table is often empty** → Challenges set picker renders nothing; re-seed before QA'ing Challenges.
- Tier flips: no email on the anon user, so `set-tier.js` can't find it — flip `users.tier` by direct service-role DB update. Deep-reveal free quota = 20/week (`deep_reveal_count`); set it to 20 to test the 429 + "Become Pro" CTA. Related: [[project_papergames_integration]], [[bug_supabase_js_session_contamination]].
