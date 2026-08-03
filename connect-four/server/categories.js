// Single source of truth for category slugs — never hard-code these lists elsewhere; always import from this file.
// Keep in sync with src/lib/categories.js (frontend mirror).
export const VALID_CATEGORIES = new Set([
  'immediate_threat', 'forced_block', 'double_threat',
  'forced_win', 'forbidden_columns',
  'odd_even_threat',
  'z_threat', 'claimeven', 'undercut', 'overcut', 'figure_7', 'j_shape',
]);

export const PAID_CATEGORIES = new Set([
  'mixed', 'undercut', 'overcut', 'figure_7', 'j_shape',
]);

export const CATEGORY_ORDER = [
  'immediate_threat', 'forced_block', 'double_threat',
  'forced_win', 'forbidden_columns',
  'odd_even_threat',
  'z_threat', 'claimeven', 'undercut', 'overcut', 'figure_7', 'j_shape',
];

// Spec 044 (Epic 4) US3 / FR-010–FR-012, reworded by spec 051 (Epic 1) FR-008: these categories
// gate the additive `accepted` field on POST /api/evaluate-move via a solver-gated answer SET
// (correctCols/correct_cols) rather than a single stored scalar. Every category in this feature's
// scope is graded against a stored set post-spec-051 — this set exists to route
// immediate_threat/forced_block/double_threat through that gate, not to describe how many columns
// each one's answer set may legitimately contain. Mirrored (duplicate-and-sync, NOT cross-imported)
// in src/lib/categories.js per research.md R3 — keep both literals identical by hand.
export const MULTI_SOLUTION_CATEGORIES = new Set([
  'immediate_threat', 'forced_block', 'double_threat',
]);

// Spec 049 (Epic 9) FR-008, reworded by spec 051 (Epic 1) FR-008: the seven categories that gate
// the additive `accepted` field on POST /api/evaluate-move via this list rather than
// MULTI_SOLUTION_CATEGORIES above. This is a single, explicit, shared list — it MUST NOT be
// derived as "every category that is not in MULTI_SOLUTION_CATEGORIES" (a category belonging to
// neither set, e.g. forced_win/forbidden_columns, would otherwise be silently miscategorized).
// Mirrored (duplicate-and-sync, NOT cross-imported) in src/lib/categories.js per research.md R3 —
// keep both literals identical by hand.
export const SINGLE_ANSWER_CATEGORIES = new Set([
  'z_threat', 'overcut', 'claimeven', 'undercut', 'figure_7', 'j_shape', 'odd_even_threat',
]);

// Spec 056 (Epic 9) FR-010/FR-011: categories whose "correct column" display is suppressed
// entirely — undercut/overcut historically showed nothing wherever a correct-column hint was
// rendered, but that was an EMERGENT side effect of the legacy singular scalar column being NULL
// for these two categories while the array column stayed fully populated (see checkPredicate's
// NULL carve-out in candidate-generator.js). Retiring that legacy scalar removes the free NULL, so
// this explicit list is now what every display/hint site must consult instead. Deliberately NOT the
// same list as SINGLE_ANSWER_CATEGORIES above (a membership SUBSET of it, disjoint in PURPOSE):
// SINGLE_ANSWER_CATEGORIES governs which categories get a solver-gated answer-set `accepted` field
// at all; this set governs which of THOSE categories must never show a correct-column hint to a
// player/admin (grading itself is NEVER suppressed — see FR-011's explicit `/api/puzzles/:id/check`
// exemption). Mirrored (duplicate-and-sync, NOT cross-imported) in src/lib/categories.js — keep
// both literals identical by hand.
export const SUPPRESSED_SINGLE_COLUMN_CATEGORIES = new Set(['undercut', 'overcut']);

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
