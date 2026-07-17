---
name: feedback_deep_reveal_product_mindset
description: "How to think about deep-reveal explanations product-wise — the reason must be a reproducible board feature, never the solver score; sparse positions always have a (forward-looking) reason"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: af7ae640-0a81-4a6c-b3e1-5bf4a296fbfa
---

The product mindset for deep-reveal explanations — the user had to correct me repeatedly to reach this; none of it is derivable from the code.

**The principles:**

1. **The solver score is never the reason — it is only an internal compass.** The explanation's "why" MUST be a board feature the player can perceive and reproduce (threats, parity, who-completes-first, a forcing structure). The score only tells *us* (a) which column is the contrast/"better" one and (b) what *kind* of feature to go looking for. "The better move scores higher / loses slower" stated as the reason teaches nothing reproducible — it is banned as a justification even though scores never literally appear in the prompt.

2. **Sparse ≠ no reason.** Deep reveal only fires when columns' scores differ (`selectContrastMove` returns null when all equal), so a reason *always* exists. On a sparse board (no threats, no Tier-1/2 pattern) the reason is **inherently forward-looking** — parity, zugzwang, tempo are invisible in the static position and recoverable only by simulating forward. Simulation there is the *only* way to get a learnable reason, not an optimization.

3. **"Better" = breadth of punishable opponent mistakes.** After a mistake you play your best and wait for the opponent to err; the better move keeps *more (or earlier) ways* to reach a concrete winning structure across the opponent's possible slips. So look-ahead explores the opponent's **sub-optimal** replies (mistakes), not the principal variation. Won vs lost only changes the verb ("forces" vs "gives you chances if they slip"), not the method.

4. **Never manufacture a benefit.** If simulation finds no structure that distinguishes the two moves, surface nothing structural — stay minimal and honest. Fabrication (hallucinated threats/structure) is the worst failure mode (rubric item 2).

5. **Losing ≠ coin-flip.** A position where every move loses still has a real reason one move beats another (e.g. slower loss = more chances for the opponent to slip). Do not dismiss it as "no meaningful difference."

**Why:** I defaulted to score-derived framing and to best-vs-best simulation, and mislabeled a lost position as a coin-flip — all of which produce vague or untruthful explanations and miss the pedagogical goal (the player must learn a feature they can reproduce).

**How to apply:** Before designing or writing any deep-reveal explanation logic, ask "is the reason I'm about to surface something the player could find on their own from the board?" If it leans on the score, or on best-vs-best lines, or on a losing position being 'a wash', stop and rethink. See [[project_explain_system]], [[feedback_pedagogy_preferences]] (no lost-position *lessons* = don't fabricate a winning plan; honest defensive framing is fine), and the design doc `docs/superpowers/specs/2026-06-25-sparse-board-lookahead-design.md`.
