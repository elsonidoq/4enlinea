# Contract: coachUtils.js — pickRandomKey

**Feature**: 029-coach-commentary / FR-004  
**File**: `connect-four/src/lib/coachUtils.js`

## Function signature

```js
/**
 * Pick a random i18n key from a prefixed pool.
 * Probes `${prefix}.0`, `${prefix}.1`, ... until t(key) === key (missing).
 * Returns a full key string, e.g. 'coach.ai_move.neutral.2'.
 * When the pool is empty, returns `${prefix}.0` (the key itself — signals missing pool to caller).
 */
export function pickRandomKey(t, prefix) { ... }
```

## Pool-existence probe idiom

Callers that must detect whether a pool exists before picking (Phase 2 FR-007 step 3):

```js
const probeKey = `${prefix}.0`;
if (t(probeKey) !== probeKey) {
  // pool exists
  const key = pickRandomKey(t, prefix);
  // ...
}
```

## Consumers

| File | Usage |
|---|---|
| `connect-four/src/lib/useGameBoard.js` | `commitAiMove` (Phase 2), `handleColumnClick` (Phase 2), `handleHintToggle` |
| `connect-four/src/screens/ChallengeScreen.jsx` | `handleColumnClick` (Phase 1) |

## Import path

```js
import { pickRandomKey } from '../lib/coachUtils.js';
```
