#!/usr/bin/env node
// Hallucination acceptance test for the Explanation Engine.
//
// Usage: API_BASE=http://localhost:3001 AUTH_TOKEN=<token> node run_hallucination_test.js
//
// Tests 100 diverse positions × 5 LLM generations each (500 total).
// Flags explanations that reference patterns not confirmed by the classifier.
// Must achieve < 2% error rate (≤ 10 errors) to pass.

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const API = process.env.API_BASE || 'http://localhost:3001';
const TOKEN = process.env.AUTH_TOKEN || '';
const GENERATIONS = parseInt(process.env.GENERATIONS || '5', 10);
const SOLVER_PATH = new URL('../../server/c4solver', import.meta.url).pathname;
const SOLVER_CWD = new URL('../../server/', import.meta.url).pathname;

// 100 diverse test positions (varying lengths, game states)
const TEST_POSITIONS = [
  // Empty / very early game
  { moves: '4', col: 3 },
  { moves: '44', col: 3 },
  { moves: '45', col: 3 },
  { moves: '34', col: 2 },
  { moves: '4', col: 2 },
  // Known immediate threats (cat 1)
  { moves: '112233', col: 3 },
  { moves: '415263', col: 6 },
  { moves: '172737', col: 3 },
  // Forced block (cat 2)
  { moves: '11224', col: 2 },
  // Double threat (cat 3)
  { moves: '4455', col: 2 },
  { moves: '4455', col: 5 },
  // Fork setup (cat 4)
  { moves: '12345', col: 3 },
  { moves: '123', col: 2 },
  { moves: '123', col: 4 },
  { moves: '123', col: 5 },
  // Parity (cat 6)
  { moves: '43445', col: 3 },
  // Zugzwang (cat 5)
  { moves: '4444455566', col: 6 },
  // Mid-game variety
  { moves: '4455334', col: 0 },
  { moves: '1234567', col: 1 },
  { moves: '1234567', col: 3 },
  { moves: '44556', col: 0 },
  { moves: '44556', col: 3 },
  { moves: '4433', col: 1 },
  { moves: '4433', col: 3 },
  { moves: '4433221', col: 4 },
  { moves: '44332211', col: 3 },
  { moves: '443322117', col: 0 },
  { moves: '4433221176', col: 3 },
  { moves: '1234', col: 0 },
  { moves: '1234', col: 3 },
  { moves: '1234', col: 4 },
  { moves: '12341', col: 2 },
  { moves: '123412', col: 3 },
  { moves: '1234123', col: 4 },
  { moves: '44444', col: 0 },
  { moves: '44444', col: 3 },
  { moves: '333444', col: 0 },
  { moves: '333444', col: 3 },
  { moves: '3334445', col: 1 },
  { moves: '33344455', col: 1 },
  { moves: '333444556', col: 0 },
  { moves: '4455667', col: 0 },
  { moves: '4455667', col: 3 },
  { moves: '44556671', col: 2 },
  { moves: '445566712', col: 3 },
  { moves: '4455667123', col: 4 },
  { moves: '44556671234', col: 5 },
  { moves: '445566712345', col: 0 },
  { moves: '4455667123456', col: 3 },
  // Longer games
  { moves: '44556671234561', col: 3 },
  { moves: '445566712345612', col: 3 },
  { moves: '4455667123456127', col: 4 },
  { moves: '44556671234561273', col: 0 },
  { moves: '445566712345612734', col: 1 },
  { moves: '4455667123456127344', col: 2 },
  { moves: '44556671234561273445', col: 3 },
  { moves: '445566712345612734456', col: 4 },
  { moves: '4455667123456127344567', col: 5 },
  { moves: '44556671234561273445671', col: 0 },
  { moves: '445566712345612734456712', col: 3 },
  { moves: '4455667123456127344567123', col: 4 },
  { moves: '44556671234561273445671234', col: 5 },
  { moves: '445566712345612734456712345', col: 0 },
  { moves: '4455667123456127344567123456', col: 3 },
  // Deep positions
  { moves: '34455667123456127344567', col: 1 },
  { moves: '344556671234561273445671', col: 3 },
  { moves: '3445566712345612734456712', col: 4 },
  { moves: '34455667123456127344567123', col: 5 },
  // Additional variety
  { moves: '55', col: 3 },
  { moves: '554', col: 2 },
  { moves: '5543', col: 1 },
  { moves: '55432', col: 0 },
  { moves: '554321', col: 3 },
  { moves: '5543216', col: 4 },
  { moves: '55432167', col: 5 },
  { moves: '554321677', col: 3 },
  { moves: '5543216774', col: 2 },
  { moves: '55432167744', col: 1 },
  { moves: '554321677445', col: 0 },
  { moves: '5543216774456', col: 3 },
  { moves: '55432167744563', col: 4 },
  { moves: '554321677445632', col: 5 },
  { moves: '5543216774456321', col: 0 },
  { moves: '55432167744563217', col: 3 },
  { moves: '554321677445632176', col: 4 },
  { moves: '5543216774456321765', col: 5 },
  { moves: '55432167744563217654', col: 0 },
  { moves: '554321677445632176543', col: 3 },
  { moves: '5543216774456321765432', col: 4 },
  { moves: '55432167744563217654321', col: 5 },
  { moves: '554321677445632176543217', col: 0 },
  { moves: '5543216774456321765432176', col: 3 },
  { moves: '55432167744563217654321765', col: 4 },
  { moves: '554321677445632176543217654', col: 5 },
  { moves: '5543216774456321765432176543', col: 0 },
  { moves: '55432167744563217654321765432', col: 3 },
  { moves: '554321677445632176543217654321', col: 4 },
];

// Pattern tags the classifier can return
const VALID_TAGS = new Set([
  'immediate_threat', 'forced_block', 'double_threat',
  'fork_setup', 'zugzwang', 'parity_control',
  'best_move', 'drawing_move', 'suboptimal_move',
]);

function getSolverScores(moves) {
  try {
    const result = execSync(
      `echo "${moves || ''}" | ${SOLVER_PATH} -a`,
      { cwd: SOLVER_CWD, timeout: 10000, encoding: 'utf8' }
    );
    return result.trim().split(' ').slice(1).map(Number);
  } catch {
    return null;
  }
}

async function fetchExplanation(moves, candidateCol) {
  const headers = { 'Content-Type': 'application/json' };
  if (TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`;

  const res = await fetch(`${API}/api/explain-move`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ moves, candidateCol }),
  });

  if (!res.ok) return null;
  return res.json();
}

function validateResponse(data, expectedTag) {
  // Response must have patternTag matching what classifier returns
  if (!data?.patternTag) return { valid: false, reason: 'missing patternTag' };
  if (!VALID_TAGS.has(data.patternTag)) return { valid: false, reason: `unknown patternTag: ${data.patternTag}` };
  if (data.patternTag !== expectedTag) return { valid: false, reason: `patternTag mismatch: got "${data.patternTag}", expected "${expectedTag}"` };
  if (!data.oneLiner || typeof data.oneLiner !== 'string' || data.oneLiner.length < 5) {
    return { valid: false, reason: 'missing or too-short oneLiner' };
  }
  return { valid: true };
}

// Precompute expected tags using the classifier
import { classify } from '../../server/classifier.js';

async function main() {
  console.log(`Hallucination test: ${TEST_POSITIONS.length} positions × ${GENERATIONS} generations`);
  console.log(`API: ${API}\n`);

  let totalTests = 0;
  let errors = 0;
  const failures = [];

  for (const { moves, col } of TEST_POSITIONS) {
    // Get scores from solver
    const scores = getSolverScores(moves);
    if (!scores || scores.length !== 7) {
      console.warn(`  SKIP ${moves}:${col} — solver failed`);
      continue;
    }

    // Get expected pattern tag from classifier
    const { tag: expectedTag } = classify(moves, col, scores);

    // Run N generations
    for (let gen = 0; gen < GENERATIONS; gen++) {
      totalTests++;
      try {
        const data = await fetchExplanation(moves, col);
        const { valid, reason } = validateResponse(data, expectedTag);

        if (!valid) {
          errors++;
          const failure = { moves, col, gen, reason, expectedTag, got: data?.patternTag };
          failures.push(failure);
          console.error(`  FAIL [${moves}:${col}] gen=${gen}: ${reason}`);
        }
      } catch (err) {
        errors++;
        failures.push({ moves, col, gen, reason: `fetch error: ${err.message}` });
      }

      // Brief pause to avoid hammering the LLM
      await new Promise(r => setTimeout(r, 200));
    }

    process.stdout.write('.');
  }

  const errorRate = errors / totalTests;
  console.log(`\n\nResults: ${errors}/${totalTests} errors (${(errorRate * 100).toFixed(1)}%)`);

  if (failures.length > 0) {
    console.log('\nFailures:');
    for (const f of failures) {
      console.log(`  moves="${f.moves}" col=${f.col} gen=${f.gen}: ${f.reason}`);
    }
  }

  const passed = errorRate < 0.02;
  console.log(`\nHallucination gate: ${passed ? 'PASSED ✓' : 'FAILED ✗'} (threshold: < 2%)`);
  process.exit(passed ? 0 : 1);
}

main().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
