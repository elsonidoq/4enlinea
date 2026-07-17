// Tripwire for the `coach.spoken.*` / `coach.ui.*` split — see
// docs/architecture/coach-audio-conventions.md.
//
// The namespace declares INTENT to be voiced, but a namespace cannot enforce itself: nothing stops
// a maintainer from adding a chrome string under `coach.spoken.*` (which would then be synthesized
// and shipped as audio nobody meant to hear — the original bug: a clip that said only "miss rate"),
// or from leaving a stale `coach.<x>` registry entry behind. This test is that enforcement layer.
//
// Registered in BOTH `test` and `test:fast` — see testing-conventions.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import en from '../../src/i18n/en.json' with { type: 'json' };
import es from '../../src/i18n/es.json' with { type: 'json' };

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const readJson = p => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

const LANGS = [
  { lang: 'en', registry: 'server/tts-registry.json', dir: 'public/audio/coach' },
  { lang: 'es', registry: 'server/tts-registry.es.json', dir: 'public/audio/coach/es' },
];

test('coach.* has exactly two children: spoken (intent to voice) and ui (chrome)', () => {
  for (const [name, tree] of [['en', en], ['es', es]]) {
    assert.deepEqual(Object.keys(tree.coach).sort(), ['spoken', 'ui'], `${name}.json coach.* children`);
  }
});

test('coach.ui.* holds only leaf strings; coach.spoken.* holds only dialogue subtrees', () => {
  for (const [name, tree] of [['en', en], ['es', es]]) {
    for (const [k, v] of Object.entries(tree.coach.ui)) {
      assert.equal(typeof v, 'string', `${name}.json coach.ui.${k} must be a leaf string`);
    }
    for (const [k, v] of Object.entries(tree.coach.spoken)) {
      assert.equal(typeof v, 'object', `${name}.json coach.spoken.${k} must be a dialogue subtree`);
    }
  }
});

for (const { lang, registry, dir } of LANGS) {
  test(`[${lang}] every TTS registry key is under coach.spoken.*`, () => {
    const entries = readJson(registry);
    assert.ok(entries.length > 0, 'registry is empty');
    const stale = entries.filter(e => !e.key.startsWith('coach.spoken.')).map(e => e.key);
    assert.deepEqual(stale, [], `registry keys outside coach.spoken.*: ${JSON.stringify(stale)}`);
  });

  test(`[${lang}] no coach.ui.* key is TTS-tracked in the registry or the manifest`, () => {
    const uiKeys = Object.keys(en.coach.ui).map(k => `coach.ui.${k}`);
    const uiSlugs = uiKeys.map(k => k.replace(/[._]/g, '--'));
    // Chrome keys' pre-migration slugs (`coach--title`, ...) must not linger either.
    const legacySlugs = Object.keys(en.coach.ui).map(k => `coach.${k}`.replace(/[._]/g, '--'));

    const entries = readJson(registry);
    const tracked = entries.filter(e => uiKeys.includes(e.key)).map(e => e.key);
    assert.deepEqual(tracked, [], `coach.ui.* keys must never be TTS-tracked: ${JSON.stringify(tracked)}`);

    const manifest = readJson(`${dir}/coach-audio-manifest.json`);
    const bad = manifest.filter(s => uiSlugs.includes(s) || legacySlugs.includes(s));
    assert.deepEqual(bad, [], `coach.ui.* slugs must never be in the manifest: ${JSON.stringify(bad)}`);
  });

  test(`[${lang}] every registry key resolves to a real coach.spoken.* string`, () => {
    const tree = lang === 'en' ? en : es;
    const missing = readJson(registry)
      .map(e => e.key)
      .filter(k => typeof k.split('.').reduce((o, p) => (o == null ? o : o[p]), tree) !== 'string');
    assert.deepEqual(missing, [], `registry keys with no i18n string: ${JSON.stringify(missing)}`);
  });

  test(`[${lang}] every registry slug is keyToSlug(key)`, () => {
    // Must stay identical to generate-tts.js / useCoachSpeech.js / server's keyToAudioSlug.
    const wrong = readJson(registry)
      .filter(e => e.slug !== e.key.replace(/[._]/g, '--'))
      .map(e => `${e.key} -> ${e.slug}`);
    assert.deepEqual(wrong, [], `slug does not match keyToSlug(key): ${JSON.stringify(wrong)}`);
  });

  test(`[${lang}] every manifest slug resolves to an mp3 on disk, and no mp3 is orphaned`, () => {
    const manifest = readJson(`${dir}/coach-audio-manifest.json`);
    const missing = manifest.filter(s => !fs.existsSync(path.join(ROOT, dir, `${s}.mp3`)));
    assert.deepEqual(missing, [], `manifest slugs with no mp3: ${JSON.stringify(missing)}`);

    const inManifest = new Set(manifest);
    const orphans = fs.readdirSync(path.join(ROOT, dir))
      .filter(f => f.endsWith('.mp3'))
      .map(f => f.slice(0, -4))
      .filter(s => !inManifest.has(s));
    assert.deepEqual(orphans, [], `mp3s not in the manifest: ${JSON.stringify(orphans)}`);
  });

  test(`[${lang}] ineligible-but-intended entries are tolerated, not treated as failures`, () => {
    // `coach.spoken.forbidden_columns.suboptimal.0` is interpolated ({{...}}) so the generator
    // marks it `ineligible` — yet ChallengeScreen genuinely speaks it (it silently no-ops because
    // the slug is unapproved). Ineligible and "intended to be spoken" legitimately coexist; this
    // test pins that the tripwire above does not outlaw it. Pre-existing; out of scope to fix.
    const entries = readJson(registry);
    const ineligible = entries.filter(e => e.status === 'ineligible');
    for (const e of ineligible) {
      assert.ok(e.key.startsWith('coach.spoken.'), `${e.key} is ineligible but still coach.spoken.*`);
      assert.equal(e.reason, 'interpolated');
    }
  });
}
