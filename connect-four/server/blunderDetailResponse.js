// Pure functions backing GET /api/blunders/:id's response shape.
// Extracted (spec 042, T003) so the response shape can be unit-tested without
// booting the full Express app / solver process — see testing-conventions.md's
// "Pure Function Extraction Pattern".

import {
  Board,
  detectImmediateThreat,
  detectDoubleThreat,
  detectFigure7,
  detectJShape,
  detectMajorThreatParity,
  detectMajorThreatNonParity,
  detectMinorThreat,
} from './classifier.js';

/**
 * Parses a detector's 1-indexed "cXrY" cell string into a 0-indexed {col, row}
 * object, matching threat_cells's shape. Authored once here (spec 042, T052) —
 * did not exist anywhere in the repo before.
 * @param {string} cellStr - e.g. "c1r4"
 * @returns {{col: number, row: number}}
 */
export function parseCxRy(cellStr) {
  const m = /^c(\d+)r(\d+)$/.exec(cellStr);
  if (!m) throw new Error(`parseCxRy: malformed cell string "${cellStr}"`);
  return { col: Number(m[1]) - 1, row: Number(m[2]) - 1 };
}

/**
 * Spec 042 US6, Decision 3 — generic pattern-agnostic patternCells dispatch.
 *
 * Tag -> board-state/perspective table (T049A audit). classifier.js:1536's
 * tag->detector map has 13 entries; this table only lists tags whose detector
 * can (a) run without a solver call (patternCells is a pure in-request
 * computation — no solver call, per contracts/api-blunders-id.md §4) and
 * (b) structurally ever populates a non-empty `cells` array:
 *
 *   immediate_threat        -> Board(board_state) [PRE-move], blunderer.
 *                               Phantom-cell trap (project memory
 *                               project_reason_immediate_threat_phantom):
 *                               must NOT use board_state + correct_move, or
 *                               the detector reports a phantom win one row up.
 *   double_threat            -> Board(board_state + correct_move), blunderer.
 *                               Verified T049 (contracts/api-blunders-id.md §4,
 *                               mirrors classifier.js:1703's own call).
 *   figure_7                 -> Board(board_state + correct_move), blunderer.
 *                               Same "missed-creating-a-fork" family as
 *                               double_threat (classifier.js:1703
 *                               MISSED_OWN_PRIORITY + isUndercutFigure7 guard;
 *                               classifier.js:937).
 *   j_shape                  -> Board(board_state + correct_move), blunderer.
 *                               Same fork-shaped family (kernel-based,
 *                               classifier.js:973); also in MISSED_OWN_PRIORITY.
 *   major_threat_parity      -> Board(board_state + correct_move), blunderer.
 *                               Spatial-only (no scores param); in
 *                               MISSED_OWN_PRIORITY alongside double_threat.
 *   major_threat_nonparity   -> Board(board_state + correct_move), blunderer.
 *                               Same as above.
 *   minor_threat              -> Board(board_state + correct_move), blunderer.
 *                               Same as above.
 *
 * Tags recorded "empty/absent by design" (T049A) — NOT in the map below, no
 * special-casing needed, they simply fall through to an empty result:
 *   forced_block, forbidden_columns, z_threat, odd_even_threat, claimeven,
 *   forced_win — every one of these detectors is structurally incapable of
 *   returning a non-empty `cells` array (they always `return { ..., cells: [] }`
 *   regardless of input; z_threat/claimeven carry their spatial info in
 *   `highlightMetadata`/`categoryEvidence` instead).
 *   undercut, overcut — DO have a cells-populating code path, but only when
 *   passed solver-computed `scores`; patternCells makes no solver call, and
 *   both detectors short-circuit to `matched:false` when `scores` is falsy
 *   (`classifier.js:816`/`:861`), so they degrade gracefully to empty rather
 *   than needing a special case.
 */
const PATTERN_TAG_TO_DETECTOR = {
  immediate_threat: {
    boardInput: (data) => ({
      board: new Board(data.board_state || ''),
      perspective: new Board(data.board_state || '').currentPlayer,
    }),
    detect: detectImmediateThreat,
  },
  double_threat: {
    boardInput: (data) => {
      const blunderer = new Board(data.board_state || '').currentPlayer;
      return {
        board: new Board((data.board_state || '') + String(data.correct_move)),
        perspective: blunderer,
      };
    },
    detect: detectDoubleThreat,
  },
  figure_7: {
    boardInput: (data) => {
      const blunderer = new Board(data.board_state || '').currentPlayer;
      return {
        board: new Board((data.board_state || '') + String(data.correct_move)),
        perspective: blunderer,
      };
    },
    detect: (board, perspective) => detectFigure7(board, null, perspective),
  },
  j_shape: {
    boardInput: (data) => {
      const blunderer = new Board(data.board_state || '').currentPlayer;
      return {
        board: new Board((data.board_state || '') + String(data.correct_move)),
        perspective: blunderer,
      };
    },
    detect: (board, perspective) => detectJShape(board, null, perspective),
  },
  major_threat_parity: {
    boardInput: (data) => {
      const blunderer = new Board(data.board_state || '').currentPlayer;
      return {
        board: new Board((data.board_state || '') + String(data.correct_move)),
        perspective: blunderer,
      };
    },
    detect: detectMajorThreatParity,
  },
  major_threat_nonparity: {
    boardInput: (data) => {
      const blunderer = new Board(data.board_state || '').currentPlayer;
      return {
        board: new Board((data.board_state || '') + String(data.correct_move)),
        perspective: blunderer,
      };
    },
    detect: detectMajorThreatNonParity,
  },
  minor_threat: {
    boardInput: (data) => {
      const blunderer = new Board(data.board_state || '').currentPlayer;
      return {
        board: new Board((data.board_state || '') + String(data.correct_move)),
        perspective: blunderer,
      };
    },
    detect: detectMinorThreat,
  },
};

/**
 * Spec 042 US6 (FR-020, SC-008, Decision 3): generic pattern-agnostic
 * patternCells computation, shared by BOTH independent blunder-response
 * builders (`GET /api/blunders/:id` and the list/enriched-map builder at
 * `index.js`'s `~line 2565`) so highlighting doesn't silently work only for
 * cold-boot permalinks (T052A). Pure/in-process — no DB query, no solver call.
 * @param {object} data - raw `blunders` row (needs board_state, correct_move,
 *   pattern_category).
 * @returns {{col: number, row: number}[]} empty array when unmapped, the
 *   detector doesn't match, or it legitimately returns no cells.
 */
export function computePatternCells(data) {
  const entry = PATTERN_TAG_TO_DETECTOR[data?.pattern_category];
  if (!entry) return [];
  try {
    const { board, perspective } = entry.boardInput(data);
    const result = entry.detect(board, perspective);
    if (!result?.matched || !Array.isArray(result.cells) || result.cells.length === 0) return [];
    return result.cells.map(parseCxRy);
  } catch {
    return [];
  }
}

/**
 * Compute opponent major threat cells after a move is played.
 * Hoisted from coach/queue so the blunder permalink endpoint can share it.
 * @param {string} board_state - move string before the move
 * @param {number} move_played - 0-indexed column played
 * @returns {{col: number, row: number}[]}
 */
export function computeThreatCells(board_state, move_played) {
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

/**
 * Build the public response shape for GET /api/blunders/:id from a raw
 * `blunders` row and the requesting user's id (or null/undefined for anon).
 *
 * Spec 042 US1 (FR-001/FR-002/FR-003): both `quality: 'blunder'` and
 * `quality: 'suboptimal'` rows MUST carry the identical set of fields needed
 * to render "Start new game from here", "What should I have played?", and
 * "Mark as reviewed" — severity only changes a label/color, never which
 * fields are present.
 *
 * @param {object} data - raw row from the `blunders` table (includes user_id;
 *   this function strips it before returning).
 * @param {string|null|undefined} reqUserId - `req.user?.id`, or null/undefined
 *   for anonymous requests.
 * @param {object} [context] - spec 042 US2 (FR-008/FR-009): parent-game/sibling
 *   context composed by `fetchBlunderDetailContext` (queries run in the caller;
 *   this function only shapes the already-fetched results). Both fields default
 *   so callers that don't have this context yet (or list-variant callers that
 *   choose not to pass it) keep a stable, always-present field set.
 * @param {number|null} [context.totalMoves] - parent game's total ply count.
 * @param {{id: string, moveIndex: number, quality: string, resolved_at: string|null}[]} [context.siblingMistakes]
 *   - every mistake sharing this row's parent game, ordered by moveIndex ascending.
 * @returns {object} public response body (never contains user_id)
 */
export function buildBlunderDetailResponse(data, reqUserId, context = {}) {
  // FR-003: ownership is unknown-but-treated-as-owner everywhere except an
  // explicit non-owner determination — is_owner is only ever `true` or
  // `false` (never omitted), and the frontend gate is `is_owner !== false`.
  const is_owner = reqUserId != null && reqUserId === data.user_id;

  const moveIndex = (data.board_state || '').length;
  const threat_cells = computeThreatCells(data.board_state, data.move_played);
  const patternCells = computePatternCells(data);
  const { totalMoves = null, siblingMistakes = [] } = context;

  // Strip user_id — must never be exposed to clients.
  const { user_id: _omit, ...blunderPublic } = data;

  return { ...blunderPublic, moveIndex, threat_cells, patternCells, is_owner, totalMoves, siblingMistakes };
}

/**
 * Compose the parent-game/sibling context for GET /api/blunders/:id (spec 042
 * US2, T013/T014, contracts/api-blunders-id.md steps 2-3).
 *
 * Runs two indexed, bounded Supabase reads (parent-game row by primary key,
 * sibling `blunders` rows by FK — no solver call, no full-table scan) and
 * shapes their results. Takes the already-fetched blunder `data` row (must
 * include `id`, `game_id`, `papergames_game_id`) plus a Supabase client, so it
 * can be exercised with a mock-stubbed client in tests without booting the
 * full Express app.
 *
 * @param {object} supabase - Supabase client (or a mock with a matching
 *   `.from(table).select(cols).eq(col, val).single()` /
 *   `.from(table).select(cols).eq(col, val).order(col, opts)` chain shape).
 * @param {object} data - the already-fetched `blunders` row.
 * @returns {Promise<{totalMoves: number|null, siblingMistakes: object[]}>}
 */
export async function fetchBlunderDetailContext(supabase, data) {
  const parentTable = data.game_id ? 'games' : (data.papergames_game_id ? 'papergames_games' : null);
  const parentId = data.game_id ?? data.papergames_game_id ?? null;

  let totalMoves = null;
  if (parentTable && parentId) {
    const { data: parentRow } = await supabase
      .from(parentTable)
      .select('moves')
      .eq('id', parentId)
      .single();
    totalMoves = parentRow?.moves?.length ?? null;
  }

  let siblingMistakes = [];
  if (parentId) {
    const siblingCol = data.game_id ? 'game_id' : 'papergames_game_id';
    // FR-017 precedent (no user_id filter — public-permalink contract): a
    // permalink visitor sees the same sibling set the owner would.
    const { data: siblings } = await supabase
      .from('blunders')
      .select('id, move_index, quality, resolved_at')
      .eq(siblingCol, parentId)
      .order('move_index', { ascending: true });
    // De-dup by move_index: migration 041 deliberately allows duplicate rows to exist
    // for the same (user_id, game_id, move_index) for AI-sparring games (no unique index
    // there until migration 054 — see that file's header for why), so more than one row
    // can legitimately be present for the same ply (e.g. a double-fired analyze request).
    // A permalink's "X of Y" must count distinct MISTAKES (plies), not raw rows, or the
    // position/count is inflated and wrong (found via spec-042 QA, 2026-07-09).
    // The row being viewed (data.id) must never be the one dropped by dedup, even
    // when it's the "later" duplicate for its move_index — otherwise the current
    // permalink's own id could vanish from its own sibling list.
    const ordered = (siblings ?? []).slice().sort((a, b) => {
      if (a.id === data.id) return -1;
      if (b.id === data.id) return 1;
      return 0;
    });
    const seenMoveIndex = new Set();
    siblingMistakes = ordered
      .filter(s => {
        if (seenMoveIndex.has(s.move_index)) return false;
        seenMoveIndex.add(s.move_index);
        return true;
      })
      .sort((a, b) => a.move_index - b.move_index)
      .map(s => ({
        id: s.id,
        moveIndex: s.move_index,
        quality: s.quality,
        resolved_at: s.resolved_at,
      }));
  }

  return { totalMoves, siblingMistakes };
}
