# Phase 0 Research: Audio Verification & TTS Management

All "unknowns" here are resolved by reading the existing codebase — this is a brownfield epic
against an already-built TTS pipeline, not new-technology research. Every decision below cites the
`file:line` it was verified against.

## R1 — Shared synthesis entry point signature (FR-026/FR-027/FR-028)

**Decision**: Introduce a **two-tier** API in `connect-four/server/ttsProvider.js`:

```js
// New: the production entry point. Resolves EVERYTHING from lang. Cannot be
// called without a valid lang; cannot be given voice/model/instructions.
export async function synthesize(text, lang) { /* throws on invalid lang or refused model */ }
export async function synthesizeStream(text, lang) { /* stream sibling for deep-reveal */ }

// Renamed from today's synthesize()/synthesizeStream(): the low-level primitive
// that still accepts a full opts bag. Used ONLY by the preview sandbox endpoint.
export async function synthesizeRaw(text, opts = {}) { /* unchanged body, was synthesize() */ }
export async function synthesizeStreamRaw(text, opts = {}) { /* unchanged body, was synthesizeStream() */ }
```

**Why not a single `synthesize(text, lang)` for every caller including preview**: FR-026's own
citation of "the shared synthesis entry point" names **six** call sites
(`connect-four/server/index.js:3688,3727,3761,3953`, `server/lessonAudio.js:24`,
`scripts/generate-tts.js:364`). Verified at source: line **3727** is
`POST /api/admin/audio/preview`, whose own doc comment (verbatim,
`server/index.js` immediately above the route) says it is
"the only TTS endpoint that synthesizes **arbitrary text** with **experimental** voice params" and
is "Deliberately WRITES NOTHING ... you cannot hear a change you did not synthesize." Preview reads
`voice`/`model`/`speed` from `validatePreviewRequest(req.body)` — **not** from
`readTtsConfig(lang)` — and must keep doing so; that is its entire purpose (an owner auditioning a
candidate voice/prompt combination before saving it as the persisted config). Forcing preview
through a lang-only `synthesize(text, lang)` would delete the sandbox's reason to exist. FR-026's
literal sentence — "Callers MUST supply only text and a language" — is therefore read as scoped to
the **production** synthesis guarantee (the thing this epic is closing off), and preview is excluded
from that guarantee by design: it never writes a file, a registry row, or a manifest entry, so it
cannot ship an "unstyled clip" the way OI-32 did. This is a plan-level interpretation call, flagged
here explicitly rather than left implicit — **verify against the owner's intent before implementing
if this is ambiguous.**

**Why this still satisfies "omission inexpressible" for the 5 real production callers**: the new
`synthesize(text, lang)` has no `opts` parameter at all — a caller cannot pass `voice`, `model`, or
`instructions` even if it wanted to, and cannot omit `lang` without a thrown error (see R2). This is
strictly stronger than "the caller happens to always pass full config" (today's actual state for 5 of
6 callers per the epic's Settled decision 5) — it makes the 6th caller's defect (passing nothing)
a **type error**, not a silent behavioral gap.

**Verified today's defect** (`scripts/generate-tts.js:363-366`, pasted verbatim):
```js
async function synthesizeAndWrite(entry, value, lang = 'en') {
  const { synthesize } = await import('../server/ttsProvider.js');
  console.log(`  Synthesizing "${entry.key}" (${lang})...`);
  const audio = await synthesize(value);
```
`lang` is already a parameter of this function — it is simply never passed to `synthesize`. The fix
is a one-line change once the signature exists: `synthesize(value, lang)`.

**Verified today's `buildTtsRequest` defaults** (`server/ttsProvider.js:18`, pasted verbatim):
```js
function buildTtsRequest(text, { voice = 'alloy', model = 'gpt-4o-mini-tts', speed = 1.0, instructions } = {}) {
```
These defaults are exactly how an omitted-options call silently ships a plausible-looking (but
unstyled, English-accented-if-Spanish-text) clip — `alloy`/`gpt-4o-mini-tts`/`1.0`/no instructions.
`buildTtsRequest` itself is unchanged; it remains the shared low-level request builder used by both
`synthesizeRaw` and (indirectly, via `synthesizeRaw`) the new `synthesize`.

**R1a — the injectable-seam consequence this signature change carries (found by tracing the changed
function's own tests, not just its callers)**: `generateLessonAudio` (`server/lessonAudio.js:164`)
accepts an *injectable* `synthesize` param specifically so tests can run without a real OpenAI call:
```js
export async function generateLessonAudio(lesson, { lang = 'en', synthesize = ttsSynthesize, dir = LESSON_AUDIO_DIR } = {}) {
```
and today invokes it (`:198`) as `synthesize(text, { instructions, speed, voice, model })`. An
existing, currently-green test asserts exactly that opts shape verbatim —
`tests/unit/lessonAudio.test.js:323-332` ("passes TTS instructions/voice/speed/model opts to
synthesize (not called bare)"), backed by the stub at `:23-27`
(`const fn = async (text, opts) => { calls.push({ text, opts }); ... }`). Moving to
`synthesize(text, lang)` silently changes the **injected stub's** contract from "second arg is an
options bag" to "second arg is a language string" — following the plan without also rewriting this
test turns `test:fast` red (the file is registered there, `package.json:17`) in a way that reads as a
regression, not an intended change. **Decision**: rewrite `makeStubSynthesize` and the "not called
bare" test to the new `(text, lang)` contract as an explicit task in this epic, asserting the stub
receives a valid `'en'`/`'es'` value and that a bare one-argument call is impossible. Separately, the
diagnostic log line `generateLessonAudio` currently emits (`voice=… speed=… model=…
instructionsChars=…`, added specifically so a no-op admin click is diagnosable from server output)
loses its inputs once config resolution moves into `ttsProvider.js` — **decision: `ttsProvider.js`
logs the resolved config once per call from within `synthesize`/`resolveSynthesisConfig` instead of
silently dropping it.**

## R2 — Legacy-model refusal mechanics (FR-028)

**Decision**: Two independent layers, so the refusal holds even if one is bypassed:

1. **Selectable-set layer**: `VALID_TTS_MODELS` in `connect-four/server/ttsConfig.mjs:27`
   (currently `['gpt-4o-mini-tts', 'tts-1', 'tts-1-hd']`, verbatim) becomes `['gpt-4o-mini-tts']`.
   `readTtsConfig(lang)` (same file) already falls back to `DEFAULT_TTS_MODEL` when the persisted
   `tts-prompt.<lang>.json`'s `model` field isn't in `VALID_TTS_MODELS` — so once the legacy models
   are removed from that array, no on-disk config can resolve to them, even if someone hand-edits
   the JSON file.
2. **Synthesis-seam layer (defense in depth, satisfies FR-028's "refuse" language literally)**: the
   new `synthesize(text, lang)` explicitly checks the model it resolves against an allow-list
   (`ALLOWED_TTS_MODELS = ['gpt-4o-mini-tts']`, a `ttsProvider.js`-local constant — deliberately not
   re-exported from `ttsConfig.mjs`, since this is a synthesis-time invariant, not a config-editor
   concern) and **throws** rather than silently substituting a default. This is also applied to
   `synthesizeRaw`/`synthesizeStreamRaw` (see Decision 1 hardening in `plan.md`'s Key decisions and
   `contracts/tts-provider-contract.md`) — the preview sandbox refuses legacy models too, even though
   it accepts otherwise-arbitrary params. This is what makes FR-029's regression test meaningful: the
   test drives the exported pure `resolveSynthesisConfig(lang)` directly (see
   `contracts/tts-provider-contract.md`) with a fake config source resolving to a legacy model and
   asserts it throws, independent of whether `ttsConfig.mjs`'s array was correctly edited. (Earlier
   drafts of this design called for monkey-patching the statically-imported `readTtsConfig` — that has
   no implementation path in this ESM codebase; `grep -ran "mock.module" tests/ server/` → zero hits,
   confirming this repo has never used module mocking. `resolveSynthesisConfig` replaces that
   unworkable approach with a plain exported function the test calls directly.)

**Selectable-set UI layer** (also FR-028, with the FR-013 carve-out): `TTS_MODELS` in
`connect-four/src/pages/AdminAudioPage.jsx:15` (currently
`['gpt-4o-mini-tts', 'tts-1', 'tts-1-hd']`, pasted verbatim) becomes `['gpt-4o-mini-tts']`. This one
constant feeds both dropdowns verified at `AdminAudioPage.jsx:431` (config editor) and `:512`
(preview sandbox) — `grep -n "TTS_MODELS.map"` shows exactly these two sites, so editing the one
array constant fixes both, per FR-013's explicit carve-out language.

## R3 — Deep-reveal `synthesizeStream` also needs the language-only path

**Decision**: `synthesizeStream` is not named in FR-026's text, but the epic's own citation list
places `server/index.js:3953` (verified: the `GET /api/user/tts/deep-reveal` handler) among the six
callers importing from `ttsProvider.js`. Verified at source — this call site currently does:
```js
const { synthesizeStream } = await import('./ttsProvider.js');
const { prompt: basePrompt, speed, voice, model } = readTtsConfig(locale);
const instructions = buildTtsInstructions(basePrompt, locale);
...
ttsResponse = await synthesizeStream(cleanText, { instructions: instructions || undefined, speed, voice, model });
```
This caller already resolves full per-language config itself (one of the "five of six" already
correct per Settled decision 5) — so it is not broken today, but leaving `synthesizeStream`'s
`opts`-bag signature untouched would leave one production path outside the FR-029 seam guarantee.
Decision: give `synthesizeStream` the same two-tier split as `synthesize` (`synthesizeStream(text,
lang)` production entry + `synthesizeStreamRaw(text, opts)` low-level, used by nothing today but
kept symmetric for future sandbox parity). Update this call site to
`synthesizeStream(cleanText, locale)`.

## R4 — Cross-locale cleanup fix mechanics (FR-016 / OI-26)

**Decision**: verified bug at `server/index.js:4077` (pasted verbatim):
```js
const { error: updateErr } = await supabase
  .from('explanation_cache')
  .update({ audio_path: null, audio_generated_at: null })
  .in('position_hash', hashes);
```
`hashes` (built at `:4060`, `expired.map(e => e.position_hash)`) has no locale component, and the
initiating `select` at `:4044` (`select('position_hash, audio_path')`) does not even fetch `locale`
— so the update nulls **every** locale's row for a `position_hash` that appears in the expired set
for **any** locale. Since migration `059_explanation_cache_locale.sql` (verified,
`ADD PRIMARY KEY (position_hash, locale)`) made the table's real identity
`(position_hash, locale)`, the fix must scope the update the same way. Concretely:
1. Extend the initiating `.select('position_hash, audio_path')` to
   `.select('position_hash, audio_path, locale')`.
2. Group `expired` rows by `locale` (there are only two: `en`/`es`).
3. Issue one `.update({...}).eq('locale', loc).in('position_hash', hashesForLoc)` per locale present
   in the batch (1–2 queries instead of 1), rather than a single ungrouped `.in()`.
4. Storage deletion (the per-path loop above it, `:4064-4071`) is already keyed by the exact
   `audio_path` string per row and is unaffected — it was never the buggy part.

**Alternative considered and rejected**: `.match({ position_hash, locale })` per row (N queries for N
expired rows) — correct but noisier; grouping by locale gets the same correctness in ≤2 queries for
the realistic case (two locales).

## R5 — Empty-movestring validation fix (FR-017 / OI-23)

**Decision**: verified bug at `server/index.js:3886` (pasted verbatim, inside
`GET /api/user/tts/deep-reveal`):
```js
if (!moveString || !/^[0-6]{0,42}$/.test(moveString)) {
  return res.status(400).json({ error: 'invalid moveString' });
}
```
`!moveString` is `true` for `''` (the valid empty opening-move string) even though the regex's own
`{0,42}` quantifier explicitly allows zero digits. Fix: replace the falsy check with a type check,
matching the pattern this codebase already uses correctly elsewhere — verified at
`server/index.js` inside `POST /api/explain-move-llm`:
```js
if (typeof movestring !== 'string' || !/^[0-6]{0,42}$/.test(movestring))
```
Apply the identical shape: `if (typeof moveString !== 'string' || !/^[0-6]{0,42}$/.test(moveString))`.
This is a one-line, mechanically obvious fix with a pre-existing in-repo pattern to copy.

## R6 — Regenerate-warning placement (FR-015 / OI-45)

**Decision**: verified at `connect-four/src/pages/AdminAudioPage.jsx:229-247`, the per-clip
`handleGenerate(key)` handler fires `POST /api/admin/audio/generate` with **no confirmation of any
kind** — contrast with `handleGenerateAll('all')` at `:269-294`, which already has a
`window.confirm(...)` warning (`:272`, pasted verbatim: `"...This overwrites every existing
clip — including approved ones, which go live immediately since the manifest already lists
them..."`). The gap is exactly the single-clip path. Fix: `handleGenerate` looks up the item's
current `status` from the already-loaded `data` state (the same object the status badge renders
from) before firing the fetch; if `status === 'approved'`, show a `window.confirm(...)` with warning
text and abort on cancel — otherwise proceed unchanged. **Reuse the CLI's existing warning copy** as
the epic's Settled decision 4 directs ("matching the warning the CLI already shows"); verified
verbatim at `scripts/generate-tts.js:409-421`:
```js
const ok = await confirmDestructive(`--key would overwrite an APPROVED clip (${lang})`, [
  `${entry.key}`,
  `    • ${mp3Rel} is overwritten in place — the approved recording (approved ${entry.approved_at}) is lost`,
  `    • status 'approved' → 'awaiting_approval'`,
  `    • the manifest still lists this slug, so the NEW take goes live immediately, unapproved`,
  `    • costs one TTS API call`,
  `Recover the old recording with: git checkout -- ${mp3Rel}`,
], { assumeYes });
```
Adapt this copy (drop the `git checkout` recovery line, which is CLI-specific — an owner using the
admin page has no shell in front of them; instead point at "recoverable only via git" per the
epic's own memory `project_lesson_disk_edit_cache_clobber`-adjacent language, or simply omit the
recovery instruction and note it is unrecoverable from the UI). This does **not** touch
`handleGenerateAll`, which is out of scope (already warns).

## R7 — Blunder one-liner locale threading (FR-019/020/021 / OI-28)

**Verified but NOT yet confirmed live** — `composeExplanation` is a candidate target, not a confirmed
one. Full verification chain, all at source:
- `server/index.js:592`, pasted signature: `async function composeExplanation(patternTag, scores,
  candidateCol, moves)` — **no locale parameter at all**, and its hardcoded prompt (`:596-608`) asks
  Claude for English prose with no language instruction.
- Its sole caller is `POST /api/explain-move` (`server/index.js:1132`, verified:
  `const { oneLiner: ol, fullText } = await composeExplanation(patternTag, scores, candidateCol,
  moves);`), which already computes `const locale = req.locale ?? 'en';` at `:1098` for its own cache
  lookup/write (`:1104`, `:1144` `position_hash`/`locale` insert) — the locale is sitting right there
  in scope and simply never threaded into the LLM call.
- **But**: `grep -ran "explain-move" connect-four/src/` finds the frontend only ever calls
  `/api/explain-move-**llm**` (`src/components/DeepRevealPane.jsx:173`) — **no frontend caller of
  plain `/api/explain-move`** was found. `grep -ran "oneLiner\|one_liner" connect-four/src/` → zero
  hits — the field is not consumed by the app in any component search found. The live path
  (`/api/explain-move-llm` → `computeMechanism`) writes `one_liner: ''` at `server/index.js:1302`.
  `buildExplainContext` (sole caller of `buildBlunderExplainPrompt`, at `server/explainContext.js:1078`)
  has no caller in `server/index.js` — only tests.
- This means **the epic's originally-named target for FR-019/020 may be dead code** from the
  learner's point of view. That is a hypothesis backed by static grep evidence, not a confirmed fact —
  a discovery task, described below, confirms it against the running app before any implementation
  proceeds.

**Discovery task (MUST run before any FR-019/020 implementation task)**: trace, in the running app,
which server response actually populates the one-liner a learner reads. Start from
`DeepRevealPane.jsx` and the mistake-review chip's rendering path. **Require a captured network
request as evidence** — not a code-reading argument, since static analysis already produced one
plausible-looking but unconfirmed conclusion above.

**Then, depending on discovery's outcome:**
- If discovery confirms `composeExplanation`/`/api/explain-move` is (or becomes) the live path: apply
  the fix as originally designed —
  1. Add a `locale` parameter to `composeExplanation(patternTag, scores, candidateCol, moves, locale =
     'en')`.
  2. Add a language-rule line to the prompt string conditioned on `locale === 'es'` (e.g. "Write your
     response in Rioplatense Spanish (voseo), not English" — mirroring the accent-directive pattern
     already used for TTS at `buildTtsInstructions`, though this is prose generation, not TTS).
  3. Update the call site at `:1132` to `composeExplanation(patternTag, scores, candidateCol, moves,
     locale)`.
  4. **Also localize the two fallback branches**, or the fix is partial: the no-Anthropic-client
     branch at `:595` and the catch block at `:629` both emit hardcoded English strings today and
     would still ship English text to a Spanish-locale learner on any LLM failure or missing-key path.
- If discovery finds `computeMechanism`/`/api/explain-move-llm` (or some other function) is the actual
  live path: retarget FR-019/020 at that function instead — the requirement ("determine locale at the
  point the one-liner is generated" / "honor that locale") is unchanged, only the function it applies
  to changes.
- If discovery finds **no code path currently renders a one-liner to the learner at all**: US4 is
  re-scoped or deferred rather than implemented against dead code, and OI-28 is closed out with a
  dated UPDATE naming exactly what was found, per `docs/open_issues.md`'s closeout convention.
- **SC-008 is tied to whichever function discovery confirms** — it must not stand as satisfiable by a
  change to an endpoint the app never calls.

**Confirmed correct, do not re-open — `computeMechanism` is already locale-threaded, and this is not a
no-op**: verified at `server/index.js:1234` (passes `locale` into `computeMechanism`),
`server/mechanismExplainer.mjs:78` (accepts `locale`) and `:83` (forwards it —
`buildPromptForCondition(null, nv, 'D', locale)`), and `server/scripts/compute.mjs:247` (uses it —
`const localeSuffix = locale === 'es' ? SPANISH_OUTPUT_DIRECTIVE : ''`). That sibling endpoint's
deep-reveal path (`GET`/`POST` around `server/index.js:1194,1229-1234`) is a different code path (the
reason-engine mechanism explainer, not `composeExplanation`) that a prior epic already localized. Do
not conflate the two, and do not re-verify this claim — it holds. What is genuinely open, and what the
discovery task above resolves, is whether `composeExplanation` (the thing that is *not* locale-threaded)
is actually the function producing what the learner sees, or whether the learner-visible one-liner
comes from this already-localized `computeMechanism` path (or somewhere else) instead.

**Already-cached English rows**: per FR-021/epic Settled reasoning, do **not** backfill. No migration,
no bulk update — the composite `(position_hash, locale)` PK from migration 059 already lets a fresh
`es` row coexist with the old `en` row for the same position; the fix is purely in the write path
for *new* cache misses.

## R8 — Lesson audio admin surface: server support needed (FR-008/009/010/011/012)

**Decision**: `AdminAudioPage.jsx` cannot re-derive `collectMessages()`'s walk in the browser without
either (a) importing a Node-only module (`server/lessonAudio.js` uses `fs`/`crypto`, not
browser-safe) or (b) hand-reimplementing the walk client-side, which is exactly the "hand-listed
field set" duplication this epic's hard constraints forbid. Decision: add one new **read** endpoint,
`GET /api/admin/lessons/:id/audio-status?lang=en|es`, gated **`requireLocalhost, requireAdmin`** —
both, matching the verbatim sibling declarations at `connect-four/server/index.js:870-948`, e.g.
`app.get('/api/admin/lessons/:id', requireLocalhost, requireAdmin, (req, res) => {`.

CORRECTED 2026-07-29: an earlier draft of this paragraph said "gated identically … (`requireAdmin`)"
and called that verified. It was wrong on both counts — the siblings carry **two** gates, and
`requireAdmin` alone is a no-op outside `NODE_ENV=production` (memory
`project_admin_localhost_directive`), so `requireLocalhost` is the only gate that actually restricts
access in dev and staging. Gating this endpoint on `requireAdmin` alone would leave it effectively
open while exposing full lesson content and on-disk audio paths.

Handler body: **call `reloadLessons()` (or read the lesson file from disk) first** — `getLessonsAll()`
returns a copy of an array populated once at server boot (`connect-four/server/lessonLoader.js:398`:
`export function getLessonsAll() { return [..._lessons]; }`), refreshed only by explicit
`reloadLessons()` calls that exist on the write routes but on no read route. Without the reload this
endpoint reports boot-time state, not disk state, breaking FR-009's live-status guarantee and
re-creating the OI-43 cache trap this epic closes out. Then call
`getLessonsAll()` (raw, `_es`-intact, per lesson-editor.md's "Raw vs. localized reads" rule), find
the lesson by id, run the **existing** `collectMessages(lesson)` for the walk, and for each entry
resolve `{ locator, group, text: message[localized(textKey)], audioPath: message[localized(audioKey)]
ownership, hasAudio: <path is non-empty AND file exists on disk> }` where `group` is derived from the
locator string (e.g. `slides[2].coachMessages[0]` → group `"Slide 3"`; `socratic.messages.ask[0]` →
group `"Socratic"`) for FR-008's "grouped ... per lesson" requirement. This is a **derived read**,
computed fresh on every request from `getLessonsAll()` + `collectMessages()` + an `fs.existsSync`
check — satisfying FR-009's "no second stored record" requirement, because nothing is written or
cached beyond the request lifecycle.

**Generation** reuses the existing `POST /api/admin/lessons/:id/generate-audio` endpoint (verified
present at `docs/architecture/api-conventions.md:915` and `lesson-editor.md`'s admin API table) —
but that endpoint today always regenerates **every** message in the lesson (verified:
`generateLessonAudio(lesson, { lang })` in `server/lessonAudio.js:164` has no per-message filter
param; it iterates the full `collectMessages(lesson)` result unconditionally). FR-011 needs
single-message regeneration. Decision: extend `generateLessonAudio`'s options with an optional
`locator` filter:
```js
export async function generateLessonAudio(lesson, { lang = 'en', locator = null, synthesize = ttsSynthesize, dir = LESSON_AUDIO_DIR } = {}) {
  ...
  for (const entry of collectMessages(lesson)) {
    if (locator && entry.locator !== locator) continue;
    ...
```
and thread an optional `locator` field through the `POST /api/admin/lessons/:id/generate-audio`
request body to the existing route handler's `generateLessonAudio(lesson, { lang, locator })` call.
When `locator` is absent, behavior is byte-identical to today (full-lesson regeneration) —
preserving the existing `AdminLessonEditorScreen` "Generate audios" button's behavior, which must
keep regenerating the whole lesson (FR-013-equivalent non-regression, even though FR-013 itself only
names the coach-audio page).

**Playback (FR-010)**: lesson clips are static files at `/audio/lessons/<hash>.mp3`, served by the
frontend dev server (`$VITE_PORT`), never the API port — verified via memory
`project_lesson_progression_audio_traps` and `docs/architecture/frontend-conventions.md:647`
("`audio` is a static path under `public/audio/lessons/`"). The new Lessons section's inline player
is therefore a plain `<audio src={audioPath} controls />` (or a lighter play-button + `new
Audio(audioPath)`, mirroring `AudioPlayer` at `AdminAudioPage.jsx:53` for the coach section) pointed
at the path the `audio-status` endpoint returns — no new static-serving configuration needed, since
`public/audio/lessons/` is already served the same way lesson screens already consume it.

## R9 — Socratic narration automated test (FR-004)

**Decision**: this needs a DOM test per `docs/architecture/testing-conventions.md`'s
`test:dom` conventions (jsdom + React Testing Library, `tests/dom/*.dom.test.jsx`, registered
explicitly in `test:dom`). It must assert **audio-element playback state**, not just that a
function was called — per the plan's hard constraint and per this project's established anti-pattern
warning ("a producer function tested green while its rendered string is wrong" —
`testing-conventions.md` "DOM / component tests" section). Concretely: render `SocraticScreen` (or
the relevant phase-message component) with jsdom, stub `HTMLMediaElement.prototype.play`/`.pause`
(jsdom does not implement real audio playback — this is the standard jsdom workaround, not a
project-specific one), and assert `play()` is invoked when a phase's message renders and `pause()`
is invoked on unmount/navigation. **Two runs are required** (FR-004 is explicit that a single
combined pass is insufficient): one that never triggers Hint, one that triggers Hint at least once
— because Hint interaction is documented (epic Non-obvious facts / acceptance scenario 6) to prevent
some phases (including the reward message) from ever being reached, which is a **known, separate**
defect this story does not fix, only characterizes. `ResizeObserver` must be stubbed before
importing `Board`/anything that renders it (`testing-conventions.md` "jsdom does not implement
`ResizeObserver`" section) since `SocraticScreen` renders a `Board`.

## R10 — Coverage/prune test must not touch the real audio directory destructively (FR-001/FR-002)

**Decision**: `pruneOrphanedLessonAudio(allLessons, dir)` (`server/lessonAudio.js:250`) calls
`fs.unlinkSync` on every file in `dir` not in the referenced set. Verified the function accepts a
`dir` override explicitly labeled "test-only seam" in its own doc comment. The FR-002 regression test
must **never** call this against the real `public/audio/lessons/` directory — even though the
current baseline is `{deleted: 0}` (verified via the epic's own harvested walker output: "referenced
348, disk 348, ORPHANS 0"), a future stale clip in that directory would otherwise be silently
deleted by the test suite itself. Decision: the test copies the real `public/audio/lessons/*.mp3`
files into a fresh `os.tmpdir()` directory (or, cheaper, only fabricates the `Set` comparison without
touching the filesystem: read `fs.readdirSync(LESSON_AUDIO_DIR)` for the real disk listing, compute
`collectReferencedAudio(getLessonsAll())` for the real referenced set, and assert the two agree via
plain `assert.deepEqual` on sorted arrays — this exercises the exact same invariant `prune-audio`
enforces without ever calling `pruneOrphanedLessonAudio`'s destructive `fs.unlinkSync` path against
production files). The second approach is simpler and is the plan's recommendation; a true
end-to-end exercise of `pruneOrphanedLessonAudio` itself belongs in a copied-tempdir test, which is
optional/nice-to-have, not required for FR-002's literal "reports zero files deleted" claim.

## R11 — `generate-lesson-audio.mjs` pacing design (FR-031)

**Decision**: model this CLI after the existing `scripts/generate-tts.js`'s CLI conventions
(real `--help` with purpose/options/defaults/exit-0-before-arg-validation — per this project's
memory `feedback_scripts_meaningful_help`) but targeting
`POST /api/admin/lessons/:id/generate-audio` (per-lesson, per-language) instead of the coach
registry. Needed flags per FR-031: `--lesson <id>` (repeatable or comma-separated; default = all 15),
`--lang <en|es|all>` (default `all`), pacing between requests (a fixed inter-request delay, e.g.
500ms–1s, is sufficient — the shared limiter is 120 req/min per IP per memory
`project_api_rate_limit_breaks_bulk_scripts`, so a full 15×2=30-request corpus pass at even 1
req/sec finishes in 30s, comfortably under the limiter), and 429 handling: on a 429, read the
`RateLimit-Reset` response header (verified as the header name FR-031 names explicitly) and sleep
until that time before retrying, and **do not** attempt `res.json()` on a 429 body without a
try/catch — memory `project_api_rate_limit_breaks_bulk_scripts` explicitly warns the limiter's 429
body is **plain text**, not JSON, and an unguarded `.json()` call throws an opaque decode error that
masks the real 429. Decision: read the response as `.text()` first, then attempt `JSON.parse` only in
a try/catch, falling back to treating the raw text as the message.

## Summary of resolved unknowns

| Area | Resolution |
|---|---|
| Language/runtime | Node.js (ESM `.mjs`/`.js`), React (JSX) — matches existing `connect-four/` stack, no new language |
| Testing | `node:test` (pure + DOM via `test:dom`'s jsdom harness) — no new framework |
| Storage | No new tables; migration 059's composite PK already supports FR-016's fix; no schema change needed anywhere in this epic |
| New endpoints | One: `GET /api/admin/lessons/:id/audio-status` (read-only, derived) |
| Changed endpoints | `POST /api/admin/lessons/:id/generate-audio` (optional `locator` body field); `GET /api/user/tts/deep-reveal` (movestring validation fix); `POST /api/admin/tts/cleanup` (locale-scoped update) |
| New CLI | `connect-four/scripts/generate-lesson-audio.mjs` |
| New test files | lesson audio coverage/prune (`tests/lessons/`), Socratic narration DOM test (`tests/dom/`), 3 correctness-fix regression tests, 1 synthesis-seam regression test |
