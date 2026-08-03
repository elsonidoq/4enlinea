// Annotation gate — pure validation of Deep Reveal LLM output.
// No side effects, no DB, no I/O.
// Validates [zone:...] annotations in LLM explanation strings against the actual board.
//
// Board cell access: board.board[row][col] where row 0 = bottom, values 0/1/2.
// This matches the Board class in classifier.js (this.board = parseBoardState result).
//
// Uses ES module exports to match the existing server convention (package type: module).

import { parseZoneSpecs, expandSpec, isValidSpec } from './zoneParser.js';

const COLS = 7;
const ROWS = 6;

// ---------------------------------------------------------------------------
// Exported helper: 4-window enumeration
// ---------------------------------------------------------------------------

/**
 * For a given cell (col, row), enumerate all 4-cell windows in any of the 4
 * directions (horizontal, vertical, diagonal-up, diagonal-down) that contain
 * this cell. Only windows fully within bounds are returned.
 *
 * @param {number} col  0-indexed
 * @param {number} row  0-indexed
 * @returns {Array<Array<{col: number, row: number}>>}
 */
export function getWindowsThroughCell(col, row) {
  const directions = [
    { dc: 1, dr: 0 },  // horizontal
    { dc: 0, dr: 1 },  // vertical
    { dc: 1, dr: 1 },  // diagonal-up (↗)
    { dc: 1, dr: -1 }, // diagonal-down (↘)
  ];

  const windows = [];

  for (const { dc, dr } of directions) {
    // The cell can be at offset 0, 1, 2, or 3 within the window.
    for (let offset = 0; offset <= 3; offset++) {
      // Start of the window: go back `offset` steps along the direction.
      const startCol = col - dc * offset;
      const startRow = row - dr * offset;

      // Build the 4-cell window from this start.
      const window = [];
      let valid = true;
      for (let i = 0; i < 4; i++) {
        const c = startCol + dc * i;
        const r = startRow + dr * i;
        if (c < 0 || c >= COLS || r < 0 || r >= ROWS) {
          valid = false;
          break;
        }
        window.push({ col: c, row: r });
      }

      if (valid) windows.push(window);
    }
  }

  return windows;
}

/**
 * Returns true if the 4-cell window is BLOCKED (contains both player 1 and player 2 discs).
 * A window is LIVE if it contains at most one player's discs.
 *
 * @param {Board} board  Board instance (board.board[row][col])
 * @param {Array<{col: number, row: number}>} window
 * @returns {boolean}
 */
export function isWindowBlocked(board, window) {
  let hasP1 = false;
  let hasP2 = false;
  for (const { col, row } of window) {
    const val = board.board[row][col];
    if (val === 1) hasP1 = true;
    else if (val === 2) hasP2 = true;
  }
  return hasP1 && hasP2;
}

// ---------------------------------------------------------------------------
// P1 — spec syntax and bounds check
// ---------------------------------------------------------------------------

/**
 * Check P1: every zone spec must be syntactically valid and resolve to ≥1 in-bounds cell.
 * `tg` is special-cased as syntactically valid even though expandSpec returns [].
 *
 * @param {Array<{ spec: string, innerText: string }>} zoneSpecs
 * @returns {string[]}  failure codes
 */
export function checkP1(zoneSpecs) {
  const failures = [];
  for (const { spec } of zoneSpecs) {
    // tg is recognized as valid syntax — passes P1 unconditionally
    if (spec === 'tg') continue;

    if (!isValidSpec(spec)) {
      failures.push(`P1:invalid_spec:${spec}`);
      continue;
    }

    // Valid syntax but resolves to zero cells (out-of-bounds)
    const cells = expandSpec(spec);
    if (cells.length === 0) {
      failures.push(`P1:empty:${spec}`);
    }
  }
  return failures;
}

// ---------------------------------------------------------------------------
// P2 — column reference consistency
// ---------------------------------------------------------------------------

/**
 * Check P2: for every zone that resolves to real board cells, scan its inner text
 * for col/column references. If the text names a column the zone does not actually
 * occupy, fail — the annotation would highlight one column while the prose points
 * the reader at another.
 *
 * Generalised from colN-only to any cell-bearing spec (`colN`, `cNrM`, `cells:...`)
 * by comparing against the set of columns the spec expands to. For a `colN` zone
 * that set is exactly `{N}`, so the original behaviour is preserved as a special
 * case rather than kept as a separate branch. A multi-column zone (e.g. a
 * horizontal threat spanning `cells:c3r1,c4r1,c5r1,c6r1`) legitimately satisfies a
 * reference to ANY of the columns it covers.
 *
 * Zones that expand to no cells are skipped: `tg` is a client-only spec that
 * resolves to `[]` server-side, and a malformed spec also yields `[]` — P1 owns
 * reporting those, so failing them here too would double-report one defect.
 *
 * @param {Array<{ spec: string, innerText: string }>} zones
 * @returns {string[]}  failure codes
 */
export function checkP2(zones) {
  const failures = [];

  for (const { spec, innerText } of zones) {
    const cells = expandSpec(spec);
    if (cells.length === 0) continue; // 'tg' (client-only) or invalid spec — P1's job

    // 1-indexed, to compare against how columns are written in prose.
    const specCols = new Set(cells.map(({ col }) => col + 1));

    // Scan inner text for explicit column references. Declared inside the loop:
    // a /g/ regex carries lastIndex across calls, so hoisting it would make each
    // zone resume mid-string from wherever the previous zone stopped.
    const refRegex = /col(?:umn)?\s*([1-7])/gi;
    let refMatch;
    while ((refMatch = refRegex.exec(innerText)) !== null) {
      const refColNum = parseInt(refMatch[1], 10);
      if (!specCols.has(refColNum)) {
        failures.push(`P2:col_mismatch:${spec}`);
        break; // one failure per zone is enough
      }
    }
  }
  return failures;
}

// ---------------------------------------------------------------------------
// P3 — forbidden terminology in full explanation text
// ---------------------------------------------------------------------------

/**
 * Check P3: scan full explanation for forbidden disc notation, player names,
 * and engine jargon. Each sub-check is independent; results are deduplicated.
 *
 * @param {string} fullText
 * @returns {string[]}  failure codes
 */
export function checkP3(fullText) {
  const failures = [];

  // Sub-check 1: disc notation — standalone R or Y
  if (/\b[RY]\b/g.test(fullText)) {
    failures.push('P3:disc_notation');
  }

  // Sub-check 2: player names — Red, Yellow, Black (case-insensitive)
  if (/\b(Red|Yellow|Black)\b/gi.test(fullText)) {
    failures.push('P3:player_name');
  }

  // Sub-check 3: engine jargon — phrase list (case-insensitive).
  // 'forced win' is intentionally absent: the language rule allows plain-English
  // "forced win"; only the internal slug 'forced_win' is banned.
  // [zone:tg] is checked on the raw text before stripping — it is an internal
  // placeholder that must never appear in LLM output.
  if (/\[zone:tg\]/i.test(fullText)) {
    failures.push('P3:engine_jargon');
  }
  // Strip [zone:...] and [term:...] markup tags before scanning so that tag specs
  // like [term:forced_win] don't trigger the check when the visible text is fine.
  const jargonPhrases = [
    'leaf position',
    'the solver',
    'forced_win',
    'the simulation',
    'your score',
    'the score is',
    'patterns in data',
  ];
  const visibleText = fullText.replace(/\[\/?(zone|term):[^\]]*\]/gi, '');
  const lowerText = visibleText.toLowerCase();
  for (const phrase of jargonPhrases) {
    if (lowerText.includes(phrase.toLowerCase())) {
      failures.push('P3:engine_jargon');
      break; // deduplicated — one code regardless of how many phrases match
    }
  }

  return failures;
}

// ---------------------------------------------------------------------------
// P5 — board occupancy check (blocked windows)
// ---------------------------------------------------------------------------

/**
 * Check P5: each zone must have at least one LIVE 4-window through its cells.
 * If every 4-window through every cell in the zone is blocked, the zone fails.
 * `tg` zones are vacuously valid (skip).
 * Out-of-bounds / unresolvable specs fail with a dedicated code.
 *
 * Columns that are explicitly whitelisted in `allowedSet` (played column,
 * contrast column) are exempt — they are already validated by P5Strong and may
 * legitimately be full (no live windows) while still being valid references.
 *
 * @param {Board} board
 * @param {Array<{ spec: string, innerText: string }>} zoneSpecs
 * @param {Array|null} [allowedSet=null]
 * @returns {string[]}  failure codes
 */
export function checkP5(board, zoneSpecs, allowedSet = null) {
  // Build set of 1-indexed column numbers exempt from blocked-window check.
  const exemptCols = new Set();
  if (allowedSet) {
    for (const entry of allowedSet) {
      if (entry.col !== undefined) exemptCols.add(entry.col + 1);
    }
  }

  const failures = [];

  for (const { spec } of zoneSpecs) {
    // tg is vacuously valid
    if (spec === 'tg') continue;

    // Whitelisted columns skip P5 — P5Strong covers them.
    const colMatch = spec.match(/^col(\d+)$/);
    if (colMatch && exemptCols.has(parseInt(colMatch[1], 10))) continue;

    const cells = expandSpec(spec);
    if (cells.length === 0) {
      failures.push(`P5:out_of_bounds:${spec}`);
      continue;
    }

    // Gather all windows through all cells in the zone
    let hasLiveWindow = false;
    outer: for (const { col, row } of cells) {
      const windows = getWindowsThroughCell(col, row);
      for (const window of windows) {
        if (!isWindowBlocked(board, window)) {
          hasLiveWindow = true;
          break outer;
        }
      }
    }

    if (!hasLiveWindow) {
      failures.push(`P5:blocked:${spec}`);
    }
  }

  return failures;
}

// ---------------------------------------------------------------------------
// P6 — no raw coordinates in zone inner text
// ---------------------------------------------------------------------------

/**
 * Check P6: zone inner text must not contain raw coordinate references like
 * "c4r3" or "col5".
 *
 * @param {Array<{ spec: string, innerText: string }>} zones
 * @returns {string[]}  failure codes
 */
export function checkP6(zones) {
  const failures = [];

  for (const { spec, innerText } of zones) {
    const rawCoordRegex = /\bc\d+r\d+\b/gi;
    const rawColRegex = /\bcol\d+\b/gi;
    if (rawCoordRegex.test(innerText) || rawColRegex.test(innerText)) {
      failures.push(`P6:raw_coordinate:${spec}`);
    }
  }
  return failures;
}

// ---------------------------------------------------------------------------
// P5 Strong — zone-per-allowedSet check (Epic B)
// ---------------------------------------------------------------------------

/**
 * Check P5 Strong: every zone spec must be within the allowed set.
 * `tg` always fails (no trusted evidence for "all current threats").
 * colN must match an allowed column (ABSTRACT-ONLY col or CONCRETE-ELIGIBLE cell in that col).
 * cell-level specs (cNrM, cells:...) must appear in a CONCRETE-ELIGIBLE entry's cells.
 * rowN passes if any CONCRETE-ELIGIBLE entry has a cell in that row.
 *
 * @param {Array<{ spec: string, innerText: string }>} zones
 * @param {Array<{cells?: string[], col?: number, zoneSpec: string}>} allowedSet
 * @returns {string[]}  failure codes
 */
export function checkP5Strong(zones, allowedSet) {
  const failures = [];

  // Pre-process allowedSet for efficient lookup
  const concreteCells = new Set();
  const concreteRows = new Set();
  const concreteCols = new Set();
  const abstractCols = new Set();

  for (const entry of allowedSet) {
    if (entry.cells) {
      // CONCRETE-ELIGIBLE
      for (const cell of entry.cells) {
        concreteCells.add(cell);
        const m = cell.match(/c(\d+)r(\d+)/);
        if (m) {
          concreteCols.add(parseInt(m[1], 10) - 1);
          concreteRows.add(parseInt(m[2], 10) - 1);
        }
      }
    } else {
      // ABSTRACT-ONLY
      abstractCols.add(entry.col);
    }
  }

  for (const { spec } of zones) {
    // tg always fails
    if (spec === 'tg') {
      failures.push('P5strong:tg');
      continue;
    }

    // colN (1-indexed) → 0-indexed col
    const colMatch = spec.match(/^col(\d+)$/);
    if (colMatch) {
      const c = parseInt(colMatch[1], 10) - 1;
      const allowedInAbstract = abstractCols.has(c);
      const allowedInConcrete = [...concreteCells].some(cell => {
        const m = cell.match(/c(\d+)r(\d+)/);
        return m && parseInt(m[1], 10) - 1 === c;
      });
      if (!allowedInAbstract && !allowedInConcrete) {
        failures.push(`P5strong:col_not_allowed:${spec}`);
      }
      continue;
    }

    // cNrM (1-indexed)
    const cellMatch = spec.match(/^c(\d+)r(\d+)$/);
    if (cellMatch) {
      if (!concreteCells.has(spec)) {
        failures.push(`P5strong:cell_not_allowed:${spec}`);
      }
      continue;
    }

    // cells:... (comma-separated 1-indexed)
    const cellsMatch = spec.match(/^cells:(.+)$/);
    if (cellsMatch) {
      const parts = cellsMatch[1].split(',');
      const allAllowed = parts.every(p => concreteCells.has(p.trim()));
      if (!allAllowed) {
        failures.push(`P5strong:cell_not_allowed:${spec}`);
      }
      continue;
    }

    // rowN (1-indexed)
    const rowMatch = spec.match(/^row(\d+)$/);
    if (rowMatch) {
      const r = parseInt(rowMatch[1], 10) - 1;
      if (!concreteRows.has(r)) {
        failures.push(`P5strong:cell_not_allowed:${spec}`);
      }
      continue;
    }
  }

  return failures;
}

// ---------------------------------------------------------------------------
// Zone tag normalization
// ---------------------------------------------------------------------------

/**
 * Normalize zone tags in raw LLM output before annotation validation.
 * - [zone:column N] / [zone:col N] → [zone:colN]
 * - Pairs each [zone:colN] with the nearest following closing tag → [/zone:colN]
 * - Expands [/zone:cells] short closers to [/zone:cells:SPEC]
 */
export function normalizeZoneTags(text) {
  // Step 0: Strip the internal [zone:tg] zero-count sentinel, keeping its inner text.
  // The prompt tells the model to write a bare "0" for zero counts, but it sometimes
  // wraps it as [zone:tg]0[/zone:tg]. 'tg' is a vacuous spec (P1/P5 already skip it and
  // it highlights nothing), so removing the wrapper and keeping the inner text is safe
  // and turns an otherwise-correct annotation from a P3:engine_jargon rejection into an
  // accepted one.
  text = text.replace(/\[zone:tg\]([\s\S]*?)\[\/zone:tg\]/gi, (_, inner) => inner);

  // Step 1: Normalize opening tags: [zone:column N] or [zone:col N] → [zone:colN]
  text = text.replace(/\[zone:col(?:umn)?\s+(\d+)\]/gi, (_, n) => `[zone:col${n}]`);

  // Step 2: Pair each opening [zone:colN] with the nearest following closing tag
  const CLOSE_RE = /\[\/zone:col(?:umn)?(?:\s+\d+)?\]/gi;
  const OPEN_RE = /\[zone:col(\d+)\]/gi;
  const resultParts = [];
  let lastIndex = 0;
  let openMatch;

  while ((openMatch = OPEN_RE.exec(text)) !== null) {
    resultParts.push(text.slice(lastIndex, openMatch.index + openMatch[0].length));
    const colNum = openMatch[1];
    CLOSE_RE.lastIndex = openMatch.index + openMatch[0].length;
    const closeMatch = CLOSE_RE.exec(text);
    if (closeMatch) {
      resultParts.push(text.slice(openMatch.index + openMatch[0].length, closeMatch.index));
      resultParts.push(`[/zone:col${colNum}]`);
      lastIndex = closeMatch.index + closeMatch[0].length;
    } else {
      lastIndex = openMatch.index + openMatch[0].length;
    }
  }
  resultParts.push(text.slice(lastIndex));
  text = resultParts.join('');

  // Step 3: Expand short [zone:cells:SPEC]...[/zone:cells] closing tags
  const CELLS_OPEN_RE = /\[zone:cells:([^\]]+)\]/g;
  const cellsParts = [];
  let cellsLastIndex = 0;
  let cellsMatch;
  while ((cellsMatch = CELLS_OPEN_RE.exec(text)) !== null) {
    cellsParts.push(text.slice(cellsLastIndex, cellsMatch.index + cellsMatch[0].length));
    const spec = cellsMatch[1];
    const afterOpen = cellsMatch.index + cellsMatch[0].length;
    const closeIdx = text.indexOf('[/zone:cells]', afterOpen);
    if (closeIdx !== -1) {
      cellsParts.push(text.slice(afterOpen, closeIdx));
      cellsParts.push(`[/zone:cells:${spec}]`);
      cellsLastIndex = closeIdx + '[/zone:cells]'.length;
    } else {
      cellsLastIndex = afterOpen;
    }
  }
  cellsParts.push(text.slice(cellsLastIndex));
  return cellsParts.join('');
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Validate all zone annotations in an LLM explanation against the board.
 * Runs P1, P2, P3, P5, P6 and accumulates all failures (does not short-circuit).
 * When `allowedSet` is provided, also runs checkP5Strong.
 *
 * @param {string} explanation  Full LLM explanation text with [zone:...] tags
 * @param {Board} board         Board instance constructed from the current position
 * @param {Array|null} [allowedSet=null]  AllowedSetEntry[] or null for backward compat
 * @returns {{ valid: boolean, failures: string[] }}
 */
export function validateAnnotation(explanation, board, allowedSet = null) {
  const zones = parseZoneSpecs(explanation);
  console.log('[DEBUG validateAnnotation] parsed zones:', JSON.stringify(zones.map(z => z.spec)));
  console.log('[DEBUG validateAnnotation] allowedSet:', JSON.stringify(allowedSet));

  const failures = [
    ...checkP1(zones),
    ...checkP2(zones),
    ...checkP3(explanation),
    ...checkP5(board, zones, allowedSet),
    ...checkP6(zones),
  ];

  // Strong-P5 when allowedSet is provided (Epic B, FR-031)
  if (allowedSet != null) {
    failures.push(...checkP5Strong(zones, allowedSet));
  }

  return {
    valid: failures.length === 0,
    failures,
  };
}
