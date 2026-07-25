---
name: project_lesson_json_fields_not_rendered
description: "Lesson JSON fields the learner UI never reads — goalPrompt (socratic + challenges), socratic.overlays, userPerspective — and the shared coach.spoken.<category> copy that must stay outcome-neutral"
metadata:
  type: project
---

Several lesson JSON fields **look authoritative in the file and in the admin editor but are never read
by the learner UI**. Editing them to "fix" what a player sees is a no-op that passes every test — this
has now shipped twice (2026-07-24 and again in the QA follow-up, where a whole round of challenge-prompt
corrections landed in dead fields and were reported as fixed).

Verified at source 2026-07-25:

- **`socratic.goalPrompt` and `confirmationChallenges[].goalPrompt` are never rendered.**
  `ChallengeScreen.jsx:116-118` builds its prompt from the shared i18n keys
  `coach.spoken.<category>.prompt.{0,1,2}` and picks one at **random**; `goalPrompt` appears nowhere in
  the file. The socratic prompt likewise comes from `socratic.messages.ask`, not `goalPrompt`. To change
  what a player reads, edit **i18n** (challenges) or **`socratic.messages`** (socratic).
  Note `lesson-editor.md` documents `goalPrompt_es` as a localization target — that is true of the
  editor and the loader, and irrelevant to the learner.

- **`socratic.overlays` is ignored.** `SocraticScreen.jsx:151` *derives* its overlays
  (`win` ring on the dropped cell at `correct`, on the correct cell at `wrong2`) and never reads
  `lesson.socratic.overlays` (`grep -c` → 0). The **admin editor does render them**, so authoring and
  learner surfaces disagree: an authored marker sitting on the answer cell looks like a spoiler in the
  editor and is invisible in the app. Slide (`slides[].overlays`) overlays *are* rendered — this is
  socratic-only.

- **`userPerspective` does not decide the socratic learner's color.**
  `SocraticScreen.jsx:96`: `const color = lesson.socratic.movestring.length % 2 === 0 ? 'red' : 'yellow'`
  — **movestring length parity** decides it (even → P1/GREEN, odd → P2/GRAY). A lesson whose
  `userPerspective` contradicts its movestring parity renders the parity answer. Copy that says
  "you play the gray discs" must be checked against the movestring, not the field.

**`coach.spoken.<category>.*` is shared by every puzzle in that category**, including DB-drawn practice
boards — not just the lesson's board. So this copy must be **outcome-neutral** ("stay out of that
column"), never board-specific ("Gray is winning here"), or it becomes false on the practice puzzles.
It must also match the **grader's** accepted direction: `evalUndercut` (`predicates.js`) marks the
*killing* column **wrong**, so "find the undercut" instructed players into a Blunder verdict.

**How to apply:** before editing lesson copy, grep the screen that renders it (`ChallengeScreen`,
`SocraticScreen`, `ConceptScreen`) for the field name. If the screen never reads it, the fix belongs in
i18n or `socratic.messages`. Rendering ground truth table: `docs/lesson-content-critique-2026-07-22.md`
Part 0. Related: [[project_lesson_interactivity_evaluation]], [[project_lesson_progression_audio_traps]],
[[feedback_verify_at_the_source_layer]].
