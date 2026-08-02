// Client-side entitlement cache (spec 053 US2, T019).
//
// getEntitlement() is meant to become the SINGLE client-side source every
// screen/component reads to decide "is this account paid" — it supersedes
// the five independent `profile.tier` reads this epic consolidates
// (SettingsScreen, PostSetSummaryScreen, SagaScreen, DeepRevealPane,
// useLessonLockGuard — migrated in T022–T026, a later batch; this module
// only needs to exist and be correct here). The one authoritative
// server-side answer lives behind `GET /api/user/entitlement`
// (server/entitlement.js, T017) — this module is purely a TTL cache + fail-
// open wrapper around that endpoint.
//
// Fail-open (FR-013): unlike the server's fail-CLOSED rule (FR-010), the
// client prefers to keep showing a paying customer paid content through a
// transient failure rather than spuriously downgrading them — the server
// gate is the real enforcement point, so this client-side leniency can never
// grant access the server wouldn't also grant. See the Decision 2 block in
// getEntitlement() below for the sharpest instance of this asymmetry; do NOT
// "harmonize" it with FR-010.
//
// Plain .js (no JSX) so `node --test` can import it directly, following the
// checkoutReturnFlow.js/onboardingRouting.js/postLoginReturn.js precedent.

const ENTITLEMENT_ENDPOINT = '/api/user/entitlement';
const REFRESH_ENDPOINT = '/api/auth/refresh';

// track.js's guarded pattern — safe both under Vite (browser) and plain
// `node --test` (import.meta.env is undefined there, not a parse error).
const API = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || '';

export const ENTITLEMENT_CACHE_TTL_MS = 5 * 60 * 1000;

// ── Module-level singleton cache state ──────────────────────────────────────
// Mirrors checkoutReturnFlow.js's singleton-store pattern. `lastKnownGood` is
// the last successfully-obtained answer for the current session; there is no
// production code path that ever fully forgets it (only invalidates/expires
// it) — that's what makes fail-open (FR-013) possible. Tests reset this
// between cases via __resetEntitlementCacheForTests (see
// tests/unit/entitlementClient.test.js).
let lastKnownGood = null; // { entitled: boolean } | null
let lastFetchedAt = 0; // ms epoch of the fetch that produced lastKnownGood

/**
 * Test-only reset of all module-level cache state. Production code never
 * calls this.
 */
export function __resetEntitlementCacheForTests() {
  lastKnownGood = null;
  lastFetchedAt = 0;
}

/**
 * Discards the cached answer's freshness so the next getEntitlement() call
 * re-fetches even within an unexpired TTL window (FR-012). Deliberately does
 * NOT clear lastKnownGood — if the forced re-fetch itself fails, FR-013
 * still needs a fallback answer to fail open to.
 */
export function invalidateEntitlement() {
  lastFetchedAt = 0;
}

/**
 * Hard reset: forgets the cached answer ENTIRELY, including lastKnownGood.
 * Call this whenever the identity behind the session changes (sign-out, and
 * any future account switch) — NOT for an ordinary refresh, which is
 * invalidateEntitlement()'s job.
 *
 * This is load-bearing, not defensive. The cache is module-scoped, not
 * account-scoped, so without it a signed-out tab keeps its previous
 * account's answer: within the TTL it serves `entitled: true` outright, and
 * once the TTL expires the fresh {entitled:false, authenticated:false} reads
 * as an ambiguous session lapse, so the FR-033/Decision 2 branch below
 * re-pins the stale `entitled: true` for another full window — permanently,
 * for the life of the tab. FR-013 scopes the fallback answer to "that
 * account"; this is what enforces that scoping.
 */
export function clearEntitlement() {
  lastKnownGood = null;
  lastFetchedAt = 0;
}

async function fetchEntitlement(fetchFn) {
  const res = await fetchFn(`${API}${ENTITLEMENT_ENDPOINT}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`entitlement fetch failed: ${res.status}`);
  return res.json();
}

/**
 * Bounded, single-shot "reestablish the session, then retry once" cycle
 * (FR-033). Reimplements just fetchWithAuthRetry.js's two-call shape (POST
 * /api/auth/refresh, then one re-fetch) rather than importing that function
 * directly — fetchWithAuthRetry triggers its retry on an HTTP 401 status,
 * but GET /api/user/entitlement always answers 200 (contracts/entitlement.md):
 * a lapsed session surfaces as an AMBIGUOUS 200 body
 * ({entitled:false, authenticated:false}), which fetchWithAuthRetry's
 * status-code trigger can't see. Same two calls, different trigger.
 */
async function attemptSessionRefreshAndRetry(fetchFn) {
  try {
    await fetchFn(`${API}${REFRESH_ENDPOINT}`, { method: 'POST', credentials: 'include' });
  } catch {
    // Refresh call itself failed (network error) — still ambiguous, caller decides.
    return { entitled: false, authenticated: false };
  }

  try {
    return await fetchEntitlement(fetchFn);
  } catch {
    return { entitled: false, authenticated: false };
  }
}

/**
 * Returns the current entitlement answer for the signed-in-or-not caller,
 * using a bounded TTL cache. Never rejects — every failure path resolves to
 * a best-effort answer (fail-open per FR-013).
 *
 * @param {object} [opts] - injectable seams for tests; production callers omit this.
 * @param {typeof fetch} [opts.fetchFn]
 * @param {number} [opts.now] - clock override for TTL tests; defaults to Date.now()
 * @returns {Promise<{entitled: boolean}>}
 */
export async function getEntitlement({ fetchFn = fetch, now = Date.now() } = {}) {

  // Cache-first: any prior answer (entitled or not) within the TTL window is
  // served without a network call.
  if (lastKnownGood != null && now - lastFetchedAt < ENTITLEMENT_CACHE_TTL_MS) {
    return { entitled: lastKnownGood.entitled };
  }

  let fresh;
  try {
    fresh = await fetchEntitlement(fetchFn);
  } catch {
    // FR-013: the fetch itself failed (offline/timeout/5xx) — fail open to
    // the last successfully-obtained answer, or {entitled:false} if this
    // account has never had one.
    return { entitled: lastKnownGood?.entitled ?? false };
  }

  const isAmbiguousLapse = !fresh.entitled && !fresh.authenticated;

  // FR-033: distinguish "session lapsed" from "genuinely free tier". Only
  // relevant when we previously had a genuinely entitled answer for this
  // account — an ordinary anonymous/free visitor with no prior entitled
  // answer is unaffected and falls straight through to the plain-accept path
  // below, per FR-033's own carve-out.
  if (isAmbiguousLapse && lastKnownGood?.entitled === true) {
    const refreshed = await attemptSessionRefreshAndRetry(fetchFn);

    if (refreshed.entitled) {
      lastKnownGood = { entitled: true };
      lastFetchedAt = now;
      return { entitled: true };
    }

    // Decision 2 (DB-outage case, discovered at review): the bounded refresh
    // attempt STILL came back ambiguous. Do not accept the downgrade here —
    // the server-side gate (FR-010, fail-closed) is the actual enforcement
    // point and cannot be bypassed by this client leniency, so a transient
    // backend blip must never show a paying customer a spurious upgrade
    // prompt. Keep serving the stale-but-good lastKnownGood, but DO bump
    // lastFetchedAt to `now` — this pins the stale answer for one more full
    // TTL window (starting now) rather than re-attempting the doomed
    // fetch+refresh cycle on every single subsequent call during an ongoing
    // outage. "Until its TTL window naturally expires" (T019) means THIS
    // fresh window, not the original one — the original window already
    // elapsed (that's why we're in this branch at all). Do NOT "harmonize"
    // this with FR-010 — the asymmetry between client and server is
    // intentional (research.md Decision 2 / tasks.md T019).
    lastFetchedAt = now;
    return { entitled: lastKnownGood.entitled };
  }

  lastKnownGood = { entitled: fresh.entitled };
  lastFetchedAt = now;
  return { entitled: fresh.entitled };
}
