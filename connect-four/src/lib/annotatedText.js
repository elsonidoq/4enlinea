// Shared library for parsing and rendering coach-mention zone annotations.
// See docs/mvp/deep_reveal_improvements.md — Phase 1: Tap-to-Toggle Interactive Highlights.

const COLS = 7;
const ROWS = 6;

/**
 * 7-color pool for zone highlighting — one color per distinct zone spec.
 * Colors are assigned deterministically via getZoneColor(spec).
 */
export const ZONE_COLORS = [
  '#5B9BD5', // blue
  '#E8543E', // red
  '#2FAA5A', // green
  '#8B5CF6', // purple
];

/**
 * Deterministic color assignment for a zone spec string.
 * Same spec always returns the same color from ZONE_COLORS.
 *
 * @param {string} spec  Zone spec (e.g. "col4", "c3r2", "tg").
 * @returns {string}  Hex color from ZONE_COLORS.
 */
export function getZoneColor(spec) {
  let hash = 0;
  for (let i = 0; i < spec.length; i++) {
    hash = ((hash << 5) - hash) + spec.charCodeAt(i);
    hash |= 0; // Convert to 32-bit integer
  }
  return ZONE_COLORS[Math.abs(hash) % ZONE_COLORS.length];
}

/**
 * Returns true if spec matches a known zone pattern.
 * Unknown specs are treated as plain text to avoid interactive spans that highlight nothing.
 */
function isValidSpec(spec) {
  return /^col\d+$/.test(spec)
    || /^c\d+r\d+$/.test(spec)
    || /^cells:/.test(spec)
    || /^row\d+$/.test(spec)
    || spec === 'tg';
}

/**
 * Parse text with [zone:<spec>]text[/zone:<spec>] and [term:<kbId>]text[/term:<kbId>]
 * annotations.
 *
 * Strips all tags and returns cleaned text plus arrays of zone and term objects
 * with character offsets into the cleaned text. Both tag types are handled in a
 * single pass so their offsets are correct relative to the same cleanText.
 *
 * @param {string} text  Raw text potentially containing zone and/or term tags.
 * @returns {{ cleanText: string, zones: Array<{index: number, spec: string, startChar: number, endChar: number, text: string}>, terms: Array<{index: number, kbId: string, startChar: number, endChar: number, text: string}> }}
 */
export function parseAnnotatedText(text) {
  // Match both [zone:spec]...[/zone:spec] and [term:kbId]...[/term:kbId] tags.
  // Group 1: tag type (zone or term)
  // Group 2: spec/kbId value
  // Group 3: inner text
  const combinedRegex = /\[(zone|term):([^\]!]+)(!?)\](.*?)\[\/\1:\2!?\]/gs;

  // Collect all matches (both zone and term) with their original positions.
  const allMatches = [];
  let match;
  while ((match = combinedRegex.exec(text)) !== null) {
    allMatches.push({
      type: match[1],          // 'zone' or 'term'
      specOrKbId: match[2],
      defaultActive: match[3] === '!',
      innerText: match[4],
      originalStart: match.index,
      fullLength: match[0].length,
    });
  }

  // Sort by position for single-pass cleanText construction.
  allMatches.sort((a, b) => a.originalStart - b.originalStart);

  // Build clean text and compute character offsets in the cleaned output.
  const zones = [];
  const terms = [];
  let cleanText = '';
  let lastEnd = 0;

  for (const m of allMatches) {
    // Plain text before this match.
    cleanText += text.slice(lastEnd, m.originalStart);

    if (m.type === 'term') {
      const { specOrKbId: kbId, innerText: termText } = m;
      const cleanOffset = cleanText.length;
      cleanText += termText;

      terms.push({
        index: terms.length,
        kbId,
        startChar: cleanOffset,
        endChar: cleanOffset + termText.length,
        text: termText,
      });
    } else {
      // zone type
      const { specOrKbId: spec, defaultActive, innerText: zoneText } = m;

      if (!isValidSpec(spec)) {
        // Unknown spec — include inner text as plain (non-interactive) text.
        cleanText += zoneText;
        lastEnd = m.originalStart + m.fullLength;
        continue;
      }

      const cleanOffset = cleanText.length;
      cleanText += zoneText;

      zones.push({
        index: zones.length,
        spec,
        defaultActive,
        startChar: cleanOffset,
        endChar: cleanOffset + zoneText.length,
        text: zoneText,
      });
    }

    lastEnd = m.originalStart + m.fullLength;
  }

  // Remaining text after the last match.
  cleanText += text.slice(lastEnd);

  return { cleanText, zones, terms };
}

/**
 * Convert a zone spec string to 0-indexed {c, r} coordinates.
 *
 * Zone specs (1-indexed input, converted to 0-indexed output):
 *   colN       → all 6 cells in column N-1
 *   cNrM       → single cell at col N-1, row M-1
 *   cells:c1r2,c2r3,...  → array of individual cells
 *   rowN       → all 7 cells in row N-1
 *   tg         → userMajorThreats (passed-in array)
 *
 * @param {string} spec  Zone spec string (e.g. "col4", "c3r2", "tg").
 * @param {Array<{c: number, r: number}>} userMajorThreats  For "tg" resolution.
 * @param {Array<{c: number, r: number}>} opponentMajorThreats  Reserved for future "tg-opp".
 * @returns {Array<{c: number, r: number}>}
 */
export function zoneToOverlays(spec, userMajorThreats = [], opponentMajorThreats = []) {
  // colN → entire column
  const colMatch = spec.match(/^col(\d+)$/);
  if (colMatch) {
    const col = parseInt(colMatch[1], 10) - 1;
    if (col < 0 || col >= COLS) {
      console.warn(`[zoneToOverlays] Invalid column: ${spec}`);
      return [];
    }
    return Array.from({ length: ROWS }, (_, r) => ({ c: col, r }));
  }

  // cNrM → single cell
  const cellMatch = spec.match(/^c(\d+)r(\d+)$/);
  if (cellMatch) {
    const col = parseInt(cellMatch[1], 10) - 1;
    const row = parseInt(cellMatch[2], 10) - 1;
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) {
      console.warn(`[zoneToOverlays] Invalid cell: ${spec}`);
      return [];
    }
    return [{ c: col, r: row }];
  }

  // cells:c1r2,c2r3,... → multiple cells
  const cellsMatch = spec.match(/^cells:(.+)$/);
  if (cellsMatch) {
    const parts = cellsMatch[1].split(',');
    const results = [];
    for (const part of parts) {
      const cm = part.trim().match(/^c(\d+)r(\d+)$/);
      if (!cm) {
        console.warn(`[zoneToOverlays] Invalid cell in multi-cell spec: "${part}"`);
        continue;
      }
      const col = parseInt(cm[1], 10) - 1;
      const row = parseInt(cm[2], 10) - 1;
      if (col < 0 || col >= COLS || row < 0 || row >= ROWS) {
        console.warn(`[zoneToOverlays] Out-of-bounds cell in multi-cell spec: "${part}"`);
        continue;
      }
      results.push({ c: col, r: row });
    }
    return results;
  }

  // rowN → entire row
  const rowMatch = spec.match(/^row(\d+)$/);
  if (rowMatch) {
    const row = parseInt(rowMatch[1], 10) - 1;
    if (row < 0 || row >= ROWS) {
      console.warn(`[zoneToOverlays] Invalid row: ${spec}`);
      return [];
    }
    return Array.from({ length: COLS }, (_, c) => ({ c, r: row }));
  }

  // tg → userMajorThreats
  if (spec === 'tg') {
    return userMajorThreats.map(t => ({ c: t.c, r: t.r }));
  }

  // Unknown spec
  console.warn(`[zoneToOverlays] Unknown zone spec: "${spec}"`);
  return [];
}

/**
 * Best-effort fallback parser for old cache entries that lack [zone:] markup.
 * Matches common spatial reference patterns in unannotated LLM output.
 *
 * Precision/recall: ~70% recall, ~90% precision on typical LLM output.
 * False positives are possible (e.g. "column N" in abstract phrasing).
 * This fallback exists to prevent old cache entries from appearing broken,
 * not to perfectly annotate them.
 *
 * @param {string} text  Raw LLM explanation text (no [zone:] tags).
 * @returns {{ cleanText: string, zones: Array<{index: number, spec: string, startChar: number, endChar: number, text: string}> }}
 */
export function regexFallbackParse(text) {
  const zones = [];
  const seen = new Set(); // dedup key = "startChar,endChar"

  function addZone(spec, startChar, endChar, displayText) {
    const key = `${startChar},${endChar}`;
    if (seen.has(key)) return;
    seen.add(key);
    zones.push({ index: zones.length, spec, startChar, endChar, text: displayText });
  }

  // "column N" (case insensitive) — e.g. "column 4"
  const colFullRegex = /\bcolumn\s+(\d+)\b/gi;
  let m;
  while ((m = colFullRegex.exec(text)) !== null) {
    const n = parseInt(m[1], 10);
    if (n >= 1 && n <= 7) addZone(`col${n}`, m.index, m.index + m[0].length, m[0]);
  }

  // "col N" — e.g. "col 4" (abbreviated form)
  const colShortRegex = /\bcol\s+(\d+)\b/gi;
  while ((m = colShortRegex.exec(text)) !== null) {
    const n = parseInt(m[1], 10);
    if (n >= 1 && n <= 7) addZone(`col${n}`, m.index, m.index + m[0].length, m[0]);
  }

  // "rows N and M" — e.g. "rows 2 and 4"
  const rowsAndRegex = /\brows?\s+(\d+)\s+and\s+(\d+)\b/gi;
  while ((m = rowsAndRegex.exec(text)) !== null) {
    const r1 = parseInt(m[1], 10);
    const r2 = parseInt(m[2], 10);
    if (r1 >= 1 && r1 <= 6 && r2 >= 1 && r2 <= 6) {
      const cells = [];
      for (let c = 0; c < COLS; c++) {
        cells.push(`c${c + 1}r${r1}`, `c${c + 1}r${r2}`);
      }
      addZone(`cells:${cells.join(',')}`, m.index, m.index + m[0].length, m[0]);
    }
  }

  // Standalone "row N" (not already matched as part of "rows N and M")
  const rowRegex = /\brow\s+(\d+)\b/gi;
  while ((m = rowRegex.exec(text)) !== null) {
    const n = parseInt(m[1], 10);
    if (n < 1 || n > 6) continue;
    // Skip if this is part of a "rows N and M" match (check context)
    const after = text.slice(m.index + m[0].length, m.index + m[0].length + 10);
    if (/^\s*and\s+\d+/i.test(after)) continue;
    addZone(`row${n}`, m.index, m.index + m[0].length, m[0]);
  }

  // Bare zone:colN — e.g. "zone:col3" (LLM occasionally outputs this instead of [zone:colN]...[/zone:colN])
  const bareZoneCol = /\bzone:col(\d+)\b/gi;
  while ((m = bareZoneCol.exec(text)) !== null) {
    const n = parseInt(m[1], 10);
    if (n >= 1 && n <= 7) addZone(`col${n}`, m.index, m.index + m[0].length, m[0]);
  }

  // Bare zone:cNrM — e.g. "zone:c6r3"
  const bareZoneCell = /\bzone:c(\d+)r(\d+)\b/gi;
  while ((m = bareZoneCell.exec(text)) !== null) {
    const c = parseInt(m[1], 10);
    const r = parseInt(m[2], 10);
    if (c >= 1 && c <= 7 && r >= 1 && r <= 6) {
      addZone(`c${c}r${r}`, m.index, m.index + m[0].length, m[0]);
    }
  }

  // Bare zone:cells:c1r2,c2r3 — multi-cell list
  const bareZoneCells = /\bzone:cells:((?:c\d+r\d+,?)+)\b/gi;
  while ((m = bareZoneCells.exec(text)) !== null) {
    addZone(`cells:${m[1].replace(/,$/, '')}`, m.index, m.index + m[0].length, m[0]);
  }

  // Bare zone:rowN — e.g. "zone:row3" (run after the rowRegex to avoid duplicate matches)
  const bareZoneRow = /\bzone:row(\d+)\b/gi;
  while ((m = bareZoneRow.exec(text)) !== null) {
    const n = parseInt(m[1], 10);
    if (n >= 1 && n <= 6) addZone(`row${n}`, m.index, m.index + m[0].length, m[0]);
  }

  // Sort by start position and re-index.
  zones.sort((a, b) => a.startChar - b.startChar);
  zones.forEach((z, i) => { z.index = i; });

  return { cleanText: text, zones, terms: [] };
}
