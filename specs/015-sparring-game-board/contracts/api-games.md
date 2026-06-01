# API Contract: `POST /api/games`

**Epic**: 015-sparring-game-board  
**Date**: 2026-06-01  
**Status**: New endpoint

---

## Overview

Persists a completed sparring game record. Called on every game-end event (4-in-a-row win/loss, draw, or resign). Anonymous calls (no Authorization header) are accepted and result in a row with `user_id = null`.

---

## Request

**Method**: `POST`  
**Path**: `/api/games`  
**Auth**: Optional. `loadUser` middleware runs on all routes; populates `req.user = null` for unauthenticated requests.

### Headers

| Header | Required | Description |
|---|---|---|
| `Content-Type` | Yes | `application/json` |
| `Authorization` | No | `Bearer <supabase_access_token>` — omitted for anonymous users |

### Body

```json
{
  "device_uuid": "string",
  "moves": "string",
  "difficulty": "easy" | "medium" | "hard" | "perfect",
  "side": "first" | "second",
  "result": "win" | "loss" | "draw"
}
```

| Field | Type | Constraints |
|---|---|---|
| `device_uuid` | string | Required. Non-empty. |
| `moves` | string | Required. Matches `/^[0-6]{0,42}$/`. |
| `difficulty` | string | Required. One of `'easy'`, `'medium'`, `'hard'`, `'perfect'`. |
| `side` | string | Required. One of `'first'`, `'second'`. |
| `result` | string | Required. One of `'win'`, `'loss'`, `'draw'`. |

---

## Response

### 201 Created

```json
{
  "id": "uuid-string"
}
```

| Field | Description |
|---|---|
| `id` | UUID of the created game row. Passed as navigation param to `review` screen. |

### Error Responses

| Status | Body | Condition |
|---|---|---|
| `400` | `{ "error": "<message>" }` | Missing or invalid fields (moves regex, difficulty/side/result not in enum) |
| `503` | `{ "error": "Database not configured" }` | Supabase client not initialized (missing env vars) |
| `500` | `{ "error": "<message>" }` | Unexpected server error |

---

## Server Implementation Notes

```js
// Validation
if (!device_uuid || typeof device_uuid !== 'string') return 400;
if (!/^[0-6]{0,42}$/.test(moves)) return 400;
if (!['easy','medium','hard','perfect'].includes(difficulty)) return 400;
if (!['first','second'].includes(side)) return 400;
if (!['win','loss','draw'].includes(result)) return 400;

// Insert
const { data, error } = await supabase
  .from('games')
  .insert({
    user_id: req.user?.id ?? null,
    device_uuid,
    moves,
    difficulty,
    side,
    result,
  })
  .select('id')
  .single();

// Response
res.status(201).json({ id: data.id });
```

---

## Client Call Site

Called from `GameScreen.jsx` on game-end (non-blocking):

```js
const saveGame = async (result) => {
  const profile = await store.getProfile();
  try {
    const res = await fetch(`${API}/api/games`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {}),
      },
      body: JSON.stringify({
        device_uuid: profile.device_uuid,
        moves: moveHistory.join(''),
        difficulty,
        side,
        result,
      }),
    });
    const data = await res.json();
    return data.id ?? null;
  } catch {
    return null;
  }
};
```

Navigation always proceeds regardless of save outcome:
```js
const id = await saveGame(result);
await store.saveSparringRecord(result);
await store.recordActivityDay();
track('game_ended', { result, moveCount: moveHistory.length, difficulty });
go('review', { id }); // id may be null on failure
```

---

## Rate Limiting

Default: 120 req/min (per `api-conventions.md` "All other /api/ routes").

---

## Analytics

`track('game_ended', { result, moveCount, difficulty })` is fired by the client immediately after the save, before navigation.
