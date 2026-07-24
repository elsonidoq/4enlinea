# Lesson Content Critique — 2026-07-22

**Scope:** all 13 lessons in `connect-four/lessons/`, English and Spanish, each lesson individually and the set as a whole.
**Axes (as requested):** 1. Factuality (vs `docs/knowledge-base/`), 2. Completeness (vs the deep-reveal feature vector), 3. Pedagogic order, 4. Coherence (does the language match what the player actually sees on the board).
**Bar:** content someone would pay for, alongside deep reveals.

**Method.** Every claim below was verified at source, not recalled:

- Rendering semantics read from code: `src/lib/movestring.js` (`boardToSpec`: internal `'red'`/P1 → spec letter `g` → **GREEN** disc; `'yellow'`/P2 → `d` → **GRAY** disc), `src/components/Board.jsx:353-371` (overlay rendering: `win` = pulsing ring, `tg` = green dot, `td` = gray dot, `claim` = amber dot), `src/screens/ConceptScreen.jsx` (boards render as authored; no perspective flip), `src/screens/SocraticScreen.jsx:90` (the learner's disc color = movestring parity — `userPerspective` is **not** consulted), and `SocraticScreen` renders only `socratic.messages.*` — **`socratic.goalPrompt` is never shown to the learner** (it appears only in the admin editor, `src/components/admin/SocraticEditor.jsx`).
- Every slide/socratic/challenge movestring was run through `./visualize_board.sh` (solver scores quoted below are from those runs, from the perspective of the player to move).
- Strategy claims checked against the KB entries: `allis-claimeven`, `community-z-threat`, `community-figure-7`, `allen-j-configuration`, `allen-t2`/`t4`/`t5`, `derived-parity-formula`, and the solver-verified opening entries (README §2026-07-04 corrections).
- Deep-reveal concept inventory taken from the live reason-engine path (`reason_engine/reasonEngine.mjs` → `reasonNarratorVector.mjs` → grounded render) and the term surfaces (`reason_engine/zoneAnnotations.mjs:28-33` `TERM_KB`; `server/llmCoachHelpers.js` `PATTERN_KB`; `src/lib/kbTermLesson.js` `KB_TERM_LESSON`).

---

## Executive summary

**Verdict: not sellable in its current state.** The lesson *architecture* is genuinely good (slides → socratic check → confirmation challenges, legends, narration, per-field ES fallback), and the three newest lessons (07, 08, 13) show the achievable bar: solver-verified positions, correct color language, honest claims. But:

1. **Six of thirteen lessons ship authoring placeholders instead of content.** Lessons 05, 06, 09, 10, 11, 12 contain literal `<board instructions>…</board instructions>` text in user-visible `infoProse`. Five of them (05, 09, 10, 11, 12) have **entirely empty boards** on every slide *and* in the socratic; lesson 06 reuses one board for all four slides while the narration describes three different boards. Four of these six (09–12) are the **paid** lessons (`"free": false`). A paying user currently receives blank boards plus raw authoring notes.
2. **Solver-refuted teaching content.** Several boards teach moves the solver refutes, including a socratic where the "correct" answer is praised and then loses by force (details in L02, L03, L05, L11 below).
3. **Systematic green/gray swaps and perspective confusion.** Multiple coach messages name the wrong color for what is highlighted; "User threat" legends mark the *opponent's* discs; lessons whose `userPerspective` is gray address green as "you".
4. **The parity backbone is the weakest link.** Deep reveals lean hardest on parity/zugzwang concepts (see Part 3), and the three lessons that carry that weight (04, 05, 06) contain a false rule (L04), a self-contradiction between lessons (L04 vs L05), an inverted mechanism vs the KB (L06), and 0-indexed row language that contradicts both the app's 1-based display convention and the lessons' own displayed titles.

Severity legend used below: **[P0]** blocks charging money · **[P1]** factual/coherence error a paying user would notice · **[P2]** quality/consistency issue · **[P3]** polish.

---

## Part 0 — Rendering ground truth (what the player actually sees)

For every finding below, this is the reference:

| Authoring token | On screen |
|---|---|
| boardSpec `g` (internal `'red'`, P1, moves first) | **GREEN disc** |
| boardSpec `d` (internal `'yellow'`, P2) | **GRAY disc** |
| overlay `tg` | green dot on a cell |
| overlay `td` | gray dot on a cell |
| overlay `claim` | amber dot |
| overlay `win` | pulsing ring |
| Socratic: learner's disc | color of the side to move by movestring parity (`SocraticScreen.jsx:90`) — `userPerspective` is ignored |
| Rows/columns shown to users | app-wide convention is **1-based** display (project `CLAUDE.md`, "Row/column coordinate convention") |

---

## Part 1 — Cross-cutting findings

### X1 [P0] — Placeholder lessons shipped as content

`infoProse` beginning with `<board instructions>` and empty/recycled `boardSpec`s:

| Lesson | Paid? | Slides with placeholder prose | Boards |
|---|---|---|---|
| 05 Claimeven | free | 4 of 4 | all four slides **empty board**; socratic **empty board** with `correctCol: 3` |
| 06 Z-Threats | free | 4 of 4 | one board recycled across all 4 slides + socratic; matches only slide 4's narrative |
| 09 The Undercut | **paid** | 4 of 4 | all empty; socratic empty, `correctCol: 2` |
| 10 The Overcut | **paid** | 4 of 4 | all empty; socratic empty, `correctCol: 3` |
| 11 Figure-7 Trap | **paid** | 4 of 4 | all empty; socratic empty, `correctCol: 4` |
| 12 J-Shape | **paid** | 4 of 4 | all empty; socratic empty, `correctCol: 2` |

Consequences the user experiences:

- The coach narrates threats, gaps, and shapes over an **empty board** ("Gray has a threat up in that column…" — there is no column to look at).
- The socratic screens for 05/09–12 ask the learner to click a column on an empty board; any click on the magic column gets "Exactly! You saw it." In lesson 05 the learner is supposed to be Gray practicing claimeven, but with an empty movestring the parity rule makes their disc **green** (`SocraticScreen.jsx:90`) — the demo drops the wrong color's first disc and celebrates.
- Lesson 06's single recycled board (`["ggd","ggd","ggd","dd","","",""]`) contradicts slides 1–3: slide 1 tells the player to count a 3-cell gap, slide 3 says "now the gap is 2" — the actual board's gap is 1 in all four slides, and the threat cell `(3,2)` is *gravity-top* (an immediate threat), which is exactly the degenerate case a z-threat lesson should avoid. The `td` "Gap cell (count these)" legend is declared on all four slides but **no `td` overlay exists** on any of them.

### X2 [P0] — Solver-refuted teaching content

All verified with `./visualize_board.sh` (scores are for the side to move):

1. **Lesson 02, slide 4** (`3333332122454422126151`, Green to move): the `tg` overlay at `(4,3)` is labeled *"Green should build here instead."* Solver: that move scores **0 (draw)** while Green has an **immediate win** — its own gravity-top major threat at col 1 (0-ind), score **+10**. The slide literally coaches a `win_to_draw` blunder (the app's own taxonomy).
2. **Lesson 03, socratic** (`44442222224333`, learner plays Green): every column scores **−14**. Gray already has **two gravity-top winning threats** at `(1,0)` and `(5,0)` — the very cells the JSON decorates with `win` overlays. The learner plays the "correct" fork move at col 3, is told "Exactly! You saw it.", and the position is lost on the spot: both fork cells `(1,1)`/`(5,5)` sit **directly above Gray's winning cells** (a textbook undercut — the exact trap lesson 09 warns about). Also, the `claim` overlay at `(3,2)` sits on an occupied cell (Gray's disc, move 14).
3. **Lesson 11, challenge 1** (`441314453361115`, Gray to move, `correctCol: 4`): the taught figure-7 move scores **−4**; column 5 wins **+12**. The accepted-gate (spec 049) will mark the pattern move correct — meaning the paid figure-7 lesson trains a move that loses with best play while a win was available.
4. **Lesson 05, both challenges** (`claimeven`, Gray): prompts read *"…guarantee a draw"*, but both positions are **won** for Gray (best scores +9 and +12), and the stored `correctCol` moves score only +4 and +6 respectively. The wording is factually wrong (a claimeven here converts a win, not a draw) and the canonical answer is materially worse than the position allows.
5. **Lost-position practice:** lesson 02 challenge 1 (`236343326044152605`) — the forced block scores **−2**, everything else −12: the "right" answer still loses. Lesson 09 challenge 2 (`22663145412214436535`) — best available is **−3**: the user is asked to "undercut your opponent" in a dead-lost position. For a paid product, practice positions should reward the taught move with a survivable/winning game unless the lesson explicitly teaches resistance.

### X3 [P1] — Green/Gray swapped in coach text (systemic)

Verified against the rendered boards:

- **L02 slide 1** (`3332324445`): coach says *"Green has three discs in a row… What is Gray's only safe move?"* The three-in-a-row at row 1 (0-ind, cols 2–4) is **Gray's**, and **Green** must make the only safe move (solver: col 5 is +12 for Green; everything else −16). Exactly inverted.
- **L03 slide 2** (`3333332444441`): coach: *"Green must answer."* The two threats (`(0,0)`, `(2,1)`, both verified gravity-top) are **Green's**; **Gray** is to move and must answer.
- **L03 slide 3** (`3333322422111`): coach: *"blocking the bottom one hands Gray the top."* The stacked threats belong to **Green**; blocking the bottom hands **Green** the top.
- **L07 slide 2** (`333334444`): coach: *"then Green shifted one column over."* Move 6 (the first disc in col 4) is **Gray's**; lesson 08 slide 2 narrates the same board correctly ("Once Gray started column 4…").

Root cause is visible in the (non-user-facing) `_boardInstructions`: lesson 01's socratic instructions describe the green col-0 stack as "Yellow has three discs…", i.e., the author was working with the internal `red`/`yellow` tokens inverted. Every lesson authored in that batch needs a color audit, not just the four quoted lines.

### X4 [P1] — "You"/perspective incoherence

- Lessons 01, 02, 03, 05, 06, 09–12 declare `userPerspective: "yellow"` (Gray), yet several slides address **Green** as "you": L01 slide 4 ("your opponent already has three in a row" — the threat is Gray's, "you" = Green), L02 slide 2 ("You built — but Gray didn't wait" — "you" = Green).
- Legend items labeled **"User threat"** mark **green** cells in gray-perspective lessons: L01 slide 2, L02 slide 3, L04 slide 3/4 (L04 is `red`-perspective, so those two are consistent — but L02 slide 3's "User threat" `tg` marks a cell that is only a **minor** green threat, verified `(x)` in the solver output, so it is doubly wrong).
- The socratic learner color follows movestring parity, not `userPerspective` (X0 table): in lessons 01 and 03 the learner plays **Green** inside a "you are Gray" lesson.

Pick one contract — either the lesson is neutral commentary ("Green … Gray …" everywhere) or it is second-person and every "you" matches the disc color the learner actually plays — and enforce it in the authoring tool.

### X5 [P1] — Row/column indexing chaos (0-indexed vs 1-indexed, exposed to users)

- The app-wide convention is that users see **1-based** coordinates (project `CLAUDE.md`). But lesson 04 teaches "row 0 (0-indexed, bottom)", lesson 05 repeats "rows 0, 2, 4 (0-indexed)", lesson 13 slide 2 says "only col 1 (0-indexed) keeps the win", while lesson 08's socratic says "Gray just played column 2" (1-based), and lesson 13's socratic goalPrompt speaks of "the third row / the fifth row" (1-based, Allen's language). A learner cannot hold both.
- **Lesson 04's displayed title contradicts its own body.** The title shown to users is "Odd Rows Belong to Green" (`src/i18n/en.json:922-924`); under the body's 0-indexed convention Green owns rows **0, 2, 4** — *even* numbers. The title is only true 1-indexed. Worse, the body itself asserts *"Green owns rows 1, 3, 5 (odd numbers)"* immediately after correctly stating that Green takes row 0, row 2, row 4 (`lesson-04`, slide 1 `infoProse`) — the slide contradicts itself in two consecutive sentences.
- **Lesson 05 slide 1 then "recalls" lesson 04 incorrectly:** *"From lesson 4: Green owns rows 0, 2, 4 in a fresh column (0-indexed)"* — which is the opposite of what lesson 04's takeaway line said. Whichever convention is chosen, right now lessons 4 and 5 directly contradict each other on the single most load-bearing fact in the curriculum.
- The recycled socratic hint (see X7) says "an **even** square" — true only 1-indexed, in lessons that teach 0-indexed.

Recommendation: user-facing text should use 1-based, plain language ("the bottom row", "the second row", "the fourth column") everywhere; keep 0-indexing strictly internal. This also matches Allis/Allen quotes (odd/even rows are 1-indexed in both sources, see `docs/knowledge-base/README.md` color/parity trap notes).

### X6 [P1] — Lesson 04 teaches a false parity rule

Slide 2: *"if a column has an even number of discs (0, 2, 4…), the next disc is Green's; if odd, the next disc is Gray's."* This is false — players choose columns freely; column-internal alternation only holds if the column is filled straight through. The KB says so explicitly: `derived-parity-formula`, `known_limitations[0]`: *"The simple formula r % 2 is exact only when a column is filled straight from bottom in uninterrupted alternating play. In real games, players skip columns… Use the Z-Threat count formulation for mid-game accuracy."* Lesson 04's **own slide 4 board refutes it**: in `333321122214`, column 1's first disc is **Gray's** (move 6).

Slide 4 then applies the broken rule to the board: the `td` overlay at `(4,2)` is labeled **"Opponent threat"**, but the solver output shows `(4,2)` is a **Green** major threat — the row-2 three-in-a-row `(1,2),(2,2),(3,2)` is double-open, so *both* ends `(0,2)` and `(4,2)` are Green's threats. What the slide means is "a Green threat with bad parity"; what it says (and colors) is "a Gray threat". A learner who checks the window will find three green discs and a legend calling it the opponent's.

What lesson 04 *should* teach (per `derived-parity-formula` + `community-z-threat`): row parity determines who *naturally* lands where **under endgame zugzwang fill** (Green = odd rows 1-indexed, Gray = even), and the mid-game-accurate refinement is the empty-cell count from the column top (the z-threat count) — which is exactly the bridge to lessons 5 and 6.

### X7 [P2] — Copy-pasted socratic template, and a hint that is wrong almost everywhere

Lessons 01, 02, 03, 05, 06, 09, 10, 11, 12 share verbatim socratic messages: ask *"I'm going to make a mistake here. See if you can punish it."*, hint *"Look for an even square directly above one of my discs."*

- The **ask** line is false in every lesson: the socratic is a single click; no coach mistake is ever shown or made.
- The **hint** is the claimeven hint. It is correct only for lesson 05. Verified counterexamples: L01 — the winning square `(0,3)` is above the *learner's own* three green discs, not "mine" (and the coach there is Gray); L02 — the correct square `(3,0)` is the *bottom* row of an **empty** column (above no disc at all).
- `socratic.goalPrompt` (authored with care in lessons 05, 06, 09–12) is **dead content** — `SocraticScreen` never renders it. The actual on-screen task statement for those lessons is the generic "I'm going to make a mistake…" line over (per X1) an empty board.

Lessons 07/08/13 show the correct pattern: the real question lives in `messages.ask` ("You move first — where is the strongest opening move?").

### X8 [P2] — Overlay and legend conventions drift

- `win` (pulsing ring) variously marks: the three discs of a threat (L01 s1), a winning four (L02 s2), an *empty* threat cell (L03 s4), "pattern discs" (L11/L12 instructions). Same visual, four meanings.
- Legends declare marker types not present on the board (L06, all four slides declare `td` "Gap cell (count these)"; no `td` overlays exist).
- `tg`/`td` are de facto "green player's cell" / "gray player's cell", but several slides use them as "good/bad" or "yours/theirs" regardless of color (L04 s4, L09/L10 instructions use `tg` for Gray-the-user's threat). Given `tg` renders as a *green dot*, marking a Gray threat with `tg` will always read as Green's on screen. The undercut/overcut instruction blocks (L09/L10) are written with `tg` = "Gray's threat" throughout — if executed as written, every board would color Gray's threats green.

### X9 [P2] — Ordering metadata contradicts itself

`lessonLoader.js:170-176` orders by **filename prefix** and overwrites the JSON `order` field. But the JSON fields disagree with the filenames: lesson-07 has `"order": 12`, lesson-08 `"order": 13`, lesson-13 `"order": 14`, lessons 09–12 have `"order": 6, 7, 8, 9`. I.e., the authored intent was: …claimeven (5), z-threats (5/6), undercut (6), overcut (7), figure-7 (8), j-shape (9), … openings (12, 13, 14) **last**. The filename renumbering silently moved the two opening lessons into the middle of the tactics arc (see Part 4).

### X10 — Spanish (see Part 5): only lesson 01 is actually localized.

---

## Part 2 — Lesson-by-lesson

Format: verdict, then findings. "Verified" = via `visualize_board.sh` output during this review.

### L01 — Immediate Threats (`lesson-01`, free, `userPerspective: yellow`)

**Verdict: best of the tactics batch; needs perspective/legend fixes only.** The concept matches `community-immediate-threat` usage (any 4-window with three own discs + one empty), all four boards are real and correct, the interior-gap slide (s3) is a genuinely good inclusion, and s4 (block-before-build preview) is verified sound (Gray's GT threat at `(5,3)`; the tempting green cell is a real minor-threat build).

- [P1] s2 legend calls the diagonal **green** threat "User threat" — the user is Gray. s1 legend calls Green's threat cell "the winning move" while **Gray is to move** (for Gray it is the must-block; solver: blocking scores +2, everything else −18). Either make the lesson explicitly neutral-observer or align "user" with gray.
- [P2] Socratic: works mechanically (learner plays Green — parity — and col 0 is the unique best move, +15), but the ask/hint template is wrong here (X7), and `_boardInstructions` describe the colors inverted (X3 root cause).
- [P2] The socratic being a *vertical* win is good coverage (slides show horizontal/diagonal/interior-gap; vertical appears only here) — but no slide ever names the vertical case; add one line in s2.
- Challenges: all four verified — the side to move matches `userPlayer`, and an immediate winning square exists (e.g. ch1: green GT threat, col 6 display, +13). Good.

### L02 — Block Before Build (`lesson-02`, free, yellow)

**Verdict: right concept (maps to `forced_block` in the deep-reveal tag set), sabotaged by the color swap and a solver-refuted overlay.**

- [P1] s1 coach text colors inverted (X3). The board/overlays themselves are correct and well-chosen (the block is also the winning move, +12 — nice).
- [P1] s3: `tg` "User threat" marks `(4,1)`, which is a **minor** threat of **Green** (user is Gray) — wrong on both counts (verified `(x)` in solver output). Also the position is already lost for the blocker (best −2): acceptable for drama, but say so or pick a savable board.
- [P0] s4: "Green should build here instead" recommends a **draw** while Green has an immediate **win** (X2.1). The buried-threat teaching itself (threat above empty cells is not yet immediate; `claim` overlays on the gap cells) is excellent and correct — replace the board or the overlay, keep the idea.
- [P2] s4 legend "Gray's connected disks" / elsewhere "discs" — spelling drift; also the closing prose question ("Can you spot another similar case…?") has a real answer on the board (col 1's buried gray threat) — good, but nothing ever confirms it for the learner.
- Socratic verified good (unique correct block, +4, learner color matches the story — Gray blocks Green's three). The hint is wrong here (X7).
- Challenge 1 is a lost position (X2.5); challenge 2 verified good (+12 unique).

### L03 — The Fork (`lesson-03`, free, yellow)

**Verdict: concept and s1/s2/s4 boards are right (matches `community-double-threat` / FV `double_threat`); coach text swaps, a mis-scoped s3, and a fatally broken socratic.**

- [P1] s2/s3 coach color swaps (X3). s2's board is verified: green fork, both threat cells gravity-top, Gray to move.
- [P1] s3 ("stacked fork") is **mis-scoped**: the stacked pair `(0,2)/(0,3)` sits over an **empty column** — neither threat is reachable, which contradicts s2's own rule ("both threat cells must be immediately reachable") and s4's test. What s3 actually shows is the *zugzwang stacked pair* — the figure-7 winning mechanism (`community-figure-7`: "blocking the lower immediately makes the upper a Major Direct threat"), taught eight lessons early without the parity tools, and labeled "just as decisive" without explaining why. Either move it to the figure-7 lesson or teach it as "a preview: this wins later, for a reason you'll learn in Z-Threats". Also the board contains a **second identical stacked pair** (col 5, verified) that no overlay or text mentions — a learner who finds it first will think they're wrong.
- [P0] Socratic: lost position; the praised move loses by force; `claim` overlay on an occupied cell (X2.2).
- Challenges verified plausible (ch3 is particularly good: the fork move simultaneously blocks Gray's GT threat, +11 unique).

### L04 — Odd Rows Belong to Green (`lesson-04`, free, red)

**Verdict: the most important lesson in the set and the most broken. Rewrite from scratch.** This is the foundation for claimeven, z-threats, J-shape parity, and every `parityAttribution`/`allen-v3`/`allen-v4` deep reveal — and it currently teaches a false rule, contradicts itself, contradicts its own title, and mislabels a threat on its verification board.

- [P1] Self-contradiction in s1; title vs body contradiction; 0-indexed exposure (X5).
- [P1] False per-column alternation rule in s2/s3, refuted by its own s4 board and by the KB (X6).
- [P1] s4 `td` "Opponent threat" marks Green's own second threat end (X6).
- [P2] s3's overlays mark "threats" on an almost empty board (one disc) — they are ownership illustrations, not threats; the legend types say "Opponent threat / User threat". Invent a neutral overlay meaning ("cell that falls to Green/Gray") or the legend lies.
- [P2] No socratic and no challenges: the concept with the highest transfer value has zero practice. At minimum add an identification socratic ("which of these two threats can you actually collect?").
- What to keep: s4's *question* ("who will actually land on the completing cell?") is exactly the right framing, and the s4 board (double-open three where one end is parity-good and the other parity-bad) is a great board once labeled truthfully; the closing pointer to Claimeven/Z-Threats is good sequencing.

### L05 — Claimeven (`lesson-05`, free, yellow)

**Verdict: the underlying text is factually the closest to its KB entry in the whole set — and none of it is on the board.** All four slides + socratic are placeholders (X1).

- Factual check of the prose vs `allis-claimeven`: core rule correct (Gray answers directly above Green's even-0-indexed-row play; all Green groups through the claimed upper square die — Allis: "All groups which contain the even square are solved"). s3's "board-wide collapse" matches the claimeven-position idea (worked example `3233253335` in the KB would make a perfect s3 board). s4's warning (don't respond above when Green plays an odd-0-indexed row) is a reasonable simplification.
- [P2] Omission: claimeven's precondition is being the **zugzwang controller** (Allis; `allis-claimeven.preconditions[0]`), and its guarantee is refuting groups — not "winning". The lesson's "Gray's natural home" framing is fine for beginners but should state the payoff honestly ("this is how Gray holds the draw / converts structural control", cf. the challenges' own draw language).
- [P0] Socratic empty-board + wrong learner color (X1). [P1] Challenge prompts claim "guarantee a draw" in positions Gray has already won; canonical answers are far from best (X2.4).
- The KB even has a ready-made Spanish `short_summary_es` for claimeven — the popup and the lesson should use consistent phrasing when localized.

### L06 — Z-Threats (`lesson-06`, free, yellow)

**Verdict: the mechanism taught contradicts the KB definition of the concept it names.** Plus placeholder/recycled boards (X1).

- [P1] The lesson's core story — *"You enter this column first. You go 1st, opponent 2nd, you 3rd — and you land on the threat… you must be the one to enter the column first"* — assumes the opponent obligingly alternates inside the column. `community-z-threat` defines the power the other way around: *"the opponent must **eventually** play into that column, but the odd empty-cell count ensures the owner lands on row r"* — a **zugzwang** weapon: the owner keeps tempo elsewhere and lets the opponent be forced in; the odd count is what makes the toggling work. Entering the column first *burns* your own tempo and only "works" if the opponent answers in-column. The count rule itself (odd = yours, count from the current top — s1's formula and s4's "count from the stack top, not row 0") **is** correct and matches `is_z_threat`; the operational advice around it is inverted.
- [P1] Boards contradict narration: claimed gaps 3 / 3 / 2 / odd across the four slides; the one recycled board has gap 1 on every slide, and the threat is gravity-top — i.e. an *immediate* threat, the degenerate case (KB known_limitations: z-threat status ≠ effectiveness; a gravity-top "z-threat" is just "play it now").
- [P2] Legend declares `td` gap markers that don't exist (X8). Socratic: the actual board does contain a genuine gray z-threat in col 3 (gap 1), so `correctCol: 3` is defensible, but the promised distractor column (same row, even gap) doesn't exist, which was the entire teaching contrast.
- Challenges verified structurally sound (capsule metadata's odd badge counts match the boards); note ch2's canonical column (+13) is not the solver-best (+15) — covered by the accepted-gate, but worth re-curating.

### L07 — Own the Centre (`lesson-07`, free, red) & L08 — I Play Where You Play (`lesson-08`, free, red)

**Verdict: good.** Solver-verified claims, correct 1-based user language in the socratic, honest hedging ("It is a shortcut, not a rule"), KB-aligned (`allen-5-4-opening` `333334444` ✓ verified all-negative for Gray; candlesticks `3333311115555` ✓ verified all-negative for Gray; L08 socratic `33333111` ✓ unique +1 at col 1; both match the KB's solver-verified examples, including L08 s3's fill-order warning which encodes the KB's candlesticks false-positive).

- [P1] L07 s2 coach: "Green shifted one column over" — Gray started column 4 (X3). L08 s2 narrates the same position correctly; also the two lessons share two boards (`333334444`, `3333311115555`) with near-duplicate prose — fine if intentional (recall), but s2/s3 of L07 read as a compressed draft of L08.
- [P2] L07 s2 "the position is fully resolved in Green's favour" is right, but "Green is the only one who can threaten a third-row (odd-row) horizontal" uses 1-based "odd-row" in a curriculum whose parity lessons are 0-based (X5).
- [P2] L07 s4 (movestring `333`) largely repeats s1; low information. Could show the *why* (count the 4-windows through the center column vs an edge column).
- L07 socratic (empty board, "where is the strongest opening move?") is exactly what a socratic should be. Note `confirmationCategory: null` — no practice for either opening lesson (acceptable; consider one "find the book move" challenge each).

### L09 — The Undercut (`lesson-09`, **paid**, yellow)

**Verdict: placeholder boards (X1) + an over-claimed mechanism.** The concept itself is canonical (Allen T2; the deep-reveal term popup maps `undercut` → `allen-t2`).

- [P1] s1: *"Gray's threat at row 0 fires the instant any disc enters column 3. Green's threat at row 1 will never be reached, because Gray wins the moment the column is touched."* False as stated: if **Green** plays the column, Green's disc *occupies* Gray's threat cell (blocking it), and Green's upper threat becomes gravity-top (Gray must then spend a move blocking). `allen-t2`'s verb is precise: the lower threat **neutralizes** the upper — the upper can never *win the endgame*, not "the column is instant death". The distinction matters because s1's phrasing will make learners believe touching such columns is suicide, which is wrong half the time.
- [P2] s3 (same-parity → both live, block separately) matches `allen-t4` case B. s4 (a lone disc below is not an undercut — you need a real threat) is a good false-positive slide, mirroring the KB style. Good bones.
- [P2] Perspective note: the deep-reveal `undercut` tag names *the blunderer's own exposure* (classifier comment, `classifier.js:1903-1905`), i.e. "your upper threat is dead". The lesson teaches undercut as a weapon you build. Both are valid, but after a deep reveal says "your threat was undercut", the lesson should contain at least one slide in the victim's seat so the vocabulary connects.
- Challenge 2 is a dead-lost position (X2.5).

### L10 — The Overcut (`lesson-10`, **paid**, yellow)

**Verdict: placeholder boards (X1) + the stated conditions don't match either the physics or the detector.**

- [P1] s2/s3 condition — *"The odd-column condition is what makes it work… you need an odd number of empty cells in the column AND it must be your turn to enter first"* — is neither necessary nor sufficient. For the described play (your disc lands on their threat cell at R−1, exposing your threat at R) the actual requirement is that **R−1 is the gravity-top cell right now**; "odd empties" is irrelevant to that (and s3's "even empties ⇒ Green enters first and lands on R−1" is a non sequitur — whoever moves next lands on the gravity-top, regardless of parity).
- [P1] Detector mismatch: the production `overcut` (`classifier.js:954-989`) = same-column pair, your threat above theirs, playing the column is solver-**winning**, justified by any of **T4 same-parity / T5 (rows 3+6) / T2-chain** — three cases, of which the lesson teaches only the "active forcing" one, with an invented precondition. A user who reads an `overcut` deep reveal will meet same-parity and T5 overcuts the lesson never mentions.
- [P2] s4 (shared `[*]` cell — verify the upper cell is exclusively yours) is a genuinely good gotcha slide; keep it.

### L11 — Figure-7 Trap (`lesson-11`, **paid**, yellow)

**Verdict: placeholder boards (X1); the shape is miscounted; one challenge trains a losing move.**

- [P1] s1 coach + instructions say the figure-7 is **four** discs ("Four discs forming the number '7'… exactly 4 discs"). `community-figure-7` defines **five** discs (diagonal arm ×3 + horizontal arm ×3 sharing the hinge). The lesson's own socratic `_boardInstructions` correctly say five. A payer who counts along with slide 1 learns a wrong shape.
- s2 (block-below activates the upper) and s3 (both-gravity-top = plain fork, not the trap; "a Figure-7 puzzle specifically requires at least one threat cell above the current stack") are **faithful** to the KB's hard-derived invariants (gravity-top ≤ 1, ≥ 1 above gravity) — genuinely good, keep the text.
- s4 Mirror-7 matches the KB's variant list.
- [P0] Challenge 1 trains a solver-losing move (X2.3). Challenge 2 verified good (the figure-7 move is also the forced block, +10 unique).
- [P2] The KB's canonical worked example (`43222430403`) and its far-arm-end false positive (`30321143442`) are sitting there ready to become slides 1 and a "not a figure-7" slide.

### L12 — J-Shape (`lesson-12`, **paid**, yellow)

**Verdict: placeholder boards (X1); the parity rule is inverted; the mechanism misstates the canonical pattern.**

- [P1] **Inverted parity rule.** s4: *"The J-shape only works when the anchor disc sits at an odd-indexed row (0-indexed: rows 1, 3, 5)… With an even-indexed anchor… the J is a ghost."* `allen-j-configuration` requires anchor row y **odd in 1-indexed** terms (predicate `y % 2 == 1`, canonical anchor D1 = row 1 = **0-indexed row 0**). So the correct 0-indexed rule is anchors at rows **0, 2, 4** — the lesson teaches exactly the complement. Its own confirmation challenges refute it: both use anchors at 0-indexed row 0 (`highlightMetadata` pattern pieces `(3,0)/(3,2)/(4,1)` and `(5,0)/(5,2)/(4,1)`), which slide 4 would classify as ghosts.
- [P1] s2 mechanism: *"two threats converge on the same column… Playing in that column sets up a fork."* Allen's J is a **triple** threat across **two** columns (F3, G3, G4 from D1-D3-E2-E3), equivalent to a major odd-row threat via zugzwang ("sooner or later Red must get either G3 or G4… F3 becomes a major threat"). Same-column adjacent threats is the *figure-7*'s defining property (lesson 11!) — as written, lessons 11 and 12 teach the same geometry under two names, and neither teaches Allen's actual J.
- [P1] s1 geometry ("a vertical pair forming the lower stem") doesn't match D1-D3-E2-E3 either — the stem is D1+D3 with a **gap** at D2; there is no vertical pair.
- [P2] The lesson never mentions Allen's three failure conditions (overcutting, edge proximity, parity cancellation — `known_limitations`), at least one of which (edge) is cheap to teach and shows up in play constantly.
- Challenges verified reasonable (+10/+5 for the pattern move; ch1's prompt "Place a disk to form a J-shape pattern" — "disk" spelling drift, and a weaker prompt than ch2's).

### L13 — Sharp Openings (`lesson-13`, **paid**, red)

**Verdict: the best lesson in the set — this is what the paid tier should look like.** Every claim solver-verified this review: s1 `333334444` all-negative for Gray ✓; s2 `3332223362` unique winning col 1 (0-ind), +7 ✓ (matches KB `allen-d3-d4-opening` premium example, Diagram 231); s3 `3332222` all-negative for Gray ✓ with the late-D4 self-trap warning matching the KB's corrected false-positive note; socratic `3265533353553111` unique +2 at col 4 ✓ (Third-Row Gambit, Diagram 301, matches `allen-third-row-gambit`).

- [P2] s2 exposes "(0-indexed)" to the user (X5) — say "the second column from the left".
- [P2] The socratic's goalPrompt (1-based "third row"/"fifth row" Allen language) is the *rendered* ask message here — good — but sits in the same product as lessons teaching 0-based rows.
- [P3] No confirmation challenges; for a paid capstone, 2–3 "only move wins" book positions would be cheap wins (the KB lists verified continuation lines).

---

## Part 3 — Completeness vs the deep-reveal feature vector

Authority: the live reason-engine evidence vector (`computeReason` → `toNarratorVector` → grounded render), plus the two term surfaces users can tap: live `TERM_KB` (`zoneAnnotations.mjs:28-33`: `immediate_threat`, `double_threat`, `figure_7`, `claimeven`) and the `PATTERN_KB`/`KB_TERM_LESSON` popup path (18 terms, `kbTermLesson.js`). Blunder-tag vocabulary from `blunderTags.js`/`classifier.js:1634-1655`.

### Coverage matrix (concept → lesson)

| Deep-reveal concept (surface) | Covering lesson | Status |
|---|---|---|
| `immediate_threat` (tag, term, fast-path) | L01 | ✅ covered, good |
| `forced_block` (tag, term) | L02 | ✅ covered (fix X2/X3) |
| `double_threat` / fork, `forkCase A` | L03 | ✅ covered (fix socratic) |
| Parity foundations: odd/even rows, `parityAttribution.empties[].parity`, `allen-v3`/`allen-v4` named rules | L04 | ⚠️ covered by a **broken** lesson (X5/X6) |
| `claimeven` (tag, live term) | L05 | ⚠️ prose right, boards absent (X1) |
| `z_threat` (tag, term; `zcount` in parityAttribution) | L06 | ⚠️ mechanism contradicts KB (X1) |
| `undercut` (tag, term → allen-t2) | L09 | ⚠️ placeholder + over-claim |
| `overcut` (tag, term) | L10 | ⚠️ placeholder + wrong conditions; 2 of 3 detector cases untaught |
| `figure_7` (tag, live term, `forkCase B`) | L11 | ⚠️ placeholder + 4-vs-5 discs |
| `j_shape` (tag, term → allen-j-configuration) | L12 | ⚠️ placeholder + inverted parity + wrong mechanism |
| `openingContext.namedOpening` (5-4, 3-4, D3-D4, candlesticks, third-row gambit) & `centrality` | L07/L08/L13 | ✅ covered, verified |
| **`major_threat` / `minor_threat` vocabulary** (term popups; FV `severity` immediate/major/minor) | — | ❌ **gap** — every lesson says "threat"; no lesson defines major (3+1) vs minor (2+2) vs immediate, yet reveals and popups use all three words |
| **`gravity_top`** (term popup; severity promotion rule) | — | ❌ gap — taught only implicitly ("immediately reachable", L03 s4); reveals say "gravity-top" |
| **`major_threat_parity` / parity-aligned threat** (tag, popup, practice category `odd_even_threat`; FV `threatStats.*ParityAligned`) | L04 (implicitly) | ❌ effectively a gap until L04 is rewritten — this is the single most common deep-reveal parity surface |
| **Zugzwang / tempo** (`tie.kind: tied/temporal`, `register: parity`, "parity battle" reading-key gloss) | — | ❌ gap — the word appears once in passing (L11 s3); no lesson teaches "having spare moves / being forced to move" |
| **`conditional_swindle`** ("practical chance" narration in `lose_to_faster_lose` reveals) | — | ❌ gap (deliberately has no term popup; still narrated) |
| Blunder-case vocabulary (`win_to_draw` etc., "you threw away the win") | — | ➖ minor gap — reveals narrate it in plain words; a 1-slide primer ("positions are won/drawn/lost; a blunder changes the class") would anchor the whole product |
| `replyHistogram` / defensive resilience gloss | — | ➖ minor gap |
| `before` / `specialbefore` / `baseclaim` (popup-able via PATTERN_KB) | — | ➖ acceptable gap (rare); popups fall back to KB short_summary |
| `resist-and-wait` (openingContext.centrality text) | L07 partially | ➖ minor |

### Linking gap (cheap, high-value)

`KB_TERM_LESSON` (`src/lib/kbTermLesson.js`) has `lessonId: null` for `community-immediate-threat`, `community-double-threat`, and `community-forced-block` **even though lessons 01/03/02 teach exactly those concepts**. Deep-reveal popups for the two most common tags therefore never offer "Go to lesson". Wiring these three (and adding `practiceCategory` links where categories exist) is the cheapest completeness win in the whole report.

### Bottom line on completeness

Nominally, 11 of the 16 first-class tag/term concepts have a lesson. Functionally, once X1/X6 are accounted for, a paying deep-reveal user can only actually *learn* immediate threats, forced blocks, forks, and openings from the current set — the parity/zugzwang half of the reveal vocabulary (which is what `register: parity`, `parityAttribution`, v3/v4, z-counts, tied/temporal ties lean on) has no working lesson support. That is the completeness gap to close first.

---

## Part 4 — Pedagogic order

Current effective order (filename prefixes, which override the JSON `order` fields — X9):

> 01 immediate threats → 02 block → 03 fork → 04 parity rows → 05 claimeven → 06 z-threats → **07 centre / 08 imitate** → 09 undercut → 10 overcut → 11 figure-7 → 12 j-shape → 13 sharp openings

What's right: 01→02→03 is a textbook progression (see it → defend it → double it); 04→05→06 is the correct parity ladder (row ownership → the pairing response → the mid-game count); 09→10 (kill from below → punch from above) is a natural pair; 11→12 (same-column trap → multi-threat cluster) builds on both forks and parity; 13 is a proper capstone.

Problems:

1. **The openings interrupt the arc.** 06 ends with mid-game parity counting; 07/08 reset to move one; 09 then resumes column-parity warfare that depends on 06. The JSON `order` fields (07→12, 08→13, 13→14, 09–12→6–9) show this was the authored intent — tactics 1–9, openings 12–14. Either restore that order or move openings to the front as a "week 0" (they are self-contained); the current interleaving is the worst of both.
2. **L03 s3 teaches L11's mechanism early** (stacked same-column pair) while contradicting its own lesson's reachability rule — resequence as a forward-reference or move it (Part 2, L03).
3. **Dependencies are asserted but broken:** L05 s1 explicitly builds on L04's takeaway and quotes it wrongly (X5); L06 s4's "raw row number can mislead you" is the payoff of L04's shortcut — but L04's shortcut is the false per-column version (X6). The ladder is right; the rungs are broken.
4. **Free/paid boundary inverts the value curve.** Free tier: 8 lessons including the two polished opening lessons. Paid tier: 09–12 (all placeholders) + 13. Today the paid tier is the *weakest* content in the product. Post-fix, the natural split is: free = 01–03 + a fixed 04 (hook + fundamentals), paid = parity mastery (05, 06) + column warfare (09–12) + openings (07, 08, 13).
5. **Missing rungs** (from Part 3): a vocabulary slide/lesson for major/minor/gravity-top belongs between 01 and 03 (it's three definitions the reveals already assume); a short zugzwang/tempo lesson belongs between 06 and 09 (it is the *why* behind z-threats, figure-7, and every `register: parity` reveal).

Recommended sequence: **[threat vocabulary] → 01 → 02 → 03 → 04 (rewritten) → 05 → 06 → [zugzwang/tempo] → 09 → 10 → 11 → 12 → 07 → 08 → 13**, with 07/08 movable to the front if marketing wants an easy on-ramp.

---

## Part 5 — Spanish (es)

Coverage counts (fields with `_es` siblings per file; walker fields per `scripts/translate-lessons.mjs`):

| Lesson | `_es` fields | What Spanish users actually get |
|---|---|---|
| 01 | 34 (full: slides text/labels/infoProse + audio_es + challenge goalPrompts) | ✅ fully localized, including audio |
| 02, 03, 05, 06, 09–12 | 5 (only the shared socratic ask/wrong1/wrong2/correct/hint) | ❌ all slides, legends, infoProse, challenge prompts fall back to English |
| 07, 08, 13 | 5 (their custom socratic messages — the ones that matter there) | ⚠️ socratic fully Spanish; slides/infoProse English |
| 04 | 0 | ❌ nothing |

- The per-field fallback (`lessonLoader.js#localizeLesson`, decision D1) works as designed — nothing blanks — but the product experience in Spanish is: coach bubble occasionally Spanish, every board explanation English. For a paid Spanish-market product this is effectively "not localized" for 12 of 13 lessons.
- Quality of what exists is **good**: natural Rioplatense voseo ("Mirá el tablero", "jugala y ganás"), consistent terminology (ficha/casilla/amenaza/tablero), and lesson 01's Spanish correctly says "fichas verdes" matching the rendered board. L13's socratic Spanish is publication-quality.
- Two consistency notes for the translation pass: (a) the KB already ships `short_summary_es` for terms that appear in popups (e.g. `allis-claimeven`: "quien controla el zugzwang (gris)…", `community-figure-7`) — lesson wording should match those glosses; (b) whatever indexing convention X5 lands on must be applied in Spanish from the start ("la fila de abajo", "la segunda columna") rather than translating the current 0-indexed English.
- Process note: since `translate-lessons.mjs` drafts `_es` from English, **fix the English first** (X2–X6) or the errors get translated and must be fixed twice. Audio: only lesson 01 has `audio_es`; the audio pipeline reads the raw cache (`lessonAudio.js` via `getLessonsAll`), so ES audio generation is unblocked once text lands.

---

## Part 6 — Prioritized remediation

**P0 — before charging anyone** (mostly lessons 05, 06, 09–12 + the solver-refuted boards):
1. Author real boards for the six placeholder lessons; strip every `<board instructions>` block from `infoProse`. The KB worked examples are ready-made: claimeven `3233253335`, z-threat `0004111444466662552525506`, figure-7 `43222430403` (+ false positive `30321143442`), J `3334434`/`43344032`. Every new board through `visualize_board.sh` before commit.
2. Fix the four solver-refuted items: L02 s4 overlay, L03 socratic board, L11 challenge 1, L05 challenge prompts/answers (X2). Re-curate the two lost-position challenges (L02 ch1, L09 ch2).
3. Make every socratic ask a real, rendered question (move goalPrompt content into `messages.ask`, as 07/08/13 already do), with per-lesson hints; fix the L05 socratic learner-color parity.

**P1 — factual/coherence pass:**
4. Color audit of every coach message/legend against the rendered board (X3, X4); pick and enforce the voice contract (neutral vs second-person).
5. Rewrite L04 around the true rule (row parity under zugzwang fill + z-count refinement, per `derived-parity-formula`/`community-z-threat`); reconcile the L04↔L05 handoff; align title/body.
6. Fix L06's mechanism (zugzwang framing, not "enter first"), L09's over-claim ("neutralizes", not "instant death"), L10's conditions (gravity-top reality + the three detector cases), L11's disc count (five), L12's parity rule (anchor odd **1-indexed** = even 0-indexed) and mechanism (Allen triple threat).
7. Adopt one user-facing coordinate language (recommend 1-based/plain words) across all lessons, titles, and hints (X5).

**P2 — consistency/completeness:**
8. Wire `KB_TERM_LESSON` lessonIds for immediate_threat/double_threat/forced_block (Part 3, linking gap).
9. Add the two missing rungs: a threat-vocabulary primer (major/minor/immediate/gravity-top) and a short zugzwang/tempo lesson (Part 3/4).
10. Restore the intended lesson order or renumber deliberately (X9); revisit the free/paid split (Part 4.4).
11. Overlay conventions: one meaning per overlay type; legends must match overlays present (X8).

**P3 — localization & polish:**
12. Run the ES pass over the corrected English (all six walker field paths), then ES audio; disc/disk spelling sweep; add challenges to L04/L07/L08/L13.

---

*Verification data for this review (solver outputs per movestring) was generated with `./visualize_board.sh` on 2026-07-22; the Linux solver binary was built locally from `connect-four/solver-src` for this session and not committed.*

---

## Remediation status (2026-07-24)

Outcome of the remediation branch (`claude/lesson-content-critique-349px7`), as verified by the final whole-branch review on 2026-07-24.

| Finding | Outcome | Notes |
|---|---|---|
| X1 — placeholder boards | **FIXED** | All six placeholder lessons rebuilt on solver-verified boards; zero `<board instructions` blocks remain; strict tests enforce this for all 13 lessons. |
| X2 — solver-refuted content | **FIXED** | L02 s4 overlay, L03 socratic board, L05 challenge prompts, figure-7 ch1, and both lost-position challenges replaced; full `verify_lesson_content.mjs` sweep all-PASS. |
| X3 — color swaps | **FIXED** | Includes the L12 "Green shifted" survivor caught at the whole-branch review (fixed in the final copy wave). |
| X4 — voice contract | **FIXED** | Final L02 s2 remnant fixed in the final copy wave; generic reader-"you" is allowed by the contract. |
| X5 — coordinate indexing | **FIXED** | 1-based plain words everywhere user-visible; a static test bans `0-index` in lesson copy. |
| X6 — false parity rule | **FIXED** | L04 rewritten around the true fill-count rule; L04↔L05 handoff consistent. |
| X7 — socratic template | **FIXED** | All socratic asks are lesson-specific; the legacy-template allowlist is empty. |
| X8 — overlay/legend drift | **FIXED** | Overlay contract + strict tests; per-slide `_overlayIntent` escape hatch documented. |
| X9 — lesson ordering | **FIXED** | Files renumbered: tactics 1–10, openings 11–13; loader verified. |
| X10 — Spanish/localization | **DEFERRED** | Task 14 blocked — no translation API key in the remediation environment. Additional es+audio debt accrued: rewritten socratic messages in L01/L02 need fresh `text_es`, and stale `_es`/audio siblings were deleted on every edited English field. |

Additional notes:

- **Gates now live**: `tests/unit/lessonContent.test.js` runs in `test:fast` (plus `tests/lessons/opening-lessons.test.js`, wired in the final copy wave), and `server/scripts/verify_lesson_content.mjs` provides the solver-backed content sweep.
- **Board finder kept**: `server/scripts/find_lesson_boards.mjs` is retained as curation tooling. The recommendation to delete it after the remediation is recorded; the owner may still do so.
