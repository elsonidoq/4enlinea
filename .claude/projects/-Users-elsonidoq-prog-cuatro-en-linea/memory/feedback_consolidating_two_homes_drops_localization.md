---
name: feedback_consolidating_two_homes_drops_localization
description: "Deleting the \"duplicate\" of a two-homed string can delete the only thing localizing it — check what the home you're removing was silently DOING, not just what it stored"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 7db608a0-3785-4c8f-94aa-9d6fe6577d1e
  modified: 2026-07-31T19:36:40.202Z
---

**Trigger: any "consolidate to one source of truth" migration where the home being deleted is an i18n
bundle, a locale file, or anything else that varies by user context.**

Worked case (spec 052 / Epic 6, 2026-07-30). Lesson titles lived in two places: `lesson.<id>.title` in
`en.json`/`es.json`, and `title` in each lesson JSON. The standing rule "lesson content is a thing in
itself, not assembled from i18n keys" said to delete the i18n copy. That was done — three call sites
switched to `lesson.title`, all 15 `lesson.<id>` objects removed from both locale files.

**14 of 15 lesson titles then rendered in English for Spanish learners.** The deleted `es.json` entries
were not duplicates at all — they were real translations ("Amenazas Inmediatas", "Yo Juego Donde Vos
Jugás"). The lesson JSON had only an English `title` and `localizeLesson` deliberately skipped `title`.
Nothing threw. Every test passed, including the new title test, which mounted with **empty i18n
resources and only ever asserted English**. It took an explicit code review to catch.

**The generalisable shape: a rule can outlive its own justification.** The spec's rule was "do NOT
localize `title`; no `title_es`", justified by *"the i18n key already owns titles and a `title_es`
would silently lose to it."* That justification was true — right up until the same migration deleted
the key. The rule survived; its reason didn't. Nobody re-read the *because* clause.

**How to apply:**
- Before deleting a "duplicate" home, ask what that home was **doing**, not just what it stored.
  Locale files localize. Config layers override. A DB column may be the only writable one. "Duplicate"
  is a claim about behaviour, not about the value being equal today.
- Diff the two homes **per locale / per environment**, not just in the default one. Equal in `en` and
  different in `es` is exactly the case that bites.
- When a spec states a rule *with* a justification, verify the justification still holds in the world
  the change creates. If the change kills the reason, the rule is up for renegotiation — surface it
  rather than following it off a cliff.
- A test that mounts with empty/default i18n resources proves the string isn't i18n-sourced; it proves
  **nothing** about whether it's correctly localized. Assert the non-default locale explicitly.

Related: [[project_spanish_output_silent_fallback]] (the same silent-English failure mode, from the
adding side), [[feedback_verify_at_the_source_layer]], [[feedback_wrong_test_is_part_of_the_bug]].
