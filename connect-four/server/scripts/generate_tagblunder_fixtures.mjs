// Generate golden fixtures for tagBlunder, covering every reachable tag:direction.
// Run from connect-four/:
//   node server/scripts/generate_tagblunder_fixtures.mjs [maxGames] [seed]
//
// Positions come from the canonical simulator (gameSampling.harvestBlunders) — never
// hand-crafted. For each non-optimal ply we run tagBlunder and bin the result by
// `tag:direction`, collecting up to FIXTURES_PER_BIN examples per bin. Output is
// written to tests/blunder/fixtures/tagBlunderFixtures.json and is consumed by
// tests/blunder/tagBlunderFixtures.test.js as a behavioral regression guard.
//
// Deterministic given (maxGames, seed): the solver is deterministic and the RNG is
// seeded, so regenerating reproduces the same fixtures.

import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { tagBlunder } from '../classifier.js';
import { harvestBlunders } from '../gameSampling.js';
import { REASON_TEMPLATES } from '../blunderReasons.js';
import { createSolverProcess } from '../c4solver-wrapper.js';

const maxGames = parseInt(process.argv[2] ?? '500', 10);
const seed     = parseInt(process.argv[3] ?? '12345', 10);
const outPath  = 'tests/blunder/fixtures/tagBlunderFixtures.json';

const FIXTURES_PER_BIN = 2;

// Seeded RNG (mulberry32) — reproducible game sampling.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// All tag:direction combinations tagBlunder can emit (canonical enumeration).
const ALL_BINS = new Set(REASON_TEMPLATES.keys());

async function main() {
  const solver = createSolverProcess();
  const rng = mulberry32(seed);

  const byBin = new Map();        // "tag:direction" → fixture[]
  const fixtures = [];
  let plyCount = 0;

  const binsDone = () =>
    [...ALL_BINS].every(b => (byBin.get(b)?.length ?? 0) >= FIXTURES_PER_BIN);

  for await (const ply of harvestBlunders(solver, { maxGames, rng })) {
    if (binsDone()) break;
    plyCount++;

    const { boardState, movePlayed, correctCol, gameIndex } = ply;

    let result;
    try {
      result = await tagBlunder(boardState, movePlayed, correctCol, solver);
    } catch (e) {
      // NotABlunderError should never occur here (harvest yields non-terminal plies).
      process.stderr.write(`  ! tagBlunder threw at "${boardState}": ${e.message}\n`);
      continue;
    }

    const bin = `${result.tag}:${result.direction}`;
    const have = byBin.get(bin) ?? [];
    if (have.length >= FIXTURES_PER_BIN) continue;

    const fixture = {
      bin,
      expectedTag: result.tag,
      expectedDirection: result.direction,
      boardState,
      playedCol: movePlayed,
      correctCol,
      source: `harvestBlunders seed=${seed} game=${gameIndex}`,
    };
    have.push(fixture);
    byBin.set(bin, have);
    fixtures.push(fixture);

    process.stderr.write(
      `  ✓ ${bin} (${have.length}/${FIXTURES_PER_BIN})  bins ${[...byBin.keys()].length}/${ALL_BINS.size}  ply ${plyCount}\n`
    );
  }

  solver.destroy();

  fixtures.sort((a, b) => a.bin.localeCompare(b.bin) || a.boardState.localeCompare(b.boardState));
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(fixtures, null, 2) + '\n');

  const missing = [...ALL_BINS].filter(b => !(byBin.get(b)?.length));
  process.stderr.write(`\nDone: ${plyCount} plies scanned, ${fixtures.length} fixtures → ${outPath}\n`);
  process.stderr.write(`Covered ${ALL_BINS.size - missing.length}/${ALL_BINS.size} bins.\n`);
  if (missing.length) {
    process.stderr.write(`Unreached bins (structurally rare in random play): ${missing.join(' ')}\n`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
