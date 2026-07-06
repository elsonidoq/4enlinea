---
name: project_coach_voice_opening_defeatist_gap
description: "RESOLVED (D34) — L3/L7 defeatist text rewritten to hold-the-line; editing causalLinks link.text ripples to 4 verbatim-asserting test files + a stale grader note"
metadata:
  node_type: memory
  type: project
  originSessionId: 75595182-c6df-4cf2-a16e-dbf51806b74d
---

**RESOLVED 2026-07-06 (D34, branch `opening-theory`).** The former OPEN gap — grounded-render
`render_decision.link.text` telling a player-2 opening board *"You were already losing … Neither move
wins"* — is fixed. L3 and L7 in `causalLinks.mjs` no longer emit defeatist bookends; keyed on the mover
being lost (`case=lose_to_faster_lose`, a SUPERSET of player-2-opening, so it also covers lost player-1
mid-games) they now lead with the practical-resistance frame (name the better column, "toughest/most
stubborn defense", "makes your opponent work hardest", keep the swindle alive). Same pass added a
`TAG_PHRASE`/`plainTag` C4-vocabulary layer (no raw tactic slug in player text) and a
`mechanism`-is-the-only-player-facing-field register contract. Full rationale: [[reason-DECISIONS]] D34;
catalog texts in [[reason-render-grounded-prompt]] updated. NO vector/schema change; `select_boards.mjs`
untouched. See also [[project_reason_render_layer]], [[project_opening_defender_reason_gap]].

**Durable gotcha — editing `causalLinks.mjs` link/template text is a lockstep change.** The link text
is a single source of truth asserted **verbatim by 4 test files**: `causalLinks.test.mjs`,
`causalLinksComposers.test.mjs`, `reasonRealizedDenied.test.mjs`, and `reasonRenderFixes.test.mjs`. The
last asserts against the **assembled prompt string** and *splits it on the literal section header*
(`# Internal evidence fields`, renamed from `# Vector facts` in D34) — so renaming a header in
`renderReasonModel.mjs` `assembleGroundedPrompt` silently breaks a test that greps the old header.
`grep` the exact wording across `server/tests/` before changing any template, run `npm run test:fast`
(833 tests), and a corpus guard (scan every rendered frame for defeatist wording / raw slug) is cheap
and catches regressions the unit tests miss.

**Stale grader note (not yet fixed).** The `grade-fv-sufficiency` SKILL still says *"A5b render_bug is
the expected bucket for this vector today."* After D34 the render is clean, so any residual defeatism
would correctly bucket `prompt_confusion`, not `render_bug`. Update that aside next time the grader is
touched (the reason-engine discipline in [[feedback_reason_case_requires_eval_and_grader]] wants grader +
engine in sync). Related pedagogy: [[feedback_pedagogy_preferences]].
