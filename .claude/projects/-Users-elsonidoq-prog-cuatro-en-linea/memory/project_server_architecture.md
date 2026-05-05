---
name: Server architecture and endpoint map
description: Express server structure, auth middleware, all API endpoints, Supabase/Stripe/Anthropic integration pattern
type: project
---

# Server architecture (`connect-four/server/index.js`)

## Client initialization (lazy, env-gated)

```js
// Supabase — only if SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY set
// Anthropic — only if ANTHROPIC_API_KEY set
// Stripe — only if STRIPE_SECRET_KEY set (imported inside init block)
```

All clients are null if env vars missing; endpoints degrade gracefully (503 or stub responses).

## Auth middleware (`loadUser`)

Runs on every request. Extracts `Authorization: Bearer <jwt>`, validates via `supabase.auth.getUser()`, loads `users` row → attaches `req.user = { id, tier, deep_reveal_count, deep_reveal_reset_at, device_uuid }` or null for anonymous.

## Rate limits (express-rate-limit, per IP, per minute)

- `/api/explain-move`: 30 req/min
- `/api/scores`, `/api/explain`: 60 req/min
- `/api/stripe/create-checkout`: 10 req/min
- all others: 120 req/min

## Endpoint map

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | /api/ping | none | health check |
| POST | /api/scores | none | c4solver `-a` scores |
| POST | /api/explain | none | heatmap data |
| POST | /api/track | optional | fire-and-forget, always 204 |
| POST | /api/explain-move | optional (deep reveal needs auth) | classifier + LLM + cache + quota |
| GET | /api/puzzles | optional | category list with locked flags |
| GET | /api/puzzles/:id | optional | puzzle data; 403 if tier locked |
| POST | /api/puzzles/:id/check | optional | predicate eval + attempt record + blunder insert |
| GET | /api/coach/weakness-map | paid required | aggregate miss rates |
| GET | /api/coach/queue | paid required | next unresolved blunder |
| POST | /api/coach/queue/:id/resolve | paid required | mark blunder resolved |
| POST | /api/stripe/create-checkout | auth required | Stripe Checkout session |
| POST | /api/stripe/webhook | none (Stripe sig) | tier updates |
| POST | /api/stripe/portal | auth required | Stripe billing portal |

## Tier access

- Categories 1-3: free (anonymous included)
- Categories 4-6: paid only (403 for free/anon)
- Deep Reveal: anon=0/day, free=3/day (midnight UTC reset), paid=unlimited
- Coach endpoints: paid only (requirePaid middleware)

## IMPORTANT: never modify legacy routes

`/api/scores`, `/api/explain`, `/api/ping` must remain unchanged — the old frontend depends on them.
