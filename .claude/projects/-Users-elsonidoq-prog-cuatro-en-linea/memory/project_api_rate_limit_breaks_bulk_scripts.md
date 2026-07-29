---
name: project_api_rate_limit_breaks_bulk_scripts
description: The 120 req/min per-IP limiter silently kills bulk admin loops — it returns a PLAIN-TEXT body (JSON parsers die with an opaque decode error) and browser QA traffic shares the same budget
metadata: 
  node_type: memory
  type: project
  originSessionId: cab46264-683c-40fd-8230-c499289e7f66
  modified: 2026-07-29T13:36:40.515Z
---

Any shell/node loop that hammers a local `/api/` route in bulk — regenerating lesson audio for all 15
lessons, seeding candidates, re-running an admin batch — can die **halfway through, silently**, and the
three signals you get all point the wrong way.

**The limiter.** `express-rate-limit` applies **120 req/min per IP** to every `/api/` route without a
tighter override (`api-conventions.md` §Rate Limiting). It is **per IP, not per route**, so it is a
single shared budget across everything hitting the box: your loop, the Vite dev app, the store's
polling, and — the part that actually bit — a **browser QA sweep** clicking through 35 lesson slides in
another tab. Neither activity is heavy alone; together they trip it.

**Why it reads as something else.** Three misleading symptoms, in the order you meet them:

1. **The script's error names the wrong culprit.** The limiter's default handler sends a **plain-text**
   body ("Too many requests…"), not JSON. A loop doing `curl … | python3 -c "json.load(sys.stdin)"`
   dies with `JSONDecodeError: Expecting value: line 1 column 1 (char 0)` — which reads like a crashed
   server or an empty response, not a 429.
2. **The server log shows the request and no handler output.** The limiter runs as middleware *before*
   the route, so you see the `[req] POST /api/admin/...` line with **zero** handler logging after it.
   That looks exactly like the handler returning early (a 404 / a guard rejection), and sends you
   reading the handler's early-return branches for a bug that isn't there.
3. **Retrying one request by hand succeeds.** By the time you investigate, the 60-second window has
   rolled over, so the single curl you fire to reproduce returns a clean `200` — "works for me".

**How to apply:** in any bulk loop, (a) capture the raw body to a variable and print it on a parse
failure instead of piping straight into a parser — the plain-text 429 then identifies itself, (b) put a
few seconds of `sleep` between requests, and (c) keep the browser off the app while it runs. If a bulk
run stops producing handler log lines partway through, suspect the limiter **before** the handler.
Checking is free: the response carries `RateLimit-Limit` / `RateLimit-Remaining` / `RateLimit-Reset`
headers, so `curl -i` on one request tells you immediately how much budget is left.

Related: [[project_app_qa_setup_gotchas]], [[project_lesson_disk_edit_cache_clobber]],
[[reference_inline_node_scripts]].
