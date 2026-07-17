// connect-four/server/scripts/win_distribution/aggregate.mjs
import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROWS = 6, COLS = 7;

export function aggregateRows(rows) {
  const counts = { 1: null, 2: null };
  const wins = { 1: 0, 2: 0 };
  const oddMassSum = { 1: 0, 2: 0 };
  let draws = 0, pliesSum = 0;

  for (const r of rows) {
    pliesSum += r.plies;
    if (!r.winner) { draws++; continue; }
    wins[r.winner]++;
    counts[r.winner] ??= Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    let odd = 0;
    for (const [col, row] of r.cells) {
      counts[r.winner][row][col]++;
      if (row % 2 === 0) odd++; // row index 0 = 1-indexed row 1 = odd (allen-parity)
    }
    oddMassSum[r.winner] += r.cells.length ? odd / r.cells.length : 0;
  }

  const heatmaps = {}, parity = {};
  for (const p of [1, 2]) {
    if (!wins[p]) { heatmaps[p] = null; parity[p] = null; continue; }
    heatmaps[p] = counts[p].map(rw => rw.map(v => v / wins[p]));
    const oddRowMass = oddMassSum[p] / wins[p];
    parity[p] = { oddRowMass, evenRowMass: 1 - oddRowMass };
  }
  return { games: rows.length, p1Wins: wins[1], p2Wins: wins[2], draws, meanPlies: rows.length ? pliesSum / rows.length : 0, heatmaps, parity };
}

function readJsonl(path) {
  return readFileSync(path, 'utf8').split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
}

const HELP = `aggregate.mjs — fold win_distribution game JSONLs into summary.json

Reads every games_<p1>_<p2>.jsonl in the data dir and writes summary.json with,
per combo and per winning player: the 6x7 P(cell in winning structure | win)
heatmap, win/draw rates, mean game length, and odd/even-row parity mass.

Options:
  --data DIR   input dir with games_*.jsonl (default: <script dir>/data)
  --out FILE   output path (default: <data dir>/summary.json)
  -h, --help   this help
`;

function main() {
  const argv = process.argv;
  let dataDir = join(dirname(fileURLToPath(import.meta.url)), 'data');
  let out = null;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '-h' || argv[i] === '--help') { console.log(HELP); process.exit(0); }
    else if (argv[i] === '--data') dataDir = argv[++i];
    else if (argv[i] === '--out') out = argv[++i];
    else { console.error(`Unknown arg: ${argv[i]}\n${HELP}`); process.exit(1); }
  }
  out ??= join(dataDir, 'summary.json');

  const summary = {};
  for (const f of readdirSync(dataDir).filter(f => /^games_.+\.jsonl$/.test(f)).sort()) {
    const [, p1, p2] = f.match(/^games_(.+)_(.+)\.jsonl$/);
    const agg = aggregateRows(readJsonl(join(dataDir, f)));
    summary[`${p1}__${p2}`] = agg;
    const pct = n => (100 * n / agg.games).toFixed(1) + '%';
    console.log(`${p1.padEnd(8)} vs ${p2.padEnd(8)} games=${agg.games} P1=${pct(agg.p1Wins)} P2=${pct(agg.p2Wins)} draws=${pct(agg.draws)} meanPlies=${agg.meanPlies.toFixed(1)} oddMassP1=${agg.parity[1] ? agg.parity[1].oddRowMass.toFixed(3) : '—'} oddMassP2=${agg.parity[2] ? agg.parity[2].oddRowMass.toFixed(3) : '—'}`);
  }
  writeFileSync(out, JSON.stringify(summary, null, 2));
  console.log(`\nWrote ${out}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
