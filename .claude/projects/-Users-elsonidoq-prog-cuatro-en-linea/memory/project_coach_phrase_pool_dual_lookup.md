---
name: project_coach_phrase_pool_dual_lookup
description: "One phrasePoolKey drives TWO i18n lookups (coach.spoken.* AND eval.*.summary); eval.* covers only 6 keys, so adding a coach tag ships half the surface silent — and the parity test is presence-only"
metadata: 
  node_type: memory
  type: project
  originSessionId: cf828755-9e4e-494f-af5d-0bf5e4bb986a
  modified: 2026-07-30T19:34:07.293Z
---

**Before adding a tag to the live coach's vocabulary, know that one key feeds two independent
translation lookups.** In `evaluateMoveHandler.js` the single `phrasePoolKey`
(`category || patternTag`) is used for **both**:

- `coach.spoken.<key>.<quality>` — the spoken line, and
- `eval.<key>.<quality>.summary` — the written summary line.

Authoring only the first is the default mistake, because nothing errors. Measured 2026-07-30:
`eval.*` exists for **6 keys only** (`immediate_threat`, `forced_block`, `double_threat`,
`claimeven`, `z_threat`, `forbidden_columns`), while `coach.spoken.*` is complete in **both**
locales for those plus `figure_7`, `j_shape`, `undercut`, `overcut`, `odd_even_threat`. So five
tactics already ship with a spoken line and **no** summary line — not a regression (the
`best_move`/`suboptimal_move`/`drawing_move` fall-throughs they replace have no `eval` pool either),
but it means "the phrase pool exists" is only ever half-true unless you check both families.

**`tests/unit/i18nKeyParity.test.js` will not catch it either way, twice over.** It walks the whole
en/es tree via `getNestedKeyPaths`, so it *does* cover `coach.spoken.*` — but it compares **key
presence only**. An English string pasted verbatim into `es.json` passes, and a key missing from
*both* locales passes trivially. Presence parity is neither translation parity nor coverage.

**How to apply:** when adding or renaming a coach tag, decide *explicitly* per tag whether the
`eval.*` summary is authored or intentionally out of scope, and record the choice — an unrecorded
gap reads as an oversight later. Same rule for a new key introduced by a taxonomy change (spec 052's
`forfeited_win`). See [[project_spanish_output_silent_fallback]] for the register rule (Argentinian
voseo) that applies to every Spanish string you add, and
[[project_coach_creation_transition_gate]] for the `category`-shielding of the key itself.

Related: [[project_drawing_move_mislabels_wins]], [[project_lesson_progression_audio_traps]].
