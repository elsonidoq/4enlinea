// visualize.mjs — render win_distribution summary.json into a self-contained HTML report.
//
// Reads the aggregator's summary.json (per-combo 6x7 winning-cell heatmaps + parity
// mass) and emits one static, dependency-free HTML file: for each policy pairing, the
// P1 and P2 heatmaps side by side on a shared color scale, board-oriented (row 1 at the
// bottom), with win/draw rates and odd/even-row parity mass. Colors are computed here,
// so the output has no scripts and no external resources.
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROWS = 6, COLS = 7;
const PAPER = [245, 244, 241];
const P1_RGB = [26, 90, 45];   // player 1 renders GREEN in-app
const P2_RGB = [55, 60, 68];   // player 2 renders GRAY in-app

const HELP = `visualize.mjs — render win_distribution summary.json into a self-contained HTML report.

For each policy pairing in summary.json, draws the player-1 and player-2 winning-cell
heatmaps side by side on a shared color scale (board-oriented, row 1 at bottom), with
win/draw rates, mean game length, and odd/even-row parity mass. The output HTML embeds
all colors and data inline — no scripts, no external resources.

Options:
  --summary FILE   input summary.json (default: <script dir>/data/summary.json)
  --data DIR       dir containing summary.json (alternative to --summary; default <script dir>/data)
  --combo p1:p2    render only this pairing (e.g. optimal:blocker); default: all combos in the file
  --out FILE       output HTML path (default: <summary dir>/report.html)
  -h, --help       show this help
`;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pct = (n, d) => (100 * n / (d || 1)).toFixed(1) + '%';

function lerp(a, b, t) { return a.map((x, i) => Math.round(x + (b[i] - x) * t)); }
function ramp(base, t) { const c = lerp(PAPER, base, Math.pow(Math.max(0, Math.min(1, t)), 0.82)); return `rgb(${c[0]},${c[1]},${c[2]})`; }
const textColor = (t) => (t > 0.42 ? '#fff' : '#33302b');

// Largest cell probability across every rendered heatmap → one shared scale for the report.
function globalMax(entries) {
  let m = 0;
  for (const [, agg] of entries) {
    for (const p of [1, 2]) {
      const h = agg.heatmaps?.[p];
      if (!h) continue;
      for (const row of h) for (const v of row) if (v > m) m = v;
    }
  }
  return m || 1; // guard against an all-zero / empty report
}

function boardHtml(grid, baseRGB, max) {
  if (!grid) return '<div class="nowins">no wins &mdash; this player never won in the sample</div>';
  let cells = '<div class="corner"></div>';
  for (let c = 1; c <= COLS; c++) cells += `<div class="collab">${c}</div>`;
  for (let r = ROWS - 1; r >= 0; r--) {
    const rowNum = r + 1;                       // 1-indexed row (row 1 = bottom)
    const parity = rowNum % 2 === 1 ? 'odd' : 'even';
    cells += `<div class="rowlab"><span>${rowNum}</span><span class="par ${parity}">${parity === 'odd' ? 'O' : 'E'}</span></div>`;
    for (let c = 0; c < COLS; c++) {
      const v = grid[r][c];
      const t = v / max;
      const label = v.toFixed(2).replace(/^0(?=\.)/, '');
      cells += `<div class="cell" style="background:${ramp(baseRGB, t)};color:${textColor(t)}" title="col ${c + 1}, row ${rowNum} — ${(v * 100).toFixed(0)}%">${label}</div>`;
    }
  }
  return `<div class="grid-scroll"><div class="board">${cells}</div></div>`;
}

function parityBar(par) {
  if (!par) return '';
  const odd = (par.oddRowMass * 100).toFixed(1);
  const even = (par.evenRowMass * 100).toFixed(1);
  return `<div class="bar"><span class="odd-seg" style="width:${odd}%">odd ${odd}%</span><span class="even-seg" style="width:${even}%">even ${even}%</span></div>`;
}

function comboSection(key, agg, max) {
  const [p1, p2] = key.split('__');
  const g = agg.games;
  return `
  <section class="combo">
    <header class="combo-head">
      <h2>${esc(p1)} <span class="vs">vs</span> ${esc(p2)}</h2>
      <div class="rates">
        <span><b>${pct(agg.p1Wins, g)}</b> P1</span>
        <span><b>${pct(agg.p2Wins, g)}</b> P2</span>
        <span><b>${pct(agg.draws, g)}</b> draws</span>
        <span class="muted">${g.toLocaleString()} games · ${agg.meanPlies.toFixed(1)} plies avg</span>
      </div>
    </header>
    <div class="boards">
      <div class="panel">
        <p class="panel-title"><span class="dot p1"></span>Player 1 (Green, first) &middot; ${agg.p1Wins.toLocaleString()} wins</p>
        ${boardHtml(agg.heatmaps?.[1], P1_RGB, max)}
        ${parityBar(agg.parity?.[1])}
      </div>
      <div class="panel">
        <p class="panel-title"><span class="dot p2"></span>Player 2 (Gray, second) &middot; ${agg.p2Wins.toLocaleString()} wins</p>
        ${boardHtml(agg.heatmaps?.[2], P2_RGB, max)}
        ${parityBar(agg.parity?.[2])}
      </div>
    </div>
  </section>`;
}

/**
 * Render a summary.json object into a full, self-contained HTML document.
 * @param {object} summary  keyed "<p1>__<p2>" → aggregate (from aggregate.mjs)
 * @param {{ combo?: string }} [opts]  combo: a single "<p1>__<p2>" key to render
 * @returns {string} complete HTML document
 */
export function renderReport(summary, opts = {}) {
  let keys = Object.keys(summary).sort();
  if (opts.combo) {
    if (!summary[opts.combo]) {
      throw new Error(`Unknown combo "${opts.combo}". Available: ${keys.join(', ') || '(none)'}`);
    }
    keys = [opts.combo];
  }
  if (!keys.length) throw new Error('summary.json contains no combos to render');

  const entries = keys.map((k) => [k, summary[k]]);
  const max = globalMax(entries);
  const sections = entries.map(([k, agg]) => comboSection(k, agg, max)).join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Winning-cell distribution — ${keys.length === 1 ? esc(keys[0].replace('__', ' vs ')) : `${keys.length} policy pairings`}</title>
<style>
  :root {
    --paper:#f5f4f1; --paper-2:#efede8; --ink:#1c1b19; --ink-2:#55524c; --ink-3:#8a867d;
    --rule:#d9d6ce; --p1:#3a7d44; --p2:#6b6f76; --odd:#b9832b; --even:#4a6b8a;
  }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--paper); color:var(--ink); line-height:1.5;
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif; -webkit-font-smoothing:antialiased; }
  .wrap { max-width:1040px; margin:0 auto; padding:40px 24px 64px; }
  .eyebrow { font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:var(--ink-3); font-weight:600; margin:0 0 10px; }
  h1 { font-size:clamp(24px,3.4vw,34px); line-height:1.14; margin:0 0 10px; letter-spacing:-.01em; font-weight:700; }
  .lede { font-size:16px; color:var(--ink-2); max-width:70ch; margin:0 0 6px; }
  .scale { display:flex; align-items:center; gap:10px; font-size:11.5px; color:var(--ink-3); margin:18px 0 30px; }
  .scale-grad { height:12px; width:150px; border-radius:6px; }
  .combo { border-top:1px solid var(--rule); padding:26px 0 6px; }
  .combo-head { display:flex; flex-wrap:wrap; align-items:baseline; justify-content:space-between; gap:8px 20px; margin:0 0 18px; }
  .combo-head h2 { font-size:21px; margin:0; letter-spacing:-.005em; }
  .vs { color:var(--ink-3); font-weight:400; font-size:.8em; }
  .rates { display:flex; flex-wrap:wrap; gap:14px; font-size:13.5px; color:var(--ink-2); font-variant-numeric:tabular-nums; }
  .rates b { color:var(--ink); font-weight:650; }
  .rates .muted { color:var(--ink-3); }
  .boards { display:grid; grid-template-columns:1fr 1fr; gap:26px; }
  .panel { min-width:0; }
  .panel-title { display:flex; align-items:center; gap:8px; font-size:13px; font-weight:650; margin:0 0 12px; color:var(--ink-2); }
  .dot { width:11px; height:11px; border-radius:50%; flex:none; } .dot.p1 { background:var(--p1); } .dot.p2 { background:var(--p2); }
  .grid-scroll { overflow-x:auto; }
  .board { display:grid; grid-template-columns:24px repeat(7,1fr); gap:3px; min-width:290px; }
  .cell { aspect-ratio:1/1; border-radius:5px; display:flex; align-items:center; justify-content:center;
    font-size:11px; font-weight:600; font-variant-numeric:tabular-nums; }
  .rowlab,.collab { display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700; color:var(--ink-3); }
  .rowlab { flex-direction:column; gap:1px; } .rowlab .par { font-size:8px; letter-spacing:.06em; }
  .rowlab .par.odd { color:var(--odd); } .rowlab .par.even { color:var(--even); } .collab { height:18px; }
  .bar { height:22px; border-radius:6px; display:flex; overflow:hidden; font-size:11px; font-weight:650; color:#fff; margin-top:12px; max-width:340px; }
  .bar span { display:flex; align-items:center; justify-content:center; font-variant-numeric:tabular-nums; white-space:nowrap; }
  .bar .odd-seg { background:var(--odd); } .bar .even-seg { background:var(--even); }
  .nowins { display:flex; align-items:center; justify-content:center; min-height:180px; border:1px dashed var(--rule);
    border-radius:8px; color:var(--ink-3); font-size:13px; font-style:italic; padding:0 16px; text-align:center; }
  footer { margin-top:40px; padding-top:20px; border-top:1px solid var(--rule); font-size:13px; color:var(--ink-2); max-width:74ch; }
  @media (max-width:720px) { .boards { grid-template-columns:1fr; } }
</style>
</head>
<body>
<div class="wrap">
  <p class="eyebrow">Connect Four · winning-cell probability</p>
  <h1>Where winning fours land, by playing policy</h1>
  <p class="lede">Each square is the probability that it belongs to the winning four-in-a-row, conditioned on that player winning. Board-oriented: row 1 is the bottom, columns 1&ndash;7 left to right. Odd rows (O) favour player 1, even rows (E) favour player 2.</p>
  <div class="scale">
    <span>0.00</span>
    <div class="scale-grad" style="background:linear-gradient(90deg,${ramp(P1_RGB, 0)},${ramp(P1_RGB, 1)})" title="Player 1"></div>
    <div class="scale-grad" style="background:linear-gradient(90deg,${ramp(P2_RGB, 0)},${ramp(P2_RGB, 1)})" title="Player 2"></div>
    <span>${max.toFixed(2)}</span>
    <span style="margin-left:6px">shared max across all heatmaps below</span>
  </div>
  ${sections}
  <footer>Generated from <code>summary.json</code> by <code>visualize.mjs</code>. Policies: <b>optimal</b> (solver-optimal), <b>mp10</b>/<b>mp25</b> (10%/25% random mistakes), <b>blocker</b> (solver-free defensive random). Parity mass per <code>docs/knowledge-base/allen-parity.md</code>.</footer>
</div>
</body>
</html>
`;
}

function parseArgs(argv) {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const args = { summary: null, data: null, combo: null, out: null };
  const need = (i, flag) => { if (argv[i] === undefined) { console.error(`Missing value for ${flag}`); process.exit(1); } return argv[i]; };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') { console.log(HELP); process.exit(0); }
    else if (a === '--summary') args.summary = need(++i, a);
    else if (a === '--data') args.data = need(++i, a);
    else if (a === '--combo') args.combo = need(++i, a);
    else if (a === '--out') args.out = need(++i, a);
    else { console.error(`Unknown arg: ${a}\n${HELP}`); process.exit(1); }
  }
  const summaryPath = args.summary
    ?? join(args.data ?? join(scriptDir, 'data'), 'summary.json');
  return { summaryPath, combo: args.combo, out: args.out };
}

function main() {
  const { summaryPath, combo, out } = parseArgs(process.argv);
  let summary;
  try {
    summary = JSON.parse(readFileSync(summaryPath, 'utf8'));
  } catch (e) {
    console.error(`Could not read summary at ${summaryPath}: ${e.message}\nRun aggregate.mjs first to produce it.`);
    process.exit(1);
  }
  const comboKey = combo ? combo.replace(':', '__') : null;
  const html = renderReport(summary, comboKey ? { combo: comboKey } : {});
  const outPath = out ?? join(dirname(summaryPath), 'report.html');
  writeFileSync(outPath, html);
  const n = comboKey ? 1 : Object.keys(summary).length;
  console.log(`Wrote ${outPath} (${n} combo${n === 1 ? '' : 's'}). Open it in a browser.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
