// Blunder Tag Registry — single source of truth for all valid blunder tags.
//
// This set is distinct from VALID_CATEGORIES in categories.js (puzzle categories).
// These are tags applied to blunders in sparring games. Do not conflate them.
//
// Tags are drawn from tagBlunder() in classifier.js. Any tag not in this set
// is substituted with 'suboptimal_move' before INSERT into the blunders table.

export const VALID_BLUNDER_TAGS = new Set([
  'immediate_threat',
  'forced_block',
  'forced_win',
  'double_threat',
  'undercut',
  'overcut',
  'figure_7',
  'j_shape',
  'z_threat',
  // odd_even_threat removed as a blunder tag 2026-06-25 (still a puzzle category). The
  // parity-aware threat tags below replace its blunder role.
  'major_threat_parity',
  'major_threat_nonparity',
  'minor_threat',
  'claimeven',
  'drawing_move',
  'suboptimal_move',
  'forbidden_columns',
]);
