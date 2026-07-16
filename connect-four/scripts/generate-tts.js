/**
 * generate-tts.js — CLI script for managing coach TTS audio.
 *
 * Usage:
 *   node scripts/generate-tts.js [--scan-only]          Initialize/reset registry from en.json
 *   node scripts/generate-tts.js --key <i18n_key>       Synthesize a single key
 *   node scripts/generate-tts.js --all-new              Synthesize all needs_audio keys
 *
 * Requires Node 20.6+ (for --env-file flag):
 *   node --env-file=server/.env scripts/generate-tts.js ...
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = join(__dirname, '..');

const REGISTRY_PATH = join(PROJECT_DIR, 'server', 'tts-registry.json');
const AUDIO_DIR = join(PROJECT_DIR, 'public', 'audio', 'coach');

const SUPPORTED_LOCALES = ['en', 'es'];

/**
 * Directory for a language's coach clips. English stays at the root
 * (public/audio/coach); every other language gets its own subdirectory
 * (public/audio/coach/<lang>) so existing English files never move.
 * @param {string} lang
 * @returns {string}
 */
export function audioDirForLang(lang) {
  return lang === 'en' ? AUDIO_DIR : join(AUDIO_DIR, lang);
}

/**
 * Manifest path for a language, colocated with its audio directory.
 * @param {string} lang
 * @returns {string}
 */
export function manifestPathForLang(lang) {
  return join(audioDirForLang(lang), 'coach-audio-manifest.json');
}

/**
 * Source i18n JSON for a language.
 * @param {string} lang
 * @returns {string}
 */
export function sourceJsonForLang(lang) {
  return join(PROJECT_DIR, 'src', 'i18n', `${lang}.json`);
}

/**
 * Registry path for a language. English keeps the existing root registry
 * file (server/tts-registry.json) unchanged; other languages get their own
 * per-language registry file alongside it.
 * @param {string} lang
 * @returns {string}
 */
export function registryPathForLang(lang) {
  return lang === 'en'
    ? REGISTRY_PATH
    : join(PROJECT_DIR, 'server', `tts-registry.${lang}.json`);
}

/**
 * Flatten a nested object to dot-path keys, filtering to keys starting with prefix.
 * @param {object} obj
 * @param {string} [prefix='']
 * @param {string} [keyPrefix='']
 * @returns {Array<{key: string, value: string}>}
 */
function flattenKeys(obj, prefix = '', keyPrefix = '') {
  const result = [];
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = keyPrefix ? `${keyPrefix}.${k}` : k;
    if (typeof v === 'string') {
      if (!fullKey.startsWith(prefix)) continue;
      result.push({ key: fullKey, value: v });
    } else if (typeof v === 'object' && v !== null) {
      result.push(...flattenKeys(v, prefix, fullKey));
    }
  }
  return result;
}

/**
 * Derive a safe filename slug from an i18n key.
 * Replaces '.' and '_' with '--'.
 * @param {string} key
 * @returns {string}
 */
function keyToSlug(key) {
  return key.replace(/[._]/g, '--');
}

/**
 * Load or create an empty registry.
 * @returns {Promise<Array<{key: string, slug: string, status: string, reason: string|null, generated_at: string|null, approved_at: string|null}>>}
 */
async function loadRegistry(lang = 'en') {
  try {
    const raw = JSON.parse(await readFile(registryPathForLang(lang), 'utf8'));
    if (!Array.isArray(raw)) return [];
    return raw;
  } catch {
    return [];
  }
}

async function saveRegistry(entries, lang = 'en') {
  await writeFile(registryPathForLang(lang), JSON.stringify(entries, null, 2) + '\n', 'utf8');
}

async function saveManifest(entries, lang = 'en') {
  // Manifest is just an array of approved slug strings
  const slugs = entries
    .filter(e => e.status === 'approved')
    .map(e => e.slug)
    .sort();
  const audioDir = audioDirForLang(lang);
  await mkdir(audioDir, { recursive: true });
  await writeFile(manifestPathForLang(lang), JSON.stringify(slugs, null, 2) + '\n', 'utf8');
}

// ── scan-only: build/refresh registry from <lang>.json ─────────────────────

async function scanOnly(lang = 'en') {
  const enRaw = JSON.parse(await readFile(sourceJsonForLang(lang), 'utf8'));
  const coachKeys = flattenKeys(enRaw, 'coach.spoken.');

  const entries = [];
  for (const { key, value } of coachKeys) {
    const slug = keyToSlug(key);
    if (value.includes('{{')) {
      entries.push({
        key,
        slug,
        status: 'ineligible',
        reason: 'interpolated',
        generated_at: null,
        approved_at: null,
      });
    } else {
      entries.push({
        key,
        slug,
        status: 'needs_audio',
        reason: null,
        generated_at: null,
        approved_at: null,
      });
    }
  }

  await saveRegistry(entries, lang);
  console.log(`Registry written (${lang}): ${entries.length} keys (${entries.filter(e => e.status === 'needs_audio').length} static, ${entries.filter(e => e.status === 'ineligible').length} ineligible)`);

  // Also initialize an empty manifest if it doesn't exist
  if (!existsSync(manifestPathForLang(lang))) {
    await saveManifest([], lang);
    console.log('Manifest initialized (empty).');
  }
}

// ── synthesize helpers ────────────────────────────────────────────────────

async function synthesizeAndWrite(entry, value, lang = 'en') {
  const { synthesize } = await import('../server/ttsProvider.js');
  console.log(`  Synthesizing "${entry.key}" (${lang})...`);
  const audio = await synthesize(value);
  const audioDir = audioDirForLang(lang);
  const filePath = join(audioDir, `${entry.slug}.mp3`);
  await mkdir(audioDir, { recursive: true });
  await writeFile(filePath, audio);
  console.log(`  Wrote ${filePath} (${audio.length} bytes)`);
}

async function generateSingle(key, lang = 'en') {
  const enRaw = JSON.parse(await readFile(sourceJsonForLang(lang), 'utf8'));
  const coachKeys = flattenKeys(enRaw, 'coach.spoken.');
  const match = coachKeys.find(k => k.key === key);

  if (!match) {
    console.error(`Key "${key}" not found in ${lang}.json coach.spoken.* namespace.`);
    process.exit(1);
  }

  if (match.value.includes('{{')) {
    console.error(`Key "${key}" is interpolated — cannot synthesize.`);
    process.exit(1);
  }

  const entries = await loadRegistry(lang);
  let entry = entries.find(e => e.key === key);

  if (!entry) {
    entry = {
      key,
      slug: keyToSlug(key),
      status: 'needs_audio',
      reason: null,
      generated_at: null,
      approved_at: null,
    };
    entries.push(entry);
  }

  if (entry.status === 'ineligible') {
    console.error(`Key "${key}" is ineligible: ${entry.reason}`);
    process.exit(1);
  }

  await synthesizeAndWrite(entry, match.value, lang);
  entry.status = 'awaiting_approval';
  entry.generated_at = new Date().toISOString();
  await saveRegistry(entries, lang);
  console.log(`Key "${key}" → awaiting_approval.`);
}

async function generateAllNew(lang = 'en') {
  const enRaw = JSON.parse(await readFile(sourceJsonForLang(lang), 'utf8'));
  const coachKeys = flattenKeys(enRaw, 'coach.spoken.');
  const keyMap = new Map(coachKeys.map(k => [k.key, k.value]));

  const entries = await loadRegistry(lang);
  const needsAudio = entries.filter(e => e.status === 'needs_audio');

  if (needsAudio.length === 0) {
    console.log('No keys with status "needs_audio".');
    return;
  }

  console.log(`Generating audio for ${needsAudio.length} keys (${lang})...`);

  let success = 0;
  let failed = 0;

  for (const entry of needsAudio) {
    const value = keyMap.get(entry.key);
    if (!value || value.includes('{{')) {
      console.log(`  SKIP "${entry.key}": ${!value ? `key not found in ${lang}.json` : 'interpolated'}`);
      failed++;
      continue;
    }

    try {
      await synthesizeAndWrite(entry, value, lang);
      entry.status = 'awaiting_approval';
      entry.generated_at = new Date().toISOString();
      success++;
    } catch (err) {
      console.error(`  FAIL "${entry.key}": ${err.message}`);
      failed++;
    }
  }

  await saveRegistry(entries, lang);
  console.log(`Done: ${success} generated, ${failed} failed.`);
}

// ── Main ────────────────────────────────────────────────────────────────────
//
// Guarded so importing this module (e.g. from a unit test that only wants
// the pure path helpers) never triggers the CLI's side effects — without
// this guard, importing the module from a test runner executes the
// scan-only/generation branches with whatever argv the test process happens
// to have, which can silently clobber server/tts-registry.json.

function isMainModule() {
  return process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
}

function getLangArg(argv) {
  const idx = argv.indexOf('--lang');
  if (idx === -1) return 'en';
  const value = argv[idx + 1];
  if (!value) {
    console.error('--lang requires a value');
    process.exit(1);
  }
  return value;
}

if (isMainModule()) {
  const args = process.argv.slice(2);
  const langArg = getLangArg(args);
  const langs = langArg === 'all' ? SUPPORTED_LOCALES : [langArg];

  if (args.length === 0 || args.includes('--scan-only')) {
    for (const lang of langs) await scanOnly(lang);
  } else if (args.includes('--key')) {
    const idx = args.indexOf('--key');
    const key = args[idx + 1];
    if (!key) {
      console.error('--key requires a value');
      process.exit(1);
    }
    for (const lang of langs) await generateSingle(key, lang);
  } else if (args.includes('--all-new')) {
    for (const lang of langs) await generateAllNew(lang);
  } else {
    console.error('Usage: node generate-tts.js [--scan-only] [--key <key>] [--all-new] [--lang <code>|all]');
    process.exit(1);
  }
}
