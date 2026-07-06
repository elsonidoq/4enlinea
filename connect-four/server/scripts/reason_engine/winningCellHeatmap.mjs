// Empirical winning-cell distribution (hardcoded config; see data/winning-cell-heatmap.json header).
// heatmap[player][row][col] = P(cell in winner's line | that player wins). row 0 = bottom.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const HEATMAP = JSON.parse(readFileSync(join(__dirname, 'data', 'winning-cell-heatmap.json'), 'utf8'));

export function winProbability(player, row0, col0) {
  const grid = HEATMAP.heatmaps[String(player)];
  if (!grid) return 0;
  const row = grid[row0];
  if (!row || col0 < 0 || col0 >= row.length) return 0;
  return row[col0] ?? 0;
}

// Player 1 is favored on internal even rows (display-odd 1,3,5); player 2 on internal odd rows.
export function playerFavorsRow(player, row0) {
  return player === 1 ? row0 % 2 === 0 : row0 % 2 === 1;
}
