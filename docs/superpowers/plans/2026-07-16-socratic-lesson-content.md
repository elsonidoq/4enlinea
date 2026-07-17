# Socratic coach text → lesson content


---

## Context

In lesson 1, arriving at the Socratic board shows a coach bubble reading *"Voy a cometer un error aquí. Mirá si podés castigarlo."* — and **no speech plays**. It is silent in English too; this is not a Spanish-only bug.

The string is not lesson content. It lives in `src/i18n/<lang>.json` under a top-level `socratic.*` namespace and is rendered client-side by `SocraticScreen`. That places it outside **both** TTS pipelines:

| Pipeline | Selects work by | Sees socratic? |
|---|---|---|
| Coach TTS (`scripts/generate-tts.js`) | `flattenKeys(enRaw, 'coach.spoken.')` | No — wrong namespace. |
| Lesson TTS (`server/lessonAudio.js`) | `lesson.slides[].coachMessages[]` | No — never walks `lesson.socratic`. |

**Owner's decision (settled):** lesson content is a thing in itself and must not be assembled from i18n keys. The Socratic text moves *into* the lesson JSON, adopting the same `text` / `text_es` / `audio` / `audio_es` shape already used by `slides[].coachMessages`. Not a new concept — the existing one reaching one more place.

**Outcome:** the Socratic bubble narrates in both languages, driven by the same content-addressed lesson-audio pipeline that already voices concept slides.

### Two facts that make this cheap (both verified)

1. **The Spanish already exists.** All five generic `socratic.*` strings and all three lesson overrides are already translated in `es.json`. Contrast the slides: only 4 of 50 `coachMessages` have `text_es`. This ships Spanish Socratic voice with zero translation work.
2. **Duplication is nearly free.** Audio is content-addressed by `sha256(text).slice(0,16)`, so 12 lessons carrying the identical `wrong2` string share **one** mp3. Cost is one file per *unique* string, not 13×.

---

## Corrections to the brief

Verified at source this session. Three items drifted.

> ### ⚠️ CORRECTED — it is **12** lessons, not 13
> `lesson-04-odd-rows-belong-to-red.json` has **`"socratic": null`**. `validateLesson` explicitly permits this (`if (lesson.socratic !== null && (typeof lesson.socratic !== 'object' …)) return 'invalid field: socratic (must be object or null)'`), and `ConceptScreen.handleContinue` gates on `else if (lesson.socratic != null)`, so lesson 4 never reaches the Socratic screen. **The migration touches 12 lesson files.** Any task or test asserting "13" is wrong.

> ### ⚠️ CORRECTED — the `Could not find` grep does not work
> The brief says to `grep for 'Could not find'` to catch a missing test file. **That string is not emitted when a missing file is passed alongside a real one** — the case that actually matters. Measured on Node v23.11.0:
> ```
> $ node --test tests/unit/socraticReducer.test.js tests/unit/DOES_NOT_EXIST.test.js
> ℹ fail 0
> EXIT=0            # no "Could not find" anywhere in output; grep -c → 0
>
> $ node --test tests/unit/DOES_NOT_EXIST.test.js     # sole argument
> Could not find 'tests/unit/DOES_NOT_EXIST.test.js'
> ```
> The silent-skip hazard is **real and worse than described**. Use the mitigation in *Verification* V6 (assert the path is in the `test:fast` string, and grep the run output for the test's own name) — not the `Could not find` grep.

> ### ⚠️ CORRECTED — an existing test pins today's behavior and must be rewritten
> The brief frames tests as additive. But `tests/unit/lessonAudio.test.js` contains:
> ```js
> it('never touches lesson.socratic', …)
>   assert.deepEqual(result.lesson.socratic, { movestring: '123', correctCol: 3 })
> ```
> This is a **deliberate lock on the behavior we are inverting**. It must be rewritten in Task 6, not merely supplemented. Same for the three doc-comment assertions of the same claim (below).

### Minor deltas (no plan impact, noted for accuracy)

- The `audio` field stores a **path** (`/audio/lessons/<hash>.mp3`), not a bare filename. `collectReferencedAudio` calls `path.basename(p)` to compare.
- `wrong1`/`wrong2` have no per-lesson override **at the render site either** — they are `t('socratic.wrong1')` with no `defaultValue` indirection. Consistent with the brief's finding that no lesson overrides them.
- `showHint` is `useState` in `SocraticScreen`, **never reset**, and short-circuits the phase map entirely. It is a narration trigger alongside `phase` (see Task 4).
- `lesson-07-opening-centre.json`'s `socratic` has `goalPrompt` but **no `goalPrompt_es`** — unrelated to this change, but confirms `pickLocalized`'s silent-fallback behavior is load-bearing today.

### Everything else in the brief verified true

Confirmed at source: the `t()` render site; **zero** speech calls in `SocraticScreen` (`grep` exit 1); `localizeLesson`'s existing `lesson.socratic` branch; `pickLocalized`'s non-empty-string fallback; `generateLessonAudio`'s unconditional regeneration and `text_es`/`audio_es` switch; `collectReferencedAudio` feeding `pruneOrphanedLessonAudio`; the endpoint's deliberate `getLessonsAll()` (raw) read; `socraticReducer`'s four phases; `ConceptScreen` as narration reference; exactly 3 lessons overriding exactly `[ask, hint, correct]` in both en and es; `"type": "module"`; `test:fast` as an explicit file list.

---

## The trap that shapes the design

`generateLessonAudio` and `collectReferencedAudio` walk the lesson tree **independently**. Add socratic audio to the first without the second and `pruneOrphanedLessonAudio` deletes the new clips as orphans on the next prune run.

This is not hypothetical — **it already happened once**, and the scar is in the source:

```js
// QA 2026-07-15 / D1: this must see both fields, or every Spanish clip is an
// orphan on the next prune-audio run and gets deleted.
```

That comment sits above `collectReferencedAudio`, recording the identical divergence for `audio_es`. Patching each walker again would set up the third occurrence.

**So: extract one shared walker, used by both.** One unifying mechanism, not two parallel edits.

**Scope of "one unifying mechanism" — precise statement.** The shared walker (Task 1) unifies exactly the **audio pipeline**: `generateLessonAudio` (writes clips) and `collectReferencedAudio` (protects them from pruning). It does not — and cannot — unify `connect-four/scripts/translate-lessons.mjs`, which is a **third, independent walk** over lesson messages, run offline to draft `text_es` values rather than to synthesize or protect audio. It has its own hardcoded field-path list and its own header comment asserting that list is exhaustive. That comment goes stale the moment `socratic.messages` exists and is not walked by it — see Blocking 1 in *Corrections to the brief* and Task 1b. The rule going forward: any code path that reads or writes lesson message text is a fourth candidate for this same trap, and must be swept (`rg -n "coachMessages|socratic"` across `server/`, `src/`, `scripts/`, `tests/`) and either routed through `collectMessages` (if it touches audio) or explicitly reconciled by hand (if it doesn't, like the translator) — never left unexamined.

---

## Design

### Content shape (owner-approved)

`socratic.messages` — a phase→array map, each array holding coachMessages-shaped objects. Board config stays separate from copy, and the arrays are structurally identical to `slides[].coachMessages`, so `CoachDialog` and `getNarrationQueue` consume them verbatim.

```json
"socratic": {
  "movestring": "320101311201",
  "boardSpec": ["ggg", "dddgd", "dd", "gg", "", "", ""],
  "overlays": [],
  "correctCol": 0,
  "messages": {
    "ask":     [{ "text": "I'm going to make a mistake here. See if you can punish it.", "mood": "think", "text_es": "Voy a cometer un error aquí. Mirá si podés castigarlo." }],
    "wrong1":  [{ "text": "Not quite — look for the right square. Try again.", "mood": "oops", "text_es": "No exactamente — buscá la casilla correcta. Intentalo de nuevo." }],
    "wrong2":  [{ "text": "Let me show you.", "mood": "oops", "text_es": "Dejame mostrarte." }],
    "correct": [{ "text": "Exactly! You saw it.", "mood": "happy", "text_es": "¡Exacto! Lo viste." }],
    "hint":    [{ "text": "Look for an even square directly above one of my discs.", "mood": "think", "text_es": "Buscá una casilla par justo encima de una de mis fichas." }]
  }
}
```

The five `text`/`text_es` pairs above are **harvested verbatim** from `en.json`/`es.json` this session (see *Harvested values*). The `mood` values are harvested from the current `SocraticScreen` phase map.

### Reused, not rebuilt

| Existing thing | Path | Role here |
|---|---|---|
| `getNarrationQueue(coachMessages, speechEnabled)` | `src/lib/lessonNarration.js` | Reads `m.audio`; `localizeLesson` already collapses `audio_es`→`audio`. Reuse **as-is**. |
| `speakLessonAudio(path)` / `stopSpeech()` | `src/lib/useCoachSpeech.js` | Reuse as-is. |
| `useAudio().speechEnabled` | `src/lib/useAudio.js` | Reuse as-is. |
| `CoachDialog`'s optional `onReplay` prop | `src/components/CoachDialog.jsx` | Already exists; `SocraticScreen` just starts passing it. |
| `assignLocalized` / `stripEsKeys` | `server/lessonLoader.js` | Reuse in the `localizeLesson` socratic branch. |
| `hashMessageText`, the `dir`/`synthesize` test seams | `server/lessonAudio.js` | Unchanged. |

`SocraticScreen` **already** fetches `/api/lessons/:id` with `langHeaders()`, so it already receives server-localized data. No fetch change is needed — only the message *source* changes from `t()` to `lesson.socratic.messages`.

---

## Tasks

Locate everything **by symbol name**; another agent is committing to this branch and line numbers drift.

### Task 1 — Extract the shared walker (`server/lessonAudio.js`)

Add one exported generator/function and route **both** existing walkers through it:

```
collectMessages(lesson) → [{ message, locator }]
```

- Yields `slides[si].coachMessages[mi]` with locator `slides[${si}].coachMessages[${mi}]` — **byte-identical to today's locator string**, which is asserted by existing tests (`failed[0].locator === 'slides[0].coachMessages[0]'`) and by `generated` array assertions. Do not reformat it.
- Then yields `socratic.messages[phase][mi]` with locator `socratic.messages.${phase}[${mi}]`.
- Guards: `lesson.socratic` may be `null` (lesson 4); `socratic.messages` may be absent; each phase value may be a non-array. Mirror the existing `Array.isArray(...) ? ... : []` idiom.
- Iterate phases in a **fixed order** — `['ask', 'wrong1', 'wrong2', 'correct', 'hint']` — not `Object.keys`, so locators and log output are deterministic.

Rewrite `generateLessonAudio`'s nested loops and `collectReferencedAudio`'s nested loops to consume `collectMessages`. Behavior for slides must be unchanged.

**Also update the stale doc comments** in this file, which currently assert the opposite in three places:
- the module header: `Only *concept* slides (lesson.slides[]) carry coachMessages[]. lesson.socratic never has coachMessages and must never be touched here.`
- `generateLessonAudio`'s JSDoc: `Never touches lesson.socratic (no coachMessages there).`
- `collectReferencedAudio`'s JSDoc: `every audio clip referenced by any lesson/slide/coachMessage`

Leave unchanged: unconditional regeneration (**do not reintroduce a hash-match skip**), the empty/whitespace skip, per-message try/catch isolation, and the `lang`/`readTtsConfig`/`buildTtsInstructions` threading.

### Task 1b — Extend the translator (`connect-four/scripts/translate-lessons.mjs`)

This script is a **third, separate walk** over lesson messages — it drafts `_es` values offline and is not part of the audio pipeline, so it is not touched by Task 1's shared walker. After this plan lands, `socratic.messages[phase][].text` is the only lesson copy field it fails to reach, and it fails **silently**: the first person to edit or add a Socratic message and re-run the translator gets English `text` with a stale or absent `text_es`, which `pickLocalized`'s silent fallback then hides in production. Same failure class as the `audio_es` scar this plan is otherwise built around — just one walker short.

- In the per-slide loop, alongside the existing `handleField(slide.coachMessages[ci], 'text', ...)` call, add a walk over `lesson.socratic.messages`: for each phase in the **same fixed order** as Task 1 (`['ask', 'wrong1', 'wrong2', 'correct', 'hint']`), for each message index `i`, call `handleField(lesson.socratic.messages[phase][i], 'text', \`socratic.messages.${phase}[${i}].text\`)`.
- Guard exactly as Task 1 does: `lesson.socratic` may be `null`; `socratic.messages` may be absent; a phase value may be a non-array — skip rather than throw.
- Keep the existing `socratic.goalPrompt` handling untouched; it is a separate field or the script already covers it correctly.
- **Correct the header comment.** Both the top-of-file comment (`// Translates ONLY these 5 field paths, and nothing else:`) and the module doc-comment (`Translates ONLY: slides[].coachMessages[].text, slides[].legendItems[].label, slides[].infoProse, socratic.goalPrompt, confirmationChallenges[].goalPrompt. NEVER title, _boardInstructions, or any...`) currently assert a closed, exhaustive list that becomes false the moment `socratic.messages` exists. Add `socratic.messages[phase][].text` to both lists.

**Do not** refactor this script onto `collectMessages` from Task 1. `collectMessages` locators carry no `.text` suffix (they yield the message object, e.g. `slides[0].coachMessages[0]`) while the translator's locators are field-specific (`....text`), and the translator operates on **raw**, pre-localization lesson objects rather than the audio pipeline's shapes. Unifying the two walkers is a larger refactor than this plan's budget; keep them as two hand-synchronized lists and rely on this task plus the re-sweep discipline above to keep them in lockstep.

**Ordering:** Task 1b can be done any time after Task 1 fixes the phase order constant, and must land before Task 5 (migration) is treated as "translation-complete" — otherwise the migrated `socratic.messages` looks translated (Spanish already harvested per *Two facts that make this cheap*) but any future edit silently regresses.

### Task 2 — `localizeLesson` extension (`server/lessonLoader.js`)

The `if (lesson.socratic)` branch already exists. Extend it to localize `messages`, reusing the **exact** per-message logic already applied to `slides[].coachMessages`:

```js
next.coachMessages = slide.coachMessages.map((m) => {
  const nm = stripEsKeys(m);
  if ('text' in m || 'text_es' in m) assignLocalized(nm, m, 'text', locale);
  if ('audio' in m || 'audio_es' in m) assignLocalized(nm, m, 'audio', locale);
  return nm;
});
```

Factor that map callback into a local `localizeMessage(m, locale)` helper and use it in **both** places — same reasoning as Task 1. Keep the existing `goalPrompt` handling untouched. Preserve `stripEsKeys` on the socratic object itself.

**Off-by-one nesting warning — read before writing this.** The pasted `slides[].coachMessages` snippet above is array-shaped: `slide.coachMessages.map(...)`. `socratic.messages` is one level deeper — a phase→**array** map (`{ ask: [...], wrong1: [...], ... }`), not an array itself. The naive "copy the slides pattern" translation is to iterate phases and write `s.messages[phase] = s.messages[phase].map(localizeMessage)`. **Do not do this without first rebuilding the container.** `stripEsKeys` is a **shallow** copy, so in the existing `if (lesson.socratic)` branch, `s.messages` (via `stripEsKeys(lesson.socratic)`) is the **same object reference** as `lesson.socratic.messages` on the raw, in-memory `_lessons` cache entry — the array-copy-on-write disguises a container that is still shared. Assigning into `s.messages[phase]` mutates that shared object in place, permanently deleting `text_es` from the module-level raw cache for every subsequent request, in every locale, until the process restarts or `reloadLessons()` re-reads disk.

This matters because two endpoints read the **raw** (non-localized) cache on purpose — `getLessonsAll()`, guarded by the D1 comment quoted in Task 8 ("using it here would both feed generateLessonAudio(lang='es') empty text_es AND destroy every _es field on save"). One `es`-locale page load calling `getLesson(id, 'es')` before an admin action reads `getLessonsAll()` would starve the Spanish audio generator of `text_es`, and a subsequent save would persist that loss to disk.

**Required implementation:** rebuild the `messages` map into a **fresh object**, never assign into the shared reference:
```js
if (lesson.socratic.messages && typeof lesson.socratic.messages === 'object') {
  s.messages = {};
  for (const phase of Object.keys(lesson.socratic.messages)) {
    const arr = lesson.socratic.messages[phase];
    s.messages[phase] = Array.isArray(arr) ? arr.map((m) => localizeMessage(m, locale)) : arr;
  }
}
```
`localizeMessage` itself already returns a new object per message (via `stripEsKeys(m)`), so the leaf level is safe — the bug is specifically at the phase-map container level. Do **not** switch to `structuredClone` for the whole `socratic` object as a shortcut: that would also deep-clone `slides`/`legendItems`-adjacent paths that are correct today and out of this task's budget.

### Task 3 — `validateLesson` (`server/lessonLoader.js`)

Add shape validation for `socratic.messages` when present: must be an object; each present phase key must be an array of objects with a string `text`. Follow the existing early-return-error-string style. Keep it permissive about *absent* phases — a lesson mid-migration must not vanish from the app. (Note the loader's failure mode: an invalid file is `console.error`'d and **excluded**, so an over-strict rule silently removes a lesson.)

### Task 4 — `SocraticScreen` narration (`src/screens/SocraticScreen.jsx`)

Replace the `t()`-built `coachMessages` with lesson data, and mirror `ConceptScreen`'s narration effect.

- Source messages: `lesson.socratic.messages[showHint ? 'hint' : phase]`.
- Keep a fallback to the existing `t()` strings **only if** Task 7's i18n deletion is deferred; if the keys are deleted in the same change, drop the fallback entirely (a dead `defaultValue` chain is exactly the i18n-assembly disease being removed).
- Add `useAudio()` for `speechEnabled`; import `speakLessonAudio`, `stopSpeech`, `getNarrationQueue`.
- Narration effect, mirroring `ConceptScreen`'s (including the unconditional `stopSpeech()` cleanup so navigating away never leaves orphaned audio):
  ```js
  useEffect(() => {
    if (!lesson) return undefined;
    const queue = getNarrationQueue(currentMessages, speechEnabled);
    queue.forEach((path) => speakLessonAudio(path));
    return () => { stopSpeech(); };
  }, [lesson, phase, showHint, speechEnabled]);
  ```
  **`showHint` must be in the dep array** — it is separate state that changes the visible bubble without changing `phase`.
- Add `handleReplayNarration` (owner-approved) mirroring `ConceptScreen`'s, and pass `onReplay={handleReplayNarration}` to `CoachDialog`.
- Hoist above the early returns — rules of hooks. The file already documents this constraint for its `useMemo`.

### Task 5 — Migration (harvest, never hand-author)

Write a **throwaway** Node script (scratchpad, not committed) that:
1. Reads `src/i18n/en.json` and `src/i18n/es.json`.
2. For each of the **12** lessons with non-null `socratic`, builds `messages` from the harvested generic values, overlaying `lesson.<id>.socratic.<key>` for `opening-centre` / `opening-imitate` / `opening-sharp` (keys `ask`, `hint`, `correct` only).
3. Writes each lesson file, preserving key order and the repo's existing 2-space JSON formatting.

Read the values **from the JSON files at runtime**. Do not paste the strings into the script — that is hand-authoring with extra steps.

Do **not** set `audio`/`audio_es` in the migration. Audio paths are produced only by `generateLessonAudio` actually synthesizing (Task 8); a hand-written path is a fabricated fixture pointing at a file that does not exist.

### Task 6 — Tests

**The load-bearing one — prune must see socratic audio.** In `tests/unit/lessonAudio.test.js`:
- Rewrite `it('never touches lesson.socratic')` → `it('generates audio for socratic.messages')`. Assert `generated` contains `socratic.messages.ask[0]` and the `audio` path is set.
- Add to `collectReferencedAudio`: a socratic-only clip is referenced.
- Add to `pruneOrphanedLessonAudio`: **a lesson whose only audio is a socratic clip does not have that clip deleted.** This is the RED test.

  **RED discipline:** it must fail against today's code *for the right reason* — the clip is deleted because `collectReferencedAudio` never walked `socratic`. Confirm the failure message says the file was deleted, not that a fixture was malformed. Run it on a stashed working tree before writing Task 1.
- Add: `socratic: null` (lesson 4's real shape) generates nothing and throws nothing.
- Add: `lang='es'` reads `text_es` / writes `audio_es` for socratic messages.

In `tests/unit/lessonLoader.test.js`: locale `es` merges socratic message text and its matching audio; the per-field fallback holds; no `undefined` key injection for an `_es`-only socratic message (mirror the three existing `es-only … does not inject an undefined key` tests — they exist because this bug shipped before).

**Non-mutation guard (catches Blocking 2).** Add a test that calls `getLesson(id, 'es')` for a lesson with `socratic.messages`, then re-reads the **same lesson via `getLessonsAll()`** (the raw, unlocalized cache) and asserts its `socratic.messages.<phase>[0].text_es` is still present and unchanged. This is the only check in this plan that can catch a `localizeLesson` implementation that writes into the shared raw object instead of rebuilding a fresh `messages` container — V4 (below) exercises only the `es`-locale *output* and would pass identically whether or not the raw cache was corrupted in the process, because it never looks at the raw cache afterward.

In `tests/unit/lessonNarration.test.js`: `getNarrationQueue` needs no change; add a case asserting it accepts a socratic message array unmodified.

**Every new test file must be added to `test:fast`'s explicit list in `package.json`** (prefer extending the existing files, which are already listed — `tests/unit/lessonAudio.test.js`, `lessonLoader.test.js`, `lessonNarration.test.js` — so no list edit is needed).

Note `tests/dom/AdminLessonEditorScreen.dom.test.jsx` is **not** in `test:fast`; if touched, run it explicitly.

### Task 7 — Delete the i18n keys

Remove top-level `socratic.*` (5 keys) and `lesson.<id>.socratic.*` (3 lessons × 3 keys) from **both** `en.json` and `es.json`. `tests/unit/i18nKeyParity.test.js` enforces presence parity, so a one-sided deletion fails loudly — good.

**Leave alone:** `lesson.node.*`, `lesson.confirmation.*` (UI chrome, not lesson content), and `lesson.<id>.title` (out of scope — see below).

Grep for surviving `socratic.` / `.socratic.ask` references before deleting; `SocraticScreen` should be the only consumer.

### Task 8 — Generate audio

**Prerequisite — restart the server after Task 5, before this task.** Task 5 writes the 12 migrated lesson files **directly to disk**; it does not go through the admin API and does not call `reloadLessons()`. The `generate-audio` handler reads the boot-time in-memory cache via `getLessonsAll().find(...)` and only calls `reloadLessons()` **after** it writes — so against a server process started before Task 5 ran, the handler sees the pre-migration lesson (no `socratic.messages`), synthesizes nothing new for socratic phases, and then `saveLessonFile(LESSONS_DIR, updatedLesson)` writes that **stale, pre-migration object back over the just-migrated file** — silently reverting Task 5's work. The response still looks like `{"generated": [...]}` with slide entries, which is easy to misread as a legitimate result rather than as evidence of a stale cache; do not use "the endpoint returned 200" as sufficient evidence.

**Pre-check (falsifiable, run before generating anything):**

Probe the **admin** endpoint, not the public `/api/lessons/:id`. Verified at source — `app.get('/api/admin/lessons/:id', requireLocalhost, requireAdmin, …)` opens with:
```js
const all = getLessonsAll();
const lesson = all.find(l => l.id === req.params.id);
```
That is the **same raw read path `generate-audio` uses**, so it is the only probe that answers the question actually being asked. The public endpoint runs `getLesson()` → `localizeLesson`, which strips every `_es` field — it can confirm `messages` exists but can never show `text_es`, and it reports on a code path the generator does not take.

```
curl -s localhost:3001/api/admin/lessons/immediate-threat | node -e \
  "let d=''; process.stdin.on('data',c=>d+=c).on('end',()=>{ \
    const m = (JSON.parse(d).socratic || {}).messages; \
    if (!m)                        return console.log('STALE — restart the server before Task 8'); \
    if (!m.ask?.[0]?.text_es)      return console.log('CORRUPT — text_es missing from the raw cache (see Blocking 2)'); \
    console.log('OK — server serves the migrated lesson, translations intact'); })"
```

Three outcomes, each falsifiable:
- **`STALE`** → the running process predates Task 5. Restart and re-run. Generating now would revert the migration.
- **`CORRUPT`** → `text_es` is absent from the **raw** cache. Because `localizeLesson` must never mutate its input (Task 2), this can only mean the shared-reference mutation bug is live. **Stop** — generating now would synthesize nothing for Spanish and then persist the loss to disk. This is the one check that catches Blocking 2 against the real tree rather than a fixture.
- **`OK`** → proceed.

Do not proceed on anything but `OK`. `requireAdmin` is a no-op outside `NODE_ENV=production` and `requireLocalhost` passes from the dev box, so this curl needs no auth setup locally.

Per lesson, via `POST /api/admin/lessons/:id/generate-audio` (localhost-only) with `{lang:'en'}` then `{lang:'es'}`. The endpoint reads the **raw** lesson via `getLessonsAll()` — do not "simplify" it to `getLesson()`, which applies `localizeLesson`, strips every `_es` field, and would both starve the generator and destroy translations on save. That comment is in the handler; keep it.

This writes the mp3s and the `audio`/`audio_es` paths back into the lesson JSONs. Expect ~10 new unique clips (5 generic × 2 langs), plus overrides for the 3 opening lessons — **not** 12× that, thanks to content addressing.

### Task 9 — Update `docs/architecture/server-conventions.md`

Its `lessonAudio.js` section currently states the inverse of the new behavior and must be corrected:

> Iterates only `lesson.slides[].coachMessages[]` (concept slides) — never `lesson.socratic`, which carries no `coachMessages`.

Document the shared walker as the mechanism preventing generate/collect divergence, and cite the two incidents (`audio_es`, socratic) as the reason it exists.

---

## Harvested values

Read from `src/i18n/en.json` / `es.json` at HEAD this session via `node -e`. These are the migration's source of truth.

| key | en | es |
|---|---|---|
| `ask` | I'm going to make a mistake here. See if you can punish it. | Voy a cometer un error aquí. Mirá si podés castigarlo. |
| `wrong1` | Not quite — look for the right square. Try again. | No exactamente — buscá la casilla correcta. Intentalo de nuevo. |
| `wrong2` | Let me show you. | Dejame mostrarte. |
| `correct` | Exactly! You saw it. | ¡Exacto! Lo viste. |
| `hint` | Look for an even square directly above one of my discs. | Buscá una casilla par justo encima de una de mis fichas. |

Per-lesson overrides (`opening-centre`, `opening-imitate`, `opening-sharp` — keys `ask`/`hint`/`correct` only) are present in both files and were dumped verbatim this session; the migration reads them from the JSON rather than transcribing them.

**Expected English mp3 basenames** (`hashMessageText` of the generic strings, computed this session — a falsifiable post-Task-8 check):

```
ask     a2230ed7085dda79.mp3
wrong1  c1623a9ecce9ac3e.mp3
wrong2  c95e0c9442ef3582.mp3
correct ce4e7549ac16e9f8.mp3
hint    1ab32125dd370e7d.mp3
```

`public/audio/lessons/` currently holds **8** mp3s.

---

## Ordering constraints

1. **Task 6's RED prune test before Task 1.** A test written after the fix cannot prove it failed for the right reason.
2. **Task 1 (walker) before Task 8 (generate).** Generating before `collectReferencedAudio` sees socratic means the next prune deletes the new clips — the exact trap.
3. **Task 5 (migration) before Task 8.** Nothing to synthesize otherwise.
4. **Task 5 → restart the running server → Task 8, in that exact order, with no generate-audio calls in between.** Task 5 writes lesson files directly to disk with no `reloadLessons()` call; the `generate-audio` handler reads a boot-time in-memory cache and only reloads *after* it writes. Generating against a pre-restart server silently reverts Task 5's migration (see Task 8's prerequisite and pre-check). This is stricter than "Task 5 before Task 8" (constraint 3) — it additionally requires the process boundary in between.
5. **Task 1b (translator) after Task 1, any time before Task 5 is treated as translation-complete.** Task 1's fixed phase-order constant is what Task 1b's locator format depends on.
6. **Task 2/3 (server) before Task 4 (screen).** The screen reads fields the server must already localize.
7. **Task 7 (i18n deletion) after Task 4** — or simultaneously. Deleting first leaves the bubble blank.
8. **Task 8 last.** It is the only task that spends real TTS money and is the only one whose output cannot be reproduced by re-running tests.

---

## Verification

Every check below is falsifiable — it names the command and the observation that would disprove the claim.

**V1 — RED first (before Task 1).** With the new prune test present and Task 1 stashed:
```
cd connect-four && node --test tests/unit/lessonAudio.test.js
```
Expect: the socratic-prune test FAILS, message showing the socratic clip was deleted. If it fails for any other reason (bad fixture, undefined access), the test is wrong.

**V2 — GREEN after Task 1.** Same command; that test passes and **every pre-existing test in the file still passes**, especially the slide locator assertions (`slides[0].coachMessages[0]`).

**V3 — Full suite.**
```
cd connect-four && npm run test:fast; echo "EXIT=$?"
```
Expect `EXIT=0`. `i18nKeyParity.test.js` must pass after Task 7 (it will fail if only one language's keys were deleted).

**V4 — Loader shape, at the real seam.** Not a hand-written fixture — the real files:
```
node -e "import('./server/lessonLoader.js').then(m=>{m.loadLessons('./lessons');
  const es=m.getLesson('immediate-threat','es');
  console.log(JSON.stringify(es.socratic.messages.ask,null,2));
  console.log('lesson4:', m.getLesson('odd-rows-belong-to-red','es').socratic);
  console.log('loaded:', m.getLessons().length);})"
```
Expect: `ask[0].text` is the **Spanish** string; **no `text_es` key survives** (`localizeLesson` strips `_es`); lesson 4's socratic is `null`; **`loaded: 13`** — if any lesson dropped, Task 3's validation is too strict and `console.error` will say which.

**V4 cannot catch Blocking 2 (cache corruption) and must not be treated as if it does.** V4 only inspects the localized `es` *output* of `getLesson`; it never re-reads the raw cache afterward, so it passes identically whether `localizeLesson` rebuilt a fresh `messages` object or mutated the shared raw one in place. The check that actually proves non-mutation is the new loader test added in Task 6 (the non-mutation guard, asserting `getLessonsAll()`'s raw entry still has `text_es` after an `es` read) — that is the only falsifiable check for this failure mode. Do not substitute V4 for it.

**V5 — Prune is non-destructive on the real tree.** After Task 8, with the server running:
```
curl -s -X POST localhost:3001/api/admin/lessons/prune-audio
```
Expect `{"deleted":[]}`. **A non-empty array means the walker diverged** — this is the trap firing. Cross-check: `ls public/audio/lessons/ | wc -l` should be unchanged and should contain `a2230ed7085dda79.mp3` (the `ask` hash above).

**V6 — Test-file registration (the silent-skip guard).** Do **not** rely on `grep 'Could not find'` — proven above not to fire in the mixed case. Instead:
```
node -e "const s=require('./package.json').scripts['test:fast'];
  for (const f of ['tests/unit/lessonAudio.test.js','tests/unit/lessonLoader.test.js','tests/unit/lessonNarration.test.js'])
    console.log(s.includes(f) ? 'OK  '+f : 'MISSING  '+f);"
```
And confirm the run actually executed the new tests by grepping the output for the **test's own name**, not for an error string:
```
npm run test:fast 2>&1 | grep -c "socratic"
```
Expect a non-zero count.

**V7 — End-to-end in the browser (the only check that tests the actual bug).** `npm run dev`, open lesson 1, click through to the Socratic board, with speech enabled. Run as **two separate passes** — a Hint-free run first, then a Hint run — because `showHint` is sticky (never reset; see D2 and *Out of scope*) and clicking Hint in the middle of the first pass would make it impossible to observe `correct` narration at all in this session.

*Pass A — Hint-free run (must come first):*
- **EN:** bubble reads "I'm going to make a mistake here…" **and audio plays**.
- **ES:** switch language, reload; bubble reads "Voy a cometer un error aquí…" **and Spanish-accented audio plays**.
- Play a wrong column → `wrong1` bubble narrates. Wrong again → `wrong2` narrates.
- Play the correct column (without ever clicking Hint) → **`correct` bubble narrates.** This is the check the old ordering skipped: if Hint had been clicked earlier in the same mount, `correct` can never appear (D2) and this step would silently never run.
- Click replay → re-narrates from the start.
- DevTools Network: the mp3 request returns **200**, not 404. A 404 means an `audio` path was written without a matching synthesis.

*Pass B — Hint run (fresh reload, separate from Pass A):*
- Click Hint → hint narrates.
- **Navigate away mid-narration → audio stops** (the `stopSpeech()` cleanup). If it keeps playing, the effect cleanup or dep array is wrong.
- (Expected, not a bug per D2: once Hint has been clicked, `correct` cannot be reached in this mount — do not treat that as a regression to fix in this task.)

**V8 — Lesson 4 unaffected.** Open `odd-rows-belong-to-red`; it should go slides → confirmation challenge, never reaching a Socratic board, with no console error.

---

## Out of scope (follow-ups; do not fix here)

- **`lesson.<id>.title` in i18n while the lesson JSON also has `title`.** Same disease. `localizeLesson` deliberately excludes `title` with a comment explaining that `lesson.<id>.title` owns it — untangling that touches every lesson screen's `TopBar`.
- **`socratic.goalPrompt` is authored in 9 of 13 lessons and rendered nowhere.** Confirmed: the only `GOAL_PROMPTS` hits are unrelated, in `CandidateDashboard.jsx`. `localizeLesson` faithfully localizes a field nothing displays.
- **The generic `hint` is strategically wrong for most lessons.** "Look for an even square directly above one of my discs" is claimeven-specific advice shown on 9 lessons that are not about claimeven. Moving it into lesson content makes it *fixable per lesson* — which is the point — but actually writing 12 good hints is a content task, not this refactor.
- **`showHint` is sticky and never reset (D2).** `SocraticScreen` holds `const [showHint, setShowHint] = useState(false)`; nothing sets it back to `false`, and its render path short-circuits the phase map, so once a learner clicks Hint the `correct` bubble (and, after this plan, its narration) can never appear again in that mount. This plan preserves that behavior exactly — deciding whether it is a bug and, if so, how the hint/phase interaction should work is a UX decision independent of moving the copy into lesson content, and changing it here would conflate a content-plumbing refactor with a behavior change. V7 above is ordered to route around it (Hint-free pass before the Hint pass) rather than fix it.

Both title/goalPrompt items are the same "lesson content assembled from i18n keys" disease; entangling them here would inflate the change.
