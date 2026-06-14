# Data Model: Post-Game Review & Position Explorer (Epic 3b)

## Existing Tables (read-only this epic)

### `games`
Populated by Epic 3a (`POST /api/games`). Read by `POST /api/games/analyze`.
- `id uuid PK`
- `user_id uuid nullable` — Supabase auth user
- `device_uuid text NOT NULL`
- `moves text NOT NULL` — 0-indexed movestring
- `difficulty text NOT NULL` — `easy|medium|hard|perfect`
- `side text NOT NULL` — `first|second`
- `result text NOT NULL` — `win|loss|draw`
- `created_at timestamptz`

### `blunders` (existing, constraint migration required)
Written by `POST /api/puzzles/:id/check` today; this epic adds a new write path from game analysis.
- `id uuid PK`
- `user_id uuid NOT NULL` — auth required; anonymous users do not write blunders
- `puzzle_id uuid nullable` — `null` for game-sourced blunders
- `board_state text NOT NULL` — movestring before the blunder move (position context)
- `move_played integer NOT NULL` — 0-indexed column the user played (the blunder)
- `correct_move integer NOT NULL` — 0-indexed column of best move (`bestCol` from scorer)
- `pattern_category text NOT NULL CHECK (...)` — valid slug or `'unknown'` sentinel

**Constraint change required** (migration 027):
```sql
ALTER TABLE public.blunders DROP CONSTRAINT IF EXISTS blunders_pattern_category_check;
ALTER TABLE public.blunders ADD CONSTRAINT blunders_pattern_category_check
  CHECK (pattern_category IN (
    'immediate_threat','forced_block','double_threat','forced_win','forbidden_columns',
    'z_threat','claimeven','undercut','overcut','figure_7','j_shape','unknown'
  ));
```

### `explanation_cache` (existing, no changes)
- `position_hash text PK` — `SHA256(movestring + ":" + col)`
- `one_liner text`
- `deep_reveal_json jsonb` — `{ explanation, bestLine }`

### `llm_feedback` (existing, no changes)
Used by FR-023 flag write.

---

## Ephemeral Entities (not persisted)

### `GameAnalysis`
Returned by `POST /api/games/analyze`. Not stored — computed on demand.

```ts
interface GameAnalysis {
  moves: AnalyzedMove[];       // only user plies, ordered
  accuracy: number;            // optimalCount / scored * 100; 0 if scored===0
  optimalCount: number;
  suboptimalCount: number;
  blunderCount: number;
  scored: number;              // user moves that were NOT forced (accuracy denominator)
  summaryPhraseKey: string;    // e.g. "coach.sparring.review.clean.0"
  fullMovestring: string;      // complete game movestring for frozen board rendering
  difficulty: string;          // 'easy'|'medium'|'hard'|'perfect' — from games table
  side: 'first' | 'second';   // from games table — needed for Explorer navigation
}
```

### `AnalyzedMove`
One entry in `GameAnalysis.moves`.

```ts
interface AnalyzedMove {
  moveIndex: number;           // 1-based user-move ordinal (1 = user's first move)
  col: number;                 // 0-indexed column played
  quality: 'optimal' | 'suboptimal' | 'blunder';
  score: number;               // solver score for the played column
  bestScore: number;           // solver score for the best column
  bestCol: number;             // 0-indexed column with highest solver score
  patternTag: string | null;   // classifier slug or null
}
```

### `ExplorerState` (client-only)
Tracks the Explorer's UI state. Never sent to server.

```ts
interface ExplorerState {
  // Pre-populated from Review screen navigation params:
  gameId: string;
  moves: AnalyzedMove[];       // full analysis result from review screen
  difficulty: string;
  side: 'first' | 'second';
  
  // Explorer runtime:
  selectedMistakeIndex: number; // index into mistakeIndices[]
  mistakeIndices: number[];     // moveIndex values for non-optimal nodes, in order
  
  // Board state (owned by useGameBoard hook):
  rewindedMoves: string;       // movestring at the mistake position (before FR-014 move)
  
  // Deep Reveal:
  deepRevealOpen: boolean;
  deepRevealExplanation: string | null;
  deepRevealBestLine: string[];
  deepRevealCached: boolean;
  deepRevealLoading: boolean;
}
```

---

## Navigation Params Contract

### `review` screen params (received from `game` screen)
```ts
{ id: string }  // gameId from POST /api/games response
```

### `explorer` screen params (received from `review` screen)
```ts
{
  gameId: string;
  moveIndex: number;       // 1-based user-move ordinal of the selected mistake
  moves: AnalyzedMove[];   // full analysis array
  difficulty: string;
  side: 'first' | 'second';
  fullMovestring: string;  // complete game movestring — needed for rewound board computation
}
```

### `game` screen params (received from `explorer` via from-position)
```ts
{
  // No gameId — POST /api/games/from-position does NOT insert a row.
  // GameScreen.saveGame will call POST /api/games when the new game ends.
  initialMoves: string;  // first N chars of original movestring (starting position)
  side: 'first' | 'second';
  difficulty: string;
}
```
