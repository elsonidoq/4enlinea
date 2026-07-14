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
 * @param {object} lesson - full lesson object (lesson.slides[].coachMessages[])
 * @param {{ synthesize?: (text: string) => Promise<Buffer>, dir?: string }} [deps]
 *   `dir` overrides LESSON_AUDIO_DIR — test-only seam, defaults to production dir.
 * @returns {Promise<{ lesson: object, generated: string[], failed: Array<{locator: string, error: string}> }>}
 */
export async function generateLessonAudio(lesson, { synthesize = ttsSynthesize, dir = LESSON_AUDIO_DIR } = {}) {
  const generated = [];
  const failed = [];

  const slides = Array.isArray(lesson.slides) ? lesson.slides : [];

  for (let si = 0; si < slides.length; si++) {
    const slide = slides[si];
    const messages = Array.isArray(slide.coachMessages) ? slide.coachMessages : [];

    for (let mi = 0; mi < messages.length; mi++) {
      const message = messages[mi];
      const locator = `slides[${si}].coachMessages[${mi}]`;
      const text = message.text;

      if (typeof text !== 'string' || text.trim() === '') continue;

      const hash = hashMessageText(text);
      const expectedBasename = `${hash}.mp3`;
      const currentBasename = message.audio ? path.basename(message.audio) : null;

      if (currentBasename === expectedBasename) continue; // already current — skip

      try {
        const buffer = await synthesize(text);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, expectedBasename), buffer);
        message.audio = `/audio/lessons/${expectedBasename}`;
        generated.push(locator);
      } catch (e) {
        failed.push({ locator, error: e.message });
      }
    }
  }

  return { lesson, generated, failed };
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

  const referenced = new Set();
  for (const lesson of allLessons) {
    const slides = Array.isArray(lesson.slides) ? lesson.slides : [];
    for (const slide of slides) {
      const messages = Array.isArray(slide.coachMessages) ? slide.coachMessages : [];
      for (const message of messages) {
        if (message.audio) referenced.add(path.basename(message.audio));
      }
    }
  }

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
