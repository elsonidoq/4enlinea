# Anonymous free deep reveal — design

**Date:** 2026-07-13
**Branch:** `feature/polish`
**Status:** Approved (design). Next: writing-plans.

## Goal

During onboarding, an anonymous first-run user reaches the post-game **review** and sees mistake
chips, but clicking one does nothing — so they never taste the **deep reveal** (the LLM-generated,
board-grounded explanation of *why* a move was a mistake), which is the product's core value and the
intended conversion hook. Give the anonymous user **one free deep reveal** (the "aha"), then require
sign-up (and, past the free tier, payment) for more.

## Product decision (already made by the owner)

Give anon **1 free deep reveal, then gate** — chosen over "sign-up CTA on click", "full anonymous
support", and "make chips non-clickable".

## Settled design decisions

1. **How anon reaches the reveal — full approach (a): store anon blunder rows.** The onboarding game
   is treated like any other game. Blunder rows are stored for anonymous games keyed by the
   client-supplied `device_uuid` (mirroring how sparring `games` are already stored/migrated), and
   re-associated to `user_id` on registration. There should be **no big technical difference** between
   the anonymous and signed-in states. (Rejected: on-the-fly reveal from `{movestring, col}` with no
   storage — smaller surface but leaves a permanent technical fork between anon and signed-in, and
   would not light up Past Games / stats after sign-up.)

2. **Enforcing "1 free" — client localStorage flag + strict per-IP rate cap, no server counter.**
   A `localStorage` flag records which blunder was revealed; the honest UX gate is client-side. The
   server allows anon through `/api/explain-move-llm` under a **dedicated strict per-IP rate limiter**
   and never touches `deep_reveal_count` (anon has no `users` row). Bypass value ≈ a few LLM calls;
   the cache dedups repeats of the same board. (Rejected: server per-`device_uuid` quota column —
   migration + storage for marginal gain, and `device_uuid` is itself client-supplied.)

3. **Where the gate lands:** on the **next mistake click**. The first blunder click opens the reveal
   (the aha); a second, different reveal shows the sign-up gate (reuse existing `coach.deepRevealGate`
   copy) → existing `AuthModal`. The reveal view itself stays un-nagged.

4. **Which mistakes:** **any stored mistake, not restricted to genuine blunders.** ~~The original design
   restricted the free reveal to genuine blunders exclusively, so the aha would land hard.~~ **RETIRED
   2026-08-01 (spec `053`/Epic 7, US3, D2).** The free reveal opens on any stored mistake the anon user
   clicks — blunder or suboptimal alike — per spec-042 FR-002; the exclusive-restriction gate described
   above was never actually implemented (no client branch, no server gate ever existed) and rested on a
   false premise about `ReviewScreen.selectStep`, which navigates for any non-optimal move with a stored
   row, not only blunder rows. **Documented reversal trigger:** if evidence appears that anonymous users
   routinely spend the free reveal on suboptimal, non-blunder moves, the response is to *steer* toward
   blunders via copy/UI nudges (e.g. highlighting which mistake is the blunder), never to *restrict*
   which moves the reveal can be spent on — a server-side gate is not cleanly implementable (the anon
   gate is keyed by position+column, which maps ambiguously to stored rows across games/users) and a
   client-only gate is theatre against the public no-auth `/api/blunders/:id` permalink. Full rationale:
   `docs/superpowers/plans/2026-07-13-anon-free-deep-reveal.md:18` (already `RETIRED 2026-07-16`, cited
   here as evidence D2 shipped) and `docs/open_issues.md`.

5. **Presentation:** the **existing** `MistakeDetailScreen` (`blunderDetail`) path, unchanged — because
   the blunder rows now exist, in-app navigation, "X of Y", Prev/Next all work as for signed-in users.

## Verified current state (the three anon blocks)

1. **No stored blunders for anon games.** `POST /api/games/analyze` (`server/index.js` ~2269-2285)
   writes blunder rows only `if (req.user && isMistake)`; `insertGameBlunder.js` early-returns on
   `!user_id`. The endpoint is no-auth and already supports reviewing anon (`user_id NULL`) games — it
   just writes no blunders. The ownership gate (~2057-2074) must NOT compare `device_uuid` to
   `req.user.id` (different id namespaces).
2. **Nav-list never fetched for anon.** `ReviewScreen.jsx` fetches `GET /api/coach/queue` only
   `if (session)`; the endpoint 401s anon (`index.js` ~2604). `navigateToMistake` then no-ops.
3. **Deep-reveal endpoint 401s anon.** `POST /api/explain-move-llm` (`index.js` ~1105) starts with
   `if (!req.user) return 401`; quota treats anon as `{allowed:false}`. The explanation itself is
   computed purely from `{movestring, col}` — highlights/KB-terms/coach-voice all come from the
   generated text, no stored blunder row needed to render it.

## Schema facts driving the migration

- `blunders.user_id` is **`NOT NULL`** (FK `users(id) ON DELETE CASCADE`). RLS `WITH CHECK` already
  permits `user_id IS NULL`; the server uses the service-role key, so RLS does not gate its queries.
- **No `device_uuid` column** on `blunders`.
- Dedup today: unique indexes `(user_id, game_id, move_index)` (migration 054) and
  `(user_id, papergames_game_id, move_index)` (053). NULL `user_id` is distinct in a Postgres unique
  index, so neither dedups anon rows.
- Latest migration is `057`; the new one is `058`. Index-name reuse silently no-ops — use **new,
  distinct** index names.

## Design

### 1. Data model — `058_blunders_device_uuid.sql`
- `ALTER TABLE public.blunders ALTER COLUMN user_id DROP NOT NULL;`
- `ALTER TABLE public.blunders ADD COLUMN IF NOT EXISTS device_uuid text;`
- `CREATE UNIQUE INDEX IF NOT EXISTS idx_blunders_device_game_unique ON public.blunders
   (device_uuid, game_id, move_index) WHERE user_id IS NULL AND device_uuid IS NOT NULL AND
   game_id IS NOT NULL;`
- `CREATE INDEX IF NOT EXISTS idx_blunders_device_created ON public.blunders
   (device_uuid, created_at DESC) WHERE user_id IS NULL;`
- AI-sparring only; no anon papergames dedup index (not an onboarding flow).

### 2. Blunder write (`/api/games/analyze` + `insertGameBlunder.js`)
- Relax the write gate to also fire for anon games: when `!req.user` and the game is anon, insert with
  `user_id: null, device_uuid: aiGame.device_uuid` (the already-fetched game row — **not** a new body
  field, and never a `device_uuid === req.user.id` comparison). Authenticated path unchanged
  (`user_id` set, `device_uuid` null).
- `insertGameBlunder` accepts a device-keyed row (require `user_id || device_uuid`); keep the
  `classifyStoredMistake` gate and `23505`-swallow dedup.
- Extend the analyze cache-check (currently `if (req.user)`) to short-circuit anon re-analysis by
  `device_uuid`, so re-opening review doesn't re-burn the solver.

### 3. Blunder serving (both builders device-aware)
- `GET /api/coach/queue`: replace the `401` — if `req.user`, filter by `user_id` (today); else require a
  `device_uuid` query param and filter `.eq('device_uuid', …).is('user_id', null)`. Returned shape
  unchanged.
- `GET /api/blunders/:id` is already a public permalink; no change needed for the in-app path (passes
  `blunderNavList`). The separate enriched map builder (~`index.js:2560`) and the `:id` builder both
  keep their shapes; only the queue query gains device-awareness.
- `POST /api/coach/queue/:id/resolve` stays `user_id`-gated; anon won't see the button.

### 4. Deep-reveal endpoint (`/api/explain-move-llm`)
- Allow anon past the `!req.user` 401 **under a dedicated strict per-IP rate limiter** (tighter than the
  signed-in `makeLimit`). Never touch `deep_reveal_count`. Cache-hit / notABlunder paths already return
  before quota, so no quota code runs for anon.
- Ensure `/api/games/analyze` (already anon-accessible, solver-backed) has a sane rate limit.

### 5. Migrate (`/api/user/migrate`, `server/userRoutes.js`)
- Add one operation to the atomic `operations[]`, mirroring the shipped games re-association:
  `UPDATE blunders SET user_id = req.user.id WHERE device_uuid = body.device_uuid AND user_id IS NULL`.
  Keys on the **client's** `body.device_uuid`. After this, past-games mistake counts
  (`blunderCountsForGames.js`) and stats (`statsAggregate.js`) light up automatically — they are
  `user_id`-scoped and need no change.

### 6. Client — the "1 free" gate + entry
- **`ReviewScreen`**: drop the `if (session)` guard on the queue fetch — fetch for anon too, appending
  `device_uuid`. `navigateToMistake` then routes to `blunderDetail` exactly as for signed-in users.
- **New pure module `src/lib/anonDeepReveal.js`** (unit-tested, like `onboardingGameEnd.js`):
  `canReveal(blunderKey)` / `markRevealed(blunderKey)` over a localStorage flag that records **which**
  blunder was revealed — re-opening that same reveal stays free; any new reveal is gated.
- **`DeepRevealPane`**: replace the blanket `!session?.user → AuthModal` short-circuit with:
  anon + `canReveal` → proceed; anon + already-used-on-a-different-blunder → sign-up gate (reuse
  `coach.deepRevealGate`) → `AuthModal`. On success, `markRevealed`.
- **`MistakeDetailScreen`**: hide owner-only controls (mark-reviewed) when `session` is null; Prev/Next
  + "X of Y" work over the real navList.

### 7. Scoped hardening — OI-12
The one free reveal is the conversion moment; a cold uncached call can exceed `DeepRevealPane`'s fixed
~6s timeout and show "unavailable" even though the server succeeded. Soften it (show a "still thinking…"
state / raise the ceiling) so the anon reveal doesn't die on a cold call. Closes OI-12.

## Constraints / do-not-break
- Signed-in free tier stays 20/week; anon gets exactly 1 (client-enforced). Deep reveal stays the paid
  ladder's top rung.
- Never re-add a `device_uuid === req.user.id` comparison in `/api/games/analyze`.
- Keep onboarding anonymous-only auto-route semantics intact.
- Everything the reveal text names on the board must stay grounded/highlighted — verify a couple of
  real onboarding blunders against `visualize_board.sh` + reason-engine TOOLS.

## Testable seams (TDD)
- `anonDeepReveal.js` — pure gate logic (localStorage mocked).
- `insertGameBlunder` anon/device path — unit test.
- HTTP-harness tests (`userEndpoints.test.mjs` style): analyze writes anon blunders by `device_uuid`;
  coach/queue serves anon by `device_uuid` and 401s when neither present; explain-move-llm allows anon
  under the rate cap; migrate re-associates blunders.
- Dedup: a second analyze of the same anon game inserts no duplicate rows.

## QA (real browser, app-qa skill, incognito/clean profile)
Anon plays onboarding game → review → click a blunder → the ONE free deep reveal opens and renders a
**grounded** explanation (verify ≥2 real onboarding blunders) → a second blunder's reveal shows the
sign-up gate → after sign-up, the game + its blunders appear in Past games and the normal 20/week quota
applies. Reset to a genuine anonymous state via Settings "Dev: clear IndexedDB & sign out". Note the
app-qa board/audio gotchas (`project_app_qa_setup_gotchas`).

## Out of scope
- Anon papergames blunder storage (not an onboarding flow).
- Server-side anon quota counting (localStorage + IP rate cap only).
