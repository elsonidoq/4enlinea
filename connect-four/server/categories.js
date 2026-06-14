// Single source of truth for category slugs — never hard-code these lists elsewhere; always import from this file.
// Keep in sync with src/lib/categories.js (frontend mirror).
export const VALID_CATEGORIES = new Set([
  'immediate_threat', 'forced_block', 'double_threat',
  'forced_win', 'forbidden_columns',
  'odd_even_threat',
  'z_threat', 'claimeven', 'claimodd', 'undercut', 'overcut', 'figure_7', 'j_shape',
]);

export const PAID_CATEGORIES = new Set([
  'mixed', 'undercut', 'overcut', 'figure_7', 'j_shape',
]);

export const CATEGORY_ORDER = [
  'immediate_threat', 'forced_block', 'double_threat',
  'forced_win', 'forbidden_columns',
  'odd_even_threat',
  'z_threat', 'claimeven', 'claimodd', 'undercut', 'overcut', 'figure_7', 'j_shape',
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
  claimodd:          'Claimodd',
  undercut:          'Undercut',
  overcut:           'Overcut',
  figure_7:          'Figure 7',
  j_shape:           'J-Shape',
};
