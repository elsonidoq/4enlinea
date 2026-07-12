import express from 'express';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join, basename } from 'path';
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'crypto';
import cookieParser from 'cookie-parser';
import * as Sentry from '@sentry/node';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { assignHeatmaps } from './heatmap.js';
import { classify, checkWin, Board, getImmediateThreats, tagBlunder, NotABlunderError, classifyPattern } from './classifier.js';
import { classifyAiMove } from './classifyAiMove.js';
import { loadKBShortSummary } from './llmCoachHelpers.js';
import { computeMechanism } from './mechanismExplainer.mjs';
import { VALID_BLUNDER_TAGS } from './blunderTags.js';
import { parseQueuePaginationParams } from './coachQueuePagination.js';
import { computeStatsAggregate } from './statsAggregate.js';
import { computeBlunderCountsForGames } from './blunderCountsForGames.js';
import { computeWeaknessMapFallback } from './weaknessMapFallback.js';
import { insertGameBlunder } from './insertGameBlunder.js';
import { evaluatePredicate } from './predicates.js';
import { registerUserRoutes } from './userRoutes.js';
import { registerStripeRoutes } from './stripeRoutes.js';
import { createStripeProcessor } from './stripeProcessor.js';
import { createSolverProcess } from './c4solver-wrapper.js';
import { checkForcedWinPredicate, checkForbiddenColumnsPredicate } from './candidate-generator.js';
import { VALID_CATEGORIES, PAID_CATEGORIES, CATEGORY_ORDER } from './categories.js';

// Spec 044 US3 / FR-010–FR-012: the only three categories whose correctness model allows more
// than one valid answer column. Used to gate the additive `accepted` field on
// POST /api/evaluate-move (FR-015a) — see server-conventions.md.
const MULTI_SOLUTION_CATEGORIES = new Set(['immediate_threat', 'forced_block', 'double_threat']);
import { CHALLENGE_SETS } from './challengeSets.js';
import { scoreMove, computeBlunderSeverity } from './moveQualityScorer.js';
import { classifyStoredMistake } from './mistakeStorageRule.js';
import { ForcedWinStrategy, getAiResponseCol, countThreatsAfterMove, parseBoardState } from './completionStrategies.js';
import { createAttemptRefresh } from './authRefresh.js';
import { USER_PROFILE_SELECT_COLUMNS, defaultUserProfile } from './userHelpers.js';
import i18nTranslations from '../src/i18n/en.json' with { type: 'json' };
import { loadLessons, getLessons, getLesson, reloadLessons, getLessonsAll, validateLesson } from './lessonLoader.js';
import { requireAdmin } from './adminAuth.js';
import { isValidEvalFilename, isValidEvalSetFilename, feedbackFilenameFor, isFvSuffAnswersFile, gradesFilenameFor, deriveSetFromAnswers } from './evalResultsHelpers.js';
import { saveLessonFile, deleteLessonFile } from './lessonAdmin.js';
import { generateLessonAudio, pruneOrphanedLessonAudio } from './lessonAudio.js';
import { shapeKeyForPuzzle } from './shapeDescriptor.js';
import { buildGoogleAuthorizeUrl } from './authUtils.js';
import { logError } from './logger.js';
import { computeThreatCells, computePatternCells, buildBlunderDetailResponse, fetchBlunderDetailContext } from './blunderDetailResponse.js';
import { guardExplainMovePayload, guardExplainMoveLlmPayload } from './reasonRenderGuard.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Boot-time fail-safe (spec 047 FR-006) ──────────────────────────────────────
// If we're pointed at a real (non-local) Supabase project but NODE_ENV isn't
// 'production', cookies would silently ship without the `secure` flag (see
// cookieOpts() below). Refuse to boot rather than risk a silent downgrade.
// Inspects process.env only — never reads a file (avoids the boot-path .env
// read crash trap; env-file loading via `node --env-file` has already resolved
// by the time this module starts executing).
{
  const supabaseUrl = process.env.SUPABASE_URL;
  const isLocalSupabase = supabaseUrl && (supabaseUrl.includes('127.0.0.1') || supabaseUrl.includes('localhost'));
  if (process.env.NODE_ENV !== 'production' && supabaseUrl && !isLocalSupabase) {
    console.error('\n' + '!'.repeat(78));
    console.error('FATAL: SUPABASE_URL points at a non-local project but NODE_ENV != "production".');
    console.error(`  SUPABASE_URL=${supabaseUrl}`);
    console.error(`  NODE_ENV=${process.env.NODE_ENV}`);
    console.error('Refusing to boot: this would silently ship session cookies without the');
    console.error('`secure` flag against a real backend. Set NODE_ENV=production, or point');
    console.error('SUPABASE_URL at a local instance (127.0.0.1/localhost) for dev.');
    console.error('!'.repeat(78) + '\n');
    process.exit(1);
  }
}

// ── Sentry (T004) ─────────────────────────────────────────────────────────────
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
  });
}

const app = express();
app.set('trust proxy', 1); // Railway is a reverse proxy; needed for express-rate-limit

// ── Security headers (spec 047 FR-003/FR-004) ──────────────────────────────────
// `<supabase-host>` for media-src is derived from SUPABASE_URL at startup — works
// for both the production Supabase host and local 127.0.0.1:54321 with no env
// branch. Falls back to omitting the extra media-src origin if SUPABASE_URL is
// unset (e.g. Supabase not configured at all in this environment).
//
// FR-004: the CSP MUST permit the app's REAL external dependencies. Beyond the
// Supabase media host, the Play-Online / Past-Games features talk to papergames.io
// directly from the browser (spec 047 code-review, not caught in research.md §2):
//   • PlayOnlineScreen.jsx opens `wss://papergames.io/socket.io/...` → needs
//     connect-src (governs WebSocket) to allow papergames.io.
//   • PastGamesListScreen.jsx renders avatar <img> from https://papergames.io →
//     needs img-src to allow papergames.io.
// A bare `connect-src/img-src 'self'` would silently break online play and avatars
// in production (Express serves dist/ with this header; Vite dev does not, which is
// why the local smoke test can't surface it). The inline service-worker <script>
// that used to live in index.html was moved into src/main.jsx so `script-src 'self'`
// can stay strict (no 'unsafe-inline'/nonce needed).
const SUPABASE_HOST = process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).host : null;
const PAPERGAMES_ORIGIN = 'https://papergames.io';
const PAPERGAMES_WS = 'wss://papergames.io';
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', PAPERGAMES_ORIGIN],
      mediaSrc: SUPABASE_HOST ? ["'self'", `https://${SUPABASE_HOST}`] : ["'self'"],
      connectSrc: ["'self'", PAPERGAMES_ORIGIN, PAPERGAMES_WS],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      objectSrc: ["'none'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
}));

// Stripe webhook signature verification (stripeRoutes.js) needs the exact raw request
// bytes. It MUST be parsed before the global express.json() below consumes the
// request stream — otherwise by the time the route's own express.raw() middleware
// runs (registerStripeRoutes is called much later in this file), the body stream has
// already been read and parsed into an object, leaving nothing for raw() to read.
// Mounting the raw parser here, scoped to this one path, guarantees it wins the race.
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(cookieParser());
app.use((req, res, next) => {
  console.log('[req]', req.method, req.originalUrl, 'ip=', req.ip);
  next();
});

// ── Lesson loader ──────────────────────────────────────────────────────────────
loadLessons(join(__dirname, '../lessons'));
const LESSONS_DIR = join(__dirname, '../lessons');

// ── Rate limiting (T068) ───────────────────────────────────────────────────────

function makeLimit(max, windowMs = 60_000) {
  return rateLimit({ windowMs, max, standardHeaders: true, legacyHeaders: false });
}

/** Assert a 0-indexed column value (integer 0–6). */
function isValidCol0(col) {
  return typeof col === 'number' && Number.isInteger(col) && col >= 0 && col <= 6;
}

/** Validate a highlight_metadata object. Returns null if valid, error string if not. */
function validateHighlightMetadata(hm) {
  if (hm === null || hm === undefined) return null;
  if (hm.type === 'capsule') {
    if (!isValidCol0(hm.column)) return `highlight_metadata.column out of range: ${hm.column}`;
    if (!Number.isInteger(hm.fromRow) || hm.fromRow < 0 || hm.fromRow > 5) return `highlight_metadata.fromRow out of range: ${hm.fromRow}`;
    if (!Number.isInteger(hm.toRow) || hm.toRow < 0 || hm.toRow > 5) return `highlight_metadata.toRow out of range: ${hm.toRow}`;
    return null;
  }
  if (hm.type === 'cells') {
    if (!Array.isArray(hm.cells)) return 'highlight_metadata.cells must be an array';
    for (const cell of hm.cells) {
      if (!isValidCol0(cell.column)) return `highlight_metadata cell column out of range: ${cell.column}`;
      if (!Number.isInteger(cell.row) || cell.row < 0 || cell.row > 5) return `highlight_metadata cell row out of range: ${cell.row}`;
    }
    return null;
  }
  return `highlight_metadata.type unknown: ${hm.type}`;
}

app.use('/api/explain-move', makeLimit(30));
app.use('/api/explain-move-llm', makeLimit(5));
app.use('/api/llm-feedback', makeLimit(10));
app.use('/api/scores', makeLimit(60));
app.use('/api/explain', makeLimit(60));
app.use('/api/stripe/create-checkout', makeLimit(10));
app.use('/api/', makeLimit(120));

// Scores for the empty board (solver hangs on empty input).
// Center-favoring, symmetric, approximate.
const EMPTY_BOARD_SCORES = [0, 0, 1, 2, 1, 0, 0];

// Shared UUID regex for blunder permalink endpoint + OG injection
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// computeThreatCells is imported from ./blunderDetailResponse.js (spec 042, T003) —
// hoisted there so the blunder permalink endpoint's response shape is unit-testable
// without booting the full app/solver.

// ── Input validation ──────────────────────────────────────────────────────────

const MOVES_RE = /^[0-6]{0,42}$/;

function validateMoves(moves) {
  if (typeof moves !== 'string') return 'moves must be a string';
  if (!MOVES_RE.test(moves)) return 'moves must be 0–42 characters of digits 0–6';
  return null;
}

// ── Solver process ────────────────────────────────────────────────────────────

function queryDepth(moves, depth) {
  const binaryPath = join(__dirname, 'c4solver');
  return new Promise((resolve, reject) => {
    const child = spawn(binaryPath, ['-nb', '-d', String(depth), '-a'], { cwd: __dirname });
    let stdout = '';
    child.stdout.on('data', d => { stdout += d; });
    child.stderr.on('data', () => {});
    child.on('error', reject);
    child.on('close', code => {
      if (code !== 0) return reject(new Error(`solver exited ${code}`));
      const line = stdout.trim().split('\n').find(l => l.trim());
      if (!line) return reject(new Error('no output from solver'));
      const parts = line.trim().split(/\s+/);
      const skip = moves.length > 0 ? 1 : 0;
      resolve(parts.slice(skip).map(Number));
    });
    child.stdin.write(moves + '\n');
    child.stdin.end();
  });
}

const solver = createSolverProcess();

// ── Supabase clients ──────────────────────────────────────────────────────────
// supabase     — DB operations only (from(), rpc()); never call auth.* on this
// authClient   — auth operations only (getUser, refreshSession, signInAnonymously)
// Keeping them separate avoids supabase-js session contamination: auth.getUser(userJwt)
// internally stores the user's JWT on the client, which would cause subsequent
// DB inserts to run as 'authenticated' instead of 'service_role', triggering RLS 42501.

let supabase = null;
let authClient = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const { createClient } = await import('@supabase/supabase-js');
  const clientOpts = { auth: { persistSession: false, autoRefreshToken: false } };
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    clientOpts
  );
  authClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    clientOpts
  );
}

// ── Anthropic client ──────────────────────────────────────────────────────────

let anthropic = null;
if (process.env.ANTHROPIC_API_KEY) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

// ── SPA index.html (read at startup for catch-all route) ──────────────────────

let indexHtml = null;
try {
  indexHtml = readFileSync(join(__dirname, '../dist/index.html'), 'utf8');
} catch {
  console.log('[server] dist/index.html not found — SPA catch-all will return 500');
}

// ── Auth proxy endpoints ──────────────────────────────────────────────────────

// attemptRefresh(refreshToken) → { accessToken, refreshToken } | null — shared by
// POST /api/auth/refresh and GET /api/auth/session (auto-refresh, see authRefresh.js).
// authClient may be null if Supabase isn't configured; every call site below already
// guards on `!supabase` (created alongside authClient) before reaching this.
const attemptRefresh = createAttemptRefresh({ authClient });

function cookieOpts() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };
}

const ACCESS_TOKEN_MAX_AGE = 3600_000; // 1 hour
const REFRESH_TOKEN_MAX_AGE = 60 * 24 * 3600_000; // 60 days

// GET /api/auth/oauth/google — redirect to Supabase Google OAuth
app.get('/api/auth/oauth/google', (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Auth not configured' });
  const redirectTo = process.env.FRONTEND_URL || 'http://localhost:5173';
  const authorizeUrl = buildGoogleAuthorizeUrl(process.env.SUPABASE_URL, redirectTo);
  res.redirect(authorizeUrl);
});

// POST /api/auth/callback — exchange OAuth tokens for httpOnly cookies
app.post('/api/auth/callback', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Auth not configured' });
  const { access_token, refresh_token } = req.body;
  if (!access_token) return res.status(400).json({ error: 'access_token is required' });

  try {
    console.log('[auth/callback] verifying access_token, length=', access_token?.length);
    const { data, error } = await authClient.auth.getUser(access_token);
    if (error || !data?.user) {
      console.error('[auth/callback] token invalid:', error?.message);
      return res.status(401).json({ error: 'Invalid token' });
    }
    console.log('[auth/callback] user verified:', data.user.id, 'NODE_ENV=', process.env.NODE_ENV);

    // Set httpOnly cookies
    res.cookie('sb_access_token', access_token, { ...cookieOpts(), maxAge: ACCESS_TOKEN_MAX_AGE });
    if (refresh_token) {
      res.cookie('sb_refresh_token', refresh_token, { ...cookieOpts(), maxAge: REFRESH_TOKEN_MAX_AGE });
    }

    // Fetch user profile to return tier info
    let tier = 'free';
    if (supabase) {
      const { data: profile } = await supabase
        .from('users')
        .select('tier')
        .eq('id', data.user.id)
        .single();
      if (profile) tier = profile.tier;
    }

    res.json({ user: { id: data.user.id, tier } });
  } catch (err) {
    logError('[auth/callback]', err);
    res.status(500).json({ error: 'internal error' });
  }
});

// POST /api/auth/refresh — refresh the access token using the refresh token cookie
app.post('/api/auth/refresh', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Auth not configured' });
  const refreshToken = req.cookies?.sb_refresh_token;
  if (!refreshToken) return res.status(401).json({ error: 'No refresh token' });

  try {
    const result = await attemptRefresh(refreshToken);
    if (!result) {
      res.clearCookie('sb_access_token', cookieOpts());
      res.clearCookie('sb_refresh_token', cookieOpts());
      return res.status(401).json({ error: 'Refresh failed' });
    }

    res.cookie('sb_access_token', result.accessToken, { ...cookieOpts(), maxAge: ACCESS_TOKEN_MAX_AGE });
    if (result.refreshToken) {
      res.cookie('sb_refresh_token', result.refreshToken, { ...cookieOpts(), maxAge: REFRESH_TOKEN_MAX_AGE });
    }

    res.json({ ok: true });
  } catch (err) {
    logError('[auth/refresh]', err);
    res.status(500).json({ error: 'internal error' });
  }
});

// POST /api/auth/signout — clear auth cookies
app.post('/api/auth/signout', (_req, res) => {
  res.clearCookie('sb_access_token', cookieOpts());
  res.clearCookie('sb_refresh_token', cookieOpts());
  res.json({ ok: true });
});

// GET /api/auth/session — return current user from cookie token, transparently
// refreshing via the refresh-token cookie when the access token is missing/invalid
// (spec 045 US2 / FR-004, FR-005: no surprise sign-out mid-session).
app.get('/api/auth/session', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Auth not configured' });
  const accessToken = req.cookies?.sb_access_token;
  const refreshToken = req.cookies?.sb_refresh_token;

  if (!accessToken && !refreshToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    async function fetchProfileResponse(userId) {
      let tier = 'free';
      const { data: profile } = await supabase
        .from('users')
        .select('tier')
        .eq('id', userId)
        .single();
      if (profile) tier = profile.tier;
      return res.json({ user: { id: userId, tier } });
    }

    if (accessToken) {
      const { data, error } = await authClient.auth.getUser(accessToken);
      if (!error && data?.user) {
        return await fetchProfileResponse(data.user.id);
      }
    }

    // Access token absent/invalid/expired — fall through to a silent refresh.
    const result = await attemptRefresh(refreshToken);
    if (!result) {
      res.clearCookie('sb_access_token', cookieOpts());
      res.clearCookie('sb_refresh_token', cookieOpts());
      return res.status(401).json({ error: 'Token invalid' });
    }

    res.cookie('sb_access_token', result.accessToken, { ...cookieOpts(), maxAge: ACCESS_TOKEN_MAX_AGE });
    if (result.refreshToken) {
      res.cookie('sb_refresh_token', result.refreshToken, { ...cookieOpts(), maxAge: REFRESH_TOKEN_MAX_AGE });
    }

    const { data: refreshedUser, error: refreshedUserError } = await authClient.auth.getUser(result.accessToken);
    if (refreshedUserError || !refreshedUser?.user) {
      res.clearCookie('sb_access_token', cookieOpts());
      res.clearCookie('sb_refresh_token', cookieOpts());
      return res.status(401).json({ error: 'Token invalid' });
    }

    return await fetchProfileResponse(refreshedUser.user.id);
  } catch (err) {
    logError('[auth/session]', err);
    res.status(500).json({ error: 'internal error' });
  }
});

// POST /api/auth/anonymous — create anonymous session (dev only)
app.post('/api/auth/anonymous', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Auth not configured' });
  try {
    const { data, error } = await authClient.auth.signInAnonymously();
    if (error || !data?.session) return res.status(400).json({ error: error?.message || 'Anonymous sign-in failed' });

    res.cookie('sb_access_token', data.session.access_token, { ...cookieOpts(), maxAge: ACCESS_TOKEN_MAX_AGE });
    if (data.session.refresh_token) {
      res.cookie('sb_refresh_token', data.session.refresh_token, { ...cookieOpts(), maxAge: REFRESH_TOKEN_MAX_AGE });
    }

    res.json({ user: { id: data.user.id, tier: 'free' } });
  } catch (err) {
    logError('[auth/anonymous]', err);
    res.status(500).json({ error: 'internal error' });
  }
});

// ── Auth middleware (T020) ─────────────────────────────────────────────────────

async function loadUser(req, _res, next) {
  req.user = null;
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : req.cookies?.sb_access_token;

  if (!token || !supabase) return next();

  try {
    const { data, error } = await authClient.auth.getUser(token);
    if (error || !data?.user) return next();

    let { data: profile } = await supabase
      .from('users')
      .select(USER_PROFILE_SELECT_COLUMNS)
      .eq('id', data.user.id)
      .single();

    if (!profile) {
      // Trigger on auth.users may not have fired — create the row now.
      await supabase.from('users').insert({ id: data.user.id }).select(USER_PROFILE_SELECT_COLUMNS).single()
        .then(({ data: created }) => { if (created) profile = created; });
    }

    req.user = profile ? { id: data.user.id, ...profile } : { id: data.user.id, ...defaultUserProfile() };
  } catch {
    // Non-fatal: treat as anonymous
  }
  next();
}

app.use(loadUser);

// ── User data endpoints (/api/user/*) ──
registerUserRoutes(app, supabase);

// ── Deep Reveal quota helper ──────────────────────────────────────────────────

/** Returns the strictly next future Monday 00:00:00 UTC as a Date.
 * If now is exactly Monday 00:00:00 UTC, returns the Monday 7 days later. */
function nextMondayUtcMidnight(now) {
  const dayOfWeek = now.getUTCDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
  const daysUntilMonday = dayOfWeek === 1 ? 7 : (8 - dayOfWeek) % 7;
  const next = new Date(now);
  next.setUTCDate(now.getUTCDate() + daysUntilMonday);
  next.setUTCHours(0, 0, 0, 0);
  return next;
}

async function checkAndDecrementQuota(user) {
  if (!user) return { allowed: false, reason: 'anonymous' };
  if (user.tier === 'paid') return { allowed: true };
  if (user.tier !== 'free') return { allowed: false, reason: 'anonymous' };

  const now = new Date();

  // Treat null deep_reveal_reset_at as already expired
  const resetAtRaw = user.deep_reveal_reset_at;
  const resetAt = (resetAtRaw === null || resetAtRaw === undefined) ? new Date(0) : new Date(resetAtRaw);

  // Reset quota if past the weekly reset time (or null)
  let count = user.deep_reveal_count ?? 0;
  let resetsAt;
  if (now > resetAt) {
    count = 0;
    const nextMonday = nextMondayUtcMidnight(now);
    resetsAt = nextMonday.toISOString();
    await supabase
      .from('users')
      .update({ deep_reveal_count: 0, deep_reveal_reset_at: resetsAt })
      .eq('id', user.id);
  } else {
    resetsAt = resetAt.toISOString();
  }

  if (count >= 20) return { allowed: false, resetsAt };

  await supabase
    .from('users')
    .update({ deep_reveal_count: count + 1 })
    .eq('id', user.id);

  return { allowed: true, resetsAt };
}

// ── LLM explanation composer ──────────────────────────────────────────────────

async function composeExplanation(patternTag, scores, candidateCol, moves) {
  if (!anthropic) {
    return {
      oneLiner: `Move in column ${candidateCol + 1}. Pattern: ${patternTag}.`,
      fullText: `Column ${candidateCol + 1} is the best available move. Pattern detected: ${patternTag}.`,
    };
  }

  const scoreList = scores.map((s, i) => `col ${i + 1}: ${s}`).join(', ');
  const prompt = `You are a Connect Four analysis engine. A pattern classifier has detected the following pattern for a move in a 7-column, 6-row Connect Four game.

Position (move sequence so far): "${moves}"
Candidate move: column ${candidateCol + 1} (1-indexed)
Detected pattern: ${patternTag}
Solver scores for all columns: ${scoreList}

Write two things:
1. ONE_LINER: A single concise sentence (max 20 words) explaining this move based ONLY on the detected pattern. Do not speculate beyond the pattern.
2. FULL_TEXT: A 2-3 sentence explanation grounded in the pattern. Mention specific columns if relevant to the pattern.

Format:
ONE_LINER: <text>
FULL_TEXT: <text>`;

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = msg.content[0]?.text || '';
    const oneLiner = text.match(/ONE_LINER:\s*(.+)/)?.[1]?.trim() ?? `Move in column ${candidateCol + 1}.`;
    const fullText = text.match(/FULL_TEXT:\s*([\s\S]+)/)?.[1]?.trim() ?? oneLiner;
    return { oneLiner, fullText };
  } catch (err) {
    console.error('[llm]', err.message);
    return {
      oneLiner: `Column ${candidateCol + 1}: ${patternTag.replace(/_/g, ' ')}.`,
      fullText: null,
    };
  }
}

// ── Routes (existing — unchanged) ─────────────────────────────────────────────

app.get('/api/ping', (_req, res) => res.json({ ok: true }));

// ── Papergames proxy (PoC — no auth required) ───────────────────────────────

const PAPERGAMES_API = 'https://papergames.io';

app.post('/api/papergames/guest-registration', async (req, res) => {
  try {
    const pgRes = await fetch(`${PAPERGAMES_API}/api/authentication/guest-registration`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-app-platform': 'web' },
      body: JSON.stringify(req.body),
    });
    const data = await pgRes.json();
    res.status(pgRes.status).json(data);
  } catch (err) {
    logError('[papergames/guest-registration]', err);
    res.status(502).json({ error: 'Papergames unavailable' });
  }
});

app.get('/api/papergames/tournament/open', async (req, res) => {
  try {
    const pgRes = await fetch(`${PAPERGAMES_API}/api/tournament/open?type=Connect4&_t=${Date.now()}`, {
      headers: { 'x-app-platform': 'web', ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}) },
    });
    const data = await pgRes.json();
    res.status(pgRes.status).json(data);
  } catch (err) {
    logError('[papergames/tournament/open]', err);
    res.status(502).json({ error: 'Papergames unavailable' });
  }
});

// ── Lesson routes (FR-033, FR-034, FR-035 — no auth required) ─────────────────
app.get('/api/lessons', (req, res) => res.json(getLessons()));
app.get('/api/lessons/:id', (req, res) => {
  const lesson = getLesson(req.params.id);
  if (!lesson) return res.status(404).json({ error: 'not_found' });
  res.json(lesson);
});

// ── Admin eval-set endpoints ───────────────────────────────────────────────────

app.get('/api/admin/eval-sets', requireLocalhost, requireAdmin, (req, res) => {
  const scriptsDir = join(dirname(fileURLToPath(import.meta.url)), 'scripts');
  try {
    const files = readdirSync(scriptsDir).filter(isValidEvalSetFilename).sort();
    res.json({ files });
  } catch {
    res.json({ files: [] });
  }
});

app.get('/api/admin/eval-set', requireLocalhost, requireAdmin, (req, res) => {
  const evalPath = join(dirname(fileURLToPath(import.meta.url)), 'scripts', 'eval_set.json');
  try {
    res.json(JSON.parse(readFileSync(evalPath, 'utf-8')));
  } catch {
    res.status(404).json({ error: 'eval_set.json not found — run server/scripts/generate_eval_set.mjs first' });
  }
});

app.get('/api/admin/eval-set/:name', requireLocalhost, requireAdmin, (req, res) => {
  const { name } = req.params;
  if (!isValidEvalSetFilename(`${name}.json`)) {
    return res.status(400).json({ error: 'invalid eval set name' });
  }
  const filePath = join(dirname(fileURLToPath(import.meta.url)), 'scripts', `${name}.json`);
  try {
    res.json(JSON.parse(readFileSync(filePath, 'utf-8')));
  } catch (err) {
    if (err.code === 'ENOENT') return res.status(404).json({ error: 'eval set not found' });
    logError('[admin/eval-set]', err);
    res.status(500).json({ error: 'internal error' });
  }
});

app.get('/api/admin/eval-results', requireLocalhost, requireAdmin, (req, res) => {
  const scriptsDir = join(dirname(fileURLToPath(import.meta.url)), 'scripts');
  try {
    const files = readdirSync(scriptsDir)
      .filter(isValidEvalFilename)
      .sort();
    res.json({ files });
  } catch {
    res.json({ files: [] });
  }
});

app.get('/api/admin/eval-results/:filename', requireLocalhost, requireAdmin, (req, res) => {
  const { filename } = req.params;
  if (!isValidEvalFilename(filename)) {
    return res.status(400).json({ error: 'invalid filename' });
  }
  const safe = basename(filename);
  const filePath = join(dirname(fileURLToPath(import.meta.url)), 'scripts', safe);
  try {
    const lines = readFileSync(filePath, 'utf-8').trim().split('\n').filter(Boolean);
    const rows = lines.map(line => {
      const obj = JSON.parse(line);
      return {
        id: obj.id,
        board_state: obj.board_state,
        final_response: obj.final_response,
        prompt: obj.prompt ?? null,
        prompt_data: obj.prompt_data ?? null,
        feature_vector: obj.feature_vector ?? null,
        filtered_prompt_data: obj.filtered_prompt_data ?? null, // legacy result files
        attempt1_failures: obj.attempt1_failures ?? [],
        attempt2_failures: obj.attempt2_failures ?? [],
      };
    });
    res.json({ rows });
  } catch (err) {
    if (err.code === 'ENOENT') return res.status(404).json({ error: 'file not found' });
    logError('[admin/eval-results/:filename]', err);
    res.status(500).json({ error: 'internal error' });
  }
});

// POST /api/admin/eval-feedback — append a human flag for one eval entry to a
// sidecar JSONL file alongside the results file (left-joined by `id` by the
// judge-deep-reveals skill). Body: { filename, id, human_note }.
app.post('/api/admin/eval-feedback', requireLocalhost, requireAdmin, (req, res) => {
  const { filename, id, human_note } = req.body;

  if (!isValidEvalFilename(filename)) {
    return res.status(400).json({ error: 'invalid filename' });
  }
  if (id === undefined || id === null || id === '') {
    return res.status(400).json({ error: 'id is required' });
  }

  const feedbackName = feedbackFilenameFor(basename(filename));
  if (!feedbackName) {
    return res.status(400).json({ error: 'invalid filename' });
  }

  const filePath = join(dirname(fileURLToPath(import.meta.url)), 'scripts', feedbackName);
  const record = {
    id,
    human_note: typeof human_note === 'string' ? human_note : '',
    flagged_at: new Date().toISOString(),
  };
  try {
    appendFileSync(filePath, JSON.stringify(record) + '\n', 'utf-8');
    res.status(201).json({ ok: true, feedback_file: feedbackName });
  } catch (err) {
    logError('[admin/eval-feedback]', err);
    res.status(500).json({ error: 'internal error' });
  }
});

// ── Reason-vector LLM-eval browser ("Eval answers" mode of /admin/fv-suff) ──────
// Joins, by id, an eval SET ({id, pattern_category, feature_vector} from
// build_fv_eval_set.mjs / build_reason_eval_set.mjs), an ANSWERS jsonl
// (explain_from_vector.mjs), and an optional GRADES jsonl (grade-fv-sufficiency's
// <stem>_grades.jsonl side-output). Lets you read board + vector + LLM answer +
// grade together to spot reason-engine / glossary defects. Read-only, localhost-admin.
// (Validators/derivers are in evalResultsHelpers.js, unit-tested.)

app.get('/api/admin/fv-suff/files', requireLocalhost, requireAdmin, (req, res) => {
  const scriptsDir = join(dirname(fileURLToPath(import.meta.url)), 'scripts');
  try {
    const all = readdirSync(scriptsDir);
    res.json({ answers: all.filter((f) => isFvSuffAnswersFile(f) && !f.endsWith('_grades.jsonl')).sort() });
  } catch {
    res.json({ answers: [] });
  }
});

app.get('/api/admin/fv-suff', requireLocalhost, requireAdmin, (req, res) => {
  const scriptsDir = join(dirname(fileURLToPath(import.meta.url)), 'scripts');
  const answersName = req.query.answers || 'fv_suff_answers_all.jsonl';
  if (!isFvSuffAnswersFile(answersName)) return res.status(400).json({ error: 'invalid answers filename' });
  const parseJsonl = (path) => readFileSync(path, 'utf-8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
  try {
    const answers = parseJsonl(join(scriptsDir, basename(answersName)));
    const set = deriveSetFromAnswers(answers);
    let grades = [];
    const gradesName = gradesFilenameFor(basename(answersName));
    if (gradesName) {
      try { grades = parseJsonl(join(scriptsDir, gradesName)); }
      catch (e) { if (e.code !== 'ENOENT') throw e; }
    }
    res.json({ set, answers, grades });
  } catch (err) {
    if (err.code === 'ENOENT') return res.status(404).json({ error: 'answers file not found' });
    logError('[admin/fv-suff]', err);
    res.status(500).json({ error: 'internal error' });
  }
});

// ── Blunder-reason evidence browser ────────────────────────────────────────────
// Serves precomputed reasonEngine evidence (one object per line, produced by
// server/scripts/reason_engine/build_evidence.mjs). Read-only, localhost-admin only.
// No solver runs in the web server. See docs/architecture/blunder-reason-evidence.md.

function isReasonEvidenceFile(name) {
  return typeof name === 'string' && /^reason_evidence_[\w.-]*\.jsonl$/.test(name);
}

app.get('/api/admin/reason/files', requireLocalhost, requireAdmin, (req, res) => {
  const scriptsDir = join(dirname(fileURLToPath(import.meta.url)), 'scripts');
  try {
    const files = readdirSync(scriptsDir).filter(isReasonEvidenceFile).sort();
    res.json({ files });
  } catch {
    res.json({ files: [] });
  }
});

app.get('/api/admin/reason', requireLocalhost, requireAdmin, (req, res) => {
  const scriptsDir = join(dirname(fileURLToPath(import.meta.url)), 'scripts');
  const fileName = req.query.file || 'reason_evidence_all.jsonl';
  if (!isReasonEvidenceFile(fileName)) {
    return res.status(400).json({ error: 'invalid reason evidence filename' });
  }
  try {
    const rows = readFileSync(join(scriptsDir, basename(fileName)), 'utf-8')
      .trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
    res.json({ rows });
  } catch (err) {
    if (err.code === 'ENOENT') return res.status(404).json({ error: 'reason evidence file not found' });
    logError('[admin/reason]', err);
    res.status(500).json({ error: 'internal error' });
  }
});

// ── Admin lesson endpoints ─────────────────────────────────────────────────────

app.get('/api/admin/lessons', requireLocalhost, requireAdmin, (req, res) => {
  res.json(getLessonsAll());
});

app.get('/api/admin/lessons/:id', requireLocalhost, requireAdmin, (req, res) => {
  const all = getLessonsAll();
  const lesson = all.find(l => l.id === req.params.id);
  if (!lesson) return res.status(404).json({ error: 'not_found' });
  res.json(lesson);
});

app.post('/api/admin/lessons', requireLocalhost, requireAdmin, (req, res) => {
  const lesson = req.body;
  const err = validateLesson(lesson);
  if (err) return res.status(400).json({ error: err });
  try {
    saveLessonFile(LESSONS_DIR, lesson);
    reloadLessons();
    res.status(201).json({ ok: true });
  } catch (e) {
    logError('[admin/lessons/create]', e);
    res.status(500).json({ error: 'internal error' });
  }
});

app.put('/api/admin/lessons/:id', requireLocalhost, requireAdmin, (req, res) => {
  const lesson = req.body;
  const err = validateLesson(lesson);
  if (err) return res.status(400).json({ error: err });
  try {
    const oldId = req.params.id !== lesson.id ? req.params.id : null;
    saveLessonFile(LESSONS_DIR, lesson, oldId);
    reloadLessons();
    res.json({ ok: true });
  } catch (e) {
    logError('[admin/lessons/update]', e);
    res.status(500).json({ error: 'internal error' });
  }
});

app.delete('/api/admin/lessons/:id', requireLocalhost, requireAdmin, (req, res) => {
  try {
    deleteLessonFile(LESSONS_DIR, req.params.id);
    reloadLessons();
    res.json({ ok: true });
  } catch (e) {
    logError('[admin/lessons/delete]', e);
    res.status(500).json({ error: 'internal error' });
  }
});

// Requires requireLocalhost — the function declaration below (~:2795 in this file)
// is hoisted, so it is safe to reference here at module init time.
app.post('/api/admin/lessons/:id/generate-audio', requireLocalhost, requireAdmin, async (req, res) => {
  const lesson = getLesson(req.params.id);
  if (!lesson) return res.status(404).json({ error: 'not_found' });
  try {
    const { lesson: updatedLesson, generated, failed } = await generateLessonAudio(lesson);
    saveLessonFile(LESSONS_DIR, updatedLesson);
    reloadLessons();
    res.json({ lesson: updatedLesson, generated, failed });
  } catch (e) {
    logError('[admin/lessons/generate-audio]', e);
    res.status(500).json({ error: 'internal error' });
  }
});

app.post('/api/admin/lessons/prune-audio', requireLocalhost, requireAdmin, (req, res) => {
  try {
    const deleted = pruneOrphanedLessonAudio(getLessonsAll());
    res.json({ deleted });
  } catch (e) {
    logError('[admin/lessons/prune-audio]', e);
    res.status(500).json({ error: 'internal error' });
  }
});

// ── Admin puzzle picker ──────────────────────────────────────────────────────────

app.get('/api/admin/puzzles', requireLocalhost, requireAdmin, async (req, res) => {
  const { category } = req.query;
  if (!category || typeof category !== 'string') {
    return res.status(400).json({ error: 'category query parameter is required' });
  }
  if (!VALID_CATEGORIES.has(category)) {
    return res.status(400).json({ error: `invalid category: ${category}` });
  }
  try {
    const { data: puzzles, error } = await supabase
      .from('puzzles')
      .select('id, category, move_string, goal_prompt, goal_predicate_type, goal_predicate_params, cooperative_ai_moves, interaction_mode, highlight_metadata, correct_col, user_player, created_at')
      .eq('is_active', true)
      .eq('category', category)
      .order('created_at', { ascending: true });
    if (error) { logError('[admin/puzzles]', error); return res.status(500).json({ error: 'internal error' }); }
    res.json({ puzzles: puzzles || [] });
  } catch (e) {
    logError('[admin/puzzles]', e);
    res.status(500).json({ error: 'internal error' });
  }
});

app.post('/api/scores', async (req, res) => {
  const { moves, depth } = req.body;
  if (typeof moves !== 'string') {
    return res.status(400).json({ error: 'moves must be a string' });
  }

  if (moves === '' && !depth) {
    return res.json({ scores: EMPTY_BOARD_SCORES });
  }

  try {
    console.log(`[api] /api/scores moves="${moves}" depth=${depth ?? 'unlimited'}`);
    const t0 = Date.now();
    const scores = depth ? await queryDepth(moves, depth) : await solver.query(moves);
    console.log(`[api] done in ${Date.now()-t0}ms → ${scores}`);
    res.json({ scores });
  } catch (err) {
    logError('[scores]', err);
    res.status(500).json({ error: 'internal error' });
  }
});

app.post('/api/explain', async (req, res) => {
  const { moves, humanFirst = true } = req.body;
  if (typeof moves !== 'string') {
    return res.status(400).json({ error: 'moves must be a string' });
  }

  const binaryPath = join(__dirname, 'c4solver');

  try {
    const result = await new Promise((resolve, reject) => {
      const child = spawn(binaryPath, ['-x'], { cwd: __dirname });
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', d => { stdout += d.toString(); });
      child.stderr.on('data', d => { stderr += d.toString(); });

      child.on('exit', code => {
        if (code !== 0 && stdout === '') {
          reject(new Error(`solver exited ${code}: ${stderr.trim()}`));
        } else {
          resolve(stdout.trim());
        }
      });

      child.on('error', reject);
      child.stdin.write(moves + '\n');
      child.stdin.end();
    });

    const parts = result.split(/\s+/);
    const nums = parts.slice(1).map(Number);

    const ROWS = 6, COLS = 7;

    if (nums.length !== 84) {
      const empty = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
      return res.json({ human: empty, ai: empty });
    }

    const current  = Array.from({ length: ROWS }, (_, r) => nums.slice(r * COLS, r * COLS + COLS));
    const opponent = Array.from({ length: ROWS }, (_, r) => nums.slice(42 + r * COLS, 42 + r * COLS + COLS));

    const { human, ai } = assignHeatmaps(current, opponent, moves.length, humanFirst);
    res.json({ human, ai });
  } catch (err) {
    logError('[explain]', err);
    res.status(500).json({ error: 'internal error' });
  }
});

// ── New routes ─────────────────────────────────────────────────────────────────

// T017: Analytics track endpoint
app.post('/api/track', async (req, res) => {
  res.status(204).end(); // always respond immediately

  const { event, path: eventPath, data = {} } = req.body;
  const uid = req.user?.device_uuid || req.body.uid || 'unknown';
  const userId = req.user?.id || null;

  if (!supabase || !event) return;

  supabase.from('tracks').insert({
    uid,
    user_id: userId,
    path: eventPath || '/',
    event,
    event_data: data,
  }).then(() => {}).catch(err => console.error('[track]', err.message));
});

// T028: Explanation Engine endpoint
app.post('/api/explain-move', async (req, res) => {
  const { moves, candidateCol, humanFirst = true, requestDeepReveal = false } = req.body;

  const movesErr = validateMoves(moves ?? '');
  if (movesErr) return res.status(400).json({ error: movesErr });
  if (typeof candidateCol !== 'number' || candidateCol < 0 || candidateCol > 6) {
    return res.status(400).json({ error: 'candidateCol must be integer 0–6' });
  }

  // Anonymous users cannot request Deep Reveals
  if (requestDeepReveal && !req.user) {
    return res.status(403).json({ error: 'Deep Reveals require a free account' });
  }

  const positionHash = createHash('sha256')
    .update(`${moves}:${candidateCol}`)
    .digest('hex');

  // Check explanation cache first
  let cachedEntry = null;
  if (supabase) {
    const { data } = await supabase
      .from('explanation_cache')
      .select('one_liner, deep_reveal_json')
      .eq('position_hash', positionHash)
      .single();
    cachedEntry = data;
  }

  let oneLiner, deepRevealData, patternTag;

  if (cachedEntry) {
    oneLiner = cachedEntry.one_liner;
    deepRevealData = cachedEntry.deep_reveal_json;
    patternTag = deepRevealData?.patternTag ?? 'best_move';
  } else {
    // Get solver scores for classification
    let scores = EMPTY_BOARD_SCORES;
    if (moves.length > 0) {
      try {
        scores = await solver.query(moves);
      } catch (err) {
        console.error('[explain-move] solver error:', err.message);
        return res.status(500).json({ error: 'Solver unavailable' });
      }
    }

    const classification = classify(moves, candidateCol, scores);
    patternTag = classification.tag;

    const { oneLiner: ol, fullText } = await composeExplanation(patternTag, scores, candidateCol, moves);
    oneLiner = ol;
    deepRevealData = {
      patternTag,
      fullText: fullText ?? oneLiner,
      continuationLine: [],
      boardAnnotation: [],
    };

    // Write to cache
    if (supabase) {
      supabase.from('explanation_cache').insert({
        position_hash: positionHash,
        one_liner: oneLiner,
        deep_reveal_json: deepRevealData,
      }).then(() => {}).catch(err => console.error('[cache write]', err.message));
    }
  }

  // Handle Deep Reveal — no quota gate on this endpoint (quota is on /api/explain-move-llm)
  let deepReveal = null;

  if (requestDeepReveal && req.user) {
    deepReveal = deepRevealData;
  }

  // Response-boundary guard (spec 042 US5, FR-019): strip internal community-/allen- label
  // prefixes and raw cXrY coordinate tokens from every player-facing text field, regardless of
  // whether it came from the cache or was just generated (research.md §5).
  res.json(guardExplainMovePayload({ oneLiner, patternTag, deepReveal }));
});

// ── LLM coaching endpoints ─────────────────────────────────────────────────────

// POST /api/explain-move-llm — LLM explanation of a specific user move.
// Returns { explanation: string, cached?: boolean }.
// Auth required (401 for unauthenticated). Free-tier: weekly quota of 20 (429 when exceeded).
// Cache hits do not decrement quota. Rate-limited to 5 req/min (LLM cost guard).
app.post('/api/explain-move-llm', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const { movestring, col, rounds } = req.body;

  if (typeof movestring !== 'string' || !/^[0-6]{0,42}$/.test(movestring))
    return res.status(400).json({ error: 'movestring must be 0–42 digits 0–6' });
  if (typeof col !== 'number' || !Number.isInteger(col) || col < 0 || col > 6)
    return res.status(400).json({ error: 'col must be integer 0–6' });
  const r = Number(rounds ?? 1);
  if (!Number.isInteger(r) || r < 1 || r > 5)
    return res.status(400).json({ error: 'rounds must be an integer between 1 and 5' });
  if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_MODEL)
    return res.status(503).json({ error: 'LLM service not configured' });

  let board;
  try {
    board = new Board(movestring);
  } catch (e) {
    return res.status(400).json({ error: `Invalid movestring: ${e.message}` });
  }

  if (board.colHeights[col] >= 6)
    return res.status(400).json({ error: 'column is full' });

  // ── 1. Cache check (before quota decrement) ──────────────────────────────
  const positionHash = createHash('sha256').update(`${movestring}:${col}`).digest('hex');
  if (supabase) {
    const { data: cached } = await supabase
      .from('explanation_cache')
      .select('deep_reveal_json')
      .eq('position_hash', positionHash)
      .single();
    if (cached?.deep_reveal_json) {
      // Response-boundary guard (spec 042 US5, FR-019): a cache hit bypasses every producer
      // module (computeMechanism/explainContext/llmCoachHelpers), so this is the ONLY seam that
      // can catch a leak in a previously-cached row (research.md §5).
      return res.json(guardExplainMoveLlmPayload({
        explanation: cached.deep_reveal_json.explanation,
        prompt: cached.deep_reveal_json.prompt ?? '',
        terms: cached.deep_reveal_json.terms ?? {},
        cached: true,
      }));
    }
  }

  // ── 2. Reason-engine mechanism pipeline (computeMechanism owns the single LLM retry) ──────
  try {
    const result = await computeMechanism(movestring, col, {
      solver,
      model: process.env.OPENAI_MODEL, // mini model (gpt-5.4-mini); EXPLAIN_MODEL is the eval-only full model
      userId: req.user.id,
    });

    if (result.notABlunder) {
      // The played move is not a blunder — nothing to punish. No LLM call, no quota consumed.
      return res.json(guardExplainMoveLlmPayload({
        explanation: 'This move keeps the game on its best track — there is no better alternative to highlight here.',
        prompt: '',
        terms: {},
      }));
    }

    // No fallback (by design): after one LLM retry, a persisting LLM error or an empty mechanism
    // is terminal. Log to deep_reveal_failures and surface a 500 — never fabricate a substitute.
    if (result.callError || result.parseError || !result.mechanism) {
      if (supabase) {
        try {
          await supabase.from('deep_reveal_failures').insert({
            position_hash: positionHash,
            movestring,
            col,
            endpoint: '/api/explain-move-llm',
            llm_prompt: result.prompt,
            raw_llm_output: result.raw,
            failure_reason: result.callError ?? result.parseError ?? 'empty mechanism',
            created_at: new Date().toISOString(),
          });
        } catch (insertErr) {
          console.error('[deep_reveal_failures insert]', insertErr.message);
        }
      }
      return res.status(500).json({ error: 'Internal server error' });
    }

    // `mechanism` is coach-voice text carrying inline [zone:…] tags (→ board highlights via
    // <AnnotatedExplanation>) and [term:kbId] tags (→ KB-term tap popups). It drops straight into
    // the response as `explanation`.
    const explanation = result.mechanism;
    const prompt = result.prompt;

    // Scan explanation for [term:kbId] tags and build a terms map with short KB summaries for the
    // tap popups (same contract as the response `terms` field the frontend already consumes).
    const termTagRegex = /\[term:([^\]]+)\]/g;
    const termsMap = {};
    const seenTermIds = new Set();
    let termMatch;
    while ((termMatch = termTagRegex.exec(explanation)) !== null) {
      const kbId = termMatch[1];
      if (seenTermIds.has(kbId)) continue;
      seenTermIds.add(kbId);
      const shortSummary = loadKBShortSummary(kbId);
      if (shortSummary) termsMap[kbId] = shortSummary;
    }

    // ── Decrement quota (if free-tier), cache, and respond ──
    if (req.user.tier === 'free' && supabase) {
      const quota = await checkAndDecrementQuota(req.user);
      if (!quota.allowed) {
        return res.status(429).json({ error: 'quota_exceeded', resetsAt: quota.resetsAt });
      }
    }

    if (supabase) {
      supabase.from('explanation_cache').insert({
        position_hash: positionHash,
        one_liner: '',
        deep_reveal_json: { explanation, prompt, terms: termsMap },
        template_version: 'v3',
      }).then(() => {}).catch(err => console.error('[cache write]', err.message));
    }

    // Response-boundary guard (spec 042 US5, FR-019): applied here too (not just the cache-hit
    // branch above) so a freshly-generated leak — e.g. an LLM non-compliance emitting
    // `[term:community-z-threat]` instead of the instructed `[term:z_threat]` — is caught before
    // it ever reaches a client, in addition to what gets written into `explanation_cache` for a
    // future cache hit.
    res.json(guardExplainMoveLlmPayload({ explanation, prompt, terms: termsMap }));

  } catch (err) {
    console.error('[explain-move-llm] error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/llm-feedback — record a flagged LLM response.
// Returns { id: string }.
// No auth required.
// col (integer) is optional — when provided and llm_prompt is empty, the prompt is rebuilt
// from the simulation pipeline so the full context is always captured.
app.post('/api/llm-feedback', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });

  const { movestring, col, llm_prompt, llm_response, human_note, feature } = req.body;

  for (const [field, value] of Object.entries({ movestring, llm_response, feature })) {
    if (typeof value !== 'string' || value.trim() === '') {
      return res.status(400).json({ error: `${field} must be a non-empty string` });
    }
  }

  // Resolve prompt: use what the client sent; if empty and col is available, recover the prompt
  // that was actually stored alongside the flagged response. Feedback recording is deliberately
  // decoupled from any explanation-generation algorithm — we only READ the stored prompt, never
  // regenerate it. A missing prompt is fine (the response + note are the load-bearing feedback).
  let resolvedPrompt = typeof llm_prompt === 'string' ? llm_prompt : '';
  if (!resolvedPrompt && typeof col === 'number' && Number.isInteger(col) && col >= 0 && col <= 6) {
    try {
      const positionHash = createHash('sha256').update(`${movestring}:${col}`).digest('hex');
      const { data: cached } = await supabase
        .from('explanation_cache')
        .select('deep_reveal_json')
        .eq('position_hash', positionHash)
        .single();
      if (cached?.deep_reveal_json?.prompt) resolvedPrompt = cached.deep_reveal_json.prompt;
    } catch {
      // Non-fatal — proceed with whatever prompt we have (possibly empty).
    }
  }

  try {
    const { data, error } = await supabase
      .from('llm_feedback')
      .insert({ movestring, llm_prompt: resolvedPrompt, llm_response, human_note, feature })
      .select('id')
      .single();

    if (error) { logError('[llm-feedback]', error); return res.status(500).json({ error: 'internal error' }); }
    res.status(201).json({ id: data.id });
  } catch (err) {
    logError('[llm-feedback]', err);
    res.status(500).json({ error: 'internal error' });
  }
});

/**
 * Severity of a blunder on a 0–10 scale.
 * Raw diff (best_score − score) is normalized by 36 (the maximum possible spread on a 7×6
 * board, from +18 to −18) and scaled to 10, then rounded to the nearest integer.
 * Both scores use the c4solver convention (current-player perspective, range ±18).
 * Stored at write time so the queue endpoint never needs to re-run the solver.
 * Returns 0 when solver data is unavailable.
 * @param {number} bestScore - solver score of the optimal column
 * @param {number} score - solver score of the column actually played
 * @returns {number} integer in [0, 10]
 */
function computeSeverity(bestScore, score) {
  if (typeof bestScore !== 'number' || typeof score !== 'number') return 0;
  return Math.round((bestScore - score) / 36 * 10);
}

// POST /api/blunders — record a sparring blunder for the authenticated user
// Auth required: returns 401 silently if no user (client fire-and-forgets this call).
app.post('/api/blunders', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });

  const { board_state, move_played, correct_move, pattern_category, score, best_score } = req.body;

  // Validate required fields are present
  if (board_state === undefined || move_played === undefined || correct_move === undefined || pattern_category === undefined) {
    return res.status(400).json({ error: 'board_state, move_played, correct_move, and pattern_category are required' });
  }

  // board_state must match /^[0-6]{0,42}$/
  if (typeof board_state !== 'string' || !/^[0-6]{0,42}$/.test(board_state)) {
    return res.status(400).json({ error: 'board_state must be 0–42 characters of digits 0–6' });
  }

  // move_played and correct_move must be integers 0–6
  if (!Number.isInteger(move_played) || move_played < 0 || move_played > 6) {
    return res.status(400).json({ error: 'move_played must be an integer 0–6' });
  }
  if (!Number.isInteger(correct_move) || correct_move < 0 || correct_move > 6) {
    return res.status(400).json({ error: 'correct_move must be an integer 0–6' });
  }

  // pattern_category must be a non-empty string
  if (typeof pattern_category !== 'string' || pattern_category.trim() === '') {
    return res.status(400).json({ error: 'pattern_category must be a non-empty string' });
  }

  // Auth required
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  // Storage rule (mistakeStorageRule.js, 2026-07): slower wins and faster losses
  // from DEAD positions (no potential four-in-a-row left for the mover) are not
  // stored; theoretically-lost-but-alive positions still are — this is NOT the
  // old `bestScore < 0` skip (see data-model.md migration 029 note). Requires
  // numeric score/best_score to classify; without them the move is not stored.
  const storedMistake = classifyStoredMistake(best_score, score, board_state);
  if (!storedMistake) {
    return res.status(200).json({ stored: false, reason: 'not_a_stored_mistake' });
  }

  try {
    // Guard against stale clients sending unrecognized tags (e.g., 'unknown')
    const safeCategory = VALID_BLUNDER_TAGS.has(pattern_category)
      ? pattern_category
      : 'suboptimal_move';
    if (!VALID_BLUNDER_TAGS.has(pattern_category)) {
      console.warn(`POST /api/blunders: unrecognized pattern_category '${pattern_category}' substituted with 'suboptimal_move'`);
    }

    // Plain insert — the partial unique index (migration 030) guards against
    // duplicates on (user_id, board_state, move_played) WHERE puzzle_id IS NULL.
    // Supabase upsert can't resolve conflicts against partial indexes, so we
    // insert and treat unique-violation (23505) as success.
    const { data, error } = await supabase
      .from('blunders')
      .insert({
        user_id: req.user.id,
        puzzle_id: null,
        board_state,
        move_played,
        correct_move,
        pattern_category: safeCategory,
        quality: storedMistake.quality,
        severity: computeSeverity(best_score, score),
        blunder_severity: req.body.blunder_severity ?? null,
      })
      .select('id');

    if (error) {
      if (error.code === '23505') return res.status(200).json({ deduplicated: true });
      logError('[blunders]', error);
      return res.status(500).json({ error: 'internal error' });
    }
    res.status(201).json({ id: data[0].id });
  } catch (err) {
    logError('[blunders]', err);
    res.status(500).json({ error: 'internal error' });
  }
});

// ── Puzzle endpoints (T035-T037) ───────────────────────────────────────────────

function userCanAccessCategory(user, categoryId) {
  if (!PAID_CATEGORIES.has(categoryId)) return true;
  return user?.tier === 'paid';
}

// GET /api/stats — per-user accuracy stats aggregated from puzzle_attempts
// Scale-correct via computeStatsAggregate (spec 041 US3): DB-side grouped count() through the
// puzzles!inner(category) join, not an unbounded per-row select — see server/statsAggregate.js.
app.get('/api/stats', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const result = await computeStatsAggregate(supabase, req.user.id);
    res.json(result);
  } catch (err) {
    logError('[stats]', err);
    res.status(500).json({ error: 'internal error' });
  }
});

// GET /api/puzzles — return category list with lock flags and optional puzzles per category
app.get('/api/puzzles', async (req, res) => {
  const categoryId = req.query.category || null;

  if (!supabase) {
    const categories = CATEGORY_ORDER.map(slug => ({
      id: slug,
      locked: !userCanAccessCategory(req.user, slug),
      count: 0,
      puzzles: [],
    }));
    return res.json({ categories });
  }

  try {
    let query = supabase
      .from('puzzles')
      .select('id, category, goal_prompt, difficulty')
      .eq('is_active', true);

    if (categoryId) query = query.eq('category', categoryId);

    const { data: puzzles, error } = await query;
    if (error) { logError('[puzzles]', error); return res.status(500).json({ error: 'internal error' }); }

    // Group by category
    const byCategory = {};
    for (const p of (puzzles || [])) {
      if (!byCategory[p.category]) byCategory[p.category] = [];
      byCategory[p.category].push(p);
    }

    const categories = CATEGORY_ORDER.map(slug => ({
      id: slug,
      locked: !userCanAccessCategory(req.user, slug),
      count: byCategory[slug]?.length ?? 0,
      puzzles: byCategory[slug] ?? [],
    }));

    res.json({ categories });
  } catch (err) {
    logError('[puzzles/admin]', err);
    res.status(500).json({ error: 'internal error' });
  }
});

// NOTE: /api/puzzles/counts, /api/puzzles/draw, and /api/evaluate-move MUST remain
// above /api/puzzles/:id — Express first-match ordering swallows 'counts' and 'draw'
// as /:id params if registered after.

// GET /api/puzzles/counts — return per-category puzzle counts and challenge set metadata
app.get('/api/puzzles/counts', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'database unavailable' });

  try {
    const { data, error } = await supabase
      .from('puzzles')
      .select('category, count()')
      .eq('is_active', true);

    if (error) { logError('[puzzles/counts]', error); return res.status(500).json({ error: 'internal error' }); }

    const counts = {};
    for (const slug of CATEGORY_ORDER) {
      counts[slug] = 0;
    }
    for (const row of (data || [])) {
      if (row.category in counts) {
        counts[row.category] = Number(row.count);
      }
    }

    res.json({ counts, sets: CHALLENGE_SETS });
  } catch (err) {
    logError('[puzzles/counts]', err);
    res.status(500).json({ error: 'internal error' });
  }
});

// GET /api/puzzles/draw — draw N random puzzles from a category
app.get('/api/puzzles/draw', async (req, res) => {
  const { category } = req.query;
  let n = req.query.n !== undefined ? parseInt(req.query.n, 10) : 8;

  // mixed is not in VALID_CATEGORIES — must be checked first
  if (category === 'mixed') {
    if (req.user?.tier !== 'paid') {
      return res.status(403).json({ error: 'Pro subscription required' });
    }
  } else if (!VALID_CATEGORIES.has(category)) {
    return res.status(400).json({ error: 'invalid category' });
  } else if (PAID_CATEGORIES.has(category) && req.user?.tier !== 'paid') {
    return res.status(403).json({ error: 'Pro subscription required' });
  }

  // Validate n
  if (req.query.n !== undefined && (isNaN(n) || n < 1 || n > 8)) {
    return res.status(400).json({ error: 'invalid n' });
  }
  if (isNaN(n) || n < 1 || n > 8) n = 8;

  if (!supabase) return res.status(503).json({ error: 'database unavailable' });

  try {
    let puzzles;
    if (category === 'mixed') {
      // Interleave: fetch position-ordered pools per category, then take one from each
      const pools = {};
      for (const cat of CATEGORY_ORDER) {
        const { data: catPuzzles } = await supabase
          .from('puzzles')
          .select('id, category, move_string, interaction_mode, highlight_metadata, correct_col, user_player, shape_key, highlight_cells')
          .eq('category', cat)
          .eq('is_active', true)
          .not('position', 'is', null)
          .order('position', { ascending: true })
          .limit(n);
        pools[cat] = catPuzzles || [];
      }

      // Interleave: take one from each category per position index
      puzzles = [];
      for (let posIdx = 0; posIdx < n && puzzles.length < n; posIdx++) {
        for (const cat of CATEGORY_ORDER) {
          if (posIdx < pools[cat].length && puzzles.length < n) {
            puzzles.push(pools[cat][posIdx]);
          }
        }
      }
    } else {
      // Single-category: position-based ordering with random offset
      const { count: totalIndexed, error: countErr } = await supabase
        .from('puzzles')
        .select('*', { count: 'exact', head: true })
        .eq('category', category)
        .eq('is_active', true)
        .not('position', 'is', null);

      if (countErr) { logError('[puzzles/draw]', countErr); return res.status(500).json({ error: 'internal error' }); }

      if (totalIndexed === 0) {
        puzzles = [];
      } else {
        const offset = Math.floor(Math.random() * Math.max(0, totalIndexed - n + 1));
        const { data: result, error: resultErr } = await supabase
          .from('puzzles')
          .select('id, category, move_string, interaction_mode, highlight_metadata, correct_col, user_player, shape_key, highlight_cells')
          .eq('category', category)
          .eq('is_active', true)
          .not('position', 'is', null)
          .order('position', { ascending: true })
          .range(offset, offset + n - 1);

        if (resultErr) { logError('[puzzles/draw]', resultErr); return res.status(500).json({ error: 'internal error' }); }

        puzzles = result || [];

        // Wrap around if needed
        if (puzzles.length < n && totalIndexed > puzzles.length) {
          const remaining = n - puzzles.length;
          const { data: wrap } = await supabase
            .from('puzzles')
            .select('id, category, move_string, interaction_mode, highlight_metadata, correct_col, user_player, shape_key, highlight_cells')
            .eq('category', category)
            .eq('is_active', true)
            .not('position', 'is', null)
            .order('position', { ascending: true })
            .range(0, remaining - 1);
          puzzles = puzzles.concat(wrap || []);
        }
      }
    }

    // Session handling for authenticated users
    if (req.user) {
      const { data: existing } = await supabase
        .from('challenge_sessions')
        .select('id, puzzle_ids, completed_count')
        .eq('user_id', req.user.id)
        .eq('category', category)
        .is('completed_at', null)
        .maybeSingle();

      if (existing) {
        // Resume — re-fetch puzzles in original draw order
        const { data: rows } = await supabase
          .from('puzzles')
          .select('id, category, move_string, interaction_mode, highlight_metadata, correct_col, user_player, shape_key, highlight_cells')
          .in('id', existing.puzzle_ids)
          .eq('is_active', true);
        const map = Object.fromEntries((rows || []).map(p => [p.id, p]));
        const ordered = existing.puzzle_ids.map(id => map[id]).filter(Boolean);
        return res.json({ puzzles: ordered, session_id: existing.id, resume_idx: existing.completed_count });
      }

      // New session
      const { data: newSess, error: sessErr } = await supabase
        .from('challenge_sessions')
        .insert({ user_id: req.user.id, category, puzzle_ids: puzzles.map(p => p.id) })
        .select('id')
        .single();

      if (sessErr) {
        console.error('[challenge-sessions] insert error', sessErr.message);
        return res.json({ puzzles }); // degrade gracefully — still playable, no resume
      }
      return res.json({ puzzles, session_id: newSess.id, resume_idx: 0 });
    }

    // Anonymous — unchanged
    res.json({ puzzles });
  } catch (err) {
    logError('[puzzles/draw]', err);
    res.status(500).json({ error: 'internal error' });
  }
});

// PATCH /api/challenge-sessions/:id/advance — increment completed_count; mark done when all finished
app.patch('/api/challenge-sessions/:id/advance', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (!supabase) return res.status(503).json({ error: 'database unavailable' });
  const { id } = req.params;
  try {
    const { data: sess } = await supabase
      .from('challenge_sessions')
      .select('id, user_id, puzzle_ids, completed_count, completed_at')
      .eq('id', id)
      .maybeSingle();
    if (!sess) return res.status(404).json({ error: 'session not found' });
    if (sess.user_id !== req.user.id) return res.status(403).json({ error: 'forbidden' });
    if (sess.completed_at) return res.status(204).send(); // idempotent — already complete
    const newCount = sess.completed_count + 1;
    const isComplete = newCount >= sess.puzzle_ids.length;
    await supabase.from('challenge_sessions').update({
      completed_count: newCount,
      ...(isComplete ? { completed_at: new Date().toISOString() } : {}),
    }).eq('id', id);
    res.status(204).send();
  } catch (err) {
    logError('[challenge-sessions/advance]', err);
    res.status(500).json({ error: 'internal error' });
  }
});

// ── i18n pool helper ──────────────────────────────────────────────────────────

/**
 * Navigate a nested translations object by dot-separated prefix and return
 * a randomly chosen full key string (e.g. 'coach.immediate_threat.optimal.0').
 * Returns null if the prefix resolves to a non-object or empty object.
 */
/**
 * Convert a 0-indexed movestring to cols array (7 strings in g/d encoding).
 * g = first-player disc (even indices), d = second-player disc (odd indices).
 * Each string represents one column's discs from bottom to top.
 * O(moves.length) — no solver calls.
 * @param {string} moves — 0-indexed movestring (digits 0–6)
 * @returns {string[7]} cols array, bottom-to-top per column
 */
function movesToCols(moves) {
  const cols = ['', '', '', '', '', '', ''];
  for (let i = 0; i < moves.length; i++) {
    cols[parseInt(moves[i], 10)] += (i % 2 === 0) ? 'g' : 'd';
  }
  return cols;
}

function pickFromPool(translations, prefix) {
  const parts = prefix.split('.');
  let node = translations;
  for (const part of parts) {
    if (!node || typeof node !== 'object') return null;
    node = node[part];
  }
  if (!node || typeof node !== 'object') return null;
  const keys = Object.keys(node);
  if (keys.length === 0) return null;
  const idx = Math.floor(Math.random() * keys.length);
  return `${prefix}.${keys[idx]}`;
}

// POST /api/evaluate-move — score a played move and return coach phrase keys
app.post('/api/evaluate-move', async (req, res) => {
  const { movestring, col, category } = req.body;

  // Validate movestring
  if (typeof movestring !== 'string' || !MOVES_RE.test(movestring)) {
    return res.status(400).json({ error: 'invalid movestring' });
  }

  // Validate col
  const colInt = typeof col === 'number' ? col : parseInt(col, 10);
  if (!isValidCol0(colInt)) {
    return res.status(400).json({ error: 'invalid col' });
  }

  try {
    // Get solver scores
    let scores;
    if (movestring === '' || movestring.length === 0) {
      scores = EMPTY_BOARD_SCORES;
    } else {
      scores = await solver.query(movestring);
    }

    // Score the move
    const { badge, quality, bestCol } = scoreMove(scores, colInt);

    // Classify for pattern tag
    let patternTag;
    if (req.body.aiMove === true) {
      patternTag = await classifyAiMove(movestring, colInt, solver);
    } else {
      const classifyResult = classify(movestring, colInt, scores);
      patternTag = classifyResult?.tag ?? null;
    }

    // Determine phrase pool key (request category takes priority)
    const phrasePoolKey = category || patternTag;

    // Pick i18n keys from pools
    const coachPhraseKey = phrasePoolKey
      ? pickFromPool(i18nTranslations, `coach.${phrasePoolKey}.${quality}`)
      : null;

    const summaryLineKey = phrasePoolKey
      ? pickFromPool(i18nTranslations, `eval.${phrasePoolKey}.${quality}.summary`)
      : null;

    // Determine coach mood
    const coachMoodMap = { optimal: 'happy', suboptimal: 'think', blunder: 'oops' };
    const coachMood = coachMoodMap[quality] ?? 'think';

    // Spec 044 US3 / FR-015a: for the three multi-solution categories, add an additive
    // `accepted` field computed via evaluatePredicate (which already treats a non-canonical
    // but independently-satisfying column as 'tied' = accepted). This is recomputed at solve
    // time — no persistence, no schema change — and gated strictly to these three categories so
    // no other category's response shape changes. Does NOT touch quality/badge/coachPhraseKey/
    // coachMood/summaryLineKey/patternTag, which have other callers (ChallengeScreen.jsx and
    // others) — see server-conventions.md.
    let accepted = null;
    if (MULTI_SOLUTION_CATEGORIES.has(category)) {
      const predicateResult = evaluatePredicate({ category, moveString: movestring }, colInt, scores);
      accepted = predicateResult.result === 'correct' || predicateResult.result === 'tied';
    }

    res.json({ badge, quality, coachPhraseKey, coachMood, summaryLineKey, patternTag, accepted });
  } catch (err) {
    logError('[evaluate-move]', err);
    res.status(500).json({ error: 'internal error' });
  }
});

// POST /api/evaluate-move/inline — evaluate a move with inline puzzle data
// Returns richer results (correctCol, threatCells) than /api/evaluate-move.
app.post('/api/evaluate-move/inline', async (req, res) => {
  const { movestring, col, puzzle } = req.body;

  if (typeof movestring !== 'string' || !MOVES_RE.test(movestring)) {
    return res.status(400).json({ error: 'invalid movestring' });
  }
  const colInt = typeof col === 'number' ? col : parseInt(col, 10);
  if (!isValidCol0(colInt)) {
    return res.status(400).json({ error: 'invalid col' });
  }
  if (!puzzle || typeof puzzle !== 'object') {
    return res.status(400).json({ error: 'puzzle object is required' });
  }
  const category = puzzle.category || puzzle.goalPredicateType;
  if (!category || !VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: `invalid puzzle category: ${category}` });
  }

  try {
    // Get solver scores
    let scores;
    if (movestring === '' || movestring.length === 0) {
      scores = EMPTY_BOARD_SCORES;
    } else {
      scores = await solver.query(movestring);
    }

    // Score the move
    const { badge, quality, bestCol } = scoreMove(scores, colInt);

    // Classify for pattern tag
    const classifyResult = classify(movestring, colInt, scores);
    const patternTag = classifyResult?.tag ?? null;

    // Run predicate evaluation for richer results
    const predicatePuzzle = {
      moveString: puzzle.moveString || movestring,
      category,
      goalPredicateType: puzzle.goalPredicateType || category,
      goalPredicateParams: puzzle.goalPredicateParams ?? null,
      highlightMetadata: puzzle.highlightMetadata ?? null,
      correctCol: puzzle.correctCol,
    };
    const predicateResult = evaluatePredicate(predicatePuzzle, colInt, scores);

    // Determine phrase pool key
    const phrasePoolKey = category || patternTag;

    const coachPhraseKey = phrasePoolKey
      ? pickFromPool(i18nTranslations, `coach.${phrasePoolKey}.${quality}`)
      : null;

    const summaryLineKey = phrasePoolKey
      ? pickFromPool(i18nTranslations, `eval.${phrasePoolKey}.${quality}.summary`)
      : null;

    const coachMoodMap = { optimal: 'happy', suboptimal: 'think', blunder: 'oops' };
    const coachMood = coachMoodMap[quality] ?? 'think';

    res.json({
      badge, quality, coachPhraseKey, coachMood, summaryLineKey, patternTag,
      correctCol: predicateResult.correctCol ?? null,
      threatCells: predicateResult.threatCells ?? null,
      forbiddenCols: predicateResult.forbiddenCols ?? null,
    });
  } catch (err) {
    logError('[evaluate-move/inline]', err);
    res.status(500).json({ error: 'internal error' });
  }
});

// ── Sparring game endpoints (Epic 3a) ───────────────────────────────────────────

// POST /api/games — save a completed sparring game record
app.post('/api/games', async (req, res) => {
  const { device_uuid, moves, difficulty, side, result, accuracy } = req.body;

  // device_uuid may be null for authenticated users; the other fields are required
  if (!moves || !difficulty || !side || !result) {
    return res.status(400).json({ error: 'moves, difficulty, side, and result are required' });
  }

  if (typeof moves !== 'string' || !/^[0-6]{0,42}$/.test(moves)) {
    return res.status(400).json({ error: 'moves must be 0–42 characters of digits 0–6' });
  }

  const validDifficulties = ['easy', 'medium', 'hard', 'perfect'];
  if (!validDifficulties.includes(difficulty)) {
    return res.status(400).json({ error: 'difficulty must be easy, medium, hard, or perfect' });
  }

  if (side !== 'first' && side !== 'second') {
    return res.status(400).json({ error: 'side must be first or second' });
  }

  if (!['win', 'loss', 'draw'].includes(result)) {
    return res.status(400).json({ error: 'result must be win, loss, or draw' });
  }

  if (accuracy !== undefined) {
    if (typeof accuracy !== 'number' || accuracy < 0 || accuracy > 100) {
      return res.status(400).json({ error: 'accuracy must be a number between 0 and 100' });
    }
  }

  if (!supabase) return res.status(503).json({ error: 'Database not configured' });

  try {
    const insertPayload = {
      user_id: req.user?.id ?? null,
      device_uuid: device_uuid || req.user?.id || 'anonymous',
      moves,
      difficulty,
      side,
      result,
    };
    if (accuracy !== undefined) {
      insertPayload.accuracy = accuracy;
    }

    const { data, error } = await supabase
      .from('games')
      .insert(insertPayload)
      .select('id')
      .single();

    if (error) { logError('[games/create]', error); return res.status(500).json({ error: 'internal error' }); }
    res.status(201).json({ id: data.id });
  } catch (err) {
    logError('[games/create]', err);
    res.status(500).json({ error: 'internal error' });
  }
});

// POST /api/games/from-position — spawn a new sparring game from a truncated position
// Returns { moves, side, difficulty } — does NOT insert a row; GameScreen.saveGame does that when the game ends.
app.post('/api/games/from-position', async (req, res) => {
  const { gameId, N, difficulty } = req.body;

  // Validate required fields
  if (!gameId || typeof gameId !== 'string') {
    return res.status(400).json({ error: 'gameId must be a non-empty string' });
  }
  if (N === undefined || N === null || !Number.isInteger(N) || N < 0 || N > 42) {
    return res.status(400).json({ error: 'N must be an integer 0–42' });
  }
  const validDifficulties = ['easy', 'medium', 'hard', 'perfect'];
  if (!difficulty || !validDifficulties.includes(difficulty)) {
    return res.status(400).json({ error: 'difficulty must be easy, medium, hard, or perfect' });
  }

  if (!supabase) return res.status(503).json({ error: 'Database not configured' });

  try {
    let moves, side;
    const { data: aiGame } = await supabase
      .from('games')
      .select('moves, side')
      .eq('id', gameId)
      .single();

    if (aiGame) {
      ({ moves, side } = aiGame);
    } else {
      const { data: pgGame } = await supabase
        .from('papergames_games')
        .select('moves, side')
        .eq('id', gameId)
        .single();
      if (!pgGame) return res.status(404).json({ error: 'game not found' });
      ({ moves, side } = pgGame);
    }

    const truncated = moves.slice(0, N);
    res.json({ moves: truncated, side, difficulty });
  } catch (err) {
    logError('[games/from-position]', err);
    res.status(500).json({ error: 'internal error' });
  }
});

// GET /api/games — list past games for the authenticated user (AI sparring + papergames imports).
// Returns { games: GameRecord[], total: number } sorted by date descending, paginated.
// Auth required — 401 for anonymous users.
app.get('/api/games', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  let limit = 20;
  if (req.query.limit !== undefined) {
    const parsed = parseInt(req.query.limit, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 50) {
      return res.status(400).json({ error: 'limit must be 1–50' });
    }
    limit = parsed;
  }

  let offset = 0;
  if (req.query.offset !== undefined) {
    const parsed = parseInt(req.query.offset, 10);
    if (isNaN(parsed) || parsed < 0) {
      return res.status(400).json({ error: 'offset must be a non-negative integer' });
    }
    offset = parsed;
  }

  // outcome filter: API accepts 'won'/'lost'/'draw', DB stores 'win'/'loss'/'draw'
  const outcomeApiToDb = { won: 'win', lost: 'loss', draw: 'draw' };
  let outcomeFilter = null;
  if (req.query.outcome !== undefined) {
    outcomeFilter = outcomeApiToDb[req.query.outcome];
    if (!outcomeFilter) return res.status(400).json({ error: 'invalid outcome' });
  }

  let hasBlunder = false;
  if (req.query.has_blunder === 'true') hasBlunder = true;
  else if (req.query.has_blunder !== undefined) return res.status(400).json({ error: 'invalid has_blunder' });

  if (!supabase) return res.status(503).json({ error: 'Database not configured' });

  try {
    const userId = req.user.id;
    const outcomeMap = { win: 'won', loss: 'lost', draw: 'draw' };

    // Fetch all matching rows from both tables in parallel; sort/paginate in JS.
    // Both tables are bounded per user so this avoids complex UNION SQL.
    let aiQuery = supabase
      .from('games')
      .select('id, result, created_at, difficulty, accuracy, moves, side')
      .eq('user_id', userId);
    let pgQuery = supabase
      .from('papergames_games')
      .select('id, result, played_at, moves, side, opponent_name, opponent_avatar, accuracy')
      .eq('user_id', userId);

    if (outcomeFilter) {
      aiQuery = aiQuery.eq('result', outcomeFilter);
      pgQuery = pgQuery.eq('result', outcomeFilter);
    }

    const [{ data: aiGames, error: aiError }, { data: pgGames, error: pgError }] = await Promise.all([
      aiQuery,
      pgQuery,
    ]);

    if (aiError) { logError('[games]', aiError); return res.status(500).json({ error: 'internal error' }); }
    if (pgError) { logError('[games]', pgError); return res.status(500).json({ error: 'internal error' }); }

    // Fetch blunder counts for both game sets in parallel, via DB-side grouped count() —
    // scale-correct past 1000 blunder rows and never uses `.in()` (see
    // server/blunderCountsForGames.js for why `.in(gameIds)` is NOT safe here: aiIds/pgIds can
    // be the user's FULL game set, not just the current page, since sorting happens before
    // pagination below). computeBlunderCountsForGames applies no `quality` filter (spec 042
    // T034/FR-005/FR-006) — the returned `blunder_count` (wire name unchanged, FR-007) already
    // includes both blunder- and suboptimal-severity rows; a 0-blunder/≥1-suboptimal game is
    // never miscounted as zero here.
    const aiIds = (aiGames || []).map(g => g.id);
    const pgIds = (pgGames || []).map(g => g.id);

    let aiBlunderMap, pgBlunderMap;
    try {
      [aiBlunderMap, pgBlunderMap] = await Promise.all([
        computeBlunderCountsForGames(supabase, userId, aiIds, 'game_id'),
        computeBlunderCountsForGames(supabase, userId, pgIds, 'papergames_game_id'),
      ]);
    } catch (err) {
      logError('[games]', err);
      return res.status(500).json({ error: 'internal error' });
    }

    // Normalise both sets to a unified shape
    const unified = [];

    for (const g of (aiGames || [])) {
      const blunderCount = aiBlunderMap[g.id] || 0;
      if (hasBlunder && blunderCount === 0) continue;
      unified.push({
        id: g.id,
        outcome: outcomeMap[g.result] || g.result,
        created_at: g.created_at,
        source: 'ai',
        difficulty: g.difficulty,
        accuracy: g.accuracy ?? null,
        blunder_count: blunderCount,
        side: g.side ?? null,
        cols: movesToCols(g.moves),
      });
    }

    for (const g of (pgGames || [])) {
      const blunderCount = pgBlunderMap[g.id] || 0;
      if (hasBlunder && blunderCount === 0) continue;
      unified.push({
        id: g.id,
        outcome: outcomeMap[g.result] || g.result,
        created_at: g.played_at,
        source: 'papergames',
        opponent_name: g.opponent_name,
        opponent_avatar: g.opponent_avatar ?? null,
        accuracy: g.accuracy ?? null,
        blunder_count: blunderCount,
        side: g.side ?? null,
        cols: movesToCols(g.moves),
      });
    }

    // Sort
    const VALID_SORTS = new Set(['recent', 'played_well', 'worst_blunders']);
    let sortBy = 'recent';
    if (req.query.sort !== undefined) {
      if (!VALID_SORTS.has(req.query.sort)) {
        return res.status(400).json({ error: 'invalid sort' });
      }
      sortBy = req.query.sort;
    }

    if (sortBy === 'played_well') {
      unified.sort((a, b) => {
        const aAcc = a.accuracy ?? -Infinity;
        const bAcc = b.accuracy ?? -Infinity;
        if (bAcc !== aAcc) return bAcc - aAcc;
        return new Date(b.created_at) - new Date(a.created_at);
      });
    } else if (sortBy === 'worst_blunders') {
      unified.sort((a, b) => {
        if (b.blunder_count !== a.blunder_count) return b.blunder_count - a.blunder_count;
        return new Date(b.created_at) - new Date(a.created_at);
      });
    } else {
      unified.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    const total = unified.length;
    const page = unified.slice(offset, offset + limit);

    res.json({ games: page, total });
  } catch (err) {
    logError('[games]', err);
    res.status(500).json({ error: 'internal error' });
  }
});

// POST /api/games/analyze — analyze all user plies in a completed game
// Returns move-by-move quality breakdown, accuracy, and a summary phrase key.
// No auth required — anonymous users can analyze games.
app.post('/api/games/analyze', async (req, res) => {
  const { gameId } = req.body;

  if (!gameId || typeof gameId !== 'string') {
    return res.status(400).json({ error: 'gameId is required' });
  }

  if (!supabase) return res.status(503).json({ error: 'Database not configured' });

  // Fetch game row — check AI sparring games first, then papergames imports
  let moves, side, difficulty, created_at, isPapergames = false;
  {
    const { data: aiGame } = await supabase
      .from('games')
      .select('id, user_id, device_uuid, moves, side, difficulty, created_at')
      .eq('id', gameId)
      .single();

    if (aiGame) {
      // Ownership check: a game with a user_id is private to that user. Without
      // this, any signed-in user could pass another user's game id and both
      // (a) read a full move-by-move analysis of a game they don't own, and
      // (b) trigger the blunder INSERT below tied to their own user_id but
      // referencing the foreign game_id — polluting that game's sibling-mistake
      // data for its actual owner.
      //
      // Anonymous, device-scoped sparring games (user_id null) stay open per this
      // endpoint's documented no-auth contract: the request body carries only
      // gameId (no device_uuid to authorize against), and there is no account to
      // pollute — a logged-out caller writes no blunders (the INSERT below is
      // gated on req.user). Do NOT compare device_uuid to req.user.id — they are
      // different id namespaces and never match, which 404'd every logged-out
      // review of a just-played anonymous game.
      if (aiGame.user_id && !(req.user && aiGame.user_id === req.user.id)) {
        return res.status(404).json({ error: 'game not found' });
      }
      ({ moves, side, difficulty, created_at } = aiGame);
    } else {
      const { data: pgGame } = await supabase
        .from('papergames_games')
        .select('id, user_id, moves, side, played_at')
        .eq('id', gameId)
        .single();
      if (!pgGame) return res.status(404).json({ error: 'game not found' });
      if (!(req.user && pgGame.user_id === req.user.id)) {
        return res.status(404).json({ error: 'game not found' });
      }
      moves = pgGame.moves;
      side = pgGame.side;
      difficulty = null;
      created_at = pgGame.played_at;
      isPapergames = true;
    }
  }

  // Cache check: if user is logged in and blunders already exist for this game,
  // reconstruct the analysis from stored data instead of re-running the solver.
  if (req.user) {
    const gameFilter = isPapergames
      ? { papergames_game_id: gameId }
      : { game_id: gameId };

    const { data: existingBlunders } = await supabase
      .from('blunders')
      .select('move_index, move_played, quality, pattern_category, reason, direction, blunder_severity')
      .eq('user_id', req.user.id)
      .match(gameFilter)
      .order('move_index', { ascending: true });

    if (existingBlunders && existingBlunders.length > 0) {
      const blunderMap = new Map(existingBlunders.map(b => [b.move_index, b]));
      const cachedMoves = [];
      let cScored = 0, cOptimal = 0, cSuboptimal = 0, cBlunder = 0;
      let cOrdinal = 0;

      for (let i = 0; i < moves.length; i++) {
        const isUserPly = side === 'first' ? (i % 2 === 0) : (i % 2 === 1);
        if (!isUserPly) continue;
        cOrdinal++;
        cScored++;

        const blunder = blunderMap.get(i);
        if (blunder) {
          cachedMoves.push({
            moveIndex: cOrdinal,
            col: blunder.move_played,
            quality: blunder.quality,
            score: null,
            bestScore: null,
            bestCol: null,
            patternTag: blunder.pattern_category,
            reason: blunder.reason,
            direction: blunder.direction,
            blunderSeverity: blunder.blunder_severity,
          });
          if (blunder.quality === 'suboptimal') cSuboptimal++;
          else cBlunder++;
        } else {
          cachedMoves.push({
            moveIndex: cOrdinal,
            col: parseInt(moves[i], 10),
            quality: 'optimal',
            score: null,
            bestScore: null,
            bestCol: null,
            patternTag: null,
            reason: null,
            direction: null,
            blunderSeverity: null,
          });
          cOptimal++;
        }
      }

      const cAccuracy = cScored > 0 ? Math.round(cOptimal / cScored * 100) : 0;
      // FR-006: "no mistakes"/"clean game" phrasing must not fire when suboptimal
      // mistakes exist even if there are zero blunders — a game with 0 blunders and
      // >=1 suboptimal move is still a game with mistakes.
      const phrasePool = (cBlunder === 0 && cSuboptimal === 0)
        ? 'coach.sparring.review.clean'
        : 'coach.sparring.review.mistakes';
      const cSummaryKey = pickFromPool(i18nTranslations, phrasePool) ?? `${phrasePool}.0`;

      return res.json({
        moves: cachedMoves,
        accuracy: cAccuracy,
        optimalCount: cOptimal,
        suboptimalCount: cSuboptimal,
        blunderCount: cBlunder,
        scored: cScored,
        summaryPhraseKey: cSummaryKey,
        fullMovestring: moves,
        difficulty,
        side,
        gameDate: created_at,
        source: isPapergames ? 'papergames' : 'ai',
      });
    }
  }

  // Counters
  let scored = 0;
  let optimalCount = 0;
  let suboptimalCount = 0;
  let blunderCount = 0;
  const analyzedMoves = [];
  let userMoveOrdinal = 0;

  try {
    for (let i = 0; i < moves.length; i++) {
      // Determine if this ply belongs to the user
      const isUserPly = side === 'first' ? (i % 2 === 0) : (i % 2 === 1);
      if (!isUserPly) continue;

      userMoveOrdinal++;
      const col = parseInt(moves[i], 10);
      const movesBeforeThisPly = moves.slice(0, i);

      // Query solver (serialized — one at a time)
      let scores;
      if (movesBeforeThisPly === '') {
        scores = EMPTY_BOARD_SCORES;
      } else {
        scores = await solver.query(movesBeforeThisPly);
      }

      const legalCount = scores.filter(s => s > -1000).length;

      const { quality, bestCol } = scoreMove(scores, col);
      const score = scores[col];
      const bestScore = scores[bestCol];

      // Storage rule (mistakeStorageRule.js): slower wins and dead-position
      // faster losses are not stored; `quality` from scoreMove is kept as-is
      // for the per-move badges/counters in the response.
      const storedMistake = classifyStoredMistake(bestScore, score, movesBeforeThisPly);
      const isMistake = storedMistake !== null;

      // Classify the position — tagBlunder may issue 60+ solver queries per ply;
      // acceptable here because this endpoint is called post-game, not during play.
      let patternTag = null;
      let reason = null;
      let direction = null;
      if (isMistake) {
        try {
          const tagResult = await tagBlunder(movesBeforeThisPly, col, bestCol, solver);
          patternTag = tagResult.tag;
          reason = tagResult.reason;
          direction = tagResult.direction;
        } catch (_e) {
          if (_e instanceof NotABlunderError) {
            // Precondition violation: scoreMove flagged a mistake on a terminal
            // position. This must never happen — surface loudly, and do NOT
            // fabricate a pattern tag (leave null) rather than mislabel a non-blunder.
            console.error(`[analyze] NotABlunderError at ply "${movesBeforeThisPly}": ${_e.message}`);
          } else {
            patternTag = 'suboptimal_move';
            reason = 'solver error: tagBlunder threw';
            direction = 'missed_own';
          }
        }
      }

      // Scan 3 plies of the post-mistake tree to compute what fraction of
      // continuations end in an opponent win. blunder_severity is the graduated
      // measure that distinguishes minor mistakes from catastrophic ones.
      let blunderSeverity = null;
      if (isMistake) {
        const postMistakeMs = movesBeforeThisPly + String(col);
        try {
          const sv = await computeBlunderSeverity(solver, postMistakeMs, 3);
          blunderSeverity = sv.severity;
        } catch (_e) {
          // non-fatal: leave null
        }
      }

      analyzedMoves.push({
        moveIndex: userMoveOrdinal,
        col,
        quality,
        score,
        bestScore,
        bestCol,
        patternTag,
        reason,
        direction,
        blunderSeverity,
      });

      // Server-side mistake INSERT — anonymous users skip (user_id would be NULL).
      if (req.user && isMistake) {
        await insertGameBlunder(supabase, {
          user_id: req.user.id,
          board_state: movesBeforeThisPly,
          move_played: col,
          correct_move: bestCol,
          pattern_category: patternTag,
          quality: storedMistake.quality,
          reason,
          direction,
          severity: computeSeverity(bestScore, score),
          blunder_severity: blunderSeverity,
          game_id: isPapergames ? null : gameId,
          papergames_game_id: isPapergames ? gameId : null,
        });
      }

      // Only count non-forced moves toward accuracy
      if (legalCount > 1) {
        scored++;
        if (quality === 'optimal') optimalCount++;
        else if (quality === 'suboptimal') suboptimalCount++;
        else blunderCount++;
      }
    }
  } catch (err) {
    logError('[games/analyze]', err);
    return res.status(500).json({ error: 'internal error' });
  }

  const accuracy = scored > 0 ? Math.round(optimalCount / scored * 100) : 0;

  // Pick summary phrase key
  // FR-006: same rule as the cached branch above — 0 blunders + >=1 suboptimal is
  // still a game with mistakes, never "clean"/"no mistakes to review."
  const phrasePool = (blunderCount === 0 && suboptimalCount === 0)
    ? 'coach.sparring.review.clean'
    : 'coach.sparring.review.mistakes';
  const summaryPhraseKey = pickFromPool(i18nTranslations, phrasePool) ?? `${phrasePool}.0`;

  res.json({
    moves: analyzedMoves,
    accuracy,
    optimalCount,
    suboptimalCount,
    blunderCount,
    scored,
    summaryPhraseKey,
    fullMovestring: moves,
    difficulty,
    side,
    gameDate: created_at,
    source: isPapergames ? 'papergames' : 'ai',
  });
});

// GET /api/puzzles/:id — return full puzzle data for solving
app.get('/api/puzzles/:id', async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: 'invalid puzzle id' });

  if (!supabase) return res.status(503).json({ error: 'database unavailable' });

  const { data: puzzle, error } = await supabase
    .from('puzzles')
    .select('id, category, move_string, goal_prompt, goal_predicate_type, goal_predicate_params, cooperative_ai_moves, difficulty, interaction_mode, highlight_metadata, correct_col, user_player, simulation_trace')
    .eq('id', id)
    .eq('is_active', true)
    .single();

  if (error || !puzzle) return res.status(404).json({ error: 'puzzle not found' });
  if (!userCanAccessCategory(req.user, puzzle.category)) {
    return res.status(403).json({ error: 'This category requires a paid subscription' });
  }

  res.json({
    id: puzzle.id,
    category: puzzle.category,
    moveString: puzzle.move_string,
    goalPrompt: puzzle.goal_prompt,
    goalPredicateType: puzzle.goal_predicate_type,
    cooperativeAiMoves: puzzle.cooperative_ai_moves ?? [],
    difficulty: puzzle.difficulty,
    interactionMode: puzzle.interaction_mode ?? 'single_move',
    highlightMetadata: puzzle.highlight_metadata ?? null,
    correctCol: puzzle.correct_col ?? null,
    userPlayer: puzzle.user_player ?? 1,
    simulationTrace: puzzle.simulation_trace ?? [],
  });
});

// POST /api/puzzles/:id/check — evaluate user's move, record attempt, track events
app.post('/api/puzzles/:id/check', async (req, res) => {
  const puzzleId = req.params.id;
  if (!puzzleId) return res.status(400).json({ error: 'invalid puzzle id' });

  const { candidateCol, moveHistory = [] } = req.body;
  if (!isValidCol0(candidateCol)) {
    return res.status(400).json({ error: 'candidateCol must be integer 0-6' });
  }

  // Load puzzle
  let puzzle = null;
  if (supabase) {
    const { data } = await supabase
      .from('puzzles')
      .select('id, category, move_string, goal_prompt, goal_predicate_type, goal_predicate_params, cooperative_ai_moves, interaction_mode, highlight_metadata, correct_col')
      .eq('id', puzzleId)
      .eq('is_active', true)
      .single();
    puzzle = data;
  }

  if (!puzzle) return res.status(404).json({ error: 'puzzle not found' });
  if (!userCanAccessCategory(req.user, puzzle.category)) {
    return res.status(403).json({ error: 'This category requires a paid subscription' });
  }
  if (puzzle.interaction_mode === 'sequence') {
    return res.status(400).json({ error: 'Use /sequence/move for sequence-mode puzzles' });
  }

  // Get solver scores
  let scores;
  try {
    scores = puzzle.move_string.length > 0 ? await solver.query(puzzle.move_string) : EMPTY_BOARD_SCORES;
  } catch (err) {
    logError('[puzzles/check/solver]', err);
    return res.status(500).json({ error: 'Solver unavailable' });
  }

  const puzzleForPredicate = {
    id: puzzle.id,
    category: puzzle.category,
    moveString: puzzle.move_string,
    goalPredicateType: puzzle.goal_predicate_type,
    goalPredicateParams: puzzle.goal_predicate_params,
    highlightMetadata: puzzle.highlight_metadata ?? null,
    correctCol: puzzle.correct_col ?? null,
  };

  const evaluation = evaluatePredicate(puzzleForPredicate, candidateCol, scores);
  const isSuccess = evaluation.result === 'correct' || evaluation.result === 'tied';

  // Record puzzle attempt (fire-and-forget)
  if (supabase) {
    const deviceUuid = req.user?.device_uuid || req.body.deviceUuid || 'anonymous';
    const attemptData = {
      puzzle_id: puzzleId,
      device_uuid: deviceUuid,
      user_id: req.user?.id ?? null,
      moves_tried: moveHistory,
      outcome: evaluation.result,
      first_attempt_correct: moveHistory.length === 0 && isSuccess,
      time_ms: req.body.timeMs ?? null,
    };

    supabase.from('puzzle_attempts').insert(attemptData)
      .then(() => {})
      .catch(err => console.error('[puzzle attempt]', err.message));

    // Insert blunder for signed-in users on first-attempt failure only
    const attemptNumber = typeof req.body.attemptNumber === 'number' ? req.body.attemptNumber : 1;
    if (req.user && !isSuccess && attemptNumber === 1) {
      const correctCol = evaluation.correctCol ?? candidateCol;
      supabase.from('blunders').insert({
        user_id: req.user.id,
        puzzle_id: puzzleId,
        board_state: puzzle.move_string,
        move_played: candidateCol,
        correct_move: correctCol,
        pattern_category: puzzle.category,
        severity: computeSeverity(scores[correctCol], scores[candidateCol]),
      }).then(() => {}).catch(err => console.error('[blunder]', err.message));
    }
  }

  res.json({
    result: evaluation.result,
    correctCol: evaluation.correctCol ?? null,
    tiedWith: evaluation.tiedWith ?? null,
    threatCells: evaluation.threatCells ?? null,
    forbiddenCols: evaluation.forbiddenCols ?? null,
  });
});

// POST /api/puzzles/:id/sequence/move — stateless per-move validation for sequence-mode puzzles
const SEQUENCE_POSITION_RE = /^[0-6]{0,41}$/;
const sequenceStrategy = new ForcedWinStrategy();

app.post('/api/puzzles/:id/sequence/move', async (req, res) => {
  const puzzleId = req.params.id;

  // Load puzzle
  if (!supabase) return res.status(503).json({ error: 'database unavailable' });

  const { data: puzzle, error } = await supabase
    .from('puzzles')
    .select('id, category, interaction_mode')
    .eq('id', puzzleId)
    .eq('is_active', true)
    .single();

  if (error || !puzzle) return res.status(404).json({ error: 'puzzle not found' });

  const { position, col } = req.body;

  if (typeof position !== 'string' || !SEQUENCE_POSITION_RE.test(position)) {
    return res.status(400).json({ error: 'position must be a string of 0–41 digits 1–7' });
  }
  if (!Number.isInteger(col) || col < 0 || col > 6) {
    return res.status(400).json({ error: 'col must be an integer 0–6' });
  }
  if (puzzle.interaction_mode !== 'sequence') {
    return res.status(400).json({ error: 'Use /sequence/move for sequence-mode puzzles' });
  }

  // Check column is not full (parse position to get heights)
  const heights = Array(7).fill(0);
  for (const ch of position) heights[parseInt(ch, 10)]++;
  if (heights[col] >= 6) {
    return res.status(400).json({ error: 'Column is full' });
  }

  // Tier gate for forced_win
  if (puzzle.category === 'forced_win' && !userCanAccessCategory(req.user, puzzle.category)) {
    return res.status(403).json({ error: 'This category requires a paid subscription' });
  }

  // If the chosen col is itself an immediate win, succeed without running validateMove.
  // This handles the final step of a forcing sequence where a built-up threat is cashed in.
  const { board: boardBefore, colHeights: heightsBefore } = parseBoardState(position);
  const learner = position.length % 2 === 0 ? 1 : 2;
  const winRow = heightsBefore[col];
  const boardForWin = boardBefore.map(r => [...r]);
  boardForWin[winRow][col] = learner;
  if (checkWin(boardForWin, winRow, col, learner)) {
    return res.json({ outcome: 'success' });
  }

  const result = sequenceStrategy.validateMove(position, col);
  if (!result.valid) {
    return res.json({ outcome: 'fail', reason: result.reason });
  }

  const threatsAfter = countThreatsAfterMove(position, col);
  if (threatsAfter >= 2) {
    const positionAfter = position + String(col);
    const { board: boardAfter, colHeights: heightsAfter } = parseBoardState(positionAfter);
    const threatCols = getImmediateThreats(boardAfter, heightsAfter, learner);
    const threatCells = threatCols.map(tc => ({ c: tc, r: heightsAfter[tc] }));
    return res.json({ outcome: 'success', threatCells });
  }

  const positionAfterLearnerMove = position + String(col);
  const aiCol = getAiResponseCol(positionAfterLearnerMove);
  return res.json({ outcome: 'continue', aiCol });
});

// ── Coach endpoints (T059-T061) ────────────────────────────────────────────────

function requirePaid(req, res, next) {
  if (!req.user || req.user.tier !== 'paid') {
    return res.status(403).json({ error: 'This feature requires a paid subscription' });
  }
  next();
}

// GET /api/coach/weakness-map
// spec 042 T034/FR-005/FR-007: neither the `coach_weakness_map` RPC call nor the
// computeWeaknessMapFallback path below filters on `quality='blunder'` — both severities
// contribute to the weakness map, and the RPC's underlying query is not modified here.
app.get('/api/coach/weakness-map', requirePaid, async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'database unavailable' });

  const { data, error } = await supabase.rpc('coach_weakness_map', { user_id_param: req.user.id });
  if (error) {
    // Dormant fallback (only reached on RPC error): computeWeaknessMapFallback uses DB-side
    // grouped count() instead of an unbounded per-row select — scale-correct past 1000 rows.
    // See server/weaknessMapFallback.js (spec 041 US3 / research.md Decision 4 — mechanical
    // fix only, no RPC-reliability investigation).
    try {
      const result = await computeWeaknessMapFallback(supabase, req.user.id);
      return res.json(result);
    } catch (fallbackErr) {
      logError('[coach/weakness-map]', fallbackErr);
      return res.status(500).json({ error: 'internal error' });
    }
  }

  res.json({ weaknessMap: data ?? [] });
});

// GET /api/coach/category-counts
// spec 041 (Past Games & Mistakes: Server Data Integrity), User Story 2 / FR-004-006 / FR-009.
// True per-category blunder counts via a DB-side grouped count() — independent of any single
// page of /api/coach/queue, and scale-correct beyond 1000 rows since it never materializes
// individual rows into Node (see contracts/coach-category-counts.md). Same `.eq('user_id', ...)`
// filter as /api/coach/queue; no `quality` filter added (FR-008) — blunder- and
// suboptimal-quality rows are both counted.
app.get('/api/coach/category-counts', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'database unavailable' });
  if (!req.user) return res.status(401).json({ error: 'unauthorized' });

  try {
    const { data, error } = await supabase
      .from('blunders')
      .select('pattern_category, count()')
      .eq('user_id', req.user.id);

    if (error) { logError('[coach/category-counts]', error); return res.status(500).json({ error: 'internal error' }); }

    const categories = (data || [])
      .map(row => ({ category: row.pattern_category, count: Number(row.count) }))
      .filter(row => row.count >= 1);

    categories.sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a.category);
      const bi = CATEGORY_ORDER.indexOf(b.category);
      if (ai === -1 && bi === -1) return a.category.localeCompare(b.category);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });

    res.json({ categories });
  } catch (err) {
    logError('[coach/category-counts]', err);
    res.status(500).json({ error: 'internal error' });
  }
});

// GET /api/coach/queue
app.get('/api/coach/queue', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'database unavailable' });
  if (!req.user) return res.status(401).json({ error: 'unauthorized' });

  const status = req.query.status || 'all';
  if (!['all', 'unreviewed', 'reviewed'].includes(status)) {
    return res.status(400).json({ error: 'invalid status' });
  }

  const category = req.query.category || null;
  if (category && !VALID_BLUNDER_TAGS.has(category)) {
    return res.status(400).json({ error: 'invalid category' });
  }

  const gameId = req.query.game_id || null;
  if (gameId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(gameId)) {
    return res.status(400).json({ error: 'invalid game_id' });
  }

  const papergamesGameId = req.query.papergames_game_id || null;
  if (papergamesGameId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(papergamesGameId)) {
    return res.status(400).json({ error: 'invalid papergames_game_id' });
  }

  const pagination = parseQueuePaginationParams(req.query);
  if (pagination.error) {
    return res.status(400).json({ error: pagination.error });
  }
  const { limit, offset } = pagination;

  // Shared filter chain — applied identically to the page query and the count query below
  // (count query omits .order()/.range() per contracts/coach-queue-pagination.md).
  // spec 042 T034/FR-005/FR-007: no `.eq('quality', 'blunder')` filter here — both
  // blunder- and suboptimal-severity rows are returned/counted (`total`, wire name
  // unchanged) to the coach queue.
  const applyFilters = (q) => {
    let filtered = q.eq('user_id', req.user.id);
    if (status === 'unreviewed') {
      filtered = filtered.is('resolved_at', null);
    } else if (status === 'reviewed') {
      filtered = filtered.not('resolved_at', 'is', null);
    }
    if (category) {
      filtered = filtered.eq('pattern_category', category);
    }
    if (gameId) {
      filtered = filtered.eq('game_id', gameId);
    }
    if (papergamesGameId) {
      filtered = filtered.eq('papergames_game_id', papergamesGameId);
    }
    return filtered;
  };

  const pageQuery = applyFilters(
    supabase
      .from('blunders')
      .select('id, board_state, move_played, correct_move, pattern_category, quality, created_at, resolved_at, severity, blunder_severity, game_id, papergames_game_id')
  )
    // Worst mistakes first; created_at ASC breaks ties (oldest unresolved blunder wins).
    // `id` is a final deterministic tiebreaker: without it, rows sharing the same
    // (severity, created_at) — e.g. a batch import inserting many blunders in one
    // statement, all stamped with the same created_at — can be ordered differently
    // across separate paginated queries, causing OFFSET/LIMIT to skip some rows and
    // duplicate others across pages (found via QA: 8/137 blunders unreachable).
    .order('severity', { ascending: false })
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .range(offset, offset + limit - 1);

  const countQuery = applyFilters(
    supabase.from('blunders').select('id', { count: 'exact', head: true })
  );

  const [{ data: blunders, error }, { count: total, error: countError }] = await Promise.all([
    pageQuery,
    countQuery,
  ]);
  if (error) { logError('[coach/queue]', error); return res.status(500).json({ error: 'internal error' }); }
  if (countError) { logError('[coach/queue]', countError); return res.status(500).json({ error: 'internal error' }); }

  // FR-008/FR-009 (spec 042 US2): this endpoint independently constructs its own
  // blunder shape (does not delegate to the GET /api/blunders/:id handler above),
  // so totalMoves/siblingMistakes must be applied here too, unconditionally —
  // otherwise a mistake reached in-app via this list loses the correct "Move N / M"
  // / "X of Y" figures that the cold-boot permalink path already has.
  const contexts = await Promise.all(
    (blunders || []).map(b => fetchBlunderDetailContext(supabase, b))
  );

  const enriched = (blunders || []).map((b, i) => ({
    id: b.id,
    board_state: b.board_state,
    move_played: b.move_played,
    correct_move: b.correct_move,
    pattern_category: b.pattern_category,
    quality: b.quality ?? 'blunder',
    created_at: b.created_at,
    resolved_at: b.resolved_at,
    severity: b.severity,
    blunder_severity: b.blunder_severity ?? null,
    threat_cells: computeThreatCells(b.board_state || '', b.move_played),
    patternCells: computePatternCells(b),
    game_id: b.game_id ?? null,
    papergames_game_id: b.papergames_game_id ?? null,
    moveIndex: (b.board_state || '').length,
    totalMoves: contexts[i].totalMoves,
    siblingMistakes: contexts[i].siblingMistakes,
  }));

  res.json({ blunders: enriched, total: total ?? 0 });
});

// POST /api/coach/queue/:blunderId/resolve
app.post('/api/coach/queue/:blunderId/resolve', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'unauthorized' });
  const blunderId = req.params.blunderId;
  if (!blunderId || typeof blunderId !== 'string') return res.status(400).json({ error: 'invalid blunder id' });
  if (!supabase) return res.status(503).json({ error: 'database unavailable' });

  const { error } = await supabase
    .from('blunders')
    .update({ resolved_at: new Date().toISOString() })
    .eq('id', blunderId)
    .eq('user_id', req.user.id); // ownership check

  if (error) { logError('[coach/queue/resolve]', error); return res.status(500).json({ error: 'internal error' }); }
  res.status(204).end();
});

// GET /api/blunders/:id — public blunder permalink (no auth required)
app.get('/api/blunders/:id', async (req, res) => {
  const { id } = req.params;

  // FR-018: validate UUID format
  if (!UUID_REGEX.test(id)) return res.status(400).json({ error: 'invalid id' });

  if (!supabase) return res.status(503).json({ error: 'Database not configured' });

  // FR-017: no user_id filter — public endpoint
  const { data, error } = await supabase
    .from('blunders')
    .select('id, board_state, move_played, correct_move, pattern_category, quality, created_at, resolved_at, severity, blunder_severity, game_id, papergames_game_id, user_id')
    .eq('id', id)
    .single();

  if (error || !data) {
    if (error && error.code === 'PGRST116') return res.status(404).json({ error: 'not found' });
    if (error) {
      logError('[blunders/:id]', error);
      return res.status(500).json({ error: 'internal error' });
    }
    return res.status(404).json({ error: 'not found' });
  }

  // FR-008/FR-009 (spec 042 US2): parent-game total move count + sibling mistakes,
  // needed so a cold-opened permalink shows "Move N / M" and "X of Y" correctly
  // instead of defaulting to a single-item array. Two bounded, indexed reads —
  // see contracts/api-blunders-id.md steps 2-3.
  const context = await fetchBlunderDetailContext(supabase, data);

  // FR-020/FR-029/FR-003: shared pure builder (server/blunderDetailResponse.js) —
  // computes moveIndex/threat_cells, ownership, and strips user_id. Both
  // 'blunder' and 'suboptimal' quality rows go through this identical path.
  res.json(buildBlunderDetailResponse(data, req.user?.id, context));
});

// ── Stripe endpoints (T051-T053; extracted to stripeProcessor.js/stripeRoutes.js — spec 045 US3) ──

let paymentProcessor = null;
if (process.env.STRIPE_SECRET_KEY) {
  const { default: Stripe } = await import('stripe');
  const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  paymentProcessor = createStripeProcessor({
    stripeClient,
    supabase,
    monthlyPriceId: process.env.STRIPE_MONTHLY_PRICE_ID,
    annualPriceId: process.env.STRIPE_ANNUAL_PRICE_ID,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  });
}
registerStripeRoutes(app, paymentProcessor);

// ── Debug endpoints (localhost-only) ──────────────────────────────────────────

app.post('/api/debug/classify-all', requireLocalhost, async (req, res) => {
  const { moves: ms = '' } = req.body;
  if (!MOVES_RE.test(ms)) {
    return res.status(400).json({ error: 'moves must be 0–42 characters of digits 0–6' });
  }
  try {
    const scores = ms.length > 0 ? await solver.query(ms) : EMPTY_BOARD_SCORES;
    const redResult = await classifyPattern(ms, 1, solver);
    const yellowResult = await classifyPattern(ms, 2, solver);
    const red = [...new Set(redResult.keys())];
    const yellow = [...new Set(yellowResult.keys())];
    const board = new Board(ms);

    const reachableRed = board.reachableThreats(1);
    const reachableYellow = board.reachableThreats(2);
    const formatReachable = (map) => {
      const entries = [];
      for (const [col, rows] of map) entries.push(`col${col}:rows[${rows.join(',')}]`);
      return entries.length ? entries.join('  ') : 'none';
    };

    const boardState = {
      moveCount: ms.length,
      currentPlayer: board.currentPlayer === 1 ? 'Red' : 'Yellow',
      colHeights: board.colHeights,
      immediateThreatsRed: board.immediateThreats(1),
      immediateThreatsYellow: board.immediateThreats(2),
      reachableThreatsRed: formatReachable(reachableRed),
      reachableThreatsYellow: formatReachable(reachableYellow),
      doubleThreatsRed: board.hasActiveDoubleThreat(1),
      doubleThreatsYellow: board.hasActiveDoubleThreat(2),
    };

    res.json({ red, yellow, boardState, scores });
  } catch (err) {
    logError('[debug/classify-all]', err);
    res.status(500).json({ error: 'internal error' });
  }
});

// ── Admin endpoints (localhost-only) ──────────────────────────────────────────

// FR-009 (spec 047 US3/AC1): MUST NOT use `req.ip` here. With `trust proxy: 1` set (needed for
// express-rate-limit to see real client IPs behind Railway's proxy), Express's `req.ip` resolves
// from the client-controlled `X-Forwarded-For` header for exactly one hop — so any direct,
// non-proxied caller can spoof it with `X-Forwarded-For: 127.0.0.1` and pass the check. Verified
// locally: a request from a real non-loopback interface with a forged header reached this gate's
// `next()` when checked against `req.ip`. `req.socket.remoteAddress` is the raw TCP peer address —
// it is not influenced by any header, so it cannot be spoofed by a caller that isn't genuinely
// connecting from loopback (e.g. an operator shell on the same host/container).
function requireLocalhost(req, res, next) {
  const ip = req.socket?.remoteAddress || '';
  if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') return next();
  console.warn('[requireLocalhost] blocked request from', ip, 'for', req.method, req.originalUrl);
  return res.status(403).json({ error: 'Admin endpoints are localhost-only' });
}

// T005: POST /api/admin/generate
app.post('/api/admin/generate', requireLocalhost, async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'database unavailable' });

  const { category, count = 30, seed } = req.body;
  if (!VALID_CATEGORIES.has(category)) {
    return res.status(400).json({ error: 'invalid category' });
  }
  if (!Number.isInteger(count) || count < 1 || count > 1000) {
    return res.status(400).json({ error: 'count must be integer 1–1000' });
  }
  if (seed !== undefined && !Number.isInteger(seed)) {
    return res.status(400).json({ error: 'seed must be an integer' });
  }

  console.log('/api/admin/generate request', { category, count, seed });
  const { generateCandidates } = await import('./candidate-generator.js');
  const result = await generateCandidates(category, count, seed);

  const runId = `${new Date().toISOString()}-cat${category}-seed${result.seed}`;

  if (result.candidates.length > 0) {
    const rows = result.candidates.map(c => ({
      category: c.category,
      move_string: c.move_string,
      solver_scores: c.solver_scores,
      classifier_tags: c.classifier_tags,
      generation_run_id: runId,
      seed: result.seed,
      user_player: c.move_string.length % 2 === 0 ? 1 : 2,
      debug_trace: c.debug_trace ?? null,
      highlight_cells: c.highlight_cells ?? null,
      highlight_metadata: c.highlight_metadata ?? null,
      category_evidence: c.category_evidence ?? null,
      correct_col: c.correct_col ?? null,
    }));
    const { error } = await supabase.from('candidates').insert(rows);
    if (error) { logError('[admin/generate]', error); return res.status(500).json({ error: 'internal error' }); }
  }

  res.json({
    generation_run_id: runId,
    inserted: result.candidates.length,
    seed: result.seed,
    duration_ms: result.durationMs,
  });
});

// T007: GET /api/admin/candidates/stats
app.get('/api/admin/candidates/stats', requireLocalhost, async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'database unavailable' });

  const { data, error } = await supabase.from('candidates').select('category, status, count()');
  if (error) { logError('[admin/candidates/stats]', error); return res.status(500).json({ error: 'internal error' }); }

  const stats = {};
  for (const slug of CATEGORY_ORDER) stats[slug] = { category: slug, pending: 0, approved: 0, rejected: 0, unindexed_count: 0 };
  for (const row of (data || [])) {
    if (stats[row.category]) stats[row.category][row.status] = Number(row.count);
  }

  // Add unindexed_count per category
  const { data: unindexedData, error: unindexedErr } = await supabase
    .from('puzzles')
    .select('category')
    .eq('is_active', true)
    .is('position', null);

  if (!unindexedErr && unindexedData) {
    for (const row of unindexedData) {
      if (stats[row.category]) stats[row.category].unindexed_count++;
    }
  }

  res.json({ categories: Object.values(stats) });
});

// POST /api/admin/puzzles/reindex
app.post('/api/admin/puzzles/reindex', requireLocalhost, async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'database unavailable' });

  const { category } = req.body;
  if (!VALID_CATEGORIES.has(category)) {
    if (category === 'mixed') {
      return res.status(400).json({ error: 'mixed is a pseudo-category and cannot be reindexed' });
    }
    return res.status(400).json({ error: 'invalid category' });
  }

  const { data: puzzles, error } = await supabase
    .from('puzzles')
    .select('id, category, move_string, highlight_metadata, correct_col, highlight_cells')
    .eq('category', category)
    .eq('is_active', true);

  if (error) { logError('[admin/puzzles/reindex]', error); return res.status(500).json({ error: 'internal error' }); }

  if (!puzzles || puzzles.length === 0) {
    return res.json({ category, indexed: 0, shapeGroups: 0 });
  }

  // Compute shape_key and group by it
  const groups = new Map();
  const groupKeys = [];
  for (const puzzle of puzzles) {
    const key = shapeKeyForPuzzle(puzzle);
    if (!groups.has(key)) {
      groups.set(key, []);
      groupKeys.push(key);
    }
    groups.get(key).push(puzzle);
  }

  // Shuffle within each group
  for (const key of groupKeys) {
    groups.get(key).sort(() => Math.random() - 0.5);
  }

  // Round-robin position assignment
  const numGroups = groupKeys.length;
  const maxGroupSize = Math.max(...groupKeys.map(k => groups.get(k).length));

  const updates = [];
  for (let sortedGroupPosition = 0; sortedGroupPosition < maxGroupSize; sortedGroupPosition++) {
    for (let groupIndex = 0; groupIndex < numGroups; groupIndex++) {
      if (sortedGroupPosition < groups.get(groupKeys[groupIndex]).length) {
        const puzzle = groups.get(groupKeys[groupIndex])[sortedGroupPosition];
        const position = groupIndex + sortedGroupPosition * numGroups;
        puzzle.shape_key = groupKeys[groupIndex];
        puzzle.position = position;
        updates.push(puzzle);
      }
    }
  }

  // Batch update sequentially
  for (const puzzle of updates) {
    const { error: upErr } = await supabase
      .from('puzzles')
      .update({ shape_key: puzzle.shape_key, position: puzzle.position })
      .eq('id', puzzle.id);
    if (upErr) {
      console.error('[puzzles/reindex] update error', puzzle.id, upErr.message);
    }
  }

  res.json({ category, indexed: updates.length, shapeGroups: numGroups });
});

// T008: GET /api/admin/candidates
app.get('/api/admin/candidates', requireLocalhost, async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'database unavailable' });

  const category = req.query.category;
  if (!VALID_CATEGORIES.has(category)) {
    return res.status(400).json({ error: 'invalid category' });
  }
  const status = req.query.status || 'pending';
  if (!['pending', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'status must be pending|approved|rejected' });
  }
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
  const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);

  const { data, error, count } = await supabase
    .from('candidates')
    .select('id, category, move_string, solver_scores, classifier_tags, status, rejection_reason, created_at, debug_trace, highlight_cells, highlight_metadata, category_evidence, correct_col', { count: 'exact' })
    .eq('category', category)
    .eq('status', status)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) { logError('[admin/candidates]', error); return res.status(500).json({ error: 'internal error' }); }

  res.set('Cache-Control', 'no-store');
  let candidates = data || [];

  if (status === 'rejected' && candidates.length > 0) {
    const candidateIds = candidates.map(c => c.id);
    const { data: fpRecords } = await supabase
      .from('false_positive_records')
      .select('candidate_id, annotator_note')
      .in('candidate_id', candidateIds);
    const fpMap = Object.fromEntries((fpRecords ?? []).map(r => [r.candidate_id, r.annotator_note]));
    candidates = candidates.map(c => ({ ...c, annotator_note: fpMap[c.id] ?? null }));
  }

  if (status === 'approved' && candidates.length > 0) {
    const moveStrings = candidates.map(c => c.move_string);
    const { data: puzzles } = await supabase
      .from('puzzles')
      .select('move_string, goal_prompt, difficulty, cooperative_ai_moves')
      .in('move_string', moveStrings)
      .eq('is_active', true);
    const puzzleMap = Object.fromEntries((puzzles ?? []).map(p => [p.move_string, p]));
    candidates = candidates.map(c => ({ ...c, ...(puzzleMap[c.move_string] ?? {}) }));
  }

  res.json({ candidates, total: count ?? 0 });
});

// T009: POST /api/admin/candidates/reject-batch
app.post('/api/admin/candidates/reject-batch', requireLocalhost, async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'database unavailable' });

  const { category, reason = 'other' } = req.body;
  if (!VALID_CATEGORIES.has(category)) {
    return res.status(400).json({ error: 'invalid category' });
  }

  const { data, error } = await supabase
    .from('candidates')
    .update({ status: 'rejected', rejection_reason: reason, reviewed_at: new Date().toISOString() })
    .eq('category', category)
    .eq('status', 'pending')
    .select('id');

  if (error) { logError('[admin/candidates/reject-batch]', error); return res.status(500).json({ error: 'internal error' }); }
  res.json({ rejected: data?.length ?? 0 });
});

// T012: GET /api/admin/scores
app.get('/api/admin/scores', requireLocalhost, async (req, res) => {
  const movesErr = validateMoves(req.query.moves ?? '');
  if (movesErr) return res.status(400).json({ error: movesErr });

  const moves = req.query.moves ?? '';
  if (moves.length === 0) return res.status(400).json({ error: 'moves must include at least one move' });

  const category = req.query.category;
  if (!VALID_CATEGORIES.has(category)) {
    return res.status(400).json({ error: 'invalid category' });
  }

  // moves is the board state AFTER the clicked column is appended.
  // Extract last move to evaluate predicate for that column.
  const candidateCol = parseInt(moves[moves.length - 1], 10);
  const preClickMoves = moves.slice(0, -1);

  let scores;
  try {
    scores = preClickMoves === '' ? EMPTY_BOARD_SCORES : await solver.query(preClickMoves);
  } catch (err) {
    logError('[admin/scores/solver]', err);
    return res.status(500).json({ error: 'Solver unavailable' });
  }

  const classResult = classify(preClickMoves, candidateCol, scores);

  let predicatePass;
  if (category === 'forced_win') {
    const { correctCols } = checkForcedWinPredicate(preClickMoves);
    predicatePass = correctCols.includes(candidateCol);
  } else if (category === 'forbidden_columns') {
    const { correctCols } = checkForbiddenColumnsPredicate(preClickMoves);
    predicatePass = correctCols.includes(candidateCol);
  } else {
    const correctColRaw = req.query.correct_col !== undefined ? parseInt(req.query.correct_col, 10) : null;
    if (correctColRaw !== null && !isValidCol0(correctColRaw)) {
      return res.status(400).json({ error: 'correct_col must be integer 0-6' });
    }
    const correctCol = correctColRaw;
    const puzzle = { category, moveString: preClickMoves, correctCol };
    const evalResult = evaluatePredicate(puzzle, candidateCol, scores);
    predicatePass = evalResult.result === 'correct' || evalResult.result === 'tied';
  }

  res.json({
    scores,
    classifier_tags: classResult?.tag ? [classResult.tag] : [],
    predicate_pass: predicatePass,
  });
});

// T013: POST /api/admin/candidates/:id/approve
app.post('/api/admin/candidates/:id/approve', requireLocalhost, async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'database unavailable' });

  const { id } = req.params;
  const { goal_prompt, difficulty, cooperative_ai_moves = [] } = req.body;

  if (!goal_prompt?.trim()) return res.status(400).json({ error: 'goal_prompt is required' });
  if (![1, 2, 3].includes(Number(difficulty))) return res.status(400).json({ error: 'difficulty must be 1–3' });
  if (!Array.isArray(cooperative_ai_moves)) {
    return res.status(400).json({ error: 'cooperative_ai_moves must be an array' });
  }

  const { data: candidate, error: fetchErr } = await supabase
    .from('candidates')
    .select('id, category, move_string, status, highlight_metadata, correct_col, category_evidence, highlight_cells')
    .eq('id', id)
    .single();

  if (fetchErr || !candidate) return res.status(404).json({ error: 'candidate not found' });
  if (candidate.status === 'approved') return res.status(409).json({ error: 'candidate already approved' });

  const hmErr = validateHighlightMetadata(candidate.highlight_metadata);
  if (hmErr) return res.status(400).json({ error: `Invalid highlight_metadata: ${hmErr}` });

  if (candidate.correct_col !== null && !isValidCol0(candidate.correct_col)) {
    return res.status(400).json({ error: `correct_col out of range: ${candidate.correct_col}` });
  }

  // Validate cooperative_ai_moves for multi-move categories

  const predicateType = candidate.category;

  const { data: puzzle, error: insertErr } = await supabase
    .from('puzzles')
    .insert({
      category: candidate.category,
      move_string: candidate.move_string,
      goal_prompt: goal_prompt.trim(),
      goal_predicate_type: predicateType,
      goal_predicate_params: {},
      cooperative_ai_moves,
      difficulty: Number(difficulty),
      is_active: true,
      interaction_mode: candidate.category === 'forced_win' ? 'sequence' : 'single_move',
      highlight_metadata: candidate.highlight_metadata ?? null,
      correct_col: candidate.correct_col ?? null,
      highlight_cells: candidate.highlight_cells ?? null,
      user_player: candidate.move_string.length % 2 === 0 ? 1 : 2,
      simulation_trace: candidate.category_evidence?.simulation_trace ?? [],
    })
    .select('id')
    .single();

  if (insertErr) { logError('[admin/candidates/approve]', insertErr); return res.status(500).json({ error: 'internal error' }); }

  const { error: updateErr } = await supabase
    .from('candidates')
    .update({ status: 'approved', reviewed_at: new Date().toISOString() })
    .eq('id', id);

  if (updateErr) { logError('[admin/candidates/approve]', updateErr); return res.status(500).json({ error: 'internal error' }); }

  res.status(201).json({ puzzle_id: puzzle.id, candidate_id: id });
});

// POST /api/admin/candidates/approve-batch
app.post('/api/admin/candidates/approve-batch', requireLocalhost, async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'database unavailable' });

  const { category, goal_prompt, difficulty = 2 } = req.body;
  if (!category) return res.status(400).json({ error: 'category is required' });
  if (!goal_prompt?.trim()) return res.status(400).json({ error: 'goal_prompt is required' });
  if (![1, 2, 3].includes(Number(difficulty))) return res.status(400).json({ error: 'difficulty must be 1–3' });

  const { data: candidates, error: fetchErr } = await supabase
    .from('candidates')
    .select('id, category, move_string, status, highlight_metadata, correct_col, category_evidence, highlight_cells')
    .eq('category', category)
    .eq('status', 'pending');

  if (fetchErr) { logError('[admin/candidates/approve-batch]', fetchErr); return res.status(500).json({ error: 'internal error' }); }
  if (!candidates || candidates.length === 0) return res.json({ approved: 0, skipped: 0, errors: [] });

  let approved = 0;
  let skipped = 0;
  const errors = [];

  for (const candidate of candidates) {
    if (candidate.status === 'approved') { skipped++; continue; }

    const hmErr = validateHighlightMetadata(candidate.highlight_metadata);
    if (hmErr) { errors.push({ id: candidate.id, error: `Invalid highlight_metadata: ${hmErr}` }); continue; }

    if (candidate.correct_col !== null && !isValidCol0(candidate.correct_col)) {
      errors.push({ id: candidate.id, error: `correct_col out of range: ${candidate.correct_col}` });
      continue;
    }

    const { error: insertErr } = await supabase
      .from('puzzles')
      .insert({
        category: candidate.category,
        move_string: candidate.move_string,
        goal_prompt: goal_prompt.trim(),
        goal_predicate_type: candidate.category,
        goal_predicate_params: {},
        cooperative_ai_moves: [],
        difficulty: Number(difficulty),
        is_active: true,
        interaction_mode: candidate.category === 'forced_win' ? 'sequence' : 'single_move',
        highlight_metadata: candidate.highlight_metadata ?? null,
        correct_col: candidate.correct_col ?? null,
        highlight_cells: candidate.highlight_cells ?? null,
        user_player: candidate.move_string.length % 2 === 0 ? 1 : 2,
        simulation_trace: candidate.category_evidence?.simulation_trace ?? [],
      });

    if (insertErr) { errors.push({ id: candidate.id, error: insertErr.message }); continue; }

    const { error: updateErr } = await supabase
      .from('candidates')
      .update({ status: 'approved', reviewed_at: new Date().toISOString() })
      .eq('id', candidate.id);

    if (updateErr) { errors.push({ id: candidate.id, error: updateErr.message }); continue; }

    approved++;
  }

  res.json({ approved, skipped, errors });
});

// T014: POST /api/admin/candidates/:id/reject
app.post('/api/admin/candidates/:id/reject', requireLocalhost, async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'database unavailable' });

  const { id } = req.params;
  const { reason, note = '' } = req.body;
  const validReasons = ['not_educational', 'end_game', 'false_positive', 'other'];
  if (!validReasons.includes(reason)) {
    return res.status(400).json({ error: `reason must be one of: ${validReasons.join(', ')}` });
  }

  const { data: candidate, error: fetchErr } = await supabase
    .from('candidates')
    .select('id, category, move_string, solver_scores, status')
    .eq('id', id)
    .single();

  if (fetchErr || !candidate) return res.status(404).json({ error: 'candidate not found' });
  if (candidate.status === 'approved') {
    await supabase.from('puzzles').update({ is_active: false }).eq('move_string', candidate.move_string);
  }

  const { error: updateErr } = await supabase
    .from('candidates')
    .update({ status: 'rejected', rejection_reason: reason, reviewed_at: new Date().toISOString() })
    .eq('id', id);

  if (updateErr) { logError('[admin/candidates/reject]', updateErr); return res.status(500).json({ error: 'internal error' }); }

  let falsePositiveId = undefined;
  if (reason === 'false_positive') {
    const { data: fp, error: fpErr } = await supabase
      .from('false_positive_records')
      .insert({
        candidate_id: id,
        category: candidate.category,
        move_string: candidate.move_string,
        solver_scores: candidate.solver_scores,
        annotator_note: note,
      })
      .select('id')
      .single();

    if (!fpErr && fp) falsePositiveId = fp.id;
  }

  const resp = { candidate_id: id };
  if (falsePositiveId) resp.false_positive_record_id = falsePositiveId;
  res.json(resp);
});

// DELETE /api/admin/candidates/:id — permanently delete a candidate; deactivates puzzle if approved
app.delete('/api/admin/candidates/:id', requireLocalhost, async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'database unavailable' });

  const { id } = req.params;

  const { data: candidate, error: fetchErr } = await supabase
    .from('candidates')
    .select('id, status, move_string')
    .eq('id', id)
    .single();

  if (fetchErr || !candidate) return res.status(404).json({ error: 'candidate not found' });

  if (candidate.status === 'approved') {
    await supabase.from('puzzles').update({ is_active: false }).eq('move_string', candidate.move_string);
  }

  const { error: deleteErr } = await supabase.from('candidates').delete().eq('id', id);
  if (deleteErr) { logError('[admin/candidates/delete]', deleteErr); return res.status(500).json({ error: 'internal error' }); }
  res.status(204).end();
});

// T015: GET /api/admin/false-positives
app.get('/api/admin/false-positives', requireLocalhost, async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'database unavailable' });

  let query = supabase
    .from('false_positive_records')
    .select('id, candidate_id, category, move_string, solver_scores, annotator_note, created_at', { count: 'exact' })
    .order('created_at', { ascending: false });

  const category = req.query.category;
  if (category && VALID_CATEGORIES.has(category)) query = query.eq('category', category);

  const { data, error, count } = await query;
  if (error) { logError('[admin/false-positives]', error); return res.status(500).json({ error: 'internal error' }); }
  res.json({ false_positives: data || [], total: count ?? 0 });
});

// POST /api/admin/seed-puzzles — insert placeholder_puzzles.json into DB (idempotent)
app.post('/api/admin/seed-puzzles', requireLocalhost, async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'database unavailable' });

  const { readFile } = await import('fs/promises');
  const dataPath = join(__dirname, 'data', 'placeholder_puzzles.json');
  let puzzles;
  try {
    puzzles = JSON.parse(await readFile(dataPath, 'utf8'));
  } catch (err) {
    logError('[admin/seed-puzzles]', err);
    return res.status(500).json({ error: 'internal error' });
  }

  let inserted = 0, skipped = 0;
  for (const p of puzzles) {
    const { data: existing } = await supabase
      .from('puzzles')
      .select('id')
      .eq('category', p.category)
      .eq('move_string', p.move_string)
      .limit(1)
      .single();
    if (existing) { skipped++; continue; }
    const { error } = await supabase.from('puzzles').insert(p);
    if (error) {
      logError('[admin/seed-puzzles/insert]', error);
      return res.status(500).json({ error: 'internal error' });
    }
    inserted++;
  }
  res.json({ inserted, skipped });
});

// POST /api/admin/puzzles — save a single authored puzzle
app.post('/api/admin/puzzles', requireLocalhost, async (req, res) => {
  const { category, move_string, goal_prompt, predicate_type, difficulty } = req.body;

  if (!category || move_string === undefined || !goal_prompt || !predicate_type || !difficulty) {
    return res.status(400).json({ error: 'Missing required field: category, move_string, goal_prompt, predicate_type, difficulty' });
  }
  if (!VALID_CATEGORIES.has(category)) {
    return res.status(400).json({ error: 'invalid category' });
  }
  if (!MOVES_RE.test(move_string)) {
    return res.status(400).json({ error: 'Invalid move_string — columns 1–7, max 42 chars' });
  }
  if (!VALID_CATEGORIES.has(predicate_type)) {
    return res.status(400).json({ error: `Invalid predicate_type — must be one of: ${[...VALID_CATEGORIES].join(', ')}` });
  }
  if (![1,2,3].includes(Number(difficulty))) {
    return res.status(400).json({ error: 'Invalid difficulty — must be 1–3' });
  }

  if (!supabase) return res.status(503).json({ error: 'database unavailable' });

  const { data, error } = await supabase
    .from('puzzles')
    .insert({
      category,
      move_string,
      goal_prompt,
      goal_predicate_type: predicate_type,
      goal_predicate_params: {},
      cooperative_ai_moves: [],
      difficulty: Number(difficulty),
      is_active: true,
    })
    .select('id')
    .single();

  if (error) { logError('[admin/puzzles/create]', error); return res.status(500).json({ error: 'internal error' }); }
  res.status(201).json({ id: data.id, verified: false });
});

// ── Admin Audio (TTS management — localhost only) ─────────────────────────────

/** Derive a slug from an i18n key (same logic as generate-tts.js). */
function keyToAudioSlug(key) {
  return key.replace(/[._]/g, '--');
}

const TTS_REGISTRY_PATH = join(__dirname, 'tts-registry.json');
const TTS_AUDIO_DIR = join(__dirname, '../public/audio/coach');
const TTS_MANIFEST_PATH = join(TTS_AUDIO_DIR, 'coach-audio-manifest.json');
const TTS_PROMPT_PATH = join(__dirname, 'tts-prompt.json');

const VALID_TTS_VOICES = ['alloy','ash','coral','echo','fable','nova','onyx','sage','shimmer'];

function readTtsConfig() {
  try {
    const data = JSON.parse(readFileSync(TTS_PROMPT_PATH, 'utf8'));
    return {
      prompt: data.prompt || '',
      speed: typeof data.speed === 'number' ? data.speed : 1.0,
      voice: VALID_TTS_VOICES.includes(data.voice) ? data.voice : 'alloy',
    };
  } catch {
    return { prompt: '', speed: 1.0, voice: 'alloy' };
  }
}

function writeTtsConfig(prompt, speed, voice) {
  writeFileSync(TTS_PROMPT_PATH, JSON.stringify({ prompt, speed, voice }, null, 2) + '\n', 'utf8');
}

/**
 * Strip annotation markers from LLM explanation text for TTS speech.
 * Removes [zone:X]...[/zone:X] and [term:X]...[/term:X] tag wrappers,
 * keeping only the inner text. Also strips any leftover unmatched bracket tokens.
 *
 * @param {string} raw - Raw LLM explanation from deep_reveal_json.explanation
 * @returns {string} Clean prose suitable for TTS synthesis
 */
function stripAnnotationsForTTS(raw) {
  if (!raw) return '';
  return raw
    // Remove opening zone/term tags: [zone:col3], [zone:tg], [term:kbId], etc.
    .replace(/\[zone:[^\]]+\]/gi, '')
    .replace(/\[term:[^\]]+\]/gi, '')
    // Remove closing tags: [/zone:col3], [/term:kbId], etc.
    .replace(/\[\/zone:[^\]]+\]/gi, '')
    .replace(/\[\/term:[^\]]+\]/gi, '')
    // Collapse multiple spaces and trim
    .replace(/\s+/g, ' ')
    .trim();
}

function readTtsRegistry() {
  try {
    return JSON.parse(readFileSync(TTS_REGISTRY_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function writeTtsRegistry(entries) {
  mkdirSync(dirname(TTS_REGISTRY_PATH), { recursive: true });
  writeFileSync(TTS_REGISTRY_PATH, JSON.stringify(entries, null, 2) + '\n', 'utf8');
}

function writeTtsManifest(entries) {
  const slugs = entries
    .filter(e => e.status === 'approved')
    .map(e => e.slug)
    .sort();
  mkdirSync(TTS_AUDIO_DIR, { recursive: true });
  writeFileSync(TTS_MANIFEST_PATH, JSON.stringify(slugs, null, 2) + '\n', 'utf8');
}

// GET /api/admin/audio/prompt — returns the current TTS config (prompt + speed)
app.get('/api/admin/audio/prompt', requireLocalhost, (req, res) => {
  res.json(readTtsConfig());
});

// POST /api/admin/audio/prompt — saves TTS config (prompt + speed + voice)
app.post('/api/admin/audio/prompt', requireLocalhost, (req, res) => {
  const { prompt, speed, voice } = req.body;
  if (typeof prompt !== 'string') return res.status(400).json({ error: 'prompt must be a string' });
  const parsedSpeed = parseFloat(speed);
  if (isNaN(parsedSpeed) || parsedSpeed < 0.25 || parsedSpeed > 4.0) {
    return res.status(400).json({ error: 'speed must be a number between 0.25 and 4.0' });
  }
  if (!VALID_TTS_VOICES.includes(voice)) {
    return res.status(400).json({ error: `voice must be one of: ${VALID_TTS_VOICES.join(', ')}` });
  }
  writeTtsConfig(prompt, parsedSpeed, voice);
  res.json({ ok: true });
});

// GET /api/admin/audio/status — grouped key list for the admin page
app.get('/api/admin/audio/status', requireLocalhost, (req, res) => {
  try {
    const registry = readTtsRegistry();
    const approved = [];
    const awaiting = [];
    const needs = [];
    const ineligible = [];

    for (const entry of registry) {
      // Resolve the i18n key to its English text for preview
      let text = '';
      try {
        const parts = entry.key.split('.');
        let node = i18nTranslations;
        for (const p of parts) node = node[p];
        text = typeof node === 'string' ? node : '';
      } catch { /* key not found in en.json */ }

      const item = { key: entry.key, slug: entry.slug, text, status: entry.status, reason: entry.reason || null, generated_at: entry.generated_at || null, approved_at: entry.approved_at || null };

      switch (entry.status) {
        case 'approved': approved.push(item); break;
        case 'awaiting_approval': awaiting.push(item); break;
        case 'needs_audio': needs.push(item); break;
        case 'ineligible': ineligible.push(item); break;
        default: needs.push(item); break;
      }
    }

    res.json({ approved, awaiting_approval: awaiting, needs_audio: needs, ineligible, counts: { approved: approved.length, awaiting_approval: awaiting.length, needs_audio: needs.length, ineligible: ineligible.length, total: registry.length } });
  } catch (err) {
    logError('[admin/audio/status]', err);
    res.status(500).json({ error: 'internal error' });
  }
});

// POST /api/admin/audio/generate — synthesize audio for a single key
app.post('/api/admin/audio/generate', requireLocalhost, async (req, res) => {
  const { key } = req.body;
  if (!key || typeof key !== 'string') {
    return res.status(400).json({ error: 'key is required' });
  }

  try {
    const registry = readTtsRegistry();
    const entry = registry.find(e => e.key === key);
    if (!entry) return res.status(404).json({ error: 'key not found in registry' });
    if (entry.status === 'ineligible') return res.status(400).json({ error: `key is ineligible: ${entry.reason}` });

    // Resolve text from en.json
    const parts = key.split('.');
    let node = i18nTranslations;
    for (const p of parts) node = node[p];
    const text = typeof node === 'string' ? node : null;
    if (!text || text.includes('{{')) {
      return res.status(400).json({ error: 'key has interpolated text or is missing' });
    }

    const { synthesize } = await import('./ttsProvider.js');
    const { prompt: instructions, speed, voice } = readTtsConfig();
    console.log(`[admin/audio/generate] key=${key} voice=${voice} speed=${speed}`);
    const audio = await synthesize(text, { instructions: instructions || undefined, speed, voice });
    mkdirSync(TTS_AUDIO_DIR, { recursive: true });
    writeFileSync(join(TTS_AUDIO_DIR, `${entry.slug}.mp3`), audio);

    entry.status = 'awaiting_approval';
    entry.generated_at = new Date().toISOString();
    writeTtsRegistry(registry);

    res.json({ key, slug: entry.slug, status: 'awaiting_approval', size: audio.length });
  } catch (err) {
    logError('[admin/audio/generate]', err);
    res.status(500).json({ error: 'internal error' });
  }
});

// POST /api/admin/audio/generate-all — synthesize all needs_audio keys
app.post('/api/admin/audio/generate-all', requireLocalhost, async (req, res) => {
  try {
    const registry = readTtsRegistry();
    const needsAudio = registry.filter(e => e.status === 'needs_audio');

    if (needsAudio.length === 0) {
      return res.json({ generated: 0, failed: 0, message: 'No keys need audio generation' });
    }

    const { synthesize } = await import('./ttsProvider.js');
    const { prompt: instructions, speed, voice } = readTtsConfig();
    let generated = 0;
    const failed = [];
    const total = needsAudio.length;

    console.log(`[admin/audio/generate-all] starting: ${total} keys to generate (voice=${voice} speed=${speed})`);

    for (const entry of needsAudio) {
      try {
        const parts = entry.key.split('.');
        let node = i18nTranslations;
        for (const p of parts) node = node[p];
        const text = typeof node === 'string' ? node : null;
        if (!text || text.includes('{{')) {
          failed.push({ key: entry.key, error: 'interpolated or missing text' });
          continue;
        }

        const audio = await synthesize(text, { instructions: instructions || undefined, speed, voice });
        writeFileSync(join(TTS_AUDIO_DIR, `${entry.slug}.mp3`), audio);
        entry.status = 'awaiting_approval';
        entry.generated_at = new Date().toISOString();
        generated++;
        const remaining = total - generated - failed.length;
        console.log(`[admin/audio/generate-all] generated ${generated}/${total} — ${remaining} remaining | key=${entry.key}`);
      } catch (err) {
        failed.push({ key: entry.key, error: err.message });
        console.error(`[admin/audio/generate-all] failed key=${entry.key}: ${err.message}`);
      }
    }

    writeTtsRegistry(registry);
    res.json({ generated, failed: failed.length, failedKeys: failed.length > 0 ? failed : undefined });
  } catch (err) {
    logError('[admin/audio/generate-all]', err);
    res.status(500).json({ error: 'internal error' });
  }
});

// POST /api/admin/audio/approve — approve a single key and regenerate manifest
app.post('/api/admin/audio/approve', requireLocalhost, (req, res) => {
  const { key } = req.body;
  if (!key || typeof key !== 'string') {
    return res.status(400).json({ error: 'key is required' });
  }

  try {
    const registry = readTtsRegistry();
    const entry = registry.find(e => e.key === key);
    if (!entry) return res.status(404).json({ error: 'key not found in registry' });
    if (entry.status === 'ineligible') return res.status(400).json({ error: 'ineligible keys cannot be approved' });
    if (entry.status === 'needs_audio') return res.status(400).json({ error: 'key has no generated audio — generate first' });

    entry.status = 'approved';
    entry.approved_at = new Date().toISOString();
    writeTtsRegistry(registry);
    writeTtsManifest(registry);

    res.json({ key, slug: entry.slug, status: 'approved' });
  } catch (err) {
    logError('[admin/audio/approve]', err);
    res.status(500).json({ error: 'internal error' });
  }
});

// POST /api/admin/audio/approve-all — approve all awaiting_approval keys
app.post('/api/admin/audio/approve-all', requireLocalhost, (req, res) => {
  try {
    const registry = readTtsRegistry();
    const awaiting = registry.filter(e => e.status === 'awaiting_approval');

    if (awaiting.length === 0) {
      return res.json({ approved: 0, message: 'No keys awaiting approval' });
    }

    for (const entry of awaiting) {
      entry.status = 'approved';
      entry.approved_at = new Date().toISOString();
    }

    writeTtsRegistry(registry);
    writeTtsManifest(registry);

    res.json({ approved: awaiting.length, slugs: awaiting.map(e => e.slug) });
  } catch (err) {
    logError('[admin/audio/approve-all]', err);
    res.status(500).json({ error: 'internal error' });
  }
});

// GET /api/admin/audio/play/:slug — serve a generated audio file for preview
app.get('/api/admin/audio/play/:slug', requireLocalhost, (req, res) => {
  const slug = req.params.slug;
  // Sanitize: only allow alphanumeric + hyphens
  if (!/^[a-zA-Z0-9--]+$/.test(slug)) {
    return res.status(400).json({ error: 'invalid slug' });
  }
  const filePath = join(TTS_AUDIO_DIR, `${slug}.mp3`);
  if (!existsSync(filePath)) {
    return res.status(404).json({ error: 'audio file not found' });
  }
  res.set('Content-Type', 'audio/mpeg');
  res.sendFile(filePath);
});

// ── Deep Reveal TTS ─────────────────────────────────────────────────────────────

// GET /api/user/tts/deep-reveal — speak a deep-reveal explanation via TTS.
// Cache hit: 302 redirect to signed Supabase Storage URL.
// Cache miss: streams OpenAI TTS directly to client, buffers for background upload.
app.get('/api/user/tts/deep-reveal', async (req, res) => {
  // Auth gate (401)
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  // Validate query params
  const { moveString, col: colStr } = req.query;
  if (!moveString || !/^[0-6]{0,42}$/.test(moveString)) {
    return res.status(400).json({ error: 'invalid moveString' });
  }
  const col = parseInt(colStr, 10);
  if (isNaN(col) || col < 0 || col > 6) {
    return res.status(400).json({ error: 'invalid col' });
  }

  // Require Supabase
  if (!supabase || !process.env.SUPABASE_URL) {
    return res.status(503).json({ error: 'internal error' });
  }

  try {
    // Look up explanation_cache
    const positionHash = createHash('sha256').update(`${moveString}:${col}`).digest('hex');
    const { data: cacheEntry, error: cacheErr } = await supabase
      .from('explanation_cache')
      .select('deep_reveal_json, audio_path')
      .eq('position_hash', positionHash)
      .maybeSingle();

    if (cacheErr) {
      console.error('[tts/deep-reveal] cache lookup error:', cacheErr.message);
      return res.status(500).json({ error: 'internal error' });
    }
    if (!cacheEntry?.deep_reveal_json) {
      return res.status(404).json({ error: 'no explanation cached for this position' });
    }

    // Extract raw explanation text (handle both post-Epic 3 "explanation" and pre-Epic 3 "fullText")
    const rawText = cacheEntry.deep_reveal_json.explanation
      || cacheEntry.deep_reveal_json.fullText
      || '';
    if (!rawText) return res.status(404).json({ error: 'no explanation text available' });

    // Strip annotations for clean TTS speech
    const cleanText = stripAnnotationsForTTS(rawText);
    if (!cleanText) return res.status(404).json({ error: 'explanation text is empty after stripping annotations' });

    // Compute deterministic audio path from the cleaned text
    const textHash = createHash('sha256').update(cleanText).digest('hex');
    const audioPath = `tts/deep-reveal/${textHash}.mp3`;

    // Cache hit — redirect to signed URL
    if (cacheEntry.audio_path === audioPath) {
      const { data: signed, error: signedErr } = await supabase.storage
        .from('coach-tts')
        .createSignedUrl(audioPath, 60 * 60 * 24 * 7); // 1 week
      if (signedErr || !signed?.signedUrl) {
        console.error('[tts/deep-reveal] signed URL error:', signedErr?.message);
        return res.status(500).json({ error: 'failed to generate signed URL' });
      }
      return res.redirect(302, signed.signedUrl);
    }

    // Cache miss — requires OpenAI TTS
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: 'TTS not configured — OPENAI_API_KEY missing' });
    }

    const { synthesizeStream } = await import('./ttsProvider.js');
    const { prompt: instructions, speed, voice } = readTtsConfig();

    let ttsResponse;
    try {
      ttsResponse = await synthesizeStream(cleanText, {
        instructions: instructions || undefined,
        speed,
        voice,
      });
    } catch (ttsErr) {
      console.error('[tts/deep-reveal] OpenAI TTS error:', ttsErr.message);
      // If the body was already partially consumed, the header might be sent
      if (!res.headersSent) {
        return res.status(502).json({ error: 'TTS service error' });
      }
      return; // headers already sent — nothing we can do
    }

    // Stream to client while collecting chunks for background upload
    res.set('Content-Type', 'audio/mpeg');
    const chunks = [];
    const reader = ttsResponse.body.getReader();
    let streamComplete = false;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          streamComplete = true;
          break;
        }
        chunks.push(value);
        res.write(value);
      }
      res.end();
    } catch (streamErr) {
      console.error('[tts/deep-reveal] stream error:', streamErr.message);
      if (!res.headersSent) {
        return res.status(500).json({ error: 'stream error' });
      }
      return;
    } finally {
      // Only upload if the full stream completed (not truncated by client disconnect)
      if (streamComplete && chunks.length > 0) {
        const buffer = Buffer.concat(chunks);
        supabase.storage
          .from('coach-tts')
          .upload(audioPath, buffer, {
            contentType: 'audio/mpeg',
            upsert: true,
          })
          .then(({ error: upErr }) => {
            if (upErr) {
              console.error('[tts/deep-reveal] storage upload error:', upErr.message);
              return;
            }
            // Update explanation_cache row with the audio path
            return supabase
              .from('explanation_cache')
              .update({ audio_path: audioPath, audio_generated_at: new Date().toISOString() })
              .eq('position_hash', positionHash)
              .then(({ error: updateErr }) => {
                if (updateErr) {
                  console.error('[tts/deep-reveal] cache update error:', updateErr.message);
                }
              });
          })
          .catch(err => console.error('[tts/deep-reveal] bg upload error:', err.message));
      }
    }
  } catch (err) {
    console.error('[tts/deep-reveal] unexpected error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'internal error' });
    }
  }
});

// POST /api/admin/tts/cleanup — delete TTS audio older than 30 days (localhost only)
app.post('/api/admin/tts/cleanup', requireLocalhost, async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'internal error' });

  try {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Find rows with expired audio
    const { data: expired, error: queryErr } = await supabase
      .from('explanation_cache')
      .select('position_hash, audio_path')
      .lt('audio_generated_at', cutoff)
      .not('audio_path', 'is', null);

    if (queryErr) {
      console.error('[tts/cleanup] query error:', queryErr.message);
      return res.status(500).json({ error: 'query failed' });
    }

    if (!expired || expired.length === 0) {
      return res.json({ cleaned: 0 });
    }

    // Delete Storage objects and null out the columns
    let cleaned = 0;
    const paths = expired.map(e => e.audio_path).filter(Boolean);
    const hashes = expired.map(e => e.position_hash);

    // Delete from Storage (batch — one call per path since Supabase Storage doesn't support bulk deletes)
    for (const path of paths) {
      const { error: delErr } = await supabase.storage
        .from('coach-tts')
        .remove([path]);
      if (delErr) {
        console.error(`[tts/cleanup] storage delete error for ${path}:`, delErr.message);
        // Continue with DB cleanup anyway — orphaned storage objects are harmless
      }
    }

    // Null out audio columns in DB
    const { error: updateErr } = await supabase
      .from('explanation_cache')
      .update({ audio_path: null, audio_generated_at: null })
      .in('position_hash', hashes);

    if (updateErr) {
      console.error('[tts/cleanup] update error:', updateErr.message);
      return res.status(500).json({ error: 'update failed' });
    }

    cleaned = hashes.length;
    console.log(`[tts/cleanup] cleaned ${cleaned} rows`);
    res.json({ cleaned });
  } catch (err) {
    console.error('[tts/cleanup] unexpected error:', err.message);
    res.status(500).json({ error: 'internal error' });
  }
});

// ── Legal pages (required by Google OAuth consent screen) ────────────────────
app.get('/privacy', (_, res) => res.sendFile(join(__dirname, 'privacy.html')));
app.get('/terms', (_, res) => res.sendFile(join(__dirname, 'terms.html')));
app.get('/googlefddb3b3c02590df4.html', (_, res) => res.sendFile(join(__dirname, 'googlefddb3b3c02590df4.html')));

// ── Static assets + SPA catch-all (FR-011, FR-012, FR-013) ───────────────────

app.use(express.static(join(__dirname, '../dist')));

app.get('/{*path}', async (req, res) => {
  if (!indexHtml) return res.status(500).send('App not built');

  // FR-014: inject OG meta tags for /game/:id paths
  const gameMatch = req.path.match(/^\/game\/([^/]+)$/);
  if (gameMatch && supabase) {
    const gameId = gameMatch[1];
    try {
      const { data } = await supabase
        .from('games')
        .select('id, difficulty, result')
        .eq('id', gameId)
        .single();

      if (data) {
        const capitalize = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
        const ogTitle = `Connect Four game — ${capitalize(data.difficulty)} — ${capitalize(data.result)}`;
        const ogDesc = 'Review this Connect Four game on DecodeC4.';
        const ogTags = `<meta property="og:title" content="${ogTitle}">
<meta property="og:description" content="${ogDesc}">`;
        const patched = indexHtml.replace('</head>', `${ogTags}\n</head>`);
        return res.type('html').send(patched);
      }
    } catch (e) {
      logError('[html-serve/game-og]', e);
      // fall through to serve plain index.html
    }
  }

  // FR-021, FR-022: inject OG meta tags + noindex for /blunder/:id paths
  const blunderMatch = req.path.match(/^\/blunder\/([^/]+)$/);
  if (blunderMatch) {
    const blunderId = blunderMatch[1];
    const noindexTag = '<meta name="robots" content="noindex, nofollow">';

    if (supabase && UUID_REGEX.test(blunderId)) {
      try {
        const { data } = await supabase
          .from('blunders')
          .select('id, pattern_category')
          .eq('id', blunderId)
          .single();

        if (data) {
          const CATEGORY_LABELS = {
            immediate_threat: 'Immediate Threat',
            forced_win: 'Forced Win',
            missed_win: 'Missed Win',
            zugzwang: 'Zugzwang',
            claimeven: 'Claimeven',
            figure_7: 'Figure 7',
            j_shape: 'J-Shape',
            undercut: 'Undercut',
            overcut: 'Overcut',
          };
          const humanCategory = CATEGORY_LABELS[data.pattern_category]
            ?? data.pattern_category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          const ogTitle = `Connect Four blunder — ${humanCategory}`;
          const ogDesc = 'See this Connect Four mistake on DecodeC4.';
          const ogTags = `<meta property="og:title" content="${ogTitle}">
<meta property="og:description" content="${ogDesc}">
${noindexTag}`;
          const patched = indexHtml.replace('</head>', `${ogTags}\n</head>`);
          return res.type('html').send(patched);
        }
      } catch (e) {
        logError('[html-serve/blunder-og]', e);
        // fall through to noindex-only
      }
    }
    // Always inject noindex for /blunder/* even on error/404/non-UUID — FR-022
    const patched = indexHtml.replace('</head>', `${noindexTag}\n</head>`);
    return res.type('html').send(patched);
  }

  res.type('html').send(indexHtml);
});

// ── Global error handler ───────────────────────────────────────────────────────
// Safety net for any error passed via next(err) or thrown in async routes.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logError('[unhandled]', err, { method: req.method, url: req.originalUrl });
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Server start ───────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Connect4 server running on port ${PORT}`));
