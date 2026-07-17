---
id: community-forced-win
type: tactical_pattern
canonical: false
source:
  doc: "project:connect-four/server/classifier.js"
  location: "detectForcedWin (2026-06-24)"
  verbatim_quote: |
    Project-local term. A forced win is a position where the player holds exactly
    one immediate threat, compelling the opponent to block, after which the player
    has a continuation that wins directly, creates a double threat, or recursively
    continues the forcing chain.
statement: |
  A forced win is a position where the player to move holds exactly one immediate
  threat. That single threat compels the opponent to use their entire turn blocking
  it — they cannot afford to do anything else. After the forced block, the player
  has at least one continuation that either wins immediately, creates a double
  threat, or enters another forced-win position. The sequence can extend several
  exchanges, but the outcome is guaranteed: no matter how the opponent defends, the
  player wins. Two structural cells are central to every forced-win explanation: the
  forcing cell (the immediate threat the opponent must block) and the winning
  continuation cell (where the player responds to secure the win).

short_summary: |
  A forced win is a guaranteed multi-step winning sequence. The player has one
  immediate threat the opponent must block, and after that block the player has a
  continuation — direct win or fork — that wins no matter what the opponent does.

preconditions:
  - "Player P has exactly one immediate threat (gravity-top major threat)."
  - "After the opponent blocks that threat, the opponent has no immediate threat of their own."
  - "After the block, at least one continuation by P leads to an immediate win, a double threat, or a further forced-win position."
formal_predicate: |
  # Input: board state, player P
  # Output: bool — whether P has a forced win from this position
  # See: detectForcedWin in classifier.js (maxDepth=8 → up to 4 forcing exchanges)

  def has_forced_win(board, player, max_depth=8):
      if max_depth <= 0: return False
      if has_double_threat(board, player): return False   # already a fork; not forced_win
      my_threats = immediate_threats(board, player)
      if len(my_threats) != 1: return False               # need exactly 1 forcing threat
      block_col = my_threats[0]
      after_block = board.drop(block_col, opponent(player))
      if immediate_threats(after_block, opponent(player)): return False  # chain broken
      for col in 0..6:
          if col_full(after_block, col): continue
          row = col_height(after_block, col)
          after_move = after_block.drop(col, player)
          if player wins at (row, col): return True
          if has_double_threat(after_move, player): return True
          if has_forced_win(after_move, player, max_depth - 2): return True
      return False

  # Key highlight cells (1-indexed for display):
  #   forcing_cell      = (block_col + 1, col_height(board, block_col) + 1)
  #   continuation_cell = any (col + 1, row + 1) satisfying the terminal conditions above
worked_examples:
  - movestring: "3520624031331441"
    description: |
      Green to move (move 17). Solver scores: col3=11, col7=9, col4=6, rest≤3.
      The correct move is col3 (1-indexed), which starts the forced win chain.
      Playing col7 instead (the blunder) abandons the sequence.
      The forcing immediate threat is at col6 row4 (major non-gravity); after the
      forced block the winning continuation involves the threat cluster around
      col3/col4/col5.
    expected_behavior: "Solver score col3 = 11; all other columns ≤ 9."
    solver_verified: 2026-06-24
    notes: null
false_positives:
  - movestring: "PENDING"
    why_not: |
      A position with two or more immediate threats is a double threat (fork), not a
      forced win. detectForcedWin explicitly returns false when detectDoubleThreat
      is true — the two categories are mutually exclusive.
    notes: null
  - movestring: "PENDING"
    why_not: |
      A position with zero immediate threats — even one with a large score advantage
      — is not a forced win. The opponent is not compelled to make any specific move,
      so there is no forcing structure.
    notes: null
known_limitations:
  - "detectForcedWin uses maxDepth=8 (up to 4 forcing exchanges); deeper forced wins are not detected."
  - "If the opponent gains an immediate threat after blocking, the chain is considered broken — even if a win still exists via a different route."
  - "The forcing_cell and continuation_cell are position-specific; they are not stored in pattern metadata and must be identified from the board visualization."
related:
  - "[[community-immediate-threat]] — the forcing cell is an immediate threat"
  - "[[community-double-threat]] — the typical end-state of a forcing chain; forced_win excludes positions already at this state"
  - "[[community-forced-block]] — the opponent's required single response to the forcing cell"
last_verified: 2026-06-24
---

## Verbatim source

Project-local term. The predicate is implemented in `detectForcedWin` in
`classifier.js`. The general concept (a forcing sequence that guarantees a win)
appears throughout combinatorial game theory literature but is not named "forced win"
in Allen (2010) or Allis (1988).

## Notes

- `detectForcedWin` returns `{ matched, cells: [] }` — no specific cells are currently
  surfaced. For real board highlighting, `detectForcedWin` should be updated to return
  the forcing cell coordinate `{ matched, cells: [forcing_cell] }`.
- From the blunder side: `missed_own` = the player had a forced win and played elsewhere;
  `missed_opp` = the player's move gave the opponent a forced win.
- `PATTERN_DISPLAY` maps `forced_win → 'losing_position'`; updated to `'forced win'`
  alongside this entry.
- `PATTERN_KB` mapped `forced_win → { id: 'derived-lost-position' }` (non-existent file);
  updated to `{ id: 'community-forced-win' }` alongside this entry.
