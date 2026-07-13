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

// Spec 044 (Epic 4) US3 / FR-010–FR-012 — the only categories whose correctness model allows more
// than one valid answer column (a fork/block/win can be satisfied by 2+ independent columns). Used
// to gate the additive `accepted` field on POST /api/evaluate-move. Mirrored (duplicate-and-sync,
// NOT cross-imported) in src/lib/categories.js per research.md R3 — keep both literals identical by
// hand.
export const MULTI_SOLUTION_CATEGORIES = new Set([
  'immediate_threat', 'forced_block', 'double_threat',
]);

// Spec 049 (Epic 9) FR-008 — the six categories whose correctness model has exactly one taught
// answer column (as opposed to MULTI_SOLUTION_CATEGORIES above, which allows 2+
// independently-satisfying columns). This is a single, explicit, shared list — it MUST NOT be
// derived as "every category that is not in MULTI_SOLUTION_CATEGORIES" (a category belonging to
// neither set, e.g. forced_win/forbidden_columns/odd_even_threat, would otherwise be silently
// miscategorized as single-answer). Mirrored (duplicate-and-sync, NOT cross-imported) in
// src/lib/categories.js per research.md R3 — keep both literals identical by hand.
export const SINGLE_ANSWER_CATEGORIES = new Set([
  'z_threat', 'overcut', 'claimeven', 'undercut', 'figure_7', 'j_shape',
]);

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
