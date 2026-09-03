#!/usr/bin/env node
// build_release_dashboard.mjs — Step 7. Emits ONE self-contained HTML at a stable path,
// overwritten on every regeneration (no timestamped detritus).
//
// Usage: node server/scripts/reason_corpus/build_release_dashboard.mjs
// Output: docs/deep-reveal-release-dashboard.html

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RUNS = __dirname + '/runs';
const OUT = join(__dirname, '../../../../docs/deep-reveal-release-dashboard.html');

const jl = (p) => readFileSync(p, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
const byId = (rows) => Object.fromEntries(rows.map((r) => [r.id, r]));

const TAG = /\[(zone|term):([^\]!]+)(!?)\](.*?)\[\/\1:\2!?\]/gs;
const visible = (t) => {
  if (typeof t !== 'string') return '';
  let prev, out = t;
  do { prev = out; out = out.replace(TAG, '$4'); } while (out !== prev);
  return out;
};

const DS = {
  new:  { answers: 'fv_suff_answers_boards_2026-08-28T18-35-46Z',           n: 3, label: 'Current (2026-08-28, EN)' },
  base: { answers: 'fv_suff_answers_boards_subset_2026-08-26T15-47-56Z_served', n: 5, label: 'Baseline (2026-08-26, EN)' },
  es:   { answers: 'fv_suff_answers_boards_2026-08-31T12-52-38Z',            n: 3, label: 'Current (2026-08-31, ES)' },
  old:  { answers: 'fv_suff_answers_boards_2026-08-06T16-04-29Z_served',   n: 2, label: 'Older baseline (2026-08-06, EN)' },
  v3:   { answers: 'fv_suff_answers_boards_v3retry63_2026-09-01T20-55-54Z',  n: 3, label: 'Retry + rubric v3 (2026-09-01, EN)' },
};

function loadSet(key) {
  const d = DS[key];
  const ans = jl(`${RUNS}/${d.answers}.jsonl`);
  const grades = byId(jl(`${RUNS}/${d.answers}_grades.jsonl`));
  const runsById = {};
  for (const r of ans) (runsById[r.id] ??= []).push(r);
  const cases = Object.keys(grades).sort().map((id) => {
    const g = grades[id];
    const rs = (runsById[id] ?? []).sort((a, b) => a.run_index - b.run_index);
    const fv = rs[0]?.feature_vector ?? {};
    return {
      id, n: rs.length, case_pass: g.case_pass, intermittent: g.intermittent,
      triage: g.failure_triage ?? null, summary: g.failure_summary ?? '',
      movestring: fv.movestring ?? '', playedCol: fv.playedCol, bestCol: fv.bestCol, kase: fv.case ?? '',
      runs: rs.map((r, i) => ({
        i: r.run_index,
        served: visible(r.servedExplanation ?? r.answer?.mechanism ?? ''),
        axes: g.per_run?.[i] ?? {},
      })),
    };
  });
  return { label: d.label, n: d.n, cases };
}

const AXES = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'G1', 'G7'];
// grade_mechanical.mjs computes these deterministically from the vector, so they mean the same
// thing under rubric v1 and v2. Every other axis is a grader judgment and is NOT comparable
// across a rubric change.
const RUBRIC_INDEPENDENT = ['A1', 'A2', 'A6'];
function axisRates(cases) {
  const t = {};
  for (const c of cases) for (const r of c.runs) for (const a of AXES) {
    const v = r.axes[a]; if (v == null) continue;
    t[a] ??= { p: 0, g: 0 }; t[a].g++; if (v === 'pass') t[a].p++;
  }
  return t;
}

// ── All graded runs: comparability map ──────────────────────────────────────────
// Every answers file in runs/ that has a `_grades.jsonl` sidecar. Rubric version and
// dispatch-wrapper identity come from runs/README.md's "Grader rubric versions" ledger —
// the authoritative record — NOT from filenames. `retry` is read from the answers rows
// themselves (`retry_fired` exists only on runs generated with --retry). `locale` was
// verified by reading each run's served text, not assumed from the stem.
const RUN_META = {
  'fv_suff_answers_boards_v3retry63_2026-09-01T20-55-54Z':        { date: '2026-09-01', rubric: 'v3',   locale: 'EN' },
  'fv_suff_answers_boards_smoke_a7wave1_2026-09-01T16-55-47Z':    { date: '2026-09-01', rubric: 'v2',   locale: 'EN', note: '14-case A7 counterexample subset, not the corpus' },
  'fv_suff_answers_boards_2026-08-31T12-52-38Z':                  { date: '2026-08-31', rubric: 'v2?',  locale: 'ES', note: 'rubric version not recorded in runs/README.md; provably NOT v3 (v3 was created 2026-09-01, this run was graded 2026-08-31) — v2 is near-certain' },
  'fv_suff_answers_boards_2026-08-28T18-35-46Z':                  { date: '2026-08-28', rubric: 'v2',   locale: 'EN' },
  'fv_suff_answers_boards_subset_2026-08-28T14-59-41Z':           { date: '2026-08-28', rubric: '—',    locale: 'EN', note: '8-case sanity run; rubric not recorded' },
  'epic12_sanity_OLD':                                            { date: 'unknown',    rubric: '—',    locale: 'EN', note: '8-case sanity run; no timestamp in stem, rubric not recorded' },
  'fv_suff_answers_boards_subset_2026-08-26T15-47-56Z_served':    { date: '2026-08-26', rubric: 'v2',   locale: 'EN', note: 're-graded under v2 on the post-guard served string' },
  'fv_suff_answers_boards_subset_2026-08-26T15-47-56Z':           { date: '2026-08-26', rubric: 'v1',   locale: 'EN', note: 'DEVIATED dispatch — listed open issues by number; confounded A5' },
  'fv_suff_answers_boards_subset_2026-08-25T20-16-50Z':           { date: '2026-08-25', rubric: 'v1',   locale: 'EN' },
  'fv_suff_answers_boards_subset_2026-08-25T15-57-08Z':           { date: '2026-08-25', rubric: 'v1',   locale: 'EN' },
  'fv_suff_answers_boards_subset_2026-08-23T15-16-19Z':           { date: '2026-08-23', rubric: 'v1',   locale: 'EN' },
  'fv_suff_answers_boards_subset_2026-08-21T21-19-32Z':           { date: '2026-08-21', rubric: 'v1',   locale: 'EN' },
  'fv_suff_answers_arm1-baseline-mini-n5_2026-08-11T18-32-47Z':   { date: '2026-08-11', rubric: '—',    locale: 'EN', note: 'pre-freeze, graded by the skill directly — not comparable to v1/v2' },
  'fv_suff_answers_boards_2026-08-06T16-04-29Z_served':           { date: '2026-08-06', rubric: 'v2',   locale: 'EN', note: 're-graded 2026-09-01 (63 agents) on the post-guard served string' },
  'fv_suff_answers_boards_2026-08-06T16-04-29Z':                  { date: '2026-08-06', rubric: '—',    locale: 'EN', note: 'pre-freeze, graded by the skill directly — not comparable to v1/v2' },
};

function loadAllRuns() {
  const files = readdirSync(RUNS).filter((f) => f.endsWith('_grades.jsonl'));
  const out = [];
  for (const f of files) {
    const stem = f.replace(/_grades\.jsonl$/, '');
    let ans, grades;
    try { ans = jl(`${RUNS}/${stem}.jsonl`); grades = jl(`${RUNS}/${f}`); }
    catch { continue; }                                  // sidecar with no answers file
    const meta = RUN_META[stem] ?? { date: 'unknown', rubric: '—', locale: 'EN', note: 'not in the runs/README.md ledger' };
    const retryOn = ans.some((r) => r.retry_fired !== undefined);
    const retryFired = ans.filter((r) => r.retry_fired).length;
    const ids = new Set(ans.map((r) => r.id));
    const nRuns = new Set(ans.map((r) => r.run_index)).size;
    const models = [...new Set(ans.map((r) => r.model).filter(Boolean))];
    const t = {};
    for (const g of grades) for (const r of (g.per_run ?? [])) for (const a of AXES) {
      const v = r[a]; if (v == null) continue;
      t[a] ??= { p: 0, g: 0 }; t[a].g++; if (v === 'pass') t[a].p++;
    }
    const cp = grades.filter((g) => g.case_pass).length;
    out.push({
      stem, date: meta.date, rubric: meta.rubric, note: meta.note ?? '', locale: meta.locale,
      cases: ids.size, gradedCases: grades.length, n: nRuns, rows: ans.length,
      model: models.join(', ') || '—', retry: retryOn, retryFired, casePass: cp, rates: t,
    });
  }
  // newest first; 'unknown' dates sort last
  out.sort((a, b) => (b.date === 'unknown' ? '' : b.date).localeCompare(a.date === 'unknown' ? '' : a.date) || a.stem.localeCompare(b.stem));
  // Comparability group = (rubric, retry, eval-set size, locale). Same chip ⇒ directly comparable.
  // The table spec named the first three; locale is added deliberately because it demonstrably moves
  // the judgment axes (the ES run's A5 collapse is a prompt defect, not model quality), so grouping an
  // ES run with an EN one would invite exactly the comparison the chip exists to prevent.
  const seen = new Map();
  for (const r of out) {
    const key = `${r.rubric}|${r.retry ? 'retry' : 'single'}|${r.cases}|${r.locale}`;
    if (!seen.has(key)) seen.set(key, String.fromCharCode(65 + seen.size));
    r.group = seen.get(key); r.groupKey = key;
  }
  return out;
}
const allRuns = loadAllRuns();

const data = { new: loadSet('new'), base: loadSet('base'), es: loadSet('es'), old: loadSet('old'), v3: loadSet('v3') };
// restrict the current EN set to the baseline's boards for the paired comparison
const baseIds = new Set(data.base.cases.map((c) => c.id));
data.newOverlap = { label: 'Current, baseline boards only', n: 3, cases: data.new.cases.filter((c) => baseIds.has(c.id)) };

const payload = {
  allRuns,
  sets: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, { label: v.label, n: v.n, cases: v.cases }])),
  rates: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, axisRates(v.cases)])),
  variance: {
    caseVerdict: [10, 10], triage: [8, 10], intermittency: [8, 10], perAxis: [435, 460],
    perAxisRate: { A4: 20, A7: 20, G1: 20, G5: 10, G4: 5, G7: 5, A1: 0, A2: 0, A3: 0, A5: 0, A6: 0, G2: 0, G3: 0, G6: 0 },
  },
  frequency: {
    games: 40, blunders: 229, rendered: 193, renderErrors: 36, seed: 12345,
    detectors: [
      { name: 'Required handle points at an occupied square', hits: 4, rate: 2.1, heuristic: false,
        note: 'The coach is obliged to name a square that is not empty. Verified by hand on eval-47.' },
      { name: 'Horizontal line labelled by a column', hits: 22, rate: 11.4, heuristic: false,
        note: 'A row-shaped line given a column locator; the model echoes it as "your line in column N".' },
      { name: 'One role string covering two different squares', hits: 72, rate: 37.3, heuristic: false,
        note: 'Two handles share byte-identical role text, so nothing distinguishes them in prose.' },
      { name: 'Guardrail demands a line the required set omits', hits: 89, rate: 46.1, heuristic: true,
        note: 'HEURISTIC — the guardrail match is not confirmed at source. Treat as an upper bound.' },
    ],
  },
};

const AXIS_MEANING = {
  A1: 'better_move matches the solver', A2: 'outcome labels match the case',
  A3: 'the named mechanism is real', A4: 'nothing fabricated about the board',
  A5: 'coach voice (2nd person, no internal jargon)', A6: 'the prose names the better column',
  A7: 'useful to the player who blundered', G1: 'used the handles it was required to use',
  G7: 'annotation discipline',
};

const html = `<title>Deep Reveal Release Evidence</title>
<style>
:root{--bg:#fbfaf8;--fg:#1c1a17;--mut:#6b6560;--line:#e3ded7;--card:#fff;--ok:#2f7a55;--bad:#b4443a;--warn:#9a6b1f;--accent:#3b5bdb}
:root:not([data-theme=light]){}
@media(prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#16151a;--fg:#eae7e2;--mut:#a09a94;--line:#2e2b33;--card:#1e1d23;--ok:#5fbf8e;--bad:#e8776b;--warn:#d6a544;--accent:#8ea4ff}}
:root[data-theme=dark]{--bg:#16151a;--fg:#eae7e2;--mut:#a09a94;--line:#2e2b33;--card:#1e1d23;--ok:#5fbf8e;--bad:#e8776b;--warn:#d6a544;--accent:#8ea4ff}
*{box-sizing:border-box}
body{background:var(--bg);color:var(--fg);font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:0;padding:0 20px 80px}
.wrap{max-width:1080px;margin:0 auto}
h1{font-size:26px;margin:34px 0 4px;letter-spacing:-.02em}
h2{font-size:19px;margin:38px 0 6px;letter-spacing:-.01em}
h3{font-size:15px;margin:22px 0 6px}
.sub{color:var(--mut);margin:0 0 18px}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:16px 18px;margin:14px 0}
table{border-collapse:collapse;width:100%;font-size:14px}
th,td{text-align:left;padding:7px 10px;border-bottom:1px solid var(--line);vertical-align:top}
th{color:var(--mut);font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.05em}
.num{font-variant-numeric:tabular-nums}
.ok{color:var(--ok)}.bad{color:var(--bad)}.warn{color:var(--warn)}
.pill{display:inline-block;padding:1px 8px;border-radius:99px;font-size:12px;border:1px solid var(--line);color:var(--mut)}
.bar{height:7px;background:var(--line);border-radius:4px;overflow:hidden;min-width:90px}
.bar>i{display:block;height:100%;background:var(--accent)}
.note{font-size:13px;color:var(--mut);border-left:2px solid var(--line);padding-left:10px;margin:8px 0}
.caveat{background:color-mix(in srgb,var(--warn) 9%,transparent);border-left:3px solid var(--warn);padding:9px 12px;border-radius:0 6px 6px 0;font-size:13.5px;margin:10px 0}
button{font:inherit;background:var(--card);color:var(--fg);border:1px solid var(--line);border-radius:7px;padding:6px 12px;cursor:pointer}
button[aria-pressed=true]{border-color:var(--accent);color:var(--accent)}
.case{border:1px solid var(--line);border-radius:8px;margin:7px 0;background:var(--card)}
.case>summary{cursor:pointer;padding:9px 12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.case>div{padding:0 14px 14px}
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12.5px}
.served{background:color-mix(in srgb,var(--fg) 4%,transparent);border-radius:6px;padding:9px 11px;margin:6px 0;font-size:14px}
.axes{display:flex;gap:5px;flex-wrap:wrap;margin:5px 0}
.ax{font-size:11px;padding:1px 6px;border-radius:4px;border:1px solid var(--line);font-family:ui-monospace,monospace}
.ax.p{color:var(--ok);border-color:color-mix(in srgb,var(--ok) 40%,var(--line))}
.ax.f{color:var(--bad);border-color:color-mix(in srgb,var(--bad) 45%,var(--line));background:color-mix(in srgb,var(--bad) 8%,transparent)}
.scroll{overflow-x:auto}
.chip{display:inline-flex;align-items:center;justify-content:center;width:19px;height:19px;border-radius:5px;font-size:11.5px;font-weight:700;color:#fff}
.runs td,.runs th{white-space:nowrap}
.runs td.stem{white-space:normal;max-width:290px}
.runs tr>td:first-child{border-left:4px solid var(--g)}
.runs tr>th:first-child{border-left:4px solid transparent}
.hm{text-align:center;font-variant-numeric:tabular-nums;border-radius:4px}
.partial{background:color-mix(in srgb,var(--bad) 16%,transparent);font-weight:600}
.legend{font-size:13px}
.legend td,.legend th{padding:5px 9px}
.grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px}
@media(max-width:640px){h1{font-size:22px}}
</style>
<div class=wrap>
<h1>Deep Reveal — Release Evidence</h1>
<p class=sub id=stamp></p>
<div class=caveat><b>Read every number with these three limits.</b> (1) The corpus is built for case-type coverage with rare cases over-sampled — its rates are <b>per case type, not per player encounter</b>; only §3's frequency panel is per encounter. (2) Most runs here are <b>single-attempt</b> while production retries once, so their numbers are a <b>floor on quality, not a player-facing defect rate</b> (OI-183) — the exception is the <b>retry-on</b> run (chip B), the first ever to exercise that path, which is exactly why it is not comparable to the rows above it. (3) The three judgment axes carry a measured <b>±20% grader disagreement</b> — see §3.</div>
<div id=app></div>
</div>
<script>
const D=${JSON.stringify(payload)};
const AM=${JSON.stringify(AXIS_MEANING)};
const RI=${JSON.stringify(RUBRIC_INDEPENDENT)};
const AX=${JSON.stringify(AXES)};
const pct=(p,g)=>g?Math.round(100*p/g):0;
const esc=s=>String(s??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
let baseline='base';

function rateRow(a,A,B){
  const ra=A[a],rb=B?B[a]:null;
  if(!ra)return '';
  const va=pct(ra.p,ra.g), vb=rb?pct(rb.p,rb.g):null;
  // Both baselines are graded under rubric v2 (08-06 re-graded 2026-09-01, 63 agents), so every
  // axis is scored by the same instrument on both sides and every delta is a real comparison.
  const d=vb==null?null:va-vb;
  const noisy=(D.variance.perAxisRate[a]??0)>=20;
  const dTxt=d==null?'—':(d>0?'+':'')+d+(noisy&&Math.abs(d)<=20?' <span class=pill title="within the measured ±20% grader disagreement on this axis">noise</span>':'');
  return \`<tr><td><b>\${a}</b> <span style="color:var(--mut)">\${AM[a]||''}</span></td>
  <td class=num>\${vb==null?'—':vb+'%'}</td><td class=num>\${va}%</td>
  <td class="num \${d>0?'ok':d<0?'bad':''}">\${dTxt}</td>
  <td><div class=bar><i style="width:\${va}%"></i></div></td></tr>\`;
}

const GROUP_COLORS=['#3b5bdb','#2f7a55','#b4443a','#9a6b1f','#7048b6','#0b7285','#a61e4d','#5c7cfa','#495057'];
// Fixed 0-100 scale: hue 0 (red) -> 120 (green). Colour always means absolute quality.
function heat(v){
  if(v==null)return '';
  const h=Math.round(1.2*v);
  return 'background:hsl('+h+' 62% 47% / .20);color:inherit';
}
function runsTable(){
  const R=D.allRuns;
  const groups=[...new Set(R.map(r=>r.group))];
  const gc=g=>GROUP_COLORS[groups.indexOf(g)%GROUP_COLORS.length];
  document.getElementById('runlegend').innerHTML =
    '<div style="display:flex;gap:14px;flex-wrap:wrap;align-items:center;font-size:13px">'
    + groups.map(g=>{
        const ex=R.find(r=>r.group===g);
        return '<span style="display:inline-flex;gap:6px;align-items:center">'
          + '<span class=chip style="background:'+gc(g)+'">'+g+'</span>'
          + '<span style="color:var(--mut)">rubric '+esc(ex.rubric)+' · '+(ex.retry?'retry on':'single attempt')+' · '+ex.cases+' boards · '+esc(ex.locale)+'</span></span>';
      }).join('')
    + '</div><div class=note style="margin-top:8px">Same chip = directly comparable. Different chip = <b>do not compare the judgment axes</b> (A3–A5, A7, G1–G7); only A1, A2 and A6 travel across groups.</div>';

  const head='<tr><th>Run</th><th>Date</th><th>Cases</th><th>Runs</th><th>Rubric</th><th>Retry</th><th>Model</th><th>Loc</th>'
    + AX.map(a=>'<th title="'+(AM[a]||'')+'">'+a+'</th>').join('')+'</tr>';
  const body=R.map(r=>{
    const partial=r.cases<63;
    const cells=AX.map(a=>{
      const t=r.rates[a];
      if(!t)return '<td class=hm style="color:var(--mut)">—</td>';
      const v=pct(t.p,t.g);
      return '<td class=hm style="'+heat(v)+'" title="'+t.p+'/'+t.g+' runs">'+v+'</td>';
    }).join('');
    return '<tr style="--g:'+gc(r.group)+'">'
      + '<td class=stem><span class=chip style="background:'+gc(r.group)+'">'+r.group+'</span> '
      + '<span class=mono style="font-size:12px">'+esc(r.stem)+'</span>'
      + (r.note?'<div style="color:var(--mut);font-size:12px;margin-top:2px">'+esc(r.note)+'</div>':'')+'</td>'
      + '<td class=num>'+esc(r.date)+'</td>'
      + '<td class="num'+(partial?' partial':'')+'" title="'+(partial?'partial eval set — fewer than the full 63 boards':'full corpus')+'">'+r.cases+'</td>'
      + '<td class=num>'+r.n+'</td>'
      + '<td>'+esc(r.rubric)+'</td>'
      + '<td>'+(r.retry?'<b class=ok>on</b> <span style="color:var(--mut)">('+r.retryFired+'/'+r.rows+')</span>':'<span style="color:var(--mut)">off</span>')+'</td>'
      + '<td class=mono style="font-size:12px">'+esc(r.model)+'</td>'
      + '<td>'+esc(r.locale)+'</td>'
      + cells+'</tr>';
  }).join('');
  document.getElementById('runstable').innerHTML=head+body;
}

function caseCard(c){
  const st=c.case_pass?'<span class=ok>pass</span>':'<span class=bad>fail</span>';
  const tri=c.triage?'<span class=pill>'+c.triage+'</span>':'';
  const per=c.intermittent?'<span class=pill>intermittent</span>':(c.case_pass?'':'<span class=pill>all runs</span>');
  return \`<details class=case><summary><b>\${esc(c.id)}</b> \${st} \${tri} \${per}
    <span class="pill mono">\${esc(c.kase||'')}</span>
    <span style="margin-left:auto;color:var(--mut)" class=mono>\${c.n} runs</span></summary>
   <div>
    <div class=mono style="color:var(--mut);margin:2px 0 8px">movestring <b>\${esc(c.movestring)}</b> · played col \${c.playedCol+1} · better col \${c.bestCol+1} <span class=pill>display 1-indexed</span></div>
    \${c.summary?'<div class=note><b>Grader:</b> '+esc(c.summary)+'</div>':''}
    \${c.runs.map(r=>\`<div style="margin:10px 0">
      <div class=axes><span class=mono style="color:var(--mut)">run \${r.i}</span>
      \${AX.map(a=>r.axes[a]==null?'':'<span class="ax '+(r.axes[a]==='pass'?'p':'f')+'" title="'+(AM[a]||'')+'">'+a+'</span>').join('')}</div>
      <div class=served>\${esc(r.served)||'<i style="color:var(--mut)">(empty)</i>'}</div>
    </div>\`).join('')}
   </div></details>\`;
}

function render(){
  const afterKey = baseline==='old' ? 'new' : 'newOverlap';
  const cur=D.sets[afterKey], base=D.sets[baseline];
  const RA=D.rates[afterKey], RB=D.rates[baseline];
  const app=document.getElementById('app');
  app.innerHTML=\`
  <h2>All graded runs — comparability map</h2>
  <div class=card>
   <p class=sub style="margin-bottom:12px">Every eval run that has been graded, newest first. Each run scores one set of blunder
   explanations on axes <b>A1–A7</b> (is the coaching true, in the coach's voice, and useful to the player who
   blundered?) and <b>G1/G7</b> (did it use the board handles it was told to use, and wrap them honestly?).
   <b>Numbers are only comparable within a colour group.</b> A run's chip encodes its
   <i>instrument</i> — rubric version, whether production's retry was exercised, and eval-set size; change any one and the
   judgment axes move for reasons that have nothing to do with the code. Even inside a group, the judgment axes
   (A4, A7, G1) carry a measured <b>±20–24% run-level grader disagreement</b>, Opus-vs-Opus — so treat small
   deltas as noise. A1/A2/A6 are computed by script and are comparable everywhere.</p>

   <h3>What each instrument change does to A7</h3>
   <div class=scroll><table class=legend><tr><th>Change</th><th>Expected effect</th><th>Measured basis</th></tr>
    <tr><td>rubric <b>v2 → v3</b></td><td class=bad><b>↓ lower</b></td><td>v3 appends the A7e SEVERITY subtest, which can only <i>add</i> failures. Triggers on 10 of 63 records; 25 of their 30 v2 runs passed A7, so worst case 114/189 (60.3%) → 89/189 (47.1%).</td></tr>
    <tr><td>retry <b>off → on</b></td><td class=ok><b>↑ higher</b></td><td>Retry fires on ~43–50% of runs and recovers ~91% of those. Only a retry-on run reflects what production actually serves.</td></tr>
    <tr><td><b>63 → subset</b></td><td class=warn><b>not comparable</b></td><td>The 25- and 14-case subsets deliberately over-sample hard and rare cases, so their rates are not corpus rates in absolute terms.</td></tr>
    <tr><td><b>model change</b></td><td>direction unknown</td><td>Noted, never predicted.</td></tr>
   </table></div>

   <div id=runlegend style="margin:14px 0 8px"></div>
   <div class=scroll><table class=runs id=runstable></table></div>
   <p class=note>Cell colour is a fixed 0–100 scale — green is a high absolute rate, red a low one. It never
   encodes a rank within the row. A red <b>cases</b> cell marks a partial eval set (fewer than the full 63 boards).</p>
  </div>

  <h2>1 · The comparison</h2>
  <div class=card>
   <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px">
    <span style="color:var(--mut);font-size:13px">Baseline:</span>
    <button aria-pressed="\${baseline==='base'}" onclick="setBase('base')">08-26 · 25 boards · n=5</button>
    <button aria-pressed="\${baseline==='old'}" onclick="setBase('old')">08-06 · 63 boards · n=2</button>
   </div>
   \${baseline==='base'
     ? \`<div class=caveat><b>Clean Epic-12 delta.</b> The code state immediately before this work, graded under the <b>same rubric v2</b> as the current run. Narrower board coverage (25 of 63), compared against those same 25 boards.</div>\`
     : \`<div class=caveat><b>Full coverage, two epics.</b> All 63 boards, compared against the full 63-board current run — nothing sampled away, and <b>re-graded under rubric v2</b> (63 agents, 2026-09-01) so every axis is scored by the same instrument as the current run. One thing to hold: this run predates <b>Epic 11 as well as Epic 12</b>, so any movement is the sum of both, not this work alone. Note also that <b>33% of its boards carry an empty <span class=mono>requiredSet</span></b> (mean size 1.44 vs 3.00 today) — G1 asks whether the answer used the handles it was required to use, so on those boards there was nothing to fail.</div>\`}
   <p>Baseline set: <b>\${esc(base.label)}</b> — \${base.cases.length} cases × \${base.n} runs, gpt-5.4-mini, condition D. Compared against <b>\${cur.cases.length} boards</b> of the current run.</p>

   <h3>Per-run axis rates — before vs after</h3>
   <p class=note>Per-<b>run</b> rates, not case-pass: a case passes only if every run passes every axis, so case-pass is not comparable across datasets with different <span class=mono>n</span> (\${base.n} vs \${cur.n} here). It is deliberately not shown.</p>
   <div class=scroll><table><tr><th>Axis</th><th>Before</th><th>After</th><th>Δ</th><th></th></tr>
   \${AX.map(a=>rateRow(a,RA,RB)).join('')}</table></div>
   \${baseline==='base'
     ? \`<div class=caveat><b>Only A6 moved.</b> +14 points (p=0.012) on an axis with <b>0/40 grader disagreement</b> — the one solid win of this epic. A7 −10 and G1 −6 both sit inside the ±20% disagreement measured on those axes, so they are <b>no measured change</b>, not regressions.</div>\`
     : \`<div class=caveat><b>Three axes moved beyond noise — but across two epics.</b> A6 +20, G7 +18, A5 +8 (all p≤0.001). Against the 08-26 baseline only A6 moves, so G7 and A5 are largely <b>Epic 11's</b> contribution, not this work. A4 +11, A7 +6 and G1 −4 all sit inside the ±20% grader noise on those axes.<br><br><b>A7 is not monotonic across the three datasets</b> — 08-06 54%, 08-26 77%, current 60%. The middle value is the only one measured on 25 boards rather than 63, so the two baselines disagree about A7's direction and the noise band covers both gaps. Read A7 as <b>not measurably improved by either epic</b>, not as a rise or a fall.</div>\`}
  </div>

  <h2>2 · Where it stands now</h2>
  <div class=card>
   <p>Full current corpus: <b>63 boards × 3 runs</b> (189 runs), gpt-5.4-mini, condition D — the same builder production calls.</p>
   <div class=scroll><table><tr><th>Axis</th><th>Full corpus</th><th>Runs</th></tr>
   \${AX.map(a=>{const r=D.rates.new[a];return r?\`<tr><td><b>\${a}</b> <span style="color:var(--mut)">\${AM[a]}</span></td><td class="num \${pct(r.p,r.g)>=90?'ok':pct(r.p,r.g)>=70?'warn':'bad'}">\${pct(r.p,r.g)}%</td><td class="num" style="color:var(--mut)">\${r.p}/\${r.g}</td></tr>\`:'';}).join('')}
   </table></div>
   <div class=caveat><b>A7 is the release question.</b> "Useful to the player who blundered" sits far below the mechanical axes. A4 means roughly one run in seven asserts something the board does not support. Both carry ±20% grader noise.</div>
  </div>

  <h2>3 · How far can these numbers be trusted?</h2>
  <div class=card>
   <h3>How much of this is the instrument?</h3>
   <p>Five cases were re-graded blind on both sides by fresh agents (10 agents, identical dispatch).</p>
   <div class=scroll><table>
    <tr><th>Measure</th><th>Agreement</th></tr>
    <tr><td>Case verdict (pass/fail)</td><td class="num ok">\${D.variance.caseVerdict[0]}/\${D.variance.caseVerdict[1]}</td></tr>
    <tr><td>Triage (render vs model)</td><td class="num warn">\${D.variance.triage[0]}/\${D.variance.triage[1]}</td></tr>
    <tr><td>Intermittency</td><td class="num warn">\${D.variance.intermittency[0]}/\${D.variance.intermittency[1]}</td></tr>
    <tr><td>Per-axis, per-run</td><td class="num">\${D.variance.perAxis[0]}/\${D.variance.perAxis[1]} (\${(100*D.variance.perAxis[0]/D.variance.perAxis[1]).toFixed(1)}%)</td></tr>
   </table></div>
   <h3 style="margin-top:16px">Disagreement is concentrated, not spread</h3>
   <div class=scroll><table><tr><th>Axis</th><th>Disagreement</th><th></th></tr>
   \${Object.entries(D.variance.perAxisRate).sort((a,b)=>b[1]-a[1]).map(([a,v])=>\`<tr><td><b>\${a}</b> <span style="color:var(--mut)">\${AM[a]||''}</span></td><td class="num \${v>=20?'bad':v>0?'warn':'ok'}">\${v}%</td><td><div class=bar><i style="width:\${v*5}%;background:\${v>=20?'var(--bad)':'var(--accent)'}"></i></div></td></tr>\`).join('')}
   </table></div>
   <div class=caveat>The deterministic axes are perfectly reproducible (0%). The three <b>judgment</b> axes — A4, A7, G1 — each disagree one run in five. <b>Per-case triage labels are attribution hypotheses, not counts to sum.</b></div>
  </div>

  <div class=card>
   <h3>How often would a real player hit this?</h3>
   <div class=caveat><b>Measured 2026-08-28, before the D61 render fixes of 2026-09-02.</b> Two of the rates below describe defects since fixed — board-false “completing” roles and the offered-but-unrequired fork pivot. Accurate as history; re-run <span class=mono>frequency_probe.mjs</span> before quoting them as current.</div>
   <p>Blunders harvested from <b>\${D.frequency.games} simulated games</b> → <b>\${D.frequency.blunders} blunders</b>, \${D.frequency.rendered} of which produced a render decision. Programmatic detectors only — no model, no graders, so no ±20%.</p>
   <div class=scroll><table><tr><th>Render defect</th><th>Rate per blunder</th><th></th></tr>
   \${D.frequency.detectors.map(d=>\`<tr><td><b>\${esc(d.name)}</b>\${d.heuristic?' <span class="pill warn">heuristic</span>':''}<div style="color:var(--mut);font-size:12.5px">\${esc(d.note)}</div></td><td class="num \${d.rate>=30?'bad':d.rate>=10?'warn':''}">\${d.rate}%</td><td><div class=bar><i style="width:\${d.rate}%;background:\${d.rate>=30?'var(--bad)':'var(--accent)'}"></i></div></td></tr>\`).join('')}
   </table></div>
   <div class=caveat><b>This panel is silent on the two axes that matter most.</b> A4 (fabrication) and A7 (usefulness) have no programmatic detector, so they are <b>not represented here at all</b>. It measures how often the machinery misfires, not how often the coaching is unhelpful. Also unexplained: <b>\${D.frequency.renderErrors} of \${D.frequency.blunders} blunders (\${Math.round(100*D.frequency.renderErrors/D.frequency.blunders)}%) produced no render decision</b> — not yet triaged.</div>
  </div>

  <h2>4 · What this did not fix</h2>
  <div class=card>
   <h3>Verified in source, not inferred from a grader</h3>
   <table>
    <tr><th>Defect</th><th>Where</th><th>Scope</th></tr>
    <tr><td><b>Spanish prompt contradicts itself</b><div style="color:var(--mut);font-size:12.5px">buildTask says the coach must never name players by colour; the Spanish directive then orders "refer to the two discs as verde and gris". The model obeys the later instruction.</div></td><td class=mono>compute.mjs:241<br>compute.mjs:255-258</td><td class="num bad">109/189 ES runs<br>54/63 boards</td></tr>
    <tr><td><b>Deep-horizon framing is unconditional</b><div style="color:var(--mut);font-size:12.5px">mk() appends the deep-resource guardrail and horizon tail with no register gate, so a fork landing next ply is described as settling "a long way out".</div></td><td class=mono>openingFrame.mjs:128-142</td><td>every opening frame</td></tr>
    <tr><td><b>Horizontal lines labelled by column</b><div style="color:var(--mut);font-size:12.5px">A row-6 line spanning columns 4–7 is labelled "the one in column 4"; the model echoes "your line in column 4", which is board-false.</div></td><td class=mono>disambiguateSiblingRoles</td><td class="num warn">15/63 boards<br>11.4% of blunders</td></tr>
    <tr><td><b>Required handle on an occupied square</b><div style="color:var(--mut);font-size:12.5px">eval-47 requires a "fork pivot" at c3r6 on afterPlayed — the square the player just played. No answer can satisfy it.</div></td><td class=mono>requiredSet</td><td class="num">1/63 boards<br>2.1% of blunders</td></tr>
    <tr><td><b>Frames give the outcome, not the cause</b><div style="color:var(--mut);font-size:12.5px">L3/L5 supply only "the played move speeds up the finish", so every run restates the outcome. Both graders agreed independently on eval-37.</div></td><td class=mono>causalLinks.mjs L3/L5</td><td>eval-28, eval-37, eval-42</td></tr>
   </table>
   <p class=note><b>Fixed by this work:</b> terminal narration (OI-203) — eval-41 failed 5/5 on the baseline describing a game-ending move as "your threat to make four next move" with live aliases on a terminal board; it now passes 3/3. Also fixed: eval-16, eval-38, pin-branch-invariance-true-2. Two cases newly fail (eval-39, pin-branch-invariance-true-1), both single-run misses of the kind production's retry catches.</p>
   <p class=note><b>Withdrawn:</b> eval-34 was reported as a prompt_confusion→render_bug reclassification. Under blind re-grading it flipped on <i>both</i> sides in <i>opposite</i> directions, so it is grader noise and not a reclassification at all.</p>
  </div>

  <h2>5 · Read the actual explanations</h2>
  <div class=card>
   <p class=note>The owner's question is not a pass/fail bar — it is whether these read as a good coach. Every case is open below: board, movestring, the exact text a player is served, and the per-run axis grid.</p>
   <div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0">
    <button aria-pressed="\${view==='v3'}" onclick="setView('v3')">Retry + v3 · 63</button>
    <button aria-pressed="\${view==='new'}" onclick="setView('new')">Current EN · 63</button>
    <button aria-pressed="\${view==='base'}" onclick="setView('base')">Baseline EN · 25</button>
    <button aria-pressed="\${view==='es'}" onclick="setView('es')">Current ES · 25</button>
    <button aria-pressed="\${view==='old'}" onclick="setView('old')">Baseline 08-06 · 63</button>
    <button aria-pressed="\${onlyFail}" onclick="toggleFail()">failures only</button>
   </div>
   \${view==='old'?'<div class=caveat><b>Rubric v1 grades.</b> These axis chips were scored under the older rubric against the pre-guard <span class="mono">mechanism</span>; the served text shown below it was derived retroactively with the current guard. Read the prose freely; treat the chips on the judgment axes as historical.</div>':''}
   \${view==='es'?'<div class=caveat><b>Spanish has no baseline.</b> These are current-state numbers only — there is no before/after for ES. Its A5 collapse (99%→48% vs EN) is the self-contradicting prompt above, not model quality; on A7 and A6 Spanish scores <i>higher</i> than English.</div>':''}
   \${D.sets[view].cases.filter(c=>!onlyFail||!c.case_pass).map(caseCard).join('')}
  </div>\`;
  runsTable();
}
let view='v3', onlyFail=false;
function setBase(b){baseline=b;render()}
function setView(v){view=v;render()}
function toggleFail(){onlyFail=!onlyFail;render()}
document.getElementById('stamp').textContent='Generated '+new Date().toISOString().slice(0,10)+' · condition D · gpt-5.4-mini throughout · one instrument (rubric v2) on both sides';
render();
</script>`;

writeFileSync(OUT, html);
console.log(`wrote ${OUT} (${(html.length / 1024).toFixed(0)} KB)`);
console.log(`cases: new ${data.new.cases.length}, overlap ${data.newOverlap.cases.length}, base ${data.base.cases.length}, es ${data.es.cases.length}`);
