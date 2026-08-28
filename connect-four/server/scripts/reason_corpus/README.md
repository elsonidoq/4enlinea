# reason_corpus — the single source of truth for reason-eval boards

Two files, stable paths (deliberately NOT timestamped — every consumer hard-codes these):

| file | what | produced by |
|---|---|---|
| `boards.jsonl` | the board set: `{ id, movestring, playedCol, strategy, selection }` | `select_boards.mjs --strategy coverage` + hand-carried pins |
| `evidence.jsonl` | reason-engine evidence per board, one row per board, same order | `compute.mjs --input reason_corpus/boards.jsonl --out server/scripts/reason_corpus/evidence.jsonl` (no `--llm`) |

Both are committed. The tests read `evidence.jsonl` and are solver-free by design.

## Two populations, one file

- **`strategy: "coverage"`** (50 rows) — a harvest against the closed predicate universe
  (`REASON_UNIVERSE` ∪ `RENDER_UNIVERSE`, gated on the REQUIRED subset). Sampled 2026-08-06.
  Spans opening 34 / mid-game 13 / closing 3, and all three opening-theory predicates
  (`namedOpening` 12, `defense` 8, `centrality` 8).
- **`strategy: "pin"`** (13 rows, `pin-*` ids) — regression anchors, one worked board per causal
  link L1–L9 plus four `patternOnAfterBestBoard` cases. Each carries `selection.pinnedFrom` (its
  historical `eval-N` id in the retired 2026-07-02 corpus) and `selection.why` (the test that
  depends on it). **A pin's board identity IS the test** — never renumber or reorder them.

## The rule for changing this corpus

- **Add a board** only when the feature vector / predicate universe gains something the current
  set cannot exercise, or when a new regression needs its own pin.
- **Regenerate `evidence.jsonl` whenever the reason ENGINE changes** — not only when boards change.
  Evidence is *derived* and expires. Stale evidence pushed through new render code makes the tests
  assert against a snapshot of the old engine while looking green.
- Ids are stable and semantic. `eval-N` was a positional index into a retired corpus; do not
  reintroduce that pattern.

## Consumers

`server/tests/`: `renderCoverageCorpus`, `renderCoverageUniverse` (corpus-wide properties) and
`causalLinksComposers`, `branchInvariance`, `reasonRenderFixes` (pin-specific). The
`grade-fv-sufficiency` eval pipeline reads the same `boards.jsonl` via
`compute.mjs --llm --condition D`.
