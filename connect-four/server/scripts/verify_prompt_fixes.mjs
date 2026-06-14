#!/usr/bin/env node
// verify_prompt_fixes.mjs
// Usage: node connect-four/server/scripts/verify_prompt_fixes.mjs
// Requires: OPENAI_API_KEY, OPENAI_MODEL in connect-four/server/.env

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createSolverProcess } from '../c4solver-wrapper.js';
import { buildExplainContext } from '../explainContext.js';
import { callLLM } from '../llmCoachHelpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '../.env');
const env = readFileSync(envPath, 'utf8');
env.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && k.trim()) process.env[k.trim()] = v.join('=').trim();
});

// The 3 feedback cases: [movestring, playedCol (0-indexed), bug label, old LLM response]
const CASES = [
  {
    label: 'H1 — annotation cell confused with move location',
    movestring: '333333544442211044111',
    col: 1,
    oldResponse: `Grey gave up a stronger move by playing in [zone:c3r3!]that cell[/zone:c3r3], because it only meets the nearby fight in the center instead of pressing the larger threat race. The missed pattern was a fork: the better move would have kept the pressure on the even-row winning line and made it much harder for Green to cover both the center threat and the column threat at once.`,
  },
  {
    label: 'H2 — refuses to name the better column',
    movestring: '333331',
    col: 4,
    oldResponse: `Green had a win available, but the move in [zone:col5!]column 5[/zone:col5] only made a single low threat and let Grey keep control instead of building the real winning line. The missed pattern was a fork setup: the better move would have played to the column that kept Green's odd-row finish alive, creating two connected winning threats so Grey could not block both.`,
  },
  {
    label: 'H3 — implies immediate win when none exists on board',
    movestring: '333332222555550130',
    col: 5,
    oldResponse: `Green missed a direct winning move and played for safety instead, even though the winning line was already there. The better move would have completed Green's line on an odd row and ended the game immediately, while the move chosen only let Grey keep the position level.`,
  },
];

const solver = createSolverProcess();

try {
  for (const { label, movestring, col, oldResponse } of CASES) {
    console.log('\n' + '='.repeat(72));
    console.log(`CASE: ${label}`);
    console.log(`movestring=${movestring}  playedCol=${col}`);
    console.log('-'.repeat(72));

    const ctx = await buildExplainContext(movestring, col, 1, solver);
    if (!ctx || !ctx.prompt) {
      console.log('  ⚠️  buildExplainContext returned no prompt:', ctx);
      continue;
    }

    console.log('\n── OLD RESPONSE ──────────────────────────────────────────────────');
    console.log(oldResponse);

    console.log('\n── NEW PROMPT (first 800 chars) ───────────────────────────────────');
    console.log(ctx.prompt.slice(0, 800) + (ctx.prompt.length > 800 ? '\n[…truncated]' : ''));

    console.log('\n── NEW LLM RESPONSE ───────────────────────────────────────────────');
    const newResponse = await callLLM(ctx.prompt);
    console.log(newResponse);
  }
} finally {
  solver.destroy();
}
