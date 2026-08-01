# Quickstart / Verification: Entitlement & Payments Consolidation

Run `eval "$(./worktree-ports.sh)"` from the repo root first, in every terminal, before starting or killing
any server (`docs/architecture/worktree-conventions.md` — standing rule, not conditional).

## US1 — Server-side lesson entitlement

1. `cd connect-four && node --env-file=server/.env server/index.js &` (or your normal dev-server start,
   using `$API_PORT`).
2. Find a paid lesson id (free 1–10 / paid 11–15 split, per the epic's Non-obvious facts — confirm the exact
   split against `connect-four/lessons/*.json`'s `free` field before picking one).
3. `curl -s http://localhost:$API_PORT/api/lessons/<paid-id> | jq` — expect
   `{ "id": ..., "title": ..., "order": ..., "free": false, "locked": true, "authenticated": false }` with
   **no** `"slides"` key.
4. `curl -s -H "Authorization: Bearer <a paid user's token>" http://localhost:$API_PORT/api/lessons/<paid-id> | jq`
   — expect the full lesson, including `slides`.
5. In-browser, for EACH of the three real consumers of this endpoint — the saga/`ConceptScreen`, the
   `SocraticScreen`, and a direct cold-boot load of `CLChallengeScreen` for a locked lesson (e.g. reload the
   URL directly, not via in-app navigation) — as a free/signed-out user, confirm the existing upgrade-prompt
   UI renders and the screen does NOT crash or blank out. This is the primary regression this plan must
   prevent: `ConceptScreen.jsx` indexes `lesson.slides[slideIndex]` unguarded today, so skipping this check
   for any of the three would miss a `TypeError`/blank-screen regression on the two screens the epic didn't
   originally name.

## US2 — One entitlement source

1. `curl -s http://localhost:$API_PORT/api/user/entitlement | jq` (no cookie) →
   `{ "entitled": false, "authenticated": false }`.
2. Same call with a paid user's session cookie → `{ "entitled": true, "authenticated": true }`. With a free
   user's session cookie → `{ "entitled": false, "authenticated": true }` (confirms `authenticated` is
   independent of `entitled`, not derived from it).
3. In-browser: sign in as a free user, open Settings (subscription section), complete a sandbox Paddle
   purchase, confirm the page reflects `paid` without a manual reload (checks FR-012's invalidation trigger
   and SC-003).
4. Session-lapse case (FR-013 addendum, research.md Decision 4): sign in as a paid user so the client caches
   `lastKnownGood = { entitled: true }`, then manually expire/clear the auth cookie server-side (or wait out
   the token) without signing out client-side, and trigger a `getEntitlement()` call (e.g. reload a screen
   that reads it). Confirm the client attempts one `POST /api/auth/refresh` + retry before showing a
   downgraded/locked UI — a paying customer must not flash to "locked" on a merely-expired cookie if the
   refresh succeeds.
5. Grep-verify no call site still reads `profile.tier`/`.tier` directly outside `src/lib/entitlement.js`
   itself and `server/entitlement.js`: `grep -rn "\.tier" connect-four/src/screens connect-four/src/components
   connect-four/src/lib/useLessonLockGuard.js` should show zero remaining raw reads at the five migrated
   sites (unrelated `.tier` reads outside this list, e.g. `colRankings[].tier` in `RecommendCoach`, are a
   different "tier" concept per `frontend-conventions.md`'s three-tier-types note — do not touch those).

## US3 — Payment identity & analytics (documentation-only + possible OI-34 code)

1. Read `docs/architecture/server-conventions.md` §"Identity binding on `transaction.completed` (OI-55)" —
   confirm it now reads as a dated, ratified decision with the two residual risks named, and contains no
   remaining "proposal to sanity-check" language (SC-006).
2. If OI-34 is kept open with a code fix (research.md Decision 8): use the `paddle:sandbox-testing` skill to
   drive a purchase through the `verify-transaction` fallback path only (simulate a dropped webhook), then
   query `tracks` for exactly one `upgrade_completed` row for that transaction id, and confirm a subsequent
   webhook delivery for the same transaction does not insert a second row.

## US4 — Pricing page

1. `cd connect-four && npm run build`.
2. Serve the built `dist/` via the real Express server (not `npm run dev` — CSP is invisible under Vite dev,
   `project_csp_helmet_traps`).
3. Navigate to `/pricing` — confirm it renders the new in-app page (not the old static table), prices match
   `GET /api/paddle/config`, the quota figure matches `GET /api/limits`, and open devtools' CSP violation
   console — expect zero entries, including after opening the Paddle checkout overlay (FR-027/SC-008).
4. Navigate to `/pricing-legal` directly (cold load, no prior `/pricing` visit) — confirm the Merchant-of-
   Record clause, 14-day refund statement, and `/terms` link render, unchanged in wording (FR-023).
   `git diff` on `connect-four/server/pricing.html` MUST be empty — only the route path changed
   (`server/index.js`), never the file's content (owner decision 2026-08-01; OI-41 stays open with a dated
   `UPDATE`, not `RESOLVED` — see research.md Decision 11).
5. With JavaScript disabled in the browser (or via `curl`, following redirects), load `/terms`, follow its
   "Pricing" link, and confirm it lands on `/pricing-legal` and renders correctly with no JS at all. Repeat
   for `/privacy` and `/refunds`'s Pricing links. This is the check that catches a stale `<a href="/pricing">`
   silently resolving to the SPA shell instead of the static legal page (research.md Decision 11).
6. Stop the server, unset `PADDLE_API_KEY`, restart, reload `/pricing` — confirm the degraded-state message
   appears (no raw error, no blank page, no purchase CTA that can't succeed) and `/pricing-legal` is still
   fully reachable independent of `/pricing`'s state (FR-022/SC-007).
7. Confirm via the `paddle-docs` MCP server that no domain re-submission is required for this change
   (confirmatory, non-blocking per Settled decision #6).

## US5 — Checkout return continuity

1. Complete a practice set, land on `/summary`, start a purchase, complete it in the sandbox — confirm you
   land back on the same results (not the set picker) (FR-030/SC-005).
2. Repeat, but fully close and reopen the tab/app between starting the purchase and completing it — confirm
   the results are still restored (FR-029's "including across a full app restart" clause).
3. Corrupt/clear the `sessionStorage` nonce mid-flow and confirm the existing `returnPathOverride='/setpicker'`
   fallback still applies (FR-031 — no regression).
4. Complete one purchase, dismiss the resulting modal, then open the upgrade modal again later in the same
   session — confirm no stale outcome from the first purchase reappears (FR-032, the OI-59 replay-on-
   subscribe fix must keep holding — re-run `checkoutReturnFlow.js`'s existing tests, don't just eyeball it).

## Full regression

`cd connect-four && npm run test:fast` — must stay green. Do **not** run `npm test` (candidate-generator's
real-solver suite is unrelated to this feature and can hang 10+ minutes).
