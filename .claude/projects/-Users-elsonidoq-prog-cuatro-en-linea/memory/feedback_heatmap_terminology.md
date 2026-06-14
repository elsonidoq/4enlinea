---
name: feedback_heatmap_terminology
description: "Heatmap" is ambiguous in this codebase — a PoC feature used that name for something unrelated to the Sparring column-score overlay.
metadata:
  type: feedback
---

Do not use "heatmap" as a shorthand for the Sparring Hint's column-score overlay (the 7-tile row showing per-column scores). The word is ambiguous: an earlier PoC feature in this codebase was also called "heatmap" but did something different.

**Why:** User had to ask for a precise definition mid-audit because the term was unclear.

**How to apply:** Use "column-score overlay" or "column-score row" when referring to the Hint UI element that shows per-column solver scores above the board.
