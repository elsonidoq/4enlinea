#!/usr/bin/env node

/**
 * validate-puzzle-counts.mjs
 *
 * Validates that every lesson's confirmationCategory has at least 1 approved
 * puzzle in the database. Prints a per-category count table and exits non-zero
 * if any non-deferred confirmationCategory has count 0.
 *
 * Usage:
 *   SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/validate-puzzle-counts.mjs
 *
 * Without credentials: prints SKIP and exits 0 (CI-friendly).
 */

// Categories deferred to Epic 5 — excluded from the count gate.
const DEFERRED_CATEGORIES = ['undercut'];

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.log('SKIP: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set.');
  console.log('Usage: SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/validate-puzzle-counts.mjs');
  process.exit(0);
}

async function main() {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // ── Load lesson JSON files ──────────────────────────────────────────────────
  const lessonsDir = join(__dirname, '..', 'lessons');
  const lessonFiles = readdirSync(lessonsDir).filter(f => f.endsWith('.json'));
  const lessons = [];
  for (const file of lessonFiles) {
    try {
      const data = JSON.parse(readFileSync(join(lessonsDir, file), 'utf8'));
      if (data.confirmationCategory) {
        lessons.push({
          id: data.id,
          title: data.title,
          confirmationCategory: data.confirmationCategory,
          file,
        });
      }
    } catch {
      // Skip malformed files
    }
  }

  // ── Query approved puzzle counts ────────────────────────────────────────────
  const { data: puzzles, error } = await supabase
    .from('puzzles')
    .select('category')
    .eq('is_active', true);

  if (error) {
    console.error('Query error:', error.message);
    process.exit(1);
  }

  const countMap = new Map();
  for (const row of puzzles || []) {
    const cat = row.category;
    countMap.set(cat, (countMap.get(cat) ?? 0) + 1);
  }

  // ── Print category count table ──────────────────────────────────────────────
  // Collect all unique categories across puzzles and lessons
  const allCategories = new Set(lessons.map(l => l.confirmationCategory));
  for (const cat of countMap.keys()) allCategories.add(cat);

  console.log('\nApproved puzzle counts per category:');
  console.log('─'.repeat(50));
  console.log('  Category'.padEnd(30), 'Count');
  console.log('─'.repeat(50));
  for (const cat of [...allCategories].sort()) {
    const count = countMap.get(cat) ?? 0;
    const tag = count === 0 ? ' (MISSING)' : '';
    console.log(`  ${cat.padEnd(30)} ${String(count).padStart(5)}${tag}`);
  }
  console.log('─'.repeat(50));
  console.log();

  // ── Validate lesson confirmation categories ─────────────────────────────────
  let exitCode = 0;

  for (const lesson of lessons) {
    const cat = lesson.confirmationCategory;
    const count = countMap.get(cat) ?? 0;

    if (!cat) {
      console.log(`SKIP: lesson "${lesson.title}" (${lesson.id}) — no confirmationCategory`);
      continue;
    }

    if (DEFERRED_CATEGORIES.includes(cat)) {
      console.log(`SKIP: lesson "${lesson.title}" (${lesson.id}) — category "${cat}" is deferred to Epic 5`);
      continue;
    }

    if (count > 0) {
      console.log(`PASS: lesson "${lesson.title}" (${lesson.id}) — confirmationCategory "${cat}" has ${count} approved puzzle(s)`);
    } else {
      console.log(`FAIL: lesson "${lesson.title}" (${lesson.id}) — confirmationCategory "${cat}" has 0 approved puzzles`);
      exitCode = 1;
    }
  }

  if (exitCode === 0) {
    console.log('\nPASS: All confirmation categories have approved puzzles.');
  } else {
    console.log('\nFAIL: Some confirmation categories are missing approved puzzles.');
  }

  process.exit(exitCode);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
