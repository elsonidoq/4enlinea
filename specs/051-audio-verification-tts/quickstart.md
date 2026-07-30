# Quickstart: verifying Epic 5 (Audio Verification & TTS Management)

Run from `connect-four/` unless noted. Always `eval "$(./worktree-ports.sh)"` from the repo root
first (never bare `3001`/`5173`), and restart `$API_PORT` before any generate/prune run (OI-43 stale
cache).

## 1. Automated regression suite

```bash
cd connect-four && npm run test:fast
```
Must be green except the two pre-existing, unrelated failures documented in this epic's handoff
context (`renderCoverageCorpus.test.mjs`, `renderCoverageUniverse.test.mjs` — ENOENT on corpora that
live in `server/scripts/fv_suff/`, not this epic's concern). New tests this epic adds must appear in
the run's output by their distinctive test names (per `testing-conventions.md`'s "stale registration"
trap — grep the output, don't trust exit code alone):

```bash
npm run test:fast 2>&1 | grep -c "lesson.*coverage\|audio.*coverage"   # FR-001/002 test
npm run test:fast 2>&1 | grep -c "resolveSynthesisConfig\|refuses legacy model"  # FR-029 seam test
npm run test:fast 2>&1 | grep -c "cleanup.*locale\|position_hash.*locale"  # FR-016 test
npm run test:fast 2>&1 | grep -c "stub.*(lang|en.*es)\|not called bare"  # lessonAudio.test.js rewrite (FR-026/027)
```
**Reminder**: `npm test` and `npm run test:fast` each enumerate their test files explicitly in
`package.json` (`package.json:16` and `:17`) — a new test file not added to **both** lists runs in
neither suite, silently. Verify every new/changed test file (`ttsProvider.test.js`,
`lessonAudioCoverage.test.js`, etc.) actually appears in the grepped output above, not just that the
command exits 0.

```bash
npm run test:dom   # FR-004 Socratic narration test lives here
```

## 2. Lesson audio coverage + orphan check (FR-001/FR-002/US1)

```bash
node -e "
  const { collectMessages, collectReferencedAudio } = require('./server/lessonAudio');
  const fs = require('fs');
  const path = require('path');
  const lessons = fs.readdirSync('lessons').filter(f => f.startsWith('lesson-')).map(f => JSON.parse(fs.readFileSync('lessons/' + f)));
  let missing = 0;
  for (const lesson of lessons) {
    for (const { message, locator, textKey, audioKey } of collectMessages(lesson)) {
      for (const suf of ['', '_es']) {
        const text = message[textKey + suf];
        if (typeof text === 'string' && text.trim() !== '') {
          const audio = message[audioKey + suf];
          if (!audio) { console.log('MISSING AUDIO', lesson.id, locator, suf); missing++; }
          else if (!fs.existsSync(path.join('public', audio))) { console.log('FILE NOT ON DISK', lesson.id, locator, audio); missing++; }
        }
      }
    }
  }
  const referenced = collectReferencedAudio(lessons);
  const disk = new Set(fs.readdirSync('public/audio/lessons').filter(f => f.endsWith('.mp3')));
  const orphans = [...disk].filter(f => !referenced.has(f));
  console.log({ missing, referencedCount: referenced.size, diskCount: disk.size, orphanCount: orphans.length });
"
```
Expected: `{ missing: 0, orphanCount: 0 }`. This must match the epic's harvested baseline (207
messages / 414 fields / 348 mp3s, 0 orphans) — if it doesn't, the content drifted since this epic was
written and US1's currency check needs re-running before proceeding to US5.

## 3. Coach fleet currency check (FR-006)

```bash
node -e "
  const fs = require('fs');
  const reg = JSON.parse(fs.readFileSync('server/tts-registry.json'));
  const hist = {};
  for (const e of reg) { const d = (e.generated_at || '').slice(0,10); hist[d] = (hist[d]||0)+1; }
  console.log(hist);
"
```
Compare the max date against the model-switch commits (`9d0e952`, `ff196c9`, 2026-07-14). Any
`generated_at` before that date is stale (US5.5 target).

## 4. Single-synthesis-path manual smoke (FR-026/027/028, after implementation)

```bash
node --env-file=server/.env -e "
  import('./server/ttsProvider.js').then(async ({ synthesize, synthesizeRaw }) => {
    try { await synthesize('hola'); console.log('FAIL: no-lang call should have thrown'); }
    catch (e) { console.log('OK: no-lang call threw:', e.message); }
    const buf = await synthesize('hola, ¿cómo estás?', 'es');
    console.log('OK: es synthesis succeeded, bytes=', buf.length);
    try { await synthesizeRaw('test', { voice: 'alloy', model: 'tts-1', speed: 1.0, instructions: '' }); console.log('FAIL: legacy-model synthesizeRaw call should have thrown'); }
    catch (e) { console.log('OK: synthesizeRaw refused legacy model too:', e.message); }
  });
"
```

## 5. Deep-reveal opening-move fix (FR-017/OI-23)

```bash
curl -s "http://localhost:\$API_PORT/api/user/tts/deep-reveal?moveString=&col=3&lang=en" -o /dev/null -w "%{http_code}\n"
```
Must NOT be 400 (will be 404 if no cached explanation exists yet for the empty position — that's a
different, legitimate response; the point is it must not reject on the empty `moveString` itself).

## 6. Blunder one-liner localization (FR-019/020, US4)

**Run the discovery step first, before trusting either smoke test below.** `research.md` R7 found no
frontend caller of plain `/api/explain-move` (`grep -a -rn "explain-move" src/` — only
`/api/explain-move-llm` is called, from `DeepRevealPane.jsx:173`) and no `oneLiner`/`one_liner`
consumer in `src/` at all. Confirm which response actually renders the one-liner a learner sees by
opening the app, triggering a mistake review, and inspecting the Network tab for the real request —
capture it as evidence. Only then run the smoke test against whichever endpoint discovery confirms.

**Smoke test IF discovery confirms `composeExplanation`/`/api/explain-move`** (the plan's originally
named target — not yet confirmed live, see above):
```bash
curl -s -X POST "http://localhost:\$API_PORT/api/explain-move" \
  -H "Content-Type: application/json" -H "Accept-Language: es" \
  -d '{"moves":"33","candidateCol":2}' | node -e "process.stdin.once('data', d => console.log(JSON.parse(d).oneLiner))"
```
Use a **fresh** (never-before-requested) `moves`/`candidateCol` pair so the cache is genuinely
missed — a cached English row from before this fix will otherwise be served unchanged (FR-021's
documented, intentional behavior).

**If discovery instead confirms a different live path** (e.g. `/api/explain-move-llm` →
`computeMechanism`, which is already locale-threaded per `research.md` R7 but currently writes
`one_liner: ''`): replace the curl above with the equivalent request against that endpoint and field.
**If discovery finds no path renders a one-liner today**, this quickstart step does not apply — see
US4's re-scope/defer outcome and the dated OI-28 closeout note instead.

## 7. Admin surface manual walkthrough (US2, staging_checks.md structural half)

1. Open `/admin/audio` (served from `$VITE_PORT`, not `$API_PORT`).
2. Confirm a new "Lessons" section lists all 15 lessons.
3. Pick a lesson, toggle en/es, confirm messages group by slide/Socratic phase.
4. Play an existing clip inline; regenerate a single message; confirm only that message's status
   changes (not the whole lesson).
5. Confirm the pre-existing coach-audio status list / config editor / preview sandbox are visually
   and functionally unchanged (FR-013), except the model dropdown now offers only
   `gpt-4o-mini-tts` (FR-028 carve-out).
6. Regenerate an already-approved coach clip; confirm a warning appears before the request fires
   (FR-015).

## 8. staging_checks.md sign-off items (FR-003/FR-005, NOT gating US1/US5 completion)

Append to `staging_checks.md` under "Epic 5 — Audio Verification & TTS Management (open-issues-epics.md, spec 051)":
- [ ] One `es` lesson clip listened to from `$VITE_PORT`, confirmed genuine Spanish (not English
  under Spanish text).
- [ ] One `es` coach clip listened to from `$VITE_PORT`, confirmed genuine Spanish.
- [ ] Accent audit: a sample of Spanish clips (coach + lesson) sound Rioplatense/Argentine, not an
  English speaker reading Spanish phonetically.
