// connect-four/server/scripts/win_distribution/run_grid.mjs
// Monte-Carlo winning-cell distribution over the 4x4 policy grid.
import { createSolverProcess } from '../../c4solver-wrapper.js';
import { playPolicyGame } from '../../gameSampling.js';
import { makePolicy, POLICY_NAMES } from './policies.mjs';
import { extractOutcome } from './winningCells.mjs';
import { appendFileSync, existsSync, readFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const HELP = `run_grid.mjs — Monte-Carlo winning-cell distributions over the 4x4 policy grid.

Plays P1-policy vs P2-policy games for each requested combo and appends one JSON
line per game to data/games_<p1>_<p2>.jsonl. Resumable: re-running continues
after the highest recorded game index (per-game derived seeds; nothing replays).

Policies: ${POLICY_NAMES.join(', ')}
  optimal  uniform over solver-optimal moves
  mp10     10% uniform-over-legal mistakes, else optimal
  mp25     25% uniform-over-legal mistakes, else optimal
  blocker  solver-free: own win > block > random avoiding forbidden columns

Options:
  --combos p1:p2[,p1:p2...]  combos to run (default: all 16)
  --target-wins N            stop a combo when BOTH players have >= N wins (default 10000)
  --max-games N              hard cap on games per combo (default 30000)
  --seed N                   base seed (default 42)
  --out DIR                  output dir (default <script dir>/data)
  -h, --help                 show this help
`;

function parseArgs(argv) {
  const args = { targetWins: 10000, maxGames: 30000, seed: 42, out: null, combos: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') { console.log(HELP); process.exit(0); }
    else if (a === '--combos') args.combos = argv[++i].split(',').map(s => s.split(':'));
    else if (a === '--target-wins') args.targetWins = parseInt(argv[++i], 10);
    else if (a === '--max-games') args.maxGames = parseInt(argv[++i], 10);
    else if (a === '--seed') args.seed = parseInt(argv[++i], 10);
    else if (a === '--out') args.out = argv[++i];
    else { console.error(`Unknown arg: ${a}\n${HELP}`); process.exit(1); }
  }
  return args;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function runCombo(solver, [p1Name, p2Name], { targetWins, maxGames, seed, outDir }) {
  const file = join(outDir, `games_${p1Name}_${p2Name}.jsonl`);
  let startG = 0;
  let draws = 0;
  const wins = { 1: 0, 2: 0 };
  if (existsSync(file)) {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      const row = JSON.parse(line);
      startG = Math.max(startG, row.g + 1);
      if (row.winner) wins[row.winner]++; else draws++;
    }
  }
  console.log(`[${p1Name} vs ${p2Name}] resuming at game ${startG} (wins so far P1=${wins[1]} P2=${wins[2]})`);

  for (let g = startG; g < maxGames; g++) {
    if (wins[1] >= targetWins && wins[2] >= targetWins) break;
    const rng = mulberry32((seed ^ Math.imul(g + 1, 0x9E3779B9)) >>> 0);
    const policies = [makePolicy(p1Name), makePolicy(p2Name)];
    let finalMs = '';
    for await (const p of playPolicyGame(solver, policies, rng)) {
      finalMs = p.ms + String(p.movePlayed);
    }
    const { winner, cells } = extractOutcome(finalMs);
    if (winner) wins[winner]++; else draws++;
    appendFileSync(file, JSON.stringify({
      g, ms: finalMs, winner, cells: cells.map(c => [c.col, c.row]), plies: finalMs.length,
    }) + '\n');
    if ((g + 1) % 200 === 0) {
      console.log(`[${p1Name} vs ${p2Name}] game ${g + 1}: P1=${wins[1]} P2=${wins[2]} draws=${draws}`);
    }
  }
  console.log(`[${p1Name} vs ${p2Name}] done: P1=${wins[1]} P2=${wins[2]} draws=${draws}`);
}

const args = parseArgs(process.argv);
const outDir = args.out ?? join(dirname(fileURLToPath(import.meta.url)), 'data');
mkdirSync(outDir, { recursive: true });
const combos = args.combos ?? POLICY_NAMES.flatMap(a => POLICY_NAMES.map(b => [a, b]));
for (const [a, b] of combos) {
  if (!POLICY_NAMES.includes(a) || !POLICY_NAMES.includes(b)) {
    console.error(`Invalid combo ${a}:${b}. Valid policies: ${POLICY_NAMES.join(', ')}`);
    process.exit(1);
  }
}

const solver = createSolverProcess();
try {
  for (const combo of combos) {
    await runCombo(solver, combo, { ...args, outDir });
  }
} finally {
  solver.destroy();
}
