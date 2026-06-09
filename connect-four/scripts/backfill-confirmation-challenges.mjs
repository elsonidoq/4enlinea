#!/usr/bin/env node

/**
 * backfill-confirmation-challenges.mjs
 *
 * Reads all lesson-NN-*.json files, fetches N puzzles from Supabase for lessons
 * that have confirmationCategory + confirmationCount > 0 but no
 * confirmationChallenges, embeds the full puzzle data, and writes back to disk.
 *
 * Idempotent — safe to re-run; skips lessons that already have confirmationChallenges.
 *
 * Usage:
 *   SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/backfill-confirmation-challenges.mjs
 *
 * Without credentials: prints SKIP and exits 0.
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.log('SKIP: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set.');
  process.exit(0);
}

const LESSONS_DIR = join(__dirname, '..', 'lessons');

if (!existsSync(LESSONS_DIR)) {
  console.error(`Lessons directory not found: ${LESSONS_DIR}`);
  process.exit(1);
}

const lessonFiles = readdirSync(LESSONS_DIR)
  .filter(f => /^lesson-\d+-.*\.json$/.test(f))
  .sort();

if (lessonFiles.length === 0) {
  console.log('No lesson files found.');
  process.exit(0);
}

const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let updatedCount = 0;
let skippedCount = 0;

for (const filename of lessonFiles) {
  const filePath = join(LESSONS_DIR, filename);
  const raw = readFileSync(filePath, 'utf8');
  const lesson = JSON.parse(raw);

  // Skip if already has confirmationChallenges
  if (lesson.confirmationChallenges && lesson.confirmationChallenges.length > 0) {
    console.log(`SKIP ${filename}: already has ${lesson.confirmationChallenges.length} curated challenges`);
    skippedCount++;
    continue;
  }

  // Skip if no legacy confirmation config
  if (!lesson.confirmationCategory || !(lesson.confirmationCount > 0)) {
    console.log(`SKIP ${filename}: no confirmationCategory or confirmationCount=0`);
    skippedCount++;
    continue;
  }

  console.log(`BACKFILL ${filename}: fetching ${lesson.confirmationCount} puzzles for category "${lesson.confirmationCategory}"`);

  // Fetch puzzles in deterministic order
  const { data: puzzles, error } = await supabase
    .from('puzzles')
    .select('id, category, move_string, goal_prompt, goal_predicate_type, goal_predicate_params, cooperative_ai_moves, interaction_mode, highlight_metadata, correct_col, user_player')
    .eq('is_active', true)
    .eq('category', lesson.confirmationCategory)
    .order('created_at', { ascending: true })
    .limit(lesson.confirmationCount);

  if (error) {
    console.error(`  ERROR fetching puzzles for ${filename}: ${error.message}`);
    continue;
  }

  if (!puzzles || puzzles.length === 0) {
    console.log(`  WARNING: no puzzles found for category "${lesson.confirmationCategory}"`);
    continue;
  }

  if (puzzles.length < lesson.confirmationCount) {
    console.log(`  WARNING: only ${puzzles.length} puzzles available (requested ${lesson.confirmationCount})`);
  }

  // Embed full puzzle data (camelCase keys for lesson JSON)
  const confirmationChallenges = puzzles.map(p => ({
    puzzleId: p.id,
    moveString: p.move_string,
    goalPrompt: p.goal_prompt || '',
    goalPredicateType: p.goal_predicate_type || lesson.confirmationCategory,
    goalPredicateParams: p.goal_predicate_params ?? null,
    cooperativeAiMoves: p.cooperative_ai_moves ?? [],
    interactionMode: p.interaction_mode || 'single_move',
    highlightMetadata: p.highlight_metadata ?? null,
    correctCol: p.correct_col,
    userPlayer: p.user_player,
  }));

  // Write updated lesson (preserving all existing fields)
  const updated = {
    ...lesson,
    confirmationChallenges,
    // confirmationCount stays for backward compat; derived at runtime
  };
  writeFileSync(filePath, JSON.stringify(updated, null, 2) + '\n', 'utf8');
  console.log(`  OK: embedded ${confirmationChallenges.length} puzzles`);
  updatedCount++;
}

console.log(`\nDone. Updated: ${updatedCount}, Skipped: ${skippedCount}, Total: ${lessonFiles.length}`);
