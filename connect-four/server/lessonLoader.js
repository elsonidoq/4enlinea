/**
 * Lesson loader — reads lesson JSON files from the lessons/ directory at startup.
 *
 * Files must match the pattern lesson-NN-*.json (e.g. lesson-08-claimeven.json).
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
  // socratic.messages: phase -> array of coachMessage-shaped objects. Deliberately
  // permissive about ABSENT phases — the loader excludes an invalid file entirely
  // (console.error + continue), so an over-strict rule silently removes a lesson
  // from the app. Only shapes that are actually present are checked.
  if (lesson.socratic && lesson.socratic.messages !== undefined) {
    const msgs = lesson.socratic.messages;
    if (typeof msgs !== 'object' || msgs === null || Array.isArray(msgs)) {
      return 'invalid field: socratic.messages (must be an object)';
    }
    for (const phase of Object.keys(msgs)) {
      const arr = msgs[phase];
      if (!Array.isArray(arr)) {
        return `socratic.messages.${phase} must be an array`;
      }
      for (let i = 0; i < arr.length; i++) {
        const m = arr[i];
        if (typeof m !== 'object' || m === null || Array.isArray(m)) {
          return `socratic.messages.${phase}[${i}] must be an object`;
        }
        if (typeof m.text !== 'string') {
          return `socratic.messages.${phase}[${i}].text must be a string`;
        }
      }
    }
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

// QA 2026-07-15 finding #2 / decision D1. Spanish lesson text lives in `_es` sibling
// fields inside the lesson JSON. Merge is PER FIELD: a missing `_es` falls back to
// English so a partial translation degrades gracefully instead of blanking a slide.
// `title` is deliberately excluded — `lesson.<id>.title` in en/es.json already owns it
// via t(..., {defaultValue: lesson.title}), and a title_es would silently lose to it.
const LOCALIZABLE_SUFFIX = '_es';

function pickLocalized(obj, key, locale) {
  if (locale !== 'es') return obj[key];
  const es = obj[`${key}${LOCALIZABLE_SUFFIX}`];
  return (typeof es === 'string' && es.length > 0) ? es : obj[key];
}

/**
 * Assign `obj[key] = pickLocalized(source, key, locale)` only if that value is
 * not undefined. Guards against the case where `<key>_es` exists but the English
 * base does not: the existence guard (`'key' in x || 'key_es' in x`) still fires,
 * but for a non-'es' locale `pickLocalized` would resolve to `obj[key]` ===
 * undefined, re-injecting the exact undefined-valued-key bug the guards exist to
 * prevent.
 */
function assignLocalized(target, source, key, locale) {
  const value = pickLocalized(source, key, locale);
  if (value !== undefined) target[key] = value;
}

function stripEsKeys(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k.endsWith(LOCALIZABLE_SUFFIX)) continue;
    out[k] = v;
  }
  return out;
}

/**
 * Localize one coachMessage-shaped object (`{text, text_es, audio, audio_es, mood}`).
 * Returns a NEW object (via stripEsKeys) — never mutates `m`. Shared by concept-slide
 * coachMessages and socratic.messages so the two cannot drift.
 */
function localizeMessage(m, locale) {
  const nm = stripEsKeys(m);
  if ('text' in m || 'text_es' in m) assignLocalized(nm, m, 'text', locale);
  if ('audio' in m || 'audio_es' in m) assignLocalized(nm, m, 'audio', locale);
  return nm;
}

/**
 * Merge `_es` sibling fields over their English base, per field, when locale === 'es'.
 * Falls back to English per field (so a partial translation never blanks a slide) and
 * strips all `_es` keys from the output regardless of locale. `title` is never touched.
 * @param {Object} lesson
 * @param {string} [locale='en']
 * @returns {Object}
 */
export function localizeLesson(lesson, locale = 'en') {
  const slides = (lesson.slides ?? []).map((slide) => {
    const next = stripEsKeys(slide);
    if ('infoProse' in slide || 'infoProse_es' in slide) {
      assignLocalized(next, slide, 'infoProse', locale);
    }
    if (Array.isArray(slide.coachMessages)) {
      next.coachMessages = slide.coachMessages.map((m) => localizeMessage(m, locale));
    }
    if (Array.isArray(slide.legendItems)) {
      next.legendItems = slide.legendItems.map((li) => {
        const nl = stripEsKeys(li);
        if ('label' in li || 'label_es' in li) assignLocalized(nl, li, 'label', locale);
        return nl;
      });
    }
    return next;
  });

  const out = stripEsKeys(lesson);
  out.slides = slides;

  if (lesson.socratic) {
    const s = stripEsKeys(lesson.socratic);
    if ('goalPrompt' in lesson.socratic || 'goalPrompt_es' in lesson.socratic) {
      assignLocalized(s, lesson.socratic, 'goalPrompt', locale);
    }
    // stripEsKeys is a SHALLOW copy, so `s.messages` is still the SAME object
    // reference as the raw _lessons cache entry's socratic.messages. Assigning
    // into it (s.messages[phase] = ...) would permanently delete text_es from the
    // raw cache for every later request in every locale — starving
    // generateLessonAudio(lang='es'), which reads the raw cache via
    // getLessonsAll() on purpose, and persisting the loss on save. Rebuild a
    // FRESH container instead; localizeMessage already returns a new leaf object.
    if (lesson.socratic.messages && typeof lesson.socratic.messages === 'object') {
      s.messages = {};
      for (const phase of Object.keys(lesson.socratic.messages)) {
        const arr = lesson.socratic.messages[phase];
        s.messages[phase] = Array.isArray(arr) ? arr.map((m) => localizeMessage(m, locale)) : arr;
      }
    }
    out.socratic = s;
  }
  if (Array.isArray(lesson.confirmationChallenges)) {
    out.confirmationChallenges = lesson.confirmationChallenges.map((c) => {
      const nc = stripEsKeys(c);
      if ('goalPrompt' in c || 'goalPrompt_es' in c) assignLocalized(nc, c, 'goalPrompt', locale);
      return nc;
    });
  }
  return out;
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
 * Then applies the locale merge (D1): `_es` sibling fields merged over English per
 * field, falling back per field, with all `_es` keys stripped from the response.
 * @param {string} id
 * @param {string} [locale='en']
 * @returns {Object|null}
 */
export function getLesson(id, locale = 'en') {
  let lesson = _lessons.find(l => l.id === id) ?? null;
  if (!lesson) return null;

  // Backward compat: explicit null signals "use legacy draw"
  if (lesson.confirmationChallenges === undefined && lesson.confirmationCategory != null && lesson.confirmationCount > 0) {
    lesson = { ...lesson, confirmationChallenges: null };
  } else if (Array.isArray(lesson.confirmationChallenges) && lesson.confirmationChallenges.length > 0) {
    // Derive confirmationCount from curated challenges when present
    lesson = { ...lesson, confirmationCount: lesson.confirmationChallenges.length };
  }

  return localizeLesson(lesson, locale);
}
