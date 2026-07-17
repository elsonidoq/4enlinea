// Server-side zone spec parser extracted from src/lib/annotatedText.js.
// Client-side annotatedText.js is preserved unchanged — this is a server-only module.
// Uses ES module exports to match the existing server convention (package type: module).

const COLS = 7;
const ROWS = 6;

/**
 * Returns true if spec matches a known zone pattern.
 * Mirrors isValidSpec() from annotatedText.js but lives server-side.
 * @param {string} spec
 * @returns {boolean}
 */
export function isValidSpec(spec) {
  return /^col\d+$/.test(spec)
    || /^c\d+r\d+$/.test(spec)
    || /^cells:/.test(spec)
    || /^windows:/.test(spec)
    || /^row\d+$/.test(spec)
    || spec === 'tg';
}

/**
 * Parse all [zone:<spec>]...[/zone:<spec>] tags from explanation text.
 * Returns only spec + inner-text pairs — no character offsets.
 * Unknown spec formats are still captured; expandSpec handles validation.
 *
 * @param {string} explanationText
 * @returns {Array<{ spec: string, innerText: string }>}
 */
export function parseZoneSpecs(explanationText) {
  const results = [];
  // Matches [zone:SPEC]inner text[/zone:SPEC] where SPEC in closing tag must match opening tag.
  // The `s` flag allows inner text to span newlines.
  const tagRegex = /\[zone:([^\]!]+)!?\](.*?)\[\/zone:\1!?\]/gs;
  let match;
  while ((match = tagRegex.exec(explanationText)) !== null) {
    results.push({
      spec: match[1],
      innerText: match[2],
    });
  }
  return results;
}

/**
 * Expand a zone spec string to 0-indexed {col, row} coordinates.
 * All spec formats use 1-indexed input; output is 0-indexed.
 *
 * Supported formats:
 *   colN       → all 6 cells in column N-1
 *   cNrM       → single cell at col N-1, row M-1
 *   cells:c1r1,c2r2,...  → list of individual cells (1-indexed, no spaces)
 *   rowN       → all 7 cells in row N-1
 *   tg         → [] (client-only rendering spec; vacuous for P5)
 *
 * Out-of-bounds or unknown format → []
 *
 * @param {string} spec
 * @returns {Array<{ col: number, row: number }>}
 */
export function expandSpec(spec) {
  // tg — client-only spec, returns empty for server-side checks
  if (spec === 'tg') {
    return [];
  }

  // colN → entire column
  const colMatch = spec.match(/^col(\d+)$/);
  if (colMatch) {
    const col = parseInt(colMatch[1], 10) - 1;
    if (col < 0 || col >= COLS) return [];
    return Array.from({ length: ROWS }, (_, row) => ({ col, row }));
  }

  // cNrM → single cell
  const cellMatch = spec.match(/^c(\d+)r(\d+)$/);
  if (cellMatch) {
    const col = parseInt(cellMatch[1], 10) - 1;
    const row = parseInt(cellMatch[2], 10) - 1;
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return [];
    return [{ col, row }];
  }

  // cells:c1r1,c2r2,... → multiple cells
  const cellsMatch = spec.match(/^cells:(.+)$/);
  if (cellsMatch) {
    const parts = cellsMatch[1].split(',');
    const results = [];
    for (const part of parts) {
      const cm = part.trim().match(/^c(\d+)r(\d+)$/);
      if (!cm) return []; // invalid part → whole spec invalid
      const col = parseInt(cm[1], 10) - 1;
      const row = parseInt(cm[2], 10) - 1;
      if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return [];
      results.push({ col, row });
    }
    return results;
  }

  // rowN → entire row
  const rowMatch = spec.match(/^row(\d+)$/);
  if (rowMatch) {
    const row = parseInt(rowMatch[1], 10) - 1;
    if (row < 0 || row >= ROWS) return [];
    return Array.from({ length: COLS }, (_, col) => ({ col, row }));
  }

  // windows:c2r4,c3r4,c4r4,c5r4|c3r5,... → all cells (flat, deduplicated)
  const windowsMatch = spec.match(/^windows:(.*)$/);
  if (windowsMatch) {
    const seen = new Set();
    const results = [];
    for (const windowStr of windowsMatch[1].split('|')) {
      for (const part of windowStr.split(',')) {
        const cm = part.trim().match(/^c(\d+)r(\d+)$/);
        if (!cm) continue;
        const col = parseInt(cm[1], 10) - 1;
        const row = parseInt(cm[2], 10) - 1;
        if (col < 0 || col >= COLS || row < 0 || row >= ROWS) continue;
        const key = `${col},${row}`;
        if (!seen.has(key)) { seen.add(key); results.push({ col, row }); }
      }
    }
    return results;
  }

  // Unknown spec
  return [];
}
