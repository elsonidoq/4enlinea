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
let _dir = '';

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
export function validateLesson(lesson) {
  if (typeof lesson.id !== 'string') return 'missing or invalid field: id (must be string)';
  if (typeof lesson.title !== 'string') return 'missing or invalid field: title (must be string)';
  if (typeof lesson.free !== 'boolean') return 'missing or invalid field: free (must be boolean)';
  // 'red'/'yellow' kept for historical reasons: internal player-1/player-2 tokens,
  // not display colors. 'red' renders as a GREEN disc, 'yellow' as a GRAY disc.
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

  // Validate confirmationChallenges if present
  if (lesson.confirmationChallenges !== undefined && lesson.confirmationChallenges !== null) {
    if (!Array.isArray(lesson.confirmationChallenges)) {
      return 'invalid field: confirmationChallenges (must be array or null)';
    }
    for (let i = 0; i < lesson.confirmationChallenges.length; i++) {
      const ch = lesson.confirmationChallenges[i];
      if (typeof ch.moveString !== 'string' || !/^[0-6]*$/.test(ch.moveString)) {
        return `confirmationChallenges[${i}].moveString must be a string of digits 0-6`;
      }
      if (ch.correctCol !== undefined && ch.correctCol !== null) {
        if (!Number.isInteger(ch.correctCol) || ch.correctCol < 0 || ch.correctCol > 6) {
          return `confirmationChallenges[${i}].correctCol must be an integer 0-6 or null`;
        }
      }
      if (ch.userPlayer !== 1 && ch.userPlayer !== 2) {
        return `confirmationChallenges[${i}].userPlayer must be 1 or 2`;
      }
      if (ch.puzzleId !== undefined && typeof ch.puzzleId !== 'string') {
        return `confirmationChallenges[${i}].puzzleId must be a string`;
      }
      if (ch.interactionMode !== undefined && !['single_move', 'sequence'].includes(ch.interactionMode)) {
        return `confirmationChallenges[${i}].interactionMode must be 'single_move' or 'sequence'`;
      }
    }
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
  _dir = dir;
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

export function reloadLessons() {
  if (_dir) loadLessons(_dir);
}

export function getLessonsAll() {
  return [..._lessons];
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
 * Applies backward-compat transformations:
 * - If confirmationChallenges is missing but legacy fields exist, sets explicit null.
 * - Derives confirmationCount from confirmationChallenges.length when non-empty.
 * @param {string} id
 * @returns {Object|null}
 */
export function getLesson(id) {
  const lesson = _lessons.find(l => l.id === id) ?? null;
  if (!lesson) return null;

  // Backward compat: explicit null signals "use legacy draw"
  if (lesson.confirmationChallenges === undefined && lesson.confirmationCategory != null && lesson.confirmationCount > 0) {
    return { ...lesson, confirmationChallenges: null };
  }

  // Derive confirmationCount from curated challenges when present
  if (Array.isArray(lesson.confirmationChallenges) && lesson.confirmationChallenges.length > 0) {
    return { ...lesson, confirmationCount: lesson.confirmationChallenges.length };
  }

  return lesson;
}
