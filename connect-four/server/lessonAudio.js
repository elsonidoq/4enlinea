/**
 * Lesson audio generation & pruning — pure-function module (mirrors
 * server/insertGameBlunder.js's extraction pattern for testability).
 *
 * Synthesizes narration for concept-slide coachMessages via server/ttsProvider.js's
 * synthesize(text) — the sole reusable TTS seam for free-text lesson content.
 * NOT the i18n-keyed coach TTS pipeline (scripts/generate-tts.js / speakCoachMessage).
 *
 * Text-hash keyed identity: identical text -> same file (no redundant re-synth);
 * changed text -> a new distinct file. The lesson JSON's `audio` field is the sole
 * source of truth — no manifest/registry/approval file (FR-013).
 *
 * Two message sources carry narratable text: concept slides
 * (lesson.slides[].coachMessages[]) and the Socratic board
 * (lesson.socratic.messages[phase][]). BOTH are walked here, via the single
 * shared collectMessages() walker — see the note on that function for why the
 * walk must not be duplicated.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { synthesize as ttsSynthesize } from './ttsProvider.js';
import { readTtsConfig } from './ttsConfig.mjs';
import { buildTtsInstructions } from './ttsInstructions.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Info log with a stable tag — matches the console.log('[admin/audio/generate] …')
 * idiom in index.js (server/logger.js only exports logError).
 * @param {string} msg
 */
const log = (msg) => console.log(`[lessons/audio] ${msg}`);

/** Directory audio files are written to / pruned from. */
export const LESSON_AUDIO_DIR = path.join(__dirname, '../public/audio/lessons');

/**
 * Deterministic short hash of message text, used as the audio filename identity.
 * @param {string} text
 * @returns {string} 16-hex-char hash
 */
export function hashMessageText(text) {
  return crypto.createHash('sha256').update(text).digest('hex').slice(0, 16);
}

/**
 * Socratic phases, in a FIXED order — never Object.keys(), so locators and log
 * output are deterministic regardless of JSON key order. Task 1b's translator
 * (scripts/translate-lessons.mjs) hand-mirrors this order; keep them in sync.
 */
export const SOCRATIC_PHASES = ['ask', 'wrong1', 'wrong2', 'correct', 'hint'];

/**
 * THE single walk over every narratable message in a lesson.
 *
 * generateLessonAudio (writes clips) and collectReferencedAudio (protects them
 * from pruning) MUST consume this same walker. When they walked the tree
 * independently they diverged — twice: once for `audio_es` (QA 2026-07-15 / D1,
 * every Spanish clip became an orphan and was deleted) and once for
 * `socratic.messages`. A message this walker does not yield is a message whose
 * audio gets generated and then pruned as an orphan on the next prune run.
 *
 * Slides are yielded before socratic, and the slide locator string is
 * byte-identical to the historical format — existing tests assert whole-array,
 * exact-order equality on `generated`/`failed[].locator`.
 *
 * @param {object} lesson
 * @returns {Array<{message: object, locator: string}>}
 */
export function collectMessages(lesson) {
  const out = [];

  const slides = Array.isArray(lesson?.slides) ? lesson.slides : [];
  for (let si = 0; si < slides.length; si++) {
    const messages = Array.isArray(slides[si]?.coachMessages) ? slides[si].coachMessages : [];
    for (let mi = 0; mi < messages.length; mi++) {
      out.push({ message: messages[mi], locator: `slides[${si}].coachMessages[${mi}]` });
    }
  }

  // lesson.socratic is null on lessons with no Socratic board (lesson 4), and
  // `messages` is absent on any lesson not yet migrated.
  const socraticMessages = lesson?.socratic?.messages;
  if (socraticMessages && typeof socraticMessages === 'object') {
    for (const phase of SOCRATIC_PHASES) {
      const arr = Array.isArray(socraticMessages[phase]) ? socraticMessages[phase] : [];
      for (let mi = 0; mi < arr.length; mi++) {
        out.push({ message: arr[mi], locator: `socratic.messages.${phase}[${mi}]` });
      }
    }
  }

  return out;
}

/**
 * Generate audio for EVERY narratable message in `lesson` that has text.
 * Mutates and returns a copy of the lesson (mutates slide message objects in
 * place on a shallow-cloned lesson so callers can inspect exactly what changed).
 *
 * Unconditional by design: the text hash keys the *filename*, but the voice,
 * prompt, speed and model live in `tts-prompt.<lang>.json` and are NOT part of
 * that hash — so a voice change is invisible to any hash comparison. This used
 * to skip a message whose `audio` already matched the hash, which meant the
 * admin "Generate audios" button could never re-voice a lesson after a prompt
 * change, and a lesson whose mp3 went missing stayed permanently silent (the
 * check never touched the filesystem). Same text -> same hash -> same path, so
 * regeneration overwrites in place and creates no orphans. The cost is one TTS
 * call per message per click, which is the point: you cannot hear a change you
 * did not synthesize.
 *
 * Covers both concept slides and socratic.messages, via collectMessages(). Skips
 * empty/whitespace text — that is "nothing to say", not a cache hit. Each message's synthesis is
 * isolated in its own try/catch: one failure leaves that message's `audio`
 * unset/unchanged and does not abort the batch.
 *
 * D1 (lesson audio i18n): `lang='es'` reads `text_es`/`audio_es` instead of
 * `text`/`audio`, and threads a Spanish accent `instructions` directive through
 * to `synthesize` — mirroring the admin coach-audio pattern at
 * server/index.js's `/api/admin/audio/generate` (readTtsConfig() ->
 * buildTtsInstructions(basePrompt, lang) -> synthesize(text, {...})). Without
 * this, lesson clips were always synthesized with no `instructions`/`voice`/
 * `speed`/`model` opts at all and came out English-accented regardless of lang.
 *
 * @param {object} lesson - full lesson object (lesson.slides[].coachMessages[] + lesson.socratic.messages[phase][])
 * @param {{ lang?: 'en'|'es', synthesize?: (text: string, opts?: object) => Promise<Buffer>, dir?: string }} [deps]
 *   `dir` overrides LESSON_AUDIO_DIR — test-only seam, defaults to production dir.
 * @returns {Promise<{ lesson: object, generated: string[], failed: Array<{locator: string, error: string}> }>}
 */
export async function generateLessonAudio(lesson, { lang = 'en', synthesize = ttsSynthesize, dir = LESSON_AUDIO_DIR } = {}) {
  const generated = [];
  const failed = [];

  const textField = lang === 'es' ? 'text_es' : 'text';
  const audioField = lang === 'es' ? 'audio_es' : 'audio';

  const { prompt: basePrompt, speed, voice, model } = readTtsConfig(lang);
  const instructions = buildTtsInstructions(basePrompt, lang);

  // Logged so a no-op click is diagnosable from the server output alone: `lang`
  // shows whether the admin selector actually sent 'es' (it defaults to 'en' on
  // every load), and the voice/instructions show which tts-prompt.<lang>.json
  // was picked up after a config edit.
  log(`lesson=${lesson?.id ?? '?'} lang=${lang} field=${textField}->${audioField} ` +
      `voice=${voice} speed=${speed} model=${model} instructionsChars=${instructions?.length ?? 0}`);

  for (const { message, locator } of collectMessages(lesson)) {
    const text = message[textField];

    if (typeof text !== 'string' || text.trim() === '') {
      // Not a cache hit — there is genuinely nothing to say in this language.
      log(`  ${locator} SKIP — no ${textField} (untranslated)`);
      continue;
    }

    const hash = hashMessageText(text);
    const expectedBasename = `${hash}.mp3`;

    try {
      log(`  ${locator} synthesizing ${text.length} chars -> ${expectedBasename}`);
      const buffer = await synthesize(text, { instructions: instructions || undefined, speed, voice, model });
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, expectedBasename), buffer);
      message[audioField] = `/audio/lessons/${expectedBasename}`;
      generated.push(locator);
      log(`  ${locator} wrote ${expectedBasename} (${buffer.length} bytes)`);
    } catch (e) {
      failed.push({ locator, error: e.message });
      log(`  ${locator} FAILED — ${e.message}`);
    }
  }

  log(`lesson=${lesson?.id ?? '?'} lang=${lang} done: ${generated.length} generated, ${failed.length} failed`);

  return { lesson, generated, failed };
}

/**
 * Collect the basenames of every audio clip referenced by any message across
 * `allLessons` — every message collectMessages() yields (concept slides AND
 * socratic.messages), and for each, BOTH `audio` (English) and `audio_es`
 * (Spanish). Used by pruneOrphanedLessonAudio.
 *
 * QA 2026-07-15 / D1: this must see both fields, or every Spanish clip is an
 * orphan on the next prune-audio run and gets deleted. It must likewise walk
 * exactly what generateLessonAudio walks — hence the shared collectMessages().
 *
 * @param {object[]} allLessons - full lesson objects (e.g. getLessonsAll())
 * @returns {Set<string>} referenced mp3 basenames
 */
export function collectReferencedAudio(allLessons) {
  const referenced = new Set();
  for (const lesson of allLessons) {
    for (const { message } of collectMessages(lesson)) {
      for (const p of [message.audio, message.audio_es]) {
        if (typeof p === 'string' && p.length > 0) referenced.add(path.basename(p));
      }
    }
  }
  return referenced;
}

/**
 * Delete any *.mp3 under LESSON_AUDIO_DIR not referenced by any message across
 * `allLessons` (see collectReferencedAudio).
 *
 * @param {object[]} allLessons - full lesson objects (e.g. getLessonsAll())
 * @param {string} [dir] - overrides LESSON_AUDIO_DIR — test-only seam.
 * @returns {string[]} filenames deleted
 */
export function pruneOrphanedLessonAudio(allLessons, dir = LESSON_AUDIO_DIR) {
  if (!fs.existsSync(dir)) return [];

  const referenced = collectReferencedAudio(allLessons);

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.mp3'));
  const deleted = [];
  for (const file of files) {
    if (!referenced.has(file)) {
      fs.unlinkSync(path.join(dir, file));
      deleted.push(file);
    }
  }
  return deleted;
}
