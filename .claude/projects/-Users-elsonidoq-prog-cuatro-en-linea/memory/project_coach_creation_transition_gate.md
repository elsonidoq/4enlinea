---
name: project_coach_creation_transition_gate
description: classify() double_threat/forced_win fire only on absent->present transition; two loose/strict double-threat predicates coexist
metadata: 
  node_type: memory
  type: project
  originSessionId: 746f6892-a180-4223-b740-e03e252ce6fd
---

`classify()` (server/classifier.js, live user-move coach path) tags `double_threat` and
`forced_win` **only when the move creates them** (present on post-move board AND absent on
pre-move board, from the mover's perspective) — not on mere presence. This stops the coach
repeating "you created the double threat" while a pattern persists across moves.

**Trap:** there are now TWO double-threat predicates that differ in Case B. Private
`hasDoubleThreat(board, player)` (used by `classify()`) uses LOOSE Case B (any two
consecutive-row reachable threats). Exported `detectDoubleThreat()` (used by
`classifyPattern`/`tagBlunder`) uses STRICT Case B (lower threat must be gravity-top). They are
NOT interchangeable — swapping `classify()` to `detectDoubleThreat()` breaks `3333344044114`
col0 (stops being double_threat). Don't "dedupe" them without re-validating.

**Out of scope / see also:** AI-move path (`classifyAiMove`/`classifyPattern`) is NOT
transition-gated; `figure_7` & other multi-tag tactics never fire on live user moves — [[OI-30]].
Design: docs/superpowers/specs/2026-07-14-coach-creation-pattern-transition-design.md.

**`classify().tag` has FIVE production consumers, not just the coach** — the transition change
now shifts a persisting-pattern move's tag `double_threat`/`forced_win` → `best_move`/etc. in ALL
of them (same direction, low-severity). Coach pools are `category`-shielded (`evaluateMoveHandler.js`,
`/api/evaluate-move/inline` `phrasePoolKey = category || patternTag`), but the raw tag is surfaced
UNSHIELDED in three places: `POST /api/explain-move` (`patternTag`, no category), `/api/evaluate-move/inline`'s
response `patternTag` field, and `GET /api/admin/scores` (`classifier_tags`, localhost-only). Plus
`candidate-generator.js:607` puts `cls.tag` in puzzle-gen metadata — and its test is excluded from
`npm run test:fast`, so that consumer is NOT covered by the fast suite ([[OI-33]]).

**Status: SHIPPED 2026-07-14** (commits 7be5c7f double_threat, 0393258 forced_win). Verified
end-to-end: `classify()` four-case fixture set (persisting DT/FW → best_move/suboptimal_move,
created DT/established FW → double_threat/forced_win) all pass; `POST /api/explain-move`
(server/index.js:1091, a second `classify()` consumer with no `category` override) manually
re-checked post-fix and returns `best_move`/"Column 4: best move." for the persisting-DT fixture
— no more false "created a double threat" claim. `npm run test:fast` 1265/0 green.

**Trap hit while verifying Step 3 (explain-move):** `explanation_cache` is keyed by
`sha256(moves:candidateCol)` + locale, independent of `patternTag`/`scores` — a row cached
BEFORE this fix shipped will keep serving the stale pre-fix `patternTag`/`oneLiner` forever,
making the fix look broken even though `classify()` itself is correct. The persisting-DT fixture
(`3344000000111151` col3) had exactly such a stale cached row on the local dev Supabase
(`explanation_cache`, position_hash `b758df4d9a9d5c5e693c56edb8fab6c5a7d7caea64d6d289e5f33844e1b4023e`,
locale `en`) from earlier design-phase testing; deleting it before curling `/api/explain-move`
was required to observe the corrected response. When manually verifying any `explain-move`
change, always confirm no matching cache row exists first (or delete it) — a clean `classify()`
result is not sufficient proof the endpoint is fixed.

Cross-ref: [[reference_classify_vs_classifyPattern]], [[project_classifier_architecture]].
