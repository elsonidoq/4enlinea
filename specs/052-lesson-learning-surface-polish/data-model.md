# Data Model: Lesson Learning Surface & Authoring Polish (spec 052)

This spec introduces **no new database tables or columns**, and **no new API endpoints or response
fields** — every field this plan reads (`lesson.title`, `socratic.goalPrompt`,
`confirmationChallenges[].goalPrompt`) already exists in the lesson JSON schema and is already
served by `GET /api/lessons/:id` / `GET /api/lessons`. This document instead pins the **client-side
and tooling-side shapes** this spec's stories touch, since they are the closest thing to a contract
here.

## Entity: Lesson (JSON file, `connect-four/lessons/lesson-NN-slug.json`)

Existing entity (`docs/architecture/lesson-editor.md`). This spec changes which fields are
**authoritative** for two purposes and adds one field-level annotation.

| Field | Before this spec | After this spec |
|---|---|---|
| `title` (string) | Authoritative *only in the editor*; the learner-facing app instead reads `lesson.<id>.title` from `en.json`/`es.json` via `t(..., {defaultValue: title})`, with `SocraticScreen` defaulting to `''` instead of `title` on a missing key. | **Sole authority** for every learner-facing screen. No i18n key involved. All three call sites (`SocraticScreen.jsx`, `ConceptScreen.jsx`, `SagaScreen.jsx`) read `lesson.title` directly. |
| `socratic.goalPrompt` / `goalPrompt_es` | Authored, localized by `localizeLesson`, never rendered. | **Unchanged — still never rendered.** Documented in `lesson-editor.md` as intentionally dead: `socratic.messages.ask` already serves the per-lesson-prompt role for the interactive Socratic phase. |
| `confirmationChallenges[].goalPrompt` / `goalPrompt_es` | Authored, localized, dropped by `ChallengeScreen`'s inline-challenge mapping before it ever reaches the prompt-selection logic. | **Rendered**, as an override of the shared `coach.spoken.<category>.prompt.*` pool, when present and non-empty for the puzzle currently on screen. Falls back to the existing shared-pool random pick when absent. The override changes the **displayed** text only — see "Entity: Coach-speech ref pair" below for why the **spoken** clip must be independently silenced, not swapped. |
| `overlays[].{c,r,type}` | `_overlayIntent` is a **per-slide** opt-out (`slide._overlayIntent: "annotation"`), applying uniformly to every overlay on that slide. | `_overlayIntent` gains a **per-overlay** override: `{c, r, type, _overlayIntent?: "annotation"}`. Settled: slide-level `_overlayIntent` stays as the inherited default; a narrower per-overlay value overrides it where present. A slide mixing annotation and threat overlays can now opt individual cells out. No migration needed — the 6 existing slide-level usages (`lesson-01`, `lesson-02`, `lesson-07`, `lesson-08` ×4, `lesson-09`) fall through to the unchanged default and require no edit. |

No other lesson JSON fields change shape.

## Entity: Puzzle object (in-memory, `ChallengeScreen.jsx` lesson mode)

The object `confirmationChallenges.map(...)` builds today (in `ChallengeScreen.jsx`'s lesson-mode
puzzle loader):

```js
// Before
{
  id: ch.puzzleId || `inline-${ch.moveString}`,
  category: confirmationCategory,
  move_string: ch.moveString,
  interaction_mode: ch.interactionMode || 'single_move',
  highlight_metadata: ch.highlightMetadata ?? null,
  correct_col: ch.correctCol,
  user_player: ch.userPlayer,
}
```

```js
// After — one added field
{
  id: ch.puzzleId || `inline-${ch.moveString}`,
  category: confirmationCategory,
  move_string: ch.moveString,
  interaction_mode: ch.interactionMode || 'single_move',
  highlight_metadata: ch.highlightMetadata ?? null,
  correct_col: ch.correctCol,
  user_player: ch.userPlayer,
  goal_prompt: ch.goalPrompt ?? null,   // NEW — already locale-resolved server-side
}
```

A bare DB-drawn puzzle row (non-lesson path) never has a `goal_prompt` field, so the `?? null` /
"present and non-empty" check at the prompt-selection call site is structurally sufficient to keep
the shared pool outcome-neutral for every non-lesson caller (FR-008) — no separate flag is needed
to distinguish "lesson puzzle with no override" from "DB puzzle."

## Entity: Coach-speech ref pair (in-memory, `ChallengeScreen.jsx`)

This is the shape the previous section's "one added field" framing omitted, and the reason FR-029
exists. `initPuzzle` sets **two** refs from the same picked prompt key, not one:

```js
// ChallengeScreen.jsx — initPuzzle (currently lines 123-127)
promptKeyRef.current = pickedKey;
...
lastCoachKeyRef.current = pickedKey;
setCoachMessages([{ text: t(pickedKey), mood: 'happy', ... }]);
```

```js
// ChallengeScreen.jsx — narration effect (currently lines 202-207)
useEffect(() => {
  if (lastCoachKeyRef.current) speakCoachMessage(lastCoachKeyRef.current);
}, [coachMessages.length]);
```

`speakCoachMessage` (`src/lib/useCoachSpeech.js:188+`) is **strictly key-based**:
`keyToSlug(key)` → manifest lookup → a pre-generated mp3. It has no text-to-speech fallback and
cannot speak arbitrary override text. `promptKeyRef` and `lastCoachKeyRef` are two separate refs
holding the same value at init time, but only `lastCoachKeyRef` drives narration — a fix that
overrides the *displayed* text (`coachMessages[0].text`) without touching `lastCoachKeyRef` leaves
the *spoken* clip pointed at the original `pickedKey`, i.e. the generic, now-superseded prompt.

**Shape after this spec's fix**: at the same call site that decides the displayed text, when a
`goalPrompt` override is used, `lastCoachKeyRef.current` MUST be set to `null` instead of
`pickedKey`. `promptKeyRef` is unaffected (it is not read by the narration effect). This is a
one-line addition to the override branch, not a new field or a new ref — but it is a distinct write
site from the display-text write site, which is exactly what made it easy to miss.

| Ref | Written by | Read by | Effect of a `goalPrompt` override |
|---|---|---|---|
| `promptKeyRef` | `initPuzzle` | (not read by narration) | Unaffected — out of scope for FR-029 |
| `lastCoachKeyRef` | `initPuzzle`; the override branch (this spec) | narration effect → `speakCoachMessage` | Set to `null` when an override renders, so no clip plays |

## Entity: Verification matcher (`server/scripts/find_lesson_boards.mjs`, `SPECS`)

No shape change to the object each `SPECS[name]` function returns. This spec adds:
- A doc-comment above each matcher stating its production detector and side (or "no single
  detector — hand-rolled geometry check modeling <shape>" where that's the honest answer, e.g.
  `overcut_active`/`overcut_shared_cell` today).
- A `--help` code path in `main()` that never constructs a `SPECS` entry or a solver process.

## Entity: `docs/open_issues.md` entries

No schema — free-form markdown per existing convention (`**Status**: ...`, body, `**If picked
up**:` / dated `**UPDATE**:` blocks). This spec's closeout writes follow the existing format
exactly; see `research.md` §"Cross-cutting: OI-N closeout mechanics" for which entries and what
status each lands on.

## Entity: i18n key tree (`src/i18n/en.json`, `es.json`)

- **Removed**: `lesson.<id>.title` for all 15 current lesson ids (US2).
- **Added**: `playOnline.title` (or equivalent key name chosen at implementation time) replacing
  `PlayOnlineScreen.jsx`'s two hardcoded `"Play Online"` literals, plus keys for any other literal
  found by the US5 sweep (US5).
- **Guarded, not schema-changed**: a new test assertion (not a new key) that no lesson `id` collides
  with the reserved `lesson.*` sub-keys (`node`, `confirmation`, `windowCounts`, and any others
  discovered at implementation time) (OI-73/FR-025).

## Entity: Knowledge-base entry (`docs/knowledge-base/<id>.md`)

No schema change. Two content-field edits within the existing frontmatter schema
(`docs/knowledge-base/README.md`'s documented fields):
- `allen-j-configuration.md`: `worked_examples[].solver_verified` field value only (from `PENDING`
  to a verification date), for the `3334434` example.
- `community-figure-7.md`: a `known_limitations` or `notes` addition (body prose, per the existing
  schema's body-field convention) noting the `gravity_top_count >= 2` filter is dead code for
  same-column adjacent-row threats.

No new KB entries. `short_summary_es` bulk population is explicitly deferred (Assumptions,
Deferred section of spec.md) — no field values are added here beyond the two OI-62 edits above.
