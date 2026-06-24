# Admin Deep-Reveal Eval — File Selector & Comparison View

**Date:** 2026-06-24
**Status:** Approved

## Overview

Extend the `admin/deep-reveal-eval` screen with three features:
1. A dropdown to select any `eval_results_*.jsonl` file and auto-display the pre-computed LLM explanation for the current board position.
2. A "Show all evals" checkbox that renders all files' responses for the current position in a scrollable list, for cross-run comparison.
3. Two secure server endpoints to serve the eval file list and per-file contents.

## Server Endpoints

### Middleware: `requireLocalhost`

A new middleware added before `requireAdmin` on the two new endpoints. Checks `req.socket.remoteAddress` is `127.0.0.1` or `::1`. Uses the raw TCP socket address — not `req.ip` — so it cannot be spoofed via `X-Forwarded-For` headers regardless of trust-proxy configuration.

### `GET /api/admin/eval-results`

- Protected by `requireLocalhost` + `requireAdmin`
- Reads `connect-four/server/scripts/` via `fs.readdirSync`
- Returns only files matching `/^eval_results_[\w-]+\.jsonl$/`
- Response: `{ files: string[] }` sorted alphabetically (ISO timestamps sort chronologically)
- Errors: silently returns `{ files: [] }` if directory is unreadable

### `GET /api/admin/eval-results/:filename`

- Protected by `requireLocalhost` + `requireAdmin`
- Security: validates `:filename` against `/^eval_results_[\w-]+\.jsonl$/`; returns 400 if it doesn't match. Then applies `path.basename()` before joining to the scripts directory (belt-and-suspenders).
- Reads and JSONL-parses the file
- Strips the large `prompt` field; returns only `{ id, board_state, final_response, attempt1_failures, attempt2_failures }` per row
- Returns 400 on invalid filename, 404 if file not found

## Frontend — `AdminDeepRevealEvalPage.jsx`

All changes are contained within the existing `EvalViewer` component. No new files.

### New State

```
evalFiles     — string[]                                  filenames from the list endpoint, fetched on mount
selectedFile  — string                                    currently selected filename; '' = none selected
fileRows      — Map<board_state, row> | null              rows for selectedFile, keyed by board_state
showAll       — boolean                                   "Show all evals" checkbox state
allFilesRows  — Map<filename, Map<board_state, row>>      lazily loaded when showAll is checked
```

### Loading Logic

- **On mount:** fetch `/api/admin/eval-results` → set `evalFiles`. Errors are silent (dropdown stays empty/disabled).
- **On `selectedFile` → non-empty:** fetch `/api/admin/eval-results/:filename` → build `fileRows` map keyed by `board_state`.
- **On `selectedFile` → `''`:** set `fileRows = null`.
- **On `showAll` checked:** fetch every file not yet in `allFilesRows`; add each to the map as it resolves (incremental — already-loaded files show immediately).
- **On navigation (Prev/Next):** `fileRows` and `allFilesRows` persist across entries — no re-fetch. New entry's `board_state` is looked up in the existing maps.

### Rendering Priority

| Condition | What renders in the board area |
|---|---|
| `showAll` is checked | List view (overrides everything) |
| `selectedFile` non-empty | Single-file static view |
| Neither | Existing "Deep Reveal" button + live API (unchanged) |

### Header Additions

Added to the existing header bar:
- A `<select>` with a blank first option and one `<option>` per filename in `evalFiles`. Disabled with placeholder text when `evalFiles` is empty.
- A checkbox labeled "Show all evals" next to the select. Enabled when `evalFiles.length > 0`.

### Mode 1 — No file, no "show all" (unchanged)

Renders exactly as today: board + "Deep Reveal" button triggering the live `/api/explain-move-llm` call.

### Mode 2 — File selected, "show all" unchecked

Replaces the board+button area with `SplitReveal` (board fixed in top pane, static content in bottom pane).

Bottom pane content:
- **Loading:** small spinner while `fileRows` is being fetched.
- **No match:** plain board + "no result for this position in selected file" message (no SplitReveal). The live "Deep Reveal" button is not shown — selecting a file always suppresses the live button regardless of match status.
- **Match found:**
  - Failure chips for `attempt1_failures` and `attempt2_failures` rendered above the explanation, using the existing chip style but amber-colored to distinguish from predicate chips.
  - `AnnotatedExplanation` with `text={row.final_response}` and `termsMap={}`. Zone highlighting works normally; KB-term underlines appear but tapping them is a no-op (no summary available).

### Mode 3 — "Show all" checked (overrides file selector)

`SplitReveal` with board in top pane; bottom pane is a scrollable vertical list.

List structure (chronological filename order):
- Each file: monospace filename as a section header, then either `AnnotatedExplanation` for the matching row or a dim "— no entry —" line.
- Files still loading show a small inline spinner.

Zone highlighting: each `AnnotatedExplanation` calls `setZhCells` independently on interaction. Last interaction wins — no extra arbitration needed.

## Out of Scope

- KB-term popups in eval mode (no `termsMap` available from eval files)
- Triggering a fresh live LLM call while a file is selected (blank option in dropdown restores the live button)
- Persisting the selected file or checkbox state across page reloads
