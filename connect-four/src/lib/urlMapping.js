/**
 * URL mapping table — single source of truth for all screen ↔ URL conversions.
 * Order matters: more specific patterns must appear before less specific ones.
 * Both buildUrl() and parseUrl() derive their logic from URL_MAP.
 */
export const URL_MAP = [
  { pattern: '/',                    screenKey: 'home',          paramNames: [] },
  { pattern: '/stats',               screenKey: 'stats',         paramNames: [] },
  { pattern: '/mistakes',            screenKey: 'mistakes',      paramNames: [] },
  { pattern: '/saga/:highlightSlug', screenKey: 'saga',          paramNames: ['highlightSlug'] },
  { pattern: '/saga',                screenKey: 'saga',          paramNames: [] },
  { pattern: '/concept/:lessonId',   screenKey: 'concept',       paramNames: ['lessonId'] },
  { pattern: '/socratic/:lessonId',  screenKey: 'socratic',      paramNames: ['lessonId'] },
  { pattern: '/clchallenge/:lessonId', screenKey: 'clchallenge', paramNames: ['lessonId'] },
  { pattern: '/setpicker',           screenKey: 'setpicker',     paramNames: [] },
  { pattern: '/challenge/:category', screenKey: 'challenge',     paramNames: ['category'] },
  { pattern: '/summary',             screenKey: 'summary',       paramNames: [] },
  { pattern: '/difficulty',          screenKey: 'difficulty',    paramNames: [] },
  { pattern: '/game/:id',            screenKey: 'review',        paramNames: ['id'] },
  { pattern: '/game',                screenKey: 'game',          paramNames: [] },
  { pattern: '/explorer',            screenKey: 'explorer',      paramNames: [] },
  { pattern: '/mistakeDetail',       screenKey: 'mistakeDetail', paramNames: [] },
  { pattern: '/blunder',             screenKey: 'blunderDetail', paramNames: [] },
  { pattern: '/pastGames',           screenKey: 'pastGames',     paramNames: [] },
];

/**
 * Screens that cannot be cold-booted from a URL — their state is ephemeral and
 * cannot be reconstructed from the URL alone. On cold boot at these URLs, the
 * app redirects to home at '/'.
 */
export const SESSION_ONLY_SCREENS = new Set(['summary', 'explorer', 'mistakeDetail', 'game', 'blunderDetail']);

/**
 * Build a URL string from a screen key and optional params.
 *
 * Special cases:
 *  - 'saga' with no highlightSlug → '/saga'
 *  - 'saga' with highlightSlug → '/saga/<slug>'
 *  - 'review' → '/game/<id>'
 *  - 'game' → '/game'
 *  - 'home' → '/'
 *  - unknown screenKey → '/'
 *  - all other screens: '/<screenKey>'
 *
 * @param {string} screenKey
 * @param {object} params
 * @returns {string}
 */
export function buildUrl(screenKey, params = {}) {
  if (screenKey === 'home') return '/';
  if (screenKey === 'saga') {
    return params.highlightSlug ? `/saga/${params.highlightSlug}` : '/saga';
  }
  if (screenKey === 'review') {
    return `/game/${params.id}`;
  }
  if (screenKey === 'game') {
    return '/game';
  }

  // For parameterised screens, fill in param segments
  const entry = URL_MAP.find(e => e.screenKey === screenKey && e.paramNames.length > 0);
  if (entry) {
    let url = entry.pattern;
    for (const name of entry.paramNames) {
      url = url.replace(`:${name}`, params[name]);
    }
    return url;
  }

  // For screens that have an entry with no params, use the pattern directly
  const simpleEntry = URL_MAP.find(e => e.screenKey === screenKey);
  if (simpleEntry) return simpleEntry.pattern;

  // Unknown screen key
  return '/';
}

/**
 * Parse a URL pathname and return the matching { screenKey, params } pair.
 * Iterates URL_MAP in order, returning the first match.
 * Returns { screenKey: 'home', params: {} } for unrecognized paths (never throws).
 *
 * @param {string} pathname  e.g. '/challenge/immediate_threat'
 * @returns {{ screenKey: string, params: object }}
 */
export function parseUrl(pathname) {
  const normalised = pathname || '/';

  for (const { pattern, screenKey, paramNames } of URL_MAP) {
    const params = matchPattern(pattern, normalised, paramNames);
    if (params !== null) {
      return { screenKey, params };
    }
  }

  return { screenKey: 'home', params: {} };
}

/**
 * Match a URL pattern against a pathname.
 * Returns an object of captured params if matched, or null if not matched.
 *
 * @param {string} pattern   e.g. '/challenge/:category'
 * @param {string} pathname  e.g. '/challenge/immediate_threat'
 * @param {string[]} paramNames
 * @returns {object|null}
 */
function matchPattern(pattern, pathname, paramNames) {
  // Special case: root pattern
  if (pattern === '/') {
    return pathname === '/' ? {} : null;
  }

  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = pathname.split('/').filter(Boolean);

  if (patternParts.length !== pathParts.length) return null;

  const params = {};
  for (let i = 0; i < patternParts.length; i++) {
    const pp = patternParts[i];
    const vp = pathParts[i];
    if (pp.startsWith(':')) {
      const name = pp.slice(1);
      params[name] = vp;
    } else if (pp !== vp) {
      return null;
    }
  }

  return params;
}
