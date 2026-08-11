// Deterministic grader for the DECIDABLE fv-sufficiency axes: A1, A2, A6, G7.
// These need no model judgment, and an LLM deciding them is strictly worse than code — A6 in
// particular is the primary outcome measure of the render remediation. The grade-fv-sufficiency
// sub-agents consume this file's output and grade only the judgment axes (A3, A4, A5, A7, G1-G6).
//
// Usage (from connect-four/):
//   node server/scripts/grade_mechanical.mjs <answers.jsonl> [--locale en]
// Writes <answers-stem>_mechanical.json next to the answers file and prints a per-axis summary.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';
import { mentionsBetterColumn } from '../mechanismExplainer.mjs';

// feature_vector.case fixes BOTH outcomes — it is the sign pair of (bestScore, playedScore).
const CASE_OUTCOMES = {
  win_to_draw:        { best: 'win',  played: 'draw' },
  win_to_lose:        { best: 'win',  played: 'loss' },
  draw_to_lose:       { best: 'draw', played: 'loss' },
  lose_to_faster_lose:{ best: 'loss', played: 'loss' },
};

const emitted = (text, kind) =>
  [...(text ?? '').matchAll(new RegExp(`\\[${kind}:([^\\]!/]+)\\]`, 'g'))].map((m) => m[1]);

export function gradeMechanicalRow(row, locale = 'en') {
  const fv = row.feature_vector ?? {};
  const a = row.answer ?? {};
  const notes = [];

  // A1 — better_move is 1-indexed display; bestCol is 0-indexed.
  const A1 = a.better_move != null && fv.bestCol != null && (a.better_move - 1) === fv.bestCol
    ? 'pass' : 'fail';
  if (A1 === 'fail') notes.push(`A1: better_move ${a.better_move} vs bestCol ${fv.bestCol} (display ${fv.bestCol + 1})`);

  // A2 — both outcome labels are fixed by `case`.
  const exp = CASE_OUTCOMES[fv.case];
  const A2 = exp && a.best_outcome === exp.best && a.played_outcome === exp.played ? 'pass' : 'fail';
  if (A2 === 'fail') notes.push(`A2: case ${fv.case} implies ${exp?.best}/${exp?.played}, got ${a.best_outcome}/${a.played_outcome}`);

  // A6 — production's own predictor of what the player is served. mentionsBetterColumn abstains
  // `true` on an empty mechanism (it is a retry trigger, :116-118); for grading that is a fail.
  const A6 = (a.mechanism ?? '').trim()
    ? (mentionsBetterColumn({ mechanism: a.mechanism }, fv.bestCol, locale) ? 'pass' : 'fail')
    : 'fail';
  if (A6 === 'fail') notes.push(`A6: prose never names column ${fv.bestCol + 1}`);

  // G7a/G7b — read `raw`, the model's ORIGINAL text. answer.mechanism is post-processAnnotations
  // (handles already expanded to specs, unoffered tags already stripped), so it cannot show a
  // violation. Not derived from annotationRepairs either: Task 9 is what makes that record
  // unoffered_*, and this must behave identically on the pre-fix baseline.
  const zones = row.render_decision?.zones ?? { aliases: [], terms: [] };
  const handles = new Set((zones.aliases ?? []).map((x) => x.handle));
  const slugs = new Set((zones.terms ?? []).map((x) => x.slug));
  // ONLY the membership half is decidable. Whether a handle wraps a semantically appropriate phrase,
  // and whether anything is over-wrapped, stays with the agent — measured on the 2026-08-06 corpus the
  // script and the agents agreed on 122/126 runs and all 4 disagreements were that judgment half.
  const badZones = emitted(row.raw, 'zone').filter((h) => !handles.has(h));
  const badTerms = emitted(row.raw, 'term').filter((s) => !slugs.has(s));
  const G7a_offered = badZones.length === 0 ? 'pass' : 'fail';
  const G7b_offered = badTerms.length === 0 ? 'pass' : 'fail';
  if (badZones.length) notes.push(`G7a: unoffered zone handle(s) ${[...new Set(badZones)].join(', ')}`);
  if (badTerms.length) notes.push(`G7b: unoffered term slug(s) ${[...new Set(badTerms)].join(', ')}`);

  return { A1, A2, A6, G7a_offered, G7b_offered, notes: notes.join('; ') };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const src = process.argv[2];
  if (!src) { console.error('Usage: node server/scripts/grade_mechanical.mjs <answers.jsonl> [--locale en]'); process.exit(1); }
  const li = process.argv.indexOf('--locale');
  const locale = li >= 0 ? process.argv[li + 1] : 'en';
  const rows = readFileSync(src, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const out = {};
  const AXES = ['A1', 'A2', 'A6', 'G7a_offered', 'G7b_offered'];
  const tally = Object.fromEntries(AXES.map((a) => [a, [0, 0]]));
  for (const r of rows) {
    if (!r.answer) continue;                       // parse failure — the agent owns that case
    const g = gradeMechanicalRow(r, locale);
    out[`${r.id}|${r.condition}|${r.run_index}`] = g;
    for (const ax of AXES) { tally[ax][1]++; if (g[ax] === 'pass') tally[ax][0]++; }
  }
  const dest = join(dirname(src), basename(src).replace(/\.jsonl$/, '_mechanical.json'));
  writeFileSync(dest, JSON.stringify(out, null, 1));
  console.log(`wrote ${dest} — ${Object.keys(out).length} runs`);
  for (const ax of AXES) {
    const [p, n] = tally[ax];
    console.log(`  ${ax}: ${p}/${n} pass (${n ? Math.round((100 * p) / n) : 0}%)`);
  }
}
