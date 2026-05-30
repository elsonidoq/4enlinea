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

## Interaction Mode

**MUST**: `puzzles.interaction_mode` is `'single_move'` or `'sequence'`. Currently, `forced_win` is the only `sequence`-mode category. All others are `single_move`.

## Correct Column Storage

`puzzles.correct_col` and `candidates.correct_col` store the 0-indexed correct column for categories where it is computed at generation time (`claimeven`, `figure_7`, `j_shape`).
`z_threat` and `undercut`/`overcut` store their answer inside `highlight_metadata` (column or cells array with role annotations).
