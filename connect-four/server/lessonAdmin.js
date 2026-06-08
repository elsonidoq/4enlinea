import fs from 'node:fs';
import path from 'node:path';

export function lessonFilePath(dir, lesson) {
  const prefix = String(lesson.order).padStart(2, '0');
  return path.join(dir, `lesson-${prefix}-${lesson.id}.json`);
}

export function findLessonFile(dir, id) {
  const files = fs.readdirSync(dir);
  return files.find(f => new RegExp(`^lesson-\\d+-${id}\\.json$`).test(f)) ?? null;
}

/**
 * Write lesson to disk. If oldId is provided and differs from lesson.id,
 * the old file is deleted first (handles rename).
 */
export function saveLessonFile(dir, lesson, oldId = null) {
  if (oldId && oldId !== lesson.id) {
    const oldFile = findLessonFile(dir, oldId);
    if (oldFile) fs.unlinkSync(path.join(dir, oldFile));
  }
  fs.writeFileSync(lessonFilePath(dir, lesson), JSON.stringify(lesson, null, 2), 'utf8');
}

export function deleteLessonFile(dir, id) {
  const filename = findLessonFile(dir, id);
  if (filename) fs.unlinkSync(path.join(dir, filename));
}
