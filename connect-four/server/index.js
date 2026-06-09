import express from 'express';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createHash } from 'crypto';
import * as Sentry from '@sentry/node';
import rateLimit from 'express-rate-limit';
import { assignHeatmaps } from './heatmap.js';
import { classify, checkWin, Board, getImmediateThreats, tagBlunder, classifyPattern } from './classifier.js';
import { buildExplainContext } from './explainContext.js';
import { VALID_BLUNDER_TAGS } from './blunderTags.js';
import { insertGameBlunder } from './insertGameBlunder.js';
import { callLLM } from './llmCoachHelpers.js';
import { evaluatePredicate } from './predicates.js';
import { createSolverProcess } from './c4solver-wrapper.js';
import { checkForcedWinPredicate, checkForbiddenColumnsPredicate } from './candidate-generator.js';
import { VALID_CATEGORIES, PAID_CATEGORIES, CATEGORY_ORDER } from './categories.js';
import { CHALLENGE_SETS } from './challengeSets.js';
import { scoreMove, computeBlunderSeverity } from './moveQualityScorer.js';
import { ForcedWinStrategy, getAiResponseCol, countThreatsAfterMove, parseBoardState } from './completionStrategies.js';
import i18nTranslations from '../src/i18n/en.json' with { type: 'json' };
import { loadLessons, getLessons, getLesson, reloadLessons, getLessonsAll, validateLesson } from './lessonLoader.js';
import { requireAdmin } from './adminAuth.js';
import { saveLessonFile, deleteLessonFile } from './lessonAdmin.js';
import { validateAnnotation } from './annotationGate.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Sentry (T004) ─────────────────────────────────────────────────────────────
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
  });
}

const app = express();
app.use(express.json());
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

// ── Supabase client ───────────────────────────────────────────────────────────

let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const { createClient } = await import('@supabase/supabase-js');
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

// ── Anthropic client ──────────────────────────────────────────────────────────

let anthropic = null;
if (process.env.ANTHROPIC_API_KEY) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

// ── Auth middleware (T020) ─────────────────────────────────────────────────────

async function loadUser(req, _res, next) {
  req.user = null;
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ') || !supabase) return next();

  const token = authHeader.slice(7);
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return next();

    const { data: profile } = await supabase
      .from('users')
      .select('tier, deep_reveal_count, deep_reveal_reset_at, device_uuid')
      .eq('id', data.user.id)
      .single();

    req.user = profile ? { id: data.user.id, ...profile } : { id: data.user.id, tier: 'free', deep_reveal_count: 0, deep_reveal_reset_at: new Date().toISOString() };
  } catch {
    // Non-fatal: treat as anonymous
  }
  next();
}

app.use(loadUser);

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

// ── Lesson routes (FR-033, FR-034, FR-035 — no auth required) ─────────────────
app.get('/api/lessons', (req, res) => res.json(getLessons()));
app.get('/api/lessons/:id', (req, res) => {
  const lesson = getLesson(req.params.id);
  if (!lesson) return res.status(404).json({ error: 'not_found' });
  res.json(lesson);
});

// ── Admin lesson endpoints ─────────────────────────────────────────────────────

app.get('/api/admin/lessons', requireAdmin, (req, res) => {
  res.json(getLessonsAll());
});

app.get('/api/admin/lessons/:id', requireAdmin, (req, res) => {
  const all = getLessonsAll();
  const lesson = all.find(l => l.id === req.params.id);
  if (!lesson) return res.status(404).json({ error: 'not_found' });
  res.json(lesson);
});

app.post('/api/admin/lessons', requireAdmin, (req, res) => {
  const lesson = req.body;
  const err = validateLesson(lesson);
  if (err) return res.status(400).json({ error: err });
  try {
    saveLessonFile(LESSONS_DIR, lesson);
    reloadLessons();
    res.status(201).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/admin/lessons/:id', requireAdmin, (req, res) => {
  const lesson = req.body;
  const err = validateLesson(lesson);
  if (err) return res.status(400).json({ error: err });
  try {
    const oldId = req.params.id !== lesson.id ? req.params.id : null;
    saveLessonFile(LESSONS_DIR, lesson, oldId);
    reloadLessons();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/admin/lessons/:id', requireAdmin, (req, res) => {
  try {
    deleteLessonFile(LESSONS_DIR, req.params.id);
    reloadLessons();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Admin puzzle picker ──────────────────────────────────────────────────────────

app.get('/api/admin/puzzles', requireAdmin, async (req, res) => {
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
    if (error) return res.status(500).json({ error: error.message });
    res.json({ puzzles: puzzles || [] });
  } catch (e) {
    res.status(500).json({ error: e.message });
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
    res.status(500).json({ error: err.message });
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
    console.error('[explain]', err.message);
    res.status(500).json({ error: err.message });
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

  res.json({ oneLiner, patternTag, deepReveal });
});

// ── LLM coaching endpoints ─────────────────────────────────────────────────────

// Inject a default-active marker into the first zone tag in an LLM explanation.
// The LLM is not prompted to use '!' — the server picks the first zone instead.
function injectDefaultActiveZone(explanation) {
  let injected = false;
  return explanation.replace(/\[zone:([^\]!]+)(!?)\]/g, (match, spec, bang) => {
    if (!injected && !bang) {
      injected = true;
      return `[zone:${spec}!]`;
    }
    return match;
  });
}

// Delegates to the unified explainContext.js flow (Epic 3).
// The module-level solver is injected here; tests pass their own solver via explainContext.js.
async function buildExplainContextActive(movestring, col, rounds = 1) {
  return buildExplainContext(movestring, col, rounds, solver);
}

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
      return res.json({
        explanation: cached.deep_reveal_json.explanation,
        prompt: cached.deep_reveal_json.prompt ?? '',
        cached: true,
      });
    }
  }

  // ── 2. LLM call + annotation gate + retry ────────────────────────────────
  try {
    const context = await buildExplainContextActive(movestring, col, r);
    if (!context) {
      // No quota consumed for the "all-moves-equal" early exit path
      return res.json({
        explanation: 'All legal moves are equally scored — no tactical comparison is available for this position.',
        prompt: '',
      });
    }

    if (context.allMovesEqual) {
      // All moves genuinely settled (all scores zero). FR-007 frozen string.
      return res.json({
        explanation: 'All moves are roughly equivalent here — no single best move stands out.',
        prompt: '',
      });
    }

    if (context.trivial) {
      // optimal move + small gap: all alternatives are negligibly different.
      // No LLM call — canned message prevents fabricated nuance.
      return res.json({
        explanation: context.trivialExplanation,
        prompt: '',
      });
    }

    const { prompt, allowedSet } = context;

    // First attempt
    console.log('[DEBUG explain-move-llm] allowedSet passed to validateAnnotation:', JSON.stringify(allowedSet));
    const rawExplanation = await callLLM(prompt);
    let explanation = injectDefaultActiveZone(rawExplanation);
    console.log('[DEBUG explain-move-llm] rawExplanation:', rawExplanation);
    let result = validateAnnotation(explanation, board, allowedSet);
    console.log('[DEBUG explain-move-llm] validateAnnotation result (attempt 1):', JSON.stringify(result));

    if (!result.valid) {
      // ── Retry (same prompt, bypasses cache and quota) ──────────────────
      const retryRaw = await callLLM(prompt);
      const retryExplanation = injectDefaultActiveZone(retryRaw);
      console.log('[DEBUG explain-move-llm] retryExplanation:', retryExplanation);
      const retryResult = validateAnnotation(retryExplanation, board, allowedSet);
      console.log('[DEBUG explain-move-llm] validateAnnotation result (retry):', JSON.stringify(retryResult));

      if (retryResult.valid) {
        explanation = retryExplanation;
        result = retryResult;
      } else {
        // ── Fallback path: double failure ──────────────────────────────
        // Read Tier-1 fallback from explanation_cache
        let fallbackText = 'Detailed explanation unavailable.';
        if (supabase) {
          const { data: fallbackRow } = await supabase
            .from('explanation_cache')
            .select('deep_reveal_json')
            .eq('position_hash', positionHash)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          if (fallbackRow?.deep_reveal_json?.fullText) {
            fallbackText = fallbackRow.deep_reveal_json.fullText;
          }
        }

        // Log failure to deep_reveal_failures
        if (supabase) {
          try {
            await supabase.from('deep_reveal_failures').insert({
              position_hash: positionHash,
              movestring,
              col,
              endpoint: '/api/explain-move-llm',
              llm_prompt: prompt,
              raw_llm_output: retryExplanation,
              failure_reason: JSON.stringify(retryResult.failures),
              created_at: new Date().toISOString(),
            });
          } catch (insertErr) {
            console.error('[deep_reveal_failures insert]', insertErr.message);
          }
        }

        // No quota consumed for fallback
        return res.json({ explanation: fallbackText, prompt: null, cached: false });
      }
    }

    // ── Valid path: decrement quota (if free-tier), cache, and respond ──
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
        deep_reveal_json: { explanation, prompt },
        template_version: 'v2',
      }).then(() => {}).catch(err => console.error('[cache write]', err.message));
    }

    res.json({ explanation, prompt });

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

  // Resolve prompt: use what the client sent; if empty and col is available, rebuild it.
  let resolvedPrompt = typeof llm_prompt === 'string' ? llm_prompt : '';
  if (!resolvedPrompt && typeof col === 'number' && Number.isInteger(col) && col >= 0 && col <= 6) {
    try {
      // Check cache first (fast path — entry must exist since the user just saw the explanation)
      const positionHash = createHash('sha256').update(`${movestring}:${col}`).digest('hex');
      const { data: cached } = await supabase
        .from('explanation_cache')
        .select('deep_reveal_json')
        .eq('position_hash', positionHash)
        .single();

      if (cached?.deep_reveal_json?.prompt) {
        resolvedPrompt = cached.deep_reveal_json.prompt;
      } else {
        // Cache entry predates prompt storage — rebuild from simulation pipeline
        const context = await buildExplainContextActive(movestring, col);
        if (context?.prompt) {
          resolvedPrompt = context.prompt;
          // Backfill cache entry with prompt so future flags don't need to rebuild
          if (cached?.deep_reveal_json) {
            supabase.from('explanation_cache')
              .update({ deep_reveal_json: { ...cached.deep_reveal_json, prompt: resolvedPrompt } })
              .eq('position_hash', positionHash)
              .then(() => {}).catch(() => {});
          }
        }
      }
    } catch {
      // Non-fatal — proceed with whatever prompt we have
    }
  }

  try {
    const { data, error } = await supabase
      .from('llm_feedback')
      .insert({ movestring, llm_prompt: resolvedPrompt, llm_response, human_note, feature })
      .select('id')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ id: data.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
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

  // Blunders from losing positions are no longer skipped — the blunder_severity
  // field provides the graduated measure of how much the move worsens the position.
  // A move that drops from -2 to -15 is a meaningful blunder even if the position
  // was already theoretically lost (as all second-player positions are).

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
        severity: computeSeverity(best_score, score),
        blunder_severity: req.body.blunder_severity ?? null,
      })
      .select('id');

    if (error) {
      if (error.code === '23505') return res.status(200).json({ deduplicated: true });
      return res.status(500).json({ error: error.message });
    }
    res.status(201).json({ id: data[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Puzzle endpoints (T035-T037) ───────────────────────────────────────────────

function userCanAccessCategory(user, categoryId) {
  if (!PAID_CATEGORIES.has(categoryId)) return true;
  return user?.tier === 'paid';
}

// GET /api/stats — per-user accuracy stats aggregated from puzzle_attempts
app.get('/api/stats', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const { data, error } = await supabase
    .from('puzzle_attempts')
    .select('first_attempt_correct, puzzles!inner(category)')
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });

  const byPattern = {};
  let totalCorrect = 0;
  for (const row of data) {
    const category = row.puzzles?.category;
    if (!category) continue;
    if (!byPattern[category]) byPattern[category] = { correct: 0, attempted: 0 };
    byPattern[category].attempted++;
    if (row.first_attempt_correct) {
      byPattern[category].correct++;
      totalCorrect++;
    }
  }

  const totalPuzzles = data.length;
  for (const cat of Object.keys(byPattern)) {
    const e = byPattern[cat];
    byPattern[cat] = {
      accuracy: e.attempted > 0 ? Math.round((e.correct / e.attempted) * 100) : 0,
      attempted: e.attempted,
    };
  }

  res.json({
    accuracy: totalPuzzles > 0 ? Math.round((totalCorrect / totalPuzzles) * 100) : 0,
    totalPuzzles,
    byPattern,
  });
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
    if (error) return res.status(500).json({ error: error.message });

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
    res.status(500).json({ error: err.message });
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
      .select('category')
      .eq('is_active', true);

    if (error) return res.status(500).json({ error: error.message });

    // Build counts map starting from CATEGORY_ORDER (all categories default to 0)
    const counts = {};
    for (const slug of CATEGORY_ORDER) {
      counts[slug] = 0;
    }
    for (const row of (data || [])) {
      if (row.category in counts) {
        counts[row.category] += 1;
      }
    }

    res.json({ counts, sets: CHALLENGE_SETS });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
      // Sample across all CATEGORY_ORDER categories (all accessible to Pro users)
      const { data, error } = await supabase
        .from('puzzles')
        .select('id, category, move_string, interaction_mode, highlight_metadata, correct_col, user_player')
        .in('category', CATEGORY_ORDER)
        .eq('is_active', true)
        .limit(n * 4); // oversample then pick
      if (error) return res.status(500).json({ error: error.message });
      // Shuffle and take n
      const shuffled = (data || []).sort(() => Math.random() - 0.5).slice(0, n);
      puzzles = shuffled;
    } else {
      const { data, error } = await supabase
        .from('puzzles')
        .select('id, category, move_string, interaction_mode, highlight_metadata, correct_col, user_player')
        .eq('category', category)
        .eq('is_active', true)
        .limit(n * 4); // oversample, shuffle in JS since Supabase JS client doesn't support ORDER BY RANDOM()
      if (error) return res.status(500).json({ error: error.message });
      const shuffled = (data || []).sort(() => Math.random() - 0.5).slice(0, n);
      puzzles = shuffled;
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
          .select('id, category, move_string, interaction_mode, highlight_metadata, correct_col, user_player')
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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
});

// ── i18n pool helper ──────────────────────────────────────────────────────────

/**
 * Navigate a nested translations object by dot-separated prefix and return
 * a randomly chosen full key string (e.g. 'coach.immediate_threat.optimal.0').
 * Returns null if the prefix resolves to a non-object or empty object.
 */
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
    const classifyResult = classify(movestring, colInt, scores);
    const patternTag = classifyResult?.tag ?? null;

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

    res.json({ badge, quality, coachPhraseKey, coachMood, summaryLineKey, patternTag });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
});

// ── Sparring game endpoints (Epic 3a) ───────────────────────────────────────────

// POST /api/games — save a completed sparring game record
app.post('/api/games', async (req, res) => {
  const { device_uuid, moves, difficulty, side, result } = req.body;

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

  if (!supabase) return res.status(503).json({ error: 'Database not configured' });

  try {
    const { data, error } = await supabase
      .from('games')
      .insert({
        user_id: req.user?.id ?? null,
        device_uuid: device_uuid || req.user?.id || 'anonymous',
        moves,
        difficulty,
        side,
        result,
      })
      .select('id')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ id: data.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    const { data: game, error } = await supabase
      .from('games')
      .select('moves, side')
      .eq('id', gameId)
      .single();

    if (error || !game) return res.status(404).json({ error: 'game not found' });

    const truncated = game.moves.slice(0, N);
    res.json({ moves: truncated, side: game.side, difficulty });
  } catch (err) {
    res.status(500).json({ error: err.message });
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

  // Fetch game row
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('id, moves, side, difficulty')
    .eq('id', gameId)
    .single();

  if (gameError || !game) return res.status(404).json({ error: 'game not found' });

  const { moves, side, difficulty } = game;

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

      // Classify the position
      // tagBlunder replaces the old classify() call for blunder tagging.
      // It may issue 60+ solver queries per blunder ply — acceptable because
      // this endpoint is called post-game, not during interactive play.
      let patternTag = null;
      let reason = null;
      let direction = null;
      if (quality === 'blunder') {
        try {
          const tagResult = await tagBlunder(movesBeforeThisPly, col, bestCol, solver);
          patternTag = tagResult.tag;
          reason = tagResult.reason;
          direction = tagResult.direction;
        } catch (_e) {
          patternTag = 'suboptimal_move';
          reason = 'solver error: tagBlunder threw';
          direction = 'missed_own';
        }
      }

      // Scan 3 plies of the post-blunder tree to compute what fraction of
      // continuations end in an opponent win. Run for ALL blunders (including
      // losing positions) — blunder_severity is the graduated measure that
      // distinguishes minor mistakes from catastrophic ones regardless of
      // whether the position was already theoretically lost.
      let blunderSeverity = null;
      if (quality === 'blunder') {
        const postBlunderMs = movesBeforeThisPly + String(col);
        try {
          const sv = await computeBlunderSeverity(solver, postBlunderMs, 3);
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

      // Server-side blunder INSERT — fire-and-forget relative to the HTTP response.
      // Anonymous users skip the INSERT (user_id would be NULL).
      if (req.user && quality === 'blunder') {
        await insertGameBlunder(supabase, {
          user_id: req.user.id,
          board_state: movesBeforeThisPly,
          move_played: col,
          correct_move: bestCol,
          pattern_category: patternTag,
          reason,
          direction,
          severity: computeSeverity(bestScore, score),
          blunder_severity: blunderSeverity,
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
    return res.status(500).json({ error: err.message });
  }

  const accuracy = scored > 0 ? Math.round(optimalCount / scored * 100) : 0;

  // Pick summary phrase key
  const phrasePool = blunderCount === 0
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
    return res.json({ outcome: 'success' });
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
app.get('/api/coach/weakness-map', requirePaid, async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'database unavailable' });

  const { data, error } = await supabase.rpc('coach_weakness_map', { user_id_param: req.user.id });
  if (error) {
    // Fallback: compute in JS
    const { data: attempts } = await supabase
      .from('puzzle_attempts')
      .select('puzzle_id, first_attempt_correct, puzzles(category)')
      .eq('user_id', req.user.id);

    const map = {};
    for (const attempt of (attempts || [])) {
      const cat = attempt.puzzles?.category;
      if (!cat) continue;
      if (!map[cat]) map[cat] = { category: cat, attempted: 0, missed: 0 };
      map[cat].attempted++;
      if (!attempt.first_attempt_correct) map[cat].missed++;
    }

    const weaknessMap = Object.values(map)
      .map(({ category, attempted, missed }) => ({
        category,
        attempted,
        missRate: attempted > 0 ? missed / attempted : 0,
      }))
      .sort((a, b) => b.missRate - a.missRate);

    return res.json({ weaknessMap });
  }

  res.json({ weaknessMap: data ?? [] });
});

// GET /api/coach/queue
app.get('/api/coach/queue', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'database unavailable' });
  if (!req.user) return res.status(401).json({ error: 'unauthorized' });

  const status = req.query.status || 'all';
  if (!['all', 'unreviewed', 'reviewed'].includes(status)) {
    return res.status(400).json({ error: 'invalid status' });
  }

  let query = supabase
    .from('blunders')
    .select('id, board_state, move_played, correct_move, pattern_category, created_at, resolved_at, severity, blunder_severity')
    .eq('user_id', req.user.id)
    // Worst mistakes first; created_at ASC breaks ties (oldest unresolved blunder wins).
    .order('severity', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(50);

  if (status === 'unreviewed') {
    query = query.is('resolved_at', null);
  } else if (status === 'reviewed') {
    query = query.not('resolved_at', 'is', null);
  }

  const { data: blunders, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  function computeThreatCells(board_state, move_played) {
    try {
      const postBoard = new Board(board_state + String(move_played));
      const opponent = postBoard.currentPlayer;
      const threatMap = postBoard.majorThreatCells();
      return Object.entries(threatMap)
        .filter(([, flags]) => opponent === 1 ? flags.rm : flags.ym)
        .map(([key]) => {
          const [row, col] = key.split(',').map(Number);
          return { col, row };
        });
    } catch {
      return [];
    }
  }

  const enriched = (blunders || []).map(b => ({
    id: b.id,
    board_state: b.board_state,
    move_played: b.move_played,
    correct_move: b.correct_move,
    pattern_category: b.pattern_category,
    created_at: b.created_at,
    resolved_at: b.resolved_at,
    severity: b.severity,
    blunder_severity: b.blunder_severity ?? null,
    threat_cells: computeThreatCells(b.board_state || '', b.move_played),
  }));

  res.json({ blunders: enriched, total: enriched.length });
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

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});

// ── Stripe endpoints (T051-T053) ───────────────────────────────────────────────

let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  const { default: Stripe } = await import('stripe');
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
}

// POST /api/stripe/create-checkout
app.post('/api/stripe/create-checkout', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (!stripe) return res.status(503).json({ error: 'Payments not configured' });

  const { plan } = req.body;
  if (!['monthly', 'annual'].includes(plan)) {
    return res.status(400).json({ error: 'plan must be monthly or annual' });
  }

  const priceId = plan === 'monthly'
    ? process.env.STRIPE_MONTHLY_PRICE_ID
    : process.env.STRIPE_ANNUAL_PRICE_ID;

  if (!priceId) return res.status(503).json({ error: 'Price not configured' });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: req.user.email,
      metadata: { user_id: req.user.id },
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/?checkout=success`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/?checkout=cancelled`,
    });
    res.json({ checkoutUrl: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/stripe/webhook
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe) return res.status(503).end();

  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  // Store event record first
  if (supabase) {
    await supabase.from('stripe_events').insert({
      stripe_event_id: event.id,
      event_type: event.type,
      payload: event,
    }).catch(err => console.error('[stripe_event]', err.message));
  }

  if (supabase) {
    const session = event.data.object;
    if (event.type === 'checkout.session.completed') {
      const userId = session.metadata?.user_id;
      if (userId) {
        const { error: tierErr } = await supabase.from('users').update({
          tier: 'paid',
          stripe_customer_id: session.customer,
        }).eq('id', userId);
        if (!tierErr) {
          supabase.from('tracks').insert({
            uid: userId,
            user_id: userId,
            path: '/stripe/webhook',
            event: 'upgrade_completed',
            event_data: { plan: session.metadata?.plan ?? 'unknown' },
          }).then(() => {}).catch(err => console.error('[track upgrade]', err.message));
        }
      }
    } else if (event.type === 'customer.subscription.deleted') {
      const customerId = session.customer;
      await supabase.from('users').update({ tier: 'free' })
        .eq('stripe_customer_id', customerId);
    } else if (event.type === 'customer.subscription.updated') {
      const status = session.status;
      const customerId = session.customer;
      if (status === 'active') {
        await supabase.from('users').update({ tier: 'paid' })
          .eq('stripe_customer_id', customerId);
      }
    }
  }

  res.json({ received: true });
});

// POST /api/stripe/portal
app.post('/api/stripe/portal', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (!stripe) return res.status(503).json({ error: 'Payments not configured' });
  if (!req.user.stripe_customer_id) return res.status(400).json({ error: 'No active subscription' });

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: req.user.stripe_customer_id,
      return_url: process.env.FRONTEND_URL || 'http://localhost:5173',
    });
    res.json({ portalUrl: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Debug endpoints (localhost-only) ──────────────────────────────────────────

app.post('/api/debug/classify-all', async (req, res) => {
  const ip = req.ip || req.socket?.remoteAddress || '';
  if (ip !== '127.0.0.1' && ip !== '::1' && ip !== '::ffff:127.0.0.1') {
    return res.status(403).json({ error: 'Debug endpoints are localhost-only' });
  }
  const { moves: ms = '' } = req.body;
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
    console.error('[debug/classify-all]', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Admin endpoints (localhost-only) ──────────────────────────────────────────

function requireLocalhost(req, res, next) {
  const ip = req.ip || req.socket?.remoteAddress || '';
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
    if (error) return res.status(500).json({ error: error.message });
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

  const { data, error } = await supabase.from('candidates').select('category, status');
  if (error) return res.status(500).json({ error: error.message });

  const stats = {};
  for (const slug of CATEGORY_ORDER) stats[slug] = { category: slug, pending: 0, approved: 0, rejected: 0 };
  for (const row of (data || [])) {
    if (stats[row.category]) stats[row.category][row.status]++;
  }

  res.json({ categories: Object.values(stats) });
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

  if (error) return res.status(500).json({ error: error.message });

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

  if (error) return res.status(500).json({ error: error.message });
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
    return res.status(500).json({ error: 'Solver unavailable' });
  }

  const classResult = classify(preClickMoves, candidateCol, scores);

  let predicatePass;
  if (category === 'forced_win') {
    const { correctCols } = await checkForcedWinPredicate(preClickMoves, solver);
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
    .select('id, category, move_string, status, highlight_metadata, correct_col, category_evidence')
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
      user_player: candidate.move_string.length % 2 === 0 ? 1 : 2,
      simulation_trace: candidate.category_evidence?.simulation_trace ?? [],
    })
    .select('id')
    .single();

  if (insertErr) return res.status(500).json({ error: insertErr.message });

  const { error: updateErr } = await supabase
    .from('candidates')
    .update({ status: 'approved', reviewed_at: new Date().toISOString() })
    .eq('id', id);

  if (updateErr) return res.status(500).json({ error: updateErr.message });

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
    .select('id, category, move_string, status, highlight_metadata, correct_col, category_evidence')
    .eq('category', category)
    .eq('status', 'pending');

  if (fetchErr) return res.status(500).json({ error: fetchErr.message });
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

  if (updateErr) return res.status(500).json({ error: updateErr.message });

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
  if (deleteErr) return res.status(500).json({ error: deleteErr.message });
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
  if (error) return res.status(500).json({ error: error.message });
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
    return res.status(500).json({ error: `Could not read placeholder_puzzles.json: ${err.message}` });
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
      return res.status(500).json({ error: `Insert failed for category ${p.category}: ${error.message}` });
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

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ id: data.id, verified: false });
});

// ── Server start ───────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Connect4 server running on port ${PORT}`));
