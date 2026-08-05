import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseAnnotatedText,
  zoneToOverlays,
  zoneToWindowGroups,
  regexFallbackParse,
  getZoneColor,
  ZONE_COLORS,
  FUTURE_ZONE_COLOR,
  isValidSpec,
} from '../../src/lib/annotatedText.js';

// ── parseAnnotatedText ──────────────────────────────────────────────────────────

describe('parseAnnotatedText', () => {
  test('valid single zone — col spec', () => {
    const { cleanText, zones } = parseAnnotatedText(
      'Playing in [zone:col4]column 4[/zone:col4] is strong.',
    );
    assert.equal(cleanText, 'Playing in column 4 is strong.');
    assert.equal(zones.length, 1);
    assert.equal(zones[0].spec, 'col4');
    assert.equal(zones[0].text, 'column 4');
    assert.equal(cleanText.slice(zones[0].startChar, zones[0].endChar), 'column 4');
  });

  test('valid single zone — cell spec', () => {
    const { cleanText, zones } = parseAnnotatedText(
      'The disc at [zone:c3r2]row 2, col 3[/zone:c3r2] is key.',
    );
    assert.equal(cleanText, 'The disc at row 2, col 3 is key.');
    assert.equal(zones.length, 1);
    assert.equal(zones[0].spec, 'c3r2');
    assert.equal(zones[0].text, 'row 2, col 3');
  });

  test('valid single zone — cells multi spec', () => {
    const { cleanText, zones } = parseAnnotatedText(
      'Threats at [zone:cells:c4r2,c4r4]rows 2 and 4[/zone:cells:c4r2,c4r4].',
    );
    assert.equal(cleanText, 'Threats at rows 2 and 4.');
    assert.equal(zones.length, 1);
    assert.equal(zones[0].spec, 'cells:c4r2,c4r4');
    assert.equal(zones[0].text, 'rows 2 and 4');
  });

  test('valid single zone — row spec', () => {
    const { cleanText, zones } = parseAnnotatedText(
      'Fill [zone:row5]the top row[/zone:row5] first.',
    );
    assert.equal(cleanText, 'Fill the top row first.');
    assert.equal(zones.length, 1);
    assert.equal(zones[0].spec, 'row5');
    assert.equal(zones[0].text, 'the top row');
  });

  test('valid single zone — tg spec', () => {
    const { cleanText, zones } = parseAnnotatedText(
      'Playing here creates [zone:tg]a major threat[/zone:tg].',
    );
    assert.equal(cleanText, 'Playing here creates a major threat.');
    assert.equal(zones.length, 1);
    assert.equal(zones[0].spec, 'tg');
    assert.equal(zones[0].text, 'a major threat');
  });

  test('multiple zones in one text', () => {
    const { cleanText, zones } = parseAnnotatedText(
      'Place at [zone:col4]column 4[/zone:col4] to create [zone:cells:c4r2,c4r4]a double threat[/zone:cells:c4r2,c4r4].',
    );
    assert.equal(zones.length, 2);
    assert.equal(zones[0].spec, 'col4');
    assert.equal(zones[1].spec, 'cells:c4r2,c4r4');
    assert.equal(zones[0].index, 0);
    assert.equal(zones[1].index, 1);
    // Verify character offsets don't overlap
    assert.ok(zones[0].endChar <= zones[1].startChar || zones[1].endChar <= zones[0].startChar,
      'zone character offsets should not overlap');
    // Verify both zone texts are present in cleanText at correct positions
    assert.equal(cleanText.slice(zones[0].startChar, zones[0].endChar), 'column 4');
    assert.equal(cleanText.slice(zones[1].startChar, zones[1].endChar), 'a double threat');
  });

  test('text with no zones', () => {
    const { cleanText, zones } = parseAnnotatedText(
      'This is a plain explanation with no annotations.',
    );
    assert.equal(cleanText, 'This is a plain explanation with no annotations.');
    assert.equal(zones.length, 0);
  });

  test('empty text', () => {
    const { cleanText, zones } = parseAnnotatedText('');
    assert.equal(cleanText, '');
    assert.equal(zones.length, 0);
  });

  test('zone with no matching close tag — dropped', () => {
    // Missing close tag means the regex doesn't match → treated as plain text
    const { cleanText, zones } = parseAnnotatedText(
      'Play [zone:col4]column 4 without closing.',
    );
    // The open tag is not matched because there's no [/zone:col4]
    assert.equal(zones.length, 0);
    // Raw tags remain in the text (fallback — old clients will see raw text)
    assert.ok(cleanText.includes('[zone:col4]'));
  });

  test('adjacent zones — no gap between close and open', () => {
    const { cleanText, zones } = parseAnnotatedText(
      '[zone:col4]col 4[/zone:col4][zone:row5]row 5[/zone:row5]',
    );
    assert.equal(zones.length, 2);
    assert.equal(cleanText, 'col 4row 5');
    // Adjacent zones have correct character offsets
    assert.equal(zones[0].endChar, zones[1].startChar);
  });

  test('zone offsets correctly track character positions in clean text', () => {
    const { cleanText, zones } = parseAnnotatedText(
      'Prefix [zone:col3]middle[/zone:col3] suffix',
    );
    assert.equal(cleanText, 'Prefix middle suffix');
    assert.equal(zones.length, 1);
    assert.equal(zones[0].startChar, 7);  // 'Prefix '
    assert.equal(zones[0].endChar, 13);    // 'Prefix middle'
    assert.equal(cleanText.slice(zones[0].startChar, zones[0].endChar), 'middle');
  });

  test('! in opening tag only → defaultActive=true (canonical form)', () => {
    const { cleanText, zones } = parseAnnotatedText(
      'Play [zone:col4!]column 4[/zone:col4] to win.',
    );
    assert.equal(cleanText, 'Play column 4 to win.');
    assert.equal(zones.length, 1);
    assert.equal(zones[0].spec, 'col4');
    assert.equal(zones[0].defaultActive, true);
    assert.equal(zones[0].text, 'column 4');
  });

  test('! in both tags → defaultActive=true (tolerated for backwards compat)', () => {
    const { cleanText, zones } = parseAnnotatedText(
      'Play [zone:col4!]column 4[/zone:col4!] to win.',
    );
    assert.equal(cleanText, 'Play column 4 to win.');
    assert.equal(zones.length, 1);
    assert.equal(zones[0].spec, 'col4');
    assert.equal(zones[0].defaultActive, true);
  });

  test('! only in closing tag → defaultActive=false (zone still parsed)', () => {
    const { cleanText, zones } = parseAnnotatedText(
      'Play [zone:col2]column 2[/zone:col2!] now.',
    );
    assert.equal(cleanText, 'Play column 2 now.');
    assert.equal(zones.length, 1);
    assert.equal(zones[0].spec, 'col2');
    assert.equal(zones[0].defaultActive, false);
  });

  test('zone without ! → defaultActive=false', () => {
    const { zones } = parseAnnotatedText('[zone:col4]column 4[/zone:col4]');
    assert.equal(zones.length, 1);
    assert.equal(zones[0].defaultActive, false);
  });

  test('mix of default-active and normal zones', () => {
    const { zones } = parseAnnotatedText(
      '[zone:col4!]column 4[/zone:col4!] vs [zone:col3]column 3[/zone:col3]',
    );
    assert.equal(zones.length, 2);
    assert.equal(zones[0].spec, 'col4');
    assert.equal(zones[0].defaultActive, true);
    assert.equal(zones[1].spec, 'col3');
    assert.equal(zones[1].defaultActive, false);
  });

  test('nested-like tags with different specs — only outermost matched', () => {
    // [zone:col4]...[zone:row5]...[/zone:row5]...[/zone:col4] — the regex
    // matches non-greedy inner text, so [zone:col4] matches to first [/zone:col4]
    const { zones } = parseAnnotatedText(
      '[zone:col4]outer [zone:row5]inner[/zone:row5] text[/zone:col4]',
    );
    // The regex should match col4 with inner text including the row5 tags
    assert.equal(zones.length, 1);
    assert.equal(zones[0].spec, 'col4');
    assert.equal(zones[0].text, 'outer [zone:row5]inner[/zone:row5] text');
  });
});

// ── zoneToOverlays ─────────────────────────────────────────────────────────────

describe('zoneToOverlays', () => {
  test('colN → 6 cells in column N-1', () => {
    const cells = zoneToOverlays('col4');
    assert.equal(cells.length, 6);
    // All in column 3 (0-indexed from col4=1-indexed)
    assert.ok(cells.every(cell => cell.c === 3));
    // Rows 0–5
    const rows = cells.map(c => c.r).sort((a, b) => a - b);
    assert.deepEqual(rows, [0, 1, 2, 3, 4, 5]);
  });

  test('col1 → column 0', () => {
    const cells = zoneToOverlays('col1');
    assert.equal(cells.length, 6);
    assert.ok(cells.every(cell => cell.c === 0));
  });

  test('col7 → column 6', () => {
    const cells = zoneToOverlays('col7');
    assert.equal(cells.length, 6);
    assert.ok(cells.every(cell => cell.c === 6));
  });

  test('cNrM → single cell', () => {
    const cells = zoneToOverlays('c3r2');
    assert.equal(cells.length, 1);
    assert.deepEqual(cells[0], { c: 2, r: 1 }); // 1-indexed→0-indexed
  });

  test('c1r1 → bottom-left cell', () => {
    const cells = zoneToOverlays('c1r1');
    assert.deepEqual(cells[0], { c: 0, r: 0 });
  });

  test('c7r6 → top-right cell', () => {
    const cells = zoneToOverlays('c7r6');
    assert.deepEqual(cells[0], { c: 6, r: 5 });
  });

  test('cells: → multiple cells', () => {
    const cells = zoneToOverlays('cells:c4r2,c4r4,c5r3');
    assert.equal(cells.length, 3);
    assert.deepEqual(cells[0], { c: 3, r: 1 });
    assert.deepEqual(cells[1], { c: 3, r: 3 });
    assert.deepEqual(cells[2], { c: 4, r: 2 });
  });

  test('cells: with whitespace after commas', () => {
    const cells = zoneToOverlays('cells:c1r1, c3r3, c5r5');
    assert.equal(cells.length, 3);
  });

  test('rowN → 7 cells in row N-1', () => {
    const cells = zoneToOverlays('row5');
    assert.equal(cells.length, 7);
    assert.ok(cells.every(cell => cell.r === 4)); // row5 → 0-indexed row 4
    const cols = cells.map(c => c.c).sort((a, b) => a - b);
    assert.deepEqual(cols, [0, 1, 2, 3, 4, 5, 6]);
  });

  test('row1 → bottom row', () => {
    const cells = zoneToOverlays('row1');
    assert.ok(cells.every(cell => cell.r === 0));
  });

  test('tg → returns userMajorThreats', () => {
    const threats = [{ c: 3, r: 2 }, { c: 4, r: 2 }];
    const cells = zoneToOverlays('tg', threats);
    assert.deepEqual(cells, threats);
  });

  test('tg with empty threats → empty array', () => {
    const cells = zoneToOverlays('tg', []);
    assert.deepEqual(cells, []);
  });

  test('tg with no threats arg → empty array', () => {
    const cells = zoneToOverlays('tg');
    assert.deepEqual(cells, []);
  });

  test('out-of-bounds col → returns empty', () => {
    const cells = zoneToOverlays('col8');
    assert.deepEqual(cells, []);
  });

  test('out-of-bounds col0 → returns empty', () => {
    const cells = zoneToOverlays('col0');
    assert.deepEqual(cells, []);
  });

  test('out-of-bounds row in single cell → returns empty', () => {
    const cells = zoneToOverlays('c3r7');
    assert.deepEqual(cells, []);
  });

  test('out-of-bounds row in multi-cell spec → drops that cell', () => {
    const cells = zoneToOverlays('cells:c4r2,c4r9,c5r3'); // c4r9 is out of bounds
    assert.equal(cells.length, 2);
    assert.deepEqual(cells[0], { c: 3, r: 1 });
    assert.deepEqual(cells[1], { c: 4, r: 2 });
  });

  test('out-of-bounds row → returns empty', () => {
    const cells = zoneToOverlays('row7');
    assert.deepEqual(cells, []);
  });

  test('empty spec → unknown, returns empty', () => {
    const cells = zoneToOverlays('');
    assert.deepEqual(cells, []);
  });

  test('unknown spec → returns empty', () => {
    const cells = zoneToOverlays('diagonal3');
    assert.deepEqual(cells, []);
  });

  test('malformed multi-cell spec — non-cell entries dropped', () => {
    const cells = zoneToOverlays('cells:c4r2,foobar,c5r3');
    assert.equal(cells.length, 2);
    assert.deepEqual(cells[0], { c: 3, r: 1 });
    assert.deepEqual(cells[1], { c: 4, r: 2 });
  });

  test('opponentMajorThreats are NOT used for tg (only user)', () => {
    const userThreats = [{ c: 3, r: 2 }];
    const oppThreats = [{ c: 5, r: 1 }];
    const cells = zoneToOverlays('tg', userThreats, oppThreats);
    assert.deepEqual(cells, userThreats); // only user threats, not opponent
  });
});

// ── regexFallbackParse ─────────────────────────────────────────────────────────

describe('regexFallbackParse', () => {
  test('"column 4" → 1 zone', () => {
    const { cleanText, zones } = regexFallbackParse(
      'Playing in column 4 creates a threat.',
    );
    assert.equal(cleanText, 'Playing in column 4 creates a threat.');
    assert.equal(zones.length, 1);
    assert.equal(zones[0].spec, 'col4');
    assert.equal(zones[0].text, 'column 4');
  });

  test('"col 3 and col 5" → 2 zones', () => {
    const { zones } = regexFallbackParse('Try col 3 or col 5 instead.');
    assert.equal(zones.length, 2);
    assert.equal(zones[0].spec, 'col3');
    assert.equal(zones[1].spec, 'col5');
  });

  test('"Column 1" (capitalized) → 1 zone', () => {
    const { zones } = regexFallbackParse('Column 1 is the key.');
    assert.equal(zones.length, 1);
    assert.equal(zones[0].spec, 'col1');
  });

  test('"rows 2 and 4" → multi-cell zone', () => {
    const { zones } = regexFallbackParse(
      'The threats at rows 2 and 4 are decisive.',
    );
    assert.equal(zones.length, 1);
    assert.ok(zones[0].spec.startsWith('cells:'));
    // Should contain cells for both rows (14 cells total: 7 cols × 2 rows)
    const cellCount = zones[0].spec.split(':')[1].split(',').length;
    assert.equal(cellCount, 14);
  });

  test('standalone "row 5" → 1 zone', () => {
    const { zones } = regexFallbackParse('Fill row 5 first.');
    assert.equal(zones.length, 1);
    assert.equal(zones[0].spec, 'row5');
  });

  test('text with no spatial references → empty zones', () => {
    const { zones } = regexFallbackParse(
      'This position is difficult to analyze.',
    );
    assert.equal(zones.length, 0);
  });

  test('empty text → empty zones', () => {
    const { zones } = regexFallbackParse('');
    assert.equal(zones.length, 0);
  });

  test('"column N" as abstract phrasing → false positive (acceptable)', () => {
    // The fallback regex matches "column 4" even in figurative usage.
    // This is documented as acceptable (~90% precision target).
    const { zones } = regexFallbackParse(
      'Column 4 is not in this board position.',
    );
    // It matches — this is a known false-positive pattern
    assert.equal(zones.length, 1);
  });

  test('multiple spatial references are sorted by position', () => {
    const { zones } = regexFallbackParse(
      'Column 4 is better than column 2.',
    );
    assert.ok(zones.length >= 2);
    // Sorted by startChar
    for (let i = 1; i < zones.length; i++) {
      assert.ok(zones[i].startChar >= zones[i - 1].startChar,
        'zones should be sorted by startChar');
    }
  });

  test('dedup: same position not added twice', () => {
    // "column 4" could be matched by both colFullRegex and colShortRegex
    // but "col " won't match "column " so there shouldn't be overlap.
    // Safety check: ensure no duplicate start/end positions.
    const { zones } = regexFallbackParse('column 4 is column 4');
    // Two occurrences at different positions → 2 zones
    assert.equal(zones.length, 2);
    const keys = zones.map(z => `${z.startChar},${z.endChar}`);
    assert.equal(new Set(keys).size, keys.length, 'no duplicate positions');
  });
});

// ── getZoneColor ────────────────────────────────────────────────────────────────

describe('getZoneColor', () => {
  test('returns same color for same spec', () => {
    assert.equal(getZoneColor('col4'), getZoneColor('col4'));
  });

  test('returns a value from ZONE_COLORS', () => {
    for (const spec of ['col1', 'col4', 'row2', 'c3r2', 'tg', 'cells:c1r1,c2r2']) {
      const color = getZoneColor(spec);
      assert.ok(ZONE_COLORS.includes(color), `${spec} → ${color} not in ZONE_COLORS`);
    }
  });

  test('is deterministic across calls', () => {
    const specs = ['col1', 'col4', 'row2', 'c3r2', 'tg'];
    for (const spec of specs) {
      const first = getZoneColor(spec);
      for (let i = 0; i < 100; i++) {
        assert.equal(getZoneColor(spec), first, `${spec} changed color across calls`);
      }
    }
  });

  test('different specs may get different colors (no single-color collapse)', () => {
    // With 7 colors and 6 distinct specs, it's statistically almost impossible
    // for all 6 to map to the same color with a reasonable hash.
    const colors = new Set(
      ['col1', 'col2', 'col3', 'col4', 'row5', 'tg'].map(getZoneColor),
    );
    assert.ok(colors.size > 1, `only ${colors.size} color — hash should distribute`);
  });
});

// ── future: prefix (US1, deep-reveal-grounding spec 058) ───────────────────────

describe('isValidSpec — future: prefix', () => {
  test('accepts a future:-prefixed single-cell spec', () => {
    assert.equal(isValidSpec('future:c2r6'), true);
  });

  test('accepts a future:-prefixed windows spec', () => {
    assert.equal(isValidSpec('future:windows:c2r6,c5r5'), true);
  });

  test('rejects a future: wrapper around an invalid shape', () => {
    assert.equal(isValidSpec('future:diagonal3'), false);
  });
});

describe('getZoneColor — future: prefix reserved color', () => {
  test('any future:-prefixed spec returns FUTURE_ZONE_COLOR', () => {
    assert.equal(getZoneColor('future:c2r6'), FUTURE_ZONE_COLOR);
    assert.equal(getZoneColor('future:windows:c2r6,c5r5'), FUTURE_ZONE_COLOR);
  });

  test('FUTURE_ZONE_COLOR is not one of the 4 ZONE_COLORS hash-pool entries', () => {
    assert.ok(!ZONE_COLORS.includes(FUTURE_ZONE_COLOR),
      'FUTURE_ZONE_COLOR must be a reserved, parallel constant — never appended to ZONE_COLORS');
  });

  test('a future:-prefixed spec never collides with the hash-pool color its unprefixed form would get', () => {
    // The unprefixed spec still hashes into the pool; the prefixed one must not.
    const unprefixedColor = getZoneColor('c2r6');
    assert.ok(ZONE_COLORS.includes(unprefixedColor));
    assert.notEqual(getZoneColor('future:c2r6'), unprefixedColor);
  });
});

describe('zoneToOverlays / zoneToWindowGroups — future: prefix resolves identically to the unprefixed form', () => {
  test('future:c2r6 resolves to the same cell as c2r6', () => {
    assert.deepEqual(zoneToOverlays('future:c2r6'), zoneToOverlays('c2r6'));
    assert.deepEqual(zoneToOverlays('future:c2r6'), [{ c: 1, r: 5 }]);
  });

  test('future:windows:c2r6,c5r5 resolves to the same cells as windows:c2r6,c5r5', () => {
    assert.deepEqual(zoneToOverlays('future:windows:c2r6,c5r5'), zoneToOverlays('windows:c2r6,c5r5'));
  });

  test('zoneToWindowGroups: future:windows:c2r6,c5r5 resolves to the same groups as windows:c2r6,c5r5', () => {
    assert.deepEqual(zoneToWindowGroups('future:windows:c2r6,c5r5'), zoneToWindowGroups('windows:c2r6,c5r5'));
  });
});
