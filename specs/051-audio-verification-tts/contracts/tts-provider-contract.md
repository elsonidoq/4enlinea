# Contract: `connect-four/server/ttsProvider.js` shared synthesis entry point

Covers FR-026, FR-027, FR-028, FR-029. See `research.md` R1/R2/R3 for the reasoning; this file is
the concrete signature contract implementation must match.

## Exported functions (after this epic)

```ts
// Production entry point. The ONLY function the 5 non-preview callers may import.
// Resolves voice/model/speed/instructions internally from `lang`. No caller can
// supply or omit them — there is no options parameter.
export async function synthesize(text: string, lang: 'en' | 'es'): Promise<Buffer>

// Streaming sibling, used by GET /api/user/tts/deep-reveal.
export async function synthesizeStream(text: string, lang: 'en' | 'es'): Promise<Response>

// Low-level primitive. Used ONLY by POST /api/admin/audio/preview (deliberate,
// documented exception — see research.md R1). Accepts arbitrary experimental
// voice/speed/instructions, but is NOT unrestricted: it still refuses a legacy
// model (see "Behavioral contract for synthesizeRaw/synthesizeStreamRaw" below).
export async function synthesizeRaw(text: string, opts?: { voice?: string, model?: string, speed?: number, instructions?: string }): Promise<Buffer>
export async function synthesizeStreamRaw(text: string, opts?: { ... }): Promise<Response>

// Unchanged, still the low-level request builder shared by both Raw functions.
function buildTtsRequest(text: string, opts: {...}): Request  // not exported (already private today)

// Pure config resolver `synthesize`/`synthesizeStream` delegate to. Exported so the FR-029
// regression test can drive it directly and assert the legacy-model refusal WITHOUT
// monkey-patching `readTtsConfig` — a static ESM import cannot be monkey-patched, and this
// repo has never used Node's experimental module mocking (`grep -ran "mock.module" tests/
// server/` → zero hits). No other caller needs this export; it exists purely as a test seam.
export function resolveSynthesisConfig(lang: 'en' | 'es'): { voice: string, model: string, speed: number, instructions: string }
// throws the same "empty instructions" / "model not allow-listed" errors `synthesize` throws today
```

## The guarantee this contract enforces

**"Exactly one path that can *ship* a clip."** Not "exactly one path" — `synthesizeRaw`/
`synthesizeStreamRaw` remain a second, real path that can *synthesize* audio (that is their entire
purpose: the preview sandbox must be able to audition experimental params). They are excluded from the
"single synthesis path" guarantee by **never writing a file, registry entry, or manifest row** — their
output is heard, never shipped — not by being disabled or non-functional. Wherever this guarantee is
stated (this contract, `plan.md`, `docs/architecture/coach-audio-conventions.md`), use the precise
"exactly one path that can ship a clip" wording; the unqualified "exactly one path" is false once
`synthesizeRaw` exists at all.

## Behavioral contract for `synthesize(text, lang)` / `synthesizeStream(text, lang)`

1. **Invalid or missing `lang` throws synchronously** (before any network call): `lang` must be
   exactly `'en'` or `'es'` (the two values in `SUPPORTED_LOCALES` per
   `docs/architecture/api-conventions.md`'s locale middleware section). `synthesize(text)` (no second
   arg) and `synthesize(text, 'fr')` must both throw, not silently default to `'en'` — silent
   defaulting is exactly the class of bug this epic closes (a caller that forgot to pass `lang`
   should fail loudly, not ship an English clip for Spanish text).
2. Resolve `{ prompt, speed, voice, model } = readTtsConfig(lang)` and
   `instructions = buildTtsInstructions(prompt, lang)` internally.
3. **Refuse if `instructions` is empty/falsy** — an empty instructions string is indistinguishable
   from "nothing to steer the voice with," which is the OI-32 failure mode. Throw
   `Error('synthesize: empty instructions resolved for lang=<lang> — refusing to ship an unstyled clip')`.
4. **Refuse if `model` is not in the local allow-list** `ALLOWED_TTS_MODELS = ['gpt-4o-mini-tts']`
   (a `ttsProvider.js`-private constant, intentionally not re-exported — see `research.md` R2 for why
   this is a second, independent layer from `ttsConfig.mjs`'s `VALID_TTS_MODELS`). Throw
   `Error('synthesize: model <model> does not honor voice-style instructions — refused')`.
5. On success, delegate to `synthesizeRaw(text, { voice, model, speed, instructions })` /
   `synthesizeStreamRaw(text, { ... })`.

## Behavioral contract for `synthesizeRaw(text, opts)` / `synthesizeStreamRaw(text, opts)`

This is the **hardened** version of the preview sandbox's low-level primitive (see Decision 1 in the
epic's review record and Key decisions in `plan.md`). It accepts arbitrary `voice`/`speed`/
`instructions` — including empty instructions, since auditioning "no style at all" is a legitimate
preview use case — but is **not** a fully unrestricted bypass:

1. **Refuse if `opts.model` is not in the same `ALLOWED_TTS_MODELS = ['gpt-4o-mini-tts']` allow-list**
   `synthesize` uses. Throw the same
   `Error('synthesize: model <model> does not honor voice-style instructions — refused')` shape.
   Rationale: legacy-model use (`tts-1`/`tts-1-hd`) is the specific defect (OI-32) that caused the
   original drift; there is no product reason for the preview sandbox to audition a model the
   production path can never ship, and leaving it unrestricted would make the preview endpoint itself
   a second bypass of FR-028.
2. Unlike `synthesize`, `synthesizeRaw` does **not** require non-empty `instructions` and does not
   resolve anything from `lang` — that is the entire point of the sandbox (arbitrary experimental
   params, not language-driven config).
3. **Lint**: a grep-based check (`grep -a` — this shell's non-UTF-8 locale makes bare `grep` silently
   report zero matches on multibyte content) asserts that no `.js`/`.mjs` file other than the preview
   endpoint's module imports `synthesizeRaw` or `synthesizeStreamRaw` from `ttsProvider.js`. This is
   the automated form of "the single documented exception" — a future caller that imports the Raw
   functions for convenience is caught, not just a caller that reimplements the HTTP call from scratch
   (that case is assertion 6 below).

## Migration of the 5 production call sites

| File:line (today) | Old call | New call |
|---|---|---|
| `server/index.js:3692` (`POST /api/admin/audio/generate`) | `synthesize(text, { instructions, speed, voice, model })` | `synthesize(text, lang)` — drop the local `readTtsConfig`/`buildTtsInstructions` calls entirely, they move inside `synthesize` |
| `server/index.js:3780` (approx., `POST /api/admin/audio/generate-all`) | same shape | `synthesize(text, lang)` per key in the loop |
| `server/index.js:3953` (`GET /api/user/tts/deep-reveal`) | `synthesizeStream(cleanText, { instructions, speed, voice, model })` | `synthesizeStream(cleanText, locale)` |
| `server/lessonAudio.js:198` (`generateLessonAudio`) | `synthesize(text, { instructions: instructions \|\| undefined, speed, voice, model })` | `synthesize(text, lang)` |
| `scripts/generate-tts.js:364` (`synthesizeAndWrite`) | `synthesize(value)` | `synthesize(value, lang)` (the function already receives `lang` as a parameter — see `research.md` R1) |

`server/index.js:3727` (`POST /api/admin/audio/preview`) is the ONE call site that switches to
`synthesizeRaw(text, { instructions, speed, voice, model })` — same opts shape it uses today, just
importing the renamed function.

## FR-029 regression test (new file, exact home TBD by the implementer — suggest
`connect-four/server/ttsProvider.test.js`, **registered in both the `test` and `test:fast` entries in
`package.json`** — both scripts enumerate test files explicitly, so a file added to neither list runs
in neither suite and this "regression test" is unverifiable)

Required assertions (all pure — no real OpenAI call; stub `global.fetch` or inject a fake
`buildTtsRequest`/HTTP layer per the "Pure Function Extraction" testing convention):

1. `synthesize(text)` (no lang) throws.
2. `synthesize(text, 'fr')` throws.
3. `synthesize(text, 'en')` and `synthesize(text, 'es')` each resolve and the underlying HTTP request
   body's `instructions` field is non-empty and lang-specific (assert the `es` request's
   `instructions` contains content sourced from `tts-prompt.es.json`, not `tts-prompt.en.json` — the
   two files are "ENTIRELY DIFFERENT TEXT" per this epic's grounding, so this is a strong,
   non-tautological assertion). **Landmine**: `buildTtsRequest` throws unless
   `process.env.OPENAI_API_KEY` is set — the test must set a fake key before calling `synthesize`.
   **Landmine**: the outgoing request is a `Request` object whose body is a stream — read
   `instructions` off it via `await request.text()` (then `JSON.parse`), not direct property access.
4. Call the exported **`resolveSynthesisConfig(lang)`** (see the exports list above) with a fake
   `readTtsConfig`/config source resolving to a legacy `model: 'tts-1'` and assert it throws — no
   monkey-patching required, since `resolveSynthesisConfig` is a plain exported pure function the test
   calls directly. (The original draft of this assertion called for monkey-patching the statically
   imported `readTtsConfig`, which has no implementation path in this codebase — no
   `mock.module`/module-mocking precedent exists here, and a static ESM binding cannot be patched from
   outside. `resolveSynthesisConfig` is the seam that makes this assertion possible at all.)
5. Assert `synthesizeRaw`/`synthesizeStreamRaw` remain callable with arbitrary opts for a **valid**
   model (proving the preview sandbox's carve-out still works) — e.g. `synthesizeRaw(text, { voice:
   'nova', model: 'gpt-4o-mini-tts', speed: 2.0, instructions: 'test' })` does not throw — **and**
   assert `synthesizeRaw(text, { model: 'tts-1', ... })` DOES throw (the Decision-1 hardening: the
   sandbox refuses legacy models too, same allow-list as `synthesize`).
6. A lint-style check (acceptable complement per Settled decision 5, not a substitute) — grep every
   `.js`/`.mjs` file outside `ttsProvider.js` for a direct `fetch(...api.openai.com/v1/audio/speech`
   or `new Request(...)` construction, asserting none exists. This catches a future caller that
   bypasses `ttsProvider.js` entirely rather than misusing its exports.
7. **Lint**: grep (`grep -a`) every `.js`/`.mjs` file other than `ttsProvider.js` and the
   `POST /api/admin/audio/preview` handler's module for an import of `synthesizeRaw` or
   `synthesizeStreamRaw`, asserting none exists — this is the "single documented exception" enforced
   mechanically, not just documented in prose.
