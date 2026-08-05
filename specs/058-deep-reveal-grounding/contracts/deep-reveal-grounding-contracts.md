# Contracts: Deep-Reveal Grounding

This feature adds no new externally-facing HTTP endpoint and does not change
`/api/explain-move-llm`'s request/response JSON shape (`explanation`/`prompt`/`terms` fields are
unchanged — only their *content* changes). The two internal contracts below are the ones worth
freezing in writing because they cross the US1→US2→US3 story boundary and the two parallel-lane file
ownership boundaries (Plan A / Plan B).

## 1. `deep_reveal_failures` — additive column contract (US2)

See `../data-model.md` §4 for the full column table. Contract statement: the existing
terminal-failure insert (`server/index.js:1363-1372`, writing `position_hash`, `movestring`, `col`,
`endpoint`, `llm_prompt`, `raw_llm_output`, `failure_reason`) is **unchanged** — this feature never
rewrites that insert, only adds a second, independent insert site for the
`'missing_required_squares'` case, writing the new nullable columns
(`attempt1_raw_llm_output`, `attempt1_mechanism`, `attempt2_raw_llm_output`, `attempt2_mechanism`,
`missing_handles`, `served_attempt`). No reader (there are none known today outside manual
inspection) needs to distinguish the two insert shapes beyond `failure_reason`.

## 2. `promoteRawCoordinates(text, locale)` — new function, response-boundary ordering contract (US3, FR-011)

See `../data-model.md` §5 for the full mechanism and citations. Contract statement, since this
crosses the same US2→US3 boundary and Plan A file-ownership boundary as §1: `promoteRawCoordinates`
is a **new export** in `connect-four/server/reasonRenderGuard.mjs` — Plan A's `stripInternalTokens`
and `RANGE_RE` in that file are **not modified**. It is called from `guardExplainMoveLlmPayload`
in this fixed order: `promoteRawCoordinates` → `validateAnnotation` (which may run `checkP5Strong`
if `allowedSet` is non-null) → `stripFailingZoneSpans` → `stripInternalTokens`. This order is
load-bearing, not incidental:
- Promoting *before* `validateAnnotation` means a promoted coordinate that was never actually
  offered gets rejected by `checkP5Strong` exactly like any other unoffered highlight — the coach's
  own raw prose does not get a free pass around the grounding check.
- A rejected promotion falls back to today's flattened "column N" prose **automatically**, via
  `stripFailingZoneSpans` keeping the inner text and dropping only the `[zone:...]` wrapper — no
  separate fallback code path is written for this; the inner text must therefore already be the
  flattened word (`"column 4"`), not the raw token (`"c4r3"`) itself, or the promoted zone's own
  inner text trips `checkP6`'s raw-coordinate check unconditionally and self-destructs regardless of
  `allowedSet`.
- `stripInternalTokens` still runs last (Cross-lane constraint 1 — Plan A's function, unmodified)
  and is a no-op on anything `promoteRawCoordinates` already flattened, but still catches everything
  outside `promoteRawCoordinates`'s narrower single-cell (`cXrY`) scope (e.g. `cX-cY` ranges, which
  `RANGE_RE` owns).

## 3. `Board.jsx` `showCoordinates` prop — additive, opt-in (US4)

```js
// New prop, default false. Additive to the existing BoardImpl signature
// (connect-four/src/components/Board.jsx:84-105) — no existing prop's name, type, or default changes.
showCoordinates = false
```

Contract: when `true`, the board renders column numbers (1-7) and row numbers (1-6, per the
frontend-display 1-indexed convention, `CLAUDE.md` "Row/column coordinate convention") around the
grid, additive to the existing cell layout — it does not change cell size, grid dimensions, or any
existing prop's behavior. `MistakeDetailScreen.jsx` is the **only** call site that ever passes
`showCoordinates={true}` under this feature (at the deep-reveal-open `<Board>` instance,
`MistakeDetailScreen.jsx:410`). Every other of `Board.jsx`'s ~17 callers is unaffected by omission
(the prop defaults to `false`), satisfying FR-015/SC-007. Sizing/layout of the numbering itself is
explicitly **not** specified here — Plan B owns `Board.jsx` sizing; if `showCoordinates` numbering
needs a size accommodation, that is Plan B's call to make, not this feature's.
