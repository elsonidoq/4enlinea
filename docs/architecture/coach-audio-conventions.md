# Coach audio conventions — the `coach.spoken.*` / `coach.ui.*` split

**Read before** adding any string under `coach.` in `src/i18n/en.json` / `es.json`, touching
`scripts/generate-tts.js`, or changing the TTS registry / audio manifest.

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
site** — never a reason to weaken the generator's predicate. (Two such latent bugs —
`coach.spoken.home.welcome.0` and `coach.spoken.summary.perfect.{0,1}`, rendered via `t()` but never
spoken — were fixed by adding the missing `speakCoachMessage` calls in `HomeScreen` and
`PostSetSummaryScreen`, not by excluding the keys.)

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

## `--scan-only` destroys approval state

`generate-tts.js --scan-only` rebuilds the registry **from scratch**: every entry is pushed with
`status: 'needs_audio'`, `generated_at: null`, `approved_at: null`, and the file is overwritten with
no merge. Never use it to reconcile a rename or a namespace change — it resets every approved entry
and presents unchanged clips as needing regeneration, i.e. real API spend for identical audio. Text
unchanged ⇒ no clip needs re-synthesis; move assets with `git mv`.

## Adding a new coach string — checklist

1. Spoken? Put it under `coach.spoken.<pool>.*` in **both** `en.json` and `es.json`
   (`i18nKeyParity.test.js` enforces the pair). Chrome? `coach.ui.*`, and you are done.
2. Add the play site — `speakCoachMessage('coach.spoken.…')` — in the same change. Intent without a
   play site is a bug.
3. Run `generate-tts.js` for the new key only; approve it. Do **not** run `--scan-only`.
4. `npm run test:fast` — `coachSpokenNamespace.test.js` checks registry/manifest/asset agreement.
