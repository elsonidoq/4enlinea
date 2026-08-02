// verify_lesson_content.mjs — solver-gated lesson invariants (manual gate, not in test suite).
// Usage (from connect-four/):  node server/scripts/verify_lesson_content.mjs [lessonId ...]
// Checks (docs/superpowers/plans/2026-07-23-lesson-content-remediation.md Task 2):
//   socratic:   correctCol is solver-max AND position not lost (opt-out: "_lostPositionIntended")
//   challenges: side to move is not lost (same opt-out)
//   tg/td overlays: cell is a real completing cell for that color (opt-out: "_overlayIntent": "annotation")
//
// Opt-out granularity (spec 052 / FR-019): "_overlayIntent" may be set on the NODE (slide or
// socratic) as the inherited default for all of its overlays, and/or on an INDIVIDUAL overlay
// entry ({c, r, type, _overlayIntent}) which overrides the node-level default for that one
// overlay. A node-level "annotation" with a per-overlay "threat" therefore re-enables the check
// for just that cell, and vice-versa. The 8 existing node-level usages need no edit.
//
// Robustness (spec 052 / FR-013): every solver.query is wrapped — a malformed/illegal movestring
// produces a single FAIL row for that input and the run continues with the remaining lessons.
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

// Resolve the intent for one overlay: the overlay's own `_overlayIntent` wins when present,
// otherwise the node-level (slide / socratic) `_overlayIntent` acts as the inherited default.
function overlayIntent(node, overlay) {
  return overlay?._overlayIntent ?? node?._overlayIntent;
}

function overlayRows(node, where, board) {
  const rows = [];
  for (const o of node.overlays ?? []) {
    if (overlayIntent(node, o) === 'annotation') continue;   // per-overlay override beats the node default
    if (o.type !== 'tg' && o.type !== 'td') continue;
    const player = o.type === 'tg' ? 1 : 2;
    const ok = (board.reachableThreats(player).get(o.c) ?? []).includes(o.r);
    rows.push({ where: `${where} overlay ${o.type}(${o.c},${o.r})`, ok, why: ok ? '' : `no P${player} threat at that cell` });
  }
  return rows;
}

// FR-013: never let one bad input abort the run. Returns { scores } or { error } so the caller
// can emit a FAIL row for exactly that board and keep going.
async function safeQuery(solver, ms) {
  try {
    const scores = await solver.query(ms);
    if (!Array.isArray(scores) || scores.length !== 7) throw new Error(`solver returned ${JSON.stringify(scores)}`);
    return { scores };
  } catch (e) {
    return { error: e?.message || String(e) };
  }
}

// Board() parses the movestring itself and throws on illegal input — same isolation rule.
function safeBoard(ms) {
  try {
    return { board: new Board(ms) };
  } catch (e) {
    return { error: e?.message || String(e) };
  }
}

async function checkLesson(lesson, solver) {
  const rows = [];
  for (const [i, s] of (lesson.slides ?? []).entries()) {
    if (typeof s.movestring !== 'string') { rows.push({ where: `slides[${i}]`, ok: false, why: 'no movestring' }); continue; }
    const { board, error } = safeBoard(s.movestring);
    if (error) { rows.push({ where: `slides[${i}]`, ok: false, why: `invalid movestring "${s.movestring}": ${error}` }); continue; }
    rows.push(...overlayRows(s, `slides[${i}]`, board));
  }
  const soc = lesson.socratic;
  if (soc && typeof soc.movestring !== 'string') {
    rows.push({ where: 'socratic', ok: false, why: 'no movestring' });
  } else if (soc && typeof soc.movestring === 'string') {
    const q = await safeQuery(solver, soc.movestring);
    if (q.error) {
      // One bad socratic board => one FAIL row; the challenges below still run.
      rows.push({ where: 'socratic', ok: false, why: `solver failed on "${soc.movestring}": ${q.error}` });
    } else {
      const scores = q.scores;
      const max = maxLegal(scores);
      const okBest = scores[soc.correctCol] === max;
      const okAlive = max >= 0 || soc._lostPositionIntended === true;
      rows.push({ where: 'socratic.correctCol', ok: okBest, why: okBest ? '' : `scores[${soc.correctCol}]=${scores[soc.correctCol]} max=${max}` });
      rows.push({ where: 'socratic.position', ok: okAlive, why: okAlive ? '' : `lost for learner (max=${max})` });
    }
    const sb = safeBoard(soc.movestring);
    if (sb.error) rows.push({ where: 'socratic', ok: false, why: `invalid movestring "${soc.movestring}": ${sb.error}` });
    else rows.push(...overlayRows(soc, 'socratic', sb.board));
  }
  for (const [i, ch] of (lesson.confirmationChallenges ?? []).entries()) {
    if (typeof ch.moveString !== 'string') { rows.push({ where: `challenge[${i}]`, ok: false, why: 'no moveString' }); continue; }
    const q = await safeQuery(solver, ch.moveString);
    if (q.error) {
      rows.push({ where: `challenge[${i}]`, ok: false, why: `solver failed on "${ch.moveString}": ${q.error}` });
      continue;
    }
    const max = maxLegal(q.scores);
    const ok = max >= 0 || ch._lostPositionIntended === true;
    rows.push({ where: `challenge[${i}]`, ok, why: ok ? '' : `lost for user (max=${max})` });
  }
  return rows;
}

const files = fs.readdirSync(LESSONS_DIR).filter(f => /^lesson-\d+-.*\.json$/.test(f)).sort();
const solver = createSolverProcess();
let failed = 0;
try {
  for (const f of files) {
    // A single unparseable/broken lesson file is a FAIL row for that file, not an aborted run.
    let lesson;
    try {
      lesson = JSON.parse(fs.readFileSync(path.join(LESSONS_DIR, f), 'utf8'));
    } catch (e) {
      console.log(`\n== (unreadable) ${f}`);
      console.table([{ where: f, result: 'FAIL', why: `unparseable lesson file: ${e?.message || e}` }]);
      failed += 1;
      continue;
    }
    if (filterIds.size && !filterIds.has(lesson.id)) continue;
    let rows;
    try {
      rows = await checkLesson(lesson, solver);
    } catch (e) {
      rows = [{ where: lesson.id, ok: false, why: `unexpected error while checking: ${e?.message || e}` }];
    }
    console.log(`\n== ${lesson.id} (${f})`);
    console.table(rows.map(r => ({ where: r.where, result: r.ok ? 'PASS' : 'FAIL', why: r.why })));
    failed += rows.filter(r => !r.ok).length;
  }
} finally {
  solver.destroy();
}
console.log(failed ? `\n${failed} FAIL row(s)` : '\nall PASS');
process.exit(failed ? 1 : 0);
