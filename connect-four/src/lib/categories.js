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

// Chip styling used by PuzzlesPage, CandidateDashboard, CurationWorkspace.
// forbidden_columns chip is new — neutral slate, no prior assignment.
export const CATEGORY_CHIPS = {
  immediate_threat:  { label: 'Immediate', color: '#60a5fa', bg: 'rgba(37,99,235,.2)',   border: 'rgba(37,99,235,.4)'  },
  forced_block:      { label: 'Block',     color: '#f87171', bg: 'rgba(220,38,38,.2)',   border: 'rgba(220,38,38,.4)'  },
  double_threat:     { label: 'Double',    color: '#fb923c', bg: 'rgba(234,88,12,.2)',   border: 'rgba(234,88,12,.4)'  },
  fork_setup:        { label: 'Fork',      color: '#2dd4bf', bg: 'rgba(13,148,136,.2)',  border: 'rgba(13,148,136,.4)' },
  zugzwang:          { label: 'Zugzwang',  color: '#c084fc', bg: 'rgba(147,51,234,.2)',  border: 'rgba(147,51,234,.4)' },
  parity_control:    { label: 'Parity',    color: '#fcd34d', bg: 'rgba(245,184,32,.2)',  border: 'rgba(245,184,32,.4)' },
  forbidden_columns: { label: 'Forbidden', color: '#94a3b8', bg: 'rgba(100,116,139,.2)', border: 'rgba(100,116,139,.4)'},
};

export const PAID_CATEGORIES = new Set([
  'fork_setup', 'zugzwang', 'parity_control',
]);
