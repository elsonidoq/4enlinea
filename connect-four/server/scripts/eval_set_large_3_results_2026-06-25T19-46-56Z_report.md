# Deep Reveal Eval Report — eval_set_large_3_results_2026-06-25T19-46-56Z.jsonl

## Summary

- Total entries: 66
- Pipeline failures: 0
- Annotation failures: 2
- Successes evaluated: 64
- Rubric pass rate: 516/576 items passed across all success entries (27 partial, 33 fail)

## Pipeline failures

None.

## Annotation failures

| id | category | attempt1_failures | attempt2_failures |
|----|----------|------------------|------------------|
| eval-54 | z_threat | `P6:raw_coordinate:windows:c1r4|c5r4, P6:raw_coordinate:windows:c1r4` | `P5:blocked:c3r5` |
| eval-60 | claimeven | `P3:engine_jargon` | `P3:engine_jargon` |

> **eval-54 attempt 1** (`P6:raw_coordinate:windows:c1r4|c5r4, P6:raw_coordinate:windows:c1r4`):
>
> You gave away [term:z_threat]z threat[/term:z_threat] control by playing in [zone:col3]column 3[/zone:col3]; that move kept your major threats at [zone:windows:c1r4|c5r4][zone:windows:c1r4|c5r4]2[/zone:windows:c1r4|c5r4][/zone:windows:c1r4|c5r4], while the better move in [zone:col5]column 5[/zone:col5] would have reduced them to [zone:windows:c1r4][zone:windows:c1r4]1[/zone:windows:c1r4][/zone:windows:c1r4].  
> 
> By playing [zone:col5]column 5[/zone:col5], you would have kept the key [zone:c5r4]that cell[/zone:c5r4] pattern tied to your own control instead of handing your opponent the parity edge; that was the stronger way to preserve your chances on the odd rows.
>
> **eval-54 attempt 2** (`P5:blocked:c3r5`):
>
> Your move in [zone:col3]column 3[/zone:col3] handed your opponent the parity advantage: instead of playing [zone:col5]column 5[/zone:col5], you filled [zone:c3r5]that cell[/zone:c3r5] and left your own major threat count at [zone:windows:c1r4|c5r4]2[/zone:windows:c1r4|c5r4] rather than the cleaner [zone:windows:c1r4]1[/zone:windows:c1r4]. The better move would have used your [term:immediate_threat]immediate threat[/term:immediate_threat] at [zone:c5r4]that cell[/zone:c5r4] to keep control of the timing and preserve the stronger odd-row path for you.

> **eval-60 attempt 1** (`P3:engine_jargon`):
>
> You had a [term:claimeven]claimeven[/term:claimeven] endgame and gave it away by playing [zone:col3]column 3[/zone:col3] instead of taking [zone:col1]column 1[/zone:col1]. The better move would have kept that pairing on your side, left you with no minor threats instead of [zone:tg]1[/zone:tg], and denied your opponent a minor threat in the way your move did not.
>
> **eval-60 attempt 2** (`P3:engine_jargon`):
>
> You had a [term:claimeven]claimeven[/term:claimeven] endgame available, and moving in [zone:col3]column 3[/zone:col3] gave that pairing away by filling [zone:c3r6]that cell[/zone:c3r6] instead of keeping the even-row control that was yours. The better move in [zone:col1]column 1[/zone:col1] would have let you play [zone:c1r3]that cell[/zone:c1r3], preserving the pairing and leaving you with the cleaner endgame; that’s why it was stronger even though your move created [zone:windows:c1r6]1[/zone:windows:c1r6] major threat while the better move kept you at [zone:tg]none[/zone:tg] and also left your opponent with [zone:tg]none[/zone:tg].

## Per-entry rubric scores (success entries)

| id | category | sev | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|----|----------|-----|---|---|---|---|---|---|---|---|---|
| eval-0 | drawing_move | 0 | · | · | · | · | · | · | · | · | · |
| eval-1 | suboptimal_move | 0 | · | · | · | · | · | · | · | · | · |
| eval-2 | drawing_move | 0 | · | · | · | · | · | · | · | · | · |
| eval-3 | suboptimal_move | 0 | · | · | ✗ | · | · | · | ~ | ~ | ✗ |
| eval-4 | suboptimal_move | 0 | · | · | · | · | · | · | · | · | · |
| eval-5 | drawing_move | 1 | · | · | ~ | · | · | · | ✗ | ✗ | ~ |
| eval-6 | undercut | 0 | · | · | · | · | · | · | · | · | · |
| eval-7 | forced_block | 3 | · | · | · | · | · | · | · | ✗ | · |
| eval-8 | suboptimal_move | 0 | · | · | · | · | · | · | · | · | · |
| eval-9 | suboptimal_move | 1 | · | · | ✗ | · | · | · | ✗ | ✗ | ✗ |
| eval-10 | j_shape | 0 | · | · | · | · | · | · | · | ~ | · |
| eval-11 | immediate_threat | 3 | · | · | · | · | · | · | · | · | · |
| eval-12 | immediate_threat | 1 | · | · | · | · | · | · | · | · | · |
| eval-13 | suboptimal_move | 1 | · | · | ✗ | · | · | · | ~ | ✗ | ✗ |
| eval-14 | forced_block | 1 | · | · | · | · | · | · | · | · | · |
| eval-15 | double_threat | 2 | · | · | · | · | · | · | · | · | · |
| eval-16 | suboptimal_move | 0 | · | · | ~ | · | · | · | · | · | ~ |
| eval-17 | j_shape | 0 | · | · | · | · | · | · | ~ | ~ | · |
| eval-18 | suboptimal_move | 1 | · | · | · | · | · | · | · | · | · |
| eval-19 | suboptimal_move | 0 | · | · | · | · | · | · | · | · | ~ |
| eval-20 | j_shape | 0 | · | · | ~ | · | · | · | · | ✗ | · |
| eval-21 | drawing_move | 0 | · | · | · | · | · | · | · | · | · |
| eval-22 | suboptimal_move | 1 | · | · | · | · | · | · | · | · | · |
| eval-23 | suboptimal_move | 0 | · | · | ✗ | · | · | · | ~ | ✗ | ✗ |
| eval-24 | drawing_move | 1 | · | · | · | · | · | · | · | · | · |
| eval-25 | suboptimal_move | 1 | · | · | · | · | · | · | · | · | · |
| eval-26 | suboptimal_move | 1 | · | · | · | · | · | · | · | · | · |
| eval-27 | forced_block | 5 | · | · | · | · | · | · | · | · | · |
| eval-28 | undercut | 0 | · | · | · | · | · | · | · | ~ | · |
| eval-29 | double_threat | 6 | · | · | · | · | · | · | · | · | · |
| eval-30 | suboptimal_move | 0 | · | · | · | · | · | · | · | · | · |
| eval-31 | forced_block | 7 | · | · | · | · | · | · | · | · | · |
| eval-32 | immediate_threat | 7 | · | · | · | · | · | · | · | · | · |
| eval-33 | suboptimal_move | 0 | · | · | · | · | · | · | · | · | ~ |
| eval-34 | suboptimal_move | 0 | · | · | · | · | · | · | · | · | · |
| eval-35 | double_threat | 6 | · | · | · | · | · | · | · | · | · |
| eval-36 | immediate_threat | 0 | · | · | · | · | · | · | · | · | · |
| eval-37 | drawing_move | 0 | · | · | · | · | · | · | · | · | ✗ |
| eval-38 | overcut | 2 | · | · | · | · | · | · | · | ✗ | · |
| eval-39 | j_shape | 0 | · | · | · | · | · | · | · | · | · |
| eval-40 | drawing_move | 0 | · | · | · | · | · | · | · | · | ✗ |
| eval-41 | suboptimal_move | 0 | · | · | · | · | · | · | · | · | · |
| eval-42 | forced_win | 3 | · | · | · | · | · | · | · | ✗ | · |
| eval-43 | forced_win | 3 | · | ✗ | · | · | · | · | · | ✗ | · |
| eval-44 | suboptimal_move | 0 | · | · | · | · | · | · | · | · | · |
| eval-45 | suboptimal_move | 0 | · | · | ~ | · | · | · | · | · | ~ |
| eval-46 | forced_win | 2 | · | · | · | · | · | · | · | · | · |
| eval-47 | suboptimal_move | 0 | · | · | ✗ | · | · | · | ~ | · | ✗ |
| eval-48 | forced_win | 0 | · | ~ | · | · | · | · | · | ✗ | · |
| eval-49 | z_threat | 1 | · | · | · | · | · | · | · | · | · |
| eval-50 | double_threat | 4 | · | · | · | · | · | · | · | · | · |
| eval-51 | figure_7 | 4 | · | ~ | · | · | · | · | · | · | · |
| eval-52 | figure_7 | 2 | · | ✗ | · | · | · | · | · | ✗ | ✗ |
| eval-53 | figure_7 | 0 | · | · | · | · | · | · | · | · | · |
| eval-55 | overcut | 1 | ✗ | · | ✗ | · | ~ | · | · | ✗ | · |
| eval-56 | odd_even_threat | 0 | · | · | · | · | · | · | · | · | · |
| eval-57 | figure_7 | 3 | · | · | · | · | · | · | · | · | · |
| eval-58 | z_threat | 1 | · | · | · | · | · | · | · | ~ | · |
| eval-59 | claimeven | 0 | · | · | · | · | · | · | · | · | · |
| eval-61 | odd_even_threat | 2 | · | · | · | · | · | · | · | · | · |
| eval-62 | claimeven | 0 | · | · | · | · | · | · | · | · | · |
| eval-63 | claimeven | 0 | · | · | · | · | · | · | ~ | ✗ | ~ |
| eval-64 | z_threat | 0 | · | ✗ | · | · | · | · | ~ | · | ~ |
| eval-65 | odd_even_threat | 0 | · | · | ~ | · | · | · | · | · | · |

_Legend: · pass · ~ partial · ✗ fail_

> **eval-3**: item 3 fail — suboptimal_move diagnosed with generic positional filler ('central buildup', 'more connected', 'fight for the center'); no player-findable reason. item 7 partial — better-move rationale is circular ('cleaner structure' vs 'less efficient') and never addresses the real weakness (col3 loses). item 8 partial — misleading framing: calls the 4-minor-threat best move 'cleaner/stronger' and the 5-minor-threat played move 'less efficient' with no basis. item 9 fail — reasoning is score-flavored/filler; true reason (col4 draws, col3 loses) absent; decisive grounding gap.
> Causes: item 3/9: prompt category suboptimal_move with no look-ahead section and threat rows that point opposite the true reason, so the model fell back to generic central-control filler. item 7: prompt offers no concrete weakness for the blunder beyond 'gives ground', so rationale stays circular. item 8: threat-comparison instruction invites reading minor-threat counts 'in whichever direction', and here fewer-is-better, producing an unjustified more=worse framing.

> **eval-5**: item 3 partial — primary pattern named is [term:odd_even_threat] rather than the drawing_move category; the draw appears only as a closing clause. item 7 fail — cited minor-threat counts argue against the conclusion: best leaves opponent at 6 vs played 5, and best leaves you 6 vs played 9, so the numbers point the wrong way. item 8 fail — omits/mislabels the actually decisive feature: the better move creates a player MAJOR threat at c3r4 (confirmed on the after-best board), but the explanation calls it a 'developing'(minor) threat and implies col6 reduced opponent threats when it did not. item 9 partial — reasoning is threat-count-based (board features, not pure score-flavor), but the decisive major threat is buried and mislabeled.
> Causes: items 3/8/9: the KB term [term:odd_even_threat] was injected with no data section demonstrating an odd/even threat-choice structure, steering the model to an odd-even headline and away from the concrete major-threat story that distinguishes the moves. item 7: the threat comparison supplies parallel minor-threat counts that do not monotonically favor col6, and the 'read in whichever direction' guidance let the model cite numbers that contradict its own conclusion while underweighting the player-major-best=1 row that is the real reason.

> **eval-7**: item 8 fail — minor-threat counts inverted: explanation claims col7 (best) leaves opponent 2 minor threats vs 5 before, but data/board show col7 keeps 5 and the played col6 is the one at 2; misleading framing that the better move reduced threats.
> Causes: item 8 — threat comparison provided only opponent minor-threat rows (pre 5 / best 5 / played 2) and omitted the opponent major-threat row that actually tells the forced-block story (c7r4 present pre, removed after col7, still present after col6); model transposed the played-move count onto the better move.

> **eval-9**: item 3 fail — suboptimal_move: core reason is generic positional ('stronger central space','more active','long-range plan'); minor-threat counts cited are equal (2 vs 2), not a distinguishing board feature. item 7 fail — better-move rationale 'kept your build at 2 instead of leaving it at 2' is self-undermining (same count), does not address a real weakness. item 8 fail — self-contradiction/misleading: 'gave away a real minor threat' but board shows played move still has 2 minor threats; nothing was given away. item 9 fail — reason is filler/score-flavored; true decisive reason (col4 holds draw, col2 loses) unsupported in prompt = grounding_gap, so brevity not acceptable.
> Causes: item 3/9 — decisive outcome flip (col4=0 draw vs col2=-2 loss) never surfaced in prompt; no look-ahead section, only an equal minor-threat row and vague 'gives ground' insight, so model fell back on generic positional padding. item 7/8 — equal minor-threat data (2 vs 2) plus instruction to name a pattern 'given away' forced an incoherent 'gave away/kept at 2 vs 2' claim.

> **eval-10**: item 8 partial — frames 'fewer minor threats overall (2 instead of 5)' for the better move as a benefit, but those are YOUR own minor threats; fewer of your own threats is normally worse, so the clause is misleading and given no justifying 'because'.
> Causes: item 8: the prompt's threat-comparison guidance/example ('the better move left you with no minor threats and was still stronger because…') models presenting fewer own threats positively; the LLM copied the framing but dropped the required justification.

> **eval-13**: item 3 fail — primary reason is generic positional ('more controlled','give ground'), no reproducible board feature for a suboptimal_move; item 7 partial — better-move rationale is a vacuous mirror of the blunder ('no need to give ground'), addresses no concrete weakness; item 8 fail — misleading framing that the played move's 8 minor threats vs best's 2 is 'steadier', implying fewer threats = better, which is not the real reason (col4 holds a draw, col5 loses); item 9 fail — core reason is score-flavored/filler on a decisive outcome-flip position (draw vs loss) with no findable board feature.
> Causes: item 3/9 — grounding gap: decisive outcome_flip (premove col4=0 draw, col5=-4 loss) but prompt supplied no look-ahead and only misleading minor-threat rows, so the model fell back to generic positional language; item 7 — no concrete weakness was grounded, forcing a circular rationale; item 8 — threat comparison shows blunder with MORE minor threats (8 vs 2), inviting the false 'fewer is steadier' inversion.

> **eval-16**: item 3 partial — primary reason mixes generic 'central control' with a speculative figure-7 fork; for a suboptimal_move it names no reproducible board feature a player could find. item 9 partial — gives the sanctioned central-control reason and names the figure-7 from the lookahead, but stays at concept level and never points at the concrete future squares the lookahead provided.
> Causes: item 3: position is a 2-disc opening with only a small speed gap (premove correct -1 vs played -2), so there is no concrete tactical feature; the lookahead injected a speculative figure-7 that the boards (Major threats: none) cannot support. item 9: the 'What the better move leads to' section supplied future-figure_7 zone tags, but the explanation rendered only the bare concept, leaving the player nothing concrete to locate.

> **eval-17**: item 7 partial — better-move rationale (your minor threats 5->7) does not directly address the named weakness (opponent's j-shape build on c3r2/c4r3/c3r4/c4r4); col3 occupying the contested cell c3r4 is left implicit. item 8 partial — misleading framing: objectively lost position (all premove scores negative, best -3) narrated as offensive 'more pressure on your own plan', obscuring the real distinction (col3 loses slower).
> Causes: item 7 — prompt mixes two stories: key insight about opponent's j-shape trap plus a threat-comparison instruction about YOUR minor threats, with no bridge. item 8 — 'more pressure on your own plan' key-insight framing plus mandated threat-growth comparison push an offensive narrative the lost-position data (speed) cannot support.

> **eval-19**: item 9 partial — references look-ahead concepts (J-shape, double threat) but never points at the specific squares the prompt's zone tags provided; leans on filler ('gave ground', 'more compact', 'better chance').
> Causes: item 9 — prompt supplied opp-future-j_shape and future-double_threat zone tags marking exact cells, but explanation stayed at the conceptual level and added vague positional padding instead of naming the squares.

> **eval-20**: item 3 partial — primary concept named is immediate_threat, not the category's j_shape (no j_shape vocab in prompt). item 8 fail — self-contradiction: says the better move 'kept no major threats' then names an immediate threat (which is a major threat) at c4r6; the threat-count framing is muddled (col2 shown with MORE major threats yet worse).
> Causes: item 3 — prompt supplied no j_shape KB term and gave immediate_threat as the Best-move tactical evidence, steering the model to immediate_threat rather than the category label. item 8 — the prompt's threat comparison 'After the best move: major threats: none' contradicts the after-best board ('Major threats: col4 row6 (Gn) [GT]') and the Best-move tactical evidence ('immediate_threat: cells [c4r6]'); the model dutifully copied 'no major threats' and also named the immediate threat, producing the contradiction.

> **eval-23**: item 3 fail — suboptimal_move but only generic positional ('more room', 'pressure in the middle'), no reproducible board feature (col4 parity completion 1O->0E unused). item 7 partial — col7 sentence is a disconnected rationale not tied to the named weakness. item 8 fail — col7 row4 major threat is YOUR (Gn) threat and is unchanged on all three boards, yet framed as relevant to opponent's comfort and 'keep that side under control' (misleading direction/irrelevant). item 9 fail — reasoning is generic filler ('more room to work with later'); no player-findable feature.
> Causes: item 3/9: sparse losing position (best -1) with no look-ahead data; prompt fallback explicitly invites 'keeps more of the board open / more future possibilities' filler, which the LLM reproduced. item 7/8: prompt lists col7 major threat (Gn) without pinning that it is the player's own and unchanged by the move, so the LLM mis-framed it as opponent-relevant.

> **eval-28**: item 8 partial — explanation says the opponent 'uses the stacked cells c2r4,c2r5 to undercut'; the real undercut comes from the opponent's LOWER threat at c2r3, while c2r4 is the player's own [Gy] threat being undercut, so the cited cells point at the wrong location/ownership.
> Causes: item 8 — prompt's Strategic reference cells label [c2r4,c2r5] as 'YOUR OPPONENT's threat cells', but c2r4 is the player's own major threat on the played board and the actual undercutting cell c2r3 is omitted; the model faithfully used the (mislabeled) cells it was handed.

> **eval-33**: item 9 partial — core rationale is filler ('kept your shape more central', 'more useful for future play', 'stronger way to press'); it does relay the offered look-ahead (figure-7 cells) but that fork is speculative on a 2-disc board, so the concrete content is thin.
> Causes: item 9 — generator's '## What the better move leads to' section pushed a 'future figure-7 fork' on a quiet near-empty position with no supporting structure; LLM faithfully relayed placeholder zone cells, leaving a partly-filler explanation.

> **eval-37**: item 9 fail — core reason is generic filler ('keep your position tied down more securely', 'easier counterplay', 'held the draw you had in hand'); no board feature (parity, cells, who-wins-first) a player could reproduce, on a position that was actually a decisive thrown-away win (+1 col6 vs 0 col7).
> Causes: item 9 — sparse position (is_sparse=true) with no '## What the better move leads to' section and lookahead_fired=false; the key insight downplays the +1 win for col6 to 'held at least a draw' (drawing_move-mislabels-wins bug), so the model had no concrete consequence to name and fell back to vague balance/counterplay language.

> **eval-38**: item 8 fail — overcut direction inverted: explanation says 'your opponent's higher threat... your lower disc to neutralize it', but boards show opponent's col5 threat is LOWER (c5r4) and YOUR major threat is HIGHER (c5r6); overcut means YOUR higher threat wins, so the geometry/ownership framing is backwards.
> Causes: item 8 — the prompt's '## Move context' Key insight states the pattern inverted ('a column where your lower disc neutralizes their upper threat'), which describes an undercut, not the overcut the board shows; the model faithfully restated the defective key insight.

> **eval-40**: item 9 fail — core reason is pure filler ('steadier balance', 'safer path on the board') plus restating landing cells; no findable board feature distinguishes the moves.
> Causes: item 9 — prompt offered no look-ahead section (is_sparse, lookahead_fired=false, sparse_no_winner) and its key insight mislabels the actual +1 win (premove_scores[1]=1) as merely 'held at least a draw', so the model had no concrete consequence to ground on and fell back to filler.

> **eval-42**: item 8 fail — claims column 5 'would have kept that sequence unavailable', but the board shows col5 still loses (score -3) to the same forced win; premove every column loses, so col5 only delays the loss rather than avoiding it. Misleading framing of a speed/delay difference as avoidance.
> Causes: item 8 — prompt Move context asserts 'Key insight: Your move handed your opponent a forced win. Column 5 would have kept this sequence unavailable', a false premise (col5 also loses); the LLM repeated it verbatim.

> **eval-43**: item 2 fail — denies an existing win: premove col7=+3 and played_scores all <0 mean column 7 still forces a win, yet the explanation says you 'threw it away' / left yourself 'without the decisive continuation'. item 8 fail — misleading framing: both moves win (col5=+13, col7=+3); the 'had a forced win and let it slip' premise treats a speed difference as an outcome flip.
> Causes: item 2/8: the prompt's 'Key insight: You had a forced win and let it slip' and 'Pattern mechanism' assert the win was lost, contradicting the scores (col7 still wins). The LLM faithfully relayed a generator mislabel of a slower-but-still-winning move as a thrown-away forced win.

> **eval-45**: item 3 partial — suboptimal_move; primary reason is generic positional (central control + 'odd row you need'), only borderline player-findable. item 9 partial — leans on filler ('building upward', 'shape more active', 'that side less useful') wrapping a sanctioned central-control reason; no concrete reproducible feature (no parity/fork/who-completes-first).
> Causes: item 3/9: position is lost both ways with a marginal speed gap (-2 vs -3) and no forced look-ahead winner (sparse_no_winner); prompt supplied no tactical fact and authorized a generic 'strategic reason' fallback, so the LLM produced positional filler with no findable board feature.

> **eval-47**: item 3 fail — suboptimal_move with only generic positional claims ('stronger shape', 'more active', 'more pressure on center'); no player-findable board feature. item 7 partial — better-move rationale only loosely tied to the vague 'filled the bottom' weakness, both ends are filler. item 9 fail — decisive outcome_flip (col4 draws=0, col6 loses=-1) but reason is entirely score-flavored/filler; merely names the landing square, which the prompt forbids as a reason.
> Causes: item 3/9 — prompt is sparse (is_sparse=true) and lacks any '## What the better move leads to' section or threat rows on a decisive position; with no concrete fact to ground the draw-vs-loss distinction, the model produced positional filler. item 7 — same lack of concrete structure leaves the rationale loosely coupled.

> **eval-48**: item 2 partial — 'they now have the same dangerous setup on column 6' implies col2 created the col6 threats, but those major threats (col6 row2, col6 row3) exist in all three boards including pre-move and after-best. item 8 fail — claims col3 'would have kept that sequence unavailable', but the opponent's forced win exists after col3 too (every premove column loses; col3 = -4 still losing); the real difference is only speed (col2 -5 loses one move sooner).
> Causes: item 2/8 — prompt Key insight asserts 'Your move handed your opponent a forced win' and 'Column 3 would have kept this sequence unavailable' on a position where all premove columns are negative (forced loss regardless of move); the LLM faithfully reproduced this false avoidability framing.

> **eval-51**: item 2 partial — explanation asserts an unanswerable opponent figure-7 fork (around c5r5/c4r3), but every board snapshot shows 'Major threats: none' for the opponent; the two major threats a figure-7 implies are not visible, though the loss (col1 = -13) is real and the wording hedges as 'build'.
> Causes: item 2 — prompt seeds figure_7 as pattern_category and key insight but supplies no major-threat data instantiating it; only the best side carries tactical evidence (immediate_threat c6r4), so the opponent figure-7 claim has no board corroboration.

> **eval-52**: item 2 fail — claims a figure-7 fork around cols 2-4 the boards don't show (visualizer lists only one major threat, col5 row4 Gn) and asserts col4 'kept that fork structure from forming' though the structure is identical in after-best and after-played boards; item 8 fail — 'much better control of the position' is misleading: Gray is losing in BOTH lines (after best opponent wins +3/+4, after played +12); col4 only loses slower; item 9 fail — offered reason (col4 prevents the fork) is fabricated and the true reason (lost position, col2 loses faster) is hidden behind false 'much better control'.
> Causes: item 2 — prompt key insight asserts a 'Figure-7 fork' and supplies opponent reference cells in cols 2-4, but boards never instantiate two major threats in one column; LLM invented a fork-prevention causal link; item 8 — prompt never tells the LLM both moves lose, so it framed col4 as a saving move; item 9 — no look-ahead/consequence data on a decisive speed gap, so model substituted a fabricated structural benefit.

> **eval-55**: item 1 fail — better move is column 2 but only column 3 is named, implying col 3 was the better play; item 3 fail — primary pattern named is undercut, category is overcut (opposite valence: undercut = player's threat dead); item 5 partial — played col 5 and better col 2 never located by number (only col 3), though no transposition; item 8 fail — misleading framing: 'gave away a real advantage' in a position lost in every column (-5 best premove), foregrounds column 3, and casts a liability-valence undercut as a Green asset.
> Causes: item 1/5 — Best-move tactical evidence (undercut c3r3/c3r4, j_shape c4/c5) and YOUR threat cells all sit in cols 3-5; nothing in the prompt grounds why column 2 is better, so the LLM latched onto col 3 and never named col 2; item 3 — prompt supplied the undercut KB term and undercut tactical evidence for an overcut-category position; item 8 — Move context 'gave away a real advantage' tone contradicts premove scores (all columns losing, best -5), and the undercut framing inherits the prompt's asset-valued presentation of a dead-threat structure.

> **eval-58**: item 8 partial — explanation says col1 left you with 'no major threats' and the better move 'kept your major threat at 1 instead of dropping it from 1 to none', but the visualizer shows Green's major threat at col1 row3 structurally present in BOTH the after-best and after-played boards (gravity-top [GT] after the played move). The 'dropped to none' framing conflicts with the structural board, even though the deeper parity reasoning is correct.
> Causes: item 8 — the prompt's threat-comparison row reports 'After the move played: Your major threats: none' while the board annotation still lists 'col1 row3 (Gn) [GT]'; the model faithfully copied the contradictory threat-row count rather than the board, producing a surface claim a player checking the board would find false.

> **eval-63**: item 7 partial — blunder is framed as ceding claimeven/figure_7 control, but the better-move rationale pivots to minor-threat counts and never explains how col1 preserves that structure. item 8 fail — 'gave opponent a claimeven endgame, they control the pairing' implies opponent wins while Green wins every line (premove +4/+3, all opponent scores negative); and 'only had 6 rather than the more comfortable 4' frames FEWER opponent threats as more comfortable for the opponent (wrong direction); 'giving up the figure 7' misattributes since those cells are unchanged across all boards. item 9 partial — cites concrete board features (minor-threat counts, figure_7 cluster) but applies them contradictorily, so the reasoning isn't cleanly reproducible.
> Causes: item 7 — Key insight (claimeven/pairing) and Best-move tactical evidence (figure_7) point at different structures than the threat-comparison rows the task forces in, so rationale fragments. item 8 — Key insight literally asserts opponent 'control the pairing' on a position the player wins, and opponent minor-threat counts run counter-intuitively (pre 6 / best 6 / played 4), forcing a contorted 'more comfortable 4'. item 9 — same counterintuitive threat data plus no look-ahead section leave no clean distinguishing fact for a speed-only difference.

> **eval-64**: item 2 fail — claims the played move left only 1 major threat (c7r6), but the played board shows Green keeps 2 (col3 row2 [GT] + col7 row6); denies an existing structure. item 7 partial — better-move rationale rests on the false 2-vs-1 threat count plus vague 'less comfortable'. item 9 partial — names z-threat/parity (concrete) but resolves into filler 'preserved more pressure / opponent less comfortable' without a findable parity mechanism.
> Causes: item 2/7 — prompt threat-comparison lists player-major-played=1, contradicting the board (actual 2); the LLM copied it verbatim. item 9 — task permits a vague strategic fallback and the prompt's parity 'key insight' is not decomposed into a reproducible cue.

> **eval-65**: item 3 partial — primary concept named is j_shape (a real, on-board, prompt-supplied pattern that genuinely distinguishes the moves), but pattern_category is odd_even_threat; the explanation never names parity / odd-even / both-parities fork.
> Causes: item 3 — the prompt's KB term definitions and Best-move tactical evidence supplied ONLY j_shape; the odd_even_threat category label was never surfaced to the model, so it faithfully diagnosed the pattern it was given. Upstream classifier/data mismatch, not an explanation error.

## Systematic issues

### Item 8 — Other issues (18 entries)
- Entries: eval-3, eval-5, eval-7, eval-9, eval-10, eval-13, eval-17, eval-20, eval-23, eval-28, eval-38, eval-42, eval-43, eval-48, eval-52, eval-55, eval-58, eval-63
- Categories: suboptimal_move (4), drawing_move (1), forced_block (1), j_shape (3), undercut (1), overcut (2), forced_win (3), figure_7 (1), z_threat (1), claimeven (1)
- Misleading/contradictory framing: threat-count rows that contradict the board or point the wrong direction, ownership/direction errors, and speed-difference positions narrated as outcome flips or 'saving' moves.

### Item 9 — Reproducible reasoning (15 entries)
- Entries: eval-3, eval-5, eval-9, eval-13, eval-16, eval-19, eval-23, eval-33, eval-37, eval-40, eval-45, eval-47, eval-52, eval-63, eval-64
- Categories: suboptimal_move (9), drawing_move (3), figure_7 (1), claimeven (1), z_threat (1)
- Core reason is score-flavored or generic positional filler instead of a player-findable board feature — concentrated in suboptimal_move and drawing_move on quiet/sparse positions with no concrete distinguishing fact.

### Item 3 — Pattern match (11 entries)
- Entries: eval-3, eval-5, eval-9, eval-13, eval-16, eval-20, eval-23, eval-45, eval-47, eval-55, eval-65
- Categories: suboptimal_move (7), drawing_move (1), j_shape (1), overcut (1), odd_even_threat (1)
- Primary pattern doesn't match the category — mostly suboptimal_move falling back to generic positional language, plus a few cases where the prompt supplied a different pattern's KB term/evidence than the category label.

### Item 7 — Internal consistency (9 entries)
- Entries: eval-3, eval-5, eval-9, eval-13, eval-17, eval-23, eval-47, eval-63, eval-64
- Categories: suboptimal_move (5), drawing_move (1), j_shape (1), claimeven (1), z_threat (1)
- Better-move rationale doesn't directly address the named weakness — fragments because the key insight, the tactical evidence, and the forced threat-count comparison point at different structures.

### Item 2 — No hallucinated win/structure (5 entries)
- Entries: eval-43, eval-48, eval-51, eval-52, eval-64
- Categories: forced_win (2), figure_7 (2), z_threat (1)
- Hallucinated or denied structure: figure_7/forced_win explanations assert a fork/forced-win the board doesn't show, or deny a win/threat that is still on the board (threat-count drop).

## Systematic prompt defects

| defect type | entries | ids |
|-------------|---------|-----|
| instruction_data_contradiction | 19 | eval-3, eval-9, eval-10, eval-16, eval-17, eval-20, eval-31, eval-33, eval-37, eval-38, eval-40, eval-42, eval-43, eval-48, eval-49, eval-55, eval-58, eval-61, eval-63 |
| missing_expected_section | 13 | eval-0, eval-1, eval-3, eval-7, eval-9, eval-13, eval-21, eval-23, eval-37, eval-40, eval-45, eval-47, eval-52 |
| vocab_without_data | 9 | eval-5, eval-8, eval-43, eval-51, eval-52, eval-53, eval-55, eval-56, eval-62 |
| direction_mismatch | 3 | eval-13, eval-28, eval-63 |
| data_board_contradiction | 1 | eval-64 |

**instruction_data_contradiction** (19) — The task/key-insight/tone demands something the data can't support — most often a 'gave away an advantage'/'kept the sequence unavailable' framing on positions that are lost (or won) in every line, or a mandated threat-count comparison whose numbers point opposite the conclusion. Source: `server/llmCoachHelpers.js` Move-context key-insight + `server/explainContext.js` threat-comparison builder.
> e.g. eval-3: Task demands a minor-threat count comparison, but After-best shows 4 minor threats vs After-played 5; the data implies more=worse, contradicting the real positional draw-hold reason and pushing a misleading narrative.

**missing_expected_section** (13) — No `## What the better move leads to` look-ahead section on a decisive position. Two sub-cases: (a) legitimately absent on opening/sparse-no-winner boards where a center reason substitutes (eval-0,1,21 — benign); (b) decisive outcome-flip positions where the section is genuinely needed and its absence forces filler (eval-3,9,13,37,40,47,52 — real). Source: `server/explainContext.js` look-ahead gate + `server/sparseLookahead.js`.
> e.g. eval-0: is_sparse=true and lookahead_fired=false but no '## What the better move leads to' section; lookahead_null_reason='sparse_no_winner' — on the empty opening board there is genuinely no forcing line to look ahead to, so the centrality '## Why the better move is stronger' section is the appropriate substitute.

**vocab_without_data** (9) — A `[term:X]` KB term (figure_7, odd_even_threat, j_shape, immediate_threat) is defined/named but no data section instantiates it — the boards show 'Major threats: none', inviting speculative pattern language. Source: `server/explainContext.js` KB-term inclusion vs data-section visibility.
> e.g. eval-5: [term:odd_even_threat] is defined in KB term definitions but no data section instantiates an odd/even parity threat-choice; only major/minor threat COUNT rows are provided, and the genuinely decisive structure is a single even-row major threat (player-major-best=1, [Gy] at c3r4).

**direction_mismatch** (3) — A structure/threat-count exists on the blunder board but the comparison only shows best-move direction, or the blunder REDUCES opponent threats so the count points the wrong way. Source: `server/explainContext.js` show* direction flags.
> e.g. eval-13: Threat comparison shows the BLUNDER move with MORE minor threats (player-minor-played=8) than the best move (player-minor-best=2). The only data presented points the wrong way and cannot express why col5 loses, pushing the model toward the misleading 'fewer threats = steadier' story.

**data_board_contradiction** (1) — Threat-comparison count contradicts the board (player-major-played count drops a `[GT]`/shared-owner threat the board still shows). Source: `server/explainContext.js` major-threat counting.
> e.g. eval-64: Threat comparison: player-major-played=1, but the after-played board lists Green major threats col3 row2 (Gn)[GT] and col7 row6 (Gn+Gy) = 2 (pre and best both = 2); the dropped count is the spine of the explanation's false claim.

## Decisive-but-ungrounded cases (highest-value design signal)

| id | category | true_reason | lookahead_fired | suspected_generator | missing |
|----|----------|-------------|-----------------|---------------------|---------|
| eval-3 | suboptimal_move | outcome_flip | false | runSparseLookahead | forward look-ahead / concrete consequence showing col3 loses while col4 holds a draw; prov |
| eval-9 | suboptimal_move | outcome_flip | false | runSparseLookahead | Decisive draw-vs-loss distinction (correct col4 premove=0 draw, played col2 premove=-2 los |
| eval-13 | suboptimal_move | outcome_flip | false | runSparseLookahead | No fact supporting why col4 is better — it holds a draw (0) while col5 loses (-4); no look |
| eval-37 | drawing_move | outcome_flip | false | runSparseLookahead | the concrete winning line that makes col6 (+1) beat col7 (0) — a thrown-away win, not mere |
| eval-40 | drawing_move | parity_positional | false | runSparseLookahead | col2 (+1) actually wins vs col3 (0) draw — a deep parity/zugzwang edge; no threat rows, no |
| eval-47 | suboptimal_move | outcome_flip | false | runSparseLookahead | a concrete forward consequence — that column 6 loses while column 4 holds the draw; no loo |
| eval-52 | figure_7 | speed | false | runSparseLookahead | no look-ahead or consequence data showing both moves lose and col4 merely loses slower; pr |

All 7 grounding gaps share `suspected_generator: runSparseLookahead` and `lookahead_fired=false`. Grouped by true_reason:

- **outcome_flip (eval-3, 9, 13, 37, 47)** — the better move holds a win/draw and the played move loses, but no `## What the better move leads to` section names the consequence. `runSparseLookahead` did not fire: on the non-sparse cases (eval-9,13) the position was never gated for sparse look-ahead at all; on sparse cases (eval-37,47) it returned `sparse_no_winner`. The generator's gating logic does not cover decisive outcome-flip positions where the *opponent's* best replies (not the player's mistakes) are what need exploring. **This is a generator-logic defect, not a budget/depth tweak.**
- **parity_positional (eval-40)** — col2 actually *wins* (+1) vs col3 draw, but the move was tagged `drawing_move` and the key insight reframes the win as 'held at least a draw'. No generator produces a parity/zugzwang reason, and the mislabel hides the win. Confirms the open `drawing_move mislabels wins` bug.
- **speed (eval-52)** — both moves lose; the figure_7 key insight fabricated a 'fork prevention' story instead of stating that the better move merely loses slower. No look-ahead and no honest 'both lose' cue.

## Raw explanations (success entries)

### eval-0 — drawing_move (sev 0)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 0  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |   |   |   |   |
  1  |   |   |   |   |   |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      |      |      |      |      |
  1  |      |      |      |      |      |      |      |

  ht |   0  |   0  |   0  |   0  |   0  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  6E  |  6E  |  6E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 1  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |   |   |   |   |
  1  |   |   |   |Gn |   |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      |      |      |      |      |
  1  |      |      |      | Gn 1 |      |      |      |

  ht |   0  |   0  |   0  |   1  |   0  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  6E  |  5O  |  6E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 1  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |   |   |   |   |
  1  |   |   |   |   |Gn |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      |      |      |      |      |
  1  |      |      |      |      | Gn 1 |      |      |

  ht |   0  |   0  |   0  |   0  |   1  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  6E  |  6E  |  5O  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: small
- Move played: column 5
- Your move placed a disc on c5r1.
- Better move: column 4
- The better move places a disc on c4r1.
- Key insight: You had a move that would have held at least a draw, and this move gave that balance up.

## Why the better move is stronger

In the opening, the more central a column is, the more four-in-a-row lines run through it, so it can take part in more future threats and shapes. Column 4 sits in more of those lines than column 5, so playing there keeps more ways to build a winning connection open, while the less central choice gives some of them up.

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
The move you played results in a draw, but a stronger move was available — explain what that better move would have secured. Do NOT claim the position AFTER your move is winning for you or for your opponent; describe only what the better move would have held or built. (A better move may itself have been stronger than a draw — do not deny that a better option existed.)
Column numbers (1–7) are always valid to reference — they appear in every board header.
Only omit specific CELL references (e.g. c4r3) if the cell is not listed in the boards above.

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Do not invent tactical concept names — describe only what you can see changing between the two boards. Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. A "## Why the better move is stronger" section above gives the concrete reason for THIS position — build your explanation on it (centrality / number of winning lines), do not substitute a vaguer one. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

Playing [zone:col5]column 5[/zone:col5] was a small slip because it gives up some of the central reach you could have kept. [zone:col4]Column 4[/zone:col4] is more central, so [zone:c4r1]that cell[/zone:c4r1] would have preserved more of the lines that run through the middle and kept your position at least as safe as a draw, while [zone:c5r1]your chosen cell[/zone:c5r1] was a little less flexible.

---

### eval-1 — suboptimal_move (sev 0)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 2  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |   |Gy |   |   |
  1  |   |   |   |   |Gn |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      |      | Gy 2 |      |      |
  1  |      |      |      |      | Gn 1 |      |      |

  ht |   0  |   0  |   0  |   0  |   2  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  6E  |  6E  |  4E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 3  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |   |Gy |   |   |
  1  |   |   |   |Gn |Gn |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      |      | Gy 2 |      |      |
  1  |      | (gn) | (gn) | Gn 3 | Gn 1 | (gn) | (gn) |

  ht |   0  |   0  |   0  |   1  |   2  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  6E  |  5O  |  4E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 3  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |Gn |   |   |
  2  |   |   |   |   |Gy |   |   |
  1  |   |   |   |   |Gn |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      | Gn 3 |      |      |
  2  |      |      |      |      | Gy 2 |      |      |
  1  |      |      |      |      | Gn 1 |      |      |

  ht |   0  |   0  |   0  |   0  |   3  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  6E  |  6E  |  3O  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: moderate
- Move played: column 5
- Your move placed a disc on c5r3.
- Better move: column 4
- The better move places a disc on c4r1.
- Key insight: There was a stronger move — this one gives ground.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing an actual count, copy the zone tag shown on that line and wrap the count with it; when a line shows "none", just say so in plain words (e.g. "no minor threats") with no tag. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your minor threats: none

After the best move (column 4):
- Your minor threats: [zone:player-minor-best]4[/zone:player-minor-best]

After the move played (column 5):
- Your minor threats: none

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
Column numbers (1–7) are always valid to reference — they appear in every board header.
Only omit specific CELL references (e.g. c4r3) if the cell is not listed in the boards above.

## Tone
This move gave away a real advantage; explain the concrete consequence.

## KB term definitions

The following tactical concepts apply to this position:

- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

You gave away the stronger [term:minor_threat]minor threat[/term:minor_threat]: the better move in [zone:col4]column 4[/zone:col4] would have left you with [zone:windows:c2r1|c3r1|c6r1|c7r1]4[/zone:windows:c2r1|c3r1|c6r1|c7r1], while your move in [zone:col5]column 5[/zone:col5] left you with no minor threats at all. By playing in [zone:col5]column 5[/zone:col5], you settled for stacking your own disc instead of keeping the stronger build from [zone:c4r1]that cell[/zone:c4r1], which would have done more to preserve your long-term pressure.

---

### eval-2 — drawing_move (sev 0)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on EVEN rows (2,4,6).
Your opponent wins on ODD rows (1,3,5).

## Boards
### Before the move
Move 3  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |Gn |   |   |
  2  |   |   |   |   |Gy |   |   |
  1  |   |   |   |   |Gn |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      | Gn 3 |      |      |
  2  |      |      |      |      | Gy 2 |      |      |
  1  |      |      |      |      | Gn 1 |      |      |

  ht |   0  |   0  |   0  |   0  |   3  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  6E  |  6E  |  3O  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 4  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |Gn |   |   |
  2  |   |   |   |   |Gy |   |   |
  1  |   |   |   |Gy |Gn |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      | (gy) |
  3  |      |      |      |      | Gn 3 | (gy) |      |
  2  |      |      |      |      | Gy 2 |      |      |
  1  |      |      |      | Gy 4 | Gn 1 |      |      |

  ht |   0  |   0  |   0  |   1  |   3  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  6E  |  5O  |  3O  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 4  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |Gy |   |   |
  3  |   |   |   |   |Gn |   |   |
  2  |   |   |   |   |Gy |   |   |
  1  |   |   |   |   |Gn |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      | Gy 4 |      |      |
  3  |      |      |      |      | Gn 3 |      |      |
  2  |      |      |      |      | Gy 2 |      |      |
  1  |      |      |      |      | Gn 1 |      |      |

  ht |   0  |   0  |   0  |   0  |   4  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  6E  |  6E  |  2E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gy = your discs, Gn = your opponent's discs.

## Move context
- Your winning rows: EVEN (2,4,6)
- Eval gap: moderate
- Move played: column 5
- Your move placed a disc on c5r4.
- Better move: column 4
- The better move places a disc on c4r1.
- Key insight: You had a move that would have held at least a draw, and this move gave that balance up.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing an actual count, copy the zone tag shown on that line and wrap the count with it; when a line shows "none", just say so in plain words (e.g. "no minor threats") with no tag. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your minor threats: none

After the best move (column 4):
- Your minor threats: [zone:player-minor-best]2[/zone:player-minor-best]

After the move played (column 5):
- Your minor threats: none

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
The move you played results in a draw, but a stronger move was available — explain what that better move would have secured. Do NOT claim the position AFTER your move is winning for you or for your opponent; describe only what the better move would have held or built. (A better move may itself have been stronger than a draw — do not deny that a better option existed.)
Column numbers (1–7) are always valid to reference — they appear in every board header.
Only omit specific CELL references (e.g. c4r3) if the cell is not listed in the boards above.

## Tone
This move gave away a real advantage; explain the concrete consequence.

## KB term definitions

The following tactical concepts apply to this position:

- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

By playing [zone:col5]column 5[/zone:col5], you gave up the safer hold on the position and let your opponent keep the balance, even though the better move was available. The missed idea was a [term:minor_threat]minor threat[/term:minor_threat]: [zone:col4]column 4[/zone:col4] would have given you [zone:windows:c6r3|c7r4]2[/zone:windows:c6r3|c7r4] minor threats while you had no minor threats before and none after your actual move, so it was the stronger way to keep at least a draw and build pressure.

---

### eval-3 — suboptimal_move (sev 0)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 4  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |Gy |   |   |
  3  |   |   |   |   |Gn |   |   |
  2  |   |   |   |   |Gy |   |   |
  1  |   |   |   |   |Gn |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      | Gy 4 |      |      |
  3  |      |      |      |      | Gn 3 |      |      |
  2  |      |      |      |      | Gy 2 |      |      |
  1  |      |      |      |      | Gn 1 |      |      |

  ht |   0  |   0  |   0  |   0  |   4  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  6E  |  6E  |  2E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 5  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |Gy |   |   |
  3  |   |   |   |   |Gn |   |   |
  2  |   |   |   |   |Gy |   |   |
  1  |   |   |   |Gn |Gn |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      | Gy 4 |      |      |
  3  |      |      |      |      | Gn 3 |      |      |
  2  |      |      |      |      | Gy 2 |      |      |
  1  |      | (gn) | (gn) | Gn 5 | Gn 1 | (gn) | (gn) |

  ht |   0  |   0  |   0  |   1  |   4  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  6E  |  5O  |  2E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 5  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |Gy |   |   |
  3  |   |   |   |   |Gn |   |   |
  2  |   |   |   |   |Gy |   |   |
  1  |   |   |Gn |   |Gn |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      | Gy 4 | (gn) |      |
  3  |      |      |      |      | Gn 3 |      |      |
  2  |      |      |      | (gn) | Gy 2 |      |      |
  1  |      | (gn) | Gn 5 | (gn) | Gn 1 | (gn) |      |

  ht |   0  |   0  |   1  |   0  |   4  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  5O  |  6E  |  2E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: moderate
- Move played: column 3
- Your move placed a disc on c3r1.
- Better move: column 4
- The better move places a disc on c4r1.
- Key insight: There was a stronger move — this one gives ground.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing an actual count, copy the zone tag shown on that line and wrap the count with it; when a line shows "none", just say so in plain words (e.g. "no minor threats") with no tag. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your minor threats: none

After the best move (column 4):
- Your minor threats: [zone:player-minor-best]4[/zone:player-minor-best]

After the move played (column 3):
- Your minor threats: [zone:player-minor-played]5[/zone:player-minor-played]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
Column numbers (1–7) are always valid to reference — they appear in every board header.
Only omit specific CELL references (e.g. c4r3) if the cell is not listed in the boards above.

## Tone
This move gave away a real advantage; explain the concrete consequence.

## KB term definitions

The following tactical concepts apply to this position:

- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

You gave away the stronger central buildup by playing [zone:col3]column 3[/zone:col3] instead of [zone:col4]column 4[/zone:col4], which would have kept your pieces more connected around the middle. That better move would have preserved the cleaner [term:minor_threat]minor threat[/term:minor_threat] structure shown there at [zone:windows:c2r1|c3r1|c6r1|c7r1]4[/zone:windows:c2r1|c3r1|c6r1|c7r1], while your move left you with a less efficient setup at [zone:windows:c2r1|c4r1|c4r2|c6r1|c6r4]5[/zone:windows:c2r1|c4r1|c4r2|c6r1|c6r4] and no improvement in the fight for the center.

---

### eval-4 — suboptimal_move (sev 0)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 6  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |Gy |   |   |
  3  |   |   |   |   |Gn |   |   |
  2  |   |   |   |   |Gy |   |   |
  1  |   |   |Gn |Gy |Gn |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      | Gy 4 | (gn) | (gy) |
  3  |      |      |      |      | Gn 3 | (gy) |      |
  2  |      |      |      | (gn) | Gy 2 |      |      |
  1  |      |      | Gn 5 | Gy 6 | Gn 1 |      |      |

  ht |   0  |   0  |   1  |   1  |   4  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  5O  |  5O  |  2E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 7  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |Gy |   |   |
  3  |   |   |   |   |Gn |   |   |
  2  |   |   |Gn |   |Gy |   |   |
  1  |   |   |Gn |Gy |Gn |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      | (gn) |      | Gy 4 | (gn) | (gy) |
  3  |      |      | (gn) |      | Gn 3 | (gy) |      |
  2  |      |      | Gn 7 | (gn) | Gy 2 |      |      |
  1  |      |      | Gn 5 | Gy 6 | Gn 1 |      |      |

  ht |   0  |   0  |   2  |   1  |   4  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  4E  |  5O  |  2E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 7  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |Gy |   |   |
  3  |   |   |   |   |Gn |   |   |
  2  |   |   |   |Gn |Gy |   |   |
  1  |   |   |Gn |Gy |Gn |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      | (gn) |
  4  |      | (gn) |      |      | Gy 4 | [Gn] | (gy) |
  3  |      |      | (gn) |      | Gn 3 | (gy) |      |
  2  |      |      |      | Gn 7 | Gy 2 |      |      |
  1  |      |      | Gn 5 | Gy 6 | Gn 1 |      |      |

  ht |   0  |   0  |   1  |   2  |   4  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  5O  |  4E  |  2E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: col6 row4 (Gn)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: small
- Move played: column 4
- Your move placed a disc on c4r2.
- Better move: column 3
- The better move places a disc on c3r2.
- Key insight: There was a stronger move — this one gives ground.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing an actual count, copy the zone tag shown on that line and wrap the count with it; when a line shows "none", just say so in plain words (e.g. "no minor threats") with no tag. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your major threats: none
- Your minor threats: [zone:player-minor-pre]2[/zone:player-minor-pre]

After the best move (column 3):
- Your major threats: none
- Your minor threats: [zone:player-minor-best]4[/zone:player-minor-best]

After the move played (column 4):
- Your major threats: [zone:player-major-played]1[/zone:player-major-played]
- Your minor threats: [zone:player-minor-played]2[/zone:player-minor-played]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
Column numbers (1–7) are always valid to reference — they appear in every board header.
Only omit specific CELL references (e.g. c4r3) if the cell is not listed in the boards above.

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

## KB term definitions

The following tactical concepts apply to this position:

- [term:major_threat] **major threat** (major_threat): A major threat is a four-cell window containing three of your discs and one empty cell.
If that empty cell is the next playable cell in its column (gravity-top), it wins the
game immediately; otherwise it is a latent threat that will become decisive as the
board fills.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

By playing in [zone:col4]column 4[/zone:col4], you gave up the stronger [term:minor_threat]minor threat[/term:minor_threat] plan that you could have kept with [zone:col3]column 3[/zone:col3]: that move would have left you with [zone:windows:c3r3|c3r4|c4r2|c6r4]4[/zone:windows:c3r3|c3r4|c4r2|c6r4] minor threats instead of just [zone:windows:c2r4|c3r3]2[/zone:windows:c2r4|c3r3]. It was a small inaccuracy because your move did create a [term:major_threat]major threat[/term:major_threat] ([zone:windows:c6r4]1[/zone:windows:c6r4]), but the better move kept more of your long-range pressure alive and gave you a stronger overall shape.

---

### eval-5 — drawing_move (sev 1)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on EVEN rows (2,4,6).
Your opponent wins on ODD rows (1,3,5).

## Boards
### Before the move
Move 9  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |Gn |Gy |   |   |
  3  |   |   |   |Gy |Gn |   |   |
  2  |   |   |   |Gn |Gy |   |   |
  1  |   |   |Gn |Gy |Gn |   |   |

        1      2      3      4      5      6      7   
  6  |      | (gn) |      |      |      |      | (gy) |
  5  |      | (gy) | (gn) |      |      | (gy) | (gn) |
  4  |      | (gn) | (gy) | Gn 9 | Gy 4 | [Gn] | (gy) |
  3  |      |      | (gn) | Gy 8 | Gn 3 | (gy) |      |
  2  |      |      | (gy) | Gn 7 | Gy 2 | (gn) |      |
  1  |      | (gy) | Gn 5 | Gy 6 | Gn 1 | (gy) | (gn) |

  ht |   0  |   0  |   1  |   4  |   4  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  5O  |  2E  |  2E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: col6 row4 (Gn)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 10  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |Gn |Gy |   |   |
  3  |   |   |   |Gy |Gn |   |   |
  2  |   |   |   |Gn |Gy |   |   |
  1  |   |   |Gn |Gy |Gn |Gy |   |

        1      2      3      4      5      6      7   
  6  |      | (gn) |      |      |      |      | (gy) |
  5  |      | (gy) | (gn) |      |      | (gy) | (gn) |
  4  |      | (gn) | [Gy] | Gn 9 | Gy 4 | [Gn] | (gy) |
  3  |      |      | (gn) | Gy 8 | Gn 3 | (gy) |      |
  2  |      |      | (gy) | Gn 7 | Gy 2 | (gn) |      |
  1  |      | (gy) | Gn 5 | Gy 6 | Gn 1 | Gy10 | (gn) |

  ht |   0  |   0  |   1  |   4  |   4  |   1  |   0  |  (discs in column)
 par |  6E  |  6E  |  5O  |  2E  |  2E  |  5O  |  6E  |  (empty cells: O=odd E=even)
  Major threats: col3 row4 (Gy)   col6 row4 (Gn)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 10  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |Gn |Gy |   |   |
  3  |   |   |   |Gy |Gn |   |   |
  2  |   |   |   |Gn |Gy |   |   |
  1  |   |   |Gn |Gy |Gn |   |Gy |

        1      2      3      4      5      6      7   
  6  |      | (gn) |      |      |      |      | (gy) |
  5  |      | (gy) | (gn) |      |      | (gy) | (gn) |
  4  |      | (gn) | (gy) | Gn 9 | Gy 4 | [Gn] | (gy) |
  3  |      |      | (gn) | Gy 8 | Gn 3 | (gy) |      |
  2  |      |      | (gy) | Gn 7 | Gy 2 | (gn) |      |
  1  |      | (gy) | Gn 5 | Gy 6 | Gn 1 | (gy) | Gy10 |

  ht |   0  |   0  |   1  |   4  |   4  |   0  |   1  |  (discs in column)
 par |  6E  |  6E  |  5O  |  2E  |  2E  |  6E  |  5O  |  (empty cells: O=odd E=even)
  Major threats: col6 row4 (Gn)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gy = your discs, Gn = your opponent's discs.

## Move context
- Your winning rows: EVEN (2,4,6)
- Eval gap: moderate
- Move played: column 7
- Your move placed a disc on c7r1.
- Better move: column 6
- The better move places a disc on c6r1.
- Key insight: You had a move that would have held at least a draw, and this move gave that balance up.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing an actual count, copy the zone tag shown on that line and wrap the count with it; when a line shows "none", just say so in plain words (e.g. "no minor threats") with no tag. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your major threats: none
- Your minor threats: [zone:player-minor-pre]9[/zone:player-minor-pre]
- Opponent minor threats: [zone:opponent-minor-pre]6[/zone:opponent-minor-pre]

After the best move (column 6):
- Your major threats: [zone:player-major-best]1[/zone:player-major-best]
- Your minor threats: [zone:player-minor-best]6[/zone:player-minor-best]
- Opponent minor threats: [zone:opponent-minor-best]6[/zone:opponent-minor-best]

After the move played (column 7):
- Your major threats: none
- Your minor threats: [zone:player-minor-played]9[/zone:player-minor-played]
- Opponent minor threats: [zone:opponent-minor-played]5[/zone:opponent-minor-played]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
The move you played results in a draw, but a stronger move was available — explain what that better move would have secured. Do NOT claim the position AFTER your move is winning for you or for your opponent; describe only what the better move would have held or built. (A better move may itself have been stronger than a draw — do not deny that a better option existed.)
Column numbers (1–7) are always valid to reference — they appear in every board header.
Only omit specific CELL references (e.g. c4r3) if the cell is not listed in the boards above.

## Tone
This move gave away a real advantage; explain the concrete consequence.

## KB term definitions

The following tactical concepts apply to this position:

- [term:odd_even_threat] **odd even threat** (odd_even_threat): An odd-even threat choice arises when the player can build toward a winning threat
in two columns — one landing on an odd row, one on an even row, neither yet playable.
The odd-row threat is always preferred because Yellow's claimeven strategy cannot
neutralise threats on odd rows.
- [term:major_threat] **major threat** (major_threat): A major threat is a four-cell window containing three of your discs and one empty cell.
If that empty cell is the next playable cell in its column (gravity-top), it wins the
game immediately; otherwise it is a latent threat that will become decisive as the
board fills.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

You gave away the [term:odd_even_threat]odd even threat[/term:odd_even_threat] balance by playing in [zone:col7]column 7[/zone:col7]: the better move in [zone:col6]column 6[/zone:col6] would have kept your opponent down to [zone:windows:c2r4|c2r6|c3r3|c3r5|c6r2|c7r1]6[/zone:windows:c2r4|c2r6|c3r3|c3r5|c6r2|c7r1] minor threats while also preserving one of your own developing threats at [zone:windows:c2r1|c3r2|c6r3|c6r5|c7r4|c7r6]6[/zone:windows:c2r1|c3r2|c6r3|c6r5|c7r4|c7r6]. Instead, your move left you with no major threats and only [zone:windows:c2r1|c2r5|c3r2|c3r4|c6r1|c6r3|c6r5|c7r4|c7r6]9[/zone:windows:c2r1|c2r5|c3r2|c3r4|c6r1|c6r3|c6r5|c7r4|c7r6] minor threats, so you gave up the stronger hold that would have held at least a draw.

---

### eval-6 — undercut (sev 0)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 18  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |Gy |   |   |   |
  5  |   |   |   |Gy |Gn |   |   |
  4  |   |   |   |Gn |Gy |Gy |   |
  3  |   |   |   |Gy |Gn |Gn |   |
  2  |   |   |   |Gn |Gy |Gn |Gy |
  1  |   |   |Gn |Gy |Gn |Gn |Gy |

        1      2      3      4      5      6      7   
  6  |      | (gn) |      | Gy14 |      | (gn) | (gy) |
  5  |      | (gy) | [Gn] | Gy12 | Gn11 | (gy) |      |
  4  |      | (gn) | (gy) | Gn 9 | Gy 4 | Gy18 | (gy) |
  3  |      |      | (gn) | Gy 8 | Gn 3 | Gn17 | (gy) |
  2  |      | (gn) | (gy) | Gn 7 | Gy 2 | Gn15 | Gy16 |
  1  |      | (gy) | Gn 5 | Gy 6 | Gn 1 | Gn13 | Gy10 |

  ht |   0  |   0  |   1  |   6  |   5  |   4  |   2  |  (discs in column)
 par |  6E  |  6E  |  5O  |  0E  |  1O  |  2E  |  4E  |  (empty cells: O=odd E=even)
  Major threats: col3 row5 (Gn)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 19  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |Gy |   |   |   |
  5  |   |   |   |Gy |Gn |   |   |
  4  |   |   |   |Gn |Gy |Gy |   |
  3  |   |   |   |Gy |Gn |Gn |   |
  2  |   |   |Gn |Gn |Gy |Gn |Gy |
  1  |   |   |Gn |Gy |Gn |Gn |Gy |

        1      2      3      4      5      6      7   
  6  |      | (gn) |      | Gy14 |      | (gn) | (gy) |
  5  |      | (gy) | [Gn] | Gy12 | Gn11 | (gy) |      |
  4  |      | (gn) | (*)  | Gn 9 | Gy 4 | Gy18 | (gy) |
  3  |      |      | (gn) | Gy 8 | Gn 3 | Gn17 | (gy) |
  2  | (gn) | (gn) | Gn19 | Gn 7 | Gy 2 | Gn15 | Gy16 |
  1  |      |      | Gn 5 | Gy 6 | Gn 1 | Gn13 | Gy10 |

  ht |   0  |   0  |   2  |   6  |   5  |   4  |   2  |  (discs in column)
 par |  6E  |  6E  |  4E  |  0E  |  1O  |  2E  |  4E  |  (empty cells: O=odd E=even)
  Major threats: col3 row5 (Gn)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 19  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |Gy |   |   |   |
  5  |   |   |   |Gy |Gn |   |   |
  4  |   |   |   |Gn |Gy |Gy |   |
  3  |   |   |   |Gy |Gn |Gn |   |
  2  |   |   |   |Gn |Gy |Gn |Gy |
  1  |   |Gn |Gn |Gy |Gn |Gn |Gy |

        1      2      3      4      5      6      7   
  6  |      | (gn) |      | Gy14 |      | (gn) | (gy) |
  5  |      | (gy) | [Gn] | Gy12 | Gn11 | (gy) |      |
  4  |      | (gn) | (gy) | Gn 9 | Gy 4 | Gy18 | (gy) |
  3  |      |      | (gn) | Gy 8 | Gn 3 | Gn17 | (gy) |
  2  |      | (gn) | (gy) | Gn 7 | Gy 2 | Gn15 | Gy16 |
  1  |      | Gn19 | Gn 5 | Gy 6 | Gn 1 | Gn13 | Gy10 |

  ht |   0  |   1  |   1  |   6  |   5  |   4  |   2  |  (discs in column)
 par |  6E  |  5O  |  5O  |  0E  |  1O  |  2E  |  4E  |  (empty cells: O=odd E=even)
  Major threats: col3 row5 (Gn)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: moderate
- Move played: column 2
- Your move placed a disc on c2r1.
- Better move: column 3
- The better move places a disc on c3r2.
- Key insight: Your move let your opponent undercut your threat — their lower disc now kills your win.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing an actual count, copy the zone tag shown on that line and wrap the count with it; when a line shows "none", just say so in plain words (e.g. "no minor threats") with no tag. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your minor threats: [zone:player-minor-pre]4[/zone:player-minor-pre]
- Opponent minor threats: [zone:opponent-minor-pre]8[/zone:opponent-minor-pre]

After the best move (column 3):
- Your minor threats: [zone:player-minor-best]6[/zone:player-minor-best]
- Opponent minor threats: [zone:opponent-minor-best]6[/zone:opponent-minor-best]

After the move played (column 2):
- Your minor threats: [zone:player-minor-played]4[/zone:player-minor-played]
- Opponent minor threats: [zone:opponent-minor-played]7[/zone:opponent-minor-played]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col2]column 2[/zone:col2], [zone:col3]column 3[/zone:col3]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR OPPONENT's threat cells: [c3r2]

## Tone
This move gave away a real advantage; explain the concrete consequence.

## KB term definitions

The following tactical concepts apply to this position:

- [term:undercut] **undercut** (undercut): When opposite-color major threats in the same column have opposite row parity, the
lower threat undercuts the upper one because gravity fills bottom-up, neutralizing
the higher threat.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

By playing [zone:col2]column 2[/zone:col2], you let your opponent undercut your plan in [zone:col3]column 3[/zone:col3]: their lower disc now kills the higher winning idea on [zone:c3r2]that cell[/zone:c3r2], which is exactly the [term:undercut]undercut[/term:undercut] pattern. The better move would have been to play [zone:col3]column 3[/zone:col3] yourself, giving you a stronger setup and improving your minor threats from [zone:windows:c2r2|c2r4|c3r3|c6r6]4[/zone:windows:c2r2|c2r4|c3r3|c6r6] to [zone:windows:c1r2|c2r2|c2r4|c3r3|c3r4|c6r6]6[/zone:windows:c1r2|c2r2|c2r4|c3r3|c3r4|c6r6] while also reducing your opponent’s from [zone:windows:c2r1|c2r5|c3r2|c3r4|c6r5|c7r3|c7r4|c7r6]8[/zone:windows:c2r1|c2r5|c3r2|c3r4|c6r5|c7r3|c7r4|c7r6] to [zone:windows:c2r5|c3r4|c6r5|c7r3|c7r4|c7r6]6[/zone:windows:c2r5|c3r4|c6r5|c7r3|c7r4|c7r6], instead of leaving you at [zone:windows:c2r2|c2r4|c3r3|c6r6]4[/zone:windows:c2r2|c2r4|c3r3|c6r6] and them at [zone:windows:c2r5|c3r2|c3r4|c6r5|c7r3|c7r4|c7r6]7[/zone:windows:c2r5|c3r2|c3r4|c6r5|c7r3|c7r4|c7r6].

---

### eval-7 — forced_block (sev 3)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 20  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |Gy |   |   |   |
  5  |   |   |   |Gy |Gn |   |   |
  4  |   |   |   |Gn |Gy |Gy |   |
  3  |   |   |   |Gy |Gn |Gn |Gy |
  2  |   |   |   |Gn |Gy |Gn |Gy |
  1  |   |Gn |Gn |Gy |Gn |Gn |Gy |

        1      2      3      4      5      6      7   
  6  |      | (gn) |      | Gy14 |      | (gn) | (gy) |
  5  |      | (gy) | [Gn] | Gy12 | Gn11 | (gy) | (gy) |
  4  |      | (gn) | (gy) | Gn 9 | Gy 4 | Gy18 | <Gy> |
  3  |      |      | (gn) | Gy 8 | Gn 3 | Gn17 | Gy20 |
  2  |      | (gn) | (gy) | Gn 7 | Gy 2 | Gn15 | Gy16 |
  1  |      | Gn19 | Gn 5 | Gy 6 | Gn 1 | Gn13 | Gy10 |

  ht |   0  |   1  |   1  |   6  |   5  |   4  |   3  |  (discs in column)
 par |  6E  |  5O  |  5O  |  0E  |  1O  |  2E  |  3O  |  (empty cells: O=odd E=even)
  Major threats: col3 row5 (Gn)   col7 row4 (Gy) [GT]

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 21  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |Gy |   |   |   |
  5  |   |   |   |Gy |Gn |   |   |
  4  |   |   |   |Gn |Gy |Gy |Gn |
  3  |   |   |   |Gy |Gn |Gn |Gy |
  2  |   |   |   |Gn |Gy |Gn |Gy |
  1  |   |Gn |Gn |Gy |Gn |Gn |Gy |

        1      2      3      4      5      6      7   
  6  |      | (gn) |      | Gy14 |      | (gn) | (gy) |
  5  |      | (gy) | [Gn] | Gy12 | Gn11 | (gy) |      |
  4  |      | (gn) | (gy) | Gn 9 | Gy 4 | Gy18 | Gn21 |
  3  |      |      | (gn) | Gy 8 | Gn 3 | Gn17 | Gy20 |
  2  |      | (gn) | (gy) | Gn 7 | Gy 2 | Gn15 | Gy16 |
  1  |      | Gn19 | Gn 5 | Gy 6 | Gn 1 | Gn13 | Gy10 |

  ht |   0  |   1  |   1  |   6  |   5  |   4  |   4  |  (discs in column)
 par |  6E  |  5O  |  5O  |  0E  |  1O  |  2E  |  2E  |  (empty cells: O=odd E=even)
  Major threats: col3 row5 (Gn)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 21  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |Gy |   |   |   |
  5  |   |   |   |Gy |Gn |Gn |   |
  4  |   |   |   |Gn |Gy |Gy |   |
  3  |   |   |   |Gy |Gn |Gn |Gy |
  2  |   |   |   |Gn |Gy |Gn |Gy |
  1  |   |Gn |Gn |Gy |Gn |Gn |Gy |

        1      2      3      4      5      6      7   
  6  |      | (gn) |      | Gy14 |      | (gn) |      |
  5  |      | (gy) | [Gn] | Gy12 | Gn11 | Gn21 | (gy) |
  4  |      | (gn) | (gy) | Gn 9 | Gy 4 | Gy18 | <Gy> |
  3  |      |      | (gn) | Gy 8 | Gn 3 | Gn17 | Gy20 |
  2  |      | (gn) |      | Gn 7 | Gy 2 | Gn15 | Gy16 |
  1  |      | Gn19 | Gn 5 | Gy 6 | Gn 1 | Gn13 | Gy10 |

  ht |   0  |   1  |   1  |   6  |   5  |   5  |   3  |  (discs in column)
 par |  6E  |  5O  |  5O  |  0E  |  1O  |  1O  |  3O  |  (empty cells: O=odd E=even)
  Major threats: col3 row5 (Gn)   col7 row4 (Gy) [GT]

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: large
- Move played: column 6
- Your move placed a disc on c6r5.
- Better move: column 7
- The better move places a disc on c7r4.
- Key insight: Your opponent was about to win. You had to block and didn't.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing an actual count, copy the zone tag shown on that line and wrap the count with it; when a line shows "none", just say so in plain words (e.g. "no minor threats") with no tag. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Opponent minor threats: [zone:opponent-minor-pre]5[/zone:opponent-minor-pre]

After the best move (column 7):
- Opponent minor threats: [zone:opponent-minor-best]5[/zone:opponent-minor-best]

After the move played (column 6):
- Opponent minor threats: [zone:opponent-minor-played]2[/zone:opponent-minor-played]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col6]column 6[/zone:col6], [zone:col7]column 7[/zone:col7]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR OPPONENT's threat cells: [c7r4]

## Tone
This was a significant mistake; explain clearly what was lost.

## KB term definitions

The following tactical concepts apply to this position:

- [term:forced_block] **forced block** (forced_block): A forced block is a situation where the opponent has an immediate threat and only
one specific column prevents the loss. Every other legal move hands the opponent
an immediate win.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

You missed a [term:forced_block]forced block[/term:forced_block]: [zone:c7r4]that cell[/zone:c7r4] was the spot that had to be covered because your opponent was about to win on [zone:row4]row 4[/zone:row4]. Playing [zone:col7]column 7[/zone:col7] would have taken that away and left your opponent with [zone:windows:c2r5|c3r4]2[/zone:windows:c2r5|c3r4] minor threats instead of the [zone:windows:c2r5|c3r2|c3r4|c6r5|c7r6]5[/zone:windows:c2r5|c3r2|c3r4|c6r5|c7r6] they had before, while your move in [zone:col6]column 6[/zone:col6] ignored the danger and handed them the win path.

---

### eval-8 — suboptimal_move (sev 0)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on EVEN rows (2,4,6).
Your opponent wins on ODD rows (1,3,5).

## Boards
### Before the move
Move 1  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |   |   |   |   |
  1  |   |   |   |Gn |   |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      |      |      |      |      |
  1  |      |      |      | Gn 1 |      |      |      |

  ht |   0  |   0  |   0  |   1  |   0  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  6E  |  5O  |  6E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 2  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |Gy |   |   |   |
  1  |   |   |   |Gn |   |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      | Gy 2 |      |      |      |
  1  |      |      |      | Gn 1 |      |      |      |

  ht |   0  |   0  |   0  |   2  |   0  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  6E  |  4E  |  6E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 2  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |   |   |   |   |
  1  |   |   |   |Gn |   |Gy |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      |      |      |      |      |
  1  |      |      |      | Gn 1 |      | Gy 2 |      |

  ht |   0  |   0  |   0  |   1  |   0  |   1  |   0  |  (discs in column)
 par |  6E  |  6E  |  6E  |  5O  |  6E  |  5O  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gy = your discs, Gn = your opponent's discs.

## Move context
- Your winning rows: EVEN (2,4,6)
- Eval gap: small
- Move played: column 6
- Your move placed a disc on c6r1.
- Better move: column 4
- The better move places a disc on c4r2.
- Key insight: There was a stronger move — this one gives ground.

## What the better move leads to

This does not guarantee you a win, but if your opponent slips, the better move lets you punish by building toward a double threat — again a future possibility, not a fact on the board yet. Point at it by USING the zone tag(s) below:
- [zone:future-double_threat-1]the square that forks two threats[/zone:future-double_threat-1]
- [zone:future-double_threat-2]another square that gets there[/zone:future-double_threat-2]
- [zone:future-double_threat-3]another square that gets there[/zone:future-double_threat-3]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col6]column 6[/zone:col6], [zone:col4]column 4[/zone:col4]

Specific present-board cells are not pre-listed here. To point at the future follow-up, use the zone tag(s) provided in the "What the better move leads to" section above — they mark the exact square(s) where it would form.

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

[zone:col6]Playing column 6[/zone:col6] gave up the stronger central build and let you drift to the edge instead of pressing your main play in [zone:col4]column 4[/zone:col4]. The better move would have been to play [zone:c4r2]that cell[/zone:c4r2], which keeps the center more active and sets up your chance to build toward a future [zone:cells:c1r2,c5r2]fork point[/zone:cells:c1r2,c5r2].

---

### eval-9 — suboptimal_move (sev 1)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 6  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |Gy |   |Gn |   |
  1  |   |Gn |Gy |Gn |   |Gy |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      | (gy) |      |
  3  |      |      |      |      | (gy) |      |      |
  2  |      |      |      | Gy 4 |      | Gn 3 |      |
  1  |      | Gn 5 | Gy 6 | Gn 1 |      | Gy 2 |      |

  ht |   0  |   1  |   1  |   2  |   0  |   2  |   0  |  (discs in column)
 par |  6E  |  5O  |  5O  |  4E  |  6E  |  4E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 7  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |Gn |   |   |   |
  2  |   |   |   |Gy |   |Gn |   |
  1  |   |Gn |Gy |Gn |   |Gy |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      | (gn) | (gy) |      |
  3  |      |      |      | Gn 7 | (gy) |      |      |
  2  |      |      | (gn) | Gy 4 |      | Gn 3 |      |
  1  |      | Gn 5 | Gy 6 | Gn 1 |      | Gy 2 |      |

  ht |   0  |   1  |   1  |   3  |   0  |   2  |   0  |  (discs in column)
 par |  6E  |  5O  |  5O  |  3O  |  6E  |  4E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 7  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |Gn |   |Gy |   |Gn |   |
  1  |   |Gn |Gy |Gn |   |Gy |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      | (gn) |      |      |      | (gy) |      |
  3  |      | (gn) |      |      | (gy) |      |      |
  2  |      | Gn 7 |      | Gy 4 |      | Gn 3 |      |
  1  |      | Gn 5 | Gy 6 | Gn 1 |      | Gy 2 |      |

  ht |   0  |   2  |   1  |   2  |   0  |   2  |   0  |  (discs in column)
 par |  6E  |  4E  |  5O  |  4E  |  6E  |  4E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: moderate
- Move played: column 2
- Your move placed a disc on c2r2.
- Better move: column 4
- The better move places a disc on c4r3.
- Key insight: There was a stronger move — this one gives ground.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing an actual count, copy the zone tag shown on that line and wrap the count with it; when a line shows "none", just say so in plain words (e.g. "no minor threats") with no tag. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your minor threats: none

After the best move (column 4):
- Your minor threats: [zone:player-minor-best]2[/zone:player-minor-best]

After the move played (column 2):
- Your minor threats: [zone:player-minor-played]2[/zone:player-minor-played]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
Column numbers (1–7) are always valid to reference — they appear in every board header.
Only omit specific CELL references (e.g. c4r3) if the cell is not listed in the boards above.

## Tone
This move gave away a real advantage; explain the concrete consequence.

## KB term definitions

The following tactical concepts apply to this position:

- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

You gave away a real [term:minor_threat]minor threat[/term:minor_threat] by playing in [zone:col2]column 2[/zone:col2]; the better move in [zone:col4]column 4[/zone:col4] would have kept your own build at [zone:windows:c3r2|c5r4]2[/zone:windows:c3r2|c5r4] instead of leaving it at [zone:windows:c2r3|c2r4]2[/zone:windows:c2r3|c2r4], while also making use of the stronger central space. The key mistake was choosing a side column when you could have played [zone:c4r3]that cell[/zone:c4r3] to keep your position more active and preserve the better long-range plan.

---

### eval-10 — j_shape (sev 0)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 10  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |Gy |   |   |   |
  2  |   |Gn |Gy |Gy |   |Gn |   |
  1  |Gn |Gn |Gy |Gn |   |Gy |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      | (gy) |      | (gy) |      |
  4  |      | (gn) | (gy) | (*)  | (gy) | (gy) |      |
  3  |      | (gn) | (*)  | Gy 8 | (gy) |      |      |
  2  |      | Gn 7 | Gy10 | Gy 4 | (gy) | Gn 3 |      |
  1  | Gn 9 | Gn 5 | Gy 6 | Gn 1 |      | Gy 2 |      |

  ht |   1  |   2  |   2  |   3  |   0  |   2  |   0  |  (discs in column)
 par |  5O  |  4E  |  4E  |  3O  |  6E  |  4E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 11  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |Gn |Gy |   |   |   |
  2  |   |Gn |Gy |Gy |   |Gn |   |
  1  |Gn |Gn |Gy |Gn |   |Gy |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      | (gy) | (gn) | (gy) |      |
  4  |      | (gn) | (gy) | <Gn> | (gy) | (gy) |      |
  3  |      | (gn) | Gn11 | Gy 8 | (gy) |      |      |
  2  |      | Gn 7 | Gy10 | Gy 4 | (gy) | Gn 3 |      |
  1  | Gn 9 | Gn 5 | Gy 6 | Gn 1 |      | Gy 2 |      |

  ht |   1  |   2  |   3  |   3  |   0  |   2  |   0  |  (discs in column)
 par |  5O  |  4E  |  3O  |  3O  |  6E  |  4E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: col4 row4 (Gn) [GT]

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 11  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |Gn |   |   |   |
  3  |   |   |   |Gy |   |   |   |
  2  |   |Gn |Gy |Gy |   |Gn |   |
  1  |Gn |Gn |Gy |Gn |   |Gy |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      | (gn) |      | (gn) | (gy) |      |
  4  |      | (gn) | (gy) | Gn11 | (gy) | (gy) |      |
  3  |      | (gn) | <Gn> | Gy 8 | (*)  |      |      |
  2  |      | Gn 7 | Gy10 | Gy 4 | (gy) | Gn 3 |      |
  1  | Gn 9 | Gn 5 | Gy 6 | Gn 1 |      | Gy 2 | (gn) |

  ht |   1  |   2  |   2  |   4  |   0  |   2  |   0  |  (discs in column)
 par |  5O  |  4E  |  4E  |  2E  |  6E  |  4E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: col3 row3 (Gn) [GT]

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: small
- Move played: column 4
- Your move placed a disc on c4r4.
- Better move: column 3
- The better move places a disc on c3r3.
- Key insight: You let your opponent build a J-shape trap.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing an actual count, copy the zone tag shown on that line and wrap the count with it; when a line shows "none", just say so in plain words (e.g. "no minor threats") with no tag. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your minor threats: [zone:player-minor-pre]4[/zone:player-minor-pre]
- Opponent minor threats: [zone:opponent-minor-pre]9[/zone:opponent-minor-pre]

After the best move (column 3):
- Your minor threats: [zone:player-minor-best]2[/zone:player-minor-best]
- Opponent minor threats: [zone:opponent-minor-best]8[/zone:opponent-minor-best]

After the move played (column 4):
- Your minor threats: [zone:player-minor-played]5[/zone:player-minor-played]
- Opponent minor threats: [zone:opponent-minor-played]7[/zone:opponent-minor-played]

## Best-move tactical evidence
The following tactical patterns were present after the best move:
- immediate_threat: cells [c4r4]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col4]column 4[/zone:col4], [zone:col3]column 3[/zone:col3]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR threat cells: [c4r4]
- YOUR OPPONENT's threat cells: [c3r4, c3r1, c4r2, c3r3, c4r3]

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

## KB term definitions

The following tactical concepts apply to this position:

- [term:immediate_threat] **immediate threat** (immediate_threat): An immediate threat is a major threat whose empty cell is directly playable right now —
it is the topmost empty cell in its column (gravity-top). Playing there wins the game
on this move.
- [term:j_shape] **j shape** (j_shape): A four-disc L-shaped Red cluster generating three simultaneous minor threats that
is equivalent to a major odd-row threat; the opponent cannot block all three paths.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

By playing [zone:col4]column 4[/zone:col4], you let your opponent build a [term:j_shape]j shape[/term:j_shape] around [zone:c3r4]that cell[/zone:c3r4], which is the kind of setup that makes your position much harder to manage. If you had played [zone:col3]column 3[/zone:col3] instead, you would have covered [zone:c3r3]that cell[/zone:c3r3] and kept the dangerous structure from forming, while also leaving you with fewer minor threats overall: [zone:windows:c2r3|c2r4]2[/zone:windows:c2r3|c2r4][/zone:windows:c2r3|c2r4] instead of [zone:windows:c2r3|c2r4|c3r5|c5r3|c7r1]5[/zone:windows:c2r3|c2r4|c3r5|c5r3|c7r1][/zone:windows:c2r3|c2r4|c3r5|c5r3|c7r1].

---

### eval-11 — immediate_threat (sev 3)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 14  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |Gn |Gn |   |   |   |
  3  |   |Gy |Gy |Gy |   |   |   |
  2  |   |Gn |Gy |Gy |   |Gn |   |
  1  |Gn |Gn |Gy |Gn |   |Gy |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  | (gy) |      | (gn) |      |      | (gy) |      |
  4  | (gn) | (*)  | Gn13 | Gn11 | (*)  | (*)  |      |
  3  | [Gy] | Gy14 | Gy12 | Gy 8 | [Gy] | (gy) |      |
  2  |      | Gn 7 | Gy10 | Gy 4 |      | Gn 3 |      |
  1  | Gn 9 | Gn 5 | Gy 6 | Gn 1 | (gy) | Gy 2 | (gn) |

  ht |   1  |   3  |   4  |   4  |   0  |   2  |   0  |  (discs in column)
 par |  5O  |  3O  |  2E  |  2E  |  6E  |  4E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: col1 row3 (Gy)   col5 row3 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 15  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |Gn |   |   |   |
  4  |   |   |Gn |Gn |   |   |   |
  3  |   |Gy |Gy |Gy |   |   |   |
  2  |   |Gn |Gy |Gy |   |Gn |   |
  1  |Gn |Gn |Gy |Gn |   |Gy |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  | (gy) |      | (gn) | Gn15 |      | (gy) |      |
  4  | (gn) | (*)  | Gn13 | Gn11 | (*)  | (*)  |      |
  3  | [Gy] | Gy14 | Gy12 | Gy 8 | [Gy] | (gy) |      |
  2  |      | Gn 7 | Gy10 | Gy 4 |      | Gn 3 |      |
  1  | Gn 9 | Gn 5 | Gy 6 | Gn 1 | (gy) | Gy 2 | (gn) |

  ht |   1  |   3  |   4  |   5  |   0  |   2  |   0  |  (discs in column)
 par |  5O  |  3O  |  2E  |  1O  |  6E  |  4E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: col1 row3 (Gy)   col5 row3 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 15  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |Gn |Gn |   |   |   |
  3  |   |Gy |Gy |Gy |   |   |   |
  2  |Gn |Gn |Gy |Gy |   |Gn |   |
  1  |Gn |Gn |Gy |Gn |   |Gy |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  | (gy) |      | (gn) |      |      | (gy) |      |
  4  | (gn) | (*)  | Gn13 | Gn11 | (*)  | (*)  |      |
  3  | <Gy> | Gy14 | Gy12 | Gy 8 | [Gy] | (gy) |      |
  2  | Gn15 | Gn 7 | Gy10 | Gy 4 |      | Gn 3 |      |
  1  | Gn 9 | Gn 5 | Gy 6 | Gn 1 | (gy) | Gy 2 | (gn) |

  ht |   2  |   3  |   4  |   4  |   0  |   2  |   0  |  (discs in column)
 par |  4E  |  3O  |  2E  |  2E  |  6E  |  4E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: col1 row3 (Gy) [GT]   col5 row3 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: moderate
- Move played: column 1
- Your move placed a disc on c1r2.
- Better move: column 4
- The better move places a disc on c4r5.
- Key insight: That move handed your opponent an immediate win.

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
Column numbers (1–7) are always valid to reference — they appear in every board header.
Only omit specific CELL references (e.g. c4r3) if the cell is not listed in the boards above.

## Tone
This move gave away a real advantage; explain the concrete consequence.

## KB term definitions

The following tactical concepts apply to this position:

- [term:immediate_threat] **immediate threat** (immediate_threat): An immediate threat is a major threat whose empty cell is directly playable right now —
it is the topmost empty cell in its column (gravity-top). Playing there wins the game
on this move.
- [term:major_threat] **major threat** (major_threat): A major threat is a four-cell window containing three of your discs and one empty cell.
If that empty cell is the next playable cell in its column (gravity-top), it wins the
game immediately; otherwise it is a latent threat that will become decisive as the
board fills.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

By playing [zone:col1]column 1[/zone:col1], you stepped onto [zone:c1r2]that cell[/zone:c1r2] and handed your opponent an [term:immediate_threat]immediate threat[/term:immediate_threat] on [zone:c1r3]that cell[/zone:c1r3], since it became the top playable space in that column. The better move was [zone:col4]column 4[/zone:col4], which would have put your disc on [zone:c4r5]that cell[/zone:c4r5] and kept the position safer instead of giving your opponent a direct winning chance.

---

### eval-12 — immediate_threat (sev 1)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 32  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |Gn |   |Gy |   |Gn |
  5  |   |Gn |Gy |   |Gy |Gy |Gy |
  4  |   |Gy |Gy |   |Gy |Gn |Gy |
  3  |   |Gn |Gy |   |Gn |Gy |Gn |
  2  |Gy |Gn |Gn |Gy |Gn |Gn |Gy |
  1  |Gn |Gn |Gy |Gn |Gn |Gy |Gn |

        1      2      3      4      5      6      7   
  6  |      |      | Gn21 | (gy) | Gy24 | (gy) | Gn31 |
  5  | [Gy] | Gn27 | Gy20 | [Gy] | Gy22 | Gy14 | Gy30 |
  4  | [Gn] | Gy26 | Gy18 | [*]  | Gy16 | Gn11 | Gy28 |
  3  | (gy) | Gn25 | Gy12 |      | Gn15 | Gy10 | Gn17 |
  2  | Gy32 | Gn23 | Gn 7 | Gy 2 | Gn13 | Gn 9 | Gy 8 |
  1  | Gn29 | Gn19 | Gy 4 | Gn 1 | Gn 3 | Gy 6 | Gn 5 |

  ht |   2  |   5  |   6  |   2  |   6  |   5  |   6  |  (discs in column)
 par |  4E  |  1O  |  0E  |  4E  |  0E  |  1O  |  0E  |  (empty cells: O=odd E=even)
  Major threats: col1 row4 (Gn)   col1 row5 (Gy)   col4 row4 (Gn+Gy)   col4 row5 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 33  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |Gn |Gn |   |Gy |   |Gn |
  5  |   |Gn |Gy |   |Gy |Gy |Gy |
  4  |   |Gy |Gy |   |Gy |Gn |Gy |
  3  |   |Gn |Gy |   |Gn |Gy |Gn |
  2  |Gy |Gn |Gn |Gy |Gn |Gn |Gy |
  1  |Gn |Gn |Gy |Gn |Gn |Gy |Gn |

        1      2      3      4      5      6      7   
  6  | (gn) | Gn33 | Gn21 | (*)  | Gy24 | (gy) | Gn31 |
  5  | [Gy] | Gn27 | Gy20 | [Gy] | Gy22 | Gy14 | Gy30 |
  4  | [Gn] | Gy26 | Gy18 | [*]  | Gy16 | Gn11 | Gy28 |
  3  | (gy) | Gn25 | Gy12 |      | Gn15 | Gy10 | Gn17 |
  2  | Gy32 | Gn23 | Gn 7 | Gy 2 | Gn13 | Gn 9 | Gy 8 |
  1  | Gn29 | Gn19 | Gy 4 | Gn 1 | Gn 3 | Gy 6 | Gn 5 |

  ht |   2  |   6  |   6  |   2  |   6  |   5  |   6  |  (discs in column)
 par |  4E  |  0E  |  0E  |  4E  |  0E  |  1O  |  0E  |  (empty cells: O=odd E=even)
  Major threats: col1 row4 (Gn)   col1 row5 (Gy)   col4 row4 (Gn+Gy)   col4 row5 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 33  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |Gn |   |Gy |   |Gn |
  5  |   |Gn |Gy |   |Gy |Gy |Gy |
  4  |   |Gy |Gy |   |Gy |Gn |Gy |
  3  |   |Gn |Gy |Gn |Gn |Gy |Gn |
  2  |Gy |Gn |Gn |Gy |Gn |Gn |Gy |
  1  |Gn |Gn |Gy |Gn |Gn |Gy |Gn |

        1      2      3      4      5      6      7   
  6  |      |      | Gn21 | (gy) | Gy24 | (gy) | Gn31 |
  5  | [Gy] | Gn27 | Gy20 | [Gy] | Gy22 | Gy14 | Gy30 |
  4  | [Gn] | Gy26 | Gy18 | <*>  | Gy16 | Gn11 | Gy28 |
  3  | (gy) | Gn25 | Gy12 | Gn33 | Gn15 | Gy10 | Gn17 |
  2  | Gy32 | Gn23 | Gn 7 | Gy 2 | Gn13 | Gn 9 | Gy 8 |
  1  | Gn29 | Gn19 | Gy 4 | Gn 1 | Gn 3 | Gy 6 | Gn 5 |

  ht |   2  |   5  |   6  |   3  |   6  |   5  |   6  |  (discs in column)
 par |  4E  |  1O  |  0E  |  3O  |  0E  |  1O  |  0E  |  (empty cells: O=odd E=even)
  Major threats: col1 row4 (Gn)   col1 row5 (Gy)   col4 row4 (Gn+Gy) [GT]   col4 row5 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: small
- Move played: column 4
- Your move placed a disc on c4r3.
- Better move: column 2
- The better move places a disc on c2r6.
- Key insight: That move handed your opponent an immediate win.

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
Column numbers (1–7) are always valid to reference — they appear in every board header.
Only omit specific CELL references (e.g. c4r3) if the cell is not listed in the boards above.

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

## KB term definitions

The following tactical concepts apply to this position:

- [term:immediate_threat] **immediate threat** (immediate_threat): An immediate threat is a major threat whose empty cell is directly playable right now —
it is the topmost empty cell in its column (gravity-top). Playing there wins the game
on this move.
- [term:major_threat] **major threat** (major_threat): A major threat is a four-cell window containing three of your discs and one empty cell.
If that empty cell is the next playable cell in its column (gravity-top), it wins the
game immediately; otherwise it is a latent threat that will become decisive as the
board fills.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

By playing [zone:col4]column 4[/zone:col4], you handed your opponent an [term:immediate_threat]immediate threat[/term:immediate_threat] in [zone:col4]column 4[/zone:col4], because the top playable spot there became theirs on the very next turn. You should have played [zone:col2]column 2[/zone:col2] instead; that keeps the danger from appearing and leaves the position safer, while your move also left the board with the same looming major threats already visible around [zone:col1]column 1[/zone:col1] and [zone:col4]column 4[/zone:col4].

---

### eval-13 — suboptimal_move (sev 1)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 4  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |Gy |   |   |   |
  2  |   |   |   |Gn |   |   |   |
  1  |   |   |   |Gy |Gn |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      | (gn) |      |      |      |      |      |
  3  |      |      | (gn) | Gy 4 |      |      |      |
  2  |      |      |      | Gn 3 |      |      |      |
  1  |      |      |      | Gy 2 | Gn 1 |      |      |

  ht |   0  |   0  |   0  |   3  |   1  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  6E  |  3O  |  5O  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 5  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |Gn |   |   |   |
  3  |   |   |   |Gy |   |   |   |
  2  |   |   |   |Gn |   |   |   |
  1  |   |   |   |Gy |Gn |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      | (gn) |      | Gn 5 |      |      |      |
  3  |      |      | (gn) | Gy 4 |      |      |      |
  2  |      |      |      | Gn 3 |      |      |      |
  1  |      |      |      | Gy 2 | Gn 1 |      |      |

  ht |   0  |   0  |   0  |   4  |   1  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  6E  |  2E  |  5O  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 5  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |Gy |   |   |   |
  2  |   |   |   |Gn |Gn |   |   |
  1  |   |   |   |Gy |Gn |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      | (gn) |      |      | (gn) |      |      |
  3  |      |      | (gn) | Gy 4 | (gn) |      |      |
  2  |      | (gn) | (gn) | Gn 3 | Gn 5 | (gn) | (gn) |
  1  |      |      |      | Gy 2 | Gn 1 |      |      |

  ht |   0  |   0  |   0  |   3  |   2  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  6E  |  3O  |  4E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: moderate
- Move played: column 5
- Your move placed a disc on c5r2.
- Better move: column 4
- The better move places a disc on c4r4.
- Key insight: There was a stronger move — this one gives ground.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing an actual count, copy the zone tag shown on that line and wrap the count with it; when a line shows "none", just say so in plain words (e.g. "no minor threats") with no tag. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your minor threats: [zone:player-minor-pre]2[/zone:player-minor-pre]

After the best move (column 4):
- Your minor threats: [zone:player-minor-best]2[/zone:player-minor-best]

After the move played (column 5):
- Your minor threats: [zone:player-minor-played]8[/zone:player-minor-played]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
Column numbers (1–7) are always valid to reference — they appear in every board header.
Only omit specific CELL references (e.g. c4r3) if the cell is not listed in the boards above.

## Tone
This move gave away a real advantage; explain the concrete consequence.

## KB term definitions

The following tactical concepts apply to this position:

- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

You gave away a real advantage by choosing [zone:col5]column 5[/zone:col5]: instead of keeping the stronger central plan alive, you settled for a [term:minor_threat]minor threat[/term:minor_threat] and left yourself with [zone:windows:c2r2|c2r4|c3r2|c3r3|c5r3|c5r4|c6r2|c7r2]8[/zone:windows:c2r2|c2r4|c3r2|c3r3|c5r3|c5r4|c6r2|c7r2] rather than the steadier [zone:windows:c2r4|c3r3]2[/zone:windows:c2r4|c3r3]. The better move would have been [zone:col4]column 4[/zone:col4], which would have put your disc on [zone:c4r4]that cell[/zone:c4r4] and kept your position more controlled, with no need to give ground in the center.

---

### eval-14 — forced_block (sev 1)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 16  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |Gn |   |   |   |
  4  |   |   |   |Gy |   |   |Gy |
  3  |   |Gn |   |Gy |Gy |   |Gy |
  2  |   |Gy |   |Gn |Gn |   |Gy |
  1  |Gn |Gn |   |Gy |Gn |   |Gn |

        1      2      3      4      5      6      7   
  6  |      | (gy) |      |      | (gn) |      | (gy) |
  5  |      |      | (gy) | Gn 9 | (gy) |      | <Gy> |
  4  |      | (gn) | (gn) | Gy 6 | (gy) | (gy) | Gy16 |
  3  |      | Gn15 | (*)  | Gy 4 | Gy14 | [Gy] | Gy10 |
  2  | (gn) | Gy12 | (gn) | Gn 3 | Gn 5 | (*)  | Gy 8 |
  1  | Gn13 | Gn11 |      | Gy 2 | Gn 1 |      | Gn 7 |

  ht |   1  |   3  |   0  |   5  |   3  |   0  |   4  |  (discs in column)
 par |  5O  |  3O  |  6E  |  1O  |  3O  |  6E  |  2E  |  (empty cells: O=odd E=even)
  Major threats: col6 row3 (Gy)   col7 row5 (Gy) [GT]

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 17  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |Gn |   |   |Gn |
  4  |   |   |   |Gy |   |   |Gy |
  3  |   |Gn |   |Gy |Gy |   |Gy |
  2  |   |Gy |   |Gn |Gn |   |Gy |
  1  |Gn |Gn |   |Gy |Gn |   |Gn |

        1      2      3      4      5      6      7   
  6  |      | (gy) |      |      | (gn) |      |      |
  5  |      |      | (gy) | Gn 9 | (*)  | (gn) | Gn17 |
  4  |      | (gn) | (gn) | Gy 6 | (gy) | (gy) | Gy16 |
  3  |      | Gn15 | (*)  | Gy 4 | Gy14 | [Gy] | Gy10 |
  2  | (gn) | Gy12 | (gn) | Gn 3 | Gn 5 | (*)  | Gy 8 |
  1  | Gn13 | Gn11 |      | Gy 2 | Gn 1 |      | Gn 7 |

  ht |   1  |   3  |   0  |   5  |   3  |   0  |   5  |  (discs in column)
 par |  5O  |  3O  |  6E  |  1O  |  3O  |  6E  |  1O  |  (empty cells: O=odd E=even)
  Major threats: col6 row3 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 17  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |Gn |   |   |   |
  5  |   |   |   |Gn |   |   |   |
  4  |   |   |   |Gy |   |   |Gy |
  3  |   |Gn |   |Gy |Gy |   |Gy |
  2  |   |Gy |   |Gn |Gn |   |Gy |
  1  |Gn |Gn |   |Gy |Gn |   |Gn |

        1      2      3      4      5      6      7   
  6  |      | (gy) |      | Gn17 | (gn) |      | (gy) |
  5  |      |      | (gy) | Gn 9 | (gy) |      | <Gy> |
  4  |      | (gn) | (gn) | Gy 6 | (gy) | (gy) | Gy16 |
  3  |      | Gn15 | (*)  | Gy 4 | Gy14 | [Gy] | Gy10 |
  2  | (gn) | Gy12 | (gn) | Gn 3 | Gn 5 | (*)  | Gy 8 |
  1  | Gn13 | Gn11 |      | Gy 2 | Gn 1 |      | Gn 7 |

  ht |   1  |   3  |   0  |   6  |   3  |   0  |   4  |  (discs in column)
 par |  5O  |  3O  |  6E  |  0E  |  3O  |  6E  |  2E  |  (empty cells: O=odd E=even)
  Major threats: col6 row3 (Gy)   col7 row5 (Gy) [GT]

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: moderate
- Move played: column 4
- Your move placed a disc on c4r6.
- Better move: column 7
- The better move places a disc on c7r5.
- Key insight: Your opponent was about to win. You had to block and didn't.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing an actual count, copy the zone tag shown on that line and wrap the count with it; when a line shows "none", just say so in plain words (e.g. "no minor threats") with no tag. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your minor threats: [zone:player-minor-pre]7[/zone:player-minor-pre]

After the best move (column 7):
- Your minor threats: [zone:player-minor-best]9[/zone:player-minor-best]

After the move played (column 4):
- Your minor threats: [zone:player-minor-played]7[/zone:player-minor-played]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col4]column 4[/zone:col4], [zone:col7]column 7[/zone:col7]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR OPPONENT's threat cells: [c7r5]

## Tone
This move gave away a real advantage; explain the concrete consequence.

## KB term definitions

The following tactical concepts apply to this position:

- [term:forced_block] **forced block** (forced_block): A forced block is a situation where the opponent has an immediate threat and only
one specific column prevents the loss. Every other legal move hands the opponent
an immediate win.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

You had a [term:forced_block]forced block[/term:forced_block] and missed it: your opponent’s immediate winning cell was [zone:c7r5]that cell[/zone:c7r5], so playing [zone:col4]column 4[/zone:col4] did not stop the loss. The better move was to play [zone:col7]column 7[/zone:col7], which would have taken away that win and, as a bonus, kept your own minor threats at [zone:windows:c1r2|c2r4|c3r2|c3r3|c3r4|c5r5|c5r6|c6r2|c6r5]9[/zone:windows:c1r2|c2r4|c3r2|c3r3|c3r4|c5r5|c5r6|c6r2|c6r5] instead of leaving you with only [zone:windows:c1r2|c2r4|c3r2|c3r3|c3r4|c5r6|c6r2]7[/zone:windows:c1r2|c2r4|c3r2|c3r3|c3r4|c5r6|c6r2].

---

### eval-15 — double_threat (sev 2)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 28  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |Gn |   |Gy |   |   |   |
  5  |   |Gn |   |Gn |Gy |Gy |   |
  4  |   |Gy |Gy |Gy |Gn |Gn |   |
  3  |   |Gn |Gn |Gn |Gy |Gy |   |
  2  |   |Gn |Gy |Gy |Gn |Gn |   |
  1  |Gy |Gn |Gn |Gn |Gy |Gy |Gy |

        1      2      3      4      5      6      7   
  6  |      | Gn27 |      | Gy16 |      |      |      |
  5  | (gn) | Gn19 | (*)  | Gn 5 | Gy26 | Gy12 |      |
  4  | [Gy] | Gy18 | Gy22 | Gy 4 | Gn25 | Gn11 |      |
  3  | [Gn] | Gn17 | Gn21 | Gn 3 | Gy24 | Gy10 |      |
  2  |      | Gn15 | Gy20 | Gy 2 | Gn23 | Gn 9 |      |
  1  | Gy 6 | Gn13 | Gn 7 | Gn 1 | Gy14 | Gy 8 | Gy28 |

  ht |   1  |   6  |   4  |   6  |   5  |   5  |   1  |  (discs in column)
 par |  5O  |  0E  |  2E  |  0E  |  1O  |  1O  |  5O  |  (empty cells: O=odd E=even)
  Major threats: col1 row3 (Gn)   col1 row4 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 29  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |Gn |   |Gy |   |   |   |
  5  |   |Gn |Gn |Gn |Gy |Gy |   |
  4  |   |Gy |Gy |Gy |Gn |Gn |   |
  3  |   |Gn |Gn |Gn |Gy |Gy |   |
  2  |   |Gn |Gy |Gy |Gn |Gn |   |
  1  |Gy |Gn |Gn |Gn |Gy |Gy |Gy |

        1      2      3      4      5      6      7   
  6  |      | Gn27 |      | Gy16 |      |      |      |
  5  | [Gn] | Gn19 | Gn29 | Gn 5 | Gy26 | Gy12 |      |
  4  | [Gy] | Gy18 | Gy22 | Gy 4 | Gn25 | Gn11 |      |
  3  | [Gn] | Gn17 | Gn21 | Gn 3 | Gy24 | Gy10 |      |
  2  |      | Gn15 | Gy20 | Gy 2 | Gn23 | Gn 9 |      |
  1  | Gy 6 | Gn13 | Gn 7 | Gn 1 | Gy14 | Gy 8 | Gy28 |

  ht |   1  |   6  |   5  |   6  |   5  |   5  |   1  |  (discs in column)
 par |  5O  |  0E  |  1O  |  0E  |  1O  |  1O  |  5O  |  (empty cells: O=odd E=even)
  Major threats: col1 row3 (Gn)   col1 row4 (Gy)   col1 row5 (Gn)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 29  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |Gn |   |Gy |   |   |   |
  5  |   |Gn |   |Gn |Gy |Gy |   |
  4  |   |Gy |Gy |Gy |Gn |Gn |   |
  3  |   |Gn |Gn |Gn |Gy |Gy |   |
  2  |Gn |Gn |Gy |Gy |Gn |Gn |   |
  1  |Gy |Gn |Gn |Gn |Gy |Gy |Gy |

        1      2      3      4      5      6      7   
  6  |      | Gn27 |      | Gy16 |      |      |      |
  5  | (gn) | Gn19 | (*)  | Gn 5 | Gy26 | Gy12 |      |
  4  | [Gy] | Gy18 | Gy22 | Gy 4 | Gn25 | Gn11 |      |
  3  | <Gn> | Gn17 | Gn21 | Gn 3 | Gy24 | Gy10 |      |
  2  | Gn29 | Gn15 | Gy20 | Gy 2 | Gn23 | Gn 9 |      |
  1  | Gy 6 | Gn13 | Gn 7 | Gn 1 | Gy14 | Gy 8 | Gy28 |

  ht |   2  |   6  |   4  |   6  |   5  |   5  |   1  |  (discs in column)
 par |  4E  |  0E  |  2E  |  0E  |  1O  |  1O  |  5O  |  (empty cells: O=odd E=even)
  Major threats: col1 row3 (Gn) [GT]   col1 row4 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: large
- Move played: column 1
- Your move placed a disc on c1r2.
- Better move: column 3
- The better move places a disc on c3r5.
- Key insight: Your move let your opponent set up two winning threats at once.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing an actual count, copy the zone tag shown on that line and wrap the count with it; when a line shows "none", just say so in plain words (e.g. "no minor threats") with no tag. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your major threats: [zone:player-major-pre]1[/zone:player-major-pre]
- Your minor threats: [zone:player-minor-pre]2[/zone:player-minor-pre]
- Opponent minor threats: [zone:opponent-minor-pre]2[/zone:opponent-minor-pre]

After the best move (column 3):
- Your major threats: [zone:player-major-best]2[/zone:player-major-best]
- Your minor threats: none
- Opponent minor threats: none

After the move played (column 1):
- Your major threats: none
- Your minor threats: [zone:player-minor-played]2[/zone:player-minor-played]
- Opponent minor threats: [zone:opponent-minor-played]2[/zone:opponent-minor-played]

## Best-move tactical evidence
The following tactical patterns were present after the best move:
- undercut: cells [c1r4, c1r5]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col1]column 1[/zone:col1], [zone:col3]column 3[/zone:col3]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR threat cells: [c1r4, c1r5]
- YOUR OPPONENT's threat cells: [c3r5]

## Tone
This was a significant mistake; explain clearly what was lost.

## KB term definitions

The following tactical concepts apply to this position:

- [term:double_threat] **double threat** (double_threat): A double threat (fork) is a single move that creates two simultaneous immediate
threats. Since the opponent can play only one column per turn, one threat is always
left open — guaranteeing a win on the very next move.
- [term:immediate_threat] **immediate threat** (immediate_threat): An immediate threat is a major threat whose empty cell is directly playable right now —
it is the topmost empty cell in its column (gravity-top). Playing there wins the game
on this move.
- [term:undercut] **undercut** (undercut): When opposite-color major threats in the same column have opposite row parity, the
lower threat undercuts the upper one because gravity fills bottom-up, neutralizing
the higher threat.
- [term:major_threat] **major threat** (major_threat): A major threat is a four-cell window containing three of your discs and one empty cell.
If that empty cell is the next playable cell in its column (gravity-top), it wins the
game immediately; otherwise it is a latent threat that will become decisive as the
board fills.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

By playing [zone:col1]column 1[/zone:col1], you gave your opponent a [term:double_threat]double threat[/term:double_threat] setup: you left them with [zone:windows:c1r3|c3r5]2[/zone:windows:c1r3|c3r5] minor threats, while the better move in [zone:col3]column 3[/zone:col3] would have left your opponent with no minor threats and kept your own pressure stronger. That better move also used the [term:undercut]undercut[/term:undercut] pattern with [zone:cells:c1r4,c1r5]the threat cluster[/zone:cells:c1r4,c1r5], which is why it was the safer and more powerful choice.

---

### eval-16 — suboptimal_move (sev 0)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on EVEN rows (2,4,6).
Your opponent wins on ODD rows (1,3,5).

## Boards
### Before the move
Move 1  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |   |   |   |   |
  1  |   |   |   |Gn |   |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      |      |      |      |      |
  1  |      |      |      | Gn 1 |      |      |      |

  ht |   0  |   0  |   0  |   1  |   0  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  6E  |  5O  |  6E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 2  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |Gy |   |   |   |
  1  |   |   |   |Gn |   |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      | Gy 2 |      |      |      |
  1  |      |      |      | Gn 1 |      |      |      |

  ht |   0  |   0  |   0  |   2  |   0  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  6E  |  4E  |  6E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 2  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |   |   |   |   |
  1  |   |   |Gy |Gn |   |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      |      |      |      |      |
  1  |      |      | Gy 2 | Gn 1 |      |      |      |

  ht |   0  |   0  |   1  |   1  |   0  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  5O  |  5O  |  6E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gy = your discs, Gn = your opponent's discs.

## Move context
- Your winning rows: EVEN (2,4,6)
- Eval gap: small
- Move played: column 3
- Your move placed a disc on c3r1.
- Better move: column 4
- The better move places a disc on c4r2.
- Key insight: There was a stronger move — this one gives ground.

## What the better move leads to

This does not guarantee you a win, but if your opponent slips, the better move lets you punish by building toward a figure-7 fork — again a future possibility, not a fact on the board yet. Point at it by USING the zone tag(s) below:
- [zone:future-figure_7-1]the square that completes the figure-7[/zone:future-figure_7-1]
- [zone:future-figure_7-2]another square that gets there[/zone:future-figure_7-2]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col3]column 3[/zone:col3], [zone:col4]column 4[/zone:col4]

Specific present-board cells are not pre-listed here. To point at the future follow-up, use the zone tag(s) provided in the "What the better move leads to" section above — they mark the exact square(s) where it would form.

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

Playing [zone:col3]column 3[/zone:col3] gave ground because it only sat on the bottom edge and did not help your position build anything active. The better move was [zone:col4]column 4[/zone:col4]: by placing your disc on [zone:c4r2]that cell[/zone:c4r2], you would have kept more control in the center and stayed on track to build toward a figure-7 fork, which is the tactical pattern that was available to aim for.

---

### eval-17 — j_shape (sev 0)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on EVEN rows (2,4,6).
Your opponent wins on ODD rows (1,3,5).

## Boards
### Before the move
Move 7  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |Gn |   |   |   |
  3  |   |   |Gy |Gn |   |   |   |
  2  |   |   |Gn |Gy |   |   |   |
  1  |   |   |Gy |Gn |   |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      | (gn) |      |      |      |
  5  | (gy) |      |      | (gn) |      | (gn) |      |
  4  | (gn) | (gy) |      | Gn 7 | (gn) | (gy) |      |
  3  |      | (gn) | Gy 6 | Gn 3 | (gy) |      |      |
  2  |      |      | Gn 5 | Gy 2 |      |      |      |
  1  |      | (gn) | Gy 4 | Gn 1 | (gy) |      |      |

  ht |   0  |   0  |   3  |   4  |   0  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  3O  |  2E  |  6E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 8  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |Gy |Gn |   |   |   |
  3  |   |   |Gy |Gn |   |   |   |
  2  |   |   |Gn |Gy |   |   |   |
  1  |   |   |Gy |Gn |   |   |   |

        1      2      3      4      5      6      7   
  6  |      |      | (gy) | (gn) |      |      |      |
  5  | (gy) |      | (gy) | (gn) |      | (gn) |      |
  4  | (gn) | (gy) | Gy 8 | Gn 7 | (gn) | (gy) |      |
  3  |      | (gn) | Gy 6 | Gn 3 | (gy) |      |      |
  2  |      |      | Gn 5 | Gy 2 |      |      |      |
  1  |      | (gn) | Gy 4 | Gn 1 | (gy) |      |      |

  ht |   0  |   0  |   4  |   4  |   0  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  2E  |  2E  |  6E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 8  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |Gn |   |   |   |
  3  |   |   |Gy |Gn |   |   |   |
  2  |   |   |Gn |Gy |   |   |   |
  1  |   |   |Gy |Gn |   |Gy |   |

        1      2      3      4      5      6      7   
  6  |      |      |      | (gn) |      |      |      |
  5  | (gy) |      |      | (gn) |      | (gn) |      |
  4  | (gn) | (gy) |      | Gn 7 | (gn) | (gy) |      |
  3  |      | (gn) | Gy 6 | Gn 3 | (gy) |      |      |
  2  |      |      | Gn 5 | Gy 2 |      |      |      |
  1  |      | (gn) | Gy 4 | Gn 1 | (gy) | Gy 8 |      |

  ht |   0  |   0  |   3  |   4  |   0  |   1  |   0  |  (discs in column)
 par |  6E  |  6E  |  3O  |  2E  |  6E  |  5O  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gy = your discs, Gn = your opponent's discs.

## Move context
- Your winning rows: EVEN (2,4,6)
- Eval gap: small
- Move played: column 6
- Your move placed a disc on c6r1.
- Better move: column 3
- The better move places a disc on c3r4.
- Key insight: You let your opponent build a J-shape trap.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing an actual count, copy the zone tag shown on that line and wrap the count with it; when a line shows "none", just say so in plain words (e.g. "no minor threats") with no tag. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your minor threats: [zone:player-minor-pre]5[/zone:player-minor-pre]

After the best move (column 3):
- Your minor threats: [zone:player-minor-best]7[/zone:player-minor-best]

After the move played (column 6):
- Your minor threats: [zone:player-minor-played]5[/zone:player-minor-played]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col6]column 6[/zone:col6], [zone:col3]column 3[/zone:col3]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR OPPONENT's threat cells: [c3r2, c4r3, c3r4, c4r4]

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

## KB term definitions

The following tactical concepts apply to this position:

- [term:j_shape] **j shape** (j_shape): A four-disc L-shaped Red cluster generating three simultaneous minor threats that
is equivalent to a major odd-row threat; the opponent cannot block all three paths.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

You missed the [term:j_shape]j shape[/term:j_shape] idea: by playing [zone:col6]column 6[/zone:col6], you let your opponent keep building around [zone:c3r2]that cell[/zone:c3r2], [zone:c4r3]that cell[/zone:c4r3], [zone:c3r4]that cell[/zone:c3r4], and [zone:c4r4]that cell[/zone:c4r4]. The better move would have been to play [zone:col3]column 3[/zone:col3], which would have given you more pressure on your own plan, with your minor threats going from [zone:windows:c1r5|c2r4|c5r1|c5r3|c6r4]5[/zone:windows:c1r5|c2r4|c5r1|c5r3|c6r4] to [zone:windows:c1r5|c2r4|c3r5|c3r6|c5r1|c5r3|c6r4]7[/zone:windows:c1r5|c2r4|c3r5|c3r6|c5r1|c5r3|c6r4], instead of leaving them at [zone:windows:c1r5|c2r4|c5r1|c5r3|c6r4]5[/zone:windows:c1r5|c2r4|c5r1|c5r3|c6r4].

---

### eval-18 — suboptimal_move (sev 1)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on EVEN rows (2,4,6).
Your opponent wins on ODD rows (1,3,5).

## Boards
### Before the move
Move 1  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |   |   |   |   |
  1  |   |   |   |   |Gn |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      |      |      |      |      |
  1  |      |      |      |      | Gn 1 |      |      |

  ht |   0  |   0  |   0  |   0  |   1  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  6E  |  6E  |  5O  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 2  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |   |   |   |   |
  1  |   |   |   |Gy |Gn |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      |      |      |      |      |
  1  |      |      |      | Gy 2 | Gn 1 |      |      |

  ht |   0  |   0  |   0  |   1  |   1  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  6E  |  5O  |  5O  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 2  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |   |   |   |   |
  1  |   |   |   |   |Gn |Gy |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      |      |      |      |      |
  1  |      |      |      |      | Gn 1 | Gy 2 |      |

  ht |   0  |   0  |   0  |   0  |   1  |   1  |   0  |  (discs in column)
 par |  6E  |  6E  |  6E  |  6E  |  5O  |  5O  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gy = your discs, Gn = your opponent's discs.

## Move context
- Your winning rows: EVEN (2,4,6)
- Eval gap: moderate
- Move played: column 6
- Your move placed a disc on c6r1.
- Better move: column 4
- The better move places a disc on c4r1.
- Key insight: There was a stronger move — this one gives ground.

## What the better move leads to

This is a future possibility, NOT a fact on the board yet — these cells are empty now. If your opponent does not defend perfectly, the better move lets you build toward a J-shape threat. In your explanation, point the player at this concrete follow-up by USING the zone tag(s) below (they mark the exact square(s) where it forms); always describe it as something they could build next, never as already present:
- [zone:future-j_shape-1]the square that completes the J-shape[/zone:future-j_shape-1]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col6]column 6[/zone:col6], [zone:col4]column 4[/zone:col4]

Specific present-board cells are not pre-listed here. To point at the future follow-up, use the zone tag(s) provided in the "What the better move leads to" section above — they mark the exact square(s) where it would form.

## Tone
This move gave away a real advantage; explain the concrete consequence.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

Playing [zone:col6]column 6[/zone:col6] gave up the stronger plan: instead of building from [zone:col4]column 4[/zone:col4], you helped your opponent keep the center under control and gave them more time to settle the position. The missed idea was a [zone:cells:c4r1,c5r2,c4r3,c5r3]J-shape threat[/zone:cells:c4r1,c5r2,c4r3,c5r3] build: by playing [zone:col4]column 4[/zone:col4], you could have set up that follow-up next, which would have given you a much cleaner path toward a line on your winning rows.

---

### eval-19 — suboptimal_move (sev 0)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on EVEN rows (2,4,6).
Your opponent wins on ODD rows (1,3,5).

## Boards
### Before the move
Move 5  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |Gn |   |   |   |
  2  |   |   |Gn |Gy |   |   |   |
  1  |   |   |Gy |Gn |   |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      | (gn) |      |
  4  | (gn) |      |      |      | (gn) | (gy) |      |
  3  |      | (gn) |      | Gn 3 | (gy) |      |      |
  2  |      |      | Gn 5 | Gy 2 |      |      |      |
  1  |      | (gn) | Gy 4 | Gn 1 |      |      |      |

  ht |   0  |   0  |   2  |   3  |   0  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  4E  |  3O  |  6E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 6  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |Gy |   |   |   |
  3  |   |   |   |Gn |   |   |   |
  2  |   |   |Gn |Gy |   |   |   |
  1  |   |   |Gy |Gn |   |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      | (gn) |      |
  4  | (gn) |      |      | Gy 6 | (gn) | (gy) |      |
  3  |      | (gn) |      | Gn 3 | (gy) |      |      |
  2  |      |      | Gn 5 | Gy 2 |      |      |      |
  1  |      | (gn) | Gy 4 | Gn 1 |      |      |      |

  ht |   0  |   0  |   2  |   4  |   0  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  4E  |  2E  |  6E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 6  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |Gn |   |   |   |
  2  |   |   |Gn |Gy |   |   |   |
  1  |   |   |Gy |Gn |   |Gy |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      | (gn) |      |
  4  | (gn) |      |      |      | (gn) | (gy) |      |
  3  |      | (gn) |      | Gn 3 | (gy) |      |      |
  2  |      |      | Gn 5 | Gy 2 |      |      |      |
  1  |      | (gn) | Gy 4 | Gn 1 |      | Gy 6 |      |

  ht |   0  |   0  |   2  |   3  |   0  |   1  |   0  |  (discs in column)
 par |  6E  |  6E  |  4E  |  3O  |  6E  |  5O  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gy = your discs, Gn = your opponent's discs.

## Move context
- Your winning rows: EVEN (2,4,6)
- Eval gap: small
- Move played: column 6
- Your move placed a disc on c6r1.
- Better move: column 4
- The better move places a disc on c4r4.
- Key insight: There was a stronger move — this one gives ground.

## What the better move leads to

Your move loses to best play: if your opponent responds perfectly, they punish it by building toward a J-shape threat. This is a future possibility, NOT a fact on the board yet — these cells are empty now. Point the player at how the opponent would punish by USING the zone tag(s) below (they mark the exact square(s) where the opponent's threat would form); describe it as something the opponent could do next, never as already present:
- [zone:opp-future-j_shape-1]the square that completes the J-shape[/zone:opp-future-j_shape-1]
- [zone:opp-future-j_shape-2]another square that gets there[/zone:opp-future-j_shape-2]

This does not guarantee you a win, but if your opponent slips, the better move lets you punish by building toward a double threat — again a future possibility, not a fact on the board yet. Point at it by USING the zone tag(s) below:
- [zone:future-double_threat-1]the square that forks two threats[/zone:future-double_threat-1]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col6]column 6[/zone:col6], [zone:col4]column 4[/zone:col4]

Specific present-board cells are not pre-listed here. To point at the future follow-up, use the zone tag(s) provided in the "What the better move leads to" section above — they mark the exact square(s) where it would form.

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

By playing [zone:col6]column 6[/zone:col6], you gave ground and let your opponent steer the position toward a J-shape setup; the safer idea was to play [zone:col4]column 4[/zone:col4] instead, which would have kept the position more compact and made that future J-shape idea harder to build. That stronger move would also have given you a better chance to aim at a double threat later, rather than handing your opponent the easier path to their next attack.

---

### eval-20 — j_shape (sev 0)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 8  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |Gn |   |   |   |
  3  |   |   |Gy |Gn |   |   |   |
  2  |   |   |Gn |Gy |   |   |   |
  1  |   |   |Gy |Gn |   |Gy |   |

        1      2      3      4      5      6      7   
  6  |      |      |      | (gn) |      |      |      |
  5  | (gy) |      |      | (gn) |      | (gn) |      |
  4  | (gn) | (gy) |      | Gn 7 | (gn) | (gy) |      |
  3  |      | (gn) | Gy 8 | Gn 3 | (gy) |      |      |
  2  |      |      | Gn 5 | Gy 2 |      |      |      |
  1  |      | (gn) | Gy 4 | Gn 1 | (gy) | Gy 6 |      |

  ht |   0  |   0  |   3  |   4  |   0  |   1  |   0  |  (discs in column)
 par |  6E  |  6E  |  3O  |  2E  |  6E  |  5O  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 9  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |Gn |   |   |   |
  4  |   |   |   |Gn |   |   |   |
  3  |   |   |Gy |Gn |   |   |   |
  2  |   |   |Gn |Gy |   |   |   |
  1  |   |   |Gy |Gn |   |Gy |   |

        1      2      3      4      5      6      7   
  6  |      |      |      | <Gn> |      |      |      |
  5  | (gy) |      |      | Gn 9 |      | (gn) |      |
  4  | (gn) | (gy) |      | Gn 7 | (gn) | (gy) |      |
  3  |      | (gn) | Gy 8 | Gn 3 | (gy) |      |      |
  2  |      |      | Gn 5 | Gy 2 |      |      |      |
  1  |      | (gn) | Gy 4 | Gn 1 | (gy) | Gy 6 |      |

  ht |   0  |   0  |   3  |   5  |   0  |   1  |   0  |  (discs in column)
 par |  6E  |  6E  |  3O  |  1O  |  6E  |  5O  |  6E  |  (empty cells: O=odd E=even)
  Major threats: col4 row6 (Gn) [GT]

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 9  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |Gn |   |   |   |
  3  |   |   |Gy |Gn |   |   |   |
  2  |   |   |Gn |Gy |   |   |   |
  1  |   |Gn |Gy |Gn |   |Gy |   |

        1      2      3      4      5      6      7   
  6  |      |      |      | (gn) |      |      |      |
  5  | (gy) |      |      | (gn) |      | (gn) |      |
  4  | (gn) | (gy) |      | Gn 7 | [Gn] | (gy) |      |
  3  |      | (gn) | Gy 8 | Gn 3 | (gy) |      |      |
  2  |      |      | Gn 5 | Gy 2 |      |      |      |
  1  |      | Gn 9 | Gy 4 | Gn 1 | (gy) | Gy 6 |      |

  ht |   0  |   1  |   3  |   4  |   0  |   1  |   0  |  (discs in column)
 par |  6E  |  5O  |  3O  |  2E  |  6E  |  5O  |  6E  |  (empty cells: O=odd E=even)
  Major threats: col5 row4 (Gn)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: small
- Move played: column 2
- Your move placed a disc on c2r1.
- Better move: column 4
- The better move places a disc on c4r5.
- Key insight: There was a stronger move — this one gives ground.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing an actual count, copy the zone tag shown on that line and wrap the count with it; when a line shows "none", just say so in plain words (e.g. "no minor threats") with no tag. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your major threats: none
- Your minor threats: [zone:player-minor-pre]7[/zone:player-minor-pre]

After the best move (column 4):
- Your major threats: none
- Your minor threats: [zone:player-minor-best]5[/zone:player-minor-best]

After the move played (column 2):
- Your major threats: [zone:player-major-played]1[/zone:player-major-played]
- Your minor threats: [zone:player-minor-played]4[/zone:player-minor-played]

## Best-move tactical evidence
The following tactical patterns were present after the best move:
- immediate_threat: cells [c4r6]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col2]column 2[/zone:col2], [zone:col4]column 4[/zone:col4]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR threat cells: [c4r6]

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

## KB term definitions

The following tactical concepts apply to this position:

- [term:immediate_threat] **immediate threat** (immediate_threat): An immediate threat is a major threat whose empty cell is directly playable right now —
it is the topmost empty cell in its column (gravity-top). Playing there wins the game
on this move.
- [term:major_threat] **major threat** (major_threat): A major threat is a four-cell window containing three of your discs and one empty cell.
If that empty cell is the next playable cell in its column (gravity-top), it wins the
game immediately; otherwise it is a latent threat that will become decisive as the
board fills.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

By playing in [zone:col2]column 2[/zone:col2], you gave ground: it only left you with [zone:windows:c5r4]1[/zone:windows:c5r4] major threat and [zone:windows:c1r4|c2r3|c4r5|c4r6]4[/zone:windows:c1r4|c2r3|c4r5|c4r6] minor threats, while the better move in [zone:col4]column 4[/zone:col4] would have kept no major threats and only [zone:windows:c1r4|c2r1|c2r3|c5r4|c6r5]5[/zone:windows:c1r4|c2r1|c2r3|c5r4|c6r5] minor threats. The missed pattern was your [term:immediate_threat]immediate threat[/term:immediate_threat] on [zone:c4r6]that cell[/zone:c4r6]: playing [zone:col4]column 4[/zone:col4] would have built around it and left you in the stronger center-based position, instead of spending your turn on the edge.

---

### eval-21 — drawing_move (sev 0)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 0  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |   |   |   |   |
  1  |   |   |   |   |   |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      |      |      |      |      |
  1  |      |      |      |      |      |      |      |

  ht |   0  |   0  |   0  |   0  |   0  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  6E  |  6E  |  6E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 1  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |   |   |   |   |
  1  |   |   |   |Gn |   |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      |      |      |      |      |
  1  |      |      |      | Gn 1 |      |      |      |

  ht |   0  |   0  |   0  |   1  |   0  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  6E  |  5O  |  6E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 1  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |   |   |   |   |
  1  |   |   |Gn |   |   |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      |      |      |      |      |
  1  |      |      | Gn 1 |      |      |      |      |

  ht |   0  |   0  |   1  |   0  |   0  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  5O  |  6E  |  6E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: small
- Move played: column 3
- Your move placed a disc on c3r1.
- Better move: column 4
- The better move places a disc on c4r1.
- Key insight: You had a move that would have held at least a draw, and this move gave that balance up.

## Why the better move is stronger

In the opening, the more central a column is, the more four-in-a-row lines run through it, so it can take part in more future threats and shapes. Column 4 sits in more of those lines than column 3, so playing there keeps more ways to build a winning connection open, while the less central choice gives some of them up.

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
The move you played results in a draw, but a stronger move was available — explain what that better move would have secured. Do NOT claim the position AFTER your move is winning for you or for your opponent; describe only what the better move would have held or built. (A better move may itself have been stronger than a draw — do not deny that a better option existed.)
Column numbers (1–7) are always valid to reference — they appear in every board header.
Only omit specific CELL references (e.g. c4r3) if the cell is not listed in the boards above.

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Do not invent tactical concept names — describe only what you can see changing between the two boards. Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. A "## Why the better move is stronger" section above gives the concrete reason for THIS position — build your explanation on it (centrality / number of winning lines), do not substitute a vaguer one. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

Playing [zone:col3]column 3[/zone:col3] was a small slip because it gives up some of the central reach you could have kept. [zone:col4]Column 4[/zone:col4] would have been stronger: by placing your disc there, you would have kept more four-in-a-row paths open through the middle of the board and held the position that was at least a draw.

---

### eval-22 — suboptimal_move (sev 1)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on EVEN rows (2,4,6).
Your opponent wins on ODD rows (1,3,5).

## Boards
### Before the move
Move 1  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |   |   |   |   |
  1  |   |   |Gn |   |   |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      |      |      |      |      |
  1  |      |      | Gn 1 |      |      |      |      |

  ht |   0  |   0  |   1  |   0  |   0  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  5O  |  6E  |  6E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 2  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |   |   |   |   |
  1  |   |   |Gn |Gy |   |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      |      |      |      |      |
  1  |      |      | Gn 1 | Gy 2 |      |      |      |

  ht |   0  |   0  |   1  |   1  |   0  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  5O  |  5O  |  6E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 2  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |   |   |   |   |
  1  |Gy |   |Gn |   |   |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      |      |      |      |      |
  1  | Gy 2 |      | Gn 1 |      |      |      |      |

  ht |   1  |   0  |   1  |   0  |   0  |   0  |   0  |  (discs in column)
 par |  5O  |  6E  |  5O  |  6E  |  6E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gy = your discs, Gn = your opponent's discs.

## Move context
- Your winning rows: EVEN (2,4,6)
- Eval gap: moderate
- Move played: column 1
- Your move placed a disc on c1r1.
- Better move: column 4
- The better move places a disc on c4r1.
- Key insight: There was a stronger move — this one gives ground.

## What the better move leads to

This is a future possibility, NOT a fact on the board yet — these cells are empty now. If your opponent does not defend perfectly, the better move lets you build toward a J-shape threat. In your explanation, point the player at this concrete follow-up by USING the zone tag(s) below (they mark the exact square(s) where it forms); always describe it as something they could build next, never as already present:
- [zone:future-j_shape-1]the square that completes the J-shape[/zone:future-j_shape-1]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col1]column 1[/zone:col1], [zone:col4]column 4[/zone:col4]

Specific present-board cells are not pre-listed here. To point at the future follow-up, use the zone tag(s) provided in the "What the better move leads to" section above — they mark the exact square(s) where it would form.

## Tone
This move gave away a real advantage; explain the concrete consequence.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

Playing [zone:col1]column 1[/zone:col1] was too passive because it just sat on the edge and gave your opponent a clean central foothold. You should have played [zone:col4]column 4[/zone:col4] instead, which would have started building toward the [zone:cells:c4r1,c3r2,c4r3,c3r3]square that completes the J-shape[/zone:cells:c4r1,c3r2,c4r3,c3r3] and kept your side of the board more flexible for a stronger follow-up.

---

### eval-23 — suboptimal_move (sev 0)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 18  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |Gy |   |   |   |
  4  |   |Gy |   |Gn |   |Gy |   |
  3  |   |Gn |   |Gy |   |Gn |   |
  2  |   |Gn |   |Gy |Gn |Gn |   |
  1  |Gy |Gy |Gn |Gn |Gy |Gn |Gy |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  | (gy) |      | (gn) | Gy16 | (gn) |      | (gy) |
  4  | (gn) | Gy18 |      | Gn11 | (gy) | Gy14 | [Gn] |
  3  |      | Gn17 | [Gy] | Gy10 | (*)  | Gn13 |      |
  2  |      | Gn 7 | (*)  | Gy 8 | Gn15 | Gn 9 |      |
  1  | Gy 2 | Gy 4 | Gn 1 | Gn 3 | Gy 6 | Gn 5 | Gy12 |

  ht |   1  |   4  |   1  |   5  |   2  |   4  |   1  |  (discs in column)
 par |  5O  |  2E  |  5O  |  1O  |  4E  |  2E  |  5O  |  (empty cells: O=odd E=even)
  Major threats: col3 row3 (Gy)   col7 row4 (Gn)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 19  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |Gn |   |   |   |
  5  |   |   |   |Gy |   |   |   |
  4  |   |Gy |   |Gn |   |Gy |   |
  3  |   |Gn |   |Gy |   |Gn |   |
  2  |   |Gn |   |Gy |Gn |Gn |   |
  1  |Gy |Gy |Gn |Gn |Gy |Gn |Gy |

        1      2      3      4      5      6      7   
  6  |      |      |      | Gn19 |      |      |      |
  5  | (gy) |      | (gn) | Gy16 | (gn) |      | (gy) |
  4  | (gn) | Gy18 |      | Gn11 | (gy) | Gy14 | [Gn] |
  3  |      | Gn17 | [Gy] | Gy10 | (*)  | Gn13 |      |
  2  |      | Gn 7 | (*)  | Gy 8 | Gn15 | Gn 9 |      |
  1  | Gy 2 | Gy 4 | Gn 1 | Gn 3 | Gy 6 | Gn 5 | Gy12 |

  ht |   1  |   4  |   1  |   6  |   2  |   4  |   1  |  (discs in column)
 par |  5O  |  2E  |  5O  |  0E  |  4E  |  2E  |  5O  |  (empty cells: O=odd E=even)
  Major threats: col3 row3 (Gy)   col7 row4 (Gn)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 19  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |Gy |   |   |   |
  4  |   |Gy |   |Gn |   |Gy |   |
  3  |   |Gn |   |Gy |   |Gn |   |
  2  |Gn |Gn |   |Gy |Gn |Gn |   |
  1  |Gy |Gy |Gn |Gn |Gy |Gn |Gy |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  | (gy) |      | (gn) | Gy16 | (gn) |      | (gy) |
  4  | (gn) | Gy18 |      | Gn11 | (gy) | Gy14 | [Gn] |
  3  |      | Gn17 | [Gy] | Gy10 | (*)  | Gn13 |      |
  2  | Gn19 | Gn 7 | (*)  | Gy 8 | Gn15 | Gn 9 |      |
  1  | Gy 2 | Gy 4 | Gn 1 | Gn 3 | Gy 6 | Gn 5 | Gy12 |

  ht |   2  |   4  |   1  |   5  |   2  |   4  |   1  |  (discs in column)
 par |  4E  |  2E  |  5O  |  1O  |  4E  |  2E  |  5O  |  (empty cells: O=odd E=even)
  Major threats: col3 row3 (Gy)   col7 row4 (Gn)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: small
- Move played: column 1
- Your move placed a disc on c1r2.
- Better move: column 4
- The better move places a disc on c4r6.
- Key insight: There was a stronger move — this one gives ground.

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
Column numbers (1–7) are always valid to reference — they appear in every board header.
Only omit specific CELL references (e.g. c4r3) if the cell is not listed in the boards above.

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Do not invent tactical concept names — describe only what you can see changing between the two boards. Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

Playing [zone:col1]column 1[/zone:col1] was a small slip because it only filled [zone:c1r2]that cell[/zone:c1r2], while the better move in [zone:col4]column 4[/zone:col4] would have kept the pressure in the middle and given you more room to work with later. It also made your opponent’s immediate shape less comfortable: before your move there was a major threat shown at [zone:col7]column 7[/zone:col7], and the stronger choice would have helped you keep that side of the board under control instead of giving ground.

---

### eval-24 — drawing_move (sev 1)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 12  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |Gn |   |   |   |
  4  |   |   |   |Gy |   |   |   |
  3  |   |   |   |Gn |   |   |   |
  2  |Gy |   |Gn |Gy |   |   |   |
  1  |Gn |Gy |Gy |Gn |   |Gn |Gy |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      | Gn 5 |      | (gn) |      |
  4  | (gn) |      | (gn) | Gy 4 | (gn) | (gy) |      |
  3  |      | (gn) |      | Gn 3 | (gy) |      |      |
  2  | Gy12 |      | Gn 9 | Gy 2 | (gn) | (gy) |      |
  1  | Gn11 | Gy10 | Gy 6 | Gn 1 |      | Gn 7 | Gy 8 |

  ht |   2  |   1  |   2  |   5  |   0  |   1  |   1  |  (discs in column)
 par |  4E  |  5O  |  4E  |  1O  |  6E  |  5O  |  5O  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 13  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |Gn |   |   |   |
  5  |   |   |   |Gn |   |   |   |
  4  |   |   |   |Gy |   |   |   |
  3  |   |   |   |Gn |   |   |   |
  2  |Gy |   |Gn |Gy |   |   |   |
  1  |Gn |Gy |Gy |Gn |   |Gn |Gy |

        1      2      3      4      5      6      7   
  6  |      |      |      | Gn13 |      |      |      |
  5  |      |      |      | Gn 5 |      | (gn) |      |
  4  | (gn) |      | (gn) | Gy 4 | (gn) | (gy) |      |
  3  |      | (gn) |      | Gn 3 | (gy) |      |      |
  2  | Gy12 |      | Gn 9 | Gy 2 | (gn) | (gy) |      |
  1  | Gn11 | Gy10 | Gy 6 | Gn 1 |      | Gn 7 | Gy 8 |

  ht |   2  |   1  |   2  |   6  |   0  |   1  |   1  |  (discs in column)
 par |  4E  |  5O  |  4E  |  0E  |  6E  |  5O  |  5O  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 13  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |Gn |   |   |   |
  4  |   |   |   |Gy |   |   |   |
  3  |   |   |   |Gn |   |   |   |
  2  |Gy |   |Gn |Gy |   |   |   |
  1  |Gn |Gy |Gy |Gn |Gn |Gn |Gy |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      | Gn 5 |      | (gn) |      |
  4  | (gn) |      | (gn) | Gy 4 | (gn) | (gy) |      |
  3  |      | (gn) |      | Gn 3 | (gy) |      |      |
  2  | Gy12 |      | Gn 9 | Gy 2 | (gn) | (gy) |      |
  1  | Gn11 | Gy10 | Gy 6 | Gn 1 | Gn13 | Gn 7 | Gy 8 |

  ht |   2  |   1  |   2  |   5  |   1  |   1  |   1  |  (discs in column)
 par |  4E  |  5O  |  4E  |  1O  |  5O  |  5O  |  5O  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: moderate
- Move played: column 5
- Your move placed a disc on c5r1.
- Better move: column 4
- The better move places a disc on c4r6.
- Key insight: You had a move that would have held at least a draw, and this move gave that balance up.

## What the better move leads to

This is a future possibility, NOT a fact on the board yet — these cells are empty now. If your opponent does not defend perfectly, the better move lets you build toward a J-shape threat. In your explanation, point the player at this concrete follow-up by USING the zone tag(s) below (they mark the exact square(s) where it forms); always describe it as something they could build next, never as already present:
- [zone:future-j_shape-1]the square that completes the J-shape[/zone:future-j_shape-1]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
The move you played results in a draw, but a stronger move was available — explain what that better move would have secured. Do NOT claim the position AFTER your move is winning for you or for your opponent; describe only what the better move would have held or built. (A better move may itself have been stronger than a draw — do not deny that a better option existed.)
You may reference these columns using zone tags:
[zone:col5]column 5[/zone:col5], [zone:col4]column 4[/zone:col4]

Specific present-board cells are not pre-listed here. To point at the future follow-up, use the zone tag(s) provided in the "What the better move leads to" section above — they mark the exact square(s) where it would form.

## Tone
This move gave away a real advantage; explain the concrete consequence.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

You gave up the move that would have held at least a draw: [zone:col4]column 4[/zone:col4] would have dropped onto [zone:c4r6]that cell[/zone:c4r6] and kept the position balanced, while [zone:col5]column 5[/zone:col5] only filled a quiet spot on the bottom. The missed idea was the J-shape threat: with the better move, you could next build toward [zone:cells:c4r1,c3r2,c4r3,c3r3]the square that completes the J-shape[/zone:cells:c4r1,c3r2,c4r3,c3r3], but your move left that plan out of reach and gave away the safer hold.

---

### eval-25 — suboptimal_move (sev 1)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on EVEN rows (2,4,6).
Your opponent wins on ODD rows (1,3,5).

## Boards
### Before the move
Move 1  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |   |   |   |   |
  1  |   |   |Gn |   |   |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      |      |      |      |      |
  1  |      |      | Gn 1 |      |      |      |      |

  ht |   0  |   0  |   1  |   0  |   0  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  5O  |  6E  |  6E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 2  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |   |   |   |   |
  1  |   |   |Gn |Gy |   |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      |      |      |      |      |
  1  |      |      | Gn 1 | Gy 2 |      |      |      |

  ht |   0  |   0  |   1  |   1  |   0  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  5O  |  5O  |  6E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 2  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |   |   |   |   |
  1  |   |Gy |Gn |   |   |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      |      |      |      |      |
  1  |      | Gy 2 | Gn 1 |      |      |      |      |

  ht |   0  |   1  |   1  |   0  |   0  |   0  |   0  |  (discs in column)
 par |  6E  |  5O  |  5O  |  6E  |  6E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gy = your discs, Gn = your opponent's discs.

## Move context
- Your winning rows: EVEN (2,4,6)
- Eval gap: moderate
- Move played: column 2
- Your move placed a disc on c2r1.
- Better move: column 4
- The better move places a disc on c4r1.
- Key insight: There was a stronger move — this one gives ground.

## What the better move leads to

This is a future possibility, NOT a fact on the board yet — these cells are empty now. If your opponent does not defend perfectly, the better move lets you build toward a J-shape threat. In your explanation, point the player at this concrete follow-up by USING the zone tag(s) below (they mark the exact square(s) where it forms); always describe it as something they could build next, never as already present:
- [zone:future-j_shape-1]the square that completes the J-shape[/zone:future-j_shape-1]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col2]column 2[/zone:col2], [zone:col4]column 4[/zone:col4]

Specific present-board cells are not pre-listed here. To point at the future follow-up, use the zone tag(s) provided in the "What the better move leads to" section above — they mark the exact square(s) where it would form.

## Tone
This move gave away a real advantage; explain the concrete consequence.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

Playing [zone:col2]column 2[/zone:col2] gave up the stronger central build: instead of aiming at [zone:col4]column 4[/zone:col4], where you could have set up the square marked [zone:cells:c4r1,c3r2,c4r3,c3r3]that completes the J-shape[/zone:cells:c4r1,c3r2,c4r3,c3r3], you settled for a side move that gives you less pressure. The missed pattern was a J-shape setup; the better move would have kept your attack pointed through the center and given you a much more useful follow-up next.

---

### eval-26 — suboptimal_move (sev 1)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on EVEN rows (2,4,6).
Your opponent wins on ODD rows (1,3,5).

## Boards
### Before the move
Move 3  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |Gn |   |   |   |   |   |
  1  |   |Gy |Gn |   |   |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      | Gn 3 |      |      |      |      |      |
  1  |      | Gy 2 | Gn 1 |      |      |      |      |

  ht |   0  |   2  |   1  |   0  |   0  |   0  |   0  |  (discs in column)
 par |  6E  |  4E  |  5O  |  6E  |  6E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 4  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |Gy |   |   |   |   |   |
  2  |   |Gn |   |   |   |   |   |
  1  |   |Gy |Gn |   |   |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      | Gy 4 |      |      |      |      |      |
  2  |      | Gn 3 |      |      |      |      |      |
  1  |      | Gy 2 | Gn 1 |      |      |      |      |

  ht |   0  |   3  |   1  |   0  |   0  |   0  |   0  |  (discs in column)
 par |  6E  |  3O  |  5O  |  6E  |  6E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 4  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |Gn |   |   |   |   |   |
  1  |   |Gy |Gn |   |   |Gy |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      | Gn 3 |      |      |      |      |      |
  1  |      | Gy 2 | Gn 1 |      |      | Gy 4 |      |

  ht |   0  |   2  |   1  |   0  |   0  |   1  |   0  |  (discs in column)
 par |  6E  |  4E  |  5O  |  6E  |  6E  |  5O  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gy = your discs, Gn = your opponent's discs.

## Move context
- Your winning rows: EVEN (2,4,6)
- Eval gap: moderate
- Move played: column 6
- Your move placed a disc on c6r1.
- Better move: column 2
- The better move places a disc on c2r3.
- Key insight: There was a stronger move — this one gives ground.

## What the better move leads to

This is a future possibility, NOT a fact on the board yet — these cells are empty now. If your opponent does not defend perfectly, the better move lets you build toward a J-shape threat. In your explanation, point the player at this concrete follow-up by USING the zone tag(s) below (they mark the exact square(s) where it forms); always describe it as something they could build next, never as already present:
- [zone:future-j_shape-1]the square that completes the J-shape[/zone:future-j_shape-1]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col6]column 6[/zone:col6], [zone:col2]column 2[/zone:col2]

Specific present-board cells are not pre-listed here. To point at the future follow-up, use the zone tag(s) provided in the "What the better move leads to" section above — they mark the exact square(s) where it would form.

## Tone
This move gave away a real advantage; explain the concrete consequence.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

Playing [zone:col6]column 6[/zone:col6] gave ground because it just sat on the edge and did not press the position where you were actually close to building something useful. The better move was [zone:col2]column 2[/zone:col2], which would have let you build toward a J-shape threat around [zone:cells:c2r1,c3r2,c2r3,c3r3]that square[/zone:cells:c2r1,c3r2,c2r3,c3r3] instead of spending a turn on a passive move.

---

### eval-27 — forced_block (sev 5)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on EVEN rows (2,4,6).
Your opponent wins on ODD rows (1,3,5).

## Boards
### Before the move
Move 7  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |Gn |   |   |   |   |   |
  3  |   |Gn |   |   |   |   |   |
  2  |   |Gn |   |   |   |Gy |   |
  1  |   |Gy |Gn |   |   |Gy |   |

        1      2      3      4      5      6      7   
  6  |      | (gn) |      |      |      |      |      |
  5  |      | <Gn> |      |      |      |      |      |
  4  |      | Gn 7 |      |      |      | (gy) |      |
  3  |      | Gn 5 |      |      |      | (gy) |      |
  2  |      | Gn 3 |      |      |      | Gy 6 |      |
  1  |      | Gy 2 | Gn 1 |      |      | Gy 4 |      |

  ht |   0  |   4  |   1  |   0  |   0  |   2  |   0  |  (discs in column)
 par |  6E  |  2E  |  5O  |  6E  |  6E  |  4E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: col2 row5 (Gn) [GT]

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 8  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |Gy |   |   |   |   |   |
  4  |   |Gn |   |   |   |   |   |
  3  |   |Gn |   |   |   |   |   |
  2  |   |Gn |   |   |   |Gy |   |
  1  |   |Gy |Gn |   |   |Gy |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      | Gy 8 |      |      |      |      |      |
  4  |      | Gn 7 |      |      |      | (gy) |      |
  3  |      | Gn 5 |      |      |      | (gy) |      |
  2  |      | Gn 3 |      |      |      | Gy 6 |      |
  1  |      | Gy 2 | Gn 1 |      |      | Gy 4 |      |

  ht |   0  |   5  |   1  |   0  |   0  |   2  |   0  |  (discs in column)
 par |  6E  |  1O  |  5O  |  6E  |  6E  |  4E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 8  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |Gn |   |   |   |   |   |
  3  |   |Gn |   |   |   |   |   |
  2  |   |Gn |Gy |   |   |Gy |   |
  1  |   |Gy |Gn |   |   |Gy |   |

        1      2      3      4      5      6      7   
  6  |      | (gn) |      |      |      |      |      |
  5  |      | <Gn> |      |      |      |      |      |
  4  |      | Gn 7 |      |      | (gy) | (gy) |      |
  3  |      | Gn 5 |      | (gy) |      | (gy) |      |
  2  |      | Gn 3 | Gy 8 | (gy) | (gy) | Gy 6 |      |
  1  |      | Gy 2 | Gn 1 |      |      | Gy 4 |      |

  ht |   0  |   4  |   2  |   0  |   0  |   2  |   0  |  (discs in column)
 par |  6E  |  2E  |  4E  |  6E  |  6E  |  4E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: col2 row5 (Gn) [GT]

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gy = your discs, Gn = your opponent's discs.

## Move context
- Your winning rows: EVEN (2,4,6)
- Eval gap: large
- Move played: column 3
- Your move placed a disc on c3r2.
- Better move: column 2
- The better move places a disc on c2r5.
- Key insight: Your opponent was about to win. You had to block and didn't.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing an actual count, copy the zone tag shown on that line and wrap the count with it; when a line shows "none", just say so in plain words (e.g. "no minor threats") with no tag. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your minor threats: [zone:player-minor-pre]2[/zone:player-minor-pre]

After the best move (column 2):
- Your minor threats: [zone:player-minor-best]2[/zone:player-minor-best]

After the move played (column 3):
- Your minor threats: [zone:player-minor-played]6[/zone:player-minor-played]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col3]column 3[/zone:col3], [zone:col2]column 2[/zone:col2]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR OPPONENT's threat cells: [c2r5]

## Tone
This was a significant mistake; explain clearly what was lost.

## KB term definitions

The following tactical concepts apply to this position:

- [term:forced_block] **forced block** (forced_block): A forced block is a situation where the opponent has an immediate threat and only
one specific column prevents the loss. Every other legal move hands the opponent
an immediate win.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

You missed a [term:forced_block]forced block[/term:forced_block]: your opponent already had the live threat at [zone:c2r5]that cell[/zone:c2r5], and only [zone:col2]column 2[/zone:col2] stopped it. By playing [zone:col3]column 3[/zone:col3] instead, you left that threat in place and gave your opponent the win; the better move would have blocked it while keeping your own minor threats at [zone:windows:c6r3|c6r4]2[/zone:windows:c6r3|c6r4] instead of ending up with [zone:windows:c4r2|c4r3|c5r2|c5r4|c6r3|c6r4]6[/zone:windows:c4r2|c4r3|c5r2|c5r4|c6r3|c6r4].

---

### eval-28 — undercut (sev 0)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on EVEN rows (2,4,6).
Your opponent wins on ODD rows (1,3,5).

## Boards
### Before the move
Move 29  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |Gn |Gn |   |Gy |   |
  5  |   |   |Gy |Gn |   |Gy |   |
  4  |Gn |   |Gn |Gy |   |Gn |   |
  3  |Gy |   |Gy |Gn |Gn |Gy |Gn |
  2  |Gn |   |Gn |Gy |Gy |Gn |Gy |
  1  |Gn |Gy |Gy |Gn |Gn |Gy |Gy |

        1      2      3      4      5      6      7   
  6  | (gn) | (gn) | Gn23 | Gn17 | (gn) | Gy24 |      |
  5  | (gy) | (gn) | Gy18 | Gn 5 | [*]  | Gy14 |      |
  4  | Gn25 | (gy) | Gn 9 | Gy 4 |      | Gn13 |      |
  3  | Gy22 | [Gn] | Gy 8 | Gn 3 | Gn27 | Gy12 | Gn29 |
  2  | Gn21 | (gy) | Gn 7 | Gy 2 | Gy20 | Gn11 | Gy28 |
  1  | Gn15 | Gy16 | Gy 6 | Gn 1 | Gn19 | Gy10 | Gy26 |

  ht |   4  |   1  |   6  |   6  |   3  |   6  |   3  |  (discs in column)
 par |  2E  |  5O  |  0E  |  0E  |  3O  |  0E  |  3O  |  (empty cells: O=odd E=even)
  Major threats: col2 row3 (Gn)   col5 row5 (Gn+Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 30  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |Gn |Gn |   |Gy |   |
  5  |   |   |Gy |Gn |   |Gy |   |
  4  |Gn |   |Gn |Gy |   |Gn |Gy |
  3  |Gy |   |Gy |Gn |Gn |Gy |Gn |
  2  |Gn |   |Gn |Gy |Gy |Gn |Gy |
  1  |Gn |Gy |Gy |Gn |Gn |Gy |Gy |

        1      2      3      4      5      6      7   
  6  | (gn) | (gn) | Gn23 | Gn17 | (gn) | Gy24 |      |
  5  | (gy) | (gn) | Gy18 | Gn 5 | [*]  | Gy14 |      |
  4  | Gn25 | (gy) | Gn 9 | Gy 4 |      | Gn13 | Gy30 |
  3  | Gy22 | [Gn] | Gy 8 | Gn 3 | Gn27 | Gy12 | Gn29 |
  2  | Gn21 | (gy) | Gn 7 | Gy 2 | Gy20 | Gn11 | Gy28 |
  1  | Gn15 | Gy16 | Gy 6 | Gn 1 | Gn19 | Gy10 | Gy26 |

  ht |   4  |   1  |   6  |   6  |   3  |   6  |   4  |  (discs in column)
 par |  2E  |  5O  |  0E  |  0E  |  3O  |  0E  |  2E  |  (empty cells: O=odd E=even)
  Major threats: col2 row3 (Gn)   col5 row5 (Gn+Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 30  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |Gn |Gn |   |Gy |   |
  5  |Gy |   |Gy |Gn |   |Gy |   |
  4  |Gn |   |Gn |Gy |   |Gn |   |
  3  |Gy |   |Gy |Gn |Gn |Gy |Gn |
  2  |Gn |   |Gn |Gy |Gy |Gn |Gy |
  1  |Gn |Gy |Gy |Gn |Gn |Gy |Gy |

        1      2      3      4      5      6      7   
  6  | (gn) | (gn) | Gn23 | Gn17 | (gn) | Gy24 |      |
  5  | Gy30 | (gn) | Gy18 | Gn 5 | [*]  | Gy14 |      |
  4  | Gn25 | [Gy] | Gn 9 | Gy 4 |      | Gn13 |      |
  3  | Gy22 | [Gn] | Gy 8 | Gn 3 | Gn27 | Gy12 | Gn29 |
  2  | Gn21 | (gy) | Gn 7 | Gy 2 | Gy20 | Gn11 | Gy28 |
  1  | Gn15 | Gy16 | Gy 6 | Gn 1 | Gn19 | Gy10 | Gy26 |

  ht |   5  |   1  |   6  |   6  |   3  |   6  |   3  |  (discs in column)
 par |  1O  |  5O  |  0E  |  0E  |  3O  |  0E  |  3O  |  (empty cells: O=odd E=even)
  Major threats: col2 row3 (Gn)   col2 row4 (Gy)   col5 row5 (Gn+Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gy = your discs, Gn = your opponent's discs.

## Move context
- Your winning rows: EVEN (2,4,6)
- Eval gap: small
- Move played: column 1
- Your move placed a disc on c1r5.
- Better move: column 7
- The better move places a disc on c7r4.
- Key insight: Your move let your opponent undercut your threat — their lower disc now kills your win.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing an actual count, copy the zone tag shown on that line and wrap the count with it; when a line shows "none", just say so in plain words (e.g. "no minor threats") with no tag. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your major threats: [zone:player-major-pre]1[/zone:player-major-pre]
- Your minor threats: [zone:player-minor-pre]2[/zone:player-minor-pre]

After the best move (column 7):
- Your major threats: [zone:player-major-best]1[/zone:player-major-best]
- Your minor threats: [zone:player-minor-best]2[/zone:player-minor-best]

After the move played (column 1):
- Your major threats: [zone:player-major-played]2[/zone:player-major-played]
- Your minor threats: none

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col1]column 1[/zone:col1], [zone:col7]column 7[/zone:col7]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR OPPONENT's threat cells: [c2r4, c2r5]

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

## KB term definitions

The following tactical concepts apply to this position:

- [term:undercut] **undercut** (undercut): When opposite-color major threats in the same column have opposite row parity, the
lower threat undercuts the upper one because gravity fills bottom-up, neutralizing
the higher threat.
- [term:major_threat] **major threat** (major_threat): A major threat is a four-cell window containing three of your discs and one empty cell.
If that empty cell is the next playable cell in its column (gravity-top), it wins the
game immediately; otherwise it is a latent threat that will become decisive as the
board fills.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

By playing [zone:col1]column 1[/zone:col1], you let your opponent use [zone:cells:c2r4,c2r5]the stacked cells in column 2[/zone:cells:c2r4,c2r5] to [term:undercut]undercut[/term:undercut] your plan, so your higher chance there got cut off instead of staying alive. The better move was [zone:col7]column 7[/zone:col7]: it would have kept your main threat intact while leaving you with [zone:windows:c5r5]1[/zone:windows:c5r5] major threat and [zone:windows:c1r5|c2r4]2[/zone:windows:c1r5|c2r4] minor threats, rather than your move, which left you with [zone:windows:c2r4|c5r5]2[/zone:windows:c2r4|c5r5] major threats and no minor threats.

---

### eval-29 — double_threat (sev 6)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on EVEN rows (2,4,6).
Your opponent wins on ODD rows (1,3,5).

## Boards
### Before the move
Move 3  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |Gy |   |   |   |
  1  |   |   |Gn |Gn |   |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      | Gy 2 |      |      |      |
  1  | (gn) | (gn) | Gn 3 | Gn 1 | (gn) | (gn) |      |

  ht |   0  |   0  |   1  |   2  |   0  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  5O  |  4E  |  6E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 4  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |Gy |   |   |   |
  1  |   |   |Gn |Gn |Gy |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      | (gy) |      |      |      |      |      |
  3  |      |      | (gy) |      |      |      |      |
  2  |      |      |      | Gy 2 |      |      |      |
  1  | (gn) | (gn) | Gn 3 | Gn 1 | Gy 4 |      |      |

  ht |   0  |   0  |   1  |   2  |   1  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  5O  |  4E  |  5O  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 4  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |Gy |Gy |   |   |   |
  1  |   |   |Gn |Gn |   |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  | (gy) | (gy) | Gy 4 | Gy 2 | (gy) | (gy) |      |
  1  | (gn) | (gn) | Gn 3 | Gn 1 | (gn) | (gn) |      |

  ht |   0  |   0  |   2  |   2  |   0  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  4E  |  4E  |  6E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gy = your discs, Gn = your opponent's discs.

## Move context
- Your winning rows: EVEN (2,4,6)
- Eval gap: large
- Move played: column 3
- Your move placed a disc on c3r2.
- Better move: column 5
- The better move places a disc on c5r1.
- Key insight: Your move let your opponent set up two winning threats at once.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing an actual count, copy the zone tag shown on that line and wrap the count with it; when a line shows "none", just say so in plain words (e.g. "no minor threats") with no tag. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your minor threats: none
- Opponent minor threats: [zone:opponent-minor-pre]4[/zone:opponent-minor-pre]

After the best move (column 5):
- Your minor threats: [zone:player-minor-best]2[/zone:player-minor-best]
- Opponent minor threats: [zone:opponent-minor-best]2[/zone:opponent-minor-best]

After the move played (column 3):
- Your minor threats: [zone:player-minor-played]4[/zone:player-minor-played]
- Opponent minor threats: [zone:opponent-minor-played]4[/zone:opponent-minor-played]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col3]column 3[/zone:col3], [zone:col5]column 5[/zone:col5]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR OPPONENT's threat cells: [c1r1, c5r1]

## Tone
This was a significant mistake; explain clearly what was lost.

## KB term definitions

The following tactical concepts apply to this position:

- [term:double_threat] **double threat** (double_threat): A double threat (fork) is a single move that creates two simultaneous immediate
threats. Since the opponent can play only one column per turn, one threat is always
left open — guaranteeing a win on the very next move.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

You gave away a [term:double_threat]double threat[/term:double_threat]: by playing in [zone:col3]column 3[/zone:col3], you let your opponent build pressure on both [zone:c1r1]that cell[/zone:c1r1] and [zone:c5r1]that cell[/zone:c5r1], leaving them with [zone:windows:c1r1|c2r1|c5r1|c6r1]4[/zone:windows:c1r1|c2r1|c5r1|c6r1] minor threats instead of the [zone:windows:c1r1|c2r1]2[/zone:windows:c1r1|c2r1] they would have had after the better move in [zone:col5]column 5[/zone:col5]. Your better move would have kept that fork from forming and given you a safer plan, with [zone:windows:c2r4|c3r3]2[/zone:windows:c2r4|c3r3] minor threats of your own rather than the more exposed position you created.

---

### eval-30 — suboptimal_move (sev 0)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on EVEN rows (2,4,6).
Your opponent wins on ODD rows (1,3,5).

## Boards
### Before the move
Move 1  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |   |   |   |   |
  1  |   |   |   |Gn |   |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      |      |      |      |      |
  1  |      |      |      | Gn 1 |      |      |      |

  ht |   0  |   0  |   0  |   1  |   0  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  6E  |  5O  |  6E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 2  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |Gy |   |   |   |
  1  |   |   |   |Gn |   |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      | Gy 2 |      |      |      |
  1  |      |      |      | Gn 1 |      |      |      |

  ht |   0  |   0  |   0  |   2  |   0  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  6E  |  4E  |  6E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 2  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |   |   |   |   |
  1  |   |   |   |Gn |Gy |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      |      |      |      |      |
  1  |      |      |      | Gn 1 | Gy 2 |      |      |

  ht |   0  |   0  |   0  |   1  |   1  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  6E  |  5O  |  5O  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gy = your discs, Gn = your opponent's discs.

## Move context
- Your winning rows: EVEN (2,4,6)
- Eval gap: small
- Move played: column 5
- Your move placed a disc on c5r1.
- Better move: column 4
- The better move places a disc on c4r2.
- Key insight: There was a stronger move — this one gives ground.

## What the better move leads to

This does not guarantee you a win, but if your opponent slips, the better move lets you punish by building toward a figure-7 fork — again a future possibility, not a fact on the board yet. Point at it by USING the zone tag(s) below:
- [zone:future-figure_7-1]the square that completes the figure-7[/zone:future-figure_7-1]
- [zone:future-figure_7-2]another square that gets there[/zone:future-figure_7-2]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col5]column 5[/zone:col5], [zone:col4]column 4[/zone:col4]

Specific present-board cells are not pre-listed here. To point at the future follow-up, use the zone tag(s) provided in the "What the better move leads to" section above — they mark the exact square(s) where it would form.

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

Playing [zone:col5]column 5[/zone:col5] gave your opponent extra breathing room; it just sat on the edge and did not build anything urgent for you. The better move was [zone:col4]column 4[/zone:col4], which would have put your disc on [zone:c4r2]that cell[/zone:c4r2] and kept the position pointed toward a future [zone:cells:c5r1,c4r2,c5r3,c4r3,c3r3]figure-7 setup[/zone:cells:c5r1,c4r2,c5r3,c4r3,c3r3] with the follow-up at [zone:cells:c3r1,c4r2,c3r3,c4r3,c5r3]the other key square[/zone:cells:c3r1,c4r2,c3r3,c4r3,c5r3].

---

### eval-31 — forced_block (sev 7)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on EVEN rows (2,4,6).
Your opponent wins on ODD rows (1,3,5).

## Boards
### Before the move
Move 17  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |Gy |   |   |   |   |   |
  5  |   |Gy |   |   |   |   |   |
  4  |   |Gy |   |Gn |   |   |   |
  3  |   |Gn |   |Gy |Gn |   |   |
  2  |   |Gn |   |Gy |Gy |   |   |
  1  |Gn |Gn |Gy |Gn |Gy |Gn |Gn |

        1      2      3      4      5      6      7   
  6  | (gy) | Gy16 |      |      |      |      |      |
  5  | (gy) | Gy12 | (gn) |      | (gn) |      |      |
  4  | (gn) | Gy10 | [Gy] | Gn11 |      |      |      |
  3  |      | Gn 9 | [*]  | Gy 8 | Gn15 |      |      |
  2  |      | Gn 7 | (*)  | Gy 4 | Gy14 | <Gn> | (gy) |
  1  | Gn 5 | Gn 3 | Gy 6 | Gn 1 | Gy 2 | Gn17 | Gn13 |

  ht |   1  |   6  |   1  |   4  |   3  |   1  |   1  |  (discs in column)
 par |  5O  |  0E  |  5O  |  2E  |  3O  |  5O  |  5O  |  (empty cells: O=odd E=even)
  Major threats: col3 row3 (Gn+Gy)   col3 row4 (Gy)   col6 row2 (Gn) [GT]

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 18  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |Gy |   |   |   |   |   |
  5  |   |Gy |   |   |   |   |   |
  4  |   |Gy |   |Gn |   |   |   |
  3  |   |Gn |   |Gy |Gn |   |   |
  2  |   |Gn |   |Gy |Gy |Gy |   |
  1  |Gn |Gn |Gy |Gn |Gy |Gn |Gn |

        1      2      3      4      5      6      7   
  6  | (gy) | Gy16 |      |      |      |      |      |
  5  | (gy) | Gy12 |      |      | (gn) |      |      |
  4  | (gn) | Gy10 | [Gy] | Gn11 |      |      |      |
  3  |      | Gn 9 | [*]  | Gy 8 | Gn15 |      |      |
  2  |      | Gn 7 | <Gy> | Gy 4 | Gy14 | Gy18 | <Gy> |
  1  | Gn 5 | Gn 3 | Gy 6 | Gn 1 | Gy 2 | Gn17 | Gn13 |

  ht |   1  |   6  |   1  |   4  |   3  |   2  |   1  |  (discs in column)
 par |  5O  |  0E  |  5O  |  2E  |  3O  |  4E  |  5O  |  (empty cells: O=odd E=even)
  Major threats: col3 row2 (Gy) [GT]   col3 row3 (Gn+Gy)   col3 row4 (Gy)   col7 row2 (Gy) [GT]

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 18  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |Gy |   |   |   |   |   |
  5  |   |Gy |   |   |   |   |   |
  4  |   |Gy |   |Gn |   |   |   |
  3  |   |Gn |   |Gy |Gn |   |   |
  2  |   |Gn |Gy |Gy |Gy |   |   |
  1  |Gn |Gn |Gy |Gn |Gy |Gn |Gn |

        1      2      3      4      5      6      7   
  6  | (gy) | Gy16 |      |      |      |      |      |
  5  | (gy) | Gy12 | (gn) |      | (gn) | (gy) |      |
  4  |      | Gy10 | [Gy] | Gn11 | (gy) |      |      |
  3  |      | Gn 9 | <*>  | Gy 8 | Gn15 |      |      |
  2  |      | Gn 7 | Gy18 | Gy 4 | Gy14 | <*>  | (gy) |
  1  | Gn 5 | Gn 3 | Gy 6 | Gn 1 | Gy 2 | Gn17 | Gn13 |

  ht |   1  |   6  |   2  |   4  |   3  |   1  |   1  |  (discs in column)
 par |  5O  |  0E  |  4E  |  2E  |  3O  |  5O  |  5O  |  (empty cells: O=odd E=even)
  Major threats: col3 row3 (Gn+Gy) [GT]   col3 row4 (Gy)   col6 row2 (Gn+Gy) [GT]

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gy = your discs, Gn = your opponent's discs.

## Move context
- Your winning rows: EVEN (2,4,6)
- Eval gap: large
- Move played: column 3
- Your move placed a disc on c3r2.
- Better move: column 6
- The better move places a disc on c6r2.
- Key insight: Your opponent was about to win. You had to block and didn't.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing an actual count, copy the zone tag shown on that line and wrap the count with it; when a line shows "none", just say so in plain words (e.g. "no minor threats") with no tag. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your major threats: [zone:player-major-pre]2[/zone:player-major-pre]
- Your minor threats: [zone:player-minor-pre]3[/zone:player-minor-pre]
- Opponent major threats: [zone:opponent-major-pre]1[/zone:opponent-major-pre]
- Opponent minor threats: [zone:opponent-minor-pre]2[/zone:opponent-minor-pre]

After the best move (column 6):
- Your major threats: [zone:player-major-best]2[/zone:player-major-best]
- Your minor threats: none
- Opponent major threats: [zone:opponent-major-best]1[/zone:opponent-major-best]
- Opponent minor threats: [zone:opponent-minor-best]2[/zone:opponent-minor-best]

After the move played (column 3):
- Your major threats: [zone:player-major-played]1[/zone:player-major-played]
- Your minor threats: [zone:player-minor-played]4[/zone:player-minor-played]
- Opponent major threats: none
- Opponent minor threats: none

## Best-move tactical evidence
The following tactical patterns were present after the best move:
- immediate_threat: cells [c3r2, c7r2]
- double_threat: cells [c3r2, c7r2]
- undercut: cells [c3r3, c3r4]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col3]column 3[/zone:col3], [zone:col6]column 6[/zone:col6]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR threat cells: [c3r3, c3r4, c3r2, c7r2]
- YOUR OPPONENT's threat cells: [c6r2]

## Tone
This was a significant mistake; explain clearly what was lost.

## KB term definitions

The following tactical concepts apply to this position:

- [term:double_threat] **double threat** (double_threat): A double threat (fork) is a single move that creates two simultaneous immediate
threats. Since the opponent can play only one column per turn, one threat is always
left open — guaranteeing a win on the very next move.
- [term:immediate_threat] **immediate threat** (immediate_threat): An immediate threat is a major threat whose empty cell is directly playable right now —
it is the topmost empty cell in its column (gravity-top). Playing there wins the game
on this move.
- [term:forced_block] **forced block** (forced_block): A forced block is a situation where the opponent has an immediate threat and only
one specific column prevents the loss. Every other legal move hands the opponent
an immediate win.
- [term:undercut] **undercut** (undercut): When opposite-color major threats in the same column have opposite row parity, the
lower threat undercuts the upper one because gravity fills bottom-up, neutralizing
the higher threat.
- [term:major_threat] **major threat** (major_threat): A major threat is a four-cell window containing three of your discs and one empty cell.
If that empty cell is the next playable cell in its column (gravity-top), it wins the
game immediately; otherwise it is a latent threat that will become decisive as the
board fills.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

You missed a [term:forced_block]forced block[/term:forced_block]: your opponent already had a playable win sitting at [zone:c6r2]that cell[/zone:c6r2], so playing [zone:col3]column 3[/zone:col3] let you chase your own idea instead of stopping the loss. The better move would have been [zone:col6]column 6[/zone:col6], which keeps your opponent’s major threats at [zone:windows:c3r3]1[/zone:windows:c3r3] instead of leaving you with no answer, and it also preserves your own stronger setup: you keep [zone:windows:c3r3|c3r4]2[/zone:windows:c3r3|c3r4] major threats while avoiding the drop to [zone:windows:c3r4]1[/zone:windows:c3r4] and the awkward extra minor buildup.

---

### eval-32 — immediate_threat (sev 7)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 18  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |Gy |   |   |   |   |   |
  5  |   |Gy |   |   |   |   |   |
  4  |   |Gy |   |Gn |   |   |   |
  3  |   |Gn |   |Gy |Gn |   |   |
  2  |   |Gn |Gy |Gy |Gy |   |   |
  1  |Gn |Gn |Gy |Gn |Gy |Gn |Gn |

        1      2      3      4      5      6      7   
  6  | (gy) | Gy16 |      |      |      |      |      |
  5  | (gy) | Gy12 | (gn) |      | (gn) | (gy) |      |
  4  |      | Gy10 | [Gy] | Gn11 | (gy) |      |      |
  3  |      | Gn 9 | <*>  | Gy 8 | Gn15 |      |      |
  2  |      | Gn 7 | Gy18 | Gy 4 | Gy14 | <*>  | (gy) |
  1  | Gn 5 | Gn 3 | Gy 6 | Gn 1 | Gy 2 | Gn17 | Gn13 |

  ht |   1  |   6  |   2  |   4  |   3  |   1  |   1  |  (discs in column)
 par |  5O  |  0E  |  4E  |  2E  |  3O  |  5O  |  5O  |  (empty cells: O=odd E=even)
  Major threats: col3 row3 (Gn+Gy) [GT]   col3 row4 (Gy)   col6 row2 (Gn+Gy) [GT]

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 19  |  Next: Gray  [GAME OVER]

       1   2   3   4   5   6   7 
  6  |   |Gy |   |   |   |   |   |
  5  |   |Gy |   |   |   |   |   |
  4  |   |Gy |   |Gn |   |   |   |
  3  |   |Gn |Gn |Gy |Gn |   |   |
  2  |   |Gn |Gy |Gy |Gy |   |   |
  1  |Gn |Gn |Gy |Gn |Gy |Gn |Gn |

        1      2      3      4      5      6      7   
  6  | (gy) | Gy16 |      |      |      | (gn) |      |
  5  |      | Gy12 | (gn) |      | [Gn] | (gy) |      |
  4  |      | Gy10 | <Gy> | Gn11 | (gy) |      |      |
  3  |      | Gn 9 | Gn19 | Gy 8 | Gn15 |      |      |
  2  |      | Gn 7 | Gy18 | Gy 4 | Gy14 | <*>  | (gy) |
  1  | Gn 5 | Gn 3 | Gy 6 | Gn 1 | Gy 2 | Gn17 | Gn13 |

  ht |   1  |   6  |   3  |   4  |   3  |   1  |   1  |  (discs in column)
 par |  5O  |  0E  |  3O  |  2E  |  3O  |  5O  |  5O  |  (empty cells: O=odd E=even)
  Major threats: col3 row4 (Gy) [GT]   col5 row5 (Gn)   col6 row2 (Gn+Gy) [GT]

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 19  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |Gy |   |   |   |   |   |
  5  |   |Gy |   |   |   |   |   |
  4  |   |Gy |   |Gn |   |   |   |
  3  |   |Gn |   |Gy |Gn |   |   |
  2  |Gn |Gn |Gy |Gy |Gy |   |   |
  1  |Gn |Gn |Gy |Gn |Gy |Gn |Gn |

        1      2      3      4      5      6      7   
  6  | (gy) | Gy16 |      |      |      |      |      |
  5  | (gy) | Gy12 | (gn) | (gn) | (gn) | (gy) |      |
  4  | (gn) | Gy10 | [Gy] | Gn11 | (gy) |      |      |
  3  | (gn) | Gn 9 | <*>  | Gy 8 | Gn15 |      |      |
  2  | Gn19 | Gn 7 | Gy18 | Gy 4 | Gy14 | <*>  | (gy) |
  1  | Gn 5 | Gn 3 | Gy 6 | Gn 1 | Gy 2 | Gn17 | Gn13 |

  ht |   2  |   6  |   2  |   4  |   3  |   1  |   1  |  (discs in column)
 par |  4E  |  0E  |  4E  |  2E  |  3O  |  5O  |  5O  |  (empty cells: O=odd E=even)
  Major threats: col3 row3 (Gn+Gy) [GT]   col3 row4 (Gy)   col6 row2 (Gn+Gy) [GT]

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: large
- Move played: column 1
- Your move placed a disc on c1r2.
- Better move: column 3
- The better move places a disc on c3r3.
- Key insight: You had a winning move right there and didn't take it.

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col1]column 1[/zone:col1], [zone:col3]column 3[/zone:col3]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR threat cells: [c3r3, c6r2]

## Tone
This was a significant mistake; explain clearly what was lost.

## KB term definitions

The following tactical concepts apply to this position:

- [term:double_threat] **double threat** (double_threat): A double threat (fork) is a single move that creates two simultaneous immediate
threats. Since the opponent can play only one column per turn, one threat is always
left open — guaranteeing a win on the very next move.
- [term:immediate_threat] **immediate threat** (immediate_threat): An immediate threat is a major threat whose empty cell is directly playable right now —
it is the topmost empty cell in its column (gravity-top). Playing there wins the game
on this move.
- [term:major_threat] **major threat** (major_threat): A major threat is a four-cell window containing three of your discs and one empty cell.
If that empty cell is the next playable cell in its column (gravity-top), it wins the
game immediately; otherwise it is a latent threat that will become decisive as the
board fills.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

You missed [term:immediate_threat]an immediate threat[/term:immediate_threat] in [zone:col3]column 3[/zone:col3]: playing there would have put your disc on [zone:c3r3]that cell[/zone:c3r3] and finished the game at once, while your move in [zone:col1]column 1[/zone:col1] left that win on the board. Instead of taking the win, you gave up the chance to end it immediately and left your opponent with the chance to keep the game going.

---

### eval-33 — suboptimal_move (sev 0)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on EVEN rows (2,4,6).
Your opponent wins on ODD rows (1,3,5).

## Boards
### Before the move
Move 1  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |   |   |   |   |
  1  |   |   |   |Gn |   |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      |      |      |      |      |
  1  |      |      |      | Gn 1 |      |      |      |

  ht |   0  |   0  |   0  |   1  |   0  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  6E  |  5O  |  6E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 2  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |Gy |   |   |   |
  1  |   |   |   |Gn |   |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      | Gy 2 |      |      |      |
  1  |      |      |      | Gn 1 |      |      |      |

  ht |   0  |   0  |   0  |   2  |   0  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  6E  |  4E  |  6E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 2  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |   |   |   |   |
  1  |   |Gy |   |Gn |   |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      |      |      |      |      |
  1  |      | Gy 2 |      | Gn 1 |      |      |      |

  ht |   0  |   1  |   0  |   1  |   0  |   0  |   0  |  (discs in column)
 par |  6E  |  5O  |  6E  |  5O  |  6E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gy = your discs, Gn = your opponent's discs.

## Move context
- Your winning rows: EVEN (2,4,6)
- Eval gap: small
- Move played: column 2
- Your move placed a disc on c2r1.
- Better move: column 4
- The better move places a disc on c4r2.
- Key insight: There was a stronger move — this one gives ground.

## What the better move leads to

This does not guarantee you a win, but if your opponent slips, the better move lets you punish by building toward a figure-7 fork — again a future possibility, not a fact on the board yet. Point at it by USING the zone tag(s) below:
- [zone:future-figure_7-1]the square that completes the figure-7[/zone:future-figure_7-1]
- [zone:future-figure_7-2]another square that gets there[/zone:future-figure_7-2]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col2]column 2[/zone:col2], [zone:col4]column 4[/zone:col4]

Specific present-board cells are not pre-listed here. To point at the future follow-up, use the zone tag(s) provided in the "What the better move leads to" section above — they mark the exact square(s) where it would form.

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

[zone:col2]column 2[/zone:col2] was a small inaccuracy because it gave ground on the opening while [zone:col4]column 4[/zone:col4] kept your shape more central and more useful for future play. The better move would have built toward a future figure-7 fork, with one key follow-up at [zone:cells:c5r1,c4r2,c5r3,c4r3,c3r3]the square that completes the figure-7[/zone:cells:c5r1,c4r2,c5r3,c4r3,c3r3] and another path through [zone:cells:c3r1,c4r2,c3r3,c4r3,c5r3]another square that gets there[/zone:cells:c3r1,c4r2,c3r3,c4r3,c5r3], giving you a stronger way to press if your opponent slips.

---

### eval-34 — suboptimal_move (sev 0)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on EVEN rows (2,4,6).
Your opponent wins on ODD rows (1,3,5).

## Boards
### Before the move
Move 5  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |Gn |   |   |   |
  2  |   |Gn |   |Gy |   |   |   |
  1  |   |Gy |   |Gn |   |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      | Gn 5 |      |      |      |
  2  |      | Gn 3 |      | Gy 4 |      |      |      |
  1  |      | Gy 2 |      | Gn 1 |      |      |      |

  ht |   0  |   2  |   0  |   3  |   0  |   0  |   0  |  (discs in column)
 par |  6E  |  4E  |  6E  |  3O  |  6E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 6  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |Gy |   |   |   |
  3  |   |   |   |Gn |   |   |   |
  2  |   |Gn |   |Gy |   |   |   |
  1  |   |Gy |   |Gn |   |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      | Gy 6 |      |      |      |
  3  |      |      |      | Gn 5 |      |      |      |
  2  |      | Gn 3 |      | Gy 4 |      |      |      |
  1  |      | Gy 2 |      | Gn 1 |      |      |      |

  ht |   0  |   2  |   0  |   4  |   0  |   0  |   0  |  (discs in column)
 par |  6E  |  4E  |  6E  |  2E  |  6E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 6  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |Gy |   |Gn |   |   |   |
  2  |   |Gn |   |Gy |   |   |   |
  1  |   |Gy |   |Gn |   |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      | Gy 6 |      | Gn 5 |      |      |      |
  2  |      | Gn 3 |      | Gy 4 |      |      |      |
  1  |      | Gy 2 |      | Gn 1 |      |      |      |

  ht |   0  |   3  |   0  |   3  |   0  |   0  |   0  |  (discs in column)
 par |  6E  |  3O  |  6E  |  3O  |  6E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gy = your discs, Gn = your opponent's discs.

## Move context
- Your winning rows: EVEN (2,4,6)
- Eval gap: small
- Move played: column 2
- Your move placed a disc on c2r3.
- Better move: column 4
- The better move places a disc on c4r4.
- Key insight: There was a stronger move — this one gives ground.

## What the better move leads to

Your move loses to best play: if your opponent responds perfectly, they punish it by building toward a J-shape threat. This is a future possibility, NOT a fact on the board yet — these cells are empty now. Point the player at how the opponent would punish by USING the zone tag(s) below (they mark the exact square(s) where the opponent's threat would form); describe it as something the opponent could do next, never as already present:
- [zone:opp-future-j_shape-1]the square that completes the J-shape[/zone:opp-future-j_shape-1]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col2]column 2[/zone:col2], [zone:col4]column 4[/zone:col4]

Specific present-board cells are not pre-listed here. To point at the future follow-up, use the zone tag(s) provided in the "What the better move leads to" section above — they mark the exact square(s) where it would form.

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

You gave away the chance to make [zone:col4]column 4[/zone:col4] the more active place to play, and instead your move in [zone:col2]column 2[/zone:col2] let your opponent prepare a J-shape threat around [zone:cells:c4r1,c5r2,c4r3,c5r3]that square[/zone:cells:c4r1,c5r2,c4r3,c5r3]. The better move would have been to play [zone:col4]column 4[/zone:col4], which keeps the position more controlled for you on the even rows and makes it harder for your opponent to build that kind of shape.

---

### eval-35 — double_threat (sev 6)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 4  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |Gy |   |   |   |
  2  |   |   |   |Gy |   |   |   |
  1  |   |   |   |Gn |Gn |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      | (gy) |      |      |      |
  4  |      |      |      | (gy) |      |      |      |
  3  |      |      |      | Gy 4 |      |      |      |
  2  |      |      |      | Gy 2 |      |      |      |
  1  |      | (gn) | (gn) | Gn 1 | Gn 3 | (gn) | (gn) |

  ht |   0  |   0  |   0  |   3  |   1  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  6E  |  3O  |  5O  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 5  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |Gy |   |   |   |
  2  |   |   |   |Gy |   |   |   |
  1  |   |   |Gn |Gn |Gn |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      | (gy) |      |      |      |
  4  |      |      |      | (gy) |      |      |      |
  3  |      |      |      | Gy 4 |      |      |      |
  2  |      |      |      | Gy 2 |      |      |      |
  1  | (gn) | <Gn> | Gn 5 | Gn 1 | Gn 3 | <Gn> | (gn) |

  ht |   0  |   0  |   1  |   3  |   1  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  5O  |  3O  |  5O  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: col2 row1 (Gn) [GT]   col6 row1 (Gn) [GT]

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 5  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |Gn |   |   |   |
  3  |   |   |   |Gy |   |   |   |
  2  |   |   |   |Gy |   |   |   |
  1  |   |   |   |Gn |Gn |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      | Gn 5 |      |      |      |
  3  |      |      |      | Gy 4 |      |      |      |
  2  |      |      |      | Gy 2 |      |      |      |
  1  |      | (gn) | (gn) | Gn 1 | Gn 3 | (gn) | (gn) |

  ht |   0  |   0  |   0  |   4  |   1  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  6E  |  2E  |  5O  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: large
- Move played: column 4
- Your move placed a disc on c4r4.
- Better move: column 3
- The better move places a disc on c3r1.
- Key insight: You could have built a double threat — two winning columns at once — and missed it.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing an actual count, copy the zone tag shown on that line and wrap the count with it; when a line shows "none", just say so in plain words (e.g. "no minor threats") with no tag. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your minor threats: [zone:player-minor-pre]4[/zone:player-minor-pre]
- Opponent minor threats: [zone:opponent-minor-pre]2[/zone:opponent-minor-pre]

After the best move (column 3):
- Your minor threats: none
- Opponent minor threats: [zone:opponent-minor-best]2[/zone:opponent-minor-best]

After the move played (column 4):
- Your minor threats: [zone:player-minor-played]4[/zone:player-minor-played]
- Opponent minor threats: none

## Best-move tactical evidence
The following tactical patterns were present after the best move:
- immediate_threat: cells [c2r1, c6r1]
- double_threat: cells [c2r1, c6r1]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col4]column 4[/zone:col4], [zone:col3]column 3[/zone:col3]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR threat cells: [c2r1, c6r1]

## Tone
This was a significant mistake; explain clearly what was lost.

## KB term definitions

The following tactical concepts apply to this position:

- [term:double_threat] **double threat** (double_threat): A double threat (fork) is a single move that creates two simultaneous immediate
threats. Since the opponent can play only one column per turn, one threat is always
left open — guaranteeing a win on the very next move.
- [term:immediate_threat] **immediate threat** (immediate_threat): An immediate threat is a major threat whose empty cell is directly playable right now —
it is the topmost empty cell in its column (gravity-top). Playing there wins the game
on this move.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

You missed a [term:double_threat]double threat[/term:double_threat]: by playing [zone:col3]column 3[/zone:col3], you could have made both [zone:c2r1]that cell[/zone:c2r1] and [zone:c6r1]that cell[/zone:c6r1] into immediate threats, so your opponent would only be able to answer one of them. Instead, your move in [zone:col4]column 4[/zone:col4] just left you with [zone:windows:c2r1|c3r1|c6r1|c7r1]4[/zone:windows:c2r1|c3r1|c6r1|c7r1] minor threats, whereas the better move would have left you with no minor threats while preserving your opponent’s [zone:windows:c4r4|c4r5]2[/zone:windows:c4r4|c4r5] minor threats from the pre-move position.

---

### eval-36 — immediate_threat (sev 0)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on EVEN rows (2,4,6).
Your opponent wins on ODD rows (1,3,5).

## Boards
### Before the move
Move 13  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |Gn |   |   |   |
  3  |   |   |   |Gy |Gy |Gn |   |
  2  |   |   |Gn |Gy |Gy |Gn |   |
  1  |Gn |   |Gy |Gn |Gn |Gy |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      | (gy) |      |      | (gy) | (gn) | (gy) |
  4  | (gn) |      | [Gy] | Gn 5 | (gy) | <Gy> |      |
  3  |      | (*)  | (*)  | Gy 4 | Gy12 | Gn11 |      |
  2  |      | (gn) | Gn 9 | Gy 2 | Gy10 | Gn 7 |      |
  1  | Gn13 |      | Gy 8 | Gn 1 | Gn 3 | Gy 6 |      |

  ht |   1  |   0  |   2  |   4  |   3  |   3  |   0  |  (discs in column)
 par |  5O  |  6E  |  4E  |  2E  |  3O  |  3O  |  6E  |  (empty cells: O=odd E=even)
  Major threats: col3 row4 (Gy)   col6 row4 (Gy) [GT]

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 14  |  Next: Green  [GAME OVER]

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |Gn |   |Gy |   |
  3  |   |   |   |Gy |Gy |Gn |   |
  2  |   |   |Gn |Gy |Gy |Gn |   |
  1  |Gn |   |Gy |Gn |Gn |Gy |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      | (gy) |      |      | (gy) |      | [Gy] |
  4  | (gn) |      | [Gy] | Gn 5 | (gy) | Gy14 |      |
  3  |      | (*)  | (*)  | Gy 4 | Gy12 | Gn11 |      |
  2  |      | (gn) | Gn 9 | Gy 2 | Gy10 | Gn 7 |      |
  1  | Gn13 |      | Gy 8 | Gn 1 | Gn 3 | Gy 6 |      |

  ht |   1  |   0  |   2  |   4  |   3  |   4  |   0  |  (discs in column)
 par |  5O  |  6E  |  4E  |  2E  |  3O  |  2E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: col3 row4 (Gy)   col7 row5 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 14  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |Gn |Gy |   |   |
  3  |   |   |   |Gy |Gy |Gn |   |
  2  |   |   |Gn |Gy |Gy |Gn |   |
  1  |Gn |   |Gy |Gn |Gn |Gy |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      | (gy) |      | (gy) |
  5  |      | (gy) |      |      | <Gy> | (*)  | (gy) |
  4  | (gn) |      | [Gy] | Gn 5 | Gy14 | <Gy> |      |
  3  |      | (*)  | (*)  | Gy 4 | Gy12 | Gn11 |      |
  2  |      | (gn) | Gn 9 | Gy 2 | Gy10 | Gn 7 |      |
  1  | Gn13 |      | Gy 8 | Gn 1 | Gn 3 | Gy 6 |      |

  ht |   1  |   0  |   2  |   4  |   4  |   3  |   0  |  (discs in column)
 par |  5O  |  6E  |  4E  |  2E  |  2E  |  3O  |  6E  |  (empty cells: O=odd E=even)
  Major threats: col3 row4 (Gy)   col5 row5 (Gy) [GT]   col6 row4 (Gy) [GT]

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gy = your discs, Gn = your opponent's discs.

## Move context
- Your winning rows: EVEN (2,4,6)
- Eval gap: small
- Move played: column 5
- Your move placed a disc on c5r4.
- Better move: column 6
- The better move places a disc on c6r4.
- Key insight: You had a winning move right there and didn't take it.

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col5]column 5[/zone:col5], [zone:col6]column 6[/zone:col6], [zone:col1]column 1[/zone:col1]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR threat cells: [c6r4]

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

## KB term definitions

The following tactical concepts apply to this position:

- [term:double_threat] **double threat** (double_threat): A double threat (fork) is a single move that creates two simultaneous immediate
threats. Since the opponent can play only one column per turn, one threat is always
left open — guaranteeing a win on the very next move.
- [term:immediate_threat] **immediate threat** (immediate_threat): An immediate threat is a major threat whose empty cell is directly playable right now —
it is the topmost empty cell in its column (gravity-top). Playing there wins the game
on this move.
- [term:z_threat] **z threat** (z_threat): A Z-Threat is a major threat where the count of empty cells from column height to
the threat row is odd, letting the owner toggle zugzwang control.
- [term:major_threat] **major threat** (major_threat): A major threat is a four-cell window containing three of your discs and one empty cell.
If that empty cell is the next playable cell in its column (gravity-top), it wins the
game immediately; otherwise it is a latent threat that will become decisive as the
board fills.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

You had a [term:immediate_threat]immediate threat[/term:immediate_threat] sitting in [zone:c6r4]that cell[/zone:c6r4], so playing [zone:col6]column 6[/zone:col6] would have finished the game at once. By choosing [zone:col5]column 5[/zone:col5] instead, you let that win go by; even though your move also added pressure there, the better move was simply to take the line you already had.

---

### eval-37 — drawing_move (sev 0)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 8  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |Gn |   |   |   |
  4  |   |   |   |Gy |   |   |   |
  3  |   |   |   |Gn |   |   |   |
  2  |   |   |   |Gy |   |   |   |
  1  |Gy |   |Gn |Gn |   |Gy |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      | Gn 5 |      |      |      |
  4  |      |      |      | Gy 4 |      |      |      |
  3  |      |      | (gy) | Gn 3 |      |      |      |
  2  |      | (gy) |      | Gy 2 |      |      |      |
  1  | Gy 6 | (gn) | Gn 7 | Gn 1 | (gn) | Gy 8 |      |

  ht |   1  |   0  |   1  |   5  |   0  |   1  |   0  |  (discs in column)
 par |  5O  |  6E  |  5O  |  1O  |  6E  |  5O  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 9  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |Gn |   |   |   |
  4  |   |   |   |Gy |   |   |   |
  3  |   |   |   |Gn |   |   |   |
  2  |   |   |   |Gy |   |Gn |   |
  1  |Gy |   |Gn |Gn |   |Gy |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      | Gn 5 |      |      |      |
  4  |      |      |      | Gy 4 |      |      |      |
  3  |      |      | (gy) | Gn 3 |      |      |      |
  2  |      | (gy) |      | Gy 2 |      | Gn 9 |      |
  1  | Gy 6 | (gn) | Gn 7 | Gn 1 | (gn) | Gy 8 |      |

  ht |   1  |   0  |   1  |   5  |   0  |   2  |   0  |  (discs in column)
 par |  5O  |  6E  |  5O  |  1O  |  6E  |  4E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 9  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |Gn |   |   |   |
  4  |   |   |   |Gy |   |   |   |
  3  |   |   |   |Gn |   |   |   |
  2  |   |   |   |Gy |   |   |   |
  1  |Gy |   |Gn |Gn |   |Gy |Gn |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      | Gn 5 |      |      |      |
  4  |      |      |      | Gy 4 |      |      |      |
  3  |      |      | (gy) | Gn 3 |      |      |      |
  2  |      | (gy) |      | Gy 2 |      |      |      |
  1  | Gy 6 | (gn) | Gn 7 | Gn 1 | (gn) | Gy 8 | Gn 9 |

  ht |   1  |   0  |   1  |   5  |   0  |   1  |   1  |  (discs in column)
 par |  5O  |  6E  |  5O  |  1O  |  6E  |  5O  |  5O  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: moderate
- Move played: column 7
- Your move placed a disc on c7r1.
- Better move: column 6
- The better move places a disc on c6r2.
- Key insight: You had a move that would have held at least a draw, and this move gave that balance up.

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
The move you played results in a draw, but a stronger move was available — explain what that better move would have secured. Do NOT claim the position AFTER your move is winning for you or for your opponent; describe only what the better move would have held or built. (A better move may itself have been stronger than a draw — do not deny that a better option existed.)
Column numbers (1–7) are always valid to reference — they appear in every board header.
Only omit specific CELL references (e.g. c4r3) if the cell is not listed in the boards above.

## Tone
This move gave away a real advantage; explain the concrete consequence.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Do not invent tactical concept names — describe only what you can see changing between the two boards. Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

Playing [zone:col7]column 7[/zone:col7] handed back the balance because it only took [zone:c7r1]that cell[/zone:c7r1], while [zone:col6]column 6[/zone:col6] would have let you use [zone:c6r2]that cell[/zone:c6r2] to keep your position tied down more securely. Even though the boards show no major threats, the better move would have held the draw you had in hand and kept your opponent from getting the easier counterplay that opened up after your move.

---

### eval-38 — overcut (sev 2)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on EVEN rows (2,4,6).
Your opponent wins on ODD rows (1,3,5).

## Boards
### Before the move
Move 19  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |Gy |   |   |Gn |
  4  |   |   |Gy |Gy |   |   |Gy |
  3  |   |   |Gn |Gn |   |   |Gy |
  2  |   |Gn |Gn |Gy |Gn |   |Gy |
  1  |   |Gn |Gy |Gn |Gy |Gn |Gn |

        1      2      3      4      5      6      7   
  6  |      |      |      |      | (gy) |      |      |
  5  |      |      |      | Gy 8 |      | (gn) | Gn19 |
  4  | (*)  | (*)  | Gy12 | Gy 6 | [Gn] | (gy) | Gy18 |
  3  | (gn) | (*)  | Gn11 | Gn 5 | (*)  | (*)  | Gy16 |
  2  | (gy) | Gn17 | Gn 9 | Gy 4 | Gn15 |      | Gy14 |
  1  |      | Gn13 | Gy 2 | Gn 1 | Gy10 | Gn 3 | Gn 7 |

  ht |   0  |   2  |   4  |   5  |   2  |   1  |   5  |  (discs in column)
 par |  6E  |  4E  |  2E  |  1O  |  4E  |  5O  |  1O  |  (empty cells: O=odd E=even)
  Major threats: col5 row4 (Gn)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 20  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |Gy |   |   |Gn |
  4  |   |   |Gy |Gy |   |   |Gy |
  3  |   |Gy |Gn |Gn |   |   |Gy |
  2  |   |Gn |Gn |Gy |Gn |   |Gy |
  1  |   |Gn |Gy |Gn |Gy |Gn |Gn |

        1      2      3      4      5      6      7   
  6  |      |      |      |      | [Gy] |      |      |
  5  |      |      |      | Gy 8 |      | (gn) | Gn19 |
  4  | (gy) | (gy) | Gy12 | Gy 6 | [Gn] | (gy) | Gy18 |
  3  |      | Gy20 | Gn11 | Gn 5 | (*)  | (*)  | Gy16 |
  2  | [Gy] | Gn17 | Gn 9 | Gy 4 | Gn15 |      | Gy14 |
  1  |      | Gn13 | Gy 2 | Gn 1 | Gy10 | Gn 3 | Gn 7 |

  ht |   0  |   3  |   4  |   5  |   2  |   1  |   5  |  (discs in column)
 par |  6E  |  3O  |  2E  |  1O  |  4E  |  5O  |  1O  |  (empty cells: O=odd E=even)
  Major threats: col1 row2 (Gy)   col5 row4 (Gn)   col5 row6 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 20  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |Gy |   |   |   |
  5  |   |   |   |Gy |   |   |Gn |
  4  |   |   |Gy |Gy |   |   |Gy |
  3  |   |   |Gn |Gn |   |   |Gy |
  2  |   |Gn |Gn |Gy |Gn |   |Gy |
  1  |   |Gn |Gy |Gn |Gy |Gn |Gn |

        1      2      3      4      5      6      7   
  6  |      |      |      | Gy20 | (gy) |      |      |
  5  |      |      |      | Gy 8 | (gy) | (gn) | Gn19 |
  4  | (*)  | (*)  | Gy12 | Gy 6 | [Gn] | (gy) | Gy18 |
  3  | (gn) | (*)  | Gn11 | Gn 5 | (*)  | (*)  | Gy16 |
  2  | (gy) | Gn17 | Gn 9 | Gy 4 | Gn15 |      | Gy14 |
  1  |      | Gn13 | Gy 2 | Gn 1 | Gy10 | Gn 3 | Gn 7 |

  ht |   0  |   2  |   4  |   6  |   2  |   1  |   5  |  (discs in column)
 par |  6E  |  4E  |  2E  |  0E  |  4E  |  5O  |  1O  |  (empty cells: O=odd E=even)
  Major threats: col5 row4 (Gn)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gy = your discs, Gn = your opponent's discs.

## Move context
- Your winning rows: EVEN (2,4,6)
- Eval gap: moderate
- Move played: column 4
- Your move placed a disc on c4r6.
- Better move: column 2
- The better move places a disc on c2r3.
- Key insight: You had an overcut — a column where your lower disc neutralizes their upper threat — and didn't play it.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing an actual count, copy the zone tag shown on that line and wrap the count with it; when a line shows "none", just say so in plain words (e.g. "no minor threats") with no tag. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your major threats: none
- Your minor threats: [zone:player-minor-pre]9[/zone:player-minor-pre]
- Opponent minor threats: [zone:opponent-minor-pre]6[/zone:opponent-minor-pre]

After the best move (column 2):
- Your major threats: [zone:player-major-best]2[/zone:player-major-best]
- Your minor threats: [zone:player-minor-best]6[/zone:player-minor-best]
- Opponent minor threats: [zone:opponent-minor-best]2[/zone:opponent-minor-best]

After the move played (column 4):
- Your major threats: none
- Your minor threats: [zone:player-minor-played]10[/zone:player-minor-played]
- Opponent minor threats: [zone:opponent-minor-played]6[/zone:opponent-minor-played]

## Best-move tactical evidence
The following tactical patterns were present after the best move:
- overcut: cells [c5r4, c5r6]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col4]column 4[/zone:col4], [zone:col2]column 2[/zone:col2]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR threat cells: [c5r4, c5r6]

## Tone
This move gave away a real advantage; explain the concrete consequence.

## KB term definitions

The following tactical concepts apply to this position:

- [term:overcut] **overcut** (overcut): When a player's major threat at a higher row wins despite the opponent having a
lower threat in the same column, because the lower threat lacks the parity needed
to neutralize the upper one.
- [term:major_threat] **major threat** (major_threat): A major threat is a four-cell window containing three of your discs and one empty cell.
If that empty cell is the next playable cell in its column (gravity-top), it wins the
game immediately; otherwise it is a latent threat that will become decisive as the
board fills.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

You missed the [term:overcut]overcut[/term:overcut] in [zone:col5]column 5[/zone:col5]: by playing [zone:col4]column 4[/zone:col4], you left your opponent’s higher threat intact instead of using your lower disc to neutralize it. The better move in [zone:col2]column 2[/zone:col2] would have given you [zone:windows:c1r2|c5r6]2[/zone:windows:c1r2|c5r6] major threats while cutting your opponent’s minor threats to [zone:windows:c5r3|c6r3]2[/zone:windows:c5r3|c6r3], whereas your move left you with no major threats and only [zone:windows:c1r2|c1r4|c2r3|c2r4|c5r3|c5r4|c5r5|c5r6|c6r3|c6r4]10[/zone:windows:c1r2|c1r4|c2r3|c2r4|c5r3|c5r4|c5r5|c5r6|c6r3|c6r4] minor threats.

---

### eval-39 — j_shape (sev 0)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 14  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |Gn |   |   |   |
  4  |   |Gn |   |Gy |   |   |   |
  3  |   |Gy |   |Gn |   |   |   |
  2  |   |Gn |Gy |Gy |Gn |   |   |
  1  |   |Gy |Gy |Gn |Gn |   |Gy |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      | (gn) |      | Gn 5 |      |      |      |
  4  |      | Gn11 | (*)  | Gy 4 | (gn) | (gy) | (gn) |
  3  |      | Gy 8 | (gy) | Gn 3 | (*)  | (gn) |      |
  2  |      | Gn 7 | Gy14 | Gy 2 | Gn13 | (gy) |      |
  1  |      | Gy 6 | Gy12 | Gn 1 | Gn 9 | (gn) | Gy10 |

  ht |   0  |   4  |   2  |   5  |   2  |   0  |   1  |  (discs in column)
 par |  6E  |  2E  |  4E  |  1O  |  4E  |  6E  |  5O  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 15  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |Gn |   |   |   |
  4  |   |Gn |   |Gy |   |   |   |
  3  |   |Gy |   |Gn |Gn |   |   |
  2  |   |Gn |Gy |Gy |Gn |   |   |
  1  |   |Gy |Gy |Gn |Gn |   |Gy |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      | (gn) |      | Gn 5 | (gn) |      |      |
  4  |      | Gn11 | (*)  | Gy 4 | <Gn> |      | (gn) |
  3  |      | Gy 8 | (*)  | Gn 3 | Gn15 | (gn) | (gn) |
  2  |      | Gn 7 | Gy14 | Gy 2 | Gn13 |      |      |
  1  |      | Gy 6 | Gy12 | Gn 1 | Gn 9 | (gn) | Gy10 |

  ht |   0  |   4  |   2  |   5  |   3  |   0  |   1  |  (discs in column)
 par |  6E  |  2E  |  4E  |  1O  |  3O  |  6E  |  5O  |  (empty cells: O=odd E=even)
  Major threats: col5 row4 (Gn) [GT]

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 15  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |Gn |   |   |   |
  5  |   |   |   |Gn |   |   |   |
  4  |   |Gn |   |Gy |   |   |   |
  3  |   |Gy |   |Gn |   |   |   |
  2  |   |Gn |Gy |Gy |Gn |   |   |
  1  |   |Gy |Gy |Gn |Gn |   |Gy |

        1      2      3      4      5      6      7   
  6  |      |      |      | Gn15 |      |      |      |
  5  |      | (gn) | (gn) | Gn 5 |      |      |      |
  4  |      | Gn11 | (*)  | Gy 4 | (gn) | (gy) | (gn) |
  3  | (gn) | Gy 8 | (gy) | Gn 3 | (*)  | (gn) |      |
  2  |      | Gn 7 | Gy14 | Gy 2 | Gn13 | (gy) |      |
  1  |      | Gy 6 | Gy12 | Gn 1 | Gn 9 | (gn) | Gy10 |

  ht |   0  |   4  |   2  |   6  |   2  |   0  |   1  |  (discs in column)
 par |  6E  |  2E  |  4E  |  0E  |  4E  |  6E  |  5O  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: small
- Move played: column 4
- Your move placed a disc on c4r6.
- Better move: column 5
- The better move places a disc on c5r3.
- Key insight: You had a J-shape trap available and didn't use it.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing an actual count, copy the zone tag shown on that line and wrap the count with it; when a line shows "none", just say so in plain words (e.g. "no minor threats") with no tag. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your minor threats: [zone:player-minor-pre]7[/zone:player-minor-pre]
- Opponent minor threats: [zone:opponent-minor-pre]5[/zone:opponent-minor-pre]

After the best move (column 5):
- Your minor threats: [zone:player-minor-best]7[/zone:player-minor-best]
- Opponent minor threats: [zone:opponent-minor-best]2[/zone:opponent-minor-best]

After the move played (column 4):
- Your minor threats: [zone:player-minor-played]9[/zone:player-minor-played]
- Opponent minor threats: [zone:opponent-minor-played]5[/zone:opponent-minor-played]

## Best-move tactical evidence
The following tactical patterns were present after the best move:
- immediate_threat: cells [c5r4]
- j_shape: cells [c4r1, c5r2, c4r3, c5r3]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col4]column 4[/zone:col4], [zone:col5]column 5[/zone:col5]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR threat cells: [c5r4, c4r1, c5r2, c4r3, c5r3]

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

## KB term definitions

The following tactical concepts apply to this position:

- [term:immediate_threat] **immediate threat** (immediate_threat): An immediate threat is a major threat whose empty cell is directly playable right now —
it is the topmost empty cell in its column (gravity-top). Playing there wins the game
on this move.
- [term:j_shape] **j shape** (j_shape): A four-disc L-shaped Red cluster generating three simultaneous minor threats that
is equivalent to a major odd-row threat; the opponent cannot block all three paths.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

You missed a [term:j_shape]j shape[/term:j_shape] by playing [zone:col4]column 4[/zone:col4] instead of [zone:col5]column 5[/zone:col5]. The better move would have put your disc on [zone:c5r3]that cell[/zone:c5r3] and kept the J-shaped cluster alive with [zone:windows:c2r5|c3r4|c5r3|c5r4|c6r1|c6r3|c7r4]7[/zone:windows:c2r5|c3r4|c5r3|c5r4|c6r1|c6r3|c7r4] minor threats while cutting your opponent’s minor threats from [zone:windows:c3r3|c3r4|c5r3|c6r2|c6r4]5[/zone:windows:c3r3|c3r4|c5r3|c6r2|c6r4] to [zone:windows:c3r3|c3r4]2[/zone:windows:c3r3|c3r4]; your move left you with [zone:windows:c1r3|c2r5|c3r4|c3r5|c5r3|c5r4|c6r1|c6r3|c7r4]9[/zone:windows:c1r3|c2r5|c3r4|c3r5|c5r3|c5r4|c6r1|c6r3|c7r4] but gave your opponent [zone:windows:c3r3|c3r4|c5r3|c6r2|c6r4]5[/zone:windows:c3r3|c3r4|c5r3|c6r2|c6r4].

---

### eval-40 — drawing_move (sev 0)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on EVEN rows (2,4,6).
Your opponent wins on ODD rows (1,3,5).

## Boards
### Before the move
Move 3  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |   |   |   |   |
  1  |   |Gn |Gn |   |Gy |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      |      |      |      |      |
  1  | (gn) | Gn 3 | Gn 1 | (gn) | Gy 2 |      |      |

  ht |   0  |   1  |   1  |   0  |   1  |   0  |   0  |  (discs in column)
 par |  6E  |  5O  |  5O  |  6E  |  5O  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 4  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |Gy |   |   |   |   |   |
  1  |   |Gn |Gn |   |Gy |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      | Gy 4 |      |      |      |      |      |
  1  | (gn) | Gn 3 | Gn 1 | (gn) | Gy 2 |      |      |

  ht |   0  |   2  |   1  |   0  |   1  |   0  |   0  |  (discs in column)
 par |  6E  |  4E  |  5O  |  6E  |  5O  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 4  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |Gy |   |   |   |   |
  1  |   |Gn |Gn |   |Gy |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      | Gy 4 |      |      |      |      |
  1  | (gn) | Gn 3 | Gn 1 | (gn) | Gy 2 |      |      |

  ht |   0  |   1  |   2  |   0  |   1  |   0  |   0  |  (discs in column)
 par |  6E  |  5O  |  4E  |  6E  |  5O  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gy = your discs, Gn = your opponent's discs.

## Move context
- Your winning rows: EVEN (2,4,6)
- Eval gap: moderate
- Move played: column 3
- Your move placed a disc on c3r2.
- Better move: column 2
- The better move places a disc on c2r2.
- Key insight: You had a move that would have held at least a draw, and this move gave that balance up.

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
The move you played results in a draw, but a stronger move was available — explain what that better move would have secured. Do NOT claim the position AFTER your move is winning for you or for your opponent; describe only what the better move would have held or built. (A better move may itself have been stronger than a draw — do not deny that a better option existed.)
Column numbers (1–7) are always valid to reference — they appear in every board header.
Only omit specific CELL references (e.g. c4r3) if the cell is not listed in the boards above.

## Tone
This move gave away a real advantage; explain the concrete consequence.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Do not invent tactical concept names — describe only what you can see changing between the two boards. Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

You played [zone:col3]column 3[/zone:col3], which filled [zone:c3r2]that cell[/zone:c3r2] and gave up the steadier balance you had. The better move was [zone:col2]column 2[/zone:col2], where you could have taken [zone:c2r2]that cell[/zone:c2r2] and held at least a draw instead of letting your opponent keep the safer path on the board.

---

### eval-41 — suboptimal_move (sev 0)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 4  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |   |   |   |   |
  1  |   |   |Gy |   |Gn |Gy |Gn |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      |      |      |      |      |
  1  |      |      | Gy 2 |      | Gn 1 | Gy 4 | Gn 3 |

  ht |   0  |   0  |   1  |   0  |   1  |   1  |   1  |  (discs in column)
 par |  6E  |  6E  |  5O  |  6E  |  5O  |  5O  |  5O  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 5  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |Gn |   |   |   |   |
  1  |   |   |Gy |   |Gn |Gy |Gn |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      | Gn 5 |      |      |      |      |
  1  |      |      | Gy 2 |      | Gn 1 | Gy 4 | Gn 3 |

  ht |   0  |   0  |   2  |   0  |   1  |   1  |   1  |  (discs in column)
 par |  6E  |  6E  |  4E  |  6E  |  5O  |  5O  |  5O  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 5  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |   |   |   |   |
  1  |   |   |Gy |Gn |Gn |Gy |Gn |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      |      |      |      |      |      |      |
  1  |      |      | Gy 2 | Gn 5 | Gn 1 | Gy 4 | Gn 3 |

  ht |   0  |   0  |   1  |   1  |   1  |   1  |   1  |  (discs in column)
 par |  6E  |  6E  |  5O  |  5O  |  5O  |  5O  |  5O  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: small
- Move played: column 4
- Your move placed a disc on c4r1.
- Better move: column 3
- The better move places a disc on c3r2.
- Key insight: There was a stronger move — this one gives ground.

## What the better move leads to

Your move loses to best play: if your opponent responds perfectly, they punish it by building toward a J-shape threat. This is a future possibility, NOT a fact on the board yet — these cells are empty now. Point the player at how the opponent would punish by USING the zone tag(s) below (they mark the exact square(s) where the opponent's threat would form); describe it as something the opponent could do next, never as already present:
- [zone:opp-future-j_shape-1]the square that completes the J-shape[/zone:opp-future-j_shape-1]

This does not guarantee you a win, but if your opponent slips, the better move lets you punish by building toward an overcut threat — again a future possibility, not a fact on the board yet. Point at it by USING the zone tag(s) below:
- [zone:future-overcut-1]the square that lands the overcut[/zone:future-overcut-1]
- [zone:future-overcut-2]another square that gets there[/zone:future-overcut-2]
- [zone:future-overcut-3]another square that gets there[/zone:future-overcut-3]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col4]column 4[/zone:col4], [zone:col3]column 3[/zone:col3]

Specific present-board cells are not pre-listed here. To point at the future follow-up, use the zone tag(s) provided in the "What the better move leads to" section above — they mark the exact square(s) where it would form.

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

[zone:col4]column 4[/zone:col4] gave ground because it let your opponent steer the game toward a J-shape threat later, while [zone:col3]column 3[/zone:col3] would have been the stronger choice. That better move would have put your disc on [zone:c3r2]that cell[/zone:c3r2], keeping more pressure in the middle and making it harder for your opponent to set up the follow-up around [zone:cells:c4r2,c3r3,c4r4,c3r4]the square that completes the J-shape[/zone:cells:c4r2,c3r3,c4r4,c3r4].

---

### eval-42 — forced_win (sev 3)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 12  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |Gn |Gn |   |Gy |Gn |   |
  2  |   |Gn |Gy |   |Gy |Gy |   |
  1  |   |Gy |Gn |   |Gn |Gy |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      | (gn) | (gy) |      | (*)  |      |      |
  4  |      | (gn) | (gy) | (*)  | (gy) |      |      |
  3  | (gn) | Gn11 | Gn 5 | (*)  | Gy12 | Gn 9 |      |
  2  |      | Gn 7 | Gy 4 | [Gy] | Gy10 | Gy 8 | (gy) |
  1  | (gn) | Gy 2 | Gn 3 |      | Gn 1 | Gy 6 | (gy) |

  ht |   0  |   3  |   3  |   0  |   3  |   3  |   0  |  (discs in column)
 par |  6E  |  3O  |  3O  |  6E  |  3O  |  3O  |  6E  |  (empty cells: O=odd E=even)
  Major threats: col4 row2 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 13  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |Gn |   |   |
  3  |   |Gn |Gn |   |Gy |Gn |   |
  2  |   |Gn |Gy |   |Gy |Gy |   |
  1  |   |Gy |Gn |   |Gn |Gy |   |

        1      2      3      4      5      6      7   
  6  |      |      | (gn) |      |      |      |      |
  5  |      | (gn) | (gy) | (gn) | (gn) |      |      |
  4  |      | (gn) | (gy) | (*)  | Gn13 |      |      |
  3  | (gn) | Gn11 | Gn 5 | (*)  | Gy12 | Gn 9 |      |
  2  |      | Gn 7 | Gy 4 | [Gy] | Gy10 | Gy 8 | (*)  |
  1  | (gn) | Gy 2 | Gn 3 |      | Gn 1 | Gy 6 | (gy) |

  ht |   0  |   3  |   3  |   0  |   4  |   3  |   0  |  (discs in column)
 par |  6E  |  3O  |  3O  |  6E  |  2E  |  3O  |  6E  |  (empty cells: O=odd E=even)
  Major threats: col4 row2 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 13  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |Gn |   |   |   |   |
  3  |   |Gn |Gn |   |Gy |Gn |   |
  2  |   |Gn |Gy |   |Gy |Gy |   |
  1  |   |Gy |Gn |   |Gn |Gy |   |

        1      2      3      4      5      6      7   
  6  |      |      | (gn) |      | (gn) |      |      |
  5  |      | (gn) | (*)  | (gn) | (*)  |      |      |
  4  |      | (gn) | Gn13 | (*)  | (gy) |      |      |
  3  | (gn) | Gn11 | Gn 5 | (*)  | Gy12 | Gn 9 |      |
  2  | (gn) | Gn 7 | Gy 4 | [Gy] | Gy10 | Gy 8 | (gy) |
  1  | (gn) | Gy 2 | Gn 3 |      | Gn 1 | Gy 6 | (gy) |

  ht |   0  |   3  |   4  |   0  |   3  |   3  |   0  |  (discs in column)
 par |  6E  |  3O  |  2E  |  6E  |  3O  |  3O  |  6E  |  (empty cells: O=odd E=even)
  Major threats: col4 row2 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: large
- Move played: column 3
- Your move placed a disc on c3r4.
- Better move: column 5
- The better move places a disc on c5r4.
- Key insight: Your move handed your opponent a forced win.
- Pattern mechanism: Your move gave your opponent a forced win — a sequence of forcing moves that guarantees their win regardless of your defense. Column 5 would have kept this sequence unavailable.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing an actual count, copy the zone tag shown on that line and wrap the count with it; when a line shows "none", just say so in plain words (e.g. "no minor threats") with no tag. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your minor threats: [zone:player-minor-pre]8[/zone:player-minor-pre]
- Opponent minor threats: [zone:opponent-minor-pre]7[/zone:opponent-minor-pre]

After the best move (column 5):
- Your minor threats: [zone:player-minor-best]11[/zone:player-minor-best]
- Opponent minor threats: [zone:opponent-minor-best]5[/zone:opponent-minor-best]

After the move played (column 3):
- Your minor threats: [zone:player-minor-played]13[/zone:player-minor-played]
- Opponent minor threats: [zone:opponent-minor-played]6[/zone:opponent-minor-played]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col3]column 3[/zone:col3], [zone:col5]column 5[/zone:col5]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR OPPONENT's threat cells: [c5r5]

## Tone
This was a significant mistake; explain clearly what was lost.

## KB term definitions

The following tactical concepts apply to this position:

- [term:forced_win] **forced win** (forced_win): A forced win is a guaranteed multi-step winning sequence. The player has one
immediate threat the opponent must block, and after that block the player has a
continuation — direct win or fork — that wins no matter what the opponent does.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

By playing in [zone:col3]column 3[/zone:col3], you gave your opponent a [term:forced_win]forced win[/term:forced_win] around [zone:c5r5]that cell[/zone:c5r5], so you handed over the key tactical sequence instead of stopping it. The better move was [zone:col5]column 5[/zone:col5]: it would have kept that sequence unavailable and left you better placed, with your minor threats at [zone:windows:c1r1|c1r3|c2r4|c2r5|c3r6|c4r2|c4r3|c4r4|c4r5|c5r5|c7r2]11[/zone:windows:c1r1|c1r3|c2r4|c2r5|c3r6|c4r2|c4r3|c4r4|c4r5|c5r5|c7r2] instead of the weaker [zone:windows:c1r1|c1r2|c1r3|c2r4|c2r5|c3r5|c3r6|c4r2|c4r3|c4r4|c4r5|c5r5|c5r6]13[/zone:windows:c1r1|c1r2|c1r3|c2r4|c2r5|c3r5|c3r6|c4r2|c4r3|c4r4|c4r5|c5r5|c5r6], while also holding your opponent to [zone:windows:c3r4|c3r5|c4r3|c4r4|c7r1]5[/zone:windows:c3r4|c3r5|c4r3|c4r4|c7r1] rather than [zone:windows:c3r5|c4r3|c4r4|c5r4|c5r5|c7r1]6[/zone:windows:c3r5|c4r3|c4r4|c5r4|c5r5|c7r1].

---

### eval-43 — forced_win (sev 3)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on EVEN rows (2,4,6).
Your opponent wins on ODD rows (1,3,5).

## Boards
### Before the move
Move 13  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |Gn |   |   |   |   |
  3  |   |Gn |Gn |   |Gy |Gn |   |
  2  |   |Gn |Gy |   |Gy |Gy |   |
  1  |   |Gy |Gn |   |Gn |Gy |   |

        1      2      3      4      5      6      7   
  6  |      |      | (gn) |      | (gn) |      |      |
  5  |      | (gn) | (*)  | (gn) | (*)  |      |      |
  4  |      | (gn) | Gn13 | (*)  | (gy) |      |      |
  3  | (gn) | Gn11 | Gn 5 | (*)  | Gy12 | Gn 9 |      |
  2  | (gn) | Gn 7 | Gy 4 | [Gy] | Gy10 | Gy 8 | (gy) |
  1  | (gn) | Gy 2 | Gn 3 |      | Gn 1 | Gy 6 | (gy) |

  ht |   0  |   3  |   4  |   0  |   3  |   3  |   0  |  (discs in column)
 par |  6E  |  3O  |  2E  |  6E  |  3O  |  3O  |  6E  |  (empty cells: O=odd E=even)
  Major threats: col4 row2 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 14  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |Gn |   |Gy |   |   |
  3  |   |Gn |Gn |   |Gy |Gn |   |
  2  |   |Gn |Gy |   |Gy |Gy |   |
  1  |   |Gy |Gn |   |Gn |Gy |   |

        1      2      3      4      5      6      7   
  6  |      |      | (gn) |      | (*)  |      |      |
  5  |      | (gn) | (*)  | (gn) | <Gy> | (gy) |      |
  4  |      | (gn) | Gn13 | (*)  | Gy14 |      |      |
  3  | (gn) | Gn11 | Gn 5 | [Gy] | Gy12 | Gn 9 |      |
  2  | (gn) | Gn 7 | Gy 4 | [Gy] | Gy10 | Gy 8 | (gy) |
  1  | (gn) | Gy 2 | Gn 3 |      | Gn 1 | Gy 6 | (gy) |

  ht |   0  |   3  |   4  |   0  |   4  |   3  |   0  |  (discs in column)
 par |  6E  |  3O  |  2E  |  6E  |  2E  |  3O  |  6E  |  (empty cells: O=odd E=even)
  Major threats: col4 row2 (Gy)   col4 row3 (Gy)   col5 row5 (Gy) [GT]

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 14  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |Gn |   |   |   |   |
  3  |   |Gn |Gn |   |Gy |Gn |   |
  2  |   |Gn |Gy |   |Gy |Gy |   |
  1  |   |Gy |Gn |   |Gn |Gy |Gy |

        1      2      3      4      5      6      7   
  6  |      |      | (gn) |      | (gn) |      |      |
  5  |      | (gn) | (*)  | (gn) | (*)  |      |      |
  4  |      | (gn) | Gn13 | [Gy] | (gy) |      |      |
  3  | (gn) | Gn11 | Gn 5 | (*)  | Gy12 | Gn 9 |      |
  2  | (gn) | Gn 7 | Gy 4 | [Gy] | Gy10 | Gy 8 | (gy) |
  1  | (gn) | Gy 2 | Gn 3 |      | Gn 1 | Gy 6 | Gy14 |

  ht |   0  |   3  |   4  |   0  |   3  |   3  |   1  |  (discs in column)
 par |  6E  |  3O  |  2E  |  6E  |  3O  |  3O  |  5O  |  (empty cells: O=odd E=even)
  Major threats: col4 row2 (Gy)   col4 row4 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gy = your discs, Gn = your opponent's discs.

## Move context
- Your winning rows: EVEN (2,4,6)
- Eval gap: large
- Move played: column 7
- Your move placed a disc on c7r1.
- Better move: column 5
- The better move places a disc on c5r4.
- Key insight: You had a forced win and let it slip.
- Pattern mechanism: Column 5 would have started a forced win — a sequence of moves that guarantees a win regardless of your opponent's defense.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing an actual count, copy the zone tag shown on that line and wrap the count with it; when a line shows "none", just say so in plain words (e.g. "no minor threats") with no tag. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your major threats: [zone:player-major-pre]1[/zone:player-major-pre]
- Your minor threats: [zone:player-minor-pre]6[/zone:player-minor-pre]

After the best move (column 5):
- Your major threats: [zone:player-major-best]2[/zone:player-major-best]
- Your minor threats: [zone:player-minor-best]3[/zone:player-minor-best]

After the move played (column 7):
- Your major threats: [zone:player-major-played]2[/zone:player-major-played]
- Your minor threats: [zone:player-minor-played]3[/zone:player-minor-played]

## Best-move tactical evidence
The following tactical patterns were present after the best move:
- immediate_threat: cells [c5r5]
- forced_win (position-level pattern)

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col7]column 7[/zone:col7], [zone:col5]column 5[/zone:col5]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR threat cells: [c5r5]

## Tone
This was a significant mistake; explain clearly what was lost.

## KB term definitions

The following tactical concepts apply to this position:

- [term:immediate_threat] **immediate threat** (immediate_threat): An immediate threat is a major threat whose empty cell is directly playable right now —
it is the topmost empty cell in its column (gravity-top). Playing there wins the game
on this move.
- [term:forced_win] **forced win** (forced_win): A forced win is a guaranteed multi-step winning sequence. The player has one
immediate threat the opponent must block, and after that block the player has a
continuation — direct win or fork — that wins no matter what the opponent does.
- [term:major_threat] **major threat** (major_threat): A major threat is a four-cell window containing three of your discs and one empty cell.
If that empty cell is the next playable cell in its column (gravity-top), it wins the
game immediately; otherwise it is a latent threat that will become decisive as the
board fills.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

You had a [term:forced_win]forced win[/term:forced_win] available, and playing [zone:col7]column 7[/zone:col7] threw it away. The better move in [zone:col5]column 5[/zone:col5] would have created your [term:immediate_threat]immediate threat[/term:immediate_threat] at [zone:c5r5]that cell[/zone:c5r5] and kept your winning sequence alive; instead, your move left you with only [zone:windows:c4r2|c4r4]2[/zone:windows:c4r2|c4r4] major threats and [zone:windows:c4r3|c5r4|c5r5]3[/zone:windows:c4r3|c5r4|c5r5] minor threats, the same as after the better move, but without the decisive continuation.

---

### eval-44 — suboptimal_move (sev 0)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on EVEN rows (2,4,6).
Your opponent wins on ODD rows (1,3,5).

## Boards
### Before the move
Move 11  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |Gn |   |Gn |   |
  4  |   |   |   |Gy |   |Gn |   |
  3  |   |   |   |Gn |   |Gy |   |
  2  |   |   |   |Gy |   |Gn |   |
  1  |Gy |   |   |Gn |   |Gy |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      | (gn) |
  5  |      |      | (gn) | Gn 5 | (gn) | Gn11 | (gn) |
  4  |      |      |      | Gy 4 | (gn) | Gn 9 |      |
  3  |      |      | (gy) | Gn 3 |      | Gy 8 |      |
  2  |      | (gy) | (gn) | Gy 2 |      | Gn 7 |      |
  1  | Gy10 |      |      | Gn 1 |      | Gy 6 |      |

  ht |   1  |   0  |   0  |   5  |   0  |   5  |   0  |  (discs in column)
 par |  5O  |  6E  |  6E  |  1O  |  6E  |  1O  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 12  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |Gy |   |   |   |
  5  |   |   |   |Gn |   |Gn |   |
  4  |   |   |   |Gy |   |Gn |   |
  3  |   |   |   |Gn |   |Gy |   |
  2  |   |   |   |Gy |   |Gn |   |
  1  |Gy |   |   |Gn |   |Gy |   |

        1      2      3      4      5      6      7   
  6  |      |      |      | Gy12 |      |      | (gn) |
  5  |      |      | (gn) | Gn 5 | (gn) | Gn11 | (gn) |
  4  |      |      |      | Gy 4 | (gn) | Gn 9 |      |
  3  |      |      | (gy) | Gn 3 |      | Gy 8 |      |
  2  |      | (gy) | (gn) | Gy 2 |      | Gn 7 |      |
  1  | Gy10 |      |      | Gn 1 |      | Gy 6 |      |

  ht |   1  |   0  |   0  |   6  |   0  |   5  |   0  |  (discs in column)
 par |  5O  |  6E  |  6E  |  0E  |  6E  |  1O  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 12  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |Gn |   |Gn |   |
  4  |   |   |   |Gy |   |Gn |   |
  3  |   |   |   |Gn |   |Gy |   |
  2  |   |   |   |Gy |   |Gn |   |
  1  |Gy |   |   |Gn |   |Gy |Gy |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      | (gn) |
  5  |      |      | (gn) | Gn 5 | (gn) | Gn11 | (gn) |
  4  |      |      |      | Gy 4 | (gn) | Gn 9 |      |
  3  |      |      | (gy) | Gn 3 |      | Gy 8 |      |
  2  |      | (gy) | (gn) | Gy 2 |      | Gn 7 |      |
  1  | Gy10 |      |      | Gn 1 |      | Gy 6 | Gy12 |

  ht |   1  |   0  |   0  |   5  |   0  |   5  |   1  |  (discs in column)
 par |  5O  |  6E  |  6E  |  1O  |  6E  |  1O  |  5O  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gy = your discs, Gn = your opponent's discs.

## Move context
- Your winning rows: EVEN (2,4,6)
- Eval gap: small
- Move played: column 7
- Your move placed a disc on c7r1.
- Better move: column 4
- The better move places a disc on c4r6.
- Key insight: There was a stronger move — this one gives ground.

## What the better move leads to

This does not guarantee you a win, but if your opponent slips, the better move lets you punish by building toward an overcut threat — again a future possibility, not a fact on the board yet. Point at it by USING the zone tag(s) below:
- [zone:future-overcut-1]the square that lands the overcut[/zone:future-overcut-1]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col7]column 7[/zone:col7], [zone:col4]column 4[/zone:col4]

Specific present-board cells are not pre-listed here. To point at the future follow-up, use the zone tag(s) provided in the "What the better move leads to" section above — they mark the exact square(s) where it would form.

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

Playing [zone:col7]column 7[/zone:col7] was a small slip because it just added a disc on the edge and gave you less control over the middle. The better move was [zone:col4]column 4[/zone:col4], which would have let you build toward the [zone:c4r6]overcut square[/zone:c4r6] and kept a stronger route for your even-row plan.

---

### eval-45 — suboptimal_move (sev 0)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 8  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |Gy |   |   |   |
  3  |   |   |   |Gn |   |Gy |   |
  2  |   |   |   |Gy |   |Gn |   |
  1  |   |   |   |Gn |   |Gn |Gy |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      | (gn) | Gy 4 |      |      |      |
  3  |      |      |      | Gn 3 |      | Gy 8 |      |
  2  |      |      |      | Gy 2 | (gn) | Gn 7 |      |
  1  |      |      | (gn) | Gn 1 | (gn) | Gn 5 | Gy 6 |

  ht |   0  |   0  |   0  |   4  |   0  |   3  |   1  |  (discs in column)
 par |  6E  |  6E  |  6E  |  2E  |  6E  |  3O  |  5O  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 9  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |Gn |   |   |   |
  4  |   |   |   |Gy |   |   |   |
  3  |   |   |   |Gn |   |Gy |   |
  2  |   |   |   |Gy |   |Gn |   |
  1  |   |   |   |Gn |   |Gn |Gy |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      | Gn 9 |      |      |      |
  4  |      |      | (gn) | Gy 4 |      |      |      |
  3  |      |      |      | Gn 3 |      | Gy 8 |      |
  2  |      |      |      | Gy 2 | (gn) | Gn 7 |      |
  1  |      |      | (gn) | Gn 1 | (gn) | Gn 5 | Gy 6 |

  ht |   0  |   0  |   0  |   5  |   0  |   3  |   1  |  (discs in column)
 par |  6E  |  6E  |  6E  |  1O  |  6E  |  3O  |  5O  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 9  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |Gy |   |   |   |
  3  |   |   |   |Gn |   |Gy |   |
  2  |   |   |   |Gy |   |Gn |Gn |
  1  |   |   |   |Gn |   |Gn |Gy |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      | (gn) | Gy 4 |      |      |      |
  3  |      |      |      | Gn 3 |      | Gy 8 |      |
  2  |      |      |      | Gy 2 | (gn) | Gn 7 | Gn 9 |
  1  |      |      | (gn) | Gn 1 | (gn) | Gn 5 | Gy 6 |

  ht |   0  |   0  |   0  |   4  |   0  |   3  |   2  |  (discs in column)
 par |  6E  |  6E  |  6E  |  2E  |  6E  |  3O  |  4E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: small
- Move played: column 7
- Your move placed a disc on c7r2.
- Better move: column 4
- The better move places a disc on c4r5.
- Key insight: There was a stronger move — this one gives ground.

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
Column numbers (1–7) are always valid to reference — they appear in every board header.
Only omit specific CELL references (e.g. c4r3) if the cell is not listed in the boards above.

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Do not invent tactical concept names — describe only what you can see changing between the two boards. Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

By playing [zone:col7]column 7[/zone:col7], you added a disc on [zone:c7r2]that cell[/zone:c7r2] but gave up the stronger chance to use [zone:col4]column 4[/zone:col4] instead. The better move would have put your disc on [zone:c4r5]that cell[/zone:c4r5], building upward in the center and keeping your shape more active on the odd row you need, while your move left that side less useful.

---

### eval-46 — forced_win (sev 2)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 18  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |Gy |   |   |   |
  5  |   |   |   |Gn |Gn |   |   |
  4  |   |   |   |Gn |Gy |   |   |
  3  |   |   |   |Gn |Gy |   |   |
  2  |   |Gy |Gy |Gy |Gn |Gn |   |
  1  |   |Gn |Gy |Gn |Gy |Gn |Gy |

        1      2      3      4      5      6      7   
  6  |      |      |      | Gy10 |      | (gn) |      |
  5  |      | (gn) | (gn) | Gn 9 | Gn11 | (gn) | (*)  |
  4  |      | (gy) | [Gn] | Gn 7 | Gy 8 | [Gy] | (gn) |
  3  |      |      | (*)  | Gn 3 | Gy 6 | (gn) |      |
  2  | [Gy] | Gy18 | Gy14 | Gy 2 | Gn 5 | Gn15 |      |
  1  |      | Gn17 | Gy12 | Gn 1 | Gy 4 | Gn13 | Gy16 |

  ht |   0  |   2  |   2  |   6  |   5  |   2  |   1  |  (discs in column)
 par |  6E  |  4E  |  4E  |  0E  |  1O  |  4E  |  5O  |  (empty cells: O=odd E=even)
  Major threats: col1 row2 (Gy)   col3 row4 (Gn)   col6 row4 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 19  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |Gy |   |   |   |
  5  |   |   |   |Gn |Gn |   |   |
  4  |   |   |   |Gn |Gy |   |   |
  3  |   |   |Gn |Gn |Gy |   |   |
  2  |   |Gy |Gy |Gy |Gn |Gn |   |
  1  |   |Gn |Gy |Gn |Gy |Gn |Gy |

        1      2      3      4      5      6      7   
  6  |      |      |      | Gy10 |      | [Gn] |      |
  5  |      | (gn) | (gn) | Gn 9 | Gn11 | (gn) | (*)  |
  4  |      |      | <Gn> | Gn 7 | Gy 8 | [Gy] | (gn) |
  3  | (gn) | (gn) | Gn19 | Gn 3 | Gy 6 | (gn) |      |
  2  | [Gy] | Gy18 | Gy14 | Gy 2 | Gn 5 | Gn15 |      |
  1  |      | Gn17 | Gy12 | Gn 1 | Gy 4 | Gn13 | Gy16 |

  ht |   0  |   2  |   3  |   6  |   5  |   2  |   1  |  (discs in column)
 par |  6E  |  4E  |  3O  |  0E  |  1O  |  4E  |  5O  |  (empty cells: O=odd E=even)
  Major threats: col1 row2 (Gy)   col3 row4 (Gn) [GT]   col6 row4 (Gy)   col6 row6 (Gn)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 19  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |Gy |   |   |   |
  5  |   |   |   |Gn |Gn |   |   |
  4  |   |   |   |Gn |Gy |   |   |
  3  |   |Gn |   |Gn |Gy |   |   |
  2  |   |Gy |Gy |Gy |Gn |Gn |   |
  1  |   |Gn |Gy |Gn |Gy |Gn |Gy |

        1      2      3      4      5      6      7   
  6  |      |      |      | Gy10 | (gn) | (gn) |      |
  5  |      | (gn) | (gn) | Gn 9 | Gn11 | (gn) | (*)  |
  4  |      | (gy) | [Gn] | Gn 7 | Gy 8 | [Gy] | (gn) |
  3  | (gn) | Gn19 | (*)  | Gn 3 | Gy 6 | (gn) |      |
  2  | [Gy] | Gy18 | Gy14 | Gy 2 | Gn 5 | Gn15 |      |
  1  |      | Gn17 | Gy12 | Gn 1 | Gy 4 | Gn13 | Gy16 |

  ht |   0  |   3  |   2  |   6  |   5  |   2  |   1  |  (discs in column)
 par |  6E  |  3O  |  4E  |  0E  |  1O  |  4E  |  5O  |  (empty cells: O=odd E=even)
  Major threats: col1 row2 (Gy)   col3 row4 (Gn)   col6 row4 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: large
- Move played: column 2
- Your move placed a disc on c2r3.
- Better move: column 3
- The better move places a disc on c3r3.
- Key insight: You had a forced win and let it slip.
- Pattern mechanism: Column 3 would have started a forced win — a sequence of moves that guarantees a win regardless of your opponent's defense.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing an actual count, copy the zone tag shown on that line and wrap the count with it; when a line shows "none", just say so in plain words (e.g. "no minor threats") with no tag. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your minor threats: [zone:player-minor-pre]9[/zone:player-minor-pre]
- Opponent minor threats: [zone:opponent-minor-pre]3[/zone:opponent-minor-pre]

After the best move (column 3):
- Your minor threats: [zone:player-minor-best]9[/zone:player-minor-best]
- Opponent minor threats: none

After the move played (column 2):
- Your minor threats: [zone:player-minor-played]13[/zone:player-minor-played]
- Opponent minor threats: [zone:opponent-minor-played]3[/zone:opponent-minor-played]

## Best-move tactical evidence
The following tactical patterns were present after the best move:
- immediate_threat: cells [c3r4]
- forced_win (position-level pattern)

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col2]column 2[/zone:col2], [zone:col3]column 3[/zone:col3]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR threat cells: [c3r4]

## Tone
This was a significant mistake; explain clearly what was lost.

## KB term definitions

The following tactical concepts apply to this position:

- [term:immediate_threat] **immediate threat** (immediate_threat): An immediate threat is a major threat whose empty cell is directly playable right now —
it is the topmost empty cell in its column (gravity-top). Playing there wins the game
on this move.
- [term:forced_win] **forced win** (forced_win): A forced win is a guaranteed multi-step winning sequence. The player has one
immediate threat the opponent must block, and after that block the player has a
continuation — direct win or fork — that wins no matter what the opponent does.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

You missed a [term:forced_win]forced win[/term:forced_win]: by playing in [zone:col2]column 2[/zone:col2], you gave away the winning continuation that was available from [zone:col3]column 3[/zone:col3]. The better move would have kept the position on your side with [zone:windows:c1r3|c2r3|c2r5|c3r5|c6r3|c6r4|c6r5|c7r4|c7r5]9[/zone:windows:c1r3|c2r3|c2r5|c3r5|c6r3|c6r4|c6r5|c7r4|c7r5] minor threats while leaving your opponent with no minor threats, instead of your move leaving you with [zone:windows:c1r2|c1r3|c2r5|c3r3|c3r4|c3r5|c5r6|c6r3|c6r4|c6r5|c6r6|c7r4|c7r5]13[/zone:windows:c1r2|c1r3|c2r5|c3r3|c3r4|c3r5|c5r6|c6r3|c6r4|c6r5|c6r6|c7r4|c7r5] minor threats and still [zone:windows:c2r4|c3r3|c3r4]3[/zone:windows:c2r4|c3r3|c3r4] for your opponent.

---

### eval-47 — suboptimal_move (sev 0)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on EVEN rows (2,4,6).
Your opponent wins on ODD rows (1,3,5).

## Boards
### Before the move
Move 11  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |Gn |   |   |   |
  4  |   |   |   |Gy |   |   |   |
  3  |Gn |   |   |Gn |   |   |   |
  2  |Gn |   |   |Gy |   |   |   |
  1  |Gy |Gn |Gy |Gn |   |   |Gy |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  | (gn) |      |      | Gn 5 |      |      |      |
  4  | (gn) |      | (gn) | Gy 4 | (gn) | (gy) |      |
  3  | Gn11 | (gn) | (*)  | Gn 3 | (gy) |      |      |
  2  | Gn 7 | (gy) | (gn) | Gy 2 |      | (gy) |      |
  1  | Gy 6 | Gn 9 | Gy10 | Gn 1 |      |      | Gy 8 |

  ht |   3  |   1  |   1  |   5  |   0  |   0  |   1  |  (discs in column)
 par |  3O  |  5O  |  5O  |  1O  |  6E  |  6E  |  5O  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 12  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |Gy |   |   |   |
  5  |   |   |   |Gn |   |   |   |
  4  |   |   |   |Gy |   |   |   |
  3  |Gn |   |   |Gn |   |   |   |
  2  |Gn |   |   |Gy |   |   |   |
  1  |Gy |Gn |Gy |Gn |   |   |Gy |

        1      2      3      4      5      6      7   
  6  |      |      |      | Gy12 |      |      |      |
  5  | (gn) |      |      | Gn 5 |      |      |      |
  4  | (gn) |      | (gn) | Gy 4 | (gn) | (gy) |      |
  3  | Gn11 | (gn) | (*)  | Gn 3 | (gy) |      |      |
  2  | Gn 7 | (gy) | (gn) | Gy 2 |      | (gy) |      |
  1  | Gy 6 | Gn 9 | Gy10 | Gn 1 |      |      | Gy 8 |

  ht |   3  |   1  |   1  |   6  |   0  |   0  |   1  |  (discs in column)
 par |  3O  |  5O  |  5O  |  0E  |  6E  |  6E  |  5O  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 12  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |Gn |   |   |   |
  4  |   |   |   |Gy |   |   |   |
  3  |Gn |   |   |Gn |   |   |   |
  2  |Gn |   |   |Gy |   |   |   |
  1  |Gy |Gn |Gy |Gn |   |Gy |Gy |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  | (gn) |      |      | Gn 5 |      |      |      |
  4  | (gn) |      | (gn) | Gy 4 | (gn) | (gy) |      |
  3  | Gn11 | (gn) | (*)  | Gn 3 | (gy) |      |      |
  2  | Gn 7 | (gy) | (gn) | Gy 2 |      | (gy) |      |
  1  | Gy 6 | Gn 9 | Gy10 | Gn 1 |      | Gy12 | Gy 8 |

  ht |   3  |   1  |   1  |   5  |   0  |   1  |   1  |  (discs in column)
 par |  3O  |  5O  |  5O  |  1O  |  6E  |  5O  |  5O  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gy = your discs, Gn = your opponent's discs.

## Move context
- Your winning rows: EVEN (2,4,6)
- Eval gap: moderate
- Move played: column 6
- Your move placed a disc on c6r1.
- Better move: column 4
- The better move places a disc on c4r6.
- Key insight: There was a stronger move — this one gives ground.

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
Column numbers (1–7) are always valid to reference — they appear in every board header.
Only omit specific CELL references (e.g. c4r3) if the cell is not listed in the boards above.

## Tone
This move gave away a real advantage; explain the concrete consequence.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Do not invent tactical concept names — describe only what you can see changing between the two boards. Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

Playing [zone:col6]column 6[/zone:col6] gave away the stronger shape, because it only filled the bottom of that side while [zone:col4]column 4[/zone:col4] would have let you place on [zone:c4r6]that cell[/zone:c4r6] and keep your best line higher up on the board. After your move, that useful top space in [zone:col4]column 4[/zone:col4] was still there for your opponent to work around, while the better move would have made your position more active on an even row and kept more pressure on the center.

---

### eval-48 — forced_win (sev 0)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 20  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |Gy |Gn |   |   |
  5  |   |   |   |Gy |Gn |   |   |
  4  |   |   |Gy |Gn |Gy |   |   |
  3  |   |   |Gy |Gn |Gn |   |   |
  2  |Gn |   |Gn |Gy |Gy |   |Gy |
  1  |Gy |   |Gn |Gy |Gn |   |Gn |

        1      2      3      4      5      6      7   
  6  |      | (gn) | (gy) | Gy20 | Gn19 |      |      |
  5  | (gy) |      | (*)  | Gy12 | Gn13 |      |      |
  4  |      | (gy) | Gy16 | Gn11 | Gy10 |      | (gy) |
  3  |      |      | Gy 4 | Gn 9 | Gn 7 | [Gy] | (gn) |
  2  | Gn15 |      | Gn 3 | Gy 8 | Gy 6 | [*]  | Gy18 |
  1  | Gy14 |      | Gn 1 | Gy 2 | Gn 5 |      | Gn17 |

  ht |   2  |   0  |   4  |   6  |   6  |   0  |   2  |  (discs in column)
 par |  4E  |  6E  |  2E  |  0E  |  0E  |  6E  |  4E  |  (empty cells: O=odd E=even)
  Major threats: col6 row2 (Gn+Gy)   col6 row3 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 21  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |Gy |Gn |   |   |
  5  |   |   |Gn |Gy |Gn |   |   |
  4  |   |   |Gy |Gn |Gy |   |   |
  3  |   |   |Gy |Gn |Gn |   |   |
  2  |Gn |   |Gn |Gy |Gy |   |Gy |
  1  |Gy |   |Gn |Gy |Gn |   |Gn |

        1      2      3      4      5      6      7   
  6  |      | [Gn] | (gy) | Gy20 | Gn19 |      |      |
  5  | (gy) |      | Gn21 | Gy12 | Gn13 |      |      |
  4  |      | (gy) | Gy16 | Gn11 | Gy10 |      | (gy) |
  3  |      |      | Gy 4 | Gn 9 | Gn 7 | [Gy] | (gn) |
  2  | Gn15 |      | Gn 3 | Gy 8 | Gy 6 | [*]  | Gy18 |
  1  | Gy14 |      | Gn 1 | Gy 2 | Gn 5 |      | Gn17 |

  ht |   2  |   0  |   5  |   6  |   6  |   0  |   2  |  (discs in column)
 par |  4E  |  6E  |  1O  |  0E  |  0E  |  6E  |  4E  |  (empty cells: O=odd E=even)
  Major threats: col2 row6 (Gn)   col6 row2 (Gn+Gy)   col6 row3 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 21  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |Gy |Gn |   |   |
  5  |   |   |   |Gy |Gn |   |   |
  4  |   |   |Gy |Gn |Gy |   |   |
  3  |   |   |Gy |Gn |Gn |   |   |
  2  |Gn |   |Gn |Gy |Gy |   |Gy |
  1  |Gy |Gn |Gn |Gy |Gn |   |Gn |

        1      2      3      4      5      6      7   
  6  |      | (gn) | (gy) | Gy20 | Gn19 |      |      |
  5  | (gy) |      | (*)  | Gy12 | Gn13 |      |      |
  4  |      | (gy) | Gy16 | Gn11 | Gy10 |      | (gy) |
  3  |      |      | Gy 4 | Gn 9 | Gn 7 | [Gy] | (gn) |
  2  | Gn15 |      | Gn 3 | Gy 8 | Gy 6 | [*]  | Gy18 |
  1  | Gy14 | Gn21 | Gn 1 | Gy 2 | Gn 5 |      | Gn17 |

  ht |   2  |   1  |   4  |   6  |   6  |   0  |   2  |  (discs in column)
 par |  4E  |  5O  |  2E  |  0E  |  0E  |  6E  |  4E  |  (empty cells: O=odd E=even)
  Major threats: col6 row2 (Gn+Gy)   col6 row3 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: small
- Move played: column 2
- Your move placed a disc on c2r1.
- Better move: column 3
- The better move places a disc on c3r5.
- Key insight: Your move handed your opponent a forced win.
- Pattern mechanism: Your move gave your opponent a forced win — a sequence of forcing moves that guarantees their win regardless of your defense. Column 3 would have kept this sequence unavailable.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing an actual count, copy the zone tag shown on that line and wrap the count with it; when a line shows "none", just say so in plain words (e.g. "no minor threats") with no tag. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your major threats: [zone:player-major-pre]1[/zone:player-major-pre]
- Opponent minor threats: [zone:opponent-minor-pre]6[/zone:opponent-minor-pre]

After the best move (column 3):
- Your major threats: [zone:player-major-best]2[/zone:player-major-best]
- Opponent minor threats: [zone:opponent-minor-best]4[/zone:opponent-minor-best]

After the move played (column 2):
- Your major threats: [zone:player-major-played]1[/zone:player-major-played]
- Opponent minor threats: [zone:opponent-minor-played]6[/zone:opponent-minor-played]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col2]column 2[/zone:col2], [zone:col3]column 3[/zone:col3]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR OPPONENT's threat cells: [c3r6, c6r2, c6r3]

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

## KB term definitions

The following tactical concepts apply to this position:

- [term:forced_win] **forced win** (forced_win): A forced win is a guaranteed multi-step winning sequence. The player has one
immediate threat the opponent must block, and after that block the player has a
continuation — direct win or fork — that wins no matter what the opponent does.
- [term:major_threat] **major threat** (major_threat): A major threat is a four-cell window containing three of your discs and one empty cell.
If that empty cell is the next playable cell in its column (gravity-top), it wins the
game immediately; otherwise it is a latent threat that will become decisive as the
board fills.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

By playing [zone:col2]column 2[/zone:col2], you gave your opponent a [term:forced_win]forced win[/term:forced_win]: they now have the same dangerous setup on [zone:col6]column 6[/zone:col6], while your own major threat stayed at [zone:windows:c6r2]1[/zone:windows:c6r2] instead of rising to [zone:windows:c2r6|c6r2]2[/zone:windows:c2r6|c6r2]. The better move was [zone:col3]column 3[/zone:col3], which would have kept that sequence unavailable and left your opponent with fewer minor threats, dropping them from [zone:windows:c1r5|c2r4|c3r5|c3r6|c6r3|c7r4]6[/zone:windows:c1r5|c2r4|c3r5|c3r6|c6r3|c7r4] to [zone:windows:c1r5|c2r4|c6r3|c7r4]4[/zone:windows:c1r5|c2r4|c6r3|c7r4] rather than leaving them at [zone:windows:c1r5|c2r4|c3r5|c3r6|c6r3|c7r4]6[/zone:windows:c1r5|c2r4|c3r5|c3r6|c6r3|c7r4].

---

### eval-49 — z_threat (sev 1)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on EVEN rows (2,4,6).
Your opponent wins on ODD rows (1,3,5).

## Boards
### Before the move
Move 35  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |Gy |Gy |Gn |Gy |Gn |   |   |
  5  |Gn |Gn |Gy |Gy |Gn |Gn |   |
  4  |Gy |Gn |Gn |Gy |Gy |Gn |   |
  3  |Gn |Gy |Gy |Gn |Gn |Gy |   |
  2  |Gy |Gn |Gn |Gy |Gy |Gy |   |
  1  |Gy |Gn |Gn |Gn |Gy |Gn |   |

        1      2      3      4      5      6      7   
  6  | Gy34 | Gy30 | Gn27 | Gy28 | Gn25 |      |      |
  5  | Gn33 | Gn23 | Gy24 | Gy16 | Gn21 | Gn35 |      |
  4  | Gy32 | Gn13 | Gn15 | Gy14 | Gy20 | Gn31 |      |
  3  | Gn29 | Gy10 | Gy12 | Gn 7 | Gn19 | Gy26 |      |
  2  | Gy22 | Gn 9 | Gn11 | Gy 2 | Gy 8 | Gy18 | [Gy] |
  1  | Gy 6 | Gn 5 | Gn 3 | Gn 1 | Gy 4 | Gn17 |      |

  ht |   6  |   6  |   6  |   6  |   6  |   5  |   0  |  (discs in column)
 par |  0E  |  0E  |  0E  |  0E  |  0E  |  1O  |  6E  |  (empty cells: O=odd E=even)
  Major threats: col7 row2 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 36  |  Next: Green

       1   2   3   4   5   6   7 
  6  |Gy |Gy |Gn |Gy |Gn |Gy |   |
  5  |Gn |Gn |Gy |Gy |Gn |Gn |   |
  4  |Gy |Gn |Gn |Gy |Gy |Gn |   |
  3  |Gn |Gy |Gy |Gn |Gn |Gy |   |
  2  |Gy |Gn |Gn |Gy |Gy |Gy |   |
  1  |Gy |Gn |Gn |Gn |Gy |Gn |   |

        1      2      3      4      5      6      7   
  6  | Gy34 | Gy30 | Gn27 | Gy28 | Gn25 | Gy36 |      |
  5  | Gn33 | Gn23 | Gy24 | Gy16 | Gn21 | Gn35 |      |
  4  | Gy32 | Gn13 | Gn15 | Gy14 | Gy20 | Gn31 |      |
  3  | Gn29 | Gy10 | Gy12 | Gn 7 | Gn19 | Gy26 |      |
  2  | Gy22 | Gn 9 | Gn11 | Gy 2 | Gy 8 | Gy18 | [Gy] |
  1  | Gy 6 | Gn 5 | Gn 3 | Gn 1 | Gy 4 | Gn17 |      |

  ht |   6  |   6  |   6  |   6  |   6  |   6  |   0  |  (discs in column)
 par |  0E  |  0E  |  0E  |  0E  |  0E  |  0E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: col7 row2 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 36  |  Next: Green

       1   2   3   4   5   6   7 
  6  |Gy |Gy |Gn |Gy |Gn |   |   |
  5  |Gn |Gn |Gy |Gy |Gn |Gn |   |
  4  |Gy |Gn |Gn |Gy |Gy |Gn |   |
  3  |Gn |Gy |Gy |Gn |Gn |Gy |   |
  2  |Gy |Gn |Gn |Gy |Gy |Gy |   |
  1  |Gy |Gn |Gn |Gn |Gy |Gn |Gy |

        1      2      3      4      5      6      7   
  6  | Gy34 | Gy30 | Gn27 | Gy28 | Gn25 |      |      |
  5  | Gn33 | Gn23 | Gy24 | Gy16 | Gn21 | Gn35 |      |
  4  | Gy32 | Gn13 | Gn15 | Gy14 | Gy20 | Gn31 |      |
  3  | Gn29 | Gy10 | Gy12 | Gn 7 | Gn19 | Gy26 |      |
  2  | Gy22 | Gn 9 | Gn11 | Gy 2 | Gy 8 | Gy18 | <Gy> |
  1  | Gy 6 | Gn 5 | Gn 3 | Gn 1 | Gy 4 | Gn17 | Gy36 |

  ht |   6  |   6  |   6  |   6  |   6  |   5  |   1  |  (discs in column)
 par |  0E  |  0E  |  0E  |  0E  |  0E  |  1O  |  5O  |  (empty cells: O=odd E=even)
  Major threats: col7 row2 (Gy) [GT]

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gy = your discs, Gn = your opponent's discs.

## Move context
- Your winning rows: EVEN (2,4,6)
- Eval gap: moderate
- Move played: column 7
- Your move placed a disc on c7r1.
- Better move: column 6
- The better move places a disc on c6r6.
- Key insight: You had the parity advantage — an odd vertical capsule — and abandoned it.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing an actual count, copy the zone tag shown on that line and wrap the count with it; when a line shows "none", just say so in plain words (e.g. "no minor threats") with no tag. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your major threats: [zone:player-major-pre]1[/zone:player-major-pre]

After the best move (column 6):
- Your major threats: [zone:player-major-best]1[/zone:player-major-best]

After the move played (column 7):
- Your major threats: none

## Best-move tactical evidence
The following tactical patterns were present after the best move:
- z_threat (position-level pattern)

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
Column numbers (1–7) are always valid to reference — they appear in every board header.
Only omit specific CELL references (e.g. c4r3) if the cell is not listed in the boards above.

## Tone
This move gave away a real advantage; explain the concrete consequence.

## KB term definitions

The following tactical concepts apply to this position:

- [term:immediate_threat] **immediate threat** (immediate_threat): An immediate threat is a major threat whose empty cell is directly playable right now —
it is the topmost empty cell in its column (gravity-top). Playing there wins the game
on this move.
- [term:claimeven] **claimeven** (claimeven): A pair of vertically adjacent empty squares (lower odd, upper even) where the
zugzwang controller gets the upper even square at the cost of conceding the lower
odd one to the opponent. The most fundamental of Allis's nine rules.
- [term:z_threat] **z threat** (z_threat): A Z-Threat is a major threat where the count of empty cells from column height to
the threat row is odd, letting the owner toggle zugzwang control.
- [term:major_threat] **major threat** (major_threat): A major threat is a four-cell window containing three of your discs and one empty cell.
If that empty cell is the next playable cell in its column (gravity-top), it wins the
game immediately; otherwise it is a latent threat that will become decisive as the
board fills.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

You had the [term:z_threat]z threat[/term:z_threat] setup through the odd vertical capsule, but by playing [zone:col7]column 7[/zone:col7] you abandoned it and left yourself with no major threats at all. The better move, [zone:col6]column 6[/zone:col6], would have kept that threat alive — your major threats stayed at [zone:windows:c7r2]1[/zone:windows:c7r2] after the best move instead of disappearing after your play — and preserved the parity advantage you needed to keep pressure on the even-row win.

---

### eval-50 — double_threat (sev 4)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 4  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |Gy |Gy |   |   |
  1  |   |   |   |Gn |Gn |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      | (gy) | (gy) | Gy 2 | Gy 4 | (gy) | (gy) |
  1  |      | (gn) | (gn) | Gn 1 | Gn 3 | (gn) | (gn) |

  ht |   0  |   0  |   0  |   2  |   2  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  6E  |  4E  |  4E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 5  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |   |   |   |
  2  |   |   |   |Gy |Gy |   |   |
  1  |   |   |Gn |Gn |Gn |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      |      |      |      |
  2  |      | (gy) | (gy) | Gy 2 | Gy 4 | (gy) | (gy) |
  1  | (gn) | <Gn> | Gn 5 | Gn 1 | Gn 3 | <Gn> | (gn) |

  ht |   0  |   0  |   1  |   2  |   2  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  5O  |  4E  |  4E  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: col2 row1 (Gn) [GT]   col6 row1 (Gn) [GT]

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 5  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |   |   |   |   |
  3  |   |   |   |   |Gn |   |   |
  2  |   |   |   |Gy |Gy |   |   |
  1  |   |   |   |Gn |Gn |   |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      |      |
  4  |      |      |      |      |      |      |      |
  3  |      |      |      |      | Gn 5 |      |      |
  2  |      | (gy) | (gy) | Gy 2 | Gy 4 | (gy) | (gy) |
  1  |      | (gn) | (gn) | Gn 1 | Gn 3 | (gn) | (gn) |

  ht |   0  |   0  |   0  |   2  |   3  |   0  |   0  |  (discs in column)
 par |  6E  |  6E  |  6E  |  4E  |  3O  |  6E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: large
- Move played: column 5
- Your move placed a disc on c5r3.
- Better move: column 3
- The better move places a disc on c3r1.
- Key insight: You could have built a double threat — two winning columns at once — and missed it.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing an actual count, copy the zone tag shown on that line and wrap the count with it; when a line shows "none", just say so in plain words (e.g. "no minor threats") with no tag. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your minor threats: [zone:player-minor-pre]4[/zone:player-minor-pre]

After the best move (column 3):
- Your minor threats: none

After the move played (column 5):
- Your minor threats: [zone:player-minor-played]4[/zone:player-minor-played]

## Best-move tactical evidence
The following tactical patterns were present after the best move:
- immediate_threat: cells [c2r1, c6r1]
- double_threat: cells [c2r1, c6r1]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col5]column 5[/zone:col5], [zone:col3]column 3[/zone:col3]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR threat cells: [c2r1, c6r1]

## Tone
This was a significant mistake; explain clearly what was lost.

## KB term definitions

The following tactical concepts apply to this position:

- [term:double_threat] **double threat** (double_threat): A double threat (fork) is a single move that creates two simultaneous immediate
threats. Since the opponent can play only one column per turn, one threat is always
left open — guaranteeing a win on the very next move.
- [term:immediate_threat] **immediate threat** (immediate_threat): An immediate threat is a major threat whose empty cell is directly playable right now —
it is the topmost empty cell in its column (gravity-top). Playing there wins the game
on this move.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

By playing [zone:col5]column 5[/zone:col5], you missed the [term:double_threat]double threat[/term:double_threat] that [zone:col3]column 3[/zone:col3] would have created on [zone:c2r1]that cell[/zone:c2r1] and [zone:c6r1]that cell[/zone:c6r1]. The better move would have given you two immediate threats at once, while your move only left you with [zone:windows:c2r1|c3r1|c6r1|c7r1]4[/zone:windows:c2r1|c3r1|c6r1|c7r1] minor threats instead of the cleaner finish.

---

### eval-51 — figure_7 (sev 4)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 10  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |Gn |   |   |   |
  3  |   |   |   |Gy |Gy |   |   |
  2  |   |   |   |Gn |Gy |Gn |   |
  1  |   |Gy |   |Gy |Gn |Gn |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      | (gy) |      |      | (gy) |      |      |
  4  |      | (gn) | (gy) | Gn 5 | (gy) | (gn) | (gy) |
  3  |      | (gy) | (*)  | Gy 4 | Gy10 | (*)  | (gy) |
  2  |      |      | (gy) | Gn 3 | Gy 6 | Gn 9 |      |
  1  | (gy) | Gy 8 | (gy) | Gy 2 | Gn 1 | Gn 7 |      |

  ht |   0  |   1  |   0  |   4  |   3  |   2  |   0  |  (discs in column)
 par |  6E  |  5O  |  6E  |  2E  |  3O  |  4E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 11  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |Gn |   |   |   |
  3  |   |   |   |Gy |Gy |Gn |   |
  2  |   |   |   |Gn |Gy |Gn |   |
  1  |   |Gy |   |Gy |Gn |Gn |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      | (gy) |      |      | (gy) | (gn) |      |
  4  |      | (gn) | (gy) | Gn 5 | (gy) | <Gn> |      |
  3  |      | (gy) | (*)  | Gy 4 | Gy10 | Gn11 |      |
  2  |      |      | (gy) | Gn 3 | Gy 6 | Gn 9 |      |
  1  | (gy) | Gy 8 | (gy) | Gy 2 | Gn 1 | Gn 7 |      |

  ht |   0  |   1  |   0  |   4  |   3  |   3  |   0  |  (discs in column)
 par |  6E  |  5O  |  6E  |  2E  |  3O  |  3O  |  6E  |  (empty cells: O=odd E=even)
  Major threats: col6 row4 (Gn) [GT]

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 11  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |Gn |   |   |   |
  3  |   |   |   |Gy |Gy |   |   |
  2  |   |   |   |Gn |Gy |Gn |   |
  1  |Gn |Gy |   |Gy |Gn |Gn |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      | (gy) |      |      | (gy) |      |      |
  4  |      | (gn) | (gy) | Gn 5 | (gy) | (gn) | (gy) |
  3  |      | (gy) | (*)  | Gy 4 | Gy10 | (*)  | (gy) |
  2  |      | (gn) | (gy) | Gn 3 | Gy 6 | Gn 9 |      |
  1  | Gn11 | Gy 8 |      | Gy 2 | Gn 1 | Gn 7 |      |

  ht |   1  |   1  |   0  |   4  |   3  |   2  |   0  |  (discs in column)
 par |  5O  |  5O  |  6E  |  2E  |  3O  |  4E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: moderate
- Move played: column 1
- Your move placed a disc on c1r1.
- Better move: column 6
- The better move places a disc on c6r3.
- Key insight: You let your opponent build a Figure-7 fork you can't answer.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing an actual count, copy the zone tag shown on that line and wrap the count with it; when a line shows "none", just say so in plain words (e.g. "no minor threats") with no tag. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your minor threats: [zone:player-minor-pre]4[/zone:player-minor-pre]
- Opponent minor threats: [zone:opponent-minor-pre]12[/zone:opponent-minor-pre]

After the best move (column 6):
- Your minor threats: [zone:player-minor-best]2[/zone:player-minor-best]
- Opponent minor threats: [zone:opponent-minor-best]9[/zone:opponent-minor-best]

After the move played (column 1):
- Your minor threats: [zone:player-minor-played]5[/zone:player-minor-played]
- Opponent minor threats: [zone:opponent-minor-played]10[/zone:opponent-minor-played]

## Best-move tactical evidence
The following tactical patterns were present after the best move:
- immediate_threat: cells [c6r4]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col1]column 1[/zone:col1], [zone:col6]column 6[/zone:col6]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR threat cells: [c6r4]
- YOUR OPPONENT's threat cells: [c5r5, c4r1, c5r2, c4r3, c5r3]

## Tone
This move gave away a real advantage; explain the concrete consequence.

## KB term definitions

The following tactical concepts apply to this position:

- [term:immediate_threat] **immediate threat** (immediate_threat): An immediate threat is a major threat whose empty cell is directly playable right now —
it is the topmost empty cell in its column (gravity-top). Playing there wins the game
on this move.
- [term:figure_7] **figure 7** (figure_7): A five-disc "7"-shaped configuration that generates two major threats in the same
column; the opponent cannot block both because one is above gravity, making it a
zugzwang trap rather than a direct fork.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

By playing [zone:col1]column 1[/zone:col1], you let your opponent build a [term:figure_7]figure 7[/term:figure_7] around [zone:c5r5]that cell[/zone:c5r5] and [zone:c4r3]that cell[/zone:c4r3], which you can’t cover cleanly. The better move was [zone:col6]column 6[/zone:col6], because it would have given you the immediate threat on [zone:c6r4]that cell[/zone:c6r4] while also trimming your opponent’s minor threats from [zone:windows:c1r1|c2r3|c2r5|c3r1|c3r2|c3r3|c3r4|c5r4|c5r5|c6r3|c7r3|c7r4]12[/zone:windows:c1r1|c2r3|c2r5|c3r1|c3r2|c3r3|c3r4|c5r4|c5r5|c6r3|c7r3|c7r4] to [zone:windows:c1r1|c2r3|c2r5|c3r1|c3r2|c3r3|c3r4|c5r4|c5r5]9[/zone:windows:c1r1|c2r3|c2r5|c3r1|c3r2|c3r3|c3r4|c5r4|c5r5], instead of leaving them with [zone:windows:c2r3|c2r5|c3r2|c3r3|c3r4|c5r4|c5r5|c6r3|c7r3|c7r4]10[/zone:windows:c2r3|c2r5|c3r2|c3r3|c3r4|c5r4|c5r5|c6r3|c7r3|c7r4].

---

### eval-52 — figure_7 (sev 2)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on EVEN rows (2,4,6).
Your opponent wins on ODD rows (1,3,5).

## Boards
### Before the move
Move 11  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |Gy |   |   |   |
  4  |   |   |   |Gy |   |   |   |
  3  |   |   |Gn |Gn |   |   |   |
  2  |   |   |Gn |Gy |   |Gn |   |
  1  |   |Gn |Gy |Gn |   |Gy |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      | (gn) | Gy10 |      | (gn) |      |
  4  | (gn) |      | (gn) | Gy 6 | [Gn] | (gy) |      |
  3  | (gn) | (gn) | Gn 7 | Gn 3 | (*)  | (gn) |      |
  2  |      |      | Gn 5 | Gy 2 |      | Gn 9 |      |
  1  |      | Gn11 | Gy 4 | Gn 1 |      | Gy 8 |      |

  ht |   0  |   1  |   3  |   5  |   0  |   2  |   0  |  (discs in column)
 par |  6E  |  5O  |  3O  |  1O  |  6E  |  4E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: col5 row4 (Gn)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 12  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |Gy |   |   |   |
  5  |   |   |   |Gy |   |   |   |
  4  |   |   |   |Gy |   |   |   |
  3  |   |   |Gn |Gn |   |   |   |
  2  |   |   |Gn |Gy |   |Gn |   |
  1  |   |Gn |Gy |Gn |   |Gy |   |

        1      2      3      4      5      6      7   
  6  |      |      |      | Gy12 |      |      |      |
  5  |      |      | (gn) | Gy10 |      | (gn) |      |
  4  | (gn) |      | (gn) | Gy 6 | [Gn] | (gy) |      |
  3  | (gn) | (gn) | Gn 7 | Gn 3 | (*)  | (gn) |      |
  2  |      |      | Gn 5 | Gy 2 |      | Gn 9 |      |
  1  |      | Gn11 | Gy 4 | Gn 1 |      | Gy 8 |      |

  ht |   0  |   1  |   3  |   6  |   0  |   2  |   0  |  (discs in column)
 par |  6E  |  5O  |  3O  |  0E  |  6E  |  4E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: col5 row4 (Gn)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 12  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |Gy |   |   |   |
  4  |   |   |   |Gy |   |   |   |
  3  |   |   |Gn |Gn |   |   |   |
  2  |   |Gy |Gn |Gy |   |Gn |   |
  1  |   |Gn |Gy |Gn |   |Gy |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      | (gn) | Gy10 |      | (gn) |      |
  4  | (gn) |      | (gn) | Gy 6 | [Gn] | (gy) |      |
  3  | (gn) | (gn) | Gn 7 | Gn 3 | (*)  | (gn) |      |
  2  |      | Gy12 | Gn 5 | Gy 2 |      | Gn 9 |      |
  1  |      | Gn11 | Gy 4 | Gn 1 |      | Gy 8 |      |

  ht |   0  |   2  |   3  |   5  |   0  |   2  |   0  |  (discs in column)
 par |  6E  |  4E  |  3O  |  1O  |  6E  |  4E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: col5 row4 (Gn)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gy = your discs, Gn = your opponent's discs.

## Move context
- Your winning rows: EVEN (2,4,6)
- Eval gap: moderate
- Move played: column 2
- Your move placed a disc on c2r2.
- Better move: column 4
- The better move places a disc on c4r6.
- Key insight: You let your opponent build a Figure-7 fork you can't answer.

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col2]column 2[/zone:col2], [zone:col4]column 4[/zone:col4]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR OPPONENT's threat cells: [c2r1, c3r2, c2r3, c3r3, c4r3]

## Tone
This move gave away a real advantage; explain the concrete consequence.

## KB term definitions

The following tactical concepts apply to this position:

- [term:figure_7] **figure 7** (figure_7): A five-disc "7"-shaped configuration that generates two major threats in the same
column; the opponent cannot block both because one is above gravity, making it a
zugzwang trap rather than a direct fork.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

By playing [zone:col2]column 2[/zone:col2], you let your opponent set up a [term:figure_7]figure 7[/term:figure_7] shape around [zone:cells:c2r1,c3r2,c2r3,c3r3,c4r3]the threat cluster[/zone:cells:c2r1,c3r2,c2r3,c3r3,c4r3], and that gave them a way to build pressure you could not cover cleanly. If you had played [zone:col4]column 4[/zone:col4] instead, you would have taken the key square on [zone:row6]row 6[/zone:row6] and kept that fork structure from forming, which would have left you in much better control of the position.

---

### eval-53 — figure_7 (sev 0)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 12  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |Gy |   |   |   |
  4  |   |   |   |Gy |   |   |   |
  3  |   |   |Gn |Gn |   |   |   |
  2  |   |Gy |Gn |Gy |   |Gn |   |
  1  |   |Gn |Gy |Gn |   |Gy |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      | (gn) | Gy10 |      | (gn) |      |
  4  | (gn) |      | (gn) | Gy 6 | [Gn] | (gy) |      |
  3  | (gn) | (gn) | Gn 7 | Gn 3 | (*)  | (gn) |      |
  2  |      | Gy12 | Gn 5 | Gy 2 |      | Gn 9 |      |
  1  |      | Gn11 | Gy 4 | Gn 1 |      | Gy 8 |      |

  ht |   0  |   2  |   3  |   5  |   0  |   2  |   0  |  (discs in column)
 par |  6E  |  4E  |  3O  |  1O  |  6E  |  4E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: col5 row4 (Gn)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 13  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |Gy |   |   |   |
  4  |   |   |   |Gy |   |   |   |
  3  |   |Gn |Gn |Gn |   |   |   |
  2  |   |Gy |Gn |Gy |   |Gn |   |
  1  |   |Gn |Gy |Gn |   |Gy |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      | (gn) | Gy10 |      | (gn) |      |
  4  | [Gn] |      | (gn) | Gy 6 | [Gn] | (gy) |      |
  3  | [Gn] | Gn13 | Gn 7 | Gn 3 | [Gn] | (gn) |      |
  2  |      | Gy12 | Gn 5 | Gy 2 |      | Gn 9 |      |
  1  |      | Gn11 | Gy 4 | Gn 1 |      | Gy 8 |      |

  ht |   0  |   3  |   3  |   5  |   0  |   2  |   0  |  (discs in column)
 par |  6E  |  3O  |  3O  |  1O  |  6E  |  4E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: col1 row3 (Gn)   col1 row4 (Gn)   col5 row3 (Gn)   col5 row4 (Gn)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 13  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |Gy |   |   |   |
  4  |   |   |Gn |Gy |   |   |   |
  3  |   |   |Gn |Gn |   |   |   |
  2  |   |Gy |Gn |Gy |   |Gn |   |
  1  |   |Gn |Gy |Gn |   |Gy |   |

        1      2      3      4      5      6      7   
  6  | (gn) |      | (gn) |      |      |      |      |
  5  |      | (gn) | <Gn> | Gy10 |      | (gn) |      |
  4  | (gn) |      | Gn13 | Gy 6 | [Gn] | (gy) |      |
  3  | (gn) | (gn) | Gn 7 | Gn 3 | (*)  | (gn) |      |
  2  |      | Gy12 | Gn 5 | Gy 2 | (gn) | Gn 9 |      |
  1  |      | Gn11 | Gy 4 | Gn 1 |      | Gy 8 |      |

  ht |   0  |   2  |   4  |   5  |   0  |   2  |   0  |  (discs in column)
 par |  6E  |  4E  |  2E  |  1O  |  6E  |  4E  |  6E  |  (empty cells: O=odd E=even)
  Major threats: col3 row5 (Gn) [GT]   col5 row4 (Gn)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: small
- Move played: column 3
- Your move placed a disc on c3r4.
- Better move: column 2
- The better move places a disc on c2r3.
- Key insight: You had a Figure-7 fork structure and didn't complete it.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing an actual count, copy the zone tag shown on that line and wrap the count with it; when a line shows "none", just say so in plain words (e.g. "no minor threats") with no tag. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your major threats: [zone:player-major-pre]1[/zone:player-major-pre]
- Your minor threats: [zone:player-minor-pre]7[/zone:player-minor-pre]

After the best move (column 2):
- Your major threats: [zone:player-major-best]4[/zone:player-major-best]
- Your minor threats: [zone:player-minor-best]2[/zone:player-minor-best]

After the move played (column 3):
- Your major threats: [zone:player-major-played]1[/zone:player-major-played]
- Your minor threats: [zone:player-minor-played]8[/zone:player-minor-played]

## Best-move tactical evidence
The following tactical patterns were present after the best move:
- figure_7: cells [c2r1, c3r2, c2r3, c3r3, c4r3]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col3]column 3[/zone:col3], [zone:col2]column 2[/zone:col2]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR threat cells: [c4r1, c3r2, c4r3, c3r3, c2r1, c2r3]

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

## KB term definitions

The following tactical concepts apply to this position:

- [term:immediate_threat] **immediate threat** (immediate_threat): An immediate threat is a major threat whose empty cell is directly playable right now —
it is the topmost empty cell in its column (gravity-top). Playing there wins the game
on this move.
- [term:j_shape] **j shape** (j_shape): A four-disc L-shaped Red cluster generating three simultaneous minor threats that
is equivalent to a major odd-row threat; the opponent cannot block all three paths.
- [term:figure_7] **figure 7** (figure_7): A five-disc "7"-shaped configuration that generates two major threats in the same
column; the opponent cannot block both because one is above gravity, making it a
zugzwang trap rather than a direct fork.
- [term:major_threat] **major threat** (major_threat): A major threat is a four-cell window containing three of your discs and one empty cell.
If that empty cell is the next playable cell in its column (gravity-top), it wins the
game immediately; otherwise it is a latent threat that will become decisive as the
board fills.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

You missed the [term:figure_7]figure 7[/term:figure_7] by playing [zone:col3]column 3[/zone:col3]; that move only left you with [zone:windows:c5r4]1[/zone:windows:c5r4] major threat and [zone:windows:c1r3|c1r4|c1r6|c2r3|c2r5|c5r2|c5r3|c6r3]8[/zone:windows:c1r3|c1r4|c1r6|c2r3|c2r5|c5r2|c5r3|c6r3] minor threats, while the better move in [zone:col2]column 2[/zone:col2] would have lifted you to [zone:windows:c1r3|c1r4|c5r3|c5r4]4[/zone:windows:c1r3|c1r4|c5r3|c5r4] major threats and cut the minor buildup to [zone:windows:c3r4|c3r5]2[/zone:windows:c3r4|c3r5]. By playing [zone:col2]column 2[/zone:col2], you would have completed the trap structure around [zone:cells:c2r1,c3r2,c2r3,c3r3,c4r3]the threat cluster[/zone:cells:c2r1,c3r2,c2r3,c3r3,c4r3], giving you a much stronger setup on your odd rows.

---

### eval-55 — overcut (sev 1)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 20  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |Gn |   |   |   |
  5  |   |   |   |Gy |   |   |   |
  4  |   |Gn |   |Gy |Gy |   |   |
  3  |   |Gy |   |Gn |Gn |   |   |
  2  |Gn |Gy |   |Gy |Gn |   |Gy |
  1  |Gy |Gn |Gy |Gn |Gn |Gy |Gn |

        1      2      3      4      5      6      7   
  6  |      |      | (gy) | Gn19 | (gy) |      |      |
  5  |      | (gn) | (gn) | Gy18 | (gy) |      |      |
  4  |      | Gn17 | (*)  | Gy 4 | Gy16 | (gy) | (*)  |
  3  | (gn) | Gy14 | [Gy] | Gn 3 | Gn15 | [Gy] | (gn) |
  2  | Gn13 | Gy12 |      | Gy 2 | Gn11 |      | Gy20 |
  1  | Gy 6 | Gn 5 | Gy 8 | Gn 1 | Gn 7 | Gy10 | Gn 9 |

  ht |   2  |   4  |   1  |   6  |   4  |   1  |   2  |  (discs in column)
 par |  4E  |  2E  |  5O  |  0E  |  2E  |  5O  |  4E  |  (empty cells: O=odd E=even)
  Major threats: col3 row3 (Gy)   col6 row3 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 21  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |Gn |   |   |   |
  5  |   |Gn |   |Gy |   |   |   |
  4  |   |Gn |   |Gy |Gy |   |   |
  3  |   |Gy |   |Gn |Gn |   |   |
  2  |Gn |Gy |   |Gy |Gn |   |Gy |
  1  |Gy |Gn |Gy |Gn |Gn |Gy |Gn |

        1      2      3      4      5      6      7   
  6  | (gn) |      | (gy) | Gn19 | (gy) |      |      |
  5  |      | Gn21 | (gn) | Gy18 | (gy) |      |      |
  4  |      | Gn17 | [Gn] | Gy 4 | Gy16 | (gy) | (*)  |
  3  | (gn) | Gy14 | [Gy] | Gn 3 | Gn15 | [Gy] | (gn) |
  2  | Gn13 | Gy12 |      | Gy 2 | Gn11 |      | Gy20 |
  1  | Gy 6 | Gn 5 | Gy 8 | Gn 1 | Gn 7 | Gy10 | Gn 9 |

  ht |   2  |   5  |   1  |   6  |   4  |   1  |   2  |  (discs in column)
 par |  4E  |  1O  |  5O  |  0E  |  2E  |  5O  |  4E  |  (empty cells: O=odd E=even)
  Major threats: col3 row3 (Gy)   col3 row4 (Gn)   col6 row3 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 21  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |Gn |   |   |   |
  5  |   |   |   |Gy |Gn |   |   |
  4  |   |Gn |   |Gy |Gy |   |   |
  3  |   |Gy |   |Gn |Gn |   |   |
  2  |Gn |Gy |   |Gy |Gn |   |Gy |
  1  |Gy |Gn |Gy |Gn |Gn |Gy |Gn |

        1      2      3      4      5      6      7   
  6  |      |      | (gy) | Gn19 | (gy) |      |      |
  5  |      | (gn) | (gn) | Gy18 | Gn21 |      |      |
  4  |      | Gn17 | (*)  | Gy 4 | Gy16 | (*)  | (*)  |
  3  | (gn) | Gy14 | [Gy] | Gn 3 | Gn15 | [Gy] | (gn) |
  2  | Gn13 | Gy12 |      | Gy 2 | Gn11 |      | Gy20 |
  1  | Gy 6 | Gn 5 | Gy 8 | Gn 1 | Gn 7 | Gy10 | Gn 9 |

  ht |   2  |   4  |   1  |   6  |   5  |   1  |   2  |  (discs in column)
 par |  4E  |  2E  |  5O  |  0E  |  1O  |  5O  |  4E  |  (empty cells: O=odd E=even)
  Major threats: col3 row3 (Gy)   col6 row3 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: moderate
- Move played: column 5
- Your move placed a disc on c5r5.
- Better move: column 2
- The better move places a disc on c2r5.
- Key insight: There was a stronger move — this one gives ground.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing an actual count, copy the zone tag shown on that line and wrap the count with it; when a line shows "none", just say so in plain words (e.g. "no minor threats") with no tag. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your major threats: none
- Your minor threats: [zone:player-minor-pre]8[/zone:player-minor-pre]

After the best move (column 2):
- Your major threats: [zone:player-major-best]1[/zone:player-major-best]
- Your minor threats: [zone:player-minor-best]6[/zone:player-minor-best]

After the move played (column 5):
- Your major threats: none
- Your minor threats: [zone:player-minor-played]9[/zone:player-minor-played]

## Best-move tactical evidence
The following tactical patterns were present after the best move:
- undercut: cells [c3r3, c3r4]
- j_shape: cells [c4r1, c5r2, c4r3, c5r3]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col5]column 5[/zone:col5], [zone:col2]column 2[/zone:col2]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR threat cells: [c4r1, c5r2, c4r3, c5r3, c3r3, c3r4]

## Tone
This move gave away a real advantage; explain the concrete consequence.

## KB term definitions

The following tactical concepts apply to this position:

- [term:j_shape] **j shape** (j_shape): A four-disc L-shaped Red cluster generating three simultaneous minor threats that
is equivalent to a major odd-row threat; the opponent cannot block all three paths.
- [term:undercut] **undercut** (undercut): When opposite-color major threats in the same column have opposite row parity, the
lower threat undercuts the upper one because gravity fills bottom-up, neutralizing
the higher threat.
- [term:major_threat] **major threat** (major_threat): A major threat is a four-cell window containing three of your discs and one empty cell.
If that empty cell is the next playable cell in its column (gravity-top), it wins the
game immediately; otherwise it is a latent threat that will become decisive as the
board fills.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

You gave away the [term:undercut]undercut[/term:undercut] in [zone:col3]column 3[/zone:col3]: after the better move, you could have kept the lower shape that held your own major threat on [zone:c3r4]that cell[/zone:c3r4] while also preserving the J-shaped setup across [zone:cells:c4r1,c5r2,c4r3,c5r3]the threat cluster[/zone:cells:c4r1,c5r2,c4r3,c5r3]. That better move would have left you with [zone:windows:c3r4]1[/zone:windows:c3r4] major threat and [zone:windows:c1r3|c3r3|c3r5|c6r3|c7r3|c7r4]6[/zone:windows:c1r3|c3r3|c3r5|c6r3|c7r3|c7r4] minor threats, instead of your move leaving you with no major threats and [zone:windows:c1r3|c2r5|c3r3|c3r4|c3r5|c6r3|c6r4|c7r3|c7r4]9[/zone:windows:c1r3|c2r5|c3r3|c3r4|c3r5|c6r3|c6r4|c7r3|c7r4] minor threats.

---

### eval-56 — odd_even_threat (sev 0)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 22  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |Gn |   |   |   |
  5  |   |   |   |Gy |   |   |   |
  4  |   |   |   |Gy |Gn |   |Gy |
  3  |Gy |Gy |   |Gn |Gy |   |Gn |
  2  |Gn |Gn |   |Gy |Gy |Gn |Gn |
  1  |Gn |Gy |   |Gn |Gy |Gy |Gn |

        1      2      3      4      5      6      7   
  6  |      | (gy) |      | Gn13 | (gy) |      | (gn) |
  5  |      |      | (gy) | Gy 8 | (gn) | (gn) | (gy) |
  4  |      | (gy) | (gy) | Gy 4 | Gn21 | (*)  | Gy10 |
  3  | Gy16 | Gy22 | (gy) | Gn 3 | Gy20 |      | Gn 9 |
  2  | Gn15 | Gn19 | (gn) | Gy 2 | Gy18 | Gn17 | Gn 7 |
  1  | Gn11 | Gy12 | (gy) | Gn 1 | Gy 6 | Gy14 | Gn 5 |

  ht |   3  |   3  |   0  |   6  |   4  |   2  |   4  |  (discs in column)
 par |  3O  |  3O  |  6E  |  0E  |  2E  |  4E  |  2E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 23  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |Gn |   |   |   |
  5  |   |   |   |Gy |   |   |Gn |
  4  |   |   |   |Gy |Gn |   |Gy |
  3  |Gy |Gy |   |Gn |Gy |   |Gn |
  2  |Gn |Gn |   |Gy |Gy |Gn |Gn |
  1  |Gn |Gy |   |Gn |Gy |Gy |Gn |

        1      2      3      4      5      6      7   
  6  |      | (gy) |      | Gn13 | (gy) |      | (gn) |
  5  |      |      | (gy) | Gy 8 | (gn) | (gn) | Gn23 |
  4  |      | (gy) | (gy) | Gy 4 | Gn21 | (*)  | Gy10 |
  3  | Gy16 | Gy22 | (gy) | Gn 3 | Gy20 |      | Gn 9 |
  2  | Gn15 | Gn19 | (gn) | Gy 2 | Gy18 | Gn17 | Gn 7 |
  1  | Gn11 | Gy12 | (gy) | Gn 1 | Gy 6 | Gy14 | Gn 5 |

  ht |   3  |   3  |   0  |   6  |   4  |   2  |   5  |  (discs in column)
 par |  3O  |  3O  |  6E  |  0E  |  2E  |  4E  |  1O  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 23  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |Gn |   |   |   |
  5  |   |   |   |Gy |   |   |   |
  4  |Gn |   |   |Gy |Gn |   |Gy |
  3  |Gy |Gy |   |Gn |Gy |   |Gn |
  2  |Gn |Gn |   |Gy |Gy |Gn |Gn |
  1  |Gn |Gy |   |Gn |Gy |Gy |Gn |

        1      2      3      4      5      6      7   
  6  |      | (gy) |      | Gn13 | (gy) |      | (gn) |
  5  |      |      | (gy) | Gy 8 | (gn) | (gn) | (gy) |
  4  | Gn23 | (gy) | (gy) | Gy 4 | Gn21 | (*)  | Gy10 |
  3  | Gy16 | Gy22 | (gy) | Gn 3 | Gy20 |      | Gn 9 |
  2  | Gn15 | Gn19 | (gn) | Gy 2 | Gy18 | Gn17 | Gn 7 |
  1  | Gn11 | Gy12 | (gy) | Gn 1 | Gy 6 | Gy14 | Gn 5 |

  ht |   4  |   3  |   0  |   6  |   4  |   2  |   4  |  (discs in column)
 par |  2E  |  3O  |  6E  |  0E  |  2E  |  4E  |  2E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: small
- Move played: column 1
- Your move placed a disc on c1r4.
- Better move: column 7
- The better move places a disc on c7r5.
- Key insight: Your move gave Red threats on both row parities.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing an actual count, copy the zone tag shown on that line and wrap the count with it; when a line shows "none", just say so in plain words (e.g. "no minor threats") with no tag. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Opponent minor threats: [zone:opponent-minor-pre]9[/zone:opponent-minor-pre]

After the best move (column 7):
- Opponent minor threats: [zone:opponent-minor-best]8[/zone:opponent-minor-best]

After the move played (column 1):
- Opponent minor threats: [zone:opponent-minor-played]9[/zone:opponent-minor-played]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col1]column 1[/zone:col1], [zone:col7]column 7[/zone:col7]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR OPPONENT's threat cells: [c5r3, c4r4, c5r5, c4r5]

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

## KB term definitions

The following tactical concepts apply to this position:

- [term:odd_even_threat] **odd even threat** (odd_even_threat): An odd-even threat choice arises when the player can build toward a winning threat
in two columns — one landing on an odd row, one on an even row, neither yet playable.
The odd-row threat is always preferred because Yellow's claimeven strategy cannot
neutralise threats on odd rows.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

Your move at [zone:col1]column 1[/zone:col1] gave your opponent [term:odd_even_threat]odd even threat[/term:odd_even_threat] chances on both row types: it left them with [zone:windows:c2r4|c2r6|c3r1|c3r3|c3r4|c3r5|c5r6|c6r4|c7r5]9[/zone:windows:c2r4|c2r6|c3r1|c3r3|c3r4|c3r5|c5r6|c6r4|c7r5] minor threats, while the better move in [zone:col7]column 7[/zone:col7] would have reduced that to [zone:windows:c2r4|c2r6|c3r1|c3r3|c3r4|c3r5|c5r6|c6r4]8[/zone:windows:c2r4|c2r6|c3r1|c3r3|c3r4|c3r5|c5r6|c6r4]. By playing there, you would have kept more of the key center-right structure intact instead of handing your opponent extra flexibility around [zone:c5r3]that cell[/zone:c5r3] and [zone:c4r4]that cell[/zone:c4r4].

---

### eval-57 — figure_7 (sev 3)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on EVEN rows (2,4,6).
Your opponent wins on ODD rows (1,3,5).

## Boards
### Before the move
Move 13  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |Gn |   |Gn |   |   |
  3  |   |   |Gy |   |Gy |   |   |
  2  |   |   |Gn |Gy |Gn |   |Gn |
  1  |   |   |Gn |Gy |Gy |Gy |Gn |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  | (gy) | (gn) |      | (gn) |      | (gn) | (gy) |
  4  |      | [Gy] | Gn 7 | (*)  | Gn11 | (*)  | (gn) |
  3  |      | (gy) | Gy 4 | (*)  | Gy 8 | (*)  | (gn) |
  2  |      |      | Gn 3 | Gy12 | Gn 5 |      | Gn13 |
  1  |      | (gn) | Gn 1 | Gy 6 | Gy 2 | Gy10 | Gn 9 |

  ht |   0  |   0  |   4  |   2  |   4  |   1  |   2  |  (discs in column)
 par |  6E  |  6E  |  2E  |  4E  |  2E  |  5O  |  4E  |  (empty cells: O=odd E=even)
  Major threats: col2 row4 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 14  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |Gn |   |Gn |   |   |
  3  |   |   |Gy |Gy |Gy |   |   |
  2  |   |   |Gn |Gy |Gn |   |Gn |
  1  |   |   |Gn |Gy |Gy |Gy |Gn |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  | (gy) |      |      | (*)  |      |      | (gy) |
  4  |      | [Gy] | Gn 7 | <Gy> | Gn11 | (*)  | (gn) |
  3  | (gy) | [Gy] | Gy 4 | Gy14 | Gy 8 | [Gy] | (*)  |
  2  |      |      | Gn 3 | Gy12 | Gn 5 |      | Gn13 |
  1  |      |      | Gn 1 | Gy 6 | Gy 2 | Gy10 | Gn 9 |

  ht |   0  |   0  |   4  |   3  |   4  |   1  |   2  |  (discs in column)
 par |  6E  |  6E  |  2E  |  3O  |  2E  |  5O  |  4E  |  (empty cells: O=odd E=even)
  Major threats: col2 row3 (Gy)   col2 row4 (Gy)   col4 row4 (Gy) [GT]   col6 row3 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 14  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |Gn |   |Gn |   |   |
  3  |   |   |Gy |   |Gy |   |   |
  2  |   |   |Gn |Gy |Gn |   |Gn |
  1  |   |Gy |Gn |Gy |Gy |Gy |Gn |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  | (gy) | (gn) |      | (gn) |      | (gn) | (gy) |
  4  |      | [Gy] | Gn 7 | (*)  | Gn11 | (*)  | (gn) |
  3  |      | (gy) | Gy 4 | (*)  | Gy 8 | (*)  | (gn) |
  2  |      |      | Gn 3 | Gy12 | Gn 5 |      | Gn13 |
  1  |      | Gy14 | Gn 1 | Gy 6 | Gy 2 | Gy10 | Gn 9 |

  ht |   0  |   1  |   4  |   2  |   4  |   1  |   2  |  (discs in column)
 par |  6E  |  5O  |  2E  |  4E  |  2E  |  5O  |  4E  |  (empty cells: O=odd E=even)
  Major threats: col2 row4 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gy = your discs, Gn = your opponent's discs.

## Move context
- Your winning rows: EVEN (2,4,6)
- Eval gap: moderate
- Move played: column 2
- Your move placed a disc on c2r1.
- Better move: column 4
- The better move places a disc on c4r3.
- Key insight: You had a Figure-7 fork structure and didn't complete it.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing an actual count, copy the zone tag shown on that line and wrap the count with it; when a line shows "none", just say so in plain words (e.g. "no minor threats") with no tag. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your major threats: [zone:player-major-pre]1[/zone:player-major-pre]
- Your minor threats: [zone:player-minor-pre]6[/zone:player-minor-pre]
- Opponent minor threats: [zone:opponent-minor-pre]11[/zone:opponent-minor-pre]

After the best move (column 4):
- Your major threats: [zone:player-major-best]3[/zone:player-major-best]
- Your minor threats: [zone:player-minor-best]2[/zone:player-minor-best]
- Opponent minor threats: [zone:opponent-minor-best]7[/zone:opponent-minor-best]

After the move played (column 2):
- Your major threats: [zone:player-major-played]1[/zone:player-major-played]
- Your minor threats: [zone:player-minor-played]6[/zone:player-minor-played]
- Opponent minor threats: [zone:opponent-minor-played]10[/zone:opponent-minor-played]

## Best-move tactical evidence
The following tactical patterns were present after the best move:
- immediate_threat: cells [c4r4]
- figure_7: cells [c5r1, c4r2, c5r3, c4r3, c3r3]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col2]column 2[/zone:col2], [zone:col4]column 4[/zone:col4]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR threat cells: [c4r4, c5r1, c4r2, c5r3, c4r3, c3r3]

## Tone
This move gave away a real advantage; explain the concrete consequence.

## KB term definitions

The following tactical concepts apply to this position:

- [term:immediate_threat] **immediate threat** (immediate_threat): An immediate threat is a major threat whose empty cell is directly playable right now —
it is the topmost empty cell in its column (gravity-top). Playing there wins the game
on this move.
- [term:figure_7] **figure 7** (figure_7): A five-disc "7"-shaped configuration that generates two major threats in the same
column; the opponent cannot block both because one is above gravity, making it a
zugzwang trap rather than a direct fork.
- [term:major_threat] **major threat** (major_threat): A major threat is a four-cell window containing three of your discs and one empty cell.
If that empty cell is the next playable cell in its column (gravity-top), it wins the
game immediately; otherwise it is a latent threat that will become decisive as the
board fills.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

You had a [term:figure_7]figure 7[/term:figure_7] available, but playing in [zone:col2]column 2[/zone:col2] did not finish it; it left you with [zone:windows:c2r4]1[/zone:windows:c2r4] major threat and [zone:windows:c2r3|c4r3|c4r4|c6r3|c6r4|c7r5]6[/zone:windows:c2r3|c4r3|c4r4|c6r3|c6r4|c7r5] minor threats, while the better move in [zone:col4]column 4[/zone:col4] would have raised you to [zone:windows:c2r3|c2r4|c6r3]3[/zone:windows:c2r3|c2r4|c6r3] major threats and cut your minor threats to [zone:windows:c6r4|c7r5]2[/zone:windows:c6r4|c7r5]. That stronger move would also have built the immediate threat on [zone:c4r4]that cell[/zone:c4r4], giving you a much more dangerous setup instead of letting your opponent keep so many chances alive ([zone:windows:c2r4|c2r5|c4r3|c4r4|c4r5|c6r3|c6r4|c6r5|c7r3|c7r4]10[/zone:windows:c2r4|c2r5|c4r3|c4r4|c4r5|c6r3|c6r4|c6r5|c7r3|c7r4] after your move versus [zone:windows:c2r4|c4r4|c4r5|c6r3|c6r4|c7r3|c7r4]7[/zone:windows:c2r4|c4r4|c4r5|c6r3|c6r4|c7r3|c7r4] after the better one).

---

### eval-58 — z_threat (sev 1)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 36  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |Gn |Gy |Gn |Gy |   |Gy |
  5  |   |Gy |Gn |Gn |Gy |Gy |Gn |
  4  |   |Gy |Gy |Gy |Gn |Gn |Gy |
  3  |   |Gn |Gn |Gn |Gy |Gn |Gn |
  2  |   |Gn |Gy |Gy |Gn |Gy |Gy |
  1  |Gy |Gn |Gn |Gn |Gy |Gy |Gn |

        1      2      3      4      5      6      7   
  6  |      | Gn35 | Gy34 | Gn15 | Gy16 |      | Gy36 |
  5  |      | Gy28 | Gn33 | Gn 5 | Gy14 | Gy26 | Gn27 |
  4  | [Gy] | Gy24 | Gy32 | Gy 4 | Gn11 | Gn25 | Gy22 |
  3  | [Gn] | Gn23 | Gn31 | Gn 3 | Gy10 | Gn21 | Gn19 |
  2  |      | Gn13 | Gy30 | Gy 2 | Gn 9 | Gy20 | Gy18 |
  1  | Gy 8 | Gn 7 | Gn29 | Gn 1 | Gy 6 | Gy12 | Gn17 |

  ht |   1  |   6  |   6  |   6  |   6  |   5  |   6  |  (discs in column)
 par |  5O  |  0E  |  0E  |  0E  |  0E  |  1O  |  0E  |  (empty cells: O=odd E=even)
  Major threats: col1 row3 (Gn)   col1 row4 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 37  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |Gn |Gy |Gn |Gy |Gn |Gy |
  5  |   |Gy |Gn |Gn |Gy |Gy |Gn |
  4  |   |Gy |Gy |Gy |Gn |Gn |Gy |
  3  |   |Gn |Gn |Gn |Gy |Gn |Gn |
  2  |   |Gn |Gy |Gy |Gn |Gy |Gy |
  1  |Gy |Gn |Gn |Gn |Gy |Gy |Gn |

        1      2      3      4      5      6      7   
  6  |      | Gn35 | Gy34 | Gn15 | Gy16 | Gn37 | Gy36 |
  5  |      | Gy28 | Gn33 | Gn 5 | Gy14 | Gy26 | Gn27 |
  4  | [Gy] | Gy24 | Gy32 | Gy 4 | Gn11 | Gn25 | Gy22 |
  3  | [Gn] | Gn23 | Gn31 | Gn 3 | Gy10 | Gn21 | Gn19 |
  2  |      | Gn13 | Gy30 | Gy 2 | Gn 9 | Gy20 | Gy18 |
  1  | Gy 8 | Gn 7 | Gn29 | Gn 1 | Gy 6 | Gy12 | Gn17 |

  ht |   1  |   6  |   6  |   6  |   6  |   6  |   6  |  (discs in column)
 par |  5O  |  0E  |  0E  |  0E  |  0E  |  0E  |  0E  |  (empty cells: O=odd E=even)
  Major threats: col1 row3 (Gn)   col1 row4 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 37  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |Gn |Gy |Gn |Gy |   |Gy |
  5  |   |Gy |Gn |Gn |Gy |Gy |Gn |
  4  |   |Gy |Gy |Gy |Gn |Gn |Gy |
  3  |   |Gn |Gn |Gn |Gy |Gn |Gn |
  2  |Gn |Gn |Gy |Gy |Gn |Gy |Gy |
  1  |Gy |Gn |Gn |Gn |Gy |Gy |Gn |

        1      2      3      4      5      6      7   
  6  |      | Gn35 | Gy34 | Gn15 | Gy16 |      | Gy36 |
  5  |      | Gy28 | Gn33 | Gn 5 | Gy14 | Gy26 | Gn27 |
  4  | [Gy] | Gy24 | Gy32 | Gy 4 | Gn11 | Gn25 | Gy22 |
  3  | <Gn> | Gn23 | Gn31 | Gn 3 | Gy10 | Gn21 | Gn19 |
  2  | Gn37 | Gn13 | Gy30 | Gy 2 | Gn 9 | Gy20 | Gy18 |
  1  | Gy 8 | Gn 7 | Gn29 | Gn 1 | Gy 6 | Gy12 | Gn17 |

  ht |   2  |   6  |   6  |   6  |   6  |   5  |   6  |  (discs in column)
 par |  4E  |  0E  |  0E  |  0E  |  0E  |  1O  |  0E  |  (empty cells: O=odd E=even)
  Major threats: col1 row3 (Gn) [GT]   col1 row4 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: moderate
- Move played: column 1
- Your move placed a disc on c1r2.
- Better move: column 6
- The better move places a disc on c6r6.
- Key insight: You had the parity advantage — an odd vertical capsule — and abandoned it.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing an actual count, copy the zone tag shown on that line and wrap the count with it; when a line shows "none", just say so in plain words (e.g. "no minor threats") with no tag. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your major threats: [zone:player-major-pre]1[/zone:player-major-pre]

After the best move (column 6):
- Your major threats: [zone:player-major-best]1[/zone:player-major-best]

After the move played (column 1):
- Your major threats: none

## Best-move tactical evidence
The following tactical patterns were present after the best move:
- z_threat (position-level pattern)

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col1]column 1[/zone:col1], [zone:col6]column 6[/zone:col6]

(no specific cell references — use the allowed columns above and describe patterns in general terms)

## Tone
This move gave away a real advantage; explain the concrete consequence.

## KB term definitions

The following tactical concepts apply to this position:

- [term:immediate_threat] **immediate threat** (immediate_threat): An immediate threat is a major threat whose empty cell is directly playable right now —
it is the topmost empty cell in its column (gravity-top). Playing there wins the game
on this move.
- [term:z_threat] **z threat** (z_threat): A Z-Threat is a major threat where the count of empty cells from column height to
the threat row is odd, letting the owner toggle zugzwang control.
- [term:major_threat] **major threat** (major_threat): A major threat is a four-cell window containing three of your discs and one empty cell.
If that empty cell is the next playable cell in its column (gravity-top), it wins the
game immediately; otherwise it is a latent threat that will become decisive as the
board fills.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

You gave away the [term:z_threat]z threat[/term:z_threat] by playing [zone:col1]column 1[/zone:col1]: after that move you were left with no major threats, while the better move in [zone:col6]column 6[/zone:col6] kept your major threat at [zone:windows:c1r3]1[/zone:windows:c1r3] instead of dropping it from [zone:windows:c1r3]1[/zone:windows:c1r3] to none. That mattered because you had the parity advantage — an odd vertical capsule — and the better move would have preserved it, keeping your pressure alive instead of handing back control.

---

### eval-59 — claimeven (sev 0)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 34  |  Next: Green

       1   2   3   4   5   6   7 
  6  |Gy |   |Gn |Gy |Gy |Gn |   |
  5  |Gy |   |Gn |Gn |Gn |Gy |   |
  4  |Gn |   |Gn |Gy |Gy |Gn |   |
  3  |Gn |   |Gy |Gy |Gn |Gy |Gn |
  2  |Gy |   |Gn |Gn |Gy |Gy |Gy |
  1  |Gn |Gy |Gy |Gn |Gn |Gn |Gy |

        1      2      3      4      5      6      7   
  6  | Gy32 |      | Gn21 | Gy28 | Gy12 | Gn31 | [Gy] |
  5  | Gy30 | [Gn] | Gn17 | Gn25 | Gn11 | Gy20 | [Gn] |
  4  | Gn29 |      | Gn13 | Gy24 | Gy10 | Gn19 |      |
  3  | Gn27 | [Gn] | Gy 6 | Gy16 | Gn 9 | Gy18 | Gn33 |
  2  | Gy26 |      | Gn 5 | Gn15 | Gy 2 | Gy14 | Gy22 |
  1  | Gn23 | Gy34 | Gy 4 | Gn 7 | Gn 1 | Gn 3 | Gy 8 |

  ht |   6  |   1  |   6  |   6  |   6  |   6  |   3  |  (discs in column)
 par |  0E  |  5O  |  0E  |  0E  |  0E  |  0E  |  3O  |  (empty cells: O=odd E=even)
  Major threats: col2 row3 (Gn)   col2 row5 (Gn)   col7 row5 (Gn)   col7 row6 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 35  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |Gy |   |Gn |Gy |Gy |Gn |   |
  5  |Gy |   |Gn |Gn |Gn |Gy |   |
  4  |Gn |   |Gn |Gy |Gy |Gn |Gn |
  3  |Gn |   |Gy |Gy |Gn |Gy |Gn |
  2  |Gy |   |Gn |Gn |Gy |Gy |Gy |
  1  |Gn |Gy |Gy |Gn |Gn |Gn |Gy |

        1      2      3      4      5      6      7   
  6  | Gy32 |      | Gn21 | Gy28 | Gy12 | Gn31 | [Gy] |
  5  | Gy30 | [Gn] | Gn17 | Gn25 | Gn11 | Gy20 | <Gn> |
  4  | Gn29 |      | Gn13 | Gy24 | Gy10 | Gn19 | Gn35 |
  3  | Gn27 | [Gn] | Gy 6 | Gy16 | Gn 9 | Gy18 | Gn33 |
  2  | Gy26 |      | Gn 5 | Gn15 | Gy 2 | Gy14 | Gy22 |
  1  | Gn23 | Gy34 | Gy 4 | Gn 7 | Gn 1 | Gn 3 | Gy 8 |

  ht |   6  |   1  |   6  |   6  |   6  |   6  |   4  |  (discs in column)
 par |  0E  |  5O  |  0E  |  0E  |  0E  |  0E  |  2E  |  (empty cells: O=odd E=even)
  Major threats: col2 row3 (Gn)   col2 row5 (Gn)   col7 row5 (Gn) [GT]   col7 row6 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 35  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |Gy |   |Gn |Gy |Gy |Gn |   |
  5  |Gy |   |Gn |Gn |Gn |Gy |   |
  4  |Gn |   |Gn |Gy |Gy |Gn |   |
  3  |Gn |   |Gy |Gy |Gn |Gy |Gn |
  2  |Gy |Gn |Gn |Gn |Gy |Gy |Gy |
  1  |Gn |Gy |Gy |Gn |Gn |Gn |Gy |

        1      2      3      4      5      6      7   
  6  | Gy32 |      | Gn21 | Gy28 | Gy12 | Gn31 | [Gy] |
  5  | Gy30 | [Gn] | Gn17 | Gn25 | Gn11 | Gy20 | [Gn] |
  4  | Gn29 |      | Gn13 | Gy24 | Gy10 | Gn19 |      |
  3  | Gn27 | <Gn> | Gy 6 | Gy16 | Gn 9 | Gy18 | Gn33 |
  2  | Gy26 | Gn35 | Gn 5 | Gn15 | Gy 2 | Gy14 | Gy22 |
  1  | Gn23 | Gy34 | Gy 4 | Gn 7 | Gn 1 | Gn 3 | Gy 8 |

  ht |   6  |   2  |   6  |   6  |   6  |   6  |   3  |  (discs in column)
 par |  0E  |  4E  |  0E  |  0E  |  0E  |  0E  |  3O  |  (empty cells: O=odd E=even)
  Major threats: col2 row3 (Gn) [GT]   col2 row5 (Gn)   col7 row5 (Gn)   col7 row6 (Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: small
- Move played: column 2
- Your move placed a disc on c2r2.
- Better move: column 7
- The better move places a disc on c7r4.
- Key insight: You gave Yellow a claimeven endgame — they now control the pairing.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing an actual count, copy the zone tag shown on that line and wrap the count with it; when a line shows "none", just say so in plain words (e.g. "no minor threats") with no tag. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your major threats: [zone:player-major-pre]3[/zone:player-major-pre]
- Your minor threats: none

After the best move (column 7):
- Your major threats: [zone:player-major-best]2[/zone:player-major-best]
- Your minor threats: [zone:player-minor-best]2[/zone:player-minor-best]

After the move played (column 2):
- Your major threats: [zone:player-major-played]2[/zone:player-major-played]
- Your minor threats: none

## Best-move tactical evidence
The following tactical patterns were present after the best move:
- immediate_threat: cells [c7r5]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col2]column 2[/zone:col2], [zone:col7]column 7[/zone:col7]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR threat cells: [c7r5]

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

## KB term definitions

The following tactical concepts apply to this position:

- [term:immediate_threat] **immediate threat** (immediate_threat): An immediate threat is a major threat whose empty cell is directly playable right now —
it is the topmost empty cell in its column (gravity-top). Playing there wins the game
on this move.
- [term:claimeven] **claimeven** (claimeven): A pair of vertically adjacent empty squares (lower odd, upper even) where the
zugzwang controller gets the upper even square at the cost of conceding the lower
odd one to the opponent. The most fundamental of Allis's nine rules.
- [term:major_threat] **major threat** (major_threat): A major threat is a four-cell window containing three of your discs and one empty cell.
If that empty cell is the next playable cell in its column (gravity-top), it wins the
game immediately; otherwise it is a latent threat that will become decisive as the
board fills.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

Your move in [zone:col2]column 2[/zone:col2] gave your opponent a [term:claimeven]claimeven[/term:claimeven] endgame, so they now control the pairing instead of you. The better play in [zone:col7]column 7[/zone:col7] would have kept your own pressure on [zone:c7r5]that cell[/zone:c7r5], and the threat counts show why it was cleaner: your major threats stayed at [zone:windows:c2r5|c7r5]2[/zone:windows:c2r5|c7r5] either way, but the better move also left you with [zone:windows:c7r5|c7r6]2[/zone:windows:c7r5|c7r6] minor threats, while your move left you with no minor threats.

---

### eval-61 — odd_even_threat (sev 2)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 10  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |Gn |   |   |   |
  3  |   |   |   |Gy |   |   |   |
  2  |   |   |Gy |Gy |   |Gn |   |
  1  |   |   |Gy |Gn |Gn |Gn |Gy |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      | (gn) |      |      | (gy) |      |
  4  |      |      | (gy) | Gn 5 | (gy) | (*)  |      |
  3  |      |      | (gy) | Gy 4 | (*)  | (gn) |      |
  2  | (gy) | (gy) | Gy10 | Gy 2 | (gy) | Gn 9 |      |
  1  |      | (gy) | Gy 6 | Gn 1 | Gn 3 | Gn 7 | Gy 8 |

  ht |   0  |   0  |   2  |   4  |   1  |   2  |   1  |  (discs in column)
 par |  6E  |  6E  |  4E  |  2E  |  5O  |  4E  |  5O  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 11  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |Gn |   |   |   |
  3  |   |   |Gn |Gy |   |   |   |
  2  |   |   |Gy |Gy |   |Gn |   |
  1  |   |   |Gy |Gn |Gn |Gn |Gy |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      | (gn) |      |
  5  |      |      | (gn) |      | (gn) | (gy) |      |
  4  |      |      |      | Gn 5 | (gy) | (*)  |      |
  3  |      |      | Gn11 | Gy 4 | (*)  | (gn) |      |
  2  | (gy) | (*)  | Gy10 | Gy 2 | (gy) | Gn 9 |      |
  1  | (gn) | (gy) | Gy 6 | Gn 1 | Gn 3 | Gn 7 | Gy 8 |

  ht |   0  |   0  |   3  |   4  |   1  |   2  |   1  |  (discs in column)
 par |  6E  |  6E  |  3O  |  2E  |  5O  |  4E  |  5O  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 11  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |Gn |   |   |   |
  4  |   |   |   |Gn |   |   |   |
  3  |   |   |   |Gy |   |   |   |
  2  |   |   |Gy |Gy |   |Gn |   |
  1  |   |   |Gy |Gn |Gn |Gn |Gy |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      | (gn) | Gn11 |      | (gy) |      |
  4  |      |      | (gy) | Gn 5 | (gy) | (*)  |      |
  3  |      |      | (gy) | Gy 4 | (*)  | (gn) |      |
  2  | (gy) | (gy) | Gy10 | Gy 2 | (gy) | Gn 9 |      |
  1  |      | (gy) | Gy 6 | Gn 1 | Gn 3 | Gn 7 | Gy 8 |

  ht |   0  |   0  |   2  |   5  |   1  |   2  |   1  |  (discs in column)
 par |  6E  |  6E  |  4E  |  1O  |  5O  |  4E  |  5O  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: moderate
- Move played: column 4
- Your move placed a disc on c4r5.
- Better move: column 3
- The better move places a disc on c3r3.
- Key insight: Your move gave Red threats on both row parities.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing an actual count, copy the zone tag shown on that line and wrap the count with it; when a line shows "none", just say so in plain words (e.g. "no minor threats") with no tag. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your minor threats: [zone:player-minor-pre]4[/zone:player-minor-pre]
- Opponent minor threats: [zone:opponent-minor-pre]10[/zone:opponent-minor-pre]

After the best move (column 3):
- Your minor threats: [zone:player-minor-best]8[/zone:player-minor-best]
- Opponent minor threats: [zone:opponent-minor-best]8[/zone:opponent-minor-best]

After the move played (column 4):
- Your minor threats: [zone:player-minor-played]4[/zone:player-minor-played]
- Opponent minor threats: [zone:opponent-minor-played]10[/zone:opponent-minor-played]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col4]column 4[/zone:col4], [zone:col3]column 3[/zone:col3]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR OPPONENT's threat cells: [c3r4, c3r1, c4r2, c3r3, c4r3]

## Tone
This move gave away a real advantage; explain the concrete consequence.

## KB term definitions

The following tactical concepts apply to this position:

- [term:odd_even_threat] **odd even threat** (odd_even_threat): An odd-even threat choice arises when the player can build toward a winning threat
in two columns — one landing on an odd row, one on an even row, neither yet playable.
The odd-row threat is always preferred because Yellow's claimeven strategy cannot
neutralise threats on odd rows.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

By playing [zone:col4]column 4[/zone:col4], you gave your opponent threats on both row parities at once: their minor-threat count stayed at [zone:windows:c1r2|c2r1|c2r2|c3r3|c3r4|c5r2|c5r3|c5r4|c6r4|c6r5]10[/zone:windows:c1r2|c2r1|c2r2|c3r3|c3r4|c5r2|c5r3|c5r4|c6r4|c6r5] instead of dropping, while the better move would have reduced them to [zone:windows:c1r2|c2r1|c2r2|c5r2|c5r3|c5r4|c6r4|c6r5]8[/zone:windows:c1r2|c2r1|c2r2|c5r2|c5r3|c5r4|c6r4|c6r5]. The missed idea was an [term:odd_even_threat]odd even threat[/term:odd_even_threat]: by playing [zone:col3]column 3[/zone:col3], you would have built your own plan while also cutting your opponent’s options, leaving you with [zone:windows:c1r1|c2r2|c3r5|c5r3|c5r5|c6r3|c6r4|c6r6]8[/zone:windows:c1r1|c2r2|c3r5|c5r3|c5r5|c6r3|c6r4|c6r6] minor threats rather than just [zone:windows:c3r5|c5r3|c6r3|c6r4]4[/zone:windows:c3r5|c5r3|c6r3|c6r4].

---

### eval-62 — claimeven (sev 0)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on EVEN rows (2,4,6).
Your opponent wins on ODD rows (1,3,5).

## Boards
### Before the move
Move 17  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |Gy |   |   |   |
  5  |   |   |Gn |Gn |   |   |   |
  4  |   |   |Gn |Gn |   |   |   |
  3  |   |   |Gy |Gn |   |   |   |
  2  |   |   |Gn |Gy |Gy |Gy |Gn |
  1  |   |   |Gy |Gn |Gn |Gy |Gy |

        1      2      3      4      5      6      7   
  6  | (gn) | (gn) |      | Gy12 | (gn) |      |      |
  5  | (*)  | (gn) | Gn13 | Gn11 | (gn) | (gn) |      |
  4  | (gn) | (*)  | Gn 9 | Gn 7 | (gn) | (*)  |      |
  3  |      | (gn) | Gy 8 | Gn 3 | (*)  | (*)  |      |
  2  | (gn) |      | Gn 5 | Gy 2 | Gy16 | Gy10 | Gn17 |
  1  |      | (gn) | Gy 4 | Gn 1 | Gn15 | Gy 6 | Gy14 |

  ht |   0  |   0  |   5  |   6  |   2  |   2  |   2  |  (discs in column)
 par |  6E  |  6E  |  1O  |  0E  |  4E  |  4E  |  4E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 18  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |Gy |   |   |   |
  5  |   |   |Gn |Gn |   |   |   |
  4  |   |   |Gn |Gn |   |   |   |
  3  |   |   |Gy |Gn |   |   |Gy |
  2  |   |   |Gn |Gy |Gy |Gy |Gn |
  1  |   |   |Gy |Gn |Gn |Gy |Gy |

        1      2      3      4      5      6      7   
  6  | (gn) | (gn) |      | Gy12 | (gn) |      |      |
  5  | (*)  | (gn) | Gn13 | Gn11 | (*)  | (gn) |      |
  4  | (gn) | (*)  | Gn 9 | Gn 7 | (gn) | (*)  |      |
  3  |      | (gn) | Gy 8 | Gn 3 | (*)  | (*)  | Gy18 |
  2  | (gn) |      | Gn 5 | Gy 2 | Gy16 | Gy10 | Gn17 |
  1  |      | (gn) | Gy 4 | Gn 1 | Gn15 | Gy 6 | Gy14 |

  ht |   0  |   0  |   5  |   6  |   2  |   2  |   3  |  (discs in column)
 par |  6E  |  6E  |  1O  |  0E  |  4E  |  4E  |  3O  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 18  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |Gy |   |   |   |
  5  |   |   |Gn |Gn |   |   |   |
  4  |   |   |Gn |Gn |   |   |   |
  3  |   |   |Gy |Gn |   |Gy |   |
  2  |   |   |Gn |Gy |Gy |Gy |Gn |
  1  |   |   |Gy |Gn |Gn |Gy |Gy |

        1      2      3      4      5      6      7   
  6  | (gn) | (gn) |      | Gy12 | (gn) |      |      |
  5  | (*)  | (gn) | Gn13 | Gn11 | (gn) | (*)  |      |
  4  | (gn) | (*)  | Gn 9 | Gn 7 | (gn) | <Gy> |      |
  3  |      | (gn) | Gy 8 | Gn 3 | (*)  | Gy18 |      |
  2  | (gn) |      | Gn 5 | Gy 2 | Gy16 | Gy10 | Gn17 |
  1  |      | (gn) | Gy 4 | Gn 1 | Gn15 | Gy 6 | Gy14 |

  ht |   0  |   0  |   5  |   6  |   2  |   3  |   2  |  (discs in column)
 par |  6E  |  6E  |  1O  |  0E  |  4E  |  3O  |  4E  |  (empty cells: O=odd E=even)
  Major threats: col6 row4 (Gy) [GT]

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gy = your discs, Gn = your opponent's discs.

## Move context
- Your winning rows: EVEN (2,4,6)
- Eval gap: small
- Move played: column 6
- Your move placed a disc on c6r3.
- Better move: column 7
- The better move places a disc on c7r3.
- Key insight: You had a claimeven endgame — the pairing was yours — and threw it away.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing an actual count, copy the zone tag shown on that line and wrap the count with it; when a line shows "none", just say so in plain words (e.g. "no minor threats") with no tag. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your minor threats: [zone:player-minor-pre]5[/zone:player-minor-pre]
- Opponent minor threats: [zone:opponent-minor-pre]16[/zone:opponent-minor-pre]

After the best move (column 7):
- Your minor threats: [zone:player-minor-best]6[/zone:player-minor-best]
- Opponent minor threats: [zone:opponent-minor-best]16[/zone:opponent-minor-best]

After the move played (column 6):
- Your minor threats: [zone:player-minor-played]4[/zone:player-minor-played]
- Opponent minor threats: [zone:opponent-minor-played]15[/zone:opponent-minor-played]

## Best-move tactical evidence
The following tactical patterns were present after the best move:
- claimeven (position-level pattern)

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
Column numbers (1–7) are always valid to reference — they appear in every board header.
Only omit specific CELL references (e.g. c4r3) if the cell is not listed in the boards above.

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

## KB term definitions

The following tactical concepts apply to this position:

- [term:immediate_threat] **immediate threat** (immediate_threat): An immediate threat is a major threat whose empty cell is directly playable right now —
it is the topmost empty cell in its column (gravity-top). Playing there wins the game
on this move.
- [term:claimeven] **claimeven** (claimeven): A pair of vertically adjacent empty squares (lower odd, upper even) where the
zugzwang controller gets the upper even square at the cost of conceding the lower
odd one to the opponent. The most fundamental of Allis's nine rules.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

You had a [term:claimeven]claimeven[/term:claimeven] endgame available, and by playing [zone:col6]column 6[/zone:col6] you threw away that pairing on the even row structure you needed. The better move in [zone:col7]column 7[/zone:col7] would have kept that claimeven idea intact while leaving you with more minor threats: [zone:windows:c1r5|c2r4|c5r3|c6r3|c6r4]5[/zone:windows:c1r5|c2r4|c5r3|c6r3|c6r4] before, [zone:windows:c1r5|c2r4|c5r3|c5r5|c6r3|c6r4]6[/zone:windows:c1r5|c2r4|c5r3|c5r5|c6r3|c6r4] after the better move, but only [zone:windows:c1r5|c2r4|c5r3|c6r4]4[/zone:windows:c1r5|c2r4|c5r3|c6r4] after your move.

---

### eval-63 — claimeven (sev 0)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 28  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |Gy |Gy |   |   |   |
  5  |   |Gn |Gn |Gn |   |Gy |   |
  4  |   |Gn |Gn |Gy |   |Gn |   |
  3  |   |Gy |Gn |Gn |   |Gy |   |
  2  |Gn |Gn |Gy |Gy |Gy |Gn |Gy |
  1  |Gy |Gn |Gy |Gn |Gn |Gy |Gy |

        1      2      3      4      5      6      7   
  6  | [Gn] | (gy) | Gy26 | Gy12 | (gy) | (gy) |      |
  5  | [Gn] | Gn19 | Gn25 | Gn 5 | [Gn] | Gy18 |      |
  4  |      | Gn17 | Gn23 | Gy 4 |      | Gn11 | (gy) |
  3  |      | Gy16 | Gn21 | Gn 3 |      | Gy10 | (gy) |
  2  | Gn27 | Gn15 | Gy20 | Gy 2 | Gy24 | Gn 9 | Gy28 |
  1  | Gy 6 | Gn13 | Gy14 | Gn 1 | Gn 7 | Gy 8 | Gy22 |

  ht |   2  |   5  |   6  |   6  |   2  |   5  |   2  |  (discs in column)
 par |  4E  |  1O  |  0E  |  0E  |  4E  |  1O  |  4E  |  (empty cells: O=odd E=even)
  Major threats: col1 row5 (Gn)   col1 row6 (Gn)   col5 row5 (Gn)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 29  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |Gy |Gy |   |   |   |
  5  |   |Gn |Gn |Gn |   |Gy |   |
  4  |   |Gn |Gn |Gy |   |Gn |   |
  3  |Gn |Gy |Gn |Gn |   |Gy |   |
  2  |Gn |Gn |Gy |Gy |Gy |Gn |Gy |
  1  |Gy |Gn |Gy |Gn |Gn |Gy |Gy |

        1      2      3      4      5      6      7   
  6  | [Gn] | (gy) | Gy26 | Gy12 | (gy) | (gy) |      |
  5  | [Gn] | Gn19 | Gn25 | Gn 5 | [Gn] | Gy18 |      |
  4  | (gn) | Gn17 | Gn23 | Gy 4 |      | Gn11 | (gy) |
  3  | Gn29 | Gy16 | Gn21 | Gn 3 |      | Gy10 | (gy) |
  2  | Gn27 | Gn15 | Gy20 | Gy 2 | Gy24 | Gn 9 | Gy28 |
  1  | Gy 6 | Gn13 | Gy14 | Gn 1 | Gn 7 | Gy 8 | Gy22 |

  ht |   3  |   5  |   6  |   6  |   2  |   5  |   2  |  (discs in column)
 par |  3O  |  1O  |  0E  |  0E  |  4E  |  1O  |  4E  |  (empty cells: O=odd E=even)
  Major threats: col1 row5 (Gn)   col1 row6 (Gn)   col5 row5 (Gn)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 29  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |Gn |Gy |Gy |   |   |   |
  5  |   |Gn |Gn |Gn |   |Gy |   |
  4  |   |Gn |Gn |Gy |   |Gn |   |
  3  |   |Gy |Gn |Gn |   |Gy |   |
  2  |Gn |Gn |Gy |Gy |Gy |Gn |Gy |
  1  |Gy |Gn |Gy |Gn |Gn |Gy |Gy |

        1      2      3      4      5      6      7   
  6  | [Gn] | Gn29 | Gy26 | Gy12 | (gy) | (gy) |      |
  5  | [Gn] | Gn19 | Gn25 | Gn 5 | [Gn] | Gy18 |      |
  4  |      | Gn17 | Gn23 | Gy 4 |      | Gn11 | (gy) |
  3  |      | Gy16 | Gn21 | Gn 3 |      | Gy10 | (gy) |
  2  | Gn27 | Gn15 | Gy20 | Gy 2 | Gy24 | Gn 9 | Gy28 |
  1  | Gy 6 | Gn13 | Gy14 | Gn 1 | Gn 7 | Gy 8 | Gy22 |

  ht |   2  |   6  |   6  |   6  |   2  |   5  |   2  |  (discs in column)
 par |  4E  |  0E  |  0E  |  0E  |  4E  |  1O  |  4E  |  (empty cells: O=odd E=even)
  Major threats: col1 row5 (Gn)   col1 row6 (Gn)   col5 row5 (Gn)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: small
- Move played: column 2
- Your move placed a disc on c2r6.
- Better move: column 1
- The better move places a disc on c1r3.
- Key insight: You gave Yellow a claimeven endgame — they now control the pairing.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing an actual count, copy the zone tag shown on that line and wrap the count with it; when a line shows "none", just say so in plain words (e.g. "no minor threats") with no tag. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your minor threats: none
- Opponent minor threats: [zone:opponent-minor-pre]6[/zone:opponent-minor-pre]

After the best move (column 1):
- Your minor threats: [zone:player-minor-best]2[/zone:player-minor-best]
- Opponent minor threats: [zone:opponent-minor-best]6[/zone:opponent-minor-best]

After the move played (column 2):
- Your minor threats: none
- Opponent minor threats: [zone:opponent-minor-played]4[/zone:opponent-minor-played]

## Best-move tactical evidence
The following tactical patterns were present after the best move:
- figure_7: cells [c4r3, c3r4, c4r5, c3r5, c2r5]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col2]column 2[/zone:col2], [zone:col1]column 1[/zone:col1]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR threat cells: [c4r3, c3r4, c4r5, c3r5, c2r5]

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

## KB term definitions

The following tactical concepts apply to this position:

- [term:figure_7] **figure 7** (figure_7): A five-disc "7"-shaped configuration that generates two major threats in the same
column; the opponent cannot block both because one is above gravity, making it a
zugzwang trap rather than a direct fork.
- [term:claimeven] **claimeven** (claimeven): A pair of vertically adjacent empty squares (lower odd, upper even) where the
zugzwang controller gets the upper even square at the cost of conceding the lower
odd one to the opponent. The most fundamental of Allis's nine rules.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

By playing in [zone:col2]column 2[/zone:col2], you gave your opponent a [term:claimeven]claimeven[/term:claimeven] endgame there and let them keep control of the pairing, while also giving up the [term:figure_7]figure 7[/term:figure_7] shape centered on [zone:cells:c4r3,c3r4,c4r5,c3r5,c2r5]the key cluster[/zone:cells:c4r3,c3r4,c4r5,c3r5,c2r5]. The better move in [zone:col1]column 1[/zone:col1] would have placed your disc on [zone:c1r3]that cell[/zone:c1r3], preserving your own setup: you would have kept your minor threat instead of having none, while your opponent still only had [zone:windows:c1r6|c2r6|c5r6|c6r6|c7r3|c7r4]6[/zone:windows:c1r6|c2r6|c5r6|c6r6|c7r3|c7r4] rather than the more comfortable [zone:windows:c5r6|c6r6|c7r3|c7r4]4[/zone:windows:c5r6|c6r6|c7r3|c7r4] after your move.

---

### eval-64 — z_threat (sev 0)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 28  |  Next: Green

       1   2   3   4   5   6   7 
  6  |Gy |   |   |Gy |Gy |Gy |   |
  5  |Gy |   |   |Gy |Gn |Gn |   |
  4  |Gn |   |   |Gy |Gn |Gn |Gn |
  3  |Gn |   |   |Gn |Gn |Gy |Gy |
  2  |Gn |   |   |Gy |Gy |Gn |Gy |
  1  |Gy |   |   |Gn |Gy |Gn |Gn |

        1      2      3      4      5      6      7   
  6  | Gy28 | (gy) | [Gy] | Gy14 | Gy16 | Gy20 | [*]  |
  5  | Gy26 | (gy) | (gy) | Gy12 | Gn15 | Gn19 |      |
  4  | Gn25 | (gy) | (gy) | Gy 4 | Gn13 | Gn 9 | Gn27 |
  3  | Gn23 | (*)  | (*)  | Gn 3 | Gn11 | Gy 8 | Gy24 |
  2  | Gn21 | (gy) | [Gn] | Gy 2 | Gy10 | Gn 7 | Gy22 |
  1  | Gy18 | (gn) |      | Gn 1 | Gy 6 | Gn 5 | Gn17 |

  ht |   6  |   0  |   0  |   6  |   6  |   6  |   4  |  (discs in column)
 par |  0E  |  6E  |  6E  |  0E  |  0E  |  0E  |  2E  |  (empty cells: O=odd E=even)
  Major threats: col3 row2 (Gn)   col3 row6 (Gy)   col7 row6 (Gn+Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 29  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |Gy |   |   |Gy |Gy |Gy |   |
  5  |Gy |   |   |Gy |Gn |Gn |   |
  4  |Gn |   |   |Gy |Gn |Gn |Gn |
  3  |Gn |   |   |Gn |Gn |Gy |Gy |
  2  |Gn |   |   |Gy |Gy |Gn |Gy |
  1  |Gy |Gn |   |Gn |Gy |Gn |Gn |

        1      2      3      4      5      6      7   
  6  | Gy28 | (gy) | [Gy] | Gy14 | Gy16 | Gy20 | [*]  |
  5  | Gy26 | (gy) | (gy) | Gy12 | Gn15 | Gn19 |      |
  4  | Gn25 | (gy) | (gy) | Gy 4 | Gn13 | Gn 9 | Gn27 |
  3  | Gn23 | (*)  | (*)  | Gn 3 | Gn11 | Gy 8 | Gy24 |
  2  | Gn21 | (gy) | [Gn] | Gy 2 | Gy10 | Gn 7 | Gy22 |
  1  | Gy18 | Gn29 |      | Gn 1 | Gy 6 | Gn 5 | Gn17 |

  ht |   6  |   1  |   0  |   6  |   6  |   6  |   4  |  (discs in column)
 par |  0E  |  5O  |  6E  |  0E  |  0E  |  0E  |  2E  |  (empty cells: O=odd E=even)
  Major threats: col3 row2 (Gn)   col3 row6 (Gy)   col7 row6 (Gn+Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 29  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |Gy |   |   |Gy |Gy |Gy |   |
  5  |Gy |   |   |Gy |Gn |Gn |   |
  4  |Gn |   |   |Gy |Gn |Gn |Gn |
  3  |Gn |   |   |Gn |Gn |Gy |Gy |
  2  |Gn |   |   |Gy |Gy |Gn |Gy |
  1  |Gy |   |Gn |Gn |Gy |Gn |Gn |

        1      2      3      4      5      6      7   
  6  | Gy28 | (gy) | [Gy] | Gy14 | Gy16 | Gy20 | [*]  |
  5  | Gy26 | (gy) | (gy) | Gy12 | Gn15 | Gn19 |      |
  4  | Gn25 | (gy) | (gy) | Gy 4 | Gn13 | Gn 9 | Gn27 |
  3  | Gn23 | (*)  | (*)  | Gn 3 | Gn11 | Gy 8 | Gy24 |
  2  | Gn21 | (gy) | <Gn> | Gy 2 | Gy10 | Gn 7 | Gy22 |
  1  | Gy18 | (gn) | Gn29 | Gn 1 | Gy 6 | Gn 5 | Gn17 |

  ht |   6  |   0  |   1  |   6  |   6  |   6  |   4  |  (discs in column)
 par |  0E  |  6E  |  5O  |  0E  |  0E  |  0E  |  2E  |  (empty cells: O=odd E=even)
  Major threats: col3 row2 (Gn) [GT]   col3 row6 (Gy)   col7 row6 (Gn+Gy)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: small
- Move played: column 3
- Your move placed a disc on c3r1.
- Better move: column 2
- The better move places a disc on c2r1.
- Key insight: Your move handed your opponent the parity advantage.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing an actual count, copy the zone tag shown on that line and wrap the count with it; when a line shows "none", just say so in plain words (e.g. "no minor threats") with no tag. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your major threats: [zone:player-major-pre]2[/zone:player-major-pre]

After the best move (column 2):
- Your major threats: [zone:player-major-best]2[/zone:player-major-best]

After the move played (column 3):
- Your major threats: [zone:player-major-played]1[/zone:player-major-played]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col3]column 3[/zone:col3], [zone:col2]column 2[/zone:col2]

(no specific cell references — use the allowed columns above and describe patterns in general terms)

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

## KB term definitions

The following tactical concepts apply to this position:

- [term:immediate_threat] **immediate threat** (immediate_threat): An immediate threat is a major threat whose empty cell is directly playable right now —
it is the topmost empty cell in its column (gravity-top). Playing there wins the game
on this move.
- [term:z_threat] **z threat** (z_threat): A Z-Threat is a major threat where the count of empty cells from column height to
the threat row is odd, letting the owner toggle zugzwang control.
- [term:major_threat] **major threat** (major_threat): A major threat is a four-cell window containing three of your discs and one empty cell.
If that empty cell is the next playable cell in its column (gravity-top), it wins the
game immediately; otherwise it is a latent threat that will become decisive as the
board fills.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

You gave away [term:z_threat]z threat[/term:z_threat] control in [zone:col3]column 3[/zone:col3]: the stronger choice was to play [zone:col2]column 2[/zone:col2], which kept your major threats at [zone:windows:c3r2|c7r6]2[/zone:windows:c3r2|c7r6], while your played move left you with only [zone:windows:c7r6]1[/zone:windows:c7r6]. By taking [zone:col3]column 3[/zone:col3], you also handed your opponent the parity advantage, so the better move would have preserved more of your pressure and kept your opponent less comfortable in the fight over that column.

---

### eval-65 — odd_even_threat (sev 0)
**Full prompt:**

```
## Role
You are a Connect Four coach explaining why a move was a mistake and what the better move would have accomplished.

**Language rule:** Never use these internal technical terms: forced_win (the internal slug — writing "forced win" in plain language is fine), losing_position, leaf, leaf position, leaf board, simulation, pattern data, pattern comparison, solver, score, terse_reason, matched_direction, tag, direction. Describe only what you can see on the boards above. Address the player as "you" / "your". Refer to the other player as "your opponent". Do not use any player names such as "Gray" or "Green".

## Players
You win by completing a line on ODD rows (1,3,5).
Your opponent wins on EVEN rows (2,4,6).

## Boards
### Before the move
Move 10  |  Next: Green

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |Gy |Gy |   |   |
  3  |   |   |   |Gn |Gn |   |   |
  2  |   |   |   |Gn |Gy |   |   |
  1  |   |Gy |   |Gn |Gn |Gy |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      | (gn) |
  4  |      | (*)  | (gy) | Gy10 | Gy 6 | (*)  | (gy) |
  3  |      | (gn) | (gn) | Gn 9 | Gn 5 | (gn) | (gn) |
  2  |      |      |      | Gn 7 | Gy 2 |      |      |
  1  |      | Gy 8 | (gn) | Gn 3 | Gn 1 | Gy 4 |      |

  ht |   0  |   1  |   0  |   4  |   4  |   1  |   0  |  (discs in column)
 par |  6E  |  5O  |  6E  |  2E  |  2E  |  5O  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the best move
Move 11  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |Gy |Gy |   |   |
  3  |   |   |   |Gn |Gn |   |   |
  2  |   |   |   |Gn |Gy |   |   |
  1  |   |Gy |Gn |Gn |Gn |Gy |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      | (gn) |
  4  |      | (*)  | (gy) | Gy10 | Gy 6 | [Gn] | (gy) |
  3  |      | (gn) | (gn) | Gn 9 | Gn 5 | (gn) | (gn) |
  2  |      |      |      | Gn 7 | Gy 2 |      |      |
  1  |      | Gy 8 | Gn11 | Gn 3 | Gn 1 | Gy 4 |      |

  ht |   0  |   1  |   1  |   4  |   4  |   1  |   0  |  (discs in column)
 par |  6E  |  5O  |  5O  |  2E  |  2E  |  5O  |  6E  |  (empty cells: O=odd E=even)
  Major threats: col6 row4 (Gn)

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

### After the move played
Move 11  |  Next: Gray

       1   2   3   4   5   6   7 
  6  |   |   |   |   |   |   |   |
  5  |   |   |   |   |   |   |   |
  4  |   |   |   |Gy |Gy |   |   |
  3  |   |   |   |Gn |Gn |   |   |
  2  |   |   |   |Gn |Gy |   |   |
  1  |Gn |Gy |   |Gn |Gn |Gy |   |

        1      2      3      4      5      6      7   
  6  |      |      |      |      |      |      |      |
  5  |      |      |      |      |      |      | (gn) |
  4  |      | (*)  | (gy) | Gy10 | Gy 6 | (*)  | (gy) |
  3  |      | (gn) | (gn) | Gn 9 | Gn 5 | (gn) | (gn) |
  2  |      |      |      | Gn 7 | Gy 2 |      |      |
  1  | Gn11 | Gy 8 | (gn) | Gn 3 | Gn 1 | Gy 4 |      |

  ht |   1  |   1  |   0  |   4  |   4  |   1  |   0  |  (discs in column)
 par |  5O  |  5O  |  6E  |  2E  |  2E  |  5O  |  6E  |  (empty cells: O=odd E=even)
  Major threats: none

  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)
          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list
          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column

Note: In the board, Gn = your discs, Gy = your opponent's discs.

## Move context
- Your winning rows: ODD (1,3,5)
- Eval gap: small
- Move played: column 1
- Your move placed a disc on c1r1.
- Better move: column 3
- The better move places a disc on c3r1.
- Key insight: There was a stronger move — this one gives ground.

## Threat comparison

Note: the three snapshots below are parallel states, not a time sequence. Use them to compare what each move choice left behind relative to the pre-move baseline — never say threats "increased" or "jumped". When citing an actual count, copy the zone tag shown on that line and wrap the count with it; when a line shows "none", just say so in plain words (e.g. "no minor threats") with no tag. Threat rows are included only when they differ meaningfully between the two moves — do not write a threat comparison for any metric not shown below.

Before the move:
- Your major threats: none
- Your minor threats: [zone:player-minor-pre]8[/zone:player-minor-pre]

After the best move (column 3):
- Your major threats: [zone:player-major-best]1[/zone:player-major-best]
- Your minor threats: [zone:player-minor-best]5[/zone:player-minor-best]

After the move played (column 1):
- Your major threats: none
- Your minor threats: [zone:player-minor-played]8[/zone:player-minor-played]

## Best-move tactical evidence
The following tactical patterns were present after the best move:
- j_shape: cells [c5r1, c4r2, c5r3, c4r3]

## Hard grounding rules
Threat ownership: a threat or winning line is YOURS only if its cells carry your disc glyph on the boards, it is listed under a "Your …" threat row, or it appears under "YOUR threat cells" below. It is your OPPONENT's only if marked with their glyph, listed under an "Opponent …" row, or under "YOUR OPPONENT's threat cells" below. Never infer or guess ownership — if the boards above do not show whose threat a cell is, describe the cell without claiming an owner.
You may reference these columns using zone tags:
[zone:col1]column 1[/zone:col1], [zone:col3]column 3[/zone:col3]

### Strategic reference cells
These cells are tactical reference points for your explanation. Each group is labeled with who owns the threat on those cells — attribute them exactly as labeled and never flip ownership.
- YOUR threat cells: [c5r1, c4r2, c5r3, c4r3]

## Tone
This was a minor inaccuracy; frame it gently, not as a severe blunder.

## KB term definitions

The following tactical concepts apply to this position:

- [term:j_shape] **j shape** (j_shape): A four-disc L-shaped Red cluster generating three simultaneous minor threats that
is equivalent to a major odd-row threat; the opponent cannot block all three paths.
- [term:major_threat] **major threat** (major_threat): A major threat is a four-cell window containing three of your discs and one empty cell.
If that empty cell is the next playable cell in its column (gravity-top), it wins the
game immediately; otherwise it is a latent threat that will become decisive as the
board fills.
- [term:minor_threat] **minor threat** (minor_threat): A minor threat is a four-cell window with two of your discs and two empty cells.
It is a longer-range setup — two moves away from completing four-in-a-row — and
signals a developing plan rather than an immediate danger.

## Output format
When referencing specific board locations, wrap each reference in zone tags with opening and closing brackets.
The display text inside the tags MUST use natural language — never raw coordinates like c4r3 or col5 (those belong ONLY in the opening tag's spec).

Syntax (use EXACTLY these patterns):
  [zone:colN]column N[/zone:colN] — for a column (N = column number 1–7). Example: [zone:col3]column 3[/zone:col3]
  [zone:cNrM]that cell[/zone:cNrM] — for a single cell. Example: [zone:c5r2]that cell[/zone:c5r2]
  [zone:cells:c1r2,c2r3]the threat cluster[/zone:cells] — for multiple cells (closing tag is ALWAYS [/zone:cells], no cell list)
  [zone:rowN]row N[/zone:rowN] — for an entire row. Example: [zone:row3]row 3[/zone:row3]

IMPORTANT: Use "col" (3 letters), NOT "column". Write [zone:col3], never [zone:column 3].
IMPORTANT: For colN/cNrM/rowN tags the closing tag MUST repeat the spec: [zone:col3]...[/zone:col3].
IMPORTANT: For cells tags the closing tag is ALWAYS [/zone:cells] — never repeat the cell list in the closing tag.

When mentioning a tactical concept that appears in the KB term definitions above, wrap it in term tags:
  [term:CONCEPT_ID]concept name[/term:CONCEPT_ID] — for a KB-defined term. Replace CONCEPT_ID with the exact kbId from the KB term definitions.
  CRITICAL: Only use [term:ID] when the ID appears VERBATIM in the KB term definitions section above. Never invent a [term:ID] tag for any slug (underscored or hyphenated) not listed there — write those concepts in plain text instead.
  Use the MOST SPECIFIC term that applies: e.g. if a move wins in one play, prefer [term:immediate_threat] over the more general [term:major_threat].

When you write an actual major or minor threat count, do not write a bare number — copy the opening zone tag exactly as it appears on that line in the threat comparison section (e.g. [zone:player-major-pre] or [zone:player-minor-pre]), write the count, then write the matching closing tag (e.g. [/zone:player-major-pre] or [/zone:player-minor-pre]). Exception: if a line shows "none", describe it in plain words (e.g. "left you with no minor threats") — do NOT write a count and do NOT add any zone tag, and never use [zone:tg] or any other invented tag.
Only tag EXPLICIT spatial references. Do not tag abstract concepts.
Use column numbers as they appear in the boards above (1-indexed, row 1 = bottom).

## Task
In 2–3 sentences: explain the mistake using the key insight above as your starting point.
Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above). Say what the better move would have accomplished.
When describing the better move, always frame it as what YOU could have played — never describe it as an easy reply or opportunity for your opponent.
If the threat comparison section includes major or minor threat rows, include a comparison in your explanation using those counts — replace every threat count with its zone tag token from the threat comparison. The rows show three parallel states (pre-move, after the better move, after your move); read them in whichever direction the position calls for. The better move is not always the one with MORE threats — sometimes YOUR move is the one that created a threat, and the point is that it was still the weaker choice. Examples: "the best move would have cut your opponent's major threats from [zone:opponent-major-pre]3[/zone:opponent-major-pre] to [zone:opponent-major-best]1[/zone:opponent-major-best]; your move left them at [zone:opponent-major-played]2[/zone:opponent-major-played]"; or "even though your move created a minor threat ([zone:player-minor-played]1[/zone:player-minor-played]), the better move left you with no minor threats and was still stronger because …". A line that shows "none" carries no tag — say "no minor threats" in plain words, never wrap a zero. If no major or minor threat rows appear, do not write a threat comparison.
If no threat comparison rows are shown and no tactical pattern is named above, give the concrete STRATEGIC reason the better move is preferable — for example it keeps more of the board open and creates more future possibilities, takes more central control, or loses more slowly under best play. Do NOT pad the explanation by merely restating where each disc landed ("would have put your disc on that cell"): naming a landing square is not a reason. Do not invent a tactical pattern or claim a threat the boards do not show.
Do not use internal tag names or direction labels.
```

**Final response:**

By playing [zone:col1]column 1[/zone:col1], you gave up the [term:j_shape]j shape[/term:j_shape] idea that was sitting after [zone:col3]column 3[/zone:col3]: the better move would have put your disc on [zone:c3r1]that cell[/zone:c3r1] and kept the cluster at [zone:cells:c5r1,c4r2,c5r3,c4r3]the threat cluster[/zone:cells:c5r1,c4r2,c5r3,c4r3] intact. That stronger move left you with [zone:windows:c6r4]1[/zone:windows:c6r4] major threat and [zone:windows:c2r3|c2r4|c3r3|c6r3|c7r3]5[/zone:windows:c2r3|c2r4|c3r3|c6r3|c7r3] minor threats, while your played move left you with no major threats and [zone:windows:c2r3|c2r4|c3r1|c3r3|c6r3|c6r4|c7r3|c7r5]8[/zone:windows:c2r3|c2r4|c3r1|c3r3|c6r3|c6r4|c7r3|c7r5] minor threats.

---

