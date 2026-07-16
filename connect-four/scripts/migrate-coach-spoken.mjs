#!/usr/bin/env node
/**
 * One-off migration: `coach.*` -> `coach.spoken.*` (dialogue) / `coach.ui.*` (chrome).
 *
 * Rewrites, per language (en, es):
 *   - the TTS registry, IN PLACE: dialogue entries get key/slug rewritten, all other
 *     fields (status / reason / generated_at / approved_at) preserved verbatim; the 7
 *     chrome entries are dropped (they move to `coach.ui.*`, which is never TTS-tracked).
 *   - the mp3 assets, via `git mv` (no re-synthesis: the text is unchanged, so every
 *     existing clip stays valid).
 *   - the audio manifest, by REMAPPING THE EXISTING ON-DISK ARRAY through the
 *     old-slug -> new-slug map. It is never rebuilt from `status === 'approved'`:
 *     the registry and manifest are two stores that can legitimately drift (regenerating
 *     one clip flips its status to awaiting_approval without touching the manifest), and
 *     a rebuild would silently drop slugs the manifest disagrees about.
 *
 * Also deletes two pre-existing orphan mp3s (en only) left over from the deleted
 * ExplorerScreen; they appear in neither the registry nor the manifest.
 *
 * Usage:
 *   node scripts/migrate-coach-spoken.mjs            # dry run (default): print the plan
 *   node scripts/migrate-coach-spoken.mjs --apply    # write
 *   node scripts/migrate-coach-spoken.mjs --help
 *
 * Idempotent: re-running after a successful --apply is a no-op.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** The 7 top-level leaf strings under `coach.` — screen chrome, moving to `coach.ui.*`. */
const CHROME_KEYS = [
  'coach.title',
  'coach.weaknessMap',
  'coach.queueCount_one',
  'coach.queueCount_other',
  'coach.startReview',
  'coach.emptyQueue',
  'coach.missRate',
];

/** Pre-existing orphan assets (D9): en only, in neither registry nor manifest. */
const EXTRA_ORPHANS = [
  'public/audio/coach/coach--sparring--explorer--intro--0.mp3',
  'public/audio/coach/coach--sparring--explorer--intro--1.mp3',
];

const LANGS = [
  { lang: 'en', registry: 'server/tts-registry.json', dir: 'public/audio/coach' },
  { lang: 'es', registry: 'server/tts-registry.es.json', dir: 'public/audio/coach/es' },
];

/** Must stay identical to generate-tts.js / useCoachSpeech.js / server's keyToAudioSlug. */
const keyToSlug = key => key.replace(/[._]/g, '--');

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0]);
  process.exit(0);
}
const APPLY = args.includes('--apply');

const abs = p => path.join(ROOT, p);
const readJson = p => JSON.parse(fs.readFileSync(abs(p), 'utf8'));
const writeJson = (p, v) => fs.writeFileSync(abs(p), `${JSON.stringify(v, null, 2)}\n`);

let failures = 0;
const fail = msg => { console.error(`  FAIL: ${msg}`); failures += 1; };

for (const { lang, registry, dir } of LANGS) {
  console.log(`\n=== ${lang} ===`);
  const entries = readJson(registry);
  const manifest = readJson(`${dir}/coach-audio-manifest.json`);

  if (entries.every(e => e.key.startsWith('coach.spoken.'))) {
    console.log('  already migrated — nothing to do');
    continue;
  }

  const renameMap = new Map(); // oldSlug -> newSlug
  const newEntries = [];
  const dropped = [];

  for (const e of entries) {
    if (CHROME_KEYS.includes(e.key)) { dropped.push(e); continue; }
    if (!e.key.startsWith('coach.')) { fail(`entry outside coach namespace: ${e.key}`); continue; }
    const newKey = `coach.spoken.${e.key.slice('coach.'.length)}`;
    const newSlug = keyToSlug(newKey);
    if (e.slug !== keyToSlug(e.key)) fail(`registry slug is not keyToSlug(key): ${e.key} / ${e.slug}`);
    renameMap.set(e.slug, newSlug);
    // Spread first so key/slug are overridden but every other field survives byte-for-byte.
    newEntries.push({ ...e, key: newKey, slug: newSlug });
  }

  if (dropped.length !== CHROME_KEYS.length) {
    fail(`expected to drop ${CHROME_KEYS.length} chrome entries, found ${dropped.length}`);
  }

  const newManifest = manifest.map(s => renameMap.get(s)).filter(Boolean);
  const droppedSlugs = manifest.filter(s => !renameMap.has(s));

  // Asset moves: only for slugs whose mp3 actually exists on disk.
  const moves = [];
  for (const [oldSlug, newSlug] of renameMap) {
    const from = `${dir}/${oldSlug}.mp3`;
    if (fs.existsSync(abs(from))) moves.push([from, `${dir}/${newSlug}.mp3`]);
  }
  const deletes = [
    ...droppedSlugs.map(s => `${dir}/${s}.mp3`).filter(p => fs.existsSync(abs(p))),
    ...(lang === 'en' ? EXTRA_ORPHANS.filter(p => fs.existsSync(abs(p))) : []),
  ];

  console.log(`  registry: ${entries.length} -> ${newEntries.length} entries (dropped ${dropped.length} chrome)`);
  console.log(`  manifest: ${manifest.length} -> ${newManifest.length} slugs (dropped ${droppedSlugs.length})`);
  console.log(`  renames:  ${moves.length} mp3`);
  console.log(`  deletes:  ${deletes.length} mp3`);
  console.log('  dropped chrome keys:', dropped.map(e => `${e.key}[${e.status}]`).join(', '));
  console.log('  dropped manifest slugs:', droppedSlugs.join(', ') || '(none)');
  console.log('  delete list:');
  deletes.forEach(p => console.log(`    rm ${p}`));
  console.log('  rename table (first 3 + last 3):');
  [...moves.slice(0, 3), ...moves.slice(-3)].forEach(([a, b]) => console.log(`    ${path.basename(a)} -> ${path.basename(b)}`));

  if (!APPLY) { console.log('  [dry run] no files written'); continue; }
  if (failures) { console.error('  refusing to apply: sanity checks failed'); process.exit(1); }

  for (const [from, to] of moves) execFileSync('git', ['mv', from, to], { cwd: ROOT });
  for (const p of deletes) {
    try { execFileSync('git', ['rm', '-q', p], { cwd: ROOT }); }
    catch { fs.rmSync(abs(p)); } // untracked orphan
  }
  writeJson(registry, newEntries);
  writeJson(`${dir}/coach-audio-manifest.json`, newManifest);
  console.log('  applied');
}

if (failures) { console.error(`\n${failures} sanity failure(s)`); process.exit(1); }
console.log(APPLY ? '\nDone.' : '\nDry run complete. Re-run with --apply to write.');
