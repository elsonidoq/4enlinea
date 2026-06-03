/**
 * Lesson loader — reads lesson JSON files from the lessons/ directory at startup.
 *
 * Files must match the pattern lesson-NN-*.json (e.g. lesson-05-claimeven.json).
 * The numeric prefix determines the display order.
 *
 * Exported API:
 *   loadLessons(dir)  — load + validate + cache all matching files
 *   getLessons()      — returns [{id, title, order, free}] sorted ascending
 *   getLesson(id)     — returns full lesson object or null
 */

import fs from 'node:fs';
import path from 'node:path';

/** @type {Array<Object>} */
let _lessons = [];

/**
 * Validate that boardSpec arrays in slides and socratic have exactly 7 elements.
 * Returns an error string if invalid, or null if valid.
 */
function validateBoardSpecs(lesson) {
  for (let i = 0; i < lesson.slides.length; i++) {
    const slide = lesson.slides[i];
    if (slide.boardSpec !== undefined) {
      if (!Array.isArray(slide.boardSpec) || slide.boardSpec.length !== 7) {
        return `slides[${i}].boardSpec must be an array of exactly 7 elements`;
      }
    }
  }
  if (lesson.socratic && lesson.socratic.boardSpec !== undefined) {
    if (!Array.isArray(lesson.socratic.boardSpec) || lesson.socratic.boardSpec.length !== 7) {
      return `socratic.boardSpec must be an array of exactly 7 elements`;
    }
  }
  return null;
}

/**
 * Validate required top-level fields on a lesson object.
 * Returns an error string if invalid, or null if valid.
 */
function validateLesson(lesson) {
  if (typeof lesson.id !== 'string') return 'missing or invalid field: id (must be string)';
  if (typeof lesson.title !== 'string') return 'missing or invalid field: title (must be string)';
  if (typeof lesson.free !== 'boolean') return 'missing or invalid field: free (must be boolean)';
  if (lesson.userPerspective !== 'red' && lesson.userPerspective !== 'yellow') {
    return 'missing or invalid field: userPerspective (must be "red" or "yellow")';
  }
  if (!Array.isArray(lesson.slides) || lesson.slides.length === 0) {
    return 'missing or invalid field: slides (must be non-empty array)';
  }
  if (lesson.socratic !== null && (typeof lesson.socratic !== 'object' || Array.isArray(lesson.socratic))) {
    return 'invalid field: socratic (must be object or null)';
  }
  if (lesson.confirmationCategory !== null && typeof lesson.confirmationCategory !== 'string') {
    return 'invalid field: confirmationCategory (must be string or null)';
  }
  if (!Number.isInteger(lesson.confirmationCount) || lesson.confirmationCount < 0) {
    return 'invalid field: confirmationCount (must be integer >= 0)';
  }

  const boardSpecErr = validateBoardSpecs(lesson);
  if (boardSpecErr) return boardSpecErr;

  return null;
}

/**
 * Load all lesson-NN-*.json files from dir, validate, and cache them.
 * Files failing validation are logged and excluded; never throws.
 *
 * @param {string} dir  Absolute path to the lessons directory
 */
export function loadLessons(dir) {
  _lessons = [];

  if (!fs.existsSync(dir)) {
    console.error(`[lessonLoader] lessons directory does not exist: ${dir}`);
    return;
  }

  let files;
  try {
    files = fs.readdirSync(dir);
  } catch (err) {
    console.error(`[lessonLoader] failed to read lessons directory: ${err.message}`);
    return;
  }

  const lessonFiles = files
    .filter(f => /^lesson-\d+-.*\.json$/.test(f))
    .sort();

  for (const filename of lessonFiles) {
    const filePath = path.join(dir, filename);
    let lesson;
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      lesson = JSON.parse(raw);
    } catch (err) {
      console.error(`[lessonLoader] failed to parse ${filename}: ${err.message}`);
      continue;
    }

    const validationErr = validateLesson(lesson);
    if (validationErr) {
      console.error(`[lessonLoader] invalid lesson file ${filename}: ${validationErr}`);
      continue;
    }

    // Extract numeric prefix for ordering
    const orderMatch = filename.match(/^lesson-(\d+)-/);
    const order = orderMatch ? parseInt(orderMatch[1], 10) : 0;

    _lessons.push({ ...lesson, order });
  }

  _lessons.sort((a, b) => a.order - b.order);
}

/**
 * Returns a summary list of all loaded lessons, sorted ascending by order.
 * @returns {Array<{id: string, title: string, order: number, free: boolean}>}
 */
export function getLessons() {
  return _lessons.map(({ id, title, order, free }) => ({ id, title, order, free }));
}

/**
 * Returns the full lesson object for the given id, or null if not found.
 * @param {string} id
 * @returns {Object|null}
 */
export function getLesson(id) {
  return _lessons.find(l => l.id === id) ?? null;
}
