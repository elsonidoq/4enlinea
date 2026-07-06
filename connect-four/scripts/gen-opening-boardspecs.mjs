// connect-four/scripts/gen-opening-boardspecs.mjs
import { parseMovestring, boardToSpec, nextPlayer } from '../src/lib/movestring.js';
const BOARDS = {
  empty_centre: '',                 // Own the Centre — Socratic target col 3
  five_four: '333334444',           // 5-4 opening (won position, concept slide)
  candlesticks: '3333311115555',    // Candlesticks stem (concept slide)
  imitation_early: '333',           // "I play where you play" concept
  gambit: '3265533353553111',       // Third-Row Gambit — Socratic target col 4
  d3d4_231: '3332223362',           // D3-D4 Diagram 231 — Socratic target col 1
  three_four: '3332222',            // 3-4 opening (reading slide)
};
for (const [name, ms] of Object.entries(BOARDS)) {
  const spec = boardToSpec(parseMovestring(ms));
  console.log(name, JSON.stringify(spec), 'next=' + nextPlayer(ms));
}
