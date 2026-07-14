# Spanish Audio & Deep-Reveal i18n Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make deep-reveal explanations (text + audio + KB term pop-ups) and pre-recorded coach audio play in the user's selected language (`en` + `es`), instead of always English.

**Architecture:** The client advertises its language via a global `Accept-Language` header; the server resolves `req.locale`. The deep-reveal LLM keeps its entire English prompt scaffold and gets one locale-conditional directive to write the player-facing `mechanism` field in Argentinian Spanish — annotation tags are generated natively, never translated. `explanation_cache` gains a `locale` column so English and Spanish rows coexist. Coach audio is pre-generated per language into `public/audio/coach/<lang>/`, with graceful English fallback.

**Tech Stack:** Node ESM server (Express, Supabase), Vite + React client, react-i18next, OpenAI TTS (`tts-1`, multilingual — no language param), c4solver.

## Global Constraints

- **Coordinates:** 0-indexed everywhere in server/tests/specs; row 0 = bottom, col 0 = leftmost. `better_move`/`key_cells` in the LLM JSON are 1-indexed display (existing contract — do not change).
- **Two players only:** first player = green (P1), second = gray (P2). Spanish user-facing text says **verde/gris**, never red/yellow/green-gray-in-English.
- **Spanish register:** Argentinian Rioplatense voseo (usá/tenés/podés/jugá/sos/vos), never tú-Spanish. Matches `es.json`.
- **Supported locales:** `['en', 'es']`, default `en`.
- **Tests:** run `npm run test:fast` inside `connect-four/` (never `npm test` — candidate-generator hangs).
- **English path must be byte-unchanged:** a request with no `Accept-Language` or `Accept-Language: en` must produce the same prompt, same cache row, same audio as today. Every task carries a regression assertion to this effect.
- **Grounding is untouched:** do NOT modify the reason engine, `explainContext`, annotation parsing/validation, or the tag grammar. Only the player-facing `mechanism` prose language changes.

---

## Scope

**In scope (this plan):**
1. Shared language transport (client header + server middleware).
2. Deep-reveal Spanish text (prompt directive, locale threading).
3. Deep-reveal cache + KB term pop-ups localized.
4. Two English literals that leak into player-facing prose.
5. Coach audio Spanish generation + client selection.

**Descoped (documented follow-ups — do NOT build here):**
- **Lesson narration audio.** Blocked: lesson prose in `/lessons/lesson-*.json` is inline English; no Spanish lesson content exists. Lessons already fall back to English audio, which is acceptable. Building per-locale lesson-audio machinery is premature (YAGNI) until lesson content is translated. Revisit as its own spec after lesson-content translation.
- **Blunder one-liner badge text** (`buildBlunderExplainPrompt`). Generated in the server-side harvest pipeline with no request/`req.locale` context; localizing it needs a locale carried through harvest, a different mechanism. Separate follow-up.

---

## File Structure

**Created:**
- `connect-four/server/locale.mjs` — `SUPPORTED_LOCALES`, `resolveLocale(header)`, `localeMiddleware`, `serverT(locale, key)`.
- `connect-four/src/lib/apiLang.js` — `langHeaders()` returning `{ 'Accept-Language': <current i18n lang> }`.
- `connect-four/server/migrations/059_explanation_cache_locale.sql` — add `locale` column + composite uniqueness.
- Tests alongside each (`*.test.js` / `*.test.mjs`).

**Modified:**
- `server/index.js` — mount middleware; thread `req.locale` into `/api/explain-move-llm` and `/api/user/tts/deep-reveal` (cache key, `computeMechanism`, `loadKBShortSummary`, guard, not-a-blunder string).
- `server/scripts/compute.mjs` — `buildPromptForCondition(glossary, fv, condition, locale)` + `SPANISH_OUTPUT_DIRECTIVE`.
- `server/mechanismExplainer.mjs` — `computeMechanism(..., { locale })`.
- `server/reasonRenderGuard.mjs` — `stripInternalTokens(text, locale)`, `guardExplainMoveLlmPayload({ ..., locale })`.
- `server/llmCoachHelpers.js` — `loadKBShortSummary(id, locale)`.
- `server/kb/<slug>.md` — add `short_summary_es` frontmatter for terms that surface as `[term:…]`.
- `scripts/generate-tts.js` — per-language generation.
- `src/lib/useCoachSpeech.js` — language-aware `speakCoachMessage` + per-language manifest.
- `src/components/DeepRevealPane.jsx` — attach `langHeaders()` to the two deep-reveal fetches.

---

### Task 1: Server locale resolution + middleware

**Files:**
- Create: `connect-four/server/locale.mjs`
- Test: `connect-four/server/locale.test.mjs`

**Interfaces:**
- Produces: `SUPPORTED_LOCALES: string[]`, `resolveLocale(acceptLanguage: string | undefined): 'en'|'es'`, `localeMiddleware(req, res, next)` (sets `req.locale`), `serverT(locale: string, key: string): string`.

- [ ] **Step 1: Write the failing test**

```js
// connect-four/server/locale.test.mjs
import { describe, it, expect } from 'vitest';
import { resolveLocale, serverT, SUPPORTED_LOCALES } from './locale.mjs';

describe('resolveLocale', () => {
  it('defaults to en when header missing', () => {
    expect(resolveLocale(undefined)).toBe('en');
  });
  it('picks es from a simple header', () => {
    expect(resolveLocale('es')).toBe('es');
  });
  it('picks es from a weighted header', () => {
    expect(resolveLocale('es-AR,es;q=0.9,en;q=0.8')).toBe('es');
  });
  it('falls back to en for unsupported', () => {
    expect(resolveLocale('fr-FR,fr;q=0.9')).toBe('en');
  });
  it('exposes the supported set', () => {
    expect(SUPPORTED_LOCALES).toEqual(['en', 'es']);
  });
});

describe('serverT', () => {
  it('returns es string for es locale', () => {
    expect(serverT('es', 'notABlunder')).toMatch(/mejor/i);
  });
  it('returns en string for en locale', () => {
    expect(serverT('en', 'notABlunder')).toMatch(/best track/i);
  });
  it('falls back to en for unknown locale', () => {
    expect(serverT('fr', 'notABlunder')).toMatch(/best track/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd connect-four && npx vitest run server/locale.test.mjs`
Expected: FAIL — cannot find module `./locale.mjs`.

- [ ] **Step 3: Write minimal implementation**

```js
// connect-four/server/locale.mjs
export const SUPPORTED_LOCALES = ['en', 'es'];
const DEFAULT_LOCALE = 'en';

/**
 * Resolve a supported locale from an Accept-Language header.
 * Parses q-weighted language ranges, matches the first supported base language.
 * @param {string|undefined} acceptLanguage
 * @returns {'en'|'es'}
 */
export function resolveLocale(acceptLanguage) {
  if (typeof acceptLanguage !== 'string' || acceptLanguage.trim() === '') return DEFAULT_LOCALE;
  const ranges = acceptLanguage
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const qParam = params.find((p) => p.trim().startsWith('q='));
      const q = qParam ? parseFloat(qParam.split('=')[1]) : 1;
      return { base: tag.trim().toLowerCase().split('-')[0], q: Number.isNaN(q) ? 0 : q };
    })
    .filter((r) => r.base)
    .sort((a, b) => b.q - a.q);
  for (const { base } of ranges) {
    if (SUPPORTED_LOCALES.includes(base)) return base;
  }
  return DEFAULT_LOCALE;
}

/** Express middleware: resolve req.locale from Accept-Language. */
export function localeMiddleware(req, _res, next) {
  req.locale = resolveLocale(req.headers['accept-language']);
  next();
}

// Server-side user-facing strings that are NOT produced by the LLM.
const STRINGS = {
  en: {
    notABlunder: 'This move keeps the game on its best track — there is no better alternative to highlight here.',
    column: (n) => `column ${n}`,
  },
  es: {
    notABlunder: 'Esta jugada mantiene la partida en su mejor camino — no hay una alternativa mejor para destacar acá.',
    column: (n) => `columna ${n}`,
  },
};

/**
 * Look up a server-side user-facing string by locale + key.
 * Falls back to English for unknown locales/keys.
 * @param {string} locale
 * @param {string} key
 * @returns {string|Function}
 */
export function serverT(locale, key) {
  const table = STRINGS[locale] ?? STRINGS.en;
  return table[key] ?? STRINGS.en[key];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd connect-four && npx vitest run server/locale.test.mjs`
Expected: PASS (all 8).

- [ ] **Step 5: Mount the middleware in index.js**

In `connect-four/server/index.js`, add the import near the other server-module imports and mount the middleware immediately after `app.use(express.json(...))` (before any `/api` route):

```js
import { localeMiddleware } from './locale.mjs';
// ...after express.json():
app.use(localeMiddleware);
```

- [ ] **Step 6: Commit**

```bash
git add connect-four/server/locale.mjs connect-four/server/locale.test.mjs connect-four/server/index.js
git commit -m "feat(i18n): server locale resolution + Accept-Language middleware"
```

---

### Task 2: Client Accept-Language header on deep-reveal fetches

**Files:**
- Create: `connect-four/src/lib/apiLang.js`
- Test: `connect-four/src/lib/apiLang.test.js`
- Modify: `connect-four/src/components/DeepRevealPane.jsx:121` (POST) and `:142` (TTS URL fetch)

**Interfaces:**
- Consumes: i18next instance (`src/i18n/index.js`).
- Produces: `langHeaders(): Record<string,string>` → `{ 'Accept-Language': <i18n.language> }`.

- [ ] **Step 1: Write the failing test**

```js
// connect-four/src/lib/apiLang.test.js
import { describe, it, expect, vi } from 'vitest';

vi.mock('../i18n/index.js', () => ({ default: { language: 'es' } }));

import { langHeaders } from './apiLang.js';

describe('langHeaders', () => {
  it('returns the current i18n language as Accept-Language', () => {
    expect(langHeaders()).toEqual({ 'Accept-Language': 'es' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd connect-four && npx vitest run src/lib/apiLang.test.js`
Expected: FAIL — cannot find module `./apiLang.js`.

- [ ] **Step 3: Write minimal implementation**

```js
// connect-four/src/lib/apiLang.js
import i18n from '../i18n/index.js';

/**
 * Header advertising the user's current UI language to the server.
 * Attach to any API fetch whose response depends on locale (deep reveal, TTS).
 * @returns {Record<string,string>}
 */
export function langHeaders() {
  return { 'Accept-Language': i18n.language || 'en' };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd connect-four && npx vitest run src/lib/apiLang.test.js`
Expected: PASS.

- [ ] **Step 5: Wire into DeepRevealPane**

In `src/components/DeepRevealPane.jsx`, add the import at the top:

```js
import { langHeaders } from '../lib/apiLang.js';
```

At the `fetch(\`${API}/api/explain-move-llm\`, {...})` call (~line 121), merge into the existing headers:

```js
    fetch(`${API}/api/explain-move-llm`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...langHeaders() },
      body: JSON.stringify({ movestring: moveString, col }),
    })
```

At the TTS fetch using `ttsUrl` (~line 142), add the header to that fetch call:

```js
          const ttsUrl = `${API}/api/user/tts/deep-reveal?moveString=${encodeURIComponent(moveString)}&col=${col}`;
          // ...where ttsUrl is fetched:
          fetch(ttsUrl, { credentials: 'include', headers: { ...langHeaders() } })
```

(If the TTS URL is assigned to an `<audio>` `src` rather than `fetch`ed, instead leave the GET as-is and rely on Task 5's cache lookup by `req.locale`; the browser sends `Accept-Language` automatically on the audio request. Verify which mechanism DeepRevealPane uses and apply the header only if it's an explicit `fetch`.)

- [ ] **Step 6: Verify build + commit**

Run: `cd connect-four && npx vitest run src/lib/apiLang.test.js && npm run build`
Expected: test PASS, build succeeds.

```bash
git add connect-four/src/lib/apiLang.js connect-four/src/lib/apiLang.test.js connect-four/src/components/DeepRevealPane.jsx
git commit -m "feat(i18n): advertise Accept-Language on deep-reveal fetches"
```

---

### Task 3: Deep-reveal Spanish output directive

**Files:**
- Modify: `connect-four/server/scripts/compute.mjs:235` (`buildPromptForCondition`), add `SPANISH_OUTPUT_DIRECTIVE`
- Modify: `connect-four/server/mechanismExplainer.mjs:78` (`computeMechanism` signature + line 83 prompt build)
- Test: `connect-four/server/scripts/compute.locale.test.mjs`

**Interfaces:**
- Consumes: `buildReasonRenderModel`, `assembleGroundedPrompt`, `TASK` (existing in compute.mjs).
- Produces: `buildPromptForCondition(glossary, fv, condition, locale = 'en')`; `computeMechanism(movestring, col, { solver, model, callLLM, userId, locale })`.

- [ ] **Step 1: Write the failing test**

```js
// connect-four/server/scripts/compute.locale.test.mjs
import { describe, it, expect } from 'vitest';
import { buildPromptForCondition } from './compute.mjs';

// Minimal narrator-vector stub sufficient for condition D assembly.
const fv = {
  case: 'missed_win', bestCol: 3, playedCol: 0,
  movestring: '3333', decision: {}, rendered: {},
};

describe('buildPromptForCondition locale', () => {
  it('en (default) contains no Spanish directive', () => {
    const p = buildPromptForCondition(null, fv, 'D');
    expect(p).not.toMatch(/voseo/i);
  });
  it('es appends the Spanish output directive', () => {
    const p = buildPromptForCondition(null, fv, 'D', 'es');
    expect(p).toMatch(/voseo/i);
    expect(p).toMatch(/verde/);
    expect(p).toMatch(/gris/);
  });
  it('es keeps the English JSON schema keys intact', () => {
    const p = buildPromptForCondition(null, fv, 'D', 'es');
    expect(p).toMatch(/"mechanism":/);
    expect(p).toMatch(/"better_move":/);
  });
});
```

(If the `fv` stub is insufficient for `buildReasonRenderModel`, replace it with a real vector produced via `TOOLS/compute_feature_vector.mjs` per memory `reference_inline_node_scripts.md`, or import a frozen fixture from an existing compute test. Do NOT hand-roll a movestring.)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd connect-four && npx vitest run server/scripts/compute.locale.test.mjs`
Expected: FAIL — `buildPromptForCondition` ignores the 4th arg; `es` test finds no `voseo`.

- [ ] **Step 3: Implement the directive + threading**

In `connect-four/server/scripts/compute.mjs`, add the constant just after the `TASK` definition:

```js
const SPANISH_OUTPUT_DIRECTIVE = `

# Output language
Write the \`mechanism\` field — the ONLY player-facing field — in **Argentinian Spanish
(Rioplatense voseo)**: use "usá / tenés / podés / jugá / sos / vos", never tú-Spanish. Refer to
the two discs as **verde** (first player) and **gris** (second player); never say red, yellow, or
the English words green/gray. Keep every OTHER field exactly as specified above (English JSON keys,
English enum values like "win"/"draw"/"loss", numeric \`better_move\`, \`cNrM\` cells). Do NOT
translate, rename, or reformat the [zone:…] / [term:…] tags or the cell references inside
\`mechanism\` — copy those tokens verbatim; only the surrounding prose is Spanish.`;
```

Change `buildPromptForCondition` to accept and apply `locale`:

```js
export function buildPromptForCondition(glossary, fv, condition, locale = 'en') {
  const localeSuffix = locale === 'es' ? SPANISH_OUTPUT_DIRECTIVE : '';
  if (condition === 'D') {
    return `${assembleGroundedPrompt(buildReasonRenderModel(fv))}

---

${TASK}${localeSuffix}`;
  }
  const projected = projectVector(fv, condition);
  return `${glossary}

---

${TASK}${localeSuffix}

# Feature vector

\`\`\`json
${JSON.stringify(projected, null, 2)}
\`\`\``;
}
```

In `connect-four/server/mechanismExplainer.mjs`, thread `locale` through `computeMechanism`:

```js
export async function computeMechanism(movestring, col, { solver, model, callLLM, userId = null, locale = 'en' } = {}) {
  // ...unchanged up to:
  const prompt = buildPromptForCondition(null, nv, 'D', locale); // condition D ignores the glossary arg
  // ...rest unchanged
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd connect-four && npx vitest run server/scripts/compute.locale.test.mjs`
Expected: PASS (3).

- [ ] **Step 5: Run the reason-engine regression suite**

Run: `cd connect-four && npm run test:fast`
Expected: PASS — no existing test regresses (default locale keeps prompts unchanged).

- [ ] **Step 6: Commit**

```bash
git add connect-four/server/scripts/compute.mjs connect-four/server/scripts/compute.locale.test.mjs connect-four/server/mechanismExplainer.mjs
git commit -m "feat(i18n): deep-reveal Spanish output directive (English prompt, Spanish mechanism)"
```

---

### Task 4: Localize the two leaking English literals

**Files:**
- Modify: `connect-four/server/reasonRenderGuard.mjs` (`stripInternalTokens`, `guardExplainMoveLlmPayload`)
- Test: `connect-four/server/reasonRenderGuard.locale.test.mjs`

**Interfaces:**
- Consumes: `serverT` from `../locale.mjs`.
- Produces: `stripInternalTokens(text, locale = 'en')`; `guardExplainMoveLlmPayload({ explanation, prompt, terms, locale = 'en', ...rest })`.

- [ ] **Step 1: Write the failing test**

```js
// connect-four/server/reasonRenderGuard.locale.test.mjs
import { describe, it, expect } from 'vitest';
import { stripInternalTokens, guardExplainMoveLlmPayload } from './reasonRenderGuard.mjs';

describe('stripInternalTokens locale', () => {
  it('en rewrites cXrY to "column N"', () => {
    expect(stripInternalTokens('play c4r3 now', 'en')).toBe('play column 4 now');
  });
  it('es rewrites cXrY to "columna N"', () => {
    expect(stripInternalTokens('jugá c4r3 ahora', 'es')).toBe('jugá columna 4 ahora');
  });
  it('defaults to en', () => {
    expect(stripInternalTokens('play c4r3 now')).toBe('play column 4 now');
  });
});

describe('guardExplainMoveLlmPayload locale', () => {
  it('threads locale into cXrY rewrite', () => {
    const out = guardExplainMoveLlmPayload({ explanation: 'mirá c2r5', prompt: '', terms: {}, locale: 'es' });
    expect(out.explanation).toBe('mirá columna 2');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd connect-four && npx vitest run server/reasonRenderGuard.locale.test.mjs`
Expected: FAIL — `es` produces "column 2", not "columna 2".

- [ ] **Step 3: Implement locale threading**

In `connect-four/server/reasonRenderGuard.mjs`, add the import:

```js
import { serverT } from './locale.mjs';
```

Change `stripInternalTokens`:

```js
export function stripInternalTokens(text, locale = 'en') {
  if (typeof text !== 'string' || text.length === 0) return text;
  const columnWord = serverT(locale, 'column'); // (n) => "column n" | "columna n"
  return text
    .replace(LABEL_PREFIX_RE, '')
    .replace(CXRY_RE, (_match, col) => columnWord(col));
}
```

Change `guardExplainMoveLlmPayload` to accept and forward `locale` (find every internal call to `stripInternalTokens` within this function and pass `locale`):

```js
export function guardExplainMoveLlmPayload({ explanation, prompt, terms, locale = 'en', ...rest }) {
  // ...replace stripInternalTokens(explanation) with stripInternalTokens(explanation, locale)
  // (leave the terms-key prefix-stripping unchanged — it is language-independent)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd connect-four && npx vitest run server/reasonRenderGuard.locale.test.mjs`
Expected: PASS (4).

- [ ] **Step 5: Guard regression**

Run: `cd connect-four && npm run test:fast`
Expected: PASS — existing `reasonRenderGuard` tests (default locale) unchanged.

- [ ] **Step 6: Commit**

```bash
git add connect-four/server/reasonRenderGuard.mjs connect-four/server/reasonRenderGuard.locale.test.mjs
git commit -m "feat(i18n): localize column-N fallback in reason render guard"
```

---

### Task 5: explanation_cache locale column + endpoint threading

**Files:**
- Create: `connect-four/server/migrations/059_explanation_cache_locale.sql`
- Modify: `connect-four/server/index.js` — `/api/explain-move-llm` (~1148 lookup, ~1246 insert, ~1190 not-a-blunder string, ~1224 terms build, guard calls) and `/api/user/tts/deep-reveal` (~3776 lookup)
- Test: `connect-four/server/explainCacheLocale.test.mjs`

**Interfaces:**
- Consumes: `req.locale` (Task 1), `computeMechanism({ locale })` (Task 3), `guardExplainMoveLlmPayload({ locale })` (Task 4), `loadKBShortSummary(id, locale)` (Task 6), `serverT` (Task 1).
- Produces: cache rows keyed by `(position_hash, locale)`.

- [ ] **Step 1: Write the migration**

```sql
-- connect-four/server/migrations/059_explanation_cache_locale.sql
-- Add locale to explanation_cache so English and Spanish explanations coexist per position.
ALTER TABLE explanation_cache
  ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'en';

-- Replace the single-column position_hash uniqueness with a composite (position_hash, locale).
-- Existing rows already have locale='en' via the default, so this is safe.
ALTER TABLE explanation_cache
  DROP CONSTRAINT IF EXISTS explanation_cache_pkey CASCADE;

ALTER TABLE explanation_cache
  ADD PRIMARY KEY (position_hash, locale);
```

(Verify the current PK constraint name against `db-schema.md` / migration `002_explanation_cache.sql` before running; adjust the `DROP CONSTRAINT` name if it differs. If `position_hash` is a unique index rather than a PK, drop/recreate that index as `(position_hash, locale)` instead.)

- [ ] **Step 2: Write the failing test (locale-scoped read/write contract)**

```js
// connect-four/server/explainCacheLocale.test.mjs
import { describe, it, expect } from 'vitest';

// Pure helper under test: build the cache filter for a position+locale.
import { buildCacheFilter } from './explainCacheKey.mjs';

describe('buildCacheFilter', () => {
  it('includes locale in the equality filter', () => {
    expect(buildCacheFilter('abc123', 'es')).toEqual({ position_hash: 'abc123', locale: 'es' });
  });
  it('defaults locale to en', () => {
    expect(buildCacheFilter('abc123')).toEqual({ position_hash: 'abc123', locale: 'en' });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd connect-four && npx vitest run server/explainCacheLocale.test.mjs`
Expected: FAIL — cannot find `./explainCacheKey.mjs`.

- [ ] **Step 4: Extract the cache-key helper**

```js
// connect-four/server/explainCacheKey.mjs
/**
 * Filter object for an explanation_cache row, scoped by position hash + locale.
 * @param {string} positionHash
 * @param {string} [locale='en']
 * @returns {{position_hash: string, locale: string}}
 */
export function buildCacheFilter(positionHash, locale = 'en') {
  return { position_hash: positionHash, locale };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd connect-four && npx vitest run server/explainCacheLocale.test.mjs`
Expected: PASS (2).

- [ ] **Step 6: Thread locale through `/api/explain-move-llm`**

In `connect-four/server/index.js`, at the top of the handler capture the locale, then apply it everywhere:

```js
  const locale = req.locale ?? 'en';
```

- Import the helper: `import { buildCacheFilter } from './explainCacheKey.mjs';` and `import { serverT } from './locale.mjs';`
- **Cache lookup (~1148):** replace `.eq('position_hash', positionHash)` with `.match(buildCacheFilter(positionHash, locale))`.
- **not-a-blunder branch (~1190):** replace the hardcoded English string with `serverT(locale, 'notABlunder')`.
- **computeMechanism call (~1180):** add `locale` to the options bag: `computeMechanism(movestring, col, { solver, model: process.env.OPENAI_MODEL, userId: req.user?.id ?? null, locale })`.
- **terms build (~1235):** `const shortSummary = loadKBShortSummary(kbId, locale);`
- **cache insert (~1246):** add `locale` to the inserted row: `{ position_hash: positionHash, locale, one_liner: '', deep_reveal_json: { explanation, prompt, terms: termsMap }, template_version: 'v3' }`.
- **All three `guardExplainMoveLlmPayload({...})` calls:** add `locale` to the object argument.

- [ ] **Step 7: Thread locale through `/api/user/tts/deep-reveal`**

In the same file (~3776), capture `const locale = req.locale ?? 'en';` and replace `.eq('position_hash', positionHash)` with `.match(buildCacheFilter(positionHash, locale))`. The rest of the endpoint (text-hash audio path, synth, upload) is unchanged — Spanish `cleanText` hashes to a distinct MP3 automatically, and the row it reads/writes is now the `es` row.

- [ ] **Step 8: Run the fast suite + a manual localhost check**

Run: `cd connect-four && npm run test:fast`
Expected: PASS.

Then verify end-to-end on localhost (server + a real blunder position from the DB or KB — never a hand-rolled movestring): request `/api/explain-move-llm` with `Accept-Language: es` and confirm the `mechanism` is Spanish with intact `[zone:…]`/`[term:…]` tags; repeat with `en` and confirm the English row is untouched (two distinct cache rows for the same `position_hash`).

- [ ] **Step 9: Commit**

```bash
git add connect-four/server/migrations/059_explanation_cache_locale.sql connect-four/server/explainCacheKey.mjs connect-four/server/explainCacheLocale.test.mjs connect-four/server/index.js
git commit -m "feat(i18n): locale-scoped explanation_cache + deep-reveal endpoint threading"
```

---

### Task 6: Localized KB term pop-up summaries

**Files:**
- Modify: `connect-four/server/llmCoachHelpers.js` (`_loadKBShortSummaryRaw`, `loadKBShortSummary`)
- Modify: `connect-four/server/kb/<slug>.md` — add `short_summary_es` for terms that surface as `[term:…]`
- Test: `connect-four/server/loadKBShortSummary.locale.test.js`

**Interfaces:**
- Produces: `loadKBShortSummary(id, locale = 'en'): string | null` — returns `short_summary_es` when `locale==='es'` and present, else falls back to English `short_summary`.

- [ ] **Step 1: Identify the terms that surface**

Run: `cd connect-four && grep -rn "canonicalPhrase\|TERM_KB" server/scripts/reason_engine/zoneAnnotations.mjs server/scripts/reason_engine/causalLinks.mjs`
Enumerate the KB slugs used as `[term:…]` (e.g. `immediate_threat`, `double_threat`, `figure_7`, `claimeven`, `z_threat`). These are the only `.md` files needing `short_summary_es`.

- [ ] **Step 2: Write the failing test**

```js
// connect-four/server/loadKBShortSummary.locale.test.js
import { describe, it, expect } from 'vitest';
import { loadKBShortSummary } from './llmCoachHelpers.js';

describe('loadKBShortSummary locale', () => {
  it('returns Spanish summary for es when present', () => {
    const es = loadKBShortSummary('claimeven', 'es');
    expect(es).toBeTruthy();
    // Spanish summary must not equal the English one (proves the es field was read)
    expect(es).not.toBe(loadKBShortSummary('claimeven', 'en'));
  });
  it('falls back to English when es missing', () => {
    // pick a slug you did NOT translate, or a nonexistent-es entry
    const enFallback = loadKBShortSummary('claimeven', 'en');
    expect(enFallback).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd connect-four && npx vitest run server/loadKBShortSummary.locale.test.js`
Expected: FAIL — `es` returns the English summary (no locale support yet), so the `not.toBe` assertion fails.

- [ ] **Step 4: Add `short_summary_es` frontmatter**

For each surfaced slug, edit `connect-four/server/kb/<slug>.md` frontmatter, adding a block-scalar field beside the existing `short_summary`. Example (`claimeven.md`), Argentinian voseo, verde/gris:

```yaml
short_summary: |
  Claimeven: <existing English text>
short_summary_es: |
  Claimeven (par reclamado): al segundo jugador (gris) le alcanza con responder siempre en la
  casilla de arriba para quedarse con todas las filas pares y neutralizar la amenaza.
```

(Use the KB entry's own definition as the source — read `docs/knowledge-base/<slug>.md` for accurate terminology before translating. Keep the term's canonical name.)

- [ ] **Step 5: Add locale support to the loader**

In `connect-four/server/llmCoachHelpers.js`, generalize the raw reader to accept a field name, then have `loadKBShortSummary` try the localized field first:

```js
function _loadKBFieldRaw(id, field) {
  try {
    const text = readFileSync(join(KB_DIR, `${id}.md`), 'utf8');
    const fmMatch = text.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) return null;
    const fm = fmMatch[1];
    const lines = fm.split('\n');
    let inField = false;
    const out = [];
    const re = new RegExp(`^${field}:\\s*\\|`);
    for (const line of lines) {
      if (!inField) { if (re.test(line)) inField = true; continue; }
      if (line.length > 0 && !/^\s/.test(line)) break;
      out.push(line.replace(/^  /, ''));
    }
    return out.join('\n').trim() || null;
  } catch {
    return null;
  }
}

export function loadKBShortSummary(id, locale = 'en') {
  const field = locale === 'es' ? 'short_summary_es' : 'short_summary';
  // localized first, then English of same id, then alias resolution (English)
  const localized = _loadKBFieldRaw(id, field);
  if (localized !== null) return localized;
  const enRaw = _loadKBFieldRaw(id, 'short_summary');
  if (enRaw !== null) return enRaw;
  const kb = PATTERN_KB[id];
  return kb ? _loadKBFieldRaw(kb.id, 'short_summary') : null;
}
```

(Keep the old `_loadKBShortSummaryRaw` name as a thin wrapper if other callers use it: `const _loadKBShortSummaryRaw = (id) => _loadKBFieldRaw(id, 'short_summary');`.)

- [ ] **Step 6: Run test to verify it passes**

Run: `cd connect-four && npx vitest run server/loadKBShortSummary.locale.test.js && npm run test:fast`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add connect-four/server/llmCoachHelpers.js connect-four/server/loadKBShortSummary.locale.test.js connect-four/server/kb/
git commit -m "feat(i18n): localized KB term pop-up summaries with English fallback"
```

---

### Task 7: Coach audio Spanish generation + client selection

**Files:**
- Modify: `connect-four/scripts/generate-tts.js` — per-language generation into `public/audio/coach/<lang>/`
- Modify: `connect-four/src/lib/useCoachSpeech.js` — language-aware `speakCoachMessage` + per-language manifest fetch
- Test: `connect-four/scripts/generate-tts.locale.test.js`, `connect-four/src/lib/useCoachSpeech.locale.test.js`

**Interfaces:**
- Produces: Spanish clips at `public/audio/coach/es/<slug>.mp3` + `public/audio/coach/es/coach-audio-manifest.json`; English stays at `public/audio/coach/<slug>.mp3` (root) unchanged. `speakCoachMessage(key)` selects language at call time, English fallback when a Spanish clip isn't approved.

**Design note:** to avoid moving existing English files, keep English at the current root path and put only non-default languages in a subdirectory. The speech-queue item becomes `<slug>` for English and `es/<slug>` for Spanish; `playNext`'s existing `new Audio(\`/audio/coach/${item}.mp3\`)` resolves both with no change.

- [ ] **Step 1: Write the failing generator test**

```js
// connect-four/scripts/generate-tts.locale.test.js
import { describe, it, expect } from 'vitest';
import { audioDirForLang, manifestPathForLang } from './generate-tts.js';

describe('generate-tts locale paths', () => {
  it('en writes to the root coach dir (unchanged)', () => {
    expect(audioDirForLang('en')).toMatch(/public\/audio\/coach$/);
  });
  it('es writes to the es subdir', () => {
    expect(audioDirForLang('es')).toMatch(/public\/audio\/coach\/es$/);
  });
  it('manifest path follows the same layout', () => {
    expect(manifestPathForLang('es')).toMatch(/public\/audio\/coach\/es\/coach-audio-manifest\.json$/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd connect-four && npx vitest run scripts/generate-tts.locale.test.js`
Expected: FAIL — `audioDirForLang` not exported.

- [ ] **Step 3: Add per-language path helpers + loop to generate-tts.js**

In `connect-four/scripts/generate-tts.js`, add and export the path resolvers, and generalize the source-JSON + output selection by language:

```js
import { join } from 'node:path';
// AUDIO_DIR is the existing root: <project>/public/audio/coach

/** Directory for a language's coach clips. English stays at the root; others under /<lang>. */
export function audioDirForLang(lang) {
  return lang === 'en' ? AUDIO_DIR : join(AUDIO_DIR, lang);
}
export function manifestPathForLang(lang) {
  return join(audioDirForLang(lang), 'coach-audio-manifest.json');
}
export function sourceJsonForLang(lang) {
  return join(PROJECT_DIR, 'src', 'i18n', `${lang}.json`);
}
```

Update the synthesis routine to accept a `lang` and read `sourceJsonForLang(lang)`, write to `audioDirForLang(lang)`, and maintain `manifestPathForLang(lang)`. Update the CLI so `--all-new` / `--scan-only` accept an optional `--lang <code>` (default `en`), and loop over `SUPPORTED_LOCALES` when `--lang all` is passed. Preserve the existing English behavior exactly when `--lang` is omitted (English path = root, same registry/manifest files as today). Interpolated (`{{…}}`) keys stay ineligible in every language (existing filter unchanged).

- [ ] **Step 4: Run generator test to verify it passes**

Run: `cd connect-four && npx vitest run scripts/generate-tts.locale.test.js`
Expected: PASS (3).

- [ ] **Step 5: Write the failing client-selection test**

```js
// connect-four/src/lib/useCoachSpeech.locale.test.js
import { describe, it, expect } from 'vitest';
import { coachQueueItem } from './useCoachSpeech.js';

describe('coachQueueItem', () => {
  it('en → bare slug (root path)', () => {
    expect(coachQueueItem('immediate_threat--optimal--0', 'en')).toBe('immediate_threat--optimal--0');
  });
  it('es → language-prefixed', () => {
    expect(coachQueueItem('immediate_threat--optimal--0', 'es')).toBe('es/immediate_threat--optimal--0');
  });
});
```

- [ ] **Step 6: Run client test to verify it fails**

Run: `cd connect-four && npx vitest run src/lib/useCoachSpeech.locale.test.js`
Expected: FAIL — `coachQueueItem` not exported.

- [ ] **Step 7: Implement language-aware coach selection**

In `connect-four/src/lib/useCoachSpeech.js`:

Add and export the pure resolver:

```js
/** Speech-queue item for a coach slug in a language. English = bare slug (root path). */
export function coachQueueItem(slug, lang) {
  return lang === 'en' ? slug : `${lang}/${slug}`;
}
```

Make the manifest fetch and `speakCoachMessage` language-aware:
- Fetch the manifest for the current language: `/audio/coach/${lang === 'en' ? '' : lang + '/'}coach-audio-manifest.json` (keep the existing English URL when `lang==='en'`). Store per-language manifests (e.g. `manifestRef.current` keyed by lang, or re-fetch on language change).
- In `speakCoachMessage(key)`, read the current i18n language; compute `slug = keyToSlug(key)`. If the current-language manifest has the slug, push `coachQueueItem(slug, lang)`. **Fallback:** if `lang !== 'en'` and the Spanish manifest lacks the slug but the English manifest has it, push the English `slug` (bare) so the user still hears audio.

Access the current language via the existing i18n import in this module (or `i18n.language`); wire a re-fetch when `changeLanguage` fires (the manifest ref should refresh on language change).

- [ ] **Step 8: Run client test + build**

Run: `cd connect-four && npx vitest run src/lib/useCoachSpeech.locale.test.js && npm run build`
Expected: test PASS, build succeeds.

- [ ] **Step 9: Generate the Spanish clips (content step) + verify on localhost**

Run (requires `OPENAI_API_KEY` in `server/.env`, present per memory):

```bash
cd connect-four && node --env-file=server/.env scripts/generate-tts.js --lang es --all-new
```

Approve the Spanish clips into `public/audio/coach/es/coach-audio-manifest.json` (same approval step as English). Then on localhost, switch the UI to Spanish and confirm a coach line plays Spanish audio; switch to English and confirm English audio still plays; pick a key with no approved Spanish clip and confirm it falls back to English audio.

- [ ] **Step 10: Commit**

```bash
git add connect-four/scripts/generate-tts.js connect-four/scripts/generate-tts.locale.test.js connect-four/src/lib/useCoachSpeech.js connect-four/src/lib/useCoachSpeech.locale.test.js connect-four/public/audio/coach/es
git commit -m "feat(i18n): per-language coach audio generation + client selection with English fallback"
```

---

## Post-implementation: durable docs & memory

After all tasks pass and the feature is verified on localhost, migrate the enduring facts out of `docs/superpowers/` (throwaway per project convention) into `docs/architecture/`:

- **`api-conventions.md`:** the `Accept-Language` → `req.locale` contract; which endpoints are locale-scoped.
- **`db-schema.md` / `data-model.md`:** `explanation_cache` composite key `(position_hash, locale)`.
- **A short deep-reveal-i18n note:** the "English prompt / Spanish output, tags never translated" contract, and the iteration boundary (content/grounding transfers to Spanish automatically; **new** player-facing strings/terms/promoted-fields do NOT and need explicit Spanish coverage; cache invalidation is all-locales; Spanish prose quality has no eval signal).
- **Memory (trap):** the silent-English-fallback trap — a new player-facing string or a newly-promoted LLM output field ships English in Spanish builds unless the directive/translation is extended, and it fails quietly.

---

## Self-Review

**Spec coverage:**
- §1 shared plumbing → Tasks 1, 2. ✓
- §2 deep-reveal text → Tasks 3, 4. ✓
- §3 caching & audio → Task 5. ✓
- §4 KB term pop-ups → Task 6. ✓
- §5 coach audio → Task 7. ✓
- §6 lesson narration → **descoped** (confirmed no Spanish lesson content; documented in Scope + as a gated follow-up). ✓
- Sibling one-liner → **descoped** (no request context; documented). ✓

**Type consistency:** `resolveLocale`/`serverT`/`localeMiddleware` (Task 1) consumed as declared in Tasks 4–5. `langHeaders` (Task 2) used in DeepRevealPane. `buildPromptForCondition(...,locale)` and `computeMechanism({locale})` (Task 3) consumed in Task 5. `stripInternalTokens(text,locale)` / `guardExplainMoveLlmPayload({locale})` (Task 4) consumed in Task 5. `buildCacheFilter` (Task 5) self-contained. `loadKBShortSummary(id,locale)` (Task 6) consumed in Task 5 Step 6. `coachQueueItem`/`audioDirForLang`/`manifestPathForLang` (Task 7) self-contained. Consistent. ✓

**Placeholder scan:** no TBD/TODO; every code step carries concrete code; verification steps carry commands + expected output. The two "verify the exact constraint name / fetch mechanism" notes are deliberate guardrails against stale assumptions, not deferred work. ✓
