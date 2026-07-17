# Implementation Plan: Audio & Interactive Coach (Epic 10)

**Branch**: `stagging` | **Date**: 2026-06-18 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/039-audio-interactive-coach/spec.md`

---

## Summary

Epic 10 adds four independent capability tracks to the Connect Four coaching app:

1. **Sound effects + background music** — disc-drop physics sounds, win/correct/wrong feedback, ambient loop; three independent mute toggles persisted in `localStorage`.
2. **Coach message pacing** — (a) replace the `await delay(400)` in `useGameBoard.js:348` with `COACH_PACING_MS = 1200`; (b) introduce a **new** 1200ms delay in `ChallengeScreen.jsx` between the user-move coach message and the AI-move coach message (no existing timer to replace — this is new code).
3. **KB term glossary in deep reveal** — new `[term:kbId]...[/term:kbId]` inline tags emitted by the LLM, parsed client-side alongside existing `[zone:...]` tags, rendered as tappable spans with popup definitions.
4. **Spoken coach (TTS)** — pre-generated MP3s for all 221 static non-interpolated coach i18n keys; an `/admin/audio` localhost-only page to generate, listen, and approve them.

Technical approach: KB injection into `explainContext.js`; `terms` embedded in existing `deep_reveal_json` JSONB field (no migration); `parseAnnotatedText` extension; `AnnotatedExplanation`/`AnnotatedText` term popup; `ttsProvider.js` OpenAI wrapper; `scripts/generate-tts.js` CLI.

---

## Technical Context

**Language/Version**: Node.js 20+, React 18, Vite  
**Primary Dependencies**: Express 5, OpenAI SDK (TTS + chat completions), Web Audio API / HTML Audio  
**Storage**: Supabase PostgreSQL (`terms` map embedded in the existing `explanation_cache.deep_reveal_json` JSONB field — no schema migration); `localStorage` for audio preferences; committed MP3 files in `connect-four/public/audio/`  
**Testing**: `node --test` for server helpers; manual QA on golden paths  
**Target Platform**: Web (PWA), mobile-first  
**Project Type**: Web application (fullstack monorepo at `connect-four/`)  
**Performance Goals**: SFX playback latency < 100ms; TTS admin page loads in under 2 s  
**Constraints**: Audio preferences persisted locally (no server round-trip); KB injection must not add latency to the critical LLM path beyond the existing classifier calls already in `buildExplainContext`  
**Scale/Scope**: ~221 static TTS keys; ~9 eligible KB terms; 7 SFX assets; 2 pacing call-sites

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Principle I — Explanation Engine as Single Source of Truth**:
- [x] KB term injection goes through `buildExplainContext` (the grounding flow), not through a new independent LLM call. The `terms` map is derived from classifier-detected patterns, not hallucinated.
- [x] The `short_summary` content is authored from KB entry `statement` fields (human-written), never LLM-speculated.

**Principle II — Code Quality & Simplicity**:
- [x] Audio preference hook is a thin `localStorage` read/write — no Redux, no new Context.
- [x] `COACH_PACING_MS` is a module-level constant imported by both `useGameBoard.js` and `ChallengeScreen.jsx` — one definition, two uses.
- [x] No speculative abstractions: the term popup is a simple CSS-positioned `<div>`, not a generic tooltip framework.

**Principle III — Testing Standards**:
- [x] `parseAnnotatedText` extension: unit-tested with a fixture containing both `[zone:...]` and `[term:...]` tags in the same string.
- [x] KB injection: manually verified by opening a deep-reveal for a z_threat position and confirming `[term:community-z-threat]` appears in the explanation.
- [x] Pacing: manually verified by timing the gap between coach messages in sparring.

**Principle IV — UX Consistency & Progressive Disclosure**:
- [x] Term popup is a tap-to-reveal popup (not automatically expanded). Progressive disclosure respected.
- [x] Zone references and term references are visually distinct — no ambiguity between "highlight a board region" and "show a definition".

**Principle V — Performance**:
- [x] KB injection adds at most one `readFileSync` call per eligible pattern (synchronous, cached at startup). No new solver calls.
- [x] Audio preference check is synchronous `localStorage.getItem` — no latency.

**Principle VIII — Documentation as First-Class Deliverable**:
- [x] All existing architecture docs were read before this plan was drafted (api-conventions.md, frontend-conventions.md, server-conventions.md).
- [x] New `terms` API field → must be documented in `api-conventions.md` (task in tasks.md).
- [x] New audio preference pattern → must be documented in `frontend-conventions.md` (task in tasks.md).

---

## Project Structure

### Documentation (this feature)

```text
specs/039-audio-interactive-coach/
├── plan.md              ← this file
├── research.md          ← Phase 0 output (this command)
├── data-model.md        ← Phase 1 output (this command)
├── contracts/           ← Phase 1 output (this command)
│   └── api-admin-audio.md
└── tasks.md             ← Phase 2 output (/speckit-tasks)
```

### Source Code

```text
connect-four/
├── public/
│   └── audio/
│       ├── sfx/
│       │   ├── disc_fall.mp3
│       │   ├── disc_land_disc.mp3
│       │   ├── disc_land_bottom.mp3
│       │   ├── bg_music.mp3
│       │   ├── win.mp3
│       │   ├── correct_move.mp3
│       │   └── wrong_move.mp3
│       └── coach/
│           ├── coach-audio-manifest.json  ← NEW: list of approved slugs (regenerated on approve)
│           └── <i18n-key-slug>.mp3  (one per approved TTS key)
│
├── server/
│   ├── ttsProvider.js          ← NEW: provider-agnostic TTS interface (OpenAI)
│   ├── tts-registry.json       ← NEW: tracks approved/pending/ineligible keys
│   └── index.js                ← ADD: /api/admin/audio/* endpoints
│
├── scripts/
│   └── generate-tts.js         ← NEW: CLI script to generate/update MP3s
│
├── src/
│   ├── lib/
│   │   ├── annotatedText.js    ← EXTEND: parseAnnotatedText handles [term:...] tags
│   │   ├── useAudio.js         ← NEW: SFX + music playback hook
│   │   └── useCoachSpeech.js   ← NEW: TTS playback for coach messages
│   ├── components/
│   │   ├── AnnotatedText.jsx   ← EXTEND: term spans with popup trigger
│   │   ├── AnnotatedExplanation.jsx ← EXTEND: term popup component, termsMap prop
│   │   └── KbTermPopup.jsx     ← NEW: term definition popup
│   └── pages/
│       └── AdminAudioPage.jsx  ← NEW: /admin/audio localhost-only page
│
└── docs/knowledge-base/
    ├── community-z-threat.md   ← ADD: short_summary field
    ├── community-figure-7.md   ← ADD: short_summary field
    ├── community-overcut.md    ← ADD: short_summary field
    ├── allen-j-configuration.md ← ADD: short_summary field
    ├── allen-t2.md             ← ADD: short_summary field
    ├── allis-claimeven.md      ← ADD: short_summary field
    ├── allis-baseclaim.md      ← ADD: short_summary field
    ├── allis-before.md         ← ADD: short_summary field
    └── allis-specialbefore.md  ← ADD: short_summary field
```

---

## Phase 0: Research

### R1 — Eligible KB terms and short_summary gap

**Decision**: 9 KB entries are eligible for annotation (file-backed `.md` in `docs/knowledge-base/`, excluded `forced_win`):

| kbId | Tag | Lesson? | Practice? |
|---|---|---|---|
| `community-z-threat` | `z_threat` | Yes (z-threat lesson) | Yes (z_threat category) |
| `community-figure-7` | `figure_7` | Yes | Yes (figure_7 category) |
| `community-overcut` | `overcut` | TBD | Yes (overcut category) |
| `allen-j-configuration` | `j_shape` | TBD | Yes (j_shape category) |
| `allen-t2` | `undercut` | TBD | Yes (undercut category) |
| `allis-claimeven` | `claimeven` | Yes (claimeven lesson) | Yes (claimeven category) |
| `allis-baseclaim` | `baseclaim` | No | No |
| `allis-before` | `before` | No | No |
| `allis-specialbefore` | `specialbefore` | No | No |

**Finding**: None of the 9 KB entries currently have a `short_summary` field. All must be added as part of this feature.

**Finding**: `baseclaim`, `before`, `specialbefore` are in `PATTERN_KB` for the recommend-move prompt but are NOT in `VALID_BLUNDER_TAGS` or `classifyPattern` output — they will never appear in deep-reveal positions. Their `short_summary` fields should be added for completeness per FR-023, but they will never surface in term popups. Authoring their summaries is low-risk.

### R2 — TTS scope

**Decision**: 221 static (non-interpolated) coach i18n keys are TTS-eligible. 4 keys contain `{{...}}` placeholders and are ineligible. Keys are scattered across `coach.*`, `sparring.*`, `mistakes.*`, etc. — the generate script scans `en.json` and filters by absence of `{{`.

**Finding**: 221 keys is a large corpus. Pre-generating all 221 MP3s is the right approach (cost: ~$0.30 at $15/1M chars with ~20 chars avg). Approval via admin page is O(221) clicks or a bulk-approve path. The admin page SHOULD expose a "Approve all generated" shortcut.

### R3 — Coach pacing code paths

**Decision**: Two targets, handled differently:
- `connect-four/src/lib/useGameBoard.js:348` — `await delay(400)` before AI move in sparring. This is the existing delay to replace.
- `connect-four/src/screens/ChallengeScreen.jsx` — The `setTimeout(..., 300)` at line 430 is disc-animation settle time, NOT coach message pacing. `ChallengeScreen` pushes coach messages synchronously with no timed gap — there is no existing delay to replace for pacing. FR-015 requires **introducing new code**: after the user-move coach message is pushed to state, wait 1200ms before the AI-move coach message is pushed.

**Resolution**: Define `COACH_PACING_MS = 1200` in a new `connect-four/src/lib/constants.js` file. Import it in both files.
- (a) Replace the `delay(400)` in `useGameBoard.js:348` with `delay(COACH_PACING_MS)`.
- (b) In `ChallengeScreen.jsx`, after pushing the user-move coach message to state, introduce a new `await delay(COACH_PACING_MS)` (or `setTimeout`-based equivalent) before pushing the AI-move coach message. This is **new code**, not a replacement.

### R4 — parseAnnotatedText extension approach

**Decision**: Extend `parseAnnotatedText` to handle `[term:kbId]...[/term:kbId]` tags IN THE SAME PASS as `[zone:...]` tags. Return both `zones` and `terms` arrays from a single function invocation.

**Rationale**: Running two separate regex passes would require two function calls and double the string traversal. A single-pass parser can detect both tag types by checking the prefix of each tag name.

**Tag format**: `[term:community-z-threat]Z-threat[/term:community-z-threat]`

**Return shape extension**:
```js
parseAnnotatedText(text)
→ {
    cleanText: string,
    zones: Array<{index, spec, startChar, endChar, text, defaultActive}>,
    terms: Array<{index, kbId, startChar, endChar, text}>
  }
```
Backward compatibility: callers that destructure only `{ cleanText, zones }` are unaffected.

### R5 — terms map in explanation_cache

**Decision**: No schema migration required. `terms` is embedded inside the existing `explanation_cache.deep_reveal_json` JSONB field, which already accepts arbitrary JSON. There is no separate `terms` column.

**Write path**: After the valid LLM explanation is confirmed, build `termsMap = { [kbId]: short_summary }` for each `[term:kbId]` tag found in the explanation. Write `{ explanation, prompt, terms: termsMap }` to `deep_reveal_json`.

**Read path (cache hit)**: Return `terms: cached.deep_reveal_json.terms ?? {}` alongside `explanation` and `prompt`.

**Cache truncation**: Performed as a one-time manual Supabase SQL command at deploy time (`TRUNCATE explanation_cache;`). This is NOT a migration — it is a deploy-time operational step. Documented in the quickstart.

### R6 — Admin audio page architecture

**Decision**: The admin audio page is a new `AdminAudioPage.jsx` loaded by `App.jsx` for the `/admin/audio` pathname (same pattern as `/admin/curate` and `/admin/lessons`). It calls three localhost-only server endpoints:
- `GET /api/admin/audio/status` — lists all keys with their registry state
- `POST /api/admin/audio/generate` — generates MP3 for one key (or `--all-new`)
- `POST /api/admin/audio/approve` — marks a key approved in the registry

**Decision**: The `tts-registry.json` is a server-side JSON file read/written at runtime by the admin endpoints. It is committed to the repo after generation/approval runs. Schema:
```json
{
  "coach.immediate_threat.optimal.0": {
    "status": "approved",
    "file": "coach--immediate-threat--optimal--0.mp3"
  }
}
```
Status values: `"approved"`, `"awaiting_approval"`, `"needs_audio"`, `"ineligible"`.

### R7 — SFX wiring approach

**Decision**: A new `useAudio.js` hook wraps HTML `<audio>` element playback. It reads `localStorage` for `sfxEnabled`, `musicEnabled`, `speechEnabled` preferences. The hook exposes:
- `playSfx(name)` — plays a named SFX file (e.g., `'disc_land_bottom'`)
- `playMusic()` / `pauseMusic()` — controls `bg_music.mp3` looping
- `sfxEnabled`, `musicEnabled`, `speechEnabled` — current preference states
- `toggleSfx()`, `toggleMusic()`, `toggleSpeech()` — persist toggles

**Decision**: SFX playback is wired at the screen level, not inside Board.jsx. The Board's `lastDrop` prop (which triggers the CSS drop animation) is the trigger: when `lastDrop` changes, the parent screen determines whether the disc landed on a disc or the bottom (using `heights[col]` before the move) and calls `playSfx('disc_land_disc')` or `playSfx('disc_land_bottom')`. The `disc_fall` sound plays as soon as the disc is committed (before animation completes).

**Decision**: Background music uses a module-level singleton `<audio>` element with `loop=true` — not the Web Audio API. This is simpler and sufficient for MVP.

---

## Phase 1: Design & Contracts

### Data Model

See [data-model.md](./data-model.md).

### API Contracts

See [contracts/api-admin-audio.md](./contracts/api-admin-audio.md).

### Cross-cutting conventions added by this feature

**Audio preference pattern** (new — must be added to `frontend-conventions.md`):
- Audio preferences are stored in `localStorage` using three boolean keys: `sfxEnabled` (default `true`), `musicEnabled` (default `true`), `speechEnabled` (default `false`).
- Components read preferences via `useAudio()` hook from `src/lib/useAudio.js`. MUST NOT read `localStorage` directly in components.

**`terms` field on `/api/explain-move-llm` response** (new — must be added to `api-conventions.md`):
```json
{
  "explanation": "...",
  "prompt": "...",
  "cached": true,
  "terms": { "community-z-threat": "A Z-threat is a major threat...", "allen-t2": "Undercut..." }
}
```
`terms` is always present (empty `{}` when no KB terms were referenced or for cached entries from before this feature). Client receives `{}` not `null` on cache misses pre-feature.

**KB `short_summary` field** (new — must be added to `docs/knowledge-base/README.md`):
Each KB `.md` frontmatter may include a `short_summary: |` field — a 1–2 sentence plain-language definition suitable for the term popup. Unlike `statement`, the `short_summary` is returned to the client in the `terms` map. A KB entry without `short_summary` is not eligible for term annotation.

---

## Implementation Phases (Phase 2 Task Dependency Order)

### Track A — Coach Pacing (no dependencies, ship first)

**A1** — Define `COACH_PACING_MS = 1200` constant in `connect-four/src/lib/constants.js`. Two explicit targets:
- (a) In `useGameBoard.js`, import `COACH_PACING_MS` and replace `delay(400)` on line 348 with `delay(COACH_PACING_MS)`.
- (b) In `ChallengeScreen.jsx`, import `COACH_PACING_MS` and introduce a **new** delay (e.g., `await new Promise(r => setTimeout(r, COACH_PACING_MS))`) between pushing the user-move coach message to state and pushing the AI-move coach message. There is no existing timer to replace — this is new code added to enforce FR-015 pacing.

### Track B — Audio Infrastructure (no server dependencies)

**B1** — Create `connect-four/public/audio/sfx/` and `connect-four/public/audio/coach/` directories. Copy the placeholder MP3 (`~/Downloads/zapsplat_leisure_game_connect_4_disc_drop_into_grid_tower_game_play_single_008_52315.mp3`) to each of the 7 SFX asset paths to unblock wiring.

**B2** — Implement `connect-four/src/lib/useAudio.js` — the audio preference + SFX + music hook. Preferences in `localStorage`. SFX via `new Audio(src)`. Background music via module-level singleton `<audio loop>`.

**B3** — Wire SFX to game events:
- In `GameScreen.jsx` (sparring): call `playSfx('disc_fall')` on column click; call `playSfx('disc_land_disc')` or `playSfx('disc_land_bottom')` based on pre-move column height when `lastDrop` changes; `playSfx('win')` on game win.
- In `ChallengeScreen.jsx`: call `playSfx('correct_move')` on correct answer; `playSfx('wrong_move')` on wrong answer.

**B4** — Wire background music: call `playMusic()` when a game session screen mounts; `pauseMusic()` on unmount. Apply to both sparring (`GameScreen.jsx`) and challenge (`ChallengeScreen.jsx`).

**B5** — Add mute controls to the game UI: three small toggle buttons (SFX / Music / Speech) in the screen header area. Defer placement bikeshedding — stub them adjacent to the resign button for now.

### Track C — KB Glossary Pipeline (ordered, multiple dependencies)

**C1** — Add `short_summary` field to all 9 eligible KB entries in `docs/knowledge-base/`. One sentence per concept, suitable for a popup (no jargon, no references to other rules). Order: `community-z-threat`, `community-figure-7`, `community-overcut`, `allen-j-configuration`, `allen-t2`, `allis-claimeven`, `allis-baseclaim`, `allis-before`, `allis-specialbefore`.

**C2** — Author `KbTermLesson` static constant in `connect-four/src/lib/kbTermLesson.js`. Maps `kbId → { lessonId?, practiceCategory? }` for all 9 eligible terms. Covers the "Go to lesson" / "Go to practice" / no-CTA cases.

**C3** — Extend `loadKBStatement` in `llmCoachHelpers.js` to also extract `short_summary` from KB frontmatter. Add `loadKBShortSummary(id)` function.

**C4** — Extend `explainContext.js`: after pattern detection (after steps 3/4), detect which eligible KB terms are present in `correctMovePatterns` and `patPlayed` maps. Build `kbTermsSection` string via `buildKBSection(eligiblePatternNames)` (the helper exists but is not called on this path — wire it here). Pass `kbTermsSection` as a new parameter to `buildBlunderExplainPrompt`.

**C5** — Extend `buildBlunderExplainPrompt` in `llmCoachHelpers.js`:
- Add `kbTermsSection` as a **new** parameter (no existing `## Pattern definitions` section exists in this prompt — `buildKBSection` was never called from this path before).
- When `kbTermsSection` is provided, append a **new** `## KB term definitions` section to the prompt body containing the KB context.
- Add the `[term:kbId]…[/term:kbId]` emission instruction inside the **existing** `## Output format` block (lines 62–74 of `llmCoachHelpers.js`), which already lists zone-tag formats. Append it there rather than in a new block.

**C6** — Extend `POST /api/explain-move-llm` in `server/index.js`: after a valid explanation is confirmed, extract all `[term:kbId]` tags from `explanation`; build `termsMap = { [kbId]: shortSummary }` by calling `loadKBShortSummary` for each distinct kbId; write `terms: termsMap` into `deep_reveal_json` in the cache insert (no schema change — `deep_reveal_json` already accepts arbitrary JSONB); return `terms: termsMap` in the response. On cache hit, return `terms: cached.deep_reveal_json.terms ?? {}`.

**C7** — Extend `parseAnnotatedText` in `connect-four/src/lib/annotatedText.js` to parse `[term:kbId]...[/term:kbId]` tags in a single pass alongside zone tags. Return `{ cleanText, zones, terms }`. Update `regexFallbackParse` to return `terms: []` for backward compatibility.

**C8** — Create `connect-four/src/components/KbTermPopup.jsx`: a `position: fixed` popup anchored to the tapped term span's bounding rect. Receives `{ kbId, summary, lessonId, practiceCategory, completed, onClose }`. Shows term name, 1–2 sentence summary, and CTA button ("Go to lesson" / "Go to practice" / nothing). Tapping outside closes it.

**C9** — Extend `AnnotatedText.jsx`: add `terms` prop (array of term objects). Term spans render with distinct styling (e.g., dashed amber underline vs. dotted blue for zones). On tap, call `onTapTerm(kbId, rect)` callback with the span's bounding rect.

**C10** — Extend `AnnotatedExplanation.jsx`: accept `termsMap` prop (from the API response); parse `terms` from `parseAnnotatedText`; compute lesson completion state via `getLessonProgress()` from store; render `KbTermPopup` when a term is tapped. Wire `terms` prop to `AnnotatedText`.

**C11** — Update `DeepRevealPane` (or wherever `AnnotatedExplanation` is rendered from the explain-move-llm response) to pass `termsMap` from the API response into `AnnotatedExplanation`.

### Track D — Spoken Coach / TTS (depends on B2 for speech preference)

**D1** — Create `connect-four/server/ttsProvider.js`: provider-agnostic interface. `synthesize(text, { voice })` calls OpenAI TTS API and returns `Buffer`. Uses `OPENAI_API_KEY` from env.

**D2** — Create `connect-four/scripts/generate-tts.js`: CLI script that reads `en.json`, filters static non-interpolated coach keys, calls `ttsProvider.synthesize`, writes MP3 to `public/audio/coach/<slug>.mp3`, updates `tts-registry.json`. Flags: `--key <key>` (single key) or `--all-new` (all keys with status `needs_audio`).

**D3** — Create `connect-four/server/tts-registry.json`: initially populated by the generate script. Committed to repo. The generate script also writes/regenerates `connect-four/public/audio/coach/coach-audio-manifest.json` (a plain JSON array of approved slug strings) alongside `tts-registry.json` whenever an approval action runs, so the client manifest stays in sync without a server roundtrip.

**D4** — Add admin audio server endpoints to `server/index.js` (all `requireLocalhost`):
- `GET /api/admin/audio/status` — reads `tts-registry.json` + scans `en.json` for coach keys, returns grouped list
- `POST /api/admin/audio/generate` — generates MP3 for one key via `ttsProvider.synthesize`, updates registry
- `POST /api/admin/audio/approve` — sets key status to `approved` in registry **and** regenerates `public/audio/coach/coach-audio-manifest.json` (the full list of currently approved slugs) so the client manifest is always up to date after an approval

**D5** — Create `connect-four/src/pages/AdminAudioPage.jsx`: localhost admin page. Groups keys by status (approved / awaiting_approval / needs_audio / ineligible). "Generate" and "Approve" buttons per key. Audio playback via `<audio>` element. "Generate all new" bulk action.

**D6** — Wire `AdminAudioPage` in `App.jsx`: add `window.location.pathname.startsWith('/admin/audio')` check before the existing `/admin` check (must come first — more specific path).

**D7** — Implement `connect-four/src/lib/useCoachSpeech.js`: reads `speechEnabled` from audio preferences; at hook mount, fetches `public/audio/coach/coach-audio-manifest.json` once and stores it in a ref (list of approved slug strings). Given an i18n key, derives the slug and checks the manifest — **no blind-fetch 404s**. Plays the MP3 when speech is enabled and the slug appears in the manifest.

**D8** — Wire `useCoachSpeech` to coach message display: in `ChallengeScreen.jsx` and `GameScreen.jsx`, call `speakCoachMessage(key)` when a coach message appears. Interrupt previous speech if a new message arrives.

---

## Complexity Tracking

No constitution violations. All choices defer to simplicity:
- HTML `<audio>` over Web Audio API (sufficient for MVP).
- `localStorage` over server-side audio preference storage (no auth requirement).
- Single-pass parser extension over a separate term-parsing function.
- Static constant `KbTermLesson` over a DB table (immutable at MVP).

---

## Ordering Constraints Summary

```
A1 (pacing constant) — independent
B1 (audio dirs) → B2 (useAudio hook) → B3 (SFX wiring) → B4 (music) → B5 (controls)
B2 (speech preference) → D1–D8 (TTS track)
C1 (short_summary) → C2 (KbTermLesson)
C3 (loadKBShortSummary) → C4 (explainContext KB injection) → C5 (prompt extension) → C6 (server response)
C6 (API terms field) → C7 (parseAnnotatedText) → C8 (KbTermPopup) → C9 (AnnotatedText) → C10 (AnnotatedExplanation) → C11 (DeepRevealPane wiring)
D3 (registry + manifest init) → D4 (approve endpoint regenerates manifest) → D7 (useCoachSpeech loads manifest at mount)
```

Tracks A, B, C, D are independently shippable (no cross-track hard dependencies).

---

## Documentation Tasks (for tasks.md)

- Update `docs/architecture/api-conventions.md` — document `terms` field on `/api/explain-move-llm` response
- Update `docs/architecture/frontend-conventions.md` — document audio preference pattern (`useAudio` hook, localStorage keys) and `coach-audio-manifest.json` pattern (loaded at mount, no blind-fetch 404s)
- Update `docs/knowledge-base/README.md` — document `short_summary` field schema and eligibility rule
- Document in quickstart.md: deploy-time `TRUNCATE explanation_cache;` step and TTS generate+approve workflow
