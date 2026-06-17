# Implementation Plan: Review & Blunder Sharing

**Branch**: `stagging` | **Date**: 2026-06-17 | **Spec**: `specs/037-review-blunder-sharing/spec.md`

## Summary

Three improvements to game-review and blunder surfaces: (1) persistent player-color chip on every review screen, (2) sort-by-usefulness control on the past-games list, (3) shareable blunder permalinks with read-only view for non-owners. No new DB schema — all data already exists. Key work: new `GET /api/blunders/:id` endpoint, OG meta injection, `urlMapping.js` refactor, and `MistakeDetailScreen` cold-boot path.

## Technical Context

**Language/Version**: Node.js 20 (server), React 18 (frontend)
**Primary Dependencies**: Express 5, Supabase JS client, React, Vite
**Storage**: Supabase (PostgreSQL). No schema changes.
**Testing**: `npm run test:fast` (inside `connect-four/`). Server helpers extracted and tested with `node --test`.
**Target Platform**: Railway (server), Vite SPA (frontend)
**Project Type**: Web service + SPA
**Performance Goals**: `GET /api/blunders/:id` — simple single-row DB fetch, well under 200ms.
**Constraints**: `GET /api/blunders/:id` must not expose `user_id`; `is_owner` derived server-side. OG injection must not fail-open (must still serve `index.html` on error, with noindex tag).
**Scale/Scope**: Touches 1 server file (`index.js`), 1 routing file (`urlMapping.js`), 5 screen files, 1 architecture doc.

## Constitution Check

**Principle I — Explanation Engine**: Not touched. Blunder data is read-only display; no new evaluation paths.

**Principle II — Code Quality**: 
- [x] No new abstractions. `PlayerColorChip` is an inline component, not a separate file.
- [x] Cold-boot path uses fetch-on-missing-props, the established pattern (see `clchallenge` screen).
- [x] Sort comparators are simple expressions, not extracted utilities.

**Principle III — Testing**:
- [x] No solver-dependent features. Manual golden-path verification required for the cold-boot path, sort picker, and read-only blunder view (per constitution §III: "UI features MUST be manually verified").
- [x] `GET /api/blunders/:id` UUID validation and 404 behavior can be tested with `node --test`.

**Principle IV — UX Consistency**:
- [x] Color chip uses "Green" and "Gray" terminology matching existing disc color terminology.
- [x] Deep Reveal "Sign in to unlock" prompt is consistent with the existing AuthModal / paid-tier gate patterns (locked content renders a prompt, not silence).

**Principle V — Performance**:
- [x] `GET /api/blunders/:id` is a single-row DB fetch — no solver calls, well under 200ms.
- [x] Cold-boot fetch shows a loading indicator within 200ms (spinner from mount).

**Principle VI — Methodology**:
- [x] All `go('blunderDetail', ...)` call sites audited: 3 found (MistakesListScreen:205, ReviewScreen:120, ReviewScreen:314). All updated atomically with URL_MAP change.
- [x] `side` field traced: selected in DB query, not forwarded to unified object. Fix is one-line per game type.

**Principle VII — Design Philosophy**:
- [x] Explicit: `is_owner` boolean returned instead of requiring client to compare UUIDs.
- [x] Simple: sort in JS on the merged array — mirrors existing date sort, no new infrastructure.

**Principle VIII — Documentation**:
- [x] `docs/architecture/api-conventions.md` must be updated: add `GET /api/blunders/:id` contract and updated `GET /api/games` sort/side entries.
- [x] `docs/architecture/frontend-conventions.md` must be updated: SESSION_ONLY_SCREENS change and blunderDetail cold-boot pattern.
- [x] Design artifacts: `research.md`, `data-model.md`, `contracts/` — created in this plan phase.

## Project Structure

### Documentation (this feature)

```text
specs/037-review-blunder-sharing/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── contracts/
│   ├── api-blunders-id.md   ← GET /api/blunders/:id contract
│   └── api-games-sort.md    ← sort param + side field addendum
└── tasks.md             ← Phase 2 output (speckit-tasks)
```

### Source Code (files touched)

```text
connect-four/server/
└── index.js                         # GET /api/games (side + sort), GET /api/blunders/:id, OG injection

connect-four/src/lib/
└── urlMapping.js                    # /blunder/:id paramNames, SESSION_ONLY_SCREENS

connect-four/src/screens/
├── ReviewScreen.jsx                  # PlayerColorChip, go('blunderDetail') call sites
├── ExplorerScreen.jsx                # PlayerColorChip
├── MistakesListScreen.jsx            # color chip per blunder item, go('blunderDetail') call site
├── MistakeDetailScreen.jsx           # cold-boot path, is_owner gates, color chip restyle
└── PastGamesListScreen.jsx           # sort picker UI

docs/architecture/
├── api-conventions.md               # add blunders endpoint + games sort/side
└── frontend-conventions.md          # SESSION_ONLY_SCREENS change, blunderDetail cold-boot pattern
```

---

## Phase 0: Research

All decisions resolved from spec + codebase audit. See `research.md` for full decision log.

Key findings:
- `side` is already selected in both `GET /api/games` DB queries but not forwarded to the unified object — trivial fix.
- Three existing `go('blunderDetail', ...)` call sites, all in React screen files. All have the blunder object available for `.id`.
- `MistakeDetailScreen` already has inline "You played: **green/gray**" text (lines 229–232); FR-005 is a restyle of this existing element into a persistent chip.
- OG injection block structure is already established for `/game/:id`; `/blunder/:id` mirrors it.

---

## Phase 1: Implementation Phases

### Story 1: Player-Color Chip (FR-001 through FR-006)

**Server change (FR-001)**:
`GET /api/games` unified shape already selects `side` from both tables. Add `side: g.side ?? null` to the AI game push and `side: g.side ?? null` to the papergames push.

**Frontend changes**:

**FR-002 — ReviewScreen**: Add `PlayerColorChip` inline component. Display after `<CoachDialog>` or in the `<TopBar>` meta area. The chip reads `analysis?.side`: `'first'` → "You played Green", `'second'` → "You played Gray". Render only when `analysis` is set (not during loading/error states).

**FR-003 — ExplorerScreen**: Same chip. `side` prop is already passed to `ExplorerScreen`. Place in the header area (below `<TopBar>`, above the board section).

**FR-004 — MistakesListScreen**: Per-blunder-item chip derived from `blunder.board_state.length % 2 === 0 ? 'Green' : 'Gray'`. Place in the blunder card, same visual weight as the pattern tag.

**FR-005 — MistakeDetailScreen**: The existing inline text `<>You played: <strong>{userColor}</strong></>` (line 229–232 of current implementation) is already correct logic. Restyle it into a persistent pill/chip matching FR-002 visual treatment. No logic change.

**FR-006**: Use "Green" and "Gray" string literals, not "Player 1"/"Player 2".

**Chip visual spec**: Inline `<span>` or `<div>` with rounded pill shape, small disc dot in the appropriate color (`var(--disc-green)` or gray equivalent), label "You played Green" / "You played Gray". Matches light-theme token system (`--ink`, `--card` background).

---

### Story 2: Sort Past Games (FR-007 through FR-016)

**Server changes (FR-007 through FR-013)**:

1. After existing query param validation in `GET /api/games`, add:
```js
const VALID_SORTS = new Set(['recent', 'played_well', 'worst_blunders']);
let sortBy = 'recent';
if (req.query.sort !== undefined) {
  if (!VALID_SORTS.has(req.query.sort)) {
    return res.status(400).json({ error: 'invalid sort' });
  }
  sortBy = req.query.sort;
}
```

2. Replace the existing single-line sort:
```js
// Before:
unified.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

// After:
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
```

**Frontend changes (FR-014 through FR-016)**:

In `PastGamesListScreen`:
1. Add `const [sort, setSort] = useState('recent');` (resets on mount per FR-016 — no localStorage).
2. Add sort picker UI: three buttons/chips labelled "Recent", "Played Well", "Worst Blunders". Place above the existing outcome filter row.
3. Update `fetchGames` signature to accept `sort` parameter. Add `params.set('sort', sort)` (skip if `sort === 'recent'` to be tidy, or always set it — both are valid since `recent` is the default).
4. Update the `useEffect` that calls `fetchGames` to include `sort` in dependencies.
5. `handleSortChange(key)`: set sort state, reset offset to 0, trigger fresh fetch.

---

### Story 3: Blunder Permalinks (FR-017 through FR-029)

**Ordering constraint: server endpoint must land before frontend cold-boot is wired.**

#### Step 3a: Server — GET /api/blunders/:id (FR-017 through FR-020, FR-029)

Registration position: before the `app.get('/{*path}', ...)` catch-all (and before `app.use(express.static(...))`). Follows api-conventions.md route ordering rules (literals before params).

```js
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

app.get('/api/blunders/:id', async (req, res) => {
  const { id } = req.params;
  if (!UUID_REGEX.test(id)) return res.status(400).json({ error: 'invalid id' });
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });

  try {
    const { data, error } = await supabase
      .from('blunders')
      .select('id, board_state, move_played, correct_move, pattern_category, created_at, resolved_at, severity, blunder_severity, game_id, moveIndex, threat_cells, user_id')
      .eq('id', id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'not found' });

    const is_owner = req.user?.id != null && req.user.id === data.user_id;

    // Compute threat_cells server-side (same as GET /api/coach/queue)
    // threat_cells may already be stored; if not, compute from board_state
    const threatCells = data.threat_cells ?? [];

    const { user_id: _omit, ...blunderPublic } = data;
    res.json({ ...blunderPublic, threat_cells: threatCells, is_owner });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

Note: `threat_cells` handling — if already stored in DB (as with `POST /api/coach/queue`), use stored value. If null, compute via `Board.majorThreatCells()`. Audit the existing blunders table to confirm whether `threat_cells` is a stored column. If it's not stored, compute it using the same logic as `GET /api/coach/queue`.

#### Step 3b: Server — OG meta injection (FR-021, FR-022)

In the `app.get('/{*path}', ...)` catch-all handler, add a blunder match block immediately after the existing `gameMatch` block:

```js
// FR-014 (existing): OG for /game/:id
const gameMatch = req.path.match(/^\/game\/([^/]+)$/);
// ... existing block ...

// FR-021/FR-022: OG + noindex for /blunder/:id
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
        const ogTitle = `Connect Four blunder — ${data.pattern_category}`;
        const ogDesc = 'See this Connect Four mistake on DecodeC4.';
        const ogTags = `<meta property="og:title" content="${ogTitle}">
<meta property="og:description" content="${ogDesc}">
${noindexTag}`;
        const patched = indexHtml.replace('</head>', `${ogTags}\n</head>`);
        return res.type('html').send(patched);
      }
    } catch (e) {
      // fall through to noindex-only
    }
  }
  // Always inject noindex for /blunder/* even on error
  const patched = indexHtml.replace('</head>', `${noindexTag}\n</head>`);
  return res.type('html').send(patched);
}
```

#### Step 3c: Frontend — urlMapping.js (FR-023, FR-024)

Two changes in `urlMapping.js`:

1. Replace blunderDetail URL_MAP entry:
```js
// Before:
{ pattern: '/blunder',     screenKey: 'blunderDetail', paramNames: [] },
// After:
{ pattern: '/blunder/:id', screenKey: 'blunderDetail', paramNames: ['id'] },
```

2. Remove `'blunderDetail'` from `SESSION_ONLY_SCREENS`.

#### Step 3d: Frontend — update go('blunderDetail') call sites (FR-024)

Three call sites must add `id: blunder.id` to the params object:

**MistakesListScreen.jsx:205**:
```js
// Before:
go('blunderDetail', { blunderNavList: filteredBlunders, index: i, mistakeContext: 'list', mistakeSource: null })
// After:
go('blunderDetail', { blunderNavList: filteredBlunders, index: i, id: filteredBlunders[i].id, mistakeContext: 'list', mistakeSource: null })
```

**ReviewScreen.jsx:120**:
```js
// Before:
go('blunderDetail', { blunderNavList: gameBlunderList, index: matchedIdx, mistakeContext: 'game', mistakeSource: { ... } })
// After:
go('blunderDetail', { blunderNavList: gameBlunderList, index: matchedIdx, id: gameBlunderList[matchedIdx].id, mistakeContext: 'game', mistakeSource: { ... } })
```

**ReviewScreen.jsx:314** (identical pattern to line 120 — same fix).

#### Step 3e: Frontend — MistakeDetailScreen cold-boot path (FR-025, FR-026)

Add an `id` prop to `MistakeDetailScreen`. When `id` is present and `navList` is absent/empty, fetch `GET /api/blunders/:id`:

```jsx
export function MistakeDetailScreen({ go, goBack, blunderNavList: navListProp, index: initialIndex, mistakeContext, mistakeSource, id }) {
  const [coldNavList, setColdNavList] = useState(null);
  const [coldBootState, setColdBootState] = useState(navListProp?.length > 0 ? 'ready' : id ? 'loading' : 'ready');

  useEffect(() => {
    if (!id || navListProp?.length > 0) return;
    setColdBootState('loading');
    fetch(`${API}/api/blunders/${encodeURIComponent(id)}`)
      .then(async res => {
        if (res.status === 404) { setColdBootState('not_found'); return; }
        if (!res.ok) { setColdBootState('error'); return; }
        const data = await res.json();
        setColdNavList([data]);
        setColdBootState('ready');
      })
      .catch(() => setColdBootState('error'));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const navList = navListProp?.length > 0 ? navListProp : (coldNavList ?? []);

  if (coldBootState === 'loading') {
    return <LoadingState onBack={handleBack} />;
  }
  if (coldBootState === 'not_found') {
    return <NotFoundState onBack={handleBack} message={t('mistakes.detail.notFound', 'Blunder not found')} />;
  }
  if (coldBootState === 'error') {
    return <ErrorState onBack={handleBack} />;
  }
  // ... rest of existing render using navList
}
```

`handleBack` in cold-boot: when `mistakeContext` and `mistakeSource` are absent (cold-boot scenario), go to `home`.

#### Step 3f: Frontend — is_owner gates (FR-027, FR-028, FR-029)

In `MistakeDetailScreen`, gate the "Mark as reviewed" button:
```jsx
// Before:
{effectiveReviewed ? (...reviewed state...) : (
  <button onClick={handleMarkReviewed} ...>...</button>
)}

// After:
{blunder.is_owner && (
  effectiveReviewed ? (...reviewed state...) : (
    <button onClick={handleMarkReviewed} ...>...</button>
  )
)}
```

Gate the Deep Reveal section (FR-028):
```jsx
// Before:
<button onClick={() => setDeepRevealOpen(true)} ...>
  {t('mistakes.detail.whatShouldIHave')}
</button>

// After:
{session ? (
  <button onClick={() => setDeepRevealOpen(true)} ...>
    {t('mistakes.detail.whatShouldIHave')}
  </button>
) : (
  <div style={{ ... }}>
    {t('mistakes.detail.signInToUnlock', 'Sign in to unlock')}
  </div>
)}
```

Note: `deepRevealOpen` branch rendering is already conditional on `deepRevealOpen` state. The sign-in gate prevents the button from being rendered for unauthenticated users; the `DeepRevealPane` itself is only rendered when `deepRevealOpen` is true, so it cannot be triggered without the button.

---

## Architecture Documentation Updates

After implementation, update:

1. **`docs/architecture/api-conventions.md`**: Add `GET /api/blunders/:id` entry to the Blunders Endpoint section. Add `?sort=` param and `side` field to the `GET /api/games` section.

2. **`docs/architecture/frontend-conventions.md`**: Update `SESSION_ONLY_SCREENS` description (remove `blunderDetail`). Add cold-boot fetch pattern note for `blunderDetail` screen (alongside the existing `clchallenge` example).

---

## Complexity Tracking

No constitution violations.

---

## Sequencing Notes

**Critical path**:
1. Server: `GET /api/blunders/:id` endpoint (Step 3a) — must be deployed before cold-boot frontend is merged.
2. Server: `GET /api/games` sort + side (Steps 1 server change + Story 2 server) — independent, can go in same commit.
3. Server: OG injection (Step 3b) — depends on UUID_REGEX being extracted (can share with 3a).
4. Frontend: `urlMapping.js` changes (Step 3c) and call-site updates (Step 3d) — must be atomic (one commit).
5. Frontend: `MistakeDetailScreen` cold-boot + gates (Steps 3e–3f).
6. Frontend: chip additions (Steps 1 FR-002 through FR-005) — independent from Story 3, can go first.
7. Frontend: `PastGamesListScreen` sort picker (Story 2 frontend) — independent.
8. Docs update — last.

**Non-obvious dependencies**:
- Step 3c and 3d are atomic: changing `paramNames: ['id']` without updating call sites produces `/blunder/undefined` URLs.
- `is_owner` on the cold-boot navList entry (Step 3e) is copied from the API response — it's already in the response shape (Step 3a), so no extra work needed.
- `blunderDetail` cold-boot cannot work until `SESSION_ONLY_SCREENS` no longer contains it (Step 3c) AND the endpoint exists (Step 3a).
