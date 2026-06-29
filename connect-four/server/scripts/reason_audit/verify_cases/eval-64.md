# eval-64 — VERIFY verdict: SOUND (grain `not_a_blunder`)

**Case:** movestring `3333545554434344605506060060` (28 discs), played col 2 (display 3), best col 1 (display 2), pattern_category `z_threat`, severity 0, blunder_severity null. BOTH-LOSE same-floor (best −4, played −5).

## Verdict
**SOUND.** §5 router rule 1 fires: `not flip` AND no discriminating winning four reachable on either PV → **`not_a_blunder`**. The z_threat TAG does NOT force a parity grain — it is a flip-only mechanism and there is no flip and no surrendered column here.

## Golden grain
`not_a_blunder` — winner `none`, body = header only.

## Evidence (commands + key outputs)
- `./visualize_board.sh 3333545554434344605506060060` → Next: Green (P1, 28 discs even → P1 to move). `scr` row `-- -4 -5 -- -- -- -7`. Display cols 2/3/7 are the only legal moves; all lose for Green ⇒ **SAME-floor BOTH-LOSE, no flip**. Pre-move major threats: `col3 row2 (Gn)`, `col3 row6 (Gy)`, `col7 row6 (Gn+Gy)`.
- `forward_distance.mjs … 1 2` → col1 (best): `score=-4 forwardPlies=7 register=forced_sequence`; col2 (played): `score=-5 forwardPlies=5 register=forced_sequence`. Δ = 2 plies, both forced_sequence.
- `optimal_line.mjs` **BEST** (`…01`) → terminal `win`, winner `second(Gray/P2)`, completingCell `c3r2`, ply 36, window `[c2r2,c3r2,c4r2,c5r2]`.
- `optimal_line.mjs` **PLAYED** (`…02`) → terminal `win`, winner `second(Gray/P2)`, completingCell `c2r2`, ply 34, window `[c2r2,c3r2,c4r2,c5r2]` — **identical window, same owner (Gray), 2 plies sooner.**
- `decisive_check … c2r2` and `… c3r2` → both `BLOCKABLE (defender escapes / candidate not decisive)`; both in the same completed window. The four completes only by zugzwang under forced optimal play; it is NOT a decisive standalone immediate threat.
- `parity_cells … 01/02 1` and `… 2` (both branches) → p1 z-threat cells `[c3r2,c7r6]`, p2 `[c3r6,c7r6]` — **IDENTICAL across best and played branches.** The col3 stacked z_threat geometry pre-exists and is unchanged by either move.

## Refutation duties discharged
- **(a) No discriminating reachable winning four.** Both optimal PVs end with the *same* Gray window `[c2r2,c3r2,c4r2,c5r2]`. Green has no winning four in either branch; `reachability.best.ceiling == played.ceiling` (both `win`, a mistake-mode phantom — Green loses optimally on every column). The four is alive in BOTH branches (never alive-in-one/dead-in-other), so it is non-discriminating. The ~2-ply gap is the *same* opponent line completing sooner, not a distinct accelerated forced loss the best move denies.
- **(b) line_parity correctly NOT produced.** line_parity is flip-only (standing-threat ownership FLIP). Outcome is loss→loss (no flip); Gray already wins either way, so no ownership of a decisive standing threat flips. parity TAG ≠ parity grain.
- **(c) not_a_blunder sound; surrendered column not nameable.** The z_threat geometry (col3 c3r2/c3r6) is identical in both branches and pre-exists the move — nothing is surrendered. There is no decisive line to name. Gate 6 forbids a "loses slower/faster" rationale, so the marginal 2-ply timing is not a blunder reason.

## Contrast (per brief)
eval-7 / eval-42 are same-floor BUT carry a *discriminating accelerated* opponent line (a distinct forced loss the best move denies → grain `line`). eval-64 differs: the opponent line is the IDENTICAL window in both branches, only 2 plies sooner → non-discriminating → `not_a_blunder`.

## player_sentence
Honest no-lesson note: "This position was already lost no matter what — Gray completes the same bottom-row four either way, just one move-pair sooner here. There's nothing to coach." (Coach should OMIT.)

## defect
None. Grain is sound and grounded. (Consistent with the iteration-2 audit's recommendation that this severity-0 same-floor subclass be OMITTED in product; the unified algorithm achieves that via `not_a_blunder`.)

## tools_used
visualize_board.sh, forward_distance.mjs, optimal_line.mjs, decisive_check.mjs, parity_cells.mjs. **tools_created:** none.

## one-line lesson
A parity/z_threat TAG on a same-floor (no-flip) board does NOT force line_parity: when both branches lose through the identical opponent four (only timing differs) and the tagged geometry is pre-existing/unchanged, the sound grain is `not_a_blunder`. Confirms the parity-TAG-but-same-floor class → **redundant cases: eval-54 (z_threat both-lose, 30 discs), eval-60, eval-62 (claimeven both-lose)** — each should resolve to `not_a_blunder` UNLESS a branch carries a *distinct* (not merely faster) discriminating opponent four; verify best.ceiling==played.ceiling and same-window before trusting any acceleration signal.
