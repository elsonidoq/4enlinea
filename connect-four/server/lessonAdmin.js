import fs from 'node:fs';
import path from 'node:path';
import { computeWindowCounts } from './windowCounts.js';

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
 *
 * `slides[].windowCounts` is a DERIVED CACHE, never authored: it is recomputed here
 * from the slide's movestring on every write, so editing a board in the admin editor
 * refreshes it automatically. Slides without `showWindowCounts` have it stripped.
 */
export function saveLessonFile(dir, lesson, oldId = null) {
  if (oldId && oldId !== lesson.id) {
    const oldFile = findLessonFile(dir, oldId);
    if (oldFile) fs.unlinkSync(path.join(dir, oldFile));
  }
  const stamped = {
    ...lesson,
    slides: (lesson.slides ?? []).map(slide => {
      const { windowCounts: _stale, ...rest } = slide;
      return slide.showWindowCounts === true
        ? { ...rest, windowCounts: computeWindowCounts(slide.movestring ?? '', lesson.userPerspective) }
        : rest;
    }),
  };
  fs.writeFileSync(lessonFilePath(dir, stamped), JSON.stringify(stamped, null, 2) + '\n', 'utf8');
}

export function deleteLessonFile(dir, id) {
  const filename = findLessonFile(dir, id);
  if (filename) fs.unlinkSync(path.join(dir, filename));
}
