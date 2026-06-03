# Data Model Conventions

## Primary Keys

**MUST**: Use `uuid PRIMARY KEY DEFAULT gen_random_uuid()` for all domain tables.
Rationale: UUIDs are safe to expose in URLs and APIs; auto-increment integers leak row counts.

Exception: `tracks` uses `bigserial` because it is append-only and never referenced by client-facing URLs.

## Column Naming

**MUST**: Use `snake_case` for all column names.
**MUST**: Timestamp columns are named `created_at`, `updated_at`, `reviewed_at`, or `resolved_at` (whichever applies). All are `timestamptz NOT NULL`.
**MUST**: Boolean flags follow the pattern `is_<adjective>` (e.g., `is_active`).

## Category Representation

**MUST**: Categories are stored as `text` slugs, not integers (first established by migration 011, which replaced integer category columns; extended to the current 11 slugs by migration 015).
Valid slugs: `immediate_threat`, `forced_block`, `double_threat`, `forced_win`, `forbidden_columns`, `z_threat`, `claimeven`, `undercut`, `overcut`, `figure_7`, `j_shape`.
Migration 027 added `'unknown'` as a valid slug in the `blunders_pattern_category_check` constraint. `'unknown'` is used when the post-game review classifier returns no pattern. The full valid set for the `blunders` table is:
`'immediate_threat'`, `'forced_block'`, `'double_threat'`, `'forced_win'`, `'forbidden_columns'`, `'z_threat'`, `'claimeven'`, `'undercut'`, `'overcut'`, `'figure_7'`, `'j_shape'`, `'unknown'`.

Migration 028 added `severity INTEGER NOT NULL DEFAULT 0` to the `blunders` table. Value is `round((best_score − score) / 36 * 10)`, normalized to [0, 10]: 36 is the maximum possible spread on a 7×6 board (from +18 to −18), and the result is scaled to 10. Computed at insert time from the solver scores that are already in scope. Legacy rows default to 0. Never recompute on read — the solver may be unavailable for positions past a winning move. An index on `(user_id, severity DESC) WHERE resolved_at IS NULL` supports the queue endpoint's `ORDER BY severity DESC` without a full table scan.

Migration 029 added `blunder_severity real` — a graduated loss-of-control measure: the fraction of depth-3 post-blunder continuations where the opponent wins (0–1 range). Unlike `severity` (instant score spread), `blunder_severity` captures how much the move *actually* increases losing scenarios vs winning scenarios. This is the primary quality gate for blunders from already-losing positions (i.e., virtually all second-player moves), replacing the former `bestScore < 0` skip. See [[blunder_severity_graduated_measure]].

Migration 030 added a partial unique index `idx_blunders_game_unique` on `(user_id, board_state, move_played) WHERE puzzle_id IS NULL`, enabling atomic upsert deduplication of game blunders at the DB level. The `POST /api/blunders` endpoint now uses `.upsert()` with `ignoreDuplicates: true` instead of a check-then-insert pattern.
Rationale: Slug-keyed constraints are self-documenting; integer IDs required cross-referencing a lookup table.

## Soft Delete

**MUST**: Use `is_active boolean NOT NULL DEFAULT true` on `puzzles` for soft delete.
**MUST NOT**: Use a `deleted_at` timestamp column — `is_active` is the sole soft-delete signal.
Rationale: Puzzle deactivation must remain reversible; a boolean is simpler to query than a nullable timestamp.

## jsonb vs Normalized Columns

**MUST** use `jsonb` for: solver scores per candidate (`solver_scores`), classifier tag lists (`classifier_tags`), goal predicate parameters (`goal_predicate_params`), highlight metadata (`highlight_metadata`), category evidence (`category_evidence`), simulation trace (`simulation_trace`), analytics event data (`event_data`), Stripe webhook payloads (`payload`), and explanation cache content (`deep_reveal_json`).
**MUST** use typed columns for: all scalar values (enums, integers, booleans, timestamps).
Rationale: jsonb for variable-shape structured data; typed columns for values used in queries/indexes.

## Foreign Keys

**MUST**: Declare `ON DELETE CASCADE` when the child row has no meaning without the parent (e.g., `users.id → auth.users(id)`).
**MUST**: Declare `ON DELETE SET NULL` when the child row should be retained without the parent (e.g., `puzzle_attempts.user_id → users(id)`).
**MUST NOT**: Leave FK behavior implicit.

## RLS Policy Structure

Two access tiers:

**Backend-only tables** (`tracks`, `stripe_events`, `explanation_cache`, `puzzles`, `candidates`, `false_positive_records`, `blunders`):
- Enable RLS.
- Define **no** public policies.
- The Express server accesses these exclusively via the service role key, which bypasses RLS.

**User-facing tables** (`users`, `puzzle_attempts`, `session_stats`):
- Enable RLS.
- Define policies scoped to `auth.uid() = user_id` or `auth.uid() = id`.
- Must also have explicit `GRANT` statements (see below).

## Explicit Grants

**MUST**: Any table accessed by the frontend (anon or authenticated PostgREST role) requires an explicit `GRANT` after the RLS policies. Use the pattern from migration 012:
```sql
GRANT SELECT, INSERT, UPDATE ON public.<table> TO authenticated;
```
Or for tables also read by anon:
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.<table> TO anon, authenticated;
```
Rationale: Supabase enforces explicit grants for all projects (deadline Oct 30 2026); PostgREST returns `42501` without them.

## Migration Naming

**MUST**: Use sequential 3-digit numeric prefix: `NNN_slug.sql` (e.g., `015_new_puzzle_categories.sql`).
**MUST**: Each migration file begins with a comment block: migration number, description, and `-- HUMAN REVIEW REQUIRED before applying to production.`
**MUST NOT**: Skip numbers in the sequence.

## Games (`games`)

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK, `DEFAULT gen_random_uuid()` |
| `user_id` | `uuid` | nullable FK → `auth.users(id)`, `ON DELETE SET NULL` |
| `device_uuid` | `text` | NOT NULL |
| `moves` | `text` | NOT NULL, 0-indexed movestring `[0-6]*` |
| `difficulty` | `text` | NOT NULL, CHECK IN ('easy','medium','hard','perfect') |
| `side` | `text` | NOT NULL, CHECK IN ('first','second') |
| `result` | `text` | NOT NULL, CHECK IN ('win','loss','draw') |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` |

Index: `(device_uuid, created_at DESC)` for per-device game listing (Epic 3b).
RLS: Disabled (server accesses via service-role key).
Grants: `GRANT SELECT, INSERT ON public.games TO anon, authenticated;`

## GameAnalysis (ephemeral — not persisted)

`GameAnalysis` is computed on demand by `POST /api/games/analyze` and never stored. Shape:

| Field | Type | Description |
|---|---|---|
| `moves` | `AnalyzedMove[]` | Per-user-ply quality breakdown (see below) |
| `accuracy` | `number` | % of scored plies that were optimal |
| `optimalCount` | `number` | Count of optimal plies |
| `suboptimalCount` | `number` | Count of suboptimal plies |
| `blunderCount` | `number` | Count of blunder plies |
| `scored` | `number` | Plies counted toward accuracy (forced plies excluded) |
| `summaryPhraseKey` | `string` | i18n key for the overall quality phrase |
| `fullMovestring` | `string` | Complete movestring from the game row |
| `difficulty` | `string` | Difficulty from the game row |
| `side` | `'first' \| 'second'` | Side from the game row |

### AnalyzedMove

| Field | Type | Description |
|---|---|---|
| `moveIndex` | `number` | 1-based index into the full movestring |
| `col` | `number` | 0-indexed column played |
| `quality` | `'optimal' \| 'suboptimal' \| 'blunder'` | Quality label |
| `score` | `number` | Solver score for the played column |
| `bestScore` | `number` | Best available solver score at that ply |
| `bestCol` | `number` | 0-indexed column with the best score |
| `patternTag` | `string \| null` | Classifier slug, or `null` if no pattern matched |
| `blunderSeverity` | `number \| null` | Tree-scan fraction (0–1), computed for all blunders since 2026-06-03 |

Forced moves (only 1 legal column) are included in `moves` with a quality label but excluded from `scored`.

## Navigation Params Contracts (screen-to-screen)

Screen navigation passes typed param objects via the screen registry. Contracts for screens introduced in Epic 3b:

| Screen key | Params | Source |
|---|---|---|
| `review` | `{ id: string }` — the `gameId` | `GameScreen.saveGame` after game ends |
| `explorer` | `{ gameId: string, moveIndex: number, moves: string, difficulty: string, side: string, fullMovestring: string }` | `ReviewScreen` on "Explore from here" |
| `game` | `{ initialMoves?: string, side?: string, difficulty?: string }` (additions) | `ExplorerScreen` on "Start from here"; original params (`difficulty`, `side`) remain supported |

`initialMoves` on the `game` screen is the truncated movestring returned by `POST /api/games/from-position`. The `game` screen passes it to `useGameBoard` as `initialMoves` to pre-seed the board state before the AI/player moves begin.

## Interaction Mode

**MUST**: `puzzles.interaction_mode` is `'single_move'` or `'sequence'`. Currently, `forced_win` is the only `sequence`-mode category. All others are `single_move`.

## Correct Column Storage

`puzzles.correct_col` and `candidates.correct_col` store the 0-indexed correct column for categories where it is computed at generation time (`claimeven`, `figure_7`, `j_shape`).
`z_threat` and `undercut`/`overcut` store their answer inside `highlight_metadata` (column or cells array with role annotations).
