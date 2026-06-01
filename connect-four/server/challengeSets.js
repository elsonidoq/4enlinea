// Challenge set definitions — ordered display list and O(1) lookup map.
// All display names and descriptions are i18n keys resolved via t() on the frontend.

export const CHALLENGE_SETS = [
  { slug: 'immediate_threat',  displayNameKey: 'challengeSet.immediate_threat.displayName',  descriptionKey: 'challengeSet.immediate_threat.description',  stars: 1, free: true  },
  { slug: 'forced_block',      displayNameKey: 'challengeSet.forced_block.displayName',      descriptionKey: 'challengeSet.forced_block.description',      stars: 1, free: true  },
  { slug: 'double_threat',     displayNameKey: 'challengeSet.double_threat.displayName',     descriptionKey: 'challengeSet.double_threat.description',     stars: 2, free: true  },
  { slug: 'claimeven',         displayNameKey: 'challengeSet.claimeven.displayName',         descriptionKey: 'challengeSet.claimeven.description',         stars: 3, free: true  },
  { slug: 'z_threat',          displayNameKey: 'challengeSet.z_threat.displayName',          descriptionKey: 'challengeSet.z_threat.description',          stars: 3, free: true  },
  { slug: 'forbidden_columns', displayNameKey: 'challengeSet.forbidden_columns.displayName', descriptionKey: 'challengeSet.forbidden_columns.description', stars: 2, free: true  },
  { slug: 'forced_win',        displayNameKey: 'challengeSet.forced_win.displayName',        descriptionKey: 'challengeSet.forced_win.description',        stars: 3, free: true  },
  { slug: 'mixed',             displayNameKey: 'challengeSet.mixed.displayName',             descriptionKey: 'challengeSet.mixed.description',             stars: 3, free: false },
  { slug: 'undercut',          displayNameKey: 'challengeSet.undercut.displayName',          descriptionKey: 'challengeSet.undercut.description',          stars: 4, free: false },
  { slug: 'overcut',           displayNameKey: 'challengeSet.overcut.displayName',           descriptionKey: 'challengeSet.overcut.description',           stars: 4, free: false },
  { slug: 'figure_7',          displayNameKey: 'challengeSet.figure_7.displayName',          descriptionKey: 'challengeSet.figure_7.description',          stars: 4, free: false },
  { slug: 'j_shape',           displayNameKey: 'challengeSet.j_shape.displayName',           descriptionKey: 'challengeSet.j_shape.description',           stars: 4, free: false },
];

export const CHALLENGE_SET_MAP = Object.fromEntries(
  CHALLENGE_SETS.map((s) => [s.slug, s])
);
