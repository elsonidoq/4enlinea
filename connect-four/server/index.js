import express from 'express';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createHash } from 'crypto';
import * as Sentry from '@sentry/node';
import rateLimit from 'express-rate-limit';
import { assignHeatmaps } from './heatmap.js';
import { classify, checkWin } from './classifier.js';
import { evaluatePredicate } from './predicates.js';
import { createSolverProcess } from './c4solver-wrapper.js';
import { checkForcedWinPredicate, checkForbiddenColumnsPredicate } from './candidate-generator.js';
import { VALID_CATEGORIES, PAID_CATEGORIES, CATEGORY_ORDER } from './categories.js';
import { ForcedWinStrategy, getAiResponseCol, countThreatsAfterMove, parseBoardState } from './completionStrategies.js';

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
  if (!MOVES_RE.test(moves)) return 'moves must be 0–42 characters of digits 1–7';
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

async function checkAndDecrementQuota(user) {
  if (!user) return { allowed: false, reason: 'anonymous' };
  if (user.tier === 'paid') return { allowed: true };
  if (user.tier !== 'free') return { allowed: false, reason: 'anonymous' };

  const now = new Date();
  const resetAt = new Date(user.deep_reveal_reset_at);

  // Reset quota if past midnight UTC
  let count = user.deep_reveal_count;
  if (now > resetAt) {
    count = 0;
    const nextMidnight = new Date(now);
    nextMidnight.setUTCHours(24, 0, 0, 0);
    await supabase
      .from('users')
      .update({ deep_reveal_count: 0, deep_reveal_reset_at: nextMidnight.toISOString() })
      .eq('id', user.id);
  }

  if (count >= 3) return { allowed: false, reason: 'quota_exceeded', quotaRemaining: 0 };

  await supabase
    .from('users')
    .update({ deep_reveal_count: count + 1 })
    .eq('id', user.id);

  return { allowed: true, quotaRemaining: 3 - count - 1 };
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

  // Handle Deep Reveal quota
  let deepReveal = null;
  let quotaRemaining = null;

  if (requestDeepReveal && req.user) {
    const quota = await checkAndDecrementQuota(req.user);
    if (!quota.allowed) {
      return res.status(429).json({
        error: quota.reason === 'anonymous' ? 'Deep Reveals require a free account' : 'Daily Deep Reveal limit reached',
        quotaRemaining: 0,
      });
    }
    deepReveal = deepRevealData;
    quotaRemaining = quota.quotaRemaining ?? null;
  }

  res.json({ oneLiner, patternTag, deepReveal, quotaRemaining });
});

// ── Puzzle endpoints (T035-T037) ───────────────────────────────────────────────

function userCanAccessCategory(user, categoryId) {
  if (!PAID_CATEGORIES.has(categoryId)) return true;
  return user?.tier === 'paid';
}

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

// GET /api/puzzles/:id — return full puzzle data for solving
app.get('/api/puzzles/:id', async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: 'invalid puzzle id' });

  if (!supabase) return res.status(503).json({ error: 'database unavailable' });

  const { data: puzzle, error } = await supabase
    .from('puzzles')
    .select('id, category, move_string, goal_prompt, goal_predicate_type, goal_predicate_params, cooperative_ai_moves, difficulty, interaction_mode, highlight_metadata, correct_col')
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
      supabase.from('blunders').insert({
        user_id: req.user.id,
        puzzle_id: puzzleId,
        board_state: puzzle.move_string,
        move_played: candidateCol,
        correct_move: evaluation.correctCol ?? candidateCol,
        pattern_category: puzzle.category,
      }).then(() => {}).catch(err => console.error('[blunder]', err.message));
    }
  }

  res.json({
    result: evaluation.result,
    correctCol: evaluation.correctCol ?? null,
    tiedWith: evaluation.tiedWith ?? null,
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
app.get('/api/coach/queue', requirePaid, async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'database unavailable' });

  const { data: blunders, error } = await supabase
    .from('blunders')
    .select('id, puzzle_id, pattern_category, created_at, puzzles(move_string, goal_prompt, category)')
    .eq('user_id', req.user.id)
    .is('resolved_at', null)
    .order('created_at', { ascending: true })
    .limit(50);

  if (error) return res.status(500).json({ error: error.message });

  const queueCount = blunders?.length ?? 0;
  const nextPuzzle = blunders?.[0] ? {
    blunderId: blunders[0].id,
    puzzleId: blunders[0].puzzle_id,
    category: blunders[0].pattern_category,
    moveString: blunders[0].puzzles?.move_string,
    goalPrompt: blunders[0].puzzles?.goal_prompt,
  } : null;

  res.json({ queueCount, puzzle: nextPuzzle });
});

// POST /api/coach/queue/:blunderId/resolve
app.post('/api/coach/queue/:blunderId/resolve', requirePaid, async (req, res) => {
  const blunderId = parseInt(req.params.blunderId, 10);
  if (isNaN(blunderId)) return res.status(400).json({ error: 'invalid blunder id' });
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
    .select('id, category, move_string, status, highlight_metadata, correct_col')
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
