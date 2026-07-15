// Spec 042 (Mistake Review Unification), US5 / T042.
//
// Shared response-boundary guard (research.md §5, FR-017/FR-018/FR-019). This is the ONE seam
// every player-facing explanation string / terms map crosses on the way out of `server/index.js`
// — cache-hit or freshly generated — so it must be called immediately before every `res.json(...)`
// that emits explanation text or a `terms` map, not inside any upstream producer module
// (`reasonEngine.mjs`, `explainContext.js`, `llmCoachHelpers.js` — a cache hit bypasses those
// entirely, which is the whole point of placing the guard here instead).
//
// Render-only per reason-INVARIANTS I0–I2: operates solely on the final natural-language string
// and the `terms` map keys. Never touches structured cell fields (`threat_cells`/`patternCells`) —
// board highlights are derived exclusively from those structured fields (Decision A), so this
// guard's row-dropping `cXrY` → "column N" prose rewrite is harmless to highlighting.

// Matches a `community-` or `allen-` provenance prefix anywhere it appears (KB-slug-shaped
// tokens are always prefixed this way in `llmCoachHelpers.js`'s `PATTERN_KB`; a bare
// `community-`/`allen-` substring never legitimately appears in player-facing prose otherwise).
import { serverT } from './locale.mjs';

const LABEL_PREFIX_RE = /\b(?:community|allen)-/gi;

// Matches a raw internal grid-coordinate token, e.g. "c1r4" — the classifier's own
// `c${col+1}r${row+1}` cell-string format (1-indexed). Word-bounded so it doesn't match inside
// unrelated alphanumeric strings.
const CXRY_RE = /\bc(\d+)r\d+\b/gi;

/**
 * Strips internal-only tokens out of player-facing prose:
 *   (a) removes a `community-`/`allen-` provenance prefix from any KB-slug-shaped token
 *       (e.g. "community-z-threat" -> "z-threat"),
 *   (b) rewrites a raw `cXrY` grid-coordinate token to plain "column N" (1-based; the row is
 *       deliberately dropped — Decision A, research.md §5/§9: highlights never come from parsing
 *       this string).
 *
 * Clean text (no matches) passes through unchanged.
 *
 * @param {string} text
 * @param {string} [locale='en']
 * @returns {string}
 */
export function stripInternalTokens(text, locale = 'en') {
  if (typeof text !== 'string' || text.length === 0) return text;
  const columnWord = serverT(locale, 'column'); // (n) => "column n" | "columna n"
  return text
    .replace(LABEL_PREFIX_RE, '')
    .replace(CXRY_RE, (_match, col) => columnWord(col));
}

/**
 * Rewrites every key of a `terms` response map through the same `community-`/`allen-` prefix-
 * stripping rule as `stripInternalTokens`, so a raw KB-slug id (e.g. if an LLM emits
 * `[term:community-z-threat]` instead of the instructed `[term:z_threat]`) can never reach
 * `KbTermPopup.jsx`'s `displayName ?? kbId` fallback and render as the popup title.
 *
 * Clean terms maps (no prefixed keys) pass through unchanged (same values, rewritten keys equal
 * to the originals). Value strings are left untouched — only keys are KB-slug shaped.
 *
 * @param {Record<string, unknown> | null | undefined} terms
 * @returns {Record<string, unknown>}
 */
export function sanitizeTermsMap(terms) {
  if (terms == null || typeof terms !== 'object') return terms ?? {};
  const sanitized = {};
  for (const [key, value] of Object.entries(terms)) {
    const cleanKey = key.replace(LABEL_PREFIX_RE, '');
    // If stripping collides two keys, prefer the first one already written (stable, deterministic).
    if (!(cleanKey in sanitized)) sanitized[cleanKey] = value;
  }
  return sanitized;
}

/**
 * Guards the exact response payload shape `POST /api/explain-move` sends via `res.json(...)`
 * (`server/index.js`, T044). One call site in `index.js` composes this response after already
 * unifying its cache-hit and fresh-generation branches into a single `oneLiner`/`deepReveal` pair,
 * so a single guarded builder covers both paths.
 *
 * @param {{oneLiner: string, patternTag: string, deepReveal: {fullText?: string} | null}} payload
 */
export function guardExplainMovePayload({ oneLiner, patternTag, deepReveal }) {
  return {
    oneLiner: stripInternalTokens(oneLiner),
    patternTag,
    deepReveal: deepReveal
      ? { ...deepReveal, fullText: stripInternalTokens(deepReveal.fullText) }
      : deepReveal,
  };
}

/**
 * Guards the exact response payload shape `POST /api/explain-move-llm` sends via `res.json(...)`
 * (`server/index.js`, T044) — reused identically at its cache-hit early return, its
 * not-a-blunder early return, and its fresh-generation response, so all three player-facing
 * branches of that endpoint are provably guarded through one shared function. Any extra fields
 * (e.g. `cached: true`) pass through untouched.
 *
 * @param {{explanation: string, prompt?: string, terms?: Record<string, unknown>, locale?: string}} payload
 */
export function guardExplainMoveLlmPayload({ explanation, prompt, terms, locale = 'en', ...rest }) {
  return {
    ...rest,
    explanation: stripInternalTokens(explanation, locale),
    prompt,
    terms: sanitizeTermsMap(terms),
  };
}
