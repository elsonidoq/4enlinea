#!/usr/bin/env node
/**
 * Backfill slides[].windowCounts for lessons that opt in via showWindowCounts.
 *
 * The counts are a derived cache; saveLessonFile stamps them on every admin write. This
 * script is for the one-time backfill and for repairing a file edited on disk outside the
 * admin API. It routes through saveLessonFile so there is exactly one implementation of
 * the stamping rule.
 *
 * Usage:
 *   node scripts/backfill-window-counts.mjs            # all lessons
 *   node scripts/backfill-window-counts.mjs <id> [id]  # only these lesson ids
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { saveLessonFile } from '../server/lessonAdmin.js';

const LESSONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '../lessons');

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`Backfill slides[].windowCounts into lesson JSON files.

Recomputes the derived per-cell live-window counts for every slide with
showWindowCounts: true, and strips windowCounts from every slide without it.
Routes through saveLessonFile, the same seam the admin API uses.

Usage:
  node scripts/backfill-window-counts.mjs             Backfill every lesson (default)
  node scripts/backfill-window-counts.mjs <id>...     Backfill only these lesson ids
  node scripts/backfill-window-counts.mjs --help      Show this message

Lessons directory: ${LESSONS_DIR}`);
  process.exit(0);
}

const only = new Set(args);
let touched = 0;
for (const file of fs.readdirSync(LESSONS_DIR).filter(f => /^lesson-\d+-.*\.json$/.test(f))) {
  const lesson = JSON.parse(fs.readFileSync(path.join(LESSONS_DIR, file), 'utf8'));
  if (only.size > 0 && !only.has(lesson.id)) continue;
  saveLessonFile(LESSONS_DIR, lesson);
  const opted = (lesson.slides ?? []).filter(s => s.showWindowCounts === true).length;
  console.log(`${file}: rewrote (${opted} slide${opted === 1 ? '' : 's'} with windowCounts)`);
  touched++;
}
console.log(`Done — ${touched} lesson file${touched === 1 ? '' : 's'} rewritten.`);
