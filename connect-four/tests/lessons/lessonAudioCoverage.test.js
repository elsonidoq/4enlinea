// Lesson audio coverage + prune-parity regression tests — spec 051 (Epic 5), US1.
//
// T003 (FR-001): walks every lesson on disk via the SINGLE production
// message-walker, collectMessages() (server/lessonAudio.js) — never a
// hand-maintained list of field names — and asserts, for every entry with
// non-empty text in a given language, that its audio field is populated AND
// that the file it points to actually exists on disk.
//
// T004 (FR-002, research.md R10): a non-destructive prune-parity check.
// Computes the referenced-audio set the SAME way generateLessonAudio/
// pruneOrphanedLessonAudio would (collectReferencedAudio(getLessonsAll()))
// and compares it against what's actually on disk in public/audio/lessons/,
// asserting the two agree (zero orphans) via assert.deepEqual on sorted
// arrays. This deliberately never calls the destructive
// pruneOrphanedLessonAudio against the real directory — a stale clip in that
// directory would otherwise be silently deleted by the test suite itself.

import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectMessages, collectReferencedAudio, LESSON_AUDIO_DIR } from '../../server/lessonAudio.js';
import { loadLessons, getLessonsAll } from '../../server/lessonLoader.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LESSONS_DIR = path.join(__dirname, '../../lessons');
const PUBLIC_DIR = path.join(__dirname, '../../public');

before(() => {
  loadLessons(LESSONS_DIR);
});

test('T003/FR-001: every narratable lesson message has a populated, on-disk audio file for every language it has text in', () => {
  const lessons = fs.readdirSync(LESSONS_DIR)
    .filter((f) => /^lesson-\d+-.*\.json$/.test(f))
    .map((f) => JSON.parse(fs.readFileSync(path.join(LESSONS_DIR, f), 'utf8')));

  assert.ok(lessons.length > 0, 'expected at least one lesson on disk');

  const failures = [];
  let checked = 0;

  for (const lesson of lessons) {
    for (const { message, locator, textKey, audioKey } of collectMessages(lesson)) {
      for (const suffix of ['', '_es']) {
        const text = message[`${textKey}${suffix}`];
        if (typeof text !== 'string' || text.trim() === '') continue; // "nothing to say" — not a coverage failure

        checked++;
        const audio = message[`${audioKey}${suffix}`];
        if (!audio) {
          failures.push(`${lesson.id} ${locator}${suffix}: MISSING audio field`);
          continue;
        }
        const onDisk = fs.existsSync(path.join(PUBLIC_DIR, audio));
        if (!onDisk) {
          failures.push(`${lesson.id} ${locator}${suffix}: audio field "${audio}" points to a file NOT on disk`);
        }
      }
    }
  }

  assert.ok(checked > 0, 'expected at least one narratable message with text across all lessons');
  assert.deepEqual(failures, [], `lesson audio coverage failures (${failures.length}):\n${failures.join('\n')}`);
});

test('T004/FR-002 (research.md R10): referenced lesson audio and on-disk lesson audio agree — zero orphans (non-destructive prune-parity check)', () => {
  const referenced = collectReferencedAudio(getLessonsAll());
  const disk = new Set(fs.readdirSync(LESSON_AUDIO_DIR).filter((f) => f.endsWith('.mp3')));

  const referencedSorted = [...referenced].sort();
  const diskSorted = [...disk].sort();

  // Assert set-equality via sorted-array deepEqual, per R10 — never call the
  // destructive pruneOrphanedLessonAudio against the real directory here.
  assert.deepEqual(diskSorted, referencedSorted,
    `orphan/coverage mismatch — disk has ${diskSorted.length} files, ${referencedSorted.length} referenced;\n` +
    `orphaned (on disk, not referenced): ${diskSorted.filter((f) => !referenced.has(f)).join(', ') || '(none)'}\n` +
    `missing (referenced, not on disk): ${referencedSorted.filter((f) => !disk.has(f)).join(', ') || '(none)'}`);
});
