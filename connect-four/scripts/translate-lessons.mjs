#!/usr/bin/env node
// translate-lessons.mjs — offline drafting of Spanish `_es` sibling fields for lesson JSON.
//
// Design decision D1: Spanish lesson text lives in `_es` sibling fields, drafted OFFLINE by this
// script, committed to git, and HUMAN-REVIEWED before shipping. No LLM call happens at request
// time — server/lessonLoader.js#localizeLesson merges `_es` over English per field at read time.
//
// Translates ONLY these 6 field paths, and nothing else:
//   slides[].coachMessages[].text  -> text_es
//   slides[].legendItems[].label   -> label_es
//   slides[].infoProse             -> infoProse_es
//   socratic.goalPrompt            -> goalPrompt_es           (absent in most lessons — skipped)
//   socratic.messages[phase][].text -> text_es                (phase: ask|wrong1|wrong2|correct|hint)
//   confirmationChallenges[].goalPrompt -> goalPrompt_es
//
// This list is hand-synchronized with server/lessonAudio.js#collectMessages (the audio pipeline's
// shared walker). This script is a THIRD, independent walk: it drafts `_es` offline rather than
// synthesizing or protecting audio, and its locators are field-specific (`....text`) where
// collectMessages yields message objects. Adding a lesson copy field means updating BOTH.
//
// NEVER translated: `title` (i18n bundles own it via t(..., {defaultValue})), `_boardInstructions`
// (an authoring note, never rendered), or any board data (movestring/boardSpec/overlays/correctCol/
// userPerspective).
//
// Usage (from connect-four/):
//   node scripts/translate-lessons.mjs [--lesson <id>] [--dry-run] [--force] [--model <id>]
//
// Options:
//   --lesson <id>   Only translate the lesson whose file is lessons/lesson-NN-<id>.json.
//                   Default: all lessons found in lessons/.
//   --dry-run       Print proposed Spanish for each field; write NOTHING to disk.
//   --force         Retranslate fields that already have an `_es` sibling (default: skip them,
//                   so re-running is resumable/idempotent).
//   --model <id>    OpenAI model id. Default: $EXPLAIN_MODEL, falling back to $OPENAI_MODEL.
//   -h, --help      Show this help and exit 0. Does NO work: no LLM calls, no file reads/writes
//                   beyond this text.
//
// Requires OPENAI_API_KEY, loaded from connect-four/server/.env — run with
// `node --env-file=server/.env scripts/translate-lessons.mjs ...` from inside connect-four/, or
// export it another way; this script also best-effort loads server/.env itself via loadEnv.

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LESSONS_DIR = join(__dirname, '../lessons');

const HELP = `translate-lessons.mjs — offline drafting of Spanish (_es) lesson content (D1).

Draft-only: writes _es sibling fields into lesson JSON for a human to review and commit.
No LLM call happens at app request time; this script is the ONLY place that calls the LLM.

Usage (from connect-four/):
  node scripts/translate-lessons.mjs [--lesson <id>] [--dry-run] [--force] [--model <id>]

Options:
  --lesson <id>   Only translate the lesson whose file is lessons/lesson-NN-<id>.json.
                  Default: all lessons found in lessons/.
  --dry-run       Print proposed Spanish for each field; write NOTHING to disk.
  --force         Retranslate fields that already have an _es sibling (default: skip them).
  --model <id>    OpenAI model id. Default: $EXPLAIN_MODEL, falling back to $OPENAI_MODEL.
  -h, --help      Show this help and exit 0. Does NO work.

Translates ONLY: slides[].coachMessages[].text, slides[].legendItems[].label, slides[].infoProse,
socratic.goalPrompt, socratic.messages[phase][].text, confirmationChallenges[].goalPrompt. NEVER
title, _boardInstructions, or any board data (movestring/boardSpec/overlays/correctCol/
userPerspective).

Requires OPENAI_API_KEY, loaded from connect-four/server/.env.`;

// --help / -h MUST be checked before any other argument validation or work (memory
// feedback_scripts_meaningful_help; QA finding #25 re: generate_all_candidates.mjs ignoring --help).
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(HELP);
  process.exit(0);
}

function argVal(name, def) {
  const i = process.argv.indexOf(name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : def;
}

// Everything below this line only runs when --help/-h was NOT passed.
const { loadEnv } = await import('../server/scripts/reason_engine/lib/boardUtils.mjs');
const { callOpenAIChat } = await import('../server/llmChat.js');
const { SPANISH_OUTPUT_DIRECTIVE } = await import('../server/scripts/compute.mjs');

loadEnv(join(__dirname, '../server/.env'));

const lessonFilter = argVal('--lesson', null);
const dryRun = process.argv.includes('--dry-run');
const force = process.argv.includes('--force');
const model = argVal('--model', process.env.EXPLAIN_MODEL || process.env.OPENAI_MODEL);

if (!model) {
  console.error('Error: no model available (set --model, or EXPLAIN_MODEL / OPENAI_MODEL in server/.env)');
  process.exit(1);
}
if (!process.env.OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY not set (expected in connect-four/server/.env)');
  process.exit(1);
}

// ── Prompt ───────────────────────────────────────────────────────────────────
// SPANISH_OUTPUT_DIRECTIVE is imported verbatim from server/scripts/compute.mjs — the voseo /
// verde-gris rules are NOT re-authored here (a second copy would drift). It was written for the
// deep-reveal "mechanism" field context; the core rules (Rioplatense voseo, verde=P1/gris=P2,
// preserve [zone:]/[term:] tags verbatim) apply identically to lesson text, which is likewise the
// only field being written in a given call.
function buildPrompt(englishText) {
  return `You are translating a short piece of player-facing UI text for a Connect Four teaching app ("DecodeC4") from English to Spanish.
${SPANISH_OUTPUT_DIRECTIVE}

Additional rules specific to this task:
- Preserve "columna N" / "column N" references and any [term:...] / [zone:...] tags EXACTLY
  verbatim (do not translate, rename, or reformat their contents) if present in the text.
- Translate ONLY the text given below. Do not add quotes, markdown, commentary, or extra
  sentences. Return ONLY the translated Spanish text, nothing else.

English text:
"""
${englishText}
"""`;
}

async function translateField(englishText, stats) {
  try {
    const { content } = await callOpenAIChat(buildPrompt(englishText), {
      model,
      apiKey: process.env.OPENAI_API_KEY,
      endpoint: 'translate-lessons',
      userId: null,
      purpose: 'offline-lesson-translation',
      useJsonFormat: false,
    });
    const trimmed = content.trim().replace(/^"|"$/g, '');
    stats.translated++;
    return trimmed;
  } catch (err) {
    stats.failed++;
    console.error(`  FAILED: ${err.message} — text: "${englishText.slice(0, 60)}..."`);
    return null;
  }
}

// ── Field-path walk ──────────────────────────────────────────────────────────
// Visits exactly the 6 translatable field paths. Each entry is applied in place on `lesson`
// (mutating the parsed object) and reported for --dry-run printing.
//
// Kept in the SAME fixed order as server/lessonAudio.js#SOCRATIC_PHASES so locators are
// deterministic and the two hand-synchronized walks read identically.
const SOCRATIC_PHASES = ['ask', 'wrong1', 'wrong2', 'correct', 'hint'];

async function processLesson(lesson, stats, { dryRun, force }) {
  const report = [];

  async function handleField(obj, key, pathLabel) {
    const esKey = `${key}_es`;
    const english = obj[key];
    if (typeof english !== 'string' || english.length === 0) return;
    if (obj[esKey] !== undefined && !force) {
      stats.skipped++;
      report.push({ path: pathLabel, english, spanish: obj[esKey], status: 'skipped (already has _es)' });
      return;
    }
    const spanish = await translateField(english, stats);
    if (spanish === null) {
      report.push({ path: pathLabel, english, spanish: null, status: 'FAILED' });
      return;
    }
    report.push({ path: pathLabel, english, spanish, status: dryRun ? 'dry-run (not written)' : 'translated' });
    if (!dryRun) obj[esKey] = spanish;
  }

  for (let si = 0; si < (lesson.slides || []).length; si++) {
    const slide = lesson.slides[si];
    if (typeof slide.infoProse === 'string') {
      await handleField(slide, 'infoProse', `slides[${si}].infoProse`);
    }
    for (let ci = 0; ci < (slide.coachMessages || []).length; ci++) {
      await handleField(slide.coachMessages[ci], 'text', `slides[${si}].coachMessages[${ci}].text`);
    }
    for (let li = 0; li < (slide.legendItems || []).length; li++) {
      await handleField(slide.legendItems[li], 'label', `slides[${si}].legendItems[${li}].label`);
    }
  }

  if (lesson.socratic && typeof lesson.socratic === 'object') {
    if (typeof lesson.socratic.goalPrompt === 'string') {
      await handleField(lesson.socratic, 'goalPrompt', 'socratic.goalPrompt');
    }
    // lesson.socratic may be null (lesson 4), `messages` may be absent (unmigrated
    // lesson), and a phase value may be a non-array — skip rather than throw.
    const messages = lesson.socratic.messages;
    if (messages && typeof messages === 'object') {
      for (const phase of SOCRATIC_PHASES) {
        const arr = messages[phase];
        if (!Array.isArray(arr)) continue;
        for (let i = 0; i < arr.length; i++) {
          await handleField(arr[i], 'text', `socratic.messages.${phase}[${i}].text`);
        }
      }
    }
  }

  for (let ei = 0; ei < (lesson.confirmationChallenges || []).length; ei++) {
    const ch = lesson.confirmationChallenges[ei];
    if (typeof ch.goalPrompt === 'string') {
      await handleField(ch, 'goalPrompt', `confirmationChallenges[${ei}].goalPrompt`);
    }
  }

  return report;
}

// ── Main ─────────────────────────────────────────────────────────────────────
function listLessonFiles() {
  return readdirSync(LESSONS_DIR)
    .filter((f) => /^lesson-\d+-.*\.json$/.test(f))
    .sort();
}

function lessonIdFromFilename(filename) {
  // lesson-01-immediate-threat.json -> immediate-threat
  const m = filename.match(/^lesson-\d+-(.*)\.json$/);
  return m ? m[1] : null;
}

async function main() {
  let files = listLessonFiles();
  if (lessonFilter) {
    files = files.filter((f) => lessonIdFromFilename(f) === lessonFilter);
    if (files.length === 0) {
      console.error(`Error: no lesson file found for --lesson "${lessonFilter}" in ${LESSONS_DIR}`);
      process.exit(1);
    }
  }

  const stats = { translated: 0, skipped: 0, failed: 0 };

  for (const file of files) {
    const filePath = join(LESSONS_DIR, file);
    const raw = readFileSync(filePath, 'utf8');
    const lesson = JSON.parse(raw);
    console.log(`\n=== ${file} (id: ${lesson.id}) ===`);

    const report = await processLesson(lesson, stats, { dryRun, force });

    for (const row of report) {
      console.log(`  [${row.status}] ${row.path}`);
      console.log(`    EN: ${row.english}`);
      if (row.spanish !== null) console.log(`    ES: ${row.spanish}`);
    }

    if (!dryRun && report.some((r) => r.status === 'translated')) {
      // Preserve repo's existing formatting: 2-space indent, trailing newline.
      writeFileSync(filePath, JSON.stringify(lesson, null, 2) + '\n');
      console.log(`  wrote ${filePath}`);
    }
  }

  console.log(`\nSummary: translated=${stats.translated} skipped=${stats.skipped} failed=${stats.failed}${dryRun ? ' (dry-run — nothing written)' : ''}`);
  if (stats.failed > 0) process.exitCode = 1;
}

await main();
