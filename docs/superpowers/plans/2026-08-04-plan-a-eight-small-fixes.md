# Plan A — Eight Small Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship eight independent, already-root-caused defect fixes on one branch, one `test:fast` run, one deploy.

**Architecture:** These fixes share nothing but their size and their branch. **Do not merge them into a common abstraction.** Six touch `src/` (coach speech plumbing, an onboarding coach line, post-login return, a removed audio play site, a dirty-check, a removed button); two touch `server/` (the deep-reveal TTS seam and a regex in the render guard). The only genuine coupling is the ordering constraint in "Task order" below.

**This plan ships in two increments.** Tasks 1–2 (`server/reasonRenderGuard.mjs` + one call site in `server/index.js`) are a **separately-landable first increment** that merges to the shared base ahead of the other six fixes, because the deep-reveal grounding epic is blocked on it. See "Increment 1" below — read it before starting.

**Tech Stack:** React 18 + Vite (`connect-four/src`), Express + Supabase (`connect-four/server`), `node:test` + `node:assert/strict`, ESLint 9 flat config, i18next (`en.json`/`es.json`), OpenAI TTS via `server/ttsProvider.js`.

---

## Global Constraints

Every task's requirements implicitly include this section.

- **Test command is `npm run test:fast`, run from inside `connect-four/`.** Baseline measured on this worktree at `a3a8936`, 2026-08-04: `ℹ tests 1739 / ℹ pass 1739 / ℹ fail 0 / duration_ms 37079`. **Judge yourself against 0 failures.**
- **`test:fast` runs ESLint first** (`package.json` `test:fast` = `eslint . && node --test …`). A lint **error** anywhere means **zero tests run**. `npm run lint` reports ~47 pre-existing `react-hooks/*` warnings (OI-119) — warnings are fine, do not "fix" them.
- **`node --test` cannot parse JSX.** Testable logic goes in `src/lib/*.js`, never in a `.jsx` screen. New `.jsx` render tests go in `tests/dom/*.dom.test.jsx` under the separate `npm run test:dom` script.
- **New test files are NOT auto-discovered.** Register every new file by name in the `test` and `test:fast` scripts in `connect-four/package.json`. Verify registration **by name** (`npm run test:fast 2>&1 | grep -c "<distinctive test name>"` → non-zero), never by absence-of-error — `node --test` given a *list* silently skips missing paths with exit 0.
- **Every new user-facing string goes in BOTH `src/i18n/en.json` and `src/i18n/es.json`.** `tests/unit/i18nKeyParity.test.js` fails on any divergence. Spanish must be **Argentinian/Rioplatense (voseo)** — `tocá`, not `toca`; `vos`, not `tú`.
- **Coordinates are 0-indexed internally** (row 0 = bottom, col 0 = leftmost). Player 1 = `X`/GREEN; Player 2 = `O`/GRAY. In user-facing copy say **green/gray**, never red/yellow.
- **Worktree ports:** before starting, restarting, or killing any dev server, run `eval "$(./worktree-ports.sh)"` from the repo root and use only `$API_PORT`/`$VITE_PORT`. Never `pkill node`, never a bare port number.
- **Committing — ruling of 2026-08-04, supersedes the earlier "do not commit" constraint.** Commit normally, but **only on the worktree branch `worktree-plan-a-eight-fixes`**. The original no-commit rule exists to protect the owner's own WIP on `stagging`/`main`; this branch has none, and subagent-driven execution needs commits for its review diffs and its post-compaction recovery map. Two parts of the old rule still stand and are not negotiable: **stage explicit paths only — never `git add -A`** (a background process auto-commits *staged* work unpredictably), and run `git status --short` before every staging so you know exactly what you are adding. Never commit to `stagging` or `main`, and never merge this branch yourself.
- **Pre-launch data rule.** Staging and production are disposable; nobody uses them. Production work is a **note in `docs/deployment_steps.md`**, not tooling, not a migration, not a backfill.

---

## Three lanes are running in parallel — read this before touching a shared file

Two other sessions are working in their own worktrees off the same base:

| Lane | Scope | Overlaps this plan at |
|---|---|---|
| **Plan A** (this plan) | eight small fixes | — |
| **Plan B** | mobile viewport: root sizing, `100vh` → `100dvh`, scroll containers | `ReviewScreen.jsx`, `SettingsScreen.jsx`, `HomeScreen.jsx`, `GameScreen.jsx` |
| **Epic 11** | deep-reveal grounding | `server/reasonRenderGuard.mjs` — **blocked on this plan** |

### Increment 1 — Tasks 1 and 2 land first, on their own

**This plan owns `server/reasonRenderGuard.mjs`.** Epic 11's US3 rebases onto *this plan's* version of `stripInternalTokens` — its own evidence doc says so (quoted under "Task order" below: *"Both ship first, in the small-fixes plan — this epic depends on text and audio already deriving from one sanitized string"*). Until Increment 1 lands on the shared base, that lane is blocked.

So **Tasks 1 and 2 are finished, verified and merged before Tasks 3–9 begin.** They are cleanly separable:

- **Files touched:** `server/reasonRenderGuard.mjs`, `server/index.js`, `server/tests/reasonRenderGuard.test.mjs`, `docs/architecture/server-conventions.md`. Nothing under `src/`.
- **No `package.json` edit.** `server/tests/reasonRenderGuard.test.mjs` is **already registered** in both `test` and `test:fast` — verified in the current script string. Increment 1 therefore does **not** touch the contended `test:fast` line at all, so it cannot conflict with either other lane.
- **No overlap with Plan B**, which is `src/`-only.
- **Merge order:** Increment 1 → shared base → tell the Epic 11 lane to rebase → then continue with Tasks 3–9 here.

What Epic 11 inherits from Increment 1, and should not re-derive:
- `RANGE_RE` matching `-`, `–`, `—`, `−` with optional surrounding whitespace (its acceptance criterion 2 says *"No raw square (`cNrM`, `cN`, `cN–cM` in any dash form) reaches the client"* — the dash-form half is done).
- `buildTtsSpeechText(raw, locale)` as the single audio-seam entry point, so US2/US3's promotion work fixes the screen and the voice together instead of twice.
- `stripAnnotationsForTTS` now living in `reasonRenderGuard.mjs` as a named export rather than being private to `server/index.js`.

**If a task in Increment 1 has to change `stripInternalTokens`'s signature or its zone-tag handling, stop and coordinate** — that is the exact seam the other lane is rebasing onto. Neither task in this plan needs to: Task 1 widens one character class inside `RANGE_RE`, Task 2 only composes existing functions.

### File ownership on the four shared screens

On `ReviewScreen.jsx`, `SettingsScreen.jsx`, `HomeScreen.jsx` and `GameScreen.jsx`, ownership splits by *kind of change*, not by file:

- **This plan owns content and behavior** — i18n strings, coach messages, effects, handlers, conditional rendering, props.
- **Plan B owns layout** — root container styles, `minHeight`/`height` on the outermost `div`, `100vh` → `100dvh`, `overflow`/scroll containers, and the flex/grid scaffolding that positions the top-level regions.

**Do not change root container styles in those four files.** Concretely, leave alone every `style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}` on the outermost element (it appears in all four). If a fix here appears to *need* a layout change, it does not — stop and flag it instead of editing across the line.

Task-by-task consequences:

- **Task 5 (fix 2)** — add the onboarding coach line **through the existing `CoachDialog` messages path**: push another `{ text, mood }` object onto the `coachMessages` array that `<CoachDialog fixed messages={coachMessages} />` already receives. **Do not add new markup, a new wrapper, or a new element to that screen.** Plan B is restructuring `ReviewScreen`'s layout concurrently, and new markup is what turns a clean merge into a hand-resolved one. The task as written already does exactly this — keep it that way.
- **Task 7 (fix 6)** — deletes two buttons from `SettingsScreen`, one of which sits in a wrapper `div` that becomes empty. Deleting that now-empty wrapper is **content**, not layout: it exists solely to hold the removed button. Delete it, but do not touch the sibling `devReset` wrapper or the screen's root container.
- **Task 4 (fix 4)** — removes an effect and changes an i18n key in `HomeScreen`. Behavior only. The `<CoachDialog>` element itself keeps its position and props shape.
- **Task 3 (fix 1)** — `GameScreen`'s change is confined to one effect and one destructuring statement. No JSX moves.

### Open-issue numbering

**Use OI-148 … OI-159 and nothing else.** The highest existing entry is **OI-147** (in the main checkout's uncommitted `docs/open_issues.md`), and all three lanes would otherwise claim OI-148. This plan's allocation is **OI-148, OI-149, OI-150, OI-151** (Task 9). If a task needs another, take the next free number **within 148–159**; do not go past 159, and do not renumber an entry another lane has already written.

### `package.json` — the contended `test:fast` line

`connect-four/package.json` line 17 is a single ~180-entry line, and all three lanes append to it. To keep the merge mechanical rather than a three-way single-line conflict, here is **every** test-file registration this plan makes, in full:

| Test file | Added by | Register in |
|---|---|---|
| `tests/unit/coachSpeechCursor.test.js` | Task 3 | `test` **and** `test:fast` |
| `tests/unit/deepRevealReturnTo.test.js` | Task 6 | `test` **and** `test:fast` |

**That is the complete list — two files, both in Increment 2, both under `tests/unit/`.** Nothing else in this plan touches `package.json`.

Two rules for the person applying them:

- **Append both at the very end of each script string**, after the current last entry. Appending at the end makes a conflict a trivially-resolvable union; inserting them "logically" next to the other `tests/unit/` entries puts three lanes' edits in the same region of one line and guarantees a manual resolution.
- **After any merge involving this line, re-verify registration by name**, not by exit code — `node --test` given a *list* silently skips a path that isn't there, exits 0, and still prints `fail 0`:

  ```bash
  cd connect-four && npm run test:fast 2>&1 | /usr/bin/grep -c "speaks BOTH keys when two updates land in one React batch"
  cd connect-four && npm run test:fast 2>&1 | /usr/bin/grep -c "MistakeDetailScreen stashes the screen key it is registered under"
  ```

  Both must be non-zero. A lane that drops another lane's entry during conflict resolution loses that coverage with **zero** signal.

### Worktree divergence — read before editing any doc

This plan was written in the worktree `.claude/worktrees/plan-a-eight-fixes`, branched from `a3a8936`. The **main checkout has uncommitted edits** to `docs/open_issues.md`, `docs/deployment_steps.md`, `docs/deploy-runbook.md`, `docs/architecture/server-conventions.md`, `new_TODOs.md`, `staging_checks.md`, plus an **untracked** `docs/epics/deep-reveal-grounding-epic.md`. Consequences:

- The worktree's `docs/open_issues.md` tops out at **OI-143**; the main checkout tops out at **OI-147**. **New issues in this plan start at OI-148**, so they don't collide when the branch merges.
- `docs/epics/deep-reveal-grounding-epic.md` **does not exist in this worktree**. It is quoted below from the main checkout. Do not "create" it.
- Expect a merge on `docs/open_issues.md` and `docs/deployment_steps.md`. Append at the end of each file; do not restructure them.

---

## Verification ledger — where the brief was right, and where it was wrong

Every claim below was opened at source on 2026-08-04. **Line numbers drift; locate by symbol.**

| # | Brief's claim | Verdict | Evidence |
|---|---|---|---|
| 1 | `GameScreen` speech effect keyed on `[coachMessages.length]` | ✅ | `GameScreen.jsx:159-164` — `}, [coachMessages.length]);` |
| 1 | replace-mode makes a bubble silent | ✅ | `useGameBoard.js:179` `const replace = currentMoves.length === 0 && side === 'second';` → `:180` `updateCoach(t(phraseKey), mood, replace, phraseKey)`; array 1→1 |
| 1 | batched double-update speaks only the last key | ✅ | `useGameBoard.js:180` then `:184` in the same synchronous block |
| 1 | one call site passes a key with no audio slug | ✅ | `useGameBoard.js:303` `updateCoach(t('sparring.draw'), 'think', false, 'sparring.draw')` vs. correct sibling `:191` `'coach.spoken.sparring.outcome.draw'` |
| 1 | manifest is a 217-entry array of slugs | ✅ | `node -e` → `manifest isArray true len 217`; es also 217 |
| 1 | `sparring--draw` is not in the manifest | ✅ | `node -e` → `sparring.draw -> sparring--draw false` |
| — | **NEW:** hint toggle-OFF re-speaks the hint key | ⚠️ **found** | `useGameBoard.js:75` `setCoachMessages(preHintCoach)` shrinks the array → length changes → the effect fires again on the *same* `lastCoachKeyRef`. Fixed for free by Task 2. |
| — | **NEW:** `ChallengeScreen.jsx:235-245` has the identical `[coachMessages.length]` pattern | ⚠️ **found** | Out of scope (brief scoped fix 1 to GameScreen) → **OI-148** |
| 2 | `ReviewScreen` takes `onboarding`, renders a quality-colored Move Timeline | ✅ | `ReviewScreen.jsx:54` signature; `:407-459` timeline; `:47-51` `getQualityColor` |
| 2 | `generate-tts.js` is broken | ❌ **FALSE** | `node scripts/generate-tts.js --help` exits 0 with full usage. It has a real `--key` locator and `--lang all`. |
| 2 | omitting a locator re-synthesizes everything | ✅ (but N/A) | `--all-new` / `--reset` are the bulk forms; `--key <k>` is the locator. Use `--key`. |
| 2 | generating en and es back-to-back loses a write | ❌ **not for this script** | `generate-tts.js:552,569` — `--lang all` expands to `SUPPORTED_LOCALES` and loops **in one process**, and `loadRegistry(lang)`/`saveRegistry(lang)` are per-language files. One invocation with `--lang all` is the safe form. |
| 2 | `/admin/audio` has two players | ✅ | `AdminAudioPage.jsx:639` (sandbox player) and `:927` (per-key list player) |
| 2 | `OPENAI_API_KEY` is present | ✅ | `connect-four/server/.env` (copied into this worktree). Never defer TTS as "needs a key". |
| — | **NEW & LOAD-BEARING:** approving a clip **rebuilds** the manifest from registry status and silently drops slugs that are in the manifest but not `approved` | ⚠️ **found** | `server/index.js` `writeTtsManifest`: `entries.filter(e => e.status === 'approved').map(e => e.slug).sort()`, called by `POST /api/admin/audio/approve`. Today **5 en slugs** and **1 es slug** are in the manifest but *not* approved (harvested list in Task 4). Approving anything without handling them turns `coachSpokenNamespace.test.js`'s orphan check **RED** and silences 5 live English clips — two of which are `sparring.outcome.loss`/`win`, the exact clips Task 2 makes audible. Contradicts `coach-audio-conventions.md`'s own "never rebuild it from registry status" rule → **OI-149**. |
| 3 | `postLoginReturn.js` machinery exists; one consumption point | ✅ | `postLoginReturn.js:28,36,62`; sole consumer `App.jsx:135-139` |
| 3 | two sites open AuthModal without stashing | ✅ | `MistakeDetailScreen.jsx:530` `onClick={() => setAuthOpen(true)}`; `DeepRevealPane.jsx:201` `if (res.status === 401) { setLoading(false); setAuthOpen(true); return null; }` |
| 3 | `clearReturnTo` must fire on dismiss; AuthModal already imports it | ✅ **already satisfied — read the code** | `AuthModal.jsx:13-16` `function handleDismiss() { clearReturnTo(); onClose(); }`, wired to both the backdrop (`:20`) and the dismiss button (`:52`). Both new callers get it for free. **No task needed**; do not add one. |
| 3 | determine the right screen key — do not guess | ⚠️ **the obvious guess is WRONG** | `screenRegistry.jsx:37-38`: `mistakeDetail: (p) => <MistakesListScreen {...p} />` and `blunderDetail: MistakeDetailScreen`. `MistakeDetailScreen` is registered under **`blunderDetail`** (`/blunder/:id`, `paramNames: ['id']`). Stashing `'mistakeDetail'` would return the user to a **different screen**. |
| 4 | `HomeScreen` has a `spokeRef` effect playing `coach.spoken.home.welcome.0` | ✅ | `HomeScreen.jsx:24-30`, with the justifying comment at `:20-23` |
| 4 | the text is still needed on screen | ✅ | `HomeScreen.jsx:141` `<CoachDialog messages={[{ text: t('coach.spoken.home.welcome.0'), mood: 'happy' }]} />` — so the **key cannot simply be deleted** |
| 4 | is there a test that every `coach.spoken.*` key has a play site? | ❌ **no such test** | `tests/unit/coachSpokenNamespace.test.js` — read in full; it checks namespace shape, registry↔i18n, slug derivation, and manifest⇄mp3 parity. Nothing asserts reachability. Removing the play site alone breaks nothing. |
| 5 | the button is `disabled={saving}`; `papergamesId`/`savedValue` both set on mount | ✅ | `SettingsScreen.jsx:428`, `:36-37`, `:106-108` |
| 5 | **must verify** whether `handleSave` updates `savedValue` on success | ✅ **it does — the feared bug does not exist** | `SettingsScreen.jsx:155-157`: `if (res.status === 204) { setSavedValue(trimmed); setPapergamesId(trimmed); …}`. It *also* normalizes the input to the trimmed value, so the dirty check settles cleanly after a save. No extra fix required. |
| 6 | `handleReplayIntro` + two buttons | ✅ | `SettingsScreen.jsx:32-34`, `:344-351` (unauthenticated), `:476-484` (authenticated) |
| 6 | `HomeScreen` comment justifies anonymous Settings routing by Replay intro | ✅ | `HomeScreen.jsx:73-79` |
| 6 | `onboardingSource: 'settings_replay'` may become dead — check other producers | ✅ **it becomes fully dead** | `/usr/bin/grep -rn "onboardingSource" src/` → exactly one producer (`SettingsScreen.jsx:33`) and one consumer (`OnboardingMissionScreen.jsx:61`). `App.jsx:154` calls `go('onboardingMission')` with **no** params. |
| — | **NEW:** `frontend-conventions.md` §"Skip control + Settings 'Replay intro'" is **already stale** | ⚠️ **found** | It says the button "calls `go('game', ONBOARDING_GAME_PARAMS)` **directly**". The code calls `go('onboardingMission', …)`. Task 7 must correct it while removing it. |
| 7 | TTS handler never runs `stripInternalTokens` | ✅ | `server/index.js` `app.get('/api/user/tts/deep-reveal', …)`: `const cleanText = stripAnnotationsForTTS(rawText);` — and `/usr/bin/grep -n "reasonRenderGuard" server/index.js` shows only `guardExplainMovePayload, guardExplainMoveLlmPayload` imported (`:54`) |
| 7 | the handler already computes a locale | ✅ | `server/index.js` `const locale = resolveTtsLocale(lang, req.locale);`, ~`:3874`, before the cache lookup |
| 7 | `stripAnnotationsForTTS` is shared | ❌ **it is private and untested** | Declared at `server/index.js:3537` as a module-local `function`, one call site, `/usr/bin/grep -rn "stripAnnotationsForTTS" server/ src/ tests/` → 2 hits, both in `index.js`. Making the seam shared requires **moving** it. |
| 7 | audio cache key derives from the text | ✅ | `const textHash = createHash('sha256').update(cleanText).digest('hex'); const audioPath = \`tts/deep-reveal/${textHash}.mp3\`;` compared against `cacheEntry.audio_path` |
| 8 | `RANGE_RE` is ASCII-hyphen-only and the model types an en-dash | ✅ **reproduced** | `node -e "const R=/\bc(\d+)-c(\d+)\b/gi; …"` → `["c2-c5"] null`. Live through the production function: `stripInternalTokens('the c2–c5 strip','en')` → `'the column 2–column 5 strip'`, exactly staging's served text. |
| 8 | `BARE_COL_RE` is deliberately case-sensitive | ✅ | `reasonRenderGuard.mjs:40-46` — the comment names "C4" (Connect Four) as the reason. **Do not add an `i` flag.** |
| 8 | ranged rule must run before the bare rule | ✅ | `reasonRenderGuard.mjs:30-32` and the `rewrite` chain at `:90-94` |

---

## Task order, and why

```
── INCREMENT 1 — server-only; lands on the shared base BEFORE the rest ────────────────
Task 1  fix 8   RANGE_RE dash class            server/reasonRenderGuard.mjs
Task 2  fix 7   TTS shared sanitizer           server/reasonRenderGuard.mjs + server/index.js   ← depends on Task 1 for its combined fixture
        ►► MERGE, then tell the Epic 11 lane to rebase. No package.json edit; no src/ edit.

── INCREMENT 2 — the six src/ fixes ───────────────────────────────────────────────────
Task 3  fix 1   coach speech follows messages  src/lib/coachSpeechCursor.js + useGameBoard.js + GameScreen.jsx
Task 4  fix 4   remove home welcome audio      i18n + registry + manifest + mp3s + HomeScreen.jsx
Task 5  fix 2   onboarding "tap the chips"     ReviewScreen.jsx + i18n + a new coach clip        ← MUST follow Task 4 (manifest rebuild)
Task 6  fix 3   post-login return              MistakeDetailScreen / DeepRevealPane / ChallengeScreen
Task 7  fix 6   remove "Replay intro"          SettingsScreen.jsx + 3 doc/comment sites
Task 8  fix 5   Papergames dirty-check         SettingsScreen.jsx                                 ← MUST follow Task 7 (same file)
Task 9          open issues + deployment_steps docs/
```

**The increment boundary is a merge point, not just a label.** Finish Tasks 1–2, run the full gate, merge them to the shared base, and hand off to the Epic 11 lane before starting Task 3. That lane is blocked until then; Tasks 3–9 are not blocked on anything.

Two hard orderings, both mechanical:

- **Task 4 before Task 5.** Task 5 approves a new clip via `/admin/audio`, which **rebuilds the manifest from registry status**. Task 4 is what removes the one `es` entry (`coach--spoken--home--welcome--0`, status `awaiting_approval`) that the rebuild would otherwise orphan.
- **Task 7 before Task 8.** Both edit `SettingsScreen.jsx`; doing the deletion first keeps the dirty-check diff clean.

**Task 2 is a prerequisite for a separate epic — do not drop it as cosmetic.** `docs/epics/deep-reveal-grounding-epic.md` (Epic 11, in the main checkout) says so verbatim under **NOT included**:

> **The TTS/text divergence and the en-dash range bug.** `GET /api/user/tts/deep-reveal` (`server/index.js`) reads the **raw** cached text and runs only `stripAnnotationsForTTS`, never `stripInternalTokens` — which is why the coach *speaks* "c5"/"c1r3" while the screen shows "column 5"/"column 1". And `RANGE_RE = /\bc(\d+)-c(\d+)\b/` (`reasonRenderGuard.mjs:33`) is an ASCII hyphen, so the model's en-dash `c2–c5` misses the range rule entirely. **Both ship first, in the small-fixes plan** — this epic depends on text and audio already deriving from one sanitized string, so that US2/US3 fix both surfaces at once.

Once Tasks 1–2 land, Epic 11's grounding work fixes the screen and the voice in one change instead of two.

---

## File structure

| File | Created / Modified | Responsibility | Task |
|---|---|---|---|
| `connect-four/server/reasonRenderGuard.mjs` | Modify | Widen `RANGE_RE`'s dash class; gain `stripAnnotationsForTTS` + the composed `buildTtsSpeechText` | 1, 2 |
| `connect-four/server/tests/reasonRenderGuard.test.mjs` | Modify | Dash-class cases + TTS-composition cases (already in `test:fast`) | 1, 2 |
| `connect-four/server/index.js` | Modify | Delete the private `stripAnnotationsForTTS`; import and call `buildTtsSpeechText(rawText, locale)` | 2 |
| `connect-four/src/lib/coachSpeechCursor.js` | **Create** | Pure `selectUnspokenKeys(messages, lastSpokenSeq)` — the whole testable core of fix 1 | 3 |
| `connect-four/tests/unit/coachSpeechCursor.test.js` | **Create** | Unit tests for both verified failure modes | 3 |
| `connect-four/src/lib/useGameBoard.js` | Modify | Stamp every coach message with `{key, seq}`; route the two raw `setCoachMessages` sites through it; fix the `sparring.draw` key | 3 |
| `connect-four/src/screens/GameScreen.jsx` | Modify | Effect depends on `coachMessages`, speaks every unspoken key | 3 |
| `connect-four/src/screens/HomeScreen.jsx` | Modify | Delete the `spokeRef` welcome-speech effect; repoint the bubble text at the new key | 4 |
| `connect-four/src/i18n/en.json`, `es.json` | Modify | Move `coach.spoken.home.welcome.0` → `coach.ui.homeWelcome` (T4); add `coach.spoken.sparring.review.onboarding.0` (T5) | 4, 5, 7 |
| `connect-four/server/tts-registry.json`, `.es.json` | Modify | Drop the `home.welcome.0` entry; gain the new review key | 4, 5 |
| `connect-four/public/audio/coach/{,es/}coach-audio-manifest.json` + mp3s | Modify | Manifest/asset parity | 4, 5 |
| `connect-four/src/screens/ReviewScreen.jsx` | Modify | Onboarding coach line + its narration | 5 |
| `connect-four/src/components/DeepRevealPane.jsx` | Modify | Optional `returnTo` prop; stash before the 401 AuthModal | 6 |
| `connect-four/src/screens/MistakeDetailScreen.jsx` | Modify | Stash `blunderDetail` before the gate button; pass `returnTo` down | 6 |
| `connect-four/src/screens/ChallengeScreen.jsx` | Modify | Pass `returnTo` for the non-lesson case | 6 |
| `connect-four/tests/unit/deepRevealReturnTo.test.js` | **Create** | Source-parse invariant: each screen stashes the key it is registered under | 6 |
| `connect-four/src/screens/SettingsScreen.jsx` | Modify | Delete `handleReplayIntro` + both buttons (T7); dirty-check the save button (T8) | 7, 8 |
| `connect-four/src/screens/OnboardingMissionScreen.jsx` | Modify | Drop the now-dead `onboardingSource` prop | 7 |
| `connect-four/src/lib/onboardingRouting.js` | Modify | Correct the FR-010 comment | 7 |
| `connect-four/package.json` | Modify | Register the two new test files in `test` **and** `test:fast` | 3, 6 |
| `docs/architecture/coach-audio-conventions.md` | Modify | Correct the `home.welcome.0` claim | 4 |
| `docs/architecture/frontend-conventions.md` | Modify | Correct the stale "Replay intro" section | 7 |
| `docs/architecture/server-conventions.md` | Modify | Document the single TTS sanitization seam | 2 |
| `docs/open_issues.md` | Modify | OI-148 … OI-151 (allocated range: **OI-148 … OI-159**) | 9 |
| `docs/deployment_steps.md` | Modify | One entry: TRUNCATE `explanation_cache` | 9 |

**Cross-lane annotations on that table:**

- **Increment 1 is the first four rows only** — `reasonRenderGuard.mjs`, `reasonRenderGuard.test.mjs`, `server/index.js`, `server-conventions.md`. Nothing else. In particular **`package.json` is not in Increment 1**.
- **`package.json` is the contended file.** Exactly two registrations, both in Increment 2: `tests/unit/coachSpeechCursor.test.js` (Task 3) and `tests/unit/deepRevealReturnTo.test.js` (Task 6). Append both at the **end** of the `test` and `test:fast` strings.
- **Four rows are shared with Plan B** — `ReviewScreen.jsx`, `SettingsScreen.jsx`, `HomeScreen.jsx`, `GameScreen.jsx`. This plan changes content and behavior in them; Plan B changes layout. Neither crosses.
- **`server/reasonRenderGuard.mjs` is owned by this plan** and the Epic 11 lane is blocked on it. Its signature must not change.

---

## Task 1: Widen `RANGE_RE` to the dashes the model actually types (fix 8)

**Files:**
- Modify: `connect-four/server/reasonRenderGuard.mjs` (locate by symbol `RANGE_RE`)
- Test: `connect-four/server/tests/reasonRenderGuard.test.mjs` (already registered in `test:fast`)

**Interfaces:**
- Consumes: nothing.
- Produces: `stripInternalTokens(text, locale)` unchanged in signature; its ranged-rewrite branch now fires for `-`, `–` (en-dash), `—` (em-dash), `−` (minus sign), with optional surrounding whitespace.

**Background (verbatim, `reasonRenderGuard.mjs`):**

```js
// Matches a RANGED internal-coordinate token, e.g. "c3-c6" (OI-126: this shape reached the
// player because the original guard only had CXRY_RE). Must run before BARE_COL_RE, or the bare
// pass would consume each endpoint separately and this rule would never see the pair.
const RANGE_RE = /\bc(\d+)-c(\d+)\b/gi;
```

Harvested evidence (Epic 11's evidence table, staging board `315444233213`): raw `"the c2–c5 strip"` → served `"column 2–column 5 strip"`. The range rule missed and `BARE_COL_RE` rewrote each endpoint separately.

- [ ] **Step 1: Reproduce the bug at the source layer**

Run from `connect-four/`:

```bash
node -e "const R=/\bc(\d+)-c(\d+)\b/gi; console.log('c2-c5'.match(R), 'c2–c5'.match(R))"
```

Expected (measured 2026-08-04): `[ 'c2-c5' ] null`

And through the production function:

```bash
node -e "import('./server/reasonRenderGuard.mjs').then(m=>console.log(JSON.stringify(m.stripInternalTokens('the c2–c5 strip','en'))))"
```

Expected: `"the column 2–column 5 strip"` — the staging bug, live.

- [ ] **Step 2: Write the failing tests**

Append to `connect-four/server/tests/reasonRenderGuard.test.mjs`. Match the file's existing import style (`import { test } from 'node:test'; import assert from 'node:assert/strict';` — check the top of the file and reuse it rather than adding duplicate imports).

```js
test('RANGE_RE matches every dash form the model types (fix 8)', () => {
  // Harvested from staging: the model writes an en-dash, not an ASCII hyphen.
  assert.equal(stripInternalTokens('the c2–c5 strip', 'en'), 'the columns 2 through 5 strip');
  assert.equal(stripInternalTokens('the c2—c5 strip', 'en'), 'the columns 2 through 5 strip');
  assert.equal(stripInternalTokens('the c2−c5 strip', 'en'), 'the columns 2 through 5 strip');
  assert.equal(stripInternalTokens('the c2 – c5 strip', 'en'), 'the columns 2 through 5 strip');
  // The ASCII form must keep working.
  assert.equal(stripInternalTokens('the c2-c5 strip', 'en'), 'the columns 2 through 5 strip');
});

test('the widened range rule localizes (fix 8)', () => {
  assert.equal(stripInternalTokens('the c2–c5 strip', 'es'), 'the columnas 2 a 5 strip');
});

test('widening the dash class does not corrupt "C4" (Connect Four)', () => {
  // BARE_COL_RE has no `i` flag on purpose; the range rule must not reintroduce the problem.
  assert.equal(stripInternalTokens('This is a C4 position', 'en'), 'This is a C4 position');
});

test('the range rule stays case-insensitive, as it already was', () => {
  // RANGE_RE carries /gi TODAY, so "C2-C5" already rewrites — this pins that PRE-EXISTING
  // behaviour so widening the dash class is a pure superset, not a silent semantic change.
  // Unlike BARE_COL_RE's bare "C4", an uppercase PAIR is not a plausible Connect Four
  // abbreviation, so there is no prose to protect here.
  assert.equal(stripInternalTokens('a C2-C5 strip', 'en'), 'a columns 2 through 5 strip');
  assert.equal(stripInternalTokens('a C2–C5 strip', 'en'), 'a columns 2 through 5 strip');
});

test('a dash range inside a zone spec is left byte-for-byte alone', () => {
  const spec = '[zone:cells:c4r1,c4r2]the c2–c5 strip[/zone:cells:c4r1,c4r2]';
  const out = stripInternalTokens(spec, 'en');
  assert.equal(out.startsWith('[zone:cells:c4r1,c4r2]'), true);
  assert.equal(out.endsWith('[/zone:cells:c4r1,c4r2]'), true);
  assert.equal(out.includes('columns 2 through 5'), true);
});
```

> **Verify the case-sensitivity split before writing these.** `CXRY_RE` and `RANGE_RE` carry `/gi`; `BARE_COL_RE` deliberately does **not** (`reasonRenderGuard.mjs`: *"'C4' is a common human abbreviation for Connect Four"*). The two tests above pin both halves so that widening the dash class is provably a superset of today's behavior and nothing else moves. **Do not add an `i` flag to `BARE_COL_RE`.**

- [ ] **Step 3: Run the tests and watch them fail for the right reason**

```bash
cd connect-four && node --test server/tests/reasonRenderGuard.test.mjs
```

Expected: the first three fail with actual `'the column 2–column 5 strip'` (and the es variant `'the columna 2–columna 5 strip'`). The ASCII assertion inside the first test passes. **Confirm the failure message shows the en-dash form producing two separate columns** — if it fails for any other reason, stop and diagnose.

- [ ] **Step 4: Widen the dash class**

Replace the `RANGE_RE` declaration, keeping its existing comment and extending it:

```js
// Matches a RANGED internal-coordinate token, e.g. "c3-c6" (OI-126: this shape reached the
// player because the original guard only had CXRY_RE). Must run before BARE_COL_RE, or the bare
// pass would consume each endpoint separately and this rule would never see the pair.
//
// The dash class covers every separator the model actually emits, not just ASCII hyphen-minus:
// U+002D hyphen-minus, U+2013 en-dash, U+2014 em-dash, U+2212 minus sign. Harvested from staging
// (Epic 11 evidence, board `315444233213`): the raw mechanism reads "the c2–c5 strip" with an
// EN-DASH, so the ASCII-only rule missed it and BARE_COL_RE rewrote each endpoint separately —
// the player was served "column 2–column 5 strip". Optional surrounding whitespace is allowed
// because a spaced en-dash ("c2 – c5") is ordinary typography for the same range.
const RANGE_RE = /\bc(\d+)\s*[-–—−]\s*c(\d+)\b/gi;
```

Do **not** touch `BARE_COL_RE`'s missing `i` flag, and do **not** reorder the `.replace()` chain in `rewrite`.

- [ ] **Step 5: Run the tests to verify they pass**

```bash
cd connect-four && node --test server/tests/reasonRenderGuard.test.mjs
```

Expected: PASS, 0 failures.

- [ ] **Step 6: Run the full gate**

```bash
cd connect-four && npm run test:fast
```

Expected: `ℹ fail 0`. Compare the `ℹ tests` count against the 1739 baseline — it should be 1739 + the number of tests you added.

---

## Task 2: Route the deep-reveal TTS seam through the same sanitizer as the HTTP seam (fix 7)

**Files:**
- Modify: `connect-four/server/reasonRenderGuard.mjs` (add two exports at the end)
- Modify: `connect-four/server/index.js` (delete the private `stripAnnotationsForTTS`; change the one call site in `app.get('/api/user/tts/deep-reveal', …)`; extend the import at `:54`)
- Modify: `docs/architecture/server-conventions.md` (repo root `docs/`, **not** under `connect-four/`)
- Test: `connect-four/server/tests/reasonRenderGuard.test.mjs`

**Interfaces:**
- Consumes: `stripInternalTokens(text, locale)` from Task 1 (with the widened dash class).
- Produces:
  - `export function stripAnnotationsForTTS(raw: string): string` — moved verbatim out of `server/index.js`.
  - `export function buildTtsSpeechText(raw: string, locale = 'en'): string` — the **single** function the TTS route calls. Defined as `stripAnnotationsForTTS(stripInternalTokens(raw, locale))`.

**The bug (verbatim, `server/index.js`, `app.get('/api/user/tts/deep-reveal', …)`):**

```js
    const rawText = cacheEntry.deep_reveal_json.explanation
      || cacheEntry.deep_reveal_json.fullText
      || '';
    if (!rawText) return res.status(404).json({ error: 'no explanation text available' });

    // Strip annotations for clean TTS speech
    const cleanText = stripAnnotationsForTTS(rawText);
```

The HTTP seam runs `stripInternalTokens` via `guardExplainMoveLlmPayload` (`reasonRenderGuard.mjs`, called at `server/index.js:1316`, `:1349`, `:1424`). The TTS seam never does. Both read the same `explanation_cache` row. That is the whole bug: **two seams, one cache, one sanitizer between them.**

**The function being moved (verbatim, `server/index.js:3537-3549`) — move it, do not retype it:**

```js
function stripAnnotationsForTTS(raw) {
  if (!raw) return '';
  return raw
    // Remove opening zone/term tags: [zone:col3], [zone:tg], [term:kbId], etc.
    .replace(/\[zone:[^\]]+\]/gi, '')
    .replace(/\[term:[^\]]+\]/gi, '')
    // Remove closing tags: [/zone:col3], [/term:kbId], etc.
    .replace(/\[\/zone:[^\]]+\]/gi, '')
    .replace(/\[\/term:[^\]]+\]/gi, '')
    // Collapse multiple spaces and trim
    .replace(/\s+/g, ' ')
    .trim();
}
```

**Ordering.** Run `stripInternalTokens` **first**. Be honest about why: for today's inputs the two orders produce identical output (`stripAnnotationsForTTS` deletes whole `[zone:…]`/`[term:…]` tokens, spec text included, so there is no surviving spec for `stripInternalTokens` to corrupt). The reason to fix the order is that it makes the TTS call **the same shape as the response seam** — `stripInternalTokens(text, locale)` applied to the raw cached string — so the two can never drift, and any future transform that *does* need to see zone delimiters (Epic 11 US2/US3 promotion) inherits the correct order for free. `stripInternalTokens` is zone-tag-aware by design (`reasonRenderGuard.mjs`, `ZONE_TAG_RE` and the `split`/`map`/`join` at the end of the function), because rewriting inside a spec turns `[zone:cells:c4r1,c4r2]` into `[zone:cells:column 4,column 4]`, which `src/lib/annotatedText.js`'s `isValidSpec` rejects — the client then **silently drops the highlight** with no error at any layer.

- [ ] **Step 1: Harvest the before/after values**

Run from `connect-four/` and keep the output — these are the fixtures:

```bash
node -e "
import('./server/reasonRenderGuard.mjs').then(m=>{
  function today(raw){ if(!raw) return '';
    return raw.replace(/\[zone:[^\]]+\]/gi,'').replace(/\[term:[^\]]+\]/gi,'')
      .replace(/\[\/zone:[^\]]+\]/gi,'').replace(/\[\/term:[^\]]+\]/gi,'')
      .replace(/\s+/g,' ').trim(); }
  const s = 'By playing c5 you threaten, but c6 is the tougher defense.';
  console.log('TODAY   :', JSON.stringify(today(s)));
  console.log('PROPOSED:', JSON.stringify(today(m.stripInternalTokens(s,'en'))));
});"
```

Measured 2026-08-04 (before Task 1, and unchanged by it):

```
TODAY   : "By playing c5 you threaten, but c6 is the tougher defense."
PROPOSED: "By playing column 5 you threaten, but column 6 is the tougher defense."
```

- [ ] **Step 2: Write the failing tests**

Append to `connect-four/server/tests/reasonRenderGuard.test.mjs`. Import the two new symbols alongside the existing ones.

```js
test('buildTtsSpeechText speaks what the screen shows (fix 7)', () => {
  // Harvested from staging (Epic 11 evidence table, board 3154): the coach SPOKE "c5"/"c6"
  // while the screen showed "column 5"/"column 6".
  assert.equal(
    buildTtsSpeechText('By playing c5 you threaten, but c6 is the tougher defense.', 'en'),
    'By playing column 5 you threaten, but column 6 is the tougher defense.',
  );
  // Board 315444233213134122: a paired cell coordinate.
  assert.equal(
    buildTtsSpeechText('A deep threat at c1r3 decides it.', 'en'),
    'A deep threat at column 1 decides it.',
  );
});

test('buildTtsSpeechText strips annotation markup as well (fix 7)', () => {
  assert.equal(
    buildTtsSpeechText('the [zone:col4]pivot[/zone:col4] at c3.', 'en'),
    'the pivot at column 3.',
  );
});

test('buildTtsSpeechText composes fix 8 with fix 7 (board 315444233213)', () => {
  // Together, the two fixes turn the raw en-dash range into a speakable phrase.
  assert.equal(
    buildTtsSpeechText('the c2–c5 strip; [zone:col4]column 4[/zone:col4] is the pivot.', 'en'),
    'the columns 2 through 5 strip; column 4 is the pivot.',
  );
});

test('buildTtsSpeechText honours the locale it is given (fix 7)', () => {
  assert.equal(
    buildTtsSpeechText('A deep threat at c1r3 decides it.', 'es'),
    'A deep threat at columna 1 decides it.',
  );
});

test('buildTtsSpeechText handles empty input the way the route expects', () => {
  assert.equal(buildTtsSpeechText('', 'en'), '');
  assert.equal(buildTtsSpeechText(null, 'en'), '');
});
```

> The Spanish fixture deliberately leaves the surrounding English prose untranslated — `stripInternalTokens` localizes only the coordinate word, and asserting the real output rather than an idealized sentence is the point.

- [ ] **Step 3: Run the tests to verify they fail**

```bash
cd connect-four && node --test server/tests/reasonRenderGuard.test.mjs
```

Expected: fails at **import** — `SyntaxError: The requested module './...' does not provide an export named 'buildTtsSpeechText'`. That is the right first failure.

- [ ] **Step 4: Move `stripAnnotationsForTTS` and add the composed export**

In `connect-four/server/reasonRenderGuard.mjs`, append at the end of the file:

```js
/**
 * Strip annotation markers from LLM explanation text for TTS speech.
 * Removes [zone:X]...[/zone:X] and [term:X]...[/term:X] tag wrappers,
 * keeping only the inner text. Also strips any leftover unmatched bracket tokens.
 *
 * Moved here from `server/index.js` (where it was a private function with one caller) so that
 * the audio seam and the HTTP response seam are provably the same code. See
 * `buildTtsSpeechText` below.
 *
 * @param {string} raw - Raw LLM explanation from deep_reveal_json.explanation
 * @returns {string} Clean prose suitable for TTS synthesis
 */
export function stripAnnotationsForTTS(raw) {
  if (!raw) return '';
  return raw
    // Remove opening zone/term tags: [zone:col3], [zone:tg], [term:kbId], etc.
    .replace(/\[zone:[^\]]+\]/gi, '')
    .replace(/\[term:[^\]]+\]/gi, '')
    // Remove closing tags: [/zone:col3], [/term:kbId], etc.
    .replace(/\[\/zone:[^\]]+\]/gi, '')
    .replace(/\[\/term:[^\]]+\]/gi, '')
    // Collapse multiple spaces and trim
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * The ONE function `GET /api/user/tts/deep-reveal` may use to turn a raw cached explanation into
 * speakable text.
 *
 * Both the HTTP response seam (`guardExplainMoveLlmPayload`) and the audio seam read the SAME
 * `explanation_cache` row. Until 2026-08-04 only the HTTP seam ran `stripInternalTokens`, so the
 * coach SPOKE "c5" / "c1r3" while the screen showed "column 5" / "column 1" (verified on staging;
 * see docs/epics/deep-reveal-grounding-epic.md's evidence table). Routing the audio seam through
 * this composed function is what makes the two surfaces derive from one sanitized string.
 *
 * ORDER IS PART OF THE CONTRACT: `stripInternalTokens` runs FIRST, exactly as it does at the
 * response seam. It is zone-tag-aware (see ZONE_TAG_RE above) precisely so a transform can run
 * while `[zone:...]` delimiters are still present without mangling their machine-readable specs.
 * Annotation removal is the last step. Do not swap these.
 *
 * @param {string} raw - `deep_reveal_json.explanation` (or the legacy `fullText`)
 * @param {string} [locale='en']
 * @returns {string}
 */
export function buildTtsSpeechText(raw, locale = 'en') {
  return stripAnnotationsForTTS(stripInternalTokens(raw, locale));
}
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
cd connect-four && node --test server/tests/reasonRenderGuard.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Delete the private copy and rewire the route**

In `connect-four/server/index.js`:

1. Extend the existing import (currently line 54):

```js
import { guardExplainMovePayload, guardExplainMoveLlmPayload, buildTtsSpeechText } from './reasonRenderGuard.mjs';
```

2. **Delete** the entire `function stripAnnotationsForTTS(raw) { … }` block *and its JSDoc* (locate by symbol; it sits between `resolveCoachText` and `readTtsRegistry`).

3. In `app.get('/api/user/tts/deep-reveal', …)`, replace:

```js
    // Strip annotations for clean TTS speech
    const cleanText = stripAnnotationsForTTS(rawText);
```

with:

```js
    // Sanitize + strip annotations through the SAME seam the HTTP response uses, so the coach
    // never speaks a coordinate the screen renders as "column N" (fix 7). `locale` is already
    // resolved above via resolveTtsLocale(lang, req.locale).
    const cleanText = buildTtsSpeechText(rawText, locale);
```

Leave the following lines untouched — the emptiness guard, the `textHash`, the `audioPath`, the cache-hit redirect, and the `synthesizeStream(cleanText, locale)` call all keep working unchanged.

- [ ] **Step 7: Prove no other caller was left behind**

```bash
cd connect-four && /usr/bin/grep -rn "stripAnnotationsForTTS" server/ src/ tests/ | /usr/bin/grep -v node_modules
```

Expected: exactly two hits, both in `server/reasonRenderGuard.mjs` (the definition and its use inside `buildTtsSpeechText`). **Use `/usr/bin/grep`, not bare `grep`** — the shell's `grep` is `ugrep` and the non-UTF-8 locale makes multibyte files read as binary, silently reporting zero matches.

- [ ] **Step 8: Confirm the server still boots**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea/.claude/worktrees/plan-a-eight-fixes && eval "$(./worktree-ports.sh)" && echo "API_PORT=$API_PORT VITE_PORT=$VITE_PORT"
```

Then start the server on `$API_PORT` per the project's usual dev command and confirm it binds without an import error (`buildTtsSpeechText` is imported at module scope, so a typo is a hard boot failure). Stop it by `$API_PORT` only — never `pkill node`.

- [ ] **Step 9: Document the seam**

Append to `docs/architecture/server-conventions.md`, in the deep-reveal / TTS area (find the nearest existing TTS or explanation-cache section rather than creating a top-level one):

```markdown
### Deep-reveal text and audio derive from one sanitized string

`GET /api/user/tts/deep-reveal` and `POST /api/explain-move-llm` read the **same**
`explanation_cache` row. Until 2026-08-04 only the HTTP seam ran `stripInternalTokens`
(via `guardExplainMoveLlmPayload`), so the coach *spoke* raw internal coordinates — "c5",
"c1r3" — while the screen rendered "column 5", "column 1".

The audio seam now calls exactly one function, `buildTtsSpeechText(raw, locale)` in
`server/reasonRenderGuard.mjs` — `stripAnnotationsForTTS(stripInternalTokens(raw, locale))`.
**Do not reintroduce a second sanitization path in `server/index.js`.** If a future change needs
different speech text, change `buildTtsSpeechText`, so both surfaces move together.

Two things that follow from this:

- **Order is part of the contract.** `stripInternalTokens` runs first, matching the response seam.
  It skips `[zone:…]` delimiters on purpose: rewriting inside a spec turns
  `[zone:cells:c4r1,c4r2]` into `[zone:cells:column 4,column 4]`, which the client's `isValidSpec`
  rejects — the highlight then disappears with no error at any layer.
- **The audio cache key is derived from the text.** `textHash = sha256(cleanText)` →
  `tts/deep-reveal/${textHash}.mp3`, compared against `explanation_cache.audio_path`. Any change
  to what `buildTtsSpeechText` returns invalidates every stored clip; see
  `docs/deployment_steps.md`.
```

- [ ] **Step 10: Run the full gate**

```bash
cd connect-four && npm run test:fast
```

Expected: `ℹ fail 0`.

- [ ] **Step 11: Close out Increment 1 and unblock the epic lane**

This is the merge point. Before starting Task 3:

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea/.claude/worktrees/plan-a-eight-fixes && git status --short
```

Expected — **exactly four paths**, and nothing under `src/` or `package.json`:

```
 M connect-four/server/index.js
 M connect-four/server/reasonRenderGuard.mjs
 M connect-four/server/tests/reasonRenderGuard.test.mjs
 M docs/architecture/server-conventions.md
```

If `connect-four/package.json` appears here, something registered a test file that did not need registering — `server/tests/reasonRenderGuard.test.mjs` is already in both scripts. Revert that edit; it is a guaranteed three-way conflict on the contended line for no benefit.

Commit the Increment 1 work on `worktree-plan-a-eight-fixes` (staging those four paths explicitly), then **stop — do not merge it yourself.** Report to the owner that Increment 1 is ready to merge, and state in the handoff:

- `stripInternalTokens(text, locale)` keeps its exact signature and its zone-tag-skipping behavior — Epic 11's US3 rebases onto it unchanged.
- `RANGE_RE` now covers `-`, `–`, `—`, `−` with optional surrounding whitespace, which satisfies the dash-form half of Epic 11's acceptance criterion 2.
- `buildTtsSpeechText(raw, locale)` is the single audio-seam entry point; `stripAnnotationsForTTS` moved out of `server/index.js` into `reasonRenderGuard.mjs` as a named export.

Then continue with Task 3.

---

## Task 3: Make coach speech follow *messages*, not array length (fix 1)

> **Shared file — `GameScreen.jsx`.** You own content and behavior; Plan B owns layout. This task changes one `useEffect` and one destructuring statement. **No JSX moves and no root container style changes.** Leave `style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}` on the outermost `div` exactly as it is.

**Files:**
- Create: `connect-four/src/lib/coachSpeechCursor.js`
- Create: `connect-four/tests/unit/coachSpeechCursor.test.js`
- Modify: `connect-four/src/lib/useGameBoard.js`
- Modify: `connect-four/src/screens/GameScreen.jsx`
- Modify: `connect-four/package.json` (register the new test in `test` **and** `test:fast`)

**Interfaces:**
- Produces:
  - `src/lib/coachSpeechCursor.js` → `export function selectUnspokenKeys(messages, lastSpokenSeq)` returning `{ keys: string[], nextSeq: number }`.
  - `useGameBoard` return shape gains nothing and **loses** `lastCoachKeyRef` (it becomes dead). Each entry of `coachMessages` gains two fields: `key: string|null` and `seq: number`.

**Why the current code is silent (all three verified):**

```js
// GameScreen.jsx — the effect
useEffect(() => {
  if (lastCoachKeyRef.current) {
    speakCoachMessage(lastCoachKeyRef.current);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [coachMessages.length]);
```

1. **replace-mode** — `useGameBoard.js`: `const replace = currentMoves.length === 0 && side === 'second';` then `updateCoach(t(phraseKey), mood, replace, phraseKey);`. The array goes 1 → 1. Length unchanged ⇒ effect never runs ⇒ that bubble is silent.
2. **batched double-update** — `updateCoach(coachText, coachMood, false, coachKey)` (the move feedback) and `updateCoach(t('sparring.aiWon'), 'oops', false, 'coach.spoken.sparring.outcome.loss')` (the game ending) land in one React batch. Length jumps by 2, the effect runs once, and `lastCoachKeyRef.current` holds only the **last** key.
3. **hint toggle-OFF re-speak (found while verifying)** — `handleHintToggle`'s OFF branch does `setCoachMessages(preHintCoach)`, shrinking the array. Length changes ⇒ the effect fires again on the *unchanged* `lastCoachKeyRef`, replaying the hint clip.

The single ref is the root cause: **speech is derived from a scalar that the message list can change without touching.** The fix makes each message carry its own key and a monotonic sequence number, and has the effect speak every message the cursor has not reached. All three modes fall out of that, and a bubble can no longer be added without its key being eligible to speak.

### The design

- `useGameBoard` owns a `seqRef` counter. **Every** write to `coachMessages` goes through one of two helpers that stamp `{ key, seq }`.
- `GameScreen`'s effect depends on `coachMessages` (the array), not its length, and keeps a `lastSpokenSeqRef` cursor.
- The hint-restore path writes back a **snapshot of already-stamped messages**, whose `seq`s are all ≤ the cursor — so nothing re-speaks. Bug 3 is fixed by construction, not by a special case.

- [ ] **Step 1: Write the failing test for the pure cursor**

Create `connect-four/tests/unit/coachSpeechCursor.test.js`:

```js
// Fix 1: the GameScreen coach-speech effect used to key on `coachMessages.length` and read a
// single `lastCoachKeyRef`, so (a) a replace-mode update (length 1 -> 1) never fired it,
// (b) a batched double-update (length +2, one run) spoke only the last key, and (c) restoring
// the pre-hint snapshot re-fired it on a stale key. This module is the pure core of the fix:
// each message carries its own key and a monotonic seq, and the screen speaks everything past
// its cursor.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectUnspokenKeys } from '../../src/lib/coachSpeechCursor.js';

const msg = (seq, key) => ({ text: 't', mood: 'happy', seq, key });

test('speaks a replace-mode message even though the array length did not change', () => {
  // FR-008 path: side === 'second' on an empty board replaces the intro bubble in place.
  const before = [msg(1, 'coach.spoken.sparring.intro.0')];
  const after = [msg(2, 'coach.spoken.ai_move.neutral.0')];
  assert.deepEqual(selectUnspokenKeys(before, 0).keys, ['coach.spoken.sparring.intro.0']);
  assert.deepEqual(
    selectUnspokenKeys(after, 1),
    { keys: ['coach.spoken.ai_move.neutral.0'], nextSeq: 2 },
  );
});

test('speaks BOTH keys when two updates land in one React batch', () => {
  // The move-feedback bubble and the game-ending bubble are appended in the same batch.
  const messages = [
    msg(1, 'coach.spoken.sparring.intro.0'),
    msg(2, 'coach.spoken.generic.optimal.0'),
    msg(3, 'coach.spoken.sparring.outcome.loss'),
  ];
  assert.deepEqual(
    selectUnspokenKeys(messages, 1),
    { keys: ['coach.spoken.generic.optimal.0', 'coach.spoken.sparring.outcome.loss'], nextSeq: 3 },
  );
});

test('restoring the pre-hint snapshot re-speaks nothing', () => {
  const snapshot = [msg(1, 'coach.spoken.sparring.intro.0')];
  // Hint ON appended seq 2 and it was spoken; hint OFF restores the snapshot.
  assert.deepEqual(selectUnspokenKeys(snapshot, 2), { keys: [], nextSeq: 2 });
});

test('a message with no key advances the cursor but speaks nothing', () => {
  const messages = [msg(1, 'coach.spoken.sparring.intro.0'), msg(2, null)];
  assert.deepEqual(selectUnspokenKeys(messages, 1), { keys: [], nextSeq: 2 });
});

test('the cursor never moves backwards', () => {
  assert.deepEqual(selectUnspokenKeys([], 7), { keys: [], nextSeq: 7 });
  assert.deepEqual(selectUnspokenKeys([msg(3, 'a')], 7), { keys: [], nextSeq: 7 });
});

test('keys come back in message order, not reversed', () => {
  const messages = [msg(5, 'first'), msg(6, 'second')];
  assert.deepEqual(selectUnspokenKeys(messages, 4).keys, ['first', 'second']);
});
```

- [ ] **Step 2: Register the test file and run it to verify it fails**

In `connect-four/package.json`, add `tests/unit/coachSpeechCursor.test.js` to **both** the `test` and `test:fast` script strings (place it next to the other `tests/unit/` entries).

```bash
cd connect-four && node --test tests/unit/coachSpeechCursor.test.js
```

Expected: `Error: Cannot find module '.../src/lib/coachSpeechCursor.js'`.

- [ ] **Step 3: Write the pure module**

Create `connect-four/src/lib/coachSpeechCursor.js`:

```js
// Fix 1 (2026-08-04). Coach speech must follow MESSAGES, not `coachMessages.length`.
//
// The old GameScreen effect was `useEffect(() => { if (lastCoachKeyRef.current)
// speakCoachMessage(lastCoachKeyRef.current); }, [coachMessages.length])`, with `useGameBoard`
// holding only the most recent key in one ref. Three verified consequences:
//   - a replace-mode update (array 1 -> 1) never fired the effect: that bubble was silent;
//   - two updates batched by React fired it once, so only the last key was ever spoken;
//   - restoring the pre-hint snapshot shrank the array and re-fired it on a stale key.
//
// Every coach message now carries its own `key` and a monotonic `seq`, and the screen keeps a
// cursor. This module is that cursor, extracted as a pure function because `node --test` cannot
// parse JSX and this is the part worth testing (see docs/architecture/testing-conventions.md,
// "Pure Function Extraction Pattern").

/**
 * Pick the coach keys that have not been spoken yet.
 *
 * @param {Array<{key?: string|null, seq?: number}>} messages - the current coach message list
 * @param {number} lastSpokenSeq - the highest `seq` already handed to speakCoachMessage
 * @returns {{keys: string[], nextSeq: number}} keys in message order, and the cursor to store.
 *   `nextSeq` is monotonic: it never goes below `lastSpokenSeq`, so restoring an older snapshot
 *   (the hint toggle-OFF path) cannot rewind the cursor and replay old clips.
 */
export function selectUnspokenKeys(messages, lastSpokenSeq) {
  const list = Array.isArray(messages) ? messages : [];
  const keys = [];
  let nextSeq = lastSpokenSeq;

  for (const m of list) {
    const seq = typeof m?.seq === 'number' ? m.seq : 0;
    if (seq <= lastSpokenSeq) continue;
    if (seq > nextSeq) nextSeq = seq;
    if (m?.key) keys.push(m.key);
  }

  return { keys, nextSeq };
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd connect-four && node --test tests/unit/coachSpeechCursor.test.js
```

Expected: `# pass 6`, `# fail 0`.

- [ ] **Step 5: Stamp every coach message in `useGameBoard.js`**

Locate by symbol, not line number. Make these edits:

**(a)** Below `const lastCoachKeyRef = useRef(null);`, replace that ref with a sequence counter:

```js
  // Fix 1: every coach message carries its own i18n key and a monotonic sequence number, so the
  // screen can speak each new bubble exactly once. The old single `lastCoachKeyRef` could not
  // express "two bubbles arrived in one batch" or "the array was replaced in place".
  const coachSeqRef = useRef(0);
```

**(b)** Replace the `updateCoach` helper with a stamping pair. Note the **new argument order**: `key` moves ahead of `replace` so that adding a bubble without a key reads as obviously wrong at the call site.

```js
  /**
   * Append (or, with `replace`, reset to) a coach bubble.
   *
   * `key` is REQUIRED and positional-third on purpose: a bubble with no i18n key can never be
   * spoken, so making it easy to omit is what caused fix 1. Pass an explicit `null` only for a
   * bubble that genuinely has no clip (there are none today in this hook).
   */
  function updateCoach(text, mood, key, replace = false) {
    if (import.meta.env.DEV && key === undefined) {
      throw new Error('updateCoach: `key` is required — pass an explicit null for an unspoken bubble');
    }
    const stamped = { text, mood, key: key ?? null, seq: ++coachSeqRef.current };
    setCoachMessages((prev) => (replace ? [stamped] : [...prev, stamped]));
  }
```

**(c)** The intro effect currently writes `setCoachMessages` directly and sets the ref. Route it through `updateCoach` so it is stamped:

```js
  // Show intro phrase on mount
  useEffect(() => {
    const key = pickRandomKey(t, introKey);
    updateCoach(t(key), 'happy', key, true);
  }, [t]); // eslint-disable-line react-hooks/exhaustive-deps
```

**(d)** Leave `handleHintToggle`'s OFF branch (`setCoachMessages(preHintCoach)`) **exactly as it is**. Those messages are already stamped and their `seq`s are ≤ the cursor, so `selectUnspokenKeys` returns nothing — the re-speak bug is fixed by construction. Add a one-line comment saying so:

```js
      if (preHintCoach) {
        // Already-stamped messages: every seq is <= the screen's cursor, so nothing re-speaks.
        setCoachMessages(preHintCoach);
        setPreHintCoach(null);
      }
```

**(e)** Update all remaining `updateCoach` call sites to the new argument order, and **fix the wrong key**. The complete set, with their new form:

```js
      // handleHintToggle
      updateCoach(t(key), 'think', key);

      // commitAiMove — FR-008 intro replacement
      const replace = currentMoves.length === 0 && side === 'second';
      updateCoach(t(phraseKey), mood, phraseKey, replace);

      // commitAiMove — AI win
      updateCoach(t('sparring.aiWon'), 'oops', 'coach.spoken.sparring.outcome.loss');

      // commitAiMove — draw
      updateCoach(t('sparring.draw'), 'think', 'coach.spoken.sparring.outcome.draw');

      // handleColumnClick — move feedback
      updateCoach(coachText, coachMood, coachKey);

      // handleColumnClick — user win
      updateCoach(t('sparring.youWon'), 'happy', 'coach.spoken.sparring.outcome.win');

      // handleColumnClick — draw. WAS 'sparring.draw', which has no audio slug
      // (`sparring--draw` is not in coach-audio-manifest.json). Now matches the AI-move
      // sibling above.
      updateCoach(t('sparring.draw'), 'think', 'coach.spoken.sparring.outcome.draw');

      // handleResign
      updateCoach(t('sparring.aiWon'), 'oops', 'coach.spoken.sparring.outcome.loss');
```

**(f)** Remove `lastCoachKeyRef` from the hook's return object.

- [ ] **Step 6: Update `GameScreen.jsx`**

Remove `lastCoachKeyRef` from the destructured `useGameBoard(...)` result. Add the import and replace the effect:

```js
import { selectUnspokenKeys } from '../lib/coachSpeechCursor.js';
```

```js
  // ── Audio: coach speech playback ─────────────────────────────────
  // Fix 1: keyed on the MESSAGE LIST, not its length. A replace-mode update leaves the length
  // unchanged (the bubble used to be silent) and a batched double-update raises it by 2 while
  // firing this effect once (only the last key used to be spoken). The cursor speaks each
  // message exactly once, in order.
  const lastSpokenSeqRef = useRef(0);
  useEffect(() => {
    const { keys, nextSeq } = selectUnspokenKeys(coachMessages, lastSpokenSeqRef.current);
    lastSpokenSeqRef.current = nextSeq;
    for (const key of keys) speakCoachMessage(key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachMessages]);
```

Confirm `useRef` is already imported in `GameScreen.jsx` (it is — the file uses `landingSoundTimerRef` and `onboardingSeenGateRef`).

- [ ] **Step 7: Prove no stale reference survives**

```bash
cd connect-four && /usr/bin/grep -rn "lastCoachKeyRef\." src/lib/useGameBoard.js src/screens/GameScreen.jsx
```

Expected: **zero** hits — no live `.current` read or write survives.

Note the trailing `\.` in that pattern, and do not drop it. A bare `lastCoachKeyRef` search returns **one** hit in `useGameBoard.js`: the explanatory comment Step 5(a) instructs you to write, whose text contains the words "The old single `lastCoachKeyRef`". That is prose, not a reference. To confirm the symbol is genuinely gone rather than merely unread, also check that it has no declaration and no entry in the hook's return object:

```bash
cd connect-four && /usr/bin/grep -n "const lastCoachKeyRef\|^    lastCoachKeyRef," src/lib/useGameBoard.js
```

Expected: zero hits. (`ChallengeScreen.jsx` has its own, unrelated `lastCoachKeyRef` — leave it alone; it is OI-148.)

- [ ] **Step 8: Verify the test file actually runs in the suite**

```bash
cd connect-four && npm run test:fast 2>&1 | /usr/bin/grep -c "speaks BOTH keys when two updates land in one React batch"
```

Expected: non-zero. A zero here means the file is registered nowhere and `node --test` skipped it silently with exit 0.

- [ ] **Step 9: Run the full gate**

```bash
cd connect-four && npm run test:fast
```

Expected: `ℹ fail 0`.

- [ ] **Step 10: Verify in the real app**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea/.claude/worktrees/plan-a-eight-fixes && eval "$(./worktree-ports.sh)"
```

Start the dev server on `$API_PORT`/`$VITE_PORT`, then, with speech enabled:

1. Start a sparring game as **second** player. The AI's opening reply replaces the intro bubble — **it must now be audible** (this is the replace-mode case).
2. Play to a loss. You must hear **two** clips in sequence: the move-feedback phrase, then `coach.spoken.sparring.outcome.loss`.
3. Play to a **draw** as the user. You must hear `coach.spoken.sparring.outcome.draw` (previously silent — the key had no slug).
4. Toggle the hint on, then off. The hint clip must play **once**, not twice.

Note the browser autoplay policy: the very first clip on a freshly loaded page waits for a user gesture (`useCoachSpeech.js`, `unlockAudio`). Click once before judging silence.

---

## Task 4: Remove the home welcome audio, and remove the orphan it would otherwise leave (fix 4)

> **Shared file — `HomeScreen.jsx`.** You own content and behavior; Plan B owns layout. This task deletes one effect, two now-unused imports, and swaps an i18n key inside an existing `<CoachDialog>` element. **The `<CoachDialog>` element keeps its position and its props shape**, and the screen's root container styles are untouched.

**Files:**
- Modify: `connect-four/src/screens/HomeScreen.jsx`
- Modify: `connect-four/src/i18n/en.json`, `connect-four/src/i18n/es.json`
- Modify: `connect-four/server/tts-registry.json`, `connect-four/server/tts-registry.es.json`
- Modify: `connect-four/public/audio/coach/coach-audio-manifest.json`, `connect-four/public/audio/coach/es/coach-audio-manifest.json`
- Delete: `connect-four/public/audio/coach/coach--spoken--home--welcome--0.mp3`, `connect-four/public/audio/coach/es/coach--spoken--home--welcome--0.mp3`
- Modify: `docs/architecture/coach-audio-conventions.md`

**Interfaces:**
- Produces: the i18n key `coach.ui.homeWelcome` (a leaf string in both locales). `coach.spoken.home` ceases to exist.

### The decision this task makes explicit

The brief asks: do the i18n key and the mp3 stay or go? **The key stays as a string but leaves the `coach.spoken.*` namespace; the mp3s go.** Reasoning, with citations:

- The key **cannot** be deleted outright: `HomeScreen.jsx:141` renders it as the visible bubble — `<CoachDialog messages={[{ text: t('coach.spoken.home.welcome.0'), mood: 'happy' }]} />`.
- It **cannot** stay under `coach.spoken.*` either. That namespace's documented meaning is *"declares intent to be voiced… A key under `coach.spoken.*` that no code path plays is therefore a bug in the player, to be fixed at the play site"* (`docs/architecture/coach-audio-conventions.md`, §"Intent, not reachability"). Leaving it there re-creates exactly the orphan whose "fix" was the effect we are now removing — the brief names this as how the regression happened.
- `coach.ui.*` is the namespace for *"screen chrome — labels, headings, counters rendered with `t()`"*, **never synthesized**. A welcome line rendered with `t()` and deliberately not voiced is chrome. `tests/unit/coachSpokenNamespace.test.js` requires `coach.ui.*` values to be **leaf strings**, so `coach.ui.homeWelcome` (not a `{0: …}` pool) is the correct shape.
- Once the key leaves `coach.spoken.*`, the registry entries and manifest slugs must go too, or `coachSpokenNamespace.test.js` fails on three separate assertions (registry key with no i18n string; a `coach.ui.*` slug in the manifest; an orphaned mp3). Deleting the mp3s is therefore not optional — it is what keeps the suite honest. Regenerating them later costs one `--key` invocation.

Harvested current state (2026-08-04):

```
en registry 218 {"approved":212,"awaiting_approval":5,"ineligible":1}  manifest 217
es registry 218 {"awaiting_approval":1,"approved":216,"ineligible":1}  manifest 217
en coach.spoken.home = {"welcome":{"0":"Let's sharpen your Connect Four tactics."}}
es coach.spoken.home = {"welcome":{"0":"Vamos a afilar tus tácticas de Cuatro en línea."}}
en registry entry: status "approved",          slug "coach--spoken--home--welcome--0"
es registry entry: status "awaiting_approval", slug "coach--spoken--home--welcome--0"
```

- [ ] **Step 1: Record the pre-change baseline**

```bash
cd connect-four && node -e "
for (const [lang,f,m] of [['en','./server/tts-registry.json','./public/audio/coach/coach-audio-manifest.json'],['es','./server/tts-registry.es.json','./public/audio/coach/es/coach-audio-manifest.json']]) {
  const r=require(f), man=require(m);
  console.log(lang, 'registry', r.length, 'manifest', man.length);
}"
```

Expected: `en registry 218 manifest 217` / `es registry 218 manifest 217`. After this task both registries are 217 and both manifests are 216.

- [ ] **Step 2: Move the i18n key**

In **both** `src/i18n/en.json` and `src/i18n/es.json`:

- Delete the whole `"home"` object under `coach.spoken` (it has exactly one descendant — verified above).
- Add a leaf under `coach.ui`, keeping the file's existing key ordering style:

```json
    "homeWelcome": "Let's sharpen your Connect Four tactics."
```

```json
    "homeWelcome": "Vamos a afilar tus tácticas de Cuatro en línea."
```

The Spanish string is copied **verbatim** from the current `es.json` value — this is a namespace move, not a retranslation. Do not "improve" it.

- [ ] **Step 3: Update `HomeScreen.jsx`**

Delete the entire `spokeRef` block **including its justifying comment** (locate by the symbol `spokeRef`):

```js
  // `coach.spoken.home.welcome.0` declares intent to be voiced (see
  // docs/architecture/coach-audio-conventions.md) but had no play site — the text was rendered
  // via t() only, so the clip never played. Mirrors OnboardingMissionScreen's startedRef guard
  // against React 18 StrictMode's double-mount.
  const spokeRef = useRef(false);
  useEffect(() => {
    if (spokeRef.current) return;
    spokeRef.current = true;
    speakCoachMessage('coach.spoken.home.welcome.0');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
```

Repoint the bubble at the new key:

```jsx
        {/* Home's welcome line is deliberately UNVOICED (2026-08-04) — hence `coach.ui.*`, not
            `coach.spoken.*`. See docs/architecture/coach-audio-conventions.md. */}
        <CoachDialog messages={[{ text: t('coach.ui.homeWelcome'), mood: 'happy' }]} />
```

Then remove the now-unused pieces: the `const { speakCoachMessage } = useCoachSpeech();` line and the `import { useCoachSpeech } from '../lib/useCoachSpeech.js';`. **Check whether `useRef` and `useEffect` are still used** — `HomeScreen.jsx` also has `fallbackCheckedRef` in a second effect, so both stay imported. Do not blind-delete the React import.

- [ ] **Step 4: Remove the registry entries**

Delete the single object whose `"key": "coach.spoken.home.welcome.0"` from **both** `server/tts-registry.json` and `server/tts-registry.es.json`. Preserve the files' formatting (2-space indent, trailing newline) — `writeTtsRegistry` writes `JSON.stringify(entries, null, 2) + '\n'`.

- [ ] **Step 5: Remove the manifest slugs and the assets**

Delete the string `"coach--spoken--home--welcome--0"` from both manifests, then:

```bash
cd connect-four && git rm public/audio/coach/coach--spoken--home--welcome--0.mp3 public/audio/coach/es/coach--spoken--home--welcome--0.mp3
```

(`git rm` stages exactly those two paths — that is a deliberate, explicit staging, consistent with the never-`git add -A` rule.)

- [ ] **Step 6: Verify parity by hand before trusting the suite**

```bash
cd connect-four && node -e "
for (const [lang,f,m,d] of [['en','./server/tts-registry.json','./public/audio/coach/coach-audio-manifest.json','public/audio/coach'],['es','./server/tts-registry.es.json','./public/audio/coach/es/coach-audio-manifest.json','public/audio/coach/es']]) {
  const fs=require('fs'), r=require(f), man=require(m);
  const onDisk=fs.readdirSync(d).filter(x=>x.endsWith('.mp3')).map(x=>x.slice(0,-4));
  const inMan=new Set(man);
  console.log(lang,'registry',r.length,'manifest',man.length,'mp3s',onDisk.length);
  console.log('  orphan mp3s:', JSON.stringify(onDisk.filter(s=>!inMan.has(s))));
  console.log('  home.welcome still referenced:', r.some(e=>e.key.includes('home.welcome')) || man.includes('coach--spoken--home--welcome--0'));
}"
```

Expected: `registry 217 manifest 216 mp3s 216`, `orphan mp3s: []`, `home.welcome still referenced: false`, for both languages.

- [ ] **Step 7: Correct the architecture doc**

In `docs/architecture/coach-audio-conventions.md`, §"Intent, not reachability", the parenthetical currently reads:

> (Two such latent bugs — `coach.spoken.home.welcome.0` and `coach.spoken.summary.perfect.{0,1}`, rendered via `t()` but never spoken — were fixed by adding the missing `speakCoachMessage` calls in `HomeScreen` and `PostSetSummaryScreen`, not by excluding the keys.)

Replace it with:

> (One such latent bug — `coach.spoken.summary.perfect.{0,1}`, rendered via `t()` but never spoken — was fixed by adding the missing `speakCoachMessage` call in `PostSetSummaryScreen`, not by excluding the key.
>
> **`coach.spoken.home.welcome.0` was the other, and on 2026-08-04 it was resolved the other way, deliberately: the owner did not want Home to speak on arrival.** The rule above still holds — the resolution was to move the string to `coach.ui.homeWelcome` and delete its registry entries, manifest slugs and mp3s, *not* to leave an unvoiced key sitting in `coach.spoken.*`. That is the shape of a legitimate "stop voicing this" change: **change the namespace, don't orphan the key.** Leaving it under `coach.spoken.*` with no play site is what made someone add a play site in the first place.)

- [ ] **Step 8: Run the full gate**

```bash
cd connect-four && npm run test:fast
```

Expected: `ℹ fail 0`. Two tests are the real check here: `tests/unit/coachSpokenNamespace.test.js` (`[en]`/`[es] every manifest slug resolves to an mp3 on disk, and no mp3 is orphaned`, and `no coach.ui.* key is TTS-tracked in the registry or the manifest`) and `tests/unit/i18nKeyParity.test.js`.

- [ ] **Step 9: Verify in the real app**

Load Home with speech enabled. The welcome bubble must still render its text and must be **silent**. Navigate away and back — still silent.

---

## Task 5: Tell the onboarding user to tap the red/orange chips (fix 2)

**MUST run after Task 4.** Approving a clip rebuilds the manifest from registry status; Task 4 is what clears the one `es` entry that rebuild would orphan.

> **Shared file — `ReviewScreen.jsx`, and Plan B is restructuring this screen's layout concurrently.** The onboarding line goes in **through the existing `CoachDialog` messages path** — one more `{ text, mood }` object pushed onto the `coachMessages` array that `<CoachDialog fixed messages={coachMessages} />` already receives. **Add no new markup, no wrapper, no new element, and change no root container style.** Every edit in this task lands in two places: the `// Coach messages` block and the narration effect — both plain JS, neither of them JSX. That is what keeps the merge with Plan B mechanical.

**Files:**
- Modify: `connect-four/src/i18n/en.json`, `connect-four/src/i18n/es.json`
- Modify: `connect-four/src/screens/ReviewScreen.jsx`
- Modify: `connect-four/server/tts-registry.json`, `.es.json` and both manifests (**written by the tooling, not by hand**)
- Create: `connect-four/public/audio/coach/coach--spoken--sparring--review--onboarding--0.mp3` and the `es/` sibling (**generated**)

**Interfaces:**
- Produces: i18n key `coach.spoken.sparring.review.onboarding.0`, slug `coach--spoken--sparring--review--onboarding--0`.

**Context (verified):** `ReviewScreen.jsx:54` takes `onboarding`. Its Move Timeline (`:407-459`) renders one 36px circular chip per move, colored by `getQualityColor` (`:47-51`): `--eval-good` (optimal), `--eval-mid` (suboptimal), `--eval-bad` (everything else). Tapping a chip calls `selectStep(move.moveIndex)`. The coach bubbles are built inline at `:277-291` and rendered `<CoachDialog fixed messages={coachMessages} />` at `:302`.

**Copy-length constraint (verified at source, `CoachDialog.jsx`):** the inner bubbles container is `maxHeight: 120, overflowY: 'auto'` — about **5 rendered lines / ~205 characters** total across **all** bubbles, and adding a second bubble costs ~28px of that budget. The mount effect sets `scrollTop = scrollHeight`, so the learner lands on the **last** bubble. That is what makes appending correct here: the instruction is the newest bubble and is the one on screen. Keep it to one short sentence; Spanish runs ~15% longer.

- [ ] **Step 1: Add the i18n key to both locales**

Under `coach.spoken.sparring.review` — which currently holds `clean` and `mistakes` pools — add a third pool. In `en.json`:

```json
        "onboarding": {
          "0": "Tap any red or orange move to see what went wrong."
        }
```

In `es.json` (Rioplatense voseo — `tocá`, not `toca`):

```json
        "onboarding": {
          "0": "Tocá cualquier jugada roja o naranja para ver qué salió mal."
        }
```

English is 50 characters, Spanish 59 — both comfortably inside the shared ~205-character budget alongside the summary bubble.

- [ ] **Step 2: Render and narrate it in `ReviewScreen.jsx`**

Add a module-level constant near `getQualityColor`:

```js
// Fix 2 (2026-08-04): during onboarding the Move Timeline's coloured chips are the affordance the
// user is meant to discover, so the coach names it explicitly. `coach.spoken.*` because it is
// voiced — see docs/architecture/coach-audio-conventions.md.
const ONBOARDING_TIMELINE_TIP_KEY = 'coach.spoken.sparring.review.onboarding.0';
```

Extend the coach-message block (locate by `// Coach messages`), appending **after** the existing summary push:

```js
  } else if (analysis) {
    const disc = analysis.side === 'first' ? 'green' : 'gray';
    const discLabel = analysis.side === 'first' ? t('review.playedGreen') : t('review.playedGray');
    const isCleanPhrase = analysis.summaryPhraseKey.startsWith('coach.spoken.sparring.review.clean');
    const summaryText = (isCleanPhrase && isLoss)
      ? t('review.cleanButLost')
      : t(analysis.summaryPhraseKey);
    coachMessages = [{ text: summaryText, mood: 'happy', disc, discLabel }];
    // CoachDialog stacks bubbles inside one scrolling box and auto-scrolls to the last one, so
    // the tip is what the user actually sees. Only when there is a timeline to tap.
    if (onboarding && analysis.moves && analysis.moves.length > 0) {
      coachMessages.push({ text: t(ONBOARDING_TIMELINE_TIP_KEY), mood: 'think' });
    }
  }
```

Extend the narration effect (locate by `speakCoachMessage(analysis.summaryPhraseKey)`):

```js
  useEffect(() => {
    if (analysis?.summaryPhraseKey) {
      speakCoachMessage(analysis.summaryPhraseKey);
      if (onboarding && analysis.moves && analysis.moves.length > 0) {
        // The module-level speech queue in useCoachSpeech.js plays these strictly in order.
        speakCoachMessage(ONBOARDING_TIMELINE_TIP_KEY);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis?.summaryPhraseKey, onboarding]);
```

- [ ] **Step 3: Register the key**

```bash
cd connect-four && node scripts/generate-tts.js --sync --lang all
```

`--sync` merges the i18n tree into both registries, adding the new key as `needs_audio` and **preserving** every existing status. It is idempotent. Expect it to report the new entry (and possibly `↕ entries reordered`, which is harmless — `--sync` emits in i18n order, which is canonical).

Verify:

```bash
cd connect-four && node -e "
for (const f of ['./server/tts-registry.json','./server/tts-registry.es.json'])
  console.log(f, JSON.stringify(require(f).find(e=>e.key==='coach.spoken.sparring.review.onboarding.0')));"
```

Expected: an entry in **both**, `status: "needs_audio"`.

- [ ] **Step 4: Synthesize it — with a locator, in one invocation**

```bash
cd connect-four && node --env-file=server/.env scripts/generate-tts.js --key coach.spoken.sparring.review.onboarding.0 --lang all
```

Three things this command is doing deliberately:
- `--key <k>` is the **locator**. Omitting it and reaching for `--all-new`/`--reset` re-synthesizes in bulk. (`--all-new` would also pick up the 5 other `needs_audio`/`awaiting_approval` English entries — don't.)
- `--lang all` runs `en` and `es` in **one process** (`generate-tts.js`: `const langs = langArg === 'all' ? SUPPORTED_LOCALES : [langArg];` then `for (const lang of langs) ok = (await generateSingle(key, lang, …)) && ok;`), and each language reads/writes its **own** registry file. This is the form that cannot lose a write. Do not run two separate `--lang en` / `--lang es` invocations back to back.
- `--env-file=server/.env` supplies `OPENAI_API_KEY`, which **is present** — never defer this step as "needs a key".

The key is brand new, so no approval-overwrite prompt appears. Both files land as `awaiting_approval`.

- [ ] **Step 5: Approve — and handle the manifest rebuild trap first**

⚠️ **Read this before clicking approve.** `POST /api/admin/audio/approve` calls `writeTtsManifest(registry, lang)`, which is:

```js
function writeTtsManifest(entries, lang = 'en') {
  const slugs = entries
    .filter(e => e.status === 'approved')
    .map(e => e.slug)
    .sort();
  …
}
```

It **rebuilds** the manifest from registry status rather than remapping it in place. Any slug that is currently in the manifest but not `approved` in the registry is silently dropped — which orphans its mp3 (`coachSpokenNamespace.test.js` goes RED) and **silences a clip that plays today**.

First, list what is at risk *right now*:

```bash
cd connect-four && node -e "
for (const [lang,f,m] of [['en','./server/tts-registry.json','./public/audio/coach/coach-audio-manifest.json'],['es','./server/tts-registry.es.json','./public/audio/coach/es/coach-audio-manifest.json']]) {
  const r=require(f), man=require(m);
  const approved=new Set(r.filter(e=>e.status==='approved').map(e=>e.slug));
  console.log(lang, 'at risk:', JSON.stringify(man.filter(s=>!approved.has(s))));
}"
```

Measured **before** Task 4 (2026-08-04):

```
en at risk: ["coach--spoken--figure--7--blunder--2","coach--spoken--immediate--threat--hint--0",
             "coach--spoken--sparring--outcome--loss","coach--spoken--sparring--outcome--win",
             "coach--spoken--undercut--optimal--2"]
es at risk: ["coach--spoken--home--welcome--0"]
```

Task 4 removes the `es` one. The five English ones remain, and **two of them are `sparring.outcome.loss`/`win` — the exact clips Task 3 just made audible.** Dropping them would silently undo fix 1.

So, at `/admin/audio`, **for English**: listen to each of those five `awaiting_approval` entries and approve the ones that sound right. If any sounds wrong, stop and raise it — do not proceed with a rebuild that would drop it. Then approve the new `coach.spoken.sparring.review.onboarding.0`. **For Spanish**: approve the new key (after Task 4 there is nothing else at risk).

Test both players on that page — they are separate code paths (`AdminAudioPage.jsx:639` is the sandbox player; `:927` is the per-key list player) and one can work while the other does not.

Reach the page on the worktree's own port:

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea/.claude/worktrees/plan-a-eight-fixes && eval "$(./worktree-ports.sh)" && echo "http://localhost:$VITE_PORT/admin/audio"
```

(`requireLocalhost` is the real gate on these routes; `requireAdmin` is a no-op outside `NODE_ENV=production`.)

- [ ] **Step 6: Verify manifest/asset parity after the rebuild**

```bash
cd connect-four && node -e "
const fs=require('fs');
for (const [lang,m,d] of [['en','./public/audio/coach/coach-audio-manifest.json','public/audio/coach'],['es','./public/audio/coach/es/coach-audio-manifest.json','public/audio/coach/es']]) {
  const man=require(m), inMan=new Set(man);
  const onDisk=fs.readdirSync(d).filter(x=>x.endsWith('.mp3')).map(x=>x.slice(0,-4));
  console.log(lang,'manifest',man.length,'mp3s',onDisk.length);
  console.log('  new key present:', inMan.has('coach--spoken--sparring--review--onboarding--0'));
  console.log('  missing mp3:', JSON.stringify(man.filter(s=>!onDisk.includes(s))));
  console.log('  orphan mp3:', JSON.stringify(onDisk.filter(s=>!inMan.has(s))));
}"
```

Expected: `new key present: true`, and **both** `missing mp3` and `orphan mp3` empty, for both languages. A non-empty `orphan mp3` means the rebuild dropped something — go back to Step 5 and approve it rather than deleting the asset.

- [ ] **Step 7: Run the full gate**

```bash
cd connect-four && npm run test:fast
```

Expected: `ℹ fail 0`.

- [ ] **Step 8: Verify in the real app**

Run an onboarding sparring game to its end so Review is reached with `onboarding === true`. Confirm:
- the summary bubble and the tip bubble both render, and the tip is the visible one (the container auto-scrolls to the last bubble);
- the tip is **spoken**, after the summary, in both `en` and `es` (switch language in Settings);
- tapping a red or orange chip does what the tip claims (steps the board / navigates to that mistake);
- **a non-onboarding review shows no tip** — the regression guard for the `onboarding &&` condition.

---

## Task 6: Return the user to the deep reveal after sign-in (fix 3)

**Files:**
- Modify: `connect-four/src/components/DeepRevealPane.jsx`
- Modify: `connect-four/src/screens/MistakeDetailScreen.jsx`
- Modify: `connect-four/src/screens/ChallengeScreen.jsx`
- Create: `connect-four/tests/unit/deepRevealReturnTo.test.js`
- Modify: `connect-four/package.json`

**Interfaces:**
- Consumes: `stashReturnTo(screenKey, params)` from `src/lib/postLoginReturn.js`.
- Produces: `DeepRevealPane` gains **one optional prop**, `returnTo?: { screenKey: string, params?: object } | null` (default `null`). Every existing prop keeps its name and meaning — per `frontend-conventions.md` §"Specing an existing component — preserve its API".

### Three verified facts that decide the implementation

1. **The screen key is `blunderDetail`, not `mistakeDetail`.** `screenRegistry.jsx`:

   ```jsx
   mistakeDetail: (p) => <MistakesListScreen {...p} />,
   blunderDetail: MistakeDetailScreen,
   ```

   and `urlMapping.js`: `{ pattern: '/blunder/:id', screenKey: 'blunderDetail', paramNames: ['id'] }`. Stashing `'mistakeDetail'` would land the user on the **mistakes list**, not the reveal. `consumeReturnTo` validates against `URL_MAP` keys, so the wrong key would still be *accepted* — nothing downstream catches this. Hence the test in Step 5.

2. **`clearReturnTo` on dismiss is already handled — add nothing.** `AuthModal.jsx`:

   ```js
   function handleDismiss() {
     clearReturnTo();
     onClose();
   }
   ```

   wired to both the backdrop (`onClick={handleDismiss}`) and the dismiss button. Both new call sites render `AuthModal` normally, so they inherit it. The dev-only "skip auth" button deliberately does **not** clear (it *completes* sign-in) — leave that alone.

3. **`DeepRevealPane` has three hosts**, so it cannot hardcode a destination: `MistakeDetailScreen.jsx:395`, `ChallengeScreen.jsx:814`, and `AdminDeepRevealEvalPage.jsx:648`. The host supplies `returnTo`; hosts that don't pass one keep today's behavior exactly.

- [ ] **Step 1: Add the optional prop to `DeepRevealPane`**

Extend the destructured signature (keep every existing prop and its order; add the new one at the end, before the closing brace):

```js
export function DeepRevealPane({
  isOpen,
  onClose,
  boardContent,
  moveString,
  col,
  feature = 'explain-move-llm',
  onReveal,
  onZhCellsChange,
  userMajorThreats = [],
  headerContent,
  timeoutContent,
  closeLabel,
  navigate,
  noSpeech = false,
  // Fix 3 (2026-08-04): where to send the user back to after sign-in. Google OAuth is a
  // full-page redirect that lands on the site root, so the destination must survive via
  // sessionStorage (src/lib/postLoginReturn.js), not React state. Optional and null by default:
  // a host that omits it (AdminDeepRevealEvalPage) keeps the pre-fix behaviour exactly.
  returnTo = null,
}) {
```

Add the import:

```js
import { stashReturnTo } from '../lib/postLoginReturn.js';
```

Change the 401 branch (locate by `res.status === 401`):

```js
        if (res.status === 401) {
          setLoading(false);
          if (returnTo?.screenKey) stashReturnTo(returnTo.screenKey, returnTo.params ?? {});
          setAuthOpen(true);
          return null;
        }
```

Leave the `AuthModal` render (`onClose={() => { setAuthOpen(false); onClose?.(); }}`) untouched — `handleDismiss` clears the stash before that runs.

- [ ] **Step 2: Wire `MistakeDetailScreen`**

Add the import:

```js
import { stashReturnTo } from '../lib/postLoginReturn.js';
```

The "Sign in to unlock" button (locate by `t('mistakes.detail.signInToUnlock'`) currently reads `onClick={() => setAuthOpen(true)}`. Replace with:

```js
            onClick={() => {
              // Fix 3: this screen is registered under the `blunderDetail` key
              // (src/lib/screenRegistry.jsx) → '/blunder/:id'. NOT 'mistakeDetail', which
              // renders MistakesListScreen. Its cold-boot effect rehydrates from `id` alone.
              stashReturnTo('blunderDetail', { id: blunder.id });
              setAuthOpen(true);
            }}
```

And pass the same destination to the pane (locate by `<DeepRevealPane`, add alongside the existing props):

```jsx
            returnTo={{ screenKey: 'blunderDetail', params: { id: blunder.id } }}
```

`blunder` is already in scope here — `const blunder = blunders[index];`.

- [ ] **Step 3: Wire `ChallengeScreen`'s pane**

The same 401 branch strands a challenge player. `ChallengeScreen` receives `category` and is registered at `/challenge/:category`. In lesson mode there is no stable URL for the embedded challenge, so pass nothing there. Add to the `<DeepRevealPane` props:

```jsx
          returnTo={!lessonMode && category ? { screenKey: 'challenge', params: { category } } : null}
```

- [ ] **Step 4: Write the failing test**

Create `connect-four/tests/unit/deepRevealReturnTo.test.js`. This is a **source-parse** test, the documented pattern for logic sitting in a `.jsx` route/screen with no seam (`docs/architecture/testing-conventions.md`, §"Source-parse assertions"). The invariant it pins is the one that is easy to get wrong and that nothing else catches: **a screen must stash the key it is registered under.**

```js
// Fix 3 (2026-08-04). MistakeDetailScreen's "Sign in to unlock" button and DeepRevealPane's 401
// branch opened AuthModal without stashing a post-login destination, so Google OAuth's full-page
// redirect to the site root stranded the user on Home.
//
// This is a source-parse test (testing-conventions.md §"Source-parse assertions — when there is
// no seam at all"): the logic lives in .jsx, which `node --test` cannot parse, and extracting a
// one-line stash call into a module would be indirection for its own sake. The property worth
// pinning is that each screen stashes the key it is REGISTERED under — screenRegistry.jsx maps
// `blunderDetail` to MistakeDetailScreen while `mistakeDetail` maps to MistakesListScreen, so the
// obvious-looking key is the wrong one, and consumeReturnTo would happily accept it.
//
// Anchored on the distinguishing expressions, not on prose: a comment mentioning 'blunderDetail'
// must not be able to keep this green.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

// Strip line and block comments so a comment can never satisfy an assertion below.
function code(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

test('screenRegistry maps blunderDetail — not mistakeDetail — to MistakeDetailScreen', () => {
  const src = code(read('src/lib/screenRegistry.jsx'));
  assert.match(src, /blunderDetail:\s*MistakeDetailScreen/);
  assert.match(src, /mistakeDetail:\s*\(p\)\s*=>\s*<MistakesListScreen/);
});

test('MistakeDetailScreen stashes the screen key it is registered under', () => {
  const src = code(read('src/screens/MistakeDetailScreen.jsx'));
  assert.match(src, /stashReturnTo\(\s*'blunderDetail'\s*,\s*\{\s*id:\s*blunder\.id\s*\}/);
  assert.match(src, /returnTo=\{\{\s*screenKey:\s*'blunderDetail'/);
  // The wrong key must never appear as a stash target here.
  assert.equal(/stashReturnTo\(\s*'mistakeDetail'/.test(src), false);
});

test('every AuthModal-opening site in MistakeDetailScreen stashes first', () => {
  const src = code(read('src/screens/MistakeDetailScreen.jsx'));
  const opens = src.match(/setAuthOpen\(true\)/g) ?? [];
  const stashes = src.match(/stashReturnTo\(/g) ?? [];
  assert.equal(opens.length > 0, true, 'expected at least one setAuthOpen(true) site');
  assert.equal(stashes.length >= opens.length, true,
    `${opens.length} setAuthOpen(true) site(s) but only ${stashes.length} stashReturnTo call(s)`);
});

test('DeepRevealPane stashes the host-supplied destination on its 401 branch', () => {
  const src = code(read('src/components/DeepRevealPane.jsx'));
  assert.match(src, /import\s*\{\s*stashReturnTo\s*\}\s*from\s*'\.\.\/lib\/postLoginReturn\.js'/);
  // The stash must sit in the 401 branch, before the modal opens.
  assert.match(
    src,
    /res\.status === 401[\s\S]{0,200}?stashReturnTo\(returnTo\.screenKey[\s\S]{0,80}?setAuthOpen\(true\)/,
  );
});

test('the single named consumption point is still single', () => {
  // postLoginReturn.js's header makes this an explicit invariant (FR-013).
  const app = code(read('src/App.jsx'));
  assert.equal((app.match(/consumeReturnTo\(\)/g) ?? []).length, 1);
});

test('every stashed screen key is a real URL_MAP key', () => {
  const map = code(read('src/lib/urlMapping.js'));
  for (const key of ['blunderDetail', 'challenge']) {
    assert.match(map, new RegExp(`screenKey:\\s*'${key}'`));
  }
});
```

- [ ] **Step 5: Register it and run it**

Add `tests/unit/deepRevealReturnTo.test.js` to **both** the `test` and `test:fast` scripts in `connect-four/package.json`.

```bash
cd connect-four && node --test tests/unit/deepRevealReturnTo.test.js
```

Expected: PASS (Steps 1–3 already made it true).

- [ ] **Step 6: Prove the test is not vacuous**

Temporarily change `stashReturnTo('blunderDetail', …)` in `MistakeDetailScreen.jsx` to `stashReturnTo('mistakeDetail', …)`, re-run the file, and confirm it goes **RED** on two assertions. Then revert. A source-parse test you have never seen fail reads as coverage and is worse than none.

- [ ] **Step 7: Verify registration by name**

```bash
cd connect-four && npm run test:fast 2>&1 | /usr/bin/grep -c "MistakeDetailScreen stashes the screen key it is registered under"
```

Expected: non-zero.

- [ ] **Step 8: Run the full gate**

```bash
cd connect-four && npm run test:fast
```

Expected: `ℹ fail 0`.

- [ ] **Step 9: Verify in the real app**

Signed out, in a browser (sessionStorage is per-tab, same origin):

1. Open a blunder permalink `/blunder/<id>`. Tap **"Sign in to unlock"**, then complete sign-in (in dev, use the AuthModal's "🛠 Dev: skip auth" button — it deliberately does *not* clear the stash). You must land back on **that blunder**, not Home.
2. Repeat, but this time **dismiss** the modal (backdrop or the dismiss button) and then sign in from Home instead. You must land on **Home** — the stash was cleared, no hijack.
3. Trigger the pane's 401 branch (open a deep reveal while signed out) and confirm the same return.

---

## Task 7: Remove the "Replay intro" button and the claims that depend on it (fix 6)

> **Shared files — `SettingsScreen.jsx` and `HomeScreen.jsx`.** You own content and behavior; Plan B owns layout. The wrapper `div` deleted in Step 2 exists **solely** to hold the removed button, so removing it is content, not layout. Do not touch the sibling `devReset` wrapper, the `<section>` elements around the Papergames/Subscription blocks, or either screen's root container. The `HomeScreen` edit in Step 5 is a **comment only**.

**Files:**
- Modify: `connect-four/src/screens/SettingsScreen.jsx`
- Modify: `connect-four/src/screens/HomeScreen.jsx` (comment only)
- Modify: `connect-four/src/screens/OnboardingMissionScreen.jsx`
- Modify: `connect-four/src/lib/onboardingRouting.js` (comment only)
- Modify: `connect-four/src/i18n/en.json`, `connect-four/src/i18n/es.json`
- Modify: `docs/architecture/frontend-conventions.md`

**Interfaces:**
- Produces: `OnboardingMissionScreen` loses its `onboardingSource` prop; `track('onboarding_started', {})` is now unconditional.

**This is not a pure deletion.** The feature is load-bearing in three comments and one shipped requirement, and `onboardingSource` becomes fully dead.

- [ ] **Step 1: Confirm the dead-value claim before deleting anything**

```bash
cd connect-four && /usr/bin/grep -rn "onboardingSource\|settings_replay" src/
```

Expected (measured 2026-08-04): exactly one **producer** — `SettingsScreen.jsx:33` `go('onboardingMission', { onboardingSource: 'settings_replay' });` — and one **consumer**, `OnboardingMissionScreen.jsx:61`. `App.jsx:154` calls `go('onboardingMission')` with **no** params. If this grep shows any other producer, stop: the prop is not dead and Step 4 must be skipped.

- [ ] **Step 2: Delete the handler and both buttons**

In `SettingsScreen.jsx`, delete `handleReplayIntro` **and its full 15-line Epic 8 / Task 20 comment block** (locate by symbol `handleReplayIntro`).

Delete the **unauthenticated** button *and its now-empty wrapper `div`*:

```jsx
        <div style={{ padding: '0 18px 26px' }}>
          <button
            type="button"
            onClick={handleReplayIntro}
            className="btn btn-ghost"
            style={{ width: '100%', fontSize: 14, padding: '10px 0' }}
          >
            {t('onboarding.replayIntro')}
          </button>
        </div>
```

Delete the **authenticated** button *and its whole `<section>` and the comment above it*:

```jsx
        {/* Epic 8 — Onboarding Experience, US4 (T043/FR-010): re-launchable for any state */}
        <section>
          <button
            type="button"
            onClick={handleReplayIntro}
            className="btn btn-ghost"
            style={{ width: '100%', fontSize: 14, padding: '10px 0' }}
          >
            {t('onboarding.replayIntro')}
          </button>
        </section>
```

Leave `{devReset && <div style={{ padding: '0 18px 26px' }}>{devReset}</div>}` in the unauthenticated view alone.

- [ ] **Step 3: Remove the i18n key from both locales**

Delete `"replayIntro": "Replay intro",` from `en.json` and `"replayIntro": "Repetir introducción",` from `es.json` (both under `onboarding`). Removing from one only fails `i18nKeyParity.test.js`.

- [ ] **Step 4: Retire the now-dead `onboardingSource` prop**

In `OnboardingMissionScreen.jsx`:

```js
export function OnboardingMissionScreen({ go }) {
```

Delete the stale Task-20 comment that explains the Settings route (locate by `settings_replay`), and simplify the tracking call:

```js
    // Settings' "Replay intro" was the only caller that ever passed a source; it was removed
    // 2026-08-04, so this screen is reached solely via App.jsx's anonymous first-run auto-route.
    track('onboarding_started', {});
```

- [ ] **Step 5: Correct the `HomeScreen` rationale — do not delete it**

The anonymous-Settings routing **stays**; only its stated reason is now wrong. Replace the comment at `HomeScreen.jsx`'s `onRight2`:

```jsx
        right2="gear"
        // Navigate to Settings regardless of auth state — SettingsScreen renders a graceful
        // unauthenticated view (language switcher, sign-in prompt), so gating the gear behind
        // AuthModal would make Settings unreachable for anonymous users for no benefit.
        //
        // HISTORY (do not "restore" the button): this was originally justified by Epic 8 US4 /
        // SC-004, "'Replay intro' must be reachable from Home in <=2 nav actions for anonymous
        // users". That button was REMOVED on 2026-08-04 at the owner's request. The unconditional
        // navigation is kept on its own merits, not as a leftover of the removed requirement.
        onRight2={() => go('settings')}
```

- [ ] **Step 6: Correct the `onboardingRouting.js` comment**

Its `shouldAutoRouteToOnboarding` JSDoc says: *"they reach onboarding only via Settings 'Replay intro' (FR-010)."* Replace that sentence:

```js
 * Settled decision (B3/D1, spec.md Assumptions): anonymous-only. A signed-in
 * user (truthy `session`) is NEVER auto-routed, even if their account's
 * onboarding_status is 'not_encountered'.
 *
 * Since 2026-08-04 there is NO manual re-entry point: Settings' "Replay intro" (FR-010) was
 * removed at the owner's request, so this auto-route is the only path into onboarding.
```

Also fix the file header's `ONBOARDING_GAME_PARAMS` note if it references the Settings route. `ONBOARDING_GAME_PARAMS` itself **stays** — `OnboardingMissionScreen`'s CTA still uses it. Confirm before deleting anything:

```bash
cd connect-four && /usr/bin/grep -rn "ONBOARDING_GAME_PARAMS" src/
```

- [ ] **Step 7: Correct the architecture doc**

`docs/architecture/frontend-conventions.md` §"Skip control + Settings 'Replay intro' (Epic 8 — Onboarding Experience, spec 048, T041/T043, FR-009/FR-010)" currently contains two paragraphs that are now wrong — and one of them was **already stale before this change** (it claims the button calls `go('game', ONBOARDING_GAME_PARAMS)` directly, whereas the code routed through `go('onboardingMission', …)`).

Replace the **"Settings 'Replay intro'"** paragraph with:

```markdown
**Settings "Replay intro" — REMOVED 2026-08-04.** `SettingsScreen.jsx` no longer renders a
"Replay intro" control in either its authenticated or unauthenticated view, and the
`onboarding.replayIntro` i18n key is gone from both locales. This **removes a shipped
requirement** — Epic 8 US4, FR-010, and SC-004's "re-launch from Settings in <=2 nav actions" —
at the owner's request; see `docs/open_issues.md` OI-151.

Two consequences a future reader will otherwise trip over:

- **`App.jsx`'s anonymous first-run auto-route is now the ONLY path into onboarding.** There is no
  manual re-entry point. `shouldAutoRouteToOnboarding` is anonymous-only, so a signed-in user
  cannot reach onboarding at all.
- **`HomeScreen`'s gear icon still navigates to Settings unconditionally, and that is deliberate.**
  Its original justification was this button's reachability; the behaviour is kept on its own
  merits (SettingsScreen has a graceful unauthenticated view). Do not "restore" the button on the
  strength of that comment — see the HISTORY note in `HomeScreen.jsx`.

For the record, the removed control had drifted from this document before it was deleted: this
section used to say it called `go('game', ONBOARDING_GAME_PARAMS)` **directly**, while the shipped
code routed through `go('onboardingMission', { onboardingSource: 'settings_replay' })`.
`onboardingSource` had exactly one producer and is gone with it.
```

Leave the **"Skip"** and **"Home → Settings reachability"** paragraphs' factual content intact, but if the latter's text asserts the Replay-intro justification, append a pointer to the note above rather than deleting it.

- [ ] **Step 8: Prove nothing dangles**

```bash
cd connect-four && /usr/bin/grep -rn "replayIntro\|handleReplayIntro\|settings_replay\|onboardingSource" src/ ../docs/
```

Expected: no hits in `src/`. In `../docs/` only the intentional historical mentions written in Step 7 (and whatever Task 9 adds).

- [ ] **Step 9: Run the full gate**

```bash
cd connect-four && npm run test:fast
```

Expected: `ℹ fail 0` (`i18nKeyParity.test.js` is the one that catches a half-removed key).

- [ ] **Step 10: Verify in the real app**

Open Settings both signed out and signed in. No "Replay intro" button in either view. The unauthenticated view must not render an empty gap where the wrapper `div` was. The gear on Home must still open Settings while signed out.

---

## Task 8: Enable the Papergames save button only when the field is dirty (fix 5)

**MUST run after Task 7** — same file.

> **Shared file — `SettingsScreen.jsx`.** This task adds one `const` and changes one `disabled` expression. No markup, no layout.

**Files:**
- Modify: `connect-four/src/screens/SettingsScreen.jsx`

**Interfaces:** none — a one-expression change plus a comment.

**The state already exists, and the feared follow-on bug does not.** `SettingsScreen.jsx` declares `const [papergamesId, setPapergamesId] = useState('');` and `const [savedValue, setSavedValue] = useState('');`, both set from the profile fetch on mount:

```js
        const id = profile.papergames_id || '';
        setPapergamesId(id);
        setSavedValue(id);
```

The brief flags a risk that `handleSave` might not update `savedValue`, which would leave the button enabled forever after the first save. **It does update it** — and it also normalizes the input:

```js
      if (res.status === 204) {
        setSavedValue(trimmed);
        setPapergamesId(trimmed);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
```

So no additional fix is needed. The only real subtlety is the **trimming asymmetry**: `handleSave` compares against `papergamesId.trim()` (`const trimmed = papergamesId.trim();`), so the dirty check must trim on both sides or a trailing space reads as an edit and re-enables a button that would save an identical value.

- [ ] **Step 1: Add the dirty check**

Add a derived value next to the other Papergames state (locate by `const [saving, setSaving] = useState(false);`):

```js
  // Fix 3/5 (2026-08-04): the Save button was `disabled={saving}`, so it stayed enabled with
  // nothing to save. Trim BOTH sides: handleSave compares `papergamesId.trim()`, so an untrimmed
  // check would call a trailing space an edit and enable a save that changes nothing.
  // `savedValue` is kept current by handleSave's 204 branch, which sets it (and normalizes
  // `papergamesId`) to the trimmed value — so the button correctly re-disables after a save.
  const isDirty = papergamesId.trim() !== savedValue.trim();
```

Change the button (locate by `onClick={handleSave}`):

```jsx
              disabled={saving || !isDirty}
```

Leave the sibling Import button's `disabled={importing || !savedValue}` alone.

- [ ] **Step 2: Verify in the real app**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea/.claude/worktrees/plan-a-eight-fixes && eval "$(./worktree-ports.sh)"
```

Signed in, on Settings:

1. On load with a saved Papergames id, **Save is disabled**.
2. Type a character — **Save enables**.
3. Delete it back to the original — **Save disables again**.
4. Add a trailing space only — **Save stays disabled** (the trimming case).
5. Change to a genuinely new value and save. On the green "saved" confirmation, **Save disables again** without a reload. This is the case that would have stayed broken if `handleSave` had not updated `savedValue`.
6. On a fresh account with **no** saved id, Save is disabled on an empty field and enables as soon as you type.

- [ ] **Step 3: Run the full gate**

```bash
cd connect-four && npm run test:fast
```

Expected: `ℹ fail 0`.

---

## Task 9: Record the deploy prerequisite and the issues this plan deliberately did not fix

**Files:**
- Modify: `docs/deployment_steps.md`
- Modify: `docs/open_issues.md`

**Reminder:** the worktree's `docs/open_issues.md` tops out at **OI-143**; the main checkout is at **OI-147**. This plan's allocated range is **OI-148 … OI-159** — Plan B and the Epic 11 lane have their own ranges above it, and all three would otherwise claim OI-148. Use **OI-148, OI-149, OI-150, OI-151** as written below, take any further number from within 148–159, never past 159, and never renumber an entry another lane has already written. Append at the end of the file.

- [ ] **Step 1: Append the deploy prerequisite**

Only one change in this plan has a deploy prerequisite. Task 2 changes what `buildTtsSpeechText` returns, and the deep-reveal audio cache key is `sha256(cleanText)` — so every stored clip's path no longer matches. Append to `docs/deployment_steps.md`, following the file's own template:

````markdown
## Plan A small fixes — deep-reveal TTS sanitization (fix 7 / fix 8)

**Status**: PENDING
**When**: after the code deploy (either is safe; the app self-heals, this just avoids a silent stale window)
**Blocks**: nothing hard — but until it runs, previously-cached deep reveals keep serving their OLD audio
**Applies to**: staging / production

### What's wrong

`GET /api/user/tts/deep-reveal` now runs `stripInternalTokens` before `stripAnnotationsForTTS`
(`buildTtsSpeechText`, `server/reasonRenderGuard.mjs`), so the coach speaks "column 5" where it used
to speak "c5". The stored audio path is derived from that text:

```js
const textHash = createHash('sha256').update(cleanText).digest('hex');
const audioPath = `tts/deep-reveal/${textHash}.mp3`;
```

compared against `explanation_cache.audio_path`. Every existing row's `audio_path` was computed from
the **unsanitized** string, so it no longer matches and each affected reveal re-synthesizes once —
correct, but it means the old clips linger as dead objects in the `coach-tts` bucket.

Separately, `RANGE_RE` now matches en/em-dash ranges, so cached *text* generated before this deploy
can still contain `c2–c5` renders that the guard would now fix. The guard runs at the response seam
on every read, so served text self-corrects; the **cached raw mechanism** does not change.

### Run it

Pre-launch, staging and production are disposable — this is a truncate, not a migration or a
backfill:

```sql
TRUNCATE explanation_cache;
```

Optionally clear the stale audio objects under `coach-tts/tts/deep-reveal/` in Supabase Storage.
Not required for correctness — orphaned objects are only wasted bytes.

### Verify

```sql
SELECT count(*) FROM explanation_cache;
```

Success: `0`. Then open one past mistake, tap the deep reveal, and play the audio. The **spoken**
text must match the **rendered** text: no "c5", no "c1r3", and a dash range must be spoken as
"columns 2 through 5" (en) / "columnas 2 a 5" (es). Check both locales — `buildTtsSpeechText`
takes the locale the route already resolved via `resolveTtsLocale(lang, req.locale)`.

### Roll back

**Not reversible, and does not need to be.** `explanation_cache` is a derived cache: every row
regenerates on the next reveal of that position. No user data is stored in it.
````

- [ ] **Step 2: Append the open issues**

Append four entries to `docs/open_issues.md`, matching the file's existing entry format (a `**Status**:` line first, then what's wrong / where / repro).

**OI-148 — `ChallengeScreen`'s coach speech has the same `coachMessages.length` defect as `GameScreen` did.**
Status: deferred (latent). `src/screens/ChallengeScreen.jsx`'s narration effect is `}, [coachMessages.length]);` and reads a single `lastCoachKeyRef`, exactly the shape fix 1 replaced in `GameScreen`. It is mostly masked today because `initPuzzle` resets the array to length 1 after feedback bubbles pushed it to ≥2, so the length does change between puzzles — but any flow that replaces a 1-element list with another 1-element list is silent, and `:729` sets `lastCoachKeyRef.current = 'error.generic'`, a key with no `coach.spoken.*` slug (harmless, silently no-ops, same class as the `sparring.draw` bug fixed in `useGameBoard`). Fix: migrate it to `selectUnspokenKeys` (`src/lib/coachSpeechCursor.js`) and stamp its messages. Deferred because the brief scoped fix 1 to `GameScreen` and `ChallengeScreen`'s message flow (sequence mode, lesson overrides, the path-addressed `lastLessonAudioRef`) needs its own characterization pass.

**OI-149 — approving one coach clip rebuilds the whole manifest and can silently drop live slugs.**
Status: open (real, currently latent). `server/index.js`'s `writeTtsManifest` is `entries.filter(e => e.status === 'approved').map(e => e.slug).sort()`, called by `POST /api/admin/audio/approve` and `/approve-all`. This **rebuilds** from registry status, which directly contradicts `docs/architecture/coach-audio-conventions.md`'s own rule: *"Any bulk operation must therefore **remap the existing manifest array in place**, never rebuild it from registry status — a rebuild silently drops whatever the manifest disagrees about."* Measured 2026-08-04, before this branch: 5 English slugs (`figure--7--blunder--2`, `immediate--threat--hint--0`, `sparring--outcome--loss`, `sparring--outcome--win`, `undercut--optimal--2`) and 1 Spanish slug (`home--welcome--0`) were in the manifest but not `approved` — so approving any single unrelated key would have dropped all six, orphaned their mp3s (turning `tests/unit/coachSpokenNamespace.test.js` red) and silenced clips that play today. Two of them are the sparring outcome clips. Worked around by hand in Task 5 of `docs/superpowers/plans/2026-08-04-plan-a-eight-small-fixes.md`; the durable fix is to make `writeTtsManifest` a union of the existing manifest and the newly-approved slug, or to make the drift itself a test failure.

**OI-150 — `useCoachSpeech`'s pending-key buffer holds only one key.**
Status: deferred (latent). `src/lib/useCoachSpeech.js`: `pendingKeyRef.current = key;` — when `speakCoachMessage` is called before the language manifest has loaded, the key is buffered in a single-slot ref, so a second call overwrites the first and that clip is lost. Not on any path fix 1 touches (the only pre-load speech is a screen's single mount message; the batched double-update happens at game end, long after the manifest resolves), which is why it was left alone. Fix: make it a small array and drain it in `ensureManifest`'s `.then`.

**OI-151 — "Replay intro" was removed, retiring Epic 8 US4 / FR-010 / SC-004.**
Status: accepted (owner's decision, 2026-08-04). `SettingsScreen`'s "Replay intro" control is gone from both the authenticated and unauthenticated views, along with `handleReplayIntro`, the `onboarding.replayIntro` i18n key in both locales, and the `onboardingSource` prop on `OnboardingMissionScreen` (it had exactly one producer). This **retires a shipped requirement**: Epic 8 US4, FR-010, and SC-004's "re-launch onboarding from Settings in ≤2 nav actions". Consequence to know before touching onboarding: `App.jsx`'s anonymous first-run auto-route is now the **only** path into onboarding, and since `shouldAutoRouteToOnboarding` is anonymous-only, a signed-in user cannot reach it at all. `HomeScreen`'s unconditional gear→Settings navigation is deliberately retained on its own merits — see the HISTORY comment there and `docs/architecture/frontend-conventions.md`.

- [ ] **Step 3: Final full-suite run**

```bash
cd connect-four && npm run test:fast
```

Expected: `ℹ fail 0`, and `ℹ tests` = 1739 + the tests added by Tasks 1, 2, 3 and 6.

- [ ] **Step 4: Review the working tree**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea/.claude/worktrees/plan-a-eight-fixes && git status --short
```

Expect changes only under the paths in the File structure table. Commit on `worktree-plan-a-eight-fixes`, staging explicit paths only — never `git add -A`. **Do not merge the branch**; that is the owner's call, and the manual verification checklist (audio approval and the in-app checks) has to be signed off first.

---

## Self-review

**Spec coverage** — one task per fix, all eight covered:

| Brief's fix | Task |
|---|---|
| 1. In-game coach bubbles are silent | Task 3 (+ the `sparring.draw` key, + the hint re-speak found during verification) |
| 2. Onboarding: tap the red/orange bubbles | Task 5 |
| 3. Sign-in doesn't return you to the deep reveal | Task 6 |
| 4. Remove the home welcome audio | Task 4 |
| 5. Papergames save button dirty-check | Task 8 |
| 6. Remove the "Replay intro" button | Task 7 |
| 7. Deep-reveal TTS speaks raw coordinates | Task 2 |
| 8. `RANGE_RE` misses the en-dash | Task 1 |
| Sequencing note (Epic 11 prerequisite) | "Task order, and why" — quoted verbatim from the epic |
| Deploy prerequisites → `docs/deployment_steps.md` | Task 9 Step 1 |
| Found-but-not-fixed → `docs/open_issues.md` | Task 9 Step 2 (OI-148…OI-151) |

**Parallel-lane constraints, each with the place it is enforced:**

| Constraint | Where it lands in the plan |
|---|---|
| This plan owns `server/reasonRenderGuard.mjs`; the epic lane is blocked on it | §"Three lanes", Increment 1; Task 2 Step 11 is the merge/handoff point |
| Fixes 7 + 8 are a separately-landable first increment | Tasks 1–2 = Increment 1; task-order block marks the merge boundary; Task 2 Step 11 pins the expected 4-path `git status` |
| Epic 11's US3 rebases onto this plan's `stripInternalTokens` | Stated in Increment 1 and repeated in the Task 2 Step 11 handoff, with the explicit "signature must not change" guard |
| Content/behavior vs. layout split on the four shared screens | §"File ownership"; a banner on each of Tasks 3, 4, 5, 7, 8 |
| Fix 2 via the existing `CoachDialog` messages path, no new markup | Task 5 banner + Step 2, which edits only the `// Coach messages` block and the narration effect |
| `OI-N` range 148–159 | §"Open-issue numbering"; Task 9 Step 2 preamble; File-structure table |
| Every new test file listed explicitly for a mechanical `package.json` merge | §"the contended `test:fast` line" — a two-row table, plus the append-at-the-end rule and the re-verify-by-name commands |

Worth noting for the merge: **Increment 1 touches no `src/` file and no `package.json` line**, so it cannot conflict with either other lane. The whole contention surface of this plan is four `src/` screens (behavior-only) and two appended `package.json` entries.

**Named decisions the brief asked for, made explicitly:**
- *Fix 4, "does the key and the mp3 stay or go?"* → the string stays as `coach.ui.homeWelcome`; the `coach.spoken.*` key, both registry entries, both manifest slugs and both mp3s go. Rationale and citations in Task 4.
- *Fix 3, "which screen key?"* → `blunderDetail`, verified against `screenRegistry.jsx`; the plausible-looking `mistakeDetail` renders a different component.
- *Fix 3, "does `AuthModal` already cover the new callers?"* → yes, `handleDismiss` calls `clearReturnTo()` for both dismissal paths. No task added.
- *Fix 5, "does `handleSave` update `savedValue`?"* → yes, line-cited. No extra fix.
- *Fix 2, "is `generate-tts.js` broken?"* → no. `--help` exits 0; `--key … --lang all` is the correct locator form.

**Placeholder scan:** no "TBD", no "similar to Task N", no "add appropriate error handling". Every code step carries the literal code. Every fixture in Tasks 1 and 2 was produced by running the real function and pasting the output; the harvest command is included so the next reader can re-derive it. The one place a value could not be harvested — the new Spanish coach line in Task 5 — is authored copy, not a fixture, and follows the documented voseo rules.

**Type/name consistency:** `selectUnspokenKeys(messages, lastSpokenSeq) -> {keys, nextSeq}` is defined in Task 3 Step 3 and used with those exact names in Task 3 Step 6 and in the Task 3 Step 1 tests. `buildTtsSpeechText(raw, locale)` is defined in Task 2 Step 4 and called with that signature in Step 6, the tests, and the `server-conventions.md` note. `returnTo` has the same `{ screenKey, params }` shape in `DeepRevealPane`, both hosts, and the test. `updateCoach(text, mood, key, replace)` is used in that order at every one of the nine call sites listed in Task 3 Step 5.
