# Plan — `coach.spoken.*` namespace for TTS-eligible coach text

**Date:** 2026-07-16
**Status:** draft (critique fixes applied 2026-07-16; all decisions settled)
**Owner decision captured:** yes (see Settled decisions)

---

## 1. Problem

`scripts/generate-tts.js` decides what gets an mp3 using exactly one predicate: **membership in the
`coach.` i18n namespace**, minus anything containing `{{`.

`scripts/generate-tts.js:132` (also `:183`, `:225`):
```js
const coachKeys = flattenKeys(enRaw, 'coach.');
```

`scripts/generate-tts.js:135-141`:
```js
    if (value.includes('{{')) {
      entries.push({
        key,
        slug,
        status: 'ineligible',
        reason: 'interpolated',
```

But every top-level namespace in `src/i18n/en.json` is a **feature/screen** namespace: `nav`, `audio`,
`game`, `puzzle`, `sparring`, `auth`, `upgrade`, `common`, `games`, `home`, `coach`. By that convention
`coach.*` means "strings belonging to the Coach feature" — which is why a button label was correctly
named `coach.startReview`. The generator unilaterally reinterprets that one namespace as a **modality**
namespace ("things that get spoken").

Two taxonomies share one prefix. The result: we synthesize and ship audio for text that is never meant
to be voiced — including clips that say only *"miss rate"* / *"tasa de error"*.

The `{{` filter is evidence the original author already sensed the premise was false, but patched the
case that *crashes* rather than the predicate that is wrong.

---

## 2. Settled decisions (owner, 2026-07-16)

- **D1.** Spoken text moves under **`coach.spoken.*`**. The namespace declares **intent to voice**.
- **D2.** Intent-without-reachability (a key under `coach.spoken.*` that no code path plays) is a **bug
  in the player, to be fixed at the play site** — it is *not* a reason to weaken the generator.
  Consequence: the generator generates for *intent*, and unreachable-but-intended keys are not waste.
- **D3.** `coach.home.welcome.0` **is meant to be spoken** → becomes `coach.spoken.home.welcome.0`, and
  `HomeScreen` gets the missing play call.
- **D4.** Naming is `spoken` (not `dialogue`/`lines`). It names the intent, which is the load-bearing
  property. Do not relitigate.
- **D5.** The 7 chrome keys move to **`coach.ui.*`**. Non-destructive and reversible (they belong to an
  unshipped weakness-map/study-queue feature; nothing renders them today). Their orphan mp3s (5
  approved clips per language — `title`, `weaknessMap`, `startReview`, `emptyQueue`, `missRate`;
  `queueCount_one/other` are `ineligible` and never had mp3s) are deleted, not renamed.
- **D6.** `coach.summary.perfect.{0,1}` moves to `coach.spoken.*` **and** `PostSetSummaryScreen` gets
  the missing `speakCoachMessage` call, consistent with the `HomeScreen` fix (D3). Both latent
  never-spoken bugs die in this branch.
- **D7.** Rename all mp3s (`git mv`), not just registry keys. No re-synthesis; filename ⇄ key stays
  1:1. Do **not** strip `spoken` inside the slug-derivation functions to dodge the rename.
- **D8.** The migration **remaps the existing manifest array in place** (old slug → new slug, applied
  to what's actually on disk in `coach-audio-manifest.json`). It must **never** rebuild the manifest
  from `entries.filter(e => e.status === 'approved')`, even though that is `saveManifest`'s own rule
  (`scripts/generate-tts.js` — see T1) — the live registry can (and, on 2026-07-16, briefly did) drift
  from the live manifest, and a rebuild would silently drop any key the manifest disagrees about. See
  T1 for why this isn't hypothetical.
- **D9.** Two more orphan mp3s die in T-4 alongside the chrome ones:
  `coach--sparring--explorer--intro--{0,1}.mp3` (en only; leftovers from the deleted ExplorerScreen —
  no `coach.sparring.explorer.*` key exists in `src/i18n/en.json`, and neither file appears in the
  registry or the manifest). §7's orphan-assets check must catch these if T-4 is ever run
  incompletely, so it stays strict rather than being loosened to "explain away" known orphans.

---

## 3. Ground truth — what is played today

Derived by reading every playback path (not by grep). Playback is **only** via `speakCoachMessage(key)`
from `src/lib/useCoachSpeech.js:251`, which slugifies the key and plays it **only if the slug is in the
approved manifest** (`useCoachSpeech.js:211-227`, `enqueueIfApproved`). There are exactly **four** call
sites:

| Call site | Key source |
|---|---|
| `src/screens/GameScreen.jsx:161` | `lastCoachKeyRef.current` (set by `useGameBoard`) |
| `src/screens/ChallengeScreen.jsx:204` | `lastCoachKeyRef.current` (set in-screen) |
| `src/screens/ReviewScreen.jsx:86` | `analysis.summaryPhraseKey` — **chosen by the server** |
| `src/screens/OnboardingMissionScreen.jsx:62` | literal `'coach.onboardingMission.greeting'` |

Expanding every key-producing expression against `VALID_CATEGORIES` (`server/categories.js:3-9`), the
`ai_move` tag list, and qualities `optimal|suboptimal|blunder`:

**225 coach leaf keys = 215 played + 10 not played.**

Played, by producing source:

| Count | Producer |
|---|---|
| 66 | `server/index.js` (`coachPhraseKey`, see T5) / `server/evaluateMoveHandler.js:94` → `useGameBoard.js:275` (`coach.<cat>.<quality>.<i>`) |
| 45 | `useGameBoard.js:150,156,160,169,174` (`coach.ai_move.<tag>.<i>`) |
| 35 | `ChallengeScreen.jsx:118 → 127` (`coach.<cat>.prompt.<i>`) |
| 29 | `ChallengeScreen.jsx:354`; `useGameBoard.js:281,286` (`coach.generic.<quality>.<i>`) |
| 21 | `ChallengeScreen.jsx:401 → 405` (`coach.<cat>.hint.<0\|1>`) |
| 6 | `server/index.js` (two `phrasePool` sites, see T5) → `ReviewScreen.jsx:86` (`coach.sparring.review.<clean\|mistakes>.<i>`) |
| 3 | `ChallengeScreen.jsx:549 → 550-551` (`coach.forbidden_columns.<quality>.0`, see T3) |
| 3 | `useGameBoard.js:184,191,296,321` (`coach.sparring.outcome.<win\|loss\|draw>`) |
| 2 | `useGameBoard.js:116` (`coach.sparring.intro.<i>`, `introKey` default — never overridden) |
| 2 | `useGameBoard.js:106` (`coach.sparring.hint.generic.<i>`) |
| 2 | `ChallengeScreen.jsx:620-622,643-645` (`coach.forced_win.<optimal\|blunder>.0`) |
| 1 | `OnboardingMissionScreen.jsx:62` |

**Not played today (10):**

| Key | Class | Disposition |
|---|---|---|
| `coach.title` | chrome | → `coach.ui.*` (D5) |
| `coach.weaknessMap` | chrome | → `coach.ui.*` |
| `coach.queueCount_one` | chrome (interpolated) | → `coach.ui.*` |
| `coach.queueCount_other` | chrome (interpolated) | → `coach.ui.*` |
| `coach.startReview` | chrome | → `coach.ui.*` |
| `coach.emptyQueue` | chrome | → `coach.ui.*` |
| `coach.missRate` | chrome | → `coach.ui.*` |
| `coach.home.welcome.0` | **dialogue, unreachable** | → `coach.spoken.*` + fix play site (D3) |
| `coach.summary.perfect.0` | **dialogue, unreachable** | → `coach.spoken.*` + **D6** |
| `coach.summary.perfect.1` | **dialogue, unreachable** | → `coach.spoken.*` + **D6** |

The 7 chrome keys are **exactly** the top-level leaf strings under `coach.`; the 18 subtrees (`home`,
`onboardingMission`, the 12 categories, `generic`, `summary`, `sparring`, `ai_move`) are **exactly** the
dialogue pools. Nothing straddles — so the partition is mechanically checkable.

**Verified unreachable:** `grep -c speakCoachMessage src/screens/HomeScreen.jsx` → `0`;
same for `src/screens/PostSetSummaryScreen.jsx` → `0`. Both render the text via `t()` only
(`HomeScreen.jsx:126`, `PostSetSummaryScreen.jsx:81`). `CoachDialog` never speaks — it only reads a
pre-supplied `m.audio` field (`src/components/CoachDialog.jsx:8`).

---

## 4. Non-obvious facts and traps

**T1 — `--scan-only` DESTROYS approval state, AND the registry/manifest are two stores that can
silently disagree. Do not use `--scan-only` for this migration, and never rebuild the manifest from
registry status.**

`scripts/generate-tts.js:130-158` (`scanOnly`) rebuilds the registry from scratch; every entry is
pushed with `status: 'needs_audio'`, `generated_at: null`, `approved_at: null`, and `saveRegistry`
overwrites the file. It never merges with the existing registry. Running it after the rename would
reset every approved entry per language and present unchanged clips as needing regeneration — real
API spend for audio whose text did not change. **The migration must rewrite the registry in place,
preserving `status` / `generated_at` / `approved_at`.**

Verified 2026-07-16 (script against the live files, both languages):
```
en: registry {"approved":222,"ineligible":3} (225 entries) | manifest 222 entries — no drift
es: registry {"approved":222,"ineligible":3} (225 entries) | manifest 222 entries — no drift
```
Registry and manifest agree *right now*. They did not always: this is exactly the state
`saveManifest`'s `.filter(e => e.status === 'approved')` rule (`scripts/generate-tts.js` — see
`saveManifest`) is supposed to produce, and until the owner approved the outstanding audio earlier
today, it didn't — the manifests held 222 slugs while only 220 registry entries were `status ===
'approved'`. **That drift is not a one-time accident: regenerating a single clip
(`generate-tts.js --key <key>`) flips its `status` to `awaiting_approval` and updates `generated_at`,
but never touches the manifest.** So "rebuild the manifest from `status === 'approved'`" and "remap
the existing manifest in place" happen to produce the same file *today*, but are not the same
operation, and only the second is safe against a regeneration that lands between "read the registry"
and "run the migration." **Per D8: remap in place, always.** Concretely — build an
old-slug→new-slug map from the registry rename (step 2 below), then
`newManifest = oldManifest.map(slug => renameMap.get(slug)).filter(Boolean)`; never derive the new
manifest from `entries.filter(e => e.status === 'approved')`.

**T2 — the slug-derivation logic is triplicated under two DIFFERENT names and must stay behaviorally
identical.**
- `scripts/generate-tts.js:95-97` — `function keyToSlug(key)`
- `src/lib/useCoachSpeech.js:136-138` — `function keyToSlug(key)` (comment: *"must match
  generate-tts.js and server"*)
- `server/index.js` — `function keyToAudioSlug(key) { return key.replace(/[._]/g, '--'); }`
  (verified 2026-07-16 at line 3468; **the server's function is named `keyToAudioSlug`, not
  `keyToSlug`** — do not search for the wrong name. `server/index.js` is modified on the current
  branch, so re-locate with `grep -n "function keyToAudioSlug" server/index.js` rather than trusting
  this line number.)

All three implement `key.replace(/[._]/g, '--')`. Adding a `spoken` segment changes every slug
(`coach--spoken--home--welcome--0`), so every dialogue mp3 must be renamed (7 non-dialogue/chrome
keys and the 2 pre-existing orphan files are excluded — see T-4).

**T3 — a genuinely spoken key is interpolated.**
`coach.forbidden_columns.suboptimal.0` contains `{{` and is `ineligible`, yet it *is* played (the
`coachKey = \`coach.forbidden_columns.${quality}.0\`` assignment in `ChallengeScreen.jsx`, verified
2026-07-16 at line 549 — `grep -n 'forbidden_columns.\${quality}' src/screens/ChallengeScreen.jsx`).
It degrades silently because `enqueueIfApproved` no-ops on an unapproved slug. So **`ineligible` and "intended to be spoken" legitimately coexist** — the tripwire (T8) must not
treat ineligible-but-intended as a failure. This is pre-existing and out of scope to fix here.

**T4 — one silent breakage site.** `src/screens/ReviewScreen.jsx:282`:
```js
    const isCleanPhrase = analysis.summaryPhraseKey.startsWith('coach.sparring.review.clean');
```
A missed rename here does not throw — the branch silently goes false forever.

**T5 — the server produces played keys.** `server/index.js` is modified on the current branch, so
locate these by symbol, not line number:
- the `coachPhraseKey = phrasePoolKey ? pickFromPool(i18nTranslations, \`coach.${phrasePoolKey}.${quality}\`) : null;`
  assignment inside the `POST /api/evaluate-move` handler (verified 2026-07-16 at line 1780 —
  `grep -n 'pickFromPool(i18nTranslations, \`coach' server/index.js`)
- two `'coach.sparring.review.clean' / 'coach.sparring.review.mistakes'` literal pairs — one feeding
  `cSummaryKey` in the cached-analysis branch, one feeding `summaryPhraseKey` in the live-analysis
  branch (verified 2026-07-16 at lines 2196-2197 and 2349-2350 —
  `grep -n 'coach.sparring.review' server/index.js`)
- `server/evaluateMoveHandler.js:94` — same `coach.${phrasePoolKey}.${quality}` pattern (this file is
  not modified on this branch; the line is stable)

Server and client must be renamed **in the same commit** or `ReviewScreen`/`useGameBoard` receive keys
that no longer resolve.

**T6 — a non-coach key is passed to `speakCoachMessage`.** `ChallengeScreen.jsx` sets
`lastCoachKeyRef.current = 'error.generic'` (verified 2026-07-16 at line 652 — re-locate with
`grep -n "error.generic" src/screens/ChallengeScreen.jsx`). It is not under `coach.` and is never
approved → harmless no-op. **Do not migrate it**; it is not TTS-eligible.

**T7 — pool probing is prefix-agnostic.** `pickRandomKey` (`src/lib/coachUtils.js`) and the
`patternPool` probe (`useGameBoard.js:170`) detect pool membership via `t(key) !== key`. They work
unchanged provided every prefix is updated consistently.

**T8 — en/es key parity is enforced** by `i18nKeyParity.test.js` (per project memory). Both files must
move identically.

**T9 — no DB migration.** Coach keys are computed per request via `pickFromPool` and are never
persisted (`grep` for `phrase_key|coach_key` over `server/` → no hits). Nothing stale can be read back.

---

## 5. Settled decisions record (D5–D9)

All decisions below are final — see §2 for the full text of each. Nothing in this plan is pending.

| # | Decision | Disposition |
|---|---|---|
| D5 | Chrome cluster (7 keys) | → `coach.ui.*`; 5 approved orphan mp3s deleted (not renamed) |
| D6 | `coach.summary.perfect.{0,1}` | → `coach.spoken.*` **and** `PostSetSummaryScreen` gets a `speakCoachMessage` call |
| D7 | Slug strategy | Rename all dialogue mp3s (`git mv`); never strip `spoken` inside the slug functions |
| D8 | Manifest migration | Remap in place (old slug → new slug over the live manifest array); never rebuild from `status === 'approved'` |
| D9 | Explorer orphans | `coach--sparring--explorer--intro--{0,1}.mp3` (en only) deleted in T-4; §7's orphan check stays strict |

---

## 6. Tasks

### T-1 — Migrate the i18n trees
Move all **18 subtrees** under `coach.` → `coach.spoken.` in **both** `src/i18n/en.json` and
`src/i18n/es.json`. Move the **7 chrome leaves** → `coach.ui.` (D5).
Chrome keys keep their text unchanged; `coach.startReview` stays `"Start review"` / `"Iniciar repaso"`
(no terminal period — it is a label, per §3).

### T-2 — Update the generator
`scripts/generate-tts.js:132`, `:183`, `:225`: `flattenKeys(enRaw, 'coach.')` → `flattenKeys(enRaw, 'coach.spoken.')`.
Keep the `{{` → `ineligible` rule (T3).

### T-3 — Update all key producers (~35 literals)
Line numbers below were freshly verified 2026-07-16 against the working tree unless noted. `server/index.js`
is under active modification on this branch — locate its sites with the `grep` commands given, not the
numbers.

- `src/screens/ChallengeScreen.jsx`:
  - `118` — `candidateKeys = [0, 1, 2].map(i => \`coach.${effectiveCategory}.prompt.${i}\`)`
  - `354` — `pickRandomKey(t, \`coach.generic.${coachQuality}\`, used)`
  - `401` — `keys = [\`coach.${effectiveCategory}.hint.0\`, \`coach.${effectiveCategory}.hint.1\`]`
  - `549` — `coachKey = \`coach.forbidden_columns.${quality}.0\`` (T3 — verify with
    `grep -n 'forbidden_columns.\${quality}' src/screens/ChallengeScreen.jsx`, do not trust `549` if
    the file has changed since)
  - `620-622` — the `'coach.forced_win.optimal.0'` literal (three uses: `summaryLineKey`,
    `lastCoachKeyRef.current`, `t(...)`) — verify with
    `grep -n "coach.forced_win.optimal.0" src/screens/ChallengeScreen.jsx`
  - `643-645` — the `'coach.forced_win.blunder.0'` literal (same pattern) — verify with
    `grep -n "coach.forced_win.blunder.0" src/screens/ChallengeScreen.jsx`
  - **not** `lastCoachKeyRef.current = 'error.generic'` — see T6
- `src/lib/useGameBoard.js`: `18` (`introKey` default), `106`, `150`, `156`, `160`, `169`, `174`,
  `184`, `191`, `281`, `286`, `296`, `321`
- `src/screens/HomeScreen.jsx:126`
- `src/screens/PostSetSummaryScreen.jsx:81`
- `src/screens/OnboardingMissionScreen.jsx:62` — `speakCoachMessage('coach.onboardingMission.greeting')`
  (verify with `grep -n "onboardingMission.greeting" src/screens/OnboardingMissionScreen.jsx`)
- `src/screens/ReviewScreen.jsx:282` (**T4 — silent if missed**)
- `server/index.js` — three sites, see T5 for the exact symbols/grep commands (verified 2026-07-16 at
  lines 1780, 2196-2197, 2349-2350)
- `server/evaluateMoveHandler.js:94` (not modified on this branch; line is stable)
- Doc comments referencing example keys (`'coach.immediate_threat.optimal.0'`):
  `src/lib/useCoachSpeech.js:249`, `src/lib/coachUtils.js:2` (both verified stable, 2026-07-16),
  `server/index.js` (verified 2026-07-16 at line 1695 — re-locate with
  `grep -n "coach.immediate_threat" server/index.js`), `server/evaluateMoveHandler.js:33` (stable)

### T-4 — One-off migration script (registry + assets + manifests)
Write `scripts/migrate-coach-spoken.mjs` (delete after the migration lands, or keep with `--help`).
It must, **per language** (`en`, `es`):
1. Load the existing registry (`server/tts-registry.json`, `server/tts-registry.es.json`) and the
   existing manifest (`public/audio/coach/coach-audio-manifest.json`,
   `public/audio/coach/es/coach-audio-manifest.json`).
2. For each registry entry whose key is a dialogue key (i.e. not one of the 7 chrome leaves): rewrite
   `key` → `coach.spoken.<rest>` and `slug` → `keyToSlug(newKey)`. **Preserve `status`, `generated_at`,
   `approved_at` verbatim (T1).** Build an `oldSlug → newSlug` map while doing this.
3. Drop registry entries for the 7 chrome keys entirely (they move to `coach.ui.*` in the i18n tree
   per T-1/D5 but are never TTS-tracked).
4. `git mv` each renamed mp3 from its old slug to its new slug (dialogue entries only).
5. **Remap each manifest in place (D8) — do NOT rebuild from `status === 'approved'`:**
   `newManifest = oldManifest.map(slug => renameMap.get(slug)).filter(Boolean)`. This both renames
   surviving slugs and drops the 5 approved chrome slugs per language (they have no entry in
   `renameMap`), while never re-deriving membership from registry status (T1).
6. Delete the 5 orphan chrome mp3s per language:
   `public/audio/coach/coach--{title,weaknessMap,startReview,emptyQueue,missRate}.mp3` and the same
   five under `public/audio/coach/es/`. (`queueCount_one`/`queueCount_other` are `ineligible` and
   never had mp3s — nothing to delete for them.)
7. Delete the 2 pre-existing orphan mp3s (D9, en only, unrelated to any registry/manifest entry):
   `public/audio/coach/coach--sparring--explorer--intro--0.mp3` and `...--intro--1.mp3`.

**Idempotence + dry-run:** default to `--dry-run` printing the rename table; require `--apply` to write.

**Expected post-migration numbers (derive fresh with a script — do not hardcode from this table into
the migration script's assertions without re-deriving):** registry 225 → 218 entries/language
(217 approved + 1 ineligible — the survivor is `coach.spoken.forbidden_columns.suboptimal.0`, see
T3); manifest 222 → 217 slugs/language; mp3s on disk → 217/language (en: 224 − 5 chrome − 2 explorer;
es: 222 − 5 chrome). Verified against the live files 2026-07-16; re-verify before relying on these in
§7, since the registry/manifest are edited between now and execution.

### T-5 — Fix the reachability bugs (D2)
- `HomeScreen`: add `useCoachSpeech()` + `speakCoachMessage('coach.spoken.home.welcome.0')` on mount,
  guarded against React 18 StrictMode double-fire — mirror the `startedRef` guard in
  `OnboardingMissionScreen` (verified 2026-07-16: `const startedRef = useRef(false);` followed by a
  `useEffect(() => { if (startedRef.current) return; startedRef.current = true; ...
  speakCoachMessage('coach.onboardingMission.greeting'); }, [])`, at lines 55-62 — re-locate with
  `grep -n "startedRef" src/screens/OnboardingMissionScreen.jsx`).
- `PostSetSummaryScreen`: per D6.

### T-6 — Tripwire test
Add a test asserting **every registry key starts with `coach.spoken.`** and **no key under
`coach.ui.` appears in any registry or manifest**. This is the layer the namespace cannot enforce by
itself. Must tolerate `ineligible` entries (T3).

### T-7 — Document the invariant
Add to `docs/architecture/` (per CLAUDE.md's two-destination rule — this is a convention, not a gotcha):
`coach.spoken.*` = intended to be voiced, the sole TTS-eligible namespace; `coach.ui.*` = screen chrome,
never synthesized. State that intent lives in the namespace and reachability is enforced by the T-6 test.

---

## 7. Verification

Every check below must be run against **actual pre- and post-migration files**, not against the numbers
printed here — this table is a record of what was true 2026-07-16, not a substitute for re-deriving.

**Pre-migration baseline (verified 2026-07-16, re-verify immediately before running T-4):**
- Registry: `en`/`es` both `{"approved":222,"ineligible":3}`, 225 entries total. No approved/ineligible
  drift between the two languages.
- Manifest: 222 slugs, both languages. No drift against the registry's 222 approved entries (see T1 —
  this agreement is not guaranteed to hold at execution time; re-check).
- mp3s on disk: `en` = 224 (222 tracked + 2 pre-existing orphans, D9), `es` = 222 (no orphans).
- Known orphans (must exist pre-migration, must be GONE post-migration — this is the falsifiable core
  of check 5): `coach--sparring--explorer--intro--0.mp3`, `...--intro--1.mp3` (en only).

**Expected post-migration state (derive fresh — see T-4):** registry 218 entries/language (217
approved + 1 ineligible, survivor = `coach.spoken.forbidden_columns.suboptimal.0`); manifest 217
slugs/language; mp3s on disk 217/language, both languages equal.

1. `npm run test:fast` (inside `connect-four/`) — green, including `i18nKeyParity.test.js` and T-6.
2. **No stale prefixes:** `rg "['\"\`]coach\.(?!spoken\.|ui\.)" src/ server/ scripts/` returns only the
   `lastCoachKeyRef.current = 'error.generic'` line in `ChallengeScreen.jsx` (T6 — `error.generic` is
   not a `coach.` key; the `coach.` in the regex won't even match it) — expect zero `coach.` literals
   otherwise.
3. **Registry state preserved, field-by-field (T1/D8) — the check must NOT be an aggregate-count
   comparison, since counts legitimately change (225→218) from the chrome removal:**
   ```js
   // pseudocode: for every entry in the pre-migration registry snapshot whose key is NOT one of
   // the 7 chrome keys, find its renamed counterpart in the post-migration registry by newKey =
   // 'coach.spoken.' + oldKey.slice('coach.'.length), and assert:
   //   post.status === pre.status && post.generated_at === pre.generated_at &&
   //   post.approved_at === pre.approved_at
   // Also assert: post-migration registry.length === pre-migration registry.length - 7 (per language)
   // and post-migration registry has zero entries whose key matches any of the 7 chrome keys' old form.
   ```
   This is the direct fix for the drift blocking-issue: it fails loudly if any dialogue entry's
   approval state changes, rather than passing on a coincidental count match.
4. **No missing assets:** every slug in each manifest resolves to an existing mp3:
   ```
   node -e 'const fs=require("fs");for(const l of ["en","es"]){const d=l==="en"?"public/audio/coach":"public/audio/coach/es";
   JSON.parse(fs.readFileSync(`${d}/coach-audio-manifest.json`)).forEach(s=>{if(!fs.existsSync(`${d}/${s}.mp3`))console.log("MISSING",l,s)})}'
   ```
   Also assert `manifest.length === 217` for both languages.
5. **No orphan assets (D9):** every mp3 on disk appears in its language's manifest. This check is
   **known to fail pre-migration** (the 2 explorer orphans, baseline above) — that is expected and is
   exactly why T-4 step 7 deletes them. Run it twice: once pre-migration to confirm the 2 known
   failures and nothing else, once post-migration to confirm zero failures. A post-migration pass with
   zero exceptions catches any missed rename; a pre-migration pass with more than the 2 known failures
   means something else is wrong and the migration should not proceed.
6. **Zero re-synthesis:** the diff contains only `git mv` renames and deletions under
   `public/audio/coach/` — no modified mp3 blobs. Confirm with `git diff --stat -M`.
7. **Runtime:** with the app on localhost, confirm coach audio still plays on (a) the onboarding
   greeting, (b) a Challenge attempt, (c) a sparring AI move, (d) the Review screen summary, (e) the
   Home welcome (new, per T-5/D3), and (f) the perfect-set summary on `PostSetSummaryScreen` (new, per
   T-5/D6). Per CLAUDE.md, verify at the source layer — listen, don't infer from a green test.

---

## 8. Out of scope

- Fixing `coach.forbidden_columns.suboptimal.0`'s interpolation (T3) — pre-existing.
- Re-recording or re-approving any audio: **no text changes**, so no clip needs regeneration.
- The `error.generic` no-op in `ChallengeScreen.jsx` (T6).
