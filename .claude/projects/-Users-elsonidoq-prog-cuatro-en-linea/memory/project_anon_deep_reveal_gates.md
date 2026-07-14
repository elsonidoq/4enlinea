---
name: project_anon_deep_reveal_gates
description: Anonymous free deep reveal ships via device_uuid-keyed blunders + FOUR server gates + TWO client entry points that must share one key; editing the deep-reveal path can silently break anon
metadata: 
  node_type: memory
  type: project
  originSessionId: f1a35aff-ac84-48ba-9cfd-7741bc45ecc4
---

SHIPPED 2026-07-13 (branch feature/polish): a logged-out onboarding user (`session === null`)
gets ONE free deep reveal, then a sign-up gate. Design: `docs/superpowers/specs/2026-07-13-anon-free-deep-reveal-design.md`; QA: `agentic_QA.md` (2026-07-13 feature-verification section).

**Non-obvious traps for anyone touching the deep-reveal / blunder path:**

- **Anon blunders are real DB rows keyed by `device_uuid` (user_id NULL), not a separate
  code path.** `blunders.user_id` is nullable + a `device_uuid` column (migration 058). They
  re-associate to `user_id` on `/api/user/migrate` by the CLIENT's `body.device_uuid` (mirrors
  the games trick — see [[project_games_dont_migrate]]). After migrate they behave like any
  signed-in blunder (Past Games, stats light up automatically because those are user_id-scoped).
  Anon dedup uses a SEPARATE partial unique index `idx_blunders_device_game_unique` (the
  `(user_id, game_id, move_index)` index does NOT dedup anon rows — NULL user_id is distinct).

- **FOUR server gates were relaxed for anon; the pure decisions live in
  `server/anonBlunderAccess.js` (unit-tested — index.js is not HTTP-harness-testable):**
  `/api/games/analyze` write (`resolveGameBlunderOwner`, stamps device_uuid from the fetched
  game row — NEVER compare device_uuid to req.user.id), `/api/coach/queue`
  (`resolveQueueOwner`, anon needs a valid `?device_uuid`), `/api/explain-move-llm` (anon
  allowed, quota via `resolveExplainQuota` so anon never touches `users.deep_reveal_count`;
  bounded by the pre-existing per-IP `makeLimit(5)`), and `/api/user/tts/deep-reveal` (anon
  allowed — position-hash-keyed, no user data). If you add a `req.user.` deref to any of these
  handlers, guard it (`req.user?.` ) or it 500s for anon.

- **The "1 free" gate has TWO client entry points that MUST share one key.** With approach (a)
  the reveal opens from `MistakeDetailScreen`'s trigger button AND `DeepRevealPane`'s fetch.
  Both call `canRevealAnon(`${movestring}:${col}`)` where movestring=`blunder.board_state||''`
  and col=`blunder.move_played`. The trigger was originally `session`-only and silently blocked
  anon at the SCREEN before the pane's gate ever ran (QA-fixed, commit aed72a9). If you add a
  third entry point or change the key in one place, change both — else re-opening the same
  revealed blunder stops being free, or a spent reveal reopens. Flag: `localStorage
  anon_deep_reveal_v1` (the first revealed key wins, idempotent; `src/lib/anonDeepReveal.js`).

- **Precondition for QA:** reset via Settings "Dev: clear IndexedDB & sign out" (session===null),
  NOT "Dev: skip auth" (that creates an AUTHENTICATED anon session and bypasses the logged-out
  path). See the app-qa `--feature` mode + precondition-aware auth step.

Known residuals (not bugs of this feature): opening-move (empty movestring) TTS 400s for ALL
users; anon review re-analysis re-burns the solver (cache-check still `if (req.user)` — deduped,
low impact, accepted).
