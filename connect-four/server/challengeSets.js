// Challenge set definitions — ordered display list and O(1) lookup map.
// Do NOT include forced_win or forbidden_columns — those are Epic 2b scope.

export const CHALLENGE_SETS = [
  {
    slug: 'immediate_threat',
    displayName: 'Immediate Threat',
    stars: 1,
    description: 'Find the move that wins right now.',
    free: true,
  },
  {
    slug: 'forced_block',
    displayName: 'Forced Block',
    stars: 1,
    description: "Block your opponent's immediate winning threat.",
    free: true,
  },
  {
    slug: 'double_threat',
    displayName: 'Double Threat',
    stars: 2,
    description: 'Create two simultaneous winning threats.',
    free: true,
  },
  {
    slug: 'claimeven',
    displayName: 'Claimeven',
    stars: 3,
    description: "Use Yellow's Claimeven strategy to secure a draw.",
    free: true,
  },
  {
    slug: 'z_threat',
    displayName: 'Z-Threat',
    stars: 3,
    description: 'Exploit Z-threat parity to guarantee the win.',
    free: true,
  },
  {
    slug: 'mixed',
    displayName: 'Mixed',
    stars: 3,
    description: 'A mix of all challenge types.',
    free: false,
  },
  {
    slug: 'undercut',
    displayName: 'Undercut',
    stars: 4,
    description: 'Take the square below your opponent\'s threat.',
    free: false,
  },
  {
    slug: 'overcut',
    displayName: 'Overcut',
    stars: 4,
    description: "Play above your opponent's intended threat.",
    free: false,
  },
  {
    slug: 'figure_7',
    displayName: 'Figure 7',
    stars: 4,
    description: 'Exploit the Figure-7 pattern.',
    free: false,
  },
  {
    slug: 'j_shape',
    displayName: 'J-Shape',
    stars: 4,
    description: 'Exploit the J-Shape pattern.',
    free: false,
  },
];

export const CHALLENGE_SET_MAP = Object.fromEntries(
  CHALLENGE_SETS.map((s) => [s.slug, s])
);
