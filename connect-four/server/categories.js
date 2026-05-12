export const VALID_CATEGORIES = new Set([
  'immediate_threat', 'forced_block', 'double_threat',
  'fork_setup', 'zugzwang', 'parity_control', 'forbidden_columns',
]);

export const PAID_CATEGORIES = new Set([
  'fork_setup', 'zugzwang', 'parity_control',
]);

export const CATEGORY_ORDER = [
  'immediate_threat', 'forced_block', 'double_threat',
  'fork_setup', 'zugzwang', 'parity_control', 'forbidden_columns',
];

export const CATEGORY_NAMES = {
  immediate_threat:  'Immediate Threat',
  forced_block:      'Forced Block',
  double_threat:     'Double Threat',
  fork_setup:        'Fork Setup',
  zugzwang:          'Zugzwang',
  parity_control:    'Parity Control',
  forbidden_columns: 'Forbidden Columns',
};
