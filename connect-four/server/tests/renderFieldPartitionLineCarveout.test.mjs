// T028 (FR-019(b), Design Decision 2, epic AC 9(b)).
//
// fieldPartition (renderReasonModel.mjs) classifies every leaf path in the pruned narrator vector as
// rendered / covered / excluded, purely from `dispositionOf(path)` — it never looks at whether the
// geometry that path names is actually SHOWN anywhere (a board diagram or an offered zone handle).
// `.line`-pattern paths (e.g. `lostResource.line[].cell`) are always classified `transformed` (the
// carve-out's blanket "shown via the board" justification), but that justification is only true when
// the half's own board is genuinely among the record's selected boards, or the same cell(s) are
// exposed via an offered `zones.aliases` handle. This is a board-selection-aware corpus sweep for
// that specific carve-out subset — NOT a `fieldPartition` code change (FR-019 forbids reclassifying
// the carve-out itself).
//
// FR-019(b) two-sided check, per record, per half that carries a `.line`-typed rendered leaf path:
//   (a) the half's own board (matched by `finalMovestring`) is among `boardSelectionDecisions(fv)`'s
//       output with `shown: true`, OR
//   (b) a `zones.aliases` entry names one of the half's own `.line` cells (the same geometry `.line`
//       enumerates) — e.g. a `forkPivotCell` handle, or the ordinary load-bearing-cell alias whenever
//       its spec cell coincides with `.line`'s own terminal cell (`denialCell(h)` and
//       `h.line[h.line.length-1].cell` are frequently the same square).
// If neither holds, the geometry `.line` represents reaches neither the JSON residue (dropped by
// T027's fix) nor a board diagram nor an offered handle — a real FR-019(b) violation.
//
// `eval-33` is carried as a named, commented exemption per Design Decision 2 (plan.md) — DO NOT
// attempt its board-selection remedy in this or any other task; it is explicitly deferred (see
// docs/epics/deep-reveal-remediation-epic.md ### Deferred). Measured in this session: with condition
// (b) read as "any alias whose spec cell is one of the half's own `.line` cells" (not only a
// forkPivotCell), eval-33's own `lostResource` half already satisfies condition (a) — it is deep
// (register: forced_sequence) and gets its own `projectedDeep` board, whose movestring IS
// `lostResource.finalMovestring` — so the exemption is inert today (0 real violations measured
// corpus-wide). It is kept anyway because Design Decision 2 names it explicitly and forbids removing
// it without revisiting the deferred remedy question.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { toNarratorVector, pruneVector } from '../scripts/reasonNarratorVector.mjs';
import { buildReasonRenderModel, buildRenderDecision } from '../scripts/renderReasonModel.mjs';
import { boardSelectionDecisions } from '../scripts/reasonBoardSelect.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORPUS = join(__dirname, '../scripts/reason_corpus/evidence.jsonl');
const rows = readFileSync(CORPUS, 'utf8').trim().split('\n').map((l) => JSON.parse(l));

const LINE_PATH_RE = /(^|\.)line(\[\]|\.|$)/;
const unprefix = (s) => (s.startsWith('future:') ? s.slice('future:'.length) : s);

// const, exact text required by T028's brief — do not reclassify or silently extend.
const KNOWN_EXEMPTIONS = new Set(['eval-33']); // lostResource.line, denial half, no board-selection remedy — deferred, see docs/epics/deep-reveal-remediation-epic.md ### Deferred

test('every corpus record satisfies FR-019(b): a rendered .line path is shown on a board or via an offered alias (except the named eval-33 exemption)', () => {
  assert.ok(rows.length >= 25, `expected the corpus, got ${rows.length}`);
  const violations = [];
  for (const row of rows) {
    if (!row.evidence || row.error) continue;
    const nv = toNarratorVector(row.evidence);
    const fv = pruneVector(nv);
    const rd = buildRenderDecision(nv);
    const model = buildReasonRenderModel(nv);

    const halvesWithLine = new Set(
      rd.fieldPartition.rendered.filter((p) => LINE_PATH_RE.test(p)).map((p) => p.split('.')[0]));
    if (!halvesWithLine.size) continue;

    const boards = boardSelectionDecisions(fv);
    const aliasSpecs = new Set((model.zones.aliases ?? []).map((a) => unprefix(a.spec)));

    for (const halfName of halvesWithLine) {
      const half = fv[halfName];
      const lineCells = new Set((half?.line ?? []).map((l) => l.cell));
      if (!lineCells.size) continue; // no cells named — nothing to verify

      // (a) the half's own board (by finalMovestring) is among the shown boards.
      const boardShown = !!half?.finalMovestring
        && boards.some((b) => b.shown && b.movestring === half.finalMovestring);

      // (b) an offered alias names one of the same cells `.line` enumerates (forkPivotCell included,
      // since forkPivotCell's spec is always one of the line's own cells by construction).
      const aliasShown = [...lineCells].some((c) => aliasSpecs.has(c));

      if (!boardShown && !aliasShown && !KNOWN_EXEMPTIONS.has(row.id)) {
        violations.push(`${row.id}:${halfName} — cells ${[...lineCells].join(',')} shown on no board `
          + `(finalMovestring=${half?.finalMovestring ?? 'null'}) and no alias names them`);
      }
    }
  }
  assert.deepEqual(violations, [], `FR-019(b) violations (besides the named eval-33 exemption):\n${violations.join('\n')}`);
});

// FR-019(a): the direct, non-board-selection-aware regression check for T027 — no rendered JSON
// contains an empty object/array literal anywhere in the residue.
test('FR-019(a): no rendered JSON residue contains an empty object/array literal, corpus-wide', () => {
  const offenders = [];
  for (const row of rows) {
    if (!row.evidence || row.error) continue;
    const model = buildReasonRenderModel(toNarratorVector(row.evidence));
    const json = JSON.stringify(model.rendered);
    if (/\{\}/.test(json) || /\[\]/.test(json)) offenders.push(row.id);
  }
  assert.deepEqual(offenders, [], `empty object/array literal found in rendered JSON for: ${offenders.join(', ')}`);
});
