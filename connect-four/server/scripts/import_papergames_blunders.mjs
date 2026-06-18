// import_papergames_blunders.mjs
// Fetch Connect 4 games from papergames.io, import games into papergames_games,
// and import blunders into blunders (linked via papergames_game_id).
//
// All core import/analysis logic delegated to ../papergamesImporter.js.
//
// Usage:
//   node --env-file=connect-four/server/.env \
//     connect-four/server/scripts/import_papergames_blunders.mjs \
//     --user-id <supabase-uuid> \
//     [--account-id <papergames-id>] \
//     [--limit <N>]
//
// Papergames API (verified 2026-06-04):
//   Rooms:  GET /api/profile/:id/rooms?accountId=X&start=N&limit=50&gameType=Connect4
//           Response: { rooms: [...], count: number }
//   Replay: GET /api/room/:uid/replay
//           game.actions[i].action.x = 0-indexed column (0–6, no adjustment needed)
//           replayData.game.actions[0].userId = accountId of the first player
//           replayData.outcome.winnerAccountId — null on draw
//           replayData.outcome.finishReason — e.g. 'connect4', 'time-up'
//           replayData.durationMs — total game duration in ms

import { createClient } from '@supabase/supabase-js';
import { importForUser } from '../papergamesImporter.js';

const PAPERGAMES_ACCOUNT_ID = '69e773d36bf9938bffc1509a';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--user-id') args.userId = argv[i + 1];
    if (argv[i] === '--account-id') args.accountId = argv[i + 1];
    if (argv[i] === '--limit') args.limit = parseInt(argv[i + 1], 10);
  }
  return args;
}

const { userId, accountId = PAPERGAMES_ACCOUNT_ID, limit } = parseArgs(process.argv.slice(2));

if (!userId) { console.error('Missing --user-id <supabase-uuid>'); process.exit(1); }

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) { console.error('Missing env vars'); process.exit(1); }

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const gameLimit = limit ?? Infinity;
  console.log(`Importing up to ${gameLimit === Infinity ? 'all' : gameLimit} games for account ${accountId}...`);

  const startTime = Date.now();
  const { imported, skipped } = await importForUser(
    supabase,
    userId,
    accountId,
    gameLimit,
    null, // no lastImportAt — process all available games
  );

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Done in ${elapsed}s.`);
  console.log(`  Imported: ${imported}`);
  console.log(`  Skipped : ${skipped}`);
}

main().catch(e => { console.error(e); process.exit(1); });
