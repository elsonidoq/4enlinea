import * as Sentry from '@sentry/node';

/**
 * Log an error to console.error and (when SENTRY_DSN is configured) to Sentry.
 * @param {string} tag - bracket-prefixed label e.g. '[endpoint-name]'
 * @param {unknown} err - the caught value (ideally an Error)
 * @param {object} [extra] - optional key/value context
 */
export function logError(tag, err, extra = {}) {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  console.error(
    tag,
    message,
    ...(stack ? ['\n' + stack] : []),
    ...(Object.keys(extra).length ? [extra] : []),
  );
  if (process.env.SENTRY_DSN && err instanceof Error) {
    Sentry.captureException(err, { tags: { tag }, extra });
  }
}
