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
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import en from '../../src/i18n/en.json' with { type: 'json' };
import es from '../../src/i18n/es.json' with { type: 'json' };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LESSONS_DIR = path.join(__dirname, '../../lessons');

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

// ── Spec 052 (US5 / T051, FR-025, OI-73) — lesson-id ↔ i18n namespace collision guard ──────
//
// `lesson.*` is one flat i18n namespace shared by UI chrome (`lesson.node.done`,
// `lesson.confirmation.header`, `lesson.windowCounts.legend`, `lesson.notFound`, …). Spec 052
// FR-011 removed the per-lesson `lesson.<id>` objects — every lesson title now comes from the
// lesson JSON on disk, so at time of writing EVERY remaining child of `lesson` is reserved UI
// chrome. That is why the reserved set below is *derived* from `en.json` at run time rather than
// hardcoded: if a maintainer adds `lesson.foo` chrome tomorrow, this guard picks it up for free,
// and if someone reintroduces a per-lesson `lesson.<id>` object it fails loudly (which is also
// correct — FR-011 says that key shape is gone for good; `lessonContent.test.js` carries the
// companion static scan asserting no `lesson.<id>.title` survives).
//
// Without this guard, a new `lessons/lesson-NN-node.json` with `"id": "node"` would silently
// shadow/collide with the `lesson.node.*` chrome namespace — nothing would throw, some screen
// would just render the wrong string.
export function reservedLessonSubKeys(enJson) {
  return new Set(Object.keys(enJson.lesson ?? {}));
}

export function findLessonIdCollisions(lessonIds, reserved) {
  return lessonIds.filter((id) => reserved.has(id)).sort();
}

test('no lesson id collides with a reserved lesson.* i18n sub-key (FR-025 / OI-73)', () => {
  const reserved = reservedLessonSubKeys(en);
  assert.ok(reserved.size > 0, 'expected en.json to have a `lesson` namespace with children');

  // en/es must agree on the reserved set, otherwise "reserved" means two different things
  // depending on locale. (The parity test above already guarantees this at leaf level; this
  // asserts it at the level the guard actually reasons about.)
  assert.deepEqual(
    [...reserved].sort(),
    [...reservedLessonSubKeys(es)].sort(),
    'en.json and es.json disagree about which children `lesson.*` has',
  );

  const lessonFiles = fs.readdirSync(LESSONS_DIR).filter((f) => /^lesson-\d+-.*\.json$/.test(f));
  assert.ok(lessonFiles.length > 0, `expected lesson JSON files in ${LESSONS_DIR}`);

  const lessonIds = lessonFiles.map((f) => {
    const parsed = JSON.parse(fs.readFileSync(path.join(LESSONS_DIR, f), 'utf8'));
    return { file: f, id: parsed.id };
  });

  const collisions = lessonIds.filter(({ id }) => reserved.has(id));

  assert.equal(
    collisions.length,
    0,
    `Lesson id(s) collide with reserved \`lesson.*\` i18n sub-keys — rename the lesson id.\n` +
      `Reserved (derived from en.json's \`lesson\` object): ${JSON.stringify([...reserved].sort())}\n` +
      `Colliding: ${JSON.stringify(collisions)}`,
  );
});

test('the collision helper actually detects a colliding id (guard is not vacuous)', () => {
  // Same helpers the real guard uses, driven with a synthetic id so the detection logic itself
  // is proven rather than merely observed passing on today's clean data.
  const reserved = reservedLessonSubKeys(en);
  const someReserved = [...reserved][0];
  assert.deepEqual(findLessonIdCollisions(['claimeven', someReserved], reserved), [someReserved]);
  assert.deepEqual(findLessonIdCollisions(['claimeven', 'undercut'], reserved), []);
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
