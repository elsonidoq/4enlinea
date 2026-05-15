export const CATEGORY_ORDER = [
  'immediate_threat', 'forced_block', 'double_threat',
  'forced_win', 'forbidden_columns',
  'z_threat', 'claimeven', 'undercut', 'overcut', 'figure_7', 'j_shape',
];

export const CATEGORY_NAMES = {
  immediate_threat:  'Immediate Threat',
  forced_block:      'Forced Block',
  double_threat:     'Double Threat',
  forced_win:        'Forced Win',
  forbidden_columns: 'Forbidden Columns',
  z_threat:          'Z-Threat',
  claimeven:         'Claimeven',
  undercut:          'Undercut',
  overcut:           'Overcut',
  figure_7:          'Figure 7',
  j_shape:           'J-Shape',
};

// Chip styling used by PuzzlesPage, CandidateDashboard, CurationWorkspace.
export const CATEGORY_CHIPS = {
  immediate_threat:  { label: 'Immediate', color: '#60a5fa', bg: 'rgba(37,99,235,.2)',   border: 'rgba(37,99,235,.4)'  },
  forced_block:      { label: 'Block',     color: '#f87171', bg: 'rgba(220,38,38,.2)',   border: 'rgba(220,38,38,.4)'  },
  double_threat:     { label: 'Double',    color: '#fb923c', bg: 'rgba(234,88,12,.2)',   border: 'rgba(234,88,12,.4)'  },
  forced_win:        { label: 'Forced Win', color: '#c084fc', bg: 'rgba(147,51,234,.2)', border: 'rgba(147,51,234,.4)' },
  forbidden_columns: { label: 'Forbidden', color: '#94a3b8', bg: 'rgba(100,116,139,.2)', border: 'rgba(100,116,139,.4)'},
  z_threat:          { label: 'Z-Threat',  color: '#34d399', bg: 'rgba(16,185,129,.2)',  border: 'rgba(16,185,129,.4)' },
  claimeven:         { label: 'Claimeven', color: '#38bdf8', bg: 'rgba(14,165,233,.2)',  border: 'rgba(14,165,233,.4)' },
  undercut:          { label: 'Undercut',  color: '#fb923c', bg: 'rgba(249,115,22,.2)',  border: 'rgba(249,115,22,.4)' },
  overcut:           { label: 'Overcut',   color: '#a78bfa', bg: 'rgba(139,92,246,.2)',  border: 'rgba(139,92,246,.4)' },
  figure_7:          { label: 'Figure 7',  color: '#f472b6', bg: 'rgba(236,72,153,.2)',  border: 'rgba(236,72,153,.4)' },
  j_shape:           { label: 'J-Shape',   color: '#facc15', bg: 'rgba(234,179,8,.2)',   border: 'rgba(234,179,8,.4)'  },
};

export const PAID_CATEGORIES = new Set([
  'forced_win', 'forbidden_columns',
  'z_threat', 'claimeven', 'undercut', 'overcut', 'figure_7', 'j_shape',
]);
