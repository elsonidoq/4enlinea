#!/usr/bin/env node
/**
 * generate-lesson-audio.mjs — paced, rate-limit-aware CLI for corpus-wide
 * LESSON audio regeneration (spec 051 US5, FR-031, OI-78).
 *
 * The admin lesson-audio path is per-lesson, per-language:
 *   POST /api/admin/lessons/:id/generate-audio  { lang, locator? }
 * A full corpus pass is 15 lessons x 2 languages = 30 separate HTTP requests
 * against the shared 120 req/min limiter (server/index.js's `app.use('/api/',
 * makeLimit(120))`). Firing them back-to-back (e.g. a shell for-loop of curls)
 * trips that limiter almost immediately and fails most of the run identically
 * — this script paces requests, retries a 429 honoring `RateLimit-Reset`, and
 * reports exactly which lessons/langs succeeded vs. remain, so an interrupted
 * run is diagnosable and resumable (never a silent gap).
 *
 * This does NOT replace the admin `generate-all scope:'all'` endpoint (that
 * covers the i18n-keyed COACH audio pipeline, a separate system — see
 * docs/architecture/coach-audio-conventions.md). This script is LESSON audio
 * only (server/lessonAudio.js's slides[].coachMessages / infoProse /
 * socratic.messages pipeline).
 *
 * Run with --help for usage.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LESSONS_DIR = join(__dirname, '../lessons');

const SUPPORTED_LOCALES = ['en', 'es'];

/** Every lesson id found in lessons/*.json, in filename order. */
function discoverAllLessonIds() {
  return readdirSync(LESSONS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const raw = JSON.parse(readFileSync(join(LESSONS_DIR, f), 'utf8'));
      return raw.id;
    })
    .filter((id) => typeof id === 'string' && id.length > 0);
}

/**
 * Base URL for the local admin API. Honors $API_PORT (set by
 * `eval "$(./worktree-ports.sh)"` — see docs/architecture/worktree-conventions.md),
 * falling back to the legacy 3001 for the main checkout / no-worktree case.
 * requireLocalhost (server/index.js) checks the request's socket address, not
 * a header, so no auth token is needed — only that this runs on the same
 * machine as the server.
 */
function baseUrl() {
  const port = process.env.API_PORT || 3001;
  return `http://localhost:${port}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Parses --lesson args: repeatable (--lesson a --lesson b) and/or
 * comma-separated (--lesson a,b,c) both work; values are merged and deduped,
 * preserving first-seen order.
 */
function getLessonArg(argv) {
  const ids = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--lesson') {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) {
        console.error('--lesson requires a value');
        process.exit(1);
      }
      for (const part of value.split(',')) {
        const trimmed = part.trim();
        if (trimmed && !ids.includes(trimmed)) ids.push(trimmed);
      }
    }
  }
  return ids;
}

function getLangArg(argv) {
  const idx = argv.indexOf('--lang');
  if (idx === -1) return 'all';
  const value = argv[idx + 1];
  if (!value) {
    console.error('--lang requires a value');
    process.exit(1);
  }
  if (value !== 'all' && !SUPPORTED_LOCALES.includes(value)) {
    console.error(`--lang must be one of: en, es, all (got: ${value})`);
    process.exit(1);
  }
  return value;
}

function getNumberArg(argv, flag, fallback) {
  const idx = argv.indexOf(flag);
  if (idx === -1) return fallback;
  const value = Number(argv[idx + 1]);
  if (!Number.isFinite(value) || value < 0) {
    console.error(`${flag} requires a non-negative number`);
    process.exit(1);
  }
  return value;
}

/**
 * POSTs one generate-audio request, retrying on 429 up to `maxRetries` times.
 *
 * Landmine (the shared limiter's 429 body is PLAIN TEXT, not JSON): always
 * read via `.text()` first, then `JSON.parse` inside a try/catch — a bare
 * `.json()` call throws an opaque "Unexpected token" error that hides the
 * real 429 and gives no diagnostic.
 *
 * Honors the `RateLimit-Reset` response header (seconds until the limiter's
 * window resets, per express-rate-limit's standardHeaders draft-7 shape) —
 * waits that long (plus a small buffer) before retrying, rather than a fixed
 * backoff that might retry into the same still-tripped window.
 *
 * @returns {Promise<{ ok: boolean, status: number, body: any, error?: string }>}
 */
async function postGenerateAudio(lessonId, lang, { maxRetries = 5 } = {}) {
  const url = `${baseUrl()}/api/admin/lessons/${encodeURIComponent(lessonId)}/generate-audio`;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang }),
      });
    } catch (networkErr) {
      return { ok: false, status: 0, body: null, error: `network error: ${networkErr.message}` };
    }

    if (response.status === 429) {
      const resetHeader = response.headers.get('RateLimit-Reset');
      const resetSeconds = Number(resetHeader);
      const waitMs = Number.isFinite(resetSeconds) && resetSeconds > 0
        ? resetSeconds * 1000 + 250 // small buffer past the exact reset instant
        : 5000; // header missing/unparseable — conservative fallback, never crash

      // Drain the body (plain text) so the connection is cleanly released; never
      // call .json() on it directly.
      const text = await response.text().catch(() => '');
      console.log(`  [${lessonId}/${lang}] 429 rate-limited (attempt ${attempt + 1}/${maxRetries + 1}) — ` +
        `waiting ${Math.round(waitMs / 1000)}s (RateLimit-Reset=${resetHeader ?? 'missing'}) body="${text.slice(0, 120)}"`);

      if (attempt === maxRetries) {
        return { ok: false, status: 429, body: null, error: `rate-limited after ${maxRetries + 1} attempts` };
      }
      await sleep(waitMs);
      continue;
    }

    const text = await response.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      return { ok: false, status: response.status, body: null, error: `non-JSON response body: ${text.slice(0, 200)}` };
    }

    if (!response.ok) {
      return { ok: false, status: response.status, body, error: body?.error || `HTTP ${response.status}` };
    }

    return { ok: true, status: response.status, body };
  }

  // Unreachable, but keeps the return type honest.
  return { ok: false, status: 0, body: null, error: 'exhausted retries' };
}

function printHelp() {
  console.log(`
generate-lesson-audio.mjs — paced, rate-limit-aware corpus regeneration for
LESSON audio (spec 051 US5, FR-031, OI-78).

Purpose:
  Calls POST /api/admin/lessons/:id/generate-audio once per (lesson, lang)
  pair, pacing requests so a full 15-lesson x 2-language pass (30 requests)
  never trips the shared 120 req/min API rate limiter. Retries a 429 by
  honoring the RateLimit-Reset header rather than a blind fixed delay.
  Reports exactly which (lesson, lang) pairs succeeded and which remain, so
  an interrupted run (network failure, ctrl-C, process killed) is diagnosable
  and safely re-runnable — re-running only re-synthesizes what you ask for.

  This is LESSON audio only (server/lessonAudio.js's coachMessages/infoProse/
  socratic.messages pipeline) — NOT the i18n-keyed COACH audio pipeline
  (scripts/generate-tts.js / the admin generate-all endpoint). It does not add
  a bulk re-synthesize-approved command; that stays solely in the admin
  generate-all scope:'all' endpoint for coach audio.

Usage:
  node scripts/generate-lesson-audio.mjs [options]

Options:
  --lesson <id>       Lesson id to regenerate. Repeatable (--lesson a --lesson b)
                       and/or comma-separated (--lesson a,b). Default: all 15
                       lessons found under lessons/*.json.
  --lang <en|es|all>  Language(s) to regenerate. Default: all.
  --delay-ms <n>      Milliseconds to wait between requests. Default: 700
                       (mid-range of the 500ms-1s pacing window; 30 requests
                       at 700ms ≈ 21s, well under the 120/min=1 req/500ms cap).
  --max-retries <n>   Max 429 retries per request before giving up on that
                       (lesson, lang) pair and moving on. Default: 5.
  --help, -h          This message.

Defaults summary:
  lessons = all 15 (discovered from lessons/*.json)
  lang    = all (en + es)
  delay   = 700ms between requests
  retries = 5 (with RateLimit-Reset-aware backoff on 429)

Requires the local dev API server running (see docs/architecture/worktree-conventions.md
— eval "$(./worktree-ports.sh)" sets $API_PORT before you start it). Reads $API_PORT,
falls back to 3001.

Examples:
  node scripts/generate-lesson-audio.mjs --help
  node scripts/generate-lesson-audio.mjs --lesson immediate-threat --lang es
  node scripts/generate-lesson-audio.mjs --lesson immediate-threat,claimeven --lang all
  node scripts/generate-lesson-audio.mjs                       # full corpus, both langs
`.trim());
}

function isMainModule() {
  return process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
}

async function main(argv) {
  // --help/-h exits 0 BEFORE any argument validation — even with no other
  // args, even if other flags are malformed.
  if (argv.includes('--help') || argv.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  const explicitLessons = getLessonArg(argv);
  const lessonIds = explicitLessons.length > 0 ? explicitLessons : discoverAllLessonIds();
  const langArg = getLangArg(argv);
  const langs = langArg === 'all' ? SUPPORTED_LOCALES : [langArg];
  const delayMs = getNumberArg(argv, '--delay-ms', 700);
  const maxRetries = getNumberArg(argv, '--max-retries', 5);

  if (lessonIds.length === 0) {
    console.error('No lessons to process (discovered 0 under lessons/*.json and none passed via --lesson).');
    process.exit(1);
  }

  const jobs = [];
  for (const lessonId of lessonIds) {
    for (const lang of langs) jobs.push({ lessonId, lang });
  }

  console.log(`generate-lesson-audio: ${jobs.length} job(s) — ${lessonIds.length} lesson(s) x ${langs.length} lang(s), ` +
    `delay=${delayMs}ms, maxRetries=${maxRetries}, base=${baseUrl()}`);

  const succeeded = [];
  const failed = [];

  for (let i = 0; i < jobs.length; i++) {
    const { lessonId, lang } = jobs[i];
    process.stdout.write(`[${i + 1}/${jobs.length}] ${lessonId} (${lang})... `);
    const result = await postGenerateAudio(lessonId, lang, { maxRetries });

    if (result.ok) {
      const gen = result.body?.generated?.length ?? 0;
      const fail = result.body?.failed?.length ?? 0;
      console.log(`ok — generated=${gen} failed=${fail}`);
      succeeded.push({ lessonId, lang, generated: gen, failedMessages: fail });
    } else {
      console.log(`FAILED — ${result.error}`);
      failed.push({ lessonId, lang, error: result.error });
    }

    // Pace requests — skip the delay after the very last job.
    if (i < jobs.length - 1) await sleep(delayMs);
  }

  console.log('\n── Summary ──');
  console.log(`Succeeded: ${succeeded.length}/${jobs.length}`);
  if (failed.length > 0) {
    console.log(`Failed: ${failed.length}/${jobs.length} — never a silent gap, listed below:`);
    for (const f of failed) console.log(`  - ${f.lessonId} (${f.lang}): ${f.error}`);
    console.log('\nRe-run with the same flags, or target just the failed ones with --lesson <id> --lang <lang>.');
  }

  process.exit(failed.length > 0 ? 1 : 0);
}

if (isMainModule()) {
  await main(process.argv.slice(2));
}

export { discoverAllLessonIds, getLessonArg, getLangArg, getNumberArg, baseUrl };
