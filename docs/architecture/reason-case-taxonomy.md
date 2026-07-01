
> **This is the sign taxonomy — but a tag-first router now runs IN FRONT of it (D20).** For short,
> cell-nameable tactics (`immediate_threat`/`forced_block`/`double_threat`/`figure_7`) `computeReason`
> takes the realized/denied route instead of the cases below; everything else falls through here. See
> `reason-tag-fastpath-pseudocode.md` and `reason-DECISIONS.md` D20.

```!python

input: movestring


board = Board(movestring)

bestScore = score(movestring + best)
playedScore = score(movestring + played)

# we have precomputed the amount of winning lines per cell and per perspective (1st / 2nd). 
# That stats has both parity and board shape related information
# they are computed by a long running script that computes over a day or so over simulations where either 1st or 2nd win
# is there a way to compute it exactly?

if len(movestring) < X  # eg 15
    board_state = 'opening'
elif len(movestring) < Y  # eg 30
    board_state = 'mid-game'
else
    board_state = 'closing'

if bestScore > 0 and playedScore > 0
    case = 'win_to_slower_win'
    raise notABlunder()

    # this reason seems very dificult to compute, and we can perfectly focus on the other sub-optimal cases
    # reason = you would win faster if you have played correctly (show example). How that move made you win slower?

elif bestScore > 0 and playedScore = 0
    case = 'win_to_draw' # if the opponent plays optimal, you will draw if you play optimal
    reason = You could have won like this or that, now the opponent can neutralize all your threats like this and that
    # half (b): when half (a) found a fork (D16), half (b) is the unified occupation-witness PV walk
    # (D18 — replaces the D17 BFS): walk the canonical argmax PV from playedRoot; return the first
    # node where the opponent occupies+kills a fork window (LIVE->DEAD).
    # Non-fork win_to_draw keeps legacy neutralization. See reason-engine-pseudocode.md.

elif bestScore > 0 and playedScore < 0
    case = 'win_to_lose' # if the opponent plays optimal, you will loose if you play optimal
    reason = you had a way to win with like this and that, after this move, the opponent can win you this way and that way

elif bestScore = 0 and playedScore < 0
    case 'draw_to_lose' 
    reason = you were waiting for your opponent to make a mistake going for a draw if he didn't, with this mistake your opponent can now win you this way
    # half (a): the unified occupation-witness PV walk (D18) — walk the canonical argmax PV from
    # bestRoot; return the first node where the player occupies a cell of the opponent's conceded
    # winning window (LIVE->DEAD).  Both tactical (ply-0) and zugzwang sub-cases use this one
    # primitive; the tie is window-aware (kind:'tied') in both cases.
    # half (b) is computed first (opponent win_half from playedRoot) to supply concededWindows.
    # See reason-engine-pseudocode.md and DECISIONS D18.

elif bestScore < 0 and playedScore < 0
    case 'lose_to_faster_lose'
    if had a chance to win or draw if the opponent made a mistake
        reason = you were buying some time, if your opponent made this or that mistake you could still win. With this mistake you are facing a quicker lose with this
    else
        raise NotABlunder()
        # this case does not make much sense to focus for now
        # reason = you were lost anyway, this is not a blunder, where was no chance for winning or drawing

```
