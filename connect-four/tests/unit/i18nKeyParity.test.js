// Spec 049 (Epic 9) T024 / User Story 4 — automated guard against future translation drift.
//
// Lockstep rule: `src/i18n/en.json` and `src/i18n/es.json` MUST have identical nested key
// structures (key PRESENCE only — not text equality; a proper noun translated identically in
// both files must still pass, FR-019). Whenever a maintainer adds a new English UI copy key
// without adding the matching Spanish key (or vice versa), this test fails and reports exactly
// which dotted key paths are missing from which file. This is what prevents the app from
// silently reintroducing the English-fallback problem fixed by spec 049's Batch C translation
// work. Registered in BOTH `test` and `test:fast` (FR-020) — see testing-conventions.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import en from '../../src/i18n/en.json' with { type: 'json' };
import es from '../../src/i18n/es.json' with { type: 'json' };

// Pure helper: flattens a nested plain-object JSON tree into a Set of dotted leaf key paths.
// No arrays are expected anywhere in en.json/es.json (confirmed by Batch C) — if one is ever
// introduced, it is treated as a leaf value (not recursed into), so the test still terminates
// and still compares key presence at the object level correctly.
export function getNestedKeyPaths(obj, prefix = '', acc = new Set()) {
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      getNestedKeyPaths(value, path, acc);
    } else {
      acc.add(path);
    }
  }
  return acc;
}

test('en.json and es.json have identical nested key sets (key presence only)', () => {
  const enKeys = getNestedKeyPaths(en);
  const esKeys = getNestedKeyPaths(es);

  const missingFromEs = [...enKeys].filter((k) => !esKeys.has(k)).sort();
  const missingFromEn = [...esKeys].filter((k) => !enKeys.has(k)).sort();

  const message =
    `en.json/es.json key parity mismatch.\n` +
    `missingFromEs (${missingFromEs.length}): ${JSON.stringify(missingFromEs)}\n` +
    `missingFromEn (${missingFromEn.length}): ${JSON.stringify(missingFromEn)}`;

  assert.equal(missingFromEs.length === 0 && missingFromEn.length === 0, true, message);
});

test('getNestedKeyPaths key presence only — identical text values still pass', () => {
  // A proper noun with the exact same text in both languages must not be flagged — this test
  // asserts the comparison is over key paths, never over the leaf values themselves (FR-019).
  const a = { brand: { name: 'Connect Four' } };
  const b = { brand: { name: 'Connect Four' } };
  assert.deepEqual(getNestedKeyPaths(a), getNestedKeyPaths(b));

  // Different leaf text, same key structure -> still equal key sets (still passes).
  const c = { brand: { name: 'Distinto' } };
  assert.deepEqual(getNestedKeyPaths(a), getNestedKeyPaths(c));
});
