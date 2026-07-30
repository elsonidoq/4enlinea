# Epic 6 — epic_critique output (verbatim)

## Blocking issues

**1. The `lesson.<id>.title` migration (US6.2) is under-specified and is contradicted by a decision written into the code — a spec built on the epic alone will silently destroy the Spanish lesson titles.**

Settled decision 1 says lesson content must live in the lesson JSON, and US6.2 says "migrate `lesson.<id>.title` to the lesson JSON as the single authority." Measured in the working tree today:
- `connect-four/src/i18n/en.json` and `es.json` each hold 15 `lesson.<id>.title` entries, and **es.json is the only place Spanish titles exist** (`immediate-threat` → "Amenazas Inmediatas", etc.).
- **0 of 15** `connect-four/lessons/*.json` have a `title_es` field.
- `connect-four/server/lessonLoader.js:282-283` carries the opposite decision in a comment: *"`title` is deliberately excluded — `lesson.<id>.title` in en/es.json already owns it via `t(..., {defaultValue: lesson.title})`, and a `title_es` would silently lose to it."*
- Three consumers use the `t()` + `defaultValue` form: `ConceptScreen.jsx:183`, `SagaScreen.jsx:114`, `SocraticScreen.jsx:201`.

US6.2's 7 tasks never mention `title_es`, never mention reversing the `lessonLoader` exclusion, and never mention the three call sites. There is also a **direct contradiction with US6.3**, which says "extend the static scan to i18n lesson titles" (OI-63 item 3) — those keys are exactly what US6.2 deletes.

Recommendation: rewrite US6.2 to spell out the full migration — add `title_es` to all 15 lesson JSONs (copying the existing es.json strings verbatim, not re-translating), remove the `title` exclusion in `lessonLoader.js:282-283` so `assignLocalized` handles it like every other `_es` field, convert the three call sites to read `lesson.title` directly, then delete the 15 keys from both locales. Add an explicit story-ordering note that US6.2 runs before US6.3, and restate US6.3's scan target as "lesson JSON `title`/`title_es`", not "i18n lesson titles." Alternative (weaker): keep i18n as the title authority and record the reversal of Settled decision 1 for this one field — but that contradicts the owner's 2026-07-16 ruling and should not be chosen silently.

**2. OI-44's `goalPrompt` facts are stale, and the real deletion scope is roughly 3× what the epic states.**

The epic (quoting OI-44) says `socratic.goalPrompt` is authored in "9 of 13 lesson JSONs (English only — no `goalPrompt_es` anywhere)". Measured now:
- **15 of 15** lesson JSONs contain `goalPrompt`; **13 of 15** contain `goalPrompt_es` (the 2026-07-25 Spanish pass translated them).
- The dead field is not only socratic: `docs/architecture/lesson-editor.md:352` lists **`confirmationChallenges[].goalPrompt` (+ `_es`)** as equally dead, and `lessonLoader.js` has **two** localization branches (lines 369-370 and 391), not one.
- There is a **live admin authoring control** at `src/components/admin/SocraticEditor.jsx:93-94` that writes the field, plus round-trip preservation logic in `src/lib/lessonPayload.js:26`. Memory `project_lesson_slide_field_wiring` warns the SlideEditor-family control is the wiring point forgotten every time.

So "delete it plus its `localizeLesson` branch" (one task) actually means deleting ~28 authored fields including reviewed Spanish translations, two loader branches, an editor control, and the `lesson-editor.md` row. Recommendation: update the epic's Non-obvious facts with the measured numbers, expand the US6.2 task into an enumerated wiring-point list, and make the delete-vs-wire call explicitly (see Decisions).

**3. The KB `short_summary_es` scope (US6.5) is stated against a wrong entry count and a wrong eligibility rule, which mis-sizes the story.**

The epic says "audit which of the **45** KB entries lack `short_summary_es`." Measured: `docs/knowledge-base/` holds **47** concept entries (49 `.md` files minus `README.md` and `_sketches.md`), mirrored to `connect-four/server/kb/`. But `server/kb/README.md:67` states the real eligibility rule: *"Only entries with a real `.md` file AND a populated `short_summary` are eligible to appear in KB term popups."* Only **26** entries have `short_summary` at all, and only **4** have `short_summary_es` (`allis-claimeven`, `community-double-threat`, `community-figure-7`, `community-immediate-threat`). The actual translation backlog is **22 entries**, not 41-45 — and the 21 entries with no English `short_summary` are out of scope entirely because they never render in a popup.

Recommendation: restate US6.5's KB task as "22 entries with a populated `short_summary` but no `short_summary_es`," name the eligibility rule and its citation, and note that both `docs/knowledge-base/` (source) and `connect-four/server/kb/` (synced copy) must end in agreement via `npm run sync-kb`. Given US6.5 also carries the `PlayOnlineScreen` fix, a full literal sweep, the OI-73 guard and the two OI-62 edits, consider splitting the 22-entry translation batch into its own story — the epic would then have 6 stories, which the sizing rule allows by precedent (Epic 1 already runs 6).

## Decisions required

**1. `socratic.goalPrompt` / `confirmationChallenges[].goalPrompt`: delete or wire up?**

Background: `goalPrompt` is a per-lesson "here's your task" line authored in every lesson file and editable in the admin editor, but no learner screen ever displays it — the real challenge prompt comes from a shared, randomly-chosen i18n phrase (`ChallengeScreen.jsx:116-118`), and the Socratic prompt comes from `socratic.messages.ask`. The epic assumed this was untranslated English filler; it is now 13 lessons' worth of reviewed Spanish copy plus a live editor control.

- **Option A — delete.** Remove the field, both `_es` siblings, both `lessonLoader` branches, the `SocraticEditor` control, and the `lesson-editor.md` row. Cleanest, but discards translated content and removes an authoring affordance someone deliberately used.
- **Option B — wire it up.** Render the authored `goalPrompt` in place of the shared random prompt, making the per-lesson prompt authoritative. Recovers the content, but changes learner-visible copy on every lesson and its confirmation challenges, which is arguably new product work.
- **Option C — keep as-is, documented.** Leave the field, record that it is a reserved/unrendered authoring field.

Recommended default: **A (delete)**. Option B changes learner copy across all 15 lessons, which "Writing new lessons or re-tiering the curriculum" is meant to keep out of this epic; the Spanish strings are recoverable from git if the prompt is ever revived.

**2. Capsule tinting fix: below-the-discs or outline-only?**

Background: lesson slides can draw translucent coloured "capsules" over a group of board cells to highlight a four-in-a-row window. They render above the discs (`Board.jsx:173`, `zIndex: 2`, `opacity 0.4`), so an amber capsule over a gray disc reads brown — bad on any slide whose teaching point is disc colour. Opacity cannot go lower; 0.4 is already the visibility floor.

- **Option A — outline-only** (capsule border, no fill), matching the already-settled z-threat badge spec at `docs/architecture/frontend-conventions.md:337-342`: *"Outline only, not fill — pieces inside the capsule stay visible."*
- **Option B — drop the capsule below the discs.** Preserves the filled "highlighter" look but the fill is then mostly hidden behind the discs it is meant to group.

Recommended default: **A (outline-only)** — it is the same visual problem the project already decided once, so it keeps the two overlay families consistent and avoids reopening a settled spec. Either way the fix must be re-checked against all **48** authored windows (count verified in the working tree) in a browser, since it is not covered by any DOM test.

## Handoff context

**Systemic issues affecting the whole epic.** Every stale claim I found points the same direction: the epic was written before the 2026-07-25 Spanish content pass fully landed, so it consistently *understates* how much translated content its cleanup tasks would touch (titles, `goalPrompt`, and by extension the KB summaries). A fix agent should re-measure any count in the epic before writing it into a spec — and should assume "English only" claims are now false. Second systemic gap: the epic describes *what* to change but not the *wiring points* — this repo's own memory (`project_lesson_slide_field_wiring`) says a lesson-field change has ~6 wiring points and the admin editor control is missed every time. US6.2 and US6.3 both need enumerated wiring lists rather than one-line task summaries.

**Reviewer frame.** I weighted the working tree above every document, per the handoff instruction and `CLAUDE.md`'s "verify at the source layer": signatures, JSON field counts and grep counts, not doc prose. Where code and doc disagreed I treated the code as truth and the disagreement as the finding (that is exactly how blocker 1 surfaced — `lessonLoader.js:282-283` contradicts Settled decision 1). Of the epic's authoritative sources, `lesson-editor.md` §"Fields the learner UI ignores" was the most load-bearing, because it is the only place that documents `confirmationChallenges[].goalPrompt` as dead too. I read `open_issues.md` for OI-46/44/68/69/63/73/19/38/62/72 in full.

**Non-obvious intent a fix agent should know.** The epic's Settled decision 1 ("lesson content is a thing in itself") is an owner ruling, not a technical preference — do not resolve blocker 1 by keeping titles in i18n just because that is less work. The `find_lesson_boards.mjs` / `verify_lesson_content.mjs` hardening (US6.3) is genuinely as described: neither file wraps `solver.query` (verified — bare calls at `verify_lesson_content.mjs:42,51`), `find_lesson_boards.mjs` has zero `--help` handling, and `REMEDIATED` in `tests/unit/lessonContent.test.js:23-38` does contain all 15 lesson ids, so it exempts nothing today exactly as claimed. Those facts held up; only the content-related ones went stale.

**One concrete gap I folded into handoff rather than flagging as blocking.** US6.1 requires a DOM test that the `correct` message renders after a solve, but `npm run test:dom` is a **hand-enumerated file list** in `package.json:14`, not a glob, and there is no `SocraticScreen` DOM test today. A new test file that is not added to that list runs nowhere and the suite still goes green. Worth one sentence in the spec.

**What I did not flag and why.** (a) `socratic.overlays` and `userPerspective` are documented as equally dead alongside `goalPrompt`, but OI-44 scopes only `goalPrompt` and pulling them in would inflate the epic — out of scope by design. (b) The acceptance criterion "lesson audit still 39/39" refers to `server/scripts/audit_answer_ambiguity.mjs`; the criterion never names the command, which is a small clarity nit, and I could not re-measure it without a solver run. (c) I did not re-verify the Epic 5 audio dependency behind "shows **and speaks** the `correct` message" — the previous reviewer already flagged it, and my measurements confirm nothing that changes their assessment. (d) `lesson-editor.md:451` ("that is Epic 6 scope", about confirmation-challenge puzzle existence) refers to the older lesson-editor epic numbering, exactly as the handoff warned — I confirmed the sentence is still there and left it alone.
