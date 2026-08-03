export const CATEGORY_ORDER = [
  'immediate_threat', 'forced_block', 'double_threat',
  'forced_win', 'forbidden_columns',
  'odd_even_threat',
  'z_threat', 'claimeven', 'undercut', 'overcut', 'figure_7', 'j_shape',
];

export const CATEGORY_NAMES = {
  immediate_threat:  'Immediate Threat',
  forced_block:      'Forced Block',
  double_threat:     'Double Threat',
  forced_win:        'Forced Win',
  forbidden_columns: 'Forbidden Columns',
  odd_even_threat:   'Odd & Even Threats',
  z_threat:          'Z-Threat',
  claimeven:         'Claimeven',
  undercut:          'Undercut',
  overcut:           'Overcut',
  figure_7:          'Figure 7',
  j_shape:           'J-Shape',
};

// Chip styling used by CandidateDashboard, CurationWorkspace.
export const CATEGORY_CHIPS = {
  immediate_threat:  { label: 'Immediate', color: '#60a5fa', bg: 'rgba(37,99,235,.2)',   border: 'rgba(37,99,235,.4)'  },
  forced_block:      { label: 'Block',     color: '#f87171', bg: 'rgba(220,38,38,.2)',   border: 'rgba(220,38,38,.4)'  },
  double_threat:     { label: 'Double',    color: '#fb923c', bg: 'rgba(234,88,12,.2)',   border: 'rgba(234,88,12,.4)'  },
  forced_win:        { label: 'Forced Win', color: '#c084fc', bg: 'rgba(147,51,234,.2)', border: 'rgba(147,51,234,.4)' },
  forbidden_columns: { label: 'Forbidden', color: '#94a3b8', bg: 'rgba(100,116,139,.2)', border: 'rgba(100,116,139,.4)'},
  z_threat:          { label: 'Z-Threat',  color: '#34d399', bg: 'rgba(16,185,129,.2)',  border: 'rgba(16,185,129,.4)' },
  odd_even_threat:   { label: 'OddEven',   color: '#fff',    bg: '#4A90A4',                border: '#4A90A4'             },
  claimeven:         { label: 'Claimeven', color: '#38bdf8', bg: 'rgba(14,165,233,.2)',  border: 'rgba(14,165,233,.4)' },
  undercut:          { label: 'Undercut',  color: '#fb923c', bg: 'rgba(249,115,22,.2)',  border: 'rgba(249,115,22,.4)' },
  overcut:           { label: 'Overcut',   color: '#a78bfa', bg: 'rgba(139,92,246,.2)',  border: 'rgba(139,92,246,.4)' },
  figure_7:          { label: 'Figure 7',  color: '#f472b6', bg: 'rgba(236,72,153,.2)',  border: 'rgba(236,72,153,.4)' },
  j_shape:           { label: 'J-Shape',   color: '#facc15', bg: 'rgba(234,179,8,.2)',   border: 'rgba(234,179,8,.4)'  },
};

export const GOAL_PROMPTS = {
  immediate_threat:  'Find the winning move.',
  forced_block:      "Block your opponent's threat.",
  double_threat:     'Find the move that creates two simultaneous threats.',
  forced_win:        'Play a sequence of forcing moves to create two unstoppable threats.',
  fork_setup:        'Set up a fork — a sequence that leads to two unstoppable threats.',
  zugzwang:          'Force your opponent into a losing position with a sequence of moves that leave them no good options.',
  parity_control:    'Control the parity of this column to secure the win.',
  forbidden_columns: 'Identify which columns you must avoid — playing there would hand your opponent an immediate win.',
  odd_even_threat:   'Red has two threat moves. Which one lands on an odd row?',
  z_threat:          'Identify the column where a Z-threat gives you unstoppable parity control.',
  claimeven:         'Use the Claimeven strategy — identify which columns Yellow can claim to guarantee a draw.',
  undercut:          'Find the move that undercuts your opponent, taking the square below their threat.',
  overcut:           'Find the move that overcomes your opponent by playing above their intended threat.',
  figure_7:          'Spot the Figure-7 pattern and play the key move to exploit it.',
  j_shape:           'Spot the J-Shape pattern and play the key move to exploit it.',
};

export const PAID_CATEGORIES = new Set([
  'mixed', 'undercut', 'overcut', 'figure_7', 'j_shape',
]);

// Spec 044 (Epic 4) US3 / FR-010–FR-012, reworded by spec 051 (Epic 1) FR-008: these categories
// gate the additive `accepted` field on POST /api/evaluate-move via a solver-gated answer SET
// (correctCols/correct_cols) rather than a single stored scalar. Every category in this feature's
// scope is graded against a stored set post-spec-051 — this set exists to route
// immediate_threat/forced_block/double_threat through that gate, not to describe how many columns
// each one's answer set may legitimately contain. Mirror (duplicate-and-sync, NOT cross-imported)
// of server/categories.js per research.md R3 — keep both literals identical by hand.
export const MULTI_SOLUTION_CATEGORIES = new Set([
  'immediate_threat', 'forced_block', 'double_threat',
]);

// Spec 049 (Epic 9) FR-008, reworded by spec 051 (Epic 1) FR-008: the seven categories that gate
// the additive `accepted` field on POST /api/evaluate-move via this list rather than
// MULTI_SOLUTION_CATEGORIES above. This is a single, explicit, shared list — it
// MUST NOT be derived as "every category that is not in MULTI_SOLUTION_CATEGORIES" (a category
// belonging to neither set, e.g. forced_win/forbidden_columns, would otherwise be
// silently miscategorized). Mirrored (duplicate-and-sync, NOT cross-imported)
// from server/categories.js per research.md R3 — keep both literals identical by hand.
export const SINGLE_ANSWER_CATEGORIES = new Set([
  'z_threat', 'overcut', 'claimeven', 'undercut', 'figure_7', 'j_shape', 'odd_even_threat',
]);

// Spec 056 (Epic 9) FR-010/FR-011: categories whose "correct column" display is suppressed
// entirely — undercut/overcut historically showed nothing wherever a correct-column hint was
// rendered, but that was an EMERGENT side effect of the legacy singular scalar column being NULL
// for these two categories while the array column stayed fully populated. Retiring that legacy
// scalar removes the free NULL, so this explicit list is now what every display/hint site must
// consult instead. Deliberately NOT the same list as SINGLE_ANSWER_CATEGORIES above (a membership SUBSET
// of it, disjoint in PURPOSE): SINGLE_ANSWER_CATEGORIES governs which categories get a
// solver-gated answer-set `accepted` field at all; this set governs which of THOSE categories must
// never show a correct-column hint to a player/admin (grading itself is NEVER suppressed — see
// FR-011's explicit `/api/puzzles/:id/check` exemption). Mirror (duplicate-and-sync, NOT
// cross-imported) of server/categories.js — keep both literals identical by hand.
export const SUPPRESSED_SINGLE_COLUMN_CATEGORIES = new Set(['undercut', 'overcut']);
