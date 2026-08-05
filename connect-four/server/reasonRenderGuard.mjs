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
import { expandSpec } from './zoneParser.js';
import { rcToCellStr } from './scripts/reason_engine/zoneAnnotations.mjs';

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
//
// Known, accepted trade-off: including the em-dash means prose that uses it as a clause break
// between two independent column mentions — e.g. "the threat at c4 — c6 stays open" — is also
// rewritten as a range, changing the meaning. This is deliberate: ranges are far more common than
// that construction in this model's output, so the wider match wins on net correctness.
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

// Non-global, capture-bearing twins of CXRY_RE / BARE_COL_RE, for the per-occurrence *conditional*
// rewrite in `humanizeGroundedCoordinates` below. Declared separately (not reused with a
// `lastIndex` reset) because those two carry the `g` flag and are shared across calls.
const CELL_TOKEN_RE = /\bc(\d+)r(\d+)\b/gi;
const COL_TOKEN_RE = /\bcol(\d+)\b/gi;

/**
 * Rewrites a raw internal coordinate that sits inside a `[zone:...]` span **whose own spec vouches
 * for it** into precise, localized human wording — `c1r3` -> "column 1, row 3", `col4` -> "column 4"
 * — leaving every other coordinate byte-identical.
 *
 * WHY THIS EXISTS (RC-H, spec 058 feedback remediation attempt 2). `checkP6` (`annotationGate.js`)
 * flags ANY zone whose inner text matches `cNrM`/`colN`, and P6 is span-carrying, so
 * `stripFailingZoneSpans` then destroys the whole highlight. Measured on three real-pipeline runs of
 * board `315444233213134122`: the model emitted a CORRECT, engine-vouched zone —
 * `keep [zone:c1r3]the c1r3 square that completes your four-in-a-row line[/zone:c1r3] alive` — and
 * the guard served `keep the column 1 square ... alive`: no highlight at all (a regression against
 * the previous attempt, which did emit `c1r3`) and no row.
 *
 * P6's real invariant is **"no raw internal coordinate reaches the user"**, not "a zone whose prose
 * names its own square must be destroyed". Running this rewrite BEFORE `validateAnnotation` turns
 * check-then-strip into rewrite-then-check: P6 sees clean text on the vouched case and passes, and
 * keeps its full force everywhere else.
 *
 * MISMATCH POLICY (deliberate). A coordinate whose enclosing zone does NOT cover it is left RAW, so
 * `checkP6` still fires and the span is still stripped. `[zone:c1r3]the c5r5 square[/zone:c1r3]`
 * gets no free pass — a zone that points at one square while its words name another is not a
 * grounded highlight, and silently humanizing it would launder exactly the kind of mis-anchored
 * annotation the gate exists to catch. (`checkP2` independently catches the mismatched-COLUMN
 * subset of this; the cell-level mismatch is P6's alone.)
 *
 * Scope: only text at zone depth > 0. A coordinate in ordinary prose is untouched here — that is
 * `promoteRawCoordinates`' job (promote it to a real highlight) with `stripInternalTokens` as the
 * final floor. The `future:` decorator is stripped before matching, the same normalization
 * `zoneParser`, `checkP5Strong`, `toAllowedSet` and the client's `annotatedText` all apply (D43).
 *
 * @param {string} text
 * @param {string} [locale='en']
 * @returns {string}
 */
export function humanizeGroundedCoordinates(text, locale = 'en') {
  if (typeof text !== 'string' || text.length === 0) return text;
  const cellWord = serverT(locale, 'cell');       // (c, r) => "column c, row r" | "columna c, fila r"
  const columnWord = serverT(locale, 'column');

  const parts = text.split(ZONE_TAG_RE);
  const open = [];   // stack of currently-open zone specs
  const out = parts.map((seg, i) => {
    if (i % 2 === 1) {
      if (seg.startsWith('[/zone:')) open.pop();
      else open.push(seg.slice('[zone:'.length, -1));
      return seg;
    }
    if (open.length === 0) return seg;            // ordinary prose — not this function's business
    const spec = open[open.length - 1];
    const cells = expandSpec(spec);               // 0-indexed {col,row}; [] for 'tg'/unresolvable
    if (cells.length === 0) return seg;
    const vouchedCells = new Set(cells.map(rcToCellStr));      // 1-indexed 'cNrM' strings
    const vouchedCols = new Set(cells.map(({ col }) => col + 1));
    return seg
      .replace(CELL_TOKEN_RE, (match, c, r) =>
        (vouchedCells.has(`c${c}r${r}`.toLowerCase()) ? cellWord(c, r) : match))
      .replace(COL_TOKEN_RE, (match, c) =>
        (vouchedCols.has(parseInt(c, 10)) ? columnWord(c) : match));
  });
  return out.join('');
}

/**
 * Promotes a bare, un-highlighted `cXrY` board-coordinate token in prose into a real,
 * player-findable `[zone:...]` highlight (spec 058, US3, FR-011; data-model.md §5).
 *
 * This is a NEW, separate export — Plan A's `stripInternalTokens`/`RANGE_RE` in this file are left
 * byte-identical (cross-lane constraint 1). Detection reuses `stripInternalTokens`'s own `CXRY_RE`;
 * delimiter-skipping reuses the same `ZONE_TAG_RE`/`split` pattern.
 *
 * The wrapped inner text is the ALREADY-FLATTENED word (`[zone:c4r3]column 4[/zone:c4r3]`), never
 * the raw token (`[zone:c4r3]c4r3[/zone:c4r3]`) — wrapping the raw token would make
 * `checkP6` (`annotationGate.js`) unconditionally reject the zone regardless of `allowedSet` (its
 * `rawCoordRegex` test runs on inner text with no `allowedSet` gate), self-destructing the
 * promotion before `checkP5Strong` ever runs. This is the single most load-bearing fact in this
 * function — do not "simplify" it to wrap the raw token.
 *
 * Decision B (settled, data-model.md §5): a `cXrY` token already inside an EXISTING zone's own
 * inner text (e.g. `[zone:c4r1]watch c4r1 closely[/zone:c4r1]`) must be left alone, not re-wrapped
 * into a nested/malformed pair. Splitting on `ZONE_TAG_RE` alone is not enough — an open zone's
 * inner text is itself an even-indexed (non-delimiter) segment, so this tracks open/close zone-tag
 * DEPTH across the split segments and skips promotion in any segment where depth > 0 (rejected
 * alternative: net-zero-depth-segments-only — it silently skips promotion in any segment containing
 * both an opened and a closed zone tag).
 *
 * Ordering (called first in `guardExplainMoveLlmPayload`, before `validateAnnotation`) delivers
 * Decision 2's fallback for free: if the promoted spec is later rejected by `checkP5Strong` (not
 * actually offered), `stripFailingZoneSpans` drops the `[zone:...]` wrapper but keeps the already-
 * flattened inner text — identical to what `stripInternalTokens` alone would have produced. No
 * second fallback code path is written for this.
 *
 * @param {string} text
 * @param {string} [locale='en']
 * @returns {string}
 */
export function promoteRawCoordinates(text, locale = 'en') {
  if (typeof text !== 'string' || text.length === 0) return text;
  // FULL cell wording, not the row-dropping `column` (RC-H, attempt 2): the promoted zone points at
  // one exact square, so flattening it to "column N" throws away the very precision the promotion
  // exists to surface — and if `checkP5Strong` later rejects the spec, this flattened inner text is
  // what the player is left with (see the Ordering note below).
  const cellWord = serverT(locale, 'cell');

  const parts = text.split(ZONE_TAG_RE);
  let depth = 0;
  const out = parts.map((seg, i) => {
    if (i % 2 === 1) {
      // Delimiter segment: an opening [zone:...] increases depth, a closing [/zone:...] decreases
      // it. Depth (not segment parity) is what distinguishes an already-open zone's inner text.
      if (seg.startsWith('[/zone:')) depth = Math.max(0, depth - 1);
      else depth += 1;
      return seg;
    }
    if (depth > 0) return seg; // already inside an existing zone's own inner text — leave alone
    return seg.replace(CXRY_RE, (match) => {
      const [, col, row] = match.match(/^c(\d+)r(\d+)$/i);
      return `[zone:${match}]${cellWord(col, row)}[/zone:${match}]`;
    });
  });
  return out.join('');
}

/**
 * Adapter: maps `zones.aliases[]` (the OFFERED handle set, data-model.md §1) into
 * `AllowedSetEntry[]` for `checkP5Strong` (`annotationGate.js`).
 *
 * Each `{col,row}` from `expandSpec` (0-indexed) is mapped through `rcToCellStr` (the SAME
 * `c${col+1}r${row+1}` conversion `zoneAnnotations.mjs` already uses internally) — NOT fed to
 * `checkP5Strong` as raw `{col,row}` objects, which would never match its 1-indexed-string
 * `concreteCells` Set.
 *
 * Admission default — Decision A (owner's explicit call, deep-reveal-grounding
 * tasks-answers.md, against the reviewer's own recommendation of per-cell admission):
 * whole-window-only. A `windows:`/multi-cell `cells:` alias (`expandSpec` yields >1 cell) admits
 * ONLY the full window as a single unit — marked `windowOnly: true` so `checkP5Strong` excludes its
 * cells from the shared `concreteCells`/`concreteRows`/`concreteCols` Sets and instead requires an
 * exact signature match. A single-cell alias (`expandSpec` yields exactly 1 cell) is unaffected —
 * pushed as an ordinary, single-cell-eligible entry. The owner was warned this risks losing real,
 * correct single-cell highlights drawn from inside an offered window (a false REJECTION, not a
 * false admission — `checkP5Strong` rejections now actually strip the span, see
 * `SPAN_CARRYING_CODES` below) and chose it anyway; T040 measures and records the per-board
 * rejection count as the required evidence for a possible future revisit of this decision.
 *
 * Only `computeMechanism`'s fresh-generation response path (`server/index.js`) has a
 * `renderDecision.zones.aliases` in scope to build this from (research.md D11) — the cache-hit and
 * not-a-blunder call sites keep `allowedSet: null` (see the comments at those call sites).
 *
 * A `colN` alias (the always-offered better-col/played-col move-column reference,
 * `zoneAnnotations.mjs`'s "Move-column aliases" block) is deliberately mapped to `checkP5Strong`'s
 * pre-existing `{ col: N }` ABSTRACT-ONLY shape, not the generic multi-cell/windowOnly path below —
 * `expandSpec('col4')` yields all 6 cells in the column, and Decision A's windowOnly bucket is
 * checked ONLY via `offeredWindowSignatures` (exact-signature match), which `checkP5Strong`'s
 * `colN` highlight branch never consults (it checks `abstractCols`/`concreteCells`). Routing a
 * move-column alias through the windowOnly path would silently make the single most common
 * highlight class un-matchable — a real regression, not a stylistic choice.
 *
 * @param {Array<{spec: string}>} aliases
 * @returns {Array<{cells: string[], windowOnly?: true} | {col: number}>}
 */
export function toAllowedSet(aliases) {
  const out = [];
  for (const alias of aliases ?? []) {
    const spec = alias.spec.startsWith('future:') ? alias.spec.slice('future:'.length) : alias.spec;
    const colMatch = spec.match(/^col(\d+)$/);
    if (colMatch) {
      out.push({ col: parseInt(colMatch[1], 10) - 1 }); // ABSTRACT-ONLY, 0-indexed
      continue;
    }
    const cells = expandSpec(alias.spec).map(rcToCellStr);
    if (cells.length === 0) continue; // 'tg' or an unresolvable spec — nothing to admit
    out.push(cells.length === 1 ? { cells } : { cells, windowOnly: true });
  }
  return out;
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
//
// 'P5strong' (spec 058, US3, data-model.md §3 gap 3): `checkP5Strong`'s `col_not_allowed:*` /
// `cell_not_allowed:*` failures DO carry a span the same shape as P1/P2/P5/P6 — without this entry,
// once `allowedSet` is threaded live (T030), a `checkP5Strong` rejection would mark
// `validateAnnotation`'s `valid: false` but `stripFailingZoneSpans` would leave the ungrounded
// `[zone:...]` span completely intact, serving it to the player unchanged. Known, carried-forward,
// narrower gap NOT fixed by this: a codeless `P5strong:tg` failure has no third `:`-segment for the
// span extraction below to find, so its span is still never stripped (docs/open_issues.md).
const SPAN_CARRYING_CODES = new Set(['P1', 'P2', 'P5', 'P6', 'P5strong']);

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
 * `allowedSet` (spec 058, US3, OI-143): as of this feature, threaded ONLY at the fresh-generation
 * call site in `server/index.js` (via `toAllowedSet`, built from `result.renderDecision.zones.
 * aliases` — the only call site with a `renderDecision` in scope, research.md D11). The cache-hit
 * and not-a-blunder call sites keep `allowedSet: null` (no `renderDecision`/`zones` in scope at
 * all — see the comments at those call sites in `server/index.js`), so `checkP5Strong` still never
 * runs on those two paths; only P1/P2/P3/P5/P6 apply there. This narrows, but does not eliminate,
 * the coverage gap OI-143 (docs/open_issues.md) originally described — see
 * `docs/architecture/server-conventions.md`'s Annotation Gate section.
 *
 * P3 policy (disc notation / player name / engine jargon — `annotationGate.js:181,186,195,212`):
 * these failures carry NO span, so there is nothing to strip. They are LOGGED and the text is
 * SERVED AS-IS; `stripInternalTokens`'s widened regex (T026) is the text-level floor that already
 * catches the raw-coordinate leak shape of P3-adjacent content, and `llmCoachHelpers.js:804`'s
 * prompt instruction is the first line of defense against the wording P3 flags.
 *
 * Ordering (contracts/deep-reveal-grounding-contracts.md §2, load-bearing): `promoteRawCoordinates`
 * runs FIRST (only when `board` is supplied — same backward-compatible no-op gate as the rest of
 * this function), then `validateAnnotation` (which runs `checkP5Strong` when `allowedSet` is
 * non-null), then `stripFailingZoneSpans`, then the final `stripInternalTokens` pass below.
 *
 * @param {{explanation: string, prompt?: string, terms?: Record<string, unknown>, locale?: string, board?: object|null, allowedSet?: Array|null}} payload
 */
export function guardExplainMoveLlmPayload({ explanation, prompt, terms, locale = 'en', board = null, allowedSet = null, ...rest }) {
  let sanitizedExplanation = explanation;
  if (board && typeof explanation === 'string' && explanation.length > 0) {
    sanitizedExplanation = promoteRawCoordinates(sanitizedExplanation, locale);
    // RC-H (attempt 2): rewrite-then-check. A coordinate a zone's own spec vouches for becomes
    // precise human wording HERE, so `checkP6` sees clean text and the correct, engine-grounded
    // highlight survives. Everything P6 protects is untouched — an unvouched coordinate is left raw
    // and still fails. Must run AFTER promoteRawCoordinates (whose new spans are already humanized,
    // so this is a no-op over them) and BEFORE validateAnnotation.
    sanitizedExplanation = humanizeGroundedCoordinates(sanitizedExplanation, locale);
    const { valid, failures } = validateAnnotation(sanitizedExplanation, board, allowedSet);
    if (!valid) {
      sanitizedExplanation = stripFailingZoneSpans(sanitizedExplanation, failures);
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
