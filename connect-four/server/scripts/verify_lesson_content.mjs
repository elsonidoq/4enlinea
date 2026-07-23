// verify_lesson_content.mjs — solver-gated lesson invariants (manual gate, not in test suite).
// Usage (from connect-four/):  node server/scripts/verify_lesson_content.mjs [lessonId ...]
// Checks (docs/superpowers/plans/2026-07-23-lesson-content-remediation.md Task 2):
//   socratic:   correctCol is solver-max AND position not lost (opt-out: "_lostPositionIntended")
//   challenges: side to move is not lost (same opt-out)
//   tg/td overlays: cell is a real completing cell for that color (opt-out: "_overlayIntent": "annotation")
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSolverProcess } from '../c4solver-wrapper.js';
import { Board } from '../classifier.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LESSONS_DIR = path.join(__dirname, '../../lessons');
const filterIds = new Set(process.argv.slice(2));

const legal = (scores) => [...Array(7).keys()].filter(c => scores[c] > -1000);
const maxLegal = (scores) => Math.max(...legal(scores).map(c => scores[c]));

function overlayRows(node, where, board) {
  const rows = [];
  if (node._overlayIntent === 'annotation') return rows;
  for (const o of node.overlays ?? []) {
    if (o.type !== 'tg' && o.type !== 'td') continue;
    const player = o.type === 'tg' ? 1 : 2;
    const ok = (board.reachableThreats(player).get(o.c) ?? []).includes(o.r);
    rows.push({ where: `${where} overlay ${o.type}(${o.c},${o.r})`, ok, why: ok ? '' : `no P${player} threat at that cell` });
  }
  return rows;
}

async function checkLesson(lesson, solver) {
  const rows = [];
  for (const [i, s] of (lesson.slides ?? []).entries()) {
    if (typeof s.movestring !== 'string') { rows.push({ where: `slides[${i}]`, ok: false, why: 'no movestring' }); continue; }
    rows.push(...overlayRows(s, `slides[${i}]`, new Board(s.movestring)));
  }
  const soc = lesson.socratic;
  if (soc && typeof soc.movestring === 'string') {
    const scores = await solver.query(soc.movestring);
    const max = maxLegal(scores);
    const okBest = scores[soc.correctCol] === max;
    const okAlive = max >= 0 || soc._lostPositionIntended === true;
    rows.push({ where: 'socratic.correctCol', ok: okBest, why: okBest ? '' : `scores[${soc.correctCol}]=${scores[soc.correctCol]} max=${max}` });
    rows.push({ where: 'socratic.position', ok: okAlive, why: okAlive ? '' : `lost for learner (max=${max})` });
    rows.push(...overlayRows(soc, 'socratic', new Board(soc.movestring)));
  }
  for (const [i, ch] of (lesson.confirmationChallenges ?? []).entries()) {
    const scores = await solver.query(ch.moveString);
    const max = maxLegal(scores);
    const ok = max >= 0 || ch._lostPositionIntended === true;
    rows.push({ where: `challenge[${i}]`, ok, why: ok ? '' : `lost for user (max=${max})` });
  }
  return rows;
}

const files = fs.readdirSync(LESSONS_DIR).filter(f => /^lesson-\d+-.*\.json$/.test(f)).sort();
const solver = createSolverProcess();
let failed = 0;
for (const f of files) {
  const lesson = JSON.parse(fs.readFileSync(path.join(LESSONS_DIR, f), 'utf8'));
  if (filterIds.size && !filterIds.has(lesson.id)) continue;
  const rows = await checkLesson(lesson, solver);
  console.log(`\n== ${lesson.id} (${f})`);
  console.table(rows.map(r => ({ where: r.where, result: r.ok ? 'PASS' : 'FAIL', why: r.why })));
  failed += rows.filter(r => !r.ok).length;
}
solver.destroy();
console.log(failed ? `\n${failed} FAIL row(s)` : '\nall PASS');
process.exit(failed ? 1 : 0);
