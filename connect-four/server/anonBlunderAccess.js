// Pure anon-access decisions for the "anonymous free deep reveal" feature.
// server/index.js is not HTTP-harness-testable (the Express app is not exported),
// so the branch logic lives here and is unit-tested; index.js only wires it.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Decide who owns the blunder rows written for a just-analyzed game.
 * Authenticated caller → their user_id (device_uuid null) — preserves the
 * pre-existing behavior exactly (signed-in users always wrote under user_id).
 * Anonymous caller with a device-scoped game → device_uuid, user_id null.
 * Otherwise → null (no blunder storage). NEVER compares device_uuid to a user id.
 * @param {{id:string}|null|undefined} reqUser
 * @param {{device_uuid?:string|null}} game
 * @returns {{user_id:string|null, device_uuid:string|null}|null}
 */
export function resolveGameBlunderOwner(reqUser, game) {
  if (reqUser) return { user_id: reqUser.id, device_uuid: null };
  if (game && game.device_uuid) return { user_id: null, device_uuid: game.device_uuid };
  return null;
}

/**
 * Decide how to scope a GET /api/coach/queue read.
 * @param {{id:string}|null|undefined} reqUser
 * @param {string|null} deviceUuidParam
 * @returns {{ok:true, scope:'user', userId:string}|{ok:true, scope:'device', deviceUuid:string}|{ok:false}}
 */
export function resolveQueueOwner(reqUser, deviceUuidParam) {
  if (reqUser) return { ok: true, scope: 'user', userId: reqUser.id };
  if (typeof deviceUuidParam === 'string' && UUID_RE.test(deviceUuidParam)) {
    return { ok: true, scope: 'device', deviceUuid: deviceUuidParam };
  }
  return { ok: false };
}

/**
 * Whether the free-tier weekly deep-reveal quota should run for this caller.
 * Anonymous callers have no users row → never run quota (bounded by the per-IP
 * rate limiter instead).
 * @param {{tier?:string}|null|undefined} reqUser
 * @returns {boolean}
 */
export function resolveExplainQuota(reqUser) {
  return !!(reqUser && reqUser.tier === 'free');
}
