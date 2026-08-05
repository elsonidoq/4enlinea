// T040 — end-to-end acceptance: re-run the 4 real staging boards through the real pipeline
// (computeMechanism -> toAllowedSet -> guardExplainMoveLlmPayload, exactly the sequence
// server/index.js's fresh-generation branch runs), including a real LLM call (OPENAI_API_KEY is
// present per server/.env). Absolute imports per CLAUDE.md's inline-node-script convention.
import fs from 'node:fs';
import { createSolverProcess } from '/Users/elsonidoq/prog/cuatro_en_linea/.claude/worktrees/deep-reveal-grounding/connect-four/server/c4solver-wrapper.js';
import { computeMechanism } from '/Users/elsonidoq/prog/cuatro_en_linea/.claude/worktrees/deep-reveal-grounding/connect-four/server/mechanismExplainer.mjs';
import { toAllowedSet, guardExplainMoveLlmPayload, promoteRawCoordinates } from '/Users/elsonidoq/prog/cuatro_en_linea/.claude/worktrees/deep-reveal-grounding/connect-four/server/reasonRenderGuard.mjs';
import { validateAnnotation } from '/Users/elsonidoq/prog/cuatro_en_linea/.claude/worktrees/deep-reveal-grounding/connect-four/server/annotationGate.js';
import { expandSpec } from '/Users/elsonidoq/prog/cuatro_en_linea/.claude/worktrees/deep-reveal-grounding/connect-four/server/zoneParser.js';
import { Board } from '/Users/elsonidoq/prog/cuatro_en_linea/.claude/worktrees/deep-reveal-grounding/connect-four/server/classifier.js';

const envPath = '/Users/elsonidoq/prog/cuatro_en_linea/.claude/worktrees/deep-reveal-grounding/connect-four/server/.env';
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const BOARDS = [
  { movestring: '3154', col: 4 },
  { movestring: '315444233213', col: 1 },
  { movestring: '315444233213134122', col: 5 },
  { movestring: '3154442332131341225551', col: 5 },
];

function extractZoneSpecs(text) {
  const specs = new Set();
  const re = /\[zone:([^\]]+)\]/g;
  let m;
  while ((m = re.exec(text)) !== null) specs.add(m[1]);
  return [...specs];
}

const cellStr = ({ col, row }) => `c${col + 1}r${row + 1}`;

async function main() {
  const solver = createSolverProcess();
  const results = [];
  try {
    for (const { movestring, col } of BOARDS) {
      console.error(`--- ${movestring} (col=${col}) ---`);
      const result = await computeMechanism(movestring, col, { solver, model: process.env.OPENAI_MODEL });
      if (result.notABlunder) {
        console.error('  notABlunder — skipping');
        results.push({ movestring, col, notABlunder: true });
        continue;
      }

      const aliases = result.renderDecision?.zones?.aliases ?? [];
      const requiredSet = result.renderDecision?.requiredSet ?? [];
      const board = new Board(movestring);
      const allowedSet = toAllowedSet(aliases);

      // Decision A rejection count: run the SAME promote+validate step guardExplainMoveLlmPayload
      // runs internally, and count P5strong rejections of a single-cell spec that is a member of a
      // windowOnly-offered alias's window but was never itself offered standalone — exactly the
      // highlights a per-cell admission rule would have kept.
      const promoted = promoteRawCoordinates(result.mechanism ?? '', 'en');
      const { failures } = validateAnnotation(promoted, board, allowedSet);
      const singleCellOfferedCells = new Set(
        aliases.filter((a) => expandSpec(a.spec).length === 1).map((a) => cellStr(expandSpec(a.spec)[0]))
      );
      const windowMemberCells = new Set();
      for (const a of aliases) {
        const cells = expandSpec(a.spec);
        if (cells.length > 1) for (const c of cells) windowMemberCells.add(cellStr(c));
      }
      let decisionARejectionCount = 0;
      const decisionARejectedSpecs = [];
      for (const f of failures) {
        const m = f.match(/^P5strong:(?:cell_not_allowed|col_not_allowed):(.+)$/);
        if (!m) continue;
        const rawSpec = m[1];
        const bareSpec = rawSpec.replace(/^future:/, '');
        const cellMatch = bareSpec.match(/^c\d+r\d+$/);
        if (!cellMatch) continue; // only single-cell specs count for this measurement
        if (windowMemberCells.has(bareSpec) && !singleCellOfferedCells.has(bareSpec)) {
          decisionARejectionCount += 1;
          decisionARejectedSpecs.push(rawSpec);
        }
      }

      const guarded = guardExplainMoveLlmPayload({
        explanation: result.mechanism,
        prompt: result.prompt,
        terms: {},
        locale: 'en',
        board,
        allowedSet,
      });
      const emittedSpecs = extractZoneSpecs(guarded.explanation);
      const requiredSpecs = requiredSet.map((g) => g.spec);

      results.push({
        movestring,
        col,
        offeredSpecs: aliases.map((a) => a.spec),
        requiredSpecs,
        emittedSpecs,
        requiredSubsetOfEmitted: requiredSpecs.every((s) => emittedSpecs.includes(s)),
        missingHandlesFromRetry: (result.missingHandles ?? []).map((g) => g.spec),
        decisionARejectionCount,
        decisionARejectedSpecs,
        servedExplanation: guarded.explanation,
        rawMechanism: result.mechanism,
      });
      console.error(`  offered=${aliases.length} required=${requiredSpecs.length} emitted=${emittedSpecs.length} decisionARejections=${decisionARejectionCount}`);
    }
  } finally {
    solver.destroy();
  }
  console.log(JSON.stringify(results, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
