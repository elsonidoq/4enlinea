---
name: project_coach_creation_transition_gate
description: "classify() double_threat uses LOOSE Case B (≠ strict detectDoubleThreat); coach falsely repeats \"you created X\" on persisting patterns — transition-gating fix designed, NOT yet shipped"
metadata: 
  node_type: memory
  type: project
  originSessionId: 976d5ff4-777c-4bab-9080-20c2287ce6e8
---

Two traps around `classify()`'s creation-pattern detection (`connect-four/server/classifier.js`):

**1. Loose vs strict double-threat Case B (TRUE NOW).** `classify()`'s INLINE `double_threat`
check uses **loose** Case B — ANY two consecutive-row reachable threats in a column → `double_threat`.
The exported `detectDoubleThreat()` (used by `classifyPattern`/`tagBlunder`) uses **strict** Case B —
the lower threat must ALSO sit at the gravity-top. They are NOT interchangeable: swapping `classify()`
to `detectDoubleThreat()` makes `3333344044114` col0 stop being `double_threat` (verified). Don't
"DRY them up" without re-validating the full `classify() double_threat` fixture set in
`tests/classifier/classifier.test.js`.

**2. Coach falsely repeats "you created the double threat" (open bug; fix designed, NOT shipped).**
`classify()` tags `double_threat`/`forced_win` as pure post-move geometry — it never checks whether the
pattern was ALREADY present pre-move. So the live sparring coach re-praises a *persisting* double
threat / forced win on every subsequent move. Repro: `3344000000111151` col3 — P1 already holds a
standing double threat (0-idx cols 2 & 6) and plays an unrelated optimal developing move, yet the coach
says "you created the double threat." **Approved fix** = transition-gate (praise only on absent→present,
both from the mover's perspective) in `classify()` ONLY. Design:
`docs/superpowers/specs/2026-07-14-coach-creation-pattern-transition-design.md`; plan:
`docs/superpowers/plans/2026-07-14-coach-creation-pattern-transition.md`. Scope EXCLUDES the AI-move /
puzzle paths (`classifyAiMove`/`classifyPattern`) and `figure_7`+siblings, which are never emitted on
live user moves (see OI-30 in `docs/open_issues.md`). When implemented, a suppressed tag falls through
to `best_move` → no `coach.*` pool → frontend speaks `coach.generic.<quality>` (existing fallback in
`src/lib/useGameBoard.js`). No API/frontend change needed.

Cross-ref: [[reference_classify_vs_classifyPattern]], [[project_classifier_architecture]].
