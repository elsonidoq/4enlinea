# API Contracts: Admin Audio Endpoints (Epic 10)

All endpoints in this file:
- Route prefix: `/api/admin/audio/`
- Auth: **localhost-only** — `requireLocalhost` middleware (checks `req.ip` against `127.0.0.1`, `::1`, `::ffff:127.0.0.1`). Returns 403 for all other IPs.
- Error shape: `{ "error": "<message>" }` per `api-conventions.md`

---

## GET /api/admin/audio/status

Lists all coach i18n keys and their current TTS registry state.

**Response** (`200 OK`):
```json
{
  "keys": [
    {
      "key": "coach.immediate_threat.optimal.0",
      "text": "Nice — you spotted the winning move.",
      "status": "approved",
      "file": "coach--immediate-threat--optimal--0.mp3"
    },
    {
      "key": "coach.queueCount_one",
      "text": "{{count}} position to review",
      "status": "ineligible",
      "reason": "interpolated"
    },
    {
      "key": "coach.z_threat.prompt.0",
      "text": "A Z-threat gives you unstoppable parity control — find it.",
      "status": "needs_audio",
      "file": null
    }
  ],
  "summary": {
    "approved": 45,
    "awaiting_approval": 12,
    "needs_audio": 164,
    "ineligible": 4,
    "total": 225
  }
}
```

- Keys are sorted: `needs_audio` first, `awaiting_approval` second, `approved` third, `ineligible` last.
- `text` is the resolved English string from `en.json`.
- **Errors**: 503 if `tts-registry.json` cannot be read; 500 on unexpected errors.

---

## POST /api/admin/audio/generate

Generates TTS audio for one key or all keys that need audio.

**Request body**:
```json
{ "key": "coach.immediate_threat.optimal.0" }
```
OR:
```json
{ "all_new": true }
```

- `key`: specific i18n key to generate. Fails with 400 if the key is ineligible (interpolated) or if `OPENAI_API_KEY` is not set.
- `all_new`: generates MP3s for all keys with status `needs_audio`. Long-running; returns after all are done (blocks the HTTP response).

**Processing**:
1. Resolve the i18n key text from `en.json`. Return 400 if key not found or text contains `{{`.
2. Call OpenAI TTS `tts-1` model with `voice = 'alloy'` (default; configurable in registry).
3. Write MP3 to `connect-four/public/audio/coach/<slug>.mp3`.
4. Update `tts-registry.json`: set `status: 'awaiting_approval'`, `file: '<slug>.mp3'`.

**Response** (`200 OK`):
```json
{
  "generated": ["coach.immediate_threat.optimal.0"],
  "failed": [],
  "skipped": []
}
```
- `skipped`: keys already at `approved` or `awaiting_approval` status (not re-generated unless explicitly specified by `key`).
- `failed`: keys where synthesis failed (network error, etc.).

**Errors**:
- `400 { "error": "key not found" }` — key doesn't exist in `en.json`.
- `400 { "error": "key is ineligible (interpolated)" }` — key contains `{{...}}`.
- `503 { "error": "OPENAI_API_KEY not set" }` — TTS provider not configured.
- `500` — unexpected error.

---

## POST /api/admin/audio/approve

Marks a generated audio key as approved. The key must be in `awaiting_approval` status.

**Request body**:
```json
{ "key": "coach.immediate_threat.optimal.0" }
```
OR:
```json
{ "approve_all": true }
```

- `key`: specific key to approve.
- `approve_all`: approves all keys currently at `awaiting_approval` status in one operation.

**Processing**:
1. Validate key exists in registry with status `awaiting_approval`. For `approve_all`, iterate all such keys.
2. Set `status: 'approved'` in `tts-registry.json`.
3. Write updated registry to disk.

**Response** (`200 OK`):
```json
{ "approved": ["coach.immediate_threat.optimal.0"] }
```

**Errors**:
- `400 { "error": "key not found in registry" }` — key doesn't exist in registry.
- `400 { "error": "key is not in awaiting_approval status" }` — can only approve `awaiting_approval` keys (not `needs_audio` or `ineligible`).
- `500` — unexpected error.

---

## Extended /api/explain-move-llm Response (Epic 10 addition)

The existing `POST /api/explain-move-llm` endpoint response is extended with a `terms` field:

```json
{
  "explanation": "Green played into [zone:col4]column 4[/zone:col4], setting up a [term:community-z-threat]Z-threat[/term:community-z-threat] at the odd-row parity cell.",
  "prompt": "...",
  "cached": false,
  "terms": {
    "community-z-threat": "A Z-threat is a major threat at a cell where the column has an odd number of empty cells above the current height, giving the owner automatic parity control.",
    "allen-t2": "An undercut occurs when..."
  }
}
```

- `terms` is always present (never `null`).
- `terms` is `{}` (empty object) when no KB terms were referenced in the explanation.
- On cache hit, `terms` is populated from `deep_reveal_json.terms` (empty `{}` for pre-Epic-10 cache rows).
- For the trivial/settled fallback paths (no LLM call), `terms` is `{}`.

**Documentation**: This change must be reflected in `docs/architecture/api-conventions.md` under the `POST /api/explain-move-llm` section.
