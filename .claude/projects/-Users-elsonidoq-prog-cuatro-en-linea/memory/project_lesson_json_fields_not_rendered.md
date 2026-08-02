---
name: project_lesson_json_fields_not_rendered
description: "Lesson JSON fields the learner UI never reads — socratic.goalPrompt, socratic.overlays, userPerspective — plus the ONE that stopped being dead (confirmationChallenges[].goalPrompt now renders AND narrates)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 7db608a0-3785-4c8f-94aa-9d6fe6577d1e
  modified: 2026-07-31T19:35:46.883Z
---

Several lesson JSON fields **look authoritative in the file and in the admin editor but are never read
by the learner UI**. Editing them to "fix" what a player sees is a no-op that passes every test — this
has now shipped twice (2026-07-24 and again in the QA follow-up, where a whole round of challenge-prompt
corrections landed in dead fields and were reported as fixed).

Verified at source 2026-07-25:

- **`confirmationChallenges[].goalPrompt` NOW RENDERS AND NARRATES — this bullet used to say the
  opposite** (changed 2026-07-30/31, spec 052 / Epic 6). It is a **per-lesson override** of the shared
  `coach.spoken.<category>.prompt.*` pool: present → the lesson's own text shows; absent → the shared
  random pool pick, unchanged. Its clip lives in `goalPromptAudio`/`goalPromptAudio_es`, path-addressed
  via the **lesson** (text-hash) scheme, *not* the key-based coach scheme. Two consequences: editing
  this field is no longer a no-op, and editing the text **orphans its clip** until you regenerate.

- **`socratic.goalPrompt` is still dead** — the interactive Socratic prompt comes from
  `socratic.messages.ask`. The two `goalPrompt` fields now behave **oppositely**; never reason about
  one from the other, and note `lesson-editor.md` had a Traps bullet asserting both were dead long
  after one stopped being so.

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
