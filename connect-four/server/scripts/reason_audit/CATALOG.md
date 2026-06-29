> ⛔ **SUPERSEDED / ABANDONED 2026-06-28** — the reason-field design described or assumed here branched off and is no longer the plan. Restarting from `docs/architecture/my_pseudocode.md`. Do NOT use this file as guidance; treat it as historical only.

# Reason-Field Audit — Case Catalog (all 66)

Cheap routing signals from the solver on the pre-move board. `kind?` = heuristic guess the auditor must confirm.
Mark a case analyzed by appending ` [A]` to its id cell.

| id | cat | discs | best | played | sBest | sPlayed | branch | exp.kind | sparse | sev |
|----|-----|-------|------|--------|-------|---------|--------|----------|--------|-----|
| eval-0 | drawing_move | 0 | win | draw | 1 | 0 | FLIP | positional? | Y | 0 |
| eval-1 | suboptimal_move | 2 | draw | loss | 0 | -1 | FLIP | positional? |  | 0 |
| eval-2 | drawing_move | 3 | win | draw | 1 | 0 | FLIP | positional? |  | 0 |
| eval-3 | suboptimal_move | 4 | draw | loss | 0 | -1 | FLIP | positional? |  | 0 |
| eval-4 | suboptimal_move | 6 | loss | loss | -1 | -2 | SAME | resistance |  | 0 |
| eval-5 | drawing_move | 9 | win | draw | 2 | 0 | FLIP | concrete_line |  | 1 |
| eval-6 | undercut | 18 | draw | loss | 0 | -1 | FLIP | concrete_line |  | 0 |
| eval-7 | forced_block | 20 | loss | loss | -1 | -11 | SAME | resistance |  | 3 |
| eval-8 | suboptimal_move | 1 | loss | loss | -1 | -2 | SAME | resistance | Y | 0 |
| eval-9 | suboptimal_move | 6 | draw | loss | 0 | -2 | FLIP | positional? |  | 1 |
| eval-10 | j_shape | 10 | loss | loss | -5 | -6 | SAME | resistance |  | 0 |
| eval-11 | immediate_threat | 14 | loss | loss | -5 | -14 | SAME | resistance |  | 3 |
| eval-12 | immediate_threat | 32 | loss | loss | -2 | -5 | SAME | resistance |  | 1 |
| eval-13 | suboptimal_move | 4 | draw | loss | 0 | -4 | FLIP | positional? |  | 1 |
| eval-14 | forced_block | 16 | loss | loss | -9 | -13 | SAME | resistance |  | 1 |
| eval-15 | double_threat | 28 | win | loss | 2 | -6 | FLIP | concrete_line |  | 2 |
| eval-16 | suboptimal_move | 1 | loss | loss | -1 | -2 | SAME | resistance | Y | 0 |
| eval-17 | j_shape | 7 | loss | loss | -3 | -4 | SAME | resistance |  | 0 |
| eval-18 | suboptimal_move | 1 | draw | loss | 0 | -2 | FLIP | positional? | Y | 1 |
| eval-19 | suboptimal_move | 5 | loss | loss | -3 | -4 | SAME | resistance | Y | 0 |
| eval-20 | j_shape | 8 | win | win | 4 | 3 | SAME | conversion |  | 0 |
| eval-21 | drawing_move | 0 | win | draw | 1 | 0 | FLIP | positional? | Y | 0 |
| eval-22 | suboptimal_move | 1 | draw | loss | 0 | -2 | FLIP | positional? | Y | 1 |
| eval-23 | suboptimal_move | 18 | loss | loss | -1 | -2 | SAME | resistance | Y | 0 |
| eval-24 | drawing_move | 12 | win | draw | 2 | 0 | FLIP | positional? | Y | 1 |
| eval-25 | suboptimal_move | 1 | draw | loss | 0 | -2 | FLIP | positional? | Y | 1 |
| eval-26 | suboptimal_move | 3 | draw | loss | 0 | -2 | FLIP | positional? | Y | 1 |
| eval-27 | forced_block | 7 | win | loss | 1 | -17 | FLIP | concrete_line |  | 5 |
| eval-28 | undercut | 29 | loss | loss | -2 | -3 | SAME | resistance |  | 0 |
| eval-29 | double_threat | 3 | win | loss | 2 | -18 | FLIP | positional? |  | 6 |
| eval-30 | suboptimal_move | 1 | loss | loss | -1 | -2 | SAME | resistance | Y | 0 |
| eval-31 | forced_block | 17 | win | loss | 12 | -12 | FLIP | concrete_line |  | 7 |
| eval-32 | immediate_threat | 18 | win | loss | 12 | -12 | FLIP | concrete_line |  | 7 |
| eval-33 | suboptimal_move | 1 | loss | loss | -1 | -2 | SAME | resistance | Y | 0 |
| eval-34 | suboptimal_move | 5 | loss | loss | -2 | -3 | SAME | resistance | Y | 0 |
| eval-35 | double_threat | 4 | win | loss | 18 | -2 | FLIP | positional? |  | 6 |
| eval-36 | immediate_threat | 13 | win | win | 15 | 14 | SAME | conversion |  | 0 |
| eval-37 | drawing_move | 8 | win | draw | 1 | 0 | FLIP | positional? | Y | 0 |
| eval-38 | overcut | 19 | loss | loss | -3 | -10 | SAME | resistance |  | 2 |
| eval-39 | j_shape | 14 | win | win | 4 | 3 | SAME | conversion |  | 0 |
| eval-40 | drawing_move | 3 | win | draw | 1 | 0 | FLIP | positional? | Y | 0 |
| eval-41 | suboptimal_move | 4 | loss | loss | -1 | -2 | SAME | resistance | Y | 0 |
| eval-42 | forced_win | 12 | loss | loss | -3 | -13 | SAME | resistance |  | 3 |
| eval-43 | forced_win | 13 | win | win | 13 | 3 | SAME | conversion |  | 3 |
| eval-44 | suboptimal_move | 11 | loss | loss | -1 | -2 | SAME | resistance | Y | 0 |
| eval-45 | suboptimal_move | 8 | loss | loss | -2 | -3 | SAME | resistance | Y | 0 |
| eval-46 | forced_win | 18 | win | loss | 3 | -5 | FLIP | concrete_line |  | 2 |
| eval-47 | suboptimal_move | 11 | draw | loss | 0 | -1 | FLIP | positional? | Y | 0 |
| eval-48 | forced_win | 20 | loss | loss | -4 | -5 | SAME | resistance |  | 0 |
| eval-49 | z_threat | 35 | win | draw | 3 | 0 | FLIP | parity_control? |  | 1 |
| eval-50 | double_threat | 4 | win | win | 18 | 2 | SAME | conversion |  | 4 |
| eval-51 | figure_7 | 10 | draw | loss | 0 | -13 | FLIP | concrete_line |  | 4 |
| eval-52 | figure_7 | 11 | loss | loss | -4 | -12 | SAME | resistance |  | 2 |
| eval-53 | figure_7 | 12 | win | win | 12 | 11 | SAME | conversion |  | 0 |
| eval-54 | z_threat | 30 | loss | loss | -1 | -2 | SAME | resistance |  | 0 |
| eval-55 | overcut | 20 | loss | loss | -5 | -9 | SAME | resistance |  | 1 |
| eval-56 | odd_even_threat | 22 | loss | loss | -3 | -4 | SAME | resistance |  | 0 |
| eval-57 | figure_7 | 13 | win | win | 11 | 2 | SAME | conversion |  | 3 |
| eval-58 | z_threat | 36 | win | draw | 2 | 0 | FLIP | parity_control? |  | 1 |
| eval-59 | claimeven | 34 | win | win | 2 | 1 | SAME | conversion |  | 0 |
| eval-60 | claimeven | 35 | loss | loss | -1 | -2 | SAME | resistance |  | 0 |
| eval-61 | odd_even_threat | 10 | loss | loss | -5 | -12 | SAME | resistance |  | 2 |
| eval-62 | claimeven | 17 | loss | loss | -5 | -6 | SAME | resistance |  | 0 |
| eval-63 | claimeven | 28 | win | win | 4 | 3 | SAME | conversion |  | 0 |
| eval-64 | z_threat | 28 | loss | loss | -4 | -5 | SAME | resistance |  | 0 |
| eval-65 | odd_even_threat | 10 | win | win | 5 | 4 | SAME | conversion |  | 0 |

## Groups (branch × expected-kind) — each needs ≥1 analyzed representative

- **FLIP / concrete_line** (8): eval-5, eval-6, eval-15, eval-27, eval-31, eval-32, eval-46, eval-51
- **FLIP / parity_control?** (2): eval-49, eval-58
- **FLIP / positional?** (17): eval-0, eval-1, eval-2, eval-3, eval-9, eval-13, eval-18, eval-21, eval-22, eval-24, eval-25, eval-26, eval-29, eval-35, eval-37, eval-40, eval-47
- **SAME / conversion** (10): eval-20, eval-36, eval-39, eval-43, eval-50, eval-53, eval-57, eval-59, eval-63, eval-65
- **SAME / resistance** (29): eval-4, eval-7, eval-8, eval-10, eval-11, eval-12, eval-14, eval-16, eval-17, eval-19, eval-23, eval-28, eval-30, eval-33, eval-34, eval-38, eval-41, eval-42, eval-44, eval-45, eval-48, eval-52, eval-54, eval-55, eval-56, eval-60, eval-61, eval-62, eval-64
