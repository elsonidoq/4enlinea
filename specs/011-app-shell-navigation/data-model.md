# Data Model: App Shell & Navigation

No DB schema changes in this epic. All entities are frontend-only.

---

## Navigation State

Held in `Navigator` component (root stateful component inside `ErrorBoundary`):

```
NavigationState {
  screen: string          // one of 15 registered screen keys
  params: object          // opaque; passed as props to rendered screen
  prevScreen: string | null  // one-level back-stack; null on app init
}
```

**Transitions:**
- `go(key, params = {})` → `{ screen: key, params, prevScreen: current.screen }`
- Back (TopBar back button) → `{ screen: prevScreen, params: {}, prevScreen: null }`
- Unknown key → no transition (console.warn emitted, state unchanged)

---

## Screen Registry

```
ScreenRegistry: { [screenKey: string]: (props: ScreenProps) => ReactElement }
```

15 entries. `ScreenProps` includes at minimum:
- `go: (key: string, params?: object) => void`
- All `params` fields from navigation state (spread onto props)

---

## Surface Group Mapping

```
SURFACE_BG: { [screenKey: string]: CSSCustomProperty }
```

| Keys | Value |
|---|---|
| `home`, `stats`, `mistakes`, `mistakeDetail` | `--bg-home` |
| `saga`, `concept`, `socratic`, `clchallenge` | `--bg-lessons` |
| `setpicker`, `challenge`, `summary` | `--bg-challenges` |
| `difficulty`, `game`, `review`, `explorer` | `--bg-sparring` |

---

## Stats Screen State (per async field)

Each field is independent React state — no combined loading object.

| Field | Initial | Source | Auth |
|---|---|---|---|
| `accuracy` | `'--'` | `getLastChallengeSession()?.accuracy` | anonymous |
| `allTimeAccuracy` | `'--'` | `getAllSessionStats()?.accuracy` | authenticated |
| `lessonsCount` | `0` | `getLessonProgress()?.filter(s=>s.status==='complete').length` | both |
| `sparringRecord` | `{ W: 0, L: 0, D: 0 }` | `getSparringRecord()` | both |
| `streak` | `0` | `getStreak()?.streak_count` | authenticated |
| `patternAccuracy` | `[]` | `getAllSessionStats()?.byPattern` | authenticated |

All five store methods are absent until Epic 7. Safe call pattern: `store?.methodName?.().then(set).catch(()=>{})`.

---

## track.js Internal State

Module-level (not React state):

```
activeScreen: string = 'unknown'
```

Set only by `setActiveScreen(key: string): void` export. Read only by `track()` as the `path` field.
