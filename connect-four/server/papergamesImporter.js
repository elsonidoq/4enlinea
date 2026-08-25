// papergamesImporter.js
// Background import module for Papergames Self-Service Import (spec 038).
// Exports importForUser() — called by POST /api/user/papergames/import and
// the CLI script at scripts/import_papergames_blunders.mjs.

import { tagBlunder, NotABlunderError } from './classifier.js';
import { createSolverProcess } from './c4solver-wrapper.js';
import { scoreMove, computeBlunderSeverity } from './moveQualityScorer.js';
import { classifyStoredMistake } from './mistakeStorageRule.js';
import { VALID_BLUNDER_TAGS } from './blunderTags.js';
import { insertGameBlunder } from './insertGameBlunder.js';
import { logError } from './logger.js';

const ROOMS_PAGE_SIZE = 50;
const INVALID_MOVE = -1000;
const BLUNDER_SEVERITY_DEPTH = 3;
const EMPTY_BOARD_SCORES = [0, 0, 1, 2, 1, 0, 0];

// ── Internal helpers ─────────────────────────────────────────────────────────

async function fetchWithTimeout(url, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchRooms(accountId, start) {
  const url = `https://papergames.io/api/profile/${accountId}/rooms?accountId=${accountId}&start=${start}&limit=${ROOMS_PAGE_SIZE}&gameType=Connect4&_t=${Date.now()}`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) {
    // Carry the status so callers can tell "this account does not exist" (404) apart from
    // "Papergames is having a bad day" (5xx/timeout) — see classifyPapergamesFetchError.
    const err = new Error(`fetchRooms HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/**
 * Classify a failed Papergames fetch.
 *
 * Papergames answers 404 for an account id that does not resolve to a profile
 * (`GET /api/profile/<id>` → `{"message":"User with this email does not exist"}`), on exactly
 * the same route it serves 200 for a real one. Reporting that as "API unreachable" sends the
 * reader hunting for an outage — the 2026-08-23 production incident — and retrying it is
 * pointless: a 404 here is deterministic.
 *
 * @param {Error & { status?: number }} err
 * @param {string} accountId
 * @returns {{ kind: 'account_not_found'|'unreachable', retryable: boolean, message: string }}
 */
export function classifyPapergamesFetchError(err, accountId) {
  if (err?.status === 404) {
    return {
      kind: 'account_not_found',
      retryable: false,
      message: `Papergames account not found: ${accountId} — check your Papergames account ID`,
    };
  }
  return {
    kind: 'unreachable',
    retryable: true,
    message: `Papergames API unreachable: ${err?.message ?? String(err)}`,
  };
}

/**
 * Does this Papergames account id resolve to a profile?
 *
 * Deliberately fail-open: only a definite 404 answers 'not_found'. A 5xx, a timeout or an
 * offline network answers 'unknown', so a Papergames outage can never block a user from
 * saving a perfectly good account id.
 *
 * @param {string} accountId
 * @param {{ fetchImpl?: Function, timeoutMs?: number }} [opts]
 * @returns {Promise<'ok'|'not_found'|'unknown'>}
 */
export async function verifyPapergamesAccount(accountId, { fetchImpl, timeoutMs = 5000 } = {}) {
  const url = `https://papergames.io/api/profile/${encodeURIComponent(accountId)}`;
  try {
    const res = fetchImpl
      ? await fetchImpl(url)
      : await fetchWithTimeout(url, timeoutMs);
    if (res.ok) return 'ok';
    return res.status === 404 ? 'not_found' : 'unknown';
  } catch {
    return 'unknown';
  }
}

async function fetchReplay(uid) {
  const url = `https://papergames.io/api/room/${uid}/replay?_t=${Date.now()}`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`fetchReplay HTTP ${res.status} uid=${uid}`);
  return res.json();
}

function parseMoves(replayData) {
  return replayData.game.actions.map(a => String(a.action.x)).join('');
}

function getUserSide(replayData, accountId) {
  const firstAction = replayData.game.actions[0];
  if (!firstAction) throw new Error('No actions in replay');
  return firstAction.userId === accountId ? 'first' : 'second';
}

function getOpponent(replayData, accountId) {
  return replayData.players.find(p => p.accountId !== accountId) ?? null;
}

function getResult(replayData, accountId) {
  const winnerId = replayData.game?.outcome?.winnerAccountId ?? null;
  if (!winnerId) return 'draw';
  return winnerId === accountId ? 'win' : 'loss';
}

function buildGameRow(room, replayData, accountId, userId, side) {
  const opponent = getOpponent(replayData, accountId);
  return {
    user_id: userId,
    papergames_room_uid: room.uid,
    papergames_account_id: accountId,
    moves: parseMoves(replayData),
    side,
    result: getResult(replayData, accountId),
    opponent_name: opponent?.name ?? 'Unknown',
    opponent_account_id: opponent?.accountId ?? '',
    opponent_avatar: opponent?.avatar ?? null,
    opponent_country_code: opponent?.countryCode ?? null,
    opponent_elo: opponent?.eloRating != null ? Math.round(opponent.eloRating) : null,
    finish_reason: replayData.game?.outcome?.finishReason ?? null,
    duration_ms: replayData.durationMs ?? null,
    tournament_uid: replayData.tournamentUid ?? null,
    played_at: room.createdAt,
  };
}

function computeSeverity(bestScore, score) {
  return Math.round((bestScore - score) / 36 * 10);
}

// Extract blunders for one game. Returns { blunders, accuracy }.
// Blunder rows do NOT include papergames_game_id — the caller stamps it
// after the game row is upserted.
async function extractBlunders(solver, moveString, side, userId) {
  const toInsert = [];
  let scored = 0;
  let optimalCount = 0;

  for (let i = 0; i < moveString.length; i++) {
    const isUserPly = side === 'first' ? (i % 2 === 0) : (i % 2 === 1);
    if (!isUserPly) continue;

    const movesBefore = moveString.slice(0, i);
    const col = parseInt(moveString[i], 10);
    if (col < 0 || col > 6) continue;

    const scores = movesBefore.length === 0
      ? EMPTY_BOARD_SCORES
      : await solver.query(movesBefore, 30000);

    const legalCount = scores.filter(s => s !== INVALID_MOVE).length;
    if (legalCount <= 1) continue; // forced move — skip accuracy + blunder scoring

    scored++;
    const { quality, bestCol } = scoreMove(scores, col);
    if (quality === 'optimal') { optimalCount++; continue; }

    const score = scores[col];
    const bestScore = scores[bestCol];

    // Storage rule (mistakeStorageRule.js): slower wins and dead-position
    // faster losses are not mistakes — skip before the expensive tagBlunder/
    // computeBlunderSeverity calls. Accuracy still counts this ply as
    // non-optimal (scored++/no optimalCount++ above).
    const storedMistake = classifyStoredMistake(bestScore, score, movesBefore);
    if (!storedMistake) continue;

    let patternTag = 'suboptimal_move';
    let reason = 'solver error: tagBlunder failed';
    let direction = 'missed_own';
    try {
      const result = await tagBlunder(movesBefore, col, bestCol, solver);
      patternTag = VALID_BLUNDER_TAGS.has(result.tag) ? result.tag : 'suboptimal_move';
      reason = result.reason;
      direction = result.direction;
    } catch (e) {
      if (e instanceof NotABlunderError) {
        // Precondition violation: scoreMove flagged a mistake on a terminal
        // position. Never fabricate a blunder record for it — skip the ply.
        console.error(`[import] NotABlunderError at "${movesBefore}": ${e.message}`);
        continue;
      }
      /* genuine solver error: fallback values already set */
    }

    let severityFraction = null;
    try {
      const sv = await computeBlunderSeverity(solver, movesBefore + String(col), BLUNDER_SEVERITY_DEPTH);
      severityFraction = sv.severity;
    } catch { /* null is fine */ }

    toInsert.push({
      user_id: userId,
      puzzle_id: null,
      board_state: movesBefore,
      move_played: col,
      correct_move: bestCol,
      pattern_category: patternTag,
      quality: storedMistake.quality,
      reason,
      direction,
      severity: computeSeverity(bestScore, score),
      blunder_severity: severityFraction,
    });
  }

  const accuracy = scored > 0 ? Math.round(optimalCount / scored * 100) : null;
  return { blunders: toInsert, accuracy };
}

async function upsertGame(supabase, gameRow) {
  const { data, error } = await supabase
    .from('papergames_games')
    .upsert(gameRow, { onConflict: 'user_id,papergames_room_uid', ignoreDuplicates: false })
    .select('id')
    .single();
  if (error) throw new Error(`upsertGame ${gameRow.papergames_room_uid}: ${error.message}`);
  return data.id;
}

// ── Live-game exports (papergames live play integration) ──────────────────────

/**
 * Save a single live game that just finished.
 * Called by POST /api/user/papergames/save-live-game.
 * Does NOT run blunder extraction — that runs as a background job
 * (extractAndSaveBlunders) so the response is fast.
 *
 * @param {object} supabase - Supabase client (service-role key)
 * @param {string} userId - Supabase user UUID
 * @param {string} papergamesAccountId - papergames socket userId (from the
 *   user:connect WebSocket event)
 * @param {string} roomUid - papergames room UID (from room:join-auto)
 * @returns {Promise<{ id: string }>}
 */
export async function saveLiveGame(supabase, userId, papergamesAccountId, roomUid) {
  const replayData = await fetchReplay(roomUid);
  const side = getUserSide(replayData, papergamesAccountId);
  const room = {
    uid: roomUid,
    createdAt: replayData.createdAt ?? new Date().toISOString(),
  };
  const gameRow = buildGameRow(room, replayData, papergamesAccountId, userId, side);
  const id = await upsertGame(supabase, gameRow);
  return { id };
}

/**
 * Extract blunders for a single game and write them to the DB, then update
 * the game's accuracy. Called fire-and-forget after saveLiveGame — must not
 * block the save-live-game response.
 *
 * Spawns a dedicated solver process (destroyed in finally).
 *
 * @param {object} supabase - Supabase client (service-role key)
 * @param {string} id - papergames_games row UUID (from saveLiveGame)
 * @param {string} userId - Supabase user UUID
 * @param {string} roomUid - papergames room UID
 * @param {string} papergamesAccountId - papergames socket userId
 * @returns {Promise<void>}
 */
export async function extractAndSaveBlunders(supabase, id, userId, roomUid, papergamesAccountId) {
  const solver = createSolverProcess();
  try {
    const replayData = await fetchReplay(roomUid);
    const side = getUserSide(replayData, papergamesAccountId);
    const moveString = parseMoves(replayData);
    const { blunders, accuracy } = await extractBlunders(solver, moveString, side, userId);

    for (const blunder of blunders) {
      await insertGameBlunder(supabase, { ...blunder, papergames_game_id: id });
    }

    if (accuracy != null) {
      await supabase.from('papergames_games').update({ accuracy }).eq('id', id);
    }
  } finally {
    solver.destroy();
  }
}

// ── Main export ──────────────────────────────────────────────────────────────

/**
 * Import papergames.io games and blunders for a user.
 *
 * Spawns a dedicated solver process at entry (destroyed in finally).
 * Paginates papergames rooms newest-first, processes up to `gameLimit` games,
 * stopping early when rooms older than `lastImportAt` are reached.
 *
 * Does NOT write to `users.last_import_at` — that is the endpoint's responsibility.
 *
 * @param {object} supabase - Supabase client (service-role key)
 * @param {string} userId - Supabase user UUID
 * @param {string} papergamesId - Papergames account ID (e.g. "69e773d36bf9938bffc1509a")
 * @param {number} gameLimit - Max games to process (from cap check)
 * @param {string|null} lastImportAt - ISO timestamp of last import for incremental stop,
 *   or null to process all available games
 * @returns {Promise<{ imported: number, skipped: number }>}
 */
export async function importForUser(supabase, userId, papergamesId, gameLimit, lastImportAt) {
  const solver = createSolverProcess();

  try {
    let imported = 0;
    let skipped = 0;
    let blunderErrors = 0;
    let processed = 0;
    let start = 0;
    let total = null;
    let stopEarly = false;

    // Verify the account is fetchable before entering the loop (one attempt with retry).
    // A 404 is NOT retried: it means the configured account id does not exist upstream, which
    // no amount of waiting fixes (2026-08-23 incident).
    let apiOk = false;
    for (let attempt = 0; attempt < 3 && !apiOk; attempt++) {
      try {
        await fetchRooms(papergamesId, 0);
        apiOk = true;
      } catch (e) {
        const { retryable, message } = classifyPapergamesFetchError(e, papergamesId);
        if (!retryable || attempt === 2) throw new Error(message);
        console.log('[importForUser] API probe attempt', attempt, 'failed, retrying:', e.message);
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    console.log('[importForUser] Starting fetch loop — gameLimit:', gameLimit,
      'lastImportAt:', lastImportAt);
    while (processed < gameLimit && !stopEarly) {
      const { rooms, count } = await fetchRooms(papergamesId, start);
      if (total === null) { total = count; console.log('[importForUser] API total rooms:', total); }
      console.log('[importForUser] Page start:', start, 'rooms in page:', rooms.length);
      if (rooms.length === 0) break;

      for (const room of rooms) {
        if (processed >= gameLimit) break;

        // Incremental stop: rooms are newest-first. When we reach a room
        // older than the last import, skip all remaining rooms.
        if (lastImportAt && room.createdAt < lastImportAt) {
          console.log('[importForUser] Incremental stop — room.createdAt:', room.createdAt,
            '< lastImportAt:', lastImportAt);
          stopEarly = true;
          break;
        }

        processed++;
        console.log('[importForUser] Room', processed, '/', gameLimit,
          'uid:', room.uid, 'createdAt:', room.createdAt);

        // ── Fetch replay ──────────────────────────────────────────────────
        let replayData;
        try {
          replayData = await fetchReplay(room.uid);
        } catch (e) {
          logError('[importForUser/fetchReplay]', e, { uid: room.uid });
          skipped++;
          continue;
        }

        // ── Parse ─────────────────────────────────────────────────────────
        let moveString, side;
        try {
          moveString = parseMoves(replayData);
          side = getUserSide(replayData, papergamesId);
        } catch (e) {
          logError('[importForUser/parse]', e, { uid: room.uid });
          skipped++;
          continue;
        }

        if (!moveString || moveString.length === 0) {
          console.log('[importForUser] empty movestring — uid:', room.uid);
          skipped++;
          continue;
        }

        // ── Extract blunders (solver analysis) ────────────────────────────
        let blunders, accuracy;
        try {
          ({ blunders, accuracy } = await extractBlunders(solver, moveString, side, userId));
          console.log('[importForUser] game done uid:', room.uid,
            'moves:', moveString.length, 'side:', side,
            'blunders:', blunders.length, 'accuracy:', accuracy);
        } catch (e) {
          logError('[importForUser/extractBlunders]', e, { uid: room.uid });
          skipped++;
          continue;
        }

        // ── Upsert game row ───────────────────────────────────────────────
        let papergamesGameId;
        try {
          const gameRow = { ...buildGameRow(room, replayData, papergamesId, userId, side), accuracy };
          papergamesGameId = await upsertGame(supabase, gameRow);
        } catch (e) {
          logError('[importForUser/upsertGame]', e, { uid: room.uid });
          skipped++;
          continue;
        }

        // ── Insert blunders ───────────────────────────────────────────────
        for (const b of blunders) {
          const ok = await insertGameBlunder(supabase, { ...b, papergames_game_id: papergamesGameId });
          if (!ok) blunderErrors++;
        }

        imported++;

        // Small delay between games to avoid hammering the solver
        await new Promise(r => setTimeout(r, 100));
      }

      start += rooms.length;
      if (start >= (total ?? 0)) break;
      // Small delay between API pages
      if (processed < gameLimit && !stopEarly) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    console.log('[importForUser] Done — imported:', imported, 'skipped:', skipped,
      'blunderErrors:', blunderErrors, 'processed:', processed, 'stopEarly:', stopEarly);
    return { imported, skipped, blunderErrors };
  } finally {
    solver.destroy();
  }
}
