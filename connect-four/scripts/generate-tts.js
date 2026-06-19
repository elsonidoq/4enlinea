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

const EN_JSON_PATH = join(PROJECT_DIR, 'src', 'i18n', 'en.json');
const REGISTRY_PATH = join(PROJECT_DIR, 'server', 'tts-registry.json');
const AUDIO_DIR = join(PROJECT_DIR, 'public', 'audio', 'coach');
const MANIFEST_PATH = join(AUDIO_DIR, 'coach-audio-manifest.json');

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
async function loadRegistry() {
  try {
    const raw = JSON.parse(await readFile(REGISTRY_PATH, 'utf8'));
    if (!Array.isArray(raw)) return [];
    return raw;
  } catch {
    return [];
  }
}

async function saveRegistry(entries) {
  await writeFile(REGISTRY_PATH, JSON.stringify(entries, null, 2) + '\n', 'utf8');
}

async function saveManifest(entries) {
  // Manifest is just an array of approved slug strings
  const slugs = entries
    .filter(e => e.status === 'approved')
    .map(e => e.slug)
    .sort();
  await mkdir(AUDIO_DIR, { recursive: true });
  await writeFile(MANIFEST_PATH, JSON.stringify(slugs, null, 2) + '\n', 'utf8');
}

// ── scan-only: build/refresh registry from en.json ────────────────────────

async function scanOnly() {
  const enRaw = JSON.parse(await readFile(EN_JSON_PATH, 'utf8'));
  const coachKeys = flattenKeys(enRaw, 'coach.');

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

  await saveRegistry(entries);
  console.log(`Registry written: ${entries.length} keys (${entries.filter(e => e.status === 'needs_audio').length} static, ${entries.filter(e => e.status === 'ineligible').length} ineligible)`);

  // Also initialize an empty manifest if it doesn't exist
  if (!existsSync(MANIFEST_PATH)) {
    await saveManifest([]);
    console.log('Manifest initialized (empty).');
  }
}

// ── synthesize helpers ────────────────────────────────────────────────────

async function synthesizeAndWrite(entry, value) {
  const { synthesize } = await import('../server/ttsProvider.js');
  console.log(`  Synthesizing "${entry.key}"...`);
  const audio = await synthesize(value);
  const filePath = join(AUDIO_DIR, `${entry.slug}.mp3`);
  await mkdir(AUDIO_DIR, { recursive: true });
  await writeFile(filePath, audio);
  console.log(`  Wrote ${filePath} (${audio.length} bytes)`);
}

async function generateSingle(key) {
  const enRaw = JSON.parse(await readFile(EN_JSON_PATH, 'utf8'));
  const coachKeys = flattenKeys(enRaw, 'coach.');
  const match = coachKeys.find(k => k.key === key);

  if (!match) {
    console.error(`Key "${key}" not found in en.json coach.* namespace.`);
    process.exit(1);
  }

  if (match.value.includes('{{')) {
    console.error(`Key "${key}" is interpolated — cannot synthesize.`);
    process.exit(1);
  }

  const entries = await loadRegistry();
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

  await synthesizeAndWrite(entry, match.value);
  entry.status = 'awaiting_approval';
  entry.generated_at = new Date().toISOString();
  await saveRegistry(entries);
  console.log(`Key "${key}" → awaiting_approval.`);
}

async function generateAllNew() {
  const enRaw = JSON.parse(await readFile(EN_JSON_PATH, 'utf8'));
  const coachKeys = flattenKeys(enRaw, 'coach.');
  const keyMap = new Map(coachKeys.map(k => [k.key, k.value]));

  const entries = await loadRegistry();
  const needsAudio = entries.filter(e => e.status === 'needs_audio');

  if (needsAudio.length === 0) {
    console.log('No keys with status "needs_audio".');
    return;
  }

  console.log(`Generating audio for ${needsAudio.length} keys...`);

  let success = 0;
  let failed = 0;

  for (const entry of needsAudio) {
    const value = keyMap.get(entry.key);
    if (!value || value.includes('{{')) {
      console.log(`  SKIP "${entry.key}": ${!value ? 'key not found in en.json' : 'interpolated'}`);
      failed++;
      continue;
    }

    try {
      await synthesizeAndWrite(entry, value);
      entry.status = 'awaiting_approval';
      entry.generated_at = new Date().toISOString();
      success++;
    } catch (err) {
      console.error(`  FAIL "${entry.key}": ${err.message}`);
      failed++;
    }
  }

  await saveRegistry(entries);
  console.log(`Done: ${success} generated, ${failed} failed.`);
}

// ── Main ────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--scan-only')) {
  await scanOnly();
} else if (args.includes('--key')) {
  const idx = args.indexOf('--key');
  const key = args[idx + 1];
  if (!key) {
    console.error('--key requires a value');
    process.exit(1);
  }
  await generateSingle(key);
} else if (args.includes('--all-new')) {
  await generateAllNew();
} else {
  console.error('Usage: node generate-tts.js [--scan-only] [--key <key>] [--all-new]');
  process.exit(1);
}
