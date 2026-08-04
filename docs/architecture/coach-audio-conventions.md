# Coach audio conventions — the `coach.spoken.*` / `coach.ui.*` split

**Read before** adding any string under `coach.` in `src/i18n/en.json` / `es.json`, touching
`scripts/generate-tts.js`, or changing the TTS registry / audio manifest.

**Not the same pipeline as lesson audio.** This file covers the i18n-keyed `coach.spoken.*` pipeline
(`scripts/generate-tts.js`, the TTS registry/manifest). Lesson narration (`lessons/*.json`'s
`coachMessages`/`infoProse`/`socratic.messages`) is a separate, hash-keyed pipeline —
`server/lessonAudio.js` and its corpus CLI `scripts/generate-lesson-audio.mjs` — documented under
"Admin Batch-Generation Modules — Pure-Function Pattern" and "Lesson audio corpus CLI" in
`docs/architecture/server-conventions.md`. Both pipelines ultimately synthesize through the single
shared entry point `server/ttsProvider.js`'s `synthesize(text, lang)` (spec 051 FR-026/FR-027), which
resolves voice/model/speed/instructions from `tts-prompt.<lang>.json` internally — no caller of either
pipeline can omit or override them.

## The single-synthesis-path guarantee — `synthesize` vs `synthesizeRaw`

`server/ttsProvider.js` exports four synthesis functions, in two pairs. The precise guarantee is
**"exactly one path that can *ship* a clip"** — not "exactly one path", full stop. Both pairs can
genuinely call OpenAI TTS and get audio back; they differ in who may call them and what happens to
the result.

| Function | Who may call it | Config source | Can it ship a clip? |
|---|---|---|---|
| `synthesize(text, lang)` / `synthesizeStream(text, lang)` | The 5 production callers only: `server/index.js`'s `generate`, `generate-all`, `deep-reveal` routes; `server/lessonAudio.js`; `scripts/generate-tts.js`. | Resolved **internally** from `lang` via `resolveSynthesisConfig(lang)` → `readTtsConfig(lang)` + `buildTtsInstructions`. No `opts` parameter exists, so a caller cannot supply *or* omit voice/model/speed/instructions — there is nothing to omit. | **Yes** — this is the only path whose output is ever written to a registry entry, a manifest row, or a lesson JSON's `audio`/`audio_es` field. |
| `synthesizeRaw(text, opts)` / `synthesizeStreamRaw(text, opts)` | `POST /api/admin/audio/preview` only (the admin TTS sandbox, for auditioning experimental voice/speed/instructions before committing them to `tts-prompt.<lang>.json`). | Caller-supplied `opts` — including deliberately empty `instructions`, to audition "no style at all". | **No** — the preview route never writes a file to a stable path, never touches a registry/manifest, and never updates a lesson JSON. Its output is played once in the browser and discarded. |

Both pairs share one refusal, independent of the caller: a `model` outside `ALLOWED_TTS_MODELS =
['gpt-4o-mini-tts']` (a private, non-exported constant in `ttsProvider.js`) is rejected before any
network call — `synthesizeRaw`/`synthesizeStreamRaw` refuse it directly; `synthesize`/`synthesizeStream`
inherit the refusal because they call `resolveSynthesisConfig` first, which throws on the same
condition. This is deliberately a second, independent layer of defense on top of
`ttsConfig.mjs`'s `VALID_TTS_MODELS` allow-list (research.md R2): even if a legacy model
(`tts-1`/`tts-1-hd`, which silently ignores `instructions` — the OI-32 failure mode) somehow made it
into `tts-prompt.<lang>.json`, synthesis itself still refuses to speak with it, at both the
production entry point and the sandbox.

**Why the sandbox needs its own escape hatch instead of just calling `synthesize`.** Auditioning a
*candidate* voice/speed/instructions combination — the whole point of the preview route — requires
passing values that don't yet exist in `tts-prompt.<lang>.json`. `synthesize(text, lang)` has no
parameter to carry them; it can only ever speak the config already committed to disk. `synthesizeRaw`
is that necessary second path — real, callable, capable of producing audio — but it is never wired to
anything that persists a result, so nothing it produces can become a shipped clip. The single-path
guarantee is therefore about **shipping**, not about **synthesizing**: two functions can synthesize,
one function's output is ever reachable by an end user.

**Enforcement.** `server/ttsProvider.test.js` asserts this mechanically, including two lint-style
checks (each demonstrated RED by inserting a real violating line before writing the assertion, per
this repo's verification convention):
- no file other than `ttsProvider.js` constructs an OpenAI TTS request directly (`fetch(...)` /
  `https://api.openai.com/v1/audio/speech`) — a would-be direct caller must go through this module;
- no file outside `ttsProvider.js` and the preview handler (`server/index.js`'s
  `POST /api/admin/audio/preview`) imports `synthesizeRaw`/`synthesizeStreamRaw` — a new caller
  cannot silently reach the unshipped-but-real second path; it can only reach `synthesize`/
  `synthesizeStream`, which cannot omit config.

If a future change needs a 6th production caller, it must import `synthesize`/`synthesizeStream`, not
`synthesizeRaw`/`synthesizeStreamRaw` — importing the Raw pair outside the preview handler is exactly
the violation the second lint above exists to catch.

## The invariant

Every other top-level i18n namespace (`nav`, `game`, `puzzle`, `auth`, `home`, …) is a
**feature/screen** namespace. `coach.` is the one namespace that is also asked to carry a
**modality** distinction — which of its strings are spoken aloud. Those two taxonomies are split
explicitly, one level down:

| Namespace | Meaning | TTS |
|---|---|---|
| `coach.spoken.*` | **Declares intent to be voiced.** The coach's dialogue pools. | The **sole** TTS-eligible namespace. Everything here gets an mp3. |
| `coach.ui.*` | Screen chrome — labels, headings, counters rendered with `t()`. | **Never** synthesized. |

`scripts/generate-tts.js` selects work by exactly this predicate —
`flattenKeys(enRaw, 'coach.spoken.')` (three sites) — so **the namespace is the switch**. Putting a
button label under `coach.spoken.*` ships a clip of that label to users; the bug this split fixed was
audio that said only *"miss rate"*.

## Intent, not reachability

The namespace declares **intent**, and the generator generates for intent. A key under
`coach.spoken.*` that no code path plays is therefore **a bug in the player, to be fixed at the play
site** — never a reason to weaken the generator's predicate. (One such latent bug —
`coach.spoken.summary.perfect.{0,1}`, rendered via `t()` but never spoken — was fixed by adding the
missing `speakCoachMessage` call in `PostSetSummaryScreen`, not by excluding the key.

**`coach.spoken.home.welcome.0` was the other, and on 2026-08-04 it was resolved the other way,
deliberately: the owner did not want Home to speak on arrival.** The rule above still holds — the
resolution was to move the string to `coach.ui.homeWelcome` and delete its registry entries,
manifest slugs and mp3s, *not* to leave an unvoiced key sitting in `coach.spoken.*`. That is the
shape of a legitimate "stop voicing this" change: **change the namespace, don't orphan the key.**
Leaving it under `coach.spoken.*` with no play site is what made someone add a play site in the
first place.)

Reachability is enforced by `tests/unit/coachSpokenNamespace.test.js`, because a namespace cannot
enforce itself. That test is the layer that catches a chrome string added under `coach.spoken.*`, a
stale registry key, an orphan mp3, or a manifest slug with no asset.

**`ineligible` and "intended to be spoken" legitimately coexist.** A `coach.spoken.*` key containing
`{{` is marked `ineligible` (it cannot be pre-synthesized), yet may still be passed to
`speakCoachMessage` — playback silently no-ops on an unapproved slug. The tripwire tolerates this;
`coach.spoken.forbidden_columns.suboptimal.0` is the live example.

## Slugs: one derivation, three copies

`slug = key.replace(/[._]/g, '--')`, implemented identically in three places that must stay in
lockstep:

- `scripts/generate-tts.js` — `keyToSlug`
- `src/lib/useCoachSpeech.js` — `keyToSlug`
- `server/index.js` — `keyToAudioSlug` (**different name, same function**)

The slug is derived from the **full** key, so `spoken` appears in every filename
(`coach--spoken--home--welcome--0.mp3`). Do not special-case `spoken` out of the slug functions to
avoid renaming assets — filename ⇄ key must stay 1:1.

## Registry and manifest are two stores, and they can drift

- **Registry** (`server/tts-registry.json`, `server/tts-registry.es.json`) — per-key
  `status` / `reason` / `generated_at` / `approved_at`.
- **Manifest** (`public/audio/coach/coach-audio-manifest.json`, `.../es/…`) — the flat array of
  slugs the client is allowed to play (`enqueueIfApproved`).

`saveManifest` derives the manifest from `status === 'approved'`, but the two files are **not**
guaranteed to agree at any given moment: regenerating one clip (`generate-tts.js --key <key>`) flips
that entry's `status` to `awaiting_approval` and updates `generated_at` **without touching the
manifest**. Any bulk operation must therefore **remap the existing manifest array in place**, never
rebuild it from registry status — a rebuild silently drops whatever the manifest disagrees about.

## Registry state is not derivable — so nothing discards it silently

`status` / `generated_at` / `approved_at` record **that a human listened to a clip**. That fact exists
nowhere else: it cannot be recomputed from the i18n tree, the mp3s, or the manifest. So every
`generate-tts.js` command either preserves it or asks first.

| Command | Effect |
|---|---|
| `--sync` | Merges the i18n tree into the registry: adds new keys as `needs_audio`, **preserves** the state of everything already there. Idempotent. This is what you want after adding a coach line. |
| `--scan-only` | Deprecated alias for `--sync` (it used to rebuild — see below). |
| `--all-new` | Synthesizes only `needs_audio` entries. Never touches an approved clip. |
| `--key <k>` | Synthesizes one key. **Prompts** if that key is already approved. |
| `--reset` | Rebuilds from scratch, discarding every approval. **Prompts.** Rarely correct. |
| `--help` | Usage. Also the no-argument default — running the script bare does nothing. |

`--sync` emits entries in i18n order, which is canonical. Because `--key` appends new entries at the
end, a sync can rewrite the file purely to reorder it; that loses nothing and is reported as
`↕ entries reordered`.

**Why `--reset` is worse than it looks.** It keeps the mp3s and the manifest, so the app keeps playing
audio and nothing looks broken — but the registry and manifest then **disagree**, and `/admin/audio`
offers to regenerate every clip whose text never changed (real API spend for byte-identical audio).
Never use it to reconcile a rename or a namespace change: text unchanged ⇒ no clip needs
re-synthesis; move assets with `git mv`.

**Why `--key` prompts on an approved clip.** `synthesizeAndWrite` overwrites the mp3 **in place**, and
the manifest still lists that slug — so the new take goes live *immediately, unapproved*, and the
recording someone signed off on is gone (recoverable only via `git checkout`).

Destructive prompts require typing the literal word `yes`. With no TTY they refuse rather than hang;
pass `--yes` to proceed in CI.

## Adding a new coach string — checklist

1. Spoken? Put it under `coach.spoken.<pool>.*` in **both** `en.json` and `es.json`
   (`i18nKeyParity.test.js` enforces the pair). Chrome? `coach.ui.*`, and you are done.
2. Add the play site — `speakCoachMessage('coach.spoken.…')` — in the same change. Intent without a
   play site is a bug.
3. `generate-tts.js --sync --lang all` to register the key, then
   `node --env-file=server/.env scripts/generate-tts.js --key <key> --lang all` to synthesize it.
   Approve via `/admin/audio` (the CLI has no approve command). Never `--reset`.
4. `npm run test:fast` — `coachSpokenNamespace.test.js` checks registry/manifest/asset agreement;
   `generateTtsMerge.test.js` covers the merge itself.
