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
import { validateAnnotation } from './annotationGate.js';

const LABEL_PREFIX_RE = /\b(?:community|allen)-/gi;

// Matches a raw internal grid-coordinate token, e.g. "c1r4" — the classifier's own
// `c${col+1}r${row+1}` cell-string format (1-indexed). Word-bounded so it doesn't match inside
// unrelated alphanumeric strings. PAIRED form only — must run before RANGE_RE/BARE_COL_RE below
// (each .replace() feeds the next, so a paired "c4r3" is consumed here and never reaches the
// bare-column pass).
const CXRY_RE = /\bc(\d+)r\d+\b/gi;

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

// Matches a BARE internal column token, e.g. "c3" (OI-126, same report). Word-bounded on both
// sides so it never matches inside an unrelated alphanumeric string, and requires the digit to
// sit directly against the "c" — "c. 3" (an abbreviation followed by a number in unrelated
// prose) does NOT match, since there is no `\bc(\d+)\b` adjacency once a period/space intervenes.
//
// DELIBERATELY CASE-SENSITIVE (no `i` flag), unlike CXRY_RE/RANGE_RE above. The internal token
// this strips is always emitted lowercase — it is the classifier's own `c${col+1}` format — so
// matching uppercase buys nothing, while "C4" is a common human abbreviation for Connect Four
// that a served explanation can legitimately contain. With the `i` flag, "This is a C4 position"
// rendered as "This is a column 4 position", corrupting prose FR-008 explicitly protects.
// Verified before/after: "C4 position" now passes through untouched; "c3", "c3-c6" and "c4r3"
// are still stripped. See the case-sensitivity assertions in tests/reasonRenderGuard.test.mjs.
const BARE_COL_RE = /\bc(\d+)\b/g;

// Matches a zone-tag DELIMITER — `[zone:SPEC]` or `[/zone:SPEC]` — capturing it so `String.split`
// preserves it in the output array.
//
// Load-bearing: a zone spec is a MACHINE-READABLE selector, not prose. The specs the reason engine
// emits (`server/scripts/reason_engine/zoneAnnotations.mjs`) include `cNrM` and `windows:c1r1,c2r2,…`
// forms, which CXRY_RE would happily rewrite — turning `[zone:cells:c4r1,c4r2]` into
// `[zone:cells:column 4,column 4]`. `src/lib/annotatedText.js`'s `isValidSpec` then rejects the
// mangled spec and the client silently drops the highlight: no error at any layer, the prose still
// renders, and the board annotation is simply gone. Only the `colN` form survived, which is why a
// test asserting "a valid zone annotation is left untouched" can pass while every cell- and
// window-level highlight is destroyed.
//
// Rewriting must therefore skip these delimiters. The prose BETWEEN them is still rewritten — a raw
// coordinate in a zone's inner text is exactly what FR-008 is for.
const ZONE_TAG_RE = /(\[\/?zone:[^\]]*\])/g;

/**
 * Strips internal-only tokens out of player-facing prose:
 *   (a) removes a `community-`/`allen-` provenance prefix from any KB-slug-shaped token
 *       (e.g. "community-z-threat" -> "z-threat"),
 *   (b) rewrites a raw `cXrY` grid-coordinate token to plain "column N" (1-based; the row is
 *       deliberately dropped — Decision A, research.md §5/§9: highlights never come from parsing
 *       this string),
 *   (c) rewrites a raw ranged `cX-cY` token to a localized "columns X through Y" / "columnas X a Y"
 *       phrase (OI-126),
 *   (d) rewrites any remaining raw bare `cX` token to plain "column N" (OI-126).
 *
 * Order matters: paired -> ranged -> bare, so a wider match is never partially consumed by a
 * narrower one run first (see each regex's comment above).
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
  const columnRangeWord = serverT(locale, 'columnRange'); // (a, b) => "columns a through b" | "columnas a a b"

  const rewrite = (segment) => segment
    .replace(LABEL_PREFIX_RE, '')
    .replace(CXRY_RE, (_match, col) => columnWord(col))
    .replace(RANGE_RE, (_match, a, b) => columnRangeWord(a, b))
    .replace(BARE_COL_RE, (_match, col) => columnWord(col));

  // Split on zone-tag DELIMITERS and rewrite only the prose between them. `String.split` with a
  // capturing regex interleaves the captured delimiters at odd indices, so `i % 2 === 1` is
  // exactly the set of `[zone:…]` / `[/zone:…]` tags — those pass through byte-for-byte.
  return text.split(ZONE_TAG_RE).map((seg, i) => (i % 2 === 1 ? seg : rewrite(seg))).join('');
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
 * `locale` defaults to 'en' for backward compatibility, but the live call site
 * (`server/index.js`, `/api/explain-move`) threads its resolved `req.locale` (spec 057 T026,
 * OI-126 correction (b) — this used to always render English regardless of locale).
 *
 * @param {{oneLiner: string, patternTag: string, deepReveal: {fullText?: string} | null, locale?: string}} payload
 */
export function guardExplainMovePayload({ oneLiner, patternTag, deepReveal, locale = 'en' }) {
  return {
    oneLiner: stripInternalTokens(oneLiner, locale),
    patternTag,
    deepReveal: deepReveal
      ? { ...deepReveal, fullText: stripInternalTokens(deepReveal.fullText, locale) }
      : deepReveal,
  };
}

// Failure codes whose payload embeds the offending zone spec after the second colon (a `spec`
// may itself contain colons — e.g. `cells:c1r1,c2r1` — so this joins everything past the first
// two segments rather than splitting on the last colon). Verified against `annotationGate.js`'s
// actual `failures.push(...)` call sites (P1 :102/:109, P2 :157, P5 :260/:277, P6 :302).
const SPAN_CARRYING_CODES = new Set(['P1', 'P2', 'P5', 'P6']);

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// D3 enforcement (spec 057 T028): for every span-carrying failure, DROP the offending
// `[zone:spec]...[/zone:spec]` wrapper but KEEP its inner text — the annotation (and therefore
// the interactive highlight) disappears, the sentence stays readable. `P3:*` failures carry no
// span (`annotationGate.js:181,186,195,212` push a bare string) — see the P3 policy note on
// `guardExplainMoveLlmPayload` below; nothing is stripped for them here.
function stripFailingZoneSpans(text, failures) {
  const specs = new Set();
  for (const failure of failures) {
    const [code, , ...specParts] = failure.split(':');
    if (!SPAN_CARRYING_CODES.has(code)) continue; // P3:* — no span, nothing to strip
    const spec = specParts.join(':');
    if (spec) specs.add(spec);
  }
  let result = text;
  for (const spec of specs) {
    const escaped = escapeRegExp(spec);
    const re = new RegExp(`\\[zone:${escaped}\\]([\\s\\S]*?)\\[/zone:${escaped}\\]`, 'gi');
    result = result.replace(re, '$1');
  }
  return result;
}

/**
 * Guards the exact response payload shape `POST /api/explain-move-llm` sends via `res.json(...)`
 * (`server/index.js`, T044) — reused identically at its cache-hit early return, its
 * not-a-blunder early return, and its fresh-generation response, so all three player-facing
 * branches of that endpoint are provably guarded through one shared function. Any extra fields
 * (e.g. `cached: true`) pass through untouched.
 *
 * D3 (spec 057 T028, resolved 2026-08-03 by the owner — WIRE IN, ENFORCE BY STRIPPING, no retry
 * — a retry would cost a second LLM call): when `board` is supplied, runs `validateAnnotation`
 * (`annotationGate.js`) against `explanation` and, on failure, drops the offending
 * `[zone:...]` annotation(s) (see `stripFailingZoneSpans`) and logs the failure codes. `board`
 * is optional (defaults to `null`, which skips the gate entirely) so existing/offline callers
 * that don't have a `Board` in scope keep working unguarded, matching the pre-T028 behavior.
 *
 * `allowedSet` is intentionally NOT threaded here — the live call site
 * (`server/index.js`) never builds one (`/usr/bin/grep -n "allowedSet" server/index.js` = zero
 * matches), so `checkP5Strong` never runs on the live path; only P1/P2/P3/P5/P6 apply. This is a
 * real, currently-accepted coverage gap versus the offline eval path (`run_eval.mjs`), not an
 * oversight — see `docs/architecture/server-conventions.md`'s Annotation Gate section.
 *
 * P3 policy (disc notation / player name / engine jargon — `annotationGate.js:181,186,195,212`):
 * these failures carry NO span, so there is nothing to strip. They are LOGGED and the text is
 * SERVED AS-IS; `stripInternalTokens`'s widened regex (T026) is the text-level floor that already
 * catches the raw-coordinate leak shape of P3-adjacent content, and `llmCoachHelpers.js:804`'s
 * prompt instruction is the first line of defense against the wording P3 flags.
 *
 * @param {{explanation: string, prompt?: string, terms?: Record<string, unknown>, locale?: string, board?: object|null}} payload
 */
export function guardExplainMoveLlmPayload({ explanation, prompt, terms, locale = 'en', board = null, ...rest }) {
  let sanitizedExplanation = explanation;
  if (board && typeof explanation === 'string' && explanation.length > 0) {
    const { valid, failures } = validateAnnotation(explanation, board, null);
    if (!valid) {
      sanitizedExplanation = stripFailingZoneSpans(explanation, failures);
      // Intentional console.warn (not console.log) — distinct from, and NOT a reintroduction of,
      // annotationGate.js's deleted unconditional debug logs (T028 correction (a)). Fires only on
      // an actual failure, not on every request.
      console.warn('[annotation gate] stripped failing zone annotation(s) from a served explanation:', failures);
    }
  }
  return {
    ...rest,
    explanation: stripInternalTokens(sanitizedExplanation, locale),
    prompt,
    terms: sanitizeTermsMap(terms),
  };
}
