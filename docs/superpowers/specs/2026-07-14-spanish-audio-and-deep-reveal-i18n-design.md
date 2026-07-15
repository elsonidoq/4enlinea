# Spanish audio & deep-reveal i18n — design

**Date:** 2026-07-14
**Status:** Design approved; ready for implementation plan
**Scope:** Make all spoken audio and the dynamic deep-reveal explanation available in the user's selected language (currently `en` + `es`). Today the UI shows Spanish text but plays English audio, and deep-reveal explanations are English-only.

---

## Problem

The i18n work (spec 049) translated the UI text (`es.json`, Argentinian voseo) but left three audio/text surfaces English-only:

1. **Coach lines** — pre-generated at build time from `en.json` `coach.*` keys only.
2. **Lesson narration** — synthesized from lesson text; no language dimension carried per message.
3. **Deep reveal** — the explanation prose is generated live by the LLM in English; its audio and KB term pop-ups are therefore English too.

A cross-cutting gap underlies all three: **the client never tells the server which language it wants** (no header, no param), and the caches/paths are not partitioned by language.

### Key enabling fact

OpenAI's TTS models (`tts-1`, `gpt-4o-mini-tts`) are **multilingual with no `language` parameter** — they infer the spoken language from the input text. So every audio surface reduces to the same problem: **get Spanish *text* to the TTS layer.** For coach and lessons that text already exists (`es.json`, translated lesson content). The genuinely new work is deep reveal, whose text is generated at runtime.

---

## Decisions (locked during brainstorming)

| Decision | Choice | Rationale |
|---|---|---|
| Deep-reveal text strategy | **Generate in Spanish (Option B)**, *English prompt → Spanish output* | Native generation produces annotation tags fresh inside Spanish prose, avoiding tag corruption from a translation pass over out-of-distribution tokens. |
| Prompt localization depth | **English scaffold, one locale-conditional output directive** | The grounding/render validation is language-independent (matches only bracket grammar + cell/zone ids, never English words), so only the player-facing `mechanism` field must be Spanish. Avoids re-translating and re-validating the entire prompt. |
| Language transport | **Global `Accept-Language` header** | One mechanism covers deep-reveal POST, TTS GET, coach + lesson audio with zero per-call changes; standard and cache-friendly. |
| Scope | **All three surfaces + shared plumbing in one spec** | Coherent single delivery. |
| `explanation_cache` keying | **Add a `locale` column** (composite key), not a hash salt | Preserves the existing English cache; stores Spanish rows alongside. |
| KB term summaries | **Locale-keyed frontmatter field**, not duplicate `.md` files | One file per concept; English fallback when a translation is missing. |

---

## Design

### 1. Shared plumbing — language transport

- **Client:** set `Accept-Language: <lang>` as a default header on the shared API client, sourced from the i18n state (`useLanguage.js` / i18next). Update it whenever `changeLanguage(next)` runs so it always matches the active UI language.
- **Server:** add small middleware that resolves `req.locale` from `Accept-Language`, whitelisted to `['en','es']`, defaulting to `en`. All downstream consumers read `req.locale`.
- The deep-reveal **TTS GET** (`GET /api/user/tts/deep-reveal?moveString=&col=`) needs no URL change — it inherits the header.

**Consumers that must read `req.locale`:**
- `POST /api/explain-move-llm` (`index.js:1124`)
- `POST /api/explain-move` (one-liner path, `index.js:1036`)
- `GET /api/user/tts/deep-reveal` (`index.js:3751`) — for cache lookup by locale
- coach + lesson audio serving (static file selection is client-side; see §5/§6)

### 2. Deep reveal — text

**Call chain to thread `locale` through** (add a `locale` option at each hop):

1. `POST /api/explain-move-llm` → read `req.locale`.
2. `computeMechanism(movestring, col, { solver, model, callLLM, userId, locale })` — `mechanismExplainer.mjs:78`.
3. `buildPromptForCondition(glossary, fv, condition, locale)` — `compute.mjs:235`.

**The directive.** In the `TASK` notes block (`compute.mjs:198-233`), when `locale === 'es'`, append exactly one instruction (English scaffold, unchanged otherwise):

> Write the `mechanism` field — the only player-facing field — in **Argentinian Spanish (Rioplatense voseo)**: use *usá / tenés / podés / jugá*, never *tú*-Spanish. Refer to the two discs as **verde** (first player) and **gris** (second player), never red/yellow/green-gray in English. All other fields stay as specified. Do not translate or alter the `[zone:…]` / `[term:…]` tags, cell references (`cNrM`), or JSON keys.

The tag grammar, JSON schema, causal context, guardrails, and `READING_KEY` remain English. Tags are generated natively inside Spanish prose.

**Two English literals that leak into player-facing output** (localize via a tiny `t(locale, key)` helper):
- `stripInternalTokens` `column ${col}` fallback (`reasonRenderGuard.mjs:42`) → `columna ${col}` for `es`.
- The hardcoded not-a-blunder English string (`index.js:1190`).

**Sibling — one-liner blunder text.** `buildBlunderExplainPrompt` (`llmCoachHelpers.js:574`) has its own English `LANGUAGE_RULE` (~line 605). Apply the same locale-conditional voseo directive there so the badge one-liner matches the deep reveal. `POST /api/explain-move` threads `req.locale` the same way.

**No changes** to: the reason engine, `explainContext`, annotation parsing/validation (`processAnnotations`, `normalizeAnnotationTags`, `dropUnoffered`, `stripUnclosedTags`), `parseAnswer` — all confirmed language-independent.

### 3. Deep reveal — caching & audio

- **Migration:** add `locale text not null default 'en'` to `explanation_cache`; make the effective key `(position_hash, locale)` (replace/extend the current `position_hash` PK/unique). Existing rows backfill to `'en'`, preserving the English cache.
- **Lookup/insert** (`index.js:1148-1165`, `1246-1252`): include `req.locale` in the where-clause and the inserted row.
- **Audio:** the `coach-tts` bucket path is `tts/deep-reveal/<sha256(cleanText)>.mp3`. Spanish `cleanText` → distinct hash → distinct MP3 automatically. Each `(position_hash, locale)` row carries its own `audio_path` / `audio_generated_at`. **No bucket or storage-layout changes.**
- **TTS endpoint** (`index.js:3751`): look up the cache row by `(position_hash, req.locale)`; miss path synthesizes from that row's Spanish text exactly as today.

### 4. Deep reveal — KB term pop-ups

- Term summaries come from `short_summary` frontmatter in `connect-four/server/kb/<id>.md` via `loadKBShortSummary(kbId)` (`llmCoachHelpers.js:138-144`).
- Add a locale-keyed frontmatter field (e.g. `short_summary_es`) and change the signature to `loadKBShortSummary(kbId, locale)`, falling back to `short_summary` (English) when the localized field is absent.
- `deep_reveal_json.terms` build (`index.js:1224-1236`) passes `req.locale`.
- **Content:** only KB entries that actually surface as `[term:…]` tags need a Spanish summary. Enumerate those slugs and translate their `short_summary_es`; the rest fall back to English gracefully.

### 5. Coach audio (static, pre-generated)

- `scripts/generate-tts.js` loops over `['en','es']`: for each lang read the matching `src/i18n/<lang>.json` `coach.*` keys, synthesize, and write to **`public/audio/coach/<lang>/<slug>.mp3`** with a **per-language manifest + registry**. Interpolated (`{{…}}`) keys remain ineligible in both languages.
- `speakCoachMessage(key)` (`src/lib/useCoachSpeech.js:185`) selects the directory and manifest for the current i18n language; if a Spanish clip is not present/approved, **fall back to the English clip**.
- **Ops note:** the manifest is an approval gate. Spanish clips need their own approval pass — a content step, not code.

### 6. Lesson narration (static)

- `generateLessonAudio` (`lessonAudio.js:52`) already hashes by text (`sha256(text)[:16]`), so Spanish text yields distinct files. Run it per-language and store a **per-locale audio path** on each lesson message (e.g. `audio_es` alongside `audio`, or a locale-keyed map).
- `speakLessonAudio` picks the path for the current language, falling back to English.

**Prerequisite / assumption to confirm:** this assumes Spanish **lesson text** already exists. If lesson prose is drawn from `es.json`, it is covered; if lessons carry standalone JSON prose, that content must be translated first (outside this spec's audio scope). **Confirm before implementing §6.**

---

## Out of scope

- Translating the full deep-reveal prompt scaffold, `READING_KEY`, causal-link templates, or the 742-line eval glossary (conditions A/B/C, eval-only).
- Re-tuning the offline eval harnesses (`judge-deep-reveals`, `grade-fv-sufficiency`) for Spanish. Production grounding is language-independent; Spanish prose *quality* is spot-checked, not gated by the English graders.
- Adding languages beyond `es`. The design generalizes (add a whitelist entry + a directive + KB/coach/lesson content), but no third language is built here.
- Translating lesson *content* (§6 prerequisite).

---

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Model leaks English into the `mechanism` field despite the directive | Directive is explicit and names register + color words; spot-check a sample of Spanish outputs; the field is small and constrained. |
| Annotation tag corruption (the original fear) | Avoided by construction — tags are generated natively, never translated. Existing tag validation still runs unchanged. |
| Spanish and English cache collision | `locale` column makes the key `(position_hash, locale)`. |
| `column N` / not-a-blunder English literals slip through | Explicitly localized via `t(locale, key)`; enumerated in §2. |
| Spanish coach/lesson clip missing at runtime | Graceful fallback to the English clip. |
| KB term summary missing in Spanish | Graceful fallback to English `short_summary`. |

---

## Validation

- **Deep reveal:** with `Accept-Language: es`, a known blunder position returns a `mechanism` in voseo with intact `[zone:…]`/`[term:…]` tags; the grounded-render tripwire passes; the cached row has `locale='es'`; the TTS endpoint serves Spanish-sounding audio. English request for the same position still returns the English row.
- **Coach:** switching UI to Spanish plays Spanish coach clips where approved, English otherwise.
- **Lessons:** Spanish lesson narration plays where Spanish text + audio exist.
- **Regression:** English path (default / `Accept-Language: en`) is byte-unchanged — same cache rows, same audio, same prompt.

---

## Implementation surfaces (index)

- Client: shared API client header, `useLanguage.js`, `useCoachSpeech.js` (`speakCoachMessage`, `speakLessonAudio`), `DeepRevealPane.jsx`.
- Server: `Accept-Language` middleware; `index.js` (`/api/explain-move-llm`, `/api/explain-move`, `/api/user/tts/deep-reveal`, cache lookup/insert, `terms` build, not-a-blunder string); `mechanismExplainer.mjs`; `compute.mjs` (`buildPromptForCondition`, `TASK`); `reasonRenderGuard.mjs` (`stripInternalTokens`); `llmCoachHelpers.js` (`buildBlunderExplainPrompt`, `loadKBShortSummary`); `lessonAudio.js`; `scripts/generate-tts.js`.
- DB: migration adding `locale` to `explanation_cache`.
- Content: KB `short_summary_es` frontmatter for surfaced terms; per-language coach manifests.
