#!/usr/bin/env node
// Hallucination acceptance test for the Explanation Engine.
//
// Usage: API_BASE=http://localhost:3001 AUTH_TOKEN=<token> node run_hallucination_test.js
//
// Tests 100 diverse positions × 5 LLM generations each (500 total).
// Flags explanations that reference patterns not confirmed by the classifier.
// Must achieve < 2% error rate (≤ 10 errors) to pass.

import { execSync } from 'node:child_process';

const API = process.env.API_BASE || 'http://localhost:3001';
const TOKEN = process.env.AUTH_TOKEN || '';
const GENERATIONS = parseInt(process.env.GENERATIONS || '5', 10);
const SOLVER_PATH = new URL('../../server/c4solver', import.meta.url).pathname;
const SOLVER_CWD = new URL('../../server/', import.meta.url).pathname;

// 100 diverse test positions (varying lengths, game states)
const TEST_POSITIONS = [
  // Empty / very early game
  { moves: '3', col: 3 },
  { moves: '33', col: 3 },
  { moves: '34', col: 3 },
  { moves: '23', col: 2 },
  { moves: '3', col: 2 },
  // Known immediate threats (cat 1)
  { moves: '001122', col: 3 },
  { moves: '304152', col: 6 },
  { moves: '061626', col: 3 },
  // Forced block (cat 2)
  { moves: '00113', col: 2 },
  // Double threat (cat 3)
  { moves: '3344', col: 2 },
  { moves: '3344', col: 5 },
  // Fork setup (cat 4)
  { moves: '01234', col: 3 },
  { moves: '012', col: 2 },
  { moves: '012', col: 4 },
  { moves: '012', col: 5 },
  // Parity (cat 6)
  { moves: '32334', col: 3 },
  // Zugzwang (cat 5)
  { moves: '3333344455', col: 6 },
  // Mid-game variety
  { moves: '3344223', col: 0 },
  { moves: '0123456', col: 1 },
  { moves: '0123456', col: 3 },
  { moves: '33445', col: 0 },
  { moves: '33445', col: 3 },
  { moves: '3322', col: 1 },
  { moves: '3322', col: 3 },
  { moves: '3322110', col: 4 },
  { moves: '33221100', col: 3 },
  { moves: '332211006', col: 0 },
  { moves: '3322110065', col: 3 },
  { moves: '0123', col: 0 },
  { moves: '0123', col: 3 },
  { moves: '0123', col: 4 },
  { moves: '01230', col: 2 },
  { moves: '012301', col: 3 },
  { moves: '0123012', col: 4 },
  { moves: '33333', col: 0 },
  { moves: '33333', col: 3 },
  { moves: '222333', col: 0 },
  { moves: '222333', col: 3 },
  { moves: '2223334', col: 1 },
  { moves: '22233344', col: 1 },
  { moves: '222333445', col: 0 },
  { moves: '3344556', col: 0 },
  { moves: '3344556', col: 3 },
  { moves: '33445560', col: 2 },
  { moves: '334455601', col: 3 },
  { moves: '3344556012', col: 4 },
  { moves: '33445560123', col: 5 },
  { moves: '334455601234', col: 0 },
  { moves: '3344556012345', col: 3 },
  // Longer games
  { moves: '33445560123450', col: 3 },
  { moves: '334455601234501', col: 3 },
  { moves: '3344556012345016', col: 4 },
  { moves: '33445560123450162', col: 0 },
  { moves: '334455601234501623', col: 1 },
  { moves: '3344556012345016233', col: 2 },
  { moves: '33445560123450162334', col: 3 },
  { moves: '334455601234501623345', col: 4 },
  { moves: '3344556012345016233456', col: 5 },
  { moves: '33445560123450162334560', col: 0 },
  { moves: '334455601234501623345601', col: 3 },
  { moves: '3344556012345016233456012', col: 4 },
  { moves: '33445560123450162334560123', col: 5 },
  { moves: '334455601234501623345601234', col: 0 },
  { moves: '3344556012345016233456012345', col: 3 },
  // Deep positions
  { moves: '23344556012345016233456', col: 1 },
  { moves: '233445560123450162334560', col: 3 },
  { moves: '2334455601234501623345601', col: 4 },
  { moves: '23344556012345016233456012', col: 5 },
  // Additional variety
  { moves: '44', col: 3 },
  { moves: '443', col: 2 },
  { moves: '4432', col: 1 },
  { moves: '44321', col: 0 },
  { moves: '443210', col: 3 },
  { moves: '4432105', col: 4 },
  { moves: '44321056', col: 5 },
  { moves: '443210566', col: 3 },
  { moves: '4432105663', col: 2 },
  { moves: '44321056633', col: 1 },
  { moves: '443210566334', col: 0 },
  { moves: '4432105663345', col: 3 },
  { moves: '44321056633452', col: 4 },
  { moves: '443210566334521', col: 5 },
  { moves: '4432105663345210', col: 0 },
  { moves: '44321056633452106', col: 3 },
  { moves: '443210566334521065', col: 4 },
  { moves: '4432105663345210654', col: 5 },
  { moves: '44321056633452106543', col: 0 },
  { moves: '443210566334521065432', col: 3 },
  { moves: '4432105663345210654321', col: 4 },
  { moves: '44321056633452106543210', col: 5 },
  { moves: '443210566334521065432106', col: 0 },
  { moves: '4432105663345210654321065', col: 3 },
  { moves: '44321056633452106543210654', col: 4 },
  { moves: '443210566334521065432106543', col: 5 },
  { moves: '4432105663345210654321065432', col: 0 },
  { moves: '44321056633452106543210654321', col: 3 },
  { moves: '443210566334521065432106543210', col: 4 },
];

// Pattern tags the classifier can return
const VALID_TAGS = new Set([
  'immediate_threat', 'forced_block', 'double_threat',
  'forced_win',
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
