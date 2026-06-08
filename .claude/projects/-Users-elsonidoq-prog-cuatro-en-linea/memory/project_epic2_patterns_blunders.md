---
name: project_epic2_patterns_blunders
description: "Epic 2 (patterns-blunders production wiring) implementation complete — 11/13 tasks done, key debugging gotcha, open items"
metadata:
  type: project
---

Epic 2 of Patterns → Blunders → Challenges implemented 2026-06-07 on branch `101-new-design`. 11 of 13 tasks complete (T009 is a stub absorbed into T008; T010 is an operator backfill step — not a release gate).

## What was built

- **`server/blunderTags.js`** — `VALID_BLUNDER_TAGS` 15-tag Set, single source of truth
- **`server/insertGameBlunder.js`** — extracted INSERT helper: auth gate, 15-tag guard, 23505-as-success
- **`server/index.js`** — analyze endpoint: `tagBlunder()` replaces `classify()` for blunder path; server-side INSERT via `insertGameBlunder`; `reason`/`direction` in JSON response; POST /api/blunders hardened with VALID_BLUNDER_TAGS guard
- **`server/scripts/reprocess_blunders.mjs`** — tagBlunder + reason/direction + blunderTags import
- **`server/scripts/import_papergames_blunders.mjs`** — same (compilability only)
- **`src/screens/ReviewScreen.jsx`** — client-side blunder write block removed, dead code cleaned
- **`server/classifier.js`** — `classifyBestMove` deleted (zero callers); `classifyAll` preserved with caller documentation comment
- **`tests/blunder/insertGameBlunder.test.js`** — 3 unit tests (auth gate, tag guard, 23505)
- **`docs/architecture/server-conventions.md`** — Blunder Tag Registry subsection
- **`docs/architecture/testing-conventions.md`** — updated with extraction pattern, node-test conventions, test:fast vs npm test

## Debugging gotcha — blunders silently not populated

**If blunder rows aren't appearing after a game with no browser errors**, check in this order:

1. **Auth gate**: `insertGameBlunder()` silently returns when `row.user_id` is falsy. The analyze endpoint calls it only when `req.user` is set. If `loadUser` middleware (server/index.js:160) resolves to `req.user = null` (expired token, missing header, Supabase error — all caught silently), blunders are analyzed and returned in the JSON response but never stored. Verify: add `console.log('[analyze] req.user:', req.user?.id)` before the INSERT guard at line 1545.

2. **Fire-and-forget error suppression**: `insertGameBlunder` catches all INSERT errors via `console.error('[insertGameBlunder]', ...)` — these go to server stdout, never the browser. Check server logs.

3. **ReviewScreen session race**: The analyze fetch on line 41 of ReviewScreen.jsx runs in a `useEffect` depending only on `[id]`. If `session` is still null on mount, the fetch fires without an auth token. Verify: log `session` before the fetch.

4. **scoreMove may not classify any ply as blunder**: If `quality === 'blunder'` never fires, `tagBlunder` never runs and zero INSERTs occur. Verify: log `quality` per ply in the analyze loop.

## Open items

- **T010**: Operator backfill — run `node --env-file=connect-four/server/.env connect-four/server/scripts/reprocess_blunders.mjs` post-deploy. Best-effort, not a release gate.
- **Pre-existing test failure**: `classifier.test.js:83` (forbidden_columns → suboptimal_move), unrelated to Epic 2.
- **`PAID_CATEGORIES` in ReviewScreen.jsx** — imported but dead after write block removal. Kept per spec instruction.
- **`classifyAll` removal deferred to Epic 3** — active callers: debug endpoint + classify_all.mjs CLI script.

## Why: debugging the fire-and-forget INSERT path

The analyze endpoint's blunder INSERT is fire-and-forget — INSERT failures (other than 23505) are caught and logged server-side but NEVER surfaced to the client. The JSON response is returned regardless of INSERT outcome. This means the browser always shows success even if all blunder INSERTs are failing silently on the server. When debugging "blunders not populated," the first place to look is the server terminal output.
