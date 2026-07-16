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
 * Only *concept* slides (lesson.slides[]) carry coachMessages[]. lesson.socratic
 * never has coachMessages and must never be touched here.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { synthesize as ttsSynthesize } from './ttsProvider.js';
import { readTtsConfig } from './ttsConfig.mjs';
import { buildTtsInstructions } from './ttsInstructions.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
 * Generate audio for every concept-slide coachMessage in `lesson` whose current
 * `audio` does not already match hashMessageText(text) + '.mp3'. Mutates and
 * returns a copy of the lesson (mutates slide message objects in place on a
 * shallow-cloned lesson so callers can inspect exactly what changed).
 *
 * Never touches lesson.socratic (no coachMessages there). Skips empty/whitespace
 * text. Each message's synthesis is isolated in its own try/catch: one failure
 * leaves that message's `audio` unset/unchanged and does not abort the batch.
 *
 * D1 (lesson audio i18n): `lang='es'` reads `text_es`/`audio_es` instead of
 * `text`/`audio`, and threads a Spanish accent `instructions` directive through
 * to `synthesize` — mirroring the admin coach-audio pattern at
 * server/index.js's `/api/admin/audio/generate` (readTtsConfig() ->
 * buildTtsInstructions(basePrompt, lang) -> synthesize(text, {...})). Without
 * this, lesson clips were always synthesized with no `instructions`/`voice`/
 * `speed`/`model` opts at all and came out English-accented regardless of lang.
 *
 * @param {object} lesson - full lesson object (lesson.slides[].coachMessages[])
 * @param {{ lang?: 'en'|'es', synthesize?: (text: string, opts?: object) => Promise<Buffer>, dir?: string }} [deps]
 *   `dir` overrides LESSON_AUDIO_DIR — test-only seam, defaults to production dir.
 * @returns {Promise<{ lesson: object, generated: string[], failed: Array<{locator: string, error: string}> }>}
 */
export async function generateLessonAudio(lesson, { lang = 'en', synthesize = ttsSynthesize, dir = LESSON_AUDIO_DIR } = {}) {
  const generated = [];
  const failed = [];

  const textField = lang === 'es' ? 'text_es' : 'text';
  const audioField = lang === 'es' ? 'audio_es' : 'audio';

  const { prompt: basePrompt, speed, voice, model } = readTtsConfig();
  const instructions = buildTtsInstructions(basePrompt, lang);

  const slides = Array.isArray(lesson.slides) ? lesson.slides : [];

  for (let si = 0; si < slides.length; si++) {
    const slide = slides[si];
    const messages = Array.isArray(slide.coachMessages) ? slide.coachMessages : [];

    for (let mi = 0; mi < messages.length; mi++) {
      const message = messages[mi];
      const locator = `slides[${si}].coachMessages[${mi}]`;
      const text = message[textField];

      if (typeof text !== 'string' || text.trim() === '') continue; // empty/untranslated — generates nothing

      const hash = hashMessageText(text);
      const expectedBasename = `${hash}.mp3`;
      const currentBasename = message[audioField] ? path.basename(message[audioField]) : null;

      if (currentBasename === expectedBasename) continue; // already current — skip

      try {
        const buffer = await synthesize(text, { instructions: instructions || undefined, speed, voice, model });
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, expectedBasename), buffer);
        message[audioField] = `/audio/lessons/${expectedBasename}`;
        generated.push(locator);
      } catch (e) {
        failed.push({ locator, error: e.message });
      }
    }
  }

  return { lesson, generated, failed };
}

/**
 * Collect the basenames of every audio clip referenced by any lesson/slide/
 * coachMessage across `allLessons` — BOTH `audio` (English) and `audio_es`
 * (Spanish). Used by pruneOrphanedLessonAudio.
 *
 * QA 2026-07-15 / D1: this must see both fields, or every Spanish clip is an
 * orphan on the next prune-audio run and gets deleted.
 *
 * @param {object[]} allLessons - full lesson objects (e.g. getLessonsAll())
 * @returns {Set<string>} referenced mp3 basenames
 */
export function collectReferencedAudio(allLessons) {
  const referenced = new Set();
  for (const lesson of allLessons) {
    const slides = Array.isArray(lesson.slides) ? lesson.slides : [];
    for (const slide of slides) {
      const messages = Array.isArray(slide.coachMessages) ? slide.coachMessages : [];
      for (const message of messages) {
        for (const p of [message.audio, message.audio_es]) {
          if (typeof p === 'string' && p.length > 0) referenced.add(path.basename(p));
        }
      }
    }
  }
  return referenced;
}

/**
 * Delete any *.mp3 under LESSON_AUDIO_DIR not referenced by any lesson/slide/
 * coachMessage across `allLessons`.
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
